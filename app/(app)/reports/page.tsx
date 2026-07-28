import { requireModule } from "@/lib/auth/session";
import { listActiveBranches } from "@/lib/db/branches";
import { getPortfolioSummary, getDailyTransactionTotals, getDailyExpenseTotal, getBranchBreakdown } from "@/lib/db/reports";
import { getOpenDefaultCount } from "@/lib/db/clientDefaults";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatTile({ label, value, emphasis }: { label: string; value: string; emphasis?: "positive" | "negative" }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          "text-lg font-semibold " +
          (emphasis === "positive" ? "text-primary" : emphasis === "negative" ? "text-destructive" : "text-foreground")
        }
      >
        {value}
      </p>
    </div>
  );
}

const nativeSelectClass =
  "h-8 w-44 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; branchId?: string }>;
}) {
  const user = await requireModule("reports", "view");
  const isSuperAdmin = user.roleKey === "super_admin";
  const { date, branchId: branchIdParam } = await searchParams;

  const reportDate = date && !Number.isNaN(Date.parse(date)) ? date : today();
  const branches = isSuperAdmin ? await listActiveBranches() : [];
  const branchId = isSuperAdmin ? (branchIdParam ? Number(branchIdParam) : null) : user.branchId;

  const [portfolio, dailyTotals, dailyExpenses, openDefaults, breakdown] = await Promise.all([
    getPortfolioSummary(branchId),
    getDailyTransactionTotals({ branchId, date: reportDate }),
    getDailyExpenseTotal({ branchId, date: reportDate }),
    getOpenDefaultCount(branchId),
    isSuperAdmin && branchId === null ? getBranchBreakdown(reportDate) : Promise.resolve(null),
  ]);

  const netCashMovement =
    Number(dailyTotals?.loanRecovery ?? 0) +
    Number(dailyTotals?.newSavings ?? 0) -
    Number(dailyTotals?.loanDisbursement ?? 0) -
    Number(dailyTotals?.savingsRecall ?? 0) -
    Number(dailyExpenses);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Reports</h1>

      <GlassPanel className="p-4">
        <form className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground" htmlFor="date">
              Date
            </label>
            <Input id="date" name="date" type="date" defaultValue={reportDate} className="w-40" />
          </div>
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
          <Button type="submit" variant="secondary">
            Filter
          </Button>
        </form>
      </GlassPanel>

      <GlassPanel className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-5">
        <StatTile label="Active Clients" value={portfolio.activeClients.toLocaleString()} />
        <StatTile label="Total Capital (Savings)" value={money(portfolio.totalSavings)} />
        <StatTile label="Today's Expenses" value={money(dailyExpenses)} emphasis="negative" />
        <StatTile
          label="Net Cash Movement"
          value={money(netCashMovement)}
          emphasis={netCashMovement >= 0 ? "positive" : "negative"}
        />
        <StatTile
          label="Open Defaults"
          value={openDefaults.toLocaleString()}
          emphasis={openDefaults > 0 ? "negative" : undefined}
        />
      </GlassPanel>

      <h2 className="text-sm font-semibold text-muted-foreground">Daily Summary — {reportDate}</h2>
      <GlassPanel className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-3">
        <StatTile label="Loan Disbursement" value={money(dailyTotals?.loanDisbursement ?? 0)} />
        <StatTile label="Loan Recovery" value={money(dailyTotals?.loanRecovery ?? 0)} />
        <StatTile label="Profit / Interest" value={money(dailyTotals?.profitInterest ?? 0)} />
        <StatTile label="Service Charge" value={money(dailyTotals?.serviceCharge ?? 0)} />
        <StatTile label="New Savings" value={money(dailyTotals?.newSavings ?? 0)} />
        <StatTile label="Savings Recall" value={money(dailyTotals?.savingsRecall ?? 0)} />
      </GlassPanel>

      {breakdown && (
        <>
          <h2 className="text-sm font-semibold text-muted-foreground">By Branch — {reportDate}</h2>
          <GlassPanel className="overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch</TableHead>
                  <TableHead className="text-right">Active Clients</TableHead>
                  <TableHead className="text-right">Loan Disb.</TableHead>
                  <TableHead className="text-right">Loan Recovery</TableHead>
                  <TableHead className="text-right">New Savings</TableHead>
                  <TableHead className="text-right">Savings Recall</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breakdown.map((b) => (
                  <TableRow key={b.branchId}>
                    <TableCell className="font-medium">{b.branchName}</TableCell>
                    <TableCell className="text-right">{b.activeClients}</TableCell>
                    <TableCell className="text-right">{money(b.loanDisbursement)}</TableCell>
                    <TableCell className="text-right">{money(b.loanRecovery)}</TableCell>
                    <TableCell className="text-right">{money(b.newSavings)}</TableCell>
                    <TableCell className="text-right">{money(b.savingsRecall)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </GlassPanel>
        </>
      )}
    </div>
  );
}
