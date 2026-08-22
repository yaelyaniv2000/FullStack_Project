import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * The generated `profiles.role` type is a plain `string` (Postgres CHECK constraints don't
 * produce TS literal unions the way enum columns do) -- narrowed here since the DB guarantees
 * it's one of these two values.
 */
export type Profile = {
  id: string;
  full_name: string;
  role: "admin" | "worker";
  created_at: string;
};

/** Uses auth.getUser(), not getSession() -- revalidates against Supabase Auth, not just a locally-read JWT. */
export async function getCurrentUser(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (profile as Profile) ?? null;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await getCurrentUser();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/dashboard");
  return profile;
}