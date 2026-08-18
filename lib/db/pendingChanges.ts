import "server-only";
import { getDb } from "./client";
import { pendingChanges, clients, clientTransactions, users } from "./schema";
import { eq, and, or, desc } from "drizzle-orm";

export type PendingEntityType = "client" | "client_transaction";

export async function submitForApproval(params: {
  entityType: PendingEntityType;
  entityId: number;
  branchId: number;
  proposedChanges: Record<string, unknown>;
  requestedBy: number;
}) {
  const db = getDb();
  const [row] = await db
    .insert(pendingChanges)
    .values({
      entityType: params.entityType,
      entityId: params.entityId,
      branchId: params.branchId,
      proposedChanges: params.proposedChanges,
      requestedBy: params.requestedBy,
    })
    .returning();
  return row;
}

export async function listPendingChanges(branchId: number | null) {
  const db = getDb();
  const requester = users;
  return db
    .select({
      id: pendingChanges.id,
      entityType: pendingChanges.entityType,
      entityId: pendingChanges.entityId,
      branchId: pendingChanges.branchId,
      proposedChanges: pendingChanges.proposedChanges,
      requestedAt: pendingChanges.requestedAt,
      requestedByName: requester.fullName,
      clientCode: clients.clientCode,
      clientFullName: clients.fullName,
    })
    .from(pendingChanges)
    .innerJoin(requester, eq(requester.id, pendingChanges.requestedBy))
    .leftJoin(
      clientTransactions,
      and(eq(pendingChanges.entityType, "client_transaction"), eq(clientTransactions.id, pendingChanges.entityId)),
    )
    .leftJoin(
      clients,
      or(
        and(eq(pendingChanges.entityType, "client"), eq(clients.id, pendingChanges.entityId)),
        and(eq(pendingChanges.entityType, "client_transaction"), eq(clients.id, clientTransactions.clientId)),
      ),
    )
    .where(
      branchId !== null
        ? and(eq(pendingChanges.status, "pending"), eq(pendingChanges.branchId, branchId))
        : eq(pendingChanges.status, "pending"),
    )
    .orderBy(desc(pendingChanges.requestedAt));
}

export async function getPendingChangeById(id: number) {
  const db = getDb();
  const [row] = await db.select().from(pendingChanges).where(eq(pendingChanges.id, id));
  return row ?? null;
}

// For rendering a before/after diff on the approvals page. entityId for a
// 'client_transaction' pending change is the client_transactions row's own
// primary key (known at submission time, since a non-admin edit can only
// target a row that already exists).
export async function getCurrentClientTransactionRow(id: number) {
  const db = getDb();
  const [row] = await db.select().from(clientTransactions).where(eq(clientTransactions.id, id));
  return row ?? null;
}

export async function markApproved(id: number, reviewedBy: number) {
  const db = getDb();
  await db
    .update(pendingChanges)
    .set({ status: "approved", reviewedBy, reviewedAt: new Date() })
    .where(eq(pendingChanges.id, id));
}

export async function markRejected(id: number, reviewedBy: number, reviewNote?: string) {
  const db = getDb();
  await db
    .update(pendingChanges)
    .set({ status: "rejected", reviewedBy, reviewedAt: new Date(), reviewNote })
    .where(eq(pendingChanges.id, id));
}
