## อ่านข้อความ Error ของ Databricks

Error ไม่ใช่สิ่งที่น่ากลัว แต่เป็นตัวช่วยบอกว่าผิดตรงไหน ข้อความ Error ของ Databricks มีโครงสร้างคล้ายกันเสมอ

```text
[UNRESOLVED_COLUMN.WITH_SUGGESTION] A column, variable, or function parameter with name
`net_amout` cannot be resolved. Did you mean one of the following? [`net_amount`, ...].
SQLSTATE: 42703; line 3 pos 2
```

| ส่วน | ตัวอย่าง | บอกอะไร |
|---|---|---|
| **รหัส Error (Error Class)** ในวงเล็บเหลี่ยม | `[UNRESOLVED_COLUMN.WITH_SUGGESTION]` | ประเภทของปัญหา ใช้ค้นในตารางด้านล่างได้ทันที |
| ข้อความอธิบาย | `` `net_amout` cannot be resolved `` | ชื่อที่มีปัญหา |
| คำแนะนำ | `Did you mean ... net_amount` | ระบบมักเดาชื่อที่ถูกให้ |
| `SQLSTATE` | `42703` | รหัสมาตรฐาน ใช้ค้นเอกสารเพิ่มเติม |
| ตำแหน่ง | `line 3 pos 2` | บรรทัดที่ 3 ตัวอักษรที่ 2 ของ Query |

> [!TIP] ดูบรรทัดก่อนหน้าด้วย
> สำหรับ `PARSE_SYNTAX_ERROR` ตำแหน่งที่ Error ชี้มักเป็นจุดที่ระบบ "เริ่มงง" ซึ่งสาเหตุจริงอาจอยู่บรรทัดก่อนหน้า เช่น ลืมจุลภาคหรือวงเล็บไม่ครบ

## Error ที่พบบ่อยและวิธีแก้

| Error | ความหมาย | สาเหตุที่พบบ่อย | วิธีแก้ |
|---|---|---|---|
| `TABLE_OR_VIEW_NOT_FOUND` | ไม่พบตาราง | สะกดผิด / ยังไม่ได้เลือก Catalog-Schema / ไม่มีสิทธิ์ | `SHOW TABLES`, ใช้ชื่อเต็ม `catalog.schema.table`, ขอสิทธิ์ |
| `UNRESOLVED_COLUMN` | ไม่พบคอลัมน์ | สะกดผิด / ใช้ Alias ผิดตาราง / ใช้ Alias จาก SELECT ใน WHERE | `DESCRIBE TABLE`, อ่านชื่อที่ระบบแนะนำ |
| `PARSE_SYNTAX_ERROR` | รูปแบบคำสั่งผิด | ขาด/เกินจุลภาค วงเล็บไม่ครบ ลืม `END` ใส่ `;` ผิดที่ | ดูตำแหน่งที่ชี้และบรรทัดก่อนหน้า |
| `MISSING_AGGREGATION` | คอลัมน์ไม่อยู่ใน GROUP BY | SELECT คอลัมน์ที่ไม่ได้สรุปและไม่ได้จัดกลุ่ม | เพิ่มใน `GROUP BY` หรือใส่ฟังก์ชันสรุป |
| `INVALID_WHERE_CONDITION` | ใช้ฟังก์ชันสรุป/Window ใน WHERE | `WHERE` ทำงานก่อนการสรุป | ย้ายไป `HAVING` หรือใช้ CTE |
| `AMBIGUOUS_REFERENCE` | คอลัมน์กำกวม | ชื่อคอลัมน์เดียวกันมีหลายตารางใน JOIN | ใส่ Alias นำหน้า เช่น `s.store_id` |
| `DIVIDE_BY_ZERO` | หารด้วยศูนย์ | ตัวหารเป็น 0 | `NULLIF(ตัวหาร, 0)` หรือ `try_divide(a, b)` |
| `CAST_INVALID_INPUT` | แปลงชนิดไม่ได้ | ข้อความไม่ใช่ตัวเลข/วันที่ที่ถูกต้อง | `TRY_CAST` แล้วตรวจแถวที่ได้ NULL |
| `CANNOT_PARSE_TIMESTAMP` | อ่านวันที่ตามรูปแบบไม่ได้ | รูปแบบใน `TO_DATE` ไม่ตรงกับข้อความ | ตรวจ `dd/MM/yyyy` หรือใช้ `try_to_timestamp` |
| `NUM_COLUMNS_MISMATCH` | จำนวนคอลัมน์ไม่เท่ากัน | `UNION ALL` ของ Query ที่จำนวนคอลัมน์ต่างกัน | ทำให้ทุก Query มีคอลัมน์ครบและเรียงเหมือนกัน |
| Warehouse ไม่เริ่ม / รอนาน | ยังไม่ได้เลือก Warehouse หรือกำลังเริ่มทำงาน | Warehouse หยุดอัตโนมัติ | เลือก Warehouse แล้วรอ 1–3 นาที ถ้าไม่มีตัวเลือกให้ขอสิทธิ์ |
| `INSUFFICIENT_PERMISSIONS` / `PERMISSION_DENIED` | ไม่มีสิทธิ์ | ยังไม่ได้รับสิทธิ์อ่าน Schema/ตาราง | ติดต่อผู้ดูแลข้อมูล อย่าพยายามหาทางเลี่ยง |

