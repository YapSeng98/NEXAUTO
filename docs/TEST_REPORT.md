# Test report

**Result: 392 of 392 checks passed.**

The suite (`tests/suite.js`) loads `index.html` in a simulated browser, signs in through the real login form, clicks through each process as each role, and checks both what's on screen and the saved data. Run it with `npm install && npm test`.

## Summary

| Area | Checks | Passed |
|---|---|---|
| Check-in | 12 | 12 |
| Inspection | 9 | 9 |
| Quotation | 14 | 14 |
| Approval and stock | 8 | 8 |
| Service and payment | 12 | 12 |
| Inventory | 12 | 12 |
| Customers and follow-ups | 10 | 10 |
| Roles and permissions | 18 | 18 |
| User management | 12 | 12 |
| Settings and saving | 6 | 6 |
| Login | 17 | 17 |
| Sign-in as each role | 8 | 8 |
| Sessions and sign-out | 12 | 12 |
| Credential management | 12 | 12 |
| Historical data | 19 | 19 |
| Reports | 15 | 15 |
| Reports by role | 5 | 5 |
| Orders list with history | 14 | 14 |
| Technician check-in | 12 | 12 |
| Job notes | 16 | 16 |
| Part photos | 10 | 10 |
| Edit job details | 16 | 16 |
| Jobs completed per technician | 9 | 9 |
| Job ageing and reminders | 12 | 12 |
| Reorder suggestions | 10 | 10 |
| Inspection checklist admin | 18 | 18 |
| AI panel | 9 | 9 |
| Quote stage messaging | 7 | 7 |
| Technician line items | 18 | 18 |
| Workshop name | 11 | 11 |
| Purchase order list | 9 | 9 |
| Quotation preview | 19 | 19 |

## Quotation preview (v0.12.0)

The quote existed only as an internal working list. There is now a customer-facing
document behind **Preview the customer's quotation**, available both before the
quote is sent and any time afterwards, so an advisor can check what the customer
will read and refer back to it later.

The document carries the workshop's own name (so renaming flows through), the
quote number, issue and validity dates, a status banner that tracks draft → sent
→ approved or declined, the customer and vehicle, the inspection findings written
as plain sentences, the priced lines, and the total. **Cost, margin and profit
never appear in it** — a check asserts the rendered text contains none of those
words. It prints to one page through a print stylesheet that hides the rest of
the app, which is the closest thing to a PDF without a backend.

Technicians open the same document as a **job sheet**: same findings, same work
list and quantities, with every money column, the totals block and the pricing
footnote removed rather than hidden — a check asserts the rendered text contains
no `$` and none of Subtotal, Total, Discount, Unit or Amount. It does not appear
at all until the inspection is finished and something has been quoted. Customer
names go through the same escaping as everywhere else, which a check verifies by
renaming a customer to an `<img>` tag.

## Technicians on the quote, renaming, and the PO list (v0.11.0)

**Technicians can add line items.** The constraint is that they cannot see
prices, so the two cases split: a **part** is picked from stock and carries the
price list's price and cost without ever showing them, while **labour** is
described with no price field at all and lands flagged `needsPrice`. An advisor
sees a red "Needs pricing" badge and a Set price button, and the quote cannot be
sent while any line is unpriced. Every line records who added it, and a
technician can delete only their own unapproved additions. Discount, payment and
pricing stay where they were.

**The workshop can be renamed.** Owners set the name in Settings; it applies to
the sign-in headings, the sidebar and the browser tab.

**The purchase order list shows only what is outstanding**, which is what the
tab's count had always meant — the list itself was showing received orders too.
Received ones sit behind a "Show N received" toggle, since the stock they added
is already in Stock history.

### Bugs these found

| # | Bug | Found by |
|---|---|---|
| 15 | "1 item still need a price" — verb did not agree | Browser check of the send-quote guard |
| 16 | Resetting the demo left the old workshop name in the sidebar | `Resetting the demo restores the default name` |
| 17 | The purchase order tab's badge counted outstanding orders while the list showed all of them | Reported by the user from the screen |

