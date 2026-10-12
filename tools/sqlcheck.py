"""
sqlcheck.py - ตรวจ SQL ในไฟล์เนื้อหา (Markdown) ของ Learning Hub

วิธีใช้:
    python tools/sqlcheck.py                    # ตรวจทุกไฟล์ใน content/
    python tools/sqlcheck.py path/to/file.md    # ตรวจเฉพาะไฟล์
    python tools/sqlcheck.py --run "SELECT ..." # รัน Query เดียวแล้วพิมพ์ผลเป็นตาราง Markdown

ต้องติดตั้ง DuckDB ก่อน:  pip install duckdb

หลักการ:
- โหลดชุดข้อมูลฝึกจาก downloads/data/*.csv เข้า DuckDB (ฐานข้อมูลในหน่วยความจำ)
- แปลง Syntax เฉพาะของ Databricks/Spark SQL บางส่วนให้ DuckDB รันได้ (ดู translate())
- กล่อง ```sql ที่มีป้ายในวงเล็บปีกกาจะถูกรันจริง:
    {verify}          รันแล้วเทียบกับตาราง Markdown ตารางแรกที่อยู่ถัดจากกล่องโค้ด
    {verify partial}  เทียบเฉพาะแถวที่แสดง (ผลลัพธ์จริงมีแถวมากกว่าได้)
    {verify count=N}  ตรวจเพิ่มว่าผลลัพธ์จริงมี N แถว
    {run}             รันได้โดยไม่ Error (ไม่เทียบผล)
    {error}           ตั้งใจให้ Error (ต้อง Error จริง)
    {error skip}      ตั้งใจให้ Error บน Databricks แต่ DuckDB ไม่ Error (เช่น หารด้วยศูนย์) จึงไม่ตรวจ
    {skip}            ไม่ตรวจ (เช่น ผลขึ้นกับวันที่ที่รัน)
- บรรทัด <!-- verify: SELECT ... --> ก่อนตารางข้อมูลต้นทาง จะตรวจว่าแถวในตารางตรงกับผล Query นั้น
  (ตรวจเฉพาะแถวที่แสดง ตามลำดับ) ส่วนบรรทัด HTML comment จะไม่แสดงบนเว็บไซต์
- กล่อง sql ที่ไม่มีป้าย จะไม่ถูกรัน (เช่น Syntax Template, DDL, คำสั่งที่ต้องใช้ Workspace จริง)

ข้อจำกัด: DuckDB ไม่ใช่ Databricks การตรวจนี้ยืนยันตรรกะและตัวเลขกับชุดข้อมูลฝึก
แต่ไม่ได้พิสูจน์ว่า Syntax ทุกตัวรันบน Databricks ได้ 100%
"""
import sys, os, re, glob, decimal, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "downloads", "data")  # สำเนาของ data/*.csv จากชุดเอกสารเดิม

try:
    import duckdb
except ImportError:
    extra = os.environ.get("SQLCHECK_PYLIB")
    if not extra:
        raise
    sys.path.insert(0, extra)
    import duckdb

SCHEMA = {
    "stores": "store_id VARCHAR, store_name VARCHAR, province VARCHAR, region VARCHAR, store_type VARCHAR, open_date DATE",
    "products": "product_id VARCHAR, product_name VARCHAR, category VARCHAR, brand VARCHAR, unit_cost DECIMAL(10,2), list_price DECIMAL(10,2), launch_date DATE, is_active BOOLEAN",
    "sales": "sale_id VARCHAR, sale_date DATE, sale_datetime TIMESTAMP, store_id VARCHAR, product_id VARCHAR, customer_id VARCHAR, quantity INTEGER, unit_price DECIMAL(10,2), discount_amount DECIMAL(10,2), net_amount DECIMAL(12,2), payment_method VARCHAR",
    "sales_archive_2025": "sale_id VARCHAR, sale_date DATE, sale_datetime TIMESTAMP, store_id VARCHAR, product_id VARCHAR, customer_id VARCHAR, quantity INTEGER, unit_price DECIMAL(10,2), discount_amount DECIMAL(10,2), net_amount DECIMAL(12,2), payment_method VARCHAR",
    "promotions": "promo_id VARCHAR, product_id VARCHAR, promo_name VARCHAR, start_date DATE, end_date DATE, discount_pct INTEGER",
    "calendar": "cal_date DATE, year INTEGER, month INTEGER, year_month VARCHAR, day_of_month INTEGER, day_name VARCHAR, is_weekend BOOLEAN",
    "sales_raw": "raw_id INTEGER, sale_date_text VARCHAR, store_code VARCHAR, amount_text VARCHAR",
}


