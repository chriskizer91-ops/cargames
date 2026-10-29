/* Rank every car and build for the three kinds of race: circuit, street and off-road.
   usage: node tools/rank.js [out-dir]     (writes ratings.json and car-rankings.md)

   Nothing here is a guess about which car "should" win. Each build's straight-line performance comes
   from its own Digital Engine: the same sim the model bay runs, driven flat out from a standstill
   (launch control where the build has it, no nitrous) on tarmac and on dirt. Each build's chassis
   numbers come from its model: tyre type and width, track, roof height (for the centre of gravity),
   sill height and ride offset (for ground clearance), suspension type, brakes and wing. Those go
   into a lap simulator that drives three reference courses: the fastest it can take each corner on
   that tyre and surface, braking down to it as late as the brakes allow, and accelerating out of it
   as hard as the engine, the gearbox and the tyres allow, with the grip shared between turning and
   accelerating. Bumps, rocks and jumps cap the speed by wheel travel and ground clearance. */
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const PAGE=process.env.PAGE||path.resolve(__dirname,'..','model-bay.html');
const OUT=process.argv[2]||path.resolve(__dirname,'..','design');

/* ---------- the chassis numbers the model does not carry ----------
   travel: usable wheel travel (m). ride: how well the dampers take bumps at speed (rally dampers
   and desert bypass shocks above 1, a crawler's soft articulation below it). aero: downforce
   coefficient times area (m^2). setup: a handling factor for builds set up for one job (a drag car's
   soft rear and front runners). brake: brakes in g where the part list's name misleads (a drag car's
   light discs are made to stop once, not every lap). gravel: tyres built for loose surfaces even where
   the model's tyre type says all-terrain. dragRadial: soft drag radials on the street car. runners: a
   drag car's skinny front runners, made to roll, not to turn. */
const CHASSIS={
  stock:{travel:.20},sleeper:{travel:.15,aero:.05},crawler:{travel:.30,ride:.85},race:{travel:.09,aero:1.0},
  trail:{travel:.24},trailRig:{travel:.34,ride:.8},
  coupe:{travel:.14,aero:.15},coupeGT:{travel:.10,aero:1.1},
  wagon:{travel:.17},wagonSleeper:{travel:.14,dragRadial:1},
  pickup:{travel:.22},prerunner:{travel:.46,ride:1.15},
  muscle:{travel:.16},muscleDrag:{travel:.14,setup:.85,brake:.85,runners:1},
  hatch:{travel:.17},hatchB:{travel:.26,ride:1.3,aero:.35,gravel:1}
};
/* bodies that carry a solid rear axle (its diff hangs lowest) and bodies built on a frame (a frame
   and skid plates sit lower than the sill) */
const SOLID_REAR={trail:1,pickup:1,muscle:1},FRAME={suv:1,trail:1,pickup:1};

/* ---------- tyres: grip on tarmac across the tread (lateral) and in a straight line on dirt ---------- */
const TYRE={hwy:{lat:.92,dirt:.60},perf:{lat:1.05,dirt:.55},slick:{lat:1.30,dirt:.42},at:{lat:.88,dirt:.74},mt:{lat:.78,dirt:.82},
  gravel:{lat:.90,dirt:.88},drag:{lat:.98,dirt:.50},runner:{lat:.70,dirt:.45}};
/* on a public road a slick never gets up to temperature and picks up every bit of grit */
const STREET_SLICK=.85;
const BRAKE={stock:.90,big:1.05,race:1.30};
const G0=9.81,RHO=1.2;

/* ---------- the three reference courses ----------
   Each is a list of pieces: [length m, corner radius m (0 = straight), options]. Options: surf
   (tarmac, dirt, mud), rough (0..1 bump severity), rocks (obstacle height m), grade (rise over run),
   jump (a jump at the end of the piece), dip (a gutter or crossing dip that grounds low cars). */
