import "server-only";
import { getDb } from "./client";
import { clients, clientTransactions } from "./schema";
import { eq, and, asc, desc, lt, gte, sql } from "drizzle-orm";
import type { DbTx } from "./client";

export async function listDailyEntryRows(params: { branchId: number; collectorId?: number; date: string }) {
  const db = getDb();
  const conditions = [eq(clients.status, "active"), eq(clients.branchId, params.branchId)];
  if (params.collectorId) conditions.push(eq(clients.loanCollectorId, params.collectorId));

  return db
    .select({
      clientId: clients.id,
      clientCode: clients.clientCode,
      fullName: clients.fullName,
      groupName: clients.groupName,
      loanDisbursement: clientTransactions.loanDisbursement,
      loanRecovery: clientTransactions.loanRecovery,
      profitInterest: clientTransactions.profitInterest,
      serviceCharge: clientTransactions.serviceCharge,
      newSavings: clientTransactions.newSavings,
      savingsRecall: clientTransactions.savingsRecall,
      collateralTransferIn: clientTransactions.collateralTransferIn,
      collateralTransferOut: clientTransactions.collateralTransferOut,
      notes: clientTransactions.notes,
      savingsBalanceBf: sql<string>`coalesce((
        select ct.savings_balance_cf from client_transactions ct
        where ct.client_id = ${clients.id} and ct.transaction_date < ${params.date}
        order by ct.transaction_date desc limit 1
      ), '0')`.as("savings_balance_bf"),
    })
    .from(clients)
    .leftJoin(
      clientTransactions,
      and(eq(clientTransactions.clientId, clients.id), eq(clientTransactions.transactionDate, params.date)),
    )
    .where(and(...conditions))
    .orderBy(asc(clients.clientCode));
}

async function recomputeSavingsForward(tx: DbTx, clientId: number, fromDate: string) {
  const [prior] = await tx
    .select({ cf: clientTransactions.savingsBalanceCf })
    .from(clientTransactions)
    .where(and(eq(clientTransactions.clientId, clientId), lt(clientTransactions.transactionDate, fromDate)))
    .orderBy(desc(clientTransactions.transactionDate))
    .limit(1);

  const rows = await tx
    .select({
      id: clientTransactions.id,
      newSavings: clientTransactions.newSavings,
      savingsRecall: clientTransactions.savingsRecall,
    })
    .from(clientTransactions)
    .where(and(eq(clientTransactions.clientId, clientId), gte(clientTransactions.transactionDate, fromDate)))
    .orderBy(asc(clientTransactions.transactionDate));

  let bf = prior?.cf ?? "0";
  for (const row of rows) {
    const cf = (Number(bf) + Number(row.newSavings) - Number(row.savingsRecall)).toFixed(2);
    await tx
      .update(clientTransactions)
      .set({ savingsBalanceBf: bf, savingsBalanceCf: cf, updatedAt: new Date() })
      .where(eq(clientTransactions.id, row.id));
    bf = cf;
  }
}

export async function saveTransactionRow(data: {
  clientId: number;
  branchId: number;
  transactionDate: string;
  loanDisbursement: string;
  loanRecovery: string;
  profitInterest: string;
  serviceCharge: string;
  newSavings: string;
  savingsRecall: string;
  collateralTransferIn: string;
  collateralTransferOut: string;
  notes?: string;
  recordedBy: number;
}) {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx
      .insert(clientTransactions)
      .values({
        clientId: data.clientId,
        branchId: data.branchId,
        transactionDate: data.transactionDate,
        loanDisbursement: data.loanDisbursement,
        loanRecovery: data.loanRecovery,
        profitInterest: data.profitInterest,
        serviceCharge: data.serviceCharge,
        newSavings: data.newSavings,
        savingsRecall: data.savingsRecall,
        collateralTransferIn: data.collateralTransferIn,
        collateralTransferOut: data.collateralTransferOut,
        savingsBalanceBf: "0",
        savingsBalanceCf: "0",
        notes: data.notes,
        recordedBy: data.recordedBy,
      })
      .onConflictDoUpdate({
        target: [clientTransactions.clientId, clientTransactions.transactionDate],
        set: {
          loanDisbursement: data.loanDisbursement,
          loanRecovery: data.loanRecovery,
          profitInterest: data.profitInterest,
          serviceCharge: data.serviceCharge,
          newSavings: data.newSavings,
          savingsRecall: data.savingsRecall,
          collateralTransferIn: data.collateralTransferIn,
          collateralTransferOut: data.collateralTransferOut,
          notes: data.notes,
          recordedBy: data.recordedBy,
          updatedAt: new Date(),
        },
      });

    await recomputeSavingsForward(tx, data.clientId, data.transactionDate);
  });
}

export function isEmptyRow(d: {
  loanDisbursement: number;
  loanRecovery: number;
  profitInterest: number;
  serviceCharge: number;
  newSavings: number;
  savingsRecall: number;
  collateralTransferIn: number;
  collateralTransferOut: number;
  notes?: string;
}) {
  return (
    d.loanDisbursement === 0 &&
    d.loanRecovery === 0 &&
    d.profitInterest === 0 &&
    d.serviceCharge === 0 &&
    d.newSavings === 0 &&
    d.savingsRecall === 0 &&
    d.collateralTransferIn === 0 &&
    d.collateralTransferOut === 0 &&
    !d.notes
  );
}
