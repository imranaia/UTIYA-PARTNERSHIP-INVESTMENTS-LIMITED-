import Link from "next/link";
import { Plus } from "lucide-react";
import { requireModule } from "@/lib/auth/session";
import { listClients } from "@/lib/db/clients";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireModule("clients", "view");
  const { q } = await searchParams;
  const isSuperAdmin = user.roleKey === "super_admin";

  const clients = await listClients({ branchId: isSuperAdmin ? null : user.branchId, search: q });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Clients</h1>
        <Button asChild size="sm" className="gap-1.5">
          <Link href="/clients/new">
            <Plus className="size-4" />
            Add Client
          </Link>
        </Button>
      </div>

      <form className="flex gap-2">
        <Input name="q" defaultValue={q} placeholder="Search by name or client code…" className="max-w-sm" />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <GlassPanel className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client Code</TableHead>
              <TableHead>Name</TableHead>
              {isSuperAdmin && <TableHead>Branch</TableHead>}
              <TableHead>Group</TableHead>
              <TableHead>Collector</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((c) => (
              <TableRow key={c.id} className="cursor-pointer">
                <TableCell className="font-medium">
                  <Link href={`/clients/${c.id}`} className="hover:underline">
                    {c.clientCode}
                  </Link>
                </TableCell>
                <TableCell>{c.fullName}</TableCell>
                {isSuperAdmin && <TableCell className="text-muted-foreground">{c.branchName}</TableCell>}
                <TableCell className="text-muted-foreground">{c.groupName || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{c.loanCollectorName || "—"}</TableCell>
                <TableCell>
                  <Badge variant={c.status === "active" ? "default" : "secondary"} className="capitalize">
                    {c.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {clients.length === 0 && (
              <TableRow>
                <TableCell colSpan={isSuperAdmin ? 6 : 5} className="text-center text-muted-foreground">
                  No clients yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </GlassPanel>
    </div>
  );
}
