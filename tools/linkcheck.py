"""
linkcheck.py - ตรวจความสมบูรณ์ของเนื้อหาเว็บไซต์ (ไม่ต้องติดตั้งอะไรเพิ่ม)

ตรวจ:
- ทุกไฟล์ที่ manifest.json อ้างถึงมีอยู่จริง และทุกไฟล์ใน content/ ถูกอ้างใน manifest
- id ไม่ซ้ำ, lesson.prereq / lesson.formulas / formula.related / exerciseSet.lesson ชี้ไปที่ id ที่มีจริง
- ลิงก์ภายใน (#/lesson/..., #/formula/..., #/exercises/..., #/reference/...) ในทุกไฟล์ Markdown ชี้ไปที่ id ที่มีจริง
- ลิงก์ไปไฟล์ดาวน์โหลด (downloads/...) มีไฟล์อยู่จริง
- กล่องโค้ด ``` เปิด-ปิดครบ และ ::: เปิด-ปิดครบ

วิธีใช้:  python tools/linkcheck.py
"""
import json, os, re, sys, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    m = json.load(open(os.path.join(ROOT, "content", "manifest.json"), encoding="utf-8"))
    errors = []
    ids = {
        "lesson": {x["id"] for x in m["lessons"]},
        "formula": {x["id"] for x in m["formulas"]},
        "exercises": {x["id"] for x in m["exerciseSets"]},
        "reference": {x["id"] for x in m["references"]},
    }
    cats = {c["id"] for c in m["formulaCategories"]}
    levels = {lv["id"] for lv in m["levels"]}

    referenced = set()
    for group in ("lessons", "formulas", "exerciseSets", "references"):
        seen = set()
        for x in m[group]:
            if x["id"] in seen:
                errors.append(f"manifest: id ซ้ำ {x['id']}")
            seen.add(x["id"])
            path = os.path.join(ROOT, x["file"])
            referenced.add(os.path.normpath(path))
            if not os.path.exists(path):
                errors.append(f"manifest: ไม่พบไฟล์ {x['file']}")
            if "level" in x and x["level"] not in levels:
                errors.append(f"manifest: level ไม่รู้จัก {x['id']} -> {x['level']}")
    for l in m["lessons"]:
        for p in l.get("prereq", []):
            if p not in ids["lesson"]:
                errors.append(f"lesson {l['id']}: prereq ไม่มีจริง {p}")
        for f in l.get("formulas", []):
            if f not in ids["formula"]:
                errors.append(f"lesson {l['id']}: formula ไม่มีจริง {f}")
    for f in m["formulas"]:
        if f["category"] not in cats:
            errors.append(f"formula {f['id']}: category ไม่มีจริง {f['category']}")
        for r in f.get("related", []):
            if r not in ids["formula"]:
                errors.append(f"formula {f['id']}: related ไม่มีจริง {r}")
    for x in m["exerciseSets"]:
        if x.get("lesson") and x["lesson"] not in ids["lesson"]:
            errors.append(f"exercise {x['id']}: lesson ไม่มีจริง {x['lesson']}")
    for c in cats:
        if not any(f["category"] == c for f in m["formulas"]):
            errors.append(f"หมวด {c} ไม่มีสูตรเลย")

    files = sorted(glob.glob(os.path.join(ROOT, "content", "**", "*.md"), recursive=True))
    for path in files:
        rel = os.path.relpath(path, ROOT)
        if os.path.normpath(path) not in referenced:
            errors.append(f"{rel}: ไม่ได้ถูกอ้างใน manifest")
        text = open(path, encoding="utf-8").read()
        for kind, ident in re.findall(r"\(#/(lesson|formula|exercises|reference)/([\w-]+)", text):
            if ident not in ids[kind]:
                errors.append(f"{rel}: ลิงก์เสีย #/{kind}/{ident}")
        for href in re.findall(r"\]\((downloads/[^)\s]+)\)", text):
            if not os.path.exists(os.path.join(ROOT, href)):
                errors.append(f"{rel}: ไม่พบไฟล์ดาวน์โหลด {href}")
        fences = len(re.findall(r"^```", text, flags=re.M))
        if fences % 2:
            errors.append(f"{rel}: กล่องโค้ด ``` เปิด-ปิดไม่ครบ")
        opens = len(re.findall(r"^:::\w+", text, flags=re.M))
        closes = len(re.findall(r"^:::\s*$", text, flags=re.M))
        if opens != closes:
            errors.append(f"{rel}: ::: เปิด {opens} ปิด {closes}")

    print(f"ตรวจ {len(files)} ไฟล์ บทเรียน {len(ids['lesson'])} สูตร {len(ids['formula'])} "
          f"แบบฝึกหัด {len(ids['exercises'])} ชุด อ้างอิง {len(ids['reference'])} หน้า")
    if errors:
        print(f"พบปัญหา {len(errors)} รายการ:")
        for e in errors:
            print("  - " + e)
        sys.exit(1)
    print("ผ่านทั้งหมด")


if __name__ == "__main__":
    main()
