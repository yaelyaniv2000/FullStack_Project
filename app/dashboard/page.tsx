import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const profile = await getCurrentUser();
  if (!profile) redirect("/login");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">
        שלום, {profile.full_name} ({profile.role === "admin" ? "מנהל" : "עובד"})
      </h1>

      {profile.role === "admin" ? (
        <Link href="/admin/personnel" className="underline">
          ניהול אנשי צוות
        </Link>
      ) : (
        <p className="text-muted-foreground">
          כאן יופיעו בעתיד המשמרות הקרובות שלך וסטטוס הכשירויות שלך.
        </p>
      )}

      <form action={logout}>
        <Button type="submit" variant="outline">
          התנתקות
        </Button>
      </form>
    </div>
  );
}