## Subquery คืออะไร

**Subquery (Query ย่อย)** คือ Query ที่ซ้อนอยู่ใน Query อื่น ใช้ผลของ Query ย่อยเป็นข้อมูลให้ Query หลัก ใช้ได้หลายตำแหน่ง

| ตำแหน่ง | ผลของ Subquery | ตัวอย่างการใช้ |
|---|---|---|
| ใน `WHERE` แบบค่าเดียว (**Scalar Subquery**) | 1 ค่า | เทียบกับค่าเฉลี่ยของทั้งตาราง |
| ใน `WHERE ... IN (SELECT ...)` / `EXISTS` | หลายแถว 1 คอลัมน์ | เลือกรายการที่อยู่ในอีกรายการ |
| ใน `FROM (SELECT ...) AS t` | ตารางชั่วคราว | สรุปสองชั้น |
| ใน `SELECT` แบบค่าเดียว | 1 ค่า | ใส่ยอดรวมทั้งบริษัทไว้ทุกแถว |

## Scalar Subquery: เทียบกับค่าเฉลี่ย

**สถานการณ์:** หาสินค้าที่ราคาป้ายสูงกว่าราคาเฉลี่ยของสินค้าทั้งหมด

```sql {verify}
SELECT
  product_name,
  list_price
FROM products
WHERE list_price > (SELECT AVG(list_price) FROM products)
ORDER BY list_price DESC;
```

| product_name | list_price |
|---|---|
| แชมพู 400ml | 129.00 |
| กระดาษทิชชู 6 ม้วน | 99.00 |
| สบู่เหลว 450ml | 89.00 |
| ยาสีฟัน 160g | 59.00 |
| ถุงขยะ 30 ใบ | 49.00 |

**ลำดับการทำงาน**

:::flow
Subquery | `SELECT AVG(list_price) FROM products` คำนวณค่าเฉลี่ยราคา 12 สินค้า ได้ 48.25 (579 ÷ 12)
Query หลัก | เทียบสินค้าแต่ละตัวกับ 48.25 เก็บเฉพาะที่มากกว่า
ORDER BY | เรียงจากราคาสูงไปต่ำ
:::

ต้องใช้ Subquery เพราะเขียน `WHERE list_price > AVG(list_price)` ตรง ๆ ไม่ได้ (ฟังก์ชันสรุปใช้ใน WHERE ไม่ได้ ดูบทที่ 13)

## Subquery ใน FROM: สรุปสองชั้น

**สถานการณ์:** หายอดขายเฉลี่ย**ต่อวัน**ของแต่ละสาขา (เฉพาะวันที่มีการขาย) ต้องทำ 2 ขั้น: (1) รวมยอดต่อสาขาต่อวัน (2) เฉลี่ยยอดรายวันของแต่ละสาขา

```sql {verify}
SELECT
  store_id,
  ROUND(AVG(store_day_net), 2) AS avg_daily_net
FROM (
  SELECT
    store_id,
    sale_date,
    SUM(net_amount) AS store_day_net
  FROM sales
  GROUP BY store_id, sale_date
) AS daily
GROUP BY store_id
ORDER BY avg_daily_net DESC;
```

| store_id | avg_daily_net |
|---|---|
| S01 | 114.42 |
| S04 | 113.83 |
| S02 | 104.19 |
| S05 | 94.71 |
| S03 | 81.20 |

- Subquery `daily` สรุปเป็น 1 แถวต่อสาขาต่อวันก่อน
- Query หลักเฉลี่ยยอดรายวันเหล่านั้นอีกชั้น
- Subquery ใน `FROM` **ควรตั้งชื่อเสมอ** (`AS daily`)

> [!DATABRICKS] Subquery ที่ไม่ตั้งชื่อ
> Databricks ยอมให้ Subquery ใน `FROM` ไม่มีชื่อได้ แต่ SQL ระบบอื่นหลายตัว (เช่น SQL Server) จะ Error และเมื่อซ้อนหลายชั้นจะอ่านยาก ควรตั้งชื่อทุกครั้ง หรือเปลี่ยนเป็น CTE

## CTE: แบ่ง Query เป็นขั้นตอนที่ตั้งชื่อได้

**CTE (Common Table Expression)** คือการตั้งชื่อให้ผลลัพธ์ชั่วคราวทีละขั้นด้วย `WITH` เหมือนการทำ Sheet ช่วยคำนวณใน Excel ก่อนทำสรุปหน้าสุดท้าย

**รูปแบบ (Syntax)**

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

