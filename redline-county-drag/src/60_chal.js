/* =====================================================================================
   THE CHALLENGES (City Limits', moved onto this map): where each one is, what it asks, a run at one, the
   medals and the pay. Kinds: sprint (the gates in order), laps, a standing quarter (or eighth), the speed
   trap, the flying mile, big air (the longest flight off a ramp), and a drift zone (points in a minute).
   A column of light marks each start (cyan, gold once you hold the gold): stop in it and start, or pick one
   from the Challenges tab. During a run the next gate is lit, an arrow points to it, and the clock runs.
   Medal times come from robots (tools/chal_par.py): bronze a little slower than the stock SUV, gold a
   little slower than the build made for that ground (CH_PARS). The career keeps its medals and bests in
   its own save and pays real money; free play keeps its own (cc-fchal) and pays into the score.
   Map coordinates here are the world's: x east, z south.
   ===================================================================================== */
const CH_MEDALS=[['gold','Gold','#ffd23f'],['silver','Silver','#c8d0dc'],['bronze','Bronze','#d88b4a']];
/* first-time pay for gold, silver, bronze by tier; a better medal later pays the difference, a repeat a tenth */
const CH_PAY={1:[1600,1000,600],2:[2600,1700,1000],3:[4000,2700,1700]};
const CH_KINDS={sprint:'Sprint',lap:'Laps',drag:'Standing start',trap:'Speed trap',mile:'Flying mile',jump:'Big air',drift:'Drift zone'};
/* the robots' results (s, m/s or m): the stock SUV and the build made for that ground (tools/chal_drive.py pars, Oct 31).
   e: estimated where the robot couldn't finish in the fast build (its stock time x .88). The Outer Loop's robots ran
   capped at 26 m/s on its dirt (it flew off the S-bend in the woods uncapped); the full lap is the round-3 robot lap. */
const CH_PARS={
  loop:{stock:169.52,best:137.18},quarter:{stock:15.32,best:9.35},eighth:{stock:9.55,best:6.58},dash:{stock:61.4,best:58.85},salt:{stock:59.73,best:38.37},
  bog:{stock:18.8,best:14.5},oval:{stock:110.23,best:102.82},short:{stock:179.72,best:169.43},
  mudtrack:{stock:165.78,best:145.9,e:1},ridge:{stock:73.68,best:64.8,e:1},wash:{stock:114,best:100.3,e:1},
  loopN:{stock:84.13,best:80.27},loopLap:{stock:657.9,best:579,e:1},
  trap:{stock:50.42,best:88.84},mile:{stock:54.4,best:92.94},jump:{stock:94.52,best:182.31}};
/* ---------- polylines ([x, z]) ---------- */
const chL=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
function chResample(pts,ds=2,closed=false){
  const P=closed?[...pts,pts[0]]:pts,out=[P[0].slice()];let carry=0;
  for(let i=1;i<P.length;i++){const a=P[i-1],b=P[i],l=chL(a,b);if(l<1e-6)continue;let t=ds-carry;
    while(t<=l){out.push([a[0]+(b[0]-a[0])*t/l,a[1]+(b[1]-a[1])*t/l]);t+=ds;}carry=l-(t-ds);}
  if(!closed&&chL(out[out.length-1],P[P.length-1])>ds*.3)out.push(P[P.length-1].slice());
  if(closed&&chL(out[out.length-1],out[0])<ds*.5)out.pop();
  return out;}
function chSmooth(pts,w){const n=pts.length;return pts.map((p,i)=>{if(i<w||i>=n-w)return p;let x=0,z=0;for(let k=-w;k<=w;k++){x+=pts[i+k][0];z+=pts[i+k][1];}return [x/(2*w+1),z/(2*w+1)];});}
const chLen=(pts,closed)=>{let s=0;for(let i=1;i<pts.length;i++)s+=chL(pts[i-1],pts[i]);return s+(closed?chL(pts[pts.length-1],pts[0]):0);};
/* gates along a route: every so many metres (and at any extra distances), r the radius that counts as through */
function chGates(route,closed,every,r,extra=[]){
  const n=route.length,cum=[0];for(let i=1;i<n;i++)cum.push(cum[i-1]+chL(route[i-1],route[i]));const tot=cum[n-1]+(closed?chL(route[n-1],route[0]):0);
  const at=s=>{let i=0;while(i<n-1&&cum[i+1]<s)i++;const p=route[i],q=route[Math.min(n-1,i+1)],l=Math.max(1e-6,(cum[i+1]??tot)-cum[i]),t=Math.min(1,Math.max(0,(s-cum[i])/l));
    const dx=q[0]-p[0],dz=q[1]-p[1],dl=Math.hypot(dx,dz)||1;return {x:p[0]+dx*t,z:p[1]+dz*t,dx:dx/dl,dz:dz/dl,s};};
  const ss=new Set(extra.map(Math.round));const k=Math.max(1,Math.round(tot/every));for(let i=1;i<=k;i++)ss.add(Math.round(closed&&i===k?tot:tot*i/k));
  return [...ss].sort((a,b)=>a-b).map(s=>Object.assign(at(Math.min(s,tot-.01)),{r,s}));}
/* where a run starts: the route's first point, moved across to its lane (positive right), facing down it */
function chStart(route,lane=0,back=0){const a=route[0],b=route[Math.min(route.length-1,6)],dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1,ux=dx/l,uz=dz/l;
  return {x:a[0]-uz*lane-ux*back,z:a[1]+ux*lane-uz*back,yaw:Math.atan2(-uz,ux),dx:ux,dz:uz};}
