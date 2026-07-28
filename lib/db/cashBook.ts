import "server-only";
import { getDb } from "./client";
import { cashBookEntries, users } from "./schema";
import { eq, and, asc, isNull, sql } from "drizzle-orm";
import { generatePaymentId } from "@/lib/services/paymentId";

export async function listCashBookEntries(params: { branchId: number; accountName?: string }) {
  const db = getDb();
  const conditions = [eq(cashBookEntries.branchId, params.branchId)];
  if (params.accountName) conditions.push(eq(cashBookEntries.accountName, params.accountName));

  return db
    .select({
      id: cashBookEntries.id,
      entryDate: cashBookEntries.entryDate,
      code: cashBookEntries.code,
      accountName: cashBookEntries.accountName,
      details: cashBookEntries.details,
      refType: cashBookEntries.refType,
      refNumber: cashBookEntries.refNumber,
      debit: cashBookEntries.debit,
      credit: cashBookEntries.credit,
      runningBalance: cashBookEntries.runningBalance,
      recordedByName: users.fullName,
    })
    .from(cashBookEntries)
    .innerJoin(users, eq(users.id, cashBookEntries.recordedBy))
    .where(and(...conditions))
    .orderBy(asc(cashBookEntries.entryDate), asc(cashBookEntries.id));
}

export async function listCashBookAccountNames(branchId: number) {
  const db = getDb();
  const rows = await db
    .selectDistinct({ accountName: cashBookEntries.accountName })
    .from(cashBookEntries)
    .where(and(eq(cashBookEntries.branchId, branchId), sql`${cashBookEntries.accountName} is not null`));
  return rows.map((r) => r.accountName).filter((a): a is string => !!a);
}

// Recomputes every row's running balance from scratch, in chronological order,
// scoped per (branch, account) — each named sub-account keeps its own
// independent running balance, same as the source cash book.
//
// Matches the source cash book's own formula (balance = prior - debit + credit,
// i.e. a bank-statement view: debit is money paid out, credit is money received).
async function recomputeRunningBalances(branchId: number, accountName: string | null) {
  const db = getDb();
  const accountCondition = accountName === null ? isNull(cashBookEntries.accountName) : eq(cashBookEntries.accountName, accountName);
  const rows = await db
    .select({ id: cashBookEntries.id, debit: cashBookEntries.debit, credit: cashBookEntries.credit })
    .from(cashBookEntries)
    .where(and(eq(cashBookEntries.branchId, branchId), accountCondition))
    .orderBy(asc(cashBookEntries.entryDate), asc(cashBookEntries.id));

  let balance = 0;
  for (const row of rows) {
    balance += Number(row.credit) - Number(row.debit);
    await db.update(cashBookEntries).set({ runningBalance: balance.toFixed(2) }).where(eq(cashBookEntries.id, row.id));
  }
}

export async function createCashBookEntry(data: {
  branchId: number;
  entryDate: string;
  code?: string;
  accountName?: string;
  details?: string;
  refType?: string;
  debit: string;
  credit: string;
  recordedBy: number;
}) {
  const db = getDb();

  const entry = await db.transaction(async (tx) => {
    const refNumber = await generatePaymentId(tx, data.branchId, new Date(data.entryDate));
    const [row] = await tx
      .insert(cashBookEntries)
      .values({ ...data, refNumber, runningBalance: "0" })
      .returning();
    return row;
  });

  await recomputeRunningBalances(data.branchId, data.accountName ?? null);
  return entry;
}
