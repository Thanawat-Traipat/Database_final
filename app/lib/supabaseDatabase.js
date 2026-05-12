import { supabase, supabaseConfigured } from "./supabase";

const TABLE_CONFIG = [
  ["app_users", "user_id", "username"],
  ["restaurant_tables", "table_code", "table_code"],
  ["menu_categories", "category_id", "category_id"],
  ["inventory_items", "ingredient_id", "ingredient_id"],
  ["menu_items", "menu_id", "menu_id"],
  ["recipes", "menu_id,ingredient_id", "menu_id"],
  ["dining_sessions", "session_id", "opened_at"],
  ["orders", "order_id", "order_id"],
  ["order_items", "order_item_id", "order_item_id"],
  ["payments", "payment_id", "payment_id"],
  ["staff_activity_logs", "activity_id", "activity_id"],
  ["inventory_transactions", "transaction_id", "transaction_id"]
];

const WRITE_ORDER = [
  "app_users",
  "restaurant_tables",
  "menu_categories",
  "inventory_items",
  "menu_items",
  "recipes",
  "dining_sessions",
  "orders",
  "order_items",
  "payments",
  "staff_activity_logs",
  "inventory_transactions"
];

const DELETE_ORDER = [
  "inventory_transactions",
  "staff_activity_logs",
  "payments",
  "order_items",
  "orders",
  "dining_sessions",
  "recipes",
  "menu_items",
  "inventory_items",
  "menu_categories",
  "restaurant_tables",
  "app_users"
];

const PRIMARY_KEYS = Object.fromEntries(TABLE_CONFIG.map(([table, primaryKey]) => [table, primaryKey]));

function numberTail(value) {
  const match = String(value ?? "").match(/(\d+)$/);
  return match ? Number(match[1]) : 0;
}

function numericId(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  const number = numberTail(value);
  return Number.isFinite(number) ? number : null;
}

function localId(prefix, value) {
  return value === null || value === undefined ? null : `${prefix}-${Number(value)}`;
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  return Number(value);
}

function uuidFromLocalId(value, namespace) {
  if (!value) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return value;
  const prefix = namespace === "session" ? "10000000-0000-0000-0000" : "00000000-0000-0000-0000";
  return `${prefix}-${String(numberTail(value)).padStart(12, "0")}`;
}

function localIdFromUuid(prefix, value) {
  if (!value) return null;
  const tail = String(value).split("-").at(-1) || "0";
  const parsed = Number(tail);
  return Number.isFinite(parsed) ? `${prefix}-${parsed}` : `${prefix}-${tail}`;
}

function passwordFromHash(passwordHash) {
  return String(passwordHash || "").replace(/^demo-hash-/, "");
}

function passwordHashFromPassword(user) {
  return user.password_hash || `demo-hash-${user.password || ""}`;
}

function localEntityId(entityType, value) {
  if (!value) return "";
  if (entityType === "dining_session") return localIdFromUuid("session", value);
  if (entityType === "payment") return localId("payment", value);
  if (entityType === "order_item") return localId("orderItem", value);
  if (entityType === "restaurant_table") return String(value);
  if (entityType === "app_user") return localIdFromUuid("user", value);
  if (entityType === "inventory_item") return localId("ingredient", value);
  if (entityType === "menu_item") return localId("menu", value);
  return String(value);
}

function supabaseEntityId(entityType, value) {
  if (!value) return "";
  if (entityType === "dining_session") return uuidFromLocalId(value, "session");
  if (entityType === "payment") return String(numericId(value));
  if (entityType === "order_item") return String(numericId(value));
  if (entityType === "restaurant_table") return String(value);
  if (entityType === "app_user") return uuidFromLocalId(value, "user");
  if (entityType === "inventory_item") return String(numericId(value));
  if (entityType === "menu_item") return String(numericId(value));
  return String(value);
}

function buildNextNumbers(database) {
  const specs = [
    ["user", "users", "user_id"],
    ["category", "menu_categories", "category_id"],
    ["menu", "menu_items", "menu_id"],
    ["ingredient", "inventory_items", "ingredient_id"],
    ["session", "dining_sessions", "session_id"],
    ["order", "orders", "order_id"],
    ["orderItem", "order_items", "order_item_id"],
    ["payment", "payments", "payment_id"],
    ["transaction", "inventory_transactions", "transaction_id"],
    ["activity", "staff_activity_logs", "activity_id"]
  ];
  return Object.fromEntries(
    specs.map(([key, table, field]) => {
      const max = Math.max(0, ...(database[table] || []).map((row) => numberTail(row[field])));
      return [key, max + 1];
    })
  );
}

