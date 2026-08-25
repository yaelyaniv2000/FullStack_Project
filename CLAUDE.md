# Project Guidelines

@AGENTS.md

Durable context for this project — read this before making planning or architecture decisions,
so the core direction doesn't drift or get re-litigated across sessions. Update this file
whenever a core decision changes; don't let it go stale.

`AGENTS.md` is auto-generated/refreshed by `next dev` itself — don't hand-edit it, and don't
remove the `@AGENTS.md` reference above (removing it just gets silently re-added, per its own
contents). It flags that the installed Next.js version may differ from training-data assumptions;
read it before writing any Next.js-specific code.

**Concrete proof this matters, not just a theoretical warning**: this project's installed Next.js
(16) has deprecated `middleware.ts`/`middleware()` and renamed the convention to `proxy.ts`/
`proxy()` — confirmed by reading `node_modules/next/dist/docs/.../file-conventions/proxy.md`
directly, not assumed. `docs/technical-plan.md` originally said `middleware.ts` and was wrong.
**Rule going forward**: before relying on a Next.js file-convention name or API shape from
training data, grep `node_modules/next/dist/docs/` for it first — this is cheap and has already
caught one real mistake.

## What this is

Final project for the "Internet Technologies" course (RUNI CS 2026, Full-Stack track).
Requirements are in `Internet Technologies.pdf` at the project root — read it before assuming
anything about deliverables or grading criteria. Submission deadline: **2026-09-06**.

Working **solo** (occasional help, no full partner) — scope decisions should default to lean and
polished over feature-heavy. The assignment explicitly grades "quality of thinking" over feature
count.

Required stack (fixed by the assignment, not a choice): **Next.js, TypeScript, Supabase**
(Database + Auth), **Vercel** (deployment).

Required deliverables (see the PDF for full detail on each): product spec doc, architecture doc,
detailed technical plan, implementation, test spec doc + implemented tests, basic scale doc,
basic security doc, deployed app + GitHub repo + local run instructions, 10-15 min presentation.

## The product

A personnel & shift scheduling app. Core concept, unchanged since the start:
- Admin defines position types and shift requirements (positions needed + headcount).
- Personnel ("workers") hold qualifications; admin grants/revokes them.
- Admin collects worker availability for an upcoming period.
- System generates a proposed schedule matching qualifications + availability + constraints.
- Admin reviews/edits, then publishes; workers get notified of their shifts.

**Concrete use case**: validated against a real potential user — a squadron. The product is
built for this single real organization, not as a generic multi-business platform.

## Key architectural decisions (don't re-litigate these without a reason)

- **Single organization, not multi-tenant.** No `organizations` table, no self-serve business
  signup, no cross-tenant Row-Level Security. Considered and explicitly rejected multi-tenant
  SaaS — it doesn't serve this course's grading criteria and adds real cost (onboarding/invite
  flows, per-tenant isolation) with no real payoff before the deadline.
- **Positions and qualifications are admin-configurable data, not hardcoded values.** This is a
  *separate* axis from multi-tenancy — being "generic/configurable" does not require being
  multi-tenant. This is what lets development proceed with placeholder qualifications/positions
  before the squadron's exact list is known, and lets real values be added later purely through
  the admin UI, no code changes.
- **Qualification renewal is tied to the position, not the shift, and a position can renew more
  than one qualification.** A position (e.g., "medic") can be marked as renewing one or more
  qualifications when fulfilled (`position_renews_qualifications`, many-to-many, mirroring
  `position_qualifications`); that applies wherever that position appears across any shift.
- **A qualification can optionally define a fixed set of selectable values** (`qualification_options`
  -- e.g. "Seniority" → "Junior"/"Permanent"/"Professional"), and both `worker_qualifications` and
  `position_qualifications` got a nullable `option_id` accordingly (2026-08-22, user feedback --
  closes the loop on the very first project brainstorm: "a qualification could be a rank"). Each
  is enforced by its own DB trigger, not just app code: required iff the qualification has
  options, must belong to that qualification. **`position_renews_qualifications` deliberately does
  NOT get an `option_id`** -- renewing extends whatever option a worker already holds; it doesn't
  target one (that would be a promotion process, not a renewal). The admin-facing picker for this
  (`features/positions/components/QualificationMultiPicker.tsx`) is a dropdown that adds chips,
  with the option-picking sub-step only appearing for "required" (not "renews") and only when the
  chosen qualification actually has options.
