"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireModule } from "@/lib/auth/session";
import { createBranch, updateBranch, branchCodeExists } from "@/lib/db/branches";
import { logAction } from "@/lib/db/audit";

const branchSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(10)
    .regex(/^[A-Za-z]+$/, "Letters only"),
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});

export type BranchFormState = { error: string | null };

export async function createBranchAction(_prevState: BranchFormState, formData: FormData): Promise<BranchFormState> {
  const user = await requireModule("branches", "create");

  const parsed = branchSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    address: formData.get("address"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  if (await branchCodeExists(parsed.data.code)) {
    return { error: `Branch code "${parsed.data.code.toUpperCase()}" is already in use.` };
  }

  const branch = await createBranch(parsed.data);
  await logAction({ userId: user.userId, action: "branch.create", entityType: "branch", entityId: branch.id, after: branch });

  revalidatePath("/admin/branches");
  return { error: null };
}

const updateBranchSchema = z.object({
  branchId: z.coerce.number().int().positive(),
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});

export async function updateBranchAction(_prevState: BranchFormState, formData: FormData): Promise<BranchFormState> {
  const user = await requireModule("branches", "edit");

  const parsed = updateBranchSchema.safeParse({
    branchId: formData.get("branchId"),
    name: formData.get("name"),
    address: formData.get("address"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const branch = await updateBranch(parsed.data.branchId, {
    name: parsed.data.name,
    address: parsed.data.address || undefined,
    phone: parsed.data.phone || undefined,
  });
  if (!branch) {
    return { error: "Branch not found." };
  }

  await logAction({ userId: user.userId, action: "branch.update", entityType: "branch", entityId: branch.id, after: { name: branch.name } });

  revalidatePath("/admin/branches");
  return { error: null };
}

export async function toggleBranchActiveAction(branchId: number, isActive: boolean) {
  const user = await requireModule("branches", "edit");
  const branch = await updateBranch(branchId, { isActive });
  await logAction({ userId: user.userId, action: "branch.toggle_active", entityType: "branch", entityId: branchId, after: { isActive } });
  revalidatePath("/admin/branches");
  return branch;
}
