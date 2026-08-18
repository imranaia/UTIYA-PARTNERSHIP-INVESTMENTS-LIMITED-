import "server-only";
import { getDb } from "./client";
import { preDisbursementChecklists } from "./schema";
import { eq, desc } from "drizzle-orm";

export type NewChecklistInput = {
  clientId: number;
  branchId: number;
  nickname?: string;
  nin?: string;
  neighborRelativePhone?: string;
  shopOwner: boolean;
  rentingShop: boolean;
  gpsPhotoVerified: boolean;
  gpsTimeVerified: boolean;
  amountApplied?: string;
  recommendedAmount?: string;
  amountApproved?: string;
  clientType: "new" | "returning";
  preferredTenureMonths?: number;
  typeOfBusiness?: string;
  experienceYears?: number;
  applicationFormFilled: boolean;
  customerType?: "walk_in" | "marketing";
  appraisalReportAttached: boolean;
  supervisionReportAttached?: boolean;
  loanAmountReviewed?: boolean;
  stockAvailabilityChecked: boolean;
  bankDetails?: string;
  officerName: string;
  recordedBy: number;
};

export async function createChecklist(data: NewChecklistInput) {
  const db = getDb();
  const [row] = await db.insert(preDisbursementChecklists).values(data).returning();
  return row;
}

export async function listChecklistsForClient(clientId: number) {
  const db = getDb();
  return db
    .select()
    .from(preDisbursementChecklists)
    .where(eq(preDisbursementChecklists.clientId, clientId))
    .orderBy(desc(preDisbursementChecklists.createdAt));
}

export async function getLatestChecklist(clientId: number) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(preDisbursementChecklists)
    .where(eq(preDisbursementChecklists.clientId, clientId))
    .orderBy(desc(preDisbursementChecklists.createdAt))
    .limit(1);
  return row ?? null;
}
