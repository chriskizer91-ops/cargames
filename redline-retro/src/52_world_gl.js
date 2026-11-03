/* =====================================================================================
   THE WORLD THROUGH THE RENDERER. Shiftlight 3's renderer (11_sl3) draws no world of its own here: everything the
   streamed world has (51_world: the far tiles to the horizon, the chunks round the car at their levels of detail,
   the roads lying on the ground like paint, the buildings, poles and stands, the trees instanced) comes through LAND,
   the hook it calls for each pass: the sun's cascades and the headlights' shadow map (shadow), the reflection probe
   at the car (probe), the scene (opaque). Each draws with this game's own programs (13_lit's rutShaders) in the
   renderer's lighting, in the renderer's frame: relative to the floating origin. The culling is the world's own
   (its boxes are in world coordinates: each pass's matrix is taken back to the world for it).
   These meshes are two-sided (the shader turns each normal to face the eye), so the hooks switch off the back-face
   culling the renderer switches on before it calls them.
   ===================================================================================== */
const DEBUG_VIEW=new URLSearchParams(location.search).get('debug')||null;
/* the land's programs: the lit pass, the cheaper one the probe sees, and the depth pass for the shadow maps */
let P_LAND=null,P_LANDP=null,P_DEPTH=null;
/* how the land's lit programs are built: half-precision lighting (11_sl3's HALF: Mobile by default; Dev: Half-precision
   lighting) and the lean ground (13_lit's LEAN_D, the fine detail left out: Mobile and Low by default; Dev: Lean ground).
   LEAN_N (the colour noise in two layers) is only for the tools: timed here it never paid, on its own or with LEAN_D.
   ?lean=d, n, dn or off overrides the Dev choice, for the tools. And the
   lighting's two shortcuts (11_sl3: a pixel past both headlamps' reach, or past the last shadow cascade, skips their
   sums: the same picture), which Dev: Lighting shortcuts turns off (NO_SKIP), to see on the phone whether they pay */
const halfOn=()=>DEVW.half==='on'||DEVW.half!=='off'&&GFX.level==='mobile';
let LEAN_Q=new URLSearchParams(location.search).get('lean');
/* what the lit program in use was built with, for the readouts: LEAN, HALF, NOSKIP */
const landTag=()=>P_LAND&&P_LAND.defs?(P_LAND.defs.LEAN_D||P_LAND.defs.LEAN_N?'  LEAN':'')+(P_LAND.defs.HALF?'  HALF':'')+(P_LAND.defs.NO_SKIP?'  NOSKIP':''):'';
const leanOn=()=>DEVW.lean==='on'||DEVW.lean!=='off'&&(GFX.level==='mobile'||GFX.level==='low');
/* (Redline Retro: the ground always lean, no fine detail and the colour noise in two layers; the town's lamps a pixel
   sums at most RETRO_LAMPS of, by tier: 11_retro's QUALITY) */
function landDefs(){const d={LEAN_D:1,LEAN_N:1,RETRO_LAMPS:(R&&R.Q.lamps)||8};if(DEVW.skip==='off')d.NO_SKIP=1;
  const L=LEAN_Q?(LEAN_Q==='off'?'':LEAN_Q):leanOn()?'d':'';if(L.includes('d'))d.LEAN_D=1;if(L.includes('n'))d.LEAN_N=1;return d;}
function landPrograms(){if(P_LAND)return;const S=rutShaders(),G=R.G,h=landDefs();
  P_LAND=G.program('land',S.VS,S.FS,Object.assign(DEBUG_VIEW&&DEBUG_VIEW.startsWith('shadow')?{DEBUG_SHADOW:+(DEBUG_VIEW.slice(6)||0)}:{},h));
  /* (no reflection probe in the retro renderer: its program is the scene's own, never drawn with) */
  P_LANDP=P_LAND;if(!P_DEPTH)P_DEPTH=G.program('landDepth',S.DEPTH_VS,S.DEPTH_FS);}
/* a Dev switch flipped while driving: the two lit programs made again with the new defines, on the spot (a pause while
   the GPU's driver compiles them: about a second on a phone), and the old ones let go. Nothing keeps the old ones: each
   pass looks P_LAND up as it draws, and a program's uniform cache (G.set, litOf) belongs to the program */
function landDrop(list){const G=R.G;for(const P of list){if(!P)continue;const i=G.programs.indexOf(P);if(i>=0)G.programs.splice(i,1);gl.deleteProgram(P.p);gl.deleteShader(P.vs);gl.deleteShader(P.fs);}}
function landRebuild(){if(!P_LAND||!R)return;const G=R.G,old=[P_LAND,P_LANDP];P_LAND=P_LANDP=null;
  /* (built and checked before anything lets go of the old ones: a build this device's driver refuses leaves the game
     drawing with the one it had) */
  try{landPrograms();G.finish(P_LAND);G.finish(P_LANDP);}
  catch(e){console.warn('land shader rebuild: '+(e&&e.message||e));landDrop([P_LAND,P_LANDP]);P_LAND=old[0];P_LANDP=old[1];
    if(typeof say==='function')say('That shader would not build here: kept the one before',3);return;}
  landDrop(old);R.resetTAA=true;}
