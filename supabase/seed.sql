-- Placeholder development data (per CLAUDE.md: synthetic, never the squadron's real personnel
-- data). Runs automatically after migrations on `supabase db reset` (see supabase/config.toml,
-- [db.seed] sql_paths). Replace with the squadron's real positions/qualifications through the
-- admin UI whenever that info arrives -- no code changes needed, this file just seeds a fresh
-- database so the app isn't empty out of the box.
--
-- Does NOT seed `profiles`/auth accounts -- those go through Supabase Auth's admin API (see
-- CLAUDE.md "Auth is email/password, admin-created accounts"), not a plain SQL insert, since
-- `profiles.id` references `auth.users.id`.

-- Qualifications ------------------------------------------------------------------------------

insert into qualifications (id, name, renewal_interval_days) values
  ('00000000-0000-0000-0000-000000000001', 'דרגה', null),
  ('00000000-0000-0000-0000-000000000002', 'מבצעיות', null),
  ('00000000-0000-0000-0000-000000000003', 'כשירות טיסה', 180);

insert into qualification_options (id, qualification_id, label, sort_order) values
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'סג״ם', 0),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'סג״ן', 1),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'סר״ן', 2),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000002', 'מבצעי בכיר', 0),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000002', 'מבצעי', 1);

-- Positions -------------------------------------------------------------------------------------

insert into positions (id, name) values
  ('00000000-0000-0000-0000-000000000101', 'טייס'),
  ('00000000-0000-0000-0000-000000000102', 'נווט קרב'),
  ('00000000-0000-0000-0000-000000000103', 'מכונאי');

-- required qualifications (option_id set where the qualification defines options)
insert into position_qualifications (position_id, qualification_id, option_id) values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013'), -- טייס requires דרגה=סר"ן
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012'), -- נווט קרב requires דרגה=סג"ן
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000022'), -- נווט קרב requires מבצעיות=מבצעי
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012'); -- מכונאי requires דרגה=סג"ן

-- fulfilling this position renews the worker's flight currency
insert into position_renews_qualifications (position_id, qualification_id) values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000003'), -- טייס renews כשירות טיסה
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000003'); -- נווט קרב renews כשירות טיסה

-- Shift templates -------------------------------------------------------------------------------

insert into shift_templates (id, name) values
  ('00000000-0000-0000-0000-000000000201', 'טיסת שגרה');

insert into shift_template_positions (template_id, position_id, headcount_needed) values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 1), -- 1 טייס
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000102', 2); -- 2 נווט קרב
