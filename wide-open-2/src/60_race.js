/* =====================================================================================
   RACES. Against robot drivers (44_ai) on the same physics as you, in factory cars rated close to yours for that
   kind of ground: the off-road park's three circuits (Speedway 25's banked clay, the short course, the mud
   track), last car out on the oval, Limits Boulevard round town, once round the city on the Outer Loop, and one
   on one down the park's drag strip. Places pay, into the career's money or free play's.
   The race runs inside the game's own step: the robots' inputs once a frame, their cars stepped with yours, the
   cars touching each other. A robot more than RACE_FAR from you comes off the physics and rides its line (the
   phone has one car's physics to do instead of six on the long ones); it goes back on, moving, inside RACE_NEAR.
   The HUD (61_hud) shows the lights, your place, the lap and the gaps; the results come up over the game.
   ===================================================================================== */
const RACE_DIFF={
  easy:{name:'Easy',skill:.84,slot:0,pay:.7,blurb:'The others use about 85% of what their cars can do. You start on the front row.'},
  medium:{name:'Medium',skill:.9,slot:.5,pay:1,blurb:'The others use about 90% of what their cars can do. You start in the middle of the pack.'},
  hard:{name:'Hard',skill:.96,slot:1,pay:1.4,blurb:'The others use nearly everything their cars have. You start at the back.'}};
const RACE_EVENTS=[
  {id:'oval',name:'Speedway 25',kind:'circuit',course:'oval',laps:6,field:6,terrain:'dirt',purse:2600,
    blurb:'Six laps of the park\'s banked clay oval against five others, from a standing start. Slide it in, get back on the gas early.'},
  {id:'elim',name:'Last Car Out',kind:'elim',course:'oval',laps:5,field:6,terrain:'dirt',purse:3000,
    blurb:'Six on the oval: every time a lap is done, the car in last place is out. Be the one left after five.'},
  {id:'short',name:'Short Course',kind:'circuit',course:'short',laps:3,field:6,terrain:'dirt',purse:3200,
    blurb:'Three laps of the park\'s short course: two tabletops, the whoops, banked hairpins and the big sweeper.'},
  {id:'mud',name:'Mud Track Dash',kind:'circuit',course:'mud',laps:3,field:4,terrain:'mud',purse:2400,
    blurb:'Three laps of the park\'s mud track against three others: the banked turns, the chicane and the splash. Keep it moving.'},
  {id:'ring',name:'Boulevard Run',kind:'circuit',course:'ring',laps:2,field:6,terrain:'asphalt',purse:3000,
    blurb:'Two laps of Limits Boulevard round town, anticlockwise in the outside lanes: four long straights and four long bends under the lamps.'},
  {id:'enduro',name:'Outer Loop Enduro',kind:'circuit',course:'loop',laps:1,field:6,terrain:'dirt',purse:6000,
    blurb:'Once round the city on the Outer Loop against five others: fourteen kilometres of dirt, the woods and the fords, the salt\'s edge and the mud by the bog.'},
  {id:'drag',name:'Eighth-Mile Drag',kind:'drag',course:'strip',field:2,terrain:'asphalt',purse:1500,
    blurb:'One on one down the park\'s dirt strip, the tree counting down. Off the gas until it goes green, then go: first past the eighth mile wins.'}];
