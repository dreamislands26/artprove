/* Art Prove · reads a brand book or space photos in the browser.
   PDF → text (first pages) + colours of rendered pages + hex codes written in the text; images → dominant colours.
   Files never leave the device: only the extracted text and colours are saved with the brief. Exposes window.APB. */
(function(){
  const PDFJS=new URL('/assets/vendor/pdf.min.mjs',location.href).href,WORKER=new URL('/assets/vendor/pdf.worker.min.mjs',location.href).href; /* pdfjs-dist 4.10.38, self-hosted */
  let lib=null;
  async function pdfjs(){if(!lib){lib=await import(PDFJS);lib.GlobalWorkerOptions.workerSrc=WORKER}return lib}
  const hex=(r,g,b)=>'#'+[r,g,b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
  function sat(c){const mx=Math.max(c.r,c.g,c.b),mn=Math.min(c.r,c.g,c.b);return mx?(mx-mn)/mx:0}
  function palette(canvases,k){k=k||6;const counts=new Map();
    for(const c of canvases){let d;try{d=c.getContext('2d').getImageData(0,0,c.width,c.height).data}catch(e){continue}
      for(let i=0;i<d.length;i+=4){if(d[i+3]<128)continue;const key=(d[i]>>4)<<8|(d[i+1]>>4)<<4|(d[i+2]>>4);counts.set(key,(counts.get(key)||0)+1)}}
    const all=[...counts.entries()].sort((a,b)=>b[1]-a[1]).map(([key,n])=>({r:(key>>8&15)*17,g:(key>>4&15)*17,b:(key&15)*17,n}));
    const out=[];for(const c of all){if(out.some(o=>Math.abs(o.r-c.r)+Math.abs(o.g-c.g)+Math.abs(o.b-c.b)<90))continue;out.push(c);if(out.length>=14)break}
    const light=c=>c.r>232&&c.g>232&&c.b>232,dark=c=>c.r<26&&c.g<26&&c.b<26;
    const chroma=out.filter(c=>!light(c)&&!dark(c)&&sat(c)>.2),rest=out.filter(c=>!chroma.includes(c));
    return [...chroma,...rest].slice(0,k).map(c=>hex(c.r,c.g,c.b))}
  function toCanvas(img,max){max=max||96;const s=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*s));c.height=Math.max(1,Math.round(img.height*s));c.getContext('2d').drawImage(img,0,0,c.width,c.height);return c}
  async function imgCanvas(file){const url=URL.createObjectURL(file);try{const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=url});return toCanvas(img)}finally{URL.revokeObjectURL(url)}}
  async function readPdf(file){const L=await pdfjs();const doc=await L.getDocument({data:await file.arrayBuffer()}).promise;let text='';const cans=[];
    for(let p=1;p<=Math.min(doc.numPages,30)&&text.length<14000;p++){const pg=await doc.getPage(p);const tc=await pg.getTextContent();text+=tc.items.map(i=>i.str).join(' ').replace(/\s+/g,' ').trim()+'\n';
      if(cans.length<8){const vp=pg.getViewport({scale:1});const v2=pg.getViewport({scale:140/Math.max(vp.width,vp.height)});const c=document.createElement('canvas');c.width=Math.ceil(v2.width);c.height=Math.ceil(v2.height);
        await pg.render({canvasContext:c.getContext('2d'),viewport:v2}).promise;cans.push(c)}}
    return {pages:doc.numPages,text,cans}}
  const hexInText=t=>[...new Set((String(t).match(/#[0-9a-f]{6}\b/gi)||[]).map(x=>x.toLowerCase()))].slice(0,8);
  async function read(files){files=[...files];const out={files:files.map(f=>f.name),pages:0,text:'',colors:[]};const cans=[];
    for(const f of files){
      if(/pdf/i.test(f.type)||/\.pdf$/i.test(f.name)){const r=await readPdf(f);out.pages+=r.pages;out.text+=r.text;cans.push(...r.cans)}
      else if(/^image\//.test(f.type)){cans.push(await imgCanvas(f));out.pages++}
      else if(/^text\//.test(f.type)||/\.(txt|md)$/i.test(f.name)){out.text+=(await f.text())}}
    const near=(a,b)=>{const x=parseInt(a.slice(1),16),y=parseInt(b.slice(1),16);return Math.abs((x>>16)-(y>>16))+Math.abs((x>>8&255)-(y>>8&255))+Math.abs((x&255)-(y&255))<70};
    out.colors=[...hexInText(out.text),...palette(cans,6)].reduce((a,c)=>a.some(x=>near(x,c))?a:[...a,c],[]).slice(0,8);out.text=out.text.slice(0,14000);return out}
  async function photos(files){const cans=[];for(const f of [...files])if(/^image\//.test(f.type))try{cans.push(await imgCanvas(f))}catch(e){}return {count:cans.length,colors:palette(cans,6)}}
  window.APB={read,photos,palette};
})();
