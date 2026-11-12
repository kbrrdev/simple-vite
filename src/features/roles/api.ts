import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request, type Schemas } from '@/lib/api';
import type { Permission } from '@/lib/auth';

export type Role = Schemas['Role'];
export type CreateRoleBody = Schemas['CreateRoleBody'];
export type RoleChanges = Partial<CreateRoleBody>;

export interface PermissionInfo {
  key: Permission;
  description: string;
}

/** Every role. Stores have few, so the backend returns them all at once. */
export function useRoles() {
  return useQuery({
    queryKey: ['roles', 'list'],
    queryFn: () => request<{ data: Role[] }>('/api/roles'),
  });
}

export function useRole(id: string) {
  return useQuery({
    queryKey: ['roles', 'detail', id],
    queryFn: () => request<{ data: Role }>(`/api/roles/${id}`),
  });
}

/** Every permission with the backend's description of it, in the backend's order. */
export function usePermissions() {
  return useQuery({
    queryKey: ['roles', 'permissions'],
    queryFn: () => request<{ data: PermissionInfo[] }>('/api/roles/permissions'),
    staleTime: Infinity,
  });
}

/**
 * A change to roles. People lists show each user's role name, and roles show how many people
 * have them, so both are refreshed. Callers show errors themselves.
 */
function useRoleMutation<T, R>(send: (variables: T) => Promise<R>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: send,
    meta: { toast: false },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['roles'] }),
        queryClient.invalidateQueries({ queryKey: ['users'] }),
      ]);
    },
  });
}

export function useCreateRole() {
  return useRoleMutation((body: CreateRoleBody) =>
    request<{ data: Role }>('/api/roles', { method: 'POST', body }),
  );
}

export function useUpdateRole() {
  return useRoleMutation(({ id, body }: { id: string; body: RoleChanges }) =>
    request<{ data: Role }>(`/api/roles/${id}`, { method: 'PATCH', body }),
  );
}

/** The backend refuses while people have the role, and for the built-in Super admin. */
export function useDeleteRole() {
  return useRoleMutation((id: string) => request(`/api/roles/${id}`, { method: 'DELETE' }));
}
