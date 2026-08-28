# Project TODO — Squadron Personnel & Shift Scheduling App

Legend:
- 🧭 **Planning** — thinking/writing, no code yet
- 💻 **Coding** — writing app code (can be done offline, no external accounts needed)
- 🔌 **External** — requires setting up/connecting an external account or service
  (Supabase, Vercel, GitHub, email provider, etc.)

Ordered roughly the way you'll actually work through it. Check items off as you go — this file
is yours to edit freely.

---

## Phase 0 — Finish planning docs

- [X] 🧭 Meeting with potential user — walk through the open questions in `docs/product-spec.md`
- [ ] 🧭 Finalize `docs/product-spec.md` (fill in the remaining `[TBD]` sections with real answers)
- [X] 🧭 Write the architecture doc — `docs/architecture.md` (v1 drafted; components, DB
      entities, pages, server actions, data flow, roles & permissions, external libraries)
- [X] 🧭 Write the detailed technical plan doc — `docs/technical-plan.md` (v1 drafted: folder
      structure, component structure, DB schema, CRUD operations list, API description,
      scheduling heuristic + expiry logic, state management, error handling, input validation,
      core UX)
- [X] 🧭 Write the test spec doc (which flows/edge cases/permissions need tests — content, not
      code yet) — `docs/test-spec.md`, written together with Phase 6's implementation (see there)
      rather than strictly before, since by the time Phase 6 started the concrete constraint that
      shapes the whole doc (Playwright can't run on this dev machine) was already known and best
      resolved by writing the spec and the tests as one pass.
- [ ] 🧭 Draft the scale doc (can start now with expected assumptions; refine once built)
- [ ] 🧭 Draft the security doc (can start now with the role-based access plan; refine once built)

## Phase 1 — Project setup & external accounts

- [X] 🔌 Create a GitHub repository for the project
- [X] 🔌 Create a Supabase project (this becomes your Database + Auth)
- [X] 💻 Scaffold the Next.js + TypeScript app locally, push initial commit
- [X] 🔌 Create a Vercel project linked to the GitHub repo (enables auto-deploy on push)
- [X] 🔌 Set up local environment variables (`.env.local`) with Supabase URL/keys; add the same
      vars in Vercel's project settings
- [X] 💻 Confirm a "hello world" page deploys successfully to a live Vercel URL before writing
      real features — validates the whole pipeline early. Live at
      https://full-stack-project-neon-pi.vercel.app — verified publicly reachable (200, no
      Deployment Protection wall) and confirmed the Hebrew/RTL layout deployed correctly.

## Phase 2 — Data model & auth (single organization)

- [X] 💻 Design and create the DB schema/migrations per `docs/architecture.md`: `profiles`,
      `qualifications`, `positions`, `position_qualifications`, `position_renews_qualifications`
      (a position can renew more than one qualification), `worker_qualifications` (incl.
      `source`/`status`, no stored expiry — computed at query time), `shift_templates`,
      `shift_template_positions`, `availability_windows`, `shifts` (incl. nullable
      `published_at`), `shift_positions`, `availability`, `assignments` (no status column —
      derived from `shifts.published_at`), `notifications`
- [X] 🔌 Configure Supabase Auth — decided: email/password, admin-created accounts (no real email
      sending in v1, see CLAUDE.md). Public sign-ups disabled, production redirect URL added,
      minimum password length raised to 8.
- [X] 💻 Write Row-Level Security policies based on role (Admin vs Worker) and, for personal data
      (availability, own qualifications), scoped to the requesting user — no multi-tenant
      isolation needed since this is a single organization. Verified behaviorally (not just "no
      error") with two real test accounts: worker/admin visibility, the self-report status/source
      restriction, shift_templates' zero worker access, and the assignments publish-timing rule
      all confirmed with actual role-simulated queries.
- [X] 💻 Build invite-based account creation (Admin creates/invites worker accounts) — no public
      self-serve signup, since this is one closed organization. Built: `/login`, admin layout
      guard + nav, `/admin/personnel` (create-worker form + list). **Verified in a real browser**
      end to end (login → create worker → appears in list → logout), not just build-passes —
      caught and fixed a real bug this way: `service_role` had zero base table privileges (not
      implicitly exempt just because it bypasses RLS), fixed via a new grants migration. See
      CLAUDE.md.
- [ ] 🔌 If using email invites: connect an email-sending service (e.g. Supabase's built-in
      email or Resend) — skipped: not using email invites in v1 (see CLAUDE.md), admin sets the
      password directly and relays it out-of-band

## Phase 3 — Admin features (core CRUD)

> Note: the basic personnel page (create a worker account, see the list) already exists from
> Phase 2 step 4 — the items below extend it (qualifications) rather than starting from scratch.

- [X] 💻 Admin: manage qualifications (name + optional renewal interval) — `/admin/qualifications`,
      one shared form for create/edit. Verified in a real browser: create, duplicate-name
      rejection, edit, delete, all confirmed against actual DB state (not just UI text). Minor
      known issue: a harmless Base UI dev-console warning about defaultValue on the shared form —
      functionally fine, not worth chasing further right now.
- [X] 💻 Qualification options (2026-08-22, user feedback): a qualification can optionally define
      a fixed set of selectable values (e.g. "Seniority" → "Junior"/"Permanent"/"Professional");
      workers will pick one when it has options. New `qualification_options` table +
      `worker_qualifications.option_id`, enforced by a DB trigger (not just app code) — verified
      all 3 rules directly against real inserts before building any UI on top. Qualifications
      form/list updated to add/edit/remove options and display them as badges.
- [X] 💻 App identity + shared header (2026-08-22, user feedback): named the app "המשבצת"
      (updated in `docs/product-spec.md`); built one shared, sticky `<AppHeader>`
      (`components/shared/AppHeader.tsx`) with a hamburger-triggered menu (shadcn `Sheet`),
      replacing the plain nav links and the original two-separate-nav-components plan — both
      `/admin/*` and `/dashboard` now use it. Verified in a real browser (menu opens, navigates
      correctly); one false alarm along the way — a screenshot taken mid-animation looked broken
      but a slightly longer wait showed it rendering correctly.
- [X] 💻 Admin: manage position types — which qualifications each requires, and (optionally)
      which qualification the position renews when fulfilled — `/admin/positions`, checkbox
      multi-select for both (a position can require/renew more than one). Deduplicated the admin
      nav-links list (was copy-pasted into two files) into `components/shared/nav-links.ts`
      before adding a third copy. Verified in a real browser: create with both required + renews
      set, edit (add another required qualification), delete — all confirmed, no console errors.
- [X] 💻 Required qualifications can target a specific option (2026-08-22, user feedback): e.g.
      "requires Seniority = Permanent," not just "requires Seniority." Added
      `position_qualifications.option_id` + a DB trigger mirroring the worker_qualifications one
      (verified against 4 scenarios before touching any UI). Replaced the checkbox multi-selects
      with `QualificationMultiPicker` — a dropdown that adds removable chips, opening a follow-up
      option-picker only for the "required" list and only when the chosen qualification has
      options ("renews" stays as a plain add, per user confirmation — see CLAUDE.md). Verified
      the full flow in a real browser: option-having + binary qualifications both added
      correctly, renews list correctly skips the option step, edit removes a requirement, delete
      — all with no console errors.
- [X] 💻 Admin: manage workers' qualifications (grant/revoke, with obtained date) —
      `/admin/personnel/[workerId]`, linked from the personnel list. `GrantQualificationForm`
      reuses the searchable-combobox pattern from positions, with the same "pick an option if the
      qualification has one" follow-up step. Revoke is a status update to `rejected`, not a
      delete (matches `docs/technical-plan.md`) — history stays queryable, and re-granting after
      a revoke correctly creates a new row alongside it (allowed by the partial unique index).
      `expires_on` is currently a simplified `obtained_at + renewal_interval_days` read, not yet
      folding in shift-based renewal since shifts/assignments don't exist yet (Phase 5) — revisit
      then. Verified in a real browser: grant with an option, grant binary + renewal (expiry math
      correct), duplicate-grant prevention, revoke, and re-grant-after-revoke — no console errors.
      One real bug caught this way: Base UI's `Select` needs an `items` prop to render the
      selected item's *label* instead of its raw value when controlled externally (`value=`) —
      fixed in `GrantQualificationForm`.
- [X] 💻 Admin: approve/reject pending self-reported qualifications — extends the same worker
      detail page: a `pending` row shows a "דווח על ידי העובד/ת" badge plus אישור/דחייה buttons
      instead of ביטול (`reviewQualification`, sharing its DB update with `revokeQualification`
      via a small private helper — both are just a status change under the same RLS policy).
      There's no worker self-report UI yet (Phase 4), so verified by seeding a pending row
      directly via the service-role client (simulating what a future self-report insert would
      produce) — confirmed the badge/buttons render correctly, approve transitions to `מאושר`
      leaving a ביטול button, reject transitions to `בוטל` with no action buttons, no console
      errors.
- [X] 💻 Admin: create/edit/delete shift templates (named bundle of positions + headcount) —
      `/admin/shift-templates`, added to the admin nav. `ShiftTemplatePositionsPicker` extends the
      searchable-combobox pattern with a per-row headcount number input (a new combined
      picker+quantity UI — no prior component in the codebase did both). Update uses the same
      replace-all-join-rows sync as `position_qualifications`. Verified in a real browser: create
      with two positions (custom headcount on one), edit (remove one position, change the other's
      headcount, confirmed the edit form pre-fills correctly), delete, the nav link, and — reusing
      an error path that already anticipated this — confirmed a position still referenced by a
      template can't be deleted (`on delete restrict`, existing Hebrew message). No console errors.
- [X] 💻 Admin: create/edit/delete shifts (date/time, location, required positions & headcount) —
      `/admin/shifts`, added to the admin nav. Optionally starts from a template: picking one in
      a `Select` pre-fills `ShiftPositionsPicker` (values copied in, no live link to the
      template). **UX note from user (2026-08-22)** implemented: the picker's "תפקיד חדש" button
      opens the real `PositionForm` in a `Dialog`, so admins never need to detour to
      `/admin/positions` — required extending `createPosition` to return the created
      `{id, name}` (was `Result<void>`) and adding an `onCreated` hook to `PositionForm`, both
      additive/backward-compatible. `deleteShift` blocks deletion once `published_at` is set (no
      publish flow exists yet, so unreachable today, but matches `docs/technical-plan.md`'s
      documented signature and costs nothing to add now).

      **Three real bugs caught by testing in a browser, not just building:**
      1. `listShifts()`'s embed (`shifts → shift_positions → positions`) was ambiguous to
         PostgREST — the `assignments` table has FKs matching the same shape at both levels
         (`shift_id` and `(shift_id, position_id)`), so it silently offered a second join path.
         Fixed with explicit `!shift_positions_shift_id_fkey` / `!shift_positions_position_id_fkey`
         hints. Symptom was sneaky: the insert succeeded (confirmed directly in the DB), the
         create form showed no error, but the list stayed empty — cost real time to trace back to
         the query rather than the mutation.
      2. Same Base UI `Select` "needs `items` prop for the label, not just the raw value"
         issue as `GrantQualificationForm` — hit again in the template-picker `Select` here.
         Two occurrences now — worth remembering as a standing rule for *any* new controlled
         `Select` in this codebase, not a one-off.
      3. The inline-create dialog's `onCreated` could fire more than once (React Strict Mode's
         dev-mode double-invoke of effects), adding the same position twice to picker state with
         a duplicate `key` — and per React's own docs, a duplicate key can make reconciliation
         *silently drop* unrelated children, which is exactly what happened: the whole positions
         list (including the pre-filled ones) vanished from the submitted form, not just the
         duplicate. Fixed by making the handler idempotent (`prev.some(id) ? prev : [...prev, x]`)
         rather than trying to prevent the double-fire itself.

      Verified end-to-end after all three fixes: create from template, inline-create a new
      position mid-edit (chip appears, persists after save), headcount edits, the
      end-before-start validation message, delete — no console errors on a clean run.
