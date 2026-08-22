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

- [ ] 💻 Admin: manage qualifications (name + optional renewal interval)
- [ ] 💻 Admin: manage position types — which qualifications each requires, and (optionally)
      which qualification the position renews when fulfilled
- [ ] 💻 Admin: manage workers' qualifications (grant/revoke, with obtained date)
- [ ] 💻 Admin: approve/reject pending self-reported qualifications (see Phase 4)
- [ ] 💻 Admin dashboard (home page): understaffed shifts flagged as priority, pending
      qualification approvals, upcoming shifts, qualifications expiring soon
- [ ] 💻 Admin: create/edit/delete shift templates (named bundle of positions + headcount)
- [ ] 💻 Admin: create/edit/delete shifts (date/time, location, required positions & headcount) —
      optionally starting from a template (copies its values in, no live link) and adjusting
- [ ] 💻 Admin: open an availability request window for an upcoming period
- [ ] 💻 Seed placeholder positions/qualifications for development — replace with the squadron's
      real ones whenever that info arrives, no code changes needed

## Phase 4 — Worker features

- [ ] 💻 Worker: view their qualifications and expiry status (upcoming/expired)
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
