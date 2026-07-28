"use client";

import { useState, useTransition } from "react";
import { KeyRound, UserX, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { resetPasswordAction, toggleUserActiveAction } from "./actions";

export function UserRowActions({ userId, isActive }: { userId: number; isActive: boolean }) {
  const [pending, startTransition] = useTransition();
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  function handleReset() {
    startTransition(async () => {
      const result = await resetPasswordAction(userId);
      if (result.tempPassword) setTempPassword(result.tempPassword);
    });
  }

  function handleToggleActive() {
    startTransition(() => {
      void toggleUserActiveAction(userId, !isActive);
    });
  }

  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" disabled={pending} onClick={handleReset} title="Reset password">
        <KeyRound className="size-4" />
      </Button>
      <Button variant="ghost" size="icon" disabled={pending} onClick={handleToggleActive} title={isActive ? "Deactivate" : "Activate"}>
        {isActive ? <UserX className="size-4" /> : <UserCheck className="size-4" />}
      </Button>

      <Dialog open={!!tempPassword} onOpenChange={(open) => !open && setTempPassword(null)}>
        <DialogContent className="glass-panel-strong border-none sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Password reset</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Share this temporary password with the staff member directly. It will not be shown again.
          </p>
          <p className="select-all rounded-lg border border-border bg-muted px-3 py-2 text-center font-mono text-sm">
            {tempPassword}
          </p>
          <Button className="w-full" onClick={() => setTempPassword(null)}>
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
