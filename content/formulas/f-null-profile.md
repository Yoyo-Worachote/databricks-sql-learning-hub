## สูตรนี้คืออะไร

สรุปจำนวนค่าว่าง (NULL) ของหลายคอลัมน์ในแถวเดียว เรียกว่า **Null Profile** ใช้เป็นด่านแรกของการตรวจคุณภาพข้อมูล

| วิธี | หมายเหตุ |
|---|---|
| `COUNT(*) - COUNT(col)` | สั้น ใช้ได้ทุกระบบ |
| `SUM(CASE WHEN col IS NULL THEN 1 ELSE 0 END)` | ใส่เงื่อนไขอื่นเพิ่มได้ |
| `count_if(col IS NULL)` | Databricks อ่านง่ายที่สุด |

## รูปแบบ (Syntax)

```sql
SELECT
  COUNT(*)                  AS total_rows,
  COUNT(*) - COUNT(col_a)   AS col_a_nulls,
  count_if(col_b IS NULL)   AS col_b_nulls
FROM table_name;
```

## ตัวอย่างข้อมูลต้นทาง

ตาราง `sales` 141 แถว คอลัมน์สำคัญ: `customer_id`, `discount_amount`, `product_id`, `store_id`

## SQL Query ฉบับเต็มและผลลัพธ์

```sql {verify}
SELECT
  COUNT(*)                                             AS total_rows,
  COUNT(*) - COUNT(customer_id)                        AS customer_id_nulls,
  COUNT(*) - COUNT(discount_amount)                    AS discount_nulls,
  SUM(CASE WHEN product_id IS NULL THEN 1 ELSE 0 END) AS product_id_nulls,
  count_if(store_id IS NULL)                           AS store_id_nulls
FROM sales;
```

| total_rows | customer_id_nulls | discount_nulls | product_id_nulls | store_id_nulls |
|---|---|---|---|---|
| 141 | 29 | 20 | 0 | 0 |

## อธิบายทีละส่วน

- `customer_id` NULL 29 แถว = ลูกค้าทั่วไป (มีความหมายทางธุรกิจ ไม่ใช่ปัญหา)
- `discount_amount` NULL 20 แถว = ไม่ได้บันทึกส่วนลด ต้องถามเจ้าของข้อมูล
- Key สำคัญ (`product_id`, `store_id`) ไม่มี NULL

## ข้อผิดพลาดที่พบบ่อย

- ตรวจแค่ NULL แต่ลืมข้อความว่าง `''` (ใช้ `count_if(NULLIF(TRIM(col), '') IS NULL)`)
- เห็น NULL แล้วเติม 0 ทันทีโดยไม่ถามความหมาย

## ข้อควรระวังและกรณีพิเศษ

- รายงานเป็น % ช่วยเทียบระหว่างกลุ่มได้ดีกว่าจำนวน
- บันทึก Query นี้ไว้รันซ้ำทุกครั้งที่มีข้อมูลรอบใหม่

## วิธีอื่นที่ใช้แทนกันได้

- Databricks มีหน้า Data Profile ใน Notebook / Catalog Explorer (ตามสิทธิ์) แต่ Query ช่วยให้ตรวจซ้ำและแชร์ได้

## แบบฝึกหัด

**โจทย์:** ทำ Null Profile แยกตามสาขา พร้อม % ของแถวที่ไม่ได้บันทึกส่วนลด

:::answer
```sql {verify}
SELECT
  store_id,
  COUNT(*)                                                       AS total_rows,
  count_if(customer_id IS NULL)                                  AS customer_nulls,
  count_if(discount_amount IS NULL)                              AS discount_nulls,
  ROUND(count_if(discount_amount IS NULL) * 100.0 / COUNT(*), 1) AS discount_null_pct
FROM sales
GROUP BY store_id
ORDER BY store_id;
```

| store_id | total_rows | customer_nulls | discount_nulls | discount_null_pct |
|---|---|---|---|---|
| S01 | 47 | 7 | 6 | 12.8 |
| S02 | 37 | 10 | 7 | 18.9 |
| S03 | 23 | 5 | 3 | 13.0 |
| S04 | 27 | 7 | 4 | 14.8 |
| S05 | 7 | 0 | 0 | 0.0 |

**เหตุผล:** S02 มีสัดส่วนไม่บันทึกส่วนลดสูงสุด (18.9%) ควรสอบถามขั้นตอนการบันทึกที่สาขานี้ก่อน (`COUNT(*)` ไม่เป็น 0 ในทุกกลุ่ม จึงไม่ต้องใช้ NULLIF ในกรณีนี้)
:::
