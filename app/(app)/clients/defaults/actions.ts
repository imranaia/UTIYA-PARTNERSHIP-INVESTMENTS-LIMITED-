"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireModule } from "@/lib/auth/session";
import { createDefault, resolveDefault, RESOLUTION_TYPES, type ResolutionType } from "@/lib/db/clientDefaults";
import { filterClientIdsInBranch } from "@/lib/db/clients";
import { logAction } from "@/lib/db/audit";

const resolutionTypeKeys = RESOLUTION_TYPES.map((r) => r.key) as [string, ...string[]];

const defaultSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  defaultedAmount: z.coerce.number().positive(),
  defaultedAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
  branchId: z.coerce.number().int().positive().optional(),
});

export type DefaultFormState = { error: string | null };

export async function createDefaultAction(_prevState: DefaultFormState, formData: FormData): Promise<DefaultFormState> {
  const user = await requireModule("clients", "edit");

  const parsed = defaultSchema.safeParse({
    clientId: formData.get("clientId"),
    defaultedAmount: formData.get("defaultedAmount"),
    defaultedAt: formData.get("defaultedAt"),
    reason: formData.get("reason"),
    branchId: formData.get("branchId") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const branchId = user.roleKey === "super_admin" ? parsed.data.branchId : (user.branchId ?? undefined);
  if (!branchId) {
    return { error: "A branch is required." };
  }

  const allowed = await filterClientIdsInBranch([parsed.data.clientId], branchId);
  if (!allowed.has(parsed.data.clientId)) {
    return { error: "Client not found in this branch." };
  }

  const row = await createDefault({
    clientId: parsed.data.clientId,
    branchId,
    defaultedAmount: parsed.data.defaultedAmount.toString(),
    defaultedAt: parsed.data.defaultedAt,
    reason: parsed.data.reason || undefined,
    recordedBy: user.userId,
  });

  await logAction({
    userId: user.userId,
    branchId,
    action: "client_default.create",
    entityType: "client_defaults",
    entityId: row.id,
    after: { clientId: row.clientId, defaultedAmount: row.defaultedAmount },
  });

  revalidatePath("/clients/defaults");
  return { error: null };
}

export async function resolveDefaultAction(id: number, resolutionType: string) {
  const user = await requireModule("clients", "edit");
  if (!resolutionTypeKeys.includes(resolutionType)) return;
  const row = await resolveDefault(id, resolutionType as ResolutionType);
  if (row) {
    await logAction({
      userId: user.userId,
      branchId: row.branchId,
      action: "client_default.resolve",
      entityType: "client_defaults",
      entityId: row.id,
      after: { resolutionType },
    });
  }
  revalidatePath("/clients/defaults");
}
