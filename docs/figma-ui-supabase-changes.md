# Supabase Changes Needed For The Figma UI

The Figma screen is not just CSS. It changes the data the app must store so the UI can be real instead of hard-coded.

## Run This

If your Supabase project is new, run:

1. `supabase/reset-new-ux.sql`

Or, if you prefer non-destructive setup:

1. `supabase/schema.sql`
2. `supabase/seed.sql`

If your Supabase project already has the older tables, run:

1. `supabase/figma-ui-migration.sql`
2. Update existing `menu_items` rows with image/station/prep data.
3. Update existing `order_items` rows with default notes/priority values if needed.
4. Start inserting `staff_shifts` during login and `staff_activity_logs` during staff actions.

Before running the migration on real old data, make sure there is not more than one open session per table and not more than one active shift per staff user. The new quality indexes intentionally enforce those rules.

## Table Changes

### `restaurant_tables`

The cashier Figma screen is a fixed 15-table operating grid, so the seed data should include table codes `01` through `15`.

| Data/column | Why the UI needs it |
| --- | --- |
| `status = 'billing'` | Shows the red "WAITING FOR BILL" card and loads the cash payment panel. |
| `status = 'cleaning'` with `cleaning_started_at` | Starts the 10-minute cleaning timer and automatically returns the table to ready. |
| `capacity = 4` | Keeps every table aligned with the simplified 4-seat cashier flow. |

### `dining_sessions`

Add this column:

| Column | Type | Why the UI needs it |
| --- | --- | --- |
| `bill_requested_at` | `timestamptz` | Stores when guests ask for the bill, so the cashier payment state is queryable instead of visual-only. |

### `menu_items`

Add these columns:

| Column | Type | Why the UI needs it |
| --- | --- | --- |
| `image_url` | `text not null default ''` | Customer menu cards and dashboard menu cards need pictures. Use a Supabase Storage URL or a public path. |
| `kitchen_station` | `varchar(60) not null default 'general'` | KDS can filter/group by station such as `hotpot`, `seafood`, `drink`, `premium`. |
| `prep_time_minutes` | `integer not null default 5` | KDS can calculate whether an order is late instead of hard-coding red cards. |

The customer iPad UI presents four tabs: Meat, Seafood, Vegetable, and Drinks & Desserts. You can either store exactly four `menu_categories`, or keep more detailed categories and group them in the app.

### `order_items`

Add these columns:

| Column | Type | Why the UI needs it |
| --- | --- | --- |
| `special_instructions` | `text not null default ''` | Shows item notes like “Extra Parmesan” or “No spicy sauce” on the KDS card. |
| `priority_level` | enum `order_priority` | Supports normal vs rush/chef-priority tickets. |
| `priority_reason` | `text not null default ''` | Shows the red priority text on late/rush cards. |
| `expedited_at` | `timestamptz` | Records when a staff member clicked expedite. |
| `out_for_serving_at` | `timestamptz` | Records when a waiter picked up ready food; customer iPads show “OUT FOR SERVING”. |

Create enum:

```sql
create type order_priority as enum ('normal', 'rush');
```

Add `out_for_serving` to `order_item_status` so the waiter flow is two-step:

```sql
alter type order_item_status add value if not exists 'out_for_serving';
```

Recommended waiter RPCs included in the current SQL files:

| Function | Purpose |
| --- | --- |
| `send_order_item_to_table(order_item_id, staff_id)` | Changes `ready` food to `out_for_serving` and logs the waiter pickup. |
| `serve_order_item(order_item_id, staff_id)` | Deducts recipe inventory and changes `out_for_serving` food to `served`. |

The current frontend mirrors this workflow through table sync so the class demo works without RPC wiring. These functions are kept in the SQL layer for future hardening and for explaining database-side workflow integrity in the report.

### `staff_shifts`

Add this table so the staff portal is more than a visual login screen:

| Column | Type | Why the UI needs it |
| --- | --- | --- |
| `shift_id` | `bigint identity primary key` | Unique clock-in row |
| `user_id` | `uuid references app_users` | Staff member who authenticated |
| `role_snapshot` | `staff_role` | Historical role at login time |
| `station` | `varchar(80)` | Station shown/used after role login |
| `clock_in_at` | `timestamptz default now()` | Start time for work-hour reporting |
| `clock_out_at` | `timestamptz` | End time set on logout |

### `staff_activity_logs`

Add this table to answer who performed each cashier/kitchen/waiter/manager action:

| Column | Type | Why the UI needs it |
| --- | --- | --- |
| `activity_id` | `bigint identity primary key` | Audit row id |
| `user_id` | `uuid references app_users` | Staff who performed the action |
| `shift_id` | `bigint references staff_shifts` | Shift active during the action |
| `action` | `varchar(80)` | Action such as `open_table`, `mark_ready`, `serve_item` |
| `entity_type` | `varchar(40)` | Affected object, such as `order_item` or `payment` |
| `entity_id` | `text` | Affected row id |
| `occurred_at` | `timestamptz default now()` | Audit timestamp |

## Menu Picture Storage

The seeded demo uses bundled public image paths such as `/menu/pork-belly.svg`, so Vercel can render the menu immediately after deployment. Supabase Storage is optional if you want to replace those bundled assets with uploaded real food photos.

| Bucket | Suggested access | Purpose |
| --- | --- | --- |
| `menu-images` | Public for class demo, private with signed URLs for production | Stores menu item photos used by `menu_items.image_url` |

Bundled demo pattern:

```text
menu_items.image_url = /menu/pork-belly.svg
```

Optional Supabase Storage pattern:

```text
menu_items.image_url = https://YOUR_PROJECT.supabase.co/storage/v1/object/public/menu-images/ribeye.jpg
```

## Dashboard Awareness

The manager page is a dashboard, so the database must collect data for charts and summaries:

| Dashboard widget | Existing/added data |
| --- | --- |
| Top menu items | `order_items.menu_id`, `order_items.quantity`, `menu_items.image_url` |
| Late kitchen orders | `order_items.requested_at`, `priority_level`, `prep_time_minutes` |
| Average service speed | `order_items.requested_at`, `served_at` |
| Station load | `menu_items.kitchen_station`, active `order_items.status` |
| Ingredient cost per head | `inventory_transactions.unit_cost_snapshot`, `dining_sessions.adult_count`, `child_count` |
| Active staff and staff hours | `staff_shifts.clock_in_at`, `clock_out_at` |
| Staff audit trail | `staff_activity_logs.user_id`, `shift_id`, `action`, `entity_type`, `entity_id` |
| Cashier 15-table grid | `restaurant_tables.status`, `dining_sessions.opened_at`, `bill_requested_at` |
| Cash-only checkout | `payments.method = 'cash'`, `payments.paid_amount`, `payments.paid_at` |

## Query File Updated

Use `supabase/queries.sql` for:

- customer menu with image/station/prep fields
- kitchen queue with priority and special instructions
- grouped KDS cards by table/session
- waiter ready-to-serve cards
- cashier table grid and payment summary
- dashboard top menu with image support
- dashboard bottleneck, cost-per-head, traffic, and live table utilization
- active shifts and staff work hours
- recent staff audit trail
