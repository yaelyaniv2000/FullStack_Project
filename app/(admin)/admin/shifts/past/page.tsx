import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ShiftsList } from "@/features/shifts/components/ShiftsList";
import { listShifts } from "@/features/shifts/queries";

export default async function PastShiftsPage() {
  const shifts = await listShifts({ scope: "past" });

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/shifts"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="size-4" />
        חזרה לניהול משמרות
      </Link>
      <h1 className="text-2xl font-bold">משמרות ישנות</h1>

      <Card>
        <CardHeader>
          <CardTitle>משמרות שהתאריך שלהן עבר ({shifts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ShiftsList shifts={shifts} readOnly />
        </CardContent>
      </Card>
    </div>
  );
}
