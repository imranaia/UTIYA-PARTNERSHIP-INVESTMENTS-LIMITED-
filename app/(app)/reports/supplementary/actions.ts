"use server";

import { revalidatePath } from "next/cache";
import { requireModule, isAdmin } from "@/lib/auth/session";
import { setSupplementaryOverride, getTransactionBranchId } from "@/lib/db/supplementary";
import { submitForApproval } from "@/lib/db/pendingChanges";
import { logAction } from "@/lib/db/audit";

export async function markNotSupplementaryAction(transactionId: number): Promise<{ submitted: boolean }> {
  const user = await requireModule("transactions", "edit");

  if (!isAdmin(user.roleKey)) {
    const branchId = await getTransactionBranchId(transactionId);
    if (!branchId) return { submitted: false };
    await submitForApproval({
      entityType: "client_transaction",
      entityId: transactionId,
      branchId,
      proposedChanges: { supplementaryOverride: true },
      requestedBy: user.userId,
    });
    revalidatePath("/reports/supplementary");
    return { submitted: true };
  }

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
  return { submitted: false };
}
