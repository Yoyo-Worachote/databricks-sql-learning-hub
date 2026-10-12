# Databricks SQL Learning Hub

เว็บไซต์เรียน SQL บน Databricks เป็นภาษาไทย: บทเรียน 25 บท (Beginner → Workplace), คลังสูตร SQL 50 สูตรที่ค้นหาได้, แบบฝึกหัด 55 ข้อพร้อมเฉลย และชุดข้อมูลฝึกจำลอง

เป็น Static Site (HTML + CSS + JavaScript) **ไม่ต้อง Build และไม่ต้องติดตั้ง Node.js** เนื้อหาทั้งหมดอยู่ในไฟล์ Markdown แยกจากโค้ด

## โครงสร้างไฟล์

```
learning-hub/
├─ index.html                 หน้าหลัก (Single Page App ใช้ Hash Routing เช่น #/lesson/joins)
├─ .nojekyll                  บอก GitHub Pages ไม่ให้ประมวลผลด้วย Jekyll
├─ assets/
│  ├─ css/style.css           สไตล์ทั้งหมด (ธีมสว่าง/มืด รองรับมือถือ)
│  └─ js/
│     ├─ app.js               Router และการแสดงผลทุกหน้า
│     ├─ markdown.js          ตัวแปลง Markdown ของเว็บไซต์
│     ├─ sql-highlight.js     ระบายสี SQL
│     └─ search.js            ค้นหาเนื้อหาทั้งเว็บไซต์
├─ content/
│  ├─ manifest.json           รายการบทเรียน สูตร แบบฝึกหัด หน้าอ้างอิง (ชื่อ ลำดับ คำค้น ความสัมพันธ์)
│  ├─ lessons/*.md            บทเรียน 25 บท (หัวข้อ ## แต่ละอันคือ 1 สไลด์)
│  ├─ formulas/*.md           คลังสูตร 50 สูตร
│  ├─ exercises/*.md          แบบฝึกหัด 13 ชุด
│  └─ reference/*.md          ชุดข้อมูล สรุปสูตร Dialect คำศัพท์ เกี่ยวกับ
├─ downloads/                 ไฟล์ให้ดาวน์โหลด (setup SQL, ตารางเสริม, CSV)
└─ tools/
   ├─ sqlcheck.py             รัน SQL ทุกกล่องกับชุดข้อมูลฝึกแล้วเทียบผลลัพธ์ที่แสดง
   └─ linkcheck.py            ตรวจ manifest ลิงก์ภายใน และไฟล์ดาวน์โหลด
```

## รันในเครื่อง

ต้องเปิดผ่านเว็บเซิร์ฟเวอร์ (เปิดไฟล์ `index.html` ตรง ๆ แบบ `file://` จะโหลดเนื้อหาไม่ได้)

```bash
cd learning-hub
python -m http.server 8000
```

แล้วเปิด http://localhost:8000

## แก้ไขหรือเพิ่มเนื้อหา

1. **แก้เนื้อหา:** แก้ไฟล์ `.md` ใน `content/` ได้เลย
2. **เพิ่มบทเรียน/สูตร/แบบฝึกหัด:** สร้างไฟล์ `.md` แล้วเพิ่มรายการใน `content/manifest.json` (id, ชื่อ, ระดับ, คำค้น, ไฟล์)
3. **รูปแบบ Markdown ที่รองรับ**
   - `## หัวข้อ` (ในบทเรียน 1 หัวข้อ = 1 สไลด์), `### หัวข้อย่อย`
   - ตาราง `| a | b |` (ใช้ `\|` ถ้าต้องมีเครื่องหมาย | ในเซลล์)
   - กล่องโค้ด SQL: ` ```sql {verify} ` (ดูป้ายด้านล่าง) — **1 Query ต้องอยู่ในกล่องเดียวเสมอ**
   - กล่องข้อความ: `> [!TIP] หัวเรื่อง` (TIP, NOTE, WARNING, DATABRICKS, MISTAKE, CHECK, KEY)
   - เฉลยที่กดเปิดได้: `:::answer ข้อความปุ่ม` ... `:::`
   - ลำดับขั้น: `:::flow` แต่ละบรรทัด `ชื่อขั้น | คำอธิบาย` ... `:::`
   - ลิงก์ภายใน: `[ข้อความ](#/formula/f-top-n-per-group)`
4. **ป้ายของกล่อง SQL** (ใช้กับเครื่องมือตรวจ และถูกซ่อนบนเว็บ)
   - `{verify}` รันแล้วเทียบกับตาราง Markdown ตารางแรกที่อยู่ถัดไป
   - `{verify partial count=N}` เทียบเฉพาะแถวที่แสดง และตรวจว่าผลจริงมี N แถว
   - `{run}` แค่ต้องรันผ่าน, `{error}` ต้อง Error, `{error skip}` / `{skip}` ไม่ตรวจ
   - บรรทัด `<!-- verify: SELECT ... -->` ก่อนตารางข้อมูลต้นทาง จะตรวจว่าแถวในตารางมีอยู่จริง
5. **ตรวจก่อน Publish ทุกครั้ง**

```bash
pip install duckdb
python tools/sqlcheck.py
python tools/linkcheck.py
```

`sqlcheck.py` ใช้ DuckDB จำลองการรัน (แปลงฟังก์ชันเฉพาะ Databricks บางตัว) จึงยืนยันตรรกะและตัวเลขกับชุดข้อมูลฝึก แต่ไม่ได้พิสูจน์ว่ารันบน Databricks ได้ 100%

## Deploy ด้วย GitHub Pages

1. สร้าง Repository ใหม่ใน GitHub (เช่น `databricks-sql-learning-hub`) ตั้งเป็น **Public** และไม่ต้องสร้างไฟล์ใด ๆ
2. Push โฟลเดอร์นี้ขึ้นไป (Repository ในเครื่องเตรียมไว้แล้วที่ branch `main`)

```bash
git remote add origin https://github.com/<ชื่อบัญชี>/databricks-sql-learning-hub.git
git push -u origin main
```

3. ใน GitHub ไปที่ **Settings → Pages** เลือก Source: **Deploy from a branch**, Branch: **main**, Folder: **/ (root)** แล้วกด Save
4. รอ 1–3 นาที เว็บไซต์จะอยู่ที่ `https://<ชื่อบัญชี>.github.io/databricks-sql-learning-hub/`

**อัปเดตเว็บไซต์ภายหลัง:** แก้ไฟล์ → รันเครื่องมือตรวจ → `git add -A && git commit -m "..." && git push` แล้ว GitHub Pages จะอัปเดตเองภายในไม่กี่นาที

## ข้อจำกัด

- ความคืบหน้าการเรียนบันทึกใน localStorage ของเบราว์เซอร์แต่ละเครื่องเท่านั้น
- ไม่มีระบบรัน SQL ในเว็บ ต้องคัดลอกไปรันใน Databricks
- ไม่ได้เผยแพร่ Pre-test, Post-test, Answer Key และเฉลย Final Project (เอกสารสำหรับผู้สอน)
- ข้อมูลทั้งหมดเป็นข้อมูลจำลอง
