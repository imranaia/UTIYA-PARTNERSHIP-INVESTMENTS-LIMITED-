import "server-only";
import { getDb } from "./client";
import { clients, clientTransactions, branches, users } from "./schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export const REPORT_METRICS = [
  { key: "loanDisbursement", label: "Loan Disbursement" },
  { key: "loanRecovery", label: "Loan Recovery" },
  { key: "profitInterest", label: "Profit / Interest" },
  { key: "serviceCharge", label: "Service Charge" },
  { key: "newSavings", label: "New Savings" },
  { key: "savingsRecall", label: "Savings Recall" },
  { key: "collateralTransferIn", label: "Collateral In" },
  { key: "collateralTransferOut", label: "Collateral Out" },
] as const;
export type MetricKey = (typeof REPORT_METRICS)[number]["key"];

export const GROUP_BY_OPTIONS = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "collector", label: "Collector" },
  { key: "group", label: "Client Group" },
  { key: "client", label: "Client" },
] as const;
export type GroupByKey = (typeof GROUP_BY_OPTIONS)[number]["key"];

const collector = alias(users, "collector");

export async function runCustomReport(params: {
  branchId: number | null;
  from: string;
  to: string;
  groupBy: GroupByKey;
  collectorId?: number;
}) {
  const db = getDb();
  const conditions = [
    gte(clientTransactions.transactionDate, params.from),
    lte(clientTransactions.transactionDate, params.to),
  ];
  if (params.branchId !== null) conditions.push(eq(clientTransactions.branchId, params.branchId));
  if (params.collectorId) conditions.push(eq(clients.loanCollectorId, params.collectorId));

  const groupExpr = {
    day: sql`${clientTransactions.transactionDate}::text`,
    week: sql`to_char(date_trunc('week', ${clientTransactions.transactionDate}), 'YYYY-MM-DD')`,
    collector: sql`coalesce(${collector.fullName}, 'Unassigned')`,
    group: sql`coalesce(${clients.groupName}, 'No group')`,
    client: sql`${clients.fullName} || ' (' || ${clients.clientCode} || ')'`,
  }[params.groupBy];

  const rows = await db
    .select({
      groupLabel: sql<string>`${groupExpr}`.as("group_label"),
      loanDisbursement: sql<string>`coalesce(sum(${clientTransactions.loanDisbursement}), 0)`,
      loanRecovery: sql<string>`coalesce(sum(${clientTransactions.loanRecovery}), 0)`,
      profitInterest: sql<string>`coalesce(sum(${clientTransactions.profitInterest}), 0)`,
      serviceCharge: sql<string>`coalesce(sum(${clientTransactions.serviceCharge}), 0)`,
      newSavings: sql<string>`coalesce(sum(${clientTransactions.newSavings}), 0)`,
      savingsRecall: sql<string>`coalesce(sum(${clientTransactions.savingsRecall}), 0)`,
      collateralTransferIn: sql<string>`coalesce(sum(${clientTransactions.collateralTransferIn}), 0)`,
      collateralTransferOut: sql<string>`coalesce(sum(${clientTransactions.collateralTransferOut}), 0)`,
      rowCount: sql<number>`count(*)::int`,
    })
    .from(clientTransactions)
    .innerJoin(clients, eq(clients.id, clientTransactions.clientId))
    .innerJoin(branches, eq(branches.id, clientTransactions.branchId))
    .leftJoin(collector, eq(collector.id, clients.loanCollectorId))
    .where(and(...conditions))
    .groupBy(groupExpr)
    .orderBy(groupExpr);

  return rows;
}
