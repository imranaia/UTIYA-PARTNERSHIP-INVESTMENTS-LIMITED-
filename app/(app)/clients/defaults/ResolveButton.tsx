"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resolveDefaultAction } from "./actions";

export function ResolveButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();

  function handleResolve() {
    startTransition(async () => {
      await resolveDefaultAction(id);
      toast.success("Marked as resolved.");
    });
  }

  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={handleResolve}>
      Mark resolved
    </Button>
  );
}