const M4_ID=M4.id(),FAR0=new Float32Array(4);
/* a matrix of the renderer's frame (relative to the origin) taken back to the world, for the world's culling */
const TW_T=new Float32Array(16),TW_O=[0,1,2,3].map(()=>new Float32Array(16));let TW_I=0;
const toWorld=VP=>M4.mulTo(TW_O[TW_I++&3],VP,M4.tTo(TW_T,-RO[0],-RO[1],-RO[2]));
/* how far the land is drawn this frame: by night the fog's reach; by day the far tiles' (or the chunks') */
const worldFar=()=>SKY.night&&SKY.draw?Math.min(SKY.draw,Math.max(WORLD.near,WORLD.farR)):Math.max(WORLD.near,WORLD.farR);
/* ---------- the ground's photographs (49_textures' TEXPACK, packed by tools/pack_textures.py): one texture array, a layer
   for each picture there is (13_lit's T_ names index it), decoded after the boot while the game runs on its procedural
   ground, then faded in. The tier sets the size (Mobile 512: the 1024 picture drawn down) and the anisotropy ---------- */
const TEX={arr:null,t0:0,loading:false,failed:0,ms:0,res:0};
async function texLoad(){
  if(TEX.loading||TEX.arr||typeof TEXPACK==='undefined'||!TEXPACK.layers.some(l=>l.has))return;TEX.loading=true;const t0=performance.now();
  const L=TEXPACK.layers.filter(l=>l.has),G=R.G,n=L.length,res=TEX.res=Math.min(TEXPACK.size,GFX.q.texRes||1024);
  const arr=G.texture(res,res,'srgb8',{layers:n,mips:true,wrap:'repeat',aniso:GFX.q.texAniso||4});
  const grey=new Uint8Array(res*res*4).fill(128);for(let i=3;i<grey.length;i+=4)grey[i]=255;
  const put=(i,src)=>{gl.activeTexture(gl.TEXTURE0+15);gl.bindTexture(gl.TEXTURE_2D_ARRAY,arr.t);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,i,res,res,1,gl.RGBA,gl.UNSIGNED_BYTE,src);gl.bindTexture(gl.TEXTURE_2D_ARRAY,null);};
  for(let i=0;i<n;i++){const l=L[i];
    try{const img=new Image();img.src=l.src;await img.decode();let src=img;
      if(img.width!==res){const c=document.createElement('canvas');c.width=c.height=res;c.getContext('2d').drawImage(img,0,0,res,res);src=c;}
      put(i,src);}
    catch(e){console.warn('ground picture '+l.id+': '+(e&&e.message||e));TEX.failed++;put(i,grey);}}
  gl.activeTexture(gl.TEXTURE0+15);gl.bindTexture(gl.TEXTURE_2D_ARRAY,arr.t);gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
  /* (Redline Retro: the little pictures' texels as hard squares up close, smoothed only far off) */
  gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.bindTexture(gl.TEXTURE_2D_ARRAY,null);
  TEX.arr=arr;TEX.t0=APP.t;TEX.loading=false;TEX.ms=performance.now()-t0;
}
/* how far the pictures are in: faded up over a second once they are decoded, times the Dev look's setting */
const texOn=()=>TEX.arr?clamp((APP.t-TEX.t0)/1.,0,1)*LOOK.tex:0;
function texUniforms(P){const G=R.G;if(P.u.uTexOn){G.uni(P,'uTexOn',texOn());G.uni(P,'uTexCol',LOOK.texcol);}if(TEX.arr&&P.samplers&&P.samplers.uTex!==undefined)G.tex(P,{uTex:TEX.arr});}
/* what every lit pass of the world starts from: the world's own frame, no car */
function landUniforms(P){texUniforms(P);R.G.uni(P,'uGlowK',LOOK.glow);const G=R.G;G.uni(P,'uM',M4_ID);G.uni(P,'uPrevM',M4_ID);G.uni(P,'uPrevOn',0);G.uni(P,'uInst',0);G.uni(P,'uFarDrop',FAR0);
  G.uni(P,'uDetail',GFX.q.detail*LOOK.detail);G.uni(P,'uDrawFar',worldFar());
  G.uni(P,'uMudLocal',0);G.uni(P,'uMudOff',0);G.uni(P,'uDirt',0);G.uni(P,'uGround',0);G.uni(P,'uLamps',0);G.uni(P,'uBrake',0);G.uni(P,'uLiv',0);G.uni(P,'uGlow',[0,0,0]);
  G.uni(P,'uCourse',[WG.COURSE.x0-RO[0],WG.COURSE.mi,.11,-RO[2]]);G.uni(P,'uOrg',[0,0,0]);}
