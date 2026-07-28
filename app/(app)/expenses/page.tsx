import Link from "next/link";
import { Plus } from "lucide-react";
import { requireModule, getModulePermission } from "@/lib/auth/session";
import { listExpenses } from "@/lib/db/expenses";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function ExpensesPage() {
  const user = await requireModule("expenses", "view");
  const { canCreate } = await getModulePermission("expenses");
  const isSuperAdmin = user.roleKey === "super_admin";

  const rows = await listExpenses({ branchId: isSuperAdmin ? null : user.branchId });
  const total = rows.reduce((sum, r) => sum + Number(r.amount), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Expenses</h1>
        {canCreate && (
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/expenses/new">
              <Plus className="size-4" />
              Add Expense
            </Link>
          </Button>
        )}
      </div>

      <GlassPanel className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              {isSuperAdmin && <TableHead>Branch</TableHead>}
              <TableHead>Recorded By</TableHead>
              <TableHead>Receipt Ref.</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.expenseDate}</TableCell>
                <TableCell>{r.categoryName}</TableCell>
                <TableCell className="max-w-xs truncate">{r.description}</TableCell>
                {isSuperAdmin && <TableCell className="text-muted-foreground">{r.branchName}</TableCell>}
                <TableCell className="text-muted-foreground">{r.recordedByName}</TableCell>
                <TableCell className="text-muted-foreground">{r.receiptRef || "—"}</TableCell>
                <TableCell className="text-right font-medium">{money(r.amount)}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={isSuperAdmin ? 7 : 6} className="text-center text-muted-foreground">
                  No expenses recorded yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </GlassPanel>

      {rows.length > 0 && (
        <div className="text-right text-sm text-muted-foreground">
          Total: <span className="font-semibold text-foreground">{money(total)}</span>
        </div>
      )}
    </div>
  );
}
