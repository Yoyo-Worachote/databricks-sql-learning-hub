## สูตรนี้คืออะไร

แปลงวันที่ที่เก็บเป็นข้อความให้เป็นชนิด DATE

| วิธี | ใช้เมื่อ | ถ้าแปลงไม่ได้ |
|---|---|---|
| `CAST(text AS DATE)` | รูปแบบมาตรฐาน `yyyy-MM-dd` | Error |
| `TRY_CAST(text AS DATE)` | รูปแบบมาตรฐาน แต่อาจมีค่าผิด | NULL |
| `TO_DATE(text, 'dd/MM/yyyy')` | รูปแบบเฉพาะ และถูกทุกแถว | Error |
| `CAST(try_to_timestamp(text, 'dd/MM/yyyy') AS DATE)` | รูปแบบเฉพาะ แต่อาจมีค่าผิด | NULL |

## รูปแบบ (Syntax)

```sql
SELECT
  COALESCE(
    TRY_CAST(text_col AS DATE),
    CAST(try_to_timestamp(text_col, 'dd/MM/yyyy') AS DATE),
    CAST(try_to_timestamp(text_col, 'yyyy/MM/dd') AS DATE)
  ) AS date_clean
FROM table_name;
```

## ตัวอย่างข้อมูลต้นทาง

<!-- verify: SELECT raw_id, sale_date_text FROM sales_raw ORDER BY raw_id -->
| raw_id | sale_date_text |
|---|---|
| 1 | 05/01/2026 |
| 2 | 2026-01-06 |
| 3 | 07/01/2026 |
| 4 | 31/02/2026 |
| 5 | NULL |
| 6 | 15/01/2026 |
| 7 | 16/01/2026 |
| 8 | 2026/01/17 |

## SQL Query ฉบับเต็มและผลลัพธ์

```sql {verify}
WITH parsed AS (
  SELECT
    raw_id,
    sale_date_text,
    COALESCE(
      TRY_CAST(sale_date_text AS DATE),
      CAST(try_to_timestamp(sale_date_text, 'dd/MM/yyyy') AS DATE),
      CAST(try_to_timestamp(sale_date_text, 'yyyy/MM/dd') AS DATE)
    ) AS sale_date_clean
  FROM sales_raw
)
SELECT
  raw_id,
  sale_date_text,
  sale_date_clean,
  CASE WHEN sale_date_clean IS NULL THEN 'Invalid' ELSE 'OK' END AS date_status
FROM parsed
ORDER BY raw_id;
```

| raw_id | sale_date_text | sale_date_clean | date_status |
|---|---|---|---|
| 1 | 05/01/2026 | 2026-01-05 | OK |
| 2 | 2026-01-06 | 2026-01-06 | OK |
| 3 | 07/01/2026 | 2026-01-07 | OK |
| 4 | 31/02/2026 | NULL | Invalid |
| 5 | NULL | NULL | Invalid |
| 6 | 15/01/2026 | 2026-01-15 | OK |
| 7 | 16/01/2026 | 2026-01-16 | OK |
| 8 | 2026/01/17 | 2026-01-17 | OK |

## อธิบายทีละส่วน และลำดับการทำงาน

`COALESCE` ลองทีละรูปแบบตามลำดับ และคืนค่าแรกที่แปลงสำเร็จ แถว 2 สำเร็จที่รูปแบบที่ 1 แถว 1, 3, 6, 7 ที่รูปแบบที่ 2 แถว 8 ที่รูปแบบที่ 3 ส่วนแถว 4 (31 ก.พ. ไม่มีจริง) และแถว 5 (NULL) แปลงไม่ได้ทุกรูปแบบ

## ข้อผิดพลาดที่พบบ่อย

```sql {error}
SELECT raw_id, TO_DATE(sale_date_text, 'dd/MM/yyyy') AS sale_date
FROM sales_raw;
```

Error `CANNOT_PARSE_TIMESTAMP` ทั้ง Query เพราะบางแถวไม่ใช่รูปแบบนั้น

- ใช้ `mm` แทน `MM`
- รูปแบบกำกวม: `05/01/2026` อาจเป็น 5 ม.ค. (dd/MM) หรือ 1 พ.ค. (MM/dd) ต้องถามแหล่งข้อมูลก่อน

## ข้อควรระวังและกรณีพิเศษ

- ถ้าไฟล์ใช้ปี พ.ศ. (เช่น 2569) ต้องลบ 543 ก่อนแปลง
- แถวที่แปลงไม่ได้ให้ส่งกลับเจ้าของข้อมูล ไม่ควรเดาเอง

## วิธีอื่นที่ใช้แทนกันได้

- แก้รูปแบบที่ต้นทาง (ไฟล์ Excel หรือ Pipeline) ให้เป็น `yyyy-MM-dd` จะยั่งยืนกว่า

## แบบฝึกหัด

**โจทย์:** นับว่าตาราง `sales_raw` มีวันที่ที่แปลงได้กี่แถว และไม่ได้กี่แถว

:::answer
```sql {verify}
WITH parsed AS (
  SELECT
    COALESCE(
      TRY_CAST(sale_date_text AS DATE),
      CAST(try_to_timestamp(sale_date_text, 'dd/MM/yyyy') AS DATE),
      CAST(try_to_timestamp(sale_date_text, 'yyyy/MM/dd') AS DATE)
    ) AS sale_date_clean
  FROM sales_raw
)
SELECT
  COUNT(sale_date_clean)            AS valid_rows,
  COUNT(*) - COUNT(sale_date_clean) AS invalid_rows
FROM parsed;
```

| valid_rows | invalid_rows |
|---|---|
| 6 | 2 |

**เหตุผล:** `COUNT(col)` ไม่นับ NULL จึงได้จำนวนที่แปลงสำเร็จ ส่วนต่างคือแถวที่ต้องตรวจ
:::
