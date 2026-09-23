# Security review

Reviewed: the single-page demo (`index.html`) as of v0.13.0 — browser storage,
the sign-in screen, shared job notes, part photos, the quotation document, the
optional AI panel and the shop-configurable settings. Every finding below was
checked against the running app, not assumed from reading the code.

**The one-line summary:** the app is well built for a demo and carefully written
in the places that usually go wrong (output escaping, input validation, state
transitions), but it has no security boundary at all. Everything — the data, the
permission rules and the password check — lives in the visitor's browser, where
the visitor controls all three. Nothing here is a bug to patch; it is the cost of
having no server. The fix is the backend in [SUPABASE_PLAN.md](SUPABASE_PLAN.md).

---

## Severity key

| | Meaning |
|---|---|
| **Critical** | Confidentiality or integrity is broken for a normal, non-technical user path, or a motivated user can trivially take an action they are denied |
| **High** | Requires opening devtools or editing storage, but needs no special skill |
| **Medium** | Real weakness, limited blast radius in the demo |
| **Low** | Hygiene; worth fixing when the backend lands |

---

## Critical

### C1. Role permissions are CSS, so hidden money is still delivered to the page

`PERMS` sets `data-can-*` attributes on `<html>`, and a CSS rule hides elements
marked `[data-cost]`, `[data-price]`, `[data-revenue]`:

```css
html[data-can-cost="0"] [data-cost] { display:none !important; }
```

The values are still rendered into the DOM and shipped to every role. Verified
live while signed in as **Marcus Lee (technician)**, who is not allowed to see
prices at all. Reading the panel DOM returned:

```
data-cost   "· cost $80"                  visibleToUser: false
data-price  "$180"                        visibleToUser: false
data-cost   "Cost $132  Profit $213 · 62%" visibleToUser: false
```

A technician who opens devtools — or who runs one line in the address bar, or
uses Reader Mode, or copies the page — reads the shop's margin on every job.
Disabling one CSS rule reveals every hidden number in the app at once.

**Impact:** cost prices, supplier margins, daily revenue and gross profit leak to
every signed-in user regardless of role.
**Fix:** the server must never send fields the caller is not entitled to. Column
-level grants + RLS, not CSS. See [SUPABASE_PLAN.md](SUPABASE_PLAN.md) §4.

### C2. The whole database is user-writable

`localStorage["nexauto_demo_v8"]` holds orders, payments, stock, costs and the
staff table. Confirmed readable and editable from the page context. A user can:

- set their own `role` to `"owner"` and reload,
- mark an order paid without taking money,
- edit `cost` and `price` on any part,
- delete the movement history that would show they did it.

**Impact:** no integrity guarantee on any record. Every "permission" in the app
is advisory.
**Fix:** data moves server-side; the client gets a session token, not the table.

### C3. Authentication is decorative

The login screen added in v0.5.0 gates the UI, but the check runs in the same
page it protects. `attemptLogin()` compares a digest computed in the browser
against a digest stored in the browser. A user who does not want to authenticate
does not have to: setting `document.documentElement.dataset.authed = "1"` shows
the app, and writing a `nexauto_session` value for any staff id signs them in as
that person.

The lockout counter (5 attempts, 60s) lives in `localStorage["nexauto_lockouts"]`
and is deleted by the attacker it is meant to stop.

**Impact:** the login screen raises the bar for a curious colleague, and stops
nobody else. It should be understood as a UI state, not a control.
**Fix:** Supabase Auth issues a signed JWT the client cannot mint. §3.

---

## High

### H1. The password digest is not a password hash

`digest()` is a 64-bit FNV-style mix, chosen so the demo stays synchronous and
dependency-free. It is fast, unsalted against GPUs, and reversible by brute force
in negligible time. It is labelled as such in the source, and the seeded demo
passwords are public by design.

**Fix:** never migrate this function. Supabase Auth stores bcrypt at cost 10 and
the hash never reaches the browser. §3.

### H2. Password reset requires no confirmation of identity