## ตัวอย่าง Error และวิธีแก้

**1. สะกดชื่อคอลัมน์ผิด**

```sql {error}
SELECT sale_id, net_amout
FROM sales
LIMIT 5;
```

แก้: `net_amout` → `net_amount` (อ่านจากคำแนะนำ `Did you mean` ใน Error)

**2. คอลัมน์ไม่อยู่ใน GROUP BY**

```sql {error}
SELECT s.store_id, st.store_name, SUM(s.net_amount) AS total_net
FROM sales AS s
JOIN stores AS st ON s.store_id = st.store_id
GROUP BY s.store_id;
```

แก้: เพิ่ม `st.store_name` ใน `GROUP BY` → `GROUP BY s.store_id, st.store_name`

**3. จำนวนคอลัมน์ของ UNION ALL ไม่เท่ากัน**

```sql {error}
SELECT sale_date, net_amount FROM sales_archive_2025
UNION ALL
SELECT sale_date, store_id, net_amount FROM sales;
```

แก้: ให้ทั้งสอง Query เลือกคอลัมน์ชุดเดียวกันเรียงลำดับเดียวกัน

**4. แปลงข้อความที่ไม่ใช่ตัวเลข**

```sql {error}
SELECT CAST(amount_text AS DECIMAL(12,2)) AS amount
FROM sales_raw;
```

แก้: `TRY_CAST(REPLACE(amount_text, ',', '') AS DECIMAL(12,2))` แล้วตรวจแถวที่ได้ NULL (แถว `'N/A'`)

**5. จุลภาคเกินก่อน FROM**

```sql {error skip}
SELECT
  sale_id,
  net_amount,
FROM sales;
```

```text
[PARSE_SYNTAX_ERROR] Syntax error at or near 'FROM'. SQLSTATE: 42601
```

แก้: ลบจุลภาคหลัง `net_amount` (Error ชี้ที่ `FROM` แต่สาเหตุอยู่บรรทัดก่อนหน้า)

## ไม่มี Error แต่ผลลัพธ์ผิด: อันตรายกว่า

| อาการ | สาเหตุที่พบบ่อย | วิธีตรวจ |
|---|---|---|
| ได้ 0 แถว | `= NULL`, ตัวพิมพ์ไม่ตรง (`'cash'`), ช่วงวันที่ผิด, `NOT IN` กับ NULL | ลบเงื่อนไขทีละข้อเพื่อหาว่าข้อไหนตัดข้อมูลหมด ใช้ `SELECT DISTINCT` ดูค่าจริง |
| ยอดรวม**สูง**ผิดปกติหลัง JOIN | Key ฝั่งขวาซ้ำ (Fan-out) | นับแถวก่อน/หลัง JOIN สรุปตารางขวาให้เหลือ 1 แถวต่อ Key ก่อน |
| ยอดรวม**ต่ำ**ผิดปกติหลัง JOIN | INNER JOIN ตัดแถวที่หาคู่ไม่เจอ | เทียบกับ LEFT JOIN และหาแถวที่หาคู่ไม่เจอ |
| สาขา/สินค้าบางตัวหายไป | LEFT JOIN แล้วกรองตารางขวาใน WHERE | ย้ายเงื่อนไขไป `ON` |
| ได้แถวมากเกินคาด | ลืมวงเล็บเมื่อผสม AND/OR | ใส่วงเล็บครอบกลุ่ม OR |
| คอลัมน์มีค่าแปลก ๆ | ลืมจุลภาค (กลายเป็น Alias) หรือ `UNION ALL` คอลัมน์สลับตำแหน่ง | ตรวจชื่อและจำนวนคอลัมน์ในผลลัพธ์ |
| ค่าเปลี่ยนทุกครั้งที่รัน | `LIMIT` หรือ `ROW_NUMBER` ไม่มีตัวตัดสิน | เพิ่มคอลัมน์ตัดสินใน `ORDER BY` |
| % รวมแล้วไม่ใช่ 100 หรือผิดจากที่คาด | เฉลี่ยของ % หรือหารก่อนคูณ 100 | คำนวณจากผลรวม คูณ 100.0 ก่อนหาร |

## ขั้นตอนไล่หาข้อผิดพลาด 5 ขั้น

