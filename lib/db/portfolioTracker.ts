import "server-only";
import { getDb } from "./client";
import { clientTransactions, clientDefaults } from "./schema";
import { eq, and, lt, gte, lte, sql } from "drizzle-orm";

// Mirrors the source ledger's own "CGL Tracker" sheet: a day-by-day roll of
// Active Investment (performing loans), Default Investment, Net Office
// Investment (the two combined), and Collateral/Savings Investment, each as
// balance b/f -> that day's movement -> balance c/f. The source sheet also
// cross-checked each day's balance against a separate "CGL" system with a
// Variance column — this app is now the system of record, so there's
// nothing external left to reconcile against.
export type TrackerDay = {
  date: string;
  active: { bf: string; disbursement: string; recovery: string; defaulted: string; cf: string };
  default: { bf: string; newDefault: string; recovered: string; cf: string };
  netOffice: { bf: string; disbursement: string; recovery: string; defaulted: string; cf: string };
  savings: { bf: string; newSavings: string; recall: string; collateralIn: string; collateralOut: string; cf: string };
};

function n(v: string | number | null | undefined) {
  return Number(v ?? 0);
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function getDailyPortfolioTracker(params: { branchId: number; from: string; to: string }) {
  const db = getDb();
  const { branchId, from, to } = params;

  const [beforeTxn] = await db
    .select({
      disbursement: sql<string>`coalesce(sum(${clientTransactions.loanDisbursement}), 0)`,
      recovery: sql<string>`coalesce(sum(${clientTransactions.loanRecovery}), 0)`,
      newSavings: sql<string>`coalesce(sum(${clientTransactions.newSavings}), 0)`,
      recall: sql<string>`coalesce(sum(${clientTransactions.savingsRecall}), 0)`,
      collateralIn: sql<string>`coalesce(sum(${clientTransactions.collateralTransferIn}), 0)`,
      collateralOut: sql<string>`coalesce(sum(${clientTransactions.collateralTransferOut}), 0)`,
    })
    .from(clientTransactions)
    .where(and(eq(clientTransactions.branchId, branchId), lt(clientTransactions.transactionDate, from)));

  const [beforeDefaulted] = await db
    .select({ total: sql<string>`coalesce(sum(${clientDefaults.defaultedAmount}), 0)` })
    .from(clientDefaults)
    .where(and(eq(clientDefaults.branchId, branchId), lt(clientDefaults.defaultedAt, from)));

  const [beforeResolved] = await db
    .select({ total: sql<string>`coalesce(sum(${clientDefaults.defaultedAmount}), 0)` })
    .from(clientDefaults)
    .where(and(eq(clientDefaults.branchId, branchId), sql`${clientDefaults.resolvedAt} < ${from}`));

  const txnByDay = await db
    .select({
      date: clientTransactions.transactionDate,
      disbursement: sql<string>`coalesce(sum(${clientTransactions.loanDisbursement}), 0)`,
      recovery: sql<string>`coalesce(sum(${clientTransactions.loanRecovery}), 0)`,
      newSavings: sql<string>`coalesce(sum(${clientTransactions.newSavings}), 0)`,
      recall: sql<string>`coalesce(sum(${clientTransactions.savingsRecall}), 0)`,
      collateralIn: sql<string>`coalesce(sum(${clientTransactions.collateralTransferIn}), 0)`,
      collateralOut: sql<string>`coalesce(sum(${clientTransactions.collateralTransferOut}), 0)`,
    })
    .from(clientTransactions)
    .where(
      and(eq(clientTransactions.branchId, branchId), gte(clientTransactions.transactionDate, from), lte(clientTransactions.transactionDate, to)),
    )
    .groupBy(clientTransactions.transactionDate);

  const defaultedByDay = await db
    .select({ date: clientDefaults.defaultedAt, total: sql<string>`coalesce(sum(${clientDefaults.defaultedAmount}), 0)` })
    .from(clientDefaults)
    .where(and(eq(clientDefaults.branchId, branchId), gte(clientDefaults.defaultedAt, from), lte(clientDefaults.defaultedAt, to)))
    .groupBy(clientDefaults.defaultedAt);

  const resolvedByDay = await db
    .select({ date: clientDefaults.resolvedAt, total: sql<string>`coalesce(sum(${clientDefaults.defaultedAmount}), 0)` })
    .from(clientDefaults)
    .where(
      and(
        eq(clientDefaults.branchId, branchId),
        sql`${clientDefaults.resolvedAt} >= ${from}`,
        sql`${clientDefaults.resolvedAt} <= ${to}`,
      ),
    )
    .groupBy(clientDefaults.resolvedAt);

  const txnMap = new Map(txnByDay.map((r) => [r.date, r]));
  const defaultedMap = new Map(defaultedByDay.map((r) => [r.date, r.total]));
  const resolvedMap = new Map(resolvedByDay.map((r) => [r.date as string, r.total]));

  let activeBf = n(beforeTxn?.disbursement) - n(beforeTxn?.recovery) - n(beforeDefaulted?.total);
  let defaultBf = n(beforeDefaulted?.total) - n(beforeResolved?.total);
  let savingsBf =
    n(beforeTxn?.newSavings) - n(beforeTxn?.recall) + n(beforeTxn?.collateralIn) - n(beforeTxn?.collateralOut);

  const days: TrackerDay[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const txn = txnMap.get(date);
    const disbursement = n(txn?.disbursement);
    const recovery = n(txn?.recovery);
    const newDefault = n(defaultedMap.get(date));
    const recovered = n(resolvedMap.get(date));
    const newSavings = n(txn?.newSavings);
    const recall = n(txn?.recall);
    const collateralIn = n(txn?.collateralIn);
    const collateralOut = n(txn?.collateralOut);

    const activeCf = activeBf + disbursement - recovery - newDefault;
    const defaultCf = defaultBf + newDefault - recovered;
    const netBf = activeBf + defaultBf;
    const netCf = activeCf + defaultCf;
    const savingsCf = savingsBf + newSavings - recall + collateralIn - collateralOut;

    days.push({
      date,
      active: { bf: activeBf.toFixed(2), disbursement: disbursement.toFixed(2), recovery: recovery.toFixed(2), defaulted: newDefault.toFixed(2), cf: activeCf.toFixed(2) },
      default: { bf: defaultBf.toFixed(2), newDefault: newDefault.toFixed(2), recovered: recovered.toFixed(2), cf: defaultCf.toFixed(2) },
      netOffice: { bf: netBf.toFixed(2), disbursement: disbursement.toFixed(2), recovery: recovery.toFixed(2), defaulted: newDefault.toFixed(2), cf: netCf.toFixed(2) },
      savings: { bf: savingsBf.toFixed(2), newSavings: newSavings.toFixed(2), recall: recall.toFixed(2), collateralIn: collateralIn.toFixed(2), collateralOut: collateralOut.toFixed(2), cf: savingsCf.toFixed(2) },
    });

    activeBf = activeCf;
    defaultBf = defaultCf;
    savingsBf = savingsCf;
  }

  return days;
}
