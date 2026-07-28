"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveDailyTransactionsAction, type DailyTransactionsState } from "./actions";

type Row = {
  clientId: number;
  clientCode: string;
  fullName: string;
  groupName: string | null;
  paymentId: string | null;
  loanDisbursement: string | null;
  loanRecovery: string | null;
  profitInterest: string | null;
  serviceCharge: string | null;
  newSavings: string | null;
  savingsRecall: string | null;
  collateralTransferIn: string | null;
  collateralTransferOut: string | null;
  notes: string | null;
  savingsBalanceBf: string;
};

const initialState: DailyTransactionsState = { error: null, savedCount: 0 };

const cellInputClass = "h-8 w-24 text-right";

export function DailyTransactionsTable({
  rows,
  transactionDate,
  branchId,
  readOnly,
}: {
  rows: Row[];
  transactionDate: string;
  branchId: number;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveDailyTransactionsAction, initialState);

  useEffect(() => {
    if (state === initialState) return;
    if (state.error) toast.error(state.error);
    else if (state.savedCount > 0) toast.success(`Saved ${state.savedCount} client${state.savedCount === 1 ? "" : "s"}.`);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="transactionDate" value={transactionDate} />
      <input type="hidden" name="branchId" value={branchId} />
      <input type="hidden" name="clientIds" value={rows.map((r) => r.clientId).join(",")} />

      <GlassPanel className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Payment ID</TableHead>
              <TableHead className="text-right">Savings B/F</TableHead>
              <TableHead className="text-right">Loan Disb.</TableHead>
              <TableHead className="text-right">Loan Recovery</TableHead>
              <TableHead className="text-right">Interest</TableHead>
              <TableHead className="text-right">Service Chg.</TableHead>
              <TableHead className="text-right">New Savings</TableHead>
              <TableHead className="text-right">Savings Recall</TableHead>
              <TableHead className="text-right">Collateral In</TableHead>
              <TableHead className="text-right">Collateral Out</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.clientId}>
                <TableCell>
                  <div className="font-medium">{r.fullName}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.clientCode}
                    {r.groupName ? ` · ${r.groupName}` : ""}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{r.paymentId ?? "—"}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {Number(r.savingsBalanceBf).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    name={`ld_${r.clientId}`}
                    defaultValue={r.loanDisbursement ?? ""}
                    disabled={readOnly}
                    className={cellInputClass}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    name={`lr_${r.clientId}`}
                    defaultValue={r.loanRecovery ?? ""}
                    disabled={readOnly}
                    className={cellInputClass}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    name={`pi_${r.clientId}`}
                    defaultValue={r.profitInterest ?? ""}
                    disabled={readOnly}
                    className={cellInputClass}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    name={`sc_${r.clientId}`}
                    defaultValue={r.serviceCharge ?? ""}
                    disabled={readOnly}
                    className={cellInputClass}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    name={`ns_${r.clientId}`}
                    defaultValue={r.newSavings ?? ""}
                    disabled={readOnly}
                    className={cellInputClass}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    name={`sr_${r.clientId}`}
                    defaultValue={r.savingsRecall ?? ""}
                    disabled={readOnly}
                    className={cellInputClass}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    name={`ci_${r.clientId}`}
                    defaultValue={r.collateralTransferIn ?? ""}
                    disabled={readOnly}
                    className={cellInputClass}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    name={`co_${r.clientId}`}
                    defaultValue={r.collateralTransferOut ?? ""}
                    disabled={readOnly}
                    className={cellInputClass}
                  />
                </TableCell>
                <TableCell>
                  <Input name={`nt_${r.clientId}`} defaultValue={r.notes ?? ""} disabled={readOnly} className="h-8 w-32" />
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={12} className="text-center text-muted-foreground">
                  No active clients for this branch/collector.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </GlassPanel>

      {!readOnly && rows.length > 0 && (
        <div className="mt-3 flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save all"}
          </Button>
        </div>
      )}
    </form>
  );
}
