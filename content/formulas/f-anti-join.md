## สูตรนี้คืออะไร

**Anti-join** คือการหาแถวในตาราง A ที่**ไม่มีคู่**ในตาราง B เช่น ลูกค้าที่ไม่มีรายการสั่งซื้อ สินค้าที่ไม่มียอดขาย หรือรหัสสินค้าในยอดขายที่ไม่มีในตารางสินค้า (Orphan Key)

มี 3 วิธีที่ได้ผลเหมือนกัน

| วิธี | ใช้ได้กับ | จุดเด่น |
|---|---|---|
| `LEFT JOIN ... WHERE b.key IS NULL` | ทุกระบบ | เห็นภาพง่าย |
| `WHERE NOT EXISTS (SELECT 1 ...)` | ทุกระบบ | อ่านตรงความหมาย ปลอดภัยกับ NULL |
| `LEFT ANTI JOIN` | Databricks / Spark | สั้นที่สุด |

## รูปแบบ (Syntax)

```sql
-- วิธีที่ 1
SELECT a.*
FROM table_a AS a
LEFT JOIN table_b AS b ON a.key = b.key
WHERE b.key IS NULL;

-- วิธีที่ 2
SELECT a.*
FROM table_a AS a
WHERE NOT EXISTS (SELECT 1 FROM table_b AS b WHERE b.key = a.key);

-- วิธีที่ 3 (Databricks)
SELECT a.*
FROM table_a AS a
LEFT ANTI JOIN table_b AS b ON a.key = b.key;
```

## ตัวอย่างข้อมูลต้นทาง

ตาราง `customers` (จากไฟล์ตารางเสริม) มีสมาชิก 22 คน C001–C022 ส่วนตาราง `sales` มีรายการของสมาชิก C001–C020

<!-- verify: SELECT customer_id, segment, join_date FROM customers WHERE customer_id IN ('C019','C020','C021','C022') ORDER BY customer_id -->
| customer_id | segment | join_date |
|---|---|---|
| C019 | Silver | 2025-05-18 |
| C020 | Basic | 2025-08-09 |
| C021 | Basic | 2026-02-20 |
| C022 | Silver | 2026-03-15 |

## SQL Query ฉบับเต็มและผลลัพธ์

**โจทย์:** หาลูกค้าที่ไม่มีรายการสั่งซื้อ

```sql {verify}
SELECT
  c.customer_id,
  c.segment,
  c.join_date
FROM customers AS c
WHERE NOT EXISTS (
  SELECT 1
  FROM sales AS s
  WHERE s.customer_id = c.customer_id
)
ORDER BY c.customer_id;
```

| customer_id | segment | join_date |
|---|---|---|
| C021 | Basic | 2026-02-20 |
| C022 | Silver | 2026-03-15 |

**วิธี LEFT JOIN ... IS NULL** (ผลเหมือนกัน)

```sql {verify}
SELECT
  c.customer_id,
  c.segment,
  c.join_date
FROM customers AS c
LEFT JOIN sales AS s
  ON c.customer_id = s.customer_id
WHERE s.sale_id IS NULL
ORDER BY c.customer_id;
```

| customer_id | segment | join_date |
|---|---|---|
| C021 | Basic | 2026-02-20 |
| C022 | Silver | 2026-03-15 |

**วิธี LEFT ANTI JOIN (Databricks):** สินค้าที่ไม่มียอดขาย

```sql {verify}
SELECT
  p.product_id,
  p.product_name
FROM products AS p
LEFT ANTI JOIN sales AS s
  ON p.product_id = s.product_id
ORDER BY p.product_id;
```

| product_id | product_name |
|---|---|
| P011 | ถุงขยะ 30 ใบ |
| P012 | กระดาษทิชชู 6 ม้วน |

## อธิบายทีละส่วน

- **NOT EXISTS:** ตรวจทีละลูกค้าว่ามีรายการขายอย่างน้อย 1 แถวหรือไม่ เก็บเฉพาะคนที่ไม่มี (`SELECT 1` ไม่สำคัญว่าเลือกอะไร)
- **LEFT JOIN ... IS NULL:** ลูกค้าที่หาคู่ไม่เจอมี `s.sale_id` เป็น NULL ตรวจ NULL ที่คอลัมน์ Key ของตารางขวา (ไม่ใช่คอลัมน์ที่อาจเป็น NULL อยู่แล้ว)
- **LEFT ANTI JOIN:** คืนเฉพาะคอลัมน์ของตารางซ้ายที่ไม่มีคู่

## ข้อผิดพลาดที่พบบ่อย

**อย่าใช้ NOT IN กับ Subquery ที่อาจมี NULL**

```sql {verify}
SELECT COUNT(*) AS customers_without_sales
FROM customers
WHERE customer_id NOT IN (SELECT customer_id FROM sales);
```

| customers_without_sales |
|---|
| 0 |

ได้ 0 ทั้งที่จริงมี 2 คน เพราะ `sales.customer_id` มีค่า NULL (ลูกค้าทั่วไป) ทำให้ `NOT IN` ได้ unknown กับทุกแถว ไม่มี Error ให้เห็น

- LEFT JOIN แล้วตรวจ NULL ที่คอลัมน์ผิด เช่น `s.discount_amount IS NULL` ซึ่งเป็น NULL ได้แม้จับคู่เจอ

## ข้อควรระวังและกรณีพิเศษ

- ถ้าต้องการกรองช่วงเวลาของตารางขวา (เช่น "ไม่ซื้อในไตรมาส 1") ให้ใส่เงื่อนไขใน `ON` หรือใน Subquery ของ `NOT EXISTS` ไม่ใช่ใน `WHERE` ด้านนอก
- Orphan Key: กลับข้างตาราง `sales LEFT ANTI JOIN products` จะได้รายการ P099 ที่ไม่มีในตารางสินค้า

## วิธีอื่นที่ใช้แทนกันได้

- [FULL OUTER JOIN](#/formula/f-full-outer-join) หาสิ่งที่มีฝั่งเดียวทั้งสองทิศทางในคราวเดียว
- `EXCEPT`: `SELECT customer_id FROM customers EXCEPT SELECT customer_id FROM sales`

## แบบฝึกหัด

**โจทย์:** หารหัสสินค้าในตาราง `sales` ที่ไม่มีในตาราง `products` พร้อมจำนวนรายการและยอด (ใช้ LEFT ANTI JOIN)

:::answer
```sql {verify}
SELECT
  s.product_id,
  COUNT(*)          AS line_count,
  SUM(s.net_amount) AS total_net
FROM sales AS s
LEFT ANTI JOIN products AS p
  ON s.product_id = p.product_id
GROUP BY s.product_id;
```

| product_id | line_count | total_net |
|---|---|---|
| P099 | 1 | 270.00 |

**เหตุผล:** ตารางซ้ายคือ `sales` จึงได้รายการขายที่หาสินค้าไม่เจอ ต้องแจ้งทีมข้อมูลสินค้าให้เพิ่มรหัส และระบุในรายงานว่ายอด 270 บาทไม่รู้หมวด/ต้นทุน
:::
