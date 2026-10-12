## DATE, TIMESTAMP และวันที่ที่เป็นข้อความ

| ชนิด | เก็บอะไร | ตัวอย่างในชุดข้อมูล | วิธีเขียนค่าคงที่ |
|---|---|---|---|
| `DATE` | วันที่อย่างเดียว | `sales.sale_date` = 2026-02-14 | `DATE'2026-02-14'` |
| `TIMESTAMP` | วันที่และเวลา | `sales.sale_datetime` = 2026-02-14 15:54:17 | `TIMESTAMP'2026-02-14 15:54:17'` |
| `STRING` ที่หน้าตาเหมือนวันที่ | ข้อความ ไม่ใช่วันที่ | `sales_raw.sale_date_text` = '05/01/2026' | ต้องแปลงก่อนใช้ |

> [!WARNING] วันที่ที่เป็นข้อความเรียงผิด
> ถ้าวันที่เก็บเป็นข้อความรูปแบบ `dd/MM/yyyy` ระบบจะเรียงแบบตัวอักษร `'05/02/2026'` (5 ก.พ.) จะมาก่อน `'15/01/2026'` (15 ม.ค.) เพราะ `'0'` น้อยกว่า `'1'` ต้องแปลงเป็น DATE ก่อนเสมอ

**รูปแบบวันที่ (Format Pattern) ที่ใช้บ่อย** ตัวพิมพ์เล็ก/ใหญ่มีผล

| สัญลักษณ์ | ความหมาย | ตัวอย่าง |
|---|---|---|
| `yyyy` | ปี ค.ศ. 4 หลัก | 2026 |
| `MM` | เดือน 2 หลัก (**ตัวใหญ่**) | 02 |
| `dd` | วัน 2 หลัก | 14 |
| `HH` | ชั่วโมง 00–23 | 15 |
| `mm` | นาที (**ตัวเล็ก**) | 54 |
| `ss` | วินาที | 17 |

## ดึงส่วนต่าง ๆ ของวันที่

```sql {verify}
SELECT
  sale_id,
  sale_date,
  sale_datetime,
  YEAR(sale_date)        AS sale_year,
  MONTH(sale_date)       AS sale_month,
  DAYOFMONTH(sale_date)  AS sale_day,
  HOUR(sale_datetime)    AS sale_hour,
  CAST(DATE_TRUNC('MONTH', sale_date) AS DATE) AS month_start
FROM sales
WHERE sale_id IN ('T0001', 'T0100')
ORDER BY sale_id;
```

| sale_id | sale_date | sale_datetime | sale_year | sale_month | sale_day | sale_hour | month_start |
|---|---|---|---|---|---|---|---|
| T0001 | 2026-01-02 | 2026-01-02 11:00:41 | 2026 | 1 | 2 | 11 | 2026-01-01 |
| T0100 | 2026-03-03 | 2026-03-03 14:59:51 | 2026 | 3 | 3 | 14 | 2026-03-01 |

**ฟังก์ชันอื่นที่ใช้บ่อย**

```sql {verify}
SELECT
  sale_id,
  sale_date,
  QUARTER(sale_date)                             AS sale_quarter,
  DAYOFWEEK(sale_date)                           AS day_of_week,
  DATE_FORMAT(sale_date, 'yyyy-MM')              AS year_month_text,
  LAST_DAY(sale_date)                            AS month_end,
  CAST(DATE_TRUNC('WEEK', sale_date) AS DATE)    AS week_start,
  CAST(DATE_TRUNC('QUARTER', sale_date) AS DATE) AS quarter_start
FROM sales
WHERE sale_id IN ('T0001', 'T0100')
ORDER BY sale_id;
```

| sale_id | sale_date | sale_quarter | day_of_week | year_month_text | month_end | week_start | quarter_start |
|---|---|---|---|---|---|---|---|
| T0001 | 2026-01-02 | 1 | 6 | 2026-01 | 2026-01-31 | 2025-12-29 | 2026-01-01 |
| T0100 | 2026-03-03 | 1 | 3 | 2026-03 | 2026-03-31 | 2026-03-02 | 2026-01-01 |

