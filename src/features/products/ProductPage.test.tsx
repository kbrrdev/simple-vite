import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, refreshSession, request } from '@/lib/api';
import type { User } from '@/lib/auth';
import { renderApp } from '@/test/render';
import { admin, staff } from '@/test/users';
import type { Product } from './api';
import { categoryTree, makeProduct, makeVariant } from './test-data';

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  request: vi.fn(),
  refreshSession: vi.fn(),
}));

const requestMock = vi.mocked(request);

/** Serves one product. `change` handles updates and returns the product as it is after them. */
function serve(
  product: Product,
  change: (path: string, body?: unknown) => Product = () => product,
  user: User = admin,
) {
  let current = product;
  requestMock.mockImplementation(async (path, options) => {
    if (path === '/api/auth/me') return { data: user };
    if (path === '/api/categories/tree') return { data: categoryTree };
    if (options?.method) {
      current = change(path, options.body);
      return options.method === 'DELETE' ? undefined : { data: current };
    }
    return { data: current };
  });
}

const sized = makeProduct({
  option1Name: 'Size',
  variants: [
    makeVariant({ id: 'v1', option1Value: 'S', priceCents: 45000, stock: 3 }),
    makeVariant({ id: 'v2', option1Value: 'M', priceCents: 45000, stock: 0, active: false }),
  ],
});

const later = '2026-11-14T00:00:00.000Z';

function saveBar() {
  return screen.queryByRole('region', { name: 'Unsaved changes' });
}

function patches() {
  return requestMock.mock.calls.filter(
    ([path, options]) => path === '/api/products/product-1' && options?.method === 'PATCH',
  );
}

beforeEach(() => {
  requestMock.mockReset();
  vi.mocked(refreshSession).mockResolvedValue(true);
});

describe('the product page', () => {
  it('shows the details, status, category, images, and variants', async () => {
    serve(sized);
    renderApp('/products/product-1');

    expect(await screen.findByRole('heading', { name: 'Trail Runner' })).toBeInTheDocument();
    expect(screen.getByText('2 variants', { exact: false })).toBeInTheDocument();
    expect(await screen.findByLabelText('Category')).toHaveValue('cat-shoes');
    expect(screen.getByLabelText('Option 1')).toHaveValue('Size');

    const status = screen.getByRole('region', { name: 'Status' });
    expect(within(status).getByText('On sale')).toBeInTheDocument();
    expect(within(status).getByRole('button', { name: 'Deactivate' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Organization' })).getByLabelText('Category'),
    ).toBeInTheDocument();

    const variants = within(screen.getByRole('list', { name: 'Variants' })).getAllByRole(
      'listitem',
    );
    expect(variants[0]).toHaveTextContent('S');
    expect(variants[0]).toHaveTextContent('3 in stock');
    expect(variants[0]).toHaveTextContent('₱450.00');
    expect(variants[1]).toHaveTextContent('Inactive');
    expect(screen.getByText(/No images yet/)).toBeInTheDocument();
    // Nothing has changed yet.
    expect(saveBar()).not.toBeInTheDocument();
  });

  it('says when the product does not exist', async () => {
    requestMock.mockImplementation(async (path) => {
      if (path === '/api/auth/me') return { data: admin };
      throw new ApiError(404, { error: { message: 'Product not found' } });
    });
    renderApp('/products/missing');

    expect(await screen.findByRole('heading', { name: 'Product not found' })).toBeInTheDocument();
  });
});

describe('saving changes', () => {
  it('shows the save bar on a change, and sends only what changed', async () => {
    serve(sized, () => ({
      ...sized,
      name: 'Trail Runner 2',
      option1Name: 'Shoe size',
      updatedAt: later,
    }));
    renderApp('/products/product-1');

    const name = await screen.findByLabelText('Name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Trail Runner 2');
    await userEvent.clear(screen.getByLabelText('Option 1'));
    await userEvent.type(screen.getByLabelText('Option 1'), 'Shoe size');

    const bar = saveBar();
    if (!bar) throw new Error('No save bar');
    await userEvent.click(within(bar).getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Product saved')).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith('/api/products/product-1', {
      method: 'PATCH',
      body: { name: 'Trail Runner 2', option1Name: 'Shoe size' },
    });
    // The saved product matches the edits, so the bar goes away.
    await waitFor(() => expect(saveBar()).not.toBeInTheDocument());
  });

  it('saves a new category from the side panel', async () => {
    serve(sized, () => ({ ...sized, categoryId: 'cat-women', updatedAt: later }));
    renderApp('/products/product-1');

    await screen.findByRole('option', { name: 'Women' });
    await userEvent.selectOptions(screen.getByLabelText('Category'), 'Women');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(requestMock).toHaveBeenCalledWith('/api/products/product-1', {
        method: 'PATCH',
        body: { categoryId: 'cat-women' },
      }),
    );
  });

  it('discards the changes', async () => {
    serve(sized);
    renderApp('/products/product-1');

    const name = await screen.findByLabelText('Name');
    await userEvent.type(name, ' 2');
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));

    expect(name).toHaveValue('Trail Runner');
    expect(saveBar()).not.toBeInTheDocument();
    expect(patches()).toHaveLength(0);
  });

  it('asks for a name before saving', async () => {
    serve(sized);
    renderApp('/products/product-1');

    await userEvent.clear(await screen.findByLabelText('Name'));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Enter a name.')).toBeInTheDocument();
    expect(patches()).toHaveLength(0);
  });

  it('shows a refusal from the backend', async () => {
    serve(sized, () => {
      throw new ApiError(409, {
        error: { message: 'Options cannot be added after a product is created' },
      });
    });
    renderApp('/products/product-1');

    await userEvent.type(await screen.findByLabelText('Name'), ' 2');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Options cannot be added');
  });

  it('asks before leaving with unsaved changes', async () => {
    serve(sized);
    const { router } = renderApp('/products/product-1');

    await userEvent.type(await screen.findByLabelText('Name'), ' 2');
    await userEvent.click(screen.getByRole('link', { name: 'Back to products' }));

    const dialog = await screen.findByRole('dialog', { name: 'Leave without saving?' });
    expect(router.state.location.pathname).toBe('/products/product-1');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Leave' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/products'));
  });
});

