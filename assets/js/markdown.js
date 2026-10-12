/*
 * markdown.js - ตัวแปลง Markdown ขนาดเล็กสำหรับเนื้อหา Learning Hub
 *
 * รองรับ:
 *   ## หัวข้อ / ### หัวข้อย่อย / #### หัวข้อเล็ก
 *   ย่อหน้า, **ตัวหนา**, *ตัวเอียง*, `โค้ด`, [ลิงก์](#/formula/xxx)
 *   รายการ - และ 1. (ซ้อนได้ 1 ชั้นด้วยการเยื้อง 2-4 ช่อง)
 *   ตาราง | a | b |
 *   กล่องโค้ด ```sql {flags}  (flags ใช้กับเครื่องมือตรวจ SQL และถูกซ่อนตอนแสดงผล)
 *   กล่องข้อความ > [!TIP] หัวเรื่อง  (TIP, NOTE, WARNING, DATABRICKS, MISTAKE, CHECK)
 *   กล่องเฉลย :::answer ข้อความปุ่ม ... :::
 *   ลำดับขั้น :::flow ... ::: (แต่ละบรรทัด "ชื่อขั้น | คำอธิบาย")
 */
(function (global) {
  "use strict";

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function slugify(text, used) {
    var base = String(text)
      .toLowerCase()
      .replace(/<[^>]+>/g, "")
      .replace(/[`*_[\]()]/g, "")
      .replace(/[^฀-๿a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section";
    var slug = base, n = 2;
    while (used[slug]) slug = base + "-" + n++;
    used[slug] = true;
    return slug;
  }

  function inline(text) {
    var codes = [];
    function keep(_, c) {
      codes.push("<code>" + esc(c) + "</code>");
      return "\u0000" + (codes.length - 1) + "\u0000";
    }
    var s = String(text).replace(/``\s?(.+?)\s?``/g, keep).replace(/`([^`]+)`/g, keep);
    s = esc(s);
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, label, href) {
      var ext = /^https?:/.test(href);
      return '<a href="' + href + '"' + (ext ? ' target="_blank" rel="noopener"' : "") + ">" + label + "</a>";
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
    s = s.replace(/\u0000(\d+)\u0000/g, function (_, i) { return codes[+i]; });
    return s;
  }

  var CALLOUTS = {
    TIP: { label: "เคล็ดลับ", icon: "💡" },
    NOTE: { label: "หมายเหตุ", icon: "📝" },
    WARNING: { label: "ข้อควรระวัง", icon: "⚠️" },
    DATABRICKS: { label: "เฉพาะ Databricks SQL", icon: "🧱" },
    MISTAKE: { label: "ข้อผิดพลาดที่พบบ่อย", icon: "❌" },
    CHECK: { label: "ตรวจความเข้าใจ", icon: "✅" },
    KEY: { label: "หลักจำ", icon: "🔑" }
  };

  function splitRow(line) {
    var t = line.trim();
    if (t.charAt(0) === "|") t = t.slice(1);
    if (t.charAt(t.length - 1) === "|") t = t.slice(0, -1);
    return t.split(/(?<!\\)\|/).map(function (c) { return c.trim().replace(/\\\|/g, "|"); });
  }

  function renderTable(lines) {
    var head = splitRow(lines[0]);
    var aligns = splitRow(lines[1]).map(function (c) {
      if (/^:-+:$/.test(c)) return "center";
      if (/^-+:$/.test(c)) return "right";
      return "";
    });
    var html = '<div class="table-wrap" tabindex="0"><table><thead><tr>';
    head.forEach(function (h, i) {
      html += "<th" + (aligns[i] ? ' style="text-align:' + aligns[i] + '"' : "") + ">" + inline(h) + "</th>";
    });
    html += "</tr></thead><tbody>";
    lines.slice(2).forEach(function (row) {
      html += "<tr>";
      splitRow(row).forEach(function (c, i) {
        var cls = c === "NULL" ? ' class="is-null"' : "";
        html += "<td" + cls + (aligns[i] ? ' style="text-align:' + aligns[i] + '"' : "") + ">" + inline(c) + "</td>";
      });
      html += "</tr>";
    });
    return html + "</tbody></table></div>";
  }

  function renderList(lines, start) {
    var ordered = /^\s*\d+\.\s/.test(lines[start]);
    var html = ordered ? "<ol>" : "<ul>";
    var i = start;
    var baseIndent = lines[start].match(/^\s*/)[0].length;
    while (i < lines.length) {
      var line = lines[i];
      var m = line.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
      if (!m) {
        if (line.trim() && /^\s{2,}\S/.test(line) && i > start) {
          html = html.replace(/<\/li>$/, " " + inline(line.trim()) + "</li>");
          i++;
          continue;
        }
        break;
      }
      var indent = m[1].length;
      if (indent > baseIndent) {
        var sub = renderList(lines, i);
        html = html.replace(/<\/li>$/, sub.html + "</li>");
        i = sub.next;
        continue;
      }
      if (indent < baseIndent) break;
      var item = m[3];
      var check = item.match(/^\[( |x)\]\s+(.*)$/i);
      html += check
        ? '<li class="check-item"><span aria-hidden="true">' + (check[1] === " " ? "☐" : "☑") + "</span> " + inline(check[2]) + "</li>"
        : "<li>" + inline(item) + "</li>";
      i++;
    }
    html += ordered ? "</ol>" : "</ul>";
    return { html: html, next: i };
  }

  function codeBlock(lang, info, code) {
    var title = "";
    var tm = info.match(/title="([^"]+)"/);
    if (tm) title = tm[1];
    var isError = /\berror\b/.test(info);
    var label = lang === "sql" ? "SQL" : lang ? lang.toUpperCase() : "TEXT";
    var hl = lang === "sql" && global.SQLHighlight ? global.SQLHighlight.highlight(code) : esc(code);
    return (
      '<figure class="code-block' + (isError ? " code-error" : "") + '">' +
      '<figcaption><span class="code-lang">' + label + "</span>" +
      (title ? '<span class="code-title">' + esc(title) + "</span>" : "") +
      (isError ? '<span class="code-badge">ตั้งใจให้ Error</span>' : "") +
      '<button type="button" class="copy-btn" data-copy aria-label="คัดลอกโค้ด">คัดลอก</button></figcaption>' +
      '<pre tabindex="0"><code class="lang-' + esc(lang || "text") + '">' + hl + "</code></pre></figure>"
    );
  }

  function render(src, opts) {
    opts = opts || {};
    var lines = String(src).replace(/\r\n?/g, "\n").split("\n");
    var out = [];
    var headings = [];
    var used = opts.usedSlugs || {};
    var i = 0;
    var para = [];

    function flushPara() {
      if (para.length) {
        out.push("<p>" + inline(para.join(" ")) + "</p>");
        para = [];
      }
    }

    while (i < lines.length) {
      var line = lines[i];

      if (/^<!--.*-->\s*$/.test(line)) {
        i++;
        continue;
      }

      var fence = line.match(/^```(\w*)\s*(.*)$/);
      if (fence) {
        flushPara();
        var code = [];
        i++;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) code.push(lines[i++]);
        i++;
        out.push(codeBlock(fence[1], fence[2] || "", code.join("\n")));
        continue;
      }

      var cont = line.match(/^:::(\w+)\s*(.*)$/);
      if (cont) {
        flushPara();
        var kind = cont[1];
        var arg = cont[2];
        var depth = 1;
        var inner = [];
        i++;
        while (i < lines.length) {
          if (/^:::\w+/.test(lines[i])) depth++;
          else if (/^:::\s*$/.test(lines[i])) {
            depth--;
            if (depth === 0) break;
          }
          inner.push(lines[i++]);
        }
        i++;
        if (kind === "flow") {
          var steps = inner.filter(function (l) { return l.trim(); }).map(function (l, k) {
            var parts = l.replace(/^\s*[-\d.]+\s*/, "").split("|");
            return '<li><span class="flow-num">' + (k + 1) + '</span><span class="flow-name">' + inline(parts[0].trim()) +
              "</span>" + (parts[1] ? '<span class="flow-desc">' + inline(parts.slice(1).join("|").trim()) + "</span>" : "") + "</li>";
          });
          out.push('<ol class="flow">' + steps.join("") + "</ol>");
        } else {
          var innerHtml = render(inner.join("\n"), { usedSlugs: used, nested: true }).html;
          var summary = arg || (kind === "answer" ? "ดูเฉลยและคำอธิบาย" : "รายละเอียด");
          out.push('<details class="reveal reveal-' + esc(kind) + '"><summary>' + inline(summary) + '</summary><div class="reveal-body">' + innerHtml + "</div></details>");
        }
        continue;
      }

      var h = line.match(/^(#{2,4})\s+(.*)$/);
      if (h) {
        flushPara();
        var level = h[1].length;
        var text = h[2].trim();
        var id = slugify(text, used);
        if (!opts.nested) headings.push({ level: level, text: text, id: id });
        out.push("<h" + level + ' id="' + id + '" tabindex="-1">' + inline(text) + "</h" + level + ">");
        i++;
        continue;
      }

      if (/^>\s?/.test(line)) {
        flushPara();
        var quote = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^>\s?/, ""));
        var cm = quote[0] && quote[0].match(/^\[!(\w+)\]\s*(.*)$/);
        if (cm) {
          var type = cm[1].toUpperCase();
          var meta = CALLOUTS[type] || CALLOUTS.NOTE;
          var head = cm[2] || meta.label;
          var body = render(quote.slice(1).join("\n"), { usedSlugs: used, nested: true }).html;
          out.push('<aside class="callout callout-' + type.toLowerCase() + '" role="note"><div class="callout-title"><span aria-hidden="true">' +
            meta.icon + "</span> " + inline(head) + "</div>" + body + "</aside>");
        } else {
          out.push("<blockquote>" + render(quote.join("\n"), { usedSlugs: used, nested: true }).html + "</blockquote>");
        }
        continue;
      }

      if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
        flushPara();
        var tbl = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) tbl.push(lines[i++]);
        out.push(renderTable(tbl));
        continue;
      }

      if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
        flushPara();
        var lst = renderList(lines, i);
        out.push(lst.html);
        i = lst.next;
        continue;
      }

      if (/^---+\s*$/.test(line)) {
        flushPara();
        out.push("<hr>");
        i++;
        continue;
      }

      if (!line.trim()) {
        flushPara();
        i++;
        continue;
      }

      para.push(line.trim());
      i++;
    }
    flushPara();
    return { html: out.join("\n"), headings: headings };
  }

  function toPlainText(src) {
    return String(src)
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/```[\s\S]*?```/g, function (m) { return " " + m.replace(/```\w*.*\n?/g, " ") + " "; })
      .replace(/^:::\w*.*$/gm, " ")
      .replace(/\[!(\w+)\]/g, " ")
      .replace(/[#>*`|]/g, " ")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
  }

  global.Markdown = { render: render, inline: inline, esc: esc, toPlainText: toPlainText };
})(window);
