-- A qualification can optionally define a fixed set of selectable values (e.g. "Seniority" ->
-- "Junior"/"Permanent"/"Professional"). A qualification with zero options stays purely binary
-- (has it / doesn't), exactly as before -- this is additive, not a redesign.

create table qualification_options (
  id                uuid primary key default gen_random_uuid(),
  qualification_id  uuid not null references qualifications(id) on delete cascade,
  label             text not null,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  unique (qualification_id, label)
);

alter table qualification_options enable row level security;

create policy qualification_options_select on qualification_options
  for select using (true);
create policy qualification_options_admin_write on qualification_options
  for all using (is_admin()) with check (is_admin());

-- New table needs its own explicit grants -- GRANT ... ON ALL TABLES from earlier migrations
-- only applied to tables that existed at the time it ran (see CLAUDE.md's service_role lesson).
grant select, insert, update, delete on qualification_options to authenticated;
grant select, insert, update, delete on qualification_options to service_role;

-- Which option (if any) a worker selected for a qualification that defines options.
-- ON DELETE RESTRICT: matches the existing convention elsewhere (e.g. shift_positions.position_id)
-- of blocking deletion rather than silently nulling out a worker's recorded value.
alter table worker_qualifications
  add column option_id uuid null references qualification_options(id) on delete restrict;

-- Enforce at the database level (not just app code) that:
--  - a qualification WITH options requires selecting one
--  - a qualification WITHOUT options must not have one selected
--  - the selected option actually belongs to the qualification being recorded
create or replace function check_worker_qualification_option()
returns trigger
language plpgsql
as $$
declare
  option_count integer;
begin
  select count(*) into option_count
  from qualification_options
  where qualification_id = new.qualification_id;

  if option_count > 0 and new.option_id is null then
    raise exception 'This qualification requires selecting an option';
  end if;

  if option_count = 0 and new.option_id is not null then
    raise exception 'This qualification does not accept an option';
  end if;

  if new.option_id is not null and not exists (
    select 1 from qualification_options
    where id = new.option_id and qualification_id = new.qualification_id
  ) then
    raise exception 'The selected option does not belong to this qualification';
  end if;

  return new;
end;
$$;

create trigger worker_qualifications_option_check
before insert or update on worker_qualifications
for each row execute function check_worker_qualification_option();