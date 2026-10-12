## สูตรนี้คืออะไร

`FULL OUTER JOIN` เก็บ**ทุกแถวของทั้งสองตาราง** จับคู่ได้ก็รวมเป็นแถวเดียว จับคู่ไม่ได้ก็ยังอยู่ (ฝั่งที่ไม่มีเป็น NULL)

**ใช้แก้ปัญหา:** เทียบรายการจากสองแหล่งว่าอะไรมีฝั่งเดียว เช่น รายชื่อลูกค้าใน Master กับลูกค้าที่มีรายการขาย หรือยอดจากสองระบบ (Reconciliation)

## รูปแบบ (Syntax)

```sql
SELECT
  a.key AS key_in_a,
  b.key AS key_in_b
FROM table_a AS a
FULL OUTER JOIN table_b AS b
  ON a.key = b.key
WHERE a.key IS NULL
   OR b.key IS NULL;
```

## ตัวอย่างข้อมูลต้นทาง

- `products` มีสินค้า 12 รหัส (P001–P012)
- `sales` มีรหัสสินค้าที่ขาย 11 รหัส (P001–P010 และ P099)

## SQL Query ฉบับเต็มและผลลัพธ์

```sql {verify}
SELECT
  p.product_id AS master_product_id,
  s.product_id AS sold_product_id
FROM products AS p
FULL OUTER JOIN (SELECT DISTINCT product_id FROM sales) AS s
  ON p.product_id = s.product_id
WHERE p.product_id IS NULL
   OR s.product_id IS NULL
ORDER BY COALESCE(p.product_id, s.product_id);
```

| master_product_id | sold_product_id |
|---|---|
| P011 | NULL |
| P012 | NULL |
| NULL | P099 |

## อธิบายทีละส่วน

- Subquery `SELECT DISTINCT product_id FROM sales` ทำให้ฝั่งขวามี 1 แถวต่อรหัส (กัน Fan-out)
- `WHERE ... IS NULL OR ... IS NULL` เก็บเฉพาะแถวที่มีฝั่งเดียว
- P011, P012 มีใน Master แต่ไม่เคยขาย / P099 ขายแต่ไม่มีใน Master

## ข้อผิดพลาดที่พบบ่อย

- ไม่ทำให้ฝั่งใดฝั่งหนึ่งไม่ซ้ำก่อน → แถวคูณกัน
- ใส่เงื่อนไขกรองใน `WHERE` ที่ไม่รองรับ NULL ทำให้กลายเป็น INNER JOIN

## ข้อควรระวังและกรณีพิเศษ

- เมื่อเรียงหรือแสดง Key ให้ใช้ `COALESCE(a.key, b.key)` เพราะ Key อาจอยู่ฝั่งใดฝั่งหนึ่ง
- เหมาะกับข้อมูลขนาดปานกลาง กับตารางใหญ่มากควรสรุปก่อน JOIN

## วิธีอื่นที่ใช้แทนกันได้

- Anti-join สองทิศทาง แล้ว `UNION ALL` ผล ([ดูสูตร](#/formula/f-anti-join))
- `EXCEPT` ทั้งสองทิศทาง

## แบบฝึกหัด

**โจทย์:** เทียบรายชื่อลูกค้าในตาราง `customers` กับลูกค้าสมาชิกที่มีใน `sales` หาว่าใครมีฝั่งเดียว

:::answer
```sql {verify}
SELECT
  c.customer_id AS master_customer_id,
  s.customer_id AS sales_customer_id
FROM customers AS c
FULL OUTER JOIN (
  SELECT DISTINCT customer_id
  FROM sales
  WHERE customer_id IS NOT NULL
) AS s
  ON c.customer_id = s.customer_id
WHERE c.customer_id IS NULL
   OR s.customer_id IS NULL
ORDER BY COALESCE(c.customer_id, s.customer_id);
```

| master_customer_id | sales_customer_id |
|---|---|
| C021 | NULL |
| C022 | NULL |

**เหตุผล:** ไม่มีลูกค้าในยอดขายที่ไม่อยู่ใน Master (ฝั่งขวาไม่มีแถวเดี่ยว) มีเพียง C021, C022 ที่ยังไม่เคยซื้อ ต้องตัด NULL ออกจาก Subquery ก่อน มิฉะนั้นลูกค้าทั่วไปจะแสดงเป็นแถว NULL / NULL
:::
