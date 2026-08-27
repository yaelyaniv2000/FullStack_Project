"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { acknowledgeChangeRequest } from "../actions";
import type { AdminChangeRequest } from "../queries";

function Row({ request, windowId }: { request: AdminChangeRequest; windowId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex flex-col gap-1 rounded border p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>
          <span className="font-medium">{request.workerName}</span> ·{" "}
          <span dir="ltr">
            {request.date} {request.startTime.slice(0, 5)}
          </span>
        </span>
        {request.acknowledgedAt ? (
          <Badge variant="secondary">נצפתה</Badge>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => startTransition(() => void acknowledgeChangeRequest(request.id, windowId))}
          >
            סימון כנצפתה
          </Button>
        )}
      </div>
      {request.message ? <p className="text-muted-foreground">{request.message}</p> : null}
    </li>
  );
}

export function ChangeRequestsCard({
  windowId,
  requests,
}: {
  windowId: string;
  requests: AdminChangeRequest[];
}) {
  if (requests.length === 0) return null;
  const pendingCount = requests.filter((r) => !r.acknowledgedAt).length;

  return (
    <Card className={pendingCount > 0 ? "border-destructive" : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          בקשות שינוי זמינות
          {pendingCount > 0 ? <Badge variant="destructive">{pendingCount}</Badge> : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {requests.map((r) => (
            <Row key={r.id} request={r} windowId={windowId} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
