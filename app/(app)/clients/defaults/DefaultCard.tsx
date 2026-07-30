"use client";

import { useState } from "react";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ResolveButton } from "./ResolveButton";

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export type DefaultRow = {
  id: number;
  clientCode: string;
  clientName: string;
  defaultedAmount: string;
  defaultedAt: string;
  reason: string | null;
  resolvedAt: string | null;
  resolutionType: string | null;
  recordedByName: string;
};

export function DefaultCard({
  row,
  resolutionLabels,
  canEdit,
}: {
  row: DefaultRow;
  resolutionLabels: Record<string, string>;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button type="button" onClick={() => setOpen(true)} className="text-left">
        <GlassPanel className="flex h-full flex-col gap-1 p-2.5 transition-colors hover:bg-accent/40">
          <p className="truncate text-sm font-semibold">{row.clientName}</p>
          <p className="text-xs text-muted-foreground">{money(row.defaultedAmount)}</p>
          <Badge variant={row.resolvedAt ? "secondary" : "destructive"} className="w-fit text-[10px]">
            {row.resolvedAt ? "Resolved" : "Open"}
          </Badge>
        </GlassPanel>
      </button>

      <DialogContent className="glass-panel-strong border-none sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {row.clientName}
            <Badge variant={row.resolvedAt ? "secondary" : "destructive"}>
              {row.resolvedAt
                ? `Resolved${row.resolutionType ? ` (${resolutionLabels[row.resolutionType] ?? row.resolutionType})` : ""}`
                : "Open"}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Client code</dt>
            <dd className="font-medium">{row.clientCode}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Amount</dt>
            <dd className="font-medium">{money(row.defaultedAmount)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Date</dt>
            <dd className="font-medium">{row.defaultedAt}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Recorded by</dt>
            <dd className="font-medium">{row.recordedByName}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-muted-foreground">Reason</dt>
            <dd className="font-medium">{row.reason || "—"}</dd>
          </div>
        </dl>
        {canEdit && !row.resolvedAt && (
          <div className="border-t border-border pt-3">
            <ResolveButton id={row.id} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
