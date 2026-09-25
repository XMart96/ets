// components/AuthHeader.tsx
import { Image, StyleSheet, Text, View } from "react-native";

interface AuthHeaderProps {
  title: string;
}

export default function AuthHeader({ title }: AuthHeaderProps) {
  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/images/logo.png")}
        style={styles.logo}
      />
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  logo: {
    width: "100%",
    height: 100,
    resizeMode: "contain",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    color: "#65BCE6",
  },
});
