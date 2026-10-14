import { router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import { errorText } from "@/api/errors";
import { createProfile } from "@/api/profile";
import Button from "@/components/Button";
import Input from "@/components/Input";
import KeyboardScrollView from "@/components/KeyboardScrollView";

export default function ProfileSetup() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Заполните все поля");
      return;
    }

    setSaving(true);
    try {
      await createProfile(firstName.trim(), lastName.trim());
      router.replace("/timer");
    } catch (e) {
      Alert.alert("Ошибка сохранения", errorText(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Заполните профиль</Text>

      <Input placeholder="Имя" value={firstName} onChangeText={setFirstName} />
      <Input
        placeholder="Фамилия"
        value={lastName}
        onChangeText={setLastName}
      />

      <Button title="Сохранить" onPress={handleSave} loading={saving} />
    </KeyboardScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", padding: 20, gap: 16 },
  title: { fontSize: 22, fontWeight: "bold", textAlign: "center" },
});
