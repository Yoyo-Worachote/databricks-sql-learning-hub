## ข้อ 6.1 (ง่าย): สรุปรายวัน

**โจทย์:** สรุปจำนวนรายการขายและยอดสุทธิรวมของแต่ละวันในสัปดาห์แรกของเดือนกุมภาพันธ์ 2026 (1–7 ก.พ.)

:::answer
```sql {verify}
SELECT
  sale_date,
  COUNT(*)        AS line_count,
  SUM(net_amount) AS total_net
FROM sales
WHERE sale_date >= DATE'2026-02-01'
  AND sale_date <  DATE'2026-02-08'
GROUP BY sale_date
ORDER BY sale_date;
```

| sale_date | line_count | total_net |
|---|---|---|
| 2026-02-02 | 3 | 62.00 |
| 2026-02-03 | 1 | 20.00 |
| 2026-02-05 | 2 | 74.00 |
| 2026-02-06 | 2 | 95.00 |
| 2026-02-07 | 1 | 78.00 |

**เหตุผล:** ช่วงวันที่ใช้ `>= 1 ก.พ.` และ `< 8 ก.พ.` วันที่ไม่มีการขาย (1 และ 4 ก.พ.) จะไม่ปรากฏ ถ้าต้องการให้แสดงเป็น 0 ต้องใช้ตาราง `calendar` (บทที่ 21) สังเกตยอดวันที่ 2 ก.พ. ต่ำเพราะมีรายการรับคืนและรายการยอดติดลบรวมอยู่
:::

## ข้อ 6.2 (ปานกลาง): สรุปรายเดือนแยกสาขา

**โจทย์:** สรุปยอดสุทธิรายเดือนแยกตามสาขาสำหรับไตรมาส 1 ปี 2026 ใช้ `DATE_TRUNC` และให้คอลัมน์เดือนเป็นชนิด DATE

:::answer
```sql {verify partial count=13}
SELECT
  CAST(DATE_TRUNC('MONTH', sale_date) AS DATE) AS month_start,
  store_id,
  SUM(net_amount)                              AS total_net
FROM sales
WHERE sale_date >= DATE'2026-01-01'
  AND sale_date <  DATE'2026-04-01'
GROUP BY CAST(DATE_TRUNC('MONTH', sale_date) AS DATE), store_id
ORDER BY month_start, store_id;
```

**ผลลัพธ์** (แสดง 8 จาก 13 แถว)

| month_start | store_id | total_net |
|---|---|---|
| 2026-01-01 | S01 | 2480.00 |
| 2026-01-01 | S02 | 1228.00 |
| 2026-01-01 | S03 | 451.00 |
| 2026-01-01 | S04 | 1143.00 |
| 2026-02-01 | S01 | 583.00 |
| 2026-02-01 | S02 | 254.00 |
| 2026-02-01 | S03 | 755.00 |
| 2026-02-01 | S04 | 503.00 |

**เหตุผล:** `CAST(DATE_TRUNC('MONTH', ...) AS DATE)` ปัดทุกวันที่เป็นวันที่ 1 ของเดือนและได้ชนิด DATE ได้ 13 แถว (S01–S04 × 3 เดือน + S05 ในเดือนมีนาคม) ต้องใส่สูตรเดียวกันใน `GROUP BY` (หรือใช้ชื่อ Alias ได้ใน Databricks)
:::

## ข้อ 6.3 (ท้าทาย): แปลงข้อความเป็นวันที่และติดสถานะ

**โจทย์:** แปลงตาราง `sales_raw` ให้เป็นวันที่ที่ใช้งานได้ แสดง `raw_id`, `sale_date_text`, `sale_date_clean` และคอลัมน์ `date_status` ที่บอกว่า `'OK'` หรือ `'Invalid'`

:::answer
```sql {verify}
WITH parsed AS (
  SELECT
    raw_id,
    sale_date_text,
    COALESCE(
      TRY_CAST(sale_date_text AS DATE),
      CAST(try_to_timestamp(sale_date_text, 'dd/MM/yyyy') AS DATE),
      CAST(try_to_timestamp(sale_date_text, 'yyyy/MM/dd') AS DATE)
    ) AS sale_date_clean
  FROM sales_raw
)
SELECT
  raw_id,
  sale_date_text,
  sale_date_clean,
  CASE WHEN sale_date_clean IS NULL THEN 'Invalid' ELSE 'OK' END AS date_status
FROM parsed
ORDER BY raw_id;
```

| raw_id | sale_date_text | sale_date_clean | date_status |
|---|---|---|---|
| 1 | 05/01/2026 | 2026-01-05 | OK |
| 2 | 2026-01-06 | 2026-01-06 | OK |
| 3 | 07/01/2026 | 2026-01-07 | OK |
| 4 | 31/02/2026 | NULL | Invalid |
| 5 | NULL | NULL | Invalid |
| 6 | 15/01/2026 | 2026-01-15 | OK |
| 7 | 16/01/2026 | 2026-01-16 | OK |
| 8 | 2026/01/17 | 2026-01-17 | OK |

**เหตุผล:** แปลงทีละรูปแบบด้วย `COALESCE` ใน CTE แล้วใช้ `CASE WHEN` ติดสถานะในชั้นนอก (เขียนสูตรแปลงครั้งเดียว ไม่ต้องคัดลอกซ้ำใน CASE) แถว 4 (31 ก.พ. ไม่มีจริง) และแถว 5 (ไม่มีค่า) เป็น Invalid ต้องส่งให้เจ้าของข้อมูลแก้
:::