const RACE_NAMES=['J. Hale','R. Ortiz','M. Becker','T. Nakamura','D. Okafor','S. Lindqvist','A. Moreau','K. Brennan','L. Ferreira','P. Novak','C. Walsh','E. Duarte','H. Adeyemi','N. Kowalski'];
const RACE_PAY=[1,.6,.42,.28,.18,.12];
/* off the physics further than this from you, back on nearer than this (m) */
const RACE_FAR=190,RACE_NEAR=140;
const RACE={on:false,ev:null,diff:'medium',state:'',t:0,clock:0,cars:[],me:null,lines:{},best:{},hold:false,lights:0,msgT:0,res:null};
try{const s=JSON.parse(store.get('wo2-races','{}'))||{};RACE.best=s.best||{};if(RACE_DIFF[s.diff])RACE.diff=s.diff;}catch(e){}
const raceSave=()=>store.set('wo2-races',JSON.stringify({best:RACE.best,diff:RACE.diff}));
/* ---------- the courses ---------- */
/* a path for a RaceLine from one of the world's own (its at(s, o) into [x, z]) */
const racePathOf=T=>{const A={};return {len:T.len,closed:true,at:s=>{T.at(s,A);return [A.x,A.z];}};};
/* from a list of points, moved across by lane metres (positive right): by distance along them */
function racePoly(pts,closed,lane=0){
  const n=pts.length,P=pts.map((p,i)=>{const a=pts[closed?(i-1+n)%n:Math.max(0,i-1)],b=pts[closed?(i+1)%n:Math.min(n-1,i+1)],dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1;return [p[0]-dz/l*lane,p[1]+dx/l*lane];});
  if(closed)P.push(P[0]);const cum=new Float64Array(P.length);for(let i=1;i<P.length;i++)cum[i]=cum[i-1]+Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]);
  const len=cum[P.length-1];
  return {len,closed,at:s=>{if(closed){s%=len;if(s<0)s+=len;}else s=Math.max(0,Math.min(len,s));
    let lo=0,hi=P.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(cum[m]<=s)lo=m;else hi=m;}
    const t=(s-cum[lo])/Math.max(1e-9,cum[hi]-cum[lo]);return [P[lo][0]+(P[hi][0]-P[lo][0])*t,P[lo][1]+(P[hi][1]-P[lo][1])*t];}};
}
/* the ground under a line, straight from the world's functions (one sample, not the four of a grid square); on the
   Outer Loop, from the Loop's own profile (the same heights, its mud and its fords, at a twentieth of the cost) */
const RGS={};
const raceGround=(x,z)=>{WG.sample(x,z,RGS);return {y:RGS.h,surf:WG.SURF[RGS.code]};};
const loopGround=(x,z)=>{WG.OL.q(x,z,RGS);return {y:RGS.h,surf:RGS.fw>-1e8&&RGS.h<RGS.fw?'water':RGS.mud>.5?'mud':'dirt'};};
function raceLine(id){
  if(RACE.lines[id])return RACE.lines[id];
  const LP=WG.LAPS,R=id==='ring'?(CHALS.find(c=>c.id==='loop')||{}).route:null;
  /* path, half width, how close to the edge, metres between its points, the ground */
  const D={oval:[racePathOf(LP[0]),LP[0].hw,1.4,2],short:[racePathOf(LP[1]),LP[1].hw,1.4,2],mud:[racePathOf(LP[2]),LP[2].hw,1.2,2],
    loop:[racePathOf(LP[3]),LP[3].hw,1.2,3,loopGround],
    /* the boulevard: the outside carriageway, from the median's edge (70 cm off the middle) to the curb (14 m) */
    ring:[R&&racePoly(R,true,7.35),6.3,1.2,2]}[id];
  const L=new RaceLine(D[0],D[1],{ground:D[4]||raceGround,margin:D[2],ds:D[3]});L.key=id;return RACE.lines[id]=L;
}
/* the drag strip: a straight line down each lane, to the end of the shutdown */
function dragLine(lane){const S=WG.PKW.ST,z=S.lanes[lane],k='strip'+lane;
  return RACE.lines[k]||(RACE.lines[k]=new RaceLine(racePoly([[S.x0+2,z],[S.x1-4,z]],false),3,{flat:true,ground:raceGround}));}
/* ---------- who you race: the factory builds nearest yours on this course ---------- */
/* how long a build takes round a course, on the sum a robot rides the line by (44_ai's ghost, at nine-tenths): the
   plan's speeds through the corners, the engine's pull between them, a flying lap. Much nearer what the physics
   does round a particular track than the ratings' generic courses (on those a stock SUV and a track hypercar
   rate alike on dirt; round the clay oval the hypercar is a fifth quicker). Kept per course and build. */
