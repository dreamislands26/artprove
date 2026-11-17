/* Art Prove runtime shim: provides claude.use("db"|"user"|"sample") outside claude.ai, backed by api.artprove.com */
(function () {
  if (window.claude && window.claude.use) return;
  var API = (location.hostname === "localhost" || location.hostname === "127.0.0.1") ? (window.AP_API || "http://127.0.0.1:8787") : "https://api.artprove.com";
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  var uid = ls("ap_uid");
  if (!uid) { uid = (crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2))); ls("ap_uid", uid); }
  try {
    var q = new URLSearchParams(location.search);
    if (q.has("owner")) { ls("ap_owner", q.get("owner")); q.delete("owner"); history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "") + location.hash); }
  } catch (e) {}
  var ownerKey = ls("ap_owner") || "";
  var listeners = new Set();
  function notify() { listeners.forEach(function (fn) { try { fn(); } catch (e) {} }); }

  async function call(path, body) {
    var r = await fetch(API + path, { method: "POST", headers: { "Content-Type": "application/json", "X-AP-UID": uid, "X-AP-Owner": ownerKey }, body: JSON.stringify(body) });
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok) { var err = new Error(j.error || ("http_" + r.status)); err.code = j.error || ("http_" + r.status); throw err; }
    return j;
  }
  function snap(id, data) { return { id: id, exists: data != null, data: function () { return data == null ? undefined : data; } }; }

  function DocRef(path) { this.path = path; this.id = path.split("/").pop(); }
  DocRef.prototype.collection = function (n) { return new ColRef(this.path + "/" + n); };
  DocRef.prototype.get = async function () { var j = await call("/api/db", { op: "get", path: this.path }); return snap(this.id, j.data); };
  DocRef.prototype.set = async function (d) { await call("/api/db", { op: "set", path: this.path, data: d }); notify(); };
  DocRef.prototype.update = async function (d) { await call("/api/db", { op: "update", path: this.path, data: d }); notify(); };
  DocRef.prototype.delete = async function () { await call("/api/db", { op: "delete", path: this.path }); notify(); };

  function ColRef(path, order, dir) { this.path = path; this.order = order || null; this.dir = dir || "asc"; }
  ColRef.prototype.doc = function (id) { return new DocRef(this.path + "/" + (id || ("d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)))); };
  ColRef.prototype.add = async function (d) { var ref = this.doc(); await ref.set(d); return ref; };
  ColRef.prototype.orderBy = function (f, dir) { return new ColRef(this.path, f, dir || "asc"); };
  ColRef.prototype.get = async function () {
    var j = await call("/api/db", { op: "list", path: this.path, orderBy: this.order, dir: this.dir });
    var docs = (j.docs || []).map(function (d) { return snap(d.id, d.data); });
    return { docs: docs, size: docs.length, empty: !docs.length };
  };
  ColRef.prototype.onSnapshot = function (cb, onErr) {
    var self = this, alive = true, last = "";
    async function tick() {
      if (!alive) return;
      try { var s = await self.get(); var sig = JSON.stringify(s.docs.map(function (d) { return [d.id, d.data()]; })); if (sig !== last) { last = sig; cb(s); } }
      catch (e) { if (onErr) onErr(e); }
    }
    tick();
    var t = setInterval(tick, 4000);
    listeners.add(tick);
    return function () { alive = false; clearInterval(t); listeners.delete(tick); };
  };

  var db = { doc: function (p) { return new DocRef(p); }, collection: function (p) { return new ColRef(p); } };
  var ownerCheck = null;
  var user = {
    id: async function () { return uid; },
    isOwner: async function () {
      if (!ownerKey) return false;
      if (!ownerCheck) ownerCheck = fetch(API + "/api/me", { headers: { "X-AP-UID": uid, "X-AP-Owner": ownerKey } }).then(function (r) { return r.json(); }).then(function (j) { return !!j.owner; }).catch(function () { return false; });
      return ownerCheck;
    },
    can: async function () { return true; }
  };
  var sample = {
    json: async function (prompt, opts) { var j = await call("/api/sample", { prompt: prompt, modelTier: opts && opts.modelTier }); return j.data; }
  };
  window.claude = { use: async function (name) { return { db: db, user: user, sample: sample }[name] || null; } };
})();
