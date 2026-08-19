# תכנון טכני מפורט (Draft v1) — Squadron Personnel & Shift Scheduling App

> Builds on `docs/product-spec.md` and `docs/architecture.md`. This doc goes one level deeper:
> exact folder/component layout, exact DB columns, the actual scheduling algorithm, and the
> conventions for state, errors, and validation. The goal (per the assignment) is to know what
> we're building *before* writing implementation code.

## מבנה התיקיות בפרויקט (Folder structure)

Organized by **domain**, not by technical layer — per the principle in `CLAUDE.md`: adding a
feature means adding a module, not editing several shared files.

```
/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── accept-invite/page.tsx
│   │   └── auth/callback/route.ts        # Route Handler: exchanges magic-link code for a session
│   ├── (admin)/
│   │   ├── layout.tsx                    # admin-only layout guard
│   │   └── admin/
│   │       ├── qualifications/page.tsx
│   │       ├── positions/page.tsx
│   │       ├── personnel/
│   │       │   ├── page.tsx
│   │       │   └── [workerId]/page.tsx
│   │       ├── shift-templates/page.tsx
│   │       ├── shifts/page.tsx
│   │       ├── availability-windows/
│   │       │   ├── page.tsx
│   │       │   └── [id]/page.tsx
│   │       ├── schedule/[windowId]/page.tsx
│   │       └── scheduling-settings/page.tsx   # toggle/tune scheduling_constraints rows
│   ├── (worker)/
│   │   ├── layout.tsx                    # worker-only layout guard
│   │   ├── my-qualifications/page.tsx
│   │   ├── availability/page.tsx
│   │   └── my-shifts/page.tsx
│   ├── dashboard/page.tsx                # role-aware home page
│   ├── layout.tsx                        # root layout
│   └── page.tsx                          # redirects to /login or /dashboard
├── components/
│   ├── ui/                               # shadcn/ui generated primitives
│   └── shared/                           # cross-domain components (nav, status badges, etc.)
├── features/                             # one folder per domain concept
│   ├── qualifications/     { actions.ts, queries.ts, schema.ts, types.ts, components/ }
│   ├── positions/          { ... same shape ... }
│   ├── worker-qualifications/
│   ├── shift-templates/
│   ├── shifts/
│   ├── availability/
│   ├── scheduling/                       # the heuristic engine + generate/publish actions
│   └── notifications/
├── lib/
│   ├── supabase/  { server.ts, client.ts, proxy.ts }  # client factories + session-refresh helper
│   ├── auth.ts                           # getCurrentUser(), requireAdmin(), requireWorker()
│   └── result.ts                         # shared Server Action result type (see Error handling)
├── supabase/
│   └── migrations/                       # versioned schema changes (see Architecture doc)
├── types/
│   └── database.types.ts                 # generated via `supabase gen types typescript`
├── tests/
│   ├── unit/            # scheduling heuristic, expiry computation
│   ├── integration/     # server actions against a local Supabase instance
│   └── e2e/              # Playwright, full flows
├── proxy.ts             # refreshes the Supabase session on each request (see note below)
└── docs/                                 # this doc and its siblings
```

**Correction from the original draft**: this file was originally planned as `middleware.ts`
(the conventional Next.js name). The installed Next.js version (16) has **deprecated and
renamed** that file convention to `proxy.ts`, exporting a function named `proxy` instead of
`middleware` — confirmed against the actual installed docs
(`node_modules/next/dist/docs/.../file-conventions/proxy.md`), not assumed from training data.
This is exactly the kind of drift `AGENTS.md` warns about — worth rechecking framework
conventions against the installed docs before trusting prior knowledge, especially for anything
file-convention-based rather than plain library-API-based.

Every `features/<domain>/actions.ts` file is the **only** place that writes to its domain's
tables — pages call into it, never query/write Supabase directly for another domain's data.

## מבנה הקומפוננטות המרכזיות (Core components)

- **Layout/shell**: `<AdminNav>`, `<WorkerNav>` — role-specific navigation, rendered by the
  respective `(admin)`/`(worker)` layout.
- **Status display**: `<QualificationBadge>` (color-coded: approved / pending / expiring soon /
  expired), `<ShiftStatusBadge>` (open / understaffed / published).
- **Dashboard widgets**: `<PriorityAlerts>` (understaffed shifts + pending approvals),
  `<ExpiringQualifications>`, `<UpcomingShifts>` — composed together on `/dashboard` for the
  admin view; a smaller subset for the worker view.
