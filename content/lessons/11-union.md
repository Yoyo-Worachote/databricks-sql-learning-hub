## UNION ALL คืออะไร: ต่อข้อมูลแนวตั้ง

| | JOIN | UNION ALL |
|---|---|---|
| ต่อแบบไหน | **แนวนอน** เพิ่มคอลัมน์จากอีกตาราง | **แนวตั้ง** เพิ่มแถวจากอีก Query |
| ใช้เมื่อ | ข้อมูลคนละเรื่องที่สัมพันธ์กันด้วย Key | ข้อมูลเรื่องเดียวกันที่แยกเก็บ เช่น คนละปี คนละระบบ |
| ตัวอย่าง | ยอดขาย + ชื่อสินค้า | ยอดขายปี 2025 + ยอดขายปี 2026 |

**รูปแบบ (Syntax)**

```sql
SELECT col_a, col_b FROM table_1
UNION ALL
SELECT col_a, col_b FROM table_2;
```

**กติกา:** ทุก Query ต้องมี**จำนวนคอลัมน์เท่ากัน** และ**ชนิดข้อมูลเข้ากันได้ตามลำดับตำแหน่ง** ชื่อคอลัมน์ของผลลัพธ์ใช้ตาม Query แรก

## ตัวอย่าง: รวมข้อมูลปีเก่ากับปีปัจจุบัน

**สถานการณ์:** ข้อมูล ต.ค.–ธ.ค. 2025 ถูกย้ายไปเก็บในตาราง `sales_archive_2025` ส่วนตาราง `sales` มีเฉพาะ ม.ค.–มี.ค. 2026 ผู้บริหารต้องการยอดขายรายเดือนต่อเนื่อง 6 เดือน

**ข้อมูลต้นทาง:** `sales_archive_2025` มี 50 แถว และ `sales` มี 141 แถว โครงสร้างคอลัมน์เหมือนกัน

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

**ลำดับการทำงาน**

:::flow
Query ใน FROM ( ... ) | ต่อแถวของสองตาราง ได้ 50 + 141 = 191 แถว ตั้งชื่อว่า all_sales
GROUP BY เดือน | แบ่ง 191 แถวเป็น 6 กลุ่มตามเดือน
SELECT | นับจำนวนรายการและรวมยอดของแต่ละเดือน
ORDER BY | เรียงตามเดือน
:::

**ตรวจผลรวม:** 19 + 18 + 13 + 60 + 30 + 51 = 191 แถว ตรงกับ 50 + 141

> [!TIP] เลือกเฉพาะคอลัมน์ที่ต้องใช้
> แม้สองตารางจะมีโครงสร้างเหมือนกัน ให้ระบุคอลัมน์แทน `SELECT *` เพราะถ้าวันหนึ่งตารางใดตารางหนึ่งเพิ่มคอลัมน์ Query จะ Error หรือร้ายกว่านั้นคือคอลัมน์สลับตำแหน่งโดยไม่รู้ตัว

## ติดป้ายแหล่งที่มาของแต่ละแถว

ใส่คอลัมน์ค่าคงที่เพื่อบอกว่าแถวมาจากไหน มีประโยชน์มากในการตรวจสอบ

```sql {verify}
SELECT 'Q4-2025' AS period, COUNT(*) AS line_count, SUM(net_amount) AS net_sales
FROM sales_archive_2025
UNION ALL
SELECT 'Q1-2026', COUNT(*), SUM(net_amount)
FROM sales;
```

| period | line_count | net_sales |
|---|---|---|
| Q4-2025 | 50 | 3631.00 |
| Q1-2026 | 141 | 12483.00 |

Query ที่สองไม่ต้องตั้งชื่อคอลัมน์ เพราะผลลัพธ์ใช้ชื่อจาก Query แรก เทคนิคนี้ใช้ทำตารางกระทบยอดได้ดี (บทที่ 19)

## UNION ต่างจาก UNION ALL อย่างไร

| | UNION ALL | UNION (หรือ UNION DISTINCT) |
|---|---|---|
| แถวที่ซ้ำกัน | **เก็บทุกแถว** | **ตัดแถวที่ซ้ำกันทั้งแถว**ออก |
| ความเร็ว | เร็วกว่า | ช้ากว่า เพราะต้องเทียบหาแถวซ้ำ |
| ใช้เมื่อ | รวมข้อมูลรายการ (ต้องการยอดครบ) | ต้องการรายการค่าที่ไม่ซ้ำจากหลายแหล่ง |

**ตัวอย่าง:** รวมรหัสลูกค้าจากทั้งสองตาราง

```sql {verify}
SELECT COUNT(*) AS row_count
FROM (
  SELECT customer_id FROM sales_archive_2025
  UNION ALL
  SELECT customer_id FROM sales
) AS t;
```

| row_count |
|---|
| 191 |

