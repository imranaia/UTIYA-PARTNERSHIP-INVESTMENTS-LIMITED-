"use server";

import { redirect } from "next/navigation";
import { requireModule } from "@/lib/auth/session";
import { listLoanCollectorsForBranch } from "@/lib/db/users";
import { listExpenseCategories } from "@/lib/db/expenses";
import { parseClientsWorkbook, parseExpensesWorkbook } from "@/lib/services/excelImport";
import { runClientImport, runExpenseImport } from "@/lib/db/imports";

export type ImportFormState = { error: string | null };

export async function importClientsAction(_prevState: ImportFormState, formData: FormData): Promise<ImportFormState> {
  const user = await requireModule("import", "create");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose an Excel file." };
  }

  const branchId = user.roleKey === "super_admin" ? Number(formData.get("branchId")) : user.branchId;
  if (!branchId) {
    return { error: "A branch is required." };
  }

  let rows;
  try {
    const buffer = await file.arrayBuffer();
    rows = await parseClientsWorkbook(buffer);
  } catch {
    return { error: "Could not read the file. Make sure it's a valid .xlsx file." };
  }
  if (rows.length === 0) {
    return { error: "No data rows found in the file." };
  }

  const collectors = await listLoanCollectorsForBranch(branchId);
  const collectorsByName = new Map(collectors.map((c) => [c.fullName.toLowerCase(), c.id]));

  const result = await runClientImport({
    branchId,
    fileName: file.name,
    uploadedBy: user.userId,
    rows,
    collectorsByName,
  });

  redirect(`/import/${result.batchId}`);
}

export async function importExpensesAction(_prevState: ImportFormState, formData: FormData): Promise<ImportFormState> {
  const user = await requireModule("import", "create");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose an Excel file." };
  }

  const branchId = user.roleKey === "super_admin" ? Number(formData.get("branchId")) : user.branchId;
  if (!branchId) {
    return { error: "A branch is required." };
  }

  let rows;
  try {
    const buffer = await file.arrayBuffer();
    rows = await parseExpensesWorkbook(buffer);
  } catch {
    return { error: "Could not read the file. Make sure it's a valid .xlsx file." };
  }
  if (rows.length === 0) {
    return { error: "No data rows found in the file." };
  }

  const categories = await listExpenseCategories();
  const categoriesByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));

  const result = await runExpenseImport({
    branchId,
    fileName: file.name,
    uploadedBy: user.userId,
    rows,
    categoriesByName,
  });

  redirect(`/import/${result.batchId}`);
}
