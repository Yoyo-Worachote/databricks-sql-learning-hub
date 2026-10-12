## สูตรนี้คืออะไร

**Reconciliation (กระทบยอด)** แสดงจำนวนแถวและยอดรวมของ**ทุกขั้น**การทำความสะอาดในตารางเดียว เป็นหลักฐานแนบรายงานว่าตัวเลขเปลี่ยนไปเท่าไรและเพราะอะไร ใช้ CTE แต่ละขั้น + `UNION ALL`

## รูปแบบ (Syntax)

```sql
WITH step_1 AS (...), step_2 AS (...)
SELECT 'raw' AS stage, COUNT(*) AS rows_cnt, SUM(amount) AS total FROM source_table
UNION ALL
SELECT 'step_1', COUNT(*), SUM(amount) FROM step_1
UNION ALL
SELECT 'step_2', COUNT(*), SUM(amount) FROM step_2;
```

## ตัวอย่างข้อมูลต้นทาง

ตาราง `sales` 141 แถว 12,483 บาท นิยาม clean sales = ตัดแถวซ้ำ + quantity 1–50

## SQL Query ฉบับเต็มและผลลัพธ์

```sql {verify}
WITH dedup AS (
  SELECT DISTINCT *
  FROM sales
),
clean AS (
  SELECT *
  FROM dedup
  WHERE quantity BETWEEN 1 AND 50
)
SELECT 'raw' AS stage, COUNT(*) AS rows_cnt, SUM(net_amount) AS net FROM sales
UNION ALL
SELECT 'dedup', COUNT(*), SUM(net_amount) FROM dedup
UNION ALL
SELECT 'clean (qty 1-50)', COUNT(*), SUM(net_amount) FROM clean;
```

| stage | rows_cnt | net |
|---|---|---|
| raw | 141 | 12483.00 |
| dedup | 140 | 12468.00 |
| clean (qty 1-50) | 138 | 12078.00 |

## อธิบายทีละส่วน

| ขั้น | เปลี่ยนแปลง | เพราะ |
|---|---|---|
| raw → dedup | −1 แถว, −15 บาท | ตัดแถวซ้ำ T0042 |
| dedup → clean | −2 แถว, −390 บาท | ตัดรายการรับคืน T0061 (−30) และรายการ 60 ชิ้น T0096 (420) |

## ข้อผิดพลาดที่พบบ่อย

- ส่งรายงานตัวเลขหลังทำความสะอาดโดยไม่แสดงว่าต่างจากข้อมูลดิบเท่าไร
- แต่ละรายงานใช้นิยาม clean ต่างกัน ตัวเลขจึงไม่ตรงกัน

## ข้อควรระวังและกรณีพิเศษ

- ทำ Reconciliation ทั้งระดับรวมและระดับกลุ่ม (เช่น รายสาขา) เพื่อหาว่าความต่างมาจากไหน
- ตรวจหลัง JOIN ด้วย: จำนวนแถวและยอดรวมต้องเท่าก่อน JOIN (ถ้า JOIN กับ Dimension)

## วิธีอื่นที่ใช้แทนกันได้

- [FULL OUTER JOIN](#/formula/f-full-outer-join) เทียบรายการระหว่างสองระบบทีละ Key

## แบบฝึกหัด

**โจทย์:** ตรวจว่าการ LEFT JOIN `sales` กับ `products` และ `stores` ไม่ทำให้จำนวนแถวหรือยอดเปลี่ยน

:::answer
```sql {verify}
SELECT 'sales only' AS stage, COUNT(*) AS rows_cnt, SUM(net_amount) AS net
FROM sales
UNION ALL
SELECT 'after joins', COUNT(*), SUM(s.net_amount)
FROM sales AS s
LEFT JOIN products AS p  ON s.product_id = p.product_id
LEFT JOIN stores   AS st ON s.store_id   = st.store_id;
```

| stage | rows_cnt | net |
|---|---|---|
| sales only | 141 | 12483.00 |
| after joins | 141 | 12483.00 |

**เหตุผล:** ตัวเลขเท่ากันทุกขั้น แปลว่าไม่มี Fan-out และไม่มีแถวหาย ถ้าวันหนึ่งตัวเลขไม่เท่า แปลว่าตาราง Dimension มี Key ซ้ำแล้ว
:::
