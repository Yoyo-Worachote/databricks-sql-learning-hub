## สูตรนี้คืออะไร

การ JOIN ต่อกันหลายตาราง: ตารางเหตุการณ์ (**Fact** เช่น `sales`) เชื่อมกับตารางข้อมูลประกอบ (**Dimension** เช่น `products`, `stores`) หลายตาราง เพื่อสรุปยอดตามมุมมองที่อยู่คนละตาราง

**ใช้แก้ปัญหา:** "รวมข้อมูลจากหลายตาราง" เช่น ยอดขายตามภูมิภาค (อยู่ใน `stores`) และหมวดสินค้า (อยู่ใน `products`)

## รูปแบบ (Syntax)

```sql
SELECT
  d1.attr_1,
  d2.attr_2,
  SUM(f.amount) AS total_amount
FROM fact_table AS f
LEFT JOIN dim_table_1 AS d1 ON f.key_1 = d1.key_1
LEFT JOIN dim_table_2 AS d2 ON f.key_2 = d2.key_2
GROUP BY d1.attr_1, d2.attr_2;
```

## ตัวอย่างข้อมูลต้นทาง

| ตาราง | Key | ให้ข้อมูล |
|---|---|---|
| `sales` (Fact, 141 แถว) | `store_id`, `product_id` | ยอดขาย |
| `stores` (Dimension, Key ไม่ซ้ำ) | `store_id` | `region`, `store_type` |
| `products` (Dimension, Key ไม่ซ้ำ) | `product_id` | `category`, `unit_cost` |

## SQL Query ฉบับเต็มและผลลัพธ์

**โจทย์:** ยอดขายตามประเภทสาขา (Mall / Street) และหมวดสินค้า โดยยอดรวมต้องไม่หาย

```sql {verify}
SELECT
  st.store_type,
  COALESCE(p.category, 'Unknown') AS category,
  SUM(s.net_amount)               AS total_net
FROM sales AS s
LEFT JOIN products AS p
  ON s.product_id = p.product_id
LEFT JOIN stores AS st
  ON s.store_id = st.store_id
GROUP BY st.store_type, COALESCE(p.category, 'Unknown')
ORDER BY st.store_type, total_net DESC;
```

| store_type | category | total_net |
|---|---|---|
| Mall | Personal Care | 4470.00 |
| Mall | Beverage | 1861.00 |
| Mall | Snack | 1520.00 |
| Mall | Unknown | 390.00 |
| Street | Personal Care | 1654.00 |
| Street | Beverage | 1099.00 |
| Street | Snack | 790.00 |
| Street | Unknown | 699.00 |

## อธิบายทีละส่วน

- แต่ละ JOIN มี `ON` ของตัวเอง และเริ่มจากตาราง Fact เสมอ
- ใช้ LEFT JOIN ทั้งคู่เพื่อไม่ให้รายการที่ Key ไม่ตรง (P099) หาย
- `COALESCE(p.category, 'Unknown')` รวม P010 (ไม่มีหมวด) และ P099 (ไม่มีในตารางสินค้า) ไว้ในกลุ่ม Unknown

**ลำดับการทำงาน:** sales → JOIN products → JOIN stores (ได้ 141 แถวที่มีคอลัมน์ครบ) → GROUP BY → ORDER BY

**ตรวจผลรวม:** ผลรวมทั้ง 8 แถว = 12,483 = ยอดรวมของ `sales`

## ข้อผิดพลาดที่พบบ่อย

- JOIN กับตารางที่ Key ซ้ำ (เช่น `promotions`) → แถวและยอดเพิ่มผิด (Fan-out) ต้องสรุปตารางนั้นให้เหลือ 1 แถวต่อ Key ก่อน
- ใช้ INNER JOIN แล้วยอดหายโดยไม่รู้ตัว
- ลืมใส่ชื่อย่อตารางนำหน้าคอลัมน์

## ข้อควรระวังและกรณีพิเศษ

- เทียบจำนวนแถวก่อน/หลัง JOIN: `sales` 141 แถว หลัง JOIN Dimension ที่ Key ไม่ซ้ำ ต้องได้ 141 แถวเท่าเดิม
- ถ้าต้อง JOIN สองตาราง Fact (เช่น ยอดขายกับเป้าหมาย) ให้สรุปแต่ละตารางให้เป็น Grain เดียวกันก่อน แล้วจึง JOIN

## วิธีอื่นที่ใช้แทนกันได้

- สร้าง View ที่ JOIN ไว้แล้วให้ทุกคนใช้ ([ดูสูตร Dataset Power BI](#/formula/f-powerbi-dataset))

## แบบฝึกหัด

**โจทย์:** ยืนยันว่าการ JOIN ทั้งสองตารางไม่ทำให้แถวเพิ่มหรือหาย โดยนับจำนวนแถวและยอดรวมหลัง JOIN

:::answer
```sql {verify}
SELECT
  COUNT(*)          AS joined_rows,
  SUM(s.net_amount) AS total_net
FROM sales AS s
LEFT JOIN products AS p
  ON s.product_id = p.product_id
LEFT JOIN stores AS st
  ON s.store_id = st.store_id;
```

| joined_rows | total_net |
|---|---|
| 141 | 12483.00 |

**เหตุผล:** เท่ากับตาราง `sales` ทั้งจำนวนแถวและยอดรวม แปลว่าไม่มี Fan-out และไม่มีแถวหาย
:::
