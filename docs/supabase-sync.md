# Supabase Sync Requirements

The app now uses Supabase as the source of truth when these browser-safe environment variables exist:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

If either variable is missing, the app stops and shows a database-required message. This is intentional because the class project must use a DBMS-backed interface.

## One-Time Setup

1. Create a Supabase project.
2. Open Supabase SQL Editor.
3. Paste and run `supabase/reset-new-ux.sql` for a clean rebuild with seed data.
4. Copy `.env.local.example` to `.env.local`.
5. Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Project Settings > API.
6. Restart `npm run dev`.

If you only want to clear rows while keeping the schema/functions, run `supabase/delete-all-data.sql`, then rerun `supabase/seed.sql` when you want the demo rows back.

The values go in `/Users/thanawattraipat/Documents/Database_final/.env.local` for local development. Vercel needs the same variable names in Project Settings > Environment Variables.

## Vercel Deployment

1. Push the project to GitHub.
2. Import the repo in Vercel.
3. In Vercel Project Settings > Environment Variables, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Add the variables to Production, Preview, and Development.
5. Keep the Vercel Framework Preset as Next.js.
6. The included `vercel.json` sets `npm ci` and `npm run build`.
7. Redeploy after saving the variables.
8. Confirm the deployed URL loads the staff login instead of the database-required message.

## Tables The App Syncs

The React app loads these tables on boot and upserts them after every workflow action:

- `app_users`
- `staff_shifts`
- `staff_activity_logs`
- `restaurant_tables`
- `dining_sessions`
- `payments`
- `menu_categories`
- `menu_items`
- `orders`
- `order_items`
- `inventory_items`
- `recipes`
- `inventory_transactions`

## Columns Needed By The UX

- Staff login and shift change: `app_users`, `staff_shifts`, `staff_activity_logs`
- Cashier 15-table grid: `restaurant_tables`, `dining_sessions`, `payments`
- 90-minute dining timer: `dining_sessions.opened_at`
- 10-minute cleaning timer: `restaurant_tables.status`, `restaurant_tables.cleaning_started_at`
- Optional SQL cleaning helper: `release_completed_cleaning_tables()`
- Cash-only checkout: `payments.method`, `payments.paid_amount`, `dining_sessions.payment_status`
- Customer menu: `menu_categories`, `menu_items`, `recipes`, `inventory_items`
- Basket/order sending: `orders`, `order_items`
- Kitchen queue: `order_items.status`, `requested_at`, `cooking_at`, `ready_at`, `priority_level`, `priority_reason`
- Waiter serving flow: `order_items.out_for_serving_at`, `served_at`
- Manager dashboard: `payments`, `dining_sessions`, `order_items`, `menu_items`, `menu_categories`, `inventory_transactions`, `inventory_items`, `restaurant_tables`, `staff_shifts`
- Inventory kiosk toggle: `menu_items.is_available`, `inventory_items.quantity_on_hand`, `deleted_at`

## Permissions Needed

For a class demo, the fastest path is to run the SQL without enabling Row Level Security. If you enable RLS, the anon key needs policies that allow `select`, `insert`, `update`, and `delete` on the synced tables above. The reset button clears and rewrites those tables, so it also needs `delete`.

Do not put the Supabase service-role key in `NEXT_PUBLIC_*` variables. That key is server-only.

## Optional Realtime

For multiple devices to update instantly without refreshing, enable Supabase Realtime for:

- `restaurant_tables`
- `dining_sessions`
- `orders`
- `order_items`
- `payments`
- `menu_items`
- `inventory_items`
- `staff_shifts`
- `staff_activity_logs`
- `inventory_transactions`

The current app persists to Supabase on every workflow action. Realtime is the next layer if you want separate cashier, kitchen, waiter, customer, and manager browsers to refresh automatically without manual page reloads.
