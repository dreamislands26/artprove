/* shared helpers: toast + "coming soon" links. Front-end only. */
window.toast=function(m){let t=document.querySelector('.toast');if(!t){t=document.createElement('div');t.className='toast';t.setAttribute('role','status');document.body.appendChild(t)}t.textContent=m;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),2200)};
document.addEventListener('click',e=>{const a=e.target.closest('[data-soon]');if(a){e.preventDefault();toast('Coming soon: separate flow, not in this prototype')}});
window.store={get(k,d){try{const v=sessionStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(_){return d}},set(k,v){try{sessionStorage.setItem(k,JSON.stringify(v))}catch(_){}}};
