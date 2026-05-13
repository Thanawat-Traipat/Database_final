-- Realistic demo seed for the simplified Yum Yum Buffet schema.
-- Run schema.sql before this file so all tables, enums, and functions exist.

insert into app_users (user_id, full_name, username, password_hash, role, is_active, deleted_at) values
  ('00000000-0000-0000-0000-000000000001', 'Narin Cashier', 'cashier', 'demo-hash-cashier123', 'cashier', true, null),
  ('00000000-0000-0000-0000-000000000002', 'Ploy Kitchen', 'kitchen', 'demo-hash-kitchen123', 'kitchen', true, null),
  ('00000000-0000-0000-0000-000000000003', 'Mek Waiter', 'waiter', 'demo-hash-waiter123', 'waiter', true, null),
  ('00000000-0000-0000-0000-000000000004', 'Eddy Manager', 'manager', 'demo-hash-manager123', 'manager', true, null)
on conflict (user_id) do update set
  full_name = excluded.full_name,
  username = excluded.username,
  password_hash = excluded.password_hash,
  role = excluded.role,
  is_active = excluded.is_active,
  deleted_at = excluded.deleted_at;

insert into restaurant_tables (table_code, capacity, status, cleaning_started_at) values
  ('01', 4, 'available', null),
  ('02', 4, 'occupied', null),
  ('03', 4, 'cleaning', now() - interval '4 minutes'),
  ('04', 4, 'available', null),
  ('05', 4, 'billing', null),
  ('06', 4, 'occupied', null),
  ('07', 4, 'available', null),
  ('08', 4, 'available', null),
  ('09', 4, 'occupied', null),
  ('10', 4, 'available', null),
  ('11', 4, 'occupied', null),
  ('12', 4, 'available', null),
  ('13', 4, 'occupied', null),
  ('14', 4, 'available', null),
  ('15', 4, 'billing', null)
on conflict (table_code) do update set
  capacity = excluded.capacity,
  status = excluded.status,
  cleaning_started_at = excluded.cleaning_started_at;

-- Keep the last customer-facing group as one real category because menu_categories.name is unique.
update menu_items set category_id = 5 where category_id = 6;
delete from menu_categories where category_id = 6;

insert into menu_categories (category_id, name) values
  (1, 'Pork'),
  (2, 'Beef'),
  (3, 'Seafood'),
  (4, 'Vegetables'),
  (5, 'Sides and Drinks')
on conflict (category_id) do update set name = excluded.name;

insert into inventory_items (ingredient_id, name, unit, quantity_on_hand, reorder_level, unit_cost, deleted_at) values
  (1, 'Pork belly slices', 'g', 7600, 2200, 0.22, null),
  (2, 'Pork shoulder slices', 'g', 9200, 2500, 0.18, null),
  (3, 'Black pepper beef', 'g', 1800, 1500, 0.62, null),
  (4, 'Fresh squid', 'g', 2600, 1300, 0.31, null),
  (5, 'White shrimp', 'pcs', 48, 60, 5.20, null),
  (6, 'Napa cabbage', 'g', 4200, 1800, 0.05, null),
  (7, 'Enoki mushroom', 'g', 1600, 900, 0.11, null),
  (8, 'Kimchi fried rice mix', 'g', 5400, 1200, 0.08, null),
  (9, 'Thai tea concentrate', 'ml', 2100, 800, 0.09, null),
  (10, 'Cola syrup', 'ml', 0, 900, 0.07, null)
on conflict (ingredient_id) do update set
  name = excluded.name,
  unit = excluded.unit,
  quantity_on_hand = excluded.quantity_on_hand,
  reorder_level = excluded.reorder_level,
  unit_cost = excluded.unit_cost,
  deleted_at = excluded.deleted_at;

