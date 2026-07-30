import { requireModule } from "@/lib/auth/session";
import {
  buildClientsTemplate,
  buildExpensesTemplate,
  buildTransactionsTemplate,
  buildCashBookTemplate,
} from "@/lib/services/excelImport";

const BUILDERS = {
  clients: buildClientsTemplate,
  expenses: buildExpensesTemplate,
  transactions: buildTransactionsTemplate,
  cash_book: buildCashBookTemplate,
} as const;

type ImportType = keyof typeof BUILDERS;

function isImportType(v: string | null): v is ImportType {
  return !!v && v in BUILDERS;
}

export async function GET(request: Request) {
  await requireModule("import", "view");
  const typeParam = new URL(request.url).searchParams.get("type");
  const type: ImportType = isImportType(typeParam) ? typeParam : "clients";
  const buffer = await BUILDERS[type]();

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${type}-import-template.xlsx"`,
    },
  });
}
