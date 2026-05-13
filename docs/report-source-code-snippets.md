# Source Code พร้อมคำอธิบายสำหรับใส่ในรายงาน

เอกสารส่วนนี้คัดเลือก source code จริงจากระบบ Yum Yum Buffet Management System เพื่อใช้ประกอบบทที่ 7 ข้อมูลการเขียนโปรแกรม โดยเลือกเฉพาะส่วนที่แสดงการเชื่อมต่อฐานข้อมูล Supabase และการทำงานหลักของระบบครบตามข้อกำหนดรายวิชา ได้แก่ Insert, Update, Soft Delete, Basic Query และ Advanced Query

> หมายเหตุสำหรับรายงาน: Source code ทั้งหมดของโปรเจคส่งเป็น GitHub repository/zip แล้ว ในตัวเล่มควรใส่เฉพาะโค้ดสำคัญที่อธิบาย logic หลัก เพื่อไม่ให้รายงานยาวเกินไป แต่ยังพิสูจน์ได้ว่าระบบเชื่อมฐานข้อมูลจริง

## 7.x.1 การเชื่อมต่อ Supabase Client

ไฟล์ที่เกี่ยวข้อง: `app/lib/supabase.js`

โค้ดส่วนนี้ใช้สร้าง Supabase client สำหรับให้ระบบเรียกข้อมูลจาก PostgreSQL database ผ่าน Supabase API โดยไม่ hardcode URL และ key ลงใน source code โดยตรง

```javascript
// import createClient จากไลบรารี Supabase เพื่อใช้สร้างตัวเชื่อมต่อฐานข้อมูล
import { createClient } from "@supabase/supabase-js";

// อ่าน URL ของ Supabase project จาก environment variable เพื่อให้ local และ Vercel ใช้ค่าคนละชุดได้
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

// อ่าน anon key จาก environment variable เพื่อไม่ต้องเขียน key ตรง ๆ ใน source code
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ตรวจสอบว่ามีค่าที่จำเป็นครบหรือไม่ ก่อนเริ่ม query database
export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// ถ้ามี URL และ key ครบ จะสร้าง Supabase client จริง
export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // ระบบนี้ใช้ตาราง app_users ของตัวเอง ไม่ได้ใช้ Supabase Auth session
        persistSession: false,

        // ไม่ต้อง refresh token เพราะไม่ได้ใช้ token login ของ Supabase Auth
        autoRefreshToken: false
      }
    })
  // ถ้าตั้งค่า environment ไม่ครบ จะคืนค่า null เพื่อให้หน้าเว็บแสดง error ที่เข้าใจง่าย
  : null;
```

## 7.x.2 การดึงข้อมูลทุกตารางจาก Supabase

ไฟล์ที่เกี่ยวข้อง: `app/lib/supabaseDatabase.js`

โค้ดส่วนนี้เป็น Basic Query หลักของระบบ เพราะอ่านข้อมูลจากทุกตารางที่ใช้ใน interface เช่น ผู้ใช้ โต๊ะ เมนู วัตถุดิบ ออเดอร์ และรายการอาหาร จากนั้นแปลงเป็น object เดียวให้ React ใช้งาน

```javascript
// กำหนดรายชื่อตารางใน Supabase และ column ที่ใช้เรียงข้อมูล
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

// ตรวจสอบก่อน query ว่า Supabase client ถูกตั้งค่าแล้วหรือยัง
async function assertConfigured() {
  if (!supabaseConfigured || !supabase) {
    throw new Error("Supabase environment variables are not configured.");
  }
}

// อ่านข้อมูลจาก table เดียว โดยใช้ select("*") เพื่อดึงทุก column ที่ interface ต้องใช้
async function fetchTable(table, orderColumn) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order(orderColumn, { ascending: true });

  // ถ้า Supabase query ผิดพลาด ให้ throw error เพื่อให้ UI แจ้งผู้ใช้
  if (error) throw error;

  // ถ้าไม่มีข้อมูล ให้คืน array ว่าง เพื่อป้องกันหน้าเว็บ crash
  return data || [];
}

// โหลดข้อมูลทุกตารางจาก Supabase แล้วแปลงเป็นรูปแบบที่ React state ใช้
export async function loadDatabaseFromSupabase() {
  await assertConfigured();

  // rows ใช้เก็บผลลัพธ์จากแต่ละ table ก่อนส่งไป normalize
  const rows = {};

  // วนอ่านทุก table ที่กำหนดไว้ใน TABLE_CONFIG
  for (const [table, , orderColumn] of TABLE_CONFIG) {
    rows[table] = await fetchTable(table, orderColumn);
  }

  // แปลง raw rows จาก Supabase ให้เป็น in-memory database object ของหน้าเว็บ
  return fromSupabaseRows(rows);
}
```

## 7.x.3 การบันทึกข้อมูลกลับเข้า Supabase