insert into menu_items (menu_id, category_id, name, description, image_url, is_available, deleted_at) values
  (1, 1, 'Marinated Pork Belly', 'Soy-garlic pork belly tray', '/menu/pork-belly.svg', true, null),
  (2, 1, 'Premium Pork Shoulder', '120 g shabu pork shoulder tray', '/menu/pork-shoulder.svg', true, null),
  (3, 2, 'Black Pepper Beef', 'Pepper-crusted premium beef tray', '/menu/black-pepper-beef.svg', true, null),
  (4, 3, 'Fresh Squid', 'Cleaned squid portion', '/menu/squid.svg', true, null),
  (5, 3, 'White shrimp', 'Six shrimp per plate', '/menu/shrimp.svg', true, null),
  (6, 4, 'Napa cabbage', 'Fresh vegetable basket', '/menu/napa-cabbage.svg', true, null),
  (7, 4, 'Enoki mushroom', 'Mushroom portion', '/menu/enoki.svg', true, null),
  (8, 5, 'Kimchi fried rice', 'Small rice bowl', '/menu/kimchi-rice.svg', true, null),
  (9, 5, 'Thai iced tea', 'Refill drink glass', '/menu/thai-tea.svg', true, null),
  (10, 5, 'Cola', 'Refill drink glass', '/menu/cola.svg', false, null)
on conflict (menu_id) do update set
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  image_url = excluded.image_url,
  is_available = excluded.is_available,
  deleted_at = excluded.deleted_at;

insert into recipes (menu_id, ingredient_id, quantity_used) values
  (1, 1, 120),
  (2, 2, 120),
  (3, 3, 100),
  (4, 4, 120),
  (5, 5, 6),
  (6, 6, 150),
  (7, 7, 100),
  (8, 8, 180),
  (9, 9, 80),
  (10, 10, 70)
on conflict (menu_id, ingredient_id) do update set quantity_used = excluded.quantity_used;

insert into dining_sessions (
  session_id,
  table_code,
  cashier_id,
  adult_count,
  child_count,
  adult_price_snapshot,
  child_price_snapshot,
  opened_at,
  bill_requested_at,
  closed_at,
  status,
  payment_status
) values
  ('10000000-0000-0000-0000-000000001001', '02', '00000000-0000-0000-0000-000000000001', 3, 1, 399, 259, now() - interval '60 minutes', null, null, 'open', 'unpaid'),
  ('10000000-0000-0000-0000-000000001002', '05', '00000000-0000-0000-0000-000000000001', 2, 1, 399, 259, now() - interval '105 minutes', now() - interval '5 minutes', null, 'open', 'unpaid'),
  ('10000000-0000-0000-0000-000000001003', '06', '00000000-0000-0000-0000-000000000001', 2, 0, 399, 259, now() - interval '23 minutes', null, null, 'open', 'unpaid'),
  ('10000000-0000-0000-0000-000000001004', '09', '00000000-0000-0000-0000-000000000001', 4, 0, 399, 259, now() - interval '72 minutes', null, null, 'open', 'unpaid'),
  ('10000000-0000-0000-0000-000000001005', '11', '00000000-0000-0000-0000-000000000001', 2, 2, 399, 259, now() - interval '45 minutes', null, null, 'open', 'unpaid'),
  ('10000000-0000-0000-0000-000000001006', '13', '00000000-0000-0000-0000-000000000001', 4, 0, 399, 259, now() - interval '68 minutes', null, null, 'open', 'unpaid'),
  ('10000000-0000-0000-0000-000000001007', '15', '00000000-0000-0000-0000-000000000001', 4, 0, 399, 259, now() - interval '94 minutes', now() - interval '3 minutes', null, 'open', 'unpaid'),
  ('10000000-0000-0000-0000-000000001008', '04', '00000000-0000-0000-0000-000000000001', 2, 0, 399, 259, now() - interval '260 minutes', now() - interval '160 minutes', now() - interval '155 minutes', 'closed', 'paid'),
  ('10000000-0000-0000-0000-000000001009', '12', '00000000-0000-0000-0000-000000000001', 2, 2, 399, 259, now() - interval '1380 minutes', now() - interval '1290 minutes', now() - interval '1285 minutes', 'closed', 'paid')
