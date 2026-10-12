## สูตรนี้คืออะไร

**ค่าเฉลี่ยเคลื่อนที่ (Moving Average)** เฉลี่ยแถวปัจจุบันกับแถวก่อนหน้าจำนวนหนึ่ง ช่วยเกลี่ยกราฟที่ขึ้นลงแรงให้เห็นแนวโน้ม

```sql
AVG(value) OVER (ORDER BY date_col ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)
```

= เฉลี่ย 3 แถว (2 แถวก่อนหน้า + แถวปัจจุบัน)

## รูปแบบ (Syntax)

```sql
SELECT
  date_col,
  value_col,
  AVG(value_col) OVER (
    PARTITION BY group_col
    ORDER BY date_col
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
  ) AS moving_avg_3
FROM table_name;
```

## ตัวอย่างข้อมูลต้นทาง

ยอดขายรายเดือน 6 เดือน (รวม `sales_archive_2025` และ `sales`): 1,090 / 1,336 / 1,205 / 5,302 / 2,095 / 5,086

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
)
SELECT
  month_start,
  total_net,
  ROUND(AVG(total_net) OVER (
          ORDER BY month_start
          ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
        ), 2) AS avg_3_months
FROM monthly
ORDER BY month_start;
```

| month_start | total_net | avg_3_months |
|---|---|---|
| 2025-10-01 | 1090.00 | 1090.00 |
| 2025-11-01 | 1336.00 | 1213.00 |
| 2025-12-01 | 1205.00 | 1210.33 |
| 2026-01-01 | 5302.00 | 2614.33 |
| 2026-02-01 | 2095.00 | 2867.33 |
| 2026-03-01 | 5086.00 | 4161.00 |

## อธิบายทีละส่วน

- แถว 2026-01: (1,336 + 1,205 + 5,302) ÷ 3 = 2,614.33
- สองแถวแรกมีแถวก่อนหน้าไม่ครบ จึงเฉลี่ยเท่าที่มี (แถว 2025-11 = (1,090 + 1,336) ÷ 2)

## ข้อผิดพลาดที่พบบ่อย

- ใช้กับข้อมูลที่มีวัน/เดือนขาดหาย: `ROWS` นับแถว ไม่ใช่วันตามปฏิทิน ต้องเติมช่วงเวลาให้ครบก่อน ([ดูสูตร](#/formula/f-daily-sales-calendar))
- ลืม `ORDER BY` ใน OVER

## ข้อควรระวังและกรณีพิเศษ

- ช่วงต้นที่แถวไม่ครบอาจทำให้เข้าใจผิด ถ้าต้องการแสดงเฉพาะเมื่อครบ 3 แถว ให้ใช้ `COUNT(*) OVER (... ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) = 3` เป็นเงื่อนไข
- `RANGE BETWEEN INTERVAL 2 DAYS PRECEDING AND CURRENT ROW` (Databricks) นับตามค่าของวันที่จริง ใช้ได้เมื่อ ORDER BY เป็นวันที่

## วิธีอื่นที่ใช้แทนกันได้

- คำนวณใน Power BI ด้วย Measure ถ้าผู้ใช้ต้องเปลี่ยนช่วงเฉลี่ยเอง

## แบบฝึกหัด

**โจทย์:** ยอดขายรายวันวันที่ 1–7 มี.ค. 2026 พร้อมค่าเฉลี่ยเคลื่อนที่ 3 แถว

:::answer
```sql {verify}
WITH daily AS (
  SELECT sale_date, SUM(net_amount) AS day_net
  FROM sales
  WHERE sale_date >= DATE'2026-03-01'
    AND sale_date <  DATE'2026-03-08'
  GROUP BY sale_date
)
SELECT
  sale_date,
  day_net,
  ROUND(AVG(day_net) OVER (ORDER BY sale_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS avg_3_rows
FROM daily
ORDER BY sale_date;
```

| sale_date | day_net | avg_3_rows |
|---|---|---|
| 2026-03-01 | 216.00 | 216.00 |
| 2026-03-02 | 803.00 | 509.50 |
| 2026-03-03 | 249.00 | 422.67 |
| 2026-03-04 | 186.00 | 412.67 |
| 2026-03-05 | 14.00 | 149.67 |
| 2026-03-06 | 267.00 | 155.67 |

**เหตุผล:** สรุปเป็นรายวันใน CTE ก่อน แล้วเฉลี่ยข้ามแถว วันที่ 7 มี.ค. ไม่มีการขายจึงไม่มีแถว
:::
