/** Anything that is switched on and off, and can be limited to dates. */
export interface Scheduled {
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

export type ScheduleStatus = 'live' | 'scheduled' | 'ended' | 'off';

/**
 * Whether something, such as a banner or a sale, is running now: on, and now within its dates,
 * the start included and the end not. It mirrors the backend as a hint, and the backend decides.
 */
export function scheduleStatus(item: Scheduled, now = new Date()): ScheduleStatus {
  if (!item.isActive) return 'off';
  if (item.startsAt && new Date(item.startsAt) > now) return 'scheduled';
  if (item.endsAt && new Date(item.endsAt) <= now) return 'ended';
  return 'live';
}

/** An ISO time as a `datetime-local` field shows it, in the browser's time zone. */
export function toLocalInput(iso: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

/** A `datetime-local` field's time as ISO, or null when empty. */
export function fromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : null;
}
