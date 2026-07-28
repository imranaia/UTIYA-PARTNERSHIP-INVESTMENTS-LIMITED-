import "server-only";
import { getDb } from "./client";
import { ledgerEntries, users } from "./schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export const LEDGER_SECTIONS = [
  { key: "funds_transfer_in", label: "Funds Transferred In", side: "credit", suggestions: ["Bank Funding", "Imprest Funding"] },
  { key: "funds_transfer_out", label: "Funds Transfer Out", side: "debit", suggestions: [] },
  {
    key: "asset_purchase",
    label: "Purchase of Assets",
    side: "debit",
    suggestions: ["Motor Vehicle", "Generators and Office Equipment", "Computers", "Office Furniture and Fittings"],
  },
  {
    key: "asset_disposal",
    label: "Disposal of Assets",
    side: "credit",
    suggestions: ["Motor Vehicle", "Generators and Office Equipment", "Computers", "Office Furniture and Fittings"],
  },
  { key: "new_borrowing", label: "New Borrowings", side: "credit", suggestions: [] },
  { key: "borrowing_recall", label: "Recall of Borrowings", side: "debit", suggestions: [] },
  {
    key: "new_liability",
    label: "New Liabilities",
    side: "credit",
    suggestions: ["Contractors, Suppliers & Investors", "Staff Retirement Benefit Scheme & Other Payments", "Taxes & Other Current Liabilities"],
  },
  {
    key: "liability_payment",
    label: "Liability Payments",
    side: "debit",
    suggestions: ["Contractors, Suppliers & Investors", "Staff Retirement Benefit Scheme & Other Payments", "Taxes & Other Current Liabilities"],
  },
  {
    key: "investment_income",
    label: "Other Investment Income",
    side: "credit",
    suggestions: ["Bad Debts Recovered", "Miscellaneous Income"],
  },
] as const;

export type LedgerSectionKey = (typeof LEDGER_SECTIONS)[number]["key"];

export async function listLedgerEntries(params: { branchId: number; from: string; to: string }) {
  const db = getDb();
  return db
    .select({
      id: ledgerEntries.id,
      section: ledgerEntries.section,
      label: ledgerEntries.label,
      entryDate: ledgerEntries.entryDate,
      amount: ledgerEntries.amount,
      notes: ledgerEntries.notes,
      recordedByName: users.fullName,
    })
    .from(ledgerEntries)
    .innerJoin(users, eq(users.id, ledgerEntries.recordedBy))
    .where(
      and(
        eq(ledgerEntries.branchId, params.branchId),
        gte(ledgerEntries.entryDate, params.from),
        lte(ledgerEntries.entryDate, params.to),
      ),
    )
    .orderBy(ledgerEntries.entryDate);
}

export async function createLedgerEntry(data: {
  branchId: number;
  section: LedgerSectionKey;
  label: string;
  entryDate: string;
  amount: string;
  notes?: string;
  recordedBy: number;
}) {
  const db = getDb();
  const [row] = await db.insert(ledgerEntries).values(data).returning();
  return row;
}

// Sums per section for a date range, used by the Week Summary report.
export async function getLedgerTotals(params: { branchId: number; from: string; to: string }) {
  const db = getDb();
  const rows = await db
    .select({ section: ledgerEntries.section, total: sql<string>`coalesce(sum(${ledgerEntries.amount}), 0)` })
    .from(ledgerEntries)
    .where(
      and(
        eq(ledgerEntries.branchId, params.branchId),
        gte(ledgerEntries.entryDate, params.from),
        lte(ledgerEntries.entryDate, params.to),
      ),
    )
    .groupBy(ledgerEntries.section);

  const totals = new Map(rows.map((r) => [r.section, r.total]));
  return Object.fromEntries(LEDGER_SECTIONS.map((s) => [s.key, totals.get(s.key) ?? "0"])) as Record<LedgerSectionKey, string>;
}
