## สูตรนี้คืออะไร

**CTE (Common Table Expression)** ตั้งชื่อผลลัพธ์ชั่วคราวด้วย `WITH name AS (...)` แบ่ง Query ยาวเป็นขั้นตอนที่อ่านจากบนลงล่างได้ CTE ตัวหลังอ้างถึงตัวก่อนหน้าได้ และมีอยู่เฉพาะใน Query นั้น (ไม่ได้สร้างตารางจริง)

**ใช้แก้ปัญหา:** Query ซ้อนหลายชั้นจนอ่านไม่ออก Logic ทำความสะอาดถูกคัดลอกซ้ำหลายจุด หรือต้องกรองผลสรุป/ผล Window Function ในชั้นถัดไป

## รูปแบบ (Syntax)

```sql
WITH step_1 AS (
  SELECT ...
  FROM table_name
  WHERE ...
),
step_2 AS (
  SELECT ...
  FROM step_1
  GROUP BY ...
)
SELECT *
FROM step_2;
```

`WITH` ครั้งเดียว คั่น CTE ด้วยจุลภาค จบด้วย SELECT หลัก และใส่ `;` ครั้งเดียวท้ายสุด

## ตัวอย่างข้อมูลต้นทาง

ตาราง `sales` 141 แถว มีแถวซ้ำ 1 แถว (T0042) และรายการผิดปกติ 2 แถว (T0061 quantity −2, T0096 quantity 60)

## SQL Query ฉบับเต็มและผลลัพธ์

**โจทย์:** สัดส่วนยอดขายของแต่ละสาขาเทียบยอดรวมบริษัท หลังตัดรายการซ้ำและรายการผิดปกติ

```sql {verify}
WITH clean_sales AS (
  -- ขั้น 1: ตัดแถวซ้ำ และเก็บเฉพาะรายการปกติ 1-50 ชิ้น
  SELECT DISTINCT *
  FROM sales
  WHERE quantity BETWEEN 1 AND 50
),
store_total AS (
  -- ขั้น 2: ยอดรวมต่อสาขา
  SELECT store_id, SUM(net_amount) AS store_net
  FROM clean_sales
  GROUP BY store_id
),
company_total AS (
  -- ขั้น 3: ยอดรวมบริษัท (1 แถว)
  SELECT SUM(store_net) AS company_net
  FROM store_total
)
SELECT
  st.store_id,
  st.store_net,
  ROUND(st.store_net * 100.0 / NULLIF(ct.company_net, 0), 1) AS share_pct
FROM store_total AS st
CROSS JOIN company_total AS ct
ORDER BY share_pct DESC;
```

| store_id | store_net | share_pct |
|---|---|---|
| S01 | 4363.00 | 36.1 |
| S02 | 2810.00 | 23.3 |
| S04 | 2618.00 | 21.7 |
| S03 | 1624.00 | 13.4 |
| S05 | 663.00 | 5.5 |

## อธิบายทีละส่วน และลำดับการทำงาน

| ขั้น | ได้อะไร | จำนวนแถว |
|---|---|---|
| `clean_sales` | รายการขายที่สะอาดแล้ว | 138 |
| `store_total` | ยอดต่อสาขา | 5 |
| `company_total` | ยอดรวมบริษัท 12,078 บาท | 1 |
| SELECT หลัก | `CROSS JOIN` ยอดบริษัท 1 แถวเข้ากับทุกสาขา แล้วคำนวณ % | 5 |

**วิธีตรวจทีละขั้น:** เปลี่ยน SELECT สุดท้ายเป็น `SELECT COUNT(*), SUM(net_amount) FROM clean_sales` ดูว่าสมเหตุสมผลก่อนไปขั้นถัดไป

## ข้อผิดพลาดที่พบบ่อย

- ใส่ `;` หลังวงเล็บปิดของ CTE → `PARSE_SYNTAX_ERROR`
- ลืมจุลภาคระหว่าง CTE หรือเขียน `WITH` ซ้ำ
- ตั้งชื่อ `t1`, `temp` ทำให้อ่านยาก
- ใส่ `ORDER BY` ใน CTE แล้วคาดหวังว่าผลสุดท้ายจะเรียงตาม

## ข้อควรระวังและกรณีพิเศษ

- CTE ใช้ได้เฉพาะใน Query นั้น เปิด Query ใหม่จะเรียกชื่อเดิมไม่ได้ ถ้าต้องใช้ซ้ำหลายรายงานให้สร้าง View
- CTE ที่ถูกอ้างหลายครั้งอาจถูกคำนวณซ้ำ ระบบมักจัดการให้ แต่ถ้าหนักมากให้ปรึกษาทีม Data

## วิธีอื่นที่ใช้แทนกันได้

- [Subquery ใน FROM](#/formula/f-subquery-from) ได้ผลเหมือนกันแต่อ่านยากเมื่อซ้อนหลายชั้น
- `SUM(store_net) OVER ()` แทน CTE `company_total` ([ดูสูตร](#/formula/f-share-of-total))

## แบบฝึกหัด

**โจทย์:** ใช้ CTE สรุปยอดรายเดือนต่อสาขา แล้วแสดงเฉพาะเดือน-สาขาที่ยอดเกิน 1,000 บาท

:::answer
```sql {verify}
WITH store_month AS (
  SELECT
    store_id,
    CAST(DATE_TRUNC('MONTH', sale_date) AS DATE) AS month_start,
    SUM(net_amount)                              AS total_net
  FROM sales
  GROUP BY store_id, CAST(DATE_TRUNC('MONTH', sale_date) AS DATE)
)
SELECT
  store_id,
  month_start,
  total_net
FROM store_month
WHERE total_net > 1000
ORDER BY month_start, store_id;
```

| store_id | month_start | total_net |
|---|---|---|
| S01 | 2026-01-01 | 2480.00 |
| S02 | 2026-01-01 | 1228.00 |
| S04 | 2026-01-01 | 1143.00 |
| S01 | 2026-03-01 | 1285.00 |
| S02 | 2026-03-01 | 1748.00 |

**เหตุผล:** เมื่อสรุปใน CTE แล้ว `total_net` เป็นคอลัมน์ธรรมดา จึงกรองด้วย `WHERE` ในชั้นนอกได้ เดือนกุมภาพันธ์ไม่มีสาขาใดเกิน 1,000 บาท
:::
