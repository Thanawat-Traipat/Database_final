-- Public demo access for the class-project web app.
-- Run this once in Supabase SQL Editor if the browser app shows an RLS insert/update error.
-- The project uses its own app_users table for staff login instead of Supabase Auth,
-- so the public anon key needs permission to read and write the demo tables.

alter table if exists app_users disable row level security;
alter table if exists staff_shifts disable row level security;
alter table if exists restaurant_tables disable row level security;
alter table if exists menu_categories disable row level security;
alter table if exists inventory_items disable row level security;
alter table if exists menu_items disable row level security;
alter table if exists recipes disable row level security;
alter table if exists dining_sessions disable row level security;
alter table if exists orders disable row level security;
alter table if exists order_items disable row level security;
alter table if exists payments disable row level security;
alter table if exists staff_activity_logs disable row level security;
alter table if exists inventory_transactions disable row level security;

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on table app_users to anon, authenticated;
grant select, insert, update, delete on table staff_shifts to anon, authenticated;
grant select, insert, update, delete on table restaurant_tables to anon, authenticated;
grant select, insert, update, delete on table menu_categories to anon, authenticated;
grant select, insert, update, delete on table inventory_items to anon, authenticated;
grant select, insert, update, delete on table menu_items to anon, authenticated;
grant select, insert, update, delete on table recipes to anon, authenticated;
grant select, insert, update, delete on table dining_sessions to anon, authenticated;
grant select, insert, update, delete on table orders to anon, authenticated;
grant select, insert, update, delete on table order_items to anon, authenticated;
grant select, insert, update, delete on table payments to anon, authenticated;
grant select, insert, update, delete on table staff_activity_logs to anon, authenticated;
grant select, insert, update, delete on table inventory_transactions to anon, authenticated;

grant usage, select, update on all sequences in schema public to anon, authenticated;
