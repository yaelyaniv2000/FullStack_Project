-- Row-Level Security policies, turning the permissions table in docs/architecture.md into
-- actually enforced database rules. See CLAUDE.md for why RLS is the real security boundary
-- here, not just a UI-level check.

-- Base privilege grants first: recall the project has "automatically expose new tables"
-- disabled (see the Supabase project setup conversation) -- new tables get zero API privileges
-- by default. We grant broadly to `authenticated` here and let RLS do the fine-grained
-- restriction, which is the standard Supabase pattern. `anon` gets nothing: every table requires
-- being logged in.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Reusable helper so "is this user an admin?" isn't repeated in ~20 policies.
-- security definer + a pinned search_path: this function must be able to read `profiles`
-- regardless of the calling user's own RLS, and pinning search_path avoids the classic
-- SECURITY DEFINER search-path-injection pitfall.
create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- profiles: read own row, or any row if admin. Only admins may update (not even a worker's own
-- row in v1 -- prevents a worker editing their own `role`). No insert/delete policy: accounts
-- are created server-side via the service role (see docs/technical-plan.md), which bypasses RLS
-- entirely -- there is deliberately no path for a regular authenticated client to create one.
create policy profiles_select on profiles
  for select using (id = auth.uid() or is_admin());
create policy profiles_admin_update on profiles
  for update using (is_admin()) with check (is_admin());

-- qualifications: everyone (any logged-in user) can read; only admins can write.
create policy qualifications_select on qualifications
  for select using (true);
create policy qualifications_admin_write on qualifications
  for all using (is_admin()) with check (is_admin());

-- positions: same shape as qualifications.
create policy positions_select on positions
  for select using (true);
create policy positions_admin_write on positions
  for all using (is_admin()) with check (is_admin());

-- position_qualifications / position_renews_qualifications: join tables, same read-all/admin-write shape.
create policy position_qualifications_select on position_qualifications
  for select using (true);
create policy position_qualifications_admin_write on position_qualifications
  for all using (is_admin()) with check (is_admin());

create policy position_renews_qualifications_select on position_renews_qualifications
  for select using (true);
create policy position_renews_qualifications_admin_write on position_renews_qualifications
  for all using (is_admin()) with check (is_admin());

-- worker_qualifications: a worker can read their own; admin reads all. A worker may self-report
-- ONLY a pending/self_reported row for themselves -- the WITH CHECK is what actually enforces
-- that, not just app-level convention, so a worker can't insert a row claiming to already be
-- approved or admin_granted. Only admins can update (approve/reject/revoke).
create policy worker_qualifications_select on worker_qualifications
  for select using (worker_id = auth.uid() or is_admin());
create policy worker_qualifications_self_report on worker_qualifications
  for insert with check (
    worker_id = auth.uid() and source = 'self_reported' and status = 'pending'
  );
create policy worker_qualifications_admin_grant on worker_qualifications
  for insert with check (is_admin());
create policy worker_qualifications_admin_review on worker_qualifications
  for update using (is_admin()) with check (is_admin());

-- shift_templates / shift_template_positions: admin tooling only -- workers have no visibility
-- into these at all (no select policy for them means the default-deny RLS behaviour applies).
create policy shift_templates_admin_all on shift_templates
  for all using (is_admin()) with check (is_admin());
create policy shift_template_positions_admin_all on shift_template_positions
  for all using (is_admin()) with check (is_admin());

-- availability_windows: everyone can read (needed to know a window is open); admin writes.
create policy availability_windows_select on availability_windows
  for select using (true);
create policy availability_windows_admin_write on availability_windows
  for all using (is_admin()) with check (is_admin());

-- shifts / shift_positions: everyone can read -- this is what availability submission needs
-- (seeing what shifts/positions exist), and a shift's existence isn't sensitive by itself; only
-- *assignments* (who's actually working it) are gated by publish status, below.
create policy shifts_select on shifts
  for select using (true);
create policy shifts_admin_write on shifts
  for all using (is_admin()) with check (is_admin());

create policy shift_positions_select on shift_positions
  for select using (true);
create policy shift_positions_admin_write on shift_positions
  for all using (is_admin()) with check (is_admin());

-- availability: a worker reads/writes only their own responses; admin can read all (but does not
-- submit availability on a worker's behalf, per docs/technical-plan.md's CRUD table).
create policy availability_select on availability
  for select using (worker_id = auth.uid() or is_admin());
create policy availability_insert on availability
  for insert with check (worker_id = auth.uid());
create policy availability_update on availability
  for update using (worker_id = auth.uid()) with check (worker_id = auth.uid());

-- assignments: THE rule that's a timing check, not just a role check. A worker may only see
-- their own assignment once its shift has been published -- never before, even though it's
-- "their own" row. Admins can see/write everything regardless of publish state (that's the
-- whole point of the review-before-publish step).
create policy assignments_select on assignments
  for select using (
    is_admin()
    or (
      worker_id = auth.uid()
      and exists (
        select 1 from shifts s
        where s.id = assignments.shift_id and s.published_at is not null
      )
    )
  );
create policy assignments_admin_write on assignments
  for all using (is_admin()) with check (is_admin());

-- notifications: a worker reads/marks-read only their own; only admins create them (the publish
-- flow runs as the admin's own session, writing notifications for other workers).
create policy notifications_select on notifications
  for select using (worker_id = auth.uid() or is_admin());
create policy notifications_update on notifications
  for update using (worker_id = auth.uid() or is_admin()) with check (worker_id = auth.uid() or is_admin());
create policy notifications_admin_insert on notifications
  for insert with check (is_admin());