import "server-only";
import { getDb } from "./client";
import { clients, clientTransactions } from "./schema";
import { eq, and, asc, desc, lt, gte, sql } from "drizzle-orm";
import type { DbTx } from "./client";
import { generatePaymentId } from "@/lib/services/paymentId";
import { startOfWeek, getISODay } from "date-fns";

export async function listDailyEntryRows(params: { branchId: number; collectorId?: number; date: string }) {
  const db = getDb();
  const conditions = [eq(clients.status, "active"), eq(clients.branchId, params.branchId)];
  if (params.collectorId) conditions.push(eq(clients.loanCollectorId, params.collectorId));

  const weekStart = startOfWeek(new Date(params.date + "T00:00:00Z"), { weekStartsOn: 1 }).toISOString().slice(0, 10);
  const selectedDay = getISODay(new Date(params.date + "T00:00:00Z"));

  const rows = await db
    .select({
      clientId: clients.id,
      clientCode: clients.clientCode,
      fullName: clients.fullName,
      groupName: clients.groupName,
      enrollmentDay: clients.enrollmentDay,
      paymentId: clientTransactions.paymentId,
      loanDisbursement: clientTransactions.loanDisbursement,
      loanRecovery: clientTransactions.loanRecovery,
      profitInterest: clientTransactions.profitInterest,
      serviceCharge: clientTransactions.serviceCharge,
      newSavings: clientTransactions.newSavings,
      savingsRecall: clientTransactions.savingsRecall,
      collateralTransferIn: clientTransactions.collateralTransferIn,
      collateralTransferOut: clientTransactions.collateralTransferOut,
      notes: clientTransactions.notes,
      supplementaryOverride: clientTransactions.supplementaryOverride,
      savingsBalanceBf: sql<string>`coalesce((
        select ct.savings_balance_cf from client_transactions ct
        where ct.client_id = ${clients.id} and ct.transaction_date < ${params.date}
        order by ct.transaction_date desc limit 1
      ), '0')`.as("savings_balance_bf"),
      // Most recent day this week (up to the selected date) the client actually
      // paid something in — used to tell "paid on time" from "paid early/late
      // (supplementary)" apart from "hasn't paid yet this week".
      lastPaymentThisWeek: sql<string | null>`(
        select ct.transaction_date::text from client_transactions ct
        where ct.client_id = ${clients.id}
          and ct.transaction_date >= ${weekStart} and ct.transaction_date <= ${params.date}
          and (ct.loan_recovery > 0 or ct.new_savings > 0 or ct.profit_interest > 0 or ct.service_charge > 0)
        order by ct.transaction_date desc limit 1
      )`,
    })
    .from(clients)
    .leftJoin(
      clientTransactions,
      and(eq(clientTransactions.clientId, clients.id), eq(clientTransactions.transactionDate, params.date)),
    )
    .where(and(...conditions))
    .orderBy(asc(clients.clientCode));

  return rows.map((r) => {
    let paymentStatus: "paid_on_day" | "paid_supplementary" | "due_today" | "overdue" | "not_due_yet";
    if (r.lastPaymentThisWeek) {
      const paidDay = getISODay(new Date(r.lastPaymentThisWeek + "T00:00:00Z"));
      paymentStatus = paidDay === r.enrollmentDay ? "paid_on_day" : "paid_supplementary";
    } else if (selectedDay === r.enrollmentDay) {
      paymentStatus = "due_today";
    } else if (selectedDay > r.enrollmentDay) {
      paymentStatus = "overdue";
    } else {
      paymentStatus = "not_due_yet";
    }
    return { ...r, paymentStatus };
  });
}

// Matches the source ledger's own C/F formula: B/F + New Savings - Savings
// Recall + Collateral Transfer In - Collateral Transfer Out.
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
      collateralTransferIn: clientTransactions.collateralTransferIn,
      collateralTransferOut: clientTransactions.collateralTransferOut,
    })
    .from(clientTransactions)
    .where(and(eq(clientTransactions.clientId, clientId), gte(clientTransactions.transactionDate, fromDate)))
    .orderBy(asc(clientTransactions.transactionDate));

  let bf = prior?.cf ?? "0";
  for (const row of rows) {
    const cf = (
      Number(bf) +
      Number(row.newSavings) -
      Number(row.savingsRecall) +
      Number(row.collateralTransferIn) -
      Number(row.collateralTransferOut)
    ).toFixed(2);
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
  supplementaryOverride?: boolean;
  recordedBy: number;
}) {
  const db = getDb();
  const supplementaryOverride = data.supplementaryOverride ? "not_supplementary" : null;
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: clientTransactions.id })
      .from(clientTransactions)
      .where(and(eq(clientTransactions.clientId, data.clientId), eq(clientTransactions.transactionDate, data.transactionDate)));

    const paymentId = existing ? undefined : await generatePaymentId(tx, data.branchId, new Date(data.transactionDate));

    await tx
      .insert(clientTransactions)
      .values({
        paymentId,
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
        supplementaryOverride,
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
          supplementaryOverride,
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
