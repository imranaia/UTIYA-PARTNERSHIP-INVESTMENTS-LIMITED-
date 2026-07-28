"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { importClientsAction, type ImportFormState } from "./actions";

const initialState: ImportFormState = { error: null };

export function UploadForm({
  branches,
  showBranchSelect,
}: {
  branches: { id: number; name: string; code: string }[];
  showBranchSelect: boolean;
}) {
  const [state, formAction, pending] = useActionState(importClientsAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upload an .xlsx file with columns: Full Name, Phone, Address, Group, Enrollment Date, Loan Collector, Opening
        Savings. Download the template to get the exact format.
      </p>

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
        <Label htmlFor="file">Excel file</Label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".xlsx"
          required
          className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground"
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Importing…" : "Import clients"}
      </Button>
    </form>
  );
}