def connect():
    con = duckdb.connect()
    con.execute("SET default_null_order='nulls_first_on_asc_last_on_desc'")  # เหมือน Spark
    for t, cols in SCHEMA.items():
        path = os.path.join(DATA, t + ".csv").replace("\\", "/")
        spec = ", ".join("'%s': '%s'" % (c.split(" ", 1)[0], c.split(" ", 1)[1]) for c in cols.split(", "))
        con.execute(
            f"CREATE TABLE {t} AS SELECT * FROM read_csv('{path}', header=true, "
            f"columns={{{spec}}}, nullstr='', quote='\"', escape='\"')"
        )
    # ตารางเสริมของเว็บไซต์ (store_product, monthly_sales, customers)
    extra = open(os.path.join(ROOT, "downloads", "practice_extra_tables.sql"), encoding="utf-8").read()
    extra = re.sub(r"--[^\n]*", "", extra)
    for stmt in extra.split(";"):
        st = stmt.strip()
        if not st or re.match(r"^(USE|SELECT)\b", st, re.I):
            continue
        st = re.sub(r"\s+COMMENT\s+'[^']*'", "", st)
        con.execute(translate(st))
    con.create_function("initcap_udf", lambda s: s.title() if s is not None else None, ["VARCHAR"], "VARCHAR")
    return con


def jfmt(f):
    out = f
    for a, b in (("yyyy", "%Y"), ("MM", "%m"), ("dd", "%d"), ("HH", "%H"), ("mm", "%M"), ("ss", "%S")):
        out = out.replace(a, b)
    return out


def translate(sql: str) -> str:
    s = re.sub(r"--[^\n]*", "", sql)
    s = re.sub(r"\bFROM\s+VALUES\b(.*?)\)\s*AS\s+(\w+)\s*\(", r"FROM (VALUES\1)) AS \2(", s, flags=re.S | re.I)
    s = re.sub(r"\btry_to_timestamp\s*\(([^,]+),\s*'([^']+)'\)",
               lambda m: "try_strptime(%s, '%s')" % (m.group(1), jfmt(m.group(2))), s, flags=re.I)
    s = re.sub(r"\bTO_DATE\s*\(([^,()]+),\s*'([^']+)'\)",
               lambda m: "CAST(strptime(%s, '%s') AS DATE)" % (m.group(1), jfmt(m.group(2))), s, flags=re.I)
    s = re.sub(r"\bDATE_FORMAT\s*\(([^,]+),\s*'([^']+)'\)",
               lambda m: "strftime(%s, '%s')" % (m.group(1), jfmt(m.group(2))), s, flags=re.I)
    arg = r"([^,()]+(?:\([^()]*\))?[^,()]*)"
    s = re.sub(r"\bDATEDIFF\s*\(\s*" + arg + r"\s*,\s*" + arg + r"\s*\)", r"date_diff('day', \2, \1)", s, flags=re.I)
    s = re.sub(r"\bADD_MONTHS\s*\(" + arg + r",\s*(-?\d+)\s*\)", r"CAST(\1 + to_months(\2) AS DATE)", s, flags=re.I)
    s = re.sub(r"\bDATE_ADD\s*\(" + arg + r",\s*(-?\d+)\s*\)", r"CAST(\1 + \2 AS DATE)", s, flags=re.I)
    s = re.sub(r"\bDATE_SUB\s*\(" + arg + r",\s*(-?\d+)\s*\)", r"CAST(\1 - \2 AS DATE)", s, flags=re.I)
    s = re.sub(r"\bCURRENT_DATE\s*\(\s*\)", "CURRENT_DATE", s, flags=re.I)
    s = re.sub(r"\bCURRENT_TIMESTAMP\s*\(\s*\)", "CURRENT_TIMESTAMP", s, flags=re.I)
    s = re.sub(r"\btry_divide\s*\(" + arg + r",\s*" + arg + r"\)",
               r"(CASE WHEN (\2) = 0 THEN NULL ELSE (\1) / (\2) END)", s, flags=re.I)
    s = re.sub(r"\bLEFT\s+ANTI\s+JOIN\b", "ANTI JOIN", s, flags=re.I)
    s = re.sub(r"\bLEFT\s+SEMI\s+JOIN\b", "SEMI JOIN", s, flags=re.I)
    s = re.sub(r"\s+DIV\s+", " // ", s)
    s = re.sub(r"\bDAYOFWEEK\s*\(", "1 + dayofweek(", s, flags=re.I)
    s = re.sub(r"\bINITCAP\s*\(", "initcap_udf(", s, flags=re.I)
    s = re.sub(r"\bSTRING\b", "VARCHAR", s)
    return s.strip().rstrip(";")


def fmt(v):
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, datetime.datetime):
        return v.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(v, datetime.date):
        return v.isoformat()
    if isinstance(v, decimal.Decimal):
        return format(v, "f")
    if isinstance(v, float):
        return repr(round(v, 6))
    return str(v)


def run(con, sql):
    cur = con.execute(translate(sql))
    cols = [d[0] for d in cur.description] if cur.description else []
    rows = cur.fetchall() if cols else []
    return cols, rows


def to_md(cols, rows):
    out = ["| " + " | ".join(cols) + " |", "|" + "---|" * len(cols)]
    for r in rows:
        out.append("| " + " | ".join(fmt(v) for v in r) + " |")
    return "\n".join(out)


