"use client";

import { useState } from "react";
import { Printer, Receipt as ReceiptIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type LineItem = { label: string; value: number };

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ReceiptDialog({
  clientName,
  clientCode,
  groupName,
  branchName,
  transactionDate,
  paymentId,
  notes,
  preparedBy,
  received,
  paidOut,
}: {
  clientName: string;
  clientCode: string;
  groupName: string | null;
  branchName: string;
  transactionDate: string;
  paymentId: string | null;
  notes: string | null;
  preparedBy: string;
  received: LineItem[];
  paidOut: LineItem[];
}) {
  const [open, setOpen] = useState(false);
  const totalReceived = received.reduce((sum, i) => sum + i.value, 0);
  const totalPaidOut = paidOut.reduce((sum, i) => sum + i.value, 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="ghost" size="icon-sm" title="Print receipt" onClick={() => setOpen(true)}>
        <ReceiptIcon className="size-4" />
      </Button>
      <DialogContent className="glass-panel-strong border-none sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Receipt — {clientName}</DialogTitle>
        </DialogHeader>

        <div className="print-area rounded-lg border border-border bg-white p-6 text-black">
          <div className="flex items-center gap-2.5 border-b border-black/10 pb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.png" alt="" width={36} height={36} />
            <div>
              <p className="text-sm font-semibold leading-tight">Alkhair Microcredit Limited</p>
              <p className="text-xs text-black/60 leading-tight">{branchName}</p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-black/60">
            <span>Payment Receipt</span>
            <span>{transactionDate}</span>
          </div>

          <div className="mt-3 space-y-0.5 text-sm">
            <p className="font-medium">{clientName}</p>
            <p className="text-black/60">
              {clientCode}
              {groupName ? ` · ${groupName}` : ""}
            </p>
            {paymentId && <p className="text-black/60">Ref: {paymentId}</p>}
          </div>

          {received.length > 0 && (
            <div className="mt-4">
              <p className="mb-1 text-xs font-medium text-black/60">Received from client</p>
              <div className="space-y-1 text-sm">
                {received.map((i) => (
                  <div key={i.label} className="flex justify-between">
                    <span>{i.label}</span>
                    <span>{money(i.value)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-black/10 pt-1 font-medium">
                  <span>Total received</span>
                  <span>{money(totalReceived)}</span>
                </div>
              </div>
            </div>
          )}

          {paidOut.length > 0 && (
            <div className="mt-4">
              <p className="mb-1 text-xs font-medium text-black/60">Paid out to client</p>
              <div className="space-y-1 text-sm">
                {paidOut.map((i) => (
                  <div key={i.label} className="flex justify-between">
                    <span>{i.label}</span>
                    <span>{money(i.value)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-black/10 pt-1 font-medium">
                  <span>Total paid out</span>
                  <span>{money(totalPaidOut)}</span>
                </div>
              </div>
            </div>
          )}

          {notes && (
            <p className="mt-4 text-xs text-black/60">
              <span className="font-medium text-black/80">Notes: </span>
              {notes}
            </p>
          )}

          <div className="mt-6 flex items-center justify-between border-t border-black/10 pt-3 text-xs text-black/60">
            <span>Prepared by {preparedBy}</span>
            <span>Printed {new Date().toLocaleString()}</span>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" className="w-full gap-1.5" onClick={() => window.print()}>
            <Printer className="size-4" />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
