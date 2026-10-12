## สูตรนี้คืออะไร

**YoY (Year over Year)** เทียบยอดของเดือนนี้กับเดือนเดียวกันของปีก่อน วิธีที่แนะนำคือ **Self Join** ที่ `prev.month_start = ADD_MONTHS(cur.month_start, -12)` ซึ่งจับคู่ตามวันที่ จึงถูกต้องแม้บางเดือนขาดหาย

## รูปแบบ (Syntax)

```sql
SELECT
  cur.month_start,
  cur.net_sales,
  prev.net_sales AS last_year_sales,
  ROUND((cur.net_sales - prev.net_sales) * 100.0 / NULLIF(prev.net_sales, 0), 1) AS yoy_pct
FROM monthly_table AS cur
LEFT JOIN monthly_table AS prev
  ON prev.month_start = ADD_MONTHS(cur.month_start, -12);
```

## ตัวอย่างข้อมูลต้นทาง

ตาราง `monthly_sales` (ตารางเสริม ยอดรวมรายเดือนของบริษัทสมมติ ม.ค. 2024 – มิ.ย. 2025)

<!-- verify: SELECT month_start, net_sales FROM monthly_sales WHERE month_start IN (DATE'2024-01-01', DATE'2024-02-01', DATE'2025-01-01', DATE'2025-02-01') ORDER BY month_start -->
| month_start | net_sales |
|---|---|
| 2024-01-01 | 120000.00 |
| 2024-02-01 | 112000.00 |
| 2025-01-01 | 132000.00 |
| 2025-02-01 | 118000.00 |

## SQL Query ฉบับเต็มและผลลัพธ์

```sql {verify}
SELECT
  cur.month_start,
  cur.net_sales,
  prev.net_sales                 AS last_year_sales,
  cur.net_sales - prev.net_sales AS diff_yoy,
  ROUND((cur.net_sales - prev.net_sales) * 100.0 / NULLIF(prev.net_sales, 0), 1) AS yoy_growth_pct
FROM monthly_sales AS cur
LEFT JOIN monthly_sales AS prev
  ON prev.month_start = ADD_MONTHS(cur.month_start, -12)
WHERE cur.month_start >= DATE'2025-01-01'
ORDER BY cur.month_start;
```

| month_start | net_sales | last_year_sales | diff_yoy | yoy_growth_pct |
|---|---|---|---|---|
| 2025-01-01 | 132000.00 | 120000.00 | 12000.00 | 10.0 |
| 2025-02-01 | 118000.00 | 112000.00 | 6000.00 | 5.4 |
| 2025-03-01 | 120000.00 | 125000.00 | -5000.00 | -4.0 |
| 2025-04-01 | 125000.00 | 118000.00 | 7000.00 | 5.9 |
| 2025-05-01 | 133000.00 | 121000.00 | 12000.00 | 9.9 |
| 2025-06-01 | 127000.00 | 116000.00 | 11000.00 | 9.5 |

## อธิบายทีละส่วน และลำดับการทำงาน

- ตารางเดียวกันถูกใช้ 2 บทบาท: `cur` (ปีนี้) และ `prev` (ปีก่อน)
- JOIN จับคู่ 2025-01-01 กับ 2024-01-01 ตามวันที่ ไม่ใช่ตามตำแหน่งแถว
- `WHERE` กรองเฉพาะฝั่ง `cur` ฝั่ง `prev` ยังเข้าถึงข้อมูลปี 2024 ได้ผ่านเงื่อนไข JOIN
- ม.ค.: (132,000 − 120,000) × 100 ÷ 120,000 = 10.0%

## ข้อผิดพลาดที่พบบ่อย

**ใช้ LAG(…, 12) แล้วกรองในชั้นเดียวกัน**

```sql {verify}
SELECT
  month_start,
  net_sales,
  LAG(net_sales, 12) OVER (ORDER BY month_start) AS last_year_sales
FROM monthly_sales
WHERE month_start >= DATE'2025-01-01'
ORDER BY month_start;
```

| month_start | net_sales | last_year_sales |
|---|---|---|
| 2025-01-01 | 132000.00 | NULL |
| 2025-02-01 | 118000.00 | NULL |
| 2025-03-01 | 120000.00 | NULL |
| 2025-04-01 | 125000.00 | NULL |
| 2025-05-01 | 133000.00 | NULL |
| 2025-06-01 | 127000.00 | NULL |

NULL ทุกแถว เพราะ WHERE ตัดปี 2024 ทิ้งก่อน LAG ทำงาน และ LAG(…, 12) นับ "12 แถว" ไม่ใช่ "12 เดือน" ถ้าเดือนขาดหายจะเทียบผิดเดือน

## ข้อควรระวังและกรณีพิเศษ

- ถ้าข้อมูลเป็นรายการขาย ให้สรุปเป็นรายเดือน (ต่อสาขา) ใน CTE ก่อน แล้วจึง Self Join ด้วยเดือน (และสาขา)
- ปีก่อนไม่มีข้อมูล (สาขาใหม่) → `last_year_sales` เป็น NULL และ % เป็น NULL ซึ่งถูกต้อง
- ปีอธิกสุรทิน: `ADD_MONTHS` จัดการวันสิ้นเดือนให้อัตโนมัติ

## วิธีอื่นที่ใช้แทนกันได้

- `LAG(net_sales, 12)` ใน CTE กับข้อมูลทั้งหมด แล้วกรองชั้นนอก (ใช้ได้เฉพาะเมื่อมั่นใจว่าทุกเดือนมีข้อมูล)
- เทียบยอดสะสมทั้งช่วง (YTD vs YTD ปีก่อน) ด้วย `SUM(CASE WHEN ...)` ([ดูสูตร](#/formula/f-period-compare))

## แบบฝึกหัด

**โจทย์:** แสดง YoY ของเดือน เม.ย.–มิ.ย. 2025 และติดธง `'Strong'` เมื่อเติบโตเกิน 8%

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

**เหตุผล:** ติดธงจากค่าก่อนปัดเศษ เพื่อไม่ให้การปัดเปลี่ยนผลการตัดสิน
:::
