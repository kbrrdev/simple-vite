import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, refreshSession, request } from '@/lib/api';
import type { Asset } from '@/features/files/api';
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
const date = '2026-11-01T00:00:00.000Z';

const photo: Asset = {
  id: 'asset-9',
  url: 'https://cdn.example.com/asset-9.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 204800,
  createdAt: date,
};

function image(id: string, position: number, altText = '') {
  return {
    id,
    productId: 'product-1',
    assetId: `asset-${id}`,
    url: `https://cdn.example.com/${id}.jpg`,
    altText,
    position,
  };
}

/**
 * Serves one product, the category tree, and the Files list. Changes go to `change`, which
 * can throw to refuse them.
 */
function serve(product: Product, change: (path: string, body?: unknown) => unknown = () => ({})) {
  requestMock.mockImplementation(async (path, options) => {
    if (path === '/api/auth/me') return { data: admin };
    if (path === '/api/categories/tree') return { data: categoryTree };
    if (path === '/api/assets' && options?.method === 'POST') return { data: photo };
    if (path === '/api/assets') return { data: [photo], meta: { page: 1, limit: 24, total: 1 } };
    if (options?.method) return change(path, options.body);
    return { data: product };
  });
}

function sentTo(path: string) {
  return requestMock.mock.calls.filter(([calledPath]) => calledPath === path).map(([, o]) => o);
}

async function openMenu(name: string) {
  await userEvent.click(await screen.findByRole('button', { name: `More actions for ${name}` }));
}

beforeEach(() => {
  requestMock.mockReset();
  vi.mocked(refreshSession).mockResolvedValue(true);
});