const RACE_EST=new Map();
function raceEst(L,i,car){
  /* (yours, given its car, is worked out fresh: the dyno lab may have changed its engine since) */
  const k=L.key+':'+BUILDS[i].id;if(!car&&RACE_EST.has(k))return RACE_EST.get(k);
  const sp=L.plan(car||makeCar(i,RANCH.world,null),.9),acc=raceAccel(i,!car),n=L.n,ds=L.ds;let v=sp[0],t=0;
  for(let j=0;j<n;j++){const a=acc(v,L.surf[j]),v2=Math.max(1,Math.min(sp[L.idx(j+1)],Math.sqrt(Math.max(0,v*v+2*a*ds))));t+=2*ds/(v+v2);v=v2;}
  if(!car)RACE_EST.set(k,t);return t;
}
function pickRivals(ev,n){
  /* the cars and trucks (not the quads, carts and big machines) */
  const pool=[];for(const id in PRESET_PARTS){const i=BUILDS.findIndex(b=>b.id===id);if(i>=0&&!BUILDS[i].machine)pool.push({id,i});}
  const mi=rigBuild(APP.car,rigOf(APP.car));let mine,rate;
  /* down the strip it's the 0-60 time; in the mud the ratings' mud course (bogging down is the physics' and the
     ratings' business, not the ghost's); round anything else, the time round this course */
  if(ev.kind==='drag')rate=i=>60/Math.max(1,(rateBuild(i).figs||{}).z60||12);
  else if(ev.terrain==='mud')rate=i=>(rateBuild(i)||{}).mud||0;
  else{const L=raceLine(ev.course);rate=i=>1/raceEst(L,i);mine=1/raceEst(L,mi,GAME.car);}
  if(mine===undefined)mine=rate(mi);
  for(const p of pool)p.r=rate(p.i);
  /* none hopeless for the ground (under 45% of the best factory build there, or 60% of yours, whichever is lower: a
     weak car still gets a field it can race); the nearest yours, slower or quicker */
  const top=Math.max(...pool.map(p=>p.r)),ok=pool.filter(p=>p.r>=Math.min(top*.45,mine*.6));
  ok.sort((a,b)=>Math.abs(Math.log(a.r/mine))-Math.abs(Math.log(b.r/mine)));
  const out=[];for(let k=0;k<n;k++)out.push(ok[k%ok.length]);return out;
}
/* how hard a build pulls at a speed on a surface (m/s2), for riding the line: 57_ratings' sheet of its engine
   through its best gear, against what its driven tyres can put down there, the air and rolling. (Not the mud's
   drag: the physics' robots get through the park's mud far quicker than the ratings' sum says, and the ghost
   in 44_ai sets the pace on each course anyway.) */