An owner can set any user's password from **Settings → Edit user** without
re-entering their own password, and the new password is typed into a plain
`type="text"` field so it can be read over the shoulder and is captured by
browser autofill heuristics.

**Fix:** require re-authentication for privilege operations (step-up auth), and
send an invite/reset link instead of setting a password on someone's behalf. §6.

### H3. No audit trail that survives the user

`DB.movements` and `o.log` record who did what, but they are written to the same
storage the actor controls, so the log can be edited to remove the entry. An
append-only record is the point of an audit log.

**Fix:** `audit_log` table, insert-only policy, no update or delete grant to any
application role. §5.

---

## Medium

### M1. Session fixation is possible in the demo model

`writeSession()` stores `{userId, at}` with no server-issued nonce, so a session
is forgeable by construction (this is C3 restated). Within the demo the practical
issue is that the 12-hour expiry is measured from a timestamp the client wrote
and can rewrite.

**Fix:** server-issued JWT with `exp`, refresh-token rotation on use. §3.

### M2. Demo credentials are published on the login screen

Deliberate and correct for a public demo, but the card is rendered
unconditionally. If this file is ever deployed with real data, the front door
lists working accounts.

**Fix:** render the card only when `DB` is unmodified seed data, or strip it at
build time for non-demo deploys. Tracked in §7 as a pre-production gate.

### M3. Third-party scripts load without integrity checks — *Chart.js fixed in v0.6.0*

Chart.js now loads with an SRI hash and `crossorigin`:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"
        integrity="sha384-bs/nf9FbdNouRbMiFcrcZfLXYPKiPaGVGplVbv7dLGECccEXDW+S3zjqSKR5ZEaD"
        crossorigin="anonymous" referrerpolicy="no-referrer"></script>
