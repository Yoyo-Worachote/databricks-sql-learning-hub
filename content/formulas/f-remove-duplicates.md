## สูตรนี้คืออะไร

| วิธี | ทำอะไร | ใช้เมื่อ |
|---|---|---|
| `SELECT DISTINCT *` | ตัดแถวที่เหมือนกันทุกคอลัมน์ | แถวซ้ำทั้งแถว (โหลดซ้ำ) |
| `ROW_NUMBER() OVER (PARTITION BY key ORDER BY ...) = 1` | เก็บ 1 แถวต่อ Key ตามลำดับที่กำหนด | Key ซ้ำแต่บางคอลัมน์ต่างกัน หรือต้องการรายการล่าสุดต่อ Key |

## รูปแบบ (Syntax)

```sql
WITH numbered AS (
  SELECT
    *,
    ROW_NUMBER() OVER (PARTITION BY key_col ORDER BY updated_at DESC) AS rn
  FROM table_name
)
SELECT *
FROM numbered
WHERE rn = 1;
```

## ตัวอย่างข้อมูลต้นทาง

<!-- verify: SELECT sale_id, store_id, net_amount FROM sales WHERE sale_id IN ('T0041','T0042','T0043') ORDER BY sale_id -->
| sale_id | store_id | net_amount |
|---|---|---|
| T0041 | S04 | 90.00 |
| T0042 | S01 | 15.00 |
| T0042 | S01 | 15.00 |
| T0043 | S01 | 108.00 |

## SQL Query ฉบับเต็มและผลลัพธ์

```sql {verify}
WITH numbered AS (
  SELECT
    sale_id,
    store_id,
    net_amount,
    ROW_NUMBER() OVER (PARTITION BY sale_id ORDER BY sale_datetime) AS rn
  FROM sales
)
SELECT
  COUNT(*)        AS rows_kept,
  SUM(net_amount) AS net_kept
FROM numbered
WHERE rn = 1;
```

| rows_kept | net_kept |
|---|---|
| 140 | 12468.00 |

ผลเท่ากับ `SELECT DISTINCT *` (140 แถว 12,468 บาท) เพราะแถวซ้ำ T0042 เหมือนกันทุกคอลัมน์

## อธิบายทีละส่วน

- `PARTITION BY sale_id` นับ 1, 2, … ใหม่ทุก sale_id
- T0042 มี 2 แถว ได้ rn = 1 และ 2 → `WHERE rn = 1` เก็บแถวเดียว
- `ORDER BY` ใน OVER กำหนดว่าจะเก็บแถวไหน (เช่น `updated_at DESC` = เก็บล่าสุด)

## ข้อผิดพลาดที่พบบ่อย

- `COUNT(DISTINCT sale_id)` คู่กับ `SUM(net_amount)` ที่ยังนับแถวซ้ำ ตัวเลขในรายงานเดียวกันไม่สอดคล้อง
- `ROW_NUMBER` ไม่มีลำดับที่มีความหมาย เลือกแถวแบบสุ่ม
- ตัดแถวซ้ำโดยไม่บันทึกว่าตัดอะไรไปเท่าไร

## ข้อควรระวังและกรณีพิเศษ

- ทำการตัดซ้ำครั้งเดียวใน CTE แรก แล้วสรุปทุกตัวเลขจากข้อมูลชุดนั้น
- รายงานผลกระทบด้วย [Reconciliation](#/formula/f-reconciliation)

## วิธีอื่นที่ใช้แทนกันได้

- Databricks: `QUALIFY ROW_NUMBER() OVER (PARTITION BY sale_id ORDER BY sale_datetime) = 1`

## แบบฝึกหัด

**โจทย์:** หารายการซื้อล่าสุดของลูกค้า C001, C002, C003

:::answer
```sql {verify}
WITH numbered AS (
  SELECT
    customer_id,
    sale_id,
    sale_datetime,
    store_id,
    net_amount,
    ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY sale_datetime DESC, sale_id DESC) AS rn
  FROM sales
  WHERE customer_id IN ('C001', 'C002', 'C003')
)
SELECT customer_id, sale_id, sale_datetime, store_id, net_amount
FROM numbered
WHERE rn = 1
ORDER BY customer_id;
```

| customer_id | sale_id | sale_datetime | store_id | net_amount |
|---|---|---|---|---|
| C001 | T0134 | 2026-03-28 13:52:55 | S01 | 9.00 |
| C002 | T0081 | 2026-02-19 16:59:40 | S02 | 60.00 |
| C003 | T0122 | 2026-03-20 13:34:58 | S05 | 118.00 |

**เหตุผล:** เรียงเวลาจากใหม่ไปเก่า แถว rn = 1 จึงเป็นรายการล่าสุดของแต่ละลูกค้า
:::
