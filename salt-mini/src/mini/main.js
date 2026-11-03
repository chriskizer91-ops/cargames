/* =====================================================================================
   REDLINE COUNTY: SALT MINI. The SUV Studio's full truck on the game's own physics, driven exactly as in SUV: Super
   Unlimited Venture, on a bare salt flat with a ten-mile road across it, in Road Not Found + Traffic's own clothes:
   its dot-matrix HUD and words, its keys and touch controls, its cameras, its traction setting, and the Digital
   Engine's sound. The menu is the bay: the truck stopped where it stands and the Tune sheet beside it.
   ===================================================================================== */
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {Sky} from 'three/addons/objects/Sky.js';
import {makeMats} from './mats.js';
import {makeTuner,makeSheet} from './tuner.js';

const K=window.KIT,DR=window.DRIVE,UI=window.UI,Q=new URLSearchParams(location.search);
const cv=document.getElementById('cv'),$=id=>document.getElementById(id);
const COARSE=matchMedia('(pointer: coarse)').matches,HOVERLESS=matchMedia('(hover: none)').matches;
const renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:!!Q.get('shots')});
renderer.setPixelRatio(Math.min(devicePixelRatio,HOVERLESS?1.5:2));renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=.74;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(55,1,.25,6000);
const {meshes}=makeMats(THREE,K);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;

/* ---------- the save: the tune, the gearing, the driving level, the traction and handling, the steering, the camera ---------- */
const SAVE_KEY='sm-mini',HAND0={rear:1,slide:1,steer:1};
const state=(()=>{const d={T:{nos:3},fd:0,plus:0,level:'middle',trac:1,hand:Object.assign({},HAND0),steerMode:'slide',cam:0};
  try{const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');
    if(s&&typeof s==='object'){if(s.T&&typeof s.T==='object')d.T=s.T;if(s.fd>=1.5&&s.fd<=5)d.fd=s.fd;if(s.plus>=1&&s.plus<=2)d.plus=s.plus;if(DR.ASSISTS[s.level])d.level=s.level;
      if(s.trac>=.5&&s.trac<=2)d.trac=s.trac;if(s.hand)for(const k in HAND0)if(s.hand[k]>=.5&&s.hand[k]<=2)d.hand[k]=s.hand[k];
      if(['slide','tilt','buttons'].includes(s.steerMode))d.steerMode=s.steerMode;if(s.cam>=0&&s.cam<=3)d.cam=s.cam|0;}}catch(e){}return d;})();
const save=()=>{try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch(e){}};

/* ---------- the sky, the sun behind the truck as it heads down the road, and the light the sky gives ---------- */
const sky=new Sky();sky.scale.setScalar(1000);const su=sky.material.uniforms;
/* (drawn first and behind everything: the salt runs out past the sky's box) */
sky.material.depthTest=false;sky.material.depthWrite=false;sky.renderOrder=-1;
su.turbidity.value=3.2;su.rayleigh.value=1.25;su.mieCoefficient.value=.004;su.mieDirectionalG.value=.8;
const SUN=new THREE.Vector3().setFromSphericalCoords(1,THREE.MathUtils.degToRad(46),THREE.MathUtils.degToRad(-118));su.sunPosition.value.copy(SUN);
scene.add(sky);
{const pm=new THREE.PMREMGenerator(renderer),s2=new THREE.Scene(),k=new Sky();k.scale.setScalar(1000);Object.assign(k.material.uniforms.sunPosition.value,SUN);
  for(const n of ['turbidity','rayleigh','mieCoefficient','mieDirectionalG'])k.material.uniforms[n].value=su[n].value;s2.add(k);
  /* (the salt under the sky picture: white, so the truck's flanks pick it up as they would out there) */
  const g=new THREE.Mesh(new THREE.CircleGeometry(900,32),new THREE.MeshBasicMaterial({color:0xb9b4aa}));g.rotation.x=-Math.PI/2;g.position.y=-2;s2.add(g);
  scene.environment=pm.fromScene(s2,.02).texture;scene.environmentIntensity=.55;}
const sun=new THREE.DirectionalLight(0xfff3e2,2.2);sun.castShadow=true;const SMAP=HOVERLESS?1024:2048;sun.shadow.mapSize.set(SMAP,SMAP);
Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:1,far:60});sun.shadow.bias=-.0004;sun.shadow.normalBias=.03;sun.shadow.radius=3;
scene.add(sun,sun.target);scene.add(new THREE.HemisphereLight(0xc8d8f0,0xe2dccf,.3));
const FOG=0xe3e5e6;scene.fog=new THREE.Fog(FOG,500,4600);

/* ---------- the salt and the road ---------- */
const MILE=1609.344,ROAD_X0=-250,ROAD_X1=10*MILE+400,ROAD_HW=5;
const onRoad=(x,z)=>x>ROAD_X0&&x<ROAD_X1&&Math.abs(z)<ROAD_HW;
/* the ground for the physics: flat; the road the game's blacktop, the salt the game's own salt (its 'strip') */
const world=new DR.GroundWorld((x,z,o)=>{o.y=0;o.n[0]=0;o.n[1]=1;o.n[2]=0;o.surf=onRoad(x,z)?'asphalt':'strip';},{near:()=>[]},1e9);
const TL=new THREE.TextureLoader(),TEX={};
for(const [k,d] of Object.entries(window.GROUND_TEX)){const t=TL.load(d);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());TEX[k]=t;}
/* the salt: one big square that follows the truck (moved a whole step at a time), the picture laid three sizes over
   itself from where it lies in the world so it never repeats in an obvious way and never slides */
const SALT_SIZE=9600,SALT_SNAP=480,SC=[7.5,31,260];
const saltU={uO1:{value:new THREE.Vector4()},uO2:{value:new THREE.Vector2()}};
const saltMat=new THREE.MeshStandardMaterial({map:TEX.salt,roughness:.93,metalness:0,polygonOffset:true,polygonOffsetFactor:2,polygonOffsetUnits:4});
saltMat.onBeforeCompile=s=>{Object.assign(s.uniforms,saltU);
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vLoc;').replace('#include <begin_vertex>','#include <begin_vertex>\nvLoc=position.xz;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vLoc;uniform vec4 uO1;uniform vec2 uO2;').replace('#include <map_fragment>',
    `vec3 sa=texture2D(map,vLoc/${SC[0].toFixed(1)}+uO1.xy).rgb,sb=texture2D(map,vLoc/${SC[1].toFixed(1)}+uO1.zw).rgb,sc=texture2D(map,vLoc/${SC[2].toFixed(1)}+uO2).rgb;
     diffuseColor.rgb*=sa*mix(.86,1.1,sb.r)*mix(.92,1.05,sc.g)*1.06;`);};
