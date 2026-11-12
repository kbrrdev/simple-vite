import { HistoryIcon } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { useCan } from '@/lib/auth';
import type { AuditEntityType } from './api';

interface Props {
  entityType: AuditEntityType;
  entityId: string;
}

/** Opens the audit log at one item's changes, for roles that can read the log. */
export function HistoryLink({ entityType, entityId }: Props) {
  const canView = useCan('audit_logs.view');
  if (!canView) return null;

  const params = new URLSearchParams({ entityType, entityId });

  return (
    <Button variant="ghost" asChild className="-mr-2">
      <Link to={`/audit-log?${params}`}>
        <HistoryIcon />
        History
      </Link>
    </Button>
  );
}