- [X] 💻 Admin: open an availability request window for an upcoming period — `/admin/availability-windows`
      (label + opens_at/closes_at, full CRUD), added to the admin nav. Status badge (טרם נפתח /
      פתוח / נסגר) computed at render time from `opens_at`/`closes_at` vs. now, not stored.
      **Real gap found and closed while building this**: `shifts.availability_window_id` existed
      in the schema and `/admin/shifts` was documented as "grouped by availability window," but
      no documented action anywhere (not `createShift`, not any window action) actually let an
      admin set that FK — confirmed with the user before proceeding, then added an optional
      "חלון זמינות" `Select` to `ShiftForm` (+ `availabilityWindowId` through
      `features/shifts/actions.ts`/`queries.ts`) so the link is actually reachable from the UI,
      plus a badge on each shift row showing its window's label when set. Applied the `items`
      prop to the new window-picker `Select` proactively this time (third occurrence of the same
      Base UI quirk — see the shifts entry above). Verified in a real browser: create/edit a
      window, closes-before-opens validation, create a shift assigned to a window (label displays
      correctly, not a raw id), deleting a window still referenced by a shift is correctly
      blocked (`on delete` default `NO ACTION` on the FK → friendly Hebrew message) — no console
      errors. Deferred: `/admin/availability-windows/[id]` (review submitted availability per
      shift) needs Phase 4's worker-submission feature to have any data to show, so it doesn't
      exist yet — not a gap, just sequencing, same reasoning as the dashboard.
- [X] 💻 Seed placeholder positions/qualifications for development — `supabase/seed.sql`
      (`[db.seed] sql_paths` in `config.toml` already pointed at this filename, unused until now).
      Qualifications (דרגה + options, מבצעיות + options, כשירות טיסה with a 180-day renewal),
      positions (טייס/נווט קרב/מכונאי with required options and renewing qualifications), and one
      shift template (טיסת שגרה) — designed from the placeholder data already organically built up
      in the dev DB through this session's testing, cleaned up (e.g. replaced a leftover
      `בדיקה 1` test qualification with the sensible `כשירות טיסה` renewal chain). Does **not**
      seed `profiles`/auth accounts — those go through the Auth admin API, not a plain insert,
      since `profiles.id` references `auth.users.id`.
      **Verification is partial, by design**: dry-ran the exact insert shapes (option/trigger
      constraints) via the service-role client against the real schema, insert-then-delete, all
      passed. Did **not** run an actual `supabase db reset` — no Docker installed for an isolated
      local stack, and the CLI is linked to the real remote dev project, so a reset would wipe
      everything built up this session (test accounts, all positions/qualifications/shifts).
      User confirmed: skip that for now, verify the real reset flow later when writing the
      local-run-instructions README deliverable, since that needs testing anyway.