saltMat.envMapIntensity=.45;
/* (in 150 m squares: one giant triangle's depth comes out too rough near the camera, and the salt showed through the road) */
const saltGeo=new THREE.PlaneGeometry(SALT_SIZE,SALT_SIZE,64,64);saltGeo.rotateX(-Math.PI/2);
const salt=new THREE.Mesh(saltGeo,saltMat);salt.receiveShadow=true;scene.add(salt);
const fr=v=>v-Math.floor(v);
function saltFollow(x,z){const cx=Math.round(x/SALT_SNAP)*SALT_SNAP,cz=Math.round(z/SALT_SNAP)*SALT_SNAP;if(salt.position.x===cx&&salt.position.z===cz)return;
  salt.position.set(cx,0,cz);saltU.uO1.value.set(fr(cx/SC[0]),fr(cz/SC[0]),fr(cx/SC[1]+.37),fr(cz/SC[1]+.61));saltU.uO2.value.set(fr(cx/SC[2]+.71),fr(cz/SC[2]+.13));}
saltFollow(0,0);
/* the road: blacktop in 400 m pieces (each its own picture coordinates, so nothing far down the road loses
   precision), white edge lines, a yellow dashed centre line, a white bar at the start, the quarter mile and each mile */
{const SEG=400,asph=new THREE.MeshStandardMaterial({map:TEX.asphalt,color:0x8c8c8c,roughness:.86,metalness:0,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2});
  const paint=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.62,metalness:0,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4});
  const TILE=3.2,W=new THREE.Color(0xe8e6df),Y=new THREE.Color(0xe0b43a);
  for(let x0=ROAD_X0;x0<ROAD_X1;x0+=SEG){const x1=Math.min(x0+SEG,ROAD_X1),g=new THREE.PlaneGeometry(x1-x0,ROAD_HW*2,1,1);g.rotateX(-Math.PI/2);
    const U=g.attributes.uv,P=g.attributes.position;for(let i=0;i<P.count;i++){const lx=P.getX(i),lz=P.getZ(i);U.setXY(i,(lx+(x1-x0)/2)/TILE+fr(x0/TILE),lz/TILE);}
    const m=new THREE.Mesh(g,asph);m.position.set((x0+x1)/2,.012,0);m.receiveShadow=true;scene.add(m);
    const pos=[],col=[],quad=(ax,az,bx,bz,c)=>{const y=.016;pos.push(ax,y,az, bx,y,az, bx,y,bz, ax,y,az, bx,y,bz, ax,y,bz);for(let k=0;k<6;k++)col.push(c.r,c.g,c.b);};
    for(const s of [-1,1])quad(x0,s*(ROAD_HW-.35),x1,s*(ROAD_HW-.2),W);
    for(let d=Math.ceil(x0/12)*12;d<x1;d+=12)quad(d,-.07,Math.min(d+3.5,x1),.07,Y);
    for(const bx of [0,MILE/4,...Array.from({length:10},(_,i)=>(i+1)*MILE)])if(bx>=x0&&bx<x1)quad(bx-.3,-ROAD_HW+.2,bx+.3,ROAD_HW-.2,W);
    const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));pg.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
    pg.computeVertexNormals();const pm=new THREE.Mesh(pg,paint);pm.receiveShadow=true;scene.add(pm);}}
/* the signs: the start, the quarter mile, each mile, and the end, on posts by the right-hand side of the road */
{const backM=new THREE.MeshStandardMaterial({color:0x8d9095,metalness:.6,roughness:.45}),post=new THREE.CylinderGeometry(.05,.05,2.2,10),postM=new THREE.MeshStandardMaterial({color:0x8a8d92,metalness:.7,roughness:.4});
  const sign=(x,txt,sub,bg)=>{const c=document.createElement('canvas');c.width=256;c.height=160;const g=c.getContext('2d');
    g.fillStyle=bg;g.fillRect(0,0,256,160);g.strokeStyle='#fff';g.lineWidth=8;g.strokeRect(10,10,236,140);g.fillStyle='#fff';g.textAlign='center';
    g.font='700 64px system-ui,sans-serif';g.fillText(txt,128,sub?84:102);if(sub){g.font='600 30px system-ui,sans-serif';g.fillText(sub,128,128);}
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;
    const grp=new THREE.Group(),p=new THREE.Mesh(post,postM);p.position.y=1.1;p.castShadow=true;grp.add(p);
    /* (the face toward the oncoming truck, a plain grey back) */
    const b=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1),new THREE.MeshStandardMaterial({map:t,roughness:.5}));b.position.set(-.012,2.2,0);b.rotation.y=-Math.PI/2;b.castShadow=true;grp.add(b);
    const bk=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1),backM);bk.position.set(.012,2.2,0);bk.rotation.y=Math.PI/2;grp.add(bk);
    grp.position.set(x,0,ROAD_HW+2.5);scene.add(grp);};
  sign(0,'START','','#1c5e2f');sign(MILE/4,'¼ MILE','','#1c4a7a');
  for(let i=1;i<=10;i++)sign(i*MILE,String(i),i===1?'MILE':'MILES','#1c5e2f');
  sign(ROAD_X1-30,'END','ROAD','#7a1c1c');}

/* ---------- the truck: the SUV Studio's, in full ---------- */
let truck=null;const carRoot=new THREE.Group();carRoot.matrixAutoUpdate=false;scene.add(carRoot);
function buildTruck(){const t0=performance.now();K.setHD(true);const T=K.studioBuild('stock',.25),b=T.b,body=new THREE.Group();
  body.add(meshes(T.body,'body',b),meshes(T.hood,'hood',b),meshes(T.hide,'hide',b));
  for(const [nm,src] of Object.entries(T.hd||{}))if(src&&src.p)body.add(meshes(src,nm,b));
  const wheel=meshes(T.wheel,'wheel',b),root=new THREE.Group(),wheels=[];root.add(body);
  for(const front of [1,0])for(const s of [1,-1]){const w=new THREE.Group();w.matrixAutoUpdate=false;w.add(wheels.length?wheel.clone():wheel);w.userData.s=s;root.add(w);wheels.push(w);}
  let tris=0;root.traverse(m=>{if(m.isMesh){m.castShadow=true;tris+=m.geometry.index?m.geometry.index.count/3:m.geometry.attributes.position.count/3;}});
  truck={root,wheels,D:T.D,b,tris,ms:performance.now()-t0};carRoot.add(root);}

/* ---------- the physics: the game's own, set up as SUV has it, on the traction and handling chosen ---------- */
const SURFS=['asphalt','strip','concrete','dirt','gravel','trail','grass','rock','mud','ruts','water'];
let car=null,E=null,od=false;
/* traction is the ground's (the game's developer panel): every surface times the setting; 100% is no change at all,
   exactly as SUV drives. The handling knobs are the car's, each from its own setup */
