"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireModule } from "@/lib/auth/session";
import { createExpense } from "@/lib/db/expenses";
import { logAction } from "@/lib/db/audit";

const expenseSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
  description: z.string().trim().min(2).max(500),
  amount: z.coerce.number().positive(),
  receiptRef: z.string().trim().max(60).optional().or(z.literal("")),
  expenseDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
  branchId: z.coerce.number().int().positive().optional(),
});

export type ExpenseFormState = { error: string | null };

export async function createExpenseAction(_prevState: ExpenseFormState, formData: FormData): Promise<ExpenseFormState> {
  const user = await requireModule("expenses", "create");

  const parsed = expenseSchema.safeParse({
    categoryId: formData.get("categoryId"),
    description: formData.get("description"),
    amount: formData.get("amount"),
    receiptRef: formData.get("receiptRef"),
    expenseDate: formData.get("expenseDate"),
    branchId: formData.get("branchId") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const branchId = user.roleKey === "super_admin" ? parsed.data.branchId : (user.branchId ?? undefined);
  if (!branchId) {
    return { error: "A branch is required." };
  }

  const expense = await createExpense({
    branchId,
    categoryId: parsed.data.categoryId,
    description: parsed.data.description,
    amount: parsed.data.amount.toString(),
    receiptRef: parsed.data.receiptRef || undefined,
    expenseDate: parsed.data.expenseDate,
    recordedBy: user.userId,
  });

  await logAction({
    userId: user.userId,
    branchId,
    action: "expense.create",
    entityType: "expense",
    entityId: expense.id,
    after: { description: expense.description, amount: expense.amount },
  });

  revalidatePath("/expenses");
  redirect("/expenses");
}
