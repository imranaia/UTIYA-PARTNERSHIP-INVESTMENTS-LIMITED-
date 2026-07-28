import { requireModule, getModulePermission } from "@/lib/auth/session";
import { listActiveBranches } from "@/lib/db/branches";
import { listActiveClientsForSelect } from "@/lib/db/clients";
import { listDefaults } from "@/lib/db/clientDefaults";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AddDefaultDialog } from "./AddDefaultDialog";
import { ResolveButton } from "./ResolveButton";

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const nativeSelectClass =
  "h-8 w-44 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export default async function ClientDefaultsPage({ searchParams }: { searchParams: Promise<{ branchId?: string }> }) {
  const user = await requireModule("clients", "view");
  const { canEdit } = await getModulePermission("clients");
  const isSuperAdmin = user.roleKey === "super_admin";
  const { branchId: branchIdParam } = await searchParams;

  const branches = isSuperAdmin ? await listActiveBranches() : [];
  const branchId = isSuperAdmin ? (branchIdParam ? Number(branchIdParam) : (branches[0]?.id ?? null)) : user.branchId;

  const [rows, clientOptions] = await Promise.all([
    listDefaults({ branchId }),
    branchId ? listActiveClientsForSelect(branchId) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Bad Debts / Defaults</h1>
        {canEdit && branchId && <AddDefaultDialog clients={clientOptions} branchId={branchId} />}
      </div>

      {isSuperAdmin && (
        <GlassPanel className="p-4">
          <form className="flex items-end gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground" htmlFor="branchId">
                Branch
              </label>
              <select id="branchId" name="branchId" defaultValue={branchId ? String(branchId) : ""} className={nativeSelectClass}>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </form>
        </GlassPanel>
      )}

      <GlassPanel className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Recorded By</TableHead>
              {canEdit && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  {r.clientName} <span className="text-xs text-muted-foreground">({r.clientCode})</span>
                </TableCell>
                <TableCell>{r.defaultedAt}</TableCell>
                <TableCell className="text-right">{money(r.defaultedAmount)}</TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">{r.reason || "—"}</TableCell>
                <TableCell>
                  <Badge variant={r.resolvedAt ? "secondary" : "destructive"}>{r.resolvedAt ? "Resolved" : "Open"}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.recordedByName}</TableCell>
                {canEdit && <TableCell>{!r.resolvedAt && <ResolveButton id={r.id} />}</TableCell>}
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={canEdit ? 7 : 6} className="text-center text-muted-foreground">
                  No defaults recorded.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </GlassPanel>
    </div>
  );
}
