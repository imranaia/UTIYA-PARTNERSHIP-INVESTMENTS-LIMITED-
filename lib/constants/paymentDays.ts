// Shared between server code (client code generation, import parsing) and
// client components (the "Payment day" select on ClientForm) — deliberately
// has no "server-only" import so it can be used from either.
export const PAYMENT_DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const;
