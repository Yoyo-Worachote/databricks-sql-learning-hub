## ทำไมต้องรู้เรื่อง Dialect

SQL ทุกระบบใช้หลักการเดียวกัน แต่ไวยากรณ์บางส่วนต่างกัน เรียกว่า **Dialect (สำเนียง)** ถ้าค้นตัวอย่างจากอินเทอร์เน็ตหรือคัดลอกจากระบบอื่น ให้ตรวจก่อนว่าเป็นของ **Databricks / Spark SQL** หรือไม่ ตารางด้านล่างสรุปความต่างที่พบบ่อยในหลักสูตรนี้

## ตารางเปรียบเทียบ

| เรื่อง | Databricks SQL | SQL Server | MySQL / PostgreSQL |
|---|---|---|---|
| จำกัดจำนวนแถว | `LIMIT 10` | `SELECT TOP 10 ...` | `LIMIT 10` |
| ชื่อคอลัมน์ที่มีช่องว่าง | `` `ชื่อ คอลัมน์` `` | `[ชื่อ คอลัมน์]` | `` `...` `` (MySQL) / `"..."` (PostgreSQL) |
| ต่อข้อความ | `CONCAT(a, b)` หรือ `a \|\| b` | `a + b` หรือ `CONCAT` | `CONCAT` / `\|\|` |
| หาร `5 / 2` | `2.5` | `2` (จำนวนเต็ม) | `2.5` (MySQL) / `2` (PostgreSQL จำนวนเต็ม) |
| หารเอาจำนวนเต็ม | `5 DIV 2` | `5 / 2` | `5 DIV 2` (MySQL) |
| หารด้วยศูนย์ | Error `DIVIDE_BY_ZERO` (ANSI mode) | Error | NULL (MySQL) / Error (PostgreSQL) |
| หารแบบปลอดภัย | `try_divide(a, b)` หรือ `NULLIF` | `NULLIF` | `NULLIF` |
| แปลงชนิดแบบปลอดภัย | `TRY_CAST(x AS INT)` | `TRY_CAST` | ไม่มีโดยตรง |
| จำนวนวันระหว่างวันที่ | `DATEDIFF(end, start)` หรือ `DATEDIFF(DAY, start, end)` | `DATEDIFF(day, start, end)` | `DATEDIFF(end, start)` (MySQL) / `end - start` (PostgreSQL) |
| วันที่ปัจจุบัน | `CURRENT_DATE()` | `GETDATE()` | `CURRENT_DATE` |
| วันแรกของเดือน | `DATE_TRUNC('MONTH', d)` (คืน TIMESTAMP) | `DATEFROMPARTS(YEAR(d), MONTH(d), 1)` | `DATE_TRUNC('month', d)` (PostgreSQL) |
| ค้นหาไม่สนตัวพิมพ์ | `ILIKE` หรือ `LOWER(col) LIKE` | ขึ้นกับ Collation (มักไม่สนอยู่แล้ว) | `ILIKE` (PostgreSQL) |
| เปรียบเทียบข้อความ | แยกตัวพิมพ์ (`'Cash'` ≠ `'cash'`) | มักไม่แยก | ขึ้นกับการตั้งค่า |
| กรองผล Window Function | `QUALIFY` หรือ CTE + WHERE | CTE + WHERE | CTE + WHERE |
| GROUP BY ทุกคอลัมน์อัตโนมัติ | `GROUP BY ALL` | ไม่มี | ไม่มี |
| นับแบบมีเงื่อนไข | `count_if(cond)` | `SUM(CASE ...)` | `SUM(CASE ...)` / `COUNT(*) FILTER (WHERE ...)` |
| Anti / Semi Join | `LEFT ANTI JOIN` / `LEFT SEMI JOIN` | `NOT EXISTS` / `EXISTS` | `NOT EXISTS` / `EXISTS` |
| Subquery ใน FROM ไม่ตั้งชื่อ | ได้ (แต่ไม่แนะนำ) | Error | Error (MySQL) |
| ตำแหน่ง NULL เมื่อเรียง ASC | บนสุด | บนสุด | ล่างสุด (PostgreSQL) |

## ANSI mode ใน Databricks

SQL Warehouse ของ Databricks เปิด **ANSI mode** เป็นค่าเริ่มต้น ผลคือ

- หารด้วยศูนย์ → Error (ไม่ได้ NULL เงียบ ๆ)
- `CAST('abc' AS INT)` → Error `CAST_INVALID_INPUT`
- `TO_DATE('2026-01-06', 'dd/MM/yyyy')` → Error `CANNOT_PARSE_TIMESTAMP`

ข้อดีคือเจอปัญหาข้อมูลเร็ว ใช้ฟังก์ชันตระกูล `try_` (`try_divide`, `TRY_CAST`, `try_to_timestamp`) เมื่อคาดว่าข้อมูลอาจไม่สะอาด แล้วตรวจแถวที่ได้ NULL

## ความยืดหยุ่นเฉพาะของ Databricks

สิ่งเหล่านี้สะดวก แต่ทำให้ Query ย้ายไประบบอื่นยากขึ้น

- อ้างชื่อ Alias ใน `GROUP BY` และ `HAVING` ได้
- Lateral column alias: คอลัมน์ใน SELECT อ้าง Alias ที่ตั้งก่อนหน้าใน SELECT เดียวกันได้
- `SELECT * EXCEPT (col1, col2)`
- `QUALIFY`, `GROUP BY ALL`, `count_if`, `ILIKE`, `LEFT ANTI JOIN`

ถ้าทีมใช้ Databricks อย่างเดียว ใช้ได้เต็มที่ ถ้า Query ต้องแชร์กับระบบอื่น ให้เขียนแบบมาตรฐาน

## ข้อจำกัดของการตรวจในเว็บไซต์นี้

ตัวอย่างทั้งหมดเขียนด้วยไวยากรณ์ Databricks SQL และตรวจผลด้วยการรันจริงกับชุดข้อมูลฝึกผ่าน DuckDB (ระบบฐานข้อมูลที่ไวยากรณ์ใกล้เคียง) โดยแปลงฟังก์ชันเฉพาะของ Databricks บางตัวก่อนรัน ส่วนชุดเอกสารเดิมตรวจบน Apache Spark 4.0 (ANSI mode) ดูรายละเอียดที่ [เกี่ยวกับหลักสูตร](#/reference/about)
