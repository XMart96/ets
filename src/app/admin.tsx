import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { Stack, router } from "expo-router";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Loader from "../components/Loader";
import {
  addMonths,
  DAY_MS,
  formatClock,
  formatDayShort,
  formatDuration,
  formatWeek,
  MONTHS,
  monthBounds,
  mskDateString,
  mskDayStart,
  mskMonthOf,
  MSK_OFFSET,
  mskWeekStart,
} from "../lib/msk";
import { supabase } from "../lib/supabase";

type Entry = {
  entry_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  clinic_name: string;
  started_at: string;
  ended_at: string | null;
  server_now: string;
  day_start: string;
  day_end: string;
};

type Segment = { start: number; end: number | null; clinic: string };

type Person = {
  userId: string;
  name: string;
  clinic: string;
  from: number; // shift start (active) or first start of the day (finished), ms
  seconds: number; // worked that day
  segments: Segment[]; // the day's entries in order
};

type PeriodRow = {
  user_id: string;
  first_name: string;
  last_name: string;
  total_seconds: number;
  entries_count: number;
  has_active: boolean;
};

type PeriodEntry = {
  entry_id: string;
  clinic_name: string;
  started_at: string;
  ended_at: string | null;
  server_now: string;
};

// Two columns, one row per entry: start (or resume) on the left, its end on
// the right. An end followed by another entry is a pause, the last end is the
// end of the shift.
function Timeline({ segments }: { segments: Segment[] }) {
  return (
    <View style={styles.timeline}>
      {segments.map((seg, i) => (
        <View key={i} style={[styles.event, i > 0 && styles.eventRow]}>
          <Text style={[styles.eventCell, styles.eventCellLeft]}>
            {i === 0 ? "Начал смену" : "Продолжил смену"} -{" "}
            {formatClock(seg.start)}
          </Text>
          <Text style={styles.eventCell}>
            {seg.end === null
              ? ""
              : `${i < segments.length - 1 ? "Сделал паузу" : "Закончил смену"} - ${formatClock(seg.end)}`}
          </Text>
        </View>
      ))}
    </View>
  );
}

function PersonRow({ person, sub }: { person: Person; sub: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.personBlock}>
      <Pressable style={styles.row} onPress={() => setOpen(!open)}>
        <View style={styles.flex}>
          <Text style={styles.name}>{person.name}</Text>
          <Text style={styles.sub}>{sub}</Text>
        </View>
        <Text style={styles.hours}>{formatDuration(person.seconds)}</Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color="#666"
          style={styles.chevron}
        />
      </Pressable>
      {open && <Timeline segments={person.segments} />}
    </View>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <View style={styles.section}>
      <Pressable style={styles.sectionHeader} onPress={() => setOpen(!open)}>
        <Text style={styles.sectionTitle}>
          {title} ({count})
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={22}
          color="#333"
        />
      </Pressable>
      {open &&
        (count === 0 ? <Text style={styles.empty}>Никого</Text> : children)}
    </View>
  );
}

// ---------- Day ----------

