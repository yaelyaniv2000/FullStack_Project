-- Core schema for the squadron personnel & shift scheduling app.
-- See docs/technical-plan.md "Database schema" for the full column-level spec this mirrors.
-- Single organization (see CLAUDE.md) — no multi-tenant scoping needed.

-- profiles: one row per user, extends auth.users with app-specific fields.
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  role       text not null check (role in ('admin', 'worker')),
  created_at timestamptz not null default now()
);

create table qualifications (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null unique,
  renewal_interval_days  integer null, -- null = never expires
  created_at             timestamptz not null default now()
);

create table positions (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  created_at timestamptz not null default now()
);

-- Which qualifications a position requires (many-to-many).
create table position_qualifications (
  position_id      uuid not null references positions(id) on delete cascade,
  qualification_id uuid not null references qualifications(id) on delete cascade,
  primary key (position_id, qualification_id)
);

-- Which qualification(s) fulfilling a position renews (many-to-many, see CLAUDE.md).
create table position_renews_qualifications (
  position_id      uuid not null references positions(id) on delete cascade,
  qualification_id uuid not null references qualifications(id) on delete cascade,
  primary key (position_id, qualification_id)
);

create table worker_qualifications (
  id                uuid primary key default gen_random_uuid(),
  worker_id         uuid not null references profiles(id) on delete cascade,
  qualification_id  uuid not null references qualifications(id) on delete cascade,
  source            text not null check (source in ('self_reported', 'admin_granted')),
  status            text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  obtained_at       date not null,
  reviewed_by       uuid null references profiles(id),
  reviewed_at       timestamptz null,
  created_at        timestamptz not null default now()
);

-- At most one non-rejected entry per (worker, qualification) — allows re-reporting after a
-- rejection. A plain UNIQUE constraint can't carry a WHERE clause, so this is a partial index.
create unique index worker_qualifications_active_unique
  on worker_qualifications (worker_id, qualification_id)
  where (status <> 'rejected');

create table shift_templates (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

create table shift_template_positions (
  template_id       uuid not null references shift_templates(id) on delete cascade,
  position_id       uuid not null references positions(id) on delete restrict,
  headcount_needed  integer not null check (headcount_needed > 0),
  primary key (template_id, position_id)
);

create table availability_windows (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  opens_at   timestamptz not null,
  closes_at  timestamptz not null check (closes_at > opens_at),
  created_at timestamptz not null default now()
);

create table shifts (
  id                      uuid primary key default gen_random_uuid(),
  date                    date not null,
  start_time              time not null,
  end_time                time not null check (end_time > start_time),
  location                text null,
  availability_window_id  uuid null references availability_windows(id),
  published_at            timestamptz null,
  created_at              timestamptz not null default now()
);

create table shift_positions (
  shift_id          uuid not null references shifts(id) on delete cascade,
  position_id       uuid not null references positions(id) on delete restrict,
  headcount_needed  integer not null check (headcount_needed > 0),
  primary key (shift_id, position_id)
);

create table availability (
  id            uuid primary key default gen_random_uuid(),
  worker_id     uuid not null references profiles(id) on delete cascade,
  shift_id      uuid not null references shifts(id) on delete cascade,
  is_available  boolean not null,
  responded_at  timestamptz not null default now(),
  unique (worker_id, shift_id)
);

create table assignments (
  shift_id     uuid not null references shifts(id) on delete cascade,
  position_id  uuid not null references positions(id) on delete restrict,
  worker_id    uuid not null references profiles(id) on delete cascade,
  created_by   uuid null references profiles(id), -- null = engine-generated; set = admin who added/edited it
  created_at   timestamptz not null default now(),
  primary key (shift_id, position_id, worker_id),
  foreign key (shift_id, position_id) references shift_positions(shift_id, position_id)
);

create table notifications (
  id          uuid primary key default gen_random_uuid(),
  worker_id   uuid not null references profiles(id) on delete cascade,
  shift_id    uuid null references shifts(id) on delete set null,
  message     text not null,
  created_at  timestamptz not null default now(),
  read_at     timestamptz null
);

-- Indexes beyond primary/unique keys (see docs/technical-plan.md "Indexes").
create index shifts_date_idx on shifts (date);
create index assignments_worker_id_idx on assignments (worker_id);
create index worker_qualifications_worker_id_idx on worker_qualifications (worker_id);
create index notifications_worker_id_read_at_idx on notifications (worker_id, read_at);

-- Enable Row-Level Security on every table now, explicitly, in version-controlled code —
-- not relying solely on the project's "automatic RLS" dashboard setting. Policies themselves
-- are a separate migration (see docs/technical-plan.md and CLAUDE.md).
alter table profiles enable row level security;
alter table qualifications enable row level security;
alter table positions enable row level security;
alter table position_qualifications enable row level security;
alter table position_renews_qualifications enable row level security;
alter table worker_qualifications enable row level security;
alter table shift_templates enable row level security;
alter table shift_template_positions enable row level security;
alter table availability_windows enable row level security;
alter table shifts enable row level security;
alter table shift_positions enable row level security;
alter table availability enable row level security;
alter table assignments enable row level security;
alter table notifications enable row level security;