const RACE_SHEETS=new Map();
function raceAccel(i,keep=true){
  const id=BUILDS[i].id;let S=keep&&RACE_SHEETS.get(id);if(!S){S=rateSheet(i);if(keep)RACE_SHEETS.set(id,S);}
  const m=S.mass,fwd=S.drv==='FWD',share=S.drv==='AWD'?1:fwd?.5:.55;
  return (v,surf)=>{const mu=S.drv==='AWD'?(S.muOf(surf,true)+S.muOf(surf,false))/2:S.muOf(surf,fwd),
    F=Math.min(driveForce(S,Math.max(v,.3),false),mu*share*m*G9),res=S.rr(surf)*m*G9+.5*RHO*S.cdA*v*v;return (F-res)/S._me;};
}
/* ---------- starting one ---------- */
function startRace(id){
  const ev=RACE_EVENTS.find(e=>e.id===id);if(!ev)return;
  if(RACE.on)raceEnd(null);RUN.on=null;LAP.on=false;CHAL.run=null;
  const D=RACE_DIFF[RACE.diff],seed=(Date.now()&0xffff)+1,R=Ranch.rng(seed),names=RACE_NAMES.slice().sort(()=>R()-.5);
  RACE.ev=ev;RACE.on=true;RACE.state='grid';RACE.t=0;RACE.wait=0;RACE.clock=0;RACE.cars=[];RACE.res=null;RACE.out=[];RACE.msgT=0;RACE.lights=0;RACE.green=false;RACE.foul=false;RACE.rt=null;RACE.elimLap=0;
  const t=GAME.car,me={car:t,name:'You',me:true,half:t.c.body.W/2,done:false,time:0,out:false};RACE.me=me;
  if(ev.kind==='drag'){
    const S=WG.PKW.ST,rv=pickRivals(ev,1)[0],L0=dragLine(0),L1=dragLine(1);
    me.line=L1;me.trk=new Driver(t,L1,{});RACE.cars=[me];
    placeCar(S.start-t.c.body.L/2-.3,S.lanes[1],0);
    const o=raceCar(rv,L0,{skill:D.skill,name:names[0],react:.34-.2*(D.skill-.84)/.12+R()*.08});
    o.car.place([S.start-o.car.c.body.L/2-.3,RANCH.W.heightAt(S.start,S.lanes[0])+.05,S.lanes[0]],0);raceSettle(o);RACE.cars.push(o);
  }
  else{
    /* the grid: two abreast behind the line, rows 9.5 m apart, you where the difficulty says */
    const L=raceLine(ev.course),n=ev.field,rv=pickRivals(ev,n-1),slot=Math.round(D.slot*(n-1));
    me.line=L;me.trk=new Driver(t,L,{});
    let k=0;const spot=j=>{const s=L.len-10-Math.floor(j/2)*9.5;return [s,(j%2?1:-1)*Math.min(3.2,L.hwAt(Math.round(s/L.ds))*.42)];};
    for(let j=0;j<n;j++){const [s,l]=spot(j),[x,z]=L.at(s,l),[x2,z2]=L.at(s+3,l),yaw=Math.atan2(-(z2-z),x2-x);
      if(j===slot){placeCar(x,z,yaw);RACE.cars.push(me);continue;}
      const p=rv[k],o=raceCar(p,L,{skill:D.skill*(.97+R()*.05),name:names[k],react:.15+R()*.25,bias:(R()-.5)*1.2});k++;
      o.car.place([x,RANCH.W.heightAt(x,z)+.05,z],yaw);raceSettle(o);RACE.cars.push(o);}
  }
  for(const c of RACE.cars)if(!c.me){c.drv.track();}me.trk.track();
  /* everyone the robots look out for: the other robots, and you (your tracker knows where you are on the course) */
  RACE.others=RACE.cars.map(q=>q.drv||q.trk);
  truckEvict(RECENT.concat(RACE.cars.map(c=>BUILDS[c.car.bi].id)));
  if(GAME.car.pt.st==='off'){GAME.engineWanted=true;startEngine();}
  RACE.hold=true;CAM.cut=true;PRB.fresh=true;CSM.fresh=true;
  say(ev.name.toUpperCase(),2.6,PAL.gold);
}
/* a robot's car: built, its helpers on (its meshes are made on the grid, one a frame: raceFrame) */
function raceCar(p,L,o){const car=makeCar(p.i,RANCH.world,null);car.setAssists('ai');
  const d=new Driver(car,L,o);d.accel=raceAccel(p.i);return {car,drv:d,name:o.name,bi:p.i,half:car.c.body.W/2,done:false,time:0,out:false,dirt:BUILDS[p.i].dirt||0};}
/* settled on its wheels, held on the brakes; how high it sits is what riding the line sets it down at */
const RACE_HOLD={steer:0,thr:0,brk:1,hb:0,nos:false};
function raceSettle(o){const car=o.car;car.pt.start();for(let k=0;k<120;k++)car.step(DT,RACE_HOLD);car.v.fill(0);car.w.fill(0);
  if(o.drv){o.drv.rideH=car.p[1]-RANCH.W.heightAt(car.p[0],car.p[2]);o.drv.comp0=car.wheels.map(w=>w.comp);}}
