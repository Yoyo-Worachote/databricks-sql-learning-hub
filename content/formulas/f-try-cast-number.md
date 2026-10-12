## สูตรนี้คืออะไร

แปลงข้อความเป็นตัวเลข: `CAST(x AS DECIMAL(12,2))` จะ **Error** ถ้าแปลงไม่ได้ (ANSI mode) ส่วน `TRY_CAST(...)` คืน **NULL** แทน ใช้กับข้อมูลที่ไม่แน่ใจคุณภาพ แล้วตรวจแถวที่ได้ NULL

## รูปแบบ (Syntax)

```sql
SELECT
  TRY_CAST(REPLACE(amount_text, ',', '') AS DECIMAL(12,2)) AS amount_clean
FROM table_name;
```

## ตัวอย่างข้อมูลต้นทาง

<!-- verify: SELECT raw_id, amount_text FROM sales_raw ORDER BY raw_id -->
| raw_id | amount_text |
|---|---|
| 1 | 1,250.00 |
| 2 | 980.50 |
| 3 | 2,100 |
| 4 | 450.00 |
| 5 | 700.00 |
| 6 | N/A |
| 7 | 1500 |
| 8 | 320.25 |

## SQL Query ฉบับเต็มและผลลัพธ์

```sql {verify}
SELECT
  raw_id,
  amount_text,
  TRY_CAST(REPLACE(amount_text, ',', '') AS DECIMAL(12,2)) AS amount_clean,
  CASE
    WHEN TRY_CAST(REPLACE(amount_text, ',', '') AS DECIMAL(12,2)) IS NULL THEN 'Check amount'
    ELSE 'OK'
  END AS amount_flag
FROM sales_raw
ORDER BY raw_id;
```

| raw_id | amount_text | amount_clean | amount_flag |
|---|---|---|---|
| 1 | 1,250.00 | 1250.00 | OK |
| 2 | 980.50 | 980.50 | OK |
| 3 | 2,100 | 2100.00 | OK |
| 4 | 450.00 | 450.00 | OK |
| 5 | 700.00 | 700.00 | OK |
| 6 | N/A | NULL | Check amount |
| 7 | 1500 | 1500.00 | OK |
| 8 | 320.25 | 320.25 | OK |

## อธิบายทีละส่วน และลำดับการทำงาน

1. `REPLACE(amount_text, ',', '')` ลบจุลภาคหลักพัน
2. `TRY_CAST(... AS DECIMAL(12,2))` แปลงเป็นตัวเลข แถว `'N/A'` ได้ NULL
3. `CASE` ติดธงแถวที่ต้องตรวจ

## ข้อผิดพลาดที่พบบ่อย

```sql {error}
SELECT CAST(amount_text AS DECIMAL(12,2)) AS amount
FROM sales_raw;
```

Error `CAST_INVALID_INPUT` ทั้ง Query เพราะมีจุลภาคและ `'N/A'`

- ลืมลบจุลภาค ทำให้ TRY_CAST ได้ NULL ทั้งที่ตัวเลขถูก
- ใช้ TRY_CAST แล้วไม่ตรวจแถวที่ได้ NULL ยอดรวมจึงขาดไปโดยไม่รู้ตัว

## ข้อควรระวังและกรณีพิเศษ

- ถ้ามีสัญลักษณ์อื่น เช่น `฿` หรือช่องว่าง ให้ลบด้วย `REGEXP_REPLACE(amount_text, '[^0-9.-]', '')`
- เลือก Scale ให้เหมาะ เช่น `DECIMAL(12,2)` สำหรับเงินบาท

## วิธีอื่นที่ใช้แทนกันได้

- `try_to_number(text, format)` ของ Databricks สำหรับข้อความที่มีรูปแบบเฉพาะ

## แบบฝึกหัด

**โจทย์:** สรุปจำนวนแถวทั้งหมด จำนวนแถวที่ยอดเงินแปลงได้ และยอดรวมที่แปลงได้ของ `sales_raw`

:::answer
```sql {verify}
SELECT
  COUNT(*)                                                        AS raw_rows,
  COUNT(TRY_CAST(REPLACE(amount_text, ',', '') AS DECIMAL(12,2))) AS valid_amount_rows,
  SUM(TRY_CAST(REPLACE(amount_text, ',', '') AS DECIMAL(12,2)))   AS amount_total
FROM sales_raw;
```

| raw_rows | valid_amount_rows | amount_total |
|---|---|---|
| 8 | 7 | 7300.75 |

**เหตุผล:** `COUNT(expr)` ไม่นับ NULL จึงได้จำนวนที่แปลงสำเร็จ ยอดรวม 7,300.75 ยังไม่รวมแถว N/A ต้องระบุในรายงาน
:::
