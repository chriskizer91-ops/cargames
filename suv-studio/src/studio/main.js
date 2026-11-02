/* =====================================================================================
   THE STUDIO: the truck alone on a plain backdrop, lit like a product shot. The geometry is the game's
   own (built by window.KIT from src/game and src/hd); this file only gives each of the game's material
   ids a physically based material and draws them with soft shadows and studio reflections.
   ===================================================================================== */
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

const K=window.KIT,MAT=K.MAT,SM=K.SM,Q=new URLSearchParams(location.search);
const BUILD=Q.get('build')||'stock',LOD=+(Q.get('lod')||.25);
const cv=document.getElementById('cv');
const renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
/* (a phone: a little under full sharpness and a smaller shadow map, so it turns smoothly) */
const PHONE=matchMedia('(hover: none)').matches;
renderer.setPixelRatio(Math.min(devicePixelRatio,PHONE?1.5:2));
renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1.0;
renderer.shadowMap.enabled=Q.get('shadow')!=='0';renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(28,1,.05,200);
const controls=new OrbitControls(camera,cv);controls.enableDamping=true;controls.target.set(0,.82,0);
controls.minDistance=1.2;controls.maxDistance=18;controls.maxPolarAngle=Math.PI*.497;

/* ---------- the backdrop: a plain colour, a floor that only shows the car's shadow ---------- */
const BACK={light:{bg:'#e6e5e2',sh:.34,env:1,key:1.8},dark:{bg:'#17181b',sh:.55,env:.8,key:1.4}};
let back=Q.get('back')||'light';
const pmrem=new THREE.PMREMGenerator(renderer);
/* the reflections: a photo studio made of light. A grey dome (light floor, darker walls, a soft ceiling), a long
   soft box overhead, two tall strips either side, a broad box in front and a dimmer one behind. Its long clean
   highlights are what read as paint on the body. */
function studioEnvScene(){const s=new THREE.Scene(),g=new THREE.SphereGeometry(40,64,32),c=[];
  const P=g.attributes.position;for(let i=0;i<P.count;i++){const y=P.getY(i)/40,v=y>0?.12+.06*y:.12+(.22-.12)*Math.min(1,-y*4);c.push(v,v,v*.98);}
  g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));s.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide})));
  const box=(w,h,pos,look,k,tint=[1,1,1])=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
    m.material.color.setRGB(k*tint[0],k*tint[1],k*tint[2]);m.position.set(...pos);m.lookAt(...look);s.add(m);};
  box(14,4.5,[0,12,0],[0,0,0],9);
  for(const z of [-11,11])box(1.6,9,[1.5,5,z],[0,1,0],6);
  box(7,5,[13,5,3],[0,1,0],3.2,[1,.97,.93]);box(7,4,[-13,5,-2],[0,1,0],2.2,[.92,.96,1]);
  box(30,.5,[0,.25,-16],[0,0,0],1.2);
  return s;}
const envTex=pmrem.fromScene(Q.get('env')==='room'?new RoomEnvironment():studioEnvScene(),.02).texture;
scene.environment=envTex;
const floor=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.ShadowMaterial({opacity:.32}));
floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
/* a soft dark pool under the body: the light the floor can't get to under a car (contact shadow) */
const pool=(()=>{const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),gr=g.createRadialGradient(128,128,10,128,128,128);
  gr.addColorStop(0,'rgba(0,0,0,.55)');gr.addColorStop(.55,'rgba(0,0,0,.28)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,256,256);
  const t=new THREE.CanvasTexture(c);const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false}));
  m.rotation.x=-Math.PI/2;m.position.y=.002;m.renderOrder=-1;return m;})();
