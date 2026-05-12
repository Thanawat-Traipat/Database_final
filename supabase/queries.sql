-- Query examples for the report, Supabase SQL Editor, and manager dashboard.
-- The WHERE clauses are written to match indexes in supabase/schema.sql.

-- ============================================================
-- BASIC QUERY 1: Customer iPad menu with category names
-- Requirement covered: Basic Query
-- Main indexes: idx_menu_items_active_category
-- ============================================================
select
  m.menu_id,
  c.category_id,
  c.name as category_name,
  m.name as menu_name,
  m.description,
  m.image_url,
  m.kitchen_station,
  m.prep_time_minutes,
  m.price,
  m.is_available
from menu_items m
join menu_categories c on c.category_id = m.category_id
where m.deleted_at is null
  and m.is_available = true
order by c.name, m.name;

-- ============================================================
-- BASIC QUERY 2: Cashier 15-table grid with active session and timers
-- Requirement covered: Basic Query
-- Main indexes: idx_tables_active_status, idx_sessions_table_status_opened
-- ============================================================
select
  rt.table_id,
  rt.table_code,
  rt.zone,
  rt.capacity,
  rt.status as table_status,
  rt.cleaning_started_at,
  ds.session_id,
  ds.customer_code,
  coalesce(ds.adult_count, 0) as adult_count,
  coalesce(ds.child_count, 0) as child_count,
  ds.opened_at,
  ds.bill_requested_at,
  case
    when rt.status = 'billing' or ds.bill_requested_at is not null then 'billing'
    when rt.status = 'occupied' then 'seated'
    when rt.status = 'cleaning' then 'cleaning'
    else 'ready'
  end as cashier_card_state,
  case
    when ds.session_id is null then 0
    else round(
      least(100, greatest(0, extract(epoch from (now() - ds.opened_at)) / (90 * 60) * 100))::numeric,
      2
    )
  end as dining_elapsed_percent,
  case
    when rt.status = 'cleaning' and rt.cleaning_started_at is not null
      then greatest(0, 10 * 60 - extract(epoch from (now() - rt.cleaning_started_at)))::integer
    else 0
  end as cleaning_seconds_remaining
from restaurant_tables rt
left join lateral (
  select *
  from dining_sessions ds
  where ds.table_id = rt.table_id
    and ds.status = 'open'
  order by ds.opened_at desc
  limit 1
) ds on true
where rt.deleted_at is null
order by rt.table_code;

-- ============================================================
-- BASIC QUERY 3: Detailed active session view for cashier
-- Requirement covered: Basic Query over multiple tables
-- Main indexes: idx_sessions_table_status_opened, idx_orders_session_ordered, idx_order_items_order_status
-- ============================================================
select
  ds.session_id,
  rt.table_code,
  ds.customer_code,
  ds.adult_count,
  ds.child_count,
  ds.adult_price,
  ds.child_price,
  ds.opened_at,
  o.order_id,
  o.ordered_at,
  oi.order_item_id,
  mi.name as menu_name,
  oi.quantity,
  oi.status,
  oi.special_instructions,
  oi.priority_level,
  oi.priority_reason,
  oi.requested_at,
  oi.ready_at,
  oi.out_for_serving_at,
  oi.served_at
from dining_sessions ds
join restaurant_tables rt on rt.table_id = ds.table_id
left join orders o on o.session_id = ds.session_id
left join order_items oi on oi.order_id = o.order_id
left join menu_items mi on mi.menu_id = oi.menu_id
where ds.status = 'open'
order by rt.table_code, o.ordered_at, oi.requested_at;

-- ============================================================
-- BASIC QUERY 4: Kitchen item queue ordered by oldest request first
-- Requirement covered: Basic Query
-- Main indexes: idx_order_items_status_requested, idx_orders_session_ordered
-- ============================================================
select
  oi.order_item_id,
  rt.table_code,
  mi.name as menu_name,
  mi.kitchen_station,
  oi.quantity,
  oi.status,
  oi.special_instructions,
  oi.priority_level,
  oi.priority_reason,
  oi.requested_at,
  round((extract(epoch from (now() - oi.requested_at)) / 60)::numeric, 2) as waiting_minutes,
  case
    when oi.priority_level = 'rush' then 'late'
    when oi.status = 'pending' and oi.requested_at < now() - interval '15 minutes' then 'late'
    when oi.status = 'cooking' then 'preparing'
    when oi.status = 'ready' then 'ready'
    else 'new'
  end as kds_card_state
from order_items oi
join orders o on o.order_id = oi.order_id
join dining_sessions ds on ds.session_id = o.session_id
join restaurant_tables rt on rt.table_id = ds.table_id
join menu_items mi on mi.menu_id = oi.menu_id
where ds.status = 'open'
  and oi.status in ('pending', 'cooking', 'ready')
