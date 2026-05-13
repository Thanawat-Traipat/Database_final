# Source Code Commentary

เอกสารนี้ใช้ประกอบบทที่ 7 ของรายงาน โดยอธิบาย source code ของระบบ Yum Yum Buffet Management System ในเชิงเทคนิค ไฟล์โค้ดหลักมี comment อยู่ในตัวไฟล์แล้ว ส่วนเอกสารนี้สรุปเหตุผลของโค้ดแต่ละกลุ่ม เพื่อให้อาจารย์เห็นว่า interface เชื่อมต่อกับ Supabase/PostgreSQL จริงและไม่ได้ใช้ข้อมูลธุรกิจแบบ hardcoded ใน frontend

## 1. Frontend Application Files

### `app/layout.jsx`

ไฟล์นี้เป็น root layout ของ Next.js App Router ทำหน้าที่โหลด global stylesheet และ font ที่ใช้ทั้งระบบผ่าน `next/font/google` โดยกำหนด `Manrope` สำหรับ label/รายละเอียด และ `Epilogue` สำหรับ heading, table number และปุ่ม action หลัก การกำหนด font ที่ระดับ layout ทำให้ทุกหน้าจอ เช่น cashier, customer, kitchen, waiter และ manager ใช้ typography เดียวกัน นอกจากนี้ยังกำหนด `metadata` สำหรับชื่อ browser tab และ deployment preview

### `app/globals.css`

ไฟล์นี้เป็น stylesheet กลางของระบบ เริ่มจาก import Tailwind CSS และกำหนด CSS variables สำหรับสี ฟอนต์ เส้นขอบ เงา และรัศมีมุม จากนั้นจึงนิยาม class เฉพาะของระบบ เช่น evaluator role test bar, form controls, table cards, customer iPad layout, kitchen ticket, waiter ticket และ manager dashboard การรวม style ไว้ที่ไฟล์นี้ช่วยให้ UI หลาย role ใช้ visual language เดียวกันและลดการซ้ำของ CSS ใน component

### `app/page.jsx`

ไฟล์นี้เป็น client component หลักของระบบ เพราะทุก workflow ต้องตอบสนองต่อการกดปุ่มและอัปเดต state ใน browser โค้ดเริ่มจากโหลดข้อมูลผ่าน `loadDatabaseFromSupabase()` แล้วเก็บไว้ใน state ชื่อ `db` ซึ่งเป็น representation ของตารางใน Supabase ที่ถูก normalize เป็น readable ID เช่น `menu-1`, `orderItem-3`, `session-1001`

ค่าคงที่ในไฟล์นี้ใช้สำหรับ UI และกติกา workflow เท่านั้น เช่น role shortcut, ชื่อหมวดหมู่ที่แสดงบน iPad, ระยะเวลา dining limit, cleaning timer และ 15-minute expedite rule ส่วนข้อมูลธุรกิจที่เปลี่ยนได้ เช่น โต๊ะ เมนู รูปเมนู วัตถุดิบ order payment และ dashboard metrics มาจาก Supabase ผ่าน state `db`

ฟังก์ชัน `loadInitialDatabase()` ตรวจสอบว่ามี Supabase URL และ anon key หรือไม่ หากไม่มีจะหยุดและแสดงข้อความ database connection required หากเชื่อมต่อได้แต่ข้อมูล seed หลักหาย จะสั่งให้ผู้ใช้รัน `supabase/reset-new-ux.sql` แทนการสร้างข้อมูลใน frontend เพื่อรักษาข้อกำหนดของวิชาว่าต้องใช้ DBMS จริง

ฟังก์ชัน `normalizeDatabase()` ปรับข้อมูลหลังโหลด เช่น บังคับโต๊ะให้มี capacity 4, จัดสถานะ cleaning timer, เติมค่า default ของ session/order/menu และเรียก `repairMenuInventoryDemoLinks()` เพื่อแก้ข้อมูลเก่าที่อาจยังอยู่ใน Supabase เช่น category เดิมและ recipe link ที่เคยไม่ตรงกับ UX ล่าสุด ฟังก์ชันนี้ไม่ overwrite `image_url` เพื่อให้รูปจาก Supabase Storage bucket ที่ผู้ใช้ใส่เองยังแสดงได้