scene.add(pool);
const key=new THREE.DirectionalLight(0xffffff,2.6);key.position.set(3.2,7.5,2.4);key.castShadow=true;
key.shadow.mapSize.set(PHONE?2048:4096,PHONE?2048:4096);key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=4;key.shadow.camera.bottom=-4;
key.shadow.camera.near=1;key.shadow.camera.far=20;key.shadow.radius=6;key.shadow.blurSamples=16;key.shadow.bias=-.0004;key.shadow.normalBias=.02;
scene.add(key);scene.add(key.target);
const rim=new THREE.DirectionalLight(0xdfe8ff,.7);rim.position.set(-6,3,-4);scene.add(rim);

/* ---------- the materials: the game's ids, as physically based surfaces ---------- */
/* a fine grain for textured plastic and tyre rubber: a tiling normal map made here */
function grainMap(n,amp,seed){const c=document.createElement('canvas');c.width=c.height=n;const g=c.getContext('2d'),im=g.createImageData(n,n);
  let s=seed;const r=()=>{s=(s*16807)%2147483647;return s/2147483647;};const h=new Float32Array(n*n);for(let i=0;i<n*n;i++)h[i]=r();
  /* blur once so the grain is pebbly, not pixel noise */
  const b=new Float32Array(n*n);for(let y=0;y<n;y++)for(let x=0;x<n;x++){let t=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)t+=h[((y+dy+n)%n)*n+(x+dx+n)%n];b[y*n+x]=t/9;}
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=y*n+x,dx=b[y*n+(x+1)%n]-b[y*n+(x-1+n)%n],dy=b[((y+1)%n)*n+x]-b[((y-1+n)%n)*n+x];
    const nx=-dx*amp,ny=-dy*amp,l=Math.hypot(nx,ny,1);im.data[i*4]=(nx/l*.5+.5)*255;im.data[i*4+1]=(ny/l*.5+.5)*255;im.data[i*4+2]=(1/l*.5+.5)*255;im.data[i*4+3]=255;}
  g.putImageData(im,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.NoColorSpace;return t;}
const GRAIN=grainMap(256,6,7);GRAIN.repeat.set(1,1);
const col=h=>new THREE.Color(h);
let B=null;
/* (the game draws every face from both sides: its builders do not keep one winding) */
const P=(o)=>new THREE.MeshPhysicalMaterial({side:THREE.DoubleSide,...o});
/* the cabin's surfaces see little of the studio's light through the glass: their share of the reflections and the
   room's light is cut (a stand-in for the occlusion a closed cabin has) */
