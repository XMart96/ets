import * as Linking from "expo-linking";
import { Link, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { handleAuthUrl, isAuthLink } from "../../lib/authLink";

const TIMEOUT_MS = 10_000;

export default function AuthCallback() {
  const params = useLocalSearchParams<{ error?: string }>();
  const url = Linking.useURL();
  const [error, setError] = useState<string | null>(params.error ?? null);

  useEffect(() => {
    if (params.error) {
      setError(params.error);
      return;
    }

    let cancelled = false;
    const run = async (link: string | null) => {
      if (!isAuthLink(link)) return;
      const failure = await handleAuthUrl(link);
      if (cancelled) return;
      if (failure) setError(failure);
      else router.replace("/profile-setup");
    };

    run(url);
    Linking.getInitialURL().then(run);

    // never spin forever
    const timer = setTimeout(() => {
      if (!cancelled) setError("Не удалось обработать ссылку. Войдите заново.");
    }, TIMEOUT_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [url, params.error]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Ошибка подтверждения: {error}</Text>
        <Link href="/" replace style={styles.link}>
          Вернуться ко входу
        </Link>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    gap: 16,
  },
  text: { textAlign: "center", fontSize: 16 },
  link: { fontSize: 16, fontWeight: "600", color: "#007AFF" },
});
