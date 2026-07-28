import "server-only";
import { getISOWeek, getISODay } from "date-fns";
import { sql } from "drizzle-orm";
import { paymentSequences } from "@/lib/db/schema";
import type { DbTx } from "@/lib/db/client";

// {WW}{D}-{SEQ} — e.g. "312-0007" (ISO week 31, day 2/Tuesday, running
// sequence). The sequence runs continuously per branch and never resets, so
// every payment stays uniquely trackable across weeks. Entirely separate
// from — and never affects — a client's own permanent client_code.
export async function generatePaymentId(tx: DbTx, branchId: number, date: Date): Promise<string> {
  const week = getISOWeek(date);
  const day = getISODay(date);

  const result = await tx.execute(sql`
    INSERT INTO ${paymentSequences} (branch_id, last_seq)
    VALUES (${branchId}, 1)
    ON CONFLICT (branch_id)
    DO UPDATE SET last_seq = ${paymentSequences.lastSeq} + 1
    RETURNING last_seq;
  `);
  const seq = (result.rows[0] as unknown as { last_seq: number }).last_seq;

  return `${String(week).padStart(2, "0")}${day}-${String(seq).padStart(4, "0")}`;
}