order by
  case
    when oi.priority_level = 'rush' then 1
    when oi.status = 'pending' and oi.requested_at < now() - interval '15 minutes' then 1
    when oi.status = 'cooking' then 2
    when oi.status = 'ready' then 3
    else 4
  end,
  oi.requested_at;

-- ============================================================
-- BASIC QUERY 5: KDS cards grouped by table/session
-- Requirement covered: Basic Query with JSON aggregation
-- Main indexes: idx_order_items_status_requested, idx_sessions_table_status_opened
-- ============================================================
select
  ds.session_id,
  rt.table_code,
  min(oi.requested_at) as oldest_requested_at,
  round((extract(epoch from (now() - min(oi.requested_at))) / 60)::numeric, 2) as total_waiting_minutes,
  case
    when bool_or(oi.priority_level = 'rush')
      or bool_or(oi.status = 'pending' and oi.requested_at < now() - interval '15 minutes') then 'late'
    when bool_or(oi.status = 'cooking') then 'preparing'
    when bool_and(oi.status = 'ready') then 'ready'
    else 'new'
  end as kds_card_state,
  jsonb_agg(
    jsonb_build_object(
      'order_item_id', oi.order_item_id,
      'menu_name', mi.name,
      'quantity', oi.quantity,
      'status', oi.status,
      'special_instructions', oi.special_instructions,
      'priority_level', oi.priority_level,
      'priority_reason', oi.priority_reason,
      'kitchen_station', mi.kitchen_station
    )
    order by oi.requested_at, oi.order_item_id
  ) as items
from order_items oi
join orders o on o.order_id = oi.order_id
join dining_sessions ds on ds.session_id = o.session_id
join restaurant_tables rt on rt.table_id = ds.table_id
join menu_items mi on mi.menu_id = oi.menu_id
where ds.status = 'open'
  and oi.status in ('pending', 'cooking', 'ready')
group by ds.session_id, rt.table_code
order by
  case
    when bool_or(oi.priority_level = 'rush')
      or bool_or(oi.status = 'pending' and oi.requested_at < now() - interval '15 minutes') then 1
    when bool_or(oi.status = 'cooking') then 2
    when bool_and(oi.status = 'ready') then 3
    else 4
  end,
  min(oi.requested_at);

-- ============================================================
-- BASIC QUERY 6: Waiter ready-to-serve board
-- Requirement covered: Basic Query
-- Main indexes: idx_order_items_status_requested, idx_order_items_order_status
-- ============================================================
select
  o.order_id,
  rt.table_code,
  min(coalesce(oi.ready_at, oi.out_for_serving_at, oi.requested_at)) as oldest_service_at,
  case
    when bool_or(oi.status = 'ready') then 'ready_for_waiter'
    else 'out_for_serving'
  end as waiter_card_state,
  jsonb_agg(
    jsonb_build_object(
      'order_item_id', oi.order_item_id,
      'menu_name', mi.name,
      'quantity', oi.quantity,
      'status', oi.status,
      'special_instructions', oi.special_instructions,
      'ready_at', oi.ready_at,
      'out_for_serving_at', oi.out_for_serving_at
    )
    order by coalesce(oi.ready_at, oi.out_for_serving_at, oi.requested_at), oi.order_item_id
  ) as items
from order_items oi
join orders o on o.order_id = oi.order_id
join dining_sessions ds on ds.session_id = o.session_id
join restaurant_tables rt on rt.table_id = ds.table_id
join menu_items mi on mi.menu_id = oi.menu_id
where ds.status = 'open'
  and oi.status in ('ready', 'out_for_serving')
group by o.order_id, rt.table_code
order by
  case when bool_or(oi.status = 'ready') then 1 else 2 end,
  min(coalesce(oi.ready_at, oi.out_for_serving_at, oi.requested_at));

-- ============================================================
-- BASIC QUERY 7: Recent staff audit trail
-- Requirement covered: Basic Query
-- Main indexes: idx_staff_activity_occurred_desc
-- ============================================================
select
  sal.activity_id,
  au.full_name,
  au.role,
  ss.station,
  sal.action,
  sal.entity_type,
  sal.entity_id,
  sal.occurred_at,
  sal.note
from staff_activity_logs sal
join app_users au on au.user_id = sal.user_id
left join staff_shifts ss on ss.shift_id = sal.shift_id
order by sal.occurred_at desc
limit 30;

