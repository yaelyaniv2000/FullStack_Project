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
        <div className="flex gap-4">
          <Link href="/dashboard" className="underline">
            דשבורד
          </Link>
          <Link href="/admin/qualifications" className="underline">
            כשירויות
          </Link>
          <Link href="/admin/personnel" className="underline">
            אנשי צוות
          </Link>
        </div>
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