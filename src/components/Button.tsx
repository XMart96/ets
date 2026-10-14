import type { LucideIcon } from "lucide-react-native";
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { colors } from "@/theme";

type Variant = "primary" | "secondary" | "danger";

interface ButtonProps extends Omit<PressableProps, "style" | "children"> {
  title: string;
  icon?: LucideIcon;
  variant?: Variant;
  loading?: boolean;
  style?: ViewStyle;
}

export default function Button({
  title,
  icon: Icon,
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
        <ActivityIndicator color={colors.white} />
      ) : (
        <View style={styles.content}>
          {Icon ? <Icon size={18} color={colors.white} /> : null}
          <Text style={styles.text} numberOfLines={1} adjustsFontSizeToFit>
            {title}
          </Text>
        </View>
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
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.secondary },
  danger: { backgroundColor: colors.danger },
  content: { flexDirection: "row", alignItems: "center", gap: 8 },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
  text: { color: colors.white, fontSize: 16, fontWeight: "600" },
});
