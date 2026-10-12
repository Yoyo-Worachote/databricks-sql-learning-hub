## ข้อ 4.1 (ง่าย): สรุปตามกลุ่ม

**โจทย์:** หาจำนวนรายการขายและยอดขายสุทธิรวมของแต่ละวิธีชำระเงิน (`payment_method`) เรียงยอดมากไปน้อย

:::answer
```sql {verify}
SELECT
  payment_method,
  COUNT(*)        AS line_count,
  SUM(net_amount) AS total_net
FROM sales
GROUP BY payment_method
ORDER BY total_net DESC;
```

| payment_method | line_count | total_net |
|---|---|---|
| Cash | 51 | 4305.00 |
| QR Payment | 49 | 4271.00 |
| Credit Card | 41 | 3907.00 |

**เหตุผล:** `GROUP BY payment_method` ได้ 1 แถวต่อวิธีชำระเงิน ตรวจได้ว่า 51 + 49 + 41 = 141 แถว และ 4,305 + 4,271 + 3,907 = 12,483 บาท เท่ากับทั้งตาราง
:::

## ข้อ 4.2 (ปานกลาง): กรองผลสรุปด้วย HAVING

**โจทย์:** หาสินค้า (`product_id`) ที่ขายรวมตั้งแต่ 40 ชิ้นขึ้นไป แสดงจำนวนชิ้นรวมและยอดสุทธิรวม เรียงตามจำนวนชิ้นมากไปน้อย

:::answer
```sql {verify}
SELECT
  product_id,
  SUM(quantity)   AS total_qty,
  SUM(net_amount) AS total_net
FROM sales
GROUP BY product_id
HAVING SUM(quantity) >= 40
ORDER BY total_qty DESC;
```

| product_id | total_qty | total_net |
|---|---|---|
| P001 | 102 | 664.00 |
| P003 | 75 | 1310.00 |
| P002 | 55 | 986.00 |
| P004 | 49 | 1115.00 |
| P007 | 41 | 3599.00 |

**เหตุผล:** เงื่อนไขกับผลรวมต้องอยู่ใน `HAVING` (ถ้าใส่ใน `WHERE` จะ Error) สังเกตว่า P001 มีจำนวนชิ้นสูงเพราะมีรายการผิดปกติ 60 ชิ้นรวมอยู่ ส่วน P007 ขายได้ 41 ชิ้นแต่ยอดเงินสูงสุด เพราะราคาต่อชิ้นสูง
:::

## ข้อ 4.3 (ท้าทาย): สัดส่วนแบบมีเงื่อนไข

**โจทย์:** สำหรับแต่ละสาขา หาสัดส่วน (%) ยอดสุทธิที่มาจาก `'QR Payment'` เทียบกับยอดสุทธิทั้งหมดของสาขา ปัดทศนิยม 1 ตำแหน่ง เรียงสัดส่วนมากไปน้อย

:::answer
```sql {verify}
SELECT
  store_id,
  SUM(net_amount)                                                        AS total_net,
  SUM(CASE WHEN payment_method = 'QR Payment' THEN net_amount ELSE 0 END) AS qr_net,
  ROUND(
    SUM(CASE WHEN payment_method = 'QR Payment' THEN net_amount ELSE 0 END) * 100.0
    / NULLIF(SUM(net_amount), 0), 1)                                      AS qr_pct
FROM sales
GROUP BY store_id
ORDER BY qr_pct DESC;
```

| store_id | total_net | qr_net | qr_pct |
|---|---|---|---|
| S02 | 3230.00 | 1383.00 | 42.8 |
| S01 | 4348.00 | 1591.00 | 36.6 |
| S04 | 2618.00 | 872.00 | 33.3 |
| S03 | 1624.00 | 425.00 | 26.2 |
| S05 | 663.00 | 0.00 | 0.0 |

**เหตุผล:** `SUM(CASE WHEN ... THEN ค่า ELSE 0 END)` คือ "ยอดรวมแบบมีเงื่อนไข" ภายในกลุ่มเดียวกัน แล้วหารด้วยยอดรวมทั้งหมดพร้อม `NULLIF` คูณ `100.0` ก่อนหารเพื่อให้ได้ทศนิยม S05 ไม่มีรายการ QR Payment เลย จึงได้ 0.0%
:::