const INSIDE=new Set();
function matFor(id,em,b){const m=matFor0(id,em,b);if(INSIDE.has(id)){m.envMapIntensity=.32;}return m;}
function matFor0(id,em,b){
  const vc={vertexColors:true};
  switch(id){
    case MAT.PAINT:return P({color:col(b.paint),metalness:.1,roughness:.5,clearcoat:1,clearcoatRoughness:.03});
    case MAT.ACCENT:return P({color:col(b.paint2),metalness:.22,roughness:.42,clearcoat:1,clearcoatRoughness:.03});
    case MAT.GLASS:return P({color:col('#05070a'),metalness:0,roughness:.02,transparent:true,opacity:.72,depthWrite:false,envMapIntensity:1.4,specularIntensity:1});
    case MAT.GLASSL:return P({color:col('#0a0e12'),metalness:0,roughness:.02,transparent:true,opacity:.42,depthWrite:false,envMapIntensity:1.4,specularIntensity:1});
    case MAT.CHROME:return P({color:col('#f1f2f4'),metalness:1,roughness:.045});
    case MAT.TYRE:return P({color:col('#1b1b1d'),roughness:.88,normalMap:GRAIN,normalScale:new THREE.Vector2(.25,.25)});
    case MAT.TAIL:return P({color:col('#7a0a06'),roughness:.08,metalness:.1,clearcoat:1,clearcoatRoughness:.02,emissive:col('#ff1206'),emissiveIntensity:.05});
    case MAT.HEAD:return P({color:col('#d8dce0'),metalness:.95,roughness:.07,clearcoat:1,clearcoatRoughness:.01});
    case MAT.LED:return P({color:col('#ffffff'),emissive:col('#dfe8ff'),emissiveIntensity:1.2});
    case MAT.AMBER:return P({color:col('#c9661c'),roughness:.08,metalness:.15,clearcoat:1,clearcoatRoughness:.02,emissive:col('#ff7a10'),emissiveIntensity:.04});
    case MAT.MESH:return P({color:col('#0c0c0d'),roughness:.55,metalness:.2});
    case MAT.RIM:return P({color:col(b.rim),metalness:1,roughness:.22});
    case MAT.CLAD:return P({color:col(b.clad),roughness:.74,normalMap:GRAIN,normalScale:new THREE.Vector2(.25,.25)});
    case MAT.SHUT:return P({color:col('#0a0a0a'),roughness:.7});
    case MAT.EMIT:return P({...vc,emissive:col('#ffffff'),emissiveIntensity:1});
    case MAT.METAL:return P({...vc,metalness:.55,roughness:.45});
    case MAT.CARBON:return P({color:col('#151517'),roughness:.25,clearcoat:.8});
    case MAT.LOUVRE:return P({color:col('#101012'),roughness:.6});
    case MAT.CALIPER:return P({color:col(b.cal),roughness:.35,metalness:.2,clearcoat:.6});
    case MAT.ROTOR:return P({color:col('#7a7a7e'),metalness:.9,roughness:.32});
    case MAT.PLATE:return P({color:col('#d9d8cf'),roughness:.4,metalness:.1});
    case MAT.REV:return P({color:col('#e6e8ea'),metalness:.9,roughness:.06,clearcoat:1});
    case MAT.SMOKE:return P({color:col('#0b0a09'),roughness:.05,clearcoat:1});
    case MAT.REFL:return P({color:col('#9a8a76'),metalness:1,roughness:.25});
    case MAT.FABRIC:return P({...vc,roughness:1,sheen:.6,sheenRoughness:.8});
    case MAT.RUBBER:return P({...vc,roughness:.85});
    case MAT.HALO:return P({color:col('#ffffff'),emissive:col('#cfe0ff'),emissiveIntensity:.8});
    /* the studio's own (src/hd/70_geo SM) */
    case SM.LENS:return P({color:col('#ffffff'),metalness:0,roughness:.01,transmission:1,thickness:.004,ior:1.49,transparent:true,depthWrite:false,envMapIntensity:1.2});
    case SM.BULB:return P({color:col('#fffaf0'),emissive:col('#fff3dc'),emissiveIntensity:.25,roughness:.1});
    case SM.GLOSSBLK:return P({...vc,roughness:.12,clearcoat:1,clearcoatRoughness:.05});
    case SM.VINYL:return P({...vc,roughness:.62,normalMap:GRAIN,normalScale:new THREE.Vector2(.15,.15)});
    case SM.CARPET:return P({...vc,roughness:1,sheen:1,sheenRoughness:.9,sheenColor:col('#555'),normalMap:GRAIN,normalScale:new THREE.Vector2(1.2,1.2)});
    case SM.DASH:return P({...vc,roughness:.75,normalMap:GRAIN,normalScale:new THREE.Vector2(.35,.35)});
    case SM.TREAD:return P({...vc,roughness:.92,normalMap:GRAIN,normalScale:new THREE.Vector2(.4,.4)});
    case SM.WALL:return P({...vc,roughness:.78,normalMap:GRAIN,normalScale:new THREE.Vector2(.12,.12)});
    case SM.BRUSH:return P({...vc,metalness:1,roughness:.16});
    case SM.LUG:return P({color:col('#eceef0'),metalness:1,roughness:.06});
    case SM.ROTORF:return P({...vc,metalness:.85,roughness:.38});
    case SM.REFLC:return P({color:col('#f4f5f6'),metalness:1,roughness:.04});
    case SM.AMBERL:return P({color:col('#ff8a1e'),metalness:0,roughness:.02,transmission:.75,thickness:.004,ior:1.49,transparent:true,depthWrite:false,attenuationColor:col('#ff7a00'),attenuationDistance:.006});
    case SM.REDL:return P({color:col('#d0160c'),metalness:0,roughness:.03,transmission:.55,thickness:.005,ior:1.49,transparent:true,depthWrite:false,attenuationColor:col('#c00a04'),attenuationDistance:.004});
    case SM.SEAT:return P({...vc,roughness:.9,sheen:.5,sheenRoughness:.7,sheenColor:col('#666'),normalMap:GRAIN,normalScale:new THREE.Vector2(.6,.6)});
    case SM.HEADLINER:return P({...vc,roughness:1,sheen:.4,sheenRoughness:.9});
    case SM.GAUGE:return P({...vc,roughness:.3,emissive:col('#ffffff'),emissiveIntensity:0});
    case SM.SATIN:return P({...vc,metalness:.8,roughness:.32});
    case SM.BOLT:return P({...vc,metalness:1,roughness:.3});
    case SM.SEAL:return P({...vc,roughness:.7});
    case SM.MIRROR:return P({color:col('#ffffff'),metalness:1,roughness:.0});
    case SM.TINT:return P({color:col('#000000'),metalness:0,roughness:.03,transparent:true,opacity:.6,depthWrite:false});
    case SM.HONEY:return P({...vc,roughness:.35,clearcoat:.5});
    case SM.CAST:return P({...vc,metalness:.7,roughness:.55});
    case SM.CLADS:return P({color:col(b.clad),roughness:.72});
    case SM.LINER:return P({...vc,roughness:.8,normalMap:GRAIN,normalScale:new THREE.Vector2(.4,.4)});
    default:return P({...vc,roughness:.55,...(em>0?{emissive:col('#ffffff'),emissiveIntensity:1}:{})});
  }
}
/* one builder's flat arrays as a set of meshes, one per material (so glass sorts after everything solid) */
function meshes(src,name,b){
  const P=src.p,N=src.n,C=src.c,M=src.m,nt=P.length/9,by=new Map();
  for(let t=0;t<nt;t++){const id=M[t*3]|0,em=C[t*12+3]>0?1:0,k=id*2+em;let a=by.get(k);if(!a)by.set(k,a=[]);a.push(t);}
  const g=new THREE.Group();g.name=name;
  for(const [k,ts] of by){const id=k>>1,em=k&1,n=ts.length,pp=new Float32Array(n*9),nn=new Float32Array(n*9),cc=new Float32Array(n*9);
    for(let i=0;i<n;i++){const t=ts[i],o=t*9;
      /* the game keeps no one winding (its two sides are mirrored in the same order): each triangle is turned so its own
         facing agrees with its normals, or a double-sided material, taking it as seen from behind, would light it from
         the inside */
      const ux=P[o+3]-P[o],uy=P[o+4]-P[o+1],uz=P[o+5]-P[o+2],vx=P[o+6]-P[o],vy=P[o+7]-P[o+1],vz=P[o+8]-P[o+2],
        gx=uy*vz-uz*vy,gy=uz*vx-ux*vz,gz=ux*vy-uy*vx,ok=gx*(N[o]+N[o+3]+N[o+6])+gy*(N[o+1]+N[o+4]+N[o+7])+gz*(N[o+2]+N[o+5]+N[o+8])>=0,ord=ok?[0,1,2]:[0,2,1];
      for(let v=0;v<3;v++){const s=ord[v];for(let k=0;k<3;k++){pp[i*9+v*3+k]=P[o+s*3+k];nn[i*9+v*3+k]=N[o+s*3+k];cc[i*9+v*3+k]=C[t*12+s*4+k];}}}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pp,3));geo.setAttribute('normal',new THREE.BufferAttribute(nn,3));geo.setAttribute('color',new THREE.BufferAttribute(cc,3));
    if(MAT_UV[id])addUV(geo,MAT_UV[id]);
    const m=new THREE.Mesh(geo,matFor(id,em,b));m.castShadow=!(id===MAT.GLASS||id===MAT.GLASSL);m.receiveShadow=id!==SM.LINER;m.userData.mat=id;g.add(m);}
  return g;
}
/* a box projection for the grain maps (textured plastic, rubber): metres times k */
const MAT_UV={};for(const k of ['VINYL','CARPET','DASH','SEAT','HEADLINER','GAUGE'])INSIDE.add(SM[k]);MAT_UV[MAT.CLAD]=18;MAT_UV[MAT.TYRE]=30;
for(const [k,v] of [['LINER',24],['TREAD',40],['WALL',36],['VINYL',14],['CARPET',30],['DASH',20],['SEAT',16]])MAT_UV[SM[k]]=v;
function addUV(geo,k){const p=geo.attributes.position.array,n=geo.attributes.normal.array,uv=new Float32Array(p.length/3*2);
  for(let i=0;i<p.length/3;i++){const ax=Math.abs(n[i*3]),ay=Math.abs(n[i*3+1]),az=Math.abs(n[i*3+2]);let u,v;
    if(ax>=ay&&ax>=az){u=p[i*3+2];v=p[i*3+1];}else if(ay>=az){u=p[i*3];v=p[i*3+2];}else{u=p[i*3];v=p[i*3+1];}uv[i*2]=u*k;uv[i*2+1]=v*k;}
  geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));}