- **Shift templates copy into a shift at creation time; no live link.** A template is a named,
  reusable bundle of position requirements the admin can pick from instead of building a shift's
  requirements from scratch each time. Editing/deleting a template afterward never changes shifts
  already created from it. Batch/recurring shift generation from a template ("next 4 Sundays")
  is a possible future extension, not v1 scope.
- **A shift is treated as "completed" once its end time has passed** and a worker was assigned to
  it — no manual attendance/check-in step in v1. Documented as a known limitation, not silently
  assumed.
- **Scheduling engine is a heuristic, not a true optimizer.** Full constraint-satisfaction
  scheduling is NP-hard in general; a simple, explainable greedy heuristic (e.g., assign scarcest
  shifts first) plus an admin review/edit step before publish is the right scope for a solo
  course project.
- **Use synthetic/placeholder data, never the squadron's real personnel data**, for development,
  testing, and the class demo — this ends up hosted on third-party infrastructure (Supabase/
  Vercel), not an approved system for real operational rosters.
- **Worker-reported qualifications are pending until admin-approved.** A worker can self-report a
  qualification, but it doesn't count toward schedule matching until an admin approves it —
  qualifications need an authoritative source, not self-declaration alone.
- **Understaffed shifts are flagged, not auto-escalated, in v1.** If the engine can't fully staff
  a shift, it's surfaced as a priority item on the admin dashboard; the admin resolves it manually
  (today: phone calls). Notifying all qualified personnel to volunteer is explicitly deferred —
  it's a real feature (targeted notifications + volunteer sign-up), not core scope.
- **The admin has a dashboard as their default landing page**, surfacing what needs attention:
  understaffed shifts, pending qualification approvals, upcoming shifts, expiring qualifications.
  This is the organizing idea for the admin's whole experience — build toward it, not just a pile
  of separate CRUD screens.

## Engineering principles for building this incrementally

The plan is to build features in phases (see `TODO.md`) and add more after earlier parts already
work — a later phase must not require reworking or breaking what an earlier phase already built.
Concretely:

- **Additive schema changes.** New tables/columns default nullable or with safe defaults; avoid
  renaming or restructuring existing tables once other features depend on them. Use migrations
  (not manual schema edits) so changes are tracked and reversible.
- **Organize code by domain, not by technical layer.** Group each concept (qualifications,
  positions, shifts, templates, scheduling, availability) with its own components, server
  actions/API routes, and types, rather than one shared "god file" per layer (e.g., one giant
  `actions.ts`). Adding a feature should mean adding a new module, not editing many existing ones.
- **One CRUD/data-access layer per entity**, reused by every UI surface that touches it (e.g., the
  admin dashboard and a dedicated qualifications page both call the same qualification functions)
  — so behavior stays consistent as more surfaces get added.
- **Tests as a safety net.** Once Phase 6 tests exist for a flow, keep them passing as later
  phases build on top — they're what actually proves a new feature didn't silently break an old
  one, not just visual inspection.
- **Prefer Supabase-generated TypeScript types from the schema** over hand-written duplicate
  types, so a schema change surfaces as a compile error anywhere it breaks assumptions, instead of
  a silent runtime bug discovered later.

This should get formalized concretely (actual folder structure, naming conventions) in the
detailed technical plan doc — `TODO.md` Phase 0 — before real implementation starts.

- **Qualification expiry is computed at read time, not stored or updated by a background job.**
  Expiry = `latest(obtained_at, completed renewing shifts for that worker) + renewal_interval`,
  computed via query/SQL view. No cron/scheduled function needed — deliberate, given this
  project's scale. See `docs/architecture.md` for the full reasoning.