- [X] 💻 Admin dashboard (home page): understaffed shifts flagged as priority, pending
      qualification approvals, upcoming shifts, qualifications expiring soon. Built last in Phase
      3 as planned (see the ordering note this replaced). `features/dashboard/` holds only the
      `<AdminDashboard>` composition component — no queries/actions of its own; each widget calls
      a new query added to its actual owning domain (`listUnderstaffedShifts`/`listUpcomingShifts`
      in `features/shifts/queries.ts`, `listPendingApprovals`/`listExpiringQualifications` in
      `features/worker-qualifications/queries.ts`), keeping one data-access layer per entity.
      `listUnderstaffedShifts` left-joins `assignments` (always empty today, Phase 5 not built) —
      correctly shows every upcoming shift with unmet requirements right now, and will start
      reflecting real staffing automatically once assignments exist, no rework needed.
      `EXPIRING_SOON_DAYS = 30` is a placeholder for the still-unresolved product-spec.md open
      question on the real threshold. Two more `profiles` embeds needed the same explicit-FK-hint
      treatment as before (`worker_qualifications` has both `worker_id` and `reviewed_by`
      referencing `profiles` — same ambiguity class as the `shift_positions`/`assignments` case,
      now four occurrences total). Verified in a real browser: all four widgets against real data,
      seeded a pending self-report + a soon-to-expire qualification to confirm those two
      (otherwise-empty) widgets render correctly, the "view all shifts" and worker-name links
      navigate correctly, no console errors.

**Phase 3 complete.**

## Phase 4 — Worker features

- [X] 💻 Worker: view their qualifications and expiry status (upcoming/expired) — `/my-qualifications`,
      under a new `app/(worker)/layout.tsx` (mirrors the admin layout: `requireWorker()` guard +
      `WORKER_LINKS` nav, new symmetric helper next to `requireAdmin()` in `lib/auth.ts`). Reuses
      `listWorkerQualifications` (already built for the admin's grant/revoke screen) — same data
      layer, new read-only `MyQualificationsList` component (no admin actions). Verified in a
      real browser as the actual worker account: qualification displays correctly with status +
      expiry, and confirmed `requireAdmin()` still correctly bounces a worker session away from
      `/admin/positions` back to `/dashboard` — no console errors.
- [X] 💻 Worker: self-report a qualification (status: pending until admin approves) — extends
      `/my-qualifications` with `SelfReportQualificationForm`, the same picker+option+date shape
      as the admin's `GrantQualificationForm` but kept as a separate component (no workerId param,
      obtained date can't be in the future, lands as `pending` not `approved`). New
      `selfReportQualification` action mirrors the RLS insert policy exactly (`worker_id =
      auth.uid()`, `source = 'self_reported'`, `status = 'pending'`) — the DB enforces it too, not
      just the action. Verified the full loop in a real browser: worker self-reports with an
      option → shows as `ממתין לאישור`, already-held exclusion blocks re-reporting the same one,
      admin's worker-detail page shows the `דווח על ידי העובד/ת` badge and אישור/דחייה buttons
      (built in the earlier approve/reject work), approving it flips the worker's own view to
      `מאושר` — no console errors.
- [X] 💻 Worker: submit availability for the open request window — `/availability`, new
      `features/availability/` domain. `listOpenWindowsWithShifts` finds every window where
      `opens_at <= now <= closes_at`, and its shifts, with the worker's own prior response (null
      if none). `submitAvailability` upserts on `(worker_id, shift_id)` per
      `docs/technical-plan.md` — resubmission just overwrites, matching the CRUD table's "no
      separate delete." First real use of `useOptimistic` in the app (`AvailabilityShiftRow`,
      per CLAUDE.md's state-management conventions calling out availability toggles as the
      canonical case) — instant button feedback on what's meant to be a quick phone interaction,
      wrapped in `useTransition` since `setOptimistic` must run inside one. Verified in a real
      browser: empty state when no window is open, admin opens a window + creates a shift in it,
      worker sees it and toggles זמין/ה ↔ לא זמין/ה, confirmed via direct DB read that a second
      click updates the same row rather than duplicating it, and confirmed the selected state
      survives a full page reload (i.e. actually persisted, not just the optimistic UI) — no
      console errors.
- [X] 💻 Worker: view their published upcoming shifts — `/my-shifts`. `listMyUpcomingShifts`
      added to `features/shifts/queries.ts` (not a new domain -- `assignments` CRUD/writes belong
      to Phase 5's `features/scheduling/`, per `docs/technical-plan.md`'s action list; this is
      just a read). Filters to `published_at is not null` and `date >= today` as defense in
      depth — RLS already enforces the exact same publish-timing rule at the DB level (the
      "worker sees own assignment only once published, never before" policy from Phase 2).
      `assignments` is empty today (Phase 5 not built), so correctly shows nothing until then.
      No admin UI exists yet to create assignments or publish a shift, so verified by seeding
      directly: one assignment on a manually-published shift (showed up correctly, with the right
      position badge) and one on a still-draft shift (correctly did not show, confirming both the
      query filter and RLS) — no console errors.

**Phase 4 complete.**

## UX/UI pass before Phase 5 (2026-08-25, user feedback)

User wrote up a full UX review (see conversation history) and explicitly split it into "do before
Phase 5" vs. "build as part of Phase 5" — the latter (color-coded shift calendar, the
assignment-approval/publish page, picking shifts into a window) *is* Phase 5's data model
(assignments, generate/publish) described from the UX side, so building it earlier would mean
guessing at a state model Phase 5 is about to define properly. Only the "do now" half is below.

- [X] 💻 Header: airplane icon + centered/enlarged logo, hamburger moved to the same edge the
      Sheet opens from (both now right-docked, previously inconsistent — button was left, panel
      slid in from the right), nav rebuilt as a 2-column grid of tiles instead of plain text
      links. All contained to `AppHeader.tsx`.
- [X] 💻 "Dashboard" is now a home screen, not a nav item — `ADMIN_LINKS`/`WORKER_LINKS` no
      longer include `/dashboard`; the logo (already linked there) is the only way in. Settled
      this before Phase 5 adds more admin pages that need to fit the nav shape.
- [X] 💻 Worker home screen: 3 upcoming shifts + link, qualification status, open-availability-
      window banner — `WorkerDashboard.tsx`, pure assembly of already-built queries
      (`listMyUpcomingShifts`, `listWorkerQualifications`, `listOpenWindowsWithShifts`), no new
      data logic.
- [X] 💻 `/admin/availability-windows/[id]` — per-shift breakdown of who marked available/
      unavailable. This was the page explicitly deferred back in Phase 3 pending Phase 4's
      worker-submission data; that data exists now, so built it. Real bug caught building it:
      `<Button render={<Link .../>}>` triggered a Base UI console warning (`nativeButton` expects
      a real `<button>`) — fixed by using the exported `buttonVariants()` directly on the `Link`
      instead of wrapping it in `Button`.
