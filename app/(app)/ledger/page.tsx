import { requireModule, getModulePermission } from "@/lib/auth/session";
import { listActiveBranches } from "@/lib/db/branches";
import { listLedgerEntries, LEDGER_SECTIONS } from "@/lib/db/ledger";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddLedgerEntryDialog } from "./AddLedgerEntryDialog";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const nativeSelectClass =
  "h-8 w-44 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const sectionLabel = new Map<string, (typeof LEDGER_SECTIONS)[number]>(LEDGER_SECTIONS.map((s) => [s.key, s]));

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string; from?: string; to?: string }>;
}) {
  const user = await requireModule("ledger", "view");
  const { canCreate } = await getModulePermission("ledger");
  const isSuperAdmin = user.roleKey === "super_admin";
  const { branchId: branchIdParam, from: fromParam, to: toParam } = await searchParams;

  const branches = isSuperAdmin ? await listActiveBranches() : [];
  const branchId = isSuperAdmin ? (branchIdParam ? Number(branchIdParam) : (branches[0]?.id ?? null)) : user.branchId;

  const from = fromParam && !Number.isNaN(Date.parse(fromParam)) ? fromParam : daysAgo(30);
  const to = toParam && !Number.isNaN(Date.parse(toParam)) ? toParam : today();

  const entries = branchId ? await listLedgerEntries({ branchId, from, to }) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Ledger</h1>
        {canCreate && branchId && (
          <AddLedgerEntryDialog branchId={branchId} sections={LEDGER_SECTIONS.map((s) => ({ ...s }))} />
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Funds transfers, asset purchases/disposals, borrowings, liabilities, and other investment income — feeds into the
        Week Summary report.
      </p>

      <GlassPanel data-tour="tour-ledger" className="p-4">
        <form className="flex flex-wrap items-end gap-3">
          {isSuperAdmin && (
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
          )}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground" htmlFor="from">
              From
            </label>
            <Input id="from" name="from" type="date" defaultValue={from} className="w-40" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground" htmlFor="to">
              To
            </label>
            <Input id="to" name="to" type="date" defaultValue={to} className="w-40" />
          </div>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
        </form>
      </GlassPanel>

      <GlassPanel className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Recorded By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((e) => {
              const section = sectionLabel.get(e.section);
              return (
                <TableRow key={e.id}>
                  <TableCell>{e.entryDate}</TableCell>
                  <TableCell>
                    <Badge variant={section?.side === "credit" ? "default" : "secondary"}>{section?.label ?? e.section}</Badge>
                  </TableCell>
                  <TableCell>{e.label}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">{e.notes || "—"}</TableCell>
                  <TableCell className="text-right">{money(e.amount)}</TableCell>
                  <TableCell className="text-muted-foreground">{e.recordedByName}</TableCell>
                </TableRow>
              );
            })}
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No ledger entries in this range.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </GlassPanel>
    </div>
  );
}
