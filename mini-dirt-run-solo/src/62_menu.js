/* =====================================================================================
   THE MENU: Drive (the car, its build, the driving level, day or night, the camera, where to go), the Garage
   (63_garage), Cool stuff (free play's money, the last ten cool things and the bests), Clock runs and
   Settings.
   ===================================================================================== */
const MENU={tab:'drive',sure:null};
const MODE_HINT={free:'Every car and every part is yours from the start. The money is a score.',
  career:'The slow grind: your own truck and $1,500. Every feat pays; spend it on parts and on cars. The odd ones can\'t be bought: each is earned by doing something silly.'};
/* a preset's button: in free play it just goes on; in the career it shows what its parts you don't own would
   cost, and the first tap asks before buying them */
function presetButton(car,id,cur,done){
  const b=BUILDS.find(q=>q.id===id),el=document.createElement('button');el.type='button';el.className='place';el.title=b.tag;
  const m=Career.on()?Career.missing(car,id):{cost:0},key=car+':'+id;
  el.textContent=MENU.sure===key?'Tap again: buy the parts for '+Feats.fmtMoney(m.cost):b.name+(m.cost?' · '+Feats.fmtMoney(m.cost):'');
  el.setAttribute('aria-pressed',String(cur===b.name));
  el.addEventListener('click',()=>{
    if(m.cost){if(m.cost>Career.money()){say('Need '+Feats.fmtMoney(m.cost-Career.money())+' more for that build',2.2);MENU.sure=null;return done(false);}
      if(MENU.sure!==key){MENU.sure=key;return done(false);}
      MENU.sure=null;if(!Career.buyPreset(car,id))return done(false);}
    MENU.sure=null;RIGS[car]=presetRig(id);saveGame();spawnRig();done(true);});
  return el;
}
/* a car card's tap in the career: an odd one says how to earn it; one for sale asks, then buys */
function careerCarTap(car){
  if(Career.hasCar(car))return true;
  if(JOKES[car]){say('Earn it: '+JOKES[car].goal,3.4);return false;}
  const pr=CAR_PRICE[car];if(pr>Career.money()){say('Need '+Feats.fmtMoney(pr-Career.money())+' more',2);MENU.sure=null;return false;}
  if(MENU.sure!=='car:'+car){MENU.sure='car:'+car;return false;}
  MENU.sure=null;return Career.buyCar(car);
}
function setMode(v){
  if(v===APP.mode)return;if(Feats.S.combo)Feats.bankNow();
  if(v==='career')Career.enter();else Career.leave();
  GAR.open=null;spawnRig();syncMenu();
  if($('mEyebrow').textContent!=='Paused')$('mEyebrow').textContent=v==='career'?'Career: earn it, buy it':'Free play: every car and part is yours';if(MENU.tab==='garage')syncGarage();if(MENU.tab==='cool')syncCool();
}
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
  $('mGo').textContent=first?'Start driving':'Back to driving';$('mEyebrow').textContent=first?(APP.mode==='career'?'Career: earn it, buy it':'Free play: every car and part is yours'):'Paused';
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
  const car0=APP.car,cr=Career.on();
  $('mMoney').textContent=Feats.fmtMoney(Feats.S.money);$('mWalletL').textContent=cr?'Career money':'Free play money';
  for(const el of $('mMode').children)el.setAttribute('aria-pressed',String(el.dataset.v===APP.mode));$('mModeHint').textContent=MODE_HINT[APP.mode];
  for(const el of $('mCars').querySelectorAll('.card')){const c=el.dataset.car,has=Career.hasCar(c);el.setAttribute('aria-pressed',String(c===car0));el.classList.toggle('lock',!has);
    const sm=el.querySelector('small');sm.classList.toggle('price',!has&&!JOKES[c]);
    sm.textContent=has?rigName(c,rigOf(c)):JOKES[c]?'Earn it':MENU.sure==='car:'+c?'Tap: buy '+Feats.fmtMoney(CAR_PRICE[c]):Feats.fmtMoney(CAR_PRICE[c]);}
  $('mCarHint').textContent=CAR_HINT[car0];
  /* the presets for this car, and Custom when the garage has changed it */
  const pr=$('mPresets');pr.textContent='';const cur=rigName(APP.car,rigOf(APP.car));
  for(const id of presetsOf(APP.car))pr.appendChild(presetButton(APP.car,id,cur,()=>syncMenu()));
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
  $('sFreeSec').hidden=cr;$('sCareerSec').hidden=!cr;
}
function segButtons(host,items,cb){for(const [v,n] of items){const el=document.createElement('button');el.type='button';el.dataset.v=String(v);el.textContent=n;el.addEventListener('click',()=>{cb(v);syncMenu();});host.appendChild(el);}}
function buildMenu(){
  for(const b of $('mTabs').children)b.addEventListener('click',()=>showTab(b.dataset.t));
  const cx=$('mCars');let grp='';
  for(const [car,name] of CARS){
    if(carGroup(car)!==grp){grp=carGroup(car);const h=document.createElement('div');h.className='cgrp';h.textContent=CAR_GROUPS[grp];cx.appendChild(h);}
    const el=document.createElement('button');el.type='button';el.className='card';el.dataset.car=car;el.innerHTML='<b></b><small></small>';
    el.querySelector('b').textContent=name;el.querySelector('small').textContent=rigName(car,rigOf(car));
    el.addEventListener('click',()=>{if(car===APP.car)return;if(Career.on()&&!careerCarTap(car)){syncMenu();if(JOKES[car])$('mCarHint').textContent=CAR_HINT[car]+' To earn it: '+JOKES[car].goal;return;}
      APP.car=car;saveGame();spawnRig();syncMenu();});cx.appendChild(el);}
  segButtons($('mMode'),[['free','Free play'],['career','Career']],v=>setMode(v));
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
  /* the career's save code */
  $('sCode').addEventListener('click',()=>{const c=Career.code(),box=$('sCodeBox');box.hidden=false;box.readOnly=true;box.value=c;$('sLoadRow').hidden=true;box.select();
    let ok=false;try{if(navigator.clipboard){navigator.clipboard.writeText(c).then(()=>{$('sCNote').textContent='Copied. It is also in the box above.';},()=>{});ok=true;}}catch(e){}
    $('sCNote').textContent=ok?'Copying…':'Select it in the box and copy it.';});
  $('sLoad').addEventListener('click',()=>{const box=$('sCodeBox');box.hidden=false;box.readOnly=false;box.value='';box.placeholder='Paste a save code here';$('sLoadRow').hidden=false;box.focus();$('sCNote').textContent='';});
  $('sLoadGo').addEventListener('click',()=>{const err=Career.loadCode($('sCodeBox').value);$('sCNote').textContent=err||'Loaded.';if(!err){$('sLoadRow').hidden=true;$('sCodeBox').hidden=true;spawnRig();syncMenu();}});
  $('sNew').addEventListener('click',()=>{if($('sNew').dataset.sure!=='1'){$('sNew').dataset.sure='1';$('sNew').textContent='Tap again: lose this career';return;}
    $('sNew').dataset.sure='';$('sNew').textContent='Start a new career';Career.restart();spawnRig();syncMenu();$('sCNote').textContent='A new career: your truck and $1,500.';});
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
  const S=Feats.S,cr=Career.on();$('cSession').textContent=Feats.fmtMoney(S.session);$('cTotal').textContent=Feats.fmtMoney(S.money);$('cTotalL').textContent=cr?'Career money':'All free play';
  /* the career: the odd ones and how far along each is, and what's for sale */
  $('cCareer').hidden=!cr;
  if(cr){const G=$('cGoals');G.textContent='';const P=Career.S.prog;
    for(const id of Object.keys(JOKES)){const J=JOKES[id],has=!!Career.S.cars[id],v=Math.min(J.need,P[id]||0),el=document.createElement('div');el.className='goal'+(has?' done':'');
      el.innerHTML='<b></b><small></small><div class="gb"><i></i></div>';el.querySelector('b').textContent=MACH[id].name+(has?': yours':'');
      el.querySelector('small').textContent=has?J.line:J.goal+(J.need>1?` (${J.unit?v.toFixed(1)+' of '+J.need+' '+J.unit:Math.floor(v)+' of '+J.need})`:'');
      el.querySelector('i').style.width=(has?100:v/J.need*100).toFixed(1)+'%';G.appendChild(el);}
    const sale=Object.keys(CAR_PRICE).filter(c=>!Career.S.cars[c]).map(c=>carName({car:c})+' '+Feats.fmtMoney(CAR_PRICE[c]));
    $('cCareerNote').textContent=sale.length?'For sale: '+sale.join(' · ')+'. Tap one in Drive to buy it.':'You own every car and quad that\'s for sale.';}
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
