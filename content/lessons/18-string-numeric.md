## ทำไมต้องจัดการข้อความ

ข้อมูลที่พิมพ์ด้วยมือหรือมาจากไฟล์ Excel มักมีปัญหาที่มองด้วยตาไม่เห็น เช่น ช่องว่างหัวท้าย ตัวพิมพ์เล็ก/ใหญ่ไม่ตรงกัน หรือมีจุลภาคในตัวเลข ปัญหาเหล่านี้ทำให้ **JOIN ไม่เจอคู่** และ **GROUP BY แยกกลุ่มผิด**

**ข้อมูลต้นทาง:** ตาราง `sales_raw` (8 แถว ทุกคอลัมน์เป็นข้อความ) คอลัมน์ `shown` ครอบค่าด้วย `[ ]` เพื่อให้เห็นช่องว่าง

| raw_id | store_code (แสดงใน [ ]) | ความยาว | amount_text |
|---|---|---|---|
| 1 | [S01] | 3 | 1,250.00 |
| 2 | [S02] | 3 | 980.50 |
| 3 | [s03] | 3 | 2,100 |
| 4 | [S01] | 3 | 450.00 |
| 5 | [S04] | 3 | 700.00 |
| 6 | [ S02 ] | 5 | N/A |
| 7 | [S03] | 3 | 1500 |
| 8 | [S04] | 3 | 320.25 |

แถว 3 เป็นตัวพิมพ์เล็ก แถว 6 มีช่องว่างหัวท้าย ลองนำไป JOIN กับตาราง `stores` ตรง ๆ เทียบกับหลังทำความสะอาด

```sql {verify}
SELECT
  (SELECT COUNT(*)
     FROM sales_raw AS r
     JOIN stores AS st ON r.store_code = st.store_id)              AS matched_raw,
  (SELECT COUNT(*)
     FROM sales_raw AS r
     JOIN stores AS st ON UPPER(TRIM(r.store_code)) = st.store_id) AS matched_clean;
```

| matched_raw | matched_clean |
|---|---|
| 6 | 8 |

ก่อนทำความสะอาด JOIN เจอแค่ 6 จาก 8 แถว อีก 2 แถวหายไปเงียบ ๆ

## ฟังก์ชันทำความสะอาดข้อความ

| ฟังก์ชัน | ทำอะไร | ตัวอย่าง | ผล |
|---|---|---|---|
| `TRIM(s)` | ตัดช่องว่างหัวท้าย | `TRIM(' S02 ')` | `'S02'` |
| `LTRIM(s)` / `RTRIM(s)` | ตัดเฉพาะซ้าย / ขวา | `RTRIM('S02  ')` | `'S02'` |
| `UPPER(s)` / `LOWER(s)` | เปลี่ยนเป็นตัวพิมพ์ใหญ่ / เล็ก | `UPPER('s03')` | `'S03'` |
| `REPLACE(s, a, b)` | แทนที่ข้อความ a ด้วย b | `REPLACE('1,250.00', ',', '')` | `'1250.00'` |
| `REGEXP_REPLACE(s, pattern, b)` | แทนที่ตามรูปแบบ (Regular Expression) | `REGEXP_REPLACE('S-0 2', '[^A-Z0-9]', '')` | `'S02'` |
| `NULLIF(TRIM(s), '')` | ข้อความว่างให้เป็น NULL | `NULLIF(TRIM('   '), '')` | `NULL` |

```sql {verify}
SELECT
  raw_id,
  '[' || store_code || ']'                                 AS store_code_shown,
  UPPER(TRIM(store_code))                                  AS store_id_clean,
  amount_text,
  TRY_CAST(REPLACE(amount_text, ',', '') AS DECIMAL(12,2)) AS amount_clean
FROM sales_raw
ORDER BY raw_id;
```