- **Forms**: `<QualificationForm>`, `<PositionForm>` (incl. required-qualifications and
  renews-qualifications multi-selects), `<ShiftForm>` — reused for both "create from scratch" and
  "create from template" (template selection just pre-fills the same form's initial values).
- **`<AvailabilityResponseList>`** — the worker's availability page: one row per open shift with
  an available/unavailable toggle.
- **`<ScheduleGrid>`** — the admin's schedule review/edit screen: shifts × required positions,
  showing the engine's proposed assignments, editable before publish. The one component that is
  intentionally desktop-optimized (see `architecture.md` → Responsive design).
- **`<DataTable>`** — a generic shadcn/ui-based table wrapper reused across every admin list page
  (qualifications, positions, personnel, templates, shifts) instead of building a bespoke table
  per page.

## מבנה בסיס הנתונים (Database schema, column-level)

Types are Postgres types; all tables use `uuid` primary keys (`default gen_random_uuid()`) unless
noted. This refines `architecture.md`'s entity list with exact columns and constraints.

```
profiles
  id               uuid PK  -- = auth.users.id
  full_name        text        not null
  role             text        not null check (role in ('admin','worker'))
  created_at       timestamptz not null default now()

qualifications
  id                     uuid PK
  name                   text        not null unique
  renewal_interval_days  integer     null  -- null = never expires
  created_at             timestamptz not null default now()

positions
  id          uuid PK
  name        text        not null unique
  created_at  timestamptz not null default now()

position_qualifications           -- required quals per position
  position_id       uuid references positions(id) on delete cascade
  qualification_id  uuid references qualifications(id) on delete cascade
  primary key (position_id, qualification_id)

position_renews_qualifications    -- quals a position renews (many-to-many, see CLAUDE.md)
  position_id       uuid references positions(id) on delete cascade
  qualification_id  uuid references qualifications(id) on delete cascade
  primary key (position_id, qualification_id)

worker_qualifications
  id                uuid PK
  worker_id         uuid references profiles(id) on delete cascade
  qualification_id  uuid references qualifications(id) on delete cascade
  source            text        not null check (source in ('self_reported','admin_granted'))
  status            text        not null default 'pending' check (status in ('pending','approved','rejected'))
  obtained_at       date        not null
  reviewed_by       uuid        references profiles(id) null
  reviewed_at       timestamptz null
  created_at        timestamptz not null default now()
  -- partial unique index: at most one non-rejected entry per (worker, qualification) —
  -- prevents duplicate pending/approved rows, while still allowing re-reporting after a rejection
  unique (worker_id, qualification_id) where (status <> 'rejected')

shift_templates
  id          uuid PK
  name        text        not null
  created_at  timestamptz not null default now()

shift_template_positions
  template_id       uuid references shift_templates(id) on delete cascade
  position_id       uuid references positions(id) on delete restrict
  headcount_needed  integer not null check (headcount_needed > 0)
  primary key (template_id, position_id)

availability_windows
  id          uuid PK
  label       text        not null
  opens_at    timestamptz not null
  closes_at   timestamptz not null check (closes_at > opens_at)
  created_at  timestamptz not null default now()

shifts
  id                       uuid PK
  date                     date        not null
  start_time               time        not null
  end_time                 time        not null check (end_time > start_time)
  location                 text        null
  availability_window_id   uuid        references availability_windows(id) null
  published_at             timestamptz null
  created_at               timestamptz not null default now()

shift_positions
  shift_id          uuid references shifts(id) on delete cascade
  position_id       uuid references positions(id) on delete restrict
  headcount_needed  integer not null check (headcount_needed > 0)
  primary key (shift_id, position_id)

availability
  id             uuid PK
  worker_id      uuid references profiles(id) on delete cascade
  shift_id       uuid references shifts(id) on delete cascade
  is_available   boolean     not null
  responded_at   timestamptz not null default now()
  unique (worker_id, shift_id)   -- one response per worker per shift; resubmitting = update

assignments
  shift_id      uuid references shifts(id) on delete cascade,
  position_id   uuid references positions(id) on delete restrict,
  worker_id     uuid references profiles(id) on delete cascade,
  created_by    uuid references profiles(id) null,  -- null = engine-generated; set = admin who added/edited it
  created_at    timestamptz not null default now(),
  primary key (shift_id, position_id, worker_id),  -- no duplicate rows for the same slot+worker
  foreign key (shift_id, position_id) references shift_positions(shift_id, position_id)

notifications
  id          uuid PK
  worker_id   uuid references profiles(id) on delete cascade
  shift_id    uuid references shifts(id) on delete set null null
  message     text        not null
  created_at  timestamptz not null default now()
  read_at     timestamptz null

scheduling_constraints            -- admin-tunable parameters the heuristic's eligibility step reads
  id           uuid PK
  type         text        not null unique check (type in ('min_rest_hours', 'max_shifts_per_window'))
  enabled      boolean     not null default false
  value        numeric     not null   -- meaning depends on type: hours, or a count
  updated_at   timestamptz not null default now()
```

`scheduling_constraints` is seeded with exactly one row per known type (via migration) and is
**update-only from the UI** — the admin toggles `enabled` and edits `value`, but never creates or
deletes a row, since the set of *types* the algorithm knows how to enforce is fixed in code (see
Core business logic below). Adding a brand-new constraint *type* later means a small code change
(a new case in the algorithm) plus a migration to seed its row — not a UI-only change. This is a
deliberately narrow "settings page," not a general rules engine — see `CLAUDE.md` for the reasoning.

**Refinement from `architecture.md`**: `assignments` references `shift_positions` via a composite
foreign key `(shift_id, position_id)` instead of a separate surrogate `shift_position_id` — since
`shift_positions` already has a natural composite primary key, adding a synthetic id to reference
would be an unused extra column.

**Indexes beyond primary/unique keys** (foreign keys are indexed by default recommendation, not
automatically in Postgres — added explicitly): `shifts(date)`, `assignments(worker_id)`,
`worker_qualifications(worker_id)`, `notifications(worker_id, read_at)` — all support the
dashboard and "my X" queries directly. Full reasoning goes in the scale doc later.

## פעולות CREATE/READ/UPDATE/DELETE מרכזיות (Core CRUD by entity)

| Entity | Create | Read | Update | Delete |
|---|---|---|---|---|
| `qualifications` | Admin | Everyone | Admin | Admin (blocked if referenced — see note) |
| `positions` | Admin | Everyone | Admin | Admin (blocked if referenced) |
| `worker_qualifications` | Worker (self, → pending) / Admin (any, → approved) | Own (worker) / all (admin) | Admin only (approve/reject/revoke) | — (kept as history; revoke is a status update, not a delete) |
| `shift_templates` | Admin | Admin | Admin | Admin |
| `shifts` | Admin (blank or from template) | Everyone (own-relevant for workers) | Admin | Admin (only if unpublished) |
| `availability_windows` | Admin | Everyone | Admin (dates) | Admin (only if no responses yet) |
| `availability` | Worker (self) | Own (worker) / all (admin) | Worker (self, before window closes) | — (resubmission overwrites, no separate delete) |
| `assignments` | Engine (bulk, via generate) / Admin (manual) | Admin (all) / Worker (own, published only) | Admin (reassign, before publish) | Admin (before publish) |
| `notifications` | System (on publish) | Own (worker) | Worker (mark read) | — |
| `scheduling_constraints` | — (seeded by migration only) | Admin | Admin (enable + value) | — |

Two deliberate non-deletes worth calling out: qualification **history** for a worker is never
hard-deleted (revoking is a status change, so "who held what, when" stays queryable — this is
real value for a system tracking certifications over time), and `qualifications`/`positions`
block deletion once referenced elsewhere rather than cascading — deleting a qualification that
50 workers hold, or a position used across a dozen shifts, should be a deliberate decision the
UI surfaces clearly, not a silent cascade.

## תיאור ה-API (API description)

Per `architecture.md`: Server Actions for all mutations, one Route Handler
(`app/(auth)/auth/callback/route.ts`) for the Supabase magic-link exchange. Every action returns
the shared `Result<T>` type (see Error handling) rather than throwing to the caller.

Representative actions per module (not exhaustive — mirrors the CRUD table above):

```ts
// features/qualifications/actions.ts
createQualification(input: { name: string; renewalIntervalDays: number | null }): Result<Qualification>
updateQualification(id: string, input: Partial<{ name: string; renewalIntervalDays: number | null }>): Result<Qualification>
deleteQualification(id: string): Result<void>   // fails if still referenced

// features/positions/actions.ts
createPosition(input: { name: string; requiredQualificationIds: string[]; renewsQualificationIds: string[] }): Result<Position>
updatePosition(id: string, input: Partial<{...}>): Result<Position>

// features/worker-qualifications/actions.ts
selfReportQualification(qualificationId: string, obtainedAt: string): Result<WorkerQualification>
reviewQualification(id: string, decision: 'approved' | 'rejected'): Result<void>   // admin only
grantQualification(workerId: string, qualificationId: string, obtainedAt: string): Result<WorkerQualification>  // admin only
revokeQualification(id: string): Result<void>   // admin only, sets status = 'rejected'

// features/shift-templates/actions.ts
createTemplate(input: { name: string; positions: { positionId: string; headcount: number }[] }): Result<ShiftTemplate>

// features/shifts/actions.ts
createShift(input: { date, startTime, endTime, location, positions, templateId? }): Result<Shift>
updateShift(id: string, input: Partial<{...}>): Result<Shift>
deleteShift(id: string): Result<void>   // fails if published

// features/availability/actions.ts
submitAvailability(shiftId: string, isAvailable: boolean): Result<void>   // upsert on (worker_id, shift_id)

// features/scheduling/actions.ts
generateSchedule(windowId: string): Result<{ proposedCount: number; unfilledSlots: SlotRef[] }>
updateAssignment(shiftId: string, positionId: string, workerId: string | null): Result<void>  // admin manual edit
publishSchedule(windowId: string): Result<{ publishedShiftCount: number }>  // sets published_at, writes notifications
updateSchedulingConstraint(type: 'min_rest_hours' | 'max_shifts_per_window', input: { enabled: boolean; value: number }): Result<void>  // admin only
```

## תיאור הלוגיקה העסקית המרכזית (Core business logic)

### 1. Qualification expiry — computed, not stored

For a given `(worker, qualification)`:

```
last_renewed_on = max(
  worker_qualifications.obtained_at,
  max(shift.date) over all completed shifts where:
    - the worker was assigned to a position on that shift
    - that position is in position_renews_qualifications for this qualification
    - shift.date <= today  ("completed", per the assumption in product-spec.md)
)

expires_on =
  null                                              if renewal_interval_days is null
  last_renewed_on + renewal_interval_days           otherwise

status shown to users = "approved" / "expiring soon" (within N days, N per the open question
  in product-spec.md) / "expired" (today > expires_on) — computed from expires_on, not stored.
```

Implemented as a SQL view (or a query function called from `queries.ts`) — exact SQL to be
written during implementation, since it needs testing against real Postgres rather than being
finalized as prose here.

### 2. Scheduling engine — the matching heuristic

Runs once per `generateSchedule(windowId)` call. Deliberately a **greedy heuristic**, not a
constraint solver (see `architecture.md`) — explainable in one pass, with the admin's manual
review as the correctness backstop.

1. **Flatten to slots.** For every shift in the window, for every `shift_positions` row, create
   one "slot" per unit of `headcount_needed` (a shift needing 3 guards = 3 slots).
2. **Compute eligibility per slot.** A worker is eligible for a slot if: they hold an
   **approved** qualification satisfying every qualification the slot's position requires
   (`position_qualifications`); they submitted `is_available = true` for that shift; assigning
   them wouldn't overlap another shift already assigned to them on the same date (no
   double-booking); and they satisfy every **enabled** row in `scheduling_constraints`:
   - `min_rest_hours` — the gap between this shift's start and the worker's nearest other
     assignment (within this run) is at least `value` hours.
   - `max_shifts_per_window` — the worker's assignment count so far in this run is below `value`.

   Disabled constraint rows are skipped entirely, so an admin who hasn't enabled a constraint
   yet gets exactly today's behavior — no accidental new restrictions from adding a row.
