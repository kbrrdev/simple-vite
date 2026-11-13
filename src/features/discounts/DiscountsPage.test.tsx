import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, refreshSession, request } from '@/lib/api';
import type { User } from '@/lib/auth';
import { renderApp } from '@/test/render';
import { admin, staff } from '@/test/users';
import type { Coupon, Promotion, Sale } from './api';

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  request: vi.fn(),
  refreshSession: vi.fn(),
}));

const requestMock = vi.mocked(request);
const future = '2099-01-01T00:00:00.000Z';
const past = '2000-01-01T00:00:00.000Z';

function makeSale(overrides: Partial<Sale> = {}): Sale {
  return {
    id: 'sale-1',
    name: 'Payday sale',
    discountType: 'percent',
    discountValue: 20,
    startsAt: null,
    endsAt: null,
    isActive: true,
    stockCap: null,
    soldCount: 0,
    productIds: ['p1', 'p2'],
    categoryIds: ['c1'],
    createdAt: '2026-11-10T00:00:00.000Z',
    updatedAt: '2026-11-10T00:00:00.000Z',
    ...overrides,
  };
}

function makeCoupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: 'coupon-1',
    code: 'WELCOME10',
    discountType: 'fixed',
    discountValue: 10000,
    maxDiscountCents: null,
    minSubtotalCents: 50000,
    startsAt: null,
    endsAt: null,
    usageLimit: null,
    perCustomerLimit: 1,
    allowSaleItems: false,
    allowGuests: true,
    isAutomatic: false,
    isActive: true,
    usedCount: 14,
    discountGivenCents: 140000,
    createdAt: '2026-11-12T00:00:00.000Z',
    updatedAt: '2026-11-12T00:00:00.000Z',
    ...overrides,
  };
}

function makePromotion(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: 'promo-1',
    name: 'Socks deal',
    type: 'buy_x_get_y',
    buyQuantity: 2,
    getQuantity: 1,
    getPercentOff: 100,
    discountType: null,
    discountValue: null,
    startsAt: null,
    endsAt: null,
    isActive: true,
    productIds: [],
    categoryIds: ['c2'],
    createdAt: '2026-11-11T00:00:00.000Z',
    updatedAt: '2026-11-11T00:00:00.000Z',
    ...overrides,
  };
}

interface Lists {
  sales?: Sale[];
  coupons?: Coupon[];
  promotions?: Promotion[];
}

/** Serves the three lists. `change` handles updates and deletes, and can throw to refuse. */
function serve(lists: Lists, change: () => unknown = () => ({ data: {} }), user: User = admin) {
  requestMock.mockImplementation(async (path, options) => {
    if (path === '/api/auth/me') return { data: user };
    if (options?.method) return change();
    if (path === '/api/sales') return { data: lists.sales ?? [] };
    if (path === '/api/coupons') return { data: lists.coupons ?? [] };
    if (path === '/api/promotions') return { data: lists.promotions ?? [] };
    return undefined;
  });
}

function rowsText() {
  return within(screen.getByRole('list', { name: 'Discounts' }))
    .getAllByRole('listitem')
    .map((row) => row.textContent);
}

beforeEach(() => {
  requestMock.mockReset();
  vi.mocked(refreshSession).mockResolvedValue(true);
});

