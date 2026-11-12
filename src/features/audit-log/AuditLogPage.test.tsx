import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, refreshSession, request } from '@/lib/api';
import type { User } from '@/lib/auth';
import { renderApp } from '@/test/render';
import { admin, staff } from '@/test/users';
import type { AuditEntry } from './api';

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  request: vi.fn(),
  refreshSession: vi.fn(),
}));

const requestMock = vi.mocked(request);

const janeId = '11111111-1111-4111-8111-111111111111';
const productId = '22222222-2222-4222-8222-222222222222';

function makeEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: crypto.randomUUID(),
    actorUserId: janeId,
    actorEmail: 'jane@example.com',
    entityType: 'variant',
    entityId: '33333333-3333-4333-8333-333333333333',
    action: 'update',
    changes: { priceCents: [129900, 99900], stock: [3, 8] },
    requestId: null,
    createdAt: '2026-11-12T02:30:00.000Z',
    ...overrides,
  };
}

/** Answers the session, and the log with `list`, which can throw to fail it. */
function serve(list: () => AuditEntry[], user: User = admin) {
  requestMock.mockImplementation(async (path) => {
    if (path === '/api/auth/me') return { data: user };
    if (path === '/api/audit-logs') {
      const data = list();
      return { data, meta: { page: 1, limit: 20, total: data.length } };
    }
    // Pages linked from the log may load behind it in some tests.
    return { data: null };
  });
}

function lastQuery() {
  return requestMock.mock.calls.filter(([path]) => path === '/api/audit-logs').at(-1)?.[1]?.query;
}

beforeEach(() => {
  requestMock.mockReset();
  vi.mocked(refreshSession).mockResolvedValue(true);
});

describe('the audit log', () => {
  it('lists each change with who made it, and its fields before and after', async () => {
    serve(() => [
      makeEntry(),
      makeEntry({
        actorUserId: null,
        actorEmail: null,
        entityType: 'user',
        action: 'role_change',
        changes: { role: [null, 'Staff'] },
      }),
    ]);
    renderApp('/audit-log');
    const user = userEvent.setup();

    const list = await screen.findByRole('list', { name: 'Changes' });
    const [variant, script] = within(list).getAllByRole('listitem');
    expect(variant).toHaveTextContent('Variant · Updated');
    expect(script).toHaveTextContent('User · Role changed');
    expect(script).toHaveTextContent('System');

    await user.click(within(variant).getByRole('button', { name: 'Show changes (2)' }));
    const price = within(variant).getByRole('row', { name: /Price/ });
    expect(price).toHaveTextContent('₱1,299.00');
    expect(price).toHaveTextContent('₱999.00');
  });

  it('shows only the new values of a created item', async () => {
    serve(() => [makeEntry({ action: 'create', changes: { name: [null, 'Trail Runner'] } })]);
    renderApp('/audit-log');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Show changes (1)' }));
    expect(screen.queryByRole('columnheader', { name: 'Before' })).not.toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Name/ })).toHaveTextContent('Trail Runner');
  });

  it('links to the pages items have', async () => {
    serve(() => [makeEntry({ entityType: 'product', entityId: productId })]);
    renderApp('/audit-log');

    expect(await screen.findByRole('link', { name: 'View product' })).toHaveAttribute(
      'href',
      `/products/${productId}`,
    );
  });

  it('says when nothing matches the filters', async () => {
    serve(() => []);
    renderApp('/audit-log?entityType=order');

    expect(await screen.findByText('No changes match these filters.')).toBeInTheDocument();
  });

  it('shows the request id when the server fails', async () => {
    serve(() => {
      throw new ApiError(500, { error: { message: 'Something went wrong', requestId: 'req-1' } });
    });
    renderApp('/audit-log');

    expect(await screen.findByRole('alert')).toHaveTextContent('req-1');
  });

  it('is only for roles that can read it', async () => {
    serve(() => [], staff);
    renderApp('/audit-log');

    expect(await screen.findByRole('heading', { name: 'No access' })).toBeInTheDocument();
    expect(requestMock).not.toHaveBeenCalledWith('/api/audit-logs', expect.anything());
  });
});

describe('filters', () => {
  it('reads the filters from the URL', async () => {
    serve(() => [makeEntry()]);
    renderApp('/audit-log?entityType=variant&from=2026-11-01&to=2026-11-12&page=2');

    await screen.findByRole('list', { name: 'Changes' });
    expect(screen.getByLabelText('Type')).toHaveValue('variant');
    expect(screen.getByLabelText('From')).toHaveValue('2026-11-01');
    expect(lastQuery()).toMatchObject({
      entityType: 'variant',
      from: '2026-11-01',
      to: '2026-11-12',
    });
  });

  it("shows one person's changes when their email is clicked, and clears it again", async () => {
    serve(() => [makeEntry()]);
    const { router } = renderApp('/audit-log');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'jane@example.com' }));

    expect(router.state.location.search).toBe(`?actorUserId=${janeId}`);
    expect(await screen.findByText('By jane@example.com')).toBeInTheDocument();
    expect(lastQuery()).toMatchObject({ actorUserId: janeId, page: 1 });

    await user.click(screen.getByRole('button', { name: 'Clear filter: By jane@example.com' }));
    expect(router.state.location.search).toBe('');
  });

  it('waits for a range that ends after it starts', async () => {
    serve(() => [makeEntry()]);
    renderApp('/audit-log?from=2026-11-12&to=2026-11-01');

    expect(await screen.findByText('The first day must come before the last.')).toBeInTheDocument();
    expect(requestMock).not.toHaveBeenCalledWith('/api/audit-logs', expect.anything());
  });

  it('ignores a malformed id in the URL', async () => {
    serve(() => [makeEntry()]);
    renderApp('/audit-log?actorUserId=nope');

    await screen.findByRole('list', { name: 'Changes' });
    expect(lastQuery()).not.toHaveProperty('actorUserId', 'nope');
  });
});
