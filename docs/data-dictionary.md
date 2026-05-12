# Data Dictionary

This dictionary matches `supabase/schema.sql` and `supabase/reset-new-ux.sql`.

## Enum Types

| Type | Values | Used by |
| --- | --- | --- |
| `app_role` | `cashier`, `kitchen`, `waiter`, `manager` | `app_users.role` |
| `table_status` | `available`, `occupied`, `cleaning`, `billing` | `restaurant_tables.status` |
| `dining_session_status` | `open`, `closed` | `dining_sessions.status` |
| `payment_status` | `unpaid`, `paid` | `dining_sessions.payment_status`, `payments.status` |
| `payment_method` | `cash` | `payments.method` |
| `order_status` | `open`, `completed`, `cancelled` | `orders.status` |
| `order_item_status` | `pending`, `cooking`, `ready`, `out_for_serving`, `served`, `cancelled` | `order_items.status` |
| `priority_level` | `normal`, `rush` | `order_items.priority_level` |
| `transaction_type` | `usage`, `manual_adjustment`, `waste`, `restock` | `inventory_transactions.transaction_type` |

## `app_users`

Purpose: staff login rows for cashier, kitchen, waiter, and manager.

| Column | Type | Constraint | Meaning |
| --- | --- | --- | --- |
| `user_id` | `uuid` | PK, default `gen_random_uuid()` | Staff user identifier |
| `full_name` | `text` | Not null | Display name |
| `username` | `text` | Not null, unique | Login username |
| `password_hash` | `text` | Not null | Demo password hash |
| `role` | `app_role` | Not null | Staff role |
| `is_active` | `boolean` | Not null, default true | Login enabled/disabled |
| `created_at` | `timestamptz` | Not null, default now | Staff row creation time |
| `deleted_at` | `timestamptz` | Nullable | Soft-delete timestamp |

## `staff_activity_logs`

Purpose: audit trail for important staff actions.

| Column | Type | Constraint | Meaning |
| --- | --- | --- | --- |
| `activity_id` | `bigint` | PK, identity | Log row identifier |
| `user_id` | `uuid` | FK `app_users(user_id)` | Staff who performed the action |
| `action` | `text` | Not null | Action name, such as `open_table` or `serve_item` |
| `entity_type` | `text` | Not null | Type of affected row |
| `entity_id` | `text` | Not null | Affected row identifier stored generically |
| `occurred_at` | `timestamptz` | Not null, default now | Time of action |

## `restaurant_tables`

Purpose: 15 physical restaurant tables.

| Column | Type | Constraint | Meaning |
| --- | --- | --- | --- |
| `table_code` | `varchar(2)` | PK | Table number, e.g. `01` |
| `capacity` | `integer` | Not null, default 4, check `capacity = 4` | Fixed table capacity |
| `status` | `table_status` | Not null, default `available` | Current cashier table state |
| `cleaning_started_at` | `timestamptz` | Nullable | Starts the 10-minute automatic cleaning countdown |

## `dining_sessions`

Purpose: one customer visit at one table.

| Column | Type | Constraint | Meaning |
| --- | --- | --- | --- |
| `session_id` | `uuid` | PK, default `gen_random_uuid()` | Dining visit identifier |
| `table_code` | `varchar(2)` | FK `restaurant_tables(table_code)` | Table hosting the visit |
| `cashier_id` | `uuid` | FK `app_users(user_id)` | Cashier who opened the table |
| `adult_count` | `integer` | Not null, `>= 0` | Adult buffet guests |
| `child_count` | `integer` | Not null, `>= 0` | Child buffet guests |
| `adult_price_snapshot` | `numeric(10,2)` | Not null, default 399 | Adult price copied at session open |
| `child_price_snapshot` | `numeric(10,2)` | Not null, default 259 | Child price copied at session open |
| `opened_at` | `timestamptz` | Not null, default now | Customer seating start time |
| `bill_requested_at` | `timestamptz` | Nullable | Time customer asks for bill |
| `closed_at` | `timestamptz` | Nullable | Customer finish/payment close time |
| `status` | `dining_session_status` | Not null, default `open` | Session lifecycle |
| `payment_status` | `payment_status` | Not null, default `unpaid` | Payment lifecycle |

Important constraint: `adult_count + child_count <= 4`. Important index: one open session per table.

## `payments`

Purpose: cash checkout records.

| Column | Type | Constraint | Meaning |
| --- | --- | --- | --- |
| `payment_id` | `bigint` | PK, identity | Payment row identifier |
| `session_id` | `uuid` | FK `dining_sessions(session_id)` | Paid session |
| `cashier_id` | `uuid` | FK `app_users(user_id)` | Cashier who took payment |
| `method` | `payment_method` | Not null, default `cash` | Payment method |
| `paid_amount` | `numeric(10,2)` | Not null, `>= 0` | Cash amount received |
| `paid_at` | `timestamptz` | Not null, default now | Payment time |
| `status` | `payment_status` | Not null, default `paid` | Payment state |

