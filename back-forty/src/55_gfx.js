/* =====================================================================================
   GRAPHICS. Four levels, each the one below it and more:
   - Mini: Dirt Sleeper Mini's look (the soft shadow under the car), the least detail in the ground.
   - Phone: real sun shadows in two cascades (1024 square each, the near one every frame, the far one every
     third), and reflections: a cubemap probe at the car (64 square, one face every third frame) that the
     paint, the glass, the chrome, the water and the puddles reflect, so they show the sky, the trees and
     the land round them instead of an empty sky. Clouds, and the ground's detail at about half.
   - Laptop: three cascades at 2048 with a softer 9-tap filter reaching 200 m, the probe at 128 every
     frame, all of the ground's detail, the land drawn further out, and two things only a laptop gets
     (55_post): ambient occlusion in screen space and light you can see in the air (sun shafts through
     the trees and the dust, the headlights' cones at night).
   - Ultra: bigger and further: 3072 cascades to 260 m, a 256 probe, the land drawn to 700 m.
   No blades of grass at any level (the owner's call): the ground's own grass colour carries it, and that
   budget goes on the vehicles and the physics.
   Every cascade is fitted round its slice of the camera's view and snapped to its own texels so its
   edges don't crawl. The weather the Sim level sets is drawn: an overcast sky, dark wet ground with
   puddles and rain rings, and rain.
   ===================================================================================== */
const GFX_LEVELS=[['mini','Mini','The lightest: the soft shadow under the car and plain ground. For an old or slow phone.'],
  ['phone','Phone','Real sun shadows round the car, and real reflections: the paint, the glass, the water and the puddles show the sky, the trees and the land round them. Clouds, and detail cut into the dirt, the gravel and the rock.'],
  ['laptop','Laptop','Sharper, softer shadows reaching 200 m, all the ground\'s detail, the land drawn further out, and two things only a laptop gets: ambient occlusion and light you can see in the air (sun shafts through the trees and the dust, headlight beams at night).'],
  ['ultra','Ultra','Laptop, bigger: sharper shadows further out, finer reflections, the land drawn to 700 m. For a fast laptop or desktop.']];
const GFX_Q={
  mini:  {csm:0,   n:0,taps:4,splits:[0,0,0],     probe:0,  every:0,detail:.35,far:420,lod:[150,290],ssao:0,vol:0,clouds:0},
  phone: {csm:1024,n:2,taps:4,splits:[22,75,0],   probe:64, every:3,detail:.6, far:420,lod:[150,290],ssao:0,vol:0,clouds:1},
  laptop:{csm:2048,n:3,taps:9,splits:[20,65,200], probe:128,every:1,detail:1,  far:560,lod:[190,360],ssao:1,vol:1,clouds:1},
  ultra: {csm:3072,n:3,taps:9,splits:[24,80,260], probe:256,every:1,detail:1,  far:700,lod:[240,440],ssao:1,vol:2,clouds:1}};
const GFX={level:'laptop',q:GFX_Q.laptop,far:560,clouds:1,lod:[190,360],frame:0};
{let g=store.get('b40-gfx','');g={plus:'phone',high:'laptop'}[g]||g;
  GFX.level=GFX_Q[g]?g:matchMedia('(pointer: coarse)').matches?'phone':'laptop';}
function gfxApply(){
  const q=GFX.q=GFX_Q[GFX.level];GFX.far=q.far;GFX.clouds=q.clouds;GFX.lod=q.lod;
}
gfxApply();
function setGfx(id){if(!GFX_Q[id])return;GFX.level=id;store.set('b40-gfx',id);gfxApply();const b=$('gfx');if(b)b.textContent='Gfx '+GFX_LEVELS.find(l=>l[0]===id)[1];}