/* ---------- the truck ---------- */
const car=new THREE.Group();scene.add(car);
let T=null,hoodG=null,hideG=null,bayG=null,stats={tris:0,ms:0};
function countTris(o){let n=0;o.traverse(m=>{if(m.isMesh)n+=m.geometry.attributes.position.count/3;});return n;}
function build(){
  car.clear();T=K.studioBuild(BUILD,LOD);B=T.b;const D=T.D,b=B;
  car.add(meshes(T.body,'body',b));hoodG=meshes(T.hood,'hood',b);car.add(hoodG);hideG=meshes(T.hide,'hide',b);car.add(hideG);
  /* the engine bay, shown with the hood up */
  bayG=new THREE.Group();bayG.add(meshes(T.bay.bay,'bay',b));bayG.add(meshes(T.bay.engine,'engine',b));const ln=meshes(T.bay.liner,'liner',b);hoodG.add(ln);bayG.visible=false;car.add(bayG);
  /* the four wheels: the right ones as built (face at +z), the left mirrored */
  const fx=D.X(D.uFa),R=b.look.tyre.R,wb=D.uRa-D.uFa;
  for(const front of [1,0])for(const s of [1,-1]){const w=meshes(front?T.wheel:T.wheelR,'wheel',b),x=front?fx:fx-wb*Math.cos(D.pitch),tw=(front?b.look.track:b.look.trackR||b.look.track)/2;
    w.position.set(x,front?R:D.Rr,s*tw);w.scale.set(1,1,s);car.add(w);}
  for(const sp of D.spares||[]){const w=meshes(sp.rear?T.wheelR:T.wheel,'spare',b);w.position.set(sp.p[0],sp.p[1],sp.p[2]);if(sp.face==='back')w.rotation.y=-Math.PI/2;else if(sp.p[2]<0)w.scale.z=-1;car.add(w);}
  /* the studio's own detail (src/hd), already in the car's coordinates */
  const HIDE=(Q.get('hide')||'').split(',');
  for(const [name,src] of Object.entries(T.hd||{}))if(src&&src.p&&!HIDE.includes(name))car.add(meshes(src,name,b));
  pool.scale.set(D.L*1.08,1,2.25);
  stats={tris:countTris(car),ms:T.ms};hud();
}
/* the hood swings up about its hinge at the cowl */
let hoodA=0,hoodT=0;
function setHood(open){hoodT=open?1:0;}
function hoodStep(){if(!T)return;const d=hoodT-hoodA;if(Math.abs(d)<1e-3){hoodA=hoodT;}else hoodA+=d*.12;
  const [hx,hy]=T.D.hood.hinge,a=(hoodA*hoodA*(3-2*hoodA))*1.0;
  hoodG.position.set(0,0,0);hoodG.rotation.set(0,0,0);hoodG.updateMatrix();
  const M=new THREE.Matrix4().makeTranslation(hx,hy,0).multiply(new THREE.Matrix4().makeRotationZ(a)).multiply(new THREE.Matrix4().makeTranslation(-hx,-hy,0));
  hoodG.matrixAutoUpdate=false;hoodG.matrix.copy(M);bayG.visible=hoodA>.001;hideG.visible=hoodA<=.001;}

