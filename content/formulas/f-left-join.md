## สูตรนี้คืออะไร

`LEFT JOIN` เก็บ**ทุกแถวของตารางซ้าย** และเติมข้อมูลจากตารางขวาเมื่อจับคู่ได้ ถ้าจับคู่ไม่ได้ คอลัมน์ของตารางขวาเป็น NULL

**ใช้แก้ปัญหา:** ต้องการให้ข้อมูลหลักครบ เช่น ทุกสาขาต้องอยู่ในรายงานแม้ไม่มียอดขาย หรือยอดขายรวมต้องไม่หายเพราะรหัสสินค้าไม่ตรง

## รูปแบบ (Syntax)

```sql
SELECT
  a.key_col,
  COUNT(b.some_col)         AS matched_rows,
  COALESCE(SUM(b.value), 0) AS total_value
FROM table_a AS a
LEFT JOIN table_b AS b
  ON  a.key_col = b.key_col
  AND b.filter_col = 'value'   -- เงื่อนไขของตารางขวาอยู่ใน ON
GROUP BY a.key_col;
```

## ตัวอย่างข้อมูลต้นทาง

ตาราง `stores` มี 6 สาขา แต่ `sales` มีรายการเพียง 5 สาขา (S06 ยังไม่เปิด)

## SQL Query ฉบับเต็มและผลลัพธ์

```sql {verify}
SELECT
  st.store_id,
  st.store_name,
  COUNT(s.sale_id)               AS line_count,
  COALESCE(SUM(s.net_amount), 0) AS total_net
FROM stores AS st
LEFT JOIN sales AS s
  ON st.store_id = s.store_id
GROUP BY st.store_id, st.store_name
ORDER BY st.store_id;
```

| store_id | store_name | line_count | total_net |
|---|---|---|---|
| S01 | สาขาสุขุมวิท | 47 | 4348.00 |
| S02 | สาขาบางนา | 37 | 3230.00 |
| S03 | สาขาเชียงใหม่ | 23 | 1624.00 |
| S04 | สาขาขอนแก่น | 27 | 2618.00 |
| S05 | สาขาภูเก็ต | 7 | 663.00 |
| S06 | สาขาหาดใหญ่ | 0 | 0.00 |

## อธิบายทีละส่วน

- `stores` เป็นตารางซ้าย จึงมีทุกสาขา
- S06 หาคู่ใน `sales` ไม่เจอ ได้ 1 แถวที่คอลัมน์ฝั่ง `s` เป็น NULL
- `COUNT(s.sale_id)` ไม่นับ NULL จึงได้ 0 (ถ้าใช้ `COUNT(*)` จะได้ 1 ผิด)
- `COALESCE(SUM(...), 0)` เปลี่ยนผลรวม NULL เป็น 0

## ข้อผิดพลาดที่พบบ่อย

**กรองตารางขวาใน WHERE ทำให้ LEFT JOIN กลายเป็น INNER JOIN**

```sql {verify}
SELECT st.store_id, COUNT(s.sale_id) AS cash_lines
FROM stores AS st
LEFT JOIN sales AS s
  ON st.store_id = s.store_id
WHERE s.payment_method = 'Cash'
GROUP BY st.store_id
ORDER BY st.store_id;
```

| store_id | cash_lines |
|---|---|
| S01 | 16 |
| S02 | 10 |
| S03 | 13 |
| S04 | 7 |
| S05 | 5 |

S06 หายไป แก้โดยย้าย `s.payment_method = 'Cash'` ไปไว้ใน `ON`

- ใช้ `COUNT(*)` กับ LEFT JOIN ได้ 1 แทน 0
- เริ่มจากตารางผิดข้าง (ตารางที่ต้องการให้ครบต้องอยู่ซ้าย)

## ข้อควรระวังและกรณีพิเศษ

- ถ้าตารางขวามี Key ซ้ำ LEFT JOIN ก็ทำให้แถวเพิ่มได้เช่นกัน ตรวจจำนวนแถวเสมอ
- คอลัมน์ฝั่งขวาที่เป็น NULL อาจหมายถึง "หาคู่ไม่เจอ" หรือ "คู่ที่เจอมีค่า NULL" ตรวจ NULL ที่คอลัมน์ Key ของตารางขวาเพื่อแยกสองกรณี

## วิธีอื่นที่ใช้แทนกันได้

- `RIGHT JOIN` คือกลับข้าง นิยมเขียน LEFT JOIN แล้วสลับตารางแทน
- [FULL OUTER JOIN](#/formula/f-full-outer-join) เมื่อต้องการทุกแถวของทั้งสองฝั่ง

## แบบฝึกหัด

**โจทย์:** แสดงสินค้าทุกตัวพร้อมจำนวนรายการและจำนวนชิ้นที่ขายได้ (ไม่มียอดแสดง 0) เรียงจากขายน้อยที่สุด 4 รายการแรก

:::answer
```sql {verify}
SELECT
  p.product_id,
  p.product_name,
  COUNT(s.sale_id)              AS line_count,
  COALESCE(SUM(s.quantity), 0)  AS total_qty
FROM products AS p
LEFT JOIN sales AS s
  ON p.product_id = s.product_id
GROUP BY p.product_id, p.product_name
ORDER BY total_qty, p.product_id
LIMIT 4;
```

| product_id | product_name | line_count | total_qty |
|---|---|---|---|
| P011 | ถุงขยะ 30 ใบ | 0 | 0 |
| P012 | กระดาษทิชชู 6 ม้วน | 0 | 0 |
| P008 | แชมพู 400ml | 3 | 7 |
| P010 | น้ำยาล้างจาน 500ml | 8 | 21 |

**เหตุผล:** เริ่มจาก `products` เพื่อให้สินค้าที่ไม่เคยขายยังอยู่ และใช้ `COUNT(s.sale_id)` กับ `COALESCE` ให้ได้ 0
:::
