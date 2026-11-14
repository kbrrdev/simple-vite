import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, refreshSession, request } from '@/lib/api';
import type { Asset } from '@/features/files/api';
import { renderApp } from '@/test/render';
import { admin } from '@/test/users';
import type { CategoryNode } from './api';

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  request: vi.fn(),
  refreshSession: vi.fn(),
}));

const requestMock = vi.mocked(request);
const date = '2026-11-01T00:00:00.000Z';

function category(
  name: string,
  children: CategoryNode[] = [],
  image: { imageAssetId: string; imageUrl: string } | null = null,
): CategoryNode {
  const id = `id-${name}`;
  return {
    id,
    parentId: null,
    name,
    imageAssetId: image?.imageAssetId ?? null,
    imageUrl: image?.imageUrl ?? null,
    icon: null,
    createdAt: date,
    updatedAt: date,
    children: children.map((child) => ({ ...child, parentId: id })),
  };
}

const photo: Asset = {
  id: 'asset-1',
  url: 'https://cdn.example.com/asset-1.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 204800,
  createdAt: date,
};

/** Answers the session check, then hands other requests to the given handler. */
function api(handler: (path: string, options?: Parameters<typeof request>[1]) => unknown) {
  requestMock.mockImplementation(async (path, options) =>
    path === '/api/auth/me' ? { data: admin } : handler(path, options),
  );
}

function treeOf(categories: CategoryNode[]) {
  return { data: categories };
}

async function openMenu(name: string) {
  await userEvent.click(await screen.findByRole('button', { name: `More actions for ${name}` }));
}

beforeEach(() => {
  requestMock.mockReset();
  vi.mocked(refreshSession).mockResolvedValue(true);
});

