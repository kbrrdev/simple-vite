import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { PriceInput } from '@/components/PriceInput';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, errorMessage } from '@/lib/api';
import { useCan } from '@/lib/auth';
import { parsePesos } from '@/lib/money';
import {
  useAddVariant,
  useUpdateVariant,
  type Product,
  type ProductVariant,
  type VariantChanges,
} from './api';
import { centsToText, parseStock, variantLabel } from './variants';

interface Props {
  product: Product;
  /** The variant to edit. Leave it out to add one. */
  variant?: ProductVariant;
  onClose: () => void;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  );
}

export function VariantDialog({ product, variant, onClose }: Props) {
  const [values, setValues] = useState([variant?.option1Value ?? '', variant?.option2Value ?? '']);
  const [price, setPrice] = useState(variant ? centsToText(variant.priceCents) : '');
  const [stock, setStock] = useState(variant ? String(variant.stock) : '0');
  const [assetId, setAssetId] = useState(variant?.assetId ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const add = useAddVariant();
  const update = useUpdateVariant();
  const save = variant ? update : add;
  // Roles with inventory.manage alone edit only the stock, which the backend allows on its own.
  const canManage = useCan('products.manage');
  const stockOnly = Boolean(variant) && !canManage;

  const options = [product.option1Name, product.option2Name]
    .map((name, index) => ({
      name,
      index,
      field: index === 0 ? ('option1Value' as const) : ('option2Value' as const),
    }))
    .filter((option): option is typeof option & { name: string } => Boolean(option.name));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const found: Record<string, string> = {};
    for (const option of options) {
      if (!values[option.index].trim()) found[option.field] = `Enter a ${option.name} value.`;
    }
    const priceCents = parsePesos(price);
    if (priceCents === null) found.priceCents = 'Enter a price, such as 199.99.';
    const stockCount = parseStock(stock);
    if (stockCount === null) found.stock = 'Enter the stock as a whole number, such as 10.';
    setErrors(found);
    if (priceCents === null || stockCount === null || Object.keys(found).length > 0) return;

    const optionValues = Object.fromEntries(
      options.map((option) => [option.field, values[option.index].trim()]),
    );

    if (!variant) {
      add.mutate(
        {
          productId: product.id,
          body: { ...optionValues, priceCents, stock: stockCount, active: true },
        },
        {
          onSuccess: () => {
            toast.success('Variant added');
            onClose();
          },
        },
      );
      return;
    }

    // Only what changed is sent, so that a save cannot undo someone else's stock change.
    const changes: VariantChanges = {};
    for (const option of options) {
      if (optionValues[option.field] !== (variant[option.field] ?? '')) {
        changes[option.field] = optionValues[option.field];
      }
    }
    if (priceCents !== variant.priceCents) changes.priceCents = priceCents;
    if (stockCount !== variant.stock) changes.stock = stockCount;
    if ((assetId || null) !== variant.assetId) changes.assetId = assetId || null;

    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }

    update.mutate(
      { productId: product.id, variantId: variant.id, body: changes },
      {
        onSuccess: () => {
          toast.success('Variant saved');
          onClose();
        },
      },
    );
  }

  const apiError = save.error instanceof ApiError ? save.error : undefined;
  const detail = (field: string) =>
    errors[field] ?? apiError?.details.find((item) => item.field === field)?.message;
  // A duplicate combination is a 409, which belongs with the option values.
  const valuesError = apiError?.status === 409 ? apiError.message : undefined;
  const fields = ['option1Value', 'option2Value', 'priceCents', 'stock', 'assetId'];
  const otherError =
    save.error && !valuesError && !apiError?.details.some((item) => fields.includes(item.field));
  const describedBy = (field: string) => (detail(field) ? `variant-${field}-error` : undefined);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>
              {variant
                ? `${stockOnly ? 'Edit stock for' : 'Edit'} ${variantLabel(variant)}`
                : 'Add variant'}
            </DialogTitle>
            <DialogDescription>
              {stockOnly
                ? 'Shoppers see the new stock right away.'
                : variant
                  ? 'Changes apply to new orders only.'
                  : 'Shoppers can buy it right away.'}
            </DialogDescription>
          </DialogHeader>

          {!stockOnly && options.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {options.map((option) => (
                <div key={option.field} className="space-y-2">
                  <Label htmlFor={`variant-${option.field}`}>{option.name}</Label>
                  <Input
                    id={`variant-${option.field}`}
                    maxLength={100}
                    aria-invalid={Boolean(detail(option.field) || valuesError)}
                    aria-describedby={describedBy(option.field)}
                    value={values[option.index]}
                    onChange={(event) =>
                      setValues((current) =>
                        current.map((value, i) =>
                          i === option.index ? event.target.value : value,
                        ),
                      )
                    }
                  />
                  <FieldError id={`variant-${option.field}-error`} message={detail(option.field)} />
                </div>
              ))}
              {valuesError && (
                <p role="alert" className="text-sm text-destructive sm:col-span-2">
                  {valuesError}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {!stockOnly && (
              <div className="space-y-2">
                <Label htmlFor="variant-price">Price</Label>
                <PriceInput
                  id="variant-price"
                  aria-invalid={Boolean(detail('priceCents'))}
                  aria-describedby={describedBy('priceCents')}
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                />
                <FieldError id="variant-priceCents-error" message={detail('priceCents')} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="variant-stock">Stock</Label>
              <Input
                id="variant-stock"
                inputMode="numeric"
                className="tabular-nums"
                aria-invalid={Boolean(detail('stock'))}
                aria-describedby={describedBy('stock')}
                value={stock}
                onChange={(event) => setStock(event.target.value)}
              />
              <FieldError id="variant-stock-error" message={detail('stock')} />
            </div>
          </div>

          {/* A new variant gets its image afterwards, from Edit, to keep adding short. */}
          {variant && !stockOnly && product.images.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Image</legend>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                <label className="flex aspect-square cursor-pointer items-center justify-center rounded-md border text-center text-xs text-muted-foreground has-checked:ring-3 has-checked:ring-primary has-focus-visible:outline-3 has-focus-visible:outline-ring">
                  <input
                    type="radio"
                    name="variant-image"
                    className="sr-only"
                    checked={assetId === ''}
                    onChange={() => setAssetId('')}
                  />
                  No image
                </label>
                {product.images.map((image, index) => (
                  <label
                    key={image.id}
                    className="cursor-pointer rounded-md has-checked:ring-3 has-checked:ring-primary has-focus-visible:outline-3 has-focus-visible:outline-ring"
                  >
                    <input
                      type="radio"
                      name="variant-image"
                      className="sr-only"
                      checked={assetId === image.assetId}
                      onChange={() => setAssetId(image.assetId)}
                    />
                    <img
                      src={image.url}
                      alt={image.altText || `Image ${index + 1}`}
                      className="aspect-square w-full rounded-md bg-muted object-cover"
                    />
                  </label>
                ))}
              </div>
              <FieldError id="variant-assetId-error" message={detail('assetId')} />
            </fieldset>
          )}

          {otherError && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage(save.error)}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : variant ? 'Save' : 'Add variant'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