ฟังก์ชัน `commit()` เป็นจุด sync สำคัญของระบบ ทุกครั้งที่ interface มีการเปลี่ยนข้อมูล เช่น เปิดโต๊ะ ส่ง order เปลี่ยนสถานะอาหาร หรือปรับ stock ระบบจะ clone database state, normalize อีกครั้ง, set state ใหม่ และเรียก `syncDatabaseToSupabase()` เพื่อเขียนข้อมูลกลับไปยัง Supabase การรวมการเขียนฐานข้อมูลไว้ที่จุดนี้ช่วยลดโอกาสที่บางหน้าจอจะ update state แต่ไม่ update database

ฟังก์ชัน cashier เช่น `handleOpenTable()`, `makeSeatForSelectedTable()`, `markSelectedTableForBilling()` และ `closeSession()` จัดการ flow หน้าร้าน โดยสร้าง `dining_sessions`, เปลี่ยนสถานะ `restaurant_tables`, สร้าง `payments` และบันทึก `staff_activity_logs` เมื่อปิดบิล ฟังก์ชันเหล่านี้ตอบ requirement ด้าน Insert และ Update

ฟังก์ชัน customer เช่น `customerCategoryForItem()`, `renderCustomerMode()`, `updateCartQuantity()` และ `placeOrder()` ใช้ข้อมูล `menu_categories` และ `menu_items` จาก Supabase เพื่อแสดงเมนู ลูกค้าปรับตะกร้าบน frontend ก่อนส่ง เมื่อกด SEND ORDER ระบบจึงสร้าง `orders` และ `order_items` จริงในฐานข้อมูล เมนูที่มี `is_available = false` หรือ `deleted_at` จะไม่ถูกแสดงบน iPad

ฟังก์ชัน kitchen เช่น `kitchenQueueGroups()`, `setOrderItemStatus()`, `expediteOrderItem()` และ `advanceKitchenGroup()` อ่านข้อมูลจาก `order_items`, `orders`, `dining_sessions`, `restaurant_tables` และ `menu_items` เพื่อสร้าง real-time style ticket แยกตามโต๊ะและเวลา เมื่อครัวกด START PREPARING หรือ MARK AS READY ระบบจะ update `order_items.status` และ timestamp เช่น `cooking_at` หรือ `ready_at`

ฟังก์ชัน waiter เช่น `waiterServeGroups()`, `markOrderItemOutForServing()`, `serveOrderItem()` และ `advanceWaiterGroup()` แสดงเฉพาะรายการที่พร้อมเสิร์ฟหรือออกไปเสิร์ฟแล้ว Timer ใช้ `order_items.requested_at` ซึ่งเป็นเวลาเดียวกับฝั่ง kitchen เพื่อให้เห็นเวลารวมตั้งแต่ลูกค้าสั่งอาหาร เมื่อกด served ระบบบันทึก `served_at` และเรียก logic ตัดสต็อกตาม `recipes`

ฟังก์ชัน inventory เช่น `handleAddIngredient()`, `handleAdjustStock()`, `stockMovementFromType()`, `setIngredientKioskAvailability()` และ `softDeleteIngredient()` ใช้ตาราง `inventory_items`, `inventory_transactions`, `recipes` และ `menu_items` โดยการปรับ stock จะบันทึก ledger row ทุกครั้ง ส่วน toggle บน inventory ไม่ได้แก้เฉพาะ UI แต่เขียน `menu_items.is_available` ของเมนูที่ใช้วัตถุดิบนั้นผ่าน recipe bridge ดังนั้นเมื่อปิดวัตถุดิบ เมนูที่เกี่ยวข้องจะหายจาก customer iPad

ฟังก์ชัน manager dashboard เช่น `calculateDashboardMetrics()` และ `renderManagerDashboard()` สรุปข้อมูลจาก state ที่โหลดมาจาก Supabase โดยคำนวณ average cost per head จาก `inventory_transactions` หารด้วยจำนวนลูกค้าจาก `dining_sessions`, คำนวณ serving speed จาก `order_items.requested_at` ถึง `served_at`, หายอดเมนูจาก `order_items.quantity`, สรุป peak hour จาก `dining_sessions.opened_at` และสรุป stock จาก `inventory_items`

