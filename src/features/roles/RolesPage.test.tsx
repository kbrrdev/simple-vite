import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, refreshSession, request } from '@/lib/api';
import type { User } from '@/lib/auth';
import { renderApp } from '@/test/render';
import { admin } from '@/test/users';
import { editorRole, permissionList, roleList, staffRole, superAdminRole } from './test-data';

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  request: vi.fn(),
  refreshSession: vi.fn(),
}));

const requestMock = vi.mocked(request);

type Change = (path: string, method: string, body?: unknown) => unknown;

/** Answers the session, roles, and permissions. `change` answers writes, or throws to refuse. */
function serve(change: Change = () => ({ data: editorRole }), user: User = admin) {
  requestMock.mockImplementation(async (path, options) => {
    if (path === '/api/auth/me') return { data: user };
    if (options?.method) return change(path, options.method, options.body);
    if (path === '/api/roles') return { data: roleList };
    if (path === '/api/roles/permissions') return { data: permissionList };
    const role = roleList.find((item) => path === `/api/roles/${item.id}`);
    if (role) return { data: role };
    throw new ApiError(404, { error: { message: 'Not found' } });
  });
}

beforeEach(() => {
  requestMock.mockReset();
  vi.mocked(refreshSession).mockResolvedValue(true);
});

describe('the roles list', () => {
  it('shows each role with what it can do and who has it', async () => {
    serve();
    renderApp('/roles');

    const list = await screen.findByRole('list', { name: 'Roles' });
    const [editor, staff, superAdmin] = within(list).getAllByRole('listitem');
    expect(editor).toHaveTextContent('1 permission');
    expect(editor).toHaveTextContent('Nobody yet');
    expect(within(staff).getByRole('link', { name: '2 people with Staff' })).toHaveAttribute(
      'href',
      `/people?roleId=${staffRole.id}`,
    );
    expect(superAdmin).toHaveTextContent('Built in');
    expect(superAdmin).toHaveTextContent('Every permission');
  });

  it('shows the request id when the server fails', async () => {
    requestMock.mockImplementation(async (path) => {
      if (path === '/api/auth/me') return { data: admin };
      throw new ApiError(500, { error: { message: 'Something went wrong', requestId: 'req-9' } });
    });
    renderApp('/roles');

    expect(await screen.findByRole('alert')).toHaveTextContent('req-9');
  });

  it('is only for super admins, even ones with every permission', async () => {
    serve(undefined, { ...admin, superAdmin: false, role: { id: 'r', name: 'Admin' } });
    renderApp('/roles');

    expect(await screen.findByRole('heading', { name: 'No access' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).queryByRole('link', { name: 'Roles' })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'People' })).not.toBeInTheDocument();
  });
});

describe('the role editor', () => {
  it('creates a role with the checked permissions', async () => {
    serve(() => ({ data: { ...editorRole, id: 'new-role' } }));
    const { router } = renderApp('/roles/new');
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Name'), ' Packer ');
    await user.click(await screen.findByLabelText('List and view any order'));
    await user.click(screen.getByLabelText('Change variant stock only'));
    await user.click(screen.getByRole('button', { name: 'Create role' }));

    expect(requestMock).toHaveBeenCalledWith('/api/roles', {
      method: 'POST',
      body: { name: 'Packer', description: '', permissions: ['orders.view', 'inventory.manage'] },
    });
    expect(router.state.location.pathname).toBe('/roles/new-role');
  });

  it('groups permissions by area', async () => {
    serve();
    renderApp('/roles/new');

    const orders = await screen.findByRole('group', { name: 'Orders' });
    expect(within(orders).getAllByRole('checkbox')).toHaveLength(3);
    // Scoped to the page, as the nav has a Content group too.
    expect(
      within(screen.getByRole('main')).getByRole('group', { name: 'Content' }),
    ).toBeInTheDocument();
  });

  it('sends only what changed', async () => {
    serve();
    renderApp(`/roles/${editorRole.id}`);
    const user = userEvent.setup();

    await user.click(await screen.findByLabelText('Read the audit log'));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(requestMock).toHaveBeenCalledWith(`/api/roles/${editorRole.id}`, {
      method: 'PATCH',
      body: { permissions: ['blogs.manage', 'audit_logs.view'] },
    });
  });

  it('shows a taken name next to the name', async () => {
    serve(() => {
      throw new ApiError(409, { error: { message: 'A role with this name already exists' } });
    });
    renderApp(`/roles/${editorRole.id}`);
    const user = userEvent.setup();

    const name = await screen.findByLabelText('Name');
    await user.clear(name);
    await user.type(name, 'Staff');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('A role with this name already exists')).toBeInTheDocument();
    expect(name).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows Super admin without a way to change it', async () => {
    serve();
    renderApp(`/roles/${superAdminRole.id}`);

    expect(await screen.findByText(/It cannot be changed or deleted/)).toBeInTheDocument();
    expect(await screen.findByText('Read the audit log')).toBeInTheDocument();
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete role' })).not.toBeInTheDocument();
  });

  it('keeps a role people have from being deleted', async () => {
    serve();
    renderApp(`/roles/${staffRole.id}`);

    expect(await screen.findByRole('button', { name: 'Delete role' })).toBeDisabled();
    expect(screen.getByText(/Give its 2 people another role first/)).toBeInTheDocument();
  });

  it('deletes an unused role after confirming', async () => {
    serve(() => undefined);
    const { router } = renderApp(`/roles/${editorRole.id}`);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Delete role' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete role' });
    expect(requestMock).not.toHaveBeenCalledWith(`/api/roles/${editorRole.id}`, {
      method: 'DELETE',
    });
    await user.click(within(dialog).getByRole('button', { name: 'Delete role' }));

    expect(requestMock).toHaveBeenCalledWith(`/api/roles/${editorRole.id}`, {
      method: 'DELETE',
    });
    expect(router.state.location.pathname).toBe('/roles');
  });
});
