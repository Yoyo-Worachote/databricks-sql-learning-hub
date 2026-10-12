## ทำไมต้องตรวจคุณภาพข้อมูลก่อนรายงาน

Query ที่รันผ่านไม่ได้แปลว่าตัวเลขถูก ข้อมูลจริงมักมีรายการซ้ำ ค่าว่าง ค่าผิดปกติ และรหัสที่หาคู่ไม่เจอ ถ้าไม่ตรวจก่อน รายงานที่ส่งผู้บริหารอาจผิดโดยไม่มีใครรู้

**สถานการณ์:** ก่อนส่งรายงานยอดขายไตรมาส 1 ให้ผู้บริหาร ต้องยืนยันว่าไม่มีรายการซ้ำ ไม่มีรายการที่หาสินค้าไม่เจอ และรู้ว่ามีรายการผิดปกติอะไรบ้าง พร้อมผลกระทบต่อยอดรวม

**เช็กลิสต์ 5 ข้อที่ควรทำทุกครั้ง**

| ข้อ | ตรวจอะไร | สูตรหลัก |
|---|---|---|
| 1 | จำนวนแถวและยอดรวม | `COUNT(*)`, `SUM(...)` |
| 2 | Key ที่ควรไม่ซ้ำ ซ้ำหรือไม่ | `GROUP BY key HAVING COUNT(*) > 1` |
| 3 | ค่าว่างในคอลัมน์สำคัญ | `COUNT(*) - COUNT(col)` |
| 4 | ค่าที่เป็นไปไม่ได้หรือผิดปกติ | `CASE WHEN ... THEN 'flag'` |
| 5 | รหัสที่หาคู่ในตารางหลักไม่เจอ | `LEFT JOIN ... WHERE right.key IS NULL` |

แล้วจบด้วย **Reconciliation (กระทบยอด)** แสดงว่าตัวเลขเปลี่ยนไปเท่าไรเพราะอะไร

## ตรวจ Key ซ้ำ

`sale_id` ควรไม่ซ้ำ (1 รหัส = 1 รายการ)

```sql {verify}
SELECT
  sale_id,
  COUNT(*) AS cnt
FROM sales
GROUP BY sale_id
HAVING COUNT(*) > 1;
```

| sale_id | cnt |
|---|---|
| T0042 | 2 |

พบ T0042 ซ้ำ 2 แถว ขั้นต่อไปคือดึงแถวเต็มมาดูว่า**ซ้ำทั้งแถว** (เช่น โหลดข้อมูลซ้ำ) หรือ**Key ซ้ำแต่ค่าต่างกัน** (ปัญหาที่ต้นทาง ต้องถามเจ้าของข้อมูล)

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

ทั้ง 2 แถวเหมือนกันทุกคอลัมน์ = โหลดซ้ำ ตัดออกได้ 1 แถว (ยอด 15 บาท)

## นับค่า NULL ในคอลัมน์สำคัญ

```sql {verify}
SELECT
  COUNT(*)                                             AS total_rows,
  COUNT(*) - COUNT(customer_id)                        AS customer_id_nulls,
  COUNT(*) - COUNT(discount_amount)                    AS discount_nulls,
  SUM(CASE WHEN product_id IS NULL THEN 1 ELSE 0 END) AS product_id_nulls,
  count_if(store_id IS NULL)                           AS store_id_nulls
FROM sales;
```

| total_rows | customer_id_nulls | discount_nulls | product_id_nulls | store_id_nulls |
|---|---|---|---|---|
| 141 | 29 | 20 | 0 | 0 |

| วิธีนับ NULL | หมายเหตุ |
|---|---|
| `COUNT(*) - COUNT(col)` | สั้น ใช้ได้ทุกระบบ |
| `SUM(CASE WHEN col IS NULL THEN 1 ELSE 0 END)` | ยืดหยุ่น ใส่เงื่อนไขอื่นได้ |
| `count_if(col IS NULL)` | ฟังก์ชันของ Databricks อ่านง่ายที่สุด |

**แปลผล:** `customer_id` ที่เป็น NULL มีความหมายทางธุรกิจ (ลูกค้าทั่วไป) จึงไม่ใช่ปัญหา ส่วน `discount_amount` ที่เป็น NULL ต้องถามว่าแปลว่า "ไม่มีส่วนลด" หรือ "ไม่ได้บันทึก"

