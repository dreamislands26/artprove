/* generate.html: real matching via APM (assets/match.js). Keeps the prototype's layout. */
const E=x=>String(x==null?'':x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const qs=new URLSearchParams(location.search);
let briefId=qs.get('brief')||store.get('ap_brief_id',null);
const sess=store.get('ap_brief',{}),sty=store.get('ap_style',{});
const ROOMS={Hotel:['room-lobby','room-suite','play-white-room'],Office:['room-office','room-atrium','play-white-room'],Residence:['room-residence','room-suite','play-white-room'],Brand:['room-brand','play-blue-room','room-suite'],Public:['room-plaza','room-atrium','play-blue-room']};
let brief=null,M=null,opt=0,credits=1,tried=[],unlocked=!!store.get('ap_unlocked_'+briefId,false);
const W=APM.WD(),A=APD.artists;
const space=()=>{const s=(brief&&brief.space)||sess.space;return s&&ROOMS[s]?s:'Hotel'};
const tagsOf=()=>((brief&&brief.style&&brief.style.tags&&brief.style.tags.length)?brief.style.tags:(sty.tags||[])).slice(0,3);

function visHTML(k){const d=M.directions[k];const w=W[d.workId];const room=ROOMS[space()][k%3];
  if(w&&w.sp)return {img:'<img src="img/'+w.sp+'.jpg" alt="Exhibition view of work by '+E(w.by)+'">',lab:"Artist's exhibition view"};
  return {img:'<img src="img/'+room+'.jpg" alt="Concept render of your space"><img class="wk" src="img/'+w.img+'.jpg" alt="'+E(w.title)+', '+E(w.by)+'">',lab:'Real work · concept room'};}
function draw(){
  const sp=space(),tags=tagsOf(),a=A[M.artistId];
  document.getElementById('sp').textContent=sp.toLowerCase();
  const v=visHTML(opt);const vis=document.querySelector('.vis');
  vis.innerHTML=v.img+'<span class="badge" id="vlab">Option '+'ABC'[opt]+'</span><span class="concept">'+v.lab+'</span>';
  document.getElementById('vars').innerHTML=M.directions.map((d,k)=>'<button type="button" aria-pressed="'+(k===opt)+'" data-o="'+k+'"><img src="img/'+W[d.workId].img+'.jpg" alt=""><b>'+'ABC'[k]+'</b></button>').join('');
  document.getElementById('dirs').innerHTML=M.directions.map((d,k)=>{const w=W[d.workId];return '<article class="dir"><img src="img/'+w.img+'.jpg" alt="'+E(w.title)+'"><div><span class="tag" style="color:var(--blue)">Direction '+(k+1)+'</span><h3>'+E(d.title)+'</h3><p>'+E(d.why||'')+'</p><p class="wt">'+E(w.title)+(w.year?', '+E(w.year):'')+' · '+E(w.medium)+(w.dim?' · '+E(w.dim):'')+'</p></div></article>'}).join('');
  const ids=[M.artistId,...(M.alternates||[])].slice(0,4);
  document.getElementById('art').innerHTML=ids.map((id,k)=>{const x=A[id];const w=APD.works.find(w=>w.aid===id);if(!x||!w)return '';
    return '<div class="ac"><img src="img/'+w.img+'.jpg" alt="Work by a matched artist">'+(unlocked?'':'<span class="lk" aria-hidden="true">🔒</span>')+'<div class="nm"><b class="'+(unlocked?'':'bl')+'">'+(unlocked?E(x.short):'Artist name')+'</b><span>'+(k===0?'Best match':'Also fits')+' · '+E(x.medium)+'</span></div></div>'}).join('');
  document.querySelectorAll('.ac .nm b.bl').forEach(b=>b.style.filter='blur(5px)');
  document.getElementById('kv').innerHTML=[['Space',sp],['City',(brief&&brief.city)||sess.city||'—'],['Need',(brief&&brief.objectType)||(sess.need||[]).join(', ')||'—'],['When',(brief&&brief.deadline)||'—'],['Budget',(brief&&brief.budget)||'—']].map(r=>'<div><span>'+r[0]+'</span><b>'+E(r[1])+'</b></div>').join('');
  document.getElementById('chips').innerHTML=tags.map(t=>'<span>'+E(t)+'</span>').join('');
  document.getElementById('cred').textContent=credits;
  const why=document.getElementById('why');why.innerHTML=(M.why||[]).map(x=>'<li>'+E(x)+'</li>').join('');
  const src=document.getElementById('msrc');src.textContent=M.source==='ai'?'AI match · a curator checks it next':'Quick match from your style · a curator checks it next';
  const bud=document.getElementById('bud');if(unlocked)bud.innerHTML='<div><span>Artworks</span><b>Price on request</b></div><div><span>Commission</span><b>Quote from the artist</b></div><div><span>Timeline</span><b>Confirmed by the curator</b></div>';
  const ul=document.getElementById('unl');if(unlocked){ul.innerHTML='<h2>Your proposal is open</h2><ul><li>Artist: '+E(a.name)+'</li><li>A curator contacts you within 48 hours with prices and availability.</li></ul><a class="pill p-white" href="/catalog/?brief='+encodeURIComponent(briefId)+'#business">Open full proposal <span class="ar">→</span></a>'}
}
async function run(exclude){
  const li=[...document.querySelectorAll('#steps li')];li.forEach(l=>l.classList.remove('on'));li[0].classList.add('on');
  document.getElementById('load').hidden=false;document.getElementById('studio').hidden=true;document.getElementById('mbar').hidden=true;
  const t1=setTimeout(()=>li[1].classList.add('on'),900);
  try{
    if(!briefId){const r=await APM.saveBrief({space:sess.space||'Hotel',need:sess.need||[],city:sess.city||'',when:sess.when||'',budget:sess.budget||''},sty);briefId=r.id;store.set('ap_brief_id',briefId);history.replaceState(null,'','?brief='+briefId)}
    brief=brief||await APM.loadBrief(briefId)||{space:sess.space,city:sess.city,style:sty};
    if(!exclude&&brief.match&&brief.match.directions){M=brief.match}else{M=await APM.match(brief,exclude);await APM.saveMatch(briefId,M).catch(()=>{})}
  }catch(e){console.warn(e);brief=brief||{space:sess.space,city:sess.city,style:sty};M=APM.heuristic(brief,exclude||[])}
  clearTimeout(t1);li.forEach(l=>l.classList.add('on'));
  setTimeout(()=>{document.getElementById('load').hidden=true;document.getElementById('studio').hidden=false;document.getElementById('mbar').hidden=false;draw();const h=document.getElementById('ph');h.tabIndex=-1;h.focus({preventScroll:true})},400);
}
document.getElementById('vars').addEventListener('click',e=>{const x=e.target.closest('button');if(!x)return;opt=+x.dataset.o;draw()});
async function regen(){if(credits<=0){openSheet();return}credits--;tried.push(M.artistId);opt=0;await run(tried.slice());toast(credits?'New match generated':'New match generated. That was your free one.')}
document.getElementById('regen').onclick=regen;document.getElementById('regen2').onclick=regen;
const sheet=document.getElementById('sheet');let last=null,plan='';
function openSheet(){if(unlocked){location.href='/catalog/?brief='+encodeURIComponent(briefId)+'#business';return}last=document.activeElement;sheet.hidden=false;document.getElementById('plans').hidden=false;document.getElementById('uf').hidden=true;document.getElementById('x').focus()}
function closeSheet(){sheet.hidden=true;last&&last.focus()}
document.addEventListener('click',e=>{if(e.target.closest('[data-unlock]'))openSheet();const p=e.target.closest('[data-pay]');if(p){plan=p.dataset.pay;document.getElementById('plans').hidden=true;document.getElementById('uf').hidden=false;document.getElementById('u-mail').focus()}});
document.getElementById('x').onclick=closeSheet;sheet.addEventListener('click',e=>{if(e.target===sheet)closeSheet()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!sheet.hidden)closeSheet()});
document.getElementById('uf').addEventListener('submit',async e=>{e.preventDefault();
  const mail=document.getElementById('u-mail').value.trim(),name=document.getElementById('u-name').value.trim(),co=document.getElementById('u-co').value.trim(),er=document.getElementById('u-err');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)||APM.isFree(mail)){er.textContent='Use your work email, not a personal one.';er.hidden=false;return}
  if(co.length<2){er.textContent='Add your company or property name.';er.hidden=false;return}
  er.hidden=true;const btn=e.submitter||document.querySelector('#uf button[type=submit]');btn.disabled=true;btn.textContent='Opening…';
  try{await APM.unlock(briefId,{email:mail,name,company:co,plan});unlocked=true;credits=Math.max(credits,5);store.set('ap_unlocked_'+briefId,true);closeSheet();draw();toast('Unlocked. A curator will contact you.')}
  catch(err){er.textContent='Could not save. Try again in a minute.';er.hidden=false}
  btn.disabled=false;btn.textContent='Unlock my proposal';});
run();
