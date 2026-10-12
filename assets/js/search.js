/*
 * search.js - ค้นหาเนื้อหาจริงทั้งเว็บไซต์ (บทเรียน คลังสูตร แบบฝึกหัด และหน้าอ้างอิง)
 *
 * - ดัชนีชั้นแรกมาจาก manifest.json (ชื่อ คำค้น สรุป) ใช้ได้ทันที
 * - ดัชนีชั้นที่สองโหลดเนื้อหา Markdown ทุกไฟล์แล้วค้นในเนื้อหาเต็ม
 * - ภาษาไทยไม่เว้นวรรคระหว่างคำ จึงใช้การจับคำย่อย (substring) ร่วมกับความคล้ายแบบ Trigram
 */
(function (global) {
  "use strict";

  var SYNONYMS = [
    ["ร้าน", "สาขา", "store"],
    ["ยอดขาย", "sales", "net_amount", "net_sales"],
    ["ซ้ำ", "duplicate", "dedup"],
    ["ปีก่อน", "yoy", "year over year", "ปีที่แล้ว"],
    ["เดือนก่อน", "mom", "month over month"],
    ["รายเดือน", "date_trunc", "month"],
    ["รายวัน", "daily", "sale_date"],
    ["ลูกค้า", "customer"],
    ["จัดอันดับ", "อันดับ", "rank", "row_number", "dense_rank"],
    ["รวมตาราง", "หลายตาราง", "join", "เชื่อมตาราง"],
    ["ต่อแถว", "union"],
    ["วันที่", "date"],
    ["ค่าว่าง", "null", "ไม่มีค่า"],
    ["กรอง", "where", "filter"],
    ["สรุป", "group by", "aggregate"],
    ["เรียง", "order by", "sort"],
    ["ไม่มี", "not exists", "anti", "is null"],
    ["เปอร์เซ็นต์", "%", "สัดส่วน", "percent"],
    ["ข้อความ", "string", "text"],
    ["error", "ข้อผิดพลาด", "แก้ error"]
  ];

  var docs = [];
  var fullLoaded = false;
  var loading = null;

  function norm(s) {
    return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function trigrams(s) {
    var t = norm(s).replace(/\s+/g, "");
    var set = {};
    for (var i = 0; i < t.length - 2; i++) set[t.substr(i, 3)] = true;
    return set;
  }

  function dice(a, b) {
    var A = trigrams(a), B = trigrams(b);
    var na = 0, nb = 0, inter = 0, k;
    for (k in A) na++;
    for (k in B) { nb++; if (A[k]) inter++; }
    return na + nb ? (2 * inter) / (na + nb) : 0;
  }

  function expand(term) {
    var out = [term];
    SYNONYMS.forEach(function (group) {
      group.forEach(function (w) {
        if (term.indexOf(w) >= 0 || (w.length > 2 && w.indexOf(term) >= 0 && term.length > 2)) {
          group.forEach(function (x) { if (out.indexOf(x) < 0) out.push(x); });
        }
      });
    });
    return out;
  }

  function init(manifest) {
    docs = [];
    manifest.lessons.forEach(function (l) {
      docs.push({
        type: "lesson", typeLabel: "บทเรียน", id: l.id, url: "#/lesson/" + l.id,
        title: "บทที่ " + l.no + " " + l.title, keywords: (l.keywords || []).join(" "),
        summary: l.summary + " " + (l.objectives || []).join(" "), file: l.file, body: "", level: l.level
      });
    });
    manifest.formulas.forEach(function (f) {
      docs.push({
        type: "formula", typeLabel: "สูตร SQL", id: f.id, url: "#/formula/" + f.id,
        title: f.title, keywords: (f.keywords || []).join(" ") + " " + (f.intents || []).join(" "),
        intents: f.intents || [], summary: f.summary, file: f.file, body: "", level: f.level
      });
    });
    manifest.exerciseSets.forEach(function (x) {
      docs.push({
        type: "exercise", typeLabel: "แบบฝึกหัด", id: x.id, url: "#/exercises/" + x.id,
        title: x.title, keywords: (x.keywords || []).join(" "), summary: x.summary, file: x.file, body: "", level: x.level
      });
    });
    manifest.references.forEach(function (r) {
      docs.push({
        type: "reference", typeLabel: "อ้างอิง", id: r.id, url: "#/reference/" + r.id,
        title: r.title, keywords: (r.keywords || []).join(" "), summary: r.summary, file: r.file, body: ""
      });
    });
  }

  function loadFull(fetchText) {
    if (fullLoaded) return Promise.resolve();
    if (loading) return loading;
    loading = Promise.all(docs.map(function (d) {
      return fetchText(d.file).then(function (txt) {
        d.body = global.Markdown.toPlainText(txt);
      }).catch(function () { d.body = ""; });
    })).then(function () { fullLoaded = true; });
    return loading;
  }

  function score(d, q, terms) {
    var title = norm(d.title), kw = norm(d.keywords), sum = norm(d.summary), body = norm(d.body);
    var s = 0, matched = 0;
    terms.forEach(function (t) {
      var variants = expand(t);
      var best = 0;
      variants.forEach(function (v) {
        var w = v === t ? 1 : 0.6;
        var local = 0;
        if (title.indexOf(v) >= 0) local = Math.max(local, 10 * w);
        if (kw.indexOf(v) >= 0) local = Math.max(local, 8 * w);
        if (sum.indexOf(v) >= 0) local = Math.max(local, 4 * w);
        if (body.indexOf(v) >= 0) {
          var c = body.split(v).length - 1;
          local = Math.max(local, Math.min(3, 1 + c * 0.2) * w);
        }
        best = Math.max(best, local);
      });
      if (best > 0) matched++;
      s += best;
    });
    var sim = dice(q, d.title);
    (d.intents || []).forEach(function (p) { sim = Math.max(sim, dice(q, p)); });
    s += sim * 25;
    if (terms.length > 1 && matched === terms.length) s += 6;
    if (d.type === "formula") s += 1;
    return { score: s, matched: matched };
  }

  function snippet(d, terms) {
    var body = d.body || d.summary || "";
    var lower = body.toLowerCase();
    var pos = -1, hit = "";
    terms.some(function (t) {
      return expand(t).some(function (v) {
        var p = lower.indexOf(v);
        if (p >= 0) { pos = p; hit = v; return true; }
        return false;
      });
    });
    var esc = global.Markdown.esc;
    if (pos < 0) return esc(d.summary || body.slice(0, 160));
    var start = Math.max(0, pos - 70);
    var text = (start > 0 ? "…" : "") + body.slice(start, pos + 110) + (pos + 110 < body.length ? "…" : "");
    var safe = esc(text);
    var hitEsc = esc(hit).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return safe.replace(new RegExp(hitEsc, "ig"), function (m) { return "<mark>" + m + "</mark>"; });
  }

  function search(query, opts) {
    opts = opts || {};
    var q = norm(query);
    if (!q) return [];
    var terms = q.split(" ").filter(Boolean);
    var res = docs
      .filter(function (d) { return !opts.type || d.type === opts.type; })
      .map(function (d) {
        var r = score(d, q, terms);
        return { doc: d, score: r.score, matched: r.matched };
      })
      .filter(function (r) { return r.score >= 6 || r.matched >= Math.max(1, Math.ceil(terms.length / 2)); })
      .sort(function (a, b) { return b.score - a.score; });
    return res.slice(0, opts.limit || 40).map(function (r) {
      return { doc: r.doc, score: r.score, snippet: snippet(r.doc, terms) };
    });
  }

  global.SiteSearch = { init: init, loadFull: loadFull, search: search, isFull: function () { return fullLoaded; } };
})(window);
