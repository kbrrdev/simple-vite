import { useState, type KeyboardEvent } from 'react';
import { XIcon } from 'lucide-react';
import { PriceInput } from '@/components/PriceInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { VariantBuilderState } from './use-variant-builder';
import { maxVariants, variantLabel } from './variants';

function OptionValues({
  id,
  name,
  values,
  onChange,
}: {
  id: string;
  name: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [draft, setDraft] = useState('');

  function add() {
    const value = draft.trim();
    if (value && !values.includes(value)) onChange([...values, value]);
    setDraft('');
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      add();
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{name ? `${name} values` : 'Values'}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          maxLength={100}
          enterKeyHint="done"
          placeholder="Type a value, then press Enter"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button type="button" variant="outline" onClick={add}>
          Add
        </Button>
      </div>
      {values.length > 0 && (
        <ul aria-label={`Added ${name || 'option'} values`} className="flex flex-wrap gap-2">
          {values.map((value) => (
            <li key={value}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                aria-label={`Remove ${value}`}
                onClick={() => onChange(values.filter((item) => item !== value))}
              >
                {value}
                <XIcon />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface Props {
  builder: VariantBuilderState;
  /** Messages keyed by "option1", "option2", "variants", or a row's key. */
  errors: Record<string, string>;
}

export function VariantBuilder({ builder, errors }: Props) {
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkStock, setBulkStock] = useState('');
  const { options, rows } = builder;
  const hasOptions = options[0].values.length > 0;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Options are choices such as Size or Color. They can be renamed later, but not added or
          removed.
        </p>
        {options.map((option, index) => {
          const number = index + 1;
          const error = errors[`option${number}`];

          return (
            <fieldset key={number} className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
              <legend className="px-1 text-sm font-medium">Option {number}</legend>
              <div className="space-y-2">
                <Label htmlFor={`option${number}-name`}>Option {number} name</Label>
                <Input
                  id={`option${number}-name`}
                  value={option.name}
                  maxLength={50}
                  placeholder={index === 0 ? 'Size' : 'Color'}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? `option${number}-error` : undefined}
                  onChange={(event) => builder.setOption(index, { name: event.target.value })}
                />
              </div>
              <OptionValues
                id={`option${number}-values`}
                name={option.name.trim()}
                values={option.values}
                onChange={(values) => builder.setOption(index, { values })}
              />
              {error && (
                <p id={`option${number}-error`} className="text-sm text-destructive md:col-span-2">
                  {error}
                </p>
              )}
            </fieldset>
          );
        })}
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-medium">
            Variants <span className="text-muted-foreground tabular-nums">({rows.length})</span>
          </h3>
          {builder.removedCount > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={builder.restoreRows}>
              Bring back {builder.removedCount} removed
            </Button>
          )}
        </div>

        {rows.length > 1 && (
          <div className="grid gap-2 rounded-lg bg-muted/50 p-4 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="bulk-price">Price for all</Label>
              <PriceInput
                id="bulk-price"
                value={bulkPrice}
                onChange={(event) => setBulkPrice(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-stock">Stock for all</Label>
              <Input
                id="bulk-stock"
                inputMode="numeric"
                className="tabular-nums"
                value={bulkStock}
                onChange={(event) => setBulkStock(event.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                builder.applyToAll({
                  ...(bulkPrice.trim() && { price: bulkPrice }),
                  ...(bulkStock.trim() && { stock: bulkStock }),
                })
              }
            >
              Apply to all
            </Button>
          </div>
        )}

        {rows.length > maxVariants && (
          <p role="alert" className="text-sm text-destructive">
            A product can have up to {maxVariants} variants. Remove some values or rows.
          </p>
        )}
        {errors.variants && (
          <p role="alert" className="text-sm text-destructive">
            {errors.variants}
          </p>
        )}

        <ul aria-label="Variants" className="overflow-hidden rounded-lg border">
          {rows.map((row, index) => {
            const label = hasOptions ? variantLabel(row) : 'Price and stock';
            const error = errors[row.key];

            return (
              <li
                key={row.key}
                className={`grid grid-cols-2 items-end gap-2 px-4 py-3 sm:grid-cols-[1fr_8rem_6rem_auto] ${index > 0 ? 'border-t' : ''}`}
              >
                <p className="col-span-2 self-center font-medium sm:col-span-1">{label}</p>
                <div className="space-y-1">
                  <Label htmlFor={`price-${index}`} className="sm:sr-only">
                    Price
                  </Label>
                  <PriceInput
                    id={`price-${index}`}
                    aria-label={`Price for ${label}`}
                    aria-invalid={Boolean(error)}
                    value={row.price}
                    onChange={(event) => builder.setRow(row.key, { price: event.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`stock-${index}`} className="sm:sr-only">
                    Stock
                  </Label>
                  <Input
                    id={`stock-${index}`}
                    aria-label={`Stock for ${label}`}
                    aria-invalid={Boolean(error)}
                    inputMode="numeric"
                    className="tabular-nums"
                    value={row.stock}
                    onChange={(event) => builder.setRow(row.key, { stock: event.target.value })}
                  />
                </div>
                {hasOptions && rows.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="col-span-2 sm:col-span-1"
                    aria-label={`Remove ${label}`}
                    onClick={() => builder.removeRow(row.key)}
                  >
                    Remove
                  </Button>
                )}
                {error && <p className="col-span-full text-sm text-destructive">{error}</p>}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
