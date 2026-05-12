# Supabase Folder Guide

Use this folder as the database source of truth for the project.

## Recommended Setup

For a clean class-demo database, run one file:

```sql
supabase/reset-new-ux.sql
```

That script drops this app's demo tables, enum types, and workflow functions, then recreates the latest schema and seed data in one go.

If the browser app says Supabase blocked an insert/update with row-level security, run:

```sql
supabase/public-demo-access.sql
```

The project uses a custom `app_users` table for staff login, so the public anon key needs demo-table write access for the class presentation.

## File Purpose

| File | Use |
| --- | --- |
| `schema.sql` | Full PostgreSQL/Supabase schema: enum types, tables, constraints, indexes, comments, and workflow functions |
| `seed.sql` | Realistic sample data that matches the current cashier, customer iPad, kitchen, waiter, manager dashboard, and inventory UI |
| `reset-new-ux.sql` | One-shot destructive rebuild: schema + seed in a single paste/run script |
| `delete-all-data.sql` | Destructive row wipe only; keeps schema/functions but removes all data |
| `public-demo-access.sql` | Disables RLS and grants anon/authenticated table access for the class demo web app |
| `queries.sql` | Basic and advanced report queries mapped to the database-management assignment requirements |
| `figma-ui-migration.sql` | Upgrade script for an older version of the schema if you do not want to wipe existing data |
| `setup-checklist.md` | Human checklist for Supabase setup, UX fields, RLS notes, and app sync requirements |

## Flow Coverage

| UX flow | Tables/functions involved |
| --- | --- |
| Staff login and shift change | `app_users`, `staff_shifts`, `staff_activity_logs` |
| Cashier check-in and billing | `restaurant_tables`, `dining_sessions`, `payments`, `request_cash_bill`, `cash_checkout_session` |
| Automatic cleaning timer | `restaurant_tables.cleaning_started_at`, `release_completed_cleaning_tables` |
| Customer iPad menu and basket | `menu_categories`, `menu_items`, `orders`, `order_items` |
| Kitchen display cards | `order_items`, `menu_items.kitchen_station`, `start_preparing_order_item`, `mark_order_item_ready`, `expedite_order_item` |
| Waiter service board | `order_items.out_for_serving_at`, `send_order_item_to_table`, `serve_order_item` |
| Inventory deduction | `recipes`, `inventory_items`, `inventory_transactions`, `serve_order_item` |
| Manager dashboard | `payments`, `dining_sessions`, `order_items`, `inventory_transactions`, `restaurant_tables`, `staff_shifts` |
| Menu/inventory soft delete | `menu_items.deleted_at`, `inventory_items.deleted_at`, `app_users.deleted_at` |

## Delete Everything

To clear rows but keep the database structure:

```sql
supabase/delete-all-data.sql
```

To clear rows and rebuild the whole demo database:

```sql
supabase/reset-new-ux.sql
```
