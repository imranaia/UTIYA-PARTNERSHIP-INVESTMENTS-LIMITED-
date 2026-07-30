import { requireModule } from "@/lib/auth/session";
import { buildClientsTemplate, buildExpensesTemplate } from "@/lib/services/excelImport";

export async function GET(request: Request) {
  await requireModule("import", "view");
  const type = new URL(request.url).searchParams.get("type") === "expenses" ? "expenses" : "clients";
  const buffer = type === "expenses" ? await buildExpensesTemplate() : await buildClientsTemplate();

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${type}-import-template.xlsx"`,
    },
  });
}
