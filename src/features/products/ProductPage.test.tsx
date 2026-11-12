import { screen, within } from '@testing-library/react';
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

beforeEach(() => {
  requestMock.mockReset();
  vi.mocked(refreshSession).mockResolvedValue(true);
});

describe('the product page', () => {
  it('shows the details, variants, and images', async () => {
    serve(sized);
    renderApp('/products/product-1');

    expect(await screen.findByRole('heading', { name: 'Trail Runner' })).toBeInTheDocument();
    expect(await screen.findByLabelText('Category')).toHaveValue('cat-shoes');
    expect(screen.getByLabelText('Option 1')).toHaveValue('Size');

    const variants = within(screen.getByRole('list', { name: 'Variants' })).getAllByRole(
      'listitem',
    );
    expect(variants[0]).toHaveTextContent('S');
    expect(variants[0]).toHaveTextContent('3 in stock');
    expect(variants[0]).toHaveTextContent('₱450.00');
    expect(variants[1]).toHaveTextContent('Inactive');
    expect(screen.getByText(/No images yet/)).toBeInTheDocument();
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

describe('editing the details', () => {
  it('saves the details and renames an option', async () => {
    serve(sized, () => ({ ...sized, name: 'Trail Runner 2', updatedAt: 'later' }));
    renderApp('/products/product-1');

    const name = await screen.findByLabelText('Name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Trail Runner 2');
    await userEvent.clear(screen.getByLabelText('Option 1'));
    await userEvent.type(screen.getByLabelText('Option 1'), 'Shoe size');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Product saved')).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith('/api/products/product-1', {
      method: 'PATCH',
      body: {
        name: 'Trail Runner 2',
        categoryId: 'cat-shoes',
        description: 'Light and quick.',
        option1Name: 'Shoe size',
      },
    });
  });

  it('asks for a name before saving', async () => {
    serve(sized);
    renderApp('/products/product-1');

    await userEvent.clear(await screen.findByLabelText('Name'));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(screen.getByText('Enter a name.')).toBeInTheDocument();
    expect(requestMock).not.toHaveBeenCalledWith(
      '/api/products/product-1',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('shows a refusal from the backend', async () => {
    serve(sized, () => {
      throw new ApiError(409, {
        error: { message: 'Options cannot be added after a product is created' },
      });
    });
    renderApp('/products/product-1');

    await userEvent.click(await screen.findByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Options cannot be added');
  });
});

describe('deactivating', () => {
  it('asks before deactivating, then shows the product as inactive', async () => {
    serve(sized, () => ({ ...sized, active: false, updatedAt: 'later' }));
    renderApp('/products/product-1');

    await userEvent.click(await screen.findByRole('button', { name: 'Deactivate' }));
    const dialog = screen.getByRole('dialog', { name: 'Deactivate product' });
    expect(dialog).toHaveTextContent('Past orders keep it');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Deactivate' }));

    expect(await screen.findByText('Product deactivated')).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith('/api/products/product-1', { method: 'DELETE' });
    expect(await screen.findByRole('button', { name: 'Turn on' })).toBeInTheDocument();
  });

  it('turns an inactive product back on', async () => {
    const inactive = { ...sized, active: false };
    serve(inactive, () => ({ ...sized, updatedAt: 'later' }));
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
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add variant' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /More actions/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Upload image' })).not.toBeInTheDocument();
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
