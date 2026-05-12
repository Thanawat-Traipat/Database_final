# Final Report Outline

Use this outline for the Word/PDF report. It follows the assignment rubric directly, so it is safer than writing the report in a random order.

## 1. Project Overview

- Project name: The Nocturnal Epicurean Restaurant Management System
- DBMS: PostgreSQL on Supabase
- Web framework: Next.js deployed on Vercel
- Main workflows: cashier table management, customer iPad ordering, kitchen queue, waiter serving queue, manager dashboard, inventory management

## 2. Logical Database Design

Use `docs/er-diagram.md`.

Include:

- ER diagram screenshot or Mermaid export
- Entity list
- Attribute summary
- Relationship list
- Cardinality
- Participation constraints
- Important business rules, such as one open session per table and four-person table capacity

## 3. Physical Database Design

Use `docs/data-dictionary.md`.

Include:

- Table purpose
- Column name
- Data type
- Primary key
- Foreign key
- Nullability
- Default values
- Check constraints
- Soft-delete columns
- Sample rows, no more than 10 rows per table

## 4. Interface And Requirement Coverage

Use `docs/requirements-flow.md`.

Show that the interface covers:

- Insert: opening sessions, placing orders, creating payments, adding inventory records
- Update: table status, order item status, stock level, menu availability
- Soft delete: `deleted_at` and `is_active`
- Basic query: cashier grid, menu browse, active session detail, kitchen queue, waiter queue
- Advanced query: revenue, peak hour, top menu items, ingredient use, cost per head, service speed

## 5. Query Design

Use `supabase/queries.sql`.

For each important query, explain:

- What business question it answers
- Which tables it joins
- Whether it is a basic or advanced query
- Which index supports it
- Why the result helps a restaurant operator

## 6. Technical Implementation

Use:

- `README.md`
- `docs/supabase-sync.md`
- `docs/vercel-deployment.md`
- `docs/project-structure-and-logic.md`

Mention:

- Supabase URL and anon key are stored in environment variables
- The frontend uses `@supabase/supabase-js`
- The app does not use local browser storage as the database
- Vercel hosts the Next.js interface

## 7. User Manual

Take screenshots from the app and explain:

- Cashier login and table check-in
- Customer iPad menu and order history
- Kitchen start preparing / mark ready workflow
- Waiter out-for-serving / served workflow
- Manager dashboard and inventory stock toggle

## 8. Source Code Explanation

Use the real source files:

- `app/page.jsx`
- `app/lib/supabase.js`
- `app/lib/supabaseDatabase.js`
- `supabase/schema.sql`
- `supabase/seed.sql`

The rubric asks for comments explaining source code. If there is not enough time to comment every line in the actual files, add a report appendix that explains each major function and SQL block.

## 9. AI Usage Log

Use `docs/prompt-log-template.md`.

Include:

- Prompt text
- Date
- What AI returned
- What was changed manually
- How the result was checked

## Highest-Value Improvements Before Submission

1. Add screenshots to the user manual.
2. Fill the AI prompt log.
3. Explain `supabase/queries.sql` in the report.
4. Add a short paragraph explaining why Supabase/PostgreSQL is appropriate.
5. Add screenshots or exports of the ER diagram and data dictionary tables.
