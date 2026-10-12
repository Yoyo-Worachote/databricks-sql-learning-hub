## สูตรนี้คืออะไร

**Scalar Subquery** คือ Query ย่อยที่คืน**ค่าเดียว** (1 แถว 1 คอลัมน์) นำไปใช้เหมือนค่าคงที่ใน `WHERE` หรือ `SELECT` เช่น ค่าเฉลี่ยของทั้งตาราง

**Correlated Subquery** คือ Subquery ที่อ้างคอลัมน์ของ Query หลัก จึงคำนวณใหม่ตามแต่ละแถว เช่น ค่าเฉลี่ยของ**หมวดเดียวกัน**

**ใช้แก้ปัญหา:** เขียน `WHERE price > AVG(price)` ตรง ๆ ไม่ได้ เพราะฟังก์ชันสรุปใช้ใน WHERE ไม่ได้

## รูปแบบ (Syntax)

```sql
SELECT col
FROM table_name
WHERE value_col > (SELECT AVG(value_col) FROM table_name);
```

## ตัวอย่างข้อมูลต้นทาง

ราคาป้ายสินค้า 12 ตัว รวม 579 บาท ค่าเฉลี่ย 48.25 บาท

## SQL Query ฉบับเต็มและผลลัพธ์

```sql {verify}
SELECT
  product_name,
  list_price
FROM products
WHERE list_price > (SELECT AVG(list_price) FROM products)
ORDER BY list_price DESC;
```

| product_name | list_price |
|---|---|
| แชมพู 400ml | 129.00 |
| กระดาษทิชชู 6 ม้วน | 99.00 |
| สบู่เหลว 450ml | 89.00 |
| ยาสีฟัน 160g | 59.00 |
| ถุงขยะ 30 ใบ | 49.00 |

## อธิบายทีละส่วน และลำดับการทำงาน

1. Subquery คำนวณ `AVG(list_price)` = 48.25 (ครั้งเดียว)
2. Query หลักเทียบแต่ละสินค้ากับ 48.25 เก็บที่มากกว่า (ถุงขยะ 49 บาทติดพอดี)
3. เรียงราคาจากมากไปน้อย

## ข้อผิดพลาดที่พบบ่อย

- Subquery คืนมากกว่า 1 แถว (เช่น ลืมเงื่อนไข) → Error ว่า Scalar Subquery ต้องคืนแถวเดียว
- ใช้ `=` กับ Subquery ที่คืนหลายแถว ต้องใช้ `IN (SELECT ...)`
- `NOT IN (SELECT ...)` ที่มี NULL ได้ผลว่าง ([ดูสูตร Anti-join](#/formula/f-anti-join))

## ข้อควรระวังและกรณีพิเศษ

- Correlated Subquery กับตารางใหญ่อาจช้า ทางเลือกคือสรุปค่าเฉลี่ยต่อกลุ่มใน CTE แล้ว JOIN หรือใช้ `AVG(...) OVER (PARTITION BY ...)`

## วิธีอื่นที่ใช้แทนกันได้

- `AVG(list_price) OVER ()` ใน CTE แล้วกรองชั้นนอก
- CTE เก็บค่าเฉลี่ยแล้ว `CROSS JOIN`

## แบบฝึกหัด

**โจทย์:** หาสินค้าที่ราคาป้ายสูงกว่าค่าเฉลี่ยของ**หมวดเดียวกัน** แสดงค่าเฉลี่ยของหมวดด้วย

:::answer
```sql {verify}
SELECT
  p.category,
  p.product_name,
  p.list_price,
  ROUND((SELECT AVG(p2.list_price)
         FROM products AS p2
         WHERE p2.category = p.category), 2) AS category_avg
FROM products AS p
WHERE p.list_price > (
  SELECT AVG(p2.list_price)
  FROM products AS p2
  WHERE p2.category = p.category
)
ORDER BY p.category, p.list_price DESC;
```

| category | product_name | list_price | category_avg |
|---|---|---|---|
| Beverage | ชาเขียว 500ml | 20.00 | 15.00 |
| Beverage | กาแฟกระป๋อง 180ml | 18.00 | 15.00 |
| Household | กระดาษทิชชู 6 ม้วน | 99.00 | 74.00 |
| Personal Care | แชมพู 400ml | 129.00 | 92.33 |
| Snack | ถั่วอบเกลือ 40g | 30.00 | 23.33 |
| Snack | มันฝรั่งทอด 50g | 25.00 | 23.33 |

**เหตุผล:** `p2.category = p.category` ทำให้ Subquery คำนวณค่าเฉลี่ยใหม่ตามหมวดของแต่ละแถว (Correlated) สินค้า P010 ที่ไม่มีหมวดไม่ปรากฏ เพราะ `NULL = NULL` ไม่เป็น true
:::
