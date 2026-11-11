import { useSearchParams } from 'react-router';
import type { DateRange, SalesInterval, TopProductsSort } from './api';
import { useSummary } from './api';
import { BestSellers } from './BestSellers';
import { LowStock } from './LowStock';
import { NeedsAttention } from './NeedsAttention';
import { RangePicker } from './RangePicker';
import { formatDay, manilaToday, readDay } from './range';
import { SalesCard } from './SalesCard';
import { Summary } from './Summary';

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
  const threshold = readInteger(searchParams.get('threshold'), 5, 0);
  const stockPage = readInteger(searchParams.get('stockPage'), 1, 1);
  const today = manilaToday();
  // Shares its cache with the Summary card, so the heading costs no extra request.
  const summary = useSummary(range);

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
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <NeedsAttention />

      <section aria-labelledby="range-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="range-heading" className="text-lg font-semibold tabular-nums">
            {shown ? `${formatDay(shown.from)} – ${formatDay(shown.to)}` : 'Sales'}
          </h2>
          {/* Keyed by the URL range, so that Back resets the custom days. */}
          <RangePicker
            key={`${range.from}-${range.to}`}
            range={range}
            today={today}
            onChange={(next) => setParams({ from: next.from, to: next.to })}
          />
        </div>

        <Summary range={range} />

        <SalesCard
          range={range}
          interval={interval}
          onIntervalChange={(next) => setParams({ interval: next === 'day' ? undefined : next })}
        />
      </section>

      <div className="grid gap-6 md:grid-cols-2 md:items-start">
        <BestSellers
          range={range}
          sort={sort}
          onSortChange={(next) => setParams({ top: next === 'revenue' ? next : undefined })}
        />
        <LowStock
          page={stockPage}
          threshold={threshold}
          onPageChange={(next) => setParams({ stockPage: String(next) })}
          onThresholdChange={(next) =>
            setParams({ threshold: next === 5 ? undefined : String(next), stockPage: undefined })
          }
        />
      </div>
    </div>
  );
}