describe('the categories tree', () => {
  it('shows a loading state, then the categories with their subcategories', async () => {
    api(() =>
      treeOf([category('Men', [category('Shoes', [category('Running')])]), category('Hats')]),
    );
    renderApp('/categories');

    expect(await screen.findByText('Loading…')).toBeInTheDocument();
    const men = await screen.findByRole('list', { name: 'Subcategories of Men' });
    expect(within(men).getByText('Shoes')).toBeInTheDocument();
    expect(within(men).getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('Hats')).toBeInTheDocument();
  });

  it('offers subcategories only above the third level', async () => {
    api(() => treeOf([category('Men', [category('Shoes', [category('Running')])])]));
    renderApp('/categories');

    await openMenu('Shoes');
    expect(screen.getByRole('menuitem', { name: 'Add subcategory' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');

    await openMenu('Running');
    expect(screen.queryByRole('menuitem', { name: 'Add subcategory' })).not.toBeInTheDocument();
  });

  it('shows an empty state', async () => {
    api(() => treeOf([]));
    renderApp('/categories');

    expect(await screen.findByText(/No categories yet/)).toBeInTheDocument();
  });

  it('shows the request id when the server fails', async () => {
    api(() => {
      throw new ApiError(500, { error: { message: 'Internal error', requestId: 'req-123' } });
    });
    renderApp('/categories');

    expect(await screen.findByRole('alert')).toHaveTextContent('Reference: req-123');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

describe('creating and editing', () => {
  it('creates a top-level category and refreshes the tree', async () => {
    let created = false;
    api((_path, options) => {
      if (options?.method === 'POST') {
        created = true;
        return { data: category('Socks') };
      }
      return treeOf(created ? [category('Shirts'), category('Socks')] : [category('Shirts')]);
    });
    renderApp('/categories');

    await userEvent.click(await screen.findByRole('button', { name: 'New category' }));
    await userEvent.type(screen.getByLabelText('Name'), '  Socks  ');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Socks')).toBeInTheDocument();
    expect(await screen.findByText('Category created')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith('/api/categories', {
      method: 'POST',
      body: { name: 'Socks', parentId: null, imageAssetId: null, icon: null },
    });
  });

  it('creates a subcategory under the chosen parent', async () => {
    api(() => treeOf([category('Men')]));
    renderApp('/categories');

    await openMenu('Men');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Add subcategory' }));
    const dialog = screen.getByRole('dialog', { name: 'New subcategory' });
    expect(within(dialog).getByLabelText('Parent')).toHaveValue('id-Men');

    await userEvent.type(within(dialog).getByLabelText('Name'), 'Shoes');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(requestMock).toHaveBeenCalledWith('/api/categories', {
      method: 'POST',
      body: { name: 'Shoes', parentId: 'id-Men', imageAssetId: null, icon: null },
    });
  });

  it('moves a category by changing its parent, without offering its own subtree', async () => {
    api(() =>
      treeOf([category('Men', [category('Shoes', [category('Running')])]), category('Women')]),
    );
    renderApp('/categories');

    await userEvent.click(await screen.findByRole('button', { name: 'Edit Shoes' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit category' });
    const parent = within(dialog).getByLabelText('Parent');
    const labels = within(parent)
      .getAllByRole('option')
      .map((option) => option.textContent);
    // Shoes has a subcategory, so it only fits at the top level or one level down.
    expect(labels).toEqual(['None (top level)', 'Men', 'Women']);

    await userEvent.selectOptions(parent, 'Women');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(requestMock).toHaveBeenCalledWith('/api/categories/id-Shoes', {
      method: 'PATCH',
      body: { parentId: 'id-Women' },
    });
  });

  it('asks for a name before sending', async () => {
    api(() => treeOf([]));
    renderApp('/categories');

    await userEvent.click(await screen.findByRole('button', { name: 'New category' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Enter a name.')).toBeInTheDocument();
    expect(requestMock).not.toHaveBeenCalledWith(
      '/api/categories',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('shows a duplicate name next to the field', async () => {
    api((_path, options) => {
      if (options?.method === 'PATCH') {
        throw new ApiError(409, { error: { message: 'Category name already exists' } });
      }
      return treeOf([category('Shirts'), category('Hats')]);
    });
    renderApp('/categories');

    await userEvent.click(await screen.findByRole('button', { name: 'Edit Hats' }));
    const dialog = screen.getByRole('dialog');
    const input = within(dialog).getByLabelText('Name');
    expect(input).toHaveValue('Hats');

    await userEvent.clear(input);
    await userEvent.type(input, 'Shirts');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByText('Category name already exists')).toBeInTheDocument();
  });

  it('shows a rejected move from the backend', async () => {
    api((_path, options) => {
      if (options?.method === 'PATCH') {
        throw new ApiError(400, { error: { message: 'Categories can be at most 3 levels deep' } });
      }
      return treeOf([category('Men'), category('Women')]);
    });
    renderApp('/categories');

    await userEvent.click(await screen.findByRole('button', { name: 'Edit Men' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.selectOptions(within(dialog).getByLabelText('Parent'), 'Women');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Categories can be at most 3 levels deep',
    );
  });
});

describe('category images', () => {
  it('uploads an image and saves it with the category', async () => {
    api((path, options) => {
      if (path === '/api/assets' && options?.method === 'POST') return { data: photo };
      return treeOf([category('Hats')]);
    });
    renderApp('/categories');

    await userEvent.click(await screen.findByRole('button', { name: 'Edit Hats' }));
    const dialog = screen.getByRole('dialog');
    const file = new File(['x'], 'hat.jpg', { type: 'image/jpeg' });
    await userEvent.upload(within(dialog).getByLabelText('Image file'), file);

    expect(await within(dialog).findByRole('img', { name: 'Selected image' })).toHaveAttribute(
      'src',
      photo.url,
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(requestMock).toHaveBeenCalledWith('/api/categories/id-Hats', {
      method: 'PATCH',
      body: { imageAssetId: 'asset-1' },
    });
  });

  it('chooses an image from Files', async () => {
    api((path) =>
      path === '/api/assets'
        ? { data: [photo], meta: { page: 1, limit: 24, total: 1 } }
        : treeOf([category('Hats')]),
    );
    renderApp('/categories');

    await userEvent.click(await screen.findByRole('button', { name: 'Edit Hats' }));
    await userEvent.click(screen.getByRole('button', { name: 'Choose from Files' }));
    await userEvent.click(
      await screen.findByRole('button', { name: /^Choose JPEG image uploaded/ }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(requestMock).toHaveBeenCalledWith('/api/categories/id-Hats', {
      method: 'PATCH',
      body: { imageAssetId: 'asset-1' },
    });
  });

  it('removes an image', async () => {
    api(() => treeOf([category('Hats', [], { imageAssetId: photo.id, imageUrl: photo.url })]));
    renderApp('/categories');

    await userEvent.click(await screen.findByRole('button', { name: 'Edit Hats' }));
    await userEvent.click(screen.getByRole('button', { name: 'Remove image' }));
    expect(screen.getByText('No image')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(requestMock).toHaveBeenCalledWith('/api/categories/id-Hats', {
      method: 'PATCH',
      body: { imageAssetId: null },
    });
  });
});

describe('deleting', () => {
  it('deletes a category after confirming', async () => {
    let deleted = false;
    api((_path, options) => {
      if (options?.method === 'DELETE') {
        deleted = true;
        return undefined;
      }
      return treeOf(deleted ? [] : [category('Hats')]);
    });
    renderApp('/categories');

    await openMenu('Hats');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }),
    );

    expect(await screen.findByText(/No categories yet/)).toBeInTheDocument();
    expect(await screen.findByText('Category deleted')).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith('/api/categories/id-Hats', { method: 'DELETE' });
  });

  it('disables delete while the category has subcategories', async () => {
    api(() => treeOf([category('Men', [category('Shoes')])]));
    renderApp('/categories');

    await openMenu('Men');
    const item = screen.getByRole('menuitem', { name: /Delete/ });
    expect(item).toHaveAttribute('aria-disabled', 'true');
    expect(item).toHaveTextContent('Remove its subcategories first');
  });

  it('shows the backend message when a delete is refused', async () => {
    api((_path, options) => {
      if (options?.method === 'DELETE') {
        throw new ApiError(409, { error: { message: 'Category is in use by products' } });
      }
      return treeOf([category('Hats')]);
    });
    renderApp('/categories');

    await openMenu('Hats');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Category is in use by products',
    );
  });
});

describe('icons', () => {
  it('picks an icon by searching, and sends it', async () => {
    api(() => treeOf([category('Hats')]));
    renderApp('/categories');

    await userEvent.click(await screen.findByRole('button', { name: 'Edit Hats' }));
    const dialog = within(screen.getByRole('dialog'));
    await userEvent.type(dialog.getByRole('searchbox', { name: 'Search icons' }), 'shoe');
    expect(
      dialog.getAllByRole('radio').map((radio) => radio.closest('label')?.textContent),
    ).toEqual(['Shoes']);
    // Search words find icons by the area they suit, not only by their label.
    await userEvent.clear(dialog.getByRole('searchbox', { name: 'Search icons' }));
    await userEvent.type(dialog.getByRole('searchbox', { name: 'Search icons' }), 'footwear');
    await userEvent.click(dialog.getByRole('radio', { name: 'Shoes' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(requestMock).toHaveBeenCalledWith('/api/categories/id-Hats', {
        method: 'PATCH',
        body: { icon: 'footprints' },
      }),
    );
  });

  it('clears an icon with None', async () => {
    api(() => treeOf([{ ...category('Hats'), icon: 'shirt' }]));
    renderApp('/categories');

    await userEvent.click(await screen.findByRole('button', { name: 'Edit Hats' }));
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByRole('radio', { name: 'Shirt' })).toBeChecked();
    await userEvent.click(dialog.getByRole('radio', { name: 'None' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(requestMock).toHaveBeenCalledWith('/api/categories/id-Hats', {
        method: 'PATCH',
        body: { icon: null },
      }),
    );
  });

  it('shows the image in the list when there is one, and the icon otherwise', async () => {
    api(() =>
      treeOf([
        { ...category('Hats', [], { imageAssetId: photo.id, imageUrl: photo.url }), icon: 'shirt' },
        { ...category('Socks'), icon: 'footprints' },
      ]),
    );
    renderApp('/categories');

    const rows = within(await screen.findByRole('list', { name: 'Categories' })).getAllByRole(
      'listitem',
    );
    expect(rows[0].querySelector('img')).not.toBeNull();
    expect(rows[0].querySelector('.lucide-shirt')).toBeNull();
    expect(rows[1].querySelector('img')).toBeNull();
    expect(rows[1].querySelector('.lucide-footprints')).not.toBeNull();
  });
});

describe('saving only what changed', () => {
  it('leaves fields it did not change alone, and sends nothing when nothing changed', async () => {
    api(() => treeOf([{ ...category('Hats'), icon: 'shirt' }]));
    renderApp('/categories');

    await userEvent.click(await screen.findByRole('button', { name: 'Edit Hats' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }));
    expect(requestMock).not.toHaveBeenCalledWith('/api/categories/id-Hats', expect.anything());

    await userEvent.click(await screen.findByRole('button', { name: 'Edit Hats' }));
    const name = screen.getByLabelText('Name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Caps');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }));

    // The icon someone else may have set meanwhile is not sent, so it cannot be undone.
    await waitFor(() =>
      expect(requestMock).toHaveBeenCalledWith('/api/categories/id-Hats', {
        method: 'PATCH',
        body: { name: 'Caps' },
      }),
    );
  });
});
