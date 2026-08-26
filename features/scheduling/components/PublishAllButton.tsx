"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { publishAllShiftsInWindow } from "../actions";

export function PublishAllButton({ windowId }: { windowId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  function handleClick() {
    if (!window.confirm("פרסום כל המשמרות הלא-מפורסמות בחלון זה יחשוף את השיבוצים לעובדים וישלח להם התראה. להמשיך?")) {
      return;
    }
    setError(null);
    setSummary(null);
    startTransition(async () => {
      const result = await publishAllShiftsInWindow(windowId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSummary(
        result.data.publishedCount > 0
          ? `${result.data.publishedCount} משמרות פורסמו`
          : "אין משמרות לא-מפורסמות לפרסום",
      );
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="outline" onClick={handleClick} disabled={isPending}>
        {isPending ? "מפרסם..." : "פרסום כל המשמרות בחלון"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {summary ? <p className="text-sm text-muted-foreground">{summary}</p> : null}
    </div>
  );
}