function applyTraction(){world.grip=Math.abs(state.trac-1)<1e-6?null:Object.fromEntries(SURFS.map(s=>[s,state.trac]));
  if(!car)return;const h=state.hand,off=Object.keys(HAND0).some(k=>Math.abs(h[k]-1)>1e-6);car.tune=off?Object.assign({},h):null;if(off||car._tuned)car.applyTune();car._tuned=off;}
function spawn(at){const p=at||{x:0,z:0,yaw:0};E=DR.tunedEngine(state.T,state.fd||0,state.plus||0);car=DR.makeCar(DR.stock,world);car.setAssists(state.level);
  applyTraction();car.place([p.x,.6,p.z],p.yaw);car.pt.start();od=false;voiceCfg(E);}
function setOD(on){const pt=car.pt;if(!(pt.e.conv&&!pt.e.cvt&&pt.e.nG>2))return false;od=on;pt.maxG=on?pt.e.nG-1:0;if(on&&pt.gear>pt.maxG&&pt.shiftT<=0)pt.shift(-1);return true;}

/* ---------- the keys (the game's), and the touch controls (the game's 64_touch) ---------- */
const KEYS={thr:['ArrowUp','KeyW'],brk:['ArrowDown','KeyS'],left:['ArrowLeft','KeyA'],right:['ArrowRight','KeyD'],hb:['Space'],nos:['ShiftLeft','ShiftRight','KeyN'],
  up:['KeyE','KeyX'],down:['KeyQ','KeyZ'],cam:['KeyC'],stats:['KeyF'],reset:['KeyR'],menu:['Escape','KeyP'],low:['KeyL'],lockers:['KeyK'],ign:['KeyI'],horn:['KeyH'],od:['KeyO'],trac:['KeyT'],rear:['KeyG']};
const INPUT={down:new Set(),pressed:new Set(),steer:0,thr:0,brk:0};
const typing=t=>t&&(t.tagName==='SELECT'||t.tagName==='TEXTAREA'||(t.tagName==='INPUT'&&t.type!=='range'));
addEventListener('keydown',e=>{if(typing(e.target)||e.metaKey||e.ctrlKey||e.altKey)return;wakeAudio();
  if(!e.repeat){INPUT.down.add(e.code);INPUT.pressed.add(e.code);}if(e.code.startsWith('Arrow')||e.code==='Space')e.preventDefault();});
addEventListener('keyup',e=>INPUT.down.delete(e.code));
addEventListener('blur',()=>INPUT.down.clear());
const keyOn=k=>KEYS[k].some(c=>INPUT.down.has(c)),keyHit=k=>KEYS[k].some(c=>INPUT.pressed.has(c));
const pedalMap=p=>p<=0?0:1-Math.pow(1-clamp(p,0,1),2.2);
const TOUCH={on:false,steer:0,steerActive:false,thr:0,brk:0,hb:0,tilt0:null,rear:false,lets:[]};
const TOUCH_KEY={reset:'KeyR',cam:'KeyC',nos:'KeyN',low:'KeyL',lock:'KeyK',od:'KeyO',horn:'KeyH'};
const buzz=ms=>{try{if(navigator.vibrate)navigator.vibrate(ms);}catch(e){}};
function enableTouch(){if(TOUCH.on)return;TOUCH.on=true;document.body.classList.add('touch');UI.setRes(2);syncTouch();}
function touchLetGo(){for(const f of TOUCH.lets)f();}
function syncTouch(){$('touch').hidden=!(TOUCH.on&&!bay.open);if(!car)return;const e=car.pt.e,c=car.c.diff.can;
  $('tNos').hidden=!e.nosKw;$('tLow').hidden=!c.low;$('tLock').hidden=!c.r;$('tOD').hidden=!e.conv;
  $('tOD').classList.toggle('lit',!!od);$('tRear').classList.toggle('lit',!!TOUCH.rear);$('tLow').classList.toggle('lit',!!car.low);$('tLock').classList.toggle('lit',!!car.locked);
  $('steerZone').dataset.mode=state.steerMode;$('steerBtns').hidden=state.steerMode!=='buttons';$('steerHint').textContent=state.steerMode==='tilt'?'TILT TO STEER':'SLIDE TO STEER';}
