-- DESTRUCTIVE DATA WIPE FOR THE NOCTURNAL EPICUREAN DEMO.
-- Paste this file into Supabase SQL Editor only when you want to remove every row.
-- It keeps the schema, enum types, indexes, comments, and workflow functions.
-- After this runs, the app has no login users until you run supabase/seed.sql
-- or supabase/reset-new-ux.sql again.

create or replace function delete_all_nocturnal_epicurean_data()
returns void
language plpgsql
as $$
begin
  truncate table
    inventory_transactions,
    staff_activity_logs,
    payments,
    order_items,
    orders,
    dining_sessions,
    recipes,
    menu_items,
    inventory_items,
    menu_categories,
    restaurant_tables,
    staff_shifts,
    app_users
  restart identity cascade;
end;
$$;

select delete_all_nocturnal_epicurean_data();
