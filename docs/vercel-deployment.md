# Vercel Deployment Guide

This project is a Supabase-only Next.js app. Do the Supabase setup before deploying.

## 1. Prepare Supabase

1. Create a Supabase project.
2. Open SQL Editor.
3. Run `supabase/reset-new-ux.sql`.
4. Confirm these demo staff users exist in `app_users`:
   - `cashier` / `cashier123`
   - `kitchen` / `kitchen123`
   - `waiter` / `waiter123`
   - `manager` / `manager123`
5. Keep Row Level Security off for the class demo, or add policies that allow the anon key to read and write the project tables.

## 2. Get The Supabase URL And Anon Key

In Supabase:

1. Open your project.
2. Go to Project Settings > API.
3. Copy Project URL. This becomes `NEXT_PUBLIC_SUPABASE_URL`.
4. Copy anon public key. This becomes `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Do not copy the service_role key into the frontend or Vercel public variables.

## 3. Test Locally

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

Then run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. If Supabase is connected, the staff login page appears. If environment variables are missing, the app shows a database-required message.

The repository includes `.env.local.example` as the template. You can copy it:

```bash
cp .env.local.example .env.local
```

Then replace the placeholder values with the real Supabase values.

## 4. Deploy To Vercel

1. Push the project to GitHub.
2. Open Vercel and choose Add New Project.
3. Import the GitHub repository.
4. Framework Preset should be Next.js.
5. Add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Make sure the variables are enabled for Production, Preview, and Development.
7. Leave Install Command as `npm ci` and Build Command as `npm run build`; `vercel.json` already sets these.
8. Click Deploy.

## 5. After Deploy

1. Open the Vercel URL.
2. Login as `cashier`.
3. Open a table or change table state.
4. In Supabase Table Editor, confirm rows changed in `dining_sessions`, `restaurant_tables`, `order_items`, or `staff_activity_logs`.
5. Login as `kitchen`, `waiter`, and `manager` to test the remaining workflow pages.

## Troubleshooting

- If the deployed app shows the database-required screen, the two `NEXT_PUBLIC_SUPABASE_*` variables are missing or were added only to the wrong environment.
- If data loads locally but not on Vercel, redeploy after saving environment variables.
- If writes fail with permission errors, keep Row Level Security off for the demo or add anon-key policies for `select`, `insert`, `update`, and `delete` on the project tables.
