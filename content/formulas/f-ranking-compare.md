## สูตรนี้คืออะไร

| ฟังก์ชัน | เมื่อค่าเท่ากัน | ตัวอย่าง |
|---|---|---|
| `ROW_NUMBER()` | เลขไม่ซ้ำเสมอ | 1, 2, 3, 4 |
| `RANK()` | อันดับเดียวกัน แล้ว**ข้าม**เลข | 1, 2, 2, 4 |
| `DENSE_RANK()` | อันดับเดียวกัน **ไม่ข้าม**เลข | 1, 2, 2, 3 |

ใส่ `PARTITION BY` เพื่อ "จัดอันดับภายในแต่ละกลุ่ม" เช่น ภายในแต่ละร้าน

## รูปแบบ (Syntax)

```sql
SELECT
  group_col,
  item_col,
  value_col,
  ROW_NUMBER() OVER (PARTITION BY group_col ORDER BY value_col DESC, item_col) AS rn,
  RANK()       OVER (PARTITION BY group_col ORDER BY value_col DESC)           AS rnk,
  DENSE_RANK() OVER (PARTITION BY group_col ORDER BY value_col DESC)           AS dense_rnk
FROM table_name;
```

## ตัวอย่างข้อมูลต้นทาง

ตาราง `store_product` (ตารางเสริม) สาขา S01 มีสินค้า 2 ตัวยอดเท่ากันที่ 950

<!-- verify: SELECT store_id, product_id, total_net FROM store_product WHERE store_id = 'S01' ORDER BY total_net DESC, product_id -->
| store_id | product_id | total_net |
|---|---|---|
| S01 | P001 | 1200.00 |
| S01 | P002 | 950.00 |
| S01 | P003 | 950.00 |
| S01 | P004 | 600.00 |
| S01 | P005 | 300.00 |

## SQL Query ฉบับเต็มและผลลัพธ์

**โจทย์:** จัดอันดับสินค้าภายในแต่ละร้าน (แสดงสาขา S01)

```sql {verify}
SELECT
  store_id,
  product_id,
  total_net,
  ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY total_net DESC, product_id) AS rn,
  RANK()       OVER (PARTITION BY store_id ORDER BY total_net DESC)             AS rnk,
  DENSE_RANK() OVER (PARTITION BY store_id ORDER BY total_net DESC)             AS dense_rnk
FROM store_product
WHERE store_id = 'S01'
ORDER BY rn;
```

| store_id | product_id | total_net | rn | rnk | dense_rnk |
|---|---|---|---|---|---|
| S01 | P001 | 1200.00 | 1 | 1 | 1 |
| S01 | P002 | 950.00 | 2 | 2 | 2 |
| S01 | P003 | 950.00 | 3 | 2 | 2 |
| S01 | P004 | 600.00 | 4 | 4 | 3 |
| S01 | P005 | 300.00 | 5 | 5 | 4 |

## อธิบายทีละส่วน

- P002 กับ P003 ยอดเท่ากัน: `ROW_NUMBER` ให้ 2 และ 3 (ตัดสินด้วย `product_id`) ส่วน `RANK` / `DENSE_RANK` ให้ 2 ทั้งคู่
- P004: `RANK` = 4 (ข้ามเลข 3 เพราะมี 3 สินค้าอยู่ข้างหน้า) `DENSE_RANK` = 3 (เป็นระดับยอดที่ 3)

## ข้อผิดพลาดที่พบบ่อย

- ลืม `PARTITION BY` ได้อันดับรวมทั้งบริษัท
- `ROW_NUMBER` ไม่มีตัวตัดสิน ผลไม่คงที่เมื่อค่าเท่ากัน
- กรองอันดับใน `WHERE` ของ Query เดียวกัน (ต้องใช้ CTE หรือ QUALIFY)

## ข้อควรระวังและกรณีพิเศษ

- เลือกฟังก์ชันตามกติกาธุรกิจ: ต้องได้ N แถวพอดี → `ROW_NUMBER` / เสมอกันต้องได้สิทธิ์เท่ากัน → `RANK` / นับระดับ → `DENSE_RANK`
- `NTILE(4)` แบ่งแถวเป็น 4 กลุ่มเท่า ๆ กัน (Quartile)

## วิธีอื่นที่ใช้แทนกันได้

- `PERCENT_RANK()` อันดับเป็นสัดส่วน 0–1

## แบบฝึกหัด

**โจทย์:** จัดอันดับสาขาตามยอดขายรวมด้วย `RANK`

:::answer
```sql {verify}
SELECT
  store_id,
  SUM(net_amount)                             AS total_net,
  RANK() OVER (ORDER BY SUM(net_amount) DESC) AS sales_rank
FROM sales
GROUP BY store_id
ORDER BY sales_rank;
```

| store_id | total_net | sales_rank |
|---|---|---|
| S01 | 4348.00 | 1 |
| S02 | 3230.00 | 2 |
| S04 | 2618.00 | 3 |
| S03 | 1624.00 | 4 |
| S05 | 663.00 | 5 |

**เหตุผล:** Window Function ทำงานหลัง GROUP BY จึงใช้ `SUM(net_amount)` ใน `ORDER BY` ของ OVER ได้ ไม่มีสาขาที่ยอดเท่ากัน RANK จึงเรียง 1–5
:::
