import "server-only";
import { getDb } from "./client";
import { bankCashReconciliation, branches, users } from "./schema";
import { eq, and, lt, lte, desc } from "drizzle-orm";
import { getTransactionTotalsForRange, getExpenseTotalForRange } from "./reports";
import { getLedgerTotals } from "./ledger";

export async function listReconciliations(params: { branchId: number | null }) {
  const db = getDb();
  return db
    .select({
      id: bankCashReconciliation.id,
      reconDate: bankCashReconciliation.reconDate,
      bankBalance: bankCashReconciliation.bankBalance,
      cashBalance: bankCashReconciliation.cashBalance,
      bookBalance: bankCashReconciliation.bookBalance,
      variance: bankCashReconciliation.variance,
      notes: bankCashReconciliation.notes,
      branchName: branches.name,
      recordedByName: users.fullName,
    })
    .from(bankCashReconciliation)
    .innerJoin(branches, eq(branches.id, bankCashReconciliation.branchId))
    .innerJoin(users, eq(users.id, bankCashReconciliation.recordedBy))
    .where(params.branchId !== null ? eq(bankCashReconciliation.branchId, params.branchId) : undefined)
    .orderBy(desc(bankCashReconciliation.reconDate));
}

// Most recent reconciliation strictly before a date — used as a period's
// opening (b/f) treasury balance.
export async function getReconciliationBefore(branchId: number, date: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(bankCashReconciliation)
    .where(and(eq(bankCashReconciliation.branchId, branchId), lt(bankCashReconciliation.reconDate, date)))
    .orderBy(desc(bankCashReconciliation.reconDate))
    .limit(1);
  return row ?? null;
}

// Most recent reconciliation on or before a date — used as a period's
// closing (c/f) treasury balance (the actual recorded figure to compare
// against the computed/expected one).
export async function getReconciliationOnOrBefore(branchId: number, date: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(bankCashReconciliation)
    .where(and(eq(bankCashReconciliation.branchId, branchId), lte(bankCashReconciliation.reconDate, date)))
    .orderBy(desc(bankCashReconciliation.reconDate))
    .limit(1);
  return row ?? null;
}

// Auto-derives the book balance an admin would otherwise have to calculate
// by hand: last counted (bank+cash) balance, rolled forward by everything
// the system already recorded since then (same debit/credit logic as the
// Week Summary report) — so the form only asks for what a human actually
// has to go count (bank + cash on hand), not a number the system already knows.
export async function getExpectedBookBalance(branchId: number, asOfDate: string) {
  const prior = await getReconciliationBefore(branchId, asOfDate);
  const bf = prior ? Number(prior.bankBalance) + Number(prior.cashBalance) : 0;
  // Day after the prior reconciliation (already reflected in its balance) — or
  // a safe epoch predating any real data when there's no prior record.
  const from = prior
    ? new Date(new Date(prior.reconDate).getTime() + 86_400_000).toISOString().slice(0, 10)
    : "2000-01-01";

  const [txn, expenseTotal, ledger] = await Promise.all([
    getTransactionTotalsForRange({ branchId, from, to: asOfDate }),
    getExpenseTotalForRange({ branchId, from, to: asOfDate }),
    getLedgerTotals({ branchId, from, to: asOfDate }),
  ]);

  const credits =
    Number(txn?.loanRecovery ?? 0) +
    Number(txn?.profitInterest ?? 0) +
    Number(txn?.serviceCharge ?? 0) +
    Number(txn?.newSavings ?? 0) +
    Number(ledger.investment_income) +
    Number(ledger.funds_transfer_in) +
    Number(ledger.new_liability) +
    Number(ledger.new_borrowing) +
    Number(ledger.asset_disposal);

  const debits =
    Number(txn?.loanDisbursement ?? 0) +
    Number(txn?.savingsRecall ?? 0) +
    Number(expenseTotal) +
    Number(ledger.funds_transfer_out) +
    Number(ledger.liability_payment) +
    Number(ledger.borrowing_recall) +
    Number(ledger.asset_purchase);

  return (bf + credits - debits).toFixed(2);
}

export async function createReconciliation(data: {
  branchId: number;
  reconDate: string;
  bankBalance: string;
  cashBalance: string;
  bookBalance: string;
  notes?: string;
  recordedBy: number;
}) {
  const db = getDb();
  const variance = (Number(data.bankBalance) + Number(data.cashBalance) - Number(data.bookBalance)).toFixed(2);

  const [recon] = await db
    .insert(bankCashReconciliation)
    .values({ ...data, variance })
    .onConflictDoUpdate({
      target: [bankCashReconciliation.branchId, bankCashReconciliation.reconDate],
      set: {
        bankBalance: data.bankBalance,
        cashBalance: data.cashBalance,
        bookBalance: data.bookBalance,
        variance,
        notes: data.notes,
        recordedBy: data.recordedBy,
      },
    })
    .returning();
  return recon;
}
