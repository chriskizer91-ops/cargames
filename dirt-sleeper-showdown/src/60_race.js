/* =====================================================================================
   RACES. Against robot drivers (44_ai) on the same physics as you, in cars rated close to yours for that kind of
   ground: circuits (the speedway's dirt oval, the short course, the road course, the cone course on the dry lake,
   the ranch's mud track), last car out on the oval, one on one down the drag strip, and two stages against the
   clock and five rivals' times (the rally through the Cedar Hills, the climb up Bald Mountain). Places pay.
   The race runs inside the game's own step: the robots' inputs once a frame, their cars stepped with yours, the
   cars touching each other. The HUD (61_hud) shows the lights, your place, the lap and the gaps; the results come
   up over the game at the end.
   Showdown adds three things. Cross-country races (45_cross): point to point over mud, dirt, gravel and tarmac
   against a field of different cars, each strongest somewhere else on the route. The sleeper twist: rivals size
   your car up by how fast it looks (56_parts' looksOf) and take it easy against one that looks slow, until it gets
   by them; beating cars that look faster than yours pays a "nobody saw it coming" bonus. And the strip callouts:
   sit in a staging lane and someone pulls up beside you, a ladder of eight to beat, slowest first.
   ===================================================================================== */
const RACE_DIFF={
  easy:{name:'Easy',skill:.84,slot:0,pay:.7,stage:1.07,blurb:'The others use about 85% of what their cars can do. You start on the front row.'},
  medium:{name:'Medium',skill:.9,slot:.5,pay:1,stage:1,blurb:'The others use about 90% of what their cars can do. You start in the middle of the pack.'},
  hard:{name:'Hard',skill:.96,slot:1,pay:1.4,stage:.96,blurb:'The others use nearly everything their cars have. You start at the back.'}};
const RACE_EVENTS=[
  {id:'oval',name:'Speedway 25',kind:'circuit',course:'oval',laps:8,field:6,terrain:'dirt',purse:2600,
    blurb:'Eight laps of the banked clay oval against five others, from a standing start. Slide it in, get back on the gas early.'},
  {id:'elim',name:'Last Car Out',kind:'elim',course:'oval',laps:5,field:6,terrain:'dirt',purse:3000,
    blurb:'Six on the oval: every time a lap is done, the car in last place is out. Be the one left after five.'},
  {id:'short',name:'Short Course',kind:'circuit',course:'short',laps:4,field:6,terrain:'dirt',purse:3200,
    blurb:'Four laps of the short course: two tabletops, the whoops, banked hairpins and the big sweeper.'},
  {id:'road',name:'Road Course',kind:'circuit',course:'road',laps:3,field:6,terrain:'asphalt',purse:3000,
    blurb:'Three laps of the paved road course off the county road. Braking points and power.'},
  {id:'lake',name:'Dry Lake Dash',kind:'circuit',course:'lake',laps:2,field:6,terrain:'gravel',purse:2800,
    blurb:'Two laps of the cone course out on the dry lake: wide open and flat out, through long sweepers.'},
  {id:'mud',name:'Mud Bog Dash',kind:'circuit',course:'mud',laps:3,field:4,terrain:'mud',purse:2400,
    blurb:'Three laps of the ranch\'s mud track against three others. Keep it moving.'},
  {id:'drag',name:'Eighth-Mile Drag',kind:'drag',course:'strip',field:2,terrain:'asphalt',purse:1500,
    blurb:'One on one down the strip, the tree counting down. Off the gas until it goes green, then go: first past the eighth mile wins.'},
  {id:'rally',name:'Cedar Hills Rally',kind:'stage',course:'rally',field:6,terrain:'gravel',purse:3400,
    blurb:'2.6 km of gravel through the hills: crests, hairpins and a ford. Against the clock and five rivals\' times.'},
  {id:'hill',name:'Summit Hill Climb',kind:'stage',course:'summit',field:6,terrain:'asphalt',purse:3200,
    blurb:'2.1 km of switchbacks up Bald Mountain to the mast. Against the clock and five rivals\' times.'}];
/* Showdown's cross-country races, first in the list */
RACE_EVENTS.unshift(...CROSS_ROUTES.map(r=>({id:r.id,name:r.name,kind:'cross',course:r.id,field:r.field,terrain:'cross',purse:r.purse,blurb:r.blurb,route:r})));
/* the rivals' times on the stages, by factory build (tools/races.js par: the robots at 95%, 8 s for each time they had to be put back) */
const STAGE_PAR={rally:{stock:131.4,sleeper:140.1,crawler:123.4,race:168.1,trail:144.2,trailRig:124.7,coupe:144.3,coupeGT:242.2,wagon:126.8,wagonSleeper:131.8,pickup:139.1,prerunner:121.9,muscle:136.6,muscleDrag:194.4,hatch:130.2,hatchB:118.4},
  summit:{stock:116.3,sleeper:103.9,crawler:122.9,race:97.7,trail:121.2,trailRig:117.6,coupe:103.5,coupeGT:105.5,wagon:112.9,wagonSleeper:103.7,pickup:130.3,prerunner:110.9,muscle:128.1,muscleDrag:105.8,hatch:130.2,hatchB:101.5}};