const deg=(r,a)=>[r*a*Math.PI/180,r];
const COURSES={
  circuit:{name:'Ridgeline Raceway',kind:'Circuit',surf:'tarmac',pieces:[
    [900,0],[...deg(16,180)],[220,0],[...deg(60,90)],[160,0],[...deg(45,60)],[...deg(45,60)],[...deg(45,60)],[300,0],
    [...deg(180,90)],[250,0],[...deg(20,45)],[...deg(20,45)],[400,0],[...deg(90,120)],[180,0],[...deg(30,90)]]},
  /* downtown blocks, then out along the harbour expressway and back through the warehouses:
     square corners and dips for the low cars, long pulls for the fast ones, and traffic and expansion
     joints on the expressway, so nobody holds top speed for long */
  street:{name:'Harbor District',kind:'Street',surf:'street',pieces:[
    [250,0,{rough:.1}],[...deg(12,90)],[110,0],[10,0,{dip:1}],[110,0],[...deg(14,90)],[300,0,{rough:.15}],
    [...deg(30,60)],[900,0,{rough:.15,traffic:60}],[...deg(300,40),{rough:.15,traffic:60}],[600,0,{rough:.15,traffic:60}],[...deg(20,270)],[200,0],[10,0,{dip:1}],[190,0],
    [...deg(12,90)],[130,0],[10,0,{dip:1}],[120,0],[...deg(12,90)],[180,0,{rough:.3}],[...deg(10,180)],[140,0],[10,0,{dip:1}],[150,0],[...deg(40,45)],[150,0]]},
  /* a rally-raid: fast gravel corners, whoops, a hill climb, a rocky ledge, a jump, a water splash */
  offroad:{name:'Red Rock Rally-Raid',kind:'Off-road',surf:'dirt',pieces:[
    [400,0,{rough:.25}],[...deg(45,90),{rough:.2}],[200,0,{rough:.3}],[...deg(30,120),{rough:.2}],[...deg(60,60),{rough:.2}],[150,0,{rough:.3,jump:1}],
    [300,0,{rough:.85}],[...deg(50,90),{rough:.3}],[250,0,{grade:.14,rough:.45}],[...deg(15,180),{}],[40,0,{rocks:.22,grade:.08}],
    [220,0,{grade:-.12,rough:.35,jump:1}],[300,0,{rough:.2}],[...deg(200,45),{rough:.2}],[300,0,{rough:.2}],[80,0,{surf:'mud',rough:.4}],
    [...deg(40,90),{rough:.25}],[250,0,{rough:.75}],[...deg(25,150),{rough:.2}],[400,0,{rough:.45,jump:1}],[...deg(70,90),{rough:.25}],[300,0,{rough:.25}]]}
};