/* medals from the robots' runs (CH_PARS): for a time, bronze 12% over the stock SUV, gold 4% over the build made for
   that ground (and at least 3% under the stock SUV), silver between; for a speed or a distance, bronze 6% under the
   stock SUV, gold 3% under the build (and at least 3% over the stock SUV) */
function chMedalsFrom(id,better,dp=1){const p=CH_PARS[id];if(!p||!p.stock)return null;const r=v=>+v.toFixed(dp),best=p.best||p.stock;
  if(better==='low'){const b=p.stock*1.12,g=Math.min(best*1.04,p.stock*.97),s=Math.sqrt(b*g);return [g,s,b].map(r);}
  const b=p.stock*.94,g=Math.max(best*.97,p.stock*1.03),s=(b+g)/2;return [g,s,b].map(v=>+v.toFixed(2));}
/* ---------- the list ---------- */
function buildChallenges(){
  const C=[],K=WG.PKW,O=WG.OL;
  const add=o=>{o.better=o.better||'low';o.unit=o.unit||'time';o.medals=chMedalsFrom(o.id,o.better,o.kind==='drag'?2:1)||o.guess||o.medals;o.len=o.route?chLen(o.route,o.closed):0;C.push(o);return o;};
  const fromPath=(at,s0,s1,ds=2)=>{const out=[],A={};for(let s=s0;s<=s1;s+=ds){at(s,A);out.push([A.x,A.z]);}return out;};
  /* --- town (City Limits' own: the same streets) --- */
  {const S=240,R=120,Q=360,pts=[],x0=-60,seg=(a,b)=>{for(let t=0;t<1;t+=.02)pts.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);},
      arc=(cx,cy,a0)=>{for(let k=0;k<24;k++){const a=a0+k/24*Math.PI/2;pts.push([cx+Math.cos(a)*R,cy+Math.sin(a)*R]);}};
    seg([x0,-Q],[S,-Q]);arc(S,-S,-Math.PI/2);seg([Q,-S],[Q,S]);arc(S,S,0);seg([S,Q],[-S,Q]);arc(-S,S,Math.PI/2);seg([-Q,S],[-Q,-S]);arc(-S,-S,Math.PI);seg([-S,-Q],[x0,-Q]);
    const route=chResample(pts.map(([x,y])=>[x,-y]),2,true);
    add({id:'loop',name:'Limits Loop',kind:'lap',tier:1,where:'Limits Boulevard',laps:2,closed:true,route,lane:6,
      blurb:'Two laps of the boulevard round town, anticlockwise. Wide, fast, four long bends.',gates:chGates(route,true,190,20),best:'coupeGT',guess:[110,125,150]});}
  {const route=chResample([[-220,0],[182.3,0]],2);
    add({id:'quarter',name:'Downtown Quarter',kind:'drag',tier:1,where:'Highway 40, downtown',route,lane:6,
      blurb:'A standing quarter mile east down Highway 40 through downtown, under the street lights. Launch it.',gates:[Object.assign(chGates(route,false,500,12)[0],{finish:true})],best:'sleeper',guess:[11,13,16]});}
  {const route=chSmooth(chResample([[-330,-240],[-120,-240],[-120,-120],[120,-120],[120,120],[240,120],[240,300]],2),5);
    add({id:'dash',name:'Downtown Dash',kind:'sprint',tier:2,where:'Downtown',route,lane:2.4,
      blurb:'Right through the middle of town: six blocks of hard turns from the north side to the south.',gates:chGates(route,false,120,10),best:'coupeGT',guess:[60,70,85]});}
  add({id:'drift',name:'Neon Row Drift',kind:'drift',tier:1,where:'Neon Row',unit:'points',better:'high',time:60,zone:{x:-190,z:120,r:210},
    blurb:'Sixty seconds on Neon Row and the streets round it. Angle and speed score; a wall or a spin takes the chain.',start:{x:-330,z:120,yaw:0},route:null,medals:[14000,8000,3500]});
  /* --- the highway and the roads out --- */
  {const route=chResample([[400,0],[3150,0]],4);
    add({id:'salt',name:'Out to the Salt',kind:'sprint',tier:1,where:'Highway 40 east',route,lane:6,
      blurb:'From the edge of town to the salt, flat out on Highway 40: three kilometres, past Deke\'s and the Loop\'s crossing.',gates:chGates(route,false,300,12),best:'coupeGT',guess:[75,85,100]});}
  {const route=chResample([[-470,0],[-1470,0]],4);
    add({id:'trap',name:'Highway 40 Speed Trap',kind:'trap',tier:2,where:'Highway 40 west',route,lane:6,unit:'speed',better:'high',
      blurb:'A kilometre run-up from the diner, then the radar gun. Only the speed through the trap counts.',gates:[Object.assign(chGates(route,false,5000,13)[0],{trap:true})],best:'wedgeNR',guess:[85,70,55]});}
  {const pts=[];for(let z=-420;z>=-3060;z-=4)pts.push([WG.offNS(0,z),z]);const route=chResample(pts,2);
    add({id:'ridge',name:'Ridge Road',kind:'sprint',tier:2,where:'Ridge Road',route,lane:0,
      blurb:'North on the gravel, down into the hills and through them, over the Loop and out to the salt.',gates:chGates(route,false,200,10),best:'hatchB',guess:[110,130,160]});}
  {const pts=[];for(let z=420;z<=3060;z+=4)pts.push([WG.offNS(0,z),z]);const route=chResample(pts,2);
    add({id:'wash',name:'Wash Road',kind:'sprint',tier:1,where:'Wash Road',route,lane:0,
      blurb:'South on the dirt road, through the mud holes and the dips, all the way to the salt.',gates:chGates(route,false,200,10),best:'hatchB',guess:[120,140,170]});}
  /* --- the Outer Loop --- */
  {const route=fromPath((s,o)=>O.at(s,o),1300,3400);
    add({id:'loopN',name:'The Loop: North Woods',kind:'sprint',tier:2,where:'The Outer Loop',route,lane:0,
      blurb:'Two kilometres of the Outer Loop through the woods in the hills: over North Line Road, the S-bend, two fords and over Ridge Road.',gates:chGates(route,false,150,10),best:'hatchB',guess:[110,130,160]});}
  {const route=fromPath((s,o)=>O.at(s,o),0,O.len-2);
    add({id:'loopLap',name:'The Outer Loop',kind:'lap',tier:3,where:'Round the city',laps:1,closed:true,route,lane:0,
      blurb:'All the way round the city: fourteen kilometres of dirt, the woods and the fords, the salt\'s edge, the esses and the mud by the bog.',gates:chGates(route,true,500,12),best:'hatchB',guess:[560,640,760]});}
  /* --- the bog --- */
  {const B=WG.BOG,route=chResample([[B.x-110,B.z+4],[B.x-40,B.z],[B.x+40,B.z],[B.x+100,B.z-6]],2);
    add({id:'bog',name:'The Bog',kind:'sprint',tier:2,where:'The bog',route,lane:0,
      blurb:'Straight through the middle of the bog south of town. It has eaten bigger trucks than yours.',gates:chGates(route,false,70,9),best:'crawler',guess:[18,26,40]});}
  /* --- the park's tracks --- */
  {const T=K.TRACKS[0],route=fromPath((s,o)=>K.at(T.P,s,o),0,T.P.len-2);
    add({id:'oval',name:'Speedway 25',kind:'lap',tier:1,where:'The off-road park',laps:3,closed:true,route,lane:-2,
      blurb:'Three laps of the banked clay oval, from a standing start on the front straight. Slide it in, get on the gas early.',gates:chGates(route,true,200,14),best:'hatchB',guess:[95,105,125]});}
  {const T=K.TRACKS[1],route=fromPath((s,o)=>K.at(T.P,s,o),0,T.P.len-2);
    add({id:'short',name:'The Short Course',kind:'lap',tier:2,where:'The off-road park',laps:2,closed:true,route,lane:0,
      blurb:'Two laps: the tabletops, the whoops, the banked hairpins and the big sweeper.',gates:chGates(route,true,150,12),best:'hatchB',guess:[170,195,230]});}
  {const T=K.TRACKS[2],route=fromPath((s,o)=>K.at(T.P,s,o),0,T.P.len-2);
    add({id:'mudtrack',name:'The Mud Track',kind:'lap',tier:2,where:'The off-road park',laps:2,closed:true,route,lane:0,
      blurb:'Two laps of the mud: the banked turns, the chicane and the splash. Tyres matter more than horsepower.',gates:chGates(route,true,130,10),best:'crawler',guess:[150,175,210]});}
  {const S=K.ST,route=chResample([[S.start,S.lanes[0]],[S.start+S.eighth,S.lanes[0]]],2);
    add({id:'eighth',name:'Eighth-Mile Dirt Drag',kind:'drag',tier:1,where:'The drag strip',route,lane:0,
      blurb:'A standing eighth mile down the park\'s dirt strip, from the lights.',gates:[Object.assign(chGates(route,false,500,12)[0],{finish:true})],best:'muscleDrag',guess:[8,9.5,11.5]});}
  {const L=K.LOT;
    add({id:'pdrift',name:'Paddock Drift',kind:'drift',tier:1,where:'The paddock',unit:'points',better:'high',time:60,zone:{x:(L.x0+L.x1)/2,z:(L.z0+L.z1)/2,r:72},
      blurb:'Sixty seconds on the paddock\'s concrete, round the haulers. Keep it sideways, keep it off the trucks.',start:{x:L.x0+12,z:L.z1-12,yaw:0},route:null,medals:[12000,7000,3000]});}
  /* --- the salt --- */
  {const hx=WG.HWY_X,route=chResample([[hx+40,0],[hx+40+2800,0]],4),s0=1100,s1=s0+1609.344;
    add({id:'mile',name:'Flying Mile',kind:'mile',tier:3,where:'The salt flats',route,lane:0,unit:'speed',better:'high',mile:[s0,s1],
      blurb:'A mile on the salt past the end of the highway, timed flying: get it wound up, then hold it flat between the two lights.',gates:chGates(route,false,1e5,30,[s0,s1]),best:'hyperTrack',guess:[85,70,55]});}
  {const hx=WG.HWY_X,clear=(R,x,z)=>{for(let i=Math.floor((x-200)/WG.RCELL);i<=Math.floor((x+200)/WG.RCELL);i++)for(let j=Math.floor((z-200)/WG.RCELL);j<=Math.floor((z+200)/WG.RCELL);j++)
        for(const q of WG.rampsIn(i,j))if(q!==R&&Math.hypot(q.mx-x,q.mz-z)<q.rad+10)return false;return true;};
    let R=null;
    for(let i=Math.floor((hx+60)/WG.RCELL);i<=Math.floor((hx+1500)/WG.RCELL)&&!R;i++)for(let j=-4;j<=4&&!R;j++)for(const r of WG.rampsIn(i,j)){if(r.kind!=='mega')continue;
      let ok=WG.saltD(r.ox-r.dx*300,r.oz-r.dz*300)>WG.LAND+400;for(let d=0;d<=300&&ok;d+=20)ok=clear(r,r.ox-r.dx*d,r.oz-r.dz*d);for(let d=r.L;d<=r.L+140&&ok;d+=20)ok=clear(r,r.ox+r.dx*d,r.oz+r.dz*d);
      if(ok){R=r;break;}}
    if(R){const route=chResample([[R.ox-R.dx*300,R.oz-R.dz*300],[R.ox,R.oz]],2);
      add({id:'jump',name:'Big Air',kind:'jump',tier:2,where:'The salt flats',route,lane:0,unit:'dist',better:'high',ramp:{x:R.mx,z:R.mz},
        blurb:'Three hundred metres of salt to a mega ramp out past the end of the highway. Hit it as fast as you dare: the flight off it counts.',
        gates:[{x:R.ox+R.dx*2,z:R.oz+R.dz*2,dx:R.dx,dz:R.dz,r:R.hw,s:300,finish:true}],best:'hatchB',guess:[110,80,50]});}}
  for(const c of C){c.pay=CH_PAY[c.tier];if(!c.start)c.start=chStart(c.route,c.lane||0);
    if(!c.limit)c.limit=c.unit==='time'&&c.medals?Math.round(c.medals[2]*2+20):c.kind==='drift'?c.time:c.kind==='mile'?150:c.kind==='jump'?60:90;}
  return C;
}
/* a result's medal: 0 gold, 1 silver, 2 bronze, -1 none */
function chMedalOf(c,v){if(v==null||!c.medals)return -1;for(let i=0;i<3;i++)if(c.better==='low'?v<=c.medals[i]:v>=c.medals[i])return i;return -1;}
function chFmt(c,v){if(v==null)return '—';
  if(c.unit==='time')return fmtLap(v);
  if(c.unit==='speed')return (v*2.23694).toFixed(1)+' mph';
  if(c.unit==='dist')return Math.round(v*3.28084)+' ft';
  return Math.round(v).toLocaleString('en-US')+' pts';}