/* ---------- the cascaded shadow maps ---------- */
const CSM={tex:null,fbs:[],size:0,n:0,M:new Float32Array(48),ends:[0,0,0],off:[0,0,0,0],P:null,dummy:null,on:false,tris:0};
function depthArray(n,layers){
  const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D_ARRAY,t);gl.texStorage3D(gl.TEXTURE_2D_ARRAY,1,gl.DEPTH_COMPONENT24,n,n,layers);
  for(const [k,v] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE],
    [gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE],[gl.TEXTURE_COMPARE_FUNC,gl.LEQUAL]])gl.texParameteri(gl.TEXTURE_2D_ARRAY,k,v);
  return t;
}
const FS_SH=`out vec4 o;void main(){o=vec4(1.);}`;
function csmTarget(){
  const q=GFX.q,n=q.csm,L=q.n;if(!CSM.P)CSM.P=compile(VS_LIT,FS_SH,LIT_DEFS);if(!CSM.dummy)CSM.dummy=depthArray(1,1);
  if(CSM.size===n&&CSM.n===L)return;
  if(CSM.tex){gl.deleteTexture(CSM.tex);for(const f of CSM.fbs)gl.deleteFramebuffer(f);CSM.tex=null;CSM.fbs=[];}
  CSM.size=n;CSM.n=L;CSM.fresh=true;if(!n)return;
  CSM.tex=depthArray(n,L);
  for(let k=0;k<L;k++){const f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTextureLayer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,CSM.tex,0,k);
    gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);CSM.fbs.push(f);}
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
}
function ortho(l,r,b,t,n,f){const P=new Float32Array(16);P[0]=2/(r-l);P[5]=2/(t-b);P[10]=-2/(f-n);P[12]=-(r+l)/(r-l);P[13]=-(t+b)/(t-b);P[14]=-(f+n)/(f-n);P[15]=1;return P;}
/* cascade k: a sphere round the slice of the camera's view from near to far (its size rounded up to a
   metre so it doesn't breathe as the view widens with speed), seen from the sun, snapped to whole texels */
function cascade(k,c,near,far){
  const th=Math.tan(c.fov/2),tw=th*c.asp,mid=(near+far)/2,r=Math.ceil(Math.max(Math.hypot(far*tw,far*th,far-mid),Math.hypot(near*tw,near*th,mid-near))*1.04),
    ctr=[c.eyeR[0]+c.fwd[0]*mid,c.eyeR[1]+c.fwd[1]*mid,c.eyeR[2]+c.fwd[2]*mid],L=SKY.sun,back=r+160;
  const V=M4.look([ctr[0]+L[0]*back,ctr[1]+L[1]*back,ctr[2]+L[2]*back],ctr,Math.abs(L[1])>.98?[1,0,0]:[0,1,0]);
  const n=CSM.size,ts=2*r/n,cx=V[0]*ctr[0]+V[4]*ctr[1]+V[8]*ctr[2]+V[12],cy=V[1]*ctr[0]+V[5]*ctr[1]+V[9]*ctr[2]+V[13],x0=Math.round(cx/ts)*ts,y0=Math.round(cy/ts)*ts;
  return {M:M4.mul(ortho(x0-r,x0+r,y0-r,y0+r,1,back+r+40),V),ctr,r,ts,k};
}
/* everything that casts, inside cascade k's sphere: the sheds, fences, rocks and stands, the trees, the car */
function casters(K,t,u){
  const R=K.r+6,ctr=K.ctr,near=(mn,mx)=>mn[0]<ctr[0]+R&&mx[0]>ctr[0]-R&&mn[2]<ctr[2]+R&&mx[2]>ctr[2]-R;let tris=0;
  gl.uniform1f(u.uInst,0);gl.uniformMatrix4fv(u.uM,false,M4.id());
  /* the open world's buildings, poles and trees round it (51_world); far cascades take the trees' single lumps */
  tris+=worldCasters(u,ctr,R,K.r>60,'c'+K.k);
  if(t&&Math.hypot(t.p[0]-RO[0]-ctr[0],t.p[2]-RO[2]-ctr[2])<R+4)tris+=carShadow(t,u);
  /* the other cars in a race (60_race) */
  if(t)for(const o of raceCars())if(Math.hypot(o.p[0]-RO[0]-ctr[0],o.p[2]-RO[2]-ctr[2])<R+4)tris+=carShadow(o,u,true);
  return tris;
}
/* the cascades for this frame: the near one every frame, the others every second (or third) and fourth */
function csmPass(c,t){
  csmTarget();CSM.on=CSM.n>0&&!DEVW.off.shadows;if(!CSM.on)return;
  const q=GFX.q,P=CSM.P,u=P.u,every=q.n===2?[1,3]:[1,2,4],f=GFX.frame;let tris=0;
  gl.useProgram(P.p);gl.uniform1f(u.uTime,APP.t);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1.6,4);gl.disable(gl.CULL_FACE);
  let near=Math.max(.3,c.near||.3);
  for(let k=0;k<CSM.n;k++){const far=q.splits[k];
    if(CSM.fresh||(f+k)%every[k]===0){const K=cascade(k,c,k?q.splits[k-1]*.92:near,far);CSM.M.set(K.M,k*16);CSM.off[k]=K.ts*1.6+.02;
      gl.bindFramebuffer(gl.FRAMEBUFFER,CSM.fbs[k]);gl.viewport(0,0,CSM.size,CSM.size);gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(u.uVP,false,K.M);tris+=casters(K,t,u);}
    CSM.ends[k]=far;}
  CSM.fresh=false;gl.disable(gl.POLYGON_OFFSET_FILL);CSM.tris=tris;
}
/* the car into the map: the same pieces and matrices drawWorldCar uses */
function carShadow(t,u,far){
  const i=t.bi,b=t.build,T=truck(i),D=T.D,M0=carMatrix(t);let Mb=M0;
  const fx=D.X(D.uFa),R=b.look.tyre.R;if(D.pitch)Mb=M4.mul(Mb,M4.mul(M4T(fx,R,0),M4.mul(M4RZ(D.pitch),M4T(-fx,-R,0))));
  gl.uniformMatrix4fv(u.uM,false,Mb);
  if(far){const F=truckFar(i);drawMesh(F.body);if(F.hood)drawMesh(F.hood);}else{drawMesh(T.body);if(T.hood)drawMesh(T.hood);if(T.hide)drawMesh(T.hide);if(T.engineOut)drawMesh(T.bay.engine);}
  /* a machine's rider, sitting up (leaning makes no difference to a shadow this soft) */
  if(T.rider&&!far&&!(t.lean&&t.lean.bail)){drawMesh(T.rider.lo);const P=T.rider.pivot;gl.uniformMatrix4fv(u.uM,false,M4.mul(Mb,M4T(P[0],P[1],P[2])));drawMesh(T.rider.up);gl.uniformMatrix4fv(u.uM,false,Mb);}
  for(const sp of D.spares||[]){const W=sp.rear?T.wheelR:T.wheel;
    gl.uniformMatrix4fv(u.uM,false,M4.mul(Mb,M4.mul(M4T(sp.p[0],sp.p[1],sp.p[2]),sp.face==='back'?M4RY(-PI/2):M4S(1,1,sp.p[2]<0?-1:1))));drawMesh(W);}
  for(const w of t.wheels){const s=w.hp[2]<0?-1:1,st=w.front?t.steer:0;
    gl.uniformMatrix4fv(u.uM,false,M4.mul(M0,M4.mul(M4T(w.hp[0]+t.cg[0],w.hp[1]-w.len+t.cg[1],w.hp[2]),M4.mul(M4RY(-st),M4.mul(M4S(1,1,s),M4RZ(-w.ang))))));drawMesh(w.front?T.wheel:T.wheelR);}
  return T.tris;
}