| raw_id | store_code_shown | store_id_clean | amount_text | amount_clean |
|---|---|---|---|---|
| 1 | [S01] | S01 | 1,250.00 | 1250.00 |
| 2 | [S02] | S02 | 980.50 | 980.50 |
| 3 | [s03] | S03 | 2,100 | 2100.00 |
| 4 | [S01] | S01 | 450.00 | 450.00 |
| 5 | [S04] | S04 | 700.00 | 700.00 |
| 6 | [ S02 ] | S02 | N/A | NULL |
| 7 | [S03] | S03 | 1500 | 1500.00 |
| 8 | [S04] | S04 | 320.25 | 320.25 |

**อ่านฟังก์ชันซ้อนจากในออกนอก:** `UPPER(TRIM(store_code))` ทำ `TRIM` ก่อน (ตัดช่องว่าง) แล้วจึง `UPPER` (เปลี่ยนเป็นตัวใหญ่)

> [!DATABRICKS] ต่อข้อความด้วย || หรือ CONCAT
> Databricks ต่อข้อความได้ทั้ง `a || b` และ `CONCAT(a, b)` ส่วน SQL Server ใช้ `a + b` ระวัง: ถ้าค่าใดเป็น `NULL` ผลของ `||` และ `CONCAT` จะเป็น `NULL` ทั้งก้อน ถ้าต้องการข้ามค่า NULL ใช้ `CONCAT_WS(' - ', a, b)` (WS = With Separator)

## ต่อ ตัด และค้นหาข้อความ

```sql {verify}
SELECT
  product_id,
  product_name,
  LENGTH(product_name)                AS name_len,
  SUBSTRING(product_id, 2, 3)         AS id_number,
  CONCAT(product_id, ' - ', product_name) AS product_label,
  LOWER(brand)                        AS brand_lower
FROM products
WHERE product_id IN ('P001', 'P007', 'P010')
ORDER BY product_id;
```

| product_id | product_name | name_len | id_number | product_label | brand_lower |
|---|---|---|---|---|---|
| P001 | น้ำดื่ม 600ml | 13 | 001 | P001 - น้ำดื่ม 600ml | freshco |
| P007 | สบู่เหลว 450ml | 14 | 007 | P007 - สบู่เหลว 450ml | cleanpro |
| P010 | น้ำยาล้างจาน 500ml | 18 | 010 | P010 - น้ำยาล้างจาน 500ml | homemate |

| ฟังก์ชัน | ทำอะไร | ตัวอย่าง |
|---|---|---|
| `LENGTH(s)` | จำนวนตัวอักษร | `LENGTH('S02')` = 3 |
| `SUBSTRING(s, start, len)` | ตัดข้อความตั้งแต่ตำแหน่ง start (เริ่มนับ 1) ยาว len ตัว | `SUBSTRING('P007', 2, 3)` = `'007'` |
| `LEFT(s, n)` / `RIGHT(s, n)` | n ตัวแรก / n ตัวท้าย | `LEFT('2026-03', 4)` = `'2026'` |
| `LPAD(s, n, c)` | เติมอักขระ c ด้านหน้าให้ยาว n ตัว | `LPAD('7', 3, '0')` = `'007'` |
| `INSTR(s, sub)` | ตำแหน่งแรกที่พบ sub (ไม่พบได้ 0) | `INSTR('Credit Card', 'Card')` = 8 |
| `SPLIT(s, sep)[i]` | แยกข้อความเป็นรายการ แล้วเลือกตัวที่ i (เริ่มนับ 0) | `SPLIT('S01-P002', '-')[1]` = `'P002'` |
| `CONCAT_WS(sep, a, b, ...)` | ต่อข้อความโดยใส่ตัวคั่นและข้าม NULL | `CONCAT_WS('-', 'S01', NULL, 'P002')` = `'S01-P002'` |