describe('status', () => {
  it('asks before deactivating, then shows the product as inactive', async () => {
    serve(sized, () => ({ ...sized, active: false, updatedAt: later }));
    renderApp('/products/product-1');

    await userEvent.click(await screen.findByRole('button', { name: 'Deactivate' }));
    const dialog = screen.getByRole('dialog', { name: 'Deactivate product' });
    expect(dialog).toHaveTextContent('Past orders keep it');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Deactivate' }));

    expect(await screen.findByText('Product deactivated')).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith('/api/products/product-1', { method: 'DELETE' });
    const status = screen.getByRole('region', { name: 'Status' });
    expect(await within(status).findByRole('button', { name: 'Turn on' })).toBeInTheDocument();
    expect(
      within(status).getByText('Hidden from the store. Past orders keep it.'),
    ).toBeInTheDocument();
  });

  it('keeps unsaved edits when the status changes', async () => {
    serve(sized, () => ({ ...sized, active: false, updatedAt: later }));
    renderApp('/products/product-1');

    await userEvent.type(await screen.findByLabelText('Name'), ' 2');
    await userEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Deactivate' }),
    );

    expect(await screen.findByText('Product deactivated')).toBeInTheDocument();
    expect(
      await within(screen.getByRole('region', { name: 'Status' })).findByRole('button', {
        name: 'Turn on',
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Trail Runner 2');
    expect(saveBar()).toBeInTheDocument();
  });

  it('turns an inactive product back on', async () => {
    const inactive = { ...sized, active: false };
    serve(inactive, () => ({ ...sized, updatedAt: later }));
    renderApp('/products/product-1');

    await userEvent.click(await screen.findByRole('button', { name: 'Turn on' }));

    expect(await screen.findByText('Product is on sale again')).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith('/api/products/product-1', {
      method: 'PATCH',
      body: { active: true },
    });
  });
});

describe('roles without products.manage', () => {
  it('shows the product without the controls to change it', async () => {
    serve(sized, undefined, staff);
    renderApp('/products/product-1');

    expect(await screen.findByLabelText('Name')).toBeDisabled();
    expect(screen.getByLabelText('Category')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument();
    // Without products.manage or the audit log, nothing is left for the More menu.
    expect(screen.queryByRole('button', { name: 'More' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add variant' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /More actions/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Upload image' })).not.toBeInTheDocument();
    expect(saveBar()).not.toBeInTheDocument();
  });

  it('lets a stock-only role change the stock and nothing else', async () => {
    serve(sized, () => sized, staff);
    renderApp('/products/product-1');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Edit stock for S' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit stock for S' });
    expect(within(dialog).queryByLabelText('Price')).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Size')).not.toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText('Stock'));
    await user.type(within(dialog).getByLabelText('Stock'), '8');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(requestMock).toHaveBeenCalledWith('/api/products/product-1/variants/v1', {
      method: 'PATCH',
      body: { stock: 8 },
    });
  });
});
