import "server-only";
import { getDb } from "./client";
import { branches, clients, clientTransactions, expenses, clientDefaults } from "./schema";
import { eq, and, sql, asc, gte, lte } from "drizzle-orm";

export async function getPortfolioSummary(branchId: number | null) {
  const db = getDb();
  const branchFilter = branchId !== null ? sql`and c.branch_id = ${branchId}` : sql``;

  const result = await db.execute<{ active_clients: number; total_savings: string }>(sql`
    select
      count(distinct c.id)::int as active_clients,
      coalesce(sum(latest.savings_balance_cf), 0) as total_savings
    from clients c
    left join lateral (
      select ct.savings_balance_cf
      from client_transactions ct
      where ct.client_id = c.id
      order by ct.transaction_date desc
      limit 1
    ) latest on true
    where c.status = 'active' ${branchFilter}
  `);

  const row = result.rows[0];
  return { activeClients: row?.active_clients ?? 0, totalSavings: row?.total_savings ?? "0" };
}

// Mirrors the source ledger's "Tracker" sheet: Active Investment (loans
// currently outstanding) is disbursement minus recovery minus whatever has
// been reclassified into Default Investment — a default removes a loan from
// the active bucket permanently, it doesn't return even once resolved (the
// source sheet has no such flow back to Active).
export async function getLoanPortfolioSummary(branchId: number | null) {
  const db = getDb();

  const [txnRow] = await db
    .select({
      disbursement: sql<string>`coalesce(sum(${clientTransactions.loanDisbursement}), 0)`,
      recovery: sql<string>`coalesce(sum(${clientTransactions.loanRecovery}), 0)`,
    })
    .from(clientTransactions)
    .where(branchId !== null ? eq(clientTransactions.branchId, branchId) : undefined);

  const [defaultRow] = await db
    .select({
      totalDefaulted: sql<string>`coalesce(sum(${clientDefaults.defaultedAmount}), 0)`,
      openDefaulted: sql<string>`coalesce(sum(case when ${clientDefaults.resolvedAt} is null then ${clientDefaults.defaultedAmount} else 0 end), 0)`,
    })
    .from(clientDefaults)
    .where(branchId !== null ? eq(clientDefaults.branchId, branchId) : undefined);

  const activeLoanBalance = (
    Number(txnRow?.disbursement ?? 0) -
    Number(txnRow?.recovery ?? 0) -
    Number(defaultRow?.totalDefaulted ?? 0)
  ).toFixed(2);

  return { activeLoanBalance, openDefaultBalance: defaultRow?.openDefaulted ?? "0" };
}

export async function getDailyTransactionTotals(params: { branchId: number | null; date: string }) {
  const db = getDb();
  const conditions = [eq(clientTransactions.transactionDate, params.date)];
  if (params.branchId !== null) conditions.push(eq(clientTransactions.branchId, params.branchId));

  const [row] = await db
    .select({
      loanDisbursement: sql<string>`coalesce(sum(${clientTransactions.loanDisbursement}), 0)`,
      loanRecovery: sql<string>`coalesce(sum(${clientTransactions.loanRecovery}), 0)`,
      profitInterest: sql<string>`coalesce(sum(${clientTransactions.profitInterest}), 0)`,
      serviceCharge: sql<string>`coalesce(sum(${clientTransactions.serviceCharge}), 0)`,
      newSavings: sql<string>`coalesce(sum(${clientTransactions.newSavings}), 0)`,
      savingsRecall: sql<string>`coalesce(sum(${clientTransactions.savingsRecall}), 0)`,
      collateralTransferIn: sql<string>`coalesce(sum(${clientTransactions.collateralTransferIn}), 0)`,
      collateralTransferOut: sql<string>`coalesce(sum(${clientTransactions.collateralTransferOut}), 0)`,
    })
    .from(clientTransactions)
    .where(and(...conditions));

  return row;
}

