import { router } from "expo-router";
import { KeyRound, LogOut, Save, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import Button from "../components/Button";
import Input from "../components/Input";
import Loader from "../components/Loader";
import KeyboardScrollView from "../components/KeyboardScrollView";
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
        <Loader />
      </View>
    );
  }

  return (
    <KeyboardScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Редактировать профиль</Text>

      <Input placeholder="Имя" value={firstName} onChangeText={setFirstName} />
      <Input
        placeholder="Фамилия"
        value={lastName}
        onChangeText={setLastName}
      />

      <View style={styles.row}>
        <Button
          title="Сохранить"
          icon={Save}
          onPress={handleSave}
          loading={saving}
          style={styles.cell}
        />
        <Button
          title="Отмена"
          icon={X}
          variant="secondary"
          onPress={() => router.back()}
          disabled={saving}
          style={styles.cell}
        />
      </View>

      <View style={[styles.row, styles.footer]}>
        <Button
          title="Сменить пароль"
          icon={KeyRound}
          variant="secondary"
          onPress={() => router.push("/change-password")}
          disabled={saving || signingOut}
          style={styles.cell}
        />
        <Button
          title="Выйти"
          icon={LogOut}
          variant="danger"
          onPress={handleLogout}
          loading={signingOut}
          disabled={saving}
          style={styles.cell}
        />
      </View>
    </KeyboardScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", padding: 20, gap: 16 },
  title: { fontSize: 22, fontWeight: "bold", textAlign: "center" },
  row: { flexDirection: "row", gap: 12 },
  cell: { flex: 1 },
  footer: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
});
