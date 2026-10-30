/* =====================================================================================
   THE GARAGE'S PARTS. A rig is one of the seven cars with a choice in every slot: the engine and what
   is bolted to it, the gearbox and axles, the tyres, the suspension, the body kit, the wheels and the
   paint. Each car has its own list of what plausibly fits it (no big-block in the rally hatch, no
   37-inch tyres without the lift to clear them). The factory builds are rigs too, so every car starts
   from a preset and can be changed a part at a time.
   A rig becomes a build like the ones in 32_builds: a look (the kit's look with the tyres, wheels and
   ride height swapped in), running gear for 42_chassis and an engine recipe for 16_engines, all under
   one id made from the parts, so the meshes, the chassis and the engine are built once per rig.
   ===================================================================================== */
/* one more engine for the SUV's swaps: the 5.4 three-valve V8 from the same family as the 4.6 */
DE_ENGINES.v54={layout:'V8',disp:5.4,redline:5800,idle:650,tq:495,cP:.58,cW:.55,cA:.62,Ie:.22,crackle:.12,limiter:'soft'};
/* the slots, in the garage's order: id, group, name */
const SLOTS=[
  ['engine','engine','Engine'],['power','engine','Power adder'],['intake','engine','Intake'],['exhaust','engine','Exhaust'],['cam','engine','Cam'],['tune','engine','Tune'],['nos','engine','Nitrous'],
  ['trans','drive','Gearbox'],['axle','drive','Axle gears'],['transfer','drive','Transfer case'],['lockers','drive','Diffs'],
  ['tires','chassis','Tires'],['ride','chassis','Suspension'],['shocks','chassis','Shocks'],['brakes','chassis','Brakes'],['weight','chassis','Weight'],
  ['kit','body','Body'],['wheels','body','Wheels'],['paint','body','Paint']];
const SLOT_GROUPS=[['engine','Engine'],['drive','Drivetrain'],['chassis','Chassis'],['body','Body']];
const slotName=s=>SLOTS.find(q=>q[0]===s)[2];

/* ---------- parts every car draws from ---------- */
/* engines: DE_ENGINES id, the weight of the engine with its factory induction (kg) */
const ENGINES={
  v46:{name:'4.6 V8',note:'The factory three-valve 4.6: 290 hp, 300 lb-ft at about 4,000 rpm.',kg:210,price:0},
  v54:{name:'5.4 V8',note:'The bigger three-valve from the same family: more torque everywhere, same smooth sound.',kg:230,price:3200},
  v57:{name:'5.7 V8',note:'A pushrod truck V8: torque low down, happy to lug.',kg:225,price:3800},
  v62:{name:'6.2 V8',note:'An aluminium pushrod V8 that revs: light for its size and a lot of power.',kg:210,price:6500},
  bb72:{name:'7.0 big-block',note:'An iron big-block with a mild cam: torque like a tide.',kg:320,price:5500},
  bb74:{name:'7.4 big-block',note:'The biggest block that fits: huge torque, heavy in the nose.',kg:330,price:7800},
  tt35:{name:'3.5 twin-turbo V6',note:'Two small turbos on a light V6: big boost, quick to spool.',kg:200,price:6800},
  tt38:{name:'3.8 twin-turbo V6, built',note:'The Sleeper\'s: the V6 bored to 3.8 with forged internals and bigger turbos: well over twice the 3.5\'s power.',kg:210,price:18500},
  bb104:{name:'10.4 big-block (632)',note:'The Rock & Mud\'s: a 632-cubic-inch race block. Made for a blower.',kg:360,price:21000},
  i40:{name:'4.0 inline-six',note:'The 4x4\'s lazy factory six: torque from idle, nothing at the top.',kg:230,price:0},
  fp52:{name:'5.2 flat-plane V8',note:'The coupe\'s factory flat-plane, past 8,000 rpm.',kg:200,price:0},
  fp55:{name:'5.5 flat-plane V8',note:'The flat-plane bored out: more of everything, still screams.',kg:200,price:9500,base:'fp52',disp:5.5},
  i525:{name:'2.5 turbo five',note:'The wagon\'s factory five, turbocharged from the start.',kg:170,price:0},
  i18t:{name:'1.8 turbo four',note:'The hatch\'s homologation four, mounted across the nose.',kg:140,price:0},
  /* the machines' engines (34_machines) */
  q90:{name:'90 cc four-stroke',note:'A little air-cooled single. Starts every time.',kg:14,price:0},
  q450:{name:'450 four-stroke single',note:'The stock thumper: strong low down, revs to 10,500.',kg:28,price:0},
  q480:{name:'480 big-bore kit',note:'Bored out: more torque everywhere, same thump.',kg:28,price:1400,base:'q450',disp:.48},
  q250t:{name:'250 two-stroke',note:'Lighter, snappier and loud: nothing, nothing, then everything.',kg:22,price:2400},
  q700:{name:'700 single',note:'A big, slow-revving utility single.',kg:45,price:0},
  q850:{name:'850 V-twin',note:'The biggest utility engine: torque for days.',kg:55,price:3200},
  sxs1000:{name:'1000 parallel twin',note:'The side-by-side\'s twin, revving to 8,500.',kg:70,price:0},
  golf400:{name:'400 cc single',note:'Built to go round a golf course all day.',kg:30,price:0},
  kart212:{name:'212 cc single',note:'A yard-sale engine on a centrifugal clutch.',kg:17,price:0},
  popper:{name:'5.5 L two-cylinder',note:'Two huge horizontal cylinders: pop, pop, pop.',kg:600,price:0},
  semi15:{name:'15 L inline-six diesel',note:'About 2,000 lb-ft at 1,200 rpm.',kg:1350,price:0}
};
const POWER={
  none:{name:'None',note:'Breathes on its own.',kg:0,price:0},
  stock:{name:'Factory turbo',note:'The turbo it came with.',kg:0,price:0},
  stockTwin:{name:'Factory twin turbos',note:'The two turbos it came with.',kg:0,price:0},
  turbo:{name:'Single turbo',note:'Boost that builds with revs. A little lag, then a shove.',kg:25,price:4500},
  twin:{name:'Twin turbos',note:'Two turbos: quicker to spool than one big one, more boost up top.',kg:40,price:7500},
  roots:{name:'Roots blower',note:'Boost from idle and that whine. The best for crawling and mud: instant torque.',kg:35,price:6000},
  bigturbo:{name:'Bigger turbo',note:'A bigger turbo on the factory manifold: more lag, much more top end.',kg:10,price:3500},
  antilag:{name:'Bigger turbo + anti-lag',note:'Keeps the turbo lit off the throttle: bangs, flames and no lag out of corners.',kg:10,price:5500}
};
const INTAKES=[{name:'Factory airbox',note:'Quiet and filtered.',price:0},{name:'Cold-air intake',note:'A few more horses and a deeper induction note.',price:350},{name:'Ram air',note:'Scoops air at speed. More power the faster you go.',price:900}];
const EXHAUSTS={stock:{name:'Factory muffler',note:'Quiet.',price:0},catback:{name:'Cat-back',note:'A bit louder, a bit more power.',price:700},headers:{name:'Long-tube headers',note:'The big gain: more power everywhere and a rasp.',price:1600},
  straight:{name:'Straight-through',note:'Loud. Pops and bangs on the overrun.',price:1200},side:{name:'Side exits',note:'Out the sides, in front of the rear wheels. Very loud.',price:1500}};