describe('product images', () => {
  it('adds an image from Files with alt text', async () => {
    serve(makeProduct());
    renderApp('/products/product-1');

    await userEvent.click(await screen.findByRole('button', { name: 'Choose from Files' }));
    await userEvent.click(await screen.findByRole('button', { name: /^Choose JPEG image/ }));
    const dialog = screen.getByRole('dialog', { name: 'Add image' });
    await userEvent.type(within(dialog).getByLabelText('Alt text'), 'Side view');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add image' }));

    expect(await screen.findByText('Image added')).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith('/api/products/product-1/images', {
      method: 'POST',
      body: { assetId: 'asset-9', altText: 'Side view' },
    });
  });

  it('uploads an image, then adds it', async () => {
    serve(makeProduct());
    renderApp('/products/product-1');

    await screen.findByRole('button', { name: 'Upload image' });
    const file = new File(['x'], 'shoe.jpg', { type: 'image/jpeg' });
    await userEvent.upload(screen.getByLabelText('Image file'), file);
    const dialog = await screen.findByRole('dialog', { name: 'Add image' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add image' }));

    await waitFor(() =>
      expect(requestMock).toHaveBeenCalledWith('/api/products/product-1/images', {
        method: 'POST',
        body: { assetId: 'asset-9', altText: '' },
      }),
    );
  });

  it('recommends a square, and warns before adding a small photo', async () => {
    serve(makeProduct());
    renderApp('/products/product-1');

    expect(
      await screen.findByText(
        'Recommended: Square, 2048 × 2048 pixels. JPEG, PNG, or WebP, up to 5 MB.',
      ),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Choose from Files' }));
    await userEvent.click(await screen.findByRole('button', { name: /^Choose JPEG image/ }));
    const dialog = within(screen.getByRole('dialog', { name: 'Add image' }));

    // jsdom loads no images, so the photo is given its real size.
    const photo = dialog.getByRole('presentation');
    Object.defineProperty(photo, 'naturalWidth', { value: 600 });
    Object.defineProperty(photo, 'naturalHeight', { value: 600 });
    fireEvent.load(photo);

    expect(
      dialog.getByText(/^This image is 600 × 600 pixels, so it may look soft\./),
    ).toBeInTheDocument();
  });

  it('stops adding at 10 images', async () => {
    const images = Array.from({ length: 10 }, (_, i) => image(`img-${i}`, i));
    serve(makeProduct({ images }));
    renderApp('/products/product-1');

    expect(await screen.findByRole('button', { name: 'Upload image' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Choose from Files' })).toBeDisabled();
    expect(screen.getByText(/up to 10 images/)).toBeInTheDocument();
  });

  it('moves an image, renumbering only what changed', async () => {
    // b and c share a position, as happens after an image is removed.
    serve(
      makeProduct({
        images: [image('a', 0, 'Front'), image('b', 1, 'Side'), image('c', 1, 'Back')],
      }),
    );
    renderApp('/products/product-1');

    const tiles = within(await screen.findByRole('list', { name: 'Images' })).getAllByRole(
      'listitem',
    );
    expect(tiles[0]).toHaveTextContent('Main image');

    await openMenu('Back');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Move earlier' }));

    await waitFor(() => expect(sentTo('/api/products/product-1/images/b')).toHaveLength(1));
    expect(sentTo('/api/products/product-1/images/b')[0]).toEqual({
      method: 'PATCH',
      body: { position: 2 },
    });
    expect(sentTo('/api/products/product-1/images/a')).toHaveLength(0);
    expect(sentTo('/api/products/product-1/images/c')).toHaveLength(0);
  });

  it('edits the alt text', async () => {
    serve(makeProduct({ images: [image('a', 0, 'Front')] }));
    renderApp('/products/product-1');

    await openMenu('Front');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Edit alt text' }));
    const input = within(screen.getByRole('dialog')).getByLabelText('Alt text');
    await userEvent.clear(input);
    await userEvent.type(input, 'Front, laces tied');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(requestMock).toHaveBeenCalledWith('/api/products/product-1/images/a', {
      method: 'PATCH',
      body: { altText: 'Front, laces tied' },
    });
  });

  it('removes an image after confirming, and explains when a variant uses it', async () => {
    serve(makeProduct({ images: [image('a', 0, 'Front')] }), () => {
      throw new ApiError(409, { error: { message: 'Image is still used by a variant' } });
    });
    renderApp('/products/product-1');

    await openMenu('Front');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Remove' }));
    const dialog = screen.getByRole('dialog', { name: 'Remove image' });
    expect(dialog).toHaveTextContent('The file stays in Files');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Image is still used by a variant',
    );
  });
});

describe('product variants', () => {
  const sized = makeProduct({
    option1Name: 'Size',
    images: [image('a', 0, 'Front')],
    variants: [makeVariant({ id: 'v1', option1Value: 'S', priceCents: 45000, stock: 3 })],
  });

  it('sends only the fields that changed', async () => {
    serve(sized);
    renderApp('/products/product-1');

    await userEvent.click(await screen.findByRole('button', { name: 'Edit S' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit S' });
    expect(within(dialog).getByLabelText('Price')).toHaveValue('450.00');
    await userEvent.clear(within(dialog).getByLabelText('Price'));
    await userEvent.type(within(dialog).getByLabelText('Price'), '500');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Variant saved')).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith('/api/products/product-1/variants/v1', {
      method: 'PATCH',
      body: { priceCents: 50000 },
    });
  });

  it('gives a variant one of the product images', async () => {
    serve(sized);
    renderApp('/products/product-1');

    await userEvent.click(await screen.findByRole('button', { name: 'Edit S' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Front' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(requestMock).toHaveBeenCalledWith('/api/products/product-1/variants/v1', {
      method: 'PATCH',
      body: { assetId: 'asset-a' },
    });
  });

  it('adds a variant, and shows a duplicate with the values', async () => {
    serve(sized, () => {
      throw new ApiError(409, { error: { message: 'This combination already exists' } });
    });
    renderApp('/products/product-1');

    await userEvent.click(await screen.findByRole('button', { name: 'Add variant' }));
    const dialog = screen.getByRole('dialog', { name: 'Add variant' });
    await userEvent.type(within(dialog).getByLabelText('Size'), 'S');
    await userEvent.type(within(dialog).getByLabelText('Price'), '450');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add variant' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'This combination already exists',
    );
    expect(requestMock).toHaveBeenCalledWith('/api/products/product-1/variants', {
      method: 'POST',
      body: { option1Value: 'S', priceCents: 45000, stock: 0, active: true },
    });
  });

  it('asks for the option value before adding', async () => {
    serve(sized);
    renderApp('/products/product-1');

    await userEvent.click(await screen.findByRole('button', { name: 'Add variant' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Add variant' }),
    );

    expect(screen.getByText('Enter a Size value.')).toBeInTheDocument();
    expect(screen.getByText('Enter a price, such as 199.99.')).toBeInTheDocument();
    expect(sentTo('/api/products/product-1/variants')).toHaveLength(0);
  });

  it('deactivates a variant after confirming', async () => {
    serve(sized, () => undefined);
    renderApp('/products/product-1');

    await openMenu('S');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Deactivate' }));
    const dialog = screen.getByRole('dialog', { name: 'Deactivate variant' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Deactivate' }));

    expect(await screen.findByText('Variant deactivated')).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith('/api/products/product-1/variants/v1', {
      method: 'DELETE',
    });
  });

  it('turns an inactive variant back on', async () => {
    serve(
      makeProduct({
        option1Name: 'Size',
        variants: [makeVariant({ id: 'v1', option1Value: 'S', active: false })],
      }),
    );
    renderApp('/products/product-1');

    await openMenu('S');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Turn on' }));

    await waitFor(() =>
      expect(requestMock).toHaveBeenCalledWith('/api/products/product-1/variants/v1', {
        method: 'PATCH',
        body: { active: true },
      }),
    );
  });
});
