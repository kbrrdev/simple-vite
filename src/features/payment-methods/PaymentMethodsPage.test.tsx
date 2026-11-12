import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, refreshSession, request } from '@/lib/api';
import type { Asset } from '@/features/files/api';
import { renderApp } from '@/test/render';
import { admin } from '@/test/users';
import type { PaymentMethod } from './api';

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  request: vi.fn(),
  refreshSession: vi.fn(),
}));

const requestMock = vi.mocked(request);
const date = '2026-11-01T00:00:00.000Z';

const qr: Asset = {
  id: 'asset-qr',
  url: 'https://cdn.example.com/qr.png',
  mimeType: 'image/png',
  sizeBytes: 20480,
  createdAt: date,
};

function method(overrides: Partial<PaymentMethod> = {}): PaymentMethod {
  return {
    id: 'pm-1',
    type: 'manual',
    providerName: 'GCash',
    accountName: 'Juan Store',
    accountNumber: '0917 000 0000',
    qrAssetId: null,
    qrUrl: null,
    enabled: true,
    createdAt: date,
    updatedAt: date,
    ...overrides,
  };
}

/** Lists the given methods. Changes go to `change`, which can throw to refuse them. */
function serve(methods: PaymentMethod[], change: () => unknown = () => ({ data: method() })) {
  requestMock.mockImplementation(async (path, options) => {
    if (path === '/api/auth/me') return { data: admin };
    if (path === '/api/assets' && options?.method === 'POST') return { data: qr };
    if (path === '/api/assets') return { data: [qr], meta: { page: 1, limit: 24, total: 1 } };
    if (options?.method) return change();
    return { data: methods };
  });
}

function sent(path: string) {
  return requestMock.mock.calls.filter(
    ([calledPath, options]) => calledPath === path && options?.method,
  );
}

async function openMenu(name: string) {
  await userEvent.click(await screen.findByRole('button', { name: `More actions for ${name}` }));
}

beforeEach(() => {
  requestMock.mockReset();
  vi.mocked(refreshSession).mockResolvedValue(true);
});

describe('the payment methods list', () => {
  it('shows a loading state, then each method with its account and QR', async () => {
    serve([
      method({ qrAssetId: qr.id, qrUrl: qr.url }),
      method({ id: 'pm-2', providerName: 'BDO', accountNumber: '0012 3456', enabled: false }),
    ]);
    renderApp('/payment-methods');

    expect(await screen.findByText('Loading…')).toBeInTheDocument();
    const rows = within(await screen.findByRole('list', { name: 'Payment methods' })).getAllByRole(
      'listitem',
    );
    expect(rows[0]).toHaveTextContent('GCash');
    expect(rows[0]).toHaveTextContent('Juan Store · 0917 000 0000');
    expect(rows[0].querySelector('img')).toHaveAttribute('src', qr.url);
    expect(rows[1]).toHaveTextContent('BDO');
    expect(within(rows[1]).getByText('Off')).toBeInTheDocument();
  });

  it('shows an empty state', async () => {
    serve([]);
    renderApp('/payment-methods');

    expect(await screen.findByText(/No payment methods yet/)).toBeInTheDocument();
  });

  it('shows the request id when the server fails', async () => {
    requestMock.mockImplementation(async (path) => {
      if (path === '/api/auth/me') return { data: admin };
      throw new ApiError(500, { error: { message: 'Internal error', requestId: 'req-5' } });
    });
    renderApp('/payment-methods');

    expect(await screen.findByRole('alert')).toHaveTextContent('Reference: req-5');
  });
});

