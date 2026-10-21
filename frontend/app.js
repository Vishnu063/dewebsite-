import { WorldView } from './world.js';
import {PROFILE_ANGLES} from './profile-camera.js';
import {SIGNATURE_POSES} from './character-animation.js';
import {loadBenchmarkModels,BENCHMARK_DESIGNS} from './benchmark-models.js';

const main=document.getElementById('main');
const state={world:null,user:null,csrf:'',favourites:new Set(),view:null,region:'all',series:'all',query:'',accountMode:'login',pending:null,route:0,quality:window.matchMedia('(max-width: 700px)').matches?'low':'standard'};
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const region=id=>state.world.regions.find(r=>r.id===id);
let toastTimer;
function toast(message){const box=document.getElementById('toast');box.textContent=message;box.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>box.hidden=true,4800);}

async function api(path,method='GET',data){
  const response=await fetch(path,{method,headers:{'Content-Type':'application/json',...(method==='GET'?{}:{'X-CSRF-Token':state.csrf})},...(data===undefined?{}:{body:JSON.stringify(data)})});
  const result=await response.json();if(!response.ok)throw new Error(result.error||'Something went wrong. Please try again.');return result;
}
function footer(){return '<footer class="site-footer"><span>✧ VEYRA · THE LANTERN ISLES</span><span>An original world. Stories to discover. Room for you.</span></footer>';}

function portrait(c){
  if(BENCHMARK_DESIGNS.has(c.design))return `<img loading="lazy" src="/static/characters/${c.id}-benchmark.png" alt="Blender mesh preview of ${esc(c.name)}; open to inspect in 3D" width="300" height="460">`;
  if(c.series)return `<img loading="lazy" src="/static/characters/${c.id}.svg" alt="3D model preview of ${esc(c.name)}; open to rotate and zoom" width="300" height="320">`;
  const hair=c.silhouette===0?`<path d="M75 73 76 40 91 61 105 29 119 61 136 43 140 80" fill="${c.hair}"/>`:c.silhouette===1?`<circle cx="68" cy="87" r="18" fill="${c.hair}"/><circle cx="145" cy="87" r="18" fill="${c.hair}"/>`:c.silhouette===2?`<path d="M53 74 106 13 158 74Z" fill="${c.accent}"/>`:c.silhouette===4?`<path d="M65 58H145V80H65Z" fill="${c.color}"/><path d="M49 76H163V87H49Z" fill="${c.accent}"/>`:'';
  const symbols={lantern:'✧',compass:'◇',sail:'△',bell:'♧',book:'▤',wings:'⋈',satchel:'□',hammer:'⊥',ribbon:'∞',goggles:'◎',staff:'✦',flower:'✿',crystal:'♦'};
  return `<svg viewBox="0 0 212 210" role="img" aria-label="Original illustration of ${esc(c.name)}"><rect width="212" height="210" fill="${region(c.region).ground}" opacity=".23"/><circle cx="106" cy="106" r="75" fill="#f9f7e9" opacity=".5"/><ellipse cx="106" cy="194" rx="46" ry="7" fill="#2b4b3b" opacity=".08"/><path d="M52 203 66 147Q106 124 146 147L160 203" fill="${c.color}"/><path d="M83 143 106 169 130 143" fill="${c.accent}"/><rect x="93" y="119" width="27" height="26" rx="8" fill="${c.skin}"/><ellipse cx="106" cy="96" rx="44" ry="47" fill="${c.hair}"/>${hair}<ellipse cx="106" cy="104" rx="36" ry="37" fill="${c.skin}"/><path d="M70 87Q78 45 130 65L141 91 120 74 100 91 88 75Z" fill="${c.hair}"/><ellipse cx="91" cy="105" rx="4" ry="6" fill="#303c3c"/><ellipse cx="122" cy="105" rx="4" ry="6" fill="#303c3c"/><circle cx="90" cy="103" r="1.5" fill="#fff"/><circle cx="121" cy="103" r="1.5" fill="#fff"/><path d="M100 120Q106 125 113 120" fill="none" stroke="#7d564d" stroke-width="2" stroke-linecap="round"/><ellipse cx="81" cy="117" rx="6" ry="3" fill="#d58e88" opacity=".65"/><ellipse cx="132" cy="117" rx="6" ry="3" fill="#d58e88" opacity=".65"/><circle cx="158" cy="165" r="20" fill="#f5f1df"/><text x="158" y="172" text-anchor="middle" font-size="24" fill="${c.accent}">${symbols[c.accessory]}</text></svg>`;
}
function heart(c){const saved=state.favourites.has(c.id);return `<button class="save-heart ${saved?'saved':''}" data-favourite="${c.id}" aria-label="${saved?'Remove':'Save'} ${esc(c.name)} ${saved?'from':'to'} favourites" aria-pressed="${saved}">${saved?'♥':'♡'}</button>`;}
function card(c){return `<article class="character-card">${heart(c)}<a href="/characters/${c.id}"><div class="portrait">${portrait(c)}</div><div class="card-body"><span class="region">${esc(c.series||region(c.region).name)}</span><h3>${esc(c.name)}</h3><p>${esc(c.role)} <span aria-hidden="true">↗</span></p></div></a></article>`;}

