/* =====================================================================================
   REDLINE COUNTY: SALT MINI. The SUV Studio's full truck on the game's own physics, driven exactly as in SUV: Super
   Unlimited Venture, on a bare salt flat with a ten-mile road across it. A speedometer, nitrous, and the tuner bay.
   No sound yet.
   ===================================================================================== */
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {Sky} from 'three/addons/objects/Sky.js';
import {makeMats} from './mats.js';
import {makeSpeedo} from './speedo.js';
import {makeTuner} from './tuner.js';

const K=window.KIT,DR=window.DRIVE,Q=new URLSearchParams(location.search);
const PHONE=matchMedia('(hover: none)').matches;
const cv=document.getElementById('cv'),$=id=>document.getElementById(id);
const renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:!!Q.get('shots')});
renderer.setPixelRatio(Math.min(devicePixelRatio,PHONE?1.5:2));renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=.74;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(55,1,.25,6000);
const {meshes}=makeMats(THREE,K);

/* ---------- the save: the tune, the final drive, the driving level ---------- */
const SAVE_KEY='sm-mini';
const state=(()=>{const d={T:{nos:3},fd:0,plus:0,level:'middle'};try{const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');
  if(s&&typeof s==='object'){if(s.T&&typeof s.T==='object')d.T=s.T;if(s.fd>=1.5&&s.fd<=5)d.fd=s.fd;if(s.plus>=1&&s.plus<=2)d.plus=s.plus;if(DR.ASSISTS[s.level])d.level=s.level;}}catch(e){}return d;})();
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
const sun=new THREE.DirectionalLight(0xfff3e2,2.2);sun.castShadow=true;const SMAP=PHONE?1024:2048;sun.shadow.mapSize.set(SMAP,SMAP);
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
const saltGeo=new THREE.PlaneGeometry(SALT_SIZE,SALT_SIZE,1,1);saltGeo.rotateX(-Math.PI/2);
const salt=new THREE.Mesh(saltGeo,saltMat);salt.receiveShadow=true;scene.add(salt);
const fr=v=>v-Math.floor(v);
function saltFollow(x,z){const cx=Math.round(x/SALT_SNAP)*SALT_SNAP,cz=Math.round(z/SALT_SNAP)*SALT_SNAP;if(salt.position.x===cx&&salt.position.z===cz)return;
  salt.position.set(cx,0,cz);saltU.uO1.value.set(fr(cx/SC[0]),fr(cz/SC[0]),fr(cx/SC[1]+.37),fr(cz/SC[1]+.61));saltU.uO2.value.set(fr(cx/SC[2]+.71),fr(cz/SC[2]+.13));}
saltFollow(0,0);
/* the road: blacktop in 400 m pieces (each its own picture coordinates, so nothing far down the road loses
   precision), white edge lines, a yellow dashed centre line, a white bar at the start, the quarter mile and each mile */
{const SEG=400,asph=new THREE.MeshStandardMaterial({map:TEX.asphalt,color:0x8c8c8c,roughness:.86,metalness:0,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2});
  const paint=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.62,metalness:0,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4});
  const TILE=3.2,W=new THREE.Color(0xe8e6df),Y=new THREE.Color(0xe0b43a);
  for(let x0=ROAD_X0;x0<ROAD_X1;x0+=SEG){const x1=Math.min(x0+SEG,ROAD_X1),g=new THREE.PlaneGeometry(x1-x0,ROAD_HW*2,1,1);g.rotateX(-Math.PI/2);
    const U=g.attributes.uv,P=g.attributes.position;for(let i=0;i<P.count;i++){const lx=P.getX(i),lz=P.getZ(i);U.setXY(i,(lx+(x1-x0)/2)/TILE+fr(x0/TILE),lz/TILE);}
    const m=new THREE.Mesh(g,asph);m.position.set((x0+x1)/2,.002,0);m.receiveShadow=true;scene.add(m);
    /* the paint for this piece, in one mesh */
    const pos=[],col=[],quad=(ax,az,bx,bz,c)=>{const y=.004;pos.push(ax,y,az, bx,y,az, bx,y,bz, ax,y,az, bx,y,bz, ax,y,bz);for(let k=0;k<6;k++)col.push(c.r,c.g,c.b);};
    for(const s of [-1,1])quad(x0,s*(ROAD_HW-.35),x1,s*(ROAD_HW-.2),W);
    for(let d=Math.ceil(x0/12)*12;d<x1;d+=12)quad(d,-.07,Math.min(d+3.5,x1),.07,Y);
    for(const bx of [0,MILE/4,...Array.from({length:10},(_,i)=>(i+1)*MILE)])if(bx>=x0&&bx<x1)quad(bx-.3,-ROAD_HW+.2,bx+.3,ROAD_HW-.2,W);
    /* (made to face up: wound counter-clockwise seen from above) */
    const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));pg.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
    pg.setIndex(null);pg.computeVertexNormals();const pm=new THREE.Mesh(pg,paint);pm.material.side=THREE.DoubleSide;pm.receiveShadow=true;scene.add(pm);}}
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
  sign(0,'START','',  '#1c5e2f');sign(MILE/4,'¼ MILE','','#1c4a7a');
  for(let i=1;i<=10;i++)sign(i*MILE,String(i),i===1?'MILE':'MILES','#1c5e2f');
  sign(ROAD_X1-30,'END','ROAD','#7a1c1c');}

