/* =====================================================================================
   DRAG ENGINES (Redline County Drag, Oct 31 2026). The owner asked for "the glug glug type engines ... like the
   real powerful drag race engines". The glug is a big cam's lumpy idle: the intake and exhaust valves are open
   together for a long time (overlap), so at idle each cylinder fills a little differently, some cycles fire weak,
   and the engine hunts up and down. Five engines from real drag classes, all cross-plane V8s:
     bb572  a 572 big-block with a big cam: the street and bracket-racing glug
     ps500  Pro Stock: 500 cubic inches, no power adder, 10,500 rpm
     mm820  a mountain motor: 820 cubic inches, no power adder
     pm526  Pro Mod: a 526 hemi-head V8 under a screw blower, on methanol
     tf500  Top Fuel: a 500 hemi-head V8 under a 14-71 Roots blower, on nitromethane
   Nothing in the synth changes: each is the Digital Engine's own spec (makeSpec), with the lab's Wild cam and an
   extra idle lope (the spec's lope, which the lab's sim and the synth already read; 40_physics now reads it too).
   Their cams are part of them, so the Cam slot shows only theirs and engineSpec leaves it alone (16_engines).
   The blown two bring their own blower (the power slot shows only it), wear a bug-catcher hat and poke through
   the hood. Zoomie headers (the lab's Open headers) are offered with these engines only.
   Power with ram air, zoomies and a race tune (crank, SIM.makeSpec's peak): 572 ~800 hp, Pro Stock ~1,450,
   mountain motor ~1,950, Pro Mod ~3,800, Top Fuel ~11,000. Without them: about 80% of that.
   ===================================================================================== */
const DRAG_ENGINES=['bb572','ps500','mm820','pm526','tf500'];
Object.assign(DE_ENGINES,{
  bb572:{layout:'V8',disp:9.4,redline:6300,idle:950,tq:780,cP:.68,cW:.5,cA:.62,Ie:.32,cam:3,lope:.03,crackle:.5,limiter:'hard',drag:1},
  ps500:{layout:'V8',disp:8.2,redline:10200,idle:1600,tq:850,cP:.82,cW:.36,cA:.5,Ie:.2,cam:3,lope:.035,crackle:.55,limiter:'hard',drag:1},
  mm820:{layout:'V8',disp:13.4,redline:9000,idle:1300,tq:1290,cP:.82,cW:.4,cA:.52,Ie:.34,cam:3,lope:.05,crackle:.6,limiter:'hard',drag:1},
  pm526:{layout:'V8',disp:8.6,redline:7700,idle:1400,tq:1170,cP:.8,cW:.5,cA:.62,Ie:.3,cam:3,lope:.05,fi:'screw',boost:2.4,crackle:.8,limiter:'hard',drag:1},
  tf500:{layout:'V8',disp:8.2,redline:8100,idle:1700,tq:2450,cP:.82,cW:.5,cA:.64,Ie:.35,cam:3,lope:.06,fi:'roots',boost:3.6,crackle:1,limiter:'hard',drag:1}
});
Object.assign(ENGINES,{
  bb572:{name:'9.4 big-block, big cam (572)',drag:1,kg:305,price:9500,
    note:'A 572-cubic-inch big-block with a wild cam: the classic choppy idle, glug glug. About 800 hp with headers, ram air and a race tune.'},
  ps500:{name:'8.2 Pro Stock (500)',drag:1,kg:240,price:32000,
    note:'Pro Stock: 500 cubic inches, no blower, no turbos, 10,500 rpm. A lumpy idle and a shriek at the top. About 1,450 hp dressed.'},
  mm820:{name:'13.4 mountain motor (820)',drag:1,kg:290,price:42000,
    note:'820 cubic inches with nothing bolted on to force the air in. The deepest lope in the county and about 1,950 hp dressed.'},
  pm526:{name:'8.6 Pro Mod, screw blower (526)',drag:1,kg:300,price:55000,powers:['own'],
    note:'Pro Mod: a 526 hemi-head V8 under a screw blower, on methanol. A hard lope, the blower\'s scream and about 3,800 hp dressed.'},
  tf500:{name:'8.2 Top Fuel nitro (500)',drag:1,kg:275,price:85000,powers:['own'],
    note:'Top Fuel: a 500 hemi-head V8 under a 14-71 Roots blower, on nitromethane. It idles like it\'s angry and makes about 11,000 hp dressed, far more than any tyre can hold.'}
});
POWER.own={name:'Its own blower',note:'The blower this engine was built round, with its bug-catcher hat through the hood.',kg:0,price:0};
/* which cars take them: the V8 cars with room in the nose (the 4x4 only fits the 572) */
for(const c of ['suv','pickup','muscle'])CAR_PARTS[c].engines.push(...DRAG_ENGINES);
CAR_PARTS.trail.engines.push('bb572');
const isDrag=k=>!!(ENGINES[k]&&ENGINES[k].drag);
/* the bay: billet and polished aluminium for the race engines, the 572 in orange */
Object.assign(BAYLOOK,{bb572:{block:'#c4561c',cover:'#c9ccd1',polish:1},ps500:{block:'#8d9096',cover:'#2b2c2f'},mm820:{block:'#8d9096',cover:'#c9ccd1',polish:1},
  pm526:{block:'#5d6066',cover:'#1b1c1e'},tf500:{block:'#9a9da3',cover:'#c9ccd1',polish:1}});
const ZOOMIES=['zoomies','Zoomie headers','Short open pipes swept up and back: nothing between the engine and your ears. Loudest there is.',1800];
/* ---------- the slots: the drag engines' own cam, their own blower, zoomies ---------- */
{const so=slotOptions;slotOptions=function(car,slot,rig){
  const d=rig&&isDrag(rig.engine);
  if(d&&slot==='cam'){const c=DE_ENGINES[rig.engine].cam;return [[c,'Its own cam','A drag engine comes with its cam: the lope is part of it. The Tune sheet\'s Idle lope sets how hard it glugs.',0]];}
  const o=so(car,slot,rig);
  if(slot==='exhaust'&&d&&!CAR_PARTS[car].ev)o.push(ZOOMIES.slice());
  return o;};}
{const f0=fits;fits=function(car,rig,slot,val){
  const why=f0(car,rig,slot,val);if(why)return why;
  if(slot==='exhaust'&&val==='zoomies'&&!isDrag(rig.engine))return 'Drag engines only';
  return '';};}
{const fr=fixRig;fixRig=function(car,rig){
  rig=fr(car,rig);
  if(isDrag(rig.engine))rig.cam=DE_ENGINES[rig.engine].cam;
  else if(rig.exhaust==='zoomies')rig.exhaust='side';
  return rig;};}
/* ---------- a rig's build: the hat and the blower through the hood ---------- */
{const rb=rigBuild;rigBuild=function(car,rig){
  const key=rigKey(car,Object.assign({glow:'none',transfer:'none'},rig)),fresh=!RIG_BUILD.has(key),i=rb(car,rig);
  if(!fresh||!isDrag(rig.engine))return i;
  const b=BUILDS[i],r=ENGINE_OF[b.id],E=DE_ENGINES[rig.engine];
  if(rig.power==='own')r.power='none';
  const blown=r.power==='roots'||E.fi==='roots'||E.fi==='screw';
  if(blown){r.hat='bug';b.look.engineOut=1;}
  return i;};}