function nav(){
  const path=location.pathname;
  document.querySelectorAll('[data-nav]').forEach(link=>{const active=link.getAttribute('href')==='/'?path==='/':path.startsWith(link.getAttribute('href'));link.classList.toggle('active',active);if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
  document.getElementById('account-link').textContent=state.user?`${state.user.username} ↗`:'Sign in ↗';
}

function qualityControl(){return `<label class="quality-control">Quality <select data-quality aria-label="3D render quality"><option value="standard" ${state.quality==='standard'?'selected':''}>Standard</option><option value="low" ${state.quality==='low'?'selected':''}>Low (lighter)</option></select></label>`;}

async function mountWorld(host,options={}) {
  const route=state.route;let view;
  const controller=new AbortController();state.modelAbort=controller;
  host.setAttribute('aria-busy','true');
  host.innerHTML='<div class="viewer-status" role="status"><span class="loading-ring" aria-hidden="true"></span><strong>Preparing your 3D view…</strong><p>Building the model and starting graphics.</p></div>';
  const showError=error=>{
    if(route!==state.route||!host.isConnected)return;
    console.error('3D viewer unavailable',error);view?.dispose();if(state.view===view)state.view=null;
    host.setAttribute('aria-busy','false');
    const lost=error.message==='graphics-context-lost';
    host.innerHTML=`<div class="viewer-status viewer-error" role="alert"><h2>${lost?'The graphics connection was lost.':'The 3D view could not open.'}</h2><p>${lost?'Your browser may have paused graphics to free memory. Retry with lighter settings.':'Try lighter settings. If this continues, check that WebGL 2 and hardware acceleration are available in your browser.'}</p><button class="button primary" data-retry-viewer>Retry in low quality</button><a class="button" href="/characters">Browse characters ↗</a></div>`;
    document.querySelectorAll('[data-world-control],.model-controls button:not(#model-fullscreen),.model-settings select,[data-move]').forEach(b=>b.disabled=true);
    host.querySelector('[data-retry-viewer]').onclick=()=>{state.quality='low';render();};
  };
  // Let the loading status paint before synchronous mesh construction.
  await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
  if(route!==state.route||!host.isConnected)return;
  try{
    const loading=host.querySelector('.viewer-status p');if(loading)loading.textContent='Downloading the detailed model and preparing graphics…';
    await loadBenchmarkModels(options.profile?[options.character]:state.world.characters,controller.signal);
    if(route!==state.route||!host.isConnected)return;
    view=new WorldView(host,state.world,{...options,quality:state.quality,onReady:()=>{
      if(route!==state.route||!host.isConnected)return;
      host.setAttribute('aria-busy','false');host.querySelector('.viewer-status')?.remove();
    },onError:showError});
    state.view=view;
    document.querySelectorAll('[data-quality]').forEach(select=>{select.value=state.quality;select.onchange=()=>{state.quality=select.value;state.view?.setQuality(select.value);};});
  }catch(error){showError(error);}
}

async function worldPage(focusId,travelId){
  main.innerHTML=`<section class="world-shell" aria-label="Explore Veyra"><div id="world-canvas" class="world-canvas"></div><div class="world-intro"><span class="eyebrow">AN ORIGINAL WORLD TO EXPLORE</span><h1>Somewhere<br>above the ordinary.</h1><p>Three islands. ${state.world.characters.length} residents.<br>A thousand small reasons to stay a while.</p><span class="pill">The Lantern Isles · Veyra</span></div><div class="world-top">${qualityControl()}<button class="button small" id="overview" data-world-control>↗ Full world</button><button class="button small" id="motion" data-world-control>Idle motion</button></div><aside class="resident-panel" id="resident-panel" hidden></aside><div id="dpad" class="dpad" aria-label="Touch movement" hidden><button data-move="0,-1" aria-label="Move forward">↑</button><button data-move="-1,0" aria-label="Move left">←</button><button data-move="0,1" aria-label="Move backward">↓</button><button data-move="1,0" aria-label="Move right">→</button></div><div class="world-help" id="world-help">Drag to orbit · Scroll or pinch to zoom<br>Click a resident to meet them</div><div class="world-footer"><div class="world-tools"><button id="walk" class="button primary" data-world-control>Walk the isles ↗</button><button id="tour" class="button" data-world-control>Take a tour</button><a class="button" href="/characters">Meet all ${state.world.characters.length}</a></div><span class="world-counter">THREE ISLES · ONE SHARED SKY</span><div class="travel"><span class="eyebrow">TRAVEL SOMEWHERE NEW</span>${state.world.regions.map(r=>`<button data-travel="${r.id}" data-world-control><span class="dot" style="--color:${r.color}"></span>${r.name}<span aria-hidden="true">↗</span></button>`).join('')}</div></div></section>`;
  const select=c=>{
    const box=document.getElementById('resident-panel');if(!box)return;box.hidden=false;
    box.innerHTML=`<button class="close" id="close-resident" aria-label="Close character">×</button><div class="portrait">${portrait(c)}</div><span class="eyebrow">${esc(region(c.region).name)} · RESIDENT</span><h2>${esc(c.name)}</h2><p>${esc(c.role)}<br>${esc(c.personality)}</p><a href="/characters/${c.id}" class="button primary">Read their story ↗</a><button class="button" data-favourite="${c.id}">${state.favourites.has(c.id)?'♥ Saved to favourites':'♡ Save to favourites'}</button>`;
    document.getElementById('close-resident').onclick=()=>{box.hidden=true;if(state.view)state.view.touring=false;document.getElementById('tour').textContent='Take a tour';};
  };
  const worldHost=document.getElementById('world-canvas');
  await mountWorld(worldHost,{onSelect:select,onWalk:value=>{
    document.getElementById('walk').textContent=value?'Return to orbit':'Walk the isles ↗';document.getElementById('dpad').hidden=!value;
    document.getElementById('world-help').innerHTML=value?'WASD / arrow keys or touch pad to walk<br>Drag to turn the camera · Bridges connect the isles':'Drag to orbit · Scroll or pinch to zoom<br>Click a resident to meet them';
  }});
  if(!worldHost.isConnected)return;
  document.getElementById('overview').onclick=()=>{state.view?.overview();document.getElementById('tour').textContent='Take a tour';};
  document.getElementById('walk').onclick=()=>{state.view?.setWalking(!state.view.walk);state.view?.renderer.domElement.focus();document.getElementById('tour').textContent='Take a tour';};
  document.getElementById('tour').onclick=()=>{if(state.view)document.getElementById('tour').textContent=state.view.tour()?'Pause tour':'Take a tour';};
  document.getElementById('motion').onclick=e=>{if(state.view){const enabled=state.view.toggleMotion();e.currentTarget.textContent=enabled?'Pause idle motion':'Resume idle motion';e.currentTarget.setAttribute('aria-pressed',enabled);}};
  document.querySelectorAll('[data-travel]').forEach(button=>button.onclick=()=>{state.view?.travel(button.dataset.travel);document.getElementById('tour').textContent='Take a tour';});
  document.querySelectorAll('[data-move]').forEach(button=>{
    button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);const [x,z]=button.dataset.move.split(',').map(Number);if(state.view)state.view.touch={x,z};});
    const stop=()=>{if(state.view)state.view.touch={x:0,z:0};};button.addEventListener('pointerup',stop);button.addEventListener('lostpointercapture',stop);button.addEventListener('pointercancel',stop);
  });
  if(travelId)state.view?.travel(travelId);
  if(focusId){const c=state.world.characters.find(c=>c.id===focusId);if(c&&state.view){state.view.focusCharacter(c);select(c);}}
}

