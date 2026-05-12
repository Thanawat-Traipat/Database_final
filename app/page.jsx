"use client";

// The page is a client component because the operational screens update live in the browser.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  loadDatabaseFromSupabase,
  replaceDatabaseInSupabase,
  supabaseConfigured,
  syncDatabaseToSupabase
} from "./lib/supabaseDatabase";

// Demo credentials make the four staff login flows easy to test in class.
const DEMO_CREDENTIALS = [
  ["cashier", "cashier123", "Cashier"],
  ["kitchen", "kitchen123", "Kitchen"],
  ["waiter", "waiter123", "Waiter"],
  ["manager", "manager123", "Manager"]
];

// Evaluator shortcuts let graders test every major role without manual re-login.
const EVALUATOR_SCREENS = [
  { key: "cashier", role: "cashier", view: "cashier-tables", label: "Cashier", username: "cashier", password: "cashier123" },
  { key: "customer", role: "customer", view: "customer", label: "Customer" },
  { key: "kitchen", role: "kitchen", view: "kitchen-queue", label: "Kitchen", username: "kitchen", password: "kitchen123" },
  { key: "waiter", role: "waiter", view: "waiter-serve", label: "Waiter", username: "waiter", password: "waiter123" },
  { key: "manager", role: "manager", view: "manager-dashboard", label: "Manager", username: "manager", password: "manager123" }
];

// Role navigation keeps each staff member focused on the part of the UX they own.
const ROLE_NAVIGATION = {
  cashier: [
    ["cashier-tables", "Tables"]
  ],
  kitchen: [["kitchen-queue", "Kitchen queue"]],
  waiter: [["waiter-serve", "Ready to serve"]],
  manager: [
    ["manager-dashboard", "Dashboard"],
    ["manager-inventory", "Inventory"]
  ]
};

// Each staff role lands on the screen that matches its first workflow step.
const DEFAULT_VIEW_BY_ROLE = {
  cashier: "cashier-tables",
  kitchen: "kitchen-queue",
  waiter: "waiter-serve",
  manager: "manager-dashboard"
};

// Buffet pricing is shown directly in the cashier right rail.
const ADULT_BUFFET_PRICE = 399;
const CHILD_BUFFET_PRICE = 259;
const DINING_LIMIT_MINUTES = 90;
const CLEANING_DURATION_MINUTES = 10;
const TIMER_TICK_MS = 1000;
const CHECKOUT_CANCEL_STATUSES = ["pending", "cooking", "ready", "out_for_serving"];

// The customer iPad menu intentionally groups the database categories into four Figma sections.
const CUSTOMER_CATEGORIES = [
  {
    key: "meat",
    label: "Meat",
    nav: "Meat",
    categoryIds: ["category-1", "category-2"],
    aliases: ["meat", "pork", "beef"],
    fallbackVisual: "belly",
    kicker: "SIGNATURE CUTS",
    title: "The Butcher's Selection",
    description: "Premium ethically sourced meats, dry-aged for 28 days and marinated in our house-made botanical infusions."
  },
  {
    key: "seafood",
    label: "Seafood",
    nav: "Seafood",
    categoryIds: ["category-3"],
    aliases: ["seafood", "fish", "shrimp", "squid"],
    fallbackVisual: "shrimp",
    kicker: "OCEAN PICKS",
    title: "Seafood Counter",
    description: "Clean, chilled seafood portions prepared for hotpot service and sent directly to the kitchen pass."
  },
  {
    key: "vegetable",
    label: "Vegetable",
    nav: "Vegetables",
    categoryIds: ["category-4"],
    aliases: ["vegetable", "vegetables", "mushroom", "cabbage", "greens"],
    fallbackVisual: "greens",
    kicker: "GARDEN BASKET",
    title: "Vegetable Harvest",
    description: "Fresh greens and mushrooms selected to balance the broth and keep every round bright."
  },
  {
    key: "sides-drinks",
    label: "Sides & Drinks",
    nav: "Sides & Drinks",
    categoryIds: ["category-5", "category-6"],
    aliases: ["side", "sides", "drink", "drinks", "beverage", "beverages", "snack", "snacks", "rice", "kimchi", "tea", "cola", "soda"],
    fallbackVisual: "drink",
    kicker: "SIDES & DRINKS",
    title: "Sides & Drinks",
    description: "Kimchi fried rice, small side plates, and refill drinks grouped together for quick repeat orders."
  }
];

// Visual types keep the customer menu close to the Figma concept while names stay database-driven.
const CUSTOMER_MENU_PRESENTATION = {
  "menu-1": { visual: "belly" },
  "menu-2": { visual: "shoulder" },
  "menu-3": { visual: "beef" },
  "menu-4": { visual: "squid" },
  "menu-5": { visual: "shrimp" },
  "menu-6": { visual: "greens" },
  "menu-7": { visual: "mushroom" },
  "menu-8": { visual: "dessert" },
  "menu-9": { visual: "drink" },
  "menu-10": { visual: "drink" }
};

// Relative timestamps keep seed data realistic no matter when the project is opened.
function minutesFromNow(minutes) {
  return new Date(Date.now() + minutes * 60000).toISOString();
}

// The seed database mirrors the Supabase tables in supabase/schema.sql.
function createSeedDatabase() {
  return {
    meta: {
      nextNumbers: {
        user: 5,
        category: 7,
        menu: 11,
        ingredient: 11,
        session: 1010,
        order: 1006,
        orderItem: 1011,
        payment: 3,
        transaction: 7,
        activity: 6
      }
    },
    users: [
      { user_id: "user-1", full_name: "Narin Cashier", username: "cashier", password: "cashier123", role: "cashier", is_active: true, deleted_at: null },
      { user_id: "user-2", full_name: "Ploy Kitchen", username: "kitchen", password: "kitchen123", role: "kitchen", is_active: true, deleted_at: null },
      { user_id: "user-3", full_name: "Mek Waiter", username: "waiter", password: "waiter123", role: "waiter", is_active: true, deleted_at: null },
      { user_id: "user-4", full_name: "Eddy Manager", username: "manager", password: "manager123", role: "manager", is_active: true, deleted_at: null }
    ],
    restaurant_tables: [
      { table_id: "01", table_code: "01", capacity: 4, status: "available" },
      { table_id: "02", table_code: "02", capacity: 4, status: "occupied" },
      { table_id: "03", table_code: "03", capacity: 4, status: "cleaning", cleaning_started_at: minutesFromNow(-4) },
      { table_id: "04", table_code: "04", capacity: 4, status: "available" },
      { table_id: "05", table_code: "05", capacity: 4, status: "billing" },
      { table_id: "06", table_code: "06", capacity: 4, status: "occupied" },
      { table_id: "07", table_code: "07", capacity: 4, status: "available" },
      { table_id: "08", table_code: "08", capacity: 4, status: "available" },
      { table_id: "09", table_code: "09", capacity: 4, status: "occupied" },
      { table_id: "10", table_code: "10", capacity: 4, status: "available" },
      { table_id: "11", table_code: "11", capacity: 4, status: "occupied" },
      { table_id: "12", table_code: "12", capacity: 4, status: "available" },
      { table_id: "13", table_code: "13", capacity: 4, status: "occupied" },
      { table_id: "14", table_code: "14", capacity: 4, status: "available" },
      { table_id: "15", table_code: "15", capacity: 4, status: "billing" }
    ],
    menu_categories: [
      { category_id: "category-1", name: "Pork" },
      { category_id: "category-2", name: "Beef" },
      { category_id: "category-3", name: "Seafood" },
      { category_id: "category-4", name: "Vegetables" },
      { category_id: "category-5", name: "Sides and Drinks" },
      { category_id: "category-6", name: "Sides and Drinks" }
    ],
    menu_items: [
      { menu_id: "menu-1", category_id: "category-1", name: "Marinated Pork Belly", description: "Soy-garlic pork belly tray", image_url: "/menu/pork-belly.svg", is_available: true, deleted_at: null },
      { menu_id: "menu-2", category_id: "category-1", name: "Premium Pork Shoulder", description: "120 g shabu pork shoulder tray", image_url: "/menu/pork-shoulder.svg", is_available: true, deleted_at: null },
      { menu_id: "menu-3", category_id: "category-2", name: "Black Pepper Beef", description: "Pepper-crusted premium beef tray", image_url: "/menu/black-pepper-beef.svg", is_available: true, deleted_at: null },
      { menu_id: "menu-4", category_id: "category-3", name: "Fresh Squid", description: "Cleaned squid portion", image_url: "/menu/squid.svg", is_available: true, deleted_at: null },
      { menu_id: "menu-5", category_id: "category-3", name: "White shrimp", description: "Six shrimp per plate", image_url: "/menu/shrimp.svg", is_available: true, deleted_at: null },
      { menu_id: "menu-6", category_id: "category-4", name: "Napa cabbage", description: "Fresh vegetable basket", image_url: "/menu/napa-cabbage.svg", is_available: true, deleted_at: null },
      { menu_id: "menu-7", category_id: "category-4", name: "Enoki mushroom", description: "Mushroom portion", image_url: "/menu/enoki.svg", is_available: true, deleted_at: null },
      { menu_id: "menu-8", category_id: "category-5", name: "Kimchi fried rice", description: "Small rice bowl", image_url: "/menu/kimchi-rice.svg", is_available: true, deleted_at: null },
      { menu_id: "menu-9", category_id: "category-6", name: "Thai iced tea", description: "Refill drink glass", image_url: "/menu/thai-tea.svg", is_available: true, deleted_at: null },
      { menu_id: "menu-10", category_id: "category-6", name: "Cola", description: "Refill drink glass", image_url: "/menu/cola.svg", is_available: false, deleted_at: minutesFromNow(-1440) }
    ],
    inventory_items: [
      { ingredient_id: "ingredient-1", name: "Pork shoulder", unit: "g", quantity_on_hand: 9200, reorder_level: 2500, unit_cost: 0.18, deleted_at: null },
      { ingredient_id: "ingredient-2", name: "Smoked bacon", unit: "g", quantity_on_hand: 3200, reorder_level: 1200, unit_cost: 0.24, deleted_at: null },
      { ingredient_id: "ingredient-3", name: "Ribeye beef", unit: "g", quantity_on_hand: 1800, reorder_level: 1500, unit_cost: 0.62, deleted_at: null },
      { ingredient_id: "ingredient-4", name: "Squid", unit: "g", quantity_on_hand: 2600, reorder_level: 1300, unit_cost: 0.31, deleted_at: null },
      { ingredient_id: "ingredient-5", name: "White shrimp", unit: "pcs", quantity_on_hand: 48, reorder_level: 60, unit_cost: 5.2, deleted_at: null },
      { ingredient_id: "ingredient-6", name: "Napa cabbage", unit: "g", quantity_on_hand: 4200, reorder_level: 1800, unit_cost: 0.05, deleted_at: null },
      { ingredient_id: "ingredient-7", name: "Enoki mushroom", unit: "g", quantity_on_hand: 1600, reorder_level: 900, unit_cost: 0.11, deleted_at: null },
      { ingredient_id: "ingredient-8", name: "Kimchi rice mix", unit: "g", quantity_on_hand: 5400, reorder_level: 1200, unit_cost: 0.08, deleted_at: null },
      { ingredient_id: "ingredient-9", name: "Thai tea concentrate", unit: "ml", quantity_on_hand: 2100, reorder_level: 800, unit_cost: 0.09, deleted_at: null },
      { ingredient_id: "ingredient-10", name: "Cola syrup", unit: "ml", quantity_on_hand: 0, reorder_level: 900, unit_cost: 0.07, deleted_at: minutesFromNow(-1440) }
    ],
    recipes: [
      { menu_id: "menu-1", ingredient_id: "ingredient-1", quantity_used: 120 },
      { menu_id: "menu-2", ingredient_id: "ingredient-2", quantity_used: 90 },
      { menu_id: "menu-3", ingredient_id: "ingredient-3", quantity_used: 100 },
      { menu_id: "menu-4", ingredient_id: "ingredient-4", quantity_used: 120 },
      { menu_id: "menu-5", ingredient_id: "ingredient-5", quantity_used: 6 },
      { menu_id: "menu-6", ingredient_id: "ingredient-6", quantity_used: 150 },
      { menu_id: "menu-7", ingredient_id: "ingredient-7", quantity_used: 100 },
      { menu_id: "menu-8", ingredient_id: "ingredient-8", quantity_used: 180 },
      { menu_id: "menu-9", ingredient_id: "ingredient-9", quantity_used: 80 },
      { menu_id: "menu-10", ingredient_id: "ingredient-10", quantity_used: 70 }
    ],
    dining_sessions: [
      { session_id: "session-1001", table_id: "02", cashier_id: "user-1", adult_count: 3, child_count: 1, adult_price_snapshot: 399, child_price_snapshot: 259, opened_at: minutesFromNow(-60), closed_at: null, status: "open", payment_status: "unpaid", bill_requested_at: null },
      { session_id: "session-1002", table_id: "05", cashier_id: "user-1", adult_count: 2, child_count: 1, adult_price_snapshot: 399, child_price_snapshot: 259, opened_at: minutesFromNow(-105), closed_at: null, status: "open", payment_status: "unpaid", bill_requested_at: minutesFromNow(-5) },
      { session_id: "session-1003", table_id: "06", cashier_id: "user-1", adult_count: 2, child_count: 0, adult_price_snapshot: 399, child_price_snapshot: 259, opened_at: minutesFromNow(-23), closed_at: null, status: "open", payment_status: "unpaid", bill_requested_at: null },
      { session_id: "session-1004", table_id: "09", cashier_id: "user-1", adult_count: 4, child_count: 0, adult_price_snapshot: 399, child_price_snapshot: 259, opened_at: minutesFromNow(-72), closed_at: null, status: "open", payment_status: "unpaid", bill_requested_at: null },
      { session_id: "session-1005", table_id: "11", cashier_id: "user-1", adult_count: 2, child_count: 2, adult_price_snapshot: 399, child_price_snapshot: 259, opened_at: minutesFromNow(-45), closed_at: null, status: "open", payment_status: "unpaid", bill_requested_at: null },
      { session_id: "session-1006", table_id: "13", cashier_id: "user-1", adult_count: 4, child_count: 0, adult_price_snapshot: 399, child_price_snapshot: 259, opened_at: minutesFromNow(-68), closed_at: null, status: "open", payment_status: "unpaid", bill_requested_at: null },
      { session_id: "session-1007", table_id: "15", cashier_id: "user-1", adult_count: 4, child_count: 0, adult_price_snapshot: 399, child_price_snapshot: 259, opened_at: minutesFromNow(-94), closed_at: null, status: "open", payment_status: "unpaid", bill_requested_at: minutesFromNow(-3) },
      { session_id: "session-1008", table_id: "04", cashier_id: "user-1", adult_count: 2, child_count: 0, adult_price_snapshot: 399, child_price_snapshot: 259, opened_at: minutesFromNow(-260), closed_at: minutesFromNow(-155), status: "closed", payment_status: "paid", bill_requested_at: minutesFromNow(-160) },
      { session_id: "session-1009", table_id: "12", cashier_id: "user-1", adult_count: 2, child_count: 2, adult_price_snapshot: 399, child_price_snapshot: 259, opened_at: minutesFromNow(-1380), closed_at: minutesFromNow(-1285), status: "closed", payment_status: "paid", bill_requested_at: minutesFromNow(-1290) }
    ],
    orders: [
      { order_id: "order-1001", session_id: "session-1001", ordered_at: minutesFromNow(-36), status: "open" },
      { order_id: "order-1002", session_id: "session-1001", ordered_at: minutesFromNow(-15), status: "open" },
      { order_id: "order-1003", session_id: "session-1002", ordered_at: minutesFromNow(-240), status: "completed" },
      { order_id: "order-1004", session_id: "session-1003", ordered_at: minutesFromNow(-1360), status: "completed" },
      { order_id: "order-1005", session_id: "session-1003", ordered_at: minutesFromNow(-1342), status: "completed" }
    ],
    order_items: [
      { order_item_id: "orderItem-1001", order_id: "order-1001", menu_id: "menu-1", quantity: 2, status: "cooking", special_instructions: "Thin slice, no spicy sauce", priority_level: "normal", expedited_at: null, requested_at: minutesFromNow(-36), cooking_at: minutesFromNow(-31), ready_at: null, out_for_serving_at: null, served_at: null, cancelled_at: null },
      { order_item_id: "orderItem-1002", order_id: "order-1001", menu_id: "menu-6", quantity: 1, status: "ready", special_instructions: "Extra fresh basket", priority_level: "normal", expedited_at: null, requested_at: minutesFromNow(-36), cooking_at: minutesFromNow(-32), ready_at: minutesFromNow(-27), out_for_serving_at: null, served_at: null, cancelled_at: null },
      { order_item_id: "orderItem-1003", order_id: "order-1002", menu_id: "menu-3", quantity: 1, status: "pending", special_instructions: "Chef priority for premium add-on", priority_level: "rush", expedited_at: minutesFromNow(-8), requested_at: minutesFromNow(-24), cooking_at: null, ready_at: null, out_for_serving_at: null, served_at: null, cancelled_at: null },
      { order_item_id: "orderItem-1004", order_id: "order-1002", menu_id: "menu-5", quantity: 2, status: "pending", special_instructions: "Serve chilled", priority_level: "normal", expedited_at: null, requested_at: minutesFromNow(-15), cooking_at: null, ready_at: null, out_for_serving_at: null, served_at: null, cancelled_at: null },
      { order_item_id: "orderItem-1005", order_id: "order-1003", menu_id: "menu-1", quantity: 3, status: "served", special_instructions: "", priority_level: "normal", expedited_at: null, requested_at: minutesFromNow(-240), cooking_at: minutesFromNow(-235), ready_at: minutesFromNow(-230), out_for_serving_at: minutesFromNow(-228), served_at: minutesFromNow(-226), cancelled_at: null },
      { order_item_id: "orderItem-1006", order_id: "order-1003", menu_id: "menu-8", quantity: 2, status: "served", special_instructions: "Less spicy", priority_level: "normal", expedited_at: null, requested_at: minutesFromNow(-240), cooking_at: minutesFromNow(-234), ready_at: minutesFromNow(-229), out_for_serving_at: minutesFromNow(-227), served_at: minutesFromNow(-225), cancelled_at: null },
      { order_item_id: "orderItem-1007", order_id: "order-1004", menu_id: "menu-2", quantity: 4, status: "served", special_instructions: "", priority_level: "normal", expedited_at: null, requested_at: minutesFromNow(-1360), cooking_at: minutesFromNow(-1354), ready_at: minutesFromNow(-1348), out_for_serving_at: minutesFromNow(-1347), served_at: minutesFromNow(-1345), cancelled_at: null },
      { order_item_id: "orderItem-1008", order_id: "order-1004", menu_id: "menu-4", quantity: 2, status: "served", special_instructions: "", priority_level: "normal", expedited_at: null, requested_at: minutesFromNow(-1360), cooking_at: minutesFromNow(-1355), ready_at: minutesFromNow(-1349), out_for_serving_at: minutesFromNow(-1348), served_at: minutesFromNow(-1346), cancelled_at: null },
      { order_item_id: "orderItem-1009", order_id: "order-1005", menu_id: "menu-5", quantity: 3, status: "served", special_instructions: "Extra sauce", priority_level: "normal", expedited_at: null, requested_at: minutesFromNow(-1342), cooking_at: minutesFromNow(-1338), ready_at: minutesFromNow(-1332), out_for_serving_at: minutesFromNow(-1330), served_at: minutesFromNow(-1328), cancelled_at: null },
      { order_item_id: "orderItem-1010", order_id: "order-1005", menu_id: "menu-9", quantity: 4, status: "served", special_instructions: "", priority_level: "normal", expedited_at: null, requested_at: minutesFromNow(-1342), cooking_at: minutesFromNow(-1339), ready_at: minutesFromNow(-1335), out_for_serving_at: minutesFromNow(-1333), served_at: minutesFromNow(-1331), cancelled_at: null }
    ],
    payments: [
      { payment_id: "payment-1", session_id: "session-1008", cashier_id: "user-1", method: "cash", paid_amount: 798, paid_at: minutesFromNow(-155), status: "paid" },
      { payment_id: "payment-2", session_id: "session-1009", cashier_id: "user-1", method: "cash", paid_amount: 2114, paid_at: minutesFromNow(-1285), status: "paid" }
    ],
    staff_activity_logs: [
      { activity_id: "activity-1", user_id: "user-1", action: "open_table", entity_type: "dining_session", entity_id: "session-1008", occurred_at: minutesFromNow(-260) },
      { activity_id: "activity-2", user_id: "user-1", action: "checkout_paid", entity_type: "payment", entity_id: "payment-1", occurred_at: minutesFromNow(-155) },
      { activity_id: "activity-3", user_id: "user-3", action: "serve_item", entity_type: "order_item", entity_id: "orderItem-1005", occurred_at: minutesFromNow(-226) },
      { activity_id: "activity-4", user_id: "user-2", action: "start_preparing", entity_type: "order_item", entity_id: "orderItem-1001", occurred_at: minutesFromNow(-31) },
      { activity_id: "activity-5", user_id: "user-2", action: "expedite_order", entity_type: "order_item", entity_id: "orderItem-1003", occurred_at: minutesFromNow(-8) }
    ],
    inventory_transactions: [
      { transaction_id: "transaction-1", ingredient_id: "ingredient-1", order_item_id: "orderItem-1005", transaction_type: "usage", quantity_change: -360, unit_cost_snapshot: 0.18, occurred_at: minutesFromNow(-226) },
      { transaction_id: "transaction-2", ingredient_id: "ingredient-8", order_item_id: "orderItem-1006", transaction_type: "usage", quantity_change: -360, unit_cost_snapshot: 0.08, occurred_at: minutesFromNow(-225) },
      { transaction_id: "transaction-3", ingredient_id: "ingredient-2", order_item_id: "orderItem-1007", transaction_type: "usage", quantity_change: -360, unit_cost_snapshot: 0.24, occurred_at: minutesFromNow(-1345) },
      { transaction_id: "transaction-4", ingredient_id: "ingredient-4", order_item_id: "orderItem-1008", transaction_type: "usage", quantity_change: -240, unit_cost_snapshot: 0.31, occurred_at: minutesFromNow(-1346) },
      { transaction_id: "transaction-5", ingredient_id: "ingredient-5", order_item_id: "orderItem-1009", transaction_type: "usage", quantity_change: -18, unit_cost_snapshot: 5.2, occurred_at: minutesFromNow(-1328) },
      { transaction_id: "transaction-6", ingredient_id: "ingredient-9", order_item_id: "orderItem-1010", transaction_type: "usage", quantity_change: -320, unit_cost_snapshot: 0.09, occurred_at: minutesFromNow(-1331) }
    ]
  };
}

