"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireModule } from "@/lib/auth/session";
import { createRole, roleKeyExists, getRole, listModules, setRolePermission } from "@/lib/db/roles";
import { logAction } from "@/lib/db/audit";

const roleSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export type RoleFormState = { error: string | null };

export async function createRoleAction(_prevState: RoleFormState, formData: FormData): Promise<RoleFormState> {
  const user = await requireModule("roles", "create");

  const parsed = roleSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const key = slugify(parsed.data.name);
  if (!key) {
    return { error: "Role name must contain letters or numbers." };
  }
  if (await roleKeyExists(key)) {
    return { error: `A role with a similar name already exists.` };
  }

  const role = await createRole({ key, name: parsed.data.name });
  await logAction({ userId: user.userId, action: "role.create", entityType: "role", entityId: role.id, after: role });

  revalidatePath("/admin/roles");
  return { error: null };
}

export async function updateRolePermissionsAction(roleId: number, formData: FormData) {
  const user = await requireModule("roles", "edit");

  const role = await getRole(roleId);
  if (!role) throw new Error("Role not found.");
  if (role.key === "super_admin") throw new Error("The Super Admin role's permissions cannot be changed.");

  const modules = await listModules();
  for (const mod of modules) {
    await setRolePermission(roleId, mod.id, {
      canView: formData.get(`view_${mod.id}`) === "on",
      canCreate: formData.get(`create_${mod.id}`) === "on",
      canEdit: formData.get(`edit_${mod.id}`) === "on",
      canDelete: formData.get(`delete_${mod.id}`) === "on",
    });
  }

  await logAction({ userId: user.userId, action: "role.update_permissions", entityType: "role", entityId: roleId });
  revalidatePath(`/admin/roles/${roleId}`);
}
