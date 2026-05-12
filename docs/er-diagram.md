# Logical ER Diagram

This ERD is the database model used by the Supabase-backed interface. It is designed for a dine-in buffet restaurant with four staff roles: cashier, kitchen, waiter, and manager. Customers do not have login accounts; they use the `dining_sessions.customer_code` created when the cashier opens a table.

## Design Scope

- The database is relational because the workflow needs strong references between tables, sessions, orders, menu items, recipes, stock movements, payments, and staff actions.
- The main transaction boundary is `dining_sessions`: one open buffet visit at one restaurant table.
- The kitchen and waiter workflow is tracked at `order_items` level because each food item can be pending, cooking, ready, out for serving, served, or cancelled independently.
- Soft delete is implemented with `deleted_at` or `is_active`, preserving historical reports and foreign-key references.
- Inventory deduction is derived from `recipes` and recorded in `inventory_transactions`, so manager reports can calculate ingredient usage and cost per guest.

```mermaid
erDiagram
    APP_USERS ||--o{ STAFF_SHIFTS : "clocks into"
    STAFF_SHIFTS ||--o{ STAFF_ACTIVITY_LOGS : "contains"
    APP_USERS ||--o{ STAFF_ACTIVITY_LOGS : "performs"
    APP_USERS ||--o{ DINING_SESSIONS : "opens as cashier"
    APP_USERS o|--o{ DINING_SESSIONS : "assigned as waiter"
    APP_USERS ||--o{ PAYMENTS : "records"
    APP_USERS o|--o{ INVENTORY_TRANSACTIONS : "records"

    RESTAURANT_TABLES ||--o{ DINING_SESSIONS : "hosts historical visits"
    DINING_SESSIONS ||--o{ ORDERS : "receives"
    DINING_SESSIONS ||--o| PAYMENTS : "paid by"
    ORDERS ||--|{ ORDER_ITEMS : "contains"
    MENU_CATEGORIES ||--o{ MENU_ITEMS : "groups"
    MENU_ITEMS ||--o{ ORDER_ITEMS : "ordered as"
    MENU_ITEMS ||--|{ RECIPES : "requires"
    INVENTORY_ITEMS ||--o{ RECIPES : "used by"
    INVENTORY_ITEMS ||--o{ INVENTORY_TRANSACTIONS : "moves through"
    ORDER_ITEMS o|--o{ INVENTORY_TRANSACTIONS : "deducts when served"

    APP_USERS {
        uuid user_id PK
        varchar full_name
        varchar username UK
        text password_hash
        staff_role role
        boolean is_active
        timestamptz created_at
        timestamptz deleted_at
    }

    STAFF_SHIFTS {
        bigint shift_id PK
        uuid user_id FK
        staff_role role_snapshot
        varchar station
        timestamptz clock_in_at
        timestamptz clock_out_at
        timestamptz login_at
        timestamptz logout_at
        text note
    }

    STAFF_ACTIVITY_LOGS {
        bigint activity_id PK
        uuid user_id FK
        bigint shift_id FK
        varchar action
        varchar entity_type
        text entity_id
        timestamptz occurred_at
        text note
    }

    RESTAURANT_TABLES {
        bigint table_id PK
        varchar table_code UK
        varchar zone
        integer capacity
        table_status status
        timestamptz cleaning_started_at
        timestamptz created_at
        timestamptz deleted_at
    }

    DINING_SESSIONS {
        uuid session_id PK
        bigint table_id FK
        uuid cashier_id FK
        uuid waiter_id FK
        integer adult_count
        integer child_count
        numeric adult_price
        numeric child_price
        timestamptz opened_at
        timestamptz bill_requested_at
        timestamptz closed_at
        session_status status
        payment_status payment_status
        varchar customer_code UK
    }

    PAYMENTS {
        bigint payment_id PK
        uuid session_id FK_UK
        uuid cashier_id FK
        payment_method method
        numeric paid_amount
        timestamptz paid_at
        payment_status status
    }

    MENU_CATEGORIES {
        bigint category_id PK
        varchar name UK
    }

    MENU_ITEMS {
        bigint menu_id PK
        bigint category_id FK
        varchar name
        text description
        text image_url
        varchar kitchen_station
        integer prep_time_minutes
        numeric price
        boolean is_available
        timestamptz created_at
        timestamptz deleted_at
    }

    ORDERS {
        bigint order_id PK
        uuid session_id FK
        timestamptz ordered_at
        order_source source
        order_status status
        text note
    }

    ORDER_ITEMS {
        bigint order_item_id PK
        bigint order_id FK
        bigint menu_id FK
        integer quantity
        order_item_status status
        text special_instructions
        order_priority priority_level
        text priority_reason
        timestamptz expedited_at
        timestamptz requested_at
        timestamptz cooking_at
        timestamptz ready_at
        timestamptz out_for_serving_at
        timestamptz served_at
        timestamptz cancelled_at
    }

    INVENTORY_ITEMS {
        bigint ingredient_id PK
        varchar name UK
        varchar unit
        numeric quantity_on_hand
        numeric reorder_level
        numeric unit_cost
        timestamptz created_at
        timestamptz deleted_at
    }

    RECIPES {
        bigint recipe_id PK
        bigint menu_id FK
        bigint ingredient_id FK
        numeric quantity_used
    }

    INVENTORY_TRANSACTIONS {
        bigint transaction_id PK
        bigint ingredient_id FK
        bigint order_item_id FK
        uuid staff_id FK
        inventory_transaction_type transaction_type
        numeric quantity_change
        numeric unit_cost_snapshot
        timestamptz occurred_at
        text note
    }
```

