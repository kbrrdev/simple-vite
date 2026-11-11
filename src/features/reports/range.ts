import type { DateRange } from './api';

const manilaDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Today in Manila, such as "2026-11-11". The backend counts days in Manila time too. */
export function manilaToday(now = new Date()) {
  return manilaDay.format(now);
}

/** Moves a calendar day, worked out in UTC so that no time zone can shift it. */
function addDays(day: string, days: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export const presets = [
  {
    key: '7d',
    label: 'Last 7 days',
    range: (today: string) => ({ from: addDays(today, -6), to: today }),
  },
  {
    key: '30d',
    label: 'Last 30 days',
    range: (today: string) => ({ from: addDays(today, -29), to: today }),
  },
  {
    key: 'month',
    label: 'This month',
    range: (today: string) => ({ from: `${today.slice(0, 8)}01`, to: today }),
  },
  {
    key: 'last-month',
    label: 'Last month',
    range: (today: string) => {
      const lastDay = addDays(`${today.slice(0, 8)}01`, -1);
      return { from: `${lastDay.slice(0, 8)}01`, to: lastDay };
    },
  },
] as const;

export type PresetKey = (typeof presets)[number]['key'] | 'custom';

/** Which preset a range matches. With no range, the backend's default of 30 days applies. */
export function presetFor({ from, to }: DateRange, today: string): PresetKey {
  if (!from && !to) return '30d';
  const match = presets.find((preset) => {
    const range = preset.range(today);
    return range.from === from && range.to === to;
  });
  return match?.key ?? 'custom';
}

/** A date from the URL, kept only when it looks like "2026-11-01". The backend checks the rest. */
export function readDay(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

const dayFormat = new Intl.DateTimeFormat('en-PH', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** A calendar day for display, such as "1 Nov 2026". */
export function formatDay(day: string) {
  return dayFormat.format(new Date(`${day}T00:00:00Z`));
}