function bindTouch(){
  if(COARSE)enableTouch();addEventListener('touchstart',enableTouch,{passive:true,once:true});
  {const b=$('tRear');b.addEventListener('pointerdown',e=>{e.preventDefault();TOUCH.rear=!TOUCH.rear;b.classList.toggle('lit',TOUCH.rear);buzz(8);});b.addEventListener('contextmenu',e=>e.preventDefault());}
  for(const b of document.querySelectorAll('#touch .tb[data-k]')){const k=TOUCH_KEY[b.dataset.k];
    const on=e=>{e.preventDefault();wakeAudio();try{b.setPointerCapture(e.pointerId);}catch(_){}INPUT.down.add(k);INPUT.pressed.add(k);b.classList.add('on');buzz(8);setTimeout(syncTouch,60);},
      off=e=>{e.preventDefault();INPUT.down.delete(k);b.classList.remove('on');};
    b.addEventListener('pointerdown',on);for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,off);b.addEventListener('contextmenu',e=>e.preventDefault());}
  /* the pedals: how high the thumb sits on the pedal is how hard it presses */
  const pedal=(id,set,min)=>{const el=$(id),fill=el.querySelector('i');let pid=null;
    const at=e=>{const r=el.getBoundingClientRect(),k=clamp((r.bottom-e.clientY)/(r.height*.82),0,1);const v=min+(1-min)*k;set(v);fill.style.height=(v*100).toFixed(0)+'%';};
    el.addEventListener('pointerdown',e=>{e.preventDefault();wakeAudio();pid=e.pointerId;try{el.setPointerCapture(pid);}catch(_){}el.classList.add('on');at(e);});
    el.addEventListener('pointermove',e=>{if(e.pointerId===pid)at(e);});
    const up=e=>{if(e.pointerId!==pid)return;pid=null;set(0);fill.style.height='0%';el.classList.remove('on');};
    TOUCH.lets.push(()=>{if(pid!==null){try{el.releasePointerCapture(pid);}catch(_){}}pid=null;set(0);fill.style.height='0%';el.classList.remove('on');});
    for(const ev of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(ev,up);el.addEventListener('contextmenu',e=>e.preventDefault());};
  pedal('tGas',v=>TOUCH.thr=v,.12);pedal('tBrk',v=>TOUCH.brk=v,.3);
  const hb=$('tHb');
  hb.addEventListener('pointerdown',e=>{e.preventDefault();try{hb.setPointerCapture(e.pointerId);}catch(_){}TOUCH.hb=1;hb.classList.add('on');buzz(15);});
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])hb.addEventListener(ev,()=>{TOUCH.hb=0;hb.classList.remove('on');});
  TOUCH.lets.push(()=>{TOUCH.hb=0;hb.classList.remove('on');});
  /* steering: slide from wherever the thumb lands */
  const z=$('steerZone'),knob=$('steerKnob');let sid=null,x0=0;
  const span=()=>Math.max(70,Math.min(130,innerWidth*.11));
  const show=(v,x)=>{knob.style.transform=`translateX(${(v*span()).toFixed(1)}px)`;if(x!==undefined)$('steerTrack').style.left=(x-z.getBoundingClientRect().left)+'px';};
  z.addEventListener('pointerdown',e=>{if(state.steerMode!=='slide')return;e.preventDefault();wakeAudio();sid=e.pointerId;x0=e.clientX;try{z.setPointerCapture(sid);}catch(_){}TOUCH.steerActive=true;TOUCH.steer=0;z.classList.add('on');show(0,x0);});
  z.addEventListener('pointermove',e=>{if(e.pointerId!==sid)return;const d=(e.clientX-x0)/span(),v=Math.sign(d)*Math.pow(Math.min(1,Math.abs(d)),1.15);TOUCH.steer=v;show(v);});
  const sup=e=>{if(e.pointerId!==sid)return;sid=null;TOUCH.steer=0;TOUCH.steerActive=false;z.classList.remove('on');show(0);};
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])z.addEventListener(ev,sup);
  TOUCH.lets.push(()=>{if(sid!==null){try{z.releasePointerCapture(sid);}catch(_){}}sid=null;TOUCH.steer=0;TOUCH.steerActive=false;z.classList.remove('on');show(0);});
  for(const [id,dir] of [['tLeft',-1],['tRight',1]]){const b=$(id);
    b.addEventListener('pointerdown',e=>{e.preventDefault();try{b.setPointerCapture(e.pointerId);}catch(_){}INPUT.down.add(dir<0?'ArrowLeft':'ArrowRight');b.classList.add('on');});
    for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>{INPUT.down.delete(dir<0?'ArrowLeft':'ArrowRight');b.classList.remove('on');});}
  /* tilt: the phone's roll, measured from how it was held when tilt was switched on */
  addEventListener('deviceorientation',e=>{if(state.steerMode!=='tilt'||e.beta==null)return;
    const ang=(screen.orientation&&screen.orientation.angle)||window.orientation||0,raw=ang===90?e.beta:ang===270||ang===-90?-e.beta:e.gamma;
    if(TOUCH.tilt0===null)TOUCH.tilt0=raw;let d=raw-TOUCH.tilt0;if(Math.abs(d)<1.5)d=0;TOUCH.steer=clamp(d/24,-1,1);show(TOUCH.steer);});
}
async function enableTilt(){TOUCH.tilt0=null;try{if(window.DeviceOrientationEvent&&typeof DeviceOrientationEvent.requestPermission==='function')await DeviceOrientationEvent.requestPermission();}catch(e){}}
/* the keys and the touch controls into one input, as the game's pollInput (the gas on W is all or nothing, as SUV has it) */
function pollInput(dt){
  const out={steer:0,thr:0,brk:0,hb:0,nos:false,lock:false};
  const tgt=(keyOn('right')?1:0)-(keyOn('left')?1:0),rate=tgt===0?6:Math.sign(tgt)!==Math.sign(INPUT.steer)&&INPUT.steer!==0?8:3.2;
  INPUT.steer+=clamp(tgt-INPUT.steer,-rate*dt,rate*dt);
  let pth=0;for(let d=1;d<=9;d++)if(INPUT.down.has('Digit'+d)||INPUT.down.has('Numpad'+d))pth=Math.max(pth,d/10);
  INPUT.thr+=clamp((keyOn('thr')?1:pth)-INPUT.thr,-8*dt,6*dt);INPUT.brk+=clamp((keyOn('brk')?1:0)-INPUT.brk,-10*dt,8*dt);
  out.steer=INPUT.steer;out.thr=INPUT.thr;out.brk=INPUT.brk;out.hb=keyOn('hb')?1:0;out.nos=keyOn('nos');out.rear=keyOn('rear');
  for(const k of ['up','down','cam','reset','menu','low','lockers','ign','od','trac','stats'])out[k]=keyHit(k);
  if(TOUCH.on){if(TOUCH.steerActive||state.steerMode==='tilt')out.steer=TOUCH.steer;if(TOUCH.thr>0)out.thr=Math.max(out.thr,pedalMap(TOUCH.thr));if(TOUCH.brk>0)out.brk=Math.max(out.brk,TOUCH.brk);if(TOUCH.hb)out.hb=1;}
  INPUT.pressed.clear();return out;
}
/* the bottle: the physics empties it while it fires (eight seconds a bottle); it fills again, about twelve seconds
   from empty, while the button is off */
function nosStep(dt,inp){const pt=car.pt;if(!pt.e.nosKw)return;if(!inp.nos)pt.nos=Math.min(1,pt.nos+dt/12);}

/* ---------- the engine's sound: the Digital Engine (the game's 17_audio), heard from the bay's spot behind ---------- */
const VOICE={spec:null,port:null,popT:0,flame:0,flameL:0};
let audioBusy=false;
/* a browser plays sound only after a tap or a key: the first one starts it (and any later one, if it was stopped) */
async function wakeAudio(){const a=UI.ENG.audio;if(audioBusy||a&&a.ctx.state==='running'&&VOICE.port)return;audioBusy=true;
  try{await UI.initAudio();const A=UI.ENG.audio;if(A.ctx.state!=='running')await A.ctx.resume();if(!VOICE.port&&car){VOICE.spec=E||car.pt.e;UI.voiceNode(VOICE);}}
  catch(e){console.warn('sound: '+(e&&e.message||e));}audioBusy=false;}
