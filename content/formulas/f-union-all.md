## สูตรนี้คืออะไร

`UNION ALL` ต่อผลลัพธ์หลาย Query **แนวตั้ง** (เพิ่มแถว) ทุก Query ต้องมีจำนวนคอลัมน์เท่ากัน และชนิดข้อมูลเข้ากันได้**ตามลำดับตำแหน่ง** ชื่อคอลัมน์ใช้ตาม Query แรก

| | UNION ALL | UNION | EXCEPT | INTERSECT |
|---|---|---|---|---|
| ผล | ทุกแถว | ตัดแถวซ้ำ | มีใน A ไม่มีใน B | มีทั้งคู่ |

**ใช้เมื่อ:** ข้อมูลเรื่องเดียวกันแยกเก็บหลายตาราง (คนละปี คนละระบบ) หรือรวมผลตรวจหลายแบบเป็นตารางเดียว

## รูปแบบ (Syntax)

```sql
SELECT 'source_a' AS source, col_1, col_2 FROM table_a
UNION ALL
SELECT 'source_b', col_1, col_2 FROM table_b;
```

## ตัวอย่างข้อมูลต้นทาง

`sales_archive_2025` (ต.ค.–ธ.ค. 2025, 50 แถว) และ `sales` (ม.ค.–มี.ค. 2026, 141 แถว) มีโครงสร้างเหมือนกัน

## SQL Query ฉบับเต็มและผลลัพธ์

```sql {verify}
SELECT
  DATE_FORMAT(sale_date, 'yyyy-MM') AS year_month,
  COUNT(*)                          AS line_count,
  SUM(net_amount)                   AS total_net
FROM (
  SELECT sale_date, net_amount FROM sales_archive_2025
  UNION ALL
  SELECT sale_date, net_amount FROM sales
) AS all_sales
GROUP BY DATE_FORMAT(sale_date, 'yyyy-MM')
ORDER BY year_month;
```

| year_month | line_count | total_net |
|---|---|---|
| 2025-10 | 19 | 1090.00 |
| 2025-11 | 18 | 1336.00 |
| 2025-12 | 13 | 1205.00 |
| 2026-01 | 60 | 5302.00 |
| 2026-02 | 30 | 2095.00 |
| 2026-03 | 51 | 5086.00 |

## อธิบายทีละส่วน

- Query ใน `FROM (...)` ต่อแถวได้ 50 + 141 = 191 แถว ตั้งชื่อว่า `all_sales`
- เลือกเฉพาะ 2 คอลัมน์ที่ใช้ ทั้งสอง Query เรียงคอลัมน์เหมือนกัน
- `DATE_FORMAT(..., 'yyyy-MM')` ได้ข้อความเดือนเพื่อแสดงผล (ถ้าจะใช้ต่อเป็นวันที่ใช้ `DATE_TRUNC`)

**ตรวจ:** ผลรวม `line_count` = 191

## ข้อผิดพลาดที่พบบ่อย

- **ลำดับคอลัมน์สลับ** (เช่น `quantity, net_amount` กับ `net_amount, quantity`) ไม่ Error แต่ค่าผิดทั้งหมด
- จำนวนคอลัมน์ไม่เท่ากัน → Error `NUM_COLUMNS_MISMATCH`
- ใช้ `UNION` แทน `UNION ALL` แล้วรายการที่บังเอิญเหมือนกันหายไป
- ใช้ `SELECT *` ทั้งสองฝั่ง แล้ววันหนึ่งตารางหนึ่งเพิ่มคอลัมน์

## ข้อควรระวังและกรณีพิเศษ

- ใส่คอลัมน์ป้ายแหล่งที่มา (เช่น `'Q4-2025' AS period`) เพื่อแยกและตรวจสอบได้
- `ORDER BY` ใส่ครั้งเดียวท้ายสุด
- ถ้าชนิดต่างกัน ให้ `CAST` ให้ตรงกัน เช่น `CAST(NULL AS DECIMAL(12,2))`

## วิธีอื่นที่ใช้แทนกันได้

- เขียนชื่อคอลัมน์และเรียงลำดับให้เหมือนกันทุก Query ทุกครั้ง แทนการพึ่ง `SELECT *`
- ถ้าข้อมูลอยู่คนละตารางเป็นประจำ ควรให้ทีม Data สร้าง View รวมไว้

## แบบฝึกหัด

**โจทย์:** เทียบยอดขายรายสาขาของ Q4-2025 (archive) กับ Q1-2026 ในแถวเดียว ใช้ UNION ALL พร้อมคอลัมน์ป้ายช่วงเวลา

:::answer
```sql {verify}
WITH all_sales AS (
  SELECT 'Q4-2025' AS period, store_id, net_amount FROM sales_archive_2025
  UNION ALL
  SELECT 'Q1-2026', store_id, net_amount FROM sales
)
SELECT
  store_id,
  SUM(CASE WHEN period = 'Q4-2025' THEN net_amount ELSE 0 END) AS q4_2025_net,
  SUM(CASE WHEN period = 'Q1-2026' THEN net_amount ELSE 0 END) AS q1_2026_net
FROM all_sales
GROUP BY store_id
ORDER BY store_id;
```

| store_id | q4_2025_net | q1_2026_net |
|---|---|---|
| S01 | 1072.00 | 4348.00 |
| S02 | 840.00 | 3230.00 |
| S03 | 855.00 | 1624.00 |
| S04 | 864.00 | 2618.00 |
| S05 | 0.00 | 663.00 |

**เหตุผล:** ป้าย `period` ทำให้แยกแหล่งข้อมูลหลังต่อแถวได้ แล้วใช้ `SUM(CASE WHEN ...)` แยกเป็นคอลัมน์ S05 ไม่มียอดใน Q4 เพราะยังไม่เปิด
:::
