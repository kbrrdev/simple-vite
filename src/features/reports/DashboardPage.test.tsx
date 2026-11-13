import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, refreshSession, request } from '@/lib/api';
import type { User } from '@/lib/auth';
import { renderApp } from '@/test/render';
import { admin, staff } from '@/test/users';
import type { LowStockVariant, ReportSales, ReportSummary, ReportTopProducts } from './api';
import { manilaToday } from './range';

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  request: vi.fn(),
  refreshSession: vi.fn(),
}));

const requestMock = vi.mocked(request);

const summary: ReportSummary = {
  from: '2026-10-13',
  to: '2026-11-11',
  ordersPlaced: 37,
  cancelledOrders: 2,
  grossSalesCents: 4825000,
  averageOrderValueCents: 130405,
  itemsSold: 112,
  collectedCents: 4310000,
  refundedCents: 120000,
  discountCents: 35000,
  netCollectedCents: 4190000,
  taxCents: 517000,
  shippingCents: 435000,
  newCustomers: 9,
  taxByRate: [{ ratePercent: 12, pricesIncludeTax: true, taxableCents: 4308036, taxCents: 517000 }],
};

const sales: ReportSales = {
  from: summary.from,
  to: summary.to,
  interval: 'day',
  points: [
    { date: '2026-11-10', orders: 3, grossSalesCents: 450000, collectedCents: 300000 },
    { date: '2026-11-11', orders: 1, grossSalesCents: 120000, collectedCents: 120000 },
  ],
};

const top: ReportTopProducts = {
  from: summary.from,
  to: summary.to,
  sort: 'quantity',
  items: [
    { productId: 'p1', name: 'Trail Runner', active: true, quantity: 42, revenueCents: 1890000 },
    { productId: 'p2', name: 'Old Boot', active: false, quantity: 5, revenueCents: 250000 },
  ],
};

const low: LowStockVariant[] = [
  {
    variantId: 'v1',
    productId: 'p1',
    productName: 'Trail Runner',
    option1Name: 'Size',
    option1Value: 'M',
    option2Name: null,
    option2Value: null,
    stock: 0,
  },
];

type Handler = (path: string, query?: Record<string, unknown>) => unknown;

/** Answers every report. `override` can replace one, or throw to fail it. */
function serve(override: Handler = () => undefined, user: User = admin) {
  requestMock.mockImplementation(async (path, options) => {
    if (path === '/api/auth/me') return { data: user };
    const replaced = override(path, options?.query);
    if (replaced !== undefined) return replaced;
    switch (path) {
      case '/api/reports/order-status':
        return {
          data: {
            counts: [],
            needsAttention: { paymentsToConfirm: 3, ordersToConfirm: 0, ordersToShip: 2 },
          },
        };
      case '/api/reports/summary':
        return { data: summary };
      case '/api/reports/sales':
        return { data: sales };
      case '/api/reports/top-products':
        return { data: top };
      case '/api/reports/low-stock':
        return { data: low, meta: { page: 1, limit: 10, total: 1 } };
      default:
        throw new Error(`Unexpected request: ${path}`);
    }
  });
}

function lastQuery(path: string) {
  return requestMock.mock.calls.filter(([calledPath]) => calledPath === path).at(-1)?.[1]?.query;
}

beforeEach(() => {
  requestMock.mockReset();
  vi.mocked(refreshSession).mockResolvedValue(true);
});

