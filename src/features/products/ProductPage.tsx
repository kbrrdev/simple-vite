import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { ActionCard } from '@/components/ActionCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DetailSkeleton } from '@/components/Loading';
import type { MoreMenuItem } from '@/components/MoreMenu';
import { RecordHeader } from '@/components/RecordHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, errorMessage } from '@/lib/api';
import { useCan } from '@/lib/auth';
import { useHistoryItem } from '@/features/audit-log/history';
import {
  useProduct,
  useSetProductActive,
  useUpdateProduct,
  type Product,
  type UpdateProductBody,
} from './api';
import { ImagesCard } from './ImagesCard';
import { ProductFields, type ProductFieldValues } from './ProductFields';
import { VariantsCard } from './VariantsCard';

const detailsFormId = 'product-details';
const dateFormat = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' });

function DetailsCard({ product }: { product: Product }) {
  const [fields, setFields] = useState<ProductFieldValues>({
    name: product.name,
    categoryId: product.categoryId,
    description: product.description,
    active: product.active,
  });
  const [optionNames, setOptionNames] = useState([
    product.option1Name ?? '',
    product.option2Name ?? '',
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const update = useUpdateProduct();
  const canManage = useCan('products.manage');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const found: Record<string, string> = {};
    if (!fields.name.trim()) found.name = 'Enter a name.';
    if (!fields.categoryId) found.categoryId = 'Choose a category.';
    if (product.option1Name && !optionNames[0].trim()) found.option1Name = 'Enter a name.';
    if (product.option2Name && !optionNames[1].trim()) found.option2Name = 'Enter a name.';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const body: UpdateProductBody = {
      name: fields.name.trim(),
      categoryId: fields.categoryId,
      description: fields.description.trim(),
      // Options can only be renamed, so only the ones the product has are sent.
      ...(product.option1Name && { option1Name: optionNames[0].trim() }),
      ...(product.option2Name && { option2Name: optionNames[1].trim() }),
    };
    update.mutate({ id: product.id, body }, { onSuccess: () => toast.success('Product saved') });
  }

  const apiError = update.error instanceof ApiError ? update.error : undefined;
  const detail = (field: string) => apiError?.details.find((item) => item.field === field)?.message;
  const shown = ['name', 'categoryId', 'description', 'option1Name', 'option2Name'];
  const otherError = update.error && !apiError?.details.some((item) => shown.includes(item.field));
  const allErrors = {
    name: errors.name ?? detail('name'),
    categoryId: errors.categoryId ?? detail('categoryId'),
    description: detail('description'),
  };

  const optionFields = [product.option1Name, product.option2Name]
    .map((name, index) => ({ name, index, field: `option${index + 1}Name` }))
    .filter((option) => option.name);

  return (
    <ActionCard
      title="Details"
      actions={
        canManage && (
          <Button type="submit" form={detailsFormId} disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        )
      }
    >
      {/* Without products.manage the details can be read, but not changed. */}
      <form id={detailsFormId} onSubmit={handleSubmit} noValidate>
        <fieldset disabled={!canManage} className="grid min-w-0 gap-4">
          <ProductFields
            values={fields}
            onChange={(change) => setFields((current) => ({ ...current, ...change }))}
            errors={allErrors}
          />

          {optionFields.length > 0 && (
            <fieldset className="grid gap-4 md:grid-cols-2">
              <legend className="mb-2 text-sm font-medium">Option names</legend>
              {optionFields.map(({ index, field }) => {
                const error = errors[field] ?? detail(field);
                return (
                  <div key={field} className="space-y-2">
                    <Label htmlFor={`product-${field}`}>Option {index + 1}</Label>
                    <Input
                      id={`product-${field}`}
                      maxLength={50}
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? `product-${field}-error` : undefined}
                      value={optionNames[index]}
                      onChange={(event) =>
                        setOptionNames((current) =>
                          current.map((name, i) => (i === index ? event.target.value : name)),
                        )
                      }
                    />
                    {error && (
                      <p id={`product-${field}-error`} className="text-sm text-destructive">
                        {error}
                      </p>
                    )}
                  </div>
                );
              })}
              <p className="text-sm text-muted-foreground md:col-span-2">
                Options can be renamed, but not added or removed.
              </p>
            </fieldset>
          )}

          {otherError && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage(update.error)}
            </p>
          )}
        </fieldset>
      </form>
    </ActionCard>
  );
}

/** The header, with Deactivate or Turn on and History in its More menu, then the cards. */
function ProductDetails({ product }: { product: Product }) {
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);
  const setActive = useSetProductActive();
  const canManage = useCan('products.manage');
  const history = useHistoryItem('product', product.id);

  function turnOn() {
    setActive.mutate(
      { id: product.id, active: true },
      {
        onSuccess: () => toast.success('Product is on sale again'),
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  }

  const menu: MoreMenuItem[] = [...history];
  if (canManage) {
    menu.push(
      product.active
        ? {
            key: 'deactivate',
            label: 'Deactivate',
            destructive: true,
            onSelect: () => setConfirmingDeactivate(true),
          }
        : { key: 'turn-on', label: 'Turn on', disabled: setActive.isPending, onSelect: turnOn },
    );
  }
  const variants = product.variants.length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <RecordHeader
        back={{ to: '/products', label: 'Back to products' }}
        title={product.name}
        badges={!product.active && <Badge variant="secondary">Inactive</Badge>}
        menu={menu}
        facts={`${variants} ${variants === 1 ? 'variant' : 'variants'} · Updated ${dateFormat.format(new Date(product.updatedAt))}`}
      />

      {/* Keyed by updatedAt, so that the form shows the saved values after each change. */}
      <DetailsCard key={product.updatedAt} product={product} />
      <VariantsCard product={product} />
      <ImagesCard product={product} />

      {confirmingDeactivate && (
        <ConfirmDialog
          title="Deactivate product"
          description={`“${product.name}” leaves the store. Past orders keep it, and you can turn it back on later.`}
          actionLabel="Deactivate"
          destructive
          pending={setActive.isPending}
          error={setActive.error}
          onConfirm={() =>
            setActive.mutate(
              { id: product.id, active: false },
              {
                onSuccess: () => {
                  toast.success('Product deactivated');
                  setConfirmingDeactivate(false);
                },
              },
            )
          }
          onClose={() => {
            setActive.reset();
            setConfirmingDeactivate(false);
          }}
        />
      )}
    </div>
  );
}

export function ProductPage() {
  const { id = '' } = useParams();
  const product = useProduct(id);

  const back = (
    <Button variant="ghost" asChild className="-ml-2">
      <Link to="/products">Back to products</Link>
    </Button>
  );

  if (product.isPending) {
    return <DetailSkeleton />;
  }

  if (product.isError) {
    const notFound = product.error instanceof ApiError && product.error.status === 404;
    return (
      <div className="space-y-4">
        {back}
        <h1 className="text-2xl font-semibold">{notFound ? 'Product not found' : 'Product'}</h1>
        {notFound ? (
          <p className="text-muted-foreground">
            This product does not exist, or its link is wrong.
          </p>
        ) : (
          <>
            <p role="alert">{errorMessage(product.error)}</p>
            <Button variant="outline" onClick={() => product.refetch()}>
              Try again
            </Button>
          </>
        )}
      </div>
    );
  }

  return <ProductDetails product={product.data.data} />;
}
