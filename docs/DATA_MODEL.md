# Data model

## Entity relationship diagram

```mermaid
erDiagram
  CUSTOMER ||--o{ VEHICLE : owns
  VEHICLE ||--o{ WORK_ORDER : "serviced in"
  USER ||--o{ WORK_ORDER : "advisor or technician"
  WORK_ORDER ||--|{ INSPECTION_ITEM : checks
  WORK_ORDER ||--o{ ORDER_ITEM : contains
  WORK_ORDER ||--o| PAYMENT : "paid by"
  WORK_ORDER ||--o{ ACTIVITY_LOG : records
  WORK_ORDER ||--o{ JOB_NOTE : carries
  PART ||--o{ ORDER_ITEM : "used as"
  SUPPLIER ||--o{ PART : supplies
  SUPPLIER ||--o{ PURCHASE_ORDER : receives
  PURCHASE_ORDER ||--|{ PO_LINE : lists
  PART ||--o{ PO_LINE : ordered
  PART ||--o{ STOCK_MOVEMENT : tracked
  CUSTOMER ||--o{ FOLLOW_UP : gets
  WORK_ORDER |o--o{ FOLLOW_UP : creates
```

## Tables

### User
| Field | Type | Notes |
|---|---|---|
| id | string, PK | `s1` |
| name | string | Unique among active users |
| username | string, unique | Lowercase, 3-24 chars of `a-z 0-9 . _ -` |
| pwHash | string | Demo digest of `salt|password`. **Not a password hash** — see [SECURITY.md](SECURITY.md) H1 |
| salt | string | Per-user, regenerated on every password change |
| role | enum | `owner`, `manager`, `advisor`, `technician` |
| active | boolean | Users are deactivated, never deleted |

### Customer
| Field | Type | Notes |
|---|---|---|
| id | string, PK | `c1` |
| name | string | |
| phone | string, unique | Used to detect duplicates |
| tier | string | One of `settings.lists.tiers`; a new customer gets the first entry |
| vehicles | Vehicle[] | Nested in the demo. Its own table in production |

### Vehicle
| Field | Type | Notes |
|---|---|---|
| id | string, PK | `v1` |
| customer_id | FK → Customer | |
| plate | string, unique | Stored in uppercase |
| model | string | Make, model and year |

### Work order
| Field | Type | Notes |
|---|---|---|
| id | string, PK | `WO-1048`, sequential from `nextWO` |
| customer_id | FK → Customer | |
| vehicle_id | FK → Vehicle | |
| advisor_id | FK → User | |
| technician_id | FK → User | Must be an active technician |
| stage | enum | `reception`, `pre-inspection`, `quotation`, `in-service`, `completed`, `declined` |
| quote_status | enum | `draft`, `sent`, `approved`, `rejected` |
| mileage | int | Can't be lower than the vehicle's last recorded mileage |
| complaint | string | |
| discount | money | ≤ subtotal. Advisors ≤ 10% |
| work_done | boolean | |
| created_at | datetime | |
| stage_since | datetime | When it entered the current stage. Drives the stalled-job warnings |
| inspection | InspectionItem[] | A copy of the checklist as it stood at check-in |
| items | OrderItem[] | |
| payment | Payment or null | |
| log | ActivityLog[] | System-written, not editable |
| remarks | JobNote[] | Written by staff, shared with everyone on the job |

### Inspection item
| Field | Type | Notes |
|---|---|---|
| name | string | Copied from `settings.lists.inspection` at check-in, so editing the checklist never alters a job already under way |
| status | enum | `unchecked`, `good`, `attention`, `problem` |
| note | string | |

### Order item
| Field | Type | Notes |
|---|---|---|
| id | string, PK | |
| type | enum | `part`, `labor` |
| sku | FK → Part | Parts only |
| name | string | |
| qty | int | ≥ 1 |
| price | money | **Copied** from the part when added |
| cost | money | **Copied** from the part when added |
| approved | boolean | False until the customer approves. Extra work added in service starts as false |
| by | FK → User | Who added the line |
| needsPrice | boolean | Set when a technician adds work they cannot price. Blocks sending the quote until an advisor sets a price |

### Payment
| Field | Type | Notes |
|---|---|---|
| amount | money | Total at the time of payment |
| method | string | One of `settings.lists.payment` |
| paid_at | datetime | |

