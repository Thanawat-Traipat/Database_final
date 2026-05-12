-- Realistic sample data for The Nocturnal Epicurean schema.
-- Run this after supabase/schema.sql.

-- Staff rows include the roles requested by the feedback: cashier, kitchen, waiter, manager.
insert into app_users (user_id, full_name, username, password_hash, role, is_active)
values
  ('00000000-0000-0000-0000-000000000001', 'Narin Cashier', 'cashier', 'demo-hash-cashier123', 'cashier', true),
  ('00000000-0000-0000-0000-000000000002', 'Ploy Kitchen', 'kitchen', 'demo-hash-kitchen123', 'kitchen', true),
  ('00000000-0000-0000-0000-000000000003', 'Mek Waiter', 'waiter', 'demo-hash-waiter123', 'waiter', true),
  ('00000000-0000-0000-0000-000000000004', 'Eddy Manager', 'manager', 'demo-hash-manager123', 'manager', true)
on conflict (user_id) do nothing;

-- Staff shifts prove that every staff login has a clock-in record for hour calculation.
insert into staff_shifts (shift_id, user_id, role_snapshot, station, clock_in_at, clock_out_at, login_at, logout_at, note)
values
  (1, '00000000-0000-0000-0000-000000000001', 'cashier', 'Front POS', now() - interval '300 minutes', now() - interval '150 minutes', now() - interval '300 minutes', now() - interval '150 minutes', 'Lunch cashier shift'),
  (2, '00000000-0000-0000-0000-000000000002', 'kitchen', 'Kitchen pass', now() - interval '75 minutes', null, now() - interval '75 minutes', null, 'Dinner kitchen shift'),
  (3, '00000000-0000-0000-0000-000000000003', 'waiter', 'Dining room', now() - interval '285 minutes', now() - interval '130 minutes', now() - interval '285 minutes', now() - interval '130 minutes', 'Lunch service shift'),
  (4, '00000000-0000-0000-0000-000000000004', 'manager', 'Management office', now() - interval '90 minutes', null, now() - interval '90 minutes', null, 'Manager review shift')
on conflict (shift_id) do nothing;

-- Tables represent the 15-table front-of-house grid shown in the cashier UI.
insert into restaurant_tables (table_id, table_code, zone, capacity, status, cleaning_started_at)
values
  (1, '01', 'Main', 4, 'available', null),
  (2, '02', 'Main', 4, 'occupied', null),
  (3, '03', 'Main', 4, 'cleaning', now() - interval '4 minutes'),
  (4, '04', 'Main', 4, 'available', null),
  (5, '05', 'Main', 4, 'billing', null),
  (6, '06', 'Main', 4, 'occupied', null),
  (7, '07', 'Main', 4, 'available', null),
  (8, '08', 'Main', 4, 'available', null),
  (9, '09', 'Main', 4, 'occupied', null),
  (10, '10', 'Main', 4, 'available', null),
  (11, '11', 'Main', 4, 'occupied', null),
  (12, '12', 'Main', 4, 'available', null),
  (13, '13', 'Main', 4, 'occupied', null),
  (14, '14', 'Main', 4, 'available', null),
  (15, '15', 'Main', 4, 'billing', null)
on conflict (table_id) do nothing;

-- Menu categories keep the customer page grouped.
insert into menu_categories (category_id, name)
values
  (1, 'Pork'),
  (2, 'Beef'),
  (3, 'Seafood'),
  (4, 'Vegetables'),
  (5, 'Snacks'),
  (6, 'Drinks')
on conflict (category_id) do nothing;

