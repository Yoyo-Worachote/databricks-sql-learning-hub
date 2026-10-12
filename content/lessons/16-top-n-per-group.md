## โจทย์: สินค้าขายดี 3 อันดับแรกของแต่ละร้าน

**สถานการณ์:** ทีมขายต้องการรู้ว่า "แต่ละสาขา สินค้าตัวไหนทำยอดขายได้สูงสุด 3 อันดับแรก" เพื่อวางแผนจัดสินค้าหน้าร้าน

โจทย์แบบนี้เรียกว่า **Top N ต่อกลุ่ม (Top N per Group)** ใช้บ่อยมากในงานจริง เช่น ลูกค้าที่ซื้อมากที่สุด 5 คนของแต่ละภูมิภาค หรือรายการล่าสุด 1 รายการของลูกค้าแต่ละคน

**ทำไม `ORDER BY ... LIMIT 3` ใช้ไม่ได้:** `LIMIT 3` ตัดเหลือ 3 แถวของ**ทั้งผลลัพธ์** ไม่ใช่ 3 แถวต่อสาขา เราต้องการให้อันดับ "เริ่มนับใหม่" ในแต่ละสาขา ซึ่งต้องใช้ `ROW_NUMBER()` กับ `PARTITION BY`

## ข้อมูลต้นทาง: ตาราง store_product

