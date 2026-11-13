import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { refreshSession, request } from '@/lib/api';
import type { User } from '@/lib/auth';
import { renderApp } from '@/test/render';
import { admin, staff } from '@/test/users';
import type { Banner } from './api';
import { scheduleStatus } from '@/lib/schedule';

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  request: vi.fn(),
  refreshSession: vi.fn(),
}));

const requestMock = vi.mocked(request);

function makeBanner(overrides: Partial<Banner> = {}): Banner {
  return {
    id: 'banner-1',
    assetId: 'asset-1',
    mobileAssetId: null,
    imageUrl: 'https://cdn.example.com/banner.jpg',
    mobileImageUrl: null,
    altText: 'Shoes on a beach',
    title: 'New arrivals',
    subtitle: null,
    linkUrl: '/categories/shoes',
    position: 0,
    isActive: true,
    startsAt: null,
    endsAt: null,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...overrides,
  };
}

const photo = {
  id: 'asset-2',
  url: 'https://cdn.example.com/asset-2.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 204800,
  createdAt: '2026-11-01T00:00:00.000Z',
};

/** Serves the banners and assets, and records changes. */
function serve(banners: Banner[], user: User = admin) {
  requestMock.mockImplementation(async (path, options) => {
    if (path === '/api/auth/me') return { data: user };
    if (path === '/api/assets') return { data: [photo], meta: { page: 1, limit: 24, total: 1 } };
    if (options?.method === 'DELETE') return undefined;
    if (options?.method) return { data: banners[0] };
    return { data: banners, meta: { page: 1, limit: 15, total: banners.length, maxBanners: 15 } };
  });
}

function sent(method: string) {
  return requestMock.mock.calls.filter(([, options]) => options?.method === method);
}

beforeEach(() => {
  requestMock.mockReset();
  vi.mocked(refreshSession).mockResolvedValue(true);
});

