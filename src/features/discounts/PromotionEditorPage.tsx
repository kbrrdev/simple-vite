import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
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
  useCreatePromotion,
  useDeleteDiscount,
  usePromotion,
  useUpdatePromotion,
  type CreatePromotionBody,
  type Promotion,
  type PromotionChanges,
} from './api';
import { CategoryPicker } from './CategoryPicker';
import { ProductPicker } from './ProductPicker';
import { promotionRow, statusBadges } from './rows';

const formId = 'promotion';
const maxBundleProducts = 10;
type PromotionType = Promotion['type'];

interface Draft {
  name: string;
  type: PromotionType;
  buyQuantity: string;
  getQuantity: string;
  getPercentOff: string;
  discountType: 'percent' | 'fixed';
  /** Percent as a whole number, or pesos such as "50.00". */
  value: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  productIds: string[];
  categoryIds: string[];
}

const whole = (n: number | null) => (n === null ? '' : String(n));
const wholeNumber = (text: string) => (/^\d+$/.test(text.trim()) ? Number(text.trim()) : null);

function draftOf(promotion?: Promotion, type: PromotionType = 'buy_x_get_y'): Draft {
  const discountType = promotion?.discountType ?? 'percent';
  return {
    name: promotion?.name ?? '',
    type: promotion?.type ?? type,
    buyQuantity: promotion ? whole(promotion.buyQuantity) : '2',
    getQuantity: promotion ? whole(promotion.getQuantity) : '1',
    getPercentOff: promotion ? whole(promotion.getPercentOff) : '100',
    discountType,
    value:
      promotion?.discountValue == null
        ? ''
        : discountType === 'percent'
          ? String(promotion.discountValue)
          : centsToText(promotion.discountValue),
    isActive: promotion?.isActive ?? true,
    startsAt: toLocalInput(promotion?.startsAt ?? null),
    endsAt: toLocalInput(promotion?.endsAt ?? null),
    productIds: promotion?.productIds ?? [],
    categoryIds: promotion?.categoryIds ?? [],
  };
}

/** Checks the draft before sending, as hints. The backend decides, and its errors show too. */
function validate(draft: Draft) {
  const errors: Record<string, string> = {};
  if (!draft.name.trim()) errors.name = 'Enter a name.';

  if (draft.type === 'buy_x_get_y') {
    for (const field of ['buyQuantity', 'getQuantity'] as const) {
      const n = wholeNumber(draft[field]);
      if (n === null || n < 1 || n > 100) errors[field] = 'Enter a whole number from 1 to 100.';
    }
    const percent = wholeNumber(draft.getPercentOff);
    if (percent === null || percent < 1 || percent > 100) {
      errors.getPercentOff = 'Enter a whole percent from 1 to 100.';
    }
    if (draft.productIds.length === 0 && draft.categoryIds.length === 0) {
      errors.appliesTo = 'Choose at least one product or category.';
    }
  } else {
    if (draft.productIds.length < 2 || draft.productIds.length > maxBundleProducts) {
      errors.productIds = `Choose 2 to ${maxBundleProducts} products for the bundle.`;
    }
    if (draft.discountType === 'percent') {
      const percent = wholeNumber(draft.value);
      if (percent === null || percent < 1 || percent > 100) {
        errors.discountValue = 'Enter a whole percent from 1 to 100.';
      }
    } else if (!(parsePesos(draft.value) ?? 0)) {
      errors.discountValue = 'Enter an amount, such as 50.00.';
    }
  }

  if (draft.startsAt && draft.endsAt && draft.endsAt <= draft.startsAt) {
    errors.endsAt = 'End after the start.';
  }
  return errors;
}

/** The body for the draft's type. The other type's fields are null, as the backend expects. */
function toBody(draft: Draft): CreatePromotionBody {
  const common = {
    name: draft.name.trim(),
    type: draft.type,
    isActive: draft.isActive,
    startsAt: fromLocalInput(draft.startsAt),
    endsAt: fromLocalInput(draft.endsAt),
  };
  if (draft.type === 'buy_x_get_y') {
    return {
      ...common,
      buyQuantity: wholeNumber(draft.buyQuantity),
      getQuantity: wholeNumber(draft.getQuantity),
      getPercentOff: wholeNumber(draft.getPercentOff),
      discountType: null,
      discountValue: null,
      productIds: draft.productIds,
      categoryIds: draft.categoryIds,
    };
  }
  return {
    ...common,
    buyQuantity: null,
    getQuantity: null,
    getPercentOff: null,
    discountType: draft.discountType,
    discountValue:
      draft.discountType === 'percent' ? wholeNumber(draft.value) : parsePesos(draft.value),
    productIds: draft.productIds,
    // A bundle is products only.
    categoryIds: [],
  };
}

