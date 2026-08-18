"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { approveChangeAction, rejectChangeAction } from "./actions";

export function ApprovalActions({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");

  function approve() {
    startTransition(async () => {
      const { error } = await approveChangeAction(id);
      if (error) toast.error(error);
      else toast.success("Approved and applied.");
    });
  }

  function reject() {
    startTransition(async () => {
      const { error } = await rejectChangeAction(id, note || undefined);
      if (error) toast.error(error);
      else toast.success("Rejected.");
    });
  }

  if (rejecting) {
    return (
      <div className="flex items-center gap-1.5">
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Reason (optional)"
          className="h-7 w-36 text-xs"
        />
        <Button size="sm" variant="destructive" className="h-7 px-2" disabled={pending} onClick={reject}>
          Confirm
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2" disabled={pending} onClick={() => setRejecting(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button size="sm" variant="secondary" className="h-7 gap-1 px-2" disabled={pending} onClick={approve}>
        <Check className="size-3.5" />
        Approve
      </Button>
      <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-destructive" disabled={pending} onClick={() => setRejecting(true)}>
        <X className="size-3.5" />
        Reject
      </Button>
    </div>
  );
}