ไฟล์ที่เกี่ยวข้อง: `app/lib/supabaseDatabase.js`

โค้ดส่วนนี้ทำให้ interface ทุกหน้าที่มีการ Insert หรือ Update สามารถ sync ข้อมูลกลับเข้า Supabase ได้ โดยใช้ `upsert` เพื่อรองรับทั้งการเพิ่มข้อมูลใหม่และการแก้ไขข้อมูลเดิม

```javascript
// กำหนดลำดับการเขียนข้อมูลกลับฐานข้อมูล โดย parent table มาก่อน child table เพื่อไม่ให้ผิด foreign key
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

// สร้าง object เพื่อบอกว่าแต่ละ table ใช้ primary key อะไรตอน upsert
const PRIMARY_KEYS = Object.fromEntries(
  TABLE_CONFIG.map(([table, primaryKey]) => [table, primaryKey])
);

// เขียนข้อมูลหนึ่ง table ด้วย upsert เพื่อให้ใช้ code path เดียวกันทั้ง insert และ update
async function upsertTable(table, rows) {
  // ถ้า table นั้นไม่มี row ให้ข้าม ไม่ต้องยิง query
  if (!rows?.length) return;

  // ส่งข้อมูลเข้า Supabase โดยใช้ primary key เป็นเงื่อนไข conflict
  const { error } = await supabase
    .from(table)
    .upsert(rows, { onConflict: PRIMARY_KEYS[table] });

  // ถ้า insert/update ไม่สำเร็จ ให้แจ้ง error กลับไปที่ interface
  if (error) throw error;
}

// sync database object ที่อยู่ใน React state กลับไปยัง Supabase
export async function syncDatabaseToSupabase(database) {
  await assertConfigured();

  // แปลง object ของ React ให้กลับเป็น column format ที่ Supabase table ต้องการ
  const rows = toSupabaseRows(database);

  // เขียนข้อมูลตามลำดับที่ไม่ชน foreign key
  for (const table of WRITE_ORDER) {
    await upsertTable(table, rows[table]);
  }
}
```

## 7.x.4 Login และการตรวจสอบบทบาทพนักงาน

ไฟล์ที่เกี่ยวข้อง: `app/page.jsx`

โค้ดส่วนนี้เป็น Basic Query จากตาราง `app_users` และ Insert activity log ลง `staff_activity_logs` เมื่อ login สำเร็จ จากนั้นใช้ role เพื่อพาไปหน้าจอที่ถูกต้อง

```javascript
// ฟังก์ชันนี้ทำงานเมื่อพนักงานกดปุ่ม Authenticate & Enter ในหน้า Login
function handleLogin(event) {
  // ป้องกัน browser reload หน้าเมื่อ submit form
  event.preventDefault();

  // อ่าน username และ password จาก form input
  const form = Object.fromEntries(new FormData(event.currentTarget));

  // ค้นหาผู้ใช้จากข้อมูล app_users ที่โหลดมาจาก Supabase
  const user = db.users.find((row) =>
    row.username === form.username &&
    row.password === form.password &&
    row.is_active &&
    !row.deleted_at
  );

  // ถ้าไม่พบผู้ใช้หรือบัญชีถูกปิดใช้งาน ให้แจ้ง error และหยุดทำงาน
  if (!user) {
    setNotice({ message: "Invalid or inactive staff login.", type: "error" });
    return;
  }

  // clone database state เพื่อแก้ไขแบบ immutable ก่อน sync กลับ Supabase
  const nextDb = structuredClone(db);

  // บันทึกเวลาปัจจุบันสำหรับ activity log
  const now = new Date().toISOString();

  // เตรียม array log เผื่อยังไม่มีข้อมูล
  nextDb.staff_activity_logs ||= [];

  // เพิ่ม log ว่าผู้ใช้คนนี้ login เข้าระบบ
  nextDb.staff_activity_logs.push({
    activity_id: nextId(nextDb, "activity"),
    user_id: user.user_id,
    action: "login",
    entity_type: "app_user",
    entity_id: user.user_id,
    occurred_at: now
  });

  // บันทึกข้อมูลที่แก้ไขกลับ state และ sync ไป Supabase
  commit(nextDb, `Logged in as ${user.role}.`);

  // เก็บ user_id ปัจจุบันเพื่อใช้ตรวจ role และบันทึก activity อื่น ๆ
  setUserId(user.user_id);

  // เปลี่ยนหน้าจอตาม role เช่น cashier, kitchen, waiter หรือ manager
  setView(DEFAULT_VIEW_BY_ROLE[user.role]);
}
```

## 7.x.5 การเปิดโต๊ะและสร้าง Dining Session

ไฟล์ที่เกี่ยวข้อง: `app/page.jsx`