/* where a stage starts and finishes, metres along it (from the end when negative) */
const RACE_STAGE={rally:[24,-30],summit:[2,-12]};
const RACE_NAMES=['J. Hale','R. Ortiz','M. Becker','T. Nakamura','D. Okafor','S. Lindqvist','A. Moreau','K. Brennan','L. Ferreira','P. Novak','C. Walsh','E. Duarte','H. Adeyemi','N. Kowalski'];
const RACE_PAY=[1,.6,.42,.28,.18,.12];
const RACE={on:false,ev:null,diff:'medium',state:'',t:0,clock:0,cars:[],me:null,lines:{},best:{},hold:false,lights:0,msgT:0,res:null,myLooks:0};
try{const s=JSON.parse(store.get('dssd-races','{}'))||{};RACE.best=s.best||{};if(RACE_DIFF[s.diff])RACE.diff=s.diff;}catch(e){}
const raceSave=()=>store.set('dssd-races',JSON.stringify({best:RACE.best,diff:RACE.diff}));
/* the strip callouts: the ladder, slowest first (tools/ladder.js: the robots' eighth-mile times on the dirt strip),
   and how far up it you are. Each has a line for a car that looks slower than theirs and one for a car that doesn't. */
const LADDER=[
  {name:'Earl Tibbs',bid:'muscle',low:'That thing even run?',high:'Let\'s see if it\'s all paint.'},
  {name:'Wade Pruitt',bid:'pickup',low:'I\'ll give the church van a length.',high:'Big talk. Eighth mile?'},
  {name:'Tommy Vo',bid:'coupe',low:'Nice grocery-getter.',high:'Hope it goes like it looks.'},
  {name:'Big Red',bid:'muscleDrag',low:'Pull up, grandma.',high:'You brought a real car. Good.'},
  {name:'Dusty Maddox',bid:'prerunner',low:'Car wash line is that way.',high:'Dirt\'s my strip. You sure?'},
  {name:'Lena Marsh',bid:'hatchB',low:'Cute. I run hill climbs in this.',high:'Big turbo, four-wheel drive. Bring it.'},
  {name:'Rita Kowalski',bid:'wagonSleeper',low:'A sleeper. Takes one to know one.',high:'All show? Shame.'},
  {name:'The Ghost',bid:'race',low:'...',high:'...'}];
const CALLOUT={beaten:0,t:0,offer:null,lane:1,car:null};
try{const s=JSON.parse(store.get('dssd-ladder','{}'))||{};CALLOUT.beaten=clamp(s.beaten|0,0,LADDER.length);}catch(e){}
const ladderSave=()=>store.set('dssd-ladder',JSON.stringify({beaten:CALLOUT.beaten}));
/* ---------- the courses ---------- */
function raceLine(id){
  if(RACE.lines[id])return RACE.lines[id];
  const cr=CROSS_ROUTES.find(r=>r.id===id);
  if(cr){const W=RANCH.W,R=crossBuild(cr,W,Ranch.makePath),L=new RaceLine(R.path,R.hwAt,{ground:(x,z)=>W.groundAt(x,z),margin:1.3});L.route=cr;L.mix=crossMix(L);return RACE.lines[id]=L;}
  const W=RANCH.W,C=W.country,F=C.far,g=(x,z)=>W.groundAt(x,z);
  const D={oval:[F.oval,F.DEF.OV.hw,1.4],short:[F.short,F.DEF.SHORT_HALF,1.4],road:[C.track,C.DEF.TRACK_HALF,1.4],lake:[F.lakeLoop,14,2],mud:[W.mudTrack,5,1.2],
    rally:[F.rally,F.DEF.ROAD_HALF,1.3],summit:[F.summit,F.DEF.SUMMIT_HALF,1.3]}[id];
  return RACE.lines[id]=new RaceLine(D[0],D[1],{ground:g,margin:D[2]});
}
/* the drag strip: a straight line down each lane, to the end of the shutdown */
function dragLine(lane){const S=RANCH.W.strip,z=S.lanes[lane],k='strip'+lane;
  return RACE.lines[k]||(RACE.lines[k]=new RaceLine(Ranch.makePath([[S.x0+2,z],[S.x1-4,z]],false),3,{flat:true,ground:(x,z)=>RANCH.W.groundAt(x,z)}));}
/* ---------- who you race: the factory builds rated nearest yours for this ground ---------- */
const PRESET_IDS=()=>Object.keys(PRESET_PARTS);
function raceRating(i,terrain){return (rateBuild(i)||{})[terrain]||0;}
/* a cross-country route's rating for a build: its ratings on each kind of ground, by how much of the route that is
   (time goes as one over the square root of a rating, so the route's is the same sum turned back into a rating) */