> [!NOTE] ความยาวของข้อความภาษาไทย
> สระและวรรณยุกต์ไทยที่อยู่บน/ล่างตัวอักษรนับเป็นอักขระแยกด้วย `น้ำดื่ม` จึงยาว 7 ตัว (น ้ ำ ด ื ่ ม) ไม่ใช่ 4 ตัวอย่างที่ตาเห็น ระวังเมื่อใช้ `LENGTH` หรือ `SUBSTRING` ตัดข้อความภาษาไทย อาจตัดกลางคำแล้วได้วรรณยุกต์ลอย ๆ

## ฟังก์ชันตัวเลข

| ฟังก์ชัน | ทำอะไร | ตัวอย่าง | ผล |
|---|---|---|---|
| `ROUND(x, d)` | ปัดเศษ d ตำแหน่ง (ครึ่งปัดขึ้นออกจากศูนย์) | `ROUND(88.531915, 2)` | 88.53 |
| `FLOOR(x)` | ปัดลงเป็นจำนวนเต็ม | `FLOOR(88.53)` | 88 |
| `CEIL(x)` | ปัดขึ้นเป็นจำนวนเต็ม | `CEIL(88.53)` | 89 |
| `ABS(x)` | ค่าสัมบูรณ์ (ตัดเครื่องหมายลบ) | `ABS(-30.00)` | 30.00 |
| `a DIV b` | หารเอาเฉพาะจำนวนเต็ม | `17 DIV 5` | 3 |
| `a % b` หรือ `MOD(a, b)` | เศษจากการหาร | `17 % 5` | 2 |
| `try_divide(a, b)` | หาร ถ้า b = 0 ได้ NULL แทน Error | `try_divide(10, 0)` | NULL |
| `FORMAT_NUMBER(x, 2)` | จัดรูปแบบเป็น**ข้อความ**มีจุลภาค | `FORMAT_NUMBER(1250, 2)` | '1,250.00' |

**ตัวอย่าง:** ราคาเฉลี่ยต่อชิ้นของรายการที่ยอดติดลบ

```sql {verify}
SELECT
  sale_id,
  net_amount,
  quantity,
  ROUND(net_amount / quantity, 2) AS price_per_unit,
  ABS(net_amount)                 AS abs_net
FROM sales
WHERE sale_id IN ('T0044', 'T0060', 'T0061')
ORDER BY sale_id;
```

| sale_id | net_amount | quantity | price_per_unit | abs_net |
|---|---|---|---|---|
| T0044 | -1.00 | 2 | -0.50 | 1.00 |
| T0060 | -8.00 | 1 | -8.00 | 8.00 |
| T0061 | -30.00 | -2 | 15.00 | 30.00 |

ผลนี้ช่วยให้เห็นความผิดปกติ: T0044 และ T0060 ขายสินค้าจริงแต่ได้ราคาต่อชิ้นติดลบ (ส่วนลดมากกว่ายอดสินค้า) ส่วน T0061 เป็นการรับคืน (จำนวนและยอดติดลบทั้งคู่ ราคาต่อชิ้นจึงเป็นบวก)

> [!WARNING] หารด้วยคอลัมน์ที่อาจเป็น 0
> `net_amount / quantity` จะ Error `DIVIDE_BY_ZERO` ถ้ามีแถวที่ `quantity = 0` ในงานจริงให้ใช้ `net_amount / NULLIF(quantity, 0)` หรือ `try_divide(net_amount, quantity)` เสมอ

> [!TIP] ใช้ DECIMAL กับเงิน
> ชนิด `DOUBLE` / `FLOAT` เก็บทศนิยมแบบประมาณ อาจได้ 0.1 + 0.2 = 0.30000000000000004 สำหรับจำนวนเงินให้ใช้ `DECIMAL(p, s)` เช่น `DECIMAL(12,2)` และใช้ `FORMAT_NUMBER` เฉพาะขั้นแสดงผลสุดท้าย เพราะผลเป็นข้อความ คำนวณต่อไม่ได้

## แปลงชนิดข้อมูลอย่างปลอดภัย

