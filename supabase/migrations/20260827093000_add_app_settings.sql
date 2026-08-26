-- General app settings (not scheduling-specific -- see docs/technical-plan.md's
-- features/settings/ note for why this is deliberately separate from scheduling_constraints).
-- First value: expiring_soon_days, replacing the hardcoded EXPIRING_SOON_DAYS placeholder in
-- features/worker-qualifications/queries.ts. Explicit typed columns, not a generic key/value
-- table -- matches the convention already used for scheduling_constraints (a fixed, known set of
-- settings, not an open-ended list an admin can invent from the UI).

create table app_settings (
  id                  uuid primary key default gen_random_uuid(),
  expiring_soon_days  integer not null default 30,
  updated_at          timestamptz not null default now()
);

-- Enforce a true singleton: at most one row, ever. The `(true)` expression is constant for every
-- row, so a unique index on it allows only one row to exist.
create unique index app_settings_singleton on app_settings ((true));

insert into app_settings (expiring_soon_days) values (30);

alter table app_settings enable row level security;

-- Not sensitive (just a display threshold), and a worker-facing page could reasonably want to
-- read it later (e.g. to flag their own expiring-soon qualifications the same way the admin
-- dashboard does) -- so read access matches qualifications/positions/availability_windows
-- (everyone), not the admin-only shape used for scheduling_constraints/worker_pairing_preferences.
create policy app_settings_select on app_settings
  for select using (true);
create policy app_settings_admin_update on app_settings
  for update using (is_admin()) with check (is_admin());
-- No insert/delete policy: the singleton is seeded once by this migration and never recreated or
-- removed, so those operations stay default-denied for `authenticated`.

grant select, update on app_settings to authenticated;
grant select, update, insert, delete on app_settings to service_role;
