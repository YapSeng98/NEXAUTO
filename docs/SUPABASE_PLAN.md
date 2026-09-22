# Supabase migration plan

How NEXAUTO moves from "everything in the browser" to a real backend, and how
each finding in [SECURITY.md](SECURITY.md) gets closed by doing it.

The goal is not to port the demo. It is to move the three things the browser
should never have owned — **the data, the permission rules, and the identity
check** — to the other side of a network boundary, and leave the browser holding
nothing but a token and some HTML.

---

## 1. Why Supabase fits this app

| Need | What Supabase gives |
|---|---|
| Server-enforced permissions | Row Level Security runs inside Postgres — every query is filtered whether it comes from the app, curl, or a stolen token |
| Real auth | bcrypt passwords, signed JWTs, refresh rotation, password reset by email |
| Multi-device | Realtime subscriptions replace "data lives in one browser" |
| Money-safe writes | Postgres transactions and functions for stock and payment |
| Small team | Managed; no server to run |

The alternative — a hand-written API — is more flexible and much more work. The
deciding factor is RLS: it puts the rule next to the data, so a forgotten check
in one endpoint cannot leak the whole table.

---

## 2. Data model

Eleven tables, everything scoped by `shop_id` from day one (adding multi-branch
later is a rewrite; adding it now is a column).

```sql
create table shops (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- One row per staff member. id matches auth.users.id.
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  shop_id     uuid not null references shops(id),
  full_name   text not null,
  role        text not null check (role in ('owner','manager','advisor','technician')),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table customers (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references shops(id),
  name       text not null,
  phone      text not null,
  tier       text not null default 'Standard',
  created_at timestamptz not null default now(),
  unique (shop_id, phone)
);

create table vehicles (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references shops(id),
  customer_id uuid not null references customers(id) on delete cascade,
  plate       text not null,
  model       text not null,
  unique (shop_id, plate)
);

create table parts (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references shops(id),
  sku         text not null,
  name        text not null,
  category    text not null,
  stock       integer not null default 0 check (stock >= 0),
  reserved    integer not null default 0 check (reserved >= 0),
  reorder_at  integer not null default 0,
  cost_cents  integer not null,          -- restricted column, see §4
  price_cents integer not null,
  supplier_id uuid references suppliers(id),
  unique (shop_id, sku)
);

create table orders (
  id            uuid primary key default gen_random_uuid(),
  shop_id       uuid not null references shops(id),
  number        text not null,
  customer_id   uuid not null references customers(id),
  vehicle_id    uuid not null references vehicles(id),
  stage         text not null check (stage in
                  ('reception','pre-inspection','quotation','in-service',
                   'awaiting-payment','completed','declined')),
  advisor_id    uuid references profiles(id),
  technician_id uuid references profiles(id),
  mileage       integer not null,
  complaint     text,
  quote_status  text not null default 'draft',
  stage_since   timestamptz not null default now(),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  work_done     boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (shop_id, number)
);

create table order_items (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references shops(id),
  order_id    uuid not null references orders(id) on delete cascade,
  kind        text not null check (kind in ('part','labor')),
  part_id     uuid references parts(id),
  name        text not null,
  qty         integer not null check (qty > 0),
  price_cents integer not null,
  cost_cents  integer not null,          -- restricted column
  approved    boolean not null default false,
  added_by    uuid references profiles(id),
  needs_price boolean not null default false,
  -- which inspection point this line answers, so a renamed line keeps the link
  answers_finding integer
);

-- The shared note thread on a job. Readable by anyone who can read the job.
create table job_notes (
  id       uuid primary key default gen_random_uuid(),
  shop_id  uuid not null references shops(id),
  order_id uuid not null references orders(id) on delete cascade,
  author_id uuid not null references profiles(id),
  body     text not null check (char_length(body) between 1 and 500),
  at       timestamptz not null default now()
);

-- Everything a shop configures: lists, timings, name, brand colour.
create table shop_settings (
  shop_id  uuid primary key references shops(id) on delete cascade,
  app_name text not null default 'NEXAUTO',
  color    text,
  lists    jsonb not null default '{}'::jsonb,
  timings  jsonb not null default '{}'::jsonb
);

create table stock_movements (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references shops(id),
  part_id    uuid not null references parts(id),
  qty        integer not null,
  kind       text not null check (kind in ('receive','sale','adjust')),
  ref        text,
  reason     text,
  actor_id   uuid not null references profiles(id),
  at         timestamptz not null default now()
);

create table audit_log (
  id       bigserial primary key,
  shop_id  uuid not null references shops(id),
  actor_id uuid not null references profiles(id),
  action   text not null,
  entity   text not null,
  entity_id uuid,
  detail   jsonb,
  at       timestamptz not null default now()
);
```

