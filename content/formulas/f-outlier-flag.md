## สูตรนี้คืออะไร

ใช้ `CASE WHEN` **ติดธง (Flag)** รายการที่ค่าผิดปกติหรือไม่ตรงกฎทางธุรกิจ เพื่อตรวจสอบและแจ้งเจ้าของข้อมูล **ไม่ลบหรือแก้เองเงียบ ๆ** เพราะค่าผิดปกติบางอย่างเป็นเรื่องจริง เช่น การรับคืน

## รูปแบบ (Syntax)

```sql
SELECT
  key_col,
  CASE
    WHEN rule_1 THEN 'flag_1'
    WHEN rule_2 THEN 'flag_2'
    ELSE 'OK'
  END AS dq_flag
FROM table_name
WHERE rule_1 OR rule_2;
```

## ตัวอย่างข้อมูลต้นทาง

กฎที่ควรเป็นจริงของตาราง `sales`: quantity อยู่ระหว่าง 1–50, net_amount ไม่ติดลบเมื่อขายจริง, net_amount = quantity × unit_price − ส่วนลด

## SQL Query ฉบับเต็มและผลลัพธ์

```sql {verify}
SELECT
  sale_id,
  product_id,
  quantity,
  unit_price,
  discount_amount,
  net_amount,
  CASE
    WHEN quantity <= 0 THEN 'Return / zero qty'
    WHEN quantity > 50 THEN 'Unusually large qty'
    WHEN net_amount < 0 THEN 'Negative net (discount > gross)'
    WHEN net_amount <> quantity * unit_price - COALESCE(discount_amount, 0) THEN 'Amount mismatch'
    ELSE 'OK'
  END AS dq_flag
FROM sales
WHERE quantity <= 0
   OR quantity > 50
   OR net_amount < 0
   OR net_amount <> quantity * unit_price - COALESCE(discount_amount, 0)
ORDER BY sale_id;
```

| sale_id | product_id | quantity | unit_price | discount_amount | net_amount | dq_flag |
|---|---|---|---|---|---|---|
| T0044 | P001 | 2 | 7.00 | 15.00 | -1.00 | Negative net (discount > gross) |
| T0060 | P001 | 1 | 7.00 | 15.00 | -8.00 | Negative net (discount > gross) |
| T0061 | P005 | -2 | 15.00 | 0.00 | -30.00 | Return / zero qty |
| T0096 | P001 | 60 | 7.00 | 0.00 | 420.00 | Unusually large qty |

## อธิบายทีละส่วน

- `WHERE` ใช้เงื่อนไขเดียวกับ `CASE` เพื่อแสดงเฉพาะแถวที่มีปัญหา
- ลำดับ WHEN สำคัญ: T0061 มียอดติดลบด้วย แต่ถูกจัดเป็น Return ก่อน
- `COALESCE(discount_amount, 0)` ทำให้แถวที่ส่วนลดเป็น NULL ตรวจสูตรได้

## ข้อผิดพลาดที่พบบ่อย

- ตรวจแค่ "สูตรคำนวณถูก" แต่ไม่ตรวจ "ค่าสมเหตุสมผล" (T0044, T0060 สูตรถูกแต่ยอดติดลบ)
- ลบรายการผิดปกติออกจากรายงานโดยไม่บอกใคร

## ข้อควรระวังและกรณีพิเศษ

- เกณฑ์ "ผิดปกติ" (เช่น > 50 ชิ้น) ต้องตกลงกับธุรกิจ แต่ละสินค้าอาจต่างกัน
- การเทียบทศนิยมด้วย `<>` ใช้ได้กับ DECIMAL ถ้าเป็น DOUBLE ควรเทียบส่วนต่าง `ABS(a - b) > 0.01`

## วิธีอื่นที่ใช้แทนกันได้

- ค่าผิดปกติเชิงสถิติ: เทียบกับค่าเฉลี่ย ± 3 เท่าของส่วนเบี่ยงเบนมาตรฐาน (`STDDEV`)

## แบบฝึกหัด

**โจทย์:** นับจำนวนรายการรับคืน จำนวนผิดปกติ และยอดติดลบทั้งที่ขายจริง แยกตามสาขา

:::answer
```sql {verify}
SELECT
  store_id,
  count_if(quantity <= 0)                   AS returns,
  count_if(quantity > 50)                   AS large_qty,
  count_if(quantity > 0 AND net_amount < 0) AS negative_net
FROM sales
GROUP BY store_id
ORDER BY store_id;
```

| store_id | returns | large_qty | negative_net |
|---|---|---|---|
| S01 | 1 | 0 | 0 |
| S02 | 0 | 1 | 0 |
| S03 | 0 | 0 | 1 |
| S04 | 0 | 0 | 1 |
| S05 | 0 | 0 | 0 |

**เหตุผล:** `count_if` นับแบบมีเงื่อนไขในกลุ่มเดียวกัน ใช้ทำ Dashboard คุณภาพข้อมูลรายสาขาได้
:::
