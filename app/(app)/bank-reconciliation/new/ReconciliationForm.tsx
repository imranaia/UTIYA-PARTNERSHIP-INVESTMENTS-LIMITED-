"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createReconciliationAction, type ReconciliationFormState } from "../actions";

const initialState: ReconciliationFormState = { error: null };

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function ReconciliationForm({
  branches,
  showBranchSelect,
}: {
  branches: { id: number; name: string; code: string }[];
  showBranchSelect: boolean;
}) {
  const [state, formAction, pending] = useActionState(createReconciliationAction, initialState);
  const [bankBalance, setBankBalance] = useState("");
  const [cashBalance, setCashBalance] = useState("");
  const [bookBalance, setBookBalance] = useState("");

  const variance = Number(bankBalance || 0) + Number(cashBalance || 0) - Number(bookBalance || 0);

  return (
    <form action={formAction} className="space-y-4">
      {showBranchSelect && (
        <div className="space-y-1.5">
          <Label htmlFor="branchId">Branch</Label>
          <Select name="branchId" required>
            <SelectTrigger id="branchId" className="w-full">
              <SelectValue placeholder="Select a branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.name} ({b.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="reconDate">Date</Label>
        <Input id="reconDate" name="reconDate" type="date" defaultValue={today()} required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="bankBalance">Bank balance</Label>
        <Input
          id="bankBalance"
          name="bankBalance"
          type="number"
          step="0.01"
          required
          value={bankBalance}
          onChange={(e) => setBankBalance(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cashBalance">Cash balance</Label>
        <Input
          id="cashBalance"
          name="cashBalance"
          type="number"
          step="0.01"
          required
          value={cashBalance}
          onChange={(e) => setCashBalance(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="bookBalance">Book balance</Label>
        <Input
          id="bookBalance"
          name="bookBalance"
          type="number"
          step="0.01"
          required
          value={bookBalance}
          onChange={(e) => setBookBalance(e.target.value)}
        />
      </div>

      <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
        Variance:{" "}
        <span className={variance === 0 ? "font-semibold" : "font-semibold text-destructive"}>
          {variance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Input id="notes" name="notes" />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Save reconciliation"}
      </Button>
    </form>
  );
}
