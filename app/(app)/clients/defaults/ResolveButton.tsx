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
import { resolveDefaultAction } from "./actions";

const OPTIONS = [
  { key: "repaid", label: "Repaid" },
  { key: "written_off", label: "Written Off" },
  { key: "deceased", label: "Deceased" },
];

export function ResolveButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();

  function handleResolve(resolutionType: string) {
    startTransition(async () => {
      await resolveDefaultAction(id, resolutionType);
      toast.success("Marked as resolved.");
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={pending} className="gap-1">
          Mark resolved
          <ChevronDown className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPTIONS.map((o) => (
          <DropdownMenuItem key={o.key} onClick={() => handleResolve(o.key)}>
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