function catalogue(favourites=false){
  const signedOut=favourites&&!state.user;
  main.innerHTML=`<div class="page"><div class="page-head"><div><span class="eyebrow">${favourites?'YOUR PERSONAL FIELD NOTES':'THE PEOPLE WHO MAKE A WORLD'}</span><h1>${favourites?'Familiar faces.':'Every face, a story.'}</h1><p class="lede">${favourites?'Keep a little collection of the people you want to find again.':'Meet 31 original residents and 20 anime guests. Open a character to explore their 3D model from any angle.'}</p></div><span class="pill">${favourites?'Saved just for you':`${state.world.characters.length} characters`}</span></div>${signedOut?'<div class="empty"><h2>A place for your favourites.</h2><p>Sign in or create an account to keep your collection between visits.</p><a href="/account" class="button primary">Sign in / Create account ↗</a></div>':`<div class="filter-bar"><div class="filters" role="group" aria-label="Filter by island"><button class="filter ${state.region==='all'?'active':''}" data-region="all">All isles</button>${state.world.regions.map(r=>`<button class="filter ${state.region===r.id?'active':''}" data-region="${r.id}">${r.name}</button>`).join('')}</div><label class="series-filter">Collection <select id="series"><option value="all">All characters</option><option value="original">Veyra originals</option><option value="Naruto">Naruto</option><option value="One Piece">One Piece</option></select></label><label class="search"><span class="sr-only">Search residents</span><input id="search" type="search" placeholder="Search names, roles, stories…" value="${esc(state.query)}"></label></div><div id="result-count" class="count-label" aria-live="polite"></div><div id="catalogue" class="catalogue"></div>`}${footer()}</div>`;
  if(signedOut)return;
  const update=()=>{
    const query=state.query.trim().toLowerCase();
    const found=state.world.characters.filter(c=>(!favourites||state.favourites.has(c.id))&&(state.region==='all'||state.region===c.region)&&(state.series==='all'||(state.series==='original'?!c.series:state.series===c.series))&&(!query||`${c.name} ${c.series||''} ${c.role} ${c.personality} ${c.story} ${region(c.region).name}`.toLowerCase().includes(query)));
    document.getElementById('result-count').textContent=`${found.length} ${found.length===1?'resident':'residents'}${favourites?' in your collection':''}`;
    document.getElementById('catalogue').innerHTML=found.length?found.map(card).join(''):`<div class="empty"><h2>${favourites&&!state.favourites.size?'Your story starts with a meeting.':'No residents found.'}</h2><p>${favourites&&!state.favourites.size?'Save a resident using the heart on any character card.':'Try another island or a different search.'}</p><a href="/characters" class="button">Explore the catalogue ↗</a></div>`;
    document.querySelectorAll('[data-region]').forEach(b=>b.classList.toggle('active',b.dataset.region===state.region));
  };
  const series=document.getElementById('series');series.value=state.series;series.onchange=()=>{state.series=series.value;update();};
  document.getElementById('search').addEventListener('input',e=>{state.query=e.target.value;update();});
  document.querySelectorAll('[data-region]').forEach(b=>b.onclick=()=>{state.region=b.dataset.region;update();});update();
}

