## สูตรนี้คืออะไร

สร้างยอดขายรายวันที่**ครบทุกวัน** โดยเริ่มจากตาราง `calendar` (มีทุกวัน) แล้ว LEFT JOIN ยอดขายรายวันที่สรุปไว้ วันที่ไม่มีการขายจึงแสดงเป็น 0 แทนที่จะหายไป

**ใช้เมื่อ:** กราฟรายวัน ค่าเฉลี่ยต่อวันที่นับวันที่ไม่มีการขาย หรือก่อนใช้ LAG / ค่าเฉลี่ยเคลื่อนที่

## รูปแบบ (Syntax)

```sql
WITH daily_sales AS (
  SELECT date_col, SUM(amount) AS amount
  FROM fact_table
  GROUP BY date_col
)
SELECT
  c.cal_date,
  COALESCE(d.amount, 0) AS amount
FROM calendar AS c
LEFT JOIN daily_sales AS d ON c.cal_date = d.date_col
WHERE c.cal_date >= DATE'yyyy-MM-dd' AND c.cal_date < DATE'yyyy-MM-dd';
```

## ตัวอย่างข้อมูลต้นทาง

ตาราง `calendar` มีวันที่ 1 ต.ค. 2025 – 31 มี.ค. 2026 ครบ 182 วัน ส่วน `sales` ไม่มีรายการวันที่ 1 ม.ค. 2026 (ร้านปิด)

## SQL Query ฉบับเต็มและผลลัพธ์

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

**ผลลัพธ์** (แสดง 5 จาก 31 แถว)

| cal_date | day_name | line_count | net_sales |
|---|---|---|---|
| 2026-01-01 | Thu | 0 | 0.00 |
| 2026-01-02 | Fri | 3 | 126.00 |
| 2026-01-03 | Sat | 2 | 93.00 |
| 2026-01-04 | Sun | 1 | 14.00 |
| 2026-01-05 | Mon | 4 | 185.00 |

## อธิบายทีละส่วน และลำดับการทำงาน

1. CTE `daily_sales` สรุปให้เหลือ 1 แถวต่อวัน (กัน Fan-out)
2. `calendar` เป็นตารางซ้าย จึงมีครบ 31 วัน
3. `COALESCE` เปลี่ยน NULL ของวันที่ไม่มีการขายเป็น 0
4. กรองช่วงวันที่ที่ `c.cal_date` (ฝั่งซ้าย)

## ข้อผิดพลาดที่พบบ่อย

- เริ่มจาก `sales` แล้วคาดหวังว่าจะได้ทุกวัน
- กรองวันที่ด้วย `d.sale_date` ใน WHERE ทำให้วันที่ไม่มีการขายหายไป
- JOIN รายการขายดิบกับ calendar แล้วค่อย GROUP BY (ได้ผลถูกแต่ COUNT(*) ของวันที่ไม่มีการขายจะได้ 1)

## ข้อควรระวังและกรณีพิเศษ

- ต้องการครบทุกวัน**ทุกสาขา**: `calendar CROSS JOIN stores` ก่อน แล้ว LEFT JOIN ยอดขายด้วยทั้งวันที่และสาขา
- ตาราง calendar ต้องครอบคลุมช่วงที่รายงาน

## วิธีอื่นที่ใช้แทนกันได้

- สร้างวันที่ด้วย `EXPLODE(SEQUENCE(DATE'2026-01-01', DATE'2026-01-31', INTERVAL 1 DAY))` เมื่อไม่มีตาราง calendar

## แบบฝึกหัด

**โจทย์:** เดือนกุมภาพันธ์ 2026 มีกี่วัน กี่วันที่ไม่มีการขาย และยอดรวมเท่าไร

:::answer
```sql {verify}
WITH daily_sales AS (
  SELECT sale_date, SUM(net_amount) AS net_sales
  FROM sales
  GROUP BY sale_date
)
SELECT
  COUNT(*)                         AS calendar_days,
  count_if(d.sale_date IS NULL)    AS days_without_sales,
  COALESCE(SUM(d.net_sales), 0)    AS feb_net
FROM calendar AS c
LEFT JOIN daily_sales AS d
  ON c.cal_date = d.sale_date
WHERE c.cal_date >= DATE'2026-02-01'
  AND c.cal_date <  DATE'2026-03-01';
```

| calendar_days | days_without_sales | feb_net |
|---|---|---|
| 28 | 8 | 2095.00 |

**เหตุผล:** วันที่หาคู่ไม่เจอมี `d.sale_date` เป็น NULL จึงนับได้ด้วย `count_if` เดือนกุมภาพันธ์มี 8 วันที่ไม่มีการขาย ซึ่งช่วยอธิบายว่าทำไมยอดเดือนนี้ต่ำ
:::
