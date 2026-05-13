# Project Structure And Logic

This guide explains how the source code, Supabase schema, and report docs fit together.

## Root Files

| Path | Purpose |
| --- | --- |
| `README.md` | Quick-start guide, demo accounts, Supabase setup, and Vercel deployment summary |
| `.env.local.example` | Template for local Supabase URL and anon key |
| `.gitignore` | Keeps local env files, build output, and dependencies out of Git |
| `package.json` / `package-lock.json` | Next.js dependencies and npm scripts |
| `next.config.mjs` | Next.js configuration |
| `tailwind.config.js` / `postcss.config.mjs` | Tailwind CSS setup |
| `vercel.json` | Vercel build/deploy configuration |

## `app/`

| Path | Purpose |
| --- | --- |
| `app/layout.jsx` | Root layout, metadata, fonts, and global CSS import |
| `app/globals.css` | Figma-inspired visual system and shared component styling |
| `app/page.jsx` | Main role-based application: cashier, customer, kitchen, waiter, manager, and role test bar |
| `app/lib/supabase.js` | Browser Supabase client using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `app/lib/supabaseDatabase.js` | Table-sync adapter between readable UI state and Supabase rows |

## Main App Logic

| Area | Main Functions | Tables |
| --- | --- | --- |
| Login / role test | `handleLogin`, `handleLogout`, `jumpToEvaluatorScreen`, `recordStaffActivity` | `app_users`, `staff_activity_logs` |
| Cashier table flow | `makeSeatForSelectedTable`, `markSelectedTableForBilling`, `closeSession`, `cashierTableState` | `restaurant_tables`, `dining_sessions`, `payments`, `order_items` |
| Customer iPad | `customerCategoryForItem`, `updateCartQuantity`, `placeOrder` | `menu_categories`, `menu_items`, `orders`, `order_items` |
| Kitchen display | `kitchenQueueGroups`, `setOrderItemStatus`, `expediteOrderItem`, `advanceKitchenGroup` | `orders`, `order_items`, `dining_sessions`, `restaurant_tables`, `menu_items` |
| Waiter service | `waiterServeGroups`, `markOrderItemOutForServing`, `serveOrderItem`, `advanceWaiterGroup` | `order_items`, `recipes`, `inventory_items`, `inventory_transactions` |
| Manager dashboard | `calculateDashboardMetrics`, `renderManagerDashboard` | `payments`, `dining_sessions`, `order_items`, `menu_items`, `inventory_transactions`, `inventory_items`, `restaurant_tables` |
| Manager CRUD | `handleAddMenu`, `softDeleteMenu`, `handleAddIngredient`, `handleAdjustStock`, `handleAddUser`, `restoreRow` | `menu_items`, `inventory_items`, `app_users`, `staff_activity_logs` |

Every successful mutation calls `commit()`, which normalizes the database state and writes it back to Supabase through `syncDatabaseToSupabase()`. Resetting or reseeding demo data is intentionally handled by SQL files in `supabase/` instead of by hidden frontend code, so Supabase remains the source of truth.

## `supabase/`

| Path | Purpose |
| --- | --- |
| `schema.sql` | Schema-only file for enum types, tables, constraints, indexes, functions, and grants |
| `seed.sql` | Realistic seed data for all roles and dashboard metrics |
| `reset-new-ux.sql` | One-shot destructive rebuild with schema and seed together |
| `delete-all-data.sql` | Deletes all rows while keeping schema/functions |
| `public-demo-access.sql` | Disables RLS and grants anon/authenticated table access for the class demo |
| `queries.sql` | SQL examples mapped to insert, update, soft delete, basic query, and advanced query |
| `figma-ui-migration.sql` | Retired note; final project uses `reset-new-ux.sql` |
| `README.md` / `setup-checklist.md` | Supabase setup and schema explanation |

## `docs/`

| Path | Purpose |
| --- | --- |
| `er-diagram.md` | Logical ERD, cardinality, and participation constraints |
| `data-dictionary.md` | Physical table/column dictionary |
| `requirements-flow.md` | Mapping to assignment requirements |
| `database-quality-review.md` | Strengths, indexes, and improvement notes |
| `supabase-sync.md` | Supabase integration and data-flow notes |
| `vercel-deployment.md` | Deployment steps |
| `report-outline.md` | Suggested final report structure |
| `prompt-log-template.md` | AI usage log template required by the course |
| `figma-ui-supabase-changes.md` | Historical note about UI/database changes |
| `source-code-commentary.md` | Technical explanation of the source code for the programming chapter/report appendix |
| `report-source-code-snippets.md` | Curated real source-code excerpts with Thai inline comments for direct use in the final report |

## `public/`

| Path | Purpose |
| --- | --- |
| `public/login-charcoal.svg` | Login screen visual |
| `public/menu/*.svg` | Menu images referenced by `menu_items.image_url` |

## Main Data Flow

1. The browser loads `app/page.jsx`.
2. `app/lib/supabase.js` creates the Supabase client.
3. `app/lib/supabaseDatabase.js` loads all synced tables.
4. Role screens render from Supabase-backed state.
5. Staff or customer actions mutate a cloned database object.
6. `commit()` writes the new rows to Supabase.
7. Dashboards recalculate from the current Supabase-backed state.

## Assignment Requirement Coverage

| Requirement | Where It Happens |
| --- | --- |
| Insert | Open table, customer order, menu form, inventory form, staff form, payment |
| Update | Table status, order-item status, stock adjustment, kiosk toggle, payment close |
| Soft delete | Manager removed list for users, menu items, and inventory items |
| Basic query | Cashier selected table, customer order history, kitchen/waiter cards |
| Advanced query | Manager dashboard and `supabase/queries.sql` aggregation examples |
