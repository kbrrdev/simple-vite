import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, refreshSession, request } from '@/lib/api';
import { chooseFromMore } from '@/test/menu';
import { renderApp } from '@/test/render';
import { admin, staff } from '@/test/users';
import type { ContentPage } from './api';

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  request: vi.fn(),
  refreshSession: vi.fn(),
}));

const requestMock = vi.mocked(request);
const date = '2026-11-14T00:00:00.000Z';

function makePage(overrides: Partial<ContentPage> = {}): ContentPage {
  return {
    id: 'page-1',
    slug: 'terms',
    title: 'Terms and Conditions',
    content: 'By using this store, you agree.',
    published: false,
    createdAt: date,
    updatedAt: date,
    ...overrides,
  };
}

const terms = makePage();
const privacy = makePage({
  id: 'page-2',
  slug: 'privacy',
  title: 'Privacy Policy',
  published: true,
});

/** Serves the list and one page. Changes go to `change`, which can throw to refuse them. */
function serve(page = terms, change: () => unknown = () => ({ data: page }), user = admin) {
  requestMock.mockImplementation(async (path, options) => {
    if (path === '/api/auth/me') return { data: user };
    if (options?.method) return change();
    if (path === '/api/pages/admin') return { data: [privacy, terms] };
    if (path === '/api/audit-logs') return { data: [], meta: { page: 1, limit: 20, total: 0 } };
    return { data: page };
  });
}

function sent() {
  return requestMock.mock.calls.filter(
    ([path, options]) => path.startsWith('/api/pages') && options?.method,
  );
}

beforeEach(() => {
  requestMock.mockReset();
  vi.mocked(refreshSession).mockResolvedValue(true);
});

describe('the pages list', () => {
  it('lists every page with its address and status', async () => {
    serve();
    renderApp('/pages');

    const rows = within(await screen.findByRole('list', { name: 'Pages' })).getAllByRole('link');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Privacy Policy /privacy');
    expect(rows[0]).toHaveTextContent('Published');
    expect(rows[1]).toHaveTextContent('Terms and Conditions /terms');
    expect(rows[1]).toHaveTextContent('Draft');
    expect(rows[1]).toHaveAttribute('href', '/pages/page-1');
  });

  it('filters by the tab in the URL', async () => {
    serve();
    renderApp('/pages?published=false');

    const list = await screen.findByRole('list', { name: 'Pages' });
    expect(within(list).getAllByRole('link')).toHaveLength(1);
    expect(list).toHaveTextContent('Terms and Conditions');
  });

  it('shows the empty state for a tab with nothing in it', async () => {
    requestMock.mockImplementation(async (path) => {
      if (path === '/api/auth/me') return { data: admin };
      return { data: [terms] };
    });
    renderApp('/pages?published=true');

    expect(await screen.findByText('No published pages')).toBeInTheDocument();
  });

  it('shows the error with the request ID', async () => {
    requestMock.mockImplementation(async (path) => {
      if (path === '/api/auth/me') return { data: admin };
      throw new ApiError(500, { error: { message: 'Something went wrong', requestId: 'req-9' } });
    });
    renderApp('/pages');

    expect(await screen.findByRole('alert')).toHaveTextContent('req-9');
  });

  it('shows No access without pages.manage', async () => {
    serve(undefined, undefined, staff);
    renderApp('/pages');

    expect(await screen.findByText('No access')).toBeInTheDocument();
  });
});

describe('the page editor', () => {
  it('fills the address from the title of a new page, then saves a draft', async () => {
    serve(makePage({ id: 'page-3', slug: 'returns-refunds', title: 'Returns & Refunds' }));
    renderApp('/pages/new');

    await userEvent.type(await screen.findByLabelText('Title'), 'Returns & Refunds');
    expect(screen.getByLabelText('URL handle')).toHaveValue('returns-refunds');
    await userEvent.type(screen.getByRole('textbox', { name: 'Content' }), 'Within 7 days.');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Draft saved')).toBeInTheDocument();
    expect(sent()[0]).toEqual([
      '/api/pages',
      expect.objectContaining({
        method: 'POST',
        body: {
          title: 'Returns & Refunds',
          slug: 'returns-refunds',
          content: 'Within 7 days.',
          published: false,
        },
      }),
    ]);
  });

  it('sends only what changed', async () => {
    serve();
    renderApp('/pages/page-1');

    await userEvent.click(await screen.findByRole('radio', { name: /Published/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Page published')).toBeInTheDocument();
    expect(sent()[0]).toEqual([
      '/api/pages/admin/page-1',
      expect.objectContaining({ method: 'PATCH', body: { published: true } }),
    ]);
  });

  it('checks the address before sending', async () => {
    serve();
    renderApp('/pages/page-1');

    const slug = await screen.findByLabelText('URL handle');
    await userEvent.clear(slug);
    await userEvent.type(slug, 'Our Terms');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText(
        'Use lowercase letters, numbers, and single dashes, such as returns-policy.',
      ),
    ).toBeInTheDocument();
    expect(sent()).toHaveLength(0);
  });

  it('shows a taken address beside the address', async () => {
    serve(terms, () => {
      throw new ApiError(409, { error: { message: 'A page with this slug already exists' } });
    });
    renderApp('/pages/page-1');

    const slug = await screen.findByLabelText('URL handle');
    await userEvent.clear(slug);
    await userEvent.type(slug, 'privacy');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('A page with this slug already exists')).toBeInTheDocument();
    expect(slug).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('asks before deleting, then goes back to the list', async () => {
    serve(terms, () => undefined);
    renderApp('/pages/page-1');

    await chooseFromMore('Delete');
    const dialog = await screen.findByRole('dialog', { name: 'Delete page' });
    expect(dialog).toHaveTextContent('links to it stop working');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Page deleted')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Pages' })).toBeInTheDocument();
    expect(sent()[0]).toEqual(['/api/pages/admin/page-1', { method: 'DELETE' }]);
  });

  it('says when a page does not exist', async () => {
    requestMock.mockImplementation(async (path) => {
      if (path === '/api/auth/me') return { data: admin };
      throw new ApiError(404, { error: { message: 'Page not found' } });
    });
    renderApp('/pages/missing');

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });
});
