import { lazy, Suspense, useState } from 'react';
import { ActionCard } from '@/components/ActionCard';
import { Button } from '@/components/ui/button';
import { formatCents } from '@/lib/money';
import { useSales, type DateRange, type SalesInterval } from './api';
import { LoadState } from './LoadState';
import { pointLabel } from './sales-format';

// The chart library is large, so it loads only when this card is on screen.
const SalesChart = lazy(() => import('./SalesChart'));

const intervals: { value: SalesInterval; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

const legend = [
  { label: 'Gross sales', className: 'bg-primary' },
  { label: 'Collected', className: 'bg-muted-foreground' },
];

interface Props {
  range: DateRange;
  interval: SalesInterval;
  onIntervalChange: (interval: SalesInterval) => void;
}

export function SalesCard({ range, interval, onIntervalChange }: Props) {
  const [showTable, setShowTable] = useState(false);
  const sales = useSales(range, interval);
  const data = sales.data?.data;

  return (
    <ActionCard title="Sales">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
        <ul aria-label="Legend" className="flex gap-4 text-sm text-muted-foreground">
          {legend.map((item) => (
            <li key={item.label} className="flex items-center gap-2">
              <span aria-hidden className={`h-0.5 w-4 rounded-full ${item.className}`} />
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      {!data && <LoadState query={sales} />}

      {data && data.points.length === 0 && (
        <p className="text-sm text-muted-foreground">No sales in this range.</p>
      )}

      {data && data.points.length > 0 && (
        <>
          <Suspense
            fallback={
              <p role="status" className="h-64 text-sm text-muted-foreground">
                Loading chart…
              </p>
            }
          >
            <SalesChart sales={data} />
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
                <caption className="sr-only">Sales by {interval}</caption>
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b">
                    <th scope="col" className="py-2 pr-4 font-normal">
                      Period
                    </th>
                    <th scope="col" className="py-2 pr-4 text-right font-normal">
                      Orders
                    </th>
                    <th scope="col" className="py-2 pr-4 text-right font-normal">
                      Gross sales
                    </th>
                    <th scope="col" className="py-2 text-right font-normal">
                      Collected
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.points.map((point) => (
                    <tr key={point.date} className="border-b last:border-b-0">
                      <th scope="row" className="py-2 pr-4 text-left font-normal">
                        {pointLabel(point.date, data.interval)}
                      </th>
                      <td className="py-2 pr-4 text-right">{point.orders}</td>
                      <td className="py-2 pr-4 text-right">{formatCents(point.grossSalesCents)}</td>
                      <td className="py-2 text-right">{formatCents(point.collectedCents)}</td>
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