> [!TIP] ตรวจข้อความว่างด้วย
> ข้อมูลจากไฟล์มักมี `''` หรือ `'   '` แทน NULL ซึ่ง `IS NULL` จับไม่ได้ ใช้ `NULLIF(TRIM(col), '') IS NULL` เพื่อนับทั้ง NULL และข้อความว่างรวมกัน

## ติดธงค่าผิดปกติและตรวจสูตร

**ค่าผิดปกติ (Outlier)** ไม่จำเป็นต้องผิดเสมอ เช่น จำนวนติดลบอาจเป็นการรับคืนจริง แต่ต้อง**ติดธง (Flag)** และตกลงกับเจ้าของข้อมูลว่าจะรวมในรายงานหรือไม่ อย่าลบหรือแก้เองเงียบ ๆ

```sql {verify}
SELECT
  sale_id,
  product_id,
  quantity,
  unit_price,
  discount_amount,
  net_amount,
  CASE
    WHEN quantity <= 0 THEN 'Return / zero qty'
    WHEN quantity > 50 THEN 'Unusually large qty'
    WHEN net_amount < 0 THEN 'Negative net (discount > gross)'
    WHEN net_amount <> quantity * unit_price - COALESCE(discount_amount, 0) THEN 'Amount mismatch'
    ELSE 'OK'
  END AS dq_flag
FROM sales
WHERE quantity <= 0
   OR quantity > 50
   OR net_amount < 0
   OR net_amount <> quantity * unit_price - COALESCE(discount_amount, 0)
ORDER BY sale_id;
```

| sale_id | product_id | quantity | unit_price | discount_amount | net_amount | dq_flag |
|---|---|---|---|---|---|---|
| T0044 | P001 | 2 | 7.00 | 15.00 | -1.00 | Negative net (discount > gross) |
| T0060 | P001 | 1 | 7.00 | 15.00 | -8.00 | Negative net (discount > gross) |
| T0061 | P005 | -2 | 15.00 | 0.00 | -30.00 | Return / zero qty |
| T0096 | P001 | 60 | 7.00 | 0.00 | 420.00 | Unusually large qty |

| ธง | ความหมาย | ควรทำอย่างไร |
|---|---|---|
| Return / zero qty | รับคืนสินค้า | ตกลงว่ารายงานยอดขายรวมหรือแยกรายการรับคืน |
| Unusually large qty | ซื้อ 60 ชิ้นในรายการเดียว | ตรวจกับสาขาว่าเป็นการขายส่งจริงหรือพิมพ์ผิด |
| Negative net | ส่วนลด 15 บาทมากกว่ายอดสินค้า 14 และ 7 บาท | ตรวจว่าใส่ส่วนลดท้ายบิลผิดรายการหรือไม่ |
| Amount mismatch | ยอดสุทธิไม่ตรงสูตร | ไม่พบในข้อมูลชุดนี้ แต่ควรตรวจทุกครั้ง |

> [!NOTE] สิ่งที่เพิ่มจากเอกสารเดิม
> การตรวจในเอกสารเดิมพบ 2 รายการ (T0061, T0096) เว็บไซต์นี้เพิ่มเงื่อนไข `net_amount < 0` จึงพบอีก 2 รายการ (T0044, T0060) ที่สูตรคำนวณถูกต้องแต่ผลทางธุรกิจผิดปกติ ตัวอย่างนี้แสดงว่าการตรวจ "สูตรถูก" อย่างเดียวไม่พอ ต้องตรวจ "ค่าสมเหตุสมผล" ด้วย

## ตรวจรหัสที่หาคู่ไม่เจอ (Orphan Key)

```sql {verify}
SELECT
  s.product_id,
  COUNT(*)          AS line_count,
  SUM(s.net_amount) AS total_net
FROM sales AS s
LEFT JOIN products AS p
  ON s.product_id = p.product_id
WHERE p.product_id IS NULL
GROUP BY s.product_id;
```

| product_id | line_count | total_net |
|---|---|---|
| P099 | 1 | 270.00 |

รายการขาย P099 ไม่มีข้อมูลสินค้า จึงไม่รู้หมวดและต้นทุน ถ้ารายงานใช้ INNER JOIN ยอด 270 บาทจะหายไป ต้องแจ้งในรายงานและส่งให้ทีมข้อมูลสินค้าเพิ่มรหัส

