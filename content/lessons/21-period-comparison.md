## การเปรียบเทียบช่วงเวลาที่ใช้บ่อย

| ชื่อย่อ | ภาษาไทย | เทียบอะไรกับอะไร | เทคนิคหลัก |
|---|---|---|---|
| **DoD** (Day over Day) | เทียบวันก่อน | วันนี้ กับ เมื่อวาน | ตาราง calendar + `LAG` |
| **MoM** (Month over Month) | เทียบเดือนก่อน | เดือนนี้ กับ เดือนที่แล้ว | สรุปรายเดือน + `LAG` |
| **YoY** (Year over Year) | เทียบปีก่อน | เดือนนี้ กับ เดือนเดียวกันของปีที่แล้ว | JOIN ที่ `ADD_MONTHS(month_start, -12)` |
| เทียบสองช่วงที่กำหนด | เทียบช่วงเวลา | เช่น มี.ค. กับ ก.พ. หรือ Q1 กับ Q4 | `SUM(CASE WHEN ช่วงเวลา ...)` |

**สูตร % เติบโต (Growth %)** = (ค่าปัจจุบัน − ค่าช่วงก่อน) × 100.0 ÷ ค่าช่วงก่อน และใช้ `NULLIF(ค่าช่วงก่อน, 0)` กันหารศูนย์เสมอ

> [!KEY] หลักสำคัญของการเปรียบเทียบช่วงเวลา
> ช่วงเวลาที่นำมาเทียบต้อง**ครบและเท่ากัน** ถ้าวันหรือเดือนไหนไม่มีข้อมูล ต้องเติมให้ครบก่อน มิฉะนั้น `LAG` จะเทียบกับช่วงที่ไม่ใช่ช่วงก่อนหน้าจริง

## ยอดขายรายวันให้ครบทุกวัน

**ปัญหา:** ถ้าสรุปจากตาราง `sales` ตรง ๆ วันที่ไม่มีการขาย (เช่น ร้านปิดวันที่ 1 ม.ค.) จะไม่มีแถว กราฟรายวันจะข้ามวันนั้นไป

**วิธีแก้:** เริ่มจากตาราง `calendar` ที่มีครบทุกวัน แล้ว LEFT JOIN ยอดขายรายวัน

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

**ผลลัพธ์** (แสดง 12 จาก 31 แถว)

| cal_date | day_name | line_count | net_sales |
|---|---|---|---|
| 2026-01-01 | Thu | 0 | 0.00 |
| 2026-01-02 | Fri | 3 | 126.00 |
| 2026-01-03 | Sat | 2 | 93.00 |
| 2026-01-04 | Sun | 1 | 14.00 |
| 2026-01-05 | Mon | 4 | 185.00 |
| 2026-01-06 | Tue | 2 | 429.00 |
| 2026-01-07 | Wed | 2 | 131.00 |
| 2026-01-08 | Thu | 4 | 478.00 |
| 2026-01-09 | Fri | 4 | 824.00 |
| 2026-01-10 | Sat | 0 | 0.00 |
| 2026-01-11 | Sun | 0 | 0.00 |
| 2026-01-12 | Mon | 2 | 183.00 |

- สรุปยอดรายวันใน CTE **ก่อน** JOIN (1 แถวต่อวัน) จึงไม่เกิด Fan-out
- `calendar` เป็นตารางซ้าย จึงได้ครบ 31 วัน
- `COALESCE(..., 0)` เปลี่ยนวันที่ไม่มีการขาย (NULL) เป็น 0
- กรองช่วงวันที่ที่ `c.cal_date` (ตารางซ้าย) ไม่ใช่ `d.sale_date`

## DoD: เทียบกับวันก่อนหน้า

ใช้ผลที่เติมวันครบแล้ว จึงทำให้ `LAG` เทียบกับ "เมื่อวาน" จริง

