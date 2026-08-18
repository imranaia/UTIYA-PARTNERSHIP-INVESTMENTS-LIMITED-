import { requirePortalClient } from "@/lib/auth/session";
import { getActiveLoanSummary } from "@/lib/db/loanAgreements";
import { listClientTransactions } from "@/lib/db/clients";
import { listNoticesForPortal } from "@/lib/db/clientNotices";
import { GlassPanel } from "@/components/layout/GlassPanel";

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function PortalDashboardPage() {
  const session = await requirePortalClient();

  const [loanSummary, transactions, notices] = await Promise.all([
    getActiveLoanSummary(session.clientId),
    listClientTransactions(session.clientId),
    session.branchId ? listNoticesForPortal(session.clientId, session.branchId) : Promise.resolve([]),
  ]);

  const currentSavings = transactions[0]?.savingsBalanceCf ?? "0";

  return (
    <div className="space-y-4">
      <GlassPanel className="grid grid-cols-2 gap-4 p-6">
        <div>
          <p className="text-xs text-muted-foreground">Next payment due</p>
          <p className="text-lg font-semibold">
            {loanSummary?.nextDue ? `${money(loanSummary.nextDue.dueAmount)}` : "—"}
          </p>
          {loanSummary?.nextDue && <p className="text-xs text-muted-foreground">{loanSummary.nextDue.dueDate}</p>}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Remaining balance</p>
          <p className="text-lg font-semibold text-primary">{loanSummary ? money(loanSummary.remainingBalance) : "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Savings balance</p>
          <p className="text-lg font-semibold">{money(currentSavings)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Principal</p>
          <p className="text-lg font-semibold">{loanSummary ? money(loanSummary.agreement.principalAmount) : "—"}</p>
        </div>
      </GlassPanel>

      {!loanSummary && (
        <GlassPanel className="p-6 text-center text-sm text-muted-foreground">No active principal agreement yet.</GlassPanel>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Notices</h2>
        {notices.length === 0 ? (
          <GlassPanel className="p-4 text-sm text-muted-foreground">Nothing from your branch yet.</GlassPanel>
        ) : (
          <div className="space-y-2">
            {notices.map((n) => (
              <GlassPanel key={n.id} className="p-4">
                <p className="text-sm">{n.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</p>
              </GlassPanel>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
