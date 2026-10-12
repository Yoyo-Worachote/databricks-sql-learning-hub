## สูตรนี้คืออะไร

`IS NULL` / `IS NOT NULL` เป็นวิธีเดียวที่ถูกต้องในการตรวจค่าว่าง เพราะ SQL ใช้ตรรกะ 3 ค่า: การเปรียบเทียบใด ๆ กับ NULL ด้วย `=`, `<>`, `IN`, `NOT IN` ได้ **unknown** (ไม่ใช่ true) แถวนั้นจึงไม่ถูกเลือก

**ใช้แก้ปัญหา:** หาข้อมูลที่ไม่ครบ หาลูกค้าที่ไม่ใช่สมาชิก หรือแถวที่หาคู่ไม่เจอหลัง LEFT JOIN

## รูปแบบ (Syntax)

```sql
SELECT column_1
FROM table_name
WHERE column_2 IS NULL;          -- ไม่มีค่า

SELECT column_1
FROM table_name
WHERE column_2 IS NOT NULL;      -- มีค่า
```

## ตัวอย่างข้อมูลต้นทาง

ตาราง `sales`: `customer_id` เป็น NULL 29 แถว (ลูกค้าทั่วไป) และมีค่า 112 แถว

## SQL Query ฉบับเต็มและผลลัพธ์

**ผิด: ใช้ = NULL**

```sql {verify}
SELECT COUNT(*) AS non_member_rows
FROM sales
WHERE customer_id = NULL;
```

| non_member_rows |
|---|
| 0 |

**ถูก: ใช้ IS NULL**

```sql {verify}
SELECT COUNT(*) AS non_member_rows
FROM sales
WHERE customer_id IS NULL;
```

| non_member_rows |
|---|
| 29 |

**กับดัก NOT IN:** P010 (หมวดเป็น NULL) หายไป ทั้งที่ไม่ใช่ Snack หรือ Beverage

```sql {verify}
SELECT product_id, category
FROM products
WHERE category NOT IN ('Snack', 'Beverage')
ORDER BY product_id;
```

| product_id | category |
|---|---|
| P007 | Personal Care |
| P008 | Personal Care |
| P009 | Personal Care |
| P011 | Household |
| P012 | Household |

แก้โดยเพิ่ม `OR category IS NULL`

```sql {verify}
SELECT product_id, category
FROM products
WHERE category NOT IN ('Snack', 'Beverage')
   OR category IS NULL
ORDER BY product_id;
```

| product_id | category |
|---|---|
| P007 | Personal Care |
| P008 | Personal Care |
| P009 | Personal Care |
| P010 | NULL |
| P011 | Household |
| P012 | Household |

## อธิบายทีละส่วน

| เงื่อนไข | เมื่อค่าเป็น NULL ได้ |
|---|---|
| `col = NULL` | unknown → ไม่ถูกเลือก (ทุกแถว) |
| `col IS NULL` | true |
| `col NOT IN ('a', 'b')` | unknown → ไม่ถูกเลือก |
| `col <> 'a'` | unknown → ไม่ถูกเลือก |

## ข้อผิดพลาดที่พบบ่อย

- เขียน `= NULL` หรือ `<> NULL` ได้ผลว่างโดยไม่มี Error
- ใช้ `NOT IN` / `<>` แล้วแถว NULL หายเงียบ ๆ
- `NOT IN (SELECT col FROM ...)` ที่ Subquery มี NULL แม้ 1 แถว จะได้ผลว่าง**ทั้งหมด** ใช้ `NOT EXISTS` แทน

## ข้อควรระวังและกรณีพิเศษ

- ข้อความว่าง `''` และช่องว่าง `'  '` ไม่ใช่ NULL ตรวจด้วย `NULLIF(TRIM(col), '') IS NULL`
- หลัง LEFT JOIN ให้ตรวจ NULL ที่**คอลัมน์ Key** ของตารางขวา (เช่น `s.sale_id IS NULL`) ไม่ใช่คอลัมน์ที่อาจเป็น NULL อยู่แล้วในข้อมูล

## วิธีอื่นที่ใช้แทนกันได้

- `col <=> NULL` (Null-safe equal ของ Databricks) ให้ true เมื่อเป็น NULL ทั้งคู่ อ่านยากกว่า `IS NULL`
- `count_if(col IS NULL)` สำหรับนับ ([ดูสูตร](#/formula/f-null-profile))

## แบบฝึกหัด

**โจทย์:** หารายการขายของสาขา S02 ที่ไม่ได้บันทึกส่วนลด แสดง `sale_id`, `sale_date`, `net_amount`

:::answer
```sql {verify}
SELECT
  sale_id,
  sale_date,
  net_amount
FROM sales
WHERE store_id = 'S02'
  AND discount_amount IS NULL
ORDER BY sale_id;
```

| sale_id | sale_date | net_amount |
|---|---|---|
| T0014 | 2026-01-07 | 59.00 |
| T0021 | 2026-01-09 | 75.00 |
| T0050 | 2026-01-27 | 90.00 |
| T0059 | 2026-01-31 | 39.00 |
| T0081 | 2026-02-19 | 60.00 |
| T0100 | 2026-03-03 | 75.00 |
| T0140 | 2026-03-31 | 267.00 |

**เหตุผล:** ใช้ `IS NULL` ร่วมกับเงื่อนไขสาขาด้วย `AND` ได้ 7 แถว ตรงกับจำนวน `discount_not_recorded` ของ S02 ในสูตร COALESCE/NULLIF
:::
