import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ShiftTemplateForm } from "@/features/shift-templates/components/ShiftTemplateForm";
import { ShiftTemplatesList } from "@/features/shift-templates/components/ShiftTemplatesList";
import { listShiftTemplates } from "@/features/shift-templates/queries";
import { listPositions } from "@/features/positions/queries";

export default async function ShiftTemplatesPage() {
  const [templates, positions] = await Promise.all([listShiftTemplates(), listPositions()]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">ניהול תבניות משמרת</h1>

      <Card>
        <CardHeader>
          <CardTitle>הוספת תבנית חדשה</CardTitle>
        </CardHeader>
        <CardContent>
          <ShiftTemplateForm allPositions={positions} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>תבניות קיימות ({templates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ShiftTemplatesList templates={templates} allPositions={positions} />
        </CardContent>
      </Card>
    </div>
  );
}
