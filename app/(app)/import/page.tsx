import Link from "next/link";
import { requireModule, getModulePermission } from "@/lib/auth/session";
import { listActiveBranches } from "@/lib/db/branches";
import { listImportBatches, IMPORT_TYPE_LABELS } from "@/lib/db/imports";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UploadForm } from "./UploadForm";

export default async function ImportPage() {
  const user = await requireModule("import", "view");
  const { canCreate } = await getModulePermission("import");
  const isSuperAdmin = user.roleKey === "super_admin";

  const [branches, batches] = await Promise.all([
    isSuperAdmin ? listActiveBranches() : Promise.resolve([]),
    listImportBatches({ branchId: isSuperAdmin ? null : user.branchId }),
  ]);

  return (
    <div className="space-y-4">
      <div data-tour="tour-import" className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Excel Import</h1>
      </div>

      {canCreate && (
        <GlassPanel className="p-6">
          <UploadForm branches={branches} showBranchSelect={isSuperAdmin} />
        </GlassPanel>
      )}

      <h2 className="text-sm font-semibold text-muted-foreground">Import history</h2>
      <GlassPanel className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Type</TableHead>
              {isSuperAdmin && <TableHead>Branch</TableHead>}
              <TableHead>Uploaded By</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Success / Errors</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.map((b) => (
              <TableRow key={b.id} className="cursor-pointer">
                <TableCell className="font-medium">
                  <Link href={`/import/${b.id}`} className="hover:underline">
                    {b.fileName}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{IMPORT_TYPE_LABELS[b.importType] ?? b.importType}</TableCell>
                {isSuperAdmin && <TableCell className="text-muted-foreground">{b.branchName ?? "—"}</TableCell>}
                <TableCell className="text-muted-foreground">{b.uploadedByName}</TableCell>
                <TableCell className="text-muted-foreground">{new Date(b.createdAt).toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={b.status === "completed" ? "default" : "secondary"} className="capitalize">
                    {b.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-foreground">{b.successRows}</span>
                  <span className="text-muted-foreground"> / {b.errorRows}</span>
                </TableCell>
              </TableRow>
            ))}
            {batches.length === 0 && (
              <TableRow>
                <TableCell colSpan={isSuperAdmin ? 7 : 6} className="text-center text-muted-foreground">
                  No imports yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </GlassPanel>
    </div>
  );
}
