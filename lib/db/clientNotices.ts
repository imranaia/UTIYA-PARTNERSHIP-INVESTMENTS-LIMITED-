import "server-only";
import { getDb } from "./client";
import { clientNotices } from "./schema";
import { eq, or, and, desc, isNull } from "drizzle-orm";

export async function createNotice(data: { clientId: number | null; branchId: number; message: string; createdBy: number }) {
  const db = getDb();
  const [row] = await db.insert(clientNotices).values(data).returning();
  return row;
}

export async function listNoticesForClient(clientId: number, limit = 5) {
  const db = getDb();
  return db.select().from(clientNotices).where(eq(clientNotices.clientId, clientId)).orderBy(desc(clientNotices.createdAt)).limit(limit);
}

// A client's portal feed: notices addressed to them directly, plus any
// branch-wide broadcast (clientId null) for their branch.
export async function listNoticesForPortal(clientId: number, branchId: number, limit = 10) {
  const db = getDb();
  return db
    .select()
    .from(clientNotices)
    .where(and(or(eq(clientNotices.clientId, clientId), and(isNull(clientNotices.clientId), eq(clientNotices.branchId, branchId)))))
    .orderBy(desc(clientNotices.createdAt))
    .limit(limit);
}