/* ---------- the truck: the SUV Studio's, in full ---------- */
function wheelPlace(D,b,front,s){const R=b.look.tyre.R,wb=D.uRa-D.uFa;return [front?D.X(D.uFa):D.X(D.uFa)-wb*Math.cos(D.pitch),front?R:D.Rr,s*(b.look.track/2)];}
let truck=null;const carRoot=new THREE.Group();carRoot.matrixAutoUpdate=false;scene.add(carRoot);
function buildTruck(){const t0=performance.now();K.setHD(true);const T=K.studioBuild('stock',.25),b=T.b,body=new THREE.Group();
  body.add(meshes(T.body,'body',b),meshes(T.hood,'hood',b),meshes(T.hide,'hide',b));
  for(const [nm,src] of Object.entries(T.hd||{}))if(src&&src.p)body.add(meshes(src,nm,b));
  const wheel=meshes(T.wheel,'wheel',b),root=new THREE.Group(),wheels=[];root.add(body);
  for(const front of [1,0])for(const s of [1,-1]){const w=new THREE.Group();w.matrixAutoUpdate=false;w.add(wheels.length?wheel.clone():wheel);w.userData.s=s;root.add(w);wheels.push(w);}
  let tris=0;root.traverse(m=>{if(m.isMesh){m.castShadow=true;tris+=m.geometry.index?m.geometry.index.count/3:m.geometry.attributes.position.count/3;}});
  truck={root,wheels,D:T.D,b,tris,ms:performance.now()-t0};carRoot.add(root);}

/* ---------- the physics: the game's own, set up as SUV has it ---------- */
let car=null,E=null;
function spawn(at){const p=at||{x:0,z:0,yaw:0};E=DR.tunedEngine(state.T,state.fd||0,state.plus||0);car=DR.makeCar(DR.stock,world);car.setAssists(state.level);
  car.place([p.x,.6,p.z],p.yaw);car.pt.start();speedo.reset();}
const IN={steer:0,thr:0,brk:0,hb:0,keys:new Set(),touch:{l:0,r:0,g:0,b:0,h:0,n:0}};
addEventListener('keydown',e=>{if(e.target&&/INPUT|SELECT/.test(e.target.tagName))return;IN.keys.add(e.code);
  if(e.code==='KeyR'&&!bay.open)spawn();if(e.code==='KeyC'&&!bay.open)toggleCam();if(e.code==='KeyT')bayToggle();
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();});
addEventListener('keyup',e=>IN.keys.delete(e.code));
addEventListener('blur',()=>IN.keys.clear());
for(const [id,k] of [['tl','l'],['tr','r'],['tg','g'],['tb','b'],['th','h'],['tn','n']]){const el=$(id);if(!el)continue;
  const on=v=>e=>{e.preventDefault();IN.touch[k]=v;el.classList.toggle('on',!!v);};el.addEventListener('pointerdown',on(1));el.addEventListener('pointerup',on(0));el.addEventListener('pointercancel',on(0));el.addEventListener('pointerleave',on(0));}
const has=c=>IN.keys.has(c);
function input(dt){const T=IN.touch,tgt=((has('ArrowRight')||has('KeyD')||T.r)?1:0)-((has('ArrowLeft')||has('KeyA')||T.l)?1:0),rate=tgt===0?6:Math.sign(tgt)!==Math.sign(IN.steer)&&IN.steer!==0?8:3.2;
  IN.steer+=THREE.MathUtils.clamp(tgt-IN.steer,-rate*dt,rate*dt);
  const g=(has('ArrowUp')||has('KeyW')||T.g)?1:0,b=(has('ArrowDown')||has('KeyS')||T.b)?1:0;
  IN.thr+=THREE.MathUtils.clamp(g-IN.thr,-8*dt,6*dt);IN.brk+=THREE.MathUtils.clamp(b-IN.brk,-10*dt,8*dt);
  return {steer:IN.steer,thr:IN.thr,brk:IN.brk,hb:(has('Space')||T.h)?1:0,nos:!!(has('KeyN')||has('ShiftLeft')||has('ShiftRight')||T.n),lock:false};}