// Supabase is the only source of truth for the submitted class project.
async function loadInitialDatabase() {
  if (!supabaseConfigured) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Supabase is required.");
  }
  const loaded = normalizeDatabase(await loadDatabaseFromSupabase());
  const missingCoreSeedData =
    !loaded.users?.length ||
    !loaded.restaurant_tables?.length ||
    !loaded.menu_items?.length;

  if (!missingCoreSeedData) return loaded;

  const seeded = normalizeDatabase(createSeedDatabase());
  seeded.meta = {
    ...(seeded.meta || {}),
    storageMode: "supabase",
    bootstrappedAt: new Date().toISOString()
  };
  await replaceDatabaseInSupabase(seeded);
  return seeded;
}

// Database rows are normalized when the project flow changes.
function normalizeDatabase(database) {
  const now = new Date().toISOString();
  database.restaurant_tables = (database.restaurant_tables || []).map((table) => {
    const nextTable = { ...table };
    nextTable.capacity = 4;
    if (nextTable.status === "reserved") nextTable.status = "available";
    if (nextTable.status === "cleaning" && !nextTable.cleaning_started_at) nextTable.cleaning_started_at = now;
    if (nextTable.status !== "cleaning") nextTable.cleaning_started_at = null;
    return nextTable;
  });
  database.dining_sessions = (database.dining_sessions || []).map((session) => {
    if ((session.adult_count || 0) + (session.child_count || 0) <= 4) return session;
    const nextSession = { ...session };
    nextSession.child_count = Math.min(nextSession.child_count || 0, 4);
    nextSession.adult_count = Math.max(0, 4 - nextSession.child_count);
    return nextSession;
  });
  return database;
}

// Money is formatted in Thai baht for the restaurant context.
function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(value || 0);
}

// Compact date-time output keeps tables readable.
function shortDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

// Timing reports use minute-level precision.
function minutesBetween(start, end) {
  if (!start || !end) return null;
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}