-- Menu items use real buffet-style foods, image paths, kitchen stations, and prep targets.
insert into menu_items (menu_id, category_id, name, description, image_url, kitchen_station, prep_time_minutes, price, is_available, deleted_at)
values
  (1, 1, 'Marinated Pork Belly', 'Soy-garlic pork belly tray', '/menu/pork-belly.svg', 'hotpot', 6, 0, true, null),
  (2, 1, 'Premium Pork Shoulder', '120 g shabu pork shoulder tray', '/menu/pork-shoulder.svg', 'hotpot', 5, 0, true, null),
  (3, 2, 'Black Pepper Beef', 'Pepper-crusted premium beef tray', '/menu/black-pepper-beef.svg', 'premium', 8, 79, true, null),
  (4, 3, 'Fresh Squid', 'Cleaned squid portion', '/menu/squid.svg', 'seafood', 7, 0, true, null),
  (5, 3, 'White shrimp', 'Six shrimp per plate', '/menu/shrimp.svg', 'seafood', 7, 39, true, null),
  (6, 4, 'Napa cabbage', 'Fresh vegetable basket', '/menu/napa-cabbage.svg', 'pantry', 3, 0, true, null),
  (7, 4, 'Enoki mushroom', 'Mushroom portion', '/menu/enoki.svg', 'pantry', 3, 0, true, null),
  (8, 5, 'Kimchi fried rice', 'Small rice bowl', '/menu/kimchi-rice.svg', 'cooked', 9, 29, true, null),
  (9, 6, 'Thai iced tea', 'Refill drink glass', '/menu/thai-tea.svg', 'drink', 2, 35, true, null),
  (10, 6, 'Cola', 'Refill drink glass', '/menu/cola.svg', 'drink', 2, 29, false, now() - interval '1 day')
on conflict (menu_id) do nothing;

-- Inventory rows store quantity and unit cost needed by the dashboard.
insert into inventory_items (ingredient_id, name, unit, quantity_on_hand, reorder_level, unit_cost, deleted_at)
values
  (1, 'Pork shoulder', 'g', 9200, 2500, 0.18, null),
  (2, 'Smoked bacon', 'g', 3200, 1200, 0.24, null),
  (3, 'Ribeye beef', 'g', 1800, 1500, 0.62, null),
  (4, 'Squid', 'g', 2600, 1300, 0.31, null),
  (5, 'White shrimp', 'pcs', 48, 60, 5.20, null),
  (6, 'Napa cabbage', 'g', 4200, 1800, 0.05, null),
  (7, 'Enoki mushroom', 'g', 1600, 900, 0.11, null),
  (8, 'Kimchi rice mix', 'g', 5400, 1200, 0.08, null),
  (9, 'Thai tea concentrate', 'ml', 2100, 800, 0.09, null),
  (10, 'Cola syrup', 'ml', 0, 900, 0.07, now() - interval '1 day')
on conflict (ingredient_id) do nothing;

-- Recipes connect each menu item to the inventory it consumes.
insert into recipes (recipe_id, menu_id, ingredient_id, quantity_used)
values
  (1, 1, 1, 120),
  (2, 2, 2, 90),
  (3, 3, 3, 100),
  (4, 4, 4, 120),
  (5, 5, 5, 6),
  (6, 6, 6, 150),
  (7, 7, 7, 100),
  (8, 8, 8, 180),
  (9, 9, 9, 80),
  (10, 10, 10, 70)
on conflict (recipe_id) do nothing;

-- Dining sessions capture adult/child counts and prices for revenue and cost-per-head reports.
insert into dining_sessions (
  session_id,
  table_id,
  cashier_id,
  waiter_id,
  adult_count,
  child_count,
  adult_price,
  child_price,
  opened_at,
  bill_requested_at,
  closed_at,
  status,
  payment_status,
  customer_code
)
values
  ('10000000-0000-0000-0000-000000001001', 2, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 3, 1, 399, 259, now() - interval '60 minutes', null, null, 'open', 'unpaid', 'T02-4821'),
  ('10000000-0000-0000-0000-000000001002', 5, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 2, 1, 399, 259, now() - interval '105 minutes', now() - interval '5 minutes', null, 'open', 'unpaid', 'T05-2190'),
  ('10000000-0000-0000-0000-000000001003', 6, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 2, 0, 399, 259, now() - interval '23 minutes', null, null, 'open', 'unpaid', 'T06-6883'),
  ('10000000-0000-0000-0000-000000001004', 9, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 4, 0, 399, 259, now() - interval '72 minutes', null, null, 'open', 'unpaid', 'T09-9142'),
  ('10000000-0000-0000-0000-000000001005', 11, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 2, 2, 399, 259, now() - interval '45 minutes', null, null, 'open', 'unpaid', 'T11-3907'),
  ('10000000-0000-0000-0000-000000001006', 13, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 4, 0, 399, 259, now() - interval '68 minutes', null, null, 'open', 'unpaid', 'T13-7440'),
  ('10000000-0000-0000-0000-000000001007', 15, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 4, 0, 399, 259, now() - interval '94 minutes', now() - interval '3 minutes', null, 'open', 'unpaid', 'T15-8019'),
  ('10000000-0000-0000-0000-000000001008', 4, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 2, 0, 399, 259, now() - interval '260 minutes', now() - interval '160 minutes', now() - interval '155 minutes', 'closed', 'paid', 'T04-1220'),
  ('10000000-0000-0000-0000-000000001009', 12, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 2, 2, 399, 259, now() - interval '1380 minutes', now() - interval '1290 minutes', now() - interval '1285 minutes', 'closed', 'paid', 'T12-4301')
