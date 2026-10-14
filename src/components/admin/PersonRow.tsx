import { ChevronDown, ChevronUp } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { formatDuration } from "@/lib/msk";
import type { Segment } from "@/lib/report";
import Timeline from "./Timeline";
import { styles } from "./styles";
import { colors } from "@/theme";

export type Person = {
  userId: string;
  name: string;
  clinic: string;
  from: number; // shift start (active) or first start of the day (finished), ms
  seconds: number; // worked that day
  segments: Segment[]; // the day's entries in order
};

export default function PersonRow({ person, sub }: { person: Person; sub: string }) {
  const [open, setOpen] = useState(false);
  const Chevron = open ? ChevronUp : ChevronDown;
  return (
    <View style={styles.personBlock}>
      <Pressable style={styles.row} onPress={() => setOpen(!open)}>
        <View style={styles.flex}>
          <Text style={styles.name}>{person.name}</Text>
          <Text style={styles.sub}>{sub}</Text>
        </View>
        <Text style={styles.hours}>{formatDuration(person.seconds)}</Text>
        <Chevron
          size={18}
          color={colors.muted}
          style={styles.chevron}
        />
      </Pressable>
      {open && <Timeline segments={person.segments} />}
    </View>
  );
}
