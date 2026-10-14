import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { periodEntries, periodReport, type PeriodRow } from "@/api/admin";
import { errorText } from "@/api/errors";
import Loader from "@/components/Loader";
import { useReport } from "@/hooks/useReport";
import {
  DAY_MS,
  formatDayShort,
  formatDuration,
  formatWeek,
  MONTHS,
  monthBounds,
  mskDateString,
  mskMonthOf,
  mskWeekStart,
} from "@/lib/msk";
import { breakdownByDay, type DayBreakdown, type Period } from "@/lib/report";
import Timeline from "./Timeline";
import { styles } from "./styles";
import { colors } from "@/theme";

function PeriodPersonRow({
  row,
  period,
  first,
}: {
  row: PeriodRow;
  period: Period;
  first: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<DayBreakdown[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (!next || days) return;
    try {
      const entries = await periodEntries(
        row.user_id,
        mskDateString(period.from),
        mskDateString(period.to),
      );
      const serverNow = entries[0]
        ? Date.parse(entries[0].server_now)
        : Date.now();
      setError(null);
      setDays(breakdownByDay(entries, period, serverNow));
    } catch (e) {
      setError(errorText(e));
    }
  };

  const Chevron = open ? ChevronUp : ChevronDown;
  return (
    <View style={[styles.personBlock, first && styles.firstRow]}>
      <Pressable style={styles.row} onPress={toggle}>
        <View style={styles.flex}>
          <Text style={styles.name}>
            {row.last_name} {row.first_name}
          </Text>
          {row.has_active && <Text style={styles.sub}>Сейчас на смене</Text>}
        </View>
        <Text style={styles.hours}>{formatDuration(row.total_seconds)}</Text>
        <Chevron
          size={18}
          color={colors.muted}
          style={styles.chevron}
        />
      </Pressable>

      {open &&
        (error ? (
          <Text style={styles.error}>{error}</Text>
        ) : !days ? (
          <Loader size={22} style={styles.dayLoader} />
        ) : days.length === 0 ? (
          <Text style={styles.empty}>Нет записей</Text>
        ) : (
          <View>
            {days.map((d) => (
              <View key={d.day}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayTitle}>{formatDayShort(d.day)}</Text>
                  <Text style={styles.dayTotal}>{formatDuration(d.seconds)}</Text>
                </View>
                <Timeline
                  segments={d.pieces.map((p) => ({
                    start: p.from,
                    end: p.open ? null : p.to,
                    clinic: "",
                  }))}
                />
              </View>
            ))}
          </View>
        ))}
    </View>
  );
}

export default function PeriodReport({ kind }: { kind: "week" | "month" }) {
  // 0 = current week / month, -1 = previous, ...
  const [offset, setOffset] = useState(0);

  const nowMs = Date.now();
  let period: Period;
  let label: string;
  if (kind === "week") {
    const from = mskWeekStart(nowMs) + offset * 7 * DAY_MS;
    period = { from, to: from + 7 * DAY_MS };
    label = formatWeek(from);
  } else {
    const cur = mskMonthOf(nowMs);
    const t = cur.y * 12 + cur.m + offset;
    const month = { y: Math.floor(t / 12), m: ((t % 12) + 12) % 12 };
    period = monthBounds(month);
    label = `${MONTHS[month.m]} ${month.y}`;
  }
  const isCurrent = offset === 0;

  // the running timer keeps adding hours to the current period
  const { data, loading, refreshing, error, refresh } = useReport(
    () => periodReport(mskDateString(period.from), mskDateString(period.to)),
    `${period.from}-${period.to}`,
    isCurrent ? 60_000 : null,
  );
  const rows = data ?? [];

  return (
    <>
      <View style={styles.navigator}>
        <Pressable
          style={styles.navButton}
          onPress={() => setOffset(offset - 1)}
          hitSlop={8}
        >
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.navLabel}>{label}</Text>
        <Pressable
          style={[styles.navButton, isCurrent && styles.navDisabled]}
          onPress={() => setOffset(offset + 1)}
          disabled={isCurrent}
          hitSlop={8}
        >
          <ChevronRight size={24} color={colors.text} />
        </Pressable>
      </View>

      {loading ? (
        <Loader style={styles.center} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} />
          }
        >
          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.section}>
            {rows.length === 0 ? (
              <Text style={styles.empty}>Нет сотрудников</Text>
            ) : (
              rows.map((r, i) => (
                <PeriodPersonRow
                  key={r.user_id}
                  row={r}
                  period={period}
                  first={i === 0}
                />
              ))
            )}
          </View>
        </ScrollView>
      )}
    </>
  );
}
