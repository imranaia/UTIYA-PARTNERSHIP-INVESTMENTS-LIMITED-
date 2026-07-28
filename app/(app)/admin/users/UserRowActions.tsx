"use client";

import { useState, useTransition } from "react";
import { KeyRound, UserX, UserCheck, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { resetPasswordAction, toggleUserActiveAction } from "./actions";

export function UserRowActions({ userId, isActive }: { userId: number; isActive: boolean }) {
  const [pending, startTransition] = useTransition();
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  function handleDone() {
    setTempPassword(null);
    setCopied(false);
  }

  async function handleCopy() {
    if (!tempPassword) return;
    await navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    toast.success("Password copied.");
  }

  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" disabled={pending} onClick={handleReset} title="Reset password">
        <KeyRound className="size-4" />
      </Button>
      <Button variant="ghost" size="icon" disabled={pending} onClick={handleToggleActive} title={isActive ? "Deactivate" : "Activate"}>
        {isActive ? <UserX className="size-4" /> : <UserCheck className="size-4" />}
      </Button>

      <Dialog open={!!tempPassword} onOpenChange={() => {}}>
        <DialogContent
          className="glass-panel-strong border-none sm:max-w-sm"
          showCloseButton={false}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Password reset</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Share this temporary password with the staff member directly. It will not be shown again once you close this
            dialog.
          </p>
          <div className="flex items-center gap-2">
            <p className="flex-1 select-all rounded-lg border border-border bg-muted px-3 py-2 text-center font-mono text-sm">
              {tempPassword}
            </p>
            <Button type="button" variant="secondary" size="icon" onClick={handleCopy} title="Copy password">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
          <Button className="w-full" onClick={handleDone}>
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
