import { Link } from 'react-router';
import { ActionCard } from '@/components/ActionCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCents } from '@/lib/money';
import { useTopProducts, type DateRange, type TopProductsSort } from './api';
import { LoadState } from './LoadState';

const sorts: { value: TopProductsSort; label: string }[] = [
  { value: 'quantity', label: 'By quantity' },
  { value: 'revenue', label: 'By revenue' },
];

interface Props {
  range: DateRange;
  sort: TopProductsSort;
  onSortChange: (sort: TopProductsSort) => void;
}

export function BestSellers({ range, sort, onSortChange }: Props) {
  const top = useTopProducts(range, sort);
  const items = top.data?.data.items;

  return (
    <ActionCard title="Best sellers">
      <div role="group" aria-label="Rank" className="flex gap-1">
        {sorts.map((item) => (
          <Button
            key={item.value}
            size="sm"
            variant={sort === item.value ? 'default' : 'outline'}
            aria-pressed={sort === item.value}
            onClick={() => onSortChange(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {!items && <LoadState query={top} />}
      {items?.length === 0 && (
        <p className="text-sm text-muted-foreground">No sales in this range.</p>
      )}
      {items && items.length > 0 && (
        <ol aria-label="Best sellers" className="-mx-4 -mb-4">
          {items.map((item, index) => (
            <li key={item.productId} className="border-t">
              <Link
                to={`/products/${item.productId}`}
                className="flex min-h-11 items-center gap-3 px-4 py-2 text-sm outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <span className="w-5 text-muted-foreground tabular-nums">{index + 1}</span>
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate font-medium">{item.name}</span>
                  {!item.active && <Badge variant="secondary">Inactive</Badge>}
                </span>
                <span className="text-muted-foreground tabular-nums">{item.quantity} sold</span>
                <span className="w-24 text-right font-medium tabular-nums">
                  {formatCents(item.revenueCents)}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </ActionCard>
  );
}
