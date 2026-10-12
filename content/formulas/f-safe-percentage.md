## สูตรนี้คืออะไร

**สูตรมาตรฐาน:** `ROUND(ตัวตั้ง * 100.0 / NULLIF(ตัวหาร, 0), 1)`

| ส่วน | เหตุผล |
|---|---|
| `* 100.0` **ก่อน**หาร | ได้ค่าเป็นเปอร์เซ็นต์และทศนิยม |
| `NULLIF(ตัวหาร, 0)` | ตัวหารเป็น 0 → กลายเป็น NULL ผลเป็น NULL แทนที่จะ Error |
| `ROUND(..., 1)` | อ่านง่าย |

> [!DATABRICKS] ANSI mode
> SQL Warehouse เปิด ANSI mode เป็นค่าเริ่มต้น การหารด้วยศูนย์จึงเกิด Error `DIVIDE_BY_ZERO` ทั้ง Query และ `/` ใน Databricks ให้ผลทศนิยมเสมอ (`5 / 2 = 2.5`)

## รูปแบบ (Syntax)

```sql
SELECT
  ROUND(part_value * 100.0 / NULLIF(total_value, 0), 1) AS pct,
  try_divide(part_value, total_value)                    AS ratio
FROM table_name;
```

## ตัวอย่างข้อมูลต้นทาง

ต่อสาขา: จำนวนรายการ (`COUNT(*)`) และรายการที่เป็นสมาชิก (`COUNT(customer_id)`) เช่น S01 = 47 และ 40

## SQL Query ฉบับเต็มและผลลัพธ์

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

## อธิบายทีละส่วน

S01: 40 × 100.0 ÷ 47 = 85.106 → 85.1 และ 4,348 ÷ 109 ชิ้น = 39.89 บาทต่อชิ้น

## ข้อผิดพลาดที่พบบ่อย

- หารก่อนแล้วคูณ 100 ในระบบที่หารจำนวนเต็มแล้วปัดเศษ (เช่น SQL Server) ได้ 0
- ลืม NULLIF แล้ว Query พังเมื่อวันหนึ่งตัวหารเป็น 0
- **เฉลี่ยของเปอร์เซ็นต์** (AVG ของ % รายแถว) ไม่เท่ากับ % จากผลรวม ([ดูตัวอย่าง GP%](#/formula/f-gross-profit))

## ข้อควรระวังและกรณีพิเศษ

- ผลเป็น NULL หมายถึง "คำนวณไม่ได้" ควรแสดงเป็น "-" หรือ "N/A" ในรายงาน ไม่ใช่ 0%
- % เติบโตเมื่อฐานเป็น 0 (สาขาใหม่) ควรเป็น NULL

## วิธีอื่นที่ใช้แทนกันได้

- `try_divide(a, b)` (Databricks) คืน NULL เมื่อ b = 0
- `SUM(x) OVER ()` สำหรับสัดส่วนต่อยอดรวม ([ดูสูตร](#/formula/f-share-of-total))

## แบบฝึกหัด

**โจทย์:** หา % ยอดเงินจาก QR Payment ต่อยอดรวมของแต่ละสาขา

:::answer
```sql {verify}
SELECT
  store_id,
  ROUND(SUM(CASE WHEN payment_method = 'QR Payment' THEN net_amount ELSE 0 END) * 100.0
        / NULLIF(SUM(net_amount), 0), 1) AS qr_pct
FROM sales
GROUP BY store_id
ORDER BY store_id;
```

| store_id | qr_pct |
|---|---|
| S01 | 36.6 |
| S02 | 42.8 |
| S03 | 26.2 |
| S04 | 33.3 |
| S05 | 0.0 |

**เหตุผล:** ตัวตั้งคือยอดแบบมีเงื่อนไข ตัวหารคือยอดรวมที่กันศูนย์ด้วย NULLIF
:::
