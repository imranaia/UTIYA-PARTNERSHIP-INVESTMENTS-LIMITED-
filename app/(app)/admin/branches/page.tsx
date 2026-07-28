import { requireModule } from "@/lib/auth/session";
import { listBranches } from "@/lib/db/branches";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NewBranchDialog } from "./NewBranchDialog";
import { BranchActiveToggle } from "./BranchActiveToggle";

export default async function BranchesPage() {
  await requireModule("branches", "view");
  const branches = await listBranches();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Branches</h1>
        <NewBranchDialog />
      </div>

      <GlassPanel className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {branches.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.code}</TableCell>
                <TableCell>{b.name}</TableCell>
                <TableCell className="text-muted-foreground">{b.address || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{b.phone || "—"}</TableCell>
                <TableCell>
                  <BranchActiveToggle branchId={b.id} isActive={b.isActive} />
                </TableCell>
              </TableRow>
            ))}
            {branches.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No branches yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </GlassPanel>
    </div>
  );
}
