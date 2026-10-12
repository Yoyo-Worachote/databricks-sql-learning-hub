## เขียนลำดับหนึ่ง แต่ SQL คิดอีกลำดับหนึ่ง

เราเขียน `SELECT` ไว้บนสุด แต่ในเชิงตรรกะ SQL ไม่ได้เริ่มจาก `SELECT` ระบบต้องรู้ก่อนว่าจะอ่านข้อมูลจากตารางไหน คัดแถวไหน จัดกลุ่มอย่างไร แล้วจึงคำนวณคอลัมน์ที่จะแสดง

| ลำดับที่**เขียน** | ลำดับเชิง**ตรรกะ**ที่ SQL ประมวลผล |
|---|---|
| 1. `SELECT` | 1. `FROM` และ `JOIN` |
| 2. `FROM` / `JOIN` | 2. `WHERE` |
| 3. `WHERE` | 3. `GROUP BY` |
| 4. `GROUP BY` | 4. `HAVING` |
| 5. `HAVING` | 5. `SELECT` (รวมการคำนวณ Window Function) |
| 6. `ORDER BY` | 6. `DISTINCT` |
| 7. `LIMIT` | 7. `ORDER BY` |
| | 8. `LIMIT` |

> [!KEY] นี่คือแบบจำลองเพื่อความเข้าใจ
> ลำดับนี้เรียกว่า **Logical Query Processing Order** เป็นแบบจำลองเชิงตรรกะที่อธิบายว่า "แต่ละส่วนของ Query มองเห็นข้อมูลอะไรได้บ้าง" **ไม่ใช่**ลำดับการทำงานจริงทุกขั้นของเครื่อง (Physical Execution Plan) ซึ่ง Databricks อาจสลับหรือรวมขั้นตอนเพื่อให้เร็วขึ้น โดยรับประกันว่าผลลัพธ์เหมือนกับที่แบบจำลองนี้บอก

## แบบจำลองลำดับเชิงตรรกะ 8 ขั้น

:::flow
FROM / JOIN | เลือกตาราง และจับคู่แถวระหว่างตาราง ได้ "ชุดแถวตั้งต้น"
WHERE | คัดแถวดิบทีละแถว (ยังไม่มีการสรุป)
GROUP BY | แบ่งแถวที่เหลือเป็นกลุ่ม
HAVING | คัดกลุ่มด้วยผลสรุป เช่น SUM, COUNT
SELECT | คำนวณคอลัมน์ ตั้งชื่อ Alias และคำนวณ Window Function
DISTINCT | ตัดแถวผลลัพธ์ที่ซ้ำกัน
ORDER BY | เรียงผลลัพธ์ (ใช้ Alias จาก SELECT ได้)
LIMIT | ตัดจำนวนแถว
:::

**หลักการสำคัญ:** แต่ละขั้น "มองเห็น" ได้เฉพาะสิ่งที่ขั้นก่อนหน้าสร้างไว้แล้ว ขั้นที่มาก่อนจึงใช้ของที่ขั้นหลังสร้างไม่ได้

## ตามรอยข้อมูลทีละขั้น

```sql {verify}
SELECT
  store_id,
  COUNT(*)        AS line_count,
  SUM(net_amount) AS total_net
FROM sales
WHERE sale_date >= DATE'2026-03-01'
  AND sale_date <  DATE'2026-04-01'
GROUP BY store_id
HAVING COUNT(*) >= 10
ORDER BY total_net DESC
LIMIT 2;
```

| store_id | line_count | total_net |
|---|---|---|
| S02 | 16 | 1748.00 |
| S01 | 12 | 1285.00 |

**ข้อมูลเปลี่ยนไปอย่างไรในแต่ละขั้น**