/* the bottle: the physics empties it while it fires (eight seconds a bottle); it fills again, about twelve seconds
   from empty, while the button is off */
function nosStep(dt,inp){const pt=car.pt;if(!pt.e.nosKw)return;if(!inp.nos)pt.nos=Math.min(1,pt.nos+dt/12);}

/* ---------- the camera: behind the truck (no lag at any speed), or free round it ---------- */
const orbit=new OrbitControls(camera,cv);orbit.enabled=false;orbit.enableDamping=true;orbit.maxPolarAngle=Math.PI*.495;orbit.minDistance=2.5;orbit.maxDistance=40;
let camMode='chase';const chase={off:new THREE.Vector3(-7.2,2.3,0),l:new THREE.Vector3()};
function toggleCam(){camMode=camMode==='chase'?'look':'chase';orbit.enabled=camMode==='look';$('cam').textContent=camMode==='chase'?'Chase':'Look';if(camMode==='look')orbit.target.copy(chase.l);}
const tmpM=new THREE.Matrix4(),cgM=new THREE.Matrix4(),CP=new THREE.Vector3(),FW=new THREE.Vector3(),UP=new THREE.Vector3(0,1,0),WM=new THREE.Matrix4(),RY=new THREE.Matrix4(),SZ=new THREE.Matrix4(),RZ=new THREE.Matrix4();
function place(){const M=car.M,p=car.p,cg=car.cg;
  tmpM.set(M[0],M[1],M[2],p[0],M[3],M[4],M[5],p[1],M[6],M[7],M[8],p[2],0,0,0,1);cgM.makeTranslation(-cg[0],-cg[1],0);carRoot.matrix.multiplyMatrices(tmpM,cgM);carRoot.matrixWorldNeedsUpdate=true;
  if(!truck)return;car.wheels.forEach((w,k)=>{const W=truck.wheels[k];if(!W)return;const s=w.hp[2]<0?-1:1,st=w.front?car.steer:0;
    W.matrix.makeTranslation(w.hp[0]+cg[0],w.hp[1]-w.len+cg[1],w.hp[2]).multiply(RY.makeRotationY(-st)).multiply(SZ.makeScale(1,1,s)).multiply(RZ.makeRotationZ(-w.ang));});}
let fovK=0;
function camStep(dt){CP.set(car.p[0],car.p[1],car.p[2]);FW.set(car.M[0],0,car.M[6]);if(FW.lengthSq()<1e-4)FW.set(1,0,0);FW.normalize();
  /* the offset is kept round the truck, so the camera never falls behind however fast it goes */
  const want=FW.clone().multiplyScalar(-7.2).addScaledVector(UP,2.3);chase.off.lerp(want,1-Math.exp(-dt*4));
  chase.l.copy(CP).addScaledVector(UP,.9);
  /* a little wider the faster it goes, and a touch more on nitrous */
  const mph=car.speed*2.237;fovK+=((Math.min(mph,320)/320)*12+(car.pt.nosOn?5:0)-fovK)*(1-Math.exp(-dt*2.5));
  if(camMode==='chase'){camera.position.copy(CP).add(chase.off);camera.lookAt(chase.l);}else{orbit.target.lerp(chase.l,1-Math.exp(-dt*8));orbit.update();}
  camera.fov=baseFov+(camMode==='chase'?fovK:0);camera.updateProjectionMatrix();
  /* the sun's shadow and the salt follow the truck */
  sun.position.copy(CP).addScaledVector(SUN,30);sun.target.position.copy(CP);sky.position.copy(camera.position);saltFollow(CP.x,CP.z);frameView();}

/* ---------- the readout and the speedometer ---------- */
const speedo=makeSpeedo($('speedo'));
const gl=renderer.getContext(),GPU=(()=>{const e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):'';})();
const PERF={frames:0,t0:performance.now(),fps:0};
function hud(force){const now=performance.now();if(now-PERF.t0>=500){PERF.fps=PERF.frames/((now-PERF.t0)/1000);PERF.frames=0;PERF.t0=now;
    $('perf').textContent=`${PERF.fps.toFixed(0)} fps · ${(1000/Math.max(PERF.fps,1e-3)).toFixed(1)} ms · ${Math.round((truck?truck.tris:0)/1000)}k triangles in the truck`;}
  if(!car)return;const pt=car.pt,e=pt.e,g=pt.gear;
  speedo.draw({force,mph:car.speed*2.237,rpm:pt.rpmOut||0,redline:e.redline,limit:e.limiterRpm,gear:g<0?'R':g===0?'N':String(g),nosKit:!!e.nosKw,nos:pt.nos,nosOn:pt.nosOn});
  $('tn').hidden=!e.nosKw;}

