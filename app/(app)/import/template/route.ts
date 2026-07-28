import { requireModule } from "@/lib/auth/session";
import { buildClientsTemplate } from "@/lib/services/excelImport";

export async function GET() {
  await requireModule("import", "view");
  const buffer = await buildClientsTemplate();

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="clients-import-template.xlsx"',
    },
  });
}
