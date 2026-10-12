## สูตรนี้คืออะไร

| ฟังก์ชัน | ทำอะไร | ตัวอย่าง | ผล |
|---|---|---|---|
| `ROUND(x, d)` | ปัด d ตำแหน่ง (ครึ่งปัดออกจากศูนย์) | `ROUND(88.531915, 2)` | 88.53 |
| `FLOOR(x)` | ปัดลง | `FLOOR(88.53)` | 88 |
| `CEIL(x)` | ปัดขึ้น | `CEIL(88.53)` | 89 |
| `ABS(x)` | ค่าสัมบูรณ์ | `ABS(-30.00)` | 30.00 |
| `a DIV b` | หารเอาจำนวนเต็ม | `17 DIV 5` | 3 |
| `a % b` / `MOD(a, b)` | เศษ | `17 % 5` | 2 |
| `try_divide(a, b)` | หาร ตัวหาร 0 ได้ NULL | `try_divide(10, 0)` | NULL |
| `FORMAT_NUMBER(x, 2)` | ข้อความมีจุลภาค (แสดงผล) | `FORMAT_NUMBER(1250, 2)` | '1,250.00' |

> [!DATABRICKS] การหาร
> `/` ใน Databricks ได้ทศนิยมเสมอ (`5 / 2 = 2.5`) ต่างจาก SQL Server ที่ได้ 2 เมื่อเป็นจำนวนเต็ม

## รูปแบบ (Syntax)

```sql
SELECT
  ROUND(value / NULLIF(divisor, 0), 2) AS ratio_2dp,
  FLOOR(value / 10) * 10               AS band_start
FROM table_name;
```

## ตัวอย่างข้อมูลต้นทาง

<!-- verify: SELECT sale_id, quantity, net_amount FROM sales WHERE sale_id IN ('T0044','T0060','T0061') ORDER BY sale_id -->
| sale_id | quantity | net_amount |
|---|---|---|
| T0044 | 2 | -1.00 |
| T0060 | 1 | -8.00 |
| T0061 | -2 | -30.00 |

## SQL Query ฉบับเต็มและผลลัพธ์

```sql {verify}
SELECT
  sale_id,
  net_amount,
  quantity,
  ROUND(net_amount / NULLIF(quantity, 0), 2) AS price_per_unit,
  ABS(net_amount)                            AS abs_net
FROM sales
WHERE sale_id IN ('T0044', 'T0060', 'T0061')
ORDER BY sale_id;
```

| sale_id | net_amount | quantity | price_per_unit | abs_net |
|---|---|---|---|---|
| T0044 | -1.00 | 2 | -0.50 | 1.00 |
| T0060 | -8.00 | 1 | -8.00 | 8.00 |
| T0061 | -30.00 | -2 | 15.00 | 30.00 |

## อธิบายทีละส่วน

- `NULLIF(quantity, 0)` กันหารศูนย์ แล้ว `ROUND(..., 2)` ปัดทศนิยม
- ราคาต่อชิ้นติดลบ (T0044, T0060) บอกว่าส่วนลดมากกว่ายอดสินค้า ส่วน T0061 เป็นการรับคืน

## ข้อผิดพลาดที่พบบ่อย

- ปัดเศษทุกแถวก่อนรวม ทำให้ผลรวมคลาดเคลื่อน ควรรวมก่อนแล้วค่อยปัดครั้งเดียว
- ใช้ `FORMAT_NUMBER` แล้วนำผล (ข้อความ) ไปเรียงหรือคำนวณ
- ใช้ `DOUBLE` เก็บเงิน ควรใช้ `DECIMAL(p, s)`

## ข้อควรระวังและกรณีพิเศษ

- `ROUND(2.5, 0)` = 3 และ `ROUND(-2.5, 0)` = −3 ถ้าต้องการปัดแบบ Banker's rounding ใช้ `BROUND`

## วิธีอื่นที่ใช้แทนกันได้

- `try_divide(a, b)` แทน `a / NULLIF(b, 0)`

## แบบฝึกหัด

**โจทย์:** สร้างคอลัมน์ `price_band_start` = ราคาป้ายปัดลงเป็นหลักสิบ ของสินค้าหมวด Snack

:::answer
```sql {verify}
SELECT
  product_id,
  list_price,
  FLOOR(list_price / 10) * 10 AS price_band_start
FROM products
WHERE category = 'Snack'
ORDER BY product_id;
```

| product_id | list_price | price_band_start |
|---|---|---|
| P004 | 25.00 | 20 |
| P005 | 15.00 | 10 |
| P006 | 30.00 | 30 |

**เหตุผล:** หาร 10 แล้วปัดลง แล้วคูณกลับ: 25 → 2.5 → 2 → 20
:::
