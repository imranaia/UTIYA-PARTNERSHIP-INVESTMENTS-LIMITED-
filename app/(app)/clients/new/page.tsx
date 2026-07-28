import { requireModule } from "@/lib/auth/session";
import { listActiveBranches } from "@/lib/db/branches";
import { listLoanCollectorsForBranch, listLoanCollectorsByBranch } from "@/lib/db/users";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { BackLink } from "@/components/layout/BackLink";
import { ClientForm } from "./ClientForm";

export default async function NewClientPage() {
  const user = await requireModule("clients", "create");
  const isSuperAdmin = user.roleKey === "super_admin";

  const branches = isSuperAdmin ? await listActiveBranches() : [];

  const collectorsByBranch = isSuperAdmin
    ? await listLoanCollectorsByBranch(branches.map((b) => b.id))
    : new Map(user.branchId ? [[user.branchId, await listLoanCollectorsForBranch(user.branchId)]] : []);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <BackLink href="/clients" label="Back to Clients" />
        <h1 className="text-lg font-semibold">Add client</h1>
      </div>
      <GlassPanel className="p-6">
        <ClientForm
          branches={branches}
          collectorsByBranch={Object.fromEntries(collectorsByBranch)}
          showBranchSelect={isSuperAdmin}
          defaultBranchId={isSuperAdmin ? undefined : (user.branchId ?? undefined)}
        />
      </GlassPanel>
    </div>
  );
}
