import { Stack, router } from "expo-router";
import { Pause, Play, Settings, Smartphone, Square } from "lucide-react-native";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Button from "@/components/Button";
import Loader from "@/components/Loader";
import { useShiftTimer } from "@/hooks/useShiftTimer";
import { formatDuration, formatTimer } from "@/lib/msk";
import { colors } from "@/theme";

export default function Timer() {
  const {
    userName,
    active,
    loading,
    scanning,
    busy,
    isRunning,
    isPaused,
    daySeconds,
    shiftSeconds,
    start,
    cancelScan,
    pause,
    finish,
  } = useShiftTimer();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.greeting}>
        <Text style={styles.greetingLabel} numberOfLines={1}>
          Добро пожаловать,{" "}
          <Text style={styles.greetingName}>{userName}</Text>
        </Text>
        <Text style={styles.workedToday}>
          Вы сегодня поработали: {formatDuration(daySeconds)}
        </Text>
      </View>

      <Pressable
        style={styles.settingsButton}
        onPress={() => router.push("/profile-edit")}
        disabled={isRunning}
      >
        <Settings size={28} color={colors.text} />
      </Pressable>

      {active?.clinicName && (
        <Text style={styles.clinicName}>{active.clinicName}</Text>
      )}
      <Text style={styles.timerText}>{formatTimer(shiftSeconds)}</Text>

      <View style={styles.buttons}>
        <View style={styles.buttonsRow}>
          <Button
            title="Начать смену"
            icon={Play}
            onPress={start}
            disabled={isRunning || isPaused || loading || scanning || busy}
            style={styles.cell}
          />
          {isPaused ? (
            <Button
              title="Продолжить смену"
              icon={Play}
              onPress={start}
              disabled={loading || scanning || busy}
              style={styles.cell}
            />
          ) : (
            <Button
              title="Пауза"
              icon={Pause}
              variant="secondary"
              onPress={pause}
              disabled={!isRunning || busy}
              style={styles.cell}
            />
          )}
        </View>
        <Button
          title="Завершить смену"
          icon={Square}
          variant="danger"
          onPress={finish}
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
            <Smartphone size={48} color={colors.primary} />
            <Text style={styles.modalTitle}>
              Поднесите телефон к считывателю
            </Text>
            <Loader />
            <Button
              title="Отмена"
              variant="secondary"
              onPress={cancelScan}
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
    color: colors.muted,
  },
  greetingName: {
    fontWeight: "700",
    color: colors.primary,
  },
  clinicName: {
    fontSize: 16,
    color: colors.muted,
  },
  workedToday: {
    textAlign: "center",
    fontSize: 14,
    color: colors.muted,
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
    backgroundColor: colors.backdrop,
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: colors.white,
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
