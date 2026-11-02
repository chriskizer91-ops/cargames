/* =====================================================================================
   SUV: SUPER UNLIMITED VENTURE. A test: the stock truck on the game's own physics, on a patch of ground in the
   owner's pictures, drawn three ways, with the cost of each on screen.
   - Game: the truck exactly as Road Not Found builds it (about 51 000 triangles with its four wheels).
   - Studio: the SUV Studio's truck (about 487 000).
   - Baked: the game's truck again, wearing the Studio truck's detail as pictures (tools/bake.py).
   The frame-rate readout, the GPU's own time where the browser will say, and a Benchmark that drives each in turn.
   ===================================================================================== */
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {Sky} from 'three/addons/objects/Sky.js';
import {makeMats} from './mats.js';

const K=window.KIT,DR=window.DRIVE,MAT=K.MAT,SM=K.SM,Q=new URLSearchParams(location.search);
const PHONE=matchMedia('(hover: none)').matches;
const cv=document.getElementById('cv'),$=id=>document.getElementById(id);
const renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:!!Q.get('shots')});
renderer.setPixelRatio(Math.min(devicePixelRatio,PHONE?1.5:2));renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=.82;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(55,1,.1,1500);
const {meshes}=makeMats(THREE,K);

/* ---------- the sky, the sun and the light the sky gives (its picture, for reflections) ---------- */
const sky=new Sky();sky.scale.setScalar(1000);const su=sky.material.uniforms;
su.turbidity.value=4;su.rayleigh.value=1.4;su.mieCoefficient.value=.004;su.mieDirectionalG.value=.8;
const SUN=new THREE.Vector3().setFromSphericalCoords(1,THREE.MathUtils.degToRad(50),THREE.MathUtils.degToRad(40));su.sunPosition.value.copy(SUN);
scene.add(sky);
{const pm=new THREE.PMREMGenerator(renderer),s2=new THREE.Scene(),k=new Sky();k.scale.setScalar(1000);Object.assign(k.material.uniforms.sunPosition.value,SUN);
  for(const n of ['turbidity','rayleigh','mieCoefficient','mieDirectionalG'])k.material.uniforms[n].value=su[n].value;s2.add(k);
  /* (a dull ground under the sky picture, so the car's underside doesn't reflect sky) */
  const g=new THREE.Mesh(new THREE.CircleGeometry(900,32),new THREE.MeshBasicMaterial({color:0x4a4436}));g.rotation.x=-Math.PI/2;g.position.y=-2;s2.add(g);
  scene.environment=pm.fromScene(s2,.02).texture;scene.environmentIntensity=.5;}
const sun=new THREE.DirectionalLight(0xfff1dd,2.1);sun.castShadow=true;const SMAP=PHONE?1024:2048;sun.shadow.mapSize.set(SMAP,SMAP);
Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:1,far:60});sun.shadow.bias=-.0004;sun.shadow.normalBias=.03;sun.shadow.radius=3;
scene.add(sun,sun.target);scene.add(new THREE.HemisphereLight(0xbfd4ff,0x5a5040,.2));
scene.fog=new THREE.Fog(0xc9d6e3,160,700);

/* ---------- the ground: patches of the owner's pictures, flat but for a few mounds in the dirt ---------- */
const PATCH=[{s:'asphalt',x0:-40,x1:40,z0:-40,z1:40,t:7},{s:'asphalt',x0:-300,x1:300,z0:-6,z1:6,t:7},{s:'concrete',x0:-130,x1:-60,z0:30,z1:100,t:6},
  {s:'dirt',x0:55,x1:200,z0:-130,z1:-20,t:5,mounds:1},{s:'gravel',x0:-200,x1:-60,z0:-130,z1:-20,t:4},{s:'mud',x0:80,x1:130,z0:40,z1:90,t:5},
  {s:'trail',x0:-300,x1:300,z0:118,z1:126,t:5},{s:'ruts',x0:140,x1:240,z0:40,z1:90,t:5}];
