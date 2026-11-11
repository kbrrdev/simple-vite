import { screen } from '@testing-library/react';
import { refreshSession, request } from '@/lib/api';
import { renderApp } from '@/test/render';

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  request: vi.fn(),
  refreshSession: vi.fn(),
}));

const requestMock = vi.mocked(request);

const admin = { id: '1', email: 'admin@example.com', role: 'admin', createdAt: '' };

function paymentsToCheck(total: number) {
  requestMock.mockImplementation(async (path) =>
    path === '/api/auth/me' ? { data: admin } : { data: [], meta: { page: 1, limit: 1, total } },
  );
}

beforeEach(() => {
  requestMock.mockReset();
  vi.mocked(refreshSession).mockResolvedValue(true);
});

describe('the dashboard', () => {
  it('links to the payments that need checking', async () => {
    paymentsToCheck(3);
    renderApp('/');

    expect(await screen.findByRole('link', { name: /3 payments to check/ })).toHaveAttribute(
      'href',
      '/orders?paymentStatus=submitted',
    );
    expect(requestMock).toHaveBeenCalledWith('/api/orders/admin', {
      query: { paymentStatus: 'submitted', limit: 1 },
    });
  });

  it('says when there is nothing to check', async () => {
    paymentsToCheck(0);
    renderApp('/');

    expect(await screen.findByText('No payments to check.')).toBeInTheDocument();
  });
});
