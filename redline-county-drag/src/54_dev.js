/* =====================================================================================
   THE DEVELOPER PANEL: traction and handling, for tuning while the game is made.
   Traction is the ground, not the cars. It sets how much grip each surface gives, and every car feels that
   through its own tyres (the physics multiplies a tread's grip on a surface by the ground's), so the cars
   keep their order on every surface whatever the setting: on dirt the drag car's slicks always have less
   grip than the crawler's mud tyres, and on the prepped strip always more. The handling knobs work on every
   car the same way, each from its own setup.
   ===================================================================================== */
/* DEV: set to false to ship; the panel, the T key and the HUD tag go away and everything drives on the defaults */
const DEV=true;
/* the ground, surface by surface: id, label, where it is */
const DEV_GROUND=[['asphalt','Tarmac','The race track and its kerbs.'],['concrete','Concrete','The shop pad, the store apron and the paddock.'],
  ['strip','Drag strip','The prepped dirt of the eighth mile.'],['dirt','Dirt','The yard, the ranch roads and the burnout pad.'],
  ['gravel','Gravel','The county roads, the track\'s gravel traps and the yard at home.'],['trail','Trail','The trail loop, the hill climb and the woods trails.'],
  ['grass','Grass','The open fields and the verges.'],['rock','Rock','The rock garden and the rocky ground.'],
  ['mud','Mud','The mud pit, the mud track and the edge of the pond.'],['ruts','Ruts','The lane\'s muddy ruts.'],['water','Water','The creek crossings and the pond.']];
/* the handling knobs: id, label, min, max, note */
const DEV_CAR=[['rear','Back-end grip',.7,1.4,'Every car\'s rear tyres, from their own grip. Up: the tail holds and the car pushes wide. Down: the tail steps out sooner.'],
  ['slide','Grip once sliding',.8,1.25,'How much grip a tyre keeps once it breaks loose, from its own. Up makes slides gentler and easier to catch.'],
  ['steer','Steering at speed',.7,2,'How far full steering turns the wheels at speed, from each car\'s own. Up turns harder and slides sooner.']];
/* Back Forty: the owner plays at 200% traction every time, so that is where it starts (and what Reset goes back to);
   T steps 100, 150, 200 */
const DEV_ALL=[.5,2],DEV_SURF=[.3,1.8],DEV_STEPS=[1,1.5,2],DEV_ALL0=2;
/* the settings; car is the tune every car reads, grip is the ground's grip the world reads (all times each surface) */
const DEV_T={all:DEV_ALL0,ground:{},car:{rear:1,slide:1,steer:1}},DEV_GRIP={};
for(const [k] of DEV_GROUND)DEV_T.ground[k]=1;
const devClamp=(v,[lo,hi])=>Math.max(lo,Math.min(hi,+v||1));
function devCalc(){for(const [k] of DEV_GROUND)DEV_GRIP[k]=DEV_T.all*DEV_T.ground[k];}
function devLoad(){
  if(DEV)try{const d=JSON.parse(store.get('cc-tune','{}'))||{};
    if(d.all!==undefined)DEV_T.all=devClamp(d.all,DEV_ALL);
    for(const [k] of DEV_GROUND)if(d.ground&&d.ground[k]!==undefined)DEV_T.ground[k]=devClamp(d.ground[k],DEV_SURF);
    for(const [k,,lo,hi] of DEV_CAR)if(d.car&&d.car[k]!==undefined)DEV_T.car[k]=devClamp(d.car[k],[lo,hi]);}catch(e){}
  devCalc();
}
devLoad();
const devSave=()=>store.set('cc-tune',JSON.stringify(DEV_T));
/* a new car drives on the panel's ground and handling */
function devFit(t){if(!DEV)return;t.tune=DEV_T.car;t.applyTune();t.world.grip=DEV_GRIP;}
function devApply(){devCalc();if(GAME.car)GAME.car.applyTune();devSave();syncDev();}
const off1=v=>Math.abs(v-1)>1e-6;
/* the Sim level's pieces, each on or off, and its strengths (43_sim's SIMDEV); saved on the device */
const DEV_SIM_T=[['jack','True load transfer','The suspension links carry their share of the weight transfer, so the outside tyres take all of it and the car tips at its real stability factor.'],
  ['trip','Soil trip','A tyre sliding sideways over dirt, gravel, grass or mud digs in and pushes back at the ground: the tripped rollover.'],
  ['edge','Edge catch','Kerbs, rut walls and ledges catch a sliding tyre\'s sidewall.'],
  ['shocks','Real shocks','Firmer at low shaft speed, softer over sharp hits, and fading when they get hot.'],
  ['cg','Roof load','Racks, cages, spares and roof cargo raise the centre of gravity (rebuilds the car).'],
  ['fade','Brake fade','Rotors heat up; past the pads\' range the brakes give less.'],
  ['body','Body grip','A roof skids on tarmac and digs into dirt and mud.'],
  ['abs','ABS by era','The 1970 car and the 1980s hatches have no ABS.'],
  ['press','Tyre pressure','The Tyres setting on the Sim card.'],
  ['wet','Weather grip','The Weather setting on the Sim card changes the grip.']];