function crossRating(i,mix){const r=rateBuild(i)||{};let s=0;for(const k in mix)s+=mix[k]/Math.sqrt(Math.max(1,r[k]||0));return s>0?1/(s*s):0;}
function pickRivals(ev,n){
  /* (down the strip it's the 0-60 time that matters) */
  const mix=ev.kind==='cross'?raceLine(ev.course).mix:null;
  const rate=i=>ev.kind==='drag'?60/Math.max(1,(rateBuild(i).figs||{}).z60||12):mix?crossRating(i,mix):raceRating(i,ev.terrain);
  const mine=rate(rigBuild(APP.car,rigOf(APP.car))),pool=PRESET_IDS().map(id=>{const i=BUILDS.findIndex(b=>b.id===id);return {id,i,r:rate(i)};});
  /* none hopeless for the ground: at least 45% of the best factory build there */
  const top=Math.max(...pool.map(p=>p.r)),ok=pool.filter(p=>p.r>=top*.45);
  ok.sort((a,b)=>Math.abs(a.r-mine)-Math.abs(b.r-mine));
  /* cross-country: a different car each where it can be, so the field is strong in different places */
  if(mix){const out=[],used=new Set();for(const p of ok){if(out.length>=n)break;const car=BUILDS[p.i].car;if(used.has(car))continue;used.add(car);out.push(p);}
    for(let k=0;out.length<n;k++)out.push(ok[k%ok.length]);return out;}
  const out=[];for(let k=0;k<n;k++)out.push(ok[k%ok.length]);return out;
}
/* ---------- starting one ---------- */
function startRace(id,evo){
  const ev=evo||RACE_EVENTS.find(e=>e.id===id);if(!ev)return;
  if(RACE.on)raceEnd(null);RUN.on=null;LAP.on=false;
  const D=RACE_DIFF[RACE.diff],seed=(Date.now()&0xffff)+1,R=Ranch.rng(seed),names=RACE_NAMES.slice().sort(()=>R()-.5);
  RACE.ev=ev;RACE.on=true;RACE.state='grid';RACE.t=0;RACE.clock=0;RACE.cars=[];RACE.res=null;RACE.out=[];RACE.msgT=0;RACE.lights=0;RACE.green=false;RACE.foul=false;RACE.rt=null;
  const t=GAME.car,me={car:t,name:'You',me:true,half:t.c.body.W/2,done:false,time:0,out:false};RACE.me=me;
  if(ev.kind==='drag'){
    /* a callout names its rival and you stay in the lane you pulled into */
    const S=RANCH.W.strip,rv=ev.rival?{id:ev.rival,i:BUILDS.findIndex(b=>b.id===ev.rival)}:pickRivals(ev,1)[0],mine=ev.lane??1,L0=dragLine(1-mine),L1=dragLine(mine);
    me.line=L1;me.trk=new Driver(t,L1,{});RACE.cars=[me];
    placeCar(S.start-t.c.body.L/2-.3,S.lanes[mine],0);
    const o=raceCar(rv,L0,{skill:D.skill,name:ev.rivalName||names[0],react:.34-.2*(D.skill-.84)/.12+R()*.08});
    o.car.place([S.start-o.car.c.body.L/2-.3,RANCH.W.heightAt(S.start,S.lanes[1-mine])+.05,S.lanes[1-mine]],0);raceSettle(o.car);RACE.cars.push(o);
  }
  else if(ev.kind==='cross'){
    /* a cross-country grid: two abreast on the route's open start, rows 9.5 m apart, you where the difficulty says */
    const L=raceLine(ev.course),cr=ev.route,n=ev.field,rv=pickRivals(ev,n-1),slot=Math.round(D.slot*(n-1));
    me.line=L;me.trk=new Driver(t,L,{});RACE.s1=L.len+cr.end;RACE.s0=cr.grid;
    let k=0;const spot=j=>{const s=cr.grid-Math.floor(j/2)*9.5;return [s,(j%2?1:-1)*Math.min(3.2,L.hwAt(Math.round(s/L.ds))*.42)];};
    for(let j=0;j<n;j++){const [s,l]=spot(j),[x,z]=L.at(s,l),[x2,z2]=L.at(s+3,l),yaw=Math.atan2(-(z2-z),x2-x);
      if(j===slot){placeCar(x,z,yaw);RACE.cars.push(me);continue;}
      const p=rv[k],o=raceCar(p,L,{skill:D.skill*(.97+R()*.05),name:names[k],react:.15+R()*.25,bias:(R()-.5)*1.2});k++;
      o.car.place([x,RANCH.W.heightAt(x,z)+.05,z],yaw);raceSettle(o.car);RACE.cars.push(o);}
  }
  else if(ev.kind==='stage'){
    const L=raceLine(ev.course),st=RACE_STAGE[ev.course],s0=st[0],s1=L.len+st[1],rv=pickRivals(ev,ev.field-1),par=STAGE_PAR[ev.course];
    me.line=L;me.trk=new Driver(t,L,{});RACE.cars=[me];RACE.s0=s0;RACE.s1=s1;
    const [x,z]=L.at(s0,0),[x2,z2]=L.at(s0+3,0);placeCar(x,z,Math.atan2(-(z2-z),x2-x));
    /* the rivals' times: their build's time at this difficulty, give or take, for the stage's own length */
    RACE.rivals=rv.map((p,k)=>({name:names[k],bid:p.i,build:BUILDS[p.i].name,car:carName({car:BUILDS[p.i].car}),time:(par[p.id]||130)*D.stage*(.97+R()*.07)}));
  }
  else{
    const L=raceLine(ev.course),n=ev.field,rv=pickRivals(ev,n-1),slot=Math.round(D.slot*(n-1)),lat=Math.min(3.2,L.hw*.42);
    me.line=L;me.trk=new Driver(t,L,{});
    let k=0;const spot=j=>[L.len-10-Math.floor(j/2)*9.5,(j%2?1:-1)*lat];
    for(let j=0;j<n;j++){const [s,l]=spot(j),[x,z]=L.at(s,l),[x2,z2]=L.at(s+3,l),yaw=Math.atan2(-(z2-z),x2-x);
      if(j===slot){placeCar(x,z,yaw);RACE.cars.push(me);continue;}
      const p=rv[k],o=raceCar(p,L,{skill:D.skill*(.97+R()*.05),name:names[k],react:.15+R()*.25,bias:(R()-.5)*1.2});k++;
      o.car.place([x,RANCH.W.heightAt(x,z)+.05,z],yaw);raceSettle(o.car);RACE.cars.push(o);}
  }
  for(const c of RACE.cars)if(!c.me){c.drv.track();}me.trk.track();
  truckEvict(RECENT.concat(RACE.cars.map(c=>BUILDS[c.car.bi].id)));
  if(GAME.car.pt.st==='off'){GAME.engineWanted=true;startEngine();}
  RACE.hold=true;CAM.cut=true;PRB.fresh=true;CSM.fresh=true;
  /* the sleeper twist: every rival sizes your car up. Against one that looks slow they drive at nine-tenths or so
     (less the slower it looks) and off the line a beat late; one that looks like a race car gets everything */
  RACE.myLooks=looksOf(GAME.car.bi);const e0=RACE.myLooks>=7?1:.9+.01*RACE.myLooks;
  for(const c of RACE.cars){if(!c.drv)continue;c.looks=looksOf(c.bi);c.awake=e0>=1;c.behindT=0;c.drv.setEffort(e0);if(ev.kind==='drag'&&!c.awake)c.drv.react+=(1-e0)*1.2;}
  say(ev.name.toUpperCase(),2.6,PAL.gold);
  if(ev.kind!=='stage')say(e0<1?'THEY\'RE SIZING YOU UP':'THEY SAW YOU COMING',2.6,e0<1?PAL.green:PAL.amber);
}
/* a robot's car: built, its helpers on, its meshes made now rather than mid-race */
function raceCar(p,L,o){const car=makeCar(p.i,RANCH.world,null);car.setAssists('ai');truck(p.i);truckFar(p.i);
  const d=new Driver(car,L,o);return {car,drv:d,name:o.name,bi:p.i,half:car.c.body.W/2,done:false,time:0,out:false,dirt:BUILDS[p.i].dirt||0};}
