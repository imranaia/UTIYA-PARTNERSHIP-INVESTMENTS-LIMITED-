"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Search } from "lucide-react";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveDailyTransactionsAction, type DailyTransactionsState } from "./actions";

type Row = {
  clientId: number;
  clientCode: string;
  fullName: string;
  groupName: string | null;
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

function money(n: string | number) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ClientRow({ row, readOnly }: { row: Row; readOnly: boolean }) {
  const [open, setOpen] = useState(false);
  const filledFields = FIELDS.filter((f) => Number(row[f.key] ?? 0) > 0);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-accent/40"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{row.fullName}</span>
            {row.paymentId && <span className="shrink-0 font-mono text-xs text-muted-foreground">{row.paymentId}</span>}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {row.clientCode}
            {row.groupName ? ` · ${row.groupName}` : ""} · B/F {money(row.savingsBalanceBf)}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {filledFields.length > 0 && !open && (
            <span className="hidden rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary sm:inline">
              {filledFields.length} entered
            </span>
          )}
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </div>
      </button>

      <div className={cn("grid gap-3 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-4", !open && "hidden")}>
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
  );
}

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

  useEffect(() => {
    if (state === initialState) return;
    if (state.error) toast.error(state.error);
    else if (state.savedCount > 0) toast.success(`Saved ${state.savedCount} client${state.savedCount === 1 ? "" : "s"}.`);
  }, [state]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.fullName.toLowerCase().includes(q) || r.clientCode.toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <form action={formAction}>
      <input type="hidden" name="transactionDate" value={transactionDate} />
      <input type="hidden" name="branchId" value={branchId} />
      <input type="hidden" name="clientIds" value={rows.map((r) => r.clientId).join(",")} />

      {rows.length > 0 && (
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search client by name or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
      )}

      <GlassPanel className="overflow-hidden p-0">
        {filteredRows.length === 0 ? (
          <p className="p-6 text-center text-muted-foreground">
            {rows.length === 0 ? "No active clients for this branch/collector." : "No clients match your search."}
          </p>
        ) : (
          filteredRows.map((r) => <ClientRow key={r.clientId} row={r} readOnly={readOnly} />)
        )}
      </GlassPanel>

      {!readOnly && rows.length > 0 && (
        <div className="mt-3 flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save all"}
          </Button>
        </div>
      )}
    </form>
  );
}
