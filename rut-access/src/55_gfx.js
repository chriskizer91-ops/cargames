/* =====================================================================================
   GRAPHICS. Shiftlight 3's five tiers, Mobile to Ultra: the renderer's own numbers for each (11_sl3's QUALITY:
   the shadow and reflection map sizes, the volumetric fog's steps, the reflection rays, motion blur, how many
   device pixels per CSS pixel it draws at most, how far the render scale may climb before TAA rebuilds the
   rest) and, below, this game's: how much detail is cut into the ground, how far the land is drawn, where the
   ground's meshes change, how far the probe sees. Mobile is the default on a touch screen; the Pixel 7a runs it.
   The weather the Sim level sets is drawn: an overcast sky, dark wet ground with puddles and rain rings.
   ===================================================================================== */
const GFX_LEVELS=[
  ['mobile','Mobile','The phone tier: 1024 shadow maps (the far cascade every fourth frame), a 64 reflection probe (a face every third frame), a light volumetric fog, short reflection rays, no motion blur, at most 1.25 device pixels per CSS pixel, and a render scale of at most 0.75 that TAA rebuilds to full. Looks almost the same as Ultra.'],
  ['low','Low','For a tablet or an old laptop: a 128 probe every frame, more fog steps, longer reflection rays, motion blur, up to 1.5 device pixels per CSS pixel.'],
  ['medium','Medium','For a laptop: 1536 shadow maps, a 192 probe, half-resolution fog, full render scale.'],
  ['high','High','For a gaming laptop or a desktop: 2048 shadow maps, a 256 probe, all the ground\'s detail, the land drawn further out.'],
  ['ultra','Ultra','For a fast desktop: 3072 shadow maps, 28 fog steps, the render scale up to 1.25, the land drawn to 700 m.']];
const GFX_Q={
  mobile:{detail:.6,far:420,lod:[150,290],treeNear:95, probeFar:260,grass:0,texRes:512, texAniso:2},
  low:   {detail:.8,far:460,lod:[170,320],treeNear:110,probeFar:300,grass:0,texRes:1024,texAniso:4},
  medium:{detail:1, far:560,lod:[190,360],treeNear:130,probeFar:340,grass:1,texRes:1024,texAniso:4},
  high:  {detail:1, far:620,lod:[220,400],treeNear:150,probeFar:340,grass:1,texRes:1024,texAniso:8},
  ultra: {detail:1, far:700,lod:[240,440],treeNear:170,probeFar:400,grass:2,texRes:1024,texAniso:8}};
const GFX={level:'high',q:GFX_Q.high,far:620,lod:[220,400],frame:0,fromUrl:false};
{const Q=new URLSearchParams(location.search);let g=Q.get('quality')||store.get('rut-gfx','');GFX.fromUrl=!!Q.get('quality');
  g={mini:'mobile',phone:'mobile',plus:'mobile',laptop:'high'}[g]||g;
  GFX.level=GFX_Q[g]?g:matchMedia('(pointer: coarse)').matches?'mobile':'high';}
function gfxApply(){const q=GFX.q=GFX_Q[GFX.level];GFX.far=q.far;GFX.lod=q.lod;LOD_DIST[0]=q.lod[0];LOD_DIST[1]=q.lod[1];TREE_NEAR=q.treeNear;}
gfxApply();
/* a new tier: the renderer's targets are sized by it, so the page starts again on it (the game is saved first) */
function setGfx(id){if(!GFX_Q[id])return;if(id===GFX.level){gfxLabel();return;}store.set('rut-gfx',id);if(typeof saveGame==='function')saveGame();location.reload();}
function gfxLabel(){const b=$('gfx');if(b)b.textContent='Gfx '+GFX_LEVELS.find(l=>l[0]===GFX.level)[1];}

/* ---------- the weather on the screen (the Sim level's; dry on the others) ---------- */
const WX={w:0,wet:0,rainT:0};
/* how wet it is: the setting's amount on the Sim level, nothing elsewhere */
const wxTarget=()=>APP.level==='sim'?simVal(SIM_WX,SIMSET.wx):0;
function syncWeather(){WX.w=wxTarget();WX.wet=Math.min(1,WX.w*1.25);}
/* ---------- the environment the renderer lights the frame with: the time of day (59_daynight), turned grey and wet by the weather ---------- */
const ENV={};
function envNow(){
  const T=SKY,w=WX.w,E=ENV,g=1-.95*(T.night||0),L=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];
  E.night=T.night||0;E.sunDir=T.sun;E.sunSize=T.sunSize;E.sunCol=T.sunCol.map(v=>v*(1-.72*w));
  E.ambUp=L(T.ambUp,[.42*g,.45*g,.5*g],w);E.ambDn=T.ambDn;
  E.skyZen=L(T.skyZen,[.36*g,.39*g,.44*g],w);E.skyHor=L(T.skyHor,[.62*g,.64*g,.67*g],w);E.skyGlow=[0,0,0];
  E.cloud=lerp(T.cloud,.97,w);E.stars=(T.stars||0)*(1-w);
  E.fogCol=T.fogCol;E.fogDen=T.fogDen*(1+4*w);E.fogFall=T.fogFall;E.fogAmb=L(T.fogAmb,[E.skyHor[0]*.35,E.skyHor[1]*.35,E.skyHor[2]*.35],w).map(v=>v*LOOK.haze);
  E.wet=WX.wet;E.rain=w>.5?(w-.5)*2:0;E.puddles=WX.wet;
  E.lightsOn=T.lightsOn;E.lit=0;E.key=T.key*LOOK.key;E.expoRange=T.expoRange;E.bloom=T.bloom;E.grade=[T.grade[0]*LOOK.sat,T.grade[1]*LOOK.con];E.expoBias=1;
  return E;
}
/* ---------- a slow frame rate at the lowest render scale: say so once ---------- */
const GFXW={t:0,said:false};
function gfxWatch(dt){
  if(GAME.state!=='drive'||GFXW.said||!RESO)return;
  if(RESO.scale<=RESO.min+.001&&APP.fps<34)GFXW.t+=dt;else GFXW.t=Math.max(0,GFXW.t-dt*2);
  if(GFXW.t>6){GFXW.said=true;const i=GFX_LEVELS.findIndex(l=>l[0]===GFX.level);say(i>0?'Slow: try Graphics '+GFX_LEVELS[i-1][1]+' in Settings':'Slow: try the LED dots display in Settings',4);}
}