/* ---------- scoring a slide (City Limits' drift zone) ----------
   You're drifting past ten degrees of slip at speed with the wheels down. Points flow with speed and angle;
   holding it raises the multiplier, a clean switch raises it more. A chain banks when you straighten up and
   stay straight; a wall or a spin loses it. */
class DriftScore{
  constructor(){this.reset();}
  reset(){this.total=0;this.chain=0;this.mult=1;this.on=false;this.gap=0;this.hold=0;this.dir=0;this.angle=0;this.msg=[];this.best=0;this.lost=0;}
  update(dt,car,ev){
    const v=Math.max(0,car.speed),b=car.beta||0,deg=Math.abs(b)*57.2958,grounded=car.wheels.filter(w=>w.contact).length>=3;this.angle=deg*Math.sign(b);
    if(this.chain>0&&((ev&&ev.wall>2.2)||deg>110&&v>3)){this.msg.push({t:'lost',why:ev&&ev.wall>2.2?'WALL':'SPUN',pts:this.chain});this.lost+=this.chain;this.chain=0;this.mult=1;this.on=false;this.hold=0;this.gap=9;return;}
    if(grounded&&deg>10&&deg<100&&v>7&&car.vf>3){
      if(!this.on){this.on=true;this.hold=0;if(this.chain===0)this.mult=1;}
      const d=Math.sign(b);if(this.dir&&d!==this.dir&&this.gap<1.2){this.mult=Math.min(6,this.mult+.5);this.msg.push({t:'switch'});}
      this.dir=d;this.hold+=dt;this.gap=0;if(this.hold>2.5){this.hold-=2.5;this.mult=Math.min(6,this.mult+.25);}
      this.chain+=v*(Math.min(deg,55)-8)*.9*this.mult*dt;}
    else{this.on=false;if(this.chain>0){this.gap+=dt;if(this.gap>1.6)this.bank();}}}
  bank(){if(this.chain<=0)return;const p=Math.round(this.chain);this.total+=p;this.best=Math.max(this.best,p);this.msg.push({t:'bank',pts:p,mult:this.mult});this.chain=0;this.mult=1;this.dir=0;this.gap=9;}
  take(){const m=this.msg;this.msg=[];return m;}
}
/* ---------- one run at a challenge: the countdown, the gates in order, laps, the trap, the mile, flights,
   drift points in the zone, the time limit, the result. Nothing here draws; the robots use it too. ---------- */