function raceSettle(car){car.pt.start();const I={steer:0,thr:0,brk:1,hb:0,nos:false};for(let k=0;k<120;k++)car.step(DT,I);car.v.fill(0);car.w.fill(0);}
/* ---------- each frame ---------- */
/* before the physics: the lights, the robots' inputs */
function raceFrame(dt){
  const ev=RACE.ev;RACE.t+=dt;
  if(RACE.state==='grid'){
    /* (held on the brake: never long enough to drop into reverse) */
    for(const c of RACE.cars){const v=c.car;v.revT=0;if(v.rev){v.rev=false;v.pt.rev=false;}}
    /* the lights: a second to settle, then one a second (drag: the tree's ambers half a second apart), then green */
    const drag=ev.kind==='drag',t0=1.2,step=drag?.5:1,n=3;RACE.lights=Math.max(0,Math.min(n,Math.floor((RACE.t-t0)/step)+1));
    if(drag&&RACE.lights>0&&inputThr()>.5&&!RACE.foul){RACE.foul=true;say('YOU JUMPED THE TREE',2,PAL.red);}
    if(RACE.t>=t0+n*step){RACE.state='race';RACE.green=true;RACE.hold=false;RACE.clock=0;say('GO!',1.4,PAL.green);buzz([40,30,40]);
      for(const c of RACE.cars)if(c.drv){c.drv.go=true;}}
  }
  else if(RACE.state==='race'||RACE.state==='flag')RACE.clock+=dt;
  /* the ones still sizing you up wake up when you get by them, or when they've spent six seconds behind you */
  if(RACE.state==='race'&&RACE.me.trk.i>=0){const mp=RACE.me.trk.prog;
    for(const c of RACE.cars){if(!c.drv||c.awake||c.done||c.out)continue;const ds=c.drv.prog-mp;
      if(ds<0)c.behindT+=dt;
      if(ds<-2&&c.wasAhead||c.behindT>6){c.awake=true;c.drv.setEffort(1);if(ev.kind==='drag')c.drv.thrCap=1;
        if(!RACE.wokeT||RACE.t-RACE.wokeT>1.5){RACE.wokeT=RACE.t;say(c.name.split(' ').pop().toUpperCase()+(c.wasAhead?' WOKE UP':' IS ON IT NOW'),1.8,PAL.amber);}}
      if(ds>1)c.wasAhead=true;}}
  /* everyone the robots look out for: the other robots, and you (your tracker knows where you are on the course) */
  const others=RACE.cars.map(q=>q.drv||q.trk);
  for(const c of RACE.cars){if(!c.drv)continue;if((c.done||c.out)&&!c.drv.done)c.drv.done=true;c.drv.drive(dt,others);}
}
/* the robots' cars stepped with yours, then everyone touching everyone */
const RACE_CARS=[];
function raceSub(dt){
  RACE_CARS.length=0;RACE_CARS.push(GAME.car);
  for(const c of RACE.cars){if(!c.drv||c.gone)continue;c.car.step(dt,c.drv.inp);RACE_CARS.push(c.car);}
  if(RACE_CARS.length>1)carContacts(RACE_CARS);
}
/* after the physics: where everyone is, laps, the finish, the robots put back on the course */
function racePost(dt){
  const ev=RACE.ev,me=RACE.me;if(!RACE.on)return;
  /* you: tracked strictly (way off the course, the tracker waits for you where you left it) */
  {const T=me.trk,L=T.line,keep=[T.i,T.lap,T.s,T.prog,T.lat];T.track();
    if(T.dist>L.hwAt(Math.max(0,T.i))+12&&keep[0]>=0){[T.i,T.lap,T.s,T.prog,T.lat]=keep;me.offT=(me.offT||0)+dt;
      if(me.offT>4&&RACE.state!=='grid'&&!me.done){me.offT=0;raceResetMe();say('BACK ON THE COURSE',1.6,PAL.amber);}}else me.offT=0;}
  for(const c of RACE.cars){if(!c.drv||c.gone)continue;const d=c.drv;
    if(d.resetReq&&!c.done){let back=8;
      /* cross-country: put back a third time within 40 m, a tractor pulls it 30 m on (the way past a mud hole a car can't cross) */
      if(ev.kind==='cross'){c.rs=(c.rs||[]).filter(s=>Math.abs(s-d.s)<40);c.rs.push(d.s);if(c.rs.length>=3){back=-30;c.rs=[];c.tows=(c.tows||0)+1;
        if(Math.hypot(c.car.p[0]-GAME.car.p[0],c.car.p[2]-GAME.car.p[2])<160)say(c.name.split(' ').pop().toUpperCase()+' GOT TOWED OUT',1.6,PAL.dim);}}
      const [x,z,yaw]=d.resetPose(back);c.car.place([x,RANCH.W.heightAt(x,z)+.05,z],yaw);raceSettle(c.car);d.i=-1;d.track();}}
  if(RACE.state==='grid')return;
  if(ev.kind==='drag')return dragPost(dt);
  if(ev.kind==='stage')return stagePost(dt);
  if(ev.kind==='cross')return crossPost(dt);
  /* circuits: laps done = line crossings - 1 (the grid is behind the line) */
  const L=me.trk.line;
  for(const c of RACE.cars){if(c.done||c.out)continue;const T=c.me?c.trk:c.drv,laps=T.lap-1;c.prog=T.prog;c.laps=laps;
    if(c.me&&laps>(c.lastLap??0)){c.lastLap=laps;const lt=RACE.clock-(c.lapT0||0);c.lapT0=RACE.clock;c.best=Math.min(c.best||1e9,lt);
      if(laps<ev.laps)say(laps===ev.laps-1?'FINAL LAP':'LAP '+(laps+1)+' OF '+ev.laps,1.6,laps===ev.laps-1?PAL.gold:PAL.white);}
    if(laps>=ev.laps){c.done=true;c.time=RACE.clock;if(c.me){RACE.state='flag';RACE.flagT=RACE.clock;say('FINISHED '+ord(racePlace(me)),3,PAL.gold);buzz([30,30,30,30,60]);}}}
  /* last car out: when the leader finishes each lap, whoever is last is done */
  if(ev.kind==='elim'){const live=RACE.cars.filter(c=>!c.out),lead=Math.max(...live.map(c=>c.laps||0));
    if(lead>(RACE.elimLap||0)&&live.length>1){RACE.elimLap=lead;const last=raceOrder().filter(c=>!c.out).pop();last.out=true;last.time=RACE.clock;RACE.out.push(last);
      if(last.me){say('YOU\'RE OUT',2.4,PAL.red);RACE.state='flag';RACE.flagT=RACE.clock;}else{say(last.name.toUpperCase()+' IS OUT',1.8,PAL.amber);if(last.drv)last.drv.done=true;}
      if(live.length-1===1){const w=RACE.cars.find(c=>!c.out);w.done=true;w.time=RACE.clock;if(w.me){say('LAST ONE STANDING',3,PAL.gold);RACE.state='flag';RACE.flagT=RACE.clock;}}}}
  /* the flag: once you're done, the others get a little while to finish, then the results */
  const allDone=RACE.cars.every(c=>c.done||c.out);
  if(RACE.state==='flag'&&(allDone||RACE.clock-RACE.flagT>(ev.kind==='elim'?3:25)))raceResults();
}
function dragPost(dt){
  const S=RANCH.W.strip,fin=S.start+S.eighth,me=RACE.me;
  if(RACE.rt===null&&RACE.green&&inputThr()>.5)RACE.rt=RACE.clock;
  for(const c of RACE.cars){if(c.done)continue;const car=c.car,front=car.p[0]+car.c.body.L/2;
    if(c.leftT===undefined&&front>S.start+.2)c.leftT=RACE.clock;
    if(front>=fin){c.done=true;c.time=RACE.clock;c.mph=car.speed*2.237;c.et=RACE.clock-(c.leftT||0);if(!c.me)c.rt=c.drv.react;else c.rt=RACE.rt??0;}}
  if(me.done&&RACE.state!=='flag'){RACE.state='flag';RACE.flagT=RACE.clock;const won=!RACE.foul&&RACE.cars.every(c=>c.me||!c.done||c.time>me.time);say(RACE.foul?'RED LIGHT':won?'YOU WIN':'BEATEN',2.4,won?PAL.gold:PAL.red);}
  if(RACE.state==='flag'&&(RACE.cars.every(c=>c.done)||RACE.clock-RACE.flagT>6))raceResults();
}
/* cross-country: everyone's distance down the route; done at the end of it; the others get 40 s after you */
function crossPost(dt){
  const me=RACE.me;
  for(const c of RACE.cars){if(c.done)continue;const T=c.me?c.trk:c.drv;c.prog=T.prog;c.togo=Math.max(0,RACE.s1-T.s);
    if(T.s>=RACE.s1){c.done=true;c.time=RACE.clock;c.togo=0;if(c.me){RACE.state='flag';RACE.flagT=RACE.clock;say('FINISHED '+ord(racePlace(me)),3,PAL.gold);buzz([30,30,30,30,60]);}}}
  if(RACE.state==='flag'&&(RACE.cars.every(c=>c.done)||RACE.clock-RACE.flagT>40))raceResults();
}
function stagePost(dt){
  const me=RACE.me,L=me.line,s=me.trk.s;
  /* splits at a third and two thirds, against the quickest rival's pace */
  const len=RACE.s1-RACE.s0,best=Math.min(...RACE.rivals.map(r=>r.time));
  for(const f of [1/3,2/3]){const k=f<.5?'sp1':'sp2';if(me[k]===undefined&&s>=RACE.s0+len*f){me[k]=RACE.clock;const dlt=RACE.clock-best*f;say('SPLIT '+(dlt<0?'-':'+')+Math.abs(dlt).toFixed(2),2,dlt<0?PAL.green:PAL.red);}}
  if(!me.done&&s>=RACE.s1){me.done=true;me.time=RACE.clock;RACE.state='flag';RACE.flagT=RACE.clock;say('STAGE TIME '+fmtLap(me.time),3,PAL.gold);}
  if(RACE.state==='flag'&&RACE.clock-RACE.flagT>2.5)raceResults();
}
const inputThr=()=>Math.max(INPUT.thr,TOUCH.on?TOUCH.thr:0);
/* the order now: finished ones by time, then the rest by how far round they are */
function raceOrder(){return RACE.cars.slice().sort((a,b)=>{if(a.out!==b.out)return a.out?1:-1;if(a.out&&b.out)return b.time-a.time;
  if(a.done!==b.done)return a.done?-1:1;if(a.done)return a.time-b.time;return (b.prog||0)-(a.prog||0);});}