- เริ่มด้วย `WITH` **ครั้งเดียว** CTE ตัวต่อไปคั่นด้วยจุลภาค (ไม่ต้องเขียน `WITH` ซ้ำ)
- CTE ตัวหลังอ้างถึงตัวก่อนหน้าได้
- ต้องจบด้วย `SELECT` หลักเสมอ ทั้งหมดเป็น**คำสั่งเดียวกัน** (มี `;` ครั้งเดียวท้ายสุด)
- CTE มีอยู่เฉพาะใน Query นั้น ไม่ได้สร้างตารางจริง เปิด Query ใหม่จะเรียกใช้ไม่ได้

## ตัวอย่าง CTE หลายขั้น: สัดส่วนยอดขายของแต่ละสาขา

**สถานการณ์:** หัวหน้าขอรายงานสัดส่วนยอดขายของแต่ละสาขาเทียบกับยอดรวมบริษัท โดย**ตัดรายการซ้ำและรายการผิดปกติออกก่อน**

```sql {verify}
WITH clean_sales AS (
  -- ขั้น 1: ตัดแถวซ้ำทั้งแถว และเก็บเฉพาะรายการปกติ (1-50 ชิ้น)
  SELECT DISTINCT *
  FROM sales
  WHERE quantity BETWEEN 1 AND 50
),
store_total AS (
  -- ขั้น 2: ยอดรวมของแต่ละสาขา
  SELECT
    store_id,
    SUM(net_amount) AS store_net
  FROM clean_sales
  GROUP BY store_id
),
company_total AS (
  -- ขั้น 3: ยอดรวมทั้งบริษัท (1 แถว)
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

**ข้อมูลเปลี่ยนอย่างไรในแต่ละขั้น**

| ขั้น | ชื่อ | ได้อะไร | จำนวนแถว |
|---|---|---|---|
| 1 | `clean_sales` | รายการขายที่ตัดแถวซ้ำ (T0042) และรายการผิดปกติ (T0061, T0096) แล้ว | 138 |
| 2 | `store_total` | ยอดรวมต่อสาขา | 5 |
| 3 | `company_total` | ยอดรวมทั้งบริษัท 12,078 บาท | 1 |
| สุดท้าย | `SELECT` หลัก | นำยอดบริษัท 1 แถวไปต่อกับทุกสาขาด้วย `CROSS JOIN` แล้วคำนวณ % | 5 |

> [!NOTE] ทำไม S01 ได้ 4,363 ไม่ใช่ 4,348
> ยอดดิบของ S01 คือ 4,348 เมื่อตัดแถวซ้ำ T0042 (15 บาท) ออก ยอดลดเป็น 4,333 และเมื่อตัดรายการรับคืน T0061 (−30 บาท) ออก ยอดเพิ่มเป็น 4,363 นี่คือเหตุผลที่ต้องระบุเสมอว่ารายงานใช้ข้อมูลที่ทำความสะอาดแล้วหรือไม่

## Subquery ซ้อนชั้น เทียบกับ CTE

Query สองแบบนี้ได้ผลเหมือนกันทุกตัวเลข (สาขาที่ยอดหลังทำความสะอาดเกิน 2,000 บาท)

**แบบ Subquery ซ้อนชั้น** ต้องอ่านจากในสุดออกมา

```sql {verify}
SELECT store_id, store_net
FROM (
  SELECT store_id, SUM(net_amount) AS store_net
  FROM (SELECT DISTINCT * FROM sales WHERE quantity BETWEEN 1 AND 50) AS c
  GROUP BY store_id
) AS t
WHERE store_net > 2000
ORDER BY store_net DESC;
```

| store_id | store_net |
|---|---|
| S01 | 4363.00 |
| S02 | 2810.00 |
| S04 | 2618.00 |

**แบบ CTE** อ่านจากบนลงล่างตามลำดับความคิด และรันตรวจทีละขั้นได้

```sql {verify}
WITH clean_sales AS (
  SELECT DISTINCT *
  FROM sales
  WHERE quantity BETWEEN 1 AND 50
),
store_total AS (
  SELECT store_id, SUM(net_amount) AS store_net
  FROM clean_sales
  GROUP BY store_id
)
SELECT store_id, store_net
FROM store_total
WHERE store_net > 2000
ORDER BY store_net DESC;
```

| store_id | store_net |
|---|---|
| S01 | 4363.00 |
| S02 | 2810.00 |
| S04 | 2618.00 |

สังเกตว่าเมื่อสรุปใน CTE แล้ว `store_net` กลายเป็นคอลัมน์ธรรมดา จึงกรองด้วย `WHERE` ได้ในชั้นถัดไป (แทน `HAVING`)

## ไล่ตรวจ CTE ทีละขั้น

เมื่อผลลัพธ์ผิด อย่ารันทั้งก้อนแล้วเดา ให้เปลี่ยน `SELECT` สุดท้ายเป็นการดูผลของแต่ละขั้น

```sql {verify}
WITH clean_sales AS (
  SELECT DISTINCT *
  FROM sales
  WHERE quantity BETWEEN 1 AND 50
)
SELECT COUNT(*) AS row_count, SUM(net_amount) AS total_net
FROM clean_sales;
```

| row_count | total_net |
|---|---|
| 138 | 12078.00 |

ถ้าจำนวนแถวและยอดของขั้นนี้สมเหตุสมผล ค่อยไปตรวจขั้นถัดไป เช่น `SELECT * FROM store_total LIMIT 20`

## EXISTS และ NOT EXISTS

`EXISTS (SELECT ...)` เป็นจริงเมื่อ Subquery **มีอย่างน้อย 1 แถว** ไม่สนใจว่า SELECT อะไร (จึงนิยมเขียน `SELECT 1`)

**สถานการณ์:** สาขาใดยังไม่มียอดขายเลย

```sql {verify}
SELECT
  st.store_id,
  st.store_name,
  st.open_date
