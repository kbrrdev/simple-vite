import { HistoryIcon, SearchIcon, XIcon } from 'lucide-react';
import { Navigate, useSearchParams } from 'react-router';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { IndexCard, IndexError, IndexList } from '@/components/IndexCard';
import { NativeSelect } from '@/components/NativeSelect';
import { Pagination } from '@/components/Pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePageParam } from '@/lib/use-page-param';
import { ListSkeleton } from '@/components/Loading';
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
      <PageHeader
        title="Audit log"
        description="Every change staff made, newest first. Entries cannot be edited or removed."
      />

      <IndexCard
        filters={
          <>
            <Label htmlFor="audit-type" className="sr-only">
              Type
            </Label>
            <NativeSelect
              id="audit-type"
              className="md:w-48"
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
            <div className="grid grid-cols-2 gap-2 md:flex">
              <div className="flex items-center gap-2">
                <Label htmlFor="audit-from" className="shrink-0">
                  From
                </Label>
                <Input
                  id="audit-from"
                  type="date"
                  className="md:w-40"
                  value={from ?? ''}
                  max={to}
                  onChange={(event) => setFilters({ from: event.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="audit-to" className="shrink-0">
                  To
                </Label>
                <Input
                  id="audit-to"
                  type="date"
                  className="md:w-40"
                  value={to ?? ''}
                  min={from}
                  aria-invalid={badRange}
                  aria-describedby={badRange ? 'audit-range-error' : undefined}
                  onChange={(event) => setFilters({ to: event.target.value })}
                />
              </div>
            </div>
            {actorUserId && (
              <FilterChip
                label={`By ${actorEmail ?? 'one person'}`}
                onClear={() => setFilters({ actorUserId: '' })}
              />
            )}
            {entityId && (
              <FilterChip label={`One ${typeLabel}`} onClear={() => setFilters({ entityId: '' })} />
            )}
            {filtered && (
              <Button variant="ghost" onClick={() => setSearchParams({})}>
                Clear filters
              </Button>
            )}
            {entityType === 'product' && entityId && (
              <p className="text-sm text-muted-foreground md:basis-full">
                Changes to this product's variants and images are listed under their own types.
              </p>
            )}
            {badRange && (
              <p id="audit-range-error" className="text-sm text-destructive md:basis-full">
                The first day must come before the last.
              </p>
            )}
          </>
        }
        footer={
          !badRange &&
          log.data &&
          log.data.meta.total > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              loading={log.isPlaceholderData}
            />
          )
        }
      >
        {!badRange && log.isPending && <ListSkeleton bare />}

        {log.isError && <IndexError error={log.error} onRetry={() => log.refetch()} />}

        {!badRange && log.data?.meta.total === 0 && (
          <EmptyState
            bare
            icon={filtered ? SearchIcon : HistoryIcon}
            title={filtered ? 'No changes match these filters' : 'No changes recorded yet'}
          >
            {filtered
              ? 'Try another type, person, or day, or clear the filters.'
              : 'Staff changes show here as they happen.'}
          </EmptyState>
        )}

        {!badRange && log.data && log.data.meta.total > 0 && (
          <IndexList label="Changes">
            {entries.map((entry) => (
              <AuditEntryRow
                key={entry.id}
                entry={entry}
                onActorClick={(id) => setFilters({ actorUserId: id })}
              />
            ))}
          </IndexList>
        )}
      </IndexCard>
    </div>
  );
}
