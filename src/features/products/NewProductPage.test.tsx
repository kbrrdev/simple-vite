import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, refreshSession, request } from '@/lib/api';
import { renderApp } from '@/test/render';
import { admin } from '@/test/users';
import { categoryTree, makeProduct } from './test-data';

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  request: vi.fn(),
  refreshSession: vi.fn(),
}));

const requestMock = vi.mocked(request);

/** Answers the session and the category tree, and hands the create request to `create`. */
function serve(create: () => unknown = () => ({ data: makeProduct({ id: 'product-9' }) })) {
  requestMock.mockImplementation(async (path, options) => {
    if (path === '/api/auth/me') return { data: admin };
    if (path === '/api/categories/tree') return { data: categoryTree };
    if (path === '/api/products' && options?.method === 'POST') return create();
    return { data: makeProduct({ id: 'product-9' }) };
  });
}

function createBody() {
  const call = requestMock.mock.calls.find(
    ([path, options]) => path === '/api/products' && options?.method === 'POST',
  );
  return call?.[1]?.body;
}

async function fillDetails() {
  await userEvent.type(await screen.findByLabelText('Name'), 'Trail Runner');
  await screen.findByRole('option', { name: 'Men › Shoes' });
  await userEvent.selectOptions(screen.getByLabelText('Category'), 'Men › Shoes');
}

async function addValues(option: string, values: string[]) {
  const input = screen.getByLabelText(`${option} values`);
  for (const value of values) await userEvent.type(input, `${value}{Enter}`);
}

beforeEach(() => {
  requestMock.mockReset();
  vi.mocked(refreshSession).mockResolvedValue(true);
});

describe('creating a product', () => {
  it('creates a product with no options, then opens it', async () => {
    serve();
    const { router } = renderApp('/products/new');

    await fillDetails();
    await userEvent.type(screen.getByLabelText('Price for Price and stock'), '199.99');
    await userEvent.type(screen.getByLabelText('Stock for Price and stock'), '12');
    await userEvent.click(screen.getByRole('button', { name: 'Create product' }));

    expect(await screen.findByText(/Product created/)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/products/product-9');
    expect(createBody()).toEqual({
      name: 'Trail Runner',
      categoryId: 'cat-shoes',
      description: '',
      active: true,
      variants: [{ priceCents: 19999, stock: 12, active: true }],
    });
  });

  it('builds a variant for each combination of option values', async () => {
    serve();
    renderApp('/products/new');

    await fillDetails();
    await userEvent.type(screen.getByLabelText('Option 1 name'), 'Size');
    await addValues('Size', ['S', 'M']);
    await userEvent.type(screen.getByLabelText('Option 2 name'), 'Color');
    await addValues('Color', ['Red', 'Blue']);

    const rows = within(screen.getByRole('list', { name: 'Variants' })).getAllByRole('listitem');
    expect(rows.map((row) => row.querySelector('p')?.textContent)).toEqual([
      'S · Red',
      'S · Blue',
      'M · Red',
      'M · Blue',
    ]);

    await userEvent.click(screen.getByRole('button', { name: 'Remove M · Blue' }));
    await userEvent.type(screen.getByLabelText('Price for all'), '450');
    await userEvent.type(screen.getByLabelText('Stock for all'), '5');
    await userEvent.click(screen.getByRole('button', { name: 'Apply to all' }));
    await userEvent.clear(screen.getByLabelText('Price for M · Red'));
    await userEvent.type(screen.getByLabelText('Price for M · Red'), '500.50');
    await userEvent.click(screen.getByRole('button', { name: 'Create product' }));

    await waitFor(() => expect(createBody()).toBeDefined());
    expect(createBody()).toMatchObject({
      option1Name: 'Size',
      option2Name: 'Color',
      variants: [
        { option1Value: 'S', option2Value: 'Red', priceCents: 45000, stock: 5 },
        { option1Value: 'S', option2Value: 'Blue', priceCents: 45000, stock: 5 },
        { option1Value: 'M', option2Value: 'Red', priceCents: 50050, stock: 5 },
      ],
    });
  });

  it('keeps typed prices when values are added', async () => {
    serve();
    renderApp('/products/new');

    await screen.findByLabelText('Option 1 name');
    await userEvent.type(screen.getByLabelText('Option 1 name'), 'Size');
    await addValues('Size', ['S']);
    await userEvent.type(screen.getByLabelText('Price for S'), '300');
    await addValues('Size', ['M']);

    expect(screen.getByLabelText('Price for S')).toHaveValue('300');
    expect(screen.getByLabelText('Price for M')).toHaveValue('');
  });

  it('checks the form before sending', async () => {
    serve();
    renderApp('/products/new');

    await screen.findByLabelText('Option 1 name');
    await userEvent.type(screen.getByLabelText('Option 1 name'), 'Size');
    await userEvent.click(screen.getByRole('button', { name: 'Create product' }));

    expect(screen.getByText('Enter a name.')).toBeInTheDocument();
    expect(screen.getByText('Choose a category.')).toBeInTheDocument();
    expect(screen.getByText('Add at least one Size value.')).toBeInTheDocument();
    expect(screen.getByText('Enter a price, such as 199.99.')).toBeInTheDocument();
    expect(createBody()).toBeUndefined();
  });

  it('rejects a price with more than two decimals', async () => {
    serve();
    renderApp('/products/new');

    await fillDetails();
    await userEvent.type(screen.getByLabelText('Price for Price and stock'), '1.999');
    await userEvent.type(screen.getByLabelText('Stock for Price and stock'), '1');
    await userEvent.click(screen.getByRole('button', { name: 'Create product' }));

    expect(screen.getByText('Enter a price, such as 199.99.')).toBeInTheDocument();
    expect(createBody()).toBeUndefined();
  });

  it('shows backend field errors next to their fields', async () => {
    serve(() => {
      throw new ApiError(400, {
        error: {
          message: 'Validation failed',
          details: [{ field: 'name', message: '"name" is too long' }],
        },
      });
    });
    renderApp('/products/new');

    await fillDetails();
    await userEvent.type(screen.getByLabelText('Price for Price and stock'), '10');
    await userEvent.type(screen.getByLabelText('Stock for Price and stock'), '1');
    await userEvent.click(screen.getByRole('button', { name: 'Create product' }));

    expect(await screen.findByText('"name" is too long')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
  });
});