class ChalRun{
  constructor(c,{countdown=3}={}){
    this.c=c;this.phase=countdown>0?'count':'run';this.cd=countdown;this.t=0;this.gi=0;this.lap=1;this.lapT0=0;this.msgs=[];
    this.value=null;this.medal=-1;this.failed=null;this.top=0;this.mileT0=null;this.fly=null;this.bestJump=0;
    this.drift=c.kind==='drift'?new DriftScore():null;this.inZone=true;this.armT=null;}
  get next(){const g=this.c.gates;return g&&this.phase!=='done'?g[this.gi]:null;}
  get lights(){return this.phase==='count'?Math.min(3,3-Math.ceil(this.cd)+1):0;}
  update(dt,car,ev){
    if(this.phase==='count'){this.cd-=dt;if(this.cd<=0){this.phase='run';this.msgs.push({t:'go'});}return;}
    if(this.phase!=='run')return;
    const c=this.c,x=car.p[0],z=car.p[2];this.t+=dt;this.top=Math.max(this.top,car.speed);
    if(c.kind==='drift'){const inside=Math.hypot(x-c.zone.x,z-c.zone.z)<c.zone.r;
      if(inside)this.drift.update(dt,car,ev);else{this.drift.bank();this.drift.on=false;}
      if(inside!==this.inZone){this.inZone=inside;this.msgs.push({t:inside?'zoneIn':'zoneOut'});}
      for(const m of this.drift.take())this.msgs.push(Object.assign({drift:1},m));
      if(this.t>=c.time){this.drift.bank();this.finish(this.drift.total);}return;}
    /* flights: from all four wheels leaving the ground to them back on it */
    const grounded=car.wheels.some(w=>w.contact);
    if(!grounded&&!this.fly)this.fly={x,z,t:this.t};
    else if(grounded&&this.fly){const d=Math.hypot(x-this.fly.x,z-this.fly.z),air=this.t-this.fly.t;this.fly=null;
      if(d>4&&air>.3){if(d>this.bestJump)this.bestJump=d;this.msgs.push({t:'jump',d,air,best:d>=this.bestJump});if(this.armT!=null){this.finish(d);return;}}}
    if(this.armT!=null&&!this.fly&&this.t-this.armT>6){this.fail('noair');return;}
    const g=this.next;if(g){const d=Math.hypot(x-g.x,z-g.z);this.gMin=Math.min(this.gMin??1e9,d);
      if(d<g.r)this.pass(g,car);
      /* ran wide past a gate (came near it, then through the next one): it counts */
      else if(c.kind==='sprint'||c.kind==='lap'){const G=c.gates,h=G[this.gi+1]||(c.closed&&this.lap<c.laps?G[0]:null);
        if(h&&this.gMin<g.r*2.2&&Math.hypot(x-h.x,z-h.z)<h.r){this.pass(g,car);if(this.phase==='run'&&this.next===h)this.pass(h,car);}}}
    if(this.phase==='run'&&this.t>c.limit)this.fail('time');}
  pass(g,car){const c=this.c;this.gMin=null;
    if(c.kind==='trap'){this.finish(car.speed);return;}
    if(c.kind==='jump'){this.armT=this.t;this.gi++;this.msgs.push({t:'ramp'});return;}
    if(c.kind==='mile'){if(Math.abs(g.s-c.mile[0])<1){this.mileT0=this.t;this.msgs.push({t:'mileIn'});}
      else if(Math.abs(g.s-c.mile[1])<1){this.finish(1609.344/Math.max(.1,this.t-this.mileT0));return;}}
    this.gi++;
    if(c.kind==='lap'&&this.gi>=c.gates.length){const lt=this.t-this.lapT0;this.lapT0=this.t;
      if(this.lap>=c.laps){this.finish(this.t);return;}this.lap++;this.gi=0;this.msgs.push({t:'lap',lap:this.lap,lt});return;}
    if(this.gi>=c.gates.length){this.finish(c.kind==='jump'?(this.bestJump||null):this.t);return;}
    this.msgs.push({t:'gate',i:this.gi});}
  finish(v){this.phase='done';this.value=v;this.medal=chMedalOf(this.c,v);this.msgs.push({t:'finish',v,medal:this.medal});}
  fail(why){if(this.phase==='done')return;this.phase='done';this.value=null;this.medal=-1;this.failed=why;this.msgs.push({t:'fail',why});}
  take(){const m=this.msgs;this.msgs=[];return m;}
}

