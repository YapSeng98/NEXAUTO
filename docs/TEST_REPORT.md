# Test report

**Result: 538 of 538 checks passed.**

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
| Technician check-in | 13 | 13 |
| Job notes | 16 | 16 |
| Part photos | 10 | 10 |
| Edit job details | 16 | 16 |
| Jobs completed per technician | 9 | 9 |
| Job ageing and reminders | 12 | 12 |
| Reorder suggestions | 10 | 10 |
| Editable lists | 18 | 18 |
| AI panel | 11 | 11 |
| Quote stage messaging | 7 | 7 |
| Technician line items | 18 | 18 |
| Workshop name | 11 | 11 |
| Purchase order list | 9 | 9 |
| Quotation preview | 19 | 19 |
| Shop-configurable settings | 19 | 19 |
| Locked settings | 9 | 9 |
| Role permissions | 25 | 25 |
| Findings linked to quote lines | 7 | 7 |
| First-run workshop setup | 19 | 19 |
| Settings gating | 7 | 7 |
| Awaiting payment stage | 10 | 10 |
| Money that arrives later | 16 | 16 |
| Owed jobs in the orders list | 12 | 12 |
| Process bar when money is owed | 10 | 10 |
| Money owed in the pipeline | 10 | 10 |

## Awaiting payment, and money that arrives later (v0.21.0)

Two gaps a user asked about, and both were real.

**“Mark work done” set a flag and left the job in *In service*.** A finished car
waiting to be collected is a different thing from a car on the ramp, and the
pipeline could not tell them apart. There is now a sixth stage,
**Awaiting payment**, between In service and Completed. Payment is taken from
there, the stalled-job reason distinguishes the two ("work not marked done" vs
"waiting to be collected and paid"), and the dashboard can show how many cars are
finished and waiting.

**Revenue counted money that had not arrived.** `paidToday()` counted any
completed job with a payment date, so a bank transfer that had not cleared showed
up in today's takings. Payment now records whether the money actually arrived.
The job closes either way — the work is done and the car has gone — but anything
marked awaiting funds is excluded from the dashboard and every report until it is
confirmed, and appears under **Insights → Money owed** with its age and a
Received button.

26 checks cover both, including that the stock still moves and the follow-ups are
still created when the money is outstanding, that settling is logged with a name,
that someone without the payment permission cannot settle, and that records
created before `settled` existed still count as paid.

### The bugs this found

| # | Bug | Found by |
|---|---|---|
| 24 | The dashboard pipeline was hardcoded to `STAGES.slice(0,4)`, so the new stage was invisible on it | `The pipeline counts it separately from work in progress` |
| 25 | A job closed with the money still owed showed a plain **Completed** badge in Orders, identical to a paid one — the only sign was in Insights | A user asking where an unpaid job should sit |

Bug 25 was the cost of a design decision made without following it through the
rest of the UI: closing the job is right, but only if the outstanding money is
visible where people actually look. Chased through three screens in the end, each
one reported by the user from what they were looking at: the Orders row badges
**Money owed** instead of Completed with a filter chip beside it; the job's own
progress bar gains a Money owed step between Awaiting payment and Completed and
rests there rather than claiming the job is done; and the dashboard pipeline
grows a Money owed row whenever there is any.

The lesson is worth recording: a state that exists in the data has to exist in
every place the data is drawn, or it is invisible exactly when it matters.

Verified end to end in a browser as well: a job driven from check-in through
inspection, quoting, approval, work done, closed on a bank transfer with the
money outstanding, confirmed absent from revenue, then settled from the Insights
list and confirmed present.

## Two Settings cards had no permission gate (v0.20.0)

Writing the presentation slide that lists who may change what sent me back to
check the claim, and two cards in **Settings → General** turned out to have no
`data-*` gate on them at all:

| # | Bug | Impact |
|---|---|---|
| 22 | The brand colour card was open to every role | A technician could restyle the shop |
| 23 | **The reset card was open to every role** | A technician could wipe every job, customer and part |

