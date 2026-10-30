/* =====================================================================================
   THE BOOT: the dots, the GL, the open world, the car and the menu, once every module above is in place.
   ===================================================================================== */
if(!gl){$('err').style.display='grid';$('loading').hidden=true;}
else{
  /* dots: a big screen or a high-density phone held sideways gets the fine 960 x 540 grid */
  let r=parseInt(store.get('b40-res',-1),10);if(!(r>=0&&r<RES.length)){const d=devicePixelRatio||1,long=Math.max(innerWidth,innerHeight)*d;r=matchMedia('(pointer: coarse)').matches?(long>=1800?3:long>=1200?2:1):4;}
  LIT_DEFS='#define WORLD\n';SCN_CAP=true;setRes(r);glInit();resize();txtFonts();addEventListener('resize',resize);
  applyTod(APP.tod);APP.lights=APP.tod==='night';
  /* let the loading line paint, then start the world */
  requestAnimationFrame(()=>setTimeout(()=>{
    try{
      worldInit();computePlaces();bindTouch();setDetail(APP.detail);
      spawnCar(rigBuild(APP.car,rigOf(APP.car)),38,-57,-PI/2);buildMenu();buildDevWorld();
      $('loading').hidden=true;openMenu(true);requestAnimationFrame(frame);
    }catch(e){console.error(e);$('loading').textContent='Something went wrong starting the world: '+e.message;}
  },30));
  window.__game={GroundWorld,devFit,syncShow,showMeasure,rect:()=>RECT,grid:()=>({W,H,BW,BH,HS}),TXT,setDotText,txtFlush,DL,dlOpen,dlFrame,dlSetVal,dlParams,TUNE,tuneKey,SPECS,bayFill,BAYGRID,showSpec,RIGS,TRANS,PRESET_PARTS,specOf,speedTest,CARS,presetsOf,presetRig,rigBuild,PLUS,setPlus,PULL,showPullStart,showChart,showMeasure,PS,PERF,TLIST,DRS,DISP,showBody,showMode,showAct,showRuns,dynoOf,showHud,showFull,SHOW,showSetView,showEngine,renderShow,showSound,showLeave,MENU,ENG,setTestInput,makeDSP,SIM,BODY,setBody,WORLD,WG,RO,DEVW,CRUISE,toggleCruise,worldUpdate,drawWorld,setOrigin,PLACES:()=>PLACES,APP,GAME,RANCH,ENG,CAM,BUILDS,CARS,RIGS,Feats,spawnCar,spawnRig,placeCar,goTo,openMenu,closeMenu,showTab,startEngine,setRes,render,step,soundUpdate,makeCar,truck,rigBuild,rateRig,presetRig,startRun,setDetail,applyTod,TOUCH,
    GFX,setGfx,SIMSET,SIMDEV,syncWeather,dev:{DEV_T,DEV_GRIP,devApply,devTag,devStep},gl,CSM,PRB,SKY,scn:()=>SCN,lit:()=>P_LIT,compile,VS_LIT,FS_LIT,DISP,setDisplay,SC,PT,
    RACE,RACE_EVENTS,startRace,raceEnd,raceOrder,hideResults,Driver,RaceLine,INPUT,truckFar,
    parts:{SLOTS,slotOptions,ENGINES,DE_ENGINES,ENGINE_OF,MACH,CAR_PARTS,POWER,NITROUS,TUNES,CAM_PARTS,EXHAUSTS},
    snap(){render(1/60);return cv.toDataURL('image/png');}};
}
