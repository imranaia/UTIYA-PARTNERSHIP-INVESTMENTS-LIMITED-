import { requireModule } from "@/lib/auth/session";
import { listActiveBranches } from "@/lib/db/branches";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { ReconciliationForm } from "./ReconciliationForm";

export default async function NewReconciliationPage() {
  const user = await requireModule("bank_reconciliation", "create");
  const isSuperAdmin = user.roleKey === "super_admin";

  const branches = isSuperAdmin ? await listActiveBranches() : [];

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-lg font-semibold">Add bank reconciliation</h1>
      <GlassPanel className="p-6">
        <ReconciliationForm branches={branches} showBranchSelect={isSuperAdmin} />
      </GlassPanel>
    </div>
  );
}