on conflict (session_id) do nothing;

-- Orders group customer submissions.
insert into orders (order_id, session_id, ordered_at, source, status, note)
values
  (1001, '10000000-0000-0000-0000-000000001001', now() - interval '36 minutes', 'customer', 'open', 'No spicy sauce'),
  (1002, '10000000-0000-0000-0000-000000001001', now() - interval '15 minutes', 'customer', 'open', ''),
  (1003, '10000000-0000-0000-0000-000000001002', now() - interval '240 minutes', 'customer', 'completed', ''),
  (1004, '10000000-0000-0000-0000-000000001003', now() - interval '1360 minutes', 'customer', 'completed', ''),
  (1005, '10000000-0000-0000-0000-000000001003', now() - interval '1342 minutes', 'customer', 'completed', '')
on conflict (order_id) do nothing;

-- Order item timestamps are what make service-speed analytics possible.
insert into order_items (
  order_item_id,
  order_id,
  menu_id,
  quantity,
  status,
  special_instructions,
  priority_level,
  priority_reason,
  expedited_at,
  requested_at,
  cooking_at,
  ready_at,
  out_for_serving_at,
  served_at,
  cancelled_at
)
values
  (1001, 1001, 1, 2, 'cooking', 'Thin slice, no spicy sauce', 'normal', '', null, now() - interval '36 minutes', now() - interval '31 minutes', null, null, null, null),
  (1002, 1001, 6, 1, 'ready', 'Extra fresh basket', 'normal', '', null, now() - interval '36 minutes', now() - interval '32 minutes', now() - interval '27 minutes', null, null, null),
  (1003, 1002, 3, 1, 'pending', 'Chef priority for premium add-on', 'rush', 'RUSH ORDER - CHEF PRIORITY', now() - interval '8 minutes', now() - interval '24 minutes', null, null, null, null, null),
  (1004, 1002, 5, 2, 'pending', 'Serve chilled', 'normal', '', null, now() - interval '15 minutes', null, null, null, null, null),
  (1005, 1003, 1, 3, 'served', '', 'normal', '', null, now() - interval '240 minutes', now() - interval '235 minutes', now() - interval '230 minutes', now() - interval '228 minutes', now() - interval '226 minutes', null),
  (1006, 1003, 8, 2, 'served', 'Less spicy', 'normal', '', null, now() - interval '240 minutes', now() - interval '234 minutes', now() - interval '229 minutes', now() - interval '227 minutes', now() - interval '225 minutes', null),
  (1007, 1004, 2, 4, 'served', '', 'normal', '', null, now() - interval '1360 minutes', now() - interval '1354 minutes', now() - interval '1348 minutes', now() - interval '1347 minutes', now() - interval '1345 minutes', null),
  (1008, 1004, 4, 2, 'served', '', 'normal', '', null, now() - interval '1360 minutes', now() - interval '1355 minutes', now() - interval '1349 minutes', now() - interval '1348 minutes', now() - interval '1346 minutes', null),
  (1009, 1005, 5, 3, 'served', 'Extra sauce', 'normal', '', null, now() - interval '1342 minutes', now() - interval '1338 minutes', now() - interval '1332 minutes', now() - interval '1330 minutes', now() - interval '1328 minutes', null),
  (1010, 1005, 9, 4, 'served', '', 'normal', '', null, now() - interval '1342 minutes', now() - interval '1339 minutes', now() - interval '1335 minutes', now() - interval '1333 minutes', now() - interval '1331 minutes', null)
