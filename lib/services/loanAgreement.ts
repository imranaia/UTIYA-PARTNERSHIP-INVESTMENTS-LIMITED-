import "server-only";
import { addWeeks, format } from "date-fns";

export type LoanAgreementTerms = {
  principalAmount: number;
  profitAmount: number;
  tenureWeeks: number;
};

export type LoanAgreementTotals = {
  totalRepayable: number;
  installmentAmount: number;
};

// Admin enters principal + a flat profit amount; the total is split evenly
// across the tenure. installmentAmount is the rounded weekly figure shown to
// the admin up front — computeSchedule below re-derives each row so the
// rounding remainder lands on the last installment instead of drifting.
export function computeTotals(terms: LoanAgreementTerms): LoanAgreementTotals {
  const totalRepayable = terms.principalAmount + terms.profitAmount;
  const installmentAmount = Math.round((totalRepayable / terms.tenureWeeks) * 100) / 100;
  return { totalRepayable, installmentAmount };
}

export type ScheduleRow = { seq: number; dueDate: string; dueAmount: number };

// Derived on demand — not persisted — from the agreement's own fields, so
// there's nothing to keep in sync when an agreement is read.
export function computeSchedule(agreement: {
  totalRepayable: number;
  tenureWeeks: number;
  startDate: string;
}): ScheduleRow[] {
  const base = Math.floor((agreement.totalRepayable / agreement.tenureWeeks) * 100) / 100;
  const rows: ScheduleRow[] = [];
  let allocated = 0;
  const start = new Date(agreement.startDate + "T00:00:00Z");

  for (let i = 1; i <= agreement.tenureWeeks; i++) {
    const isLast = i === agreement.tenureWeeks;
    const dueAmount = isLast ? Math.round((agreement.totalRepayable - allocated) * 100) / 100 : base;
    allocated += dueAmount;
    rows.push({ seq: i, dueDate: format(addWeeks(start, i), "yyyy-MM-dd"), dueAmount });
  }
  return rows;
}

// Earliest scheduled installment on/after today, or the last one if every
// due date has already passed.
export function nextDueInstallment(schedule: ScheduleRow[], today = new Date()): ScheduleRow | null {
  if (schedule.length === 0) return null;
  const todayStr = format(today, "yyyy-MM-dd");
  return schedule.find((r) => r.dueDate >= todayStr) ?? schedule[schedule.length - 1];
}
