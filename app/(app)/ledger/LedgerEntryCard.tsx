"use client";

import { useState } from "react";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export type LedgerEntryRow = {
  id: number;
  entryDate: string;
  section: string;
  label: string;
  notes: string | null;
  amount: string;
  recordedByName: string;
};

export function LedgerEntryCard({
  entry,
  sectionLabel,
  sectionSide,
}: {
  entry: LedgerEntryRow;
  sectionLabel: string;
  sectionSide: "credit" | "debit" | undefined;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button type="button" onClick={() => setOpen(true)} className="text-left">
        <GlassPanel className="flex h-full flex-col gap-1 p-2.5 transition-colors hover:bg-accent/40">
          <p className="truncate text-sm font-semibold">{entry.label}</p>
          <p className="text-xs text-muted-foreground">{entry.entryDate}</p>
          <p className="text-sm font-medium text-foreground">{money(entry.amount)}</p>
        </GlassPanel>
      </button>

      <DialogContent className="glass-panel-strong border-none sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {entry.label}
            <Badge variant={sectionSide === "credit" ? "default" : "secondary"}>{sectionLabel}</Badge>
          </DialogTitle>
        </DialogHeader>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Date</dt>
            <dd className="font-medium">{entry.entryDate}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Amount</dt>
            <dd className="font-medium">{money(entry.amount)}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-muted-foreground">Notes</dt>
            <dd className="font-medium">{entry.notes || "—"}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-muted-foreground">Recorded by</dt>
            <dd className="font-medium">{entry.recordedByName}</dd>
          </div>
        </dl>
      </DialogContent>
    </Dialog>
  );
}