| ขั้น | สิ่งที่เกิดขึ้น | จำนวนที่เหลือ |
|---|---|---|
| 1. `FROM sales` | อ่านทุกรายการขาย | 141 แถว |
| 2. `WHERE` | เก็บเฉพาะเดือนมีนาคม 2026 | 51 แถว |
| 3. `GROUP BY store_id` | แบ่งเป็นกลุ่มตามสาขา: S01 (12), S02 (16), S03 (6), S04 (10), S05 (7) | 5 กลุ่ม |
| 4. `HAVING COUNT(*) >= 10` | ตัด S03 และ S05 ที่มีไม่ถึง 10 รายการ | 3 กลุ่ม |
| 5. `SELECT` | คำนวณ `line_count` และ `total_net` ตั้งชื่อ Alias | 3 แถว |
| 6. `DISTINCT` | ไม่มีใน Query นี้ | 3 แถว |
| 7. `ORDER BY total_net DESC` | เรียง S02 (1,748) → S01 (1,285) → S04 (972) | 3 แถว |
| 8. `LIMIT 2` | ตัดเหลือ 2 แถวแรก | 2 แถว |

## ผลที่ตามมา 1: WHERE ใช้ฟังก์ชันสรุปไม่ได้

`WHERE` (ขั้น 2) ทำงานก่อน `GROUP BY` (ขั้น 3) ตอนที่ `WHERE` ทำงาน ยังไม่มีกลุ่มและยังไม่มีค่า `SUM` ให้เปรียบเทียบ

```sql {error}
SELECT store_id, SUM(net_amount) AS total_net
FROM sales
WHERE SUM(net_amount) > 2500
GROUP BY store_id;
```

```text
[INVALID_WHERE_CONDITION] The WHERE condition "(sum(net_amount) > 2500)" contains invalid expressions
```

**วิธีแก้:** ย้ายเงื่อนไขไปที่ `HAVING` (ขั้น 4) ซึ่งทำงานหลังการสรุป

```sql {verify}
SELECT store_id, SUM(net_amount) AS total_net
FROM sales
GROUP BY store_id
HAVING SUM(net_amount) > 2500
ORDER BY total_net DESC;
```

| store_id | total_net |
|---|---|
| S01 | 4348.00 |
| S02 | 3230.00 |
| S04 | 2618.00 |

## ผลที่ตามมา 2: WHERE ใช้ชื่อ Alias จาก SELECT ไม่ได้

Alias ถูกสร้างที่ `SELECT` (ขั้น 5) แต่ `WHERE` อยู่ขั้น 2 จึงยังไม่รู้จักชื่อนั้น

```sql {error skip}
SELECT
  sale_id,
  quantity * unit_price AS gross_amount
FROM sales
WHERE gross_amount > 300;
```

```text
[UNRESOLVED_COLUMN.WITH_SUGGESTION] A column, variable, or function parameter with name
`gross_amount` cannot be resolved.
```

**วิธีแก้:** เขียนสูตรซ้ำใน `WHERE` (`WHERE quantity * unit_price > 300`) หรือคำนวณใน CTE ก่อนแล้วกรองในชั้นนอก ส่วน `ORDER BY` (ขั้น 7) ใช้ Alias ได้ตามปกติ เพราะทำงานหลัง `SELECT`

> [!DATABRICKS] จุดที่ Databricks ยืดหยุ่นกว่าแบบจำลอง
> - **GROUP BY และ HAVING อ้างชื่อ Alias ได้** เช่น `GROUP BY month_start` หรือ `HAVING total_net > 2500` ทั้งที่ตามแบบจำลองยังไม่มี Alias ในขั้นนั้น Databricks จะแปลงชื่อกลับเป็นสูตรให้ (SQL ระบบอื่นหลายตัวไม่ยอม)
> - **Lateral column alias:** Databricks รุ่นใหม่ให้คอลัมน์ใน `SELECT` อ้างถึง Alias ที่ตั้งไว้ก่อนหน้าใน `SELECT` เดียวกันได้ เช่น `SELECT quantity * unit_price AS gross, gross - discount_amount AS net_calc`
>
> ความยืดหยุ่นนี้สะดวก แต่ถ้า Query ต้องย้ายไปใช้กับระบบอื่น ให้เขียนตามแบบจำลองมาตรฐาน คือเขียนสูตรเต็มหรือใช้ CTE
>
> แต่ **WHERE อ้าง Alias จาก SELECT ไม่ได้** ใน Databricks