/* ---------- the reflection probe at the car ---------- */
/* the cube's faces: where each looks, and which way is up in it (GL's cubemap layout) */
const PROBE_FACES=[[[1,0,0],[0,-1,0]],[[-1,0,0],[0,-1,0]],[[0,1,0],[0,0,1]],[[0,-1,0],[0,0,-1]],[[0,0,1],[0,-1,0]],[[0,0,-1],[0,-1,0]]];
const PRB={tex:null,fb:null,rb:null,size:0,face:0,pos:[0,0,0],P:null,dummy:null,ready:false,tick:0,lod:0,tris:0};
function probeTarget(){
  const n=GFX.q.probe;if(!PRB.P)PRB.P=compile(VS_LIT,FS_LIT,LIT_DEFS+'#define PROBE\n');
  if(!PRB.dummy){PRB.dummy=gl.createTexture();gl.bindTexture(gl.TEXTURE_CUBE_MAP,PRB.dummy);gl.texStorage2D(gl.TEXTURE_CUBE_MAP,1,gl.RGBA8,1,1);}
  if(PRB.size===n)return;
  if(PRB.tex){gl.deleteTexture(PRB.tex);gl.deleteFramebuffer(PRB.fb);gl.deleteRenderbuffer(PRB.rb);PRB.tex=null;}
  PRB.size=n;PRB.ready=false;PRB.face=0;if(!n)return;
  const lv=Math.log2(n)+1|0;PRB.lod=lv-1;
  PRB.tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_CUBE_MAP,PRB.tex);gl.texStorage2D(gl.TEXTURE_CUBE_MAP,lv,HDR?gl.RGBA16F:gl.RGBA8,n,n);
  for(const [k,v] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_CUBE_MAP,k,v);
  PRB.fb=gl.createFramebuffer();PRB.rb=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,PRB.rb);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT24,n,n);
  gl.bindFramebuffer(gl.FRAMEBUFFER,PRB.fb);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,PRB.rb);gl.bindFramebuffer(gl.FRAMEBUFFER,null);
}
/* one face of the cube (every `every` frames), from a little above the car; a new round starts where the car is now.
   After a jump (a reset, a teleport) the whole cube is drawn at once, so no face shows where the car was */
