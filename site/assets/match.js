/* Art Prove · matchmaker client (brief v2 → ranked shortlist → AI curator → unlock).
   Uses runtime.js (claude.use: db / user / sample → api.artprove.com), ap-data.js (APD) and rank.js (APR). */
(function(){
  const SECT={Hotel:'Hospitality',Office:'Workplace',Residence:'Real estate',Brand:'Brand & retail',Public:'Public art',Other:'Other'};
  const FREE=['gmail.com','googlemail.com','yahoo.com','ymail.com','hotmail.com','outlook.com','live.com','msn.com','icloud.com','me.com','mac.com','aol.com','proton.me','protonmail.com','mail.ru','bk.ru','list.ru','inbox.ru','yandex.ru','ya.ru','gmx.com','gmx.de','web.de'];
  const D=()=>window.APD||{works:[],artists:{}};
  const WD=()=>{const m={};D().works.forEach(w=>m[w.id]=w);return m};
  async function rt(){const db=await claude.use('db'),user=await claude.use('user'),sample=await claude.use('sample');return {db,user,sample,uid:await user.id()}}
  const clip=(s,n)=>String(s||'').slice(0,n);

  function trackOf(st){if(st.track)return st.track==='Physical'?'Offline':st.track;const on=(st.need||[]).includes('Online collaboration');return on?((st.need||[]).length>1?'Both':'Online'):'Offline'}

  /* Builds the stored brief. Accepts brief v2 (track/site/purpose/design/brand/campaign/online/routes/constraints) and the old flat one. */
  function itemOf(st,style){
    const tags=(style&&style.tags)||[];const liked=(style&&style.liked)||[];const s=st.site||{},p=st.purpose||{},c=st.campaign||{},on=st.online||{};
    const book=st.brand&&st.brand.book?{files:st.brand.book.files||[],pages:st.brand.book.pages||0,colors:st.brand.book.colors||[],text:clip(st.brand.book.text,8000)}:null;
    const size=s.w||s.h?[s.w&&s.w+' m wide',s.h&&s.h+' m high'].filter(Boolean).join(', '):(s.sizeClass||'');
    const goals=[tags.length?'Style: '+tags.join(', '):'',liked.length?'Liked in the style game: '+liked.join(', '):'',
      p.functions&&p.functions.length?'Functions: '+p.functions.join(', '):'',c.product?'Campaign: '+c.product+(c.audience?' for '+c.audience:''):'',
      on.goal?'Online goal: '+on.goal:'',st.notes||''].filter(Boolean).join('\n');
    return {company:(st.brand&&st.brand.name)||'',brand:(st.brand&&st.brand.name)||'',sector:SECT[st.space]||st.space||'',space:st.space||'',property:'',city:st.city||'',
      objectType:(st.routes&&st.routes.length?st.routes:(st.need||[])).join(', ')||'Not specified',
      budget:st.budget||'',deadline:st.when||st.deadline||'',size,goals,style:{tags,liked},track:trackOf(st),
      site:st.site||null,purpose:st.purpose||null,design:st.design||null,
      brand:st.brand?{name:st.brand.name||'',site:st.brand.site||'',colors:st.brand.colors||[],book}:null,
      campaign:st.campaign||null,online:st.online||null,routes:st.routes||[],constraints:st.constraints||null,
      v:2,status:'matching',source:'play-brief',createdAt:new Date().toISOString()};
  }

  async function saveBrief(st,style){
    const {db,uid}=await rt();
    const prof=db.doc('briefs/'+uid);const snap=await prof.get();
    if(!snap.exists)await prof.set({company:(st.brand&&st.brand.name)||'',contact:'',email:'',createdAt:new Date().toISOString(),source:'play'});
    const id='b'+Date.now().toString(36);const item=itemOf(st,style);
    await db.doc('briefs/'+uid+'/items/'+id).set(item);
    return {id,uid,item};
  }

  /* ---------- quick match straight from the ranking ---------- */
  const DIRT={existing:['Ready work, placed as is','Second ready option','A smaller companion piece'],adapt:["The artist's motif, made for the site",'Same language, another scale','A ready work for inside'],commission:['A new piece for this site','A study from existing work','A ready work while it is made']};
  function fitCompat(cr,online){const g=k=>cr[k]||{level:'unknown',reason:''};
    return online?{brand:g('concept'),scrollstop:g('scrollstop'),adapt:g('adapt'),story:g('concept'),rights:g('rights')}
      :{aesthetic:g('colour'),conceptual:g('concept'),project:g('structure').level==='strong'&&g('size').level!=='weak'?g('structure'):g('size'),commercial:g('budget')}}
  function heuristic(brief,exclude){
    const R=window.APR;const ranked=R.rank(brief,exclude||[]);if(!ranked.length)return null;const n=R.norm(brief);
    const r=ranked[0],A=D().artists[r.aid];const W=WD();const top=r.works.slice(0,3);
    const criteria=R.criteria(r,n);const spec=R.spec(r,n,brief);spec.title=(DIRT[top[0].route]||DIRT.existing)[0];
    return {artistId:r.aid,source:'heuristic',route:top[0].route,criteria,spec,uvp:R.uvp(r,n),fit:fitCompat(criteria,n.online),
      alternates:ranked.slice(1,3).map(x=>x.aid),
      why:[criteria.structure&&criteria.structure.level==='strong'?'Fits the placement: '+criteria.structure.reason+'.':'Ranked on structure, materials, scale, colour and safety for your site.',
        criteria.colour&&criteria.colour.level!=='unknown'?'Colour: '+criteria.colour.reason+'.':'Matches the style you picked.',
        'Route: '+R.ROUTE[top[0].route].toLowerCase()+' — '+(spec.timeline||'')+'.'],
      works:top.map(x=>({id:x.id,note:''})),
      directions:top.map((x,k)=>({title:(DIRT[top[0].route]||DIRT.existing)[k],workId:x.id,why:R.ROUTE[x.route]+(x.flags.length?' · '+x.flags[0]:'')})),
      caveats:['Prices, availability and exact sizes are confirmed with the artist.',...new Set(top.flatMap(x=>x.flags))].slice(0,4),concept:null};
  }

  /* ---------- AI curator on top of the ranked shortlist ---------- */
  function prompt(brief,exclude){
    const R=window.APR;const n=R.norm(brief);const ranked=R.rank(brief,exclude||[]).slice(0,6);const W=WD();
    const keys=Object.keys(n.physical?R.CRIT:{}).concat(n.online?Object.keys(R.CRIT_ONLINE):[]).filter((k,i,a)=>a.indexOf(k)===i);
    const B={track:brief.track,space:brief.space,city:brief.city,site:brief.site,purpose:brief.purpose,currentDesign:brief.design&&{styles:brief.design.styles,materials:brief.design.materials,colors:brief.design.colors,notes:brief.design.notes},
      brand:brief.brand&&{name:brief.brand.name,site:brief.brand.site,colors:[...(brief.brand.colors||[]),...((brief.brand.book&&brief.brand.book.colors)||[])]},
      campaign:brief.campaign,online:brief.online,routesWanted:brief.routes,constraints:brief.constraints,budget:brief.budget,deadline:brief.deadline,style:brief.style};
    const book=clip(brief.brand&&brief.brand.book&&brief.brand.book.text,5000);
    const SL=ranked.map(r=>{const a=D().artists[r.aid];return {id:r.aid,name:a.name,network:!!a.net,line:a.line,base:a.base||'',statement:clip(a.statement,320),themes:a.themes,materials:a.materials,rankScore:+r.score.toFixed(2),
      works:r.works.slice(0,4).map(x=>{const w=W[x.id];return {id:w.id,title:w.title,medium:w.medium,materials:w.materials,dims:w.dim||'unknown',palette:w.pal,colors:w.hex,route:x.route,scores:x.c,flags:x.flags}})}});
    const crit=keys.map(k=>k+' ('+(R.CRIT[k]||R.CRIT_ONLINE[k])+')').join(', ');
    return `You are the senior curator of Art Prove. We create a NEW product for a business by matching an artist's existing practice (forms, styles, visual language, materials) to a concrete use case, and find the win-win: the option that solves the client's task fastest, best and cheapest while giving the artist real creative expression.

Decide using the brief: physical site (indoor/outdoor, weather exposure, placement, size, traffic and risks), the current design of the space, its purpose (pure contemplation vs functional use), the brand book and any running offline/online campaign (product, audience, channels), budget and deadline.
Choose ONE artist from the SHORTLIST (already pre-ranked by our scoring; you may reorder), the delivery route and three works of that artist.
Routes: "existing" = an existing work placed as is (fastest); "adapt" = the artist's existing motif or language translated to this site (durable outdoor material, new scale, print/enamel/mosaic/textile edition, or licensed for online content); "commission" = a new piece in the artist's language (slowest).
Rate these criteria with levels "strong","good","weak","unknown" and one short reason tied to the brief: ${crit}.
Never invent prices, sizes, availability, exhibitions or follower counts. Network:true artists are known from their portfolio only. ${exclude&&exclude.length?'Do NOT pick these artists: '+exclude.join(', ')+'.':''}

BRIEF: ${JSON.stringify(B)}
${book?'\nBRAND BOOK (extracted text, may be partial):\n'+book+'\n':''}
SHORTLIST: ${JSON.stringify(SL)}

Return JSON only:
{"artistId":"","route":"existing|adapt|commission",
 "criteria":{${keys.map(k=>`"${k}":{"level":"","reason":"max 14 words"}`).join(',')}},
 "spec":{"title":"name of the proposed piece, max 6 words","structure":"","materials":"","size":"","palette":"","ergonomics":"","safety":"","budget":"price on request + what drives cost","timeline":"","maintenance":""},
 "uvp":{"faster":"","better":"","cheaper":"","client":"what the client gets","artist":"what the artist gets"},
 "why":["3 short reasons tied to the brief"],
 "directions":[{"title":"max 6 words","workId":"work id of the chosen artist","why":"max 18 words"}],
 "alternates":["two other shortlist artist ids"],
 "caveats":["what the curator must confirm"],
 "concept":{"title":"","idea":"2 sentences, for the artist to approve","materials":"","placement":"","scale":""${n.online?',"keyVisual":"","carriers":["carrier: format"],"contentPlan":["Week 1: ...","Week 2: ...","Week 3: ...","Week 4: ..."],"kpis":["metric"]':''}}}
Exactly 3 directions. Plain English, no hype, no percentages.`;
  }

  const LV=['strong','good','weak','unknown'];
  function valid(m,brief){const W=WD(),A=D().artists;if(!m||!A[m.artistId])return null;const R=window.APR;const n=R.norm(brief||{});
    m.directions=(m.directions||[]).filter(d=>W[d.workId]&&W[d.workId].aid===m.artistId).slice(0,3);
    if(m.directions.length<3){const own=D().works.filter(w=>w.aid===m.artistId&&!m.directions.some(d=>d.workId===w.id));while(m.directions.length<3&&own.length){const w=own.shift();m.directions.push({title:w.title,workId:w.id,why:''})}}
    m.works=m.directions.map(d=>({id:d.workId,note:d.why||''}));m.alternates=(m.alternates||[]).filter(a=>A[a]&&a!==m.artistId).slice(0,3);
    // fill anything the model skipped from our own ranking of this artist
    const r=R.rank(brief||{},[]).find(x=>x.aid===m.artistId);
    if(r){const cr=R.criteria(r,n);m.criteria=m.criteria||{};Object.keys(cr).forEach(k=>{const v=m.criteria[k];if(!v||!LV.includes(v.level))m.criteria[k]=cr[k]});
      const sp=R.spec(r,n,brief);m.spec=Object.assign({},sp,m.spec||{});m.uvp=Object.assign({},R.uvp(r,n),m.uvp||{})}
    if(!['existing','adapt','commission'].includes(m.route))m.route=(m.spec&&m.spec.route)||'existing';
    if(m.spec){m.spec.route=m.route;m.spec.routeName=R.ROUTE[m.route]}
    m.fit=fitCompat(m.criteria||{},n.online);return m}

  async function match(brief,exclude){
    try{const {sample}=await rt();const m=valid(await sample.json(prompt(brief,exclude),{modelTier:'default'}),brief);if(m){m.source='ai';return m}}catch(e){console.warn('AI match failed',e&&e.code)}
    return heuristic(brief,exclude);
  }

  async function saveMatch(id,m){const {db,uid}=await rt();m.createdAt=new Date().toISOString();await db.doc('briefs/'+uid+'/items/'+id).update({status:'matched',match:m});}
  async function loadBrief(id){const {db,uid}=await rt();const s=await db.doc('briefs/'+uid+'/items/'+id).get();return s.exists?s.data():null}
  async function unlock(id,form){const {db,uid}=await rt();const prof=db.doc('briefs/'+uid);const cur=(await prof.get()).data()||{};
    await prof.set(Object.assign({},cur,{company:form.company,contact:form.name,email:form.email,updatedAt:new Date().toISOString()}));
    if(id)await db.doc('briefs/'+uid+'/items/'+id).update({company:form.company,brand:form.company,unlocked:true});
    await db.doc('briefs/'+uid+'/requests/r'+Date.now().toString(36)).set({type:'unlock',briefId:id||'',plan:form.plan||'',email:form.email,name:form.name,company:form.company,status:'new',createdAt:new Date().toISOString()});}
  async function lead(data){const {db,uid}=await rt();const prof=db.doc('briefs/'+uid);const cur=(await prof.get()).data()||{};
    if(!cur.email)await prof.set(Object.assign({},cur,{email:data.email,updatedAt:new Date().toISOString()}));
    await db.doc('briefs/'+uid+'/requests/r'+Date.now().toString(36)).set(Object.assign({type:'demo',status:'new',createdAt:new Date().toISOString()},data));}
  const isFree=v=>FREE.includes((String(v).trim().toLowerCase().split('@')[1]||''));
  window.APM={saveBrief,match,saveMatch,loadBrief,unlock,lead,isFree,WD,heuristic,prompt,valid,itemOf};
})();
