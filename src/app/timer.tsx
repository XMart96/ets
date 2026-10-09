import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Button from "../components/Button";
import { cancelNfcScan, NfcError, readClinicId } from "../lib/nfc";
import { supabase } from "../lib/supabase";

type ActiveTimer = {
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

const errorText = (message: string) => ERROR_MESSAGES[message] ?? message;

export default function Timer() {
  const [active, setActive] = useState<ActiveTimer | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [stopping, setStopping] = useState(false);

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

  // Resume a running timer after app restart
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_active_timer");
      const row = data?.[0];
      if (!error && row) {
        offsetRef.current = Date.parse(row.server_now) - Date.now();
        setActive({
          startedAt: Date.parse(row.started_at),
          clinicName: await clinicName(row.clinic_id),
        });
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!active) {
      setSeconds(0);
      return;
    }
    const tick = () =>
      setSeconds(
        Math.max(
          0,
          Math.floor((Date.now() + offsetRef.current - active.startedAt) / 1000),
        ),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active]);

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
    setActive({
      startedAt: Date.parse(row.started_at),
      clinicName: await clinicName(clinicId),
    });
  }, []);

  const handleStart = async () => {
    setScanning(true);
    try {
      const clinicId = await readClinicId();
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

  const handleStop = async () => {
    setStopping(true);
    const { error } = await supabase.rpc("stop_timer");
    setStopping(false);
    if (error) {
      Alert.alert("Не удалось остановить", errorText(error.message));
      return;
    }
    setActive(null);
  };

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const isRunning = active !== null;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

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
      <Text style={styles.timerText}>{formatTime(seconds)}</Text>

      <View style={styles.buttons}>
        <Button
          title="Начать смену"
          onPress={handleStart}
          disabled={isRunning || loading || scanning}
        />
        <Button
          title="Закончить смену"
          onPress={handleStop}
          disabled={!isRunning}
          loading={stopping}
        />
      </View>

      <Modal visible={scanning} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Ionicons name="phone-portrait-outline" size={48} color="#65BCE6" />
            <Text style={styles.modalTitle}>
              Поднесите телефон к считывателю
            </Text>
            <ActivityIndicator color="#65BCE6" />
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
  clinicName: {
    fontSize: 16,
    color: "#666",
  },
  buttons: {
    flexDirection: "row",
    gap: 20,
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
