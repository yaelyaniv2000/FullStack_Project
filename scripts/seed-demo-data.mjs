#!/usr/bin/env node
// Builds a realistic, synthetic demo dataset so the scheduling heuristic can be demonstrated
// live: 20 worker accounts with a real spread of qualifications, one availability window, ten
// shifts inside it (mixed positions/headcounts), and each worker marked available for a
// realistic partial subset of those shifts (not everyone for everything — some slots may end up
// genuinely unfilled, which is itself worth demonstrating: the "understaffed shift" flagging).
// After running this, an admin can open /admin/schedule/<the printed window id>, click
// "generate," and watch the heuristic actually fill the slots using real qualification/
// availability data.
//
// Per CLAUDE.md: synthetic/placeholder data only, never the squadron's real personnel. Safe to
// re-run — accounts/window/shifts are looked up by a fixed label/email before being created, so
// running it twice does not duplicate anything (though it may add a few more random availability
// rows on top of what's already there, harmless).
//
// Assumes supabase/seed.sql has already been applied to this Supabase project (qualifications
// "דרגה"/"מבצעיות"/"כשירות טיסה" and positions "טייס"/"נווט קרב"/"מכונאי" must already exist).
//
// Usage: npm run seed-demo

import path from "node:path";
import { createClient } from "@supabase/supabase-js";

try {
  process.loadEnvFile(path.resolve(process.cwd(), ".env.local"));
} catch {
  // Fall through — the missing-env-var check below fails loudly instead.
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — check .env.local.");
  process.exit(1);
}

const db = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

const DEMO_PASSWORD = "DemoPass123";
const WINDOW_LABEL = "מחזור הדגמה — מנוע השיבוץ";

// full name | דרגה option | מבצעיות option (or null) | כשירות טיסה freshness ("soon"/"fresh"/null)
const WORKERS = [
  ["איתן כהן", "סר״ן", null, "soon"],
  ["נועה לוי", "סר״ן", null, "soon"],
  ["עומר מזרחי", "סר״ן", null, "soon"],
  ["שירה אברהם", "סר״ן", null, "fresh"],
  ["דניאל פרץ", "סר״ן", null, "fresh"],
  ["יעל בן דוד", "סג״ן", "מבצעי", "soon"],
  ["תומר גולן", "סג״ן", "מבצעי", "fresh"],
  ["מיכל שני", "סג״ן", "מבצעי", "fresh"],
  ["רועי אזולאי", "סג״ן", "מבצעי", "fresh"],
  ["הדר קרן", "סג״ן", "מבצעי", "fresh"],
  ["אורי ששון", "סג״ן", null, null],
  ["ליאור נחום", "סג״ן", null, null],
  ["עדן ברק", "סג״ן", null, null],
  ["גיא אלוני", "סג״ן", null, null],
  ["טליה רוזן", "סג״ן", null, null],
  ["אסף חדד", "סג״ם", null, null],
  ["שני מלכה", "סג״ם", null, null],
  ["יובל שרון", "סג״ם", null, null],
  ["קרן אליהו", "סג״ם", null, null],
  ["נדב פלד", "סג״ם", null, null],
];

const SHIFT_DEFS = [
  { day: 2, start: "08:00", end: "16:00", name: "טיסת בוקר", positions: ["טייס:1", "נווט:2"] },
  { day: 2, start: "16:00", end: "22:00", name: "משמרת תחזוקה", positions: ["מכונאי:1"] },
  { day: 4, start: "06:00", end: "14:00", name: "טיסת שגרה", positions: ["טייס:1", "נווט:1", "מכונאי:1"] },
  { day: 4, start: "14:00", end: "22:00", name: "משמרת ערב", positions: ["נווט:1", "מכונאי:1"] },
  { day: 6, start: "08:00", end: "16:00", name: "משמרת יום", positions: ["נווט:2", "מכונאי:1"] },
  { day: 7, start: "08:00", end: "16:00", name: "טיסת אימונים", positions: ["טייס:1", "נווט:2", "מכונאי:1"] },
  { day: 9, start: "06:00", end: "14:00", name: "טיסת שגרה", positions: ["טייס:1", "נווט:1"] },
  { day: 9, start: "14:00", end: "20:00", name: "משמרת תחזוקה", positions: ["מכונאי:2"] },
  { day: 11, start: "08:00", end: "16:00", name: "משמרת יום", positions: ["נווט:1", "מכונאי:1"] },
  { day: 13, start: "14:00", end: "22:00", name: "טיסת ערב", positions: ["טייס:1", "נווט:2", "מכונאי:1"] },
];

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// worker_qualifications' real uniqueness rule is a PARTIAL unique index
// (worker_qualifications_active_unique, where status <> 'rejected') -- Postgres's ON CONFLICT
// can't target that via plain column names (same issue documented in
// features/scheduling/actions.ts for scheduling_constraints), so upsert({onConflict: ...}) here
// silently fails to match any constraint. Find-then-insert instead.
async function grantQualification(row) {
  const { data: existing, error: findError } = await db
    .from("worker_qualifications")
    .select("id")
    .eq("worker_id", row.worker_id)
    .eq("qualification_id", row.qualification_id)
    .neq("status", "rejected")
    .maybeSingle();
  if (findError) throw new Error(`Failed to check existing qualification: ${findError.message}`);
  if (existing) return;

  const { error: insertError } = await db.from("worker_qualifications").insert(row);
  if (insertError) throw new Error(`Failed to grant qualification: ${insertError.message}`);
}