const MOUNDS=[[90,-60,1.2,6],[120,-95,.8,5],[150,-50,1.6,8],[170,-100,.6,3.5],[100,-110,1,5]];
function patchAt(x,z){for(let i=PATCH.length-1;i>=0;i--){const p=PATCH[i];if(x>=p.x0&&x<=p.x1&&z>=p.z0&&z<=p.z1)return p;}return null;}
function groundY(x,z){let y=0;if(x>55&&x<200&&z>-130&&z<-20)for(const [mx,mz,h,r] of MOUNDS){const d=((x-mx)**2+(z-mz)**2)/(r*r);if(d<9)y+=h*Math.exp(-d);}return y;}
const BOUND=290;
const world=new DR.GroundWorld((x,z,o)=>{const e=.05,y=groundY(x,z),dx=(groundY(x+e,z)-groundY(x-e,z))/(2*e),dz=(groundY(x,z+e)-groundY(x,z-e))/(2*e),l=Math.hypot(dx,1,dz);
  o.y=y;o.n[0]=-dx/l;o.n[1]=1/l;o.n[2]=-dz/l;const p=patchAt(x,z);o.surf=p?p.s:'grass';},{near:()=>[]},BOUND);
const TL=new THREE.TextureLoader(),TEX={};
for(const [k,d] of Object.entries(window.GROUND_TEX)){const t=TL.load(d);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();TEX[k]=t;}
function groundMesh(x0,x1,z0,z1,surf,tile,step,y0){const nx=Math.max(1,Math.round((x1-x0)/step)),nz=Math.max(1,Math.round((z1-z0)/step)),g=new THREE.PlaneGeometry(x1-x0,z1-z0,nx,nz);
  g.rotateX(-Math.PI/2);g.translate((x0+x1)/2,0,(z0+z1)/2);const P=g.attributes.position,U=g.attributes.uv;
  for(let i=0;i<P.count;i++){const x=P.getX(i),z=P.getZ(i);P.setY(i,groundY(x,z)+y0);U.setXY(i,x/tile,z/tile);}g.computeVertexNormals();
  const m=new THREE.MeshStandardMaterial({map:TEX[surf],roughness:surf==='mud'?.55:.95,polygonOffset:y0>0,polygonOffsetFactor:-1,polygonOffsetUnits:-2*y0*1000});
  const o=new THREE.Mesh(g,m);o.receiveShadow=true;return o;}
scene.add(groundMesh(-600,600,-600,600,'grass',6,600,0));
PATCH.forEach((p,i)=>scene.add(groundMesh(p.x0,p.x1,p.z0,p.z1,p.s,p.t,p.mounds?1.5:Math.max(p.x1-p.x0,p.z1-p.z0),.001*(i+1))));
/* a few posts along the pad's edge, so speed reads */
{const g=new THREE.CylinderGeometry(.06,.06,1.1,10),m=new THREE.MeshStandardMaterial({color:0xd9d4c8,roughness:.6});
  for(let x=-40;x<=40;x+=10)for(const z of [-41.5,41.5]){const o=new THREE.Mesh(g,m);o.position.set(x,.55,z);o.castShadow=true;scene.add(o);}}

/* ---------- the three trucks ---------- */
const TRUCKS={game:{name:'Game'},studio:{name:'Studio'},baked:{name:'Baked'}};
function countTris(o){let n=0;o.traverse(m=>{if(m.isMesh)n+=m.geometry.index?m.geometry.index.count/3:m.geometry.attributes.position.count/3;});return n;}
function wheelPlace(D,b,front,s){const R=b.look.tyre.R,wb=D.uRa-D.uFa;return [front?D.X(D.uFa):D.X(D.uFa)-wb*Math.cos(D.pitch),front?R:D.Rr,s*(b.look.track/2)];}
function fromKit(hd,lod){K.setHD(hd);const T=K.studioBuild('stock',lod),b=T.b,g=new THREE.Group();
  g.add(meshes(T.body,'body',b),meshes(T.hood,'hood',b),meshes(T.hide,'hide',b));
  if(hd)for(const [nm,src] of Object.entries(T.hd||{}))if(src&&src.p)g.add(meshes(src,nm,b));
  const wheel=meshes(T.wheel,'wheel',b);return {body:g,wheel,D:T.D,b,ms:T.ms};}
