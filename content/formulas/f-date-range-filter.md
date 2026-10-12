## สูตรนี้คืออะไร

กรองช่วงเวลาแบบ **ครึ่งเปิด (Half-open)**: `>=` วันเริ่ม และ `<` วันแรกของช่วงถัดไป

```sql
WHERE sale_date >= DATE'2026-02-01'
  AND sale_date <  DATE'2026-03-01'   -- ทั้งเดือนกุมภาพันธ์
```

**ข้อดี:** ไม่ต้องคิดว่าเดือนมีกี่วัน ใช้ได้ทั้ง DATE และ TIMESTAMP โดยข้อมูลวันสุดท้ายไม่ตกหล่น และระบบใช้ข้ามไฟล์ที่ไม่เกี่ยวข้องได้ (เร็ว)

## รูปแบบ (Syntax)

```sql
SELECT ...
FROM table_name
WHERE date_col >= DATE'yyyy-MM-dd'
  AND date_col <  DATE'yyyy-MM-dd';
```

## ตัวอย่างข้อมูลต้นทาง

`sales.sale_datetime` เป็น TIMESTAMP เช่น รายการวันที่ 31 ม.ค. เวลา 11:00 น. ซึ่ง "มากกว่า" `2026-01-31 00:00:00`

## SQL Query ฉบับเต็มและผลลัพธ์

**ผิด: BETWEEN กับ TIMESTAMP**

```sql {verify}
SELECT COUNT(*) AS jan_rows
FROM sales
WHERE sale_datetime BETWEEN TIMESTAMP'2026-01-01 00:00:00'
                        AND TIMESTAMP'2026-01-31 00:00:00';
```

| jan_rows |
|---|
| 57 |

**ถูก: ช่วงครึ่งเปิด**

```sql {verify}
SELECT COUNT(*) AS jan_rows
FROM sales
WHERE sale_datetime >= TIMESTAMP'2026-01-01 00:00:00'
  AND sale_datetime <  TIMESTAMP'2026-02-01 00:00:00';
```

| jan_rows |
|---|
| 60 |

## อธิบายทีละส่วน

- แบบผิดตกหล่น 3 รายการของวันที่ 31 ม.ค. ที่เกิดหลังเที่ยงคืน
- แบบถูก "น้อยกว่าวันที่ 1 ก.พ. เวลา 00:00" จึงครอบคลุมทุกวินาทีของวันที่ 31

## ข้อผิดพลาดที่พบบ่อย

- `BETWEEN '2026-01-01' AND '2026-01-31'` กับ TIMESTAMP
- เขียนวันที่รูปแบบอื่น เช่น `'31/01/2026'` (เป็นแค่ข้อความ)
- ครอบคอลัมน์ด้วยฟังก์ชัน `WHERE YEAR(sale_date) = 2026 AND MONTH(sale_date) = 1` ผลถูกแต่ช้ากับตารางใหญ่

## ข้อควรระวังและกรณีพิเศษ

- `BETWEEN` กับคอลัมน์ DATE (ไม่มีเวลา) ใช้ได้ถูกต้อง แต่ใช้แบบครึ่งเปิดเป็นนิสัยเดียวกันทุกกรณีจะปลอดภัยกว่า
- ช่วงวันที่เปรียบเทียบตาม Time Zone ของ Session

## วิธีอื่นที่ใช้แทนกันได้

- รายงานแบบเลื่อนช่วงอัตโนมัติ: `sale_date >= DATE_ADD(CURRENT_DATE(), -30)`

## แบบฝึกหัด

**โจทย์:** นับจำนวนรายการและยอดของสาขา S01 ในครึ่งแรกของเดือนมีนาคม 2026 (1–15 มี.ค.)

:::answer
```sql {verify}
SELECT
  COUNT(*)        AS line_count,
  SUM(net_amount) AS total_net
FROM sales
WHERE store_id = 'S01'
  AND sale_date >= DATE'2026-03-01'
  AND sale_date <  DATE'2026-03-16';
```

| line_count | total_net |
|---|---|
| 7 | 685.00 |

**เหตุผล:** "ถึงวันที่ 15" เขียนเป็น `< DATE'2026-03-16'` จึงครอบคลุมทั้งวันที่ 15
:::