/* ---------- in the game ---------- */
const CHALS=buildChallenges();
const CHAL={run:null,ask:null,res:null,free:{medals:{},best:{},runs:{}}};
try{const s=JSON.parse(store.get('cc-fchal','{}'))||{};for(const k of ['medals','best','runs','quests','active','bought'])if(s[k]!==undefined)CHAL.free[k]=s[k];}catch(e){}
/* the medals and bests of the game you're in */
const chRec=()=>CAREER.on?CAREER.d:CHAL.free;
const chSave=()=>CAREER.on?careerSave():store.set('cc-fchal',JSON.stringify(CHAL.free));
const chMedal=id=>chRec().medals[id]??-1;
const chBest=id=>chRec().best[id]??null;
const chMedalCount=()=>{const n=[0,0,0];for(const m of Object.values(chRec().medals))if(m>=0)n[m]++;return n;};
/* a finished run: keep the best, pay the medal (a better one than before pays the difference, a repeat a tenth) */
function chResult(c,value,medal){
  const d=chRec(),prev=d.medals[c.id]??-1,pay=c.pay;let pays=0,newBest=false;
  d.runs[c.id]=(d.runs[c.id]||0)+1;
  if(value!=null){const b=d.best[c.id];if(b==null||(c.better==='low'?value<b:value>b)){d.best[c.id]=value;newBest=true;}}
  if(medal>=0){if(prev<0||medal<prev){pays=pay[medal]-(prev>=0?pay[prev]:0);d.medals[c.id]=medal;}else pays=Math.round(pay[medal]*.1);}
  else if(value!=null)pays=Math.round(pay[2]*.05);
  chSave();if(pays)earn(pays);
  return {money:pays,newBest,prev,upgraded:medal>=0&&(prev<0||medal<prev)};}
