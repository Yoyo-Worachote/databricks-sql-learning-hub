## รวมหลายเงื่อนไขด้วย AND, OR และ NOT

| ตัวเชื่อม | ความหมาย | เก็บแถวเมื่อ… |
|---|---|---|
| `AND` | และ | **ทุก**เงื่อนไขเป็นจริง |
| `OR` | หรือ | เงื่อนไข**ข้อใดข้อหนึ่ง**เป็นจริง |
| `NOT` | ไม่ | กลับค่าเงื่อนไข จริง ↔ เท็จ |

**สถานการณ์:** ผู้จัดการเขตกรุงเทพฯ ต้องการรายการขายของสาขา S01 และ S02 เฉพาะเดือนกุมภาพันธ์ 2026 ที่ซื้อตั้งแต่ 3 ชิ้นขึ้นไป

```sql {verify}
SELECT
  sale_id,
  sale_date,
  store_id,
  quantity
FROM sales
WHERE sale_date >= DATE'2026-02-01'
  AND sale_date <  DATE'2026-03-01'
  AND (store_id = 'S01' OR store_id = 'S02')
  AND quantity >= 3
ORDER BY sale_date;
```

**ผลลัพธ์ (5 แถว)**

| sale_id | sale_date | store_id | quantity |
|---|---|---|---|
| T0065 | 2026-02-05 | S02 | 3 |
| T0078 | 2026-02-16 | S02 | 3 |
| T0079 | 2026-02-18 | S01 | 3 |
| T0081 | 2026-02-19 | S02 | 3 |
| T0082 | 2026-02-19 | S01 | 3 |

**อธิบายทีละส่วน**

| เงื่อนไข | ความหมาย |
|---|---|
| `sale_date >= DATE'2026-02-01'` | ตั้งแต่ 1 ก.พ. |
| `sale_date < DATE'2026-03-01'` | ก่อน 1 มี.ค. = ทั้งเดือน ก.พ. |
| `(store_id = 'S01' OR store_id = 'S02')` | วงเล็บบังคับให้ OR ทำก่อน จึงหมายถึง "S01 หรือ S02" |
| `quantity >= 3` | และซื้อตั้งแต่ 3 ชิ้น |

แต่ละแถวในผลลัพธ์ต้องผ่าน**ทั้ง 4 เงื่อนไข**

## ลำดับของ AND กับ OR: ใส่วงเล็บเสมอ

SQL ทำ `AND` ก่อน `OR` เสมอ (เหมือนคูณก่อนบวกในคณิตศาสตร์) ถ้าผสมกันโดยไม่ใส่วงเล็บ ความหมายจะเปลี่ยน

> [!MISTAKE] ลืมวงเล็บเมื่อผสม AND กับ OR
> ต้องการ "รายการของ S01 หรือ S02 ที่ซื้อ 5 ชิ้นขึ้นไป"

```sql {verify}
SELECT COUNT(*) AS row_count
FROM sales
WHERE store_id = 'S01' OR store_id = 'S02'
  AND quantity >= 5;
```

| row_count |
|---|
| 53 |

ระบบอ่านเป็น `store_id = 'S01' OR (store_id = 'S02' AND quantity >= 5)` คือ "S01 **ทุกรายการ** (47 แถว)" หรือ "S02 ที่ซื้อ 5 ชิ้นขึ้นไป (6 แถว)" จึงได้ 53 แถวซึ่งมากเกินจริง

```sql {verify}
SELECT COUNT(*) AS row_count
FROM sales
WHERE (store_id = 'S01' OR store_id = 'S02')
  AND quantity >= 5;
```

| row_count |
|---|
| 11 |

ผลที่ถูกต้องคือ 11 แถว (S01 = 5 แถว, S02 = 6 แถว)

> [!KEY] หลักจำ
> ผสม `AND` กับ `OR` เมื่อไร ใส่วงเล็บครอบกลุ่ม `OR` ทุกครั้ง หรือเปลี่ยนไปใช้ `IN`

**NOT** ใช้กลับเงื่อนไข เช่น `WHERE NOT (payment_method = 'Cash')` ได้ 90 แถว (141 − 51 รายการที่จ่ายเงินสด) ซึ่งเขียนแบบ `payment_method <> 'Cash'` ได้ผลเหมือนกันในข้อมูลชุดนี้ (เพราะคอลัมน์นี้ไม่มีค่า `NULL`)

## IN: เท่ากับค่าใดค่าหนึ่งในรายการ

`IN (...)` สั้นและอ่านง่ายกว่าการเขียน `OR` หลายครั้ง

```sql {verify}
SELECT
  product_id,
  product_name,
  category
FROM products
WHERE category IN ('Snack', 'Household');
```

| product_id | product_name | category |
|---|---|---|
| P004 | มันฝรั่งทอด 50g | Snack |
| P005 | ขนมปังกรอบ 60g | Snack |
| P006 | ถั่วอบเกลือ 40g | Snack |
| P011 | ถุงขยะ 30 ใบ | Household |
| P012 | กระดาษทิชชู 6 ม้วน | Household |

`category IN ('Snack', 'Household')` มีความหมายเดียวกับ `(category = 'Snack' OR category = 'Household')`

> [!WARNING] NOT IN กับคอลัมน์ที่มี NULL
> `WHERE category NOT IN ('Snack', 'Beverage')` จะ**ไม่**ได้สินค้า P010 ที่ `category` เป็น `NULL` ทั้งที่ไม่ใช่ Snack หรือ Beverage เพราะการเปรียบเทียบกับ `NULL` ไม่เป็นจริง ดูคำอธิบายเต็มในบทที่ 6

