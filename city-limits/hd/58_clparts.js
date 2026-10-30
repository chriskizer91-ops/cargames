/* =====================================================================================
   CITY LIMITS' GARAGE — Dirt Sleeper HD's parts (56_parts) and ratings (57_ratings) for City Limits' cars:
   - only the cars City Limits has (the SUV without its race build, the coupe, the hatch) plus the three new
     ones: the electric sedan (motors, software, reduction gears), the wedge (its V12 and a stroker) and the
     hypercar (its V10 and a bigger one), each with tyres, rides, kits and presets;
   - more paints for the night, and an underglow slot (a coloured tube under the sills and its light);
   - the ratings' courses named after City Limits' places, and the electric drive in the rating simulator.
   ===================================================================================== */
for(const k of Object.keys(PRESET_PARTS))if(!BUILDS.some(b=>b.id===k))delete PRESET_PARTS[k];
delete CAR_PARTS.suv.kits.race;for(const c of ['trail','wagon','pickup','muscle'])delete CAR_PARTS[c];
PAINTS.push(['Candy Red','#a8161c'],['Midnight Purple','#24103a'],['Electric Blue','#1446c8'],['Acid Lime','#7cd11c'],['Pearl White','#e8e6e0'],['Sunset Orange','#e05a14'],
  ['Gloss Black','#0e0f11'],['Liquid Silver','#a9adb3'],['Hot Pink','#d81b78'],['Deep Teal','#0f7f86']);
