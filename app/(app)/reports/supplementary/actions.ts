"use server";

import { revalidatePath } from "next/cache";
import { requireModule } from "@/lib/auth/session";
import { setSupplementaryOverride } from "@/lib/db/supplementary";
import { logAction } from "@/lib/db/audit";

export async function markNotSupplementaryAction(transactionId: number) {
  const user = await requireModule("transactions", "edit");
  const row = await setSupplementaryOverride(transactionId, true);
  if (row) {
    await logAction({
      userId: user.userId,
      branchId: row.branchId,
      action: "transaction.supplementary_override",
      entityType: "client_transactions",
      entityId: row.id,
      after: { supplementaryOverride: "not_supplementary" },
    });
  }
  revalidatePath("/reports/supplementary");
}
