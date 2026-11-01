/* =====================================================================================
   THE BOOT: the dots, the GL, the open world, the car and the menu, once every module above is in place.
   ===================================================================================== */
/* the renderer first (12_display): it makes the GL context; without WebGL2 and float targets the page says so */
try{rutInit();}catch(e){console.error(e);if(!/WebGL2/.test(e.message))$('err').textContent='The graphics could not start: '+e.message;}
if(!gl){$('err').style.display='grid';$('loading').hidden=true;}
else{
  /* the phone's graphics can restart under it (heat, too little memory, a driver crash): the page keeps nothing it
     could draw with, so it says so and starts again (the saves are kept) */
  cv.addEventListener('webglcontextlost',e=>{e.preventDefault();try{saveGame();}catch(_){}const L=$('loading');L.hidden=false;L.textContent='The phone restarted its graphics. Starting again…';
    setTimeout(()=>location.reload(),2500);},false);
  cv.addEventListener('webglcontextrestored',()=>location.reload(),false);
  /* dots: a big screen or a high-density phone held sideways gets the fine 960 x 540 grid */
  let r=parseInt(store.get('wo2-res',-1),10);if(!(r>=0&&r<RES.length)){const d=devicePixelRatio||1,long=Math.max(innerWidth,innerHeight)*d;r=matchMedia('(pointer: coarse)').matches?(long>=1800?3:long>=1200?2:1):4;}
  setRes(r);resize();txtFonts();addEventListener('resize',resize);
  applyTod(APP.tod);APP.lights=!!((TOD[APP.tod]||TOD.day).beams??(TOD[APP.tod]||TOD.day).lightsOn);gfxLabel();
  /* let the loading line paint, then start the world */
  requestAnimationFrame(()=>setTimeout(()=>{
    try{
      /* the world's streaming and the renderer's world: the hooks, the town's lights in its grid, the programs */
      worldInit();worldGL();computePlaces();bindTouch();setDetail(APP.detail);
      /* the game you were in last: the career (60_career) or free play */
      if(store.get('wo2-mode','free')==='career')setMode('career');else spawnCar(rigBuild(APP.car,rigOf(APP.car)),HOME[0],HOME[1],HOME[2]);buildMenu();buildDevWorld();
      /* the shaders compile behind the loading line, so the first frame doesn't stall */
      $('loading').textContent='Warming up the shaders';
      R.G.warmup((d,n)=>{$('loading').textContent='Warming up the shaders '+d+' / '+n;}).then(()=>{
        $('loading').hidden=true;openMenu(true);requestAnimationFrame(frame);
        /* the ground's photographs decode while the opening screen is up, and fade in */
        texLoad();
      }).catch(e=>{console.error(e);$('loading').textContent='A shader would not compile: '+e.message;});
    }catch(e){console.error(e);$('loading').textContent='Something went wrong starting the world: '+e.message;}
  },30));
  window.__game={showClutchCap,TH,thNeed,thGate,thLimit,thDecorate,tuneSwap,TUNE,SPECS,dlSetVal,DL_SETUP,JOBS,JOB,PEOPLE,jActive,jOffer,jTarget,jAccept,jDrop,jobListen,closeJobDialog,jRec,CHALS,CHAL,ChalRun,DriftScore,chalStart,chalQuit,closeChalResult,showChalResult,drawChalHud,chalMarks,resetCar,placeName,chMedalOf,chFmt,chResult,syncChals,CAREER,setMode,cash,earn,DEALER,ownsPart,rigCost,buyRig,buyCar,PARKT,LG,GroundWorld,devFit,syncShow,showMeasure,rect:()=>RECT,grid:()=>({W,H,BW,BH,HS}),TXT,setDotText,txtFlush,DL,dlOpen,dlFrame,dlSetVal,dlParams,TUNE,tuneKey,SPECS,bayFill,BAYGRID,showSpec,RIGS,TRANS,PRESET_PARTS,specOf,speedTest,CARS,presetsOf,presetRig,rigBuild,PLUS,setPlus,PULL,showPullStart,showChart,showMeasure,PS,PERF,TLIST,DISP,showBody,showMode,showAct,showRuns,dynoOf,showHud,showFull,SHOW,showSetView,showEngine,renderShow,showSound,showLeave,MENU,ENG,setTestInput,makeDSP,SIM,BODY,setBody,WORLD,WG,RO,DEVW,CRUISE,toggleCruise,worldUpdate,drawWorld,setOrigin,PLACES:()=>PLACES,APP,GAME,RANCH,ENG,CAM,BUILDS,CARS,RIGS,Feats,spawnCar,spawnRig,placeCar,goTo,openMenu,closeMenu,showTab,startEngine,setRes,render,step,soundUpdate,makeCar,truck,rigBuild,rateRig,presetRig,startRun,setDetail,applyTod,TOUCH,
    GFX,setGfx,SIMSET,SIMDEV,syncWeather,dev:{DEV_T,DEV_GRIP,devApply,devTag,devStep},get gl(){return gl;},get R(){return R;},SL3,rutShaders,get RESO(){return RESO;},SKY,TOD,compile,setDisplay,PIC,LOOK,TEX,texLoad,LAND,CARHOOK,FXP,STUDIO,GLASSHOOK,envNow,lgBuild,lgPlace,get P_LAND(){return P_LAND;},get P_DEPTH(){return P_DEPTH;},rperfRows,carLights,yardLights,worldFar,viewCut,FX,
    RACE,RACE_EVENTS,startRace,raceEnd,raceOrder,hideResults,Driver,RaceLine,INPUT,truckFar,raceLine,raceCar,raceSettle,raceAccel,pickRivals,TRUCK,TRUCKF,
    parts:{SLOTS,slotOptions,ENGINES,DE_ENGINES,ENGINE_OF,MACH,CAR_PARTS,POWER,NITROUS,TUNES,CAM_PARTS,EXHAUSTS},
    snap(){render(1/60);return cv.toDataURL('image/png');}};
}
