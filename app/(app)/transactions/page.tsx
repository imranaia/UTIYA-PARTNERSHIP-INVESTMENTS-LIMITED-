import { requireModule, getModulePermission } from "@/lib/auth/session";
import { listActiveBranches, getBranch } from "@/lib/db/branches";
import { listLoanCollectorsForBranch, listActiveUsersForBranch } from "@/lib/db/users";
import { listDailyEntryRows } from "@/lib/db/transactions";
import { listDutyAssignments } from "@/lib/db/dutyAssignments";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DailyTransactionsTable } from "./DailyTransactionsTable";
import { DutyRoster } from "./DutyRoster";

function today() {
  return new Date().toISOString().slice(0, 10);
}

const nativeSelectClass =
  "h-8 w-44 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; branchId?: string; collectorId?: string }>;
}) {
  const user = await requireModule("transactions", "view");
  const { canCreate, canEdit } = await getModulePermission("transactions");
  const isSuperAdmin = user.roleKey === "super_admin";
  const { date, branchId: branchIdParam, collectorId: collectorIdParam } = await searchParams;

  const transactionDate = date && !Number.isNaN(Date.parse(date)) ? date : today();

  const branches = isSuperAdmin ? await listActiveBranches() : [];
  const branchId = isSuperAdmin ? (branchIdParam ? Number(branchIdParam) : (branches[0]?.id ?? null)) : user.branchId;

  const collectors = branchId ? await listLoanCollectorsForBranch(branchId) : [];
  const collectorId = collectorIdParam ? Number(collectorIdParam) : undefined;

  const [rows, dutyUsers, dutyAssignments, branch] = branchId
    ? await Promise.all([
        listDailyEntryRows({ branchId, collectorId, date: transactionDate }),
        listActiveUsersForBranch(branchId),
        listDutyAssignments({ branchId, date: transactionDate }),
        getBranch(branchId),
      ])
    : [[], [], [], null];

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Daily Transactions</h1>

      <GlassPanel className="p-4">
        <form className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground" htmlFor="date">
              Date
            </label>
            <Input id="date" name="date" type="date" defaultValue={transactionDate} className="w-40" />
          </div>
          {isSuperAdmin && (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground" htmlFor="branchId">
                Branch
              </label>
              <select id="branchId" name="branchId" defaultValue={branchId ? String(branchId) : ""} className={nativeSelectClass}>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {collectors.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground" htmlFor="collectorId">
                Collector
              </label>
              <select
                id="collectorId"
                name="collectorId"
                defaultValue={collectorId ? String(collectorId) : ""}
                className={nativeSelectClass}
              >
                <option value="">All collectors</option>
                {collectors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Button type="submit" variant="secondary">
            Filter
          </Button>
        </form>
      </GlassPanel>

      {!branchId ? (
        <GlassPanel className="p-6 text-center text-muted-foreground">Select a branch to begin.</GlassPanel>
      ) : (
        <>
          <DutyRoster
            branchId={branchId}
            date={transactionDate}
            users={dutyUsers}
            assignments={dutyAssignments}
            readOnly={!canEdit}
          />
          <DailyTransactionsTable
            rows={rows}
            transactionDate={transactionDate}
            branchId={branchId}
            readOnly={!canCreate}
            branchName={branch?.name ?? ""}
            preparedBy={user.fullName}
          />
        </>
      )}
    </div>
  );
}
