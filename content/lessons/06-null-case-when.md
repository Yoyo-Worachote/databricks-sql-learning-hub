## NULL คืออะไร

`NULL` แปลว่า **ไม่มีค่า หรือไม่ทราบค่า** ไม่ใช่ตัวเลข 0 ไม่ใช่ข้อความว่าง `''` และไม่ใช่คำว่า "NULL"

ในชุดข้อมูลฝึก `NULL` มีความหมายทางธุรกิจต่างกัน

| คอลัมน์ | NULL หมายถึง | จำนวนแถว |
|---|---|---|
| `sales.customer_id` | ลูกค้าทั่วไป ไม่ใช่สมาชิก (เป็นเรื่องปกติ) | 29 |
| `sales.discount_amount` | ไม่ได้บันทึกส่วนลด (ไม่รู้ว่ามีส่วนลดหรือไม่) | 20 |
| `products.category` | สินค้ายังไม่ได้กำหนดหมวด (P010) | 1 |
| `products.brand` | สินค้ายังไม่ได้กำหนดแบรนด์ (P006) | 1 |

> [!KEY] ถามเสมอว่า NULL หมายถึงอะไร
> ก่อนจะแทน `NULL` ด้วย 0 หรือคำอื่น ต้องรู้ความหมายทางธุรกิจก่อน "ไม่มีส่วนลด" กับ "ไม่ได้บันทึกส่วนลด" ให้ตัวเลขสรุปต่างกัน

## ทำไม = NULL ใช้ไม่ได้: ตรรกะ 3 ค่า

SQL มีผลของเงื่อนไข 3 แบบ คือ **จริง (true)**, **เท็จ (false)** และ **ไม่ทราบ (unknown)** การเปรียบเทียบอะไรก็ตามกับ `NULL` ด้วย `=`, `<>`, `>` จะได้ **unknown** และ `WHERE` เก็บเฉพาะแถวที่เป็น **true**

| เงื่อนไข | เมื่อ customer_id = 'C001' | เมื่อ customer_id เป็น NULL |
|---|---|---|
| `customer_id = 'C001'` | true | unknown → ไม่ถูกเลือก |
| `customer_id <> 'C001'` | false | unknown → ไม่ถูกเลือก |
| `customer_id = NULL` | unknown | unknown → **ไม่มีแถวไหนถูกเลือกเลย** |
| `customer_id IS NULL` | false | **true** |

> [!MISTAKE] ใช้ = NULL

```sql {verify}
SELECT COUNT(*) AS non_member_rows
FROM sales
WHERE customer_id = NULL;
```

| non_member_rows |
|---|
| 0 |

ได้ 0 เสมอโดยไม่มี Error ที่ถูกต้องคือ `IS NULL`

```sql {verify}
SELECT COUNT(*) AS non_member_rows
FROM sales
WHERE customer_id IS NULL;
```

| non_member_rows |
|---|
| 29 |

ดูรายละเอียดของแถวที่เป็น `NULL` (ใช้ `IS NOT NULL` ถ้าต้องการแถวที่มีค่า)

```sql {verify}
SELECT
  sale_id,
  customer_id,
  net_amount
FROM sales
WHERE customer_id IS NULL
ORDER BY sale_id
LIMIT 5;
```

| sale_id | customer_id | net_amount |
|---|---|---|
| T0007 | NULL | 36.00 |
| T0013 | NULL | 72.00 |
| T0015 | NULL | 118.00 |
| T0022 | NULL | 516.00 |
| T0030 | NULL | 18.00 |

## กับดัก NOT IN กับค่า NULL

**สถานการณ์:** อยากได้สินค้าที่ไม่ใช่ Snack และไม่ใช่ Beverage

```sql {verify}
SELECT product_id, category
FROM products
WHERE category NOT IN ('Snack', 'Beverage');
```

| product_id | category |
|---|---|
| P007 | Personal Care |
| P008 | Personal Care |
| P009 | Personal Care |
| P011 | Household |
| P012 | Household |

