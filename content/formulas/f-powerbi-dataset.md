## สูตรนี้คืออะไร

เตรียม Dataset ที่สรุปตาม **Grain** (ความหมายของ 1 แถว) ที่ชัดเจน สำหรับส่งเข้า Power BI หรือ Excel

**หลักการ**

1. เขียน Grain เป็น Comment ก่อน เช่น `-- Grain: 1 แถว = 1 เดือน x 1 ภูมิภาค`
2. GROUP BY ให้ตรง Grain
3. JOIN เฉพาะ Dimension ที่ Key ไม่ซ้ำ (หรือสรุปตารางที่ Key ซ้ำก่อน)
4. ส่งคอลัมน์**ผลรวม** (net_sales, cogs, units) แล้วคำนวณอัตราส่วนเป็น Measure ใน Power BI
5. คอลัมน์วันที่เป็นชนิด DATE ตั้งชื่อคอลัมน์ให้อ่านเข้าใจ ไม่ใส่ ORDER BY / LIMIT ตอนใช้งานจริง

## รูปแบบ (Syntax)

```sql
-- Grain: 1 แถว = 1 เดือน x 1 ภูมิภาค
SELECT
  CAST(DATE_TRUNC('MONTH', f.date_col) AS DATE) AS month_start,
  d.region,
  SUM(f.amount)                                 AS net_sales
FROM fact AS f
LEFT JOIN dim AS d ON f.key = d.key
GROUP BY CAST(DATE_TRUNC('MONTH', f.date_col) AS DATE), d.region;
```

## ตัวอย่างข้อมูลต้นทาง

`sales` (Fact) + `products` (Dimension: category, unit_cost) + `stores` (Dimension: region)

## SQL Query ฉบับเต็มและผลลัพธ์

```sql {verify}
-- Grain: 1 แถว = 1 เดือน x 1 ภูมิภาค
SELECT
  CAST(DATE_TRUNC('MONTH', s.sale_date) AS DATE) AS month_start,
  st.region,
  COUNT(*)                                       AS line_count,
  SUM(s.quantity)                                AS units,
  SUM(s.net_amount)                              AS net_sales,
  SUM(s.quantity * p.unit_cost)                  AS cogs
FROM sales AS s
LEFT JOIN products AS p  ON s.product_id = p.product_id
LEFT JOIN stores   AS st ON s.store_id   = st.store_id
GROUP BY CAST(DATE_TRUNC('MONTH', s.sale_date) AS DATE), st.region
ORDER BY month_start, st.region;
```

| month_start | region | line_count | units | net_sales | cogs |
|---|---|---|---|---|---|
| 2026-01-01 | Bangkok | 40 | 104 | 3708.00 | 2271.50 |
| 2026-01-01 | North | 10 | 26 | 451.00 | 268.00 |
| 2026-01-01 | Northeast | 10 | 36 | 1143.00 | 540.00 |
| 2026-02-01 | Bangkok | 16 | 27 | 837.00 | 536.50 |
| 2026-02-01 | North | 7 | 20 | 755.00 | 471.00 |
| 2026-02-01 | Northeast | 7 | 24 | 503.00 | 328.00 |
| 2026-03-01 | Bangkok | 28 | 135 | 3033.00 | 1892.50 |
| 2026-03-01 | North | 6 | 21 | 418.00 | 267.50 |
| 2026-03-01 | Northeast | 10 | 29 | 972.00 | 580.00 |
| 2026-03-01 | South | 7 | 22 | 663.00 | 409.00 |

## อธิบายทีละส่วน

- 1 แถว = 1 เดือน × 1 ภูมิภาค ผู้ใช้ Power BI รวมเป็นรายไตรมาสหรือทั้งประเทศได้เอง
- COGS ของ Northeast เดือนมกราคมไม่รวมรายการ P099 (ไม่รู้ต้นทุน) ต้องระบุในหมายเหตุของรายงาน
- ORDER BY ใส่ไว้เพื่อตรวจ ตอนส่งเข้า Power BI ให้ลบออก

## ข้อผิดพลาดที่พบบ่อย

- ส่ง `SELECT *` ข้อมูลรายการทั้งหมด ทำให้ Refresh ช้า
- Grain ปนกัน (บางแถวรายวัน บางแถวยอดรวม)
- ส่งคอลัมน์ % แล้วผู้ใช้ SUM ใน Power BI
- Hard-code ช่วงวันที่ใน View โดยไม่บอกผู้ใช้

## ข้อควรระวังและกรณีพิเศษ

- ตรวจผลรวมของ Dataset เทียบกับตารางต้นทางทุกครั้ง ([ดูสูตร](#/formula/f-reconciliation))
- สร้างเป็น View ได้เมื่อมีสิทธิ์ เช่น `CREATE OR REPLACE VIEW sql_training.v_sales_monthly_region AS ...` (เฉพาะใน Schema ที่ได้รับอนุญาต)

## วิธีอื่นที่ใช้แทนกันได้

- Grain รายวัน × สาขา × หมวด ([ดูบทที่ 20](#/lesson/business-analytics)) เมื่อผู้ใช้ต้องเจาะลึกถึงรายวัน

## แบบฝึกหัด

**โจทย์:** ตรวจว่าผลรวม `net_sales` และ `line_count` ของ Dataset ด้านบนเท่ากับตาราง `sales`

:::answer
```sql {verify}
WITH dataset AS (
  SELECT
    CAST(DATE_TRUNC('MONTH', s.sale_date) AS DATE) AS month_start,
    st.region,
    COUNT(*)          AS line_count,
    SUM(s.net_amount) AS net_sales
  FROM sales AS s
  LEFT JOIN stores AS st ON s.store_id = st.store_id
  GROUP BY CAST(DATE_TRUNC('MONTH', s.sale_date) AS DATE), st.region
)
SELECT
  SUM(line_count) AS dataset_lines,
  SUM(net_sales)  AS dataset_net,
  (SELECT COUNT(*) FROM sales)        AS source_lines,
  (SELECT SUM(net_amount) FROM sales) AS source_net
FROM dataset;
```

| dataset_lines | dataset_net | source_lines | source_net |
|---|---|---|---|
| 141 | 12483.00 | 141 | 12483.00 |

**เหตุผล:** ตัวเลขตรงกัน แปลว่าการสรุปและ JOIN ไม่ทำให้ข้อมูลหายหรือซ้ำ
:::
