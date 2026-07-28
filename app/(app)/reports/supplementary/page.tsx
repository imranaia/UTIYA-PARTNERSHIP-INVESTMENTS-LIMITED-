import { format, startOfMonth } from "date-fns";
import { requireModule, getModulePermission } from "@/lib/auth/session";
import { listActiveBranches } from "@/lib/db/branches";
import { listLoanCollectorsForBranch } from "@/lib/db/users";
import { listSupplementaryPayments } from "@/lib/db/supplementary";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { BackLink } from "@/components/layout/BackLink";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NotSupplementaryButton } from "./NotSupplementaryButton";

const WEEKDAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const nativeSelectClass =
  "h-8 w-44 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export default async function SupplementaryReportPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string; from?: string; to?: string; collectorId?: string }>;
}) {
  const user = await requireModule("reports", "view");
  const { canEdit } = await getModulePermission("transactions");
  const isSuperAdmin = user.roleKey === "super_admin";
  const { branchId: branchIdParam, from: fromParam, to: toParam, collectorId: collectorIdParam } = await searchParams;

  const defaultFrom = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const from = fromParam && !Number.isNaN(Date.parse(fromParam)) ? fromParam : defaultFrom;
  const to = toParam && !Number.isNaN(Date.parse(toParam)) ? toParam : today();

  const branches = isSuperAdmin ? await listActiveBranches() : [];
  const branchId = isSuperAdmin ? (branchIdParam ? Number(branchIdParam) : null) : user.branchId;
  const collectorId = collectorIdParam ? Number(collectorIdParam) : undefined;

  const collectors = branchId ? await listLoanCollectorsForBranch(branchId) : [];

  const payments = await listSupplementaryPayments({ branchId, from, to, collectorId });
  const earlyCount = payments.filter((p) => p.classification === "early").length;
  const lateCount = payments.filter((p) => p.classification === "late").length;

  return (
    <div className="space-y-4">
      <BackLink href="/reports" label="Back to Reports" />
      <div>
        <h1 className="text-lg font-semibold">Supplementary Payments</h1>
        <p className="text-sm text-muted-foreground">
          Payments collected on a day other than the client&apos;s assigned collection day — detected automatically, no manual
          tagging required.
        </p>
      </div>

      <GlassPanel className="p-4">
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
          {collectors.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground" htmlFor="collectorId">
                Collector
              </label>
              <select
                id="collectorId"
                name="collectorId"
                defaultValue={collectorId ? String(collectorId) : ""}
                className={nativeSelectClass}
              >
                <option value="">All collectors</option>
                {collectors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName}
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

      <GlassPanel className="grid grid-cols-3 gap-4 p-6">
        <div>
          <p className="text-xs text-muted-foreground">Total Supplementary</p>
          <p className="text-lg font-semibold">{payments.length}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Early</p>
          <p className="text-lg font-semibold text-primary">{earlyCount}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Late</p>
          <p className="text-lg font-semibold text-destructive">{lateCount}</p>
        </div>
      </GlassPanel>

      <GlassPanel className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              {isSuperAdmin && <TableHead>Branch</TableHead>}
              <TableHead>Assigned Day</TableHead>
              <TableHead>Actual Day</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Payment ID</TableHead>
              {canEdit && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p) => {
              const amount =
                Number(p.loanRecovery) + Number(p.newSavings) + Number(p.profitInterest) + Number(p.serviceCharge);
              return (
                <TableRow key={p.id}>
                  <TableCell>{p.transactionDate}</TableCell>
                  <TableCell>
                    <span className="font-medium">{p.clientName}</span>{" "}
                    <span className="text-xs text-muted-foreground">{p.clientCode}</span>
                  </TableCell>
                  {isSuperAdmin && <TableCell className="text-muted-foreground">{p.branchName}</TableCell>}
                  <TableCell className="text-muted-foreground">{WEEKDAY_NAMES[p.assignedDay]}</TableCell>
                  <TableCell className="text-muted-foreground">{WEEKDAY_NAMES[p.actualDay]}</TableCell>
                  <TableCell>
                    <Badge variant={p.classification === "early" ? "default" : "destructive"}>
                      {p.classification === "early" ? "Early" : "Late"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{money(amount)}</TableCell>
                  <TableCell className="text-muted-foreground">{p.paymentId ?? "—"}</TableCell>
                  {canEdit && (
                    <TableCell>
                      <NotSupplementaryButton transactionId={p.id} />
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {payments.length === 0 && (
              <TableRow>
                <TableCell colSpan={isSuperAdmin ? (canEdit ? 9 : 8) : canEdit ? 8 : 7} className="text-center text-muted-foreground">
                  No supplementary payments in this range — everyone paid on their assigned day.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </GlassPanel>

      <p className="text-xs text-muted-foreground">
        If a payment shows here only because it was entered into the system late — not because it was actually collected
        off-day — use &quot;Not supplementary&quot; to correct it.
      </p>
    </div>
  );
}
