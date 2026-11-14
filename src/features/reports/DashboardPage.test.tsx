import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, refreshSession, request } from '@/lib/api';
import type { User } from '@/lib/auth';
import { renderApp } from '@/test/render';
import { admin, staff } from '@/test/users';
import type {
  LowStockVariant,
  ReportSales,
  ReportSalesBy,
  ReportSummary,
  ReportTopProducts,
} from './api';
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
  saleDiscountCents: 20000,
  promotionDiscountCents: 10000,
  couponDiscountCents: 5000,
  netCollectedCents: 4190000,
  taxCents: 517000,
  shippingCents: 435000,
  newCustomers: 9,
  customers: 30,
  returningCustomers: 12,
  returningCustomerRatePercent: 40,
  taxByRate: [{ ratePercent: 12, pricesIncludeTax: true, taxableCents: 4308036, taxCents: 517000 }],
};

/** What the backend adds with compare=previous_period. */
const comparison: Pick<ReportSummary, 'previous' | 'changes'> = {
  previous: { ...summary, from: '2026-09-13', to: '2026-10-12', grossSalesCents: 4289000 },
  changes: {
    grossSalesCents: 12.5,
    netCollectedCents: -3.25,
    ordersPlaced: 0,
    averageOrderValueCents: null,
  },
};

function point(date: string, orders: number, grossSalesCents: number, collectedCents: number) {
  return {
    date,
    orders,
    grossSalesCents,
    collectedCents,
    netCollectedCents: collectedCents,
    refundedCents: 0,
    averageOrderValueCents: Math.round(grossSalesCents / orders),
    itemsSold: orders * 2,
    discountCents: 0,
  };
}

const sales: ReportSales = {
  from: summary.from,
  to: summary.to,
  interval: 'day',
  points: [point('2026-11-10', 3, 450000, 300000), point('2026-11-11', 1, 120000, 120000)],
};

const salesPrevious: ReportSales['previous'] = {
  from: '2026-11-08',
  to: '2026-11-09',
  points: [point('2026-11-08', 2, 200000, 200000), point('2026-11-09', 1, 90000, 90000)],
};

const salesBy: ReportSalesBy = {
  from: summary.from,
  to: summary.to,
  dimension: 'payment_method',
  rows: [
    { key: 'gcash', label: 'GCash', grossSalesCents: 3000000, orders: 20 },
    { key: 'cod', label: 'Cash on delivery', grossSalesCents: 1825000, orders: 17 },
  ],
};

const top: ReportTopProducts = {
  from: summary.from,
  to: summary.to,
  sort: 'quantity',
  items: [
    {
      productId: 'p1',
      imageUrl: 'https://cdn.example.com/p1.jpg',
      name: 'Trail Runner',
      active: true,
      quantity: 42,
      revenueCents: 1890000,
    },
    {
      productId: 'p2',
      imageUrl: null,
      name: 'Old Boot',
      active: false,
      quantity: 5,
      revenueCents: 250000,
    },
  ],
};

