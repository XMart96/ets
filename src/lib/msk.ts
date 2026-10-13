// Moscow time helpers (UTC+3, no DST). The director's report is in clinic time.
export const MSK_OFFSET = 3 * 3600 * 1000;
export const DAY_MS = 24 * 3600 * 1000;

const pad = (n: number) => String(n).padStart(2, "0");

export const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];
const MONTHS_SHORT = [
  "янв",
  "фев",
  "мар",
  "апр",
  "мая",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
];
const WEEKDAYS = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

/** Start (00:00 Moscow) of the Moscow day containing `ms`. */
export const mskDayStart = (ms: number) =>
  Math.floor((ms + MSK_OFFSET) / DAY_MS) * DAY_MS - MSK_OFFSET;

/** "HH:MM" in Moscow time. */
export const formatClock = (ms: number) => {
  const d = new Date(ms + MSK_OFFSET);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};

/** "YYYY-MM-DD" of the Moscow day containing `ms` (for date RPC arguments). */
export const mskDateString = (ms: number) => {
  const d = new Date(ms + MSK_OFFSET);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

/** "14 окт, вт" */
export const formatDayShort = (ms: number) => {
  const d = new Date(ms + MSK_OFFSET);
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}, ${WEEKDAYS[d.getUTCDay()]}`;
};

export type Month = { y: number; m: number }; // m: 0-11

export const mskMonthOf = (ms: number): Month => {
  const d = new Date(ms + MSK_OFFSET);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
};

export const addMonths = ({ y, m }: Month, delta: number): Month => {
  const t = y * 12 + m + delta;
  return { y: Math.floor(t / 12), m: ((t % 12) + 12) % 12 };
};

export const sameMonth = (a: Month, b: Month) => a.y === b.y && a.m === b.m;

/** [start, end) of a Moscow month in ms. */
export const monthBounds = ({ y, m }: Month) => ({
  from: Date.UTC(y, m, 1) - MSK_OFFSET,
  to: Date.UTC(y, m + 1, 1) - MSK_OFFSET,
});

/** "2026-10-01" for the month RPCs. */
export const monthDateString = ({ y, m }: Month) => `${y}-${pad(m + 1)}-01`;

export const formatDuration = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${h} ч ${pad(m)} мин`;
};

/** Start (Monday 00:00 Moscow) of the Moscow week containing `ms`. */
export const mskWeekStart = (ms: number) => {
  const dayStart = mskDayStart(ms);
  const weekday = new Date(dayStart + MSK_OFFSET).getUTCDay(); // 0 = Sunday
  return dayStart - ((weekday + 6) % 7) * DAY_MS;
};

/** "12 – 18 окт 2026" for the week starting at `from` (last day inclusive). */
export const formatWeek = (from: number) => {
  const a = new Date(from + MSK_OFFSET);
  const b = new Date(from + 6 * DAY_MS + MSK_OFFSET);
  const left =
    a.getUTCMonth() === b.getUTCMonth()
      ? `${a.getUTCDate()}`
      : `${a.getUTCDate()} ${MONTHS_SHORT[a.getUTCMonth()]}`;
  return `${left} – ${b.getUTCDate()} ${MONTHS_SHORT[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
};
