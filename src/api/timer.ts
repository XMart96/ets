import { supabase } from "@/lib/supabase";
import { currentUserId } from "./auth";
import { unwrap } from "./errors";

export type ActiveEntry = {
  clinicId: string;
  startedAt: number; // server timestamp, ms
  clockOffset: number; // server clock minus phone clock, ms
};

/** The running timer (if any), e.g. to resume after an app restart. */
export async function getActiveTimer(): Promise<ActiveEntry | null> {
  const rows = unwrap(await supabase.rpc("get_active_timer"));
  const row = rows?.[0];
  if (!row) return null;
  return {
    clinicId: row.clinic_id,
    startedAt: Date.parse(row.started_at),
    clockOffset: Date.parse(row.server_now) - Date.now(),
  };
}

/** Starts a timer in the clinic; the server sets the start time. */
export async function startTimer(clinicId: string) {
  const rows = unwrap(
    await supabase.rpc("start_timer", { p_clinic_id: clinicId }),
  );
  const row = rows?.[0];
  if (!row) throw new Error("start_timer returned no row");
  return {
    startedAt: Date.parse(row.started_at),
    clockOffset: Date.parse(row.server_now) - Date.now(),
  };
}

export async function stopTimer() {
  unwrap(await supabase.rpc("stop_timer"));
}

/**
 * Seconds in closed entries since `dayStartMs` (clipped to it). The running
 * entry is not included.
 */
export async function getClosedSecondsSince(dayStartMs: number) {
  // Root can read everyone's entries, so filter by the current user
  const uid = await currentUserId();
  if (!uid) return 0;
  const rows = unwrap(
    await supabase
      .from("time_entries")
      .select("started_at, ended_at")
      .eq("user_id", uid)
      .not("ended_at", "is", null)
      .gte("ended_at", new Date(dayStartMs).toISOString()),
  );
  const total = (rows ?? []).reduce((sum, e) => {
    const from = Math.max(Date.parse(e.started_at), dayStartMs);
    return sum + Math.max(0, Date.parse(e.ended_at!) - from);
  }, 0);
  return Math.floor(total / 1000);
}