describe('the discounts list', () => {
  it('merges sales, coupons, and promotions, newest first, saying what each does', async () => {
    serve({
      sales: [
        makeSale(),
        makeSale({
          id: 'sale-2',
          name: 'Flash',
          stockCap: 100,
          soldCount: 38,
          createdAt: '2026-11-09T00:00:00.000Z',
        }),
      ],
      coupons: [
        makeCoupon(),
        makeCoupon({
          id: 'coupon-2',
          code: 'SHIPFREE',
          discountType: 'free_shipping',
          discountValue: null,
          minSubtotalCents: null,
          isAutomatic: true,
          usedCount: 1,
          discountGivenCents: 15000,
          createdAt: '2026-11-08T00:00:00.000Z',
        }),
      ],
      promotions: [
        makePromotion(),
        makePromotion({
          id: 'promo-2',
          name: 'Gift set',
          type: 'bundle',
          buyQuantity: null,
          getQuantity: null,
          getPercentOff: null,
          discountType: 'fixed',
          discountValue: 5000,
          productIds: ['p1', 'p2', 'p3'],
          categoryIds: [],
          createdAt: '2026-11-07T00:00:00.000Z',
        }),
      ],
    });
    renderApp('/discounts');

    expect(await screen.findByText('Loading…')).toBeInTheDocument();
    await screen.findByRole('list', { name: 'Discounts' });
    expect(rowsText()).toEqual([
      'WELCOME10ActiveCoupon · ₱100.00 off · over ₱500.0014 uses · ₱1,400.00 given',
      'Socks dealActiveBuy X get Y · Buy 2 get 1 free · 1 category',
      'Payday saleActiveSale · 20% off · 2 products, 1 category',
      'FlashActiveFlash sale · 20% off · 2 products, 1 category38 of 100 sold',
      'SHIPFREEActiveAutomatic · Free shipping1 use · ₱150.00 given',
      'Gift setActiveBundle · 3 products · ₱50.00 off each set',
    ]);
  });

  it('shows each status in its tab', async () => {
    serve({
      sales: [
        makeSale({ id: 's1', name: 'Running' }),
        makeSale({ id: 's2', name: 'Later', startsAt: future }),
        makeSale({ id: 's3', name: 'Done', endsAt: past }),
        makeSale({ id: 's4', name: 'Paused', isActive: false }),
      ],
    });
    renderApp('/discounts?status=scheduled');

    await screen.findByRole('list', { name: 'Discounts' });
    expect(rowsText()).toEqual([expect.stringMatching(/^LaterScheduled/)]);

    const tabs = within(screen.getByRole('navigation', { name: 'Discount views' }));
    await userEvent.click(tabs.getByRole('link', { name: 'Expired' }));
    expect(rowsText()).toEqual([expect.stringMatching(/^DoneExpired/)]);

    await userEvent.click(tabs.getByRole('link', { name: 'All' }));
    expect(rowsText()).toHaveLength(4);
    expect(screen.getByText('Off')).toBeInTheDocument();
  });

  it('shows an empty state', async () => {
    serve({});
    renderApp('/discounts');

    expect(await screen.findByRole('heading', { name: 'No discounts yet' })).toBeInTheDocument();
  });
});

describe('row actions', () => {
  it('asks before turning a discount off, then sends it to its own route', async () => {
    serve({ coupons: [makeCoupon()] });
    renderApp('/discounts');

    await userEvent.click(
      await screen.findByRole('button', { name: 'More actions for WELCOME10' }),
    );
    await userEvent.click(screen.getByRole('menuitem', { name: 'Turn off' }));
    await userEvent.click(
      within(screen.getByRole('dialog', { name: 'Turn off discount' })).getByRole('button', {
        name: 'Turn off',
      }),
    );

    await waitFor(() =>
      expect(requestMock).toHaveBeenCalledWith('/api/coupons/coupon-1', {
        method: 'PATCH',
        body: { isActive: false },
      }),
    );
  });

  it('shows why a used coupon cannot be deleted', async () => {
    serve({ coupons: [makeCoupon()] }, () => {
      throw new ApiError(409, {
        error: { message: 'Orders used this coupon. Turn it off instead.' },
      });
    });
    renderApp('/discounts');

    await userEvent.click(
      await screen.findByRole('button', { name: 'More actions for WELCOME10' }),
    );
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete discount' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Turn it off instead');
    expect(requestMock).toHaveBeenCalledWith('/api/coupons/coupon-1', { method: 'DELETE' });
  });
});

describe('permissions', () => {
  it('shows No access, and no nav link, without promotions.manage', async () => {
    serve({}, undefined, staff);
    renderApp('/discounts');

    expect(await screen.findByRole('heading', { name: 'No access' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Discounts' })).not.toBeInTheDocument();
    expect(requestMock).not.toHaveBeenCalledWith('/api/sales');
  });
});
