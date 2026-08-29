# מסמך אפיון בדיקות (Test Spec) — Squadron Personnel & Shift Scheduling App

> Course deliverable #5 (per `Internet Technologies.pdf` §6): explain what tests are needed to
> confirm the product actually works, structured around the seven categories the assignment
> names explicitly. Deliverable #6 (the test *code*) implements this spec — see "כיצד להריץ" below
> for how to run it, and each section's table for exactly which file covers which case. Per the
> assignment: not every line needs a test, but the core processes do.

## כלים ואסטרטגיה (Tools & strategy)

Four layers, matching the assignment's own list of acceptable tools (§7: Vitest, Jest, React
Testing Library, Playwright, or documented manual tests):

| Layer | Tool | Where | What it's for |
|---|---|---|---|
| Unit | Vitest, `node` environment | `**/__tests__/*.test.ts` | Pure logic: Zod validation, expiry math, the scheduling heuristic, auth guards |
| Component | Vitest + React Testing Library, `jsdom` | `**/__tests__/*.test.tsx` | Client component behavior (optimistic UI, conditional rendering) without a real browser |
| Integration | Vitest, real Supabase project | `tests/integration/*.test.ts` | Real Server Actions run against real RLS policies and a real Postgres database |
| Manual | Documented checklist | this file, "בדיקות ידניות מתועדות" below | Things only a real rendered browser can catch (see below) |

**Why no Playwright, despite it being installed (`devDependencies`)**: this dev machine is
`mac13-arm64`, which the pinned Playwright version does not support for browser binaries —
confirmed directly (`npx playwright install chromium` fails with `Playwright does not support
chromium on mac13-arm64`, not just "browser not downloaded yet"). Real end-to-end and UI
verification throughout Phases 3–5 (see `TODO.md`) was already done by hand against a real
running browser instead; the integration layer below formalizes the equivalent of that as a kept,
rerunnable automated suite rather than disposable scripts, and the manual section captures the
handful of things that are inherently visual (see below) and were always going to need a human
looking at a screen regardless of which browser-automation tool was available.

**How the integration layer works**: it calls the real, unmodified Server Actions
(`createShift`, `submitAvailability`, `generateSchedule`, `publishShift`, etc.) — not a
reimplementation of their logic. Two purely-Next.js-specific pieces that only exist inside a real
HTTP request are swapped for a test double: `@/lib/supabase/server`'s `createClient()` (mocked to
return a real, already-signed-in `supabase-js` client for an ephemeral test admin/worker account
created via the Auth Admin API) and `next/cache`'s `revalidatePath` (a no-op — it needs a
static-generation store that doesn't exist outside a request). Everything else — the action's own
code, Postgres, and every RLS policy — is real. Test accounts are created fresh and deleted in
`afterAll`; every row a test creates is named with a `__test__` prefix (see
`tests/integration/helpers.ts`) so a failed cleanup is always easy to spot and never mistaken for
real/seeded data.

## 1. בדיקות לפיצ'רים המרכזיים (Core features)

| Feature | Test | File |
|---|---|---|
| Qualification expiry/renewal math | `computeExpiresOn` — never-expires, plain interval, renewal-date extension, boundary equality, month/year rollover | `features/worker-qualifications/__tests__/computeExpiresOn.test.ts` |
| Scheduling heuristic | Qualification matching, availability matching, scarcity ordering, fairness tiebreak, all 3 pairing types | `features/scheduling/__tests__/heuristic.test.ts` (21 cases, built in Phase 5) |
| Availability submission (worker) | Optimistic toggle, correct button state, calls `submitAvailability` with the right shift IDs (incl. grouped/overlapping shifts) | `features/availability/__tests__/AvailabilityShiftRow.test.tsx` |
| Auth guards | `requireAdmin`/`requireWorker` return the right profile for the right role | `lib/__tests__/auth.test.ts` |
| End-to-end core flow | Create shift → submit availability → generate → publish → worker sees it | `tests/integration/core-flow.test.ts` (also satisfies §3 below) |

