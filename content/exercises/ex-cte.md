## ข้อ 7.1 (ง่าย): เทียบกับค่าเฉลี่ย

**โจทย์:** แสดงรายการขายที่ `net_amount` สูงกว่าค่าเฉลี่ย `net_amount` ของทั้งตาราง (แสดง `sale_id`, `net_amount`) เรียงยอดมากไปน้อย แล้วตาม `sale_id`

:::answer
```sql {verify partial count=47}
SELECT
  sale_id,
  net_amount
FROM sales
WHERE net_amount > (SELECT AVG(net_amount) FROM sales)
ORDER BY net_amount DESC, sale_id;
```

**ผลลัพธ์** (แสดง 8 จาก 47 แถว)

| sale_id | net_amount |
|---|---|
| T0022 | 516.00 |
| T0052 | 445.00 |
| T0058 | 435.00 |
| T0096 | 420.00 |
| T0077 | 356.00 |
| T0012 | 351.00 |
| T0136 | 351.00 |
| T0126 | 295.00 |

**เหตุผล:** Scalar Subquery คำนวณค่าเฉลี่ย (88.53) ครั้งเดียว แล้วนำไปเทียบกับทุกแถว เขียน `WHERE net_amount > AVG(net_amount)` ตรง ๆ ไม่ได้เพราะฟังก์ชันสรุปใช้ใน WHERE ไม่ได้
:::

## ข้อ 7.2 (ปานกลาง): สรุปใน CTE แล้วกรอง

**โจทย์:** ใช้ CTE หายอดขายสุทธิรายเดือน (`month_start`) แล้วแสดงเฉพาะเดือนที่ยอดมากกว่า 3,000 บาท

:::answer
```sql {verify}
WITH monthly AS (
  SELECT
    CAST(DATE_TRUNC('MONTH', sale_date) AS DATE) AS month_start,
    SUM(net_amount)                              AS total_net
  FROM sales
  GROUP BY CAST(DATE_TRUNC('MONTH', sale_date) AS DATE)
)
SELECT
  month_start,
  total_net
FROM monthly
WHERE total_net > 3000
ORDER BY month_start;
```

| month_start | total_net |
|---|---|
| 2026-01-01 | 5302.00 |
| 2026-03-01 | 5086.00 |

**เหตุผล:** เมื่อสรุปใน CTE แล้ว `total_net` กลายเป็นคอลัมน์ธรรมดาของ CTE จึงกรองด้วย `WHERE` ในชั้นนอกได้ (ได้ผลเหมือนใช้ `HAVING` ใน Query เดียว)
:::

## ข้อ 7.3 (ท้าทาย): CTE 3 ขั้น

**โจทย์:** ใช้ CTE 3 ขั้น: (1) `clean_sales` ตัดแถวซ้ำและเก็บ quantity 1–50 (2) สรุปยอดตามหมวดสินค้า (category ที่ NULL ให้เป็น `'Unknown'`) (3) แสดงหมวด ยอด และ % ของยอดรวม เรียงจากมากไปน้อย

:::answer
```sql {verify}
WITH clean_sales AS (
  SELECT DISTINCT *
  FROM sales
  WHERE quantity BETWEEN 1 AND 50
),
category_total AS (
  SELECT
    COALESCE(p.category, 'Unknown') AS category,
    SUM(c.net_amount)               AS category_net
  FROM clean_sales AS c
  LEFT JOIN products AS p
    ON c.product_id = p.product_id
  GROUP BY COALESCE(p.category, 'Unknown')
),
company_total AS (
  SELECT SUM(category_net) AS company_net
  FROM category_total
)
SELECT
  ct.category,
  ct.category_net,
  ROUND(ct.category_net * 100.0 / NULLIF(co.company_net, 0), 1) AS share_pct
FROM category_total AS ct
CROSS JOIN company_total AS co
ORDER BY ct.category_net DESC;
```

| category | category_net | share_pct |
|---|---|---|
| Personal Care | 6124.00 | 50.7 |
| Beverage | 2540.00 | 21.0 |
| Snack | 2325.00 | 19.2 |
| Unknown | 1089.00 | 9.0 |

**เหตุผล:** แต่ละ CTE ทำหน้าที่เดียว อ่านจากบนลงล่างได้ ขั้นที่ 3 ใช้ `CROSS JOIN` นำยอดรวมบริษัท (1 แถว) ไปต่อกับทุกหมวด ถ้าเรียน Window Function แล้ว ใช้ `SUM(category_net) OVER ()` แทน CTE `company_total` ได้ สังเกตว่า Beverage ลดจาก 2,960 เหลือ 2,540 เพราะตัดรายการ 60 ชิ้น (420 บาท) และ Snack เพิ่มจาก 2,310 เป็น 2,325 เพราะตัดแถวซ้ำ (−15) และรายการรับคืน (−30 ถูกตัด จึง +30)
:::