- [X] 💻 Desktop/mobile pass: admin layout width `max-w-3xl → max-w-6xl` (both the shared
      `(admin)/layout.tsx` and the dashboard page's admin branch) — screenshotted at 1440px
      before/after, previous width left most of a desktop screen empty. Also caught and fixed a
      real mobile overflow: `ShiftPositionsPicker`'s "תפקיד חדש" button was getting clipped at
      375px width (`flex` → `flex flex-wrap` on that row). Worker pages were already fine at
      mobile width (RTL logical utilities + shadcn defaults already mobile-first, per
      CLAUDE.md's day-one decision) — confirmed via screenshot, not just assumed.

## Phase 5 — Scheduling engine & publishing

**Constraint model design finalized 2026-08-26 (user feedback) — see the full writeup in
`docs/technical-plan.md` → "Scheduling engine — the matching heuristic" and `CLAUDE.md`'s
scheduling-constraints bullet before implementing any of this. Summary of what changed from the
original single-value-per-type design:**
- Per-worker-category constraint overrides, modeled via existing qualifications (not a
  hardcoded "reserve/regular" concept) — a constraint has one default value plus optional
  per-qualification-option override rows.
- `min_rest_hours` gets a days+hours input in the UI (value still stored as a single number of
  hours — form-only change, no schema impact beyond what's already needed).
- New worker-pairing preferences, three types: `avoid` (hard — never pairs, unfilled slot flagged
  like any other gap if that's the only option), `prefer_avoid` (soft — tries not to, but will
  rather than leave a slot empty), `prefer` (soft — tiebreaker boost the other direction). A pair
  holds exactly one of these at a time.
- Any `prefer_avoid` pair that **did** end up scheduled together must be flagged to the admin in
  two places: on the pre-publish review/approval screen, and persistently after publish too (not
  just at review time — an admin checking an already-published schedule later should still see
  it).
- One unified `/admin/settings` page (not a separate scheduling-settings + pairings page) —
  constraints section + pairing-preferences section now, structured so general app settings can
  be added as new sections later without moving anything. First addition beyond scheduling:
  `EXPIRING_SOON_DAYS` (currently hardcoded as a placeholder in
  `features/worker-qualifications/queries.ts`) becomes a real admin-tunable setting here instead.

---

**Test-infra sequencing decided 2026-08-27 (user question → discussion):** Vitest is being
brought forward into this phase, unit-test scope only (not the full Phase 6 setup — no React
Testing Library, no Playwright yet). Reasoning: every feature so far was verified by writing a
disposable Playwright script against a real browser, checking the result, then deleting the
script — that works well for UI-heavy CRUD, but the heuristic is pure logic with a lot of
interacting rules (2 constraint types × per-category overrides × 3 pairing types × scarcity
ordering × fairness tiebreak). Manually re-verifying that combination on every change would be
slow and error-prone in a way the rest of this project hasn't been; a kept, rerunnable unit test
is the right tool specifically here, not a general policy change for every future feature.

- [X] 💻 Set up Vitest (unit-test scope only — install, config, one smoke test) so the heuristic
      tests below have somewhere to live. `npm test` (single run) / `npm run test:watch`.
      `vitest.config.mts` uses the native `resolve.tsconfigPaths` option (not the
      `vite-tsconfig-paths` plugin — Vitest 4 flagged it as deprecated in favor of the native
      option during setup, so installed then immediately removed it). No jsdom/React plugin yet
      since these tests exercise plain functions, not components — added when Phase 6 brings in
      React Testing Library. Smoke test: `lib/__tests__/utils.test.ts` (`cn()`, 3 cases) — not
      meant as real coverage, just confirms the runner + `@/` path alias actually work; verified
      by running `npm test` (3 passed) and `npm run build` (untouched, still passes).
- [X] 💻 `scheduling_constraints` table + `worker_pairing_preferences` table —
      `supabase/migrations/20260827090000_add_scheduling_constraints_and_pairings.sql`. Neither
      table actually existed before this (only ever documented, not created — confirmed by
      grepping every prior migration). `scheduling_constraints` gets `qualification_option_id`
      (nullable FK) from day one, with partial unique indexes enforcing "at most one default row
      per type, at most one override row per (type, option)" — same partial-index technique as
      `worker_qualifications_active_unique` in the core schema. Seeded both default rows
      (`min_rest_hours`=8, `max_shifts_per_window`=5), disabled. `worker_pairing_preferences` uses
      a `check (worker_id_1 < worker_id_2)` to canonicalize pairs (one row regardless of UI
      selection order) plus a unique constraint so a pair holds exactly one preference at a time.
      Both tables admin-only for read *and* write (unlike qualifications/positions — workers have
      no legitimate reason to see either, same shape as `shift_templates`). Regenerated
      `types/database.types.ts`. **Verified directly against the real schema, not just written**:
      duplicate default row rejected, override row accepted, duplicate override rejected,
      reversed pair order rejected (check constraint), correct order accepted, duplicate pair
      rejected, and RLS confirmed behaviorally with real signed-in sessions — worker gets an empty
      result from both tables, admin sees everything.
- [X] 💻 App-settings value for `EXPIRING_SOON_DAYS` + unified `/admin/settings` page — built
      together since the page is what exercises the setting. `app_settings` (migration
      `20260827093000_add_app_settings.sql`): a true singleton table (`unique index ((true))`
      trick — at most one row, ever), explicit typed column (`expiring_soon_days`), not a generic
      key/value table, matching the same "known, fixed set of settings" convention as
      `scheduling_constraints`. `features/settings/` (deliberately separate from
      `features/scheduling/`, per the earlier design decision). Removed the hardcoded
      `EXPIRING_SOON_DAYS` constant from `features/worker-qualifications/queries.ts`; the admin
      dashboard now reads the real setting via `getAppSettings()`.

      `/admin/settings` composes three sections: scheduling constraints (`ConstraintTypeEditor` —
      one instance per type, default row + per-category override rows + an "add override"
      combobox scoped to qualification options not already overridden; days+hours inputs for
      `min_rest_hours`, combined into total hours server-side), worker pairing preferences
      (native `<select>`s deliberately, not the searchable-combobox pattern — a squadron roster
      doesn't need search, and natives sidestep the whole class of "needs a hidden input to
      submit via FormData" Base UI issues already hit twice), and the expiring-soon-days form.
      `setSchedulingConstraint` does a manual find-then-write instead of a DB upsert — Postgres
      can't target a *partial* unique index via `ON CONFLICT (columns) DO UPDATE` without also
      repeating the index's `WHERE` predicate, which the Supabase JS client's `upsert()` doesn't
      expose; `worker_pairing_preferences`' upsert works fine since that unique constraint isn't
      partial.

      **Real bug caught and fixed**: a new pattern for this codebase — these settings forms stay
      mounted across a successful save and receive fresh server data via `revalidatePath` (unlike
      every other form so far, which either unmounts on success (edit-mode forms close) or never
      has its `defaultValue` actually change (create-only forms)). An already-mounted uncontrolled
      `Input` receiving a *new* `defaultValue` triggered a genuine Base UI warning. Fixed by
      keying each row/form on its own current value (e.g. `key={`${id}-${enabled}-${value}`}`) so
      React remounts instead of mutating in place — same underlying idea as the `resetKey` pattern
      used everywhere else, just triggered by a value change instead of only after every submit.

      Verified thoroughly in a real browser end to end: days+hours (1d4h) correctly stored as 28,
      a per-category override (2d0h) correctly stored as 48 and both confirmed via direct DB
      read, override delete, `max_shifts_per_window` toggle, a real worker pairing added with a
      second seeded test worker and confirmed persisted/deleted, expiring-soon-days edited and
      confirmed both immediately (same page, no reload) and after a fresh reload — no console
      errors after the remount-key fix. All test data (constraints reset to seeded defaults,
      pairing deleted, second test worker's auth account deleted, `expiring_soon_days` reset to
      30) cleaned up afterward.
- [X] 💻 Implement the matching heuristic + unit tests — `features/scheduling/heuristic.ts`,
      built and tested together since that's the whole point of bringing Vitest into this phase.
      `runSchedulingHeuristic` is a **pure function** — no DB calls, no `"use server"` — takes
      already-fetched slots/workers/constraints/pairings as plain data, returns
      `{ assignments, unfilledSlots, softAvoidConflicts }`. `generateSchedule` (the actual Server
      Action that fetches from the DB, calls this, and writes the result) is intentionally a
      **separate**, not-yet-built task below — keeping the pure logic isolated from I/O is what
      makes it unit-testable at all.

      Matches `docs/technical-plan.md`'s algorithm exactly: flatten to slots → eligibility
      (qualifications + availability + no double-booking + enabled constraints resolved to each
      worker's effective per-category value + hard `avoid` pairing exclusion) → scarcity sort
      (computed once up front, not re-evaluated mid-run) → greedy assign scored by
      fewest-assignments-so-far adjusted for `prefer`/`prefer_avoid` → flag unfilled slots and
      every `prefer_avoid` pair that still ended up together.

      One real, non-obvious design resolution: `min_rest_hours` can only ever matter across
      *different* dates, since the double-booking rule already blocks two assignments on the same
      date outright regardless of this constraint — same-date test scenarios for "does the rest
      gap get enforced" are structurally impossible to write, they'd always fail on
      double-booking first. Discovered this via the tests themselves (see below), not by
      reasoning about it in advance.

      19 Vitest unit tests (`features/scheduling/__tests__/heuristic.test.ts`), all passing:
      qualification matching (incl. wrong-option-doesn't-satisfy), availability, double-booking
      (both pre-existing and within-run), `min_rest_hours` disabled/enabled/per-category-override,
      `max_shifts_per_window`, all three pairing types (hard avoid unfills rather than pairing;
      soft avoid pairs only when it's the only option and gets flagged; soft avoid does NOT pair
      when an alternative exists; prefer wins the tiebreak), fairness tiebreak spreads load, and
      scarcity ordering fills the scarce slot even when a more-open slot is also contending.
      **Two tests genuinely failed on the first run** — not algorithm bugs, my own test-scenario
      date/time math was wrong (a "2-hour gap" that was actually 26 hours; an override scenario
      where both slots landed on the same date, so double-booking blocked it before the rest
      constraint was ever exercised). Exactly the kind of mistake manual browser verification
      would have been slow to catch and unit tests caught immediately — the concrete payoff this
      test-infra decision was made for.
- [X] 💻 `generateSchedule` (the actual DB-touching Server Action, deliberately separate from
      the pure heuristic — see the heuristic.ts task above) + Admin: review the proposed
      schedule, manually reassign/fix unfilled shifts, see flagged `prefer_avoid` conflicts —
      `/admin/schedule/[windowId]`, reached via a new "שיבוץ" link on each availability window.

      **One real design gap caught building this, before any code**: the heuristic's original
      `ConstraintInput` type (from the earlier task) supported only one `enabled` flag per
      constraint *type*, but the actual `scheduling_constraints` schema and the `/admin/settings`
      UI already let each row — default *and* every override — be independently enabled. Fixed by
      reworking the type to `ConstraintRow[]` (one entry per DB row) with a proper resolution
      rule: a matching override governs completely, including its own enabled flag, regardless of
      the default's state (lets an admin scope a constraint to only one category, or exempt one
      category from an otherwise-active constraint) — falls back to the default only when no
      override matches. Added 2 more unit tests for this exact behavior; still all passing
      (21 total now).

      `buildHeuristicInputForWindow` (in `actions.ts`) assembles `HeuristicInput` from real
      queries — only *unpublished* shifts in the window get (re)generated; existing assignments
      on shifts outside this window still count toward double-booking. `generateSchedule` always
      clears and replaces (not merges) a window's unpublished assignments on every run — a
      deliberate "fresh start" choice, guarded by a confirm dialog in the UI since it can wipe
      manual edits. Unfilled-slot counts and `prefer_avoid` conflicts are both **computed at read
      time** from current `assignments` + `worker_pairing_preferences` (same convention as
      qualification expiry / understaffed-shift detection elsewhere) — not stored from the
      `generateSchedule` call — so they stay accurate through manual edits and remain visible
      after publish too, which is the actual requirement, not just "show them once after
      generating." Manual add/remove (`addAssignment`/`removeAssignment`) are deliberately
      unvalidated against qualifications/availability/rest constraints — the review step's whole
      point is the admin has final say to fix what the heuristic couldn't.

      Verified end-to-end in a real browser with a realistic scenario (2 workers, both qualified
      and available for one 2-headcount shift, a `prefer_avoid` pairing between them so the only
      way to fill the shift creates a flagged conflict): generate correctly produced 2/2 filled
      with the conflict banner showing the right pair and shift; manually removing one worker
      correctly dropped to 1/2 and cleared the conflict banner (recomputed live, not cached);
      re-adding them correctly restored both — proving the conflict flag really is live-computed,
      not a stale snapshot. No console errors. All test data cleaned up afterward.
- [X] 💻 Admin: publish the finalized schedule — flagged `prefer_avoid` conflicts must remain
      visible somewhere after publish too, not just on the pre-publish review screen.

      `publishShift`/`unpublishShift` (per-shift, not whole-window — an admin can resolve one
      gap with a phone call and publish just that shift separately) + `publishAllShiftsInWindow`
      (bulk convenience over the same per-shift logic) in `features/scheduling/actions.ts`.
      `getScheduleReview` already pulled *all* shifts in a window regardless of `published_at`
      and computed conflicts at read time (Phase 5's earlier task), so the review screen
      satisfied "visible after publish too" with no changes needed — verified this directly by
      re-fetching the review page after publishing and confirming the conflict banner still
      showed. Added a second surface anyway: `listActivePairingConflicts` (all upcoming shifts,
      not scoped to one window) feeds a new 5th card on `/dashboard`, so a flagged conflict is
      visible without the admin having to already be on the right window's review page.

      Publishing writes one `notifications` row per assigned worker (see the notifications task
      below) — best-effort, doesn't roll back the publish if the write fails.

      **Verified against the real running dev server, not just build-passing** — Playwright
      can't install a browser on this machine (`mac13-arm64` unsupported by the pinned version),
      so verification used `@supabase/ssr`'s own `createServerClient` with an in-memory cookie
      jar to mint a real session cookie (byte-identical to what the app itself produces, same
      library code, not hand-rolled), then `curl -b` against `localhost:3000` for real
      server-rendered HTML. Confirmed: bulk + per-shift publish buttons and published/draft
      badges render on `/admin/schedule/[windowId]`; publishing a real draft shift with real
      assignments correctly set `published_at`, wrote the right notification message, and made
      it show up on the assigned worker's `/notifications`, `/dashboard`, and `/my-shifts`; the
      dashboard's new conflict card correctly listed both shifts where the seeded demo's
      `prefer_avoid` pair (see below) ended up scheduled together anyway. All test-only state
      (one temporary shift, its notifications) cleaned up after.
- [X] 💻 Worker: in-app notification of newly published/assigned shifts — `features/notifications/`
      (new domain: `queries.ts`, `actions.ts`, `components/NotificationsList.tsx`), `/notifications`
      page, added to `WORKER_LINKS`. RLS policies and grants for `notifications` already existed
      from the Phase 2 migration (written ahead of need) — confirmed by grepping, nothing to add
      at the DB level. A "התראות" card was also added to the worker home screen
      (`WorkerDashboard.tsx`, same "3 most recent + link to see all" pattern as the shifts card),
      showing an unread-count badge. Mark-as-read and mark-all-as-read both wired up.
- [X] 💻 Automatic qualification renewal: once a shift's date has passed, extend the expiry of
      any qualification tied to a position an assigned worker fulfilled.

      Per CLAUDE.md's "computed at read time, not stored" rule — this is a **query-layer
      change**, not a background job. `features/worker-qualifications/queries.ts` gained
      `getLatestRenewalDates()`: joins `position_renews_qualifications` against `assignments` +
      `shifts`, keeping the latest date per `(worker, qualification)` among shifts that are
      published *and* whose end time has passed (matches CLAUDE.md's "completed" definition
      exactly, not the simplified "date passed" wording this checklist item used). Both
      `listWorkerQualifications` and `listExpiringQualifications` now take
      `max(obtained_at, latest completed renewing shift)` instead of just `obtained_at`. Removed
      the "doesn't fold in shift-based renewal yet, revisit in Phase 5" comment this was
      tracking since Phase 3.

      **Verified against the real dev server**: seeded a completed, published shift (2 days ago)
      where עידן כהן fulfilled טייס (a position that renews "בדיקה 1", 11-day interval).
      `/dashboard`'s expiring-soon card correctly moved his expiry from 2026-08-28 (the old
      `obtained_at`-only date) to 2026-09-04 (completed-shift-date + 11), confirmed via the same
      cookie-jar + curl method as above. Cleaned up the test shift after.

      **Known limitation, confirmed not v1 scope (2026-08-27, user question → discussion)**: this
      renewal logic is reactive only — it correctly extends expiry once a completed shift renews
      a qualification, but the *scheduling heuristic* has no expiry-awareness feeding the other
      direction (it won't preferentially pick a worker whose qualification is expiring soon for a
      shift/position that would renew it). See CLAUDE.md's scheduling-heuristic bullet for the
      full reasoning on why this is deferred, not an oversight.
- [ ] 🔌 *(optional, only if you decide to support it)* connect an email/SMS provider for
      off-app notifications — treat as a stretch goal, not core scope

## UX/UI batch A (2026-08-27, user's written notes after a full pass over the app)

User wrote up a full document of UX notes after using every built feature, then triaged it with
help into "do now" (Batch A, below) vs. "defer or cut" (Batch B — full calendar with live-push
editing, editing a published shift in place, availability-window shift-picking flow, cut
entirely: real-time push of requirement changes to an already-open worker tab). Batch A is
everything mechanical/self-contained enough to do before Phase 6; Batch B stays out of scope for
now given the 2026-09-06 deadline. One item (scheduling priority for expiring qualifications) was
raised again here but confirmed still deferred — see the known-limitation note above.

- [X] 💻 Header: airplane icon swapped to the *end* of the DOM order so it lands visually left of
      "המשבצת" under RTL (first DOM child sits at the right edge in a `dir="rtl"` flex row —
      confirmed by reading the rendered HTML, not just reasoning about it), text enlarged
      `text-xl` → `text-2xl`. Nav grid `grid-cols-2` → `grid-cols-1` (reversing the Phase-4 UX
      pass's own earlier choice, per explicit user re-review).
- [X] 💻 Background theming: `--background`/`--card`/`--secondary`/`--muted`/`--accent`/`--border`
      in `app/globals.css` moved from pure white/gray to a warm cream `oklch` palette, `--card`
      kept slightly lighter than `--background` so cards read as distinct regions. Light mode
      only (not touched: `.dark`).
- [X] 💻 `shifts.name` (nullable, additive migration) — optional display name, shown as a bold
      title wherever a shift is listed: `/admin/shifts`, the availability-window review page, the
      schedule review page. Regenerating `types/database.types.ts` via `supabase gen types`
      caught a real self-inflicted bug: piping `2>&1` *after* an already-redirected `>` sends
      stderr into the same file handle, so the CLI's "new version available" nag got appended
      into the generated types file and broke every downstream import. Fixed by stripping the two
      corrupted trailing lines; **rule going forward**: never chain `> file 2>&1 | ...` — redirect
      stdout to the file and let stderr go to the terminal separately.
- [X] 💻 Mechanical UI pass across the 5 CRUD admin pages (shifts/qualifications/positions/
      shift-templates/personnel): shrunk oversized inputs (date/time, validity-in-days, option
      labels, name fields), added a client-side search filter to every existing-item list (small
      lists, plain `.filter()`, no new server queries), and — for shifts/qualifications/positions
      specifically (not templates/personnel, per the user's exact list) — moved the existing-item
      list to a `md:w-1/3` column left of a `md:w-2/3` form column. The "start from template"
      `<Select>` on the shift form became a searchable Command/Popover combobox, same pattern
      already used for position/template pickers.
- [X] 💻 Availability-window form: `opensAt`/`closesAt` split into separate date+time `<Input>`s,
      combined into the single ISO value the server action already expects (form-only change,
      same pattern as `min_rest_hours`' days+hours combining) — no action/schema change.
- [X] 💻 Availability-window review page (`/admin/availability-windows/[id]`) rebuilt: shows only
      workers who marked *available* (previously showed both, with a badge), each with which of
      the shift's required positions they're actually eligible for (new qualification-matching
      query logic, mirrors the heuristic's eligibility check but without availability/rest/pairing
      since this is a pre-generation view). Cards collapse to name/time/available-count, expand to
      the full per-position eligibility table. Added a search filter.
- [X] 💻 Schedule review page (`/admin/schedule/[windowId]`) rebuilt the same way: collapsible
      cards (collapsed shows the *available* count, per the user's exact spec, even though the
      expanded view shows actual assignments), search filter, bold shift name. The "add worker"
      picker now defaults to qualification-eligible workers only, with a "הצג את כל העובדים"
      toggle to reveal everyone — keeps the documented "admin has final say" override capability
      the user explicitly confirmed she wanted kept, while satisfying "no option to add someone
      unqualified" as the *default*, not an absolute block.
- [X] 💻 Admin home screen: new "שיבוצים ממתינים לאישור" card (top of the grid, spans both
      columns) — every availability window whose `closes_at` has passed and that still has an
      unpublished shift, linking straight to its review page. Directly answers the earlier
      discoverability gap (schedule review was only reachable via a per-window "שיבוץ" link).
- [X] 💻 Worker-facing expiring-qualification visibility, two parts: `MyQualificationsList` gets a
      "פג תוקף בקרוב" badge (red-tinted card) using the same `expiringSoonDays` setting the admin
      dashboard already uses; the availability-submission page highlights any shift where some
      position the worker is qualified for would renew one of their soon-expiring qualifications
      (`position_renews_qualifications` cross-referenced against eligibility and expiry — new
      logic in `features/availability/queries.ts`).
- [X] 💻 Overlapping-shift availability dedup: `listOpenWindowsWithShifts` now groups shifts
      sharing the exact same date/start/end time into one `AvailabilitySlot` (exact-match, not
      partial-overlap — matches "parallel" in the original feedback), one row per slot on the
      availability page, `submitAvailability` takes `shiftIds: string[]` and upserts all of them
      from a single response. Deliberately no schema change — `availability` stays keyed per
      shift exactly as before, grouping is computed at read time, same convention as everywhere
      else in this codebase.

      **Verified end-to-end against the real running dev server**, not just build-passing:
      Playwright still can't launch a browser on this machine, so used the same
      `@supabase/ssr`-minted-cookie + `curl` method as Phase 5's publish verification. Confirmed:
      logo DOM order, all five list pages' search boxes and layout classes render; the pending-
      approvals card is correctly empty when no window has closed yet, and correctly appears when
      one is temporarily backdated (reverted after); `ScheduleShiftCard`'s `eligibleWorkerIds` for
      טייס correctly resolved to exactly the two rank-appropriate demo workers; the availability-
      window review page's per-shift `responses` array correctly excluded workers who marked
      themselves unavailable for that specific shift; the expiring-soon badge and renewing-shift
      highlight both appeared for the right seeded worker/qualification; two temporary
      same-time-slot shifts correctly merged into one `AvailabilitySlot` with both shift IDs, and
      writing one response correctly upserted both underlying `availability` rows. All temporary
      test shifts/data and scratch verification scripts cleaned up afterward.

## UX/UI batch continued (2026-08-28, user's follow-up notes + bug reports)

Same source document, resent with new content appended after her own review of what Batch A
built. Most of it was already-done or still-deferred Batch B material (calendar, etc., expected
to keep reappearing in this doc since it's the same running file); this section covers only what
was genuinely new, plus two real bugs she hit while testing.

- [X] 💻 **Root-cause fix for both reported bugs** (shift-name edit throwing an error that
      persisted anyway; qualifications page appearing to lose its header/hamburger). This app had
      zero error boundaries anywhere (`find app -iname error.tsx` returned nothing) — added
      `app/error.tsx`, scoped so a page-content error no longer takes the `(admin)`/`(worker)`
      layout (and its header) down with it. Root cause of the actual crash: all five "inline edit
      in a list" components (shifts/qualifications/positions/templates/availability-windows)
      render their edit form with no `key` — when a `revalidatePath`-triggered prop refresh lands
      while the form is still mid-unmount (the same tick `onDone()` clears `editingId`), an
      uncontrolled `Input` receives a changed `defaultValue` while still mounted, the exact Base
      UI issue already documented once in this file (Phase 5, settings forms) but never applied
      to these five list components since until now they always fully unmounted before any prop
      change could reach them. Fixed by keying each edit form on a signature of its own editable
      fields (e.g. `` `${s.id}-${s.name}-${s.date}-...` ``) — a remount gets fresh `defaultValue`s
      instead of a mounted component receiving changed ones, same fix pattern as Phase 5, applied
      proactively to all five, not just the two she happened to hit.
- [X] 💻 Shifts page: flipped the split (form 1/3, existing shifts 2/3 — reverse of what Batch A
      built, per explicit re-review). Positions and qualifications pages: 1/3–2/3 → 50/50.
- [X] 💻 Shrunk the qualifications page's "הוספת אפשרות" button (`size="sm"`, `w-fit`).
- [X] 💻 Softened the button color (`--primary` in `app/globals.css`, near-black →
      a muted slate blue, light mode only).
- [X] 💻 "חלון זמינות חדש" dialog inside `ShiftForm` — exact same pattern already established for
      creating a position inline from the shift-positions picker (`onCreated` callback,
      `extraWindows` dedup against the server-refreshed list). Required extending
      `createAvailabilityWindow`'s return type to actually return the created row (it previously
      returned nothing).
- [X] 💻 New "שובצה" (assigned) status badge on the shifts list — shown when a shift has
      assignments but isn't published yet, between "טיוטה" and "פורסמה". `listShifts()` now also
      returns `assignedWorkerNames`, which also feeds the search extension below.
- [X] 💻 Split shift history out: `/admin/shifts` now scopes to `date >= today` only; new
      `/admin/shifts/past` (read-only — no edit/delete, matches the "already occurred" rule
      already written for the deferred calendar's color states) shows everything before today,
      with its own search. `listShifts()` gained a `scope: "all" | "upcoming" | "past"` param.
- [X] 💻 Every shift search (admin shifts list, availability-window review, schedule review) now
      also matches by assigned/available worker name, not just name/date/position.
- [X] 💻 **New feature**: post-close availability change requests. Once a window closes, a worker
      can no longer toggle their response, but it doesn't just disappear either —
      `listRecentlyClosedWindowsWithResponses` shows their own past answers read-only (last 3
      closed windows they responded in). A "לא אוכל להגיע" button on a shift they marked available
      opens an optional-message flow (`requestAvailabilityChange`) that writes to a new
      `availability_change_requests` table (migration
      `20260828060000_add_availability_change_requests.sql`; RLS: worker inserts/reads own only,
      only an admin can update/acknowledge). Deliberately **not** built on the existing
      `notifications` table — that table's RLS is admin-insert-only (notifications flow
      admin→worker, this is the reverse direction). Admin sees pending requests in two places,
      same "per-page detail + dashboard aggregate" pattern as the pairing-conflicts card:
      `ChangeRequestsCard` on the relevant `/admin/schedule/[windowId]` page, and a global
      unacknowledged-count card on `/dashboard`. Acknowledging is a one-way flag
      (`acknowledgeChangeRequest`) — it doesn't touch `assignments` itself; the admin makes (or
      doesn't make) the actual schedule change manually via the existing add/remove-assignment UI,
      exactly as specified.

      **Verified end-to-end against the real dev server**: same cookie-jar + curl method as
      before. Confirmed the "שובצה" badge renders for a real unpublished-but-assigned demo shift;
      created a real change request (mirroring the actual insert), confirmed it appeared on both
      the schedule review page's card and the dashboard's global card with the right worker/shift/
      message; confirmed the worker's own closed-window view showed the pending state; ran the
      acknowledge path, confirmed both the admin's "נצפתה" badge and the worker's "האדמין ראה
      וטיפל" text updated, and confirmed the dashboard card correctly dropped the request once
      acknowledged (it only counts unacknowledged ones). All test data and scratch scripts cleaned
      up afterward; the demo window's `closes_at` was temporarily backdated twice for this
      testing and restored both times.

## Phase 6 — Testing

**Playwright ruled out for real, 2026-08-28**: `npx playwright install chromium` fails outright
with `Playwright does not support chromium on mac13-arm64` — not a missing-download issue, a hard
platform-support wall on this dev machine. Confirmed before touching the original plan, not
assumed. Adapted strategy (see `docs/test-spec.md` for the full writeup): React Testing Library
for component-level UI (works fine in `jsdom`, no real browser needed), and a new integration
layer (`tests/integration/`) that calls the real Server Actions against a real Supabase project —
via ephemeral test accounts created through the Auth Admin API and a real signed-in session, with
only `@/lib/supabase/server`'s `createClient()` and `next/cache`'s `revalidatePath` swapped for
test doubles (the two pieces of Next.js request plumbing that don't exist outside a real HTTP
request) — instead of a Playwright click-through. This exercises real RLS and real Postgres, which
is arguably the more important boundary for this app's authorization model anyway (see CLAUDE.md's
"assignments has no status column" bullet). Genuinely visual concerns (RTL bidi date rendering,
responsive layout) that no jsdom-based tool can catch became a documented manual regression
checklist instead — itself one of the assignment's named acceptable tools, not a fallback.

- [X] 💻 Extend the Vitest setup (already installed in Phase 5 for the heuristic tests) with
      React Testing Library for component coverage; Playwright dropped per the above (kept as a
      devDependency but unusable on this machine — not removed, in case a future environment can
      run it). `tests/setup-rtl.ts` (jest-dom matchers + RTL's `cleanup` after each test — the
      latter isn't automatic and its absence caused real cross-test leakage on the first run,
      caught immediately by a failing "multiple elements found" test, not silently). One
      component test written: `features/availability/__tests__/AvailabilityShiftRow.test.tsx`
      (optimistic toggle, conditional badge, `dir="ltr"` date rendering).
- [X] 💻 ~~Unit tests for the scheduling algorithm~~ — moved to Phase 5, see there (test-infra
      sequencing decision, 2026-08-27)
- [X] 💻 Unit tests for qualification expiry/renewal logic — `computeExpiresOn` (in
      `features/worker-qualifications/queries.ts`) exported and unit-tested directly
      (`features/worker-qualifications/__tests__/computeExpiresOn.test.ts`): never-expires,
      plain-interval, renewal-date-extends-expiry, the `>` boundary case, month/year rollover.
      `getLatestRenewalDates` (the DB-querying half that finds *which* position renews *which*
      qualification) is covered by the integration suite instead — it's a real join across
      `position_renews_qualifications`/`assignments`/`shifts`, not something worth mocking.
- [X] 💻 Tests for authorization boundaries — two layers, both tested (`tests/integration/
      authorization.test.ts`): the app-layer guard (`requireAdmin`/`requireWorker`, also unit-
      tested fast/mocked in `lib/__tests__/auth.test.ts`) and the real boundary underneath it,
      Postgres RLS, against a real Supabase project with ephemeral test accounts. Confirmed: a
      worker calling an admin-only Server Action is redirected (not just refused data); a worker
      can't read another worker's `worker_qualifications` rows; a worker can't create or even
      read `shift_templates`; a worker can't see their own assignment before its shift is
      published, only after (the timing-based rule, not just a role check) — admin sees it
      regardless. All cleaned up afterward (verified via a scratch script: zero leftover
      `__test__`-prefixed rows or users after a run) — caught and fixed one real bug in the test
      itself this way: an early version silently dropped a qualification from its own cleanup
      list without checking whether the delete it was tracking had actually succeeded.
- [X] 💻 End-to-end test(s) for the core flow — `tests/integration/core-flow.test.ts`: create
      position + availability window + shift → worker submits availability → admin generates
      the schedule (real heuristic call, fills the slot) → worker can't see it yet → admin
      publishes → worker now sees the assignment *and* a notification, read via the worker's own
      real session (not the service-role client) — proving RLS actually grants it, not just that
      the row exists.
- [X] 🧭 Document manual test cases for places automation isn't practical — `docs/test-spec.md`'s
      "בדיקות ידניות מתועדות" section (RTL/bidi date rendering, responsive layout, a fresh
      worker login, the pairing-conflict banner staying visible after publish).
- [X] 💻 Invalid-input tests (added to this phase, not originally a separate TODO line, per
      re-reading the assignment's actual test-spec requirements — see `docs/test-spec.md` §2):
      one representative Zod schema per distinct validation shape in the app (`shiftSchema`'s
      cross-field end-after-start refine, `createWorkerSchema`'s email/password format,
      `qualificationSchema`'s positive-integer-or-null renewal interval, `windowSchema`'s
      cross-field closes-after-opens refine).

**Phase 6 complete.** 68 automated tests total: 55 in `npm test` (unit + component, always
green, no external dependencies) + 13 in `npm run test:integration` (real Supabase project,
opt-in — see `docs/test-spec.md` for why it's kept separate).

## Phase 7 — Scale, security write-ups & deployment polish

- [X] 🧭 Finalize the scale doc based on what you actually built — `docs/scale.md`: expected load
      (squadron scale, dozens–hundreds of rows, not internet scale), which queries could get heavy
      (`getLatestRenewalDates` scanning all assignment history is the one without a natural
      ceiling — flagged as the top future-improvement candidate), the four already-existing
      indexes and exactly which query each serves, why no `select("*")`-on-lists and no N+1 (FK-
      hint embeds), why no pagination yet (real, deliberate limitation given actual data volumes,
      not an oversight — documented with what would change the calculus), the client/server split
      (Server Components + Server Actions, no client-state library, per CLAUDE.md), and concrete
      future-scale steps in priority order.
- [X] 🧭 Finalize the security doc based on what you actually built — `docs/security.md`: the
      two-layer authorization model (app-guard + RLS, with the `assignments` publish-timing
      policy as the standout non-role-based example), input validation (Zod at the app layer +
      DB triggers as defense-in-depth), why there's no separate API surface to secure (Server
      Actions only, with Next.js's built-in Origin/CSRF check and encrypted action IDs — confirmed
      by reading `node_modules/next/dist/docs` directly, per house rule), secret management
      (confirmed `SUPABASE_SERVICE_ROLE_KEY` is referenced only in two server-only files, never a
      `"use client"` one), and an honest remaining-risks section (no rate limiting, no audit log,
      no MFA, no CSP headers).
- [X] 🧭 Write local run instructions + env var explanation for the README — `README.md` rewritten
      with the full from-scratch path (create a Supabase project → apply migrations via CLI or
      SQL Editor → seed → configure auth settings manually, since `config.toml`'s auth section is
      documented-but-not-pushed by design, see its own note → env vars → bootstrap the first admin
      → `npm run dev`), plus a testing section. **Real gap found and closed while writing this**:
      there was no way to create the app's *first* admin account at all — `/admin/personnel`
      always creates a `worker`, and account creation requires an existing admin session to reach
      that page in the first place. Fixed with a new one-off bootstrap script
      (`scripts/create-admin.mjs`, `npm run create-admin`), the same two-step Admin-API pattern
      `createWorkerAccount` uses but setting `role: "admin"` directly via the service-role client.
      Verified against the real dev Supabase project (created a real account, confirmed the
      `profiles` row via a direct query, confirmed the `npm run create-admin --` argument-passing
      documented in the README actually works, deleted the test account after).
- [X] 🔌 Confirm final deploy on Vercel works end-to-end from a fresh browser/incognito session —
      pushed Phase 7's commit, polled the GitHub commit status until Vercel reported success, then
      confirmed against the live URL itself (not just the deploy status): fresh `age: 0` response
      (not a stale cached build), `dir="rtl"`/`lang="he"` intact, and every route tried while
      logged out (`/`, `/dashboard`, `/admin/shifts`) correctly 307-redirects to `/login` — the
      auth guard is real in production, not just locally. **Real bug caught this way**: the
      browser tab title was still literally "Create Next App," the `create-next-app` scaffold
      default — `app/layout.tsx`'s `metadata` was never updated after the app was named "המשבצת"
      back in Phase 3. Fixed, rebuilt, retested, pushed again, reconfirmed live.

**Phase 7 complete.**

## Post-Phase-7 production incident (2026-08-28, user bug report)

User reported a hard error screen when creating a new worker on the live app. Traced end to end
from her report, not guessed: her browser console showed a 500 on the `personnel` request plus a
minified React error #441; looked that code up (`"An error occurred in the Server Components
render"` — a server-side failure, not a client one) and checked the DB directly first to see
whether the worker had actually been created despite the error (confirmed no new row — the
failure happened before any write, ruling out a partial-success case). Asked her to pull the
actual stack trace from Vercel's logs rather than guessing further, which gave the real answer
immediately: `A "use server" file can only export async functions, found object`.

**Root cause**: Phase 6 added `export const xSchema = z.object(...)` to four `"use server"` action
files (`features/{shifts,accounts,qualifications,availability-windows}/actions.ts`) so their Zod
schemas could be unit-tested directly — a real Next.js constraint violation that `npm run build`
never caught (confirmed by rebuilding clean both before and after the fix). This broke four core
admin flows simultaneously in production — create shift, create qualification, create
availability window, create worker account — from the moment that commit deployed until this was
diagnosed and fixed, several hours later. See `CLAUDE.md`'s second "concrete proof this matters"
incident for the full rule going forward.

**Fix**: moved each schema into its own plain `features/*/schema.ts` (no `"use server"`), imported
by both the action file and its test — `features/{shifts,accounts,qualifications,
availability-windows}/schema.ts`. Verified: `npm test` (55/55) and a clean `npm run build` both
still pass, grepped every `"use server"` file in the app for any remaining non-function/non-type
export (none found — confirmed this was exactly four files, not more), pushed, and confirmed the
new deployment succeeded. Full browser-based reverification (actually clicking "create worker" in
production) is the user's to confirm next, since no local browser automation is available on this
machine (see `docs/test-spec.md`) — asked her to retry.

**Process gap this exposes**: nothing in the automated test suite would have caught this, since
Vitest never bundles a file through Next.js's own "use server" export-checking pass — it only
imports the schema constant directly, which works fine in isolation. Worth remembering next time
a schema/type is pulled out of an action file "just for testing": the *destination* file mattered
more than the fact that a test could still import it.

**Second, unrelated issue found immediately after, same symptom class**: after the fix above,
creating a worker still failed — a different Vercel log this time: `Error: supabaseKey is
required.` from `createAdminClient()` (`lib/supabase/admin.ts`). `SUPABASE_SERVICE_ROLE_KEY` was
missing/unset for the Production environment specifically in Vercel's project settings — a
pre-existing gap, not something this session introduced, and not caught earlier because prior
verification of `createWorkerAccount` (Phase 2) was done against local dev (`npm run dev` +
`.env.local`), never against the actual live Vercel deployment's own env vars. `createAdminClient`
is used by exactly one action (`createWorkerAccount`), which is why only that flow was affected by
this second issue, not the other three from the first bug. User added the key in Vercel, redeployed,
and confirmed worker creation now works on the live site. **Rule going forward**: a feature that
touches the service-role client specifically needs its own live-deployment check, not just a local
one — local `.env.local` and Vercel's env vars are two separate configurations that can silently
drift apart.

## Phase 8 — Presentation

- [ ] 🧭 Prepare the 10–15 minute presentation covering: problem, users, business value,
      architecture, DB design, core flows, tests, scale thinking, security thinking, what you'd
      improve with more time
- [ ] 🧭 Do a dry run explaining *why* each major technical decision was made (this is explicitly
      what's being graded, not just whether it works)
