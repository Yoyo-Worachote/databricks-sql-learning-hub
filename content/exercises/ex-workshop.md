## วิธีใช้ Workshop

ทุกโจทย์ใช้วิธีคิด 6 ขั้น: (1) ผู้ถามต้องการตัดสินใจเรื่องอะไร (2) ข้อมูลอยู่ตารางไหน (3) ผลลัพธ์ 1 แถวคืออะไร (Grain) (4) กรองอะไรบ้าง (5) สรุปอย่างไร (6) ตรวจตัวเลขอย่างไร ลองเขียนเองก่อนเปิดเฉลย ดูตัวอย่างการคิดครบ 6 ขั้นได้ใน [บทที่ 25](#/lesson/workshop-project)

## โจทย์ 1: ดูภาพรวมยอดขายทั้งหมด

**โจทย์:** หัวหน้าถามว่า "ไตรมาส 1 ปี 2026 เรามีรายการขายกี่รายการ ขายได้กี่ชิ้น ยอดสุทธิเท่าไร และข้อมูลครอบคลุมวันไหนถึงวันไหน"

**ตารางที่ใช้:** `sales` · **คำใบ้:** ไม่ต้อง GROUP BY เพราะต้องการตัวเลขสรุปทั้งตารางในแถวเดียว

:::answer
```sql {verify}
SELECT
  COUNT(*)                AS line_count,
  COUNT(DISTINCT sale_id) AS unique_sale_ids,
  SUM(quantity)           AS total_units,
  SUM(net_amount)         AS total_net,
  MIN(sale_date)          AS first_date,
  MAX(sale_date)          AS last_date
FROM sales;
```

| line_count | unique_sale_ids | total_units | total_net | first_date | last_date |
|---|---|---|---|---|---|
| 141 | 140 | 444 | 12483.00 | 2026-01-02 | 2026-03-31 |

**อ่านผล:** 141 รายการ แต่ `sale_id` ไม่ซ้ำเพียง 140 แสดงว่ามีรายการซ้ำ (ตรวจในโจทย์ 8) ข้อมูลครอบคลุม 2 ม.ค. ถึง 31 มี.ค. 2026 การใส่ `COUNT(DISTINCT sale_id)` คู่กับ `COUNT(*)` เป็นวิธีตรวจแถวซ้ำแบบเร็วที่ดี
:::

## โจทย์ 2: กรองยอดขายตามวันที่และสาขา

**โจทย์:** ผู้จัดการสาขาสุขุมวิท (S01) ขอรายการขายช่วงวันที่ 1–15 กุมภาพันธ์ 2026 เรียงตามเวลา

**ตารางที่ใช้:** `sales` · **คำใบ้:** ช่วงวันที่ใช้ `>=` และ `<` วันถัดไป

:::answer
```sql {verify}
SELECT
  sale_id,
  sale_datetime,
  product_id,
  quantity,
  net_amount
FROM sales
WHERE store_id = 'S01'
  AND sale_date >= DATE'2026-02-01'
  AND sale_date <  DATE'2026-02-16'
ORDER BY sale_datetime;
```

| sale_id | sale_datetime | product_id | quantity | net_amount |
|---|---|---|---|---|
| T0061 | 2026-02-02 15:54:52 | P005 | -2 | -30.00 |
| T0063 | 2026-02-03 17:53:06 | P004 | 1 | 20.00 |
| T0064 | 2026-02-05 12:10:17 | P001 | 2 | 14.00 |
| T0068 | 2026-02-07 09:06:01 | P010 | 2 | 78.00 |
| T0071 | 2026-02-11 11:43:19 | P008 | 2 | 258.00 |

**อ่านผล:** ได้เฉพาะรายการของ S01 ในวันที่ 1–15 ก.พ. (`< DATE'2026-02-16'` ครอบคลุมทั้งวันที่ 15) ตรวจได้โดยดูว่าแถวแรกและแถวสุดท้ายอยู่ในช่วงที่ขอ และควรแจ้งผู้จัดการว่ารายการแรกเป็นการรับคืน
:::

## โจทย์ 3: ยอดขายรายวัน (ไม่ตกหล่นวันที่ไม่มีการขาย)

**โจทย์:** ทีม Ops ต้องการยอดขายรายวันของเดือนมกราคม 2026 ทุกวัน ถ้าวันไหนไม่มีการขาย (เช่น ร้านปิดวันที่ 1 ม.ค.) ต้องแสดงเป็น 0 ไม่ใช่หายไป

**ตารางที่ใช้:** `calendar`, `sales` · **คำใบ้:** เริ่มจาก `calendar` ที่มีครบทุกวัน แล้ว LEFT JOIN ยอดขายรายวันที่สรุปไว้ใน CTE

:::answer
```sql {verify partial count=31}
WITH daily_sales AS (
  SELECT
    sale_date,
    COUNT(*)        AS line_count,
    SUM(net_amount) AS net_sales
  FROM sales
  GROUP BY sale_date
)
SELECT
  c.cal_date,
  c.day_name,
  COALESCE(d.line_count, 0) AS line_count,
  COALESCE(d.net_sales, 0)  AS net_sales
FROM calendar AS c
LEFT JOIN daily_sales AS d
  ON c.cal_date = d.sale_date
WHERE c.cal_date >= DATE'2026-01-01'
  AND c.cal_date <  DATE'2026-02-01'
ORDER BY c.cal_date;
```

**ผลลัพธ์** (แสดง 12 จาก 31 แถว)

| cal_date | day_name | line_count | net_sales |
|---|---|---|---|
| 2026-01-01 | Thu | 0 | 0.00 |
| 2026-01-02 | Fri | 3 | 126.00 |
| 2026-01-03 | Sat | 2 | 93.00 |
| 2026-01-04 | Sun | 1 | 14.00 |
| 2026-01-05 | Mon | 4 | 185.00 |
| 2026-01-06 | Tue | 2 | 429.00 |
| 2026-01-07 | Wed | 2 | 131.00 |
| 2026-01-08 | Thu | 4 | 478.00 |
| 2026-01-09 | Fri | 4 | 824.00 |
| 2026-01-10 | Sat | 0 | 0.00 |
| 2026-01-11 | Sun | 0 | 0.00 |
| 2026-01-12 | Mon | 2 | 183.00 |

**อ่านผล:** ได้ครบ 31 แถว (1 แถวต่อวัน) วันที่ไม่มีการขายแสดง 0 กราฟรายวันใน Power BI จึงไม่ข้ามวัน ตรวจได้ว่าผลรวม `net_sales` ทั้ง 31 วัน = ยอดเดือนมกราคม 5,302 บาท
:::

## โจทย์ 4: ยอดขายรายเดือนแยกสาขา

**โจทย์:** ผู้บริหารต้องการตารางยอดขายรายเดือนของแต่ละสาขา (ใช้ชื่อสาขา) สำหรับไตรมาส 1 ภายในแต่ละเดือนเรียงสาขาที่ขายมากสุดก่อน

**ตารางที่ใช้:** `sales`, `stores`

:::answer
```sql {verify partial count=13}
SELECT
  CAST(DATE_TRUNC('MONTH', s.sale_date) AS DATE) AS month_start,
  st.store_name,
  SUM(s.net_amount)                              AS net_sales
FROM sales AS s
INNER JOIN stores AS st
  ON s.store_id = st.store_id
WHERE s.sale_date >= DATE'2026-01-01'
  AND s.sale_date <  DATE'2026-04-01'
GROUP BY CAST(DATE_TRUNC('MONTH', s.sale_date) AS DATE), st.store_name
ORDER BY month_start, net_sales DESC;
```

**ผลลัพธ์** (แสดง 12 จาก 13 แถว)

| month_start | store_name | net_sales |
|---|---|---|
| 2026-01-01 | สาขาสุขุมวิท | 2480.00 |
| 2026-01-01 | สาขาบางนา | 1228.00 |
| 2026-01-01 | สาขาขอนแก่น | 1143.00 |
| 2026-01-01 | สาขาเชียงใหม่ | 451.00 |
| 2026-02-01 | สาขาเชียงใหม่ | 755.00 |
| 2026-02-01 | สาขาสุขุมวิท | 583.00 |
| 2026-02-01 | สาขาขอนแก่น | 503.00 |
| 2026-02-01 | สาขาบางนา | 254.00 |
| 2026-03-01 | สาขาบางนา | 1748.00 |
| 2026-03-01 | สาขาสุขุมวิท | 1285.00 |
| 2026-03-01 | สาขาขอนแก่น | 972.00 |
| 2026-03-01 | สาขาภูเก็ต | 663.00 |

**อ่านผล:** 13 แถว = 4 สาขา × 3 เดือน + สาขาภูเก็ตเฉพาะมีนาคม การ INNER JOIN กับ `stores` ปลอดภัยในกรณีนี้เพราะทุกรายการขายมีรหัสสาขาที่ถูกต้อง (ควรตรวจด้วยการเทียบยอดรวม)
:::

## โจทย์ 5: จัดอันดับสินค้าและสัดส่วนยอดขาย

**โจทย์:** ต้องการอันดับสินค้าตามยอดขายสุทธิทั้งไตรมาส (ทั้งบริษัท) และบอกว่าแต่ละสินค้าคิดเป็นกี่ % ของยอดรวม

**ตารางที่ใช้:** `sales`, `products` · **คำใบ้:** สรุปยอดต่อสินค้าใน CTE แล้วใช้ `RANK()` และ `SUM() OVER ()`

:::answer
```sql {verify}
WITH product_sales AS (
  SELECT
    s.product_id,
    COALESCE(p.product_name, '(ไม่พบในข้อมูลสินค้า)') AS product_name,
    SUM(s.net_amount)                                 AS net_sales
  FROM sales AS s
  LEFT JOIN products AS p
    ON s.product_id = p.product_id
  GROUP BY s.product_id, COALESCE(p.product_name, '(ไม่พบในข้อมูลสินค้า)')
)
SELECT
  RANK() OVER (ORDER BY net_sales DESC)                AS sales_rank,
  product_id,
  product_name,
  net_sales,
  ROUND(net_sales * 100.0 / SUM(net_sales) OVER (), 1) AS share_pct
FROM product_sales
ORDER BY sales_rank, product_id;
```

| sales_rank | product_id | product_name | net_sales | share_pct |
|---|---|---|---|---|
| 1 | P007 | สบู่เหลว 450ml | 3599.00 | 28.8 |
| 2 | P009 | ยาสีฟัน 160g | 1622.00 | 13.0 |
| 3 | P003 | กาแฟกระป๋อง 180ml | 1310.00 | 10.5 |
| 4 | P004 | มันฝรั่งทอด 50g | 1115.00 | 8.9 |
| 5 | P002 | ชาเขียว 500ml | 986.00 | 7.9 |
| 6 | P008 | แชมพู 400ml | 903.00 | 7.2 |
| 7 | P010 | น้ำยาล้างจาน 500ml | 819.00 | 6.6 |
| 8 | P006 | ถั่วอบเกลือ 40g | 685.00 | 5.5 |
| 9 | P001 | น้ำดื่ม 600ml | 664.00 | 5.3 |
| 10 | P005 | ขนมปังกรอบ 60g | 510.00 | 4.1 |
| 11 | P099 | (ไม่พบในข้อมูลสินค้า) | 270.00 | 2.2 |

**อ่านผล:** 11 แถว (สินค้าที่มียอดขาย 10 ตัว + P099) LEFT JOIN ทำให้ P099 ไม่หาย ผลรวม `share_pct` ประมาณ 100 (อาจคลาดเคลื่อนเล็กน้อยจากการปัดทศนิยม)
:::

## โจทย์ 6: ยอดขายตามแบรนด์โดยไม่ให้รายการหาย

**โจทย์:** ทีมจัดซื้อต้องการรายงานยอดขายตามแบรนด์ (`brand`) โดยสินค้าที่ไม่มีแบรนด์ให้แสดงเป็น `'No brand'` และต้องไม่ทำให้รายการขายหายไป

**ตารางที่ใช้:** `sales`, `products`

:::answer
```sql {verify}
SELECT
  COALESCE(p.brand, 'No brand') AS brand,
  COUNT(*)                      AS line_count,
  SUM(s.net_amount)             AS net_sales
FROM sales AS s
LEFT JOIN products AS p
  ON s.product_id = p.product_id
GROUP BY COALESCE(p.brand, 'No brand')
ORDER BY net_sales DESC;
```

| brand | line_count | net_sales |
|---|---|---|
| CleanPro | 30 | 6124.00 |
| FreshCo | 43 | 1974.00 |
| SnackHub | 31 | 1625.00 |
| PureLeaf | 20 | 986.00 |
| No brand | 9 | 955.00 |
| HomeMate | 8 | 819.00 |

**อ่านผล:** ผลรวม `line_count` = 141 และผลรวม `net_sales` = 12,483 เท่ากับตาราง `sales` กลุ่ม No brand รวมทั้ง P006 (แบรนด์เป็น NULL, 685 บาท) และ P099 (ไม่พบสินค้า, 270 บาท) ควรแยกให้ผู้ใช้รายงานรู้ว่ามีสองสาเหตุ
:::

## โจทย์ 7: หาสินค้าที่ไม่มียอดขาย

**โจทย์:** ฝ่ายสินค้าต้องการรายชื่อสินค้าใน Master ที่ไม่มียอดขายเลยในไตรมาส 1 พร้อมสถานะว่ายังขายอยู่หรือไม่

**ตารางที่ใช้:** `products`, `sales` · **คำใบ้:** เงื่อนไขช่วงวันที่ของ `sales` ต้องอยู่ใน `ON` ไม่ใช่ `WHERE`

:::answer
```sql {verify}
SELECT
  p.product_id,
  p.product_name,
  p.category,
  p.is_active,
  p.launch_date
FROM products AS p
LEFT JOIN sales AS s
  ON  p.product_id = s.product_id
  AND s.sale_date >= DATE'2026-01-01'
  AND s.sale_date <  DATE'2026-04-01'
WHERE s.sale_id IS NULL
ORDER BY p.product_id;
```

| product_id | product_name | category | is_active | launch_date |
|---|---|---|---|---|
| P011 | ถุงขยะ 30 ใบ | Household | true | 2025-11-01 |
| P012 | กระดาษทิชชู 6 ม้วน | Household | false | 2019-01-01 |

**อ่านผล:** P012 ไม่ขายแล้ว (`is_active = false`) ไม่มียอดจึงเป็นเรื่องปกติ ส่วน P011 ยังขายอยู่และเพิ่งเริ่มขาย ควรตรวจว่าสินค้าถึงสาขาหรือยัง ถ้าย้ายเงื่อนไขวันที่ไปไว้ใน `WHERE` จะได้ผลว่างเปล่า เพราะแถวที่หาคู่ไม่เจอมี `s.sale_date` เป็น NULL
:::

## โจทย์ 8: ตรวจสอบข้อมูลซ้ำและข้อมูลหาย

**โจทย์:** ก่อนส่งรายงาน ต้องสรุปปัญหาคุณภาพข้อมูลทั้งหมดของตาราง `sales` ในตารางเดียว พร้อมจำนวนแถวและยอดเงินที่ได้รับผลกระทบ

**ตารางที่ใช้:** `sales`, `products` · **คำใบ้:** สร้างการตรวจแต่ละแบบเป็น Query ย่อยที่มีคอลัมน์เหมือนกัน แล้วต่อด้วย `UNION ALL`

:::answer
```sql {verify}
WITH dup_ids AS (
  SELECT sale_id
  FROM sales
  GROUP BY sale_id
  HAVING COUNT(*) > 1
)
SELECT
  'Duplicate sale_id (extra rows)'   AS check_name,
  COUNT(*) - COUNT(DISTINCT sale_id) AS affected_rows,
  CAST(NULL AS DECIMAL(12,2))        AS affected_net
FROM sales
WHERE sale_id IN (SELECT sale_id FROM dup_ids)
UNION ALL
SELECT 'Missing customer_id (non-member)', COUNT(*), SUM(net_amount)
FROM sales
WHERE customer_id IS NULL
UNION ALL
SELECT 'Missing discount_amount', COUNT(*), SUM(net_amount)
FROM sales
WHERE discount_amount IS NULL
UNION ALL
SELECT 'Product not in master', COUNT(*), SUM(s.net_amount)
FROM sales AS s
LEFT JOIN products AS p
  ON s.product_id = p.product_id
WHERE p.product_id IS NULL
UNION ALL
SELECT 'Quantity <= 0 or > 50', COUNT(*), SUM(net_amount)
FROM sales
WHERE quantity <= 0 OR quantity > 50
UNION ALL
SELECT 'Negative net with positive qty', COUNT(*), SUM(net_amount)
FROM sales
WHERE quantity > 0 AND net_amount < 0;
```

| check_name | affected_rows | affected_net |
|---|---|---|
| Duplicate sale_id (extra rows) | 1 | NULL |
| Missing customer_id (non-member) | 29 | 2274.00 |
| Missing discount_amount | 20 | 1843.00 |
| Product not in master | 1 | 270.00 |
| Quantity <= 0 or > 50 | 2 | 390.00 |
| Negative net with positive qty | 2 | -9.00 |

**อ่านผล:** 1 แถว = 1 การตรวจ: แถวซ้ำส่วนเกิน 1 แถว, ลูกค้าไม่ใช่สมาชิก 29 แถว (เป็นเรื่องปกติ), ส่วนลดไม่ได้บันทึก 20 แถว, สินค้าไม่มีใน Master 1 แถว, จำนวนผิดปกติ 2 แถว และยอดติดลบจากส่วนลด 2 แถว (การตรวจข้อสุดท้ายเพิ่มจากเอกสารเดิม) `CAST(NULL AS DECIMAL(12,2))` ทำให้คอลัมน์ของ Query แรกมีชนิดตรงกับ Query อื่น
:::

## โจทย์ 9: เปรียบเทียบยอดขายระหว่างช่วงเวลา

**โจทย์:** เปรียบเทียบยอดขายรายสาขาของเดือนมีนาคมกับกุมภาพันธ์ 2026 แสดงยอดทั้งสองเดือน ผลต่าง และ % เติบโต

**ตารางที่ใช้:** `sales` · **คำใบ้:** ใช้ `SUM(CASE WHEN ...)` แยกยอดแต่ละเดือนเป็นคนละคอลัมน์

:::answer
```sql {verify}
WITH store_month AS (
  SELECT
    store_id,
    SUM(CASE WHEN sale_date >= DATE'2026-02-01' AND sale_date < DATE'2026-03-01'
             THEN net_amount ELSE 0 END) AS feb_net,
    SUM(CASE WHEN sale_date >= DATE'2026-03-01' AND sale_date < DATE'2026-04-01'
             THEN net_amount ELSE 0 END) AS mar_net
  FROM sales
  WHERE sale_date >= DATE'2026-02-01'
    AND sale_date <  DATE'2026-04-01'
  GROUP BY store_id
)
SELECT
  store_id,
  feb_net,
  mar_net,
  mar_net - feb_net                                          AS diff_thb,
  ROUND((mar_net - feb_net) * 100.0 / NULLIF(feb_net, 0), 1) AS growth_pct
FROM store_month
ORDER BY store_id;
```

| store_id | feb_net | mar_net | diff_thb | growth_pct |
|---|---|---|---|---|
| S01 | 583.00 | 1285.00 | 702.00 | 120.4 |
| S02 | 254.00 | 1748.00 | 1494.00 | 588.2 |
| S03 | 755.00 | 418.00 | -337.00 | -44.6 |
| S04 | 503.00 | 972.00 | 469.00 | 93.2 |
| S05 | 0.00 | 663.00 | 663.00 | NULL |

**อ่านผล:** S05 มี `feb_net = 0` จึงได้ `growth_pct` เป็น NULL (หารศูนย์ไม่ได้) ซึ่งถูกต้องเพราะเพิ่งเปิดสาขา ยอดมีนาคมของ S02 รวมรายการผิดปกติ 420 บาท ถ้าตัดออก การเติบโตจะเหลือ 422.8%
:::

## โจทย์ 10: เตรียมตารางสรุปสำหรับ Power BI

**โจทย์:** ทีม BI ขอ Dataset รายเดือนระดับสาขา-หมวดสินค้า ที่ตัดแถวซ้ำแล้ว มีคอลัมน์ `net_sales`, `cogs`, `gross_profit`, `units`, `line_count` สำหรับทำ Dashboard

**ตารางที่ใช้:** `sales`, `products`, `stores` · **คำใบ้:** (1) clean_sales ตัดแถวซ้ำ (2) JOIN Dimension ที่ Key ไม่ซ้ำ (3) สรุปตาม Grain (4) ตรวจผลรวม

:::answer
```sql {verify partial count=44}
-- Grain: 1 แถว = 1 เดือน x 1 สาขา x 1 หมวดสินค้า
WITH clean_sales AS (
  SELECT DISTINCT *
  FROM sales
)
SELECT
  CAST(DATE_TRUNC('MONTH', c.sale_date) AS DATE)    AS month_start,
  c.store_id,
  st.store_name,
  st.region,
  COALESCE(p.category, 'Unknown')                   AS category,
  COUNT(*)                                          AS line_count,
  SUM(c.quantity)                                   AS units,
  SUM(c.net_amount)                                 AS net_sales,
  SUM(c.quantity * p.unit_cost)                     AS cogs,
  SUM(c.net_amount) - SUM(c.quantity * p.unit_cost) AS gross_profit
FROM clean_sales AS c
LEFT JOIN products AS p  ON c.product_id = p.product_id
LEFT JOIN stores   AS st ON c.store_id   = st.store_id
GROUP BY
  CAST(DATE_TRUNC('MONTH', c.sale_date) AS DATE),
  c.store_id,
  st.store_name,
  st.region,
  COALESCE(p.category, 'Unknown')
ORDER BY month_start, c.store_id, category;
```

**ผลลัพธ์** (แสดง 12 จาก 44 แถว)

| month_start | store_id | store_name | region | category | line_count | units | net_sales | cogs | gross_profit |
|---|---|---|---|---|---|---|---|---|---|
| 2026-01-01 | S01 | สาขาสุขุมวิท | Bangkok | Beverage | 7 | 17 | 263.00 | 167.50 | 95.50 |
| 2026-01-01 | S01 | สาขาสุขุมวิท | Bangkok | Personal Care | 7 | 21 | 1824.00 | 1131.00 | 693.00 |
| 2026-01-01 | S01 | สาขาสุขุมวิท | Bangkok | Snack | 7 | 17 | 300.00 | 178.00 | 122.00 |
| 2026-01-01 | S01 | สาขาสุขุมวิท | Bangkok | Unknown | 1 | 2 | 78.00 | 44.00 | 34.00 |
| 2026-01-01 | S02 | สาขาบางนา | Bangkok | Beverage | 10 | 30 | 513.00 | 315.00 | 198.00 |
| 2026-01-01 | S02 | สาขาบางนา | Bangkok | Personal Care | 3 | 6 | 409.00 | 250.00 | 159.00 |
| 2026-01-01 | S02 | สาขาบางนา | Bangkok | Snack | 2 | 6 | 150.00 | 90.00 | 60.00 |
| 2026-01-01 | S02 | สาขาบางนา | Bangkok | Unknown | 2 | 4 | 156.00 | 88.00 | 68.00 |
| 2026-01-01 | S03 | สาขาเชียงใหม่ | North | Beverage | 7 | 20 | 301.00 | 180.00 | 121.00 |
| 2026-01-01 | S03 | สาขาเชียงใหม่ | North | Snack | 3 | 6 | 150.00 | 88.00 | 62.00 |
| 2026-01-01 | S04 | สาขาขอนแก่น | Northeast | Beverage | 7 | 24 | 344.00 | 210.00 | 134.00 |
| 2026-01-01 | S04 | สาขาขอนแก่น | Northeast | Personal Care | 2 | 6 | 529.00 | 330.00 | 199.00 |

**ตรวจผลรวม (ขั้นที่ 4)**

```sql {verify}
WITH clean_sales AS (
  SELECT DISTINCT *
  FROM sales
)
SELECT
  COUNT(*)        AS line_count,
  SUM(net_amount) AS net_sales
FROM clean_sales;
```

| line_count | net_sales |
|---|---|
| 140 | 12468.00 |

**อ่านผล:** แต่ละแถวคือ 1 เดือน × 1 สาขา × 1 หมวด ผลรวม `line_count` และ `net_sales` ของ Dataset ต้องเท่ากับ 140 แถว และ 12,468 บาท แถวของ P099 มี `cogs` และ `gross_profit` เป็น NULL เพราะไม่รู้ต้นทุน ต้องอธิบายใน Note ของรายงาน และใน Power BI ให้สร้าง GP% เป็น Measure จาก `SUM(gross_profit) / SUM(net_sales)` ไม่ใช่เฉลี่ย % รายแถว เมื่อใช้งานจริงให้ลบ `ORDER BY` ออก
:::
