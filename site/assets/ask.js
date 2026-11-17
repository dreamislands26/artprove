(function () {
  var q = document.getElementById("ask-q"), box = document.getElementById("ask-chips"); if (!q) return;
  var RULES = {
    sector: [[/hotel|resort|hospitality|lobby|suite|guest room|spa|restaurant|bar\b|caf[eé]/i, "Hospitality"], [/develop|residential|condo|courtyard|real estate|sales gallery|apartment/i, "Real Estate"], [/brand|store|retail|boutique|campaign|pop-?up|collab/i, "Brands"], [/studio|architect|interior design/i, "Architecture & Design"]],
    space: [[/lobby|lounge|atrium/i, "Lobby / lounge"], [/restaurant|bar\b|caf[eé]|dining/i, "Restaurant / bar"], [/room|suite/i, "Guest rooms / suites"], [/corridor|hallway|public area/i, "Corridors / public areas"], [/spa|wellness/i, "Spa / wellness"], [/facade|outdoor|courtyard|garden|park/i, "Facade / outdoor"], [/office|meeting/i, "Office"], [/store|shop|retail|window/i, "Retail / store"]],
    city: [[/bangkok/i, "Bangkok"], [/phuket/i, "Phuket"], [/samui/i, "Koh Samui"], [/chiang mai/i, "Chiang Mai"], [/singapore/i, "Singapore"], [/moscow|москв/i, "Moscow"], [/petersburg|петербург/i, "St Petersburg"], [/dubai/i, "Dubai"]]
  };
  function budget(t) {
    var m = t.match(/\$\s?(\d+(?:[.,]\d+)?)\s?(k|000|m)?/i) || t.match(/(\d+(?:[.,]\d+)?)\s?(k|m)\b/i);
    if (!m) return null;
    var n = parseFloat(m[1].replace(",", ".")); var u = (m[2] || "").toLowerCase();
    if (u === "k" || u === "000") n *= 1000; if (u === "m") n *= 1e6;
    if (n < 5000) return "Under $5,000"; if (n < 10000) return "$5,000 – $10,000"; if (n <= 50000) return "$10,000 – $50,000"; if (n <= 150000) return "$50,000 – $150,000"; return "Over $150,000";
  }
  function pick(list, t) { for (var i = 0; i < list.length; i++) if (list[i][0].test(t)) return list[i][1]; return null; }
  function render() {
    var t = q.value, found = { Sector: pick(RULES.sector, t), Space: pick(RULES.space, t), Budget: budget(t), City: pick(RULES.city, t) };
    box.innerHTML = Object.keys(found).map(function (k) { return found[k] ? '<span class="chip">' + k + ": " + found[k] + "</span>" : '<span class="chip ph">' + k + "</span>"; }).join("");
    try { sessionStorage.setItem("ap_ask", JSON.stringify({ q: t, f: found })); } catch (e) {}
  }
  q.addEventListener("input", render);
  document.getElementById("ask").addEventListener("submit", function () { render(); });
})();