describe('the banner list', () => {
  it('shows each banner in order with whether the store shows it', async () => {
    serve([
      makeBanner(),
      makeBanner({
        id: 'b2',
        title: null,
        altText: 'Free shipping',
        position: 1,
        startsAt: '2099-01-01T00:00:00.000Z',
      }),
      makeBanner({ id: 'b3', title: 'Old sale', position: 2, endsAt: '2000-01-01T00:00:00.000Z' }),
      makeBanner({ id: 'b4', title: 'Hidden', position: 3, isActive: false }),
    ]);
    renderApp('/banners');

    expect(await screen.findByText('Loading…')).toBeInTheDocument();
    const rows = within(await screen.findByRole('list', { name: 'Banners' })).getAllByRole(
      'listitem',
    );
    expect(rows.map((row) => row.querySelector('p')?.textContent)).toEqual([
      'New arrivalsLive',
      // Without a title, the alt text names it.
      'Free shippingScheduled',
      'Old saleEnded',
      'HiddenOff',
    ]);
    expect(rows[0]).toHaveTextContent('/categories/shoes');
    expect(screen.getByText('4 of 15 banners')).toBeInTheDocument();
  });

  it('shows an empty state', async () => {
    serve([]);
    renderApp('/banners');

    expect(await screen.findByText(/No banners yet/)).toBeInTheDocument();
  });

  it('stops adding at the limit', async () => {
    serve(
      Array.from({ length: 15 }, (_, index) => makeBanner({ id: `b${index}`, position: index })),
    );
    renderApp('/banners');

    expect(await screen.findByText('15 of 15 banners')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New banner' })).toBeDisabled();
    expect(screen.getByText('Delete a banner to add another.')).toBeInTheDocument();
  });
});

describe('adding and editing', () => {
  it('checks the form before sending', async () => {
    serve([]);
    renderApp('/banners');

    await userEvent.click(await screen.findByRole('button', { name: 'New banner' }));
    const dialog = within(screen.getByRole('dialog'));
    await userEvent.type(dialog.getByLabelText('Link'), 'javascript:alert(1)');
    await userEvent.type(dialog.getByLabelText('Starts'), '2026-12-10T09:00');
    await userEvent.type(dialog.getByLabelText('Ends'), '2026-12-01T09:00');
    await userEvent.click(dialog.getByRole('button', { name: 'Add banner' }));

    expect(dialog.getByText('Choose an image.')).toBeInTheDocument();
    expect(dialog.getByText('Describe the image.')).toBeInTheDocument();
    expect(dialog.getByText('Start the link with / or https://.')).toBeInTheDocument();
    expect(dialog.getByText('End after the start.')).toBeInTheDocument();
    expect(sent('POST')).toHaveLength(0);
  });

  it('adds a banner after the last one', async () => {
    serve([makeBanner({ position: 4 })]);
    renderApp('/banners');

    await userEvent.click(await screen.findByRole('button', { name: 'New banner' }));
    const dialog = within(screen.getByRole('dialog'));
    // The first Choose from Files is the main image.
    await userEvent.click(dialog.getAllByRole('button', { name: 'Choose from Files' })[0]);
    await userEvent.click(
      await screen.findByRole('button', { name: /^Choose JPEG image uploaded/ }),
    );
    await userEvent.type(dialog.getByLabelText('Alt text'), 'Rain jackets');
    await userEvent.type(dialog.getByLabelText('Link'), '/categories/jackets');
    await userEvent.click(dialog.getByRole('button', { name: 'Add banner' }));

    await waitFor(() => expect(sent('POST')).toHaveLength(1));
    expect(sent('POST')[0]).toEqual([
      '/api/banners',
      {
        method: 'POST',
        body: {
          assetId: 'asset-2',
          mobileAssetId: null,
          altText: 'Rain jackets',
          title: null,
          subtitle: null,
          linkUrl: '/categories/jackets',
          startsAt: null,
          endsAt: null,
          isActive: true,
          position: 5,
        },
      },
    ]);
  });

  it('sends only what changed', async () => {
    serve([makeBanner({ startsAt: '2026-12-01T01:00:00.000Z' })]);
    renderApp('/banners');

    await userEvent.click(await screen.findByRole('button', { name: 'Edit New arrivals' }));
    const dialog = within(screen.getByRole('dialog'));
    await userEvent.clear(dialog.getByLabelText('Title'));
    await userEvent.type(dialog.getByLabelText('Title'), 'Back to school');
    await userEvent.click(dialog.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(requestMock).toHaveBeenCalledWith('/api/banners/banner-1', {
        method: 'PATCH',
        body: { title: 'Back to school' },
      }),
    );
  });
});

describe('row actions', () => {
  it('moves a banner by renumbering the positions', async () => {
    serve([makeBanner(), makeBanner({ id: 'b2', title: 'Free shipping', position: 1 })]);
    renderApp('/banners');

    await userEvent.click(
      await screen.findByRole('button', { name: 'More actions for New arrivals' }),
    );
    await userEvent.click(screen.getByRole('menuitem', { name: 'Move down' }));

    await waitFor(() => expect(sent('PATCH')).toHaveLength(2));
    expect(sent('PATCH')).toEqual([
      ['/api/banners/b2', { method: 'PATCH', body: { position: 0 } }],
      ['/api/banners/banner-1', { method: 'PATCH', body: { position: 1 } }],
    ]);
  });

  it('asks before deleting', async () => {
    serve([makeBanner()]);
    renderApp('/banners');

    await userEvent.click(
      await screen.findByRole('button', { name: 'More actions for New arrivals' }),
    );
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete banner' });
    expect(dialog).toHaveTextContent('removed for good');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(requestMock).toHaveBeenCalledWith('/api/banners/banner-1', { method: 'DELETE' }),
    );
  });

  it('asks before turning a banner off', async () => {
    serve([makeBanner()]);
    renderApp('/banners');

    await userEvent.click(
      await screen.findByRole('button', { name: 'More actions for New arrivals' }),
    );
    await userEvent.click(screen.getByRole('menuitem', { name: 'Turn off' }));
    await userEvent.click(
      within(screen.getByRole('dialog', { name: 'Turn off banner' })).getByRole('button', {
        name: 'Turn off',
      }),
    );

    await waitFor(() =>
      expect(requestMock).toHaveBeenCalledWith('/api/banners/banner-1', {
        method: 'PATCH',
        body: { isActive: false },
      }),
    );
  });
});

describe('permissions', () => {
  it('shows No access, and no nav link, without banners.manage', async () => {
    serve([], staff);
    renderApp('/banners');

    expect(await screen.findByRole('heading', { name: 'No access' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Banners' })).not.toBeInTheDocument();
    expect(requestMock).not.toHaveBeenCalledWith('/api/banners/admin');
  });
});

describe('scheduleStatus', () => {
  const now = new Date('2026-11-15T00:00:00.000Z');

  it('is live from the start up to, but not at, the end', () => {
    expect(scheduleStatus(makeBanner({ startsAt: now.toISOString() }), now)).toBe('live');
    expect(scheduleStatus(makeBanner({ endsAt: now.toISOString() }), now)).toBe('ended');
  });
});
