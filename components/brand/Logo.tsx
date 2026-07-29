import { cn } from "@/lib/utils";

// Placeholder wordmark/monogram — no external asset. Uses currentColor +
// theme CSS vars so it adapts automatically to light/dark.
export function Logo({ className, iconOnly = false }: { className?: string; iconOnly?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
        <defs>
          <linearGradient id="utiya-logo-grad" x1="0" y1="0" x2="34" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="var(--brand)" stopOpacity="0.95" />
            <stop offset="1" stopColor="var(--brand)" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="32" height="32" rx="10" fill="url(#utiya-logo-grad)" stroke="var(--glass-border)" />
        <path
          d="M10 10.5V19a7 7 0 0 0 14 0v-8.5"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
          opacity="0.95"
        />
        <circle cx="24.5" cy="9.5" r="1.6" fill="white" />
      </svg>
      {!iconOnly && (
        <span className="text-base font-semibold tracking-tight leading-none">
          Alkair <span className="font-normal text-muted-foreground">Microcredit</span>
        </span>
      )}
    </div>
  );
}
