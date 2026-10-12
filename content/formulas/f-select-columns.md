## สูตรนี้คืออะไร

`SELECT` เลือกคอลัมน์ที่ต้องการแสดง `AS` ตั้งชื่อคอลัมน์ผลลัพธ์ (Alias) และเครื่องหมาย `+ - * /` สร้าง**คอลัมน์คำนวณ**ใหม่จากคอลัมน์เดิมทีละแถว

**ใช้แก้ปัญหา:** ตารางมีคอลัมน์มากเกินความจำเป็น ชื่อคอลัมน์อ่านยาก หรือต้องการค่าที่ไม่มีเก็บไว้ในตาราง เช่น กำไรต่อชิ้น

**ใช้เมื่อ:** ทุก Query ในงานจริง ทั้งรายงาน Dataset สำหรับ Power BI และการส่งออกไฟล์ให้ทีมอื่น

## รูปแบบ (Syntax)

```sql
SELECT
  column_1,
  column_2                AS new_name,
  column_3 * column_4     AS calculated_column
FROM table_name;
```

## ตัวอย่างข้อมูลต้นทาง

ตาราง `products` (บางคอลัมน์)

<!-- verify: SELECT product_id, product_name, unit_cost, list_price FROM products ORDER BY product_id -->
| product_id | product_name | unit_cost | list_price |
|---|---|---|---|
| P001 | น้ำดื่ม 600ml | 4.50 | 7.00 |
| P002 | ชาเขียว 500ml | 12.00 | 20.00 |
| P003 | กาแฟกระป๋อง 180ml | 10.00 | 18.00 |

## SQL Query ฉบับเต็มและผลลัพธ์

**โจทย์:** แสดงชื่อสินค้า ราคาป้าย ต้นทุน และกำไรต่อชิ้น 5 รายการแรกตามรหัสสินค้า

```sql {verify}
SELECT
  product_id,
  product_name             AS product,
  list_price               AS price_thb,
  unit_cost                AS cost_thb,
  list_price - unit_cost   AS margin_per_unit
FROM products
ORDER BY product_id
LIMIT 5;
```

| product_id | product | price_thb | cost_thb | margin_per_unit |
|---|---|---|---|---|
| P001 | น้ำดื่ม 600ml | 7.00 | 4.50 | 2.50 |
| P002 | ชาเขียว 500ml | 20.00 | 12.00 | 8.00 |
| P003 | กาแฟกระป๋อง 180ml | 18.00 | 10.00 | 8.00 |
| P004 | มันฝรั่งทอด 50g | 25.00 | 15.00 | 10.00 |
| P005 | ขนมปังกรอบ 60g | 15.00 | 8.00 | 7.00 |

## อธิบายทีละส่วน

| ส่วน | ความหมาย |
|---|---|
| `product_name AS product` | แสดงคอลัมน์เดิมในชื่อใหม่ ไม่ได้เปลี่ยนชื่อในตารางจริง |
| `list_price - unit_cost` | คำนวณทีละแถว แถว P001: 7.00 − 4.50 = 2.50 |
| `AS margin_per_unit` | ตั้งชื่อคอลัมน์คำนวณ ถ้าไม่ตั้ง ระบบจะตั้งชื่อเป็นสูตรซึ่งอ่านยาก |
| `ORDER BY product_id LIMIT 5` | ให้ได้ 5 แถวเดิมทุกครั้ง |

**ลำดับการทำงาน:** `FROM products` → คำนวณคอลัมน์ใน `SELECT` → `ORDER BY` → `LIMIT`

## ข้อผิดพลาดที่พบบ่อย

- **ลืมจุลภาค** ระหว่างคอลัมน์: `SELECT product_name product_id` ไม่ Error แต่ได้คอลัมน์เดียวชื่อ `product_id` ที่เก็บชื่อสินค้า
- **ใส่ชื่อคอลัมน์ใน `' '`**: `SELECT 'product_name'` ได้ข้อความคำว่า product_name ทุกแถว
- **จุลภาคเกิน**ก่อน `FROM`: Error `PARSE_SYNTAX_ERROR`
- ใช้ Alias ใน `WHERE` ของ Query เดียวกัน: ไม่ได้ (ดู [ลำดับการทำงาน](#/lesson/logical-query-order))

## ข้อควรระวังและกรณีพิเศษ

- ชื่อที่มีช่องว่างหรือภาษาไทยต้องครอบด้วย Backtick เช่น ``AS `กำไร (บาท)` `` แนะนำใช้ snake_case ภาษาอังกฤษแทน
- การคำนวณกับ `NULL` ได้ `NULL` เสมอ เช่น `quantity * unit_price - discount_amount` จะเป็น NULL ถ้า `discount_amount` เป็น NULL ใช้ `COALESCE(discount_amount, 0)` ถ้าตกลงแล้วว่า NULL หมายถึง 0
- การหารให้ใช้ `NULLIF(ตัวหาร, 0)` เพื่อกัน Error

## วิธีอื่นที่ใช้แทนกันได้

- `SELECT *` ใช้ได้กับการสำรวจตารางเล็กเท่านั้น
- Databricks รองรับ `SELECT * EXCEPT (col1, col2)` เพื่อเลือกทุกคอลัมน์ยกเว้นบางคอลัมน์ (เฉพาะ Databricks)

## แบบฝึกหัด

**โจทย์:** แสดงชื่อสินค้าหมวด Snack ราคาป้าย และราคาหลังลด 10% (ปัด 2 ตำแหน่ง) ตั้งชื่อว่า `promo_price`

:::answer
```sql {verify}
SELECT
  product_name,
  list_price,
  ROUND(list_price * 0.9, 2) AS promo_price
FROM products
WHERE category = 'Snack'
ORDER BY product_id;
```

| product_name | list_price | promo_price |
|---|---|---|
| มันฝรั่งทอด 50g | 25.00 | 22.50 |
| ขนมปังกรอบ 60g | 15.00 | 13.50 |
| ถั่วอบเกลือ 40g | 30.00 | 27.00 |

**เหตุผล:** ลด 10% = คูณ 0.9 คำนวณทีละแถว และ `ROUND(..., 2)` ทำให้ได้ทศนิยม 2 ตำแหน่ง
:::
