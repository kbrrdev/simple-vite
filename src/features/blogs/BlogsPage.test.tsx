import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, refreshSession, request } from '@/lib/api';
import { renderApp } from '@/test/render';
import { admin } from '@/test/users';
import type { Blog } from './api';
import { makeBlog } from './test-data';

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  request: vi.fn(),
  refreshSession: vi.fn(),
}));

const requestMock = vi.mocked(request);

function serve(blogs: Blog[], total = blogs.length) {
  requestMock.mockImplementation(async (path) =>
    path === '/api/auth/me'
      ? { data: admin }
      : { data: blogs, meta: { page: 1, limit: 20, total } },
  );
}

function lastQuery() {
  return requestMock.mock.calls.filter(([path]) => path === '/api/blogs/admin').at(-1)?.[1]?.query;
}

beforeEach(() => {
  requestMock.mockReset();
  vi.mocked(refreshSession).mockResolvedValue(true);
});

describe('the blog list', () => {
  it('shows each post, marking drafts', async () => {
    serve([
      makeBlog(),
      makeBlog({ id: 'b2', title: 'Holiday hours', published: false, coverImageUrl: null }),
    ]);
    renderApp('/blogs');

    expect(await screen.findByText('Loading…')).toBeInTheDocument();
    const post = await screen.findByRole('link', { name: /New season shoes/ });
    expect(post).toHaveAttribute('href', '/blogs/b1');
    expect(post).toHaveTextContent('Juan · Updated');

    const draft = screen.getByRole('link', { name: /Holiday hours/ });
    expect(within(draft).getByText('Draft')).toBeInTheDocument();
    expect(within(post).queryByText('Draft')).not.toBeInTheDocument();
  });

  it('shows an empty state', async () => {
    serve([]);
    renderApp('/blogs');

    expect(await screen.findByText(/No posts yet/)).toBeInTheDocument();
  });

  it('shows the request id when the server fails', async () => {
    requestMock.mockImplementation(async (path) => {
      if (path === '/api/auth/me') return { data: admin };
      throw new ApiError(500, { error: { message: 'Internal error', requestId: 'req-8' } });
    });
    renderApp('/blogs');

    expect(await screen.findByRole('alert')).toHaveTextContent('Reference: req-8');
  });

  it('filters drafts, keeping the filter in the URL', async () => {
    serve([]);
    const { router } = renderApp('/blogs?page=2');

    await screen.findByText(/No posts yet/);
    await userEvent.click(
      within(screen.getByRole('navigation', { name: 'Post views' })).getByRole('link', {
        name: 'Drafts',
      }),
    );

    expect(router.state.location.search).toBe('?published=false');
    expect(lastQuery()).toEqual({ page: 1, limit: 20, published: false });
    expect(await screen.findByText('No drafts')).toBeInTheDocument();
  });
});