/* ---------- the underglow ---------- */
SLOTS.push(['glow','body','Underglow']);
const GLOWS=[['none','None',null],['cyan','Cyan',[.1,.85,1]],['magenta','Magenta',[1,.15,.7]],['green','Green',[.2,1,.35]],['amber','Amber',[1,.6,.1]],['violet','Violet',[.6,.3,1]],['white','Ice white',[.9,.92,1]]];
/* ---------- the new cars' engines and motors ---------- */
Object.assign(ENGINES,{
  v12w:{name:'5.2 V12',note:'The wedge\'s factory quad-cam V12: smooth low down, a howl past 6,000.',kg:260,price:0},
  v12w57:{name:'5.7 V12 stroker',note:'A longer stroke for the V12: torque everywhere and the same howl.',kg:265,price:14000,base:'v12w',disp:5.7},
  v10h:{name:'5.2 V10',note:'The hypercar\'s V10, revving to 8,700.',kg:225,price:0},
  v10h56:{name:'5.6 V10',note:'Bored out with a race cam in mind: 9,000 rpm and the bark to go with it.',kg:225,price:16000,base:'v10h',disp:5.6},
  evDual:{name:'Two motors, 750 hp',note:'One motor on each axle: everything it has from a standstill.',kg:380,price:0,ev:{kw:560,nm:900,maxRpm:18000,regen:.35}},
  evPerf:{name:'Performance inverters, 900 hp',note:'Bigger inverters on the same two motors: more power at speed.',kg:385,price:12000,ev:{kw:670,nm:980,maxRpm:18000,regen:.4}},
  evTri:{name:'Three motors, 1,100 hp',note:'A second motor on the rear axle and the cooling to use it.',kg:430,price:26000,ev:{kw:820,nm:1050,maxRpm:18000,regen:.5}}
});
TRANS.ev1={name:'Single-speed reduction',note:'One gear from a standstill to the top: no shifts, ever.',price:0};
/* ---------- the new cars' parts ---------- */
Object.assign(CAR_PARTS,{
  ev:{chassisKg:1870,drv:'AWD',ev:true,engines:['evDual','evPerf','evTri'],trans:['ev1'],axles:[8.4,9.0,9.6],transfer:[],diffs:['factory','lsd'],
    tires:[T_P('perf','265/35R21 performance',.36,.265,21,'perf','perf',[.11,.13,.8,.6,1.1,1.12]),T_P('slick','310/680R18 slick',.345,.31,18,'slick','slick',[.1,.12,.75,.5,1,1.12],-10,.95,-1,.02),
      T_P('at','255/55R19 all-terrain',.37,.255,19,'at','at',[.13,.16,.84,.72,1.05,1.08],10,1.03),T_P('drag','275/40R20 drag radial',.355,.275,20,'perf','drag',[.13,.15,.82,.7,1,1.12])],
    rides:[R_P('race','Slammed, race dampers',-.04,'evRace'),R_P('stock','Factory air springs',0,'ev'),R_P('raised','Air springs up (off-road mode)',.045,'trail',0)],
    shocks:['sport','race','rally'],brakes:['big','race'],weight:[['stock','Factory',0,0],['race','Race strip-out',-300,6000]],
    kits:{ev:{kg:0},evRace:{kg:0}}},
  wedge:{chassisKg:1240,drv:'RWD',engines:['v12w','v12w57'],trans:['man5','seq6'],axles:[3.2,3.55,3.9,4.1],transfer:[],diffs:['factory','lsd'],
    tires:[T_P('perf','245/50R16 performance',.326,.245,16,'perf','perf',[.11,.13,.8,.6,1,1.08]),T_P('perf18','285/35R18 performance',.33,.3,18,'perf','perf',[.11,.13,.8,.6,1,1.14],6),
      T_P('slick','300/650R18 slick',.33,.3,18,'slick','slick',[.1,.12,.75,.5,.9,1.14],-6,.9,-1,.02),T_P('drag','275/40R17 drag radial',.33,.275,17,'perf','drag',[.13,.15,.82,.7,1,1.1]),
      T_P('gravel','225/50R16 gravel rally',.33,.225,16,'at','gravel',[.13,.16,.88,.85,.9,1.08],-4,.9)],
    rides:[R_P('low','Slammed 2 in',-.04,'wedgeNR'),R_P('stock','Factory',0,'wedge'),R_P('gravel','Raised for gravel',.04,'rally',5)],
    shocks:['sport','race','rally'],brakes:['stock','big','race'],weight:[['stock','Factory',0,0],['race','Race strip-out',-120,4000]],
    kits:{wedge:{kg:0},wedgeNR:{kg:30}}},
  hyper:{chassisKg:1225,drv:'AWD',engines:['v10h','v10h56'],trans:['seq6'],axles:[3.4,3.7,4.0],transfer:[],diffs:['factory','lsd'],
    tires:[T_P('perf','305/30R20 performance',.345,.3,20,'perf','perf',[.11,.13,.8,.6,1,1.15]),T_P('slick','330/680R20 slick',.345,.33,20,'slick','slick',[.1,.12,.75,.5,.95,1.15],-6,.95,-1,.02),
      T_P('gravel','245/45R19 gravel rally',.34,.245,19,'at','gravel',[.13,.16,.88,.85,.9,1.1],-4,.9)],
    rides:[R_P('track','Track height',-.03,'hyperTrack'),R_P('stock','Factory, adaptive',0,'hyper'),R_P('lift','Nose lift up',.03,'hyper',4)],
    shocks:['sport','race','rally'],brakes:['race'],weight:[['stock','Factory',0,0],['race','Track strip-out',-120,6000]],
    kits:{hyper:{kg:0},hyperTrack:{kg:20}}}
});
Object.assign(PRESET_PARTS,{
  ev:{kit:'ev',engine:'evDual',power:'none',intake:0,exhaust:'stock',cam:0,tune:0,nos:0,trans:'ev1',axle:9.0,lockers:'factory',tires:'perf',ride:'stock',shocks:'sport',brakes:'big',weight:'stock',wheels:'kit',paint:-1},
  evRace:{kit:'evRace',engine:'evTri',power:'none',intake:0,exhaust:'stock',cam:0,tune:0,nos:0,trans:'ev1',axle:8.4,lockers:'lsd',tires:'slick',ride:'race',shocks:'race',brakes:'race',weight:'race',wheels:'kit',paint:-1},
  wedge:{kit:'wedge',engine:'v12w',power:'none',intake:0,exhaust:'stock',cam:0,tune:0,nos:0,trans:'man5',axle:3.9,lockers:'factory',tires:'perf',ride:'stock',shocks:'sport',brakes:'stock',weight:'stock',wheels:'kit',paint:-1},
  wedgeNR:{kit:'wedgeNR',engine:'v12w57',power:'twin',intake:2,exhaust:'straight',cam:2,tune:2,nos:2,trans:'seq6',axle:3.2,lockers:'lsd',tires:'perf18',ride:'low',shocks:'race',brakes:'race',weight:'race',wheels:'kit',paint:-1,glow:'cyan'},
  hyper:{kit:'hyper',engine:'v10h',power:'none',intake:1,exhaust:'stock',cam:1,tune:0,nos:0,trans:'seq6',axle:3.7,lockers:'factory',tires:'perf',ride:'stock',shocks:'sport',brakes:'race',weight:'stock',wheels:'kit',paint:-1},
  hyperTrack:{kit:'hyperTrack',engine:'v10h56',power:'none',intake:2,exhaust:'straight',cam:3,tune:2,nos:0,trans:'seq6',axle:3.7,lockers:'lsd',tires:'slick',ride:'track',shocks:'race',brakes:'race',weight:'race',wheels:'kit',paint:-1}
});
for(const p of Object.values(PRESET_PARTS)){if(!p.glow)p.glow='none';if(!p.transfer)p.transfer='none';}
/* ---------- what each slot offers (the electric car has nothing to bolt to an engine) ---------- */
{const so=slotOptions;slotOptions=function(car,slot,rig){
  if(slot==='glow')return GLOWS.map(([k,n])=>[k,n,k==='none'?'Nothing under the car.':'A tube under the sills and the light it throws on the road.',k==='none'?0:1500]);
  if(slot==='transfer'&&!CAR_PARTS[car].transfer.length)return [['none','No low range','',0]];
  if(CAR_PARTS[car].ev){
    if(slot==='power')return [['none','None','No engine to boost.',0]];
    if(slot==='intake')return [[0,'Battery cooling','Factory cooling.',0]];
    if(slot==='exhaust')return [['stock','No exhaust','Electric: nothing to hear but the motors and the tyres.',0]];
    if(slot==='cam')return [[0,'None','',0]];
    if(slot==='nos')return [[0,'None','',0]];
    if(slot==='tune')return [[0,'Factory software','',0],[1,'Sport software','More power at speed (+6%).',1500],[2,'Track mode','Everything the inverters will give (+12%).',4000]];
    if(slot==='axle')return CAR_PARTS[car].axles.map(a=>[a,a.toFixed(1)+' reduction',a<8.8?'Taller: more top speed, a little slower off the line.':a>9.3?'Shorter: savage off the line, less top speed.':'As it left the factory.',800]);
  }
  return so(car,slot,rig);};}
