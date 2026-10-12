## สูตรนี้คืออะไร

| ฟังก์ชัน | ทำอะไร | ตัวอย่าง | ผล |
|---|---|---|---|
| `CONCAT(a, b, ...)` หรือ `a \|\| b` | ต่อข้อความ | `CONCAT('S01', '-', 'P002')` | `'S01-P002'` |
| `CONCAT_WS(sep, a, b)` | ต่อพร้อมตัวคั่น ข้าม NULL | `CONCAT_WS('-', 'S01', NULL, 'P002')` | `'S01-P002'` |
| `SUBSTRING(s, start, len)` | ตัดข้อความ (เริ่มนับ 1) | `SUBSTRING('P007', 2, 3)` | `'007'` |
| `LEFT(s, n)` / `RIGHT(s, n)` | n ตัวแรก / ท้าย | `LEFT('2026-03', 4)` | `'2026'` |
| `LENGTH(s)` | จำนวนอักขระ | `LENGTH('S02')` | 3 |
| `LPAD(s, n, c)` | เติมด้านหน้าให้ยาว n | `LPAD('7', 3, '0')` | `'007'` |
| `INSTR(s, sub)` | ตำแหน่งที่พบ (ไม่พบ = 0) | `INSTR('Credit Card', 'Card')` | 8 |
| `SPLIT(s, sep)[i]` | แยกแล้วเลือกตัวที่ i (เริ่ม 0) | `SPLIT('S01-P002', '-')[1]` | `'P002'` |

## รูปแบบ (Syntax)

```sql
SELECT
  CONCAT(col_a, '-', col_b) AS combined_key,
  SUBSTRING(col_c, 1, 4)    AS prefix
FROM table_name;
```

## ตัวอย่างข้อมูลต้นทาง

<!-- verify: SELECT product_id, product_name, brand FROM products WHERE product_id IN ('P001','P007','P010') ORDER BY product_id -->
| product_id | product_name | brand |
|---|---|---|
| P001 | น้ำดื่ม 600ml | FreshCo |
| P007 | สบู่เหลว 450ml | CleanPro |
| P010 | น้ำยาล้างจาน 500ml | HomeMate |

## SQL Query ฉบับเต็มและผลลัพธ์

```sql {verify}
SELECT
  product_id,
  LENGTH(product_name)                    AS name_len,
  SUBSTRING(product_id, 2, 3)             AS id_number,
  CONCAT(product_id, ' - ', product_name) AS product_label,
  LOWER(brand)                            AS brand_lower
FROM products
WHERE product_id IN ('P001', 'P007', 'P010')
ORDER BY product_id;
```

| product_id | name_len | id_number | product_label | brand_lower |
|---|---|---|---|---|
| P001 | 13 | 001 | P001 - น้ำดื่ม 600ml | freshco |
| P007 | 14 | 007 | P007 - สบู่เหลว 450ml | cleanpro |
| P010 | 18 | 010 | P010 - น้ำยาล้างจาน 500ml | homemate |

## อธิบายทีละส่วน

- `SUBSTRING(product_id, 2, 3)` เริ่มตำแหน่งที่ 2 ยาว 3 ตัว: `P007` → `007`
- `LENGTH('น้ำดื่ม 600ml')` = 13 เพราะสระและวรรณยุกต์ไทยนับเป็นอักขระด้วย (น ้ ำ ด ื ่ ม = 7)

## ข้อผิดพลาดที่พบบ่อย

- `CONCAT` / `||` กับค่า NULL ได้ NULL ทั้งก้อน ใช้ `COALESCE` ก่อนต่อ หรือใช้ `CONCAT_WS`
- `SUBSTRING` เริ่มนับที่ 1 แต่ `SPLIT(...)[i]` เริ่มที่ 0
- ใช้ `+` ต่อข้อความแบบ SQL Server (ใน Databricks `+` เป็นการบวกตัวเลข)

## ข้อควรระวังและกรณีพิเศษ

- ตัดข้อความภาษาไทยตามจำนวนอักขระอาจได้วรรณยุกต์ลอย ๆ

## วิธีอื่นที่ใช้แทนกันได้

- `REGEXP_EXTRACT(s, pattern, group)` ดึงส่วนของข้อความตามรูปแบบ

## แบบฝึกหัด

**โจทย์:** สร้างรหัสอ้างอิง `สาขา-ปีเดือนวัน-เลขที่รายการ` เช่น `S05-20260302-T0093` ของ 3 รายการแรกของสาขา S05

:::answer
```sql {verify}
SELECT
  sale_id,
  CONCAT(store_id, '-', DATE_FORMAT(sale_date, 'yyyyMMdd'), '-', sale_id) AS sale_key
FROM sales
WHERE store_id = 'S05'
ORDER BY sale_id
LIMIT 3;
```

| sale_id | sale_key |
|---|---|
| T0093 | S05-20260302-T0093 |
| T0105 | S05-20260304-T0105 |
| T0114 | S05-20260310-T0114 |

**เหตุผล:** `DATE_FORMAT(..., 'yyyyMMdd')` เปลี่ยนวันที่เป็นข้อความ 8 หลักก่อนต่อด้วย `CONCAT`
:::
