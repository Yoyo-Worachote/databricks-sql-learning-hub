## ข้อ 5.1 (ง่าย): JOIN เพื่อใช้ข้อมูลจากอีกตาราง

**โจทย์:** แสดง `sale_id`, `store_id`, `store_name` และ `net_amount` ของรายการขายของสาขาในภูมิภาค North เรียงตาม `sale_id`

:::answer
```sql {verify partial count=23}
SELECT
  s.sale_id,
  s.store_id,
  st.store_name,
  s.net_amount
FROM sales AS s
INNER JOIN stores AS st
  ON s.store_id = st.store_id
WHERE st.region = 'North'
ORDER BY s.sale_id;
```

**ผลลัพธ์** (แสดง 8 จาก 23 แถว)

| sale_id | store_id | store_name | net_amount |
|---|---|---|---|
| T0005 | S03 | สาขาเชียงใหม่ | 18.00 |
| T0013 | S03 | สาขาเชียงใหม่ | 72.00 |
| T0019 | S03 | สาขาเชียงใหม่ | 60.00 |
| T0024 | S03 | สาขาเชียงใหม่ | 108.00 |
| T0027 | S03 | สาขาเชียงใหม่ | 30.00 |
| T0032 | S03 | สาขาเชียงใหม่ | 14.00 |
| T0038 | S03 | สาขาเชียงใหม่ | 18.00 |
| T0044 | S03 | สาขาเชียงใหม่ | -1.00 |

**เหตุผล:** ภูมิภาคอยู่ในตาราง `stores` จึงต้อง JOIN ก่อนกรองด้วย `st.region` ภูมิภาค North มีสาขาเดียวคือเชียงใหม่ (S03) ได้ 23 แถว ใส่ชื่อย่อตารางนำหน้าทุกคอลัมน์เพื่อไม่ให้กำกวม
:::

## ข้อ 5.2 (ปานกลาง): แสดงทุกสาขาแม้ไม่มียอด

**โจทย์:** แสดงทุกสาขา พร้อมจำนวนรายการขายและยอดขายสุทธิรวม สาขาที่ไม่มียอดให้แสดงเป็น 0

:::answer
```sql {verify}
SELECT
  st.store_id,
  st.store_name,
  COUNT(s.sale_id)               AS line_count,
  COALESCE(SUM(s.net_amount), 0) AS total_net
FROM stores AS st
LEFT JOIN sales AS s
  ON st.store_id = s.store_id
GROUP BY st.store_id, st.store_name
ORDER BY st.store_id;
```

| store_id | store_name | line_count | total_net |
|---|---|---|---|
| S01 | สาขาสุขุมวิท | 47 | 4348.00 |
| S02 | สาขาบางนา | 37 | 3230.00 |
| S03 | สาขาเชียงใหม่ | 23 | 1624.00 |
| S04 | สาขาขอนแก่น | 27 | 2618.00 |
| S05 | สาขาภูเก็ต | 7 | 663.00 |
| S06 | สาขาหาดใหญ่ | 0 | 0.00 |

**เหตุผล:** เริ่มจาก `stores` แล้ว LEFT JOIN เพื่อเก็บทุกสาขา `COUNT(s.sale_id)` ให้ 0 กับ S06 (ถ้าใช้ `COUNT(*)` จะได้ 1 ซึ่งผิด เพราะนับแถวที่เติม NULL) และ `COALESCE` เปลี่ยนผลรวมที่เป็น NULL เป็น 0
:::

## ข้อ 5.3 (ท้าทาย): ไม่ให้ยอดหายเพราะ Key ไม่ตรง

**โจทย์:** หายอดขายสุทธิรวมของแต่ละหมวดสินค้า โดยไม่ให้รายการของ P099 (ไม่มีในตาราง `products`) หายไป และตรวจว่ายอดรวมทุกหมวดเท่ากับยอดรวมของตาราง `sales`

:::answer
```sql {verify}
SELECT
  COALESCE(p.category, 'Unknown') AS category,
  SUM(s.net_amount)               AS total_net
FROM sales AS s
LEFT JOIN products AS p
  ON s.product_id = p.product_id
GROUP BY COALESCE(p.category, 'Unknown')
ORDER BY total_net DESC;
```

| category | total_net |
|---|---|
| Personal Care | 6124.00 |
| Beverage | 2960.00 |
| Snack | 2310.00 |
| Unknown | 1089.00 |

**ตรวจยอดรวม**

```sql {verify}
SELECT SUM(net_amount) AS total_net
FROM sales;
```

| total_net |
|---|
| 12483.00 |

**เหตุผล:** LEFT JOIN จาก `sales` เก็บทุกรายการ กลุ่ม Unknown รวมทั้ง P010 (หมวดว่าง 819 บาท) และ P099 (ไม่มีในตารางสินค้า 270 บาท) เมื่อรวม 6,124 + 2,960 + 2,310 + 1,089 = 12,483 เท่ากับยอดของตาราง `sales` แปลว่าไม่มีแถวหายหรือซ้ำ ถ้าใช้ INNER JOIN ยอดรวมจะเหลือ 12,213 (หายไป 270)
:::
