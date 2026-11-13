import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, refreshSession, request } from '@/lib/api';
import type { User } from '@/lib/auth';
import { renderApp } from '@/test/render';
import { admin, customer, staff } from '@/test/users';

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  request: vi.fn(),
  refreshSession: vi.fn(),
}));

const requestMock = vi.mocked(request);
const refreshMock = vi.mocked(refreshSession);

function signedInAs(user: User) {
  refreshMock.mockResolvedValue(true);
  requestMock.mockImplementation(async (path) =>
    path === '/api/auth/me' ? { data: user } : undefined,
  );
}

function signedOut() {
  refreshMock.mockResolvedValue(false);
}

function navLinks(nav: HTMLElement) {
  return within(nav)
    .getAllByRole('link')
    .map((link) => link.textContent);
}

async function logIn() {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('Email'), 'admin@example.com');
  await user.type(screen.getByLabelText('Password'), 'correct-horse-battery');
  await user.click(screen.getByRole('button', { name: 'Log in' }));
}

beforeEach(() => {
  requestMock.mockReset();
  refreshMock.mockReset();
});

describe('the staff guard', () => {
  it('sends signed-out users to the login page', async () => {
    signedOut();
    const { router } = renderApp('/');

    expect(await screen.findByRole('button', { name: 'Log in' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('restores an admin session from the refresh cookie', async () => {
    signedInAs(admin);
    renderApp('/');

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('turns away customers', async () => {
    signedInAs(customer);
    renderApp('/');

    expect(await screen.findByRole('heading', { name: 'Staff only' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Dashboard' })).not.toBeInTheDocument();
  });

  it('shows a retry when the session cannot be checked', async () => {
    refreshMock.mockRejectedValue(new TypeError('Failed to fetch'));
    renderApp('/');

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('shows a not found page for unknown paths', async () => {
    signedInAs(admin);
    renderApp('/nope');

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });
});

describe('permissions', () => {
  it('shows only the areas the role can use', async () => {
    signedInAs(staff);
    renderApp('/');

    const nav = await screen.findByRole('navigation', { name: 'Main' });
    expect(navLinks(nav)).toEqual(['Home', 'Orders', 'Products', 'Content']);
    // Staff can only use Files, so Content opens it.
    expect(within(nav).getByRole('link', { name: 'Content' })).toHaveAttribute('href', '/files');
    expect(screen.getAllByText('Staff').length).toBeGreaterThan(0);
  });

  it("shows an area's pages only while inside it", async () => {
    signedInAs(admin);
    const { router } = renderApp('/');

    const nav = await screen.findByRole('navigation', { name: 'Main' });
    expect(navLinks(nav)).toEqual([
      'Home',
      'Orders',
      'Products',
      'Content',
      'Discounts',
      'Settings',
    ]);

    await userEvent.click(within(nav).getByRole('link', { name: 'Products' }));
    // The page's code loads before the navigation finishes.
    await waitFor(() => expect(router.state.location.pathname).toBe('/products'));
    // The nav redraws a moment after the address changes, so wait for it under load.
    await waitFor(() =>
      expect(navLinks(nav)).toEqual([
        'Home',
        'Orders',
        'Products',
        'Categories',
        'Content',
        'Discounts',
        'Settings',
      ]),
    );

    await userEvent.click(within(nav).getByRole('link', { name: 'Settings' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/payment-methods'));
    await waitFor(() =>
      expect(navLinks(nav)).toEqual([
        'Home',
        'Orders',
        'Products',
        'Content',
        'Discounts',
        'Settings',
        'Payment methods',
        'People',
        'Roles',
        'Audit log',
      ]),
    );
  });

  it('counts the payments to check beside Orders, for roles that can read the report', async () => {
    refreshMock.mockResolvedValue(true);
    requestMock.mockImplementation(async (path) => {
      if (path === '/api/auth/me') return { data: admin };
      if (path === '/api/reports/order-status') {
        return {
          data: {
            counts: [],
            needsAttention: { paymentsToConfirm: 3, ordersToConfirm: 1, ordersToShip: 2 },
          },
        };
      }
      return undefined;
    });
    renderApp('/files');

    const nav = await screen.findByRole('navigation', { name: 'Main' });
    expect(
      await within(nav).findByRole('link', { name: 'Orders 3 payments to check' }),
    ).toBeInTheDocument();
  });

  it('leaves out the count for roles that cannot read the report', async () => {
    signedInAs({ ...staff, permissions: ['orders.view'] });
    renderApp('/orders');

    const nav = await screen.findByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'Orders' })).toBeInTheDocument();
    expect(requestMock).not.toHaveBeenCalledWith('/api/reports/order-status');
  });

  it('explains a page the role cannot use, without asking the backend for it', async () => {
    signedInAs(staff);
    renderApp('/categories');

    expect(await screen.findByRole('heading', { name: 'No access' })).toBeInTheDocument();
    expect(requestMock).not.toHaveBeenCalledWith('/api/categories/tree');
  });

  it('keeps New product from roles that cannot manage products', async () => {
    signedInAs(staff);
    renderApp('/products/new');

    expect(await screen.findByRole('heading', { name: 'No access' })).toBeInTheDocument();
  });
});

describe('logging in', () => {
  it('logs in as a web client and opens the dashboard', async () => {
    signedOut();
    requestMock.mockResolvedValueOnce({ data: { user: admin, accessToken: 'token' } });
    renderApp('/login');

    await logIn();

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@example.com', password: 'correct-horse-battery', client: 'web' },
    });
  });

  it('returns to the page the user first asked for', async () => {
    signedOut();
    requestMock.mockResolvedValueOnce({ data: { user: admin, accessToken: 'token' } });
    const { router } = renderApp('/nope');

    await logIn();

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/nope');
  });

  it('shows the backend message for wrong credentials', async () => {
    signedOut();
    requestMock.mockRejectedValueOnce(
      new ApiError(401, { error: { message: 'Invalid email or password' } }),
    );
    renderApp('/login');

    await logIn();

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });

  it('asks the user to wait after too many attempts', async () => {
    signedOut();
    requestMock.mockRejectedValueOnce(
      new ApiError(429, { error: { message: 'Too many requests' } }),
    );
    renderApp('/login');

    await logIn();

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts');
  });

  it('shows validation errors next to their field', async () => {
    signedOut();
    requestMock.mockRejectedValueOnce(
      new ApiError(400, {
        error: {
          message: 'Validation failed',
          details: [{ field: 'email', message: '"email" must be a valid email' }],
        },
      }),
    );
    renderApp('/login');

    await logIn();

    expect(await screen.findByText('"email" must be a valid email')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('the layout', () => {
  it('shows the store name', async () => {
    signedInAs(admin);
    renderApp('/');

    await screen.findByRole('heading', { name: 'Dashboard' });
    expect(screen.getAllByText('Store Admin').length).toBeGreaterThan(0);
  });

  it('opens the phone menu and closes it after navigating', async () => {
    signedInAs(admin);
    const { router } = renderApp('/');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Open menu' }));
    const menu = await screen.findByRole('dialog', { name: 'Store Admin' });
    await user.click(within(menu).getByRole('link', { name: 'Orders' }));

    expect(router.state.location.pathname).toBe('/orders');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('logging out', () => {
  it('ends the session and returns to the login page', async () => {
    signedInAs(admin);
    renderApp('/');

    // Log out is in the account menu, so that a stray tap cannot sign someone out.
    await userEvent.click(await screen.findByRole('button', { name: /admin@example.com/ }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Log out' }));

    expect(await screen.findByRole('button', { name: 'Log in' })).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' });
  });
});
