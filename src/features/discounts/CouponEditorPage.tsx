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
import { centsToText, formatCents, parsePesos } from '@/lib/money';
import { fromLocalInput, scheduleStatus, toLocalInput } from '@/lib/schedule';
import { useLeaveGuard } from '@/lib/use-leave-guard';
import { useHistoryItem } from '@/features/audit-log/history';
import {
  useCoupon,
  useCreateCoupon,
  useDeleteDiscount,
  useUpdateCoupon,
  type Coupon,
  type CouponChanges,
  type CreateCouponBody,
} from './api';
import { couponRow, statusBadges } from './rows';

const formId = 'coupon';
type DiscountType = Coupon['discountType'];

interface Draft {
  code: string;
  discountType: DiscountType;
  /** Percent as a whole number, or pesos such as "100.00". Unused for free shipping. */
  value: string;
  maxDiscount: string;
  minSubtotal: string;
  isAutomatic: boolean;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  usageLimit: string;
  perCustomerLimit: string;
  allowSaleItems: boolean;
  allowGuests: boolean;
}

const pesos = (cents: number | null) => (cents === null ? '' : centsToText(cents));
const whole = (n: number | null) => (n === null ? '' : String(n));

function draftOf(coupon?: Coupon, start?: Partial<Draft>): Draft {
  if (!coupon) {
    return {
      code: '',
      discountType: 'percent',
      value: '',
      maxDiscount: '',
      minSubtotal: '',
      isAutomatic: false,
      isActive: true,
      startsAt: '',
      endsAt: '',
      usageLimit: '',
      // The backend's default: once per shopper for a code, and no limit when automatic.
      perCustomerLimit: start?.isAutomatic ? '' : '1',
      allowSaleItems: false,
      allowGuests: true,
      ...start,
    };
  }
  return {
    code: coupon.code,
    discountType: coupon.discountType,
    value:
      coupon.discountType === 'percent'
        ? whole(coupon.discountValue)
        : coupon.discountType === 'fixed'
          ? pesos(coupon.discountValue)
          : '',
    maxDiscount: pesos(coupon.maxDiscountCents),
    minSubtotal: pesos(coupon.minSubtotalCents),
    isAutomatic: coupon.isAutomatic,
    isActive: coupon.isActive,
    startsAt: toLocalInput(coupon.startsAt),
    endsAt: toLocalInput(coupon.endsAt),
    usageLimit: whole(coupon.usageLimit),
    perCustomerLimit: whole(coupon.perCustomerLimit),
    allowSaleItems: coupon.allowSaleItems,
    allowGuests: coupon.allowGuests,
  };
}

const wholeNumber = (text: string) => (/^\d+$/.test(text.trim()) ? Number(text.trim()) : null);

/** Checks the draft before sending, as hints. The backend decides, and its errors show too. */
function validate(draft: Draft) {
  const errors: Record<string, string> = {};
  if (!/^[A-Za-z0-9_-]{3,32}$/.test(draft.code.trim())) {
    errors.code = 'Use 3 to 32 letters, digits, - or _, such as WELCOME10.';
  }
  if (draft.discountType === 'percent') {
    const value = wholeNumber(draft.value);
    if (value === null || value < 1 || value > 100) {
      errors.discountValue = 'Enter a whole percent from 1 to 100.';
    }
  }
  if (draft.discountType === 'fixed' && !(parsePesos(draft.value) ?? 0)) {
    errors.discountValue = 'Enter an amount, such as 100.00.';
  }
  for (const [field, text] of [
    ['maxDiscountCents', draft.discountType === 'percent' ? draft.maxDiscount : ''],
    ['minSubtotalCents', draft.minSubtotal],
  ] as const) {
    if (text.trim() && !(parsePesos(text) ?? 0)) errors[field] = 'Enter an amount, such as 500.00.';
  }
  for (const [field, text] of [
    ['usageLimit', draft.usageLimit],
    ['perCustomerLimit', draft.perCustomerLimit],
  ] as const) {
    const n = wholeNumber(text);
    if (text.trim() && (n === null || n < 1 || n > 1_000_000)) {
      errors[field] = 'Enter a whole number from 1, or leave it empty for no limit.';
    }
  }
  if (draft.startsAt && draft.endsAt && draft.endsAt <= draft.startsAt) {
    errors.endsAt = 'End after the start.';
  }
  return errors;
}

