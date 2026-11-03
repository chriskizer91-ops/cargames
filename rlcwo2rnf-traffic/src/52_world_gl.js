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
/* (half-precision lighting, 11_sl3's HALF: Mobile by default; Dev: Half-precision lighting, from the next start) */
const halfOn=()=>DEVW.half==='on'||DEVW.half!=='off'&&GFX.level==='mobile';
function landPrograms(){if(P_LAND)return;const S=rutShaders(),G=R.G,h=halfOn()?{HALF:1}:{};
  P_LAND=G.program('land',S.VS,S.FS,Object.assign(DEBUG_VIEW&&DEBUG_VIEW.startsWith('shadow')?{DEBUG_SHADOW:+(DEBUG_VIEW.slice(6)||0)}:{},h));
  P_LANDP=G.program('landProbe',S.VS,S.FS,Object.assign({PROBE:1},h));P_DEPTH=G.program('landDepth',S.DEPTH_VS,S.DEPTH_FS);}
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
  gl.activeTexture(gl.TEXTURE0+15);gl.bindTexture(gl.TEXTURE_2D_ARRAY,arr.t);gl.generateMipmap(gl.TEXTURE_2D_ARRAY);gl.bindTexture(gl.TEXTURE_2D_ARRAY,null);
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
