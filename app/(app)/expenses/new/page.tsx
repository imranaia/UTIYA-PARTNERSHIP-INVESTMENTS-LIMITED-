import { requireModule } from "@/lib/auth/session";
import { listActiveBranches } from "@/lib/db/branches";
import { listExpenseCategories } from "@/lib/db/expenses";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { BackLink } from "@/components/layout/BackLink";
import { ExpenseForm } from "./ExpenseForm";

export default async function NewExpensePage() {
  const user = await requireModule("expenses", "create");
  const isSuperAdmin = user.roleKey === "super_admin";

  const [branches, categories] = await Promise.all([
    isSuperAdmin ? listActiveBranches() : Promise.resolve([]),
    listExpenseCategories(),
  ]);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <BackLink href="/expenses" label="Back to Expenses" />
      <h1 className="text-lg font-semibold">Add expense</h1>
      <GlassPanel className="p-6">
        <ExpenseForm branches={branches} categories={categories} showBranchSelect={isSuperAdmin} />
      </GlassPanel>
    </div>
  );
}