/* the baked truck: its meshes unpacked (16-bit positions in a box, 8-bit normals, 16-bit picture coordinates) */
const b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0)).buffer;
function unpack(p){const qp=new Uint16Array(b64(p.P)),qn=new Int8Array(b64(p.N)),bx=p.box,n=p.v,P=new Float32Array(n*3),N=new Float32Array(n*3);
  for(let i=0;i<n;i++)for(let k=0;k<3;k++){P[i*3+k]=bx[k]+qp[i*3+k]/65535*bx[3+k];N[i*3+k]=qn[i*3+k]/127;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(P,3));g.setAttribute('normal',new THREE.BufferAttribute(N,3));
  if(p.U){const qu=new Uint16Array(b64(p.U)),U=new Float32Array(n*2);for(let i=0;i<n*2;i++)U[i]=qu[i]/65535;g.setAttribute('uv',new THREE.BufferAttribute(U,2));}
  g.setIndex(new THREE.BufferAttribute(p.i32?new Uint32Array(b64(p.I)):new Uint16Array(b64(p.I)),1));return g;}
function bakedMat(tag){const M=window.BAKED.maps,tx=(k,srgb)=>{const t=TL.load(M[tag+'_'+k]);t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.anisotropy=4;return t;};
  const orm=tx('orm',false),o={map:tx('col',true),normalMap:tx('nrm',false),normalMapType:THREE.ObjectSpaceNormalMap,aoMap:orm,aoMapIntensity:.65,roughnessMap:orm,metalnessMap:orm,roughness:1,metalness:1,side:THREE.DoubleSide};
  if(M[tag+'_coat'])Object.assign(o,{clearcoat:1,clearcoatMap:tx('coat',false),clearcoatRoughness:.03});
  return new THREE.MeshPhysicalMaterial(o);}
function fromBake(){const B=window.BAKED,P=B.parts,g=new THREE.Group();
  const skin=new THREE.Mesh(unpack(P.skin),bakedMat('skin'));const glass=new THREE.Mesh(unpack(P.glass),new THREE.MeshPhysicalMaterial({color:0x05070a,roughness:.02,metalness:0,clearcoat:1,side:THREE.DoubleSide}));
  const under=new THREE.Mesh(unpack(P.under),new THREE.MeshStandardMaterial({color:0x111112,roughness:.7,metalness:.3,side:THREE.DoubleSide}));
  for(const m of [skin,glass,under]){m.castShadow=m.receiveShadow=true;g.add(m);}
  const wheel=new THREE.Group(),wm=new THREE.Mesh(unpack(P.wheel),bakedMat('wheel'));wm.castShadow=wm.receiveShadow=true;wheel.add(wm);
  K.setHD(false);const T=K.studioBuild('stock',1);return {body:g,wheel,D:T.D,b:T.b,ms:0};}
const carRoot=new THREE.Group();carRoot.matrixAutoUpdate=false;scene.add(carRoot);
let cur=null;
function getTruck(k){const t=TRUCKS[k];if(t.body)return t;const t0=performance.now();
  const r=k==='game'?fromKit(false,1):k==='studio'?fromKit(true,.25):fromBake();Object.assign(t,r);
  t.root=new THREE.Group();t.root.add(t.body);t.wheels=[];
  for(const front of [1,0])for(const s of [1,-1]){const w=new THREE.Group();w.matrixAutoUpdate=false;w.add(t.wheels.length?t.wheel.clone():t.wheel);w.userData.s=s;t.root.add(w);t.wheels.push(w);}
  t.root.traverse(m=>{if(m.isMesh){m.castShadow=m.castShadow!==false;}});
  t.tris=countTris(t.root);t.buildMs=performance.now()-t0;return t;}
/* parked copies of the current truck (the "ten trucks" switch): what it would cost if every car were drawn this way */
const lot=new THREE.Group();scene.add(lot);let lotOn=false;
function fillLot(){lot.clear();if(!lotOn||!cur)return;for(let k=0;k<9;k++){const c=cur.root.clone(true);c.traverse(o=>{o.matrixAutoUpdate=true;});
  /* (a parked copy: its wheels where they sit at rest) */
  c.children.slice(1).forEach((w,i)=>{const front=i<2,s=w.userData.s,p=wheelPlace(cur.D,cur.b,front,s);w.matrixAutoUpdate=false;w.matrix.makeTranslation(p[0],p[1],p[2]).multiply(new THREE.Matrix4().makeScale(1,1,s));});
  c.position.set(-28+k*7,0,30);c.rotation.y=Math.PI/2;lot.add(c);}}
function setTruck(k){const t=getTruck(k);if(cur)carRoot.remove(cur.root);cur=t;carRoot.add(t.root);
  for(const b of document.querySelectorAll('#trucks button'))b.classList.toggle('on',b.dataset.k===k);fillLot();hud(true);}

