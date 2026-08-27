import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getAvailabilityWindowDetail } from "@/features/availability-windows/queries";
import { WindowShiftsReview } from "@/features/availability-windows/components/WindowShiftsReview";

export default async function AvailabilityWindowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getAvailabilityWindowDetail(id);
  if (!detail) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/availability-windows"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="size-4" />
        חזרה לחלונות זמינות
      </Link>
      <h1 className="text-2xl font-bold">{detail.label}</h1>

      <WindowShiftsReview shifts={detail.shifts} />
    </div>
  );
}
