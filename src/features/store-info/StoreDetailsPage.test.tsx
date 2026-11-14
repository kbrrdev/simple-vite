import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, refreshSession, request } from '@/lib/api';
import { renderApp } from '@/test/render';
import { admin, staff } from '@/test/users';
import type { StoreInfo } from './api';

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  request: vi.fn(),
  refreshSession: vi.fn(),
}));

const requestMock = vi.mocked(request);

const saved: StoreInfo = {
  name: 'Sample Store',
  email: 'hello@example.com',
  phone: '0917 123 4567',
  line1: '123 Rizal Street',
  line2: null,
  barangay: 'Poblacion',
  city: 'Makati',
  province: 'Metro Manila',
  postalCode: '1210',
  businessHours: 'Mon to Sat, 9am to 6pm',
  socialLinks: [{ platform: 'facebook', url: 'https://facebook.com/example', label: null }],
  updatedAt: '2026-11-14T00:00:00.000Z',
};

/** Serves the saved details to the given user. Saves go to `save`, which can throw. */
function serve(save: () => unknown = () => ({ data: saved }), user = admin) {
  requestMock.mockImplementation(async (path, options) => {
    if (path === '/api/auth/me') return { data: user };
    if (path === '/api/store-info' && options?.method === 'PUT') return save();
    if (path === '/api/store-info') return { data: saved };
    throw new Error(`Unexpected request to ${path}`);
  });
}

function puts() {
  return requestMock.mock.calls.filter(([, options]) => options?.method === 'PUT');
}

beforeEach(() => {
  requestMock.mockReset();
  vi.mocked(refreshSession).mockResolvedValue(true);
});

describe('the store details screen', () => {
  it('shows the saved details, and no save bar until something changes', async () => {
    serve();
    renderApp('/store-details');

    expect(await screen.findByLabelText('Store name')).toHaveValue('Sample Store');
    expect(screen.getByLabelText('Postal code')).toHaveValue('1210');
    expect(screen.getByLabelText('Platform')).toHaveValue('facebook');
    expect(screen.getByLabelText('Link')).toHaveValue('https://facebook.com/example');
    expect(screen.queryByRole('region', { name: 'Unsaved changes' })).not.toBeInTheDocument();
  });

  it('sends the whole form, with emptied fields as null', async () => {
    serve();
    renderApp('/store-details');

    await userEvent.clear(await screen.findByLabelText('Phone'));
    await userEvent.click(screen.getByRole('button', { name: 'Add link' }));
    await userEvent.selectOptions(screen.getAllByLabelText('Platform')[1], 'instagram');
    await userEvent.type(screen.getAllByLabelText('Link')[1], 'https://instagram.com/example');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Store details saved')).toBeInTheDocument();
    expect(puts()[0][1]?.body).toEqual({
      name: 'Sample Store',
      email: 'hello@example.com',
      phone: null,
      line1: '123 Rizal Street',
      line2: null,
      barangay: 'Poblacion',
      city: 'Makati',
      province: 'Metro Manila',
      postalCode: '1210',
      businessHours: 'Mon to Sat, 9am to 6pm',
      socialLinks: [
        { platform: 'facebook', url: 'https://facebook.com/example', label: null },
        { platform: 'instagram', url: 'https://instagram.com/example', label: null },
      ],
    });
  });

  it('checks the postal code and links before sending', async () => {
    serve();
    renderApp('/store-details');

    const postal = await screen.findByLabelText('Postal code');
    await userEvent.clear(postal);
    await userEvent.type(postal, '12');
    await userEvent.clear(screen.getByLabelText('Link'));
    await userEvent.type(screen.getByLabelText('Link'), 'http://facebook.com/example');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Postal code must be 4 digits.')).toBeInTheDocument();
    expect(screen.getByText('Start the link with https://')).toBeInTheDocument();
    expect(puts()).toHaveLength(0);
  });

  it("shows the backend's error next to the link it names", async () => {
    serve(() => {
      throw new ApiError(400, {
        error: {
          message: 'Validation failed',
          details: [{ field: 'socialLinks.0.url', message: 'Link is too long' }],
        },
      });
    });
    renderApp('/store-details');

    await userEvent.type(await screen.findByLabelText('Hours'), ', closed Sundays');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Link is too long')).toBeInTheDocument();
    expect(screen.getByLabelText('Link')).toHaveAttribute('aria-invalid', 'true');
  });

  it('removes a link, and turns Add link off at the limit', async () => {
    serve();
    renderApp('/store-details');

    const add = await screen.findByRole('button', { name: 'Add link' });
    for (let count = 1; count < 10; count += 1) await userEvent.click(add);
    expect(add).toBeDisabled();

    await userEvent.click(screen.getAllByRole('button', { name: 'Remove Facebook link' })[0]);
    expect(add).toBeEnabled();
  });

  it('shows the error when the details cannot load', async () => {
    requestMock.mockImplementation(async (path) => {
      if (path === '/api/auth/me') return { data: admin };
      throw new ApiError(500, { error: { message: 'Something went wrong', requestId: 'req-1' } });
    });
    renderApp('/store-details');

    expect(await screen.findByRole('alert')).toHaveTextContent('req-1');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('shows No access without store.manage', async () => {
    serve(undefined, staff);
    renderApp('/store-details');

    expect(await screen.findByText('No access')).toBeInTheDocument();
    expect(requestMock).not.toHaveBeenCalledWith('/api/store-info', expect.anything());
  });
});
