import { ApiError, errorMessage, request, setAccessToken } from './api';

const fetchMock = vi.fn<typeof fetch>();

function json(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function calledPaths() {
  return fetchMock.mock.calls.map(([url]) => new URL(String(url)).pathname);
}

function authHeader(call: number) {
  return new Headers(fetchMock.mock.calls[call][1]?.headers).get('Authorization');
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  setAccessToken('old-token');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('request', () => {
  it('sends the token and cookies, and returns the body', async () => {
    fetchMock.mockResolvedValueOnce(
      json(200, { data: [1], meta: { page: 1, limit: 20, total: 1 } }),
    );

    const body = await request('/api/products/admin', { query: { page: 1, search: undefined } });

    expect(body).toEqual({ data: [1], meta: { page: 1, limit: 20, total: 1 } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('http://api.test/api/products/admin?page=1');
    expect(init?.credentials).toBe('include');
    expect(authHeader(0)).toBe('Bearer old-token');
  });

  it('sends JSON bodies, and returns undefined for 204', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(
      request('/api/categories/1', { method: 'PATCH', body: { name: 'A' } }),
    ).resolves.toBe(undefined);
    const init = fetchMock.mock.calls[0][1];
    expect(init?.body).toBe('{"name":"A"}');
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json');
  });

  it('leaves the content type of uploads to the browser', async () => {
    fetchMock.mockResolvedValueOnce(json(201, { data: {} }));
    const form = new FormData();

    await request('/api/assets', { method: 'POST', body: form });

    const init = fetchMock.mock.calls[0][1];
    expect(init?.body).toBe(form);
    expect(new Headers(init?.headers).has('Content-Type')).toBe(false);
  });

  it('throws an ApiError with the message, details, and requestId', async () => {
    fetchMock.mockResolvedValueOnce(
      json(400, {
        error: { message: 'Validation failed', details: [{ field: 'name', message: 'Required' }] },
      }),
    );

    const error = await request('/api/categories').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      message: 'Validation failed',
      details: [{ field: 'name', message: 'Required' }],
    });
  });

  it('throws an ApiError when the error body is not JSON', async () => {
    fetchMock.mockResolvedValueOnce(new Response('Bad gateway', { status: 502 }));

    await expect(request('/api/categories')).rejects.toMatchObject({ status: 502, details: [] });
  });
});

describe('refreshing on 401', () => {
  it('refreshes once and retries with the new token', async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { error: { message: 'Expired' } }))
      .mockResolvedValueOnce(json(200, { data: { accessToken: 'new-token' } }))
      .mockResolvedValueOnce(json(200, { data: 'ok' }));

    await expect(request('/api/auth/me')).resolves.toEqual({ data: 'ok' });

    expect(calledPaths()).toEqual(['/api/auth/me', '/api/auth/refresh', '/api/auth/me']);
    expect(authHeader(2)).toBe('Bearer new-token');
  });

  it('shares one refresh between parallel requests', async () => {
    fetchMock.mockImplementation(async (input, init) => {
      const path = new URL(String(input)).pathname;
      if (path === '/api/auth/refresh') return json(200, { data: { accessToken: 'new-token' } });

      const token = new Headers(init?.headers).get('Authorization');
      return token === 'Bearer new-token' ? json(200, { data: path }) : json(401);
    });

    await Promise.all([request('/api/a'), request('/api/b'), request('/api/c')]);

    expect(calledPaths().filter((path) => path === '/api/auth/refresh')).toHaveLength(1);
  });

  it('throws the 401 when the refresh fails, without retrying', async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { error: { message: 'Expired' } }))
      .mockResolvedValueOnce(json(401, { error: { message: 'Invalid or expired refresh token' } }));

    await expect(request('/api/auth/me')).rejects.toMatchObject({ status: 401 });
    expect(calledPaths()).toEqual(['/api/auth/me', '/api/auth/refresh']);
  });

  it('does not refresh after a failed login', async () => {
    fetchMock.mockResolvedValueOnce(json(401, { error: { message: 'Invalid email or password' } }));

    await expect(request('/api/auth/login', { method: 'POST', body: {} })).rejects.toMatchObject({
      message: 'Invalid email or password',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('errorMessage', () => {
  it('shows the backend message for expected errors', () => {
    expect(errorMessage(new ApiError(409, { error: { message: 'Category is in use' } }))).toBe(
      'Category is in use',
    );
  });

  it('adds the reference to server errors, and hides their message', () => {
    const error = new ApiError(500, {
      error: { message: 'Internal server error', requestId: 'abc' },
    });
    expect(errorMessage(error)).toBe('Something went wrong on the server. Reference: abc');
  });

  it('explains network failures', () => {
    expect(errorMessage(new TypeError('Failed to fetch'))).toMatch(/Could not reach the server/);
  });
});