- **The app UI is Hebrew (RTL), decided and built in from day one — not retrofitted.** The real
  end users (squadron personnel) are Hebrew speakers. Mechanically cheap since decided upfront:
  `<html lang="he" dir="rtl">`, `DirectionProvider` from `@base-ui/react/direction-provider`
  wrapping the app (`app/layout.tsx`), `Noto_Sans_Hebrew` as the `--font-sans` font, and
  shadcn/ui initialized with `--rtl` (`components.json` → `"rtl": true`) so every
  CLI-generated component already uses logical (`ms-`/`me-`/`start-`/`end-`) spacing utilities
  instead of physical (`ml-`/`mr-`/`left`/`right`) ones. The ongoing cost isn't technical setup —
  it's discipline: write all UI copy in Hebrew, and use logical utilities in any hand-written
  (non-shadcn-generated) layout code, since physical-direction classes silently break under RTL.
  **Concrete proof this matters, date/time edition**: any date or time *value* (not label) needs
  an explicit `dir="ltr"` — under `dir="rtl"`, the Unicode bidi algorithm visually reorders
  colon-/dash-separated numeric segments (e.g. `12:30` rendered as `30:12`, `08:00–16:00` as
  `16:00–08:00`), even though the underlying string/DOM text is correct — `.innerText()` in a
  test won't catch this, only an actual screenshot will, since it's a *visual* reordering, not a
  text-content change. Hit this on `/admin/shifts` (both the `<input type="date/time">` fields
  and the list's date/time display) and `worker-qualifications`' obtained/expiry dates — fixed by
  adding `dir="ltr"` to every date/time `<Input>` and wrapping every rendered date/time value in
  `<span dir="ltr">`. **Rule going forward**: any new date or time value, input or displayed, gets
  `dir="ltr"` — this will keep recurring (availability windows, worker's shift view, dashboard
  upcoming-shifts widget) since it's inherent to mixing LTR-formatted data into RTL flow, not a
  one-off bug.
- **Responsive design is built in from day one, not retrofitted.** Tailwind's mobile-first
  utilities + shadcn/ui's responsive components make this close to free. Worker-facing pages are
  mobile-first (checking a shift is a quick phone interaction); admin pages (esp. schedule
  review/edit) stay responsive but are desktop-optimized, since that screen is inherently
  information-dense. See `docs/architecture.md` "Responsive design."
- **No global client-state library (no Redux/Zustand/React Query).** Server Components + Server
  Actions with `revalidatePath` keep the server as the single source of truth; local `useState`
  for forms/transient UI, `useOptimistic` for the few interactions worth it (e.g. availability
  toggles). See `docs/technical-plan.md` → State management.
- **Scheduling constraints are admin-configurable via a small settings page, not a general rules
  engine.** Considered and explicitly rejected: (a) an LLM generating the schedule directly
  (unreliable at exact constraint satisfaction, undermines explainability/testability which are
  graded, real extra scope for a solo deadline — see conversation history) and (b) a rules engine
  letting the admin invent arbitrary new logic (a DSL + UI builder, real scope for little payoff).
  Instead: `scheduling_constraints` holds one row per known constraint *type*
  (`min_rest_hours`, `max_shifts_per_window` to start), admin toggles `enabled`/`value` only —
  no create/delete from the UI. New constraint *values* are pure data; a genuinely new constraint
  *type* (e.g. seniority rules, once known) is a small additive code change (new eligibility
  case) + migration, not a UI-only change and not a redesign.
  **Extended 2026-08-26 (user feedback), two additive changes to this same model:**
  1. **Per-worker-category values.** A constraint can have a default value plus per-category
     override values — modeled via the *existing* qualification system (e.g. a "סוג שירות"
     qualification with a "מילואים" option gets its own `min_rest_hours`), not a hardcoded
     reserve/regular concept. `scheduling_constraints` gained a nullable `qualification_option_id`
     (null = default row). Still update-only from the UI for values; still no new constraint
     *types* without a code change.
  2. **Worker pairing preferences** — a genuinely different kind of input from the per-worker
     constraints above: *relational* (depends who else is on the shift), not per-worker. New
     `worker_pairing_preferences` table, one row per pair, three types: `avoid` (hard — never
     pairs, unfilled slot flagged like any gap if that's the only option), `prefer_avoid` (soft —
     tries not to, but will rather than leave a slot empty, and every time it happens anyway it
     must be flagged to the admin both pre-publish on the review screen *and* after publish, not
     just at generate time), `prefer` (soft, the mirror). A pair holds exactly one of the three at
     a time. Full algorithm impact (which step does what) is in `docs/technical-plan.md`.
  3. **One unified `/admin/settings` page**, not separate pages per concern — replaces the
     earlier plan of a standalone scheduling-settings page. Holds the constraints above plus
     pairing preferences now, structured so general app settings (starting with
     `EXPIRING_SOON_DAYS`, currently a hardcoded placeholder in
     `features/worker-qualifications/queries.ts` pending this page) can be added as new sections
     later without moving anything. `features/scheduling/` owns constraints + pairings (both feed
     the heuristic directly); a new lightweight `features/settings/` owns general settings like
     `EXPIRING_SOON_DAYS` — the page composes both, it's a UI aggregation, not a data-layer merge.
- **The scheduling heuristic's exact algorithm is specified** in `docs/technical-plan.md` → Core
  business logic (flatten shifts into slots → compute eligibility, now including per-category
  constraint values and hard `avoid` pairing exclusion → sort by scarcity → greedy assign with a
  fewest-assignments-so-far tiebreaker adjusted for pairing preference → flag unfilled slots and
  soft-avoid conflicts). Extend step 2 (eligibility) as real constraints from the squadron become
  known — don't change the overall shape.
- **`assignments` has no status column.** Whether an assignment is proposed or final is derived
  from its shift's `published_at` (null = admin-only draft, set = published & visible to the
  worker). Workers must never see assignments for a shift before `published_at` is set — this is
  a timing-based authorization rule, not just a role check, and needs its own RLS policy care.
  **Implemented and behaviorally verified** in `supabase/migrations/20260822061054_add_rls_policies.sql`
  — includes a reusable `is_admin()` helper (avoids repeating the same subquery in ~20 policies)
  and explicit `GRANT`s to `authenticated` (needed since "automatically expose new tables" is off
  — RLS alone doesn't matter if the base SQL privilege isn't granted). Verified with two real test
  accounts (`test-admin@example.com` / `test-worker@example.com`, kept around for reuse across
  later phases) using role-simulated queries (`set local role authenticated; set local
  request.jwt.claims = ...`), not just "no error."
  **A real bug this caused, caught by actually testing in a browser, not just building**:
  `service_role` also has *zero* base privileges by default with auto-expose off — it is **not**
  implicitly exempt just because it bypasses RLS. A grant and a bypass are two different things;
  `service_role` still needs the grant to attempt the operation at all. Fixed in
  `supabase/migrations/20260822065939_grant_service_role_privileges.sql`. **Rule going forward**:
  any new table needs both `GRANT ... TO authenticated` *and* `GRANT ... TO service_role`, not
  just the former — add both in the same migration that creates the table.
