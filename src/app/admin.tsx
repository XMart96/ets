import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
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
};

type Person = {
  userId: string;
  name: string;
  clinic: string;
  from: number; // shift start (active) or first start today (finished), ms
  to: number | null; // last end, ms; null while on shift
  seconds: number; // worked today, counted from midnight (Moscow)
};

const MSK_OFFSET = 3 * 3600 * 1000;

const formatClock = (ms: number) => {
  const d = new Date(ms + MSK_OFFSET);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
};

const formatDuration = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${h} ч ${String(m).padStart(2, "0")} мин`;
};

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

export default function Admin() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  // server clock minus phone clock: the phone time can be wrong
  const offsetRef = useRef(0);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("today_overview");
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
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  // keep running durations and the list fresh
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    const poll = setInterval(load, 60_000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const serverNow = now + offsetRef.current;

  const people = new Map<string, Person & { active: boolean }>();
  for (const e of entries) {
    const start = Date.parse(e.started_at);
    const end = e.ended_at ? Date.parse(e.ended_at) : null;
    const dayStart = Date.parse(e.day_start);
    const worked = Math.max(
      0,
      Math.floor(((end ?? serverNow) - Math.max(start, dayStart)) / 1000),
    );

    const p = people.get(e.user_id);
    if (!p) {
      people.set(e.user_id, {
        userId: e.user_id,
        name: `${e.last_name} ${e.first_name}`,
        clinic: e.clinic_name,
        from: start,
        to: end,
        seconds: worked,
        active: end === null,
      });
    } else {
      // entries come ordered by start, so later ones overwrite clinic/end
      p.clinic = e.clinic_name;
      p.to = end;
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
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <Pressable
        style={styles.settingsButton}
        onPress={() => router.push("/profile-edit")}
      >
        <Ionicons name="settings-outline" size={28} color="#333" />
      </Pressable>

      <Text style={styles.title}>Сегодня</Text>

      {loading ? (
        <ActivityIndicator style={styles.center} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {error && <Text style={styles.error}>{error}</Text>}

          <Section title="Сейчас на смене" count={onShift.length}>
            {onShift.map((p) => (
              <View key={p.userId} style={styles.row}>
                <View style={styles.flex}>
                  <Text style={styles.name}>{p.name}</Text>
                  <Text style={styles.sub}>
                    {p.clinic} · с {formatClock(p.from)}
                  </Text>
                </View>
                <Text style={styles.hours}>{formatDuration(p.seconds)}</Text>
              </View>
            ))}
          </Section>

          <Section title="Закончили сегодня" count={finished.length}>
            {finished.map((p) => (
              <View key={p.userId} style={styles.row}>
                <View style={styles.flex}>
                  <Text style={styles.name}>{p.name}</Text>
                  <Text style={styles.sub}>
                    {p.clinic} · {formatClock(p.from)}–
                    {p.to ? formatClock(p.to) : ""}
                  </Text>
                </View>
                <Text style={styles.hours}>{formatDuration(p.seconds)}</Text>
              </View>
            ))}
          </Section>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 20, gap: 16 },
  flex: { flex: 1 },
  center: { marginTop: 40 },
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  name: { fontSize: 16 },
  sub: { fontSize: 13, color: "#666", marginTop: 2 },
  hours: { fontSize: 15, fontWeight: "600" },
  empty: { padding: 14, color: "#666" },
  error: { textAlign: "center", color: "#c00" },
});
