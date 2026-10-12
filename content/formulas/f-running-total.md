## สูตรนี้คืออะไร

**ยอดสะสม (Running Total / Cumulative Sum)** คือผลรวมตั้งแต่แถวแรกจนถึงแถวปัจจุบันตามลำดับที่กำหนด ใช้ `SUM(...) OVER (ORDER BY ...)` เป็น Window Function จึงไม่ยุบแถว

**ใช้เมื่อ:** ยอดสะสมตั้งแต่ต้นเดือน (MTD) ต้นปี (YTD) กราฟยอดสะสมเทียบเป้าหมาย

## รูปแบบ (Syntax)

```sql
SELECT
  order_col,
  value_col,
  SUM(value_col) OVER (
    PARTITION BY group_col       -- ถ้าต้องการเริ่มนับใหม่ในแต่ละกลุ่ม
    ORDER BY order_col, tie_breaker
  ) AS running_total
FROM table_name;
```

## ตัวอย่างข้อมูลต้นทาง

<!-- verify: SELECT sale_id, sale_date, net_amount FROM sales WHERE store_id = 'S05' ORDER BY sale_date, sale_id -->
| sale_id | sale_date | net_amount |
|---|---|---|
| T0093 | 2026-03-02 | 51.00 |
| T0105 | 2026-03-04 | 90.00 |
| T0114 | 2026-03-10 | 79.00 |
| T0122 | 2026-03-20 | 118.00 |
| T0125 | 2026-03-22 | 150.00 |
| T0132 | 2026-03-26 | 85.00 |
| T0133 | 2026-03-28 | 90.00 |

## SQL Query ฉบับเต็มและผลลัพธ์

```sql {verify}
SELECT
  sale_id,
  sale_date,
  net_amount,
  SUM(net_amount) OVER (ORDER BY sale_date, sale_id) AS running_net
FROM sales
WHERE store_id = 'S05'
ORDER BY sale_date, sale_id;
```

| sale_id | sale_date | net_amount | running_net |
|---|---|---|---|
| T0093 | 2026-03-02 | 51.00 | 51.00 |
| T0105 | 2026-03-04 | 90.00 | 141.00 |
| T0114 | 2026-03-10 | 79.00 | 220.00 |
| T0122 | 2026-03-20 | 118.00 | 338.00 |
| T0125 | 2026-03-22 | 150.00 | 488.00 |
| T0132 | 2026-03-26 | 85.00 | 573.00 |
| T0133 | 2026-03-28 | 90.00 | 663.00 |

## อธิบายทีละส่วน และลำดับการทำงาน

- `WHERE` เหลือ 7 แถวของ S05 ก่อน แล้วจึงคำนวณ Window Function (ที่ขั้น SELECT)
- แถวที่ 3: 51 + 90 + 79 = 220 แถวสุดท้าย = ยอดรวมสาขา 663
- `sale_id` ใน `ORDER BY` ของ OVER เป็นตัวตัดสินเมื่อวันเดียวกันมีหลายรายการ

## ข้อผิดพลาดที่พบบ่อย

- สับสน `SUM() OVER (ORDER BY ...)` (ยอดสะสม) กับ `SUM() OVER ()` (ยอดรวมทั้งหมดทุกแถว)
- ลืม `PARTITION BY` ยอดสะสมจึงต่อกันข้ามสาขา/ข้ามปี
- ลำดับซ้ำโดยไม่มีตัวตัดสิน: ค่าเริ่มต้นของ Frame เป็นแบบ RANGE แถวที่ค่า ORDER BY เท่ากันจะได้ยอดสะสมเท่ากัน (รวมพร้อมกัน)

## ข้อควรระวังและกรณีพิเศษ

- ถ้าต้องการสะสมทีละแถวแน่นอน ให้ระบุ `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`
- YTD ต้อง `PARTITION BY YEAR(date)` เพื่อเริ่มใหม่ทุกปี
- `ORDER BY` ใน OVER ไม่ได้เรียงผลลัพธ์ ต้องใส่ `ORDER BY` ท้าย Query ด้วย

## วิธีอื่นที่ใช้แทนกันได้

- Self Join หรือ Correlated Subquery (ช้าและยาวกว่ามาก ไม่แนะนำ)

## แบบฝึกหัด

**โจทย์:** ยอดขายรายเดือนของปี 2025 จากตาราง `monthly_sales` พร้อมยอดสะสมตั้งแต่ต้นปี

:::answer
```sql {verify}
WITH ytd AS (
  SELECT
    month_start,
    net_sales,
    SUM(net_sales) OVER (PARTITION BY YEAR(month_start) ORDER BY month_start) AS ytd_sales
  FROM monthly_sales
)
SELECT month_start, net_sales, ytd_sales
FROM ytd
WHERE month_start >= DATE'2025-01-01'
ORDER BY month_start;
```

| month_start | net_sales | ytd_sales |
|---|---|---|
| 2025-01-01 | 132000.00 | 132000.00 |
| 2025-02-01 | 118000.00 | 250000.00 |
| 2025-03-01 | 120000.00 | 370000.00 |
| 2025-04-01 | 125000.00 | 495000.00 |
| 2025-05-01 | 133000.00 | 628000.00 |
| 2025-06-01 | 127000.00 | 755000.00 |

**เหตุผล:** `PARTITION BY YEAR(...)` เริ่มยอดสะสมใหม่ทุกปี
:::
