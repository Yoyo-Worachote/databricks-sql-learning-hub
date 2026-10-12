## Aggregate Function คืออะไร

**Aggregate Function (ฟังก์ชันสรุป)** คือฟังก์ชันที่ **ยุบหลายแถวให้เหลือค่าสรุปค่าเดียว** เช่น ยอดขายรวม จำนวนรายการ ค่าเฉลี่ย เหมือนการดูตัวเลขที่มุมล่างของ Excel หรือ PivotTable

| ฟังก์ชัน | ความหมาย | ตัวอย่าง |
|---|---|---|
| `COUNT(*)` | นับจำนวนแถวทั้งหมด | จำนวนรายการขาย |
| `COUNT(col)` | นับแถวที่ `col` **ไม่เป็น NULL** | จำนวนรายการที่เป็นสมาชิก |
| `COUNT(DISTINCT col)` | นับค่าที่ไม่ซ้ำ (ไม่นับ NULL) | จำนวนลูกค้าสมาชิก (คน) |
| `SUM(col)` | ผลรวม | ยอดขายสุทธิรวม |
| `AVG(col)` | ค่าเฉลี่ย (ไม่นับ NULL) | ยอดเฉลี่ยต่อรายการ |
| `MIN(col)` / `MAX(col)` | ค่าน้อยสุด / มากสุด ใช้กับวันที่และข้อความได้ | วันแรก / วันสุดท้ายที่มีข้อมูล |

ถ้า**ไม่มี** `GROUP BY` ฟังก์ชันสรุปจะยุบ**ทั้งตาราง**ให้เหลือ 1 แถว (บทถัดไปจะสรุปเป็นกลุ่ม)

## สรุปทั้งตารางใน Query เดียว

**สถานการณ์:** หัวหน้าถามภาพรวมไตรมาส 1: มีกี่รายการ ลูกค้าสมาชิกกี่คน ยอดรวมเท่าไร และข้อมูลครอบคลุมวันไหนถึงวันไหน

```sql {verify}
SELECT
  COUNT(*)                    AS row_count,
  COUNT(customer_id)          AS member_rows,
  COUNT(DISTINCT customer_id) AS unique_members,
  SUM(net_amount)             AS total_net,
  AVG(net_amount)             AS avg_net,
  MIN(sale_date)              AS first_date,
  MAX(sale_date)              AS last_date
FROM sales;
```

**ผลลัพธ์ (1 แถว)**

| row_count | member_rows | unique_members | total_net | avg_net | first_date | last_date |
|---|---|---|---|---|---|---|
| 141 | 112 | 20 | 12483.00 | 88.531915 | 2026-01-02 | 2026-03-31 |

**อ่านผลลัพธ์**

| คอลัมน์ | ค่า | ความหมาย |
|---|---|---|
| `row_count` | 141 | ทุกแถวในตาราง |
| `member_rows` | 112 | แถวที่มีรหัสลูกค้า (141 − 29 แถวที่เป็น NULL) |
| `unique_members` | 20 | สมาชิกที่ไม่ซ้ำ 20 คน (คนเดียวซื้อได้หลายครั้ง) |
| `total_net` | 12,483.00 | ยอดขายสุทธิรวม |
| `avg_net` | 88.53 | 12,483 ÷ 141 แถว |

> [!NOTE] ตัวเลขนี้ยังไม่ "สะอาด"
> ยอดรวมนี้ยังนับแถวซ้ำ 1 แถว (T0042) และรายการผิดปกติอยู่ บทที่ 19 จะสอนวิธีตรวจและทำความสะอาดก่อนรายงานจริง

## COUNT แบบไหนตอบคำถามอะไร

| คำถามทางธุรกิจ | ใช้ | ผล |
|---|---|---|
| มีรายการขายกี่รายการ | `COUNT(*)` | 141 |
| มีรายการที่ลูกค้าเป็นสมาชิกกี่รายการ | `COUNT(customer_id)` | 112 |
| มีลูกค้าสมาชิกกี่คน | `COUNT(DISTINCT customer_id)` | 20 |
| มีลูกค้าทั่วไป (ไม่ใช่สมาชิก) กี่รายการ | `COUNT(*) - COUNT(customer_id)` | 29 |

