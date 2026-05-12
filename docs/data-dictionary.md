# Physical Data Dictionary

This dictionary matches `supabase/schema.sql` and the seeded data in `supabase/seed.sql`. The DBMS is PostgreSQL on Supabase. All foreign keys use PostgreSQL constraints, and operational history is preserved with soft-delete timestamps instead of hard deletes.

## Enum Domains

| Enum | Values | Used By |
| --- | --- | --- |
| `staff_role` | `cashier`, `kitchen`, `waiter`, `manager` | `app_users.role`, `staff_shifts.role_snapshot` |
| `table_status` | `available`, `occupied`, `cleaning`, `billing`, `disabled` | `restaurant_tables.status` |
| `session_status` | `open`, `closed`, `cancelled` | `dining_sessions.status` |
| `payment_status` | `unpaid`, `paid`, `refunded` | `dining_sessions.payment_status`, `payments.status` |
| `payment_method` | `cash` | `payments.method` |
| `order_status` | `open`, `completed`, `cancelled` | `orders.status` |
| `order_item_status` | `pending`, `cooking`, `ready`, `out_for_serving`, `served`, `cancelled` | `order_items.status` |
| `order_priority` | `normal`, `rush` | `order_items.priority_level` |
| `order_source` | `customer`, `cashier` | `orders.source` |
| `inventory_transaction_type` | `purchase`, `usage`, `adjustment`, `waste` | `inventory_transactions.transaction_type` |

## `app_users`

Purpose: staff login and role assignment for cashier, kitchen, waiter, and manager screens.

| Column | Type | Constraint | Description |
| --- | --- | --- | --- |
| `user_id` | `uuid` | PK, default `gen_random_uuid()` | Staff identifier |
| `full_name` | `varchar(120)` | Not null | Staff display name |
| `username` | `varchar(60)` | Not null, unique | Login username |
| `password_hash` | `text` | Not null | Demo hash/auth reference |
| `role` | `staff_role` | Not null | Staff permission group |
| `is_active` | `boolean` | Not null, default `true` | Whether staff can login |
| `created_at` | `timestamptz` | Not null, default `now()` | Insert timestamp |
| `deleted_at` | `timestamptz` | Nullable | Soft-delete timestamp |

Sample rows:

| user_id | full_name | username | role | is_active |
| --- | --- | --- | --- | --- |
| `00000000-0000-0000-0000-000000000001` | Narin Cashier | cashier | cashier | true |
| `00000000-0000-0000-0000-000000000002` | Ploy Kitchen | kitchen | kitchen | true |
| `00000000-0000-0000-0000-000000000003` | Mek Waiter | waiter | waiter | true |
| `00000000-0000-0000-0000-000000000004` | Eddy Manager | manager | manager | true |

Indexes: primary key on `user_id`, unique index on `username`.

## `staff_shifts`

Purpose: clock-in/clock-out records for work-hour reporting and accountability.

| Column | Type | Constraint | Description |
| --- | --- | --- | --- |
| `shift_id` | `bigint` | PK, identity | Shift identifier |
| `user_id` | `uuid` | Not null, FK `app_users(user_id)` | Staff who logged in |
| `role_snapshot` | `staff_role` | Not null | Role at login time |
| `station` | `varchar(80)` | Not null | Work station |
| `clock_in_at` | `timestamptz` | Not null, default `now()` | Shift start |
| `clock_out_at` | `timestamptz` | Nullable, `>= clock_in_at` | Shift end |
| `login_at` | `timestamptz` | Not null, default `now()` | Authentication time |
| `logout_at` | `timestamptz` | Nullable, `>= login_at` | Logout time |
| `note` | `text` | Not null, default empty | Shift note |

Sample rows:

| shift_id | user_id | role_snapshot | station | state |
| --- | --- | --- | --- | --- |
| 1 | `...0001` | cashier | Front POS | closed |
| 2 | `...0002` | kitchen | Kitchen pass | active |
| 3 | `...0003` | waiter | Dining room | closed |
| 4 | `...0004` | manager | Management office | active |