## 2. Supabase Connection Files

### `app/lib/supabase.js`

ไฟล์นี้สร้าง Supabase client ด้วย `@supabase/supabase-js` โดยอ่านค่า `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY` จาก environment variables แทนการ hardcode ลง source code ตัวแปร `supabaseConfigured` ใช้บอก UI ว่าฐานข้อมูลพร้อมใช้งานหรือไม่ โปรเจกต์นี้ใช้ตาราง `app_users` เป็น demo login จึงตั้งค่า Supabase Auth ให้ไม่ persist session และไม่ auto refresh token

### `app/lib/supabaseDatabase.js`

ไฟล์นี้เป็น adapter ระหว่าง Supabase rows และ React state โดย `TABLE_CONFIG` ระบุตารางทั้งหมดที่ต้องโหลด และ `WRITE_ORDER` ระบุลำดับการเขียนกลับฐานข้อมูลเพื่อไม่ชน foreign key เช่น ต้องเขียน `menu_categories` ก่อน `menu_items`, ต้องเขียน `orders` ก่อน `order_items`

ฟังก์ชัน helper เช่น `numericId()`, `localId()`, `uuidFromLocalId()` และ `localIdFromUuid()` แปลง ID ระหว่างรูปแบบ database และรูปแบบอ่านง่ายใน UI เช่น `menu_id = 1` เป็น `menu-1` เพื่อให้ component ทำงานง่ายขึ้น แต่เมื่อ sync กลับจะเปลี่ยนเป็น numeric/uuid ที่ Supabase ใช้จริง

ฟังก์ชัน `fromSupabaseRows()` แปลง rows จากตารางจริงเป็น object `database` ที่ frontend ใช้ เช่น `app_users` กลายเป็น `users`, `restaurant_tables` เก็บเป็น table state, `order_items` เก็บ timestamp ทุกขั้นตอน และ `inventory_transactions` เก็บ stock ledger ฟังก์ชันนี้ยังแปลง numeric string ที่ Supabase อาจส่งกลับมาให้เป็น number

ฟังก์ชัน `toSupabaseRows()` ทำงานย้อนกลับ โดยแปลง state จาก React ให้ตรงกับ column ของ Supabase ก่อน upsert เช่น `user.password` ถูกแปลงเป็น `password_hash`, `session.table_id` ถูกแปลงเป็น `table_code`, และ local ID เช่น `orderItem-5` ถูกแปลงกลับเป็น `order_item_id = 5`

ฟังก์ชัน `loadDatabaseFromSupabase()` select ทุกตารางใน `TABLE_CONFIG` และส่งเข้า `fromSupabaseRows()` ส่วน `syncDatabaseToSupabase()` เรียก `toSupabaseRows()` แล้ว upsert ทุกตารางตาม `WRITE_ORDER` ทำให้ทุกหน้าจอใช้ data source เดียวกัน

## 3. SQL Files

### `supabase/schema.sql`

ไฟล์นี้สร้างโครงสร้างฐานข้อมูลแบบ schema-only ประกอบด้วย enum, table, primary key, foreign key, check constraint, index, comment และ database function หลัก เช่น `request_bill`, `process_cash_payment`, `start_preparing_order_item`, `mark_order_item_ready`, `send_order_item_to_table`, `serve_order_item` และ `delete_all_demo_data` การแยก schema ออกจาก seed ทำให้สามารถติดตั้งโครงสร้างฐานข้อมูลโดยไม่ทับข้อมูลตัวอย่างได้

### `supabase/seed.sql`

ไฟล์นี้เพิ่มข้อมูลตัวอย่างที่สมจริง เช่น staff login, 15 restaurant tables, 5 menu categories, menu items, inventory items, recipes, dining sessions, orders, order items, payments, activity logs และ inventory transactions ข้อมูลในไฟล์นี้ถูกออกแบบให้ dashboard มีข้อมูลให้สรุปทันทีหลัง seed

### `supabase/reset-new-ux.sql`

