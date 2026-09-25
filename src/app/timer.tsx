import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { Stack, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Button, Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../lib/supabase";
import { getDistanceMeters } from "../utils/geo";

type Clinic = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
};

export default function Timer() {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [checking, setChecking] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "clinic_id, clinics(id, name, latitude, longitude, radius_meters)",
        )
        .eq("id", userData.user?.id)
        .single();

      if (profile?.clinics) setClinic(profile.clinics as unknown as Clinic);
    })();
  }, []);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const isWithinGeofence = (lat: number, lon: number) => {
    if (!clinic) return false;
    const dist = getDistanceMeters(lat, lon, clinic.latitude, clinic.longitude);
    return dist <= clinic.radius_meters;
  };

  const handleStart = async () => {
    if (!clinic) {
      Alert.alert("Ошибка", "Клиника не назначена профилю");
      return;
    }

    setChecking(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Нужен доступ к геолокации",
        "Без этого таймер запустить нельзя",
      );
      setChecking(false);
      return;
    }

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    if (!isWithinGeofence(pos.coords.latitude, pos.coords.longitude)) {
      Alert.alert(
        "Вы не на территории клиники",
        `Подойдите ближе к "${clinic.name}"`,
      );
      setChecking(false);
      return;
    }

    setIsRunning(true);
    setChecking(false);

    watchRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000,
        distanceInterval: 15,
      },
      (loc) => {
        if (!isWithinGeofence(loc.coords.latitude, loc.coords.longitude)) {
          handleStop(true);
        }
      },
    );
  };

  const handleStop = (autoStopped = false) => {
    setIsRunning(false);
    watchRef.current?.remove();
    watchRef.current = null;

    if (autoStopped) {
      Alert.alert("Таймер остановлен", "Вы покинули территорию клиники");
    }
  };

  useEffect(() => {
    return () => {
      watchRef.current?.remove();
    };
  }, []);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

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

      {clinic && <Text style={styles.clinicName}>{clinic.name}</Text>}
      <Text style={styles.timerText}>{formatTime(seconds)}</Text>

      <View style={styles.buttons}>
        <Button
          title={checking ? "Проверка..." : "Старт"}
          onPress={handleStart}
          disabled={isRunning || checking}
        />
        <Button
          title="Стоп"
          onPress={() => handleStop(false)}
          disabled={!isRunning}
        />
      </View>
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
});