let cfgT=0;
function voiceCfg(e,live){VOICE.spec=e;if(!VOICE.port)return;const now=performance.now();if(live&&now-cfgT<100)return;cfgT=now;VOICE.port.post({t:'cfg',cfg:DR.SIM.dspCfg(e)});}
function soundUpdate(dt){
  if(!UI.ENG.audio||!VOICE.port||!car)return;const pt=car.pt;
  let geo={dist:(VOICE.spec&&VOICE.spec.behindDist)||3,pan:0,rear:1},lis=0,dop=1;if(CAMV[state.cam]==='Hood'&&!bay.open)geo={dist:3.2,pan:0,rear:.3};
  /* Cinematic: heard from where the camera stands (the lab's Trackside), louder and brighter close by, with the
     pitch the truck's speed toward or away from it gives (up coming in, down going away) */
  if(CAMV[state.cam]==='Cinematic'&&!bay.open&&!rearOn&&cine.ok){const toC=cine.p.clone().sub(CP),d=toC.length(),u=toC.clone().divideScalar(Math.max(d,1e-3)),
      F=new THREE.Vector3(car.M[0],car.M[3],car.M[6]),camR=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0);
    geo={dist:clamp(d*.6,2,60),pan:clamp(-u.dot(camR)*.9,-1,1),rear:clamp(.5-.5*u.dot(F),0,1)*.6+.4};lis=2;
    const vr=car.v[0]*u.x+car.v[1]*u.y+car.v[2]*u.z;dop=clamp(343/(343-vr),.65,1.45);}
  const ep=pt.soundParams(lis,car.speed,geo);if(dop!==1)ep.rpm*=dop;ep.horn=!bay.open&&keyOn('horn')?1:0;ep.jake=pt.jakeOn?3:0;
  /* in the bay the truck stands still and the engine is the rev pad's: up toward the redline while it's held, back
     to idle when it's let go, in the engine as tuned */
  if(bay.open){const e=VOICE.spec||pt.e,top=e.redline*.985;if(bay.rpm==null)bay.rpm=ep.rpm;const tgt=pt.running?e.idle+(top-e.idle)*bay.pad:0;
    bay.rpm+=(tgt-bay.rpm)*Math.min(1,dt*(bay.pad>0?4.5:2.6));ep.rpm=bay.rpm;ep.load=bay.pad;ep.cutFrac=bay.pad>.97&&bay.rpm>top*.985?.6:0;
    ep.boost=e.fiBoost?e.fiBoost*bay.pad*clamp((bay.rpm/e.redline-.35)/.4,0,1):0;ep.nos=0;ep.speed=0;ep.twostep=0;ep.antilag=0;ep.jake=0;}
  for(const ev of pt.takeEvents())VOICE.port.post({t:'ev',ev});
  VOICE.port.post({t:'p',p:ep});
}

/* ---------- the cameras: the game's Chase, Far and Hood, the rear view, Cinematic, and free round the truck in the bay ---------- */
/* Cinematic: a camera standing still by the road ahead of the truck, turning to follow it as it comes and goes by
   and zooming to keep it framed (wide close up, long lens far off), the way a camera crew shoots a car. Each shot
   runs about fourteen seconds whatever the speed. Once the truck is well past, the next camera is set up further on, on the other side most of the time, at another
   height. Stopped, it stands a little way off to one side. Its sound is heard from where it stands. */
const cine={p:new THREE.Vector3(),dir:new THREE.Vector3(1,0,0),look:new THREE.Vector3(),fov:30,ok:false,side:1,d:10};
const CINE_H=[.6,1.2,1.8,3.2,6];
function cineSpot(){const v=car.speed,dir=FW.clone();if(v>2){const vv=new THREE.Vector3(car.v[0],0,car.v[2]);if(vv.lengthSq()>1)dir.copy(vv.normalize());}
  const right=new THREE.Vector3(-dir.z,0,dir.x);cine.side=Math.random()<.75?-cine.side:cine.side;
  const ahead=v<2?0:clamp(v*8.2,60,1050)*(.8+Math.random()*.4),lat=(v<2?11:7+Math.random()*11)*cine.side,h=CINE_H[(Math.random()*CINE_H.length)|0];
  cine.p.copy(CP).addScaledVector(dir,ahead).addScaledVector(right,lat);cine.p.y=h;cine.dir.copy(dir);cine.look.copy(CP).addScaledVector(UP,.8);cine.ok=true;cine.cut=true;cine.n=(cine.n||0)+1;}
function cineStep(dt,cut){
  if(!cine.ok||cut)cineSpot();
  const rel=CP.clone().sub(cine.p),along=rel.dot(cine.dir),d=rel.length(),v=car.speed;
  /* the truck well past (or gone somewhere else, or parked far off): the next camera */
  if(along>clamp(v*6,60,800)||d>2500||v<2&&d>70)cineSpot();
  const k=cine.cut?1:1-Math.exp(-dt*7);cine.look.lerp(CP.clone().addScaledVector(UP,.8),k);
  cine.d=cine.p.distanceTo(cine.look);
  /* the zoom: the truck about a quarter of the frame's height, whatever the distance */
  const want=clamp(2*Math.atan(3.6/Math.max(cine.d,1))*180/Math.PI,1.2,55);cine.fov=cine.cut?want:cine.fov+(want-cine.fov)*(1-Math.exp(-dt*1.5));cine.cut=false;
  camera.position.copy(cine.p);camera.lookAt(cine.look);}
const CAMV=['Chase','Far','Hood','Cinematic'];
const orbit=new OrbitControls(camera,cv);orbit.enabled=false;orbit.enableDamping=true;orbit.maxPolarAngle=Math.PI*.495;orbit.minDistance=2.5;orbit.maxDistance=40;
const chase={off:new THREE.Vector3(-7.2,2.3,0),l:new THREE.Vector3()};
const tmpM=new THREE.Matrix4(),cgM=new THREE.Matrix4(),CP=new THREE.Vector3(),FW=new THREE.Vector3(),UP=new THREE.Vector3(0,1,0),RY=new THREE.Matrix4(),SZ=new THREE.Matrix4(),RZ=new THREE.Matrix4();
const CU=new THREE.Vector3(),CF=new THREE.Vector3();
function place(){const M=car.M,p=car.p,cg=car.cg;
  tmpM.set(M[0],M[1],M[2],p[0],M[3],M[4],M[5],p[1],M[6],M[7],M[8],p[2],0,0,0,1);cgM.makeTranslation(-cg[0],-cg[1],0);carRoot.matrix.multiplyMatrices(tmpM,cgM);carRoot.matrixWorldNeedsUpdate=true;
  if(!truck)return;car.wheels.forEach((w,k)=>{const Wh=truck.wheels[k];if(!Wh)return;const s=w.hp[2]<0?-1:1,st=w.front?car.steer:0;
    Wh.matrix.makeTranslation(w.hp[0]+cg[0],w.hp[1]-w.len+cg[1],w.hp[2]).multiply(RY.makeRotationY(-st)).multiply(SZ.makeScale(1,1,s)).multiply(RZ.makeRotationZ(-w.ang));});}
