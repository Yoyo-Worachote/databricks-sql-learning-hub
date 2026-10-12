## สูตรนี้คืออะไร

| ฟังก์ชัน | ความหมาย | ตัวอย่าง |
|---|---|---|
| `DATEDIFF(end, start)` | จำนวนวันจาก start ถึง end | `DATEDIFF(DATE'2026-03-31', DATE'2026-03-01')` = 30 |
| `DATE_ADD(d, n)` / `DATE_SUB(d, n)` | เลื่อน n วัน | `DATE_ADD(d, -30)` = 30 วันก่อน |
| `ADD_MONTHS(d, n)` | เลื่อน n เดือน | `ADD_MONTHS(d, -12)` = 1 ปีก่อน |
| `LAST_DAY(d)` | วันสิ้นเดือน | `LAST_DAY(DATE'2026-02-10')` = 2026-02-28 |
| `CURRENT_DATE()` | วันที่ปัจจุบัน | ขึ้นกับวันที่รัน |

> [!DATABRICKS] ลำดับ Argument
> Databricks: `DATEDIFF(end, start)` หรือ `DATEDIFF(DAY, start, end)` ส่วน SQL Server: `DATEDIFF(day, start, end)` ถ้าสลับผิดจะได้ค่าติดลบ

## รูปแบบ (Syntax)

```sql
SELECT
  DATEDIFF(end_date, start_date) AS days_between,
  ADD_MONTHS(start_date, 3)      AS three_months_later
FROM table_name;
```

## ตัวอย่างข้อมูลต้นทาง

<!-- verify: SELECT store_id, open_date FROM stores ORDER BY open_date -->
| store_id | open_date |
|---|---|
| S01 | 2019-05-01 |
| S02 | 2020-08-15 |
| S03 | 2021-03-01 |
| S04 | 2022-11-20 |
| S05 | 2026-03-01 |
| S06 | 2026-06-01 |

## SQL Query ฉบับเต็มและผลลัพธ์

```sql {verify}
SELECT
  store_id,
  open_date,
  DATEDIFF(DATE'2026-03-31', open_date) AS days_open_at_q1_end,
  ADD_MONTHS(open_date, 3)              AS three_months_after_open
FROM stores
ORDER BY open_date;
```

| store_id | open_date | days_open_at_q1_end | three_months_after_open |
|---|---|---|---|
| S01 | 2019-05-01 | 2526 | 2019-08-01 |
| S02 | 2020-08-15 | 2054 | 2020-11-15 |
| S03 | 2021-03-01 | 1856 | 2021-06-01 |
| S04 | 2022-11-20 | 1227 | 2023-02-20 |
| S05 | 2026-03-01 | 30 | 2026-06-01 |
| S06 | 2026-06-01 | -62 | 2026-09-01 |

## อธิบายทีละส่วน

- S05 เปิด 1 มี.ค. ถึง 31 มี.ค. = 30 วัน
- S06 ยังไม่เปิด ณ วันที่ 31 มี.ค. จึงได้ค่าติดลบ (−62) ซึ่งเป็นสัญญาณให้ตรวจหรือกรองออก

## ข้อผิดพลาดที่พบบ่อย

- สลับลำดับ Argument ของ DATEDIFF
- ใช้ `DATE_ADD(d, 30)` แทน "1 เดือน" (เดือนมี 28–31 วัน ใช้ `ADD_MONTHS`)

## ข้อควรระวังและกรณีพิเศษ

- `ADD_MONTHS(DATE'2026-01-31', 1)` = 2026-02-28 (ปรับเป็นวันสุดท้ายของเดือนที่สั้นกว่า)
- DATEDIFF ระหว่าง TIMESTAMP นับตามวันที่ ไม่สนเวลา ถ้าต้องการชั่วโมงใช้ `TIMESTAMPDIFF(HOUR, start, end)`
- ผลของ `CURRENT_DATE()` เปลี่ยนทุกวัน ไม่เหมาะกับตัวอย่างที่ต้องตรวจผลซ้ำ

## วิธีอื่นที่ใช้แทนกันได้

- `d + INTERVAL 1 MONTH` / `d - INTERVAL 30 DAYS`

## แบบฝึกหัด

**โจทย์:** สำหรับสินค้าที่เริ่มขายตั้งแต่ปี 2023 แสดงจำนวนวันตั้งแต่เริ่มขายถึง 31 มี.ค. 2026 และวันครบรอบ 1 ปี

:::answer
```sql {verify}
SELECT
  product_id,
  launch_date,
  DATEDIFF(DATE'2026-03-31', launch_date) AS days_since_launch,
  ADD_MONTHS(launch_date, 12)             AS first_anniversary
FROM products
WHERE launch_date >= DATE'2023-01-01'
ORDER BY launch_date;
```

| product_id | launch_date | days_since_launch | first_anniversary |
|---|---|---|---|
| P010 | 2023-01-15 | 1171 | 2024-01-15 |
| P005 | 2023-07-01 | 1004 | 2024-07-01 |
| P006 | 2024-02-01 | 789 | 2025-02-01 |
| P011 | 2025-11-01 | 150 | 2026-11-01 |

**เหตุผล:** P011 เพิ่งเริ่มขาย 150 วัน ยังไม่ครบปี ซึ่งช่วยอธิบายว่าทำไมยังไม่มียอดขาย
:::
