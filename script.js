/**
 * SmartClass — 模块化入口（Vanilla JS，无构建）
 * 命名空间：Storage、Scoreboard、Picker、Timer、Nav、UI
 */
(function () {
  "use strict";

  var STORAGE_KEY = "smart_class_data";
  var TIMER_RADIUS = 88;
  var CIRC = 2 * Math.PI * TIMER_RADIUS;

  /** @returns {void} */
  function refreshIcons() {
    if (typeof lucide !== "undefined" && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // —— Storage ——
  var Storage = {
    defaultData: function () {
      var groups = [];
      var i;
      for (i = 1; i <= 6; i++) {
        groups.push({
          id: "g" + i + "-" + Date.now(),
          name: "第" + i + "组",
          score: 0,
        });
      }
      return {
        version: 1,
        groups: groups,
        pickerListRaw: "",
      };
    },

    load: function () {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (!raw || raw.trim() === "") {
          return this.defaultData();
        }
        var data = JSON.parse(raw);
        if (!data || !Array.isArray(data.groups) || data.groups.length === 0) {
          return this.defaultData();
        }
        while (data.groups.length < 4) {
          data.groups.push({
            id: "g-extra-" + data.groups.length + "-" + Date.now(),
            name: "第" + (data.groups.length + 1) + "组",
            score: 0,
          });
        }
        if (data.groups.length > 6) {
          data.groups = data.groups.slice(0, 6);
        }
        if (typeof data.pickerListRaw !== "string") {
          data.pickerListRaw = "";
        }
        data.groups = data.groups.map(function (g, idx) {
          return {
            id:
              typeof g.id === "string" && g.id
                ? g.id
                : "g-restored-" + idx + "-" + Date.now(),
            name:
              typeof g.name === "string" && g.name.trim()
                ? g.name.trim()
                : "第" + (idx + 1) + "组",
            score:
              typeof g.score === "number" && !isNaN(g.score)
                ? Math.round(g.score)
                : 0,
          };
        });
        return data;
      } catch (e) {
        console.warn("SmartClass: localStorage 解析失败，已使用默认数据", e);
        return this.defaultData();
      }
    },

    save: function (data) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        console.warn("SmartClass: 无法写入 localStorage", e);
      }
    },
  };

  /** @type {{ version: number, groups: Array<{id:string,name:string,score:number}>, pickerListRaw: string } | null} */
  var appData = null;

  // —— Nav ——
  var Nav = {
    init: function () {
      var buttons = document.querySelectorAll(".nav__btn[data-view]");
      var self = this;
      buttons.forEach(function (btn) {
        btn.addEventListener("click", function () {
          self.show(btn.getAttribute("data-view"));
        });
      });
    },

    show: function (viewId) {
      var views = document.querySelectorAll(".view");
      var buttons = document.querySelectorAll(".nav__btn[data-view]");
      views.forEach(function (el) {
        el.hidden = true;
        el.classList.remove("view--active");
      });
      buttons.forEach(function (b) {
        var active = b.getAttribute("data-view") === viewId;
        b.classList.toggle("nav__btn--active", active);
        if (active) {
          b.setAttribute("aria-current", "page");
        } else {
          b.removeAttribute("aria-current");
        }
      });
      var target = document.getElementById("view-" + viewId);
      if (target) {
        target.hidden = false;
        target.classList.add("view--active");
      }
      refreshIcons();
    },
  };

  // —— Scoreboard ——
  var Scoreboard = {
    grid: null,

    init: function () {
      this.grid = document.getElementById("scoreboard-grid");
      this.render();
    },

    persist: function () {
      if (appData) Storage.save(appData);
    },

    render: function () {
      if (!this.grid || !appData) return;
      var self = this;
      this.grid.innerHTML = "";
      appData.groups.forEach(function (g) {
        var card = document.createElement("article");
        card.className = "group-card";
        card.setAttribute("role", "listitem");

        var title = document.createElement("h2");
        title.className = "group-card__title";
        title.textContent = g.name;
        title.setAttribute("title", "双击修改组名");
        title.addEventListener("dblclick", function (e) {
          e.preventDefault();
          title.contentEditable = "true";
          title.focus();
          try {
            var range = document.createRange();
            range.selectNodeContents(title);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
          } catch (err) {}
        });
        title.addEventListener("blur", function () {
          title.contentEditable = "false";
          g.name = title.textContent.trim() || g.name;
          title.textContent = g.name;
          self.persist();
        });
        title.addEventListener("keydown", function (ev) {
          if (ev.key === "Enter") {
            ev.preventDefault();
            title.blur();
          }
        });

        var scoreRow = document.createElement("div");
        scoreRow.className = "group-card__score-row";

        var scoreEl = document.createElement("div");
        scoreEl.className = "group-card__score";
        scoreEl.textContent = String(g.score);

        var actions = document.createElement("div");
        actions.className = "group-card__actions";

        var btnMinus = document.createElement("button");
        btnMinus.type = "button";
        btnMinus.className = "btn-score btn-score--minus";
        btnMinus.setAttribute("aria-label", g.name + " 减一分");
        btnMinus.textContent = "−";

        var btnPlus = document.createElement("button");
        btnPlus.type = "button";
        btnPlus.className = "btn-score btn-score--plus";
        btnPlus.setAttribute("aria-label", g.name + " 加一分");
        btnPlus.textContent = "+";

        function updateScore(delta) {
          g.score += delta;
          scoreEl.textContent = String(g.score);
          self.persist();
        }

        btnMinus.addEventListener("click", function () {
          updateScore(-1);
        });
        btnPlus.addEventListener("click", function () {
          updateScore(1);
        });

        actions.appendChild(btnMinus);
        actions.appendChild(btnPlus);
        scoreRow.appendChild(scoreEl);
        scoreRow.appendChild(actions);

        card.appendChild(title);
        card.appendChild(scoreRow);
        self.grid.appendChild(card);
      });
    },
  };

  // —— Picker ——
  var Picker = {
    input: null,
    display: null,
    running: false,

    init: function () {
      this.input = document.getElementById("picker-input");
      this.display = document.getElementById("picker-display");
      var start = document.getElementById("picker-start");
      if (this.input && appData) {
        this.input.value = appData.pickerListRaw || "";
        var saveTimer = null;
        this.input.addEventListener("input", function () {
          if (!appData) return;
          appData.pickerListRaw = Picker.input.value;
          if (saveTimer) clearTimeout(saveTimer);
          saveTimer = setTimeout(function () {
            Storage.save(appData);
          }, 200);
        });
      }
      if (start) {
        start.addEventListener("click", function () {
          Picker.run();
        });
      }
    },

    parseNames: function (text) {
      var parts = text.split(/[\n,，;；、\t]+/);
      var out = [];
      var seen = Object.create(null);
      parts.forEach(function (p) {
        var n = p.trim();
        if (n && !seen[n]) {
          seen[n] = true;
          out.push(n);
        }
      });
      return out;
    },

    fireConfetti: function () {
      if (typeof confetti !== "function") return;
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.65 },
        colors: ["#6366F1", "#22C55E", "#A5B4FC", "#86EFAC"],
      });
      setTimeout(function () {
        confetti({
          particleCount: 60,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ["#6366F1", "#22C55E"],
        });
      }, 120);
      setTimeout(function () {
        confetti({
          particleCount: 60,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ["#6366F1", "#22C55E"],
        });
      }, 120);
    },

    run: function () {
      if (this.running) return;
      var names = this.parseNames(this.input ? this.input.value : "");
      if (names.length === 0) {
        this.display.innerHTML =
          '<span class="picker__placeholder">请先粘贴或输入至少一名学生</span>';
        this.display.classList.remove("is-active");
        return;
      }

      this.running = true;
      var display = this.display;
      var self = this;
      var winner = names[Math.floor(Math.random() * names.length)];
      var delay = 42;
      var maxDelay = 380;

      function tick() {
        var flash = names[Math.floor(Math.random() * names.length)];
        display.textContent = flash;
        display.classList.add("is-active");

        if (delay < maxDelay) {
          delay = Math.min(maxDelay, delay * 1.14 + 4);
          setTimeout(tick, delay);
        } else {
          display.innerHTML =
            '<span class="picker__name">' + escapeHtml(winner) + "</span>";
          self.running = false;
          self.fireConfetti();
        }
      }

      tick();
    },
  };

  // —— Timer ——
  var Timer = {
    totalSec: 300,
    remainingSec: 300,
    running: false,
    lastTs: 0,
    rafId: 0,
    progressEl: null,
    readoutEl: null,
    toggleBtn: null,
    toggleIcon: null,

    init: function () {
      this.progressEl = document.getElementById("timer-progress");
      this.readoutEl = document.getElementById("timer-readout");
      this.toggleBtn = document.getElementById("timer-toggle");
      this.toggleIcon = document.getElementById("timer-toggle-icon");

      var self = this;
      document.querySelectorAll(".timer-preset").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var s = parseInt(btn.getAttribute("data-seconds"), 10);
          if (!isNaN(s) && s > 0) {
            self.setDuration(s);
          }
        });
      });

      if (this.toggleBtn) {
        this.toggleBtn.addEventListener("click", function () {
          self.toggle();
        });
      }
      var resetBtn = document.getElementById("timer-reset");
      if (resetBtn) {
        resetBtn.addEventListener("click", function () {
          self.reset();
        });
      }

      this.updateRing(true);
      this.updateReadout();
      this.setPlayUi(false);
    },

    format: function (sec) {
      sec = Math.max(0, Math.ceil(sec));
      var m = Math.floor(sec / 60);
      var s = sec % 60;
      return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
    },

    setDuration: function (seconds) {
      this.running = false;
      this.cancelRaf();
      this.totalSec = seconds;
      this.remainingSec = seconds;
      this.lastTs = 0;
      this.updateRing(true);
      this.updateReadout();
      this.setPlayUi(false);
    },

    updateReadout: function () {
      if (this.readoutEl) {
        this.readoutEl.textContent = this.format(this.remainingSec);
      }
    },

    updateRing: function (instant) {
      if (!this.progressEl || this.totalSec <= 0) return;
      var p = this.remainingSec / this.totalSec;
      if (p < 0) p = 0;
      if (p > 1) p = 1;
      var offset = CIRC * (1 - p);
      if (instant) {
        this.progressEl.style.transition = "none";
      } else {
        this.progressEl.style.transition = "stroke-dashoffset 0.1s linear";
      }
      this.progressEl.style.strokeDasharray = String(CIRC);
      this.progressEl.style.strokeDashoffset = String(offset);
      if (instant) {
        void this.progressEl.offsetHeight;
        this.progressEl.style.transition = "stroke-dashoffset 0.1s linear";
      }
    },

    setPlayUi: function (playing) {
      if (!this.toggleBtn || !this.toggleIcon) return;
      this.toggleBtn.setAttribute("aria-pressed", playing ? "true" : "false");
      this.toggleBtn.setAttribute(
        "aria-label",
        playing ? "暂停计时" : "开始计时"
      );
      this.toggleIcon.setAttribute("data-lucide", playing ? "pause" : "play");
      refreshIcons();
    },

    toggle: function () {
      if (this.running) {
        this.running = false;
        this.cancelRaf();
        this.setPlayUi(false);
      } else {
        if (this.remainingSec <= 0) {
          this.remainingSec = this.totalSec;
        }
        this.running = true;
        this.lastTs = performance.now();
        this.setPlayUi(true);
        this.loop();
      }
    },

    cancelRaf: function () {
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = 0;
      }
    },

    loop: function () {
      var self = this;
      function frame(ts) {
        if (!self.running) return;
        if (!self.lastTs) self.lastTs = ts;
        var dt = (ts - self.lastTs) / 1000;
        self.lastTs = ts;
        self.remainingSec -= dt;
        if (self.remainingSec <= 0) {
          self.remainingSec = 0;
          self.running = false;
          self.cancelRaf();
          self.updateRing(false);
          self.updateReadout();
          self.setPlayUi(false);
          return;
        }
        self.updateRing(false);
        self.updateReadout();
        self.rafId = requestAnimationFrame(frame);
      }
      this.rafId = requestAnimationFrame(frame);
    },

    reset: function () {
      this.running = false;
      this.cancelRaf();
      this.remainingSec = this.totalSec;
      this.lastTs = 0;
      this.updateRing(true);
      this.updateReadout();
      this.setPlayUi(false);
    },
  };

  function onLoad() {
    appData = Storage.load();
    Nav.init();
    Scoreboard.init();
    Picker.init();
    Timer.init();
    Nav.show("scoreboard");
    refreshIcons();
  }

  if (document.readyState === "complete") {
    onLoad();
  } else {
    window.addEventListener("load", onLoad);
  }
})();
