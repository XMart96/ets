import { router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import { changePassword } from "@/api/auth";
import { errorText } from "@/api/errors";
import Button from "@/components/Button";
import Input from "@/components/Input";
import KeyboardScrollView from "@/components/KeyboardScrollView";

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
      await changePassword(currentPassword, password);
      Alert.alert("Готово", "Пароль изменён", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert("Не удалось сменить пароль", errorText(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardScrollView contentContainerStyle={styles.container}>
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
    </KeyboardScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", padding: 20, gap: 16 },
  title: { fontSize: 22, fontWeight: "bold", textAlign: "center" },
});