const DEV_SIM_S=[['ls','Tyre load sensitivity',.12,.45,'How much grip per kilo a heavily loaded tyre gives up. Lower: more total grip in a turn, easier to tip and to spin. 0.30 is how the cars were tuned.',v=>v.toFixed(2)],
  ['plow','Soil trip strength',0,2,'How hard loose ground pushes back on a tyre sliding sideways.',v=>Math.round(v*100)+'%'],
  ['arb','Sway bars',.3,1.5,'Every car\'s anti-roll bars. Down: more body roll and a bigger swing in a quick swerve.',v=>Math.round(v*100)+'%'],
  ['damp','Shocks',.5,1.6,'Every car\'s damping. Down: the body overshoots its lean and wallows.',v=>Math.round(v*100)+'%']];
function simDevLoad(){try{const d=JSON.parse(store.get('cc-simdev','{}'))||{};for(const k in SIMDEV0)if(typeof d[k]==='number')SIMDEV[k]=d[k];}catch(e){}}
if(DEV)simDevLoad();
const simDevOff=()=>Object.keys(SIMDEV0).some(k=>Math.abs(SIMDEV[k]-SIMDEV0[k])>1e-6);
/* the HUD's tag while anything is off the defaults: TRACTION 125%, with + when more than that has changed */
function devTag(){
  if(!DEV)return '';
  const more=DEV_GROUND.some(([k])=>off1(DEV_T.ground[k]))||DEV_CAR.some(([k])=>off1(DEV_T.car[k]))||APP.level==='sim'&&simDevOff();
  return Math.abs(DEV_T.all-DEV_ALL0)>.005?'TRACTION '+Math.round(DEV_T.all*100)+'%'+(more?' +':''):more?'DEV':'';
}
/* T while driving: Traction through 75, 100, 125 and 150% */
function devStep(){const i=DEV_STEPS.findIndex(v=>Math.abs(v-DEV_T.all)<.01);DEV_T.all=DEV_STEPS[(i+1)%DEV_STEPS.length];devApply();return DEV_T.all;}

/* ---------- the panel ---------- */
const pct=v=>Math.round(v*100)+'%';
let DEV_SEE=null;const DEV_LADDER=new Map();
/* a build's driven tyres on each surface as built: peak grip times its tread's grip there (kept per build) */
function devGrips(i){
  if(DEV_LADDER.has(i))return DEV_LADDER.get(i);
  const c=buildChassis(i),d=specOf(i).drv,f=c.tyre,r=c.tyreR||c.tyre,mf=c.surfMu,mr=c.surfMuR||c.surfMu,g={};
  for(const [k] of DEV_GROUND){const a=f.mu*mf[k],z=r.mu*mr[k];g[k]=d==='FWD'?a:d==='RWD'?z:(a+z)/2;}
  DEV_LADDER.set(i,g);return g;
}
/* the ladder's rows: every car's factory presets as rigs, and the car being driven if the garage has changed it */
function devLadderBase(){
  const rows=[];
  for(const id of Object.keys(PRESET_PARTS)){const b=BUILDS.find(q=>q.id===id),i=rigBuild(b.car,presetRig(id));rows.push({i,name:carName(b)+' '+b.name,g:devGrips(i)});}
  if(!rows.some(r=>r.i===APP.bi))rows.push({i:APP.bi,name:carLabel(),g:devGrips(APP.bi)});
  return rows;
}
/* the surface under the car's tyres */
function devUnder(){const t=GAME.car;if(!t)return 'dirt';const n={};let best='dirt',m=0;
  for(const w of t.wheels)if(w.contact&&DEV_T.ground[w.surf]!==undefined&&(n[w.surf]=(n[w.surf]||0)+1)>m){m=n[w.surf];best=w.surf;}
  return best;}
