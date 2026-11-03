/* =====================================================================================
   THE BOOT: the dots, the GL, the open world, the car and the menu, once every module above is in place.
   ===================================================================================== */
/* the renderer first (12_display): it makes the GL context; without WebGL2 and float targets the page says so */
const BOOT={};
try{rutInit();BOOT.renderer=Math.round(performance.now());}catch(e){console.error(e);if(!/WebGL2/.test(e.message))$('err').textContent='The graphics could not start: '+e.message;}
if(!gl){$('err').style.display='grid';$('loading').hidden=true;}
else{
  /* the phone's graphics can restart under it (heat, too little memory, a driver crash): the page keeps nothing it
     could draw with, so it says so and starts again (the saves are kept) */
  cv.addEventListener('webglcontextlost',e=>{e.preventDefault();try{saveGame();}catch(_){}const L=$('loading');L.hidden=false;L.textContent='The phone restarted its graphics. Starting again…';
    setTimeout(()=>location.reload(),2500);},false);
  cv.addEventListener('webglcontextrestored',()=>location.reload(),false);
  /* dots: a big screen or a high-density phone held sideways gets the fine 960 x 540 grid */
  /* (Redline Retro: the HUD's dots 640 x 360 everywhere, chunky to go with the picture, and a quarter of the full game's upload a frame) */
  let r=parseInt(store.get('rt-res',-1),10);if(!(r>=0&&r<RES.length))r=2;
  setRes(r);resize();txtFonts();addEventListener('resize',resize);
  applyTod(APP.tod);APP.lights=!!((TOD[APP.tod]||TOD.day).beams??(TOD[APP.tod]||TOD.day).lightsOn);gfxLabel();
  /* the boot in stages, each line on the loading screen painted before its work starts; the shaders compile on the
     GPU's side while the garage's other cars are built here (both behind the loading line); the town's lights go
     into their grid once the opening screen is up. Each stage's time is kept (BOOT) for the Dev tab's numbers */
  const L=$('loading'),paint=t=>new Promise(r=>{L.textContent=t;requestAnimationFrame(()=>setTimeout(r,0));}),mark=k=>{BOOT[k]=Math.round(performance.now());};
  (async()=>{
    try{
      mark('script');await paint('Making the county');
      /* the world's streaming and the renderer's world: the hooks, the programs (their compiling starts now) */
      worldInit();worldGL();computePlaces();bindTouch();setDetail(APP.detail);mark('world');
      await paint('Building your car');
      /* the game you were in last: the career (60_career) or free play */
      if(store.get('rt-mode','free')==='career')setMode('career');else spawnCar(rigBuild(APP.car,rigOf(APP.car)),HOME[0],HOME[1],HOME[2]);buildMenu();buildDevWorld();mark('car');
      await paint('Warming up the shaders');
      /* while the GPU compiles: the other cars in the garage, one a turn (what isn't done by the time the shaders are
         is built one a frame on the opening screen, as before) */
      let warm=false,built=0;const park=CARS.map(([c])=>c).filter(c=>c!==APP.car);
      const pre=(async()=>{for(const car of park){if(warm)break;const i=rigBuild(car,rigOf(car));if(!TRUCK[BUILDS[i].id]){truck(i);built++;}await new Promise(r=>setTimeout(r,0));}})();
      /* (and the physics, a slice at a time while the GPU compiles: 60_game's physWarm) */
      const phys=physWarm().then(ms=>{BOOT.physWarm=ms;}).catch(e=>console.warn('physics warm-up',e));
      await R.G.warmup((d,n)=>{L.textContent='Warming up the shaders '+d+' / '+n+(built?' · the garage '+built+' / '+park.length:'');});
      warm=true;await pre;await phys;mark('shaders');BOOT.built=built;
      L.hidden=true;openMenu(true);requestAnimationFrame(frame);mark('menu');
      /* the town's lights into their grid, then the ground's photographs, while the opening screen is up */
      setTimeout(()=>{lgBuild();mark('lights');texLoad().then(()=>mark('photos'));},50);
    }catch(e){console.error(e);L.textContent=/shader|compile|link/i.test(e.message)?'A shader would not compile: '+e.message:'Something went wrong starting the world: '+e.message;}
  })();
  window.__game={showClutchCap,TH,thNeed,thGate,thLimit,thDecorate,tuneSwap,TUNE,SPECS,dlSetVal,DL_SETUP,JOBS,JOB,PEOPLE,jActive,jOffer,jTarget,jAccept,jDrop,jobListen,closeJobDialog,jRec,CHALS,CHAL,ChalRun,DriftScore,chalStart,chalQuit,closeChalResult,showChalResult,drawChalHud,chalMarks,resetCar,placeName,chMedalOf,chFmt,chResult,syncChals,CAREER,setMode,cash,earn,DEALER,ownsPart,rigCost,buyRig,buyCar,PARKT,LG,GroundWorld,devFit,syncShow,showMeasure,rect:()=>RECT,grid:()=>({W,H,BW,BH,HS}),TXT,setDotText,txtFlush,DL,dlOpen,dlFrame,dlSetVal,dlParams,TUNE,tuneKey,SPECS,bayFill,BAYGRID,showSpec,RIGS,TRANS,PRESET_PARTS,specOf,speedTest,CARS,presetsOf,presetRig,rigBuild,PLUS,setPlus,PULL,showPullStart,showChart,showMeasure,PS,PERF,TLIST,DISP,showBody,showMode,showAct,showRuns,dynoOf,showHud,showFull,SHOW,showSetView,showEngine,renderShow,showSound,showLeave,MENU,ENG,setTestInput,makeDSP,SIM,BODY,setBody,WORLD,WG,RO,DEVW,CRUISE,toggleCruise,worldUpdate,drawWorld,setOrigin,PLACES:()=>PLACES,APP,GAME,RANCH,ENG,CAM,BUILDS,CARS,RIGS,Feats,spawnCar,spawnRig,placeCar,goTo,openMenu,closeMenu,showTab,startEngine,setRes,render,step,soundUpdate,makeCar,truck,rigBuild,rateRig,presetRig,startRun,setDetail,applyTod,TOUCH,
    GFX,setGfx,SIMSET,SIMDEV,syncWeather,dev:{DEV_T,DEV_GRIP,devApply,devTag,devStep},get gl(){return gl;},get R(){return R;},SL3,rutShaders,get RESO(){return RESO;},SKY,TOD,compile,setDisplay,PIC,LOOK,TEX,texLoad,BOOT,BUDGET,budgetApply,perfReadout,PERF,perfBegin,perfEnd,DEVW,LAND,CARHOOK,FXP,STUDIO,GLASSHOOK,envNow,lgBuild,lgPlace,get P_LAND(){return P_LAND;},landLean:q=>{LEAN_Q=q;landRebuild();},landRebuild,carCounts,ST,trfBoxes,stShare,get P_DEPTH(){return P_DEPTH;},rperfRows,carLights,yardLights,worldFar,viewCut,FX,
    RACE,RACE_EVENTS,startRace,raceEnd,raceOrder,hideResults,Driver,RaceLine,INPUT,truckFar,raceLine,raceCar,raceSettle,raceAccel,pickRivals,TRUCK,TRUCKF,NOS,nosQuote,nosOrder,nosStep,syncNos,spend,GLC,makeMesh,drawMesh,meshRetry,
    parts:{SLOTS,slotOptions,ENGINES,DE_ENGINES,ENGINE_OF,MACH,CAR_PARTS,POWER,NITROUS,TUNES,CAM_PARTS,EXHAUSTS},
    snap(){render(1/60);return cv.toDataURL('image/png');}};
  /* the traffic (60_traffic) for the tools */
  Object.assign(window.__game,{VOX,VOICES,voxSay,voxWarm,WANTED,wantedLvl,polTune,polTarget,polMake,HELI,hudTex:()=>HTEX,hudBuf:()=>HB8,hudDims:()=>[BW,BH],heliFrame,POL,policeFrame,polRespawn,polCount,TRF,HW,TRF_ON,TRF_N,TRF_PHYS,trfEngage,trfThreat,trafficFrame,trfModelsStep,trafficWanted,trfCount,truckLite,TRUCKL,trfKeeps,SKY,frustum,saveDev,syncMenu,syncDevWorld});
}

})();