let fovK=0,baseFov=55,rearOn=false,lastMode='';
function camStep(dt){const M=car.M;CP.set(car.p[0],car.p[1],car.p[2]);FW.set(M[0],0,M[6]);if(FW.lengthSq()<1e-4)FW.set(1,0,0);FW.normalize();
  const mode=bay.open?'Look':rearOn?'Rear':CAMV[state.cam],cut=mode!==lastMode;lastMode=mode;
  /* the offset is kept round the truck, so the camera never falls behind however fast it goes */
  const back=mode==='Far'?-12:-7.2,lift=mode==='Far'?3.8:2.3,want=mode==='Rear'?FW.clone().multiplyScalar(6.8).addScaledVector(UP,2.2):FW.clone().multiplyScalar(back).addScaledVector(UP,lift);
  if(cut)chase.off.copy(want);else chase.off.lerp(want,1-Math.exp(-dt*4));
  chase.l.copy(CP).addScaledVector(UP,.9);
  /* a little wider the faster it goes, and a touch more on nitrous */
  const mph=car.speed*2.237;fovK+=((Math.min(mph,320)/320)*12+(car.pt.nosOn?5:0)-fovK)*(1-Math.exp(-dt*2.5));
  if(mode==='Look'){orbit.target.lerp(chase.l,1-Math.exp(-dt*8));orbit.update();}
  else if(mode==='Hood'){CF.set(M[0],M[3],M[6]).normalize();CU.set(M[1],M[4],M[7]).normalize();
    camera.position.copy(CP).addScaledVector(CF,.35).addScaledVector(CU,1.08);camera.up.copy(CU);camera.lookAt(CP.clone().addScaledVector(CF,30).addScaledVector(CU,.7));camera.up.set(0,1,0);}
  else if(mode==='Cinematic')cineStep(dt,cut);
  else if(mode==='Rear'){camera.position.copy(CP).add(chase.off);camera.lookAt(CP.clone().addScaledVector(FW,-8).addScaledVector(UP,.6));}
  else{camera.position.copy(CP).add(chase.off);camera.lookAt(chase.l);}
  /* (on the long lens the near plane moves out with the truck, so the road and the salt keep their depth apart a quarter of a mile off) */
  camera.fov=mode==='Cinematic'?cine.fov:baseFov+(mode==='Look'?0:fovK);camera.near=mode==='Cinematic'?clamp(cine.d*.12,.25,120):.25;camera.updateProjectionMatrix();
  /* the sun's shadow and the salt follow the truck */
  sun.position.copy(CP).addScaledVector(SUN,30);sun.target.position.copy(CP);sky.position.copy(camera.position);saltFollow(CP.x,CP.z);frameView();}

