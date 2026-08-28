#!/usr/bin/env node
// One-off bootstrap script: creates the app's first admin account.
//
// There is deliberately no in-app UI path that creates an `admin`-role account — the only
// account-creation UI (`/admin/personnel`) always creates a `worker` (see
// features/accounts/actions.ts). This script does the equivalent two-step admin-API path
// (auth.admin.createUser + a `profiles` insert with role: "admin") directly, the way
// createWorkerAccount does for workers. See docs/security.md and README.md.
//
// Usage: node scripts/create-admin.mjs <email> <password> <full name>

import path from "node:path";
import { createClient } from "@supabase/supabase-js";

try {
  process.loadEnvFile(path.resolve(process.cwd(), ".env.local"));
} catch {
  // No .env.local — fall through and let the missing-env-var check below fail loudly instead.
}

const [email, password, ...nameParts] = process.argv.slice(2);
const fullName = nameParts.join(" ");

if (!email || !password || !fullName) {
  console.error("Usage: node scripts/create-admin.mjs <email> <password> <full name>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — check .env.local.",
  );
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

const { data, error: createError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (createError || !data.user) {
  console.error("Failed to create the auth user:", createError?.message);
  process.exit(1);
}

const { error: profileError } = await admin
  .from("profiles")
  .insert({ id: data.user.id, full_name: fullName, role: "admin" });
if (profileError) {
  console.error("Failed to create the profile row, rolling back the auth user:", profileError.message);
  await admin.auth.admin.deleteUser(data.user.id);
  process.exit(1);
}

console.log(`Admin account created: ${email}`);
