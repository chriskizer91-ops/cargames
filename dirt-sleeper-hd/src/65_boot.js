/* =====================================================================================
   THE BOOT: the dots, the GL, the ranch, the car and the menu, once every module above is in place.
   ===================================================================================== */
if(!gl){$('err').style.display='grid';$('loading').hidden=true;}
else{
  /* dots: a big screen or a high-density phone held sideways gets the fine 960 x 540 grid */
  let r=parseInt(store.get('dshd-res',-1),10);if(!(r>=0&&r<RES.length)){const d=devicePixelRatio||1,long=Math.max(innerWidth,innerHeight)*d;r=long>=1800?3:long>=1200?2:1;}
  LIT_DEFS='#define WORLD\n';SCN_CAP=true;setRes(r);glInit();resize();addEventListener('resize',resize);
  applyTod(APP.tod);APP.lights=APP.tod==='night';
  /* let the loading line paint, then build the ranch */
  requestAnimationFrame(()=>setTimeout(()=>{
    try{
      buildRanchGL();computePlaces();mapBitmap();bindTouch();setDetail(APP.detail);
      spawnCar(rigBuild(APP.car,rigOf(APP.car)),6,4,0);buildMenu();
      $('loading').hidden=true;openMenu(true);requestAnimationFrame(frame);
    }catch(e){console.error(e);$('loading').textContent='Something went wrong building the ranch: '+e.message;}
  },30));
  window.__game={APP,GAME,RANCH,ENG,CAM,BUILDS,CARS,RIGS,Feats,spawnCar,spawnRig,placeCar,goTo,openMenu,closeMenu,showTab,startEngine,setRes,render,step,soundUpdate,makeCar,truck,rigBuild,rateRig,presetRig,startRun,setDetail,applyTod,TOUCH,
    GFX,setGfx,SIMSET,SIMDEV,syncWeather,dev:{DEV_T,DEV_GRIP,devApply,devTag,devStep},gl,CSM,PRB,SKY,scn:()=>SCN,lit:()=>P_LIT,compile,VS_LIT,FS_LIT,DISP,setDisplay,SC,PT,
    snap(){render(1/60);return cv.toDataURL('image/png');}};
}