Indexes: `uq_active_shift_per_user`, `idx_staff_shifts_user_clock`, `idx_staff_shifts_active`.

## `staff_activity_logs`

Purpose: audit trail for staff actions across cashier, kitchen, waiter, manager, and inventory workflows.

| Column | Type | Constraint | Description |
| --- | --- | --- | --- |
| `activity_id` | `bigint` | PK, identity | Audit identifier |
| `user_id` | `uuid` | Not null, FK `app_users(user_id)` | Staff who performed action |
| `shift_id` | `bigint` | Nullable, FK `staff_shifts(shift_id)` | Active shift |
| `action` | `varchar(80)` | Not null | Machine-readable action |
| `entity_type` | `varchar(40)` | Not null | Business object type |
| `entity_id` | `text` | Not null | Affected row id |
| `occurred_at` | `timestamptz` | Not null, default `now()` | Action time |
| `note` | `text` | Not null, default empty | Human-readable note |

Sample rows:

| activity_id | user_id | action | entity_type | entity_id |
| --- | --- | --- | --- | --- |
| 1 | `...0001` | open_table | dining_session | `10000000-0000-0000-0000-000000001008` |
| 2 | `...0001` | checkout_paid | payment | `1` |
| 3 | `...0003` | serve_item | order_item | `1005` |
| 4 | `...0002` | start_preparing | order_item | `1001` |
| 5 | `...0002` | expedite_order | order_item | `1003` |

Indexes: `idx_staff_activity_user_id`, `idx_staff_activity_shift_id`, `idx_staff_activity_occurred_desc`.

## `restaurant_tables`

Purpose: physical table grid used by cashier and manager live table status.

| Column | Type | Constraint | Description |
| --- | --- | --- | --- |
| `table_id` | `bigint` | PK, identity | Table identifier |
| `table_code` | `varchar(12)` | Not null, unique | Human-readable number |
| `zone` | `varchar(40)` | Not null | Restaurant zone |
| `capacity` | `integer` | Not null, default `4`, check `= 4` | Fixed table capacity |
| `status` | `table_status` | Not null, default `available` | Current table state |
| `cleaning_started_at` | `timestamptz` | Nullable | Start of 10-minute cleaning timer |
| `created_at` | `timestamptz` | Not null, default `now()` | Insert timestamp |
| `deleted_at` | `timestamptz` | Nullable | Soft-delete timestamp |

Sample rows:

| table_id | table_code | capacity | status | cleaning_started_at |
| --- | --- | --- | --- | --- |
| 1 | 01 | 4 | available | null |
| 2 | 02 | 4 | occupied | null |
| 3 | 03 | 4 | cleaning | `now() - 4 minutes` |
| 5 | 05 | 4 | billing | null |
| 15 | 15 | 4 | billing | null |

Indexes: unique `table_code`, `idx_tables_active_status`.

## `dining_sessions`

Purpose: one buffet visit for one table; central fact table for guest counts, table timing, and billing.

| Column | Type | Constraint | Description |
| --- | --- | --- | --- |
| `session_id` | `uuid` | PK, default `gen_random_uuid()` | Dining visit identifier |
| `table_id` | `bigint` | Not null, FK `restaurant_tables(table_id)` | Assigned table |
| `cashier_id` | `uuid` | Not null, FK `app_users(user_id)` | Staff who opened session |
| `waiter_id` | `uuid` | Nullable, FK `app_users(user_id)` | Assigned waiter |
| `adult_count` | `integer` | Not null, `>= 0` | Adult guests |
| `child_count` | `integer` | Not null, `>= 0` | Child guests |
| `adult_price` | `numeric(10,2)` | Not null, `>= 0` | Adult price snapshot |
| `child_price` | `numeric(10,2)` | Not null, `>= 0` | Child price snapshot |
| `opened_at` | `timestamptz` | Not null, default `now()` | Session start |
| `bill_requested_at` | `timestamptz` | Nullable | Billing request time |
| `closed_at` | `timestamptz` | Nullable | Session close |
| `status` | `session_status` | Not null, default `open` | Session lifecycle |
| `payment_status` | `payment_status` | Not null, default `unpaid` | Payment lifecycle |
| `customer_code` | `varchar(20)` | Not null, unique | QR/customer token |

