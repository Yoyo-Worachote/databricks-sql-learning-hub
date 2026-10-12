## สูตรนี้คืออะไร

`SUM(CASE WHEN เงื่อนไข THEN ค่า ELSE 0 END)` รวมเฉพาะแถวที่ตรงเงื่อนไข ใช้แยกยอดเป็น**หลายคอลัมน์ในแถวเดียว** (Pivot แบบง่าย)

**ใช้เมื่อ:** แยกยอดเงินสด/ดิจิทัล แยกยอดสองช่วงเวลา หรือหาสัดส่วนของส่วนย่อยต่อยอดรวม

## รูปแบบ (Syntax)

```sql
SELECT
  group_col,
  SUM(CASE WHEN condition_a THEN amount ELSE 0 END) AS amount_a,
  SUM(CASE WHEN condition_b THEN amount ELSE 0 END) AS amount_b,
  count_if(condition_a)                             AS count_a
FROM table_name
GROUP BY group_col;
```

## ตัวอย่างข้อมูลต้นทาง

ตาราง `sales` แต่ละแถวมี `payment_method` (Cash / Credit Card / QR Payment) และ `net_amount`

## SQL Query ฉบับเต็มและผลลัพธ์

```sql {verify}
SELECT
  CAST(DATE_TRUNC('MONTH', sale_date) AS DATE)                      AS month_start,
  SUM(CASE WHEN payment_method = 'Cash'  THEN net_amount ELSE 0 END) AS cash_net,
  SUM(CASE WHEN payment_method <> 'Cash' THEN net_amount ELSE 0 END) AS digital_net,
  count_if(payment_method = 'Cash')                                 AS cash_lines
FROM sales
GROUP BY CAST(DATE_TRUNC('MONTH', sale_date) AS DATE)
ORDER BY month_start;
```

| month_start | cash_net | digital_net | cash_lines |
|---|---|---|---|
| 2026-01-01 | 1072.00 | 4230.00 | 15 |
| 2026-02-01 | 821.00 | 1274.00 | 11 |
| 2026-03-01 | 2412.00 | 2674.00 | 25 |

## อธิบายทีละส่วน

- แต่ละแถวดิบ `CASE` คืนยอดเงินถ้าตรงเงื่อนไข ไม่เช่นนั้นคืน 0 แล้ว `SUM` รวม
- `count_if(...)` (Databricks) นับแถวที่เงื่อนไขจริง = `SUM(CASE WHEN ... THEN 1 ELSE 0 END)`
- **ตรวจ:** cash + digital = ยอดรายเดือน เช่น ม.ค. 1,072 + 4,230 = 5,302

## ข้อผิดพลาดที่พบบ่อย

- ลืม `ELSE 0` ได้ NULL เมื่อกลุ่มไม่มีแถวที่ตรงเงื่อนไขเลย
- เงื่อนไขสองคอลัมน์ทับซ้อนกัน ทำให้ผลรวมเกินยอดจริง
- ใช้ `<>` กับคอลัมน์ที่มี NULL: แถว NULL ไม่ถูกนับในกลุ่มใดเลย (`payment_method` ในชุดนี้ไม่มี NULL)

## ข้อควรระวังและกรณีพิเศษ

- ถ้าต้องการให้กลุ่มที่ไม่มีข้อมูลแสดงเป็น NULL (ไม่ใช่ 0) ให้ตัด `ELSE 0` ออก แล้วตัดสินใจตามความหมายทางธุรกิจ

## วิธีอื่นที่ใช้แทนกันได้

- `PIVOT` ของ Databricks: `SELECT * FROM (...) PIVOT (SUM(net_amount) FOR payment_method IN ('Cash', 'QR Payment'))` เหมาะเมื่อคอลัมน์มีหลายค่า
- `SUM(net_amount) FILTER (WHERE payment_method = 'Cash')`

## แบบฝึกหัด

**โจทย์:** ของแต่ละวิธีชำระเงิน หาจำนวนรายการ จำนวนรายการที่มีส่วนลด (มากกว่า 0) และ % รายการที่มีส่วนลด

:::answer
```sql {verify}
SELECT
  payment_method,
  COUNT(*)                                                           AS line_count,
  count_if(discount_amount > 0)                                      AS discount_lines,
  ROUND(count_if(discount_amount > 0) * 100.0 / NULLIF(COUNT(*), 0), 1) AS discount_line_pct
FROM sales
GROUP BY payment_method
ORDER BY discount_line_pct DESC;
```

| payment_method | line_count | discount_lines | discount_line_pct |
|---|---|---|---|
| QR Payment | 49 | 11 | 22.4 |
| Credit Card | 41 | 8 | 19.5 |
| Cash | 51 | 8 | 15.7 |

**เหตุผล:** นับแบบมีเงื่อนไขแล้วหารด้วยทั้งหมดพร้อม `NULLIF` แถวที่ส่วนลดเป็น NULL ไม่ถูกนับเป็นมีส่วนลด
:::
