# סקייל בסיסי (Basic Scale) — Squadron Personnel & Shift Scheduling App

> Course deliverable #7 (per `Internet Technologies.pdf` §8). Written against what's actually
> built (see `docs/technical-plan.md`'s "Indexes" note, which promised the full reasoning here),
> not aspirational — this is a single-organization tool for one squadron
> (`CLAUDE.md`'s "single organization, not multi-tenant" decision), so the honest framing
> throughout is "what does dozens–hundreds of rows need," not "what does internet scale need."

## מה יקרה אם יהיו עשרות או מאות משתמשים (Tens or hundreds of users)

The product's actual ceiling is a squadron's personnel roster — realistically tens to a couple
hundred workers, single-digit admins, and a few dozen shifts open at once per availability
window. At that size:

- Every list this app renders (`personnel`, `positions`, `qualifications`, shifts, a schedule
  review page) is at most a few hundred rows. Postgres returns that in low single-digit
  milliseconds even with no query tuning at all.
- The scheduling heuristic (`features/scheduling/heuristic.ts`) is `O(slots × workers)` per
  window, run synchronously inside one Server Action (`generateSchedule`). For a window with,
  say, 30 shifts × 3 positions each and 100 workers, that's ~9,000 eligibility checks — still a
  sub-second in-memory computation, not something that needs a queue or background job at this
  scale (see CLAUDE.md's "heuristic, not a true optimizer" decision for the same reasoning applied
  to algorithm choice, not just infra).
- Supabase's connection pooler (`[db.pooler]` in `supabase/config.toml`, enabled by default on
  hosted projects) already handles the concurrent-connections problem a serverless deployment
  would otherwise hit (Vercel functions opening a fresh DB connection per invocation) — nothing
  extra was configured because the platform default already covers it at this scale.

**Where it would actually start to hurt**: not from raw user count, but from admin actions that
touch many rows synchronously in one request — `generateSchedule`'s delete-then-reinsert of a
whole window's assignments, or `publishAllShiftsInWindow`'s per-shift notification writes. These
scale with *shifts per window*, not total users, and stay small because an availability window is
inherently bounded (one scheduling period, not the whole roster's entire history).

## אילו שאילתות למסד הנתונים עלולות להיות כבדות (Which queries could get heavy)

- **`getLatestRenewalDates`** (`features/worker-qualifications/queries.ts`) — joins
  `position_renews_qualifications` against `assignments` and `shifts`, and when called without a
  `workerId` (from `listExpiringQualifications`, used by the admin dashboard) scans *all*
  assignments to find the latest renewing shift per `(worker, qualification)` pair. This is the
  single query most likely to grow linearly with the squadron's total shift history, since
  nothing archives or windows it out.
- **`generateSchedule`'s `buildHeuristicInputForWindow`** — fetches every shift/position/worker/
  qualification/availability/constraint/pairing row relevant to one window in a handful of
  queries, then does the matching in application memory rather than in SQL. Fine at today's
  scale; would need to become more selective (or move matching into SQL) if a single window ever
  held hundreds of shifts.
- **Dashboard widgets** (`features/dashboard/`) — four independent queries
  (`listUnderstaffedShifts`, `listUpcomingShifts`, `listPendingApprovals`,
  `listExpiringQualifications`) run in parallel on every dashboard load. Each is independently
  small, but there's no caching between them or across repeated visits — every load re-runs all
  four.

## האם צריך אינדקסים במסד הנתונים (Indexes)

Yes, and they're already in place, added explicitly since Postgres does not auto-index foreign
keys (only primary/unique keys get an index automatically):

| Index | Serves |
|---|---|
| `shifts(date)` | Every "upcoming"/"past" shift list (`listShifts` with `scope`), the dashboard's upcoming-shifts widget |
| `assignments(worker_id)` | `listMyUpcomingShifts`, `getLatestRenewalDates`, anywhere "this worker's shifts" is queried |
| `worker_qualifications(worker_id)` | `listWorkerQualifications`, the worker's own qualifications page, the admin's per-worker detail page |
| `notifications(worker_id, read_at)` | The worker's notification list + unread-count badge — a composite index because that query always filters by both together |
| Several `unique` indexes (`worker_qualifications_active_unique`, `scheduling_constraints_default_unique`/`_override_unique`, `app_settings_singleton`, etc.) | Not scale-motivated — these enforce business rules (e.g. "at most one active qualification grant," "at most one default constraint row per type") at the DB layer, a side benefit of unique indexes rather than the reason they exist |

No index was added speculatively — each one traces to a real query pattern already in the code,
per the project's general "additive, justified by actual use" convention (CLAUDE.md).

## איך נמנעים מטעינה מיותרת של מידע (Avoiding unnecessary data loading)

- Every query selects named columns (`select("id, name, ...")`), not `select("*")` — the few
  remaining `select("*")` calls are on single-row inserts immediately followed by `.select()` to
  get back the created row's generated fields (`id`, timestamps), not list queries.
- PostgREST embeds (e.g. `shifts → shift_positions → positions`) replace what would otherwise be
  N+1 round trips with one request — explicit FK-hint syntax (`!shift_positions_shift_id_fkey`)
  is used wherever a table has more than one plausible join path to the same target, a real
  ambiguity hit and fixed several times during Phase 3 (see `TODO.md`).
- Supabase's own `max_rows = 1000` (`supabase/config.toml`) is a hard ceiling on any single
  PostgREST response regardless of app code — a defense-in-depth cap against an accidentally
  unbounded query, not something the app relies on hitting in practice (every real list here is
  far under it).

## האם יש שימוש נכון ב-pagination (Pagination)

**No list in this app paginates today — a known, deliberate limitation, not an oversight.** Every
list (personnel, shifts, qualifications, positions, notifications, schedule review) fetches its
full result set and renders it with a client-side search filter on top (the Batch-A UX pass — see
`TODO.md`) rather than a server-paginated query. This is a direct consequence of the actual data
volumes described above: a few hundred rows rendered at once costs nothing meaningful in either
query time or payload size, and adding pagination now would be complexity with no real payoff
before the deadline (see CLAUDE.md's "quality of thinking over feature count" framing). **What
would change this**: if the worker roster or shift history grew an order of magnitude beyond a
single squadron (the notifications list and the shifts-history page are the two most likely to
accumulate unboundedly over real time, since neither one is naturally capped the way an
availability window is), those would be the first two candidates for real (`range()`-based,
Supabase supports it natively) pagination.

## האם יש הפרדה נכונה בין צד לקוח וצד שרת (Client/server separation)

Per CLAUDE.md's "no global client-state library" decision: Server Components fetch and render
data directly (no client-side data-fetching library, no duplicate client-side cache to keep in
sync with the server); mutations go through Server Actions, which call `revalidatePath` to tell
Next.js which server-rendered pages to refresh — the server stays the single source of truth.
Client Components (`"use client"`) are used only where genuine interactivity requires it (forms,
the optimistic availability toggle, dropdowns/comboboxes) — data fetching itself never happens
client-side. This keeps the amount of code (and thus the amount of data) shipped to the browser
proportional to *interactivity*, not to *data volume* — a list page's Client Component is the row
markup and event handlers, not the rows themselves re-fetched in the browser.

## אילו מגבלות קיימות במוצר הנוכחי (Current limitations)

- No pagination (see above).
- No caching layer between the app and Postgres (no Redis, no in-memory query cache) — every
  request is a live query. Fine at this scale; would be the first thing to add before pagination
  if read load ever became the bottleneck instead of data volume.
- `generateSchedule` runs synchronously inside one HTTP request/Server Action — there's no queue
  or background worker. Acceptable because a single window's slot count is small (see above); a
  genuinely large scheduling problem (thousands of slots) would need to move off the request
  thread.
- `getLatestRenewalDates` (see above) has no time-bound on how far back it looks — it will keep
  scanning the *entire* assignment history as that history grows, unlike every other query in the
  app, which is naturally scoped to "current" or "upcoming" data.
- Vercel's serverless functions and Supabase's managed Postgres are both already horizontally
  scalable platform primitives — nothing in this app's own code currently prevents scaling
  further if load ever grew, other than the specific query above.

## מה הייתם משפרים בגרסה עתידית כדי לתמוך בסקייל גדול יותר (Future improvements for larger scale)

1. **Time-bound or paginate `getLatestRenewalDates`** — the one query without a natural ceiling;
   scoping it to, say, the last N months of shifts would keep it flat regardless of how long the
   squadron has used the app.
2. **Server-side pagination** (`range()`) for notifications and shift history first, once either
   realistically exceeds a few hundred rows for one user/one page.
3. **Cache the dashboard's four widget queries** (e.g. a short-TTL in-memory or Next.js `fetch`
   cache) if the dashboard becomes the most-visited page and its repeated four-query load becomes
   measurable.
4. **Move `generateSchedule` off the request thread** (a queued job, polled or pushed status) only
   if a real deployment's window sizes grow far past what a synchronous call comfortably handles —
   not before, since that's real added complexity (a job runner, a status-polling UI) for a
   problem this project doesn't actually have yet.
