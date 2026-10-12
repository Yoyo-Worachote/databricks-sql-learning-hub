## ข้อ 1.1 (ง่าย): เลือกคอลัมน์

**โจทย์:** แสดง `store_id`, `store_name` และ `region` ของทุกสาขา

**ตารางที่ใช้:** `stores`

:::answer
```sql {verify}
SELECT
  store_id,
  store_name,
  region
FROM stores;
```

| store_id | store_name | region |
|---|---|---|
| S01 | สาขาสุขุมวิท | Bangkok |
| S02 | สาขาบางนา | Bangkok |
| S03 | สาขาเชียงใหม่ | North |
| S04 | สาขาขอนแก่น | Northeast |
| S05 | สาขาภูเก็ต | South |
| S06 | สาขาหาดใหญ่ | South |

**เหตุผล:** เลือก 3 คอลัมน์ คั่นด้วยจุลภาค ได้ 6 แถวตามจำนวนสาขา ลำดับคอลัมน์ในผลลัพธ์เป็นไปตามที่เขียนใน `SELECT`
:::

## ข้อ 1.2 (ปานกลาง): ค่าที่ไม่ซ้ำ

**โจทย์:** มีภูมิภาค (`region`) อะไรบ้าง ให้แสดงแบบไม่ซ้ำ เรียงตามตัวอักษร

:::answer
```sql {verify}
SELECT DISTINCT
  region
FROM stores
ORDER BY region;
```

| region |
|---|
| Bangkok |
| North |
| Northeast |
| South |

**เหตุผล:** `DISTINCT` ทำให้ Bangkok และ South ที่มีภูมิภาคละ 2 สาขาแสดงครั้งเดียว ได้ 4 ภูมิภาค
:::

## ข้อ 1.3 (ท้าทาย): คอลัมน์คำนวณ

**โจทย์:** แสดง `sale_id`, `quantity`, `unit_price` และยอดก่อนหักส่วนลด (`quantity * unit_price`) ตั้งชื่อว่า `gross_amount` เพียง 10 แถว เรียงตาม `sale_id`

:::answer
```sql {verify partial count=10}
SELECT
  sale_id,
  quantity,
  unit_price,
  quantity * unit_price AS gross_amount
FROM sales
ORDER BY sale_id
LIMIT 10;
```

**ผลลัพธ์** (แสดง 8 จาก 10 แถว)

| sale_id | quantity | unit_price | gross_amount |
|---|---|---|---|
| T0001 | 1 | 18.00 | 18.00 |
| T0002 | 1 | 18.00 | 18.00 |
| T0003 | 5 | 18.00 | 90.00 |
| T0004 | 3 | 25.00 | 75.00 |
| T0005 | 1 | 18.00 | 18.00 |
| T0006 | 2 | 7.00 | 14.00 |
| T0007 | 2 | 18.00 | 36.00 |
| T0008 | 1 | 18.00 | 18.00 |

**เหตุผล:** คอลัมน์คำนวณทำทีละแถว (T0003: 5 × 18.00 = 90.00) `ORDER BY sale_id` ทำให้ได้ 10 แถวเดิมทุกครั้งที่รัน ถ้าไม่ใส่ `ORDER BY` ผลลัพธ์อาจได้แถวต่างกัน
:::
