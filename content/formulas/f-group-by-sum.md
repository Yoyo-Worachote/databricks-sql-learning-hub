## สูตรนี้คืออะไร

`GROUP BY` แบ่งแถวเป็นกลุ่มตามค่าของคอลัมน์ แล้วให้ฟังก์ชันสรุปคำนวณแยกแต่ละกลุ่ม ได้ **1 แถวต่อ 1 กลุ่ม** เหมือน PivotTable ใน Excel

**กฎสำคัญ:** ทุกคอลัมน์ใน `SELECT` ที่ไม่ได้อยู่ในฟังก์ชันสรุป ต้องอยู่ใน `GROUP BY`

**ใช้เมื่อ:** ยอดขายต่อสาขา ต่อสินค้า ต่อเดือน ต่อวิธีชำระเงิน ฯลฯ

## รูปแบบ (Syntax)

```sql
SELECT
  group_col_1,
  group_col_2,
  COUNT(*)        AS row_count,
  SUM(amount_col) AS total_amount
FROM table_name
WHERE row_condition
GROUP BY group_col_1, group_col_2
ORDER BY total_amount DESC;
```

## ตัวอย่างข้อมูลต้นทาง

รายการขายของสาขา S05 (7 แถว)

<!-- verify: SELECT sale_id, product_id, quantity, net_amount FROM sales WHERE store_id = 'S05' ORDER BY sale_id -->
| sale_id | product_id | quantity | net_amount |
|---|---|---|---|
| T0093 | P002 | 3 | 51.00 |
| T0105 | P006 | 3 | 90.00 |
| T0114 | P007 | 1 | 79.00 |
| T0122 | P009 | 2 | 118.00 |
| T0125 | P006 | 5 | 150.00 |
| T0132 | P003 | 5 | 85.00 |
| T0133 | P006 | 3 | 90.00 |

## SQL Query ฉบับเต็มและผลลัพธ์

**โจทย์:** สรุปจำนวนรายการ จำนวนชิ้น และยอดสุทธิต่อสินค้าของสาขา S05

```sql {verify}
SELECT
  product_id,
  COUNT(*)        AS line_count,
  SUM(quantity)   AS total_qty,
  SUM(net_amount) AS total_net
FROM sales
WHERE store_id = 'S05'
GROUP BY product_id
ORDER BY total_net DESC;
```

| product_id | line_count | total_qty | total_net |
|---|---|---|---|
| P006 | 3 | 11 | 330.00 |
| P009 | 1 | 2 | 118.00 |
| P003 | 1 | 5 | 85.00 |
| P007 | 1 | 1 | 79.00 |
| P002 | 1 | 3 | 51.00 |

## อธิบายทีละส่วน

- `WHERE store_id = 'S05'` เหลือ 7 แถวก่อนจัดกลุ่ม
- `GROUP BY product_id` แบ่งเป็น 5 กลุ่ม P006 มี 3 แถว (T0105, T0125, T0133) จึงรวมเป็น 3 + 5 + 3 = 11 ชิ้น และ 90 + 150 + 90 = 330 บาท
- `ORDER BY total_net DESC` ใช้ Alias ได้

**ลำดับการทำงาน:** `FROM` → `WHERE` → `GROUP BY` → ฟังก์ชันสรุปใน `SELECT` → `ORDER BY`

**ตรวจผลรวม:** 3 + 1 + 1 + 1 + 1 = 7 แถว และยอดรวม 663 = ยอดของ S05

## ข้อผิดพลาดที่พบบ่อย

- ลืมคอลัมน์ใน `GROUP BY` → Error `MISSING_AGGREGATION`
- กรองผลสรุปใน `WHERE` → ต้องใช้ [HAVING](#/formula/f-having)
- จัดกลุ่มรายเดือนด้วย `MONTH()` อย่างเดียว ทำให้หลายปีรวมกัน ใช้ [DATE_TRUNC](#/formula/f-monthly-sales)
- ไม่ตรวจว่าผลรวมทุกกลุ่มเท่ากับยอดทั้งตาราง

## ข้อควรระวังและกรณีพิเศษ

- `NULL` ในคอลัมน์ที่จัดกลุ่มรวมเป็น 1 กลุ่ม ควรใช้ `COALESCE(col, 'Unknown')` ทั้งใน SELECT และ GROUP BY
- Databricks ใช้ชื่อ Alias ใน `GROUP BY` ได้ และมี `GROUP BY ALL`

## วิธีอื่นที่ใช้แทนกันได้

- `GROUP BY ALL` (Databricks) จัดกลุ่มตามทุกคอลัมน์ที่ไม่ใช่ฟังก์ชันสรุป
- `SUM(...) OVER (PARTITION BY ...)` ถ้าต้องการยอดรวมกลุ่มโดยไม่ยุบแถว ([ดูสูตร](#/formula/f-share-of-total))

## แบบฝึกหัด

**โจทย์:** สรุปจำนวนรายการและยอดสุทธิต่อวิธีชำระเงิน เรียงยอดมากไปน้อย

:::answer
```sql {verify}
SELECT
  payment_method,
  COUNT(*)        AS line_count,
  SUM(net_amount) AS total_net
FROM sales
GROUP BY payment_method
ORDER BY total_net DESC;
```

| payment_method | line_count | total_net |
|---|---|---|
| Cash | 51 | 4305.00 |
| QR Payment | 49 | 4271.00 |
| Credit Card | 41 | 3907.00 |

**เหตุผล:** 1 แถวต่อวิธีชำระ ตรวจผลรวม 51 + 49 + 41 = 141 แถว
:::
