import type { MoreMenuItem } from '@/components/MoreMenu';
import { useCan } from '@/lib/auth';
import type { AuditEntityType } from './api';

/** The audit log filtered to one item's changes. */
export function historyHref(entityType: AuditEntityType, entityId: string) {
  return `/audit-log?${new URLSearchParams({ entityType, entityId })}`;
}

/** History for a record's More menu, for roles that can read the audit log. */
export function useHistoryItem(entityType: AuditEntityType, entityId?: string): MoreMenuItem[] {
  const canView = useCan('audit_logs.view');
  if (!canView || !entityId) return [];
  return [{ key: 'history', label: 'History', to: historyHref(entityType, entityId) }];
}
