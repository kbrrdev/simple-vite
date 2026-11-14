import { ArrowDownRightIcon, ArrowUpRightIcon } from 'lucide-react';
import { cn } from 'cn';
import { Loading } from '@/components/Loading';
import { Skeleton } from '@/components/ui/skeleton';
import type { ReportSales, ReportSummary } from './api';
import { describeChange, formatMetric, metrics, type Metric } from './metrics';

/** A line through the values, scaled to the box. The previous period is dashed behind it. */
function Sparkline({ values, previous }: { values: number[]; previous?: number[] }) {
  // Both lines share one scale, so a taller line means more, not a different axis.
  const top = Math.max(1, ...values, ...(previous ?? []));
  const path = (series: number[]) =>
    series
      .map((value, index) => {
        const x = series.length === 1 ? 50 : (index / (series.length - 1)) * 100;
        const y = 30 - (value / top) * 28;
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');

  return (
    <svg aria-hidden viewBox="0 0 100 32" preserveAspectRatio="none" className="h-8 w-full">
      {previous && previous.length > 1 && (
        <path
          d={path(previous)}
          fill="none"
          stroke="var(--muted-foreground)"
          strokeWidth={1.5}
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {values.length > 1 && (
        <path
          d={path(values)}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}

/** The backend's change from the previous period, with an arrow so it never relies on color. */
function ChangeBadge({ change }: { change: number | null | undefined }) {
  const described = describeChange(change);
  if (!described) {
    return <span className="text-xs text-muted-foreground">No earlier sales to compare</span>;
  }
  const Icon = described.direction === 'down' ? ArrowDownRightIcon : ArrowUpRightIcon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums',
        // Green for growth, and neutral for a fall, as red means danger in this app.
        described.direction === 'up' ? 'bg-success text-success-foreground' : 'bg-muted',
      )}
    >
      {described.direction !== 'flat' && <Icon aria-hidden className="size-3.5" />}
      <span className="sr-only">{described.spoken} from the previous period</span>
      <span aria-hidden>{described.text}</span>
    </span>
  );
}

interface Props {
  summary: ReportSummary | undefined;
  sales: ReportSales | undefined;
  compare: boolean;
  selected: Metric;
  onSelect: (metric: Metric) => void;
}

/**
 * The headline figures as cards, after Shopify's Analytics. Each shows the backend's figure, its
 * change from the previous period, and its trend, and picking one fills the chart below.
 */
export function MetricCards({ summary, sales, compare, selected, onSelect }: Props) {
  if (!summary) {
    return (
      <Loading className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.key} className="space-y-3 rounded-lg border p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </Loading>
    );
  }

  return (
    <section aria-label="Summary">
      <div role="group" aria-label="Chart figure" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((metric) => {
          const pressed = metric.key === selected.key;
          return (
            <button
              key={metric.key}
              type="button"
              aria-pressed={pressed}
              onClick={() => onSelect(metric)}
              className={cn(
                'flex min-w-0 flex-col gap-2 rounded-lg border p-4 text-left outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring',
                pressed && 'border-foreground bg-muted/50',
              )}
            >
              <span className="text-sm text-muted-foreground">{metric.label}</span>
              <span className="text-xl font-semibold break-words tabular-nums md:text-2xl">
                {formatMetric(metric, summary[metric.summary])}
              </span>
              {compare && <ChangeBadge change={summary.changes?.[metric.summary]} />}
              {sales && (
                <Sparkline
                  values={sales.points.map((point) => point[metric.point])}
                  previous={
                    compare ? sales.previous?.points.map((point) => point[metric.point]) : undefined
                  }
                />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