async function getRequired(table, filters, label) {
  let query = db.from(table).select("*");
  for (const [col, val] of Object.entries(filters)) query = query.eq(col, val);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to read ${table}: ${error.message}`);
  if (!data || data.length === 0) {
    throw new Error(
      `${label} not found — run supabase/seed.sql against this project first (see README.md).`,
    );
  }
  return data[0];
}

async function main() {
  console.log("Looking up base qualifications/positions from supabase/seed.sql...");
  const qualDarga = await getRequired("qualifications", { name: "דרגה" }, "Qualification 'דרגה'");
  const qualMivtzaiut = await getRequired("qualifications", { name: "מבצעיות" }, "Qualification 'מבצעיות'");
  const qualTisa = await getRequired("qualifications", { name: "כשירות טיסה" }, "Qualification 'כשירות טיסה'");
  const optSaran = await getRequired("qualification_options", { qualification_id: qualDarga.id, label: "סר״ן" }, "Option 'סר״ן'");
  const optSagan = await getRequired("qualification_options", { qualification_id: qualDarga.id, label: "סג״ן" }, "Option 'סג״ן'");
  const optSagam = await getRequired("qualification_options", { qualification_id: qualDarga.id, label: "סג״ם" }, "Option 'סג״ם'");
  const optMivtzai = await getRequired("qualification_options", { qualification_id: qualMivtzaiut.id, label: "מבצעי" }, "Option 'מבצעי'");
  const posTayas = await getRequired("positions", { name: "טייס" }, "Position 'טייס'");
  const posNavat = await getRequired("positions", { name: "נווט קרב" }, "Position 'נווט קרב'");
  const posMechonai = await getRequired("positions", { name: "מכונאי" }, "Position 'מכונאי'");
  const positionById = { "טייס": posTayas.id, "נווט": posNavat.id, "מכונאי": posMechonai.id };
  const dargaOption = { "סר״ן": optSaran.id, "סג״ן": optSagan.id, "סג״ם": optSagam.id };

  console.log(`Creating/reusing ${WORKERS.length} demo worker accounts...`);
  const created = [];
  for (let i = 0; i < WORKERS.length; i++) {
    const [fullName, dargaLabel, mivtzaiutLabel, tisaFreshness] = WORKERS[i];
    const email = `demo-worker-${String(i + 1).padStart(2, "0")}@example.com`;

    let userId;
    const { data: createData, error: createError } = await db.auth.admin.createUser({
      email,
      password: DEMO_PASSWORD,
      email_confirm: true,
    });
    if (createError) {
      if (!/already been registered|already exists/i.test(createError.message)) {
        throw new Error(`Failed to create ${email}: ${createError.message}`);
      }
      const { data: list, error: listError } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (listError) throw new Error(`Failed to list users: ${listError.message}`);
      const existing = list.users.find((u) => u.email === email);
      if (!existing) throw new Error(`${email} reported as existing but not found in listUsers()`);
      userId = existing.id;
    } else {
      userId = createData.user.id;
    }

    const { error: profileError } = await db
      .from("profiles")
      .upsert({ id: userId, full_name: fullName, role: "worker" });
    if (profileError) throw new Error(`Failed to upsert profile for ${email}: ${profileError.message}`);

    await grantQualification({
      worker_id: userId,
      qualification_id: qualDarga.id,
      option_id: dargaOption[dargaLabel],
      source: "admin_granted",
      status: "approved",
      obtained_at: daysAgo(400),
    });

    if (mivtzaiutLabel) {
      await grantQualification({
        worker_id: userId,
        qualification_id: qualMivtzaiut.id,
        option_id: optMivtzai.id,
        source: "admin_granted",
        status: "approved",
        obtained_at: daysAgo(400),
      });
    }

    if (tisaFreshness) {
      await grantQualification({
        worker_id: userId,
        qualification_id: qualTisa.id,
        option_id: null,
        source: "admin_granted",
        status: "approved",
        obtained_at: tisaFreshness === "soon" ? daysAgo(172) : daysAgo(60),
      });
    }

    created.push({ id: userId, email, fullName, dargaLabel, mivtzaiutLabel: mivtzaiutLabel ?? "—" });
  }

  console.log("Creating/reusing the demo availability window...");
  let { data: window } = await db
    .from("availability_windows")
    .select("*")
    .eq("label", WINDOW_LABEL)
    .maybeSingle();
  if (!window) {
    const { data: inserted, error } = await db
      .from("availability_windows")
      .insert({
        label: WINDOW_LABEL,
        opens_at: new Date(Date.now() - 3 * 86400000).toISOString(),
        closes_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create availability window: ${error.message}`);
    window = inserted;
  }

  console.log(`Creating/reusing ${SHIFT_DEFS.length} demo shifts inside the window...`);
  const { data: existingShifts } = await db
    .from("shifts")
    .select("id")
    .eq("availability_window_id", window.id);

  let shiftIds;
  if (existingShifts && existingShifts.length > 0) {
    shiftIds = existingShifts.map((s) => s.id);
    console.log(`  window already has ${shiftIds.length} shifts, reusing them`);
  } else {
    shiftIds = [];
    for (const def of SHIFT_DEFS) {
      const { data: shift, error } = await db
        .from("shifts")
        .insert({
          date: daysFromNow(def.day),
          start_time: def.start,
          end_time: def.end,
          name: def.name,
          availability_window_id: window.id,
        })
        .select()
        .single();
      if (error) throw new Error(`Failed to create shift ${def.name}: ${error.message}`);
      const positionsRows = def.positions.map((spec) => {
        const [key, count] = spec.split(":");
        return { shift_id: shift.id, position_id: positionById[key], headcount_needed: Number(count) };
      });
      const { error: spError } = await db.from("shift_positions").insert(positionsRows);
      if (spError) throw new Error(`Failed to create positions for shift ${def.name}: ${spError.message}`);
      shiftIds.push(shift.id);
    }
  }

  console.log("Seeding partial, realistic availability (not everyone for everything)...");
  // Each worker gets their own "how often do they mark available" rate (50%-90%), then each
  // worker/shift combination is an independent coin flip at that rate — mirrors a real roster
  // where some people are reliably available and others are only sometimes free.
  const availabilityRows = [];
  for (const worker of created) {
    const rate = 0.5 + Math.random() * 0.4;
    for (const shiftId of shiftIds) {
      if (Math.random() < rate) {
        availabilityRows.push({ worker_id: worker.id, shift_id: shiftId, is_available: true });
      }
    }
  }
  const { error: availError } = await db
    .from("availability")
    .upsert(availabilityRows, { onConflict: "worker_id,shift_id", ignoreDuplicates: true });
  if (availError) throw new Error(`Failed to seed availability: ${availError.message}`);
  console.log(`  ${availabilityRows.length} availability rows written (out of ${created.length * shiftIds.length} possible)`);

  console.log("\nDone.");
  console.log(`Availability window id: ${window.id}`);
  console.log(`Review/generate screen: /admin/schedule/${window.id}`);
  console.log(`Demo worker password (all accounts): ${DEMO_PASSWORD}`);

  return created;
}

main()
  .then((created) => {
    const roster = created
      .map((w) => `| ${w.fullName} | ${w.email} | ${w.dargaLabel} | ${w.mivtzaiutLabel} |`)
      .join("\n");
    console.log("\n--- roster (also useful for submission/demo-accounts.md) ---\n");
    console.log("| שם | אימייל | דרגה | מבצעיות |\n|---|---|---|---|\n" + roster);
  })
  .catch((err) => {
    console.error("\nFailed:", err.message);
    process.exit(1);
  });
