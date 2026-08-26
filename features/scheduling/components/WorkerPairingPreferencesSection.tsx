import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { WorkerPairingPreferencesForm } from "./WorkerPairingPreferencesForm";
import { WorkerPairingPreferencesList } from "./WorkerPairingPreferencesList";
import type { WorkerPairing } from "../queries";
import type { Profile } from "@/lib/auth";

export function WorkerPairingPreferencesSection({
  pairings,
  allWorkers,
}: {
  pairings: WorkerPairing[];
  allWorkers: Profile[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>העדפות שיבוץ בין עובדים</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <WorkerPairingPreferencesForm allWorkers={allWorkers} />
        <WorkerPairingPreferencesList pairings={pairings} />
      </CardContent>
    </Card>
  );
}