**ปัญหา:** P010 ที่ `category` เป็น `NULL` หายไป ทั้งที่ไม่ใช่ Snack หรือ Beverage เพราะ `NULL NOT IN (...)` ได้ unknown วิธีแก้คือบอกให้ชัดว่าต้องการแถวที่เป็น `NULL` ด้วย

```sql {verify}
SELECT product_id, category
FROM products
WHERE category NOT IN ('Snack', 'Beverage')
   OR category IS NULL;
```

| product_id | category |
|---|---|
| P007 | Personal Care |
| P008 | Personal Care |
| P009 | Personal Care |
| P010 | NULL |
| P011 | Household |
| P012 | Household |

> [!WARNING] NOT IN (SELECT ...) อันตรายกว่านั้นอีก
> ถ้าใช้ `NOT IN (SELECT column FROM ...)` แล้ว Subquery มีค่า `NULL` แม้แต่ค่าเดียว ผลลัพธ์จะว่างเปล่าทั้งหมด ให้ใช้ `NOT EXISTS` แทน (บทที่ 10 และ 12)

## COALESCE: แทนค่า NULL ด้วยค่าที่กำหนด

`COALESCE(a, b, c, ...)` คืน**ค่าแรกที่ไม่ใช่ NULL** อ่านว่า "โค-อะ-เลส"

```sql {verify}
SELECT
  product_id,
  COALESCE(category, 'Unknown') AS category,
  COALESCE(brand, 'No brand')   AS brand
FROM products
WHERE category IS NULL OR brand IS NULL;
```

| product_id | category | brand |
|---|---|---|
| P006 | Snack | No brand |
| P010 | Unknown | HomeMate |

- แถว P006: `category` มีค่า (Snack) จึงแสดงตามเดิม แต่ `brand` เป็น `NULL` จึงแสดง `'No brand'`
- แถว P010: `category` เป็น `NULL` จึงแสดง `'Unknown'`

ใช้บ่อยมากเวลาจัดกลุ่มรายงาน เพื่อให้แถวที่ไม่มีค่ารวมกันในกลุ่ม Unknown แทนที่จะแสดงเป็นช่องว่าง

## NULLIF: เปลี่ยนค่าที่ไม่ต้องการให้เป็น NULL

`NULLIF(a, b)` ทำงานกลับกับ COALESCE คือ **ถ้า a เท่ากับ b ให้คืน NULL** ไม่เช่นนั้นคืน a

```sql {verify}
SELECT
  sale_id,
  discount_amount,
  NULLIF(discount_amount, 0) AS discount_or_null
FROM sales
WHERE store_id = 'S05'
ORDER BY sale_id;
```

| sale_id | discount_amount | discount_or_null |
|---|---|---|
| T0093 | 0.00 | NULL |
| T0105 | 0.00 | NULL |
| T0114 | 10.00 | 10.00 |
| T0122 | 0.00 | NULL |
| T0125 | 0.00 | NULL |
| T0132 | 5.00 | 5.00 |
| T0133 | 0.00 | NULL |

**ใช้เมื่อไร**

- **กันหารด้วยศูนย์:** `ยอดขาย / NULLIF(จำนวน, 0)` ถ้าจำนวนเป็น 0 ผลเป็น `NULL` แทนที่จะ Error (บทที่ 8)
- **ทำให้ข้อความว่างนับเป็นค่าว่าง:** `NULLIF(TRIM(store_code), '')` เปลี่ยน `''` หรือ `'   '` เป็น `NULL` (บทที่ 19)

## CASE WHEN: สร้างกลุ่มหรือป้ายกำกับตามเงื่อนไข

`CASE WHEN` คือ **IF แบบหลายเงื่อนไข** ระบบตรวจทีละ `WHEN` จากบนลงล่าง **เจอข้อแรกที่จริงก็หยุด** ถ้าไม่มีข้อไหนจริงจะใช้ค่า `ELSE` (ถ้าไม่เขียน `ELSE` จะได้ `NULL`)

**รูปแบบ (Syntax)**

```sql
CASE
  WHEN condition_1 THEN 'label_1'
  WHEN condition_2 THEN 'label_2'
  ELSE 'label_other'
END AS new_column
```

