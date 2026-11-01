/* =====================================================================================
   CITY LIMITS' THREE CARS (City & Country) — the electric sedan, the wedge and the hypercar, stock and built: their builds,
   engines (or motors), running gear and chassis numbers, in the same tables the Dirt Sleeper cars use.
   ===================================================================================== */
/* two more materials for the shader: a light strip that glows the build's own colour, the underglow tube */
MAT.STRIP=30;MAT.UNDERGLOW=31;
/* (after Back Forty's seven cars, ahead of the machines) */
{const at=CARS.findIndex(c=>MACH&&MACH[c[0]]);CARS.splice(at<0?CARS.length:at,0,['ev','Electric'],['wedge','Wedge'],['hyper','Hypercar']);}
BUILDS.push(
  {id:'ev',car:'ev',name:'Stock',tag:'Silent, then gone',
    blurb:'A four-door electric fastback: a motor on each axle, 750 hp the instant you touch the pedal and one gear to 168 mph. Slim LED lamps, big black intakes, aero wheels, a light bar across the tail.',
    paint:'#7a8089',paint2:'#c8241c',rim:'#9aa0a8',cal:'#2a2a2e',clad:'#141416',dirt:0,liv:0,metal:.4,
    look:{body:'ev',lift:0,track:1.66,archR:.42,archN:2.2,clad:false,tyre:{R:.36,W:.265,rim:21,tyre:'perf',style:'five',brake:'big'},
      face:'ev',tail:'ev',roof:'none',exhaust:'none',susp:'ifs',mirror:'race',front:'lip',rear:'coupeDiff',tintF:MM.GL,tintR:MM.GL,noFuel:1},
    specs:[['Ride','Factory, air springs'],['Tyres','265/35R21 performance'],['Wheels','21 in aero'],['Drive','Two motors, 750 hp']]},
  {id:'evRace',car:'ev',name:'Race',tag:'Built for the stopwatch, still silent',
    blurb:'The same sedan as a track car: a bolted widebody, a carbon splitter with canards and a red tow strap, a big wing on swan necks, vented fenders and hood, slicks on black 18s, a third motor and 1,100 hp.',
    paint:'#767c85',paint2:'#d02a1e',rim:'#141416',cal:'#d02a1e',clad:'#141416',dirt:0,liv:0,metal:.4,
    look:{body:'ev',lift:-.04,track:1.78,archR:.43,archN:2.4,clad:false,tyre:{R:.345,W:.31,rim:18,tyre:'slick',style:'ten',brake:'race'},
      face:'ev',tail:'ev',flares:{w:.15,out:.11,mat:MM.PAINT,bolts:1,a0:-.03,a1:1.03},roof:'none',spoiler:'gt',spoilerMat:MM.CARBON,exhaust:'none',susp:'ifs',mirror:'race',
      front:'race',rear:'coupeDiff',hood:'vents',extras:['skirts','evRace'],tintF:MM.GL,tintR:MM.GL,noFuel:1},
    specs:[['Ride','Slammed, race dampers'],['Tyres','310/680R18 slick'],['Wheels','18 in race'],['Drive','Three motors, 1,100 hp']]},
  {id:'wedge',car:'wedge',name:'Stock',tag:'The poster on the bedroom wall',
    blurb:'A late-1980s mid-engine supercar: a 5.2 V12 behind your head, a five-speed gated manual, pop-up lamps, a louvred engine deck and intakes you could put your arm in.',
    paint:'#a8161c',paint2:'#151517',rim:'#c9ccd1',cal:'#2a2a2e',clad:'#141416',dirt:0,liv:0,metal:.35,
    look:{body:'wedge',lift:0,track:1.62,archR:.39,archN:2.6,clad:false,tyre:{R:.326,W:.245,rim:16,tyre:'perf',style:'five',brake:'stock'},
      face:'wedge',tail:'wedge',roof:'none',spoiler:null,exhaust:'quad',susp:'ifs',mirror:'race',front:'lip',rear:'coupeDiff',extras:['popups'],tintF:MM.GL,tintR:MM.GL,noFuel:1},
    specs:[['Ride','Factory'],['Tyres','245/50R16'],['Wheels','16 in five-hole'],['Engine','5.2 V12, mid-mounted']]},
  {id:'wedgeNR',car:'wedge',name:'Night Runner',tag:'Owns the empty roads after midnight',
    blurb:'The wedge built for the late runs: twin turbos on a 5.7 V12, a sequential box, a bolted widebody, a deck wing, a splitter, bronze centre-locks, a neon slash down each side and the glow underneath.',
    paint:'#24103a',paint2:'#18e0ff',rim:'#b8742f',cal:'#18e0ff',clad:'#141416',dirt:0,liv:5,metal:.6,glow:[.1,.85,1],underglow:1,
    look:{body:'wedge',lift:-.04,track:1.74,archR:.4,archN:2.6,clad:false,tyre:{R:.33,W:.3,rim:18,tyre:'perf',style:'race',brake:'race'},
      face:'wedge',tail:'wedge',flares:{w:.16,out:.12,mat:MM.PAINT,bolts:1,a0:-.03,a1:1.03},roof:'none',spoiler:'gt',spoilerMat:MM.CARBON,exhaust:['quad','side'],susp:'ifs',mirror:'race',
      front:'race',rear:'coupeDiff',hood:'vents',extras:['popups','skirts','underglow'],tintF:MM.GL,tintR:MM.GL,noFuel:1},
    specs:[['Ride','Slammed 2 in'],['Tyres','285/35R18'],['Wheels','18 in centre-lock'],['Engine','5.7 twin-turbo V12, 75-shot']]},
  {id:'hyper',car:'hyper',name:'Stock',tag:'Nothing in town is faster',
    blurb:'A modern mid-engine hypercar: a 5.2 V10 screaming to 8,700, a seven-speed paddle box, all-wheel drive, a teardrop canopy, a long tail and a pair of fat tips high in the middle.',
    paint:'#e05a14',paint2:'#141416',rim:'#1b1c1f',cal:'#e8b21b',clad:'#141416',dirt:0,liv:0,metal:.5,
    look:{body:'hyper',lift:0,track:1.7,archR:.41,archN:2.4,clad:false,tyre:{R:.345,W:.3,rim:20,tyre:'perf',style:'split',brake:'race'},
      face:'hyper',tail:'hyper',roof:'none',spoiler:null,exhaust:'centre',susp:'ifs',mirror:'race',front:'lip',rear:'coupeDiff',tintF:MM.GL,tintR:MM.GL,noFuel:1},
    specs:[['Ride','Factory, adaptive'],['Tyres','305/30R20'],['Wheels','20 in forged'],['Engine','5.2 V10, mid-mounted']]},
  {id:'hyperTrack',car:'hyper',name:'Track',tag:'Downforce you can feel at walking pace',
    blurb:'The track edition: the V10 opened to 5.6 with a race cam and ram air, a shark fin down the spine to a huge deck wing, a splitter with canards, a widebody, a roof scoop, slicks on centre-locks, and stripes.',
    paint:'#16181b',paint2:'#ff6a1a',rim:'#1b1c1f',cal:'#ff6a1a',clad:'#141416',dirt:0,liv:3,metal:.5,
    look:{body:'hyper',lift:-.03,track:1.8,archR:.42,archN:2.5,clad:false,tyre:{R:.345,W:.33,rim:20,tyre:'slick',style:'race',brake:'race'},
      face:'hyper',tail:'hyper',flares:{w:.13,out:.09,mat:MM.PAINT,bolts:0,a0:-.03,a1:1.03},roof:'none',spoiler:'gt',spoilerMat:MM.CARBON,exhaust:'centre',susp:'ifs',mirror:'race',
      front:'race',rear:'coupeDiff',extras:['skirts','fin','roofScoop'],tintF:MM.GL,tintR:MM.GL,noFuel:1},
    specs:[['Ride','Slammed, race dampers'],['Tyres','330/680R20 slick'],['Wheels','20 in centre-lock'],['Engine','5.6 V10, 9,000 rpm']]}
);
/* ---------- engines ---------- */
Object.assign(DE_ENGINES,{
  v12w:{layout:'V12',disp:5.2,redline:7600,idle:850,tq:500,cP:.68,cW:.48,cA:.5,Ie:.18,crackle:.3,limiter:'soft'},
  v10h:{layout:'V10',disp:5.2,redline:8700,idle:950,tq:560,cP:.75,cW:.45,cA:.5,Ie:.15,crackle:.45,limiter:'hard'},
  /* the electric car's spec only fills in what the rest of the game reads; its motor is hd/45_ev.js */
  evm:{layout:'I4',disp:2.0,redline:18000,idle:600,tq:780,cP:.3,cW:.6,cA:.6,Ie:.06,crackle:0,limiter:'soft'}
});
DE_GEARS.ev1=[1];DE_SHIFT.ev1=0;
Object.assign(ENGINE_OF,{
  ev:{desc:'Two motors, one on each axle: 750 hp from a standstill and one gear to 168 mph. All you hear is the motors and the tyres.',engine:'evm',power:'none',intake:0,exhaust:'stock',cam:0,tune:0,nos:0,trans:'ev1',axle:9.0,mass:2250,cdA:.6,mu:1.1,drv:'AWD',
    ev:{kw:560,nm:900,maxRpm:18000,regen:.35}},
  evRace:{desc:'A third motor and the cooling to use it: 1,100 hp, one gear, launch control on every corner exit.',engine:'evm',power:'none',intake:0,exhaust:'stock',cam:0,tune:0,nos:0,trans:'ev1',axle:8.4,mass:1950,cdA:.72,mu:1.2,drv:'AWD',
    ev:{kw:820,nm:1050,maxRpm:18000,regen:.5}},
  wedge:{desc:'A 5.2 quad-cam V12 behind the seats, a five-speed gated manual and 3.9 gears, driving the rear wheels.',engine:'v12w',power:'none',intake:0,exhaust:'stock',cam:0,tune:0,nos:0,trans:'man5',axle:3.9,mass:1500,cdA:.66,mu:1.1,drv:'RWD'},
  wedgeNR:{desc:'The V12 stroked to 5.7 with twin turbos, ram air, a straight-through exhaust, a cam, a race tune and a 75-shot. Six-speed sequential.',engine:'v12w',disp:5.7,power:'twin',intake:2,exhaust:'straight',cam:2,tune:2,nos:2,trans:'seq6',axle:3.2,mass:1420,cdA:.72,mu:1.15,drv:'RWD'},
  hyper:{desc:'A 5.2 V10 revving to 8,700, a seven-speed paddle box and all-wheel drive.',engine:'v10h',power:'none',intake:1,exhaust:'stock',cam:1,tune:0,nos:0,trans:'seq6',axle:3.7,mass:1450,cdA:.62,mu:1.15,drv:'AWD'},
  hyperTrack:{desc:'The V10 opened to 5.6 with ram air, a race cam and a race tune, straight-cut gears.',engine:'v10h',disp:5.6,power:'none',intake:2,exhaust:'straight',cam:3,tune:2,nos:0,trans:'seq6',axle:3.7,mass:1330,cdA:.78,mu:1.2,drv:'AWD'}
});
/* ---------- running gear ---------- */
Object.assign(SUSP,{ev:{k:1.5,arbF:34e3,arbR:16e3,droop:.07,bump:.07},evRace:{k:2.5,arbF:44e3,arbR:28e3,droop:.05,bump:.05},
  wedge:{k:1.5,arbF:26e3,arbR:16e3,droop:.07,bump:.07},wedgeNR:{k:2.2,arbF:36e3,arbR:24e3,droop:.05,bump:.05},
  hyper:{k:1.8,arbF:32e3,arbR:22e3,droop:.06,bump:.06},hyperTrack:{k:2.8,arbF:44e3,arbR:30e3,droop:.045,bump:.045}});
