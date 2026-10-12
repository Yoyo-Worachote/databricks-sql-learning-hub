## สูตรนี้คืออะไร

| ฟังก์ชัน | ความหมาย |
|---|---|
| `LAG(col)` | ค่าของแถว**ก่อนหน้า** 1 แถวตามลำดับใน OVER |
| `LAG(col, n, default)` | ค่าของแถวก่อนหน้า n แถว ถ้าไม่มีใช้ default |
| `LEAD(col)` | ค่าของแถว**ถัดไป** |

**ใช้เมื่อ:** เทียบกับเดือนก่อน หาระยะห่างระหว่างการซื้อแต่ละครั้ง หาการเปลี่ยนแปลงจากแถวก่อนหน้า

## รูปแบบ (Syntax)

```sql
SELECT
  order_col,
  value_col,
  LAG(value_col)  OVER (PARTITION BY group_col ORDER BY order_col) AS prev_value,
  LEAD(value_col) OVER (PARTITION BY group_col ORDER BY order_col) AS next_value
FROM table_name;
```

## ตัวอย่างข้อมูลต้นทาง

ยอดรายเดือนต่อสาขา (สรุปจาก `sales`) เช่น S01: ม.ค. 2,480 / ก.พ. 583 / มี.ค. 1,285

## SQL Query ฉบับเต็มและผลลัพธ์

```sql {verify partial count=13}
WITH store_month AS (
  SELECT
    store_id,
    CAST(DATE_TRUNC('MONTH', sale_date) AS DATE) AS month_start,
    SUM(net_amount)                              AS total_net
  FROM sales
  GROUP BY store_id, CAST(DATE_TRUNC('MONTH', sale_date) AS DATE)
),
with_prev AS (
  SELECT
    store_id,
    month_start,
    total_net,
    LAG(total_net) OVER (PARTITION BY store_id ORDER BY month_start) AS prev_month_net
  FROM store_month
)
SELECT
  store_id,
  month_start,
  total_net,
  prev_month_net,
  total_net - prev_month_net AS diff_thb
FROM with_prev
ORDER BY store_id, month_start;
```

**ผลลัพธ์** (แสดง 6 จาก 13 แถว)

| store_id | month_start | total_net | prev_month_net | diff_thb |
|---|---|---|---|---|
| S01 | 2026-01-01 | 2480.00 | NULL | NULL |
| S01 | 2026-02-01 | 583.00 | 2480.00 | -1897.00 |
| S01 | 2026-03-01 | 1285.00 | 583.00 | 702.00 |
| S02 | 2026-01-01 | 1228.00 | NULL | NULL |
| S02 | 2026-02-01 | 254.00 | 1228.00 | -974.00 |
| S02 | 2026-03-01 | 1748.00 | 254.00 | 1494.00 |

## อธิบายทีละส่วน

- `PARTITION BY store_id` → LAG ดูเฉพาะเดือนก่อนของสาขาเดียวกัน แถวเดือนแรกของแต่ละสาขาจึงเป็น NULL
- คำนวณ LAG ครั้งเดียวใน CTE `with_prev` แล้วนำไปลบในชั้นนอก ไม่ต้องเขียน LAG ซ้ำ

## ข้อผิดพลาดที่พบบ่อย

- ลืม PARTITION BY → เดือนแรกของ S02 ถูกเทียบกับเดือนสุดท้ายของ S01
- ใช้กับข้อมูลที่มีเดือนขาดหาย → เทียบผิดเดือน (สำหรับ YoY ใช้ JOIN ดีกว่า [ดูสูตร](#/formula/f-yoy-comparison))
- กรองช่วงเวลาใน WHERE ชั้นเดียวกัน → แถวก่อนหน้าถูกตัดไปก่อน LAG ทำงาน ได้ NULL

## ข้อควรระวังและกรณีพิเศษ

- `LAG(col, 1, 0)` แทน NULL ด้วย 0 ใช้เมื่อแน่ใจว่าความหมายถูก (เดือนแรกของสาขาใหม่ไม่ใช่ "ยอด 0" เสมอไป)

## วิธีอื่นที่ใช้แทนกันได้

- Self Join ตามวันที่/เดือน (ถูกต้องแม้ข้อมูลขาดช่วง)

## แบบฝึกหัด

**โจทย์:** ลูกค้า C001 ซื้อแต่ละครั้งห่างจากครั้งก่อนกี่วัน

:::answer
```sql {verify}
WITH purchases AS (
  SELECT
    sale_id,
    sale_date,
    LAG(sale_date) OVER (ORDER BY sale_date, sale_id) AS prev_purchase_date
  FROM sales
  WHERE customer_id = 'C001'
)
SELECT
  sale_id,
  sale_date,
  prev_purchase_date,
  DATEDIFF(sale_date, prev_purchase_date) AS days_since_prev
FROM purchases
ORDER BY sale_date, sale_id;
```

| sale_id | sale_date | prev_purchase_date | days_since_prev |
|---|---|---|---|
| T0045 | 2026-01-24 | NULL | NULL |
| T0046 | 2026-01-24 | 2026-01-24 | 0 |
| T0050 | 2026-01-27 | 2026-01-24 | 3 |
| T0077 | 2026-02-15 | 2026-01-27 | 19 |
| T0078 | 2026-02-16 | 2026-02-15 | 1 |
| T0086 | 2026-02-22 | 2026-02-16 | 6 |
| T0134 | 2026-03-28 | 2026-02-22 | 34 |

**เหตุผล:** LAG ดึงวันที่ของรายการก่อนหน้า แล้ว DATEDIFF(วันล่าสุด, วันก่อนหน้า) ได้จำนวนวัน T0045 และ T0046 อยู่วันเดียวกัน (อาจเป็นบิลเดียวกันหลายสินค้า) จึงห่าง 0 วัน
:::