Checks: `adult_count + child_count > 0`, `adult_count + child_count <= 4`.

Sample rows:

| session_id | table_id | guests | status | payment_status | customer_code |
| --- | --- | --- | --- | --- | --- |
| `...1001` | 2 | 4 | open | unpaid | T02-4821 |
| `...1002` | 5 | 3 | open | unpaid | T05-2190 |
| `...1003` | 6 | 2 | open | unpaid | T06-6883 |
| `...1008` | 4 | 2 | closed | paid | T04-1220 |
| `...1009` | 12 | 4 | closed | paid | T12-4301 |

Indexes: `uq_open_session_per_table`, `idx_sessions_table_status_opened`, `idx_sessions_status_payment_bill`, `idx_sessions_opened_at`.

## `payments`

Purpose: cash payment record for closed dining sessions.

| Column | Type | Constraint | Description |
| --- | --- | --- | --- |
| `payment_id` | `bigint` | PK, identity | Payment identifier |
| `session_id` | `uuid` | Not null, unique, FK `dining_sessions(session_id)` | Paid session |
| `cashier_id` | `uuid` | Not null, FK `app_users(user_id)` | Cashier taking payment |
| `method` | `payment_method` | Not null | Current system supports `cash` |
| `paid_amount` | `numeric(10,2)` | Not null, `>= 0` | Payment amount |
| `paid_at` | `timestamptz` | Not null, default `now()` | Payment time |
| `status` | `payment_status` | Not null, default `paid` | Payment state |

Sample rows:

| payment_id | session_id | method | paid_amount | status |
| --- | --- | --- | --- | --- |
| 1 | `...1008` | cash | 798.00 | paid |
| 2 | `...1009` | cash | 2114.00 | paid |

Indexes: unique `session_id`, `idx_payments_status_paid_at`.

## `menu_categories`

Purpose: normalized menu grouping; the UI maps these categories into four customer tabs.

| Column | Type | Constraint | Description |
| --- | --- | --- | --- |
| `category_id` | `bigint` | PK, identity | Category identifier |
| `name` | `varchar(80)` | Not null, unique | Category name |

Sample rows:

| category_id | name |
| --- | --- |
| 1 | Pork |
| 2 | Beef |
| 3 | Seafood |
| 4 | Vegetables |
| 5 | Snacks |
| 6 | Drinks |

Indexes: primary key and unique `name`.

## `menu_items`

Purpose: customer-orderable items, kitchen station routing, menu availability, and soft delete.

| Column | Type | Constraint | Description |
| --- | --- | --- | --- |
| `menu_id` | `bigint` | PK, identity | Menu identifier |
| `category_id` | `bigint` | Not null, FK `menu_categories(category_id)` | Category |
| `name` | `varchar(120)` | Not null | Item name |
| `description` | `text` | Not null, default empty | Menu detail |
| `image_url` | `text` | Not null, default empty | Public image path or Supabase Storage URL |
| `kitchen_station` | `varchar(60)` | Not null, default `general` | KDS station |
| `prep_time_minutes` | `integer` | Not null, default `5`, `> 0` | Target preparation time |
| `price` | `numeric(10,2)` | Not null, default `0`, `>= 0` | Add-on price |
| `is_available` | `boolean` | Not null, default `true` | Visible on customer iPad |
| `created_at` | `timestamptz` | Not null, default `now()` | Insert timestamp |
| `deleted_at` | `timestamptz` | Nullable | Soft-delete timestamp |

Sample rows:

