import { ChevronLeft, ChevronRight } from "lucide-react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { dayOverview } from "@/api/admin";
import Loader from "@/components/Loader";
import { useReport } from "@/hooks/useReport";
import {
  DAY_MS,
  formatClock,
  formatDayShort,
  mskDateString,
  mskDayStart,
  MSK_OFFSET,
} from "@/lib/msk";
import PersonRow, { type Person } from "./PersonRow";
import Section from "./Section";
import { styles } from "./styles";
import { colors } from "@/theme";

export default function DayReport() {
  // null = today (by the server clock); otherwise start of a Moscow day, ms
  const [dayMs, setDayMs] = useState<number | null>(null);
  const [tick, setTick] = useState(() => Date.now());
  // server clock minus phone clock (the phone time can be wrong). Days without
  // entries carry no server time, so the last known value is kept.
  const offsetRef = useRef(0);

  const { data, loading, refreshing, error, refresh } = useReport(
    async () => {
      const entries = await dayOverview(
        dayMs === null ? null : mskDateString(dayMs),
      );
      const fetchedAt = Date.now();
      if (entries[0]) {
        offsetRef.current = Date.parse(entries[0].server_now) - fetchedAt;
      }
      return { entries, fetchedAt, clockOffset: offsetRef.current };
    },
    String(dayMs),
    dayMs === null ? 60_000 : null, // only today changes
  );
  const entries = data?.entries ?? [];

  // current time: the 30 s tick, or the moment of the last load if later
  const now = Math.max(tick, data?.fetchedAt ?? 0);
  const serverNow = now + (data?.clockOffset ?? 0);
  const today = mskDayStart(serverNow);
  const day = dayMs ?? today;
  const isToday = day === today;

  // keep running durations fresh (only today changes)
  useEffect(() => {
    if (!isToday) return;
    const id = setInterval(() => setTick(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [isToday]);

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
          <ChevronLeft size={24} color={colors.text} />
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
          <ChevronRight size={24} color={colors.text} />
        </Pressable>
      </View>

      {loading ? (
        <Loader style={styles.center} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} />
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
