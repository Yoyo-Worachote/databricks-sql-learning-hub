## คำศัพท์พื้นฐาน

| คำศัพท์ | ความหมาย | ตัวอย่าง |
|---|---|---|
| **SQL** | ภาษาสำหรับถามและจัดการข้อมูลในตาราง | `SELECT * FROM stores;` |
| **Query** | คำสั่ง SQL หนึ่งชุด (คำถามที่ถามข้อมูล) | "ขอยอดขายต่อสาขา" |
| **Databricks** | แพลตฟอร์มเก็บและประมวลผลข้อมูลขององค์กร | — |
| **SQL Warehouse** | เครื่องประมวลผลที่รัน SQL ต้องเปิดและมีสิทธิ์ | เลือกที่มุมขวาบนของ SQL Editor |
| **SQL Editor** | หน้าจอพิมพ์และรัน Query | — |
| **Catalog** | กลุ่มข้อมูลระดับบนสุด | `main` |
| **Schema / Database** | กลุ่มของตาราง | `sql_training` |
| **Table** | ตารางข้อมูล | `sales` |
| **View** | Query ที่บันทึกชื่อไว้ เรียกใช้เหมือนตาราง ไม่เก็บข้อมูลซ้ำ | `v_sales_daily` |
| **Row (แถว)** | ข้อมูล 1 รายการ | การขาย 1 รายการ |
| **Column (คอลัมน์)** | คุณสมบัติของรายการ | `net_amount` |
| **Data Type (ชนิดข้อมูล)** | ประเภทค่าที่คอลัมน์เก็บได้ | STRING, INT, DECIMAL, DATE, TIMESTAMP, BOOLEAN |
| **NULL** | ไม่มีค่า / ไม่ทราบค่า (ไม่ใช่ 0 และไม่ใช่ข้อความว่าง) | `customer_id` ของลูกค้าทั่วไป |
| **Alias** | ชื่อเล่นของคอลัมน์หรือตาราง | `SUM(x) AS total_net`, `sales AS s` |
| **Literal** | ค่าคงที่ที่เขียนใน Query | `'S01'`, `100`, `DATE'2026-02-01'` |

## คำศัพท์การกรองและสรุป

| คำศัพท์ | ความหมาย | ตัวอย่าง |
|---|---|---|
| **Filter (กรอง)** | คัดเฉพาะแถวที่ต้องการ | `WHERE store_id = 'S01'` |
| **Aggregate Function** | ฟังก์ชันยุบหลายแถวเป็นค่าเดียว | `SUM`, `COUNT`, `AVG`, `MIN`, `MAX` |
| **GROUP BY** | จัดกลุ่มก่อนสรุป ได้ 1 แถวต่อกลุ่ม | ยอดต่อสาขา |
| **HAVING** | กรองผลหลังสรุป | `HAVING SUM(net_amount) > 2500` |
| **Conditional Aggregation** | สรุปแบบมีเงื่อนไข | `SUM(CASE WHEN ... THEN x ELSE 0 END)` |
| **Wildcard** | สัญลักษณ์แทนตัวอักษรใน LIKE | `%` (กี่ตัวก็ได้), `_` (1 ตัว) |
| **Tie-breaker (ตัวตัดสิน)** | คอลัมน์ที่ใช้เรียงเมื่อค่าหลักเท่ากัน | `ORDER BY total_net DESC, product_id` |

## คำศัพท์การรวมตาราง

