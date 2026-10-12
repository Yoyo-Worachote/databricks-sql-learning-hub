## ข้อ 9.1 (ง่าย): นับค่าว่าง

**โจทย์:** นับจำนวนแถวในตาราง `sales` ที่ `discount_amount` เป็น NULL และที่ `customer_id` เป็น NULL

:::answer
```sql {verify}
SELECT
  COUNT(*) - COUNT(discount_amount) AS discount_nulls,
  COUNT(*) - COUNT(customer_id)     AS customer_nulls
FROM sales;
```

| discount_nulls | customer_nulls |
|---|---|
| 20 | 29 |

**เหตุผล:** `COUNT(col)` ไม่นับ NULL จึงนำ `COUNT(*)` ลบได้จำนวน NULL หรือใช้ `count_if(discount_amount IS NULL)` ของ Databricks ก็ได้ผลเดียวกัน
:::

## ข้อ 9.2 (ปานกลาง): พิสูจน์แถวซ้ำ

**โจทย์:** แสดงรายละเอียดทุกคอลัมน์ของแถวที่ `sale_id` ซ้ำ เพื่อพิสูจน์ว่าเป็นแถวซ้ำทั้งแถวหรือไม่

:::answer
```sql {verify}
SELECT *
FROM sales
WHERE sale_id IN (
  SELECT sale_id
  FROM sales
  GROUP BY sale_id
  HAVING COUNT(*) > 1
)
ORDER BY sale_id;
```

| sale_id | sale_date | sale_datetime | store_id | product_id | customer_id | quantity | unit_price | discount_amount | net_amount | payment_method |
|---|---|---|---|---|---|---|---|---|---|---|
| T0042 | 2026-01-23 | 2026-01-23 10:57:37 | S01 | P005 | C017 | 1 | 15.00 | 0.00 | 15.00 | Cash |
| T0042 | 2026-01-23 | 2026-01-23 10:57:37 | S01 | P005 | C017 | 1 | 15.00 | 0.00 | 15.00 | Cash |

**เหตุผล:** Subquery หา `sale_id` ที่ซ้ำ แล้วดึงแถวเต็มมาเทียบ ทั้ง 2 แถวของ T0042 เหมือนกันทุกคอลัมน์ = โหลดข้อมูลซ้ำ ตัดด้วย `SELECT DISTINCT *` ได้อย่างปลอดภัย ถ้าบางคอลัมน์ต่างกัน ต้องถามเจ้าของข้อมูลว่าแถวไหนถูก แล้วใช้ `ROW_NUMBER` เลือก
:::

## ข้อ 9.3 (ท้าทาย): รายงานคุณภาพข้อมูล 1 แถว

**โจทย์:** สร้างรายงานคุณภาพข้อมูล 1 แถว: จำนวนแถวทั้งหมด, จำนวนแถวซ้ำส่วนเกิน, รายการ quantity ≤ 0, รายการ quantity > 50, รายการที่ `product_id` ไม่มีใน `products` และ (เพิ่มเติม) รายการที่ยอดสุทธิติดลบทั้งที่ quantity เป็นบวก

:::answer
```sql {verify}
WITH dup AS (
  SELECT COALESCE(SUM(cnt - 1), 0) AS extra_dup_rows
  FROM (
    SELECT sale_id, COUNT(*) AS cnt
    FROM sales
    GROUP BY sale_id
    HAVING COUNT(*) > 1
  ) AS d
),
orphan AS (
  SELECT COUNT(*) AS orphan_rows
  FROM sales AS s
  LEFT JOIN products AS p
    ON s.product_id = p.product_id
  WHERE p.product_id IS NULL
),
checks AS (
  SELECT
    COUNT(*)                                  AS total_rows,
    count_if(quantity <= 0)                   AS non_positive_qty,
    count_if(quantity > 50)                   AS large_qty,
    count_if(quantity > 0 AND net_amount < 0) AS negative_net
  FROM sales
)
SELECT
  c.total_rows,
  d.extra_dup_rows,
  c.non_positive_qty,
  c.large_qty,
  o.orphan_rows,
  c.negative_net
FROM checks AS c
CROSS JOIN dup AS d
CROSS JOIN orphan AS o;
```

| total_rows | extra_dup_rows | non_positive_qty | large_qty | orphan_rows | negative_net |
|---|---|---|---|---|---|
| 141 | 1 | 1 | 1 | 1 | 2 |

**เหตุผล:** แต่ละ CTE ทำการตรวจ 1 เรื่องและคืน 1 แถว จึงต่อกันด้วย `CROSS JOIN` ได้โดยไม่เพิ่มแถว `SUM(cnt - 1)` นับเฉพาะแถว "ส่วนเกิน" (T0042 มี 2 แถว ส่วนเกิน 1) และ `COALESCE(..., 0)` ทำให้ได้ 0 แทน NULL ในวันที่ไม่มีแถวซ้ำ บันทึก Query นี้ไว้รันตรวจทุกครั้งที่มีข้อมูลรอบใหม่
:::
