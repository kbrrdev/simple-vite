import { useSearchParams } from 'react-router';
import { PageHeader } from '@/components/PageHeader';
import { useCan } from '@/lib/auth';
import type { DateRange, SalesByDimension, SalesInterval, TopProductsSort } from './api';
import { useSales, useSummary } from './api';
import { BestSellers } from './BestSellers';
import { Breakdown } from './Breakdown';
import { LoadState } from './LoadState';
import { LowStock } from './LowStock';
import { MetricCards } from './MetricCards';
import { findMetric, metrics } from './metrics';
import { NeedsAttention } from './NeedsAttention';
import { RangePicker } from './RangePicker';
import { formatDay, manilaToday, readDay } from './range';
import { SalesBy } from './SalesBy';
import { SalesCard } from './SalesCard';

/** A whole number from the URL, or the fallback when it is missing or not one. */
function readInteger(value: string | null, fallback: number, min: number) {
  const number = Number(value);
  return value !== null && Number.isInteger(number) && number >= min ? number : fallback;
}

export function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const range: DateRange = {
    from: readDay(searchParams.get('from')),
    to: readDay(searchParams.get('to')),
  };
  const intervalParam = searchParams.get('interval');
  const interval: SalesInterval =
    intervalParam === 'week' || intervalParam === 'month' ? intervalParam : 'day';
  const sort: TopProductsSort = searchParams.get('top') === 'revenue' ? 'revenue' : 'quantity';
  // Compared with the previous period unless turned off, as Shopify does.
  const compare = searchParams.get('compare') !== 'off';
  const metric = findMetric(searchParams.get('metric'));
  const dimension: SalesByDimension =
    searchParams.get('by') === 'category' ? 'category' : 'payment_method';
  const threshold = readInteger(searchParams.get('threshold'), 5, 0);
  const stockPage = readInteger(searchParams.get('stockPage'), 1, 1);
  const today = manilaToday();
  // Each role sees the reports it has: operations for daily work, sales for the money.
  const canSeeOperations = useCan('reports.operations');
  const canSeeSales = useCan('reports.sales');
  // The cards, the chart, and the breakdown share these, one request each.
  const summary = useSummary(range, compare, canSeeSales);
  const sales = useSales(range, interval, compare, canSeeSales);

  /** Sets URL parameters, removing any set to undefined. */
  function setParams(changes: Record<string, string | undefined>) {
    setSearchParams((params) => {
      for (const [name, value] of Object.entries(changes)) {
        if (value === undefined) params.delete(name);
        else params.set(name, value);
      }
      return params;
    });
  }

  const shown = summary.data?.data;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />

      {canSeeOperations && <NeedsAttention />}

      {canSeeSales && (
        <section aria-labelledby="range-heading" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1">
              <h2 id="range-heading" className="text-lg font-semibold tabular-nums">
                {shown ? `${formatDay(shown.from)} – ${formatDay(shown.to)}` : 'Sales'}
              </h2>
              {shown?.previous && (
                <p className="text-sm text-muted-foreground tabular-nums">
                  Compared with {formatDay(shown.previous.from)} – {formatDay(shown.previous.to)}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-end gap-4">
              {/* Keyed by the URL range, so that Back resets the custom days. */}
              <RangePicker
                key={`${range.from}-${range.to}`}
                range={range}
                today={today}
                onChange={(next) => setParams({ from: next.from, to: next.to })}
              />
              <label className="flex min-h-9 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={compare}
                  onChange={(event) =>
                    setParams({ compare: event.target.checked ? undefined : 'off' })
                  }
                />
                Compare to previous period
              </label>
            </div>
          </div>

          {summary.isError ? (
            <LoadState query={summary} />
          ) : (
            <MetricCards
              summary={shown}
              sales={sales.data?.data}
              compare={compare}
              selected={metric}
              onSelect={(next) =>
                setParams({ metric: next.key === metrics[0].key ? undefined : next.key })
              }
            />
          )}

          <SalesCard
            query={sales}
            metric={metric}
            compare={compare}
            interval={interval}
            onIntervalChange={(next) => setParams({ interval: next === 'day' ? undefined : next })}
          />

          <div className="grid gap-6 md:grid-cols-2 md:items-start">
            {!summary.isError && <Breakdown summary={shown} />}
            <SalesBy
              range={range}
              dimension={dimension}
              onDimensionChange={(next) =>
                setParams({ by: next === 'category' ? next : undefined })
              }
            />
          </div>
        </section>
      )}

      {(canSeeSales || canSeeOperations) && (
        <div
          className={`grid gap-6 md:items-start ${canSeeSales && canSeeOperations ? 'md:grid-cols-2' : ''}`}
        >
          {canSeeSales && (
            <BestSellers
              range={range}
              sort={sort}
              onSortChange={(next) => setParams({ top: next === 'revenue' ? next : undefined })}
            />
          )}
          {canSeeOperations && (
            <LowStock
              page={stockPage}
              threshold={threshold}
              onPageChange={(next) => setParams({ stockPage: String(next) })}
              onThresholdChange={(next) =>
                setParams({
                  threshold: next === 5 ? undefined : String(next),
                  stockPage: undefined,
                })
              }
            />
          )}
        </div>
      )}

      {!canSeeSales && !canSeeOperations && (
        <p className="text-muted-foreground">
          Your role has no reports. Use the menu to get to your work.
        </p>
      )}
    </div>
  );
}