3. **Order slots by scarcity.** Sort ascending by number of eligible workers — fill the
   hardest-to-fill slots first, since leaving them for last risks their few eligible workers
   already being consumed by easier slots.
4. **Assign.** For each slot in that order: if eligible workers exist, assign the one with the
   fewest assignments so far *within this run* (a simple fairness tiebreaker — spreads load
   rather than always picking the same first-eligible worker). Remove that worker's availability
   for any now-conflicting slot.
5. **Flag gaps.** A slot with zero eligible workers is left unfilled and reported back
   (`unfilledSlots`) — this is exactly what drives the "understaffed shift" dashboard flag from
   `product-spec.md`.
6. **Write proposed assignments** (`created_by = null`) — nothing is published yet; the admin
   reviews/edits via `updateAssignment` before calling `publishSchedule`.

This is intentionally the *first* version of the algorithm. `min_rest_hours` and
`max_shifts_per_window` are the starter constraint types — generic enough to be useful without
squadron-specific input, and admin-tunable without a code change (see `scheduling_constraints`
above). Squadron-specific rules identified later (e.g. seniority pairing) become **new** constraint
types: a new case in step 2 plus a migration to seed the row — a small, additive change, not a
redesign, but not purely a settings change either.

## ניהול State באפליקציה (State management)

