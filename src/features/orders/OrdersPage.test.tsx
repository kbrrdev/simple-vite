import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, refreshSession, request } from '@/lib/api';
import { renderApp } from '@/test/render';
import { admin } from '@/test/users';
import type { Order } from './api';
import { makeOrder } from './test-data';

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  request: vi.fn(),
  refreshSession: vi.fn(),
}));

const requestMock = vi.mocked(request);

/** Answers the session check, then hands other requests to the given handler. */
function api(handler: (path: string, options?: Parameters<typeof request>[1]) => unknown) {
  requestMock.mockImplementation(async (path, options) =>
    path === '/api/auth/me' ? { data: admin } : handler(path, options),
  );
}

function listOf(orders: Order[], total = orders.length) {
  return { data: orders, meta: { page: 1, limit: 20, total } };
}

function lastListQuery() {
  const calls = requestMock.mock.calls.filter(([path]) => path === '/api/orders/admin');
  return calls.at(-1)?.[1]?.query;
}

beforeEach(() => {
  requestMock.mockReset();
  vi.mocked(refreshSession).mockResolvedValue(true);
});

describe('the orders list', () => {
  it('shows a loading state, then the orders with their status and total', async () => {
    api(() =>
      listOf([
        makeOrder(),
        makeOrder({ id: 'order-2', orderNumber: 'ORD-000124', isGuest: true, status: 'cancelled' }),
      ]),
    );
    renderApp('/orders');

    expect(await screen.findByText('Loading…')).toBeInTheDocument();
    const link = await screen.findByRole('link', { name: /ORD-000123/ });
    expect(link).toHaveAttribute('href', '/orders/order-1');
    expect(within(link).getByText('maria@example.com')).toBeInTheDocument();
    expect(within(link).getByText('Payment to check')).toBeInTheDocument();
    expect(within(link).getByText('₱1,150.00')).toBeInTheDocument();

    const guest = screen.getByRole('link', { name: /ORD-000124/ });
    expect(within(guest).getByText('Guest · maria@example.com')).toBeInTheDocument();
    expect(within(guest).getByText('Cancelled')).toBeInTheDocument();
  });

  it('shows an empty state', async () => {
    api(() => listOf([]));
    renderApp('/orders');

    expect(await screen.findByText('No orders yet.')).toBeInTheDocument();
  });

  it('shows the request id when the server fails', async () => {
    api(() => {
      throw new ApiError(500, { error: { message: 'Internal error', requestId: 'req-9' } });
    });
    renderApp('/orders');

    expect(await screen.findByRole('alert')).toHaveTextContent('Reference: req-9');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

describe('filtering', () => {
  it('reads the filters and page from the URL', async () => {
    api(() => listOf([makeOrder()], 45));
    renderApp('/orders?status=shipped&paymentStatus=paid&page=2');

    await screen.findByRole('link', { name: /ORD-000123/ });
    expect(screen.getByLabelText('Status')).toHaveValue('shipped');
    expect(screen.getByLabelText('Payment')).toHaveValue('paid');
    expect(lastListQuery()).toEqual({
      page: 2,
      limit: 20,
      status: 'shipped',
      paymentStatus: 'paid',
    });
  });

  it('ignores filters the backend does not know', async () => {
    api(() => listOf([]));
    renderApp('/orders?status=lost');

    await screen.findByText('No orders yet.');
    expect(lastListQuery()?.status).toBeUndefined();
  });

  it('changes a filter, keeps it in the URL, and goes back to the first page', async () => {
    api(() => listOf([makeOrder()], 45));
    const { router } = renderApp('/orders?page=2');

    await screen.findByRole('link', { name: /ORD-000123/ });
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'Confirmed');

    expect(router.state.location.search).toBe('?status=confirmed');
    expect(lastListQuery()).toMatchObject({ page: 1, status: 'confirmed' });
  });

  it('shows payments to check, then clears the filters', async () => {
    api(() => listOf([]));
    const { router } = renderApp('/orders');

    const toggle = await screen.findByRole('button', { name: 'Payments to check' });
    await userEvent.click(toggle);

    expect(router.state.location.search).toBe('?paymentStatus=submitted');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByText('No orders match these filters.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(router.state.location.search).toBe('');
  });
});
