/* =====================================================================================
   GRAPHICS. Shiftlight 3's five tiers, Mobile to Ultra: the renderer's own numbers for each (11_sl3's QUALITY: the
   shadow and reflection map sizes, the volumetric fog's steps, the reflection rays, motion blur, how many device
   pixels per CSS pixel it draws at most, how far the render scale may climb before TAA rebuilds the rest) and, below,
   this game's: how much detail is cut into the ground, how far the streamed world reaches (its chunks, their levels
   of detail, the things on them, the far tiles to the horizon), how near a tree is drawn in full, how far the probe
   sees. Every start is on Mobile on a touch screen (a Pixel 7a runs it), Low elsewhere. Changing the tier starts the
   page again on it (the renderer's targets are sized by it), for that start only.
   The weather the Sim level sets is drawn (Damp, Rain, Downpour): an overcast sky turning grey and low, thicker haze
   (the volumetric fog), dark wet ground with a sheen and puddles, rain rings in the water and the puddles, the
   renderer's rain and its splashes (53_fx), spray off wet tarmac, and drops on the lens from the hood camera.
   ===================================================================================== */
/* (Redline Retro: the tiers are how far the world reaches before the fog wall, how many of the town's lamps a pixel
   adds up, how near a tree is drawn in full. The picture's own size is RETRO.lines, the same on every tier) */
const GFX_LEVELS=[
  ['mobile','Phone','The fog wall at about a quarter mile, nothing past it, six lamps to a pixel, every tree a lump. The lightest.'],
  ['low','Near','The fog wall a little further out, the far country faint behind it, eight lamps to a pixel.'],
  ['medium','Far','The far country and downtown\'s towers out to a mile and a half, ten lamps to a pixel.'],
  ['high','Further','The land drawn out to two miles, fourteen lamps to a pixel, the trees in full a little further out.'],
  ['ultra','Horizon','As far as the eye goes, every lamp, trees in full out to 120 m.']];
/* detail: the ground's fine detail (0..1); far: the day's draw distance; near, farR, lodD, propD: the streamed world's
   rings (51_world: the chunks, the far tiles, where a chunk's mesh steps down, the things on the chunks); treeNear: a
   tree drawn in full inside this, its single lump beyond; probeFar: what the reflection probe draws; texRes, texAniso: the ground
   photographs' size on the GPU and their anisotropic filtering */
const GFX_Q={
  mobile:{detail:0,far:400,near:420,farR:0,   lodD:[90,200], propD:300,treeNear:0,  probeFar:200,texRes:64,texAniso:1},
  low:   {detail:0,far:460,near:500,farR:1200,lodD:[110,250],propD:360,treeNear:30, probeFar:200,texRes:64,texAniso:1},
  medium:{detail:0,far:560,near:600,farR:2400,lodD:[140,300],propD:440,treeNear:50, probeFar:200,texRes:64,texAniso:1},
  high:  {detail:0,far:620,near:700,farR:3200,lodD:[170,360],propD:520,treeNear:80, probeFar:200,texRes:64,texAniso:1},
  ultra: {detail:0,far:700,near:860,farR:3600,lodD:[220,460],propD:640,treeNear:120,probeFar:200,texRes:64,texAniso:1}};
const GFX={level:'high',q:GFX_Q.high,far:620,frame:0,fromUrl:false};
/* every start is on the light tier for the device (the owner's call: a tier too heavy for it can't leave the game stuck
   loading, start after start): Mobile on a touch screen (a phone: Low is the heavier tier there), Low on a laptop or a
   desktop. A tier chosen in the menu is kept for the one start that puts it in (setGfx: the page starts again on it),
   and no further. The page's ?quality= (the tools) still picks one */
