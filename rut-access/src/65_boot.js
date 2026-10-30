/* =====================================================================================
   THE BOOT: the dots, the renderer, the ranch, the car and the menu, once every module above is in place.
   The shaders are warmed up behind the loading line, so the first frame doesn't stall.
   ===================================================================================== */
{
  /* dots: a big screen or a high-density phone held sideways gets the fine 960 x 540 grid */
  let r=parseInt(store.get('rut-res',-1),10);if(!(r>=0&&r<RES.length)){const d=devicePixelRatio||1,long=Math.max(innerWidth,innerHeight)*d;r=long>=1800?3:long>=1200?2:1;}
  setRes(r);
  let ok=true;
  try{rutInit();}catch(e){console.error(e);ok=false;if(!/WebGL2/.test(e.message))$('err').textContent='The graphics could not start: '+e.message;$('err').style.display='grid';$('loading').hidden=true;}
  if(ok){
    applyTod(APP.tod);APP.lights=APP.tod==='night';gfxLabel();
    /* let the loading line paint, then build the ranch */
    requestAnimationFrame(()=>setTimeout(()=>{
      try{
        buildRanchGL();
        /* the renderer's world: no geometry of its own (the land comes through the hooks), the lamps in its clustered
           grid over the whole two-mile map and a margin, 8 m cells */
        R.loadWorld({geo:null,lights:landLights(),info:{lightGrid:{x0:-1700,z0:-1700,size:3400,cell:8}}});
        R.extra.push(LAND,CARHOOK,FXP);
        landPrograms();FXP.init();displayPrograms();
        computePlaces();mapBitmap();bindTouch();
        spawnCar(rigBuild(APP.car,rigOf(APP.car)),6,4,0);buildMenu();
        $('loading').textContent='Warming up the shaders';
        R.G.warmup((d,n)=>{$('loading').textContent='Warming up the shaders '+d+' / '+n;}).then(()=>{
          $('loading').hidden=true;openMenu(true);requestAnimationFrame(frame);
        }).catch(e=>{console.error(e);$('loading').textContent='A shader would not compile: '+e.message;});
      }catch(e){console.error(e);$('loading').textContent='Something went wrong building the ranch: '+e.message;}
    },30));
  }
  window.__game={APP,GAME,RANCH,ENG,CAM,BUILDS,CARS,RIGS,Feats,spawnCar,spawnRig,placeCar,goTo,openMenu,closeMenu,showTab,startEngine,setRes,render,step,soundUpdate,makeCar,truck,rigBuild,rateRig,presetRig,startRun,setDetail,applyTod,TOUCH,
    GFX,GFX_LEVELS,setGfx,SIMSET,SIMDEV,syncWeather,dev:{DEV_T,DEV_GRIP,devApply,devTag,devStep},get gl(){return gl;},get R(){return R;},SL3,LAND,CARHOOK,FXP,get P_LAND(){return P_LAND;},get P_DEPTH(){return P_DEPTH;},M4_ID,landDraw,landDrawDepth,drawTrees,boxVisible,compile,VS_FS,DISP,setDisplay,PIC,get RESO(){return RESO;},PERF,setPerf,SKY,TOD,WX,envNow,
    RACE,RACE_EVENTS,startRace,raceEnd,raceOrder,hideResults,Driver,RaceLine,INPUT,truckFar,
    CROSS_ROUTES,raceLine,looksOf,LADDER,CALLOUT,calloutStep,setAuto,syncRaces,
    BAY,bayTick,bayView,baySetTab,bayEnter,bayLeave,baySync,bayToggleEngine,TONE,toneApply,settleCar,LOOK,
    snap(){render(1/60);return cv.toDataURL('image/png');}};
}
