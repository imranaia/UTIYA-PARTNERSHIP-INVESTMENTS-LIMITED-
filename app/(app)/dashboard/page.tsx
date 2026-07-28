import { requireActiveUser } from "@/lib/auth/session";
import { GlassPanel } from "@/components/layout/GlassPanel";

export default async function DashboardPage() {
  const user = await requireActiveUser();

  return (
    <div className="space-y-4">
      <GlassPanel className="p-6">
        <h1 className="text-lg font-semibold">Welcome, {user.fullName}</h1>
        <p className="text-sm text-muted-foreground">
          This is your dashboard. KPI summaries (today&apos;s disbursement, recovery, savings) will appear here.
        </p>
      </GlassPanel>
    </div>
  );
}
