import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, refreshSession, request } from '@/lib/api';
import { renderApp } from '@/test/render';
import type { Asset } from './api';

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  request: vi.fn(),
  refreshSession: vi.fn(),
}));

const requestMock = vi.mocked(request);

const admin = { id: '1', email: 'admin@example.com', role: 'admin', createdAt: '' };

function asset(id: string, sizeBytes = 204800): Asset {
  return {
    id,
    url: `https://cdn.example.com/${id}.jpg`,
    mimeType: 'image/jpeg',
    sizeBytes,
    createdAt: '2026-11-01T00:00:00.000Z',
  };
}

/** Answers the session check, then hands other requests to the given handler. */
function api(handler: (path: string, options?: Parameters<typeof request>[1]) => unknown) {
  requestMock.mockImplementation(async (path, options) =>
    path === '/api/auth/me' ? { data: admin } : handler(path, options),
  );
}

function listOf(assets: Asset[], total = assets.length) {
  return { data: assets, meta: { page: 1, limit: 24, total } };
}

function image(name: string, type: string, sizeBytes: number) {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

beforeEach(() => {
  requestMock.mockReset();
  vi.mocked(refreshSession).mockResolvedValue(true);
});

describe('the files list', () => {
  it('shows a loading state, then the images with their details', async () => {
    api(() => listOf([asset('a', 204800), asset('b', 2.5 * 1024 * 1024)]));
    renderApp('/files');

    expect(await screen.findByText('Loading…')).toBeInTheDocument();
    expect(await screen.findAllByRole('img')).toHaveLength(2);
    expect(screen.getByText(/JPEG · 200 KB/)).toBeInTheDocument();
    expect(screen.getByText(/JPEG · 2\.5 MB/)).toBeInTheDocument();
  });

  it('shows an empty state', async () => {
    api(() => listOf([]));
    renderApp('/files');

    expect(await screen.findByText(/No images yet/)).toBeInTheDocument();
  });

  it('shows the request id when the server fails', async () => {
    api(() => {
      throw new ApiError(500, { error: { message: 'Internal error', requestId: 'req-123' } });
    });
    renderApp('/files');

    expect(await screen.findByRole('alert')).toHaveTextContent('Reference: req-123');
  });

  it('opens the page given in the URL', async () => {
    api((_path, options) =>
      options?.query?.page === 2
        ? { data: [asset('b')], meta: { page: 2, limit: 24, total: 25 } }
        : listOf([asset('a')], 25),
    );
    renderApp('/files?page=2');

    expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith('/api/assets', { query: { page: 2, limit: 24 } });
  });
});

describe('uploading', () => {
  it('uploads an image and refreshes the list', async () => {
    let uploaded = false;
    api((_path, options) => {
      if (options?.method === 'POST') {
        uploaded = true;
        return { data: asset('new') };
      }
      return listOf(uploaded ? [asset('new'), asset('a')] : [asset('a')]);
    });
    renderApp('/files');

    await screen.findAllByRole('img');
    const file = image('shirt.jpg', 'image/jpeg', 1024);
    await userEvent.upload(screen.getByLabelText('Image file'), file);

    expect(await screen.findAllByRole('img')).toHaveLength(2);
    const [, options] = requestMock.mock.calls.find(([, o]) => o?.method === 'POST') ?? [];
    expect(options?.body).toBeInstanceOf(FormData);
    expect((options?.body as FormData).get('file')).toBe(file);
  });

  it('rejects a file type the backend does not accept, without sending it', async () => {
    api(() => listOf([]));
    renderApp('/files');

    await screen.findByText(/No images yet/);
    await userEvent.upload(
      screen.getByLabelText('Image file'),
      image('photo.gif', 'image/gif', 1024),
      { applyAccept: false },
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Choose a JPEG, PNG, or WebP image.');
    expect(requestMock).not.toHaveBeenCalledWith(
      '/api/assets',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('rejects a file over 5 MB, without sending it', async () => {
    api(() => listOf([]));
    renderApp('/files');

    await screen.findByText(/No images yet/);
    await userEvent.upload(
      screen.getByLabelText('Image file'),
      image('big.png', 'image/png', 6 * 1024 * 1024),
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Images must be 5 MB or smaller.');
    expect(requestMock).not.toHaveBeenCalledWith(
      '/api/assets',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('shows the backend error when an upload fails', async () => {
    api((_path, options) => {
      if (options?.method === 'POST') {
        throw new ApiError(413, { error: { message: 'File is too large' } });
      }
      return listOf([]);
    });
    renderApp('/files');

    await screen.findByText(/No images yet/);
    await userEvent.upload(
      screen.getByLabelText('Image file'),
      image('photo.webp', 'image/webp', 1024),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('File is too large');
  });
});

describe('deleting', () => {
  it('deletes an image after confirming', async () => {
    let deleted = false;
    api((_path, options) => {
      if (options?.method === 'DELETE') {
        deleted = true;
        return undefined;
      }
      return listOf(deleted ? [] : [asset('a')]);
    });
    renderApp('/files');

    await userEvent.click(await screen.findByRole('button', { name: /Delete image/ }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }),
    );

    expect(await screen.findByText(/No images yet/)).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith('/api/assets/a', { method: 'DELETE' });
  });

  it('explains when a product or blog still uses the image', async () => {
    api((_path, options) => {
      if (options?.method === 'DELETE') {
        throw new ApiError(409, { error: { message: 'Asset is in use' } });
      }
      return listOf([asset('a')]);
    });
    renderApp('/files');

    await userEvent.click(await screen.findByRole('button', { name: /Delete image/ }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Asset is in use');
  });
});
