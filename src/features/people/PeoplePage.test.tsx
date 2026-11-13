import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, refreshSession, request } from '@/lib/api';
import { renderApp } from '@/test/render';
import { admin } from '@/test/users';
import { roleList, staffRole, superAdminRole } from '@/features/roles/test-data';
import type { Person } from './api';

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  request: vi.fn(),
  refreshSession: vi.fn(),
}));

const requestMock = vi.mocked(request);

const me: Person = {
  id: admin.id,
  email: admin.email,
  role: { id: superAdminRole.id, name: 'Super admin' },
  createdAt: '2026-10-01T00:00:00.000Z',
};
const ana: Person = {
  id: '44444444-4444-4444-8444-444444444444',
  email: 'ana@example.com',
  role: { id: staffRole.id, name: 'Staff' },
  createdAt: '2026-11-02T00:00:00.000Z',
};
const jane: Person = {
  id: '55555555-5555-4555-8555-555555555555',
  email: 'jane@example.com',
  role: null,
  createdAt: '2026-11-05T00:00:00.000Z',
};

/** Answers staff and customer searches, roles, and role changes. */
function serve(staff: () => Person[] = () => [ana, me]) {
  requestMock.mockImplementation(async (path, options) => {
    if (path === '/api/auth/me') return { data: admin };
    if (path === '/api/roles') return { data: roleList };
    if (options?.method === 'PATCH') return { data: ana };
    if (path === '/api/users') {
      const data = options?.query?.type === 'customer' ? [jane] : staff();
      return { data, meta: { page: 1, limit: 20, total: data.length } };
    }
    throw new Error(`Unexpected request: ${path}`);
  });
}

function lastUsersQuery() {
  return requestMock.mock.calls.filter(([path]) => path === '/api/users').at(-1)?.[1]?.query;
}

beforeEach(() => {
  requestMock.mockReset();
  vi.mocked(refreshSession).mockResolvedValue(true);
});

describe('the people list', () => {
  it('lists staff with their roles, and locks your own row', async () => {
    serve();
    renderApp('/people');

    const list = await screen.findByRole('list', { name: 'People' });
    const [anaRow, myRow] = within(list).getAllByRole('listitem');
    expect(anaRow).toHaveTextContent('Staff');
    expect(
      within(anaRow).getByRole('button', { name: 'Change role for ana@example.com' }),
    ).toBeInTheDocument();
    expect(myRow).toHaveTextContent('You');
    expect(within(myRow).queryByRole('button')).not.toBeInTheDocument();
    expect(lastUsersQuery()).toMatchObject({ type: 'staff', page: 1 });
  });

  it('reads the search and role from the URL', async () => {
    serve();
    renderApp(`/people?search=ana&roleId=${staffRole.id}`);

    await screen.findByRole('list', { name: 'People' });
    expect(screen.getByLabelText('Role')).toHaveValue(staffRole.id);
    expect(lastUsersQuery()).toMatchObject({ type: 'staff', search: 'ana', roleId: staffRole.id });
  });

  it('says when nothing matches', async () => {
    serve(() => []);
    renderApp('/people?search=zzz');

    expect(await screen.findByText('No staff match these filters')).toBeInTheDocument();
  });

  it('shows the request id when the server fails', async () => {
    serve(() => {
      throw new ApiError(500, { error: { message: 'Something went wrong', requestId: 'req-7' } });
    });
    renderApp('/people');

    expect(await screen.findByRole('alert')).toHaveTextContent('req-7');
  });
});

describe('changing roles', () => {
  it('gives someone another role', async () => {
    serve();
    renderApp('/people');
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('button', { name: 'Change role for ana@example.com' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Change role' });
    await user.selectOptions(within(dialog).getByLabelText('Role'), 'Editor');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(requestMock).toHaveBeenCalledWith(`/api/users/${ana.id}/role`, {
      method: 'PATCH',
      body: { roleId: roleList[0].id },
    });
  });

  it('explains removing access before doing it', async () => {
    serve();
    renderApp('/people');
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('button', { name: 'Change role for ana@example.com' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Change role' });
    await user.selectOptions(within(dialog).getByLabelText('Role'), 'No access (customer)');

    expect(within(dialog).getByText(/can no longer sign in/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Remove access' }));

    expect(requestMock).toHaveBeenCalledWith(`/api/users/${ana.id}/role`, {
      method: 'PATCH',
      body: { roleId: null },
    });
  });

  it('warns before making someone a super admin', async () => {
    serve();
    renderApp('/people');
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('button', { name: 'Change role for ana@example.com' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Change role' });
    await user.selectOptions(within(dialog).getByLabelText('Role'), 'Super admin');

    expect(within(dialog).getByText(/manage roles and people/)).toBeInTheDocument();
  });
});

describe('adding staff', () => {
  it('finds a customer by email and gives them a role', async () => {
    serve();
    renderApp('/people');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Add staff' }));
    const dialog = screen.getByRole('dialog', { name: 'Add staff' });
    await user.type(within(dialog).getByLabelText('Email'), 'jane');
    await user.click(within(dialog).getByRole('button', { name: 'Search' }));

    await user.click(await within(dialog).findByLabelText('jane@example.com'));
    expect(lastUsersQuery()).toMatchObject({ type: 'customer', search: 'jane' });
    await user.selectOptions(within(dialog).getByLabelText('Role'), 'Staff');
    await user.click(within(dialog).getByRole('button', { name: 'Give access' }));

    expect(requestMock).toHaveBeenCalledWith(`/api/users/${jane.id}/role`, {
      method: 'PATCH',
      body: { roleId: staffRole.id },
    });
  });

  it('asks for a person and a role first', async () => {
    serve();
    renderApp('/people');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Add staff' }));
    const dialog = screen.getByRole('dialog', { name: 'Add staff' });
    await user.click(within(dialog).getByRole('button', { name: 'Give access' }));

    expect(within(dialog).getByText('Choose who to give access.')).toBeInTheDocument();
    expect(within(dialog).getByText('Choose a role.')).toBeInTheDocument();
    expect(requestMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/role'),
      expect.anything(),
    );
  });
});