-- ============================================================
-- BASIC QUERY 8: Removed list for soft-delete requirement
-- Requirement covered: Soft Delete + Basic Query
-- Main indexes: primary keys, active/deleted filters
-- ============================================================
select 'menu_item' as removed_type, menu_id::text as removed_id, name, deleted_at
from menu_items
where deleted_at is not null
union all
select 'inventory_item' as removed_type, ingredient_id::text as removed_id, name, deleted_at
from inventory_items
where deleted_at is not null
union all
select 'staff_user' as removed_type, user_id::text as removed_id, username as name, deleted_at
from app_users
where deleted_at is not null
order by deleted_at desc nulls last;

-- ============================================================
-- ADVANCED QUERY 1: Daily revenue, guests, and average ticket
-- Requirement covered: Advanced Query
-- Main indexes: idx_payments_status_paid_at
-- ============================================================
select
  p.paid_at::date as business_date,
  count(distinct ds.session_id) as paid_sessions,
  sum(ds.adult_count + ds.child_count) as guest_count,
  sum(p.paid_amount) as revenue,
  round((sum(p.paid_amount) / nullif(count(distinct ds.session_id), 0))::numeric, 2) as avg_ticket_per_session,
  round((sum(p.paid_amount) / nullif(sum(ds.adult_count + ds.child_count), 0))::numeric, 2) as revenue_per_guest
from payments p
join dining_sessions ds on ds.session_id = p.session_id
where p.status = 'paid'
group by p.paid_at::date
order by business_date desc;

-- ============================================================
-- ADVANCED QUERY 2: Hourly customer traffic for peak-hour planning
-- Requirement covered: Advanced Query
-- Main indexes: idx_sessions_opened_at
-- ============================================================
select
  opened_at::date as business_date,
  extract(hour from opened_at)::int as opening_hour,
  count(*) as session_count,
  sum(adult_count + child_count) as guest_count,
  dense_rank() over (
    partition by opened_at::date
    order by sum(adult_count + child_count) desc
  ) as peak_rank_for_day
from dining_sessions
where status in ('open', 'closed')
group by opened_at::date, extract(hour from opened_at)
order by business_date desc, opening_hour;

-- ============================================================
-- ADVANCED QUERY 3: Top menu performance by ordered quantity
-- Requirement covered: Advanced Query
-- Main indexes: idx_order_items_menu_id, idx_order_items_status_requested
-- ============================================================
select
  mi.menu_id,
  mi.name as menu_name,
  mi.image_url,
  c.name as category_name,
  sum(oi.quantity) as ordered_quantity,
  sum(oi.quantity * mi.price) as addon_revenue
from order_items oi
join menu_items mi on mi.menu_id = oi.menu_id
join menu_categories c on c.category_id = mi.category_id
where oi.status <> 'cancelled'
group by mi.menu_id, mi.name, mi.image_url, c.name
order by ordered_quantity desc, addon_revenue desc
limit 10;

-- ============================================================
-- ADVANCED QUERY 4: Ingredient usage and estimated cost by day
-- Requirement covered: Advanced Query
-- Main indexes: idx_transactions_type_occurred, idx_transactions_ingredient_occurred
-- ============================================================
select
  it.occurred_at::date as usage_date,
  ii.ingredient_id,
  ii.name as ingredient_name,
  ii.unit,
  sum(abs(it.quantity_change)) as quantity_used,
  round(sum(abs(it.quantity_change) * it.unit_cost_snapshot)::numeric, 2) as estimated_cost
from inventory_transactions it
join inventory_items ii on ii.ingredient_id = it.ingredient_id
where it.transaction_type = 'usage'
group by it.occurred_at::date, ii.ingredient_id, ii.name, ii.unit
order by usage_date desc, estimated_cost desc;

-- ============================================================
-- ADVANCED QUERY 5: Ingredient cost per customer head by day
-- Requirement covered: Advanced Query
-- Main indexes: idx_transactions_type_occurred, idx_sessions_opened_at
-- ============================================================
with daily_usage as (
  select
    occurred_at::date as business_date,
    sum(abs(quantity_change) * unit_cost_snapshot) as ingredient_cost
  from inventory_transactions
  where transaction_type = 'usage'
  group by occurred_at::date
),
daily_guests as (
  select
    opened_at::date as business_date,
    sum(adult_count + child_count) as guest_count
  from dining_sessions
  where status in ('open', 'closed')
  group by opened_at::date
)
select
  dg.business_date,
  dg.guest_count,
  round(coalesce(du.ingredient_cost, 0)::numeric, 2) as ingredient_cost,
  round((coalesce(du.ingredient_cost, 0) / nullif(dg.guest_count, 0))::numeric, 2) as ingredient_cost_per_head
from daily_guests dg
left join daily_usage du on du.business_date = dg.business_date
order by dg.business_date desc;

