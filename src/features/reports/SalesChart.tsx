import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ReportSales } from './api';
import { axisMetric, formatMetric, type Metric } from './metrics';
import { pointLabel } from './sales-format';

interface Row {
  label: string;
  current: number;
  previous?: number;
  previousLabel?: string;
}

/** The props Recharts passes to a tooltip that this one reads. */
interface TooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: Row }>;
}

interface Props {
  sales: ReportSales;
  metric: Metric;
  compare: boolean;
}

/**
 * The picked figure over the range, with the previous period dashed behind it on the same axis.
 * They differ in lightness and dash, so they stay apart without color vision. Loaded only when
 * shown.
 */
export default function SalesChart({ sales, metric, compare }: Props) {
  const previous = compare ? sales.previous?.points : undefined;
  // The backend sends one previous point for each current one, in the same order.
  const data: Row[] = sales.points.map((point, index) => ({
    label: pointLabel(point.date, sales.interval),
    current: point[metric.point],
    previous: previous?.[index]?.[metric.point],
    previousLabel: previous?.[index] && pointLabel(previous[index].date, sales.interval),
  }));
  const name = metric.pointLabel ?? metric.label;

  function ChartTooltip({ active, payload }: TooltipProps) {
    const row = payload?.[0]?.payload;
    if (!active || !row) return null;
    return (
      <div className="space-y-1 rounded-lg bg-popover p-3 text-sm shadow-md ring-1 ring-foreground/10">
        <p className="font-medium">{name}</p>
        <p className="flex items-center gap-2">
          <span aria-hidden className="h-0.5 w-3 rounded-full bg-primary" />
          <span className="text-muted-foreground">{row.label}</span>
          <span className="ml-auto pl-3 font-medium tabular-nums">
            {formatMetric(metric, row.current)}
          </span>
        </p>
        {row.previous !== undefined && (
          <p className="flex items-center gap-2">
            <span aria-hidden className="w-3 border-t-2 border-dashed border-muted-foreground" />
            <span className="text-muted-foreground">{row.previousLabel}</span>
            <span className="ml-auto pl-3 font-medium tabular-nums">
              {formatMetric(metric, row.previous)}
            </span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={`Line chart of ${name.toLowerCase()} by ${sales.interval}${previous ? ', with the previous period dashed' : ''}. Show as table lists the figures.`}
      className="h-64 w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            minTickGap={16}
          />
          <YAxis
            width={52}
            tickLine={false}
            axisLine={false}
            allowDecimals={metric.money}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            tickFormatter={(value: number) => axisMetric(metric, value)}
          />
          <Tooltip content={ChartTooltip} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />
          {previous && (
            <Line
              dataKey="previous"
              name="Previous period"
              type="linear"
              stroke="var(--muted-foreground)"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 4, stroke: 'var(--background)', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          )}
          <Line
            dataKey="current"
            name="This period"
            type="linear"
            stroke="var(--primary)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            activeDot={{ r: 4, stroke: 'var(--background)', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
