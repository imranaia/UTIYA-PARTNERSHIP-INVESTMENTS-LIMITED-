import "server-only";
import { getDb } from "./client";
import { bankCashReconciliation, branches, users } from "./schema";
import { eq, and, lt, lte, desc } from "drizzle-orm";

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
