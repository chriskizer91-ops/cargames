/* =====================================================================================
   THE MENU (the truck, the driving level, where to go, camera and volume) and the boot.
   ===================================================================================== */
function openMenu(first){
  GAME.state='menu';$('menu').hidden=false;syncTouch();
  $('mGo').textContent=first?'Start driving':'Back to driving';$('mEyebrow').textContent=first?'Free roam on the ranch':'Paused';
  syncMenu();setTimeout(()=>$('mGo').focus({preventScroll:true}),0);
}
function closeMenu(){
  GAME.state='drive';$('menu').hidden=true;syncTouch();INPUT.down.clear();
  if(GAME.truck.pt.st==='off'&&!GAME.engineWanted){GAME.engineWanted=true;startEngine();}
}
function syncMenu(){
  for(const [i,el] of [...$('mTrucks').children].entries())el.setAttribute('aria-pressed',String(i===APP.build));
  for(const el of $('mLevel').children)el.setAttribute('aria-pressed',String(el.dataset.v===APP.level));
  $('mLevelHint').textContent=LEVELS.find(l=>l[0]===APP.level)[2];
  for(const el of $('mCam').children)el.setAttribute('aria-pressed',String(+el.dataset.v===APP.cam));
  $('vol').value=ENG.vol;$('mStatus').textContent=ENG.status||'';
}
function buildMenu(){
  const tx=$('mTrucks');BUILDS.forEach((b,i)=>{const el=document.createElement('button');el.type='button';el.className='card';
    el.innerHTML='<b></b><small></small>';el.querySelector('b').textContent=b.name;el.querySelector('small').textContent=b.specs[3][1];
    el.addEventListener('click',()=>{if(i===APP.build)return;APP.build=i;saveGame();spawnTruck(i);syncMenu();});tx.appendChild(el);});
  const lv=$('mLevel');for(const [id,n] of LEVELS){const el=document.createElement('button');el.type='button';el.dataset.v=id;el.textContent=n;
    el.addEventListener('click',()=>{APP.level=id;saveGame();GAME.truck.setAssists(id);syncMenu();});lv.appendChild(el);}
  const px=$('mPlaces');for(const [id,n] of PLACES){const el=document.createElement('button');el.type='button';el.className='place';el.textContent=n;
    el.addEventListener('click',()=>{goTo(id);closeMenu();});px.appendChild(el);}
  const cm=$('mCam');CAMS.forEach((n,i)=>{const el=document.createElement('button');el.type='button';el.dataset.v=String(i);el.textContent=n;
    el.addEventListener('click',()=>{APP.cam=i;CAM.cut=true;saveGame();syncMenu();});cm.appendChild(el);});
  $('vol').addEventListener('input',e=>setVolume(e.target.value));
  $('mGo').addEventListener('click',closeMenu);
  $('menuBtn').addEventListener('click',()=>GAME.state==='drive'?openMenu(false):closeMenu());
  $('res').addEventListener('click',()=>{setRes((APP.res+1)%RES.length);MAPBMP=null;layout();});
}
/* ---------- boot ---------- */
if(!gl){$('err').style.display='grid';$('loading').hidden=true;}
else{
  let r=parseInt(store.get('dsmini-res',-1),10);if(!(r>=0&&r<RES.length)){const d=devicePixelRatio||1;r=!touchy&&innerWidth*d>=1500?2:1;}
  setRes(r);glInit();resize();addEventListener('resize',resize);
  /* let the loading line paint, then build the ranch */
  requestAnimationFrame(()=>setTimeout(()=>{
    try{
      buildRanchGL();computePlaces();spawnTruck(APP.build,6,4,0);buildMenu();bindTouch();
      $('loading').hidden=true;openMenu(true);requestAnimationFrame(frame);
    }catch(e){console.error(e);$('loading').textContent='Something went wrong building the ranch: '+e.message;}
  },30));
  window.__game={APP,GAME,RANCH,ENG,CAM,BUILDS,spawnTruck,placeTruck,goTo,openMenu,closeMenu,startEngine,setRes,render,step,soundUpdate,
    snap(){render(1/60);return cv.toDataURL('image/png');}};
}