| menu_id | category_id | name | image_url | station | price | available |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | Marinated Pork Belly | `/menu/pork-belly.svg` | hotpot | 0.00 | true |
| 2 | 1 | Premium Pork Shoulder | `/menu/pork-shoulder.svg` | hotpot | 0.00 | true |
| 3 | 2 | Black Pepper Beef | `/menu/black-pepper-beef.svg` | premium | 79.00 | true |
| 4 | 3 | Fresh Squid | `/menu/squid.svg` | seafood | 0.00 | true |
| 9 | 6 | Thai iced tea | `/menu/thai-tea.svg` | drink | 35.00 | true |
| 10 | 6 | Cola | `/menu/cola.svg` | drink | 29.00 | false |

Indexes: `idx_menu_items_active_category`, `idx_menu_items_station`.

## `orders`

Purpose: one customer/cashier order submission, containing many order items.

| Column | Type | Constraint | Description |
| --- | --- | --- | --- |
| `order_id` | `bigint` | PK, identity | Order header identifier |
| `session_id` | `uuid` | Not null, FK `dining_sessions(session_id)` | Dining session |
| `ordered_at` | `timestamptz` | Not null, default `now()` | Submission time |
| `source` | `order_source` | Not null, default `customer` | Submitter type |
| `status` | `order_status` | Not null, default `open` | Completion state |
| `note` | `text` | Not null, default empty | Order note |

Sample rows:

| order_id | session_id | source | status | note |
| --- | --- | --- | --- | --- |
| 1001 | `...1001` | customer | open | No spicy sauce |
| 1002 | `...1001` | customer | open | empty |
| 1003 | `...1002` | customer | completed | empty |
| 1004 | `...1003` | customer | completed | empty |
| 1005 | `...1003` | customer | completed | empty |

Indexes: `idx_orders_session_ordered`.

## `order_items`

Purpose: operational queue rows used by kitchen display, waiter screen, customer order history, and service-speed analytics.

| Column | Type | Constraint | Description |
| --- | --- | --- | --- |
| `order_item_id` | `bigint` | PK, identity | Queue row identifier |
| `order_id` | `bigint` | Not null, FK `orders(order_id)` | Parent order |
| `menu_id` | `bigint` | Not null, FK `menu_items(menu_id)` | Ordered menu item |
| `quantity` | `integer` | Not null, `> 0` | Quantity |
| `status` | `order_item_status` | Not null, default `pending` | Kitchen/waiter state |
| `special_instructions` | `text` | Not null, default empty | KDS note |
| `priority_level` | `order_priority` | Not null, default `normal` | Normal or rush |
| `priority_reason` | `text` | Not null, default empty | Rush reason |
| `expedited_at` | `timestamptz` | Nullable | Rush timestamp |
| `requested_at` | `timestamptz` | Not null, default `now()` | Customer request time |
| `cooking_at` | `timestamptz` | Nullable | Kitchen start |
| `ready_at` | `timestamptz` | Nullable | Ready for waiter |
| `out_for_serving_at` | `timestamptz` | Nullable | Picked up by waiter |
| `served_at` | `timestamptz` | Nullable | Delivered to table |
| `cancelled_at` | `timestamptz` | Nullable | Cancel time |

Sample rows:

| order_item_id | order_id | menu_id | quantity | status | priority_level |
| --- | --- | --- | --- | --- | --- |
| 1001 | 1001 | 1 | 2 | cooking | normal |
| 1002 | 1001 | 6 | 1 | ready | normal |
| 1003 | 1002 | 3 | 1 | pending | rush |
| 1004 | 1002 | 5 | 2 | pending | normal |
| 1005 | 1003 | 1 | 3 | served | normal |
| 1010 | 1005 | 9 | 4 | served | normal |

Indexes: `idx_order_items_status_requested`, `idx_order_items_order_status`, `idx_order_items_menu_id`, `idx_order_items_priority`.

## `inventory_items`

Purpose: stock master data for inventory management and menu availability.

