## Window Function คืออะไร

**Window Function (ฟังก์ชันหน้าต่าง)** คือฟังก์ชันที่คำนวณโดย**มองแถวข้างเคียง**ในกลุ่มที่กำหนด แต่**ยังเก็บทุกแถวไว้** ต่างจาก `GROUP BY` ที่ยุบหลายแถวให้เหลือ 1 แถว

คำว่า "หน้าต่าง (Window)" หมายถึงชุดของแถวที่ฟังก์ชันมองเห็นเมื่อคำนวณแถวปัจจุบัน

**เทียบ GROUP BY กับ Window Function ด้วยข้อมูลสาขา S05 (7 รายการ)**

```sql {verify}
SELECT
  store_id,
  SUM(net_amount) AS store_net
FROM sales
WHERE store_id = 'S05'
GROUP BY store_id;
```

| store_id | store_net |
|---|---|
| S05 | 663.00 |

```sql {verify}
SELECT
  sale_id,
  store_id,
  net_amount,
  SUM(net_amount) OVER (PARTITION BY store_id) AS store_net
FROM sales
WHERE store_id = 'S05'
ORDER BY sale_id;
```

| sale_id | store_id | net_amount | store_net |
|---|---|---|---|
| T0093 | S05 | 51.00 | 663.00 |
| T0105 | S05 | 90.00 | 663.00 |
| T0114 | S05 | 79.00 | 663.00 |
| T0122 | S05 | 118.00 | 663.00 |
| T0125 | S05 | 150.00 | 663.00 |
| T0132 | S05 | 85.00 | 663.00 |
| T0133 | S05 | 90.00 | 663.00 |

`GROUP BY` เหลือ 1 แถวต่อสาขา ส่วน Window Function ยังเห็นทุกรายการ **พร้อม**ยอดรวมของสาขาในทุกแถว ทำให้คำนวณต่อได้ เช่น รายการนี้คิดเป็นกี่ % ของยอดสาขา

## โครงสร้างของ OVER()

```sql
FUNCTION(column) OVER (
  PARTITION BY group_column
  ORDER BY order_column
  ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
)
```

| ส่วน | ความหมาย | ถ้าไม่ใส่ |
|---|---|---|
| `PARTITION BY` | แบ่งกลุ่มคำนวณแยกกัน เหมือน "เริ่มนับใหม่ทุกสาขา" | ทั้งผลลัพธ์เป็นกลุ่มเดียว |
| `ORDER BY` | ลำดับของแถวภายในกลุ่ม (จำเป็นสำหรับยอดสะสม อันดับ และ LAG/LEAD) | ไม่มีลำดับ ฟังก์ชันรวมจะคิดทั้งกลุ่ม |
| `ROWS BETWEEN ...` (Frame) | กำหนดช่วงแถวที่นับรวม เช่น 2 แถวก่อนหน้าถึงแถวปัจจุบัน | ถ้ามี ORDER BY: ตั้งแต่แถวแรกถึงแถวปัจจุบัน / ถ้าไม่มี: ทั้งกลุ่ม |

**ฟังก์ชันที่ใช้กับ OVER() ได้**

| กลุ่ม | ฟังก์ชัน | ใช้ทำอะไร |
|---|---|---|
| ฟังก์ชันรวม | `SUM`, `AVG`, `COUNT`, `MIN`, `MAX` | ยอดสะสม ค่าเฉลี่ยเคลื่อนที่ ยอดรวมของกลุ่ม |
| จัดอันดับ | `ROW_NUMBER`, `RANK`, `DENSE_RANK`, `NTILE` | อันดับ Top N (บทที่ 15–16) |
| ดึงค่าแถวอื่น | `LAG`, `LEAD`, `FIRST_VALUE`, `LAST_VALUE` | เทียบกับแถวก่อนหน้า/ถัดไป |

> [!NOTE] เตรียมข้อมูลด้วย CTE ก่อน
> ตัวอย่างต่อจากนี้สรุปยอดรายวันใน CTE ชื่อ `daily` ก่อน (1 แถว = 1 วัน) แล้วจึงใช้ Window Function กับผลสรุป เป็นรูปแบบที่ใช้บ่อยในงานจริง

## ยอดสะสม (Running Total)

**สถานการณ์:** ผู้จัดการอยากเห็นยอดขายสะสมตั้งแต่ต้นเดือนมีนาคม 2026 ในแต่ละวัน (สัปดาห์แรก)

```sql {verify}
WITH daily AS (
  SELECT
    sale_date,
    SUM(net_amount) AS day_net
  FROM sales
  WHERE sale_date >= DATE'2026-03-01'
    AND sale_date <  DATE'2026-03-08'
  GROUP BY sale_date
)
SELECT
  sale_date,
  day_net,
  SUM(day_net) OVER (ORDER BY sale_date) AS running_net
FROM daily
ORDER BY sale_date;
```

