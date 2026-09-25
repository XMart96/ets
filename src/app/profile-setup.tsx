import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";
import { useClinics } from "../hooks/useClinics";
import { supabase } from "../lib/supabase";

export default function ProfileSetup() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { clinics, loading } = useClinics();

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim() || !clinicId) {
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
      clinic_id: clinicId,
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

      <TextInput
        style={styles.input}
        placeholder="Имя"
        value={firstName}
        onChangeText={setFirstName}
      />
      <TextInput
        style={styles.input}
        placeholder="Фамилия"
        value={lastName}
        onChangeText={setLastName}
      />

      {loading ? (
        <Text>Загрузка клиник...</Text>
      ) : (
        <Picker
          selectedValue={clinicId}
          onValueChange={setClinicId}
          style={styles.picker}
        >
          <Picker.Item label="Выберите клинику" value={null} />
          {clinics.map((c) => (
            <Picker.Item key={c.id} label={c.name} value={c.id} />
          ))}
        </Picker>
      )}

      <Button
        title={saving ? "Сохранение..." : "Сохранить"}
        onPress={handleSave}
        disabled={saving}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, gap: 16 },
  title: { fontSize: 22, fontWeight: "bold", textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
  },
  picker: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
  },
});
