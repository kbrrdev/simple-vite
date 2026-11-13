import { useState } from 'react';
import { MoreHorizontalIcon } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ListSkeleton } from '@/components/Loading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { errorMessage } from '@/lib/api';
import {
  useBanners,
  useDeleteBanner,
  useReorderBanners,
  useUpdateBanner,
  type Banner,
} from './api';
import { BannerDialog } from './BannerDialog';
import { bannerStatus, type BannerStatus } from './banner-status';

const statusBadges: Record<
  BannerStatus,
  { label: string; variant: 'success' | 'info' | 'secondary' }
> = {
  live: { label: 'Live', variant: 'success' },
  scheduled: { label: 'Scheduled', variant: 'info' },
  ended: { label: 'Ended', variant: 'secondary' },
  off: { label: 'Off', variant: 'secondary' },
};

const dateFormat = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' });

function schedule(banner: Banner) {
  const from = banner.startsAt && dateFormat.format(new Date(banner.startsAt));
  const to = banner.endsAt && dateFormat.format(new Date(banner.endsAt));
  if (from && to) return `${from} to ${to}`;
  if (from) return `From ${from}`;
  if (to) return `Until ${to}`;
  return null;
}

type Confirming = { banner: Banner; action: 'turn-off' | 'delete' };

export function BannersPage() {
  const [editing, setEditing] = useState<Banner | 'new' | null>(null);
  const [confirming, setConfirming] = useState<Confirming | null>(null);
  const banners = useBanners();
  const update = useUpdateBanner();
  const remove = useDeleteBanner();
  const reorder = useReorderBanners();

  const list = banners.data?.data ?? [];
  const max = banners.data?.meta.maxBanners;
  // The backend counts inactive banners too, and its 409 stays the authority.
  const full = max !== undefined && list.length >= max;

  function turnOn(banner: Banner) {
    update.mutate(
      { id: banner.id, body: { isActive: true } },
      {
        onSuccess: () => toast.success('Banner turned on'),
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  }

  function move(index: number, step: -1 | 1) {
    const ordered = [...list];
    [ordered[index], ordered[index + step]] = [ordered[index + step], ordered[index]];
    reorder.mutate(ordered, { onError: (error) => toast.error(errorMessage(error)) });
  }

  const turningOff = confirming?.action === 'turn-off';
  const pending = turningOff ? update : remove;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Banners</h1>
          {max !== undefined && (
            <p className="text-sm text-muted-foreground tabular-nums">
              {list.length} of {max} banners
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button disabled={full} onClick={() => setEditing('new')}>
            New banner
          </Button>
          {full && <p className="text-sm text-muted-foreground">Delete a banner to add another.</p>}
        </div>
      </div>

      {banners.isPending && <ListSkeleton rows={3} media />}

      {banners.isError && (
        <div className="space-y-4">
          <p role="alert">{errorMessage(banners.error)}</p>
          <Button variant="outline" onClick={() => banners.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {banners.data && list.length === 0 && (
        <p className="text-muted-foreground">
          No banners yet. Add one to show an image at the top of the store.
        </p>
      )}

      {list.length > 0 && (
        <ul aria-label="Banners" className="overflow-hidden rounded-lg border">
          {list.map((banner, index) => {
            const name = banner.title ?? banner.altText;
            const status = statusBadges[bannerStatus(banner)];
            const when = schedule(banner);
            return (
              <li
                key={banner.id}
                className={`flex items-center gap-3 px-4 py-3 ${index > 0 ? 'border-t' : ''}`}
              >
                <img
                  src={banner.imageUrl}
                  alt=""
                  loading="lazy"
                  className="h-12 w-20 shrink-0 rounded-md bg-muted object-cover"
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="flex items-center gap-2 font-medium">
                    <span className="truncate">{name}</span>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </p>
                  {banner.linkUrl && (
                    <p className="truncate text-sm text-muted-foreground">{banner.linkUrl}</p>
                  )}
                  {when && <p className="text-xs text-muted-foreground tabular-nums">{when}</p>}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Edit ${name}`}
                  onClick={() => setEditing(banner)}
                >
                  Edit
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${name}`}>
                      <MoreHorizontalIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-44">
                    <DropdownMenuItem
                      className="min-h-11 md:min-h-8"
                      disabled={index === 0 || reorder.isPending}
                      onSelect={() => move(index, -1)}
                    >
                      Move up
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="min-h-11 md:min-h-8"
                      disabled={index === list.length - 1 || reorder.isPending}
                      onSelect={() => move(index, 1)}
                    >
                      Move down
                    </DropdownMenuItem>
                    {banner.isActive ? (
                      <DropdownMenuItem
                        className="min-h-11 md:min-h-8"
                        onSelect={() => setConfirming({ banner, action: 'turn-off' })}
                      >
                        Turn off
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        className="min-h-11 md:min-h-8"
                        onSelect={() => turnOn(banner)}
                      >
                        Turn on
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      variant="destructive"
                      className="min-h-11 md:min-h-8"
                      onSelect={() => setConfirming({ banner, action: 'delete' })}
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

      {editing && (
        <BannerDialog
          banner={editing === 'new' ? undefined : editing}
          // The backend allows positions up to 1000.
          nextPosition={Math.min(1000, Math.max(-1, ...list.map((item) => item.position)) + 1)}
          onClose={() => setEditing(null)}
        />
      )}

      {confirming && (
        <ConfirmDialog
          title={turningOff ? 'Turn off banner' : 'Delete banner'}
          description={
            turningOff
              ? 'The store stops showing it. It stays here, and you can turn it back on.'
              : 'The banner is removed for good. Its images stay in Files. To hide it but keep it, turn it off instead.'
          }
          actionLabel={turningOff ? 'Turn off' : 'Delete'}
          destructive
          pending={pending.isPending}
          error={pending.error}
          onConfirm={() => {
            const close = (message: string) => {
              toast.success(message);
              setConfirming(null);
            };
            if (turningOff) {
              update.mutate(
                { id: confirming.banner.id, body: { isActive: false } },
                { onSuccess: () => close('Banner turned off') },
              );
            } else {
              remove.mutate(confirming.banner.id, { onSuccess: () => close('Banner deleted') });
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