/* ---------- views ---------- */
const VIEWS={
  front34:{p:[5.6,1.55,4.6],t:[.15,.8,0]},rear34:{p:[-5.4,1.7,4.8],t:[-.1,.85,0]},side:{p:[0,1.0,8.2],t:[0,.85,0]},
  front:{p:[8.2,1.0,0],t:[0,.8,0]},rear:{p:[-8.2,1.1,0],t:[0,.85,0]},top:{p:[.01,9.5,0],t:[0,.6,0]},
  wheel:{p:[2.6,.55,2.35],t:[1.36,.4,.8]},lamp:{p:[3.9,1.0,1.55],t:[2.35,.88,.55]},tail:{p:[-3.6,1.15,1.6],t:[-2.35,1.0,.6]},
  low:{p:[4.4,.25,3.4],t:[0,.55,0]},rglass:{p:[-3.9,2.1,2.4],t:[-2.25,1.5,.6]},cabin:{p:[1.6,1.75,2.2],t:[-.2,1.05,0]},bay:{p:[3.9,2.4,1.6],t:[1.45,.95,0]}
};
function setView(v){const V=VIEWS[v]||VIEWS.front34;camera.position.set(...V.p);controls.target.set(...V.t);controls.update();}
function resize(){const w=cv.clientWidth,h=cv.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;
  /* a tall phone frames the car by its width: pull back so it fits */
  camera.updateProjectionMatrix();}
