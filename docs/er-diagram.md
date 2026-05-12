# ER Diagram

This ERD matches the simplified Supabase schema used by the final web application. The system is for an all-you-can-eat restaurant, so menu items do not store selling price. Revenue comes from dining-session adult/child buffet price snapshots and cash payments.

```mermaid
erDiagram
    APP_USERS {
        uuid user_id PK
        text full_name
        text username UK
        text password_hash
        app_role role
        boolean is_active
        timestamptz created_at
        timestamptz deleted_at
    }

    STAFF_ACTIVITY_LOGS {
        bigint activity_id PK
        uuid user_id FK
        text action
        text entity_type
        text entity_id
        timestamptz occurred_at
    }

    RESTAURANT_TABLES {
        varchar table_code PK
        integer capacity
        table_status status
        timestamptz cleaning_started_at
    }

    DINING_SESSIONS {
        uuid session_id PK
        varchar table_code FK
        uuid cashier_id FK
        integer adult_count
        integer child_count
        numeric adult_price_snapshot
        numeric child_price_snapshot
        timestamptz opened_at
        timestamptz bill_requested_at
        timestamptz closed_at
        dining_session_status status
        payment_status payment_status
    }

    PAYMENTS {
        bigint payment_id PK
        uuid session_id FK
        uuid cashier_id FK
        payment_method method
        numeric paid_amount
        timestamptz paid_at
        payment_status status
    }

    MENU_CATEGORIES {
        bigint category_id PK
        text name UK
    }

    MENU_ITEMS {
        bigint menu_id PK
        bigint category_id FK
        text name
        text description
        text image_url
        boolean is_available
        timestamptz deleted_at
    }

    ORDERS {
        bigint order_id PK
        uuid session_id FK
        timestamptz ordered_at
        order_status status
    }

    ORDER_ITEMS {
        bigint order_item_id PK
        bigint order_id FK
        bigint menu_id FK
        integer quantity
        order_item_status status
        text special_instructions
        priority_level priority_level
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
        text name
        text unit
        numeric quantity_on_hand
        numeric reorder_level
        numeric unit_cost
        timestamptz deleted_at
    }

    RECIPES {
        bigint menu_id PK, FK
        bigint ingredient_id PK, FK
        numeric quantity_used
    }

    INVENTORY_TRANSACTIONS {
        bigint transaction_id PK
        bigint ingredient_id FK
        bigint order_item_id FK
        transaction_type transaction_type
        numeric quantity_change
        numeric unit_cost_snapshot
        timestamptz occurred_at
    }

    APP_USERS ||--o{ STAFF_ACTIVITY_LOGS : performs
    APP_USERS ||--o{ DINING_SESSIONS : opens_as_cashier
    APP_USERS ||--o{ PAYMENTS : records_cash_payment
    RESTAURANT_TABLES ||--o{ DINING_SESSIONS : hosts
    DINING_SESSIONS ||--o{ ORDERS : receives
    DINING_SESSIONS ||--o{ PAYMENTS : paid_by
    MENU_CATEGORIES ||--o{ MENU_ITEMS : groups
    ORDERS ||--o{ ORDER_ITEMS : contains
    MENU_ITEMS ||--o{ ORDER_ITEMS : ordered_as
    MENU_ITEMS ||--o{ RECIPES : requires
    INVENTORY_ITEMS ||--o{ RECIPES : used_in
    INVENTORY_ITEMS ||--o{ INVENTORY_TRANSACTIONS : moves
    ORDER_ITEMS ||--o{ INVENTORY_TRANSACTIONS : deducts_when_served
```

## Relationships And Constraints

| Relationship | Cardinality | Participation / Rule |
| --- | --- | --- |
| `restaurant_tables` to `dining_sessions` | One table can have many historical sessions | `dining_sessions.table_code` is mandatory. A partial unique index allows only one open session per table. |
| `app_users` to `dining_sessions` | One cashier can open many sessions | `cashier_id` is nullable for imported/demo data but normally set by the cashier interface. |
| `dining_sessions` to `orders` | One session can have many customer submissions | Every order belongs to exactly one session. |
| `orders` to `order_items` | One order can contain many menu items | Every order item belongs to exactly one order. |
| `menu_items` to `order_items` | One menu item can appear on many order rows | Every order item references one menu item. |
| `menu_items` to `inventory_items` through `recipes` | Many-to-many | `recipes(menu_id, ingredient_id)` is the composite primary key. |
| `order_items` to `inventory_transactions` | One served order item can deduct many ingredients | `order_item_id` is nullable because manual stock adjustments are not tied to a served item. |
| `dining_sessions` to `payments` | One session can have one or more payment records | Current UI creates one cash payment per completed session. |
| `app_users` to `staff_activity_logs` | One user can create many audit actions | Used for login, workflow actions, manager edits, and soft deletes. |

## Removed From Final Model

- `staff_shifts` is removed because the project no longer tracks shifts.
- `customer_code` is removed because customers are not registered members and the app selects an open session directly.
- `waiter_id` is removed from sessions because many waiters can serve the same table.
- `menu_items.price` is removed because buffet billing is per guest, not per dish.
- `recipe_id` is removed because the composite key `(menu_id, ingredient_id)` already identifies recipe rows.
