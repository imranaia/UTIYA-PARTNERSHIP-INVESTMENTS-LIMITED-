import { requireModule } from "@/lib/auth/session";
import { listUsersForBranch } from "@/lib/db/users";
import { listRoles } from "@/lib/db/roles";
import { listActiveBranches } from "@/lib/db/branches";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { NewUserDialog } from "./NewUserDialog";
import { UserRowActions } from "./UserRowActions";

const BRANCH_ADMIN_ASSIGNABLE_ROLE_KEYS = ["loan_collector", "expense_officer", "viewer"];

export default async function UsersPage() {
  const sessionUser = await requireModule("users", "view");
  const isSuperAdmin = sessionUser.roleKey === "super_admin";

  const [users, allRoles, branches] = await Promise.all([
    listUsersForBranch(isSuperAdmin ? null : sessionUser.branchId),
    listRoles(),
    isSuperAdmin ? listActiveBranches() : Promise.resolve([]),
  ]);

  const assignableRoles = isSuperAdmin ? allRoles : allRoles.filter((r) => BRANCH_ADMIN_ASSIGNABLE_ROLE_KEYS.includes(r.key));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Users</h1>
        <NewUserDialog roles={assignableRoles} branches={branches} showBranchSelect={isSuperAdmin} />
      </div>

      <GlassPanel data-tour="tour-admin-users" className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Full name</TableHead>
              <TableHead>Role</TableHead>
              {isSuperAdmin && <TableHead>Branch</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.username}</TableCell>
                <TableCell>{u.fullName}</TableCell>
                <TableCell>{u.roleName}</TableCell>
                {isSuperAdmin && <TableCell className="text-muted-foreground">{u.branchName || "—"}</TableCell>}
                <TableCell>
                  <Badge variant={u.isActive ? "default" : "secondary"}>{u.isActive ? "Active" : "Inactive"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <UserRowActions userId={u.id} isActive={u.isActive} />
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={isSuperAdmin ? 6 : 5} className="text-center text-muted-foreground">
                  No users yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </GlassPanel>
    </div>
  );
}