/* ---------- the tuner bay: the truck stopped where it is, the camera round it, the sheet beside it ---------- */
const bay={open:false,at:null};
const tuner=makeTuner({DR,box:$('tunerRows'),chart:$('dyno'),stats:$('dynoStats'),state,onChange:(e,final)=>{if(final)save();}});
function bayToggle(){bay.open?bayClose():bayOpen();}
function bayOpen(){if(bay.open||!car)return;bay.open=true;document.body.classList.add('bay');
  bay.at={x:car.p[0],z:car.p[2],yaw:Math.atan2(-car.M[6],car.M[0])};
  /* the truck brought to rest where it stands, the camera to a front three-quarter view round it */
  spawn(bay.at);for(let i=0;i<360;i++)car.step(1/240,{steer:0,thr:0,brk:0,hb:1,nos:false});place();
  camMode='look';orbit.enabled=true;const f=FW.set(car.M[0],0,car.M[6]).normalize(),r=new THREE.Vector3(-f.z,0,f.x);
  const d=cv.clientWidth<=700?1.75:1;
  orbit.target.set(car.p[0],car.p[1]+.3,car.p[2]);camera.position.copy(orbit.target).addScaledVector(f,5.6*d).addScaledVector(r,-3.4*d).add(new THREE.Vector3(0,1.4*d,0));orbit.update();
  $('tuner').hidden=false;tuner.refresh(false);}
function bayClose(){if(!bay.open)return;bay.open=false;document.body.classList.remove('bay');$('tuner').hidden=true;save();
  /* the truck built again with the engine as tuned, where it stood */
  spawn(bay.at);camMode='chase';orbit.enabled=false;$('cam').textContent='Chase';}

/* with the tuner bay open the picture is shifted so the truck sits in the part of the screen the sheet leaves free
   (left of it on a wide screen, above it on a narrow one) */
function frameView(){const w=cv.clientWidth,h=cv.clientHeight;
  if(!bay.open){if(camera.view&&camera.view.enabled)camera.clearViewOffset();return;}
  const narrow=w<=700,sx=narrow?0:Math.min(200,w*.16),sy=narrow?h*.3:0;
  if(!camera.view||camera.view.offsetX!==sx||camera.view.offsetY!==sy||camera.view.fullWidth!==w||camera.view.fullHeight!==h)camera.setViewOffset(w,h,sx,sy,w,h);}
/* ---------- the loop ---------- */
let acc=0,last=performance.now(),held=false,baseFov=55;const STEP=1/240;
function frame(now){const dt=Math.min(.1,(now-last)/1000);last=now;
  if(car&&!bay.open){const inp=input(dt);acc+=dt;let n=0;while(acc>=STEP&&n<30){car.step(STEP,inp);acc-=STEP;n++;}if(n>=30)acc=0;nosStep(dt,inp);
    if(car.p[1]<-20)spawn();}
  if(car){place();camStep(dt);}
  if(bay.open)orbit.update();
  frameView();
  renderer.render(scene,camera);PERF.frames++;hud();}
function loop(now){if(!held)frame(now);requestAnimationFrame(loop);}
function resize(){const w=cv.clientWidth,h=cv.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;baseFov=w<h?70:55;camera.fov=baseFov;camera.updateProjectionMatrix();speedo.fit();if(bay.open)tuner.drawChart(tuner.E);}
addEventListener('resize',resize);resize();

/* ---------- the buttons ---------- */
$('cam').onclick=toggleCam;$('reset').onclick=()=>spawn();$('tune').onclick=bayToggle;$('bayDone').onclick=bayClose;
$('bayReset').onclick=()=>{tuner.reset();};
if(PHONE)document.body.classList.add('touch');
/* the truck is built after the first picture is up (it takes a moment: a few hundred thousand triangles) */
spawn();place();camStep(1);renderer.render(scene,camera);
setTimeout(()=>{buildTruck();place();$('loading').hidden=true;requestAnimationFrame(loop);},40);
window.MINI={THREE,scene,camera,renderer,state,spawn,bayOpen,bayClose,tuner,speedo,get car(){return car;},get truck(){return truck;},hold(h){held=h;},
  step(t,inp){/* (the tools' drive: t seconds of the given input, then a frame) */const n=Math.round(t/STEP);for(let i=0;i<n;i++){car.step(STEP,inp||{steer:0,thr:0,brk:0,hb:0});if(i%24===0)nosStep(STEP*24,inp||{});}place();camStep(1);},
  snap(){place();camStep(.05);renderer.render(scene,camera);hud(true);return cv.toDataURL('image/png');},PERF,GPU,toggleCam,get E(){return car&&car.pt.e;}};
