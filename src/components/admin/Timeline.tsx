import { Text, View } from "react-native";
import { formatClock } from "@/lib/msk";
import type { Segment } from "@/lib/report";
import { styles } from "./styles";

// Two columns, one row per entry: start (or resume) on the left, its end on
// the right. An end followed by another entry is a pause, the last end is the
// end of the shift.
export default function Timeline({ segments }: { segments: Segment[] }) {
  return (
    <View style={styles.timeline}>
      {segments.map((seg, i) => (
        <View key={i} style={[styles.event, i > 0 && styles.eventRow]}>
          <Text style={[styles.eventCell, styles.eventCellLeft]}>
            {i === 0 ? "Начал смену" : "Продолжил смену"} -{" "}
            {formatClock(seg.start)}
          </Text>
          <Text style={styles.eventCell}>
            {seg.end === null
              ? ""
              : `${i < segments.length - 1 ? "Сделал паузу" : "Закончил смену"} - ${formatClock(seg.end)}`}
          </Text>
        </View>
      ))}
    </View>
  );
}