function fromSupabaseRows(rows) {
  const database = {
    meta: {
      storageMode: "supabase",
      lastSyncedAt: new Date().toISOString(),
      nextNumbers: {}
    },
    users: (rows.app_users || []).map((row) => ({
      user_id: localIdFromUuid("user", row.user_id),
      full_name: row.full_name,
      username: row.username,
      password: passwordFromHash(row.password_hash),
      role: row.role,
      is_active: row.is_active,
      deleted_at: row.deleted_at
    })),
    restaurant_tables: (rows.restaurant_tables || []).map((row) => ({
      table_id: row.table_code,
      table_code: row.table_code,
      capacity: toNumber(row.capacity),
      status: row.status,
      cleaning_started_at: row.cleaning_started_at
    })),
    menu_categories: (rows.menu_categories || []).map((row) => ({
      category_id: localId("category", row.category_id),
      name: row.name
    })),
    inventory_items: (rows.inventory_items || []).map((row) => ({
      ingredient_id: localId("ingredient", row.ingredient_id),
      name: row.name,
      unit: row.unit,
      quantity_on_hand: toNumber(row.quantity_on_hand),
      reorder_level: toNumber(row.reorder_level),
      unit_cost: toNumber(row.unit_cost),
      deleted_at: row.deleted_at
    })),
    menu_items: (rows.menu_items || []).map((row) => ({
      menu_id: localId("menu", row.menu_id),
      category_id: localId("category", row.category_id),
      name: row.name,
      description: row.description || "",
      image_url: row.image_url || "",
      is_available: row.is_available,
      deleted_at: row.deleted_at
    })),
    recipes: (rows.recipes || []).map((row) => ({
      menu_id: localId("menu", row.menu_id),
      ingredient_id: localId("ingredient", row.ingredient_id),
      quantity_used: toNumber(row.quantity_used)
    })),
    dining_sessions: (rows.dining_sessions || []).map((row) => ({
      session_id: localIdFromUuid("session", row.session_id),
      table_id: row.table_code,
      cashier_id: localIdFromUuid("user", row.cashier_id),
      adult_count: toNumber(row.adult_count),
      child_count: toNumber(row.child_count),
      adult_price_snapshot: toNumber(row.adult_price_snapshot),
      child_price_snapshot: toNumber(row.child_price_snapshot),
      opened_at: row.opened_at,
      bill_requested_at: row.bill_requested_at,
      closed_at: row.closed_at,
      status: row.status,
      payment_status: row.payment_status
    })),
    orders: (rows.orders || []).map((row) => ({
      order_id: localId("order", row.order_id),
      session_id: localIdFromUuid("session", row.session_id),
      ordered_at: row.ordered_at,
      status: row.status
    })),
    order_items: (rows.order_items || []).map((row) => ({
      order_item_id: localId("orderItem", row.order_item_id),
      order_id: localId("order", row.order_id),
      menu_id: localId("menu", row.menu_id),
      quantity: toNumber(row.quantity),
      status: row.status,
      special_instructions: row.special_instructions || "",
      priority_level: row.priority_level,
      expedited_at: row.expedited_at,
      requested_at: row.requested_at,
      cooking_at: row.cooking_at,
      ready_at: row.ready_at,
      out_for_serving_at: row.out_for_serving_at,
      served_at: row.served_at,
      cancelled_at: row.cancelled_at
    })),
    payments: (rows.payments || []).map((row) => ({
      payment_id: localId("payment", row.payment_id),
      session_id: localIdFromUuid("session", row.session_id),
      cashier_id: localIdFromUuid("user", row.cashier_id),
      method: row.method,
      paid_amount: toNumber(row.paid_amount),
      paid_at: row.paid_at,
      status: row.status
    })),
    staff_activity_logs: (rows.staff_activity_logs || []).map((row) => ({
      activity_id: localId("activity", row.activity_id),
      user_id: localIdFromUuid("user", row.user_id),
      action: row.action,
      entity_type: row.entity_type,
      entity_id: localEntityId(row.entity_type, row.entity_id),
      occurred_at: row.occurred_at
    })),
    inventory_transactions: (rows.inventory_transactions || []).map((row) => ({
      transaction_id: localId("transaction", row.transaction_id),
      ingredient_id: localId("ingredient", row.ingredient_id),
      order_item_id: localId("orderItem", row.order_item_id),
      transaction_type: row.transaction_type,
      quantity_change: toNumber(row.quantity_change),
      unit_cost_snapshot: toNumber(row.unit_cost_snapshot),
      occurred_at: row.occurred_at
    }))
  };
  database.meta.nextNumbers = buildNextNumbers(database);
  return database;
}