/* ---------- each frame ---------- */
/* before the physics: the lights, which robots are on the physics, their inputs */
function raceFrame(dt){
  const ev=RACE.ev;RACE.t+=dt;
  if(RACE.state==='grid'){
    /* (held on the brake: never long enough to drop into reverse) */
    for(const c of RACE.cars){const v=c.car;v.revT=0;if(v.rev){v.rev=false;v.pt.rev=false;}}
    /* the others' cars drawn up one a frame (a car's meshes are the longest thing a race start does: made all at
       once, the phone sat frozen on the menu for seconds), and the lights wait for them and the world under you
       (six seconds at most for the world); then a second to settle, then one a second (drag: the tree's ambers
       half a second apart), then green */
    const nb=RACE.cars.find(c=>c.drv&&!c.built);if(nb){truckFar(nb.bi);nb.built=true;}
    if(!RACE.wait&&!nb){const p=GAME.car.p,c=chunkAt(p[0],p[2]);if(c&&c.H||RACE.t>6)RACE.wait=RACE.t;}
    const drag=ev.kind==='drag',t0=1.2,step=drag?.5:1,n=3,tl=RACE.wait?RACE.t-RACE.wait:-1;RACE.lights=Math.max(0,Math.min(n,Math.floor((tl-t0)/step)+1));
    if(drag&&RACE.lights>0&&inputThr()>.5&&!RACE.foul){RACE.foul=true;say('YOU JUMPED THE TREE',2,PAL.red);}
    if(tl>=t0+n*step){RACE.state='race';RACE.green=true;RACE.hold=false;RACE.clock=0;say('GO!',1.4,PAL.green);buzz([40,30,40]);
      for(const c of RACE.cars)if(c.drv){c.drv.go=true;}}
  }
  else if(RACE.state==='race'||RACE.state==='flag')RACE.clock+=dt;
  /* off the physics far from you, back on near (not while it would land on another car); riding out past where
     it could be seen, it isn't set down on the ground at all */
  const p=GAME.car.p,vis=(SKY.night&&SKY.draw?SKY.draw:GFX.far)+30;
  for(const c of RACE.cars){const d=c.drv;if(!d)continue;if((c.done||c.out)&&!d.done)d.done=true;
    let d2=0;if(RACE.state!=='grid'){const q=d.kin?d.kinXZ():c.car.p,dx=q[0]-p[0],dz=(d.kin?q[1]:q[2])-p[2];d2=dx*dx+dz*dz;
      /* (a rider that is still on top of another car this close drops back a little at a time until it isn't) */
      if(d.kin){if(d2<RACE_NEAR*RACE_NEAR){if(raceClear(c))d.toPhysics();else if(d2<1600)d.back(.5);}}else if(d2>RACE_FAR*RACE_FAR)d.toKin();}
    if(d.kin)d.ride(dt,RACE.others,d2<vis*vis);else d.drive(dt,RACE.others);}
}
/* nothing on the physics overlapping where this one would come back on (along the course and across it) */
function raceClear(c){const d=c.drv,L=d.line,H=L.len/2,cl=c.car.c.body.L;
  for(const o of RACE.cars){if(o===c||o.drv&&o.drv.kin)continue;const T=o.drv||o.trk;let ds=T.prog-d.prog;if(L.closed){while(ds>H)ds-=L.len;while(ds<-H)ds+=L.len;}
    if(Math.abs(ds)<(cl+o.car.c.body.L)/2+1.5&&Math.abs(T.lat-d.lat)<c.half+o.half+.5)return false;}
  return true;}
