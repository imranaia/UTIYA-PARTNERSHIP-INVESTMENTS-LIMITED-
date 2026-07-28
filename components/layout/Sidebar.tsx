"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/Logo";

export type SidebarModule = {
  key: string;
  label: string;
  icon: string | null;
  routePrefix: string;
};

function ModuleIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = (name && (Icons as unknown as Record<string, LucideIcon>)[name]) || Icons.Circle;
  return <Icon className={className} />;
}

export function NavList({ modules, onNavigate }: { modules: SidebarModule[]; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {modules.map((mod) => {
        const active = pathname === mod.routePrefix || pathname.startsWith(mod.routePrefix + "/");
        return (
          <Link
            key={mod.key}
            href={mod.routePrefix}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-brand/15 text-brand-foreground text-foreground"
                : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
            )}
          >
            <ModuleIcon name={mod.icon} className="size-4.5 shrink-0" />
            {mod.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ modules }: { modules: SidebarModule[] }) {
  return (
    <aside className="glass-panel sticky top-4 hidden h-[calc(100vh-2rem)] w-64 shrink-0 flex-col gap-6 p-5 md:flex">
      <Logo />
      <div className="flex-1 overflow-y-auto">
        <NavList modules={modules} />
      </div>
    </aside>
  );
}
