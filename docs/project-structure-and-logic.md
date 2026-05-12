# Project Structure and Logic

This guide explains what each folder/file does and how the pieces agree with each other. It is written for project handoff and for the final report.

## Root Files

| Path | Purpose | Logic |
| --- | --- | --- |
| `README.md` | Main quick-start guide | Lists the app, database files, demo accounts, Supabase setup, and Vercel deployment steps |
| `.env.local.example` | Environment variable template | Shows where to put `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` locally |
| `.gitignore` | Git hygiene | Keeps local env files, build output, and dependencies out of source control |
| `package.json` | Next.js dependency and script definition | Uses `npm run dev`, `npm run build`, and `npm run start`; pins deploy versions for Vercel |
| `package-lock.json` | Dependency lockfile | Lets Vercel install the same package versions with `npm ci` |
| `next.config.mjs` | Next.js config | Keeps the project close to default Next.js behavior for easy deployment |
| `tailwind.config.js` | Tailwind content/font config | Scans `app`, `pages`, and `components` files and maps font utility names |
| `postcss.config.mjs` | Tailwind PostCSS config | Enables Tailwind CSS processing in Next.js |
| `vercel.json` | Vercel deployment config | Sets the framework, install command, and build command |
| `Database Project.docx` | Existing report draft | Not required by the app runtime; can be updated using the docs in this project |

## `app/`

The `app` folder is the Next.js interface. It is a single-page, role-based operational system.

| Path | Purpose | Logic |
| --- | --- | --- |
| `app/layout.jsx` | Root layout | Imports Manrope/Epilogue fonts, global CSS, and metadata for browser/deployment previews |
| `app/globals.css` | Global styling | Imports Tailwind, defines design tokens, and styles shared UI pieces and Figma-inspired screens |
| `app/page.jsx` | Main application | Loads Supabase data, manages role-specific workflows, computes dashboard metrics, renders all screens, and writes changes back to Supabase |
| `app/lib/supabase.js` | Supabase client factory | Reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; creates a browser-safe Supabase client |
| `app/lib/supabaseDatabase.js` | Supabase adapter | Loads every synced table, converts Supabase IDs to readable UI IDs, converts UI state back to database rows, then upserts/deletes in foreign-key-safe order |

### `app/page.jsx` Screen Logic

| Area | Main Functions | Database Tables Used |
| --- | --- | --- |
| Login and shift clock | `handleLogin`, `handleLogout`, `activeShiftForUser`, `recordStaffActivity` | `app_users`, `staff_shifts`, `staff_activity_logs` |
| Cashier table management | `makeSeatForSelectedTable`, `markSelectedTableForBilling`, `closeSession`, `cashierTableState` | `restaurant_tables`, `dining_sessions`, `payments`, `order_items` |
| Customer iPad menu | `customerCategoryForItem`, `customerMenuPresentation`, `updateCartQuantity`, `placeOrder`, `callServerForCustomer` | `menu_categories`, `menu_items`, `orders`, `order_items`, `staff_activity_logs` |
| Kitchen display system | `kitchenQueueGroups`, `setOrderItemStatus`, `expediteOrderItem`, `advanceKitchenGroup` | `order_items`, `orders`, `dining_sessions`, `restaurant_tables`, `menu_items` |
| Waiter screen | `waiterServeGroups`, `markOrderItemOutForServing`, `serveOrderItem`, `advanceWaiterGroup` | `order_items`, `orders`, `dining_sessions`, `restaurant_tables`, `recipes`, `inventory_items`, `inventory_transactions` |
| Manager dashboard | `calculateDashboardMetrics`, `renderManagerDashboard` | `payments`, `dining_sessions`, `order_items`, `menu_items`, `menu_categories`, `inventory_transactions`, `inventory_items`, `restaurant_tables`, `staff_shifts` |
| Manager menu/inventory/staff | `handleAddMenu`, `softDeleteMenu`, `handleAddIngredient`, `setIngredientKioskAvailability`, `handleAddUser`, `softDeleteUser`, `restoreRow` | `menu_items`, `inventory_items`, `recipes`, `app_users`, `staff_activity_logs` |

The frontend keeps a cloned copy of database state for fast UI updates. Every accepted mutation calls `commit()`, which saves the new state back to Supabase through `syncDatabaseToSupabase()`.

## `supabase/`

The `supabase` folder is the database layer for PostgreSQL/Supabase.

