## สูตรนี้คืออะไร

`ORDER BY` เรียงผลลัพธ์ตามคอลัมน์ที่ระบุ `ASC` = น้อยไปมาก (ค่าเริ่มต้น) `DESC` = มากไปน้อย เรียงได้หลายระดับ และกำหนดตำแหน่ง NULL ด้วย `NULLS FIRST` / `NULLS LAST`

**ใช้แก้ปัญหา:** ตารางในฐานข้อมูลไม่มีลำดับแถวที่แน่นอน ถ้าต้องการลำดับต้องสั่งเรียงเสมอ

## รูปแบบ (Syntax)

```sql
SELECT column_1, column_2
FROM table_name
ORDER BY column_1 ASC NULLS LAST, column_2 DESC;
```

## ตัวอย่างข้อมูลต้นทาง

ตาราง `stores`

<!-- verify: SELECT store_id, region, open_date FROM stores ORDER BY store_id -->
| store_id | region | open_date |
|---|---|---|
| S01 | Bangkok | 2019-05-01 |
| S02 | Bangkok | 2020-08-15 |
| S03 | North | 2021-03-01 |
| S04 | Northeast | 2022-11-20 |
| S05 | South | 2026-03-01 |
| S06 | South | 2026-06-01 |

## SQL Query ฉบับเต็มและผลลัพธ์

**โจทย์:** เรียงสาขาตามภูมิภาค (A→Z) ภายในภูมิภาคเดียวกันให้สาขาที่เปิดล่าสุดขึ้นก่อน

```sql {verify}
SELECT
  store_id,
  region,
  open_date
FROM stores
ORDER BY region, open_date DESC;
```

| store_id | region | open_date |
|---|---|---|
| S02 | Bangkok | 2020-08-15 |
| S01 | Bangkok | 2019-05-01 |
| S03 | North | 2021-03-01 |
| S04 | Northeast | 2022-11-20 |
| S06 | South | 2026-06-01 |
| S05 | South | 2026-03-01 |

**กำหนดตำแหน่ง NULL:** เรียงสินค้าตามหมวดโดยให้สินค้าที่ไม่มีหมวดอยู่ท้ายสุด

```sql {verify partial count=12}
SELECT
  category,
  product_name,
  list_price
FROM products
ORDER BY category ASC NULLS LAST, list_price DESC;
```

**ผลลัพธ์** (แสดง 4 จาก 12 แถว)

| category | product_name | list_price |
|---|---|---|
| Beverage | ชาเขียว 500ml | 20.00 |
| Beverage | กาแฟกระป๋อง 180ml | 18.00 |
| Beverage | น้ำดื่ม 600ml | 7.00 |
| Household | กระดาษทิชชู 6 ม้วน | 99.00 |

(แถวสุดท้ายคือ NULL / น้ำยาล้างจาน 500ml / 39.00)

## อธิบายทีละส่วน

| ส่วน | ความหมาย |
|---|---|
| `ORDER BY region` | เรียงระดับแรก (ไม่ระบุ = ASC) |
| `, open_date DESC` | ใช้ตัดสิน**เฉพาะเมื่อ region เท่ากัน** |
| `NULLS LAST` | ให้ค่า NULL อยู่ท้าย |

## ข้อผิดพลาดที่พบบ่อย

- คิดว่าข้อมูลเรียงอยู่แล้วโดยไม่เขียน `ORDER BY`
- ใส่ `DESC` ครั้งเดียวแล้วคิดว่ามีผลกับทุกคอลัมน์ (`ORDER BY a, b DESC` → `a` ยังเป็น ASC)
- เรียงตัวเลขที่เก็บเป็นข้อความ ได้ `'100'` ก่อน `'20'`
- ใส่ `ORDER BY` ใน CTE หรือ Subquery แล้วคาดหวังว่าผลสุดท้ายจะเรียงตาม

## ข้อควรระวังและกรณีพิเศษ

- Databricks: `NULL` อยู่**บนสุด**เมื่อ ASC และ**ล่างสุด**เมื่อ DESC โดยค่าเริ่มต้น
- `ORDER BY` ใช้ชื่อ Alias จาก `SELECT` ได้ เพราะทำงานหลัง `SELECT`
- `ORDER BY 1, 2` (เลขตำแหน่งคอลัมน์) ใช้ได้แต่อ่านยากและพังง่ายเมื่อเพิ่มคอลัมน์ ควรเขียนชื่อ
- ข้อความภาษาไทยเรียงตามรหัสอักขระ อาจไม่ตรงลำดับพจนานุกรมไทยทุกกรณี

## วิธีอื่นที่ใช้แทนกันได้

- ถ้าต้องการลำดับเป็นตัวเลข (อันดับ) ในผลลัพธ์ ใช้ `ROW_NUMBER()` / `RANK()` ([ดูสูตร](#/formula/f-ranking-compare))

## แบบฝึกหัด

**โจทย์:** แสดงสินค้าที่ยังขายอยู่ (`is_active = TRUE`) เรียงตามต้นทุนจากสูงไปต่ำ 3 รายการแรก ถ้าต้นทุนเท่ากันให้เรียงตามรหัสสินค้า

:::answer
```sql {verify}
SELECT
  product_id,
  product_name,
  unit_cost
FROM products
WHERE is_active = TRUE
ORDER BY unit_cost DESC, product_id
LIMIT 3;
```

| product_id | product_name | unit_cost |
|---|---|---|
| P008 | แชมพู 400ml | 79.00 |
| P007 | สบู่เหลว 450ml | 55.00 |
| P009 | ยาสีฟัน 160g | 35.00 |

**เหตุผล:** P012 (ต้นทุน 60) ไม่ติดเพราะ `is_active = false` `WHERE` กรองก่อน แล้ว `ORDER BY` เรียง และ `LIMIT` ตัด 3 แถวแรก
:::
