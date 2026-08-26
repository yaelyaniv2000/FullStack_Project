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
- [ ] 🧭 Write the test spec doc (which flows/edge cases/permissions need tests — content, not
      code yet)
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
- [ ] 💻 Admin: publish the finalized schedule — flagged `prefer_avoid` conflicts must remain
      visible somewhere after publish too, not just on the pre-publish review screen
- [ ] 💻 Worker: in-app notification of newly published/assigned shifts
- [ ] 💻 Automatic qualification renewal: once a shift's date has passed, extend the expiry of
      any qualification tied to a position an assigned worker fulfilled (document the "shift
      date passed = completed" simplifying assumption)
- [ ] 🔌 *(optional, only if you decide to support it)* connect an email/SMS provider for
      off-app notifications — treat as a stretch goal, not core scope

## Phase 6 — Testing

- [ ] 💻 Extend the Vitest setup (already installed in Phase 5 for the heuristic tests) with
      React Testing Library + Playwright for component/e2e coverage
- [ ] 💻 ~~Unit tests for the scheduling algorithm~~ — moved to Phase 5, see there (test-infra
      sequencing decision, 2026-08-27)
- [ ] 💻 Unit tests for qualification expiry/renewal logic (expiry computed correctly, renewal
      triggers only for the right position, doesn't renew for unrelated positions)
- [ ] 💻 Tests for authorization boundaries (Admin-only actions blocked for Workers, a worker
      can't see/edit another worker's data)
- [ ] 💻 End-to-end test(s) for the core flow: create shift → submit availability → generate
      schedule → publish → worker sees shift
- [ ] 🧭 Document any manual test cases for places automation isn't practical (per the test spec
      doc)

## Phase 7 — Scale, security write-ups & deployment polish

- [ ] 🧭 Finalize the scale doc based on what you actually built (indexes added, pagination used,
      client/server split, known limits)
- [ ] 🧭 Finalize the security doc based on what you actually built (auth, RLS-based
      authorization, input validation, secret management, known remaining risks)
- [ ] 🔌 Confirm final deploy on Vercel works end-to-end from a fresh browser/incognito session
- [ ] 🧭 Write local run instructions + env var explanation for the README

## Phase 8 — Presentation

- [ ] 🧭 Prepare the 10–15 minute presentation covering: problem, users, business value,
      architecture, DB design, core flows, tests, scale thinking, security thinking, what you'd
      improve with more time
- [ ] 🧭 Do a dry run explaining *why* each major technical decision was made (this is explicitly
      what's being graded, not just whether it works)