on conflict (session_id) do update set
  table_code = excluded.table_code,
  cashier_id = excluded.cashier_id,
  adult_count = excluded.adult_count,
  child_count = excluded.child_count,
  adult_price_snapshot = excluded.adult_price_snapshot,
  child_price_snapshot = excluded.child_price_snapshot,
  opened_at = excluded.opened_at,
  bill_requested_at = excluded.bill_requested_at,
  closed_at = excluded.closed_at,
  status = excluded.status,
  payment_status = excluded.payment_status;

insert into orders (order_id, session_id, ordered_at, status) values
  (1001, '10000000-0000-0000-0000-000000001001', now() - interval '36 minutes', 'open'),
  (1002, '10000000-0000-0000-0000-000000001001', now() - interval '15 minutes', 'open'),
  (1003, '10000000-0000-0000-0000-000000001002', now() - interval '240 minutes', 'completed'),
  (1004, '10000000-0000-0000-0000-000000001003', now() - interval '1360 minutes', 'completed'),
  (1005, '10000000-0000-0000-0000-000000001003', now() - interval '1342 minutes', 'completed')
on conflict (order_id) do update set
  session_id = excluded.session_id,
  ordered_at = excluded.ordered_at,
  status = excluded.status;

insert into order_items (
  order_item_id,
  order_id,
  menu_id,
  quantity,
  status,
  special_instructions,
  priority_level,
  expedited_at,
  requested_at,
  cooking_at,
  ready_at,
  out_for_serving_at,
  served_at,
  cancelled_at
) values
  (1001, 1001, 1, 2, 'cooking', 'Thin slice, no spicy sauce', 'normal', null, now() - interval '36 minutes', now() - interval '31 minutes', null, null, null, null),
  (1002, 1001, 6, 1, 'ready', 'Extra fresh basket', 'rush', now() - interval '20 minutes', now() - interval '36 minutes', now() - interval '32 minutes', now() - interval '27 minutes', null, null, null),
  (1003, 1002, 3, 1, 'pending', 'Chef priority for premium add-on', 'rush', now() - interval '8 minutes', now() - interval '24 minutes', null, null, null, null, null),
  (1004, 1002, 5, 2, 'pending', 'Serve chilled', 'normal', null, now() - interval '15 minutes', null, null, null, null, null),
  (1005, 1003, 1, 3, 'served', '', 'normal', null, now() - interval '240 minutes', now() - interval '235 minutes', now() - interval '230 minutes', now() - interval '228 minutes', now() - interval '226 minutes', null),
  (1006, 1003, 8, 2, 'served', 'Less spicy', 'normal', null, now() - interval '240 minutes', now() - interval '234 minutes', now() - interval '229 minutes', now() - interval '227 minutes', now() - interval '225 minutes', null),
  (1007, 1004, 2, 4, 'served', '', 'normal', null, now() - interval '1360 minutes', now() - interval '1354 minutes', now() - interval '1348 minutes', now() - interval '1347 minutes', now() - interval '1345 minutes', null),
  (1008, 1004, 4, 2, 'served', '', 'normal', null, now() - interval '1360 minutes', now() - interval '1355 minutes', now() - interval '1349 minutes', now() - interval '1348 minutes', now() - interval '1346 minutes', null),
  (1009, 1005, 5, 3, 'served', 'Extra sauce', 'normal', null, now() - interval '1342 minutes', now() - interval '1338 minutes', now() - interval '1332 minutes', now() - interval '1330 minutes', now() - interval '1328 minutes', null),
  (1010, 1005, 9, 4, 'served', '', 'normal', null, now() - interval '1342 minutes', now() - interval '1339 minutes', now() - interval '1335 minutes', now() - interval '1333 minutes', now() - interval '1331 minutes', null)
