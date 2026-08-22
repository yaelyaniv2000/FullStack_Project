-- A position's requirement can now target a specific option of a qualification (e.g. "requires
-- Seniority = Permanent", not just "requires Seniority"). Mirrors the worker_qualifications
-- option pattern exactly. `position_renews_qualifications` deliberately does NOT get this --
-- fulfilling a position extends the validity of whatever option a worker already holds, it
-- doesn't change which option they have (that's a promotion process, not a renewal) -- confirmed
-- with the user 2026-08-22.

alter table position_qualifications
  add column option_id uuid null references qualification_options(id) on delete restrict;

create or replace function check_position_qualification_option()
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
    raise exception 'This required qualification has options and one must be selected';
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

create trigger position_qualifications_option_check
before insert or update on position_qualifications
for each row execute function check_position_qualification_option();