function slider(host,id,label,note,min,max,get,set){
  const el=document.createElement('div');el.className='devrow';
  el.innerHTML='<label></label><output></output><input type="range"><small></small>';
  const inp=el.querySelector('input'),lb=el.querySelector('label');
  lb.textContent=label;lb.htmlFor=inp.id='dev_'+id;inp.min=min;inp.max=max;inp.step=.01;el.querySelector('small').textContent=note;
  inp.addEventListener('input',()=>{set(+inp.value);devApply();});
  el.sync=()=>{inp.value=get();el.querySelector('output').textContent=pct(get());};
  host.appendChild(el);return el;
}
const DEV_ROWS=[];
function buildDev(){
  if(!DEV)return;
  $('mDev').hidden=false;$('tabDev').hidden=false;
  DEV_ROWS.push(slider($('mDevAll'),'all','Traction','The ground on every surface, for every car. 100% is the physics as tuned; the game starts at 200%, the way you play it.',...DEV_ALL,()=>DEV_T.all,v=>DEV_T.all=v));
  /* the Plus tune: power and gearing, applied a moment after you let go (the car is rebuilt where it stands) */
  const plusSet=()=>{savePlus();clearTimeout(PLUS.tm);PLUS.tm=setTimeout(()=>{if(PLUS.on[APP.car])spawnRig();if(typeof syncMenu==='function')syncMenu();},400);};
  DEV_ROWS.push(slider($('mDevAll'),'plus','Plus power','How much power the Plus button adds, on top of the build. 115% to start. Power alone adds little top speed where the redline holds a car back (most of them), and only about a third of itself where the air does.',1.05,1.6,
    ()=>PLUS.k,v=>{PLUS.k=Math.round(v*100)/100;plusSet();}));
  DEV_ROWS.push(slider($('mDevAll'),'plusg','Plus gearing','How much taller the Plus button makes the final drive: the same revs, more speed in every gear. 115% to start. With 115% power that is 4 to 16% more top speed and as quick or quicker off the line; with about 150% power, close to 15% more top speed for everything.',1,1.3,
    ()=>PLUS.g,v=>{PLUS.g=Math.round(v*100)/100;plusSet();}));
  for(const [k,n,note] of DEV_GROUND)DEV_ROWS.push(slider($('mDevSurf'),k,n,note,...DEV_SURF,()=>DEV_T.ground[k],v=>DEV_T.ground[k]=v));
  for(const [k,n,lo,hi,note] of DEV_CAR)DEV_ROWS.push(slider($('mDevCar'),k,n,note,lo,hi,()=>DEV_T.car[k],v=>DEV_T.car[k]=v));
  const pk=$('mDevPick');
  for(const [k,n] of DEV_GROUND){const el=document.createElement('button');el.type='button';el.className='place';el.dataset.k=k;el.textContent=n;
    el.addEventListener('click',()=>{DEV_SEE=k;syncDev();});pk.appendChild(el);}
  $('mDevReset').addEventListener('click',()=>{DEV_T.all=DEV_ALL0;for(const [k] of DEV_GROUND)DEV_T.ground[k]=1;for(const [k] of DEV_CAR)DEV_T.car[k]=1;devApply();});
  /* the Sim pieces */
  const st=$('mDevSimT');
  for(const [k,n,note] of DEV_SIM_T){const el=document.createElement('label');el.className='devchk';el.innerHTML='<input type="checkbox"><span><b></b><small></small></span>';
    const inp=el.querySelector('input');el.querySelector('b').textContent=n;el.querySelector('small').textContent=note;
    inp.addEventListener('change',()=>{SIMDEV[k]=inp.checked?1:0;simDevApply(k==='cg');});el.sync=()=>{inp.checked=!!SIMDEV[k];};st.appendChild(el);DEV_ROWS.push(el);}
  const ss=$('mDevSimS');
  for(const [k,n,lo,hi,note,fm] of DEV_SIM_S){const el=document.createElement('div');el.className='devrow';el.innerHTML='<label></label><output></output><input type="range"><small></small>';
    const inp=el.querySelector('input'),lb=el.querySelector('label');lb.textContent=n;lb.htmlFor=inp.id='devs_'+k;inp.min=lo;inp.max=hi;inp.step=.01;el.querySelector('small').textContent=note;
    inp.addEventListener('input',()=>{SIMDEV[k]=+inp.value;simDevApply(false);});el.sync=()=>{inp.value=SIMDEV[k];el.querySelector('output').textContent=fm(SIMDEV[k]);};ss.appendChild(el);DEV_ROWS.push(el);}
  $('mDevSimReset').addEventListener('click',()=>{const cg=SIMDEV.cg!==SIMDEV0.cg;Object.assign(SIMDEV,SIMDEV0);simDevApply(cg);});
}
/* a Sim piece changed: the car reads it now (the roof load rebuilds the car where it stands) */
function simDevApply(rebuild){store.set('cc-simdev',JSON.stringify(SIMDEV));if(rebuild&&APP.level==='sim')spawnRig();else if(GAME.car)GAME.car.applySim();syncDev();}
function syncDev(){
  if(!DEV||!DEV_ROWS.length)return;
  for(const r of DEV_ROWS)r.sync();
  /* the ladder: every car's driven tyres on one surface, on the ground as it is set now */
  const s=DEV_SEE||devUnder(),gr=DEV_GRIP[s],rows=devLadderBase().map(r=>({i:r.i,name:r.name,v:r.g[s]*gr})).sort((a,b)=>b.v-a.v),top=Math.max(1,rows[0].v);
  for(const el of $('mDevPick').children)el.setAttribute('aria-pressed',String(el.dataset.k===s));
  const name=DEV_GROUND.find(g=>g[0]===s)[1];
  $('mDevLadderHead').textContent=`Grip of each car's driven tyres on ${name.toLowerCase()}, with the ground at ${pct(gr)}`;
  const L=$('mDevLadder');L.textContent='';
  for(const r of rows){const el=document.createElement('div');el.className='lrow'+(r.i===APP.bi?' me':'');
    el.innerHTML='<span></span><i><em></em></i><b></b>';el.querySelector('span').textContent=r.name;
    el.querySelector('em').style.width=(r.v/top*100).toFixed(1)+'%';el.querySelector('b').textContent=r.v.toFixed(2);L.appendChild(el);}
  $('mDevNote').textContent=devTag()?'Saved on this device.':'';
  $('mDevSim').hidden=APP.level!=='sim';
}