/* ---------- the physics: the game's own, on this ground ---------- */
let car=null;const level={i:0,ids:['middle','real','kids']};
function spawn(){car=DR.makeCar(DR.stock,world);car.setAssists(level.ids[level.i]);car.place([0,groundY(0,0)+.6,0],0);car.pt.start();}
spawn();
const IN={steer:0,thr:0,brk:0,hb:0,keys:new Set(),touch:{l:0,r:0,g:0,b:0,h:0}};
addEventListener('keydown',e=>{IN.keys.add(e.code);if(e.code==='KeyR')spawn();if(e.code==='KeyC')toggleCam();if(e.code==='Digit1')setTruck('game');if(e.code==='Digit2')setTruck('studio');if(e.code==='Digit3')setTruck('baked');
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();});
addEventListener('keyup',e=>IN.keys.delete(e.code));
for(const [id,k] of [['tl','l'],['tr','r'],['tg','g'],['tb','b'],['th','h']]){const el=$(id);if(!el)continue;
  const on=v=>e=>{e.preventDefault();IN.touch[k]=v;el.classList.toggle('on',!!v);};el.addEventListener('pointerdown',on(1));el.addEventListener('pointerup',on(0));el.addEventListener('pointercancel',on(0));el.addEventListener('pointerleave',on(0));}
const has=c=>IN.keys.has(c);
function input(dt){const T=IN.touch,tgt=((has('ArrowRight')||has('KeyD')||T.r)?1:0)-((has('ArrowLeft')||has('KeyA')||T.l)?1:0),rate=tgt===0?6:Math.sign(tgt)!==Math.sign(IN.steer)&&IN.steer!==0?8:3.2;
  IN.steer+=THREE.MathUtils.clamp(tgt-IN.steer,-rate*dt,rate*dt);
  const g=(has('ArrowUp')||has('KeyW')||T.g)?1:0,b=(has('ArrowDown')||has('KeyS')||T.b)?1:0;
  IN.thr+=THREE.MathUtils.clamp(g-IN.thr,-8*dt,6*dt);IN.brk+=THREE.MathUtils.clamp(b-IN.brk,-10*dt,8*dt);
  return {steer:IN.steer,thr:IN.thr,brk:IN.brk,hb:(has('Space')||T.h)?1:0,nos:false,lock:false};}

/* ---------- the camera: behind the truck, or free round it ---------- */
const orbit=new OrbitControls(camera,cv);orbit.enabled=false;orbit.enableDamping=true;orbit.maxPolarAngle=Math.PI*.495;orbit.minDistance=2;orbit.maxDistance=40;
let camMode='chase';const chase={p:new THREE.Vector3(-8,3,0),l:new THREE.Vector3()};
function toggleCam(){camMode=camMode==='chase'?'look':'chase';orbit.enabled=camMode==='look';$('cam').textContent=camMode==='chase'?'Chase':'Look';
  if(camMode==='look'){orbit.target.copy(chase.l);}}
const tmpM=new THREE.Matrix4(),cgM=new THREE.Matrix4(),CP=new THREE.Vector3(),FW=new THREE.Vector3();
function place(){const M=car.M,p=car.p,cg=car.cg;
  tmpM.set(M[0],M[1],M[2],p[0],M[3],M[4],M[5],p[1],M[6],M[7],M[8],p[2],0,0,0,1);cgM.makeTranslation(-cg[0],-cg[1],0);carRoot.matrix.multiplyMatrices(tmpM,cgM);carRoot.matrixWorldNeedsUpdate=true;
  if(!cur)return;car.wheels.forEach((w,k)=>{const W=cur.wheels[k];if(!W)return;const s=w.hp[2]<0?-1:1,st=w.front?car.steer:0;
    const x=w.hp[0]+cg[0],y=w.hp[1]-w.len+cg[1],z=w.hp[2];
    W.matrix.makeTranslation(x,y,z).multiply(new THREE.Matrix4().makeRotationY(-st)).multiply(new THREE.Matrix4().makeScale(1,1,s)).multiply(new THREE.Matrix4().makeRotationZ(-w.ang));});}
