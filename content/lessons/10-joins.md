## ทำไมต้อง JOIN

ข้อมูลในองค์กรมักแยกเก็บหลายตารางเพื่อไม่ให้ข้อมูลซ้ำ เช่น ตาราง `sales` เก็บแค่ `product_id` ส่วนชื่อสินค้า หมวด และต้นทุนอยู่ในตาราง `products` ถ้าอยากเห็นยอดขายพร้อมชื่อสินค้า ต้อง **JOIN** คือ **จับคู่แถวระหว่างตาราง** ด้วยคอลัมน์ที่มีค่าตรงกัน คล้าย VLOOKUP / XLOOKUP ใน Excel

**คำศัพท์สำคัญ**

| คำศัพท์ | ความหมาย | ตัวอย่าง |
|---|---|---|
| **Primary Key (PK)** | คอลัมน์ที่ระบุแถวได้ไม่ซ้ำในตารางนั้น | `products.product_id`, `stores.store_id` |
| **Foreign Key (FK)** | คอลัมน์ที่อ้างถึง Primary Key ของอีกตาราง | `sales.product_id`, `sales.store_id` |
| **Fact table** | ตารางเหตุการณ์ มีหลายแถว เช่น รายการขาย | `sales` |
| **Dimension table** | ตารางข้อมูลประกอบ 1 แถวต่อ 1 สิ่ง | `products`, `stores` |

> [!DATABRICKS] Databricks ไม่บังคับความถูกต้องของ Key ให้
> ตารางใน Databricks ส่วนใหญ่ไม่ได้ป้องกันการมี Key ซ้ำหรือ Foreign Key ที่หาคู่ไม่เจอ (เช่น `P099` ในตาราง `sales` ที่ไม่มีในตาราง `products`) เราจึงต้องตรวจเองทุกครั้ง

## JOIN ทำงานอย่างไร: ดูทีละแถว

**ข้อมูลต้นทาง:** 3 รายการขายจากตาราง `sales`

| sale_id | product_id | net_amount |
|---|---|---|
| T0001 | P002 | 18.00 |
| T0004 | P004 | 75.00 |
| T0018 | P099 | 270.00 |

ระบบนำ `product_id` ของแต่ละแถวไปหาแถวที่ `product_id` ตรงกันในตาราง `products` P002 และ P004 หาคู่เจอ แต่ **P099 หาคู่ไม่เจอ** เพราะไม่มีในตาราง `products`

**ผลของ LEFT JOIN:** เก็บทุกแถวของตารางซ้าย ถ้าหาคู่ไม่เจอ คอลัมน์ของตารางขวาเป็น `NULL`

```sql {verify}
SELECT
  s.sale_id,
  s.product_id,
  p.product_name,
  p.category,
  s.net_amount
FROM sales AS s
LEFT JOIN products AS p
  ON s.product_id = p.product_id
WHERE s.sale_id IN ('T0001', 'T0004', 'T0018')
ORDER BY s.sale_id;
```

| sale_id | product_id | product_name | category | net_amount |
|---|---|---|---|---|
| T0001 | P002 | ชาเขียว 500ml | Beverage | 18.00 |
| T0004 | P004 | มันฝรั่งทอด 50g | Snack | 75.00 |
| T0018 | P099 | NULL | NULL | 270.00 |

**ผลของ INNER JOIN:** เก็บเฉพาะแถวที่หาคู่เจอ แถว T0018 **หายไปเงียบ ๆ** พร้อมยอดขาย 270 บาท

```sql {verify}
SELECT
  s.sale_id,
  s.product_id,
  p.product_name,
  p.category,
  s.net_amount
FROM sales AS s
INNER JOIN products AS p
  ON s.product_id = p.product_id
WHERE s.sale_id IN ('T0001', 'T0004', 'T0018')
ORDER BY s.sale_id;
```

| sale_id | product_id | product_name | category | net_amount |
|---|---|---|---|---|
| T0001 | P002 | ชาเขียว 500ml | Beverage | 18.00 |
| T0004 | P004 | มันฝรั่งทอด 50g | Snack | 75.00 |

**อธิบายส่วนประกอบของ JOIN**