โค้ดส่วนนี้เป็น Insert และ Update พร้อมกัน เพราะเมื่อแคชเชียร์เปิดโต๊ะ ระบบจะสร้าง row ใหม่ใน `dining_sessions` และอัปเดตสถานะโต๊ะใน `restaurant_tables`

```javascript
// ฟังก์ชันนี้ใช้เมื่อแคชเชียร์กดเปิดโต๊ะจากหน้าจอ cashier
function makeSeatForSelectedTable() {
  // ดึงโต๊ะที่ผู้ใช้เลือกจาก database state
  const table = helpers.tableById(selectedCashierTableId);

  // ถ้าไม่ได้เลือกโต๊ะ ให้แจ้ง error
  if (!table) {
    setNotice({ message: "Select a table first.", type: "error" });
    return;
  }

  // mutate ใช้แก้ state แล้ว sync ไป Supabase
  mutate((nextDb) => {
    // หาโต๊ะตัวจริงใน cloned database
    const nextTable = nextDb.restaurant_tables.find((row) => row.table_id === table.table_id);

    // ตรวจว่าโต๊ะยังว่างอยู่จริง
    if (!nextTable || nextTable.status !== "available") {
      throw new Error("Choose a ready table.");
    }

    // ตรวจว่ามีลูกค้าอย่างน้อย 1 คน
    if (checkInAdults + checkInChildren <= 0) {
      throw new Error("A session needs at least one guest.");
    }

    // ตรวจจำนวนลูกค้าไม่เกิน capacity ของโต๊ะ
    if (checkInAdults + checkInChildren > nextTable.capacity) {
      throw new Error(`Table capacity is ${nextTable.capacity} guests.`);
    }

    // สร้าง session_id ใหม่สำหรับ dining session
    const sessionId = nextId(nextDb, "session");

    // อ่านราคาบุฟเฟต์ snapshot เพื่อเก็บราคาขณะเปิดโต๊ะ
    const buffetPrices = currentBuffetPrices(nextDb);

    // Insert row ใหม่ลง dining_sessions
    nextDb.dining_sessions.push({
      session_id: sessionId,
      table_id: nextTable.table_id,
      cashier_id: currentUser.user_id,
      adult_count: checkInAdults,
      child_count: checkInChildren,
      adult_price_snapshot: buffetPrices.adult,
      child_price_snapshot: buffetPrices.child,
      opened_at: new Date().toISOString(),
      closed_at: null,
      status: "open",
      payment_status: "unpaid",
      bill_requested_at: null
    });

    // Update สถานะโต๊ะจาก available เป็น occupied
    nextTable.status = "occupied";

    // ล้างเวลาทำความสะอาด เพราะโต๊ะเริ่มใช้งานแล้ว
    nextTable.cleaning_started_at = null;

    // บันทึก activity log ของแคชเชียร์
    recordStaffActivity(nextDb, "open_table", "dining_session", sessionId, `Opened table ${nextTable.table_code}`);

    // กำหนด session ปัจจุบันให้หน้า customer iPad ใช้สั่งอาหาร
    setCustomerSessionId(sessionId);
  }, `Table ${tableDisplayCode(table)} opened.`);
}
```

## 7.x.6 การส่งออเดอร์จาก Customer iPad

ไฟล์ที่เกี่ยวข้อง: `app/page.jsx`

โค้ดส่วนนี้เป็น Insert หลักของฝั่งลูกค้า โดยสร้าง `orders` หนึ่งรายการ และสร้าง `order_items` หลายรายการตามเมนูในตะกร้า

```javascript
// ฟังก์ชันนี้ทำงานเมื่อลูกค้ากด SEND ORDER
function placeOrder() {
  // แปลง cart object ให้เหลือเฉพาะเมนูที่จำนวนมากกว่า 0
  const entries = Object.entries(cart).filter(([, quantity]) => quantity > 0);

  // ต้องมี session และต้องมีรายการอาหารในตะกร้าก่อนส่งออเดอร์
  if (!customerSessionId || !entries.length) {
    setNotice({ message: "Choose a session and add at least one item.", type: "error" });
    return;
  }

  // แก้ไข database state แล้ว sync กลับ Supabase
  mutate((nextDb) => {
    // ตรวจว่า dining session ของโต๊ะนี้ยังเปิดอยู่
    const session = nextDb.dining_sessions.find((row) => row.session_id === customerSessionId);
    if (!session || session.status !== "open") {
      throw new Error("This dining session is not open.");
    }

    // สร้าง order_id ใหม่
    const orderId = nextId(nextDb, "order");

    // Insert row ใหม่ลง orders โดยผูกกับ dining session ปัจจุบัน
    nextDb.orders.push({
      order_id: orderId,
      session_id: session.session_id,
      ordered_at: new Date().toISOString(),
      status: "open"
    });

    // Insert order_items ตามเมนูแต่ละรายการในตะกร้า
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

  // ล้างตะกร้าหลังส่งออเดอร์สำเร็จ
  setCart({});

  // เปิดหน้า order history เพื่อให้ลูกค้าเห็นสถานะอาหาร
  setCustomerHistoryFilter("preparing");
  setCustomerHistoryOpen(true);
}
```

