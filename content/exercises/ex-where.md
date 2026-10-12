## ข้อ 2.1 (ง่าย): กรองเงื่อนไขเดียว

**โจทย์:** แสดงรายการขายทั้งหมดของสาขา S03 (`sale_id`, `sale_date`, `product_id`, `net_amount`) เรียงตาม `sale_id`

:::answer
```sql {verify partial count=23}
SELECT
  sale_id,
  sale_date,
  product_id,
  net_amount
FROM sales
WHERE store_id = 'S03'
ORDER BY sale_id;
```

**ผลลัพธ์** (แสดง 8 จาก 23 แถว)

| sale_id | sale_date | product_id | net_amount |
|---|---|---|---|
| T0005 | 2026-01-03 | P002 | 18.00 |
| T0013 | 2026-01-07 | P003 | 72.00 |
| T0019 | 2026-01-09 | P006 | 60.00 |
| T0024 | 2026-01-12 | P003 | 108.00 |
| T0027 | 2026-01-14 | P005 | 30.00 |
| T0032 | 2026-01-18 | P001 | 14.00 |
| T0038 | 2026-01-21 | P003 | 18.00 |
| T0044 | 2026-01-24 | P001 | -1.00 |

**เหตุผล:** รหัสสาขาเป็นข้อความจึงต้องอยู่ใน `' '` ได้ 23 แถว สังเกต T0044 ที่ยอดติดลบ (ส่วนลดมากกว่ายอดสินค้า) ซึ่งจะตรวจในบทคุณภาพข้อมูล
:::

## ข้อ 2.2 (ปานกลาง): หลายเงื่อนไขและช่วงวันที่

**โจทย์:** หารายการขายเดือนมกราคม 2026 ที่ชำระด้วย `'QR Payment'` หรือ `'Credit Card'` และมีส่วนลด (`discount_amount`) มากกว่า 0 เรียงตามวันที่และ `sale_id`

:::answer
```sql {verify partial count=9}
SELECT
  sale_id,
  sale_date,
  payment_method,
  discount_amount
FROM sales
WHERE sale_date >= DATE'2026-01-01'
  AND sale_date <  DATE'2026-02-01'
  AND payment_method IN ('QR Payment', 'Credit Card')
  AND discount_amount > 0
ORDER BY sale_date, sale_id;
```

**ผลลัพธ์** (แสดง 8 จาก 9 แถว)

| sale_id | sale_date | payment_method | discount_amount |
|---|---|---|---|
| T0012 | 2026-01-06 | QR Payment | 5.00 |
| T0020 | 2026-01-09 | QR Payment | 5.00 |
| T0040 | 2026-01-21 | Credit Card | 5.00 |
| T0044 | 2026-01-24 | QR Payment | 15.00 |
| T0046 | 2026-01-24 | Credit Card | 15.00 |
| T0048 | 2026-01-26 | QR Payment | 10.00 |
| T0054 | 2026-01-30 | Credit Card | 10.00 |
| T0055 | 2026-01-30 | QR Payment | 5.00 |

**เหตุผล:** ใช้ช่วงครึ่งเปิด (>= วันแรก และ < วันแรกของเดือนถัดไป), `IN` แทน `OR` จึงไม่ต้องใส่วงเล็บ และ `discount_amount > 0` ซึ่งแถวที่เป็น `NULL` จะไม่ถูกเลือกโดยอัตโนมัติ (เพราะ NULL > 0 ได้ unknown)
:::

## ข้อ 2.3 (ท้าทาย): หาข้อมูลไม่ครบ

**โจทย์:** หาสินค้าที่ข้อมูลไม่ครบ คือ `category` เป็น NULL **หรือ** `brand` เป็น NULL

:::answer
```sql {verify}
SELECT
  product_id,
  product_name,
  category,
  brand
FROM products
WHERE category IS NULL
   OR brand IS NULL
ORDER BY product_id;
```

| product_id | product_name | category | brand |
|---|---|---|---|
| P006 | ถั่วอบเกลือ 40g | Snack | NULL |
| P010 | น้ำยาล้างจาน 500ml | NULL | HomeMate |

**เหตุผล:** ต้องใช้ `IS NULL` (ไม่ใช่ `= NULL`) และใช้ `OR` เพราะขาดข้อมูลข้อใดข้อหนึ่งก็ถือว่าไม่ครบ ถ้าใช้ `AND` จะได้ 0 แถว เพราะไม่มีสินค้าที่ขาดทั้งสองอย่าง
:::
