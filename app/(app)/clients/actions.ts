"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireModule } from "@/lib/auth/session";
import { createClient, setClientStatus, CLIENT_STATUSES, type ClientStatus } from "@/lib/db/clients";
import { InvalidEnrollmentDateError } from "@/lib/services/clientCode";
import { logAction } from "@/lib/db/audit";

const clientSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  groupName: z.string().trim().max(80).optional().or(z.literal("")),
  enrollmentDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
  branchId: z.coerce.number().int().positive().optional(),
  loanCollectorId: z.coerce.number().int().positive().optional(),
  openingSavings: z.coerce.number().nonnegative().optional(),
});

export type ClientFormState = { error: string | null };

export async function createClientAction(_prevState: ClientFormState, formData: FormData): Promise<ClientFormState> {
  const user = await requireModule("clients", "create");

  const parsed = clientSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    groupName: formData.get("groupName"),
    enrollmentDate: formData.get("enrollmentDate"),
    branchId: formData.get("branchId") || undefined,
    loanCollectorId: formData.get("loanCollectorId") || undefined,
    openingSavings: formData.get("openingSavings") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const branchId = user.roleKey === "super_admin" ? parsed.data.branchId : user.branchId ?? undefined;
  if (!branchId) {
    return { error: "A branch is required." };
  }

  let client;
  try {
    client = await createClient({
      branchId,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone || undefined,
      address: parsed.data.address || undefined,
      groupName: parsed.data.groupName || undefined,
      enrollmentDate: new Date(parsed.data.enrollmentDate),
      loanCollectorId: parsed.data.loanCollectorId,
      openingSavings: parsed.data.openingSavings?.toString(),
      createdByUserId: user.userId,
    });
  } catch (err) {
    if (err instanceof InvalidEnrollmentDateError) {
      return { error: err.message };
    }
    throw err;
  }

  await logAction({
    userId: user.userId,
    branchId,
    action: "client.create",
    entityType: "client",
    entityId: client.id,
    after: { clientCode: client.clientCode, fullName: client.fullName },
  });

  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}

export async function setClientStatusAction(clientId: number, status: string) {
  const user = await requireModule("clients", "edit");
  if (!CLIENT_STATUSES.includes(status as ClientStatus)) return;

  const client = await setClientStatus(clientId, status as ClientStatus);
  if (client) {
    await logAction({
      userId: user.userId,
      branchId: client.branchId,
      action: "client.set_status",
      entityType: "client",
      entityId: client.id,
      after: { status },
    });
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/reports/dormant-clients");
}
