## สูตรนี้คืออะไร

หา Key ที่ควรไม่ซ้ำแต่ปรากฏมากกว่า 1 ครั้ง: `GROUP BY key HAVING COUNT(*) > 1` แล้วดึงแถวเต็มมาดูว่า**ซ้ำทั้งแถว** (โหลดข้อมูลซ้ำ ตัดได้) หรือ**Key ซ้ำแต่ค่าต่างกัน** (ปัญหาต้นทาง ต้องถามเจ้าของข้อมูล)

## รูปแบบ (Syntax)

```sql
SELECT key_col, COUNT(*) AS cnt
FROM table_name
GROUP BY key_col
HAVING COUNT(*) > 1;
```

## ตัวอย่างข้อมูลต้นทาง

ตาราง `sales` 141 แถว แต่ `COUNT(DISTINCT sale_id)` = 140 แปลว่ามีอย่างน้อย 1 รหัสซ้ำ

## SQL Query ฉบับเต็มและผลลัพธ์

**ขั้นที่ 1: หา Key ที่ซ้ำ**

```sql {verify}
SELECT
  sale_id,
  COUNT(*) AS cnt
FROM sales
GROUP BY sale_id
HAVING COUNT(*) > 1;
```

| sale_id | cnt |
|---|---|
| T0042 | 2 |

**ขั้นที่ 2: ดึงแถวเต็มมาพิสูจน์**

```sql {verify}
SELECT *
FROM sales
WHERE sale_id IN (
  SELECT sale_id
  FROM sales
  GROUP BY sale_id
  HAVING COUNT(*) > 1
)
ORDER BY sale_id;
```

| sale_id | sale_date | sale_datetime | store_id | product_id | customer_id | quantity | unit_price | discount_amount | net_amount | payment_method |
|---|---|---|---|---|---|---|---|---|---|---|
| T0042 | 2026-01-23 | 2026-01-23 10:57:37 | S01 | P005 | C017 | 1 | 15.00 | 0.00 | 15.00 | Cash |
| T0042 | 2026-01-23 | 2026-01-23 10:57:37 | S01 | P005 | C017 | 1 | 15.00 | 0.00 | 15.00 | Cash |

## อธิบายทีละส่วน

- ขั้นที่ 1 บอกว่า**อะไร**ซ้ำและซ้ำกี่ครั้ง
- ขั้นที่ 2 ทั้งสองแถวเหมือนกันทุกคอลัมน์ = โหลดซ้ำ ตัดด้วย `SELECT DISTINCT *` ได้ ([ดูสูตร](#/formula/f-remove-duplicates))
- จำนวนแถวซ้ำส่วนเกิน = `COUNT(*) - COUNT(DISTINCT sale_id)` = 1

## ข้อผิดพลาดที่พบบ่อย

- ใส่ `DISTINCT` ปิดปัญหาโดยไม่ตรวจว่าแถวซ้ำต่างกันหรือไม่
- ตรวจ Key ผิดคอลัมน์: ในข้อมูลรายการขาย ลูกค้าคนเดิมซื้อสินค้าเดิมวันเดียวกันได้ตามปกติ ไม่ใช่ข้อมูลซ้ำ

## ข้อควรระวังและกรณีพิเศษ

- Key อาจประกอบด้วยหลายคอลัมน์ (Composite Key) ให้ GROUP BY ทุกคอลัมน์ของ Key
- ตรวจซ้ำทั้งแถว: `SELECT COUNT(*) - COUNT(*) FROM (SELECT DISTINCT * ...)` หรือเทียบ `COUNT(*)` ก่อน/หลัง `DISTINCT *`

## วิธีอื่นที่ใช้แทนกันได้

- `COUNT(*) OVER (PARTITION BY key) > 1` แล้วกรองชั้นนอก ได้แถวเต็มในขั้นเดียว

## แบบฝึกหัด

**โจทย์:** หาลูกค้าสมาชิกที่ซื้อสินค้าเดียวกันมากกว่า 1 ครั้งในวันเดียวกัน แล้วพิจารณาว่าเป็นข้อมูลซ้ำหรือไม่

:::answer
```sql {verify}
SELECT
  customer_id,
  sale_date,
  product_id,
  COUNT(*) AS cnt
FROM sales
WHERE customer_id IS NOT NULL
GROUP BY customer_id, sale_date, product_id
HAVING COUNT(*) > 1
ORDER BY customer_id, sale_date;
```

| customer_id | sale_date | product_id | cnt |
|---|---|---|---|
| C013 | 2026-01-18 | P007 | 2 |
| C017 | 2026-01-23 | P005 | 2 |

**เหตุผล:** C017 คือแถวซ้ำ T0042 ส่วน C013 มี 2 รายการ (T0031 เวลา 13:23 จำนวน 2 ชิ้น และ T0033 เวลา 15:42 จำนวน 1 ชิ้น) เวลาและจำนวนต่างกัน จึงน่าจะเป็นการซื้อจริง 2 ครั้ง ไม่ใช่ข้อมูลซ้ำ ผลของ "Key ซ้ำ" ต้องตรวจรายละเอียดก่อนตัดสินเสมอ
:::
