# How the source Excel files became the database

This explains where the app's starting data came from, and exactly which
spreadsheet column landed in which database field. Written for anyone
checking the software's numbers against the original paper/Excel ledger.

## The two source files

Both files lived in the project folder but are deliberately **not** stored in
git (they contain client financial data, and they're large). If you need to
re-check something against the original, ask whoever has them.

| File | Format | What it is |
| --- | --- | --- |
| `CGL_Week 10.xls` | Legacy Excel (.xls, pre-2007 binary format) | The branch's own "CGL Tracker" — a full client roster plus the manual day-by-day balance reconciliation sheet the branch used to keep by hand. |
| `Weekly Investment Report, Week 10 2nd–6th June, 2014.xlsx` | Modern Excel (.xlsx) | One week's worth of actual daily transactions (disbursements, recoveries, savings, etc.), one sheet per weekday. |

## Client roster → `clients` table

Every client listed in `CGL_Week 10.xls` was loaded into the `clients` table.
This gave the system **467 clients** — its full starting roster.

Each client also received one **backdated "opening position" transaction**,
dated to the Monday–Friday of the week ending 30 May 2014 based on that
client's assigned collection day. This isn't a real transaction that
happened that day — it's how the system records "this is the loan/savings
balance this client already had, as of the ledger snapshot." Every later
report (Portfolio Tracker, client statements, etc.) rolls forward from that
starting balance, exactly the way the paper ledger did.

## Weekly transactions → `client_transactions` table

The `.xlsx` file has one sheet per weekday. Each sheet is a table of clients
with their day's activity. Columns mapped like this:

| Spreadsheet column | Database field | Meaning |
| --- | --- | --- |
| Client ID | `clients.client_code` (used to match the row to the right client) | Identifies which client the row belongs to |
| Loan Disb. | `loan_disbursement` | New loan paid out to the client that day |
| Principal | `loan_recovery` | Loan principal repaid that day |
| Profit | `profit_interest` | Interest/profit repaid that day |
| Service Charge | `service_charge` | Service charge collected that day |
| New Savings | `new_savings` | New savings deposited that day |
| Savings Recall | `savings_recall` | Savings withdrawn/recalled that day |
| Coll. Transfer-in | `collateral_transfer_in` | Collateral brought in that day |
| Coll. Transfer-out | `collateral_transfer_out` | Collateral released that day |

Only **Monday, Tuesday and Wednesday (2–4 June 2014)** had rows — 75 in
total. **Thursday and Friday (5–6 June 2014) were never filled in on the
original spreadsheet.** Both sheets are blank templates in the source file
(every amount cell is 0 or empty), and even the branch's own "CGL Tracker"
reconciliation sheet shows those two dates as unreconciled with a large
variance — meaning the branch itself never closed that week out on paper.
**The database is a complete, faithful copy of the source file, including
that gap.** There's no missing-import bug to fix — if those two days'
figures ever turn up on paper, they can be added the same way any other
day's Daily Transactions are entered.

## Quick way to sanity-check this yourself

Open the Portfolio Tracker report (`Reports → Portfolio Tracker`) and set the
date range to 26 May – 6 June 2014. The Balance B/F → C/F columns should
roll forward day to day with no jumps, and 5–6 June should simply show no
movement (B/F = C/F), matching the blank source sheets.