| sale_date | day_net | running_net |
|---|---|---|
| 2026-03-01 | 216.00 | 216.00 |
| 2026-03-02 | 803.00 | 1019.00 |
| 2026-03-03 | 249.00 | 1268.00 |
| 2026-03-04 | 186.00 | 1454.00 |
| 2026-03-05 | 14.00 | 1468.00 |
| 2026-03-06 | 267.00 | 1735.00 |

**ไล่การคำนวณ:** แถว 2026-03-03 = 216 + 803 + 249 = 1,268 คือรวมตั้งแต่แถวแรกจนถึงแถวปัจจุบันตามลำดับ `ORDER BY sale_date` (ไม่มีวันที่ 7 มี.ค. เพราะไม่มีการขาย)

**ยอดสะสมแยกตามสาขา:** เพิ่ม `PARTITION BY store_id` ยอดสะสมจะเริ่มนับใหม่เมื่อเปลี่ยนสาขา

```sql {verify}
WITH store_month AS (
  SELECT
    store_id,
    CAST(DATE_TRUNC('MONTH', sale_date) AS DATE) AS month_start,
    SUM(net_amount)                              AS total_net
  FROM sales
  GROUP BY store_id, CAST(DATE_TRUNC('MONTH', sale_date) AS DATE)
)
SELECT
  store_id,
  month_start,
  total_net,
  SUM(total_net) OVER (PARTITION BY store_id ORDER BY month_start) AS running_net
FROM store_month
WHERE store_id IN ('S01', 'S05')
ORDER BY store_id, month_start;
```

| store_id | month_start | total_net | running_net |
|---|---|---|---|
| S01 | 2026-01-01 | 2480.00 | 2480.00 |
| S01 | 2026-02-01 | 583.00 | 3063.00 |
| S01 | 2026-03-01 | 1285.00 | 4348.00 |
| S05 | 2026-03-01 | 663.00 | 663.00 |

S05 เริ่มนับใหม่จาก 663 ไม่ได้ต่อจากยอดสะสมของ S01

## สัดส่วนต่อยอดรวม และค่าเฉลี่ยเคลื่อนที่

```sql {verify}
WITH daily AS (
  SELECT
    sale_date,
    SUM(net_amount) AS day_net
  FROM sales
  WHERE sale_date >= DATE'2026-03-01'
    AND sale_date <  DATE'2026-03-08'
  GROUP BY sale_date
)
SELECT
  sale_date,
  day_net,
  ROUND(AVG(day_net) OVER (
          ORDER BY sale_date
          ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
        ), 2)                                         AS avg_3_rows,
  ROUND(day_net * 100.0 / SUM(day_net) OVER (), 1)    AS share_of_week_pct
FROM daily
ORDER BY sale_date;
```

| sale_date | day_net | avg_3_rows | share_of_week_pct |
|---|---|---|---|
| 2026-03-01 | 216.00 | 216.00 | 12.4 |
| 2026-03-02 | 803.00 | 509.50 | 46.3 |
| 2026-03-03 | 249.00 | 422.67 | 14.4 |
| 2026-03-04 | 186.00 | 412.67 | 10.7 |
| 2026-03-05 | 14.00 | 149.67 | 0.8 |
| 2026-03-06 | 267.00 | 155.67 | 15.4 |

**อธิบาย**

| ส่วน | ความหมาย | ตัวอย่างการคำนวณ |
|---|---|---|
| `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` | เฉลี่ยแถวปัจจุบันกับ 2 แถวก่อนหน้า | แถว 03-03: (216 + 803 + 249) ÷ 3 = 422.67 |
| แถวแรก ๆ | มีแถวก่อนหน้าไม่ครบ 2 แถว จึงเฉลี่ยเท่าที่มี | แถว 03-02: (216 + 803) ÷ 2 = 509.50 |
| `SUM(day_net) OVER ()` | วงเล็บว่าง = ยอดรวมทุกแถวในผลลัพธ์ (1,735) ใส่ไว้ทุกแถว | แถว 03-02: 803 × 100 ÷ 1,735 = 46.3% |

> [!WARNING] "3 แถว" ไม่ใช่ "3 วันตามปฏิทิน"
> `ROWS BETWEEN 2 PRECEDING` นับตามแถวที่มีข้อมูล ถ้าวันไหนไม่มีการขาย (ไม่มีแถว) ค่าเฉลี่ยจะข้ามวันนั้นไป ถ้าต้องการ 3 วันตามปฏิทินจริง ให้เติมวันที่ให้ครบด้วยตาราง `calendar` ก่อน (บทที่ 21)

## LAG และ LEAD: ดึงค่าจากแถวก่อนหน้าหรือถัดไป

| ฟังก์ชัน | ความหมาย |
|---|---|
| `LAG(col)` | ค่าของแถว**ก่อนหน้า** 1 แถวตาม `ORDER BY` |
| `LAG(col, n)` | ค่าของแถวก่อนหน้า n แถว |
| `LEAD(col)` | ค่าของแถว**ถัดไป** 1 แถว |
| `LAG(col, 1, 0)` | ถ้าไม่มีแถวก่อนหน้า ให้ใช้ 0 แทน `NULL` |

