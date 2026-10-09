import { router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import Button from "../components/Button";
import Input from "../components/Input";
import { supabase } from "../lib/supabase";

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

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      Alert.alert("Ошибка", "Не удалось получить пользователя");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("profiles").insert({
      id: userData.user.id,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
    });

    setSaving(false);

    if (error) {
      Alert.alert("Ошибка сохранения", error.message);
      return;
    }

    router.replace("/timer");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Заполните профиль</Text>

      <Input placeholder="Имя" value={firstName} onChangeText={setFirstName} />
      <Input
        placeholder="Фамилия"
        value={lastName}
        onChangeText={setLastName}
      />

      <Button title="Сохранить" onPress={handleSave} loading={saving} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, gap: 16 },
  title: { fontSize: 22, fontWeight: "bold", textAlign: "center" },
});
