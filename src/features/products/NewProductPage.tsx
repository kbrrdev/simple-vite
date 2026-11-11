import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ApiError, errorMessage } from '@/lib/api';
import { parsePesos } from '@/lib/money';
import { useCreateProduct, type CreateProductBody } from './api';
import { ProductFields, type ProductFieldValues } from './ProductFields';
import { useVariantBuilder, type VariantBuilderState } from './use-variant-builder';
import { VariantBuilder } from './VariantBuilder';
import { maxVariants, parseStock } from './variants';

/** Checks the form before sending. The backend still decides, and its errors are shown too. */
function validate(fields: ProductFieldValues, builder: VariantBuilderState) {
  const errors: Record<string, string> = {};
  const [option1, option2] = builder.options;

  if (!fields.name.trim()) errors.name = 'Enter a name.';
  if (!fields.categoryId) errors.categoryId = 'Choose a category.';

  if (option1.name.trim() && option1.values.length === 0) {
    errors.option1 = `Add at least one ${option1.name.trim()} value.`;
  } else if (!option1.name.trim() && option1.values.length > 0) {
    errors.option1 = 'Name this option, such as Size.';
  }
  if (option2.name.trim() || option2.values.length > 0) {
    if (!option1.name.trim()) errors.option2 = 'Fill in Option 1 first.';
    else if (!option2.name.trim()) errors.option2 = 'Name this option, such as Color.';
    else if (option2.values.length === 0) {
      errors.option2 = `Add at least one ${option2.name.trim()} value.`;
    }
  }

  if (builder.rows.length === 0) errors.variants = 'Keep at least one variant.';
  if (builder.rows.length > maxVariants) {
    errors.variants = `A product can have up to ${maxVariants} variants.`;
  }

  for (const row of builder.rows) {
    if (parsePesos(row.price) === null) {
      errors[row.key] = 'Enter a price, such as 199.99.';
    } else if (parseStock(row.stock) === null) {
      errors[row.key] = 'Enter the stock as a whole number, such as 10.';
    }
  }

  return errors;
}

function toBody(fields: ProductFieldValues, builder: VariantBuilderState): CreateProductBody {
  const [option1, option2] = builder.options;
  const hasOption1 = option1.values.length > 0;
  const hasOption2 = hasOption1 && option2.values.length > 0;

  return {
    name: fields.name.trim(),
    categoryId: fields.categoryId,
    description: fields.description.trim(),
    active: fields.active,
    ...(hasOption1 && { option1Name: option1.name.trim() }),
    ...(hasOption2 && { option2Name: option2.name.trim() }),
    variants: builder.rows.map((row) => ({
      ...(row.option1Value && { option1Value: row.option1Value }),
      ...(row.option2Value && { option2Value: row.option2Value }),
      // Validated above, so these are numbers.
      priceCents: parsePesos(row.price) ?? 0,
      stock: parseStock(row.stock) ?? 0,
      active: true,
    })),
  };
}

export function NewProductPage() {
  const [fields, setFields] = useState<ProductFieldValues>({
    name: '',
    categoryId: '',
    description: '',
    active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const builder = useVariantBuilder();
  const create = useCreateProduct();
  const navigate = useNavigate();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const found = validate(fields, builder);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    create.mutate(toBody(fields, builder), {
      onSuccess: ({ data }) => {
        toast.success('Product created. Add its images next.');
        navigate(`/products/${data.id}`);
      },
    });
  }

  // Backend errors for the main fields go next to them; the rest are listed together.
  const apiError = create.error instanceof ApiError ? create.error : undefined;
  const fieldNames = ['name', 'categoryId', 'description'];
  const apiFieldErrors = Object.fromEntries(
    (apiError?.details ?? [])
      .filter((detail) => fieldNames.includes(detail.field))
      .map((detail) => [detail.field, detail.message]),
  );
  const otherDetails = (apiError?.details ?? []).filter(
    (detail) => !fieldNames.includes(detail.field),
  );
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <form onSubmit={handleSubmit} noValidate className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <Button variant="ghost" asChild className="-ml-2">
          <Link to="/products">Back to products</Link>
        </Button>
        <h1 className="text-2xl font-semibold">New product</h1>
      </div>

      <section aria-labelledby="details-heading" className="space-y-4 rounded-lg border p-4">
        <h2 id="details-heading" className="font-medium">
          Details
        </h2>
        <ProductFields
          values={fields}
          onChange={(change) => setFields((current) => ({ ...current, ...change }))}
          errors={{ ...apiFieldErrors, ...errors }}
          showActive
        />
      </section>

      <section aria-labelledby="variants-heading" className="space-y-4 rounded-lg border p-4">
        <h2 id="variants-heading" className="font-medium">
          Options and variants
        </h2>
        <VariantBuilder builder={builder} errors={errors} />
      </section>

      {hasErrors && (
        <p role="alert" className="text-sm text-destructive">
          Fix the highlighted fields, then save again.
        </p>
      )}
      {create.error && !hasErrors && (
        <div role="alert" className="space-y-1 text-sm text-destructive">
          <p>{errorMessage(create.error)}</p>
          {otherDetails.length > 0 && (
            <ul className="list-disc pl-5">
              {otherDetails.map((detail) => (
                <li key={`${detail.field}-${detail.message}`}>{detail.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" asChild>
          <Link to="/products">Cancel</Link>
        </Button>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? 'Creating…' : 'Create product'}
        </Button>
      </div>
    </form>
  );
}
