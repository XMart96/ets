import { currentUserId } from "@/api/auth";
import { getClinicName } from "@/api/clinics";
import { errorText } from "@/api/errors";
import { getMyProfile } from "@/api/profile";
import {
  getActiveTimer,
  getClosedMsSince,
  startTimer,
  stopTimer,
} from "@/api/timer";
import { cancelNfcScan, NfcError, readClinicId } from "@/lib/nfc";
import { mskDateString, mskDayStart } from "@/lib/msk";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

type ActiveTimer = {
  clinicId: string;
  startedAt: number; // server timestamp, ms
  clinicName: string | null;
};

// Paused / finished-shift state is kept per user: several accounts can use one phone
const LEGACY_SHIFT_KEY = "shift_state"; // was shared by all users
const shiftKey = (userId: string) => `shift_state:${userId}`;

/**
 * State and actions of the employee's timer screen. A shift is a series of
 * server entries: start / resume opens one (NFC tap), pause closes it, finish
 * closes it and resets the big timer. "Today" is the Moscow day, like in the
 * director's reports.
 */
export function useShiftTimer() {
  const [active, setActive] = useState<ActiveTimer | null>(null);
  // server clock minus phone clock, and the phone time of the last tick
  const [clockOffset, setClockOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  // Paused: the entry is closed on the server, "resume" opens a new one in the
  // same clinic. Kept on the phone only.
  const [pausedClinicId, setPausedClinicId] = useState<string | null>(null);
  // Sum of today's closed entries, seconds
  const [closedSeconds, setClosedSeconds] = useState(0);
  // Today's worked time when the last shift was finished: the big timer shows
  // only the current shift, the line at the top shows the whole day
  const [shiftOffset, setShiftOffset] = useState(0);
  const [restored, setRestored] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");

  // the same offset for async callbacks (the phone time can be changed by the user)
  const offsetRef = useRef(0);
  // Closed time of the Moscow day `closedDayRef` (start of that day, ms). Kept
  // up to date locally on pause / finish; reloaded when the day has changed.
  const closedMsRef = useRef(0);
  const closedDayRef = useRef<number | null>(null);

  // Reload on focus: the name can change on the profile edit screen
  useFocusEffect(
    useCallback(() => {
      getMyProfile()
        .then((profile) => {
          if (profile) setUserName(profile.firstName);
        })
        .catch(() => {});
    }, []),
  );

  const setClosed = useCallback((ms: number, dayStart: number) => {
    closedMsRef.current = ms;
    closedDayRef.current = dayStart;
    const seconds = Math.floor(ms / 1000);
    setClosedSeconds(seconds);
    return seconds;
  }, []);

  // Today's worked time = sum of all today's entries (closed ones here, the
  // running one is added by the ticker). On a failed request keeps the old value.
  const refreshToday = useCallback(async () => {
    try {
      const dayStart = mskDayStart(Date.now() + offsetRef.current);
      return setClosed(await getClosedMsSince(dayStart), dayStart);
    } catch {
      return Math.floor(closedMsRef.current / 1000);
    }
  }, [setClosed]);

  // Restore the paused / finished-shift state saved earlier today
  useEffect(() => {
    (async () => {
      try {
        AsyncStorage.removeItem(LEGACY_SHIFT_KEY).catch(() => {});
        const uid = await currentUserId();
        setUserId(uid);
        const raw = uid ? await AsyncStorage.getItem(shiftKey(uid)) : null;
        const saved = raw ? JSON.parse(raw) : null;
        if (saved?.day === mskDateString(Date.now())) {
          setShiftOffset(saved.offset ?? 0);
          setPausedClinicId(saved.pausedClinicId ?? null);
        }
      } catch {
        // nothing saved
      }
      setRestored(true);
    })();
  }, []);

  useEffect(() => {
    if (!restored || !userId) return;
    AsyncStorage.setItem(
      shiftKey(userId),
      JSON.stringify({
        day: mskDateString(Date.now()),
        offset: shiftOffset,
        pausedClinicId,
      }),
    ).catch(() => {});
  }, [restored, userId, shiftOffset, pausedClinicId]);

  const activate = (timer: ActiveTimer, offset: number) => {
    setClockOffset(offset);
    setNow(Date.now());
    setActive(timer);
  };

  // Resume a running timer after app restart
  useEffect(() => {
    (async () => {
      try {
        const entry = await getActiveTimer();
        if (entry) {
          offsetRef.current = entry.clockOffset;
          activate(
            {
              clinicId: entry.clinicId,
              startedAt: entry.startedAt,
              clinicName: await getClinicName(entry.clinicId),
            },
            entry.clockOffset,
          );
        }
      } catch {
        // offline: the screen stays idle
      }
      await refreshToday();
      setLoading(false);
    })();
  }, [refreshToday]);

  // Ticks once a second while a timer is running
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  const running = active
    ? Math.max(0, Math.floor((now + clockOffset - active.startedAt) / 1000))
    : 0;
  const daySeconds = closedSeconds + running;

  const startWithClinic = useCallback(
    async (clinicId: string) => {
      let entry;
      try {
        entry = await startTimer(clinicId);
      } catch (e) {
        Alert.alert("Не удалось начать", errorText(e));
        return;
      }
      offsetRef.current = entry.clockOffset;
      // The total is already known; reload only if the app stayed open past midnight
      if (closedDayRef.current !== mskDayStart(Date.now() + entry.clockOffset)) {
        await refreshToday();
      }
      setPausedClinicId(null);
      activate(
        {
          clinicId,
          startedAt: entry.startedAt,
          clinicName: await getClinicName(clinicId),
        },
        entry.clockOffset,
      );
    },
    [refreshToday],
  );

  // Start or resume: needs an NFC tap
  const start = async () => {
    setScanning(true);
    try {
      const clinicId = await readClinicId();
      // After a pause the shift can only continue in the same clinic; to work
      // in another one the shift has to be finished first
      if (pausedClinicId && clinicId !== pausedClinicId) {
        const name = await getClinicName(pausedClinicId);
        Alert.alert(
          "Другая клиника",
          `Вы начали смену${name ? ` в клинике «${name}»` : ""}. Чтобы начать в другой клинике, сначала завершите смену.`,
        );
        return;
      }
      await startWithClinic(clinicId);
    } catch (e) {
      // A cancelled scan is not an error worth showing
      if (e instanceof NfcError) {
        Alert.alert("Метка не считана", e.message);
      }
    } finally {
      setScanning(false);
    }
  };

  const cancelScan = async () => {
    await cancelNfcScan();
    setScanning(false);
  };

  // Closes the running entry on the server and adds it to today's total
  // (without a request, unless the entry ended on another day than the total)
  const closeEntry = async () => {
    let entry;
    try {
      entry = await stopTimer();
    } catch (e) {
      Alert.alert("Не удалось остановить", errorText(e));
      return null;
    }
    const dayStart = mskDayStart(entry.endedAt);
    if (closedDayRef.current !== dayStart) return refreshToday();
    const added = Math.max(0, entry.endedAt - Math.max(entry.startedAt, dayStart));
    return setClosed(closedMsRef.current + added, dayStart);
  };

  const pause = async () => {
    if (!active) return;
    setBusy(true);
    const clinicId = active.clinicId;
    if ((await closeEntry()) !== null) {
      setActive(null);
      setPausedClinicId(clinicId);
    }
    setBusy(false);
  };

  const finishShift = async () => {
    setBusy(true);
    const total = active ? await closeEntry() : closedSeconds;
    if (total !== null) {
      setActive(null);
      setPausedClinicId(null);
      // restart the big timer from zero; the day total stays
      setShiftOffset(total);
    }
    setBusy(false);
  };

  const finish = () => {
    Alert.alert("Завершить смену?", "Таймер будет остановлен.", [
      { text: "Отмена", style: "cancel" },
      { text: "Завершить", style: "destructive", onPress: finishShift },
    ]);
  };

  return {
    userName,
    active,
    loading,
    scanning,
    busy,
    isRunning: active !== null,
    isPaused: pausedClinicId !== null,
    daySeconds,
    shiftSeconds: Math.max(0, daySeconds - shiftOffset),
    start,
    cancelScan,
    pause,
    finish,
  };
}