on conflict (order_item_id) do update set
  order_id = excluded.order_id,
  menu_id = excluded.menu_id,
  quantity = excluded.quantity,
  status = excluded.status,
  special_instructions = excluded.special_instructions,
  priority_level = excluded.priority_level,
  expedited_at = excluded.expedited_at,
  requested_at = excluded.requested_at,
  cooking_at = excluded.cooking_at,
  ready_at = excluded.ready_at,
  out_for_serving_at = excluded.out_for_serving_at,
  served_at = excluded.served_at,
  cancelled_at = excluded.cancelled_at;

insert into payments (payment_id, session_id, cashier_id, method, paid_amount, paid_at, status) values
  (1, '10000000-0000-0000-0000-000000001008', '00000000-0000-0000-0000-000000000001', 'cash', 798, now() - interval '155 minutes', 'paid'),
  (2, '10000000-0000-0000-0000-000000001009', '00000000-0000-0000-0000-000000000001', 'cash', 2114, now() - interval '1285 minutes', 'paid')
on conflict (payment_id) do update set
  session_id = excluded.session_id,
  cashier_id = excluded.cashier_id,
  method = excluded.method,
  paid_amount = excluded.paid_amount,
  paid_at = excluded.paid_at,
  status = excluded.status;

insert into staff_activity_logs (activity_id, user_id, action, entity_type, entity_id, occurred_at) values
  (1, '00000000-0000-0000-0000-000000000001', 'open_table', 'dining_session', '10000000-0000-0000-0000-000000001008', now() - interval '260 minutes'),
  (2, '00000000-0000-0000-0000-000000000001', 'checkout_paid', 'payment', '1', now() - interval '155 minutes'),
  (3, '00000000-0000-0000-0000-000000000003', 'serve_item', 'order_item', '1005', now() - interval '226 minutes'),
  (4, '00000000-0000-0000-0000-000000000002', 'start_preparing', 'order_item', '1001', now() - interval '31 minutes'),
  (5, '00000000-0000-0000-0000-000000000002', 'expedite_order', 'order_item', '1003', now() - interval '8 minutes')
on conflict (activity_id) do update set
  user_id = excluded.user_id,
  action = excluded.action,
  entity_type = excluded.entity_type,
  entity_id = excluded.entity_id,
  occurred_at = excluded.occurred_at;

insert into inventory_transactions (transaction_id, ingredient_id, order_item_id, transaction_type, quantity_change, unit_cost_snapshot, occurred_at) values
  (1, 1, 1005, 'usage', -360, 0.22, now() - interval '226 minutes'),
  (2, 8, 1006, 'usage', -360, 0.08, now() - interval '225 minutes'),
  (3, 2, 1007, 'usage', -480, 0.18, now() - interval '1345 minutes'),
  (4, 4, 1008, 'usage', -240, 0.31, now() - interval '1346 minutes'),
  (5, 5, 1009, 'usage', -18, 5.20, now() - interval '1328 minutes'),
  (6, 9, 1010, 'usage', -320, 0.09, now() - interval '1331 minutes')
on conflict (transaction_id) do update set
  ingredient_id = excluded.ingredient_id,
  order_item_id = excluded.order_item_id,
  transaction_type = excluded.transaction_type,
  quantity_change = excluded.quantity_change,
  unit_cost_snapshot = excluded.unit_cost_snapshot,
  occurred_at = excluded.occurred_at;

select setval(pg_get_serial_sequence('menu_categories', 'category_id'), 5, true);
select setval(pg_get_serial_sequence('inventory_items', 'ingredient_id'), 10, true);
select setval(pg_get_serial_sequence('menu_items', 'menu_id'), 10, true);
select setval(pg_get_serial_sequence('orders', 'order_id'), 1005, true);
select setval(pg_get_serial_sequence('order_items', 'order_item_id'), 1010, true);
select setval(pg_get_serial_sequence('payments', 'payment_id'), 2, true);
select setval(pg_get_serial_sequence('staff_activity_logs', 'activity_id'), 5, true);
select setval(pg_get_serial_sequence('inventory_transactions', 'transaction_id'), 6, true);
