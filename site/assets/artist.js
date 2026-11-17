(function () {
  var f = document.getElementById("artist-form"); if (!f) return;
  var v = function (id) { return document.getElementById(id).value.trim(); };
  f.addEventListener("submit", async function (e) {
    e.preventDefault();
    var er = document.getElementById("a-err"), btn = document.getElementById("a-btn");
    if (!v("a-name") || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v("a-email")) || !/^https?:\/\//.test(v("a-link"))) { er.textContent = "Please add your name, a valid email and a portfolio link (starting with http)."; return; }
    btn.disabled = true; btn.textContent = "Sending…"; er.textContent = "";
    try {
      var db = await claude.use("db"), user = await claude.use("user"), uid = await user.id();
      var prof = db.doc("briefs/" + uid), snap = await prof.get();
      if (!snap.exists) await prof.set({ company: "Artist application", contact: v("a-name"), email: v("a-email"), createdAt: new Date().toISOString() });
      await db.doc("briefs/" + uid + "/requests/r" + Date.now().toString(36)).set({ type: "artist", name: v("a-name"), email: v("a-email"), portfolio: v("a-link"), message: v("a-note"), status: "new", createdAt: new Date().toISOString() });
      f.innerHTML = '<div class="ok-box"><span class="eyebrow">Application received</span><h3>Thank you.</h3><p class="muted" style="margin:0">We review portfolios weekly and will reply by email.</p></div>';
    } catch (x) { btn.disabled = false; btn.textContent = "Send application"; er.textContent = "Could not send right now. Please try again in a minute."; }
  });
})();
