import "server-only";
import { getISOWeek, getISODay } from "date-fns";
import { sql } from "drizzle-orm";
import { clientSequences } from "@/lib/db/schema";
import type { DbTx } from "@/lib/db/client";

export class InvalidEnrollmentDateError extends Error {}

// {BRANCH_CODE}-{WW}{D}-{SEQ} e.g. YOL-101-045.
// WW/D are fixed permanently at enrollment (ISO week, 1=Mon..5=Fri).
// SEQ is a per-branch running counter, not reset weekly.
export async function generateClientCode(
  tx: DbTx,
  branchCode: string,
  branchId: number,
  enrollmentDate: Date,
): Promise<{ code: string; enrollmentWeek: number; enrollmentDay: number }> {
  const day = getISODay(enrollmentDate);
  if (day > 5) {
    throw new InvalidEnrollmentDateError("Enrollment date must be a weekday (Monday–Friday).");
  }
  const week = getISOWeek(enrollmentDate);

  const result = await tx.execute(sql`
    INSERT INTO ${clientSequences} (branch_id, last_seq)
    VALUES (${branchId}, 1)
    ON CONFLICT (branch_id)
    DO UPDATE SET last_seq = ${clientSequences.lastSeq} + 1
    RETURNING last_seq;
  `);
  const seq = (result.rows[0] as unknown as { last_seq: number }).last_seq;

  const code = `${branchCode.toUpperCase()}-${String(week).padStart(2, "0")}${day}-${String(seq).padStart(3, "0")}`;
  return { code, enrollmentWeek: week, enrollmentDay: day };
}
