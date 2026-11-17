/* Art Prove · matchmaker client for the play front-end (brief → match → unlock).
   Uses runtime.js (claude.use: db / user / sample → api.artprove.com) and ap-data.js (APD: artists + works). */
(function(){
  const SECT={Hotel:'Hospitality',Office:'Workplace',Residence:'Real estate',Brand:'Brand & retail',Public:'Public art',Other:'Other'};
  const FIT={Hotel:['Hospitality'],Office:['Workplace'],Residence:['Real estate'],Brand:['Brands'],Public:['Architecture','Real estate'],Other:[]};
  const TAGKW={Calm:['calm','soft','quiet','atmospheric','pale','air'],Bold:['bold','bright','colourful','statement','strong'],Warm:['warm','pink','red','orange','sun'],Blue:['blue','sea','fog'],
    Nature:['flower','garden','nature','air','sea','light'],Tactile:['relief','impasto','textile','hair','clay','ceramic','texture','linen'],Graphic:['graphic','collage','print','figure'],
    Paper:['paper','drawing','gouache','ink'],Gestural:['gesture','abstract','impasto'],Sculptural:['sculpture','object','furniture','ceramic','installation'],Textile:['textile','fabric','clothes','hair','weave'],Large:['large','installation']};
  const FREE=['gmail.com','googlemail.com','yahoo.com','ymail.com','hotmail.com','outlook.com','live.com','msn.com','icloud.com','me.com','mac.com','aol.com','proton.me','protonmail.com','mail.ru','bk.ru','list.ru','inbox.ru','yandex.ru','ya.ru','gmx.com','gmx.de','web.de'];
  const D=()=>window.APD||{works:[],artists:{}};
  const WD=()=>{const m={};D().works.forEach(w=>m[w.id]=w);return m};
  async function rt(){const db=await claude.use('db'),user=await claude.use('user'),sample=await claude.use('sample');return {db,user,sample,uid:await user.id()}}

  function trackOf(st){const on=(st.need||[]).includes('Online collaboration');return on?((st.need||[]).length>1?'Both':'Online'):'Offline'}

  async function saveBrief(st,style){
    const {db,uid}=await rt();
    const prof=db.doc('briefs/'+uid);const snap=await prof.get();
    if(!snap.exists)await prof.set({company:'',contact:'',email:'',createdAt:new Date().toISOString(),source:'play'});
    const id='b'+Date.now().toString(36);
    const tags=(style&&style.tags)||[];const liked=(style&&style.liked)||[];
    const goals=[tags.length?'Style: '+tags.join(', '):'',liked.length?'Liked in the style game: '+liked.join(', '):''].filter(Boolean).join('\n');
    const item={company:'',brand:'',sector:SECT[st.space]||st.space,space:st.space,property:'',city:st.city||'',objectType:(st.need||[]).join(', ')||'Not specified',
      budget:st.budget||'',deadline:st.when||'',size:'',goals,style:{tags,liked},track:trackOf(st),status:'matching',source:'play-brief',createdAt:new Date().toISOString()};
    await db.doc('briefs/'+uid+'/items/'+id).set(item);
    return {id,uid,item};
  }

  function catalogue(){
    const W=D().works,A=D().artists;
    return Object.entries(A).map(([id,a])=>({id,name:a.name,network:!!a.net,line:a.line,base:a.base||'',statement:a.statement,themes:a.themes,materials:a.materials,fits:a.cats,
      works:W.filter(w=>w.aid===id).map(w=>({id:w.id,title:w.title,year:w.year,medium:w.medium,materials:w.materials,dims:w.dim||'unknown'}))}));
  }

  function heuristic(brief,exclude){
    exclude=exclude||[];const tags=(brief.style&&brief.style.tags)||[];const fits=FIT[brief.space]||[];
    const score=w=>{let s=0;const kw=(w.kw+' '+w.title+' '+w.medium+' '+w.materials).toLowerCase();
      tags.forEach(t=>(TAGKW[t]||[]).forEach(k=>{if(kw.includes(k))s+=2}));
      (w.fit||[]).forEach(f=>{if(fits.includes(f))s+=3});
      if(!w.aid||D().artists[w.aid]&&!D().artists[w.aid].net)s+=1; // pilot roster first
      if(/sculpture/i.test((brief.objectType||''))&&/Sculpture|furniture|Ceramic|Installation/i.test(w.medium))s+=3;
      return s};
    const by={};D().works.forEach(w=>{if(exclude.includes(w.aid))return;(by[w.aid]=by[w.aid]||[]).push([score(w),w])});
    const ranked=Object.entries(by).map(([a,l])=>{l.sort((x,y)=>y[0]-x[0]);return [a,l.slice(0,3).reduce((n,x)=>n+x[0],0),l]}).sort((x,y)=>y[1]-x[1]);
    if(!ranked.length)return null;
    const [aid,,l]=ranked[0];const A=D().artists[aid];
    return {artistId:aid,source:'heuristic',alternates:ranked.slice(1,3).map(r=>r[0]),
      fit:{aesthetic:{level:tags.length?'good':'unknown',reason:tags.length?'Matches the style you picked: '+tags.join(', ').toLowerCase()+'.':'No style picked yet.'},
           conceptual:{level:'unknown',reason:'A curator checks the concept with you.'},project:{level:(A.cats||[]).some(c=>fits.includes(c))?'good':'unknown',reason:'Practice suits '+(A.cats||[]).join(', ').toLowerCase()+'.'},
           commercial:{level:'unknown',reason:'Prices and availability are confirmed by the artist.'}},
      why:['Works that match your style tags.','Practice suited to a '+String(brief.space||'space').toLowerCase()+'.','A curator reviews this match before it goes further.'],
      works:l.slice(0,3).map(x=>({id:x[1].id,note:''})),
      directions:l.slice(0,3).map((x,k)=>({title:['Ready works, curated to the brief','A palette for the whole space','A piece made for your space'][k],workId:x[1].id,why:'Chosen from '+A.short+"'s works for your "+String(brief.space||'space').toLowerCase()+'.'})),
      caveats:['Availability and prices are confirmed with the artist.'],concept:null};
  }

  function prompt(brief,exclude){
    const online=brief.track==='Online'||brief.track==='Both';
    const B=JSON.stringify({space:brief.space,city:brief.city,need:brief.objectType,track:brief.track,budget:brief.budget,when:brief.deadline,style:brief.style,brandDNA:brief.brandDNA||null});
    const fitSpec=online?
      `"fit":{"brand":{"level":"","reason":""},"scrollstop":{"level":"","reason":""},"adapt":{"level":"","reason":""},"story":{"level":"","reason":""},"rights":{"level":"","reason":""}}`:
      `"fit":{"aesthetic":{"level":"","reason":""},"conceptual":{"level":"","reason":""},"project":{"level":"","reason":""},"commercial":{"level":"","reason":""}}`;
    const dims=online?'brand (visual language vs the brief and style), scrollstop (does it stop a scroller in 0.3 s), adapt (crops to 9:16, 1:1, 4:5; pattern and motion potential), story (themes and filmable process), rights (licensing likely; network:true artists are known from portfolio only)':
      'aesthetic (style and palette vs the liked works and tags), conceptual (themes vs the space and brand), project (scale, format, installation for this space), commercial (budget and availability; network:true artists are known from portfolio only, so say unknown)';
    return `You are the curator-matchmaker of Art Prove, a curated AI art matchmaker for business spaces${online?' and ONLINE brand collaborations (identity, social media, campaigns, performance creative)':''}.
Pick ONE best-fit artist and three of their works for this brief. Prefer artists with network:false (pilot roster) when the fit is similar. Levels: "strong","good","weak","unknown". Score: ${dims}.
Never invent prices, sizes, availability, exhibitions or follower counts. Use only works listed below. ${exclude&&exclude.length?'Do NOT pick these artists: '+exclude.join(', ')+'.':''}

BRIEF: ${B}

ARTISTS AND WORKS: ${JSON.stringify(catalogue())}

Return JSON only:
{"artistId":"artist id from the list",${fitSpec},
 "why":["3 short reasons tied to the brief"],
 "directions":[{"title":"short direction name, max 6 words","workId":"work id of the chosen artist","why":"one sentence, max 18 words"}],
 "works":[{"id":"same three work ids","note":"max 12 words"}],
 "alternates":["two other artist ids that also fit"],
 "caveats":["what the curator must confirm"],
 "concept":{"title":"","idea":"2 sentences: a new piece in the artist's own practice, for the artist to approve","materials":"","placement":"","scale":""${online?',"keyVisual":"","carriers":["carrier: format"],"contentPlan":["Week 1: ...","Week 2: ...","Week 3: ...","Week 4: ..."],"kpis":["metric"]':''}}}
Exactly 3 directions. Plain English, no hype, no percentages.`;
  }

  function valid(m){const W=WD(),A=D().artists;if(!m||!A[m.artistId])return null;
    m.directions=(m.directions||[]).filter(d=>W[d.workId]).slice(0,3);
    if(m.directions.length<3){const own=D().works.filter(w=>w.aid===m.artistId&&!m.directions.some(d=>d.workId===w.id));while(m.directions.length<3&&own.length){const w=own.shift();m.directions.push({title:w.title,workId:w.id,why:''})}}
    m.works=m.directions.map(d=>({id:d.workId,note:d.why||''}));m.alternates=(m.alternates||[]).filter(a=>A[a]&&a!==m.artistId).slice(0,3);return m}

  async function match(brief,exclude){
    try{const {sample}=await rt();const m=valid(await sample.json(prompt(brief,exclude),{modelTier:'default'}));if(m){m.source='ai';return m}}catch(e){console.warn('AI match failed',e&&e.code)}
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
  window.APM={saveBrief,match,saveMatch,loadBrief,unlock,lead,isFree,WD,heuristic};
})();