const CAM_PARTS=[{name:'Factory cam',note:'Smooth idle, torque low down.',price:0},{name:'Street cam',note:'A little lope, more pull up top.',price:600},{name:'Race cam',note:'A lumpy idle and a top end that keeps going.',price:1100},{name:'Wild cam',note:'Barely idles. All power, high up.',price:1500}];
const TUNES=[{name:'Factory tune',note:'As it left the factory.',price:0},{name:'Street tune',note:'More timing, a higher rev limit.',price:500},{name:'Race tune',note:'Everything it has, a hard limiter that bangs.',price:1200}];
const NITROUS=[{name:'None',price:0,kg:0},{name:'35-shot',note:'A gentle push. Good for getting through mud.',price:600,kg:10},{name:'75-shot',price:900,kg:10},{name:'125-shot',price:1200,kg:12},{name:'250-shot',note:'Huge, for about eight seconds.',price:1800,kg:14}];
const TRANS={
  cvt:{name:'Belt automatic',note:'A CVT: no shifts, the revs just climb.',price:0},cvtHL:{name:'Belt automatic, high and low',note:'A CVT with a low range for pulling.',price:0},
  quad5:{name:'Five-speed',note:'A thumb clutch and a foot shifter.',price:0},kart1:{name:'Centrifugal clutch',note:'One gear. The clutch grabs when the revs come up.',price:0},
  trac6:{name:'Six-speed',note:'Six gears from a walk to about 12 mph.',price:0},truck10:{name:'Ten-speed',note:'Ten gears and a long reach between them.',price:0},
  auto4:{name:'Four-speed automatic',note:'The factory four-speed. Tall gaps, tough as a rock.',price:0},
  auto5:{name:'Five-speed automatic',note:'The factory five-speed.',price:0},
  auto6:{name:'Six-speed automatic',note:'Shifts early when you go easy, holds a gear when you floor it.',price:0},
  race4:{name:'Race four-speed',note:'A built automatic with a trans-brake: hold brake and gas to launch off the two-step.',price:3800},
  seq6:{name:'Six-speed sequential',note:'Straight-cut gears that whine, shifts in a blink.',price:7500},
  man4:{name:'Four-speed manual',note:'The factory four-speed stick.',price:0},
  man5:{name:'Five-speed manual',note:'The factory five-speed stick.',price:0},
  man6:{name:'Six-speed manual',note:'The factory six-speed stick.',price:0},
  rally5:{name:'Five-speed dog box',note:'A rally gearbox: close ratios, instant shifts.',price:6500}
};
const TRANSFER={
  none:{name:'No low range',note:'All-wheel drive, one speed.',price:0},
  low:{name:'Two-speed transfer case',note:'Low range (2.64 to 1) for crawling, steep climbs and pulling through mud. L switches it.',price:900,low:2.64},
  crawl:{name:'Crawl box',note:'A 4 to 1 low range: walks up ledges at a crawl. L switches it.',price:2400,low:4}
};
const DIFFS={
  factory:{name:'Factory diffs',note:'Open diffs, with traction control where the car has it.',price:0},
  lsd:{name:'Limited-slip diffs',note:'Clutch-type diffs that push both wheels: better out of corners and in slides.',price:1400},
  rear:{name:'Rear locker',note:'Locks the rear axle on demand (K). Both rear wheels pull, but it pushes wide in turns.',price:1200,lockers:1},
  both:{name:'Front and rear lockers',note:'Locks both axles on demand (K): every wheel pulls. For rocks and mud.',price:2400,lockers:2},
  spool:{name:'Spool',note:'A rear axle welded solid: both wheels always turn together. Drag cars only.',price:600}
};
const SHOCKS_P={stock:{name:'Factory shocks',price:0},sport:{name:'Sport shocks',note:'Firmer: less body roll, harsher over bumps.',price:800},
  rally:{name:'Rally dampers',note:'Made for jumps and fast rough roads.',price:2600},bypass:{name:'Bypass shocks',note:'Desert shocks: soak up whoops and big landings at speed.',price:3200},
  race:{name:'Race dampers',note:'Stiff and precise on smooth tarmac.',price:2800},drag:{name:'Drag shocks',note:'Let the nose rise and the rear squat for traction on launch.',price:1200}};
const BRAKES_P={stock:{name:'Factory brakes',price:0},big:{name:'Big brake kit',note:'Bigger discs and calipers: stops harder and keeps stopping.',price:2200},
  race:{name:'Race brakes',note:'Carbon pads and huge discs.',price:4200},drag:{name:'Drag brakes',note:'Light discs made to stop once.',price:900}};
const WHEELS=[
  ['kit','As the body kit comes'],['six','Six-spoke, silver','#b8bcc2'],['ten','Ten-spoke, dark red','#7a1418'],['five','Five-spoke, gunmetal','#3c3f42'],['split','Split five-spoke, silver','#c9ccd1'],
  ['mag','Chrome mags','#c9ccd1'],['flat','Flat-face, white','#ece9e2'],['steel','Black steelies','#141416'],['bead','Beadlocks, black','#1d1d1f'],['beadB','Beadlocks, bronze','#9a6a32'],['race','Centre-locks, gold','#d6a63a']];

/* ---------- each car's own parts ----------
   tyres: [id, name, R, W, rim, look, tread, [peak slip, peak angle, sliding grip, falloff, inertia, mu], kg, wheel mass, minLift, maxLift]
   rides: [id, name, lift, SUSP id, kg, track added, solid axles]
   kits:  build ids; each kit's look, drag and downforce come from the build */
const T_P=(id,name,R,W,rim,vis,tread,curve,kg=0,wm=1,minLift=-1,maxLift=1)=>({id,name,R,W,rim,vis,tread,curve,kg,wm,minLift,maxLift});
const R_P=(id,name,lift,susp,kg=0,trackAdd=0,solid=false)=>({id,name,lift,susp,kg,trackAdd,solid});
const TY_HWY=[.12,.15,.82,.65,1,1.08],TY_PERF=[.11,.13,.8,.6,1.05,1.08],TY_AT=[.13,.16,.84,.72,1,1.08],TY_MT=[.15,.18,.85,.8,1.1,1.08],TY_SLICK=[.1,.12,.75,.5,.9,1.08],
  TY_DRAG=[.13,.15,.82,.7,1,1.08],TY_GRAVEL=[.13,.16,.88,.85,.9,1.1];
