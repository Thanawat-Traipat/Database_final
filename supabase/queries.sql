-- Assignment query bank for the simplified Yum Yum Buffet schema.
-- These queries map directly to the five required interface/data operations.

-- 1) INSERT example: manager adds a new menu item.
insert into menu_items (category_id, name, description, image_url, is_available)
values (1, 'Garlic Pork Collar', 'Garlic-marinated pork collar tray', '/menu/pork-collar.svg', true)
returning menu_id, name;

-- 2) UPDATE example: cashier marks a table as waiting for cash bill.
update dining_sessions
set bill_requested_at = now()
where session_id = '10000000-0000-0000-0000-000000001001'
returning session_id, table_code, bill_requested_at;

update restaurant_tables
set status = 'billing', cleaning_started_at = null
where table_code = '02'
returning table_code, status;

-- 3) SOFT DELETE example: manager removes a menu row without deleting history.
update menu_items
set deleted_at = now(), is_available = false
where menu_id = 10
returning menu_id, name, deleted_at;

-- 4) BASIC QUERY: full detail for one active table/session.
select
  ds.session_id,
  ds.table_code,
  rt.capacity,
  ds.adult_count,
  ds.child_count,
  ds.adult_price_snapshot,
  ds.child_price_snapshot,
  ds.opened_at,
  ds.bill_requested_at,
  ds.status as session_status,
  ds.payment_status,
  o.order_id,
  o.ordered_at,
  oi.order_item_id,
  oi.status as item_status,
  oi.quantity,
  oi.requested_at,
  oi.ready_at,
  oi.served_at,
  mi.name as menu_name,
  mc.name as category_name,
  mi.image_url
from dining_sessions ds
join restaurant_tables rt on rt.table_code = ds.table_code
left join orders o on o.session_id = ds.session_id
left join order_items oi on oi.order_id = o.order_id
left join menu_items mi on mi.menu_id = oi.menu_id
left join menu_categories mc on mc.category_id = mi.category_id
where ds.table_code = '02'
  and ds.status = 'open'
order by o.ordered_at desc, oi.order_item_id;

-- 5) KITCHEN / WAITER QUEUE: color status comes from status and elapsed time.
select
  rt.table_code,
  o.order_id,
  oi.order_item_id,
  oi.status,
  oi.priority_level,
  extract(epoch from (now() - oi.requested_at)) / 60 as elapsed_minutes,
  case
    when oi.priority_level = 'rush' or now() - oi.requested_at > interval '15 minutes' then 'expedite'
    when oi.status = 'cooking' then 'preparing'
    when oi.status in ('ready', 'out_for_serving') then 'ready_for_waiter'
    else 'new'
  end as display_state,
  mi.name,
  mi.description,
  oi.quantity,
  oi.special_instructions
from order_items oi
join orders o on o.order_id = oi.order_id
join dining_sessions ds on ds.session_id = o.session_id
join restaurant_tables rt on rt.table_code = ds.table_code
join menu_items mi on mi.menu_id = oi.menu_id
where oi.status in ('pending', 'cooking', 'ready', 'out_for_serving')
order by oi.priority_level desc, oi.requested_at;

-- 6) ADVANCED QUERY: operational dashboard KPI summary.
with range_sessions as (
  select *
  from dining_sessions
  where opened_at >= date_trunc('day', now())
),
session_kpi as (
  select
    coalesce(sum(adult_count + child_count), 0) as guests_today,
    round(avg(extract(epoch from (coalesce(closed_at, now()) - opened_at)) / 60)) as avg_dining_minutes
  from range_sessions
),
payment_kpi as (
  select coalesce(sum(paid_amount), 0) as paid_revenue_today
  from payments
  where paid_at >= date_trunc('day', now())
),
usage_kpi as (
  select coalesce(sum(abs(quantity_change) * unit_cost_snapshot), 0) as ingredient_cost_today
  from inventory_transactions
  where transaction_type = 'usage'
    and occurred_at >= date_trunc('day', now())
),
serving_kpi as (
  select round(avg(extract(epoch from (served_at - requested_at)) / 60)) as avg_serving_minutes
  from order_items
  where status = 'served'
    and served_at >= date_trunc('day', now())
)
select
  session_kpi.guests_today,
  payment_kpi.paid_revenue_today,
  usage_kpi.ingredient_cost_today,
  session_kpi.avg_dining_minutes,
  serving_kpi.avg_serving_minutes
from session_kpi
cross join payment_kpi
cross join usage_kpi
cross join serving_kpi;

-- 7) ADVANCED QUERY: hourly customer traffic with peak-hour flag.
with traffic as (
  select
    extract(hour from opened_at)::int as hour_of_day,
    sum(adult_count + child_count) as guests
  from dining_sessions
  where opened_at >= date_trunc('day', now())
  group by extract(hour from opened_at)::int
)
select
  hour_of_day,
  guests,
  guests = max(guests) over () as is_peak_hour
from traffic
order by hour_of_day;

-- 8) ADVANCED QUERY: top menu count, used by the manager bar chart.
select
  mi.menu_id,
  mi.name,
  mc.name as category_name,
  mi.image_url,
  sum(oi.quantity) as order_count
from order_items oi
join menu_items mi on mi.menu_id = oi.menu_id
join menu_categories mc on mc.category_id = mi.category_id
where oi.status <> 'cancelled'
  and oi.requested_at >= date_trunc('day', now())
group by mi.menu_id, mi.name, mc.name, mi.image_url
order by order_count desc, mi.name
limit 10;

-- 9) ADVANCED QUERY: ingredient used + remaining stock as one 100% stacked bar.
select
  ii.ingredient_id,
  ii.name,
  ii.unit,
  coalesce(sum(abs(it.quantity_change)) filter (where it.transaction_type = 'usage'), 0) as used_in_period,
  ii.quantity_on_hand as remaining_stock,
  case
    when ii.quantity_on_hand <= 0 then 'Out of stock'
    when ii.quantity_on_hand <= ii.reorder_level then 'Low stock'
    else 'Optimal'
  end as stock_status,
  round(
    coalesce(sum(abs(it.quantity_change)) filter (where it.transaction_type = 'usage'), 0)
    / nullif(coalesce(sum(abs(it.quantity_change)) filter (where it.transaction_type = 'usage'), 0) + ii.quantity_on_hand, 0)
    * 100,
    1
  ) as used_percent,
  round(
    ii.quantity_on_hand
    / nullif(coalesce(sum(abs(it.quantity_change)) filter (where it.transaction_type = 'usage'), 0) + ii.quantity_on_hand, 0)
    * 100,
    1
  ) as remaining_percent
from inventory_items ii
left join inventory_transactions it
  on it.ingredient_id = ii.ingredient_id
  and it.occurred_at >= date_trunc('day', now())
where ii.deleted_at is null
group by ii.ingredient_id, ii.name, ii.unit, ii.quantity_on_hand, ii.reorder_level
order by used_in_period desc, ii.name;
