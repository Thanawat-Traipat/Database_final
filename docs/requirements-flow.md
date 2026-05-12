# Requirement and UX Flow Mapping

## Main Flow

1. Staff member logs in through the staff portal.
2. The system authenticates `app_users`, reads the role, inserts `staff_shifts`, and starts the current shift clock.
3. Cashier opens a ready table from the 15-table grid and enters adult/child guest counts.
4. The system inserts one `dining_sessions` row with 399 THB adult and 259 THB child price snapshots, changes the table to `occupied`, and inserts a `staff_activity_logs` audit row.
5. Customer opens the QR ordering page through the session code, browses four menu tabs, adjusts the basket, checks order history, and can call staff.
6. The system inserts one `orders` row and many `order_items` rows when the customer submits the basket.
7. Kitchen logs in and updates each item from `pending` to `cooking` to `ready`; every staff action writes an audit row.
8. Waiter logs in, moves ready items to `out_for_serving`, then marks them as `served`; the system deducts inventory using `recipes`.
9. Cashier moves the table to `billing` when guests request the bill, then records the cash payment after all items are served or cancelled.
10. Manager logs in and reads dashboard summaries from sessions, payments, order items, inventory transactions, shifts, and staff activity logs.

## Interface Requirement Coverage

| Assignment requirement | Website screen | Database action |
| --- | --- | --- |
| Insert | Cashier Table Management | Insert `dining_sessions`; update `restaurant_tables.status` |
| Insert | Customer Ordering | Insert `orders` and `order_items` |
| Insert | Manager Menu, Inventory, Staff | Insert `menu_items`, `inventory_items`, `app_users` |
| Insert | Staff Portal | Insert `staff_shifts` at login and `staff_activity_logs` during staff actions |
| Update | Kitchen Queue | Update `order_items.status`, `cooking_at`, `ready_at` |
| Update | Kitchen Display | Update `order_items.priority_level`, `priority_reason`, `expedited_at` when staff expedite a card |
| Update | Waiter Ready To Serve | Update `order_items.status`, `out_for_serving_at`, `served_at`; update `inventory_items.quantity_on_hand` |
| Update | Cashier Table Management | Update `restaurant_tables.status` to `billing`, set `dining_sessions.bill_requested_at`, update `dining_sessions.status`, `payment_status`, `closed_at`; insert cash `payments` |
| Update | Manager Menu and Inventory | Update menu, availability, stock, reorder level, unit cost |
| Update | Staff Portal | Update `staff_shifts.clock_out_at` and `logout_at` at logout |
| Soft Delete | Manager Menu | Set `menu_items.deleted_at`, keep historical orders valid |
| Soft Delete | Manager Inventory | Set `inventory_items.deleted_at`, keep historical transactions valid |
| Soft Delete | Manager Staff | Set `app_users.deleted_at` and `is_active = false` |
| Basic Query | Customer Ordering | Read active Supabase menu rows joined with categories |
| Basic Query | Cashier Table Management | Read all 15 tables with active session, visual state, billing state, and 90-minute progress |
| Basic Query | Kitchen Queue | Read pending/cooking/ready items with table and waiting time |
| Advanced Query | Manager Dashboard | Revenue, guests, top menu, low stock, ingredient usage, cost per head, peak hour, average dining time, average service speed |

## Data Collected for Dashboard Goals

