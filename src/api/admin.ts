import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";
import { unwrap } from "./errors";

type Fn = Database["public"]["Functions"];

// The generated types mark nullable SQL columns as non-null; fix ended_at.
export type DayEntry = Omit<Fn["day_overview"]["Returns"][number], "ended_at"> & {
  ended_at: string | null;
};
export type PeriodRow = Fn["period_report"]["Returns"][number];
export type PeriodEntry = Omit<
  Fn["period_entries"]["Returns"][number],
  "ended_at"
> & { ended_at: string | null };

/** Entries of a Moscow day ("YYYY-MM-DD"; null = today by the server clock). */
export async function dayOverview(day: string | null): Promise<DayEntry[]> {
  const rows = unwrap(
    await supabase.rpc("day_overview", day === null ? {} : { p_day: day }),
  );
  return rows ?? [];
}

/** Hours per employee for [from, to), dates as "YYYY-MM-DD" (Moscow). */
export async function periodReport(from: string, to: string) {
  const rows = unwrap(
    await supabase.rpc("period_report", { p_from: from, p_to: to }),
  );
  return rows ?? [];
}

export async function periodEntries(
  userId: string,
  from: string,
  to: string,
): Promise<PeriodEntry[]> {
  const rows = unwrap(
    await supabase.rpc("period_entries", {
      p_user_id: userId,
      p_from: from,
      p_to: to,
    }),
  );
  return rows ?? [];
}
