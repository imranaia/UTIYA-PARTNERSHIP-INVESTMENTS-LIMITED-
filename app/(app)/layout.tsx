import { requireActiveUser, getSidebarModules } from "@/lib/auth/session";
import { getUserProfile } from "@/lib/db/users";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { TourProvider } from "@/components/tour/TourProvider";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireActiveUser();
  const [modules, profile] = await Promise.all([getSidebarModules(user.roleId), getUserProfile(user.userId)]);

  return (
    <TourProvider username={user.username} modules={modules}>
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 gap-4 p-4">
        <Sidebar modules={modules} />
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <TopBar
            modules={modules}
            fullName={profile?.fullName ?? user.fullName}
            roleName={profile?.roleName ?? user.roleKey}
            branchName={profile?.branchName ?? null}
          />
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </TourProvider>
  );
}
