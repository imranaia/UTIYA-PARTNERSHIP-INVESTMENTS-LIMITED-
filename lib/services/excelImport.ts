import "server-only";
import ExcelJS from "exceljs";

export type ParsedClientRow = {
  rowNumber: number;
  fullName?: string;
  phone?: string;
  address?: string;
  groupName?: string;
  enrollmentDate?: string;
  loanCollectorName?: string;
  openingSavings?: string;
  raw: Record<string, unknown>;
};

const COLUMNS = ["Full Name", "Phone", "Address", "Group", "Enrollment Date", "Loan Collector", "Opening Savings"] as const;

function cellText(value: ExcelJS.CellValue): string | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && "text" in value) return String((value as { text: string }).text).trim() || undefined;
  if (typeof value === "object" && "result" in value) return String((value as { result: unknown }).result ?? "").trim() || undefined;
  const text = String(value).trim();
  return text || undefined;
}

export async function parseClientsWorkbook(buffer: ArrayBuffer): Promise<ParsedClientRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headerMap = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, colNumber) => {
    const label = String(cell.value ?? "").trim();
    if (label) headerMap.set(label, colNumber);
  });

  const rows: ParsedClientRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const get = (label: string) => {
      const col = headerMap.get(label);
      if (!col) return undefined;
      return cellText(row.getCell(col).value);
    };

    const raw: Record<string, unknown> = {};
    for (const label of COLUMNS) raw[label] = get(label) ?? "";
    if (!Object.values(raw).some((v) => v !== "")) return;

    rows.push({
      rowNumber,
      fullName: get("Full Name"),
      phone: get("Phone"),
      address: get("Address"),
      groupName: get("Group"),
      enrollmentDate: get("Enrollment Date"),
      loanCollectorName: get("Loan Collector"),
      openingSavings: get("Opening Savings"),
      raw,
    });
  });

  return rows;
}

export async function buildClientsTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Clients");
  sheet.columns = COLUMNS.map((header) => ({ header, key: header, width: 20 }));
  sheet.addRow({
    "Full Name": "Jane Doe",
    Phone: "08012345678",
    Address: "12 Main Street",
    Group: "Group A",
    "Enrollment Date": "2026-07-27",
    "Loan Collector": "",
    "Opening Savings": "0",
  });
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export type ParsedExpenseRow = {
  rowNumber: number;
  category?: string;
  description?: string;
  amount?: string;
  expenseDate?: string;
  receiptRef?: string;
  raw: Record<string, unknown>;
};

const EXPENSE_COLUMNS = ["Category", "Description", "Amount", "Expense Date", "Receipt Ref"] as const;

export async function parseExpensesWorkbook(buffer: ArrayBuffer): Promise<ParsedExpenseRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headerMap = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, colNumber) => {
    const label = String(cell.value ?? "").trim();
    if (label) headerMap.set(label, colNumber);
  });

  const rows: ParsedExpenseRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const get = (label: string) => {
      const col = headerMap.get(label);
      if (!col) return undefined;
      return cellText(row.getCell(col).value);
    };

    const raw: Record<string, unknown> = {};
    for (const label of EXPENSE_COLUMNS) raw[label] = get(label) ?? "";
    if (!Object.values(raw).some((v) => v !== "")) return;

    rows.push({
      rowNumber,
      category: get("Category"),
      description: get("Description"),
      amount: get("Amount"),
      expenseDate: get("Expense Date"),
      receiptRef: get("Receipt Ref"),
      raw,
    });
  });

  return rows;
}

export async function buildExpensesTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Expenses");
  sheet.columns = EXPENSE_COLUMNS.map((header) => ({ header, key: header, width: 20 }));
  sheet.addRow({
    Category: "Transport",
    Description: "Fuel for field visit",
    Amount: "5000",
    "Expense Date": "2026-07-27",
    "Receipt Ref": "",
  });
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