| ฟังก์ชัน | ผล | ข้อควรรู้ |
|---|---|---|
| `QUARTER(d)` | ไตรมาส 1–4 | |
| `DAYOFWEEK(d)` | 1 = อาทิตย์ … 7 = เสาร์ | 2026-01-02 เป็นวันศุกร์ จึงได้ 6 |
| `DATE_FORMAT(d, 'yyyy-MM')` | ข้อความ เช่น '2026-01' | ผลเป็น **STRING** ใช้แสดงผล ไม่ควรนำไปคำนวณต่อแบบวันที่ |
| `LAST_DAY(d)` | วันสุดท้ายของเดือน | |
| `DATE_TRUNC('WEEK', d)` | วันจันทร์ของสัปดาห์นั้น | ผลเป็น TIMESTAMP จึง CAST เป็น DATE |
| `DATE_TRUNC('MONTH' / 'QUARTER' / 'YEAR', d)` | วันแรกของเดือน / ไตรมาส / ปี | ใช้ GROUP BY รายช่วงเวลา |

> [!DATABRICKS] DATE_TRUNC คืนค่า TIMESTAMP
> ใน Databricks `DATE_TRUNC('MONTH', sale_date)` ได้ `2026-01-01 00:00:00` (TIMESTAMP) จึงนิยมครอบด้วย `CAST(... AS DATE)` เพื่อให้ได้วันที่ล้วน มิฉะนั้นใน Power BI จะเห็นเวลา 00:00:00 ติดมา (ฟังก์ชัน `TRUNC(date, 'MM')` คืนค่า DATE โดยตรงเป็นอีกทางเลือก)

## สรุปยอดขายรายวันและรายเดือน

**รายวัน:** `sale_date` เป็น DATE อยู่แล้ว จึง GROUP BY ได้ทันที

```sql {verify}
SELECT
  sale_date,
  COUNT(*)        AS line_count,
  SUM(net_amount) AS total_net
FROM sales
WHERE sale_date >= DATE'2026-03-01'
  AND sale_date <  DATE'2026-03-08'
GROUP BY sale_date
ORDER BY sale_date;
```

| sale_date | line_count | total_net |
|---|---|---|
| 2026-03-01 | 3 | 216.00 |
| 2026-03-02 | 5 | 803.00 |
| 2026-03-03 | 4 | 249.00 |
| 2026-03-04 | 4 | 186.00 |
| 2026-03-05 | 1 | 14.00 |
| 2026-03-06 | 1 | 267.00 |

วันที่ 7 มี.ค. ไม่มีการขายจึงไม่มีแถว ถ้าต้องการให้แสดงเป็น 0 ใช้ตาราง `calendar` (บทที่ 21)

**รายเดือน:** ปัดทุกวันที่ให้เป็นวันแรกของเดือน แล้วจัดกลุ่ม

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

> [!MISTAKE] จัดกลุ่มรายเดือนด้วย MONTH() อย่างเดียว
> `GROUP BY MONTH(sale_date)` ทำให้มกราคม 2025 กับมกราคม 2026 รวมกันเป็นกลุ่มเดียว (เดือน = 1 เหมือนกัน) ใช้ `DATE_TRUNC('MONTH', ...)` ซึ่งเก็บปีไว้ด้วยเสมอ

## แปลงข้อความเป็นวันที่

ตาราง `sales_raw` มาจากไฟล์ Excel ที่วันที่เป็นข้อความหลายรูปแบบ

| วิธี | ใช้เมื่อ | ถ้าแปลงไม่ได้ |
|---|---|---|
| `CAST(text AS DATE)` | ข้อความรูปแบบมาตรฐาน `yyyy-MM-dd` | **Error** (ANSI mode) |
| `TRY_CAST(text AS DATE)` | เหมือน CAST แต่ไม่แน่ใจคุณภาพข้อมูล | คืน `NULL` |
| `TO_DATE(text, 'dd/MM/yyyy')` | ข้อความรูปแบบเฉพาะ และมั่นใจว่าทุกแถวถูกต้อง | **Error** |
| `CAST(try_to_timestamp(text, 'dd/MM/yyyy') AS DATE)` | ข้อความรูปแบบเฉพาะ แต่บางแถวอาจผิด | คืน `NULL` |

**ลองหลายรูปแบบแล้วเอาค่าแรกที่แปลงสำเร็จด้วย COALESCE**