function chalReset(){CHAL.run=null;CHAL.ask=null;CHAL.res=null;JOB.near=null;$('cres')&&($('cres').hidden=true);}
/* start one: on its line, facing down it, the countdown */
function chalStart(c){
  if(!c)return;if(RACE.on)raceEnd('Race abandoned');RUN.on=null;parkReset();closeChalResult(true);
  placeCar(c.start.x,c.start.z,c.start.yaw);CHAL.run=new ChalRun(c);CHAL.ask=null;say(c.name.toUpperCase(),2.6,PAL.cyan);}
function chalQuit(){if(!CHAL.run)return;CHAL.run=null;say('Challenge quit',1.4);}
/* each frame while driving: the run, or a start under the wheels */
function chalStep(dt,t,ev){
  const r=CHAL.run;
  if(r){r.update(dt,t,ev);
    for(const m of r.take()){
      if(m.t==='go')say('GO',1.1,PAL.green);
      else if(m.t==='lap')say('LAP '+m.lap+'/'+r.c.laps+'   '+fmtLap(m.lt),1.8,PAL.cyan);
      else if(m.t==='jump'&&m.d>8)say((m.best?'BEST ':'')+'AIR '+chFmt({unit:'dist'},m.d),1.8,m.best?PAL.green:PAL.pink||PAL.amber);
      else if(m.t==='mileIn')say('IN THE MILE · HOLD IT',1.8,PAL.gold);
      else if(m.t==='zoneOut')say('BACK INSIDE THE RING',1.6,PAL.amber);
      else if(m.drift&&m.t==='bank'&&m.pts>200)say('+'+m.pts.toLocaleString('en-US')+(m.mult>1?' x'+m.mult.toFixed(1):''),1.4,PAL.green);
      else if(m.drift&&m.t==='lost')say(m.why+'  -'+Math.round(m.pts).toLocaleString('en-US'),1.4,PAL.red);
      else if(m.t==='finish'||m.t==='fail'){showChalResult();return;}}
    return;}
  /* the job you're on (60_jobs), and anyone stopped beside with work; stopped in a start's ring: ask */
  jobStep(dt,t);
  CHAL.ask=null;if(t.speed<6&&!JOB.near)for(const c of CHALS)if(Math.hypot(t.p[0]-c.start.x,t.p[2]-c.start.z)<13){CHAL.ask=c;break;}
  syncObj();
}
/* ---------- the result ---------- */
function showChalResult(){
  const r=CHAL.run,c=r.c,res=r.value!=null?chResult(c,r.value,r.medal):{money:0,newBest:false};CHAL.res={r,res};
  GAME.state='cres';syncTouch();const best=chBest(c.id);
  $('crEyebrow').textContent=CH_KINDS[c.kind]+' · '+c.where;$('crTitle').textContent=c.name;
  const md=$('crMedal');md.textContent=r.failed?(r.failed==='noair'?'No air':'Out of time'):r.medal>=0?CH_MEDALS[r.medal][1]:'No medal';md.style.color=r.failed?'var(--bad)':r.medal>=0?CH_MEDALS[r.medal][2]:'var(--ink-3)';
  $('crVal').textContent=r.value!=null?chFmt(c,r.value)+(res.newBest?'  ·  new best':''):'';
  $('crBest').textContent=best!=null?'Your best: '+chFmt(c,best):'';
  $('crMeds').innerHTML=c.medals.map((v,i)=>`<span><b style="color:${CH_MEDALS[i][2]}">${CH_MEDALS[i][1]}</b> ${chFmt(c,v)}</span>`).join('');
  $('crPrize').textContent=res.money?'+'+Feats.fmtMoney(res.money)+(CAREER.on?'':' score')+(res.upgraded||!res.money?'':' (a repeat pays a tenth)'):'';
  $('cres').hidden=false;setTimeout(()=>$('crAgain').focus({preventScroll:true}),0);
}
function closeChalResult(quiet){if($('cres').hidden)return;$('cres').hidden=true;CHAL.run=null;CHAL.res=null;if(GAME.state==='cres')GAME.state='drive';syncTouch();if(!quiet)syncObj();}
function buildChal(){
  $('crAgain').addEventListener('click',()=>{const c=CHAL.res&&CHAL.res.r.c;closeChalResult(true);chalStart(c);});
  $('crOn').addEventListener('click',()=>closeChalResult());
  $('crList').addEventListener('click',()=>{closeChalResult();openMenu(false);showTab('chals');});
  addEventListener('keydown',e=>{if((e.code==='Enter'||e.code==='NumpadEnter')&&GAME.state==='drive'&&CHAL.ask&&!CHAL.run){e.preventDefault();chalStart(CHAL.ask);}});
}
/* the card at the top: someone stopped beside with work for you, or a challenge to start where you've stopped */
let OBJ_KEY='';
function syncObj(){
  const el=$('obj');let h='';
  if(GAME.state==='drive'&&!(CHAL.run&&CHAL.run.phase!=='done')){
    const n=JOB.near;
    if(n){const p=PEOPLE[n.who];h+=`<div class="ask job" style="--c:${p.col}"><div><b>${p.name}</b><span>has work for you: ${n.q.title}</span></div><button type="button" id="objGo2">Listen</button></div>`;}
    else if(CHAL.ask){const c=CHAL.ask,m=chMedal(c.id),b=chBest(c.id);
      h+=`<div class="ask"><div><b>${c.name}</b><span>${CH_KINDS[c.kind]} · gold ${chFmt(c,c.medals[0])}${m>=0?' · you have '+CH_MEDALS[m][1].toLowerCase():''}${b!=null?' · best '+chFmt(c,b):''}</span></div><button type="button" id="objGo2">Start</button></div>`;}}
  if(h===OBJ_KEY)return;OBJ_KEY=h;el.innerHTML=h;el.hidden=!h;const b=$('objGo2');if(b)b.addEventListener('click',()=>{if(JOB.near)jobListen(JOB.near.who);else if(CHAL.ask)chalStart(CHAL.ask);});
}
/* ---------- the Challenges tab ---------- */
function syncChals(){
  syncJobs();
  const L=$('chList');L.textContent='';const n=chMedalCount();
  $('chCount').textContent=`${n[0]} gold · ${n[1]} silver · ${n[2]} bronze of ${CHALS.length}`;
  for(const c of CHALS){const m=chMedal(c.id),b=chBest(c.id),el=document.createElement('button');el.type='button';el.className='race';el.innerHTML='<b></b><small></small><i></i>';
    el.querySelector('b').textContent=c.name;el.querySelector('small').textContent=c.blurb;
    const i=el.querySelector('i');i.textContent=[CH_KINDS[c.kind],c.where,'gold '+chFmt(c,c.medals[0]),'pays to '+Feats.fmtMoney(c.pay[0])+(CAREER.on?'':' score')].join(' · ');
    const em=document.createElement('em');em.textContent='  ·  '+(m>=0?CH_MEDALS[m][1]:'no medal')+(b!=null?' · best '+chFmt(c,b):'');em.style.color=m>=0?CH_MEDALS[m][2]:'var(--ink-3)';i.appendChild(em);
    el.addEventListener('click',()=>{closeMenu();chalStart(c);});L.appendChild(el);}
}
/* ---------- on the HUD: the lights, the clock, the gates, which way ---------- */
function drawChalHud(lx,sc){
  const r=CHAL.run;if(!r)return;const c=r.c,t=GAME.car,tch=GAME.touch;let y=7+7*sc+(tch?40:30);
  if(r.phase==='count'||(r.phase==='run'&&r.t<1)){const cx=Math.round(W/2),cy=Math.round(H*(tch?.46:.19)),on=r.lights,go=r.phase==='run';
    hRect(cx-21,cy-8,42,16,pack(4,3,8,190));for(let k=0;k<3;k++)hDisc(cx-12+k*12,cy,3.6,go?PAL.green:k<on?PAL.red:pack(40,30,30,255));}
  otxt3(c.name.toUpperCase(),lx,y,PAL.cyan);
  if(c.kind==='drift'){const d=r.drift;otxt5(Math.round(d.total+d.chain).toLocaleString('en-US'),lx,y+7,GR.volt,1);
    otxt3(Math.max(0,c.time-r.t).toFixed(0)+' S LEFT'+(d.chain>0?'  CHAIN '+Math.round(d.chain).toLocaleString('en-US')+' X'+d.mult.toFixed(1):''),lx,y+17,r.inZone?PAL.ink:PAL.amber);return;}
  otxt5(c.unit==='speed'&&r.phase==='run'?Math.round(t.speed*2.237)+' MPH':fmtLap(r.t),lx,y+7,GR.volt,1);
  const g=r.next,tot=c.gates.length;
  otxt3((c.kind==='lap'?'LAP '+r.lap+'/'+c.laps+'  ':'')+(tot>1?'GATE '+Math.min(tot,r.gi+1)+'/'+tot:'')+(c.kind==='jump'&&r.bestJump?'  BEST '+chFmt(c,r.bestJump):''),lx,y+17,PAL.ink);
  if(g&&r.phase==='run'){const d=Math.hypot(g.x-t.p[0],g.z-t.p[2]),F=mcol(t.M,0),hy=Math.atan2(-F[2],F[0]),ty=Math.atan2(-(g.z-t.p[2]),g.x-t.p[0]);let a=ty-hy;while(a>PI)a-=TAU;while(a<-PI)a+=TAU;
    otxt3(Math.round(d)+' M',lx,y+25,PAL.dim);
    const ax=W/2+(tch?-48:0),ay=tch?50:30,dx=-Math.sin(a),dy=-Math.cos(a);hLine(ax,ay,ax+dx*7,ay+dy*7,PAL.cyan);hDisc(ax+dx*7,ay+dy*7,1.4,PAL.cyan);}
}
/* ---------- the lights in the world: a column at each start, the gates of a run ---------- */
function chalMarks(out){
  const r=CHAL.run;
  if(r&&r.phase!=='done'){const G=r.c.gates;for(let k=0;k<2;k++){const g=G[r.gi+k]||(r.c.closed&&r.lap<r.c.laps?G[r.gi+k-G.length]:null);if(!g)continue;
      out.push({kind:'gate',x:g.x,z:g.z,dx:g.dx,dz:g.dz,r:Math.min(g.r,12),col:k?[.15,.5,.6]:g.finish||r.gi===G.length-1&&(!r.c.laps||r.lap>=r.c.laps)?[1,.85,.25]:[.3,.95,1],em:k?.6:1.6});}
    if(r.c.kind==='drift'){const z=r.c.zone;out.push({kind:'ring',x:z.x,z:z.z,r:z.r,col:[1,.3,.75],em:.8});}
    return;}
  const tg=jTarget();
  for(const c of CHALS){const m=chMedal(c.id),job=tg&&tg.chal===c;out.push({kind:'start',x:c.start.x,z:c.start.z,r:7,col:job?[.35,1,.45]:m===0?[1,.82,.25]:[.3,.95,1],em:job?2:m===0?1.4:1.6});}
  jobMarks(out);
}
/* drawn as columns of light: an open tube, bright at its edges and its foot, fading upward, added over the
   scene (after the dust, into the colour only). A start is a tall column you can see from a long way off;
   the next gate a shorter one across the road; the drift zone a low ring round its edge. */