/* the robots on the physics stepped with yours, then everyone touching everyone */
const RACE_CARS=[];
/* (one stopped for good past the flag or out of the race is parked: not stepped unless you're near enough to hit it) */
function raceSub(dt){
  RACE_CARS.length=0;RACE_CARS.push(GAME.car);const p=GAME.car.p;
  for(const c of RACE.cars){if(!c.drv||c.drv.kin)continue;const q=c.car.p;if(c.parked&&(q[0]-p[0])**2+(q[2]-p[2])**2>144)continue;c.car.step(dt,c.drv.inp);RACE_CARS.push(c.car);}
  if(RACE_CARS.length>1)carContacts(RACE_CARS);
}
/* after the physics: where everyone is, laps, the finish, the robots put back on the course */
function racePost(dt){
  const ev=RACE.ev,me=RACE.me;if(!RACE.on)return;
  /* you: tracked strictly (way off the course, the tracker waits for you where you left it) */
  {const T=me.trk,L=T.line,keep=[T.i,T.lap,T.s,T.prog,T.lat];T.track();
    if(T.dist>L.hwAt(Math.max(0,T.i))+12&&keep[0]>=0){[T.i,T.lap,T.s,T.prog,T.lat]=keep;me.offT=(me.offT||0)+dt;
      if(me.offT>4&&RACE.state!=='grid'&&!me.done){me.offT=0;raceResetMe();say('BACK ON THE COURSE',1.6,PAL.amber);}}else me.offT=0;}
  for(const c of RACE.cars){const d=c.drv;if(!d||d.kin)continue;
    if(d.resetReq&&!c.done){const [x,z,yaw]=d.resetPose(8);c.car.place([x,RANCH.W.heightAt(x,z)+.05,z],yaw);raceSettle(c);d.i=-1;d.track();}
    if((c.done||c.out)&&!c.parked){c.stillT=c.car.speed<.3?(c.stillT||0)+dt:0;if(c.stillT>1.5)c.parked=true;}}
  if(RACE.state==='grid')return;
  if(ev.kind==='drag')return dragPost(dt);
  /* circuits: laps done = line crossings - 1 (the grid is behind the line) */
  for(const c of RACE.cars){if(c.done||c.out)continue;const T=c.me?c.trk:c.drv,laps=T.lap-1;c.prog=T.prog;c.laps=laps;
    if(c.me&&laps>(c.lastLap??0)){c.lastLap=laps;const lt=RACE.clock-(c.lapT0||0);c.lapT0=RACE.clock;c.best=Math.min(c.best||1e9,lt);
      if(laps<ev.laps)say(laps===ev.laps-1?'FINAL LAP':'LAP '+(laps+1)+' OF '+ev.laps,1.6,laps===ev.laps-1?PAL.gold:PAL.white);}
    if(laps>=ev.laps){c.done=true;c.time=RACE.clock;if(c.me){RACE.state='flag';RACE.flagT=RACE.clock;say('FINISHED '+ord(racePlace(me)),3,PAL.gold);buzz([30,30,30,30,60]);}}}
  /* last car out: when the leader finishes each lap, whoever is last is done */
  if(ev.kind==='elim'){const live=RACE.cars.filter(c=>!c.out);let lead=0;for(const c of live)lead=Math.max(lead,c.laps||0);
    if(lead>RACE.elimLap&&live.length>1){RACE.elimLap=lead;const last=raceOrder().filter(c=>!c.out).pop();last.out=true;last.time=RACE.clock;RACE.out.push(last);
      if(last.me){say('YOU\'RE OUT',2.4,PAL.red);RACE.state='flag';RACE.flagT=RACE.clock;}else{say(last.name.toUpperCase()+' IS OUT',1.8,PAL.amber);if(last.drv)last.drv.done=true;}
      if(live.length-1===1){const w=RACE.cars.find(c=>!c.out);w.done=true;w.time=RACE.clock;if(w.me){say('LAST ONE STANDING',3,PAL.gold);RACE.state='flag';RACE.flagT=RACE.clock;}}}}
  /* the flag: once you're done, the others get a little while to finish, then the results */
  if(RACE.state==='flag'&&(RACE.cars.every(c=>c.done||c.out)||RACE.clock-RACE.flagT>(ev.kind==='elim'?3:25)))raceResults();
}
function dragPost(dt){
  const S=WG.PKW.ST,fin=S.start+S.eighth,me=RACE.me;
  if(RACE.rt===null&&RACE.green&&inputThr()>.5)RACE.rt=RACE.clock;
  for(const c of RACE.cars){if(c.done)continue;const car=c.car,front=car.p[0]+car.c.body.L/2;
    if(c.leftT===undefined&&front>S.start+.2)c.leftT=RACE.clock;
    if(front>=fin){c.done=true;c.time=RACE.clock;c.mph=car.speed*2.237;c.et=RACE.clock-(c.leftT||0);if(!c.me)c.rt=c.drv.react;else c.rt=RACE.rt??0;}}
  if(me.done&&RACE.state!=='flag'){RACE.state='flag';RACE.flagT=RACE.clock;const won=!RACE.foul&&RACE.cars.every(c=>c.me||!c.done||c.time>me.time);say(RACE.foul?'RED LIGHT':won?'YOU WIN':'BEATEN',2.4,won?PAL.gold:PAL.red);}
  if(RACE.state==='flag'&&(RACE.cars.every(c=>c.done)||RACE.clock-RACE.flagT>6))raceResults();
}
const inputThr=()=>Math.max(INPUT.thr,TOUCH.on?TOUCH.thr:0);
/* the order now: finished ones by time, then the rest by how far round they are */
function raceOrder(){return RACE.cars.slice().sort((a,b)=>{if(a.out!==b.out)return a.out?1:-1;if(a.out&&b.out)return b.time-a.time;
  if(a.done!==b.done)return a.done?-1:1;if(a.done)return a.time-b.time;return (b.prog||0)-(a.prog||0);});}
