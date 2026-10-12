## สูตรนี้คืออะไร

`SELECT DISTINCT` ตัด**แถวที่ซ้ำกันทั้งแถว**ออกจากผลลัพธ์ แต่ละค่า (หรือแต่ละคู่ค่า) จะเหลือเพียงครั้งเดียว

**ใช้แก้ปัญหา:** อยากรู้ว่าคอลัมน์มีค่าอะไรบ้างก่อนเขียนเงื่อนไข เช่น วิธีชำระเงินสะกดอย่างไร หรือมีหมวดสินค้ากี่หมวด

**ใช้เมื่อ:** สำรวจข้อมูล ตรวจความสม่ำเสมอของค่า และสร้างรายการค่าไม่ซ้ำ

## รูปแบบ (Syntax)

```sql
SELECT DISTINCT
  column_1,
  column_2
FROM table_name;
```

## ตัวอย่างข้อมูลต้นทาง

ตาราง `stores` (6 แถว)

<!-- verify: SELECT store_id, region, store_type FROM stores ORDER BY store_id -->
| store_id | region | store_type |
|---|---|---|
| S01 | Bangkok | Mall |
| S02 | Bangkok | Mall |
| S03 | North | Street |
| S04 | Northeast | Street |
| S05 | South | Mall |
| S06 | South | Street |

## SQL Query ฉบับเต็มและผลลัพธ์

**โจทย์:** มีคู่ (ภูมิภาค, ประเภทสาขา) อะไรบ้าง

```sql {verify}
SELECT DISTINCT
  region,
  store_type
FROM stores
ORDER BY region, store_type;
```

| region | store_type |
|---|---|
| Bangkok | Mall |
| North | Street |
| Northeast | Street |
| South | Mall |
| South | Street |

## อธิบายทีละส่วน

- `DISTINCT` ดูความซ้ำจาก**ทุกคอลัมน์ที่เลือกรวมกัน** S01 และ S02 เป็น (Bangkok, Mall) เหมือนกัน จึงเหลือแถวเดียว
- South มี 2 แถวเพราะประเภทสาขาต่างกัน (Mall และ Street)
- ได้ 5 แถวจากข้อมูลต้นทาง 6 แถว

**ลำดับการทำงาน:** `FROM` → `SELECT` → `DISTINCT` (ตัดแถวซ้ำ) → `ORDER BY`

## ข้อผิดพลาดที่พบบ่อย

- คิดว่า `DISTINCT` ใช้กับคอลัมน์แรกเท่านั้น (จริง ๆ ใช้กับทั้งแถว)
- ใช้ `DISTINCT` "แก้" ข้อมูลซ้ำหลัง JOIN โดยไม่หาสาเหตุ ซึ่งอาจซ่อน Fan-out ไว้
- ใช้ `COUNT(DISTINCT id)` คู่กับ `SUM(amount)` ที่ยังนับแถวซ้ำอยู่ ได้ตัวเลขไม่สอดคล้องกัน ([ดูสูตร](#/formula/f-remove-duplicates))

## ข้อควรระวังและกรณีพิเศษ

- `NULL` ถือเป็น 1 ค่า `SELECT DISTINCT category FROM products` จึงมี NULL เป็นแถวหนึ่ง
- `DISTINCT` กับตารางใหญ่มากใช้ทรัพยากรสูง เพราะต้องเทียบทุกแถว
- ถ้าต้องการนับจำนวนค่าไม่ซ้ำ ใช้ `COUNT(DISTINCT col)` ไม่ต้อง SELECT DISTINCT แล้วนับ

## วิธีอื่นที่ใช้แทนกันได้

- `GROUP BY region, store_type` ได้ผลเหมือนกัน และเพิ่ม `COUNT(*)` เพื่อดูว่าแต่ละคู่มีกี่แถว
- นับค่าไม่ซ้ำแบบประมาณในตารางใหญ่มาก: `approx_count_distinct(col)`

## แบบฝึกหัด

**โจทย์:** แต่ละสาขามีวิธีชำระเงินอะไรบ้าง และแต่ละคู่มีกี่รายการ (ใช้ GROUP BY แทน DISTINCT) แสดงเฉพาะสาขา S05

:::answer
```sql {verify}
SELECT
  store_id,
  payment_method,
  COUNT(*) AS line_count
FROM sales
WHERE store_id = 'S05'
GROUP BY store_id, payment_method
ORDER BY payment_method;
```

| store_id | payment_method | line_count |
|---|---|---|
| S05 | Cash | 5 |
| S05 | Credit Card | 2 |

**เหตุผล:** `GROUP BY` ให้คู่ค่าที่ไม่ซ้ำเหมือน DISTINCT และนับจำนวนได้ในคราวเดียว สาขา S05 ไม่มีรายการ QR Payment
:::
