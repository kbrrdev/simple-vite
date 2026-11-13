import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { cn } from 'cn';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DetailSkeleton } from '@/components/Loading';
import type { MoreMenuItem } from '@/components/MoreMenu';
import { PriceInput } from '@/components/PriceInput';
import { RecordHeader } from '@/components/RecordHeader';
import { SaveBar } from '@/components/SaveBar';
import { PanelSection, SidePanel } from '@/components/SidePanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, errorMessage } from '@/lib/api';
import { centsToText, parsePesos } from '@/lib/money';
import { fromLocalInput, scheduleStatus, toLocalInput } from '@/lib/schedule';
import { useLeaveGuard } from '@/lib/use-leave-guard';
import { useHistoryItem } from '@/features/audit-log/history';
import {
  useCreateSale,
  useDeleteDiscount,
  useSale,
  useUpdateSale,
  type CreateSaleBody,
  type Sale,
  type SaleChanges,
} from './api';
import { CategoryPicker } from './CategoryPicker';
import { ProductPicker } from './ProductPicker';
import { saleRow, statusBadges } from './rows';

const formId = 'sale';
const maxPercentOff = 90;
const maxStockCap = 1_000_000;

interface Draft {
  name: string;
  discountType: 'percent' | 'fixed';
  /** Percent as a whole number, or pesos such as "50.00". */
  value: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  capped: boolean;
  stockCap: string;
  productIds: string[];
  categoryIds: string[];
}

function draftOf(sale?: Sale): Draft {
  return {
    name: sale?.name ?? '',
    discountType: sale?.discountType ?? 'percent',
    value: sale
      ? sale.discountType === 'percent'
        ? String(sale.discountValue)
        : centsToText(sale.discountValue)
      : '',
    isActive: sale?.isActive ?? true,
    startsAt: toLocalInput(sale?.startsAt ?? null),
    endsAt: toLocalInput(sale?.endsAt ?? null),
    capped: sale ? sale.stockCap !== null : false,
    stockCap: sale?.stockCap ? String(sale.stockCap) : '',
    productIds: sale?.productIds ?? [],
    categoryIds: sale?.categoryIds ?? [],
  };
}

/** The value in what the backend stores: whole percent, or cents. Null when it is not valid. */
function discountValue(draft: Draft) {
  if (draft.discountType === 'fixed') return parsePesos(draft.value);
  return /^\d+$/.test(draft.value.trim()) ? Number(draft.value.trim()) : null;
}

/** Checks the draft before sending, as hints. The backend decides, and its errors show too. */
function validate(draft: Draft, soldCount: number) {
  const errors: Record<string, string> = {};
  const value = discountValue(draft);

  if (!draft.name.trim()) errors.name = 'Enter a name.';
  if (draft.discountType === 'percent' && (value === null || value < 1 || value > maxPercentOff)) {
    errors.discountValue = `Enter a whole percent from 1 to ${maxPercentOff}.`;
  }
  if (draft.discountType === 'fixed' && (value === null || value < 1)) {
    errors.discountValue = 'Enter an amount, such as 50.00.';
  }
  if (draft.productIds.length === 0 && draft.categoryIds.length === 0) {
    errors.appliesTo = 'Choose at least one product or category.';
  }
  if (draft.startsAt && draft.endsAt && draft.endsAt <= draft.startsAt) {
    errors.endsAt = 'End after the start.';
  }
  if (draft.capped) {
    const cap = /^\d+$/.test(draft.stockCap.trim()) ? Number(draft.stockCap.trim()) : 0;
    if (cap < 1 || cap > maxStockCap) {
      errors.stockCap = 'Enter how many units, from 1 to 1,000,000.';
    } else if (cap < soldCount) {
      errors.stockCap = `${soldCount} have already sold at this price, so the cap cannot be lower.`;
    }
  }
  return errors;
}

function toBody(draft: Draft): CreateSaleBody {
  return {
    name: draft.name.trim(),
    discountType: draft.discountType,
    discountValue: discountValue(draft) ?? 0,
    isActive: draft.isActive,
    startsAt: fromLocalInput(draft.startsAt),
    endsAt: fromLocalInput(draft.endsAt),
    stockCap: draft.capped ? Number(draft.stockCap.trim()) : null,
    productIds: draft.productIds,
    categoryIds: draft.categoryIds,
  };
}