const GFX_START=matchMedia('(pointer: coarse)').matches?'mobile':'low';
{const Q=new URLSearchParams(location.search),next=store.get('rt-gfx-next','');if(next)store.set('rt-gfx-next','');
  let g=Q.get('quality')||next||GFX_START;GFX.fromUrl=!!Q.get('quality');
  /* (Wide Open's own levels) */
  g={mini:'mobile',phone:'mobile',plus:'mobile',laptop:'high'}[g]||g;
  GFX.level=GFX_Q[g]?g:GFX_START;}
function gfxApply(){const q=GFX.q=GFX_Q[GFX.level];GFX.far=q.far;}
gfxApply();
/* a new tier: the renderer's targets are sized by it, so the page starts again on it (the game is saved first) */
function setGfx(id){if(!GFX_Q[id])return;if(id===GFX.level){gfxLabel();return;}store.set('rt-gfx-next',id);try{saveGame();}catch(e){}location.reload();}
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
/* (the rain's programs are made the first time it is set to rain, under the menu, not when the first drop falls) */
function syncWeather(){WX.w=wxTarget();WX.wet=Math.min(1,WX.w*1.25);if(WX.w>.5&&R&&typeof rainInit==='function')rainInit();}
/* ---------- the environment the renderer lights the frame with: the time of day (59_daynight), turned grey and wet by
   the weather, and the Dev tab's look (54_dev) ---------- */
const ENV={};
function envNow(){
  const T=SKY,w=WX.w,E=ENV,g=1-.95*(T.night||0),L=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];
  E.night=T.night||0;E.sunDir=T.sun;E.sunSize=T.sunSize;
  /* (the Dev look's Moonlight: the moon and the night sky's light, under the full moon; by day its Sunlight, the sun alone) */
  const nt=(T.night||0)>.5,mk=nt?LOOK.moon:1,sk=nt?LOOK.moon:LOOK.sun;E.sunCol=T.sunCol.map(v=>v*(1-.72*w)*sk);
  E.ambUp=L(T.ambUp.map(v=>v*mk),[.42*g,.45*g,.5*g],w);E.ambDn=T.ambDn;
  E.skyZen=L(T.skyZen,[.36*g,.39*g,.44*g],w);E.skyHor=L(T.skyHor,[.62*g,.64*g,.67*g],w);E.skyGlow=T.skyGlow||[0,0,0];
  E.cloud=lerp(T.cloud,.97,w);E.stars=(T.stars||0)*(1-w)*LOOK.stars;
  E.fogCol=T.fogCol;E.fogDen=T.fogDen*(1+4*w)*LOOK.haze;E.fogFall=T.fogFall;E.fogAmb=L(T.fogAmb,[E.skyHor[0]*.35,E.skyHor[1]*.35,E.skyHor[2]*.35],w).map(v=>v*LOOK.haze);
  /* (the Dev tab's passes: the light in the air off reads the GPU's share of the volumetric fog) */
  if(DEVW.off.post){E.fogDen=0;E.fogAmb=[0,0,0];}
  E.wet=WX.wet;E.rain=w>.5?(w-.5)*2:0;E.puddles=WX.wet;
  E.lightsOn=T.lightsOn*LOOK.lamps;E.lit=0;E.key=T.key*LOOK.key;E.expoRange=T.expoRange;E.bloom=T.bloom*LOOK.bloom;E.grade=[T.grade[0]*LOOK.sat,T.grade[1]*LOOK.con];E.expoBias=1;
  return E;
}
/* ---------- a slow frame rate at the lowest render scale: say so once ---------- */
const GFXW={t:0,said:false};
function gfxWatch(dt){
  if(GAME.state!=='drive'||GFXW.said||!RESO)return;
  if(RESO.scale<=RESO.min+.001&&APP.fps<34)GFXW.t+=dt;else GFXW.t=Math.max(0,GFXW.t-dt*2);
  if(GFXW.t>6){GFXW.said=true;const i=GFX_LEVELS.findIndex(l=>l[0]===GFX.level);say(i>0?'Slow: try Graphics '+GFX_LEVELS[i-1][1]+' in Settings':'Slow: try the LED dots display in Settings',4);}
}
