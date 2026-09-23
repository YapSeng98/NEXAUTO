# Roles and permissions

## Roles

| Role | Who | Purpose |
|---|---|---|
| Owner | Shop owner | Full access, including user management |
| Manager | Workshop manager | Full operations and financials, no user management |
| Advisor | Service advisor, front desk | Customers, quotes and payments. Sees selling prices but not cost or profit |

Only the **owner** can manage users, rename the workshop and change sign-in policy (`staff`). Owners and **managers** share everything else that configures the shop (`config`).
| Technician | Mechanic | Inspection and repair on their own jobs only, with no prices |

## The matrix is editable

The table below is what the app **ships with**, not what it is stuck with. An
owner opens **Settings → Roles** and ticks what each role may do; changes apply
the moment they are ticked, to anyone already signed in on that device.

The owner column is fixed at everything and cannot be unticked. That is
deliberate: any other rule lets an owner remove the last permission capable of
restoring it and lock themselves out of their own workshop. The `perms()`
function forces the owner row on regardless of what is stored, so forcing the
disabled checkbox in devtools changes nothing.

## Permission flags

Each role maps to a set of flags in `BASE_PERMS` in `index.html`, and the
owner can change every row but their own under **Settings → Roles**.

| Flag | Meaning | Owner | Manager | Advisor | Technician |
|---|---|---|---|---|---|
| `cost` | See cost prices and profit on orders and parts, change prices | ✓ | ✓ | – | – |
| `price` | See selling prices and totals | ✓ | ✓ | ✓ | – |
| `revenue` | See shop revenue, profit and reports | ✓ | ✓ | – | – |
| `purchase` | Purchase orders, receiving, stock adjustments | ✓ | ✓ | ✓ | – |
| `suppliers` | Add, rename and remove suppliers. Everyone can read the list | ✓ | ✓ | – | – |
| `staff` | Add, edit and deactivate users | ✓ | – | – | – |
| `all` | See every order and customer | ✓ | ✓ | ✓ | – |
| `edit` | Price lines, discounts, send quotes | ✓ | ✓ | ✓ | – |
| `approve` | Record the customer's answer on a sent quote | ✓ | ✓ | ✓ | – |
| `checkin` | Check a vehicle in and link it to a customer | ✓ | ✓ | ✓ | ✓ |
| `config` | Edit the shop's lists and timings in Settings | ✓ | ✓ | – | – |
| `additems` | Add parts and work to a job's quote | ✓ | ✓ | ✓ | ✓ |
| `pay` | Take payment | ✓ | ✓ | ✓ | – |

## Access rules

- **Technicians** only see orders where they are the assigned technician, and only customers who have one of those orders. Opening any other order or customer is refused, even from a link.
- **Technicians can check a vehicle in** (`checkin`), picking an existing customer or registering a new one. The job is assigned to them by default — otherwise it would disappear from their list the moment it was saved — and an advisor is recorded as the advisor of record. Check-in is the only write they have outside their own jobs' inspection and notes; it grants nothing else.
- **The inspection checklist, payment methods, part categories, stock adjustment reasons and customer tiers are all editable** by an owner or manager in Settings → Lists. Jobs copy the checklist at check-in, so editing it never rewrites a job already under way.
- **Any role on a job can edit its details** — technician, mileage and complaint — while it is open. A technician handing a job to someone else loses sight of it, so the app says so before and after the change. Editing details grants nothing else: prices, discounts and payment stay behind their own flags.
- **Technicians can add to a quote but never price it.** A part they pick up carries the price list's price and cost without showing either. Work they describe is saved unpriced and flagged, an advisor sets the price, and the quote cannot be sent while anything is still unpriced. They can delete only their own unapproved lines.
- **The quotation document opens for everyone on the job**, but a technician gets it as a job sheet: the findings, the work and the quantities, with the price columns and totals left out of the document rather than hidden in it.
- **Job notes are shared with everyone on the job.** Any role that can open an order can read the thread and add to it, including technicians. Notes are not price data and are never hidden by role. The thread becomes read-only once the job is completed or declined.
- **Advisors** can give a discount of up to 10% of the subtotal. A larger discount is capped with a message to ask a manager.
- **Advisors** can count stock but cannot change cost or selling prices. A forced price change is ignored on save.
- **Users are never deleted, only deactivated**, so their name stays on past jobs, payments and stock history.

## User safeguards

| Action | Rule |
|---|---|
| Demote or deactivate an owner | Blocked if they are the last active owner |
| Deactivate yourself | Blocked |
| Deactivate a user with open jobs | Blocked until the jobs are reassigned |
| Change a technician with open jobs to another role | Blocked until the jobs are reassigned |
| Add a user | The name must be unique among active users |

## Important: production security

In this demo, hidden fields are removed by the browser. In production, the server must:

1. Authenticate the user (login).
2. Filter rows, for example so technicians only get their own orders.
3. Strip fields before sending, so cost, profit and revenue never reach advisors or technicians.
4. Re-check every write, such as price edits, discounts over 10%, or payments by technicians.