```sql {run}
SELECT
  raw_id,
  sale_date_text,
  TRY_CAST(sale_date_text AS DATE)                              AS try_cast_iso,
  CAST(try_to_timestamp(sale_date_text, 'dd/MM/yyyy') AS DATE)  AS parsed_ddmmyyyy,
  COALESCE(
    TRY_CAST(sale_date_text AS DATE),
    CAST(try_to_timestamp(sale_date_text, 'dd/MM/yyyy') AS DATE),
    CAST(try_to_timestamp(sale_date_text, 'yyyy/MM/dd') AS DATE)
  )                                                             AS sale_date_clean
FROM sales_raw
ORDER BY raw_id;
```

| raw_id | sale_date_text | try_cast_iso | parsed_ddmmyyyy | sale_date_clean |
|---|---|---|---|---|
| 1 | 05/01/2026 | NULL | 2026-01-05 | 2026-01-05 |
| 2 | 2026-01-06 | 2026-01-06 | NULL | 2026-01-06 |
| 3 | 07/01/2026 | NULL | 2026-01-07 | 2026-01-07 |
| 4 | 31/02/2026 | NULL | NULL | NULL |
| 5 | NULL | NULL | NULL | NULL |
| 6 | 15/01/2026 | NULL | 2026-01-15 | 2026-01-15 |
| 7 | 16/01/2026 | NULL | 2026-01-16 | 2026-01-16 |
| 8 | 2026/01/17 | NULL | NULL | 2026-01-17 |

- แถว 1, 3, 6, 7 แปลงได้ด้วยรูปแบบ `dd/MM/yyyy`
- แถว 2 เป็นรูปแบบมาตรฐาน แปลงได้ด้วย `TRY_CAST`
- แถว 8 แปลงได้ด้วยรูปแบบที่ 3 `yyyy/MM/dd`
- แถว 4 (31 ก.พ. ไม่มีจริง) และแถว 5 (ไม่มีค่า) ยังเป็น `NULL` ต้องส่งกลับให้เจ้าของข้อมูลแก้ ไม่ควรเดาเอง

> [!MISTAKE] ใช้ TO_DATE กับข้อมูลที่รูปแบบไม่สม่ำเสมอ
> `SELECT raw_id, TO_DATE(sale_date_text, 'dd/MM/yyyy') FROM sales_raw;` จะ Error ทั้ง Query เพราะบางแถวไม่ใช่รูปแบบนั้น
>
> ```text
> [CANNOT_PARSE_TIMESTAMP] Text '2026-01-06' could not be parsed at index 2.
> Use `try_to_timestamp` to tolerate invalid input string and return NULL instead.
> ```

## นับจำนวนวันและเลื่อนวันที่

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

| ฟังก์ชัน | ความหมาย | ตัวอย่าง |
|---|---|---|
| `DATEDIFF(end, start)` | จำนวนวันจาก start ถึง end | S06 ยังไม่เปิดจึงได้ค่าติดลบ |
| `ADD_MONTHS(d, n)` | เลื่อน n เดือน ใช้ค่าลบเพื่อย้อนหลัง | `ADD_MONTHS(d, -12)` = 1 ปีก่อน |
| `DATE_ADD(d, n)` / `DATE_SUB(d, n)` | เลื่อน n วัน | `DATE_ADD(d, -30)` = 30 วันก่อน |
| `LAST_DAY(d)` | วันสิ้นเดือน | |
| `CURRENT_DATE()` / `CURRENT_TIMESTAMP()` | วันที่ / เวลาปัจจุบัน | ผลขึ้นกับวันที่รันและ Time Zone ของ Session |

> [!DATABRICKS] ลำดับ Argument ของ DATEDIFF
> Databricks: `DATEDIFF(end, start)` (วันสิ้นสุดอยู่ก่อน) หรือเขียนแบบระบุหน่วย `DATEDIFF(DAY, start, end)` ส่วน SQL Server เขียน `DATEDIFF(day, start, end)` ถ้าคัดลอกจาก SQL Server แล้วสลับลำดับผิด จะได้ค่าติดลบ

**รายงานแบบเลื่อนช่วงอัตโนมัติ** (ผลขึ้นกับวันที่รัน จึงไม่มีตัวอย่างผลลัพธ์)

```sql {skip}
SELECT
  CURRENT_DATE()                                    AS today,
  DATE_ADD(CURRENT_DATE(), -30)                     AS thirty_days_ago,
  CAST(DATE_TRUNC('MONTH', CURRENT_DATE()) AS DATE) AS this_month_start;
```

