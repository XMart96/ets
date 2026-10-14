import { Link, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { resendConfirmation } from "@/api/auth";
import { errorText } from "@/api/errors";
import Button from "@/components/Button";
import { colors } from "@/theme";

const RESEND_SECONDS = 60;

export default function VerifyEmail() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const handleResend = async () => {
    try {
      await resendConfirmation(email);
    } catch (e) {
      Alert.alert("Не удалось отправить", errorText(e));
      return;
    }
    setCooldown(RESEND_SECONDS);
    Alert.alert("Готово", "Новое письмо отправлено");
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <Text style={styles.title}>Проверьте свою почту</Text>

      <Text style={styles.text}>Мы отправили ссылку для подтверждения на:</Text>

      <Text style={styles.email}>{email}</Text>

      <Text style={styles.text}>
        Откройте письмо на этом телефоне и перейдите по ссылке, чтобы завершить
        регистрацию.
      </Text>

      <Button
        title={
          cooldown > 0
            ? `Отправить письмо ещё раз (${cooldown})`
            : "Отправить письмо ещё раз"
        }
        variant="secondary"
        onPress={handleResend}
        disabled={cooldown > 0}
      />

      <Link href="/" replace style={styles.link}>
        Вернуться ко входу
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, gap: 16 },
  title: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  text: { fontSize: 16, color: colors.muted, textAlign: "center", lineHeight: 24 },
  email: { fontSize: 16, fontWeight: "600", textAlign: "center" },
  link: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.link,
    textAlign: "center",
    marginTop: 10,
  },
});
