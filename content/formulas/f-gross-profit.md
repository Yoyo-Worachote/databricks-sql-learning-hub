## สูตรนี้คืออะไร

| ตัวชี้วัด | สูตรในชุดข้อมูลนี้ |
|---|---|
| Net Sales (ยอดขายสุทธิ) | `SUM(s.net_amount)` |
| COGS (ต้นทุนขาย) | `SUM(s.quantity * p.unit_cost)` ต้นทุนอยู่ในตาราง `products` |
| Gross Profit (กำไรขั้นต้น) | Net Sales − COGS |
| GP% (อัตรากำไรขั้นต้น) | Gross Profit × 100 ÷ Net Sales **คำนวณจากผลรวม** |

## รูปแบบ (Syntax)

```sql
SELECT
  group_col,
  SUM(s.net_amount)                                   AS net_sales,
  SUM(s.quantity * p.unit_cost)                       AS cogs,
  SUM(s.net_amount) - SUM(s.quantity * p.unit_cost)   AS gross_profit,
  ROUND((SUM(s.net_amount) - SUM(s.quantity * p.unit_cost)) * 100.0
        / NULLIF(SUM(s.net_amount), 0), 1)            AS gp_pct
FROM sales AS s
INNER JOIN products AS p ON s.product_id = p.product_id
GROUP BY group_col;
```

## ตัวอย่างข้อมูลต้นทาง

<!-- verify: SELECT product_id, unit_cost, list_price FROM products WHERE product_id IN ('P001','P007','P008') ORDER BY product_id -->
| product_id | unit_cost | list_price |
|---|---|---|
| P001 | 4.50 | 7.00 |
| P007 | 55.00 | 89.00 |
| P008 | 79.00 | 129.00 |

## SQL Query ฉบับเต็มและผลลัพธ์

```sql {verify}
SELECT
  COALESCE(p.category, 'Unknown')                    AS category,
  SUM(s.net_amount)                                  AS net_sales,
  SUM(s.quantity * p.unit_cost)                      AS cogs,
  SUM(s.net_amount) - SUM(s.quantity * p.unit_cost)  AS gross_profit,
  ROUND((SUM(s.net_amount) - SUM(s.quantity * p.unit_cost)) * 100.0
        / NULLIF(SUM(s.net_amount), 0), 1)           AS gp_pct
FROM sales AS s
INNER JOIN products AS p
  ON s.product_id = p.product_id
GROUP BY COALESCE(p.category, 'Unknown')
ORDER BY gross_profit DESC;
```

| category | net_sales | cogs | gross_profit | gp_pct |
|---|---|---|---|---|
| Personal Care | 6124.00 | 3788.00 | 2336.00 | 38.1 |
| Beverage | 2960.00 | 1869.00 | 1091.00 | 36.9 |
| Snack | 2310.00 | 1445.00 | 865.00 | 37.4 |
| Unknown | 819.00 | 462.00 | 357.00 | 43.6 |

## อธิบายทีละส่วน และลำดับการทำงาน

1. JOIN เพื่อนำ `unit_cost` มาคู่กับแต่ละรายการขาย
2. `quantity * unit_cost` คำนวณทีละแถวก่อน แล้ว SUM ตามหมวด
3. GP% = (6,124 − 3,788) × 100 ÷ 6,124 = 38.1%

INNER JOIN ตัด P099 (270 บาท ไม่รู้ต้นทุน) ออก ต้องระบุในรายงาน

## ข้อผิดพลาดที่พบบ่อย

**เฉลี่ย % รายแถว แทนคำนวณจากผลรวม**

```sql {verify}
SELECT
  ROUND(AVG((s.net_amount - s.quantity * p.unit_cost) * 100.0
            / NULLIF(s.net_amount, 0)), 1) AS gp_pct_wrong
FROM sales AS s
JOIN products AS p ON s.product_id = p.product_id
WHERE s.quantity > 0;
```

| gp_pct_wrong |
|---|
| 41.3 |

ค่าที่ถูก (จากผลรวม) คือ 38.1% ค่าเฉลี่ยของ % ให้น้ำหนักรายการ 7 บาทเท่ากับรายการหลายร้อยบาท

- คำนวณ `SUM(quantity) * AVG(unit_cost)` แทนการคูณทีละแถว
- JOIN กับตารางที่ Key ซ้ำก่อน SUM ทำให้ยอดเพิ่ม

## ข้อควรระวังและกรณีพิเศษ

- รายการที่ไม่รู้ต้นทุน: นับในยอดขายได้ แต่ไม่นับในกำไร ([ดูตัวอย่างในบทที่ 20](#/lesson/business-analytics))
- ใน Power BI ให้สร้าง GP% เป็น Measure จาก SUM ของ gross_profit ÷ SUM ของ net_sales

## วิธีอื่นที่ใช้แทนกันได้

- ส่งเฉพาะ `net_sales` และ `cogs` ให้ Power BI แล้วคำนวณกำไรที่นั่น ([ดูสูตร](#/formula/f-powerbi-dataset))

## แบบฝึกหัด

**โจทย์:** คำนวณ Net Sales, COGS, Gross Profit และ GP% ตามหมวดจาก clean sales (ตัดซ้ำ + quantity 1–50)

:::answer
```sql {verify}
WITH clean_sales AS (
  SELECT DISTINCT *
  FROM sales
  WHERE quantity BETWEEN 1 AND 50
)
SELECT
  COALESCE(p.category, 'Unknown')                   AS category,
  SUM(c.net_amount)                                 AS net_sales,
  SUM(c.quantity * p.unit_cost)                     AS cogs,
  SUM(c.net_amount) - SUM(c.quantity * p.unit_cost) AS gross_profit,
  ROUND((SUM(c.net_amount) - SUM(c.quantity * p.unit_cost)) * 100.0
        / NULLIF(SUM(c.net_amount), 0), 1)          AS gp_pct
FROM clean_sales AS c
INNER JOIN products AS p
  ON c.product_id = p.product_id
GROUP BY COALESCE(p.category, 'Unknown')
ORDER BY gross_profit DESC;
```

| category | net_sales | cogs | gross_profit | gp_pct |
|---|---|---|---|---|
| Personal Care | 6124.00 | 3788.00 | 2336.00 | 38.1 |
| Beverage | 2540.00 | 1599.00 | 941.00 | 37.0 |
| Snack | 2325.00 | 1453.00 | 872.00 | 37.5 |
| Unknown | 819.00 | 462.00 | 357.00 | 43.6 |

**เหตุผล:** Beverage ลดลงเพราะตัดรายการน้ำดื่ม 60 ชิ้น ส่วน Snack เปลี่ยนเพราะตัดแถวซ้ำและรายการรับคืน
:::
