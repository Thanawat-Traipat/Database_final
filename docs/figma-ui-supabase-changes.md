# UI And Supabase Alignment Notes

This note records the final UI/database decisions after simplifying the Figma prototype for the database-management submission.

## Kept Because The UI Uses Them

- `menu_items.image_url`: customer menu and manager top-menu dashboard pull images from the database.
- `menu_items.is_available`: manager kiosk toggle hides unavailable items from the customer iPad.
- `menu_items.deleted_at`: soft delete for removed menu rows.
- `inventory_items.deleted_at`: soft delete for removed ingredients.
- `app_users.deleted_at`: soft delete for staff logins.
- `order_items.requested_at`: timer start used by both kitchen and waiter screens.
- `order_items.priority_level`: normal vs rush/expedite visual coding.
- `order_items.expedited_at`: time a card was escalated.
- `order_items.out_for_serving_at`: waiter picked-up time.
- `dining_sessions.adult_price_snapshot` and `child_price_snapshot`: preserves bill history.

## Removed From The Old Prototype

- `staff_shifts`: no shift tracking in final scope.
- `dining_sessions.waiter_id`: several waiters can serve one table.
- `dining_sessions.customer_code`: no customer membership or QR-code login.
- `menu_items.price`: buffet pricing is per person, not per dish.
- `menu_items.kitchen_station`: no station routing in the final UI.
- `menu_items.prep_time_minutes`: late logic is based on the 15-minute order timer.
- `orders.source` and `orders.note`: every order is a customer submission in this project.
- `order_items.priority_reason`: rush state is enough for the UI.
- `recipes.recipe_id`: `(menu_id, ingredient_id)` is the natural key.
- `inventory_transactions.staff_id` and `note`: stock movement rows only store what moved, why, and when.

## Current Workflow Functions

- `request_bill(session_id, cashier_user_id)`
- `process_cash_payment(session_id, cashier_user_id)`
- `release_completed_cleaning_tables()`
- `start_preparing_order_item(order_item_id, actor_user_id)`
- `mark_order_item_ready(order_item_id, actor_user_id)`
- `expedite_order_item(order_item_id, actor_user_id)`
- `send_order_item_to_table(order_item_id, actor_user_id)`
- `serve_order_item(order_item_id, actor_user_id)`
- `delete_all_yum_yum_buffet_data()`
