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

## Sample Data

The following examples are taken from the current seed/reset dataset. Each table shows fewer than 10 rows as required by the report rubric.

### `app_users`

| username | full_name | role | is_active |
| --- | --- | --- | --- |
| `cashier` | Cashier Demo | cashier | true |
| `kitchen` | Kitchen Demo | kitchen | true |
| `waiter` | Waiter Demo | waiter | true |
| `manager` | Manager Demo | manager | true |

### `restaurant_tables`

| table_code | capacity | status |
| --- | --- | --- |
| `01` | 4 | available |
| `02` | 4 | occupied |
| `03` | 4 | available |
| `05` | 4 | billing |
| `15` | 4 | billing |

### `menu_categories`

| category_id | name |
| --- | --- |
| 1 | Pork |
| 2 | Beef |
| 3 | Seafood |
| 4 | Vegetables |
| 5 | Sides and Drinks |

### `inventory_items`

| ingredient_id | name | unit | quantity_on_hand | reorder_level | unit_cost |
| --- | --- | --- | ---: | ---: | ---: |
| 1 | Pork belly slices | g | 9200 | 2200 | 0.22 |
| 2 | Pork shoulder slices | g | 9200 | 2500 | 0.18 |
| 3 | Black pepper beef | g | 1800 | 1500 | 0.62 |
| 5 | White shrimp | pcs | 48 | 60 | 5.20 |
| 10 | Cola syrup | ml | 0 | 900 | 0.07 |

### `menu_items`

| menu_id | category_id | name | is_available | image_url |
| --- | --- | --- | --- | --- |
| 1 | 1 | Marinated Pork Belly | true | `/menu/pork-belly.svg` |
| 2 | 1 | Premium Pork Shoulder | true | `/menu/pork-shoulder.svg` |
| 5 | 3 | White shrimp | true | `/menu/shrimp.svg` |
| 8 | 5 | Kimchi fried rice | true | `/menu/kimchi-rice.svg` |
| 10 | 5 | Cola | false | `/menu/cola.svg` |

### `recipes`

| menu_id | ingredient_id | quantity_used |
| --- | --- | ---: |
| 1 | 1 | 120 |
| 2 | 2 | 120 |
| 5 | 5 | 6 |
| 8 | 8 | 180 |
| 10 | 10 | 70 |

### `dining_sessions`

| session_id | table_code | adult_count | child_count | status | payment_status |
| --- | --- | ---: | ---: | --- | --- |
| `10000000-0000-0000-0000-000000001001` | `02` | 3 | 1 | open | unpaid |
| `10000000-0000-0000-0000-000000001002` | `05` | 2 | 1 | open | unpaid |
| `10000000-0000-0000-0000-000000001003` | `06` | 2 | 0 | open | unpaid |

### `orders`

| order_id | session_id | status |
| --- | --- | --- |
| 1001 | `10000000-0000-0000-0000-000000001001` | open |
| 1002 | `10000000-0000-0000-0000-000000001001` | open |
| 1003 | `10000000-0000-0000-0000-000000001002` | completed |

### `order_items`

| order_item_id | order_id | menu_id | quantity | status | priority_level |
| --- | --- | --- | ---: | --- | --- |
| 1001 | 1001 | 1 | 2 | cooking | normal |
| 1002 | 1001 | 6 | 1 | ready | rush |
| 1003 | 1002 | 3 | 1 | pending | rush |
| 1004 | 1002 | 5 | 2 | pending | normal |
| 1005 | 1003 | 1 | 3 | served | normal |

### `payments`

| payment_id | session_id | method | paid_amount | status |
| --- | --- | --- | ---: | --- |
| 1 | `10000000-0000-0000-0000-000000001008` | cash | 798 | paid |
| 2 | `10000000-0000-0000-0000-000000001009` | cash | 2114 | paid |

### `staff_activity_logs`

| activity_id | action | entity_type | entity_id |
| --- | --- | --- | --- |
| 1 | login | app_user | cashier user id |
| 2 | open_table | dining_session | session id |
| 3 | mark_order_item_ready | order_item | order item id |
| 4 | serve_item | order_item | order item id |

### `inventory_transactions`

| transaction_id | ingredient_id | transaction_type | quantity_change | unit_cost_snapshot |
| --- | --- | --- | ---: | ---: |
| 1 | 1 | usage | -240 | 0.22 |
| 2 | 6 | usage | -150 | 0.05 |
| 3 | 5 | usage | -12 | 5.20 |
| 4 | 8 | usage | -360 | 0.08 |