## Login redesign and a misleading quote label (v0.10.0)

The sign-in page is now a split layout: a brand panel with a blueprint grid and
a ghosted vehicle on the left, the form on the right, collapsing to the form
alone below 980px. Two real defects surfaced while building it:

| # | Bug | Impact |
|---|---|---|
| 13 | `input[type=password]` was missing from the base input rule, so every password field fell back to the browser's `2px inset` border | The sign-in and API-key fields did not match any other input in the app |
| 14 | A technician looking at a **draft** quote was told "Waiting for customer approval" | Nothing had been sent to anyone. The job was waiting on an advisor to price it, and the label said the opposite |

Bug 14 came from a user asking why a job would not move on. The footer now
distinguishes the two states — "Waiting for an advisor to build the quote" while
the quote is a draft, "Quote sent, waiting for the customer" once it has gone out
— and the empty line-item list tells a technician to leave a note instead. Seven
checks cover both labels, the advisor's buttons, and turning an inspection
finding into a quote line.

## Insights, reminders and the AI panel (v0.9.0)

**Ageing.** Jobs now record when they entered their current stage, so the app can
say *why* something is stuck and for how long — "quote sent, waiting on the
customer, 4 days in quotation" rather than just an age. The count deliberately
measures time in the stage, not time since check-in: a job open six days that
moved yesterday is fine, one open two days that has not moved in two is not.
Checks cover each stage's rule, that fresh and closed jobs are never flagged,
that clearing the hold-up removes the row, and that a technician sees only their
own.

**Reorder suggestions.** Usage is measured from the actual sale movements of the
last 90 days, so the suggested quantity is grounded in what the workshop really
consumes rather than a fixed multiple of the reorder point. A check recomputes
monthly usage from the movement log and compares it to what the table prints, and
another asserts that every part left off the list is genuinely above its reorder
point.

**Editable inspection checklist.** The 10 points were hardcoded. Owners and
managers can now add, rename, reorder, remove and restore them in Settings.
The important property is that jobs already under way keep the list they started
with — orders store their own copy — and the inspection tab counts that job's own
list rather than the current template. Both are tested.

**AI panel.** Off until someone adds their own Anthropic key. The checks cover
the gating, key validation, disconnect, and that the key is never written into the
page. Verified separately in the browser by stubbing `fetch` and reading the
outgoing request: correct endpoint, `claude-opus-5`, a 4.7KB context — and, for a
technician, a payload containing only their own jobs with no cost, price or
revenue fields at all. That last point is the one worth keeping: the AI context is
filtered by role before it leaves, which is what C1 in SECURITY.md says the rest
of the app should do.

## Editing a job, and jobs per technician (v0.8.0)

**Technicians can reassign and correct a job.** The inline technician dropdown
was only rendered for roles with `edit`, so a technician who checked a vehicle in
could not hand it to whoever actually picked up the work. It is replaced, for
every role, by an **Edit details** button covering technician, mileage and
complaint. Handing a job to someone else closes the panel and drops it from the
sender's list, with a toast naming who has it now — the alternative is a job that
silently vanishes. Mileage still cannot fall below the vehicle's *previous*
visit, but may be corrected downwards when there is no earlier visit, because the
common case is a typo at check-in.

**Reports list completed jobs per technician.** The bar chart had no numbers
against it. Each technician now has a row with their completed job count and the
revenue behind it, sorted busiest first. Checks assert the counts match the
orders in the selected range, that they sum to the shop's paid-job total, and
that the per-technician revenue sums to the headline revenue figure.

### The bug this release fixes

The seed version stayed at `5` while the seed itself changed twice — six months
of history in v0.6.0, job notes in v0.7.0. Because the app reseeds only when
`DB.v` differs, **anyone who had opened the demo before those releases kept their
old data and saw an empty report**. The version and storage key are now `6`, and
both carry a comment saying to bump them whenever the seed gains a field. This is
the kind of fault no test catches, because every test starts from empty storage.

## Technician check-in, job notes and part photos (v0.7.0)

