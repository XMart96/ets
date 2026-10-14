import { ChevronDown, ChevronUp } from "lucide-react-native";
import { ReactNode, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { styles } from "./styles";
import { colors } from "@/theme";

export default function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const Chevron = open ? ChevronUp : ChevronDown;
  return (
    <View style={styles.section}>
      <Pressable style={styles.sectionHeader} onPress={() => setOpen(!open)}>
        <Text style={styles.sectionTitle}>
          {title} ({count})
        </Text>
        <Chevron
          size={22}
          color={colors.text}
        />
      </Pressable>
      {open &&
        (count === 0 ? <Text style={styles.empty}>Никого</Text> : children)}
    </View>
  );
}