## 7.x.7 การอัปเดตสถานะอาหารในครัว

ไฟล์ที่เกี่ยวข้อง: `app/page.jsx`

โค้ดส่วนนี้เป็น Update จาก Kitchen Display System โดยแก้สถานะใน `order_items` และเก็บ timestamp สำหรับนำไปคำนวณความเร็วในการเสิร์ฟใน dashboard

```javascript
// ฟังก์ชันนี้ใช้เปลี่ยนสถานะอาหาร เช่น pending -> cooking หรือ cooking -> ready
function setOrderItemStatus(orderItemId, nextStatus) {
  mutate((nextDb) => {
    // ค้นหา order_item ที่ต้องการอัปเดต
    const item = nextDb.order_items.find((row) => row.order_item_id === orderItemId);

    // ถ้าไม่พบรายการอาหาร ให้หยุดและแจ้ง error
    if (!item) throw new Error("Order item not found.");

    // เปลี่ยนสถานะของรายการอาหาร
    item.status = nextStatus;

    // ถ้าเริ่มทำอาหาร ให้เก็บ cooking_at
    if (nextStatus === "cooking") item.cooking_at = new Date().toISOString();

    // ถ้าทำเสร็จ ให้เก็บ ready_at
    if (nextStatus === "ready") item.ready_at = new Date().toISOString();

    // บันทึก log ว่าครัวเปลี่ยนสถานะอาหาร
    recordStaffActivity(
      nextDb,
      nextStatus === "cooking" ? "start_preparing" : "mark_ready",
      "order_item",
      item.order_item_id,
      `Kitchen set item to ${nextStatus}`
    );

    // อัปเดตสถานะ parent order ตามสถานะของ order_items
    refreshOrderStatus(nextDb, item.order_id);
  }, `Order item updated to ${nextStatus}.`);
}

// ฟังก์ชันนี้ใช้ mark รายการอาหารเป็น rush เมื่อรอนานเกินเวลาที่กำหนด
function expediteOrderItem(orderItemId) {
  mutate((nextDb) => {
    // หา order item จาก id
    const item = nextDb.order_items.find((row) => row.order_item_id === orderItemId);
    if (!item) throw new Error("Order item not found.");

    // เปลี่ยน priority เป็น rush เพื่อให้ UI แสดงสีแดง
    item.priority_level = "rush";

    // เก็บเวลาที่รายการนี้ถูก expedite
    item.expedited_at = new Date().toISOString();

    // บันทึก activity log
    recordStaffActivity(nextDb, "expedite_order", "order_item", item.order_item_id, "Marked rush chef priority");
  }, "Order item marked as rush priority.");
}
```

## 7.x.8 การเสิร์ฟอาหารและตัดสต็อกวัตถุดิบ

ไฟล์ที่เกี่ยวข้อง: `app/page.jsx`

โค้ดส่วนนี้เป็น Update และ Insert พร้อมกัน เมื่อ waiter กด served ระบบจะเปลี่ยนสถานะ `order_items`, ลด `inventory_items.quantity_on_hand`, และเพิ่ม row ใน `inventory_transactions` เป็นประวัติการใช้วัตถุดิบ