// The fields that make up the offer itself, which the backend checks together.
const offerFields = [
  'type',
  'buyQuantity',
  'getQuantity',
  'getPercentOff',
  'discountType',
  'discountValue',
  'productIds',
  'categoryIds',
] as const;

function same(a: unknown, b: unknown) {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item) => b.includes(item));
  }
  return a === b;
}

/** Only what changed. If any part of the offer changed, the whole offer goes, to stay consistent. */
function changesFrom(draft: Draft, promotion: Promotion): PromotionChanges {
  const body = toBody(draft);
  const saved = toBody(draftOf(promotion));
  const changes: PromotionChanges = {};
  for (const key of ['name', 'isActive', 'startsAt', 'endsAt'] as const) {
    if (body[key] !== saved[key]) Object.assign(changes, { [key]: body[key] });
  }
  if (offerFields.some((key) => !same(body[key], saved[key]))) {
    for (const key of offerFields) Object.assign(changes, { [key]: body[key] });
  }
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

/** A small whole-number field with its label and error. */
function NumberField({
  id,
  label,
  value,
  onChange,
  error,
  suffix,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  suffix?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          inputMode="numeric"
          className={cn('tabular-nums', suffix && 'pr-7')}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        {suffix && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-muted-foreground"
          >
            {suffix}
          </span>
        )}
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

/**
 * A buy X get Y or bundle promotion in the record page layout: the offer and what it covers on
 * the left, and its status and dates on the right, saved through the save bar.
 */
function PromotionEditor({
  promotion,
  type,
  onDiscard,
}: {
  promotion?: Promotion;
  type?: PromotionType;
  onDiscard: () => void;
}) {
  const [draft, setDraft] = useState(() => draftOf(promotion, type));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const create = useCreatePromotion();
  const update = useUpdatePromotion();
  const remove = useDeleteDiscount();
  const save = promotion ? update : create;
  const navigate = useNavigate();
  const history = useHistoryItem('promotion', promotion?.id);

  const changes = promotion ? changesFrom(draft, promotion) : undefined;
  const dirty = promotion
    ? Object.keys(changes ?? {}).length > 0
    : JSON.stringify(draft) !== JSON.stringify(draftOf(undefined, type));
  const leaveGuard = useLeaveGuard(dirty, 'Your changes to this promotion will be lost.');

  function set(change: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...change }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    if (!promotion) {
      create.mutate(toBody(draft), {
        onSuccess: ({ data }) => {
          toast.success('Promotion created');
          leaveGuard.allowLeave();
          navigate(`/discounts/promotions/${data.id}`, { replace: true });
        },
      });
      return;
    }
    if (!changes || Object.keys(changes).length === 0) {
      toast.info('No changes to save.');
      return;
    }
    update.mutate(
      { id: promotion.id, body: changes },
      { onSuccess: () => toast.success('Promotion saved') },
    );
  }

  const apiError = save.error instanceof ApiError ? save.error : undefined;
  const fieldError = (field: string) =>
    errors[field] ?? apiError?.details.find((item) => item.field === field)?.message;
  const shown = [
    'name',
    'buyQuantity',
    'getQuantity',
    'getPercentOff',
    'discountValue',
    'productIds',
    'categoryIds',
    'endsAt',
  ];
  const otherError = save.error && !apiError?.details.some((item) => shown.includes(item.field));

  const menu: MoreMenuItem[] = [...history];
  if (promotion) {
    menu.push({
      key: 'delete',
      label: 'Delete',
      destructive: true,
      onSelect: () => setConfirmingDelete(true),
    });
  }
  const status = promotion && statusBadges[scheduleStatus(promotion)];
  const bundle = draft.type === 'bundle';

  return (
    // Room at the end for the save bar, so it never covers the last card.
    <div className={cn('mx-auto max-w-6xl space-y-6', dirty && 'pb-24')}>
      <RecordHeader
        back={{ to: '/discounts', label: 'Back to discounts' }}
        title={promotion ? promotion.name : bundle ? 'New bundle' : 'New buy X get Y'}
        badges={status && <Badge variant={status.variant}>{status.label}</Badge>}
        menu={menu}
        facts={promotion && `${promotionRow(promotion).type} · ${promotionRow(promotion).summary}`}
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
              <Label htmlFor="promotion-name">Name</Label>
              <Input
                id="promotion-name"
                maxLength={100}
                placeholder={bundle ? 'Gift set' : 'Buy 2 socks, get 1 free'}
                aria-invalid={Boolean(fieldError('name'))}
                aria-describedby={`promotion-name-hint${fieldError('name') ? ' promotion-name-error' : ''}`}
                value={draft.name}
                onChange={(event) => set({ name: event.target.value })}
              />
              <p id="promotion-name-hint" className="text-xs text-muted-foreground">
                Shoppers see it on the items it discounts, and on their order.
              </p>
              <FieldError id="promotion-name-error" message={fieldError('name')} />
            </div>
            <div role="radiogroup" aria-label="Type" className="flex flex-wrap gap-x-6 gap-y-1">
              {(
                [
                  ['buy_x_get_y', 'Buy X get Y'],
                  ['bundle', 'Bundle'],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="flex min-h-11 items-center gap-2 text-sm md:min-h-8">
                  <input
                    type="radio"
                    name="promotion-type"
                    className="size-5 accent-primary"
                    checked={draft.type === value}
                    onChange={() => set({ type: value })}
                  />
                  {label}
                </label>
              ))}
            </div>
          </section>

          {bundle ? (
            <section aria-labelledby="promotion-bundle" className="space-y-4 rounded-lg border p-4">
              <div className="space-y-1">
                <h2 id="promotion-bundle" className="font-medium">
                  Bundle
                </h2>
                <p className="text-sm text-muted-foreground">
                  A set is one of each product, priced at its cheapest variant. The discount comes
                  off each complete set in the cart.
                </p>
              </div>
              <ProductPicker
                legend="Products"
                value={draft.productIds}
                onChange={(productIds) => set({ productIds })}
                error={fieldError('productIds')}
                max={maxBundleProducts}
              />
              <div
                role="radiogroup"
                aria-label="Bundle discount"
                className="flex flex-wrap gap-x-6 gap-y-1"
              >
                {(
                  [
                    ['percent', 'Percentage'],
                    ['fixed', 'Fixed amount'],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className="flex min-h-11 items-center gap-2 text-sm md:min-h-8"
                  >
                    <input
                      type="radio"
                      name="promotion-discount-type"
                      className="size-5 accent-primary"
                      checked={draft.discountType === value}
                      onChange={() => set({ discountType: value, value: '' })}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div className="max-w-48">
                {draft.discountType === 'percent' ? (
                  <NumberField
                    id="promotion-value"
                    label="Percent off each set"
                    value={draft.value}
                    onChange={(value) => set({ value })}
                    error={fieldError('discountValue')}
                    suffix="%"
                  />
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="promotion-value">Amount off each set</Label>
                    <PriceInput
                      id="promotion-value"
                      aria-invalid={Boolean(fieldError('discountValue'))}
                      aria-describedby={
                        fieldError('discountValue') ? 'promotion-value-error' : undefined
                      }
                      value={draft.value}
                      onChange={(event) => set({ value: event.target.value })}
                    />
                    <FieldError id="promotion-value-error" message={fieldError('discountValue')} />
                  </div>
                )}
              </div>
            </section>
          ) : (
            <>
              <section
                aria-labelledby="promotion-offer"
                className="space-y-4 rounded-lg border p-4"
              >
                <div className="space-y-1">
                  <h2 id="promotion-offer" className="font-medium">
                    Offer
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    In each set, the cheapest units in the cart are the ones discounted.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <NumberField
                    id="promotion-buy"
                    label="Customer buys"
                    value={draft.buyQuantity}
                    onChange={(buyQuantity) => set({ buyQuantity })}
                    error={fieldError('buyQuantity')}
                  />
                  <NumberField
                    id="promotion-get"
                    label="Customer gets"
                    value={draft.getQuantity}
                    onChange={(getQuantity) => set({ getQuantity })}
                    error={fieldError('getQuantity')}
                  />
                  <NumberField
                    id="promotion-percent"
                    label="At percent off"
                    value={draft.getPercentOff}
                    onChange={(getPercentOff) => set({ getPercentOff })}
                    error={fieldError('getPercentOff')}
                    suffix="%"
                  />
                </div>
                <p className="text-xs text-muted-foreground">100% off makes them free.</p>
              </section>

              <section
                aria-labelledby="promotion-applies"
                className="space-y-4 rounded-lg border p-4"
              >
                <h2 id="promotion-applies" className="font-medium">
                  Applies to
                </h2>
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
            </>
          )}

          <p className="text-sm text-muted-foreground">
            Items on sale are left out, and each item gets at most one promotion, the largest first.
          </p>

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
                  [true, 'On', 'Works within its dates.'],
                  [false, 'Off', 'Carts are priced without it.'],
                ] as const
              ).map(([isActive, label, hint]) => (
                <label
                  key={label}
                  className="flex min-h-11 items-start gap-3 py-1 text-sm md:min-h-8"
                >
                  <input
                    type="radio"
                    name="promotion-status"
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
                <Label htmlFor={`promotion-${field}`}>{label}</Label>
                <Input
                  id={`promotion-${field}`}
                  type="datetime-local"
                  aria-invalid={Boolean(fieldError(field))}
                  aria-describedby={fieldError(field) ? `promotion-${field}-error` : undefined}
                  value={value}
                  onChange={(event) => set({ [field]: event.target.value })}
                />
                <FieldError id={`promotion-${field}-error`} message={fieldError(field)} />
              </div>
            ))}
          </PanelSection>
        </SidePanel>
      </form>

      {dirty && <SaveBar formId={formId} saving={save.isPending} onDiscard={onDiscard} />}

      {confirmingDelete && promotion && (
        <ConfirmDialog
          title="Delete promotion"
          description={`Delete ${promotion.name} for good? Orders already placed keep their discount. To stop it but keep it, turn it off instead.`}
          actionLabel="Delete"
          destructive
          pending={remove.isPending}
          error={remove.error}
          onConfirm={() =>
            remove.mutate(
              { kind: 'promotions', id: promotion.id },
              {
                onSuccess: () => {
                  toast.success('Promotion deleted');
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

/** Discard starts over from the saved promotion, or an empty one. */
function useRound() {
  const [round, setRound] = useState(0);
  return [round, () => setRound((current) => current + 1)] as const;
}

/** A new promotion. The Create discount menu starts a bundle with `?type=bundle`. */
export function NewPromotionPage() {
  const [searchParams] = useSearchParams();
  const [round, restart] = useRound();
  const type: PromotionType = searchParams.get('type') === 'bundle' ? 'bundle' : 'buy_x_get_y';
  return <PromotionEditor key={`${type}-${round}`} type={type} onDiscard={restart} />;
}

export function PromotionEditorPage() {
  const { id = '' } = useParams();
  const promotion = usePromotion(id);
  const [round, restart] = useRound();

  if (promotion.isPending) return <DetailSkeleton />;

  if (promotion.isError) {
    const notFound = promotion.error instanceof ApiError && promotion.error.status === 404;
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild className="-ml-2">
          <Link to="/discounts">Back to discounts</Link>
        </Button>
        <h1 className="text-2xl font-semibold">{notFound ? 'Promotion not found' : 'Promotion'}</h1>
        {notFound ? (
          <p className="text-muted-foreground">
            This promotion does not exist, or its link is wrong.
          </p>
        ) : (
          <>
            <p role="alert">{errorMessage(promotion.error)}</p>
            <Button variant="outline" onClick={() => promotion.refetch()}>
              Try again
            </Button>
          </>
        )}
      </div>
    );
  }

  // Keyed by when it was saved, so the form shows the saved promotion after each change.
  const data = promotion.data.data;
  return (
    <PromotionEditor key={`${data.updatedAt}-${round}`} promotion={data} onDiscard={restart} />
  );
}