function racePlace(c){return raceOrder().indexOf(c)+1;}
const ord=n=>n+(n%10===1&&n%100!==11?'ST':n%10===2&&n%100!==12?'ND':n%10===3&&n%100!==13?'RD':'TH');
/* R in a race: back onto the course where you were, pointing down it */
function raceResetMe(){const T=RACE.me.trk,L=T.line,me=RACE.me;let s=Math.max(0,T.s-4);
  /* cross-country: a third reset within 40 m and you get the tractor too: 30 m on */
  if(RACE.ev.kind==='cross'){me.rs=(me.rs||[]).filter(q=>Math.abs(q-T.s)<40);me.rs.push(T.s);if(me.rs.length>=3){me.rs=[];s=Math.min(RACE.s1-5,T.s+30);say('TOWED OUT',1.6,PAL.amber);}}
  const [x,z]=L.at(s,0),[x2,z2]=L.at(s+3,0);const lap=T.lap,i=T.i;
  placeCar(x,z,Math.atan2(-(z2-z),x2-x));T.i=i;T.lap=lap;T.track();}
/* ---------- the end ---------- */
function raceResults(){
  const ev=RACE.ev,D=RACE_DIFF[RACE.diff],me=RACE.me;let rows=[],place=0;
  if(ev.kind==='stage'){const all=RACE.rivals.map(r=>({name:r.name,car:r.car+' '+r.build,time:r.time})).concat(me.done?[{name:'You',car:carLabel(),time:me.time,me:true}]:[]).sort((a,b)=>a.time-b.time);
    rows=all.map(r=>({name:r.name,car:r.car,time:fmtLap(r.time),me:r.me}));place=me.done?all.findIndex(r=>r.me)+1:0;}
  else if(ev.kind==='drag'){const o=RACE.cars.find(c=>!c.me),won=!RACE.foul&&me.done&&(!o.done||me.time<o.time);place=won?1:2;
    const row=(c,nm,car)=>({name:nm,car,time:c.done?fmtLap(c.time):'—',sub:c.done?`RT ${(c.rt||0).toFixed(3)}  ET ${(c.et||0).toFixed(2)}  ${Math.round(c.mph||0)} MPH`:'',me:c.me});
    rows=[row(me,'You',carLabel()),row(o,o.name,carName({car:BUILDS[o.bi].car})+' '+BUILDS[o.bi].name)];if(!won)rows.reverse();if(RACE.foul)rows[rows.length-1].sub='RED LIGHT';}
  else{const ord2=raceOrder(),lead=ord2[0];place=ord2.indexOf(me)+1;
    if(ev.kind==='cross'&&!me.done)place=0;
    rows=ord2.map(c=>({name:c.me?'You':c.name,car:c.me?carLabel():carName({car:BUILDS[c.bi].car})+' '+BUILDS[c.bi].name,me:c.me,c,
      time:c.out?'OUT LAP '+((c.laps||0)+1):ev.kind==='elim'?(c.done?'WINNER':'RUNNING'):c.done?(c===lead?fmtLap(c.time):'+'+(c.time-lead.time).toFixed(2)):
        ev.kind==='cross'?((c.togo||0)/1000).toFixed(2)+' KM TO GO':(ev.laps-(c.laps||0)>1?'+'+(ev.laps-(c.laps||0))+' LAPS':'+1 LAP')}));
    if(me.best&&me.best<1e9)rows.find(r=>r.me).sub='BEST LAP '+fmtLap(me.best);
    if(ev.kind==='cross')for(const r of rows)if(r.c.tows)r.sub=(r.sub?r.sub+'  ':'')+'TOWED '+(r.c.tows>1?r.c.tows+' TIMES':'ONCE');
    for(const r of rows)delete r.c;}
  /* the purse: your share for the place, more on harder settings */
  const prize=place>0?Math.round(ev.purse*(RACE_PAY[place-1]||0)*D.pay/10)*10:0;
  if(prize>0)Feats.award(`${ev.name}: ${ord(place).toLowerCase()} on ${D.name.toLowerCase()}`,prize);
  /* nobody saw it coming: for every rival you finished ahead of whose car looks faster than yours (by more than a
     point), 3% of the purse for each point between you */
  let bonus=0;const beat=[];
  if(place>0&&ev.kind!=='stage'){const order=ev.kind==='drag'?(place===1?[me,...RACE.cars.filter(c=>!c.me)]:[]):raceOrder(),mi=order.indexOf(me);
    for(const c of order.slice(mi+1))if(c.drv&&c.looks>RACE.myLooks+1){beat.push(c);bonus+=ev.purse*.03*(c.looks-RACE.myLooks);}}
  bonus=Math.round(bonus*D.pay/10)*10;if(bonus>0)Feats.award('Nobody saw it coming: '+ev.name,bonus);
  const key=ev.id+':'+RACE.diff,b=RACE.best[key];if(ev.id!=='callout'&&place>0&&(!b||place<b.place||place===b.place&&me.time<b.time))RACE.best[key]={place,time:me.time||0,car:carLabel()};raceSave();
  /* a callout won moves you up the ladder */
  let ladder='';if(ev.id==='callout'){if(place===1&&ev.rung===CALLOUT.beaten){CALLOUT.beaten++;ladderSave();}
    ladder=place===1?(CALLOUT.beaten>=LADDER.length?'That\'s the whole ladder. Anyone at the strip will still run you.':'Next up: '+LADDER[CALLOUT.beaten].name+'. Pull into a staging lane again.'):'Pull into a staging lane to run '+ev.rivalName+' again.';}
  for(const r of rows){const c=r.me?{looks:RACE.myLooks}:RACE.cars.find(q=>!q.me&&q.name===r.name);if(c&&c.looks!==undefined&&ev.kind!=='stage')r.sub=(r.sub?r.sub+'  ':'')+'LOOKS '+c.looks;}
  RACE.res={ev,place,prize,bonus,beat:beat.map(c=>c.name),rows,diff:D.name,ladder};RACE.state='done';
  showResults();
}
/* ---------- the strip callouts ----------
   Stop in either staging lane, facing down the strip: after a moment the next rival on the ladder pulls up and says
   something about your car. Stay put and the race is on a few seconds later; drive off and it isn't. */
