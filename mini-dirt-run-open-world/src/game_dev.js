/* ---------- the developer's panel: the world's own numbers, how far it's drawn, worker or not, a cruise
   control that holds the road (for the long straight runs), the handling knobs and the Sim switches ---------- */
const DEVW={hud:false,view:'normal',gen:'worker',cruise:'off',lastCruise:'max',rear:1,steerK:1};
try{const d=JSON.parse(store.get('mdow-dev','{}'))||{};for(const k of Object.keys(DEVW))if(d[k]!==undefined)DEVW[k]=d[k];
  if(d.sim)for(const k in d.sim)if(k in SIMDEV&&typeof d.sim[k]==='number')SIMDEV[k]=d.sim[k];}catch(e){}
DEVW.cruise='off';if(DEVW.gen==='main')WORLD.forceLocal=true;
const saveDev=()=>store.set('mdow-dev',JSON.stringify(Object.assign({},DEVW,{cruise:'off',sim:SIMDEV})));
const devTune=()=>DEVW.rear===1&&DEVW.steerK===1?null:{rear:DEVW.rear,steer:DEVW.steerK};
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
/* the world's numbers on the screen (F) */
function drawWorldStats(){
  const S=WORLD.st,t=GAME.car,av=l=>S.n[l]?(S.ms[l]/S.n[l]).toFixed(1):'-',x0=5+hudInset()[0];let y=Math.round(H*.4);
  const rows=['WORLD MADE ON: '+WORLD.mode.toUpperCase()+(CRUISE.on?'   CRUISE '+CRUISE_N[DEVW.cruise].toUpperCase():''),
    `CHUNKS ${WORLD.chunks.size}  FAR TILES ${WORLD.far.size}  WAITING ${S.queue}  MAKING ${WORLD.inflight}`,
    `MS EACH  2M ${av(0)}  4M ${av(1)}  8M ${av(2)}  ITEMS ${S.sn?(S.sms/S.sn).toFixed(1):'-'}  FAR ${S.fn?(S.fms/S.fn).toFixed(1):'-'}`,
    `WORST  2M ${S.mx[0].toFixed(0)} MS  ITEMS ${S.smx.toFixed(0)} MS  MAKER BUSY ${Math.min(999,S.genRate/10).toFixed(0)}%`,
    `GPU ${(S.bytes/1048576).toFixed(1)} MB  ${Math.round(APP.tris/1000)}K TRIS  ${APP.fps.toFixed(0)} FPS`,
    `HOLES ${S.holes}  GROUND NOT READY ${S.missT} FRAMES`,
    `${(Math.hypot(t.p[0],t.p[2])/1609.34).toFixed(2)} MI FROM THE GARAGE  TRIP ${(S.odo/1609.34).toFixed(1)} MI  TOP ${Math.round(S.top*2.237)} MPH`];
  hRect(x0-2,y-2,Math.max(...rows.map(r=>tw3(r)))+4,rows.length*7+3,pack(0,0,0,160));
  for(const r of rows){txt3(r,x0,y,PAL.ink);y+=7;}
}
function devRow(host,label,get,set,min,max,stepv,fmtv,note){
  const el=document.createElement('div');el.className='devrow';const id='dv'+Math.random().toString(36).slice(2,8);
  el.innerHTML=`<label for="${id}"></label><output></output><input id="${id}" type="range"><small></small>`;
  el.querySelector('label').textContent=label;el.querySelector('small').textContent=note||'';
  const inp=el.querySelector('input'),out=el.querySelector('output');inp.min=min;inp.max=max;inp.step=stepv;
  const show=()=>{inp.value=get();out.textContent=fmtv(get());};
  inp.addEventListener('input',()=>{set(+inp.value);out.textContent=fmtv(+inp.value);});
  host.appendChild(el);return show;
}
const DEV_SYNC=[];
const SIM_SW=[['jack','Load transfer through the links'],['trip','Soil trip (sliding tyres dig in)'],['edge','Edge catch (kerbs and rut walls)'],['shocks','Shocks: digressive, fade when hot'],
  ['cg','Roof loads raise the centre of gravity'],['fade','Brake fade'],['body','Body friction per surface'],['abs','ABS only on the cars that had it'],['press','Tyre pressure'],['wet','Wet grip by surface']];
