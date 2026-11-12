import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { request, type Schemas } from '@/lib/api';

export type AuditEntry = Schemas['AuditLog'];
export type AuditEntityType = AuditEntry['entityType'];

export interface AuditFilters {
  page: number;
  entityType?: AuditEntityType;
  entityId?: string;
  actorUserId?: string;
  /** Calendar days in Manila time, both included. */
  from?: string;
  to?: string;
}

export const pageSize = 20;

/** `enabled` is false while the filters cannot be sent, such as a range that ends before it starts. */
export function useAuditLogs(filters: AuditFilters, enabled = true) {
  return useQuery({
    queryKey: ['audit-log', filters],
    queryFn: () =>
      request<{ data: AuditEntry[]; meta: Schemas['PageMeta'] }>('/api/audit-logs', {
        query: { ...filters, limit: pageSize },
      }),
    enabled,
    placeholderData: keepPreviousData,
  });
}
