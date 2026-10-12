-- =====================================================================
-- practice_extra_tables.sql
-- ตารางเสริมสำหรับบทเรียนบนเว็บไซต์ Databricks SQL Learning Hub (ข้อมูลสมมติทั้งหมด)
--
-- ใช้คู่กับ sql/00_setup_dataset.sql (ต้องสร้าง Schema sql_training ก่อน)
-- ตารางในไฟล์นี้:
--   store_product  : ยอดขายรวมต่อสาขาต่อสินค้า (ใช้ในบทเรียน Top 3 Products per Store)
--   monthly_sales  : ยอดขายรวมรายเดือนของบริษัทสมมติ ปี 2024-2025 (ใช้ฝึกเปรียบเทียบกับปีก่อน)
--                    ไม่เกี่ยวข้องกับตาราง sales ของชุดข้อมูลหลัก
--   customers      : ข้อมูลสมาชิก (ไม่มีชื่อหรือข้อมูลส่วนบุคคล) ใช้ฝึกหาลูกค้าที่ไม่มีรายการซื้อ
--
-- ไฟล์นี้ลบและสร้างเฉพาะ 3 ตารางข้างต้นใน Schema sql_training เท่านั้น
-- =====================================================================

-- USE CATALOG your_catalog;
USE sql_training;

DROP TABLE IF EXISTS store_product;
CREATE TABLE store_product (
  store_id   STRING        COMMENT 'รหัสสาขา',
  product_id STRING        COMMENT 'รหัสสินค้า',
  total_net  DECIMAL(12,2) COMMENT 'ยอดขายสุทธิรวมของสินค้านี้ในสาขานี้'
) COMMENT 'ตารางสอน: ยอดขายรวมต่อสาขาต่อสินค้า';

INSERT INTO store_product VALUES
  ('S01', 'P001', 1200.00),
  ('S01', 'P002',  950.00),
  ('S01', 'P003',  950.00),
  ('S01', 'P004',  600.00),
  ('S01', 'P005',  300.00),
  ('S02', 'P001',  800.00),
  ('S02', 'P003',  700.00),
  ('S02', 'P005',  500.00),
  ('S02', 'P006',  500.00),
  ('S02', 'P002',  200.00),
  ('S03', 'P002',  400.00),
  ('S03', 'P004',  350.00);

DROP TABLE IF EXISTS monthly_sales;
CREATE TABLE monthly_sales (
  month_start DATE          COMMENT 'วันที่ 1 ของเดือน',
  net_sales   DECIMAL(12,2) COMMENT 'ยอดขายสุทธิรวมของเดือน (บาท)'
) COMMENT 'ตารางสอน: ยอดขายรวมรายเดือนของบริษัทสมมติ ปี 2024-2025';

INSERT INTO monthly_sales VALUES
  (DATE'2024-01-01', 120000.00),
  (DATE'2024-02-01', 112000.00),
  (DATE'2024-03-01', 125000.00),
  (DATE'2024-04-01', 118000.00),
  (DATE'2024-05-01', 121000.00),
  (DATE'2024-06-01', 116000.00),
  (DATE'2024-07-01', 119000.00),
  (DATE'2024-08-01', 123000.00),
  (DATE'2024-09-01', 117000.00),
  (DATE'2024-10-01', 126000.00),
  (DATE'2024-11-01', 131000.00),
  (DATE'2024-12-01', 142000.00),
  (DATE'2025-01-01', 132000.00),
  (DATE'2025-02-01', 118000.00),
  (DATE'2025-03-01', 120000.00),
  (DATE'2025-04-01', 125000.00),
  (DATE'2025-05-01', 133000.00),
  (DATE'2025-06-01', 127000.00);

DROP TABLE IF EXISTS customers;
CREATE TABLE customers (
  customer_id STRING COMMENT 'รหัสลูกค้าสมาชิก (Primary Key)',
  segment     STRING COMMENT 'ระดับสมาชิก: Gold / Silver / Basic',
  join_date   DATE   COMMENT 'วันที่สมัครสมาชิก'
) COMMENT 'ตารางสอน: ข้อมูลสมาชิก (ไม่มีข้อมูลส่วนบุคคล)';

INSERT INTO customers VALUES
  ('C001', 'Gold',   DATE'2023-02-10'),
  ('C002', 'Silver', DATE'2023-05-21'),
  ('C003', 'Basic',  DATE'2023-07-03'),
  ('C004', 'Gold',   DATE'2023-08-15'),
  ('C005', 'Basic',  DATE'2023-09-30'),
  ('C006', 'Silver', DATE'2023-11-12'),
  ('C007', 'Basic',  DATE'2024-01-08'),
  ('C008', 'Gold',   DATE'2024-02-19'),
  ('C009', 'Silver', DATE'2024-03-25'),
  ('C010', 'Basic',  DATE'2024-04-30'),
  ('C011', 'Basic',  DATE'2024-06-11'),
  ('C012', 'Silver', DATE'2024-07-22'),
  ('C013', 'Gold',   DATE'2024-08-05'),
  ('C014', 'Basic',  DATE'2024-09-16'),
  ('C015', 'Silver', DATE'2024-10-27'),
  ('C016', 'Basic',  DATE'2024-12-02'),
  ('C017', 'Gold',   DATE'2025-01-14'),
  ('C018', 'Basic',  DATE'2025-03-03'),
  ('C019', 'Silver', DATE'2025-05-18'),
  ('C020', 'Basic',  DATE'2025-08-09'),
  ('C021', 'Basic',  DATE'2026-02-20'),
  ('C022', 'Silver', DATE'2026-03-15');

-- ตรวจจำนวนแถว: store_product 12, monthly_sales 18, customers 22
SELECT 'store_product' AS table_name, COUNT(*) AS row_count FROM store_product
UNION ALL SELECT 'monthly_sales', COUNT(*) FROM monthly_sales
UNION ALL SELECT 'customers', COUNT(*) FROM customers;