```sql {verify}
SELECT COUNT(*) AS row_count
FROM (
  SELECT customer_id FROM sales_archive_2025
  UNION
  SELECT customer_id FROM sales
) AS t;
```

| row_count |
|---|
| 21 |

`UNION ALL` ได้ 191 แถว (ทุกรายการ) ส่วน `UNION` ได้ 21 แถว คือรหัสลูกค้าที่ไม่ซ้ำ 20 รหัส บวก `NULL` อีก 1 แถว (UNION มองว่า `NULL` ซ้ำกันเอง จึงเหลือแถวเดียว)

> [!WARNING] อย่าใช้ UNION กับข้อมูลรายการขาย
> ถ้ามีรายการขายสองรายการที่ค่าทุกคอลัมน์บังเอิญเหมือนกัน `UNION` จะตัดเหลือรายการเดียว ยอดขายจะหายไป ใช้ `UNION ALL` เป็นค่าเริ่มต้น

## EXCEPT และ INTERSECT

นอกจากต่อแถวแล้ว ยังเทียบผลลัพธ์สองชุดได้

| คำสั่ง | ได้แถวที่… |
|---|---|
| `A EXCEPT B` | มีใน A แต่**ไม่มี**ใน B |
| `A INTERSECT B` | มีใน**ทั้ง** A และ B |

**ตัวอย่าง:** ลูกค้าสมาชิกที่ซื้อในไตรมาส 1 ปี 2026 แต่ไม่เคยซื้อในไตรมาส 4 ปี 2025 (ลูกค้าใหม่)

```sql {verify}
SELECT customer_id FROM sales
WHERE customer_id IS NOT NULL
EXCEPT
SELECT customer_id FROM sales_archive_2025
ORDER BY customer_id;
```

| customer_id |
|---|
| C013 |
| C017 |
| C020 |

> [!DATABRICKS] ชื่ออื่นของ EXCEPT
> Databricks รองรับ `MINUS` ซึ่งมีความหมายเดียวกับ `EXCEPT` (เป็นชื่อที่ Oracle ใช้) และ `EXCEPT` / `INTERSECT` ตัดแถวซ้ำในผลลัพธ์โดยอัตโนมัติ

## ข้อผิดพลาดที่พบบ่อย

> [!MISTAKE] ลำดับคอลัมน์ไม่ตรงกัน
> `UNION ALL` จับคู่คอลัมน์ตาม**ตำแหน่ง** ไม่ใช่ตามชื่อ ถ้าเขียน
> `SELECT quantity, net_amount FROM sales_archive_2025 UNION ALL SELECT net_amount, quantity FROM sales`
> ระบบจะไม่ Error (เพราะเป็นตัวเลขทั้งคู่) แต่ยอดเงินของปี 2026 จะไปอยู่ในคอลัมน์ `quantity` ตัวเลขผิดทั้งหมดโดยไม่รู้ตัว

- จำนวนคอลัมน์ไม่เท่ากัน จะเกิด Error `NUM_COLUMNS_MISMATCH`
- ชนิดข้อมูลเข้ากันไม่ได้ เช่น DATE กับตัวเลข จะเกิด Error
- ใช้ `UNION` แทน `UNION ALL` แล้วรายการที่บังเอิญเหมือนกันหายไป
- ใส่ `ORDER BY` ไว้ใน Query ย่อยแต่ละตัว (ให้ใส่ครั้งเดียวท้ายสุด)

## ฝึกทำ

**โจทย์:** สร้างตารางสรุป 2 แถว แสดงจำนวนรายการและยอดสุทธิของ "รายการปกติ" (`quantity` ระหว่าง 1–50) และ "รายการผิดปกติ" (`quantity` ≤ 0 หรือ > 50) จากตาราง `sales` แล้วตรวจว่าผลรวมเท่ากับทั้งตาราง

:::answer ดูเฉลยและคำอธิบาย
```sql {verify}
SELECT 'normal' AS line_type, COUNT(*) AS line_count, SUM(net_amount) AS total_net
FROM sales
WHERE quantity BETWEEN 1 AND 50
UNION ALL
SELECT 'abnormal', COUNT(*), SUM(net_amount)
FROM sales
WHERE quantity <= 0 OR quantity > 50;
```

| line_type | line_count | total_net |
|---|---|---|
| normal | 139 | 12093.00 |
| abnormal | 2 | 390.00 |

**เหตุผล:** แต่ละ Query ย่อยให้ 3 คอลัมน์ชนิดเดียวกัน จึงต่อกันได้ ตรวจผลรวม: 139 + 2 = 141 แถว และ 12,093 + 390 = 12,483 บาท เท่ากับทั้งตาราง แปลว่าเงื่อนไขสองกลุ่มครอบคลุมทุกแถวและไม่ซ้อนกัน
:::

ดูสูตรที่ [UNION ALL ต่อข้อมูลหลายตารางแนวตั้ง](#/formula/f-union-all)
