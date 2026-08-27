"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * A page-level error no longer takes the whole app shell down with it -- before this, any
 * client-rendering error anywhere (this app has no other error boundaries) unmounted everything
 * back to the root, header/nav included. Scoped here at the app root: it wraps page content only,
 * the (admin)/(worker) layouts (and their header) sit above this boundary and stay mounted.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-12 text-center">
      <h1 className="text-xl font-bold">משהו השתבש</h1>
      <p className="text-sm text-muted-foreground">
        אירעה שגיאה בטעינת העמוד. ניתן לנסות שוב, או לנווט לעמוד אחר דרך התפריט.
      </p>
      <Button type="button" onClick={() => reset()}>
        ניסיון חוזר
      </Button>
    </div>
  );
}