function buildDev(){
  segButtons($('dHud'),[['off','Off'],['on','On']],v=>{DEVW.hud=v==='on';saveDev();});
  segButtons($('dView'),[['near','Near'],['normal','Normal'],['far','Far']],v=>{DEVW.view=v;saveDev();});
  segButtons($('dGen'),[['worker','Worker'],['main','Main thread']],v=>{DEVW.gen=v;saveDev();if(v==='main'){WORLD.forceLocal=true;workerDown();}else{WORLD.forceLocal=false;WORLD.mode='starting';}});
  segButtons($('dCruise'),[['off','Off'],['max','Flat out'],['fast','100 mph'],['road','70 mph']],v=>{DEVW.cruise=v;if(v!=='off')DEVW.lastCruise=v;CRUISE.on=v!=='off';CRUISE.line=null;saveDev();});
  $('dReset').addEventListener('click',()=>{const S=WORLD.st;S.n=[0,0,0];S.ms=[0,0,0];S.mx=[0,0,0];S.sn=0;S.sms=0;S.smx=0;S.fn=0;S.fms=0;S.missT=0;S.odo=0;S.top=0;syncDev();});
  const pct=v=>Math.round(v*100)+'%',tu=$('dTune');
  DEV_SYNC.push(devRow(tu,'Back-end grip',()=>DEVW.rear,v=>{DEVW.rear=v;if(GAME.car)GAME.car.tune=devTune();saveDev();},.5,1.5,.05,pct,'The rear tyres only. Under 100% the back steps out sooner.'));
  DEV_SYNC.push(devRow(tu,'Steering at speed',()=>DEVW.steerK,v=>{DEVW.steerK=v;if(GAME.car)GAME.car.tune=devTune();saveDev();},.5,2,.05,pct,'How much lock the wheel gives once you\'re moving.'));
  const sw=$('dSim');
  for(const [k,n] of SIM_SW){const el=document.createElement('label');el.className='devchk';el.innerHTML='<input type="checkbox"><span><b></b></span>';el.querySelector('b').textContent=n;
    const cb=el.querySelector('input');cb.addEventListener('change',()=>{SIMDEV[k]=cb.checked?1:0;saveDev();if(k==='cg')spawnRig();else if(GAME.car&&GAME.car.applySim)GAME.car.applySim();});
    DEV_SYNC.push(()=>{cb.checked=!!SIMDEV[k];});sw.appendChild(el);}
  const sk=$('dSimK'),f2=v=>(+v).toFixed(2);
  for(const [k,n,a,b,st,note] of [['ls','Tyre load sensitivity',.1,.5,.01,'0.30 as built. Lower holds more grip on a loaded tyre.'],['plow','Soil trip strength',0,2,.05,'How hard loose dirt pushes back on a sliding tyre.'],
    ['arb','Sway bars',.5,2,.05,''],['damp','Shocks',.5,2,.05,''],['pv0','Trip starts at (m/s sideways)',1,6,.1,''],['pa0','Trip starts at (slip)',.2,1.2,.02,'']])
    DEV_SYNC.push(devRow(sk,n,()=>SIMDEV[k],v=>{SIMDEV[k]=v;saveDev();},a,b,st,f2,note));
  $('dSimReset').addEventListener('click',()=>{Object.assign(SIMDEV,SIMDEV0);saveDev();spawnRig();syncDev();});
}
function syncDev(){
  for(const [id,v] of [['dHud',DEVW.hud?'on':'off'],['dView',DEVW.view],['dGen',DEVW.gen],['dCruise',CRUISE.on?DEVW.cruise:'off']])for(const el of $(id).children)el.setAttribute('aria-pressed',String(el.dataset.v===v));
  for(const f of DEV_SYNC)f();
  const S=WORLD.st;$('dNote').textContent=`Made on: ${WORLD.mode}. ${WORLD.chunks.size} chunks and ${WORLD.far.size} far tiles loaded, ${(S.bytes/1048576).toFixed(1)} MB of them on the GPU. `+
    `The world is ${WG.HALF*2/1609.34|0} miles square; the garage is in the middle, Route 6 runs straight east and west through it.`;
}
