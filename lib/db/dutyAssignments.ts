import "server-only";
import { getDb } from "./client";
import { dutyAssignments, users } from "./schema";
import { eq, and } from "drizzle-orm";

export const DUTY_POSTS = [
  { key: "branch_head", label: "Branch Head" },
  { key: "receiving_officer", label: "Receiving Officer" },
  { key: "supervision_officer", label: "Supervision Officer" },
  { key: "disbursement_officer", label: "Disbursement Officer" },
] as const;

export type DutyPostKey = (typeof DUTY_POSTS)[number]["key"];

export async function listDutyAssignments(params: { branchId: number; date: string }) {
  const db = getDb();
  return db
    .select({
      dutyPost: dutyAssignments.dutyPost,
      userId: dutyAssignments.userId,
      userName: users.fullName,
    })
    .from(dutyAssignments)
    .innerJoin(users, eq(users.id, dutyAssignments.userId))
    .where(and(eq(dutyAssignments.branchId, params.branchId), eq(dutyAssignments.assignmentDate, params.date)));
}

export async function setDutyAssignment(data: {
  branchId: number;
  date: string;
  dutyPost: DutyPostKey;
  userId: number;
  assignedBy: number;
}) {
  const db = getDb();
  const [row] = await db
    .insert(dutyAssignments)
    .values({
      branchId: data.branchId,
      assignmentDate: data.date,
      dutyPost: data.dutyPost,
      userId: data.userId,
      assignedBy: data.assignedBy,
    })
    .onConflictDoUpdate({
      target: [dutyAssignments.branchId, dutyAssignments.assignmentDate, dutyAssignments.dutyPost],
      set: { userId: data.userId, assignedBy: data.assignedBy, updatedAt: new Date() },
    })
    .returning();
  return row;
}
