#!/usr/bin/env python3
"""Art Prove · merge Maria's play front-end (live 17.11) with our API, cabinet and dashboards.
prev/ = last full build (23.10, 28 artists, all images); live/ = artprove.com as of 17.11; src/ = new code."""
import os, re, shutil, sys, json
H = os.path.dirname(os.path.abspath(__file__))
PREV, LIVE, SRC, OUT = [os.path.join(H, x) for x in ("prev", "live", "src", "site")]

def rd(p): return open(p, encoding="utf-8").read()
def wr(p, s):
    os.makedirs(os.path.dirname(p), exist_ok=True); open(p, "w", encoding="utf-8").write(s)
def sub1(s, old, new):
    if old not in s: sys.exit("PATCH MISS: " + old[:100])
    return s.replace(old, new, 1)
def resub(s, pat, new, flags=re.S):
    s2, n = re.subn(pat, new, s, count=1, flags=flags)
    if not n: sys.exit("REGEX MISS: " + pat[:100])
    return s2

shutil.rmtree(OUT, ignore_errors=True)
shutil.copytree(PREV, OUT)
# direction-B pages removed by Maria's release: keep them out, leave redirects for old links
for f in ["artworks.html", "artists.html", "artist.html", "platform.html", "solutions.html", "ap.css", "ap.js", "_headers"]:
    p = os.path.join(OUT, f)
    if os.path.exists(p): os.remove(p)
for d in ["start", "platform", "solutions", "how-it-works"]:
    shutil.rmtree(os.path.join(OUT, d), ignore_errors=True)
def redirect(path, target):
    wr(os.path.join(OUT, path), '<!doctype html><meta charset="utf-8"><title>ART PROVE</title><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=%s"><script>location.replace("%s")</script><a href="%s">Continue</a>' % (target, target, target))
for p, t in [("artworks.html", "/catalog/#discover"), ("artists.html", "/catalog/#artists"), ("artist.html", "/catalog/#artists"), ("platform.html", "/"), ("solutions.html", "/#spaces"),
             ("start/index.html", "/brief.html"), ("platform/index.html", "/"), ("solutions/index.html", "/#spaces"), ("how-it-works/index.html", "/")]:
    redirect(p, t)
# Maria's front-end on top
for f in os.listdir(LIVE):
    s = os.path.join(LIVE, f)
    if os.path.isdir(s): shutil.copytree(s, os.path.join(OUT, f), dirs_exist_ok=True)
    elif f != "ap-data.js": shutil.copy(s, os.path.join(OUT, f))
shutil.copy(os.path.join(SRC, "match.js"), os.path.join(OUT, "assets", "match.js"))
wr(os.path.join(OUT, "_headers"), "/*\n  X-Robots-Tag: noindex\n")

PROTO_OLD = '<div class="proto">Concept prototype · generated images · no backend</div>'
PROTO_NEW = '<div class="proto">Pilot · AI matches, checked by a curator · room visuals are concept renders</div>'
FOOT_OLD = '<span class="fn">All images are generated concept images, not real artworks.</span>'
FOOT_NEW = '<span class="fn">Room visuals are concept renders. Works shown in matches are by real artists.</span>'
API = '<script src="ap-data.js"></script>\n<script src="assets/runtime.js"></script>\n<script src="assets/match.js"></script>\n<script src="play.js"></script>'

# ---------------- index
s = rd(os.path.join(OUT, "index.html"))
s = sub1(s, PROTO_OLD, PROTO_NEW)
s = sub1(s, FOOT_OLD, FOOT_NEW)
s = s.replace('href="/catalog/">Artists</a>', 'href="/catalog/#artists">Artists</a>')
s = sub1(s, '<script src="play.js"></script>', API)
s = sub1(s, "document.getElementById('marq').innerHTML=[...A,...A].map((n,i)=>'<img src=\"img/'+n+'.jpg\" alt=\"'+(i<A.length?'Concept artwork':'')+'\" loading=\"lazy\">').join('');",
         "const R=APD.works.filter(w=>!APD.artists[w.aid].net).slice(0,14);document.getElementById('marq').innerHTML=[...R,...R].map((w,i)=>'<img src=\"img/'+w.img+'.jpg\" alt=\"'+(i<R.length?w.title+', '+w.by:'')+'\" loading=\"lazy\">').join('');")