FROM stores AS st
WHERE NOT EXISTS (
  SELECT 1
  FROM sales AS s
  WHERE s.store_id = st.store_id
);
```

| store_id | store_name | open_date |
|---|---|---|
| S06 | สาขาหาดใหญ่ | 2026-06-01 |

Subquery นี้เรียกว่า **Correlated Subquery** เพราะอ้างถึงคอลัมน์ของ Query หลัก (`st.store_id`) ระบบตรวจทีละสาขาว่ามีรายการขายหรือไม่

> [!TIP] NOT EXISTS ปลอดภัยกว่า NOT IN
> ถ้า Subquery อาจมีค่า `NULL` การใช้ `NOT IN (SELECT ...)` จะได้ผลว่างเปล่าทั้งหมด `NOT EXISTS` ไม่มีปัญหานี้

## ข้อผิดพลาดที่พบบ่อย

> [!MISTAKE] ใส่ ; ปิดหลัง CTE

```sql {error}
WITH store_total AS (
  SELECT store_id, SUM(net_amount) AS store_net
  FROM sales
  GROUP BY store_id
);
SELECT * FROM store_total;
```

`;` จบคำสั่งก่อนถึง `SELECT` หลัก `WITH` ที่ไม่มี SELECT ต่อท้ายจึงไม่สมบูรณ์ (Error `PARSE_SYNTAX_ERROR`) และ SELECT ถัดไปก็ไม่รู้จัก `store_total` วิธีแก้คือลบ `;` ตัวแรกออก ให้มี `;` ครั้งเดียวท้ายสุด

- ลืมจุลภาคระหว่าง CTE หรือเขียน `WITH` ซ้ำหน้า CTE ตัวที่สอง
- ตั้งชื่อ CTE ไม่สื่อความหมาย (`t1`, `t2`, `temp`) ทำให้คนอื่นแก้ต่อยาก
- ใส่ `ORDER BY` ไว้ใน CTE แล้วคาดหวังว่าผลสุดท้ายจะเรียงตาม ให้ใส่ `ORDER BY` ที่ `SELECT` สุดท้าย
- Scalar Subquery คืนมากกว่า 1 แถว จะ Error (เช่น ลืม `GROUP BY` หรือเงื่อนไข)
- คัดลอกเงื่อนไขทำความสะอาดซ้ำหลายจุด แทนที่จะทำใน CTE เดียว

## ฝึกทำ

**โจทย์:** หาสินค้าที่ยอดขายสุทธิรวมสูงกว่า "ค่าเฉลี่ยของยอดขายรวมต่อสินค้า" ใช้ CTE สรุปยอดต่อสินค้าก่อน

:::answer ดูเฉลยและคำอธิบาย
```sql {verify}
WITH product_total AS (
  SELECT
    product_id,
    SUM(net_amount) AS total_net
  FROM sales
  GROUP BY product_id
)
SELECT
  product_id,
  total_net
FROM product_total
WHERE total_net > (SELECT AVG(total_net) FROM product_total)
ORDER BY total_net DESC;
```

| product_id | total_net |
|---|---|
| P007 | 3599.00 |
| P009 | 1622.00 |
| P003 | 1310.00 |

**เหตุผล:** ต้องสรุปยอดต่อสินค้าก่อน (11 สินค้า รวม P099) แล้วจึงหาค่าเฉลี่ยของยอดเหล่านั้น (1,134.82 บาท) การใช้ CTE ทำให้อ้างถึง `product_total` ได้ทั้งใน FROM และใน Scalar Subquery โดยไม่ต้องเขียน Logic ซ้ำ
:::

ฝึกเพิ่มที่ [แบบฝึกหัด: Subquery และ CTE](#/exercises/ex-cte)
