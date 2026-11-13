import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, refreshSession, request } from '@/lib/api';
import { renderApp } from '@/test/render';
import { chooseFromMore } from '@/test/menu';
import { admin } from '@/test/users';
import type { Blog } from './api';
import { makeBlog } from './test-data';

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  request: vi.fn(),
  refreshSession: vi.fn(),
}));

const requestMock = vi.mocked(request);

const photo = {
  id: 'asset-2',
  // The test API's address, so the preview counts it as an upload.
  url: 'http://api.test/uploads/shoes.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 204800,
  createdAt: '2026-11-01T00:00:00.000Z',
};

/** Serves one post and the list. Changes go to `change`, which can throw to refuse them. */
function serve(blog: Blog, change: (body?: unknown) => unknown = () => ({ data: blog })) {
  requestMock.mockImplementation(async (path, options) => {
    if (path === '/api/auth/me') return { data: admin };
    if (options?.method) return change(options.body);
    if (path === '/api/blogs/admin') return { data: [], meta: { page: 1, limit: 20, total: 0 } };
    if (path === '/api/assets') return { data: [photo], meta: { page: 1, limit: 24, total: 1 } };
    return { data: blog };
  });
}

function sent() {
  return requestMock.mock.calls.filter(
    ([path, options]) => path.startsWith('/api/blogs') && options?.method,
  );
}

function saveBar() {
  return screen.getByRole('region', { name: 'Unsaved changes' });
}

async function fillNewPost() {
  await userEvent.type(await screen.findByLabelText('Title'), 'Store news');
  await userEvent.type(screen.getByRole('textbox', { name: 'Author' }), 'Juan');
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
    // A new post starts as a draft, saved through the save bar.
    await userEvent.click(within(saveBar()).getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Draft saved')).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.pathname).toBe('/blogs/b9'));
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
    await userEvent.click(screen.getByRole('radio', { name: /Published/ }));
    await userEvent.click(within(saveBar()).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(sent()).toHaveLength(1));
    expect(sent()[0][1]?.body).toMatchObject({ published: true });
  });

  it('asks for every field before sending', async () => {
    serve(makeBlog());
    renderApp('/blogs/new');

    // Choosing Published is a change, which shows the save bar with nothing filled in.
    await userEvent.click(await screen.findByRole('radio', { name: /Published/ }));
    await userEvent.click(within(saveBar()).getByRole('button', { name: 'Save' }));

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
    expect(screen.getByText(/Images from other websites/)).toBeInTheDocument();

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

describe('images in the text', () => {
  it('inserts an image from Files at the cursor, with alt text', async () => {
    serve(makeBlog());
    renderApp('/blogs/new');

    const content = await screen.findByRole<HTMLTextAreaElement>('textbox', { name: 'Content' });
    await userEvent.type(content, 'Before.After.');
    content.setSelectionRange(7, 7);
    await userEvent.click(screen.getByRole('button', { name: 'Image' }));

    const dialog = within(screen.getByRole('dialog', { name: 'Insert image' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Insert image' }));
    expect(dialog.getByText('Choose an image.')).toBeInTheDocument();
    expect(dialog.getByText(/Describe the image/)).toBeInTheDocument();

    await userEvent.click(dialog.getByRole('button', { name: 'Choose from Files' }));
    await userEvent.click(
      await screen.findByRole('button', { name: /^Choose JPEG image uploaded/ }),
    );
    await userEvent.type(dialog.getByLabelText('Alt text'), 'Red trail shoes');
    await userEvent.click(dialog.getByRole('button', { name: 'Insert image' }));

    await waitFor(() =>
      expect(content).toHaveValue(`Before.\n\n![Red trail shoes](${photo.url})\n\nAfter.`),
    );
  });

  it('shows uploaded images in the preview, and not images from other sites', async () => {
    serve(makeBlog());
    renderApp('/blogs/new');

    // Pasted, as typing treats [ and { as special keys.
    await userEvent.click(await screen.findByRole('textbox', { name: 'Content' }));
    await userEvent.paste(
      `![Red shoes](${photo.url})\n\n![Tracker](https://evil.example.com/pixel.gif)`,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(await screen.findByRole('img', { name: 'Red shoes' })).toHaveAttribute('src', photo.url);
    expect(document.querySelector('img[src*="evil.example.com"]')).toBeNull();
    expect(screen.getByText(/Image not shown.*: Tracker/)).toBeInTheDocument();
  });
});

describe('editing a post', () => {
  it('sends only what changed', async () => {
    const blog = makeBlog();
    serve(blog, () => ({
      data: { ...blog, title: 'New season trail shoes', updatedAt: '2026-11-14T00:00:00.000Z' },
    }));
    renderApp('/blogs/b1');

    const title = await screen.findByLabelText('Title');
    await userEvent.clear(title);
    await userEvent.type(title, 'New season trail shoes');
    await userEvent.click(within(saveBar()).getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Post saved')).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith('/api/blogs/b1', {
      method: 'PATCH',
      body: { title: 'New season trail shoes' },
    });
  });

  it('moves a post to drafts through Visibility, with a hint and no dialog', async () => {
    const blog = makeBlog();
    serve(blog, () => ({
      data: { ...blog, published: false, updatedAt: '2026-11-14T00:00:00.000Z' },
    }));
    renderApp('/blogs/b1');

    // The header names the post and its state.
    expect(await screen.findByRole('heading', { name: 'New season shoes' })).toBeInTheDocument();
    expect(screen.getByText(/By Juan · Last saved/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Unsaved changes' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: /Draft/ }));
    expect(screen.getByText(/shoppers can no longer read it/)).toBeInTheDocument();
    await userEvent.click(within(saveBar()).getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Post moved to drafts')).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith('/api/blogs/b1', {
      method: 'PATCH',
      body: { published: false },
    });
  });

  it('publishes a draft through Visibility', async () => {
    const draft = makeBlog({ published: false });
    serve(draft, () => ({
      data: { ...draft, published: true, updatedAt: '2026-11-14T00:00:00.000Z' },
    }));
    renderApp('/blogs/b1');

    await userEvent.click(await screen.findByRole('radio', { name: /Published/ }));
    await userEvent.click(within(saveBar()).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(requestMock).toHaveBeenCalledWith('/api/blogs/b1', {
        method: 'PATCH',
        body: { published: true },
      }),
    );
  });

  it('discards the changes', async () => {
    serve(makeBlog());
    renderApp('/blogs/b1');

    const title = await screen.findByLabelText('Title');
    await userEvent.type(title, ' 2');
    await userEvent.click(within(saveBar()).getByRole('button', { name: 'Discard' }));

    expect(title).toHaveValue('New season shoes');
    expect(screen.queryByRole('region', { name: 'Unsaved changes' })).not.toBeInTheDocument();
    expect(sent()).toHaveLength(0);
  });
  it('deletes a post after confirming, then returns to the list', async () => {
    serve(makeBlog(), () => undefined);
    const { router } = renderApp('/blogs/b1');

    await chooseFromMore('Delete');
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
    await userEvent.click(within(saveBar()).getByRole('button', { name: 'Save' }));

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
