# Database Quality Review

This file is a practical checklist for improving the project before submission. It focuses on what a database-management grader is likely to inspect: logical design, physical schema, constraints, queries, and evidence that the interface really uses the DBMS.

## Current Strengths

| Area | Status | Evidence |
| --- | --- | --- |
| Relational DBMS choice | Strong | PostgreSQL/Supabase fits table-session-order-inventory relationships |
| Core entities | Strong | Staff users, tables, sessions, orders, order items, menu, recipes, inventory, payments, and audit logs |
| Relationship modeling | Strong | Foreign keys connect operational workflows instead of storing repeated text |
| Insert coverage | Strong | Sessions, orders, order items, payments, menu items, inventory items, users |
| Update coverage | Strong | Table status, order status, payment state, stock, menu availability |
| Soft delete coverage | Strong | `deleted_at` and `is_active` preserve historical references |
| Advanced query coverage | Strong | Revenue, peak hour, top menu count, ingredient usage, cost per head, service speed, bottleneck |
| Interface/DB integration | Strong | App is Supabase-only and stops when Supabase env vars are missing |

## Improvements Already Applied

| Improvement | Why It Matters |
| --- | --- |
| Added `uq_open_session_per_table` | Prevents one table from accidentally having two open sessions |
| Removed shift-only tables | Keeps the model focused on the actual final UI scope |
| Added composite/partial indexes | Makes cashier grid, KDS queue, dashboard, and audit queries faster |
| Updated ERD with `out_for_serving_at` | Waiter flow is now represented in the logical model |
| Expanded data dictionary with samples | Satisfies the physical design requirement more clearly |
| Reworked `queries.sql` numbering | Separates basic vs advanced queries and maps them to requirements |

## What To Improve Next If You Have Time

| Priority | Improvement | Why |
| --- | --- | --- |
| High | Add screenshots to the report manual | The rubric explicitly gives points for usage guide with screenshots |
| High | Add a prompt log appendix | The assignment requires recording all AI prompts used |
| Done | Add comments around major source-code blocks | Source files now include explanatory comments, and `docs/source-code-commentary.md` provides a report-ready technical walkthrough |
| Medium | Enable Supabase Realtime | Lets cashier, kitchen, waiter, customer, and manager screens update across separate devices without refresh |
| Medium | Add Row Level Security policies | Better security story for Vercel deployment; for class demo, RLS can stay off if explained |
| Medium | Replace demo password hashes | Use Supabase Auth or server-side hashing for a production-grade login |
| Low | Add `business_day` handling | Restaurants often close after midnight, so reporting by calendar date can differ from business date |
| Low | Add supplier/purchase-order tables | Would make inventory management more complete, but current assignment scope is already covered |

## Query Efficiency Notes

| Query Type | Index Support |
| --- | --- |
| Cashier 15-table grid | `idx_dining_sessions_table_status` |
| Active session detail | `idx_orders_session_time`, `idx_order_items_order_id` |
| Customer menu | `idx_menu_items_active_category` |
| Kitchen queue | `idx_order_items_status_time` |
| Waiter queue | `idx_order_items_status_time`, `idx_order_items_order_id` |
| Dashboard revenue | `idx_payments_paid_at` |
| Top menu | `idx_order_items_status_time` plus joins to `menu_items` |
| Ingredient usage | `idx_inventory_transactions_time` |
| Staff audit | `idx_activity_time` |

## Report-Writing Notes

Use these exact files as report sources:

- Logical design: `docs/er-diagram.md`
- Physical design: `docs/data-dictionary.md`
- SQL schema: `supabase/schema.sql`
- Seed data: `supabase/seed.sql`
- Query examples: `supabase/queries.sql`
- Supabase setup: `docs/supabase-sync.md`
- Vercel deployment: `docs/vercel-deployment.md`
- Requirement mapping: `docs/requirements-flow.md`
- Project structure and logic: `docs/project-structure-and-logic.md`
- Source code explanation: `docs/source-code-commentary.md`
