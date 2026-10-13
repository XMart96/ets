import { Link, router, Stack } from "expo-router";
import { useState } from "react";
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

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email.trim() || !password || !repeatPassword) {
      Alert.alert("Ошибка", "Заполните все поля");
      return;
    }
    if (password !== repeatPassword) {
      Alert.alert("Ошибка", "Пароли не совпадают");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Ошибка", "Пароль должен быть не менее 6 символов");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: REDIRECT_URL },
      });

      if (error) {
        Alert.alert("Ошибка регистрации", error.message);
        return;
      }

      // For an already registered email Supabase returns no error but a user
      // without identities, and sends no code.
      if (data.user && data.user.identities?.length === 0) {
        Alert.alert("Ошибка", "Этот email уже зарегистрирован. Войдите.");
        return;
      }

      // "Confirm email" off: signed in right away
      if (data.session) {
        router.replace("/profile-setup");
        return;
      }

      router.push({
        pathname: "/verify-email",
        params: { email: email.trim() },
      });
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
        <AuthHeader title="Регистрация" />

        <Input
          label="Email"
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
          autoComplete="new-password"
          textContentType="newPassword"
        />

        <Input
          label="Повторите пароль"
          value={repeatPassword}
          onChangeText={setRepeatPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          onSubmitEditing={handleRegister}
          returnKeyType="go"
        />

        <Button
          title="Зарегистрироваться"
          onPress={handleRegister}
          loading={loading}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Зарегистрированы? </Text>
          <Link href="/" style={styles.link} replace>
            Войти
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
