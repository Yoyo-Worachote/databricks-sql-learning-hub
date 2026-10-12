## เกี่ยวกับชุดนี้

แบบฝึกหัดชุดนี้เพิ่มขึ้นใหม่สำหรับหัวข้อที่เอกสารเดิมยังไม่มีแบบฝึกหัดโดยตรง บางข้อใช้ตารางเสริม (`store_product`, `monthly_sales`, `customers`) จากไฟล์ `practice_extra_tables.sql` ดูวิธีสร้างที่ [หน้าชุดข้อมูลฝึก](#/reference/dataset)

## ข้อ E1 (ปานกลาง): UNION ALL หลายช่วงเวลา

**หัวข้อ:** บทที่ 11 · **โจทย์:** หาจำนวนรายการและยอดสุทธิของแต่ละวิธีชำระเงิน รวมทั้ง 6 เดือน (ต.ค. 2025 – มี.ค. 2026) จากตาราง `sales_archive_2025` และ `sales`

:::answer
```sql {verify}
SELECT
  payment_method,
  COUNT(*)        AS line_count,
  SUM(net_amount) AS total_net
FROM (
  SELECT payment_method, net_amount FROM sales_archive_2025
  UNION ALL
  SELECT payment_method, net_amount FROM sales
) AS all_sales
GROUP BY payment_method
ORDER BY total_net DESC;
```

| payment_method | line_count | total_net |
|---|---|---|
| Cash | 69 | 5587.00 |
| QR Payment | 63 | 5387.00 |
| Credit Card | 59 | 5140.00 |

**เหตุผล:** ต่อแถวสองตารางด้วย `UNION ALL` ก่อน (191 แถว) แล้วจึงสรุป ตรวจได้ว่า 69 + 63 + 59 = 191 ถ้าใช้ `UNION` แทน แถวที่บังเอิญมีวิธีชำระและยอดเท่ากันจะถูกตัดทิ้งจนยอดผิด
:::

## ข้อ E2 (ปานกลาง): Alias ใน WHERE

**หัวข้อ:** บทที่ 13 · **โจทย์:** Query นี้ Error เพราะอะไร แก้ให้แสดงรายการที่ยอดก่อนหักส่วนลด (`quantity * unit_price`) เกิน 300 บาท

```sql {error skip}
SELECT sale_id, store_id, quantity * unit_price AS gross_amount
FROM sales
WHERE gross_amount > 300;
```

:::answer
**สาเหตุ:** `gross_amount` ถูกสร้างในขั้น `SELECT` ซึ่งตามลำดับเชิงตรรกะทำงาน**หลัง** `WHERE` ตอนที่ `WHERE` ทำงานจึงยังไม่รู้จักชื่อนี้ (Error `UNRESOLVED_COLUMN`)

```sql {verify}
WITH sales_gross AS (
  SELECT
    sale_id,
    store_id,
    quantity * unit_price AS gross_amount
  FROM sales
)
SELECT
  sale_id,
  store_id,
  gross_amount
FROM sales_gross
WHERE gross_amount > 300
ORDER BY gross_amount DESC, sale_id;
```

| sale_id | store_id | gross_amount |
|---|---|---|
| T0022 | S01 | 516.00 |
| T0052 | S01 | 445.00 |
| T0058 | S01 | 445.00 |
| T0096 | S02 | 420.00 |
| T0012 | S04 | 356.00 |
| T0077 | S03 | 356.00 |
| T0136 | S01 | 356.00 |

**เหตุผล:** คำนวณใน CTE ก่อน แล้ว `gross_amount` จะเป็นคอลัมน์ธรรมดาในชั้นนอก อีกวิธีคือเขียนสูตรซ้ำ `WHERE quantity * unit_price > 300` สังเกตว่า T0058 มียอดก่อนหักส่วนลด 445 แต่ยอดสุทธิ 435 (มีส่วนลด 10 บาท)
:::

## ข้อ E3 (ง่าย): ทายผลจากลำดับการทำงาน

**หัวข้อ:** บทที่ 13 · **โจทย์:** Query นี้ได้กี่แถว และแถวแรกคือสาขาอะไร (ตอบก่อนรัน)

```sql {verify}
SELECT store_id, SUM(net_amount) AS total_net
FROM sales
WHERE payment_method = 'Cash'
GROUP BY store_id
HAVING SUM(net_amount) > 500
ORDER BY total_net DESC
LIMIT 3;
```

| store_id | total_net |
|---|---|
| S01 | 1299.00 |
| S02 | 1007.00 |
| S03 | 917.00 |

:::answer
**คำตอบ:** 3 แถว แถวแรกคือ S01

**ไล่ตามลำดับ:** `FROM` 141 แถว → `WHERE` เหลือรายการเงินสด 51 แถว → `GROUP BY` 5 สาขา (S01 1,299 / S02 1,007 / S03 917 / S04 687 / S05 395) → `HAVING > 500` เหลือ 4 สาขา (ตัด S05) → `ORDER BY` เรียงมากไปน้อย → `LIMIT 3` เหลือ S01, S02, S03
:::

## ข้อ E4 (ปานกลาง): DENSE_RANK กับยอดเท่ากัน

**หัวข้อ:** บทที่ 15–16 · **โจทย์:** จากตาราง `store_product` หาสินค้าที่อยู่ใน "2 ระดับยอดขายแรก" ของแต่ละสาขา (ยอดเท่ากันได้ระดับเดียวกัน)

:::answer
```sql {verify}
WITH ranked AS (
  SELECT
    store_id,
    product_id,
    total_net,
    DENSE_RANK() OVER (PARTITION BY store_id ORDER BY total_net DESC) AS dense_rnk
  FROM store_product
)
SELECT
  store_id,
  dense_rnk,
  product_id,
  total_net
FROM ranked
WHERE dense_rnk <= 2
ORDER BY store_id, dense_rnk, product_id;
```

| store_id | dense_rnk | product_id | total_net |
|---|---|---|---|
| S01 | 1 | P001 | 1200.00 |
| S01 | 2 | P002 | 950.00 |
| S01 | 2 | P003 | 950.00 |
| S02 | 1 | P001 | 800.00 |
| S02 | 2 | P003 | 700.00 |
| S03 | 1 | P002 | 400.00 |
| S03 | 2 | P004 | 350.00 |

**เหตุผล:** "ระดับยอดขาย" คือ `DENSE_RANK` S01 จึงได้ 3 สินค้า เพราะ P002 กับ P003 ยอดเท่ากันอยู่ระดับ 2 ด้วยกัน ถ้าใช้ `ROW_NUMBER` จะได้สาขาละ 2 แถวพอดีและ P003 จะหลุด
:::

## ข้อ E5 (ปานกลาง): ยอดสะสมตั้งแต่ต้นปี (YTD)

**หัวข้อ:** บทที่ 14 · **โจทย์:** จากตาราง `monthly_sales` แสดงยอดขายรายเดือนของปี 2025 พร้อมยอดสะสมตั้งแต่ต้นปี (Year-to-Date) โดยยอดสะสมต้องเริ่มนับใหม่ทุกปี

:::answer
```sql {verify}
WITH ytd AS (
  SELECT
    month_start,
    net_sales,
    SUM(net_sales) OVER (
      PARTITION BY YEAR(month_start)
      ORDER BY month_start
    ) AS ytd_sales
  FROM monthly_sales
)
SELECT
  month_start,
  net_sales,
  ytd_sales
FROM ytd
WHERE month_start >= DATE'2025-01-01'
ORDER BY month_start;
```

| month_start | net_sales | ytd_sales |
|---|---|---|
| 2025-01-01 | 132000.00 | 132000.00 |
| 2025-02-01 | 118000.00 | 250000.00 |
| 2025-03-01 | 120000.00 | 370000.00 |
| 2025-04-01 | 125000.00 | 495000.00 |
| 2025-05-01 | 133000.00 | 628000.00 |
| 2025-06-01 | 127000.00 | 755000.00 |

**เหตุผล:** `PARTITION BY YEAR(month_start)` ทำให้ยอดสะสมเริ่มใหม่ทุกปี และคำนวณใน CTE ก่อนกรองปี 2025 ในชั้นนอก (ถ้ากรองก่อนในชั้นเดียวกัน ผลในกรณีนี้ยังถูกเพราะ PARTITION ตามปี แต่การกรองหลังคำนวณเป็นนิสัยที่ปลอดภัยกว่า)
:::

## ข้อ E6 (ท้าทาย): YoY พร้อมติดธง

**หัวข้อ:** บทที่ 21 · **โจทย์:** จากตาราง `monthly_sales` แสดงยอดเดือนเม.ย.–มิ.ย. 2025 ยอดเดือนเดียวกันของปีก่อน % เติบโต และคอลัมน์ `growth_flag` = `'Strong'` ถ้าเติบโตเกิน 8% ไม่เช่นนั้น `'Normal'`

:::answer
```sql {verify}
WITH yoy AS (
  SELECT
    cur.month_start,
    cur.net_sales,
    prev.net_sales AS last_year_sales,
    (cur.net_sales - prev.net_sales) * 100.0 / NULLIF(prev.net_sales, 0) AS yoy_pct_raw
  FROM monthly_sales AS cur
  LEFT JOIN monthly_sales AS prev
    ON prev.month_start = ADD_MONTHS(cur.month_start, -12)
  WHERE cur.month_start >= DATE'2025-04-01'
)
SELECT
  month_start,
  net_sales,
  last_year_sales,
  ROUND(yoy_pct_raw, 1) AS yoy_growth_pct,
  CASE WHEN yoy_pct_raw > 8 THEN 'Strong' ELSE 'Normal' END AS growth_flag
FROM yoy
ORDER BY month_start;
```

| month_start | net_sales | last_year_sales | yoy_growth_pct | growth_flag |
|---|---|---|---|---|
| 2025-04-01 | 125000.00 | 118000.00 | 5.9 | Normal |
| 2025-05-01 | 133000.00 | 121000.00 | 9.9 | Strong |
| 2025-06-01 | 127000.00 | 116000.00 | 9.5 | Strong |

**เหตุผล:** JOIN ตัวเองที่ `ADD_MONTHS(cur.month_start, -12)` ได้เดือนเดียวกันของปีก่อนแน่นอน คำนวณ % ดิบครั้งเดียวใน CTE แล้วใช้ทั้งแสดงผล (ปัดเศษ) และติดธง (ใช้ค่าก่อนปัด เพื่อไม่ให้การปัดเศษเปลี่ยนผลการตัดสิน)
:::

## ข้อ E7 (ปานกลาง): ทำความสะอาดรหัสก่อน JOIN

**หัวข้อ:** บทที่ 18 · **โจทย์:** สรุปยอดเงินจาก `sales_raw` ต่อสาขา (แสดงชื่อสาขา) โดยทำความสะอาด `store_code` ก่อน JOIN แปลง `amount_text` เป็นตัวเลข และนับแถวที่ยอดเงินแปลงไม่ได้

:::answer
```sql {verify}
WITH raw_clean AS (
  SELECT
    UPPER(TRIM(store_code))                                  AS store_id,
    TRY_CAST(REPLACE(amount_text, ',', '') AS DECIMAL(12,2)) AS amount
  FROM sales_raw
)
SELECT
  st.store_id,
  st.store_name,
  COUNT(*)                AS raw_lines,
  SUM(r.amount)           AS amount_total,
  COUNT(*) - COUNT(r.amount) AS invalid_amount_lines
FROM raw_clean AS r
JOIN stores AS st
  ON r.store_id = st.store_id
GROUP BY st.store_id, st.store_name
ORDER BY st.store_id;
```

| store_id | store_name | raw_lines | amount_total | invalid_amount_lines |
|---|---|---|---|---|
| S01 | สาขาสุขุมวิท | 2 | 1700.00 | 0 |
| S02 | สาขาบางนา | 2 | 980.50 | 1 |
| S03 | สาขาเชียงใหม่ | 2 | 3600.00 | 0 |
| S04 | สาขาขอนแก่น | 2 | 1020.25 | 0 |

**เหตุผล:** ทำความสะอาดใน CTE ครั้งเดียว `UPPER(TRIM(...))` ทำให้ `'s03'` และ `' S02 '` จับคู่กับตาราง `stores` ได้ (ครบ 8 แถว) `SUM` ข้ามค่า NULL จาก `'N/A'` อัตโนมัติ จึงต้องนับแยกด้วย `COUNT(*) - COUNT(r.amount)` เพื่อให้รู้ว่ายอดของ S02 ยังไม่ครบ
:::

## ข้อ E8 (ปานกลาง): ราคาเฉลี่ยต่อชิ้นอย่างปลอดภัย

**หัวข้อ:** บทที่ 8, 18 · **โจทย์:** สำหรับสินค้าหมวด Beverage แสดงจำนวนชิ้นรวม ยอดรวม ราคาเฉลี่ยต่อชิ้น (ปัด 2 ตำแหน่ง ป้องกันหารศูนย์) และราคาป้าย

:::answer
```sql {verify}
SELECT
  s.product_id,
  p.product_name,
  SUM(s.quantity)                                      AS total_qty,
  SUM(s.net_amount)                                    AS total_net,
  ROUND(SUM(s.net_amount) / NULLIF(SUM(s.quantity), 0), 2) AS avg_price_per_unit,
  p.list_price
FROM sales AS s
JOIN products AS p
  ON s.product_id = p.product_id
WHERE p.category = 'Beverage'
GROUP BY s.product_id, p.product_name, p.list_price
ORDER BY s.product_id;
```

| product_id | product_name | total_qty | total_net | avg_price_per_unit | list_price |
|---|---|---|---|---|---|
| P001 | น้ำดื่ม 600ml | 102 | 664.00 | 6.51 | 7.00 |
| P002 | ชาเขียว 500ml | 55 | 986.00 | 17.93 | 20.00 |
| P003 | กาแฟกระป๋อง 180ml | 75 | 1310.00 | 17.47 | 18.00 |

**เหตุผล:** คำนวณราคาเฉลี่ยจาก**ผลรวม** (ยอดรวม ÷ ชิ้นรวม) ไม่ใช่เฉลี่ยราคาต่อชิ้นรายแถว และใช้ `NULLIF` กันหารศูนย์ ราคาเฉลี่ยต่ำกว่าราคาป้ายเพราะมีโปรโมชันและส่วนลด เช่น ชาเขียวขายช่วงโปรฯ ที่ 17–18 บาท
:::

## ข้อ E9 (ปานกลาง): หาสมาชิกที่ยังไม่เคยซื้อแยกตามระดับ

**หัวข้อ:** บทที่ 10 · **โจทย์:** จากตาราง `customers` นับจำนวนสมาชิกทั้งหมด และจำนวนสมาชิกที่ยังไม่เคยซื้อเลย แยกตามระดับสมาชิก (`segment`)

:::answer
```sql {verify}
WITH buyers AS (
  SELECT DISTINCT customer_id
  FROM sales
  WHERE customer_id IS NOT NULL
)
SELECT
  c.segment,
  COUNT(*)                     AS members,
  COUNT(*) - COUNT(b.customer_id) AS no_purchase
FROM customers AS c
LEFT JOIN buyers AS b
  ON c.customer_id = b.customer_id
GROUP BY c.segment
ORDER BY c.segment;
```

| segment | members | no_purchase |
|---|---|---|
| Basic | 10 | 1 |
| Gold | 5 | 0 |
| Silver | 7 | 1 |

**เหตุผล:** สรุปรายชื่อผู้ซื้อที่ไม่ซ้ำก่อน (กัน Fan-out เพราะลูกค้าคนหนึ่งซื้อหลายครั้ง) แล้ว LEFT JOIN จาก `customers` สมาชิกที่หาคู่ไม่เจอมี `b.customer_id` เป็น NULL ซึ่ง `COUNT(b.customer_id)` ไม่นับ จึงหาจำนวนที่ไม่เคยซื้อได้จากการลบ (C021 ระดับ Basic และ C022 ระดับ Silver ที่เพิ่งสมัคร)
:::

## ข้อ E10 (ปานกลาง): แก้ Query ที่กำกวม

**หัวข้อ:** บทที่ 22 · **โจทย์:** Query นี้ Error แก้ให้ถูก และเรียงตามยอดมากไปน้อย

```sql {error}
SELECT store_id, region, SUM(net_amount) AS total_net
FROM sales AS s
JOIN stores AS st ON s.store_id = st.store_id
GROUP BY store_id, region;
```

:::answer
**สาเหตุ:** Error `AMBIGUOUS_REFERENCE` เพราะ `store_id` มีทั้งในตาราง `sales` และ `stores`

```sql {verify}
SELECT
  s.store_id,
  st.region,
  SUM(s.net_amount) AS total_net
FROM sales AS s
JOIN stores AS st
  ON s.store_id = st.store_id
GROUP BY s.store_id, st.region
ORDER BY total_net DESC;
```

| store_id | region | total_net |
|---|---|---|
| S01 | Bangkok | 4348.00 |
| S02 | Bangkok | 3230.00 |
| S04 | Northeast | 2618.00 |
| S03 | North | 1624.00 |
| S05 | South | 663.00 |

**เหตุผล:** ใส่ชื่อย่อตารางนำหน้าทุกคอลัมน์ (ทั้งใน `SELECT` และ `GROUP BY`) เมื่อ Query มีหลายตาราง แม้คอลัมน์ `region` จะไม่กำกวม การใส่ `st.` ไว้ช่วยให้ผู้อ่านรู้ทันทีว่ามาจากตารางไหน
:::

## ข้อ E11 (ง่าย): การตรวจที่ "ไม่พบปัญหา" ก็มีค่า

**หัวข้อ:** บทที่ 19 · **โจทย์:** ตรวจว่ามีรายการขายใดเกิดขึ้น**ก่อน**วันเปิดสาขาหรือไม่

:::answer
```sql {verify}
SELECT
  s.sale_id,
  s.store_id,
  s.sale_date,
  st.open_date
FROM sales AS s
JOIN stores AS st
  ON s.store_id = st.store_id
WHERE s.sale_date < st.open_date;
```

| sale_id | store_id | sale_date | open_date |
|---|---|---|---|

**เหตุผล:** ได้ 0 แถว แปลว่าข้อมูลผ่านการตรวจนี้ (สาขาภูเก็ตเปิด 1 มี.ค. และมีรายการแรกวันที่ 2 มี.ค.) ผลว่างเปล่าของ Query ตรวจสอบคือ "ข่าวดี" ควรบันทึกว่าตรวจแล้วผ่าน และเก็บ Query ไว้รันซ้ำทุกรอบข้อมูลใหม่
:::

## ข้อ E12 (ท้าทาย): Top N ต่อกลุ่มจากข้อมูลสะอาด

**หัวข้อ:** บทที่ 16, 19 · **โจทย์:** หาสินค้าที่ยอดขายสูงสุดอันดับ 1 ของแต่ละสาขา โดยใช้ clean sales (ตัดแถวซ้ำ + quantity 1–50) แล้วเทียบกับผลจากข้อมูลดิบว่าสาขาไหนเปลี่ยน

:::answer
```sql {verify}
WITH clean_sales AS (
  SELECT DISTINCT *
  FROM sales
  WHERE quantity BETWEEN 1 AND 50
),
store_product_clean AS (
  SELECT
    store_id,
    product_id,
    SUM(net_amount) AS total_net
  FROM clean_sales
  GROUP BY store_id, product_id
),
ranked AS (
  SELECT
    store_id,
    product_id,
    total_net,
    ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY total_net DESC, product_id) AS rn
  FROM store_product_clean
)
SELECT
  store_id,
  product_id,
  total_net
FROM ranked
WHERE rn = 1
ORDER BY store_id;
```

| store_id | product_id | total_net |
|---|---|---|
| S01 | P007 | 1498.00 |
| S02 | P007 | 781.00 |
| S03 | P007 | 356.00 |
| S04 | P007 | 885.00 |
| S05 | P006 | 330.00 |

**เหตุผล:** อันดับ 1 ไม่เปลี่ยนในทุกสาขาเมื่อเทียบกับข้อมูลดิบ (บทที่ 16) แต่อันดับ 2 ของ S02 จะเปลี่ยน เพราะยอดของ P001 ลดลง 420 บาทหลังตัดรายการ 60 ชิ้น ลองเปลี่ยนเป็น `rn <= 3` เพื่อดูความต่าง การจัดอันดับจากข้อมูลที่ยังไม่สะอาดอาจทำให้ตัดสินใจผิด
:::