Three changes, 38 new checks:

**Technicians can check a vehicle in.** Previously the New order button was
hidden behind the broad `edit` flag, which also covers quotes, discounts and
follow-ups. Check-in now sits behind its own `checkin` flag, so technicians get
exactly that one capability and nothing else — a check asserts their other five
flags are unchanged. The job defaults to the technician who checked it in,
because assigning it elsewhere would make it vanish from their own list. All the
existing check-in validation (duplicate phone and plate, open job on the vehicle,
mileage regression) still applies to them.

**Job notes are a shared thread.** Any role that can open an order can read and
write notes; a note written by a technician is checked to be visible to the
advisor and to the owner. Notes are escaped (a check stores
`<img src=x onerror=...>` and asserts no element is created), capped at 500
characters, rejected when blank, and the thread goes read-only once the job
closes.

**Parts can carry a photo.** Images are resized in the browser before saving —
verified in Chrome, where a 1200×900 PNG became a 2.9KB JPEG data URL — because
they share the same localStorage budget as everything else. `save()` now reports
a full-storage failure instead of swallowing it. The jsdom checks cover the data
path (save, render, pre-fill, clear, persist); the resize itself needs a real
canvas and was checked in the browser.

## Six months of data (added in v0.6.0)

The demo now generates 182 days of closed jobs — 294 orders across 53 customers,
with 326 stock movements — from a fixed seed, so every visitor and every test run
sees the same history. The reports read that history instead of the hardcoded
arrays they used before.

The 53 new checks cover:

- **Shape of the data:** history reaches back 165–190 days and runs up to today,
  order numbers are unique and sit below the live jobs, `nextWO` is still free,
  and every order points at a customer, vehicle, technician and advisor that
  exist.
- **Internal consistency:** every completed job's recorded payment equals its
  computed total, declined jobs carry no payment, part prices match the price
  list, mileage never goes backwards across a vehicle's visits, and sale
  movements reference real jobs.
- **Determinism:** two fresh instances produce an identical dataset.
- **Reports arithmetic:** revenue, gross profit, average ticket and approval rate
  are each recomputed from the orders and compared against what the KPI shows,
  for both the 30-day and 6-month windows. Parts and labor percentages sum to
  100.
- **Ranges:** the 7-day, 30-day and 6-month chips change the figures in the right
  direction and keep the selection highlighted.
- **By role:** managers see shop revenue, advisors do not, and a technician's
  "jobs completed" is their real count — not a padded one.
- **Orders list:** opens on live jobs rather than six months of history, caps at
  25 rows with a working "show more", chip counts match the data, and search
  finds a historical job by number.

### Bugs this found