s = sub1(s, "document.getElementById('req').addEventListener('submit',e=>{e.preventDefault();const m=document.getElementById('r-mail');if(!m.value.includes('@')){m.focus();return;}document.getElementById('r-ok').hidden=false;});",
         "document.getElementById('req').addEventListener('submit',async e=>{e.preventDefault();const m=document.getElementById('r-mail'),ok=document.getElementById('r-ok');\n"
         "if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(m.value.trim())||APM.isFree(m.value)){ok.hidden=false;ok.style.color='#C62828';ok.textContent='Use your work email, not a personal one.';m.focus();return}\n"
         "const b=e.submitter;b.disabled=true;try{await APM.lead({space:document.getElementById('r-space').value,city:document.getElementById('r-city').value.trim(),email:m.value.trim()});ok.style.color='';ok.textContent='Thank you. A curator will send your match within 48 hours.'}catch(_){ok.style.color='#C62828';ok.textContent='Could not send. Try again in a minute.'}ok.hidden=false;b.disabled=false});")
wr(os.path.join(OUT, "index.html"), s)

# ---------------- play / research
for f in ["play.html", "research.html"]:
    s = rd(os.path.join(OUT, f))
    s = s.replace(PROTO_OLD, PROTO_NEW).replace(FOOT_OLD, FOOT_NEW).replace('href="/catalog/">Artists</a>', 'href="/catalog/#artists">Artists</a>')
    s = s.replace('<p class="note">The style goes straight into your brief. Concept images only.</p>', '<p class="note">The style goes straight into your brief. Swipe images are concept images; your matches use real works.</p>')
    wr(os.path.join(OUT, f), s)

# ---------------- brief
s = rd(os.path.join(OUT, "brief.html"))
s = sub1(s, PROTO_OLD, PROTO_NEW)
s = s.replace('href="/catalog/">Artists</a>', 'href="/catalog/#artists">Artists</a>')
s = sub1(s, '<script src="play.js"></script>', API)
s = sub1(s, '<button class="tile txt" type="button" data-v="Not sure" aria-pressed="false" data-x>',
         '<button class="tile" type="button" data-v="Online collaboration" aria-pressed="false"><span class="ck">✓</span><span class="im"><img src="img/play-blue-room.jpg" alt=""></span><b>Online collab</b></button>\n      <button class="tile txt" type="button" data-v="Not sure" aria-pressed="false" data-x>')
s = sub1(s, "store.set('ap_brief',{...st,city:document.getElementById('loc').value.trim()});location.href='generate.html';return}",
         "const full={...st,city:document.getElementById('loc').value.trim()};store.set('ap_brief',full);next.disabled=true;next.innerHTML='Saving your brief…';\n"
         "    APM.saveBrief(full,store.get('ap_style',null)).then(r=>{store.set('ap_brief_id',r.id);location.href='generate.html?brief='+encodeURIComponent(r.id)}).catch(()=>{store.set('ap_brief_id',null);location.href='generate.html'});return}")
wr(os.path.join(OUT, "brief.html"), s)

# ---------------- generate
s = rd(os.path.join(OUT, "generate.html"))
s = sub1(s, PROTO_OLD, PROTO_NEW)
s = sub1(s, ".vis .badge{", ".vis .wk{position:absolute;left:50%;top:44%;width:26%;aspect-ratio:4/5;object-fit:cover;transform:translate(-50%,-50%);border:6px solid #fff;box-shadow:0 22px 40px -16px rgba(0,0,0,.6);z-index:2;animation:none}\n.dir .wt{font:500 12px/1.3 var(--mono);color:var(--ink-2);letter-spacing:.02em}\n.whyp{background:#fff;border-radius:22px;padding:18px 20px;display:grid;gap:8px}.whyp ul{margin:0;padding-left:18px;display:grid;gap:4px;color:var(--ink-2);font-size:15px}\n.uf{display:grid;gap:10px}.uf label{font:500 11px/1 var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--ink-2)}.uf input{font:inherit;padding:13px 14px;border-radius:14px;border:1.5px solid var(--line)}.uf .err{color:#C62828;font-size:14px}\n.vis .badge{")
s = sub1(s, '<div class="dirs" id="dirs"></div>', '<div class="whyp"><span class="tag" id="msrc" style="color:var(--blue)"></span><ul id="why"></ul></div>\n    <div class="dirs" id="dirs"></div>')
s = sub1(s, '<div class="kv"><div><span>Artworks</span><b class="blur">$ 00,000</b>', '<div class="kv" id="bud"><div><span>Artworks</span><b class="blur">$ 00,000</b>')
s = sub1(s, '<div class="unlock">', '<div class="unlock" id="unl">')
s = sub1(s, '<div class="plans">', '<div class="plans" id="plans">')
s = sub1(s, '<button class="pill p-line" type="button" data-pay style="color:var(--blue)">Choose</button>', '<button class="pill p-line" type="button" data-pay="One space" style="color:var(--blue)">Choose</button>')
s = sub1(s, '<button class="pill p-blue" type="button" data-pay>Choose</button>', '<button class="pill p-blue" type="button" data-pay="Business">Choose</button>')
s = sub1(s, '<p class="fine">Prices, plan contents and the size of the artist pool are placeholders to set. Payment is not part of this prototype.</p>',
         '<form class="uf" id="uf" hidden novalidate><h3 style="font-size:20px">Open your proposal</h3><p class="fine" style="font-size:14px">During the pilot, unlocking is free. Leave your work email and a curator follows up with prices and availability.</p>'
         '<label for="u-mail">Work email</label><input id="u-mail" type="email" autocomplete="email" placeholder="you@company.com" required>'
         '<label for="u-name">Your name</label><input id="u-name" autocomplete="name">'
         '<label for="u-co">Company or property</label><input id="u-co" autocomplete="organization" required>'
         '<p class="err" id="u-err" hidden></p><button class="pill p-blue p-xl" type="submit">Unlock my proposal</button></form>\n'
         '  <p class="fine">Prices and plan contents are launch proposals. Payment is not live yet.</p>')