/* ---------- the phone's budgets: what the world and the cars hand each pass on the Mobile tier, and nothing else
   (the other tiers draw everything, always: the laptop's picture is never traded for speed). Each is a Dev control
   (54_dev's BUDGET_S), saved on the device as rt-budget; the defaults are what ships. None of them can be measured
   on the Pixel 7a's Mali-G710 from here, so they start where the picture doesn't change and the owner trims:
   scale: the render scale's ceiling (dynamic resolution works under it; TAA rebuilds the rest)
   shadowD: how far out the buildings, poles and trees are drawn into the sun's (moon's) cascades
   treeD: how far the trees are drawn (the far ones are a single lump each)
   treeNear: how near a tree is drawn in full
   probeEvery: the reflection probe's face drawn every this many frames (six faces make the cube)
   farCSM: the far cascade drawn every this many frames
   fx: dust, clods and spray alive at once
   carLod: your car into the middle and far cascades as its coarse copy (its shadow there is a few texels across) ---------- */
const BUDGET_DEF={scale:.75,shadowD:320,treeD:340,treeNear:70,probeEvery:3,farCSM:4,fx:220,carLod:1},BUDGET=Object.assign({},BUDGET_DEF);
const budgetOn=()=>GFX.level==='mobile';
try{const d=JSON.parse(store.get('rt-budget','{}'))||{};for(const k in BUDGET_DEF)if(typeof d[k]==='number')BUDGET[k]=d[k];}catch(e){}
const budgetSave=()=>store.set('rt-budget',JSON.stringify(BUDGET));
/* the budgets that live in the renderer's own settings and the world's: set when the renderer starts and when a
   control moves */
function budgetApply(){if(!R||!budgetOn())return;const Q=R.Q;Q.probeEvery=Math.max(1,Math.round(BUDGET.probeEvery));Q.farCSM=Math.max(2,Math.round(BUDGET.farCSM/2)*2);
  if(RESO){RESO.max=Math.min(QMAX0||Q.maxScale,BUDGET.scale);if(RESO.scale>RESO.max)RESO.scale=RESO.max;}GFX.q.treeNear=BUDGET.treeNear;FX_CAP.mobile=Math.round(BUDGET.fx);}
let QMAX0=0;
/* the renderer's hook for the land */
const LAND={c:null,dt:1/60,tris:0,skip0:false,
  prepare(R,S){if(!LOOK.shadows||DEVW.off.shadows)R.U.uCSMOn=0;},
  /* the sun's cascades and the headlights' map: the buildings, poles and trees inside the map's frustum (the ground
     itself casts nothing, as before: the county's hills are gentle and the town is flat) */
  shadow(R,Pd,VP,kind,k){if(!this.c)return;const G=R.G;useLit(P_DEPTH);const u=CUR.u;G.uni(P_DEPTH,'uVP',VP);G.uni(P_DEPTH,'uM',M4_ID);G.uni(P_DEPTH,'uInst',0);G.uni(P_DEPTH,'uTime',APP.t);
    gl.disable(gl.CULL_FACE);
    const F=frustum(toWorld(VP)),hl=kind==='hl',e=hl?[R.hlPos[0]+RO[0],R.hlPos[1]+RO[1],R.hlPos[2]+RO[2]]:this.c.eye;
    /* (the origin-step frame's second cascade pass: the near cascade and the headlights' map are already drawn) */
    if(this.skip0&&(hl||k===0)){G.use(Pd);return;}
    worldShadow(u,F,e,hl?90:budgetOn()?BUDGET.shadowD:320,hl?'hl':'c'+k,!hl&&k>=1);G.use(Pd);},
  opaque(R,U,texs){const G=R.G,P=G.use(P_LAND);gl.disable(gl.CULL_FACE);G.set(P,U);G.tex(P,texs);landUniforms(P);CUR=litOf(P);
    const c=this.c;if(!c)return;
    let tris=drawWorld({eye:c.eye,VPw:toWorld(U.uVP)},SKY.night?SKY.draw:0);
    if(!DEVW.off.fx)tris+=fxDraw();
    this.tris=tris;},
  probe(R,U2,texs){if(!this.c)return;const G=R.G,P=G.use(P_LANDP);gl.disable(gl.CULL_FACE);G.set(P,U2);G.tex(P,texs);landUniforms(P);CUR=litOf(P);
    if(DEVW.off.refl)return;
    const e=U2.uCam;drawWorld({eye:[e[0]+RO[0],e[1]+RO[1],e[2]+RO[2]],VPw:toWorld(U2.uVP)},GFX.q.probeFar,true);}
};
/* the challenges' columns of light and the gates (60_chal), added over the scene before the fog and TAA */
const GLASSHOOK={c:null,
  glass(R,U,texs){if(!this.c)return;const c=this.c;LAND.tris+=chalDraw({VP:U.uVP,eyeR:U.uCam,eye:c.eye});gl.bindVertexArray(null);}};
