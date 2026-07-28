import "server-only";
import { getDb } from "./client";
import { users, roles, branches } from "./schema";
import { eq, sql, and, inArray } from "drizzle-orm";
import { hashPassword, generateTempPassword } from "@/lib/auth/password";

export async function getUserByUsername(username: string) {
  const db = getDb();
  const [row] = await db
    .select({
      id: users.id,
      username: users.username,
      passwordHash: users.passwordHash,
      fullName: users.fullName,
      isActive: users.isActive,
      mustChangePassword: users.mustChangePassword,
      tokenVersion: users.tokenVersion,
      failedLoginAttempts: users.failedLoginAttempts,
      lockedUntil: users.lockedUntil,
      roleId: users.roleId,
      roleKey: roles.key,
      branchId: users.branchId,
    })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .where(eq(users.username, username.toLowerCase()));
  return row ?? null;
}

export async function recordLoginSuccess(userId: number) {
  const db = getDb();
  await db
    .update(users)
    .set({ failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function recordLoginFailure(userId: number, currentAttempts: number) {
  const db = getDb();
  const attempts = currentAttempts + 1;
  const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
  await db
    .update(users)
    .set({ failedLoginAttempts: attempts, lockedUntil, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function getUserProfile(userId: number) {
  const db = getDb();
  const [row] = await db
    .select({
      fullName: users.fullName,
      roleName: roles.name,
      roleKey: roles.key,
      branchName: branches.name,
    })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .leftJoin(branches, eq(branches.id, users.branchId))
    .where(eq(users.id, userId));
  return row ?? null;
}

export async function listActiveUsersForBranch(branchId: number) {
  const db = getDb();
  return db
    .select({ id: users.id, fullName: users.fullName })
    .from(users)
    .where(and(eq(users.branchId, branchId), eq(users.isActive, true)));
}

export async function listLoanCollectorsForBranch(branchId: number) {
  const db = getDb();
  return db
    .select({ id: users.id, fullName: users.fullName })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .where(and(eq(users.branchId, branchId), eq(roles.key, "loan_collector"), eq(users.isActive, true)));
}

// Grouped by branch so a single query can back a client-side branch select
// (e.g. super admin picking a branch on the "Add client" form) without a
// server round-trip per selection.
export async function listLoanCollectorsByBranch(branchIds: number[]) {
  if (branchIds.length === 0) return new Map<number, { id: number; fullName: string }[]>();
  const db = getDb();
  const rows = await db
    .select({ id: users.id, fullName: users.fullName, branchId: users.branchId })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .where(and(inArray(users.branchId, branchIds), eq(roles.key, "loan_collector"), eq(users.isActive, true)));

  const map = new Map<number, { id: number; fullName: string }[]>();
  for (const row of rows) {
    if (row.branchId === null) continue;
    const list = map.get(row.branchId) ?? [];
    list.push({ id: row.id, fullName: row.fullName });
    map.set(row.branchId, list);
  }
  return map;
}

export async function listUsersForBranch(branchId: number | null) {
  const db = getDb();
  const query = db
    .select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      phone: users.phone,
      isActive: users.isActive,
      roleName: roles.name,
      roleKey: roles.key,
      branchName: branches.name,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.roleId))
    .leftJoin(branches, eq(branches.id, users.branchId));

  if (branchId === null) return query;
  return query.where(eq(users.branchId, branchId));
}

export async function createUser(data: {
  username: string;
  fullName: string;
  phone?: string;
  roleId: number;
  branchId: number | null;
  createdBy: number;
}) {
  const db = getDb();
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  const [user] = await db
    .insert(users)
    .values({
      username: data.username.toLowerCase(),
      passwordHash,
      fullName: data.fullName,
      phone: data.phone,
      roleId: data.roleId,
      branchId: data.branchId,
      createdBy: data.createdBy,
      mustChangePassword: true,
    })
    .returning();
  return { user, tempPassword };
}

export async function resetUserPassword(userId: number) {
  const db = getDb();
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  const [user] = await db
    .update(users)
    .set({
      passwordHash,
      mustChangePassword: true,
      tokenVersion: sql`${users.tokenVersion} + 1`,
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();
  return { user, tempPassword };
}

export async function setUserActive(userId: number, isActive: boolean) {
  const db = getDb();
  const [user] = await db
    .update(users)
    .set({ isActive, tokenVersion: sql`${users.tokenVersion} + 1`, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return user;
}

export async function usernameExists(username: string) {
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.username, username.toLowerCase()));
  return (row?.count ?? 0) > 0;
}
