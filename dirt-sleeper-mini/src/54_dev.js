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
const DEV_ALL=[.5,2],DEV_SURF=[.3,1.8],DEV_STEPS=[.75,1,1.25,1.5];
/* the settings; car is the tune every car reads, grip is the ground's grip the world reads (all times each surface) */
const DEV_T={all:1,ground:{},car:{rear:1,slide:1,steer:1}},DEV_GRIP={};
for(const [k] of DEV_GROUND)DEV_T.ground[k]=1;
const devClamp=(v,[lo,hi])=>Math.max(lo,Math.min(hi,+v||1));
function devCalc(){for(const [k] of DEV_GROUND)DEV_GRIP[k]=DEV_T.all*DEV_T.ground[k];}
function devLoad(){
  if(DEV)try{const d=JSON.parse(store.get('dsmini-tune','{}'))||{};
    if(d.all!==undefined)DEV_T.all=devClamp(d.all,DEV_ALL);
    for(const [k] of DEV_GROUND)if(d.ground&&d.ground[k]!==undefined)DEV_T.ground[k]=devClamp(d.ground[k],DEV_SURF);
    for(const [k,,lo,hi] of DEV_CAR)if(d.car&&d.car[k]!==undefined)DEV_T.car[k]=devClamp(d.car[k],[lo,hi]);}catch(e){}
  devCalc();
}
devLoad();
const devSave=()=>store.set('dsmini-tune',JSON.stringify(DEV_T));
/* a new car drives on the panel's ground and handling */
function devFit(t){if(!DEV)return;t.tune=DEV_T.car;t.applyTune();t.world.grip=DEV_GRIP;}
function devApply(){devCalc();if(GAME.car)GAME.car.applyTune();devSave();syncDev();}
const off1=v=>Math.abs(v-1)>1e-6;
/* the HUD's tag while anything is off the defaults: TRACTION 125%, with + when more than that has changed */
function devTag(){
  if(!DEV)return '';
  const more=DEV_GROUND.some(([k])=>off1(DEV_T.ground[k]))||DEV_CAR.some(([k])=>off1(DEV_T.car[k]));
  return off1(DEV_T.all)?'TRACTION '+Math.round(DEV_T.all*100)+'%'+(more?' +':''):more?'DEV':'';
}
/* T while driving: Traction through 75, 100, 125 and 150% */
function devStep(){const i=DEV_STEPS.findIndex(v=>Math.abs(v-DEV_T.all)<.01);DEV_T.all=DEV_STEPS[(i+1)%DEV_STEPS.length];devApply();return DEV_T.all;}

/* ---------- the panel ---------- */
const pct=v=>Math.round(v*100)+'%';
let DEV_SEE=null,DEV_LADDER=null;
/* each build's driven tyres on each surface as built: peak grip times its tread's grip there */
function devLadderBase(){
  if(DEV_LADDER)return DEV_LADDER;
  DEV_LADDER=BUILDS.map((b,i)=>{const c=buildChassis(i),d=specOf(i).drv,f=c.tyre,r=c.tyreR||c.tyre,mf=c.surfMu,mr=c.surfMuR||c.surfMu,g={};
    for(const [k] of DEV_GROUND){const a=f.mu*mf[k],z=r.mu*mr[k];g[k]=d==='FWD'?a:d==='RWD'?z:(a+z)/2;}
    return {i,name:carName(b)+' '+b.name,g};});
  return DEV_LADDER;
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
  $('mDev').hidden=false;
  DEV_ROWS.push(slider($('mDevAll'),'all','Traction','The ground on every surface, for every car. 100% is the game as tuned.',...DEV_ALL,()=>DEV_T.all,v=>DEV_T.all=v));
  for(const [k,n,note] of DEV_GROUND)DEV_ROWS.push(slider($('mDevSurf'),k,n,note,...DEV_SURF,()=>DEV_T.ground[k],v=>DEV_T.ground[k]=v));
  for(const [k,n,lo,hi,note] of DEV_CAR)DEV_ROWS.push(slider($('mDevCar'),k,n,note,lo,hi,()=>DEV_T.car[k],v=>DEV_T.car[k]=v));
  const pk=$('mDevPick');
  for(const [k,n] of DEV_GROUND){const el=document.createElement('button');el.type='button';el.className='place';el.dataset.k=k;el.textContent=n;
    el.addEventListener('click',()=>{DEV_SEE=k;syncDev();});pk.appendChild(el);}
  $('mDevReset').addEventListener('click',()=>{DEV_T.all=1;for(const [k] of DEV_GROUND)DEV_T.ground[k]=1;for(const [k] of DEV_CAR)DEV_T.car[k]=1;devApply();});
}
function syncDev(){
  if(!DEV||!DEV_ROWS.length)return;
  for(const r of DEV_ROWS)r.sync();
  /* the ladder: every car's driven tyres on one surface, on the ground as it is set now */
  const s=DEV_SEE||devUnder(),gr=DEV_GRIP[s],rows=devLadderBase().map(r=>({i:r.i,name:r.name,v:r.g[s]*gr})).sort((a,b)=>b.v-a.v),top=Math.max(1,rows[0].v);
  for(const el of $('mDevPick').children)el.setAttribute('aria-pressed',String(el.dataset.k===s));
  const name=DEV_GROUND.find(g=>g[0]===s)[1];
  $('mDevLadderHead').textContent=`Grip of each car's driven tyres on ${name.toLowerCase()}, with the ground at ${pct(gr)}`;
  const L=$('mDevLadder');L.textContent='';
  for(const r of rows){const el=document.createElement('div');el.className='lrow'+(r.i===APP.build?' me':'');
    el.innerHTML='<span></span><i><em></em></i><b></b>';el.querySelector('span').textContent=r.name;
    el.querySelector('em').style.width=(r.v/top*100).toFixed(1)+'%';el.querySelector('b').textContent=r.v.toFixed(2);L.appendChild(el);}
  $('mDevNote').textContent=devTag()?'Saved on this device.':'';
}
