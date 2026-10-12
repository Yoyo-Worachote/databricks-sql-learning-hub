## สูตรนี้คืออะไร

| ตัวดำเนินการ | ความหมาย | เท่ากับ |
|---|---|---|
| `col IN ('a', 'b')` | เท่ากับค่าใดค่าหนึ่งในรายการ | `col = 'a' OR col = 'b'` |
| `col NOT IN ('a', 'b')` | ไม่เท่ากับทุกค่าในรายการ | `col <> 'a' AND col <> 'b'` |
| `col BETWEEN x AND y` | อยู่ในช่วง **รวม**ค่าปลายทั้งสองด้าน | `col >= x AND col <= y` |
| `col LIKE '%abc%'` | ตรงตามรูปแบบ (แยกตัวพิมพ์) | — |
| `col ILIKE '%abc%'` | ตรงตามรูปแบบ ไม่สนตัวพิมพ์ (Databricks) | `LOWER(col) LIKE '%abc%'` |

**Wildcard ของ LIKE:** `%` = ตัวอักษรกี่ตัวก็ได้ (รวม 0 ตัว), `_` = 1 ตัวพอดี

**ใช้แก้ปัญหา:** เขียนเงื่อนไขหลายค่า ช่วงค่า หรือค้นหาข้อความบางส่วนให้สั้นและอ่านง่าย

## รูปแบบ (Syntax)

```sql
SELECT column_1
FROM table_name
WHERE category IN ('value_1', 'value_2')
  AND price BETWEEN 10 AND 50
  AND name LIKE '%keyword%';
```

## ตัวอย่างข้อมูลต้นทาง

ตาราง `products` (12 แถว) ตัวอย่างบางแถว

<!-- verify: SELECT product_id, product_name, category, list_price FROM products WHERE product_id IN ('P002','P003','P004','P010') ORDER BY product_id -->
| product_id | product_name | category | list_price |
|---|---|---|---|
| P002 | ชาเขียว 500ml | Beverage | 20.00 |
| P003 | กาแฟกระป๋อง 180ml | Beverage | 18.00 |
| P004 | มันฝรั่งทอด 50g | Snack | 25.00 |
| P010 | น้ำยาล้างจาน 500ml | NULL | 39.00 |

## SQL Query ฉบับเต็มและผลลัพธ์

**โจทย์:** สินค้าหมวด Snack หรือ Household ที่ราคาป้ายระหว่าง 20 ถึง 50 บาท

```sql {verify}
SELECT
  product_id,
  product_name,
  category,
  list_price
FROM products
WHERE category IN ('Snack', 'Household')
  AND list_price BETWEEN 20 AND 50
ORDER BY list_price;
```

| product_id | product_name | category | list_price |
|---|---|---|---|
| P004 | มันฝรั่งทอด 50g | Snack | 25.00 |
| P006 | ถั่วอบเกลือ 40g | Snack | 30.00 |
| P011 | ถุงขยะ 30 ใบ | Household | 49.00 |

**ค้นหาข้อความ:** สินค้าที่ชื่อมีคำว่า 500ml

```sql {verify}
SELECT
  product_id,
  product_name
FROM products
WHERE product_name LIKE '%500ml%'
ORDER BY product_id;
```

| product_id | product_name |
|---|---|
| P002 | ชาเขียว 500ml |
| P010 | น้ำยาล้างจาน 500ml |

## อธิบายทีละส่วน

| ส่วน | ความหมาย |
|---|---|
| `category IN ('Snack', 'Household')` | หมวดเป็น Snack **หรือ** Household โดยไม่ต้องใส่วงเล็บ OR |
| `list_price BETWEEN 20 AND 50` | 20 ≤ ราคา ≤ 50 (P005 ราคา 15 และ P012 ราคา 99 จึงไม่ติด) |
| `LIKE '%500ml%'` | มีคำว่า 500ml อยู่ตรงไหนก็ได้ในชื่อ |

## ข้อผิดพลาดที่พบบ่อย

- คิดว่า `BETWEEN` ไม่รวมค่าปลาย (จริง ๆ รวม)
- ใช้ `BETWEEN` กับ TIMESTAMP แล้ววันสุดท้ายตกหล่น ([ดูสูตร](#/formula/f-date-range-filter))
- `NOT IN` กับคอลัมน์ที่มี NULL: แถวที่เป็น NULL จะหายไป (P010 ไม่ติดใน `category NOT IN ('Snack')`) ต้องเพิ่ม `OR category IS NULL`
- `NOT IN (SELECT ...)` ที่ Subquery มี NULL ได้ผลว่างทั้งหมด ใช้ `NOT EXISTS` แทน ([ดูสูตร](#/formula/f-anti-join))
- `LIKE` แยกตัวพิมพ์: `LIKE '%ML%'` ไม่เจอ `500ml`

## ข้อควรระวังและกรณีพิเศษ

- `LIKE '%abc%'` ที่ขึ้นต้นด้วย `%` ต้องตรวจทุกแถว ช้ากับตารางใหญ่มาก ถ้าค่าตรงตัวให้ใช้ `=` หรือ `IN`
- ถ้าต้องการค้นหาเครื่องหมาย `%` หรือ `_` ตามตัวอักษรจริง ให้กำหนดอักขระ Escape เช่น `LIKE '%10!%%' ESCAPE '!'` (หาข้อความที่มี 10%)
- `BETWEEN` กับข้อความเทียบตามลำดับตัวอักษร ควรใช้กับตัวเลขและวันที่เป็นหลัก

## วิธีอื่นที่ใช้แทนกันได้

- `ILIKE` (Databricks) หรือ `LOWER(col) LIKE ...` เมื่อไม่ต้องการแยกตัวพิมพ์
- `RLIKE` / `REGEXP` สำหรับรูปแบบซับซ้อน เช่น `product_id RLIKE '^P0[0-4]'`

## แบบฝึกหัด

**โจทย์:** หาสินค้าที่ชื่อมีหน่วย ml และราคาป้ายระหว่าง 15 ถึง 30 บาท เรียงราคาจากน้อยไปมาก

:::answer
```sql {verify}
SELECT
  product_id,
  product_name,
  list_price
FROM products
WHERE product_name LIKE '%ml%'
  AND list_price BETWEEN 15 AND 30
ORDER BY list_price;
```

| product_id | product_name | list_price |
|---|---|---|
| P003 | กาแฟกระป๋อง 180ml | 18.00 |
| P002 | ชาเขียว 500ml | 20.00 |

**เหตุผล:** สินค้าที่มี ml มี 6 ตัว แต่ที่ราคา 15–30 บาทมีเพียง 2 ตัว (น้ำดื่ม 7 บาท และสินค้า ml อื่นราคาสูงกว่า 30 จึงไม่ติด)
:::
