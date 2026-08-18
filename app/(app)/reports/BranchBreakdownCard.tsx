"use client";

import { useState } from "react";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export type BranchBreakdownRow = {
  branchId: number;
  branchName: string;
  activeClients: number;
  loanDisbursement: string;
  loanRecovery: string;
  newSavings: string;
  savingsRecall: string;
};

export function BranchBreakdownCard({ branch, reportDate }: { branch: BranchBreakdownRow; reportDate: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button type="button" onClick={() => setOpen(true)} className="text-left">
        <GlassPanel className="flex h-full flex-col gap-1 p-2.5 transition-colors hover:bg-accent/40">
          <p className="truncate text-sm font-semibold">{branch.branchName}</p>
          <p className="text-xs text-muted-foreground">{branch.activeClients.toLocaleString()} active clients</p>
        </GlassPanel>
      </button>

      <DialogContent className="glass-panel-strong border-none sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{branch.branchName}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">Daily summary — {reportDate}</p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Active Clients</dt>
            <dd className="font-medium">{branch.activeClients.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Principal Disb.</dt>
            <dd className="font-medium">{money(branch.loanDisbursement)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Principal Recovery</dt>
            <dd className="font-medium">{money(branch.loanRecovery)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">New Savings</dt>
            <dd className="font-medium">{money(branch.newSavings)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Savings Recall</dt>
            <dd className="font-medium">{money(branch.savingsRecall)}</dd>
          </div>
        </dl>
      </DialogContent>
    </Dialog>
  );
}
