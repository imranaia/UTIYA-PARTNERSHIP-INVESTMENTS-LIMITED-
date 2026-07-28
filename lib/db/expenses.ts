import "server-only";
import { getDb } from "./client";
import { expenses, expenseCategories, branches, users } from "./schema";
import { eq, and, desc, asc, gte, lte, sql } from "drizzle-orm";

export async function listExpenseCategories() {
  const db = getDb();
  return db.select().from(expenseCategories).orderBy(asc(expenseCategories.name));
}

export async function listExpenses(params: { branchId: number | null; from?: string; to?: string }) {
  const db = getDb();
  const conditions = [];
  if (params.branchId !== null) conditions.push(eq(expenses.branchId, params.branchId));
  if (params.from) conditions.push(gte(expenses.expenseDate, params.from));
  if (params.to) conditions.push(lte(expenses.expenseDate, params.to));

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
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(expenses.expenseDate), desc(expenses.id));
}

// Every seeded category shown even at zero, so it's obvious at a glance which
// categories haven't had any spending recorded in the selected range. Filters
// live in the join condition (not a WHERE) so unmatched categories still show.
export async function getExpensesByCategory(params: { branchId: number | null; from?: string; to?: string }) {
  const db = getDb();
  const joinConditions = [eq(expenses.categoryId, expenseCategories.id)];
  if (params.branchId !== null) joinConditions.push(eq(expenses.branchId, params.branchId));
  if (params.from) joinConditions.push(gte(expenses.expenseDate, params.from));
  if (params.to) joinConditions.push(lte(expenses.expenseDate, params.to));

  const rows = await db
    .select({
      categoryId: expenseCategories.id,
      categoryName: expenseCategories.name,
      total: sql<string>`coalesce(sum(${expenses.amount}), 0)`,
      count: sql<number>`count(${expenses.id})::int`,
    })
    .from(expenseCategories)
    .leftJoin(expenses, and(...joinConditions))
    .groupBy(expenseCategories.id, expenseCategories.name)
    .orderBy(asc(expenseCategories.name));

  return rows;
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