:::flow
อ่าน Error | อ่านรหัสในวงเล็บเหลี่ยมและบรรทัดที่ชี้ เทียบกับตารางในบทนี้
รันส่วนแรก | รันเฉพาะ FROM ... WHERE ก่อน ดูจำนวนแถวว่าสมเหตุสมผล
เพิ่มทีละ Clause | เพิ่ม GROUP BY, HAVING, ORDER BY ทีละส่วน แล้วรันทุกครั้ง
ตรวจทีละ CTE | เปลี่ยน SELECT สุดท้ายเป็น SELECT * FROM ชื่อ_CTE LIMIT 20 ไล่ทีละขั้น
เทียบยอดต้นทาง | เทียบจำนวนแถวและยอดรวมกับตารางต้นทางเสมอ
:::

> [!TIP] ใช้ Comment ปิดบรรทัดชั่วคราว
> ใส่ `--` หน้าบรรทัดที่สงสัยเพื่อปิดชั่วคราว แล้วรันดูว่าปัญหาหายหรือไม่ วิธีนี้หาเงื่อนไขที่ผิดได้เร็วโดยไม่ต้องลบโค้ด

## ฝึกทำ: แก้ Query ที่ผิด

**โจทย์ 1:** Query นี้ต้องการสาขาที่ยอดรวมเกิน 2,500 บาท แต่ Error แก้ให้ถูก

```sql {error}
SELECT store_id, SUM(net_amount) AS total_net
FROM sales
WHERE SUM(net_amount) > 2500
GROUP BY store_id;
```

:::answer ดูเฉลยและคำอธิบาย
```sql {verify}
SELECT
  store_id,
  SUM(net_amount) AS total_net
FROM sales
GROUP BY store_id
HAVING SUM(net_amount) > 2500
ORDER BY total_net DESC;
```

| store_id | total_net |
|---|---|
| S01 | 4348.00 |
| S02 | 3230.00 |
| S04 | 2618.00 |

**เหตุผล:** Error `INVALID_WHERE_CONDITION` เพราะ `WHERE` ทำงานก่อนการสรุป เงื่อนไขกับผลสรุปต้องอยู่ใน `HAVING`
:::

**โจทย์ 2:** Query นี้ต้องการนับรายการเงินสดของทุกสาขา (สาขาที่ไม่มีให้แสดง 0) รันผ่านแต่ได้แค่ 5 สาขา หาสาเหตุและแก้

```sql {verify}
SELECT st.store_id, COUNT(s.sale_id) AS cash_lines
FROM stores AS st
LEFT JOIN sales AS s ON st.store_id = s.store_id
WHERE s.payment_method = 'Cash'
GROUP BY st.store_id
ORDER BY st.store_id;
```

| store_id | cash_lines |
|---|---|
| S01 | 16 |
| S02 | 10 |
| S03 | 13 |
| S04 | 7 |
| S05 | 5 |

:::answer ดูเฉลยและคำอธิบาย
```sql {verify}
SELECT
  st.store_id,
  COUNT(s.sale_id) AS cash_lines
FROM stores AS st
LEFT JOIN sales AS s
  ON  st.store_id = s.store_id
  AND s.payment_method = 'Cash'
GROUP BY st.store_id
ORDER BY st.store_id;
```

| store_id | cash_lines |
|---|---|
| S01 | 16 |
| S02 | 10 |
| S03 | 13 |
| S04 | 7 |
| S05 | 5 |
| S06 | 0 |

**เหตุผล:** ไม่มี Error แต่ผลผิด S06 หายเพราะ `WHERE s.payment_method = 'Cash'` ตัดแถวที่ฝั่ง `sales` เป็น NULL หลัง LEFT JOIN ทิ้ง ย้ายเงื่อนไขไปไว้ใน `ON` แล้ว S06 จะกลับมาพร้อมค่า 0
:::

**โจทย์ 3:** Query นี้ Error แก้ให้ถูก

```sql {error}
WITH store_total AS (
  SELECT store_id, SUM(net_amount) AS store_net
  FROM sales
  GROUP BY store_id
);
SELECT * FROM store_total;
```

:::answer ดูเฉลยและคำอธิบาย
```sql {verify}
WITH store_total AS (
  SELECT
    store_id,
    SUM(net_amount) AS store_net
  FROM sales
  GROUP BY store_id
)
SELECT *
FROM store_total
ORDER BY store_id;
```

| store_id | store_net |
|---|---|
| S01 | 4348.00 |
| S02 | 3230.00 |
| S03 | 1624.00 |
| S04 | 2618.00 |
| S05 | 663.00 |

**เหตุผล:** `;` หลังวงเล็บปิดของ CTE ทำให้คำสั่งจบก่อนถึง `SELECT` หลัก CTE และ SELECT หลักเป็นคำสั่งเดียวกัน ใส่ `;` ครั้งเดียวท้ายสุด
:::

ดูตารางเปรียบเทียบความต่างของ Databricks กับระบบอื่นที่มักทำให้เกิด Error ได้ที่ [Databricks SQL ต่างจาก SQL อื่นอย่างไร](#/reference/dialects)
