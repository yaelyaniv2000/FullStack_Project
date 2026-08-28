# Squadron Personnel & Shift Scheduling App

Final project for "Internet Technologies" (RUNI CS 2026). See `docs/product-spec.md`,
`docs/architecture.md`, `docs/technical-plan.md`, `docs/test-spec.md`, `docs/scale.md`, and
`docs/security.md` for the full product/technical writeups, and `CLAUDE.md` for a running log of
key decisions.

**Live app**: https://full-stack-project-neon-pi.vercel.app
**Repo**: https://github.com/yaelyaniv2000/FullStack_Project

## Stack

Next.js (App Router) + TypeScript + Tailwind v4 + shadcn/ui (Hebrew/RTL), Supabase
(Database + Auth), deployed on Vercel.

## Running locally

This needs a Supabase project of your own — the app talks to Supabase directly (Database + Auth),
there's no bundled local database.

### 1. Create a Supabase project

Create one at [supabase.com](https://supabase.com) (the free tier is enough). From
**Project Settings → API**, note down the **Project URL**, the **anon/publishable key**, and the
**service_role/secret key** — you'll need all three in step 4.

### 2. Apply the database schema

With the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)
installed (`brew install supabase/tap/supabase`, or see the link for other platforms):

```bash
supabase login
supabase link --project-ref <your-project-ref>   # the ref is in your project's URL/settings
supabase db push                                  # applies every migration in supabase/migrations
```

If you'd rather not install the CLI, every file under `supabase/migrations/` is a plain `.sql`
file — open each one (in filename order, they're timestamp-prefixed) and run it in the Supabase
Dashboard's **SQL Editor** instead.

### 3. Seed placeholder data (optional but recommended)

`supabase/seed.sql` has placeholder qualifications/positions/a shift template to make the app
useful to click through immediately, instead of starting from a completely empty admin console.
Run its contents in the SQL Editor (or `psql "$(supabase db url --linked)" -f supabase/seed.sql`
if you have `psql`). It does **not** create any accounts — see step 5 for that.

### 4. Configure auth settings

In the Dashboard under **Authentication → Sign In / Providers**:
- Turn **off** email sign-ups (this app is invite-only — every account is admin-created, see
  `docs/security.md`).
- Set the minimum password length to **8** (Authentication → Policies, or the sign-in provider
  settings, depending on your Supabase CLI version).

### 5. Set up environment variables

```bash
cp .env.local.example .env.local
```

Fill in the three values from step 1 — see "Environment variables" below for what each one is.

### 6. Create the first admin account

There's no in-app UI that can create an `admin`-role account (only `/admin/personnel`, which
always creates a `worker` — see `docs/security.md`). A one-off script does the equivalent:

```bash
npm install
npm run create-admin -- you@example.com "a-strong-password" "Your Name"
```

### 7. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), log in with the admin account from step 6,
and create worker accounts from `/admin/personnel`.

## Running the tests

```bash
npm test                 # unit + component tests — no external dependencies
npm run test:integration # hits your real Supabase project (needs .env.local from step 5) —
                          # creates and deletes its own ephemeral test accounts/data
```

See `docs/test-spec.md` for what each layer covers and why.

## Environment variables

See `.env.local.example` for the current list:

- `NEXT_PUBLIC_SUPABASE_URL` — the Supabase project URL (Project Settings → API).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the Supabase anon/public key, i.e. Supabase's newer
  "Publishable key" (same page). Safe to expose client-side; access control is enforced by
  Row-Level Security, not by keeping this secret.
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase's "Secret key" (same page). **Server-only, never
  exposed to the browser.** Used for admin operations that must bypass RLS: creating worker
  accounts (`auth.admin.createUser`) and the `create-admin` bootstrap script.

The same three variables are set in Vercel's project settings for the deployed app — nothing else
is required for a production deploy beyond what's needed to run locally.
