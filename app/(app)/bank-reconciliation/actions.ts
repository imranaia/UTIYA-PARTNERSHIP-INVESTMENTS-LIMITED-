"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireModule } from "@/lib/auth/session";
import { createReconciliation } from "@/lib/db/bankReconciliation";
import { logAction } from "@/lib/db/audit";

const reconSchema = z.object({
  reconDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
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