```javascript
// ฟังก์ชันนี้ใช้ใน Waiter Service Board เพื่อส่งอาหารออกไปหรือยืนยันว่าเสิร์ฟแล้ว
function advanceWaiterGroup(group, action) {
  mutate((nextDb) => {
    // เวลาเดียวกันใช้กับทุก item ใน ticket เดียวกัน
    const now = new Date().toISOString();

    // แปลงข้อมูลที่แสดงบน UI ให้กลับไปหา row จริงใน database state
    const liveItems = group.items
      .map((groupItem) => nextDb.order_items.find((item) => item.order_item_id === groupItem.order_item_id))
      .filter(Boolean);

    // ถ้า action คือ send แปลว่า waiter กำลังนำอาหารออกจากครัว
    if (action === "send") {
      const readyItems = liveItems.filter((item) => item.status === "ready");
      if (!readyItems.length) throw new Error("This ticket has already left the pass.");

      readyItems.forEach((item) => {
        // เปลี่ยนสถานะเป็น out_for_serving เพื่อให้ customer iPad เห็นว่าอาหารกำลังมา
        item.status = "out_for_serving";
        item.out_for_serving_at = now;

        // บันทึก activity log ของ waiter
        recordStaffActivity(nextDb, "send_to_table", "order_item", item.order_item_id, "Waiter picked up item");

        // อัปเดตสถานะ parent order
        refreshOrderStatus(nextDb, item.order_id);
      });

      // จบการทำงานของ action send โดยยังไม่ตัดสต็อก
      return;
    }

    // ถ้า action ไม่ใช่ send แปลว่า waiter กำลังกด served
    const servingItems = liveItems.filter((item) => item.status === "out_for_serving");
    if (!servingItems.length) throw new Error("Send this ticket out before marking it served.");

    // ตรวจสต็อกก่อนตัด เพื่อป้องกัน inventory ติดลบ
    const shortages = servingItems.flatMap((item) =>
      stockShortages(item, nextDb).map((shortage) => ({ ...shortage, item }))
    );
    if (shortages.length) {
      throw new Error(`Stock too low for ${shortages.map((shortage) => shortage.ingredient).join(", ")}.`);
    }

    // วนทุก order item ที่กำลังเสิร์ฟ
    servingItems.forEach((item) => {
      // ดึง recipe ของเมนูนั้น เพื่อรู้ว่าต้องใช้วัตถุดิบอะไรและปริมาณเท่าไร
      recipesForMenu(item.menu_id, nextDb).forEach((recipe) => {
        const ingredient = nextDb.inventory_items.find((row) => row.ingredient_id === recipe.ingredient_id);

        // คำนวณปริมาณวัตถุดิบที่ใช้จริง = ปริมาณต่อจาน x จำนวนที่สั่ง
        const usedQuantity = recipe.quantity_used * item.quantity;

        // ลดจำนวนคงเหลือใน inventory_items
        ingredient.quantity_on_hand = Number((ingredient.quantity_on_hand - usedQuantity).toFixed(2));

        // ถ้าวัตถุดิบหมด ให้ซ่อนเมนูที่ผูกกับวัตถุดิบนั้นจาก customer iPad
        syncMenuAvailabilityForStock(nextDb, ingredient.ingredient_id);

        // Insert row ใหม่ใน inventory_transactions เพื่อบันทึกประวัติการใช้วัตถุดิบ
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

      // เปลี่ยนสถานะอาหารเป็น served
      item.status = "served";
      item.served_at = now;

      // บันทึก log ว่า waiter เสิร์ฟอาหารสำเร็จ
      recordStaffActivity(nextDb, "serve_item", "order_item", item.order_item_id, "Waiter marked item served and inventory was deducted");

      // อัปเดตสถานะ parent order
      refreshOrderStatus(nextDb, item.order_id);
    });
  }, action === "send" ? "Customer iPad updated: food is out for serving." : "Ticket served and removed from waiter board.");
}
```

## 7.x.9 Inventory Toggle ที่ซ่อนเมนูบน iPad

ไฟล์ที่เกี่ยวข้อง: `app/page.jsx`

โค้ดส่วนนี้เป็น Update ตาม requirement Inventory Management เพราะเมื่อ manager ปิด toggle ของวัตถุดิบ ระบบจะหาเมนูที่ใช้วัตถุดิบนั้นผ่านตาราง `recipes` แล้วอัปเดต `menu_items.is_available = false` เพื่อซ่อนเมนูจาก customer iPad

```javascript
// หา menu_items ทั้งหมดที่ใช้ ingredient ตัวนี้ โดยอ้างอิงผ่านตาราง recipes
function menuItemsForIngredient(ingredientId, sourceDb = db) {
  // recipes เป็น bridge table ระหว่าง inventory_items และ menu_items
  const menuIds = new Set(
    sourceDb.recipes
      .filter((recipe) => recipe.ingredient_id === ingredientId)
      .map((recipe) => recipe.menu_id)
  );

  // คืนเฉพาะเมนูที่ยังไม่ถูก soft delete
  return sourceDb.menu_items.filter((item) =>
    menuIds.has(item.menu_id) &&
    !item.deleted_at
  );
}

// อัปเดตการแสดงผลเมนูบน customer iPad จาก toggle ในหน้า inventory
function setIngredientKioskAvailability(ingredientId, isAvailable) {
  mutate((nextDb) => {
    // หา ingredient ที่ manager กำลังกด toggle
    const ingredient = nextDb.inventory_items.find((row) => row.ingredient_id === ingredientId);
    if (!ingredient) throw new Error("Ingredient not found.");

    // ถ้าจะเปิดกลับ แต่ stock เป็น 0 จะไม่ให้เปิด เพราะลูกค้าไม่ควรสั่งเมนูที่ทำไม่ได้
    if (isAvailable && ingredient.quantity_on_hand <= 0) {
      throw new Error("Restock this ingredient before showing linked iPad menu items.");
    }

    // หาเมนูที่ผูกกับวัตถุดิบนี้ผ่าน recipes
    const affectedMenus = menuItemsForIngredient(ingredientId, nextDb);
    if (!affectedMenus.length) {
      throw new Error("No customer iPad menu items are linked to this ingredient.");
    }

    // เก็บชื่อเมนูไว้ใน activity log เพื่อให้ตรวจสอบย้อนหลังได้
    const affectedMenuNames = affectedMenus.map((menu) => menu.name).join(", ");

    // จุดสำคัญของ requirement: ปิด ingredient แล้ว menu_items.is_available ต้องเป็น false
    affectedMenus.forEach((menu) => {
      menu.is_available = isAvailable;
    });

    // ถ้าเปิดกลับ ต้องตรวจ ingredient ตัวอื่นใน recipe ด้วย ถ้ามีตัวอื่นหมด stock ก็ยังไม่ควรแสดงเมนู
    if (isAvailable) {
      affectedMenus.forEach((menu) => {
        nextDb.recipes
          .filter((recipe) => recipe.menu_id === menu.menu_id)
          .forEach((recipe) => syncMenuAvailabilityForStock(nextDb, recipe.ingredient_id));
      });
    }

    // บันทึก activity log เพื่อแสดงว่า manager เปลี่ยน availability ผ่าน inventory screen
    recordStaffActivity(
      nextDb,
      "toggle_kiosk_menu_from_inventory",
      "inventory_item",
      ingredientId,
      `${ingredient.name} linked iPad menu availability set to ${isAvailable} for ${affectedMenuNames}`
    );
  }, isAvailable ? "Linked iPad menu items are visible." : "Linked iPad menu items hidden from customer iPad.");
}
```

