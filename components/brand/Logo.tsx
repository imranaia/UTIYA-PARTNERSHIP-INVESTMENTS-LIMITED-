import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className, iconOnly = false }: { className?: string; iconOnly?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Image src="/logo-mark.png" alt="Alkhair Microcredit" width={34} height={34} className="shrink-0" priority />
      {!iconOnly && (
        <span className="text-base font-semibold tracking-tight leading-none">
          Alkhair <span className="font-normal text-muted-foreground">Microcredit</span>
        </span>
      )}
    </div>
  );
}
