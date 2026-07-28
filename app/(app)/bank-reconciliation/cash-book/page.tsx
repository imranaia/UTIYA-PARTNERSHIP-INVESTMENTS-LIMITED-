import { requireModule, getModulePermission } from "@/lib/auth/session";
import { listActiveBranches } from "@/lib/db/branches";
import { listCashBookEntries } from "@/lib/db/cashBook";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddEntryDialog } from "./AddEntryDialog";

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const nativeSelectClass =
  "h-8 w-44 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export default async function CashBookPage({ searchParams }: { searchParams: Promise<{ branchId?: string }> }) {
  const user = await requireModule("bank_reconciliation", "view");
  const { canCreate } = await getModulePermission("bank_reconciliation");
  const isSuperAdmin = user.roleKey === "super_admin";
  const { branchId: branchIdParam } = await searchParams;

  const branches = isSuperAdmin ? await listActiveBranches() : [];
  const branchId = isSuperAdmin ? (branchIdParam ? Number(branchIdParam) : (branches[0]?.id ?? null)) : user.branchId;

  const rows = branchId ? await listCashBookEntries({ branchId }) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Cash Book</h1>
        {canCreate && branchId && <AddEntryDialog branchId={branchId} />}
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
              <TableHead>Date</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Ref.</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Recorded By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.entryDate}</TableCell>
                <TableCell className="max-w-xs truncate">{r.details || "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {r.refType ? `${r.refType} ${r.refNumber ?? ""}`.trim() : "—"}
                </TableCell>
                <TableCell className="text-right">{Number(r.debit) > 0 ? money(r.debit) : "—"}</TableCell>
                <TableCell className="text-right">{Number(r.credit) > 0 ? money(r.credit) : "—"}</TableCell>
                <TableCell className="text-right font-medium">{money(r.runningBalance)}</TableCell>
                <TableCell className="text-muted-foreground">{r.recordedByName}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No cash book entries yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </GlassPanel>
    </div>
  );
}
