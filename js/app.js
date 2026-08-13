/* 每日一诗 · 应用逻辑
 * 功能：每日一篇 / 上一篇下一篇 / 收藏 / 历史 / 语音朗读 / PWA 离线
 * 数据：localStorage（无后端） */
(function () {
  "use strict";

  /* ---------- 常量与状态 ---------- */
  var POEMS = window.POEMS || [];
  var SCHOOL_SET = new Set(window.SCHOOL_POEMS || []);

  // 阅读池：全量数据剔除小学课本篇目（作者|标题 键匹配）
  var POOL = [];      // 阅读池中每首的 POEMS 下标
  var POOL_POS = {};  // POEMS 下标 -> 阅读池位置
  POEMS.forEach(function (p, i) {
    if (!SCHOOL_SET.has(p.author + "|" + p.title)) {
      POOL_POS[i] = POOL.length;
      POOL.push(i);
    }
  });

  var STORE_KEY = "daily-poem:v1";

  var state = {
    currentIndex: 0,      // 当前显示的诗词索引
    suppressHistory: false, // 从历史/收藏回看时，不覆盖今日记录
    reading: false
  };

  var els = {};
  var toastTimer = null;

  /* ---------- 工具函数 ---------- */
  function $(id) { return document.getElementById(id); }

  function dateStr(d) {
    d = d || new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  function formatDateCN(str) {
    var parts = str.split("-");
    return parts[0] + "年" + parseInt(parts[1], 10) + "月" + parseInt(parts[2], 10) + "日";
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : { history: {}, favs: [] };
    } catch (e) {
      return { history: {}, favs: [] };
    }
  }

  function save(data) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch (e) { /* 隐私模式等场景下静默失败 */ }
  }

  // 以日期为种子，确定性挑选当日诗词（从剔除小学篇目后的阅读池中选择）
  function dayIndex(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = (h * 31 + str.charCodeAt(i)) >>> 0;
    }
    return h % POOL.length;
  }

  function toast(msg) {
    var t = els.toast;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 1800);
  }

  /* ---------- 渲染：当前诗词 ---------- */
  function renderPoem(index) {
    var p = POEMS[index];
    if (!p) return;

    els.title.textContent = p.title;
    els.meta.textContent = "【" + p.dynasty + "】" + p.author;
    els.translation.textContent = p.translation || "（暂无译文）";
    els.appreciation.textContent = p.appreciation || "（暂无赏析）";

    // 无译文/注释/赏析的篇目（非精读版）隐藏对应区块
    els.secTranslation.classList.toggle("hidden", !p.translation);
    els.secNotes.classList.toggle("hidden", !(p.notes && p.notes.length));
    els.secAppreciation.classList.toggle("hidden", !p.appreciation);

    els.notes.innerHTML = "";
    (p.notes || []).forEach(function (n) {
      var li = document.createElement("li");
      li.textContent = n;
      els.notes.appendChild(li);
    });

    els.content.innerHTML = "";
    p.content.forEach(function (line) {
      var span = document.createElement("span");
      span.className = "poem-line";
      span.textContent = line;
      els.content.appendChild(span);
    });

    els.counter.textContent = (POOL_POS[state.currentIndex] + 1) + " / " + POOL.length;
    updateFavButton();
    stopReading();
  }

  function updateFavButton() {
    var data = load();
    var faved = data.favs.indexOf(state.currentIndex) !== -1;
    els.favIcon.textContent = faved ? "★" : "☆";
    els.favLabel.textContent = faved ? "已收藏" : "收藏";
    els.favBtn.classList.toggle("faved", faved);
  }

  function showPoem(index, opts) {
    opts = opts || {};
    state.currentIndex = ((index % POEMS.length) + POEMS.length) % POEMS.length;

    if (!opts.silent) {
      recordToday(state.currentIndex);
    }
    renderPoem(state.currentIndex);
  }
  /* ---------- 历史记录 ---------- */
  function recordToday(index) {
    var data = load();
    data.history[dateStr()] = index;
    save(data);
  }

  function renderHistory() {
    var data = load();
    var entries = Object.keys(data.history).sort().reverse().map(function (d) {
      return { date: d, index: data.history[d] };
    });

    els.historyList.innerHTML = "";
    els.historyEmpty.classList.toggle("hidden", entries.length > 0);

    entries.forEach(function (e) {
      var p = POEMS[e.index];
      if (!p) return;
      var li = document.createElement("li");
      li.innerHTML = "";
      var t = document.createElement("div");
      t.className = "item-title";
      t.textContent = p.title;
      var m = document.createElement("div");
      m.className = "item-meta";
      m.innerHTML = "<span>" + p.author + " · " + p.dynasty + "</span><span class='item-tag'>" + formatDateCN(e.date) + "</span>";
      li.appendChild(t);
      li.appendChild(m);
      li.addEventListener("click", function () {
        switchTab("today");
        showPoem(e.index, { silent: true });
      });
      els.historyList.appendChild(li);
    });
  }

  /* ---------- 收藏 ---------- */
  function toggleFav() {
    var data = load();
    var idx = data.favs.indexOf(state.currentIndex);
    if (idx === -1) {
      data.favs.push(state.currentIndex);
      save(data);
      toast("已收藏：收藏夹可随时回看");
    } else {
      data.favs.splice(idx, 1);
      save(data);
      toast("已取消收藏");
    }
    updateFavButton();
    if (!els.favsPanel.classList.contains("hidden")) renderFavs();
  }

  function renderFavs() {
    var data = load();
    els.favList.innerHTML = "";
    els.favEmpty.classList.toggle("hidden", data.favs.length > 0);

    data.favs.forEach(function (idx) {
      var p = POEMS[idx];
      if (!p) return;
      var li = document.createElement("li");
      var t = document.createElement("div");
      t.className = "item-title";
      t.textContent = p.title;
      var m = document.createElement("div");
      m.className = "item-meta";
      m.innerHTML = "<span>" + p.author + " · " + p.dynasty + "</span><span class='item-tag'>第" + (idx + 1) + "篇</span>";
      li.appendChild(t);
      li.appendChild(m);
      li.addEventListener("click", function () {
        switchTab("today");
        showPoem(idx, { silent: true });
      });
      els.favList.appendChild(li);
    });
  }

  /* ---------- 语音朗读 ---------- */
  function pickVoice() {
    var voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    var zh = voices.filter(function (v) { return /^zh[-_]?(CN|Hans)/i.test(v.lang); });
    var pool = zh.length ? zh : voices;
    // 优先中文女声/普通话，其次任意中文，最后默认
    return pool.filter(function (v) { return /xiaoxiao|huihui|tingting|yaoyao|meijia/i.test(v.name); })[0]
      || pool[0] || null;
  }

  function toggleReading() {
    if (!("speechSynthesis" in window)) {
      toast("当前浏览器不支持语音朗读");
      return;
    }
    if (state.reading) {
      stopReading();
      return;
    }
    var p = POEMS[state.currentIndex];
    var text = p.title + "，" + p.author + "。" + p.content.join("，").replace(/[，。]$/, "") + "。";
    var u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-CN";
    u.rate = 0.85;
    u.pitch = 1;
    var v = pickVoice();
    if (v) u.voice = v;
    u.onend = u.onerror = function () { stopReading(); };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    state.reading = true;
    els.readBtn.classList.add("active");
    els.readIcon.textContent = "⏸";
    els.readLabel.textContent = "停止";
  }

  function stopReading() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    state.reading = false;
    els.readBtn.classList.remove("active");
    els.readIcon.textContent = "▶";
    els.readLabel.textContent = "朗读";
  }

  /* ---------- Tab 切换 ---------- */
  function switchTab(name) {
    stopReading();
    var panels = { today: els.todayPanel, history: els.historyPanel, favs: els.favsPanel };
    Object.keys(panels).forEach(function (k) {
      panels[k].classList.toggle("hidden", k !== name);
    });
    document.querySelectorAll(".tab-btn").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-tab") === name);
    });
    if (name === "history") renderHistory();
    if (name === "favs") renderFavs();
    window.scrollTo({ top: 0 });
  }

  /* ---------- 初始化 ---------- */
  function initDate() {
    var d = new Date();
    var week = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
    els.todayDate.textContent = formatDateCN(dateStr(d)) + " · 星期" + week;
  }

  function initToday() {
    var data = load();
    var today = dateStr();
    var index = POOL[dayIndex(today)];
    if (data.history.hasOwnProperty(today)) {
      var h = data.history[today];
      // 历史记录指向合法且非小学篇目时沿用，否则回退当日篇目
      if (h >= 0 && h < POEMS.length && POOL_POS.hasOwnProperty(h)) index = h;
    }
    state.currentIndex = index;
    renderPoem(index);
    if (!data.history.hasOwnProperty(today)) recordToday(index);
  }

  function init() {
    els = {
      todayDate: $("today-date"),
      title: $("poem-title"),
      meta: $("poem-meta"),
      content: $("poem-content"),
      translation: $("poem-translation"),
      notes: $("poem-notes"),
      appreciation: $("poem-appreciation"),
      secTranslation: $("sec-translation"),
      secNotes: $("sec-notes"),
      secAppreciation: $("sec-appreciation"),
      counter: $("nav-counter"),
      readBtn: $("btn-read"),
      readIcon: $("read-icon"),
      readLabel: $("read-label"),
      favBtn: $("btn-fav"),
      favIcon: $("fav-icon"),
      favLabel: $("fav-label"),
      prevBtn: $("btn-prev"),
      nextBtn: $("btn-next"),
      todayPanel: $("tab-today"),
      historyPanel: $("tab-history"),
      favsPanel: $("tab-favs"),
      historyList: $("history-list"),
      historyEmpty: $("history-empty"),
      favList: $("fav-list"),
      favEmpty: $("fav-empty"),
      toast: $("toast")
    };

    initDate();
    initToday();

    // 朗读
    els.readBtn.addEventListener("click", toggleReading);
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = function () { /* 触发语音列表加载 */ };
    }

    // 收藏
    els.favBtn.addEventListener("click", toggleFav);

    // 上一篇 / 下一篇（在剔除小学篇目的阅读池内导航）
    els.prevBtn.addEventListener("click", function () {
      var pos = POOL_POS[state.currentIndex];
      showPoem(POOL[(pos - 1 + POOL.length) % POOL.length]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    els.nextBtn.addEventListener("click", function () {
      var pos = POOL_POS[state.currentIndex];
      showPoem(POOL[(pos + 1) % POOL.length]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    // 底部 Tab
    document.querySelectorAll(".tab-btn").forEach(function (b) {
      b.addEventListener("click", function () { switchTab(b.getAttribute("data-tab")); });
    });

    // 注册 Service Worker（需 http/https 环境）
    if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register("./sw.js").catch(function () { /* 忽略注册失败 */ });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