/* the renderer once, at the boot: its world (none of its own, the town's lights in its grid), the hooks, the
   programs; a frame on which the origin stepped draws every cascade (51_world's setOrigin) */
function worldGL(){
  R.loadWorld({geo:null,lights:[],info:{lightGrid:{x0:-8,z0:-8,size:16,cell:8}}});
  R.U.uStudio=0;
  /* (the town's lights go into the grid after the opening screen is up: 65_boot) */
  /* (your car before the land: it is the nearest thing in the picture, so the ground behind it is never shaded
     only to be painted over; the depth test picks the same winner either way) */
  R.extra.push(CARHOOK,LAND,FXP,GLASSHOOK);
  landPrograms();FXP.init();displayPrograms();
  const sp=R.shadowPass.bind(R);
  /* a 1 x 1 depth target the second pass's near cascade and headlight map go to: nothing is drawn into it */
  let dummy=null;
  R.shadowPass=function(S){if(!this.shadowAll)return sp(S);this.shadowAll=false;const n=this.frameN;
    /* the near cascade every frame; the middle one on odd frames, the far one every second or fourth: both, once.
       The second pass would draw the near cascade and the headlights' map over again: their targets are swapped for
       a scrap one and the hooks draw nothing into them, so the frame the origin steps costs one cascade more than a
       frame where the middle one is due, not three */
    this.frameN=n|1;sp(S);
    if(!dummy)dummy=this.G.target([],this.G.texture(1,1,'depth24'));
    const f0=this.csmFB[0],fh=this.hlFB;this.csmFB[0]=dummy;this.hlFB=dummy;LAND.skip0=CARHOOK.skip0=true;
    try{this.frameN=(n&~3)+2;sp(S);}finally{this.csmFB[0]=f0;this.hlFB=fh;LAND.skip0=CARHOOK.skip0=false;this.frameN=n;}};
  QMAX0=R.Q.maxScale;budgetApply();
}
/* ---------- the open world's side of the developer's panel (Mini Dirt Run Open World's): the world's own numbers,
   how far it's drawn, worker or not, and a cruise control that holds the road (for the long straight runs).
   The handling and Sim switches are HD's own (54_dev). ---------- */
