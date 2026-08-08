import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session on every request. This is intentionally
 * scoped to session refresh only — per-role access control (admin vs worker)
 * lives in each route group's layout guard, not here, per docs/architecture.md.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not add code between createServerClient and getClaims() — this call
  // is what actually triggers the token refresh; removing it silently
  // breaks session refresh and can log users out at random.
  await supabase.auth.getClaims();

  // IMPORTANT: return supabaseResponse as-is (or copy its cookies onto any
  // replacement response) — constructing a fresh response without doing so
  // desyncs the browser and server sessions.
  return supabaseResponse;
}