## สูตรนี้คืออะไร

`INNER JOIN` จับคู่แถวระหว่างสองตารางด้วยคอลัมน์ที่ค่าตรงกัน (Key) และเก็บ**เฉพาะแถวที่จับคู่ได้ทั้งสองฝั่ง** เหมือน VLOOKUP ที่ตัดแถวที่หาไม่เจอทิ้ง

**ใช้แก้ปัญหา:** ข้อมูลแยกอยู่หลายตาราง เช่น `sales` มีแค่ `product_id` ส่วนชื่อและหมวดอยู่ใน `products`

**ใช้เมื่อ:** ต้องการข้อมูลที่ครบทั้งสองฝั่งจริง ๆ เช่น คำนวณต้นทุนได้เฉพาะสินค้าที่รู้ต้นทุน

## รูปแบบ (Syntax)

```sql
SELECT
  a.col_1,
  b.col_2
FROM table_a AS a
INNER JOIN table_b AS b
  ON a.key_col = b.key_col;
```

## ตัวอย่างข้อมูลต้นทาง

`sales` (สาขา S05) มี `product_id` และ `products` มีชื่อและหมวด

<!-- verify: SELECT product_id, product_name, category FROM products WHERE product_id IN ('P002','P003','P006') ORDER BY product_id -->
| product_id | product_name | category |
|---|---|---|
| P002 | ชาเขียว 500ml | Beverage |
| P003 | กาแฟกระป๋อง 180ml | Beverage |
| P006 | ถั่วอบเกลือ 40g | Snack |

## SQL Query ฉบับเต็มและผลลัพธ์

```sql {verify}
SELECT
  s.sale_id,
  s.product_id,
  p.product_name,
  p.category,
  s.net_amount
FROM sales AS s
INNER JOIN products AS p
  ON s.product_id = p.product_id
WHERE s.store_id = 'S05'
ORDER BY s.sale_id;
```

| sale_id | product_id | product_name | category | net_amount |
|---|---|---|---|---|
| T0093 | P002 | ชาเขียว 500ml | Beverage | 51.00 |
| T0105 | P006 | ถั่วอบเกลือ 40g | Snack | 90.00 |
| T0114 | P007 | สบู่เหลว 450ml | Personal Care | 79.00 |
| T0122 | P009 | ยาสีฟัน 160g | Personal Care | 118.00 |
| T0125 | P006 | ถั่วอบเกลือ 40g | Snack | 150.00 |
| T0132 | P003 | กาแฟกระป๋อง 180ml | Beverage | 85.00 |
| T0133 | P006 | ถั่วอบเกลือ 40g | Snack | 90.00 |

## อธิบายทีละส่วน

| ส่วน | ความหมาย |
|---|---|
| `FROM sales AS s` | ตารางหลัก ชื่อย่อ `s` |
| `INNER JOIN products AS p` | ตารางที่นำมาจับคู่ ชื่อย่อ `p` |
| `ON s.product_id = p.product_id` | เงื่อนไขจับคู่ |
| `p.product_name` | คอลัมน์จากตารางที่ JOIN มา |

**ลำดับการทำงาน:** FROM + JOIN (จับคู่) → WHERE (เหลือ S05) → SELECT → ORDER BY ทุกรายการของ S05 หาคู่เจอ จึงได้ครบ 7 แถว

## ข้อผิดพลาดที่พบบ่อย

- **แถวหายเงียบ ๆ:** ทั้งตาราง INNER JOIN ได้ 140 แถว จาก 141 เพราะ P099 ไม่มีใน `products` ([ดูบทที่ 10](#/lesson/joins))
- ไม่ใส่ชื่อย่อนำหน้าคอลัมน์ที่มีทั้งสองตาราง → Error `AMBIGUOUS_REFERENCE`
- JOIN กับตารางที่ Key ซ้ำ → แถวเพิ่ม (Fan-out)

## ข้อควรระวังและกรณีพิเศษ

- นับแถวและยอดรวมก่อน/หลัง JOIN ทุกครั้ง
- Key ต้องรูปแบบเดียวกัน (`'S03'` ≠ `'s03'` ≠ `' S03'`)
- `JOIN` ที่ไม่ระบุประเภทคือ `INNER JOIN`

## วิธีอื่นที่ใช้แทนกันได้

- [LEFT JOIN](#/formula/f-left-join) เมื่อต้องการเก็บทุกแถวของตารางหลัก
- `LEFT SEMI JOIN` (Databricks) เมื่อต้องการแค่กรองแถวที่มีคู่ โดยไม่ต้องการคอลัมน์จากอีกฝั่ง

## แบบฝึกหัด

**โจทย์:** นับจำนวนแถวทั้งตาราง `sales` เมื่อ INNER JOIN กับ `products` เทียบกับจำนวนแถวเดิม

:::answer
```sql {verify}
SELECT
  (SELECT COUNT(*) FROM sales) AS sales_rows,
  (SELECT COUNT(*)
     FROM sales AS s
     INNER JOIN products AS p ON s.product_id = p.product_id) AS inner_join_rows;
```

| sales_rows | inner_join_rows |
|---|---|
| 141 | 140 |

**เหตุผล:** หายไป 1 แถว คือรายการ P099 ที่ไม่มีในตารางสินค้า ถ้ารายงานยอดขายรวมด้วย INNER JOIN ยอด 270 บาทจะหายไป
:::
