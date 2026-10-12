## ตัวชี้วัดยอดขายและกำไรที่ใช้บ่อย

| ตัวชี้วัด | ภาษาไทย | สูตรในชุดข้อมูลนี้ |
|---|---|---|
| **Net Sales** | ยอดขายสุทธิ | `SUM(s.net_amount)` |
| **COGS** (Cost of Goods Sold) | ต้นทุนขาย | `SUM(s.quantity * p.unit_cost)` ต้นทุนอยู่ในตาราง `products` |
| **Gross Profit** | กำไรขั้นต้น | Net Sales − COGS |
| **GP%** (Gross Profit Margin) | อัตรากำไรขั้นต้น | Gross Profit ÷ Net Sales × 100 |
| **Units** | จำนวนชิ้น | `SUM(s.quantity)` |
| **Average line value** | ยอดเฉลี่ยต่อรายการ | Net Sales ÷ จำนวนรายการ |

> [!KEY] อัตราส่วนต้องคำนวณจากผลรวม
> GP% ที่ถูกต้อง = (ผลรวม Net Sales − ผลรวม COGS) ÷ ผลรวม Net Sales **ไม่ใช่**ค่าเฉลี่ยของ GP% แต่ละแถว และ**ไม่ใช่**ผลรวมของ GP% แต่ละสาขา

## Net Sales, COGS และ Gross Profit ตามหมวดสินค้า

```sql {verify}
SELECT
  COALESCE(p.category, 'Unknown')                    AS category,
  SUM(s.net_amount)                                  AS net_sales,
  SUM(s.quantity * p.unit_cost)                      AS cogs,
  SUM(s.net_amount) - SUM(s.quantity * p.unit_cost)  AS gross_profit,
  ROUND((SUM(s.net_amount) - SUM(s.quantity * p.unit_cost)) * 100.0
        / NULLIF(SUM(s.net_amount), 0), 1)           AS gp_pct
FROM sales AS s
INNER JOIN products AS p
  ON s.product_id = p.product_id
GROUP BY COALESCE(p.category, 'Unknown')
ORDER BY gross_profit DESC;
```

| category | net_sales | cogs | gross_profit | gp_pct |
|---|---|---|---|---|
| Personal Care | 6124.00 | 3788.00 | 2336.00 | 38.1 |
| Beverage | 2960.00 | 1869.00 | 1091.00 | 36.9 |
| Snack | 2310.00 | 1445.00 | 865.00 | 37.4 |
| Unknown | 819.00 | 462.00 | 357.00 | 43.6 |

**อธิบายทีละส่วน**

| ส่วน | ความหมาย |
|---|---|
| `SUM(s.quantity * p.unit_cost)` | คูณจำนวนกับต้นทุนต่อชิ้น**ทีละแถวก่อน** แล้วจึงรวม |
| `INNER JOIN products` | ใช้ INNER เพราะคำนวณต้นทุนไม่ได้ถ้าไม่มีข้อมูลสินค้า P099 (270 บาท) จึงไม่ถูกรวม **ต้องระบุในรายงาน** |
| `Unknown` | คือ P010 ที่ไม่มีหมวด (ไม่ใช่ P099 เพราะถูก INNER JOIN ตัดไปแล้ว) |
| `gp_pct` | คำนวณจากผลรวมของหมวด ไม่ใช่เฉลี่ยรายแถว |

**ตรวจผลรวม:** 6,124 + 2,960 + 2,310 + 819 = 12,213 บาท = ยอดรวมทั้งตาราง 12,483 − ยอดของ P099 270 บาท

## ผิดบ่อย: เฉลี่ยเปอร์เซ็นต์รายแถว

```sql {verify}
SELECT
  ROUND(AVG((s.net_amount - s.quantity * p.unit_cost) * 100.0
            / NULLIF(s.net_amount, 0)), 1) AS gp_pct_wrong
FROM sales AS s
JOIN products AS p
  ON s.product_id = p.product_id
WHERE s.quantity > 0;
```

| gp_pct_wrong |
|---|
| 41.3 |

```sql {verify}
SELECT
  ROUND((SUM(s.net_amount) - SUM(s.quantity * p.unit_cost)) * 100.0
        / NULLIF(SUM(s.net_amount), 0), 1) AS gp_pct
FROM sales AS s
JOIN products AS p
  ON s.product_id = p.product_id
WHERE s.quantity > 0;
```

| gp_pct |
|---|
| 38.1 |

