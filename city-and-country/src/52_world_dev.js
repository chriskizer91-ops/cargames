/* ---------- the open world's side of the developer's panel (Mini Dirt Run Open World's): the world's own numbers,
   how far it's drawn, worker or not, and a cruise control that holds the road (for the long straight runs).
   The handling and Sim switches are HD's own (54_dev). ---------- */
const DEVW={hud:false,view:'near',gen:'worker',cruise:'off',lastCruise:'max',off:{}};
try{const d=JSON.parse(store.get('cc-devworld','{}'))||{};for(const k of Object.keys(DEVW))if(d[k]!==undefined)DEVW[k]=d[k];}catch(e){}
DEVW.cruise='off';if(DEVW.gen==='main')WORLD.forceLocal=true;
const saveDev=()=>store.set('cc-devworld',JSON.stringify(Object.assign({},DEVW,{cruise:'off'})));
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
const PSN=['PHYS','WORLD','SHADOW','PROBE','SCENE','POST','HUD','SOUND','TREES','SEND'],PS_PHYS=0,PS_WORLD=1,PS_SHADOW=2,PS_PROBE=3,PS_SCENE=4,PS_POST=5,PS_HUD=6,PS_SOUND=7,PS_TREES=8,PS_SEND=9;
const PS={cur:new Float32Array(10),prev:new Float32Array(10),avg:new Float32Array(10),sub:0,mk:0,tl:0,prevX:null,avgX:[0,0,0],spike:null,jsPrev:0};
function psT(i,t0){const t=performance.now();PS.cur[i]+=t-t0;return t;}
function perfBegin(){PERF.t0=performance.now();GLC.n=0;PERF.up0=WORLD.st.upms;}
function perfEnd(dt){const k=PERF.i,ms=dt*1000,js=performance.now()-PERF.t0;PERF.ft[k]=ms;PERF.js[k]=js;PERF.draws=GLC.n;PERF.up=(PERF.up||0)*.95+(WORLD.st.upms-PERF.up0)*.05;PERF.i=(k+1)%240;PERF.n=Math.min(240,PERF.n+1);
  if(ms>30&&PERF.n>30&&PS.prevX&&GAME.state==='drive')PS.spike={ms,js:PS.jsPrev,s:Array.from(PS.prev),x:PS.prevX,at:APP.t};
  const X=[PS.sub,PS.mk,PS.tl];
  for(let i=0;i<10;i++){PS.avg[i]+=(PS.cur[i]-PS.avg[i])*.05;PS.prev[i]=PS.cur[i];PS.cur[i]=0;}
  for(let i=0;i<3;i++)PS.avgX[i]+=(X[i]-PS.avgX[i])*.05;
  PS.prevX=X;PS.jsPrev=js;PS.sub=0;PS.mk=0;PS.tl=0;}
/* (short rows: a phone held sideways shows about sixty characters of the overlay) */
function psRows(){
  const f=(a,i)=>PSN[i]+' '+a[i].toFixed(1),A=PS.avg,rows=[],SEC=[0,1,2,3,4,5,6,9,7];
  rows.push('MS A FRAME  '+[0,1,2,3].map(i=>f(A,i)).join('  '));
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
    (()=>{const P=perfStats();return P?`FRAME ${P.avg.toFixed(1)} MS  1% LOW ${(1000/P.low1).toFixed(0)} FPS  JS ${P.js.toFixed(1)} MS  DRAWS ${PERF.draws}`:'';})(),
    `GRAPHICS ${GFX.level.toUpperCase()}  ${DISP.mode.toUpperCase()} ${DISP.mode==='dots'?BW+'X'+BH:''}  SCENE ${SC.w||0}X${SC.h||0}  HUD ${BW}X${BH}`,
    `PASSES OFF: ${Object.keys(DEVW.off).filter(k=>DEVW.off[k]).join(' ').toUpperCase()||'NONE'}`,
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
  segButtons($('dHud'),[['off','Off'],['on','On']],v=>{DEVW.hud=v==='on';saveDev();});
  segButtons($('dView'),[['near','Near'],['normal','Normal'],['far','Far']],v=>{DEVW.view=v;saveDev();});
  segButtons($('dText'),[['smooth','Smooth'],['dots','Dots']],v=>{setDotText(v==='dots');syncDevWorld();});
  segButtons($('dGen'),[['worker','Worker'],['main','Main thread']],v=>{DEVW.gen=v;saveDev();if(v==='main'){WORLD.forceLocal=true;workerDown();}else{WORLD.forceLocal=false;WORLD.mode='starting';}syncDevWorld();});
  segButtons($('dCruise'),[['off','Off'],['max','Flat out'],['fast','100 mph'],['road','70 mph']],v=>{DEVW.cruise=v;if(v!=='off')DEVW.lastCruise=v;CRUISE.on=v!=='off';CRUISE.line=null;saveDev();});
  /* passes off, one at a time, to read the GPU's share by subtraction on a phone */
  const po=$('dPasses');for(const [k,n] of [['shadows','Sun shadows'],['refl','Reflections'],['far','Far land'],['trees','Trees'],['fx','Dust and spray'],['post','Light in the air and occlusion']]){
    const el=document.createElement('label');el.className='devchk';el.innerHTML='<input type="checkbox"><span><b></b></span>';el.querySelector('b').textContent=n;
    const cb=el.querySelector('input');cb.checked=!!DEVW.off[k];cb.addEventListener('change',()=>{DEVW.off[k]=cb.checked;if(k==='refl'||k==='shadows'){PRB.fresh=true;CSM.fresh=true;}saveDev();});po.appendChild(el);}
  $('dReset').addEventListener('click',()=>{const S=WORLD.st;S.n=[0,0,0];S.ms=[0,0,0];S.mx=[0,0,0];S.sn=0;S.sms=0;S.smx=0;S.fn=0;S.fms=0;S.missT=0;S.odo=0;S.top=0;syncDevWorld();});
}
function syncDevWorld(){
  for(const [id,v] of [['dText',TXT.on?'smooth':'dots'],['dHud',DEVW.hud?'on':'off'],['dView',DEVW.view],['dGen',DEVW.gen],['dCruise',CRUISE.on?DEVW.cruise:'off']])for(const el of $(id).children)el.setAttribute('aria-pressed',el.dataset.v===v?'true':'false');
  const S=WORLD.st;$('dNote').textContent=`Made on: ${WORLD.mode}. ${WORLD.chunks.size} chunks and ${WORLD.far.size} far tiles loaded, ${(S.bytes/1048576).toFixed(1)} MB of them on the graphics card. `+
    `The world is ${WG.HALF*2/1609.34|0} miles square; the garage is in the middle, Route 6 runs straight east and west through it.`;
}
