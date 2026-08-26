-- Phase 5: scheduling engine data model, part 1 -- constraints (with per-worker-category
-- overrides) and worker pairing preferences. Design finalized 2026-08-26 (see CLAUDE.md's
-- scheduling-constraints bullet and docs/technical-plan.md's "Scheduling engine" section for the
-- full reasoning). Not created in the original core-schema migration -- this is genuinely
-- Phase 5 scope, not Phase 2, despite having been documented since the original technical plan.

create table scheduling_constraints (
  id                       uuid primary key default gen_random_uuid(),
  type                     text not null check (type in ('min_rest_hours', 'max_shifts_per_window')),
  qualification_option_id  uuid null references qualification_options(id) on delete cascade,
  enabled                  boolean not null default false,
  value                    numeric not null,
  updated_at               timestamptz not null default now()
);

-- At most one default (global) row per type, at most one override row per (type, option). A
-- plain UNIQUE constraint can't carry a WHERE clause, so these are partial indexes -- same
-- technique as worker_qualifications_active_unique in the core schema migration.
create unique index scheduling_constraints_default_unique
  on scheduling_constraints (type)
  where qualification_option_id is null;
create unique index scheduling_constraints_override_unique
  on scheduling_constraints (type, qualification_option_id)
  where qualification_option_id is not null;

alter table scheduling_constraints enable row level security;

-- Admin-only, both read and write -- unlike qualifications/positions, workers never need to see
-- this (it's an internal algorithm parameter, not something relevant to self-reporting or
-- browsing), same shape as shift_templates.
create policy scheduling_constraints_select on scheduling_constraints
  for select using (is_admin());
create policy scheduling_constraints_admin_write on scheduling_constraints
  for all using (is_admin()) with check (is_admin());

-- New table needs its own explicit grants -- GRANT ... ON ALL TABLES from earlier migrations
-- only applied to tables that existed at the time it ran (see CLAUDE.md's service_role lesson).
grant select, insert, update, delete on scheduling_constraints to authenticated;
grant select, insert, update, delete on scheduling_constraints to service_role;

-- Seed the two known constraint types' default (global) rows, disabled -- an admin who hasn't
-- opted in gets exactly today's behavior (see docs/technical-plan.md's "Scheduling engine"
-- section). Values are placeholders the admin tunes via /admin/settings before enabling.
insert into scheduling_constraints (type, qualification_option_id, enabled, value) values
  ('min_rest_hours', null, false, 8),
  ('max_shifts_per_window', null, false, 5);

-- Worker pairing preferences -- relational (depends who else is on a shift), not per-worker, so
-- it doesn't fit scheduling_constraints above. Three types: avoid (hard), prefer_avoid (soft),
-- prefer (soft) -- see docs/technical-plan.md for exactly how each affects the heuristic.
create table worker_pairing_preferences (
  id            uuid primary key default gen_random_uuid(),
  worker_id_1   uuid not null references profiles(id) on delete cascade,
  worker_id_2   uuid not null references profiles(id) on delete cascade,
  preference    text not null check (preference in ('avoid', 'prefer_avoid', 'prefer')),
  created_at    timestamptz not null default now(),
  -- Canonical ordering: one row per pair regardless of which worker was picked first in the UI,
  -- and a pair holds exactly one preference at a time (enforced by the unique constraint below).
  check (worker_id_1 < worker_id_2),
  unique (worker_id_1, worker_id_2)
);

alter table worker_pairing_preferences enable row level security;

-- Admin-only -- workers must never see who's flagged to avoid/prefer pairing with whom.
create policy worker_pairing_preferences_select on worker_pairing_preferences
  for select using (is_admin());
create policy worker_pairing_preferences_admin_write on worker_pairing_preferences
  for all using (is_admin()) with check (is_admin());

grant select, insert, update, delete on worker_pairing_preferences to authenticated;
grant select, insert, update, delete on worker_pairing_preferences to service_role;
