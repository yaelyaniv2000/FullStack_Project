import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { listSchedulingConstraints, listWorkerPairingPreferences } from "@/features/scheduling/queries";
import { listQualifications } from "@/features/qualifications/queries";
import { listWorkers } from "@/features/accounts/queries";
import { getAppSettings } from "@/features/settings/queries";
import { SchedulingConstraintsSection } from "@/features/scheduling/components/SchedulingConstraintsSection";
import { WorkerPairingPreferencesSection } from "@/features/scheduling/components/WorkerPairingPreferencesSection";
import { ExpiringSoonDaysForm } from "@/features/settings/components/ExpiringSoonDaysForm";

export default async function SettingsPage() {
  const [constraints, pairings, qualifications, workers, appSettings] = await Promise.all([
    listSchedulingConstraints(),
    listWorkerPairingPreferences(),
    listQualifications(),
    listWorkers(),
    getAppSettings(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">הגדרות</h1>

      <SchedulingConstraintsSection constraints={constraints} allQualifications={qualifications} />
      <WorkerPairingPreferencesSection pairings={pairings} allWorkers={workers} />

      <Card>
        <CardHeader>
          <CardTitle>הגדרות כלליות</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpiringSoonDaysForm
            key={appSettings.expiringSoonDays}
            expiringSoonDays={appSettings.expiringSoonDays}
          />
        </CardContent>
      </Card>
    </div>
  );
}
