/* =====================================================================================
   THE TOUCH CONTROLS, made for a phone held sideways.
   Left thumb steers: put it down anywhere on the left side and slide; how far from where it landed is how
   far the wheels turn, and letting go lets them come back. (Or tilt the phone, or the old two buttons.)
   Right thumb drives: a tall gas pedal where how high your thumb sits is how much throttle (low for a
   gentle pull, top for flat out, so the automatic shifts early or late the way a real one does), a
   brake pedal that works the same way, and the e-brake between them. Small buttons down the sides
   for the camera, reset, horn, lights and whatever this car has (nitrous, low range, lockers, overdrive).
   ===================================================================================== */
const TOUCH={on:false,steer:0,steerActive:false,thr:0,brk:0,hb:0,tilt0:null,tiltOK:false};
const TOUCH_KEY={reset:'KeyR',cam:'KeyC',nos:'KeyN',low:'KeyL',lock:'KeyK',od:'KeyO',lights:'KeyJ',horn:'KeyH'};
function enableTouch(){if(GAME.touch)return;GAME.touch=TOUCH.on=true;document.body.classList.add('touch');if(APP.detail==='auto'&&SS>1.5)SS=1.5;syncTouch();}
function syncTouch(){
  const el=$('touch');el.hidden=!(GAME.touch&&GAME.state==='drive');if(!GAME.car)return;
  const e=GAME.car.pt.e,c=GAME.car.c.diff.can;
  $('tNos').hidden=!e.nosKw;$('tLow').hidden=!c.low;$('tLock').hidden=!c.r;$('tOD').hidden=!hasOD(e);$('tLights').hidden=!SKY.night;
  $('tOD').classList.toggle('lit',!!APP.od);$('tLow').classList.toggle('lit',!!GAME.car.low);$('tLock').classList.toggle('lit',!!GAME.car.locked);$('tLights').classList.toggle('lit',!!APP.lights);
  $('steerZone').dataset.mode=APP.steer;$('steerBtns').hidden=APP.steer!=='buttons';$('steerHint').textContent=APP.steer==='tilt'?'TILT TO STEER':'SLIDE TO STEER';
}
function bindTouch(){
  if(matchMedia('(pointer: coarse)').matches)enableTouch();addEventListener('touchstart',enableTouch,{passive:true,once:true});
  /* a tap on the corner map opens the big map; any tap closes it */
  cv.addEventListener('pointerdown',e=>{if(GAME.state!=='drive')return;const hx=(e.clientX-RECT.x)/RECT.w*W,hy=(e.clientY-RECT.y)/RECT.h*H,[x0,y0,s]=miniRect();
    if(APP.bigMap)APP.bigMap=false;else if(hx>=x0-2&&hx<=x0+s+2&&hy>=y0-2&&hy<=y0+s+2)APP.bigMap=true;});
  /* the small buttons press keys */
  for(const b of document.querySelectorAll('#touch .tb[data-k]')){const k=TOUCH_KEY[b.dataset.k];
    const on=e=>{e.preventDefault();try{b.setPointerCapture(e.pointerId);}catch(_){}INPUT.down.add(k);INPUT.pressed.add(k);b.classList.add('on');buzz(8);setTimeout(syncTouch,60);},
      off=e=>{e.preventDefault();INPUT.down.delete(k);b.classList.remove('on');};
    b.addEventListener('pointerdown',on);for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,off);b.addEventListener('contextmenu',e=>e.preventDefault());}
  /* the pedals: how high the thumb sits on the pedal is how hard it presses */
  const pedal=(id,set,min)=>{const el=$(id),fill=el.querySelector('i');let pid=null;
    const at=e=>{const r=el.getBoundingClientRect(),k=clamp((r.bottom-e.clientY)/(r.height*.82),0,1);const v=min+(1-min)*k;set(v);fill.style.height=(v*100).toFixed(0)+'%';};
    el.addEventListener('pointerdown',e=>{e.preventDefault();pid=e.pointerId;try{el.setPointerCapture(pid);}catch(_){}el.classList.add('on');at(e);});
    el.addEventListener('pointermove',e=>{if(e.pointerId===pid)at(e);});
    const up=e=>{if(e.pointerId!==pid)return;pid=null;set(0);fill.style.height='0%';el.classList.remove('on');};
    for(const ev of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(ev,up);el.addEventListener('contextmenu',e=>e.preventDefault());};
  pedal('tGas',v=>TOUCH.thr=v,.12);pedal('tBrk',v=>TOUCH.brk=v,.3);
  const hb=$('tHb');
  hb.addEventListener('pointerdown',e=>{e.preventDefault();try{hb.setPointerCapture(e.pointerId);}catch(_){}TOUCH.hb=1;hb.classList.add('on');buzz(15);});
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])hb.addEventListener(ev,()=>{TOUCH.hb=0;hb.classList.remove('on');});
  /* steering: slide from wherever the thumb lands */
  const z=$('steerZone'),knob=$('steerKnob');let sid=null,x0=0;
  const span=()=>Math.max(70,Math.min(130,innerWidth*.11));
  const show=(v,x)=>{knob.style.transform=`translateX(${(v*span()).toFixed(1)}px)`;if(x!==undefined)$('steerTrack').style.left=(x-z.getBoundingClientRect().left)+'px';};
  z.addEventListener('pointerdown',e=>{if(APP.steer!=='slide')return;e.preventDefault();sid=e.pointerId;x0=e.clientX;try{z.setPointerCapture(sid);}catch(_){}TOUCH.steerActive=true;TOUCH.steer=0;z.classList.add('on');show(0,x0);});
  z.addEventListener('pointermove',e=>{if(e.pointerId!==sid)return;const d=(e.clientX-x0)/span(),v=Math.sign(d)*Math.pow(Math.min(1,Math.abs(d)),1.15);TOUCH.steer=v;show(v);});
  const sup=e=>{if(e.pointerId!==sid)return;sid=null;TOUCH.steer=0;TOUCH.steerActive=false;z.classList.remove('on');show(0);};
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])z.addEventListener(ev,sup);
  /* the old way: two buttons */
  for(const [id,dir] of [['tLeft',-1],['tRight',1]]){const b=$(id);
    b.addEventListener('pointerdown',e=>{e.preventDefault();try{b.setPointerCapture(e.pointerId);}catch(_){}INPUT.down.add(dir<0?'ArrowLeft':'ArrowRight');b.classList.add('on');});
    for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>{INPUT.down.delete(dir<0?'ArrowLeft':'ArrowRight');b.classList.remove('on');});}
  /* tilt: the phone's roll, measured from how it was held when tilt was switched on */
  addEventListener('deviceorientation',e=>{if(APP.steer!=='tilt'||e.beta==null)return;TOUCH.tiltOK=true;
    const ang=(screen.orientation&&screen.orientation.angle)||window.orientation||0,raw=ang===90?e.beta:ang===270||ang===-90?-e.beta:e.gamma;
    if(TOUCH.tilt0===null)TOUCH.tilt0=raw;let d=raw-TOUCH.tilt0;if(Math.abs(d)<1.5)d=0;TOUCH.steer=clamp(d/24,-1,1);if(APP.steer==='tilt')show(TOUCH.steer);});
}
/* tilt needs a tap of permission on some phones (not Android) */
async function enableTilt(){TOUCH.tilt0=null;TOUCH.tiltOK=false;try{if(window.DeviceOrientationEvent&&typeof DeviceOrientationEvent.requestPermission==='function')await DeviceOrientationEvent.requestPermission();}catch(e){}
  /* where the page isn't given the phone's motion (inside some apps and embedded views), tilt can't work: say so and slide instead */
  setTimeout(()=>{if(APP.steer==='tilt'&&!TOUCH.tiltOK){APP.steer='slide';saveGame();syncTouch();if(typeof syncMenu==='function')syncMenu();
    const h=$('sSteerHint');if(h)h.textContent='This view doesn\'t pass on the phone\'s tilt, so steering is back on Slide. Opening the game file straight in Chrome lets tilt work.';}},2000);}
