import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { QualificationForm } from "@/features/qualifications/components/QualificationForm";
import { QualificationsList } from "@/features/qualifications/components/QualificationsList";
import { listQualifications } from "@/features/qualifications/queries";

export default async function QualificationsPage() {
  const qualifications = await listQualifications();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">ניהול כשירויות</h1>

      <div className="flex flex-col gap-6 md:flex-row">
        <Card className="md:w-1/2">
          <CardHeader>
            <CardTitle>הוספת כשירות חדשה</CardTitle>
          </CardHeader>
          <CardContent>
            <QualificationForm />
          </CardContent>
        </Card>

        <Card className="md:w-1/2">
          <CardHeader>
            <CardTitle>כשירויות קיימות ({qualifications.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <QualificationsList qualifications={qualifications} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}