Colour is now owner-or-manager, reset is owner-only, and both handlers refuse the
action outright rather than relying on the card being hidden — checks force a
`theme` and a `reset` button into the page as a technician and assert the colour
and the order count are unchanged.

Worth noting how this surfaced: not from a test, and not from using the app, but
from having to write down the permission model precisely enough to put it in
front of someone.

## Setting up a new workshop (v0.19.0)

There was no way to start a workshop that was not the demo. The sign-in page now
offers **Create your workshop**: a name, the owner's own account, and a choice of
whether to keep the sample parts list. It hands back an empty shop — no jobs, no
customers, no history, job numbers from 1001 — with the new owner signed in and
the sample parts at zero stock so the shop counts its own in.

19 checks cover it, including that a failed attempt leaves the demo untouched,
the demo accounts stop working afterwards, and the owner can then add staff
normally.

### The bug this found

| # | Bug | Impact |
|---|---|---|
| 21 | The modal layer sits at `z-index:40`, the sign-in screen at `60`. Any modal opened from the sign-in page rendered **behind** it | The setup form was open, focusable and submittable — and completely invisible |

The tests passed while this was broken, because jsdom has no paint: the classes,
the form fields and the submit all behaved. Only opening it in a browser showed
the form was underneath. Modals now sit above the sign-in screen, and toasts
above modals.

## End-to-end pass, and the bug it found (v0.18.0)

The whole workflow was driven in a real browser, one job from check-in to
payment: sign-in and a failed attempt, check-in with the duplicate-phone and
duplicate-plate guards, inspection as the assigned technician, the technician
adding a part and unpriced work, the advisor pricing and sending, the new
`approve` permission toggled live, approval reserving stock, extra work blocking
payment until approved, payment deducting stock and writing movements, then
inventory, purchasing, customers, reports, insights and all five settings tabs.

### The bug it found

| # | Bug | Impact |
|---|---|---|
| 20 | Whether a finding had been quoted was decided by **substring-matching the finding's name against the line names**. Anyone who typed their own description — which the technician quote flow now encourages — left the finding looking unquoted | On payment the shop got a follow-up telling it to chase a customer about a problem it had just repaired and invoiced |

A quote line raised from a finding now carries that finding's index, so the link
is explicit rather than guessed; the old wording match stays as a fallback for
lines named after the finding. Six checks cover it, including that a line renamed
to something completely different still counts, and that a problem nobody quoted
still raises the follow-up it should.

Two notes for anyone repeating this: `window.confirm` must be stubbed before
driving the app from the console, or the reset button's native dialog freezes the
renderer; and `[data-action="add-labor"]` matches the finding's **Add to quote**
button first, so the plain one needs `:not([data-prefill])`.

## Approving a quote is its own permission (v0.17.0)

Recording the customer's answer was bundled into `edit`, so the only way to let
someone approve a quote was to also let them price and discount it. It is now
its own flag, `approve`, on the Roles matrix and defaulting to today's
behaviour: owner, manager and advisor yes, technician no.

Both handlers refuse the action outright rather than relying on the hidden
button — a check appends an `approve-quote` button to the panel of a role
without the flag, clicks it, and asserts the job stays in quotation.

## Responsive audit (v0.16.0)

Checked at 390px (phone), 768px (tablet, and the width an iPad in split view
actually renders at) and 1024px, across every view, with the order panel open.
The browser extension renders at a fixed 2560px viewport, so window resizing does
not drive media queries — the views were loaded in sized iframes instead, which
get their own viewport, and audited for horizontal page scroll, content clipped
inside its box, and elements past the right edge.

**One real fault.** The four-up grids — quick actions and the KPI row — switched
to four columns at `min-width:700px`. At 768px the 232px sidebar leaves roughly
480px of content, so four buttons got ~110px each and every label wrapped or
collided. Reported by a user from an iPad. Both grids now size by content
(`repeat(auto-fit, minmax(165px, 1fr))`), so the column count follows the space
actually available: two across at 390 and 768, four at 1024 and up.

