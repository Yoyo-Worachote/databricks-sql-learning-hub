## ภาพรวม

ทุกบทเรียน สูตร และแบบฝึกหัดใช้**ข้อมูลจำลอง**ของร้านค้าปลีกสมมติ 6 สาขา สินค้า 12 รายการ อยู่ใน Schema `sql_training` ไม่มีข้อมูลบริษัท ลูกค้า หรือข้อมูลส่วนบุคคลจริง

| ตาราง | 1 แถว หมายถึง | จำนวนแถว | สร้างจากไฟล์ |
|---|---|---|---|
| `sales` | สินค้า 1 รายการในบิล (ม.ค.–มี.ค. 2026) | 141 | 00_setup_dataset.sql |
| `products` | สินค้า 1 ตัว | 12 | 00_setup_dataset.sql |
| `stores` | สาขา 1 แห่ง | 6 | 00_setup_dataset.sql |
| `promotions` | โปรโมชัน 1 รายการ | 4 | 00_setup_dataset.sql |
| `calendar` | วันที่ 1 วัน (1 ต.ค. 2025 – 31 มี.ค. 2026) | 182 | 00_setup_dataset.sql |
| `sales_archive_2025` | เหมือน `sales` แต่เป็น ต.ค.–ธ.ค. 2025 | 50 | 00_setup_dataset.sql |
| `sales_raw` | แถวจากไฟล์ Excel ดิบ (ข้อความทั้งหมด) | 8 | 00_setup_dataset.sql |
| `store_product` | ยอดรวม 1 สาขา × 1 สินค้า (ตารางสอน) | 12 | practice_extra_tables.sql |
| `monthly_sales` | ยอดรวม 1 เดือน ของบริษัทสมมติ 2024–2025 (ตารางสอน) | 18 | practice_extra_tables.sql |
| `customers` | สมาชิก 1 คน (มีแค่รหัส ระดับ วันที่สมัคร) | 22 | practice_extra_tables.sql |

> [!NOTE] ตารางสอน 3 ตารางสุดท้าย
> `store_product`, `monthly_sales` และ `customers` เพิ่มขึ้นสำหรับเว็บไซต์นี้ เพื่อสาธิตเรื่องอันดับเมื่อยอดเท่ากัน การเทียบกับปีก่อน และการหาลูกค้าที่ไม่มีรายการซื้อ ตัวเลขใน `monthly_sales` เป็นข้อมูลสมมติแยกต่างหาก **ไม่เกี่ยวข้อง**กับตาราง `sales`

## วิธีสร้างชุดข้อมูลใน Databricks

:::flow
ขอสิทธิ์ | ต้องมีสิทธิ์สร้าง Schema ใน Catalog ที่ใช้ฝึก (ปกติผู้สอนหรือทีม Data เป็นผู้ทำ)
เปิด SQL Editor | เลือก SQL Warehouse และ Catalog ที่ได้รับอนุญาต
รันไฟล์หลัก | วางเนื้อหา 00_setup_dataset.sql แล้วกด Run all
รันไฟล์เสริม | วางเนื้อหา practice_extra_tables.sql แล้วกด Run all (ถ้าต้องการทำตัวอย่างที่ใช้ตารางสอน)
ตรวจจำนวนแถว | ผลท้ายไฟล์ต้องตรงกับตารางด้านบน
ให้สิทธิ์ผู้เรียน | USE CATALOG / USE SCHEMA / SELECT บน sql_training
:::

**ดาวน์โหลดไฟล์**

- [00_setup_dataset.sql](downloads/00_setup_dataset.sql) — สร้าง Schema และ 7 ตารางหลัก (จากชุดเอกสารเดิม)
- [practice_extra_tables.sql](downloads/practice_extra_tables.sql) — ตารางสอนเพิ่มเติม 3 ตาราง
- ไฟล์ CSV สำรอง (ใช้เมื่อรัน SQL ไม่ได้ หรือฝึกใน Excel): [sales.csv](downloads/data/sales.csv), [products.csv](downloads/data/products.csv), [stores.csv](downloads/data/stores.csv), [promotions.csv](downloads/data/promotions.csv), [calendar.csv](downloads/data/calendar.csv), [sales_archive_2025.csv](downloads/data/sales_archive_2025.csv), [sales_raw.csv](downloads/data/sales_raw.csv)