| Path | Purpose | Logic |
| --- | --- | --- |
| `supabase/schema.sql` | Main schema | Creates enum types, tables, constraints, indexes, comments, and optional database-side workflow functions |
| `supabase/seed.sql` | Demo data | Inserts realistic staff, tables, menu items, inventory, sessions, orders, payments, activities, and stock movements |
| `supabase/reset-new-ux.sql` | One-shot rebuild | Drops the project tables/types, recreates schema, and inserts the current seed data in one run |
| `supabase/delete-all-data.sql` | Data wipe helper | Deletes all demo rows while preserving schema, indexes, comments, and workflow functions |
| `supabase/figma-ui-migration.sql` | Migration for older projects | Adds the newer Figma UX fields and workflow functions without wiping existing data |
| `supabase/queries.sql` | Report query examples | Contains basic and advanced SQL queries mapped to the assignment requirements |
| `supabase/README.md` | Supabase folder guide | Explains which SQL file to run for reset, row deletion, migration, and report queries |
| `supabase/setup-checklist.md` | Database setup checklist | Explains table purposes, required fields, workflow logic, and demo policies |

### Database Logic Agreement

- Table names and columns in `schema.sql` match the objects loaded by `app/lib/supabaseDatabase.js`.
- Seed rows in `seed.sql` use the same statuses and menu image paths as `app/page.jsx`.
- `reset-new-ux.sql` combines the latest schema and seed for a clean Supabase setup.
- `delete-all-data.sql` is intentionally separate from setup files so destructive row wipes are explicit.
- `queries.sql` uses the same tables and calculations as the manager dashboard.
- SQL workflow functions are included for database-side integrity and future RPC use. The current frontend mirrors those rules in React and persists through table sync.

## `docs/`

The `docs` folder is the report/support material for the database-management class.

| Path | Purpose | Logic |
| --- | --- | --- |
| `docs/er-diagram.md` | Logical design | Mermaid ERD, entities, relationships, cardinality, participation constraints, and normalization notes |
| `docs/data-dictionary.md` | Physical design | Table-by-table column dictionary, constraints, sample rows, and indexes |
| `docs/requirements-flow.md` | Requirement mapping | Shows how insert, update, soft delete, basic query, and advanced query are covered |
| `docs/database-quality-review.md` | Grading checklist | Summarizes strengths, indexes, remaining improvements, and report sources |
| `docs/supabase-sync.md` | Supabase integration guide | Lists env vars, synced tables, required permissions, and optional realtime setup |
| `docs/vercel-deployment.md` | Deployment guide | Explains local env setup and Vercel environment variables |
| `docs/report-outline.md` | Final report outline | Rubric-aligned structure for the Word/PDF report |
| `docs/prompt-log-template.md` | AI usage appendix | Template for required AI prompt logging |
| `docs/figma-ui-supabase-changes.md` | UI/database change notes | Explains why Figma-driven UX required new columns and workflow data |
| `docs/project-structure-and-logic.md` | This file | Explains the folder purpose and cross-file logic |

## `public/`

The `public` folder stores static assets served directly by Next.js.

| Path | Purpose | Logic |
| --- | --- | --- |
| `public/login-charcoal.svg` | Login visual asset | Used by the staff login screen |
| `public/menu/*.svg` | Menu item visuals | Paths are stored in `menu_items.image_url` and shown in the customer menu, manager menu table, and manager top-menu dashboard |

For a real production version, these menu paths can be replaced with Supabase Storage URLs. For the class demo and Vercel deployment, local public assets are simpler and reliable.

## Main Data Flow

1. Browser starts Next.js page.
2. `app/lib/supabase.js` creates the Supabase client from environment variables.
3. `app/lib/supabaseDatabase.js` loads tables from Supabase.
4. `app/page.jsx` normalizes data and renders the correct role screen.
5. Staff or customer actions mutate cloned state.
6. `commit()` saves the changed state back to Supabase.
7. Manager dashboard recalculates metrics from the current database-backed state.

## Assignment Requirement Coverage

| Requirement | Where It Happens |
| --- | --- |
| Insert | Opening tables, placing orders, payments, menu/inventory/staff forms, staff shifts |
| Update | Table status, kitchen status, waiter served status, stock adjustment, kiosk availability |
| Soft delete | Menu, inventory, and staff rows use `deleted_at` / `is_active` instead of hard delete |
| Basic query | Customer menu, cashier grid, kitchen queue, waiter board, audit list |
| Advanced query | Manager dashboard, `supabase/queries.sql` reports, ingredient usage, peak hour, cost per head, service speed |

## Current Improvement Notes

The project is consistent enough for a class demo. The main future improvements are:

- Add screenshots to the final report.
- Fill the AI prompt log.
- Add RLS policies if the instructor wants a stronger security story.
- Replace demo password hashes with Supabase Auth for a production-grade system.
- Add suppliers and purchase orders if inventory scope needs to be deeper.
