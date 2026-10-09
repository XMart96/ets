import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import Button from "../components/Button";
import Input from "../components/Input";
import { supabase } from "../lib/supabase";

export default function ProfileEdit() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", userData.user.id)
        .single();

      if (!error && data) {
        setFirstName(data.first_name);
        setLastName(data.last_name);
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
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

      <Input placeholder="Имя" value={firstName} onChangeText={setFirstName} />
      <Input
        placeholder="Фамилия"
        value={lastName}
        onChangeText={setLastName}
      />

      <Button title="Сохранить" onPress={handleSave} loading={saving} />
      <Button
        title="Отмена"
        variant="secondary"
        onPress={() => router.back()}
        disabled={saving}
      />

      <View style={styles.footer}>
        <Button
          title="Сменить пароль"
          variant="secondary"
          onPress={() => router.push("/change-password")}
          disabled={saving || signingOut}
        />
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
  footer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    gap: 16,
  },
});