function DayReport() {
  // null = today (by the server clock); otherwise start of a Moscow day, ms
  const [dayMs, setDayMs] = useState<number | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  // server clock minus phone clock: the phone time can be wrong
  const offsetRef = useRef(0);
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const request = ++requestRef.current;
    const { data, error } = await supabase.rpc("day_overview", {
      p_day: dayMs === null ? null : mskDateString(dayMs),
    });
    if (request !== requestRef.current) return; // a newer day was requested
    if (error) {
      setError(error.message);
    } else {
      setError(null);
      setEntries(data ?? []);
      if (data?.[0]) {
        offsetRef.current = Date.parse(data[0].server_now) - Date.now();
      }
    }
    setNow(Date.now());
  }, [dayMs]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const serverNow = now + offsetRef.current;
  const today = mskDayStart(serverNow);
  const day = dayMs ?? today;
  const isToday = day === today;

  // keep running durations and the list fresh (only today changes)
  useEffect(() => {
    if (!isToday) return;
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    const poll = setInterval(load, 60_000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [load, isToday]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const goTo = (ms: number) => setDayMs(ms >= today ? null : ms);

  // The picker works with the device's local date; map the Moscow date onto it
  const toLocalDate = (ms: number) => {
    const d = new Date(ms + MSK_OFFSET);
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  };
  const fromLocalDate = (d: Date) =>
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - MSK_OFFSET;

  const openAndroidPicker = () =>
    DateTimePickerAndroid.open({
      value: toLocalDate(day),
      maximumDate: toLocalDate(today),
      mode: "date",
      onValueChange: (_, d) => goTo(fromLocalDate(d)),
    });

  const people = new Map<string, Person & { active: boolean }>();
  for (const e of entries) {
    const start = Date.parse(e.started_at);
    const end = e.ended_at ? Date.parse(e.ended_at) : null;
    const dayStart = Date.parse(e.day_start);
    const dayEnd = Date.parse(e.day_end);
    const worked = Math.max(
      0,
      Math.floor(
        (Math.min(end ?? serverNow, dayEnd) - Math.max(start, dayStart)) / 1000,
      ),
    );

    const p = people.get(e.user_id);
    if (!p) {
      people.set(e.user_id, {
        userId: e.user_id,
        name: `${e.last_name} ${e.first_name}`,
        clinic: e.clinic_name,
        from: start,
        seconds: worked,
        segments: [{ start, end, clinic: e.clinic_name }],
        active: end === null,
      });
    } else {
      // entries come ordered by start, so later ones overwrite clinic/end
      p.clinic = e.clinic_name;
      p.segments.push({ start, end, clinic: e.clinic_name });
      p.seconds += worked;
      if (end === null) {
        p.active = true;
        p.from = start;
      }
    }
  }

  const all = [...people.values()];
  const onShift = all.filter((p) => p.active);
  const finished = all.filter((p) => !p.active);

  return (
    <>
      <View style={styles.navigator}>
        <Pressable
          style={styles.navButton}
          onPress={() => goTo(day - DAY_MS)}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={24} color="#333" />
        </Pressable>

        {Platform.OS === "ios" ? (
          <DateTimePicker
            value={toLocalDate(day)}
            maximumDate={toLocalDate(today)}
            mode="date"
            display="compact"
            locale="ru-RU"
            onValueChange={(_, d) => goTo(fromLocalDate(d))}
          />
        ) : (
          <Pressable onPress={openAndroidPicker}>
            <Text style={styles.navLabel}>{formatDayShort(day)}</Text>
          </Pressable>
        )}

        <Pressable
          style={[styles.navButton, isToday && styles.navDisabled]}
          onPress={() => goTo(day + DAY_MS)}
          disabled={isToday}
          hitSlop={8}
        >
          <Ionicons name="chevron-forward" size={24} color="#333" />
        </Pressable>
      </View>

      {loading ? (
        <Loader style={styles.center} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {error && <Text style={styles.error}>{error}</Text>}

          {isToday ? (
            <>
              <Section title="Сейчас на смене" count={onShift.length}>
                {onShift.map((p) => (
                  <PersonRow
                    key={p.userId}
                    person={p}
                    sub={`${p.clinic} · с ${formatClock(p.from)}`}
                  />
                ))}
              </Section>

              <Section title="Закончили сегодня" count={finished.length}>
                {finished.map((p) => (
                  <PersonRow key={p.userId} person={p} sub={p.clinic} />
                ))}
              </Section>
            </>
          ) : (
            <Section title="Работали" count={all.length}>
              {all.map((p) => (
                <PersonRow key={p.userId} person={p} sub={p.clinic} />
              ))}
            </Section>
          )}
        </ScrollView>
      )}
    </>
  );
}

// ---------- Month ----------

type DayBreakdown = {
  day: number; // start of the Moscow day, ms
  seconds: number;
  pieces: { from: number; to: number; open: boolean }[];
};

type Period = { from: number; to: number }; // [from, to) in ms

// Splits the entries into Moscow days, clipped to the period
function breakdownByDay(
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

function PeriodPersonRow({
  row,
  period,
  first,
}: {
  row: PeriodRow;
  period: Period;
  first: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<DayBreakdown[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (!next || days) return;
    const { data, error } = await supabase.rpc("period_entries", {
      p_user_id: row.user_id,
      p_from: mskDateString(period.from),
      p_to: mskDateString(period.to),
    });
    if (error) {
      setError(error.message);
      return;
    }
    const entries: PeriodEntry[] = data ?? [];
    const serverNow = entries[0] ? Date.parse(entries[0].server_now) : Date.now();
    setDays(breakdownByDay(entries, period, serverNow));
  };

  return (
    <View style={[styles.personBlock, first && styles.firstRow]}>
      <Pressable style={styles.row} onPress={toggle}>
        <View style={styles.flex}>
          <Text style={styles.name}>
            {row.last_name} {row.first_name}
          </Text>
          {row.has_active && <Text style={styles.sub}>Сейчас на смене</Text>}
        </View>
        <Text style={styles.hours}>{formatDuration(row.total_seconds)}</Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color="#666"
          style={styles.chevron}
        />
      </Pressable>

      {open &&
        (error ? (
          <Text style={styles.error}>{error}</Text>
        ) : !days ? (
          <Loader size={22} style={styles.dayLoader} />
        ) : days.length === 0 ? (
          <Text style={styles.empty}>Нет записей</Text>
        ) : (
          <View>
            {days.map((d) => (
              <View key={d.day}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayTitle}>{formatDayShort(d.day)}</Text>
                  <Text style={styles.dayTotal}>{formatDuration(d.seconds)}</Text>
                </View>
                <Timeline
                  segments={d.pieces.map((p) => ({
                    start: p.from,
                    end: p.open ? null : p.to,
                    clinic: "",
                  }))}
                />
              </View>
            ))}
          </View>
        ))}
    </View>
  );
}

function PeriodReport({ kind }: { kind: "week" | "month" }) {
  // 0 = current week / month, -1 = previous, ...
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<PeriodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const nowMs = Date.now();
  let period: Period;
  let label: string;
  if (kind === "week") {
    const from = mskWeekStart(nowMs) + offset * 7 * DAY_MS;
    period = { from, to: from + 7 * DAY_MS };
    label = formatWeek(from);
  } else {
    const cur = mskMonthOf(nowMs);
    const t = cur.y * 12 + cur.m + offset;
    const month = { y: Math.floor(t / 12), m: ((t % 12) + 12) % 12 };
    period = monthBounds(month);
    label = `${MONTHS[month.m]} ${month.y}`;
  }
  const isCurrent = offset === 0;

  const load = useCallback(async () => {
    const request = ++requestRef.current;
    const { data, error } = await supabase.rpc("period_report", {
      p_from: mskDateString(period.from),
      p_to: mskDateString(period.to),
    });
    if (request !== requestRef.current) return;
    if (error) {
      setError(error.message);
    } else {
      setError(null);
      setRows(data ?? []);
    }
  }, [period.from, period.to]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  // the running timer keeps adding hours to the current period
  useEffect(() => {
    if (!isCurrent) return;
    const poll = setInterval(load, 60_000);
    return () => clearInterval(poll);
  }, [load, isCurrent]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <>
      <View style={styles.navigator}>
        <Pressable
          style={styles.navButton}
          onPress={() => setOffset(offset - 1)}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={24} color="#333" />
        </Pressable>
        <Text style={styles.navLabel}>{label}</Text>
        <Pressable
          style={[styles.navButton, isCurrent && styles.navDisabled]}
          onPress={() => setOffset(offset + 1)}
          disabled={isCurrent}
          hitSlop={8}
        >
          <Ionicons name="chevron-forward" size={24} color="#333" />
        </Pressable>
      </View>

      {loading ? (
        <Loader style={styles.center} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.section}>
            {rows.length === 0 ? (
              <Text style={styles.empty}>Нет сотрудников</Text>
            ) : (
              rows.map((r, i) => (
                <PeriodPersonRow
                  key={r.user_id}
                  row={r}
                  period={period}
                  first={i === 0}
                />
              ))
            )}
          </View>
        </ScrollView>
      )}
    </>
  );
}

// ---------- Screen ----------

export default function Admin() {
  const [mode, setMode] = useState<"day" | "week" | "month">("day");

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <Pressable
        style={styles.settingsButton}
        onPress={() => router.push("/profile-edit")}
      >
        <Ionicons name="settings-outline" size={28} color="#333" />
      </Pressable>

      <Text style={styles.title}>Отчёт</Text>

      <View style={styles.modes}>
        {(["day", "week", "month"] as const).map((m) => (
          <Pressable
            key={m}
            style={[styles.mode, mode === m && styles.modeActive]}
            onPress={() => setMode(m)}
          >
            <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>
              {m === "day" ? "День" : m === "week" ? "Неделя" : "Месяц"}
            </Text>
          </Pressable>
        ))}
      </View>

      {mode === "day" ? (
        <DayReport />
      ) : (
        <PeriodReport key={mode} kind={mode} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 20, gap: 16 },
  flex: { flex: 1 },
  navigator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navButton: { padding: 4 },
  navDisabled: { opacity: 0.25 },
  navLabel: { fontSize: 17, fontWeight: "600" },
  modes: {
    flexDirection: "row",
    backgroundColor: "#eee",
    borderRadius: 10,
    padding: 3,
  },
  mode: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  modeActive: { backgroundColor: "#fff" },
  modeText: { fontSize: 15, color: "#666" },
  modeTextActive: { color: "#111", fontWeight: "600" },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingHorizontal: 14,
    paddingBottom: 6,
  },
  dayTitle: { fontSize: 15, fontWeight: "600" },
  dayTotal: { fontSize: 14, fontWeight: "600" },
  dayLoader: { marginBottom: 14 },
  firstRow: { borderTopWidth: 0 },

  center: { marginTop: 40, alignSelf: "center" },
  scroll: { gap: 16, paddingBottom: 40 },
  settingsButton: { position: "absolute", top: 60, right: 20, zIndex: 10 },
  title: { fontSize: 22, fontWeight: "bold", textAlign: "center" },
  section: { borderWidth: 1, borderColor: "#ddd", borderRadius: 12 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: "600" },
  personBlock: { borderTopWidth: 1, borderTopColor: "#eee" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  chevron: { marginLeft: 8 },
  timeline: {
    marginHorizontal: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    overflow: "hidden",
  },
  event: { flexDirection: "row" },
  eventRow: { borderTopWidth: 1, borderTopColor: "#ddd" },
  eventCell: {
    flex: 1,
    fontSize: 13,
    color: "#333",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  eventCellLeft: {
    flex: 1.2,
    borderRightWidth: 1,
    borderRightColor: "#ddd",
  },
  name: { fontSize: 16 },
  sub: { fontSize: 13, color: "#666", marginTop: 2 },
  hours: { fontSize: 15, fontWeight: "600" },
  empty: { padding: 14, color: "#666" },
  error: { textAlign: "center", color: "#c00" },
});
