## สูตรนี้คืออะไร

ฟังก์ชันดึงส่วนต่าง ๆ ของวันที่และเวลา ใช้จัดกลุ่มหรือกรองตามช่วงเวลา

| ฟังก์ชัน | ผล | ตัวอย่าง (2026-01-02 11:00:41) |
|---|---|---|
| `YEAR(d)` | ปี | 2026 |
| `QUARTER(d)` | ไตรมาส 1–4 | 1 |
| `MONTH(d)` | เดือน 1–12 | 1 |
| `DAYOFMONTH(d)` | วันที่ 1–31 | 2 |
| `DAYOFWEEK(d)` | 1 = อาทิตย์ … 7 = เสาร์ | 6 (ศุกร์) |
| `HOUR(ts)` | ชั่วโมง 0–23 | 11 |
| `DATE_FORMAT(d, 'yyyy-MM')` | ข้อความตามรูปแบบ | '2026-01' |
| `CAST(DATE_TRUNC('MONTH', d) AS DATE)` | วันแรกของเดือน | 2026-01-01 |

## รูปแบบ (Syntax)

```sql
SELECT
  YEAR(date_col)       AS y,
  MONTH(date_col)      AS m,
  DAYOFWEEK(date_col)  AS dow,
  HOUR(timestamp_col)  AS h
FROM table_name;
```

## ตัวอย่างข้อมูลต้นทาง

<!-- verify: SELECT sale_id, sale_date, sale_datetime FROM sales WHERE sale_id IN ('T0001','T0100') ORDER BY sale_id -->
| sale_id | sale_date | sale_datetime |
|---|---|---|
| T0001 | 2026-01-02 | 2026-01-02 11:00:41 |
| T0100 | 2026-03-03 | 2026-03-03 14:59:51 |

## SQL Query ฉบับเต็มและผลลัพธ์

```sql {verify}
SELECT
  sale_id,
  YEAR(sale_date)                   AS sale_year,
  QUARTER(sale_date)                AS sale_quarter,
  MONTH(sale_date)                  AS sale_month,
  DAYOFMONTH(sale_date)             AS sale_day,
  DAYOFWEEK(sale_date)              AS day_of_week,
  HOUR(sale_datetime)               AS sale_hour,
  DATE_FORMAT(sale_date, 'yyyy-MM') AS year_month_text
FROM sales
WHERE sale_id IN ('T0001', 'T0100')
ORDER BY sale_id;
```

| sale_id | sale_year | sale_quarter | sale_month | sale_day | day_of_week | sale_hour | year_month_text |
|---|---|---|---|---|---|---|---|
| T0001 | 2026 | 1 | 1 | 2 | 6 | 11 | 2026-01 |
| T0100 | 2026 | 1 | 3 | 3 | 3 | 14 | 2026-03 |

## อธิบายทีละส่วน

- ฟังก์ชันเหล่านี้คำนวณทีละแถว ไม่เปลี่ยนข้อมูลในตาราง
- `DATE_FORMAT` คืน**ข้อความ** เหมาะกับการแสดงผล ถ้าจะจัดกลุ่มหรือคำนวณต่อให้ใช้ `DATE_TRUNC`

## ข้อผิดพลาดที่พบบ่อย

- GROUP BY `MONTH(d)` อย่างเดียว ทำให้เดือนเดียวกันของหลายปีรวมกัน
- ใช้ `mm` (นาที) แทน `MM` (เดือน) ใน DATE_FORMAT
- กรองด้วย `YEAR(d) = 2026` กับตารางใหญ่ ช้ากว่ากรองช่วงวันที่ ([ดูสูตร](#/formula/f-date-range-filter))

## ข้อควรระวังและกรณีพิเศษ

- `DAYOFWEEK` เริ่มที่วันอาทิตย์ = 1 (ต่างจากบางระบบที่เริ่มวันจันทร์) ส่วน `WEEKDAY(d)` ของ Databricks ให้ 0 = จันทร์
- `HOUR` ใช้กับ TIMESTAMP คอลัมน์ DATE ไม่มีเวลา

## วิธีอื่นที่ใช้แทนกันได้

- `EXTRACT(MONTH FROM d)` หรือ `date_part('MONTH', d)` (มาตรฐาน SQL) ได้ผลเหมือน `MONTH(d)`
- ตาราง `calendar` มีคอลัมน์ `year`, `month`, `day_name`, `is_weekend` เตรียมไว้แล้ว ใช้ JOIN แทนการคำนวณได้

## แบบฝึกหัด

**โจทย์:** สรุปจำนวนรายการและยอดขายตามวันในสัปดาห์ (DAYOFWEEK) ทั้งไตรมาส

:::answer
```sql {verify}
SELECT
  DAYOFWEEK(sale_date) AS day_of_week,
  COUNT(*)             AS line_count,
  SUM(net_amount)      AS total_net
FROM sales
GROUP BY DAYOFWEEK(sale_date)
ORDER BY day_of_week;
```

| day_of_week | line_count | total_net |
|---|---|---|
| 1 | 18 | 2008.00 |
| 2 | 26 | 2241.00 |
| 3 | 22 | 2006.00 |
| 4 | 18 | 1547.00 |
| 5 | 15 | 1220.00 |
| 6 | 24 | 2148.00 |
| 7 | 18 | 1313.00 |

**เหตุผล:** 1 = อาทิตย์ … 7 = เสาร์ วันจันทร์ (2) มีรายการมากที่สุด ถ้าต้องการชื่อวัน ให้ JOIN กับตาราง `calendar` แล้วใช้ `day_name`
:::