```sql {verify}
WITH daily_sales AS (
  SELECT
    sale_date,
    SUM(net_amount) AS net_sales
  FROM sales
  GROUP BY sale_date
),
daily_full AS (
  SELECT
    c.cal_date,
    c.day_name,
    COALESCE(d.net_sales, 0) AS net_sales
  FROM calendar AS c
  LEFT JOIN daily_sales AS d
    ON c.cal_date = d.sale_date
  WHERE c.cal_date >= DATE'2026-01-01'
    AND c.cal_date <  DATE'2026-01-15'
)
SELECT
  cal_date,
  day_name,
  net_sales,
  LAG(net_sales) OVER (ORDER BY cal_date)             AS prev_day_sales,
  net_sales - LAG(net_sales) OVER (ORDER BY cal_date) AS diff_dod
FROM daily_full
ORDER BY cal_date;
```

| cal_date | day_name | net_sales | prev_day_sales | diff_dod |
|---|---|---|---|---|
| 2026-01-01 | Thu | 0.00 | NULL | NULL |
| 2026-01-02 | Fri | 126.00 | 0.00 | 126.00 |
| 2026-01-03 | Sat | 93.00 | 126.00 | -33.00 |
| 2026-01-04 | Sun | 14.00 | 93.00 | -79.00 |
| 2026-01-05 | Mon | 185.00 | 14.00 | 171.00 |
| 2026-01-06 | Tue | 429.00 | 185.00 | 244.00 |
| 2026-01-07 | Wed | 131.00 | 429.00 | -298.00 |
| 2026-01-08 | Thu | 478.00 | 131.00 | 347.00 |
| 2026-01-09 | Fri | 824.00 | 478.00 | 346.00 |
| 2026-01-10 | Sat | 0.00 | 824.00 | -824.00 |
| 2026-01-11 | Sun | 0.00 | 0.00 | 0.00 |
| 2026-01-12 | Mon | 183.00 | 0.00 | 183.00 |
| 2026-01-13 | Tue | 14.00 | 183.00 | -169.00 |
| 2026-01-14 | Wed | 51.00 | 14.00 | 37.00 |

ถ้าไม่เติมวันที่ 10–11 ม.ค. แถววันที่ 12 ม.ค. จะถูกเทียบกับวันที่ 9 ม.ค. (824) แทนที่จะเป็นวันที่ 11 ม.ค. (0) ทำให้แปลผลผิด

## MoM: เทียบกับเดือนก่อน

**สถานการณ์:** กราฟยอดขายรายเดือน 6 เดือน (ต.ค. 2025 – มี.ค. 2026) พร้อม % เติบโตเทียบเดือนก่อน ข้อมูลอยู่ 2 ตารางจึงต้อง `UNION ALL` ก่อน

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
),
with_prev AS (
  SELECT
    month_start,
    total_net,
    LAG(total_net) OVER (ORDER BY month_start) AS prev_month_net
  FROM monthly
)
SELECT
  month_start,
  total_net,
  prev_month_net,
  total_net - prev_month_net                                         AS diff_mom,
  ROUND((total_net - prev_month_net) * 100.0 / NULLIF(prev_month_net, 0), 1) AS mom_growth_pct