describe('needs attention', () => {
  it('lists each waiting task as a link to the matching orders', async () => {
    serve();
    renderApp('/');

    expect(await screen.findByRole('link', { name: 'Confirm 3 payments' })).toHaveAttribute(
      'href',
      '/orders?paymentStatus=submitted',
    );
    expect(screen.getByRole('link', { name: 'Ship 2 orders' })).toHaveAttribute(
      'href',
      '/orders?status=confirmed',
    );
    expect(screen.getByText('2 tasks')).toBeInTheDocument();
    // A task with nothing waiting is left out.
    expect(screen.queryByText('Confirm orders')).not.toBeInTheDocument();
    expect(screen.queryByText(/All caught up/)).not.toBeInTheDocument();
  });

  it('says so when nothing is waiting', async () => {
    serve((path) =>
      path === '/api/reports/order-status'
        ? {
            data: {
              counts: [],
              needsAttention: { paymentsToConfirm: 0, ordersToConfirm: 0, ordersToShip: 0 },
            },
          }
        : undefined,
    );
    renderApp('/');

    expect(await screen.findByText('All caught up.')).toBeInTheDocument();
    const section = screen.getByRole('region', { name: 'Needs attention' });
    expect(within(section).queryByRole('link')).not.toBeInTheDocument();
    expect(within(section).queryByText(/task/)).not.toBeInTheDocument();
  });

  it('uses the singular for one', async () => {
    serve((path) =>
      path === '/api/reports/order-status'
        ? {
            data: {
              counts: [],
              needsAttention: { paymentsToConfirm: 0, ordersToConfirm: 1, ordersToShip: 0 },
            },
          }
        : undefined,
    );
    renderApp('/');

    expect(await screen.findByRole('link', { name: 'Confirm 1 order' })).toHaveAttribute(
      'href',
      '/orders?status=pending',
    );
    expect(screen.getByText('1 task')).toBeInTheDocument();
  });
});

describe('the summary', () => {
  it('shows the figures as the backend counts them, for the range it used', async () => {
    serve();
    renderApp('/');

    const figures = await screen.findByRole('region', { name: 'Summary' });
    expect(within(figures).getByText('₱48,250.00')).toBeInTheDocument();
    expect(within(figures).getByText('₱41,900.00')).toBeInTheDocument();
    expect(within(figures).getByText('37')).toBeInTheDocument();
    expect(within(figures).getByText('₱1,304.05')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Oct 13, 2026 – Nov 11, 2026' }),
    ).toBeInTheDocument();
  });

  it('keeps each secondary figure paired with its label', async () => {
    serve();
    renderApp('/');

    await screen.findByRole('region', { name: 'Summary' });
    const more = screen.getByLabelText('More figures');
    const pairs = Array.from(more.children).map((pair) => [
      pair.querySelector('dt')?.textContent,
      pair.querySelector('dd')?.textContent,
    ]);
    expect(pairs).toEqual([
      ['Items sold', '112'],
      ['Refunded', '₱1,200.00'],
      ['Sale discounts', '₱350.00'],
      ['Cancelled orders', '2'],
      ['New customers', '9'],
      ['Tax', '₱5,170.00'],
      ['Shipping', '₱4,350.00'],
    ]);
  });

  it('lists each tax rate when the rate changed during the range', async () => {
    serve((path) =>
      path === '/api/reports/summary'
        ? {
            data: {
              ...summary,
              taxByRate: [
                { ratePercent: 12, pricesIncludeTax: true, taxableCents: 1, taxCents: 400000 },
                { ratePercent: 10, pricesIncludeTax: true, taxableCents: 1, taxCents: 117000 },
              ],
            },
          }
        : undefined,
    );
    renderApp('/');

    expect(await screen.findByText('VAT 12%')).toBeInTheDocument();
    expect(screen.getByText('VAT 10%')).toBeInTheDocument();
  });

  it('keeps the other cards working when one fails', async () => {
    serve((path) => {
      if (path === '/api/reports/summary') {
        throw new ApiError(500, { error: { message: 'Internal error', requestId: 'req-3' } });
      }
      return undefined;
    });
    renderApp('/');

    expect(await screen.findByRole('alert')).toHaveTextContent('Reference: req-3');
    expect(await screen.findByRole('link', { name: 'Confirm 3 payments' })).toBeInTheDocument();
    expect(await screen.findByRole('list', { name: 'Best sellers' })).toBeInTheDocument();
  });
});

