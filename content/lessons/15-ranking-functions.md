## ฟังก์ชันจัดอันดับ 3 ตัว

ทั้งสามฟังก์ชันเป็น Window Function ที่ให้เลขอันดับตามลำดับใน `ORDER BY` ภายใน `OVER (...)` ต่างกัน**เฉพาะตอนที่ค่าเท่ากัน**

| ฟังก์ชัน | เมื่อค่าเท่ากัน | ตัวอย่างลำดับ | ใช้เมื่อ |
|---|---|---|---|
| `ROW_NUMBER()` | ให้เลขต่างกันเสมอ ไม่มีซ้ำ | 1, 2, 3, 4 | ต้องการจำนวนแถวที่แน่นอน เช่น Top 3 ได้ 3 แถวพอดี หรือเลือก 1 แถวต่อ Key |
| `RANK()` | ได้อันดับเดียวกัน แล้ว**ข้าม**เลขถัดไป | 1, 2, 2, 4 | แบบการแข่งขัน: เสมอกันได้อันดับร่วม อันดับถัดไปนับตามจำนวนคนที่อยู่ข้างหน้า |
| `DENSE_RANK()` | ได้อันดับเดียวกัน แต่**ไม่ข้าม**เลข | 1, 2, 2, 3 | ต้องการรู้ว่าเป็น "ระดับ" ที่เท่าไร เช่น ราคาสูงสุดอันดับ 3 ระดับ |

**รูปแบบ (Syntax)**

```sql
ROW_NUMBER() OVER (PARTITION BY group_col ORDER BY value_col DESC, tie_breaker_col) AS rn
RANK()       OVER (PARTITION BY group_col ORDER BY value_col DESC)                  AS rnk
DENSE_RANK() OVER (PARTITION BY group_col ORDER BY value_col DESC)                  AS dense_rnk
```

## เห็นความต่างกับข้อมูลที่มีค่าเท่ากัน

**สถานการณ์:** จัดอันดับสินค้าตามจำนวนรายการขาย (ทั้งบริษัท) ข้อมูลนี้มีค่าเท่ากัน 2 จุด คือ P001 กับ P002 (20 รายการ) และ P006 กับ P010 (8 รายการ)

```sql {verify}
WITH product_lines AS (
  SELECT
    product_id,
    COUNT(*) AS line_count
  FROM sales
  GROUP BY product_id
)
SELECT
  product_id,
  line_count,
  ROW_NUMBER() OVER (ORDER BY line_count DESC, product_id) AS row_num,
  RANK()       OVER (ORDER BY line_count DESC)             AS rnk,
  DENSE_RANK() OVER (ORDER BY line_count DESC)             AS dense_rnk
FROM product_lines
ORDER BY line_count DESC, product_id;
```

| product_id | line_count | row_num | rnk | dense_rnk |
|---|---|---|---|---|
| P003 | 23 | 1 | 1 | 1 |
| P001 | 20 | 2 | 2 | 2 |
| P002 | 20 | 3 | 2 | 2 |
| P004 | 18 | 4 | 4 | 3 |
| P007 | 15 | 5 | 5 | 4 |
| P005 | 13 | 6 | 6 | 5 |
| P009 | 12 | 7 | 7 | 6 |
| P006 | 8 | 8 | 8 | 7 |
| P010 | 8 | 9 | 8 | 7 |
| P008 | 3 | 10 | 10 | 8 |
| P099 | 1 | 11 | 11 | 9 |

**อ่านผลที่แถว P004 (18 รายการ)**

- `row_num = 4` เพราะเป็นแถวที่ 4 ตามลำดับ
- `rnk = 4` เพราะมีสินค้า 3 ตัวที่ขายได้มากกว่า (P003, P001, P002) เลข 3 จึงถูกข้าม
- `dense_rnk = 3` เพราะเป็นค่าที่มากเป็น "ระดับ" ที่ 3 (23 > 20 > 18)