ค่าเฉลี่ยของ % ให้น้ำหนักรายการ 7 บาทเท่ากับรายการ 258 บาท จึงได้ 41.3% ซึ่งไม่ใช่ GP% ของบริษัท ค่าที่ถูกคือ 38.1% ที่คำนวณจากผลรวม

## Grain: 1 แถวของ Dataset หมายถึงอะไร

**Grain (ระดับความละเอียดของข้อมูล)** คือคำตอบของคำถาม "ผลลัพธ์ 1 แถวหมายถึงอะไร" ต้องตัดสินใจก่อนเขียน Query และเขียนเป็น Comment ไว้

| Grain | 1 แถว = | เหมาะกับ |
|---|---|---|
| รายการ | 1 รายการขาย | ตรวจสอบรายละเอียด |
| วัน × สาขา × หมวด | ยอดของ 1 หมวดใน 1 สาขาใน 1 วัน | Dashboard ที่เลือกดูได้ทั้งรายวันและรายเดือน |
| เดือน × ภูมิภาค | ยอดของ 1 ภูมิภาคใน 1 เดือน | รายงานผู้บริหาร |

- Grain **ละเอียดเกิน** → ไฟล์ใหญ่ Refresh ช้า
- Grain **หยาบเกิน** → เจาะลึกใน Power BI ไม่ได้ (เช่น มีแค่รายเดือนแต่ผู้ใช้อยากดูรายวัน)
- **ผสมหลาย Grain** ในตารางเดียว (บางแถวเป็นรายวัน บางแถวเป็นยอดรวม) → ผลรวมใน Power BI ผิด

## ป้องกันยอดซ้ำจากการ JOIN

ถ้า JOIN กับตารางที่ Key ซ้ำ ยอดจะเพิ่มผิด ๆ (Fan-out) ตาราง `promotions` มี P002 อยู่ 2 แถว

```sql {verify}
SELECT SUM(s.net_amount) AS net_sales
FROM sales AS s
LEFT JOIN promotions AS pr
  ON s.product_id = pr.product_id;
```

| net_sales |
|---|
| 13469.00 |

ยอดเพิ่มจาก 12,483 เป็น 13,469 (+986 = ยอดของ P002 ทั้งหมดถูกนับซ้ำ) **วิธีแก้:** สรุปตารางขวาให้เหลือ 1 แถวต่อ Key ก่อน แล้วจึง JOIN

```sql {verify}
WITH promo_per_product AS (
  SELECT
    product_id,
    COUNT(*) AS promo_count
  FROM promotions
  GROUP BY product_id
)
SELECT SUM(s.net_amount) AS net_sales
FROM sales AS s
LEFT JOIN promo_per_product AS pp
  ON s.product_id = pp.product_id;
```

| net_sales |
|---|
| 12483.00 |

> [!TIP] กฎง่าย ๆ
> JOIN ตารางข้อมูลรายการ (Fact เช่น `sales`) กับตารางที่ Key **ไม่ซ้ำ** (Dimension เช่น `products`, `stores`) เท่านั้น ถ้าต้อง JOIN ตารางที่ Key ซ้ำ ให้สรุปก่อน และเทียบยอดรวมก่อน/หลัง JOIN ทุกครั้ง

## ยอดขายและกำไรรายสาขาจาก clean sales

ตัวอย่างระดับงานจริง: ใช้ข้อมูลที่ทำความสะอาดแล้ว นับรายการ P099 ในยอดขาย แต่ไม่นับในต้นทุน/กำไร (เพราะไม่รู้ต้นทุน) ตามกติกาของ Final Project

```sql {verify}
WITH clean_sales AS (
  -- ตัดแถวซ้ำ และเก็บเฉพาะรายการปกติ 1-50 ชิ้น
  SELECT DISTINCT *
  FROM sales
  WHERE quantity BETWEEN 1 AND 50
)
SELECT
  st.store_name,
  SUM(c.net_amount)                                                AS net_sales,
  SUM(CASE WHEN p.product_id IS NOT NULL THEN c.net_amount END)    AS net_sales_known_cost,
  SUM(c.quantity * p.unit_cost)                                    AS cogs,
  SUM(CASE WHEN p.product_id IS NOT NULL THEN c.net_amount END)
    - SUM(c.quantity * p.unit_cost)                                AS gross_profit,
  ROUND((SUM(CASE WHEN p.product_id IS NOT NULL THEN c.net_amount END)
         - SUM(c.quantity * p.unit_cost)) * 100.0
        / NULLIF(SUM(CASE WHEN p.product_id IS NOT NULL THEN c.net_amount END), 0), 1) AS gp_pct
FROM clean_sales AS c
LEFT JOIN products AS p
  ON c.product_id = p.product_id
LEFT JOIN stores AS st
  ON c.store_id = st.store_id
GROUP BY st.store_name
ORDER BY net_sales DESC;
```