## ผลที่ตามมา 3: กรองผล Window Function ใน WHERE ไม่ได้

Window Function เช่น `ROW_NUMBER()` คำนวณที่ขั้น `SELECT` (ขั้น 5) แต่ `WHERE` ทำงานที่ขั้น 2 ตอนนั้นยังไม่มีอันดับให้กรอง

```sql {error}
SELECT
  store_id,
  product_id,
  ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY net_amount DESC) AS rn
FROM sales
WHERE rn <= 3;
```

ได้ Error เพราะ `rn` ยังไม่มีอยู่ในขั้น `WHERE` และถ้าเขียน `WHERE ROW_NUMBER() OVER (...) <= 3` ตรง ๆ ก็ Error เช่นกัน เพราะห้ามใช้ Window Function ใน `WHERE`

**วิธีแก้มาตรฐาน: คำนวณอันดับใน CTE แล้วกรองใน Query ชั้นนอก**

```sql {verify}
WITH ranked AS (
  SELECT
    store_id,
    product_id,
    net_amount,
    ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY net_amount DESC, sale_id) AS rn
  FROM sales
  WHERE store_id = 'S05'
)
SELECT store_id, product_id, net_amount, rn
FROM ranked
WHERE rn <= 3
ORDER BY store_id, rn;
```

| store_id | product_id | net_amount | rn |
|---|---|---|---|
| S05 | P006 | 150.00 | 1 |
| S05 | P009 | 118.00 | 2 |
| S05 | P006 | 90.00 | 3 |

**ทำไมวิธีนี้ได้ผล:** CTE `ranked` ทำงานจนจบทุกขั้น (รวมการคำนวณ `rn` ในขั้น `SELECT`) แล้วส่งผลลัพธ์ออกมาเป็น "ตารางชั่วคราว" ที่มีคอลัมน์ `rn` เป็นค่าธรรมดา Query ชั้นนอกจึงเริ่มขั้น `FROM ranked` ใหม่ และ `WHERE rn <= 3` มองเห็น `rn` แล้ว ใช้ Subquery ใน `FROM` แทน CTE ก็ได้ผลเหมือนกัน

