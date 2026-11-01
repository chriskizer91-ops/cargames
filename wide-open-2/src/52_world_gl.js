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
function landPrograms(){if(P_LAND)return;const S=rutShaders(),G=R.G;
  P_LAND=G.program('land',S.VS,S.FS,DEBUG_VIEW&&DEBUG_VIEW.startsWith('shadow')?{DEBUG_SHADOW:+(DEBUG_VIEW.slice(6)||0)}:{});
  P_LANDP=G.program('landProbe',S.VS,S.FS,{PROBE:1});P_DEPTH=G.program('landDepth',S.DEPTH_VS,S.DEPTH_FS);}
const M4_ID=M4.id(),FAR0=new Float32Array(4);
/* a matrix of the renderer's frame (relative to the origin) taken back to the world, for the world's culling */
const toWorld=VP=>M4.mul(VP,M4T(-RO[0],-RO[1],-RO[2]));
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
function landUniforms(P){texUniforms(P);const G=R.G;G.uni(P,'uM',M4_ID);G.uni(P,'uPrevM',M4_ID);G.uni(P,'uPrevOn',0);G.uni(P,'uInst',0);G.uni(P,'uFarDrop',FAR0);
  G.uni(P,'uDetail',GFX.q.detail*LOOK.detail);G.uni(P,'uDrawFar',worldFar());
  G.uni(P,'uMudLocal',0);G.uni(P,'uMudOff',0);G.uni(P,'uDirt',0);G.uni(P,'uGround',0);G.uni(P,'uLamps',0);G.uni(P,'uBrake',0);G.uni(P,'uLiv',0);G.uni(P,'uGlow',[0,0,0]);
  G.uni(P,'uCourse',[WG.COURSE.x0-RO[0],WG.COURSE.mi,.11,-RO[2]]);G.uni(P,'uOrg',[0,0,0]);}
/* the renderer's hook for the land */
const LAND={c:null,dt:1/60,tris:0,
  prepare(R,S){if(!LOOK.shadows||DEVW.off.shadows)R.U.uCSMOn=0;},
  /* the sun's cascades and the headlights' map: the buildings, poles and trees inside the map's frustum (the ground
     itself casts nothing, as before: the county's hills are gentle and the town is flat) */
  shadow(R,Pd,VP,kind,k){if(!this.c)return;const G=R.G;useLit(P_DEPTH);const u=CUR.u;G.uni(P_DEPTH,'uVP',VP);G.uni(P_DEPTH,'uM',M4_ID);G.uni(P_DEPTH,'uInst',0);G.uni(P_DEPTH,'uTime',APP.t);
    gl.disable(gl.CULL_FACE);
    const F=frustum(toWorld(VP)),hl=kind==='hl',e=hl?[R.hlPos[0]+RO[0],R.hlPos[1]+RO[1],R.hlPos[2]+RO[2]]:this.c.eye;
    worldShadow(u,F,e,hl?90:320,hl?'hl':'c'+k,!hl&&k>=1);G.use(Pd);},
  opaque(R,U,texs){const G=R.G,P=G.use(P_LAND);gl.disable(gl.CULL_FACE);G.set(P,U);G.tex(P,texs);landUniforms(P);CUR=litOf(P);
    const c=this.c;if(!c)return;
    let tris=drawWorld({eye:c.eye,VPw:toWorld(U.uVP)},SKY.night?SKY.draw:0);
    if(!DEVW.off.fx)tris+=fxDraw();tris+=rainDraw(c,this.dt);
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
  lgBuild();
  R.extra.push(LAND,CARHOOK,FXP,GLASSHOOK);
  landPrograms();FXP.init();displayPrograms();
  const sp=R.shadowPass.bind(R);
  R.shadowPass=function(S){if(!this.shadowAll)return sp(S);this.shadowAll=false;const n=this.frameN;
    /* the near cascade every frame; the middle one on odd frames, the far one every second or fourth: both, once */
    this.frameN=n|1;sp(S);this.frameN=(n&~3)+2;sp(S);this.frameN=n;};
}
