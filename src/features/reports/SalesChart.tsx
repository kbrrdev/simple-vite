import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCents } from '@/lib/money';
import type { ReportSales } from './api';
import { compactCents, pointLabel } from './sales-format';

// The two lines often run close together, so a legend and the tooltip name them rather than
// labels at the line ends.
// Emphasis form: gross sales is the series the chart is about, in Charcoal, and collected is
// context, in Slate Text. They differ in lightness, so they stay apart without color vision.
const series = [
  { key: 'grossSalesCents', label: 'Gross sales', color: 'var(--primary)' },
  { key: 'collectedCents', label: 'Collected', color: 'var(--muted-foreground)' },
] as const;

type Point = ReportSales['points'][number];

/** The props Recharts passes to a tooltip that this one reads. */
interface TooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: Point }>;
  label?: string | number;
}

function SalesTooltip({ active, payload, label }: TooltipProps) {
  const point = payload?.[0]?.payload;
  if (!active || !point || typeof label !== 'string') return null;

  return (
    <div className="space-y-1 rounded-lg bg-popover p-3 text-sm shadow-md ring-1 ring-foreground/10">
      <p className="font-medium">{label}</p>
      {series.map((item) => (
        <p key={item.key} className="flex items-center gap-2">
          <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: item.color }} />
          <span className="text-muted-foreground">{item.label}</span>
          <span className="ml-auto pl-3 font-medium tabular-nums">
            {formatCents(point[item.key])}
          </span>
        </p>
      ))}
      <p className="text-muted-foreground tabular-nums">
        {point.orders} {point.orders === 1 ? 'order' : 'orders'}
      </p>
    </div>
  );
}

/** Gross sales and collected over the range, on one peso axis. Loaded only when shown. */
export default function SalesChart({ sales }: { sales: ReportSales }) {
  const data = sales.points.map((point) => ({
    ...point,
    label: pointLabel(point.date, sales.interval),
  }));

  return (
    <div
      role="img"
      aria-label={`Line chart of gross sales and collected by ${sales.interval}. Show as table lists the figures.`}
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
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            tickFormatter={compactCents}
          />
          <Tooltip content={SalesTooltip} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />
          {series.map((item) => (
            <Line
              key={item.key}
              dataKey={item.key}
              name={item.label}
              type="linear"
              stroke={item.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={{ r: 4, stroke: 'var(--background)', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
