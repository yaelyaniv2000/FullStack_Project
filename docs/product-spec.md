# מסמך אפיון מוצר (Draft) — Personnel & Shift Scheduling App

> Status: DRAFT — refined after a meeting with a potential user (squadron point of contact).
> Sections marked **[TBD]** should be updated with real answers as they come in — the app is
> designed so this information can be added later via the admin UI, not hardcoded, so these do
> **not** need to be resolved before starting to build.

## שם עבודה (working name)
**המשבצת** — chosen 2026-08-22 (a fitting pun: a schedule is literally a grid of slots). Used as
the app's title in the UI (`components/shared/AppHeader.tsx`).

## מה הבעיה שהמוצר פותר
A single organization (a squadron) needs to staff shifts/duties with personnel who hold the
right qualifications, based on their availability — today done manually. The system should let
an admin define, as **data, not code**:
- what position types exist
- what qualifications exist, and how often each needs to be renewed
- which qualifications a given position requires
- which position, when fulfilled, renews a specific qualification (e.g., completing a duty in a
  medic position renews a first-aid qualification)

Because this is all admin-configurable rather than hardcoded, the exact list of positions and
qualifications does **not** need to be known up front — the app can be built and demoed with
placeholder examples, and the real list can be entered at any time (including after the app is
built) without touching code.

**[TBD]** What specifically takes the longest today, and what mistakes happen most often?

## מי המשתמשים של המוצר
Single organization — no multi-tenant account layer, no cross-organization isolation to build.
(The data model still keeps positions/qualifications configurable rather than hardcoded, so the
design isn't tied to this org's specifics even though only one org uses it in practice.)

- **Admin** — defines position types, defines qualifications (incl. renewal interval), defines
  which qualifications each position requires, defines which position renews which qualification,
  manages personnel qualifications, creates shifts, opens availability requests, generates/
  reviews/publishes schedules.
- **Worker (personnel)** — views their own qualifications and expiry status, submits
  availability, views published shifts.

**Decided and built**: workers can self-report a qualification, but it stays `pending` until an
admin approves it — only approved qualifications count toward schedule matching (see the "Open
questions" checklist below and `/my-qualifications`'s self-report flow).

## מי הלקוח
The squadron — a single organization. The contact met during the user interview is the primary
source for validating real requirements going forward.

**[TBD]** Confirm the specific position types and qualifications relevant to them (can be added
incrementally, not needed to start building — see note above).

## מה המטרות העסקיות של המוצר
- Reduce time spent building a schedule.
- Reduce scheduling errors (unqualified personnel assigned, understaffed shift).
- Track qualification validity over time, reducing the risk of assigning someone whose
  qualification has expired.
- Give personnel visibility into their own upcoming shifts and qualification status.

## אילו יכולות תוכנה צריך לבנות
- Authentication + role-based authorization (Admin vs Worker) — single organization, no tenant
  isolation layer.
- **Position management**: admin defines position types (data-driven, not hardcoded).
- **Qualification management**: admin defines qualifications, each with an optional renewal
  interval (some qualifications never expire).
- **Position → required qualifications** mapping: which qualifications a position requires.
- **Position → renews qualification** mapping: a position can be marked as "fulfilling this
  position renews qualification X" — this is tied to the **position**, not the shift, since the
  same qualification-renewing position can appear across different shifts.
- Worker ↔ qualification tracking: which qualifications each worker holds, when obtained, and
  computed expiry date. Workers can self-report a qualification, but it stays **pending** until
  an admin approves it — only approved qualifications count toward schedule matching.
- Worker-facing qualification status view: upcoming/already-expired qualifications.
- **Admin dashboard**: a central home view for the admin surfacing what needs attention —
  understaffed shifts flagged as priority, pending qualification approvals, upcoming shifts, and
  qualifications about to expire across personnel. This is the admin's default landing page.
- **Understaffed shift flagging**: if a shift can't be fully staffed by the scheduling engine, it
  is flagged as a priority item on the admin dashboard rather than silently left incomplete.
- Shift management: shifts specify needed positions + headcount per position.
- **Shift templates**: admin can save a named, reusable bundle of position requirements (which
  positions + how many of each) and pick from that bank when creating a new shift, instead of
  building the requirements from scratch each time. Picking a template **copies** its values into
  the new shift (no live link) — editing or deleting a template later never changes shifts
  already created from it. The admin can adjust the pre-filled values before saving.
- Availability collection (admin opens a window; workers submit availability).
- Schedule generation engine (heuristic matching by qualification validity + availability +
  constraints — not a full optimizer).
- **Scheduling constraint settings**: admin can enable/tune a small set of scheduling
  constraints (e.g. minimum rest between shifts, max shifts per worker per round) without a code
  change — the set of possible constraint *types* is fixed in code, but their values and
  on/off state are admin-configurable data.
- **Automatic qualification renewal**: once a shift's date has passed, for every worker who was
  assigned to a position marked as "renews qualification X," that worker's qualification expiry
  is extended automatically.
- Admin review/edit/publish schedule.
- Worker notification of published shifts.

## מהם התהליכים המרכזיים (core user flows)
1. Sign up/login — invite-based (admin creates or invites accounts); not public self-serve
   signup, since this is one closed organization.
2. Admin defines qualifications (name + optional renewal interval).
3. Admin defines position types, which qualifications each requires, and (optionally) which
   qualification that position renews when fulfilled.
4. Admin manages workers' qualifications (grant/revoke, with obtained date); workers can also
   self-report a qualification, which sits pending until the admin approves it.
5. Admin creates shifts specifying needed positions & headcount per position — optionally
   starting from a saved shift template and adjusting it, instead of building from scratch.
6. Admin opens an availability window; workers submit availability — while doing so they can see
   their own qualifications' expiry status.
7. Admin triggers schedule generation; engine proposes assignments by qualification validity +
   availability + constraints.
8. Admin reviews/edits the proposed schedule, resolves unfilled shifts.
9. Admin publishes; workers are notified of their shifts.
10. Once a shift's date passes, any assigned worker in a qualification-renewing position has that
    qualification's expiry automatically extended.

> **Out of scope for v1 (explicitly deferred, not forgotten):** when a shift can't be fully
> staffed, v1 only flags it as a priority item on the admin dashboard — today the admin resolves
> this by making phone calls. A future version could notify all personnel qualified for the
> empty position so they can volunteer, but that's a real feature (targeted notifications,
> volunteer sign-up) and not needed to demonstrate the core product.