const low: LowStockVariant[] = [
  {
    imageUrl: null,
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
    const query = options?.query;
    const replaced = override(path, query);
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
        return { data: query?.compare ? { ...summary, ...comparison } : summary };
      case '/api/reports/sales':
        return { data: query?.compare ? { ...sales, previous: salesPrevious } : sales };
      case '/api/reports/sales-by':
        return { data: { ...salesBy, dimension: query?.dimension ?? 'payment_method' } };
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
    // Each row says the count first, as Shopify's to-do list does.
    expect(screen.getByRole('link', { name: 'Confirm 3 payments' })).toHaveTextContent(
      '3 payments to confirmCustomers sent a payment reference',
    );
    expect(screen.getByRole('link', { name: 'Ship 2 orders' })).toHaveTextContent(
      '2 orders to ship',
    );
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

describe('the metric cards', () => {
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
    expect(screen.getByText('Compared with Sep 13, 2026 – Oct 12, 2026')).toBeInTheDocument();
  });

  it("shows the backend's change from the previous period, in words for screen readers", async () => {
    serve();
    renderApp('/');

    const figures = await screen.findByRole('region', { name: 'Summary' });
    const card = (name: RegExp) => within(figures).getByRole('button', { name });
    expect(card(/^Gross sales/)).toHaveTextContent('up 12.5% from the previous period');
    expect(card(/^Collected, after refunds/)).toHaveTextContent(
      'down 3.3% from the previous period',
    );
    expect(card(/^Orders placed/)).toHaveTextContent('no change from the previous period');
    // No percent can say how far a figure rose from nothing.
    expect(card(/^Average order/)).toHaveTextContent('No earlier sales to compare');
  });

  it('turns the comparison off, keeping it in the URL', async () => {
    serve();
    const { router } = renderApp('/');

    await screen.findByText(/^Compared with/);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Compare to previous period' }));

    expect(router.state.location.search).toBe('?compare=off');
    await waitFor(() => expect(screen.queryByText(/^Compared with/)).not.toBeInTheDocument());
    expect(lastQuery('/api/reports/summary')).toEqual({});
    expect(lastQuery('/api/reports/sales')).toEqual({ interval: 'day' });
    expect(screen.queryByText(/from the previous period/)).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Legend' })).not.toBeInTheDocument();
  });

  it('fills the chart with the card picked, keeping it in the URL', async () => {
    serve();
    const { router } = renderApp('/');

    const figures = await screen.findByRole('region', { name: 'Summary' });
    expect(within(figures).getByRole('button', { name: /^Gross sales/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await userEvent.click(within(figures).getByRole('button', { name: /^Orders placed/ }));

    expect(router.state.location.search).toBe('?metric=orders');
    expect(
      await screen.findByRole('img', {
        name: /^Line chart of orders, apart from cancelled by day/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Orders, apart from cancelled' }),
    ).toBeInTheDocument();
  });

  it('keeps the other cards working when the summary fails', async () => {
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

describe('the breakdown', () => {
  it('lists the other figures, each beside its label', async () => {
    serve();
    renderApp('/');

    await screen.findByRole('region', { name: 'Summary' });
    const more = screen.getByLabelText('More figures');
    const pairs = Array.from(more.querySelectorAll('dt')).map((term) => [
      term.textContent,
      term.nextElementSibling?.textContent,
    ]);
    expect(pairs).toEqual([
      ['Collected, before refunds', '₱43,100.00'],
      ['Refunded', '₱1,200.00'],
      ['Sale discounts', '₱200.00'],
      ['Promotion discounts', '₱100.00'],
      ['Coupon discounts', '₱50.00'],
      ['Tax', '₱5,170.00'],
      ['Shipping', '₱4,350.00'],
      ['Items sold', '112'],
      ['Cancelled orders', '2'],
      ['Customers', '30'],
      ['New customers', '9'],
      ['Returning customers', '12 (40%)'],
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
});

describe('the date range', () => {
  it('uses the backend default with no dates in the URL', async () => {
    serve();
    renderApp('/');

    await screen.findByRole('region', { name: 'Summary' });
    expect(screen.getByLabelText('Range')).toHaveValue('30d');
    expect(lastQuery('/api/reports/summary')).toEqual({ compare: 'previous_period' });
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
      expect(lastQuery('/api/reports/summary')).toEqual({
        from: params.get('from'),
        to: today,
        compare: 'previous_period',
      }),
    );
    for (const path of [
      '/api/reports/sales',
      '/api/reports/sales-by',
      '/api/reports/top-products',
    ]) {
      expect(lastQuery(path)).toMatchObject({ from: params.get('from'), to: today });
    }
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

describe('the chart', () => {
  it('names the chart, and lists each day beside the one it is compared with', async () => {
    serve();
    renderApp('/');

    expect(
      await screen.findByRole('img', {
        name: 'Line chart of gross sales by day, with the previous period dashed. Show as table lists the figures.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Legend' })).toHaveTextContent(
      'This periodPrevious period',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Show as table' }));

    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows[0]).toHaveTextContent('PeriodGross salesPrevious periodPrevious gross sales');
    expect(rows[1]).toHaveTextContent('Nov 10₱4,500.00Nov 8₱2,000.00');
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

describe('sales by', () => {
  it('splits sales by payment method, then by category on request', async () => {
    serve();
    const { router } = renderApp('/');

    const list = await screen.findByRole('list', { name: 'Sales by payment method' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('GCash20 orders ₱30,000.00');
    expect(rows[1]).toHaveTextContent('Cash on delivery17 orders ₱18,250.00');

    await userEvent.click(screen.getByRole('button', { name: 'Category' }));
    expect(router.state.location.search).toBe('?by=category');
    await waitFor(() =>
      expect(lastQuery('/api/reports/sales-by')).toMatchObject({ dimension: 'category' }),
    );
    expect(screen.getByText(/do not add up to gross sales/)).toBeInTheDocument();
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
    for (const path of ['/api/reports/summary', '/api/reports/sales', '/api/reports/sales-by']) {
      expect(requestMock).not.toHaveBeenCalledWith(path, expect.anything());
    }
  });

  it('points a role with no reports to the menu', async () => {
    serve(undefined, { ...staff, permissions: ['orders.view'] });
    renderApp('/');

    expect(await screen.findByText(/Your role has no reports/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Needs attention' })).not.toBeInTheDocument();
  });
});