- **Auth is email/password, admin-created accounts, no real email sending in v1.** Public
  self-signup is disabled at the Supabase project level. The admin creates a worker's account
  directly (email + password, `email_confirm: true`) via the Admin API — requires the
  service-role key server-side. No confirmation/invite email is sent; the admin relays the
  credentials out-of-band. Considered and rejected for v1: magic-link/OTP login (Supabase's
  default email sending is rate-limited to a few/hour — a real risk during a live demo) and
  building real email invites now (an easy, isolated addition later — swap one function, nothing
  else changes, see the auth conversation in project history for the full reasoning).

## Deployment gotchas

- **Git commit author email must match a verified email on the `yaelyaniv2000` GitHub account,**
  or Vercel silently blocks the deployment (Hobby plan doesn't allow "outside collaborator"
  commits on a private repo — status shows as "Deployment was blocked," not a build failure).
  Hit this exactly once: local git was configured with a university email not verified on that
  GitHub account. Fixed by setting `git config --global user.email yaelyaniv23@gmail.com`. If a
  deployment mysteriously never updates the live URL despite a clean push, check
  `gh api repos/yaelyaniv2000/FullStack_Project/commits/<sha>/status` before assuming a build
  error — an `x-vercel-cache: HIT` with a large `age` on the live URL is the tell that the old
  deployment is still being served, not the new one.

## Where things live

- `docs/product-spec.md` — the business-facing product spec (course deliverable #2). Has open
  `[TBD]` items pending more input from the squadron contact; all are non-blocking.
- `docs/architecture.md` — high-level system design (course deliverable #3): components, DB
  entities + ER diagram, pages, server actions, data flow, roles/permissions, external libraries.
- `docs/technical-plan.md` — detailed technical plan (course deliverable #4): exact folder/
  component structure, column-level DB schema, CRUD-by-entity table, server action signatures,
  the scheduling heuristic's actual algorithm, state/error/validation conventions, core UX.
- `TODO.md` — working task checklist, tagged 🧭 Planning / 💻 Coding / 🔌 External.
- `CLAUDE.md` (this file) — durable decisions and framing; update in place when direction shifts.

Test spec, scale doc, and security doc (course deliverables #5-#9) don't exist yet — see
`TODO.md` Phase 0 for what's next.