const CAR_PARTS={
  suv:{chassisKg:1970,drv:'AWD',
    engines:['v46','v54','v62','bb74','bb104','tt35','tt38'],trans:['auto6','race4','seq6'],axles:[3.55,3.73,4.10,4.56,4.88,5.38],transfer:['none','low','crawl'],diffs:['factory','rear','both'],
    tires:[T_P('hwy','245/65R17 all-season',.378,.245,17,'hwy','allseason',TY_HWY),T_P('at','265/70R17 all-terrain',.392,.265,17,'at','at',TY_AT,12,1.03),
      T_P('perf','285/45R20 performance',.372,.285,20,'perf','perf',TY_PERF,15,1.05),T_P('drag','275/50R18 drag radial',.36,.275,18,'perf','drag',TY_DRAG,10,1,-1,.05),
      T_P('at33','33x12.5R17 all-terrain',.42,.318,17,'at','at',[.13,.16,.84,.72,1.05,1.08],35,1.08,.05),T_P('mt35','35x12.5R17 mud-terrain',.445,.318,17,'mt','mud',[.15,.18,.85,.8,1.08,1.08],48,1.12,.1),
      T_P('mt37','37x12.5R17 mud-terrain',.47,.318,17,'mt','mud',TY_MT,60,1.15,.15),T_P('slick','310/680R18 slick',.345,.31,18,'slick','slick',TY_SLICK,-10,.95,-1,.05)],
    rides:[R_P('low4','Slammed 4 in',-.1,'lowered'),R_P('low2','Lowered 2 in',-.05,'lowered'),R_P('stock','Factory',0,'stock'),R_P('lift2','2 in leveling kit',.05,'trail',8,.02),
      R_P('lift4','4 in lift',.1,'trail',15,.05),R_P('lift6','6 in lift, solid axles',.15,'lift6',25,.1,true)],
    shocks:['stock','sport','rally','bypass','race'],brakes:['stock','big','race'],weight:[['stock','Factory',0,0],['light','Rear seats and spare out',-90,300],['race','Race strip-out',-420,4500]],
    kits:{stock:{kg:0},sleeper:{kg:0},crawler:{kg:70},race:{kg:30}}},
  trail:{chassisKg:1390,drv:'AWD',
    engines:['i40','v57','v62'],trans:['auto4','race4'],axles:[3.73,4.10,4.56,4.88,5.38],transfer:['low','crawl'],diffs:['factory','rear','both'],
    tires:[T_P('at','265/75R17 all-terrain',.415,.265,17,'at','at',TY_AT),T_P('hwy','245/75R17 highway',.4,.245,17,'hwy','allseason',TY_HWY,-6,.97),
      T_P('mt35','35x12.5R17 mud-terrain',.445,.318,17,'mt','mud',[.15,.18,.85,.8,1.08,1.08],36,1.1,.06),T_P('mt37','37x12.5R17 mud-terrain',.47,.318,17,'mt','mud',TY_MT,60,1.15,.11)],
    rides:[R_P('stock','Factory',0,'trail'),R_P('lift25','2.5 in lift',.06,'trail',10,.03,true),R_P('lt','4.5 in long-travel',.11,'longtravel',25,.17,true)],
    shocks:['stock','sport','rally','bypass'],brakes:['stock','big'],weight:[['stock','Factory',0,0],['light','Doors and rear seat off',-70,0]],
    kits:{trail:{kg:0},trailRig:{kg:190}}},
  coupe:{chassisKg:1360,drv:'RWD',
    engines:['fp52','fp55'],trans:['man6','seq6'],axles:[3.42,3.73,3.91,4.10],transfer:[],diffs:['factory','lsd'],
    tires:[T_P('perf','275/35R20 performance',.35,.275,20,'perf','perf',[.11,.13,.8,.6,1,1.12]),T_P('slick','310/680R18 slick',.345,.31,18,'slick','slick',[.1,.12,.75,.5,.9,1.12],-8,.9,-1,.02),
      T_P('gravel','225/45R17 gravel rally',.33,.225,17,'at','gravel',[.13,.16,.88,.85,.9,1.12],-5,.9),T_P('drag','275/40R18 drag radial',.34,.275,18,'perf','drag',[.13,.15,.82,.7,1,1.12],0,1,-1,.02)],
    rides:[R_P('gt','Slammed 2 in',-.05,'gt'),R_P('stock','Factory',0,'coupe'),R_P('gravel','Raised for gravel',.04,'rally',5)],
    shocks:['sport','race','rally'],brakes:['big','race'],weight:[['stock','Factory',0,0],['race','Race strip-out',-230,5200]],
    kits:{coupe:{kg:0},coupeGT:{kg:20}}},
  wagon:{chassisKg:1470,drv:'AWD',
    engines:['i525'],trans:['auto5','race4','man6'],axles:[3.5,3.9,4.10,4.44],transfer:['none'],diffs:['factory','lsd'],
    tires:[T_P('touring','205/60R16 touring',.33,.205,16,'hwy','allseason',[.12,.15,.82,.65,.9,1.04]),T_P('drag','245/60R15 drag radial',.34,.245,15,'perf','drag',[.13,.15,.82,.7,1,1.04]),
      T_P('perf','225/45R17 performance',.32,.225,17,'perf','perf',[.11,.13,.8,.6,.95,1.06],5),T_P('at','215/70R16 all-terrain',.35,.215,16,'at','at',[.13,.16,.84,.72,.95,1.04],8,1,.02),
      T_P('gravel','205/65R15 gravel rally',.33,.205,15,'at','gravel',[.13,.16,.88,.85,.9,1.06],0,.95)],
    rides:[R_P('low','Lowered 1.5 in',-.035,'wagonLow'),R_P('stock','Factory',0,'wagon'),R_P('raised','Raised 1.5 in',.035,'rally',8)],
    shocks:['stock','sport','rally'],brakes:['stock','big'],weight:[['stock','Factory',0,0],['light','Back seats and spare out',-60,200]],
    kits:{wagon:{kg:0},wagonSleeper:{kg:0}}},
  pickup:{chassisKg:2275,drv:'AWD',
    engines:['v57','v62','bb74'],trans:['auto6','race4'],axles:[3.73,4.10,4.56,4.88],transfer:['low','crawl'],diffs:['factory','rear','both'],
    tires:[T_P('at','285/70R18 all-terrain',.42,.285,18,'at','at',[.13,.16,.84,.72,1.05,1.1]),T_P('hwy','275/65R18 highway',.41,.275,18,'hwy','allseason',[.12,.15,.82,.65,1,1.08],-8),
      T_P('mt35','35x12.5R17 mud-terrain',.445,.318,17,'mt','mud',[.15,.18,.85,.8,1.08,1.08],30,1.1),T_P('desert','37x12.5R17 desert',.47,.318,17,'mt','at',[.14,.17,.85,.78,1.15,1.12],45,1.15,.1),
      T_P('mt37','37x12.5R17 mud-terrain',.47,.318,17,'mt','mud',TY_MT,55,1.15,.1)],
    rides:[R_P('stock','Factory 2 in lift',0,'pickup'),R_P('lt','Long-travel, wide',.1,'prerunner',25,.28),R_P('lift6','6 in lift',.1,'lift6',30,.08,true)],
    shocks:['stock','sport','bypass'],brakes:['stock','big'],weight:[['stock','Factory',0,0],['light','Bed and tailgate lightened',-90,600]],
    kits:{pickup:{kg:0},prerunner:{kg:-120}}},
  muscle:{chassisKg:1330,drv:'RWD',
    engines:['bb72','bb74'],trans:['man4','race4'],axles:[3.23,3.73,4.10,4.56],transfer:[],diffs:['factory','lsd','spool'],
    tires:[T_P('stock','235/60R15',.31,.235,15,'hwy','allseason',[.12,.16,.8,.62,.95,1.06]),T_P('perf','255/50R15 performance',.31,.255,15,'perf','perf',[.11,.13,.8,.6,.95,1.08],4),
      T_P('dragslick','33x16.5R15 slicks, front runners',.45,.42,15,'slick','slick',[.14,.15,.85,.7,1.3,1.18],20,1.3,-1,.02)],
    rides:[R_P('dragnose','Nose down',-.03,'drag'),R_P('stock','Factory',0,'muscle')],
    shocks:['stock','sport','drag'],brakes:['stock','big','drag'],weight:[['stock','Factory',0,0],['race','Gutted, fibreglass panels',-200,2500]],
    kits:{muscle:{kg:0},muscleDrag:{kg:-60}}},
  hatch:{chassisKg:1040,drv:'AWD',
    engines:['i18t'],trans:['man5','rally5'],axles:[4.1,4.4,4.9],transfer:['none'],diffs:['factory','lsd'],
    tires:[T_P('perf','195/60R15',.30,.195,15,'perf','perf',[.11,.14,.8,.6,.85,1.02]),T_P('gravel','205/65R15 gravel rally',.31,.215,15,'at','gravel',TY_GRAVEL),
      T_P('at','205/70R15 all-terrain',.315,.205,15,'at','at',[.13,.16,.84,.72,.9,1.04],4,1,.03),T_P('slick','240/610R15 slick',.3,.24,15,'slick','slick',[.1,.12,.75,.5,.85,1.1],-4,.9,-1,0)],
    rides:[R_P('stock','Factory',0,'hatch'),R_P('rally','Raised for gravel',.05,'rally',10,.18)],
    shocks:['stock','sport','rally'],brakes:['stock','big','race'],weight:[['stock','Factory',0,0],['rally','Rally strip-out',-160,1800]],
    kits:{hatch:{kg:0},hatchB:{kg:30}}}
};
/* ---------- the machines (34_machines). slots: the slots the garage shows; opts: a slot's own choices;
   gov: a speed governor per tune (m/s, 0 for none); power: the power adders that fit ---------- */