| Dashboard goal | Required columns |
| --- | --- |
| Revenue by day | `payments.paid_amount`, `payments.paid_at`, `payments.status` |
| Customer count by day/hour | `dining_sessions.adult_count`, `dining_sessions.child_count`, `dining_sessions.opened_at` |
| Adult vs child pricing | `dining_sessions.adult_price`, `dining_sessions.child_price` |
| 90-minute table progress | `restaurant_tables.status`, `dining_sessions.opened_at` |
| Cash billing state | `restaurant_tables.status`, `dining_sessions.bill_requested_at`, `payments.method` |
| Top menu items | `order_items.menu_id`, `order_items.quantity`, `order_items.status` |
| Menu images in UI/dashboard | `menu_items.image_url` |
| Kitchen station workload | `menu_items.kitchen_station`, active `order_items.status` |
| Late kitchen cards | `menu_items.prep_time_minutes`, `order_items.requested_at`, `order_items.priority_level` |
| Ingredient usage | `inventory_transactions.ingredient_id`, `quantity_change`, `transaction_type`, `occurred_at` |
| Ingredient cost per head | `inventory_transactions.unit_cost_snapshot`, guest count from `dining_sessions` |
| Low stock alert | `inventory_items.quantity_on_hand`, `inventory_items.reorder_level` |
| Average dining time | `dining_sessions.opened_at`, `dining_sessions.closed_at` |
| Average service speed | `order_items.requested_at`, `order_items.served_at` |
| Waiter pickup speed | `order_items.ready_at`, `order_items.out_for_serving_at` |
| Kitchen bottleneck warning | `order_items.status`, `order_items.requested_at` |
| Rush/chef priority warning | `order_items.priority_level`, `priority_reason`, `expedited_at` |
| Active staff count | `staff_shifts.clock_in_at`, `clock_out_at` |
| Staff work hours | `staff_shifts.user_id`, `clock_in_at`, `clock_out_at` |
| Who performed an operation | `staff_activity_logs.user_id`, `shift_id`, `action`, `entity_type`, `entity_id`, `occurred_at` |

## Manager Dashboard Data Sources

The manager dashboard is not a static frontend mockup. It calculates the visible cards from Supabase-backed tables after `app/lib/supabaseDatabase.js` loads the database.

| Dashboard widget | Source tables | Notes |
| --- | --- | --- |
| Avg. cost per head | `inventory_transactions`, `dining_sessions` | Uses usage transactions divided by guest count |
| Avg. dining duration | `dining_sessions` | Uses `opened_at` and `closed_at`, or current time for open sessions |
| Avg. serving speed | `order_items` | Uses `requested_at` to `served_at` |
| Hourly customer traffic | `dining_sessions` | Groups guests by `opened_at` hour |
| Top menu performance | `order_items`, `menu_items`, `menu_categories` | Uses database menu name, category, and `menu_items.image_url` |
| Ingredient consumption tracker | `inventory_transactions`, `inventory_items` | Uses quantity movement and cost snapshot |
| Live table status | `restaurant_tables`, `dining_sessions` | Shows occupied, available, and cleaning states |

## Why the ER Diagram Changed

The first ER draft had only cashier login, so it did not match the actual UX. The corrected model uses one `app_users` table with a role enum. This allows the same login structure to support cashier, kitchen, waiter, and manager while keeping customer ordering anonymous.

The staff portal also needs clock-in data, not only authentication data. The corrected model adds `staff_shifts` so the dashboard can calculate staff hours and active staff count. It adds `staff_activity_logs` so each cashier, kitchen, waiter, and manager operation can be traced back to a specific staff member and shift.

The first ER draft also did not store enough data for the dashboard. The corrected model adds guest type counts, buffet prices, payment rows, item status timestamps, and inventory transaction costs. These are the minimum data points needed to produce the dashboard without guessing later.

## DBMS Requirement Coverage

The submitted web app is Supabase-only. The interface does not use browser mock data as its source of truth. It loads operational data from Supabase tables and writes workflow changes back to Supabase through `app/lib/supabaseDatabase.js`.

| DBMS requirement | Evidence in project |
| --- | --- |
| Real DBMS | PostgreSQL hosted by Supabase |
| Interface connected to DB | `app/lib/supabase.js` and `app/lib/supabaseDatabase.js` |
| Deployable web app | Vercel instructions in `docs/vercel-deployment.md` |
| Insert | Login shifts, dining sessions, orders, order items, payments, users, menu items, inventory items |
| Update | Table status, kitchen status, waiter serving status, inventory stock, menu availability |
| Soft delete | `deleted_at` on staff, menu, and inventory rows |
| Basic query | Cashier grid, customer menu, kitchen queue, waiter queue, audit list |
| Advanced query | Revenue, traffic, top menu, ingredient cost, service speed, bottleneck, staff hours |