s = resub(s, r'<script src="play.js"></script>\n<script>\n.*?</script>', lambda m: API + "\n<script>\n" + rd(os.path.join(SRC, "generate.js")) + "</script>")
wr(os.path.join(OUT, "generate.html"), s)

# ---------------- cabinet + dashboards: header in Maria's style, online track, new request types
BAR_CSS_OLD = "#ap-bar{position:sticky;top:0;z-index:9999;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 24px;height:60px;background:#f5f4f0;color:#141416;border-bottom:1px solid #dedbd3;font:500 14px/1 Geist,system-ui,sans-serif}"
BAR_CSS_NEW = "#ap-bar{position:sticky;top:0;z-index:9999;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 24px;height:64px;background:#2433E6;color:#fff;font:500 14px/1 Geist,system-ui,sans-serif}#ap-bar a{color:#fff!important}#ap-bar .lg{font:800 16px/1 Unbounded,'Arial Black',sans-serif!important;letter-spacing:-.02em}#ap-bar .lg i{font-style:normal;color:#fff!important}#ap-bar nav a:hover,#ap-bar nav a.on{background:rgba(255,255,255,.16)!important}#ap-bar nav a.cta{background:#fff!important;color:#2433E6!important;font-weight:600}"
def bar(on):
    items = [("/", "Home"), ("/play.html", "Style"), ("/catalog/#artists", "Artists"), ("/catalog/#business", "Cabinet")]
    return ('<div id="ap-bar"><a href="/" class="lg">ART <i>PROVE</i></a><nav>' + "".join('<a href="%s" class="%s">%s</a>' % (h, "on" if l == on else "", l) for h, l in items)
            + '<a class="cta" href="/brief.html">Get matched →</a></nav></div>')
for d, on in [("catalog", "Cabinet"), ("studio", ""), ("engine", "")]:
    p = os.path.join(OUT, d, "index.html"); s = rd(p)
    s = resub(s, r'<div id="ap-bar">.*?</nav></div>', lambda m: bar(on))
    if BAR_CSS_OLD in s: s = s.replace(BAR_CSS_OLD, BAR_CSS_NEW, 1)
    else: s = s.replace("</head>", "<style>" + BAR_CSS_NEW + "</style></head>", 1)
    if "Unbounded" not in s.split("</head>")[0]:
        s = s.replace("</head>", '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@800&display=swap"></head>', 1)
    s = s.replace('href="/start/"', 'href="/brief.html"').replace('href="/artworks.html"', 'href="/catalog/#discover"')
    wr(p, s)