```

so a compromised CDN can no longer substitute the file — the browser refuses a
script whose hash does not match. (The previous URL pointed at a version cdnjs
does not host and returned 404, which is how this was noticed: the charts had
never rendered.)

**Still open:** Google Fonts is loaded the same way and cannot carry an SRI hash,
because the stylesheet it serves varies by user agent. Vendoring the font files
locally is the only real fix, and also removes a third-party request that sees
every visitor.

### M4. No Content-Security-Policy

There is no CSP header or meta tag. The app's own escaping is disciplined (see
"What is already right"), so there is no known injection path today, but CSP is
the defence that survives the next feature someone adds in a hurry.

**Fix:** serve `default-src 'self'` with an explicit allowlist for the CDN and
font origins. Needs a real host; GitHub Pages cannot set headers, so use the
`<meta http-equiv>` form or move to a host that can.

---

## Low

- **L1.** `confirm()` guards destructive actions (reset demo data, deactivate
  user). Fine for a demo; a real destructive action should require typing the
  affected name.
- **L2.** Session lives in `sessionStorage` unless "Keep me signed in" is ticked.
  Correct choice, but any XSS reads it. Server-side sessions belong in
  `HttpOnly; Secure; SameSite=Lax` cookies.
- **L3.** No rate limit on anything except login. Cheap to add server-side.
- **L4.** ~~Usernames are enumerable through the user list in Settings.~~ Fixed in
  v0.14.0: the username is omitted from the markup for any role without
  `staff`, rather than hidden with CSS.
- **L5.** No password complexity rule beyond a 6-character minimum.

### M5. The AI panel puts an API key in browser storage

Added in v0.9.0. The **Ask about this workshop** panel calls the Anthropic API
directly from the page, so the key lives in `localStorage` and travels on every
request. This is defensible only because of how it is scoped:

- the key is the **visitor's own**, typed in by them, never shipped with the app;
- the panel is off until they add one, and **Disconnect** removes it;
- the UI says where the key is stored before asking for it.

It is still a key in a browser. Anyone with access to that browser (or any XSS in
this page) can read it. The card says to use a rotatable key, never a shared one.

**One thing this does better than the rest of the app:** the payload sent to the
API is built per role. A technician's request carries only their own jobs and no
cost, price or revenue fields at all — verified by reading the outgoing request
body. That is real filtering of the data, not CSS hiding it after the fact. It is
what C1's fix should look like everywhere.

**Fix:** a server-side proxy holding one key, which is the same backend that
fixes C1-C3. See [SUPABASE_PLAN.md](SUPABASE_PLAN.md) — an Edge Function is the
natural home.

---

## What is already right

Worth stating plainly, because these are the things that usually go wrong and
here they do not:

- **Output escaping is consistent.** Every user-controlled string reaching HTML
  goes through `esc()` — customer names, plates, inspection notes, activity log
  entries, follow-up text. I grepped for interpolations that skip it; the ten
  hits are all string comparisons for search or values stored as data, never
  markup. There is no XSS path in the current code.
- **Input validation is real, not cosmetic.** Duplicate phone, duplicate plate,
  mileage lower than the last visit, the same vehicle checked in twice, zero
  quantity, discount above subtotal — all rejected with a specific message.
- **State transitions are guarded.** A quote cannot be sent empty, payment is
  blocked while unapproved extra work exists, stock is reserved on approval and
  deducted on payment, and the inspection locks once finished.
- **Permission rules are coherent and centralised.** One `PERMS` table drives
  everything. The rules themselves are right — the problem is only where they
  are enforced.
- **The forced-input case is handled.** The suite proves that an advisor who
  re-enables the disabled price field in devtools still cannot change a price:
  the handler re-checks `can("cost")` rather than trusting the DOM. That is the
  correct instinct, and it is exactly the instinct the backend needs to apply to
  every field.
- **The limitations are documented, not hidden.** The README and the login screen
  both say permissions are browser-side.
- **Everything user-written is escaped at render.** That now includes job notes,
  the workshop name, the editable lists and every field on the quotation
  document. Checks store `<img src=x onerror=...>` as a note, a workshop name and
  a customer name, and assert no element is created in any of the three.
- **The AI payload is filtered by role before it leaves.** A technician's request
  carries only their own jobs and no money fields at all. That is the one place
  in the app where a permission actually withholds data rather than hiding it.

### Two gates that were missing, now closed

Found while writing the permission model down for a presentation, not by a test:

- **The brand colour card** was open to every role. Now owner-or-manager.
- **The reset card** was open to every role, so any signed-in user could wipe
  every job, customer and part. Now owner-only.

Both handlers refuse the action rather than relying on the card being hidden,
which is the pattern the rest of the app should follow and mostly does not (C1).

### First-run setup

`Create your workshop` on the sign-in page builds an empty shop with a single
owner. It is not an account-creation endpoint in any meaningful sense — it writes
to this browser's storage, like everything else here — so it neither adds nor
removes risk. With a backend it becomes the one place that needs rate limiting
and an invite token, because it is the only unauthenticated write.

### One note on the editable permission matrix

An owner can now grant or revoke permissions per role in Settings → Roles. This
does not change the app's security posture in either direction: the rules were
already advisory (C1, C2), and an editable rule that is not enforced is no weaker
than a hardcoded rule that is not enforced. The owner row is forced on in code so
that an owner cannot remove the last permission capable of restoring the others.

When the backend lands, this matrix is exactly what RLS policies should read
from, rather than each policy hardcoding role names.

### One note on the configurable settings

Sign-in policy (session length, lockout attempts and duration) is now editable by
the owner. That does not weaken anything, because C3 already establishes the
sign-in check is not a security control — a session is forgeable regardless of
how long it claims to last. When the backend lands, these values move to the
server and become real, and at that point the UI should stop offering to loosen
them without a second factor.

---

## Priority order

| | Finding | When |
|---|---|---|
| 1 | C1, C2, C3 — no server boundary | The Supabase migration; nothing else fixes these |
| 2 | H1, H2 — credential handling | Falls out of Supabase Auth |
| 3 | H3 — audit log | Phase 2 of the migration |
| 4 | M3, M4 — SRI and CSP | **Now.** Independent of the backend, minutes of work |
| 5 | M2 — demo credentials gate | Before any non-demo deploy |
| 6 | Low items | With the backend |

M3 and M4 are the only findings worth acting on before the migration. Everything
above them is the same finding wearing different clothes: *there is no server*.