// The Figma kitchen cards display elapsed time as MM:SS.
function elapsedTimer(start, end = new Date().toISOString()) {
  if (!start) return "00:00";
  const totalSeconds = Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

// Cleaning and buffet timers need second-level precision for live cashier cards.
function secondsBetween(start, endMs = Date.now()) {
  if (!start) return 0;
  return Math.max(0, Math.floor((endMs - new Date(start).getTime()) / 1000));
}

// MM:SS output keeps cleaning countdowns compact inside table cards.
function formatCountdown(totalSeconds) {
  const safeSeconds = Math.max(0, Math.ceil(totalSeconds));
  const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, "0");
  const seconds = String(safeSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

// Today checks keep the dashboard dynamic.
function isToday(value) {
  const date = new Date(value);
  const today = new Date();
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
}

// Averages return zero instead of NaN for empty datasets.
function average(values) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

// The main component owns the demo database and all UI state.
export default function Home() {
  const [db, setDb] = useState(null);
  const [userId, setUserId] = useState(null);
  const [view, setView] = useState("login");
  const [customerSessionId, setCustomerSessionId] = useState("");
  const [selectedCashierTableId, setSelectedCashierTableId] = useState("table-1");
  const [checkInAdults, setCheckInAdults] = useState(4);
  const [checkInChildren, setCheckInChildren] = useState(0);
  const [customerCategory, setCustomerCategory] = useState("meat");
  const [customerHistoryOpen, setCustomerHistoryOpen] = useState(false);
  const [customerHistoryFilter, setCustomerHistoryFilter] = useState("preparing");
  const [cart, setCart] = useState({});
  const [managerRange, setManagerRange] = useState("today");
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryAddOpen, setInventoryAddOpen] = useState(false);
  const [notice, setNotice] = useState(null);
  const [clockNow, setClockNow] = useState(Date.now());
  const [databaseError, setDatabaseError] = useState("");
  const [evaluatorCollapsed, setEvaluatorCollapsed] = useState(false);
  const [evaluatorPosition, setEvaluatorPosition] = useState(null);
  const evaluatorDragRef = useRef(null);
  const evaluatorSuppressClickRef = useRef(false);

  // The database is loaded after hydration so Next.js does not touch browser APIs on the server.
  useEffect(() => {
    let isMounted = true;
    loadInitialDatabase()
      .then((loaded) => {
        if (!isMounted) return;
        setDb(loaded);
        setDatabaseError("");
        setCustomerSessionId(loaded.dining_sessions.find((session) => session.status === "open")?.session_id || "");
        setSelectedCashierTableId(loaded.restaurant_tables.find((table) => table.table_code === "01")?.table_id || loaded.restaurant_tables[0]?.table_id || "");
      })
      .catch((error) => {
        if (!isMounted) return;
        setDatabaseError(error.message);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Cashier timers tick live so dining bars and cleaning countdowns are not static.
  useEffect(() => {
    const timerId = window.setInterval(() => setClockNow(Date.now()), TIMER_TICK_MS);
    return () => window.clearInterval(timerId);
  }, []);

  // Persisting every committed write keeps the UI local-fast and Supabase-synced.
  function commit(nextDb, message, type = "success", options = {}) {
    const normalizedDb = normalizeDatabase(nextDb);
    normalizedDb.meta = {
      ...(normalizedDb.meta || {}),
      storageMode: "supabase",
      lastSupabaseCommitAt: new Date().toISOString()
    };
    setDb(normalizedDb);
    if (message) setNotice({ message, type });
    const writer = options.replaceSupabase ? replaceDatabaseInSupabase : syncDatabaseToSupabase;
    writer(normalizedDb)
      .then(() => {
        if (message) setNotice({ message: `${message} Synced to Supabase.`, type });
      })
      .catch((error) => {
        setNotice({ message: `Supabase sync failed: ${error.message}`, type: "error" });
        loadDatabaseFromSupabase()
          .then((freshDb) => setDb(normalizeDatabase(freshDb)))
          .catch((reloadError) => setDatabaseError(`Supabase sync failed and reload failed: ${reloadError.message}`));
      });
  }

  // Cloning before mutation keeps React state updates predictable.
  function mutate(mutator, message, type = "success") {
    const nextDb = structuredClone(db);
    mutator(nextDb);
    commit(nextDb, message, type);
  }

  // New IDs stay readable and table-specific for screenshots.
  function nextId(nextDb, key) {
    if (!nextDb.meta.nextNumbers[key]) nextDb.meta.nextNumbers[key] = 1;
    const number = nextDb.meta.nextNumbers[key];
    nextDb.meta.nextNumbers[key] = number + 1;
    return `${key}-${number}`;
  }

  // Lookups are grouped here so render and mutation logic stays readable.
  const helpers = useMemo(() => {
    if (!db) return null;
    return {
      userById: (id) => db.users.find((user) => user.user_id === id),
      tableById: (id) => db.restaurant_tables.find((table) => table.table_id === id),
      categoryById: (id) => db.menu_categories.find((category) => category.category_id === id),
      menuById: (id) => db.menu_items.find((item) => item.menu_id === id),
      ingredientById: (id) => db.inventory_items.find((item) => item.ingredient_id === id),
      sessionById: (id) => db.dining_sessions.find((session) => session.session_id === id),
      orderById: (id) => db.orders.find((order) => order.order_id === id)
    };
  }, [db]);

  // Current user controls whether the app displays login, customer mode, or staff workspace.
  const currentUser = db && userId ? db.users.find((user) => user.user_id === userId) : null;
  // Cleaning is an automatic ten-minute state; no cashier button is needed.
  useEffect(() => {
    if (!db) return;
    const dueCleaningTables = db.restaurant_tables.filter((table) => table.status === "cleaning" && cleaningRemainingSeconds(table) <= 0);
    if (!dueCleaningTables.length) return;
    const nextDb = structuredClone(db);
    dueCleaningTables.forEach((table) => {
      const nextTable = nextDb.restaurant_tables.find((row) => row.table_id === table.table_id);
      if (!nextTable) return;
      nextTable.status = "available";
      nextTable.cleaning_started_at = null;
      if (currentUser) {
        nextDb.staff_activity_logs ||= [];
        nextDb.staff_activity_logs.push({
          activity_id: nextId(nextDb, "activity"),
          user_id: currentUser.user_id,
          action: "auto_table_ready",
          entity_type: "restaurant_table",
          entity_id: nextTable.table_id,
          occurred_at: new Date().toISOString()
        });
      }
    });
    commit(nextDb, "");
  }, [clockNow, db, currentUser]);

  if (databaseError) {
    const blockedByRls = databaseError.toLowerCase().includes("row-level security");
    return (
      <main className="app-shell">
        <section className="card max-w-3xl">
          <p className="eyebrow">Database connection required</p>
          <h1>Supabase is required for this project.</h1>
          <p className="muted">{databaseError}</p>
          <p className="muted">
            {blockedByRls ? "Run " : "Run "}
            <span className="font-semibold text-[#F8DCDA]">{blockedByRls ? "supabase/public-demo-access.sql" : "supabase/reset-new-ux.sql"}</span>
            {blockedByRls ? " in Supabase SQL Editor, then refresh this page. For a full rebuild, run " : ", add the two "}
            {blockedByRls ? <span className="font-semibold text-[#F8DCDA]">supabase/reset-new-ux.sql</span> : null}
            {blockedByRls ? "." : null}
            {!blockedByRls ? <>
            <span className="font-semibold text-[#F8DCDA]"> NEXT_PUBLIC_SUPABASE_*</span> environment variables, then restart the app.
            </> : null}
          </p>
        </section>
      </main>
    );
  }

  // The prototype shows a compact loading state until Supabase returns data.
  if (!db || !helpers) {
    return <main className="app-shell"><p className="empty">Loading Yum Yum Buffet...</p></main>;
  }

  // Session totals use stored price snapshots so old payments remain accurate.
  function sessionTotal(session) {
    const adultPrice = session.adult_price_snapshot ?? ADULT_BUFFET_PRICE;
    const childPrice = session.child_price_snapshot ?? CHILD_BUFFET_PRICE;
    return session.adult_count * adultPrice + session.child_count * childPrice;
  }

  // Guest count is reused by cashier and dashboard screens.
  function sessionGuests(session) {
    return session.adult_count + session.child_count;
  }

  // The customer menu groups Supabase categories by name, with old seed IDs as fallback.
  function customerCategoryForItem(item) {
    const sourceCategory = helpers.categoryById(item.category_id);
    const haystack = `${sourceCategory?.name || ""} ${item.name || ""}`.toLowerCase();
    return (
      CUSTOMER_CATEGORIES.find((category) => category.aliases?.some((alias) => haystack.includes(alias))) ||
      CUSTOMER_CATEGORIES.find((category) => category.categoryIds.includes(item.category_id)) ||
      CUSTOMER_CATEGORIES.find((category) => category.key === "sides-drinks") ||
      CUSTOMER_CATEGORIES[0]
    );
  }

  // Presentation keeps visual style separate from menu names stored in Supabase.
  function customerMenuPresentation(item) {
    const presentation = CUSTOMER_MENU_PRESENTATION[item.menu_id] || {};
    return {
      ...item,
      displayName: item.name,
      visual: presentation.visual || customerCategoryForItem(item).fallbackVisual
    };
  }

  // Cart totals are quantities, because buffet menu items are not individually priced.
  function cartOrderCount(sourceCart = cart) {
    return Object.values(sourceCart).reduce((sum, quantity) => sum + quantity, 0);
  }

  // These helpers model joins from sessions to orders to order_items.
  function ordersForSession(sessionId, sourceDb = db) {
    return sourceDb.orders.filter((order) => order.session_id === sessionId);
  }

  function orderItemsForSession(sessionId, sourceDb = db) {
    const orderIds = ordersForSession(sessionId, sourceDb).map((order) => order.order_id);
    return sourceDb.order_items.filter((item) => orderIds.includes(item.order_id));
  }

  // Staff action logs answer who performed an operation and when.
  function recordStaffActivity(nextDb, action, entityType, entityId) {
    if (!currentUser) return;
    nextDb.staff_activity_logs ||= [];
    nextDb.staff_activity_logs.push({
      activity_id: nextId(nextDb, "activity"),
      user_id: currentUser.user_id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      occurred_at: new Date().toISOString()
    });
  }

  // Cash checkout cancels unfinished kitchen items because the guests are leaving.
  function unfinishedOrderItemsForSession(sessionId, sourceDb = db) {
    return orderItemsForSession(sessionId, sourceDb).filter((item) => CHECKOUT_CANCEL_STATUSES.includes(item.status));
  }

  // Cashier table cards use the newest open session for their timing and billing state.
  function activeSessionForTable(tableId, sourceDb = db) {
    return sourceDb.dining_sessions
      .filter((session) => session.table_id === tableId && session.status === "open")
      .sort((a, b) => new Date(b.opened_at) - new Date(a.opened_at))[0] || null;
  }

  // Figma uses customer-facing status names, while the database keeps normalized states.
  function cashierTableState(table, sourceDb = db) {
    const session = activeSessionForTable(table.table_id, sourceDb);
    if (table.status === "billing" || session?.bill_requested_at) return "billing";
    if (table.status === "occupied") return "seated";
    if (table.status === "cleaning") return cleaningRemainingSeconds(table) > 0 ? "cleaning" : "ready";
    return "ready";
  }

  // Seated cards fill from empty to full red during the 90 minute buffet window.
  function diningProgressPercent(session) {
    if (!session) return 0;
    const elapsedSeconds = secondsBetween(session.opened_at, clockNow);
    const totalSeconds = DINING_LIMIT_MINUTES * 60;
    return Math.min(100, Math.max(0, Math.round((elapsedSeconds / totalSeconds) * 100)));
  }

  // Remaining dining time is used for tooltips and the seated side panel.
  function diningRemainingMinutes(session) {
    if (!session) return 0;
    const remainingSeconds = Math.max(0, DINING_LIMIT_MINUTES * 60 - secondsBetween(session.opened_at, clockNow));
    return Math.ceil(remainingSeconds / 60);
  }

  // Cleaning starts when a paid table is released and ends automatically after ten minutes.
  function cleaningRemainingSeconds(table) {
    if (!table?.cleaning_started_at) return CLEANING_DURATION_MINUTES * 60;
    return Math.max(0, CLEANING_DURATION_MINUTES * 60 - secondsBetween(table.cleaning_started_at, clockNow));
  }

  // Display-focused table IDs stay in the T01 style used by the Figma panel.
  function tableDisplayCode(table) {
    return `T${String(table?.table_code || "").padStart(2, "0")}`;
  }

  // Recipes define the inventory quantities needed for one menu item.
  function recipesForMenu(menuId, sourceDb = db) {
    return sourceDb.recipes.filter((recipe) => recipe.menu_id === menuId);
  }

  // Shortages prevent inventory from becoming negative during serving.
  function stockShortages(orderItem, sourceDb = db) {
    return recipesForMenu(orderItem.menu_id, sourceDb).flatMap((recipe) => {
      const ingredient = sourceDb.inventory_items.find((item) => item.ingredient_id === recipe.ingredient_id);
      const required = recipe.quantity_used * orderItem.quantity;
      return !ingredient || ingredient.deleted_at || ingredient.quantity_on_hand < required
        ? [{ ingredient: ingredient?.name || recipe.ingredient_id, required, available: ingredient?.quantity_on_hand || 0 }]
        : [];
    });
  }

  // This mirrors the database function in supabase/schema.sql.
  function serveOrderItem(orderItemId) {
    mutate((nextDb) => {
      const item = nextDb.order_items.find((row) => row.order_item_id === orderItemId);
      if (!item || !["ready", "out_for_serving"].includes(item.status)) throw new Error("Only ready or out-for-serving items can be served.");
      const shortages = stockShortages(item, nextDb);
      if (shortages.length) throw new Error(`Stock too low for ${shortages.map((shortage) => shortage.ingredient).join(", ")}.`);
      recipesForMenu(item.menu_id, nextDb).forEach((recipe) => {
        const ingredient = nextDb.inventory_items.find((row) => row.ingredient_id === recipe.ingredient_id);
        const usedQuantity = recipe.quantity_used * item.quantity;
        ingredient.quantity_on_hand = Number((ingredient.quantity_on_hand - usedQuantity).toFixed(2));
        nextDb.inventory_transactions.push({
          transaction_id: nextId(nextDb, "transaction"),
          ingredient_id: ingredient.ingredient_id,
          order_item_id: item.order_item_id,
          transaction_type: "usage",
          quantity_change: -usedQuantity,
          unit_cost_snapshot: ingredient.unit_cost,
          occurred_at: new Date().toISOString()
        });
      });
      item.status = "served";
      item.out_for_serving_at ||= new Date().toISOString();
      item.served_at = new Date().toISOString();
      recordStaffActivity(nextDb, "serve_item", "order_item", item.order_item_id, "Waiter marked item served and inventory was deducted");
      refreshOrderStatus(nextDb, item.order_id);
    }, "Item served and inventory deducted.");
  }

  // Waiter sends food from the pass to the table before the final served confirmation.
  function markOrderItemOutForServing(orderItemId) {
    mutate((nextDb) => {
      const item = nextDb.order_items.find((row) => row.order_item_id === orderItemId);
      if (!item || item.status !== "ready") throw new Error("Only ready items can be sent to the table.");
      item.status = "out_for_serving";
      item.out_for_serving_at = new Date().toISOString();
      recordStaffActivity(nextDb, "send_to_table", "order_item", item.order_item_id, "Waiter picked up item; customer iPad now shows out for serving");
      refreshOrderStatus(nextDb, item.order_id);
    }, "Customer iPad updated: food is out for serving.");
  }

  // Parent order state is derived from child item states.
  function refreshOrderStatus(sourceDb, orderId) {
    const order = sourceDb.orders.find((row) => row.order_id === orderId);
    const items = sourceDb.order_items.filter((item) => item.order_id === orderId);
    if (order && items.length) {
      order.status = items.every((item) => ["served", "cancelled"].includes(item.status)) ? "completed" : "open";
    }
  }

  // Login validates active staff rows.
  function handleLogin(event) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const user = db.users.find((row) => row.username === form.username && row.password === form.password && row.is_active && !row.deleted_at);
    if (!user) {
      setNotice({ message: "Invalid or inactive staff login.", type: "error" });
      return;
    }
    const nextDb = structuredClone(db);
    const now = new Date().toISOString();
    nextDb.staff_activity_logs ||= [];
    nextDb.staff_activity_logs.push({
      activity_id: nextId(nextDb, "activity"),
      user_id: user.user_id,
      action: "login",
      entity_type: "app_user",
      entity_id: user.user_id,
      occurred_at: now
    });
    commit(nextDb, `Logged in as ${user.role}.`);
    setUserId(user.user_id);
    setView(DEFAULT_VIEW_BY_ROLE[user.role]);
  }

  // Logout returns staff to the login portal and records the event.
  function handleLogout() {
    if (!currentUser) {
      setUserId(null);
      setView("login");
      return;
    }
    const nextDb = structuredClone(db);
    const now = new Date().toISOString();
    nextDb.staff_activity_logs ||= [];
    nextDb.staff_activity_logs.push({
      activity_id: nextId(nextDb, "activity"),
      user_id: currentUser.user_id,
      action: "logout",
      entity_type: "app_user",
      entity_id: currentUser.user_id,
      occurred_at: now
    });
    commit(nextDb, "Logged out.");
    setUserId(null);
    setView("login");
  }

  // Role test shortcuts authenticate seeded demo users so grading still exercises the login data model.
  function jumpToEvaluatorScreen(screen) {
    if (screen.role === "customer") {
      const session = db.dining_sessions.find((row) => row.status === "open") || db.dining_sessions[0];
      if (session) setCustomerSessionId(session.session_id);
      setCustomerHistoryOpen(false);
      setView("customer");
      setNotice(null);
      return;
    }

    const targetUser = db.users.find((user) =>
      user.username === screen.username &&
      user.password === screen.password &&
      user.role === screen.role &&
      user.is_active &&
      !user.deleted_at
    );
    if (!targetUser) {
      setNotice({ message: `Role test login failed for ${screen.username} / ${screen.password}. Check the app_users seed rows.`, type: "error" });
      return;
    }

    const nextDb = structuredClone(db);
    const now = new Date().toISOString();
    nextDb.staff_activity_logs ||= [];
    nextDb.staff_activity_logs.push({
      activity_id: nextId(nextDb, "activity"),
      user_id: targetUser.user_id,
      action: "role_test_login",
      entity_type: "app_user",
      entity_id: targetUser.user_id,
      occurred_at: now
    });

    commit(nextDb);
    setUserId(targetUser.user_id);
    setView(screen.view);
  }

  // Opening a table inserts a dining session and updates table status.
  function handleOpenTable(event) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    mutate((nextDb) => {
      const table = nextDb.restaurant_tables.find((row) => row.table_id === form.table_id);
      const adultCount = Number(form.adult_count || 0);
      const childCount = Number(form.child_count || 0);
      if (!table || table.status !== "available") throw new Error("Choose an available table.");
      if (adultCount + childCount <= 0) throw new Error("A session needs at least one guest.");
      if (adultCount + childCount > table.capacity) throw new Error(`Table capacity is ${table.capacity} guests.`);
      const sessionId = nextId(nextDb, "session");
      nextDb.dining_sessions.push({
        session_id: sessionId,
        table_id: table.table_id,
        cashier_id: currentUser.user_id,
        adult_count: adultCount,
        child_count: childCount,
        adult_price_snapshot: Number(form.adult_price_snapshot || 0),
        child_price_snapshot: Number(form.child_price_snapshot || 0),
        opened_at: new Date().toISOString(),
        closed_at: null,
        status: "open",
        payment_status: "unpaid",
        bill_requested_at: null
      });
      table.status = "occupied";
      table.cleaning_started_at = null;
      recordStaffActivity(nextDb, "open_table", "dining_session", sessionId, `Opened table ${table.table_code}`);
      setCustomerSessionId(sessionId);
    }, "Table opened.");
  }

  // The Figma cashier panel opens a ready table from the right-side guest counters.
  function makeSeatForSelectedTable() {
    const table = helpers.tableById(selectedCashierTableId);
    if (!table) {
      setNotice({ message: "Select a table first.", type: "error" });
      return;
    }
    mutate((nextDb) => {
      const nextTable = nextDb.restaurant_tables.find((row) => row.table_id === table.table_id);
      if (!nextTable || nextTable.status !== "available") throw new Error("Choose a ready table.");
      if (checkInAdults + checkInChildren <= 0) throw new Error("A session needs at least one guest.");
      if (checkInAdults + checkInChildren > nextTable.capacity) throw new Error(`Table capacity is ${nextTable.capacity} guests.`);
      const sessionId = nextId(nextDb, "session");
      nextDb.dining_sessions.push({
        session_id: sessionId,
        table_id: nextTable.table_id,
        cashier_id: currentUser.user_id,
        adult_count: checkInAdults,
        child_count: checkInChildren,
        adult_price_snapshot: ADULT_BUFFET_PRICE,
        child_price_snapshot: CHILD_BUFFET_PRICE,
        opened_at: new Date().toISOString(),
        closed_at: null,
        status: "open",
        payment_status: "unpaid",
        bill_requested_at: null
      });
      nextTable.status = "occupied";
      nextTable.cleaning_started_at = null;
      recordStaffActivity(nextDb, "open_table", "dining_session", sessionId, `Opened table ${nextTable.table_code}`);
      setCustomerSessionId(sessionId);
    }, `Table ${tableDisplayCode(table)} opened.`);
  }

  // Hosts can move an occupied table into the payment state when guests ask for the bill.
  function markSelectedTableForBilling() {
    const table = helpers.tableById(selectedCashierTableId);
    if (!table) return;
    mutate((nextDb) => {
      const nextTable = nextDb.restaurant_tables.find((row) => row.table_id === table.table_id);
      const session = activeSessionForTable(table.table_id, nextDb);
      if (!nextTable || !session) throw new Error("This table has no active session.");
      session.bill_requested_at = new Date().toISOString();
      nextTable.status = "billing";
      nextTable.cleaning_started_at = null;
      recordStaffActivity(nextDb, "request_bill", "dining_session", session.session_id, `Table ${nextTable.table_code} requested cash bill`);
    }, `Table ${tableDisplayCode(table)} moved to billing.`);
  }

  // Cleaning tables return to the ready state after the host confirms reset.
  function markSelectedTableReady() {
    const table = helpers.tableById(selectedCashierTableId);
    if (!table) return;
    mutate((nextDb) => {
      const nextTable = nextDb.restaurant_tables.find((row) => row.table_id === table.table_id);
      if (!nextTable) throw new Error("Table not found.");
      nextTable.status = "available";
      nextTable.cleaning_started_at = null;
      recordStaffActivity(nextDb, "mark_table_ready", "restaurant_table", nextTable.table_id, `Table ${nextTable.table_code} cleaned and ready`);
    }, `Table ${tableDisplayCode(table)} is ready.`);
  }

  // Customer order submission inserts one order and multiple order_items.
  function placeOrder() {
    const entries = Object.entries(cart).filter(([, quantity]) => quantity > 0);
    if (!customerSessionId || !entries.length) {
      setNotice({ message: "Choose a session and add at least one item.", type: "error" });
      return;
    }
    mutate((nextDb) => {
      const session = nextDb.dining_sessions.find((row) => row.session_id === customerSessionId);
      if (!session || session.status !== "open") throw new Error("This dining session is not open.");
      const orderId = nextId(nextDb, "order");
      nextDb.orders.push({ order_id: orderId, session_id: session.session_id, ordered_at: new Date().toISOString(), status: "open" });
      entries.forEach(([menuId, quantity]) => {
        nextDb.order_items.push({
          order_item_id: nextId(nextDb, "orderItem"),
          order_id: orderId,
          menu_id: menuId,
          quantity,
          status: "pending",
          special_instructions: "",
          priority_level: "normal",
          expedited_at: null,
          requested_at: new Date().toISOString(),
          cooking_at: null,
          ready_at: null,
          out_for_serving_at: null,
          served_at: null,
          cancelled_at: null
        });
      });
    }, "Order sent to kitchen.");
    setCart({});
    setCustomerHistoryFilter("preparing");
    setCustomerHistoryOpen(true);
  }

  // Basket controls mirror the Figma right rail and keep zero quantities out of state.
  function updateCartQuantity(menuId, delta) {
    setCart((current) => {
      const nextQuantity = Math.max(0, (current[menuId] || 0) + delta);
      const nextCart = { ...current };
      if (nextQuantity) nextCart[menuId] = nextQuantity;
      else delete nextCart[menuId];
      return nextCart;
    });
  }

  // Kitchen status updates store timestamps for service-speed reports.
  function setOrderItemStatus(orderItemId, nextStatus) {
    mutate((nextDb) => {
      const item = nextDb.order_items.find((row) => row.order_item_id === orderItemId);
      if (!item) throw new Error("Order item not found.");
      item.status = nextStatus;
      if (nextStatus === "cooking") item.cooking_at = new Date().toISOString();
      if (nextStatus === "ready") item.ready_at = new Date().toISOString();
      recordStaffActivity(nextDb, nextStatus === "cooking" ? "start_preparing" : "mark_ready", "order_item", item.order_item_id, `Kitchen set item to ${nextStatus}`);
      refreshOrderStatus(nextDb, item.order_id);
    }, `Order item updated to ${nextStatus}.`);
  }

  // Expediting an item supports the red rush state shown in the Figma KDS screen.
  function expediteOrderItem(orderItemId) {
    mutate((nextDb) => {
      const item = nextDb.order_items.find((row) => row.order_item_id === orderItemId);
      if (!item) throw new Error("Order item not found.");
      item.priority_level = "rush";
      item.expedited_at = new Date().toISOString();
      recordStaffActivity(nextDb, "expedite_order", "order_item", item.order_item_id, "Marked rush chef priority");
    }, "Order item marked as rush priority.");
  }

  // Payment closes the session, cancels unfinished kitchen items, and releases the table.
  function closeSession(sessionId) {
    mutate((nextDb) => {
      const session = nextDb.dining_sessions.find((row) => row.session_id === sessionId);
      if (!session || session.status !== "open") throw new Error("Only open sessions can be closed.");
      const table = nextDb.restaurant_tables.find((row) => row.table_id === session.table_id);
      const now = new Date().toISOString();
      const cancelledOrderIds = new Set();
      let cancelledItemCount = 0;
      unfinishedOrderItemsForSession(sessionId, nextDb).forEach((item) => {
        item.status = "cancelled";
        item.cancelled_at = now;
        cancelledOrderIds.add(item.order_id);
        cancelledItemCount += 1;
      });
      cancelledOrderIds.forEach((orderId) => refreshOrderStatus(nextDb, orderId));
      session.status = "closed";
      session.payment_status = "paid";
      session.closed_at = now;
      nextDb.payments.push({
        payment_id: nextId(nextDb, "payment"),
        session_id: session.session_id,
        cashier_id: currentUser.user_id,
        method: "cash",
        paid_amount: sessionTotal(session),
        paid_at: now,
        status: "paid"
      });
      if (cancelledItemCount) {
        recordStaffActivity(nextDb, "auto_cancel_unfinished_items", "dining_session", session.session_id, `Cancelled ${cancelledItemCount} unfinished kitchen item(s) during checkout`);
      }
      recordStaffActivity(nextDb, "checkout_paid", "dining_session", session.session_id, `Closed payment for ${money(sessionTotal(session))}`);
      if (table) {
        table.status = "cleaning";
        table.cleaning_started_at = now;
      }
    }, "Cash payment recorded and table moved to cleaning.");
  }

  // Forms below cover manager insert/update/soft-delete work.
  function handleAddMenu(event) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    mutate((nextDb) => {
      nextDb.menu_items.push({
        menu_id: nextId(nextDb, "menu"),
        category_id: form.category_id,
        name: form.name,
        description: form.description || "",
        image_url: form.image_url || "",
        is_available: true,
        deleted_at: null
      });
      recordStaffActivity(nextDb, "create_menu_item", "menu_item", nextDb.menu_items.at(-1).menu_id, `Created ${form.name}`);
    }, "Menu item added.");
    event.currentTarget.reset();
  }

  function updateMenuAvailability(menuId, isAvailable) {
    mutate((nextDb) => {
      const item = nextDb.menu_items.find((row) => row.menu_id === menuId);
      item.is_available = isAvailable;
      recordStaffActivity(nextDb, "update_menu_availability", "menu_item", menuId, `${item.name} availability set to ${isAvailable}`);
    }, "Menu availability updated.");
  }

  function softDeleteMenu(menuId) {
    mutate((nextDb) => {
      const item = nextDb.menu_items.find((row) => row.menu_id === menuId);
      item.deleted_at = new Date().toISOString();
      item.is_available = false;
      recordStaffActivity(nextDb, "soft_delete_menu_item", "menu_item", menuId, `Moved ${item.name} to removed list`);
    }, "Menu item moved to removed list.");
  }

  function menuItemsForIngredient(ingredientId, sourceDb = db) {
    const menuIds = new Set(sourceDb.recipes.filter((recipe) => recipe.ingredient_id === ingredientId).map((recipe) => recipe.menu_id));
    return sourceDb.menu_items.filter((item) => menuIds.has(item.menu_id) && !item.deleted_at);
  }

  function syncMenuAvailabilityForStock(nextDb, ingredientId) {
    const affectedMenuIds = new Set(nextDb.recipes.filter((recipe) => recipe.ingredient_id === ingredientId).map((recipe) => recipe.menu_id));
    affectedMenuIds.forEach((menuId) => {
      const menu = nextDb.menu_items.find((item) => item.menu_id === menuId);
      if (!menu || menu.deleted_at) return;
      const menuRecipes = nextDb.recipes.filter((recipe) => recipe.menu_id === menuId);
      const hasOutOfStockIngredient = menuRecipes.some((recipe) => {
        const ingredient = nextDb.inventory_items.find((row) => row.ingredient_id === recipe.ingredient_id);
        return !ingredient || ingredient.deleted_at || ingredient.quantity_on_hand <= 0;
      });
      if (hasOutOfStockIngredient) menu.is_available = false;
    });
  }

  function setIngredientKioskAvailability(ingredientId, isAvailable) {
    mutate((nextDb) => {
      const ingredient = nextDb.inventory_items.find((row) => row.ingredient_id === ingredientId);
      if (!ingredient) throw new Error("Ingredient not found.");
      if (isAvailable && ingredient.quantity_on_hand <= 0) throw new Error("Restock this ingredient before showing linked iPad menu items.");
      const affectedMenus = menuItemsForIngredient(ingredientId, nextDb);
      if (!affectedMenus.length) throw new Error("No customer iPad menu items are linked to this ingredient.");
      affectedMenus.forEach((menu) => {
        menu.is_available = isAvailable;
      });
      if (isAvailable) {
        affectedMenus.forEach((menu) => {
          nextDb.recipes
            .filter((recipe) => recipe.menu_id === menu.menu_id)
            .forEach((recipe) => syncMenuAvailabilityForStock(nextDb, recipe.ingredient_id));
        });
      }
      recordStaffActivity(nextDb, "toggle_kiosk_menu_from_inventory", "inventory_item", ingredientId, `${ingredient.name} linked iPad menu availability set to ${isAvailable}`);
    }, isAvailable ? "Linked iPad menu items are visible." : "Linked iPad menu items hidden from customer iPad.");
  }

  function adjustIngredientStock(ingredientId, delta, transactionType = delta >= 0 ? "restock" : "manual_adjustment") {
    mutate((nextDb) => {
      const ingredient = nextDb.inventory_items.find((row) => row.ingredient_id === ingredientId);
      if (!ingredient) throw new Error("Ingredient not found.");
      const nextQuantity = Number((ingredient.quantity_on_hand + delta).toFixed(2));
      if (nextQuantity < 0) throw new Error("Stock movement would make inventory negative.");
      ingredient.quantity_on_hand = nextQuantity;
      nextDb.inventory_transactions.push({
        transaction_id: nextId(nextDb, "transaction"),
        ingredient_id: ingredient.ingredient_id,
        order_item_id: null,
        transaction_type: transactionType,
        quantity_change: delta,
        unit_cost_snapshot: ingredient.unit_cost,
        occurred_at: new Date().toISOString()
      });
      syncMenuAvailabilityForStock(nextDb, ingredient.ingredient_id);
      recordStaffActivity(nextDb, "quick_stock_adjustment", "inventory_item", ingredient.ingredient_id, `${transactionType}: ${delta >= 0 ? "+" : ""}${delta} ${ingredient.unit}`);
    }, "Stock quantity updated.");
  }

  function handleAddIngredient(event) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    mutate((nextDb) => {
      nextDb.inventory_items.push({
        ingredient_id: nextId(nextDb, "ingredient"),
        name: form.name,
        unit: form.unit,
        quantity_on_hand: Number(form.quantity_on_hand || 0),
        reorder_level: Number(form.reorder_level || 0),
        unit_cost: Number(form.unit_cost || 0),
        deleted_at: null
      });
      recordStaffActivity(nextDb, "create_inventory_item", "inventory_item", nextDb.inventory_items.at(-1).ingredient_id, `Created ${form.name}`);
    }, "Ingredient added.");
    event.currentTarget.reset();
  }

  function handleAdjustStock(event) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    mutate((nextDb) => {
      const ingredient = nextDb.inventory_items.find((row) => row.ingredient_id === form.ingredient_id);
      if (!ingredient) throw new Error("Ingredient not found.");
      const quantity = Math.abs(Number(form.quantity || 0));
      if (!quantity) throw new Error("Enter a stock movement quantity.");
      const movement = stockMovementFromType(form.movement_type, quantity);
      const signedQuantity = movement.quantity_change;
      if (ingredient.quantity_on_hand + signedQuantity < 0) throw new Error("Stock movement would make inventory negative.");
      ingredient.quantity_on_hand = Number((ingredient.quantity_on_hand + signedQuantity).toFixed(2));
      nextDb.inventory_transactions.push({
        transaction_id: nextId(nextDb, "transaction"),
        ingredient_id: ingredient.ingredient_id,
        order_item_id: null,
        transaction_type: movement.transaction_type,
        quantity_change: signedQuantity,
        unit_cost_snapshot: ingredient.unit_cost,
        occurred_at: new Date().toISOString()
      });
      syncMenuAvailabilityForStock(nextDb, ingredient.ingredient_id);
      recordStaffActivity(nextDb, "record_stock_movement", "inventory_item", ingredient.ingredient_id, `${movement.label}: ${signedQuantity >= 0 ? "+" : ""}${signedQuantity} ${ingredient.unit}`);
    }, "Stock movement recorded.");
    event.currentTarget.reset();
  }

  function stockMovementFromType(type, quantity) {
    if (type === "restock") {
      return { transaction_type: "restock", quantity_change: quantity, label: "Restock" };
    }
    if (type === "waste") {
      return { transaction_type: "waste", quantity_change: -quantity, label: "Waste" };
    }
    if (type === "adjustment_remove") {
      return { transaction_type: "manual_adjustment", quantity_change: -quantity, label: "Manual correction" };
    }
    return { transaction_type: "manual_adjustment", quantity_change: quantity, label: "Manual correction" };
  }

  function softDeleteIngredient(ingredientId) {
    mutate((nextDb) => {
      const ingredient = nextDb.inventory_items.find((row) => row.ingredient_id === ingredientId);
      ingredient.deleted_at = new Date().toISOString();
      menuItemsForIngredient(ingredientId, nextDb).forEach((menu) => {
        menu.is_available = false;
      });
      recordStaffActivity(nextDb, "soft_delete_inventory_item", "inventory_item", ingredientId, `Moved ${ingredient.name} to removed list`);
    }, "Ingredient moved to removed list.");
  }

  function handleAddUser(event) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    mutate((nextDb) => {
      if (nextDb.users.some((user) => user.username === form.username && !user.deleted_at)) throw new Error("Username already exists.");
      nextDb.users.push({ user_id: nextId(nextDb, "user"), full_name: form.full_name, username: form.username, password: form.password, role: form.role, is_active: true, deleted_at: null });
      recordStaffActivity(nextDb, "create_staff_login", "app_user", nextDb.users.at(-1).user_id, `Created ${form.role} login ${form.username}`);
    }, "Staff login added.");
    event.currentTarget.reset();
  }

  function softDeleteUser(targetUserId) {
    if (targetUserId === currentUser?.user_id) {
      setNotice({ message: "You cannot deactivate your current login.", type: "error" });
      return;
    }
    mutate((nextDb) => {
      const user = nextDb.users.find((row) => row.user_id === targetUserId);
      user.is_active = false;
      user.deleted_at = new Date().toISOString();
      recordStaffActivity(nextDb, "soft_delete_staff_login", "app_user", targetUserId, `Deactivated ${user.username}`);
    }, "Staff user moved to removed list.");
  }

  function restoreRow(type, id) {
    mutate((nextDb) => {
      const tableName = type === "menu" ? "menu_items" : type === "ingredient" ? "inventory_items" : "users";
      const idName = type === "menu" ? "menu_id" : type === "ingredient" ? "ingredient_id" : "user_id";
      const row = nextDb[tableName].find((item) => item[idName] === id);
      row.deleted_at = null;
      if (type === "menu") row.is_available = true;
      if (type === "user") row.is_active = true;
      recordStaffActivity(nextDb, "restore_removed_row", type, id, `Restored ${type} row`);
    }, "Row restored.");
  }

  function resetDemo() {
    const nextDb = createSeedDatabase();
    commit(nextDb, "Demo data reset.", "success", { replaceSupabase: true });
    setCart({});
    setCustomerSessionId(nextDb.dining_sessions.find((session) => session.status === "open")?.session_id || "");
    setSelectedCashierTableId(nextDb.restaurant_tables.find((table) => table.table_code === "01")?.table_id || nextDb.restaurant_tables[0]?.table_id || "");
    setCheckInAdults(4);
    setCheckInChildren(0);
    setCustomerCategory("meat");
    setCustomerHistoryFilter("preparing");
    setCustomerHistoryOpen(false);
  }

  // Mutations can throw validation errors; this wrapper turns them into notices.
  const safe = (fn) => {
    try {
      fn();
    } catch (error) {
      setNotice({ message: error.message, type: "error" });
    }
  };

  // Dashboard calculations mirror supabase/queries.sql and power the Figma manager view.
  function calculateDashboardMetrics(range = managerRange) {
    const now = new Date();
    const start = new Date(now);
    if (range === "week") {
      start.setDate(now.getDate() - 6);
    }
    start.setHours(0, 0, 0, 0);
    const inRange = (value) => {
      if (!value) return false;
      const date = new Date(value);
      if (date < start || date > now) return false;
      return true;
    };
    const tables = db.restaurant_tables;
    const rangeSessions = db.dining_sessions.filter((session) => inRange(session.opened_at));
    const rangeUsage = db.inventory_transactions.filter((txn) => txn.transaction_type === "usage" && inRange(txn.occurred_at));
    const rangeOrderItems = db.order_items.filter((item) => item.status !== "cancelled" && inRange(item.requested_at));
    const servedItems = db.order_items.filter((item) => item.status === "served" && inRange(item.served_at || item.requested_at));
    const orderMap = {};
    const ingredientMap = {};
    const tableStateCounts = { occupied: 0, available: 0, cleaning: 0 };

    db.menu_items
      .filter((menu) => !menu.deleted_at)
      .forEach((menu) => {
        const category = helpers.categoryById(menu.category_id);
        orderMap[menu.menu_id] = {
          menu_id: menu.menu_id,
          name: menu.name,
          category: category?.name || "Uncategorized",
          image_url: menu.image_url || "",
          quantity: 0
        };
      });

    db.inventory_items
      .filter((ingredient) => !ingredient.deleted_at)
      .forEach((ingredient) => {
        ingredientMap[ingredient.ingredient_id] = {
          id: ingredient.ingredient_id,
          name: ingredient.name,
          unit: ingredient.unit,
          remaining: Number(ingredient.quantity_on_hand) || 0,
          reorderLevel: Number(ingredient.reorder_level) || 0,
          quantity: 0,
          cost: 0
        };
      });

    rangeOrderItems.forEach((item) => {
      const menu = helpers.menuById(item.menu_id);
      const category = menu ? helpers.categoryById(menu.category_id) : null;
      const key = menu?.menu_id || item.menu_id;
      orderMap[key] ||= {
        menu_id: key,
        name: menu?.name || item.menu_id,
        category: category?.name || "Uncategorized",
        image_url: menu?.image_url || "",
        quantity: 0
      };
      orderMap[key].quantity += item.quantity;
    });

    rangeUsage.forEach((txn) => {
      const ingredient = helpers.ingredientById(txn.ingredient_id);
      if (!ingredient) return;
      ingredientMap[ingredient.ingredient_id] ||= {
        id: ingredient.ingredient_id,
        name: ingredient.name,
        unit: ingredient.unit,
        remaining: Number(ingredient.quantity_on_hand) || 0,
        reorderLevel: Number(ingredient.reorder_level) || 0,
        quantity: 0,
        cost: 0
      };
      ingredientMap[ingredient.ingredient_id].quantity += Math.abs(txn.quantity_change);
      ingredientMap[ingredient.ingredient_id].cost += Math.abs(txn.quantity_change) * txn.unit_cost_snapshot;
    });

    const guests = rangeSessions.reduce((sum, session) => sum + sessionGuests(session), 0);
    const ingredientCost = rangeUsage.reduce((sum, txn) => sum + Math.abs(txn.quantity_change) * txn.unit_cost_snapshot, 0);
    const serviceMinutes = servedItems.map((item) => minutesBetween(item.requested_at, item.served_at)).filter((value) => value != null);
    const totalServiceMinutes = serviceMinutes.reduce((sum, value) => sum + value, 0);
    const servedOrderCount = serviceMinutes.length;
    const trafficHours = [10, 12, 14, 16, 18, 20, 22];
    const traffic = trafficHours.map((hour) => ({ hour, guests: 0 }));
    rangeSessions.forEach((session) => {
      const hour = new Date(session.opened_at).getHours();
      const bucket = traffic.reduce((best, row) => (Math.abs(row.hour - hour) < Math.abs(best.hour - hour) ? row : best), traffic[0]);
      bucket.guests += sessionGuests(session);
    });
    const maxTrafficGuests = Math.max(0, ...traffic.map((row) => row.guests));
    const maxTraffic = Math.max(1, maxTrafficGuests);
    const peakRows = maxTrafficGuests > 0 ? traffic.filter((row) => row.guests === maxTrafficGuests) : [];

    tables.forEach((table) => {
      const state = cashierTableState(table);
      if (state === "cleaning") tableStateCounts.cleaning += 1;
      else if (state === "ready") tableStateCounts.available += 1;
      else tableStateCounts.occupied += 1;
    });

    const topMenu = Object.values(orderMap)
      .sort((a, b) => (b.quantity - a.quantity) || a.name.localeCompare(b.name));
    const maxMenuQty = Math.max(1, ...topMenu.map((row) => row.quantity));
    const ingredientUsage = Object.values(ingredientMap)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((row) => {
        const totalObservedStock = row.quantity + row.remaining;
        const usedSharePercent = totalObservedStock ? Math.round((row.quantity / totalObservedStock) * 100) : 0;
        const status = row.remaining <= 0
          ? "Out of Stock"
          : row.remaining <= row.reorderLevel
            ? "Reorder Now"
            : "Optimal";
        return {
          ...row,
          usedSharePercent,
          remainingSharePercent: totalObservedStock ? 100 - usedSharePercent : 0,
          status
        };
      });

    return {
      rangeLabel: range === "week" ? "Last 7 days" : "Today",
	      guests,
	      ingredientCost,
	      costPerHead: guests ? ingredientCost / guests : 0,
	      avgServiceMinutes: servedOrderCount ? Math.round(totalServiceMinutes / servedOrderCount) : 0,
	      servedItemCount: servedItems.reduce((sum, item) => sum + item.quantity, 0),
      servedOrderCount,
      peakHour: peakRows.length ? peakRows.map((row) => `${String(row.hour).padStart(2, "0")}:00`).join(", ") : "-",
      peakGuests: maxTrafficGuests,
      traffic: traffic.map((row) => ({
        ...row,
        isPeak: maxTrafficGuests > 0 && row.guests === maxTrafficGuests,
        percent: row.guests > 0 ? Math.max(8, Math.round((row.guests / maxTraffic) * 100)) : 8
      })),
      maxTopMenuQty: maxMenuQty,
      topMenu: topMenu.map((row) => ({ ...row, percent: row.quantity > 0 ? Math.max(8, Math.round((row.quantity / maxMenuQty) * 100)) : 0 })),
      lowStock: db.inventory_items.filter((item) => !item.deleted_at && item.quantity_on_hand <= item.reorder_level),
      ingredientUsage,
      tableStateCounts,
      recentActivities: (db.staff_activity_logs || []).slice().sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at)).slice(0, 8)
    };
  }

  // Notice markup is shared by login, customer, and staff screens.
  const noticeBlock = notice ? <div className={`notice ${notice.type === "error" ? "error" : ""}`}>{notice.message}</div> : null;

  function renderWithEvaluatorDock(screen) {
    return (
      <>
        {screen}
        {renderEvaluatorDock()}
      </>
    );
  }

  function evaluatorFloatingStyle() {
    if (!evaluatorPosition) return undefined;
    return {
      top: `${evaluatorPosition.y}px`,
      right: "auto",
      bottom: "auto",
      left: `${evaluatorPosition.x}px`,
      transform: "none"
    };
  }

  function beginEvaluatorDrag(event) {
    if (event.button !== undefined && event.button !== 0) return;
    const floatingElement = event.currentTarget.closest(".evaluator-dock, .evaluator-bubble");
    if (!floatingElement) return;
    event.preventDefault();
    const rect = floatingElement.getBoundingClientRect();
    evaluatorDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      moved: false
    };
    setEvaluatorPosition({ x: rect.left, y: rect.top });
    window.addEventListener("pointermove", moveEvaluatorDrag);
    window.addEventListener("pointerup", endEvaluatorDrag);
    window.addEventListener("pointercancel", endEvaluatorDrag);
  }

  function moveEvaluatorDrag(event) {
    const drag = evaluatorDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const margin = 8;
    const maxX = Math.max(margin, window.innerWidth - drag.width - margin);
    const maxY = Math.max(margin, window.innerHeight - drag.height - margin);
    const nextX = Math.min(maxX, Math.max(margin, event.clientX - drag.offsetX));
    const nextY = Math.min(maxY, Math.max(margin, event.clientY - drag.offsetY));
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (distance > 4) drag.moved = true;
    setEvaluatorPosition({ x: nextX, y: nextY });
  }

  function endEvaluatorDrag(event) {
    const drag = evaluatorDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    window.removeEventListener("pointermove", moveEvaluatorDrag);
    window.removeEventListener("pointerup", endEvaluatorDrag);
    window.removeEventListener("pointercancel", endEvaluatorDrag);
    evaluatorSuppressClickRef.current = drag.moved;
    evaluatorDragRef.current = null;
    window.setTimeout(() => {
      evaluatorSuppressClickRef.current = false;
    }, 80);
  }

  function renderEvaluatorDock() {
    const dragHandlers = {
      onPointerDown: beginEvaluatorDrag
    };

    if (evaluatorCollapsed) {
      return (
        <button
          className="evaluator-bubble"
          type="button"
          style={evaluatorFloatingStyle()}
          onClick={(event) => {
            if (evaluatorSuppressClickRef.current) {
              event.preventDefault();
              return;
            }
            setEvaluatorCollapsed(false);
          }}
          {...dragHandlers}
        >
          Role<br />Test
        </button>
      );
    }

    return (
      <aside className="evaluator-dock" aria-label="Role test navigation" style={evaluatorFloatingStyle()}>
        <div className="evaluator-dock-label" title="Drag role test bar" {...dragHandlers}>
          <strong>Role Test</strong>
        </div>
        <div className="evaluator-dock-actions">
          {EVALUATOR_SCREENS.map((screen) => {
            const active = screen.role === "customer"
              ? view === "customer"
              : currentUser?.role === screen.role && view === screen.view;
            const actionLabel = screen.username
              ? `Log in as ${screen.label} with ${screen.username}/${screen.password}`
              : `Open ${screen.label} view`;
            return (
              <button
                key={screen.key}
                className={active ? "active" : ""}
                type="button"
                aria-label={actionLabel}
                title={actionLabel}
                onClick={() => safe(() => jumpToEvaluatorScreen(screen))}
              >
                <span className="evaluator-icon" aria-hidden="true">{renderEvaluatorIcon(screen.key)}</span>
                <strong>{screen.label}</strong>
              </button>
            );
          })}
        </div>
        <button className="evaluator-hide" type="button" onClick={() => setEvaluatorCollapsed(true)} aria-label="Hide role test bar">
          Hide
        </button>
      </aside>
    );
  }

  function renderEvaluatorIcon(key) {
    const common = {
      width: "18",
      height: "18",
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg"
    };
    const stroke = "currentColor";
    if (key === "cashier") {
      return (
        <svg {...common}>
          <path d="M4 9h16l-1.5 9h-13L4 9Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          <path d="M7 9V6h10v3M8 18l-1 3M16 18l1 3" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    }
    if (key === "customer") {
      return (
        <svg {...common}>
          <rect x="6" y="3" width="12" height="18" rx="2.5" stroke={stroke} strokeWidth="2" />
          <path d="M10 17h4" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    }
    if (key === "kitchen") {
      return (
        <svg {...common}>
          <path d="M5 4h14v16H5V4Z" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          <path d="M8 8h8M8 12h8M8 16h5" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    }
    if (key === "waiter") {
      return (
        <svg {...common}>
          <path d="M4 14h16M7 14a5 5 0 0 1 10 0M12 6v3M9 21h6" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }
    return (
      <svg {...common}>
        <path d="M5 19V9M12 19V5M19 19v-7" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        <path d="M4 19h16" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (view === "customer") {
    return renderWithEvaluatorDock(renderCustomerMode());
  }

  if (!currentUser) {
    return renderWithEvaluatorDock(renderLogin());
  }

  if (currentUser.role === "kitchen" && view === "kitchen-queue") {
    return renderWithEvaluatorDock(renderKitchenQueue());
  }

  if (currentUser.role === "waiter" && view === "waiter-serve") {
    return renderWithEvaluatorDock(renderWaiterServe());
  }

  if (currentUser.role === "manager" && view === "manager-dashboard") {
    return renderWithEvaluatorDock(renderManagerDashboard());
  }

  if (currentUser.role === "manager" && view === "manager-inventory") {
    return renderWithEvaluatorDock(renderManagerInventory());
  }

  if (currentUser.role === "cashier") {
    return renderWithEvaluatorDock(renderCashierTableManagement());
  }

  return renderWithEvaluatorDock(renderWorkspace());

  function renderLogin() {
    return (
      <main className="figma-login absolute left-0 top-0 flex min-h-screen min-w-full items-start bg-[#1A1111]">
        <section className="figma-login-visual relative flex min-h-screen w-[clamp(448px,38vw,680px)] shrink-0 items-center justify-center overflow-hidden bg-[#180B0A]">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(29,16,15,0.40)_0%,rgba(29,16,15,0.88)_100%)]" />
          <img
            src="/login-charcoal.svg"
            className="absolute inset-0 h-full w-full max-w-none object-cover opacity-100"
            alt=""
            onError={(event) => { event.currentTarget.style.display = "none"; }}
          />
          <div className="absolute inset-x-0 top-[44%] z-10 flex flex-col items-center gap-4 px-12 text-center">
            <p className="w-[286px] whitespace-normal text-center font-epilogue text-[28px] font-extrabold uppercase leading-8 tracking-[0.1em] text-[#F8DCDA]">
              YUM YUM BUFFET
            </p>
            <div className="h-px w-16 bg-[#FFB3AF] opacity-60" />
            <p className="w-fit font-manrope text-sm font-light leading-5 tracking-[0.2em] text-[#E2BEBB]">
              FRESH FEASTS, HAPPY TABLES
            </p>
          </div>
        </section>

        <section className="flex min-h-screen flex-1 items-center justify-center bg-[#1A1111] px-[clamp(3rem,8vw,12rem)] py-12">
          <div className="flex w-full max-w-[560px] shrink-0 flex-col items-start gap-9">
            <div className="flex w-full flex-col items-start gap-2">
              <p className="w-full font-epilogue text-2xl font-bold leading-8 tracking-[0.3em] text-[#F8DCDA]">
                STAFF PORTAL
              </p>
              <p className="w-full font-manrope text-sm leading-5 tracking-[0.025em] text-[#E2BEBB]">
                Sign in to access your assigned station.
              </p>
            </div>

            {noticeBlock ? <div className="w-full">{noticeBlock}</div> : null}

            <form className="flex w-full flex-col items-start gap-6" onSubmit={handleLogin}>
              <div className="flex w-full flex-col items-start gap-3">
                <p className="w-full font-manrope text-xs font-semibold leading-4 tracking-[0.2em] text-[#F8DCDA]">
                  STAFF ID / USERNAME
                </p>
                <div className="relative flex w-full flex-col items-start">
                  <input
                    name="username"
                    autoComplete="username"
                    required
                    className="figma-login-input w-full rounded-lg border border-[rgba(90,64,63,0.30)] bg-[#261817] py-[18px] pl-12 pr-4 font-manrope text-lg text-[#F8DCDA] outline-none placeholder:text-[rgba(226,190,187,0.60)] focus:border-[#960018]"
                    placeholder="Enter your credentials"
                  />
                  <svg width="15" height="25" viewBox="0 0 15 25" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute left-4 top-[19px] h-6 w-fit">
                    <path d="M7.49996 6.99993C6.53459 6.99993 5.70992 6.65794 5.02595 5.97398C4.34198 5.29001 4 4.46534 4 3.49996C4 2.53459 4.34198 1.70992 5.02595 1.02595C5.70992 0.341984 6.53459 0 7.49996 0C8.46534 0 9.29001 0.341984 9.97398 1.02595C10.6579 1.70992 10.9999 2.53459 10.9999 3.49996C10.9999 4.46534 10.6579 5.29001 9.97398 5.97398C9.29001 6.65794 8.46534 6.99993 7.49996 6.99993ZM0 14.6153V12.3922C0 11.9025 0.133012 11.449 0.399036 11.0317C0.665059 10.6144 1.02051 10.2936 1.46537 10.0692C2.45383 9.58458 3.45094 9.22112 4.45671 8.97882C5.46247 8.73651 6.47689 8.61536 7.49996 8.61536C8.52304 8.61536 9.53745 8.73651 10.5432 8.97882C11.549 9.22112 12.5461 9.58458 13.5346 10.0692C13.9794 10.2936 14.3349 10.6144 14.6009 11.0317C14.8669 11.449 14.9999 11.9025 14.9999 12.3922V14.6153H0Z" fill="#AA8987" />
                  </svg>
                </div>
              </div>

              <div className="flex w-full flex-col items-start gap-3">
                <p className="w-full font-manrope text-xs font-semibold leading-4 tracking-[0.2em] text-[#F8DCDA]">
                  PASSWORD
                </p>
                <div className="relative flex w-full flex-col items-start">
                  <input
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="figma-login-input w-full rounded-lg border border-[rgba(90,64,63,0.30)] bg-[#261817] py-[18px] pl-12 pr-12 font-manrope text-lg text-[#F8DCDA] outline-none placeholder:text-[rgba(226,190,187,0.60)] focus:border-[#960018]"
                    placeholder="••••••••"
                  />
                  <svg width="15" height="25" viewBox="0 0 15 25" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute left-4 top-[19px] h-6 w-fit">
                    <path d="M1.80768 19.4999C1.30896 19.4999 0.883006 19.3233 0.529803 18.9701C0.176601 18.6169 0 18.1909 0 17.6922V8.30764C0 7.80893 0.176601 7.38297 0.529803 7.02977C0.883006 6.67656 1.30896 6.49996 1.80768 6.49996H3V4.49996C3 3.25126 3.43782 2.18908 4.31345 1.31345C5.18908 0.437817 6.25126 0 7.49996 0C8.74867 0 9.81084 0.437817 10.6865 1.31345C11.5621 2.18908 11.9999 3.25126 11.9999 4.49996V6.49996H13.1922C13.691 6.49996 14.1169 6.67656 14.4701 7.02977C14.8233 7.38297 14.9999 7.80893 14.9999 8.30764V17.6922C14.9999 18.1909 14.8233 18.6169 14.4701 18.9701C14.1169 19.3233 13.691 19.4999 13.1922 19.4999H1.80768Z" fill="#AA8987" />
                  </svg>
                  <svg width="21" height="14" viewBox="0 0 21 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute right-4 top-[20px] h-3.5 w-[21px]">
                    <path d="M10.4638 11.0769C11.5969 11.0769 12.5592 10.6803 13.3509 9.8871C14.1426 9.09393 14.5384 8.1308 14.5384 6.9977C14.5384 5.8646 14.1418 4.90222 13.3486 4.11056C12.5555 3.3189 11.5923 2.92307 10.4592 2.92307C9.32614 2.92307 8.36376 3.31966 7.5721 4.11282C6.78044 4.90599 6.38461 5.86913 6.38461 7.00223C6.38461 8.13532 6.78119 9.0977 7.57436 9.88936C8.36753 10.681 9.33066 11.0769 10.4638 11.0769ZM10.4615 9.69996C9.7115 9.69996 9.074 9.43746 8.549 8.91246C8.024 8.38746 7.7615 7.74996 7.7615 6.99996C7.7615 6.24996 8.024 5.61246 8.549 5.08746C9.074 4.56246 9.7115 4.29996 10.4615 4.29996C11.2115 4.29996 11.849 4.56246 12.374 5.08746C12.899 5.61246 13.1615 6.24996 13.1615 6.99996C13.1615 7.74996 12.899 8.38746 12.374 8.91246C11.849 9.43746 11.2115 9.69996 10.4615 9.69996ZM10.4629 13.9999C8.16325 13.9999 6.06793 13.3656 4.17691 12.0971C2.28589 10.8285 0.893589 9.12944 0 6.99996C0.893589 4.87049 2.28543 3.17146 4.17554 1.90287C6.06564 0.634292 8.1605 0 10.4601 0C12.7597 0 14.8551 0.634292 16.7461 1.90287C18.6371 3.17146 20.0294 4.87049 20.923 6.99996C20.0294 9.12944 18.6376 10.8285 16.7475 12.0971C14.8574 13.3656 12.7625 13.9999 10.4629 13.9999ZM10.4615 12.5C12.3448 12.5 14.074 12.0041 15.649 11.0125C17.224 10.0208 18.4282 8.6833 19.2615 6.99996C18.4282 5.31663 17.224 3.97913 15.649 2.98746C14.074 1.9958 12.3448 1.49996 10.4615 1.49996C8.57817 1.49996 6.849 1.9958 5.274 2.98746C3.699 3.97913 2.49483 5.31663 1.6615 6.99996C2.49483 8.6833 3.699 10.0208 5.274 11.0125C6.849 12.0041 8.57817 12.5 10.4615 12.5Z" fill="#AA8987" />
                  </svg>
                </div>
              </div>

              <button className="figma-auth-button relative flex w-full cursor-pointer items-center justify-center rounded-lg bg-[#960018] px-0 py-6 font-manrope text-base font-extrabold leading-5 tracking-[0.175em] text-[#F8DCDA] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.20),0_4px_6px_-4px_rgba(0,0,0,0.20)]" type="submit">
                AUTHENTICATE & ENTER
              </button>
            </form>

          </div>
        </section>
      </main>
    );
  }

  function renderCashierTableManagement() {
    const tables = db.restaurant_tables.slice().sort((a, b) => Number(a.table_code) - Number(b.table_code));
    const selectedTable = helpers.tableById(selectedCashierTableId) || tables[0];
    const activeSessions = db.dining_sessions.filter((session) => session.status === "open");
    const totalGuests = activeSessions.reduce((sum, session) => sum + sessionGuests(session), 0);
    const occupiedCount = tables.filter((table) => ["seated", "billing"].includes(cashierTableState(table))).length;
    const availableCount = tables.filter((table) => cashierTableState(table) === "ready").length;
    const billingCount = tables.filter((table) => cashierTableState(table) === "billing").length;

    return (
      <main className="cashier-ui">
        <aside className="cashier-rail">
          <div className="cashier-mark" aria-label="Restaurant mark">
            <svg width="23" height="30" viewBox="0 0 23 30" fill="none" aria-hidden="true">
              <path d="M4.5 30V16.275C3.225 15.925 2.15625 15.225 1.29375 14.175C0.43125 13.125 0 11.9 0 10.5V0H3V10.5H4.5V0H7.5V10.5H9V0H12V10.5C12 11.9 11.5688 13.125 10.7063 14.175C9.84375 15.225 8.775 15.925 7.5 16.275V30H4.5ZM19.5 30V18H15V7.5C15 5.425 15.7313 3.65625 17.1938 2.19375C18.6562 0.73125 20.425 0 22.5 0V30H19.5Z" fill="currentColor" />
            </svg>
          </div>
          <button className="cashier-rail-active" type="button" title="Tables">
            <span className="cashier-table-icon" aria-hidden="true">
              <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
                <path d="M14.7879 7H5.21288L4.93788 9H15.0379L14.7879 7ZM1.98788 16L3.21288 7H0.987879C0.654545 7 0.392045 6.86667 0.200379 6.6C0.00871213 6.33333 -0.0454545 6.04167 0.0378788 5.725L1.46288 0.725C1.52955 0.508333 1.64621 0.333333 1.81288 0.2C1.97955 0.0666667 2.17955 0 2.41288 0H17.5629C17.7962 0 17.9962 0.0666667 18.1629 0.2C18.3295 0.333333 18.4462 0.508333 18.5129 0.725L19.9379 5.725C20.0212 6.04167 19.967 6.33333 19.7754 6.6C19.5837 6.86667 19.3212 7 18.9879 7H16.7879L17.9879 16H15.9879L15.3129 11H4.66288L3.98788 16H1.98788Z" fill="currentColor" />
              </svg>
            </span>
            <strong>TABLES</strong>
          </button>
          <div className="cashier-rail-footer">
            <button type="button" onClick={handleLogout}>↪</button>
            <small>LOGOUT</small>
          </div>
        </aside>

        <header className="cashier-topbar">
          <div>
            <h1>YUM YUM BUFFET</h1>
            <p>TABLE MANAGEMENT SYSTEM</p>
          </div>
          <div className="cashier-stats">
            {renderCashierStat("TOTAL GUESTS", totalGuests)}
            {renderCashierStat("OCCUPIED", occupiedCount, true)}
            {renderCashierStat("AVAILABLE", availableCount)}
            {renderCashierStat("BILLING", billingCount)}
          </div>
        </header>

        <section className="cashier-main">
          <div className="cashier-grid-wrap">
            <div className="cashier-table-grid">
              {tables.map((table) => renderCashierTableCard(table, selectedTable?.table_id === table.table_id))}
            </div>
          </div>
          {renderCashierSidePanel(selectedTable)}
        </section>

        <div className="cashier-session-pill">
          <div className="cashier-session-left">
            <span>🍴</span>
            <div>
              <p>ACTIVE SESSION</p>
              <strong>SYSTEM OPERATIONAL</strong>
            </div>
          </div>
          <div className="cashier-session-actions">
            <button type="button" onClick={handleLogout}>SHIFT CHANGE</button>
          </div>
        </div>
      </main>
    );
  }

  function renderCashierStat(label, value, accent = false) {
    return (
      <div className="cashier-stat" key={label}>
        <span>{label}</span>
        <strong className={accent ? "accent" : ""}>{value}</strong>
      </div>
    );
  }

  function renderCashierTableCard(table, selected) {
    const state = cashierTableState(table);
    const session = activeSessionForTable(table.table_id);
    const progress = diningProgressPercent(session);
    const details = {
      ready: `Capacity: ${table.capacity}`,
      seated: "",
      cleaning: `Sanitizing ${formatCountdown(cleaningRemainingSeconds(table))}`,
      billing: "Ready for bill"
    }[state];
    const statusLabel = {
      ready: "READY",
      seated: "SEATED",
      billing: "BILLING",
      cleaning: "CLEANING"
    }[state] || "READY";

    return (
      <button
        className={`cashier-table-card ${state} ${selected ? "selected" : ""}`}
        key={table.table_id}
        type="button"
        onClick={() => setSelectedCashierTableId(table.table_id)}
      >
        <div className="cashier-table-head">
          <span className="cashier-table-number">{table.table_code}</span>
          <span className={`cashier-badge ${state}`}>{statusLabel}</span>
        </div>
        <div>
          <h2>Table {table.table_code}</h2>
          {details ? <p>{details}</p> : null}
          {state === "seated" ? (
            <div className="cashier-progress" title={`${diningRemainingMinutes(session)} minutes remaining`}>
              <span style={{ width: `${progress}%` }} />
            </div>
          ) : null}
        </div>
        {selected ? <span className="cashier-selected-corner">✓</span> : null}
      </button>
    );
  }

  function renderCashierSidePanel(table) {
    if (!table) return null;
    const state = cashierTableState(table);
    const session = activeSessionForTable(table.table_id);
    if (state === "ready") return renderCashierCheckInPanel(table);
    if (state === "billing") return renderCashierPaymentPanel(table, session);
    if (state === "seated") return renderCashierSeatedPanel(table, session);
    if (state === "cleaning") return renderCashierCleaningPanel(table);
    return renderCashierCheckInPanel(table);
  }

  function renderCashierCheckInPanel(table) {
    const total = checkInAdults * ADULT_BUFFET_PRICE + checkInChildren * CHILD_BUFFET_PRICE;
    const guestCount = checkInAdults + checkInChildren;
    const canAddGuest = guestCount < table.capacity;
    return (
      <aside className="cashier-side">
        <div className="cashier-side-head">
          <h2>CHECK-IN | TABLE {tableDisplayCode(table)}</h2>
          <button type="button" onClick={() => setSelectedCashierTableId("")}>×</button>
        </div>
        <div className="cashier-side-body checkin">
          {renderGuestCounter("Adult", ADULT_BUFFET_PRICE, checkInAdults, setCheckInAdults, canAddGuest)}
          {renderGuestCounter("Child", CHILD_BUFFET_PRICE, checkInChildren, setCheckInChildren, canAddGuest)}
          <div className="cashier-estimate">
            <span>{guestCount}/{table.capacity} GUESTS · TOTAL ESTIMATE</span>
            <strong>{total} THB</strong>
          </div>
        </div>
        <div className="cashier-side-action">
          <button className="primary" type="button" onClick={() => safe(makeSeatForSelectedTable)}>↪ MAKE A SEAT</button>
        </div>
      </aside>
    );
  }

  function renderCashierCleaningPanel(table) {
    const remainingSeconds = cleaningRemainingSeconds(table);
    return (
      <aside className="cashier-side">
        <div className="cashier-side-head">
          <div>
            <h2>Table {tableDisplayCode(table)}</h2>
            <p>AUTO READY IN {formatCountdown(remainingSeconds)}</p>
          </div>
          <span className="cashier-waiting cleaning">CLEANING</span>
        </div>
        <div className="cashier-side-body">
          <div className="cashier-large-progress cleaning">
            <span style={{ width: `${Math.round((remainingSeconds / (CLEANING_DURATION_MINUTES * 60)) * 100)}%` }} />
          </div>
          <p className="cashier-muted">Sanitizing runs for 10 minutes after payment. The table will change back to ready automatically.</p>
        </div>
        <div className="cashier-side-action">
          <button type="button" disabled>AUTO CLEANING TIMER</button>
        </div>
      </aside>
    );
  }

  function renderGuestCounter(label, price, value, setValue, canAddGuest) {
    return (
      <div className="cashier-counter" key={label}>
        <div className="cashier-counter-title">
          <h3>{label}</h3>
          <span>{price} THB</span>
        </div>
        <div className="cashier-counter-box">
          <button type="button" onClick={() => setValue((current) => Math.max(0, current - 1))}>−</button>
          <strong>{value}</strong>
          <button type="button" disabled={!canAddGuest} onClick={() => setValue((current) => current + 1)}>+</button>
        </div>
      </div>
    );
  }

  function renderCashierSeatedPanel(table, session) {
    const progress = diningProgressPercent(session);
    return (
      <aside className="cashier-side">
        <div className="cashier-side-head">
          <div>
            <h2>Table {tableDisplayCode(table)}</h2>
            <p>{sessionGuests(session)} GUESTS · {diningRemainingMinutes(session)}M LEFT</p>
          </div>
          <span className="cashier-waiting">SEATED</span>
        </div>
        <div className="cashier-side-body">
          <div className="cashier-large-progress"><span style={{ width: `${progress}%` }} /></div>
          <p className="cashier-muted">Guests are dining. Move this table to billing when they request the cash bill.</p>
        </div>
        <div className="cashier-side-action stacked">
          <button type="button" onClick={() => { setCustomerSessionId(session.session_id); setView("customer"); }}>OPEN TABLE IPAD</button>
          <button className="primary" type="button" onClick={() => safe(markSelectedTableForBilling)}>REQUEST BILL</button>
        </div>
      </aside>
    );
  }

  function renderCashierPaymentPanel(table, session) {
    if (!session) return renderCashierStatusPanel(table, "BILLING", "No active session was found for this table.", "BACK");
    const total = sessionTotal(session);
    return (
      <aside className="cashier-side">
        <div className="cashier-side-head">
          <div>
            <h2>Table {tableDisplayCode(table)}</h2>
            <p>{sessionGuests(session)} GUESTS · {minutesBetween(session.opened_at, new Date().toISOString()) || 0}M</p>
          </div>
          <span className="cashier-waiting">WAITING FOR BILL</span>
        </div>
        <div className="cashier-side-body payment">
          <p className="cashier-section-label">ORDER SUMMARY</p>
          {renderPaymentLine("Adult Buffet", session.adult_count, session.adult_price_snapshot ?? ADULT_BUFFET_PRICE)}
          {renderPaymentLine("Child Buffet", session.child_count, session.child_price_snapshot ?? CHILD_BUFFET_PRICE)}
          <div className="cashier-total-breakdown">
            <div><span>SUBTOTAL</span><span>{total.toLocaleString()} THB</span></div>
            <div><span>SERVICE CHARGE (0%)</span><span>0 THB</span></div>
          </div>
          <div className="cashier-final-total">
            <span>TOTAL</span>
            <strong>{total.toLocaleString()} THB</strong>
            <p>PAYMENT METHOD: CASH ONLY</p>
          </div>
        </div>
        <div className="cashier-side-action">
          <button className="primary" type="button" onClick={() => safe(() => closeSession(session.session_id))}>▣ PROCESS PAYMENT (CASH)</button>
        </div>
      </aside>
    );
  }

  function renderPaymentLine(label, quantity, price) {
    return (
      <div className="cashier-payment-line" key={label}>
        <div>
          <h3>{label}</h3>
          <p>Qty: {quantity} · {price} THB / ea</p>
        </div>
        <strong>{(quantity * price).toLocaleString()} THB</strong>
      </div>
    );
  }

  function renderCashierStatusPanel(table, status, message, actionLabel, action) {
    return (
      <aside className="cashier-side">
        <div className="cashier-side-head">
          <h2>Table {tableDisplayCode(table)}</h2>
          <span className="cashier-waiting">{status}</span>
        </div>
        <div className="cashier-side-body">
          <p className="cashier-muted">{message}</p>
        </div>
        <div className="cashier-side-action">
          {action ? <button className="primary" type="button" onClick={() => safe(action)}>{actionLabel}</button> : <button type="button">{actionLabel}</button>}
        </div>
      </aside>
    );
  }

  function renderWorkspace() {
    const navigation = ROLE_NAVIGATION[currentUser.role] || [];
    return (
      <main className="workspace">
        <aside className="sidebar">
          <div className="brand-block">
            <span className="eyebrow">Yum Yum Buffet</span>
            <strong>{currentUser.full_name}</strong>
            <span className="pill available">{currentUser.role}</span>
            {currentShift ? <span className="meta">Clocked in {shortDateTime(currentShift.clock_in_at)} - {currentShift.station}</span> : null}
          </div>
          <nav className="nav-list">
            {navigation.map(([targetView, label]) => (
              <button key={targetView} className={view === targetView ? "active" : ""} type="button" onClick={() => setView(targetView)}>
                <span>{label}</span><span>{countBadge(targetView)}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar-actions">
            <button className="secondary" type="button" onClick={() => setView("customer")}>Customer QR demo</button>
            <button className="ghost" type="button" onClick={resetDemo}>Reset demo data</button>
            <button className="danger" type="button" onClick={handleLogout}>Logout</button>
          </div>
        </aside>
        <section className="content">
          <header className="content-header">
            <div><span className="eyebrow">Role workflow</span><h1>{viewTitle()}</h1></div>
            <span className="meta">{shortDateTime(new Date().toISOString())}</span>
          </header>
          {noticeBlock}
          {renderActiveView()}
        </section>
      </main>
    );
  }

  function countBadge(targetView) {
    if (targetView === "kitchen-queue") return db.order_items.filter((item) => ["pending", "cooking", "ready"].includes(item.status)).length;
    if (targetView === "waiter-serve") return db.order_items.filter((item) => ["ready", "out_for_serving"].includes(item.status)).length;
    return "";
  }

  function viewTitle() {
    return {
      "cashier-open": "Open table",
      "cashier-sessions": "Active dining sessions",
      "kitchen-queue": "Kitchen queue",
      "waiter-serve": "Ready to serve",
      "manager-dashboard": "Manager dashboard",
      "manager-inventory": "Inventory management"
    }[view] || "Workspace";
  }

  function renderActiveView() {
    if (view === "cashier-open") return renderCashierOpen();
    if (view === "cashier-sessions") return renderCashierSessions();
    if (view === "kitchen-queue") return renderKitchenQueue();
    if (view === "waiter-serve") return renderWaiterServe();
    if (view === "manager-dashboard") return renderManagerDashboard();
    if (view === "manager-inventory") return renderManagerInventory();
    return <p className="empty">No screen configured.</p>;
  }

  function renderCashierOpen() {
    const availableTables = db.restaurant_tables.filter((table) => table.status === "available");
    return (
      <div className="grid split">
        <form className="panel form-grid two" onSubmit={(event) => safe(() => handleOpenTable(event))}>
          <h2>New dining session</h2>
          <label>Table<select name="table_id" required>{availableTables.map((table) => <option key={table.table_id} value={table.table_id}>Table {table.table_code} ({table.capacity} seats)</option>)}</select></label>
          <label>Adult guests<input name="adult_count" type="number" min="0" defaultValue="2" required /></label>
          <label>Child guests<input name="child_count" type="number" min="0" defaultValue="0" required /></label>
          <label>Adult price snapshot<input name="adult_price_snapshot" type="number" min="0" defaultValue="399" required /></label>
          <label>Child price snapshot<input name="child_price_snapshot" type="number" min="0" defaultValue="259" required /></label>
          <button type="submit">Open table</button>
        </form>
        <section className="panel">
          <h2>Table status</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Table</th><th>Seats</th><th>Status</th></tr></thead>
              <tbody>{db.restaurant_tables.map((table) => <tr key={table.table_id}><td>{table.table_code}</td><td>{table.capacity}</td><td><span className={`pill ${table.status}`}>{table.status}</span></td></tr>)}</tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  function renderCashierSessions() {
    const sessions = db.dining_sessions.filter((session) => session.status === "open");
    if (!sessions.length) return <p className="empty">No active dining sessions.</p>;
    return <div className="grid">{sessions.map((session) => renderSessionPanel(session))}</div>;
  }

  function renderSessionPanel(session) {
    const table = helpers.tableById(session.table_id);
    const items = orderItemsForSession(session.session_id);
    return (
      <section className="panel" key={session.session_id}>
        <div className="content-header">
          <div><h2>Table {table?.table_code || session.table_id}</h2><p className="meta">{sessionGuests(session)} guests, opened {shortDateTime(session.opened_at)}</p></div>
          <div className="actions"><span className="pill open">open</span><strong>{money(sessionTotal(session))}</strong></div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Menu item</th><th>Qty</th><th>Status</th><th>Requested</th></tr></thead>
            <tbody>
              {items.length ? items.map((item) => <tr key={item.order_item_id}><td>{helpers.menuById(item.menu_id)?.name || item.menu_id}</td><td>{item.quantity}</td><td><span className={`pill ${item.status}`}>{item.status}</span></td><td>{shortDateTime(item.requested_at)}</td></tr>) : <tr><td colSpan="4">No orders yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="actions" style={{ marginTop: "0.75rem" }}>
          <button type="button" onClick={() => { setCustomerSessionId(session.session_id); setView("customer"); }}>Open customer view</button>
          <button type="button" onClick={() => safe(() => closeSession(session.session_id))}>Close and pay</button>
        </div>
      </section>
    );
  }

  function renderCustomerMode() {
    const sessions = db.dining_sessions.filter((session) => session.status === "open");
    const selectedSession = helpers.sessionById(customerSessionId) || sessions[0] || null;
    const selectedTable = selectedSession ? helpers.tableById(selectedSession.table_id) : null;
    const activeCategory = CUSTOMER_CATEGORIES.find((category) => category.key === customerCategory) || CUSTOMER_CATEGORIES[0];
    const activeMenu = db.menu_items
      .filter((item) => item.is_available && !item.deleted_at && customerCategoryForItem(item).key === activeCategory.key)
      .map((item) => customerMenuPresentation(item));
    const remainingMinutes = selectedSession ? diningRemainingMinutes(selectedSession) : 0;
    if (customerHistoryOpen) return renderCustomerOrderHistoryScreen(selectedSession, selectedTable, remainingMinutes);
    return (
      <main className="customer-ipad">
        <header className="customer-menu-topbar">
          <div className="customer-table-chip">
            {sessions.length ? (
              <select value={selectedSession?.session_id || ""} onChange={(event) => { setCustomerSessionId(event.target.value); setCart({}); setCustomerHistoryFilter("preparing"); setCustomerHistoryOpen(false); }}>
                {sessions.map((session) => {
                  const table = helpers.tableById(session.table_id);
                  return <option key={session.session_id} value={session.session_id}>TABLE {table?.table_code || "--"}</option>;
                })}
              </select>
            ) : "NO TABLE"}
          </div>
          <h1>YUM YUM BUFFET</h1>
          <p>{remainingMinutes} MINS REMAINING</p>
        </header>
        <div className="customer-menu-shell">
          <aside className="customer-menu-rail">
            <div className="customer-menu-brand">
              <strong>M</strong>
              <span>MENU</span>
            </div>
            <nav>
              {CUSTOMER_CATEGORIES.map((category) => renderCustomerCategoryButton(category))}
            </nav>
          </aside>
          <section className="customer-menu-content">
            {noticeBlock ? <div className="customer-notice">{noticeBlock}</div> : null}
            <div className="customer-menu-heading">
              <p>{activeCategory.kicker}</p>
              <h2>{activeCategory.title}</h2>
              <span>{activeCategory.description}</span>
            </div>
            {selectedSession ? (
              <div className="customer-food-grid">
                {activeMenu.map((item) => renderCustomerMenuCard(item))}
              </div>
            ) : (
              <div className="customer-menu-empty">Ask the cashier to open a table before ordering.</div>
            )}
          </section>
          <aside className="customer-selection-panel">
            {renderCustomerBasket()}
          </aside>
        </div>
      </main>
    );
  }

  function renderCustomerCategoryButton(category) {
    const active = category.key === customerCategory;
    return (
      <button className={`customer-category-button ${active ? "active" : ""}`} type="button" key={category.key} onClick={() => setCustomerCategory(category.key)}>
        <span>{renderCustomerCategoryIcon(category.key)}</span>
        <strong>{category.nav}</strong>
      </button>
    );
  }

  function renderCustomerCategoryIcon(categoryKey) {
    const iconProps = { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true" };
    if (categoryKey === "seafood") {
      return (
        <svg {...iconProps}>
          <path d="M3 12C5.7 8.7 8.7 7 12 7C15.3 7 18.3 8.7 21 12C18.3 15.3 15.3 17 12 17C8.7 17 5.7 15.3 3 12Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M4 12L1.5 9.5M4 12L1.5 14.5M15.5 8.5L20.5 5.5V18.5L15.5 15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="9" cy="11" r="1" fill="currentColor" />
        </svg>
      );
    }
    if (categoryKey === "sides" || categoryKey === "vegetable") {
      return (
        <svg {...iconProps}>
          <path d="M5 13C5 7.8 9.2 4 16.5 3.5C17 10.8 13.2 15 8 15H5V13Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M5 21C7.2 14.7 10.8 10.6 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M9 15C10.3 17.2 12.4 18.5 15.5 18.5C17.7 18.5 19.5 17.9 21 16.7C18.9 14.5 16.5 13.4 13.8 13.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }
    if (categoryKey === "drinks" || categoryKey === "sides-drinks") {
      return (
        <svg {...iconProps}>
          <path d="M5 4H19L13 11V18H17V20H7V18H11V11L5 4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M8 7H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    }
    return (
      <svg {...iconProps}>
        <path d="M6 21V13C4.9 12.7 4 12.1 3.4 11.2C2.8 10.3 2.5 9.3 2.5 8V3.5H4.5V8H6V3.5H8V8H9.5V3.5H11.5V8C11.5 9.3 11.2 10.3 10.6 11.2C10 12.1 9.1 12.7 8 13V21H6Z" fill="currentColor" />
        <path d="M17 21V13H14V8C14 5.2 16.2 3 19 3V21H17Z" fill="currentColor" />
      </svg>
    );
  }

  function renderCustomerMenuCard(item) {
    return (
      <article className="customer-food-card" key={item.menu_id}>
          {renderCustomerFoodVisual(item)}
        <div className="customer-food-card-body">
          <h3>{item.displayName}</h3>
          <p>Included in buffet</p>
          <button type="button" onClick={() => updateCartQuantity(item.menu_id, 1)}>+ ADD</button>
        </div>
      </article>
    );
  }

  function renderCustomerFoodVisual(item) {
    const visualClass = item.visual || customerCategoryForItem(item).key;
    const imageUrl = item.image_url?.trim();

    return (
      <div className={`customer-food-visual ${visualClass} ${imageUrl ? "has-photo" : ""}`} role="img" aria-label={item.displayName}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.displayName}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={(event) => {
              event.currentTarget.style.display = "none";
              event.currentTarget.parentElement?.classList.add("image-error");
            }}
          />
        ) : null}
        <span />
        <i />
        <b />
      </div>
    );
  }

  function renderCustomerBasket() {
    const entries = Object.entries(cart).filter(([, quantity]) => quantity > 0);
    const totalOrders = cartOrderCount();
    return (
      <>
        <div className="customer-selection-head">
          <h2>My Selection</h2>
          <span>{entries.length} ITEMS</span>
        </div>
        <div className="customer-selection-list">
          {entries.length ? entries.map(([menuId, quantity]) => {
            const item = helpers.menuById(menuId);
            const presentation = item ? customerMenuPresentation(item) : { displayName: menuId, visual: "meat" };
            return (
              <div className="customer-selection-row" key={menuId}>
                {renderCustomerFoodVisual(presentation)}
                <div>
                  <h3>{presentation.displayName}</h3>
                  <div className="customer-qty-control">
                    <button type="button" onClick={() => updateCartQuantity(menuId, -1)}>-</button>
                    <strong>{quantity}</strong>
                    <button type="button" onClick={() => updateCartQuantity(menuId, 1)}>+</button>
                  </div>
                </div>
                <button className="customer-trash" type="button" onClick={() => updateCartQuantity(menuId, -quantity)}>DEL</button>
              </div>
            );
          }) : <p className="customer-empty">Add dishes from the menu to build your order.</p>}
        </div>
        <div className="customer-selection-footer">
          <div className="customer-total-line">
            <span>TOTAL SELECTION</span>
            <strong>{totalOrders} orders</strong>
          </div>
          <button className="customer-history-button" type="button" onClick={() => { setCustomerHistoryFilter("preparing"); setCustomerHistoryOpen(true); }}>Order History</button>
          <button className="customer-send-button" type="button" disabled={!totalOrders} onClick={() => safe(placeOrder)}>SEND ORDER</button>
          <small>PREPARED FRESH UPON SUBMISSION</small>
        </div>
      </>
    );
  }

  function renderCustomerOrderHistoryScreen(session, table, remainingMinutes) {
    const historyItems = session ? orderItemsForSession(session.session_id).slice().sort((a, b) => new Date(b.requested_at) - new Date(a.requested_at)) : [];
    const filteredItems = historyItems.filter((item) => customerHistoryMatchesFilter(item, customerHistoryFilter));
    const servedCount = customerHistoryQuantity(historyItems, "served");
    const preparingCount = historyItems.filter((item) => isCustomerPreparingStatus(item.status)).reduce((sum, item) => sum + item.quantity, 0);
    const cancelledCount = customerHistoryQuantity(historyItems, "cancelled");
    const tabs = [
      ["preparing", "IN PREPARATION", preparingCount],
      ["served", "SERVED", servedCount],
      ["cancelled", "CANCELLED", cancelledCount]
    ];
    return (
      <main className="customer-ipad customer-history-screen">
        <header className="customer-history-topbar">
          <h1>YUM YUM BUFFET</h1>
          <div className="customer-history-session-chip">
            <span>TABLE {table?.table_code || "--"}</span>
            <span>{remainingMinutes} MINS REMAINING</span>
          </div>
          <h2>Order History</h2>
        </header>
        <div className="customer-history-shell">
          <section className="customer-history-main">
            {noticeBlock ? <div className="customer-notice">{noticeBlock}</div> : null}
            <div className="customer-history-tabs" role="tablist" aria-label="Order history filters">
              {tabs.map(([key, label, count]) => (
                <button className={customerHistoryFilter === key ? "active" : ""} type="button" role="tab" aria-selected={customerHistoryFilter === key} key={key} onClick={() => setCustomerHistoryFilter(key)}>
                  {label}
                  <span>{count}</span>
                </button>
              ))}
            </div>
            <div className="customer-history-page-list">
              {filteredItems.length ? filteredItems.map((item) => {
                const menu = helpers.menuById(item.menu_id);
                const presentation = menu ? customerMenuPresentation(menu) : { displayName: item.menu_id, visual: "meat" };
                const category = menu ? customerCategoryForItem(menu) : null;
                const orderedMinutes = minutesBetween(item.requested_at, new Date().toISOString()) || 0;
                return (
                  <article className="customer-history-page-row" key={item.order_item_id}>
                    {renderCustomerFoodVisual(presentation)}
                    <div className="customer-history-row-main">
                      <div className="customer-history-row-title">
                        <div>
                          <h3>{presentation.displayName}</h3>
                          <p>{menu?.description || category?.title || "Buffet item"}</p>
                        </div>
                        <span className={`customer-history-pill ${customerOrderStatusClass(item.status)}`}>{customerOrderStatusLabel(item.status)}</span>
                      </div>
                      <div className="customer-history-meta">
                        <strong>QTY: X{item.quantity}</strong>
                        <i />
                        <span>Ordered {orderedMinutes} mins ago</span>
                      </div>
                    </div>
                  </article>
                );
              }) : (
                <p className="customer-history-empty">No {tabs.find(([key]) => key === customerHistoryFilter)?.[1].toLowerCase()} orders yet.</p>
              )}
            </div>
          </section>
          <aside className="customer-history-status-panel">
            <div>
              <h2>Order Status</h2>
              <p>Current Session</p>
            </div>
            <div className="customer-history-status-card">
              <div>
                <span>SERVED</span>
                <strong>{String(servedCount).padStart(2, "0")}</strong>
              </div>
              <div>
                <span>IN PREPARATION</span>
                <strong>{String(preparingCount).padStart(2, "0")}</strong>
              </div>
              <div>
                <span>CANCELLED</span>
                <strong>{String(cancelledCount).padStart(2, "0")}</strong>
              </div>
            </div>
            <button className="customer-history-back" type="button" onClick={() => setCustomerHistoryOpen(false)}>BACK TO MENU</button>
          </aside>
        </div>
      </main>
    );
  }

  function isCustomerPreparingStatus(status) {
    return ["pending", "cooking", "ready", "out_for_serving"].includes(status);
  }

  function customerHistoryMatchesFilter(item, filter) {
    if (filter === "served") return item.status === "served";
    if (filter === "cancelled") return item.status === "cancelled";
    return isCustomerPreparingStatus(item.status);
  }

  function customerHistoryQuantity(items, status) {
    return items.filter((item) => item.status === status).reduce((sum, item) => sum + item.quantity, 0);
  }

  function customerOrderStatusClass(status) {
    if (status === "served") return "served";
    if (status === "cancelled") return "cancelled";
    if (status === "out_for_serving") return "serving";
    if (status === "ready") return "ready";
    return "preparing";
  }

  function customerOrderStatusLabel(status) {
    if (status === "served") return "SERVED";
    if (status === "cancelled") return "CANCELLED";
    if (status === "out_for_serving") return "OUT FOR SERVING";
    if (status === "ready") return "READY TO SERVE";
    if (status === "cooking") return "COOKING";
    return "IN QUEUE";
  }

  function renderKitchenQueue() {
    const groups = kitchenQueueGroups();
    const newCount = groups.filter((group) => group.kind === "new").length;
    const preparingCount = groups.filter((group) => group.kind === "preparing").length;
    const readyCount = groups.filter((group) => group.kind === "ready").length;
    const lateCount = groups.filter((group) => group.kind === "late").length;
    const activeItemCount = db.order_items.filter((item) => ["pending", "cooking", "ready"].includes(item.status)).length;

    return (
      <main className="relative min-h-screen overflow-hidden bg-[#1D100F] text-[#F8DCDA]">
        <aside className="absolute left-0 top-0 flex h-full w-24 flex-col items-center justify-between border-r border-r-[rgba(90,64,63,0.18)] bg-[#180B0A] px-0 py-8 shadow-[10px_0_30px_0_rgba(0,0,0,0.30)]">
          <p className="font-epilogue text-xs font-extrabold leading-4 tracking-normal">YUM YUM</p>
          <button className="h-10 w-16 rounded-xl border border-[rgba(90,64,63,0.30)] !bg-[#362625] !p-0 text-[10px] font-bold uppercase tracking-[0.08em] text-[#F8DCDA]" type="button" onClick={handleLogout}>
            Log out
          </button>
        </aside>

        <header className="absolute left-24 top-0 flex h-24 w-[calc(100%-6rem)] items-center justify-between bg-[rgba(29,16,15,0.90)] px-16">
          <h1 className="font-epilogue text-2xl font-bold uppercase leading-8 tracking-normal text-[#FFFBFC]">Kitchen Display System</h1>
          <button className="!bg-transparent !p-0 font-epilogue text-3xl font-bold leading-9 text-[#FFFBFC]" type="button">
            {activeItemCount} ITEMS
          </button>
        </header>

        <section className="absolute bottom-20 left-24 right-0 top-24 overflow-y-auto px-16 py-8">
          {groups.length ? (
            <div className="grid grid-cols-[repeat(auto-fill,300px)] justify-start gap-x-14 gap-y-8 pb-8">
              {groups.map((group) => renderKitchenCard(group))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#261817]">
              <p className="font-epilogue text-2xl font-bold">No active kitchen orders.</p>
            </div>
          )}
        </section>

        <footer className="absolute bottom-0 left-24 flex h-20 w-[calc(100%-6rem)] items-center justify-between border-t border-t-[rgba(255,255,255,0.05)] bg-[rgba(24,11,10,0.95)] px-16">
          <div className="flex items-center gap-16">
            {renderKitchenLegend("#FFF", `${newCount} NEW ORDERS`)}
            {renderKitchenLegend("#FCD34D", `${preparingCount} PREPARING`)}
            {renderKitchenLegend("#8BD2DA", `${readyCount} READY`)}
            {renderKitchenLegend("#960018", `${lateCount} LATE`)}
          </div>
        </footer>
      </main>
    );
  }

  function kitchenQueueGroups() {
    const activeItems = db.order_items
      .filter((item) => ["pending", "cooking", "ready"].includes(item.status))
      .sort((a, b) => new Date(a.requested_at) - new Date(b.requested_at));
    const groupsByOrder = new Map();

    activeItems.forEach((item) => {
      const order = helpers.orderById(item.order_id);
      const session = order ? helpers.sessionById(order.session_id) : null;
      const table = session ? helpers.tableById(session.table_id) : null;
      const key = item.order_id;

      if (!groupsByOrder.has(key)) {
        groupsByOrder.set(key, { key, order, session, table, items: [] });
      }
      groupsByOrder.get(key).items.push(item);
    });

    return Array.from(groupsByOrder.values()).map((group) => {
      const oldestRequest = group.items.reduce((oldest, item) => (!oldest || new Date(item.requested_at) < new Date(oldest) ? item.requested_at : oldest), null);
      const waitMinutes = minutesBetween(oldestRequest, new Date().toISOString()) || 0;
      const pendingItems = group.items.filter((item) => item.status === "pending");
      const hasRush = group.items.some((item) => item.priority_level === "rush");
      const hasCooking = group.items.some((item) => item.status === "cooking");
      const allReady = group.items.every((item) => item.status === "ready");
      const hasLatePending = pendingItems.some((item) => !item.cooking_at && (minutesBetween(item.requested_at, new Date().toISOString()) || 0) >= 15);
      const kind = hasRush || hasLatePending ? "late" : hasCooking ? "preparing" : allReady ? "ready" : "new";
      return { ...group, oldestRequest, waitMinutes, kind };
    }).sort((a, b) => {
      const priority = { late: 0, new: 1, preparing: 2, ready: 3 };
      return priority[a.kind] - priority[b.kind] || new Date(a.oldestRequest) - new Date(b.oldestRequest);
    });
  }

  function renderKitchenCard(group) {
    const hasCooking = group.items.some((item) => item.status === "cooking");
    const allReady = group.items.every((item) => item.status === "ready");
    const hasUnexpeditedLate = group.items.some((item) => item.status === "pending" && item.priority_level !== "rush" && (minutesBetween(item.requested_at, new Date().toISOString()) || 0) >= 15);
    const nextAction = allReady ? "none" : group.kind === "late" && hasUnexpeditedLate ? "expedite" : hasCooking ? "ready" : "start";
    const actionLabel = {
      start: "START PREPARING",
      ready: "MARK AS READY",
      expedite: "EXPEDITE NOW!!",
      none: "READY FOR SERVER"
    }[nextAction];
    const theme = {
      new: {
        card: "border-[rgba(255,255,255,0.10)] bg-[#261817] shadow-[0_0_25px_0_rgba(255,255,255,0.05)]",
        header: "border-b border-b-[rgba(255,255,255,0.05)] bg-[#FFF] text-[#000]",
        label: "text-[rgba(1,1,1,0.40)]",
        time: "text-[#170101]",
        qty: "text-[#FFB3AF]",
        button: "border border-[rgba(255,255,255,0.40)] !bg-[#FFF] !text-[#1C1C19]"
      },
      preparing: {
        card: "border-[rgba(252,211,77,0.20)] bg-[#362625] shadow-[0_0_30px_0_rgba(252,211,77,0.15)]",
        header: "bg-[#FCD34D] text-[#000]",
        label: "text-[rgba(0,0,0,0.60)]",
        time: "text-[#000]",
        qty: "text-[#FCD34D]",
        button: "!bg-[#FCD34D] !text-[#000]"
      },
      ready: {
        card: "border-[rgba(139,210,218,0.32)] bg-[#172424] shadow-[0_0_30px_0_rgba(139,210,218,0.16)]",
        header: "bg-[#8BD2DA] text-[#000]",
        label: "text-[rgba(0,0,0,0.60)]",
        time: "text-[#000]",
        qty: "text-[#8BD2DA]",
        button: "!bg-[#8BD2DA] !text-[#001314]"
      },
      late: {
        card: "border-[rgba(150,0,24,0.50)] bg-[#180B0A] shadow-[0_0_30px_0_rgba(150,0,24,0.40)]",
        header: "border-b border-b-[rgba(150,0,24,0.20)] bg-[#960018] text-[#FFF]",
        label: "text-[#FFF]",
        time: "text-[#FFF]",
        qty: "text-[#FFB4AB]",
        button: "!bg-[#960018] !text-[#FFF]"
      }
    }[group.kind];
    const tableCode = group.table?.table_code?.replace(/\D/g, "") || group.table?.table_code || "--";

    return (
      <article className={`flex h-[620px] w-[300px] flex-col justify-between overflow-hidden rounded-lg border ${theme.card}`} key={group.key}>
        <div className={`flex h-[130px] shrink-0 items-center justify-between p-8 ${theme.header}`}>
          <div className="flex flex-col items-start gap-1">
            <p className={`font-manrope text-[10px] font-bold leading-[14.4px] tracking-[0.5em] ${theme.label}`}>TABLE</p>
            <p className="font-epilogue text-5xl font-bold leading-[48px]">{tableCode.padStart(2, "0")}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <p className={`font-manrope text-[10px] font-bold leading-[14.4px] tracking-[0.5em] ${theme.label}`}>{group.kind === "preparing" ? "IN PROGRESS" : group.kind === "ready" ? "READY" : "TOTAL TIME"}</p>
            <p className={`font-epilogue text-2xl font-bold leading-8 ${theme.time}`}>{elapsedTimer(group.oldestRequest)}</p>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-start overflow-hidden p-8">
          <div className="flex w-full flex-col items-start gap-8">
            {group.items.map((item) => {
              const menu = helpers.menuById(item.menu_id);
              const detail = item.special_instructions || menu?.description || "";
              return (
                <div className="flex w-full items-start gap-5" key={item.order_item_id}>
                  <div className="flex w-12 flex-col items-start">
                    <p className={`font-epilogue text-3xl font-black leading-9 ${theme.qty}`}>x{item.quantity}</p>
                  </div>
                  <div className="flex w-full flex-col items-start gap-1.5">
                    <p className="w-full font-epilogue text-xl uppercase leading-7 tracking-normal text-[#F8DCDA]">{menu?.name || item.menu_id}</p>
                    {detail ? <p className="w-full font-manrope text-sm leading-5 text-[#FFF]">{detail}</p> : null}
                    {item.priority_level === "rush" ? <p className="w-full font-epilogue text-[11px] uppercase leading-[16.8px] tracking-[0.1em] text-[#FFB4AB]">EXPEDITE NOW - CHEF PRIORITY</p> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col items-start p-8">
          <button className={`flex w-full cursor-pointer items-center justify-center rounded px-0 py-5 font-epilogue text-lg font-black leading-7 tracking-[0.2em] disabled:cursor-default disabled:opacity-100 ${theme.button}`} type="button" disabled={nextAction === "none"} onClick={() => nextAction === "none" ? undefined : safe(() => advanceKitchenGroup(group, nextAction))}>
            {actionLabel}
          </button>
        </div>
      </article>
    );
  }

  function renderKitchenLegend(color, label) {
    return (
      <div className="flex items-center gap-3">
        <span className="h-2.5 w-2.5 rounded-xl" style={{ backgroundColor: color }} />
        <span className="font-manrope text-[10px] leading-[15.6px] tracking-[0.4615em] text-[rgba(248,220,218,0.60)]">{label}</span>
      </div>
    );
  }

  function advanceKitchenGroup(group, action) {
    mutate((nextDb) => {
      const now = new Date().toISOString();
      group.items.forEach((groupItem) => {
        const item = nextDb.order_items.find((row) => row.order_item_id === groupItem.order_item_id);
        if (!item) return;
        let changed = false;
        if (action === "start" && item.status === "pending") {
          item.status = "cooking";
          item.cooking_at ||= now;
          changed = true;
        }
        if (action === "ready" && item.status === "cooking") {
          item.status = "ready";
          item.ready_at = now;
          changed = true;
        }
        if (action === "expedite" && item.status === "pending") {
          item.status = "ready";
          item.priority_level = "rush";
          item.expedited_at = now;
          item.ready_at = now;
          changed = true;
        }
        if (!changed) return;
        recordStaffActivity(
          nextDb,
          action === "ready" ? "mark_ready" : action === "expedite" ? "expedite_order" : "start_preparing",
          "order_item",
          item.order_item_id,
          `Kitchen group action: ${action}`
        );
        refreshOrderStatus(nextDb, item.order_id);
      });
    }, action === "expedite" ? "Order ticket marked as rush priority." : action === "ready" ? "Order ticket marked ready for service." : "Order ticket moved to preparing.");
  }

  function renderWaiterServe() {
    const groups = waiterServeGroups();
    const readyCount = groups.filter((group) => group.serviceKind === "ready" && group.kind !== "late").length;
    const servingCount = groups.filter((group) => group.serviceKind === "serving" && group.kind !== "late").length;
    const lateCount = groups.filter((group) => group.kind === "late").length;
    const activeItemCount = db.order_items.filter((item) => ["ready", "out_for_serving"].includes(item.status)).length;

    return (
      <main className="relative min-h-screen overflow-hidden bg-[#1D100F] text-[#F8DCDA]">
        <aside className="absolute left-0 top-0 flex h-full w-24 flex-col items-center justify-between border-r border-r-[rgba(90,64,63,0.18)] bg-[#180B0A] px-0 py-8 shadow-[10px_0_30px_0_rgba(0,0,0,0.30)]">
          <p className="font-epilogue text-xs font-extrabold leading-4 tracking-normal">YUM YUM</p>
          <button className="h-10 w-16 rounded-xl border border-[rgba(90,64,63,0.30)] !bg-[#362625] !p-0 text-[10px] font-bold uppercase tracking-[0.08em] text-[#F8DCDA]" type="button" onClick={handleLogout}>
            Log out
          </button>
        </aside>

        <header className="absolute left-24 top-0 flex h-24 w-[calc(100%-6rem)] items-center justify-between bg-[rgba(29,16,15,0.90)] px-16">
          <div>
            <h1 className="font-epilogue text-2xl font-bold uppercase leading-8 tracking-normal text-[#FFFBFC]">Waiter Service Board</h1>
            <p className="font-manrope text-[10px] font-bold uppercase leading-5 tracking-[0.35em] text-[#8BD2DA]">Ready food runner queue</p>
          </div>
          <button className="!bg-transparent !p-0 font-epilogue text-3xl font-bold leading-9 text-[#FFFBFC]" type="button">
            {activeItemCount} ITEMS
          </button>
        </header>

        <section className="absolute bottom-20 left-24 right-0 top-24 overflow-y-auto px-16 py-8">
          {groups.length ? (
            <div className="grid grid-cols-[repeat(auto-fill,300px)] justify-start gap-x-14 gap-y-8 pb-8">
              {groups.map((group) => renderWaiterCard(group))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-[rgba(139,210,218,0.18)] bg-[#172424]">
              <p className="font-epilogue text-2xl font-bold">No food waiting for service.</p>
            </div>
          )}
        </section>

        <footer className="absolute bottom-0 left-24 flex h-20 w-[calc(100%-6rem)] items-center justify-between border-t border-t-[rgba(255,255,255,0.05)] bg-[rgba(24,11,10,0.95)] px-16">
          <div className="flex items-center gap-16">
            {renderKitchenLegend("#8BD2DA", `${readyCount} READY FOR WAITER`)}
            {renderKitchenLegend("#FCD34D", `${servingCount} OUT FOR SERVING`)}
            {renderKitchenLegend("#B8001F", `${lateCount} EXPEDITE NOW`)}
          </div>
        </footer>
      </main>
    );
  }

  function waiterServeGroups() {
    const activeItems = db.order_items
      .filter((item) => ["ready", "out_for_serving"].includes(item.status))
      .sort((a, b) => {
        const orderA = helpers.orderById(a.order_id);
        const orderB = helpers.orderById(b.order_id);
        return new Date(orderA?.ordered_at || a.requested_at) - new Date(orderB?.ordered_at || b.requested_at);
      });
    const groupsByOrder = new Map();

    activeItems.forEach((item) => {
      const order = helpers.orderById(item.order_id);
      const session = order ? helpers.sessionById(order.session_id) : null;
      const table = session ? helpers.tableById(session.table_id) : null;
      const key = item.order_id;
      if (!groupsByOrder.has(key)) {
        groupsByOrder.set(key, { key, order, session, table, items: [] });
      }
      groupsByOrder.get(key).items.push(item);
    });

    return Array.from(groupsByOrder.values()).map((group) => {
      const orderedAt = group.order?.ordered_at || group.items.reduce((oldest, item) => {
        const timestamp = item.requested_at;
        return !oldest || new Date(timestamp) < new Date(oldest) ? timestamp : oldest;
      }, null);
      const hasReady = group.items.some((item) => item.status === "ready");
      const hasRush = group.items.some((item) => item.priority_level === "rush");
      const waitSeconds = secondsBetween(orderedAt);
      const waitMinutes = Math.floor(waitSeconds / 60);
      const serviceKind = hasReady ? "ready" : "serving";
      const kind = hasRush || waitSeconds >= 15 * 60 ? "late" : serviceKind;
      return { ...group, orderedAt, waitSeconds, waitMinutes, serviceKind, kind, hasRush };
    }).sort((a, b) => {
      const priority = { late: 0, ready: 1, serving: 2 };
      return priority[a.kind] - priority[b.kind] || new Date(a.orderedAt) - new Date(b.orderedAt);
    });
  }

  function renderWaiterCard(group) {
    const tableCode = group.table?.table_code?.replace(/\D/g, "") || group.table?.table_code || "--";
    const nextAction = group.serviceKind === "ready" ? "send" : "served";
    const actionLabel = group.serviceKind === "ready" ? "OUT FOR SERVING" : "MARK SERVED";
    const shortages = group.items.flatMap((item) => item.status === "out_for_serving" ? stockShortages(item) : []);
    const disabled = nextAction === "served" && shortages.length > 0;
    const theme = {
      ready: {
        card: "border-[rgba(139,210,218,0.32)] bg-[#172424] shadow-[0_0_30px_0_rgba(139,210,218,0.16)]",
        header: "bg-[#8BD2DA] text-[#000]",
        label: "text-[rgba(0,0,0,0.60)]",
        time: "text-[#000]",
        qty: "text-[#8BD2DA]",
        button: "!bg-[#8BD2DA] !text-[#001314]"
      },
      serving: {
        card: "border-[rgba(252,211,77,0.20)] bg-[#362625] shadow-[0_0_30px_0_rgba(252,211,77,0.15)]",
        header: "bg-[#FCD34D] text-[#000]",
        label: "text-[rgba(0,0,0,0.60)]",
        time: "text-[#000]",
        qty: "text-[#FCD34D]",
        button: "!bg-[#FCD34D] !text-[#000]"
      },
      late: {
        card: "border-[rgba(184,0,31,0.55)] bg-[#180B0A] shadow-[0_0_30px_0_rgba(184,0,31,0.42)]",
        header: "border-b border-b-[rgba(184,0,31,0.25)] bg-[#B8001F] text-[#FFF]",
        label: "text-[#FFF]",
        time: "text-[#FFF]",
        qty: "text-[#FFB4AB]",
        button: "!bg-[#B8001F] !text-[#FFF]"
      }
    }[group.kind];
    const statusLabel = group.kind === "late" ? "EXPEDITE NOW!" : group.serviceKind === "ready" ? "READY" : "SERVING";

    return (
      <article className={`flex h-[620px] w-[300px] flex-col justify-between overflow-hidden rounded-lg border ${theme.card}`} key={group.key}>
        <div className={`flex h-[130px] shrink-0 items-center justify-between p-8 ${theme.header}`}>
          <div className="flex flex-col items-start gap-1">
            <p className={`font-manrope text-[10px] font-bold leading-[14.4px] tracking-[0.5em] ${theme.label}`}>TABLE</p>
            <p className="font-epilogue text-5xl font-bold leading-[48px]">{tableCode.padStart(2, "0")}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <p className={`font-manrope text-[10px] font-bold uppercase leading-[14.4px] tracking-[0.35em] ${theme.label}`}>{statusLabel}</p>
            <p className={`font-epilogue text-2xl font-bold leading-8 ${theme.time}`}>{elapsedTimer(group.orderedAt)}</p>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-start overflow-hidden p-8">
          <div className="flex w-full flex-col items-start gap-8">
            {group.items.map((item) => {
              const menu = helpers.menuById(item.menu_id);
              const detail = item.special_instructions || menu?.description || "";
              return (
                <div className="flex w-full items-start gap-5" key={item.order_item_id}>
                  <div className="flex w-12 flex-col items-start">
                    <p className={`font-epilogue text-3xl font-black leading-9 ${theme.qty}`}>x{item.quantity}</p>
                  </div>
                  <div className="flex w-full flex-col items-start gap-1.5">
                    <p className="w-full font-epilogue text-xl uppercase leading-7 tracking-normal text-[#F8DCDA]">{menu?.name || item.menu_id}</p>
                    {detail ? <p className="w-full font-manrope text-sm leading-5 text-[#FFF]">{detail}</p> : null}
                    <p className={`w-full font-manrope text-[10px] font-bold uppercase leading-4 tracking-[0.2em] ${group.kind === "late" ? "text-[#FFB4AB]" : item.status === "ready" ? "text-[#8BD2DA]" : "text-[#FCD34D]"}`}>
                      {group.kind === "late" ? "EXPEDITE NOW!" : item.status === "ready" ? "READY FOR WAITER" : "OUT FOR SERVING"}
                    </p>
                  </div>
                </div>
              );
            })}
            {shortages.length ? <p className="font-manrope text-xs font-bold uppercase tracking-[0.18em] text-[#FFB4AB]">Low stock: {shortages.map((shortage) => shortage.ingredient).join(", ")}</p> : null}
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col items-start p-8">
          <button className={`flex w-full cursor-pointer items-center justify-center rounded px-0 py-5 font-epilogue text-lg font-black leading-7 tracking-[0.2em] disabled:cursor-not-allowed disabled:opacity-50 ${theme.button}`} type="button" disabled={disabled} onClick={() => safe(() => advanceWaiterGroup(group, nextAction))}>
            {actionLabel}
          </button>
        </div>
      </article>
    );
  }

  function advanceWaiterGroup(group, action) {
    mutate((nextDb) => {
      const now = new Date().toISOString();
      const liveItems = group.items.map((groupItem) => nextDb.order_items.find((item) => item.order_item_id === groupItem.order_item_id)).filter(Boolean);

      if (action === "send") {
        const readyItems = liveItems.filter((item) => item.status === "ready");
        if (!readyItems.length) throw new Error("This ticket has already left the pass.");
        readyItems.forEach((item) => {
          item.status = "out_for_serving";
          item.out_for_serving_at = now;
          recordStaffActivity(nextDb, "send_to_table", "order_item", item.order_item_id, "Waiter picked up item; customer iPad now shows out for serving");
          refreshOrderStatus(nextDb, item.order_id);
        });
        return;
      }

      const servingItems = liveItems.filter((item) => item.status === "out_for_serving");
      if (!servingItems.length) throw new Error("Send this ticket out before marking it served.");
      const shortages = servingItems.flatMap((item) => stockShortages(item, nextDb).map((shortage) => ({ ...shortage, item })));
      if (shortages.length) throw new Error(`Stock too low for ${shortages.map((shortage) => shortage.ingredient).join(", ")}.`);

      servingItems.forEach((item) => {
        recipesForMenu(item.menu_id, nextDb).forEach((recipe) => {
          const ingredient = nextDb.inventory_items.find((row) => row.ingredient_id === recipe.ingredient_id);
          const usedQuantity = recipe.quantity_used * item.quantity;
          ingredient.quantity_on_hand = Number((ingredient.quantity_on_hand - usedQuantity).toFixed(2));
          syncMenuAvailabilityForStock(nextDb, ingredient.ingredient_id);
          nextDb.inventory_transactions.push({
            transaction_id: nextId(nextDb, "transaction"),
            ingredient_id: ingredient.ingredient_id,
            order_item_id: item.order_item_id,
            transaction_type: "usage",
            quantity_change: -usedQuantity,
            unit_cost_snapshot: ingredient.unit_cost,
            occurred_at: now
          });
        });
        item.status = "served";
        item.served_at = now;
        recordStaffActivity(nextDb, "serve_item", "order_item", item.order_item_id, "Waiter marked item served and inventory was deducted");
        refreshOrderStatus(nextDb, item.order_id);
      });
    }, action === "send" ? "Customer iPad updated: food is out for serving." : "Ticket served and removed from waiter board.");
  }

  function renderManagerDashboard() {
    const metrics = calculateDashboardMetrics();
    const tables = db.restaurant_tables;
    return (
      <main className="min-h-screen w-full bg-[#170B0B] pl-64 font-manrope text-[#F7DCDC]">
        <aside className="fixed left-0 top-0 z-20 flex h-screen w-64 flex-col border-r border-[#594040] bg-[#261818] px-4 py-6">
          <div className="px-4 pb-8">
            <h1 className="font-epilogue text-2xl font-semibold leading-8 text-[#FFB3B3]">Yum Yum</h1>
            <p className="text-xs font-medium leading-4 tracking-[0.13em] text-[#E1BEBE]/70">Buffet Management</p>
          </div>

          <nav className="flex flex-1 flex-col gap-2">
            {renderManagerNavButton("Dashboard", true, () => setView("manager-dashboard"), (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M10 6V0H18V6H10ZM0 10V0H8V10H0ZM10 18V8H18V18H10ZM0 18V12H8V18H0ZM2 8H6V2H2V8ZM12 16H16V10H12V16ZM12 4H16V2H12V4ZM2 16H6V14H2V16Z" fill="currentColor" />
              </svg>
            ))}
            {renderManagerNavButton("Inventory", false, () => setView("manager-inventory"), (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M3 20C2.45 20 1.97917 19.8042 1.5875 19.4125C1.19583 19.0208 1 18.55 1 18V6.725C0.7 6.54167 0.458333 6.30417 0.275 6.0125C0.0916667 5.72083 0 5.38333 0 5V2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0H18C18.55 0 19.0208 0.195833 19.4125 0.5875C19.8042 0.979167 20 1.45 20 2V5C20 5.38333 19.9083 5.72083 19.725 6.0125C19.5417 6.30417 19.3 6.54167 19 6.725V18C19 18.55 18.8042 19.0208 18.4125 19.4125C18.0208 19.8042 17.55 20 17 20H3ZM3 7V18H17V7H3ZM2 5H18V2H2V5ZM7 12H13V10H7V12Z" fill="currentColor" />
              </svg>
            ))}
          </nav>

          <div className="border-t border-[#594040] pt-6">
            {renderManagerNavButton("Logout", false, handleLogout, (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M2 18C1.45 18 0.979167 17.8042 0.5875 17.4125C0.195833 17.0208 0 16.55 0 16V2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0H9V2H2V16H9V18H2ZM13 14L11.625 12.55L14.175 10H6V8H14.175L11.625 5.45L13 4L18 9L13 14Z" fill="currentColor" />
              </svg>
            ))}
          </div>
        </aside>

        <section className="min-h-screen">
          <header className="flex h-20 items-center justify-between bg-[#1D1010] px-8">
            <div>
              <h2 className="font-epilogue text-2xl font-bold leading-8 text-[#F7DCDC]">Operational Dashboard</h2>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A6192E]">{metrics.rangeLabel} insights</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 rounded-xl border border-[#594040] bg-[#261818] p-1">
                <button
                  className={`!rounded-xl !px-4 !py-1 !text-xs !font-medium !tracking-[0.13em] ${managerRange === "today" ? "!bg-[#D63F4D] !text-[#140001]" : "!bg-transparent !text-[#E1BEBE]"}`}
                  type="button"
                  onClick={() => setManagerRange("today")}
                >
                  TODAY
                </button>
                <button
                  className={`!rounded-xl !px-4 !py-1 !text-xs !font-medium !tracking-[0.13em] ${managerRange === "week" ? "!bg-[#D63F4D] !text-[#140001]" : "!bg-transparent !text-[#E1BEBE]"}`}
                  type="button"
                  onClick={() => setManagerRange("week")}
                >
                  THIS WEEK
                </button>
              </div>
            </div>
          </header>

          <div className="grid gap-8 p-8">
            <section className="grid grid-cols-3 gap-8">
              {renderManagerKpi("AVG. COST PER HEAD", formatBaht(metrics.costPerHead), "", "", "accent")}
              {renderManagerKpi("TOTAL CUSTOMERS", metrics.guests.toLocaleString(), "", "", "neutral")}
              {renderManagerKpi("AVG. SERVING SPEED", formatMinutesForManager(metrics.avgServiceMinutes), "", "", "neutral")}
            </section>

            <section className="grid grid-cols-[minmax(0,1.45fr)_minmax(320px,0.7fr)] gap-8">
              <article className="rounded-lg border border-[rgba(89,64,64,0.30)] bg-[rgba(42,28,28,0.40)] p-8">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase leading-4 tracking-[0.1em] text-[#F7DCDC]">Hourly Customer Traffic</p>
                  <div className="flex items-center gap-2 text-xs text-[#E1BEBE]">
                    <span className="h-3 w-3 rounded-full bg-[#D63F4D]" />
                    Peak Hour ({metrics.peakHour === "-" ? "No data" : `${metrics.peakHour} · ${metrics.peakGuests} guests`})
                  </div>
                </div>
                <div className="relative mt-8 flex h-64 items-end gap-8 px-4">
                  {metrics.traffic.map((row) => (
                    <div
                      className="group relative z-10 flex h-full flex-1 flex-col justify-end gap-4 outline-none"
                      key={row.hour}
                      tabIndex={0}
                      aria-label={`${String(row.hour).padStart(2, "0")}:00 has ${row.guests} guests${row.isPeak ? ", peak hour" : ""}`}
                      style={{ "--bar-height": `${row.percent}%` }}
                    >
                      <div className="pointer-events-none absolute bottom-[calc(var(--bar-height)+2.25rem)] left-1/2 z-20 -translate-x-1/2 rounded bg-[#D63F4D] px-3 py-1 text-xs font-black text-white opacity-0 shadow-[0_10px_24px_rgba(214,63,77,0.35)] transition-opacity group-hover:opacity-100 group-focus:opacity-100">
                        {row.guests} guests
                      </div>
                      <div
                        className={`${row.isPeak ? "bg-[#D63F4D] shadow-[0_0_28px_rgba(214,63,77,0.55)] ring-1 ring-[#FFB3B3]/40" : "bg-[#594040]/30"} rounded-sm transition-all duration-150 group-hover:-translate-y-1 group-hover:brightness-125 group-focus:-translate-y-1 group-focus:brightness-125`}
                        style={{ height: `${row.percent}%` }}
                        title={`${row.guests} guests${row.isPeak ? " - peak hour" : ""}`}
                      />
                      <p className={`text-center text-[10px] leading-6 ${row.isPeak ? "font-bold text-[#FFB3B3]" : "text-[#E1BEBE]"}`}>
                        {String(row.hour).padStart(2, "0")}:00
                      </p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-lg border border-[rgba(89,64,64,0.30)] bg-[rgba(42,28,28,0.40)] p-8">
                <p className="pb-8 text-xs font-medium uppercase leading-4 tracking-[0.1em] text-[#F7DCDC]">Top Menu Performance</p>
                {metrics.topMenu.length ? renderManagerTopMenuBarChart(metrics.topMenu, metrics.maxTopMenuQty) : <p className="text-sm text-[#E1BEBE]">No menu orders match the current filter.</p>}
              </article>
            </section>

            <section className="grid grid-cols-[minmax(0,1fr)_minmax(390px,1fr)] gap-8">
              <article className="rounded-lg border border-[rgba(89,64,64,0.30)] bg-[rgba(42,28,28,0.40)] p-8">
                <div className="flex items-center justify-between pb-8">
                  <p className="text-xs font-medium uppercase leading-4 tracking-[0.1em] text-[#F7DCDC]">Ingredient Consumption Tracker</p>
                  <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.12em] text-[#E1BEBE]/70">
                    <span className="flex items-center gap-2"><span className="h-2 w-5 rounded-full bg-[#D63F4D]" />Used</span>
                    <span className="flex items-center gap-2"><span className="h-2 w-5 rounded-full bg-[#8BD2DA]" />Remaining</span>
                  </div>
                </div>
                <div className="grid">
                  <div className="grid grid-cols-[1.1fr_1.7fr_0.75fr] gap-5 border-b border-[#594040] py-4 text-[10px] font-bold uppercase text-[#E1BEBE]">
                    <span>Ingredient</span>
                    <span>Used + Remaining Stock</span>
                    <span className="text-right">Status</span>
                  </div>
                  <div className="max-h-[460px] overflow-y-auto pr-2">
                    {metrics.ingredientUsage.length ? metrics.ingredientUsage.map((row) => (
                    <div className="grid grid-cols-[1.1fr_1.7fr_0.75fr] items-center gap-5 border-b border-[#594040]/30 py-4" key={row.id}>
                      <div>
                        <p className="text-sm font-bold leading-5 text-[#F7DCDC]">{row.name}</p>
                        <p className="text-[10px] uppercase tracking-[0.12em] text-[#E1BEBE]/60">{row.unit}</p>
                      </div>
                      {renderManagerStackedStockBar(row)}
                      <p className={`text-right text-sm font-bold leading-5 ${row.status === "Optimal" ? "text-[#8BD2DA]" : "text-[#FFB3B3]"}`}>{row.status}</p>
                    </div>
                    )) : <p className="py-6 text-sm text-[#E1BEBE]">No ingredients found in inventory.</p>}
                  </div>
                </div>
              </article>

              <article className="rounded-lg border border-[rgba(89,64,64,0.30)] bg-[rgba(42,28,28,0.40)] p-8">
                <div className="flex items-center justify-between pb-8">
                  <p className="text-xs font-medium uppercase leading-4 tracking-[0.1em] text-[#F7DCDC]">Live Table Status</p>
                  <span className="rounded-xl bg-[#D63F4D]/20 px-4 py-1 text-sm font-bold text-[#D63F4D]">Occupied: {metrics.tableStateCounts.occupied}/{tables.length} Tables</span>
                </div>
                <div className="grid grid-cols-5 gap-4">
                  {tables.map((table) => renderManagerTableTile(table))}
                </div>
                <div className="mt-8 flex justify-between border-t border-[#594040] pt-6 text-xs uppercase tracking-[0.02em] text-[#E1BEBE]">
                  <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[#D63F4D]" />Occupied</span>
                  <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[#362626]" />Available</span>
                  <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[#8BD2DA]" />Needs Clearing</span>
                </div>
              </article>
            </section>
          </div>
        </section>

      </main>
    );
  }

  function renderManagerNavButton(label, active, onClick, icon) {
    return (
      <button
        className={`flex w-full items-center gap-4 !rounded-lg !px-4 !py-4 !text-xs !font-medium !tracking-[0.13em] ${active ? "!bg-[#792E32] !text-[#FF999A]" : "!bg-transparent !text-[#E1BEBE]"}`}
        key={label}
        type="button"
        onClick={onClick}
      >
        {icon}
        <span>{label}</span>
      </button>
    );
  }

  function renderManagerKpi(label, value, detail, badge, tone) {
    const valueColor = tone === "accent" ? "text-[#FFB3B3]" : "text-[#F7DCDC]";
    return (
      <article className="rounded-lg border border-[rgba(89,64,64,0.30)] bg-[rgba(42,28,28,0.40)] p-8">
        <p className="text-xs font-medium uppercase leading-4 tracking-[0.1em] text-[#E1BEBE]">{label}</p>
        <div className="mt-2 flex items-center gap-2">
          <p className={`font-epilogue text-4xl leading-[45px] ${valueColor}`}>{value}</p>
          {badge ? <span className={`${tone === "teal" ? "bg-[#388188]/20 text-[#8BD2DA]" : "bg-transparent text-[#8BD2DA]"} rounded-xl px-2 py-1 text-[10px] font-bold leading-6`}>{badge}</span> : null}
        </div>
        {detail ? <p className="mt-1 text-sm leading-5 text-[#E1BEBE]">{detail}</p> : null}
      </article>
    );
  }

  function renderManagerProgressRow(label, value, percent, key) {
    return (
      <div className="grid gap-1" key={key}>
        <div className="flex justify-between gap-4 text-sm leading-5">
          <p className="font-bold text-[#F7DCDC]">{label}</p>
          <p className="shrink-0 text-[#E1BEBE]">{value}</p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#2A1C1C]">
          <div className="h-full rounded-full bg-[#D63F4D]" style={{ width: `${percent}%`, opacity: percent > 70 ? 1 : 0.7 }} />
        </div>
      </div>
    );
  }

  function renderManagerTopMenuBarChart(rows, maxOrders) {
    const midpoint = Math.ceil(maxOrders / 2);
    const chartWidth = Math.max(360, rows.length * 92);
    return (
      <div className="overflow-x-auto pb-2">
        <div className="grid h-[292px] grid-cols-[2rem_minmax(0,1fr)] gap-4" style={{ minWidth: `${chartWidth}px` }}>
          <div className="flex h-56 flex-col justify-between text-right text-[10px] leading-none text-[#E1BEBE]/60">
            <span>{maxOrders}</span>
            <span>{midpoint}</span>
            <span>0</span>
          </div>
          <div
            className="grid h-56 items-end gap-4 border-b border-l border-[#594040]/50 pl-4"
            style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(60px, 1fr))` }}
          >
            {rows.map((row) => (
              <div
                className="group relative flex h-full flex-col justify-end outline-none"
                key={row.menu_id}
                tabIndex={0}
                title={`${row.quantity} orders`}
                aria-label={`${row.name} has ${row.quantity} orders`}
              >
                <div className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 rounded bg-[#D63F4D] px-3 py-1 text-[10px] font-black text-white opacity-0 shadow-[0_10px_24px_rgba(214,63,77,0.35)] transition-opacity group-hover:opacity-100 group-focus:opacity-100">
                  {row.quantity} orders
                </div>
                <div className="mb-2 text-center text-sm font-black leading-5 text-[#F7DCDC]">{row.quantity}</div>
                <div
                  className="w-full rounded-t bg-[#D63F4D] shadow-[0_0_18px_rgba(214,63,77,0.24)] transition-all duration-150 group-hover:brightness-125 group-focus:brightness-125"
                  style={{ height: `${row.percent}%` }}
                />
              </div>
            ))}
          </div>
          <div />
          <div
            className="grid gap-4 pl-4 pt-3"
            style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(60px, 1fr))` }}
          >
            {rows.map((row) => (
              <div className="grid gap-1 text-center" key={`${row.menu_id}-label`}>
                <p className="line-clamp-2 text-[10px] font-bold leading-4 text-[#F7DCDC]" title={row.name}>{row.name}</p>
                <p className="text-[9px] uppercase tracking-[0.12em] text-[#E1BEBE]/60">{row.category}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderManagerStackedStockBar(row) {
    const usedDetail = `${formatQuantity(row.quantity)} ${row.unit} used`;
    const remainingDetail = `${formatQuantity(row.remaining)} ${row.unit} remaining`;
    const combinedDetail = `${usedDetail} · ${remainingDetail}`;
    return (
      <div
        className="group relative grid gap-2 outline-none"
        tabIndex={0}
        title={combinedDetail}
        aria-label={combinedDetail}
      >
        <div className="flex items-center justify-between gap-4 text-[10px] font-bold leading-4">
          <span className="text-[#FFB3B3]">{usedDetail}</span>
          <span className="text-right text-[#8BD2DA]">{remainingDetail}</span>
        </div>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-[#2A1C1C]">
          <div
            className="h-full bg-[#D63F4D]"
            style={{ width: `${row.usedSharePercent}%` }}
            title={`${usedDetail} (${row.usedSharePercent}%)`}
          />
          <div
            className="h-full bg-[#8BD2DA]"
            style={{ width: `${row.remainingSharePercent}%` }}
            title={`${remainingDetail} (${row.remainingSharePercent}%)`}
          />
        </div>
        <div className="pointer-events-none absolute -top-8 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded bg-[#2A1C1C] px-3 py-1 text-[10px] font-black text-white opacity-0 shadow-[0_10px_24px_rgba(0,0,0,0.35)] transition-opacity group-hover:opacity-100 group-focus:opacity-100">
          {combinedDetail}
        </div>
      </div>
    );
  }

  function renderManagerTableTile(table) {
    const state = cashierTableState(table);
    const baseClasses = "relative flex h-[67px] items-center justify-center rounded text-xs font-bold";
    const stateClasses = state === "cleaning"
      ? "bg-[#8BD2DA] text-[#140001]"
      : state === "ready"
        ? "border border-[#594040] bg-[#362626] text-[#E1BEBE]"
        : "bg-[#D63F4D] text-[#140001]";
    return (
      <div className={`${baseClasses} ${stateClasses}`} key={table.table_id} title={`${tableDisplayCode(table)} ${state}`}>
        T{Number(table.table_code)}
        {state === "cleaning" ? <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#1D1010] bg-[#8BD2DA]" /> : null}
      </div>
    );
  }

  function formatBaht(value) {
    return `฿${Math.round(value || 0).toLocaleString()}`;
  }

  function formatMinutesForManager(value) {
    const safeValue = Math.max(0, Math.round(value || 0));
    if (safeValue >= 60) {
      const hours = Math.floor(safeValue / 60);
      const minutes = safeValue % 60;
      return `${hours}h ${minutes}m`;
    }
    return `${safeValue} Mins`;
  }

  function formatQuantity(value) {
    return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });
  }

  function renderManagerInventory() {
    const ingredients = db.inventory_items.filter((item) => !item.deleted_at);
    const filteredIngredients = ingredients.filter((item) => {
      const query = inventorySearch.trim().toLowerCase();
      if (!query) return true;
      return [item.name, inventoryCategory(item), item.ingredient_id, item.unit].some((value) => String(value).toLowerCase().includes(query));
    });
    const lowStockCount = ingredients.filter((item) => item.quantity_on_hand > 0 && item.quantity_on_hand <= item.reorder_level).length;
    const outOfStockCount = ingredients.filter((item) => item.quantity_on_hand <= 0).length;
    const totalInventoryValue = ingredients.reduce((sum, item) => sum + item.quantity_on_hand * item.unit_cost, 0);
    const pendingKitchenCount = db.order_items.filter((item) => ["pending", "cooking", "ready", "out_for_serving"].includes(item.status)).length;
    const inventoryNotice = notice && !notice.message.startsWith("Logged in") ? notice : null;
    return (
      <main className="min-h-screen w-full bg-[#1D1010] pl-64 font-manrope text-[#F7DCDC]">
        <aside className="fixed left-0 top-0 z-20 flex h-screen w-64 flex-col bg-[#261818] px-4 py-6">
          <div className="px-4 pb-8">
            <h1 className="font-epilogue text-2xl font-semibold leading-8 tracking-normal text-[#FFB3B3]">Yum Yum</h1>
            <p className="text-xs font-medium leading-4 tracking-[0.13em] text-[#E1BEBE]/70">Buffet Management</p>
          </div>

          <nav className="flex flex-1 flex-col gap-2">
            {renderManagerNavButton("Dashboard", false, () => setView("manager-dashboard"), (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M10 6V0H18V6H10ZM0 10V0H8V10H0ZM10 18V8H18V18H10ZM0 18V12H8V18H0ZM2 8H6V2H2V8ZM12 16H16V10H12V16ZM12 4H16V2H12V4ZM2 16H6V14H2V16Z" fill="currentColor" />
              </svg>
            ))}
            {renderManagerNavButton("Inventory", true, () => setView("manager-inventory"), (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M3 20C2.45 20 1.97917 19.8042 1.5875 19.4125C1.19583 19.0208 1 18.55 1 18V6.725C0.7 6.54167 0.458333 6.30417 0.275 6.0125C0.0916667 5.72083 0 5.38333 0 5V2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0H18C18.55 0 19.0208 0.195833 19.4125 0.5875C19.8042 0.979167 20 1.45 20 2V5C20 5.38333 19.9083 5.72083 19.725 6.0125C19.5417 6.30417 19.3 6.54167 19 6.725V18C19 18.55 18.8042 19.0208 18.4125 19.4125C18.0208 19.8042 17.55 20 17 20H3ZM3 7V18H17V7H3ZM2 5H18V2H2V5ZM7 12H13V10H7V12Z" fill="currentColor" />
              </svg>
            ))}
          </nav>

          <div className="border-t border-[#594040] pt-6">
            {renderManagerNavButton("Logout", false, handleLogout, (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M2 18C1.45 18 0.979167 17.8042 0.5875 17.4125C0.195833 17.0208 0 16.55 0 16V2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0H9V2H2V16H9V18H2ZM13 14L11.625 12.55L14.175 10H6V8H14.175L11.625 5.45L13 4L18 9L13 14Z" fill="currentColor" />
              </svg>
            ))}
          </div>
        </aside>

        <section className="min-h-screen">
          <header className="flex h-[89px] items-center justify-between bg-[#1D1010] px-6">
            <div>
              <h2 className="font-epilogue text-2xl font-semibold leading-8 text-[#FFB3B3]">Inventory Management</h2>
              <p className="mt-1 text-xs font-bold leading-4 tracking-[0.13em] text-[#FFB3B3]">STOCKS</p>
            </div>
          </header>

          <div className="flex min-h-[calc(100vh-89px)] flex-col justify-between">
            <div className="grid gap-6 p-6">
              <div className="flex items-end justify-between gap-6">
                <div className="relative flex max-w-xl flex-1">
                  <input
                    className="!min-h-[58px] !rounded-lg !border-0 !bg-[#413131] !py-[17px] !pl-12 !pr-4 !text-base !text-[#F7DCDC] !outline-none placeholder:!text-[#E1BEBE]"
                    placeholder="Search items, ingredient ID..."
                    value={inventorySearch}
                    onChange={(event) => setInventorySearch(event.target.value)}
                  />
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="absolute left-4 top-5 h-5 w-5" aria-hidden="true">
                    <path d="M16.6 18L10.3 11.7C9.8 12.1 9.225 12.4167 8.575 12.65C7.925 12.8833 7.23333 13 6.5 13C4.68333 13 3.14583 12.3708 1.8875 11.1125C0.629167 9.85417 0 8.31667 0 6.5C0 4.68333 0.629167 3.14583 1.8875 1.8875C3.14583 0.629167 4.68333 0 6.5 0C8.31667 0 9.85417 0.629167 11.1125 1.8875C12.3708 3.14583 13 4.68333 13 6.5C13 7.23333 12.8833 7.925 12.65 8.575C12.4167 9.225 12.1 9.8 11.7 10.3L18 16.6L16.6 18ZM6.5 11C7.75 11 8.8125 10.5625 9.6875 9.6875C10.5625 8.8125 11 7.75 11 6.5C11 5.25 10.5625 4.1875 9.6875 3.3125C8.8125 2.4375 7.75 2 6.5 2C5.25 2 4.1875 2.4375 3.3125 3.3125C2.4375 4.1875 2 5.25 2 6.5C2 7.75 2.4375 8.8125 3.3125 9.6875C4.1875 10.5625 5.25 11 6.5 11Z" fill="#E1BEBE" />
                  </svg>
                </div>

                <button
                  className="flex items-center gap-4 !rounded-lg !bg-[#D63F4D] !px-8 !py-4 !text-[#140001]"
                  type="button"
                  onClick={() => setInventoryAddOpen((isOpen) => !isOpen)}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M6 8H0V6H6V0H8V6H14V8H8V14H6V8Z" fill="currentColor" />
                  </svg>
                  <span className="text-base font-bold leading-6">ADD NEW ITEM</span>
                </button>
              </div>

              {inventoryNotice ? <div className="rounded-lg border-l-4 border-[#8BD2DA] bg-[#203A3A] p-4 text-[#D9FFFF]">{inventoryNotice.message}</div> : null}

              {inventoryAddOpen ? (
                <form className="grid grid-cols-6 gap-4 rounded-xl border border-[#594040]/30 bg-[#2A1C1C] p-5" onSubmit={(event) => safe(() => handleAddIngredient(event))}>
                  <input className="!border-[#594040] !bg-[#1D1010] !text-[#F7DCDC]" name="name" placeholder="Item name" required />
                  <input className="!border-[#594040] !bg-[#1D1010] !text-[#F7DCDC]" name="unit" placeholder="Unit" defaultValue="g" required />
                  <input className="!border-[#594040] !bg-[#1D1010] !text-[#F7DCDC]" name="quantity_on_hand" placeholder="Qty" type="number" step="0.01" min="0" required />
                  <input className="!border-[#594040] !bg-[#1D1010] !text-[#F7DCDC]" name="reorder_level" placeholder="Reorder" type="number" step="0.01" min="0" required />
                  <input className="!border-[#594040] !bg-[#1D1010] !text-[#F7DCDC]" name="unit_cost" placeholder="Unit cost" type="number" step="0.01" min="0" required />
                  <button className="!rounded-lg !bg-[#792E32] !px-5 !py-3 !font-bold !text-[#FF999A]" type="submit">SAVE ITEM</button>
                </form>
              ) : null}

              <section className="overflow-hidden rounded-xl border border-[#594040]/30 bg-[#2A1C1C]/70">
                <div className="grid grid-cols-[1.25fr_0.75fr_0.8fr_0.85fr_0.9fr_1.95fr] items-center border-b border-[#594040] bg-[#362626] text-xs font-medium uppercase leading-4 tracking-[0.1em] text-[#E1BEBE]">
                  <p className="px-6 py-6">Item Name</p>
                  <p className="px-6 py-6">Category</p>
                  <p className="px-6 py-6">Ingredient ID</p>
                  <p className="px-6 py-6">Qty On Hand</p>
                  <p className="px-6 py-6 text-center">Status</p>
                  <p className="px-6 py-6 text-right">Action</p>
                </div>
                <div className="divide-y divide-[#594040]">
                  {filteredIngredients.length ? filteredIngredients.map((item) => renderInventoryRow(item)) : <p className="px-6 py-8 text-[#E1BEBE]">No inventory items match the current search.</p>}
                </div>
              </section>

              <section className="grid grid-cols-4 gap-6">
                {renderInventoryStat("TOTAL VALUE", formatBaht(totalInventoryValue), "text-[#FFB3B3]")}
                {renderInventoryStat("LOW STOCK ITEMS", lowStockCount, "text-[#FFB3B3]")}
                {renderInventoryStat("OUT OF STOCK", outOfStockCount, "text-[#FFB4AB]")}
                {renderInventoryStat("ORDERS PENDING", pendingKitchenCount, "text-[#8BD2DA]")}
              </section>
            </div>

            <footer className="flex items-center justify-between border-t border-[#594040] bg-[#2A1C1C] px-8 py-4">
              <div className="flex items-center gap-8">
                <p className="flex items-center gap-2 text-xs leading-4 text-[#E1BEBE]"><span className="h-3 w-3 rounded-full bg-[#A88989]" />Database Connected</p>
                <p className="flex items-center gap-2 text-xs leading-4 text-[#E1BEBE]"><span className="h-3 w-3 rounded-full bg-[#FFB3B3]" />Last synced: live demo</p>
              </div>
              <button className="flex items-center gap-4 !rounded-lg !bg-[#413131] !px-8 !py-2 !text-[#FFB3B3]" type="button" onClick={exportInventoryReport}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M8 12L3 7L4.4 5.55L7 8.15V0H9V8.15L11.6 5.55L13 7L8 12ZM2 16C1.45 16 0.979167 15.8042 0.5875 15.4125C0.195833 15.0208 0 14.55 0 14V11H2V14H14V11H16V14C16 14.55 15.8042 15.0208 15.4125 15.4125C15.0208 15.8042 14.55 16 14 16H2Z" fill="currentColor" />
                </svg>
                <span className="text-base font-bold leading-6">EXPORT INVENTORY REPORT</span>
              </button>
            </footer>
          </div>
        </section>
      </main>
    );
  }

  function renderInventoryRow(item) {
    const status = inventoryStatus(item);
    const quantity = inventoryDisplayQuantity(item);
    const linkedMenus = menuItemsForIngredient(item.ingredient_id);
    const kioskOn = linkedMenus.length > 0 && linkedMenus.every((menu) => menu.is_available);
    const canToggle = linkedMenus.length > 0 && (kioskOn || item.quantity_on_hand > 0);
    return (
      <div className="grid grid-cols-[1.25fr_0.75fr_0.8fr_0.85fr_0.9fr_1.95fr] items-center pr-6" key={item.ingredient_id}>
        <div className="px-6 py-6">
          <p className="text-base font-bold leading-6 text-[#F7DCDC]">{item.name}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[#E1BEBE]/60">{linkedMenus.length ? `${linkedMenus.length} iPad menu link${linkedMenus.length === 1 ? "" : "s"}` : "No iPad link"}</p>
        </div>
        <p className="px-6 py-6 text-base leading-6 text-[#E1BEBE]">{inventoryCategory(item)}</p>
        <p className="px-6 py-6 font-mono text-sm leading-5 text-[#F7DCDC]/60">{item.ingredient_id}</p>
        <div className="flex items-center gap-3 px-6 py-6">
          <p className={`text-base font-bold leading-6 ${status.key === "in" ? "text-[#F7DCDC]" : "text-[#FFB3B3]"}`}>{quantity.amount}</p>
          <p className="text-xs leading-4 text-[#E1BEBE]">{quantity.unit}</p>
        </div>
        <div className="flex justify-center px-6 py-6">
          {renderInventoryStatusPill(status)}
        </div>
        <div className="flex items-center justify-end gap-3">
          <form className="flex items-center gap-2" onSubmit={(event) => safe(() => handleAdjustStock(event))}>
            <input name="ingredient_id" type="hidden" value={item.ingredient_id} />
            <input
              className="!h-10 !min-h-0 !w-20 !rounded !border !border-[#594040] !bg-[#261818] !px-2 !py-1 !text-right !text-sm !font-bold !text-[#F7DCDC]"
              min="0"
              name="quantity"
              placeholder="Qty"
              step={item.unit === "pcs" ? "1" : "0.01"}
              type="number"
              aria-label={`Stock quantity for ${item.name}`}
            />
            <select
              className="!h-10 !min-h-0 !w-36 !rounded !border !border-[#594040] !bg-[#261818] !px-2 !py-1 !text-xs !font-bold !text-[#F7DCDC]"
              defaultValue="restock"
              name="movement_type"
              aria-label={`Stock movement type for ${item.name}`}
            >
              <option value="restock">Restock +</option>
              <option value="adjustment_add">Adjust +</option>
              <option value="adjustment_remove">Adjust -</option>
              <option value="waste">Waste -</option>
            </select>
            <button className="!h-10 !rounded !bg-[#792E32] !px-3 !py-0 !text-xs !font-black !text-[#FFB3B3]" type="submit">
              APPLY
            </button>
          </form>
          <button className="flex !h-9 !w-9 items-center justify-center !rounded !bg-transparent !p-0 !text-[#F7DCDC]" type="button" onClick={() => editIngredientName(item.ingredient_id)} aria-label={`Edit ${item.name}`}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M2 16H3.425L13.2 6.225L11.775 4.8L2 14.575V16ZM0 18V13.75L13.2 0.575C13.4 0.391667 13.6208 0.25 13.8625 0.15C14.1042 0.05 14.3583 0 14.625 0C14.8917 0 15.15 0.05 15.4 0.15C15.65 0.25 15.8667 0.4 16.05 0.6L17.425 2C17.625 2.18333 17.7708 2.4 17.8625 2.65C17.9542 2.9 18 3.15 18 3.4C18 3.66667 17.9542 3.92083 17.8625 4.1625C17.7708 4.40417 17.625 4.625 17.425 4.825L4.25 18H0ZM12.475 5.525L11.775 4.8L13.2 6.225L12.475 5.525Z" fill="currentColor" />
            </svg>
          </button>
          <button
            aria-label={`${kioskOn ? "Hide" : "Show"} linked iPad menus for ${item.name}`}
            aria-pressed={kioskOn}
            className={`relative flex !h-6 !w-12 items-center !rounded-xl !p-0 ${kioskOn ? "!justify-end !bg-[#792E32]" : "!justify-start !border !border-[#594040] !bg-[#413131]"} disabled:!cursor-not-allowed disabled:!opacity-40`}
            disabled={!canToggle}
            title={linkedMenus.length ? "Kiosk menu visibility" : "No linked customer menu item"}
            type="button"
            onClick={() => safe(() => setIngredientKioskAvailability(item.ingredient_id, !kioskOn))}
          >
            <span className={`mx-1 h-4 w-4 rounded-full ${kioskOn ? "bg-white" : "bg-[#93000A]"}`} />
          </button>
        </div>
      </div>
    );
  }

  function renderInventoryStatusPill(status) {
    const classes = {
      in: "bg-[#2A1C1C] text-[#E1BEBE]",
      low: "bg-[rgba(147,0,10,0.20)] text-[#FFB3B3]",
      out: "bg-[#93000A] text-[#FFDAD6]"
    };
    const dotClasses = {
      in: "bg-[#A88989]",
      low: "bg-[#FFB3B3] shadow-[0_0_10px_rgba(214,63,77,0.50)]",
      out: "bg-[#FFDAD6]"
    };
    return (
      <span className={`flex min-w-[121px] items-center justify-center gap-2 rounded-xl px-4 py-1 text-xs leading-4 ${classes[status.key]}`}>
        <span className={`h-2 w-2 rounded-full ${dotClasses[status.key]}`} />
        {status.label}
      </span>
    );
  }

  function renderInventoryStat(label, value, colorClass) {
    return (
      <article className="rounded-xl border border-[#594040]/30 bg-[#2A1C1C] p-6">
        <p className="text-xs leading-4 tracking-[0.1em] text-[#E1BEBE]">{label}</p>
        <p className={`mt-2 font-epilogue text-2xl leading-8 ${colorClass}`}>{value}</p>
      </article>
    );
  }

  function inventoryCategory(item) {
    const name = item.name.toLowerCase();
    if (name.includes("beef") || name.includes("ribeye") || name.includes("wagyu")) return "Beef";
    if (name.includes("pork") || name.includes("bacon")) return "Pork";
    if (name.includes("shrimp") || name.includes("squid") || name.includes("sea")) return "Seafood";
    if (name.includes("cabbage") || name.includes("mushroom") || name.includes("enoki")) return "Vegetables";
    if (name.includes("tea") || name.includes("cola") || name.includes("rice") || name.includes("kimchi")) return "Sides and Drinks";
    return "Pantry";
  }

  function inventoryStatus(item) {
    if (item.quantity_on_hand <= 0) return { key: "out", label: "OUT OF STOCK" };
    if (item.quantity_on_hand <= item.reorder_level) return { key: "low", label: "LOW STOCK" };
    return { key: "in", label: "IN STOCK" };
  }

  function inventoryDisplayQuantity(item) {
    if (item.unit === "g" && item.quantity_on_hand >= 1000) {
      return { amount: (item.quantity_on_hand / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 }), unit: "KG" };
    }
    if (item.unit === "ml" && item.quantity_on_hand >= 1000) {
      return { amount: (item.quantity_on_hand / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 }), unit: "L" };
    }
    return { amount: Number(item.quantity_on_hand).toLocaleString(undefined, { maximumFractionDigits: 1 }), unit: item.unit.toUpperCase() };
  }

  function inventoryStep(item) {
    if (item.unit === "pcs") return 1;
    if (item.unit === "g" || item.unit === "ml") return 100;
    return 1;
  }

  function editIngredientName(ingredientId) {
    const ingredient = db.inventory_items.find((item) => item.ingredient_id === ingredientId);
    if (!ingredient) return;
    const nextName = window.prompt("Rename inventory item", ingredient.name);
    if (!nextName || nextName.trim() === ingredient.name) return;
    mutate((nextDb) => {
      const item = nextDb.inventory_items.find((row) => row.ingredient_id === ingredientId);
      item.name = nextName.trim();
      recordStaffActivity(nextDb, "rename_inventory_item", "inventory_item", ingredientId, `Renamed item to ${item.name}`);
    }, "Inventory item renamed.");
  }

  function exportInventoryReport() {
    const rows = db.inventory_items
      .filter((item) => !item.deleted_at)
      .map((item) => [item.ingredient_id, item.name, inventoryCategory(item), item.quantity_on_hand, item.unit, item.reorder_level, item.unit_cost, inventoryStatus(item).label]);
    const csv = [["Ingredient ID", "Item", "Category", "Qty On Hand", "Unit", "Reorder Level", "Unit Cost", "Status"], ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = window.URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventory-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    setNotice({ message: "Inventory report exported.", type: "success" });
  }

}
