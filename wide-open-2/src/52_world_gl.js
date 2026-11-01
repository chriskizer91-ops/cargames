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
/* what every lit pass of the world starts from: the world's own frame, no car */
function landUniforms(P){const G=R.G;G.uni(P,'uM',M4_ID);G.uni(P,'uPrevM',M4_ID);G.uni(P,'uPrevOn',0);G.uni(P,'uInst',0);G.uni(P,'uFarDrop',FAR0);
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
  /* (your car before the land: it is the nearest thing in the picture, so the ground behind it is never shaded
     only to be painted over; the depth test picks the same winner either way) */
  R.extra.push(CARHOOK,LAND,FXP,GLASSHOOK);
  landPrograms();FXP.init();displayPrograms();
  const sp=R.shadowPass.bind(R);
  R.shadowPass=function(S){if(!this.shadowAll)return sp(S);this.shadowAll=false;const n=this.frameN;
    /* the near cascade every frame; the middle one on odd frames, the far one every second or fourth: both, once */
    this.frameN=n|1;sp(S);this.frameN=(n&~3)+2;sp(S);this.frameN=n;};
}
