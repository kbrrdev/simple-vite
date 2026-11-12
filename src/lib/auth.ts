import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { refreshSession, request, setAccessToken, type Schemas } from './api';

export type User = Schemas['User'];
export type Permission = User['permissions'][number];

export const sessionKey = ['session'];

/** The signed-in user, or null. On first load, the refresh cookie restores the session. */
async function loadSession(): Promise<User | null> {
  if (!(await refreshSession())) return null;

  const { data } = await request<{ data: User }>('/api/auth/me');
  return data;
}

export function useSession() {
  return useQuery({
    queryKey: sessionKey,
    queryFn: loadSession,
    staleTime: Infinity,
    retry: false,
  });
}

/**
 * Whether the signed-in user's role grants `permission`. It only hides what they cannot use,
 * as the backend checks every request.
 */
export function useCan(permission: Permission) {
  const { data: user } = useSession();
  return user?.permissions.includes(permission) ?? false;
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: { email: string; password: string }) =>
      request<{ data: { user: User; accessToken: string } }>('/api/auth/login', {
        method: 'POST',
        body: { ...credentials, client: 'web' },
      }),
    meta: { toast: false },
    onSuccess: ({ data }) => {
      setAccessToken(data.accessToken);
      queryClient.setQueryData(sessionKey, data.user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => request('/api/auth/logout', { method: 'POST' }),
    meta: { toast: false },
    // Signed out locally even when the request fails, as the session may already be gone.
    onSettled: () => {
      setAccessToken(null);
      queryClient.setQueryData(sessionKey, null);
      // Drops cached admin data. The session query stays, as the guard is watching it.
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== sessionKey[0] });
    },
  });
}