function sameSet(a: string[], b: string[]) {
  return a.length === b.length && a.every((id) => b.includes(id));
}

/** Only the fields that differ from the saved sale. Dates compare as the field shows them. */
function changesFrom(draft: Draft, sale: Sale): SaleChanges {
  const saved = draftOf(sale);
  const body = toBody(draft);
  const changes: SaleChanges = {};
  if (draft.name.trim() !== sale.name) changes.name = body.name;
  if (draft.discountType !== saved.discountType || draft.value.trim() !== saved.value) {
    changes.discountType = body.discountType;
    changes.discountValue = body.discountValue;
  }
  if (draft.isActive !== sale.isActive) changes.isActive = draft.isActive;
  if (draft.startsAt !== saved.startsAt) changes.startsAt = body.startsAt;
  if (draft.endsAt !== saved.endsAt) changes.endsAt = body.endsAt;
  if (draft.capped !== saved.capped || (draft.capped && draft.stockCap.trim() !== saved.stockCap)) {
    changes.stockCap = body.stockCap;
  }
  if (!sameSet(draft.productIds, sale.productIds)) changes.productIds = draft.productIds;
  if (!sameSet(draft.categoryIds, sale.categoryIds)) changes.categoryIds = draft.categoryIds;
  return changes;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  );
}

/**
 * A sale in the record page layout: what it takes off and what it applies to on the left, and
 * its status, dates, and stock cap on the right, saved through the save bar.
 */
