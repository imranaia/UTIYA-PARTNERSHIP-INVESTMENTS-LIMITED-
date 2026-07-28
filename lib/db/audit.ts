import "server-only";
import { getDb } from "./client";
import { auditLog } from "./schema";

export async function logAction(entry: {
  userId?: number | null;
  branchId?: number | null;
  action: string;
  entityType?: string;
  entityId?: number;
  before?: unknown;
  after?: unknown;
}) {
  const db = getDb();
  await db.insert(auditLog).values({
    userId: entry.userId ?? null,
    branchId: entry.branchId ?? null,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    before: entry.before as object | undefined,
    after: entry.after as object | undefined,
  });
}