const VS_BEAM=`layout(location=0) in vec3 aPos;layout(location=5) in vec4 iA;layout(location=6) in vec4 iB;layout(location=7) in vec4 iC;
uniform mat4 uVP;out vec3 vN;out vec3 vP;out float vH;out vec4 vC;out float vE;
void main(){vec3 w=iA.xyz+vec3(aPos.x*iA.w,aPos.y*iB.x,aPos.z*iA.w);vN=vec3(aPos.x,0.,aPos.z);vP=w;vH=aPos.y;vC=iC;vE=iB.z;gl_Position=uVP*vec4(w,1.);}`;
const FS_BEAM=`in vec3 vN;in vec3 vP;in float vH;in vec4 vC;in float vE;uniform vec3 uCam;uniform float uT;uniform float uK;layout(location=0) out vec4 o;
void main(){vec3 V=normalize(uCam-vP);float d=length(uCam-vP),f=1.-abs(dot(normalize(vN),normalize(vec3(V.x,0.,V.z))));
  float rim=.18+.82*f*f*f,up=pow(1.-vH,1.6),foot=exp(-vH*vC.a*9.),band=.85+.15*sin(vH*vC.a*3.-uT*3.);
  float a=vE*uK*(rim*up*band+foot*.9)/(1.+d/2200.);o=vec4(vC.rgb*a,0.);}`;
