## สูตรนี้คืออะไร

`HAVING` กรอง**กลุ่ม**หลังจาก `GROUP BY` สรุปแล้ว ส่วน `WHERE` กรอง**แถวดิบ**ก่อนสรุป

| | WHERE | HAVING |
|---|---|---|
| ทำงาน | ก่อน GROUP BY | หลัง GROUP BY |
| กรอง | แถวดิบ | กลุ่มที่สรุปแล้ว |
| ใช้ SUM/COUNT ได้ | ไม่ได้ | ได้ |

**ใช้เมื่อ:** "สาขาที่ยอดเกิน …" "ลูกค้าที่ซื้อเกิน …" "Key ที่ปรากฏมากกว่า 1 ครั้ง"

## รูปแบบ (Syntax)

```sql
SELECT group_col, SUM(amount) AS total_amount
FROM table_name
WHERE row_condition
GROUP BY group_col
HAVING SUM(amount) > 1000;
```

## ตัวอย่างข้อมูลต้นทาง

ยอดรวมต่อสาขาก่อนกรอง: S01 4,348 / S02 3,230 / S04 2,618 / S03 1,624 / S05 663

## SQL Query ฉบับเต็มและผลลัพธ์

```sql {verify}
SELECT
  store_id,
  SUM(net_amount) AS total_net
FROM sales
GROUP BY store_id
HAVING SUM(net_amount) > 2500
ORDER BY total_net DESC;
```

| store_id | total_net |
|---|---|
| S01 | 4348.00 |
| S02 | 3230.00 |
| S04 | 2618.00 |

## อธิบายทีละส่วน

`GROUP BY` สร้าง 5 กลุ่ม → `HAVING SUM(net_amount) > 2500` ตัด S03 และ S05 ออก → เหลือ 3 แถว

**ลำดับการทำงาน:** FROM → WHERE → GROUP BY → **HAVING** → SELECT → ORDER BY

## ข้อผิดพลาดที่พบบ่อย

```sql {error}
SELECT store_id, SUM(net_amount) AS total_net
FROM sales
WHERE SUM(net_amount) > 2500
GROUP BY store_id;
```

Error `INVALID_WHERE_CONDITION` เพราะ WHERE ทำงานก่อนการสรุป

- ใส่เงื่อนไขของแถวดิบ (เช่น ช่วงวันที่) ใน HAVING ทำให้ช้าและอ่านยาก ให้ใส่ใน WHERE

## ข้อควรระวังและกรณีพิเศษ

- Databricks อ้าง Alias ใน HAVING ได้ เช่น `HAVING total_net > 2500` แต่ระบบอื่นหลายตัวไม่ยอม
- HAVING โดยไม่มี GROUP BY จะกรองทั้งตารางเป็นกลุ่มเดียว

## วิธีอื่นที่ใช้แทนกันได้

- สรุปใน CTE แล้วกรองด้วย WHERE ในชั้นนอก ([ดูสูตร CTE](#/formula/f-cte))

## แบบฝึกหัด

**โจทย์:** หาลูกค้าสมาชิกที่ยอดซื้อรวมตั้งแต่ 800 บาทขึ้นไป พร้อมจำนวนรายการ

:::answer
```sql {verify}
SELECT
  customer_id,
  COUNT(*)        AS line_count,
  SUM(net_amount) AS total_spend
FROM sales
WHERE customer_id IS NOT NULL
GROUP BY customer_id
HAVING SUM(net_amount) >= 800
ORDER BY total_spend DESC;
```

| customer_id | line_count | total_spend |
|---|---|---|
| C014 | 8 | 1092.00 |
| C018 | 9 | 1006.00 |
| C003 | 6 | 989.00 |

**เหตุผล:** ตัดลูกค้าทั่วไป (NULL) ด้วย WHERE ก่อนจัดกลุ่ม แล้วใช้ HAVING กับยอดรวม
:::