function racePlace(c){return raceOrder().indexOf(c)+1;}
const ord=n=>n+(n%10===1&&n%100!==11?'ST':n%10===2&&n%100!==12?'ND':n%10===3&&n%100!==13?'RD':'TH');
/* R in a race: back onto the course where you were, pointing down it */
function raceResetMe(){const T=RACE.me.trk,L=T.line,s=Math.max(0,T.s-4),[x,z]=L.at(s,0),[x2,z2]=L.at(s+3,0);const lap=T.lap,i=T.i;
  placeCar(x,z,Math.atan2(-(z2-z),x2-x));T.i=i;T.lap=lap;T.track();}
/* ---------- the end ---------- */
function raceResults(){
  const ev=RACE.ev,D=RACE_DIFF[RACE.diff],me=RACE.me;let rows=[],place=0;
  if(ev.kind==='drag'){const o=RACE.cars.find(c=>!c.me),won=!RACE.foul&&me.done&&(!o.done||me.time<o.time);place=won?1:2;
    const row=(c,nm,car)=>({name:nm,car,time:c.done?fmtLap(c.time):'—',sub:c.done?`RT ${(c.rt||0).toFixed(3)}  ET ${(c.et||0).toFixed(2)}  ${Math.round(c.mph||0)} MPH`:'',me:c.me});
    rows=[row(me,'You',carLabel()),row(o,o.name,carName({car:BUILDS[o.bi].car})+' '+BUILDS[o.bi].name)];if(!won)rows.reverse();if(RACE.foul)rows[rows.length-1].sub='RED LIGHT';}
  else{const ord2=raceOrder(),lead=ord2[0];place=ord2.indexOf(me)+1;
    rows=ord2.map(c=>({name:c.me?'You':c.name,car:c.me?carLabel():carName({car:BUILDS[c.bi].car})+' '+BUILDS[c.bi].name,me:c.me,
      time:c.out?'OUT LAP '+((c.laps||0)+1):ev.kind==='elim'?(c.done?'WINNER':'RUNNING'):c.done?(c===lead?fmtLap(c.time):'+'+(c.time-lead.time).toFixed(2)):
        ev.laps===1?(((T=>T.line.len*(ev.laps-(c.laps??-1)-1)+T.line.len-T.s)(c.me?c.trk:c.drv))/1000).toFixed(1)+' KM TO GO':ev.laps-Math.max(0,c.laps||0)>1?'+'+(ev.laps-Math.max(0,c.laps||0))+' LAPS':'+1 LAP'}));
    if(me.best&&me.best<1e9)rows.find(r=>r.me).sub='BEST LAP '+fmtLap(me.best);}
  /* the purse: your share for the place, more on harder settings */
  const prize=place>0?Math.round(ev.purse*(RACE_PAY[place-1]||0)*D.pay/10)*10:0;
  if(prize>0)earn(prize);
  const key=ev.id+':'+RACE.diff,b=RACE.best[key];if(place>0&&(!b||place<b.place||place===b.place&&me.time<b.time))RACE.best[key]={place,time:me.time||0,car:carLabel()};raceSave();
  RACE.res={ev,place,prize,rows,diff:D.name};RACE.state='done';
  showResults();
}
/* leave the race (or tidy up after one): the robots' cars go, and their meshes twenty seconds later unless another
   race has started by then (Race again keeps them) */
