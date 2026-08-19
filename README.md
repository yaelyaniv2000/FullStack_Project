# Squadron Personnel & Shift Scheduling App

Final project for "Internet Technologies" (RUNI CS 2026). See `docs/product-spec.md`,
`docs/architecture.md`, and `docs/technical-plan.md` for the full product/technical plan, and
`CLAUDE.md` for a running log of key decisions.

**Live app**: https://full-stack-project-neon-pi.vercel.app
**Repo**: https://github.com/yaelyaniv2000/FullStack_Project

## Stack

Next.js (App Router) + TypeScript + Tailwind v4 + shadcn/ui (Hebrew/RTL), Supabase
(Database + Auth), deployed on Vercel.

## Running locally

```bash
npm install
cp .env.local.example .env.local   # then fill in real values, see below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

See `.env.local.example` for the current list. As of now:

- `NEXT_PUBLIC_SUPABASE_URL` — the Supabase project URL (Project Settings → API).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the Supabase anon/public key (same page). Safe to expose
  client-side; access control is enforced by Row-Level Security, not by keeping this secret.

More variables will be added here as they're introduced (e.g. a server-only service role key,
needed later for the admin worker-invite flow — see `docs/architecture.md`).

> Note: this is a work-in-progress student project — full local run instructions and a complete
> env var explanation are a required submission deliverable and will be finalized once the app's
> core features are built (see `TODO.md`).