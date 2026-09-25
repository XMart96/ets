import { Link, Stack, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function VerifyEmail() {
  const { email } = useLocalSearchParams<{ email: string }>();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <Text style={styles.title}>Проверьте свою почту</Text>

      <Text style={styles.text}>Мы отправили ссылку для подтверждения на:</Text>

      <Text style={styles.email}>{email}</Text>

      <Text style={styles.text}>
        Перейдите по ссылке в письме, чтобы завершить регистрацию.
      </Text>

      <Link href="/" replace style={styles.link}>
        Вернуться ко входу
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  text: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
  },
  email: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  link: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
    textAlign: "center",
    marginTop: 10,
  },
});
