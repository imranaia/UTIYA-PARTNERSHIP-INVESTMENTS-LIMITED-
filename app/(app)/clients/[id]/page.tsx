import { notFound } from "next/navigation";
import { requireModule } from "@/lib/auth/session";
import { getClientById, listClientTransactions } from "@/lib/db/clients";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireModule("clients", "view");
  const { id } = await params;
  const clientId = Number(id);
  if (!Number.isInteger(clientId)) notFound();

  const client = await getClientById(clientId);
  if (!client) notFound();
  if (user.roleKey !== "super_admin" && client.branchId !== user.branchId) notFound();

  const transactions = await listClientTransactions(clientId);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <h1 className="text-lg font-semibold">{client.fullName}</h1>
        <Badge variant={client.status === "active" ? "default" : "secondary"} className="capitalize">
          {client.status}
        </Badge>
      </div>

      <GlassPanel className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-3">
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
      </GlassPanel>

      <h2 className="text-sm font-semibold text-muted-foreground">Transaction history</h2>
      <GlassPanel className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Loan Disb.</TableHead>
              <TableHead className="text-right">Recall</TableHead>
              <TableHead className="text-right">New Savings</TableHead>
              <TableHead className="text-right">Collateral In</TableHead>
              <TableHead className="text-right">Collateral Out</TableHead>
              <TableHead className="text-right">Savings B/F</TableHead>
              <TableHead className="text-right">Savings C/F</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.transactionDate}</TableCell>
                <TableCell className="text-right">{money(t.loanDisbursement)}</TableCell>
                <TableCell className="text-right">{money(t.loanRecovery)}</TableCell>
                <TableCell className="text-right">{money(t.newSavings)}</TableCell>
                <TableCell className="text-right">{money(t.collateralTransferIn)}</TableCell>
                <TableCell className="text-right">{money(t.collateralTransferOut)}</TableCell>
                <TableCell className="text-right">{money(t.savingsBalanceBf)}</TableCell>
                <TableCell className="text-right">{money(t.savingsBalanceCf)}</TableCell>
              </TableRow>
            ))}
            {transactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
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
