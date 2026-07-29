import { requireModule, getModulePermission } from "@/lib/auth/session";
import { listUsersForBranch } from "@/lib/db/users";
import { listRoles } from "@/lib/db/roles";
import { listActiveBranches } from "@/lib/db/branches";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { NewUserDialog } from "./NewUserDialog";
import { EditUserDialog } from "./EditUserDialog";
import { UserRowActions } from "./UserRowActions";

const BRANCH_ADMIN_ASSIGNABLE_ROLE_KEYS = ["loan_collector", "expense_officer", "viewer"];

export default async function UsersPage() {
  const sessionUser = await requireModule("users", "view");
  const { canCreate, canEdit } = await getModulePermission("users");
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
        {canCreate && <NewUserDialog roles={assignableRoles} branches={branches} showBranchSelect={isSuperAdmin} />}
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
                  {canEdit && (
                    <div className="flex justify-end">
                      <EditUserDialog
                        user={{ id: u.id, username: u.username, fullName: u.fullName, phone: u.phone, roleId: u.roleId, branchId: u.branchId }}
                        roles={
                          assignableRoles.some((r) => r.id === u.roleId)
                            ? assignableRoles
                            : [...assignableRoles, { id: u.roleId, name: u.roleName }]
                        }
                        branches={branches}
                        showBranchSelect={isSuperAdmin}
                      />
                      <UserRowActions userId={u.id} isActive={u.isActive} />
                    </div>
                  )}
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
