import { useId } from 'react';
import { Link } from 'react-router';
import { LinesSkeleton } from '@/components/Loading';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/api';
import { useCan } from '@/lib/auth';
import { useAuditLogs, type AuditEntry } from '@/features/audit-log/api';
import { historyHref } from '@/features/audit-log/history';
import { actionLabel, fieldLabel, formatValue } from '@/features/audit-log/labels';
import type { Order } from './api';
import {
  dateTimeFormat,
  isOrderStatus,
  isPaymentStatus,
  paymentLabels,
  statusLabels,
} from './labels';

/** A recorded value, with order and payment statuses in the words the page uses. */
function valueText(field: string, value: unknown) {
  if (typeof value === 'string' && field === 'status' && isOrderStatus(value)) {
    return statusLabels[value];
  }
  if (typeof value === 'string' && field === 'paymentStatus' && isPaymentStatus(value)) {
    return paymentLabels[value];
  }
  return formatValue(field, value);
}

function Event({
  title,
  at,
  by,
  changes,
}: {
  title: string;
  at: string;
  by?: string;
  changes?: string[];
}) {
  return (
    <li className="relative grid grid-cols-[0.75rem_1fr] gap-3 pb-4 last:pb-0">
      <span
        aria-hidden
        className="mt-1.5 size-2.5 rounded-full border-2 border-muted-foreground bg-background"
      />
      <div className="min-w-0 space-y-0.5 text-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <p className="font-medium">{title}</p>
          <time dateTime={at} className="text-xs text-muted-foreground tabular-nums">
            {dateTimeFormat.format(new Date(at))}
          </time>
        </div>
        {by && <p className="text-muted-foreground">{by}</p>}
        {changes?.map((change) => (
          <p key={change} className="break-words text-muted-foreground">
            {change}
          </p>
        ))}
      </div>
    </li>
  );
}

function changeLines(entry: AuditEntry) {
  return Object.entries(entry.changes).map(
    ([field, [before, after]]) =>
      `${fieldLabel(field)}: ${valueText(field, before)} → ${valueText(field, after)}`,
  );
}

/**
 * The order's staff changes from the audit log, newest first, then when it was placed. Orders
 * do not record when each step happened, so this is all the history there is. Roles that
 * cannot read the audit log do not see it.
 */
export function OrderActivity({ order }: { order: Order }) {
  const headingId = useId();
  const canView = useCan('audit_logs.view');
  const log = useAuditLogs({ page: 1, entityType: 'order', entityId: order.id }, canView);
  if (!canView) return null;

  const entries = log.data?.data ?? [];
  const more = (log.data?.meta.total ?? 0) > entries.length;

  return (
    <section aria-labelledby={headingId} className="space-y-4 rounded-lg border p-4">
      <h2 id={headingId} className="font-medium">
        Activity
      </h2>

      {log.isPending && <LinesSkeleton />}

      {log.isError && (
        <div className="space-y-3">
          <p role="alert" className="text-sm">
            {errorMessage(log.error)}
          </p>
          <Button variant="outline" size="sm" onClick={() => log.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {log.data && (
        <ol aria-label="Activity">
          {entries.map((entry) => (
            <Event
              key={entry.id}
              title={actionLabel(entry.action)}
              at={entry.createdAt}
              // Scripts such as db:set-role have no signed-in user.
              by={entry.actorUserId ? (entry.actorEmail ?? 'Deleted user') : 'System'}
              changes={changeLines(entry)}
            />
          ))}
          {!more && (
            <Event
              title={order.isGuest ? 'Placed by a guest' : 'Placed by the customer'}
              at={order.createdAt}
            />
          )}
        </ol>
      )}

      {more && (
        <Link
          to={historyHref('order', order.id)}
          className="inline-block text-sm underline underline-offset-3"
        >
          See all in Audit log
        </Link>
      )}
    </section>
  );
}
