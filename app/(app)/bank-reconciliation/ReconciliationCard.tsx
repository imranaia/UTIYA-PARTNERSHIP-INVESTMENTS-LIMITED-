"use client";

import { useState } from "react";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export type ReconciliationRow = {
  id: number;
  reconDate: string;
  accountName: string | null;
  branchName: string;
  bankBalance: string;
  cashBalance: string;
  bookBalance: string;
  variance: string;
  recordedByName: string;
};

export function ReconciliationCard({ row, showBranch }: { row: ReconciliationRow; showBranch: boolean }) {
  const [open, setOpen] = useState(false);
  const balanced = Number(row.variance) === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button type="button" onClick={() => setOpen(true)} className="text-left">
        <GlassPanel className="flex h-full flex-col gap-1 p-2.5 transition-colors hover:bg-accent/40">
          <p className="truncate text-sm font-semibold">{row.accountName || "Main"}</p>
          <p className="text-xs text-muted-foreground">{row.reconDate}</p>
          <Badge variant={balanced ? "default" : "destructive"} className="w-fit">
            {money(row.variance)}
          </Badge>
        </GlassPanel>
      </button>

      <DialogContent className="glass-panel-strong border-none sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {row.accountName || "Main"}
            <Badge variant={balanced ? "default" : "destructive"}>{balanced ? "Balanced" : "Variance"}</Badge>
          </DialogTitle>
        </DialogHeader>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Date</dt>
            <dd className="font-medium">{row.reconDate}</dd>
          </div>
          {showBranch && (
            <div>
              <dt className="text-xs text-muted-foreground">Branch</dt>
              <dd className="font-medium">{row.branchName}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-muted-foreground">Bank balance</dt>
            <dd className="font-medium">{money(row.bankBalance)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Cash balance</dt>
            <dd className="font-medium">{money(row.cashBalance)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Book balance</dt>
            <dd className="font-medium">{money(row.bookBalance)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Variance</dt>
            <dd className={balanced ? "font-medium" : "font-medium text-destructive"}>{money(row.variance)}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-muted-foreground">Recorded by</dt>
            <dd className="font-medium">{row.recordedByName}</dd>
          </div>
        </dl>
      </DialogContent>
    </Dialog>
  );
}
