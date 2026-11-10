import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, refreshSession, request } from '@/lib/api';
import { renderApp } from '@/test/render';
import type { Category } from './api';

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  request: vi.fn(),
  refreshSession: vi.fn(),
}));

const requestMock = vi.mocked(request);

const admin = { id: '1', email: 'admin@example.com', role: 'admin', createdAt: '' };

function category(name: string): Category {
  const date = '2026-11-01T00:00:00.000Z';
  return { id: `id-${name}`, name, createdAt: date, updatedAt: date };
}

/** Answers the session check, then hands other requests to the given handler. */
function api(handler: (path: string, options?: Parameters<typeof request>[1]) => unknown) {
  requestMock.mockImplementation(async (path, options) =>
    path === '/api/auth/me' ? { data: admin } : handler(path, options),
  );
}

function listOf(categories: Category[], total = categories.length) {
  return { data: categories, meta: { page: 1, limit: 20, total } };
}

beforeEach(() => {
  requestMock.mockReset();
  vi.mocked(refreshSession).mockResolvedValue(true);
});

describe('the categories list', () => {
  it('shows a loading state, then the categories', async () => {
    api(() => listOf([category('Shirts'), category('Hats')]));
    renderApp('/categories');

    expect(await screen.findByText('Loading…')).toBeInTheDocument();
    expect(await screen.findByRole('cell', { name: 'Shirts' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Hats' })).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
  });

  it('shows an empty state', async () => {
    api(() => listOf([]));
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

  function twoPages() {
    api((_path, options) =>
      options?.query?.page === 2
        ? { ...listOf([category('Socks')], 21), meta: { page: 2, limit: 20, total: 21 } }
        : listOf([category('Shirts')], 21),
    );
  }

  it('pages through the categories and keeps the page in the URL', async () => {
    twoPages();
    const { router } = renderApp('/categories');

    await userEvent.click(await screen.findByRole('button', { name: 'Next' }));

    expect(await screen.findByRole('cell', { name: 'Socks' })).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?page=2');
  });

  it('opens the page given in the URL', async () => {
    twoPages();
    renderApp('/categories?page=2');

    expect(await screen.findByRole('cell', { name: 'Socks' })).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
  });

  it('opens the first page when the URL has an invalid page', async () => {
    twoPages();
    renderApp('/categories?page=abc');

    expect(await screen.findByRole('cell', { name: 'Shirts' })).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
  });
});

describe('creating and renaming', () => {
  it('creates a category and refreshes the list', async () => {
    let created = false;
    api((_path, options) => {
      if (options?.method === 'POST') {
        created = true;
        return { data: category('Socks') };
      }
      return listOf(created ? [category('Shirts'), category('Socks')] : [category('Shirts')]);
    });
    renderApp('/categories');

    await userEvent.click(await screen.findByRole('button', { name: 'New category' }));
    await userEvent.type(screen.getByLabelText('Name'), '  Socks  ');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('cell', { name: 'Socks' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith('/api/categories', {
      method: 'POST',
      body: { name: 'Socks' },
    });
  });

  it('asks for a name before sending', async () => {
    api(() => listOf([]));
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
      return listOf([category('Shirts'), category('Hats')]);
    });
    renderApp('/categories');

    await userEvent.click(await screen.findByRole('button', { name: 'Rename Hats' }));
    const dialog = screen.getByRole('dialog');
    const input = within(dialog).getByLabelText('Name');
    expect(input).toHaveValue('Hats');

    await userEvent.clear(input);
    await userEvent.type(input, 'Shirts');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByText('Category name already exists')).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith('/api/categories/id-Hats', {
      method: 'PATCH',
      body: { name: 'Shirts' },
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
      return listOf(deleted ? [] : [category('Hats')]);
    });
    renderApp('/categories');

    await userEvent.click(await screen.findByRole('button', { name: 'Delete Hats' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }),
    );

    expect(await screen.findByText(/No categories yet/)).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith('/api/categories/id-Hats', { method: 'DELETE' });
  });

  it('steps back a page when a delete empties the last one', async () => {
    let deleted = false;
    api((_path, options) => {
      if (options?.method === 'DELETE') {
        deleted = true;
        return undefined;
      }
      const total = deleted ? 20 : 21;
      if (options?.query?.page === 2) {
        return { data: deleted ? [] : [category('Socks')], meta: { page: 2, limit: 20, total } };
      }
      return listOf([category('Shirts')], total);
    });
    const { router } = renderApp('/categories?page=2');

    await userEvent.click(await screen.findByRole('button', { name: 'Delete Socks' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }),
    );

    expect(await screen.findByText('Page 1 of 1')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?page=1');
    expect(await screen.findByRole('cell', { name: 'Shirts' })).toBeInTheDocument();
  });

  it('explains when products still use the category', async () => {
    api((_path, options) => {
      if (options?.method === 'DELETE') {
        throw new ApiError(409, { error: { message: 'Category is in use by products' } });
      }
      return listOf([category('Hats')]);
    });
    renderApp('/categories');

    await userEvent.click(await screen.findByRole('button', { name: 'Delete Hats' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Category is in use by products',
    );
  });
});
