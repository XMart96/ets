import { Settings } from "lucide-react-native";
import { Stack, router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { getMyProfile } from "@/api/profile";
import DayReport from "@/components/admin/DayReport";
import PeriodReport from "@/components/admin/PeriodReport";
import { styles } from "@/components/admin/styles";
import { colors } from "@/theme";

export default function Admin() {
  const [mode, setMode] = useState<"day" | "week" | "month">("day");

  // Reports are root-only (the SQL functions enforce it); don't show an empty
  // screen with errors to anyone else who reaches this route
  useEffect(() => {
    getMyProfile()
      .then((profile) => {
        if (!profile) router.replace("/");
        else if (profile.role !== "root") router.replace("/timer");
      })
      .catch(() => {});
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <Pressable
        style={styles.settingsButton}
        onPress={() => router.push("/profile-edit")}
      >
        <Settings size={28} color={colors.text} />
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
