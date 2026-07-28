import "server-only";
import { getDb } from "./client";
import { importBatches, importRows, branches, users } from "./schema";
import { eq, desc, asc } from "drizzle-orm";
import { createClient } from "./clients";
import { InvalidEnrollmentDateError } from "@/lib/services/clientCode";
import type { ParsedClientRow } from "@/lib/services/excelImport";

export async function listImportBatches(params: { branchId: number | null }) {
  const db = getDb();
  return db
    .select({
      id: importBatches.id,
      fileName: importBatches.fileName,
      status: importBatches.status,
      totalRows: importBatches.totalRows,
      successRows: importBatches.successRows,
      errorRows: importBatches.errorRows,
      createdAt: importBatches.createdAt,
      branchName: branches.name,
      uploadedByName: users.fullName,
    })
    .from(importBatches)
    .leftJoin(branches, eq(branches.id, importBatches.branchId))
    .innerJoin(users, eq(users.id, importBatches.uploadedBy))
    .where(params.branchId !== null ? eq(importBatches.branchId, params.branchId) : undefined)
    .orderBy(desc(importBatches.createdAt));
}

export async function getImportBatch(id: number) {
  const db = getDb();
  const [batch] = await db
    .select({
      id: importBatches.id,
      fileName: importBatches.fileName,
      status: importBatches.status,
      totalRows: importBatches.totalRows,
      successRows: importBatches.successRows,
      errorRows: importBatches.errorRows,
      branchId: importBatches.branchId,
      createdAt: importBatches.createdAt,
    })
    .from(importBatches)
    .where(eq(importBatches.id, id));
  return batch ?? null;
}

export async function getImportBatchRows(batchId: number) {
  const db = getDb();
  return db
    .select({
      id: importRows.id,
      rowNumber: importRows.rowNumber,
      status: importRows.status,
      errorMessage: importRows.errorMessage,
      rawData: importRows.rawData,
      createdClientId: importRows.createdClientId,
    })
    .from(importRows)
    .where(eq(importRows.importBatchId, batchId))
    .orderBy(asc(importRows.rowNumber));
}

export async function runClientImport(params: {
  branchId: number;
  fileName: string;
  uploadedBy: number;
  rows: ParsedClientRow[];
  collectorsByName: Map<string, number>;
}) {
  const db = getDb();
  const [batch] = await db
    .insert(importBatches)
    .values({
      branchId: params.branchId,
      uploadedBy: params.uploadedBy,
      fileName: params.fileName,
      status: "processing",
      totalRows: params.rows.length,
      startedAt: new Date(),
    })
    .returning();

  let successRows = 0;
  let errorRows = 0;

  for (const row of params.rows) {
    try {
      if (!row.fullName) throw new Error("Full name is required.");
      if (!row.enrollmentDate || Number.isNaN(Date.parse(row.enrollmentDate))) {
        throw new Error("Enrollment date is missing or invalid.");
      }

      const loanCollectorId = row.loanCollectorName
        ? params.collectorsByName.get(row.loanCollectorName.toLowerCase())
        : undefined;

      const client = await createClient({
        branchId: params.branchId,
        fullName: row.fullName,
        phone: row.phone || undefined,
        address: row.address || undefined,
        groupName: row.groupName || undefined,
        enrollmentDate: new Date(row.enrollmentDate),
        loanCollectorId,
        openingSavings: row.openingSavings || undefined,
        createdByUserId: params.uploadedBy,
      });

      await db.insert(importRows).values({
        importBatchId: batch.id,
        rowNumber: row.rowNumber,
        rawData: row.raw,
        status: "success",
        createdClientId: client.id,
      });
      successRows++;
    } catch (err) {
      const message = err instanceof InvalidEnrollmentDateError || err instanceof Error ? err.message : "Unknown error.";
      await db.insert(importRows).values({
        importBatchId: batch.id,
        rowNumber: row.rowNumber,
        rawData: row.raw,
        status: "error",
        errorMessage: message,
      });
      errorRows++;
    }
  }

  await db
    .update(importBatches)
    .set({ status: "completed", successRows, errorRows, completedAt: new Date() })
    .where(eq(importBatches.id, batch.id));

  return { batchId: batch.id, successRows, errorRows, totalRows: params.rows.length };
}
