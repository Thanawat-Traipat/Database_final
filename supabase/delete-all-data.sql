-- DESTRUCTIVE DATA WIPE.
-- This keeps the simplified schema/functions but removes every row.
-- Run seed.sql afterwards if you want the demo records back.

create or replace function delete_all_yum_yum_buffet_data()
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
    app_users
  restart identity cascade;
end;
$$;

select delete_all_yum_yum_buffet_data();
