"use client";

import Link from "next/link";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Button } from "@/components/ui/button";

export default function AppError({ error }: { error: Error & { digest?: string } }) {
  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <GlassPanel className="max-w-md p-8 text-center">
        <h1 className="mb-2 text-lg font-semibold">Something went wrong</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {error.message || "You may not have permission to view this page."}
        </p>
        <Button asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </GlassPanel>
    </div>
  );
}
