import { screen, waitFor, within } from '@testing-library/react';
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

/** Serves one post and the list. Changes go to `change`, which can throw to refuse them. */
function serve(blog: Blog, change: (body?: unknown) => unknown = () => ({ data: blog })) {
  requestMock.mockImplementation(async (path, options) => {
    if (path === '/api/auth/me') return { data: admin };
    if (options?.method) return change(options.body);
    if (path === '/api/blogs/admin') return { data: [], meta: { page: 1, limit: 20, total: 0 } };
    return { data: blog };
  });
}

function sent() {
  return requestMock.mock.calls.filter(
    ([path, options]) => path.startsWith('/api/blogs') && options?.method,
  );
}

async function fillNewPost() {
  await userEvent.type(await screen.findByLabelText('Title'), 'Store news');
  await userEvent.type(screen.getByLabelText('Author'), 'Juan');
  await userEvent.type(screen.getByRole('textbox', { name: 'Content' }), 'We open at **nine**.');
}

beforeEach(() => {
  requestMock.mockReset();
  vi.mocked(refreshSession).mockResolvedValue(true);
});

describe('writing a new post', () => {
  it('saves a draft, then opens it', async () => {
    serve(makeBlog({ id: 'b9' }));
    const { router } = renderApp('/blogs/new');

    await fillNewPost();
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(await screen.findByText('Draft saved')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/blogs/b9');
    expect(requestMock).toHaveBeenCalledWith('/api/blogs', {
      method: 'POST',
      body: {
        title: 'Store news',
        author: 'Juan',
        content: 'We open at **nine**.',
        coverAssetId: null,
        published: false,
      },
    });
  });

  it('publishes straight away', async () => {
    serve(makeBlog({ id: 'b9' }));
    renderApp('/blogs/new');

    await fillNewPost();
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => expect(sent()).toHaveLength(1));
    expect(sent()[0][1]?.body).toMatchObject({ published: true });
  });

  it('asks for every field before sending', async () => {
    serve(makeBlog());
    renderApp('/blogs/new');

    await userEvent.click(await screen.findByRole('button', { name: 'Save draft' }));

    expect(screen.getAllByText('Fill this in.')).toHaveLength(3);
    expect(sent()).toHaveLength(0);
  });

  it('shows the Markdown preview', async () => {
    serve(makeBlog());
    renderApp('/blogs/new');

    await userEvent.type(
      await screen.findByRole('textbox', { name: 'Content' }),
      '## Hours{Enter}{Enter}Open at **nine**.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(await screen.findByRole('heading', { name: 'Hours' })).toBeInTheDocument();
    expect(screen.getByText('nine').tagName).toBe('STRONG');
  });

  it('formats the selected text from the toolbar', async () => {
    serve(makeBlog());
    renderApp('/blogs/new');

    const content = await screen.findByRole<HTMLTextAreaElement>('textbox', { name: 'Content' });
    await userEvent.type(content, 'Free shipping today');
    content.setSelectionRange(0, 13);
    await userEvent.click(screen.getByRole('button', { name: 'Bold' }));

    expect(content).toHaveValue('**Free shipping** today');
    expect(content).toHaveFocus();
    expect(content.value.slice(content.selectionStart, content.selectionEnd)).toBe('Free shipping');

    await userEvent.click(screen.getByRole('button', { name: 'Bulleted list' }));
    expect(content).toHaveValue('- **Free shipping** today');
  });

  it('opens formatting help with real examples', async () => {
    serve(makeBlog());
    renderApp('/blogs/new');

    const toggle = await screen.findByRole('button', { name: 'Formatting help' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);

    const help = screen.getByRole('table', { name: 'Formatting help' });
    expect(await within(help).findByRole('heading', { name: 'Opening hours' })).toBeInTheDocument();
    expect(within(help).getByText('free shipping').tagName).toBe('STRONG');
    expect(within(help).getByRole('link', { name: 'our size guide' })).toBeInTheDocument();
    expect(within(help).getAllByRole('list').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Images in the text/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Hide formatting help' }));
    expect(screen.queryByRole('table', { name: 'Formatting help' })).not.toBeInTheDocument();
  });

  it('never renders raw HTML in the preview', async () => {
    serve(makeBlog());
    renderApp('/blogs/new');

    await userEvent.type(
      await screen.findByRole('textbox', { name: 'Content' }),
      'Hi <img src=x onerror="alert(1)"> there',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(await screen.findByText(/Hi/)).toBeInTheDocument();
    expect(document.querySelector('img[src="x"]')).toBeNull();
  });

  it('asks before leaving with unsaved changes', async () => {
    serve(makeBlog());
    const { router } = renderApp('/blogs/new');

    await userEvent.type(await screen.findByLabelText('Title'), 'Half written');
    await userEvent.click(screen.getByRole('link', { name: 'Back to blog' }));

    const dialog = await screen.findByRole('dialog', { name: 'Leave without saving?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(router.state.location.pathname).toBe('/blogs/new');

    await userEvent.click(screen.getByRole('link', { name: 'Back to blog' }));
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Leave' }),
    );
    await waitFor(() => expect(router.state.location.pathname).toBe('/blogs'));
  });
});

describe('editing a post', () => {
  it('sends only what changed', async () => {
    const blog = makeBlog();
    serve(blog, () => ({ data: { ...blog, title: 'New season trail shoes', updatedAt: 'later' } }));
    renderApp('/blogs/b1');

    const title = await screen.findByLabelText('Title');
    await userEvent.clear(title);
    await userEvent.type(title, 'New season trail shoes');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Post saved')).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith('/api/blogs/b1', {
      method: 'PATCH',
      body: { title: 'New season trail shoes' },
    });
  });

  it('asks before unpublishing', async () => {
    const blog = makeBlog();
    serve(blog, () => ({ data: { ...blog, published: false, updatedAt: 'later' } }));
    renderApp('/blogs/b1');

    await userEvent.click(await screen.findByRole('button', { name: 'Unpublish' }));
    const dialog = screen.getByRole('dialog', { name: 'Unpublish post' });
    expect(dialog).toHaveTextContent('Shoppers can no longer read it');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Unpublish' }));

    expect(await screen.findByText('Post moved to drafts')).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith('/api/blogs/b1', {
      method: 'PATCH',
      body: { published: false },
    });
  });

  it('publishes a draft', async () => {
    const draft = makeBlog({ published: false });
    serve(draft, () => ({ data: { ...draft, published: true, updatedAt: 'later' } }));
    renderApp('/blogs/b1');

    expect(await screen.findByText('Draft')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() =>
      expect(requestMock).toHaveBeenCalledWith('/api/blogs/b1', {
        method: 'PATCH',
        body: { published: true },
      }),
    );
  });

  it('deletes a post after confirming, then returns to the list', async () => {
    serve(makeBlog(), () => undefined);
    const { router } = renderApp('/blogs/b1');

    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete post' });
    expect(dialog).toHaveTextContent('cannot be undone');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/blogs'));
    expect(requestMock).toHaveBeenCalledWith('/api/blogs/b1', { method: 'DELETE' });
  });

  it('shows backend field errors next to their fields', async () => {
    serve(makeBlog(), () => {
      throw new ApiError(400, {
        error: {
          message: 'Validation failed',
          details: [{ field: 'title', message: '"title" is too long' }],
        },
      });
    });
    renderApp('/blogs/b1');

    const title = await screen.findByLabelText('Title');
    await userEvent.type(title, '!');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('"title" is too long')).toBeInTheDocument();
    expect(title).toHaveAttribute('aria-invalid', 'true');
  });

  it('says when the post does not exist', async () => {
    requestMock.mockImplementation(async (path) => {
      if (path === '/api/auth/me') return { data: admin };
      throw new ApiError(404, { error: { message: 'Blog not found' } });
    });
    renderApp('/blogs/missing');

    expect(await screen.findByRole('heading', { name: 'Post not found' })).toBeInTheDocument();
  });
});