## 7.x.10 การปรับสต็อกแบบ Restock, Waste และ Manual Adjustment

ไฟล์ที่เกี่ยวข้อง: `app/page.jsx`

โค้ดส่วนนี้ใช้ในหน้า Inventory Management เพื่อให้ manager พิมพ์จำนวนที่ต้องการปรับ และเลือกประเภท transaction ได้ โดยบันทึกทั้งยอดคงเหลือใหม่และประวัติใน `inventory_transactions`

```javascript
// ฟังก์ชันนี้ทำงานเมื่อ manager กด APPLY ใน row ของ inventory item
function handleAdjustStock(event) {
  // ป้องกัน browser reload หน้าเมื่อ submit form
  event.preventDefault();

  // อ่าน ingredient_id, quantity และ movement_type จาก form
  const form = Object.fromEntries(new FormData(event.currentTarget));

  // แก้ไข database state แล้ว sync กลับ Supabase
  mutate((nextDb) => {
    // หา ingredient ที่ต้องการปรับ stock
    const ingredient = nextDb.inventory_items.find((row) => row.ingredient_id === form.ingredient_id);
    if (!ingredient) throw new Error("Ingredient not found.");

    // รับจำนวนเป็นค่าบวกเสมอ ส่วนจะเพิ่มหรือลดให้ดูจาก movement_type
    const quantity = Math.abs(Number(form.quantity || 0));
    if (!quantity) throw new Error("Enter a stock movement quantity.");

    // แปลง movement_type จาก UI เป็น transaction_type และ quantity_change ใน database
    const movement = stockMovementFromType(form.movement_type, quantity);
    const signedQuantity = movement.quantity_change;

    // ไม่อนุญาตให้ stock ติดลบ
    if (ingredient.quantity_on_hand + signedQuantity < 0) {
      throw new Error("Stock movement would make inventory negative.");
    }

    // Update ยอดคงเหลือปัจจุบันใน inventory_items
    ingredient.quantity_on_hand = Number((ingredient.quantity_on_hand + signedQuantity).toFixed(2));

    // Insert ประวัติการเปลี่ยนแปลง stock ลง inventory_transactions
    nextDb.inventory_transactions.push({
      transaction_id: nextId(nextDb, "transaction"),
      ingredient_id: ingredient.ingredient_id,
      order_item_id: null,
      transaction_type: movement.transaction_type,
      quantity_change: signedQuantity,
      unit_cost_snapshot: ingredient.unit_cost,
      occurred_at: new Date().toISOString()
    });

    // ถ้าหลังปรับแล้ว stock เป็น 0 ให้ซ่อนเมนูที่ใช้วัตถุดิบนั้น
    syncMenuAvailabilityForStock(nextDb, ingredient.ingredient_id);

    // บันทึก activity log ของ manager
    recordStaffActivity(
      nextDb,
      "record_stock_movement",
      "inventory_item",
      ingredient.ingredient_id,
      `${movement.label}: ${signedQuantity >= 0 ? "+" : ""}${signedQuantity} ${ingredient.unit}`
    );
  }, "Stock movement recorded.");

  // ล้าง input หลังบันทึกสำเร็จ
  event.currentTarget.reset();
}

// แปลงค่าที่ manager เลือกใน dropdown ให้เป็น enum ที่ตรงกับ database
function stockMovementFromType(type, quantity) {
  // restock คือเพิ่ม stock
  if (type === "restock") {
    return { transaction_type: "restock", quantity_change: quantity, label: "Restock" };
  }

  // waste คือของเสียหรือวัตถุดิบเสียหาย จึงลด stock
  if (type === "waste") {
    return { transaction_type: "waste", quantity_change: -quantity, label: "Waste" };
  }

  // adjustment_remove คือ manual adjustment แบบลดจำนวน
  if (type === "adjustment_remove") {
    return { transaction_type: "manual_adjustment", quantity_change: -quantity, label: "Manual correction" };
  }

  // ค่า default คือ manual adjustment แบบเพิ่มจำนวน
  return { transaction_type: "manual_adjustment", quantity_change: quantity, label: "Manual correction" };
}
```

