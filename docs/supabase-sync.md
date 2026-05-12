# Supabase Sync Notes

The app is Supabase-only for the submitted project. It loads data through `app/lib/supabaseDatabase.js` when these variables are present:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

## Synced Tables

- `app_users`
- `restaurant_tables`
- `menu_categories`
- `inventory_items`
- `menu_items`
- `recipes`
- `dining_sessions`
- `orders`
- `order_items`
- `payments`
- `staff_activity_logs`
- `inventory_transactions`

## Adapter Logic

`loadDatabaseFromSupabase()` selects every table and maps Supabase primary keys into the readable local IDs used by the UI. For example, `menu_items.menu_id = 1` becomes `menu-1`, and table code `02` remains `02`.

`syncDatabaseToSupabase(database)` upserts the current app state back to Supabase after every UI mutation.

`replaceDatabaseInSupabase(database)` truncates rows in dependency order and then upserts the current state. The Reset Demo button uses this path.

## Main Data Flows

| Flow | Supabase tables updated |
| --- | --- |
| Staff login / role test bar | `app_users`, `staff_activity_logs` |
| Cashier opens table | `restaurant_tables`, `dining_sessions`, `staff_activity_logs` |
| Customer sends order | `orders`, `order_items` |
| Kitchen starts/prepares/expedites | `order_items`, `staff_activity_logs` |
| Waiter sends/serves food | `order_items`, `inventory_items`, `inventory_transactions`, `staff_activity_logs` |
| Cashier processes payment | `payments`, `dining_sessions`, `restaurant_tables`, `order_items`, `staff_activity_logs` |
| Manager menu/inventory/staff edits | `menu_items`, `inventory_items`, `app_users`, `inventory_transactions`, `staff_activity_logs` |

## Time Fields Used

- `dining_sessions.opened_at`: customer starts seating.
- `orders.ordered_at`: customer submits an order batch.
- `order_items.requested_at`: kitchen/waiter timer start for each item.
- `order_items.ready_at`: kitchen marks food ready.
- `order_items.out_for_serving_at`: waiter takes food from pass.
- `order_items.served_at`: waiter marks food served.
- `dining_sessions.closed_at`: cashier closes the bill and customer leaves.

## Final Schema Choices

- No `staff_shifts`; the app does not track shift duration.
- No `customer_code`; the iPad uses the selected open session.
- No `waiter_id`; several waiters can serve the same table.
- No menu `price`; billing is based on buffet guest counts.
- `recipes` uses `(menu_id, ingredient_id)` as the primary key.
- `inventory_transactions.transaction_type` is limited to `usage` and `manual_adjustment`.
