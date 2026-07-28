"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { setClientStatusAction } from "../actions";

const OPTIONS = [
  { key: "active", label: "Active" },
  { key: "dormant", label: "Dormant" },
  { key: "inactive", label: "Inactive" },
];

export function ClientStatusControl({ clientId, status }: { clientId: number; status: string }) {
  const [pending, startTransition] = useTransition();

  function handleChange(next: string) {
    if (next === status) return;
    startTransition(async () => {
      await setClientStatusAction(clientId, next);
      toast.success(`Status set to ${next}.`);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={pending} className="h-6 gap-1 px-2 text-xs">
          Change
          <ChevronDown className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {OPTIONS.map((o) => (
          <DropdownMenuItem key={o.key} disabled={o.key === status} onClick={() => handleChange(o.key)}>
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
