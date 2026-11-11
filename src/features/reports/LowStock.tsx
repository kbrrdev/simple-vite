import { type FormEvent } from 'react';
import { Link } from 'react-router';
import { ActionCard } from '@/components/ActionCard';
import { Pagination } from '@/components/Pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { lowStockPageSize, useLowStock, type LowStockVariant } from './api';
import { LoadState } from './LoadState';

/** The variant's options, such as "Size M · Color Red", or nothing for a product without any. */
function optionsLabel(variant: LowStockVariant) {
  return [
    variant.option1Value && `${variant.option1Name} ${variant.option1Value}`,
    variant.option2Value && `${variant.option2Name} ${variant.option2Value}`,
  ]
    .filter(Boolean)
    .join(' · ');
}

interface Props {
  page: number;
  threshold: number;
  onPageChange: (page: number) => void;
  onThresholdChange: (threshold: number) => void;
}

export function LowStock({ page, threshold, onPageChange, onThresholdChange }: Props) {
  const lowStock = useLowStock(page, threshold);
  const data = lowStock.data;
  const totalPages = Math.max(1, Math.ceil((data?.meta.total ?? 0) / lowStockPageSize));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(new FormData(event.currentTarget).get('threshold'));
    if (Number.isInteger(value) && value >= 0) onThresholdChange(value);
  }

  return (
    <ActionCard title={`Low stock (${threshold} or fewer)`}>
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="space-y-2">
          <Label htmlFor="low-stock-threshold">Show at or below</Label>
          {/* Keyed by the URL, so that Back resets the box. */}
          <Input
            key={threshold}
            id="low-stock-threshold"
            name="threshold"
            inputMode="numeric"
            className="w-24 tabular-nums"
            defaultValue={threshold}
          />
        </div>
        <Button type="submit" variant="outline">
          Show
        </Button>
      </form>

      {!data && <LoadState query={lowStock} />}
      {data?.meta.total === 0 && (
        <p className="text-sm text-muted-foreground">Nothing on sale is this low.</p>
      )}
      {data && data.meta.total > 0 && (
        <>
          <ul aria-label="Low stock" className="-mx-4">
            {data.data.map((variant) => {
              const options = optionsLabel(variant);
              return (
                <li key={variant.variantId} className="border-t">
                  <Link
                    to={`/products/${variant.productId}`}
                    className="flex min-h-11 items-center gap-3 px-4 py-2 text-sm outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{variant.productName}</span>
                      {options && (
                        <span className="block truncate text-muted-foreground">{options}</span>
                      )}
                    </span>
                    <span className="font-medium tabular-nums">
                      {variant.stock === 0 ? 'Out of stock' : `${variant.stock} left`}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={onPageChange}
              loading={lowStock.isPlaceholderData}
            />
          )}
        </>
      )}
    </ActionCard>
  );
}
