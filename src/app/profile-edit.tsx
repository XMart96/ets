import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import Button from "../components/Button";
import { useClinics } from "../hooks/useClinics";
import { supabase } from "../lib/supabase";

export default function ProfileEdit() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const { clinics, loading: clinicsLoading } = useClinics();

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, clinic_id")
        .eq("id", userData.user.id)
        .single();

      if (!error && data) {
        setFirstName(data.first_name);
        setLastName(data.last_name);
        setClinicId(data.clinic_id);
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim() || !clinicId) {
      Alert.alert("Заполните все поля");
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          clinic_id: clinicId,
        })
        .eq("id", userData.user.id);

      if (error) {
        Alert.alert("Ошибка сохранения", error.message);
        return;
      }

      router.back();
    } catch {
      Alert.alert("Ошибка", "Не удалось сохранить. Проверьте интернет.");
    } finally {
      setSaving(false);
    }
  };

  const signOut = async () => {
    setSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        Alert.alert("Ошибка выхода", error.message);
        return;
      }
      router.replace("/");
    } catch {
      Alert.alert("Ошибка", "Не удалось выйти. Проверьте интернет.");
    } finally {
      setSigningOut(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Выход", "Вы действительно хотите выйти из аккаунта?", [
      { text: "Отмена", style: "cancel" },
      { text: "Выйти", style: "destructive", onPress: signOut },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Загрузка...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Редактировать профиль</Text>

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

      {clinicsLoading ? (
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

      <Button title="Сохранить" onPress={handleSave} loading={saving} />
      <Button
        title="Отмена"
        variant="secondary"
        onPress={() => router.back()}
        disabled={saving}
      />

      <View style={styles.footer}>
        <Button
          title="Выйти из аккаунта"
          variant="danger"
          onPress={handleLogout}
          loading={signingOut}
          disabled={saving}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, gap: 16 },
  title: { fontSize: 22, fontWeight: "bold", textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 },
  picker: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8 },
  footer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
});