describe('the date range', () => {
  it('uses the backend default with no dates in the URL', async () => {
    serve();
    renderApp('/');

    await screen.findByRole('region', { name: 'Summary' });
    expect(screen.getByLabelText('Range')).toHaveValue('30d');
    expect(lastQuery('/api/reports/summary')).toEqual({});
  });

  it('applies a preset to the URL and to every ranged report', async () => {
    serve();
    const { router } = renderApp('/');

    await screen.findByRole('region', { name: 'Summary' });
    await userEvent.selectOptions(screen.getByLabelText('Range'), 'Last 7 days');

    const today = manilaToday();
    const params = new URLSearchParams(router.state.location.search);
    expect(params.get('to')).toBe(today);
    await waitFor(() =>
      expect(lastQuery('/api/reports/summary')).toEqual({ from: params.get('from'), to: today }),
    );
    expect(lastQuery('/api/reports/sales')).toMatchObject({ from: params.get('from'), to: today });
    expect(lastQuery('/api/reports/top-products')).toMatchObject({
      from: params.get('from'),
      to: today,
    });
  });

  it('applies a custom range, and checks its order first', async () => {
    serve();
    const { router } = renderApp('/');

    await screen.findByRole('region', { name: 'Summary' });
    await userEvent.selectOptions(screen.getByLabelText('Range'), 'Custom range');
    await userEvent.type(screen.getByLabelText('From'), '2026-11-05');
    await userEvent.type(screen.getByLabelText('To'), '2026-11-01');
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(screen.getByText('The first day must come before the last.')).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('To'));
    await userEvent.type(screen.getByLabelText('To'), '2026-11-08');
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(router.state.location.search).toBe('?from=2026-11-05&to=2026-11-08');
  });
});

describe('the sales card', () => {
  it('names the chart and lists the figures as a table', async () => {
    serve();
    renderApp('/');

    expect(
      await screen.findByRole('img', { name: /Line chart of gross sales and collected by day/ }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Show as table' }));

    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Nov 10');
    expect(rows[1]).toHaveTextContent('₱4,500.00');
    expect(rows[1]).toHaveTextContent('₱3,000.00');
  });

  it('groups by week, keeping it in the URL', async () => {
    serve();
    const { router } = renderApp('/');

    await userEvent.click(await screen.findByRole('button', { name: 'Week' }));

    expect(router.state.location.search).toBe('?interval=week');
    await waitFor(() =>
      expect(lastQuery('/api/reports/sales')).toMatchObject({ interval: 'week' }),
    );
    expect(screen.getByRole('button', { name: 'Week' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('best sellers and low stock', () => {
  it('ranks best sellers by revenue on request', async () => {
    serve();
    const { router } = renderApp('/');

    const list = await screen.findByRole('list', { name: 'Best sellers' });
    const first = within(list).getAllByRole('link')[0];
    expect(first).toHaveAttribute('href', '/products/p1');
    expect(first).toHaveTextContent('42 sold');
    expect(within(list).getByText('Inactive')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'By revenue' }));
    expect(router.state.location.search).toBe('?top=revenue');
    await waitFor(() =>
      expect(lastQuery('/api/reports/top-products')).toMatchObject({ sort: 'revenue', limit: 10 }),
    );
  });

  it('shows low stock with its options, and changes the threshold', async () => {
    serve();
    const { router } = renderApp('/?stockPage=2');

    const list = await screen.findByRole('list', { name: 'Low stock' });
    const row = within(list).getByRole('link');
    expect(row).toHaveAttribute('href', '/products/p1');
    expect(row).toHaveTextContent('Size M');
    expect(row).toHaveTextContent('Out of stock');

    const input = screen.getByLabelText('Show at or below');
    await userEvent.clear(input);
    await userEvent.type(input, '10');
    await userEvent.click(screen.getByRole('button', { name: 'Show' }));

    expect(router.state.location.search).toBe('?threshold=10');
    await waitFor(() =>
      expect(lastQuery('/api/reports/low-stock')).toEqual({ page: 1, limit: 10, threshold: 10 }),
    );
  });
});

describe('permissions', () => {
  it('shows a role without sales reports only the daily work', async () => {
    serve(undefined, staff);
    renderApp('/');

    expect(await screen.findByRole('link', { name: 'Confirm 3 payments' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Low stock/ })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Summary' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Best sellers' })).not.toBeInTheDocument();
    expect(requestMock).not.toHaveBeenCalledWith('/api/reports/summary', expect.anything());
  });

  it('points a role with no reports to the menu', async () => {
    serve(undefined, { ...staff, permissions: ['orders.view'] });
    renderApp('/');

    expect(await screen.findByText(/Your role has no reports/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Needs attention' })).not.toBeInTheDocument();
  });
});
