import "server-only";
import { getDb } from "./client";
import { loanAgreements, clientTransactions } from "./schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { saveTransactionRow, getTransactionRow } from "./transactions";
import { computeTotals, computeSchedule, nextDueInstallment } from "@/lib/services/loanAgreement";

export async function createLoanAgreement(data: {
  clientId: number;
  branchId: number;
  principalAmount: number;
  profitAmount: number;
  tenureWeeks: number;
  startDate: string;
  createdBy: number;
}) {
  const db = getDb();
  const { totalRepayable, installmentAmount } = computeTotals(data);

  const [agreement] = await db
    .insert(loanAgreements)
    .values({
      clientId: data.clientId,
      branchId: data.branchId,
      principalAmount: data.principalAmount.toFixed(2),
      profitAmount: data.profitAmount.toFixed(2),
      totalRepayable: totalRepayable.toFixed(2),
      tenureWeeks: data.tenureWeeks,
      installmentAmount: installmentAmount.toFixed(2),
      startDate: data.startDate,
      createdBy: data.createdBy,
    })
    .returning();

  // Keep the existing ledger/reports consistent — the disbursement still
  // flows through Week Summary/Portfolio Tracker exactly as a manually
  // entered one would. saveTransactionRow's upsert sets every field, so any
  // other figure already recorded for this client/date is merged in rather
  // than overwritten.
  const existing = await getTransactionRow(data.clientId, data.startDate);
  const newDisbursement = (Number(existing?.loanDisbursement ?? 0) + data.principalAmount).toFixed(2);
  await saveTransactionRow({
    clientId: data.clientId,
    branchId: data.branchId,
    transactionDate: data.startDate,
    loanDisbursement: newDisbursement,
    loanRecovery: existing?.loanRecovery ?? "0",
    profitInterest: existing?.profitInterest ?? "0",
    serviceCharge: existing?.serviceCharge ?? "0",
    newSavings: existing?.newSavings ?? "0",
    savingsRecall: existing?.savingsRecall ?? "0",
    collateralTransferIn: existing?.collateralTransferIn ?? "0",
    collateralTransferOut: existing?.collateralTransferOut ?? "0",
    notes: existing?.notes ?? undefined,
    recordedBy: data.createdBy,
  });

  return agreement;
}

export async function listLoanAgreementsForClient(clientId: number) {
  const db = getDb();
  return db.select().from(loanAgreements).where(eq(loanAgreements.clientId, clientId)).orderBy(desc(loanAgreements.startDate));
}

// The most recent active agreement's schedule, next-due installment, and
// remaining balance (total repayable less lifetime principal recovery
// recorded since the agreement started) — what both the client detail page
// and the borrower's own portal dashboard need.
export async function getActiveLoanSummary(clientId: number) {
  const db = getDb();
  const [agreement] = await db
    .select()
    .from(loanAgreements)
    .where(and(eq(loanAgreements.clientId, clientId), eq(loanAgreements.status, "active")))
    .orderBy(desc(loanAgreements.startDate))
    .limit(1);
  if (!agreement) return null;

  const [recovered] = await db
    .select({ total: sql<string>`coalesce(sum(${clientTransactions.loanRecovery}), 0)` })
    .from(clientTransactions)
    .where(and(eq(clientTransactions.clientId, clientId), sql`${clientTransactions.transactionDate} >= ${agreement.startDate}`));

  const totalRepayable = Number(agreement.totalRepayable);
  const remainingBalance = Math.max(0, totalRepayable - Number(recovered?.total ?? 0));
  const schedule = computeSchedule({ ...agreement, totalRepayable });
  const nextDue = nextDueInstallment(schedule);

  return { agreement, schedule, nextDue, remainingBalance };
}
