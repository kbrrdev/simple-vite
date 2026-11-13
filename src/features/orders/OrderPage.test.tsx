import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, refreshSession, request } from '@/lib/api';
import type { User } from '@/lib/auth';
import type { AuditEntry } from '@/features/audit-log/api';
import { openMoreMenu } from '@/test/menu';
import { renderApp } from '@/test/render';
import { admin, staff } from '@/test/users';
import type { Order } from './api';
import { makeOrder } from './test-data';

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  request: vi.fn(),
  refreshSession: vi.fn(),
}));

const requestMock = vi.mocked(request);

function makeEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: crypto.randomUUID(),
    actorUserId: 'user-ana',
    actorEmail: 'ana@example.com',
    entityType: 'order',
    entityId: 'order-1',
    action: 'payment_confirm',
    changes: { paymentStatus: ['submitted', 'paid'] },
    requestId: null,
    createdAt: '2026-11-10T03:00:00.000Z',
    ...overrides,
  };
}

interface Serve {
  /** Returns the order as it is after a change, or throws to refuse it. */
  change?: (path: string, body?: unknown) => Order;
  user?: User;
  entries?: AuditEntry[];
  /** The number of entries the log holds, when more than the page sent. */
  total?: number;
}

/** Serves one order, its audit entries, and the given handler for changes. */
function serve(
  order: Order,
  { change = () => order, user = admin, entries = [], total }: Serve = {},
) {
  let current = order;
  requestMock.mockImplementation(async (path, options) => {
    if (path === '/api/auth/me') return { data: user };
    if (path === '/api/audit-logs') {
      return { data: entries, meta: { page: 1, limit: 20, total: total ?? entries.length } };
    }
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

/** The step marked current, or stopped, in a list of steps. */
function currentStep(list: string) {
  const steps = within(screen.getByRole('list', { name: list })).getAllByRole('listitem');
  const current = steps.find((step) => step.getAttribute('aria-current') === 'step');
  if (!current) throw new Error(`No current step in ${list}`);
  return current;
}

function stepLabels(list: string) {
  return within(screen.getByRole('list', { name: list }))
    .getAllByRole('listitem')
    .map((step) => step.querySelector('p')?.firstChild?.textContent);
}

beforeEach(() => {
  requestMock.mockReset();
  vi.mocked(refreshSession).mockResolvedValue(true);
});

describe('the order page', () => {
  it('shows the order, its items, the totals as sent, and where it goes', async () => {
    serve(makeOrder());
    renderApp('/orders/order-1');

    expect(await heading('ORD-000123')).toBeInTheDocument();
    const items = section('Items');
    expect(within(items).getByText('Linen Shirt')).toBeInTheDocument();
    expect(within(items).getByText('Size: M')).toBeInTheDocument();
    expect(within(items).getByText('2 × ₱500.00')).toBeInTheDocument();
    expect(within(items).getByText('2 items')).toBeInTheDocument();

    const totals = screen.getByLabelText('Totals');
    expect(within(totals).getByText('VAT 12% (included)')).toBeInTheDocument();
    expect(within(totals).getByText('₱123.21')).toBeInTheDocument();
    expect(within(totals).getByText('₱1,150.00')).toBeInTheDocument();

    expect(within(section('Customer')).getByText('maria@example.com')).toBeInTheDocument();
    expect(within(section('Ship to')).getByRole('link', { name: '09171234567' })).toHaveAttribute(
      'href',
      'tel:09171234567',
    );
    expect(within(section('Payment')).getByText('Reference GC12345678')).toBeInTheDocument();
  });

  it('strikes through the list price of an item sold on sale', async () => {
    const order = makeOrder();
    serve({
      ...order,
      items: [{ ...order.items[0], unitPriceCents: 45000, listPriceCents: 50000 }],
    });
    renderApp('/orders/order-1');

    const items = within(await screen.findByRole('region', { name: 'Items' }));
    expect(items.getByText(/2 × ₱450\.00/)).toHaveTextContent('2 × ₱450.00 was ₱500.00');
  });

  it('shows the payment and status as badges beside the number', async () => {
    serve(makeOrder({ status: 'confirmed', paymentStatus: 'paid' }));
    renderApp('/orders/order-1');

    const header = (await heading('ORD-000123')).parentElement;
    if (!header) throw new Error('No header');
    // Green when done, blue while in progress.
    expect(within(header).getByText('Paid')).toHaveAttribute('data-variant', 'success');
    expect(within(header).getByText('Confirmed')).toHaveAttribute('data-variant', 'info');
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

describe('steps', () => {
  it('shows where a manual order is now', async () => {
    serve(makeOrder());
    renderApp('/orders/order-1');

    await heading('ORD-000123');
    expect(stepLabels('Status steps')).toEqual([
      'Awaiting payment',
      'Pending',
      'Confirmed',
      'Shipped',
      'Delivered',
    ]);
    expect(currentStep('Status steps')).toHaveTextContent('Awaiting payment');
    expect(stepLabels('Payment steps')).toEqual(['Unpaid', 'Payment to check', 'Paid']);
    expect(currentStep('Payment steps')).toHaveTextContent('Payment to check');
  });

  it('leaves out the wait for payment on cash on delivery orders', async () => {
    serve(
      makeOrder({ paymentType: 'cod', status: 'pending', paymentStatus: 'unpaid', payment: null }),
    );
    renderApp('/orders/order-1');

    await heading('ORD-000123');
    expect(stepLabels('Status steps')).toEqual(['Pending', 'Confirmed', 'Shipped', 'Delivered']);
    expect(stepLabels('Payment steps')).toEqual(['Unpaid', 'Paid']);
    expect(currentStep('Payment steps')).toHaveTextContent('paid when the order is delivered');
  });

  it('ends a returned order after Shipped', async () => {
    serve(makeOrder({ status: 'returned', paymentStatus: 'paid' }));
    renderApp('/orders/order-1');

    await heading('ORD-000123');
    expect(stepLabels('Status steps')).toEqual([
      'Awaiting payment',
      'Pending',
      'Confirmed',
      'Shipped',
      'Returned',
    ]);
    expect(currentStep('Status steps')).toHaveTextContent('stock was not added back');
  });

  it('shows a cancelled order as one stopped step', async () => {
    serve(makeOrder({ status: 'cancelled', paymentStatus: 'unpaid' }));
    renderApp('/orders/order-1');

    await heading('ORD-000123');
    expect(stepLabels('Status steps')).toEqual(['Cancelled']);
    expect(currentStep('Payment steps')).toHaveTextContent('The order was cancelled');
  });
});

describe('the next step', () => {
  it('asks to check a submitted payment, with the reference', async () => {
    serve(makeOrder());
    renderApp('/orders/order-1');

    const step = within(await screen.findByRole('region', { name: 'Check the payment' }));
    expect(step.getByText('GC12345678')).toBeInTheDocument();
    expect(step.getByText(/sent ₱1,150.00/)).toBeInTheDocument();
    expect(step.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Reject',
      'Confirm payment',
    ]);
  });

  it('says when the order waits for the customer to pay', async () => {
    serve(makeOrder({ paymentStatus: 'unpaid', paymentReference: null }));
    renderApp('/orders/order-1');

    const step = within(await screen.findByRole('region', { name: 'Waiting for payment' }));
    expect(step.getByText(/Waiting for the customer to pay by/)).toBeInTheDocument();
    expect(step.queryByRole('button')).not.toBeInTheDocument();
  });

  it('offers the move forward, and keeps returns in the More menu', async () => {
    serve(makeOrder({ status: 'shipped', paymentStatus: 'paid' }));
    renderApp('/orders/order-1');

    const step = within(await screen.findByRole('region', { name: 'Waiting for delivery' }));
    expect(step.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Mark delivered',
    ]);
    const menu = await openMoreMenu();
    expect(menu.getByRole('menuitem', { name: 'Mark returned' })).toBeInTheDocument();
  });

  it('has nothing to do once the order is delivered', async () => {
    serve(makeOrder({ status: 'delivered', paymentStatus: 'paid' }));
    renderApp('/orders/order-1');

    await heading('ORD-000123');
    expect(screen.queryByText('Next step')).not.toBeInTheDocument();
  });
});

describe('payments', () => {
  it('confirms a submitted payment after showing the amount and reference', async () => {
    serve(makeOrder(), { change: () => makeOrder({ status: 'pending', paymentStatus: 'paid' }) });
    renderApp('/orders/order-1');

    await userEvent.click(await screen.findByRole('button', { name: 'Confirm payment' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('₱1,150.00');
    expect(dialog).toHaveTextContent('GC12345678');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm payment' }));

    expect(await screen.findByText('Payment confirmed')).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith('/api/orders/admin/order-1/payment/confirm', {
      method: 'POST',
    });
    // The paid order's next step is to confirm it.
    expect(await screen.findByRole('region', { name: 'Confirm the order' })).toBeInTheDocument();
  });

  it('asks before rejecting a payment, and explains that it cancels the order', async () => {
    serve(makeOrder(), { change: () => makeOrder({ status: 'cancelled' }) });
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

    const menu = await openMoreMenu();
    expect(menu.queryByRole('menuitem', { name: 'Record refund' })).not.toBeInTheDocument();
  });

  it('records a refund from the More menu after confirming', async () => {
    serve(makeOrder({ status: 'delivered', paymentStatus: 'paid' }), {
      change: () => makeOrder({ status: 'delivered', paymentStatus: 'refunded' }),
    });
    renderApp('/orders/order-1');

    await userEvent.click((await openMoreMenu()).getByRole('menuitem', { name: 'Record refund' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Record refund' }),
    );

    expect(await screen.findByText('Refund recorded')).toBeInTheDocument();
    await waitFor(() => expect(currentStep('Payment steps')).toHaveTextContent('Refunded'));
  });

  it('shows the backend message when it refuses', async () => {
    serve(makeOrder(), {
      change: () => {
        throw new ApiError(409, {
          error: { message: 'This order has no payment waiting for confirmation' },
        });
      },
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
  it('marks an order shipped straight away', async () => {
    serve(makeOrder({ status: 'confirmed', paymentStatus: 'paid' }), {
      change: () => makeOrder({ status: 'shipped', paymentStatus: 'paid' }),
    });
    renderApp('/orders/order-1');

    await userEvent.click(await screen.findByRole('button', { name: 'Mark shipped' }));

    expect(await screen.findByText('Order is now shipped')).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith('/api/orders/admin/order-1/status', {
      method: 'PATCH',
      body: { status: 'shipped' },
    });
  });

  it('asks before cancelling an order from the More menu', async () => {
    serve(makeOrder({ status: 'pending', paymentStatus: 'paid' }), {
      change: () => makeOrder({ status: 'cancelled', paymentStatus: 'paid' }),
    });
    renderApp('/orders/order-1');

    await userEvent.click((await openMoreMenu()).getByRole('menuitem', { name: 'Cancel order' }));
    const dialog = screen.getByRole('dialog', { name: 'Cancel order' });
    expect(dialog).toHaveTextContent('stock goes back on sale');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel order' }));

    expect(await screen.findByText('Order is now cancelled')).toBeInTheDocument();
    // A paid order that was cancelled can now be refunded.
    await waitFor(() =>
      expect(screen.getByText('Cancelled', { selector: '[data-slot=badge]' })).toBeInTheDocument(),
    );
    const menu = await openMoreMenu();
    expect(menu.getByRole('menuitem', { name: 'Record refund' })).toBeInTheDocument();
  });

  it('shows the backend message when a move is refused', async () => {
    serve(makeOrder({ status: 'confirmed', paymentStatus: 'paid' }), {
      change: () => {
        throw new ApiError(409, { error: { message: 'An order cannot move from cancelled' } });
      },
    });
    renderApp('/orders/order-1');

    await userEvent.click(await screen.findByRole('button', { name: 'Mark shipped' }));

    expect(await screen.findByText('An order cannot move from cancelled')).toBeInTheDocument();
  });
});

describe('activity', () => {
  it('lists staff changes with who made them, then when the order was placed', async () => {
    serve(makeOrder({ status: 'confirmed', paymentStatus: 'paid' }), {
      entries: [
        makeEntry({
          action: 'status_change',
          changes: { status: ['pending', 'confirmed'] },
          createdAt: '2026-11-10T04:00:00.000Z',
        }),
        makeEntry(),
      ],
    });
    renderApp('/orders/order-1');

    const activity = within(await screen.findByRole('list', { name: 'Activity' }));
    const events = activity.getAllByRole('listitem');
    expect(events).toHaveLength(3);
    expect(events[0]).toHaveTextContent('Status changed');
    expect(events[0]).toHaveTextContent('Status: Pending → Confirmed');
    expect(events[0]).toHaveTextContent('ana@example.com');
    expect(events[1]).toHaveTextContent('Payment status: Payment to check → Paid');
    expect(events[2]).toHaveTextContent('Placed by the customer');
    expect(requestMock).toHaveBeenCalledWith('/api/audit-logs', {
      query: { page: 1, entityType: 'order', entityId: 'order-1', limit: 20 },
    });
  });

  it('links to the full log when there are more entries than it shows', async () => {
    serve(makeOrder(), { entries: [makeEntry()], total: 25 });
    renderApp('/orders/order-1');

    expect(await screen.findByRole('link', { name: 'See all in Audit log' })).toHaveAttribute(
      'href',
      '/audit-log?entityType=order&entityId=order-1',
    );
    expect(screen.queryByText('Placed by the customer')).not.toBeInTheDocument();
  });
});

describe('permissions', () => {
  it('links to the order history from the More menu', async () => {
    serve(makeOrder());
    renderApp('/orders/order-1');

    const menu = await openMoreMenu();
    expect(menu.getByRole('menuitem', { name: 'History' })).toHaveAttribute(
      'href',
      '/audit-log?entityType=order&entityId=order-1',
    );
  });

  it('leaves out History and Activity for roles that cannot read the audit log', async () => {
    serve(makeOrder({ status: 'pending', paymentStatus: 'paid' }), { user: staff });
    renderApp('/orders/order-1');

    const menu = await openMoreMenu();
    expect(menu.queryByRole('menuitem', { name: 'History' })).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Activity' })).not.toBeInTheDocument();
    expect(requestMock).not.toHaveBeenCalledWith('/api/audit-logs', expect.anything());
  });

  it('leaves out Record refund for roles without orders.refund', async () => {
    serve(makeOrder({ status: 'delivered', paymentStatus: 'paid' }), { user: staff });
    renderApp('/orders/order-1');

    await heading('ORD-000123');
    // Staff can neither refund nor read the log, so a delivered order has no More menu.
    expect(screen.queryByRole('button', { name: 'More' })).not.toBeInTheDocument();
  });

  it('shows the order without actions to roles that can only view it', async () => {
    serve(makeOrder(), { user: { ...staff, permissions: ['orders.view'] } });
    renderApp('/orders/order-1');

    await heading('ORD-000123');
    expect(section('Check the payment')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm payment' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'More' })).not.toBeInTheDocument();
  });
});