const TF=(o,f)=>Object.assign(o,{front:f});
const QOPT={tune:[[0,'Stock','',0],[1,'Rejetted, timing','A richer jet and a little more timing.',350],[2,'Race fuel and tune','Everything it has.',800]],
  exhaust:[['stock','Stock muffler','',0],['pipe','Full system pipe','Louder and a little quicker.',650]],intake:[[0,'Stock airbox','',0],[1,'Lid off, rejetted','More air and the jets to match.',120]]};
Object.assign(CAR_PARTS,{
  quad90:{tireK:0.25,chassisKg:129,drv:'RWD',engines:['q90'],trans:['cvt'],axles:[12.9],transfer:[],diffs:['spool'],slots:['tune','exhaust','tires','wheels','paint'],
    opts:{tune:[[0,'Limiter screw all the way in','The way the dealer set it: about 12 mph.',0],[1,'Limiter screw half out','About 20 mph.',0],[2,'Limiter screw out','All 28 mph of it. Hold on.',0]],
      exhaust:[['stock','Stock muffler','',0],['pipe','Slip-on pipe','Louder, a little quicker.',180]]},gov:[5.4,8.9,12.5],
    tires:[T_P('knobby','19x7-8 knobbies',.235,.17,8,'mt','knobby',[.13,.16,.84,.72,1,1.05]),T_P('mud','20x7-8 mud tyres',.25,.17,8,'mt','mud',[.15,.18,.85,.8,1.05,1.05],3,1.05)],
    rides:[R_P('stock','Stock',0,'quad')],shocks:['stock'],brakes:['stock'],weight:[['stock','Factory',0,0]],kits:{quad90:{kg:0}}},
  quad450:{tireK:0.6,chassisKg:217,drv:'RWD',engines:['q450','q480','q250t'],trans:['quad5'],axles:[8.4,9.4,10.6],transfer:[],diffs:['spool'],slots:['engine','intake','exhaust','tune','axle','tires','ride','shocks','wheels','paint'],
    opts:Object.assign({axle:[[8.4,'Tall sprockets','More top speed, softer pull.',120],[9.4,'Stock sprockets','',0],[10.6,'Short sprockets','Pulls hard out of corners, tops out early.',120]]},QOPT),
    tires:[T_P('knobby','21x7-10 / 20x11-9 knobbies',.265,.2,10,'mt','knobby',[.13,.16,.84,.72,1,1.08]),T_P('mud','22-in mud tyres',.28,.2,10,'mt','mud',[.15,.18,.85,.8,1.05,1.08],6,1.06),
      T_P('paddle','Sand paddles',.27,.24,10,'mt','paddle',[.16,.19,.86,.85,1.05,1.05],4,1.05),T_P('flat','Flat-track tyres',.25,.2,10,'slick','flat',[.1,.13,.8,.6,.95,1.1],-2,.95)],
    rides:[R_P('stock','Stock',0,'quadSport'),R_P('lt','Long-travel A-arms, 2 in wider',.03,'quadLT',8,.1)],shocks:['stock','rally'],brakes:['stock'],weight:[['stock','Factory',0,0]],kits:{quad450:{kg:0}}},
  quadUtil:{tireK:0.7,chassisKg:335,drv:'AWD',engines:['q700','q850'],trans:['cvtHL'],axles:[7.4],transfer:['low'],diffs:['both'],slots:['engine','exhaust','tune','tires','ride','kit','wheels','paint'],
    opts:QOPT,tires:[T_P('at','25x8-12 all-terrains',.31,.22,12,'at','at',[.13,.16,.84,.72,1,1.06]),T_P('mud','27-in mud tyres',.34,.24,12,'mt','mud',[.15,.18,.85,.8,1.08,1.06],10,1.08,.05)],
    rides:[R_P('stock','Stock',0,'quadUtil'),R_P('lift','2 in lift',.05,'quadUtilLift',6,.02)],shocks:['stock'],brakes:['stock'],weight:[['stock','Factory',0,0]],kits:{quadUtil:{kg:0},quadUtilX:{kg:25}}},
  sxs:{tireK:1,chassisKg:700,drv:'AWD',engines:['sxs1000'],trans:['cvt'],axles:[8.6,9.6,10.8],transfer:['low'],diffs:['factory','both'],power:['none','turbo'],slots:['power','exhaust','tune','axle','lockers','tires','ride','shocks','wheels','paint'],
    opts:Object.assign({axle:[[8.6,'Tall clutch kit','More top speed.',300],[9.6,'Stock clutching','',0],[10.8,'Short clutch kit','Snappier off the line and in the dunes.',300]]},QOPT),
    tires:[T_P('at','29-in all-terrains',.37,.25,14,'at','at',[.13,.16,.84,.72,1,1.08]),T_P('mt','32-in mud tyres',.41,.27,15,'mt','mud',[.15,.18,.85,.8,1.08,1.08],25,1.1,.05)],
    rides:[R_P('stock','Stock',0,'sxs'),R_P('lt','Long-travel kit, 6 in wider',.05,'sxsLT',25,.15)],shocks:['stock','bypass'],brakes:['stock','big'],weight:[['stock','Factory',0,0]],kits:{sxs:{kg:0}}},
  golf:{tireK:0.4,chassisKg:380,drv:'RWD',engines:['golf400'],trans:['cvt'],axles:[13.5,11.5],transfer:[],diffs:['factory'],slots:['tune','exhaust','axle','tires','ride','wheels','paint'],
    opts:{tune:[[0,'Governed','About 15 mph, the way the course likes it.',0],[1,'Governor spring swapped','About 19 mph.',90],[2,'Governor out','About 21 mph and every ball in the bag rattling.',150]],
      exhaust:[['stock','Stock muffler','',0],['pipe','Open elbow','No muffler at all.',60]],axle:[[13.5,'Stock gears','',0],[11.5,'High-speed gears','A few more mph, a little less pull.',260]]},
    tires:[T_P('turf','18x8.5-8 turf tyres',.225,.2,8,'hwy','turf',[.12,.15,.82,.65,1,1.0]),T_P('at','22x11-10 all-terrains',.28,.26,10,'at','at',[.13,.16,.84,.72,1.05,1.04],12,1.05,.1)],
    rides:[R_P('stock','Stock',0,'golf'),R_P('lift','6 in lift kit',.15,'golfLift',20,.04)],shocks:['stock'],brakes:['stock'],weight:[['stock','Factory',0,0]],kits:{golf:{kg:0}}},
  kart:{tireK:0.25,chassisKg:138,drv:'RWD',engines:['kart212'],trans:['kart1'],axles:[3.8,4.4,5.0],transfer:[],diffs:['spool'],slots:['tune','exhaust','axle','tires','wheels','paint'],
    opts:{tune:[[0,'Governed','The way it came off the shelf.',0],[1,'Governor removed','A lot more revs. Mind the flywheel.',40],[2,'Stage 2: cam, springs, no governor','It screams now.',260]],
      exhaust:[['stock','Stock muffler','',0],['pipe','Header pipe','Loud.',70]],axle:[[3.8,'Small sprocket','Top speed.',30],[4.4,'Stock sprocket','',0],[5.0,'Big sprocket','Off the line.',30]]},
    tires:[TF(T_P('kart','Kart slicks',.14,.18,5,'slick','kart',[.1,.12,.8,.55,1,1.1]),{R:.13,W:.12,rim:5,tyre:'slick',tread:'kart',curve:[.1,.12,.8,.55,1,1.1],wm:1}),
      TF(T_P('dirt','Dirt-track tyres',.145,.18,5,'at','kartDirt',[.13,.16,.86,.8,1,1.05],1),{R:.135,W:.12,rim:5,tyre:'at',tread:'kartDirt',curve:[.13,.16,.86,.8,1,1.05],wm:1})],
    rides:[R_P('stock','No suspension',0,'kart')],shocks:['stock'],brakes:['stock'],weight:[['stock','Factory',0,0]],kits:{kart:{kg:0}}},
  tractor:{tireK:2.5,chassisKg:1980,drv:'RWD',engines:['popper'],trans:['trac6'],axles:[13.1],transfer:[],diffs:['rear'],slots:['tires','wheels','paint'],
    tires:[TF(T_P('ag','13.6-38 lugged rears',.74,.36,38,'mt','ag',[.16,.2,.86,.85,1,1.05]),{R:.4,W:.16,rim:16,tyre:'hwy',tread:'rib',curve:[.12,.16,.8,.6,1,1.0],wm:1}),
      TF(T_P('turf','Turf rears',.72,.38,38,'at','turf',[.12,.15,.82,.65,1,1.0]),{R:.4,W:.16,rim:16,tyre:'hwy',tread:'rib',curve:[.12,.16,.8,.6,1,1.0],wm:1})],
    rides:[R_P('stock','Stock',0,'tractor')],shocks:['stock'],brakes:['stock'],weight:[['stock','Factory',0,0]],kits:{tractor:{kg:0}}},
  semi:{tireK:0.5,chassisKg:7130,drv:'RWD',engines:['semi15'],trans:['truck10'],axles:[3.36,3.55,3.91],transfer:[],diffs:['factory','rear'],slots:['exhaust','tune','axle','lockers','tires','wheels','paint'],
    opts:{tune:[[0,'Factory, governed to 70','',0],[1,'Reflash: governed to 80','',900],[2,'Delete and tune','No governor, a lot more torque, black smoke.',4800]],
      exhaust:[['stock','Muffler and stack','',0],['stacks','Straight stacks','Two chrome stacks with nothing in them.',1800]],
      axle:[[3.36,'3.36 rears','Built for the highway.',900],[3.55,'3.55 rears','',0],[3.91,'3.91 rears','More pull, less top end.',900]]},gov:[31.3,35.8,0],
    tires:[T_P('truck','295/75R22.5 highway',.51,.29,22.5,'hwy','truck',[.11,.14,.8,.6,1,1.0]),T_P('lug','11R22.5 drive lugs',.53,.29,22.5,'mt','mud',[.14,.18,.84,.75,1,1.0],200,1.02)],
    rides:[R_P('stock','Air ride',0,'semi')],shocks:['stock'],brakes:['stock'],weight:[['stock','Factory',0,0]],kits:{semi:{kg:0}}}
});
const MACH_PRESET=(kit,engine,trans,axle,lockers,tires,extra)=>Object.assign({kit,engine,power:'none',intake:0,exhaust:'stock',cam:0,tune:0,nos:0,trans,axle,lockers,tires,ride:'stock',shocks:'stock',brakes:'stock',weight:'stock',wheels:'kit',paint:-1},extra||{});
/* the drag car's tyres are two pairs: skinny runners up front and big slicks out back, and only its tubbed body clears them */
const STAGGER={dragslick:{front:{R:.31,W:.16,rim:15,tyre:'hwy',curve:[.12,.18,.75,.6,.6,1.0],tread:'runner',wm:.6},kit:'muscleDrag'}};
/* what each car's parts are when it leaves the factory, and the presets built from them */
const PRESET_PARTS={
  stock:{kit:'stock',engine:'v46',power:'none',intake:0,exhaust:'stock',cam:0,tune:0,nos:0,trans:'auto6',axle:3.73,transfer:'low',lockers:'factory',tires:'hwy',ride:'stock',shocks:'stock',brakes:'stock',weight:'stock',wheels:'kit',paint:-1},
  sleeper:{kit:'sleeper',engine:'tt38',power:'bigturbo',intake:2,exhaust:'headers',cam:0,tune:2,nos:4,trans:'race4',axle:3.55,transfer:'none',lockers:'factory',tires:'perf',ride:'low2',shocks:'stock',brakes:'big',weight:'light',wheels:'kit',paint:-1},
  crawler:{kit:'crawler',engine:'bb104',power:'roots',intake:2,exhaust:'headers',cam:2,tune:2,nos:1,trans:'race4',axle:4.10,transfer:'low',lockers:'both',tires:'mt37',ride:'lift6',shocks:'bypass',brakes:'stock',weight:'stock',wheels:'kit',paint:-1},
  race:{kit:'race',engine:'bb74',power:'twin',intake:2,exhaust:'side',cam:3,tune:2,nos:4,trans:'seq6',axle:3.73,transfer:'none',lockers:'factory',tires:'slick',ride:'low4',shocks:'bypass',brakes:'race',weight:'race',wheels:'kit',paint:-1},
  trail:{kit:'trail',engine:'i40',power:'none',intake:0,exhaust:'stock',cam:0,tune:0,nos:0,trans:'auto4',axle:4.10,transfer:'low',lockers:'factory',tires:'at',ride:'stock',shocks:'stock',brakes:'stock',weight:'stock',wheels:'kit',paint:-1},
  trailRig:{kit:'trailRig',engine:'v62',power:'none',intake:1,exhaust:'headers',cam:2,tune:1,nos:0,trans:'auto4',axle:4.88,transfer:'low',lockers:'both',tires:'mt37',ride:'lt',shocks:'bypass',brakes:'stock',weight:'stock',wheels:'kit',paint:-1},
  coupe:{kit:'coupe',engine:'fp52',power:'none',intake:0,exhaust:'stock',cam:0,tune:0,nos:0,trans:'man6',axle:3.73,lockers:'factory',tires:'perf',ride:'stock',shocks:'sport',brakes:'big',weight:'stock',wheels:'kit',paint:-1},
  coupeGT:{kit:'coupeGT',engine:'fp55',power:'none',intake:2,exhaust:'side',cam:3,tune:2,nos:0,trans:'seq6',axle:3.91,lockers:'lsd',tires:'slick',ride:'gt',shocks:'race',brakes:'race',weight:'race',wheels:'kit',paint:-1},
  wagon:{kit:'wagon',engine:'i525',power:'stock',intake:0,exhaust:'stock',cam:0,tune:0,nos:0,trans:'auto5',axle:3.5,transfer:'none',lockers:'factory',tires:'touring',ride:'stock',shocks:'stock',brakes:'stock',weight:'stock',wheels:'kit',paint:-1},
  wagonSleeper:{kit:'wagonSleeper',engine:'i525',power:'bigturbo',intake:1,exhaust:'straight',cam:2,tune:2,nos:2,trans:'race4',axle:4.10,transfer:'none',lockers:'factory',tires:'drag',ride:'low',shocks:'stock',brakes:'big',weight:'light',wheels:'kit',paint:-1},
  pickup:{kit:'pickup',engine:'v57',power:'none',intake:0,exhaust:'stock',cam:0,tune:0,nos:0,trans:'auto6',axle:3.73,transfer:'low',lockers:'rear',tires:'at',ride:'stock',shocks:'stock',brakes:'stock',weight:'stock',wheels:'kit',paint:-1},
  prerunner:{kit:'prerunner',engine:'v62',power:'none',intake:1,exhaust:'headers',cam:2,tune:2,nos:0,trans:'auto6',axle:4.56,transfer:'low',lockers:'rear',tires:'desert',ride:'lt',shocks:'bypass',brakes:'stock',weight:'light',wheels:'kit',paint:-1},
  muscle:{kit:'muscle',engine:'bb72',power:'none',intake:0,exhaust:'stock',cam:1,tune:0,nos:0,trans:'man4',axle:3.73,lockers:'factory',tires:'stock',ride:'stock',shocks:'stock',brakes:'stock',weight:'stock',wheels:'kit',paint:-1},
  muscleDrag:{kit:'muscleDrag',engine:'bb74',power:'roots',intake:2,exhaust:'side',cam:3,tune:2,nos:0,trans:'race4',axle:4.56,lockers:'spool',tires:'dragslick',ride:'dragnose',shocks:'drag',brakes:'drag',weight:'race',wheels:'kit',paint:-1},
  hatch:{kit:'hatch',engine:'i18t',power:'stock',intake:0,exhaust:'stock',cam:0,tune:0,nos:0,trans:'man5',axle:4.1,transfer:'none',lockers:'factory',tires:'perf',ride:'stock',shocks:'stock',brakes:'stock',weight:'stock',wheels:'kit',paint:-1},
  hatchB:{kit:'hatchB',engine:'i18t',power:'antilag',intake:2,exhaust:'straight',cam:2,tune:2,nos:0,trans:'rally5',axle:4.4,transfer:'none',lockers:'lsd',tires:'gravel',ride:'rally',shocks:'rally',brakes:'race',weight:'rally',wheels:'kit',paint:-1},
  quad90:MACH_PRESET('quad90','q90','cvt',12.9,'spool','knobby'),
  quad450:MACH_PRESET('quad450','q450','quad5',9.4,'spool','knobby'),
  quad450X:MACH_PRESET('quad450','q480','quad5',10.6,'spool','knobby',{intake:1,exhaust:'pipe',tune:2,ride:'lt',shocks:'rally'}),
  quadUtil:MACH_PRESET('quadUtil','q700','cvtHL',7.4,'both','at',{transfer:'low'}),
  quadUtilX:MACH_PRESET('quadUtilX','q850','cvtHL',7.4,'both','mud',{transfer:'low',exhaust:'pipe',ride:'lift'}),
  sxs:MACH_PRESET('sxs','sxs1000','cvt',9.6,'factory','at',{transfer:'low'}),
  sxsX:MACH_PRESET('sxs','sxs1000','cvt',10.8,'both','mt',{transfer:'low',power:'turbo',exhaust:'pipe',ride:'lt',shocks:'bypass'}),
  golf:MACH_PRESET('golf','golf400','cvt',13.5,'factory','turf'),
  golfX:MACH_PRESET('golf','golf400','cvt',11.5,'factory','at',{tune:2,ride:'lift'}),
  kart:MACH_PRESET('kart','kart212','kart1',4.4,'spool','kart'),
  tractor:MACH_PRESET('tractor','popper','trac6',13.1,'rear','ag'),
  semi:MACH_PRESET('semi','semi15','truck10',3.55,'factory','truck')
};
/* the power adders an engine can take */
const powerFor=(eng,car)=>car&&CAR_PARTS[car]&&CAR_PARTS[car].power||(car&&MACH[car]?['none']:null)||({tt35:['stockTwin','bigturbo'],tt38:['stockTwin','bigturbo'],i525:['stock','bigturbo'],i18t:['stock','bigturbo','antilag']})[eng]||['none','turbo','twin','roots'];
/* the slot's options for a car: [value, label, note, price] */
function slotOptions(car,slot,rig){
  const P=CAR_PARTS[car];
  switch(slot){
    case 'engine':return P.engines.map(k=>[k,ENGINES[k].name,ENGINES[k].note,ENGINES[k].price]);
    case 'power':return powerFor(rig.engine).map(k=>[k,POWER[k].name,POWER[k].note,POWER[k].price]);
    case 'intake':return INTAKES.map((o,i)=>[i,o.name,o.note,o.price]);
    case 'exhaust':return Object.keys(EXHAUSTS).map(k=>[k,EXHAUSTS[k].name,EXHAUSTS[k].note,EXHAUSTS[k].price]);
    case 'cam':return rig.engine==='tt35'||rig.engine==='tt38'?[[0,CAM_PARTS[0].name,'This V6 keeps its factory cams.',0]]:CAM_PARTS.map((o,i)=>[i,o.name,o.note,o.price]);
    case 'tune':return TUNES.map((o,i)=>[i,o.name,o.note,o.price]);
    case 'nos':return NITROUS.map((o,i)=>[i,o.name,o.note||'More shot, more push, the same eight seconds.',o.price]);
    case 'trans':return P.trans.map(k=>[k,TRANS[k].name,TRANS[k].note,TRANS[k].price]);
    case 'axle':return P.axles.map(a=>[a,a.toFixed(2)+' gears',a<=3.6?'Tall: more top speed, slower off the line.':a>=4.8?'Very short: huge pull and crawl, low top speed.':a>=4.3?'Short: quick off the line and strong in the dirt.':'In between.',350]);
    case 'transfer':return P.transfer.map(k=>[k,TRANSFER[k].name,TRANSFER[k].note,TRANSFER[k].price]);
    case 'lockers':return P.diffs.map(k=>[k,DIFFS[k].name,DIFFS[k].note,DIFFS[k].price]);
    case 'tires':return P.tires.map(t=>[t.id,t.name,TREAD_NOTE[t.tread],Math.round(600+Math.max(0,t.kg)*30+(t.tread==='slick'?900:0))]);
    case 'ride':return P.rides.map(r=>[r.id,r.name,r.lift<0?'Lower: less roll on tarmac, but it scrapes over rocks and ruts.':r.lift>0?'Higher: clears rocks and ruts, rolls more in fast turns.':'As it left the factory.',r.lift?Math.round(900+Math.abs(r.lift)*16000):0]);
    case 'shocks':return P.shocks.map(k=>[k,SHOCKS_P[k].name,SHOCKS_P[k].note||'',SHOCKS_P[k].price]);
    case 'brakes':return P.brakes.map(k=>[k,BRAKES_P[k].name,BRAKES_P[k].note||'',BRAKES_P[k].price]);
    case 'weight':return P.weight.map(([k,n,kg,pr])=>[k,n,kg?`${kg} kg.`:'',pr]);
    case 'kit':return Object.keys(P.kits).map(k=>{const b=BUILDS.find(q=>q.id===k);return MACH[car]?[k,k===car?'Stock':b.name+' kit',b.tag,k===car?0:1400]:[k,b.name+' body',b.blurb,k===car||PRESET_PARTS[k]&&b.name==='Stock'?0:3500];});
    case 'wheels':return WHEELS.map(w=>[w[0],w[1],'',w[0]==='kit'?0:900]);
    case 'paint':return [[-1,'As the body kit comes','',0],...PAINTS.map((p,i)=>[i,p[0],'',600])];
  }
  return [];
}
const TREAD_NOTE={allseason:'All-season: fine everywhere, best at nothing. Gets an AWD truck down a muddy lane.',perf:'Performance: grips on tarmac, slips on loose ground.',
  at:'All-terrain: nearly as good on tarmac, better everywhere loose.',mud:'Mud-terrain: big lugs that bite in mud and rock, hum and slide on tarmac.',
  slick:'Slick: the most grip on tarmac there is, and none in the dirt.',drag:'Drag radial: sticky in a straight line on hard ground, lost in the dirt.',gravel:'Gravel rally: made for loose stone and dirt at speed.',
  knobby:'Knobbies: square lugs that dig into dirt and hold on loose ground.',paddle:'Sand paddles: scoops across the tread. Throw roost in mud and sand, skate on anything hard.',
  flat:'Flat-track: short, dense knobs for hard-packed dirt and tarmac. Lost in mud.',kart:'Kart slicks: sticky on tarmac and hopeless on anything else.',
  kartDirt:'Dirt-kart tyres: small blocks that grip a dirt oval.',ag:'Tractor lugs: tall chevrons that pull through mud and grass. Bouncy on the road.',
  turf:'Turf tyres: made not to tear up a lawn, so they don\'t grip much of anything.',truck:'Highway tyres for a big truck: hard and long-wearing.'};