> [!MISTAKE] นับคนด้วย COUNT ธรรมดา
> `COUNT(customer_id)` ได้ "จำนวนรายการ" ไม่ใช่ "จำนวนคน" ถ้าต้องการจำนวนลูกค้าต้องใช้ `COUNT(DISTINCT customer_id)`

## AVG กับค่า NULL

ฟังก์ชันสรุป (ยกเว้น `COUNT(*)`) **ข้ามค่า NULL** ทำให้ค่าเฉลี่ยขึ้นกับว่าเราตีความ NULL อย่างไร

```sql {verify}
SELECT
  AVG(discount_amount)              AS avg_discount_skip_null,
  AVG(COALESCE(discount_amount, 0)) AS avg_discount_null_as_zero,
  COUNT(discount_amount)            AS rows_with_value,
  COUNT(*)                          AS all_rows
FROM sales;
```

| avg_discount_skip_null | avg_discount_null_as_zero | rows_with_value | all_rows |
|---|---|---|---|
| 2.190083 | 1.879433 | 121 | 141 |

- `AVG(discount_amount)` = ผลรวมส่วนลด ÷ **121** แถวที่มีค่า = 2.19
- `AVG(COALESCE(discount_amount, 0))` = ผลรวมส่วนลด ÷ **141** แถว (นับ NULL เป็น 0) = 1.88

> [!KEY] ตัวเลขไหนถูก
> ขึ้นกับความหมายของ NULL ถ้า NULL หมายถึง "ไม่ได้บันทึก" ให้ใช้ค่าแรก และรายงานจำนวนแถวที่ไม่ได้บันทึกแยกไว้ ถ้า NULL หมายถึง "ไม่มีส่วนลด" ให้ใช้ค่าที่สอง ต้องตกลงกับเจ้าของข้อมูลก่อน

## คำนวณเปอร์เซ็นต์และอัตราส่วน

**สูตรที่แนะนำ:** `ตัวตั้ง * 100.0 / NULLIF(ตัวหาร, 0)`

- **`* 100.0` ก่อนหาร** เพื่อให้ได้ทศนิยม และอ่านเป็นเปอร์เซ็นต์ได้ทันที
- **`NULLIF(ตัวหาร, 0)`** ถ้าตัวหารเป็น 0 จะกลายเป็น `NULL` ผลจึงเป็น `NULL` แทนที่ Query จะ Error
- **`ROUND(..., 1)`** ปัดทศนิยมให้อ่านง่าย

**สถานการณ์:** สัดส่วนรายการที่เป็นสมาชิก (%) และยอดสุทธิเฉลี่ยต่อชิ้นของแต่ละสาขา

```sql {verify}
SELECT
  store_id,
  COUNT(*)           AS line_count,
  COUNT(customer_id) AS member_lines,
  ROUND(COUNT(customer_id) * 100.0 / NULLIF(COUNT(*), 0), 1) AS member_pct,
  ROUND(SUM(net_amount) / NULLIF(SUM(quantity), 0), 2)       AS net_per_unit
FROM sales
GROUP BY store_id
ORDER BY store_id;
```

| store_id | line_count | member_lines | member_pct | net_per_unit |
|---|---|---|---|---|
| S01 | 47 | 40 | 85.1 | 39.89 |
| S02 | 37 | 27 | 73.0 | 20.57 |
| S03 | 23 | 18 | 78.3 | 24.24 |
| S04 | 27 | 20 | 74.1 | 29.42 |
| S05 | 7 | 7 | 100.0 | 30.14 |

**ตรวจแถว S01:** 40 × 100.0 ÷ 47 = 85.106… ปัดเป็น 85.1 (ตัวอย่างนี้ใช้ `GROUP BY store_id` เพื่อสรุปแยกสาขา ซึ่งจะเรียนละเอียดในบทถัดไป)

## หารด้วยศูนย์ใน Databricks

> [!MISTAKE] ตัวหารเป็น 0
> หายอดขายต่อจำนวนรายการรับคืนของแต่ละสาขา แต่สาขาส่วนใหญ่ไม่มีรายการรับคืน ตัวหารจึงเป็น 0

