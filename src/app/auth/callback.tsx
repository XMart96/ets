import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { supabase } from "../../lib/supabase";

export default function AuthCallback() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handle = async () => {
      const url = await Linking.getInitialURL();
      if (!url) {
        setError("Ссылка не найдена");
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(url);

      if (error) {
        setError(error.message);
        return;
      }

      router.replace("/profile-setup");
    };

    handle();
  }, []);

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <Text>Ошибка подтверждения: {error}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