| ส่วนของ Query | ความหมาย |
|---|---|
| `FROM sales AS s` | ตารางหลัก (ตารางซ้าย) ตั้งชื่อย่อว่า `s` |
| `LEFT JOIN products AS p` | ตารางที่จะนำมาจับคู่ (ตารางขวา) ชื่อย่อ `p` |
| `ON s.product_id = p.product_id` | เงื่อนไขการจับคู่ |
| `s.sale_id`, `p.product_name` | ใส่ชื่อย่อนำหน้าเพื่อบอกว่าคอลัมน์มาจากตารางไหน |

## INNER JOIN vs LEFT JOIN: ตรวจจำนวนแถวทุกครั้ง

นับจำนวนแถวก่อนและหลัง JOIN ทั้งตาราง

```sql {verify}
SELECT
  (SELECT COUNT(*) FROM sales) AS sales_rows,
  (SELECT COUNT(*) FROM sales AS s
     INNER JOIN products AS p ON s.product_id = p.product_id) AS inner_join_rows,
  (SELECT COUNT(*) FROM sales AS s
     LEFT JOIN products AS p ON s.product_id = p.product_id)  AS left_join_rows;
```

| sales_rows | inner_join_rows | left_join_rows |
|---|---|---|
| 141 | 140 | 141 |

- `inner_join_rows = 140` หายไป 1 แถว คือรายการ P099
- `left_join_rows = 141` เก็บทุกแถวของ `sales` ไว้

> [!KEY] เลือกอย่างไร
> - ต้องการ**ทุกรายการของตารางหลัก** (เช่น ยอดขายรวมต้องไม่หาย) → `LEFT JOIN`
> - ต้องการ**เฉพาะรายการที่ข้อมูลครบทั้งสองฝั่ง** (เช่น คำนวณต้นทุนได้เฉพาะสินค้าที่รู้ต้นทุน) → `INNER JOIN` และต้องรายงานว่าตัดอะไรออกไป

## หาสิ่งที่ไม่มีคู่ (Anti-join)

**สถานการณ์:** ฝ่ายสินค้าอยากรู้ว่าสินค้าตัวไหนยังไม่เคยขายได้เลย

```sql {verify}
SELECT
  p.product_id,
  p.product_name,
  p.is_active
FROM products AS p
LEFT JOIN sales AS s
  ON p.product_id = s.product_id
WHERE s.sale_id IS NULL;
```

| product_id | product_name | is_active |
|---|---|---|
| P011 | ถุงขยะ 30 ใบ | true |
| P012 | กระดาษทิชชู 6 ม้วน | false |

**ทำงานอย่างไร:** เริ่มจาก `products` (เก็บสินค้าทุกตัว) แล้ว LEFT JOIN `sales` สินค้าที่หาคู่ไม่เจอจะมี `s.sale_id` เป็น `NULL` จากนั้น `WHERE s.sale_id IS NULL` เก็บเฉพาะแถวเหล่านั้น

อีกวิธีที่อ่านตรงความหมายกว่าคือ `NOT EXISTS` เช่น หาลูกค้าสมาชิกที่ไม่มีรายการซื้อเลย (ใช้ตาราง `customers` จากไฟล์ตารางเสริม)

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

