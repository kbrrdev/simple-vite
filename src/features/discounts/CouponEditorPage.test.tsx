import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, refreshSession, request } from '@/lib/api';
import { renderApp } from '@/test/render';
import { chooseFromMore } from '@/test/menu';
import { admin } from '@/test/users';
import type { Coupon } from './api';

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  request: vi.fn(),
  refreshSession: vi.fn(),
}));

const requestMock = vi.mocked(request);

function makeCoupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: 'coupon-1',
    code: 'WELCOME10',
    discountType: 'percent',
    discountValue: 10,
    maxDiscountCents: 20000,
    minSubtotalCents: null,
    startsAt: null,
    endsAt: null,
    usageLimit: 100,
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

/** Serves a coupon. `change` handles writes, and can throw to refuse. */
function serve(coupon = makeCoupon(), change: () => unknown = () => ({ data: coupon })) {
  requestMock.mockImplementation(async (path, options) => {
    if (path === '/api/auth/me') return { data: admin };
    if (options?.method) return change();
    if (path === `/api/coupons/${coupon.id}`) return { data: coupon };
    if (path === '/api/coupons') return { data: [coupon] };
    if (path.startsWith('/api/')) return { data: [] };
    return undefined;
  });
}

function sent(method: string) {
  return requestMock.mock.calls.filter(([, options]) => options?.method === method);
}

function saveBar() {
  return within(screen.getByRole('region', { name: 'Unsaved changes' }));
}

beforeEach(() => {
  requestMock.mockReset();
  vi.mocked(refreshSession).mockResolvedValue(true);
});

describe('a new coupon', () => {
  it('checks the form before sending', async () => {
    serve();
    renderApp('/discounts/coupons/new');

    await userEvent.type(await screen.findByLabelText('Code'), 'X!');
    await userEvent.type(screen.getByLabelText('Percent off'), '150');
    await userEvent.type(screen.getByLabelText('Total uses'), '0');
    await userEvent.click(saveBar().getByRole('button', { name: 'Save' }));

    expect(screen.getByText(/Use 3 to 32 letters/)).toBeInTheDocument();
    expect(screen.getByText('Enter a whole percent from 1 to 100.')).toBeInTheDocument();
    expect(screen.getByText(/Enter a whole number from 1/)).toBeInTheDocument();
    expect(sent('POST')).toHaveLength(0);
  });

  it('creates a code coupon in capitals, with a cap and a minimum, then opens it', async () => {
    serve(makeCoupon({ id: 'coupon-9' }));
    const { router } = renderApp('/discounts/coupons/new');

    await userEvent.type(await screen.findByLabelText('Code'), 'welcome10');
    expect(screen.getByLabelText('Code')).toHaveValue('WELCOME10');
    await userEvent.type(screen.getByLabelText('Percent off'), '10');
    await userEvent.type(screen.getByLabelText('Most it takes off (optional)'), '200');
    await userEvent.type(screen.getByLabelText('Minimum spend (optional)'), '500');
    await userEvent.click(saveBar().getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/discounts/coupons/coupon-9'));
    expect(sent('POST')[0]).toEqual([
      '/api/coupons',
      {
        method: 'POST',
        body: {
          code: 'WELCOME10',
          discountType: 'percent',
          discountValue: 10,
          maxDiscountCents: 20000,
          minSubtotalCents: 50000,
          isAutomatic: false,
          isActive: true,
          startsAt: null,
          endsAt: null,
          usageLimit: null,
          perCustomerLimit: 1,
          allowSaleItems: false,
          allowGuests: true,
        },
      },
    ]);
  });

  it('starts an automatic free shipping discount from the menu, with no per-shopper limit', async () => {
    serve(makeCoupon({ id: 'coupon-9' }));
    renderApp('/discounts/coupons/new?automatic=1&type=free_shipping');

    expect(
      await screen.findByRole('heading', { name: 'New automatic discount' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Free shipping' })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Automatic/ })).toBeChecked();
    expect(screen.queryByLabelText('Percent off')).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Code'), 'SHIPFREE');
    await userEvent.type(screen.getByLabelText('Minimum spend (optional)'), '1500');
    await userEvent.click(saveBar().getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(sent('POST')).toHaveLength(1));
    expect(sent('POST')[0][1]?.body).toMatchObject({
      code: 'SHIPFREE',
      discountType: 'free_shipping',
      discountValue: null,
      maxDiscountCents: null,
      minSubtotalCents: 150000,
      isAutomatic: true,
      perCustomerLimit: null,
    });
  });
});

describe('editing a coupon', () => {
  it('shows its use so far, and sends only what changed', async () => {
    serve();
    renderApp('/discounts/coupons/coupon-1');

    expect(await screen.findByRole('heading', { name: 'WELCOME10' })).toBeInTheDocument();
    const usage = within(screen.getByRole('region', { name: 'Usage' }));
    expect(usage.getByText('14 uses of 100')).toBeInTheDocument();
    expect(usage.getByText(/₱1,400.00 given/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: /Include items already on sale/ }));
    await userEvent.click(saveBar().getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(requestMock).toHaveBeenCalledWith('/api/coupons/coupon-1', {
        method: 'PATCH',
        body: { allowSaleItems: true },
      }),
    );
  });

  it('sends the type and value together when the discount changes', async () => {
    serve();
    renderApp('/discounts/coupons/coupon-1');

    await userEvent.click(await screen.findByRole('radio', { name: 'Fixed amount' }));
    await userEvent.type(screen.getByLabelText('Amount off the order'), '100');
    await userEvent.click(saveBar().getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(sent('PATCH')).toHaveLength(1));
    expect(sent('PATCH')[0][1]?.body).toEqual({
      discountType: 'fixed',
      discountValue: 10000,
      maxDiscountCents: null,
    });
  });

  it('shows a taken code next to the code', async () => {
    serve(makeCoupon(), () => {
      throw new ApiError(409, { error: { message: 'A coupon with this code already exists' } });
    });
    renderApp('/discounts/coupons/coupon-1');

    const code = await screen.findByLabelText('Code');
    await userEvent.clear(code);
    await userEvent.type(code, 'TAKEN');
    await userEvent.click(saveBar().getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('A coupon with this code already exists')).toBeInTheDocument();
    expect(code).toHaveAttribute('aria-invalid', 'true');
  });

  it('explains when a used coupon cannot be deleted', async () => {
    serve(makeCoupon(), () => {
      throw new ApiError(409, {
        error: { message: 'Orders use this coupon, so turn it off instead' },
      });
    });
    renderApp('/discounts/coupons/coupon-1');

    await screen.findByRole('heading', { name: 'WELCOME10' });
    await chooseFromMore('Delete');
    const dialog = screen.getByRole('dialog', { name: 'Delete coupon' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('turn it off instead');
  });
});

describe('from the Discounts list', () => {
  it('offers coupon codes, automatic discounts, and free shipping, and opens a coupon', async () => {
    serve();
    renderApp('/discounts');

    expect(await screen.findByRole('link', { name: 'WELCOME10' })).toHaveAttribute(
      'href',
      '/discounts/coupons/coupon-1',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Create discount' }));
    expect(screen.getByRole('menuitem', { name: /^Coupon code/ })).toHaveAttribute(
      'href',
      '/discounts/coupons/new',
    );
    expect(screen.getByRole('menuitem', { name: /^Automatic discount/ })).toHaveAttribute(
      'href',
      '/discounts/coupons/new?automatic=1',
    );
    expect(screen.getByRole('menuitem', { name: /^Free shipping/ })).toHaveAttribute(
      'href',
      '/discounts/coupons/new?type=free_shipping',
    );
  });
});
