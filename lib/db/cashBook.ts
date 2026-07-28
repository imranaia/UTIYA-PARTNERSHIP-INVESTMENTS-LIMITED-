import "server-only";
import { getDb } from "./client";
import { cashBookEntries, users } from "./schema";
import { eq, asc } from "drizzle-orm";
import { generatePaymentId } from "@/lib/services/paymentId";

export async function listCashBookEntries(params: { branchId: number }) {
  const db = getDb();
  return db
    .select({
      id: cashBookEntries.id,
      entryDate: cashBookEntries.entryDate,
      code: cashBookEntries.code,
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
    .where(eq(cashBookEntries.branchId, params.branchId))
    .orderBy(asc(cashBookEntries.entryDate), asc(cashBookEntries.id));
}

// Recomputes every row's running balance from scratch, in chronological order.
// Simpler and always correct regardless of insertion order (backdated entries),
// and cheap at this system's scale (a branch's cash book grows by a handful of
// rows per day).
//
// Matches the source cash book's own formula (balance = prior - debit + credit,
// i.e. a bank-statement view: debit is money paid out, credit is money received).
async function recomputeRunningBalances(branchId: number) {
  const db = getDb();
  const rows = await db
    .select({ id: cashBookEntries.id, debit: cashBookEntries.debit, credit: cashBookEntries.credit })
    .from(cashBookEntries)
    .where(eq(cashBookEntries.branchId, branchId))
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

  await recomputeRunningBalances(data.branchId);
  return entry;
}