FROM with_prev
ORDER BY month_start;
```

| month_start | total_net | prev_month_net | diff_mom | mom_growth_pct |
|---|---|---|---|---|
| 2025-10-01 | 1090.00 | NULL | NULL | NULL |
| 2025-11-01 | 1336.00 | 1090.00 | 246.00 | 22.6 |
| 2025-12-01 | 1205.00 | 1336.00 | -131.00 | -9.8 |
| 2026-01-01 | 5302.00 | 1205.00 | 4097.00 | 340.0 |
| 2026-02-01 | 2095.00 | 5302.00 | -3207.00 | -60.5 |
| 2026-03-01 | 5086.00 | 2095.00 | 2991.00 | 142.8 |

**ขั้นตอนของ Query**

| CTE | ได้อะไร |
|---|---|
| `all_sales` | รวมรายการ 2 ช่วงเวลา (50 + 141 = 191 แถว) |
| `monthly` | 1 แถวต่อเดือน (6 แถว) |
| `with_prev` | เพิ่มยอดเดือนก่อนด้วย `LAG` (คำนวณ `LAG` ครั้งเดียวในขั้นนี้ แล้วนำไปใช้ซ้ำ ไม่ต้องเขียน `LAG` 3 รอบ) |
| `SELECT` หลัก | คำนวณผลต่างและ % |

> [!WARNING] ตีความ % ให้ระวัง
> ยอดเดือนมกราคม 2026 สูงกว่าธันวาคม 340% ส่วนหนึ่งเพราะตาราง archive มีจำนวนรายการต่อเดือนน้อยกว่ามาก (13–19 รายการ เทียบกับ 30–60 รายการ) ก่อนสรุปว่า "ยอดขายโตขึ้น 3 เท่า" ต้องตรวจว่าข้อมูลสองช่วงมาจากแหล่งเดียวกันและครบเหมือนกันหรือไม่

## YoY: เทียบกับเดือนเดียวกันของปีก่อน

ชุดข้อมูลหลักมีข้อมูลเพียง 6 เดือน จึงใช้ตาราง `monthly_sales` (ยอดรวมรายเดือนของบริษัทสมมติ ม.ค. 2024 – มิ.ย. 2025, 18 แถว จากไฟล์ตารางเสริม) ตัวอย่างข้อมูลต้นทาง

| month_start | net_sales |
|---|---|
| 2024-01-01 | 120000.00 |
| 2024-02-01 | 112000.00 |
| 2024-03-01 | 125000.00 |
| … | … |
| 2025-01-01 | 132000.00 |
| 2025-02-01 | 118000.00 |
| 2025-03-01 | 120000.00 |

**วิธีที่แนะนำ: JOIN ตัวเองที่เดือนเดียวกันของปีก่อน**

```sql {verify}
SELECT
  cur.month_start,
  cur.net_sales,
  prev.net_sales                    AS last_year_sales,
  cur.net_sales - prev.net_sales    AS diff_yoy,
  ROUND((cur.net_sales - prev.net_sales) * 100.0 / NULLIF(prev.net_sales, 0), 1) AS yoy_growth_pct
FROM monthly_sales AS cur
LEFT JOIN monthly_sales AS prev
  ON prev.month_start = ADD_MONTHS(cur.month_start, -12)
WHERE cur.month_start >= DATE'2025-01-01'
ORDER BY cur.month_start;
```

| month_start | net_sales | last_year_sales | diff_yoy | yoy_growth_pct |
|---|---|---|---|---|
| 2025-01-01 | 132000.00 | 120000.00 | 12000.00 | 10.0 |
| 2025-02-01 | 118000.00 | 112000.00 | 6000.00 | 5.4 |
| 2025-03-01 | 120000.00 | 125000.00 | -5000.00 | -4.0 |
| 2025-04-01 | 125000.00 | 118000.00 | 7000.00 | 5.9 |
| 2025-05-01 | 133000.00 | 121000.00 | 12000.00 | 9.9 |
| 2025-06-01 | 127000.00 | 116000.00 | 11000.00 | 9.5 |

**อธิบาย**

| ส่วน | ความหมาย |
|---|---|
| `monthly_sales AS cur` / `AS prev` | ใช้ตารางเดียวกันสองครั้งในบทบาทต่างกัน (เรียกว่า **Self Join**) |
| `ADD_MONTHS(cur.month_start, -12)` | วันแรกของเดือนเดียวกันในปีก่อน เช่น 2025-03-01 → 2024-03-01 |
| `LEFT JOIN` | ถ้าปีก่อนไม่มีข้อมูลเดือนนั้น ยังเห็นเดือนปัจจุบัน แต่ `last_year_sales` เป็น NULL |
| `WHERE cur.month_start >= ...` | กรองเฉพาะฝั่ง `cur` ข้อมูลฝั่ง `prev` ไม่ถูกตัด เพราะใช้ในเงื่อนไข JOIN |

**ทำไมแนะนำ JOIN มากกว่า `LAG(net_sales, 12)`:** `LAG(..., 12)` ดึงค่าจาก "12 **แถว**ก่อนหน้า" ไม่ใช่ "12 **เดือน**ก่อนหน้า" ถ้ามีเดือนไหนขาดหายไป (ร้านปิดปรับปรุงทั้งเดือน หรือโหลดข้อมูลไม่ครบ) ผลจะเลื่อนผิดเดือนโดยไม่มี Error ส่วนการ JOIN ด้วยวันที่จะจับคู่เดือนที่ถูกต้องเสมอ

> [!MISTAKE] LAG ร่วมกับ WHERE ใน Query ชั้นเดียว

```sql {verify}
SELECT
  month_start,
  net_sales,
  LAG(net_sales, 12) OVER (ORDER BY month_start) AS last_year_sales
