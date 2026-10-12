## สูตรนี้คืออะไร

หา N อันดับแรก**ของแต่ละกลุ่ม** เช่น สินค้า Top 3 ของแต่ละร้าน ด้วย 3 ขั้น: (1) สรุปข้อมูลให้ได้ 1 แถวต่อกลุ่มต่อรายการ (2) จัดอันดับด้วย `ROW_NUMBER() OVER (PARTITION BY กลุ่ม ORDER BY ค่า DESC)` ใน CTE (3) กรอง `rn <= N` ใน Query ชั้นนอก

ดูคำอธิบายทีละขั้นแบบละเอียดได้ที่ [บทเรียน Top 3 Products per Store](#/lesson/top-n-per-group)

## รูปแบบ (Syntax)

```sql
WITH ranked AS (
  SELECT
    group_col,
    item_col,
    value_col,
    ROW_NUMBER() OVER (
      PARTITION BY group_col
      ORDER BY value_col DESC, item_col
    ) AS rn
  FROM summarized_table
)
SELECT group_col, item_col, value_col, rn
FROM ranked
WHERE rn <= 3
ORDER BY group_col, rn;
```

## ตัวอย่างข้อมูลต้นทาง

ตาราง `store_product` (1 แถว = 1 สาขา × 1 สินค้า) 12 แถว 3 สาขา

<!-- verify: SELECT store_id, product_id, total_net FROM store_product ORDER BY store_id, total_net DESC, product_id -->
| store_id | product_id | total_net |
|---|---|---|
| S01 | P001 | 1200.00 |
| S01 | P002 | 950.00 |
| S01 | P003 | 950.00 |
| S01 | P004 | 600.00 |
| S01 | P005 | 300.00 |
| S02 | P001 | 800.00 |
| S02 | P003 | 700.00 |
| S02 | P005 | 500.00 |
| S02 | P006 | 500.00 |
| S02 | P002 | 200.00 |
| S03 | P002 | 400.00 |
| S03 | P004 | 350.00 |

## SQL Query ฉบับเต็มและผลลัพธ์

```sql {verify}
WITH ranked_products AS (
    SELECT
        store_id,
        product_id,
        total_net,
        ROW_NUMBER() OVER (
            PARTITION BY store_id
            ORDER BY total_net DESC, product_id
        ) AS rn
    FROM store_product
)
SELECT
    store_id,
    product_id,
    total_net,
    rn
FROM ranked_products
WHERE rn <= 3
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

## อธิบายทีละส่วน

| ส่วน | ความหมาย |
|---|---|
| `ROW_NUMBER()` | เลขลำดับไม่ซ้ำ |
| `PARTITION BY store_id` | เริ่มนับ 1 ใหม่ทุกร้าน |
| `ORDER BY total_net DESC` | ยอดสูงสุดได้ 1 |
| `, product_id` | ตัวตัดสินเมื่อยอดเท่ากัน (S02: P005 ชนะ P006) |
| `WHERE rn <= 3` ในชั้นนอก | เก็บอันดับ 1–3 (S03 มีแค่ 2 สินค้าจึงได้ 2 แถว) |

**ลำดับการทำงาน:** CTE: FROM → คำนวณ rn → ส่งผลเป็นตารางชั่วคราว → ชั้นนอก: FROM ranked_products → WHERE rn <= 3 → ORDER BY

## ข้อผิดพลาดที่พบบ่อย

- ใช้ `ORDER BY ... LIMIT 3` ได้ Top 3 ของทั้งบริษัท ไม่ใช่ต่อร้าน
- กรอง `rn` ใน WHERE ชั้นเดียวกัน → Error (WHERE ทำงานก่อน Window Function)
- ลืม PARTITION BY หรือลืม DESC
- จัดอันดับจากรายการขายดิบ ทั้งที่โจทย์ถามยอดรวมต่อสินค้า (ต้อง GROUP BY ก่อน)

## ข้อควรระวังและกรณีพิเศษ

- ยอดเท่ากันที่ขอบอันดับ: ROW_NUMBER เลือกตัวเดียว ถ้าต้องการให้ติดทุกตัวใช้ `RANK()` (S02 จะได้ 4 สินค้า)
- เลือกตัวตัดสินที่มีความหมายทางธุรกิจ เช่น จำนวนชิ้นหรือกำไร แล้วใส่รหัสไว้ท้ายสุด
- ทำความสะอาดข้อมูลก่อนจัดอันดับ รายการผิดปกติอาจเปลี่ยนอันดับได้

## วิธีอื่นที่ใช้แทนกันได้

- Databricks: `QUALIFY ROW_NUMBER() OVER (...) <= 3` ([ดูสูตร](#/formula/f-qualify))
- Subquery ใน FROM แทน CTE

## แบบฝึกหัด

**โจทย์:** หาลูกค้าสมาชิกที่ใช้จ่ายสูงสุด 2 อันดับแรกของแต่ละสาขา

:::answer
```sql {verify}
WITH customer_spend AS (
  SELECT
    store_id,
    customer_id,
    SUM(net_amount) AS total_spend
  FROM sales
  WHERE customer_id IS NOT NULL
  GROUP BY store_id, customer_id
),
ranked AS (
  SELECT
    store_id,
    customer_id,
    total_spend,
    ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY total_spend DESC, customer_id) AS rn
  FROM customer_spend
)
SELECT store_id, rn, customer_id, total_spend
FROM ranked
WHERE rn <= 2
ORDER BY store_id, rn;
```

| store_id | rn | customer_id | total_spend |
|---|---|---|---|
| S01 | 1 | C020 | 701.00 |
| S01 | 2 | C003 | 693.00 |
| S02 | 1 | C018 | 804.00 |
| S02 | 2 | C002 | 460.00 |
| S03 | 1 | C001 | 356.00 |
| S03 | 2 | C016 | 284.00 |
| S04 | 1 | C014 | 721.00 |
| S04 | 2 | C011 | 365.00 |
| S05 | 1 | C007 | 150.00 |
| S05 | 2 | C019 | 136.00 |

**เหตุผล:** รูปแบบเดิม 3 ขั้น เปลี่ยนแค่รายการที่จัดอันดับ (ลูกค้าแทนสินค้า) และตัดลูกค้าทั่วไป (NULL) ออกก่อนสรุป
:::
