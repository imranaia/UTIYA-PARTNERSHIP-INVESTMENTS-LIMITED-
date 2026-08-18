import "server-only";
import { getISOWeek, getISODay } from "date-fns";
import { sql } from "drizzle-orm";
import { clientMonthSequences } from "@/lib/db/schema";
import type { DbTx } from "@/lib/db/client";

export class InvalidPaymentDayError extends Error {}

function pad(n: number, width: number) {
  return String(n).padStart(width, "0");
}

// {BRANCH}-{paymentDay 1-6}-{DDMM}-{seq in month, 2 digits}-{YYYY}
// e.g. YOL-3-0503-01-2026: Wednesday collection, created 5 March, 1st client
// that month at this branch, 2026. paymentDay is the admin's explicit choice
// (not derived from createdDate), and the monthly sequence resets every
// calendar month via client_month_sequences.
export async function generateClientCode(
  tx: DbTx,
  branchCode: string,
  branchId: number,
  paymentDay: number,
  createdDate: Date,
): Promise<{ code: string; paymentDay: number }> {
  if (!Number.isInteger(paymentDay) || paymentDay < 1 || paymentDay > 6) {
    throw new InvalidPaymentDayError("Payment day must be Monday–Saturday (1–6).");
  }

  const year = createdDate.getFullYear();
  const month = createdDate.getMonth() + 1;
  const day = createdDate.getDate();

  const result = await tx.execute(sql`
    INSERT INTO ${clientMonthSequences} (branch_id, year, month, last_seq)
    VALUES (${branchId}, ${year}, ${month}, 1)
    ON CONFLICT (branch_id, year, month)
    DO UPDATE SET last_seq = ${clientMonthSequences.lastSeq} + 1
    RETURNING last_seq;
  `);
  const seq = (result.rows[0] as unknown as { last_seq: number }).last_seq;

  const code = `${branchCode.toUpperCase()}-${paymentDay}-${pad(day, 2)}${pad(month, 2)}-${pad(seq, 2)}-${year}`;
  return { code, paymentDay };
}

// Retained for the historical enrollment_week/enrollment_day columns, which
// stay populated from enrollmentDate for record-keeping but no longer drive
// the client code (see generateClientCode above).
export function deriveEnrollmentWeekDay(enrollmentDate: Date): { enrollmentWeek: number; enrollmentDay: number } {
  return { enrollmentWeek: getISOWeek(enrollmentDate), enrollmentDay: getISODay(enrollmentDate) };
}