| คำศัพท์ | ความหมาย | ตัวอย่าง |
|---|---|---|
| **JOIN** | จับคู่แถวระหว่างตารางด้วย Key (ต่อแนวนอน) | `sales JOIN products` |
| **UNION ALL** | ต่อผลลัพธ์แนวตั้ง (เพิ่มแถว) | archive + sales |
| **Primary Key (PK)** | คอลัมน์ที่ระบุแถวได้ไม่ซ้ำ | `products.product_id` |
| **Foreign Key (FK)** | คอลัมน์ที่อ้างถึง PK ของอีกตาราง | `sales.product_id` |
| **Fact table** | ตารางเหตุการณ์ หลายแถว | `sales` |
| **Dimension table** | ตารางข้อมูลประกอบ 1 แถวต่อ 1 สิ่ง | `products`, `stores` |
| **Fan-out** | แถวเพิ่มผิดปกติหลัง JOIN เพราะ Key ฝั่งขวาซ้ำ | `sales JOIN promotions` |
| **Anti-join** | หาแถวที่ไม่มีคู่ | ลูกค้าที่ไม่เคยซื้อ |
| **Orphan Key** | Foreign Key ที่หาคู่ไม่เจอ | `P099` |
| **Self Join** | JOIN ตารางกับตัวเอง | เทียบเดือนกับเดือนเดียวกันปีก่อน |

## คำศัพท์ขั้นสูง

| คำศัพท์ | ความหมาย | ตัวอย่าง |
|---|---|---|
| **Subquery** | Query ซ้อนใน Query | `WHERE x > (SELECT AVG(x) ...)` |
| **Scalar Subquery** | Subquery ที่คืนค่าเดียว | ค่าเฉลี่ยทั้งตาราง |
| **Correlated Subquery** | Subquery ที่อ้างคอลัมน์ของ Query หลัก | `NOT EXISTS (... WHERE s.id = c.id)` |
| **CTE** | Common Table Expression ผลลัพธ์ชั่วคราวที่ตั้งชื่อด้วย WITH | `WITH clean_sales AS (...)` |
| **Window Function** | ฟังก์ชันที่คำนวณโดยมองแถวข้างเคียงแต่ไม่ยุบแถว | `SUM(x) OVER (...)` |
| **PARTITION BY** | แบ่งกลุ่มของ Window Function (เริ่มนับใหม่ทุกกลุ่ม) | `PARTITION BY store_id` |
| **Frame** | ช่วงแถวที่ Window Function มองเห็น | `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` |
| **Running Total** | ยอดสะสม | `SUM(x) OVER (ORDER BY d)` |
| **Moving Average** | ค่าเฉลี่ยเคลื่อนที่ | เฉลี่ย 3 แถวล่าสุด |
| **Top N per Group** | N อันดับแรกของแต่ละกลุ่ม | สินค้า Top 3 ต่อร้าน |
| **QUALIFY** | กรองผล Window Function (เฉพาะ Databricks) | `QUALIFY rn <= 3` |
| **Logical Query Processing Order** | ลำดับเชิงตรรกะที่ SQL ประมวลผลแต่ละส่วน | FROM → WHERE → … → LIMIT |
| **Physical Plan** | แผนการทำงานจริงของเครื่อง | ดูด้วย `EXPLAIN` |

## คำศัพท์งานวิเคราะห์และคุณภาพข้อมูล

| คำศัพท์ | ความหมาย |
|---|---|
| **Grain** | ความหมายของ 1 แถวใน Dataset เช่น 1 แถว = 1 เดือน × 1 สาขา |
| **Net Sales** | ยอดขายสุทธิ |
| **COGS** | ต้นทุนขาย (Cost of Goods Sold) |
| **Gross Profit / GP%** | กำไรขั้นต้น / อัตรากำไรขั้นต้น |
| **MoM / YoY / DoD** | เทียบเดือนก่อน / ปีก่อน / วันก่อน |
| **YTD / MTD** | ยอดสะสมตั้งแต่ต้นปี / ต้นเดือน |
| **Duplicate** | ข้อมูลซ้ำ |
| **Outlier** | ค่าผิดปกติ |
| **Data Quality (DQ)** | คุณภาพข้อมูล |
| **Reconciliation** | การกระทบยอดก่อน/หลัง เพื่อพิสูจน์ว่าตัวเลขถูก |
| **ANSI mode** | โหมดมาตรฐานที่ทำให้หารศูนย์หรือแปลงชนิดผิดเกิด Error |
| **Data Skipping** | การข้ามไฟล์ที่ไม่เกี่ยวข้องโดยใช้สถิติของไฟล์ |
| **Query Profile** | หน้าแสดงเวลาและจำนวนแถวของแต่ละขั้นของ Query ที่รันแล้ว |