Plus `suppliers`, `purchase_orders`, `po_items`, `inspections`, `opportunities`
on the same pattern — same `shop_id` column, same policy shape.

Two constraints the demo enforces in JavaScript become database constraints here:
a quote cannot be sent while any of its lines has `needs_price`, and an order's
inspection is a snapshot of the checklist rather than a reference to it, so
editing `shop_settings.lists` never rewrites history.

`shop_settings` also carries the permission matrix. Policies should read the
shop's own matrix rather than hardcoding role names, so that ticking a box in
Settings changes what the database allows and not merely what the UI shows —
which is the whole point of moving the rules server-side.

**Creating a shop** is the one unauthenticated write, and the demo's first-run
setup becomes a `create_shop` RPC: it makes the `shops` row, the owner's
`auth.users` entry and their `profiles` row in one transaction, and it is the
endpoint that needs rate limiting and, for anything public, an invite token.

**Money is integer cents.** Floats lose money at the third decimal and the loss
compounds through discount → subtotal → margin.

**Payment carries `settled` and `settled_at`.** A job closes when the work is
done and the car has gone; whether the money has landed is a separate fact.
Revenue views filter on `settled`, so unconfirmed money never reaches a report.
A real billing module would replace this with an invoice and an allocations
table — the flag is the smallest thing that keeps the numbers honest today.

---

## 3. Authentication — closes C3, H1, H2

Supabase Auth, email + password. Passwords are bcrypt'd server-side and never
reach the browser; `digest()` in `index.html` is deleted, not ported.

**Usernames.** Staff sign in with `alex.tan@<shop-domain>`. Keeping the demo's
bare-username field is possible via a `username → email` lookup RPC, but it adds
an unauthenticated endpoint that confirms which usernames exist. Recommend real
email addresses: they also give you password reset and invites for free.

**Role claims.** Put `role` and `shop_id` into the JWT with a custom access token
hook, so policies read them from the token instead of re-querying `profiles` on
every row:

```sql
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable as $$
declare claims jsonb; p record;
begin
  select role, shop_id, active into p from public.profiles where id = (event->>'user_id')::uuid;
  if p is null or not p.active then
    return jsonb_set(event, '{claims,app_role}', '"none"');
  end if;
  claims := event->'claims';
  claims := jsonb_set(claims, '{app_role}', to_jsonb(p.role));
  claims := jsonb_set(claims, '{shop_id}', to_jsonb(p.shop_id));
  return jsonb_set(event, '{claims}', claims);
end $$;
```

Helper functions used by every policy:

```sql
create or replace function auth.app_role() returns text
language sql stable as $$ select coalesce(auth.jwt()->>'app_role','none') $$;

create or replace function auth.shop_id() returns uuid
language sql stable as $$ select nullif(auth.jwt()->>'shop_id','')::uuid $$;
```

> **The footgun to avoid:** a policy on `profiles` that does
> `select role from profiles where id = auth.uid()` recurses infinitely. Claims
> from the token avoid it. The trade-off is that a role change only takes effect
> on the next token refresh — set the refresh interval to 5 minutes and force a
> sign-out on deactivation.

