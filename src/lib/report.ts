import { DAY_MS, mskDayStart } from "@/lib/msk";
import type { PeriodEntry } from "@/api/admin";

export type Segment = { start: number; end: number | null; clinic: string };

export type DayBreakdown = {
  day: number; // start of the Moscow day, ms
  seconds: number;
  pieces: { from: number; to: number; open: boolean }[];
};

export type Period = { from: number; to: number }; // [from, to) in ms

// Splits the entries into Moscow days, clipped to the period
export function breakdownByDay(
  entries: PeriodEntry[],
  period: Period,
  serverNow: number,
): DayBreakdown[] {
  const { from: monthFrom, to: monthTo } = period;
  const days = new Map<number, DayBreakdown>();

  for (const e of entries) {
    const start = Math.max(Date.parse(e.started_at), monthFrom);
    const open = e.ended_at === null;
    const end = Math.min(open ? serverNow : Date.parse(e.ended_at!), monthTo);

    let cursor = start;
    while (cursor < end) {
      const dayStart = mskDayStart(cursor);
      const to = Math.min(end, dayStart + DAY_MS);
      const d = days.get(dayStart) ?? { day: dayStart, seconds: 0, pieces: [] };
      d.seconds += Math.floor((to - cursor) / 1000);
      d.pieces.push({ from: cursor, to, open: open && to === end });
      days.set(dayStart, d);
      cursor = to;
    }
  }
  return [...days.values()].sort((a, b) => a.day - b.day);
}
