## สูตรนี้คืออะไร

`QUALIFY` เป็นคำสั่ง**เฉพาะ Databricks** (และบางระบบ เช่น Snowflake, BigQuery) ที่กรองผลของ Window Function ได้ใน Query ชั้นเดียว เพราะทำงาน**หลัง**การคำนวณ Window Function

ลำดับเชิงตรรกะ: FROM → WHERE → GROUP BY → HAVING → Window Function → **QUALIFY** → SELECT → ORDER BY → LIMIT

> [!DATABRICKS] ใช้ไม่ได้ในทุกระบบ
> SQL Server, MySQL และ PostgreSQL ไม่มี QUALIFY ถ้า Query ต้องย้ายไปใช้ระบบอื่น ให้ใช้ CTE + WHERE แทน ([ดูสูตร Top N ต่อกลุ่ม](#/formula/f-top-n-per-group))

## รูปแบบ (Syntax)

```sql
SELECT
  group_col,
  item_col,
  value_col,
  ROW_NUMBER() OVER (PARTITION BY group_col ORDER BY value_col DESC) AS rn
FROM table_name
QUALIFY rn <= 3;
```

## ตัวอย่างข้อมูลต้นทาง

ตาราง `store_product` (ตารางเสริม) 12 แถว 3 สาขา

## SQL Query ฉบับเต็มและผลลัพธ์

```sql {verify}
SELECT
  store_id,
  product_id,
  total_net,
  ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY total_net DESC, product_id) AS rn
FROM store_product
QUALIFY rn <= 3
ORDER BY store_id, rn;
```

| store_id | product_id | total_net | rn |
|---|---|---|---|
| S01 | P001 | 1200.00 | 1 |
| S01 | P002 | 950.00 | 2 |
| S01 | P003 | 950.00 | 3 |
| S02 | P001 | 800.00 | 1 |
| S02 | P003 | 700.00 | 2 |
| S02 | P005 | 500.00 | 3 |
| S03 | P002 | 400.00 | 1 |
| S03 | P004 | 350.00 | 2 |

ผลเหมือนการใช้ CTE แล้วกรอง `WHERE rn <= 3` ในชั้นนอกทุกประการ

## อธิบายทีละส่วน

- `QUALIFY rn <= 3` อ้างชื่อ `rn` ได้ เพราะคำนวณแล้วในขั้นก่อนหน้า
- เขียนเงื่อนไขกับ Window Function ตรง ๆ ก็ได้ เช่น `QUALIFY ROW_NUMBER() OVER (...) = 1` โดยไม่ต้องแสดงคอลัมน์ rn

## ข้อผิดพลาดที่พบบ่อย

- ใช้ QUALIFY ใน Query ที่ต้องส่งต่อให้ระบบอื่น
- ใส่ QUALIFY ผิดตำแหน่ง ต้องอยู่หลัง FROM / WHERE / GROUP BY / HAVING และก่อน ORDER BY

## ข้อควรระวังและกรณีพิเศษ

- ทีมควรตกลงกันว่าจะใช้ QUALIFY หรือ CTE เป็นมาตรฐาน เพื่อให้อ่าน Query ของกันและกันง่าย

## วิธีอื่นที่ใช้แทนกันได้

- CTE หรือ Subquery แล้ว WHERE ในชั้นนอก (ใช้ได้ทุกระบบ)

## แบบฝึกหัด

**โจทย์:** ใช้ QUALIFY หารายการขายล่าสุด 1 รายการของแต่ละสาขา

:::answer
```sql {verify}
SELECT
  store_id,
  sale_id,
  sale_datetime,
  net_amount
FROM sales
QUALIFY ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY sale_datetime DESC, sale_id DESC) = 1
ORDER BY store_id;
```

| store_id | sale_id | sale_datetime | net_amount |
|---|---|---|---|
| S01 | T0139 | 2026-03-31 16:15:25 | 15.00 |
| S02 | T0140 | 2026-03-31 16:51:32 | 267.00 |
| S03 | T0138 | 2026-03-31 09:24:38 | 100.00 |
| S04 | T0130 | 2026-03-25 13:03:10 | 10.00 |
| S05 | T0133 | 2026-03-28 11:01:13 | 90.00 |

**เหตุผล:** เรียงเวลาจากใหม่ไปเก่าภายในแต่ละสาขา แล้วเก็บแถวที่ได้เลข 1 รูปแบบนี้ใช้หา "รายการล่าสุดต่อ Key" ได้ทุกกรณี
:::
