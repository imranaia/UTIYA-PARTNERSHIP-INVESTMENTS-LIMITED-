"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getSession, requireUser } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { logAction } from "@/lib/db/audit";

export type ChangePasswordState = { error: string | null };

export async function changePassword(_prevState: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  const sessionUser = await requireUser();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "New password and confirmation do not match." };
  }

  const db = getDb();
  const [dbUser] = await db.select().from(users).where(eq(users.id, sessionUser.userId));
  if (!dbUser) {
    return { error: "User not found." };
  }

  const valid = await verifyPassword(currentPassword, dbUser.passwordHash);
  if (!valid) {
    return { error: "Current password is incorrect." };
  }

  const newHash = await hashPassword(newPassword);
  const newTokenVersion = dbUser.tokenVersion + 1;

  await db
    .update(users)
    .set({
      passwordHash: newHash,
      mustChangePassword: false,
      tokenVersion: newTokenVersion,
      updatedAt: new Date(),
    })
    .where(eq(users.id, dbUser.id));

  await logAction({ userId: dbUser.id, branchId: dbUser.branchId, action: "user.change_password", entityType: "user", entityId: dbUser.id });

  // Re-seal the session with the bumped token_version so this session stays valid.
  const session = await getSession();
  session.user = { ...sessionUser, tokenVersion: newTokenVersion };
  await session.save();

  redirect(sessionUser.roleKey === "client" ? "/portal" : "/dashboard");
}
