import { NativeModules } from "react-native";
import type * as NfcLib from "react-native-nfc-manager";

// Loaded lazily and only if the native module exists: in Expo Go importing the
// library throws at load time, and Metro shows that as a fatal red screen even
// when it is wrapped in try/catch.
function loadNfc(): typeof NfcLib {
  if (!NativeModules.NfcManager) {
    throw new NfcError("NFC недоступен в этой сборке. Нужен dev build.");
  }
  return require("react-native-nfc-manager");
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class NfcError extends Error {}

/**
 * Waits for an NFC tag and returns the clinic id stored on it
 * (NDEF text record with the clinic UUID).
 * Call cancelNfcScan() to abort a pending scan.
 */
export async function readClinicId(): Promise<string> {
  const { default: NfcManager, Ndef, NfcTech } = loadNfc();

  let supported = false;
  try {
    supported = await NfcManager.isSupported();
  } catch {
    throw new NfcError("NFC недоступен в этой сборке. Нужен dev build.");
  }
  if (!supported) throw new NfcError("Этот телефон не поддерживает NFC");

  await NfcManager.start();
  if (!(await NfcManager.isEnabled())) {
    throw new NfcError("NFC выключен. Включите его в настройках телефона");
  }

  try {
    await NfcManager.requestTechnology(NfcTech.Ndef, {
      alertMessage: "Поднесите телефон к метке",
    });
    const tag = await NfcManager.getTag();
    const record = tag?.ndefMessage?.[0];
    if (!record) throw new NfcError("Метка пустая");

    const text = Ndef.text.decodePayload(new Uint8Array(record.payload)).trim();
    if (!UUID_RE.test(text)) throw new NfcError("Это не метка клиники");
    return text.toLowerCase();
  } finally {
    await NfcManager.cancelTechnologyRequest().catch(() => {});
  }
}

export async function cancelNfcScan() {
  try {
    await loadNfc().default.cancelTechnologyRequest();
  } catch {
    // nothing to cancel
  }
}
