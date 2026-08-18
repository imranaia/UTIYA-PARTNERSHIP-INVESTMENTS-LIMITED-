"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { createLoanAgreementAction, type AgreementFormState } from "./portalActions";

const initialState: AgreementFormState = { error: null };

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function LoanAgreementDialog({ clientId }: { clientId: number }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createLoanAgreementAction, initialState);

  useEffect(() => {
    if (state === initialState) return;
    if (!pending && !state.error) {
      toast.success("Principal agreement created.");
      setOpen(false);
    }
  }, [pending, state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          New principal agreement
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-panel-strong border-none sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New principal agreement</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="clientId" value={clientId} />

          <div className="space-y-1.5">
            <Label htmlFor="principalAmount">Principal (₦)</Label>
            <Input id="principalAmount" name="principalAmount" type="number" min="1" step="0.01" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profitAmount">Profit (₦)</Label>
            <Input id="profitAmount" name="profitAmount" type="number" min="0" step="0.01" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tenureWeeks">Tenure (weeks)</Label>
            <Input id="tenureWeeks" name="tenureWeeks" type="number" min="1" step="1" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="startDate">Start date</Label>
            <Input id="startDate" name="startDate" type="date" defaultValue={today()} required />
          </div>

          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
