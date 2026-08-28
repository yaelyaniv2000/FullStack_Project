# אבטחה בסיסית (Basic Security) — Squadron Personnel & Shift Scheduling App

> Course deliverable #8 (per `Internet Technologies.pdf` §9). Written against what's actually
> implemented and verified — see `supabase/migrations/20260822061054_add_rls_policies.sql` (the
> real, enforced boundary this whole doc is organized around) and CLAUDE.md's "assignments has no
> status column" bullet, which documents the one RLS rule that's genuinely timing-based rather
> than just role-based, and how it was behaviorally verified with real test accounts, not just
> "no error."

## איך מתבצע Authentication

Supabase Auth, email/password only — no magic links, no OAuth, no public self-signup
(`[auth].enable_signup = false` in `supabase/config.toml`, and public sign-ups are disabled at
the Supabase project level). Every account is admin-created: the admin either creates a worker
directly through `/admin/personnel` (`createWorkerAccount`, using the service-role Admin API —
see below) or, for the app's single admin account, via the one-off bootstrap script described in
the README, since there is deliberately no in-app UI path that can create an `admin`-role account
(see CLAUDE.md's auth bullet for why magic-link/OTP was considered and rejected: Supabase's
default email sending is rate-limited to a few/hour, a real risk during a live demo).

Sessions are httpOnly cookies managed by `@supabase/ssr` (`lib/supabase/server.ts`,
`lib/supabase/client.ts`) — never accessible to client-side JavaScript. `proxy.ts` (Next.js 16's
renamed `middleware.ts` — see `AGENTS.md`) calls `supabase.auth.getClaims()` on every request via
`lib/supabase/proxy.ts`'s `updateSession`, which is what actually refreshes an expiring session
token; this is intentionally scoped to session refresh only, not role gating (see below).
Passwords require a minimum of 8 characters, raised from Supabase's default of 6
(`minimum_password_length = 8`).

## איך מתבצע Authorization

Two independent layers, deliberately redundant — this is the app's central security decision and
is unit- and integration-tested (`docs/test-spec.md` §4):

1. **App-layer guard** — `requireAdmin()`/`requireWorker()` (`lib/auth.ts`) check the caller's
   `profiles.role` and `redirect()` away from any page or Server Action the wrong role reaches.
   This is what makes the *UI* behave correctly (an admin page never renders for a worker), but
   per Next.js's own security docs (`node_modules/next/dist/docs/01-app/02-guides/
   server-actions.md`: "Render-time gating... is not a security boundary, because requests can be
   sent without going through the UI"), it is not sufficient on its own — a Server Action is
   invocable by direct request. Hence layer 2.
2. **Row-Level Security (Postgres)** — the actual enforced boundary, underneath every table.
   `is_admin()` (a `security definer` SQL function, pinned `search_path` to avoid the classic
   search-path-injection pitfall on `security definer` functions) backs most write policies
   (`for all using (is_admin()) with check (is_admin())`), and every policy is scoped to
   `auth.uid()` for personal data. This is real Postgres enforcement, not app-level convention —
   it applies even if a request somehow bypassed the app-layer guard entirely.

The one rule worth calling out specifically: **`assignments` visibility is timing-based, not just
role-based.** A worker may only see their *own* assignment once its shift's `published_at` is
set — never before, even though it's unambiguously "their" row:

```sql
create policy assignments_select on assignments
  for select using (
    is_admin()
    or (worker_id = auth.uid() and exists (
      select 1 from shifts s where s.id = assignments.shift_id and s.published_at is not null
    ))
  );
```

This was verified behaviorally with real signed-in test sessions, not just by reading the SQL —
both originally in Phase 2 and again in this project's automated integration suite
(`tests/integration/authorization.test.ts`).

## אילו פעולות מותרות רק למשתמש מחובר (Login-only operations)

Effectively everything. `anon` (an unauthenticated request) has **zero** grants on any table:

```sql
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
-- anon gets nothing — every table requires being logged in.
```

Combined with "automatically expose new tables" being off at the Supabase project level (new
tables get zero API privileges by default, not the legacy auto-expose behavior), a table is
reachable through the API at all only once it has both an explicit `GRANT` *and* an RLS policy —
two deliberate steps, not one accidental default. The only pages reachable while logged out are
`/login` and the Next.js default error/not-found pages.

## איך אתם מונעים גישה למידע של משתמש אחר (Preventing cross-user data access)

RLS again — every "own data" table (`availability`, `worker_qualifications`, `notifications`,
`assignments`) scopes its select/insert/update policies to `worker_id = auth.uid()` (or
`is_admin()`), enforced in Postgres regardless of what the application code does or forgets to
do. Confirmed directly, not assumed: `tests/integration/authorization.test.ts` signs in as two
separate real ephemeral worker accounts and asserts one cannot read the other's
`worker_qualifications` rows (the query returns zero rows, not an error — RLS silently filters,
it doesn't reject).

Worker self-report is the one place a worker *writes* a row about themselves that an admin will
later act on, and the `with check` clause is what stops it being abused as a privilege-escalation
path:

```sql
create policy worker_qualifications_self_report on worker_qualifications
  for insert with check (
    worker_id = auth.uid() and source = 'self_reported' and status = 'pending'
  );