> **Simplifying assumption (document as a known limitation):** a shift is treated as "completed"
> once its end time has passed and a worker was assigned to it — there's no separate manual
> attendance/check-in step in v1. A future version could let the admin mark actual attendance
> before triggering renewal.

> **Data sensitivity note:** since this models a real squadron's personnel, use synthetic/
> placeholder names, ranks, and qualifications for development, testing, and the class demo —
> not real personnel data — since the app is hosted on third-party infrastructure (Supabase/
> Vercel) that isn't an approved system for real operational rosters.

---

## Open questions (non-blocking — can be filled in anytime via the admin UI)

- [x] ~~Single org vs. multi-tenant~~ → **decided: single organization**, fully configurable
      position/qualification model, no multi-business account layer.
- [x] ~~Is a qualification renewal tied to a shift or a position?~~ → **decided: tied to the
      position** a worker fulfills, not the shift itself.
- [X] Can workers self-report qualifications, or must the admin grant/confirm them? **decided - the workers can self report qualifications but the admin needs to approve them before they are taken into account. 
- [ ] The actual position types, qualifications, and renewal intervals in their domain (use
      placeholders until known).
- [x] ~~What "additional conditions" matter in practice~~ → **decided: admin-configurable via a
      settings page** (`scheduling_constraints`), not hardcoded and not a general rules engine.
      Starts with two generic constraint types (minimum rest between shifts, max shifts per
      worker per scheduling round); squadron-specific ones (e.g. seniority) get added as new
      types once known — see `docs/technical-plan.md`.
- [ ] How far in advance is availability collected, and how often does the cycle repeat?
- [x] ~~Preferred notification channel~~ → **decided and built: in-app only** (`notifications`
      table + `/notifications`), no email/SMS in v1 — see `CLAUDE.md`'s auth/notifications
      reasoning. An external channel is listed as an optional stretch goal in `TODO.md`, not core
      scope.
- [ ] Typical scale: number of personnel, shifts/week.
- [X] What happens today when a shift can't be fully staffed? **decided: This can't happen, in this case they usually start making phone calls to see who can fill the gap. The app should flag this as a priority problem for the admin to see. In the future we can add a feature that the app sends a notification to all relevant personell (according to the requirements) to tell them that the shift is empty so they can maybe volunteer (in person) but this isnt for now. 
- [X] Who has final approval authority on a published schedule? **decided: the admin reviews the suggested schedule and can approve it and publish it.
- [x] ~~How far ahead should a worker be warned that a qualification is about to expire~~ →
      **decided and built: admin-configurable**, not a hardcoded number — `expiring_soon_days` on
      `/admin/settings` (`app_settings` table), defaulting to 30. Surfaced on both the admin
      dashboard and the worker's own qualifications page.