function probePass(t){
  probeTarget();if(!PRB.size)return;if(DEVW.off.refl){PRB.ready=false;return;}
  if(PRB.fresh){PRB.fresh=false;PRB.face=0;PRB.tick=0;for(let k=0;k<6;k++)probeFace(t);return;}
  if(++PRB.tick<GFX.q.every&&PRB.ready)return;PRB.tick=0;
  probeFace(t);
}
function probeFace(t){
  const f=PRB.face;if(f===0&&t)PRB.pos=[t.p[0]-RO[0],t.p[1]+1.1,t.p[2]-RO[2]];
  const e=PRB.pos,[d,up]=PROBE_FACES[f],V=M4.look(e,[e[0]+d[0],e[1]+d[1],e[2]+d[2]],up),Pm=M4.persp(PI/2,1,.5,1500);
  gl.bindFramebuffer(gl.FRAMEBUFFER,PRB.fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_CUBE_MAP_POSITIVE_X+f,PRB.tex,0);
  gl.drawBuffers([gl.COLOR_ATTACHMENT0]);gl.viewport(0,0,PRB.size,PRB.size);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);
  useLit(PRB.P);const eW=[e[0]+RO[0],e[1],e[2]+RO[2]],c={eye:eW,eyeR:e,fwd:d,up,fov:PI/2,asp:1,V,P:Pm,VP:M4.mul(Pm,V),VPw:M4.mul(Pm,M4.look(eW,[eW[0]+d[0],eW[1]+d[1],eW[2]+d[2]],up))};
  worldUniforms(c);gfxUniforms(false);skyLights(t);worldShadows([]);
  PRB.tris=drawWorld(c,340,true);
  PRB.face=(f+1)%6;
  if(PRB.face===0){gl.bindTexture(gl.TEXTURE_CUBE_MAP,PRB.tex);gl.generateMipmap(gl.TEXTURE_CUBE_MAP);PRB.ready=true;}
  useLit(P_LIT);
}

/* ---------- the scene shader's side of it, and the weather's ---------- */
/* the lit program being drawn with (the scene's, or the probe's cheaper one) */
let CUR=null;
function useLit(P){CUR=P;gl.useProgram(P.p);}
function gfxUniforms(scene=true){
  const u=CUR.u;
  if(scene){
    gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D_ARRAY,CSM.on?CSM.tex:CSM.dummy);gl.uniform1i(u.uCSM,3);
    gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_CUBE_MAP,PRB.ready?PRB.tex:PRB.dummy);gl.uniform1i(u.uProbe,4);gl.activeTexture(gl.TEXTURE0);
    gl.uniform4f(u.uProbeP,PRB.ready?1:0,PRB.lod,0,0);
    if(CSM.on){gl.uniformMatrix4fv(u.uCSMM,false,CSM.M);gl.uniform4f(u.uCSMS,CSM.ends[0],CSM.ends[1]||1e9,CSM.ends[2]||1e9,1/CSM.size);
      gl.uniform4f(u.uCSMB,CSM.off[0],CSM.off[1],CSM.off[2],0);gl.uniform2i(u.uCSMN,CSM.n,GFX.q.taps);}
    else gl.uniform2i(u.uCSMN,0,4);
  }
  gl.uniform1f(u.uDetail,GFX.q.detail);gl.uniform4fv(u.uCloud,cloudVec());gl.uniform1f(u.uWet,WX.wet);
}
/* the clouds: cover, brightness (at night lit only by the moon), haze toward the sun, rain */
const CLOUD=new Float32Array(4);
function cloudVec(){const w=WX.w,nt=1-.96*(SKY.night||0);CLOUD[0]=GFX.clouds?lerp(.5,.97,w):0;CLOUD[1]=lerp(1,.5,w)*nt;CLOUD[2]=GFX.clouds?(1-w)*nt:0;CLOUD[3]=w;return CLOUD;}