**Step-up for privilege operations (H2).** Changing a role, resetting a
password, or deactivating a user requires a fresh re-authentication; check
`auth.jwt()->>'aal'` or a recent `auth_time` claim in the RPC.

---

## 4. Hiding cost and profit properly — closes C1

This is the finding CSS cannot fix, and it is the one place the plan needs care:
**RLS filters rows, not columns.** A technician denied `cost_cents` still needs
`parts` rows to do their job.

Three options, in order of preference:

**A. Views per audience (recommended).** Revoke direct access to the base table;
expose views that physically lack the restricted columns.

```sql
revoke all on parts from authenticated;

create view parts_basic
with (security_invoker = on) as
select id, shop_id, sku, name, category, stock, reserved, reorder_at, supplier_id
from parts;                                   -- no cost, no price

create view parts_priced
with (security_invoker = on) as
select id, shop_id, sku, name, category, stock, reserved, reorder_at,
       supplier_id, price_cents
from parts;                                   -- price, still no cost

create view parts_full
with (security_invoker = on) as
select * from parts;

grant select on parts_basic  to authenticated;
grant select on parts_priced to authenticated;
grant select on parts_full   to authenticated;
```

then gate each view by role:

```sql
create policy parts_priced_read on parts
for select to authenticated
using (shop_id = auth.shop_id() and auth.app_role() in ('owner','manager','advisor'));
```

with `security_invoker` the base-table policy still applies, so the view cannot
be used to escape RLS. The client picks the view its role is allowed to read; a
technician querying `parts_full` gets a permission error, not a hidden column.

**B. Column privileges.** `grant select (sku, name) on parts to ...` works, but
Supabase gives every signed-in user the same `authenticated` role, so the grant
cannot vary by app role without custom database roles per user. More moving
parts than it is worth.

**C. Security-definer RPCs returning role-shaped JSON.** Most control, most code.
Reserve it for the aggregates (dashboard revenue, margin, reports) where the
answer itself is the secret and no view shape hides it.

Use A for tables, C for the four numbers on the dashboard.

---

## 5. Row Level Security — closes C2, H3

Enable on every table, then write policies that mirror the existing `PERMS`
table. Shape:

```sql
alter table orders enable row level security;

-- Everyone sees their own shop. Technicians see only jobs assigned to them.
create policy orders_read on orders
for select to authenticated
using (
  shop_id = auth.shop_id()
  and (auth.app_role() in ('owner','manager','advisor')
       or (auth.app_role() = 'technician' and technician_id = auth.uid()))
);

-- Advisors and up create and edit jobs; technicians never do.
create policy orders_write on orders
for insert to authenticated
with check (shop_id = auth.shop_id()
            and auth.app_role() in ('owner','manager','advisor'));

create policy orders_update on orders
for update to authenticated
using (
  shop_id = auth.shop_id()
  and (auth.app_role() in ('owner','manager','advisor')
       or (auth.app_role() = 'technician' and technician_id = auth.uid()))
)
with check (shop_id = auth.shop_id());
```

The technician's narrow update right — they may flip `work_done` and fill in an
inspection, nothing else — is enforced by a trigger, because `with check` cannot
express "only these columns changed":

```sql
create or replace function enforce_technician_scope() returns trigger
language plpgsql as $$
begin
  if auth.app_role() = 'technician' then
    if (new.stage, new.discount_cents, new.quote_status, new.technician_id)
       is distinct from (old.stage, old.discount_cents, old.quote_status, old.technician_id)
    then
      raise exception 'technicians may only update inspection and work_done';
    end if;
  end if;
  return new;
end $$;

create trigger orders_tech_scope before update on orders
for each row execute function enforce_technician_scope();
```

**Audit log (H3):** insert-only for everyone, readable by owners, updatable and
deletable by nobody.

```sql
alter table audit_log enable row level security;
create policy audit_insert on audit_log for insert to authenticated
  with check (shop_id = auth.shop_id() and actor_id = auth.uid());
create policy audit_read on audit_log for select to authenticated
  using (shop_id = auth.shop_id() and auth.app_role() = 'owner');
-- no update, no delete policy: therefore no update, no delete.
```

