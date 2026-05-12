# Yum Yum Buffet Database Final Project

This workspace contains a working Next.js website prototype plus Supabase-ready database files for a dine-in buffet restaurant system.

## What Is Included

- `app/layout.jsx` defines the Next.js root layout and imports global CSS.
- `app/page.jsx` contains the role-based React UI and Supabase-backed workflow operations.
- `app/lib/supabase.js` creates the browser Supabase client from `NEXT_PUBLIC_*` variables.
- `app/lib/supabaseDatabase.js` maps the app's readable demo IDs to Supabase table IDs and syncs writes.
- `app/globals.css` imports Tailwind and defines the shared styling used across the role screens.
- `tailwind.config.js` and `postcss.config.mjs` support Figma-exported Tailwind utility classes.
- `package.json` contains the Next.js scripts and dependencies.
- `vercel.json` pins the Vercel install/build commands for predictable deployment.
- `supabase/README.md` explains how each Supabase SQL/support file should be used.
- `supabase/schema.sql` creates the PostgreSQL tables, constraints, enums, indexes, and workflow RPC functions.
- `supabase/figma-ui-migration.sql` upgrades an older Supabase schema for the Figma UI fields.
- `supabase/seed.sql` inserts realistic sample data.
- `supabase/reset-new-ux.sql` clears and rebuilds the Supabase demo database in one run for the new UX/UI.
- `supabase/delete-all-data.sql` deletes all demo rows while keeping the schema and functions.
- `supabase/public-demo-access.sql` disables RLS/grants anon access for the class demo if Supabase blocks browser writes.
- `supabase/queries.sql` contains basic and advanced queries for the report.
- `supabase/setup-checklist.md` lists the Supabase setup steps and table purposes.
- `docs/er-diagram.md` contains the corrected ER diagram in Mermaid format.
- `docs/data-dictionary.md` contains the physical data dictionary with sample rows.
- `docs/database-quality-review.md` lists strengths and improvement priorities for the database submission.
- `docs/project-structure-and-logic.md` explains each folder/file and how the app, database, and docs agree.
- `docs/supabase-sync.md` lists the Supabase tables, environment variables, permissions, and optional realtime setup.
- `docs/figma-ui-supabase-changes.md` explains the database fields added for the Figma-driven UX.
- `docs/report-outline.md` gives a rubric-aligned structure for the final PDF/Word report.
- `docs/prompt-log-template.md` gives an appendix template for the required AI usage log.
- `docs/requirements-flow.md` maps the assignment requirements to the interface and collected data.
- `docs/vercel-deployment.md` explains how to deploy the Supabase-only app to Vercel.

## Demo Accounts

| Role | Username | Password |
| --- | --- | --- |
| Cashier | `cashier` | `cashier123` |
| Kitchen | `kitchen` | `kitchen123` |
| Waiter | `waiter` | `waiter123` |
| Manager | `manager` | `manager123` |

## How To Run

Install dependencies once:

```bash
npm install
```

Run the Next.js dev server:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

The app requires Supabase. When `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present, it loads from Supabase and syncs workflow changes back to Supabase. If those values are missing or the database is unreachable, the UI shows a database-required message instead of using local browser storage.

If the Supabase tables exist but the required demo rows are empty, the app automatically bootstraps the demo staff, tables, menu, inventory, sessions, orders, and audit rows on first load. This prevents a fresh Supabase project from getting stuck at the login screen.

## Recommended Demo Flow

Use the floating **Role Test Bar** at the bottom of the app to switch between Cashier, Customer, Kitchen, Waiter, and Manager during grading. Staff shortcuts authenticate the Supabase-backed demo users, open a shift when needed, and record the shortcut in `staff_activity_logs`, so the test path remains database-driven.

1. Login as cashier and open a table.
2. Open the customer QR demo and place an order.
3. Login as kitchen and move items to `cooking`, then `ready`.
4. Login as waiter and mark ready items as `served`.
5. Login as cashier and close/pay the session.
6. Login as manager and review the dashboard and inventory screens.

The kitchen login uses the Figma-style Kitchen Display System. It is data-driven by Supabase rows, not hard-coded static cards.

## Supabase Setup

Required database setup:

1. Create a Supabase project.
2. For a fresh one-shot reset, paste and run `supabase/reset-new-ux.sql` in the Supabase SQL Editor.
3. For non-destructive setup, run `supabase/schema.sql`, then `supabase/seed.sql`.
4. If you already ran the older schema and do not want to wipe data, run `supabase/figma-ui-migration.sql`.
5. If the app says an RLS policy blocked insert/update, run `supabase/public-demo-access.sql`.
6. Copy `.env.local.example` to `.env.local` and add your project URL and anon key.
7. Optional: create a `menu-images` Supabase Storage bucket if you want to replace the bundled `public/menu/*.svg` assets with real uploaded food photos.
8. Use `supabase/queries.sql` for dashboard/report examples.
9. Follow `supabase/README.md`, `docs/supabase-sync.md`, `docs/vercel-deployment.md`, `supabase/setup-checklist.md`, and `docs/figma-ui-supabase-changes.md` for table purpose and app integration notes.

To wipe all rows without dropping the schema, run `supabase/delete-all-data.sql`.

## Where To Put Supabase URL And Key

For local development, create this file:

```text
/Users/thanawattraipat/Documents/Database_final/.env.local
```

Put these two values inside:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

Get both values from Supabase Project Settings > API. Use Project URL for `NEXT_PUBLIC_SUPABASE_URL` and anon public key for `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Never put the service-role key in a `NEXT_PUBLIC_*` variable.

## Vercel Deployment

1. Push the source code to GitHub.
2. Import the repository in Vercel as a Next.js project.
3. Add these Vercel Environment Variables for Production, Preview, and Development:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Keep the Framework Preset as Next.js. The included `vercel.json` uses `npm ci` and `npm run build`.
5. Deploy.
6. Open the deployed URL and login with one of the demo staff accounts.
