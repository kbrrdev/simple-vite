import { useState } from 'react';
import { MoreHorizontalIcon } from 'lucide-react';
import { toast } from 'sonner';
import { ActionCard } from '@/components/ActionCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { errorMessage } from '@/lib/api';
import { formatCents } from '@/lib/money';
import { useSetVariantActive, type Product, type ProductVariant } from './api';
import { VariantDialog } from './VariantDialog';
import { variantLabel } from './variants';

export function VariantsCard({ product }: { product: Product }) {
  const [editing, setEditing] = useState<ProductVariant | 'new' | null>(null);
  const [deactivating, setDeactivating] = useState<ProductVariant | null>(null);
  const setActive = useSetVariantActive();

  function turnOn(variant: ProductVariant) {
    setActive.mutate(
      { productId: product.id, variantId: variant.id, active: true },
      {
        onSuccess: () => toast.success(`${variantLabel(variant)} is on sale again`),
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  }

  return (
    <ActionCard
      title={`Variants (${product.variants.length})`}
      actions={<Button onClick={() => setEditing('new')}>Add variant</Button>}
    >
      <ul aria-label="Variants" className="-m-4">
        {product.variants.map((variant, index) => {
          const label = variantLabel(variant);
          const image = product.images.find((item) => item.assetId === variant.assetId);

          return (
            <li
              key={variant.id}
              className={`flex items-center gap-3 px-4 py-3 text-sm ${index > 0 ? 'border-t' : ''}`}
            >
              {image ? (
                <img
                  src={image.url}
                  alt=""
                  loading="lazy"
                  className="size-10 shrink-0 rounded-md bg-muted object-cover"
                />
              ) : (
                <div className="size-10 shrink-0 rounded-md bg-muted" />
              )}
              <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-3">
                <p className="flex min-w-0 items-center gap-2 font-medium sm:flex-1">
                  <span className="truncate">{label}</span>
                  {!variant.active && <Badge variant="secondary">Inactive</Badge>}
                </p>
                <p className="text-muted-foreground tabular-nums sm:w-24 sm:text-right">
                  {variant.stock} in stock
                </p>
                <p className="font-medium tabular-nums sm:w-24 sm:text-right">
                  {formatCents(variant.priceCents)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                aria-label={`Edit ${label}`}
                onClick={() => setEditing(variant)}
              >
                Edit
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${label}`}>
                    <MoreHorizontalIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-44">
                  {variant.active ? (
                    <DropdownMenuItem
                      variant="destructive"
                      className="min-h-11 md:min-h-8"
                      onSelect={() => setDeactivating(variant)}
                    >
                      Deactivate
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      className="min-h-11 md:min-h-8"
                      onSelect={() => turnOn(variant)}
                    >
                      Turn on
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          );
        })}
      </ul>

      {editing && (
        <VariantDialog
          product={product}
          variant={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}

      {deactivating && (
        <ConfirmDialog
          title="Deactivate variant"
          description={`${variantLabel(deactivating)} leaves the store. Past orders keep it, and you can turn it back on later.`}
          actionLabel="Deactivate"
          destructive
          pending={setActive.isPending}
          error={setActive.error}
          onConfirm={() =>
            setActive.mutate(
              { productId: product.id, variantId: deactivating.id, active: false },
              {
                onSuccess: () => {
                  toast.success('Variant deactivated');
                  setDeactivating(null);
                },
              },
            )
          }
          onClose={() => {
            setActive.reset();
            setDeactivating(null);
          }}
        />
      )}
    </ActionCard>
  );
}
