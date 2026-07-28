"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireModule } from "@/lib/auth/session";
import { createCashBookEntry } from "@/lib/db/cashBook";
import { logAction } from "@/lib/db/audit";

const entrySchema = z.object({
  entryDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
  details: z.string().trim().max(300).optional().or(z.literal("")),
  refType: z.enum(["OR", "PV", "CQ"]).optional().or(z.literal("")),
  debit: z.coerce.number().nonnegative().default(0),
  credit: z.coerce.number().nonnegative().default(0),
  branchId: z.coerce.number().int().positive().optional(),
});

export type CashBookFormState = { error: string | null };

export async function createCashBookEntryAction(
  _prevState: CashBookFormState,
  formData: FormData,
): Promise<CashBookFormState> {
  const user = await requireModule("bank_reconciliation", "create");

  const parsed = entrySchema.safeParse({
    entryDate: formData.get("entryDate"),
    details: formData.get("details"),
    refType: formData.get("refType") || undefined,
    debit: formData.get("debit"),
    credit: formData.get("credit"),
    branchId: formData.get("branchId") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  if (parsed.data.debit === 0 && parsed.data.credit === 0) {
    return { error: "Enter a debit or credit amount." };
  }

  const branchId = user.roleKey === "super_admin" ? parsed.data.branchId : (user.branchId ?? undefined);
  if (!branchId) {
    return { error: "A branch is required." };
  }

  const entry = await createCashBookEntry({
    branchId,
    entryDate: parsed.data.entryDate,
    details: parsed.data.details || undefined,
    refType: parsed.data.refType || undefined,
    debit: parsed.data.debit.toString(),
    credit: parsed.data.credit.toString(),
    recordedBy: user.userId,
  });

  await logAction({
    userId: user.userId,
    branchId,
    action: "cash_book.create",
    entityType: "cash_book_entries",
    entityId: entry.id,
    after: { entryDate: entry.entryDate, debit: entry.debit, credit: entry.credit },
  });

  revalidatePath("/bank-reconciliation/cash-book");
  return { error: null };
}
