import { useState } from 'react';
import { ChevronDownIcon, MoreHorizontalIcon, PercentIcon, SearchIcon } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { IndexCard, IndexError, IndexList, type IndexColumn } from '@/components/IndexCard';
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
import { couponRow, promotionRow, saleRow, statusBadges, type DiscountRow } from './rows';

// Every kind of discount, each opening its editor.
const createOptions = [
  {
    label: 'Sale',
    hint: 'Lower prices on products or categories, for a while or a number of units',
    to: '/discounts/sales/new',
  },
  {
    label: 'Coupon code',
    hint: 'Money or percent off an order for shoppers who type a code',
    to: '/discounts/coupons/new',
  },
  {
    label: 'Automatic discount',
    hint: 'Applies without a code when the cart qualifies',
    to: '/discounts/coupons/new?automatic=1',
  },
  {
    label: 'Free shipping',
    hint: 'Waives shipping, with a code or automatically',
    to: '/discounts/coupons/new?type=free_shipping',
  },
  {
    label: 'Buy X get Y',
    hint: 'Units free or cheaper when shoppers buy enough',
    to: '/discounts/promotions/new',
  },
  {
    label: 'Bundle',
    hint: 'Money or percent off when products are bought together',
    to: '/discounts/promotions/new?type=bundle',
  },
];

// Each tab shows one status. Off discounts show under All only, as in Shopify.
const views: { label: string; status?: ScheduleStatus; param?: string }[] = [
  { label: 'All' },
  { label: 'Active', status: 'live', param: 'active' },
  { label: 'Scheduled', status: 'scheduled', param: 'scheduled' },
  { label: 'Expired', status: 'ended', param: 'expired' },
];

// The widths match the rows' below, so the headings sit over their values. The last is the menu.
const columns: IndexColumn[] = [
  { label: 'Discount', className: 'md:flex-1' },
  { label: 'Status', className: 'md:w-28' },
  { label: 'Used', className: 'md:w-48' },
  { label: '', className: 'md:w-8' },
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
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                Create discount
                <ChevronDownIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              {createOptions.map((option) => (
                <DropdownMenuItem
                  key={option.to}
                  asChild
                  className="min-h-11 flex-col items-start gap-0 md:min-h-8"
                >
                  <Link to={option.to}>
                    {option.label}
                    <span className="text-xs text-muted-foreground">{option.hint}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <IndexCard
        tabs={
          <ViewTabs
            label="Discount views"
            tabs={views.map((item) => ({
              label: item.label,
              to: item.param ? `?status=${item.param}` : '?',
              selected: item === view,
            }))}
          />
        }
        columns={shown.length > 0 ? columns : undefined}
      >
        {!loaded && !failed && <ListSkeleton bare rows={4} />}

        {failed && (
          <IndexError
            error={failed.error}
            onRetry={() =>
              queries.filter((query) => query.isError).forEach((query) => query.refetch())
            }
          />
        )}

        {loaded &&
          shown.length === 0 &&
          (view.status ? (
            <EmptyState bare icon={SearchIcon} title={`No ${view.label.toLowerCase()} discounts`}>
              Discounts show here by their dates and whether they are on.
            </EmptyState>
          ) : (
            <EmptyState bare icon={PercentIcon} title="No discounts yet">
              Sales, coupons, and promotions show here once they are made.
            </EmptyState>
          ))}

        {shown.length > 0 && (
          <IndexList label="Discounts">
            {shown.map((row) => {
              const status = statusBadges[row.status];
              return (
                <li
                  key={`${row.kind}-${row.id}`}
                  className="flex items-center gap-3 px-4 py-3 md:gap-4"
                >
                  <div className="min-w-0 flex-1 space-y-1 md:flex md:items-center md:gap-4 md:space-y-0">
                    <div className="min-w-0 space-y-0.5 md:flex-1">
                      <Link
                        to={row.href}
                        className="block truncate font-medium underline-offset-3 hover:underline focus-visible:underline"
                      >
                        {row.title}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {row.type} · {row.summary}
                      </p>
                    </div>
                    {/* One line under the summary on phones, and two columns from md up. */}
                    <div className="flex flex-wrap items-center gap-2 md:contents">
                      <span className="md:w-28">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums md:w-48 md:text-sm">
                        {row.usage}
                      </span>
                    </div>
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
          </IndexList>
        )}
      </IndexCard>

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