function toSupabaseRows(database) {
  return {
    app_users: (database.users || []).map((row) => ({
      user_id: uuidFromLocalId(row.user_id, "user"),
      full_name: row.full_name,
      username: row.username,
      password_hash: passwordHashFromPassword(row),
      role: row.role,
      is_active: row.is_active,
      deleted_at: row.deleted_at
    })),
    restaurant_tables: (database.restaurant_tables || []).map((row) => ({
      table_code: row.table_code,
      capacity: Number(row.capacity || 4),
      status: row.status,
      cleaning_started_at: row.cleaning_started_at
    })),
    menu_categories: (database.menu_categories || []).map((row) => ({
      category_id: numericId(row.category_id),
      name: row.name
    })),
    inventory_items: (database.inventory_items || []).map((row) => ({
      ingredient_id: numericId(row.ingredient_id),
      name: row.name,
      unit: row.unit,
      quantity_on_hand: row.quantity_on_hand,
      reorder_level: row.reorder_level,
      unit_cost: row.unit_cost,
      deleted_at: row.deleted_at
    })),
    menu_items: (database.menu_items || []).map((row) => ({
      menu_id: numericId(row.menu_id),
      category_id: numericId(row.category_id),
      name: row.name,
      description: row.description || "",
      image_url: row.image_url || "",
      is_available: row.is_available,
      deleted_at: row.deleted_at
    })),
    recipes: (database.recipes || []).map((row) => ({
      menu_id: numericId(row.menu_id),
      ingredient_id: numericId(row.ingredient_id),
      quantity_used: row.quantity_used
    })),
    dining_sessions: (database.dining_sessions || []).map((row) => ({
      session_id: uuidFromLocalId(row.session_id, "session"),
      table_code: row.table_id,
      cashier_id: uuidFromLocalId(row.cashier_id, "user"),
      adult_count: Number(row.adult_count || 0),
      child_count: Number(row.child_count || 0),
      adult_price_snapshot: row.adult_price_snapshot || 0,
      child_price_snapshot: row.child_price_snapshot || 0,
      opened_at: row.opened_at,
      bill_requested_at: row.bill_requested_at,
      closed_at: row.closed_at,
      status: row.status,
      payment_status: row.payment_status
    })),
    orders: (database.orders || []).map((row) => ({
      order_id: numericId(row.order_id),
      session_id: uuidFromLocalId(row.session_id, "session"),
      ordered_at: row.ordered_at,
      status: row.status
    })),
    order_items: (database.order_items || []).map((row) => ({
      order_item_id: numericId(row.order_item_id),
      order_id: numericId(row.order_id),
      menu_id: numericId(row.menu_id),
      quantity: Number(row.quantity || 1),
      status: row.status,
      special_instructions: row.special_instructions || "",
      priority_level: row.priority_level || "normal",
      expedited_at: row.expedited_at,
      requested_at: row.requested_at,
      cooking_at: row.cooking_at,
      ready_at: row.ready_at,
      out_for_serving_at: row.out_for_serving_at,
      served_at: row.served_at,
      cancelled_at: row.cancelled_at
    })),
    payments: (database.payments || []).map((row) => ({
      payment_id: numericId(row.payment_id),
      session_id: uuidFromLocalId(row.session_id, "session"),
      cashier_id: uuidFromLocalId(row.cashier_id, "user"),
      method: row.method,
      paid_amount: row.paid_amount,
      paid_at: row.paid_at,
      status: row.status
    })),
    staff_activity_logs: (database.staff_activity_logs || []).map((row) => ({
      activity_id: numericId(row.activity_id),
      user_id: uuidFromLocalId(row.user_id, "user"),
      action: row.action,
      entity_type: row.entity_type,
      entity_id: supabaseEntityId(row.entity_type, row.entity_id),
      occurred_at: row.occurred_at
    })),
    inventory_transactions: (database.inventory_transactions || []).map((row) => ({
      transaction_id: numericId(row.transaction_id),
      ingredient_id: numericId(row.ingredient_id),
      order_item_id: numericId(row.order_item_id),
      transaction_type: row.transaction_type,
      quantity_change: row.quantity_change,
      unit_cost_snapshot: row.unit_cost_snapshot || 0,
      occurred_at: row.occurred_at
    }))
  };
}

async function assertConfigured() {
  if (!supabaseConfigured || !supabase) throw new Error("Supabase environment variables are not configured.");
}

async function fetchTable(table, orderColumn) {
  const { data, error } = await supabase.from(table).select("*").order(orderColumn, { ascending: true });
  if (error) throw error;
  return data || [];
}

async function upsertTable(table, rows) {
  if (!rows?.length) return;
  const { error } = await supabase.from(table).upsert(rows, { onConflict: PRIMARY_KEYS[table] });
  if (error) throw error;
}

async function clearTable(table) {
  const primaryKey = PRIMARY_KEYS[table].split(",")[0];
  const { error } = await supabase.from(table).delete().not(primaryKey, "is", null);
  if (error) throw error;
}

export async function loadDatabaseFromSupabase() {
  await assertConfigured();
  const rows = {};
  for (const [table, , orderColumn] of TABLE_CONFIG) {
    rows[table] = await fetchTable(table, orderColumn);
  }
  return fromSupabaseRows(rows);
}

export async function syncDatabaseToSupabase(database) {
  await assertConfigured();
  const rows = toSupabaseRows(database);
  for (const table of WRITE_ORDER) {
    await upsertTable(table, rows[table]);
  }
}

export async function replaceDatabaseInSupabase(database) {
  await assertConfigured();
  for (const table of DELETE_ORDER) {
    await clearTable(table);
  }
  await syncDatabaseToSupabase(database);
}

export { supabaseConfigured };
