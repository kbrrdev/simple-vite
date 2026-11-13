import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, refreshSession, request } from '@/lib/api';
import { renderApp } from '@/test/render';
import { chooseFromMore } from '@/test/menu';
import { admin } from '@/test/users';
import { categoryTree, makeProduct } from '@/features/products/test-data';
import type { Sale } from './api';

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  request: vi.fn(),
  refreshSession: vi.fn(),
}));

const requestMock = vi.mocked(request);

const shoes = makeProduct({ id: 'p-shoes', name: 'Trail Runner' });
const socks = makeProduct({ id: 'p-socks', name: 'Wool Socks' });

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
    productIds: ['p-shoes'],
    categoryIds: [],
    createdAt: '2026-11-10T00:00:00.000Z',
    updatedAt: '2026-11-10T00:00:00.000Z',
    ...overrides,
  };
}

/** Serves a sale, products, and categories. `change` handles writes, and can throw to refuse. */
function serve(sale = makeSale(), change: () => unknown = () => ({ data: sale })) {
  requestMock.mockImplementation(async (path, options) => {
    if (path === '/api/auth/me') return { data: admin };
    if (options?.method) return change();
    if (path === '/api/categories/tree') return { data: categoryTree };
    if (path === '/api/products/admin') {
      return { data: [shoes, socks], meta: { page: 1, limit: 20, total: 2 } };
    }
    if (path === `/api/products/admin/${shoes.id}`) return { data: shoes };
    if (path === `/api/products/admin/${socks.id}`) return { data: socks };
    if (path === `/api/sales/${sale.id}`) return { data: sale };
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

describe('a new sale', () => {
  it('checks the form before sending', async () => {
    serve();
    renderApp('/discounts/sales/new');

    await userEvent.type(await screen.findByLabelText('Percent off'), '95');
    await userEvent.click(saveBar().getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Enter a name.')).toBeInTheDocument();
    expect(screen.getByText('Enter a whole percent from 1 to 90.')).toBeInTheDocument();
    expect(screen.getByText('Choose at least one product or category.')).toBeInTheDocument();
    expect(sent('POST')).toHaveLength(0);
  });

  it('creates a sale on chosen products and categories, then opens it', async () => {
    serve(makeSale({ id: 'sale-9' }));
    const { router } = renderApp('/discounts/sales/new');

    await userEvent.type(await screen.findByLabelText('Name'), 'Payday sale');
    await userEvent.type(screen.getByLabelText('Percent off'), '20');
    const options = within(await screen.findByRole('group', { name: 'Products to choose from' }));
    await userEvent.click(options.getByRole('checkbox', { name: /Wool Socks/ }));
    expect(
      within(screen.getByRole('list', { name: 'Chosen products' })).getByText('Wool Socks'),
    ).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Men › Shoes' }));
    await userEvent.click(saveBar().getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/discounts/sales/sale-9'));
    expect(sent('POST')[0]).toEqual([
      '/api/sales',
      {
        method: 'POST',
        body: {
          name: 'Payday sale',
          discountType: 'percent',
          discountValue: 20,
          isActive: true,
          startsAt: null,
          endsAt: null,
          stockCap: null,
          productIds: ['p-socks'],
          categoryIds: ['cat-shoes'],
        },
      },
    ]);
  });

  it('sends a fixed amount in centavos, and a stock cap', async () => {
    serve(makeSale({ id: 'sale-9' }));
    renderApp('/discounts/sales/new');

    await userEvent.type(await screen.findByLabelText('Name'), 'Flash');
    await userEvent.click(screen.getByRole('radio', { name: 'Fixed amount' }));
    await userEvent.type(screen.getByLabelText('Amount off each item'), '50.50');
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Women' }));
    await userEvent.click(screen.getByRole('checkbox', { name: /Limit how many units/ }));
    await userEvent.type(screen.getByLabelText('Units'), '100');
    await userEvent.click(saveBar().getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(sent('POST')).toHaveLength(1));
    expect(sent('POST')[0][1]?.body).toMatchObject({
      discountType: 'fixed',
      discountValue: 5050,
      stockCap: 100,
      categoryIds: ['cat-women'],
    });
  });
});

describe('editing a sale', () => {
  it('shows the sale, and sends only what changed', async () => {
    serve(makeSale({ stockCap: 100, soldCount: 38 }));
    renderApp('/discounts/sales/sale-1');

    expect(await screen.findByRole('heading', { name: 'Payday sale' })).toBeInTheDocument();
    expect(screen.getByText('38 of 100 sold')).toBeInTheDocument();
    expect(
      await within(screen.getByRole('list', { name: 'Chosen products' })).findByText(
        'Trail Runner',
      ),
    ).toBeInTheDocument();

    const value = screen.getByLabelText('Percent off');
    await userEvent.clear(value);
    await userEvent.type(value, '25');
    await userEvent.click(saveBar().getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(requestMock).toHaveBeenCalledWith('/api/sales/sale-1', {
        method: 'PATCH',
        body: { discountType: 'percent', discountValue: 25 },
      }),
    );
  });

  it('keeps the stock cap from going below what has sold', async () => {
    serve(makeSale({ stockCap: 100, soldCount: 38 }));
    renderApp('/discounts/sales/sale-1');

    const units = await screen.findByLabelText('Units');
    await userEvent.clear(units);
    await userEvent.type(units, '20');
    await userEvent.click(saveBar().getByRole('button', { name: 'Save' }));

    expect(screen.getByText(/38 have already sold/)).toBeInTheDocument();
    expect(sent('PATCH')).toHaveLength(0);
  });

  it('shows a refusal from the backend', async () => {
    serve(makeSale(), () => {
      throw new ApiError(400, { error: { message: 'Product or category does not exist' } });
    });
    renderApp('/discounts/sales/sale-1');

    await userEvent.type(await screen.findByLabelText('Name'), ' 2');
    await userEvent.click(saveBar().getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Product or category does not exist',
    );
  });

  it('deletes the sale after asking, then returns to Discounts', async () => {
    serve(makeSale(), () => undefined);
    const { router } = renderApp('/discounts/sales/sale-1');

    await screen.findByRole('heading', { name: 'Payday sale' });
    await chooseFromMore('Delete');
    await userEvent.click(
      within(screen.getByRole('dialog', { name: 'Delete sale' })).getByRole('button', {
        name: 'Delete',
      }),
    );

    await waitFor(() => expect(router.state.location.pathname).toBe('/discounts'));
    expect(requestMock).toHaveBeenCalledWith('/api/sales/sale-1', { method: 'DELETE' });
  });
});

describe('from the Discounts list', () => {
  it('creates a sale from Create discount, and opens a sale from its row', async () => {
    requestMock.mockImplementation(async (path) => {
      if (path === '/api/auth/me') return { data: admin };
      if (path === '/api/sales') return { data: [makeSale()] };
      if (path.startsWith('/api/')) return { data: [] };
      return undefined;
    });
    renderApp('/discounts');

    expect(await screen.findByRole('link', { name: 'Payday sale' })).toHaveAttribute(
      'href',
      '/discounts/sales/sale-1',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Create discount' }));
    expect(screen.getByRole('menuitem', { name: /^Sale/ })).toHaveAttribute(
      'href',
      '/discounts/sales/new',
    );
  });
});
