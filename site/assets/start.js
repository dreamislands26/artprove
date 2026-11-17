(function () {
  var $ = function (s) { return document.querySelector(s); };
  var step = 1, DNA = null, EXCERPT = "", FILE = null, busy = false;
  var FREE = ["gmail.com","googlemail.com","yahoo.com","yahoo.co.uk","ymail.com","hotmail.com","outlook.com","live.com","msn.com","icloud.com","me.com","mac.com","aol.com","proton.me","protonmail.com","mail.ru","bk.ru","list.ru","inbox.ru","yandex.ru","ya.ru","yandex.com","rambler.ru","gmx.com","gmx.de","zoho.com","qq.com","163.com","126.com"];
  function v(id) { var r = document.querySelector('input[name="' + id + '"]:checked'); if (r) return r.value; var el = $("#f-" + id); return el ? el.value.trim() : ""; }
  function setRadio(name, val) { var r = val && document.querySelector('input[name="' + name + '"][value="' + val.replace(/"/g, "") + '"]'); if (r) r.checked = true; }
  (function prefill() {
    var p = new URLSearchParams(location.search), ask = null;
    try { ask = JSON.parse(sessionStorage.getItem("ap_ask") || "null"); } catch (e) {}
    var map = { hospitality: "Hospitality", "real-estate": "Real Estate", brands: "Brands", architecture: "Architecture & Design" };
    var q = p.get("q") || (ask && ask.q) || "";
    if (q) $("#f-goals").value = q;
    var f = (ask && ask.q === q && ask.f) || {};
    setRadio("sector", map[p.get("sector")] || f.Sector); setRadio("space", f.Space); setRadio("budget", f.Budget);
    if (f.City) $("#f-city").value = f.City;
  })();
  function err(msg) { $("#err").textContent = msg || ""; }
  function show(n) {
    step = n;
    document.querySelectorAll("fieldset[data-step]").forEach(function (f) { f.hidden = +f.dataset.step !== n; });
    document.querySelectorAll("#stepper li").forEach(function (li, i) { li.className = i + 1 === n ? "on" : (i + 1 < n ? "done" : ""); });
    $("#back").hidden = n === 1;
    $("#next").textContent = n === 3 ? "Send the brief →" : "Continue";
    err("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function validate(n) {
    if (n === 1) {
      if (!v("sector")) return "Please choose a sector.";
      if (!v("space")) return "Please choose the space.";
    }
    if (n === 2) { if (!v("budget")) return "Please choose a budget range."; }
    if (n === 3) {
      if (!v("company") || !v("contact")) return "Please add the company and your name.";
      var em = v("email").toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) return "Please enter a valid email address.";
      if (FREE.indexOf(em.split("@")[1]) > -1) return "Please use your business email — personal mailboxes are not accepted.";
      if (busy) return "The brandbook is still being read — one moment.";
      if (!$("#f-consent").checked) return "Please confirm that we may process the brief.";
    }
    return "";
  }
  function status(msg) { var s = $("#file-status"); s.hidden = !msg; s.textContent = msg || ""; }
  function loadPdfJs() {
    return new Promise(function (res, rej) {
      if (window.pdfjsLib) return res();
      var sc = document.createElement("script");
      sc.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      sc.onload = function () { pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"; res(); };
      sc.onerror = rej; document.head.appendChild(sc);
    });
  }
  async function readFile(file) {
    DNA = null; EXCERPT = ""; FILE = null;
    if (!file) return;
    if (file.type && file.type !== "application/pdf") { status("Please upload a PDF."); return; }
    if (file.size > 25 * 1024 * 1024) { status("The file is larger than 25 MB. Please upload a lighter version."); return; }
    FILE = file.name; busy = true; $("#drop").classList.add("ok");
    try {
      status("Reading the PDF…"); await loadPdfJs();
      var pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
      var n = Math.min(pdf.numPages, 80), text = "";
      for (var i = 1; i <= n; i++) {
        var pg = await pdf.getPage(i), tc = await pg.getTextContent();
        text += tc.items.map(function (t) { return t.str; }).join(" ") + "\n";
        status("Reading page " + i + " of " + n + "…");
        if (text.length > 60000) break;
      }
      text = text.replace(/\s+/g, " ").trim(); EXCERPT = text.slice(0, 6000);
      if (text.length < 200) { status("This PDF has little selectable text (probably images). Add brand notes in the goals; a curator will review the file with you."); busy = false; return; }
      status("Extracting Brand DNA…");
      var sample = await claude.use("sample");
      DNA = await sample.json('You are a brand strategist preparing a "Brand DNA" for art curation. From the brandbook text below, return JSON only with keys:\nbrand (string), purpose (string, quote it if the brandbook states one), personality (array of 3-6 short adjectives or phrases), visualLanguage (array of 3-6 short phrases about look, materials, colour), palette (array of colour names), audience (one sentence), subBrands (array, may be empty), artRelevantNotes (one or two sentences on what art would suit or clash with this brand).\nUse only what the text supports. Brandbook text:\n"""' + text.slice(0, 24000) + '"""', { modelTier: "default" });
      status("Read " + n + " pages · Brand DNA ready" + (DNA && DNA.personality ? ": " + DNA.personality.slice(0, 4).join(", ") : "") + ".");
    } catch (e) {
      status(e && /limit/.test(e.code || "") ? "Daily AI limit reached — the curator will prepare your Brand DNA." : "Could not read this PDF automatically. You can still send the brief; the curator will follow up.");
    }
    busy = false;
  }
  async function submit() {
    var btn = $("#next"); btn.disabled = true; btn.textContent = "Sending…";
    try {
      var db = await claude.use("db"), user = await claude.use("user"), uid = await user.id();
      var prof = db.doc("briefs/" + uid), snap = await prof.get();
      var base = snap.exists ? snap.data() : {};
      await prof.set(Object.assign({}, base, { company: v("company"), contact: v("contact"), email: v("email"), role: v("role"), updatedAt: new Date().toISOString() }));
      var id = "b" + Date.now().toString(36);
      var brief = { company: v("company"), sector: v("sector"), brand: v("brand") || v("company"), property: v("brand"), city: v("city"), space: v("space"), objectType: v("object") || "Not specified",
        budget: v("budget"), deadline: v("deadline"), size: v("size"), goals: v("goals"),
        brandFile: FILE, brandDNA: DNA, brandExcerpt: DNA ? null : (EXCERPT || null), status: "matching", source: "start", createdAt: new Date().toISOString() };
      await db.doc("briefs/" + uid + "/items/" + id).set(brief);
      $("#brief").innerHTML = '<div class="ok-box"><span class="eyebrow">Brief received</span><h2>Thank you, ' + escapeHtml(v("contact").split(" ")[0] || "") + '.</h2><p class="muted" style="max-width:460px;margin:0">We are finding your artist now. Your cabinet opens in a moment — the first match usually appears within a minute and is reviewed by a curator.</p><a class="btn" href="/catalog/?brief=' + id + '#business">Open my cabinet</a></div>';
      setTimeout(function () { location.href = "/catalog/?brief=" + id + "#business"; }, 2500);
    } catch (e) {
      btn.disabled = false; btn.textContent = "Send the brief";
      err("Could not send the brief (" + (e && e.code || "network") + "). Please try again in a minute.");
    }
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  $("#next").addEventListener("click", function () {
    var m = validate(step); if (m) { err(m); return; }
    if (step < 3) show(step + 1); else submit();
  });
  $("#back").addEventListener("click", function () { if (step > 1) show(step - 1); });
  $("#f-file").addEventListener("change", function (e) { readFile(e.target.files[0]); });
  var drop = $("#drop");
  ["dragover", "dragenter"].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); }); });
  drop.addEventListener("drop", function (e) { e.preventDefault(); var f = e.dataTransfer.files[0]; if (f) readFile(f); });
  document.querySelectorAll("#brief .inp").forEach(function (el) {
    el.addEventListener("keydown", function (e) { if (e.key === "Enter" && el.tagName !== "TEXTAREA") { e.preventDefault(); $("#next").click(); } });
  });
})();