**สถานการณ์:** ทีมการตลาดอยากแบ่งสินค้าเป็นกลุ่มราคา High (80 บาทขึ้นไป) / Medium (25–79.99) / Low (ต่ำกว่า 25)

```sql {verify}
SELECT
  product_name,
  list_price,
  CASE
    WHEN list_price >= 80 THEN 'High'
    WHEN list_price >= 25 THEN 'Medium'
    ELSE 'Low'
  END AS price_tier
FROM products
ORDER BY list_price DESC;
```

| product_name | list_price | price_tier |
|---|---|---|
| แชมพู 400ml | 129.00 | High |
| กระดาษทิชชู 6 ม้วน | 99.00 | High |
| สบู่เหลว 450ml | 89.00 | High |
| ยาสีฟัน 160g | 59.00 | Medium |
| ถุงขยะ 30 ใบ | 49.00 | Medium |
| น้ำยาล้างจาน 500ml | 39.00 | Medium |
| ถั่วอบเกลือ 40g | 30.00 | Medium |
| มันฝรั่งทอด 50g | 25.00 | Medium |
| ชาเขียว 500ml | 20.00 | Low |
| กาแฟกระป๋อง 180ml | 18.00 | Low |
| ขนมปังกรอบ 60g | 15.00 | Low |
| น้ำดื่ม 600ml | 7.00 | Low |

**ไล่การทำงานของแถว "ยาสีฟัน 160g" (59 บาท)**

:::flow
WHEN list_price >= 80 | 59 >= 80 เป็นเท็จ ไปข้อถัดไป
WHEN list_price >= 25 | 59 >= 25 เป็นจริง ได้ 'Medium' และหยุดตรวจ
:::

## ลำดับ WHEN สำคัญมาก

> [!MISTAKE] เรียงเงื่อนไขจากกว้างไปแคบ

```sql {verify}
SELECT
  product_name,
  list_price,
  CASE
    WHEN list_price >= 25 THEN 'Medium'
    WHEN list_price >= 80 THEN 'High'
    ELSE 'Low'
  END AS price_tier
FROM products
ORDER BY list_price DESC
LIMIT 4;
```

| product_name | list_price | price_tier |
|---|---|---|
| แชมพู 400ml | 129.00 | Medium |
| กระดาษทิชชู 6 ม้วน | 99.00 | Medium |
| สบู่เหลว 450ml | 89.00 | Medium |
| ยาสีฟัน 160g | 59.00 | Medium |

สินค้าราคา 129, 99, 89 บาทถูกจัดเป็น Medium เพราะ `>= 25` เป็นจริงก่อน ระบบจึงไม่ไปตรวจ `>= 80` เลย

> [!KEY] หลักจำ
> เรียงเงื่อนไขจาก**เข้มงวดที่สุด**ไปหา**ทั่วไป** และตรวจกรณีพิเศษ (เช่น ค่าติดลบ หรือ `NULL`) ก่อนเสมอ

## ใส่ ELSE ทุกครั้ง และคิดเรื่อง NULL

ถ้าลืม `ELSE` แถวที่ไม่เข้าเงื่อนไขใดจะได้ `NULL` รายงานจะมีกลุ่มว่างโดยไม่ตั้งใจ ตัวอย่างนี้จัดการ `NULL` ก่อน แล้วจึงแบ่งกลุ่ม และมี `ELSE` รับทุกอย่างที่เหลือ

```sql {verify}
SELECT
  product_id,
  category,
  CASE
    WHEN category IS NULL THEN 'Unknown'
    WHEN category IN ('Beverage', 'Snack') THEN 'Food & Drink'
    ELSE 'Non-food'
  END AS group_name
FROM products
ORDER BY product_id;
```

| product_id | category | group_name |
|---|---|---|
| P001 | Beverage | Food & Drink |
| P002 | Beverage | Food & Drink |
| P003 | Beverage | Food & Drink |
| P004 | Snack | Food & Drink |
| P005 | Snack | Food & Drink |
| P006 | Snack | Food & Drink |
| P007 | Personal Care | Non-food |
| P008 | Personal Care | Non-food |
| P009 | Personal Care | Non-food |
| P010 | NULL | Unknown |
| P011 | Household | Non-food |
| P012 | Household | Non-food |