## ตัดแถวซ้ำอย่างถูกวิธี

| วิธี | ทำอะไร | ใช้เมื่อ |
|---|---|---|
| `SELECT DISTINCT *` | ตัดแถวที่เหมือนกันทุกคอลัมน์ | แถวซ้ำทั้งแถว (โหลดซ้ำ) เช่น T0042 |
| `ROW_NUMBER() OVER (PARTITION BY key ORDER BY ...) = 1` | เก็บ 1 แถวต่อ Key ตามลำดับที่กำหนด | Key ซ้ำแต่บางคอลัมน์ต่างกัน หรือต้องการ "รายการล่าสุด" ของแต่ละ Key |

**ตัวอย่าง ROW_NUMBER:** รายการซื้อล่าสุดของลูกค้าแต่ละคน (แสดง 3 คนแรก)

```sql {verify}
WITH numbered AS (
  SELECT
    customer_id,
    sale_id,
    sale_datetime,
    store_id,
    net_amount,
    ROW_NUMBER() OVER (
      PARTITION BY customer_id
      ORDER BY sale_datetime DESC, sale_id DESC
    ) AS rn
  FROM sales
  WHERE customer_id IS NOT NULL
)
SELECT
  customer_id,
  sale_id,
  sale_datetime,
  store_id,
  net_amount
FROM numbered
WHERE rn = 1
  AND customer_id IN ('C001', 'C002', 'C003')
ORDER BY customer_id;
```

| customer_id | sale_id | sale_datetime | store_id | net_amount |
|---|---|---|---|---|
| C001 | T0134 | 2026-03-28 13:52:55 | S01 | 9.00 |
| C002 | T0081 | 2026-02-19 16:59:40 | S02 | 60.00 |
| C003 | T0122 | 2026-03-20 13:34:58 | S05 | 118.00 |

`ORDER BY sale_datetime DESC` ทำให้รายการล่าสุดได้ `rn = 1` และ `sale_id DESC` เป็นตัวตัดสินกรณีเวลาเท่ากัน

> [!MISTAKE] ใช้ DISTINCT ปิดปัญหาเพียงบางส่วน

```sql {verify}
SELECT
  COUNT(DISTINCT sale_id) AS bills,
  SUM(net_amount)         AS total_net
FROM sales;
```

| bills | total_net |
|---|---|
| 140 | 12483.00 |

จำนวนรายการถูกตัดซ้ำแล้ว (140) แต่ยอดรวมยังนับแถวซ้ำอยู่ (12,483) ตัวเลขสองตัวในรายงานเดียวกันจึงไม่สอดคล้องกัน วิธีแก้คือตัดซ้ำที่ระดับข้อมูลก่อน แล้วค่อยสรุปทุกตัวเลขจากข้อมูลชุดเดียวกัน

```sql {verify}
WITH dedup AS (
  SELECT DISTINCT *
  FROM sales
)
SELECT
  COUNT(sale_id)  AS bills,
  SUM(net_amount) AS total_net
FROM dedup;
```

| bills | total_net |
|---|---|
| 140 | 12468.00 |

## Reconciliation: กระทบยอดก่อนและหลังทำความสะอาด

แสดงทุกขั้นในตารางเดียว เป็นหลักฐานแนบรายงานว่ายอดเปลี่ยนเพราะอะไรและเท่าไร

```sql {verify}
WITH raw AS (
  SELECT COUNT(*) AS rows_cnt, SUM(net_amount) AS net
  FROM sales
),
dedup AS (
  SELECT DISTINCT *
  FROM sales
),
clean AS (
  SELECT COUNT(*) AS rows_cnt, SUM(net_amount) AS net
  FROM dedup
  WHERE quantity BETWEEN 1 AND 50
)
SELECT 'raw' AS stage, rows_cnt, net FROM raw
UNION ALL
SELECT 'dedup', COUNT(*), SUM(net_amount) FROM dedup
UNION ALL
SELECT 'clean (qty 1-50)', rows_cnt, net FROM clean;
```

| stage | rows_cnt | net |
|---|---|---|
| raw | 141 | 12483.00 |
| dedup | 140 | 12468.00 |
| clean (qty 1-50) | 138 | 12078.00 |

