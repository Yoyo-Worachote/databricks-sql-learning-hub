## สูตรนี้คืออะไร

สรุปยอดขายรายเดือนด้วย `CAST(DATE_TRUNC('MONTH', sale_date) AS DATE)` ซึ่งปัดทุกวันที่ให้เป็นวันที่ 1 ของเดือน (ชนิด DATE) แล้ว GROUP BY

**ทำไมไม่ใช้ `MONTH(sale_date)`:** ได้แค่เลขเดือน 1–12 มกราคมของหลายปีจะรวมกัน ส่วน DATE_TRUNC เก็บปีไว้ด้วย และเป็นวันที่จริงที่ Power BI ทำกราฟเวลาได้

## รูปแบบ (Syntax)

```sql
SELECT
  CAST(DATE_TRUNC('MONTH', date_col) AS DATE) AS month_start,
  SUM(amount_col)                             AS total_amount
FROM table_name
GROUP BY CAST(DATE_TRUNC('MONTH', date_col) AS DATE)
ORDER BY month_start;
```

## ตัวอย่างข้อมูลต้นทาง

รายการขาย `sale_date` ตั้งแต่ 2026-01-02 ถึง 2026-03-31 (141 แถว)

## SQL Query ฉบับเต็มและผลลัพธ์

```sql {verify}
SELECT
  CAST(DATE_TRUNC('MONTH', sale_date) AS DATE) AS month_start,
  COUNT(*)                                     AS line_count,
  SUM(net_amount)                              AS total_net
FROM sales
GROUP BY CAST(DATE_TRUNC('MONTH', sale_date) AS DATE)
ORDER BY month_start;
```

| month_start | line_count | total_net |
|---|---|---|
| 2026-01-01 | 60 | 5302.00 |
| 2026-02-01 | 30 | 2095.00 |
| 2026-03-01 | 51 | 5086.00 |

## อธิบายทีละส่วน

- `DATE_TRUNC('MONTH', DATE'2026-02-14')` → `2026-02-01 00:00:00` (TIMESTAMP)
- `CAST(... AS DATE)` → `2026-02-01` ไม่มีเวลาติดมา
- ใช้สูตรเดียวกันทั้งใน SELECT และ GROUP BY (Databricks ใช้ Alias `GROUP BY month_start` ได้)

**ตรวจ:** 60 + 30 + 51 = 141 แถว

## ข้อผิดพลาดที่พบบ่อย

- GROUP BY `MONTH(sale_date)` อย่างเดียว
- ใช้ `DATE_FORMAT(sale_date, 'yyyy-MM')` เป็นคอลัมน์เดือนแล้วนำไปคำนวณต่อแบบวันที่ (เป็นข้อความ)
- ลืม CAST ทำให้ Power BI แสดงเวลา 00:00:00

## ข้อควรระวังและกรณีพิเศษ

- เดือนที่ไม่มีการขายจะไม่มีแถว ถ้าต้องการครบทุกเดือน ใช้ตาราง `calendar` เป็นฐาน
- ตัวเลขนี้เป็นยอดก่อนทำความสะอาด

## วิธีอื่นที่ใช้แทนกันได้

- `TRUNC(sale_date, 'MM')` คืนค่า DATE โดยตรง
- `DATE_TRUNC('QUARTER', ...)` / `('YEAR', ...)` / `('WEEK', ...)` สำหรับช่วงอื่น

## แบบฝึกหัด

**โจทย์:** ยอดขายรายเดือนของสาขา S01 และ S05

:::answer
```sql {verify}
SELECT
  CAST(DATE_TRUNC('MONTH', sale_date) AS DATE) AS month_start,
  store_id,
  COUNT(*)                                     AS line_count,
  SUM(net_amount)                              AS total_net
FROM sales
WHERE store_id IN ('S01', 'S05')
GROUP BY CAST(DATE_TRUNC('MONTH', sale_date) AS DATE), store_id
ORDER BY month_start, store_id;
```

| month_start | store_id | line_count | total_net |
|---|---|---|---|
| 2026-01-01 | S01 | 23 | 2480.00 |
| 2026-02-01 | S01 | 12 | 583.00 |
| 2026-03-01 | S01 | 12 | 1285.00 |
| 2026-03-01 | S05 | 7 | 663.00 |

**เหตุผล:** GROUP BY ทั้งเดือนและสาขา S05 มีเฉพาะเดือนมีนาคมเพราะเพิ่งเปิด
:::
