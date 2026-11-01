/* =====================================================================================
   GRAPHICS. Shiftlight 3's five tiers, Mobile to Ultra: the renderer's own numbers for each (11_sl3's QUALITY: the
   shadow and reflection map sizes, the volumetric fog's steps, the reflection rays, motion blur, how many device
   pixels per CSS pixel it draws at most, how far the render scale may climb before TAA rebuilds the rest) and, below,
   this game's: how much detail is cut into the ground, how far the streamed world reaches (its chunks, their levels
   of detail, the things on them, the far tiles to the horizon), how near a tree is drawn in full, how far the probe
   sees. Mobile is the default on a touch screen; a Pixel 7a runs it. Changing the tier starts the page again on it
   (the renderer's targets are sized by it).
   The weather the Sim level sets is drawn: an overcast sky, dark wet ground with puddles and rain rings, and rain.
   ===================================================================================== */
const GFX_LEVELS=[
  ['mobile','Mobile','The phone tier: 1024 shadow maps (the far cascade every fourth frame), a 64 reflection probe (a face every third frame), a light volumetric fog, short reflection rays, no motion blur, at most 1.25 device pixels per CSS pixel, and a render scale of at most 0.75 that TAA rebuilds to full. Looks almost the same as Ultra.'],
  ['low','Low','For a tablet or an old laptop: a 128 probe every frame, more fog steps, longer reflection rays, motion blur, up to 1.5 device pixels per CSS pixel, the world a little further out.'],
  ['medium','Medium','For a laptop: 1536 shadow maps, a 192 probe, half-resolution fog, full render scale, all the ground\'s detail.'],
  ['high','High','For a gaming laptop or a desktop: 2048 shadow maps, a 256 probe, the land and the far country drawn further out.'],
  ['ultra','Ultra','For a fast desktop: 3072 shadow maps, 28 fog steps, the render scale up to 1.25, the land drawn furthest.']];
/* detail: the ground's fine detail (0..1); far: the day's draw distance; near, farR, lodD, propD: the streamed world's
   rings (51_world: the chunks, the far tiles, where a chunk's mesh steps down, the things on the chunks); treeNear: a
   tree drawn in full inside this, its single lump beyond; probeFar: what the reflection probe draws */
const GFX_Q={
  mobile:{detail:.6,far:420,near:540,farR:1800,lodD:[115,270],propD:340,treeNear:70, probeFar:260},
  low:   {detail:.8,far:460,near:640,farR:2200,lodD:[150,300],propD:420,treeNear:85, probeFar:300},
  medium:{detail:1, far:560,near:760,farR:2600,lodD:[180,380],propD:500,treeNear:95, probeFar:340},
  high:  {detail:1, far:620,near:820,farR:3000,lodD:[200,420],propD:560,treeNear:110,probeFar:340},
  ultra: {detail:1, far:700,near:980,farR:3600,lodD:[250,500],propD:680,treeNear:130,probeFar:400}};
const GFX={level:'high',q:GFX_Q.high,far:620,frame:0,fromUrl:false};
{const Q=new URLSearchParams(location.search);let g=Q.get('quality')||store.get('wo2-gfx','');GFX.fromUrl=!!Q.get('quality');
  /* (Wide Open's own levels, as a save from before may have them) */
  g={mini:'mobile',phone:'mobile',plus:'mobile',laptop:'high'}[g]||g;
  GFX.level=GFX_Q[g]?g:matchMedia('(pointer: coarse)').matches?'mobile':'high';}
function gfxApply(){const q=GFX.q=GFX_Q[GFX.level];GFX.far=q.far;}
gfxApply();
/* a new tier: the renderer's targets are sized by it, so the page starts again on it (the game is saved first) */
function setGfx(id){if(!GFX_Q[id])return;if(id===GFX.level){gfxLabel();return;}store.set('wo2-gfx',id);try{saveGame();}catch(e){}location.reload();}
function gfxLabel(){const b=$('gfx');if(b)b.textContent='Gfx '+GFX_LEVELS.find(l=>l[0]===GFX.level)[1];}
/* how far the land is drawn: the night's fog closes in */
const drawFar=()=>SKY.night&&SKY.draw?Math.min(GFX.far,SKY.draw):GFX.far;
/* (the old shadow and probe passes are the renderer's now; what asks them to start afresh, a reset or a teleport, still
   can: the next frame's view is a cut, 60_game) */
