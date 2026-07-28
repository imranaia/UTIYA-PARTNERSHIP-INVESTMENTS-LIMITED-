"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireModule } from "@/lib/auth/session";
import { createLedgerEntry, LEDGER_SECTIONS } from "@/lib/db/ledger";
import { logAction } from "@/lib/db/audit";

const sectionKeys = LEDGER_SECTIONS.map((s) => s.key) as [string, ...string[]];

const entrySchema = z.object({
  section: z.enum(sectionKeys),
  label: z.string().trim().min(1).max(120),
  entryDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
  amount: z.coerce.number().positive(),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
  branchId: z.coerce.number().int().positive().optional(),
});

export type LedgerFormState = { error: string | null };

export async function createLedgerEntryAction(_prevState: LedgerFormState, formData: FormData): Promise<LedgerFormState> {
  const user = await requireModule("ledger", "create");

  const parsed = entrySchema.safeParse({
    section: formData.get("section"),
    label: formData.get("label"),
    entryDate: formData.get("entryDate"),
    amount: formData.get("amount"),
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

  const entry = await createLedgerEntry({
    branchId,
    section: parsed.data.section as (typeof LEDGER_SECTIONS)[number]["key"],
    label: parsed.data.label,
    entryDate: parsed.data.entryDate,
    amount: parsed.data.amount.toString(),
    notes: parsed.data.notes || undefined,
    recordedBy: user.userId,
  });

  await logAction({
    userId: user.userId,
    branchId,
    action: "ledger.create",
    entityType: "ledger_entries",
    entityId: entry.id,
    after: { section: entry.section, label: entry.label, amount: entry.amount },
  });

  revalidatePath("/ledger");
  revalidatePath("/reports/week-summary");
  return { error: null };
}
