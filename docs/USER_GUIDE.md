# UTIYA Partnership Investments — User Guide

A plain-language walkthrough of every screen in the system, organized the
way you'll actually use it day to day.

## Logging in

- Sign in with the username and password your admin gave you.
- If this is your first time logging in (or an admin just reset your
  password), you'll be sent straight to a **Change Your Password** page
  before you can do anything else. You must set a new password to continue.
- After several wrong password attempts in a row, the account is locked
  temporarily — ask your admin if this happens to you.
- You can change your password again any time from **Profile** (bottom of
  the sidebar) — you don't have to wait to be forced.

## Dashboard — your daily snapshot

The first thing you see after logging in.

- Top strip: active clients, outstanding loan balance, total savings held,
  total collateral held, today's expenses, and open defaults (bad debt).
- **Today's Collections**: disbursement, recovery and new savings totals for
  today, plus a running **Net Cash Movement** figure.
- **Duty Roster**: who's covering the four duty posts today (Branch Head,
  Receiving Officer, Supervision Officer, Disbursement Officer) — a link
  takes you to Transactions to change it.
- **Recent Activity**: the last 8 transactions recorded.
- Branch staff only ever see their own branch. Super admins see the first
  branch by default and can switch.

## Clients — your roster

- The main list shows client code, name, group, assigned collector and
  status, with a search box by name or code.
- **Add Client**: full name and enrollment date are required. **The
  enrollment date must fall on a weekday — this permanently fixes the
  client's collection day and client code, so double-check it before
  saving.** Phone, address, group, trade/business and opening savings are
  optional. You must pick a branch before a loan collector option appears.
- Click into a client to see their full profile, transaction history, and a
  **Record Maturity** action for when their loan cycle ends.
- **Defaults** (button on the Clients page): every bad-debt/default record,
  with a **Resolve** action once it's repaid, written off, or the client is
  deceased.

## Transactions — Daily Transactions

This is where the day's collections get entered, one client at a time.

- Filter by **Date**, **Branch** (super admin only) and **Collector**.
  Defaults to today, filtered to "Due Today" so you're not scrolling past
  everyone.
- Each client is their own card — click to expand it, enter figures, and hit
  **Save** on that card only. Saving one client never touches anyone else's
  entry, so you don't need to fill in the whole page at once.
- If a client pays on a day other than their assigned collection day, the
  system automatically marks it **Supplementary**. If that flag is wrong
  (e.g. the payment really happened on the right day, it was just typed in
  late), tick **"This was actually collected on time"** on that client's
  card to correct it.
- **Duty Roster** sits above the client list — same four posts as the
  Dashboard, editable here directly.

## Expenses

- List filtered by branch and date range, with a **By Category** breakdown
  (it also flags categories with zero spend so you can spot gaps).
- **Add Expense**: category, description, amount and date are required;
  receipt reference is optional.

## Bank Reconciliation

- Compares your **bank balance**, **cash balance** and **book balance** for
  a given date. Any variance shows in red.
- **Add Reconciliation**: an **Auto-calculate** button fills in the expected
  book balance from the last reconciliation plus everything recorded since —
  you can still override it if your physical count is different.
- **Cash Book**: a running debit/credit ledger per account with a live
  running balance.

## Ledger

A separate record for anything that isn't a client transaction or an
expense — fund transfers, asset purchases/disposals, borrowings, other
investment income. This feeds directly into the Week Summary report, so
keep it current.

## Reports

The **Reports** page itself is a daily/branch summary — same headline
numbers as the Dashboard plus a full breakdown (disbursement, recovery,
interest, service charge, savings movement, collateral movement, and a
**Total Receipt** figure matching the old paper ledger's own column). Super
admins viewing "All branches" get an extra branch-comparison table.

Linked sub-reports:

- **Portfolio Tracker** — day-by-day balance-forward → movement →
  balance-carried-forward, for Active loans, Default loans, Net Office
  investment, and Savings/collateral. This is the digital version of the
  branch's manual "CGL Tracker" sheet — see
  [DATA_IMPORT_MAPPING.md](./DATA_IMPORT_MAPPING.md) for how that mapping
  works.
- **Supplementary** — every payment collected off a client's normal day,
  auto-classified Early or Late. Use the **Not supplementary** button to
  correct a false flag.
- **Dormant Clients** — clients inactive 60+ days who still hold a savings
  balance.
- **Client Statement** — search a client, see their full lifetime history:
  current savings, outstanding loan, lifetime totals, every transaction.
- **Custom Report** — pick branch, collector, date range, grouping (day,
  week, etc.) and which figures to include; builds a table on demand.
- **Loan Maturity** — clients whose loan cycle ended, and whether they
  renewed.
- **Week Summary** — full treasury reconciliation for a date range: totals
  every transaction, expense and ledger entry into Total Debits/Credits,
  then compares the expected closing balance against your actual Bank
  Reconciliation for that period. It'll warn you if no reconciliation has
  been recorded yet for that range.

## Excel Import — bulk-adding clients

If you have a batch of new clients in a spreadsheet rather than typing them
in one by one:

1. Click **Download template** to get the exact expected column layout
   (Full Name, Phone, Address, Group, Enrollment Date, Loan Collector,
   Opening Savings).
2. Fill it in, then upload it. Super admins must pick a branch first.
3. Each upload becomes a batch you can review — see which rows succeeded and
   which failed, and why, before you move on.

## Admin — Users, Roles, Branches

*(Requires admin access.)*

- **Users**: add staff accounts, assign a role and branch, activate or
  deactivate accounts. Branch admins can only assign Loan Collector,
  Expense Officer or Viewer; only super admins can assign admin-level roles.
- **Roles**: manage what each role can see/create/edit/delete per module.
  Built-in roles are badge-flagged "Preset"; you can also add custom roles.
- **Branches**: add branches, toggle a branch active/inactive.

## Profile

Your own name, username, role, branch, phone and last login time, plus a
self-service password change form.

---

*For where the system's starting numbers came from, see
[DATA_IMPORT_MAPPING.md](./DATA_IMPORT_MAPPING.md).*
