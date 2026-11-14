import { lazy, Suspense, useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { ActionCard } from '@/components/ActionCard';
import { BlockSkeleton } from '@/components/Loading';
import { Button } from '@/components/ui/button';
import type { ReportSales, SalesInterval } from './api';
import { LoadState } from './LoadState';
import { formatMetric, type Metric } from './metrics';
import { pointLabel } from './sales-format';

// The chart library is large, so it loads only when this card is on screen.
const SalesChart = lazy(() => import('./SalesChart'));

const intervals: { value: SalesInterval; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

interface Props {
  /** Shared with the metric cards, which draw their trends from the same points. */
  query: UseQueryResult<{ data: ReportSales }>;
  metric: Metric;
  compare: boolean;
  interval: SalesInterval;
  onIntervalChange: (interval: SalesInterval) => void;
}

/** The figure picked in the cards over the range, against the previous period when comparing. */
export function SalesCard({ query, metric, compare, interval, onIntervalChange }: Props) {
  const [showTable, setShowTable] = useState(false);
  const data = query.data?.data;
  const previous = compare ? data?.previous?.points : undefined;
  const name = metric.pointLabel ?? metric.label;

  return (
    <ActionCard title={name}>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div role="group" aria-label="Group by" className="flex gap-1">
          {intervals.map((item) => (
            <Button
              key={item.value}
              size="sm"
              variant={interval === item.value ? 'default' : 'outline'}
              aria-pressed={interval === item.value}
              onClick={() => onIntervalChange(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        {/* One line needs no legend, as the title names it. Two do. */}
        {previous && (
          <ul aria-label="Legend" className="flex gap-4 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span aria-hidden className="h-0.5 w-4 rounded-full bg-primary" />
              This period
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="w-4 border-t-2 border-dashed border-muted-foreground" />
              Previous period
            </li>
          </ul>
        )}
      </div>

      {!data && <LoadState query={query} skeleton={<BlockSkeleton className="h-64 w-full" />} />}

      {data && data.points.length === 0 && (
        <p className="text-sm text-muted-foreground">No sales in this range.</p>
      )}

      {data && data.points.length > 0 && (
        <>
          <Suspense fallback={<BlockSkeleton className="h-64 w-full" label="Loading chart…" />}>
            <SalesChart sales={data} metric={metric} compare={compare} />
          </Suspense>

          <Button
            variant="ghost"
            size="sm"
            aria-expanded={showTable}
            onClick={() => setShowTable((current) => !current)}
          >
            {showTable ? 'Hide table' : 'Show as table'}
          </Button>

          {showTable && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <caption className="sr-only">
                  {name} by {interval}
                </caption>
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b">
                    <th scope="col" className="py-2 pr-4 font-normal">
                      Period
                    </th>
                    <th scope="col" className="py-2 pr-4 text-right font-normal">
                      {name}
                    </th>
                    {previous && (
                      <>
                        <th scope="col" className="py-2 pr-4 font-normal">
                          Previous period
                        </th>
                        <th scope="col" className="py-2 text-right font-normal">
                          Previous {name.toLowerCase()}
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {data.points.map((point, index) => (
                    <tr key={point.date} className="border-b last:border-b-0">
                      <th scope="row" className="py-2 pr-4 text-left font-normal">
                        {pointLabel(point.date, data.interval)}
                      </th>
                      <td className="py-2 pr-4 text-right">
                        {formatMetric(metric, point[metric.point])}
                      </td>
                      {previous && (
                        <>
                          <td className="py-2 pr-4">
                            {previous[index] && pointLabel(previous[index].date, data.interval)}
                          </td>
                          <td className="py-2 text-right">
                            {previous[index] && formatMetric(metric, previous[index][metric.point])}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </ActionCard>
  );
}
