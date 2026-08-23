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
- [ ] 💻 Worker: self-report a qualification (status: pending until admin approves)
- [ ] 💻 Worker: submit availability for the open request window
- [ ] 💻 Worker: view their published upcoming shifts

## Phase 5 — Scheduling engine & publishing

- [ ] 💻 `scheduling_constraints` table + migration seeding `min_rest_hours` and
      `max_shifts_per_window` (disabled by default)
- [ ] 💻 Admin: scheduling-settings page to enable/tune constraints (update-only, no create/delete)
- [ ] 💻 Implement the matching heuristic (qualifications + availability + no double-booking +
      enabled `scheduling_constraints` — keep it simple and explainable)
- [ ] 💻 Unit tests specifically for each constraint type (disabled = no effect; enabled = correctly
      excludes ineligible workers)
- [ ] 💻 Admin: review the proposed schedule, manually reassign/fix unfilled shifts
- [ ] 💻 Admin: publish the finalized schedule
- [ ] 💻 Worker: in-app notification of newly published/assigned shifts
- [ ] 💻 Automatic qualification renewal: once a shift's date has passed, extend the expiry of
      any qualification tied to a position an assigned worker fulfilled (document the "shift
      date passed = completed" simplifying assumption)
- [ ] 🔌 *(optional, only if you decide to support it)* connect an email/SMS provider for
      off-app notifications — treat as a stretch goal, not core scope

## Phase 6 — Testing

- [ ] 💻 Set up Vitest/Jest + React Testing Library + Playwright in the repo
- [ ] 💻 Unit tests for the scheduling algorithm (qualification match, availability conflicts,
      constraint enforcement, unfilled-shift edge cases)
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
