/* =====================================================================================
   THE MENU: Drive (the car, its build, the driving level, day or night, the camera, where to go), the Garage
   (63_garage), Cool stuff (free play's money, the last ten cool things and the bests), Clock runs and
   Settings.
   ===================================================================================== */
const MENU={tab:'drive'};
const CAR_HINT={suv:'A mid-2000s luxury SUV with a 4.6 V8, a six-speed automatic and all-wheel drive with a low range.',trail:'A short two-door off-roader on a ladder frame: solid axles and a low range from the factory.',
  coupe:'A front-engine flat-plane V8 fastback: a track car with plates. Rear-drive.',wagon:'A plain family wagon hiding a turbo five and all-wheel drive.',
  pickup:'A full-size crew cab in off-road trim: 5.7 V8, a rear locker and a low range.',muscle:'A 1970-style big-block fastback with a four-speed. Rear-drive and proud of it.',
  hatch:'A mid-1980s turbo four-wheel-drive homologation hatch: light and eager.'};
for(const id of MACH_IDS)CAR_HINT[id]=MACH[id].hint;
const CAR_GROUPS={Cars:'Cars and trucks',Quads:'Quads and side-by-sides',Odd:'The odd ones'};
const carGroup=car=>MACH[car]?MACH[car].grp:'Cars';
function openMenu(first){
  /* pausing banks whatever combo is on the table: changing parts or going somewhere won't cost it */
  if(GAME.state==='drive'&&Feats.S.combo)Feats.bankNow();
  GAME.state='menu';$('menu').hidden=false;syncTouch();
  $('mGo').textContent=first?'Start driving':'Back to driving';$('mEyebrow').textContent=first?'Free play: every car and part is yours':'Paused';
  showTab(MENU.tab);syncMenu();setTimeout(()=>$('mGo').focus({preventScroll:true}),0);
}
function closeMenu(){
  GAME.state='drive';$('menu').hidden=true;APP.orbit=false;CAM.cut=true;syncTouch();INPUT.down.clear();
  if(GAME.car.pt.st==='off'&&!GAME.engineWanted){GAME.engineWanted=true;startEngine();}
}
function showTab(id){
  if(MENU.tab!==id)$('menu').scrollTop=0;MENU.tab=id;for(const b of $('mTabs').children)b.setAttribute('aria-selected',String(b.dataset.t===id));
  for(const el of document.querySelectorAll('#menu .tab'))el.hidden=el.dataset.tab!==id;
  /* in the garage the car turns in front of you */
  APP.orbit=id==='garage'&&GAME.state==='menu';$('menu').classList.toggle('garage',APP.orbit);
  requestAnimationFrame(()=>{const r=document.querySelector('#menu .mwrap').getBoundingClientRect();APP.menuRight=r.right;});
  if(id==='garage')syncGarage();if(id==='cool')syncCool();if(id==='runs')syncRuns();
}
function syncMenu(){
  $('mMoney').textContent=Feats.fmtMoney(Feats.S.money);
  for(const el of $('mCars').querySelectorAll('.card')){el.setAttribute('aria-pressed',String(el.dataset.car===APP.car));el.querySelector('small').textContent=rigName(el.dataset.car,rigOf(el.dataset.car));}
  $('mCarHint').textContent=CAR_HINT[APP.car];
  /* the presets for this car, and Custom when the garage has changed it */
  const pr=$('mPresets');pr.textContent='';const cur=rigName(APP.car,rigOf(APP.car));
  for(const id of presetsOf(APP.car)){const b=BUILDS.find(q=>q.id===id),el=document.createElement('button');el.type='button';el.className='place';el.textContent=b.name;el.title=b.tag;
    el.setAttribute('aria-pressed',String(cur===b.name));el.addEventListener('click',()=>{RIGS[APP.car]=presetRig(id);saveGame();spawnRig();syncMenu();});pr.appendChild(el);}
  if(cur==='Custom'){const el=document.createElement('button');el.type='button';el.className='place';el.textContent='Your custom build';el.setAttribute('aria-pressed','true');el.addEventListener('click',()=>showTab('garage'));pr.appendChild(el);}
  for(const el of $('mLevel').children)el.setAttribute('aria-pressed',String(el.dataset.v===APP.level));
  $('mLevelHint').textContent=LEVELS.find(l=>l[0]===APP.level)[2];
  for(const el of $('mCam').children)el.setAttribute('aria-pressed',String(+el.dataset.v===APP.cam));
  for(const el of $('mTod').children)el.setAttribute('aria-pressed',String(el.dataset.v===APP.tod));
  for(const el of $('sSteer').children)el.setAttribute('aria-pressed',String(el.dataset.v===APP.steer));
  $('sSteerHint').textContent={slide:'Put your left thumb down anywhere on the left side and slide it: how far from where it landed is how far the wheels turn.',
    tilt:'Tilt the phone like a steering wheel. It takes the way you hold it when you pick this as straight ahead.',buttons:'Two buttons, left and right, like before.'}[APP.steer];
  for(const el of $('sHaptics').children)el.setAttribute('aria-pressed',String((el.dataset.v==='on')===APP.haptics));
  for(const el of $('sDetail').children)el.setAttribute('aria-pressed',String(el.dataset.v===APP.detail));
  for(const el of $('sDots').children)el.setAttribute('aria-pressed',String(+el.dataset.v===APP.res));
  $('sDetailHint').textContent='Detail is how finely the picture is drawn behind each dot. Auto starts sharp (smooth on a phone) and steps down by itself if the frame rate drops while you drive.';
  $('vol').value=ENG.vol;$('mStatus').textContent=ENG.status||'';
}
function segButtons(host,items,cb){for(const [v,n] of items){const el=document.createElement('button');el.type='button';el.dataset.v=String(v);el.textContent=n;el.addEventListener('click',()=>{cb(v);syncMenu();});host.appendChild(el);}}
function buildMenu(){
  for(const b of $('mTabs').children)b.addEventListener('click',()=>showTab(b.dataset.t));
  const cx=$('mCars');let grp='';
  for(const [car,name] of CARS){
    if(carGroup(car)!==grp){grp=carGroup(car);const h=document.createElement('div');h.className='cgrp';h.textContent=CAR_GROUPS[grp];cx.appendChild(h);}
    const el=document.createElement('button');el.type='button';el.className='card';el.dataset.car=car;el.innerHTML='<b></b><small></small>';
    el.querySelector('b').textContent=name;el.querySelector('small').textContent=rigName(car,rigOf(car));
    el.addEventListener('click',()=>{if(car===APP.car)return;APP.car=car;saveGame();spawnRig();syncMenu();});cx.appendChild(el);}
  segButtons($('mLevel'),LEVELS.map(l=>[l[0],l[1]]),id=>{APP.level=id;saveGame();GAME.car.setAssists(id);});
  segButtons($('mTod'),Object.entries(TOD).map(([k,v])=>[k,v.name]),id=>{APP.tod=id;applyTod(id);APP.lights=id==='night';saveGame();syncTouch();});
  segButtons($('mCam'),CAMS.map((n,i)=>[i,n]),i=>{APP.cam=+i;CAM.cut=true;saveGame();});
  const px=$('mPlaces');for(const [id,n] of PLACES){const el=document.createElement('button');el.type='button';el.className='place';el.textContent=n;
    el.addEventListener('click',()=>{goTo(id);closeMenu();});px.appendChild(el);}
  segButtons($('sSteer'),[['slide','Slide'],['tilt','Tilt'],['buttons','Buttons']],v=>{APP.steer=v;if(v==='tilt')enableTilt();saveGame();syncTouch();});
  segButtons($('sHaptics'),[['on','On'],['off','Off']],v=>{APP.haptics=v==='on';saveGame();if(APP.haptics&&navigator.vibrate)navigator.vibrate(20);});
  segButtons($('sDetail'),[['auto','Auto'],['sharp','Sharp'],['smooth','Smooth'],['fast','Fast']],v=>setDetail(v));
  segButtons($('sDots'),RES.map((r,i)=>[i,r[0]+'×'+r[1]]),i=>{setRes(+i);layout();});
  $('sClear').addEventListener('click',()=>{if($('sClear').dataset.sure!=='1'){$('sClear').dataset.sure='1';$('sClear').textContent='Tap again to clear it all';return;}
    Feats.clear();$('sClear').dataset.sure='';$('sClear').textContent='Clear money, cool stuff and bests';$('sNote').textContent='Cleared.';syncMenu();});
  $('vol').addEventListener('input',e=>setVolume(e.target.value));
  $('mGo').addEventListener('click',closeMenu);
  $('menuBtn').addEventListener('click',()=>GAME.state==='drive'?openMenu(false):closeMenu());
  $('res').addEventListener('click',()=>{setRes((APP.res+1)%RES.length);layout();});
  buildGarage();
}
/* ---------- cool stuff: the money, the last ten, the bests ---------- */
const BEST_NAMES=[['combo','Biggest combo'],['jump','Longest jump'],['airtime','Most air'],['drift','Longest drift'],['two','Longest on two wheels'],['wheelie','Longest wheelie'],['speed','Longest speed run'],
  ['burn','Longest burnout'],['mudpit','Fastest mud pit'],['summit','Fastest up Red Hill'],['rocks','Fastest clean rock garden'],['lap','Fastest lap']];
