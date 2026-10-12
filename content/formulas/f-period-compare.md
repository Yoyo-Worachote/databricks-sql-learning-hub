## สูตรนี้คืออะไร

เทียบยอดของ**สองช่วงเวลาที่กำหนด**ในแถวเดียว ด้วย `SUM(CASE WHEN วันที่อยู่ในช่วง THEN ยอด ELSE 0 END)` แยกเป็นสองคอลัมน์ แล้วคำนวณผลต่างและ % เติบโตในชั้นนอก

**ใช้เมื่อ:** เทียบเดือนนี้กับเดือนก่อนรายสาขา ไตรมาสกับไตรมาส ครึ่งปีกับครึ่งปี หรือช่วงโปรโมชันกับช่วงปกติ

## รูปแบบ (Syntax)

```sql
WITH periods AS (
  SELECT
    group_col,
    SUM(CASE WHEN d >= DATE'p1_start' AND d < DATE'p1_end' THEN x ELSE 0 END) AS p1,
    SUM(CASE WHEN d >= DATE'p2_start' AND d < DATE'p2_end' THEN x ELSE 0 END) AS p2
  FROM t
  WHERE d >= DATE'p1_start' AND d < DATE'p2_end'
  GROUP BY group_col
)
SELECT group_col, p1, p2, p2 - p1 AS diff,
       ROUND((p2 - p1) * 100.0 / NULLIF(p1, 0), 1) AS growth_pct
FROM periods;
```

## ตัวอย่างข้อมูลต้นทาง

ตาราง `sales` เดือนกุมภาพันธ์ (30 แถว) และมีนาคม 2026 (51 แถว)

## SQL Query ฉบับเต็มและผลลัพธ์

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

## อธิบายทีละส่วน

- `WHERE` ลดข้อมูลให้เหลือเฉพาะสองเดือนก่อนสรุป
- CASE แต่ละอันรวมเฉพาะแถวในช่วงของตัวเอง
- S05 ไม่มียอดเดือนก่อน % จึงเป็น NULL (ไม่ใช่ 100% และไม่ Error)

## ข้อผิดพลาดที่พบบ่อย

- ช่วงเวลาทับซ้อนกันหรือเว้นช่องว่างโดยไม่ตั้งใจ
- เทียบช่วงที่จำนวนวันต่างกันโดยไม่บอก (ก.พ. 28 วัน มี.ค. 31 วัน)
- ลืม `ELSE 0` ได้ NULL ในสาขาที่ไม่มียอดช่วงใดช่วงหนึ่ง

## ข้อควรระวังและกรณีพิเศษ

- ถ้าต้องการเทียบอย่างยุติธรรม ใช้ยอดเฉลี่ยต่อวัน หรือเทียบช่วงวันที่เดียวกัน (เช่น 1–15 ของทั้งสองเดือน)

## วิธีอื่นที่ใช้แทนกันได้

- สรุปรายเดือนแล้วใช้ LAG ([ดูสูตร MoM](#/formula/f-mom-growth)) เมื่อต้องการเทียบต่อเนื่องหลายเดือน

## แบบฝึกหัด

**โจทย์:** เทียบจำนวนรายการและยอดขายรวมของ Q4-2025 (`sales_archive_2025`) กับ Q1-2026 (`sales`) พร้อม % เติบโตของยอด

:::answer
```sql {verify}
WITH all_sales AS (
  SELECT sale_date, net_amount FROM sales_archive_2025
  UNION ALL
  SELECT sale_date, net_amount FROM sales
),
quarters AS (
  SELECT
    count_if(sale_date < DATE'2026-01-01')  AS q4_lines,
    count_if(sale_date >= DATE'2026-01-01') AS q1_lines,
    SUM(CASE WHEN sale_date <  DATE'2026-01-01' THEN net_amount ELSE 0 END) AS q4_net,
    SUM(CASE WHEN sale_date >= DATE'2026-01-01' THEN net_amount ELSE 0 END) AS q1_net
  FROM all_sales
)
SELECT
  q4_lines,
  q1_lines,
  q4_net,
  q1_net,
  ROUND((q1_net - q4_net) * 100.0 / NULLIF(q4_net, 0), 1) AS growth_pct
FROM quarters;
```

| q4_lines | q1_lines | q4_net | q1_net | growth_pct |
|---|---|---|---|---|
| 50 | 141 | 3631.00 | 12483.00 | 243.8 |

**เหตุผล:** รวมสองตารางด้วย UNION ALL แล้วแยกช่วงด้วยเงื่อนไขวันที่ ยอดเติบโตสูงมากส่วนหนึ่งเพราะจำนวนรายการต่างกันเกือบ 3 เท่า ควรตรวจว่าข้อมูล archive ครบหรือไม่ก่อนสรุป
:::
