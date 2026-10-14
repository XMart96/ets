-- Geolocation was dropped in favour of NFC tags: the clinic is read from the tag.
-- Nothing in the app or in other functions / policies / views uses these.
alter table public.clinics
  drop column latitude,
  drop column longitude,
  drop column radius_meters;

-- Replaced by day_overview(p_day) and period_report(p_from, p_to); no longer called.
drop function if exists public.today_overview();
drop function if exists public.monthly_report(date);
