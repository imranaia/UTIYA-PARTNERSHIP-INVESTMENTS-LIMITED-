import { requireModule } from "@/lib/auth/session";
import { listActiveBranches } from "@/lib/db/branches";
import { listLoanCollectorsForBranch } from "@/lib/db/users";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { ClientForm } from "./ClientForm";

export default async function NewClientPage() {
  const user = await requireModule("clients", "create");
  const isSuperAdmin = user.roleKey === "super_admin";

  const [branches, collectors] = await Promise.all([
    isSuperAdmin ? listActiveBranches() : Promise.resolve([]),
    !isSuperAdmin && user.branchId ? listLoanCollectorsForBranch(user.branchId) : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-lg font-semibold">Add client</h1>
      <GlassPanel className="p-6">
        <ClientForm branches={branches} collectors={collectors} showBranchSelect={isSuperAdmin} />
      </GlassPanel>
    </div>
  );
}