on conflict (order_item_id) do nothing;

-- Payment rows support daily revenue.
insert into payments (payment_id, session_id, cashier_id, method, paid_amount, paid_at, status)
values
  (1, '10000000-0000-0000-0000-000000001008', '00000000-0000-0000-0000-000000000001', 'cash', 798, now() - interval '155 minutes', 'paid'),
  (2, '10000000-0000-0000-0000-000000001009', '00000000-0000-0000-0000-000000000001', 'cash', 2114, now() - interval '1285 minutes', 'paid')
on conflict (payment_id) do nothing;

-- Staff activity logs are the audit trail behind the manager dashboard.
insert into staff_activity_logs (activity_id, user_id, shift_id, action, entity_type, entity_id, occurred_at, note)
values
  (1, '00000000-0000-0000-0000-000000000001', 1, 'open_table', 'dining_session', '10000000-0000-0000-0000-000000001008', now() - interval '260 minutes', 'Opened table 04'),
  (2, '00000000-0000-0000-0000-000000000001', 1, 'checkout_paid', 'payment', '1', now() - interval '155 minutes', 'Closed table 04 cash payment'),
  (3, '00000000-0000-0000-0000-000000000003', 3, 'serve_item', 'order_item', '1005', now() - interval '226 minutes', 'Served Marinated Pork Belly'),
  (4, '00000000-0000-0000-0000-000000000002', 2, 'start_preparing', 'order_item', '1001', now() - interval '31 minutes', 'Started kitchen preparation'),
  (5, '00000000-0000-0000-0000-000000000002', 2, 'expedite_order', 'order_item', '1003', now() - interval '8 minutes', 'Marked rush chef priority')
on conflict (activity_id) do nothing;

-- Usage transactions support ingredient usage and cost-per-head dashboard queries.
insert into inventory_transactions (
  transaction_id,
  ingredient_id,
  order_item_id,
  staff_id,
  transaction_type,
  quantity_change,
  unit_cost_snapshot,
  occurred_at,
  note
)
values
  (1, 1, 1005, '00000000-0000-0000-0000-000000000003', 'usage', -360, 0.18, now() - interval '226 minutes', 'Served Marinated Pork Belly'),
  (2, 8, 1006, '00000000-0000-0000-0000-000000000003', 'usage', -360, 0.08, now() - interval '225 minutes', 'Served kimchi fried rice'),
  (3, 2, 1007, '00000000-0000-0000-0000-000000000003', 'usage', -360, 0.24, now() - interval '1345 minutes', 'Served smoked bacon roll'),
  (4, 4, 1008, '00000000-0000-0000-0000-000000000003', 'usage', -240, 0.31, now() - interval '1346 minutes', 'Served fresh squid'),
  (5, 5, 1009, '00000000-0000-0000-0000-000000000003', 'usage', -18, 5.20, now() - interval '1328 minutes', 'Served white shrimp'),
  (6, 9, 1010, '00000000-0000-0000-0000-000000000003', 'usage', -320, 0.09, now() - interval '1331 minutes', 'Served Thai iced tea')
on conflict (transaction_id) do nothing;

-- Keep identity counters above the explicit sample IDs.
select setval(pg_get_serial_sequence('restaurant_tables', 'table_id'), 15, true);
select setval(pg_get_serial_sequence('menu_categories', 'category_id'), 6, true);
select setval(pg_get_serial_sequence('menu_items', 'menu_id'), 10, true);
select setval(pg_get_serial_sequence('inventory_items', 'ingredient_id'), 10, true);
select setval(pg_get_serial_sequence('recipes', 'recipe_id'), 10, true);
select setval(pg_get_serial_sequence('orders', 'order_id'), 1005, true);
select setval(pg_get_serial_sequence('order_items', 'order_item_id'), 1010, true);
select setval(pg_get_serial_sequence('payments', 'payment_id'), 2, true);
select setval(pg_get_serial_sequence('staff_shifts', 'shift_id'), 4, true);
select setval(pg_get_serial_sequence('staff_activity_logs', 'activity_id'), 5, true);
select setval(pg_get_serial_sequence('inventory_transactions', 'transaction_id'), 6, true);