```sql {verify}
WITH daily AS (
  SELECT
    sale_date,
    SUM(net_amount) AS day_net
  FROM sales
  WHERE sale_date >= DATE'2026-03-01'
    AND sale_date <  DATE'2026-03-08'
  GROUP BY sale_date
)
SELECT
  sale_date,
  day_net,
  LAG(day_net)  OVER (ORDER BY sale_date)           AS prev_day_net,
  LEAD(day_net) OVER (ORDER BY sale_date)           AS next_day_net,
  day_net - LAG(day_net) OVER (ORDER BY sale_date)  AS diff_from_prev
FROM daily
ORDER BY sale_date;
```

| sale_date | day_net | prev_day_net | next_day_net | diff_from_prev |
|---|---|---|---|---|
| 2026-03-01 | 216.00 | NULL | 803.00 | NULL |
| 2026-03-02 | 803.00 | 216.00 | 249.00 | 587.00 |
| 2026-03-03 | 249.00 | 803.00 | 186.00 | -554.00 |
| 2026-03-04 | 186.00 | 249.00 | 14.00 | -63.00 |
| 2026-03-05 | 14.00 | 186.00 | 267.00 | -172.00 |
| 2026-03-06 | 267.00 | 14.00 | NULL | 253.00 |

แถวแรกไม่มีแถวก่อนหน้า `LAG` จึงเป็น `NULL` และแถวสุดท้ายไม่มีแถวถัดไป `LEAD` จึงเป็น `NULL` การเทียบกับเดือนก่อนและปีก่อนแบบเต็ม ดูบทที่ 21

## ข้อผิดพลาดที่พบบ่อย

- ใช้ Window Function ใน `WHERE` หรือ `GROUP BY` (ต้องครอบด้วย CTE แล้วกรองชั้นนอก บทที่ 13)
- ลืม `PARTITION BY` ทำให้คำนวณข้ามกลุ่ม เช่น ยอดสะสมของทุกสาขาต่อกัน
- สับสนว่า `SUM() OVER (ORDER BY ...)` คือยอด**สะสม** ไม่ใช่ยอดรวมทั้งหมด (ยอดรวมทั้งหมดคือ `OVER ()` ไม่มี ORDER BY)
- ใช้ `LAG` กับข้อมูลที่มีวันหรือเดือนขาดหาย ทำให้เทียบกับช่วงที่ไม่ใช่ช่วงก่อนหน้าจริง
- `ORDER BY` ใน `OVER` มีค่าซ้ำ เช่น หลายแถววันเดียวกัน ยอดสะสมแบบค่าเริ่มต้นจะรวมทุกแถวที่วันเดียวกันพร้อมกัน ถ้าต้องการทีละแถวให้ใส่ตัวตัดสินเพิ่ม หรือระบุ `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`

> [!NOTE] ORDER BY ใน OVER ไม่ได้เรียงผลลัพธ์
> `ORDER BY` ภายใน `OVER (...)` กำหนดลำดับสำหรับการคำนวณเท่านั้น ถ้าต้องการให้ผลลัพธ์เรียง ต้องเขียน `ORDER BY` ท้าย Query ด้วยเสมอ

## ฝึกทำ

**โจทย์:** แสดงรายการขายของสาขา S05 ทุกรายการ พร้อมคอลัมน์ `share_of_store_pct` = ยอดของรายการนั้นคิดเป็นกี่ % ของยอดรวมสาขา (ปัด 1 ตำแหน่ง) เรียงตาม `sale_id`

:::answer ดูเฉลยและคำอธิบาย
```sql {verify}
SELECT
  sale_id,
  net_amount,
  ROUND(net_amount * 100.0 / SUM(net_amount) OVER (PARTITION BY store_id), 1) AS share_of_store_pct
FROM sales
WHERE store_id = 'S05'
ORDER BY sale_id;
```

| sale_id | net_amount | share_of_store_pct |
|---|---|---|
| T0093 | 51.00 | 7.7 |
| T0105 | 90.00 | 13.6 |
| T0114 | 79.00 | 11.9 |
| T0122 | 118.00 | 17.8 |
| T0125 | 150.00 | 22.6 |
| T0132 | 85.00 | 12.8 |
| T0133 | 90.00 | 13.6 |

**เหตุผล:** `SUM(net_amount) OVER (PARTITION BY store_id)` ใส่ยอดรวมสาขา (663) ไว้ทุกแถวโดยไม่ยุบแถว จึงหารได้ทันที เช่น T0125: 150 × 100 ÷ 663 = 22.6% ถ้าใช้ GROUP BY จะเหลือแถวเดียวและหารรายรายการไม่ได้
:::

ดูสูตรที่ [ยอดสะสม](#/formula/f-running-total), [ค่าเฉลี่ยเคลื่อนที่](#/formula/f-moving-average), [สัดส่วนต่อยอดรวม](#/formula/f-share-of-total) และ [LAG / LEAD](#/formula/f-lag-lead)