const CSM={fresh:false},PRB={fresh:false};

/* ---------- the lit program being drawn with ----------
   The world's and the cars' drawing code (51_world, 60_game, 60_race, 53_fx) sets its uniforms straight through the
   program's locations (CUR.u), as it did for the old renderer; the renderer's programs keep theirs in P.u as records,
   so the lit program in use is wrapped once in the old shape: {p, u: name -> location}. Samplers are the renderer's
   (it gave each its own unit) and are left out, so nothing can rebind them */
let CUR=null;
function litOf(P){if(P._c)return P._c;R.G.finish(P);const u={};for(const k in P.u)u[k]=P.u[k].loc;return P._c={p:P.p,u,P};}
function useLit(P){R.G.use(P);return CUR=litOf(P);}

/* ---------- the weather on the screen (the Sim level's; dry on the others) ---------- */
const WX={w:0,wet:0,rainT:0};
/* how wet it is: the setting's amount on the Sim level, nothing elsewhere */
const wxTarget=()=>APP.level==='sim'?simVal(SIM_WX,SIMSET.wx):0;
function syncWeather(){WX.w=wxTarget();WX.wet=Math.min(1,WX.w*1.25);}
/* ---------- the environment the renderer lights the frame with: the time of day (59_daynight), turned grey and wet by
   the weather, and the Dev tab's look (54_dev) ---------- */
const ENV={};
function envNow(){
  const T=SKY,w=WX.w,E=ENV,g=1-.95*(T.night||0),L=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];
  E.night=T.night||0;E.sunDir=T.sun;E.sunSize=T.sunSize;E.sunCol=T.sunCol.map(v=>v*(1-.72*w));
  E.ambUp=L(T.ambUp,[.42*g,.45*g,.5*g],w);E.ambDn=T.ambDn;
  E.skyZen=L(T.skyZen,[.36*g,.39*g,.44*g],w);E.skyHor=L(T.skyHor,[.62*g,.64*g,.67*g],w);E.skyGlow=T.skyGlow||[0,0,0];
  E.cloud=lerp(T.cloud,.97,w);E.stars=(T.stars||0)*(1-w);
  E.fogCol=T.fogCol;E.fogDen=T.fogDen*(1+4*w)*LOOK.haze;E.fogFall=T.fogFall;E.fogAmb=L(T.fogAmb,[E.skyHor[0]*.35,E.skyHor[1]*.35,E.skyHor[2]*.35],w).map(v=>v*LOOK.haze);
  E.wet=WX.wet;E.rain=w>.5?(w-.5)*2:0;E.puddles=WX.wet;
  E.lightsOn=T.lightsOn;E.lit=0;E.key=T.key*LOOK.key;E.expoRange=T.expoRange;E.bloom=T.bloom;E.grade=[T.grade[0]*LOOK.sat,T.grade[1]*LOOK.con];E.expoBias=1;
  return E;
}
/* rain: thin streaks falling round the camera, see-through (pixels dropped, TAA averages them) */
const RAIN={n:0,x:null,y:null,z:null,buf:null,mesh:null};
function rainDraw(cam,dt){
  const w=WX.w;if(w<.5)return 0;
  const N=Math.round(({ultra:1000,high:900,medium:800,low:600,mobile:450})[GFX.level]*(w-.3)/.7);
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
/* ---------- a slow frame rate at the lowest render scale: say so once ---------- */
const GFXW={t:0,said:false};
function gfxWatch(dt){
  if(GAME.state!=='drive'||GFXW.said||!RESO)return;
  if(RESO.scale<=RESO.min+.001&&APP.fps<34)GFXW.t+=dt;else GFXW.t=Math.max(0,GFXW.t-dt*2);
  if(GFXW.t>6){GFXW.said=true;const i=GFX_LEVELS.findIndex(l=>l[0]===GFX.level);say(i>0?'Slow: try Graphics '+GFX_LEVELS[i-1][1]+' in Settings':'Slow: try the LED dots display in Settings',4);}
}
