## ข้อ 3.1 (ง่าย): เรียงลำดับ

**โจทย์:** แสดงสาขาทั้งหมด เรียงตามวันที่เปิด (`open_date`) จากใหม่ไปเก่า

:::answer
```sql {verify}
SELECT
  store_id,
  store_name,
  open_date
FROM stores
ORDER BY open_date DESC;
```

| store_id | store_name | open_date |
|---|---|---|
| S06 | สาขาหาดใหญ่ | 2026-06-01 |
| S05 | สาขาภูเก็ต | 2026-03-01 |
| S04 | สาขาขอนแก่น | 2022-11-20 |
| S03 | สาขาเชียงใหม่ | 2021-03-01 |
| S02 | สาขาบางนา | 2020-08-15 |
| S01 | สาขาสุขุมวิท | 2019-05-01 |

**เหตุผล:** `DESC` กับวันที่ = วันล่าสุดก่อน สาขาหาดใหญ่ที่มีกำหนดเปิดเดือนมิถุนายน 2026 จึงอยู่บนสุด
:::

## ข้อ 3.2 (ปานกลาง): N รายการแรกพร้อมตัวตัดสิน

**โจทย์:** หารายการขาย 3 รายการที่จำนวนชิ้น (`quantity`) น้อยที่สุดของสาขา S01 ถ้าจำนวนเท่ากันให้เรียงตาม `sale_id`

:::answer
```sql {verify}
SELECT
  sale_id,
  product_id,
  quantity
FROM sales
WHERE store_id = 'S01'
ORDER BY quantity ASC, sale_id ASC
LIMIT 3;
```

| sale_id | product_id | quantity |
|---|---|---|
| T0061 | P005 | -2 |
| T0001 | P002 | 1 |
| T0002 | P002 | 1 |

**เหตุผล:** เรียง 2 ระดับ ใช้ `sale_id` ตัดสินเมื่อจำนวนเท่ากัน ผลจึงคงที่ทุกครั้ง แถวแรกเป็นรายการรับคืน (ติดลบ) ซึ่งเป็นข้อมูลที่ควรสังเกต
:::

## ข้อ 3.3 (ท้าทาย): CASE WHEN หลายเงื่อนไข

**โจทย์:** สร้างคอลัมน์ `basket_size` จาก `quantity`: 1 ชิ้น = `'Single'`, 2–4 ชิ้น = `'Small'`, 5 ชิ้นขึ้นไป = `'Bulk'`, ค่าติดลบหรือ 0 = `'Return/Check'` แสดงเฉพาะสาขา S03 เรียงตาม `quantity` มากไปน้อย แล้วตาม `sale_id`

:::answer
```sql {verify partial count=23}
SELECT
  sale_id,
  quantity,
  CASE
    WHEN quantity <= 0 THEN 'Return/Check'
    WHEN quantity = 1 THEN 'Single'
    WHEN quantity BETWEEN 2 AND 4 THEN 'Small'
    ELSE 'Bulk'
  END AS basket_size
FROM sales
WHERE store_id = 'S03'
ORDER BY quantity DESC, sale_id;
```

**ผลลัพธ์** (แสดง 8 จาก 23 แถว)

| sale_id | quantity | basket_size |
|---|---|---|
| T0024 | 6 | Bulk |
| T0076 | 6 | Bulk |
| T0127 | 5 | Bulk |
| T0013 | 4 | Small |
| T0049 | 4 | Small |
| T0077 | 4 | Small |
| T0104 | 4 | Small |
| T0138 | 4 | Small |

**เหตุผล:** ตรวจกรณีพิเศษ (`<= 0`) ก่อนเสมอ จากนั้นแบ่งช่วงปกติ และให้ `ELSE` รับค่าที่เหลือคือ 5 ชิ้นขึ้นไป ถ้าวาง `ELSE 'Bulk'` โดยไม่ตรวจค่าติดลบก่อน รายการรับคืนจะถูกจัดเป็น Bulk ผิด ๆ
:::