c = rd(os.path.join(OUT, "catalog", "index.html"))
ONLINE = r"""const ONLINE=(brief.track==="Online"||brief.track==="Both");
    const prompt=ONLINE?`You are the curator-matchmaker of Art Prove for ONLINE brand collaborations: an artist's work integrated into a brand's identity, social media, campaigns and performance creative.
Pick ONE best-fit artist. Score five dimensions with levels "strong","good","weak","unknown" (unknown when there is no evidence):
brand (visual language vs Brand DNA: palette, mood, values), scrollstop (does the work stop a scroller in 0.3 seconds), adapt (crops to 9:16, 1:1, 4:5; pattern and motion potential; depth of series), story (artist's themes connect to the brand; process is filmable), rights (licensing likely available; network:true artists are known from portfolio only, so rights and fees are unknown).
Never invent prices, follower counts or availability. If no artist fits, artistId "none".

BRIEF:
${JSON.stringify({company:brief.company,brand:brief.brand,track:brief.track,need:brief.objectType,budget:brief.budget,deadline:brief.deadline,goals:brief.goals,style:brief.style,brandDNA:brief.brandDNA,brandbookExcerpt:brief.brandExcerpt})}

ARTISTS AND WORKS:
${JSON.stringify(catalogueForAI())}

Return JSON only:
{"artistId":"one artist id from the list above, or none",
 "fit":{"brand":{"level":"","reason":"one sentence"},"scrollstop":{"level":"","reason":""},"adapt":{"level":"","reason":""},"story":{"level":"","reason":""},"rights":{"level":"","reason":""}},
 "why":["3 short reasons tied to the brand and its channels"],
 "works":[{"id":"work id from the list","note":"role: hero, pattern or activation, max 14 words"}],
 "caveats":["what must be confirmed with the artist and in rights before launch"],
 "concept":{"title":"","idea":"2 sentences, to be approved by the artist","keyVisual":"","carriers":["carrier: format and size"],"contentPlan":["Week 1: ...","Week 2: ...","Week 3: ...","Week 4: ..."],"kpis":["metric and how it is measured"]},
 "alternates":["other artist ids, if any"]}
Pick 2-3 works. Plain English, no hype.`:`"""
c = sub1(c, "    const prompt=`You are the curator-matchmaker of Art Prove, a platform", ONLINE + "You are the curator-matchmaker of Art Prove, a platform")
c = sub1(c, 'const names={aesthetic:"Aesthetic",conceptual:"Conceptual",project:"Project",commercial:"Commercial"};',
         'const names=(m.fit&&m.fit.brand)?{brand:"Brand",scrollstop:"Scroll-stop",adapt:"Adaptability",story:"Story & collab",rights:"Rights"}:{aesthetic:"Aesthetic",conceptual:"Conceptual",project:"Project",commercial:"Commercial"};')
c = sub1(c, 'm.concept.materials,m.concept.placement,m.concept.scale].filter(Boolean).map(esc).join(" · ")}</p>',
         'm.concept.materials,m.concept.placement,m.concept.scale].filter(Boolean).map(esc).join(" · ")}</p>${m.concept.keyVisual?`<p style="margin-top:8px"><b>Key visual:</b> ${esc(m.concept.keyVisual)}</p>`:""}${(m.concept.carriers||[]).length?`<p style="margin-top:8px"><b>Carriers:</b> ${m.concept.carriers.map(esc).join(" · ")}</p>`:""}${(m.concept.contentPlan||[]).length?`<ul style="margin:8px 0 0;padding-left:18px">${m.concept.contentPlan.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}${(m.concept.kpis||[]).length?`<p style="margin-top:8px"><b>KPIs:</b> ${m.concept.kpis.map(esc).join(" · ")}</p>`:""}')
c = sub1(c, 'const facts=[["Property",b.property],', 'const facts=[["Track",b.track],["Style",(b.style&&b.style.tags||[]).join(", ")],["Property",b.property],')
c = sub1(c, ':r.type==="commission"?"Commission: "',
         ':r.type==="unlock"?"Unlock request ("+esc(r.plan||"pilot")+"): "+esc(r.company||"")+" · "+esc(r.name||"")+" · "+esc(r.email||"")+(r.briefId?" · brief "+esc(r.briefId):""):r.type==="demo"?"Demo request: "+esc(r.space||"")+" · "+esc(r.city||"")+" · "+esc(r.email||""):r.type==="commission"?"Commission: "')
c = c.replace('href="/start/"', 'href="/brief.html"').replace('href="/brief.html#business"', 'href="/brief.html"')
wr(os.path.join(OUT, "catalog", "index.html"), c)

# leftovers that pointed at removed pages
for root, _, files in os.walk(OUT):
    for f in files:
        if f.endswith(".html"):
            p = os.path.join(root, f); s = rd(p)
            s2 = s.replace('href="/artworks.html"', 'href="/catalog/#discover"').replace('href="/artists.html"', 'href="/catalog/#artists"').replace('href="/platform.html"', 'href="/"').replace('href="/solutions.html"', 'href="/#spaces"')
            if s2 != s: wr(p, s2)
print("built", OUT, sum(len(f) for _, _, f in os.walk(OUT)), "files")
