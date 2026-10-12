## ลำดับการทำงานเชิงตรรกะ

FROM / JOIN → WHERE → GROUP BY → HAVING → SELECT (Window Function) → DISTINCT → ORDER BY → LIMIT ([อ่านเพิ่ม](#/lesson/logical-query-order))

## สำรวจข้อมูล

| ต้องการ | สูตร |
|---|---|
| ตั้ง Schema เริ่มต้น | `USE sql_training;` |
| ดูรายชื่อตาราง | `SHOW TABLES IN sql_training;` |
| ดูคอลัมน์และชนิดข้อมูล | `DESCRIBE TABLE sales;` |
| ดูตัวอย่างข้อมูล | `SELECT * FROM sales LIMIT 10;` |
| นับแถว | `SELECT COUNT(*) FROM sales;` |

## เลือก กรอง เรียง

| ต้องการ | สูตร | รายละเอียด |
|---|---|---|
| เลือกและตั้งชื่อคอลัมน์ | `SELECT list_price - unit_cost AS margin` | [สูตร](#/formula/f-select-columns) |
| ค่าไม่ซ้ำ | `SELECT DISTINCT payment_method` | [สูตร](#/formula/f-distinct) |
| กรองหลายค่า | `WHERE store_id IN ('S01', 'S02')` | [สูตร](#/formula/f-in-between-like) |
| ผสม AND / OR | `WHERE (a OR b) AND c` | [บทที่ 5](#/lesson/and-or-in-between-like) |
| ทั้งเดือน | `WHERE d >= DATE'2026-02-01' AND d < DATE'2026-03-01'` | [สูตร](#/formula/f-date-range-filter) |
| ค่าว่าง | `WHERE customer_id IS NULL` | [สูตร](#/formula/f-is-null) |
| ค้นหาข้อความ | `WHERE product_name ILIKE '%ml%'` | [สูตร](#/formula/f-in-between-like) |
| Top N ทั้งตาราง | `ORDER BY net_amount DESC, sale_id LIMIT 5` | [สูตร](#/formula/f-top-n) |
| NULL ไว้ท้าย | `ORDER BY category NULLS LAST` | [สูตร](#/formula/f-order-by) |

## CASE WHEN และ NULL

| ต้องการ | สูตร |
|---|---|
| สร้างกลุ่ม | `CASE WHEN p >= 80 THEN 'High' WHEN p >= 25 THEN 'Medium' ELSE 'Low' END` |
| แทนค่าว่าง | `COALESCE(category, 'Unknown')` |
| กันหารศูนย์ | `x / NULLIF(y, 0)` หรือ `try_divide(x, y)` |
| ข้อความว่างเป็น NULL | `NULLIF(TRIM(col), '')` |

## สรุปข้อมูล

| ต้องการ | สูตร | รายละเอียด |
|---|---|---|
| นับแถว / มีค่า / ไม่ซ้ำ | `COUNT(*)`, `COUNT(col)`, `COUNT(DISTINCT col)` | [สูตร](#/formula/f-count-variants) |
| สรุปตามกลุ่ม | `GROUP BY store_id` | [สูตร](#/formula/f-group-by-sum) |
| กรองผลสรุป | `HAVING SUM(net_amount) > 2500` | [สูตร](#/formula/f-having) |
| ผลรวมมีเงื่อนไข | `SUM(CASE WHEN payment_method = 'Cash' THEN net_amount ELSE 0 END)` | [สูตร](#/formula/f-conditional-sum) |
| เปอร์เซ็นต์ | `ROUND(a * 100.0 / NULLIF(b, 0), 1)` | [สูตร](#/formula/f-safe-percentage) |

## รวมตาราง

| ต้องการ | สูตร | รายละเอียด |
|---|---|---|
| เติมข้อมูลไม่ให้แถวหาย | `FROM sales s LEFT JOIN products p ON s.product_id = p.product_id` | [สูตร](#/formula/f-left-join) |
| หาสิ่งที่ไม่มีคู่ | `WHERE NOT EXISTS (SELECT 1 FROM b WHERE b.k = a.k)` | [สูตร](#/formula/f-anti-join) |
| เทียบสองรายการ | `FULL OUTER JOIN ... WHERE a.k IS NULL OR b.k IS NULL` | [สูตร](#/formula/f-full-outer-join) |
| ต่อแถว | `SELECT ... UNION ALL SELECT ...` | [สูตร](#/formula/f-union-all) |
| ตรวจ Fan-out | นับ `COUNT(*)` และ `SUM` ก่อน/หลัง JOIN | [บทที่ 10](#/lesson/joins) |

## CTE และ Window Function

| ต้องการ | สูตร | รายละเอียด |
|---|---|---|
| แบ่งขั้นตอน | `WITH a AS (...), b AS (...) SELECT ... FROM b` | [สูตร](#/formula/f-cte) |
| อันดับต่อกลุ่ม | `ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY total_net DESC, product_id)` | [สูตร](#/formula/f-ranking-compare) |
| Top N ต่อกลุ่ม | CTE จัดอันดับ แล้ว `WHERE rn <= 3` ชั้นนอก | [สูตร](#/formula/f-top-n-per-group) |
| ยอดสะสม | `SUM(x) OVER (ORDER BY d)` | [สูตร](#/formula/f-running-total) |
| สัดส่วนต่อยอดรวม | `x * 100.0 / SUM(x) OVER ()` | [สูตร](#/formula/f-share-of-total) |
| แถวก่อนหน้า | `LAG(x) OVER (PARTITION BY g ORDER BY d)` | [สูตร](#/formula/f-lag-lead) |
| ค่าเฉลี่ยเคลื่อนที่ | `AVG(x) OVER (ORDER BY d ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)` | [สูตร](#/formula/f-moving-average) |

## วันที่ ข้อความ ตัวเลข

| ต้องการ | สูตร |
|---|---|
| วันแรกของเดือน | `CAST(DATE_TRUNC('MONTH', sale_date) AS DATE)` |
| ข้อความเป็นวันที่ | `CAST(try_to_timestamp(txt, 'dd/MM/yyyy') AS DATE)` |
| จำนวนวัน | `DATEDIFF(end_date, start_date)` |
| เลื่อนเดือน | `ADD_MONTHS(d, -12)` |
| ทำความสะอาดรหัส | `UPPER(TRIM(code))` |
| ข้อความเป็นตัวเลข | `TRY_CAST(REPLACE(txt, ',', '') AS DECIMAL(12,2))` |
| ปัดเศษ | `ROUND(x, 2)` |

## ตรวจคุณภาพข้อมูลและวิเคราะห์

| ต้องการ | สูตร | รายละเอียด |
|---|---|---|
| Key ซ้ำ | `GROUP BY key HAVING COUNT(*) > 1` | [สูตร](#/formula/f-find-duplicates) |
| นับ NULL | `COUNT(*) - COUNT(col)` หรือ `count_if(col IS NULL)` | [สูตร](#/formula/f-null-profile) |
| เก็บ 1 แถวต่อ Key | `ROW_NUMBER() OVER (PARTITION BY key ORDER BY ...) = 1` | [สูตร](#/formula/f-remove-duplicates) |
| กระทบยอด | CTE ทุกขั้น + `UNION ALL` | [สูตร](#/formula/f-reconciliation) |
| GP% | `(SUM(net) - SUM(cost)) * 100.0 / NULLIF(SUM(net), 0)` | [สูตร](#/formula/f-gross-profit) |
| เทียบปีก่อน | `LEFT JOIN m AS prev ON prev.month_start = ADD_MONTHS(cur.month_start, -12)` | [สูตร](#/formula/f-yoy-comparison) |
| ทุกวันครบ | `FROM calendar LEFT JOIN daily_sales` | [สูตร](#/formula/f-daily-sales-calendar) |
