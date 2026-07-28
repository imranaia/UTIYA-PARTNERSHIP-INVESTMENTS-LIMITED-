import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export function GlassPanel({ className, strong, ...props }: ComponentProps<"div"> & { strong?: boolean }) {
  return <div className={cn(strong ? "glass-panel-strong" : "glass-panel", className)} {...props} />;
}
