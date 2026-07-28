import { notFound } from "next/navigation";
import { requireModule } from "@/lib/auth/session";
import { getRole, getRolePermissionMatrix } from "@/lib/db/roles";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { BackLink } from "@/components/layout/BackLink";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { updateRolePermissionsAction } from "../actions";
import { SubmitButton } from "./SubmitButton";

export default async function RolePermissionsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModule("roles", "view");
  const { id } = await params;
  const roleId = Number(id);
  if (!Number.isInteger(roleId)) notFound();

  const role = await getRole(roleId);
  if (!role) notFound();

  const matrix = await getRolePermissionMatrix(roleId);
  const isLocked = role.key === "super_admin";
  const action = updateRolePermissionsAction.bind(null, roleId);

  return (
    <div className="space-y-4">
      <BackLink href="/admin/roles" label="Back to Roles" />
      <div className="flex items-center gap-2.5">
        <h1 className="text-lg font-semibold">{role.name}</h1>
        {role.isSystem && (
          <Badge variant="secondary" className="text-xs">
            Preset
          </Badge>
        )}
      </div>

      {isLocked && (
        <p className="text-sm text-muted-foreground">
          The Super Admin role always has full access to every module and cannot be changed.
        </p>
      )}

      <form action={isLocked ? undefined : action}>
        <GlassPanel className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-3 text-left font-medium">Module</th>
                <th className="px-3 py-3 text-center font-medium">View</th>
                <th className="px-3 py-3 text-center font-medium">Create</th>
                <th className="px-3 py-3 text-center font-medium">Edit</th>
                <th className="px-3 py-3 text-center font-medium">Delete</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((m) => (
                <tr key={m.moduleId} className="border-b border-border last:border-none">
                  <td className="px-5 py-3">{m.moduleLabel}</td>
                  <td className="px-3 py-3 text-center">
                    <Checkbox name={`view_${m.moduleId}`} defaultChecked={m.canView} disabled={isLocked} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Checkbox name={`create_${m.moduleId}`} defaultChecked={m.canCreate} disabled={isLocked} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Checkbox name={`edit_${m.moduleId}`} defaultChecked={m.canEdit} disabled={isLocked} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Checkbox name={`delete_${m.moduleId}`} defaultChecked={m.canDelete} disabled={isLocked} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassPanel>

        {!isLocked && (
          <div className="mt-4 flex justify-end">
            <SubmitButton />
          </div>
        )}
      </form>
    </div>
  );
}
