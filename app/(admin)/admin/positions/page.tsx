import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PositionForm } from "@/features/positions/components/PositionForm";
import { PositionsList } from "@/features/positions/components/PositionsList";
import { listPositions } from "@/features/positions/queries";
import { listQualifications } from "@/features/qualifications/queries";

export default async function PositionsPage() {
  const [positions, qualifications] = await Promise.all([
    listPositions(),
    listQualifications(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">ניהול תפקידים</h1>

      <div className="flex flex-col gap-6 md:flex-row">
        <Card className="md:w-1/2">
          <CardHeader>
            <CardTitle>הוספת תפקיד חדש</CardTitle>
          </CardHeader>
          <CardContent>
            <PositionForm allQualifications={qualifications} />
          </CardContent>
        </Card>

        <Card className="md:w-1/2">
          <CardHeader>
            <CardTitle>תפקידים קיימים ({positions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <PositionsList positions={positions} allQualifications={qualifications} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}