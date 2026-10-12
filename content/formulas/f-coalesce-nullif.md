## สูตรนี้คืออะไร

| ฟังก์ชัน | ทำอะไร | ตัวอย่าง | ผล |
|---|---|---|---|
| `COALESCE(a, b, c)` | คืน**ค่าแรกที่ไม่ใช่ NULL** | `COALESCE(NULL, 'Unknown')` | `'Unknown'` |
| `NULLIF(a, b)` | ถ้า a = b คืน NULL ไม่เช่นนั้นคืน a | `NULLIF(0, 0)` | `NULL` |

สองฟังก์ชันนี้ทำงานกลับกัน: COALESCE **เติม**ค่าแทน NULL ส่วน NULLIF **เปลี่ยน**ค่าที่ไม่ต้องการให้เป็น NULL

**ใช้แก้ปัญหา**

- รายงานมีช่องว่างจาก NULL → `COALESCE(category, 'Unknown')`
- หารด้วยศูนย์ Error → `x / NULLIF(y, 0)`
- ข้อความว่าง `''` ไม่ถูกนับเป็นค่าว่าง → `NULLIF(TRIM(col), '')`

## รูปแบบ (Syntax)

```sql
SELECT
  COALESCE(column_1, 'default_value') AS column_1_filled,
  amount / NULLIF(divisor, 0)          AS safe_ratio,
  NULLIF(TRIM(text_col), '')           AS text_or_null
FROM table_name;
```

## ตัวอย่างข้อมูลต้นทาง

<!-- verify: SELECT product_id, category, brand FROM products WHERE product_id IN ('P005','P006','P010') ORDER BY product_id -->
| product_id | category | brand |
|---|---|---|
| P005 | Snack | SnackHub |
| P006 | Snack | NULL |
| P010 | NULL | HomeMate |

## SQL Query ฉบับเต็มและผลลัพธ์

```sql {verify}
SELECT
  product_id,
  COALESCE(category, 'Unknown') AS category,
  COALESCE(brand, 'No brand')   AS brand
FROM products
WHERE product_id IN ('P005', 'P006', 'P010')
ORDER BY product_id;
```

| product_id | category | brand |
|---|---|---|
| P005 | Snack | SnackHub |
| P006 | Snack | No brand |
| P010 | Unknown | HomeMate |

**NULLIF กันหารศูนย์:** ยอดต่อรายการรับคืนของแต่ละสาขา (สาขาที่ไม่มีรายการรับคืน ตัวหารเป็น 0)

```sql {verify}
SELECT
  store_id,
  ROUND(SUM(net_amount) / NULLIF(SUM(CASE WHEN quantity < 0 THEN 1 ELSE 0 END), 0), 2) AS net_per_return
FROM sales
GROUP BY store_id
ORDER BY store_id;
```

| store_id | net_per_return |
|---|---|
| S01 | 4348.00 |
| S02 | NULL |
| S03 | NULL |
| S04 | NULL |
| S05 | NULL |

## อธิบายทีละส่วน

- แถว P005: `category` และ `brand` มีค่าอยู่แล้ว COALESCE คืนค่าเดิม
- แถว P006: `brand` เป็น NULL จึงได้ `'No brand'`
- `NULLIF(0, 0)` → NULL ทำให้ `4348 / NULL` = NULL แทนที่จะ Error `DIVIDE_BY_ZERO`

## ข้อผิดพลาดที่พบบ่อย

- `COALESCE(x, 0)` ทุกครั้งโดยไม่คิดความหมาย: ถ้า NULL หมายถึง "ไม่ได้บันทึก" การเติม 0 ทำให้ค่าเฉลี่ยต่ำผิดจริง
- ใช้ `COALESCE` กับชนิดข้อมูลต่างกัน เช่น `COALESCE(quantity, 'N/A')` (ตัวเลขกับข้อความ) อาจ Error หรือแปลงชนิดโดยไม่ตั้งใจ
- ลืมว่า `NULLIF` คืน NULL ซึ่ง `SUM`/`AVG` จะข้ามไป

## ข้อควรระวังและกรณีพิเศษ

- `COALESCE` รับได้หลายค่า ใช้ลองหลายแหล่ง เช่น `COALESCE(mobile, phone, email)`
- หลัง LEFT JOIN ใช้ `COALESCE(SUM(...), 0)` เพื่อแสดง 0 ให้แถวที่ไม่มีคู่ ([ดูตัวอย่าง](#/formula/f-left-join))
- ระบุในรายงานเสมอว่าเติมค่าแทน NULL ด้วยอะไร

## วิธีอื่นที่ใช้แทนกันได้

- `IFNULL(a, b)` / `NVL(a, b)` ใน Databricks ทำงานเหมือน `COALESCE(a, b)` (2 ค่า)
- `CASE WHEN a IS NULL THEN b ELSE a END` ยาวกว่าแต่ชัดเจน
- `try_divide(a, b)` ของ Databricks แทน `a / NULLIF(b, 0)`

## แบบฝึกหัด

**โจทย์:** นับจำนวนรายการและจำนวนรายการที่ไม่ได้บันทึกส่วนลด (NULL) ของแต่ละสาขา โดยใช้ `count_if`

:::answer
```sql {verify}
SELECT
  store_id,
  COUNT(*)                            AS line_count,
  count_if(discount_amount IS NULL)   AS discount_not_recorded
FROM sales
GROUP BY store_id
ORDER BY store_id;
```

| store_id | line_count | discount_not_recorded |
|---|---|---|
| S01 | 47 | 6 |
| S02 | 37 | 7 |
| S03 | 23 | 3 |
| S04 | 27 | 4 |
| S05 | 7 | 0 |

**เหตุผล:** การรายงานจำนวน NULL แยกไว้ดีกว่าการเติม 0 เงียบ ๆ เพราะผู้อ่านรู้ว่าข้อมูลส่วนไหนไม่ครบ รวม 6 + 7 + 3 + 4 + 0 = 20 แถว
:::