/* ---------- the HUD: the game's dots over the picture (its FS_HUDDOT, 55_post), its words on their own canvas ---------- */
const hudScene=new THREE.Scene(),hudCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
let hudTex=null,hudBuf=null;
const hudMat=new THREE.ShaderMaterial({uniforms:{uHud:{value:null},uRect:{value:new THREE.Vector4()},uRes:{value:new THREE.Vector2()}},
  vertexShader:'void main(){gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader:`uniform sampler2D uHud;uniform vec4 uRect;uniform vec2 uRes;
void main(){
  vec2 p=(gl_FragCoord.xy-uRect.xy)/uRect.zw;vec3 add=vec3(0.);float a=0.;
  if(p.x>=0.&&p.y>=0.&&p.x<=1.&&p.y<=1.){vec2 cell=p*uRes,id=floor(cell),f=fract(cell)-.5;vec4 hu=texture2D(uHud,vec2((id.x+.5)/uRes.x,1.-(id.y+.5)/uRes.y));
    if(hu.a>0.){float fw=max(fwidth(cell.x),fwidth(cell.y)),d=length(f),dm=1.-smoothstep(.42-fw*.6,.42+fw*.6,d),far=smoothstep(.38,.95,fw),
      m=mix(dm*(.82+.4*(1.-smoothstep(0.,.42,d))),.62,far);
      add+=min(hu.rgb*1.15,vec3(1.))*m*hu.a;a=hu.a*.82;}}
  gl_FragColor=vec4(add,a);}`,
  transparent:true,depthTest:false,depthWrite:false,blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneMinusSrcAlphaFactor,blendEquation:THREE.AddEquation});
hudScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),hudMat));
const DB=new THREE.Vector2();
function hudDraw(){
  const label='SUV '+(Object.keys(state.T).some(k=>k!=='nos')||state.fd||state.plus?'CUSTOM':'STOCK')+(state.plus?'+':''),x=car.p[0];
  const place=x<-5?'BEHIND THE START':x>ROAD_X1?'PAST THE END OF THE ROAD':Math.abs(car.p[2])>ROAD_HW+1?'OUT ON THE SALT · MILE '+(x/MILE).toFixed(2):'SALT FLATS ROAD · MILE '+(x/MILE).toFixed(2);
  UI.miniHud({car,touch:TOUCH.on,label,place,level:state.level,levelName:DR.ASSISTS[state.level].name,trac:state.trac,od,rear:rearOn,popT:VOICE.popT});
  if(hudBuf!==UI.HB8){hudBuf=UI.HB8;if(hudTex)hudTex.dispose();hudTex=new THREE.DataTexture(hudBuf,UI.BW,UI.BH,THREE.RGBAFormat,THREE.UnsignedByteType);
    hudTex.magFilter=hudTex.minFilter=THREE.NearestFilter;hudTex.generateMipmaps=false;hudTex.colorSpace=THREE.NoColorSpace;hudMat.uniforms.uHud.value=hudTex;}
  hudTex.needsUpdate=true;
  const R=UI.RECT,dpr=renderer.getPixelRatio();renderer.getDrawingBufferSize(DB);
  hudMat.uniforms.uRect.value.set(Math.round(R.x*dpr),DB.y-Math.round(R.y*dpr)-Math.round(R.h*dpr),Math.round(R.w*dpr),Math.round(R.h*dpr));hudMat.uniforms.uRes.value.set(UI.BW,UI.BH);
  renderer.autoClear=false;renderer.render(hudScene,hudCam);renderer.autoClear=true;}

/* ---------- the numbers (F): the frame, the CPU's share, the GPU's own time where the browser says ---------- */
const gl=renderer.getContext(),TQ=gl.getExtension('EXT_disjoint_timer_query_webgl2');
const GPU=(()=>{const e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):'';})();
const PERF={on:false,ft:[],js:[],gpu:null,gq:[],t0:0,last:0};
function gpuBegin(){if(!TQ||!PERF.on)return null;const q=gl.createQuery();gl.beginQuery(TQ.TIME_ELAPSED_EXT,q);return q;}
function gpuEnd(q){if(!q)return;gl.endQuery(TQ.TIME_ELAPSED_EXT);PERF.gq.push(q);
  while(PERF.gq.length){const o=PERF.gq[0];if(!gl.getQueryParameter(o,gl.QUERY_RESULT_AVAILABLE))break;PERF.gq.shift();
    if(!gl.getParameter(TQ.GPU_DISJOINT_EXT)){const ms=gl.getQueryParameter(o,gl.QUERY_RESULT)/1e6;PERF.gpu=PERF.gpu==null?ms:PERF.gpu*.9+ms*.1;}gl.deleteQuery(o);}}
function perfShow(frameMs,jsMs){PERF.ft.push(frameMs);PERF.js.push(jsMs);if(PERF.ft.length>60){PERF.ft.shift();PERF.js.shift();}
  const now=performance.now();if(now-PERF.last<500)return;PERF.last=now;const n=PERF.ft.length,avg=PERF.ft.reduce((a,b)=>a+b,0)/n,w=Math.max(...PERF.ft),js=PERF.js.reduce((a,b)=>a+b,0)/n;
  $('stat').textContent=Math.round(1000/avg)+' FPS';
  const el=$('perf');el.hidden=!PERF.on||bay.open;if(!PERF.on)return;const i=renderer.info.render;
  el.textContent=[`${Math.round(1000/avg)} FPS   frame ${avg.toFixed(1)} ms   worst ${w.toFixed(1)}`,`CPU ${js.toFixed(1)} ms   GPU ${PERF.gpu!=null?PERF.gpu.toFixed(1)+' ms':'not reported'}`,
    `render ${DB.x}×${DB.y}   ${Math.round(i.triangles/1000)}k tris   ${i.calls} draws`,`truck ${Math.round((truck?truck.tris:0)/1000)}k tris   sound ${UI.ENG.audio?UI.ENG.audio.worklet?'worklet':'main thread':'off'}`,
    String(GPU).replace(/^ANGLE \(/,'').slice(0,58)].join('\n');}

/* ---------- the bay (the menu): the truck stopped where it stands, the camera round it, the sheets beside it ---------- */
const bay={open:false,at:null,pad:0,rpm:null,tab:'tune'};
const tuner=makeTuner({DR,box:$('tuneRows'),chart:$('dyno'),stats:$('dynoStats'),state,onEngine:(e,final)=>{voiceCfg(e,!final);if(final)save();}});
const pct=v=>Math.round(v*100)+'%';
const LEVEL_WHY={real:'The truck as it is: ABS and the automatic, nothing catching it. It slides, it spins, it rolls.',
  middle:'A steering helper, stability control and traction control step in when it starts to get away from you. Still rolls if you really try.',
  kids:'Everything helps: it holds the road, it won\'t roll over, and it\'s quick to get going.'};
const DRIVE_ROWS=[
  {h:'Driving'},
  {k:'level',l:'Help',t:'seg',opts:()=>['real','middle','kids'].map(id=>[id,DR.ASSISTS[id].name])},
  {h:'Traction'},
  {k:'trac',l:'Traction',t:'range',rng:()=>[.5,2,.05],fmt:pct,why:"The ground's grip, every surface at once (the game's developer panel; T steps it 100, 150, 200%). 100% is how SUV drives; the county plays at 200%."},
  {k:'rear',l:'Back-end grip',t:'range',rng:()=>[.7,1.4,.01],fmt:pct,why:'The rear tyres, from their own grip. Up: the tail holds and the truck pushes wide. Down: the tail steps out sooner.'},
  {k:'slide',l:'Grip once sliding',t:'range',rng:()=>[.8,1.25,.01],fmt:pct,why:'How much grip a tyre keeps once it breaks loose. Up makes slides gentler and easier to catch.'},
  {k:'steer',l:'Steering at speed',t:'range',rng:()=>[.7,2,.01],fmt:pct,why:'How far full steering turns the wheels at speed. Up turns harder and slides sooner.'},
  {h:'Steering on a phone'},
  {k:'steerMode',l:'Steering',t:'seg',opts:()=>[['slide','Slide'],['tilt','Tilt'],['buttons','Buttons']]},
  {h:'Sound'},
  {k:'vol',l:'Volume',t:'range',rng:()=>[0,1,.01],fmt:pct},
  {k:'body',l:'Speaker',t:'seg',opts:()=>[['full','Fuller'],['phone','Phone speaker'],['lab','As the lab']],why:'A little more low end for headphones or a laptop (Fuller), the low mids lifted for a phone\'s own speaker, or flat as the Digital Engine lab has it.'},
];
const driveSheet=makeSheet($('driveRows'),DRIVE_ROWS,{ctx:()=>state,
  get:r=>r.k==='vol'?UI.ENG.vol:r.k==='body'?UI.ENG.body:r.k in HAND0?state.hand[r.k]:state[r.k],
  set:(r,v,final)=>{if(r.k==='vol')UI.setVolume(v);else if(r.k==='body')UI.setBody(v);else if(r.k in HAND0)state.hand[r.k]=v;else state[r.k]=v;
    if(r.k==='trac'||r.k in HAND0)applyTraction();if(r.k==='steerMode'){if(v==='tilt')enableTilt();syncTouch();}if(r.k==='trac')tuner.refresh(false);
    if(r.k==='level'){const l=$('levelWhy');if(l)l.textContent=LEVEL_WHY[v]||'';}
    driveSheet.sync();if(final)save();}});
/* (the level's description under its row) */
{const r=DRIVE_ROWS.find(q=>q.k==='level'),p=document.createElement('p');p.className='why';p.id='levelWhy';p.textContent=LEVEL_WHY[state.level];r.row.appendChild(p);}
function bayTab(t){bay.tab=t;for(const b of $('mTabs').children)b.setAttribute('aria-selected',String(b.dataset.t===t));
  for(const el of document.querySelectorAll('#menu .tab'))el.hidden=el.dataset.tab!==t;$('revPad').hidden=t!=='tune';if(t==='tune')tuner.drawChart(tuner.E);}
for(const b of $('mTabs').children)b.addEventListener('click',()=>bayTab(b.dataset.t));
function bayToggle(){bay.open?bayClose():bayOpen();}
function bayOpen(){if(bay.open||!car)return;bay.open=true;touchLetGo();INPUT.down.clear();rearOn=false;
  bay.at={x:car.p[0],z:car.p[2],yaw:Math.atan2(-car.M[6],car.M[0])};bay.rpm=null;bay.pad=0;
  /* the truck brought to rest where it stands, the camera to a front three-quarter view round it */
  spawn(bay.at);for(let i=0;i<360;i++)car.step(1/240,{steer:0,thr:0,brk:0,hb:1,nos:false});place();
  orbit.enabled=true;const f=FW.set(car.M[0],0,car.M[6]).normalize(),r=new THREE.Vector3(-f.z,0,f.x),d=cv.clientWidth<=700?1.75:1;
  orbit.target.set(car.p[0],car.p[1]+.3,car.p[2]);camera.position.copy(orbit.target).addScaledVector(f,5.6*d).addScaledVector(r,-3.4*d).add(new THREE.Vector3(0,1.4*d,0));orbit.update();
  UI.txtClear();$('perf').hidden=true;$('menu').hidden=false;syncTouch();tuner.refresh(false);driveSheet.sync();bayTab(bay.tab);}
function bayClose(){if(!bay.open)return;bay.open=false;bay.pad=0;$('menu').hidden=true;save();
  /* the truck built again with the engine as tuned, where it stood */
  spawn(bay.at);orbit.enabled=false;syncTouch();}
/* the rev pad: hold it and the engine (as tuned) climbs toward the redline */
{const rp=$('revPad'),on=v=>e=>{e.preventDefault();if(v)wakeAudio();bay.pad=v;rp.classList.toggle('on',!!v);};
  rp.addEventListener('pointerdown',on(1));for(const ev of ['pointerup','pointercancel','pointerleave'])rp.addEventListener(ev,on(0));rp.addEventListener('contextmenu',e=>e.preventDefault());}
/* with the bay open the picture is shifted so the truck sits in the part of the screen the card leaves free (left of
   it on a wide screen, above it on a narrow one) */
function frameView(){const w=cv.clientWidth,h=cv.clientHeight;
  if(!bay.open){if(camera.view&&camera.view.enabled)camera.clearViewOffset();return;}
  const narrow=w<=700,sx=narrow?0:Math.min(260,w*.2),sy=narrow?h*.3:0;
  if(!camera.view||!camera.view.enabled||camera.view.offsetX!==sx||camera.view.offsetY!==sy||camera.view.fullWidth!==w||camera.view.fullHeight!==h)camera.setViewOffset(w,h,sx,sy,w,h);}

/* ---------- one frame of driving (the game's step) ---------- */
let acc=0;const STEP=1/240;
function step(dt){
  const inp=pollInput(dt),pt=car.pt;
  if(inp.menu){bayToggle();return;}
  if(bay.open)return;
  if(inp.cam){state.cam=(state.cam+1)%CAMV.length;save();UI.say(CAMV[state.cam]+' camera',1.2);}
  if(inp.reset){spawn();UI.say('Back to the start',1.2);return;}
  if(inp.up)pt.shift(1);if(inp.down)pt.shift(-1);
  if(inp.low)UI.say(DR.setLow(car,!car.low)?(car.low?'Low range':'High range'):'No low range on this car',1.4);
  if(inp.lockers)UI.say(DR.setLockers(car,!car.locked)?(car.locked?'Lockers on':'Lockers off'):'No lockers on this car',1.4);
  if(inp.od)UI.say(setOD(!od)?(od?'Overdrive off':'Overdrive on'):'No overdrive button on this box',1.4);
  if(inp.trac){const S=[1,1.5,2],i=S.findIndex(v=>Math.abs(v-state.trac)<.01);state.trac=S[(i+1)%S.length];applyTraction();save();UI.say('Traction '+pct(state.trac),1.4);}
  if(inp.ign){if(pt.st==='off'||pt.st==='stopping'){pt.start();wakeAudio();}else pt.stop();}
  if(inp.stats){PERF.on=!PERF.on;UI.say(PERF.on?'Performance readout':'Numbers off',1.2);}
  rearOn=!!(inp.rear||TOUCH.rear);
  let drive=inp;
  /* brake and gas together at a standstill: a line lock for a burnout (a launch-control box holds on its trans-brake) */
  if(!pt.e.launch&&inp.brk>.5&&inp.thr>.3&&car.speed<3&&!car.rev&&pt.running)drive=Object.assign({},inp,{brk:0,lock:true});
  if((inp.thr>.1||inp.brk>.1)&&pt.st==='off')pt.start();
  acc+=dt;let n=0;while(acc>=STEP&&n<30){car.step(STEP,drive);acc-=STEP;n++;}if(n>=30)acc=0;nosStep(dt,drive);
  if(car.p[1]<-20)spawn();
}
let last=performance.now(),held=false;
function frame(now){const dt=Math.min(.1,(now-last)/1000),frameMs=now-last;last=now;const t0=performance.now();
  UI.APP.t+=dt;
  if(car){step(dt);VOICE.flame=Math.max(0,VOICE.flame-dt*9);place();camStep(dt);soundUpdate(dt);}
  if(bay.open)orbit.update();
  const q=gpuBegin();renderer.render(scene,camera);if(car&&!bay.open)hudDraw();gpuEnd(q);
  if(!bay.open)UI.txtFlush();
  perfShow(frameMs,performance.now()-t0);syncTouchLazy(now);}
let syncT=0;function syncTouchLazy(now){if(now-syncT>400){syncT=now;syncTouch();}}
function loop(now){if(!held)frame(now);requestAnimationFrame(loop);}
function resize(){const w=cv.clientWidth,h=cv.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;baseFov=w<h?70:55;camera.fov=baseFov;camera.updateProjectionMatrix();
  UI.hudLayout();if(bay.open)tuner.drawChart(tuner.E);}
addEventListener('resize',resize);

/* ---------- start ---------- */
UI.setRes(COARSE?2:3);UI.txtFonts();resize();bindTouch();
$('menuBtn').addEventListener('click',()=>{wakeAudio();bayToggle();});$('bayDone').onclick=bayClose;$('bayReset').onclick=()=>tuner.reset();
cv.addEventListener('pointerdown',wakeAudio);
/* the truck is built after the first picture is up (it takes a moment: a few hundred thousand triangles) */
spawn();place();camStep(1);renderer.render(scene,camera);
setTimeout(()=>{buildTruck();place();$('loading').hidden=true;syncTouch();requestAnimationFrame(loop);},40);
window.MINI={THREE,scene,camera,renderer,state,spawn,bayOpen,bayClose,bayTab,tuner,TOUCH,VOICE,wakeAudio,get car(){return car;},get truck(){return truck;},hold(h){held=h;},
  step(t,inp){/* (the tools' drive: t seconds of the given input, then a frame) */const n=Math.round(t/STEP);for(let i=0;i<n;i++){car.step(STEP,inp||{steer:0,thr:0,brk:0,hb:0});if(i%24===0)nosStep(STEP*24,inp||{});}place();camStep(1);},
  snap(){place();camStep(.05);renderer.render(scene,camera);if(!bay.open){hudDraw();UI.txtFlush();}return cv.toDataURL('image/png');},
  set rear(v){rearOn=v;},get cine(){return cine;},PERF,GPU,get E(){return car&&car.pt.e;}};