> [!WARNING] ใช้เฉพาะใน Schema ฝึก
> ไฟล์ทั้งสองลบและสร้างตาราง**เฉพาะใน Schema `sql_training`** ห้ามเปลี่ยนชื่อ Schema ไปเป็นที่ที่มีข้อมูลงานจริง และห้ามรันในสภาพแวดล้อมงานจริงโดยไม่ได้รับอนุญาต

## ความสัมพันธ์ระหว่างตาราง

| คอลัมน์ | เชื่อมกับ | ประเภท |
|---|---|---|
| `sales.store_id` | `stores.store_id` | หลายรายการขาย → 1 สาขา |
| `sales.product_id` | `products.product_id` | หลายรายการขาย → 1 สินค้า (P099 หาคู่ไม่เจอ) |
| `sales.sale_date` | `calendar.cal_date` | หลายรายการ → 1 วัน |
| `promotions.product_id` | `products.product_id` | สินค้า 1 ตัวมีได้หลายโปรโมชัน (P002 มี 2) |
| `sales.customer_id` | `customers.customer_id` | NULL = ลูกค้าทั่วไป |

## ตาราง sales

| Column | ชนิดข้อมูล | คำอธิบาย |
|---|---|---|
| `sale_id` | STRING | เลขที่รายการขาย |
| `sale_date` | DATE | วันที่ขาย |
| `sale_datetime` | TIMESTAMP | วันและเวลาที่ขาย |
| `store_id` | STRING | รหัสสาขา |
| `product_id` | STRING | รหัสสินค้า |
| `customer_id` | STRING | รหัสสมาชิก (NULL = ไม่ใช่สมาชิก) |
| `quantity` | INT | จำนวนชิ้น (ติดลบ = รับคืน) |
| `unit_price` | DECIMAL(10,2) | ราคาขายต่อชิ้น (หลังโปรโมชัน) |
| `discount_amount` | DECIMAL(10,2) | ส่วนลดท้ายบิล (NULL = ไม่ได้บันทึก) |
| `net_amount` | DECIMAL(12,2) | ยอดสุทธิ = quantity × unit_price − ส่วนลด |
| `payment_method` | STRING | Cash / Credit Card / QR Payment |

**ข้อมูลตัวอย่าง** (5 แถวแรกตาม sale_id)

<!-- verify: SELECT sale_id, sale_date, store_id, product_id, customer_id, quantity, unit_price, discount_amount, net_amount, payment_method FROM sales ORDER BY sale_id -->
| sale_id | sale_date | store_id | product_id | customer_id | quantity | unit_price | discount_amount | net_amount | payment_method |
|---|---|---|---|---|---|---|---|---|---|
| T0001 | 2026-01-02 | S01 | P002 | C016 | 1 | 18.00 | 0.00 | 18.00 | Cash |
| T0002 | 2026-01-02 | S01 | P002 | C013 | 1 | 18.00 | 0.00 | 18.00 | Credit Card |
| T0003 | 2026-01-02 | S04 | P003 | C004 | 5 | 18.00 | 0.00 | 90.00 | QR Payment |
| T0004 | 2026-01-03 | S02 | P004 | C017 | 3 | 25.00 | 0.00 | 75.00 | QR Payment |
| T0005 | 2026-01-03 | S03 | P002 | C004 | 1 | 18.00 | NULL | 18.00 | Cash |

`sales_archive_2025` มีโครงสร้างเหมือนกันทุกคอลัมน์ (รหัสขึ้นต้นด้วย A)

## ตาราง products