## Cardinality and Participation Constraints

| Relationship | Cardinality | Participation |
| --- | --- | --- |
| `app_users` to `staff_shifts` | One staff user can have many shifts | `staff_shifts.user_id` is mandatory; each shift belongs to one staff user |
| `staff_shifts` to `staff_activity_logs` | One shift can contain many actions | `staff_activity_logs.shift_id` is nullable only for legacy/manual actions; normal UI actions include a shift |
| `app_users` to `staff_activity_logs` | One staff user can perform many actions | `staff_activity_logs.user_id` is mandatory |
| `app_users` to `dining_sessions` as cashier | One cashier can open many sessions | `dining_sessions.cashier_id` is mandatory |
| `app_users` to `dining_sessions` as waiter | One waiter can be assigned to many sessions | `dining_sessions.waiter_id` is nullable in the database; the UI normally assigns a waiter |
| `restaurant_tables` to `dining_sessions` | One physical table has many historical dining sessions | `dining_sessions.table_id` is mandatory |
| `restaurant_tables` to open `dining_sessions` | One table can have at most one open session | Enforced by `uq_open_session_per_table` partial unique index |
| `dining_sessions` to `orders` | One session can have many customer order submissions | `orders.session_id` is mandatory |
| `dining_sessions` to `payments` | One session has zero or one payment | `payments.session_id` is mandatory and unique |
| `orders` to `order_items` | One order contains one or more order items | `order_items.order_id` is mandatory; the UI never submits an empty basket |
| `menu_categories` to `menu_items` | One category contains many menu items | `menu_items.category_id` is mandatory |
| `menu_items` to `order_items` | One menu item can appear in many order items | `order_items.menu_id` is mandatory |
| `menu_items` to `recipes` | One menu item requires one or more recipe rows | `recipes.menu_id` is mandatory; `(menu_id, ingredient_id)` is unique |
| `inventory_items` to `recipes` | One ingredient can be used by many menu items | `recipes.ingredient_id` is mandatory |
| `inventory_items` to `inventory_transactions` | One ingredient can have many stock movements | `inventory_transactions.ingredient_id` is mandatory |
| `order_items` to `inventory_transactions` | One served item can create many usage transactions | `inventory_transactions.order_item_id` is nullable because purchase, waste, and adjustment rows are not tied to order items |

## Important Domain Constraints

| Constraint | Why It Exists |
| --- | --- |
| `restaurant_tables.capacity = 4` | The revised UX states every table has full capacity of four guests |
| `dining_sessions.adult_count + child_count > 0` | A dining session cannot be opened without guests |
| `dining_sessions.adult_count + child_count <= 4` | Prevents overbooking a table |
| `payments.session_id` unique | A dining session can only be paid once |
| `staff_shifts.clock_out_at >= clock_in_at` | Prevents impossible work-hour calculations |
| `order_items.quantity > 0` | Prevents empty or negative order quantities |
| `inventory_items.quantity_on_hand >= 0` | Prevents negative stock after serving or adjustment |
| `recipes.quantity_used > 0` | Every recipe row consumes a positive amount |
| `uq_active_shift_per_user` | A staff user can have only one active shift at a time |

## Normalization Notes

- `menu_categories`, `menu_items`, `recipes`, and `inventory_items` separate menu browsing from stock deduction, avoiding repeated ingredient data inside order rows.
- `orders` and `order_items` separate a customer submission from individual kitchen tasks.
- `payments` are separated from `dining_sessions` so cashier payment history and session status can be audited independently.
- `staff_activity_logs` uses a flexible `entity_type` and `entity_id` audit pattern because it needs to record actions across many tables.
- `inventory_transactions.unit_cost_snapshot` stores historical cost at movement time, preventing old cost reports from changing when current ingredient cost is edited.