// Running collateral balance held (not tracked as its own b/f-c/f chain like
// savings — collateral net movement is small and infrequent enough that a
// straight aggregate is accurate and far simpler).
export async function getTotalCollateralHeld(branchId: number | null) {
  const db = getDb();
  const [row] = await db
    .select({
      totalIn: sql<string>`coalesce(sum(${clientTransactions.collateralTransferIn}), 0)`,
      totalOut: sql<string>`coalesce(sum(${clientTransactions.collateralTransferOut}), 0)`,
    })
    .from(clientTransactions)
    .where(branchId !== null ? eq(clientTransactions.branchId, branchId) : undefined);

  return (Number(row?.totalIn ?? 0) - Number(row?.totalOut ?? 0)).toFixed(2);
}

export async function getDailyExpenseTotal(params: { branchId: number | null; date: string }) {
  const db = getDb();
  const conditions = [eq(expenses.expenseDate, params.date)];
  if (params.branchId !== null) conditions.push(eq(expenses.branchId, params.branchId));

  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${expenses.amount}), 0)` })
    .from(expenses)
    .where(and(...conditions));

  return row?.total ?? "0";
}

export async function getTransactionTotalsForRange(params: { branchId: number; from: string; to: string }) {
  const db = getDb();
  const [row] = await db
    .select({
      loanDisbursement: sql<string>`coalesce(sum(${clientTransactions.loanDisbursement}), 0)`,
      loanRecovery: sql<string>`coalesce(sum(${clientTransactions.loanRecovery}), 0)`,
      profitInterest: sql<string>`coalesce(sum(${clientTransactions.profitInterest}), 0)`,
      serviceCharge: sql<string>`coalesce(sum(${clientTransactions.serviceCharge}), 0)`,
      newSavings: sql<string>`coalesce(sum(${clientTransactions.newSavings}), 0)`,
      savingsRecall: sql<string>`coalesce(sum(${clientTransactions.savingsRecall}), 0)`,
    })
    .from(clientTransactions)
    .where(
      and(
        eq(clientTransactions.branchId, params.branchId),
        gte(clientTransactions.transactionDate, params.from),
        lte(clientTransactions.transactionDate, params.to),
      ),
    );
  return row;
}

export async function getExpenseTotalForRange(params: { branchId: number; from: string; to: string }) {
  const db = getDb();
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${expenses.amount}), 0)` })
    .from(expenses)
    .where(
      and(eq(expenses.branchId, params.branchId), gte(expenses.expenseDate, params.from), lte(expenses.expenseDate, params.to)),
    );
  return row?.total ?? "0";
}

// Two grouped queries merged in application code — a single query joining both
// clients and client_transactions from branches would fan out (each side
// multiplies the other's rows) and silently inflate the sums.
export async function getBranchBreakdown(date: string) {
  const db = getDb();

  const allBranches = await db.select({ id: branches.id, name: branches.name }).from(branches).orderBy(asc(branches.name));

  const clientCounts = await db
    .select({ branchId: clients.branchId, activeClients: sql<number>`count(*)::int` })
    .from(clients)
    .where(eq(clients.status, "active"))
    .groupBy(clients.branchId);

  const txnTotals = await db
    .select({
      branchId: clientTransactions.branchId,
      loanDisbursement: sql<string>`coalesce(sum(${clientTransactions.loanDisbursement}), 0)`,
      loanRecovery: sql<string>`coalesce(sum(${clientTransactions.loanRecovery}), 0)`,
      newSavings: sql<string>`coalesce(sum(${clientTransactions.newSavings}), 0)`,
      savingsRecall: sql<string>`coalesce(sum(${clientTransactions.savingsRecall}), 0)`,
    })
    .from(clientTransactions)
    .where(eq(clientTransactions.transactionDate, date))
    .groupBy(clientTransactions.branchId);

  const clientCountMap = new Map(clientCounts.map((c) => [c.branchId, c.activeClients]));
  const txnMap = new Map(txnTotals.map((t) => [t.branchId, t]));

  return allBranches.map((b) => {
    const txn = txnMap.get(b.id);
    return {
      branchId: b.id,
      branchName: b.name,
      activeClients: clientCountMap.get(b.id) ?? 0,
      loanDisbursement: txn?.loanDisbursement ?? "0",
      loanRecovery: txn?.loanRecovery ?? "0",
      newSavings: txn?.newSavings ?? "0",
      savingsRecall: txn?.savingsRecall ?? "0",
    };
  });
}
