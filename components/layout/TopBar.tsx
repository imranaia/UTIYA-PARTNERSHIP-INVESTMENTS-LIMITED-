"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, LogOut, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileSidebar } from "./MobileSidebar";
import type { SidebarModule } from "./Sidebar";
import { logout } from "@/app/(public)/login/actions";
import { TourIconTrigger } from "@/components/tour/TourTriggerButton";
import Link from "next/link";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function TopBar({
  modules,
  fullName,
  roleName,
  branchName,
}: {
  modules: SidebarModule[];
  fullName: string;
  roleName: string;
  branchName: string | null;
}) {
  const { setTheme, resolvedTheme } = useTheme();

  return (
    <header className="glass-panel flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-2">
        <MobileSidebar modules={modules} />
        <div className="hidden flex-col leading-tight sm:flex">
          <span className="text-sm font-medium">{roleName}</span>
          {branchName && <span className="text-xs text-muted-foreground">{branchName}</span>}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <TourIconTrigger />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          <Sun className="size-4.5 dark:hidden" />
          <Moon className="hidden size-4.5 dark:block" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <Avatar className="size-7">
                <AvatarFallback className="text-xs">{initials(fullName)}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">{fullName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-medium">{fullName}</span>
                <span className="text-xs font-normal text-muted-foreground">{roleName}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <UserCircle className="size-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <form action={logout}>
              <DropdownMenuItem asChild>
                <button type="submit" className="w-full">
                  <LogOut className="size-4" />
                  Log out
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
