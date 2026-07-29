import Link from "next/link";
import { Plus } from "lucide-react";
import { requireModule, getModulePermission } from "@/lib/auth/session";
import { listActiveBranches } from "@/lib/db/branches";
import { listExpenses, getExpensesByCategory } from "@/lib/db/expenses";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const nativeSelectClass =
  "h-8 w-44 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string; from?: string; to?: string }>;
}) {
  const user = await requireModule("expenses", "view");
  const { canCreate } = await getModulePermission("expenses");
  const isSuperAdmin = user.roleKey === "super_admin";
  const { branchId: branchIdParam, from, to } = await searchParams;

  const branches = isSuperAdmin ? await listActiveBranches() : [];
  const branchId = isSuperAdmin ? (branchIdParam ? Number(branchIdParam) : null) : user.branchId;

  const [rows, byCategory] = await Promise.all([
    listExpenses({ branchId, from, to }),
    getExpensesByCategory({ branchId, from, to }),
  ]);
  const total = rows.reduce((sum, r) => sum + Number(r.amount), 0);
  const nonZeroCategories = byCategory.filter((c) => Number(c.total) > 0);
  const zeroCategories = byCategory.filter((c) => Number(c.total) === 0);

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

      <GlassPanel data-tour="tour-expenses" className="p-4">
        <form className="flex flex-wrap items-end gap-3">
          {isSuperAdmin && (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground" htmlFor="branchId">
                Branch
              </label>
              <select id="branchId" name="branchId" defaultValue={branchId ? String(branchId) : ""} className={nativeSelectClass}>
                <option value="">All branches</option>
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

      <h2 className="text-sm font-semibold text-muted-foreground">By Category</h2>
      <GlassPanel className="p-6">
        {nonZeroCategories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No expenses recorded in this range.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {nonZeroCategories.map((c) => (
              <div key={c.categoryId}>
                <p className="truncate text-xs text-muted-foreground">{c.categoryName}</p>
                <p className="font-semibold">{money(c.total)}</p>
              </div>
            ))}
          </div>
        )}
        {zeroCategories.length > 0 && (
          <p className="mt-4 text-xs text-muted-foreground">
            No spending this range in: {zeroCategories.map((c) => c.categoryName).join(", ")}
          </p>
        )}
      </GlassPanel>

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
