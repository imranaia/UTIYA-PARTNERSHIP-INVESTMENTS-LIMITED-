"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Search, CheckCircle2, Clock, AlertTriangle, CalendarClock } from "lucide-react";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { saveDailyTransactionsAction, type DailyTransactionsState } from "./actions";

type PaymentStatus = "paid_on_day" | "paid_supplementary" | "due_today" | "overdue" | "not_due_yet";

type Row = {
  clientId: number;
  clientCode: string;
  fullName: string;
  groupName: string | null;
  enrollmentDay: number;
  paymentStatus: PaymentStatus;
  paymentId: string | null;
  loanDisbursement: string | null;
  loanRecovery: string | null;
  profitInterest: string | null;
  serviceCharge: string | null;
  newSavings: string | null;
  savingsRecall: string | null;
  collateralTransferIn: string | null;
  collateralTransferOut: string | null;
  notes: string | null;
  supplementaryOverride: string | null;
  savingsBalanceBf: string;
};

const initialState: DailyTransactionsState = { error: null, savedCount: 0 };

const FIELDS: { key: keyof Row; prefix: string; label: string }[] = [
  { key: "loanDisbursement", prefix: "ld", label: "Loan Disbursement" },
  { key: "loanRecovery", prefix: "lr", label: "Loan Recovery" },
  { key: "profitInterest", prefix: "pi", label: "Interest" },
  { key: "serviceCharge", prefix: "sc", label: "Service Charge" },
  { key: "newSavings", prefix: "ns", label: "New Savings" },
  { key: "savingsRecall", prefix: "sr", label: "Savings Recall" },
  { key: "collateralTransferIn", prefix: "ci", label: "Collateral In" },
  { key: "collateralTransferOut", prefix: "co", label: "Collateral Out" },
];

const WEEKDAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const STATUS_CONFIG: Record<PaymentStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  paid_on_day: { label: "Paid", icon: CheckCircle2, className: "bg-primary/15 text-primary" },
  paid_supplementary: { label: "Paid (Supplementary)", icon: CheckCircle2, className: "bg-primary/15 text-primary" },
  due_today: { label: "Due Today", icon: Clock, className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  overdue: { label: "Overdue", icon: AlertTriangle, className: "bg-destructive/15 text-destructive" },
  not_due_yet: { label: "Not Due Yet", icon: CalendarClock, className: "bg-muted text-muted-foreground" },
};

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs", cfg.className)}>
      <Icon className="size-3" />
      {cfg.label}
    </span>
  );
}

function ClientCard({ row, readOnly, selectedDay }: { row: Row; readOnly: boolean; selectedDay: number }) {
  const [open, setOpen] = useState(false);
  const filledFields = FIELDS.filter((f) => Number(row[f.key] ?? 0) > 0);
  const offDay = selectedDay !== row.enrollmentDay;

  return (
    <GlassPanel className="overflow-hidden p-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-accent/40"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-base font-semibold">{row.fullName}</span>
            {row.paymentId && <span className="shrink-0 font-mono text-xs text-muted-foreground">{row.paymentId}</span>}
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {row.clientCode}
            {row.groupName ? ` · ${row.groupName}` : ""} · Pays {WEEKDAY_NAMES[row.enrollmentDay]} · B/F {money(row.savingsBalanceBf)}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={row.paymentStatus} />
            {row.supplementaryOverride === "not_supplementary" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                Supplementary override: off
              </span>
            )}
            {filledFields.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
                {filledFields.length} field{filledFields.length === 1 ? "" : "s"} entered
              </span>
            )}
          </div>
        </div>
        <ChevronDown className={cn("size-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      <div className={cn("border-t border-border px-4 pt-3 pb-4", !open && "hidden")}>
        <div
          className={cn(
            "mb-3 space-y-2 rounded-lg px-3 py-2 text-xs",
            offDay
              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
              : "bg-muted/50 text-muted-foreground",
          )}
        >
          <p>
            {row.fullName}&apos;s assigned collection day is <strong>{WEEKDAY_NAMES[row.enrollmentDay]}</strong>.
            {offDay ? (
              <>
                {" "}
                Today ({WEEKDAY_NAMES[selectedDay]}) is a different day, so a payment recorded here will be counted as a{" "}
                <strong>Supplementary</strong> payment automatically.
              </>
            ) : (
              " Today matches their assigned day, so a payment recorded here counts as on-time — this override isn't needed."
            )}
          </p>
          <label className={cn("flex items-center gap-1.5", !offDay && "opacity-50")}>
            <input
              type="checkbox"
              name={`sup_${row.clientId}`}
              defaultChecked={row.supplementaryOverride === "not_supplementary"}
              disabled={readOnly || !offDay}
              className="size-3.5"
            />
            This was actually collected on time — data just entered late. Don&apos;t mark as Supplementary.
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FIELDS.map((f) => (
            <div key={f.prefix} className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor={`${f.prefix}_${row.clientId}`}>
                {f.label}
              </label>
              <Input
                id={`${f.prefix}_${row.clientId}`}
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                name={`${f.prefix}_${row.clientId}`}
                defaultValue={row[f.key] ?? ""}
                disabled={readOnly}
                className="h-9 w-full"
              />
            </div>
          ))}
          <div className="space-y-1 sm:col-span-2 lg:col-span-4">
            <label className="text-xs text-muted-foreground" htmlFor={`nt_${row.clientId}`}>
              Notes
            </label>
            <Input
              id={`nt_${row.clientId}`}
              name={`nt_${row.clientId}`}
              defaultValue={row.notes ?? ""}
              disabled={readOnly}
              className="h-9 w-full"
            />
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}

