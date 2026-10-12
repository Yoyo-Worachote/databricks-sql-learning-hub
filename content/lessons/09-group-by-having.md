## GROUP BY คืออะไร

`GROUP BY` แบ่งแถวเป็น**กลุ่ม**ตามค่าของคอลัมน์ที่ระบุ แล้วให้ฟังก์ชันสรุปคำนวณแยกแต่ละกลุ่ม ผลลัพธ์จะได้ **1 แถวต่อ 1 กลุ่ม** เหมือนการลากคอลัมน์ไปที่ Rows ของ PivotTable

**รูปแบบ (Syntax)**

```sql
SELECT
  group_column,
  COUNT(*)        AS row_count,
  SUM(amount_col) AS total_amount
FROM table_name
WHERE row_condition
GROUP BY group_column
HAVING SUM(amount_col) > 1000
ORDER BY total_amount DESC;
```

> [!KEY] กฎสำคัญที่สุดของ GROUP BY
> ทุกคอลัมน์ใน `SELECT` ที่**ไม่ได้อยู่ในฟังก์ชันสรุป** ต้องอยู่ใน `GROUP BY`

## เห็นภาพก่อนและหลัง GROUP BY

**ก่อน:** 1 แถว = 1 รายการขาย (ตัวอย่างบางแถวของสาขา S03)

```sql {verify}
SELECT store_id, net_amount
FROM sales
WHERE store_id IN ('S03', 'S05')
ORDER BY store_id, sale_id
LIMIT 6;
```

| store_id | net_amount |
|---|---|
| S03 | 18.00 |
| S03 | 72.00 |
| S03 | 60.00 |
| S03 | 108.00 |
| S03 | 30.00 |
| S03 | 14.00 |

**หลัง:** 1 แถว = 1 สาขา พร้อมยอดรวม

```sql {verify}
SELECT
  store_id,
  SUM(net_amount) AS total_net
FROM sales
WHERE store_id IN ('S03', 'S05')
GROUP BY store_id
ORDER BY store_id;
```

| store_id | total_net |
|---|---|
| S03 | 1624.00 |
| S05 | 663.00 |

S03 มี 23 รายการ ถูกยุบเหลือ 1 แถวที่ยอดรวม 1,624 บาท ส่วน S05 มี 7 รายการ ยุบเหลือ 1 แถวที่ 663 บาท

## สรุปหลายตัวเลขต่อสาขา

**สถานการณ์:** ผู้จัดการขอสรุปจำนวนรายการ จำนวนชิ้น ยอดสุทธิ และจำนวนลูกค้าสมาชิกของแต่ละสาขา

```sql {verify}
SELECT
  store_id,
  COUNT(*)                    AS line_count,
  SUM(quantity)               AS total_qty,
  SUM(net_amount)             AS total_net,
  COUNT(DISTINCT customer_id) AS unique_members
FROM sales
GROUP BY store_id
ORDER BY total_net DESC;
```

| store_id | line_count | total_qty | total_net | unique_members |
|---|---|---|---|---|
| S01 | 47 | 109 | 4348.00 | 19 |
| S02 | 37 | 157 | 3230.00 | 13 |
| S04 | 27 | 89 | 2618.00 | 15 |
| S03 | 23 | 67 | 1624.00 | 10 |
| S05 | 7 | 22 | 663.00 | 6 |

- `GROUP BY store_id` ได้ 1 แถวต่อ 1 สาขา (S06 ไม่ปรากฏเพราะไม่มีรายการขายในตาราง `sales`)
- `store_id` อยู่ใน `GROUP BY` จึงแสดงใน `SELECT` ได้
- `ORDER BY total_net DESC` ใช้ชื่อ Alias ที่ตั้งใน `SELECT` ได้ เพราะ `ORDER BY` ทำงานหลัง `SELECT`

**ตรวจผลรวม:** 47 + 37 + 27 + 23 + 7 = 141 แถว เท่ากับจำนวนแถวทั้งตาราง แปลว่าไม่มีแถวหาย

## GROUP BY หลายคอลัมน์

ได้ 1 แถวต่อ 1 **คู่ค่า** เช่น (สาขา, วิธีชำระเงิน)

```sql {verify}
SELECT
  store_id,
  payment_method,
  COUNT(*)        AS line_count,
  SUM(net_amount) AS total_net
FROM sales
WHERE store_id IN ('S01', 'S02')
GROUP BY store_id, payment_method
ORDER BY store_id, total_net DESC;
```

