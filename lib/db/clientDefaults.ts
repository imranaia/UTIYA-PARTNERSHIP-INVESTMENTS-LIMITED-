import "server-only";
import { getDb } from "./client";
import { clientDefaults, clients, users } from "./schema";
import { eq, and, desc, isNull } from "drizzle-orm";

export const RESOLUTION_TYPES = [
  { key: "repaid", label: "Repaid" },
  { key: "written_off", label: "Written Off" },
  { key: "deceased", label: "Deceased" },
] as const;
export type ResolutionType = (typeof RESOLUTION_TYPES)[number]["key"];

export async function listDefaults(params: { branchId: number | null }) {
  const db = getDb();
  return db
    .select({
      id: clientDefaults.id,
      clientId: clientDefaults.clientId,
      clientCode: clients.clientCode,
      clientName: clients.fullName,
      defaultedAmount: clientDefaults.defaultedAmount,
      defaultedAt: clientDefaults.defaultedAt,
      reason: clientDefaults.reason,
      resolvedAt: clientDefaults.resolvedAt,
      resolutionType: clientDefaults.resolutionType,
      recordedByName: users.fullName,
    })
    .from(clientDefaults)
    .innerJoin(clients, eq(clients.id, clientDefaults.clientId))
    .innerJoin(users, eq(users.id, clientDefaults.recordedBy))
    .where(params.branchId !== null ? eq(clientDefaults.branchId, params.branchId) : undefined)
    .orderBy(desc(clientDefaults.defaultedAt));
}

export async function createDefault(data: {
  clientId: number;
  branchId: number;
  defaultedAmount: string;
  defaultedAt: string;
  reason?: string;
  recordedBy: number;
}) {
  const db = getDb();
  const [row] = await db.insert(clientDefaults).values(data).returning();
  return row;
}

export async function resolveDefault(id: number, resolutionType: ResolutionType) {
  const db = getDb();
  const [row] = await db
    .update(clientDefaults)
    .set({ resolvedAt: new Date().toISOString().slice(0, 10), resolutionType })
    .where(and(eq(clientDefaults.id, id), isNull(clientDefaults.resolvedAt)))
    .returning();
  return row;
}

export async function getOpenDefaultCount(branchId: number | null) {
  const db = getDb();
  const rows = await db
    .select({ id: clientDefaults.id })
    .from(clientDefaults)
    .where(
      and(isNull(clientDefaults.resolvedAt), branchId !== null ? eq(clientDefaults.branchId, branchId) : undefined),
    );
  return rows.length;
}