FROM monthly_sales
WHERE month_start >= DATE'2025-01-01'
ORDER BY month_start;
```

| month_start | net_sales | last_year_sales |
|---|---|---|
| 2025-01-01 | 132000.00 | NULL |
| 2025-02-01 | 118000.00 | NULL |
| 2025-03-01 | 120000.00 | NULL |
| 2025-04-01 | 125000.00 | NULL |
| 2025-05-01 | 133000.00 | NULL |
| 2025-06-01 | 127000.00 | NULL |

ได้ NULL ทุกแถว ไม่มี Error เพราะตามลำดับเชิงตรรกะ (บทที่ 13) `WHERE` ตัดข้อมูลปี 2024 ทิ้ง**ก่อน**ที่ `LAG` จะคำนวณ จึงไม่มีแถวของปีก่อนให้ดึง วิธีแก้คือคำนวณ `LAG` ใน CTE กับข้อมูลทั้งหมดก่อน แล้วจึงกรองในชั้นนอก

```sql {verify}
WITH with_last_year AS (
  SELECT
    month_start,
    net_sales,
    LAG(net_sales, 12) OVER (ORDER BY month_start) AS last_year_sales
  FROM monthly_sales
)
SELECT
  month_start,
  net_sales,
  last_year_sales
FROM with_last_year
WHERE month_start >= DATE'2025-01-01'
ORDER BY month_start;
```

| month_start | net_sales | last_year_sales |
|---|---|---|
| 2025-01-01 | 132000.00 | 120000.00 |
| 2025-02-01 | 118000.00 | 112000.00 |
| 2025-03-01 | 120000.00 | 125000.00 |
| 2025-04-01 | 125000.00 | 118000.00 |
| 2025-05-01 | 133000.00 | 121000.00 |
| 2025-06-01 | 127000.00 | 116000.00 |

ได้ผลตรงกับวิธี JOIN เพราะข้อมูลชุดนี้มีครบทุกเดือน แต่วิธีนี้ยังมีความเสี่ยงเรื่องเดือนขาดหายตามที่อธิบายไว้

## เทียบสองช่วงเวลาที่กำหนดในแถวเดียว

**สถานการณ์:** เปรียบเทียบยอดขายรายสาขาของเดือนมีนาคมกับกุมภาพันธ์ 2026 พร้อมผลต่างและ % เติบโต

```sql {verify}
WITH store_month AS (
  SELECT
    store_id,
    SUM(CASE WHEN sale_date >= DATE'2026-02-01' AND sale_date < DATE'2026-03-01'
             THEN net_amount ELSE 0 END) AS feb_net,
    SUM(CASE WHEN sale_date >= DATE'2026-03-01' AND sale_date < DATE'2026-04-01'
             THEN net_amount ELSE 0 END) AS mar_net
  FROM sales
  WHERE sale_date >= DATE'2026-02-01'
    AND sale_date <  DATE'2026-04-01'
  GROUP BY store_id
)
SELECT
  store_id,
  feb_net,
  mar_net,
  mar_net - feb_net                                          AS diff_thb,
  ROUND((mar_net - feb_net) * 100.0 / NULLIF(feb_net, 0), 1) AS growth_pct