function setBack(k){back=k;const S=BACK[k];scene.background=new THREE.Color(S.bg);floor.material.opacity=S.sh;scene.environmentIntensity=S.env;key.intensity=S.key;
  document.body.dataset.back=k;}
function setPaint(h){B.paint=h;car.traverse(m=>{if(m.isMesh&&m.userData.mat===MAT.PAINT)m.material.color.set(h);});}
function hud(){const el=document.getElementById('stats');if(el)el.textContent=`${Math.round(stats.tris).toLocaleString('en-US')} triangles · built in ${Math.round(stats.ms)} ms`;}

/* ---------- the loop (held by the screenshot tool) ---------- */
let held=false;
function frame(){hoodStep();controls.update();renderer.render(scene,camera);}
function loop(){if(!held)frame();requestAnimationFrame(loop);}
addEventListener('resize',resize);
setBack(back);build();resize();setView(Q.get('view')||'front34');loop();
window.STUDIO={THREE,scene,camera,controls,renderer,car,setView,setBack,setPaint,setHood,build,
  hold(h){held=h;},snap(){frame();return cv.toDataURL('image/png');},settle(){hoodA=hoodT;hoodStep();},stats:()=>stats,VIEWS};

/* ---------- the controls ---------- */
const $=id=>document.getElementById(id);
$('views').addEventListener('click',e=>{const v=e.target.dataset.v;if(v)setView(v);});
$('back').addEventListener('click',()=>setBack(back==='light'?'dark':'light'));
$('hood').addEventListener('click',()=>{setHood(hoodT<.5);$('hood').classList.toggle('on',hoodT>.5);});
const sw=$('paints');for(const [n,h] of K.PAINTS){const b=document.createElement('button');b.className='sw';b.style.background=h;b.title=n;b.onclick=()=>setPaint(h);sw.appendChild(b);}
document.getElementById('loading').hidden=true;
