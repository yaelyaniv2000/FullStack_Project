"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { markAllNotificationsRead, markNotificationRead } from "../actions";
import type { Notification } from "../queries";

function timeLabel(iso: string) {
  return iso.slice(0, 16).replace("T", " ");
}

export function NotificationsList({ notifications }: { notifications: Notification[] }) {
  const [isPending, startTransition] = useTransition();
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  if (notifications.length === 0) {
    return <p className="text-sm text-muted-foreground">אין לך עדיין התראות.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {unreadCount > 0 ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          disabled={isPending}
          onClick={() => startTransition(() => void markAllNotificationsRead())}
        >
          סמן הכל כנקרא
        </Button>
      ) : null}
      <ul className="flex flex-col gap-2">
        {notifications.map((n) => (
          <li
            key={n.id}
            className={`flex flex-wrap items-center justify-between gap-2 rounded border p-3 ${
              n.readAt ? "" : "border-primary bg-primary/5"
            }`}
          >
            <div className="flex flex-col gap-1">
              <span className="text-sm">{n.message}</span>
              <span className="text-xs text-muted-foreground" dir="ltr">
                {timeLabel(n.createdAt)}
              </span>
            </div>
            {n.readAt ? (
              <Badge variant="outline">נקראה</Badge>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() => startTransition(() => void markNotificationRead(n.id))}
              >
                סמן כנקראה
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
