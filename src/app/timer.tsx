import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, router, useFocusEffect } from "expo-router";
import { Pause, Play, Square } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Button from "../components/Button";
import Loader from "../components/Loader";
import { cancelNfcScan, NfcError, readClinicId } from "../lib/nfc";
import { supabase } from "../lib/supabase";

type ActiveTimer = {
  clinicId: string;
  startedAt: number; // server timestamp, ms
  clinicName: string | null;
};

const ERROR_MESSAGES: Record<string, string> = {
  timer_already_running: "Таймер уже запущен",
  clinic_not_found: "Клиника не найдена. Проверьте метку",
  profile_missing: "Сначала заполните профиль",
  not_authenticated: "Войдите в аккаунт заново",
  no_active_timer: "Нет запущенного таймера",
};

const SHIFT_KEY = "shift_state";

// Local calendar day, e.g. 2026-10-14
const dayKey = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

const errorText = (message: string) => ERROR_MESSAGES[message] ?? message;

export default function Timer() {
  const [active, setActive] = useState<ActiveTimer | null>(null);
  const [daySeconds, setDaySeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  // Paused: the entry is closed on the server, "resume" opens a new one in the
  // same clinic. Kept on the phone only.
  const [pausedClinicId, setPausedClinicId] = useState<string | null>(null);
  // Sum of today's closed entries, seconds
  const [closedSeconds, setClosedSeconds] = useState(0);
  // Today's worked time when the last shift was finished: the big timer shows
  // only the current shift, the line at the top shows the whole day
  const [shiftOffset, setShiftOffset] = useState(0);
  const [restored, setRestored] = useState(false);

  const [userName, setUserName] = useState("");

  // Reload on focus: the name can change on the profile edit screen
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;
        const { data } = await supabase
          .from("profiles")
          .select("first_name")
          .eq("id", userData.user.id)
          .maybeSingle();
        if (data) setUserName(data.first_name);
      })();
    }, []),
  );

  // server clock minus phone clock: the phone time can be changed by the user
  const offsetRef = useRef(0);

  const clinicName = async (id: string) => {
    const { data } = await supabase
      .from("clinics")
      .select("name")
      .eq("id", id)
      .maybeSingle();
    return data?.name ?? null;
  };

  // Today's worked time = sum of all today's entries (closed ones here, the
  // running one is added by the ticker)
  const refreshToday = useCallback(async () => {
    const now = Date.now() + offsetRef.current;
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    // Root can read everyone's entries, so filter by the current user
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user.id;
    if (!uid) return 0;
    const { data } = await supabase
      .from("time_entries")
      .select("started_at, ended_at")
      .eq("user_id", uid)
      .not("ended_at", "is", null)
      .gte("ended_at", dayStart.toISOString());
    const total = (data ?? []).reduce((sum, e) => {
      const from = Math.max(Date.parse(e.started_at), dayStart.getTime());
      return sum + Math.max(0, Date.parse(e.ended_at) - from);
    }, 0);
    const closed = Math.floor(total / 1000);
    setClosedSeconds(closed);
    return closed;
  }, []);

  // Restore the paused / finished-shift state saved earlier today
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SHIFT_KEY);
        const saved = raw ? JSON.parse(raw) : null;
        if (saved?.day === dayKey(Date.now())) {
          setShiftOffset(saved.offset ?? 0);
          setPausedClinicId(saved.pausedClinicId ?? null);
        }
      } catch {
        // nothing saved
      }
      setRestored(true);
    })();
  }, []);

  useEffect(() => {
    if (!restored) return;
    AsyncStorage.setItem(
      SHIFT_KEY,
      JSON.stringify({
        day: dayKey(Date.now()),
        offset: shiftOffset,
        pausedClinicId,
      }),
    ).catch(() => {});
  }, [restored, shiftOffset, pausedClinicId]);

  // Resume a running timer after app restart
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_active_timer");
      const row = data?.[0];
      if (!error && row) {
        offsetRef.current = Date.parse(row.server_now) - Date.now();
        setActive({
          clinicId: row.clinic_id,
          startedAt: Date.parse(row.started_at),
          clinicName: await clinicName(row.clinic_id),
        });
      }
      await refreshToday();
      setLoading(false);
    })();
  }, [refreshToday]);

  useEffect(() => {
    if (!active) {
      setDaySeconds(closedSeconds);
      return;
    }
    const tick = () =>
      setDaySeconds(
        closedSeconds +
          Math.max(
            0,
            Math.floor(
              (Date.now() + offsetRef.current - active.startedAt) / 1000,
            ),
          ),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active, closedSeconds]);

  const startWithClinic = useCallback(async (clinicId: string) => {
    const { data, error } = await supabase.rpc("start_timer", {
      p_clinic_id: clinicId,
    });
    const row = data?.[0];
    if (error || !row) {
      Alert.alert("Не удалось начать", errorText(error?.message ?? ""));
      return;
    }
    offsetRef.current = Date.parse(row.server_now) - Date.now();
    await refreshToday();
    setPausedClinicId(null);
    setActive({
      clinicId,
      startedAt: Date.parse(row.started_at),
      clinicName: await clinicName(clinicId),
    });
  }, [refreshToday]);

  const handleStart = async () => {
    setScanning(true);
    try {
      const clinicId = await readClinicId();
      // After a pause the shift can only continue in the same clinic; to work
      // in another one the shift has to be finished first
      if (pausedClinicId && clinicId !== pausedClinicId) {
        const name = await clinicName(pausedClinicId);
        Alert.alert(
          "Другая клиника",
          `Вы начали смену${name ? ` в клинике «${name}»` : ""}. Чтобы начать в другой клинике, сначала завершите смену.`,
        );
        return;
      }
      await startWithClinic(clinicId);
    } catch (e) {
      // A cancelled scan is not an error worth showing
      if (e instanceof NfcError) {
        Alert.alert("Метка не считана", e.message);
      }
    } finally {
      setScanning(false);
    }
  };

  const handleCancelScan = async () => {
    await cancelNfcScan();
    setScanning(false);
  };

  // Closes the running entry on the server and refreshes today's total
  const closeEntry = async () => {
    const { error } = await supabase.rpc("stop_timer");
    if (error) {
      Alert.alert("Не удалось остановить", errorText(error.message));
      return null;
    }
    return refreshToday();
  };

  const handlePause = async () => {
    if (!active) return;
    setBusy(true);
    const clinicId = active.clinicId;
    if ((await closeEntry()) !== null) {
      setActive(null);
      setPausedClinicId(clinicId);
    }
    setBusy(false);
  };

  const finishShift = async () => {
    setBusy(true);
    const total = active ? await closeEntry() : closedSeconds;
    if (total !== null) {
      setActive(null);
      setPausedClinicId(null);
      // restart the big timer from zero; the day total stays
      setShiftOffset(total);
    }
    setBusy(false);
  };

  const handleFinish = () => {
    Alert.alert("Завершить смену?", "Таймер будет остановлен.", [
      { text: "Отмена", style: "cancel" },
      { text: "Завершить", style: "destructive", onPress: finishShift },
    ]);
  };

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const isRunning = active !== null;
  const isPaused = pausedClinicId !== null;

  const shiftSeconds = Math.max(0, daySeconds - shiftOffset);
  const workedText = `${Math.floor(daySeconds / 3600)} ч ${Math.floor((daySeconds % 3600) / 60)} мин`;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.greeting}>
        <Text style={styles.greetingLabel} numberOfLines={1}>
          Добро пожаловать,{" "}
          <Text style={styles.greetingName}>{userName}</Text>
        </Text>
        <Text style={styles.workedToday}>Вы сегодня поработали: {workedText}</Text>
      </View>

      <Pressable
        style={styles.settingsButton}
        onPress={() => router.push("/profile-edit")}
        disabled={isRunning}
      >
        <Ionicons name="settings-outline" size={28} color="#333" />
      </Pressable>

      {active?.clinicName && (
        <Text style={styles.clinicName}>{active.clinicName}</Text>
      )}
      <Text style={styles.timerText}>{formatTime(shiftSeconds)}</Text>

      <View style={styles.buttons}>
        <View style={styles.buttonsRow}>
          <Button
            title="Начать смену"
            icon={Play}
            onPress={handleStart}
            disabled={isRunning || isPaused || loading || scanning || busy}
            style={styles.cell}
          />
          {isPaused ? (
            <Button
              title="Продолжить смену"
              icon={Play}
              onPress={handleStart}
              disabled={loading || scanning || busy}
              style={styles.cell}
            />
          ) : (
            <Button
              title="Пауза"
              icon={Pause}
              variant="secondary"
              onPress={handlePause}
              disabled={!isRunning || busy}
              style={styles.cell}
            />
          )}
        </View>
        <Button
          title="Завершить смену"
          icon={Square}
          variant="danger"
          onPress={handleFinish}
          disabled={(!isRunning && !isPaused) || busy}
          style={styles.finish}
        />
      </View>

      {/* iOS shows its own system NFC sheet (Core NFC), so ours is Android-only */}
      <Modal
        visible={scanning && Platform.OS !== "ios"}
        transparent
        animationType="fade"
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Ionicons name="phone-portrait-outline" size={48} color="#65BCE6" />
            <Text style={styles.modalTitle}>
              Поднесите телефон к считывателю
            </Text>
            <Loader />
            <Button
              title="Отмена"
              variant="secondary"
              onPress={handleCancelScan}
              style={styles.modalCancel}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 30,
  },
  timerText: {
    fontSize: 48,
    fontWeight: "bold",
  },
  settingsButton: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10,
  },
  greeting: {
    position: "absolute",
    top: 100,
    left: 20,
    right: 20,
  },
  greetingLabel: {
    textAlign: "center",
    fontSize: 18,
    color: "#666",
  },
  greetingName: {
    fontWeight: "700",
    color: "#65BCE6",
  },
  clinicName: {
    fontSize: 16,
    color: "#666",
  },
  workedToday: {
    textAlign: "center",
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  buttons: {
    alignSelf: "stretch",
    paddingHorizontal: 20,
    gap: 12,
  },
  buttonsRow: {
    flexDirection: "row",
    gap: 12,
  },
  cell: {
    flex: 1,
  },
  finish: {
    alignSelf: "center",
    minWidth: 200,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  modalCancel: {
    alignSelf: "stretch",
  },
});
