/* Art Prove · ranking module v2 (17.11).
   Scores every work against a brief on nine criteria and picks a delivery route:
   existing work (fastest) · adaptation of the artist's language to the site (durable material / new scale) · new commission.
   Used directly for the quick match and as a pre-ranked shortlist + hints for the AI curator. Exposes window.APR. */
(function(){
  const D=()=>window.APD||{works:[],artists:{}};

  /* ---------- criteria ---------- */
  const CRIT={
    concept:'Brand & campaign', structure:'Structure & placement', materials:'Materials & climate', size:'Size & scale',
    colour:'Colour', ergonomics:'Purpose & ergonomics', safety:'Safety', budget:'Budget', speed:'Speed'};
  const CRIT_ONLINE={concept:'Brand & story', colour:'Colour', adapt:'Formats & adaptation', scrollstop:'Scroll-stop', rights:'Rights & licensing', budget:'Budget', speed:'Speed'};

  /* ---------- work features ---------- */
  const DUR=/(bronze|steel|stainless|metal|alumin|iron|stone|marble|granite|concrete|ceramic|porcelain|glaz|terracotta|fib(re|er)glass|enamel|mosaic)/i;
  const SEMI=/(earthenware|wood|resin|epoxy|plexi|acrylic sheet|glass)/i;
  const FRAG=/(bags?\b|found object|plastic|paper|gouache|ink|watercolou?r|pastel|charcoal|canvas|linen|textile|fabric|cloth|hair|foam|papier|feather|silk|thread|yarn|wool|cardboard|nails|oil on|acrylic on)/i;
  const SMALL=/(bead|nail|hair|feather|sequin|button)/i;
  const SHARP=/(glass|wire|shard|nail)/i;
  const kindOf=m=>/furniture/i.test(m)?'furniture':/installation/i.test(m)?'installation':/sculpture|ceramic|object/i.test(m)?'object':/textile/i.test(m)?'textile':'wall';
  function dimsCm(s){if(!s)return null;const t=String(s).replace(/,/g,'.');const n=(t.match(/\d+(\.\d+)?/g)||[]).map(Number);if(!n.length)return null;
    const k=/mm\b/.test(t)?0.1:(/\bm\b/.test(t)&&!/cm/.test(t))?100:1;return Math.max(...n.map(x=>x*k))}
  const CLS=cm=>cm==null?null:cm<100?'S':cm<250?'M':cm<600?'L':'XL';
  const ORD={S:0,M:1,L:2,XL:3};
  const CACHE={};
  function feat(w){if(CACHE[w.id])return CACHE[w.id];const mat=(w.materials||'')+' '+(w.medium||'');const cm=dimsCm(w.dim);
    const dur=DUR.test(mat)&&!FRAG.test(mat)&&!/earthenware/i.test(mat)?2:(DUR.test(mat)||SEMI.test(mat))?1:0;
    return CACHE[w.id]={kind:kindOf(w.medium||''),dur,frag:FRAG.test(mat),small:SMALL.test(mat),sharp:SHARP.test(mat),cm,cls:CLS(cm)||({Small:'S',Medium:'M',Large:'L'}[w.scale]||null),pal:w.pal||''}}

  /* ---------- colour ---------- */
  function hsl(hex){const m=/^#?([0-9a-f]{6})$/i.exec(hex||'');if(!m)return null;const v=parseInt(m[1],16),r=(v>>16&255)/255,g=(v>>8&255)/255,b=(v&255)/255;
    const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;let h=0,s=0;if(mx!==mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);
      h=mx===r?((g-b)/d+(g<b?6:0)):mx===g?((b-r)/d+2):((r-g)/d+4);h*=60}return {h,s,l}}
  function tone(colors){const ch=(colors||[]).map(hsl).filter(c=>c&&c.s>.25&&c.l>.12&&c.l<.9);if(!ch.length)return (colors||[]).length?'neutral':null;
    const warm=ch.filter(c=>c.h<70||c.h>=320).length,cool=ch.filter(c=>c.h>=150&&c.h<300).length,hi=ch.filter(c=>c.s>.6).length;
    if(hi>=2&&warm&&cool)return 'bold';return warm>=cool?'warm':'cool'}
  const TAGTONE={Warm:'warm',Blue:'cool',Calm:'cool',Bold:'bold',Nature:'warm'};

  /* ---------- brief normalisation (accepts brief v2 and the older flat brief) ---------- */
  const SIZEW={Small:'S',Medium:'M',Large:'L',Monumental:'XL'};
  const BUD={'Under $25k':0,'$25–100k':1,'$100k+':3};
  const WHEN={ASAP:0,'3–6 months':1,Later:2};
  function norm(b){b=b||{};const s=b.site||{},p=b.purpose||{},dz=b.design||{},br=b.brand||{},c=b.campaign||{},on=b.online||{};
    const track=b.track||'Offline';const online=/Online/.test(track);const physical=track!=='Online';
    const avail=Math.max(+s.w||0,+s.h||0)*100||null;
    const want=SIZEW[s.sizeClass]||CLS(avail?avail*(s.placement==='Wall'?.6:.8):null);
    const brandColors=[...(br.colors||[]),...((br.book&&br.book.colors)||[])];
    const tags=(b.style&&b.style.tags)||[];
    const target=tone(brandColors)||tone(dz.colors)||(tags.map(t=>TAGTONE[t]).find(Boolean)||null);
    const words=[br.book&&br.book.text,br.notes,c.product,c.audience,c.goal,c.message,on.message,on.product,on.audience,dz.notes,b.goals].filter(Boolean).join(' ').toLowerCase();
    return {track,online,physical,outdoor:/Outdoor|Semi/.test(s.setting||''),setting:s.setting||'',exposure:s.exposure||[],placement:s.placement||'',avail,want,
      traffic:s.traffic||'',risks:s.risks||[],level:p.level==null?null:+p.level,functions:p.functions||[],target,brandColors,roomColors:dz.colors||[],
      words,budget:BUD[b.budget]==null?null:BUD[b.budget],when:WHEN[b.deadline||b.when]==null?null:WHEN[b.deadline||b.when],
      routes:b.routes||[],lowMaint:!!(b.constraints&&b.constraints.lowMaintenance),reqs:(b.constraints&&b.constraints.safety)||[],space:b.space||''};}

  /* ---------- scoring ---------- */
  const STOP=new Set('about their there which would could should these those where while within without other being brand brands company space spaces using based through every more most into also with from that this have your will they them what when work works artist artists piece pieces design'.split(' '));
  const toks=t=>new Set(String(t||'').toLowerCase().match(/[a-zа-яё]{5,}/g)?.filter(x=>!STOP.has(x))||[]);
  const dist=(a,b)=>{const x=parseInt(a.slice(1),16),y=parseInt(b.slice(1),16);return Math.abs((x>>16)-(y>>16))+Math.abs((x>>8&255)-(y>>8&255))+Math.abs((x&255)-(y&255))};
  const L=s=>s==null?'unknown':s>=3?'strong':s>=2?'good':'weak';

  function scoreWork(w,n){
    const f=feat(w),A=D().artists[w.aid]||{},c={},note={},flags=[],unk={};
    // structure & placement
    const P=n.placement,K=f.kind;
    const STR={Wall:{wall:3,textile:3,installation:1,object:1,furniture:0},Floor:{object:3,furniture:3,installation:3,textile:1,wall:0},
      Suspended:{installation:3,textile:2,object:1,wall:0,furniture:0},Facade:{wall:2,textile:1,installation:1,object:1,furniture:0},
      Landscape:{object:3,installation:3,furniture:2,textile:0,wall:0}};
    if(n.functions.includes('Seating'))c.structure=K==='furniture'?3:1;
    else if(P&&STR[P])c.structure=STR[P][K];else c.structure=n.physical?null:2;
    note.structure=P?(K+' for a '+P.toLowerCase()+' placement'):'placement not given';
    // materials & climate
    if(!n.physical)c.materials=null;
    else if(n.outdoor){c.materials=f.dur===2?3:f.dur===1?2:0;note.materials=f.dur===2?'durable outdoors':f.dur===1?'outdoors only with treatment / UV coating':'indoor material as is';
      if(n.exposure.includes('Salt air')&&/steel|iron|metal/i.test(w.materials||'')&&!/stainless|bronze/i.test(w.materials||'')){c.materials=Math.min(c.materials,1);flags.push('salt air corrodes plain metal')}}
    else{c.materials=3;note.materials='indoor';if(n.exposure.includes('Humidity')&&f.frag){c.materials=1;note.materials='humidity risk for '+(w.materials||'this material').toLowerCase()}}
    if(n.lowMaint&&f.frag&&c.materials!=null){c.materials=Math.max(0,c.materials-1);flags.push('needs regular care')}
    // size & scale
    if(n.want&&f.cls){const d=Math.abs(ORD[n.want]-ORD[f.cls]);c.size=[3,2,1,0][d];note.size=(w.dim||f.cls)+' vs a '+n.want+' spot'}else{c.size=null;if(n.want)unk.size=1;note.size=n.want?'size of this work not known yet':'space size not given'}
    if(n.avail&&f.cm&&f.cm>n.avail){c.size=0;flags.push('larger than the available space')}
    // colour
    if(n.target&&f.pal){const t=n.target,p=f.pal;c.colour=p===t?3:(p==='neutral'||t==='neutral'||(p==='bold'&&t==='warm'))?2:1;note.colour=p+' palette vs a '+t+' brand / room';
      const ref=n.brandColors.length?n.brandColors:n.roomColors;const near=ref.filter(h=>(w.hex||[]).some(x=>dist(h,x)<80)).length;
      if(near){c.colour=Math.min(3,c.colour+1);note.colour+='; shares '+near+' of your colours'}}
    else if(n.target){c.colour=null;unk.colour=1;note.colour='palette of this work not known'}else{c.colour=null;note.colour='no brand or room colours yet'}
    // purpose & ergonomics
    if(n.physical){const lv=n.level==null?1:n.level;const F=n.functions;
      const fs=F.map(x=>x==='Seating'?(K==='furniture'?3:1):x==='Photo spot'?((f.cls==='L'||f.cls==='XL'||f.pal==='bold'||K==='installation')?3:2):
        x==='Acoustic'?((K==='textile'||/relief|felt|textile/i.test(w.medium+w.materials))?3:1):x==='Wayfinding'?(K==='wall'?2:1):x==='Landmark'?((K==='object'||K==='installation')&&(f.cls==='L'||f.cls==='XL')?3:1):
        (x==='Shade'||x==='Lighting')?1:2);
      const fn=fs.length?fs.reduce((a,b)=>a+b,0)/fs.length:(K==='furniture'?3:1);
      const ct=K==='furniture'?2:3;
      c.ergonomics=Math.round(ct*(1-lv/4)+fn*(lv/4));note.ergonomics=(lv<=1?'object of contemplation':lv>=3?'functional use: '+(F.join(', ')||'everyday use'):'mix of looking and using')}
    else c.ergonomics=null;
    // safety
    if(n.physical){let s=3;const kids=n.risks.includes('Children'),pub=n.risks.includes('Unattended public'),hi=n.traffic==='High';
      if(kids&&(f.small||f.sharp)){s=0;flags.push('small parts or sharp elements near children')}
      if((hi||pub)&&f.frag){s=Math.min(s,1);flags.push('fragile surface in a busy or unattended area: glazing, barrier or a durable version')}
      if((K==='object'||K==='installation')&&(f.cls==='L'||f.cls==='XL')){s=Math.min(s,2);flags.push('anchoring and load check')}
      if(K==='furniture'&&n.level>=3&&/hair|textile|cloth/i.test(w.materials||'')){s=Math.min(s,1);flags.push('hygiene and fire rating for a used piece')}
      if(n.reqs.includes('Fire-rated')&&f.frag){s=Math.min(s,1);flags.push('fire-rating certificate needed')}
      c.safety=s;note.safety=s===3?'no special risks found':'see notes'}else c.safety=null;
    // route
    let route='existing';
    const fitsAsIs=(c.structure==null||c.structure>=2)&&(c.materials==null||c.materials>=2)&&(c.size==null||c.size>=2)&&(c.safety==null||c.safety>=2);
    if(!fitsAsIs||n.routes.length&&!n.routes.includes('Existing work')&&!n.routes.includes('Not sure')){
      const translatable=K==='wall'||K==='textile'||/print|graphic|collage|drawing|painting/i.test(w.medium||'');
      route=(translatable&&!n.routes.includes('New commission')&&!(n.routes.length===1&&n.routes[0]==='New commission'))||n.routes.includes('Adaptation')?'adapt':'commission'}
    if(!n.physical)route=n.routes.includes('New commission')?'commission':'adapt';
    if(route!=='existing'&&n.physical){ // a new version solves material / scale problems, at the cost of time and money
      if(c.materials!=null&&c.materials<2){c.materials=2;note.materials=n.outdoor?'made in a durable outdoor material':'made in a suitable material'}
      if(c.size!=null&&c.size<2){c.size=2;note.size='made to the size of the space'}
      if(c.structure!=null&&c.structure<2&&route==='commission'){c.structure=2;note.structure='new piece designed for the placement'}
      if(c.safety!=null&&c.safety<2){c.safety=2}}
    // budget & speed
    const lic=!n.physical&&route==='adapt';const cost=lic?0:route==='existing'?((f.cls==='L'||f.cls==='XL')?1:0):route==='adapt'?1:((n.want==='L'||n.want==='XL')?3:2);
    if(n.budget!=null){c.budget=cost<=n.budget?3:cost===n.budget+1?1:0;note.budget=(['lower','mid','high','highest'][cost])+' cost route; prices confirmed by the artist'}else{c.budget=null;note.budget='budget not given'}
    const time=lic?0:{existing:0,adapt:1,commission:2}[route];
    if(n.when!=null){c.speed=time<=n.when?3:time===n.when+1?1:0}else c.speed=null;note.speed=lic?'1–3 weeks: licence and adaptation of existing works':{existing:'2–4 weeks',adapt:'6–10 weeks',commission:'3–6 months'}[route];
    // brand & campaign (concept)
    if(n.words){const bt=toks(n.words),at=toks([A.statement,(A.themes||[]).join(' '),(A.materials||[]).join(' '),w.kw,w.title].join(' '));let k=0;at.forEach(x=>{if(bt.has(x))k++});
      c.concept=k>=6?3:k>=3?2:k>=1?1:0;note.concept=k?'shared themes with the brand text':'no shared themes found in the brand text'}else{c.concept=null;note.concept='no brandbook or campaign yet'}
    // online-only criteria
    if(n.online){c.adapt=(K==='wall'||K==='textile')?3:2;c.scrollstop=(f.pal==='bold'||K==='installation'||f.cls==='L'||f.cls==='XL')?3:2;c.rights=A.net?null:2;if(A.net)unk.rights=1;note.adapt=K+' adapts to 9:16 / 1:1 / 4:5';note.scrollstop=f.pal+' palette, '+(f.cls||'unknown')+' scale';note.rights=A.net?'licensing to agree (portfolio artist)':'pilot artist, licensing discussed'}
    // weights
    const Wt={concept:1.2,structure:1,materials:n.outdoor?2:1,size:1,colour:1,ergonomics:n.level>=3?1.6:1,safety:(n.risks.length||n.traffic==='High')?1.6:1,budget:.8,speed:.8,adapt:1,scrollstop:1,rights:.6};
    if(!n.physical){Wt.structure=Wt.materials=Wt.size=Wt.ergonomics=Wt.safety=0}
    let num=0,den=0;Object.keys(c).forEach(k=>{if(!Wt[k])return;const v=c[k]!=null?c[k]:unk[k]?1.5:null;if(v==null)return;num+=v*Wt[k];den+=3*Wt[k]});
    const total=den?num/den:0.5;
    return {id:w.id,aid:w.aid,total,route,c,note,flags,f}}

  function rank(brief,exclude){
    exclude=exclude||[];const n=norm(brief);const by={};
    D().works.forEach(w=>{if(!w.aid||exclude.includes(w.aid))return;(by[w.aid]=by[w.aid]||[]).push(scoreWork(w,n))});
    return Object.entries(by).map(([aid,l])=>{l.sort((a,b)=>b.total-a.total);const t=l.slice(0,3);
      const s=(t[0]?t[0].total*.5:0)+(t[1]?t[1].total*.3:0)+(t[2]?t[2].total*.2:0)+((D().artists[aid]||{}).net?0:.03);
      return {aid,score:s,works:l}}).sort((a,b)=>b.score-a.score);
  }

  /* criteria summary for one artist (from its top work, notes merged) */
  function criteria(r,n){const top=r.works[0];const keys=Object.keys(n.physical?CRIT:{}).concat(n.online?Object.keys(CRIT_ONLINE):[]).filter((k,i,a)=>a.indexOf(k)===i);
    const out={};keys.forEach(k=>{const s=top.c[k];out[k]={level:L(s),reason:top.note[k]||(s==null?'to confirm with the curator':'')}});return out}

  const ROUTE={existing:'Existing work',adapt:"Adaptation of the artist's language",commission:'New commission'};
  function spec(r,n,brief){const top=r.works[0],w=D().works.find(x=>x.id===top.id)||{},A=D().artists[r.aid]||{};
    if(!n.physical){const on=(brief&&brief.online)||{};return {route:top.route,routeName:top.route==='commission'?'New commission':'Licence and adaptation of existing works',
      structure:'Campaign artwork'+((on.formats||[]).length?': '+on.formats.join(', '):': key visual and content series'),materials:'Existing works by '+(A.short||'the artist')+(top.route==='commission'?', plus a new piece made for the launch':', adapted by the artist'),
      size:'Formats 9:16, 1:1, 4:5'+((on.channels||[]).length?' for '+on.channels.join(', '):''),palette:(n.brandColors.length?'Tuned to the brand colours':'From the artist\'s palette')+(w.pal?' · work palette: '+w.pal:''),
      ergonomics:on.goal?'Built for '+on.goal.toLowerCase():'',safety:'',budget:'Price on request · licence fee depends on channels, territory and term',timeline:top.note.speed,maintenance:'Licence term and credits agreed in writing'}}
    const mats=top.route==='existing'?(w.materials||w.medium):n.outdoor?'Durable outdoor version (e.g. enamel or printed aluminium, ceramic, powder-coated steel) of '+(A.short||'the artist')+"'s motifs — to agree with the artist":'In the artist\'s own materials: '+((A.materials||[]).slice(0,3).join(', ')||w.materials||'');
    return {route:top.route,routeName:ROUTE[top.route],
      structure:(top.f.kind==='wall'?'Wall piece':top.f.kind==='furniture'?'Functional object':top.f.kind==='textile'?'Textile piece':'Free-standing object')+(n.placement?' · '+n.placement.toLowerCase():''),
      materials:mats,size:top.route==='existing'?(w.dim||'confirm with the artist'):(n.want?'Made to a '+({S:'small',M:'medium',L:'large',XL:'monumental'}[n.want])+' format for the space':'Sized to the space after a site visit'),
      palette:(n.brandColors.length?'Tuned to the brand colours':n.target?'Kept to a '+n.target+' palette':'From the artist\'s palette')+(w.pal?' · work palette: '+w.pal:''),
      ergonomics:top.note.ergonomics||'',safety:top.flags.length?top.flags.join('; '):'No special risks found; confirm on site',
      budget:'Price on request · '+top.note.budget,timeline:top.note.speed,maintenance:n.outdoor?'Seasonal check and cleaning; coatings renewed as advised':'Dusting; check fixings yearly'}}

  function uvp(r,n){const route=r.works[0].route;return {
    faster:route==='existing'?'An existing work: placed in weeks, not months.':route==='adapt'?'Builds on finished motifs, so no blank-page design phase.':'Concept starts from the artist\'s proven language, which shortens approvals.',
    better:'Chosen for this site on structure, materials, scale, colour and safety, not just looks.',
    cheaper:route==='existing'?'No design fee; you pay for a finished work.':route==='adapt'?'Licence plus production costs less than a full commission.':'Scope is fixed up front from the brief, which avoids redesign rounds.',
    client:'A piece that solves the brief and carries the brand.',artist:'A paid project in the artist\'s own language and credit as the author.'}}

  window.APR={CRIT,CRIT_ONLINE,ROUTE,feat,norm,scoreWork,rank,criteria,spec,uvp,tone,label:L};
})();