FROM store_month
ORDER BY store_id;
```

| store_id | feb_net | mar_net | diff_thb | growth_pct |
|---|---|---|---|---|
| S01 | 583.00 | 1285.00 | 702.00 | 120.4 |
| S02 | 254.00 | 1748.00 | 1494.00 | 588.2 |
| S03 | 755.00 | 418.00 | -337.00 | -44.6 |
| S04 | 503.00 | 972.00 | 469.00 | 93.2 |
| S05 | 0.00 | 663.00 | 663.00 | NULL |

- `SUM(CASE WHEN ...)` แยกยอดสองช่วงเป็นสองคอลัมน์ในแถวเดียวกัน
- `WHERE` กรองให้เหลือเฉพาะสองเดือนที่ใช้ ลดข้อมูลก่อนสรุป
- S05 เปิดเดือนมีนาคม ยอดกุมภาพันธ์จึงเป็น 0 และ `NULLIF` ทำให้ % เป็น NULL (หารศูนย์ไม่ได้) ซึ่งถูกต้องกว่าการแสดง "เติบโต 100%" หรือ Error

## เปรียบเทียบให้ยุติธรรม

- **เทียบช่วงที่ยาวเท่ากัน:** เดือนกุมภาพันธ์มี 28 วัน มีนาคมมี 31 วัน ถ้าต้องการเทียบอย่างยุติธรรม อาจใช้ยอดเฉลี่ยต่อวันแทนยอดรวม
- **ระวังเดือนที่ยังไม่จบ:** ถ้าวันนี้คือวันที่ 10 การเทียบยอด "เดือนนี้" กับ "ทั้งเดือนที่แล้ว" จะต่ำเกินจริงเสมอ ให้เทียบช่วงวันที่เดียวกัน (Month-to-date กับวันที่ 1–10 ของเดือนก่อน)
- **ระวังสาขาที่เพิ่งเปิดหรือปิด:** ใช้การเทียบแบบ "สาขาเดิม" (Same-store) ถ้าต้องการวัดการเติบโตที่แท้จริง
- **ระบุแหล่งข้อมูลและนิยาม:** ยอดก่อนหรือหลังทำความสะอาด รวมการรับคืนหรือไม่

## ฝึกทำ

**โจทย์:** จากตาราง `monthly_sales` เปรียบเทียบยอดขายรวมครึ่งปีแรก (ม.ค.–มิ.ย.) ของปี 2025 กับปี 2024 ในแถวเดียว พร้อม % เติบโต

:::answer ดูเฉลยและคำอธิบาย
```sql {verify}
WITH half_year AS (
  SELECT
    SUM(CASE WHEN month_start >= DATE'2024-01-01' AND month_start < DATE'2024-07-01'
             THEN net_sales ELSE 0 END) AS h1_2024,
    SUM(CASE WHEN month_start >= DATE'2025-01-01' AND month_start < DATE'2025-07-01'
             THEN net_sales ELSE 0 END) AS h1_2025
  FROM monthly_sales
)
SELECT
  h1_2024,
  h1_2025,
  h1_2025 - h1_2024                                          AS diff_thb,
  ROUND((h1_2025 - h1_2024) * 100.0 / NULLIF(h1_2024, 0), 1) AS growth_pct
FROM half_year;
```

| h1_2024 | h1_2025 | diff_thb | growth_pct |
|---|---|---|---|
| 712000.00 | 755000.00 | 43000.00 | 6.0 |

**เหตุผล:** ใช้ `SUM(CASE WHEN ...)` แยกสองช่วงเวลาเป็นสองคอลัมน์ แล้วคำนวณผลต่างในชั้นนอก ช่วงเวลาทั้งสองยาว 6 เดือนเท่ากัน จึงเทียบได้ยุติธรรม (ตาราง `monthly_sales` เก็บยอดรายเดือน 1 แถวต่อเดือน การกรองด้วย `month_start` จึงครอบคลุมทั้งเดือน)
:::

ดูสูตรที่ [ยอดขายรายวันครบทุกวัน](#/formula/f-daily-sales-calendar), [MoM](#/formula/f-mom-growth), [YoY](#/formula/f-yoy-comparison) และ [เทียบสองช่วงเวลา](#/formula/f-period-compare)