**No global client state library (no Redux/Zustand/React Query).** Deliberately not used: with
Server Components fetching fresh data on every navigation and Server Actions triggering
revalidation (`revalidatePath`) after a mutation, there's no separate client-side cache to keep
in sync — the server is the single source of truth on every request.

What *does* use local React state, and where:
- **Form inputs** — plain `useState`/controlled inputs within each form component; not shared
  outside that component.
- **Transient UI state** (modal open/closed, active tab, table sort) — local `useState`, never
  lifted higher than needed.
- **Optimistic updates** for a couple of specifically snappy interactions (e.g. toggling an
  availability response) — React's `useOptimistic`, so the UI updates immediately while the
  Server Action confirms in the background, with a rollback on failure.

## טיפול בשגיאות (Error handling)

- Every Server Action returns a shared discriminated union instead of throwing:
  ```ts
  type Result<T> = { success: true; data: T } | { success: false; error: string };
  ```
  Callers (client components) branch on `success` and show `error` inline — no raw exceptions
  cross the server/client boundary, and no internal error text (stack traces, raw Postgres
  errors) reaches the UI.
- **Validation errors** (Zod) map to field-level messages shown next to the relevant input.
- **Database errors** (RLS rejection, unique/check constraint violations) are caught in the
  action and translated to a plain-language message (e.g. a unique-name violation on
  `qualifications` → "A qualification with this name already exists").