ถ้าไม่ใส่บรรทัด `WHEN category IS NULL` สินค้า P010 จะตกไปที่ `ELSE` และกลายเป็น `'Non-food'` ซึ่งอาจผิด เพราะจริง ๆ แล้วเราไม่รู้หมวดของมัน

**CASE แบบสั้น** ใช้เมื่อเทียบคอลัมน์เดียวกับหลายค่า

```sql {verify}
SELECT
  sale_id,
  payment_method,
  CASE payment_method
    WHEN 'Cash' THEN 'เงินสด'
    WHEN 'Credit Card' THEN 'บัตรเครดิต'
    ELSE 'อื่น ๆ'
  END AS payment_th
FROM sales
WHERE store_id = 'S05'
ORDER BY sale_id;
```

| sale_id | payment_method | payment_th |
|---|---|---|
| T0093 | Cash | เงินสด |
| T0105 | Cash | เงินสด |
| T0114 | Cash | เงินสด |
| T0122 | Credit Card | บัตรเครดิต |
| T0125 | Credit Card | บัตรเครดิต |
| T0132 | Cash | เงินสด |
| T0133 | Cash | เงินสด |

> [!NOTE] CASE แบบสั้นตรวจ NULL ไม่ได้
> `CASE category WHEN NULL THEN ...` ไม่ทำงาน เพราะเป็นการเทียบด้วย `=` ถ้าต้องจัดการ `NULL` ให้ใช้ CASE แบบเต็ม `WHEN category IS NULL THEN ...`

## สรุปและฝึกทำ

| สูตร | ใช้ทำอะไร |
|---|---|
| `col IS NULL` / `col IS NOT NULL` | หาแถวที่ไม่มีค่า / มีค่า |
| `COALESCE(col, 'Unknown')` | แทน `NULL` ด้วยค่าที่กำหนด |
| `NULLIF(col, 0)` | เปลี่ยน 0 เป็น `NULL` (กันหารศูนย์) |
| `CASE WHEN ... THEN ... ELSE ... END` | สร้างกลุ่มหรือป้ายกำกับ |

**โจทย์:** สร้างคอลัมน์ `basket_size` จาก `quantity` ของสาขา S03: ค่าติดลบหรือ 0 = `'Return/Check'`, 1 ชิ้น = `'Single'`, 2–4 ชิ้น = `'Small'`, 5 ชิ้นขึ้นไป = `'Bulk'` เรียงตาม `quantity` มากไปน้อย แล้วตาม `sale_id`

:::answer ดูเฉลยและคำอธิบาย
```sql {verify partial count=23}
SELECT
  sale_id,
  quantity,
  CASE
    WHEN quantity <= 0 THEN 'Return/Check'
    WHEN quantity = 1 THEN 'Single'
    WHEN quantity BETWEEN 2 AND 4 THEN 'Small'
    ELSE 'Bulk'
  END AS basket_size
FROM sales
WHERE store_id = 'S03'
ORDER BY quantity DESC, sale_id;
```

**ผลลัพธ์** (แสดง 8 จาก 23 แถว)

| sale_id | quantity | basket_size |
|---|---|---|
| T0024 | 6 | Bulk |
| T0076 | 6 | Bulk |
| T0127 | 5 | Bulk |
| T0013 | 4 | Small |
| T0049 | 4 | Small |
| T0077 | 4 | Small |
| T0104 | 4 | Small |
| T0138 | 4 | Small |

**เหตุผล:** ตรวจกรณีพิเศษ (`<= 0`) ก่อน จากนั้นแบ่งช่วงปกติ และให้ `ELSE` รับที่เหลือคือ 5 ชิ้นขึ้นไป ลำดับนี้ทำให้ไม่มีค่าไหนตกหล่นหรือถูกจัดผิดกลุ่ม
:::

ฝึกเพิ่มที่ [แบบฝึกหัด: เรียงลำดับและ CASE WHEN](#/exercises/ex-sort-case)