/* ---------- a rig's build: carry the new cars' extras through ---------- */
{const rb=rigBuild;rigBuild=function(car,rig){
  rig=Object.assign({glow:'none',transfer:'none'},rig);const key=rigKey(car,rig),fresh=!RIG_BUILD.has(key),i=rb(car,rig);if(!fresh)return i;
  const b=BUILDS[i],K=BUILDS.find(q=>q.id===rig.kit),E=ENGINES[rig.engine],G=GLOWS.find(g=>g[0]===rig.glow);
  b.metal=K.metal;b.glow=K.glow;b.underglow=K.underglow;
  if(G&&G[2]){b.glow=G[2];b.underglow=1;b.look.extras=[...new Set([...(b.look.extras||[]),'underglow'])];}
  else if(G&&!G[2]){b.underglow=0;b.look.extras=(b.look.extras||[]).filter(x=>x!=='underglow');}
  if(E.ev){const k=[1,1.06,1.12][rig.tune|0];Object.assign(ENGINE_OF[b.id],{engine:'evm',power:'none',intake:0,exhaust:'stock',cam:0,tune:0,nos:0,trans:'ev1',
    ev:{kw:E.ev.kw*k,nm:E.ev.nm*(k>1?1+(k-1)*.5:1),maxRpm:E.ev.maxRpm,regen:E.ev.regen}});}
  return i;};}
/* ---------- the ratings: City Limits' places, and the electric drive ---------- */
TERRAINS.length=0;TERRAINS.push(['dirt','Dirt road','The Rim Trail and Wash Road: fast dirt, ruts and the odd kicker.'],
  ['gravel','Gravel road','Ridge Road: long and quick on loose stone, washboard and hairpins.'],
  ['mountain','Mountainside','The hills off the road: steep loose climbs and off-camber turns.'],
  ['rocks','Rock crawl','The boulder field: ledges, slabs and tilted rock.'],
  ['mud','Mud','The bog south of town.'],
  ['asphalt','Asphalt','Town and the Salt Road: grip, brakes and power.']);
{const gf=gearForce;gearForce=function(S,v,g,lo){const e=S.e;if(!e.ev)return gf(S,v,g,lo);
  const R=S.R,ratio=e.gears[g]*e.fd,w=Math.max(v,.3)/R*ratio,m=e.evm,T=Math.min(m.nm,m.kw*1000/w)*(w<m.maxRpm*TAU/60?1:0);
  S._me=S.mass+e.Ie*ratio*ratio/(R*R)+4*S.Iw/(R*R);return T*ratio*.95/R;};}
/* what a slot's current choice is called */
function slotLabel(car,slot,rig){const o=slotOptions(car,slot,rig).find(q=>q[0]===rig[slot]||String(q[0])===String(rig[slot]));return o?o[1]:'';}
/* everything a rig has that the preset it came from didn't: what it would cost to buy, part by part */
function rigCost(car,rig,owned){let c=0;for(const [s] of SLOTS){const o=slotOptions(car,s,rig).find(q=>String(q[0])===String(rig[s]));if(o&&!(owned&&owned(car,s,rig[s])))c+=o[3]||0;}return c;}
/* ---------- the meshes of rigs: only the engine (and what sits on it), the tyres, ride height, body kit, wheels,
   brakes and whether there's an underglow change what is drawn; rigs alike in those share one set of meshes; and only the last few rigs tried in the garage are kept ---------- */
{const tk=truck,GEO=new Map(),KEEP=[];
  truck=function(i){const b=BUILDS[i];if(TRUCK[b.id])return TRUCK[b.id];
    if(!b.rig)return tk(i);
    const gk=b.car+'|'+['engine','power','tires','ride','kit','wheels','brakes'].map(s=>b.rig[s]).join('|')+'|'+(b.rig.glow&&b.rig.glow!=='none'?1:0),j=GEO.get(gk);
    const T=j!==undefined&&TRUCK[BUILDS[j].id]?TRUCK[BUILDS[j].id]:tk(i);TRUCK[b.id]=T;if(j===undefined||!TRUCK[BUILDS[j].id]||j===i)GEO.set(gk,i);
    KEEP.push(b.id);while(KEEP.length>10){const old=KEEP.shift();if(!KEEP.includes(old))delete TRUCK[old];}
    return T;};}
