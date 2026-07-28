import Link from "next/link";
import { Plus, BookOpen } from "lucide-react";
import { requireModule, getModulePermission } from "@/lib/auth/session";
import { listReconciliations } from "@/lib/db/bankReconciliation";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function BankReconciliationPage() {
  const user = await requireModule("bank_reconciliation", "view");
  const { canCreate } = await getModulePermission("bank_reconciliation");
  const isSuperAdmin = user.roleKey === "super_admin";

  const rows = await listReconciliations({ branchId: isSuperAdmin ? null : user.branchId });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Bank Reconciliation</h1>
        <div className="flex gap-2">
          <Button asChild variant="secondary" size="sm" className="gap-1.5">
            <Link href="/bank-reconciliation/cash-book">
              <BookOpen className="size-4" />
              Cash Book
            </Link>
          </Button>
          {canCreate && (
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/bank-reconciliation/new">
                <Plus className="size-4" />
                Add Reconciliation
              </Link>
            </Button>
          )}
        </div>
      </div>

      <GlassPanel className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Account</TableHead>
              {isSuperAdmin && <TableHead>Branch</TableHead>}
              <TableHead className="text-right">Bank Balance</TableHead>
              <TableHead className="text-right">Cash Balance</TableHead>
              <TableHead className="text-right">Book Balance</TableHead>
              <TableHead className="text-right">Variance</TableHead>
              <TableHead>Recorded By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.reconDate}</TableCell>
                <TableCell className="text-muted-foreground">{r.accountName || "Main"}</TableCell>
                {isSuperAdmin && <TableCell className="text-muted-foreground">{r.branchName}</TableCell>}
                <TableCell className="text-right">{money(r.bankBalance)}</TableCell>
                <TableCell className="text-right">{money(r.cashBalance)}</TableCell>
                <TableCell className="text-right">{money(r.bookBalance)}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={Number(r.variance) === 0 ? "default" : "destructive"}>{money(r.variance)}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.recordedByName}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={isSuperAdmin ? 8 : 7} className="text-center text-muted-foreground">
                  No reconciliations recorded yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </GlassPanel>
    </div>
  );
}