<!-- verify: SELECT product_id, product_name, category, brand, unit_cost, list_price, launch_date, is_active FROM products ORDER BY product_id -->
| product_id | product_name | category | brand | unit_cost | list_price | launch_date | is_active |
|---|---|---|---|---|---|---|---|
| P001 | น้ำดื่ม 600ml | Beverage | FreshCo | 4.50 | 7.00 | 2020-01-01 | true |
| P002 | ชาเขียว 500ml | Beverage | PureLeaf | 12.00 | 20.00 | 2021-06-01 | true |
| P003 | กาแฟกระป๋อง 180ml | Beverage | FreshCo | 10.00 | 18.00 | 2022-03-15 | true |
| P004 | มันฝรั่งทอด 50g | Snack | SnackHub | 15.00 | 25.00 | 2021-01-10 | true |
| P005 | ขนมปังกรอบ 60g | Snack | SnackHub | 8.00 | 15.00 | 2023-07-01 | true |
| P006 | ถั่วอบเกลือ 40g | Snack | NULL | 18.00 | 30.00 | 2024-02-01 | true |
| P007 | สบู่เหลว 450ml | Personal Care | CleanPro | 55.00 | 89.00 | 2020-05-01 | true |
| P008 | แชมพู 400ml | Personal Care | CleanPro | 79.00 | 129.00 | 2020-05-01 | true |
| P009 | ยาสีฟัน 160g | Personal Care | CleanPro | 35.00 | 59.00 | 2022-09-01 | true |
| P010 | น้ำยาล้างจาน 500ml | NULL | HomeMate | 22.00 | 39.00 | 2023-01-15 | true |
| P011 | ถุงขยะ 30 ใบ | Household | HomeMate | 30.00 | 49.00 | 2025-11-01 | true |
| P012 | กระดาษทิชชู 6 ม้วน | Household | HomeMate | 60.00 | 99.00 | 2019-01-01 | false |

## ตาราง stores

<!-- verify: SELECT store_id, store_name, province, region, store_type, open_date FROM stores ORDER BY store_id -->
| store_id | store_name | province | region | store_type | open_date |
|---|---|---|---|---|---|
| S01 | สาขาสุขุมวิท | กรุงเทพฯ | Bangkok | Mall | 2019-05-01 |
| S02 | สาขาบางนา | กรุงเทพฯ | Bangkok | Mall | 2020-08-15 |
| S03 | สาขาเชียงใหม่ | เชียงใหม่ | North | Street | 2021-03-01 |
| S04 | สาขาขอนแก่น | ขอนแก่น | Northeast | Street | 2022-11-20 |
| S05 | สาขาภูเก็ต | ภูเก็ต | South | Mall | 2026-03-01 |
| S06 | สาขาหาดใหญ่ | สงขลา | South | Street | 2026-06-01 |

## ตาราง promotions และ calendar

<!-- verify: SELECT promo_id, product_id, promo_name, start_date, end_date, discount_pct FROM promotions ORDER BY promo_id -->
| promo_id | product_id | promo_name | start_date | end_date | discount_pct |
|---|---|---|---|---|---|
| PR01 | P002 | ชาเขียวลดต้นปี | 2026-01-01 | 2026-01-31 | 10 |
| PR02 | P002 | ชาเขียวหน้าร้อน | 2026-03-01 | 2026-03-31 | 15 |
| PR03 | P004 | มันฝรั่งวาเลนไทน์ | 2026-02-01 | 2026-02-28 | 20 |
| PR04 | P008 | แชมพูคุ้มค่า | 2026-02-15 | 2026-03-15 | 10 |

`end_date` รวมวันนั้นด้วย

<!-- verify: SELECT cal_date, year, month, year_month, day_of_month, day_name, is_weekend FROM calendar WHERE cal_date >= DATE'2026-01-01' ORDER BY cal_date -->
| cal_date | year | month | year_month | day_of_month | day_name | is_weekend |
|---|---|---|---|---|---|---|
| 2026-01-01 | 2026 | 1 | 2026-01 | 1 | Thu | false |
| 2026-01-02 | 2026 | 1 | 2026-01 | 2 | Fri | false |
| 2026-01-03 | 2026 | 1 | 2026-01 | 3 | Sat | true |