## 7.x.11 การคำนวณ Dashboard จากข้อมูลจริง

ไฟล์ที่เกี่ยวข้อง: `app/page.jsx`

โค้ดส่วนนี้เป็น Advanced Query ในฝั่ง application logic โดยรวมข้อมูลจาก `dining_sessions`, `order_items`, `menu_items`, `inventory_transactions`, `inventory_items` และ `restaurant_tables` เพื่อแสดง KPI, top menu, peak hour และ ingredient consumption

```javascript
// คำนวณ metric ของ manager dashboard จากข้อมูลที่โหลดจาก Supabase
function calculateDashboardMetrics(range = managerRange) {
  // เวลาปัจจุบันใช้กำหนดช่วงข้อมูล today หรือ this week
  const now = new Date();

  // start คือวันเริ่มต้นของช่วงข้อมูล
  const start = new Date(now);

  // ถ้าเลือก this week ให้ย้อนหลัง 7 วัน
  if (range === "week") {
    start.setDate(now.getDate() - 6);
  }

  // ตั้งเวลาเริ่มต้นเป็น 00:00 ของวันแรก
  start.setHours(0, 0, 0, 0);

  // helper ใช้ตรวจว่า timestamp อยู่ในช่วงที่เลือกหรือไม่
  const inRange = (value) => {
    if (!value) return false;
    const date = new Date(value);
    if (date < start || date > now) return false;
    return true;
  };

  // ดึง dining sessions ที่อยู่ในช่วงเวลาที่เลือก
  const rangeSessions = db.dining_sessions.filter((session) => inRange(session.opened_at));

  // ดึงเฉพาะ transaction ประเภท usage เพื่อคำนวณต้นทุนและปริมาณใช้วัตถุดิบจริง
  const rangeUsage = db.inventory_transactions.filter((txn) =>
    txn.transaction_type === "usage" &&
    inRange(txn.occurred_at)
  );

  // ดึง order item ที่ไม่ถูก cancel เพื่อคำนวณยอดสั่งของแต่ละเมนู
  const rangeOrderItems = db.order_items.filter((item) =>
    item.status !== "cancelled" &&
    inRange(item.requested_at)
  );

  // ดึง order item ที่ served แล้ว เพื่อคำนวณความเร็วเฉลี่ยในการเสิร์ฟ
  const servedItems = db.order_items.filter((item) =>
    item.status === "served" &&
    inRange(item.served_at || item.requested_at)
  );

  // รวมจำนวนลูกค้าจาก adult_count + child_count ของทุก dining session
  const guests = rangeSessions.reduce((sum, session) => sum + sessionGuests(session), 0);

  // รวมต้นทุนวัตถุดิบจาก quantity_change x unit_cost_snapshot
  const ingredientCost = rangeUsage.reduce((sum, txn) =>
    sum + Math.abs(txn.quantity_change) * txn.unit_cost_snapshot,
    0
  );

  // คำนวณเวลาจาก requested_at ถึง served_at ของแต่ละ item ที่เสิร์ฟแล้ว
  const serviceMinutes = servedItems
    .map((item) => minutesBetween(item.requested_at, item.served_at))
    .filter((value) => value != null);

  // รวม service time ทั้งหมด
  const totalServiceMinutes = serviceMinutes.reduce((sum, value) => sum + value, 0);

  // จำนวน item ที่มีข้อมูลเวลาพร้อมคำนวณ
  const servedOrderCount = serviceMinutes.length;

  // cost per head = ต้นทุนวัตถุดิบรวม / จำนวนลูกค้า
  const costPerHead = guests ? ingredientCost / guests : 0;

  // average serving speed = เวลารวม / จำนวน item ที่เสิร์ฟแล้ว
  const avgServiceMinutes = servedOrderCount
    ? Math.round(totalServiceMinutes / servedOrderCount)
    : 0;

  // เตรียม bucket ชั่วโมงสำหรับหา peak hour ของร้าน
  const trafficHours = [10, 12, 14, 16, 18, 20, 22];
  const traffic = trafficHours.map((hour) => ({ hour, guests: 0 }));

  // กระจายจำนวนลูกค้าเข้า bucket ชั่วโมงที่ใกล้ที่สุด
  rangeSessions.forEach((session) => {
    const hour = new Date(session.opened_at).getHours();
    const bucket = traffic.reduce(
      (best, row) => Math.abs(row.hour - hour) < Math.abs(best.hour - hour) ? row : best,
      traffic[0]
    );
    bucket.guests += sessionGuests(session);
  });

  // หา peak hour จาก bucket ที่มีจำนวนลูกค้ามากที่สุด
  const maxTrafficGuests = Math.max(0, ...traffic.map((row) => row.guests));
  const peakRows = maxTrafficGuests > 0
    ? traffic.filter((row) => row.guests === maxTrafficGuests)
    : [];

  // ส่งค่าที่คำนวณแล้วให้ dashboard render เป็น KPI และ chart
  return {
    rangeLabel: range === "week" ? "Last 7 days" : "Today",
    guests,
    ingredientCost,
    costPerHead,
    avgServiceMinutes,
    peakHour: peakRows.length ? peakRows.map((row) => `${String(row.hour).padStart(2, "0")}:00`).join(", ") : "-",
    peakGuests: maxTrafficGuests
  };
}
```