```

A worker cannot insert a row claiming `status = 'approved'` or `source = 'admin_granted'` for
themselves — the database rejects it, independent of whatever the self-report form's own client
code does or doesn't validate.

## איך אתם מבצעים ולידציה לקלטים (Input validation)

Two layers again, for the same reason as authorization — defense in depth, not redundant effort:

1. **App layer** — every Server Action that accepts form input validates it with a Zod schema
   before touching the database (`features/*/actions.ts`), including cross-field rules
   (`shiftSchema`'s end-after-start, `windowSchema`'s closes-after-opens). A failed parse returns
   a friendly Hebrew error and never reaches a query. Unit-tested directly for four representative
   schemas across the different validation shapes in the app — `docs/test-spec.md` §2.
2. **Database layer** — a few rules that matter for data integrity regardless of which code path
   writes the row are enforced by Postgres triggers, not just app code: `worker_qualifications`
   and `position_qualifications` both enforce "an `option_id` is required iff the qualification
   has options, and must belong to that qualification" via a trigger, verified directly against
   real inserts (bypassing the app entirely) before any UI was built on top, per `TODO.md` Phase
   3. Uniqueness rules (`positions.name`, `qualifications.name`, the partial-unique-index "at most
   one active qualification grant" rule) are enforced the same way — a `unique` constraint, not
   an app-level check-then-insert race.

## איך אתם מגנים על קריאות ל-API (Protecting API calls)

There is **no separate REST/GraphQL API surface** — no `app/api/*` route exists in this codebase.
Every mutation is a Next.js Server Action, which gets several protections for free, not
hand-rolled (confirmed by reading `node_modules/next/dist/docs/01-app/02-guides/
server-actions.md` directly, per this project's house rule of checking Next.js's actual installed
docs before relying on framework behavior from training data):

- **CSRF via an Origin check** — Next.js compares the request's `Origin` header against `Host`
  (or `X-Forwarded-Host`) and rejects a mismatch, with no app code needed to opt in.
- **Encrypted action IDs + dead-code elimination** — a Server Action isn't just "less discoverable
  than a REST endpoint," it's actively stripped from the client bundle if unused, and its
  reference is encrypted at build time.

On top of that, every Server Action itself starts with `requireAdmin()`/`requireWorker()` before
doing anything else, and every table it touches has RLS underneath regardless. Read access
(Server Components fetching data) goes through the same `createClient()`/RLS path — there's no
separate "read API" with weaker checks than the mutation path.

Supabase's own PostgREST layer, which the Supabase JS client talks to under the hood, adds a
platform-level safety net independent of anything in this app's code: `max_rows = 1000`
(`supabase/config.toml`) caps any single response regardless of query shape.

## איך אתם שומרים סודות כמו keys API (Secret management)

Three env vars, two very different trust levels:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — meant to be public (the
  `NEXT_PUBLIC_` prefix ships them to the browser on purpose). Access control is enforced by RLS,
  not by keeping this key secret — this is Supabase's documented model, not a shortcut taken here.
- `SUPABASE_SERVICE_ROLE_KEY` — bypasses RLS entirely, so this one *is* a real secret. Confirmed
  server-only by construction: it's read only in `lib/supabase/admin.ts` and
  `features/accounts/actions.ts` (both server-only modules — no `"use client"` file references
  it, and no `NEXT_PUBLIC_` prefix means Next.js would refuse to inline it into a client bundle
  even by mistake). Used for exactly one thing: `auth.admin.createUser` when an admin creates a
  worker account (and by the equivalent one-off bootstrap script for the first admin — see the
  README).

Locally, all three live in `.env.local`, which is git-ignored (`.gitignore`: `.env*` with an
explicit `!.env*.example` carve-out for the committed template) — never committed, confirmed by
the ignore rule rather than by manual discipline alone. In production, the same three vars are
set directly in Vercel's project settings, not committed anywhere in the repo or its history.

## אילו סיכוני אבטחה עדיין קיימים ומה הייתם משפרים בהמשך (Remaining risks & future improvements)

Honest gaps, not claimed as solved:

- **No rate limiting** on `/login` or the worker self-report action — a scripted brute-force
  attempt against a known email isn't currently throttled by this app's own code (Supabase Auth
  itself does apply some platform-level throttling, but nothing app-specific was added). Would
  add before any real (non-classroom) deployment.
- **No audit log** — admin actions (grant/revoke a qualification, publish a schedule) aren't
  recorded anywhere beyond the row's own `updated`/`reviewed_by` fields where those happen to
  exist. A dedicated append-only audit table would be the natural next step if this needed to
  support "who did what, when" accountability.
- **No MFA** — email/password only, appropriate for a small closed squadron roster with
  out-of-band credential handoff, but a real gap if account compromise risk grew (e.g. a much
  larger org, or self-service password reset being added later).
- **No CSP or other security headers configured** — Next.js's/Vercel's platform defaults apply,
  but nothing project-specific (a `Content-Security-Policy`, `Strict-Transport-Security`, etc.)
  was added in `next.config.ts`. Worth adding as a cheap hardening step even at this scale.
- **`getLatestRenewalDates` and other read queries have no explicit query-cost limit beyond
  Supabase's platform-wide `max_rows = 1000`** — not an access-control gap (RLS still applies),
  but a denial-of-service-shaped risk if this app's read patterns ever needed to scale much
  further (see `docs/scale.md`, which covers this same query from the performance angle).
- **The bootstrap admin script and `service_role` key both represent a "keys to the kingdom"
  single point of trust** — appropriate for a single-admin, single-organization tool (see
  CLAUDE.md's core architectural framing), but would need real key-rotation and least-privilege
  service accounts before this pattern could extend to a larger organization or team of admins.