Everything else came back clean. The remaining horizontal overflow is all inside
containers that scroll on purpose — wide tables in `.table-wrap`, filter chips in
`.chips` — and no view scrolls the page sideways at any of the three widths.

## The permission matrix is editable (v0.15.0)

`PERMS` was a constant. It is now the *default* — an owner opens
**Settings → Roles** and ticks what each role may do, across 11 permissions and
3 editable roles, and the change applies the moment it is ticked.

The owner column is fixed at everything and disabled. `perms()` forces that row
on regardless of what is stored, so re-enabling the checkbox in devtools and
firing the event changes nothing — a check does exactly that and asserts
`canStaff` stays `1` and nothing is written.

The checks follow each grant through to behaviour rather than stopping at the
stored value: granting a technician `price` makes prices appear on lines *and*
switches their quote document from the job sheet to the priced quotation;
granting `config` opens the Lists tab that was showing them a locked card;
revoking `pay` from an advisor removes the payment button while leaving prices
visible.

### The bugs this found

| # | Bug | Found by |
|---|---|---|
| 18 | "Own jobs" was defined as `technicianId === me()`, so any non-technician role with `all` revoked saw **nothing** — the app had no concept of an advisor's own jobs | `Revoking "see every job" limits a manager to their own` |
| 19 | The locked card told a **manager** that "only an owner or manager can change this" on the owner-only Roles tab, and read "What each role is allowed to do **are** set" | Reported by the user from the screen |

Bug 19 got through because the existing checks asserted a locked card was
*present*, never what it said. `settingsLocked()` now takes who may change it and
a full sentence, and three checks read the rendered wording.

That assumption was invisible while `all` was hardcoded on for everyone except
technicians. Making the flag editable is what exposed it. `visibleOrders()`,
`allowedOrder()` and `allowedCustomer()` now share one `isMine()` that counts
either seat on the job.

## Settings a role cannot change (v0.14.0)

Splitting Settings into tabs left a hole: a technician opening **Lists** or
**Timing** saw a completely blank page, because every card on it is gated. Those
tabs now render a locked card explaining that the values are set for the whole
workshop and who to ask. Reported from the screen by a user.

Fixed alongside it: the staff list was rendering each person's **username** and
hiding it with CSS from anyone without account-management rights, which is the
same weak pattern as C1. The username is now left out of the HTML entirely for
those roles — a check asserts it is absent from `innerHTML`, not merely
invisible.

## Everything a shop can configure (v0.13.0)

The hardcoded values a real workshop would want to own are now in
`DB.settings`, editable by an owner or manager. The checklist editor was
generalised into one list editor driving five lists, and the numbers moved into
four grouped cards.

| Now editable | Was |
|---|---|
| Payment methods | `["Card","Cash","PayNow","Bank transfer"]` |
| Part categories | `["Fluids","Filters","Brakes",…]` |
| Stock adjustment reasons | `["Stock count","Damaged","Returned","Other"]` |
| Customer tiers | `Gold` / `Silver` / `Standard`, with `Standard` hardcoded for new customers |
| Follow-up timing | 14 / 30 / 180 days and +10,000 km |
| Stalled-job thresholds | 1–4 days, varying per stage |
| Reorder window | 90 days of usage, 45 days of cover |
| Sign-in policy | 12-hour session, 5 attempts, 60-second lock |

The checks do not stop at "the setting saved" — each one is followed through to
where it is used: a new payment method appears when closing a job, a new category
when adding a part, moving a tier to the top changes what a new customer gets,
tightening the stalled thresholds flags more jobs, a shorter reorder window
changes the note on the Insights table, and a two-attempt lockout locks after
two. Session length is verified by reloading with a session older than the new
limit.

Settings also became four tabs. That page had grown to thirteen cards and nearly
4,000px of scroll; it is now four tabs of 450–2,200px. The tabs broke 54 existing
tests that assumed one long page, which is the honest cost of the change and the
reason the harness now has a `setTab()` helper.

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
