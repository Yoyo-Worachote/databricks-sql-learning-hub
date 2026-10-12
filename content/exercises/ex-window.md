## ข้อ 8.1 (ง่าย): จัดอันดับทั้งตาราง

**โจทย์:** จัดอันดับสินค้าตามราคาป้าย (`list_price`) จากแพงไปถูกด้วย `DENSE_RANK` เรียงตามอันดับแล้วตาม `product_id`

:::answer
```sql {verify partial count=12}
SELECT
  product_id,
  product_name,
  list_price,
  DENSE_RANK() OVER (ORDER BY list_price DESC) AS price_rank
FROM products
ORDER BY price_rank, product_id;
```

**ผลลัพธ์** (แสดง 8 จาก 12 แถว)

| product_id | product_name | list_price | price_rank |
|---|---|---|---|
| P008 | แชมพู 400ml | 129.00 | 1 |
| P012 | กระดาษทิชชู 6 ม้วน | 99.00 | 2 |
| P007 | สบู่เหลว 450ml | 89.00 | 3 |
| P009 | ยาสีฟัน 160g | 59.00 | 4 |
| P011 | ถุงขยะ 30 ใบ | 49.00 | 5 |
| P010 | น้ำยาล้างจาน 500ml | 39.00 | 6 |
| P006 | ถั่วอบเกลือ 40g | 30.00 | 7 |
| P004 | มันฝรั่งทอด 50g | 25.00 | 8 |

**เหตุผล:** ไม่มี `PARTITION BY` จึงจัดอันดับรวมทั้งตาราง ถ้ามีสินค้าราคาเท่ากันจะได้อันดับเดียวกันและไม่ข้ามเลข (คุณสมบัติของ `DENSE_RANK`)
:::

## ข้อ 8.2 (ปานกลาง): อันดับ 1 ของแต่ละกลุ่ม

**โจทย์:** หาสินค้าที่ยอดสุทธิสูงสุด 1 อันดับของแต่ละหมวด (category ที่ NULL ให้เป็น `'Unknown'`) ใช้ `ROW_NUMBER`

:::answer
```sql {verify}
WITH product_total AS (
  SELECT
    COALESCE(p.category, 'Unknown') AS category,
    s.product_id,
    SUM(s.net_amount)               AS total_net
  FROM sales AS s
  LEFT JOIN products AS p
    ON s.product_id = p.product_id
  GROUP BY COALESCE(p.category, 'Unknown'), s.product_id
),
ranked AS (
  SELECT
    category,
    product_id,
    total_net,
    ROW_NUMBER() OVER (PARTITION BY category ORDER BY total_net DESC, product_id) AS rn
  FROM product_total
)
SELECT
  category,
  product_id,
  total_net
FROM ranked
WHERE rn = 1
ORDER BY total_net DESC;
```

| category | product_id | total_net |
|---|---|---|
| Personal Care | P007 | 3599.00 |
| Beverage | P003 | 1310.00 |
| Snack | P004 | 1115.00 |
| Unknown | P010 | 819.00 |

**เหตุผล:** รูปแบบ Top N ต่อกลุ่ม: (1) สรุประดับหมวด-สินค้า (2) จัดอันดับภายในหมวดด้วย `PARTITION BY category` (3) กรอง `rn = 1` ในชั้นนอก กลุ่ม Unknown มี P010 (819) และ P099 (270) อันดับ 1 จึงเป็น P010
:::

## ข้อ 8.3 (ท้าทาย): เทียบเดือนก่อนแยกสาขา

**โจทย์:** สำหรับแต่ละสาขา แสดงยอดสุทธิรายเดือน (ม.ค.–มี.ค. 2026) ยอดเดือนก่อน และผลต่าง (บาท) เทียบเดือนก่อน

:::answer
```sql {verify partial count=13}
WITH store_month AS (
  SELECT
    store_id,
    CAST(DATE_TRUNC('MONTH', sale_date) AS DATE) AS month_start,
    SUM(net_amount)                              AS total_net
  FROM sales
  GROUP BY store_id, CAST(DATE_TRUNC('MONTH', sale_date) AS DATE)
)
SELECT
  store_id,
  month_start,
  total_net,
  LAG(total_net) OVER (PARTITION BY store_id ORDER BY month_start)             AS prev_month_net,
  total_net - LAG(total_net) OVER (PARTITION BY store_id ORDER BY month_start) AS diff_thb
FROM store_month
ORDER BY store_id, month_start;
```

**ผลลัพธ์** (แสดง 8 จาก 13 แถว)

| store_id | month_start | total_net | prev_month_net | diff_thb |
|---|---|---|---|---|
| S01 | 2026-01-01 | 2480.00 | NULL | NULL |
| S01 | 2026-02-01 | 583.00 | 2480.00 | -1897.00 |
| S01 | 2026-03-01 | 1285.00 | 583.00 | 702.00 |
| S02 | 2026-01-01 | 1228.00 | NULL | NULL |
| S02 | 2026-02-01 | 254.00 | 1228.00 | -974.00 |
| S02 | 2026-03-01 | 1748.00 | 254.00 | 1494.00 |
| S03 | 2026-01-01 | 451.00 | NULL | NULL |
| S03 | 2026-02-01 | 755.00 | 451.00 | 304.00 |

**เหตุผล:** `PARTITION BY store_id` ทำให้ `LAG` ดูเฉพาะเดือนก่อนหน้าของสาขาเดียวกัน แถวเดือนแรกของแต่ละสาขา (รวม S05 ที่เปิดเดือนมีนาคม) จึงเป็น NULL ถ้าลืม `PARTITION BY` เดือนมกราคมของ S02 จะถูกเทียบกับเดือนมีนาคมของ S01 ซึ่งผิด
:::
