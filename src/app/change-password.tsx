import { router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import Button from "../components/Button";
import Input from "../components/Input";
import { supabase } from "../lib/supabase";

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!currentPassword || !password || !repeatPassword) {
      Alert.alert("Ошибка", "Заполните все поля");
      return;
    }
    if (password !== repeatPassword) {
      Alert.alert("Ошибка", "Новые пароли не совпадают");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Ошибка", "Пароль должен быть не короче 6 символов");
      return;
    }
    if (password === currentPassword) {
      Alert.alert("Ошибка", "Новый пароль совпадает с текущим");
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email;
      if (!email) {
        Alert.alert("Ошибка", "Войдите в аккаунт заново");
        return;
      }

      // Confirm the current password before changing it
      const { error: checkError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (checkError) {
        Alert.alert("Ошибка", "Текущий пароль неверный");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        Alert.alert("Не удалось сменить пароль", error.message);
        return;
      }

      Alert.alert("Готово", "Пароль изменён", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("Ошибка", "Не удалось сменить пароль. Проверьте интернет.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Смена пароля</Text>

      <Input
        placeholder="Текущий пароль"
        value={currentPassword}
        onChangeText={setCurrentPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
      />
      <Input
        placeholder="Новый пароль"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
      />
      <Input
        placeholder="Повторите новый пароль"
        value={repeatPassword}
        onChangeText={setRepeatPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
      />

      <Button title="Сменить пароль" onPress={handleSave} loading={saving} />
      <Button
        title="Отмена"
        variant="secondary"
        onPress={() => router.back()}
        disabled={saving}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, gap: 16 },
  title: { fontSize: 22, fontWeight: "bold", textAlign: "center" },
});