| ขั้น | เปลี่ยนแปลง | เพราะ |
|---|---|---|
| raw → dedup | −1 แถว, −15 บาท | ตัดแถวซ้ำ T0042 |
| dedup → clean | −2 แถว, −390 บาท | ตัดรายการรับคืน T0061 (−30) และรายการ 60 ชิ้น T0096 (+420) |

> [!NOTE] นิยาม clean sales ของหลักสูตร
> หลักสูตรนี้ (รวม Final Project) นิยาม "clean sales" ว่า **ตัดแถวซ้ำ และเก็บเฉพาะ quantity 1–50** ตามเอกสารเดิม รายการ T0044 และ T0060 (ยอดติดลบเพราะส่วนลด) ยังอยู่ในข้อมูล clean เพราะเป็นการขายจริง แต่ควรระบุเป็นข้อสังเกตในรายงาน ในงานจริงนิยามนี้ต้องตกลงกับเจ้าของข้อมูลและผู้ใช้รายงาน

## ข้อผิดพลาดที่พบบ่อย

- ไม่ตรวจจำนวนแถวก่อน/หลัง JOIN หรือกรอง
- ใช้ `DISTINCT` แก้ทุกปัญหา ทั้งที่แถวซ้ำอาจต่างกันบางคอลัมน์
- ลบหรือแก้ค่าผิดปกติเองโดยไม่แจ้งเจ้าของข้อมูล
- `COALESCE` เป็น 0 ทุกครั้งโดยไม่คิดความหมายของ NULL
- ตรวจเฉพาะ NULL แต่ลืมข้อความว่าง `''` หรือช่องว่าง `' '`
- ตรวจข้อมูลครั้งเดียวแล้วคิดว่าข้อมูลรอบหน้าจะสะอาดเหมือนเดิม ควรบันทึก Query ตรวจไว้รันซ้ำ

## ฝึกทำ

**โจทย์:** ทำตารางกระทบยอด**รายสาขา** เทียบจำนวนแถวและยอดสุทธิของข้อมูลดิบกับ clean sales (ตัดซ้ำ + quantity 1–50) พร้อมผลต่างของยอด

:::answer ดูเฉลยและคำอธิบาย
```sql {verify}
WITH clean_sales AS (
  SELECT DISTINCT *
  FROM sales
  WHERE quantity BETWEEN 1 AND 50
),
raw_by_store AS (
  SELECT store_id, COUNT(*) AS raw_rows, SUM(net_amount) AS raw_net
  FROM sales
  GROUP BY store_id
),
clean_by_store AS (
  SELECT store_id, COUNT(*) AS clean_rows, SUM(net_amount) AS clean_net
  FROM clean_sales
  GROUP BY store_id
)
SELECT
  r.store_id,
  r.raw_rows,
  r.raw_net,
  c.clean_rows,
  c.clean_net,
  r.raw_net - c.clean_net AS diff_net
FROM raw_by_store AS r
LEFT JOIN clean_by_store AS c
  ON r.store_id = c.store_id
ORDER BY r.store_id;
```

| store_id | raw_rows | raw_net | clean_rows | clean_net | diff_net |
|---|---|---|---|---|---|
| S01 | 47 | 4348.00 | 45 | 4363.00 | -15.00 |
| S02 | 37 | 3230.00 | 36 | 2810.00 | 420.00 |
| S03 | 23 | 1624.00 | 23 | 1624.00 | 0.00 |
| S04 | 27 | 2618.00 | 27 | 2618.00 | 0.00 |
| S05 | 7 | 663.00 | 7 | 663.00 | 0.00 |

**เหตุผล:** แยกสรุปข้อมูลดิบและข้อมูลสะอาดใน CTE ของตัวเอง แล้ว JOIN ด้วย `store_id` (สรุปก่อน JOIN จึงไม่เกิด Fan-out) อธิบายผลต่างได้ครบ: S01 ตัดแถวซ้ำ T0042 (−15) และรายการรับคืน T0061 (ยอด −30 ถูกตัดออก ยอดจึงเพิ่ม 30) สุทธิ +15 ส่วน S02 ตัดรายการ 60 ชิ้น T0096 (−420)
:::

ฝึกเพิ่มที่ [แบบฝึกหัด: ตรวจสอบคุณภาพข้อมูล](#/exercises/ex-quality)