| วิธี | ถ้าแปลงไม่ได้ | ใช้เมื่อ |
|---|---|---|
| `CAST(x AS DECIMAL(12,2))` | **Error** `CAST_INVALID_INPUT` (ANSI mode) | มั่นใจว่าข้อมูลถูกรูปแบบทุกแถว |
| `TRY_CAST(x AS DECIMAL(12,2))` | คืน `NULL` | ข้อมูลอาจมีค่าผิด แล้วตรวจแถวที่ได้ NULL |

> [!MISTAKE] CAST ข้อความที่ไม่ใช่ตัวเลข
> `SELECT CAST(REPLACE(amount_text, ',', '') AS DECIMAL(12,2)) FROM sales_raw;` จะ Error ทั้ง Query เพราะแถว 6 มีค่า `'N/A'`
>
> ```text
> [CAST_INVALID_INPUT] The value 'N/A' of the type "STRING" cannot be cast to
> "DECIMAL(12,2)" because it is malformed.
> ```
>
> ใช้ `TRY_CAST` แล้วติดธงแถวที่แปลงไม่ได้ เพื่อส่งให้เจ้าของข้อมูลตรวจ

## ข้อผิดพลาดที่พบบ่อย

- JOIN ด้วยรหัสที่มีช่องว่างหรือตัวพิมพ์ต่างกัน แถวหายโดยไม่มี Error
- ใช้ `||` หรือ `CONCAT` แล้วผลเป็น NULL เพราะมีค่าใดค่าหนึ่งเป็น NULL
- `SUBSTRING` นับตำแหน่งเริ่มที่ 0 (ที่ถูกคือเริ่มที่ 1) ส่วน `SPLIT(...)[i]` เริ่มที่ 0
- ใช้ `CAST` กับข้อมูลที่ไม่สะอาดจน Query พัง
- ใช้ `FORMAT_NUMBER` แล้วนำผล (ข้อความ) ไปรวมหรือเรียงต่อ ทำให้เรียงผิด

## ฝึกทำ

**โจทย์:** จากตาราง `products` สร้างคอลัมน์ `product_label` รูปแบบ `'P001 | FRESHCO'` (รหัสสินค้า ตามด้วยแบรนด์ตัวพิมพ์ใหญ่ ถ้าไม่มีแบรนด์ให้ใช้ `'NO BRAND'`) และคอลัมน์ `price_band_start` = ราคาปัดลงเป็นหลักสิบ (เช่น 25 → 20) แสดงเฉพาะสินค้าหมวด Snack

:::answer ดูเฉลยและคำอธิบาย
```sql {verify}
SELECT
  product_id,
  brand,
  list_price,
  CONCAT(product_id, ' | ', UPPER(COALESCE(brand, 'No brand'))) AS product_label,
  FLOOR(list_price / 10) * 10                                     AS price_band_start
FROM products
WHERE category = 'Snack'
ORDER BY product_id;
```

| product_id | brand | list_price | product_label | price_band_start |
|---|---|---|---|---|
| P004 | SnackHub | 25.00 | P004 \| SNACKHUB | 20 |
| P005 | SnackHub | 15.00 | P005 \| SNACKHUB | 10 |
| P006 | NULL | 30.00 | P006 \| NO BRAND | 30 |

**เหตุผล:** `COALESCE` เติมค่าแทน NULL **ก่อน** ต่อข้อความ มิฉะนั้น P006 จะได้ `product_label` เป็น NULL ทั้งก้อน ส่วน `FLOOR(list_price / 10) * 10` หารด้วย 10 ปัดลง แล้วคูณกลับ เช่น 25 → 2.5 → 2 → 20
:::

ดูสูตรที่ [ทำความสะอาดข้อความ](#/formula/f-string-clean), [ต่อ ตัด และค้นหาข้อความ](#/formula/f-string-functions), [ฟังก์ชันตัวเลข](#/formula/f-numeric-functions) และ [แปลงข้อความเป็นตัวเลข](#/formula/f-try-cast-number)
