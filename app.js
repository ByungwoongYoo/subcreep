(function () {
  "use strict";

  var STORAGE_KEY = "subcreep_subs";
  var SEEDED_KEY = "subcreep_seeded";
  var WAITLIST_KEY = "subcreep_waitlist";
  var PRO_KEY = "subcreep_pro";
  var QUIZ_KEY = "subcreep_quiz";
  var QUIZ_DONE_KEY = "subcreep_quiz_done";
  var GUMROAD_PRO_URL = "https://yoonge.gumroad.com/l/subcreep-pro";
  var FREE_LIMIT = 5;

  var QUIZ_QUESTIONS = [
    {
      id: "subs",
      q: "How many paid subscriptions do you think you have right now?",
      opts: [
        { label: "1–3", value: 2 },
        { label: "4–6", value: 5 },
        { label: "7–10", value: 8 },
        { label: "11+", value: 14 }
      ]
    },
    {
      id: "spend",
      q: "Rough guess — what do you spend on subscriptions per month (USD)?",
      opts: [
        { label: "Under $30", value: 20 },
        { label: "$30–$75", value: 55 },
        { label: "$75–$150", value: 110 },
        { label: "$150+", value: 200 }
      ]
    },
    {
      id: "cancel",
      q: "When did you last cancel a subscription you weren’t really using?",
      opts: [
        { label: "This month", value: 0.15 },
        { label: "In the last 3 months", value: 0.35 },
        { label: "6+ months ago", value: 0.55 },
        { label: "I can’t remember", value: 0.7 }
      ]
    },
    {
      id: "cards",
      q: "How many cards / payment methods do subscription charges hit?",
      opts: [
        { label: "1", value: 0.2 },
        { label: "2", value: 0.35 },
        { label: "3+", value: 0.5 },
        { label: "Not sure", value: 0.45 }
      ]
    },
    {
      id: "surprise",
      q: "Have you ever been surprised by a forgotten subscription charge?",
      opts: [
        { label: "Yes — more than once", value: 0.55 },
        { label: "Once", value: 0.35 },
        { label: "Not yet / not sure", value: 0.25 },
        { label: "All the time", value: 0.65 }
      ]
    },
    {
      id: "category",
      q: "Where do you suspect the biggest leak is?",
      opts: [
        { label: "Streaming", value: "Streaming" },
        { label: "AI / productivity tools", value: "AI" },
        { label: "Cloud / Apple / storage", value: "Cloud" },
        { label: "Fitness / other", value: "Other" }
      ]
    }
  ];

  function applyProFromQuery() {
    try {
      var q = new URLSearchParams(window.location.search || "");
      // ?pro=1 removed 2026-10-29 (free unlock leak)
    } catch (e) {}
  }

  function isPro() {
    try {
      return localStorage.getItem(PRO_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function stampProBadge() {
    if (!isPro()) return;
    var brand = document.querySelector("header .brand h1 .badge");
    if (brand) {
      brand.textContent = "Pro";
      brand.classList.add("badge-pro");
    }
  }

  var SEED = [
    { name: "Netflix", price: 15.49, cycle: "monthly", category: "Streaming", offsetDays: 5 },
    { name: "Spotify", price: 11.99, cycle: "monthly", category: "Music", offsetDays: 12 },
    { name: "ChatGPT Plus", price: 20.0, cycle: "monthly", category: "AI", offsetDays: 3 },
    { name: "iCloud+", price: 2.99, cycle: "monthly", category: "Cloud", offsetDays: 20 },
    { name: "Adobe Creative Cloud", price: 19.99, cycle: "monthly", category: "Productivity", offsetDays: 8 }
  ];

  function uid() {
    return "s_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  function isoDate(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function addDays(base, n) {
    var d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    d.setDate(d.getDate() + n);
    return d;
  }

  function parseDate(s) {
    if (!s) return null;
    var p = String(s).trim().split("-");
    if (p.length !== 3) return null;
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return isNaN(d.getTime()) ? null : d;
  }

  function daysUntil(dateStr) {
    var d = parseDate(dateStr);
    if (!d) return null;
    var today = new Date();
    today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.round((d - today) / 86400000);
  }

  function monthlyOf(sub) {
    var p = Number(sub.price) || 0;
    return sub.cycle === "yearly" ? p / 12 : p;
  }

  function makeSeed() {
    var today = new Date();
    return SEED.map(function (item) {
      return {
        id: uid(),
        name: item.name,
        price: item.price,
        cycle: item.cycle,
        next_renewal: isoDate(addDays(today, item.offsetDays)),
        category: item.category
      };
    });
  }

  function loadSubs() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr;
      }
    } catch (e) {}
    var seeded = makeSeed();
    saveSubs(seeded);
    try { localStorage.setItem(SEEDED_KEY, "1"); } catch (e2) {}
    return seeded;
  }

  function saveSubs(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function money(n) {
    return "$" + (Math.round(n * 100) / 100).toFixed(2);
  }

  function showToast(msg, isErr) {
    var el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className = "toast" + (isErr ? " err" : "") + " show";
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () {
      el.classList.remove("show");
    }, 2800);
  }

  function csvEscape(v) {
    var s = String(v == null ? "" : v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function downloadText(filename, text, mime) {
    var blob = new Blob([text], { type: mime || "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 500);
  }

  function parseCsvLine(line) {
    var out = [];
    var cur = "";
    var inQ = false;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (inQ) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') inQ = false;
        else cur += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === ",") { out.push(cur); cur = ""; }
        else cur += c;
      }
    }
    out.push(cur);
    return out;
  }

  function parseCsv(text) {
    var lines = String(text).replace(/^\uFEFF/, "").split(/\r?\n/).filter(function (l) {
      return l.trim().length > 0;
    });
    if (!lines.length) return [];
    var header = parseCsvLine(lines[0]).map(function (h) { return h.trim().toLowerCase(); });
    var nameIdx = header.indexOf("name");
    var priceIdx = header.indexOf("price");
    if (priceIdx < 0) priceIdx = header.indexOf("amount");
    var cycleIdx = header.indexOf("cycle");
    if (cycleIdx < 0) cycleIdx = header.indexOf("billing_cycle");
    var nextIdx = header.indexOf("next_renewal");
    if (nextIdx < 0) nextIdx = header.indexOf("next_date");
    var catIdx = header.indexOf("category");

    // Allow headerless simple: name,price,cycle,next_renewal,category
    var start = 1;
    if (nameIdx < 0 || priceIdx < 0) {
      nameIdx = 0; priceIdx = 1; cycleIdx = 2; nextIdx = 3; catIdx = 4;
      start = 0;
    }

    var rows = [];
    for (var i = start; i < lines.length; i++) {
      var cols = parseCsvLine(lines[i]);
      var name = (cols[nameIdx] || "").trim();
      var price = parseFloat(cols[priceIdx]);
      if (!name || isNaN(price)) continue;
      var cycle = String(cols[cycleIdx] || "monthly").trim().toLowerCase();
      if (cycle !== "yearly" && cycle !== "monthly") cycle = "monthly";
      var next = (cols[nextIdx] || "").trim();
      if (!parseDate(next)) next = isoDate(addDays(new Date(), 14));
      var category = (cols[catIdx] || "Other").trim() || "Other";
      rows.push({
        id: uid(),
        name: name,
        price: price,
        cycle: cycle,
        next_renewal: next,
        category: category
      });
    }
    return rows;
  }


  /* ---------- Leak quiz (GoTall-style onboarding) ---------- */
  function quizShouldShow() {
    try {
      var q = new URLSearchParams(window.location.search || "");
      if (q.get("skip") === "1") return false;
      if (q.get("quiz") === "1") return true;
      if (q.get("quiz") === "0") return false;
      return false;
    } catch (e) {
      return false;
    }
  }

  function saveQuiz(answers, leak) {
    try {
      localStorage.setItem(QUIZ_KEY, JSON.stringify({
        answers: answers,
        category: leak.category,
        at: new Date().toISOString()
      }));
      localStorage.setItem(QUIZ_DONE_KEY, "1");
    } catch (e) {}
  }

  // Self-assessment answers are not evidence of detected charges or savings.
  function estimateLeak(answers) {
    return { category: answers.category || "Other" };
  }

  /* ---------- Share quiz result as image (viral loop) ---------- */
  var SHARE_URL = "https://byungwoongyoo.github.io/subcreep/app.html?quiz=1&utm_source=share&utm_medium=quiz_card";
  function drawShareCard(leak) {
    var c = document.createElement("canvas");
    c.width = 1080; c.height = 1350;
    var g = c.getContext("2d");
    var bg = g.createLinearGradient(0, 0, 1080, 1350);
    bg.addColorStop(0, "#0f1624"); bg.addColorStop(1, "#1d2a44");
    g.fillStyle = bg; g.fillRect(0, 0, 1080, 1350);
    g.textAlign = "center";
    g.fillStyle = "#8fa3c4"; g.font = "600 44px system-ui, sans-serif";
    g.fillText("Subscription self-assessment", 540, 260);
    g.fillStyle = "#ffffff"; g.font = "600 56px system-ui, sans-serif";
    g.fillText("Review your recurring charges", 540, 520);
    g.fillText("No charges detected or savings calculated", 540, 760);
    if (leak.category) {
      g.fillStyle = "#8fa3c4"; g.font = "500 44px system-ui, sans-serif";
      g.fillText("Category to review: " + String(leak.category), 540, 860);
    }
    g.fillStyle = "#3b82f6"; g.fillRect(120, 1010, 840, 120);
    g.fillStyle = "#ffffff"; g.font = "700 48px system-ui, sans-serif";
    g.fillText("Open the manual tracker · SubCreep", 540, 1090);
    g.fillStyle = "#6b7f9f"; g.font = "400 32px system-ui, sans-serif";
    g.fillText("Self-assessment only · no bank login", 540, 1250);
    return c;
  }
  function wireShare(leak) {
    var btn = document.getElementById("quiz-share");
    var copy = document.getElementById("quiz-copy");
    var msg = document.getElementById("quiz-share-msg");
    var text = "Review your subscriptions with a manual, no-bank tracker. Optional self-assessment:";
    function say(t) { if (msg) msg.textContent = t; }
    if (btn) btn.addEventListener("click", function () {
      var c = drawShareCard(leak);
      c.toBlob(function (blob) {
        if (!blob) { say("Could not create image."); return; }
        var file = null;
        try { file = new File([blob], "subcreep-leak.png", { type: "image/png" }); } catch (e) {}
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], text: text + " " + SHARE_URL }).catch(function () {});
          return;
        }
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = "subcreep-leak.png";
        document.body.appendChild(a); a.click(); a.remove();
        say("Image saved — post it with this link: " + SHARE_URL);
      }, "image/png");
    });
    if (copy) copy.addEventListener("click", function () {
      var t = text + " " + SHARE_URL;
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { say("Link copied."); }, function () { say(t); });
      else say(t);
    });
  }

  function renderQuiz() {
    var root = document.getElementById("app-root");
    if (!root) return;
    var state = { step: 0, answers: {} };

    function paint() {
      if (state.step >= QUIZ_QUESTIONS.length) {
        paintResult();
        return;
      }
      var qi = QUIZ_QUESTIONS[state.step];
      var pct = Math.round((state.step / QUIZ_QUESTIONS.length) * 100);
      var html = '<div class="quiz-wrap card">' +
        '<p class="eyebrow" style="color:var(--muted);margin:0 0 8px;font-size:0.8rem">Optional self-assessment · ' +
        (state.step + 1) + " / " + QUIZ_QUESTIONS.length + "</p>" +
        '<div class="quiz-progress"><span style="width:' + pct + '%"></span></div>' +
        '<p class="quiz-q">' + escapeHtml(qi.q) + "</p>" +
        '<div class="quiz-opts" id="quiz-opts">';
      qi.opts.forEach(function (opt, i) {
        html += '<button type="button" class="quiz-opt" data-idx="' + i + '">' +
          escapeHtml(opt.label) + "</button>";
      });
      html += "</div>" +
        '<div class="quiz-nav">' +
        (state.step > 0
          ? '<button type="button" class="btn" id="quiz-back">Back</button>'
          : "") +
        '<button type="button" class="btn btn-ghost" id="quiz-skip">Skip to free app</button>' +
        "</div>" +
        '<p class="leak-note">Self-assessment only — no charges detected or savings calculated. Data stays in your browser.</p>' +
        "</div>";
      root.innerHTML = html;

      rootQueryAll(".quiz-opt").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var idx = +btn.getAttribute("data-idx");
          var opt = qi.opts[idx];
          state.answers[qi.id] = opt.value;
          state.step += 1;
          paint();
        });
      });
      var back = document.getElementById("quiz-back");
      if (back) {
        back.addEventListener("click", function () {
          state.step = Math.max(0, state.step - 1);
          paint();
        });
      }
      document.getElementById("quiz-skip").addEventListener("click", function () {
        try { localStorage.setItem(QUIZ_DONE_KEY, "1"); } catch (e) {}
        renderApp();
      });
    }

    function paintResult() {
      var leak = estimateLeak(state.answers);
      saveQuiz(state.answers, leak);
      var html = '<div class="leak-hero">' +
        '<p class="eyebrow">Self-assessment complete</p>' +
        '<p class="sub">Your answers are a prompt to review your list, not detected charges or verified savings. Add your real subscriptions manually or import CSV to calculate your list total.</p>' +
        (leak.category ? '<p class="sub">Category to review: ' + escapeHtml(String(leak.category)) + '</p>' : '') +
        '<div class="leak-cta">' +
        '<a class="btn btn-primary btn-lg" href="' + GUMROAD_PRO_URL +
        '" target="_blank" rel="noopener">Unlock Pro · $5</a>' +
        '<button type="button" class="btn btn-lg" id="quiz-continue">Continue free → track for real</button>' +
        "</div>" +
        '<div class="leak-cta" style="margin-top:10px">' +
        '<button type="button" class="btn" id="quiz-share">Share my result (image)</button>' +
        '<button type="button" class="btn btn-ghost" id="quiz-copy">Copy link</button>' +
        "</div>" +
        '<p class="leak-note" id="quiz-share-msg" aria-live="polite"></p>' +
        '<p class="leak-note">Pro removes the Free ≤5 soft-gate (lifetime early access via Gumroad). Free core stays usable.</p>' +
        "</div>" +
        '<div class="card"><h2>What Pro adds</h2>' +
        "<ul style=\"margin:0;color:var(--muted);font-size:0.9rem\">" +
        "<li>Unlimited subscriptions (no Free ≤5 banner)</li>" +
        "<li>Same no-bank localStorage privacy</li>" +
        "<li>Unlock: enter the code from your Gumroad receipt below</li>" +
        "</ul>" +
        '<div style="margin-top:10px"><input id="pro-code" placeholder="Unlock code" style="padding:8px;width:60%"> <button type="button" class="btn" id="pro-code-btn">Unlock</button></div>' +
        '<p class="leak-note" id="pro-code-msg" aria-live="polite"></p>' +
        '<div style="margin-top:12px"><button type="button" class="btn" id="quiz-retake">Retake quiz</button></div>' +
        "</div>";
      root.innerHTML = html;
      document.getElementById("quiz-continue").addEventListener("click", function () {
        renderApp();
      });
      wireShare(leak);
      document.getElementById("pro-code-btn").addEventListener("click", function () {
        tryProCode(document.getElementById("pro-code").value, function (ok) {
          document.getElementById("pro-code-msg").textContent = ok ? "Pro unlocked on this device." : "That code didn't match. Check your Gumroad receipt.";
          if (ok) setTimeout(function () {
            try { localStorage.setItem(QUIZ_DONE_KEY, "1"); } catch (e) {}
            renderApp();
          }, 700);
        });
      });
      document.getElementById("quiz-retake").addEventListener("click", function () {
        try {
          localStorage.removeItem(QUIZ_DONE_KEY);
          localStorage.removeItem(QUIZ_KEY);
        } catch (e) {}
        state.step = 0;
        state.answers = {};
        paint();
      });
    }

    paint();
  }

  /* ---------- App page ---------- */
  function renderApp() {
    var list = loadSubs();
    var root = document.getElementById("app-root");
    if (!root) return;

    var monthly = list.reduce(function (s, x) { return s + monthlyOf(x); }, 0);
    var sorted = list.slice().sort(function (a, b) {
      return String(a.next_renewal).localeCompare(String(b.next_renewal));
    });
    var soon = sorted.filter(function (s) {
      var d = daysUntil(s.next_renewal);
      return d != null && d >= 0 && d <= 7;
    });
    var over = list.length > FREE_LIMIT;
    var pro = isPro();

    var html = "";
    if (pro) {
      html += '<div class="upsell pro-on" id="pro-banner">' +
        '<strong>Pro unlocked</strong> · lifetime early access · unlimited subscriptions · ' +
        '<span class="badge badge-pro">Pro</span>' +
        "</div>";
    } else if (over) {
      html += '<div class="upsell over" id="pro-banner">' +
        "<strong>Free soft-gate:</strong> You have <strong>" + list.length +
        "</strong> subscriptions (Free includes ≤" + FREE_LIMIT + "). " +
        'Still fully usable — <a href="' + GUMROAD_PRO_URL + '" target="_blank" rel="noopener">Buy Pro · $5</a> ' +
        'for unlimited early access · or <a href="index.html#waitlist">join the waitlist</a>' +
        "</div>";
    } else {
      html += '<div class="upsell" id="pro-banner">' +
        "Free plan: ≤" + FREE_LIMIT + " subscriptions · " +
        (FREE_LIMIT - list.length) + " slots left · " +
        '<a href="' + GUMROAD_PRO_URL + '" target="_blank" rel="noopener">Buy Pro · $5</a> ' +
        '(lifetime early access) · <a href="index.html#waitlist">Waitlist</a>' +
        "</div>";
    }

    html += '<section class="hero">' +
      '<div><p class="eyebrow">Monthly total (USD)</p>' +
      '<p class="big" id="monthly-total">' + money(monthly) + "</p>" +
      '<p class="sub">Yearly prices ÷ 12 · data stays in your browser (localStorage). Demo entries are examples, not your spending. No automatic charge discovery, cancellation, or notifications; export a reminder checklist.</p></div>' +
      '<div class="hero-side">' +
      '<div class="mini"><div class="k">Subscriptions</div><div class="v" id="sub-count">' +
      list.length + "</div></div>" +
      '<div class="mini"><div class="k">Renewing in 7 days</div><div class="v">' +
      soon.length + "</div></div>" +
      "</div></section>";

    html += '<div class="stats">' +
      '<div class="stat"><div class="label">Active</div><div class="value">' + list.length + "</div></div>" +
      '<div class="stat"><div class="label">Next 7 days</div><div class="value">' + soon.length + "</div></div>" +
      '<div class="stat"><div class="label">Plan</div><div class="value">' +
      (pro ? "Pro" : (over ? "Free (over)" : "Free")) + "</div></div></div>";

    if (soon.length) {
      html += '<div class="card"><h2>Coming up (7 days)</h2><ul class="renew-list">';
      soon.forEach(function (s) {
        var d = daysUntil(s.next_renewal);
        var when = d === 0 ? "Today" : d === 1 ? "Tomorrow" : "In " + d + " days";
        html += "<li><span><strong>" + escapeHtml(s.name) + "</strong> · " +
          money(monthlyOf(s)) + "/mo</span><span class=\"when\">" + when +
          " · " + escapeHtml(s.next_renewal) + "</span></li>";
      });
      html += "</ul></div>";
    }

    html += '<div class="card"><h2>Your subscriptions</h2>' +
      '<div class="toolbar">' +
      '<button type="button" class="btn btn-primary" id="btn-add">Add subscription</button>' +
      '<button type="button" class="btn" id="btn-export">Export CSV</button>' +
      '<label class="btn" style="margin:0 4px 4px 0;cursor:pointer">' +
      'Import CSV<input type="file" id="import-file" accept=".csv,text/csv,text/plain" class="hidden"/></label>' +
      '<button type="button" class="btn btn-good" id="btn-reminders">Reminder MD</button>' +
      '<button type="button" class="btn btn-danger" id="btn-reset">Reset demo data</button>' +
      '<button type="button" class="btn" id="btn-quiz">Self-assessment</button>' +
      "</div>";

    if (!sorted.length) {
      html += '<div class="empty">No subscriptions yet. Add one or reset demo data.</div>';
    } else {
      html += '<div style="overflow-x:auto"><table><thead><tr>' +
        "<th>Name</th><th>Price</th><th>Cycle</th><th>Next renewal</th>" +
        '<th class="col-hide-sm">Category</th><th></th></tr></thead><tbody>';
      sorted.forEach(function (s) {
        var d = daysUntil(s.next_renewal);
        var soonCls = d != null && d >= 0 && d <= 7 ? " soon-row" : "";
        var soonMark = d != null && d >= 0 && d <= 7
          ? ' <span class="soon">· ' + (d === 0 ? "today" : d + "d") + "</span>"
          : "";
        html += '<tr class="' + soonCls.trim() + '" data-id="' + escapeHtml(s.id) + '">' +
          "<td><strong>" + escapeHtml(s.name) + "</strong></td>" +
          "<td>" + money(Number(s.price)) +
          (s.cycle === "yearly" ? ' <span class="chip">≈' + money(monthlyOf(s)) + "/mo</span>" : "") +
          "</td>" +
          '<td><span class="chip">' + escapeHtml(s.cycle) + "</span></td>" +
          "<td>" + escapeHtml(s.next_renewal) + soonMark + "</td>" +
          '<td class="col-hide-sm"><span class="chip">' + escapeHtml(s.category || "Other") + "</span></td>" +
          '<td class="actions">' +
          '<button type="button" class="btn btn-sm btn-edit">Edit</button>' +
          '<button type="button" class="btn btn-sm btn-danger btn-del">Delete</button>' +
          "</td></tr>";
      });
      html += "</tbody></table></div>";
    }
    html += "</div>";

    html += '<div class="card" id="form-card"><h2 id="form-title">Add subscription</h2>' +
      '<form class="grid" id="sub-form">' +
      '<input type="hidden" id="f-id" value=""/>' +
      '<div><label for="f-name">Name</label><input id="f-name" required placeholder="Netflix"/></div>' +
      '<div><label for="f-price">Price (USD)</label><input id="f-price" type="number" min="0" step="0.01" required placeholder="15.49"/></div>' +
      '<div><label for="f-cycle">Billing cycle</label><select id="f-cycle">' +
      '<option value="monthly">monthly</option><option value="yearly">yearly</option></select></div>' +
      '<div><label for="f-next">Next renewal</label><input id="f-next" type="date" required/></div>' +
      '<div class="full"><label for="f-cat">Category</label><input id="f-cat" placeholder="Streaming" list="cat-list"/>' +
      '<datalist id="cat-list"><option value="Streaming"/><option value="Music"/><option value="AI"/>' +
      '<option value="Cloud"/><option value="Productivity"/><option value="Gaming"/><option value="Other"/></datalist></div>' +
      '<div class="full actions">' +
      '<button type="submit" class="btn btn-primary" id="btn-save">Save</button>' +
      '<button type="button" class="btn" id="btn-cancel">Cancel edit</button>' +
      "</div></form></div>";

    root.innerHTML = html;
    wireApp(list);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function clearForm() {
    document.getElementById("f-id").value = "";
    document.getElementById("f-name").value = "";
    document.getElementById("f-price").value = "";
    document.getElementById("f-cycle").value = "monthly";
    document.getElementById("f-next").value = isoDate(addDays(new Date(), 14));
    document.getElementById("f-cat").value = "";
    document.getElementById("form-title").textContent = "Add subscription";
    document.getElementById("btn-save").textContent = "Save";
  }

  function fillForm(sub) {
    document.getElementById("f-id").value = sub.id;
    document.getElementById("f-name").value = sub.name;
    document.getElementById("f-price").value = sub.price;
    document.getElementById("f-cycle").value = sub.cycle;
    document.getElementById("f-next").value = sub.next_renewal;
    document.getElementById("f-cat").value = sub.category || "";
    document.getElementById("form-title").textContent = "Edit subscription";
    document.getElementById("btn-save").textContent = "Update";
    document.getElementById("form-card").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function wireApp(list) {
    clearForm();

    document.getElementById("btn-cancel").addEventListener("click", clearForm);

    document.getElementById("btn-add").addEventListener("click", function () {
      clearForm();
      document.getElementById("form-card").scrollIntoView({ behavior: "smooth", block: "start" });
      document.getElementById("f-name").focus();
    });

    document.getElementById("sub-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var id = document.getElementById("f-id").value;
      var name = document.getElementById("f-name").value.trim();
      var price = parseFloat(document.getElementById("f-price").value);
      var cycle = document.getElementById("f-cycle").value;
      var next = document.getElementById("f-next").value;
      var category = document.getElementById("f-cat").value.trim() || "Other";
      if (!name || isNaN(price) || !next) {
        showToast("Please fill name, price, and next renewal.", true);
        return;
      }
      var cur = loadSubs();
      if (id) {
        cur = cur.map(function (s) {
          if (s.id !== id) return s;
          return { id: id, name: name, price: price, cycle: cycle, next_renewal: next, category: category };
        });
        showToast("Updated " + name);
      } else {
        cur.push({ id: uid(), name: name, price: price, cycle: cycle, next_renewal: next, category: category });
        showToast("Added " + name);
      }
      saveSubs(cur);
      renderApp();
    });

    rootQueryAll(".btn-edit").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var tr = btn.closest("tr");
        var id = tr && tr.getAttribute("data-id");
        var sub = loadSubs().find(function (s) { return s.id === id; });
        if (sub) fillForm(sub);
      });
    });

    rootQueryAll(".btn-del").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var tr = btn.closest("tr");
        var id = tr && tr.getAttribute("data-id");
        var cur = loadSubs();
        var victim = cur.find(function (s) { return s.id === id; });
        if (!victim) return;
        if (!confirm("Delete “" + victim.name + "”?")) return;
        saveSubs(cur.filter(function (s) { return s.id !== id; }));
        showToast("Deleted " + victim.name);
        renderApp();
      });
    });

    document.getElementById("btn-export").addEventListener("click", function () {
      var cur = loadSubs();
      var lines = ["name,price,cycle,next_renewal,category"];
      cur.forEach(function (s) {
        lines.push([
          csvEscape(s.name),
          csvEscape(s.price),
          csvEscape(s.cycle),
          csvEscape(s.next_renewal),
          csvEscape(s.category || "Other")
        ].join(","));
      });
      downloadText("subcreep-subscriptions.csv", lines.join("\n") + "\n", "text/csv;charset=utf-8");
      showToast("Exported " + cur.length + " rows");
    });

    document.getElementById("import-file").addEventListener("change", function (ev) {
      var file = ev.target.files && ev.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var rows = parseCsv(String(reader.result || ""));
        if (!rows.length) {
          showToast("No valid rows found in CSV.", true);
          return;
        }
        var cur = loadSubs().concat(rows);
        saveSubs(cur);
        showToast("Imported " + rows.length + " subscription(s)");
        renderApp();
      };
      reader.readAsText(file);
      ev.target.value = "";
    });

    document.getElementById("btn-reminders").addEventListener("click", function () {
      var cur = loadSubs().slice().sort(function (a, b) {
        return String(a.next_renewal).localeCompare(String(b.next_renewal));
      });
      var lines = [
        "# SubCreep renewal reminders",
        "",
        "Generated " + isoDate(new Date()) + " · D-3 style checklist",
        "",
        "## Upcoming",
        ""
      ];
      cur.forEach(function (s) {
        var d = daysUntil(s.next_renewal);
        var remind = parseDate(s.next_renewal);
        var remindStr = remind ? isoDate(addDays(remind, -3)) : "?";
        var tag = d != null && d <= 7 ? " ⚠️" : "";
        lines.push(
          "- [ ] **" + s.name + "** — " + money(Number(s.price)) + " / " + s.cycle +
          " · renews " + s.next_renewal + " · remind on " + remindStr + tag
        );
      });
      lines.push("");
      lines.push("_Monthly total ≈ " + money(cur.reduce(function (a, s) { return a + monthlyOf(s); }, 0)) + "_");
      lines.push("");
      downloadText("subcreep-reminders.md", lines.join("\n"), "text/markdown;charset=utf-8");
      showToast("Downloaded reminders.md");
    });

    document.getElementById("btn-reset").addEventListener("click", function () {
      if (!confirm("Reset to the 5 sample subscriptions? This replaces your current list.")) return;
      var seeded = makeSeed();
      saveSubs(seeded);
      try { localStorage.setItem(SEEDED_KEY, "1"); } catch (e) {}
      showToast("Demo data restored (~$70.46/mo)");
      renderApp();
    });

    var quizBtn = document.getElementById("btn-quiz");
    if (quizBtn) {
      quizBtn.addEventListener("click", function () {
        try {
          localStorage.removeItem(QUIZ_DONE_KEY);
        } catch (e) {}
        renderQuiz();
      });
    }
  }

  function rootQueryAll(sel) {
    var root = document.getElementById("app-root");
    return root ? Array.prototype.slice.call(root.querySelectorAll(sel)) : [];
  }

  /* ---------- Waitlist (landing) ---------- */
  function wireWaitlist() {
    var form = document.getElementById("waitlist-form");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      // Always mirror to localStorage so the demo works offline / before Forms is enabled.
      var fd = new FormData(form);
      if (fd.get("bot-field")) {
        e.preventDefault();
        return;
      }
      var entry = {
        name: String(fd.get("name") || "").trim(),
        email: String(fd.get("email") || "").trim(),
        note: String(fd.get("note") || "").trim(),
        at: new Date().toISOString()
      };
      if (!entry.email) {
        e.preventDefault();
        showToast("Email is required.", true);
        return;
      }
      try {
        var list = [];
        var raw = localStorage.getItem(WAITLIST_KEY);
        if (raw) list = JSON.parse(raw) || [];
        if (!Array.isArray(list)) list = [];
        list.push(entry);
        localStorage.setItem(WAITLIST_KEY, JSON.stringify(list));
      } catch (err) {}

      // If hosted on Netlify with Forms, allow native POST.
      // On file:// or when ?demo=1, prevent navigation and toast.
      var isFile = location.protocol === "file:";
      var forceDemo = /[?&]demo=1/.test(location.search);
      var isNetlify = /netlify\.app$/i.test(location.hostname);
      if (isFile || forceDemo || !isNetlify) {
        e.preventDefault();
        form.reset();
        showToast("You're on the Pro waitlist. We'll email when billing opens.");
        return;
      }

      // Netlify Forms: let the form submit; also show toast briefly.
      showToast("You're on the Pro waitlist. Thanks!");
      // Do not preventDefault — Netlify will handle POST when deployed.
      // If action is empty, browser posts to current URL which Netlify Forms intercepts.
    });
  }

  var PRO_HASH = "1ba7eef9feff9f759f978a8919cc91b4e5afec62193163818c98c5100a01066a";
  function tryProCode(raw, cb) {
    try {
      var code = String(raw || "").trim().toUpperCase();
      crypto.subtle.digest("SHA-256", new TextEncoder().encode(code)).then(function (buf) {
        var hex = Array.prototype.map.call(new Uint8Array(buf), function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
        var ok = hex === PRO_HASH;
        if (ok) { localStorage.setItem(PRO_KEY, "1"); try { stampProBadge(); } catch (e) {} }
        if (cb) cb(ok);
      });
    } catch (e) { if (cb) cb(false); }
  }

  function applyProCodeFromQuery() {
    try {
      var q = new URLSearchParams(window.location.search || "");
      var code = (q.get("code") || "").trim();
      if (code) tryProCode(code, function (ok) {
        if (!ok) return;
        try { history.replaceState(null, "", window.location.pathname); } catch (e) {}
        // Buyer arriving from Gumroad receipt: skip quiz, show app with Pro plan
        try { localStorage.setItem(QUIZ_DONE_KEY, "1"); } catch (e) {}
        if (document.getElementById("app-root")) renderApp();
      });
    } catch (e) {}
  }

  document.addEventListener("DOMContentLoaded", function () {
    applyProFromQuery();
    applyProCodeFromQuery();
    stampProBadge();
    if (document.getElementById("app-root")) {
      if (quizShouldShow()) renderQuiz();
      else renderApp();
    }
    wireWaitlist();
  });
})();