const DEVW={hud:'off',view:'near',gen:'worker',cruise:'off',lastCruise:'max',off:{},trafN:'auto',polN:'auto',wanted:'auto',polPow:'level',sirP:'deep',sirV:'40',heliV:'290',escD:'800',gpuT:'auto',half:'auto',lean:'auto',skip:'on',stS:'4'};
try{const d=JSON.parse(store.get('rt-devworld','{}'))||{};for(const k of Object.keys(DEVW))if(d[k]!==undefined)DEVW[k]=d[k];}catch(e){}
DEVW.cruise='off';if(DEVW.gen==='main')WORLD.forceLocal=true;
/* (the numbers on screen: off, the small readout, or everything; a save from before had on or off) */
if(DEVW.hud===true)DEVW.hud='full';if(!['off','perf','full'].includes(DEVW.hud))DEVW.hud='off';
const saveDev=()=>store.set('rt-devworld',JSON.stringify(Object.assign({},DEVW,{cruise:'off'})));
/* cruise: locks onto the road you're on, keeps to its right-hand lane, and holds the set speed or what the bends ahead allow */
const CRUISE={on:false,line:null};
const CRUISE_N={max:'flat out',fast:'100 mph',road:'70 mph'},CRUISE_V={max:999,fast:44.7,road:31.3};
function toggleCruise(){
  if(CRUISE.on){CRUISE.on=false;CRUISE.line=null;DEVW.cruise='off';say('Cruise off',1.2);return;}
  DEVW.cruise=DEVW.lastCruise||'max';CRUISE.on=true;CRUISE.line=null;say('Cruise: '+CRUISE_N[DEVW.cruise]+'. Brake to stop it',2);
}
/* a road line at a point along it: its centre, its direction (+z north-south, +x east-west), the unit across it, its class */
function lineHere(Lr,a){
  if(Lr.ns){const s=(WG.offNS(Lr.i,a+1)-WG.offNS(Lr.i,a-1))/2,inv=1/Math.sqrt(1+s*s);return {c:WG.L*Lr.i+WG.offNS(Lr.i,a),dir:[s*inv,inv],n:[inv,-s*inv],cls:WG.clsNSz(Lr.i,a)};}
  const s=(WG.offEW(Lr.j,a+1)-WG.offEW(Lr.j,a-1))/2,inv=1/Math.sqrt(1+s*s);return {c:WG.L*Lr.j+WG.offEW(Lr.j,a),dir:[inv,s*inv],n:[-s*inv,inv],cls:WG.clsEWx(Lr.j,a)};
}
function cruiseDrive(t,inp){
  const x=t.p[0],z=t.p[2];
  if(inp.brk>.3){CRUISE.on=false;CRUISE.line=null;DEVW.cruise='off';say('Cruise off',1.2);return inp;}
  if(!CRUISE.line){const r=WG.roadAt(x,z);if(!r||Math.abs(r.d)>r.hw+8){CRUISE.on=false;DEVW.cruise='off';say('Cruise: get on a road first',2);return inp;}CRUISE.line=r.ns?{ns:true,i:r.i}:{ns:false,j:r.j};}
  const Lr=CRUISE.line,a=Lr.ns?z:x,h=lineHere(Lr,a);
  if(!h.cls){CRUISE.on=false;CRUISE.line=null;DEVW.cruise='off';say('Cruise: the road ends here',2);return inp;}
  const F=mcol(t.M,0),fl=Math.hypot(F[0],F[2])||1,fx=F[0]/fl,fz=F[2]/fl,sg=h.dir[0]*fx+h.dir[1]*fz>=0?1:-1,hx=h.dir[0]*sg,hz=h.dir[1]*sg;
  /* the right-hand lane: the side of the road to the right of the way you're going */
  const lane=h.cls===5?5.5:h.cls===4?1.85:h.cls===3?1.6:h.cls===2?1.1:0,rs=(-hz*h.n[0]+hx*h.n[1])>0?1:-1,dT=lane*rs,v=t.speed;
  const ld=clamp(v*1.1,14,95),step=Lr.ns?hz:hx,aa=a+step*ld,h2=lineHere(Lr,aa);
  const tx=Lr.ns?h2.c+h2.n[0]*dT:aa+h2.n[0]*dT,tz=Lr.ns?aa+h2.n[1]*dT:h2.c+h2.n[1]*dT;
  const ax=tx-x,az=tz-z,dl=Math.hypot(ax,az)||1,al=Math.atan2((ax*-fz+az*fx)/dl,(ax*fx+az*fz)/dl);
  const c=t.c,lim=Math.min(c.lock,t.tyre.aPk*1.6*(t.tune?t.tune.steer:1)+c.wb*9/Math.max(v*v,1)),del=Math.atan(2*c.wb*Math.sin(al)/ld);
  let steer=clamp(del/lim,-1,1);if(Math.abs(inp.steer)>.15)steer=inp.steer;
  /* how fast: the set speed, or what the bends (and the end of the road) ahead allow */
  let vs=CRUISE_V[DEVW.cruise]||999;const th0=Math.atan2(h.dir[1],h.dir[0]);
  for(const s of [50,100,170,260,380]){const hh=lineHere(Lr,a+step*s);if(!hh.cls){vs=Math.min(vs,Math.sqrt(2*4.5*Math.max(0,s-50)));break;}
    let dth=Math.abs(Math.atan2(hh.dir[1],hh.dir[0])-th0);if(dth>PI)dth=TAU-dth;
    if(dth>.004){const vc=Math.sqrt((h.cls>=3?5:3.2)*s/dth);vs=Math.min(vs,Math.sqrt(vc*vc+2*4.5*s*.6));}}
  const thr=v<vs-1.5?1:v<vs+.5?.3:0,brk=v>vs+2.5?clamp((v-vs)/10,0,.7):0;
  return Object.assign({},inp,{steer,thr:Math.max(inp.thr,thr),brk});
}
/* ---------- the performance overlay (F): for the phone test. Frame times, not fps: the average, the 1% low
   (the slowest frame in a hundred), the JavaScript's own share of each frame, draw calls and triangles, and a
   graph of the last four seconds with lines at 60 and 30 fps. The GPU's share is read by subtraction: switch a
   pass off in the Dev tab and watch the frame time ---------- */
const PERF={ft:new Float32Array(240),js:new Float32Array(240),i:0,n:0,t0:0,draws:0};
/* where a frame's time goes, by section. A frame that comes late (over 30 ms since the last) was made late by
   the frame before it, so that one's breakdown is kept as the LAST SPIKE; if its sections add up to much less
   than the gap, the time went where JavaScript can't see it (the GPU, garbage collection, the browser) */
/* (AI: the drivers' thinking, outside the physics' steps: the police and their helicopter, the traffic, the race's
   robots on their lines) */
