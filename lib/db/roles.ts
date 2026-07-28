import "server-only";
import { getDb } from "./client";
import { roles, modules, rolePermissions } from "./schema";
import { eq, asc } from "drizzle-orm";

export async function listRoles() {
  const db = getDb();
  return db.select().from(roles).orderBy(asc(roles.name));
}

export async function getRole(id: number) {
  const db = getDb();
  const [row] = await db.select().from(roles).where(eq(roles.id, id));
  return row ?? null;
}

export async function listModules() {
  const db = getDb();
  return db.select().from(modules).orderBy(asc(modules.sortOrder));
}

export async function getRolePermissionMatrix(roleId: number) {
  const db = getDb();
  const allModules = await listModules();
  const perms = await db.select().from(rolePermissions).where(eq(rolePermissions.roleId, roleId));
  const permByModule = new Map(perms.map((p) => [p.moduleId, p]));

  return allModules.map((mod) => {
    const perm = permByModule.get(mod.id);
    return {
      moduleId: mod.id,
      moduleKey: mod.key,
      moduleLabel: mod.label,
      canView: perm?.canView ?? false,
      canCreate: perm?.canCreate ?? false,
      canEdit: perm?.canEdit ?? false,
      canDelete: perm?.canDelete ?? false,
    };
  });
}

export async function createRole(data: { key: string; name: string }) {
  const db = getDb();
  const [role] = await db.insert(roles).values({ key: data.key, name: data.name, isSystem: false }).returning();
  return role;
}

export async function roleKeyExists(key: string) {
  const db = getDb();
  const [row] = await db.select({ id: roles.id }).from(roles).where(eq(roles.key, key));
  return !!row;
}

export async function setRolePermission(
  roleId: number,
  moduleId: number,
  perm: { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean },
) {
  const db = getDb();
  await db
    .insert(rolePermissions)
    .values({ roleId, moduleId, ...perm })
    .onConflictDoUpdate({ target: [rolePermissions.roleId, rolePermissions.moduleId], set: perm });
}
