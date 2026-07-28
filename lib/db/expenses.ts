import "server-only";
import { getDb } from "./client";
import { expenses, expenseCategories, branches, users } from "./schema";
import { eq, desc, asc } from "drizzle-orm";

export async function listExpenseCategories() {
  const db = getDb();
  return db.select().from(expenseCategories).orderBy(asc(expenseCategories.name));
}

export async function listExpenses(params: { branchId: number | null }) {
  const db = getDb();
  return db
    .select({
      id: expenses.id,
      description: expenses.description,
      amount: expenses.amount,
      receiptRef: expenses.receiptRef,
      expenseDate: expenses.expenseDate,
      categoryName: expenseCategories.name,
      branchName: branches.name,
      recordedByName: users.fullName,
    })
    .from(expenses)
    .innerJoin(expenseCategories, eq(expenseCategories.id, expenses.categoryId))
    .innerJoin(branches, eq(branches.id, expenses.branchId))
    .innerJoin(users, eq(users.id, expenses.recordedBy))
    .where(params.branchId !== null ? eq(expenses.branchId, params.branchId) : undefined)
    .orderBy(desc(expenses.expenseDate), desc(expenses.id));
}

export async function createExpense(data: {
  branchId: number;
  categoryId: number;
  description: string;
  amount: string;
  receiptRef?: string;
  expenseDate: string;
  recordedBy: number;
}) {
  const db = getDb();
  const [expense] = await db.insert(expenses).values(data).returning();
  return expense;
}