## ตาราง sales_raw

ข้อมูลดิบจากไฟล์ Excel ทุกคอลัมน์เป็น STRING (`store_code` แถว 6 มีช่องว่างหัวท้าย)

<!-- verify: SELECT raw_id, sale_date_text, amount_text FROM sales_raw ORDER BY raw_id -->
| raw_id | sale_date_text | amount_text |
|---|---|---|
| 1 | 05/01/2026 | 1,250.00 |
| 2 | 2026-01-06 | 980.50 |
| 3 | 07/01/2026 | 2,100 |
| 4 | 31/02/2026 | 450.00 |
| 5 | NULL | 700.00 |
| 6 | 15/01/2026 | N/A |
| 7 | 16/01/2026 | 1500 |
| 8 | 2026/01/17 | 320.25 |

## ตารางสอน: store_product, monthly_sales, customers

<!-- verify: SELECT store_id, product_id, total_net FROM store_product WHERE store_id = 'S02' ORDER BY total_net DESC, product_id -->
| store_id | product_id | total_net |
|---|---|---|
| S02 | P001 | 800.00 |
| S02 | P003 | 700.00 |
| S02 | P005 | 500.00 |
| S02 | P006 | 500.00 |
| S02 | P002 | 200.00 |

(ตัวอย่างสาขา S02 ดูครบ 12 แถวได้ใน [บทเรียน Top 3](#/lesson/top-n-per-group))

`monthly_sales`: คอลัมน์ `month_start` (DATE), `net_sales` (DECIMAL) 18 แถว ม.ค. 2024 – มิ.ย. 2025 / `customers`: `customer_id`, `segment` (Gold / Silver / Basic), `join_date` 22 แถว (C021, C022 ยังไม่เคยซื้อ)

## กรณีพิเศษที่ใส่ไว้ในข้อมูล

| กรณี | อยู่ที่ไหน |
|---|---|
| NULL ในรหัสลูกค้า (ไม่ใช่สมาชิก) | `sales.customer_id` 29 แถว |
| NULL ในส่วนลด (ไม่ได้บันทึก) | `sales.discount_amount` 20 แถว |
| แถวซ้ำทั้งแถว | `sale_id = 'T0042'` (2 แถว) |
| รหัสสินค้าที่ไม่มีในตารางสินค้า | `product_id = 'P099'` (T0018, 270 บาท) |
| รับคืน (จำนวนติดลบ) | T0061 (quantity −2) |
| จำนวนผิดปกติ | T0096 (quantity 60) |
| ยอดสุทธิติดลบเพราะส่วนลดมากกว่ายอดสินค้า | T0044, T0060 (พบเพิ่มระหว่างตรวจเอกสารเดิม) |
| สินค้าที่ไม่มียอดขาย | P011, P012 |
| สาขาที่ยังไม่มียอดขาย / เปิดกลางไตรมาส | S06 / S05 |
| หมวดหรือแบรนด์ว่าง | P010 (category), P006 (brand) |
| วันที่ร้านปิด | ไม่มีการขายวันที่ 1 ม.ค. 2026 |
| สินค้า 1 ตัวมีหลายโปรโมชัน | P002 |
| วันที่/ตัวเลขเป็นข้อความหลายรูปแบบ | `sales_raw` |

## ยอดอ้างอิงสำหรับตรวจงาน

| ตัวเลข | ค่า |
|---|---|
| `sales` ทั้งหมด | 141 แถว 12,483.00 บาท |
| หลังตัดแถวซ้ำ | 140 แถว 12,468.00 บาท |
| clean sales (ตัดซ้ำ + quantity 1–50) | 138 แถว 12,078.00 บาท |
| `sales_archive_2025` | 50 แถว 3,631.00 บาท |