| # | Bug | Found by |
|---|---|---|
| 10 | Chart.js was loaded from a cdnjs URL that returns **404**, so every chart in Reports had silently been blank — including on the live site | Browser check; jsdom strips the tag, so no test could have caught it |
| 11 | Two jobs on the same day could be timestamped out of order, making a vehicle's mileage appear to go backwards | `Mileage increases across each vehicle's visits` |
| 12 | Parts and labor percentages were rounded independently and could sum to 99% or 101% | `Parts and labor split adds up to 100%` |

Bug 10 is the one worth noting: the charts were broken before this change and
nothing flagged it, because the test harness removes external scripts and the
failure is silent by design (`if(typeof Chart === "undefined") return;`). It was
only visible by opening the page. The fix pins a version that exists and adds the
SRI hash that [SECURITY.md](SECURITY.md) M3 asked for.

## Login coverage (added in v0.5.0)

Every user switch in the suite now goes through the real login form rather than a
dropdown, so the 113 original checks exercise authentication as a side effect.

What the 49 new checks cover:

- **Getting in:** correct credentials for all four roles, case-insensitive and
  trimmed usernames, case-sensitive passwords, the demo-account shortcut.
- **Being kept out:** wrong password, unknown user, empty fields, deactivated
  accounts, and a locked account refusing even the correct password.
- **Not leaking:** an unknown username and a wrong password return the identical
  message, so the form cannot be used to discover who works here. Passwords never
  appear in readable form in storage, and the field is cleared after a failure.
- **Lockout:** five failures locks the account for 60 seconds; a successful
  sign-in or a password reset clears the counter.
- **Sessions:** "Keep me signed in" survives a reload and the unticked case does
  not; a session older than 12 hours, one naming an unknown user, one naming a
  deactivated user, and a corrupt one each force a fresh sign-in.
- **Sign-out:** clears both storages, closes any open panel, and a reload
  afterwards still shows the login screen.
- **Credentials:** owners can reset a password (the old one stops working) and
  change a username (the new one signs in); duplicate usernames, malformed
  usernames and passwords under six characters are rejected.
- **Isolation:** signing out and back in as another role swaps permissions and
  leaves none of the previous user's view on screen.

Verified separately in a real browser: login, failed attempt with the countdown,
sign-in as owner, manager and technician, technician seeing only their own four
jobs with no prices, session surviving a reload, and a clean console throughout.

## Bugs found and fixed during testing

| # | Bug | Impact | Fix |
|---|---|---|---|
| 1 | Duplicate phone accepted at check-in | The same customer existed twice, so history was split | Blocked, and the existing customer is named |
| 2 | Duplicate plate accepted at check-in | One car had two owners | Blocked, and the owner is shown |
| 3 | The same car could be checked in twice | Two open jobs, so double billing | Blocked, and the open job is named |
| 4 | Mileage could go backwards | Wrong service reminders | Must be at least the last recorded mileage |
| 5 | A discount change didn't reset a sent quote | The customer approved an unseen price | Quote returns to Draft |
| 6 | Duplicate "next service" follow-ups | Reminder list clutter | Older ones close automatically |
| 7 | A new user was missing from the sign-in list | A reload was needed | Updates immediately |
| 8 | A technician with open jobs could change role | Jobs pointed at a non-technician | Blocked until reassigned |
| 9 | Payment was possible with no items | A job could close for $0 | Blocked |

## Earlier audit fixes

- Sign-in is by user rather than by role, so role edits take effect.
- Technicians can't open other technicians' jobs or customers.
- Parts are reserved when a quote is approved, and available = on hand − reserved.
- Extra work added during service needs customer approval before payment.
- Only owners and managers can change prices. Advisor discounts are capped at 10%.
- A stock history ledger records every receive, sale and adjustment.
- Users are deactivated, not deleted, so history is kept.

## All checks

### 1 Check-in

- ✅ New customer + new vehicle creates order in Reception
- ✅ Plate saved in uppercase
- ✅ Order number increments (WO-1048)
- ✅ Activity log records who checked in
- ✅ Required fields enforced
- ✅ Duplicate phone for new customer is rejected
- ✅ Duplicate plate for new vehicle is rejected
- ✅ Same vehicle cannot be checked in twice while a job is open
- ✅ Mileage lower than last visit is rejected
- ✅ Existing customer, existing vehicle, valid mileage works
- ✅ Check in from customer page pre-selects the vehicle
- ✅ No script errors

### 2 Inspection

- ✅ Checklist is locked in Reception
- ✅ Start inspection moves to Inspection stage
- ✅ Cannot finish with unchecked items
- ✅ Button shows how many items are left
- ✅ Notes are saved
- ✅ Finish moves to Quotation with draft quote
- ✅ Problem items appear as findings with "Add to quote"
- ✅ Checklist locks after inspection
- ✅ No script errors

### 3 Quotation

- ✅ Cannot send an empty quote
- ✅ Add part from stock copies price and cost
- ✅ Adding same part twice merges quantity
- ✅ Zero quantity rejected
- ✅ Add labor
- ✅ Totals are correct (2x180 + 150 = 510)
- ✅ Profit shown to owner (510 - 200 = 310, 61%)
- ✅ Discount cannot exceed subtotal
- ✅ Owner can give a large discount
- ✅ Send quote sets status Sent
- ✅ Editing items after sending returns quote to Draft
- ✅ Changing discount after sending returns quote to Draft
- ✅ Remove item works and logs its name
- ✅ No script errors

### 4 Approval and stock

- ✅ Approve reserves parts (brake pads reserved 1)
- ✅ Approval blocked when not enough available stock
- ✅ Warning shown when adding more than available
- ✅ Receiving a PO makes approval possible
- ✅ PO receive writes stock history
- ✅ Two jobs cannot both take the last parts
- ✅ Decline creates follow-up and does not touch stock
- ✅ No script errors

### 5 Service and payment

- ✅ Extra work added in service needs approval
- ✅ Payment button hidden while extra work pending
- ✅ Approve extra work unlocks payment
- ✅ Payment closes order with correct amount (320 + 60 = 380)
- ✅ Stock deducted and reservation released (oil 38 → 37, reserved 0)
- ✅ Sale written to stock history
- ✅ Next service follow-up created
- ✅ Old open "service due" follow-up for same customer is closed (no duplicates)
- ✅ Cannot take payment on an order with no items
- ✅ Removing an approved part in service releases its reservation
- ✅ Revenue today updates on dashboard
- ✅ No script errors

### 6 Inventory

- ✅ Available = on hand − reserved shown
- ✅ Add part
- ✅ Duplicate SKU rejected
- ✅ Adjust stock writes history with reason
- ✅ Cannot adjust below reserved
- ✅ Search filters parts
- ✅ Reorder low stock pre-fills lines
- ✅ New PO with multiple lines
- ✅ Receive PO adds to stock
- ✅ Received PO cannot be received again
- ✅ Add supplier
- ✅ No script errors

### 7 Customers and follow-ups

- ✅ Add customer with vehicle
- ✅ Add second vehicle to customer
- ✅ Duplicate plate on add vehicle rejected
- ✅ Customer history lists their orders
- ✅ Follow-ups sorted with overdue first
- ✅ Book follow-up opens check-in for that customer and closes the follow-up
- ✅ Mark follow-up done
- ✅ Search by plate
- ✅ Names with HTML are shown as text (no injection)
- ✅ No script errors

### 8 Roles and permissions

- ✅ Owner sees revenue, cost, add user
- ✅ Manager sees profit but cannot manage users
- ✅ Advisor: no revenue/profit on dashboard
- ✅ Advisor: sees selling price, not cost
- ✅ Advisor: discount capped at 10%
- ✅ Advisor: cannot add parts or change prices
- ✅ Advisor: price change attempt is ignored even if forced
- ✅ Advisor: reports hide shop revenue
- ✅ Technician: only own jobs listed
- ✅ Technician: cannot open another tech's job
- ✅ Technician: no prices anywhere on own job
- ✅ Technician: cannot edit items or send quote
- ✅ Technician: can do inspection on own job
- ✅ Technician: can mark work done but not take payment
- ✅ Technician: customers limited to own jobs
- ✅ Technician: customer history hides other techs' jobs
- ✅ Technician: follow-ups and purchase hidden
- ✅ No script errors

### 9 User management

- ✅ Add user
- ✅ Duplicate name rejected
- ✅ New user appears in sign-in list
- ✅ New technician appears in check-in technician list
- ✅ Change role takes effect
- ✅ Cannot demote the last owner
- ✅ Cannot change a technician with open jobs to another role
- ✅ Cannot deactivate a user with open jobs
- ✅ Deactivate keeps history (name still shown on old jobs)
- ✅ Cannot deactivate yourself
- ✅ Signing in as a demoted user uses their new permissions
- ✅ No script errors

### 10 Settings and saving

- ✅ Theme colour applies
- ✅ Data survives a page reload
- ✅ Signed-in user survives reload
- ✅ Order counter survives reload (no duplicate WO numbers)
- ✅ Reset restores demo data
- ✅ No script errors

## Not covered by automated tests

- Visual layout on real phones and laptops (check it by hand before a demo)
- Chart rendering (Chart.js isn't loaded in the test browser)
- Real multi-user use (the demo stores data per browser)