```sql {error skip}
SELECT
  store_id,
  SUM(net_amount) / SUM(CASE WHEN quantity < 0 THEN 1 ELSE 0 END) AS net_per_return
FROM sales
GROUP BY store_id;
```

```text
[DIVIDE_BY_ZERO] Division by zero. Use `try_divide` to tolerate divisor being 0
and return NULL instead. If necessary set "spark.sql.ansi.enabled" to "false"
to bypass this error. SQLSTATE: 22012
```

วิธีแก้: ครอบตัวหารด้วย `NULLIF(..., 0)`

```sql {verify}
SELECT
  store_id,
  ROUND(SUM(net_amount) / NULLIF(SUM(CASE WHEN quantity < 0 THEN 1 ELSE 0 END), 0), 2) AS net_per_return
FROM sales
GROUP BY store_id
ORDER BY store_id;
```

| store_id | net_per_return |
|---|---|
| S01 | 4348.00 |
| S02 | NULL |
| S03 | NULL |
| S04 | NULL |
| S05 | NULL |

> [!DATABRICKS] ANSI mode และ try_divide
> SQL Warehouse เปิด ANSI mode เป็นค่าเริ่มต้น การหารด้วยศูนย์จึง **Error** (ไม่ได้ค่า NULL เงียบ ๆ แบบ MySQL) นอกจาก `NULLIF` แล้ว Databricks ยังมี `try_divide(a, b)` ที่คืน `NULL` เมื่อ b เป็น 0 เช่น `try_divide(SUM(net_amount), SUM(quantity))`

> [!DATABRICKS] 5 / 2 ได้ 2.5 ไม่ใช่ 2
> ใน Databricks เครื่องหมาย `/` ให้ผลเป็นทศนิยมเสมอ (`5 / 2 = 2.5`) ต่างจาก SQL Server ที่ได้ 2 เมื่อเป็นจำนวนเต็ม ถ้าต้องการหารเอาเฉพาะจำนวนเต็มใช้ `5 DIV 2` (ได้ 2) และเศษใช้ `5 % 2` (ได้ 1)

## ข้อผิดพลาดที่พบบ่อย

- ใช้ `COUNT(column)` ทั้งที่ต้องการนับทุกแถว ทำให้ตัวเลขน้อยกว่าจริงเมื่อมี NULL
- นับจำนวนลูกค้าด้วย `COUNT` แทน `COUNT(DISTINCT)` ได้จำนวนรายการแทนจำนวนคน
- หารด้วยศูนย์จน Query พัง หรือคูณ 100 หลังหารจนสับสน
- **เฉลี่ยของค่าเฉลี่ย** (AVG ของ AVG) ซึ่งผิดเมื่อแต่ละกลุ่มมีจำนวนแถวไม่เท่ากัน ให้คำนวณจากผลรวม ÷ จำนวนรวมแทน (บทที่ 20)
- ใช้ `COALESCE(x, 0)` ใน `AVG` โดยไม่คิดถึงความหมายของ NULL

## ฝึกทำ

**โจทย์:** หาจำนวนรายการ ยอดสุทธิรวม และยอดเฉลี่ยต่อรายการ (ปัด 2 ตำแหน่ง) ของรายการที่ชำระด้วย QR Payment

:::answer ดูเฉลยและคำอธิบาย
```sql {verify}
SELECT
  COUNT(*)                  AS line_count,
  SUM(net_amount)           AS total_net,
  ROUND(AVG(net_amount), 2) AS avg_net
FROM sales
WHERE payment_method = 'QR Payment';
```

| line_count | total_net | avg_net |
|---|---|---|
| 49 | 4271.00 | 87.16 |

**เหตุผล:** `WHERE` คัดเฉพาะรายการ QR Payment ก่อน (49 แถว) แล้วฟังก์ชันสรุปจึงยุบ 49 แถวนั้นเหลือ 1 แถว: 4,271 ÷ 49 = 87.16
:::

ดูสูตรที่ [COUNT(*), COUNT(column) และ COUNT(DISTINCT)](#/formula/f-count-variants) และ [เปอร์เซ็นต์แบบไม่ Error](#/formula/f-safe-percentage)