function calloutStep(dt,t){
  const S=RANCH.W.strip,lane=S.lanes.findIndex(z=>Math.abs(t.p[2]-z)<2.4),fx=t.M[0];
  const staged=lane>=0&&t.p[0]>S.start-18&&t.p[0]<S.start+.5&&t.speed<1.2&&fx>.9&&t.M[4]>.8;
  if(!staged){if(CALLOUT.offer&&CALLOUT.t>2)say('MAYBE NEXT TIME',1.4,PAL.dim);CALLOUT.t=0;CALLOUT.offer=null;CALLOUT.car=null;return;}
  CALLOUT.t+=dt;CALLOUT.lane=lane;
  /* the rival rolls up the other lane and stops on the line beside you */
  const cc=CALLOUT.car;if(cc){const goal=S.start-cc.c.body.L/2-.3,d=goal-cc.p[0],vd=Math.max(0,Math.min(9,Math.sqrt(Math.max(0,2*2.5*d)))),I={steer:0,thr:cc.speed<vd-.5?.35:0,brk:cc.speed>vd+.3||d<.2?.8:0,hb:0,nos:false};
    for(let k=0,n=Math.round(dt/DT);k<n;k++)cc.step(DT,I);}
  if(!CALLOUT.offer&&CALLOUT.t>1.5){const all=CALLOUT.beaten>=LADDER.length,k=all?Math.floor(Math.random()*LADDER.length):CALLOUT.beaten,r=LADDER[k],bi=BUILDS.findIndex(b=>b.id===r.bid),b=BUILDS[bi],lk=looksOf(GAME.car.bi);
    CALLOUT.offer={k,r};const again=all;
    {const car=makeCar(bi,RANCH.world,null);car.setAssists('ai');truck(bi);const z=S.lanes[1-lane];car.place([S.start-40,RANCH.W.heightAt(S.start-40,z)+.05,z],0);car.pt.start();
      const I={steer:0,thr:0,brk:1,hb:0,nos:false};for(let q=0;q<60;q++)car.step(DT,I);car.v[0]=9;CALLOUT.car=car;CALLOUT.bi=bi;}
    /* (the newest message shows on top: said bottom line first) */
    say('STAY IN THE LANE TO RUN',4.5,PAL.amber);
    say(`"${(lk<looksOf(bi)-1?r.low:r.high).toUpperCase()}"`,4.5,PAL.white);
    say((again?'REMATCH: ':'')+r.name.toUpperCase()+' PULLS UP',4.5,PAL.gold);void b;}
  if(CALLOUT.offer&&CALLOUT.t>6.5){const {k,r}=CALLOUT.offer;CALLOUT.offer=null;CALLOUT.t=-1e9;CALLOUT.car=null;
    startRace('callout',{id:'callout',name:'Callout: '+r.name,kind:'drag',course:'strip',field:2,terrain:'asphalt',purse:600+300*k,rival:r.bid,rivalName:r.name,rung:k,lane:CALLOUT.lane,
      blurb:'One on one down the eighth mile.'});}
}
/* leave the race (or tidy up after one): the robots' cars go */
function raceEnd(why){
  if(!RACE.on)return;RACE.on=false;RACE.hold=false;RACE.cars=[];RACE.me=null;RACE.state='';GAME.msgs.length=0;
  if(why)say(why,1.6);
}
/* ---------- drawing the robots' cars ---------- */
function raceDraw(c){
  if(!RACE.on)return 0;let tris=0;const F=frustum(c.VP),e=c.eye;
  for(const o of RACE.cars){if(o.me||o.gone)continue;const t=o.car,r=t.c.body.L*.6+1,d=Math.hypot(t.p[0]-e[0],t.p[2]-e[2]);
    if(d>(SKY.night?SKY.draw:GFX.far))continue;if(!boxVisible(F,[t.p[0]-r,t.p[1]-r,t.p[2]-r],[t.p[0]+r,t.p[1]+r,t.p[2]+r]))continue;
    tris+=drawWorldCar(t,null,o.dirt,d>45);}
  return tris;
}
const raceCars=()=>RACE.on?RACE.cars.filter(o=>!o.me&&!o.gone).map(o=>o.car):CALLOUT.car?[CALLOUT.car]:[];
/* a callout's rival, rolling up before the race */
function calloutDraw(c){const t=CALLOUT.car;if(RACE.on||!t)return 0;const d=Math.hypot(t.p[0]-c.eye[0],t.p[2]-c.eye[2]);return d>GFX.far?0:drawWorldCar(t,null,BUILDS[CALLOUT.bi].dirt||0,d>45);}
/* ---------- the others' engines: a cheap voice each for the three nearest (the Digital Engine is yours alone) ---------- */
const RVOX=[];
function raceSound(c){
  const A=ENG.audio;if(!A||!c)return;const ctx=A.ctx,now=ctx.currentTime;
  if(!RACE.on||GAME.state!=='drive'){for(const v of RVOX)v.g.gain.setTargetAtTime(0,now,.1);return;}
  if(!RVOX.length)for(let k=0;k<3;k++)RVOX.push(raceVox(A));
  const near=RACE.cars.filter(o=>!o.me&&!o.gone).map(o=>({o,d:Math.hypot(o.car.p[0]-c.eye[0],o.car.p[1]-c.eye[1],o.car.p[2]-c.eye[2])})).sort((a,b)=>a.d-b.d);
  RVOX.forEach((v,k)=>{const q=near[k];if(!q||q.d>160){v.g.gain.setTargetAtTime(0,now,.08);return;}
    const t=q.o.car,cyl=+((String(t.spec.layout||'V8').match(/\d+/)||[8])[0]),f=Math.max(18,t.pt.rpm/60*cyl/2),thr=q.o.drv?q.o.drv.inp.thr:0;
    v.o1.frequency.setTargetAtTime(f,now,.03);v.o2.frequency.setTargetAtTime(f/2,now,.03);v.f.frequency.setTargetAtTime(Math.min(7000,f*2.2+300+thr*1400),now,.05);
    v.g.gain.setTargetAtTime(.2*(.35+.65*thr)/(1+Math.pow(q.d/9,1.6)),now,.05);
    if(v.p){const rx=-c.fwd[2],rz=c.fwd[0],dx=t.p[0]-c.eye[0],dz=t.p[2]-c.eye[2],l=Math.hypot(dx,dz)||1;v.p.pan.setTargetAtTime(clamp((dx*rx+dz*rz)/l*.8,-1,1),now,.05);}});
}
function raceVox(A){const ctx=A.ctx,o1=ctx.createOscillator(),o2=ctx.createOscillator(),m2=ctx.createGain(),f=ctx.createBiquadFilter(),g=ctx.createGain(),p=ctx.createStereoPanner?ctx.createStereoPanner():null;
  o1.type='sawtooth';o2.type='square';m2.gain.value=.45;f.type='lowpass';f.Q.value=1.4;g.gain.value=0;
  o1.connect(f);o2.connect(m2);m2.connect(f);f.connect(g);if(p){g.connect(p);p.connect(A.master);}else g.connect(A.master);o1.start();o2.start();return {o1,o2,f,g,p};}

