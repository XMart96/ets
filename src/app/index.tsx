import { Link, router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AuthHeader from "../components/AuthHeader";
import Button from "../components/Button";
import Input from "../components/Input";
import KeyboardScrollView from "../components/KeyboardScrollView";
import { REDIRECT_URL, supabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Signed in: director goes to the report, employee to the timer if the
  // profile is filled in, profile setup otherwise.
  const routeAfterAuth = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (!data) router.replace("/profile-setup");
    else router.replace(data.role === "root" ? "/admin" : "/timer");
  };

  // Already signed in: skip the login screen.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) routeAfterAuth(data.session.user.id);
    });
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Ошибка", "Заполните все поля");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        // Registered but never confirmed: send a fresh link
        if (error.code === "email_not_confirmed") {
          await supabase.auth.resend({
            type: "signup",
            email: email.trim(),
            options: { emailRedirectTo: REDIRECT_URL },
          });
          router.push({
            pathname: "/verify-email",
            params: { email: email.trim() },
          });
          return;
        }
        Alert.alert("Ошибка входа", error.message);
        return;
      }

      await routeAfterAuth(data.user.id);
    } catch {
      Alert.alert("Ошибка", "Не удалось подключиться. Проверьте интернет.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardScrollView
        contentContainerStyle={styles.container}
      >
        <AuthHeader title="Вход" />

        <Input
          label="Логин"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
        />

        <Input
          label="Пароль"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          onSubmitEditing={handleLogin}
          returnKeyType="go"
        />

        <Button title="Войти" onPress={handleLogin} loading={loading} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Нет аккаунта? </Text>
          <Link href="/register" style={styles.link} replace>
            Регистрируйтесь
          </Link>
        </View>
      </KeyboardScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    gap: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
  },
  footerText: {
    fontSize: 14,
    color: "#333",
  },
  link: {
    fontSize: 14,
    fontWeight: "600",
    color: "#65BCE6",
  },
});
