-- Lets a worker flag "I marked available but can't actually make it" after an availability
-- window has closed (when they can no longer just toggle their response) -- per user feedback
-- (2026-08-28). The admin sees it, acknowledges it, and makes (or doesn't make) the resulting
-- schedule change manually -- this table is a flag + audit trail, not an automated reassignment.

create table availability_change_requests (
  id             uuid primary key default gen_random_uuid(),
  worker_id      uuid not null references profiles(id) on delete cascade,
  shift_id       uuid not null references shifts(id) on delete cascade,
  message        text null,
  created_at     timestamptz not null default now(),
  acknowledged_at timestamptz null,
  acknowledged_by uuid null references profiles(id)
);

create index availability_change_requests_shift_id_idx on availability_change_requests (shift_id);
create index availability_change_requests_worker_id_idx on availability_change_requests (worker_id);

alter table availability_change_requests enable row level security;

-- Worker: create and read their own only. Only an admin can acknowledge (update), matching the
-- "admin marks it seen" requirement -- a worker can't self-acknowledge.
create policy availability_change_requests_select on availability_change_requests
  for select using (worker_id = auth.uid() or is_admin());
create policy availability_change_requests_insert on availability_change_requests
  for insert with check (worker_id = auth.uid());
create policy availability_change_requests_admin_update on availability_change_requests
  for update using (is_admin()) with check (is_admin());

grant select, insert, update on availability_change_requests to authenticated;
grant select, insert, update, delete on availability_change_requests to service_role;
