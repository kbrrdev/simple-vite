import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CategorySelect } from '@/features/categories/CategorySelect';

export interface ProductFieldValues {
  name: string;
  categoryId: string;
  description: string;
  active: boolean;
}

interface Props {
  values: ProductFieldValues;
  onChange: (change: Partial<ProductFieldValues>) => void;
  /** Messages keyed by field name. */
  errors: Record<string, string | undefined>;
  /** The product page shows the category in its side panel instead. */
  withCategory?: boolean;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  );
}

/** The category picker, with its label and error. */
export function CategoryField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (categoryId: string) => void;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="product-categoryId">Category</Label>
      <CategorySelect
        id="product-categoryId"
        emptyLabel="Choose a category"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'product-categoryId-error' : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <FieldError id="product-categoryId-error" message={error} />
    </div>
  );
}

/** Name, category, and description. */
export function ProductFields({ values, onChange, errors, withCategory = true }: Props) {
  const describedBy = (field: string) => (errors[field] ? `product-${field}-error` : undefined);

  return (
    <div className="grid gap-4">
      <div className="space-y-2">
        <Label htmlFor="product-name">Name</Label>
        <Input
          id="product-name"
          maxLength={255}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={describedBy('name')}
          value={values.name}
          onChange={(event) => onChange({ name: event.target.value })}
        />
        <FieldError id="product-name-error" message={errors.name} />
      </div>

      {withCategory && (
        <CategoryField
          value={values.categoryId}
          onChange={(categoryId) => onChange({ categoryId })}
          error={errors.categoryId}
        />
      )}

      <div className="space-y-2">
        <Label htmlFor="product-description">Description</Label>
        <textarea
          id="product-description"
          rows={5}
          maxLength={10000}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={describedBy('description')}
          value={values.description}
          onChange={(event) => onChange({ description: event.target.value })}
          className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring aria-invalid:border-destructive md:text-sm dark:bg-input/30"
        />
        <FieldError id="product-description-error" message={errors.description} />
      </div>
    </div>
  );
}