**ทำไม ROW_NUMBER ใส่ `product_id` เพิ่ม:** P001 กับ P002 มีค่าเท่ากัน ถ้าไม่มีตัวตัดสิน ระบบอาจให้ P001 เป็นอันดับ 2 ในวันนี้ และให้ P002 ในวันพรุ่งนี้ ผลลัพธ์จะไม่คงที่ (Non-deterministic) การเพิ่ม `product_id` ทำให้ลำดับแน่นอนทุกครั้ง ส่วน `RANK` และ `DENSE_RANK` ไม่จำเป็นต้องมีตัวตัดสิน เพราะให้อันดับเท่ากันอยู่แล้ว

## PARTITION BY: เริ่มนับอันดับใหม่ในแต่ละกลุ่ม

**สถานการณ์:** จัดอันดับราคาสินค้า**ภายในแต่ละหมวด** (เฉพาะ Beverage และ Snack)

```sql {verify}
SELECT
  category,
  product_id,
  product_name,
  list_price,
  ROW_NUMBER() OVER (PARTITION BY category ORDER BY list_price DESC, product_id) AS price_rank_in_category
FROM products
WHERE category IN ('Beverage', 'Snack')
ORDER BY category, price_rank_in_category;
```

| category | product_id | product_name | list_price | price_rank_in_category |
|---|---|---|---|---|
| Beverage | P002 | ชาเขียว 500ml | 20.00 | 1 |
| Beverage | P003 | กาแฟกระป๋อง 180ml | 18.00 | 2 |
| Beverage | P001 | น้ำดื่ม 600ml | 7.00 | 3 |
| Snack | P006 | ถั่วอบเกลือ 40g | 30.00 | 1 |
| Snack | P004 | มันฝรั่งทอด 50g | 25.00 | 2 |
| Snack | P005 | ขนมปังกรอบ 60g | 15.00 | 3 |

อันดับเริ่มที่ 1 ใหม่เมื่อเปลี่ยนจาก Beverage เป็น Snack ถ้าลืม `PARTITION BY category` จะได้อันดับ 1–6 รวมกันทั้งสองหมวด

> [!MISTAKE] ลืม PARTITION BY
> ต้องการ "อันดับ 1 ของแต่ละสาขา" แต่เขียน `ROW_NUMBER() OVER (ORDER BY total_net DESC)` จะได้อันดับ 1 เพียงแถวเดียวทั้งบริษัท ไม่ใช่อันดับ 1 ของแต่ละสาขา ใส่ `PARTITION BY` ตามระดับที่ต้องการเริ่มนับใหม่เสมอ

## เลือกฟังก์ชันตามกติกาทางธุรกิจ

ใช้ตาราง `store_product` (ยอดขายรวมต่อสาขาต่อสินค้า จากไฟล์ตารางเสริม) สาขา S02 มีสินค้า 2 ตัวยอดเท่ากันที่ 500 บาท ตรงตำแหน่งอันดับ 3 พอดี

```sql {verify}
SELECT
  store_id,
  product_id,
  total_net,
  ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY total_net DESC, product_id) AS rn,
  RANK()       OVER (PARTITION BY store_id ORDER BY total_net DESC)             AS rnk,
  DENSE_RANK() OVER (PARTITION BY store_id ORDER BY total_net DESC)             AS dense_rnk
FROM store_product
WHERE store_id = 'S02'
ORDER BY rn;
```

| store_id | product_id | total_net | rn | rnk | dense_rnk |
|---|---|---|---|---|---|
| S02 | P001 | 800.00 | 1 | 1 | 1 |
| S02 | P003 | 700.00 | 2 | 2 | 2 |
| S02 | P005 | 500.00 | 3 | 3 | 3 |
| S02 | P006 | 500.00 | 4 | 3 | 3 |
| S02 | P002 | 200.00 | 5 | 5 | 4 |

ถ้าโจทย์คือ "Top 3 ของสาขา S02" แต่ละฟังก์ชันให้คำตอบต่างกัน

