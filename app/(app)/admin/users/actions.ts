"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireModule } from "@/lib/auth/session";
import { createUser, resetUserPassword, setUserActive, usernameExists } from "@/lib/db/users";
import { getRole } from "@/lib/db/roles";
import { logAction } from "@/lib/db/audit";

const BRANCH_ADMIN_ASSIGNABLE_ROLE_KEYS = ["loan_collector", "expense_officer", "viewer"];

const userSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9._-]+$/, "Letters, numbers, dots, dashes, underscores only"),
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  roleId: z.coerce.number().int().positive(),
  branchId: z.coerce.number().int().positive().optional(),
});

export type UserFormState = { error: string | null; tempPassword?: string };

export async function createUserAction(_prevState: UserFormState, formData: FormData): Promise<UserFormState> {
  const sessionUser = await requireModule("users", "create");

  const parsed = userSchema.safeParse({
    username: formData.get("username"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    roleId: formData.get("roleId"),
    branchId: formData.get("branchId") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const role = await getRole(parsed.data.roleId);
  if (!role) {
    return { error: "Role not found." };
  }

  let branchId: number | null = parsed.data.branchId ?? null;

  if (sessionUser.roleKey !== "super_admin") {
    // Branch Admins (and anyone else with `users.create`) may only add
    // limited-scope staff to their own branch — not other admins.
    if (!BRANCH_ADMIN_ASSIGNABLE_ROLE_KEYS.includes(role.key)) {
      return { error: "You are not allowed to assign that role." };
    }
    branchId = sessionUser.branchId;
  }

  if (role.key !== "super_admin" && !branchId) {
    return { error: "A branch is required for this role." };
  }

  if (await usernameExists(parsed.data.username)) {
    return { error: `Username "${parsed.data.username}" is already taken.` };
  }

  const { user, tempPassword } = await createUser({
    username: parsed.data.username,
    fullName: parsed.data.fullName,
    phone: parsed.data.phone || undefined,
    roleId: role.id,
    branchId: role.key === "super_admin" ? null : branchId,
    createdBy: sessionUser.userId,
  });

  await logAction({
    userId: sessionUser.userId,
    branchId: sessionUser.branchId,
    action: "user.create",
    entityType: "user",
    entityId: user.id,
    after: { username: user.username, roleId: user.roleId, branchId: user.branchId },
  });

  revalidatePath("/admin/users");
  return { error: null, tempPassword };
}

export async function resetPasswordAction(userId: number): Promise<UserFormState> {
  const sessionUser = await requireModule("users", "edit");
  const { user, tempPassword } = await resetUserPassword(userId);
  await logAction({
    userId: sessionUser.userId,
    branchId: sessionUser.branchId,
    action: "user.reset_password",
    entityType: "user",
    entityId: user.id,
  });
  revalidatePath("/admin/users");
  return { error: null, tempPassword };
}

export async function toggleUserActiveAction(userId: number, isActive: boolean) {
  const sessionUser = await requireModule("users", "edit");
  const user = await setUserActive(userId, isActive);
  await logAction({
    userId: sessionUser.userId,
    branchId: sessionUser.branchId,
    action: "user.toggle_active",
    entityType: "user",
    entityId: userId,
    after: { isActive },
  });
  revalidatePath("/admin/users");
  return user;
}