const PSN=['PHYS','WORLD','SHADOW','PROBE','SCENE','POST','HUD','SOUND','TREES','SEND','AI'],PS_PHYS=0,PS_WORLD=1,PS_SHADOW=2,PS_PROBE=3,PS_SCENE=4,PS_POST=5,PS_HUD=6,PS_SOUND=7,PS_TREES=8,PS_SEND=9,PS_AI=10,PS_N=11;
const PS={cur:new Float32Array(PS_N),prev:new Float32Array(PS_N),avg:new Float32Array(PS_N),sub:0,mk:0,tl:0,prevX:null,avgX:[0,0,0],spike:null,jsPrev:0};
function psT(i,t0){const t=performance.now();PS.cur[i]+=t-t0;return t;}
function perfBegin(){PERF.t0=performance.now();GLC.n=0;PERF.up0=WORLD.st.upms;}
function perfEnd(dt){const k=PERF.i,ms=dt*1000,js=performance.now()-PERF.t0;PERF.ft[k]=ms;PERF.js[k]=js;PERF.draws=GLC.n;PERF.up=(PERF.up||0)*.95+(WORLD.st.upms-PERF.up0)*.05;PERF.i=(k+1)%240;PERF.n=Math.min(240,PERF.n+1);
  if(ms>30&&PERF.n>30&&PS.prevX&&GAME.state==='drive')PS.spike={ms,js:PS.jsPrev,s:Array.from(PS.prev),x:PS.prevX,at:APP.t};
  const X=[PS.sub,PS.mk,PS.tl];
  for(let i=0;i<PS_N;i++){PS.avg[i]+=(PS.cur[i]-PS.avg[i])*.05;PS.prev[i]=PS.cur[i];PS.cur[i]=0;}
  for(let i=0;i<3;i++)PS.avgX[i]+=(X[i]-PS.avgX[i])*.05;
  PS.prevX=X;PS.jsPrev=js;PS.sub=0;PS.mk=0;PS.tl=0;}
/* the cars this frame: every one in the world besides yours, and how many of them (and yours) the physics steps:
   traffic is a cheap ride on its lane until something comes near it, the police and the race's nearby rivals are
   full cars, as yours is */
const CARN={all:0,phys:0,traf:0,trafP:0,pol:0,riv:0,rivP:0};
function carCounts(){const C=CARN;C.traf=TRF_ON.length;C.trafP=TRF_PHYS.length;C.pol=0;for(let i=0;i<POL.cars.length;i++)if(POL.cars[i].V)C.pol++;
  C.riv=0;C.rivP=0;if(RACE.on)for(const o of RACE.cars){if(o.me)continue;C.riv++;if(o.drv&&!o.drv.kin)C.rivP++;}
  C.all=C.traf+C.pol+C.riv;C.phys=1+C.trafP+C.pol+C.rivP;return C;}
/* (short rows: a phone held sideways shows about sixty characters of the overlay) */
function psRows(){
  const f=(a,i)=>PSN[i]+' '+a[i].toFixed(1),A=PS.avg,rows=[],SEC=[0,10,1,2,3,4,5,6,9,7];
  rows.push('MS A FRAME '+[0,10,1,2,3].map(i=>f(A,i)).join(' '));
  rows.push('  '+[4,5,6,9,7].map(i=>f(A,i)).join('  ')+'  TREES '+A[8].toFixed(1));
  rows.push(`  ${PS.avgX[0].toFixed(1)} STEPS  ${PS.avgX[1].toFixed(2)} CHUNKS  ${PS.avgX[2].toFixed(2)} TREE LISTS A FRAME`);
  const S=PS.spike;
  if(S){const sum=SEC.reduce((a,i)=>a+S.s[i],0),big=SEC.filter(i=>S.s[i]>=.3);
    rows.push(`SPIKE ${S.ms.toFixed(0)} MS ${Math.round(APP.t-S.at)} S AGO  JS ${S.js.toFixed(1)}  UNSEEN ${Math.max(0,S.ms-16.7-sum).toFixed(0)} MS`);
    rows.push('  '+(big.length?big.map(i=>f(S.s,i)).join('  '):'NO SECTION OVER 0.3 MS'));
    rows.push(`  ${S.x[0]} STEPS  ${S.x[1]} CHUNKS  ${S.x[2]} TREE LISTS  TREES ${S.s[8].toFixed(1)}`);}
  else rows.push('SPIKE: NONE OVER 30 MS YET');
  return rows;
}
function perfStats(){const n=PERF.n;if(!n)return null;const a=Array.from(PERF.ft.subarray(0,n)).sort((x,y)=>x-y),avg=a.reduce((s,x)=>s+x,0)/n;
  let js=0;for(let i=0;i<n;i++)js+=PERF.js[i];return {avg,low1:a[Math.min(n-1,Math.floor(n*.99))],js:js/n};}
