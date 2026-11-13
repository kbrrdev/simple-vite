import type { Banner } from './api';

export type BannerStatus = 'live' | 'scheduled' | 'ended' | 'off';

/**
 * Whether the storefront shows the banner now. It mirrors the backend's public list (on, and
 * now within its dates) as a hint. The backend decides what the storefront shows.
 */
export function bannerStatus(banner: Banner, now = new Date()): BannerStatus {
  if (!banner.isActive) return 'off';
  if (banner.startsAt && new Date(banner.startsAt) > now) return 'scheduled';
  if (banner.endsAt && new Date(banner.endsAt) <= now) return 'ended';
  return 'live';
}