**The discount cap** (advisors ≤ 10%) moves from a client `if` into the same
trigger, computed against the server's own subtotal.

---

## 6. Operations that must be transactions

The demo does these as a sequence of client-side writes. With two advisors on two
tablets, that sequence is a race. Each becomes one `security definer` RPC:

| RPC | Why it must be atomic |
|---|---|
| `approve_quote(order_id)` | Reserve every part, or reserve none. A partial reserve oversells stock |
| `take_payment(order_id, method, amount, settled)` | Deduct stock, write movements, close the job, create follow-ups — all or nothing. `settled` records whether the money actually arrived |
| `settle_payment(order_id)` | Confirm money that arrived later, and stamp who confirmed it |
| `receive_po(po_id)` | Increment stock and mark received together |
| `adjust_stock(part_id, qty, reason)` | Write the movement in the same transaction as the level change |

Stock decrement must be conditional, never read-then-write:

```sql
update parts
   set stock = stock - v_qty, reserved = reserved - v_qty
 where id = v_part_id and stock >= v_qty
returning stock into v_left;

if not found then
  raise exception 'insufficient stock for %', v_part_id;
end if;
```

Every RPC writes its `audit_log` row inside the same transaction, so an action
and its record cannot come apart.

---

## 7. Migration phases

**Phase 0 — do now, no backend needed.** Chart.js already carries an SRI hash
(M3, done). Still outstanding: a CSP meta tag, vendoring the Google Fonts files,
and gating the demo-credentials card behind a build flag (M2, M4 in
SECURITY.md). Hours, not days.

An Edge Function holding one Anthropic key also belongs here, replacing the
bring-your-own-key AI panel (M5). The panel already builds its payload per role,
so the function's job is to hold the key and re-apply that filtering server-side
rather than trusting the client's version of it.

**Phase 1 — schema and policies.** Create the project, run the migrations, seed
one shop and five staff. Write the policy test suite *first*: for each of the
four roles, assert what they can read and write on every table. This suite is the
deliverable — the SQL is just what makes it pass.

**Phase 2 — read path.** Point the app at Supabase for reads, keep writes local.
Replace `DB.orders` etc. with queries against the role-appropriate views. The UI
barely changes; `render*` functions keep taking the same shapes.

**Phase 3 — write path.** Replace each mutation with its RPC. Delete the
client-side permission checks *as guards* but keep them *as UI hints* — the
server is now the authority, and the client only decides what to grey out.

**Phase 4 — auth.** Swap the demo login for `supabase.auth.signInWithPassword`.
Delete `digest()`, `setPassword()`, `checkPassword()`, the session helpers and
the lockout code. The login screen's markup survives intact; only its submit
handler changes.

**Phase 5 — realtime and cleanup.** Subscribe to `orders` and `parts` so two
tablets agree. Remove `localStorage` entirely.

Phases 2–4 can ship behind a flag, with the localStorage path as fallback, so the
demo keeps working on GitHub Pages throughout.

---

## 8. What to carry over unchanged

The migration should not touch:

- the `PERMS` matrix — it is the correct specification, it just needs a new
  enforcement point,
- the validation rules (duplicate plate, mileage regression, empty quote), which
  become `check` constraints and trigger raises,
- the stage machine and its gates,
- the test suite's *intent*. The 480 browser tests become the UI contract; add a
  parallel SQL-level suite that asserts the same rules against the database with
  each role's token. **A rule tested only in the browser is not tested.**

---

## 9. Cost and effort, honestly

Supabase free tier covers a single workshop comfortably; the Pro tier
(~$25/month) is the realistic starting point once it holds real customer data,
mainly for backups and log retention.

Effort is dominated by Phase 3 and the policy test suite, not by writing SQL. The
schema above is a day. Getting every RLS policy right, and proving it with tests
for all four roles, is the actual project.
