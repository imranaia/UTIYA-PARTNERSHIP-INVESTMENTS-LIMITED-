"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { setDutyAssignmentAction } from "./actions";

const DUTY_POSTS = [
  { key: "branch_head", label: "Branch Head" },
  { key: "receiving_officer", label: "Receiving Officer" },
  { key: "supervision_officer", label: "Supervision Officer" },
  { key: "disbursement_officer", label: "Disbursement Officer" },
] as const;

const nativeSelectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function DutyRoster({
  branchId,
  date,
  users,
  assignments,
  readOnly,
}: {
  branchId: number;
  date: string;
  users: { id: number; fullName: string }[];
  assignments: { dutyPost: string; userId: number }[];
  readOnly: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const assignedMap = new Map(assignments.map((a) => [a.dutyPost, a.userId]));

  function handleChange(dutyPost: string, value: string) {
    if (!value) return;
    startTransition(async () => {
      const result = await setDutyAssignmentAction({ branchId, date, dutyPost, userId: Number(value) });
      if (result.error) toast.error(result.error);
      else toast.success("Duty roster updated.");
    });
  }

  return (
    <GlassPanel className="p-4">
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Duty Roster — {date}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {DUTY_POSTS.map((post) => (
          <div key={post.key} className="space-y-1.5">
            <label className="block text-xs text-muted-foreground">{post.label}</label>
            <select
              defaultValue={assignedMap.get(post.key) ?? ""}
              disabled={readOnly || pending}
              onChange={(e) => handleChange(post.key, e.target.value)}
              className={nativeSelectClass}
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}
