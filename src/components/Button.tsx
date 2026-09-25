import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";

type Variant = "primary" | "secondary" | "danger";

interface ButtonProps extends Omit<PressableProps, "style" | "children"> {
  title: string;
  variant?: Variant;
  loading?: boolean;
  style?: ViewStyle;
}

export default function Button({
  title,
  variant = "primary",
  loading = false,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: "#65BCE6" },
  secondary: { backgroundColor: "#64748b" },
  danger: { backgroundColor: "#dc2626" },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
  text: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
