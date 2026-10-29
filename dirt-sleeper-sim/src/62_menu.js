/* =====================================================================================
   THE MENU (the car and its build, the driving level, where to go, camera and volume) and the boot.
   ===================================================================================== */
function openMenu(first){
  GAME.state='menu';$('menu').hidden=false;syncTouch();
  $('mGo').textContent=first?'Start driving':'Back to driving';$('mEyebrow').textContent=first?'Free roam: the ranch and the country round it':'Paused';
  syncMenu();setTimeout(()=>$('mGo').focus({preventScroll:true}),0);
}
function closeMenu(){
  GAME.state='drive';$('menu').hidden=true;syncTouch();INPUT.down.clear();
  if(GAME.car.pt.st==='off'&&!GAME.engineWanted){GAME.engineWanted=true;startEngine();}
}
function syncMenu(){
  for(const el of $('mCars').querySelectorAll('.card'))el.setAttribute('aria-pressed',String(+el.dataset.i===APP.build));
  for(const el of $('mLevel').children)el.setAttribute('aria-pressed',String(el.dataset.v===APP.level));
  $('mLevelHint').textContent=LEVELS.find(l=>l[0]===APP.level)[2];
  syncSimCard();
  for(const el of $('mCam').children)el.setAttribute('aria-pressed',String(+el.dataset.v===APP.cam));
  $('vol').value=ENG.vol;$('mStatus').textContent=ENG.status||'';
  for(const el of $('mGfx').children)el.setAttribute('aria-pressed',String(el.dataset.v===GFX.level));
  $('mGfxHint').textContent=GFX_LEVELS.find(l=>l[0]===GFX.level)[2]+' More dots are sharper and cost more.';
  for(const el of $('mRes').children)el.setAttribute('aria-pressed',String(+el.dataset.v===APP.res));
  syncWeather();
  syncDev();
}
function buildMenu(){
  /* a row for each car, a card for each of its builds */
  const cx=$('mCars');
  for(const [car,name] of CARS){const row=document.createElement('div');row.className='carrow';row.innerHTML='<span></span><div class="cards"></div>';
    row.querySelector('span').textContent=name;const cards=row.querySelector('.cards');
    for(const i of carBuilds(car)){const b=BUILDS[i],el=document.createElement('button');el.type='button';el.className='card';el.dataset.i=String(i);
      el.innerHTML='<b></b><small></small>';el.querySelector('b').textContent=b.name;el.querySelector('small').textContent=b.tag;
      el.addEventListener('click',()=>{if(i===APP.build)return;APP.build=i;saveGame();spawnCar(i);syncMenu();});cards.appendChild(el);}
    cx.appendChild(row);}
  const lv=$('mLevel');for(const [id,n] of LEVELS){const el=document.createElement('button');el.type='button';el.dataset.v=id;el.textContent=n;
    /* into or out of Sim the car is rebuilt where it stands (its roof load moves its centre of gravity) */
    el.addEventListener('click',()=>{const was=APP.level==='sim';APP.level=id;saveGame();if(was!==(id==='sim'))spawnCar(APP.build);else GAME.car.setAssists(id);syncMenu();});lv.appendChild(el);}
  buildSimCard();
  const px=$('mPlaces');for(const [id,n] of PLACES){const el=document.createElement('button');el.type='button';el.className='place';el.textContent=n;
    el.addEventListener('click',()=>{goTo(id);closeMenu();});px.appendChild(el);}
  const cm=$('mCam');CAMS.forEach((n,i)=>{const el=document.createElement('button');el.type='button';el.dataset.v=String(i);el.textContent=n;
    el.addEventListener('click',()=>{APP.cam=i;CAM.cut=true;saveGame();syncMenu();});cm.appendChild(el);});
  const gx=$('mGfx');for(const [id,n] of GFX_LEVELS){const el=document.createElement('button');el.type='button';el.dataset.v=id;el.textContent=n;
    el.addEventListener('click',()=>{setGfx(id);GFXW.said=false;GFXW.t=0;syncMenu();});gx.appendChild(el);}
  $('gfx').addEventListener('click',()=>{const i=GFX_LEVELS.findIndex(l=>l[0]===GFX.level);setGfx(GFX_LEVELS[(i+1)%GFX_LEVELS.length][0]);GFXW.said=false;GFXW.t=0;if(GAME.state==='menu')syncMenu();});
  setGfx(GFX.level);
  const rx=$('mRes');RES.forEach(([w,h],i)=>{const el=document.createElement('button');el.type='button';el.dataset.v=String(i);el.textContent=w+'×'+h;
    el.addEventListener('click',()=>{setRes(i);layout();syncMenu();});rx.appendChild(el);});
  buildDev();
  $('vol').addEventListener('input',e=>setVolume(e.target.value));
  $('mGo').addEventListener('click',closeMenu);
  $('menuBtn').addEventListener('click',()=>GAME.state==='drive'?openMenu(false):closeMenu());
  $('res').addEventListener('click',()=>{setRes((APP.res+1)%RES.length);layout();});
}
/* ---------- the Sim card: tyre pressure, weather and roof cargo ---------- */
let SIM_HINT='air';
function buildSimCard(){
  const rows=[['mSimAir',SIM_AIR,'air'],['mSimWx',SIM_WX,'wx'],['mSimCargo',SIM_CARGO,'cargo']];
  for(const [host,T,k] of rows){const el=$(host);
    for(const [id,n] of T){const b=document.createElement('button');b.type='button';b.dataset.v=id;b.textContent=n;
      b.addEventListener('click',()=>{if(b.disabled)return;const old=SIMSET[k];SIMSET[k]=id;SIM_HINT=k;saveSim();
        if(k==='cargo'){if(old!==id)spawnCar(APP.build);}else if(GAME.car)GAME.car.applySim();
        syncWeather();syncMenu();});el.appendChild(b);}}
}
function syncSimCard(){
  const on=APP.level==='sim';$('mSim').hidden=!on;if(!on)return;
  const t=GAME.car,C=t?t.c.sim:null,canCargo=!!(C&&C.canCargo);
  for(const [host,k] of [['mSimAir','air'],['mSimWx','wx'],['mSimCargo','cargo']])
    for(const b of $(host).children){b.setAttribute('aria-pressed',String(b.dataset.v===SIMSET[k]));if(k==='cargo')b.disabled=!canCargo&&b.dataset.v!=='none';}
  const T={air:SIM_AIR,wx:SIM_WX,cargo:SIM_CARGO}[SIM_HINT],row=T.find(a=>a[0]===SIMSET[SIM_HINT]);let hint=row?row[3]:'';
  if(SIM_HINT==='air'&&C){const pr=simVal(SIM_AIR,SIMSET.air),f=Math.round(C.psiF*pr),r=Math.round(C.psiR*pr);hint+=' This car: '+(f===r?f+' psi all round.':f+' psi front, '+r+' rear.');}
  if(SIM_HINT==='cargo'&&!canCargo)hint='This car has no roof rails, bars or rack to strap cargo to.';
  $('mSimHint').textContent=hint;
}
/* ---------- boot ---------- */
if(!gl){$('err').style.display='grid';$('loading').hidden=true;}
else{
  let r=parseInt(store.get('dssim-res',-1),10);if(!(r>=0&&r<RES.length)){const d=devicePixelRatio||1;r=!touchy&&innerWidth*d>=1500?2:1;}
  LIT_DEFS='#define WORLD\n';setRes(r);glInit();resize();addEventListener('resize',resize);
  /* let the loading line paint, then build the ranch */
  requestAnimationFrame(()=>setTimeout(()=>{
    try{
      buildRanchGL();computePlaces();mapBitmap();spawnCar(APP.build,6,4,0);buildMenu();bindTouch();
      $('loading').hidden=true;openMenu(true);requestAnimationFrame(frame);
    }catch(e){console.error(e);$('loading').textContent='Something went wrong building the ranch: '+e.message;}
  },30));
  window.__game={APP,GAME,RANCH,ENG,CAM,BUILDS,CARS,spawnCar,placeCar,goTo,openMenu,closeMenu,startEngine,setRes,render,step,soundUpdate,makeCar,truck,
    dev:{DEV_T,DEV_GRIP,devApply,devTag,devStep},
    GFX,setGfx,SIMSET,SIMDEV,syncWeather,
    snap(){render(1/60);return cv.toDataURL('image/png');}};
}