ดูทั้ง 3 วิธี (รวม `LEFT ANTI JOIN` ของ Databricks) และเหตุผลที่ไม่ควรใช้ `NOT IN` ที่ [หาสิ่งที่ไม่มีคู่](#/formula/f-anti-join)

## กับดัก: LEFT JOIN แล้วกรองตารางขวาใน WHERE

**สถานการณ์:** อยากนับรายการที่จ่ายเงินสดของ**ทุกสาขา** สาขาที่ไม่มีให้แสดง 0

> [!MISTAKE] ใส่เงื่อนไขของตารางขวาใน WHERE

```sql {verify}
SELECT
  st.store_id,
  COUNT(s.sale_id) AS line_count
FROM stores AS st
LEFT JOIN sales AS s
  ON st.store_id = s.store_id
WHERE s.payment_method = 'Cash'
GROUP BY st.store_id
ORDER BY st.store_id;
```

| store_id | line_count |
|---|---|
| S01 | 16 |
| S02 | 10 |
| S03 | 13 |
| S04 | 7 |
| S05 | 5 |

**สาขา S06 หายไป** เพราะหลัง LEFT JOIN แถวของ S06 มี `s.payment_method` เป็น `NULL` แล้ว `WHERE` ตัดทิ้ง LEFT JOIN จึงทำงานเหมือน INNER JOIN

**วิธีแก้:** ย้ายเงื่อนไขของตารางขวาไปไว้ใน `ON`

```sql {verify}
SELECT
  st.store_id,
  COUNT(s.sale_id) AS line_count
FROM stores AS st
LEFT JOIN sales AS s
  ON  st.store_id = s.store_id
  AND s.payment_method = 'Cash'
GROUP BY st.store_id
ORDER BY st.store_id;
```

| store_id | line_count |
|---|---|
| S01 | 16 |
| S02 | 10 |
| S03 | 13 |
| S04 | 7 |
| S05 | 5 |
| S06 | 0 |

`COUNT(s.sale_id)` นับเฉพาะแถวที่จับคู่ได้ S06 จึงได้ 0 (ถ้าใช้ `COUNT(*)` จะได้ 1 ซึ่งผิด เพราะนับแถวของสาขาที่เติม NULL)

> [!KEY] หลักจำ
> ถ้าต้องการเก็บทุกแถวของตารางซ้าย ให้ใส่เงื่อนไขของ**ตารางขวา**ใน `ON` ส่วนเงื่อนไขของ**ตารางซ้าย**ใส่ใน `WHERE` ได้ตามปกติ

## JOIN 3 ตาราง

**สถานการณ์:** ทีมจัดซื้ออยากเห็นยอดขายแยกตามภูมิภาค (อยู่ใน `stores`) และหมวดสินค้า (อยู่ใน `products`)

```sql {verify partial count=15}
SELECT
  st.region,
  COALESCE(p.category, 'Unknown') AS category,
  SUM(s.net_amount)               AS total_net
FROM sales AS s
LEFT JOIN products AS p
  ON s.product_id = p.product_id
LEFT JOIN stores AS st
  ON s.store_id = st.store_id
GROUP BY st.region, COALESCE(p.category, 'Unknown')
ORDER BY st.region, total_net DESC;
```

**ผลลัพธ์** (แสดง 8 จาก 15 แถว)

| region | category | total_net |
|---|---|---|
| Bangkok | Personal Care | 4273.00 |
| Bangkok | Beverage | 1725.00 |
| Bangkok | Snack | 1190.00 |
| Bangkok | Unknown | 390.00 |
| North | Beverage | 556.00 |
| North | Personal Care | 474.00 |
| North | Snack | 360.00 |
| North | Unknown | 234.00 |

- JOIN ต่อกันได้หลายตาราง แต่ละ JOIN มี `ON` ของตัวเอง
- ใช้ `LEFT JOIN` ทั้งคู่เพื่อไม่ให้ยอดขายหาย
- `COALESCE(p.category, 'Unknown')` รวมรายการที่ไม่รู้หมวด (P010 ที่หมวดว่าง และ P099 ที่ไม่มีในตารางสินค้า) ไว้ในกลุ่ม Unknown แทนที่จะหายไป

ดูสูตรเต็มที่ [รวมข้อมูลจากหลายตาราง](#/formula/f-multi-table-join)

## JOIN หลายเงื่อนไข

บางครั้งต้องจับคู่มากกว่า 1 เงื่อนไข เช่น รายการขายที่อยู่ในช่วงโปรโมชันของสินค้านั้น

```sql {verify}
SELECT
  s.sale_id,
  s.sale_date,
  s.product_id,
  pr.promo_name,
  s.unit_price
FROM sales AS s
INNER JOIN promotions AS pr
  ON  s.product_id = pr.product_id
  AND s.sale_date BETWEEN pr.start_date AND pr.end_date
ORDER BY s.sale_date, s.sale_id
LIMIT 6;
```

| sale_id | sale_date | product_id | promo_name | unit_price |
|---|---|---|---|---|
| T0001 | 2026-01-02 | P002 | ชาเขียวลดต้นปี | 18.00 |
| T0002 | 2026-01-02 | P002 | ชาเขียวลดต้นปี | 18.00 |
| T0005 | 2026-01-03 | P002 | ชาเขียวลดต้นปี | 18.00 |
| T0007 | 2026-01-05 | P002 | ชาเขียวลดต้นปี | 18.00 |
| T0008 | 2026-01-05 | P002 | ชาเขียวลดต้นปี | 18.00 |
| T0017 | 2026-01-08 | P002 | ชาเขียวลดต้นปี | 18.00 |

เงื่อนไขวันที่ทำให้แต่ละรายการขายจับคู่ได้ไม่เกิน 1 โปรโมชัน (ตารางนี้ `start_date` และ `end_date` เป็น DATE จึงใช้ `BETWEEN` ได้ถูกต้อง)

## Fan-out: JOIN แล้วแถวและยอดเพิ่มขึ้นผิด ๆ

ถ้าตารางขวามี**หลายแถวต่อ 1 Key** แถวของตารางซ้ายจะถูกคูณ สินค้า P002 มี 2 โปรโมชัน (ต้นปีและหน้าร้อน)

**ก่อน JOIN**

```sql {verify}
SELECT
  COUNT(*)        AS row_count,
  SUM(net_amount) AS total_net
FROM sales
WHERE product_id = 'P002';
```

| row_count | total_net |
|---|---|
| 20 | 986.00 |

**หลัง JOIN ด้วย product_id อย่างเดียว**

```sql {verify}
SELECT
  COUNT(*)          AS row_count,
  SUM(s.net_amount) AS total_net
FROM sales AS s
JOIN promotions AS pr
  ON s.product_id = pr.product_id
WHERE s.product_id = 'P002';
```

| row_count | total_net |
|---|---|
| 40 | 1972.00 |

แถวเพิ่มจาก 20 เป็น 40 และยอดเพิ่มเป็น 2 เท่า เพราะแต่ละรายการขายของ P002 จับคู่ได้ 2 โปรโมชัน

> [!WARNING] วิธีป้องกัน Fan-out
> 1. นับแถวและยอดรวมก่อน/หลัง JOIN ทุกครั้ง
> 2. JOIN กับตารางที่ Key ไม่ซ้ำ (Dimension) หรือ
> 3. สรุปตารางขวาให้เหลือ 1 แถวต่อ Key ก่อน แล้วค่อย JOIN (ดูบทที่ 20)
> 4. เพิ่มเงื่อนไขใน `ON` ให้จับคู่ได้แถวเดียว (เช่น ช่วงวันที่ ตามตัวอย่างก่อนหน้า)

## JOIN ประเภทอื่น: RIGHT, FULL OUTER, CROSS, SEMI/ANTI

| ประเภท | เก็บแถวอะไร | ใช้เมื่อ |
|---|---|---|
| `INNER JOIN` (หรือ `JOIN`) | เฉพาะที่จับคู่ได้ทั้งสองฝั่ง | ต้องการข้อมูลครบทั้งสองฝั่ง |
| `LEFT JOIN` | ทุกแถวของซ้าย + ข้อมูลขวาถ้าจับคู่ได้ | เติมข้อมูลโดยไม่ให้แถวหลักหาย (ใช้บ่อยที่สุด) |
| `RIGHT JOIN` | ทุกแถวของขวา | เหมือน LEFT JOIN แต่กลับข้าง นิยมเขียนเป็น LEFT JOIN โดยสลับตารางเพื่ออ่านง่าย |
| `FULL OUTER JOIN` | ทุกแถวของทั้งสองฝั่ง | เทียบรายการสองแหล่งว่าอะไรมีฝั่งเดียว |
| `CROSS JOIN` | ทุกคู่ที่เป็นไปได้ (ซ้าย × ขวา) | สร้างตารางครบทุกคู่ เช่น ทุกสาขา × ทุกวัน |
| `LEFT SEMI JOIN` | แถวของซ้ายที่**มี**คู่ (ไม่เอาคอลัมน์ขวา ไม่ซ้ำ) | เหมือน `WHERE EXISTS` (เฉพาะ Databricks/Spark) |
| `LEFT ANTI JOIN` | แถวของซ้ายที่**ไม่มี**คู่ | เหมือน `WHERE NOT EXISTS` (เฉพาะ Databricks/Spark) |

**FULL OUTER JOIN:** เทียบรายการสินค้าใน Master กับสินค้าที่มียอดขาย

```sql {verify}
SELECT
  p.product_id AS master_product_id,
  s.product_id AS sold_product_id
FROM products AS p
FULL OUTER JOIN (SELECT DISTINCT product_id FROM sales) AS s
  ON p.product_id = s.product_id
WHERE p.product_id IS NULL
   OR s.product_id IS NULL
ORDER BY COALESCE(p.product_id, s.product_id);
```

| master_product_id | sold_product_id |
|---|---|
| P011 | NULL |
| P012 | NULL |
| NULL | P099 |

ได้ทั้งสินค้าที่ไม่เคยขาย (P011, P012) และรหัสที่ขายแต่ไม่มีใน Master (P099) ในคราวเดียว

**CROSS JOIN:** สร้างทุกคู่ของสาขากับวิธีชำระเงิน (ใช้เป็นโครงก่อน LEFT JOIN ยอดจริง เพื่อให้คู่ที่ไม่มียอดแสดงเป็น 0)

```sql {verify}
SELECT
  st.store_id,
  pm.payment_method
FROM stores AS st
CROSS JOIN (SELECT DISTINCT payment_method FROM sales) AS pm
WHERE st.store_id IN ('S05', 'S06')
ORDER BY st.store_id, pm.payment_method;
```

| store_id | payment_method |
|---|---|
| S05 | Cash |
| S05 | Credit Card |
| S05 | QR Payment |
| S06 | Cash |
| S06 | Credit Card |
| S06 | QR Payment |

> [!WARNING] CROSS JOIN ขยายจำนวนแถวแบบคูณ
> ตาราง 1,000 แถว CROSS JOIN กับ 1,000 แถว ได้ 1,000,000 แถว ใช้กับตารางเล็กหรือเมื่อตั้งใจเท่านั้น

## ข้อผิดพลาดที่พบบ่อย

> [!MISTAKE] ไม่ระบุว่าคอลัมน์มาจากตารางไหน

```sql {error}
SELECT store_id, store_name, net_amount
FROM sales AS s
JOIN stores AS st
  ON s.store_id = st.store_id
LIMIT 3;
```

```text
[AMBIGUOUS_REFERENCE] Reference `store_id` is ambiguous, could be: [`s`.`store_id`, `st`.`store_id`].
```

`store_id` มีทั้งใน `sales` และ `stores` วิธีแก้คือใส่ชื่อย่อนำหน้า**ทุก**คอลัมน์ เช่น `s.store_id, st.store_name, s.net_amount`

- ใช้ INNER JOIN แล้วข้อมูลที่ Key ไม่ตรงหายไปโดยไม่รู้ตัว
- JOIN กับตารางที่ Key ซ้ำ ทำให้แถวและยอดรวมเพิ่มขึ้น (Fan-out)
- LEFT JOIN แล้วกรองคอลัมน์ของตารางขวาใน `WHERE`
- JOIN ด้วยคอลัมน์ที่รูปแบบต่างกัน เช่น `'s03'` กับ `'S03'` หรือมีช่องว่าง (แก้ด้วย `UPPER(TRIM(...))` บทที่ 18)
- ลืมเงื่อนไข `ON` บางส่วนจนกลายเป็นจับคู่ทุกแถว

## ฝึกทำ

**โจทย์:** แสดงทุกสาขา พร้อมจำนวนรายการขายและยอดขายสุทธิรวม สาขาที่ไม่มียอดให้แสดงเป็น 0

:::answer ดูเฉลยและคำอธิบาย
```sql {verify}
SELECT
  st.store_id,
  st.store_name,
  COUNT(s.sale_id)               AS line_count,
  COALESCE(SUM(s.net_amount), 0) AS total_net
FROM stores AS st
LEFT JOIN sales AS s
  ON st.store_id = s.store_id
GROUP BY st.store_id, st.store_name
ORDER BY st.store_id;
```

| store_id | store_name | line_count | total_net |
|---|---|---|---|
| S01 | สาขาสุขุมวิท | 47 | 4348.00 |
| S02 | สาขาบางนา | 37 | 3230.00 |
| S03 | สาขาเชียงใหม่ | 23 | 1624.00 |
| S04 | สาขาขอนแก่น | 27 | 2618.00 |
| S05 | สาขาภูเก็ต | 7 | 663.00 |
| S06 | สาขาหาดใหญ่ | 0 | 0.00 |

**เหตุผล:** เริ่มจาก `stores` เพื่อให้ทุกสาขาอยู่ในผลลัพธ์ `COUNT(s.sale_id)` ให้ 0 กับ S06 และ `COALESCE(SUM(...), 0)` เปลี่ยนผลรวมที่เป็น `NULL` (เพราะไม่มีแถวให้รวม) เป็น 0
:::

ฝึกเพิ่มที่ [แบบฝึกหัด: JOIN และ UNION](#/exercises/ex-join)
