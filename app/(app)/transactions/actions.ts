"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireModule } from "@/lib/auth/session";
import { saveTransactionRow, isEmptyRow } from "@/lib/db/transactions";
import { filterClientIdsInBranch } from "@/lib/db/clients";
import { logAction } from "@/lib/db/audit";

export type DailyTransactionsState = { error: string | null; savedCount: number };

const rowSchema = z.object({
  loanDisbursement: z.coerce.number().nonnegative().default(0),
  loanRecovery: z.coerce.number().nonnegative().default(0),
  profitInterest: z.coerce.number().nonnegative().default(0),
  serviceCharge: z.coerce.number().nonnegative().default(0),
  newSavings: z.coerce.number().nonnegative().default(0),
  savingsRecall: z.coerce.number().nonnegative().default(0),
  notes: z.string().trim().max(300).optional(),
});

export async function saveDailyTransactionsAction(
  _prevState: DailyTransactionsState,
  formData: FormData,
): Promise<DailyTransactionsState> {
  const user = await requireModule("transactions", "create");

  const transactionDate = String(formData.get("transactionDate") ?? "");
  if (!transactionDate || Number.isNaN(Date.parse(transactionDate))) {
    return { error: "Invalid date.", savedCount: 0 };
  }

  const branchId = user.roleKey === "super_admin" ? Number(formData.get("branchId")) : user.branchId;
  if (!branchId) {
    return { error: "A branch is required.", savedCount: 0 };
  }

  const clientIds = String(formData.get("clientIds") ?? "")
    .split(",")
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n > 0);
  if (clientIds.length === 0) {
    return { error: "No clients to save.", savedCount: 0 };
  }

  const allowedIds = await filterClientIdsInBranch(clientIds, branchId);

  let savedCount = 0;
  for (const clientId of clientIds) {
    if (!allowedIds.has(clientId)) continue;

    const parsed = rowSchema.safeParse({
      loanDisbursement: formData.get(`ld_${clientId}`),
      loanRecovery: formData.get(`lr_${clientId}`),
      profitInterest: formData.get(`pi_${clientId}`),
      serviceCharge: formData.get(`sc_${clientId}`),
      newSavings: formData.get(`ns_${clientId}`),
      savingsRecall: formData.get(`sr_${clientId}`),
      notes: formData.get(`nt_${clientId}`) || undefined,
    });
    if (!parsed.success || isEmptyRow(parsed.data)) continue;

    const d = parsed.data;
    await saveTransactionRow({
      clientId,
      branchId,
      transactionDate,
      loanDisbursement: d.loanDisbursement.toString(),
      loanRecovery: d.loanRecovery.toString(),
      profitInterest: d.profitInterest.toString(),
      serviceCharge: d.serviceCharge.toString(),
      newSavings: d.newSavings.toString(),
      savingsRecall: d.savingsRecall.toString(),
      notes: d.notes,
      recordedBy: user.userId,
    });
    savedCount++;
  }

  if (savedCount > 0) {
    await logAction({
      userId: user.userId,
      branchId,
      action: "transaction.daily_save",
      entityType: "client_transactions",
      after: { transactionDate, savedCount },
    });
  }

  revalidatePath("/transactions");
  return { error: savedCount === 0 ? "No changes to save." : null, savedCount };
}
