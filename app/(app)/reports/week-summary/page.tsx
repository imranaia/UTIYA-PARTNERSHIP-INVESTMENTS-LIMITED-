import { startOfWeek, endOfWeek, format } from "date-fns";
import { requireModule } from "@/lib/auth/session";
import { listActiveBranches } from "@/lib/db/branches";
import { getTransactionTotalsForRange, getExpenseTotalForRange } from "@/lib/db/reports";
import { getLedgerTotals } from "@/lib/db/ledger";
import { getReconciliationBefore, getReconciliationOnOrBefore } from "@/lib/db/bankReconciliation";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { BackLink } from "@/components/layout/BackLink";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const nativeSelectClass =
  "h-8 w-44 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={"flex items-center justify-between py-1.5 " + (bold ? "font-semibold" : "")}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default async function WeekSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string; from?: string; to?: string }>;
}) {
  const user = await requireModule("reports", "view");
  const isSuperAdmin = user.roleKey === "super_admin";
  const { branchId: branchIdParam, from: fromParam, to: toParam } = await searchParams;

  const defaultFrom = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const defaultTo = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const from = fromParam && !Number.isNaN(Date.parse(fromParam)) ? fromParam : defaultFrom;
  const to = toParam && !Number.isNaN(Date.parse(toParam)) ? toParam : defaultTo;

  const branches = isSuperAdmin ? await listActiveBranches() : [];
  const branchId = isSuperAdmin ? (branchIdParam ? Number(branchIdParam) : (branches[0]?.id ?? null)) : user.branchId;

  if (!branchId) {
    return (
      <div className="space-y-4">
        <BackLink href="/reports" label="Back to Reports" />
        <h1 className="text-lg font-semibold">Week Summary</h1>
        <GlassPanel className="p-6 text-center text-muted-foreground">Select a branch to begin.</GlassPanel>
      </div>
    );
  }

  const [txn, expenseTotal, ledger, reconBf, reconCf] = await Promise.all([
    getTransactionTotalsForRange({ branchId, from, to }),
    getExpenseTotalForRange({ branchId, from, to }),
    getLedgerTotals({ branchId, from, to }),
    getReconciliationBefore(branchId, from),
    getReconciliationOnOrBefore(branchId, to),
  ]);

  const loanDisbursement = Number(txn?.loanDisbursement ?? 0);
  const loanRecovery = Number(txn?.loanRecovery ?? 0);
  const operatingIncome = Number(txn?.profitInterest ?? 0) + Number(txn?.serviceCharge ?? 0) + Number(ledger.investment_income);
  const operatingExpenses = Number(expenseTotal);
  const fundsTransferOut = Number(ledger.funds_transfer_out);
  const fundsTransferIn = Number(ledger.funds_transfer_in);
  const liabilityPayments = Number(ledger.liability_payment);
  const newLiability = Number(ledger.new_liability);
  const assetPurchase = Number(ledger.asset_purchase);
  const assetDisposal = Number(ledger.asset_disposal);
  const borrowingRecall = Number(ledger.borrowing_recall);
  const newBorrowing = Number(ledger.new_borrowing);

  const totalDebits = operatingExpenses + fundsTransferOut + liabilityPayments + assetPurchase + loanDisbursement + borrowingRecall;
  const totalCredits = assetDisposal + fundsTransferIn + newLiability + loanRecovery + newBorrowing + operatingIncome;

  const bf = reconBf ? Number(reconBf.bankBalance) + Number(reconBf.cashBalance) : 0;
  const expectedCf = bf + totalCredits - totalDebits;
  const actualCf = reconCf ? Number(reconCf.bankBalance) + Number(reconCf.cashBalance) : null;
  const variance = actualCf !== null ? actualCf - expectedCf : null;

  return (
    <div className="space-y-4">
      <BackLink href="/reports" label="Back to Reports" />
      <h1 className="text-lg font-semibold">Week Summary</h1>

      <GlassPanel className="p-4">
        <form className="flex flex-wrap items-end gap-3">
          {isSuperAdmin && (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground" htmlFor="branchId">
                Branch
              </label>
              <select id="branchId" name="branchId" defaultValue={String(branchId)} className={nativeSelectClass}>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground" htmlFor="from">
              From
            </label>
            <Input id="from" name="from" type="date" defaultValue={from} className="w-40" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground" htmlFor="to">
              To
            </label>
            <Input id="to" name="to" type="date" defaultValue={to} className="w-40" />
          </div>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
        </form>
      </GlassPanel>

      <div className="grid gap-4 md:grid-cols-2">
        <GlassPanel className="p-6">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Debits</h2>
          <Line label="Operating Expenses" value={money(operatingExpenses)} />
          <Line label="Funds Transfer Out" value={money(fundsTransferOut)} />
          <Line label="Liability Payments" value={money(liabilityPayments)} />
          <Line label="Purchase of Assets" value={money(assetPurchase)} />
          <Line label="Loan Disbursement" value={money(loanDisbursement)} />
          <Line label="Recall of Borrowings" value={money(borrowingRecall)} />
          <div className="mt-2 border-t border-border pt-2">
            <Line label="Total Debits" value={money(totalDebits)} bold />
          </div>
        </GlassPanel>

        <GlassPanel className="p-6">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Credits</h2>
          <Line label="Disposal of Assets" value={money(assetDisposal)} />
          <Line label="Funds Transferred In" value={money(fundsTransferIn)} />
          <Line label="New Liability" value={money(newLiability)} />
          <Line label="Recovery of Loans" value={money(loanRecovery)} />
          <Line label="New Borrowings" value={money(newBorrowing)} />
          <Line label="Operating / Investment Income" value={money(operatingIncome)} />
          <div className="mt-2 border-t border-border pt-2">
            <Line label="Total Credits" value={money(totalCredits)} bold />
          </div>
        </GlassPanel>
      </div>

      <GlassPanel className="p-6">
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
          Treasury Reconciliation — {from} to {to}
        </h2>
        <Line label="Bank + Cash Balance B/F" value={money(bf)} />
        <Line label="+ Total Credits" value={money(totalCredits)} />
        <Line label="− Total Debits" value={money(totalDebits)} />
        <div className="mt-2 border-t border-border pt-2">
          <Line label="Expected Bank + Cash Balance C/F" value={money(expectedCf)} bold />
        </div>
        <div className="mt-2 border-t border-border pt-2">
          <Line label="Actual Balance C/F (from reconciliation)" value={actualCf !== null ? money(actualCf) : "Not recorded"} />
          <Line
            label="Variance"
            value={variance !== null ? money(variance) : "—"}
            bold
          />
        </div>
        {reconBf && <p className="mt-2 text-xs text-muted-foreground">B/F as of last reconciliation: {reconBf.reconDate}</p>}
        {reconCf && <p className="text-xs text-muted-foreground">C/F as of last reconciliation: {reconCf.reconDate}</p>}
        {!reconCf && (
          <p className="mt-2 text-xs text-muted-foreground">
            No bank reconciliation recorded on or before {to} yet — record one to see the actual variance.
          </p>
        )}
      </GlassPanel>
    </div>
  );
}
