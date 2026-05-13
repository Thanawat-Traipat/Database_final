-- Repair an existing Supabase project so inventory rows, recipes, and iPad menu visibility match the current UX.
-- Use this when the deployed app still shows old demo data such as Smoked bacon or Snacks.

begin;

-- category_id 6 used to be a separate Drinks bucket, but the current iPad groups rice and drinks together.
update menu_categories
set name = 'Sides and Drinks Legacy'
where category_id = 6
  and name = 'Sides and Drinks';

insert into menu_categories (category_id, name) values
  (1, 'Pork'),
  (2, 'Beef'),
  (3, 'Seafood'),
  (4, 'Vegetables'),
  (5, 'Sides and Drinks')
on conflict (category_id) do update set name = excluded.name;

update menu_items
set category_id = 5
where category_id = 6;

delete from menu_categories
where category_id = 6;

-- Current ingredient list: every active ingredient below is tied to at least one menu through recipes.
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
  (10, 'Cola syrup', 'ml', 0, 900, 0.07, now() - interval '1 day')
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
  (10, 5, 'Cola', 'Refill drink glass', '/menu/cola.svg', false, now() - interval '1 day')
on conflict (menu_id) do update set
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  -- Preserve bucket photos already pasted into Supabase; only use the SVG fallback if image_url is empty.
  image_url = coalesce(nullif(menu_items.image_url, ''), excluded.image_url),
  is_available = excluded.is_available,
  deleted_at = excluded.deleted_at;

-- Rebuild demo recipe links so the inventory kiosk toggle knows which menu item to hide.
delete from recipes
where menu_id between 1 and 10;

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
  (10, 10, 70);

-- Keep historical usage rows aligned with the corrected recipe/ingredient names.
update inventory_transactions
set ingredient_id = 1, quantity_change = -360, unit_cost_snapshot = 0.22
where transaction_id = 1;

update inventory_transactions
set ingredient_id = 2, quantity_change = -480, unit_cost_snapshot = 0.18
where transaction_id = 3;

-- Reset visibility from stock: active menus with deleted/zero-stock ingredients are hidden from the iPad.
update menu_items m
set is_available = not exists (
  select 1
  from recipes r
  join inventory_items i on i.ingredient_id = r.ingredient_id
  where r.menu_id = m.menu_id
    and (i.deleted_at is not null or i.quantity_on_hand <= 0)
)
where m.menu_id between 1 and 10
  and m.deleted_at is null;

update menu_items
set is_available = false
where deleted_at is not null;

select setval(pg_get_serial_sequence('menu_categories', 'category_id'), 5, true);
select setval(pg_get_serial_sequence('inventory_items', 'ingredient_id'), 10, true);
select setval(pg_get_serial_sequence('menu_items', 'menu_id'), 10, true);

commit;

-- Verification: this should show no old bacon/snacks links and every ingredient should have a menu link.
select
  i.ingredient_id,
  i.name as ingredient,
  string_agg(m.name, ', ' order by m.menu_id) as linked_menu_items
from inventory_items i
left join recipes r on r.ingredient_id = i.ingredient_id
left join menu_items m on m.menu_id = r.menu_id
where i.deleted_at is null
group by i.ingredient_id, i.name
order by i.ingredient_id;
