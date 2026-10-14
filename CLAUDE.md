# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm install`, `npm start` (`expo start`), `npm run lint` (`expo lint`). No test runner is set up (tests deferred until requirements are agreed; later jest-expo). Type-check with `npx tsc --noEmit`.
- NFC (`react-native-nfc-manager`) does not work in Expo Go. Use a dev build: `npx expo run:android` or EAS (`eas.json` profiles: `development` / `preview` build Android APKs). UI-only work can still be checked in Expo Go (NFC is loaded lazily, see below).
- Env (in `.env`, gitignored): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- DB changes are SQL files in `supabase/migrations/` (dated names like `20261014_*.sql`), applied to the hosted Supabase project manually / via the Supabase MCP. There is no local Supabase stack.

## Architecture

Expo SDK 57 + expo-router (file-based, typed routes, React Compiler enabled), TypeScript strict, path alias `@/*` -> `src/*` (existing code mostly uses relative imports). All UI strings are Russian. Screens are in `src/app/`, shared UI in `src/components/` (`Button`, `Input`, `KeyboardScrollView`, `Loader`, `AuthHeader`), helpers in `src/lib/`.

**No custom backend: all business logic is Postgres RPCs / RLS in Supabase** (`supabase.rpc(...)` from screens; client in `src/lib/supabase.ts`, session persisted in AsyncStorage).
- `time_entries` (user_id, clinic_id, started_at, ended_at). A partial unique index allows one open entry (`ended_at is null`) per user. Server `now()` sets `started_at`/`ended_at`; the phone clock is never trusted.
- Employee RPCs: `start_timer(clinic_id)`, `stop_timer()`, `get_active_timer()` (returns `server_now` so the client can correct clock skew). Errors are raised as exception codes (`timer_already_running`, `no_active_timer`, `clinic_not_found`, `profile_missing`, ...) that the UI maps to messages.
- Admin ("root" role, `profiles.role`) RPCs: `day_overview`, `period_report`, `period_entries` (plus older `today_overview`, `monthly_report`); each checks `public.is_root()` and raises `forbidden`. Day/week/month boundaries are computed in `Europe/Moscow`. The client mirrors this in `src/lib/msk.ts` (fixed UTC+3).
- `profiles` grants are column-restricted so users can't change their own `role`; role is only set in the DB.
- Functions are `security definer` with `set search_path = ''`; keep that pattern in new migrations (and revoke from `public, anon`, grant to `authenticated`).

**Routing/auth flow**: `index.tsx` is login; after sign-in it routes by profile: no profile -> `/profile-setup`, role `root` -> `/admin`, else `/timer`. `_layout.tsx` handles the email-confirmation deep link (`src/lib/authLink.ts`, `auth/callback`, `verify-email`), so the link works even before the callback screen mounts.

**Timer screen (`timer.tsx`)**: Start/resume requires an NFC tap; the tag holds the clinic UUID as an NDEF text record (`src/lib/nfc.ts` `readClinicId`, validates UUID). "Pause" closes the server entry and "resume" opens a new one (must be in the same clinic as the paused one); paused/finished-shift state is saved locally for the day. Active entry is restored from `get_active_timer` on app start. `nfc.ts` uses lazy `require` guarded by `NativeModules.NfcManager` because importing the library in Expo Go crashes with a red screen even inside try/catch.

## Product decisions

- Цель: в конце месяца отчёт по часам каждого сотрудника для директора (почасовая оплата).
- Регистрация открытая (email + пароль, подтверждение по ссылке). Профиль: только имя, редактируется. Клиника в профиле не хранится, берётся из NFC-метки. Фото отложено.
- Чек-ин только через NFC-метку. Геолокацию НЕ использовать: в Москве координаты ненадёжны (определялся аэропорт Шереметьево). QR, Wi-Fi, Hikvision, умные замки рассмотрены и отклонены.
- Метки: сейчас NTAG215 (копируются, риск принят), позже NTAG 424 DNA. iOS NFC (Core NFC) требует платный Apple Developer аккаунт; он куплен (2026-10-13), основной тест на iPhone.
- Каждый Start/Pause создаёт отдельную запись, дневной итог = сумма записей за день.
- Смены в основном 12 ч (9:00-21:00), клиники работают круглосуточно, график у сотрудников разный.
- Статичный внешний IP клиник можно использовать только как мягкий флаг, не как проверку.

## Open questions

- Забытый/осиротевший таймер (краш, сел телефон, нет ended_at): как закрывать. Автозакрытия пока нет.
- Нужны ли флаги для директора по подозрительным записям.