| store_name | net_sales | net_sales_known_cost | cogs | gross_profit | gp_pct |
|---|---|---|---|---|---|
| สาขาสุขุมวิท | 4363.00 | 4363.00 | 2698.50 | 1664.50 | 38.2 |
| สาขาบางนา | 2810.00 | 2810.00 | 1740.00 | 1070.00 | 38.1 |
| สาขาขอนแก่น | 2618.00 | 2348.00 | 1448.00 | 900.00 | 38.3 |
| สาขาเชียงใหม่ | 1624.00 | 1624.00 | 1006.50 | 617.50 | 38.0 |
| สาขาภูเก็ต | 663.00 | 663.00 | 409.00 | 254.00 | 38.3 |

**ทำไมต้องมี `net_sales_known_cost`:** สาขาขอนแก่นมียอด P099 อยู่ 270 บาทที่ไม่รู้ต้นทุน ถ้าใช้ `net_sales` (2,618) ลบ COGS จะได้กำไรสูงเกินจริง 270 บาท จึงคำนวณกำไรจากยอดขายเฉพาะสินค้าที่รู้ต้นทุน (2,348) แล้วระบุในรายงานว่ามียอด 270 บาทที่ยังคำนวณกำไรไม่ได้

## เตรียม Dataset สำหรับ Power BI

**หลักการ**

- ดึงเฉพาะคอลัมน์และช่วงเวลาที่ต้องใช้ ไม่ใช้ `SELECT *`
- ระบุ Grain ใน Comment และ GROUP BY ให้ตรง Grain
- คอลัมน์วันที่เป็นชนิด DATE ตั้งชื่อคอลัมน์ให้คนอ่านเข้าใจ
- ส่ง**คอลัมน์ผลรวม** (net_sales, cogs) ไป แล้วสร้าง Measure อัตราส่วน (GP%) ใน Power BI ไม่ส่ง % ที่คำนวณแล้วไปให้ SUM
- ไม่ใส่ `ORDER BY` / `LIMIT` ใน Query ที่ส่งเข้า Power BI (ใส่เฉพาะตอนตรวจ)

```sql {verify}
-- Grain: 1 แถว = 1 วัน x 1 สาขา x 1 หมวดสินค้า
SELECT
  s.sale_date                     AS sale_date,
  s.store_id                      AS store_id,
  st.region                       AS region,
  COALESCE(p.category, 'Unknown') AS category,
  COUNT(*)                        AS line_count,
  SUM(s.quantity)                 AS units,
  SUM(s.net_amount)               AS net_sales,
  SUM(s.quantity * p.unit_cost)   AS cogs
FROM sales AS s
LEFT JOIN products AS p  ON s.product_id = p.product_id
LEFT JOIN stores   AS st ON s.store_id   = st.store_id
WHERE s.sale_date >= DATE'2026-01-01'
  AND s.sale_date <  DATE'2026-04-01'
GROUP BY s.sale_date, s.store_id, st.region, COALESCE(p.category, 'Unknown')
ORDER BY s.sale_date, s.store_id, category
LIMIT 8;
```

| sale_date | store_id | region | category | line_count | units | net_sales | cogs |
|---|---|---|---|---|---|---|---|
| 2026-01-02 | S01 | Bangkok | Beverage | 2 | 2 | 36.00 | 24.00 |
| 2026-01-02 | S04 | Northeast | Beverage | 1 | 5 | 90.00 | 50.00 |
| 2026-01-03 | S02 | Bangkok | Snack | 1 | 3 | 75.00 | 45.00 |
| 2026-01-03 | S03 | North | Beverage | 1 | 1 | 18.00 | 12.00 |
| 2026-01-04 | S02 | Bangkok | Beverage | 1 | 2 | 14.00 | 9.00 |
| 2026-01-05 | S02 | Bangkok | Beverage | 1 | 1 | 18.00 | 12.00 |
| 2026-01-05 | S02 | Bangkok | Unknown | 1 | 3 | 117.00 | 66.00 |
| 2026-01-05 | S04 | Northeast | Beverage | 2 | 4 | 50.00 | 33.00 |

`ORDER BY` และ `LIMIT 8` ใส่ไว้เพื่อตรวจตัวอย่างเท่านั้น ตอนใช้งานจริงให้ลบออก