/* ---------- does a choice fit the rest of the rig? '' if it does, else why not ---------- */
function fits(car,rig,slot,val){
  const P=CAR_PARTS[car],r=Object.assign({},rig,{[slot]:val}),t=P.tires.find(q=>q.id===r.tires),ride=P.rides.find(q=>q.id===r.ride);
  if(!t||!ride)return 'Not for this car';
  if(ride.lift<t.minLift-1e-6){const need=P.rides.find(q=>q.lift>=t.minLift-1e-6);return slot==='tires'?`Needs the ${need?need.name.toLowerCase():'taller suspension'}`:`Too low for ${t.name.split(' ')[0]} tires`;}
  if(ride.lift>t.maxLift+1e-6)return slot==='tires'?'Not on a lifted truck':`Too high for ${t.tread==='slick'?'slicks':'drag radials'}`;
  const st=STAGGER[r.tires];if(st&&st.kit!==r.kit)return slot==='kit'?'The slicks need the tubbed body':'Needs the tubbed drag body';
  if(slot==='power'&&!powerFor(r.engine,car).includes(val))return 'Not on this engine';
  if(slot==='lockers'&&val==='spool'&&!st&&!MACH[car])return 'Drag slicks only';
  return '';
}
/* changing the engine can leave the power adder on one it doesn't fit: take the nearest that does */
function fixRig(car,rig){
  const p=powerFor(rig.engine);if(!p.includes(rig.power))rig.power=p.includes('turbo')&&['turbo','bigturbo','antilag','stock','stockTwin'].includes(rig.power)?'turbo':p[0];
  if(rig.engine==='tt35'||rig.engine==='tt38')rig.cam=0;
  if(rig.lockers==='spool'&&!STAGGER[rig.tires]&&!MACH[car])rig.lockers='factory';
  return rig;
}

