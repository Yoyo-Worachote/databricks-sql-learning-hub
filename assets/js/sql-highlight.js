/*
 * sql-highlight.js - ระบายสี SQL แบบไม่พึ่งไลบรารีภายนอก
 * แยก Token: comment, string, backtick identifier, number, keyword, function, operator
 */
(function (global) {
  "use strict";

  var KEYWORDS = (
    "select from where and or not in is null as on join inner left right full outer cross semi anti " +
    "group by having order asc desc nulls first last limit offset distinct all union intersect except minus " +
    "case when then else end with over partition rows range between unbounded preceding following current row " +
    "insert into values update set delete create replace view table schema catalog drop if exists use show tables " +
    "describe extended explain like ilike rlike true false interval date timestamp qualify lateral " +
    "comment database alter add column cast try_cast"
  ).split(" ");
  var KW = {};
  KEYWORDS.forEach(function (k) { KW[k] = true; });

  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function span(cls, text) {
    return '<span class="tok-' + cls + '">' + esc(text) + "</span>";
  }

  function highlight(code) {
    var out = "";
    var i = 0;
    var n = code.length;
    while (i < n) {
      var ch = code[i];
      var rest = code.slice(i);
      var m;
      if (rest.startsWith("--")) {
        var end = code.indexOf("\n", i);
        if (end < 0) end = n;
        out += span("comment", code.slice(i, end));
        i = end;
        continue;
      }
      if (rest.startsWith("/*")) {
        var e2 = code.indexOf("*/", i + 2);
        e2 = e2 < 0 ? n : e2 + 2;
        out += span("comment", code.slice(i, e2));
        i = e2;
        continue;
      }
      if (ch === "'" || ch === '"') {
        var j = i + 1;
        while (j < n && code[j] !== ch) {
          if (code[j] === "\\") j++;
          j++;
        }
        out += span("string", code.slice(i, j + 1));
        i = j + 1;
        continue;
      }
      if (ch === "`") {
        var k = code.indexOf("`", i + 1);
        k = k < 0 ? n : k + 1;
        out += span("ident", code.slice(i, k));
        i = k;
        continue;
      }
      if ((m = rest.match(/^\d+(\.\d+)?/)) && !/[A-Za-z_]/.test(code[i - 1] || "")) {
        out += span("number", m[0]);
        i += m[0].length;
        continue;
      }
      if ((m = rest.match(/^[A-Za-z_][A-Za-z0-9_]*/))) {
        var word = m[0];
        var lower = word.toLowerCase();
        var after = code.slice(i + word.length).match(/^\s*\(/);
        var prevDot = code[i - 1] === ".";
        var kwBeforeParen = /^(in|exists|over|as|values|using|on|and|or|not|when|then|else|from|join|table|view|with|cast|try_cast|date|timestamp|interval|partition|by|filter)$/;
        if (!prevDot && KW[lower] && (!after || kwBeforeParen.test(lower))) {
          out += span("keyword", word);
        } else if (!prevDot && after) {
          out += span("func", word);
        } else {
          out += esc(word);
        }
        i += word.length;
        continue;
      }
      if ((m = rest.match(/^(<=|>=|<>|!=|\|\||[=<>+\-*/%])/))) {
        out += span("op", m[0]);
        i += m[0].length;
        continue;
      }
      out += esc(ch);
      i++;
    }
    return out;
  }

  global.SQLHighlight = { highlight: highlight };
})(window);