> [!DATABRICKS] QUALIFY: ทางลัดเฉพาะ Databricks
> Databricks มี `QUALIFY` ซึ่งเป็นขั้นพิเศษที่ทำงาน**หลัง**การคำนวณ Window Function จึงกรองได้ใน Query ชั้นเดียว
>
> ```sql
> SELECT store_id, product_id, net_amount,
>        ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY net_amount DESC, sale_id) AS rn
> FROM sales
> WHERE store_id = 'S05'
> QUALIFY rn <= 3;
> ```
>
> สะดวก แต่ SQL Server, MySQL, PostgreSQL ไม่มี `QUALIFY` หลักสูตรนี้จึงสอนแบบ CTE เป็นหลัก ดู [QUALIFY](#/formula/f-qualify)

ลำดับที่สมบูรณ์ขึ้นเมื่อมี Window Function และ QUALIFY คือ: FROM → WHERE → GROUP BY → HAVING → **Window Function** → **QUALIFY** → SELECT (คอลัมน์สุดท้าย) → DISTINCT → ORDER BY → LIMIT

## ผลที่ตามมา 4: เงื่อนไขใน ON กับ WHERE ให้ผลต่างกันเมื่อใช้ LEFT JOIN

เงื่อนไขใน `ON` ถูกใช้**ระหว่าง**การจับคู่ (ขั้น 1) ส่วน `WHERE` คัดแถว**หลัง** JOIN เสร็จแล้ว (ขั้น 2)

| ตำแหน่งเงื่อนไข | ผลกับ LEFT JOIN `stores` → `sales` ที่ใส่ `payment_method = 'Cash'` |
|---|---|
| ใน `ON` | สาขาที่ไม่มีรายการเงินสดยังอยู่ (คอลัมน์ฝั่ง sales เป็น NULL) ได้ 6 สาขา |
| ใน `WHERE` | แถวที่ฝั่ง sales เป็น NULL ถูกตัดทิ้งหลัง JOIN สาขา S06 หายไป เหลือ 5 สาขา |

ดูตัวอย่างเต็มในบทที่ 10 หัวข้อ "กับดัก: LEFT JOIN แล้วกรองตารางขวาใน WHERE"

## ลำดับเชิงตรรกะ ≠ ลำดับการทำงานจริง

เมื่อรันจริง Databricks มีตัวปรับแต่ง (Optimizer) ที่วางแผนการทำงาน (Physical Plan) ให้เร็วที่สุด เช่น

- **ดันเงื่อนไขลงไปตอนอ่านข้อมูล (Predicate Pushdown):** เงื่อนไขช่วงวันที่ใน `WHERE` อาจถูกใช้ตั้งแต่ตอนอ่านไฟล์ เพื่อข้ามไฟล์ที่ไม่เกี่ยวข้อง (Data Skipping)
- **อ่านเฉพาะคอลัมน์ที่ใช้ (Column Pruning):** ถึงจะเขียน `SELECT` ไว้บนสุด ระบบรู้ล่วงหน้าว่าต้องใช้คอลัมน์ไหนบ้าง
- **กรองก่อน JOIN:** ถ้าเงื่อนไขเกี่ยวกับตารางเดียว อาจถูกย้ายไปทำก่อน JOIN
- **ไม่ต้องเรียงทั้งหมดก่อน LIMIT:** `ORDER BY ... LIMIT 5` อาจใช้วิธีเก็บแค่ 5 อันดับแรกโดยไม่เรียงทุกแถว

ผลลัพธ์สุดท้ายยังเหมือนกับที่แบบจำลองเชิงตรรกะบอกเสมอ เราจึงใช้แบบจำลองนี้ในการ**เขียนและอ่าน Query** และใช้ `EXPLAIN` หรือ Query Profile เมื่ออยากรู้ว่า**เครื่องทำงานจริง**อย่างไร (บทที่ 24)

## สรุปและตรวจความเข้าใจ

| อาการ | สาเหตุตามลำดับเชิงตรรกะ | วิธีแก้ |
|---|---|---|
| ใช้ `SUM` ใน `WHERE` ไม่ได้ | `WHERE` มาก่อน `GROUP BY` | ใช้ `HAVING` |
| ใช้ Alias ใน `WHERE` ไม่ได้ | `WHERE` มาก่อน `SELECT` | เขียนสูตรซ้ำ หรือใช้ CTE |
| กรอง `rn` ใน `WHERE` ไม่ได้ | Window Function คำนวณที่ `SELECT` | CTE / Subquery แล้วกรองชั้นนอก หรือ `QUALIFY` |
| `ORDER BY` ใช้ Alias ได้ | `ORDER BY` มาหลัง `SELECT` | ใช้ได้เลย |
| LEFT JOIN + WHERE ทำแถวหาย | `WHERE` ทำงานหลัง JOIN เสร็จ | ย้ายเงื่อนไขของตารางขวาไป `ON` |

> [!CHECK] ลองตอบ
> 1. เรียงลำดับเชิงตรรกะของ: `ORDER BY`, `HAVING`, `FROM`, `SELECT`, `WHERE`, `GROUP BY`, `LIMIT`
> 2. Query นี้ Error หรือไม่ เพราะอะไร: `SELECT store_id, SUM(net_amount) AS total FROM sales GROUP BY store_id ORDER BY total DESC;`
> 3. ทำไม `QUALIFY` กรอง `rn` ได้ แต่ `WHERE` กรองไม่ได้

:::answer ดูคำตอบ
1. `FROM` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `ORDER BY` → `LIMIT`
2. ไม่ Error เพราะ `ORDER BY` ทำงานหลัง `SELECT` จึงรู้จักชื่อ `total` แล้ว
3. `QUALIFY` เป็นขั้นที่ทำงาน**หลัง**คำนวณ Window Function ส่วน `WHERE` ทำงานก่อน จึงยังไม่มีค่า `rn`
:::

ฝึกเพิ่มที่ [แบบฝึกหัดเพิ่มเติม](#/exercises/ex-extra)