function drawPerfGraph(x0,y0,w,h){
  hRect(x0,y0,w,h,pack(0,0,0,170));const sc=h/50;
  for(const [ms,col] of [[16.7,pack(80,200,120,160)],[33.3,pack(230,170,60,160)]]){const y=y0+h-ms*sc;hRect(x0,y,w,1,col);}
  for(let k=0;k<Math.min(w,PERF.n);k++){const i=(PERF.i-1-k+480)%240,ms=PERF.ft[i],jm=PERF.js[i],x=x0+w-1-k,bh=Math.min(h,ms*sc),jh=Math.min(bh,jm*sc);
    hRect(x,y0+h-bh,1,bh-jh,ms>33.4?pack(230,90,70,230):ms>17.2?pack(230,170,60,220):pack(120,200,255,200));hRect(x,y0+h-jh,1,jh,pack(255,255,255,200));}
}
/* the world's numbers on the screen (F) */
function drawWorldStats(){
  const S=WORLD.st,t=GAME.car,av=l=>S.n[l]?(S.ms[l]/S.n[l]).toFixed(1):'-',x0=5+hudInset()[0];let y=Math.round(H*.4);
  const rows=['WORLD MADE ON: '+WORLD.mode.toUpperCase()+(CRUISE.on?'   CRUISE '+CRUISE_N[DEVW.cruise].toUpperCase():''),
    `CHUNKS ${WORLD.chunks.size}  FAR TILES ${WORLD.far.size}  WAITING ${S.queue}  MAKING ${WORLD.inflight}`,
    `MS EACH  2M ${av(0)}  4M ${av(1)}  8M ${av(2)}  ITEMS ${S.sn?(S.sms/S.sn).toFixed(1):'-'}  FAR ${S.fn?(S.fms/S.fn).toFixed(1):'-'}`,
    `WORST  2M ${S.mx[0].toFixed(0)} MS  ITEMS ${S.smx.toFixed(0)} MS  MAKER BUSY ${Math.min(999,S.genRate/10).toFixed(0)}%`,
    `GPU ${(S.bytes/1048576).toFixed(1)} MB  ${Math.round(APP.tris/1000)}K TRIS  ${APP.fps.toFixed(0)} FPS`,
    (()=>{const C=carCounts();return `CARS ${C.all}: TRAFFIC ${C.traf} (${C.trafP} ON PHYSICS)  POLICE ${C.pol}${HELI.on?' + HELI':''}  RIVALS ${C.riv} (${C.rivP})  STEPPED ${C.phys}`;})(),
    (()=>{const P=perfStats();return P?`FRAME ${P.avg.toFixed(1)} MS  1% LOW ${(1000/P.low1).toFixed(0)} FPS  JS ${P.js.toFixed(1)} MS  DRAWS ${PERF.draws}${GLC.oom?'  UPLOADS REFUSED '+GLC.oom:''}`:'';})(),
    ...rperfRows(),`HUD ${BW}X${BH}  ORIGIN ${RO[0]},${RO[2]} (${WORLD.steps||0} STEPS)  LIGHT GRID ${LG.n} LIGHTS, ${LG.ms.toFixed(0)} MS TO MAKE`,
    `PASSES OFF: ${Object.keys(DEVW.off).filter(k=>DEVW.off[k]).join(' ').toUpperCase()||'NONE'}`,
    `BOOT MS: RENDERER ${BOOT.renderer||'-'}  WORLD ${BOOT.world||'-'}  CAR ${BOOT.car||'-'}  SHADERS ${BOOT.shaders||'-'} (+${BOOT.built||0} CARS)  LIGHTS ${BOOT.lights||'-'}  PHOTOS ${BOOT.photos||'-'}`,
    `HOLES ${S.holes}  GROUND NOT READY ${S.missT} FRAMES  UPLOAD ${(PERF.up||0).toFixed(1)} MS/FRAME`,
    `CHUNK WAIT ${(S.lat||0).toFixed(0)} MS (WORST ${(S.latMx||0).toFixed(0)})`,
    `${(Math.hypot(t.p[0],t.p[2])/1609.34).toFixed(2)} MI FROM THE GARAGE  TRIP ${(S.odo/1609.34).toFixed(1)} MI  TOP ${Math.round(S.top*2.237)} MPH`,...psRows()];
  /* (raised as far as it needs to be for the graph under it to fit) */
  y=Math.max(2,Math.min(y,H-rows.length*7-46));
  const bw=Math.max(...rows.map(r=>tw3(r)))+4;hRect(x0-2,y-2,bw,rows.length*7+3,pack(0,0,0,160));
  for(const r of rows){txt3(r,x0,y,PAL.ink);y+=7;}
  drawPerfGraph(x0-2,y+2,Math.min(240,bw),40);
}
function buildDevWorld(){
  segButtons($('dHud'),[['off','Off'],['perf','Readout'],['full','Everything']],v=>{DEVW.hud=v;saveDev();});
  segButtons($('dView'),[['near','Near'],['normal','Normal'],['far','Far']],v=>{DEVW.view=v;saveDev();});
  segButtons($('dText'),[['smooth','Smooth'],['dots','Dots']],v=>{setDotText(v==='dots');syncDevWorld();});
  segButtons($('dPol'),[['auto','Wanted'],['1','1'],['2','2'],['3','3'],['4','4'],['5','5']],v=>{DEVW.polN=v;saveDev();syncDevWorld();});
  segButtons($('dWanted'),[['auto','Auto'],['1','1'],['2','2'],['3','3'],['4','4'],['5','5']],v=>{DEVW.wanted=v;saveDev();syncDevWorld();});
  segButtons($('dPolPow'),[['level','By wanted level'],['same','Your build as it is']],v=>{DEVW.polPow=v;saveDev();syncDevWorld();});
  segButtons($('dSirP'),[['deep','Deeper'],['lower','A little deeper'],['orig','As before']],v=>{DEVW.sirP=v;saveDev();syncDevWorld();});
  segButtons($('dHalf'),[['auto','Auto (Mobile)'],['on','On'],['off','Off']],v=>{DEVW.half=v;saveDev();landRebuild();syncDevWorld();});
  segButtons($('dLean'),[['auto','Auto (Mobile, Low)'],['on','On'],['off','Off']],v=>{DEVW.lean=v;saveDev();landRebuild();syncDevWorld();});
  segButtons($('dSkip'),[['on','On'],['off','Off']],v=>{DEVW.skip=v;saveDev();landRebuild();syncDevWorld();});
  segButtons($('dGpuT'),[['auto','Auto'],['off','Off'],['60','60%'],['70','70%'],['80','80%'],['88','88%'],['hold','Hold']],v=>{DEVW.gpuT=v;saveDev();syncDevWorld();});
  segButtons($('dEscD'),[['400','400 m'],['800','800 m'],['1200','1200 m']],v=>{DEVW.escD=v;saveDev();syncDevWorld();});
  segButtons($('dHeliV'),[['200','200 mph'],['250','250 mph'],['290','290 mph']],v=>{DEVW.heliV=v;saveDev();syncDevWorld();});
  segButtons($('dSirV'),[['25','25%'],['40','40%'],['60','60%'],['100','As before']],v=>{DEVW.sirV=v;saveDev();syncDevWorld();});
  segButtons($('dTraf'),[['auto','Level'],['0','0'],['8','8'],['16','16'],['24','24'],['32','32'],['40','40']],v=>{DEVW.trafN=v;saveDev();syncDevWorld();});
  segButtons($('dStS'),[['off','None'],['8','1/8'],['4','1/4'],['2','1/2'],['1','The same']],v=>{DEVW.stS=v;saveDev();syncDevWorld();});
  segButtons($('dGen'),[['worker','Worker'],['main','Main thread']],v=>{DEVW.gen=v;saveDev();if(v==='main'){WORLD.forceLocal=true;workerDown();}else{WORLD.forceLocal=false;WORLD.mode='starting';}syncDevWorld();});
  segButtons($('dCruise'),[['off','Off'],['max','Flat out'],['fast','100 mph'],['road','70 mph']],v=>{DEVW.cruise=v;if(v!=='off')DEVW.lastCruise=v;CRUISE.on=v!=='off';CRUISE.line=null;saveDev();});
  /* passes off, one at a time, to read the GPU's share by subtraction on a phone */
  const po=$('dPasses');for(const [k,n] of [['shadows','Sun shadows'],['refl','Reflections'],['far','Far land'],['trees','Trees'],['fx','Dust and spray'],['post','Light in the air (the fog)']]){
    const el=document.createElement('label');el.className='devchk';el.innerHTML='<input type="checkbox"><span><b></b></span>';el.querySelector('b').textContent=n;
    const cb=el.querySelector('input');cb.checked=!!DEVW.off[k];cb.addEventListener('change',()=>{DEVW.off[k]=cb.checked;if(k==='refl'||k==='shadows'){PRB.fresh=true;CSM.fresh=true;}saveDev();});po.appendChild(el);}
  $('dReset').addEventListener('click',()=>{const S=WORLD.st;S.n=[0,0,0];S.ms=[0,0,0];S.mx=[0,0,0];S.sn=0;S.sms=0;S.smx=0;S.fn=0;S.fms=0;S.missT=0;S.odo=0;S.top=0;syncDevWorld();});
}
function syncDevWorld(){
  for(const [id,v] of [['dText',TXT.on?'smooth':'dots'],['dHud',DEVW.hud],['dView',DEVW.view],['dGen',DEVW.gen],['dCruise',CRUISE.on?DEVW.cruise:'off'],['dTraf',String(DEVW.trafN||'auto')],['dStS',String(DEVW.stS||'4')],['dPol',String(DEVW.polN||'auto')],['dWanted',String(DEVW.wanted||'auto')],['dPolPow',DEVW.polPow||'level'],['dSirP',DEVW.sirP||'deep'],['dSirV',String(DEVW.sirV||'40')],['dHeliV',String(DEVW.heliV||'290')],['dEscD',String(DEVW.escD||'800')],['dGpuT',String(DEVW.gpuT||'auto')],['dHalf',String(DEVW.half||'auto')],['dLean',String(DEVW.lean||'auto')],['dSkip',String(DEVW.skip||'on')]])for(const el of $(id).children)el.setAttribute('aria-pressed',el.dataset.v===v?'true':'false');
  const S=WORLD.st;$('dNote').textContent=`Made on: ${WORLD.mode}. ${WORLD.chunks.size} chunks and ${WORLD.far.size} far tiles loaded, ${(S.bytes/1048576).toFixed(1)} MB of them on the graphics card. `+
    `City Limits' town in the middle, Highway 40 straight through it east and west, country out to about two miles, then the salt flats to the edge, ${WG.HALF*2/1609.34|0} miles across.`;
}