### Activity log
| Field | Type | Notes |
|---|---|---|
| t | datetime | |
| x | string | What happened |
| by | FK → User | Who did it |

### Job note
| Field | Type | Notes |
|---|---|---|
| id | string, PK | |
| by | FK → User | |
| at | datetime | |
| text | string | ≤ 500 characters, escaped on render |

### Part
| Field | Type | Notes |
|---|---|---|
| sku | string, PK | Stored in uppercase, unique |
| name | string | |
| category | string | One of `settings.lists.categories` |
| stock | int | On hand |
| reserved | int | Held for approved open jobs |
| reorder | int | Low stock when available ≤ reorder |
| cost | money | Owners and managers only |
| price | money | Selling price |
| supplier | FK → Supplier | |
| image | string | Optional photo as a data URL, resized to 200px before saving |

### Supplier
| Field | Type |
|---|---|
| id | string, PK |
| name | string |
| phone | string |

### Purchase order
| Field | Type | Notes |
|---|---|---|
| id | string, PK | `PO-202`, sequential from `nextPO` |
| supplier_id | FK → Supplier | |
| status | enum | `ordered`, `received` |
| items | `{sku, qty, cost}[]` | Duplicate SKUs are merged |
| created_at, received_at | datetime | |

### Stock movement
| Field | Type | Notes |
|---|---|---|
| id | string, PK | |
| sku | FK → Part | |
| qty | int | Positive = in, negative = out |
| type | enum | `receive`, `sale`, `adjust` |
| ref | string | Work order or PO number |
| reason | string | For adjustments; one of `settings.lists.adjustReasons` |
| by | FK → User | |
| at | datetime | |

### Follow-up
| Field | Type | Notes |
|---|---|---|
| id | string, PK | |
| customer_id | FK → Customer | |
| type | enum | `service-due`, `inspection-finding`, `declined-quote`, `insurance`, `road-tax` |
| text | string | |
| due_at | datetime | |
| source_order_id | FK → Work order, nullable | |
| status | enum | `open`, `done` |

## Data rules

1. **Price snapshot.** Order items copy price and cost when added, so history never changes when a part's price does.
2. **Derived money.** Subtotal, total, profit and margin are calculated from the lines, never stored.
3. **Stock ledger.** Every change to `Part.stock` writes a `StockMovement`.
4. **Soft delete.** Users are deactivated, not deleted.
5. **Uniqueness.** Customer phone, vehicle plate, part SKU, and active user name must each be unique.
6. **Sequential IDs.** Work order and PO numbers come from counters that survive reloads.
7. **Checklist snapshot.** A job copies the inspection checklist when it is created, for the same reason item prices are copied: editing the template must not rewrite history.
8. **Unpriced lines block the quote.** Anything flagged `needsPrice` stops `doSendQuote`, so a customer never receives a quote with a zero line in it.

### Settings

`DB.settings` holds everything a shop can change, so the same code runs a
different workshop without edits:

| Field | Type | Notes |
|---|---|---|
| appName | string | Shown on sign-in, in the sidebar and in the browser tab |
| color | string or null | Brand colour; every other shade is derived from it |
| lists | `{inspection, payment, categories, adjustReasons, tiers}` | Each an ordered array of strings, each editable in Settings → Lists |
| timings | object | Follow-up intervals, stalled-job thresholds, reorder window, sign-in policy. Any value left unset falls back to `DEFAULT_TIMINGS` |

## Storage (demo)

Everything is saved as one JSON object in browser storage under `nexauto_demo_v7`.
The session, sign-in lockouts and the optional AI key live under their own keys —
see [ARCHITECTURE.md](ARCHITECTURE.md). **Changing the shape of the data means
bumping both `KEY` and `DB.v`**, which reseeds; leaving them alone means
returning visitors silently keep the old shape.

## Production changes

- Move `Vehicle` to its own table with an ownership history, so a car can change owner.
- Add `shop_id` to every table for multi-branch use.
- Add `Invoice` (number, tax, status) and allow several `Payment` rows per order, for deposits and partial payments.
- Reserve stock inside a database transaction, so two simultaneous approvals can't oversell.
- Move `settings` to a `shop_settings` row per shop, and the lists to their own lookup tables so they can be referenced rather than copied as strings.
