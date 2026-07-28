import Link from "next/link";
import { requireModule } from "@/lib/auth/session";
import { listClients, getClientById, listClientTransactions } from "@/lib/db/clients";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function ClientStatementPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; clientId?: string }>;
}) {
  const user = await requireModule("reports", "view");
  const isSuperAdmin = user.roleKey === "super_admin";
  const { q, clientId: clientIdParam } = await searchParams;
  const clientId = clientIdParam ? Number(clientIdParam) : null;

  if (!clientId) {
    const results = q ? await listClients({ branchId: isSuperAdmin ? null : user.branchId, search: q }) : [];

    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-semibold">Client Statement</h1>
          <p className="text-sm text-muted-foreground">Search for a client to see their full statement.</p>
        </div>

        <GlassPanel className="p-4">
          <form className="flex gap-2">
            <Input name="q" defaultValue={q} placeholder="Search by name or client code…" className="max-w-sm" autoFocus />
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
        </GlassPanel>

        {q && (
          <GlassPanel className="overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client Code</TableHead>
                  <TableHead>Name</TableHead>
                  {isSuperAdmin && <TableHead>Branch</TableHead>}
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <Link href={`/reports/client-statement?clientId=${c.id}`} className="hover:underline">
                        {c.clientCode}
                      </Link>
                    </TableCell>
                    <TableCell>{c.fullName}</TableCell>
                    {isSuperAdmin && <TableCell className="text-muted-foreground">{c.branchName}</TableCell>}
                    <TableCell>
                      <Badge variant={c.status === "active" ? "default" : "secondary"} className="capitalize">
                        {c.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {results.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isSuperAdmin ? 4 : 3} className="text-center text-muted-foreground">
                      No clients match &quot;{q}&quot;.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </GlassPanel>
        )}
      </div>
    );
  }

  const client = await getClientById(clientId);
  if (!client || (user.roleKey !== "super_admin" && client.branchId !== user.branchId)) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold">Client Statement</h1>
        <GlassPanel className="p-6 text-center text-muted-foreground">Client not found.</GlassPanel>
      </div>
    );
  }

  const transactions = await listClientTransactions(clientId);

  const totals = transactions.reduce(
    (acc, t) => ({
      loanDisbursement: acc.loanDisbursement + Number(t.loanDisbursement),
      loanRecovery: acc.loanRecovery + Number(t.loanRecovery),
      profitInterest: acc.profitInterest + Number(t.profitInterest),
      serviceCharge: acc.serviceCharge + Number(t.serviceCharge),
      newSavings: acc.newSavings + Number(t.newSavings),
      savingsRecall: acc.savingsRecall + Number(t.savingsRecall),
    }),
    { loanDisbursement: 0, loanRecovery: 0, profitInterest: 0, serviceCharge: 0, newSavings: 0, savingsRecall: 0 },
  );
  const currentSavings = transactions[0]?.savingsBalanceCf ?? "0";
  const outstandingLoan = totals.loanDisbursement - totals.loanRecovery;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Client Statement</h1>
          <p className="text-sm text-muted-foreground">Full transaction history and summary for a single client.</p>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link href="/reports/client-statement">← New search</Link>
        </Button>
      </div>

      <GlassPanel className="p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <h2 className="text-base font-semibold">{client.fullName}</h2>
          <Badge variant={client.status === "active" ? "default" : "secondary"} className="capitalize">
            {client.status}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Client code</p>
            <p className="font-medium">{client.clientCode}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Branch</p>
            <p className="font-medium">{client.branchName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Group</p>
            <p className="font-medium">{client.groupName || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Phone</p>
            <p className="font-medium">{client.phone || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Enrollment date</p>
            <p className="font-medium">{client.enrollmentDate}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Loan collector</p>
            <p className="font-medium">{client.loanCollectorName || "Unassigned"}</p>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Current Savings</p>
          <p className="text-lg font-semibold text-primary">{money(currentSavings)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Outstanding Loan</p>
          <p className="text-lg font-semibold">{money(outstandingLoan)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total Disbursed (lifetime)</p>
          <p className="text-lg font-semibold">{money(totals.loanDisbursement)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total Recovered (lifetime)</p>
          <p className="text-lg font-semibold">{money(totals.loanRecovery)}</p>
        </div>
      </GlassPanel>

      <h2 className="text-sm font-semibold text-muted-foreground">Transaction history ({transactions.length})</h2>
      <GlassPanel className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Payment ID</TableHead>
              <TableHead className="text-right">Loan Disb.</TableHead>
              <TableHead className="text-right">Loan Recovery</TableHead>
              <TableHead className="text-right">Interest</TableHead>
              <TableHead className="text-right">Service Chg.</TableHead>
              <TableHead className="text-right">New Savings</TableHead>
              <TableHead className="text-right">Savings Recall</TableHead>
              <TableHead className="text-right">Savings C/F</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.transactionDate}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{t.paymentId ?? "—"}</TableCell>
                <TableCell className="text-right">{money(t.loanDisbursement)}</TableCell>
                <TableCell className="text-right">{money(t.loanRecovery)}</TableCell>
                <TableCell className="text-right">{money(t.profitInterest)}</TableCell>
                <TableCell className="text-right">{money(t.serviceCharge)}</TableCell>
                <TableCell className="text-right">{money(t.newSavings)}</TableCell>
                <TableCell className="text-right">{money(t.savingsRecall)}</TableCell>
                <TableCell className="text-right font-medium">{money(t.savingsBalanceCf)}</TableCell>
              </TableRow>
            ))}
            {transactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  No transactions recorded yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </GlassPanel>
    </div>
  );
}
