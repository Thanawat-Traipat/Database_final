# Requirements Flow Mapping

## Operational Flow

1. Cashier logs in from `app_users`.
2. Cashier opens a table, which inserts `dining_sessions` and updates `restaurant_tables.status`.
3. Customer iPad reads `menu_categories` and `menu_items`, then inserts `orders` and `order_items`.
4. Kitchen updates `order_items.status` from `pending` to `cooking` to `ready`. Items over 15 minutes can be expedited.
5. Waiter updates ready items to `out_for_serving`, then `served`.
6. Serving deducts ingredient stock from `inventory_items` using `recipes` and writes `inventory_transactions`.
7. Cashier requests bill and records a cash `payments` row.
8. Manager dashboard aggregates sessions, payments, order items, inventory usage, and table status.

## Assignment Interface Requirements

| Requirement | Where it appears | Tables |
| --- | --- | --- |
| Insert | Open table, send order, add menu item, add ingredient, add staff login | `dining_sessions`, `orders`, `order_items`, `menu_items`, `inventory_items`, `app_users` |
| Update | Kitchen/waiter status changes, cashier billing/payment, inventory adjustment, kiosk toggle | `order_items`, `restaurant_tables`, `dining_sessions`, `payments`, `inventory_items`, `menu_items` |
| Soft Delete | Manager removed list | `menu_items.deleted_at`, `inventory_items.deleted_at`, `app_users.deleted_at` |
| Basic Query | Cashier selected table, customer history, kitchen/waiter cards | `dining_sessions`, `orders`, `order_items`, `menu_items`, `restaurant_tables` |
| Advanced Query | Manager dashboard | Aggregates `payments`, `dining_sessions`, `order_items`, `inventory_transactions`, `inventory_items`, `menu_items` |

## Time Collection

| Business event | Column |
| --- | --- |
| Customer starts seating | `dining_sessions.opened_at` |
| Customer orders food | `orders.ordered_at` and `order_items.requested_at` |
| Kitchen starts item | `order_items.cooking_at` |
| Kitchen marks item ready | `order_items.ready_at` |
| Waiter takes food out | `order_items.out_for_serving_at` |
| Food is served | `order_items.served_at` |
| Customer finishes / pays bill | `dining_sessions.closed_at` and `payments.paid_at` |

## Dashboard Queries

- Hourly traffic counts guests by `dining_sessions.opened_at` and highlights the peak hour.
- Top menu performance counts `order_items.quantity` grouped by `menu_items`.
- Ingredient consumption combines `inventory_transactions` usage with `inventory_items.quantity_on_hand`.
- Average dining duration uses `dining_sessions.opened_at` to `closed_at`.
- Average serving speed uses `order_items.requested_at` to `served_at`.

## Removed Complexity

The final model intentionally removes `staff_shifts`, `customer_code`, `waiter_id`, `orders.source`, `orders.note`, `order_items.priority_reason`, `menu_items.price`, `menu_items.kitchen_station`, `menu_items.prep_time_minutes`, and `recipes.recipe_id`.
