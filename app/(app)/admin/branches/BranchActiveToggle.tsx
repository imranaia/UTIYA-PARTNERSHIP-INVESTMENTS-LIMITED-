"use client";

import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { toggleBranchActiveAction } from "./actions";

export function BranchActiveToggle({ branchId, isActive }: { branchId: number; isActive: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(() => {
          void toggleBranchActiveAction(branchId, !isActive);
        })
      }
      className="cursor-pointer disabled:opacity-50"
    >
      <Badge variant={isActive ? "default" : "secondary"}>{isActive ? "Active" : "Inactive"}</Badge>
    </button>
  );
}
