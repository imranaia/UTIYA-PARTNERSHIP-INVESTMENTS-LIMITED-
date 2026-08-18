"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markNotSupplementaryAction } from "./actions";

export function NotSupplementaryButton({ transactionId }: { transactionId: number }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const { submitted } = await markNotSupplementaryAction(transactionId);
      toast.success(submitted ? "Submitted for admin approval." : "Removed from Supplementary — treated as paid on time.");
    });
  }

  return (
    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" disabled={pending} onClick={handleClick}>
      Not supplementary
    </Button>
  );
}