def same(expected, actual):
    e = expected.strip().strip("`").replace("\\|", "|")
    if e.upper() == "NULL":
        return actual is None
    if actual is None:
        return False
    a = fmt(actual)
    if e == a or e == a.strip():
        return True
    try:
        ev = decimal.Decimal(e.replace(",", ""))
        av = decimal.Decimal(str(actual))
        exp = ev.as_tuple().exponent
        places = -exp if exp < 0 else 0
        return abs(av - ev) <= decimal.Decimal(1).scaleb(-places) / 2 + decimal.Decimal("1e-9")
    except Exception:
        return False


def parse_table(lines, start):
    i = start
    while i < len(lines) and not lines[i].lstrip().startswith("|"):
        if lines[i].startswith("```") or lines[i].startswith("#"):
            return None, None
        i += 1
    tbl = []
    while i < len(lines) and lines[i].lstrip().startswith("|"):
        tbl.append(lines[i].strip())
        i += 1
    if not tbl:
        return None, None
    split = lambda row: [c.strip() for c in re.split(r"(?<!\\)\|", row.strip()[1:-1])]
    cells = [split(r) for r in tbl]
    return cells[0], cells[2:]


def check_file(con, path):
    lines = open(path, encoding="utf-8").read().split("\n")
    fails, count, i = [], 0, 0
    while i < len(lines):
        src = re.match(r"^<!--\s*verify:\s*(.+?)\s*-->\s*$", lines[i])
        if src:
            # ตารางข้อมูลต้นทางตัวอย่าง: ตรวจว่าแถวที่แสดงมีอยู่จริงตาม Query ที่ซ่อนไว้
            count += 1
            where = f"{os.path.relpath(path, ROOT)}:{i + 1}"
            header, exp = parse_table(lines, i + 1)
            try:
                cols, rows = run(con, src.group(1))
                if header is None or [h.strip("`") for h in header] != cols:
                    fails.append(f"{where}: ตารางข้อมูลต้นทาง ชื่อ Column ไม่ตรง {header} / {cols}")
                else:
                    for k, erow in enumerate(exp):
                        if k >= len(rows) or not all(same(e, a) for e, a in zip(erow, rows[k])):
                            fails.append(f"{where}: ตารางข้อมูลต้นทาง แถว {k + 1} ไม่ตรง คาด {erow}")
                            break
            except Exception as ex:
                fails.append(f"{where}: Error: {str(ex).splitlines()[0]}")
            i += 1
            continue
        m = re.match(r"^```sql\s*\{([^}]*)\}", lines[i])
        if not m:
            i += 1
            continue
        flags = m.group(1).split()
        j, body = i + 1, []
        while j < len(lines) and not lines[j].startswith("```"):
            body.append(lines[j])
            j += 1
        sql = "\n".join(body)
        count += 1
        where = f"{os.path.relpath(path, ROOT)}:{i + 1}"
        i = j + 1
        if "skip" in flags:
            count -= 1
            continue
        if "error" in flags:
            try:
                run(con, sql)
                fails.append(f"{where}: ตั้งใจให้ Error แต่รันผ่าน")
            except Exception:
                pass
            continue
        try:
            cols, rows = run(con, sql)
        except Exception as ex:
            fails.append(f"{where}: Error: {str(ex).splitlines()[0]}")
            continue
        if "verify" not in flags:
            continue
        header, exp = parse_table(lines, j + 1)
        if header is None:
            fails.append(f"{where}: ไม่พบตารางผลลัพธ์ให้เทียบ")
            continue
        for f in flags:
            if f.startswith("count=") and len(rows) != int(f[6:]):
                fails.append(f"{where}: จำนวนแถวจริง {len(rows)} ไม่ตรงกับที่ระบุ {f[6:]}")
        if [h.strip("`") for h in header] != cols:
            fails.append(f"{where}: ชื่อ Column ไม่ตรง คาด {header} จริง {cols}")
        if "partial" not in flags and len(exp) != len(rows):
            fails.append(f"{where}: จำนวนแถวไม่ตรง คาด {len(exp)} จริง {len(rows)}")
        for k, erow in enumerate(exp):
            if k >= len(rows):
                fails.append(f"{where}: ตารางคาดหวังมีแถวมากกว่าผลจริง")
                break
            if len(erow) != len(rows[k]) or not all(same(e, a) for e, a in zip(erow, rows[k])):
                fails.append(f"{where}: แถว {k + 1} ไม่ตรง คาด {erow} จริง {[fmt(v) for v in rows[k]]}")
                break
    return count, fails


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    con = connect()
    args = sys.argv[1:]
    if args and args[0] == "--run":
        cols, rows = run(con, args[1] if len(args) > 1 else sys.stdin.read())
        print(to_md(cols, rows))
        print(f"\n({len(rows)} แถว)")
        return
    files = args or sorted(glob.glob(os.path.join(ROOT, "content", "**", "*.md"), recursive=True))
    total, allfails = 0, []
    for f in files:
        n, fails = check_file(con, f)
        total += n
        allfails += fails
    print(f"ตรวจ SQL ทั้งหมด {total} กล่อง จาก {len(files)} ไฟล์")
    if allfails:
        print(f"ไม่ผ่าน {len(allfails)} รายการ:")
        for x in allfails:
            print("  - " + x)
        sys.exit(1)
    print("ผ่านทั้งหมด")


if __name__ == "__main__":
    main()