-- ============================================================
-- ADVANCED QUERY 6: Average dining duration and service speed
-- Requirement covered: Advanced Query
-- Main indexes: idx_sessions_opened_at, idx_order_items_status_requested
-- ============================================================
with dining_metric as (
  select
    round(avg(extract(epoch from (closed_at - opened_at)) / 60)::numeric, 2) as avg_dining_minutes,
    count(*) as closed_sessions
  from dining_sessions
  where status = 'closed'
    and closed_at is not null
),
service_metric as (
  select
    round(avg(extract(epoch from (served_at - requested_at)) / 60)::numeric, 2) as avg_service_minutes,
    count(*) as served_items
  from order_items
  where status = 'served'
    and served_at is not null
)
select
  dm.avg_dining_minutes,
  sm.avg_service_minutes,
  dm.closed_sessions,
  sm.served_items
from dining_metric dm
cross join service_metric sm;

-- ============================================================
-- ADVANCED QUERY 7: Kitchen bottleneck by station
-- Requirement covered: Advanced Query
-- Main indexes: idx_order_items_status_requested, idx_menu_items_station
-- ============================================================
select
  mi.kitchen_station,
  count(*) as active_items,
  count(*) filter (
    where oi.status = 'pending' and oi.requested_at < now() - interval '15 minutes'
  ) as late_not_started_items,
  round(avg(extract(epoch from (coalesce(oi.cooking_at, now()) - oi.requested_at)) / 60)::numeric, 2) as avg_wait_to_start_minutes,
  round(avg(extract(epoch from (coalesce(oi.ready_at, now()) - coalesce(oi.cooking_at, oi.requested_at))) / 60)::numeric, 2) as avg_prep_elapsed_minutes
from order_items oi
join menu_items mi on mi.menu_id = oi.menu_id
where oi.status in ('pending', 'cooking', 'ready')
group by mi.kitchen_station
order by late_not_started_items desc, avg_wait_to_start_minutes desc;

-- ============================================================
-- ADVANCED QUERY 8: Low-stock inventory with affected iPad menu items
-- Requirement covered: Advanced Query + Update planning
-- Main indexes: idx_inventory_items_stock, idx_recipes_ingredient_id
-- ============================================================
select
  ii.ingredient_id,
  ii.name as ingredient_name,
  ii.quantity_on_hand,
  ii.unit,
  ii.reorder_level,
  case
    when ii.quantity_on_hand <= 0 then 'out_of_stock'
    when ii.quantity_on_hand <= ii.reorder_level then 'low_stock'
    else 'ok'
  end as stock_state,
  count(distinct mi.menu_id) as affected_menu_items,
  string_agg(distinct mi.name, ', ' order by mi.name) as affected_menu_names
from inventory_items ii
left join recipes r on r.ingredient_id = ii.ingredient_id
left join menu_items mi on mi.menu_id = r.menu_id and mi.deleted_at is null
where ii.deleted_at is null
  and ii.quantity_on_hand <= ii.reorder_level
group by ii.ingredient_id, ii.name, ii.quantity_on_hand, ii.unit, ii.reorder_level
order by ii.quantity_on_hand asc, ii.name;

-- ============================================================
-- ADVANCED QUERY 9: Staff work hours by day
-- Requirement covered: Advanced Query
-- Main indexes: idx_staff_shifts_user_clock
-- ============================================================
select
  au.user_id,
  au.full_name,
  au.role,
  ss.clock_in_at::date as business_date,
  round(sum(extract(epoch from (coalesce(ss.clock_out_at, now()) - ss.clock_in_at)) / 3600)::numeric, 2) as worked_hours,
  count(*) as shift_count
from staff_shifts ss
join app_users au on au.user_id = ss.user_id
group by au.user_id, au.full_name, au.role, ss.clock_in_at::date
order by business_date desc, au.full_name;

-- ============================================================
-- ADVANCED QUERY 10: Live table utilization summary
-- Requirement covered: Advanced Query
-- Main indexes: idx_tables_active_status, idx_sessions_table_status_opened
-- ============================================================
select
  count(*) as total_tables,
  count(*) filter (where rt.status = 'available') as ready_tables,
  count(*) filter (where rt.status = 'occupied') as occupied_tables,
  count(*) filter (where rt.status = 'billing') as billing_tables,
  count(*) filter (where rt.status = 'cleaning') as cleaning_tables,
  coalesce(sum(ds.adult_count + ds.child_count), 0) as active_guest_count,
  round(
    (count(*) filter (where rt.status in ('occupied', 'billing'))::numeric / nullif(count(*), 0)) * 100,
    2
  ) as occupied_percent
from restaurant_tables rt
left join lateral (
  select adult_count, child_count
  from dining_sessions ds
  where ds.table_id = rt.table_id
    and ds.status = 'open'
  order by ds.opened_at desc
  limit 1
) ds on true
where rt.deleted_at is null;