const ago=ms=>{const s=(Date.now()-ms)/1000;return s<90?'just now':s<5400?Math.round(s/60)+' min ago':s<129600?Math.round(s/3600)+' h ago':Math.round(s/86400)+' days ago';};
function syncCool(){
  const S=Feats.S;$('cSession').textContent=Feats.fmtMoney(S.session);$('cTotal').textContent=Feats.fmtMoney(S.money);
  const L=$('cLog');L.textContent='';
  if(!S.log.length){const p=document.createElement('p');p.className='empty';p.textContent='Nothing yet. Go drift, jump, or get sideways on the gravel.';L.appendChild(p);}
  for(const e of S.log){const li=document.createElement('li');li.innerHTML='<b></b><em></em><small></small>';li.querySelector('b').textContent=e.what;li.querySelector('em').textContent='+'+Feats.fmtMoney(e.money);
    li.querySelector('small').textContent=[e.where,e.car,ago(e.at)].filter(Boolean).join(' · ');L.appendChild(li);}
  const B=$('cBests');B.textContent='';let any=false;
  const rows=BEST_NAMES.map(([k,n])=>[k,n]).concat(RUNS.map(r=>['run:'+r.id,r.name]));
  for(const [k,n] of rows){const b=S.best[k];if(!b)continue;any=true;const el=document.createElement('div');el.innerHTML='<span></span><b></b><small></small>';
    el.querySelector('span').textContent=n;el.querySelector('b').textContent=b.label;el.querySelector('small').textContent=[b.car,ago(b.at)].filter(Boolean).join(' · ');B.appendChild(el);}
  if(!any){const p=document.createElement('p');p.className='empty';p.textContent='Your bests show up here.';B.appendChild(p);}
}
/* ---------- the clock runs ---------- */
function syncRuns(){
  const L=$('rList');L.textContent='';
  for(const r of RUNS){const el=document.createElement('button');el.type='button';el.className='run';el.innerHTML='<b></b><small></small><i></i>';
    el.querySelector('b').textContent=r.name;el.querySelector('small').textContent=r.blurb;const b=RUN.best[r.id];
    el.querySelector('i').textContent='Par '+fmtLap(r.par)+(b?'  ·  your best '+fmtLap(b):'');
    el.addEventListener('click',()=>{startRun(r.id);closeMenu();});L.appendChild(el);}
  const k=lapKey(),b=LAP.best[k];$('rLaps').textContent=(b?`Your best lap in this build: ${fmtLap(b)}. `:'')+'Drive over the start line at the race track to start a lap; it pays when you cross it again.';
}