| กติกาที่ตกลงกับผู้ใช้รายงาน | ฟังก์ชัน | เงื่อนไข | ได้สินค้า |
|---|---|---|---|
| ต้องได้ 3 รายการพอดี (เช่น มีพื้นที่วางโปรโมชันแค่ 3 ช่อง) | `ROW_NUMBER` | `rn <= 3` | P001, P003, P005 (P006 หลุดเพราะตัวตัดสิน `product_id`) |
| ยอดเท่ากันต้องได้สิทธิ์เท่ากัน จำนวนอาจเกิน 3 | `RANK` | `rnk <= 3` | P001, P003, P005, P006 |
| ต้องการ 3 "ระดับยอดขาย" แรก | `DENSE_RANK` | `dense_rnk <= 3` | P001, P003, P005, P006 |

> [!KEY] ไม่มีฟังก์ชันไหนถูกเสมอ
> เลือกตามกติกาทางธุรกิจ และถ้าใช้ `ROW_NUMBER` ต้องตกลงตัวตัดสินที่มีความหมาย เช่น สินค้าที่ขายได้จำนวนชิ้นมากกว่า หรือกำไรสูงกว่า แทนการใช้รหัสสินค้าซึ่งเป็นเพียงการตัดสินให้ผลคงที่เท่านั้น

## ข้อผิดพลาดที่พบบ่อย

- ใช้ `ROW_NUMBER` ทั้งที่ธุรกิจต้องการให้ค่าเท่ากันได้อันดับเดียวกัน
- ไม่ใส่ตัวตัดสินใน `ROW_NUMBER` ทำให้ผลเปลี่ยนไปมาเมื่อรันซ้ำ
- ลืม `PARTITION BY` ทำให้จัดอันดับรวมทุกกลุ่ม
- เรียง `ORDER BY` ผิดทิศ (ต้องการยอดสูงสุดเป็นอันดับ 1 ต้องใช้ `DESC`)
- พยายามกรองอันดับใน `WHERE` ของ Query เดียวกัน (ต้องใช้ CTE ดูบทถัดไป)

## ฝึกทำ

**โจทย์:** จัดอันดับสินค้าทุกตัวตามราคาป้าย (`list_price`) จากแพงไปถูกด้วย `DENSE_RANK` แสดงเฉพาะ 5 อันดับราคาแรก (เรียงอันดับแล้วตาม `product_id`)

:::answer ดูเฉลยและคำอธิบาย
```sql {verify partial}
SELECT
  product_id,
  product_name,
  list_price,
  DENSE_RANK() OVER (ORDER BY list_price DESC) AS price_rank
FROM products
ORDER BY price_rank, product_id;
```

| product_id | product_name | list_price | price_rank |
|---|---|---|---|
| P008 | แชมพู 400ml | 129.00 | 1 |
| P012 | กระดาษทิชชู 6 ม้วน | 99.00 | 2 |
| P007 | สบู่เหลว 450ml | 89.00 | 3 |
| P009 | ยาสีฟัน 160g | 59.00 | 4 |
| P011 | ถุงขยะ 30 ใบ | 49.00 | 5 |

**เหตุผล:** ไม่มี `PARTITION BY` จึงจัดอันดับรวมทั้งตาราง สินค้าในชุดนี้ราคาไม่ซ้ำกัน ทั้ง 3 ฟังก์ชันจึงให้ผลเหมือนกัน ถ้าต้องการแสดงเฉพาะอันดับ 1–5 ด้วยเงื่อนไข ต้องครอบด้วย CTE แล้วกรอง `price_rank <= 5` ในชั้นนอก (ตารางด้านบนแสดง 5 จาก 12 แถว)
:::

ต่อไปจะนำความรู้นี้ไปทำโจทย์ยอดนิยม [Top 3 Products per Store](#/lesson/top-n-per-group) และดูสูตรเปรียบเทียบที่ [ROW_NUMBER vs RANK vs DENSE_RANK](#/formula/f-ranking-compare)