**บันทึกเป็น View** เพื่อให้ทุกรายงานใช้ Logic เดียวกัน (ต้องมีสิทธิ์สร้าง View ใน Schema นั้น ห้ามสร้างใน Schema งานจริงโดยไม่ได้รับอนุญาต)

```sql
CREATE OR REPLACE VIEW sql_training.v_sales_daily AS
-- Grain: 1 แถว = 1 วัน x 1 สาขา x 1 หมวดสินค้า
SELECT
  s.sale_date,
  s.store_id,
  st.region,
  COALESCE(p.category, 'Unknown') AS category,
  SUM(s.net_amount)               AS net_sales,
  SUM(s.quantity * p.unit_cost)   AS cogs
FROM sales AS s
LEFT JOIN products AS p  ON s.product_id = p.product_id
LEFT JOIN stores   AS st ON s.store_id   = st.store_id
GROUP BY s.sale_date, s.store_id, st.region, COALESCE(p.category, 'Unknown');
```

หลังสร้างแล้วใช้ `SELECT * FROM sql_training.v_sales_daily` ได้เหมือนตาราง และเลือก View นี้ใน Power BI ได้ ทุกครั้งที่อ่าน View ระบบจะรัน Query ข้างในใหม่ จึงได้ข้อมูลล่าสุดเสมอ

> [!WARNING] อย่า Hard-code ช่วงวันที่ใน View โดยไม่บอกผู้ใช้
> ถ้าใส่ `WHERE sale_date < DATE'2026-04-01'` ไว้ใน View รายงานจะไม่อัปเดตเมื่อมีข้อมูลเดือนใหม่ ให้กรองช่วงเวลาที่ Power BI หรือเขียนไว้ชัดเจนในชื่อ/คำอธิบายของ View

## ข้อผิดพลาดที่พบบ่อย

- ส่ง `SELECT *` ทั้งตารางเข้า Power BI ทำให้ Refresh ช้าและเปลืองทรัพยากร
- ไม่กำหนด Grain ทำให้ Dataset มีแถวปนหลายระดับ
- JOIN ตารางที่ Key ซ้ำก่อน SUM ทำให้ยอดเพิ่ม
- เฉลี่ยเปอร์เซ็นต์ หรือ SUM ค่า % ใน Power BI
- ใช้ INNER JOIN คำนวณกำไรแล้วไม่บอกว่ายอดบางส่วนถูกตัดออก
- Hard-code ช่วงวันที่ไว้ใน View

## ฝึกทำ

**โจทย์:** หา Net Sales, COGS, Gross Profit และ GP% ของแต่ละแบรนด์ (เฉพาะสินค้าที่มีแบรนด์) เรียงตามกำไรขั้นต้นมากไปน้อย

:::answer ดูเฉลยและคำอธิบาย
```sql {verify}
SELECT
  p.brand,
  SUM(s.net_amount)                                 AS net_sales,
  SUM(s.quantity * p.unit_cost)                     AS cogs,
  SUM(s.net_amount) - SUM(s.quantity * p.unit_cost) AS gross_profit,
  ROUND((SUM(s.net_amount) - SUM(s.quantity * p.unit_cost)) * 100.0
        / NULLIF(SUM(s.net_amount), 0), 1)          AS gp_pct
FROM sales AS s
INNER JOIN products AS p
  ON s.product_id = p.product_id
WHERE p.brand IS NOT NULL
GROUP BY p.brand
ORDER BY gross_profit DESC;
```

| brand | net_sales | cogs | gross_profit | gp_pct |
|---|---|---|---|---|
| CleanPro | 6124.00 | 3788.00 | 2336.00 | 38.1 |
| FreshCo | 1974.00 | 1209.00 | 765.00 | 38.8 |
| SnackHub | 1625.00 | 1031.00 | 594.00 | 36.6 |
| HomeMate | 819.00 | 462.00 | 357.00 | 43.6 |
| PureLeaf | 986.00 | 660.00 | 326.00 | 33.1 |

**เหตุผล:** ใช้ INNER JOIN เพราะต้องรู้ต้นทุนและแบรนด์จากตาราง `products` และกรองแบรนด์ที่เป็น NULL (P006) ออกตามโจทย์ GP% คำนวณจากผลรวมของแต่ละแบรนด์ สังเกตว่า PureLeaf ยอดขายสูงกว่า HomeMate แต่กำไรต่ำกว่า เพราะอัตรากำไรต่ำ (ขายชาเขียวช่วงโปรโมชัน)
:::

ฝึกเพิ่มที่ [แบบฝึกหัด: วิเคราะห์ยอดขายและ Power BI](#/exercises/ex-analytics)
