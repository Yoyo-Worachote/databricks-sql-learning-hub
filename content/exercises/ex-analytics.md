## ข้อ 10.1 (ง่าย): กำไรขั้นต้นรายสาขา

**โจทย์:** หายอด Net Sales, COGS และ Gross Profit รวมของแต่ละสาขา (ใช้ INNER JOIN กับ `products`) เรียงตามกำไรมากไปน้อย

:::answer
```sql {verify}
SELECT
  s.store_id,
  SUM(s.net_amount)                                 AS net_sales,
  SUM(s.quantity * p.unit_cost)                     AS cogs,
  SUM(s.net_amount) - SUM(s.quantity * p.unit_cost) AS gross_profit
FROM sales AS s
INNER JOIN products AS p
  ON s.product_id = p.product_id
GROUP BY s.store_id
ORDER BY gross_profit DESC;
```

| store_id | net_sales | cogs | gross_profit |
|---|---|---|---|
| S01 | 4348.00 | 2690.50 | 1657.50 |
| S02 | 3230.00 | 2010.00 | 1220.00 |
| S04 | 2348.00 | 1448.00 | 900.00 |
| S03 | 1624.00 | 1006.50 | 617.50 |
| S05 | 663.00 | 409.00 | 254.00 |

**เหตุผล:** ต้นทุนอยู่ในตาราง `products` จึงต้อง JOIN และคูณจำนวนกับต้นทุนต่อชิ้นทีละแถวก่อน `SUM` สังเกตว่า Net Sales ของ S04 เหลือ 2,348 (จากยอดจริง 2,618) เพราะ INNER JOIN ตัดรายการ P099 (270 บาท) ออก ต้องระบุในรายงาน
:::

## ข้อ 10.2 (ปานกลาง): Monthly Summary ระดับภูมิภาค

**โจทย์:** สร้าง Monthly Summary ระดับภูมิภาค (Grain: เดือน × ภูมิภาค) มี `month_start` (DATE), `region`, `net_sales`, `units`

:::answer
```sql {verify partial count=10}
-- Grain: 1 แถว = 1 เดือน x 1 ภูมิภาค
SELECT
  CAST(DATE_TRUNC('MONTH', s.sale_date) AS DATE) AS month_start,
  st.region,
  SUM(s.net_amount)                              AS net_sales,
  SUM(s.quantity)                                AS units
FROM sales AS s
LEFT JOIN stores AS st
  ON s.store_id = st.store_id
GROUP BY CAST(DATE_TRUNC('MONTH', s.sale_date) AS DATE), st.region
ORDER BY month_start, st.region;
```

**ผลลัพธ์** (แสดง 8 จาก 10 แถว)

| month_start | region | net_sales | units |
|---|---|---|---|
| 2026-01-01 | Bangkok | 3708.00 | 104 |
| 2026-01-01 | North | 451.00 | 26 |
| 2026-01-01 | Northeast | 1143.00 | 36 |
| 2026-02-01 | Bangkok | 837.00 | 27 |
| 2026-02-01 | North | 755.00 | 20 |
| 2026-02-01 | Northeast | 503.00 | 24 |
| 2026-03-01 | Bangkok | 3033.00 | 135 |
| 2026-03-01 | North | 418.00 | 21 |

**เหตุผล:** ระบุ Grain ไว้ใน Comment ใช้ LEFT JOIN กับ `stores` ซึ่ง Key ไม่ซ้ำ จึงไม่ทำให้แถวเพิ่ม ภูมิภาค South มีเฉพาะเดือนมีนาคม (สาขาภูเก็ตเพิ่งเปิด) จึงได้ 10 แถว ไม่ใช่ 12
:::

## ข้อ 10.3 (ท้าทาย): เทียบครึ่งเดือนแรกกับครึ่งหลัง

**โจทย์:** เปรียบเทียบยอดขายของ "ครึ่งแรกของเดือน" (วันที่ 1–15) กับ "ครึ่งหลัง" (16 ถึงสิ้นเดือน) ในแต่ละเดือนของ Q1 2026 ให้ได้ 1 แถวต่อเดือน

:::answer
```sql {verify}
SELECT
  CAST(DATE_TRUNC('MONTH', sale_date) AS DATE)                         AS month_start,
  SUM(CASE WHEN DAYOFMONTH(sale_date) <= 15 THEN net_amount ELSE 0 END) AS first_half_net,
  SUM(CASE WHEN DAYOFMONTH(sale_date) > 15  THEN net_amount ELSE 0 END) AS second_half_net
FROM sales
WHERE sale_date >= DATE'2026-01-01'
  AND sale_date <  DATE'2026-04-01'
GROUP BY CAST(DATE_TRUNC('MONTH', sale_date) AS DATE)
ORDER BY month_start;
```

| month_start | first_half_net | second_half_net |
|---|---|---|
| 2026-01-01 | 2705.00 | 2597.00 |
| 2026-02-01 | 1595.00 | 500.00 |
| 2026-03-01 | 2555.00 | 2531.00 |

**เหตุผล:** `SUM(CASE WHEN ...)` แยกยอดตามเงื่อนไขเป็น 2 คอลัมน์ในแถวเดียวกัน (Pivot แบบง่าย) ตรวจได้ว่าผลรวมสองคอลัมน์ = ยอดรายเดือน เช่น มกราคม 2,705 + 2,597 = 5,302 ข้อสังเกต: ครึ่งหลังของเดือนอาจมีจำนวนวันไม่เท่าครึ่งแรก (13–16 วัน) ถ้าต้องการเทียบอย่างยุติธรรมควรดูยอดเฉลี่ยต่อวัน
:::