function toBody(draft: Draft): CreateCouponBody {
  const optionalPesos = (text: string) => (text.trim() ? parsePesos(text) : null);
  const optionalWhole = (text: string) => (text.trim() ? wholeNumber(text) : null);
  return {
    code: draft.code.trim().toUpperCase(),
    discountType: draft.discountType,
    discountValue:
      draft.discountType === 'percent'
        ? wholeNumber(draft.value)
        : draft.discountType === 'fixed'
          ? parsePesos(draft.value)
          : null,
    // A cap only means something on a percentage.
    maxDiscountCents: draft.discountType === 'percent' ? optionalPesos(draft.maxDiscount) : null,
    minSubtotalCents: optionalPesos(draft.minSubtotal),
    isAutomatic: draft.isAutomatic,
    isActive: draft.isActive,
    startsAt: fromLocalInput(draft.startsAt),
    endsAt: fromLocalInput(draft.endsAt),
    usageLimit: optionalWhole(draft.usageLimit),
    perCustomerLimit: optionalWhole(draft.perCustomerLimit),
    allowSaleItems: draft.allowSaleItems,
    allowGuests: draft.allowGuests,
  };
}

/** Only the fields that differ from the saved coupon. */
function changesFrom(draft: Draft, coupon: Coupon): CouponChanges {
  const body = toBody(draft);
  const saved = toBody(draftOf(coupon));
  const changes: CouponChanges = {};
  for (const key of Object.keys(body) as (keyof CreateCouponBody)[]) {
    if (body[key] !== saved[key]) Object.assign(changes, { [key]: body[key] });
  }
  // The type and its value travel together, so the backend checks them as a pair.
  if ('discountType' in changes || 'discountValue' in changes) {
    changes.discountType = body.discountType;
    changes.discountValue = body.discountValue;
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

const typeOptions: [DiscountType, string][] = [
  ['percent', 'Percentage'],
  ['fixed', 'Fixed amount'],
  ['free_shipping', 'Free shipping'],
];

/**
 * A coupon in the record page layout: its code, discount, and requirements on the left, and how
 * it applies, its dates, limits, and use so far on the right. Automatic discounts and free
 * shipping are coupons too.
 */
function CouponEditor({
  coupon,
  start,
  onDiscard,
}: {
  coupon?: Coupon;
  start?: Partial<Draft>;
  onDiscard: () => void;
}) {
  const [draft, setDraft] = useState(() => draftOf(coupon, start));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const create = useCreateCoupon();
  const update = useUpdateCoupon();
  const remove = useDeleteDiscount();
  const save = coupon ? update : create;
  const navigate = useNavigate();
  const history = useHistoryItem('coupon', coupon?.id);

  const changes = coupon ? changesFrom(draft, coupon) : undefined;
  const dirty = coupon
    ? Object.keys(changes ?? {}).length > 0
    : JSON.stringify(draft) !== JSON.stringify(draftOf(undefined, start));
  const leaveGuard = useLeaveGuard(dirty, 'Your changes to this coupon will be lost.');

  function set(change: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...change }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    if (!coupon) {
      create.mutate(toBody(draft), {
        onSuccess: ({ data }) => {
          toast.success(draft.isAutomatic ? 'Automatic discount created' : 'Coupon created');
          leaveGuard.allowLeave();
          navigate(`/discounts/coupons/${data.id}`, { replace: true });
        },
      });
      return;
    }
    if (!changes || Object.keys(changes).length === 0) {
      toast.info('No changes to save.');
      return;
    }
    update.mutate(
      { id: coupon.id, body: changes },
      { onSuccess: () => toast.success('Coupon saved') },
    );
  }

  const apiError = save.error instanceof ApiError ? save.error : undefined;
  const fieldError = (field: string) =>
    errors[field] ??
    apiError?.details.find((item) => item.field === field)?.message ??
    // A taken code is a 409, which belongs with the code.
    (field === 'code' && apiError?.status === 409 ? apiError.message : undefined);
  const shown = [
    'code',
    'discountValue',
    'maxDiscountCents',
    'minSubtotalCents',
    'endsAt',
    'usageLimit',
    'perCustomerLimit',
  ];
  const otherError =
    save.error &&
    apiError?.status !== 409 &&
    !apiError?.details.some((item) => shown.includes(item.field));

  const menu: MoreMenuItem[] = [...history];
  if (coupon) {
    menu.push({
      key: 'delete',
      label: 'Delete',
      destructive: true,
      onSelect: () => setConfirmingDelete(true),
    });
  }
  const status = coupon && statusBadges[scheduleStatus(coupon)];
  const kind = draft.isAutomatic ? 'automatic discount' : 'coupon';

  return (
    // Room at the end for the save bar, so it never covers the last card.
    <div className={cn('mx-auto max-w-6xl space-y-6', dirty && 'pb-24')}>
      <RecordHeader
        back={{ to: '/discounts', label: 'Back to discounts' }}
        title={coupon ? coupon.code : draft.isAutomatic ? 'New automatic discount' : 'New coupon'}
        badges={status && <Badge variant={status.variant}>{status.label}</Badge>}
        menu={menu}
        facts={coupon && `${couponRow(coupon).type} · ${couponRow(coupon).summary}`}
      />

      <form
        id={formId}
        onSubmit={handleSubmit}
        noValidate
        className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start"
      >
        <div className="min-w-0 space-y-4">
          <section aria-label="Coupon code" className="space-y-2 rounded-lg border p-4">
            <Label htmlFor="coupon-code">Code</Label>
            <Input
              id="coupon-code"
              maxLength={32}
              autoComplete="off"
              placeholder="WELCOME10"
              className="font-medium tracking-wide uppercase"
              aria-invalid={Boolean(fieldError('code'))}
              aria-describedby={`coupon-code-hint${fieldError('code') ? ' coupon-code-error' : ''}`}
              value={draft.code}
              onChange={(event) => set({ code: event.target.value.toUpperCase() })}
            />
            <p id="coupon-code-hint" className="text-xs text-muted-foreground">
              {draft.isAutomatic
                ? 'Shoppers do not type it. It labels the discount in their cart.'
                : 'Shoppers type it at checkout, in any case.'}
            </p>
            <FieldError id="coupon-code-error" message={fieldError('code')} />
          </section>

          <section aria-labelledby="coupon-discount" className="space-y-4 rounded-lg border p-4">
            <h2 id="coupon-discount" className="font-medium">
              Discount
            </h2>
            <div
              role="radiogroup"
              aria-label="Discount type"
              className="flex flex-wrap gap-x-6 gap-y-1"
            >
              {typeOptions.map(([type, label]) => (
                <label key={type} className="flex min-h-11 items-center gap-2 text-sm md:min-h-8">
                  <input
                    type="radio"
                    name="coupon-type"
                    className="size-5 accent-primary"
                    checked={draft.discountType === type}
                    onChange={() => set({ discountType: type, value: '', maxDiscount: '' })}
                  />
                  {label}
                </label>
              ))}
            </div>

            {draft.discountType === 'free_shipping' ? (
              <p className="text-sm text-muted-foreground">Shipping is waived on the order.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="coupon-value">
                    {draft.discountType === 'percent' ? 'Percent off' : 'Amount off the order'}
                  </Label>
                  {draft.discountType === 'percent' ? (
                    <div className="relative">
                      <Input
                        id="coupon-value"
                        inputMode="numeric"
                        placeholder="10"
                        className="pr-7 tabular-nums"
                        aria-invalid={Boolean(fieldError('discountValue'))}
                        aria-describedby={
                          fieldError('discountValue') ? 'coupon-value-error' : undefined
                        }
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
                      id="coupon-value"
                      aria-invalid={Boolean(fieldError('discountValue'))}
                      aria-describedby={
                        fieldError('discountValue') ? 'coupon-value-error' : undefined
                      }
                      value={draft.value}
                      onChange={(event) => set({ value: event.target.value })}
                    />
                  )}
                  <FieldError id="coupon-value-error" message={fieldError('discountValue')} />
                </div>
                {draft.discountType === 'percent' && (
                  <div className="space-y-2">
                    <Label htmlFor="coupon-max">Most it takes off (optional)</Label>
                    <PriceInput
                      id="coupon-max"
                      aria-invalid={Boolean(fieldError('maxDiscountCents'))}
                      aria-describedby={
                        fieldError('maxDiscountCents') ? 'coupon-max-error' : undefined
                      }
                      value={draft.maxDiscount}
                      onChange={(event) => set({ maxDiscount: event.target.value })}
                    />
                    <FieldError id="coupon-max-error" message={fieldError('maxDiscountCents')} />
                  </div>
                )}
              </div>
            )}
          </section>

          <section
            aria-labelledby="coupon-requirements"
            className="space-y-4 rounded-lg border p-4"
          >
            <h2 id="coupon-requirements" className="font-medium">
              Requirements
            </h2>
            <div className="max-w-60 space-y-2">
              <Label htmlFor="coupon-min">Minimum spend (optional)</Label>
              <PriceInput
                id="coupon-min"
                aria-invalid={Boolean(fieldError('minSubtotalCents'))}
                aria-describedby={`coupon-min-hint${fieldError('minSubtotalCents') ? ' coupon-min-error' : ''}`}
                value={draft.minSubtotal}
                onChange={(event) => set({ minSubtotal: event.target.value })}
              />
              <p id="coupon-min-hint" className="text-xs text-muted-foreground">
                On the items the {kind} covers.
              </p>
              <FieldError id="coupon-min-error" message={fieldError('minSubtotalCents')} />
            </div>
            <label className="flex min-h-11 items-start gap-3 text-sm md:min-h-8">
              <input
                type="checkbox"
                className="mt-0.5 size-5 shrink-0 accent-primary"
                checked={draft.allowSaleItems}
                onChange={(event) => set({ allowSaleItems: event.target.checked })}
              />
              <span>
                Include items already on sale
                <span className="block text-muted-foreground">
                  Otherwise they are left out of the minimum and the discount.
                </span>
              </span>
            </label>
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
                  [true, 'On', 'Works within its dates.'],
                  [false, 'Off', 'Shoppers cannot use it.'],
                ] as const
              ).map(([isActive, label, hint]) => (
                <label
                  key={label}
                  className="flex min-h-11 items-start gap-3 py-1 text-sm md:min-h-8"
                >
                  <input
                    type="radio"
                    name="coupon-status"
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

          <PanelSection title="Method">
            <div role="radiogroup" aria-label="Method" className="space-y-1">
              {(
                [
                  [false, 'With a code', 'Shoppers type the code.'],
                  [true, 'Automatic', 'Applies when the cart qualifies, without a code.'],
                ] as const
              ).map(([isAutomatic, label, hint]) => (
                <label
                  key={label}
                  className="flex min-h-11 items-start gap-3 py-1 text-sm md:min-h-8"
                >
                  <input
                    type="radio"
                    name="coupon-method"
                    className="mt-0.5 size-5 shrink-0 accent-primary"
                    checked={draft.isAutomatic === isAutomatic}
                    onChange={() => set({ isAutomatic })}
                  />
                  <span>
                    <span className="block font-medium">{label}</span>
                    <span className="block text-muted-foreground">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Shoppers get whichever discount gives the lowest total.
            </p>
          </PanelSection>

          <PanelSection title="Schedule">
            {(
              [
                ['startsAt', 'Starts', draft.startsAt],
                ['endsAt', 'Ends', draft.endsAt],
              ] as const
            ).map(([field, label, value]) => (
              <div key={field} className="space-y-2">
                <Label htmlFor={`coupon-${field}`}>{label}</Label>
                <Input
                  id={`coupon-${field}`}
                  type="datetime-local"
                  aria-invalid={Boolean(fieldError(field))}
                  aria-describedby={fieldError(field) ? `coupon-${field}-error` : undefined}
                  value={value}
                  onChange={(event) => set({ [field]: event.target.value })}
                />
                <FieldError id={`coupon-${field}-error`} message={fieldError(field)} />
              </div>
            ))}
          </PanelSection>

          <PanelSection title="Limits">
            {(
              [
                ['usageLimit', 'Total uses', draft.usageLimit, 'Across all shoppers.'],
                [
                  'perCustomerLimit',
                  'Uses per shopper',
                  draft.perCustomerLimit,
                  'Guests are counted by email.',
                ],
              ] as const
            ).map(([field, label, value, hint]) => (
              <div key={field} className="space-y-2">
                <Label htmlFor={`coupon-${field}`}>{label}</Label>
                <Input
                  id={`coupon-${field}`}
                  inputMode="numeric"
                  placeholder="No limit"
                  className="tabular-nums"
                  aria-invalid={Boolean(fieldError(field))}
                  aria-describedby={`coupon-${field}-hint${fieldError(field) ? ` coupon-${field}-error` : ''}`}
                  value={value}
                  onChange={(event) => set({ [field]: event.target.value })}
                />
                <p id={`coupon-${field}-hint`} className="text-xs text-muted-foreground">
                  {hint}
                </p>
                <FieldError id={`coupon-${field}-error`} message={fieldError(field)} />
              </div>
            ))}
            <label className="flex min-h-11 items-center gap-3 text-sm md:min-h-8">
              <input
                type="checkbox"
                className="size-5 shrink-0 accent-primary"
                checked={draft.allowGuests}
                onChange={(event) => set({ allowGuests: event.target.checked })}
              />
              Guests can use it
            </label>
          </PanelSection>

          {coupon && (
            <PanelSection title="Usage">
              <p className="text-sm tabular-nums">
                {coupon.usedCount} {coupon.usedCount === 1 ? 'use' : 'uses'}
                {coupon.usageLimit !== null && ` of ${coupon.usageLimit}`}
              </p>
              <p className="text-sm text-muted-foreground tabular-nums">
                {formatCents(coupon.discountGivenCents)} given, including waived shipping
              </p>
            </PanelSection>
          )}
        </SidePanel>
      </form>

      {dirty && <SaveBar formId={formId} saving={save.isPending} onDiscard={onDiscard} />}

      {confirmingDelete && coupon && (
        <ConfirmDialog
          title="Delete coupon"
          description={`Delete ${coupon.code} for good? A coupon that orders used cannot be deleted, only turned off.`}
          actionLabel="Delete"
          destructive
          pending={remove.isPending}
          error={remove.error}
          onConfirm={() =>
            remove.mutate(
              { kind: 'coupons', id: coupon.id },
              {
                onSuccess: () => {
                  toast.success('Coupon deleted');
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

/** Discard starts over from the saved coupon, or an empty one. */
function useRound() {
  const [round, setRound] = useState(0);
  return [round, () => setRound((current) => current + 1)] as const;
}

/** A new coupon. The Create discount menu starts automatic discounts and free shipping here too. */
export function NewCouponPage() {
  const [searchParams] = useSearchParams();
  const [round, restart] = useRound();
  const start: Partial<Draft> = {
    ...(searchParams.get('automatic') === '1' && { isAutomatic: true, perCustomerLimit: '' }),
    ...(searchParams.get('type') === 'free_shipping' && { discountType: 'free_shipping' as const }),
  };
  return <CouponEditor key={round} start={start} onDiscard={restart} />;
}

export function CouponEditorPage() {
  const { id = '' } = useParams();
  const coupon = useCoupon(id);
  const [round, restart] = useRound();

  if (coupon.isPending) return <DetailSkeleton />;

  if (coupon.isError) {
    const notFound = coupon.error instanceof ApiError && coupon.error.status === 404;
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild className="-ml-2">
          <Link to="/discounts">Back to discounts</Link>
        </Button>
        <h1 className="text-2xl font-semibold">{notFound ? 'Coupon not found' : 'Coupon'}</h1>
        {notFound ? (
          <p className="text-muted-foreground">This coupon does not exist, or its link is wrong.</p>
        ) : (
          <>
            <p role="alert">{errorMessage(coupon.error)}</p>
            <Button variant="outline" onClick={() => coupon.refetch()}>
              Try again
            </Button>
          </>
        )}
      </div>
    );
  }

  // Keyed by when it was saved, so the form shows the saved coupon after each change.
  const data = coupon.data.data;
  return <CouponEditor key={`${data.updatedAt}-${round}`} coupon={data} onDiscard={restart} />;
}
