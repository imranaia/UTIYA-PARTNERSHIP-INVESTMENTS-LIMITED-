"use client";

import { useState } from "react";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export type CashBookRow = {
  id: number;
  entryDate: string;
  code: string | null;
  accountName: string | null;
  details: string | null;
  refType: string | null;
  refNumber: string | null;
  debit: string;
  credit: string;
  runningBalance: string;
  recordedByName: string;
};

export function CashBookEntryCard({ row }: { row: CashBookRow }) {
  const [open, setOpen] = useState(false);
  const isCredit = Number(row.credit) > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button type="button" onClick={() => setOpen(true)} className="text-left">
        <GlassPanel className="flex h-full flex-col gap-1 p-2.5 transition-colors hover:bg-accent/40">
          <p className="truncate text-sm font-semibold">{row.details || row.entryDate}</p>
          <p className="text-xs text-muted-foreground">{row.entryDate}</p>
          <p className={"text-xs font-medium " + (isCredit ? "text-primary" : "text-destructive")}>
            {isCredit ? "+" : "-"}
            {money(isCredit ? row.credit : row.debit)}
          </p>
        </GlassPanel>
      </button>

      <DialogContent className="glass-panel-strong border-none sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{row.details || "Cash book entry"}</DialogTitle>
        </DialogHeader>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Date</dt>
            <dd className="font-medium">{row.entryDate}</dd>
          </div>
          {row.accountName && (
            <div>
              <dt className="text-xs text-muted-foreground">Account</dt>
              <dd className="font-medium">{row.accountName}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-muted-foreground">Reference</dt>
            <dd className="font-medium">{row.refType ? `${row.refType} ${row.refNumber ?? ""}`.trim() : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Debit</dt>
            <dd className="font-medium">{Number(row.debit) > 0 ? money(row.debit) : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Credit</dt>
            <dd className="font-medium">{Number(row.credit) > 0 ? money(row.credit) : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Running balance</dt>
            <dd className="font-medium">{money(row.runningBalance)}</dd>
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
