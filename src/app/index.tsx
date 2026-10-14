import { Link, router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { currentUserId, signIn } from "@/api/auth";
import { ApiError, errorText } from "@/api/errors";
import { getMyProfile } from "@/api/profile";
import AuthHeader from "@/components/AuthHeader";
import Button from "@/components/Button";
import Input from "@/components/Input";
import KeyboardScrollView from "@/components/KeyboardScrollView";
import { colors } from "@/theme";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Signed in: director goes to the report, employee to the timer if the
  // profile is filled in, profile setup otherwise.
  const routeAfterAuth = async (userId: string) => {
    const profile = await getMyProfile(userId);
    if (!profile) router.replace("/profile-setup");
    else router.replace(profile.role === "root" ? "/admin" : "/timer");
  };

  // Already signed in: skip the login screen.
  useEffect(() => {
    currentUserId()
      .then((id) => (id ? routeAfterAuth(id) : undefined))
      .catch(() => {});
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Ошибка", "Заполните все поля");
      return;
    }

    setLoading(true);
    try {
      const user = await signIn(email.trim(), password);
      await routeAfterAuth(user.id);
    } catch (e) {
      // Registered but never confirmed: signIn already sent a fresh link
      if (e instanceof ApiError && e.code === "email_not_confirmed") {
        router.push({
          pathname: "/verify-email",
          params: { email: email.trim() },
        });
        return;
      }
      Alert.alert("Ошибка входа", errorText(e));
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
    color: colors.text,
  },
  link: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
});