Object.assign(HCG,{ev:.48,wedge:.44,hyper:.42});
Object.assign(RUNNING,{
  ev:{tyre:T_('perf',.11,.13,.8,.6,1.1,1.12),susp:'ev',shocks:'sport',wm:1.1,wf:.5,aero:[.05,.08],lock:.58,diff:{pre:40,acc:.3,dec:.15,etc:1},tc:1},
  evRace:{tyre:T_('slick',.1,.12,.75,.5,1,1.12),susp:'evRace',shocks:'race',wm:.95,wf:.5,aero:[.5,.7],lock:.58,diff:{pre:80,acc:.5,dec:.3},brake:'race',tc:1},
  wedge:{tyre:T_('perf',.11,.13,.8,.6,1,1.08),susp:'wedge',shocks:'sport',wm:1,wf:.42,aero:[.02,.06],lock:.56,diff:{pre:50,acc:.3,dec:.15}},
  wedgeNR:{tyre:T_('perf',.11,.13,.8,.6,1,1.14),susp:'wedgeNR',shocks:'race',wm:1,wf:.42,aero:[.3,.5],lock:.58,diff:{pre:80,acc:.5,dec:.3},brake:'race',tc:1},
  hyper:{tyre:T_('perf',.11,.13,.8,.6,1,1.15),susp:'hyper',shocks:'sport',wm:1,wf:.41,aero:[.2,.3],lock:.56,diff:{pre:60,acc:.4,dec:.2},tc:1},
  hyperTrack:{tyre:T_('slick',.1,.12,.75,.5,.95,1.15),susp:'hyperTrack',shocks:'race',wm:.95,wf:.41,aero:[.6,.85],lock:.56,diff:{pre:90,acc:.5,dec:.3},brake:'race',tc:1}
});
SIM_NOABS.wedge=1;
/* ---------- City Limits' ground: the salt flats' crust and the wash's sand, for every tread ---------- */
for(const [t,salt,sand] of [['allseason',.8,.62],['perf',.84,.58],['mud',.8,.74],['slick',.82,.45],['at',.82,.72],['gravel',.86,.7],['drag',.86,.5],['runner',.7,.5]]){TREAD_MU[t].salt=salt;TREAD_MU[t].sand=sand;}
SURF_RR.salt=.016;SURF_RR.sand=.07;