## `menu_categories`

Purpose: menu grouping for customer tabs and dashboard reporting.

| Column | Type | Constraint | Meaning |
| --- | --- | --- | --- |
| `category_id` | `bigint` | PK, identity | Category identifier |
| `name` | `text` | Not null, unique | Category name |

## `menu_items`

Purpose: buffet menu catalog shown on the customer iPad.

| Column | Type | Constraint | Meaning |
| --- | --- | --- | --- |
| `menu_id` | `bigint` | PK, identity | Menu item identifier |
| `category_id` | `bigint` | FK `menu_categories(category_id)` | Category |
| `name` | `text` | Not null | Menu item name |
| `description` | `text` | Not null, default empty | Customer/kitchen description |
| `image_url` | `text` | Not null, default empty | Image path or URL |
| `is_available` | `boolean` | Not null, default true | Kiosk toggle |
| `deleted_at` | `timestamptz` | Nullable | Soft-delete timestamp |

## `orders`

Purpose: header row created whenever the customer presses SEND ORDER.

| Column | Type | Constraint | Meaning |
| --- | --- | --- | --- |
| `order_id` | `bigint` | PK, identity | Order identifier |
| `session_id` | `uuid` | FK `dining_sessions(session_id)` | Dining session |
| `ordered_at` | `timestamptz` | Not null, default now | Food order time |
| `status` | `order_status` | Not null, default `open` | Derived order lifecycle |

## `order_items`

Purpose: line items used by kitchen, waiter, customer history, and inventory deduction.

| Column | Type | Constraint | Meaning |
| --- | --- | --- | --- |
| `order_item_id` | `bigint` | PK, identity | Line item identifier |
| `order_id` | `bigint` | FK `orders(order_id)` | Parent customer submission |
| `menu_id` | `bigint` | FK `menu_items(menu_id)` | Ordered menu item |
| `quantity` | `integer` | Not null, `> 0` | Ordered quantity |
| `status` | `order_item_status` | Not null, default `pending` | Kitchen/waiter/customer status |
| `special_instructions` | `text` | Not null, default empty | Customer or demo kitchen note |
| `priority_level` | `priority_level` | Not null, default `normal` | Rush/late flag |
| `expedited_at` | `timestamptz` | Nullable | When the item became rush |
| `requested_at` | `timestamptz` | Not null, default now | Timer start used by kitchen and waiter |
| `cooking_at` | `timestamptz` | Nullable | Preparation start time |
| `ready_at` | `timestamptz` | Nullable | Kitchen ready time |
| `out_for_serving_at` | `timestamptz` | Nullable | Waiter picked up time |
| `served_at` | `timestamptz` | Nullable | Food served time |
| `cancelled_at` | `timestamptz` | Nullable | Cancelled time |

## `inventory_items`

Purpose: ingredient stock master.

| Column | Type | Constraint | Meaning |
| --- | --- | --- | --- |
| `ingredient_id` | `bigint` | PK, identity | Ingredient identifier |
| `name` | `text` | Not null | Ingredient name |
| `unit` | `text` | Not null | Unit such as `g`, `pcs`, `ml` |
| `quantity_on_hand` | `numeric(12,2)` | Not null, `>= 0` | Current stock |
| `reorder_level` | `numeric(12,2)` | Not null, `>= 0` | Low-stock threshold |
| `unit_cost` | `numeric(12,4)` | Not null, `>= 0` | Average cost per unit |
| `deleted_at` | `timestamptz` | Nullable | Soft-delete timestamp |

## `recipes`

Purpose: recipe bridge between buffet menu items and ingredient stock.

| Column | Type | Constraint | Meaning |
| --- | --- | --- | --- |
| `menu_id` | `bigint` | PK/FK `menu_items(menu_id)` | Menu item |
| `ingredient_id` | `bigint` | PK/FK `inventory_items(ingredient_id)` | Ingredient used |
| `quantity_used` | `numeric(12,2)` | Not null, `> 0` | Ingredient quantity consumed by one menu item |

Primary key: `(menu_id, ingredient_id)`.

## `inventory_transactions`

Purpose: stock movement ledger.

| Column | Type | Constraint | Meaning |
| --- | --- | --- | --- |
| `transaction_id` | `bigint` | PK, identity | Transaction identifier |
| `ingredient_id` | `bigint` | FK `inventory_items(ingredient_id)` | Ingredient moved |
| `order_item_id` | `bigint` | Nullable FK `order_items(order_item_id)` | Served item that caused usage |
| `transaction_type` | `transaction_type` | Not null | `usage`, `manual_adjustment`, `waste`, or `restock` |
| `quantity_change` | `numeric(12,2)` | Not null | Negative for usage, positive/negative for manual adjustment |
| `unit_cost_snapshot` | `numeric(12,4)` | Not null, default 0 | Cost copied when movement occurs |
| `occurred_at` | `timestamptz` | Not null, default now | Movement time |
