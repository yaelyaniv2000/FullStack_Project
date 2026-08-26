"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { publishShift, unpublishShift } from "../actions";

export function PublishShiftButton({
  windowId,
  shiftId,
  published,
}: {
  windowId: string;
  shiftId: string;
  published: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!published && !window.confirm("פרסום המשמרת יחשוף את השיבוץ לעובדים המשובצים ויישלח להם התראה. להמשיך?")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = published ? await unpublishShift(windowId, shiftId) : await publishShift(windowId, shiftId);
      if (!result.success) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" size="sm" variant={published ? "outline" : "default"} disabled={isPending} onClick={handleClick}>
        {published ? "ביטול פרסום" : "פרסום"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
