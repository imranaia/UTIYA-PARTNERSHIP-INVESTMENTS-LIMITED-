"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateUserAction, type UserFormState } from "./actions";

const initialState: UserFormState = { error: null };

type RoleOption = { id: number; name: string };
type BranchOption = { id: number; name: string; code: string };
type EditableUser = {
  id: number;
  username: string;
  fullName: string;
  phone: string | null;
  roleId: number;
  branchId: number | null;
};

export function EditUserDialog({
  user,
  roles,
  branches,
  showBranchSelect,
}: {
  user: EditableUser;
  roles: RoleOption[];
  branches: BranchOption[];
  showBranchSelect: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateUserAction, initialState);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      toast.success("User updated.");
      setOpen(false);
    }
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Edit user">
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-panel-strong border-none sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit @{user.username}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="userId" value={user.id} />
          <div className="space-y-1.5">
            <Label htmlFor={`username-${user.id}`}>Username</Label>
            <Input id={`username-${user.id}`} name="username" defaultValue={user.username} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`fullName-${user.id}`}>Full name</Label>
            <Input id={`fullName-${user.id}`} name="fullName" defaultValue={user.fullName} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`phone-${user.id}`}>Phone (optional)</Label>
            <Input id={`phone-${user.id}`} name="phone" defaultValue={user.phone ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`roleId-${user.id}`}>Role</Label>
            <Select name="roleId" defaultValue={String(user.roleId)} required>
              <SelectTrigger id={`roleId-${user.id}`} className="w-full">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {showBranchSelect && (
            <div className="space-y-1.5">
              <Label htmlFor={`branchId-${user.id}`}>Branch</Label>
              <Select name="branchId" defaultValue={user.branchId ? String(user.branchId) : undefined}>
                <SelectTrigger id={`branchId-${user.id}`} className="w-full">
                  <SelectValue placeholder="Select a branch (optional for Super Admin)" />
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
          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
