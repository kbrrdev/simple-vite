import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { cn } from 'cn';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DetailSkeleton } from '@/components/Loading';
import { RecordHeader } from '@/components/RecordHeader';
import { SaveBar } from '@/components/SaveBar';
import { PanelSection, SidePanel } from '@/components/SidePanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, errorMessage } from '@/lib/api';
import { useCan } from '@/lib/auth';
import { useLeaveGuard } from '@/lib/use-leave-guard';
import { useHistoryItem } from '@/features/audit-log/history';
import {
  useProduct,
  useSetProductActive,
  useUpdateProduct,
  type Product,
  type UpdateProductBody,
} from './api';
import { ImagesCard } from './ImagesCard';
import { CategoryField, ProductFields } from './ProductFields';
import { VariantsCard } from './VariantsCard';

const formId = 'product-details';
const dateFormat = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' });

interface Draft {
  name: string;
  categoryId: string;
  description: string;
  optionNames: [string, string];
}

function draftOf(product: Product): Draft {
  return {
    name: product.name,
    categoryId: product.categoryId,
    description: product.description,
    optionNames: [product.option1Name ?? '', product.option2Name ?? ''],
  };
}

/** The fields that differ from the saved product, trimmed as the backend stores them. */
function changesFrom(draft: Draft, product: Product): UpdateProductBody {
  const changes: UpdateProductBody = {};
  if (draft.name.trim() !== product.name) changes.name = draft.name.trim();
  if (draft.categoryId !== product.categoryId) changes.categoryId = draft.categoryId;
  if (draft.description.trim() !== product.description) {
    changes.description = draft.description.trim();
  }
  // Options can only be renamed, so only the ones the product has can change.
  if (product.option1Name && draft.optionNames[0].trim() !== product.option1Name) {
    changes.option1Name = draft.optionNames[0].trim();
  }
  if (product.option2Name && draft.optionNames[1].trim() !== product.option2Name) {
    changes.option2Name = draft.optionNames[1].trim();
  }
  return changes;
}

/** Shopify's layout: details, images, and variants on the left, status and category on the right. */
function ProductEditor({ product }: { product: Product }) {
  const [draft, setDraft] = useState(() => draftOf(product));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);
  const update = useUpdateProduct();
  const setActive = useSetProductActive();
  const canManage = useCan('products.manage');
  const history = useHistoryItem('product', product.id);

  const changes = changesFrom(draft, product);
  const dirty = canManage && Object.keys(changes).length > 0;
  const leaveGuard = useLeaveGuard(dirty, 'Your changes to this product will be lost.');

  function set(change: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...change }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const found: Record<string, string> = {};
    if (!draft.name.trim()) found.name = 'Enter a name.';
    if (!draft.categoryId) found.categoryId = 'Choose a category.';
    if (product.option1Name && !draft.optionNames[0].trim()) found.option1Name = 'Enter a name.';
    if (product.option2Name && !draft.optionNames[1].trim()) found.option2Name = 'Enter a name.';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    if (Object.keys(changes).length === 0) {
      toast.info('No changes to save.');
      return;
    }
    // Only what changed is sent, so a save cannot undo a change made meanwhile elsewhere.
    update.mutate(
      { id: product.id, body: changes },
      { onSuccess: () => toast.success('Product saved') },
    );
  }

  function discard() {
    setDraft(draftOf(product));
    setErrors({});
    update.reset();
  }

  function turnOn() {
    setActive.mutate(
      { id: product.id, active: true },
      {
        onSuccess: () => toast.success('Product is on sale again'),
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  }

  const apiError = update.error instanceof ApiError ? update.error : undefined;
  const detail = (field: string) => apiError?.details.find((item) => item.field === field)?.message;
  const shown = ['name', 'categoryId', 'description', 'option1Name', 'option2Name'];
  const otherError = update.error && !apiError?.details.some((item) => shown.includes(item.field));

  const optionFields = [product.option1Name, product.option2Name]
    .map((name, index) => ({ name, index, field: `option${index + 1}Name` }))
    .filter((option) => option.name);
  const variants = product.variants.length;

  return (
    // Room at the end for the save bar, so it never covers the last card.
    <div className={cn('mx-auto max-w-6xl space-y-6', dirty && 'pb-24')}>
      <RecordHeader
        back={{ to: '/products', label: 'Back to products' }}
        title={product.name}
        badges={!product.active && <Badge variant="secondary">Inactive</Badge>}
        menu={history}
        facts={`${variants} ${variants === 1 ? 'variant' : 'variants'} · Updated ${dateFormat.format(new Date(product.updatedAt))}`}
      />

      {/* One column on phones: details, the panel, images, then variants. From lg the panel
          moves to the right, and the last row takes any extra height. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_auto_auto_1fr]">
        <section
          aria-labelledby="details-heading"
          className="min-w-0 space-y-4 rounded-lg border p-4 lg:col-start-1"
        >
          <h2 id="details-heading" className="font-medium">
            Details
          </h2>
          {/* Without products.manage the details can be read, but not changed. */}
          <form id={formId} onSubmit={handleSubmit} noValidate>
            <fieldset disabled={!canManage} className="grid min-w-0 gap-4">
              <ProductFields
                values={{ ...draft, active: product.active }}
                onChange={(change) => set(change)}
                errors={{
                  name: errors.name ?? detail('name'),
                  description: detail('description'),
                }}
                withCategory={false}
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
                          value={draft.optionNames[index]}
                          onChange={(event) => {
                            const optionNames: [string, string] = [...draft.optionNames];
                            optionNames[index] = event.target.value;
                            set({ optionNames });
                          }}
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
        </section>

        <div className="min-w-0 lg:col-start-2 lg:row-span-4 lg:row-start-1">
          <SidePanel>
            <PanelSection title="Status">
              {product.active ? (
                <Badge variant="success">On sale</Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
              <p className="text-sm text-muted-foreground">
                {product.active
                  ? 'Shoppers can find and buy it.'
                  : 'Hidden from the store. Past orders keep it.'}
              </p>
              {canManage &&
                (product.active ? (
                  <Button variant="outline" onClick={() => setConfirmingDeactivate(true)}>
                    Deactivate
                  </Button>
                ) : (
                  <Button variant="outline" disabled={setActive.isPending} onClick={turnOn}>
                    Turn on
                  </Button>
                ))}
            </PanelSection>

            <PanelSection title="Organization">
              <fieldset disabled={!canManage} className="min-w-0">
                <CategoryField
                  value={draft.categoryId}
                  onChange={(categoryId) => set({ categoryId })}
                  error={errors.categoryId ?? detail('categoryId')}
                />
              </fieldset>
            </PanelSection>
          </SidePanel>
        </div>

        <div className="min-w-0 lg:col-start-1">
          <ImagesCard product={product} />
        </div>
        <div className="min-w-0 lg:col-start-1">
          <VariantsCard product={product} />
        </div>
      </div>

      {dirty && <SaveBar formId={formId} saving={update.isPending} onDiscard={discard} />}

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

      {leaveGuard.dialog}
    </div>
  );
}

export function ProductPage() {
  const { id = '' } = useParams();
  const product = useProduct(id);

  if (product.isPending) {
    return <DetailSkeleton />;
  }

  if (product.isError) {
    const notFound = product.error instanceof ApiError && product.error.status === 404;
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild className="-ml-2">
          <Link to="/products">Back to products</Link>
        </Button>
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

  // Keyed by id, not by when it was saved, so that turning it off or changing a variant keeps
  // unsaved edits. After a save, the edits match the saved product and the bar goes away.
  return <ProductEditor key={product.data.data.id} product={product.data.data} />;
}