function camStep(dt){CP.set(car.p[0],car.p[1],car.p[2]);FW.set(car.M[0],0,car.M[6]);if(FW.lengthSq()<1e-4)FW.set(1,0,0);FW.normalize();
  const want=CP.clone().addScaledVector(FW,-7.2).add(new THREE.Vector3(0,2.3,0)),k=1-Math.exp(-dt*4);chase.p.lerp(want,k);chase.l.lerp(CP.clone().add(new THREE.Vector3(0,.9,0)),1-Math.exp(-dt*10));
  if(camMode==='chase'){camera.position.copy(chase.p);camera.lookAt(chase.l);}else{orbit.target.lerp(chase.l,1-Math.exp(-dt*8));orbit.update();}
  /* the sun's shadow follows the truck */
  sun.position.copy(CP).addScaledVector(SUN,30);sun.target.position.copy(CP);}

/* ---------- the cost: frames a second, the frame's time, the GPU's own time where the browser tells it ---------- */
const gl=renderer.getContext(),TQ=gl.getExtension('EXT_disjoint_timer_query_webgl2');
const GPU=(()=>{const e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):'(the browser does not say)';})();
const PERF={frames:0,t0:performance.now(),fps:0,ms:0,gpu:null,gpuS:[],dts:[],queries:[]};
function gpuBegin(){if(!TQ)return null;const q=gl.createQuery();gl.beginQuery(TQ.TIME_ELAPSED_EXT,q);return q;}
function gpuEnd(q){if(!q)return;gl.endQuery(TQ.TIME_ELAPSED_EXT);PERF.queries.push(q);
  while(PERF.queries.length){const o=PERF.queries[0];if(!gl.getQueryParameter(o,gl.QUERY_RESULT_AVAILABLE))break;PERF.queries.shift();
    if(!gl.getParameter(TQ.GPU_DISJOINT_EXT)){const ms=gl.getQueryParameter(o,gl.QUERY_RESULT)/1e6;PERF.gpuS.push(ms);if(PERF.gpuS.length>60)PERF.gpuS.shift();PERF.gpu=PERF.gpuS.reduce((a,b)=>a+b,0)/PERF.gpuS.length;}gl.deleteQuery(o);}}
function hud(force){const now=performance.now();if(!force&&now-PERF.t0<500)return;const dt=(now-PERF.t0)/1000;PERF.fps=PERF.frames/dt;PERF.ms=1000/Math.max(PERF.fps,1e-3);PERF.frames=0;PERF.t0=now;
  const i=renderer.info.render;$('perf').innerHTML=`<b>${cur?cur.name:''}</b> · ${Math.round(cur?cur.tris:0).toLocaleString('en-US')} triangles in the truck${lotOn?' (×10)':''}<br>`+
    `${PERF.fps.toFixed(0)} fps · ${PERF.ms.toFixed(1)} ms a frame${PERF.gpu!=null?` · GPU ${PERF.gpu.toFixed(2)} ms`:''}<br>${i.triangles.toLocaleString('en-US')} triangles drawn · ${i.calls} draw calls<br><span class=dim>${GPU}</span>`;
  $('speed').textContent=car?Math.round(car.speed*2.237)+' mph':'';}

/* ---------- the benchmark: each truck in turn, the same drive, the numbers side by side ---------- */
let BENCH=null;
function benchStart(){if(BENCH)return;BENCH={order:['game','studio','baked'],i:0,t:0,res:[],phase:'warm'};$('bench').classList.add('on');spawn();setTruck(BENCH.order[0]);camMode='chase';orbit.enabled=false;}
function benchStep(dt,frameMs){const B=BENCH;B.t+=dt;
  if(B.phase==='warm'&&B.t>1.5){B.phase='run';B.t=0;B.f=[];B.g=[];PERF.gpuS=[];}
  else if(B.phase==='run'){B.f.push(frameMs);if(PERF.gpu!=null)B.g.push(PERF.gpu);
    if(B.t>6){const f=B.f.slice().sort((a,b)=>a-b),avg=B.f.reduce((a,b)=>a+b,0)/B.f.length,p95=f[Math.floor(f.length*.95)];
      B.res.push({k:B.order[B.i],name:TRUCKS[B.order[B.i]].name,tris:cur.tris,fps:1000/avg,ms:avg,p95,gpu:B.g.length?B.g.reduce((a,b)=>a+b,0)/B.g.length:null});
      B.i++;if(B.i>=B.order.length){benchShow(B.res);BENCH=null;$('bench').classList.remove('on');return;}
      spawn();setTruck(B.order[B.i]);B.phase='warm';B.t=0;}}}
