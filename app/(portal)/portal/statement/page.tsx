import { requirePortalClient } from "@/lib/auth/session";
import { getClientById, listClientTransactions } from "@/lib/db/clients";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { PrintButton } from "./PrintButton";

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function PortalStatementPage() {
  const session = await requirePortalClient();
  const [client, transactions] = await Promise.all([
    getClientById(session.clientId),
    listClientTransactions(session.clientId),
  ]);

  if (!client) return null;
  const history = [...transactions].reverse(); // oldest first for a statement read top-to-bottom

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Statement</h1>
        <PrintButton />
      </div>

      <div className="print-area rounded-lg border border-border bg-white p-6 text-black">
        <div className="flex items-center gap-2.5 border-b border-black/10 pb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="" width={36} height={36} />
          <div>
            <p className="text-sm font-semibold leading-tight">Alkhair Microcredit Limited</p>
            <p className="text-xs text-black/60 leading-tight">{client.branchName}</p>
          </div>
        </div>

        <div className="mt-3 space-y-0.5 text-sm">
          <p className="font-medium">{client.fullName}</p>
          <p className="text-black/60">{client.clientCode}</p>
        </div>

        <table className="mt-4 w-full text-xs">
          <thead>
            <tr className="border-b border-black/10 text-left text-black/60">
              <th className="py-1">Date</th>
              <th className="py-1 text-right">Principal Disb.</th>
              <th className="py-1 text-right">Principal Rec.</th>
              <th className="py-1 text-right">New Savings</th>
              <th className="py-1 text-right">Savings C/F</th>
            </tr>
          </thead>
          <tbody>
            {history.map((t) => (
              <tr key={t.id} className="border-b border-black/5">
                <td className="py-1">{t.transactionDate}</td>
                <td className="py-1 text-right">{money(t.loanDisbursement)}</td>
                <td className="py-1 text-right">{money(t.loanRecovery)}</td>
                <td className="py-1 text-right">{money(t.newSavings)}</td>
                <td className="py-1 text-right">{money(t.savingsBalanceCf)}</td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-black/60">
                  No transactions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-6 flex items-center justify-between border-t border-black/10 pt-3 text-xs text-black/60">
          <span>Printed {new Date().toLocaleString()}</span>
        </div>
      </div>

      <GlassPanel className="p-4 text-xs text-muted-foreground">
        This statement is read-only. Contact your branch for corrections.
      </GlassPanel>
    </div>
  );
}