function raceEnd(why){
  if(!RACE.on)return;RACE.on=false;RACE.hold=false;RACE.cars=[];RACE.others=[];RACE.out=[];RACE.me=null;RACE.state='';GAME.msgs.length=0;RACE.evictAt=APP.t+20;
  if(why)say(why,1.6);
}
/* ---------- drawing the robots' cars ---------- */
function raceDraw(c){
  if(!RACE.on)return 0;let tris=0;const F=frustum(c.VPw),e=c.eye,far=SKY.night&&SKY.draw?SKY.draw:GFX.far;
  for(const o of RACE.cars){if(o.me||!o.built||o.drv.kin&&!o.drv.posed)continue;const t=o.car,r=t.c.body.L*.6+1,d=Math.hypot(t.p[0]-e[0],t.p[2]-e[2]);
    if(d>far)continue;if(!boxVisible(F,[t.p[0]-r,t.p[1]-r,t.p[2]-r],[t.p[0]+r,t.p[1]+r,t.p[2]+r]))continue;
    tris+=drawWorldCar(t,null,o.dirt,true);}
  return tris;
}
/* the others' cars that cast shadows: drawn and within 150 m of you (further off a car's shadow is a few pixels,
   and the ground shader tests every pixel against every car on this list); the same list all frame */
const RACE_VIS=[];let RACE_VIS_F=-1;
function raceCars(){if(RACE_VIS_F!==GFX.frame){RACE_VIS_F=GFX.frame;RACE_VIS.length=0;const p=GAME.car.p;
  if(RACE.on)for(const o of RACE.cars){if(o.me||!o.built||o.drv.kin&&!o.drv.posed)continue;const q=o.car.p;if((q[0]-p[0])**2+(q[2]-p[2])**2<22500)RACE_VIS.push(o.car);}}
  return RACE_VIS;}
/* ---------- the others' engines: a cheap voice each for the three nearest (the Digital Engine is yours alone) ---------- */
const RVOX=[];
function raceSound(c){
  const A=ENG.audio;if(!A||!c)return;const ctx=A.ctx,now=ctx.currentTime;
  if(!RACE.on||GAME.state!=='drive'){for(const v of RVOX)v.g.gain.setTargetAtTime(0,now,.1);return;}
  if(!RVOX.length)for(let k=0;k<3;k++)RVOX.push(raceVox(A));
  const near=RACE.cars.filter(o=>!o.me).map(o=>({o,d:Math.hypot(o.car.p[0]-c.eye[0],o.car.p[1]-c.eye[1],o.car.p[2]-c.eye[2])})).sort((a,b)=>a.d-b.d);
  RVOX.forEach((v,k)=>{const q=near[k];if(!q||q.d>160){v.g.gain.setTargetAtTime(0,now,.08);return;}
    const t=q.o.car,cyl=+((String(t.spec.layout||'V8').match(/\d+/)||[8])[0]),f=Math.max(18,t.pt.rpm/60*cyl/2),thr=q.o.drv?q.o.drv.inp.thr:0;
    v.o1.frequency.setTargetAtTime(f,now,.03);v.o2.frequency.setTargetAtTime(f/2,now,.03);v.f.frequency.setTargetAtTime(Math.min(7000,f*2.2+300+thr*1400),now,.05);
    v.g.gain.setTargetAtTime(.2*(.35+.65*thr)/(1+Math.pow(q.d/9,1.6)),now,.05);
    if(v.p){const rx=-c.fwd[2],rz=c.fwd[0],dx=t.p[0]-c.eye[0],dz=t.p[2]-c.eye[2],l=Math.hypot(dx,dz)||1;v.p.pan.setTargetAtTime(clamp((dx*rx+dz*rz)/l*.8,-1,1),now,.05);}});
}
function raceVox(A){const ctx=A.ctx,o1=ctx.createOscillator(),o2=ctx.createOscillator(),m2=ctx.createGain(),f=ctx.createBiquadFilter(),g=ctx.createGain(),p=ctx.createStereoPanner?ctx.createStereoPanner():null;
  o1.type='sawtooth';o2.type='square';m2.gain.value=.45;f.type='lowpass';f.Q.value=1.4;g.gain.value=0;
  o1.connect(f);o2.connect(m2);m2.connect(f);f.connect(g);if(p){g.connect(p);p.connect(A.master);}else g.connect(A.master);o1.start();o2.start();return {o1,o2,f,g,p};}

