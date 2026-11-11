import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, refreshSession, request } from '@/lib/api';
import { renderApp } from '@/test/render';
import type { Order } from './api';
import { makeOrder } from './test-data';

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  request: vi.fn(),
  refreshSession: vi.fn(),
}));

const requestMock = vi.mocked(request);

const admin = { id: '1', email: 'admin@example.com', role: 'admin', createdAt: '' };

/**
 * Serves one order, and applies the given handler to changes. The handler returns the order
 * as it is after the change, or throws to refuse it.
 */
function serve(order: Order, change: (path: string, body?: unknown) => Order = () => order) {
  let current = order;
  requestMock.mockImplementation(async (path, options) => {
    if (path === '/api/auth/me') return { data: admin };
    if (options?.method) {
      current = change(path, options.body);
      return { data: current };
    }
    return { data: current };
  });
}

function heading(name: string) {
  return screen.findByRole('heading', { name });
}

function section(name: string) {
  return screen.getByRole('region', { name });
}

beforeEach(() => {
  requestMock.mockReset();
  vi.mocked(refreshSession).mockResolvedValue(true);
});

describe('the order page', () => {
  it('shows the order, its items, the totals as sent, and the customer', async () => {
    serve(makeOrder());
    renderApp('/orders/order-1');

    expect(await heading('ORD-000123')).toBeInTheDocument();
    const items = section('Items');
    expect(within(items).getByText('Linen Shirt')).toBeInTheDocument();
    expect(within(items).getByText('Size: M')).toBeInTheDocument();
    expect(within(items).getByText('2 × ₱500.00')).toBeInTheDocument();

    const totals = section('Totals');
    expect(within(totals).getByText('VAT 12% (included)')).toBeInTheDocument();
    expect(within(totals).getByText('₱123.21')).toBeInTheDocument();
    expect(within(totals).getByText('₱1,150.00')).toBeInTheDocument();

    const customer = section('Customer');
    expect(within(customer).getByRole('link', { name: '09171234567' })).toHaveAttribute(
      'href',
      'tel:09171234567',
    );
  });

  it('says when the order does not exist', async () => {
    requestMock.mockImplementation(async (path) => {
      if (path === '/api/auth/me') return { data: admin };
      throw new ApiError(404, { error: { message: 'Order not found' } });
    });
    renderApp('/orders/missing');

    expect(await heading('Order not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to orders' })).toHaveAttribute('href', '/orders');
  });
});

describe('payments', () => {
  it('confirms a submitted payment after showing the amount and reference', async () => {
    serve(makeOrder(), () => makeOrder({ status: 'pending', paymentStatus: 'paid' }));
    renderApp('/orders/order-1');

    expect(await screen.findByText('GC12345678')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm payment' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('₱1,150.00');
    expect(dialog).toHaveTextContent('GC12345678');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm payment' }));

    expect(await screen.findByText('Payment confirmed')).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith('/api/orders/admin/order-1/payment/confirm', {
      method: 'POST',
    });
  });

  it('asks before rejecting a payment, and explains that it cancels the order', async () => {
    serve(makeOrder(), () => makeOrder({ status: 'cancelled' }));
    renderApp('/orders/order-1');

    await userEvent.click(await screen.findByRole('button', { name: 'Reject' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('cancels the order');
    expect(requestMock).not.toHaveBeenCalledWith(
      '/api/orders/admin/order-1/payment/reject',
      expect.anything(),
    );

    await userEvent.click(within(dialog).getByRole('button', { name: 'Reject payment' }));
    expect(requestMock).toHaveBeenCalledWith('/api/orders/admin/order-1/payment/reject', {
      method: 'POST',
    });
  });

  it('offers a refund only for a paid order that has finished', async () => {
    serve(makeOrder({ status: 'shipped', paymentStatus: 'paid' }));
    renderApp('/orders/order-1');

    await heading('ORD-000123');
    expect(screen.queryByRole('button', { name: 'Record refund' })).not.toBeInTheDocument();
  });

  it('records a refund after confirming', async () => {
    serve(makeOrder({ status: 'delivered', paymentStatus: 'paid' }), () =>
      makeOrder({ status: 'delivered', paymentStatus: 'refunded' }),
    );
    renderApp('/orders/order-1');

    await userEvent.click(await screen.findByRole('button', { name: 'Record refund' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Record refund' }),
    );

    expect(await screen.findByText('Refund recorded')).toBeInTheDocument();
    expect(screen.getByText('The refund is recorded.')).toBeInTheDocument();
  });

  it('shows the backend message when it refuses', async () => {
    serve(makeOrder(), () => {
      throw new ApiError(409, {
        error: { message: 'This order has no payment waiting for confirmation' },
      });
    });
    renderApp('/orders/order-1');

    await userEvent.click(await screen.findByRole('button', { name: 'Confirm payment' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm payment' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'This order has no payment waiting for confirmation',
    );
  });
});

describe('status changes', () => {
  it('shows only the moves the order allows', async () => {
    serve(makeOrder({ status: 'shipped', paymentStatus: 'paid' }));
    renderApp('/orders/order-1');

    await heading('ORD-000123');
    const status = section('Status');
    const labels = within(status)
      .getAllByRole('button')
      .map((button) => button.textContent);
    expect(labels).toEqual(['Mark delivered', 'Mark returned']);
  });

  it('marks an order shipped straight away', async () => {
    serve(makeOrder({ status: 'confirmed', paymentStatus: 'paid' }), () =>
      makeOrder({ status: 'shipped', paymentStatus: 'paid' }),
    );
    renderApp('/orders/order-1');

    await userEvent.click(await screen.findByRole('button', { name: 'Mark shipped' }));

    expect(await screen.findByText('Order is now shipped')).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith('/api/orders/admin/order-1/status', {
      method: 'PATCH',
      body: { status: 'shipped' },
    });
  });

  it('asks before cancelling an order', async () => {
    serve(makeOrder({ status: 'pending', paymentStatus: 'paid' }), () =>
      makeOrder({ status: 'cancelled', paymentStatus: 'paid' }),
    );
    renderApp('/orders/order-1');

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel order' }));
    const dialog = screen.getByRole('dialog', { name: 'Cancel order' });
    expect(dialog).toHaveTextContent('stock goes back on sale');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel order' }));

    expect(await screen.findByText('Order is now cancelled')).toBeInTheDocument();
    // A paid order that was cancelled can now be refunded.
    expect(screen.getByRole('button', { name: 'Record refund' })).toBeInTheDocument();
  });

  it('shows the backend message when a move is refused', async () => {
    serve(makeOrder({ status: 'confirmed', paymentStatus: 'paid' }), () => {
      throw new ApiError(409, { error: { message: 'An order cannot move from cancelled' } });
    });
    renderApp('/orders/order-1');

    await userEvent.click(await screen.findByRole('button', { name: 'Mark shipped' }));

    expect(await screen.findByText('An order cannot move from cancelled')).toBeInTheDocument();
  });
});
