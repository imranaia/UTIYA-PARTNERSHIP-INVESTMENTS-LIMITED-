import Link from "next/link";
import { requireModule } from "@/lib/auth/session";
import { listLoanMaturityEvents } from "@/lib/db/loanMaturity";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { BackLink } from "@/components/layout/BackLink";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function money(n: string | number | null) {
  if (n === null) return "—";
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function LoanMaturityPage() {
  const user = await requireModule("reports", "view");
  const isSuperAdmin = user.roleKey === "super_admin";

  const rows = await listLoanMaturityEvents({ branchId: isSuperAdmin ? null : user.branchId });
  const notRenewedCount = rows.filter((r) => !r.renewed).length;

  return (
    <div className="space-y-4">
      <BackLink href="/reports" label="Back to Reports" />
      <div>
        <h1 className="text-lg font-semibold">Loan Maturity</h1>
        <p className="text-sm text-muted-foreground">
          Clients whose loan cycle ended, and whether they took a new loan — matches the source ledger&apos;s own
          &quot;Returning Clients of the Day not Renewing their Loans&quot; tracking.
        </p>
      </div>

      <GlassPanel className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">Total Events</p>
          <p className="text-lg font-semibold">{rows.length}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Renewed</p>
          <p className="text-lg font-semibold text-primary">{rows.length - notRenewedCount}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Not Renewing</p>
          <p className="text-lg font-semibold text-destructive">{notRenewedCount}</p>
        </div>
      </GlassPanel>

      <GlassPanel className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              {isSuperAdmin && <TableHead>Branch</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount With Client</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Recorded By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.maturedAt}</TableCell>
                <TableCell>
                  <Link href={`/clients/${r.clientId}`} className="font-medium hover:underline">
                    {r.clientName}
                  </Link>{" "}
                  <span className="text-xs text-muted-foreground">{r.clientCode}</span>
                </TableCell>
                {isSuperAdmin && <TableCell className="text-muted-foreground">{r.branchName}</TableCell>}
                <TableCell>
                  <Badge variant={r.renewed ? "default" : "destructive"}>{r.renewed ? "Renewed" : "Not Renewing"}</Badge>
                </TableCell>
                <TableCell className="text-right">{money(r.amountWithClient)}</TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">{r.notes || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{r.recordedByName}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={isSuperAdmin ? 7 : 6} className="text-center text-muted-foreground">
                  No loan maturity events recorded yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </GlassPanel>
    </div>
  );
}