- **Render-time errors**: Next.js `error.tsx` boundaries per route segment show a friendly
  fallback instead of a blank crash.
- **Not-found cases** (bad id in a URL, e.g. `/admin/personnel/<bad-id>`): `notFound()` →
  `not-found.tsx`.
- **Logging**: server-side `console.error` for unexpected failures, relying on Vercel's function
  logs — no dedicated error-tracking service (e.g. Sentry) for this project. Worth naming
  explicitly as a "what I'd add for real production use" point in the presentation.

## ולידציות של קלטים (Input validation)

- Every Server Action validates its input with a **Zod schema** colocated in that domain's
  `schema.ts`, before touching the database — this is the authoritative validation layer, since
  Server Actions run server-side regardless of what the client did or didn't check.
- Client-side validation (HTML `required`, immediate Zod parsing in the form) exists purely for
  responsive UX — never trusted as the real check, since it's trivially bypassable.
- Representative rules: qualification `name` non-empty, max length, unique; `renewalIntervalDays`
  a positive integer or `null`; shift `endTime > startTime`; `headcountNeeded > 0`; availability
  `isAvailable` boolean.
- **Database constraints are the last line of defense** (the `check`/`not null`/`unique`
  constraints in the schema above) — in case a bug ever lets bad data reach a query directly.

## תכנון חוויית המשתמש המרכזית (Core UX)

- **Dashboards as home base**, both roles — surfacing what needs attention (admin: understaffed
  shifts, pending approvals; worker: upcoming shifts, expiring qualifications) rather than
  landing on a generic empty page.
- **Consistent status badges** everywhere a qualification or shift appears, so state is
  recognizable at a glance without reading text (color-coded: approved/pending/expiring/expired;
  open/understaffed/published).
- **One form component per entity**, reused for create and edit (and, for shifts, reused whether
  starting blank or pre-filled from a template) — one place to get the UX right, not several
  near-duplicate forms drifting apart over time.
- **Responsive per `architecture.md`**: worker pages mobile-first, the admin schedule-review grid
  desktop-optimized but still usable on mobile.
- **Hebrew (RTL) throughout**: `<html lang="he" dir="rtl">`, `Noto_Sans_Hebrew` as the app font,
  shadcn/ui components generated with `--rtl` (logical spacing utilities). All UI copy is written
  in Hebrew directly — no translation-key/i18n system, since this is a single-language app.

---

## Open items before implementation starts

- Finalize the SQL for the qualification-expiry view against a real Supabase instance.
- Decide the exact "expiring soon" warning window (open question in `product-spec.md`).
- Write actual RLS policy SQL per table (drafted conceptually in `architecture.md`, not yet SQL).
- Once the squadron's real "additional conditions" are known (beyond `min_rest_hours` and
  `max_shifts_per_window`), add each as a new `scheduling_constraints` type + eligibility case.