ไฟล์นี้เป็น one-shot rebuild สำหรับ class demo โดย drop object เก่า สร้าง schema ล่าสุด seed ข้อมูล และตั้ง permission สำหรับ anon/authenticated role ให้ app จาก Vercel ใช้งานได้ เหมาะกับการเตรียมฐานข้อมูลใหม่ก่อนส่งงานหรือก่อน demo

### `supabase/delete-all-data.sql`

ไฟล์นี้ลบข้อมูลทุกตารางแต่ไม่ลบ schema หรือ function ใช้เมื่อต้องการเริ่ม demo data ใหม่โดยยังเก็บโครงสร้างฐานข้อมูลไว้

### `supabase/public-demo-access.sql`

ไฟล์นี้ปิด RLS และ grant สิทธิ์ select/insert/update/delete ให้ anon และ authenticated role สำหรับ class demo เนื่องจากโปรเจกต์ใช้ demo login ผ่าน `app_users` ไม่ได้ใช้ Supabase Auth เต็มรูปแบบ

### `supabase/queries.sql`

ไฟล์นี้รวม query ตัวอย่างสำหรับรายงาน แบ่งเป็น Insert, Update, Soft Delete, Basic Query และ Advanced Query โดย query ขั้นสูงครอบคลุม dashboard เช่น KPI, peak hour, top menu, ingredient usage และ stock status

### `supabase/fix-live-inventory-menu-links.sql`

ไฟล์นี้ใช้แก้ Supabase project ที่เคยรัน seed รุ่นเก่าให้ตรงกับ UX ล่าสุด เช่น รวม category เป็น `Sides and Drinks`, แก้ ingredient names ให้ตรงเมนู, สร้าง recipe link ใหม่ และทำให้ `Cola syrup` ยังแสดงใน inventory แต่ `Cola` ถูกซ่อนจาก iPad ด้วย `is_available = false`

## 4. Configuration Files

### `package.json`

ไฟล์นี้ระบุ dependency หลัก ได้แก่ Next.js, React, Tailwind CSS และ Supabase client รวมถึง npm scripts `dev`, `build` และ `start` ที่ใช้ตอนพัฒนาและ deploy

### `tailwind.config.js` และ `postcss.config.mjs`

สองไฟล์นี้กำหนดให้ Tailwind สแกนไฟล์ใน `app`, `pages` และ `components` และให้ Next.js ประมวลผล Tailwind ผ่าน PostCSS plugin

### `next.config.mjs`

ไฟล์นี้ใช้ default Next.js configuration เพื่อให้ deploy บน Vercel ได้ง่ายและลด config ที่ไม่จำเป็น

### `vercel.json`

ไฟล์นี้กำหนดให้ Vercel ใช้ framework เป็น Next.js, install dependency ด้วย `npm ci` และ build ด้วย `npm run build` ทำให้ deploy reproducible จาก GitHub

### `.env.local.example`

ไฟล์นี้เป็น template ของ environment variables ที่ต้องใช้เชื่อมต่อ Supabase ได้แก่ `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY` ไฟล์จริง `.env.local` ถูก ignore จาก Git เพื่อไม่ให้ key หลุดขึ้น repository

## 5. Hardcoded vs Database-Driven Data

ข้อมูลที่เป็น business data เช่น โต๊ะ เมนู รูปเมนู วัตถุดิบ สูตรอาหาร order status payment และ dashboard metrics ถูกอ่านจาก Supabase ผ่าน `app/lib/supabaseDatabase.js` ไม่ได้เขียนเป็น static card ใน frontend ส่วนค่าที่ hardcoded ใน `app/page.jsx` เป็นค่าควบคุม UI และ workflow เช่น label ของปุ่ม, role shortcut สำหรับอาจารย์, timeout 15 นาที, dining limit 90 นาที และ fallback visual เมื่อ `menu_items.image_url` ว่างเท่านั้น

ดังนั้นหากเปลี่ยน `menu_items.name`, `menu_items.image_url`, `menu_items.is_available`, `inventory_items.quantity_on_hand`, หรือ recipe link ใน Supabase หน้าจอ customer iPad, inventory และ dashboard จะเปลี่ยนตามข้อมูลฐานข้อมูลหลังโหลดใหม่หรือหลัง sync state
