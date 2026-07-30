"use client";

import { useState } from "react";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export type ExpenseRow = {
  id: number;
  expenseDate: string;
  categoryName: string;
  description: string;
  branchName: string;
  recordedByName: string;
  receiptRef: string | null;
  amount: string;
};

export function ExpenseCard({ expense, showBranch }: { expense: ExpenseRow; showBranch: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button type="button" onClick={() => setOpen(true)} className="text-left">
        <GlassPanel className="flex h-full flex-col gap-1 p-2.5 transition-colors hover:bg-accent/40">
          <p className="truncate text-sm font-semibold">{expense.categoryName}</p>
          <p className="text-xs text-muted-foreground">{expense.expenseDate}</p>
          <p className="text-sm font-medium text-foreground">{money(expense.amount)}</p>
        </GlassPanel>
      </button>

      <DialogContent className="glass-panel-strong border-none sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{expense.categoryName}</DialogTitle>
        </DialogHeader>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div className="col-span-2">
            <dt className="text-xs text-muted-foreground">Description</dt>
            <dd className="font-medium">{expense.description}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Amount</dt>
            <dd className="font-medium">{money(expense.amount)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Date</dt>
            <dd className="font-medium">{expense.expenseDate}</dd>
          </div>
          {showBranch && (
            <div>
              <dt className="text-xs text-muted-foreground">Branch</dt>
              <dd className="font-medium">{expense.branchName}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-muted-foreground">Recorded by</dt>
            <dd className="font-medium">{expense.recordedByName}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Receipt ref.</dt>
            <dd className="font-medium">{expense.receiptRef || "—"}</dd>
          </div>
        </dl>
      </DialogContent>
    </Dialog>
  );
}