## BETWEEN: อยู่ในช่วง (รวมค่าปลายทั้งสองด้าน)

```sql {verify}
SELECT
  product_name,
  list_price
FROM products
WHERE list_price BETWEEN 20 AND 40
ORDER BY list_price;
```

| product_name | list_price |
|---|---|
| ชาเขียว 500ml | 20.00 |
| มันฝรั่งทอด 50g | 25.00 |
| ถั่วอบเกลือ 40g | 30.00 |
| น้ำยาล้างจาน 500ml | 39.00 |

`BETWEEN 20 AND 40` เท่ากับ `list_price >= 20 AND list_price <= 40` จึง**รวม**สินค้าราคา 20 บาทพอดี (เรียกว่า Inclusive)

> [!WARNING] BETWEEN กับวันที่ที่มีเวลา
> `sale_datetime BETWEEN TIMESTAMP'2026-01-01 00:00:00' AND TIMESTAMP'2026-01-31 00:00:00'` จะตกหล่นรายการวันที่ 31 ม.ค. หลังเที่ยงคืน (ได้ 57 แถวแทนที่จะเป็น 60) ใช้ `>=` และ `<` วันแรกของเดือนถัดไปแทน ดู [กรองช่วงวันที่ให้ครบ](#/formula/f-date-range-filter)

## LIKE และ ILIKE: ค้นหาตามรูปแบบ

| สัญลักษณ์ (Wildcard) | ความหมาย | ตัวอย่าง | ตรงกับ |
|---|---|---|---|
| `%` | ตัวอักษรกี่ตัวก็ได้ (รวม 0 ตัว) | `'%500ml%'` | มีคำว่า 500ml อยู่ตรงไหนก็ได้ |
| `_` | ตัวอักษร 1 ตัวพอดี | `'P00_'` | P001 ถึง P009 (9 รหัส) |

```sql {verify}
SELECT
  product_id,
  product_name
FROM products
WHERE product_name LIKE '%500ml%';
```

| product_id | product_name |
|---|---|
| P002 | ชาเขียว 500ml |
| P010 | น้ำยาล้างจาน 500ml |

`LIKE` แยกตัวพิมพ์เล็ก/ใหญ่ ถ้าไม่ต้องการแยก Databricks มี `ILIKE`

```sql {verify}
SELECT
  product_id,
  product_name
FROM products
WHERE product_name ILIKE '%ML%'
ORDER BY product_id;
```

| product_id | product_name |
|---|---|
| P001 | น้ำดื่ม 600ml |
| P002 | ชาเขียว 500ml |
| P003 | กาแฟกระป๋อง 180ml |
| P007 | สบู่เหลว 450ml |
| P008 | แชมพู 400ml |
| P010 | น้ำยาล้างจาน 500ml |

> [!DATABRICKS] ILIKE
> `ILIKE` (case-Insensitive LIKE) ไม่มีใน SQL Server ถ้าต้องการเขียนให้ใช้ได้ทุกระบบ ให้ใช้ `LOWER(product_name) LIKE '%ml%'`

## ข้อผิดพลาดที่พบบ่อย

- ผสม `AND` กับ `OR` โดยไม่ใส่วงเล็บ
- คิดว่า `BETWEEN` ไม่รวมค่าปลาย
- ใช้ `BETWEEN` กับ TIMESTAMP แล้วข้อมูลวันสุดท้ายหาย
- ใช้ `NOT IN` แล้วลืมว่าแถวที่เป็น `NULL` จะหายไป
- ใช้ `LIKE '%abc%'` กับตารางใหญ่มากโดยไม่จำเป็น ซึ่งช้ากว่าการเทียบค่าตรง ๆ

## ฝึกทำ

**โจทย์:** หารายการขายของสาขา S03 หรือ S04 ในเดือนมีนาคม 2026 ที่ชำระด้วย QR Payment **หรือ** ซื้อตั้งแต่ 5 ชิ้นขึ้นไป แสดง `sale_id`, `sale_date`, `store_id`, `quantity`, `payment_method`

:::answer ดูเฉลยและคำอธิบาย
```sql {verify}
SELECT
  sale_id,
  sale_date,
  store_id,
  quantity,
  payment_method
FROM sales
WHERE store_id IN ('S03', 'S04')
  AND sale_date >= DATE'2026-03-01'
  AND sale_date <  DATE'2026-04-01'
  AND (payment_method = 'QR Payment' OR quantity >= 5)
ORDER BY sale_id;
```

| sale_id | sale_date | store_id | quantity | payment_method |
|---|---|---|---|---|
| T0090 | 2026-03-01 | S04 | 6 | Cash |
| T0098 | 2026-03-03 | S04 | 2 | QR Payment |
| T0099 | 2026-03-03 | S04 | 5 | Credit Card |
| T0123 | 2026-03-20 | S04 | 1 | QR Payment |
| T0126 | 2026-03-22 | S04 | 5 | Credit Card |
| T0127 | 2026-03-23 | S03 | 5 | Cash |

**เหตุผล:** ใช้ `IN` สำหรับ "S03 หรือ S04" ใช้ช่วงครึ่งเปิดสำหรับเดือนมีนาคม และต้องใส่วงเล็บครอบ `payment_method = 'QR Payment' OR quantity >= 5` มิฉะนั้นรายการ QR Payment ของทุกสาขาทุกเดือนจะหลุดเข้ามา
:::

ฝึกเพิ่มที่ [แบบฝึกหัด: การกรองข้อมูลด้วย WHERE](#/exercises/ex-where) และดูสูตรที่ [IN, BETWEEN, LIKE และ ILIKE](#/formula/f-in-between-like)
