/* トム・ソーヤの冒険 中1英語リーダー
 * データは data/index.json(章一覧)と data/chapters/chNN.json(本文+解説)。
 * ハッシュルーティング: "#/" = 目次, "#/ch/N" = 第N章
 */
(function () {
  "use strict";

  var app = document.getElementById("app");
  var bookIndex = null; // data/index.json の内容
  var chapterCache = {};

  function fetchJSON(path) {
    return fetch(path).then(function (res) {
      if (!res.ok) throw new Error(path + " の読み込みに失敗しました (" + res.status + ")");
      return res.json();
    });
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function showError(err) {
    app.innerHTML = "";
    var box = el("div", "error");
    var strong = el("strong", null, "データを読み込めませんでした。");
    var p = el("p", null, "ローカルで開く場合は「python3 -m http.server」などの簡易サーバー経由で開いてください(file:// 直接ではブラウザの制限で JSON を読めません)。");
    var detail = el("p", null, String(err && err.message ? err.message : err));
    detail.style.fontSize = "0.75rem";
    box.appendChild(strong);
    box.appendChild(p);
    box.appendChild(detail);
    app.appendChild(box);
  }

  /* ---------- 目次 ---------- */

  function renderTOC() {
    app.innerHTML = "";
    var lead = el("p", "toc-lead",
      "読みたい章を選んでください。英文のカードごとに「解説」ボタンがあり、語句・文法・日本語訳を確認できます。");
    app.appendChild(lead);

    var list = el("ul", "toc-list");
    bookIndex.chapters.forEach(function (ch) {
      var li = el("li", "toc-item");
      var a = document.createElement("a");
      a.href = "#/ch/" + ch.num;

      var num = el("span", "toc-num", String(ch.num));
      var body = el("span", null);
      body.appendChild(el("span", "toc-title-en", ch.title));
      body.appendChild(el("span", "toc-meta", "全 " + ch.units + " ユニット"));

      a.appendChild(num);
      a.appendChild(body);
      li.appendChild(a);
      list.appendChild(li);
    });
    app.appendChild(list);
  }

  /* ---------- 章リーダー ---------- */

  function renderChapter(chapterMeta, data) {
    app.innerHTML = "";

    var back = document.createElement("a");
    back.className = "back-to-toc";
    back.href = "#/";
    back.textContent = "← 目次にもどる";
    app.appendChild(back);

    var top = el("div", "reader-top");
    var titleWrap = el("div", null);
    titleWrap.appendChild(el("div", "chapter-label", "CHAPTER " + data.chapter));
    var h = el("h1", "chapter-title", data.title);
    titleWrap.appendChild(h);
    top.appendChild(titleWrap);
    top.appendChild(el("div", "chapter-progress", "全 " + data.units.length + " ユニット"));
    app.appendChild(top);

    var tools = el("div", "reader-tools");
    var openAll = el("button", "tool-btn", "すべての解説を開く");
    var closeAll = el("button", "tool-btn", "すべて閉じる");
    tools.appendChild(openAll);
    tools.appendChild(closeAll);
    app.appendChild(tools);

    var list = el("div", "unit-list");
    data.units.forEach(function (unit, i) {
      list.appendChild(renderUnit(unit, i + 1));
    });
    app.appendChild(list);

    openAll.addEventListener("click", function () { toggleAllPanels(list, true); });
    closeAll.addEventListener("click", function () { toggleAllPanels(list, false); });

    app.appendChild(renderChapterNav(data.chapter));
    window.scrollTo(0, 0);
  }

  function renderUnit(unit, ordinal) {
    var card = el("article", "unit-card");

    var head = el("div", "unit-head");
    head.appendChild(el("span", "unit-no", String(ordinal)));
    head.appendChild(el("p", "unit-en", unit.en));
    card.appendChild(head);

    var actions = el("div", "unit-actions");
    var btn = el("button", "explain-btn", "解説");
    btn.setAttribute("aria-expanded", "false");
    actions.appendChild(btn);
    card.appendChild(actions);

    var panel = el("div", "explain-panel");

    if (unit.vocab && unit.vocab.length) {
      var secV = el("section", "explain-section");
      secV.appendChild(el("h2", "explain-heading heading-vocab", "語句"));
      var ul = el("ul", "vocab-list");
      unit.vocab.forEach(function (v) {
        var li = el("li", null);
        li.appendChild(el("span", "vocab-word", v.word));
        if (v.pos) li.appendChild(el("span", "vocab-pos", v.pos));
        li.appendChild(el("span", "vocab-ja", v.ja));
        ul.appendChild(li);
      });
      secV.appendChild(ul);
      panel.appendChild(secV);
    }

    if (unit.grammar) {
      var secG = el("section", "explain-section");
      secG.appendChild(el("h2", "explain-heading heading-grammar", "文法"));
      secG.appendChild(el("p", "explain-text", unit.grammar));
      panel.appendChild(secG);
    }

    var secJ = el("section", "explain-section");
    secJ.appendChild(el("h2", "explain-heading heading-ja", "日本語訳"));
    secJ.appendChild(el("p", "ja-text", unit.ja));
    panel.appendChild(secJ);

    card.appendChild(panel);

    btn.addEventListener("click", function () {
      setPanel(btn, panel, !panel.classList.contains("open"));
    });

    return card;
  }

  function setPanel(btn, panel, open) {
    panel.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.textContent = open ? "とじる" : "解説";
  }

  function toggleAllPanels(list, open) {
    list.querySelectorAll(".unit-card").forEach(function (card) {
      var btn = card.querySelector(".explain-btn");
      var panel = card.querySelector(".explain-panel");
      if (btn && panel) setPanel(btn, panel, open);
    });
  }

  function renderChapterNav(num) {
    var nav = el("nav", "chapter-nav");
    var prevMeta = findChapter(num - 1);
    var nextMeta = findChapter(num + 1);

    if (prevMeta) {
      var prev = document.createElement("a");
      prev.href = "#/ch/" + prevMeta.num;
      prev.textContent = "← 第" + prevMeta.num + "章";
      nav.appendChild(prev);
    } else {
      nav.appendChild(el("span", "nav-spacer"));
    }

    if (nextMeta) {
      var next = document.createElement("a");
      next.href = "#/ch/" + nextMeta.num;
      next.textContent = "第" + nextMeta.num + "章 →";
      nav.appendChild(next);
    } else {
      nav.appendChild(el("span", "nav-spacer"));
    }
    return nav;
  }

  function findChapter(num) {
    return bookIndex.chapters.find(function (ch) { return ch.num === num; }) || null;
  }

  /* ---------- ルーティング ---------- */

  function route() {
    var hash = location.hash || "#/";
    var m = hash.match(/^#\/ch\/(\d+)$/);
    if (!m) { renderTOC(); return; }

    var num = parseInt(m[1], 10);
    var meta = findChapter(num);
    if (!meta) { renderTOC(); return; }

    if (chapterCache[num]) {
      renderChapter(meta, chapterCache[num]);
      return;
    }
    app.innerHTML = "";
    app.appendChild(el("p", "loading", "読み込み中…"));
    fetchJSON("data/" + meta.file)
      .then(function (data) {
        chapterCache[num] = data;
        renderChapter(meta, data);
      })
      .catch(showError);
  }

  fetchJSON("data/index.json")
    .then(function (idx) {
      bookIndex = idx;
      window.addEventListener("hashchange", route);
      route();
    })
    .catch(showError);
})();
