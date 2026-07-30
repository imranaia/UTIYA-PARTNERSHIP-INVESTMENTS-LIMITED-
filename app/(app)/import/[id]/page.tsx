import { notFound } from "next/navigation";
import { requireModule } from "@/lib/auth/session";
import { getImportBatch, getImportBatchRows } from "@/lib/db/imports";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { BackLink } from "@/components/layout/BackLink";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function ImportBatchPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireModule("import", "view");
  const { id } = await params;
  const batchId = Number(id);
  if (!Number.isInteger(batchId)) notFound();

  const batch = await getImportBatch(batchId);
  if (!batch) notFound();
  if (user.roleKey !== "super_admin" && batch.branchId !== user.branchId) notFound();

  const rows = await getImportBatchRows(batchId);

  return (
    <div className="space-y-4">
      <BackLink href="/import" label="Back to Excel Import" />
      <div className="flex items-center gap-2.5">
        <h1 className="text-lg font-semibold">{batch.fileName}</h1>
        <Badge variant={batch.status === "completed" ? "default" : "secondary"} className="capitalize">
          {batch.status}
        </Badge>
      </div>

      <GlassPanel className="grid grid-cols-3 gap-4 p-6">
        <div>
          <p className="text-xs text-muted-foreground">Total rows</p>
          <p className="font-medium">{batch.totalRows}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Successful</p>
          <p className="font-medium text-primary">{batch.successRows}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Errors</p>
          <p className="font-medium text-destructive">{batch.errorRows}</p>
        </div>
      </GlassPanel>

      <GlassPanel className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Row</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const raw = r.rawData as Record<string, unknown>;
              const name = batch.importType === "expenses" ? raw["Description"] : raw["Full Name"];
              const detail =
                r.errorMessage ??
                (r.createdClientId ? "Client created" : r.createdExpenseId ? "Expense created" : "—");
              return (
                <TableRow key={r.id}>
                  <TableCell>{r.rowNumber}</TableCell>
                  <TableCell>{String(name ?? "—")}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "success" ? "default" : "destructive"} className="capitalize">
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{detail}</TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No rows recorded.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </GlassPanel>
    </div>
  );
}
