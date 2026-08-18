import { requireModule } from "@/lib/auth/session";
import { listPendingChanges } from "@/lib/db/pendingChanges";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApprovalActions } from "./ApprovalActions";

const FIELD_LABELS: Record<string, string> = {
  fullName: "Full name",
  phone: "Phone",
  address: "Address",
  groupName: "Group",
  businessType: "Trade / business",
  businessLocation: "Business location",
  loanCollectorId: "Collections officer",
  loanDisbursement: "Principal disbursement",
  loanRecovery: "Principal recovery",
  profitInterest: "Profit",
  serviceCharge: "Service charge",
  newSavings: "New savings",
  savingsRecall: "Savings recall",
  collateralTransferIn: "Collateral in",
  collateralTransferOut: "Collateral out",
  notes: "Notes",
  supplementaryOverride: "Not supplementary",
};

function formatChanges(proposedChanges: unknown): string {
  if (!proposedChanges || typeof proposedChanges !== "object") return "—";
  const entries = Object.entries(proposedChanges as Record<string, unknown>).filter(([, v]) => v !== undefined && v !== "");
  if (entries.length === 0) return "No changes";
  return entries.map(([k, v]) => `${FIELD_LABELS[k] ?? k}: ${String(v)}`).join(", ");
}

export default async function ApprovalsPage() {
  const user = await requireModule("approvals", "view");
  const isSuperAdmin = user.roleKey === "super_admin";

  const rows = await listPendingChanges(isSuperAdmin ? null : user.branchId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Approvals</h1>
        <p className="text-sm text-muted-foreground">
          Edits submitted by non-admin staff wait here until an admin approves or rejects them.
        </p>
      </div>

      <GlassPanel className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Requested</TableHead>
              <TableHead>By</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Proposed changes</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-muted-foreground">{new Date(r.requestedAt).toLocaleString()}</TableCell>
                <TableCell>{r.requestedByName}</TableCell>
                <TableCell className="capitalize">{r.entityType === "client" ? "Client" : "Transaction"}</TableCell>
                <TableCell>
                  {r.clientFullName ? (
                    <>
                      {r.clientFullName} <span className="text-xs text-muted-foreground">{r.clientCode}</span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">#{r.entityId}</span>
                  )}
                </TableCell>
                <TableCell className="max-w-sm truncate text-xs text-muted-foreground">
                  {formatChanges(r.proposedChanges)}
                </TableCell>
                <TableCell className="text-right">
                  <ApprovalActions id={r.id} />
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No pending changes.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </GlassPanel>
    </div>
  );
}
