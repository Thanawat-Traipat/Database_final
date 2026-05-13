# Supabase Folder Guide

This folder is the database source of truth for the final project.

## Recommended Setup

For a clean class-demo database, paste and run one file in Supabase SQL Editor:

```sql
supabase/reset-new-ux.sql
```

That script drops old project objects, recreates the simplified schema, inserts seed data, defines workflow functions, disables RLS for the demo, and grants anon/authenticated table access.

## File Purpose

| File | Use |
| --- | --- |
| `schema.sql` | Schema-only version: enum types, tables, constraints, indexes, functions, and grants |
| `seed.sql` | Realistic sample data matching cashier, customer iPad, kitchen, waiter, manager dashboard, and inventory UI |
| `reset-new-ux.sql` | One-shot destructive rebuild: drop old schema + create latest schema + seed in one run |
| `delete-all-data.sql` | Destructive row wipe only; keeps schema/functions but removes all data |
| `public-demo-access.sql` | Disables RLS and grants anon/authenticated access for the class demo web app |
| `queries.sql` | Insert, update, soft delete, basic query, and advanced query examples for the assignment |
| `fix-live-inventory-menu-links.sql` | Non-destructive repair for older live Supabase data so menu, recipe, inventory, and Sides & Drinks links match the final UI |
| `figma-ui-migration.sql` | Retired note; use `reset-new-ux.sql` for the final simplified schema |
| `setup-checklist.md` | Human setup checklist and table purpose summary |

## Flow Coverage

| UX flow | Tables/functions involved |
| --- | --- |
| Staff login and role test bar | `app_users`, `staff_activity_logs` |
| Cashier check-in and billing | `restaurant_tables`, `dining_sessions`, `payments`, `request_bill`, `process_cash_payment` |
| Automatic cleaning timer | `restaurant_tables.cleaning_started_at`, `release_completed_cleaning_tables` |
| Customer iPad menu and basket | `menu_categories`, `menu_items`, `orders`, `order_items` |
| Kitchen display cards | `orders`, `order_items`, `menu_items`, `start_preparing_order_item`, `mark_order_item_ready`, `expedite_order_item` |
| Waiter service board | `order_items.requested_at`, `send_order_item_to_table`, `serve_order_item` |
| Inventory deduction | `recipes`, `inventory_items`, `inventory_transactions`, `serve_order_item` |
| Manager dashboard | `payments`, `dining_sessions`, `order_items`, `inventory_transactions`, `restaurant_tables`, `menu_items` |
| Soft delete | `menu_items.deleted_at`, `inventory_items.deleted_at`, `app_users.deleted_at` |

## Final Simplifications

- No `staff_shifts`: the project does not track staff shifts.
- No `waiter_id` on `dining_sessions`: a table can be served by many waiters.
- No `customer_code`: customers use the open dining session selected by the app.
- No menu `price`: the restaurant is an all-you-can-eat buffet.
- No `kitchen_station` or `prep_time_minutes`: kitchen status is based on order-item time and status.
- No `recipe_id`: `recipes` uses `(menu_id, ingredient_id)` as a composite key.
- No `restaurant_tables.zone`, `created_at`, or `deleted_at`: table code is the real table identifier.

## Delete Everything

To clear rows but keep the database structure:

```sql
supabase/delete-all-data.sql
```

To clear rows and rebuild the whole demo database:

```sql
supabase/reset-new-ux.sql
```
