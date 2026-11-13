import { useState } from 'react';
import { MoreHorizontalIcon, PercentIcon, SearchIcon } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { ListSkeleton } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { ViewTabs } from '@/components/ViewTabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { errorMessage } from '@/lib/api';
import type { ScheduleStatus } from '@/lib/schedule';
import {
  useCoupons,
  useDeleteDiscount,
  usePromotions,
  useSales,
  useSetDiscountActive,
} from './api';
import { couponRow, promotionRow, saleRow, type DiscountRow } from './rows';

const statusBadges: Record<
  ScheduleStatus,
  { label: string; variant: 'success' | 'info' | 'secondary' }
> = {
  live: { label: 'Active', variant: 'success' },
  scheduled: { label: 'Scheduled', variant: 'info' },
  ended: { label: 'Expired', variant: 'secondary' },
  off: { label: 'Off', variant: 'secondary' },
};

// Each tab shows one status. Off discounts show under All only, as in Shopify.
const views: { label: string; status?: ScheduleStatus; param?: string }[] = [
  { label: 'All' },
  { label: 'Active', status: 'live', param: 'active' },
  { label: 'Scheduled', status: 'scheduled', param: 'scheduled' },
  { label: 'Expired', status: 'ended', param: 'expired' },
];

type Confirming = { row: DiscountRow; action: 'turn-off' | 'delete' };

/**
 * Sales, coupons, and promotions in one list, after Shopify's Discounts. The backend keeps them
 * apart, so the page reads all three and merges them, newest first.
 */
export function DiscountsPage() {
  const [searchParams] = useSearchParams();
  const [confirming, setConfirming] = useState<Confirming | null>(null);
  const sales = useSales();
  const coupons = useCoupons();
  const promotions = usePromotions();
  const setActive = useSetDiscountActive();
  const remove = useDeleteDiscount();

  const view = views.find((item) => item.param === searchParams.get('status')) ?? views[0];
  const queries = [sales, coupons, promotions];
  const failed = queries.find((query) => query.isError);
  const loaded = sales.data && coupons.data && promotions.data;

  const rows = loaded
    ? [
        ...sales.data.data.map(saleRow),
        ...coupons.data.data.map(couponRow),
        ...promotions.data.data.map(promotionRow),
      ].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [];
  const shown = view.status ? rows.filter((row) => row.status === view.status) : rows;

  function turnOn(row: DiscountRow) {
    setActive.mutate(
      { kind: row.kind, id: row.id, isActive: true },
      {
        onSuccess: () => toast.success(`${row.title} is on`),
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  }

  const turningOff = confirming?.action === 'turn-off';
  const pending = turningOff ? setActive : remove;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discounts"
        description="Sales, coupons, and promotions. When more than one applies, shoppers get the lowest total."
      />

      <ViewTabs
        label="Discount views"
        tabs={views.map((item) => ({
          label: item.label,
          to: item.param ? `?status=${item.param}` : '?',
          selected: item === view,
        }))}
      />

      {!loaded && !failed && <ListSkeleton rows={4} />}

      {failed && (
        <div className="space-y-4">
          <p role="alert">{errorMessage(failed.error)}</p>
          <Button
            variant="outline"
            onClick={() =>
              queries.filter((query) => query.isError).forEach((query) => query.refetch())
            }
          >
            Try again
          </Button>
        </div>
      )}

      {loaded &&
        shown.length === 0 &&
        (view.status ? (
          <EmptyState icon={SearchIcon} title={`No ${view.label.toLowerCase()} discounts`}>
            Discounts show here by their dates and whether they are on.
          </EmptyState>
        ) : (
          <EmptyState icon={PercentIcon} title="No discounts yet">
            Sales, coupons, and promotions show here once they are made.
          </EmptyState>
        ))}

      {shown.length > 0 && (
        <ul aria-label="Discounts" className="overflow-hidden rounded-lg border">
          {shown.map((row, index) => {
            const status = statusBadges[row.status];
            return (
              <li
                key={`${row.kind}-${row.id}`}
                className={`flex items-center gap-3 px-4 py-3 ${index > 0 ? 'border-t' : ''}`}
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">{row.title}</span>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {row.type} · {row.summary}
                  </p>
                  {row.usage && (
                    <p className="text-xs text-muted-foreground tabular-nums">{row.usage}</p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`More actions for ${row.title}`}
                    >
                      <MoreHorizontalIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-44">
                    {row.isActive ? (
                      <DropdownMenuItem
                        className="min-h-11 md:min-h-8"
                        onSelect={() => setConfirming({ row, action: 'turn-off' })}
                      >
                        Turn off
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        className="min-h-11 md:min-h-8"
                        onSelect={() => turnOn(row)}
                      >
                        Turn on
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      variant="destructive"
                      className="min-h-11 md:min-h-8"
                      onSelect={() => setConfirming({ row, action: 'delete' })}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>
      )}

      {confirming && (
        <ConfirmDialog
          title={turningOff ? 'Turn off discount' : 'Delete discount'}
          description={
            turningOff
              ? `Shoppers stop getting ${confirming.row.title}. Orders already placed keep it, and you can turn it back on.`
              : `Delete ${confirming.row.title} for good? A coupon that orders used cannot be deleted, only turned off.`
          }
          actionLabel={turningOff ? 'Turn off' : 'Delete'}
          destructive
          pending={pending.isPending}
          error={pending.error}
          onConfirm={() => {
            const done = (message: string) => {
              toast.success(message);
              setConfirming(null);
            };
            const target = { kind: confirming.row.kind, id: confirming.row.id };
            if (turningOff) {
              setActive.mutate(
                { ...target, isActive: false },
                { onSuccess: () => done('Discount turned off') },
              );
            } else {
              remove.mutate(target, { onSuccess: () => done('Discount deleted') });
            }
          }}
          onClose={() => {
            pending.reset();
            setConfirming(null);
          }}
        />
      )}
    </div>
  );
}