ตาราง `store_product` เก็บยอดขายสุทธิรวมของสินค้าแต่ละตัวในแต่ละสาขา (1 แถว = 1 สาขา × 1 สินค้า) สร้างได้จากไฟล์ `practice_extra_tables.sql` ([ดูหน้าชุดข้อมูล](#/reference/dataset))

| Column | ชนิดข้อมูล | คำอธิบาย |
|---|---|---|
| `store_id` | STRING | รหัสสาขา |
| `product_id` | STRING | รหัสสินค้า |
| `total_net` | DECIMAL(12,2) | ยอดขายสุทธิรวมของสินค้านี้ในสาขานี้ |

**ข้อมูลตัวอย่างทั้งหมด (12 แถว 3 สาขา)** ตั้งใจใส่กรณีที่ยอดเท่ากันไว้ 2 จุด

| store_id | product_id | total_net | หมายเหตุ |
|---|---|---|---|
| S01 | P001 | 1200.00 | |
| S01 | P002 | 950.00 | ยอดเท่ากับ P003 |
| S01 | P003 | 950.00 | ยอดเท่ากับ P002 |
| S01 | P004 | 600.00 | |
| S01 | P005 | 300.00 | |
| S02 | P001 | 800.00 | |
| S02 | P003 | 700.00 | |
| S02 | P005 | 500.00 | ยอดเท่ากับ P006 ตรงตำแหน่งอันดับ 3 |
| S02 | P006 | 500.00 | ยอดเท่ากับ P005 ตรงตำแหน่งอันดับ 3 |
| S02 | P002 | 200.00 | |
| S03 | P002 | 400.00 | มีสินค้าเพียง 2 ตัว |
| S03 | P004 | 350.00 | |

## SQL Query ฉบับเต็ม

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

**ผลลัพธ์ (8 แถว)**

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

S01 และ S02 ได้ 3 สินค้า ส่วน S03 ได้ 2 สินค้าเพราะมีสินค้าเพียง 2 ตัว (`rn <= 3` คือ "ไม่เกิน 3" ไม่ได้บังคับให้ครบ 3)

> [!TIP] ลองรันได้ทันทีโดยไม่ต้องสร้างตาราง
> ถ้ายังไม่ได้สร้างตาราง `store_product` ให้ใช้ Query ในหัวข้อ "ฉบับรันได้ทันที" ท้ายบท ซึ่งใส่ข้อมูลตัวอย่างไว้ใน Query เดียวกัน

## อธิบายโค้ดทีละส่วน

| ส่วนของ Query | ความหมาย |
|---|---|
| `WITH ranked_products AS ( ... )` | สร้าง CTE ชื่อ `ranked_products` เป็นผลลัพธ์ชั่วคราวที่มีอันดับแล้ว |
| `ROW_NUMBER()` | ให้เลขลำดับ 1, 2, 3, … กับแต่ละแถว **ไม่มีเลขซ้ำ** แม้ค่าจะเท่ากัน |
| `OVER ( ... )` | บอกว่า ROW_NUMBER เป็น Window Function และกำหนดวิธีนับ |
| `PARTITION BY store_id` | แบ่งแถวเป็นกลุ่มตามสาขา และ**เริ่มนับ 1 ใหม่ทุกสาขา** |
| `ORDER BY total_net DESC` | ภายในแต่ละสาขา เรียงยอดขายจากมากไปน้อย ยอดสูงสุดได้เลข 1 |
| `, product_id` | ตัวตัดสิน (Tie-breaker) เมื่อยอดเท่ากัน ให้รหัสสินค้าที่น้อยกว่ามาก่อน |
| `AS rn` | ตั้งชื่อคอลัมน์อันดับว่า `rn` (ย่อจาก row number) |
| `FROM ranked_products` | Query ชั้นนอกอ่านจากผลของ CTE |
| `WHERE rn <= 3` | เก็บเฉพาะอันดับ 1, 2, 3 ของแต่ละสาขา |
| `ORDER BY store_id, rn` | เรียงผลลัพธ์ให้อ่านง่าย: ตามสาขา แล้วตามอันดับ |

## ข้อมูลเปลี่ยนไปอย่างไรในแต่ละขั้น

**ขั้นที่ 1 — PARTITION BY store_id:** แบ่ง 12 แถวเป็น 3 กลุ่ม (ระบบไม่ได้สร้างตารางแยกจริง แต่คำนวณแยกกลุ่มกัน)

| กลุ่ม | แถวในกลุ่ม |
|---|---|
| S01 | P001 (1200), P002 (950), P003 (950), P004 (600), P005 (300) |
| S02 | P001 (800), P003 (700), P005 (500), P006 (500), P002 (200) |
| S03 | P002 (400), P004 (350) |

**ขั้นที่ 2 — ORDER BY total_net DESC, product_id:** เรียงแถวในแต่ละกลุ่ม ยอดเท่ากันให้ `product_id` น้อยกว่ามาก่อน (P002 ก่อน P003 และ P005 ก่อน P006)

**ขั้นที่ 3 — ROW_NUMBER():** ให้เลขตามลำดับในแต่ละกลุ่ม และ**เริ่ม 1 ใหม่เมื่อเปลี่ยนร้าน** นี่คือผลของ CTE `ranked_products` (ยังไม่กรอง)

| store_id | product_id | total_net | rn |
|---|---|---|---|
| S01 | P001 | 1200.00 | **1** |
| S01 | P002 | 950.00 | **2** |
| S01 | P003 | 950.00 | **3** |
| S01 | P004 | 600.00 | 4 |
| S01 | P005 | 300.00 | 5 |
| S02 | P001 | 800.00 | **1** ← เริ่มนับใหม่ |
| S02 | P003 | 700.00 | **2** |
| S02 | P005 | 500.00 | **3** |
| S02 | P006 | 500.00 | 4 |
| S02 | P002 | 200.00 | 5 |
| S03 | P002 | 400.00 | **1** ← เริ่มนับใหม่ |
| S03 | P004 | 350.00 | **2** |

**ขั้นที่ 4 — WHERE rn <= 3 (Query ชั้นนอก):** ตัดแถวที่ `rn` เป็น 4 และ 5 ออก เหลือ 8 แถว

**ขั้นที่ 5 — ORDER BY store_id, rn:** เรียงเพื่อแสดงผล ได้ผลลัพธ์ตามตารางในหัวข้อ "SQL Query ฉบับเต็ม"

ตรวจความถูกต้องของ CTE ได้ด้วยตัวเอง โดยรันเฉพาะส่วนจัดอันดับ (ไม่กรอง)

```sql {verify}
SELECT
    store_id,
    product_id,
    total_net,
    ROW_NUMBER() OVER (
        PARTITION BY store_id
        ORDER BY total_net DESC, product_id
    ) AS rn
FROM store_product
ORDER BY store_id, rn;
```

| store_id | product_id | total_net | rn |
|---|---|---|---|
| S01 | P001 | 1200.00 | 1 |
| S01 | P002 | 950.00 | 2 |
| S01 | P003 | 950.00 | 3 |
| S01 | P004 | 600.00 | 4 |
| S01 | P005 | 300.00 | 5 |
| S02 | P001 | 800.00 | 1 |
| S02 | P003 | 700.00 | 2 |
| S02 | P005 | 500.00 | 3 |
| S02 | P006 | 500.00 | 4 |
| S02 | P002 | 200.00 | 5 |
| S03 | P002 | 400.00 | 1 |
| S03 | P004 | 350.00 | 2 |

## ทำไมต้องใช้ CTE และกรองในชั้นนอก

ตามลำดับการทำงานเชิงตรรกะของ SQL (บทที่ 13)

:::flow
FROM | อ่านตาราง store_product
WHERE | กรองแถวดิบ (ตอนนี้ยังไม่มี rn)
SELECT | คำนวณ ROW_NUMBER() ได้คอลัมน์ rn
ORDER BY | เรียงผลลัพธ์
:::

`WHERE` ทำงาน**ก่อน**ที่ `ROW_NUMBER()` จะถูกคำนวณ ถ้าเขียน `WHERE rn <= 3` ใน Query เดียวกับที่สร้าง `rn` ระบบจะไม่รู้จัก `rn` และ Error

```sql {error}
SELECT
    store_id,
    product_id,
    total_net,
    ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY total_net DESC, product_id) AS rn
FROM store_product
WHERE rn <= 3;
```

เมื่อใส่การจัดอันดับไว้ใน CTE ผลของ CTE จะออกมาเป็น "ตารางชั่วคราว" ที่ `rn` เป็นคอลัมน์ธรรมดาแล้ว Query ชั้นนอกจึงกรอง `rn <= 3` ได้ (ใช้ Subquery ใน `FROM` แทน CTE ก็ได้ผลเหมือนกัน แต่ CTE อ่านง่ายกว่า)

> [!DATABRICKS] ทางลัด QUALIFY
> Databricks กรองได้ใน Query เดียวด้วย `QUALIFY rn <= 3` (ต่อท้ายหลัง `FROM`/`WHERE`/`GROUP BY`) แต่ใช้ไม่ได้ใน SQL ระบบอื่นส่วนใหญ่ ดู [QUALIFY](#/formula/f-qualify)

## เมื่อยอดขายเท่ากัน: ROW_NUMBER, RANK หรือ DENSE_RANK

เปรียบเทียบทั้ง 3 ฟังก์ชันกับข้อมูลเดียวกัน (ยังไม่กรอง)

```sql {verify}
SELECT
    store_id,
    product_id,
    total_net,
    ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY total_net DESC, product_id) AS rn,
    RANK()       OVER (PARTITION BY store_id ORDER BY total_net DESC)             AS rnk,
    DENSE_RANK() OVER (PARTITION BY store_id ORDER BY total_net DESC)             AS dense_rnk
FROM store_product
ORDER BY store_id, rn;
```

| store_id | product_id | total_net | rn | rnk | dense_rnk |
|---|---|---|---|---|---|
| S01 | P001 | 1200.00 | 1 | 1 | 1 |
| S01 | P002 | 950.00 | 2 | 2 | 2 |
| S01 | P003 | 950.00 | 3 | 2 | 2 |
| S01 | P004 | 600.00 | 4 | 4 | 3 |
| S01 | P005 | 300.00 | 5 | 5 | 4 |
| S02 | P001 | 800.00 | 1 | 1 | 1 |
| S02 | P003 | 700.00 | 2 | 2 | 2 |
| S02 | P005 | 500.00 | 3 | 3 | 3 |
| S02 | P006 | 500.00 | 4 | 3 | 3 |
| S02 | P002 | 200.00 | 5 | 5 | 4 |
| S03 | P002 | 400.00 | 1 | 1 | 1 |
| S03 | P004 | 350.00 | 2 | 2 | 2 |

**ผลของเงื่อนไข "<= 3" กับแต่ละฟังก์ชัน**

| สาขา | `rn <= 3` (ROW_NUMBER) | `rnk <= 3` (RANK) | `dense_rnk <= 3` (DENSE_RANK) |
|---|---|---|---|
| S01 | P001, P002, P003 (3 ตัว) | P001, P002, P003 (3 ตัว) | P001, P002, P003, **P004** (4 ตัว) |
| S02 | P001, P003, P005 (3 ตัว) | P001, P003, P005, **P006** (4 ตัว) | P001, P003, P005, **P006** (4 ตัว) |
| S03 | P002, P004 | P002, P004 | P002, P004 |

- **S01:** P002 กับ P003 เสมอกันที่อันดับ 2 `RANK` ข้ามเลข 3 ไป ทำให้ P004 ได้อันดับ 4 จึงไม่ติด แต่ `DENSE_RANK` ไม่ข้ามเลข P004 ได้ระดับ 3 จึงติดด้วย
- **S02:** P005 กับ P006 เสมอกันตรงตำแหน่งอันดับ 3 `ROW_NUMBER` ต้องเลือกตัวเดียว (P005 เพราะรหัสน้อยกว่า) ส่วน `RANK` และ `DENSE_RANK` ให้ติดทั้งคู่

> [!KEY] เรื่อง product_id ในฐานะตัวตัดสิน
> การเพิ่ม `product_id` หลัง `total_net DESC` ทำให้ `ROW_NUMBER` ให้ผลเหมือนเดิมทุกครั้งที่รัน (Deterministic) เมื่อยอดเท่ากัน ถ้าไม่มีตัวตัดสิน P005 กับ P006 อาจสลับกันได้ในแต่ละครั้ง แต่ "รหัสน้อยกว่าชนะ" **ไม่มีความหมายทางธุรกิจ** ควรตกลงกติกากับผู้ใช้รายงาน เช่น
> - ใช้จำนวนชิ้นที่ขายได้มากกว่า: `ORDER BY total_net DESC, total_qty DESC, product_id`
> - ใช้กำไรขั้นต้นสูงกว่า: `ORDER BY total_net DESC, gross_profit DESC, product_id`
> - ให้ติดอันดับทั้งคู่: เปลี่ยนเป็น `RANK()` และยอมรับว่าอาจได้มากกว่า 3 รายการ
>
> ใส่ `product_id` ไว้ท้ายสุดเสมอเพื่อรับประกันผลคงที่ในกรณีที่ทุกเกณฑ์เท่ากันหมด

## ใช้กับข้อมูลจริง: จากตาราง sales ใน Query เดียว

ในงานจริงมักไม่มีตาราง `store_product` สำเร็จรูป ต้องสรุปจากรายการขายก่อน Query นี้ทำทุกขั้นตอนในกล่องเดียว และเติมชื่อสินค้าพร้อมใช้จำนวนชิ้นเป็นตัวตัดสินที่มีความหมาย

```sql {verify}
WITH store_product AS (
    SELECT
        s.store_id,
        s.product_id,
        COALESCE(p.product_name, s.product_id) AS product_name,
        SUM(s.net_amount)                      AS total_net,
        SUM(s.quantity)                        AS total_qty
    FROM sales AS s
    LEFT JOIN products AS p
        ON s.product_id = p.product_id
    GROUP BY s.store_id, s.product_id, COALESCE(p.product_name, s.product_id)
),
ranked_products AS (
    SELECT
        store_id,
        product_id,
        product_name,
        total_net,
        total_qty,
        ROW_NUMBER() OVER (
            PARTITION BY store_id
            ORDER BY total_net DESC, total_qty DESC, product_id
        ) AS rn
    FROM store_product
)
SELECT
    store_id,
    rn,
    product_id,
    product_name,
    total_net,
    total_qty
FROM ranked_products
WHERE rn <= 3
ORDER BY store_id, rn;
```

**ผลลัพธ์ (15 แถว)**

| store_id | rn | product_id | product_name | total_net | total_qty |
|---|---|---|---|---|---|
| S01 | 1 | P007 | สบู่เหลว 450ml | 1498.00 | 17 |
| S01 | 2 | P008 | แชมพู 400ml | 774.00 | 6 |
| S01 | 3 | P009 | ยาสีฟัน 160g | 737.00 | 13 |
| S02 | 1 | P007 | สบู่เหลว 450ml | 781.00 | 9 |
| S02 | 2 | P001 | น้ำดื่ม 600ml | 461.00 | 68 |
| S02 | 3 | P003 | กาแฟกระป๋อง 180ml | 440.00 | 25 |
| S03 | 1 | P007 | สบู่เหลว 450ml | 356.00 | 4 |
| S03 | 2 | P003 | กาแฟกระป๋อง 180ml | 345.00 | 20 |
| S03 | 3 | P010 | น้ำยาล้างจาน 500ml | 234.00 | 6 |
| S04 | 1 | P007 | สบู่เหลว 450ml | 885.00 | 10 |
| S04 | 2 | P009 | ยาสีฟัน 160g | 295.00 | 5 |
| S04 | 3 | P099 | P099 | 270.00 | 6 |
| S05 | 1 | P006 | ถั่วอบเกลือ 40g | 330.00 | 11 |
| S05 | 2 | P009 | ยาสีฟัน 160g | 118.00 | 2 |
| S05 | 3 | P003 | กาแฟกระป๋อง 180ml | 85.00 | 5 |

**3 ขั้นของ Query**

| ขั้น | CTE | ได้อะไร |
|---|---|---|
| 1 | `store_product` | สรุปรายการขาย 141 แถว เหลือ 1 แถวต่อสาขาต่อสินค้า พร้อมชื่อสินค้า (LEFT JOIN เพื่อไม่ให้ P099 หาย) |
| 2 | `ranked_products` | จัดอันดับภายในแต่ละสาขา |
| 3 | `SELECT` หลัก | เก็บอันดับ 1–3 และเรียงผล |

> [!WARNING] ตรวจข้อมูลก่อนสรุปผล
> - **S02 อันดับ 2 (น้ำดื่ม P001)** รวมรายการผิดปกติ 60 ชิ้น (T0096, 420 บาท) อยู่ด้วย ถ้าตัดรายการนี้ อันดับของ S02 จะเปลี่ยน
> - **S04 อันดับ 3 (P099)** เป็นรหัสสินค้าที่ไม่มีในตารางสินค้า ต้องแจ้งเจ้าของข้อมูล
>
> ในรายงานจริงควรทำความสะอาดข้อมูลก่อน (บทที่ 19) แล้วจึงจัดอันดับ

## ฉบับรันได้ทันที (ไม่ต้องสร้างตาราง)

Query นี้ใส่ข้อมูลตัวอย่าง 12 แถวไว้ใน CTE ด้วย `VALUES` คัดลอกไปรันใน SQL Editor ได้เลย ผลลัพธ์เหมือนหัวข้อ "SQL Query ฉบับเต็ม"

```sql {verify}
WITH store_product AS (
    SELECT *
    FROM VALUES
        ('S01', 'P001', 1200.00),
        ('S01', 'P002',  950.00),
        ('S01', 'P003',  950.00),
        ('S01', 'P004',  600.00),
        ('S01', 'P005',  300.00),
        ('S02', 'P001',  800.00),
        ('S02', 'P003',  700.00),
        ('S02', 'P005',  500.00),
        ('S02', 'P006',  500.00),
        ('S02', 'P002',  200.00),
        ('S03', 'P002',  400.00),
        ('S03', 'P004',  350.00)
        AS t(store_id, product_id, total_net)
),
ranked_products AS (
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

`FROM VALUES (...), (...) AS t(col1, col2, col3)` คือการสร้างตารางชั่วคราวจากค่าที่พิมพ์ไว้ (Inline Table) เหมาะกับการทดลองและการสอน

## ข้อผิดพลาดที่พบบ่อย

- ใช้ `ORDER BY ... LIMIT 3` ได้ Top 3 ของทั้งบริษัท ไม่ใช่ต่อสาขา
- ลืม `PARTITION BY store_id` อันดับจะไม่เริ่มนับใหม่ในแต่ละสาขา
- ใช้ `ORDER BY total_net` โดยลืม `DESC` ได้สินค้าที่ขายได้**น้อย**ที่สุดแทน
- กรอง `rn` ใน `WHERE` ของ Query เดียวกับที่สร้าง `rn`
- ไม่ใส่ตัวตัดสิน ทำให้ผลลัพธ์ไม่คงที่เมื่อยอดเท่ากัน
- จัดอันดับจากรายการขายดิบแทนยอดรวมต่อสินค้า (ต้อง `GROUP BY` ก่อนจัดอันดับ ถ้าโจทย์ถามถึงยอดรวม)

## ฝึกทำ

**โจทย์ 1:** จากตาราง `store_product` หาสินค้าอันดับ 1 ของแต่ละสาขา โดยถ้ายอดเท่ากันให้ติดอันดับ 1 ทุกตัว

:::answer ดูเฉลยและคำอธิบาย
```sql {verify}
WITH ranked_products AS (
    SELECT
        store_id,
        product_id,
        total_net,
        RANK() OVER (
            PARTITION BY store_id
            ORDER BY total_net DESC
        ) AS rnk
    FROM store_product
)
SELECT
    store_id,
    product_id,
    total_net
FROM ranked_products
WHERE rnk = 1
ORDER BY store_id, product_id;
```

| store_id | product_id | total_net |
|---|---|---|
| S01 | P001 | 1200.00 |
| S02 | P001 | 800.00 |
| S03 | P002 | 400.00 |

**เหตุผล:** โจทย์บอกว่ายอดเท่ากันต้องติดทุกตัว จึงใช้ `RANK()` แทน `ROW_NUMBER()` ในข้อมูลชุดนี้อันดับ 1 ของทุกสาขาไม่มียอดเท่ากัน จึงได้สาขาละ 1 แถว แต่ถ้าวันหนึ่งมีสินค้าสองตัวยอดสูงสุดเท่ากัน Query นี้จะแสดงทั้งสองตัวโดยอัตโนมัติ
:::

**โจทย์ 2:** จากตาราง `sales` หาวิธีชำระเงินที่ทำยอดสูงสุด 2 อันดับแรกของแต่ละสาขา

:::answer ดูเฉลยและคำอธิบาย
```sql {verify}
WITH store_payment AS (
    SELECT
        store_id,
        payment_method,
        SUM(net_amount) AS total_net
    FROM sales
    GROUP BY store_id, payment_method
),
ranked_payments AS (
    SELECT
        store_id,
        payment_method,
        total_net,
        ROW_NUMBER() OVER (
            PARTITION BY store_id
            ORDER BY total_net DESC, payment_method
        ) AS rn
    FROM store_payment
)
SELECT
    store_id,
    rn,
    payment_method,
    total_net
FROM ranked_payments
WHERE rn <= 2
ORDER BY store_id, rn;
```

| store_id | rn | payment_method | total_net |
|---|---|---|---|
| S01 | 1 | QR Payment | 1591.00 |
| S01 | 2 | Credit Card | 1458.00 |
| S02 | 1 | QR Payment | 1383.00 |
| S02 | 2 | Cash | 1007.00 |
| S03 | 1 | Cash | 917.00 |
| S03 | 2 | QR Payment | 425.00 |
| S04 | 1 | Credit Card | 1059.00 |
| S04 | 2 | QR Payment | 872.00 |
| S05 | 1 | Cash | 395.00 |
| S05 | 2 | Credit Card | 268.00 |

**เหตุผล:** รูปแบบเดียวกับ Top 3 Products per Store: (1) สรุปยอดต่อสาขาต่อวิธีชำระ (2) จัดอันดับภายในสาขา (3) กรองในชั้นนอก เปลี่ยนแค่คอลัมน์ที่จัดอันดับและตัวเลข N
:::

ดูสูตรย่อที่ [Top N ต่อกลุ่ม](#/formula/f-top-n-per-group) และฝึกเพิ่มที่ [แบบฝึกหัด: Window Functions และการจัดอันดับ](#/exercises/ex-window)
