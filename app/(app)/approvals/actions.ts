"use server";

import { revalidatePath } from "next/cache";
import { requireModule } from "@/lib/auth/session";
import { getPendingChangeById, markApproved, markRejected } from "@/lib/db/pendingChanges";
import { updateClient } from "@/lib/db/clients";
import { applyClientTransactionPatch } from "@/lib/db/transactions";
import { logAction } from "@/lib/db/audit";

export async function approveChangeAction(id: number): Promise<{ error: string | null }> {
  const user = await requireModule("approvals", "edit");

  const change = await getPendingChangeById(id);
  if (!change || change.status !== "pending") {
    return { error: "This change is no longer pending." };
  }

  const patch = change.proposedChanges as Record<string, unknown>;
  if (change.entityType === "client") {
    await updateClient(change.entityId, patch as Parameters<typeof updateClient>[1]);
  } else {
    await applyClientTransactionPatch(change.entityId, patch);
  }

  await markApproved(change.id, user.userId);
  await logAction({
    userId: user.userId,
    branchId: change.branchId,
    action: "pending_change.approve",
    entityType: change.entityType,
    entityId: change.entityId,
    after: patch,
  });

  revalidatePath("/approvals");
  revalidatePath("/clients");
  revalidatePath("/transactions");
  return { error: null };
}

export async function rejectChangeAction(id: number, note?: string): Promise<{ error: string | null }> {
  const user = await requireModule("approvals", "edit");

  const change = await getPendingChangeById(id);
  if (!change || change.status !== "pending") {
    return { error: "This change is no longer pending." };
  }

  await markRejected(change.id, user.userId, note);
  await logAction({
    userId: user.userId,
    branchId: change.branchId,
    action: "pending_change.reject",
    entityType: change.entityType,
    entityId: change.entityId,
  });

  revalidatePath("/approvals");
  return { error: null };
}