/* ---------- the weather on the screen (the Sim level's; dry on the others) ---------- */
const WX={w:0,wet:0,rainT:0};
/* how wet it is: the setting's amount on the Sim level, nothing elsewhere */
const wxTarget=()=>APP.level==='sim'?simVal(SIM_WX,SIMSET.wx):0;
function syncWeather(){WX.w=wxTarget();WX.wet=Math.min(1,WX.w*1.25);}
/* the sky for this weather: clear to overcast (at night the overcast is as dark as the night sky it covers) */
function skyNow(){
  const w=WX.w,S=SKY,o=SKY_NOW,g=1-.95*(S.night||0);
  for(let k=0;k<3;k++){o.sunCol[k]=S.sunCol[k]*(1-.72*w);o.sky[k]=lerp(S.sky[k],[.5,.53,.58][k]*g,w);o.zen[k]=lerp(S.zen[k],[.36,.39,.44][k]*g,w);o.hor[k]=lerp(S.hor[k],[.62,.64,.67][k]*g,w);o.gnd[k]=S.gnd[k]*(1-.3*w);}
  o.fogD=S.fogD*(1+4*w);return o;
}
const SKY_NOW={sunCol:[0,0,0],sky:[0,0,0],zen:[0,0,0],hor:[0,0,0],gnd:[0,0,0],fogD:0};
/* rain: thin streaks falling round the camera, see-through (the dot pass averages the dropped pixels) */
const RAIN={n:0,x:null,y:null,z:null,buf:null,mesh:null};
function rainDraw(cam,dt){
  const w=WX.w;if(w<.5)return 0;
  const N=Math.round((GFX.level==='ultra'?1000:GFX.level==='laptop'?800:GFX.level==='phone'?500:350)*(w-.3)/.7);
  if(!RAIN.mesh){const mb=new MB();mb.box(-.5,-.5,-.5,.5,.5,.5,[1,1,1],0,MAT.COL);RAIN.mesh=mb.build();RAIN.x=new Float32Array(1000);RAIN.y=new Float32Array(1000);RAIN.z=new Float32Array(1000);RAIN.buf=new Float32Array(1000*12);
    for(let i=0;i<1000;i++){RAIN.x[i]=Math.random()*36-18;RAIN.y[i]=Math.random()*18-4;RAIN.z[i]=Math.random()*36-18;}}
  const e=cam.eyeR,B=RAIN.buf,fall=9.5*dt;
  for(let i=0;i<N;i++){let y=RAIN.y[i]-fall;if(y<-4){y+=18;RAIN.x[i]=Math.random()*36-18;RAIN.z[i]=Math.random()*36-18;}RAIN.y[i]=y;
    /* the streaks stay put in the world as the camera moves (wrapped into a 36 m box round it); none right in
       front of the lens, where one streak would be a pillar across the screen */
    const o=i*12,wx=e[0]+((RAIN.x[i]-e[0])%36+54)%36-18,wz=e[2]+((RAIN.z[i]-e[2])%36+54)%36-18,cl=Math.hypot(wx-e[0],wz-e[2])<2.2;
    B[o]=wx;B[o+1]=e[1]+y-(cl?40:0);B[o+2]=wz;B[o+3]=0;B[o+4]=.012;B[o+5]=.6;B[o+6]=.012;B[o+7]=0;B[o+8]=.7;B[o+9]=.75;B[o+10]=.82;B[o+11]=-.32;}
  setInst(RAIN.mesh,B.subarray(0,N*12));gl.uniform1f(CUR.u.uInst,1);drawMeshI(RAIN.mesh);gl.uniform1f(CUR.u.uInst,0);
  return N*12;
}
/* ---------- a slow frame rate: say so once ---------- */
const GFXW={t:0,said:false};
function gfxWatch(dt){
  if(GAME.state!=='drive'||GFX.level==='mini'||GFXW.said)return;
  if(APP.fps<34)GFXW.t+=dt;else GFXW.t=Math.max(0,GFXW.t-dt*2);
  if(GFXW.t>6){GFXW.said=true;const i=GFX_LEVELS.findIndex(l=>l[0]===GFX.level);say('Slow: try Graphics '+GFX_LEVELS[Math.max(0,i-1)][1]+' in Settings',4);}
}
