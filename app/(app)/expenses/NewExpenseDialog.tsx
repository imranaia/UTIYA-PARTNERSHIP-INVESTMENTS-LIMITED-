"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExpenseForm } from "./new/ExpenseForm";

export function NewExpenseDialog({
  branches,
  categories,
  showBranchSelect,
}: {
  branches: { id: number; name: string; code: string }[];
  categories: { id: number; name: string }[];
  showBranchSelect: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Add Expense
      </Button>
      <DialogContent className="glass-panel-strong max-h-[85vh] overflow-y-auto border-none sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add expense</DialogTitle>
        </DialogHeader>
        <ExpenseForm branches={branches} categories={categories} showBranchSelect={showBranchSelect} />
      </DialogContent>
    </Dialog>
  );
}
