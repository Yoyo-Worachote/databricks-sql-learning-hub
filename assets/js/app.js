/*
 * app.js - Databricks SQL Learning Hub (Single Page App แบบไม่ต้อง Build)
 *
 * เส้นทาง (Hash Routing ทำให้ Refresh และเปิดลิงก์ตรงได้บน Static Hosting ทุกแบบ):
 *   #/                      หน้าแรก
 *   #/lessons               เส้นทางการเรียนทั้งหมด
 *   #/lesson/<id>?s=<n>     บทเรียนแบบสไลด์ (s = ลำดับสไลด์เริ่มที่ 1), ?view=all ดูทั้งบท
 *   #/formulas?q=&cat=      คลังสูตร SQL
 *   #/formula/<id>          รายละเอียดสูตร
 *   #/exercises             รายการชุดแบบฝึกหัด
 *   #/exercises/<id>        ชุดแบบฝึกหัด
 *   #/reference/<id>        หน้าอ้างอิง (ชุดข้อมูล คำศัพท์ ฯลฯ)
 *   #/search?q=             ค้นหาทั้งเว็บไซต์
 */
(function () {
  "use strict";

  var M = window.Markdown;
  var esc = M.esc;
  var app = document.getElementById("app");
  var manifest = null;
  var textCache = {};
  var STORE_KEY = "dsh-progress-v1";

  /* ---------------- ยูทิลิตี ---------------- */

  function fetchText(path) {
    if (textCache[path]) return Promise.resolve(textCache[path]);
    return fetch(path, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error("โหลดไฟล์ไม่สำเร็จ: " + path + " (" + r.status + ")");
      return r.text();
    }).then(function (t) {
      textCache[path] = t;
      return t;
    });
  }

  function parseHash() {
    var h = location.hash.replace(/^#/, "") || "/";
    var qi = h.indexOf("?");
    var path = qi >= 0 ? h.slice(0, qi) : h;
    var params = {};
    if (qi >= 0) {
      h.slice(qi + 1).split("&").forEach(function (kv) {
        if (!kv) return;
        var p = kv.split("=");
        params[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || "").replace(/\+/g, " "));
      });
    }
    var parts = path.split("/").filter(Boolean);
    return { parts: parts, params: params, path: path };
  }

  function qs(params) {
    var arr = [];
    Object.keys(params).forEach(function (k) {
      if (params[k] !== undefined && params[k] !== "" && params[k] !== null) {
        arr.push(encodeURIComponent(k) + "=" + encodeURIComponent(params[k]));
      }
    });
    return arr.length ? "?" + arr.join("&") : "";
  }

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function levelInfo(id) {
    return byId(manifest.levels, id) || { id: id, name: id, th: id };
  }

  function levelBadge(id) {
    var lv = levelInfo(id);
    return '<span class="badge level-' + esc(id) + '">' + esc(lv.name) + " · " + esc(lv.th) + "</span>";
  }

  function catInfo(id) {
    return byId(manifest.formulaCategories, id) || { id: id, name: id };
  }

  function setTitle(t) {
    document.title = t ? t + " | " + manifest.site.title : manifest.site.title;
  }

  function loadProgress() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      var p = raw ? JSON.parse(raw) : null;
      return p && p.lessons ? p : { lessons: {} };
    } catch (e) {
      return { lessons: {}, unavailable: true };
    }
  }

  function saveProgress(p) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(p));
      return true;
    } catch (e) {
      return false;
    }
  }

  function isDone(id) {
    return !!loadProgress().lessons[id];
  }

  function focusMain() {
    var h1 = app.querySelector("h1");
    if (h1) {
      h1.setAttribute("tabindex", "-1");
      h1.focus({ preventScroll: true });
    }
  }

  function setActiveNav(section) {
    document.querySelectorAll(".site-nav a").forEach(function (a) {
      if (a.getAttribute("data-nav") === section) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  function errorView(msg) {
    app.innerHTML = '<div class="page narrow"><h1>ไม่พบหน้าที่ต้องการ</h1><p>' + esc(msg) +
      '</p><p><a class="btn" href="#/">กลับหน้าแรก</a> <a class="btn btn-ghost" href="#/search">ค้นหาเนื้อหา</a></p></div>';
    setTitle("ไม่พบหน้า");
    focusMain();
  }

  function enhance(root) {
    root.querySelectorAll("a[href^='#/']").forEach(function (a) {
      var href = a.getAttribute("href");
      var m = href.match(/^#\/(lesson|formula|exercises|reference)\/([\w-]+)/);
      if (!m) return;
      var list = { lesson: manifest.lessons, formula: manifest.formulas, exercises: manifest.exerciseSets, reference: manifest.references }[m[1]];
      if (!byId(list, m[2])) {
        a.classList.add("broken-link");
        a.setAttribute("title", "ลิงก์นี้ยังไม่มีปลายทาง");
        if (window.console) console.warn("ลิงก์เสีย:", href);
      }
    });
  }

  /* ---------------- ส่วนประกอบหน้า ---------------- */

  function lessonCard(l) {
    var done = isDone(l.id);
    return '<a class="card lesson-card' + (done ? " is-done" : "") + '" href="#/lesson/' + esc(l.id) + '">' +
      '<span class="lesson-no" aria-hidden="true">' + l.no + "</span>" +
      '<span class="card-body"><span class="card-title">' + esc(l.title) + "</span>" +
      '<span class="card-text">' + esc(l.summary) + "</span>" +
      '<span class="card-meta">' + (done ? '<span class="done-mark">✓ เรียนแล้ว</span>' : "") + "ประมาณ " + l.minutes + " นาที</span></span></a>";
  }

  function formulaCard(f) {
    var c = catInfo(f.category);
    return '<a class="card formula-card" href="#/formula/' + esc(f.id) + '">' +
      '<span class="card-kicker">' + esc(c.name) + "</span>" +
      '<span class="card-title">' + esc(f.title) + "</span>" +
      '<span class="card-text">' + esc(f.summary) + "</span>" +
      '<span class="card-meta">' + levelBadge(f.level) + "</span></a>";
  }

  function progressSummary() {
    var p = loadProgress();
    var total = manifest.lessons.length;
    var done = manifest.lessons.filter(function (l) { return p.lessons[l.id]; }).length;
    var pct = total ? Math.round((done * 100) / total) : 0;
    var byLevel = manifest.levels.map(function (lv) {
      var ls = manifest.lessons.filter(function (l) { return l.level === lv.id; });
      var d = ls.filter(function (l) { return p.lessons[l.id]; }).length;
      return '<li><span>' + esc(lv.name) + " · " + esc(lv.th) + "</span><strong>" + d + "/" + ls.length + "</strong></li>";
    }).join("");
    var next = manifest.lessons.filter(function (l) { return !p.lessons[l.id]; })[0];
    return '<section class="panel progress-panel" aria-labelledby="progress-h">' +
      '<h2 id="progress-h">ความคืบหน้าของคุณ</h2>' +
      '<div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct +
      '" aria-label="เรียนจบแล้ว ' + pct + ' เปอร์เซ็นต์"><span style="width:' + pct + '%"></span></div>' +
      "<p><strong>" + done + "</strong> จาก " + total + " บท (" + pct + "%)</p>" +
      '<ul class="level-progress">' + byLevel + "</ul>" +
      (next ? '<p><a class="btn" href="#/lesson/' + esc(next.id) + '">เรียนต่อ: บทที่ ' + next.no + " " + esc(next.title) + "</a></p>" : "<p>เยี่ยมมาก! คุณเรียนครบทุกบทแล้ว</p>") +
      '<p class="fine-print">' + (p.unavailable ? "เบราว์เซอร์นี้ไม่อนุญาตให้บันทึกข้อมูล จึงจำความคืบหน้าไม่ได้ " : "") +
      "ความคืบหน้าบันทึกไว้ในเบราว์เซอร์เครื่องนี้เท่านั้น (localStorage) ไม่ส่งไปที่ใด ถ้าเปลี่ยนเครื่อง ใช้โหมดไม่ระบุตัวตน หรือล้างข้อมูลเบราว์เซอร์ ความคืบหน้าจะหายไป" +
      (done ? ' <button type="button" class="link-btn" data-reset-progress>ล้างความคืบหน้า</button>' : "") + "</p></section>";
  }

  /* ---------------- หน้าแรก ---------------- */

  function homeView() {
    setActiveNav("home");
    setTitle("");
    var levels = manifest.levels.map(function (lv) {
      var ls = manifest.lessons.filter(function (l) { return l.level === lv.id; });
      return '<li class="path-step level-' + esc(lv.id) + '"><a href="#/lessons#level-' + esc(lv.id) + '">' +
        '<span class="path-name">' + esc(lv.name) + '</span><span class="path-th">' + esc(lv.th) + "</span>" +
        '<span class="path-desc">' + esc(lv.desc) + '</span><span class="path-count">' + ls.length + " บท · บทที่ " +
        ls[0].no + "–" + ls[ls.length - 1].no + "</span></a></li>";
    }).join("");
    var cats = manifest.formulaCategories.map(function (c) {
      var n = manifest.formulas.filter(function (f) { return f.category === c.id; }).length;
      return '<li><a class="chip" href="#/formulas' + qs({ cat: c.id }) + '">' + esc(c.name) + ' <span class="chip-count">' + n + "</span></a></li>";
    }).join("");
    var intents = manifest.site.exampleSearches.map(function (s) {
      return '<li><a class="chip chip-soft" href="#/search' + qs({ q: s }) + '">' + esc(s) + "</a></li>";
    }).join("");
    var stats = '<ul class="stats"><li><strong>' + manifest.lessons.length + "</strong> บทเรียน</li><li><strong>" +
      manifest.formulas.length + "</strong> สูตร SQL</li><li><strong>" + manifest.site.exerciseCount +
      "</strong> แบบฝึกหัดพร้อมเฉลย</li></ul>";

    app.innerHTML =
      '<div class="page home">' +
      '<section class="hero"><p class="eyebrow">Databricks SQL · ภาษาไทย · เริ่มจากศูนย์</p>' +
      "<h1>" + esc(manifest.site.title) + "</h1>" +
      '<p class="lead">' + esc(manifest.site.description) + "</p>" + stats +
      '<form class="hero-search" role="search" data-search-form><label for="hero-q" class="sr-only">ค้นหาสูตรหรือบทเรียน</label>' +
      '<input id="hero-q" name="q" type="search" placeholder="อยากทำอะไร เช่น หาสินค้า Top 3 ของแต่ละร้าน" autocomplete="off">' +
      '<button class="btn" type="submit">ค้นหา</button></form>' +
      '<ul class="chips" aria-label="ตัวอย่างคำค้น">' + intents + "</ul>" +
      '<p class="hero-actions"><a class="btn" href="#/lesson/' + esc(manifest.lessons[0].id) + '">เริ่มเรียนบทที่ 1</a> ' +
      '<a class="btn btn-ghost" href="#/formulas">เปิดคลังสูตร SQL</a></p></section>' +
      '<div class="home-grid"><section aria-labelledby="path-h"><h2 id="path-h">เส้นทางการเรียน: Beginner → Workplace</h2>' +
      "<p>เรียงจากพื้นฐานไปหางานจริง ทุกบทใช้ชุดข้อมูลร้านค้าปลีกจำลองชุดเดียวกัน จึงต่อยอดความรู้ได้ต่อเนื่อง</p>" +
      '<ol class="path">' + levels + "</ol></section>" + progressSummary() + "</div>" +
      '<section aria-labelledby="cat-h"><h2 id="cat-h">คลังสูตร SQL ตามหมวด</h2><p>ค้นหาสูตรจากชื่อคำสั่ง หรือจากสิ่งที่อยากทำ ทุกสูตรมี Query ฉบับเต็ม ข้อมูลตัวอย่าง และผลลัพธ์</p>' +
      '<ul class="chips">' + cats + "</ul></section>" +
      '<section class="home-cards" aria-label="ทางลัด"><a class="card" href="#/reference/dataset"><span class="card-title">ชุดข้อมูลฝึก</span><span class="card-text">โครงสร้างตาราง ข้อมูลตัวอย่าง และไฟล์ SQL สำหรับสร้างตารางใน Databricks</span></a>' +
      '<a class="card" href="#/exercises"><span class="card-title">แบบฝึกหัดและ Workshop</span><span class="card-text">แบบฝึกหัด 3 ระดับทุกบท และโจทย์งานจริง 10 ข้อ พร้อมเฉลยและเหตุผล</span></a>' +
      '<a class="card" href="#/lesson/logical-query-order"><span class="card-title">ลำดับการทำงานของ SQL</span><span class="card-text">เข้าใจว่าทำไม WHERE ใช้ SUM ไม่ได้ และทำไมต้องกรองอันดับในชั้นนอก</span></a>' +
      '<a class="card" href="#/reference/about"><span class="card-title">เกี่ยวกับหลักสูตรนี้</span><span class="card-text">แหล่งที่มาของเนื้อหา สิ่งที่ปรับปรุง และข้อจำกัดที่ควรรู้</span></a></section>' +
      "</div>";
    focusMain();
  }

  /* ---------------- รายการบทเรียน ---------------- */

  function lessonsView() {
    setActiveNav("lessons");
    setTitle("บทเรียนทั้งหมด");
    var html = manifest.levels.map(function (lv) {
      var ls = manifest.lessons.filter(function (l) { return l.level === lv.id; });
      return '<section class="level-section" id="level-' + esc(lv.id) + '" aria-labelledby="h-' + esc(lv.id) + '">' +
        '<h2 id="h-' + esc(lv.id) + '">' + levelBadge(lv.id) + " " + esc(lv.title) + "</h2><p>" + esc(lv.desc) + "</p>" +
        '<div class="card-list">' + ls.map(lessonCard).join("") + "</div></section>";
    }).join("");
    app.innerHTML = '<div class="page"><h1>เส้นทางการเรียน</h1><p class="lead">เรียนตามลำดับเพื่อให้มีพื้นฐานครบก่อนเรื่องที่ยากขึ้น แต่ละบทแบ่งเป็นสไลด์สั้น ๆ และกดดูทั้งบทในหน้าเดียวได้</p>' + html + "</div>";
    var anchor = location.hash.split("#")[2];
    if (anchor) {
      var el = document.getElementById(anchor);
      if (el) el.scrollIntoView();
    }
    focusMain();
  }

  /* ---------------- บทเรียน (สไลด์) ---------------- */

  function splitSections(container) {
    var sections = [];
    var current = { title: "ภาพรวม", nodes: [] };
    Array.prototype.slice.call(container.childNodes).forEach(function (node) {
      if (node.nodeType === 1 && node.tagName === "H2") {
        if (current.nodes.length || sections.length) sections.push(current);
        current = { title: node.textContent, id: node.id, nodes: [node] };
      } else {
        current.nodes.push(node);
      }
    });
    sections.push(current);
    return sections.filter(function (s) {
      return s.nodes.some(function (n) { return n.nodeType === 1 || (n.textContent || "").trim(); });
    });
  }

  function lessonView(id, params) {
    var lesson = byId(manifest.lessons, id);
    if (!lesson) return errorView("ไม่พบบทเรียนนี้ อาจเปลี่ยนชื่อหรือถูกย้ายแล้ว");
    setActiveNav("lessons");
    setTitle("บทที่ " + lesson.no + " " + lesson.title);
    var idx = manifest.lessons.indexOf(lesson);
    var prev = manifest.lessons[idx - 1];
    var next = manifest.lessons[idx + 1];
    var viewAll = params.view === "all";

    fetchText(lesson.file).then(function (src) {
      var r = M.render(src);
      var tmp = document.createElement("div");
      tmp.innerHTML = r.html;
      var sections = splitSections(tmp);
      var total = sections.length + 1;
      var s = Math.min(Math.max(parseInt(params.s || "1", 10) || 1, 1), total);

      var outline = manifest.lessons.map(function (l) {
        return '<li><a href="#/lesson/' + esc(l.id) + '"' + (l.id === id ? ' aria-current="page"' : "") + ">" +
          '<span class="ol-no">' + l.no + "</span> " + esc(l.title) + (isDone(l.id) ? ' <span class="done-dot" aria-label="เรียนแล้ว">✓</span>' : "") + "</a></li>";
      }).join("");

      var slideToc = ['<li><a href="#/lesson/' + esc(id) + qs({ s: 1, view: viewAll ? "all" : "" }) + '"' + (s === 1 && !viewAll ? ' aria-current="step"' : "") + ">1. เป้าหมายของบท</a></li>"]
        .concat(sections.map(function (sec, k) {
          var n = k + 2;
          var href = viewAll ? "#/lesson/" + id + qs({ view: "all" }) + "&sec=" + encodeURIComponent(sec.id || "") : "#/lesson/" + id + qs({ s: n });
          return '<li><a href="' + esc(href) + '"' + (n === s && !viewAll ? ' aria-current="step"' : "") + ">" + n + ". " + esc(sec.title) + "</a></li>";
        })).join("");

      var objectives = '<section class="slide slide-intro" aria-label="เป้าหมายของบท">' +
        '<h2 id="objectives">เป้าหมายของบท</h2><p class="lead">' + esc(lesson.summary) + "</p>" +
        "<h3>หลังจบบทนี้ คุณจะทำได้</h3><ul>" + lesson.objectives.map(function (o) { return "<li>" + M.inline(o) + "</li>"; }).join("") + "</ul>" +
        (lesson.prereq && lesson.prereq.length ? "<h3>ควรเรียนก่อน</h3><ul>" + lesson.prereq.map(function (pid) {
          var pl = byId(manifest.lessons, pid);
          return pl ? '<li><a href="#/lesson/' + esc(pl.id) + '">บทที่ ' + pl.no + " " + esc(pl.title) + "</a></li>" : "";
        }).join("") + "</ul>" : "") +
        (lesson.source ? '<p class="fine-print">อ้างอิงจากเอกสารเดิม: ' + esc(lesson.source) + "</p>" : "") +
        (lesson.formulas && lesson.formulas.length ? "<h3>สูตรที่เกี่ยวข้องในคลังสูตร</h3><ul class=\"chips\">" + lesson.formulas.map(function (fid) {
          var f = byId(manifest.formulas, fid);
          return f ? '<li><a class="chip" href="#/formula/' + esc(f.id) + '">' + esc(f.title) + "</a></li>" : "";
        }).join("") + "</ul>" : "") + "</section>";

      var done = isDone(id);
      app.innerHTML =
        '<div class="page lesson-layout">' +
        '<aside class="course-outline" aria-label="สารบัญบทเรียนทั้งหมด"><details class="outline-details" ' + (window.innerWidth > 1100 ? "open" : "") + '><summary>สารบัญบทเรียน (' + manifest.lessons.length + ' บท)</summary><ol>' + outline + "</ol></details></aside>" +
        '<article class="lesson" aria-labelledby="lesson-title">' +
        '<nav class="breadcrumb" aria-label="ตำแหน่งปัจจุบัน"><a href="#/lessons">บทเรียน</a> › ' + esc(levelInfo(lesson.level).name) + "</nav>" +
        '<header class="lesson-head"><p class="eyebrow">บทที่ ' + lesson.no + " · " + levelBadge(lesson.level) + " · ประมาณ " + lesson.minutes + " นาที</p>" +
        '<h1 id="lesson-title">' + esc(lesson.title) + "</h1>" +
        '<div class="view-toggle" role="group" aria-label="รูปแบบการแสดงผล">' +
        '<a class="seg' + (!viewAll ? " is-active" : "") + '" href="#/lesson/' + esc(id) + qs({ s: viewAll ? 1 : s }) + '"' + (!viewAll ? ' aria-current="true"' : "") + ">แบบสไลด์</a>" +
        '<a class="seg' + (viewAll ? " is-active" : "") + '" href="#/lesson/' + esc(id) + qs({ view: "all" }) + '"' + (viewAll ? ' aria-current="true"' : "") + ">ดูทั้งบท</a></div></header>" +
        '<details class="slide-toc"><summary>หัวข้อในบทนี้ (' + total + " หัวข้อ)</summary><ol>" + slideToc + "</ol></details>" +
        (viewAll ? "" : '<p class="slide-counter" aria-live="polite">หัวข้อ ' + s + " / " + total + "</p>") +
        '<div class="slides" id="slides"></div>' +
        (viewAll ? "" : '<nav class="slide-nav" aria-label="เลื่อนสไลด์">' +
          (s > 1 ? '<a class="btn btn-ghost" href="#/lesson/' + esc(id) + qs({ s: s - 1 }) + '" data-key="prev">← หัวข้อก่อนหน้า</a>' : "<span></span>") +
          (s < total ? '<a class="btn" href="#/lesson/' + esc(id) + qs({ s: s + 1 }) + '" data-key="next">หัวข้อถัดไป →</a>' :
            (next ? '<a class="btn" href="#/lesson/' + esc(next.id) + '" data-key="next">ไปบทถัดไป →</a>' : "<span></span>")) + "</nav>") +
        '<footer class="lesson-foot"><button type="button" class="btn ' + (done ? "btn-ghost" : "") + '" data-toggle-done="' + esc(id) + '" aria-pressed="' + done + '">' +
        (done ? "✓ เรียนบทนี้แล้ว (กดเพื่อยกเลิก)" : "ทำเครื่องหมายว่าเรียนจบบทนี้") + "</button>" +
        '<nav class="pager" aria-label="บทก่อนหน้าและบทถัดไป">' +
        (prev ? '<a class="pager-link" href="#/lesson/' + esc(prev.id) + '"><span>← บทก่อนหน้า</span><strong>บทที่ ' + prev.no + " " + esc(prev.title) + "</strong></a>" : "<span></span>") +
        (next ? '<a class="pager-link next" href="#/lesson/' + esc(next.id) + '"><span>บทถัดไป →</span><strong>บทที่ ' + next.no + " " + esc(next.title) + "</strong></a>" : "<span></span>") +
        "</nav></footer></article></div>";

      var holder = document.getElementById("slides");
      if (viewAll) {
        holder.insertAdjacentHTML("beforeend", objectives);
        sections.forEach(function (sec) {
          var wrap = document.createElement("section");
          wrap.className = "slide";
          sec.nodes.forEach(function (n) { wrap.appendChild(n); });
          holder.appendChild(wrap);
        });
        if (params.sec) {
          var target = document.getElementById(params.sec);
          if (target) { target.scrollIntoView(); target.focus({ preventScroll: true }); return; }
        }
      } else if (s === 1) {
        holder.insertAdjacentHTML("beforeend", objectives);
      } else {
        var sec = sections[s - 2];
        var wrap = document.createElement("section");
        wrap.className = "slide";
        sec.nodes.forEach(function (n) { wrap.appendChild(n); });
        holder.appendChild(wrap);
      }
      enhance(app);
      focusMain();
    }).catch(function (e) { errorView(e.message); });
  }

  /* ---------------- คลังสูตร ---------------- */

  function formulasView(params) {
    setActiveNav("formulas");
    setTitle("คลังสูตร SQL");
    var cat = params.cat || "";
    var lvl = params.level || "";
    var q = params.q || "";
    var chips = '<li><a class="chip' + (!cat ? " is-active" : "") + '" href="#/formulas' + qs({ q: q, level: lvl }) + '"' + (!cat ? ' aria-current="true"' : "") + ">ทุกหมวด</a></li>" +
      manifest.formulaCategories.map(function (c) {
        var on = c.id === cat;
        return '<li><a class="chip' + (on ? " is-active" : "") + '" href="#/formulas' + qs({ q: q, cat: c.id, level: lvl }) + '"' + (on ? ' aria-current="true"' : "") + ">" + esc(c.name) + "</a></li>";
      }).join("");
    var lvChips = '<li><a class="chip chip-soft' + (!lvl ? " is-active" : "") + '" href="#/formulas' + qs({ q: q, cat: cat }) + '">ทุกระดับ</a></li>' +
      manifest.levels.map(function (lv) {
        var on = lv.id === lvl;
        return '<li><a class="chip chip-soft' + (on ? " is-active" : "") + '" href="#/formulas' + qs({ q: q, cat: cat, level: lv.id }) + '">' + esc(lv.name) + "</a></li>";
      }).join("");

    app.innerHTML = '<div class="page"><h1>คลังสูตร SQL</h1>' +
      '<p class="lead">ค้นหาได้ทั้งจากชื่อสูตร คำสั่ง SQL หรือสิ่งที่อยากทำ เช่น "หาข้อมูลซ้ำ" หรือ "เปรียบเทียบยอดขายกับปีก่อน"</p>' +
      '<form class="filter-bar" role="search" data-formula-form><label for="fq" class="sr-only">ค้นหาสูตร</label>' +
      '<input id="fq" type="search" name="q" value="' + esc(q) + '" placeholder="พิมพ์คำค้น เช่น ROW_NUMBER, ยอดขายรายเดือน, ลูกค้าที่ไม่มีรายการสั่งซื้อ" autocomplete="off">' +
      '<button class="btn" type="submit">ค้นหา</button></form>' +
      '<nav aria-label="กรองตามหมวด"><ul class="chips">' + chips + "</ul></nav>" +
      '<nav aria-label="กรองตามระดับ"><ul class="chips">' + lvChips + "</ul></nav>" +
      '<p class="result-count" id="fcount" aria-live="polite"></p><div class="card-grid" id="flist"></div></div>';

    function draw() {
      var list;
      if (q) {
        list = window.SiteSearch.search(q, { type: "formula", limit: 100 }).map(function (r) { return byId(manifest.formulas, r.doc.id); });
      } else {
        list = manifest.formulas.slice();
      }
      list = list.filter(function (f) { return f && (!cat || f.category === cat) && (!lvl || f.level === lvl); });
      document.getElementById("fcount").textContent = list.length ? "พบ " + list.length + " สูตร" + (q ? " ที่เกี่ยวกับ \"" + q + "\"" : "") : "ไม่พบสูตรที่ตรงกับเงื่อนไข ลองใช้คำอื่น หรือดูผลการค้นหาทั้งเว็บไซต์";
      var grid = document.getElementById("flist");
      if (!cat && !q && !lvl) {
        grid.className = "";
        grid.innerHTML = manifest.formulaCategories.map(function (c) {
          var fs = list.filter(function (f) { return f.category === c.id; });
          if (!fs.length) return "";
          return '<section class="cat-section" aria-labelledby="cat-' + esc(c.id) + '"><h2 id="cat-' + esc(c.id) + '">' + esc(c.name) + "</h2><p>" + esc(c.desc) + '</p><div class="card-grid">' + fs.map(formulaCard).join("") + "</div></section>";
        }).join("");
      } else {
        grid.className = "card-grid";
        grid.innerHTML = list.map(formulaCard).join("") +
          (!list.length && q ? '<p><a class="btn btn-ghost" href="#/search' + qs({ q: q }) + '">ค้นหา "' + esc(q) + '" ในบทเรียนและแบบฝึกหัด</a></p>' : "");
      }
    }
    draw();
    if (q && !window.SiteSearch.isFull()) window.SiteSearch.loadFull(fetchText).then(draw);
    focusMain();
  }

  function formulaView(id) {
    var f = byId(manifest.formulas, id);
    if (!f) return errorView("ไม่พบสูตรนี้ในคลังสูตร");
    setActiveNav("formulas");
    setTitle(f.title);
    fetchText(f.file).then(function (src) {
      var r = M.render(src);
      var c = catInfo(f.category);
      var related = (f.related || []).map(function (rid) {
        var rf = byId(manifest.formulas, rid);
        return rf ? formulaCard(rf) : "";
      }).join("");
      var lessons = manifest.lessons.filter(function (l) { return (l.formulas || []).indexOf(f.id) >= 0; }).map(function (l) {
        return '<li><a href="#/lesson/' + esc(l.id) + '">บทที่ ' + l.no + " " + esc(l.title) + "</a></li>";
      }).join("");
      var toc = r.headings.filter(function (h) { return h.level === 2; }).map(function (h) {
        return '<li><a href="#/formula/' + esc(id) + "?sec=" + esc(h.id) + '">' + M.inline(h.text) + "</a></li>";
      }).join("");
      app.innerHTML = '<div class="page doc-layout"><article class="doc" aria-labelledby="f-title">' +
        '<nav class="breadcrumb" aria-label="ตำแหน่งปัจจุบัน"><a href="#/formulas">คลังสูตร SQL</a> › <a href="#/formulas' + qs({ cat: c.id }) + '">' + esc(c.name) + "</a></nav>" +
        '<header><p class="eyebrow">' + esc(c.name) + " · " + levelBadge(f.level) + '</p><h1 id="f-title">' + esc(f.title) + '</h1><p class="lead">' + esc(f.summary) + "</p></header>" +
        '<div class="doc-body">' + r.html + "</div>" +
        (related ? '<section class="related" aria-labelledby="rel-h"><h2 id="rel-h">สูตรที่เกี่ยวข้อง</h2><div class="card-grid">' + related + "</div></section>" : "") +
        (lessons ? '<section class="related"><h2>บทเรียนที่ใช้สูตรนี้</h2><ul>' + lessons + "</ul></section>" : "") +
        '</article><aside class="doc-toc" aria-label="หัวข้อในหน้านี้"><details open><summary>หัวข้อในหน้านี้</summary><ol>' + toc + "</ol></details></aside></div>";
      enhance(app);
      var sec = parseHash().params.sec;
      var t = sec && document.getElementById(sec);
      if (t) { t.scrollIntoView(); t.focus({ preventScroll: true }); } else focusMain();
    }).catch(function (e) { errorView(e.message); });
  }

  /* ---------------- แบบฝึกหัดและหน้าอ้างอิง ---------------- */

  function exercisesView() {
    setActiveNav("exercises");
    setTitle("แบบฝึกหัด");
    var html = manifest.levels.map(function (lv) {
      var xs = manifest.exerciseSets.filter(function (x) { return x.level === lv.id; });
      if (!xs.length) return "";
      return '<section aria-labelledby="x-' + esc(lv.id) + '"><h2 id="x-' + esc(lv.id) + '">' + levelBadge(lv.id) + "</h2>" +
        '<div class="card-grid">' + xs.map(function (x) {
          return '<a class="card" href="#/exercises/' + esc(x.id) + '"><span class="card-title">' + esc(x.title) + '</span><span class="card-text">' + esc(x.summary) + '</span><span class="card-meta">' + x.count + " ข้อ</span></a>";
        }).join("") + "</div></section>";
    }).join("");
    app.innerHTML = '<div class="page"><h1>แบบฝึกหัดและโจทย์งานจริง</h1>' +
      '<p class="lead">ลองเขียนเองก่อน แล้วค่อยกดดูเฉลย คำตอบที่เขียนต่างจากเฉลยแต่ได้ผลลัพธ์เหมือนกันถือว่าถูก เพราะ SQL เขียนได้หลายแบบ</p>' +
      '<aside class="callout callout-note"><div class="callout-title">วิธีฝึกกับข้อมูลจริง</div><p>สร้างชุดข้อมูลฝึกใน Databricks ตาม <a href="#/reference/dataset">หน้าชุดข้อมูลฝึก</a> แล้วเปิด SQL Editor เลือก SQL Warehouse และ Schema <code>sql_training</code> ก่อนเริ่มทำ</p></aside>' +
      html + "</div>";
    focusMain();
  }

  function docView(kind, id) {
    var list = kind === "exercises" ? manifest.exerciseSets : manifest.references;
    var item = byId(list, id);
    if (!item) return errorView("ไม่พบหน้านี้");
    setActiveNav(kind === "exercises" ? "exercises" : "reference");
    setTitle(item.title);
    fetchText(item.file).then(function (src) {
      var r = M.render(src);
      var toc = r.headings.filter(function (h) { return h.level === 2; }).map(function (h) {
        return '<li><a href="#/' + kind + "/" + esc(id) + "?sec=" + esc(h.id) + '">' + M.inline(h.text) + "</a></li>";
      }).join("");
      var crumbs = kind === "exercises" ? '<a href="#/exercises">แบบฝึกหัด</a>' : '<a href="#/reference/about">อ้างอิง</a>';
      var extra = "";
      if (kind === "exercises" && item.lesson) {
        var l = byId(manifest.lessons, item.lesson);
        if (l) extra = '<p>ทบทวนเนื้อหา: <a href="#/lesson/' + esc(l.id) + '">บทที่ ' + l.no + " " + esc(l.title) + "</a></p>";
      }
      app.innerHTML = '<div class="page doc-layout"><article class="doc" aria-labelledby="d-title"><nav class="breadcrumb" aria-label="ตำแหน่งปัจจุบัน">' + crumbs + "</nav>" +
        '<header>' + (item.level ? '<p class="eyebrow">' + levelBadge(item.level) + "</p>" : "") + '<h1 id="d-title">' + esc(item.title) + '</h1><p class="lead">' + esc(item.summary) + "</p>" + extra +
        (kind === "exercises" ? '<p><button type="button" class="btn btn-ghost btn-sm" data-expand-all>เปิดเฉลยทั้งหมด</button> <button type="button" class="btn btn-ghost btn-sm" data-collapse-all>ปิดเฉลยทั้งหมด</button></p>' : "") +
        '</header><div class="doc-body">' + r.html + "</div></article>" +
        (toc ? '<aside class="doc-toc" aria-label="หัวข้อในหน้านี้"><details open><summary>หัวข้อในหน้านี้</summary><ol>' + toc + "</ol></details></aside>" : "") + "</div>";
      enhance(app);
      var sec = parseHash().params.sec;
      var t = sec && document.getElementById(sec);
      if (t) { t.scrollIntoView(); t.focus({ preventScroll: true }); } else focusMain();
    }).catch(function (e) { errorView(e.message); });
  }

  /* ---------------- ค้นหา ---------------- */

  function searchView(params) {
    setActiveNav("");
    var q = params.q || "";
    setTitle(q ? "ค้นหา: " + q : "ค้นหา");
    app.innerHTML = '<div class="page narrow"><h1>ค้นหาทั้งเว็บไซต์</h1>' +
      '<form class="filter-bar" role="search" data-search-form><label for="sq" class="sr-only">คำค้น</label>' +
      '<input id="sq" type="search" name="q" value="' + esc(q) + '" placeholder="เช่น หาข้อมูลซ้ำ, LEFT JOIN, คำนวณยอดขายรายเดือน" autocomplete="off">' +
      '<button class="btn" type="submit">ค้นหา</button></form><p id="scount" class="result-count" aria-live="polite"></p><ol class="search-results" id="sres"></ol>' +
      (q ? "" : '<h2>ลองค้นหา</h2><ul class="chips">' + manifest.site.exampleSearches.map(function (s) {
        return '<li><a class="chip chip-soft" href="#/search' + qs({ q: s }) + '">' + esc(s) + "</a></li>";
      }).join("") + "</ul>") + "</div>";

    function draw() {
      if (!q) return;
      var res = window.SiteSearch.search(q, { limit: 40 });
      document.getElementById("scount").textContent = (res.length ? "พบ " + res.length + " รายการ" : "ไม่พบผลลัพธ์ ลองใช้คำที่สั้นลง หรือชื่อคำสั่ง SQL เช่น JOIN, GROUP BY") +
        (window.SiteSearch.isFull() ? "" : " (กำลังโหลดเนื้อหาทั้งหมดเพื่อค้นหาละเอียดขึ้น…)");
      document.getElementById("sres").innerHTML = res.map(function (r) {
        return '<li><a href="' + esc(r.doc.url) + '"><span class="badge type-' + r.doc.type + '">' + esc(r.doc.typeLabel) + "</span> <strong>" + esc(r.doc.title) + "</strong></a><p>" + r.snippet + "</p></li>";
      }).join("");
    }
    draw();
    if (!window.SiteSearch.isFull()) window.SiteSearch.loadFull(fetchText).then(draw);
    if (!q) document.getElementById("sq").focus(); else focusMain();
  }

  /* ---------------- Router ---------------- */

  function route() {
    var h = parseHash();
    var p = h.parts;
    window.scrollTo(0, 0);
    closeMenu();
    if (!p.length) return homeView();
    switch (p[0]) {
      case "lessons": return lessonsView();
      case "lesson": return lessonView(p[1], h.params);
      case "formulas": return formulasView(h.params);
      case "formula": return formulaView(p[1]);
      case "exercises": return p[1] ? docView("exercises", p[1]) : exercisesView();
      case "reference": return docView("reference", p[1] || "about");
      case "search": return searchView(h.params);
      default: return errorView("ไม่พบหน้าที่ระบุในลิงก์");
    }
  }

  /* ---------------- เหตุการณ์ทั่วไป ---------------- */

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () { return legacyCopy(text); });
    }
    return legacyCopy(text);
  }

  function legacyCopy(text) {
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error("copy failed"));
    });
  }

  function announce(msg) {
    var live = document.getElementById("live");
    live.textContent = "";
    setTimeout(function () { live.textContent = msg; }, 30);
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-copy]");
    if (btn) {
      var code = btn.closest(".code-block").querySelector("code").textContent;
      copyText(code).then(function () {
        btn.textContent = "คัดลอกแล้ว ✓";
        btn.classList.add("is-done");
        announce("คัดลอกโค้ดแล้ว");
      }, function () {
        btn.textContent = "คัดลอกไม่สำเร็จ";
        var range = document.createRange();
        range.selectNodeContents(btn.closest(".code-block").querySelector("code"));
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        announce("คัดลอกอัตโนมัติไม่ได้ เลือกโค้ดไว้ให้แล้ว กด Ctrl+C เพื่อคัดลอก");
      });
      setTimeout(function () { btn.textContent = "คัดลอก"; btn.classList.remove("is-done"); }, 2200);
      return;
    }
    var done = e.target.closest("[data-toggle-done]");
    if (done) {
      var id = done.getAttribute("data-toggle-done");
      var p = loadProgress();
      if (p.lessons[id]) delete p.lessons[id]; else p.lessons[id] = Date.now();
      var ok = saveProgress(p);
      announce(ok ? (p.lessons[id] ? "บันทึกว่าเรียนจบบทนี้แล้ว" : "ยกเลิกเครื่องหมายแล้ว") : "เบราว์เซอร์นี้บันทึกความคืบหน้าไม่ได้");
      route();
      return;
    }
    if (e.target.closest("[data-reset-progress]")) {
      if (confirm("ล้างความคืบหน้าการเรียนทั้งหมดในเบราว์เซอร์นี้?")) {
        saveProgress({ lessons: {} });
        route();
      }
      return;
    }
    if (e.target.closest("[data-expand-all]")) {
      app.querySelectorAll("details.reveal").forEach(function (d) { d.open = true; });
      return;
    }
    if (e.target.closest("[data-collapse-all]")) {
      app.querySelectorAll("details.reveal").forEach(function (d) { d.open = false; });
      return;
    }
    if (e.target.closest("#menu-btn")) {
      var nav = document.getElementById("site-nav");
      var open = nav.classList.toggle("is-open");
      e.target.closest("#menu-btn").setAttribute("aria-expanded", open);
      return;
    }
    if (e.target.closest("#theme-btn")) {
      var root = document.documentElement;
      var cur = root.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      var nextTheme = cur === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", nextTheme);
      try { localStorage.setItem("dsh-theme", nextTheme); } catch (err) { /* ไม่บันทึกก็ได้ */ }
      updateThemeBtn();
    }
  });

  function closeMenu() {
    var nav = document.getElementById("site-nav");
    if (nav) nav.classList.remove("is-open");
    var b = document.getElementById("menu-btn");
    if (b) b.setAttribute("aria-expanded", "false");
  }

  function updateThemeBtn() {
    var b = document.getElementById("theme-btn");
    var cur = document.documentElement.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    b.setAttribute("aria-label", cur === "dark" ? "เปลี่ยนเป็นธีมสว่าง" : "เปลี่ยนเป็นธีมมืด");
    b.textContent = cur === "dark" ? "☀️" : "🌙";
  }

  document.addEventListener("submit", function (e) {
    var f = e.target;
    if (f.hasAttribute("data-search-form")) {
      e.preventDefault();
      var q = f.querySelector("input").value.trim();
      location.hash = "#/search" + qs({ q: q });
    } else if (f.hasAttribute("data-formula-form")) {
      e.preventDefault();
      var h = parseHash();
      location.hash = "#/formulas" + qs({ q: f.querySelector("input").value.trim(), cat: h.params.cat, level: h.params.level });
    }
  });

  document.addEventListener("keydown", function (e) {
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "/" && !e.shiftKey) {
      var input = document.getElementById("top-q");
      if (input) { e.preventDefault(); input.focus(); }
      return;
    }
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      if (tag === "pre" || tag === "summary") return;
      var link = app.querySelector('[data-key="' + (e.key === "ArrowRight" ? "next" : "prev") + '"]');
      if (link) { e.preventDefault(); location.hash = link.getAttribute("href"); }
    }
    if (e.key === "Escape") closeMenu();
  });

  window.addEventListener("hashchange", route);

  /* ---------------- เริ่มต้น ---------------- */

  try {
    var savedTheme = localStorage.getItem("dsh-theme");
    if (savedTheme) document.documentElement.setAttribute("data-theme", savedTheme);
  } catch (e) { /* ใช้ค่าตามระบบ */ }
  updateThemeBtn();

  fetch("content/manifest.json", { cache: "no-cache" }).then(function (r) {
    if (!r.ok) throw new Error("manifest " + r.status);
    return r.json();
  }).then(function (m) {
    manifest = m;
    window.SiteSearch.init(manifest);
    route();
    var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 1500); };
    idle(function () { window.SiteSearch.loadFull(fetchText); });
  }).catch(function (e) {
    app.innerHTML = '<div class="page narrow"><h1>โหลดเว็บไซต์ไม่สำเร็จ</h1><p>ไม่สามารถโหลดรายการเนื้อหาได้ (' + esc(e.message) +
      ')</p><p>ถ้าเปิดไฟล์ index.html จากเครื่องโดยตรง (file://) เบราว์เซอร์จะไม่อนุญาตให้โหลดเนื้อหา ให้รันเว็บเซิร์ฟเวอร์ตามคำแนะนำใน README เช่น <code>python -m http.server 8000</code></p></div>';
  });
})();
