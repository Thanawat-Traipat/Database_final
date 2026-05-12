# Supabase Setup Checklist

Use this list when you are ready to run the app against a real Supabase database. The app requires Supabase and will show a database-required message if environment variables are missing or unreachable.

## 1. Create Project

1. Create a new Supabase project.
2. Open `SQL Editor`.
3. For a fresh setup, run `supabase/reset-new-ux.sql`.
4. For a non-destructive setup, run `supabase/schema.sql`, then `supabase/seed.sql`.
5. If your project already used the older schema, run `supabase/figma-ui-migration.sql`.
6. Optional: create a Supabase Storage bucket called `menu-images` if you want to replace the bundled `public/menu/*.svg` assets with real uploaded menu photos.
7. To wipe only data rows later while keeping schema/functions, run `supabase/delete-all-data.sql`.
8. Open `Table Editor` and confirm the tables below exist.

## 2. Tables To Create

| Table | Purpose |
| --- | --- |
| `app_users` | Staff login data for cashier, kitchen, waiter, and manager |
| `staff_shifts` | Clock-in/clock-out rows created after staff authentication |
| `staff_activity_logs` | Audit trail showing who performed each staff action |
| `restaurant_tables` | Physical dine-in tables and availability status |
| `dining_sessions` | One buffet visit per table, including adult/child counts and prices |
| `payments` | Cashier checkout rows for revenue reporting |
| `menu_categories` | Menu grouping for customer ordering |
| `menu_items` | Food/drink menu rows with soft delete support |
| `orders` | Order header for one customer submission |
| `order_items` | Kitchen/waiter queue rows with status timing |
| `inventory_items` | Ingredient stock, unit, reorder level, and unit cost |
| `recipes` | Mapping from menu item to required ingredient quantities |
| `inventory_transactions` | Audit trail for stock usage, purchase, adjustment, and waste |

## 2.1 Figma UI Fields

| Table | New field | Purpose |
| --- | --- | --- |
| `menu_items` | `image_url` | Shows food photos in customer ordering and dashboard cards |
| `menu_items` | `kitchen_station` | Lets the kitchen display filter/group by station |
| `menu_items` | `prep_time_minutes` | Lets the KDS decide when an order is late |
| `order_items` | `special_instructions` | Shows per-item notes on kitchen cards |
| `order_items` | `priority_level` | Supports normal vs rush KDS cards |
| `order_items` | `priority_reason` | Shows the red chef-priority message |
| `order_items` | `expedited_at` | Records when the expedite action happened |
| `order_items` | `out_for_serving_at` | Records when a waiter picked up ready food for delivery |
| `staff_shifts` | `clock_in_at`, `clock_out_at` | Calculates work hours and active staff count |
| `staff_activity_logs` | `user_id`, `shift_id`, `action`, `entity_type`, `entity_id` | Shows who performed each operation in the dashboard |
| `restaurant_tables` | `status` value `billing` | Supports cashier waiting-for-bill payment cards |
| `restaurant_tables` | `cleaning_started_at` | Starts the 10-minute cleaning countdown after cash checkout |
| `dining_sessions` | `bill_requested_at` | Records when the cashier should show the cash payment panel |

## 3. Required Database Logic

1. The app mirrors `serve_order_item(order_item_id, staff_id)` when the waiter marks an item as served.
2. The mirrored logic checks stock, deducts inventory, inserts `inventory_transactions`, and updates `order_items.status`. The SQL function is available for future RPC use.
3. Keep soft delete fields as timestamps: `deleted_at` should be set instead of deleting rows.
4. Keep customers outside `app_users`; customers access ordering by `dining_sessions.customer_code`.
5. Store menu photos in `menu_items.image_url`; use local `/menu/*.svg` paths for the bundled demo or Supabase Storage URLs for uploaded real photos.
6. Store KDS card notes in `order_items.special_instructions` and rush state in `order_items.priority_level`.
7. In the customer UI, group menu categories into 4 tabs: Meat, Seafood, Vegetable, and Drinks & Desserts.
8. On successful staff login, insert one `staff_shifts` row immediately.
9. On logout, update that shift with `clock_out_at` and `logout_at`.
10. For cashier, kitchen, waiter, and manager actions, insert a `staff_activity_logs` row with the current `shift_id`.
11. For the cashier grid, seed 15 rows in `restaurant_tables` with table codes `01` through `15`; every table capacity is `4`.
12. When guests request the bill, set `restaurant_tables.status = 'billing'` and `dining_sessions.bill_requested_at = now()`.
13. For checkout, set unfinished `order_items` for that session (`pending`, `cooking`, `ready`, `out_for_serving`) to `cancelled`, insert a `payments` row with `method = 'cash'`, close the session, set `restaurant_tables.status = 'cleaning'`, and set `restaurant_tables.cleaning_started_at = now()`.
14. A cleaning table becomes ready after 10 minutes: update `restaurant_tables.status = 'available'` and clear `cleaning_started_at`. The SQL helper is `release_completed_cleaning_tables()`.
15. Do not use a reserved table state; the cashier flow only needs ready, seated, cleaning, and billing.

## 4. Suggested Policies for Demo

For a fast class demo, you can first test with Supabase service role on a trusted backend. If calling directly from frontend, add Row Level Security policies before deployment:

1. Staff users can read their own `app_users` row.
2. Staff users can insert their own `staff_shifts` and update only their own active shift on logout.
3. Staff users can insert `staff_activity_logs` for their own `user_id`.
4. Cashiers can insert/update `dining_sessions` and `payments`.
5. Kitchen users can read/update `order_items` status to `cooking` or `ready`.
6. Waiters can update ready items to `out_for_serving` and `served`, either through the current table-sync adapter or the SQL functions if you later switch to RPC calls.
7. Managers can read all tables and manage menu, inventory, and staff rows.
8. Customer ordering should only insert orders for an open `customer_code`; do not expose staff tables to public customers.

## 5. App Integration Later

The current website already connects through `app/lib/supabaseDatabase.js` when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present. The adapter currently syncs the app state to these Supabase tables:

1. Login and shift change: `app_users`, `staff_shifts`, `staff_activity_logs`.
2. Cashier table flow: `restaurant_tables`, `dining_sessions`, `payments`, `order_items`.
3. Customer menu and order flow: `menu_categories`, `menu_items`, `orders`, `order_items`.
4. Kitchen and waiter status flow: `order_items`, `staff_activity_logs`.
5. Inventory and kiosk toggles: `inventory_items`, `recipes`, `inventory_transactions`, `menu_items`.
6. Manager analytics: `payments`, `dining_sessions`, `orders`, `order_items`, `menu_items`, `menu_categories`, `inventory_transactions`, `inventory_items`, `restaurant_tables`, `staff_shifts`.

For the full environment checklist, see `docs/supabase-sync.md`.