## 2. בדיקות לקלטים לא תקינים (Invalid input)

Representative Zod schemas across different validation shapes (required fields, format checks,
cross-field refinements) — not all ~10 action schemas, per the assignment's "not every line"
allowance, but one from each distinct shape used in the app:

| Schema | Cases covered | File |
|---|---|---|
| `shiftSchema` | missing date, end time equal to/before start time (cross-field `.refine`) | `features/shifts/__tests__/validation.test.ts` |
| `createWorkerSchema` | empty name, malformed email, password under 8 chars | `features/accounts/__tests__/validation.test.ts` |
| `qualificationSchema` | empty name, negative/non-integer renewal interval | `features/qualifications/__tests__/validation.test.ts` |
| `windowSchema` | empty label, `closesAt` equal to/before `opensAt` (cross-field `.refine`) | `features/availability-windows/__tests__/validation.test.ts` |

## 3. בדיקות לתהליכים עסקיים מרכזיים (Core business processes)

The full proposed-schedule lifecycle, run against a real Supabase project:
`tests/integration/core-flow.test.ts` —

1. Admin creates a position, an availability window, and a shift with one open slot.
2. Worker marks themselves available.
3. Admin generates the schedule — asserts the slot is filled by the available worker (real
   `runSchedulingHeuristic` call, real DB write).
4. Worker cannot yet see the assignment (publish-timing rule — see §4).
5. Admin publishes the shift.
6. Worker now sees both the assignment and a notification, read via the worker's *own* real
   session (not the service-role client) — proves RLS actually grants this, not just that the
   row exists.

## 4. בדיקות הרשאות (Authorization — different user roles)

Two layers, both tested (see CLAUDE.md's "assignments has no status column" bullet for why RLS,
not just the app guard, is the real boundary):

| What | Layer | File |
|---|---|---|
| `requireAdmin`/`requireWorker` redirect the wrong role, return the profile for the right one | App guard (mocked DB, fast) | `lib/__tests__/auth.test.ts` |
| A worker calling an admin-only Server Action is redirected (not just refused data) | App guard, real Supabase session | `tests/integration/authorization.test.ts` |
| An admin calling the same action succeeds end to end | App guard + RLS, real Supabase | same file |
| A worker cannot read another worker's `worker_qualifications` rows | RLS | same file |
| A worker cannot create or even read `shift_templates` (admin-only, zero worker visibility) | RLS | same file |
| A worker cannot see their own assignment before the shift is published, only after; admin sees it regardless | RLS (timing-based, not just role-based) | same file |

## 5. בדיקות למסד הנתונים (Database)

Covered by the same integration suite (§4's RLS cases *are* database tests — the policies live in
Postgres, not app code) plus:

- Real foreign-key/unique-constraint behavior is exercised implicitly by every integration test
  (e.g. `positions.name unique`, cascading deletes on ephemeral test users cleaning up
  `worker_qualifications`/`availability`/`assignments` automatically).
- DB-level triggers (option-required-iff-qualification-has-options, etc.) were verified
  behaviorally against real inserts during Phase 3 (see `TODO.md`) rather than re-tested here —
  they're stable, low-churn constraints that haven't changed since.

## 6. בדיקות למקרי קצה (Edge cases)

| Edge case | File |
|---|---|
| Hard `avoid` pairing unfills a slot rather than pairing two workers | `features/scheduling/__tests__/heuristic.test.ts` |
| Soft `prefer_avoid` only pairs when it's the only option, and gets flagged | same file |
| `min_rest_hours` only matters across different dates (same-date is structurally blocked by double-booking first — see `TODO.md` Phase 5) | same file |
| Per-category constraint override fully governs (including its own `enabled` flag) when it matches, regardless of the default row's state | same file |
| Qualification renewal date exactly equal to `obtainedAt` (boundary of the `>` comparison) | `features/worker-qualifications/__tests__/computeExpiresOn.test.ts` |
| Cross-field validation boundaries (end time *equal to* start time; `closesAt` *equal to* `opensAt`) | `features/shifts/__tests__/validation.test.ts`, `features/availability-windows/__tests__/validation.test.ts` |
| Worker sees zero rows (not an error) when RLS filters them out — the "no data" edge case for a *security* boundary, not just an empty state | `tests/integration/authorization.test.ts` |

