## สูตรนี้คืออะไร

ฟังก์ชันสรุป (Aggregate Function) ยุบหลายแถวให้เหลือค่าเดียว COUNT มี 3 แบบที่ตอบคำถามต่างกัน

| สูตร | นับอะไร | คำถามที่ตอบ |
|---|---|---|
| `COUNT(*)` | ทุกแถว | มีกี่รายการ |
| `COUNT(col)` | แถวที่ col **ไม่เป็น NULL** | มีกี่รายการที่มีค่านี้ |
| `COUNT(DISTINCT col)` | ค่าที่ไม่ซ้ำ (ไม่นับ NULL) | มีกี่คน / กี่สินค้า / กี่วัน |

ฟังก์ชันอื่น: `SUM` ผลรวม, `AVG` ค่าเฉลี่ย, `MIN` / `MAX` ค่าน้อยสุด/มากสุด (ใช้กับวันที่ได้) ทั้งหมด**ข้ามค่า NULL**

## รูปแบบ (Syntax)

```sql
SELECT
  COUNT(*)            AS row_count,
  COUNT(col)          AS non_null_count,
  COUNT(DISTINCT col) AS distinct_count,
  SUM(amount)         AS total_amount
FROM table_name;
```

## ตัวอย่างข้อมูลต้นทาง

ตาราง `sales` 141 แถว `customer_id` มีค่า 112 แถว (20 คนไม่ซ้ำ) และเป็น NULL 29 แถว

## SQL Query ฉบับเต็มและผลลัพธ์

```sql {verify}
SELECT
  COUNT(*)                    AS row_count,
  COUNT(customer_id)          AS member_rows,
  COUNT(DISTINCT customer_id) AS unique_members,
  SUM(net_amount)             AS total_net,
  ROUND(AVG(net_amount), 2)   AS avg_net,
  MIN(sale_date)              AS first_date,
  MAX(sale_date)              AS last_date
FROM sales;
```

| row_count | member_rows | unique_members | total_net | avg_net | first_date | last_date |
|---|---|---|---|---|---|---|
| 141 | 112 | 20 | 12483.00 | 88.53 | 2026-01-02 | 2026-03-31 |

## อธิบายทีละส่วน

- `COUNT(*)` = 141 ทุกแถว
- `COUNT(customer_id)` = 112 (141 − 29 แถวที่เป็น NULL) คือ "จำนวนรายการของสมาชิก"
- `COUNT(DISTINCT customer_id)` = 20 คือ "จำนวนสมาชิก (คน)"
- `AVG(net_amount)` = 12,483 ÷ 141 = 88.53

**ลำดับการทำงาน:** `FROM` → (`WHERE`) → ฟังก์ชันสรุปยุบทุกแถวเป็น 1 แถว (ไม่มี GROUP BY)

## ข้อผิดพลาดที่พบบ่อย

- นับจำนวนลูกค้าด้วย `COUNT(customer_id)` ได้จำนวนรายการแทนจำนวนคน
- ใช้ `COUNT(col)` ทั้งที่ต้องการนับทุกแถว ตัวเลขต่ำกว่าจริงเมื่อมี NULL
- ใส่คอลัมน์ธรรมดาปนกับฟังก์ชันสรุปโดยไม่มี `GROUP BY` → Error `MISSING_AGGREGATION`

## ข้อควรระวังและกรณีพิเศษ

- `AVG` ข้าม NULL: `AVG(discount_amount)` หารด้วย 121 แถว ไม่ใช่ 141 ([ดูบทที่ 8](#/lesson/aggregate-functions))
- `SUM` ของคอลัมน์ที่ไม่มีแถวเลย (เช่น หลัง LEFT JOIN) ได้ NULL ไม่ใช่ 0
- `COUNT(DISTINCT)` กับตารางใหญ่มากใช้ทรัพยากรสูง

## วิธีอื่นที่ใช้แทนกันได้

- `count_if(condition)` (Databricks) นับแบบมีเงื่อนไข
- `approx_count_distinct(col)` นับค่าไม่ซ้ำแบบประมาณ เร็วกว่าในตารางใหญ่มาก

## แบบฝึกหัด

**โจทย์:** สำหรับแต่ละสาขา นับจำนวนสินค้าที่ขายได้ (ไม่ซ้ำ) จำนวนสมาชิก (ไม่ซ้ำ) และจำนวนวันที่มีการขาย

:::answer
```sql {verify}
SELECT
  store_id,
  COUNT(DISTINCT product_id)  AS products_sold,
  COUNT(DISTINCT customer_id) AS members,
  COUNT(DISTINCT sale_date)   AS selling_days
FROM sales
GROUP BY store_id
ORDER BY store_id;
```

| store_id | products_sold | members | selling_days |
|---|---|---|---|
| S01 | 10 | 19 | 38 |
| S02 | 10 | 13 | 31 |
| S03 | 9 | 10 | 20 |
| S04 | 9 | 15 | 23 |
| S05 | 5 | 6 | 7 |

**เหตุผล:** ทุกคำถามคือ "มีกี่สิ่งที่ไม่ซ้ำ" จึงใช้ `COUNT(DISTINCT ...)` ทั้งหมด `COUNT(DISTINCT customer_id)` ไม่นับ NULL จึงได้เฉพาะสมาชิก
:::
