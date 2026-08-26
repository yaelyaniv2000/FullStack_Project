"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { generateSchedule } from "../actions";

export function GenerateScheduleButton({ windowId }: { windowId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  function handleClick() {
    // generateSchedule always clears and replaces everything for this window's unpublished
    // shifts (including manual edits) rather than merging -- see TODO.md/actions.ts. A native
    // confirm is a cheap, honest warning for something that destructive.
    if (!window.confirm("יצירת שיבוץ מוצע תמחק ותחליף את כל השיבוצים הקיימים למשמרות שלא פורסמו בחלון זה. להמשיך?")) {
      return;
    }
    setError(null);
    setSummary(null);
    startTransition(async () => {
      const result = await generateSchedule(windowId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      const { proposedCount, unfilledSlots, softAvoidConflicts } = result.data;
      const parts = [`${proposedCount} שיבוצים הוצעו`];
      if (unfilledSlots.length > 0) parts.push(`${unfilledSlots.length} משבצות לא אוישו`);
      if (softAvoidConflicts.length > 0) parts.push(`${softAvoidConflicts.length} התנגשויות העדפה`);
      setSummary(parts.join(" · "));
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" onClick={handleClick} disabled={isPending}>
        {isPending ? "מייצר שיבוץ..." : "יצירת שיבוץ מוצע"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {summary ? <p className="text-sm text-muted-foreground">{summary}</p> : null}
    </div>
  );
}
