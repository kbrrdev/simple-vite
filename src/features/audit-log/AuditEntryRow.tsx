import { useId, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import type { AuditEntry } from './api';
import {
  actionLabel,
  entityLabels,
  entityPaths,
  fieldLabel,
  formatValue,
  timeFormat,
} from './labels';

interface Props {
  entry: AuditEntry;
  /** Filters the log to one person's changes. */
  onActorClick: (actorUserId: string) => void;
}

function Changes({ id, entry }: { id: string; entry: AuditEntry }) {
  const changes = Object.entries(entry.changes);
  // A new item has nothing before, and a deleted one nothing after, so those columns go.
  const showBefore = entry.action !== 'create';
  const showAfter = entry.action !== 'delete';
  const valueClass = 'block max-h-40 overflow-auto break-words whitespace-pre-wrap';

  return (
    <table id={id} className="w-full text-sm">
      <caption className="sr-only">Changes</caption>
      <thead className="hidden text-left text-xs text-muted-foreground sm:table-header-group">
        <tr>
          <th scope="col" className="py-1 pr-4 font-normal">
            Field
          </th>
          {showBefore && (
            <th scope="col" className="py-1 pr-4 font-normal">
              Before
            </th>
          )}
          {showAfter && (
            <th scope="col" className="py-1 font-normal">
              After
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {changes.map(([field, [before, after]]) => (
          // Each change stacks on phones: the field, then its values, labelled.
          <tr key={field} className="grid gap-0.5 border-t py-2 sm:table-row sm:py-0">
            <th scope="row" className="text-left align-top font-medium sm:w-40 sm:py-2 sm:pr-4">
              {fieldLabel(field)}
            </th>
            {showBefore && (
              <td className="align-top text-muted-foreground sm:py-2 sm:pr-4">
                <span className="text-xs sm:sr-only">Before: </span>
                <span className={valueClass}>{formatValue(field, before)}</span>
              </td>
            )}
            {showAfter && (
              <td className="align-top sm:py-2">
                <span className="text-xs text-muted-foreground sm:sr-only">After: </span>
                <span className={valueClass}>{formatValue(field, after)}</span>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** One change: what happened to which item, when, by whom, and the fields it changed. */
export function AuditEntryRow({ entry, onActorClick }: Props) {
  const [open, setOpen] = useState(false);
  const changesId = useId();
  const count = Object.keys(entry.changes).length;
  const entity = entityLabels[entry.entityType];
  const path = entityPaths[entry.entityType]?.(entry.entityId);

  return (
    <li className="space-y-2 border-t px-4 py-3 first:border-t-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm">
          <span className="font-medium">{entity}</span>
          <span className="text-muted-foreground"> · </span>
          {actionLabel(entry.action)}
        </p>
        {path && (
          <Link
            to={path}
            className="text-sm underline-offset-3 hover:underline focus-visible:underline"
          >
            View {entity.toLowerCase()}
          </Link>
        )}
      </div>

      <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
        <time dateTime={entry.createdAt} className="tabular-nums">
          {timeFormat.format(new Date(entry.createdAt))}
        </time>
        <span aria-hidden>·</span>
        {entry.actorUserId ? (
          <Button
            type="button"
            variant="link"
            className="h-11 px-0 text-xs text-muted-foreground md:h-auto"
            title="Show only this person's changes"
            onClick={() => entry.actorUserId && onActorClick(entry.actorUserId)}
          >
            {entry.actorEmail ?? 'Deleted user'}
          </Button>
        ) : (
          // Scripts such as db:set-role have no signed-in user.
          <span>System</span>
        )}
        {count > 0 && (
          <>
            <span aria-hidden>·</span>
            <Button
              type="button"
              variant="link"
              className="h-11 px-0 text-xs md:h-auto"
              aria-expanded={open}
              aria-controls={changesId}
              onClick={() => setOpen((current) => !current)}
            >
              {open ? 'Hide changes' : `Show changes (${count})`}
            </Button>
          </>
        )}
      </p>

      {open && <Changes id={changesId} entry={entry} />}
    </li>
  );
}