async function characterPage(id){
  const c=state.world.characters.find(c=>c.id===id);if(!c){main.innerHTML='<div class="page"><h1>This resident is not in the atlas.</h1><a class="button" href="/characters">Back to characters</a></div>';return;}
  const r=region(c.region),saved=state.favourites.has(c.id);
  document.title=`${c.name} — Veyra`;
  main.innerHTML=`<div class="page"><a class="back" href="/characters">← All characters</a><div class="detail-grid"><div class="model-wrap"><div id="character-model" class="model-view"></div><span class="model-label">3D MODEL · DRAG IN ANY DIRECTION · SCROLL / PINCH TO ZOOM</span><div class="model-controls" role="group" aria-label="3D camera views">${PROFILE_ANGLES.map(angle=>`<button class="button small" data-angle="${angle}" aria-pressed="${angle==='front'}">${angle[0].toUpperCase()+angle.slice(1)}</button>`).join('')}<button class="button small" id="model-motion">Auto rotate</button><button class="button small" id="model-reset">Reset camera</button><button class="button small" id="model-fullscreen" aria-expanded="false">Expand viewer</button></div><div class="model-settings">${qualityControl()}${c.series?`<label>Pose <select id="model-pose"><option value="signature">${esc(SIGNATURE_POSES[c.design]?.label||'Signature')}</option><option value="neutral">Neutral stance</option></select></label><label>Animation <select id="model-animation"><option value="idle">Breathe &amp; blink</option><option value="walk">Walk in place</option><option value="still">Still</option></select></label>`:''}<label>Background <select id="model-background"><option value="studio">Studio</option><option value="white">Light</option><option value="night">Dark</option></select></label></div></div><article class="detail-info"><span class="eyebrow">${esc(c.series||r.name)} · ${c.series?'ANIME GUEST':'THE LANTERN ISLES'}</span><h1>${esc(c.name)}</h1><p class="role">${esc(c.role)}</p><p class="personality">${esc(c.personality)}</p><h2>${c.series?'About this character':'A life between the clouds'}</h2><p>${esc(c.story)}</p><div class="quest"><span class="eyebrow">A WISH FOR TOMORROW</span><p>${esc(c.quest)}</p></div><div class="actions"><button class="button primary" data-favourite="${c.id}">${saved?'♥ Saved to favourites':'♡ Save to favourites'}</button><a class="button" href="/?meet=${c.id}">Find in the world ↗</a></div><p class="footnote">${c.series?'Unofficial fan interpretation from '+esc(c.series)+'.':'An original resident of Veyra.'} A stylised procedural 3D model, with geometry on every side. Naruto and Luffy use new Blender benchmark meshes awaiting art approval. Other anime guests retain their current stylised models. All anime guests have articulated mesh groups, signature poses and procedural animation. These remain stylised fan models, without cinematic facial animation or downloaded game rigs.</p></article></div><section class="subsection"><div class="page-head"><div><span class="eyebrow">NEIGHBOURS &amp; KINDRED SPIRITS</span><h2>More voices from ${esc(r.name)}.</h2></div><a class="button small" href="/characters">Meet everyone ↗</a></div><div class="catalogue">${state.world.characters.filter(x=>x.region===c.region&&x.id!==id).slice(0,4).map(card).join('')}</div></section>${footer()}</div>`;
  const modelHost=document.getElementById('character-model');
  await mountWorld(modelHost,{profile:true,character:c});
  if(!modelHost.isConnected)return;
  const motion=document.getElementById('model-motion');
  const refreshMotion=()=>{motion.textContent=state.view?.motion?'Pause rotation':'Auto rotate';motion.setAttribute('aria-pressed',!!state.view?.motion);};
  refreshMotion();
  document.querySelectorAll('[data-angle]').forEach(button=>{button.disabled=!state.view;button.onclick=()=>{state.view?.setProfileAngle(button.dataset.angle);document.querySelectorAll('[data-angle]').forEach(b=>b.setAttribute('aria-pressed',b===button));refreshMotion();};});
  motion.disabled=!state.view;motion.onclick=()=>{state.view?.toggleMotion();refreshMotion();};
  const reset=document.getElementById('model-reset');reset.disabled=!state.view;
  reset.onclick=()=>{state.view?.setProfileAngle('front');document.querySelectorAll('[data-angle]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.angle==='front'));refreshMotion();};
  const pose=document.getElementById('model-pose'),animation=document.getElementById('model-animation'),background=document.getElementById('model-background');
  if(pose){pose.disabled=!state.view;pose.onchange=()=>state.view?.setProfilePose(pose.value);}
  if(animation){animation.disabled=!state.view;animation.value=state.view?.animationMode||'still';animation.onchange=()=>state.view?.setProfileAnimation(animation.value);}
  background.disabled=!state.view;background.onchange=()=>state.view?.setProfileBackground(background.value);
  const wrap=document.querySelector('.model-wrap'),expand=document.getElementById('model-fullscreen');
  let expanded=false,previousOverflow='';
  const setExpanded=value=>{
    if(value===expanded)return;expanded=value;
    wrap.classList.toggle('viewer-expanded',value);expand.textContent=value?'Close full screen':'Expand viewer';expand.setAttribute('aria-expanded',value);
    if(value){previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-label',c.name+' 3D viewer');expand.focus();}
    else{document.body.style.overflow=previousOverflow;wrap.removeAttribute('role');wrap.removeAttribute('aria-modal');wrap.removeAttribute('aria-label');if(expand.isConnected)expand.focus();}
  };
  expand.onclick=()=>setExpanded(!expanded);
  const viewerKeys=e=>{
    if(!expanded)return;
    if(e.key==='Escape'){e.preventDefault();setExpanded(false);}
    if(e.key==='Tab'){
      const focusable=[...wrap.querySelectorAll('button:not(:disabled),select:not(:disabled),canvas[tabindex]')],first=focusable[0],last=focusable.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  };
  document.addEventListener('keydown',viewerKeys);
  state.viewerCleanup=()=>{setExpanded(false);document.removeEventListener('keydown',viewerKeys);};

}

function historyPage(){
  main.innerHTML=`<div class="page"><div class="page-head"><div><span class="eyebrow">A HISTORY STILL BEING WRITTEN</span><h1>Three isles. One shared sky.</h1><p class="lede">Veyra was not built by a single hero. It grew from small acts of care, a few stubborn bridges, and the promise of a light left on.</p></div><a class="button" href="/">Walk through the world ↗</a></div><div class="region-grid">${state.world.regions.map((r,i)=>`<article class="region-card" style="--tint:${r.ground}50"><div class="sigil" aria-hidden="true">${['☼','❋','◇'][i]}</div><span class="eyebrow">ISLE 0${i+1}</span><h2>${esc(r.name)}</h2><p>${esc(r.story)}</p><a class="button small" href="/?region=${r.id}">Visit ${esc(r.name)} ↗</a></article>`).join('')}</div><div class="eyebrow">FROM THE COMMON ARCHIVE</div><h2>The story so far.</h2><div class="timeline">${state.world.history.map(h=>`<article class="era"><span class="eyebrow">${esc(h.year)}</span><h3>${esc(h.title)}</h3><p>${esc(h.text)}</p></article>`).join('')}</div>${footer()}</div>`;
}

function accountPage(){
  main.innerHTML=`<div class="page"><span class="eyebrow">YOUR PLACE IN THE ATLAS</span><div class="account-grid"><section class="account-art"><span class="eyebrow">✧ THE LANTERN ISLES</span><div class="large-sigil" aria-hidden="true">✧</div><div><h2>Some stories<br>are worth returning to.</h2><p>Create a little home for your favourite residents. Your collection will be here when you return.</p></div></section><section class="account-form">${state.user?`<span class="eyebrow">WELCOME BACK</span><h2>Hello, ${esc(state.user.username)}.</h2><p>Your atlas is yours to keep.</p><div class="account-summary"><strong>${state.favourites.size} residents saved</strong><br>Three islands to explore.<br>${state.world.characters.length} stories waiting to be discovered.</div><a href="/favourites" class="button primary">Open my favourites ↗</a><button class="button" id="logout">Sign out</button><p class="footnote">Signing out closes this session. Your collection remains safely associated with your account.</p>`:`<div class="tabs" role="group" aria-label="Account action"><button class="${state.accountMode==='login'?'active':''}" data-auth-mode="login">Sign in</button><button class="${state.accountMode==='register'?'active':''}" data-auth-mode="register">Create account</button></div><h2>${state.accountMode==='login'?'Welcome back.':'Your journey starts here.'}</h2><form id="auth-form"><label for="username">Username</label><input id="username" name="username" required minlength="3" maxlength="32" pattern="[A-Za-z0-9_]{3,32}" autocomplete="username" placeholder="Your name in the atlas"><label for="password">Password</label><input id="password" name="password" type="password" required minlength="10" maxlength="128" autocomplete="${state.accountMode==='register'?'new-password':'current-password'}" placeholder="At least 10 characters"><p class="hint">Username: 3–32 letters, numbers or underscores. Password: 10–128 characters. Keep your password somewhere safe; account recovery is not available in this first version.</p><button class="button primary" id="auth-submit" type="submit">${state.accountMode==='login'?'Sign in':'Create my account'} ↗</button><div id="auth-error" class="form-error" role="alert"></div></form><p class="footnote">Real accounts, private favourites, and passwords stored as secure hashes. No default login or shared account.</p>`}</section></div>${footer()}</div>`;
  document.querySelectorAll('[data-auth-mode]').forEach(b=>b.onclick=()=>{state.accountMode=b.dataset.authMode;accountPage();});
  const form=document.getElementById('auth-form');
  if(form)form.addEventListener('submit',async e=>{
    e.preventDefault();const button=document.getElementById('auth-submit');button.disabled=true;document.getElementById('auth-error').textContent='';
    try{
      const result=await api('/api/'+state.accountMode,'POST',{username:document.getElementById('username').value,password:document.getElementById('password').value});
      state.user=result.user;state.csrf=result.csrf;state.favourites=new Set(await api('/api/favourites'));nav();
      if(state.pending){const id=state.pending;state.pending=null;await api('/api/favourites/'+id,'POST');state.favourites.add(id);}
      navigate('/favourites');toast('Welcome to Veyra. Your atlas is ready.');
    }catch(error){document.getElementById('auth-error').textContent=error.message;}finally{button.disabled=false;}
  });
  const logout=document.getElementById('logout');if(logout)logout.onclick=async()=>{logout.disabled=true;try{const result=await api('/api/logout','POST');state.user=null;state.csrf=result.csrf;state.favourites.clear();nav();accountPage();toast('You are signed out.');}catch(e){toast(e.message);logout.disabled=false;}};
}

function render(){
  state.modelAbort?.abort();state.modelAbort=null;state.viewerCleanup?.();state.viewerCleanup=null;state.route++;state.view?.dispose();state.view=null;nav();document.title='Veyra — The Lantern Isles';
  const path=location.pathname,params=new URLSearchParams(location.search);
  if(path==='/'){worldPage(params.get('meet'),params.get('region'));}
  else if(path==='/characters')catalogue();
  else if(path.startsWith('/characters/'))characterPage(decodeURIComponent(path.slice(12)));
  else if(path==='/history')historyPage();
  else if(path==='/favourites')catalogue(true);
  else if(path==='/account')accountPage();
  else main.innerHTML='<div class="page"><h1>This path is not on the map.</h1><a href="/" class="button">Return to Veyra</a></div>';
}
function navigate(url){history.pushState({},'',url);render();window.scrollTo(0,0);main.focus({preventScroll:true});}
document.addEventListener('click',async e=>{
  const favourite=e.target.closest('[data-favourite]');
  if(favourite){
    if(!state.user){state.pending=favourite.dataset.favourite;navigate('/account');toast('Sign in to keep this resident in your favourites.');return;}
    const id=favourite.dataset.favourite,saved=state.favourites.has(id);favourite.disabled=true;
    try{await api('/api/favourites/'+id,saved?'DELETE':'POST');if(saved)state.favourites.delete(id);else state.favourites.add(id);
      if(location.pathname==='/favourites'){catalogue(true);}
      else document.querySelectorAll(`[data-favourite="${id}"]`).forEach(button=>{const current=state.favourites.has(id);if(button.classList.contains('save-heart')){button.classList.toggle('saved',current);button.textContent=current?'♥':'♡';button.setAttribute('aria-pressed',current);button.setAttribute('aria-label',`${current?'Remove':'Save'} ${state.world.characters.find(c=>c.id===id).name} ${current?'from':'to'} favourites`);}else button.textContent=current?'♥ Saved to favourites':'♡ Save to favourites';});
      toast(saved?'Removed from your favourites.':'Saved to your favourites.');
    }catch(error){toast(error.message);}finally{favourite.disabled=false;}return;
  }
  const link=e.target.closest('a[href]');if(!link||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button!==0||link.target||link.hasAttribute('download'))return;
  const url=new URL(link.href);if(url.origin===location.origin&&!url.hash){e.preventDefault();navigate(url.pathname+url.search);}
});
window.addEventListener('popstate',render);
async function boot(){
  try{
    const [world,session]=await Promise.all([api('/api/world'),api('/api/session')]);state.world=world;state.user=session.user;state.csrf=session.csrf;
    if(state.user)state.favourites=new Set(await api('/api/favourites'));
    render();
  }catch(error){main.innerHTML=`<div class="page"><span class="eyebrow">A SMALL DETOUR</span><h1>The atlas could not open.</h1><p>${esc(error.message)}</p><button class="button primary" id="retry">Try again</button></div>`;document.getElementById('retry').onclick=boot;}
}
boot();
