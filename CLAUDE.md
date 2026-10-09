@AGENTS.md
Summary

- Purpose: at end of month, admin/tracker gives director a report of hours worked per employee so director can pay hourly wages

Details
Clinic-switching for employees: undecided for now, leaving as open question
Geolocation buffer/radius: 100 meters (revised from earlier 20m/50m)
If employee leaves the clinic's geofence, the timer auto-stops
Decided on geolocation-based check-in over QR-code flow (location deemed more convenient)
Employees CAN change their assigned clinic (resolves earlier open question)
Location permission is mandatory — app has no fallback if user denies location access
Photos uploaded/stored in the database (Supabase)
Timer model: each Stop/Play creates separate time entries per day; daily total = sum of all entries (e.g. 8hr shift with 1hr break away = 7hr recorded)
Users can edit their profile (name, photo, clinic)
Open question: how to handle a stale/orphaned timer (app crash or dead battery leaving an entry without ended_at) — still needs to be decided
Registration flow: open registration — employees self-register (not admin-created accounts)
Auth flow built from scratch with Supabase: Login field = email; login screen has logo, email/password fields, "нет аккаунта? регистрируйтесь" link → register screen (email, password, repeat password) → email OTP code screen → profile fill-in screen
Starting with plain functional UI (no design polish yet)
Decided to disable Supabase "Confirm email" during dev (avoids deep-link/dev-client requirement in Expo Go) — signUp goes straight to /profile-setup; verify-email/auth-callback screens kept unused for later
Building a custom Button component (TypeScript) for the app's UI
Testing the app on a real iPhone via Expo Go, connecting through tunnel mode
Hit a geolocation bug: device location resolves to Sheremetyevo airport (Moscow) instead of the real position, suspected IP/network-based location fallback instead of GPS
Confirmed via real-device test (brother in Moscow, VPN required to reach Expo tunnel): pos.coords.accuracy shows very large values (network/IP fallback), not real GPS — Apple/Google Maps show wrong location (Sheremetyevo airport) while Yandex Maps shows correct location, suggesting VPN breaks IP-based location fallback but not Yandex's own positioning engine
Retested with native build via Xcode + cable (no VPN, no Expo dev infra) on brother's iPhone: bug still reproduces — accuracy shows 1500m and location resolves to the airport, so VPN was ruled out as the cause; root cause still under investigation (likely Wi-Fi Positioning System / cell-tower database issue, not VPN-related)
Retested via Expo tunnel over LTE (cellular data, not Wi-Fi) — same result (large accuracy, airport location) as the LAN/no-VPN test, ruling out Wi-Fi-specific and Expo-infra-specific causes; remaining likely cause is indoor GPS signal (not yet tested outdoors) or a genuine cell-tower/WPS database mislocation
Location bug attributed to GPS jamming/spoofing ("заглушки") in Moscow; considering replacing the geolocation check — options on the table: (1) QR-code scan at clinic entrance, (2) check that the phone is connected to the clinic's Wi-Fi. Discussing pros/cons as a plan only, no code yet
The clinics themselves are in Moscow, and location is unreliable everywhere there, so geolocation can't work in production; unknown whether clinics have a static external IP
Leaning to replace geolocation with a dynamic QR check-in: scan sends clinic + date/time to the server, code should be single-use; timer starts on scan
Main unsolved problem with the QR flow: how to know the employee left if they don't stop the timer (open, still deciding)
Ruled out geolocation and Wi-Fi as check-in methods (no workable options); QR still seen as having a hole (employee photographs the QR and sends it to a colleague), so looking for other alternatives
Confirmed with the clinics: each clinic has a static external IP; user is considering NFC tags as the main check-in method
Clinics work 24 hours a day and shifts vary (no fixed schedule), so auto-closing a forgotten timer by a fixed end-of-day time doesn't work
Per the clinics: shifts are mostly 12 hours, 9:00 to 21:00, and the working days vary between employees
Agreed on the overall plan: NFC tag tap at shift start (instead of geolocation), plain Stop button, auto-close at the end of the 9:00–21:00 shift template with flags for the director; static clinic IP used only as a soft flag
New idea being considered: smart door lock at the clinics, where opening the door starts the timer and leaving stops it (instead of or alongside the NFC tag flow)
Clinics have no separate staff entrance (staff and patients use the same door, patients are let in by intercom); considering fingerprint or face recognition instead of a chip/card for door or time-clock check-in
Clinics already have Hikvision CCTV cameras; exploring Hikvision face/fingerprint access terminals (e.g. DS-K1T342EFWX, with iVMS-4200 attendance reports instead of a custom app) and AI on the existing cameras as alternatives to the NFC flow
Bought NTAG215 NFC tags for the check-in flow; asking how to write data to them and what format goes to Supabase
Not planning to buy an Apple Developer account for now; plan: start with NTAG215 tags, later move to NTAG 424 DNA

## Revised MVP plan (2026-10-07)
Focus: minimal working product first, polish later
Registration: email + password only (Supabase "Confirm email" stays disabled in dev); clinic selection removed from registration and from profile
After registration: profile-setup screen with name only (photo postponed; working hours to be discussed later)
After login: user lands directly on the timer screen (Start / Stop); if profile is not filled, profile-setup comes first
User can edit profile (name) later
Start flow: tap Start → modal "Поднесите телефон к метке" → read clinic_id from NFC tag → send clinic_id + user to server; server sets started_at via now() (phone clock is NOT trusted, employees can change it) → timer starts, counting from server time
Stop flow: plain Stop button, server sets ended_at; no NFC at stop; no auto-close for now (to be handled later)
NFC tag stores only clinic_id (UUID from clinics table) as NDEF text; clinic name is fetched from server by id; tag NTAG215 is temporary, later NTAG 424 DNA (copyable until then, accepted risk)
clinics table stays; profile no longer linked to a clinic; clinic_id is stored on each time entry (from the tag)
Only one active timer at a time: Start button disabled while a timer is running; on app restart the active entry is loaded from the server and the timer continues
NFC does not work in Expo Go → needs a dev build (react-native-nfc-manager or similar; verify against Expo v57 docs). Test on Android first (APK via `expo run:android` or EAS Build); iOS NFC (Core NFC) needs a paid Apple Developer account, to be tested after purchase