/* ---------- a rig as a build ---------- */
const rigKey=(car,r)=>car+'|'+SLOTS.map(s=>r[s[0]]).join('|');
const RIG_BUILD=new Map();
/* the index in BUILDS of the build this rig makes, made the first time */
function rigBuild(car,rig){
  const key=rigKey(car,rig);if(RIG_BUILD.has(key))return RIG_BUILD.get(key);
  const P=CAR_PARTS[car],K=BUILDS.find(b=>b.id===rig.kit),KR=RUNNING[rig.kit]||RUNNING.stock,KE=ENGINE_OF[rig.kit]||ENGINE_OF.stock;
  const kitTire=P.tires.find(t=>Math.abs(t.R-K.look.tyre.R)<.004&&t.W>=K.look.tyre.W-.01)||P.tires[0],kitRide=P.rides.find(q=>Math.abs(q.lift-K.look.lift)<.004)||P.rides.find(q=>q.id==='stock')||P.rides[0];
  const t=P.tires.find(q=>q.id===rig.tires)||P.tires[0],ride=P.rides.find(q=>q.id===rig.ride)||kitRide,st=t.front?{front:t.front}:STAGGER[t.id],mach=!!K.machine;
  const id='rig:'+key,look=JSON.parse(JSON.stringify(K.look,(k,v)=>v instanceof Float32Array?Array.from(v):v));
  /* things in the look that are not plain data (material colours) come across by reference */
  for(const k of Object.keys(K.look))if(typeof K.look[k]==='object'&&K.look[k]&&!Array.isArray(K.look[k])&&k!=='tyre'&&k!=='tyreR'&&k!=='flares')look[k]=K.look[k];
  const wh=WHEELS.find(w=>w[0]===rig.wheels),style=rig.wheels==='kit'||!wh?K.look.tyre.style:rig.wheels==='beadB'?'bead':rig.wheels;
  const brakeLook=rig.brakes==='drag'?'race':rig.brakes;
  if(st){look.tyre={R:st.front.R,W:st.front.W,rim:st.front.rim,tyre:st.front.tyre,style,brake:brakeLook};look.tyreR={R:t.R,W:t.W,rim:t.rim,tyre:t.vis,style:mach?style:'bead',brake:brakeLook};}
  else{look.tyre={R:t.R,W:t.W,rim:t.rim,tyre:t.vis,style,brake:brakeLook};delete look.tyreR;if(!mach)delete look.trackR;}
  look.lift=ride.lift;
  if(ride.solid)look.susp='solid';else if(kitRide.solid&&!ride.solid&&car!=='trail')look.susp='ifs';
  /* bigger tyres: the arches open up to clear them and flares cover the wider tread (the drag car's tubs
     were made for its slicks) */
  if(!st&&!mach&&t.R+.035>look.archR+.005)look.archR=t.R+.035;
  if(!st&&!mach&&(t.R>kitTire.R+.02||t.W>kitTire.W+.03)){const f=look.flares||{w:0,out:0};look.flares=Object.assign({},f,{w:Math.max(f.w||0,.12),out:Math.max(f.out||0,.07)});}
  if(!st||mach)look.track=+(K.look.track+(st?0:t.W-kitTire.W)+(ride.trackAdd-kitRide.trackAdd)).toFixed(3);
  if(mach&&K.look.trackR){look.trackR=K.look.trackR+(ride.trackAdd-kitRide.trackAdd);}
  const gov=P.gov?P.gov[rig.tune|0]||0:0;
  const b={id,car,machine:K.machine,gov,name:'Custom',tag:'Your build',blurb:K.blurb,paint:rig.paint>=0?PAINTS[rig.paint][1]:K.paint,paint2:K.paint2,rim:rig.wheels==='kit'||!wh?K.rim:wh[2],cal:K.cal,clad:K.clad,dirt:K.dirt,liv:K.liv,look,specs:K.specs,rig:Object.assign({},rig),kit:rig.kit};
  /* the running gear */
  const L=DIFFS[rig.lockers]||DIFFS.factory,kd=Object.assign({},KR.diff||{});delete kd.lockers;delete kd.low;delete kd.spool;
  if(rig.lockers==='lsd')Object.assign(kd,{pre:80,acc:.5,dec:.3});
  if(L.lockers)kd.lockers=L.lockers;if(rig.lockers==='spool')kd.spool=true;
  const tr=TRANSFER[rig.transfer];if(tr&&tr.low){kd.low=true;kd.lowK=tr.low;}
  const TY=(tread,c)=>T_(tread,c[0],c[1],c[2],c[3],c[4],c[5]);
  RUNNING[id]={tyre:st?TY(st.front.tread,st.front.curve):TY(t.tread,t.curve),tyreR:st?TY(t.tread,t.curve):undefined,susp:ride.susp,shocks:rig.shocks,
    wm:st?st.front.wm:t.wm,wmR:st?t.wm:undefined,wf:KR.wf,aero:KR.aero,lock:KR.lock,diff:kd,brake:rig.brakes==='stock'?undefined:rig.brakes,tc:KR.tc};
  if(!RUNNING[id].tyreR)delete RUNNING[id].tyreR;
  /* the engine */
  const E=ENGINES[rig.engine],w=P.weight.find(q=>q[0]===rig.weight)||P.weight[0],kit=P.kits[rig.kit]||{kg:0};
  const mass=Math.round(P.chassisKg+E.kg+(POWER[rig.power]||POWER.none).kg+kit.kg+t.kg+ride.kg+w[2]+(NITROUS[rig.nos]||NITROUS[0]).kg);
  const power=rig.power==='stock'||rig.power==='stockTwin'?'none':rig.power==='antilag'?'bigturbo':rig.power;
  ENGINE_OF[id]={desc:'',engine:E.base||rig.engine,disp:E.disp,power,antilag:rig.power==='antilag'?1:0,intake:rig.intake,exhaust:rig.exhaust,cam:rig.cam,tune:rig.tune,nos:rig.nos,
    trans:rig.trans,axle:rig.axle,mass,cdA:KE.cdA,mu:KE.mu,drv:P.drv,mount:KE.mount,hat:power==='roots'&&rig.kit==='muscleDrag'?'bug':undefined};
  BUILDS.push(b);const i=BUILDS.length-1;RIG_BUILD.set(key,i);return i;
}
/* a preset's parts, as a fresh rig */
const presetRig=id=>Object.assign({},PRESET_PARTS[id]);
const presetsOf=car=>Object.keys(PRESET_PARTS).filter(k=>BUILDS.find(b=>b.id===k).car===car);