/* ---------- in the page: each build's chassis sheet and its acceleration curves from the Digital Engine ---------- */
function inPage([CH,SR,FR,TY,BR]){
  const B=__bay.BUILDS,out=[];
  /* flat out from a standstill. Builds with a trans-brake launch off the two-step. Returns t at each
     whole m/s, the distance covered by then, and the top speed */
  function run(i,mu){
    const e=Object.assign({},__bay.specOf(i));if(mu)e.mu=mu;
    const s=__bay.SIM.makeSim(e);s.mode='drive';s.start();
    const dt=1/240,inp={thr:0,brk:0,nos:false};
    for(let k=0;k<240*4;k++)s.step(dt,inp);
    s.gear=0;s.clutch='open';s.shiftT=0;s.held=false;s.v=0;s.ww=0;s.pos=0;
    let t=0,x=0;
    if(e.launch){inp.brk=1;inp.thr=1;for(let k=0;k<240*1.5;k++)s.step(dt,inp);inp.brk=0;}
    else inp.thr=1;
    const tv=[0],xv=[0];let vMax=0,stall=0,q=null;
    for(let k=0;k<240*150;k++){const x0=x;s.step(dt,inp);t+=dt;x+=s.v*dt;
      while(tv.length<=Math.floor(s.v)){tv.push(t);xv.push(x);}
      if(!q&&x>=402.336)q={t:t-dt*(x-402.336)/Math.max(1e-6,x-x0),v:s.v};
      if(s.v>vMax+1e-3){vMax=s.v;stall=0;}else if((stall+=dt)>8&&q)break;}
    return {tv,xv,vMax,q};
  }
  for(let i=0;i<B.length;i++){
    const b=B[i],l=b.look,D=__bay.suvDesign(l),Bd=D.B,e=__bay.specOf(i),ch=CH[b.id]||{};
    /* tyres: the steering axle sets how hard the car can turn; a staggered car leans on both */
    const tyF=ch.gravel?'gravel':ch.dragRadial?'drag':ch.runners?'runner':l.tyre.tyre,tyR=ch.gravel?'gravel':ch.dragRadial?'drag':(l.tyreR?l.tyreR.tyre:tyF);
    const wF=Math.pow(l.tyre.W/.245,.25),wR=Math.pow((l.tyreR||l.tyre).W/.245,.25);
    const latF=TY[tyF].lat*wF,latR=TY[tyR].lat*wR;
    let lat=.65*Math.min(latF,latR)+.35*Math.max(latF,latR);
    /* a high centre of gravity on a narrow track shifts weight and rolls over sooner */
    const track=(l.track+(l.trackR||l.track))/2,h=.37*D.Hr,stab=Math.max(.6,Math.min(1.08,1.25-.9*h/track));
    const susp=l.susp==='solid'?.95:1,setup=ch.setup||1;
    const latG=.92*lat*stab*susp*setup;
    const dirtLat=.92*Math.min(TY[tyF].dirt,TY[tyR].dirt)*Math.sqrt(stab)*setup*(l.susp==='solid'?1.02:1);
    const dirtLong=TY[tyR].dirt*(e.drv==='AWD'?1:1);
    /* ground clearance: the sill and ride height, less the frame under it, or the lowest diff */
    const R=l.tyre.R,Rr=(l.tyreR||l.tyre).R,sill=Math.min(...Bd.sill.filter(p=>p[0]>=Bd.ovF&&p[0]<=Bd.ovF+Bd.wb).map(p=>p[1]))+D.dy;
    const under=sill-(FR[b.car]?.12:.05),solidF=l.susp==='solid',solidR=solidF||!!SR[b.car];
    const clear=Math.min(under,solidF?R-.13:R-.04,solidR?Rr-.13:Rr-.04);
    const tar=run(i),dirt=run(i,dirtLong);
    out.push({i,id:b.id,car:b.car,name:b.name,tag:b.tag,hp:e.peak.hp,tq:e.peak.tq,mass:e.mass,drv:e.drv,muLong:e.mu,nosKw:e.nosKw||0,
      latG,dirtLat,dirtLong,brake:ch.brake||BR[l.tyre.brake]||.9,aero:ch.aero||0,travel:ch.travel,ride:ch.ride||1,clear,h,track,stab,tyre:tyF,tyreR:tyR,susp:l.susp,tar,dirt});
  }
  return out;
}

