## สูตรนี้คืออะไร

`CASE WHEN` คือ **IF แบบหลายเงื่อนไข** ใน SQL ตรวจทีละ `WHEN` จากบนลงล่าง **เจอข้อแรกที่จริงก็หยุด** ถ้าไม่มีข้อไหนจริงใช้ค่า `ELSE` (ไม่เขียน ELSE จะได้ NULL)

**ใช้แก้ปัญหา:** สร้างกลุ่ม ป้ายกำกับ หรือสถานะจากเงื่อนไข เช่น ระดับราคา ประเภทการชำระเงิน ธงคุณภาพข้อมูล

**ใช้เมื่อ:** แบ่งกลุ่มรายงาน แปลรหัสเป็นคำที่อ่านเข้าใจ และใช้คู่กับ `SUM` เพื่อทำยอดแบบมีเงื่อนไข

## รูปแบบ (Syntax)

```sql
CASE
  WHEN condition_1 THEN 'label_1'
  WHEN condition_2 THEN 'label_2'
  ELSE 'label_other'
END AS new_column
```

## ตัวอย่างข้อมูลต้นทาง

ตาราง `sales` คอลัมน์ `payment_method` มี 3 ค่า: Cash (51 แถว), QR Payment (49), Credit Card (41)

## SQL Query ฉบับเต็มและผลลัพธ์

**โจทย์:** แบ่งรายการขายเป็นกลุ่ม Digital (QR Payment, Credit Card) และ Cash แล้วสรุปจำนวนและยอด

```sql {verify}
SELECT
  CASE
    WHEN payment_method IN ('QR Payment', 'Credit Card') THEN 'Digital'
    ELSE 'Cash'
  END                AS payment_group,
  COUNT(*)           AS line_count,
  SUM(net_amount)    AS total_net
FROM sales
GROUP BY
  CASE
    WHEN payment_method IN ('QR Payment', 'Credit Card') THEN 'Digital'
    ELSE 'Cash'
  END
ORDER BY payment_group;
```

| payment_group | line_count | total_net |
|---|---|---|
| Cash | 51 | 4305.00 |
| Digital | 90 | 8178.00 |

**แบ่งระดับราคา** (เงื่อนไขเรียงจากเข้มงวดไปทั่วไป)

```sql {verify partial count=12}
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

**ผลลัพธ์** (แสดง 4 จาก 12 แถว)

| product_name | list_price | price_tier |
|---|---|---|
| แชมพู 400ml | 129.00 | High |
| กระดาษทิชชู 6 ม้วน | 99.00 | High |
| สบู่เหลว 450ml | 89.00 | High |
| ยาสีฟัน 160g | 59.00 | Medium |

## อธิบายทีละส่วน

| ส่วน | ความหมาย |
|---|---|
| `WHEN ... IN (...) THEN 'Digital'` | ถ้าเป็น QR หรือบัตร ได้ Digital |
| `ELSE 'Cash'` | ที่เหลือทั้งหมด |
| `END AS payment_group` | ปิด CASE และตั้งชื่อคอลัมน์ |
| `GROUP BY CASE ...` | จัดกลุ่มตามผลของ CASE (Databricks เขียน `GROUP BY payment_group` แทนได้) |

**ไล่แถว "ยาสีฟัน 59 บาท":** `59 >= 80` เท็จ → `59 >= 25` จริง → ได้ Medium และหยุดตรวจ

## ข้อผิดพลาดที่พบบ่อย

- **เรียง WHEN ผิด:** ใส่ `>= 25` ก่อน `>= 80` สินค้าราคา 129 จะได้ Medium เพราะเงื่อนไขแรกจริงก่อน
- **ลืม ELSE:** แถวที่ไม่เข้าเงื่อนไขได้ NULL รายงานมีกลุ่มว่าง
- **ลืม END:** Error `PARSE_SYNTAX_ERROR`
- ไม่คิดถึง NULL: แถวที่ค่าเป็น NULL จะตกไป ELSE ซึ่งอาจผิดความหมาย

## ข้อควรระวังและกรณีพิเศษ

- ตรวจกรณีพิเศษก่อน เช่น `WHEN quantity <= 0 THEN 'Return'` แล้วค่อยแบ่งช่วงปกติ
- CASE แบบสั้น `CASE payment_method WHEN 'Cash' THEN ...` ตรวจ NULL ไม่ได้ ใช้ `WHEN col IS NULL` ในแบบเต็ม
- ทุก `THEN` ควรให้ชนิดข้อมูลเดียวกัน (ข้อความทั้งหมด หรือตัวเลขทั้งหมด)

## วิธีอื่นที่ใช้แทนกันได้

- `IF(condition, a, b)` ของ Databricks สำหรับเงื่อนไขเดียว เช่น `IF(quantity < 0, 'Return', 'Sale')`
- `COALESCE` เมื่อแค่ต้องการแทนค่า NULL ([ดูสูตร](#/formula/f-coalesce-nullif))
- ตารางจับคู่ (Mapping table) แล้ว JOIN เมื่อกลุ่มมีจำนวนมากหรือเปลี่ยนบ่อย

## แบบฝึกหัด

**โจทย์:** จัดสถานะส่วนลดของรายการขาย: NULL = `'Not recorded'`, 0 = `'No discount'`, มากกว่า 0 = `'Has discount'` แล้วนับจำนวนแต่ละสถานะ

:::answer
```sql {verify}
SELECT
  CASE
    WHEN discount_amount IS NULL THEN 'Not recorded'
    WHEN discount_amount = 0 THEN 'No discount'
    ELSE 'Has discount'
  END      AS discount_status,
  COUNT(*) AS line_count
FROM sales
GROUP BY 1
ORDER BY 1;
```

| discount_status | line_count |
|---|---|
| Has discount | 27 |
| No discount | 94 |
| Not recorded | 20 |

**เหตุผล:** ตรวจ NULL เป็นข้อแรก มิฉะนั้นแถวที่เป็น NULL จะตกไปที่ ELSE กลายเป็น "Has discount" ผิด ๆ ตรวจรวม 27 + 94 + 20 = 141 (`GROUP BY 1` = จัดกลุ่มตามคอลัมน์ที่ 1 ใช้ได้ใน Databricks แต่ในงานจริงควรเขียนชื่อ)
:::
