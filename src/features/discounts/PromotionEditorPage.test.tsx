import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { refreshSession, request } from '@/lib/api';
import { renderApp } from '@/test/render';
import { admin } from '@/test/users';
import { categoryTree, makeProduct } from '@/features/products/test-data';
import type { Promotion } from './api';

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  request: vi.fn(),
  refreshSession: vi.fn(),
}));

const requestMock = vi.mocked(request);

const products = [
  makeProduct({ id: 'p-cup', name: 'Cup' }),
  makeProduct({ id: 'p-saucer', name: 'Saucer' }),
  makeProduct({ id: 'p-spoon', name: 'Spoon' }),
];

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
    categoryIds: ['cat-shoes'],
    createdAt: '2026-11-11T00:00:00.000Z',
    updatedAt: '2026-11-11T00:00:00.000Z',
    ...overrides,
  };
}

/** Serves a promotion, products, and categories, and answers writes with it. */
function serve(promotion = makePromotion()) {
  requestMock.mockImplementation(async (path, options) => {
    if (path === '/api/auth/me') return { data: admin };
    if (options?.method) return { data: promotion };
    if (path === '/api/categories/tree') return { data: categoryTree };
    if (path === '/api/products/admin') {
      return { data: products, meta: { page: 1, limit: 20, total: products.length } };
    }
    const product = products.find((item) => path === `/api/products/admin/${item.id}`);
    if (product) return { data: product };
    if (path === `/api/promotions/${promotion.id}`) return { data: promotion };
    if (path === '/api/promotions') return { data: [promotion] };
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

async function pick(name: string) {
  const options = within(await screen.findByRole('group', { name: 'Products to choose from' }));
  await userEvent.click(options.getByRole('checkbox', { name: new RegExp(name) }));
}

beforeEach(() => {
  requestMock.mockReset();
  vi.mocked(refreshSession).mockResolvedValue(true);
});

describe('buy X get Y', () => {
  it('asks for what it covers before sending', async () => {
    serve();
    renderApp('/discounts/promotions/new');

    await userEvent.type(await screen.findByLabelText('Name'), 'Socks deal');
    await userEvent.click(saveBar().getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Choose at least one product or category.')).toBeInTheDocument();
    expect(sent('POST')).toHaveLength(0);
  });

  it('creates buy 2 get 1 free on a category, with the bundle fields empty', async () => {
    serve(makePromotion({ id: 'promo-9' }));
    const { router } = renderApp('/discounts/promotions/new');

    await userEvent.type(await screen.findByLabelText('Name'), 'Socks deal');
    expect(screen.getByLabelText('Customer buys')).toHaveValue('2');
    expect(screen.getByLabelText('At percent off')).toHaveValue('100');
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Men › Shoes' }));
    await userEvent.click(saveBar().getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/discounts/promotions/promo-9'),
    );
    expect(sent('POST')[0]).toEqual([
      '/api/promotions',
      {
        method: 'POST',
        body: {
          name: 'Socks deal',
          type: 'buy_x_get_y',
          isActive: true,
          startsAt: null,
          endsAt: null,
          buyQuantity: 2,
          getQuantity: 1,
          getPercentOff: 100,
          discountType: null,
          discountValue: null,
          productIds: [],
          categoryIds: ['cat-shoes'],
        },
      },
    ]);
  });

  it('sends only the name when only the name changes', async () => {
    serve();
    renderApp('/discounts/promotions/promo-1');

    await userEvent.type(await screen.findByLabelText('Name'), ' 2');
    await userEvent.click(saveBar().getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(sent('PATCH')).toHaveLength(1));
    expect(sent('PATCH')[0][1]?.body).toEqual({ name: 'Socks deal 2' });
  });

  it('sends the whole offer when part of it changes', async () => {
    serve();
    renderApp('/discounts/promotions/promo-1');

    const buys = await screen.findByLabelText('Customer buys');
    await userEvent.clear(buys);
    await userEvent.type(buys, '3');
    await userEvent.click(saveBar().getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(sent('PATCH')).toHaveLength(1));
    expect(sent('PATCH')[0][1]?.body).toEqual({
      type: 'buy_x_get_y',
      buyQuantity: 3,
      getQuantity: 1,
      getPercentOff: 100,
      discountType: null,
      discountValue: null,
      productIds: [],
      categoryIds: ['cat-shoes'],
    });
  });
});

describe('bundles', () => {
  it('needs 2 to 10 products', async () => {
    serve();
    renderApp('/discounts/promotions/new?type=bundle');

    expect(await screen.findByRole('heading', { name: 'New bundle' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Name'), 'Gift set');
    await pick('Cup');
    await userEvent.type(screen.getByLabelText('Percent off each set'), '15');
    await userEvent.click(saveBar().getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Choose 2 to 10 products for the bundle.')).toBeInTheDocument();
    expect(sent('POST')).toHaveLength(0);
  });

  it('creates a bundle with a fixed amount off each set, in centavos, and no categories', async () => {
    serve(makePromotion({ id: 'promo-9' }));
    renderApp('/discounts/promotions/new?type=bundle');

    await userEvent.type(await screen.findByLabelText('Name'), 'Tea set');
    await pick('Cup');
    await pick('Saucer');
    // A bundle has no categories.
    expect(screen.queryByRole('group', { name: 'Categories' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Fixed amount' }));
    await userEvent.type(screen.getByLabelText('Amount off each set'), '50');
    await userEvent.click(saveBar().getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(sent('POST')).toHaveLength(1));
    expect(sent('POST')[0][1]?.body).toMatchObject({
      type: 'bundle',
      buyQuantity: null,
      getQuantity: null,
      getPercentOff: null,
      discountType: 'fixed',
      discountValue: 5000,
      productIds: ['p-cup', 'p-saucer'],
      categoryIds: [],
    });
  });
});

describe('from the Discounts list', () => {
  it('offers buy X get Y and bundles, and opens a promotion', async () => {
    serve();
    renderApp('/discounts');

    expect(await screen.findByRole('link', { name: 'Socks deal' })).toHaveAttribute(
      'href',
      '/discounts/promotions/promo-1',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Create discount' }));
    expect(screen.getByRole('menuitem', { name: /^Buy X get Y/ })).toHaveAttribute(
      'href',
      '/discounts/promotions/new',
    );
    expect(screen.getByRole('menuitem', { name: /^Bundle/ })).toHaveAttribute(
      'href',
      '/discounts/promotions/new?type=bundle',
    );
  });
});