| store_id | payment_method | line_count | total_net |
|---|---|---|---|
| S01 | QR Payment | 18 | 1591.00 |
| S01 | Credit Card | 13 | 1458.00 |
| S01 | Cash | 16 | 1299.00 |
| S02 | QR Payment | 16 | 1383.00 |
| S02 | Cash | 10 | 1007.00 |
| S02 | Credit Card | 11 | 840.00 |

`WHERE` กรองแถวดิบ (เหลือเฉพาะ S01, S02) **ก่อน**จัดกลุ่ม

> [!MISTAKE] SELECT คอลัมน์ที่ไม่ได้อยู่ใน GROUP BY

```sql {error}
SELECT
  store_id,
  payment_method,
  SUM(net_amount) AS total_net
FROM sales
GROUP BY store_id;
```

```text
[MISSING_AGGREGATION] The non-aggregating expression "payment_method" is based on
columns which are not participating in the GROUP BY clause.
```

สาขาหนึ่งมีหลายวิธีชำระเงิน ระบบไม่รู้ว่าจะแสดงค่าไหนใน 1 แถวของสาขา วิธีแก้: เพิ่ม `payment_method` ใน `GROUP BY` หรือเอาออกจาก `SELECT`

> [!DATABRICKS] GROUP BY ALL
> Databricks มี `GROUP BY ALL` ที่จัดกลุ่มตามทุกคอลัมน์ใน `SELECT` ที่ไม่ใช่ฟังก์ชันสรุปให้อัตโนมัติ เช่น `SELECT store_id, payment_method, SUM(net_amount) FROM sales GROUP BY ALL` สะดวกแต่ใช้ไม่ได้ในหลายระบบ และควรรู้ก่อนว่าจริง ๆ แล้วจัดกลุ่มตามอะไร

## HAVING: กรองผลสรุป

`HAVING` กรอง**กลุ่ม**หลังจากสรุปแล้ว ส่วน `WHERE` กรอง**แถวดิบ**ก่อนสรุป

**สถานการณ์:** แสดงเฉพาะสาขาที่ยอดรวมเกิน 2,500 บาท

```sql {verify}
SELECT
  store_id,
  SUM(net_amount) AS total_net
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

S03 (1,624) และ S05 (663) ถูกตัดออกเพราะไม่ผ่านเงื่อนไขของ `HAVING`

> [!MISTAKE] ใช้ฟังก์ชันสรุปใน WHERE

```sql {error}
SELECT store_id, SUM(net_amount) AS total_net
FROM sales
WHERE SUM(net_amount) > 2500
GROUP BY store_id;
```

```text
[INVALID_WHERE_CONDITION] The WHERE condition "(sum(net_amount) > 2500)" contains
invalid expressions: sum(...).
```

`WHERE` ทำงาน**ก่อน**การจัดกลุ่ม ตอนนั้นยังไม่มีค่า SUM ให้เปรียบเทียบ (อธิบายละเอียดในบทที่ 13)

## ใช้ WHERE และ HAVING ร่วมกัน

| | WHERE | HAVING |
|---|---|---|
| ทำงานเมื่อไร | ก่อน GROUP BY | หลัง GROUP BY |
| กรองอะไร | แถวดิบ | กลุ่มที่สรุปแล้ว |
| ใช้ SUM / COUNT ได้ไหม | ไม่ได้ | ได้ |
| ตัวอย่าง | `WHERE sale_date >= DATE'2026-03-01'` | `HAVING COUNT(*) >= 10` |

**สถานการณ์:** ในเดือนมีนาคม 2026 สาขาไหนมีรายการขายตั้งแต่ 10 รายการขึ้นไป

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
ORDER BY total_net DESC;
```

| store_id | line_count | total_net |
|---|---|---|
| S02 | 16 | 1748.00 |
| S01 | 12 | 1285.00 |
| S04 | 10 | 972.00 |

**ลำดับที่เกิดขึ้น:** `WHERE` คัดเฉพาะรายการเดือนมีนาคม → `GROUP BY` แบ่งตามสาขา → `HAVING` เก็บเฉพาะสาขาที่มี 10 รายการขึ้นไป → `ORDER BY` เรียงยอด

