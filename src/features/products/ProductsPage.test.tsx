import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, refreshSession, request } from '@/lib/api';
import { renderApp } from '@/test/render';
import { admin } from '@/test/users';
import type { Product } from './api';
import { categoryTree, makeProduct, makeVariant } from './test-data';

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  request: vi.fn(),
  refreshSession: vi.fn(),
}));

const requestMock = vi.mocked(request);

/** Answers the session and the category tree, and lists the given products. */
function serve(list: () => { data: Product[]; total?: number }) {
  requestMock.mockImplementation(async (path) => {
    if (path === '/api/auth/me') return { data: admin };
    if (path === '/api/categories/tree') return { data: categoryTree };
    const { data, total = data.length } = list();
    return { data, meta: { page: 1, limit: 20, total } };
  });
}

function lastListQuery() {
  const calls = requestMock.mock.calls.filter(([path]) => path === '/api/products/admin');
  return calls.at(-1)?.[1]?.query;
}

beforeEach(() => {
  requestMock.mockReset();
  vi.mocked(refreshSession).mockResolvedValue(true);
});

describe('the products list', () => {
  it('shows each product with its category path, variants, and price range', async () => {
    serve(() => ({
      data: [
        makeProduct({
          variants: [
            makeVariant({ id: 'v1', priceCents: 45000 }),
            makeVariant({ id: 'v2', priceCents: 65000 }),
            // Inactive variants are left out of the range.
            makeVariant({ id: 'v3', priceCents: 99000, active: false }),
          ],
        }),
        makeProduct({ id: 'product-2', name: 'Old Boot', active: false }),
      ],
    }));
    renderApp('/products');

    expect(await screen.findByText('Loading…')).toBeInTheDocument();
    const row = await screen.findByRole('link', { name: /Trail Runner/ });
    expect(row).toHaveAttribute('href', '/products/product-1');
    await waitFor(() => expect(row).toHaveTextContent('Men › Shoes · 3 variants'));
    expect(within(row).getByText('₱450.00 – ₱650.00')).toBeInTheDocument();

    const old = screen.getByRole('link', { name: /Old Boot/ });
    expect(within(old).getByText('Inactive')).toBeInTheDocument();
  });

  it('shows an empty state', async () => {
    serve(() => ({ data: [] }));
    renderApp('/products');

    expect(await screen.findByText(/No products yet/)).toBeInTheDocument();
  });

  it('shows the request id when the server fails', async () => {
    requestMock.mockImplementation(async (path) => {
      if (path === '/api/auth/me') return { data: admin };
      if (path === '/api/categories/tree') return { data: categoryTree };
      throw new ApiError(500, { error: { message: 'Internal error', requestId: 'req-7' } });
    });
    renderApp('/products');

    expect(await screen.findByRole('alert')).toHaveTextContent('Reference: req-7');
  });
});

describe('searching and filtering', () => {
  it('reads the search, category, sort, and page from the URL', async () => {
    serve(() => ({ data: [makeProduct()], total: 45 }));
    renderApp('/products?search=trail&categoryId=cat-men&sort=name&page=2');

    await screen.findByRole('link', { name: /Trail Runner/ });
    expect(screen.getByLabelText('Search')).toHaveValue('trail');
    expect(await screen.findByLabelText('Category')).toHaveValue('cat-men');
    expect(screen.getByLabelText('Sort')).toHaveValue('name');
    expect(lastListQuery()).toEqual({
      page: 2,
      limit: 20,
      search: 'trail',
      categoryId: 'cat-men',
      sort: 'name',
    });
  });

  it('searches on submit and goes back to the first page', async () => {
    serve(() => ({ data: [makeProduct()], total: 45 }));
    const { router } = renderApp('/products?page=3');

    await screen.findByRole('link', { name: /Trail Runner/ });
    await userEvent.type(screen.getByLabelText('Search'), '  boots  {Enter}');

    expect(router.state.location.search).toBe('?search=boots');
    expect(lastListQuery()).toMatchObject({ page: 1, search: 'boots' });
  });

  it('opens the Active and Inactive views, keeping the search and going back to page 1', async () => {
    serve(() => ({ data: [makeProduct()], total: 45 }));
    const { router } = renderApp('/products?search=trail&page=2');

    await screen.findByRole('link', { name: /Trail Runner/ });
    const tabs = within(screen.getByRole('navigation', { name: 'Product views' }));
    expect(tabs.getByRole('link', { name: 'All' })).toHaveAttribute('aria-current', 'page');

    await userEvent.click(tabs.getByRole('link', { name: 'Inactive' }));
    expect(router.state.location.search).toBe('?search=trail&active=false');
    expect(lastListQuery()).toMatchObject({ page: 1, search: 'trail', active: false });
    expect(tabs.getByRole('link', { name: 'Inactive' })).toHaveAttribute('aria-current', 'page');

    await userEvent.click(tabs.getByRole('link', { name: 'Active' }));
    expect(lastListQuery()).toMatchObject({ active: true });
  });

  it('filters by category and clears the filters', async () => {
    serve(() => ({ data: [] }));
    const { router } = renderApp('/products');

    const category = await screen.findByLabelText('Category');
    await screen.findByRole('option', { name: 'Men › Shoes' });
    await userEvent.selectOptions(category, 'Men › Shoes');
    expect(router.state.location.search).toBe('?categoryId=cat-shoes');

    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(router.state.location.search).toBe('');
  });
});
