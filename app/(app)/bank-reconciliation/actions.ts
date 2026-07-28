"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireModule } from "@/lib/auth/session";
import { createReconciliation, getExpectedBookBalance } from "@/lib/db/bankReconciliation";
import { logAction } from "@/lib/db/audit";

const reconSchema = z.object({
  reconDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
  accountName: z.string().trim().max(60).optional().or(z.literal("")),
  bankBalance: z.coerce.number(),
  cashBalance: z.coerce.number(),
  bookBalance: z.coerce.number(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  branchId: z.coerce.number().int().positive().optional(),
});

export type ReconciliationFormState = { error: string | null };

export async function createReconciliationAction(
  _prevState: ReconciliationFormState,
  formData: FormData,
): Promise<ReconciliationFormState> {
  const user = await requireModule("bank_reconciliation", "create");

  const parsed = reconSchema.safeParse({
    reconDate: formData.get("reconDate"),
    accountName: formData.get("accountName"),
    bankBalance: formData.get("bankBalance"),
    cashBalance: formData.get("cashBalance"),
    bookBalance: formData.get("bookBalance"),
    notes: formData.get("notes"),
    branchId: formData.get("branchId") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const branchId = user.roleKey === "super_admin" ? parsed.data.branchId : (user.branchId ?? undefined);
  if (!branchId) {
    return { error: "A branch is required." };
  }

  const recon = await createReconciliation({
    branchId,
    reconDate: parsed.data.reconDate,
    accountName: parsed.data.accountName || undefined,
    bankBalance: parsed.data.bankBalance.toString(),
    cashBalance: parsed.data.cashBalance.toString(),
    bookBalance: parsed.data.bookBalance.toString(),
    notes: parsed.data.notes || undefined,
    recordedBy: user.userId,
  });

  await logAction({
    userId: user.userId,
    branchId,
    action: "bank_reconciliation.save",
    entityType: "bank_cash_reconciliation",
    entityId: recon.id,
    after: { reconDate: recon.reconDate, variance: recon.variance },
  });

  revalidatePath("/bank-reconciliation");
  redirect("/bank-reconciliation");
}

// Lets the form auto-fill "Book balance" from what the system already knows
// (prior counted balance + everything recorded since) instead of the admin
// calculating it by hand — they can still overwrite the value before saving.
export async function getExpectedBookBalanceAction(input: {
  branchId?: number;
  reconDate: string;
}): Promise<{ value: string | null; error: string | null }> {
  const user = await requireModule("bank_reconciliation", "create");

  const branchId = user.roleKey === "super_admin" ? input.branchId : (user.branchId ?? undefined);
  if (!branchId) {
    return { value: null, error: "Select a branch first." };
  }
  if (!input.reconDate || Number.isNaN(Date.parse(input.reconDate))) {
    return { value: null, error: "Invalid date." };
  }

  const value = await getExpectedBookBalance(branchId, input.reconDate);
  return { value, error: null };
}
