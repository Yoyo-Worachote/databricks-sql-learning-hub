## สูตรนี้คืออะไร

`SUM(x) OVER ()` ใส่**ยอดรวมทั้งหมด**ไว้ในทุกแถวโดยไม่ยุบแถว และ `SUM(x) OVER (PARTITION BY g)` ใส่ยอดรวมของกลุ่ม จึงคำนวณ "แถวนี้คิดเป็นกี่ % ของยอดรวม" ได้ใน Query เดียว

## รูปแบบ (Syntax)

```sql
SELECT
  item,
  value,
  ROUND(value * 100.0 / SUM(value) OVER (), 1)                     AS share_of_total_pct,
  ROUND(value * 100.0 / SUM(value) OVER (PARTITION BY group_col), 1) AS share_in_group_pct
FROM summarized_table;
```

## ตัวอย่างข้อมูลต้นทาง

ยอดขายต่อสินค้า (สรุปจาก `sales`) เช่น P007 = 3,599 บาท ยอดรวมทุกสินค้า = 12,483 บาท

## SQL Query ฉบับเต็มและผลลัพธ์

```sql {verify partial count=11}
WITH product_sales AS (
  SELECT product_id, SUM(net_amount) AS net_sales
  FROM sales
  GROUP BY product_id
)
SELECT
  product_id,
  net_sales,
  ROUND(net_sales * 100.0 / SUM(net_sales) OVER (), 1) AS share_pct
FROM product_sales
ORDER BY net_sales DESC, product_id;
```

**ผลลัพธ์** (แสดง 5 จาก 11 แถว)

| product_id | net_sales | share_pct |
|---|---|---|
| P007 | 3599.00 | 28.8 |
| P009 | 1622.00 | 13.0 |
| P003 | 1310.00 | 10.5 |
| P004 | 1115.00 | 8.9 |
| P002 | 986.00 | 7.9 |

## อธิบายทีละส่วน และลำดับการทำงาน

1. CTE สรุป 1 แถวต่อสินค้า (11 แถว)
2. `SUM(net_sales) OVER ()` = 12,483 ใส่ทุกแถว
3. P007: 3,599 × 100 ÷ 12,483 = 28.8%

## ข้อผิดพลาดที่พบบ่อย

- ใช้ `OVER ()` กับข้อมูลรายการโดยตรงแล้ว GROUP BY ในชั้นเดียวกันจนสับสน ให้สรุปใน CTE ก่อน
- `WHERE` ในชั้นเดียวกันกรองแถวก่อน Window Function ทำงาน ยอดรวมจึงเป็นยอดของแถวที่เหลือ ไม่ใช่ทั้งตาราง (ถ้าต้องการยอดรวมทั้งหมด ให้คำนวณ % ใน CTE ก่อนแล้วค่อยกรอง)
- ผลรวม % อาจไม่ใช่ 100.0 พอดีเพราะการปัดเศษ

## ข้อควรระวังและกรณีพิเศษ

- ถ้ายอดรวมอาจเป็น 0 ให้ใช้ `NULLIF(SUM(...) OVER (), 0)`
- ใน Power BI ไม่ควร SUM คอลัมน์ % ที่คำนวณจาก SQL

## วิธีอื่นที่ใช้แทนกันได้

- CTE ยอดรวม 1 แถวแล้ว `CROSS JOIN` ([ดูสูตร CTE](#/formula/f-cte))
- Scalar Subquery `(SELECT SUM(net_amount) FROM sales)`

## แบบฝึกหัด

**โจทย์:** สินค้าแต่ละตัวในสาขา S05 คิดเป็นกี่ % ของยอดสาขา

:::answer
```sql {verify}
WITH store_product AS (
  SELECT store_id, product_id, SUM(net_amount) AS total_net
  FROM sales
  GROUP BY store_id, product_id
)
SELECT
  store_id,
  product_id,
  total_net,
  ROUND(total_net * 100.0 / SUM(total_net) OVER (PARTITION BY store_id), 1) AS share_in_store_pct
FROM store_product
WHERE store_id = 'S05'
ORDER BY total_net DESC;
```

| store_id | product_id | total_net | share_in_store_pct |
|---|---|---|---|
| S05 | P006 | 330.00 | 49.8 |
| S05 | P009 | 118.00 | 17.8 |
| S05 | P003 | 85.00 | 12.8 |
| S05 | P007 | 79.00 | 11.9 |
| S05 | P002 | 51.00 | 7.7 |

**เหตุผล:** `PARTITION BY store_id` ให้ยอดรวมของสาขาเดียวกัน (663) กรณีนี้ WHERE กรองทั้งสาขา จึงไม่กระทบยอดรวมของสาขา
:::