> [!TIP] กรองให้เร็วที่สุด
> เงื่อนไขที่ไม่เกี่ยวกับผลสรุป (เช่น ช่วงวันที่ สาขา) ให้ใส่ใน `WHERE` ไม่ใช่ `HAVING` เพราะลดจำนวนแถวก่อนสรุป ทำให้เร็วกว่าและอ่านเข้าใจง่ายกว่า

## ผลรวมแบบมีเงื่อนไข: SUM(CASE WHEN ...)

เทคนิคนี้แยกยอดตามเงื่อนไขเป็น**หลายคอลัมน์ในแถวเดียว** (Pivot แบบง่าย)

```sql {verify}
SELECT
  store_id,
  SUM(CASE WHEN payment_method = 'Cash'        THEN net_amount ELSE 0 END) AS cash_net,
  SUM(CASE WHEN payment_method = 'Credit Card' THEN net_amount ELSE 0 END) AS card_net,
  SUM(CASE WHEN payment_method = 'QR Payment'  THEN net_amount ELSE 0 END) AS qr_net,
  SUM(net_amount)                                                          AS total_net
FROM sales
GROUP BY store_id
ORDER BY store_id;
```

| store_id | cash_net | card_net | qr_net | total_net |
|---|---|---|---|---|
| S01 | 1299.00 | 1458.00 | 1591.00 | 4348.00 |
| S02 | 1007.00 | 840.00 | 1383.00 | 3230.00 |
| S03 | 917.00 | 282.00 | 425.00 | 1624.00 |
| S04 | 687.00 | 1059.00 | 872.00 | 2618.00 |
| S05 | 395.00 | 268.00 | 0.00 | 663.00 |

**ทำงานอย่างไร:** แต่ละแถวดิบ `CASE` จะคืนยอดเงินถ้าตรงเงื่อนไข ไม่เช่นนั้นคืน 0 แล้ว `SUM` รวมเฉพาะยอดที่ตรง ตรวจได้ว่า `cash_net + card_net + qr_net = total_net` เช่น S01: 1,299 + 1,458 + 1,591 = 4,348

> [!DATABRICKS] count_if
> ถ้าต้องการ "นับ" แบบมีเงื่อนไข Databricks มี `count_if(payment_method = 'Cash')` ซึ่งเท่ากับ `SUM(CASE WHEN payment_method = 'Cash' THEN 1 ELSE 0 END)`

## ข้อผิดพลาดที่พบบ่อย

- ลืมใส่คอลัมน์ที่แสดงลงใน `GROUP BY` (`MISSING_AGGREGATION`)
- ใช้ `WHERE` กับ `SUM` / `COUNT` แทน `HAVING`
- ใส่เงื่อนไขของแถวดิบใน `HAVING` ทำให้ช้าและอ่านยาก
- จัดกลุ่มรายเดือนด้วย `MONTH(sale_date)` อย่างเดียว ทำให้เดือนเดียวกันของหลายปีรวมกัน (ใช้ `DATE_TRUNC` บทที่ 17)
- ไม่ตรวจว่าผลรวมของทุกกลุ่มเท่ากับยอดรวมทั้งตาราง

## ฝึกทำ

**โจทย์:** หาสินค้า (`product_id`) ที่ขายรวมตั้งแต่ 40 ชิ้นขึ้นไป แสดงจำนวนชิ้นรวมและยอดสุทธิรวม เรียงตามจำนวนชิ้นมากไปน้อย

:::answer ดูเฉลยและคำอธิบาย
```sql {verify}
SELECT
  product_id,
  SUM(quantity)   AS total_qty,
  SUM(net_amount) AS total_net
FROM sales
GROUP BY product_id
HAVING SUM(quantity) >= 40
ORDER BY total_qty DESC;
```

| product_id | total_qty | total_net |
|---|---|---|
| P001 | 102 | 664.00 |
| P003 | 75 | 1310.00 |
| P002 | 55 | 986.00 |
| P004 | 49 | 1115.00 |
| P007 | 41 | 3599.00 |

**เหตุผล:** เงื่อนไข "ขายรวม 40 ชิ้นขึ้นไป" เป็นเงื่อนไขกับ**ผลสรุป** จึงต้องอยู่ใน `HAVING` สังเกตว่า P001 มีจำนวนชิ้นสูงเพราะรวมรายการผิดปกติ 60 ชิ้น (T0096) ไว้ด้วย
:::

ฝึกเพิ่มที่ [แบบฝึกหัด: Aggregation, GROUP BY และ HAVING](#/exercises/ex-aggregate)