const FILTERS: { key: "all" | PaymentStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "due_today", label: "Due Today" },
  { key: "overdue", label: "Overdue" },
  { key: "paid_on_day", label: "Paid" },
  { key: "paid_supplementary", label: "Supplementary" },
  { key: "not_due_yet", label: "Not Due Yet" },
];

export function DailyTransactionsTable({
  rows,
  transactionDate,
  branchId,
  readOnly,
}: {
  rows: Row[];
  transactionDate: string;
  branchId: number;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveDailyTransactionsAction, initialState);
  const [search, setSearch] = useState("");
  // Default to "who's paying today" rather than dumping the entire roster on
  // load — the collector's immediate question when opening this page.
  const [filter, setFilter] = useState<"all" | PaymentStatus>("due_today");

  useEffect(() => {
    if (state === initialState) return;
    if (state.error) toast.error(state.error);
    else if (state.savedCount > 0) toast.success(`Saved ${state.savedCount} client${state.savedCount === 1 ? "" : "s"}.`);
  }, [state]);

  const selectedDay = useMemo(() => {
    const d = new Date(transactionDate + "T00:00:00Z");
    const day = d.getUTCDay();
    return day === 0 ? 7 : day;
  }, [transactionDate]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const r of rows) c[r.paymentStatus] = (c[r.paymentStatus] ?? 0) + 1;
    return c;
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.paymentStatus !== filter) return false;
      if (q && !r.fullName.toLowerCase().includes(q) && !r.clientCode.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, filter]);

  const SaveButton = (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save all"}
    </Button>
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="transactionDate" value={transactionDate} />
      <input type="hidden" name="branchId" value={branchId} />
      <input type="hidden" name="clientIds" value={rows.map((r) => r.clientId).join(",")} />

      {rows.length > 0 && (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <Button
                  key={f.key}
                  type="button"
                  variant={filter === f.key ? "default" : "secondary"}
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                  <Badge variant="outline" className="h-4 min-w-4 px-1 text-[10px]">
                    {counts[f.key] ?? 0}
                  </Badge>
                </Button>
              ))}
            </div>
            {!readOnly && SaveButton}
          </div>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search client by name or code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9"
            />
          </div>
        </>
      )}

      {filteredRows.length === 0 ? (
        <GlassPanel className="p-6 text-center text-muted-foreground">
          {rows.length === 0 ? "No active clients for this branch/collector." : "No clients match this filter."}
        </GlassPanel>
      ) : (
        <div className="space-y-3">
          {filteredRows.map((r) => (
            <ClientCard key={r.clientId} row={r} readOnly={readOnly} selectedDay={selectedDay} />
          ))}
        </div>
      )}

      {!readOnly && rows.length > 0 && (
        <div className="mt-3 flex justify-end">{SaveButton}</div>
      )}
    </form>
  );
}
