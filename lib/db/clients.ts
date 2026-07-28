import "server-only";
import { getDb } from "./client";
import { clients, branches, users, clientTransactions } from "./schema";
import { eq, and, desc, ilike, or, inArray } from "drizzle-orm";
import { generateClientCode } from "@/lib/services/clientCode";
import { getBranch } from "./branches";

export async function listClients(params: { branchId: number | null; search?: string }) {
  const db = getDb();
  const conditions = [];
  if (params.branchId !== null) conditions.push(eq(clients.branchId, params.branchId));
  if (params.search) {
    conditions.push(or(ilike(clients.fullName, `%${params.search}%`), ilike(clients.clientCode, `%${params.search}%`)));
  }

  return db
    .select({
      id: clients.id,
      clientCode: clients.clientCode,
      fullName: clients.fullName,
      phone: clients.phone,
      groupName: clients.groupName,
      status: clients.status,
      branchName: branches.name,
      loanCollectorName: users.fullName,
    })
    .from(clients)
    .innerJoin(branches, eq(branches.id, clients.branchId))
    .leftJoin(users, eq(users.id, clients.loanCollectorId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(clients.createdAt));
}

export async function getClientById(id: number) {
  const db = getDb();
  const [row] = await db
    .select({
      id: clients.id,
      clientCode: clients.clientCode,
      fullName: clients.fullName,
      phone: clients.phone,
      address: clients.address,
      groupName: clients.groupName,
      status: clients.status,
      branchId: clients.branchId,
      branchName: branches.name,
      enrollmentDate: clients.enrollmentDate,
      loanCollectorId: clients.loanCollectorId,
      loanCollectorName: users.fullName,
    })
    .from(clients)
    .innerJoin(branches, eq(branches.id, clients.branchId))
    .leftJoin(users, eq(users.id, clients.loanCollectorId))
    .where(eq(clients.id, id));
  return row ?? null;
}

export async function listActiveClientsForSelect(branchId: number) {
  const db = getDb();
  return db
    .select({ id: clients.id, clientCode: clients.clientCode, fullName: clients.fullName })
    .from(clients)
    .where(and(eq(clients.branchId, branchId), eq(clients.status, "active")))
    .orderBy(clients.clientCode);
}

export async function filterClientIdsInBranch(clientIds: number[], branchId: number) {
  if (clientIds.length === 0) return new Set<number>();
  const db = getDb();
  const rows = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(inArray(clients.id, clientIds), eq(clients.branchId, branchId)));
  return new Set(rows.map((r) => r.id));
}

export async function listClientTransactions(clientId: number) {
  const db = getDb();
  return db
    .select()
    .from(clientTransactions)
    .where(eq(clientTransactions.clientId, clientId))
    .orderBy(desc(clientTransactions.transactionDate));
}

export async function createClient(data: {
  branchId: number;
  fullName: string;
  phone?: string;
  address?: string;
  groupName?: string;
  enrollmentDate: Date;
  loanCollectorId?: number;
  openingSavings?: string;
  createdByUserId: number;
}) {
  const db = getDb();
  const branch = await getBranch(data.branchId);
  if (!branch) throw new Error("Branch not found.");

  return db.transaction(async (tx) => {
    const { code, enrollmentWeek, enrollmentDay } = await generateClientCode(tx, branch.code, branch.id, data.enrollmentDate);

    const [client] = await tx
      .insert(clients)
      .values({
        clientCode: code,
        branchId: data.branchId,
        fullName: data.fullName,
        phone: data.phone,
        address: data.address,
        groupName: data.groupName,
        enrollmentWeek,
        enrollmentDay,
        enrollmentDate: data.enrollmentDate.toISOString().slice(0, 10),
        loanCollectorId: data.loanCollectorId,
      })
      .returning();

    if (data.openingSavings && Number(data.openingSavings) > 0) {
      await tx.insert(clientTransactions).values({
        clientId: client.id,
        branchId: data.branchId,
        transactionDate: data.enrollmentDate.toISOString().slice(0, 10),
        savingsBalanceBf: "0",
        newSavings: data.openingSavings,
        savingsBalanceCf: data.openingSavings,
        recordedBy: data.createdByUserId,
        notes: "Opening balance",
      });
    }

    return client;
  });
}