describe('adding and editing', () => {
  it('adds a method with a QR code chosen from Files', async () => {
    serve([]);
    renderApp('/payment-methods');

    await userEvent.click(await screen.findByRole('button', { name: 'New payment method' }));
    const dialog = screen.getByRole('dialog', { name: 'New payment method' });
    await userEvent.type(within(dialog).getByLabelText('Provider'), 'Maya');
    await userEvent.type(within(dialog).getByLabelText('Account name'), 'Juan Store');
    await userEvent.type(within(dialog).getByLabelText('Account number'), '0918 111 2222');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Choose from Files' }));
    await userEvent.click(await screen.findByRole('button', { name: /^Choose PNG image/ }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add payment method' }));

    expect(await screen.findByText('Payment method added')).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith('/api/payment-methods', {
      method: 'POST',
      body: {
        providerName: 'Maya',
        accountName: 'Juan Store',
        accountNumber: '0918 111 2222',
        qrAssetId: 'asset-qr',
        enabled: true,
      },
    });
  });

  it('asks for every text field before sending', async () => {
    serve([]);
    renderApp('/payment-methods');

    await userEvent.click(await screen.findByRole('button', { name: 'New payment method' }));
    await userEvent.click(screen.getByRole('button', { name: 'Add payment method' }));

    expect(screen.getAllByText('Fill this in.')).toHaveLength(3);
    expect(sent('/api/payment-methods')).toHaveLength(0);
  });

  it('shows a duplicate account under the account number', async () => {
    serve([], () => {
      throw new ApiError(409, {
        error: { message: 'This account already exists for this provider' },
      });
    });
    renderApp('/payment-methods');

    await userEvent.click(await screen.findByRole('button', { name: 'New payment method' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Provider'), 'GCash');
    await userEvent.type(within(dialog).getByLabelText('Account name'), 'Juan Store');
    await userEvent.type(within(dialog).getByLabelText('Account number'), '0917 000 0000');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add payment method' }));

    expect(
      await within(dialog).findByText('This account already exists for this provider'),
    ).toHaveAttribute('id', 'payment-accountNumber-error');
  });

  it('sends only what changed, and can remove the QR code', async () => {
    serve([method({ qrAssetId: qr.id, qrUrl: qr.url })]);
    renderApp('/payment-methods');

    await userEvent.click(await screen.findByRole('button', { name: 'Edit GCash' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit payment method' });
    await userEvent.clear(within(dialog).getByLabelText('Account name'));
    await userEvent.type(within(dialog).getByLabelText('Account name'), 'Juan Store PH');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove image' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Payment method saved')).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith('/api/payment-methods/pm-1', {
      method: 'PATCH',
      body: { accountName: 'Juan Store PH', qrAssetId: null },
    });
  });
});

describe('turning off and deleting', () => {
  it('asks before turning a method off', async () => {
    serve([method()]);
    renderApp('/payment-methods');

    await openMenu('GCash');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Turn off' }));
    const dialog = screen.getByRole('dialog', { name: 'Turn off payment method' });
    expect(dialog).toHaveTextContent("Customers can't choose GCash at checkout");
    await userEvent.click(within(dialog).getByRole('button', { name: 'Turn off' }));

    expect(await screen.findByText('Payment method turned off')).toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledWith('/api/payment-methods/pm-1', {
      method: 'PATCH',
      body: { enabled: false },
    });
  });

  it('turns a method back on', async () => {
    serve([method({ enabled: false })]);
    renderApp('/payment-methods');

    await openMenu('GCash');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Turn on' }));

    await waitFor(() =>
      expect(requestMock).toHaveBeenCalledWith('/api/payment-methods/pm-1', {
        method: 'PATCH',
        body: { enabled: true },
      }),
    );
  });

  it('explains when orders use the method it tries to delete', async () => {
    serve([method()], () => {
      throw new ApiError(409, {
        error: { message: 'Orders use this payment method, so turn it off instead' },
      });
    });
    renderApp('/payment-methods');

    await openMenu('GCash');
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete payment method' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Orders use this payment method, so turn it off instead',
    );
    expect(requestMock).toHaveBeenCalledWith('/api/payment-methods/pm-1', { method: 'DELETE' });
  });
});