## 7. בדיקות UI בסיסיות (Basic UI)

- `features/availability/__tests__/AvailabilityShiftRow.test.tsx` — conditional badge rendering,
  button variant reflecting state, and (per CLAUDE.md's RTL/bidi rule) that every date/time value
  renders inside a `dir="ltr"` element.
- Everything genuinely *visual* — actual RTL layout, the bidi reordering bug CLAUDE.md documents
  (`12:30` rendering as `30:12` under `dir="rtl"` without an explicit `dir="ltr"`), responsive
  breakpoints — cannot be caught by `jsdom` (it doesn't lay anything out or apply the Unicode bidi
  algorithm) and has no working local browser-automation path (see above). These are covered by
  the manual checklist below instead, which is where they've genuinely lived since Phase 3 anyway
  (see the many "verified in a real browser" notes throughout `TODO.md`).

## בדיקות ידניות מתועדות (Documented manual tests)

Per the assignment's own list of acceptable tools (§7). Re-check this list by hand after any
change touching the areas below — each item was already verified at least once during
development (see `TODO.md` for the original verification), so this is a *regression* checklist,
not a first-time exploration:

- [ ] Every date/time input and displayed value renders left-to-right and legibly under
      `dir="rtl"` (`/admin/shifts` create/edit, the shifts list, `/admin/availability-windows`,
      `/my-qualifications`' obtained/expiry dates, `/availability`).
- [ ] The app header, hamburger menu, and nav tiles render and open correctly on both a small
      (mobile, ~375px) and large (desktop, ~1440px) viewport.
- [ ] Admin CRUD pages (qualifications/positions/shifts/shift-templates/personnel) are usable at
      mobile width without horizontal overflow or clipped controls.
- [ ] A freshly-created worker account can actually log in with the password the admin set, and
      lands on the worker dashboard, not the admin one.
- [ ] The schedule review page's `prefer_avoid` conflict banner is visible both pre-publish and
      after publish (a live-computed flag, not a one-time snapshot — see `TODO.md` Phase 5).
- [ ] The RLS publish-timing rule holds in the actual UI, not just via direct queries: a worker's
      `/my-shifts` page shows nothing for an unpublished shift and the real assignment once
      published (the integration suite proves the RLS row-visibility half of this already —
      this manual pass is specifically about the page actually rendering it correctly).
- [ ] `/admin/shifts`'s calendar view (added 2026-08-29, see `TODO.md`): list/calendar and
      month/week toggles switch correctly; clicking a draft/assigned shift opens its edit form in
      the left card and clicking a published one opens the read-only view instead; save/cancel/
      delete-from-the-edit-form all correctly return to "add new shift"; the hover tooltip appears
      on both month chips and week cards and disappears on mouse-out. No automated test covers
      this (a real click-driven UI flow — see the Playwright limitation above), so this is a
      first-time verification item, not yet a confirmed regression check.

## כיצד להריץ (How to run)

```bash
npm test                 # unit + component tests — no external dependencies, always safe to run
npm run test:watch       # same, in watch mode
npm run test:integration # hits a real Supabase project — needs .env.local populated with
                          # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and
                          # SUPABASE_SERVICE_ROLE_KEY for a project with the migrations applied
                          # (same three vars the app itself needs — see .env.local.example)
```

`npm run build` and `npm test` are both expected to stay green at all times; `test:integration`
is opt-in since it requires real Supabase credentials and network access that won't exist in
every environment this repo is checked out into.