/* ---------- the lap simulator ---------- */
function lap(c,course){
  const ds=1,pts=[];
  for(const [len,r,o={}] of course.pieces){const n=Math.max(1,Math.round(len/ds));for(let k=0;k<n;k++)pts.push({r,o,surf:o.surf||course.surf,last:k===n-1});}
  const N=pts.length;
  /* acceleration from the engine run: the time between whole m/s, so shift gaps are in it */
  const acc=(run,v)=>{const k=Math.floor(v);if(k+1>=run.tv.length)return 0;return 1/Math.max(1e-3,run.tv[k+1]-run.tv[k]);};
  const surfK=s=>s==='mud'?.65:1;
  /* grip at speed: tyres on that surface plus downforce */
  const latAt=(p,v)=>{const tarmac=p.surf==='tarmac'||p.surf==='street',base=tarmac?c.latG*(p.surf==='street'?.95*c.streetK:1):c.dirtLat*surfK(p.surf);
    return base*(G0+c.aero*.5*RHO*v*v/c.mass*(tarmac?1:.6));};
  const brkAt=(p,v)=>{const tarmac=p.surf==='tarmac'||p.surf==='street';return Math.min(c.brake*G0,latAt(p,v)*(tarmac?1:1.05))+(p.o.grade||0)*G0;};
  /* the speed each point can be taken at */
  const cap=new Float64Array(N);
  for(let k=0;k<N;k++){const p=pts[k],o=p.o;let v=120;
    if(p.r){/* v^2/r = lateral grip at v, solved by iteration (downforce grows with v) */let w=Math.sqrt(latAt(p,0)*p.r);for(let q=0;q<8;q++)w=Math.sqrt(latAt(p,w)*p.r);v=Math.min(v,w);}
    /* whoops: the speed a car can carry over them grows with the square of its wheel travel, a little
       with lightness, and with dampers made for it; milder bumps let it go much faster */
    if(o.rough){const vw=(6+150*c.travel*c.travel)*Math.pow(1500/c.mass,.15)*c.ride;v=Math.min(v,vw*Math.pow(.8/o.rough,1.2));}
    /* rocks: a car that clears them picks its way through; one that does not drags its belly over them */
    if(o.rocks){v=Math.min(v,c.clear>=o.rocks?7+15*(c.clear-o.rocks):Math.max(2.5,7-40*(o.rocks-c.clear)));}
    if(o.dip&&c.clear<.13)v=Math.min(v,c.clear<.09?8:13);
    /* traffic: nobody holds top speed through it */
    if(o.traffic)v=Math.min(v,o.traffic);
    if(o.jump&&p.last&&c.travel<.2)v=Math.min(v,12+40*c.travel);
    cap[k]=v;}
  /* backward: brake down to every cap; forward: accelerate out of it, sharing grip with the corner */
  const vb=Float64Array.from(cap);
  for(let k=N-2;k>=0;k--)vb[k]=Math.min(vb[k],Math.sqrt(vb[k+1]*vb[k+1]+2*brkAt(pts[k],vb[k+1])*ds));
  const vf=new Float64Array(N);let v=0,t=0;
  for(let k=0;k<N;k++){const p=pts[k],run=p.surf==='tarmac'||p.surf==='street'?c.tar:c.dirt;
    let a=acc(run,v)*(p.surf==='mud'?.7:1);
    if(p.r){const used=v*v/p.r/latAt(p,v);a*=Math.sqrt(Math.max(0,1-used*used));}
    a-=(p.o.grade||0)*G0;
    const v2=Math.min(vb[k],Math.sqrt(Math.max(.25,v*v+2*a*ds)));t+=2*ds/(v+v2);v=v2;vf[k]=v;}
  return {t,vAvg:N*ds/t,vMax:Math.max(...vf)};
}

/* ---------- figures a player knows ---------- */
const at=(run,v)=>{/* time to v (m/s), interpolated */const k=Math.floor(v);if(k+1>=run.tv.length)return null;return run.tv[k]+(run.tv[k+1]-run.tv[k])*(v-k);};
const quarter=run=>run.q;