let P_BEAM=null,BEAM_MESH=null;const BEAM_BUF=new Float32Array(64*12),CH_MARKS=[];
function chalDraw(cam){
  CH_MARKS.length=0;chalMarks(CH_MARKS);if(!CH_MARKS.length)return 0;
  if(!P_BEAM){P_BEAM=compile(VS_BEAM,FS_BEAM);const N=28,pos=[];
    for(let i=0;i<N;i++){const a0=i/N*TAU,a1=(i+1)/N*TAU,c0=Math.cos(a0),s0=Math.sin(a0),c1=Math.cos(a1),s1=Math.sin(a1);pos.push(c0,0,s0,c1,0,s1,c1,1,s1,c0,0,s0,c1,1,s1,c0,1,s0);}
    BEAM_MESH=makeMesh({pos:new Float32Array(pos),nrm:new Float32Array(pos.length),col:new Float32Array(pos.length/3*4)});}
  const e=cam.eye;let n=0;
  for(const m of CH_MARKS){if(n>=64)break;if(Math.hypot(m.x-e[0],m.z-e[2])>(m.kind==='start'?4000:2500))continue;
    if(m.y==null)m.y=chGroundY(m);const H=m.kind==='start'?70:m.kind==='person'?46:m.kind==='gate'?22:3.2,o=n*12;
    BEAM_BUF[o]=m.x-RO[0];BEAM_BUF[o+1]=m.y-.5-RO[1];BEAM_BUF[o+2]=m.z-RO[2];BEAM_BUF[o+3]=m.r;
    BEAM_BUF[o+4]=H;BEAM_BUF[o+5]=0;BEAM_BUF[o+6]=m.em;BEAM_BUF[o+7]=0;
    BEAM_BUF[o+8]=m.col[0];BEAM_BUF[o+9]=m.col[1];BEAM_BUF[o+10]=m.col[2];BEAM_BUF[o+11]=m.kind==='ring'?1:H/6;n++;}
  if(!n)return 0;
  const u=P_BEAM.u;gl.useProgram(P_BEAM.p);gl.uniformMatrix4fv(u.uVP,false,cam.VP);gl.uniform3fv(u.uCam,cam.eyeR);gl.uniform1f(u.uT,APP.t);gl.uniform1f(u.uK,SKY.night?.55:1.6);
  setInst(BEAM_MESH,BEAM_BUF.subarray(0,n*12));
  gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);gl.depthMask(false);drawMeshI(BEAM_MESH);gl.depthMask(true);gl.disable(gl.BLEND);gl.useProgram(CUR.p);
  return n*56;
}
/* where a mark stands: the ground there, from the generator (so a start a long way off has its height too) */
const CH_GY={};
function chGroundY(m){const k=Math.round(m.x)+','+Math.round(m.z);if(CH_GY[k]!=null)return CH_GY[k];
  return CH_GY[k]=WG.sample(m.x,m.z,{}).h;}
