import Link from "next/link";
import { LogOut } from "lucide-react";
import { requirePortalClient } from "@/lib/auth/session";
import { getClientById } from "@/lib/db/clients";
import { logout } from "@/app/(public)/login/actions";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePortalClient();
  const client = await getClientById(session.clientId);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
      <header className="glass-panel flex items-center justify-between gap-3 p-4">
        <Logo />
        <form action={logout}>
          <Button type="submit" variant="ghost" size="sm" className="gap-1.5">
            <LogOut className="size-4" />
            Log out
          </Button>
        </form>
      </header>

      {client && (
        <div>
          <h1 className="text-lg font-semibold">{client.fullName}</h1>
          <p className="text-sm text-muted-foreground">{client.clientCode}</p>
        </div>
      )}

      <nav className="glass-panel flex gap-1 p-1.5">
        <Link href="/portal" className="flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium hover:bg-accent/40">
          Dashboard
        </Link>
        <Link
          href="/portal/statement"
          className="flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium hover:bg-accent/40"
        >
          Statement
        </Link>
      </nav>

      <main className="flex-1">{children}</main>
    </div>
  );
}
