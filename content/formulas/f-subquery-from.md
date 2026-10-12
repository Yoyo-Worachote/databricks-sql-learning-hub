## สูตรนี้คืออะไร

Subquery ใน `FROM` (Derived Table) ใช้ผลของ Query ย่อยเป็นตารางชั่วคราว เหมาะกับงาน **สรุปสองชั้น** เช่น สรุปเป็นรายวันก่อน แล้วเฉลี่ยรายวันอีกชั้น

**ใช้แก้ปัญหา:** ฟังก์ชันสรุปซ้อนกันตรง ๆ ไม่ได้ (`AVG(SUM(x))` ใช้ไม่ได้) ต้องสรุปชั้นแรกให้เสร็จก่อน

## รูปแบบ (Syntax)

```sql
SELECT group_col, AVG(level_1_total) AS avg_total
FROM (
  SELECT group_col, sub_group_col, SUM(amount) AS level_1_total
  FROM table_name
  GROUP BY group_col, sub_group_col
) AS t
GROUP BY group_col;
```

## ตัวอย่างข้อมูลต้นทาง

ตาราง `sales` 1 แถว = 1 รายการ สาขาหนึ่งมีหลายรายการต่อวัน

## SQL Query ฉบับเต็มและผลลัพธ์

**โจทย์:** ยอดขายเฉลี่ยต่อวันของแต่ละสาขา (เฉพาะวันที่มีการขาย)

```sql {verify}
SELECT
  store_id,
  ROUND(AVG(store_day_net), 2) AS avg_daily_net
FROM (
  SELECT
    store_id,
    sale_date,
    SUM(net_amount) AS store_day_net
  FROM sales
  GROUP BY store_id, sale_date
) AS daily
GROUP BY store_id
ORDER BY avg_daily_net DESC;
```

| store_id | avg_daily_net |
|---|---|
| S01 | 114.42 |
| S04 | 113.83 |
| S02 | 104.19 |
| S05 | 94.71 |
| S03 | 81.20 |

## อธิบายทีละส่วน และลำดับการทำงาน

1. Subquery `daily`: 1 แถว = 1 สาขา × 1 วัน (S01 มี 38 วันที่ขาย)
2. Query หลัก: เฉลี่ยยอดรายวัน S01 = 4,348 ÷ 38 = 114.42

## ข้อผิดพลาดที่พบบ่อย

- `AVG(net_amount)` ตรง ๆ ได้ยอดเฉลี่ย**ต่อรายการ** ไม่ใช่ต่อวัน
- ไม่ตั้งชื่อ Subquery (Databricks ยอม แต่ระบบอื่นหลายตัว Error)

## ข้อควรระวังและกรณีพิเศษ

- "เฉลี่ยต่อวัน" ในตัวอย่างนี้นับเฉพาะวันที่มีการขาย ถ้าต้องการนับวันที่ไม่มีการขายเป็น 0 ด้วย ต้องเติมวันจากตาราง `calendar` ก่อน ([ดูสูตร](#/formula/f-daily-sales-calendar))

## วิธีอื่นที่ใช้แทนกันได้

- เขียนเป็น [CTE](#/formula/f-cte) อ่านง่ายกว่าเมื่อมีหลายขั้น
- `SUM(net_amount) / COUNT(DISTINCT sale_date)` ได้ผลเดียวกันในกรณีนี้

## แบบฝึกหัด

**โจทย์:** หาจำนวนรายการเฉลี่ยต่อวัน และจำนวนรายการสูงสุดในวันเดียวของแต่ละสาขา

:::answer
```sql {verify}
SELECT
  store_id,
  ROUND(AVG(lines_per_day), 2) AS avg_lines_per_day,
  MAX(lines_per_day)           AS max_lines_per_day
FROM (
  SELECT
    store_id,
    sale_date,
    COUNT(*) AS lines_per_day
  FROM sales
  GROUP BY store_id, sale_date
) AS daily
GROUP BY store_id
ORDER BY store_id;
```

| store_id | avg_lines_per_day | max_lines_per_day |
|---|---|---|
| S01 | 1.24 | 3 |
| S02 | 1.19 | 2 |
| S03 | 1.15 | 3 |
| S04 | 1.17 | 2 |
| S05 | 1.00 | 1 |

**เหตุผล:** ชั้นในนับรายการต่อวัน ชั้นนอกเฉลี่ยและหาค่าสูงสุดของจำนวนนั้น
:::