function SaleEditor({ sale, onDiscard }: { sale?: Sale; onDiscard: () => void }) {
  const [draft, setDraft] = useState(() => draftOf(sale));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const create = useCreateSale();
  const update = useUpdateSale();
  const remove = useDeleteDiscount();
  const save = sale ? update : create;
  const navigate = useNavigate();
  const history = useHistoryItem('sale', sale?.id);

  const changes = sale ? changesFrom(draft, sale) : undefined;
  const dirty = sale
    ? Object.keys(changes ?? {}).length > 0
    : JSON.stringify(draft) !== JSON.stringify(draftOf());
  const leaveGuard = useLeaveGuard(dirty, 'Your changes to this sale will be lost.');

  function set(change: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...change }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate(draft, sale?.soldCount ?? 0);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    if (!sale) {
      create.mutate(toBody(draft), {
        onSuccess: ({ data }) => {
          toast.success('Sale created');
          leaveGuard.allowLeave();
          navigate(`/discounts/sales/${data.id}`, { replace: true });
        },
      });
      return;
    }
    if (!changes || Object.keys(changes).length === 0) {
      toast.info('No changes to save.');
      return;
    }
    update.mutate({ id: sale.id, body: changes }, { onSuccess: () => toast.success('Sale saved') });
  }

  const apiError = save.error instanceof ApiError ? save.error : undefined;
  const fieldError = (field: string, ...backendFields: string[]) =>
    errors[field] ??
    apiError?.details.find((item) => [field, ...backendFields].includes(item.field))?.message;
  const shown = ['name', 'discountValue', 'productIds', 'categoryIds', 'endsAt', 'stockCap'];
  const otherError = save.error && !apiError?.details.some((item) => shown.includes(item.field));

  const menu: MoreMenuItem[] = [...history];
  if (sale) {
    menu.push({
      key: 'delete',
      label: 'Delete',
      destructive: true,
      onSelect: () => setConfirmingDelete(true),
    });
  }
  const status = sale && statusBadges[scheduleStatus(sale)];

  return (
    // Room at the end for the save bar, so it never covers the last card.
    <div className={cn('mx-auto max-w-6xl space-y-6', dirty && 'pb-24')}>
      <RecordHeader
        back={{ to: '/discounts', label: 'Back to discounts' }}
        title={sale ? sale.name : 'New sale'}
        badges={status && <Badge variant={status.variant}>{status.label}</Badge>}
        menu={menu}
        facts={sale && `${saleRow(sale).type} · ${saleRow(sale).summary}`}
      />

      <form
        id={formId}
        onSubmit={handleSubmit}
        noValidate
        className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start"
      >
        <div className="min-w-0 space-y-4">
          <section aria-label="Details" className="space-y-4 rounded-lg border p-4">
            <div className="space-y-2">
              <Label htmlFor="sale-name">Name</Label>
              <Input
                id="sale-name"
                maxLength={100}
                placeholder="Payday sale"
                aria-invalid={Boolean(fieldError('name'))}
                aria-describedby={fieldError('name') ? 'sale-name-error' : undefined}
                value={draft.name}
                onChange={(event) => set({ name: event.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                For staff. Shoppers see the lower price.
              </p>
              <FieldError id="sale-name-error" message={fieldError('name')} />
            </div>
          </section>

          <section aria-labelledby="sale-discount" className="space-y-4 rounded-lg border p-4">
            <h2 id="sale-discount" className="font-medium">
              Discount
            </h2>
            <div
              role="radiogroup"
              aria-label="Discount type"
              className="flex flex-wrap gap-x-6 gap-y-1"
            >
              {(
                [
                  ['percent', 'Percentage'],
                  ['fixed', 'Fixed amount'],
                ] as const
              ).map(([type, label]) => (
                <label key={type} className="flex min-h-11 items-center gap-2 text-sm md:min-h-8">
                  <input
                    type="radio"
                    name="sale-type"
                    className="size-5 accent-primary"
                    checked={draft.discountType === type}
                    onChange={() => set({ discountType: type, value: '' })}
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="max-w-48 space-y-2">
              <Label htmlFor="sale-value">
                {draft.discountType === 'percent' ? 'Percent off' : 'Amount off each item'}
              </Label>
              {draft.discountType === 'percent' ? (
                <div className="relative">
                  <Input
                    id="sale-value"
                    inputMode="numeric"
                    placeholder="20"
                    className="pr-7 tabular-nums"
                    aria-invalid={Boolean(fieldError('discountValue'))}
                    aria-describedby={fieldError('discountValue') ? 'sale-value-error' : undefined}
                    value={draft.value}
                    onChange={(event) => set({ value: event.target.value })}
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-muted-foreground"
                  >
                    %
                  </span>
                </div>
              ) : (
                <PriceInput
                  id="sale-value"
                  aria-invalid={Boolean(fieldError('discountValue'))}
                  aria-describedby={fieldError('discountValue') ? 'sale-value-error' : undefined}
                  value={draft.value}
                  onChange={(event) => set({ value: event.target.value })}
                />
              )}
              <FieldError id="sale-value-error" message={fieldError('discountValue')} />
            </div>
          </section>

          <section aria-labelledby="sale-applies" className="space-y-4 rounded-lg border p-4">
            <div className="space-y-1">
              <h2 id="sale-applies" className="font-medium">
                Applies to
              </h2>
              <p className="text-sm text-muted-foreground">
                Products, whole categories, or both. When a product is in more than one sale,
                shoppers get the lowest price.
              </p>
            </div>
            <ProductPicker
              legend="Products"
              value={draft.productIds}
              onChange={(productIds) => set({ productIds })}
              error={fieldError('productIds')}
            />
            <CategoryPicker
              value={draft.categoryIds}
              onChange={(categoryIds) => set({ categoryIds })}
              error={fieldError('categoryIds')}
            />
            {errors.appliesTo && (
              <p role="alert" className="text-sm text-destructive">
                {errors.appliesTo}
              </p>
            )}
          </section>

          {otherError && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage(save.error)}
            </p>
          )}
        </div>

        <SidePanel>
          <PanelSection title="Status">
            <div role="radiogroup" aria-label="Status" className="space-y-1">
              {(
                [
                  [true, 'On', 'Runs within its dates.'],
                  [false, 'Off', 'Prices stay normal.'],
                ] as const
              ).map(([isActive, label, hint]) => (
                <label
                  key={label}
                  className="flex min-h-11 items-start gap-3 py-1 text-sm md:min-h-8"
                >
                  <input
                    type="radio"
                    name="sale-status"
                    className="mt-0.5 size-5 shrink-0 accent-primary"
                    checked={draft.isActive === isActive}
                    onChange={() => set({ isActive })}
                  />
                  <span>
                    <span className="block font-medium">{label}</span>
                    <span className="block text-muted-foreground">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </PanelSection>

          <PanelSection title="Schedule">
            {(
              [
                ['startsAt', 'Starts', draft.startsAt],
                ['endsAt', 'Ends', draft.endsAt],
              ] as const
            ).map(([field, label, value]) => (
              <div key={field} className="space-y-2">
                <Label htmlFor={`sale-${field}`}>{label}</Label>
                <Input
                  id={`sale-${field}`}
                  type="datetime-local"
                  aria-invalid={Boolean(fieldError(field))}
                  aria-describedby={fieldError(field) ? `sale-${field}-error` : undefined}
                  value={value}
                  onChange={(event) => set({ [field]: event.target.value })}
                />
                <FieldError id={`sale-${field}-error`} message={fieldError(field)} />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Leave both empty to run it as long as it is on. A flash sale has short dates.
            </p>
          </PanelSection>

          <PanelSection title="Stock cap">
            <label className="flex min-h-11 items-start gap-3 text-sm md:min-h-8">
              <input
                type="checkbox"
                className="mt-0.5 size-5 shrink-0 accent-primary"
                checked={draft.capped}
                onChange={(event) => set({ capped: event.target.checked })}
              />
              Limit how many units sell at this price, across its products
            </label>
            {draft.capped && (
              <div className="space-y-2">
                <Label htmlFor="sale-stockCap">Units</Label>
                <Input
                  id="sale-stockCap"
                  inputMode="numeric"
                  placeholder="100"
                  className="tabular-nums"
                  aria-invalid={Boolean(fieldError('stockCap'))}
                  aria-describedby={fieldError('stockCap') ? 'sale-stockCap-error' : undefined}
                  value={draft.stockCap}
                  onChange={(event) => set({ stockCap: event.target.value })}
                />
                <FieldError id="sale-stockCap-error" message={fieldError('stockCap')} />
              </div>
            )}
            {sale?.stockCap && (
              <div className="space-y-1">
                <p className="text-sm tabular-nums">
                  {sale.soldCount} of {sale.stockCap} sold
                </p>
                <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${Math.min(100, (sale.soldCount / sale.stockCap) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Prices go back to normal once they are sold.
                </p>
              </div>
            )}
          </PanelSection>
        </SidePanel>
      </form>

      {dirty && <SaveBar formId={formId} saving={save.isPending} onDiscard={onDiscard} />}

      {confirmingDelete && sale && (
        <ConfirmDialog
          title="Delete sale"
          description={`Delete ${sale.name} for good? Orders already placed keep their prices. To stop it but keep it, turn it off instead.`}
          actionLabel="Delete"
          destructive
          pending={remove.isPending}
          error={remove.error}
          onConfirm={() =>
            remove.mutate(
              { kind: 'sales', id: sale.id },
              {
                onSuccess: () => {
                  toast.success('Sale deleted');
                  leaveGuard.allowLeave();
                  navigate('/discounts', { replace: true });
                },
              },
            )
          }
          onClose={() => {
            remove.reset();
            setConfirmingDelete(false);
          }}
        />
      )}

      {leaveGuard.dialog}
    </div>
  );
}

/** Discard starts over from the saved sale, or an empty one. */
function useRound() {
  const [round, setRound] = useState(0);
  return [round, () => setRound((current) => current + 1)] as const;
}

export function NewSalePage() {
  const [round, restart] = useRound();
  return <SaleEditor key={round} onDiscard={restart} />;
}

export function SaleEditorPage() {
  const { id = '' } = useParams();
  const sale = useSale(id);
  const [round, restart] = useRound();

  if (sale.isPending) return <DetailSkeleton />;

  if (sale.isError) {
    const notFound = sale.error instanceof ApiError && sale.error.status === 404;
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild className="-ml-2">
          <Link to="/discounts">Back to discounts</Link>
        </Button>
        <h1 className="text-2xl font-semibold">{notFound ? 'Sale not found' : 'Sale'}</h1>
        {notFound ? (
          <p className="text-muted-foreground">This sale does not exist, or its link is wrong.</p>
        ) : (
          <>
            <p role="alert">{errorMessage(sale.error)}</p>
            <Button variant="outline" onClick={() => sale.refetch()}>
              Try again
            </Button>
          </>
        )}
      </div>
    );
  }

  // Keyed by when it was saved, so the form shows the saved sale after each change.
  const data = sale.data.data;
  return <SaleEditor key={`${data.updatedAt}-${round}`} sale={data} onDiscard={restart} />;
}