function benchShow(R){const rows=R.map(r=>`<tr><td>${r.name}</td><td>${Math.round(r.tris).toLocaleString('en-US')}</td><td>${r.fps.toFixed(0)}</td><td>${r.ms.toFixed(1)}</td><td>${r.p95.toFixed(1)}</td><td>${r.gpu!=null?r.gpu.toFixed(2):'–'}</td></tr>`).join('');
  $('results').innerHTML=`<h3>Benchmark${lotOn?' · ten trucks':''}</h3><table><tr><th>Truck</th><th>Triangles</th><th>FPS</th><th>ms avg</th><th>ms slowest 5%</th><th>GPU ms</th></tr>${rows}</table>`+
    `<p class=dim>Six seconds each, the same circle at the same speed. A screen that shows 60 frames a second can't show more, so on a fast machine the GPU column is the one that tells them apart.</p><button id=rclose>Close</button>`;
  $('results').hidden=false;$('rclose').onclick=()=>{$('results').hidden=true;};window.BENCH_RESULT=R;}

/* ---------- the loop ---------- */
let acc=0,last=performance.now(),held=false;const STEP=1/240;
function frame(now){const dt=Math.min(.1,(now-last)/1000),frameMs=now-last;last=now;
  let inp=input(dt);if(BENCH)inp={steer:.42,thr:car.speed<11?.6:.15,brk:0,hb:0,nos:false,lock:false};
  acc+=dt;let n=0;while(acc>=STEP&&n<30){car.step(STEP,inp);acc-=STEP;n++;}if(n>=30)acc=0;
  if(Math.abs(car.p[0])>BOUND-5||Math.abs(car.p[2])>BOUND-5||car.p[1]<-20)spawn();
  place();camStep(dt);
  const q=gpuBegin();renderer.render(scene,camera);gpuEnd(q);
  PERF.frames++;hud(false);if(BENCH)benchStep(dt,frameMs);}
function loop(now){if(!held)frame(now);requestAnimationFrame(loop);}
function resize(){const w=cv.clientWidth,h=cv.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<h?70:55;camera.updateProjectionMatrix();}
addEventListener('resize',resize);resize();

/* ---------- the buttons ---------- */
document.querySelectorAll('#trucks button').forEach(b=>b.onclick=()=>{$('loading').hidden=false;setTimeout(()=>{setTruck(b.dataset.k);$('loading').hidden=true;},30);});
$('cam').onclick=toggleCam;$('reset').onclick=spawn;$('bench').onclick=()=>{$('loading').hidden=false;setTimeout(()=>{for(const k of ['studio','baked'])getTruck(k);$('loading').hidden=true;benchStart();},30);};
$('lot').onclick=()=>{lotOn=!lotOn;$('lot').classList.toggle('on',lotOn);fillLot();};
$('level').onclick=()=>{level.i=(level.i+1)%level.ids.length;car.setAssists(level.ids[level.i]);$('level').textContent=DR.ASSISTS[level.ids[level.i]].name;};
if(PHONE)document.body.classList.add('touch');
setTruck(Q.get('truck')||'game');$('loading').hidden=true;
window.SUV={_view:null,THREE,scene,camera,renderer,setTruck,getTruck,TRUCKS,spawn,benchStart,get car(){return car;},hold(h){held=h;},
  step(t,inp){/* (the tools' drive: t seconds of the given input, then a frame) */const n=Math.round(t/STEP);for(let i=0;i<n;i++)car.step(STEP,inp||{steer:0,thr:0,brk:0,hb:0});place();camStep(1);},
  /* (a fixed camera for the tools: offset from the truck in its own axes, looking at a point on it) */
  view(off,at){SUV._view={off,at};},
  snap(){place();camStep(.05);const V=SUV._view;if(V){const m=carRoot.matrix,o=new THREE.Vector3(...V.off).applyMatrix4(m),a=new THREE.Vector3(...V.at).applyMatrix4(m);camera.position.copy(o);camera.lookAt(a);}
    renderer.render(scene,camera);return cv.toDataURL('image/png');},lot(v){lotOn=v;fillLot();},PERF,GPU,toggleCam};
requestAnimationFrame(loop);
