import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logout } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-3xl p-6">
      <nav className="mb-6 flex items-center justify-between border-b pb-4">
        <Link href="/dashboard" className="underline">
          חזרה לדשבורד
        </Link>
        <form action={logout}>
          <Button type="submit" variant="outline" size="sm">
            התנתקות
          </Button>
        </form>
      </nav>
      {children}
    </div>
  );
}