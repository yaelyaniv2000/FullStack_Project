-- Optional display name for a shift (e.g. "טיסת בוקר"), per user UX feedback (2026-08-27).
-- Nullable/additive: existing shifts fall back to date/time display, same as `location` already
-- does -- not required, no backfill needed.
alter table shifts add column name text null;
