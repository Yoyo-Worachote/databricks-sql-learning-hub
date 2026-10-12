## สูตรนี้คืออะไร

**MoM (Month over Month)** เทียบยอดเดือนนี้กับเดือนก่อน: สรุปรายเดือนใน CTE → ใช้ `LAG` ดึงยอดเดือนก่อน → คำนวณผลต่างและ % เติบโต

% เติบโต = (เดือนนี้ − เดือนก่อน) × 100.0 ÷ NULLIF(เดือนก่อน, 0)

## รูปแบบ (Syntax)

```sql
WITH monthly AS (
  SELECT CAST(DATE_TRUNC('MONTH', d) AS DATE) AS month_start, SUM(x) AS total
  FROM t
  GROUP BY 1
),
with_prev AS (
  SELECT month_start, total, LAG(total) OVER (ORDER BY month_start) AS prev_total
  FROM monthly
)
SELECT
  month_start, total, prev_total,
  ROUND((total - prev_total) * 100.0 / NULLIF(prev_total, 0), 1) AS mom_pct
FROM with_prev;
```

## ตัวอย่างข้อมูลต้นทาง

`sales_archive_2025` (ต.ค.–ธ.ค. 2025) และ `sales` (ม.ค.–มี.ค. 2026) รวมกันเป็น 6 เดือน

## SQL Query ฉบับเต็มและผลลัพธ์

```sql {verify}
WITH all_sales AS (
  SELECT sale_date, net_amount FROM sales_archive_2025
  UNION ALL
  SELECT sale_date, net_amount FROM sales
),
monthly AS (
  SELECT
    CAST(DATE_TRUNC('MONTH', sale_date) AS DATE) AS month_start,
    SUM(net_amount)                              AS total_net
  FROM all_sales
  GROUP BY CAST(DATE_TRUNC('MONTH', sale_date) AS DATE)
),
with_prev AS (
  SELECT
    month_start,
    total_net,
    LAG(total_net) OVER (ORDER BY month_start) AS prev_month_net
  FROM monthly
)
SELECT
  month_start,
  total_net,
  prev_month_net,
  total_net - prev_month_net                                                 AS diff_mom,
  ROUND((total_net - prev_month_net) * 100.0 / NULLIF(prev_month_net, 0), 1) AS mom_growth_pct
FROM with_prev
ORDER BY month_start;
```

| month_start | total_net | prev_month_net | diff_mom | mom_growth_pct |
|---|---|---|---|---|
| 2025-10-01 | 1090.00 | NULL | NULL | NULL |
| 2025-11-01 | 1336.00 | 1090.00 | 246.00 | 22.6 |
| 2025-12-01 | 1205.00 | 1336.00 | -131.00 | -9.8 |
| 2026-01-01 | 5302.00 | 1205.00 | 4097.00 | 340.0 |
| 2026-02-01 | 2095.00 | 5302.00 | -3207.00 | -60.5 |
| 2026-03-01 | 5086.00 | 2095.00 | 2991.00 | 142.8 |

## อธิบายทีละส่วน

- คำนวณ LAG ครั้งเดียวใน `with_prev` แล้วใช้ซ้ำ อ่านง่ายกว่าเขียน LAG หลายรอบ
- เดือนแรกไม่มีเดือนก่อน จึงเป็น NULL
- พ.ย.: (1,336 − 1,090) × 100 ÷ 1,090 = 22.6%

## ข้อผิดพลาดที่พบบ่อย

- กรองช่วงเดือนใน WHERE ชั้นเดียวกับ LAG ทำให้เดือนแรกในช่วงไม่มีค่าเดือนก่อน
- ไม่กันหารศูนย์ เมื่อเดือนก่อนมียอด 0
- มีเดือนขาดหาย ทำให้ LAG เทียบผิดเดือน

## ข้อควรระวังและกรณีพิเศษ

- % ที่สูงมาก (เช่น 340%) ให้ตรวจว่าข้อมูลสองช่วงมาจากแหล่งเดียวกันและครบเหมือนกัน
- เดือนที่ยังไม่จบไม่ควรเทียบกับเดือนก่อนทั้งเดือน

## วิธีอื่นที่ใช้แทนกันได้

- Self Join ที่ `prev.month_start = ADD_MONTHS(cur.month_start, -1)` ปลอดภัยเมื่อเดือนขาดหาย ([ดูสูตร YoY](#/formula/f-yoy-comparison))

## แบบฝึกหัด

**โจทย์:** คำนวณ % เติบโต MoM ของสาขา S01 (ม.ค.–มี.ค. 2026)

:::answer
```sql {verify}
WITH monthly AS (
  SELECT
    CAST(DATE_TRUNC('MONTH', sale_date) AS DATE) AS month_start,
    SUM(net_amount)                              AS total_net
  FROM sales
  WHERE store_id = 'S01'
  GROUP BY CAST(DATE_TRUNC('MONTH', sale_date) AS DATE)
),
with_prev AS (
  SELECT
    month_start,
    total_net,
    LAG(total_net) OVER (ORDER BY month_start) AS prev_month_net
  FROM monthly
)
SELECT
  month_start,
  total_net,
  prev_month_net,
  ROUND((total_net - prev_month_net) * 100.0 / NULLIF(prev_month_net, 0), 1) AS mom_growth_pct
FROM with_prev
ORDER BY month_start;
```

| month_start | total_net | prev_month_net | mom_growth_pct |
|---|---|---|---|
| 2026-01-01 | 2480.00 | NULL | NULL |
| 2026-02-01 | 583.00 | 2480.00 | -76.5 |
| 2026-03-01 | 1285.00 | 583.00 | 120.4 |

**เหตุผล:** กรองสาขาใน WHERE ได้ เพราะไม่ได้ตัดเดือนก่อนหน้าออก (ตัดเฉพาะสาขาอื่น)
:::
