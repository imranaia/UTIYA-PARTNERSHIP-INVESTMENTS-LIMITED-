import "server-only";
import { getDb } from "./client";
import { branches, clientSequences } from "./schema";
import { eq, asc } from "drizzle-orm";

export async function listBranches() {
  const db = getDb();
  return db.select().from(branches).orderBy(asc(branches.name));
}

export async function listActiveBranches() {
  const db = getDb();
  return db.select().from(branches).where(eq(branches.isActive, true)).orderBy(asc(branches.name));
}

export async function getBranch(id: number) {
  const db = getDb();
  const [row] = await db.select().from(branches).where(eq(branches.id, id));
  return row ?? null;
}

export async function branchCodeExists(code: string) {
  const db = getDb();
  const [row] = await db.select({ id: branches.id }).from(branches).where(eq(branches.code, code.toUpperCase()));
  return !!row;
}

export async function createBranch(data: { code: string; name: string; address?: string; phone?: string }) {
  const db = getDb();
  const [branch] = await db
    .insert(branches)
    .values({ code: data.code.toUpperCase(), name: data.name, address: data.address, phone: data.phone })
    .returning();
  await db.insert(clientSequences).values({ branchId: branch.id, lastSeq: 0 });
  return branch;
}

export async function updateBranch(
  id: number,
  data: Partial<{ name: string; address: string; phone: string; isActive: boolean }>,
) {
  const db = getDb();
  const [branch] = await db
    .update(branches)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(branches.id, id))
    .returning();
  return branch;
}