(async()=>{
  const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const pg=await (await b.newContext({viewport:{width:800,height:600}})).newPage();
  await pg.addInitScript(()=>{try{localStorage.clear();}catch(e){}window.requestAnimationFrame=()=>0;});
  await pg.goto('file://'+PAGE);await pg.waitForFunction(()=>window.__bay,null,{timeout:120000});
  const cars=await pg.evaluate(inPage,[CHASSIS,SOLID_REAR,FRAME,TYRE,BRAKE]);
  await b.close();
  const CARNAME={suv:'SUV',trail:'4x4',coupe:'Coupe',wagon:'Wagon',pickup:'Pickup',muscle:'Muscle',hatch:'Hatch'};
  for(const c of cars){
    c.streetK=1-(1-STREET_SLICK)*((c.tyre==='slick'?.65:0)+(c.tyreR==='slick'?.35:0));
    c.label=CARNAME[c.car]+' '+c.name;c.stock=['stock','trail','coupe','wagon','pickup','muscle','hatch'].includes(c.id);
    c.z60=at(c.tar,26.82);c.z100=at(c.tar,44.7);c.q=quarter(c.tar);c.top=c.tar.vMax;c.dirt60=at(c.dirt,26.82);
    c.lap={};for(const k in COURSES)c.lap[k]=lap(c,COURSES[k]);
  }
  /* ratings: 100 is the fastest lap of that course by any build; every 1 percent slower is about 1 point.
     Classes cut the same rating scale in every kind of race */
  const best={};for(const k in COURSES)best[k]=Math.min(...cars.map(c=>c.lap[k].t));
  const cls=r=>r>=95?'S':r>=88?'A':r>=80?'B':r>=72?'C':'D';
  for(const c of cars){c.rating={};c.cls={};for(const k in COURSES){c.rating[k]=Math.round(1000*best[k]/c.lap[k].t)/10;c.cls[k]=cls(c.rating[k]);}}
  fs.mkdirSync(OUT,{recursive:true});
  const slim=cars.map(c=>({id:c.id,car:c.car,name:c.name,label:c.label,stock:c.stock,hp:Math.round(c.hp),mass:c.mass,drv:c.drv,
    latG:+c.latG.toFixed(2),dirtLat:+c.dirtLat.toFixed(2),brakeG:c.brake,aero:c.aero,travel:c.travel,clear:+c.clear.toFixed(3),
    z60:c.z60&&+c.z60.toFixed(2),quarter:c.q&&{t:+c.q.t.toFixed(2),mph:+(c.q.v*2.237).toFixed(1)},topMph:+(c.top*2.237).toFixed(0),dirt60:c.dirt60&&+c.dirt60.toFixed(2),
    lap:Object.fromEntries(Object.entries(c.lap).map(([k,v])=>[k,+v.t.toFixed(2)])),rating:c.rating,cls:c.cls}));
  fs.writeFileSync(path.join(OUT,'ratings.json'),JSON.stringify({courses:Object.fromEntries(Object.entries(COURSES).map(([k,v])=>[k,{name:v.name,kind:v.kind,length:Math.round(v.pieces.reduce((s,p)=>s+p[0],0))}])),cars:slim},null,1));
  /* the report */
  const mmss=t=>Math.floor(t/60)+':'+(t%60).toFixed(2).padStart(5,'0');
  let md='';
  for(const k in COURSES){const C=COURSES[k],len=Math.round(C.pieces.reduce((s,p)=>s+p[0],0));
    md+=`\n### ${C.kind}: ${C.name} (${(len/1000).toFixed(1)} km)\n\n| # | Build | Class | Rating | Lap | Avg mph |\n| --- | --- | --- | --- | --- | --- |\n`;
    [...cars].sort((a,b)=>a.lap[k].t-b.lap[k].t).forEach((c,n)=>{md+=`| ${n+1} | ${c.stock?'**'+c.label+'**':c.label} | ${c.cls[k]} | ${c.rating[k].toFixed(1)} | ${mmss(c.lap[k].t)} | ${(c.lap[k].vAvg*2.237).toFixed(0)} |\n`;});}
  md+=`\n### The figures behind them\n\n| Build | hp | kg | Drive | 0-60 | 1/4 mile | Top mph | Grip (g) | Dirt grip | Brakes (g) | Clearance | Travel |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n`;
  for(const c of cars)md+=`| ${c.label} | ${Math.round(c.hp)} | ${c.mass} | ${c.drv} | ${c.z60?c.z60.toFixed(1)+' s':'-'} | ${c.q?c.q.t.toFixed(1)+' s @ '+(c.q.v*2.237).toFixed(0):'-'} | ${(c.top*2.237).toFixed(0)} | ${c.latG.toFixed(2)} | ${c.dirtLat.toFixed(2)} | ${c.brake.toFixed(2)} | ${(c.clear*100).toFixed(0)} cm | ${(c.travel*100).toFixed(0)} cm |\n`;
  fs.writeFileSync(path.join(OUT,'rank-tables.md'),md);
  console.log(md);
})();