## 7.x.12 ตัวอย่าง SQL Schema ที่แสดงความสัมพันธ์ Menu กับ Ingredient

ไฟล์ที่เกี่ยวข้อง: `supabase/schema.sql`

โค้ด SQL นี้แสดงความสัมพันธ์แบบ many-to-many ระหว่างเมนูกับวัตถุดิบผ่านตาราง `recipes` ซึ่งเป็นหัวใจของระบบตัดสต็อกและซ่อนเมนูอัตโนมัติเมื่อวัตถุดิบไม่พอ

```sql
-- ตาราง menu_items เก็บข้อมูลเมนูที่ลูกค้าเห็นบน iPad
create table if not exists public.menu_items (
  -- menu_id เป็น primary key ของเมนู
  menu_id bigint generated always as identity primary key,

  -- category_id เป็น foreign key ไปยัง menu_categories
  category_id bigint not null references public.menu_categories(category_id),

  -- name คือชื่อเมนูที่แสดงบน customer iPad
  name text not null,

  -- description ใช้แสดงรายละเอียดเมนู
  description text not null default '',

  -- image_url เก็บ URL รูปภาพเมนูจาก public folder หรือ Supabase bucket
  image_url text not null default '',

  -- is_available ใช้เปิด/ปิดเมนูโดยไม่ลบข้อมูลจริง
  is_available boolean not null default true,

  -- deleted_at ใช้ทำ soft delete เพื่อซ่อนเมนูแต่ยังเก็บประวัติไว้
  deleted_at timestamptz
);

-- ตาราง recipes เป็น bridge table ระหว่าง menu_items และ inventory_items
create table if not exists public.recipes (
  -- menu_id อ้างอิงเมนูหนึ่งรายการ
  menu_id bigint not null references public.menu_items(menu_id),

  -- ingredient_id อ้างอิงวัตถุดิบหนึ่งรายการ
  ingredient_id bigint not null references public.inventory_items(ingredient_id),

  -- quantity_used คือปริมาณวัตถุดิบที่ใช้ต่อหนึ่งหน่วยของเมนู
  quantity_used numeric not null check (quantity_used > 0),

  -- primary key แบบ composite ทำให้เมนูหนึ่งผูกวัตถุดิบชนิดเดียวกันซ้ำไม่ได้
  primary key (menu_id, ingredient_id)
);
```

## สรุปการเลือก Source Code สำหรับใส่รายงาน

โค้ดที่คัดเลือกด้านบนครอบคลุมส่วนสำคัญของระบบดังนี้

1. `app/lib/supabase.js` แสดงการเชื่อม Supabase ผ่าน environment variables
2. `loadDatabaseFromSupabase()` แสดง Basic Query จากทุกตาราง
3. `syncDatabaseToSupabase()` แสดงการ upsert ข้อมูลกลับฐานข้อมูล
4. `handleLogin()` แสดงการตรวจสอบผู้ใช้และบันทึก activity log
5. `makeSeatForSelectedTable()` แสดง Insert dining session และ Update table status
6. `placeOrder()` แสดง Insert orders และ order_items
7. `setOrderItemStatus()` และ `expediteOrderItem()` แสดง Update สถานะอาหารของครัว
8. `advanceWaiterGroup()` แสดงการเปลี่ยนสถานะ served และตัดสต็อกอัตโนมัติ
9. `setIngredientKioskAvailability()` แสดงการซ่อนเมนูบน iPad ผ่าน inventory toggle
10. `handleAdjustStock()` แสดงการบันทึก restock, waste และ manual adjustment
11. `calculateDashboardMetrics()` แสดง Advanced Query สำหรับ dashboard
12. SQL schema ของ `menu_items` และ `recipes` แสดงโครงสร้างฐานข้อมูลที่รองรับ logic ของระบบ

