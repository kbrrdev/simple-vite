import { ActionCard } from '@/components/ActionCard';
import { Button } from '@/components/ui/button';
import { formatCents } from '@/lib/money';
import { useSalesBy, type DateRange, type SalesByDimension } from './api';
import { LoadState } from './LoadState';

const dimensions: { value: SalesByDimension; label: string; note: string }[] = [
  {
    value: 'payment_method',
    label: 'Payment method',
    note: 'Orders by how they were paid.',
  },
  {
    value: 'category',
    label: 'Category',
    // From the backend's description, as these do not add up to gross sales.
    note: 'Item totals by top-level category, without shipping, so they do not add up to gross sales.',
  },
];

const counts = new Intl.NumberFormat('en-PH');

interface Props {
  range: DateRange;
  dimension: SalesByDimension;
  onDimensionChange: (dimension: SalesByDimension) => void;
}

/**
 * Gross sales split by payment method or category, after Shopify's "Sales by" cards. Each row
 * has a bar of one hue, as long as its share of the largest, with its figures printed beside it.
 */
export function SalesBy({ range, dimension, onDimensionChange }: Props) {
  const report = useSalesBy(range, dimension);
  const rows = report.data?.data.rows;
  const largest = Math.max(1, ...(rows ?? []).map((row) => row.grossSalesCents));
  const current = dimensions.find((item) => item.value === dimension) ?? dimensions[0];

  return (
    <ActionCard title="Sales by">
      <div role="group" aria-label="Split by" className="flex gap-1">
        {dimensions.map((item) => (
          <Button
            key={item.value}
            size="sm"
            variant={dimension === item.value ? 'default' : 'outline'}
            aria-pressed={dimension === item.value}
            onClick={() => onDimensionChange(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{current.note}</p>

      {!rows && <LoadState query={report} />}
      {rows?.length === 0 && (
        <p className="text-sm text-muted-foreground">No sales in this range.</p>
      )}
      {rows && rows.length > 0 && (
        <ul aria-label={`Sales by ${current.label.toLowerCase()}`} className="space-y-3">
          {rows.map((row) => (
            <li key={row.key} className="space-y-1 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate font-medium">{row.label}</span>
                <span className="shrink-0 tabular-nums">
                  <span className="text-muted-foreground">
                    {counts.format(row.orders)} {row.orders === 1 ? 'order' : 'orders'}
                  </span>{' '}
                  <span className="font-medium">{formatCents(row.grossSalesCents)}</span>
                </span>
              </div>
              <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(row.grossSalesCents / largest) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </ActionCard>
  );
}