| Column | Type | Constraint | Description |
| --- | --- | --- | --- |
| `ingredient_id` | `bigint` | PK, identity | Ingredient identifier |
| `name` | `varchar(120)` | Not null, unique | Ingredient name |
| `unit` | `varchar(20)` | Not null | Measurement unit |
| `quantity_on_hand` | `numeric(12,2)` | Not null, default `0`, `>= 0` | Current stock |
| `reorder_level` | `numeric(12,2)` | Not null, default `0`, `>= 0` | Low-stock threshold |
| `unit_cost` | `numeric(10,4)` | Not null, default `0`, `>= 0` | Cost per unit |
| `created_at` | `timestamptz` | Not null, default `now()` | Insert timestamp |
| `deleted_at` | `timestamptz` | Nullable | Soft-delete timestamp |

Sample rows:

| ingredient_id | name | unit | quantity_on_hand | reorder_level | unit_cost |
| --- | --- | --- | --- | --- | --- |
| 1 | Pork shoulder | g | 9200.00 | 2500.00 | 0.1800 |
| 3 | Ribeye beef | g | 1800.00 | 1500.00 | 0.6200 |
| 5 | White shrimp | pcs | 48.00 | 60.00 | 5.2000 |
| 9 | Thai tea concentrate | ml | 2100.00 | 800.00 | 0.0900 |
| 10 | Cola syrup | ml | 0.00 | 900.00 | 0.0700 |

Indexes: unique `name`, `idx_inventory_items_stock`.

## `recipes`

Purpose: many-to-many bridge between menu items and ingredients, with quantity required per menu quantity.

| Column | Type | Constraint | Description |
| --- | --- | --- | --- |
| `recipe_id` | `bigint` | PK, identity | Recipe row identifier |
| `menu_id` | `bigint` | Not null, FK `menu_items(menu_id)` | Menu item |
| `ingredient_id` | `bigint` | Not null, FK `inventory_items(ingredient_id)` | Ingredient |
| `quantity_used` | `numeric(12,2)` | Not null, `> 0` | Amount per one menu item quantity |

Constraint: unique pair `(menu_id, ingredient_id)`.

Sample rows:

| recipe_id | menu_id | ingredient_id | quantity_used |
| --- | --- | --- | --- |
| 1 | 1 | 1 | 120.00 |
| 2 | 2 | 2 | 90.00 |
| 3 | 3 | 3 | 100.00 |
| 5 | 5 | 5 | 6.00 |
| 9 | 9 | 9 | 80.00 |

Indexes: `idx_recipes_menu_id`, `idx_recipes_ingredient_id`.

## `inventory_transactions`

Purpose: audit trail for stock changes from serving, purchase, adjustment, or waste.

| Column | Type | Constraint | Description |
| --- | --- | --- | --- |
| `transaction_id` | `bigint` | PK, identity | Movement identifier |
| `ingredient_id` | `bigint` | Not null, FK `inventory_items(ingredient_id)` | Ingredient moved |
| `order_item_id` | `bigint` | Nullable, FK `order_items(order_item_id)` | Served item causing usage |
| `staff_id` | `uuid` | Nullable, FK `app_users(user_id)` | Staff who made movement |
| `transaction_type` | `inventory_transaction_type` | Not null | Movement type |
| `quantity_change` | `numeric(12,2)` | Not null | Positive stock in, negative stock out |
| `unit_cost_snapshot` | `numeric(10,4)` | Not null, default `0` | Historical cost |
| `occurred_at` | `timestamptz` | Not null, default `now()` | Movement time |
| `note` | `text` | Not null, default empty | Movement note |

Sample rows:

| transaction_id | ingredient_id | order_item_id | transaction_type | quantity_change | unit_cost_snapshot |
| --- | --- | --- | --- | --- | --- |
| 1 | 1 | 1005 | usage | -360.00 | 0.1800 |
| 2 | 8 | 1006 | usage | -360.00 | 0.0800 |
| 4 | 4 | 1008 | usage | -240.00 | 0.3100 |
| 5 | 5 | 1009 | usage | -18.00 | 5.2000 |
| 6 | 9 | 1010 | usage | -320.00 | 0.0900 |

Indexes: `idx_transactions_type_occurred`, `idx_transactions_ingredient_occurred`.