ชุดข้อมูลฝึกเป็นปี 2025–2026 แบบฝึกหัดจึงใช้วันที่คงที่ ไม่ใช้ `CURRENT_DATE()`

## กรองช่วงเวลาให้ไม่ตกหล่น

**ปัญหา:** `BETWEEN` กับคอลัมน์ TIMESTAMP

```sql {verify}
SELECT COUNT(*) AS jan_rows
FROM sales
WHERE sale_datetime BETWEEN TIMESTAMP'2026-01-01 00:00:00'
                        AND TIMESTAMP'2026-01-31 00:00:00';
```

| jan_rows |
|---|
| 57 |

รายการวันที่ 31 ม.ค. ที่เกิดหลังเที่ยงคืน (เช่น 11:00 น.) หายไป 3 รายการ เพราะมากกว่า `2026-01-31 00:00:00`

**วิธีที่ถูก:** `>=` วันแรก และ `<` วันแรกของเดือนถัดไป

```sql {verify}
SELECT COUNT(*) AS jan_rows
FROM sales
WHERE sale_datetime >= TIMESTAMP'2026-01-01 00:00:00'
  AND sale_datetime <  TIMESTAMP'2026-02-01 00:00:00';
```

| jan_rows |
|---|
| 60 |

> [!TIP] กรองบนคอลัมน์ดิบ อย่าครอบด้วยฟังก์ชัน
> `WHERE YEAR(sale_date) = 2026 AND MONTH(sale_date) = 2` ให้ผลถูก (30 แถว) แต่ในตารางใหญ่จะช้ากว่า `WHERE sale_date >= DATE'2026-02-01' AND sale_date < DATE'2026-03-01'` เพราะระบบต้องคำนวณฟังก์ชันทุกแถวก่อน และใช้ข้อมูลสถิติของไฟล์เพื่อข้ามไฟล์ที่ไม่เกี่ยวข้องไม่ได้ (บทที่ 24)

## ข้อผิดพลาดที่พบบ่อย

- ใช้ `BETWEEN` กับ TIMESTAMP แล้วข้อมูลวันสุดท้ายหาย
- ใช้ `mm` (นาที) แทน `MM` (เดือน) ในรูปแบบวันที่
- สลับลำดับ Argument ของ `DATEDIFF` เพราะคุ้นกับ SQL Server
- จัดกลุ่มรายเดือนด้วย `MONTH(sale_date)` อย่างเดียว ทำให้หลายปีรวมกัน
- ลืมว่า `DATE_TRUNC` คืน TIMESTAMP ทำให้ Power BI แสดงเวลา 00:00:00
- ใช้ `DATE_FORMAT` สร้างคอลัมน์เดือนเป็นข้อความ แล้วนำไปเรียงหรือคำนวณต่อแบบวันที่

## ฝึกทำ

**โจทย์:** สรุปจำนวนรายการและยอดขายสุทธิตาม**ชั่วโมงของวัน** (`sale_datetime`) เพื่อหาช่วงเวลาที่ขายดีที่สุด แสดงเฉพาะ 3 ชั่วโมงที่ยอดสูงสุด

:::answer ดูเฉลยและคำอธิบาย
```sql {verify}
SELECT
  HOUR(sale_datetime) AS sale_hour,
  COUNT(*)            AS line_count,
  SUM(net_amount)     AS total_net
FROM sales
GROUP BY HOUR(sale_datetime)
ORDER BY total_net DESC
LIMIT 3;
```

| sale_hour | line_count | total_net |
|---|---|---|
| 13 | 19 | 1897.00 |
| 12 | 11 | 1508.00 |
| 15 | 14 | 1311.00 |

**เหตุผล:** `HOUR()` ดึงชั่วโมงจาก TIMESTAMP แล้วจัดกลุ่ม ช่วง 13:00–13:59 ขายดีที่สุด คำตอบนี้ไม่มีค่าเท่ากันที่ขอบอันดับ 3 จึงไม่ต้องใส่ตัวตัดสิน แต่ในงานจริงควรใส่ `sale_hour` ต่อท้าย `ORDER BY` ไว้เสมอ
:::

ฝึกเพิ่มที่ [แบบฝึกหัด: วันที่และเวลา](#/exercises/ex-date)
