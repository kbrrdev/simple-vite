import { XIcon } from 'lucide-react';
import { Navigate, useSearchParams } from 'react-router';
import { NativeSelect } from '@/components/NativeSelect';
import { Pagination } from '@/components/Pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { errorMessage } from '@/lib/api';
import { usePageParam } from '@/lib/use-page-param';
import { pageSize, useAuditLogs } from './api';
import { AuditEntryRow } from './AuditEntryRow';
import { entityLabels, isEntityType } from './labels';

type FilterName = 'entityType' | 'entityId' | 'actorUserId' | 'from' | 'to';

// The backend refuses anything else with a 400, so a mistyped link shows everything instead.
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const day = /^\d{4}-\d{2}-\d{2}$/;

function read(value: string | null, pattern: RegExp) {
  return value && pattern.test(value) ? value : undefined;
}

/** A removable note for a filter set from a link rather than the fields, such as one person. */
function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border py-0.5 pr-0.5 pl-2 text-sm">
      {label}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Clear filter: ${label}`}
        className="size-11 md:size-6"
        onClick={onClear}
      >
        <XIcon />
      </Button>
    </span>
  );
}

export function AuditLogPage() {
  const [page, setPage] = usePageParam();
  const [searchParams, setSearchParams] = useSearchParams();
  const typeParam = searchParams.get('entityType');
  const entityType = isEntityType(typeParam) ? typeParam : undefined;
  const entityId = read(searchParams.get('entityId'), uuid);
  const actorUserId = read(searchParams.get('actorUserId'), uuid);
  const from = read(searchParams.get('from'), day);
  const to = read(searchParams.get('to'), day);
  const badRange = Boolean(from && to && from > to);

  const log = useAuditLogs({ page, entityType, entityId, actorUserId, from, to }, !badRange);
  const entries = log.data?.data ?? [];
  const totalPages = Math.max(1, Math.ceil((log.data?.meta.total ?? 0) / pageSize));
  const filtered = Boolean(entityType || entityId || actorUserId || from || to);

  // A new change can shift the pages, so step back to the new last page.
  if (log.data && !log.isPlaceholderData && page > totalPages) {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(totalPages));
    return <Navigate to={`?${params}`} replace />;
  }

  /** Sets filters and goes back to the first page. An empty value removes the filter. */
  function setFilters(changes: Partial<Record<FilterName, string>>) {
    setSearchParams((params) => {
      for (const [name, value] of Object.entries(changes)) {
        if (value) params.set(name, value);
        else params.delete(name);
      }
      params.delete('page');
      return params;
    });
  }

  // Every entry shown is by the person filtered to, so the first one names them.
  const actorEmail = entries.find((entry) => entry.actorUserId === actorUserId)?.actorEmail;
  const typeLabel = entityType ? entityLabels[entityType].toLowerCase() : 'item';

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <p className="text-sm text-muted-foreground">
          Every change staff made, newest first. Entries cannot be edited or removed.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 md:flex md:items-end">
        <div className="space-y-2 md:w-48">
          <Label htmlFor="audit-type">Type</Label>
          <NativeSelect
            id="audit-type"
            value={entityType ?? ''}
            // A single item only makes sense within its own type.
            onChange={(event) => setFilters({ entityType: event.target.value, entityId: '' })}
          >
            <option value="">All types</option>
            {Object.entries(entityLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2 md:w-44">
          <Label htmlFor="audit-from">From</Label>
          <Input
            id="audit-from"
            type="date"
            value={from ?? ''}
            max={to}
            onChange={(event) => setFilters({ from: event.target.value })}
          />
        </div>
        <div className="space-y-2 md:w-44">
          <Label htmlFor="audit-to">To</Label>
          <Input
            id="audit-to"
            type="date"
            value={to ?? ''}
            min={from}
            aria-invalid={badRange}
            aria-describedby={badRange ? 'audit-range-error' : undefined}
            onChange={(event) => setFilters({ to: event.target.value })}
          />
        </div>
        {filtered && (
          <Button variant="ghost" onClick={() => setSearchParams({})}>
            Clear filters
          </Button>
        )}
      </div>

      {(actorUserId || entityId) && (
        <div className="flex flex-wrap gap-2">
          {actorUserId && (
            <FilterChip
              label={`By ${actorEmail ?? 'one person'}`}
              onClear={() => setFilters({ actorUserId: '' })}
            />
          )}
          {entityId && (
            <FilterChip label={`One ${typeLabel}`} onClear={() => setFilters({ entityId: '' })} />
          )}
        </div>
      )}

      {entityType === 'product' && entityId && (
        <p className="text-sm text-muted-foreground">
          Changes to this product's variants and images are listed under their own types.
        </p>
      )}

      {badRange && (
        <p id="audit-range-error" className="text-sm text-destructive">
          The first day must come before the last.
        </p>
      )}

      {!badRange && log.isPending && (
        <p role="status" className="text-muted-foreground">
          Loading…
        </p>
      )}

      {log.isError && (
        <div className="space-y-4">
          <p role="alert">{errorMessage(log.error)}</p>
          <Button variant="outline" onClick={() => log.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {!badRange && log.data?.meta.total === 0 && (
        <p className="text-muted-foreground">
          {filtered ? 'No changes match these filters.' : 'No changes recorded yet.'}
        </p>
      )}

      {!badRange && log.data && log.data.meta.total > 0 && (
        <>
          <ul aria-label="Changes" className="overflow-hidden rounded-lg border">
            {entries.map((entry) => (
              <AuditEntryRow
                key={entry.id}
                entry={entry}
                onActorClick={(id) => setFilters({ actorUserId: id })}
              />
            ))}
          </ul>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            loading={log.isPlaceholderData}
          />
        </>
      )}
    </div>
  );
}
