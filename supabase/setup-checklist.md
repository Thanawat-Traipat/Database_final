# Supabase Setup Checklist

The app requires Supabase. If `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing, the app intentionally shows a database-required message.

## 1. Fresh Setup

1. Create a Supabase project.
2. Open SQL Editor.
3. Run `supabase/reset-new-ux.sql`.
4. Copy Project URL and anon public key into `.env.local` for local development.
5. Add the same two environment variables in Vercel Project Settings.
6. Redeploy on Vercel after environment variables are saved.

## 2. Tables To Create

| Table | Purpose |
| --- | --- |
| `app_users` | Staff login data for cashier, kitchen, waiter, and manager; supports soft delete with `deleted_at` |
| `staff_activity_logs` | Audit trail showing who performed each staff action |
| `restaurant_tables` | Fifteen physical tables identified by `table_code` (`01` to `15`) |
| `dining_sessions` | One buffet visit at one table, with adult/child counts and price snapshots |
| `payments` | Cash-only checkout rows for revenue reporting |
| `menu_categories` | Menu grouping for customer ordering |
| `menu_items` | Buffet menu rows, images, kiosk visibility, and soft delete |
| `orders` | Order header created when a customer presses SEND ORDER |
| `order_items` | Kitchen/waiter queue rows with status timestamps |
| `inventory_items` | Ingredient stock, low-stock threshold, unit, cost, and soft delete |
| `recipes` | Composite bridge from menu item to ingredient quantity |
| `inventory_transactions` | Stock ledger for automatic usage and manual adjustment |

## 3. Required Database Logic

1. Cashier check-in inserts `dining_sessions` and updates `restaurant_tables.status`.
2. Adult and child buffet prices are stored as `adult_price_snapshot` and `child_price_snapshot`.
3. Customer SEND ORDER inserts one `orders` row and multiple `order_items` rows.
4. Kitchen status changes update `order_items.status`, `cooking_at`, `ready_at`, and `expedited_at`.
5. Waiter service uses the original `order_items.requested_at` timer; late items are detected after 15 minutes.
6. Serving an item deducts inventory through `recipes` and inserts `inventory_transactions` with `transaction_type = 'usage'`.
7. Manager manual stock edits insert `inventory_transactions` with `transaction_type = 'manual_adjustment'`.
8. Soft delete sets `deleted_at` on `app_users`, `menu_items`, and `inventory_items`.
9. Cash checkout inserts `payments`, closes `dining_sessions`, cancels unfinished `order_items`, and starts table cleaning.
10. Cleaning tables become ready after 10 minutes by clearing `cleaning_started_at` and setting status to `available`.

## 4. Assignment Mapping

1. Insert: manager adds menu, ingredient, or staff rows; customer sends orders.
2. Update: cashier changes table/session status, kitchen/waiter update order item status, manager edits stock.
3. Soft Delete: manager moves users/menu/ingredients into the removed list using `deleted_at`.
4. Basic Query: cashier/customer/kitchen/waiter screens join sessions, orders, order items, menu, and tables.
5. Advanced Query: manager dashboard aggregates traffic, top menu counts, ingredient usage, dining duration, and serving speed.

## 5. Environment Variables

Local `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

Vercel:

Add the same keys in Project Settings -> Environment Variables, then redeploy.
