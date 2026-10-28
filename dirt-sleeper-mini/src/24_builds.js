/* =====================================================================================
   THE FOUR TRUCKS. Each is a look: ride height, tyres and wheels, a face and a tail, and the
   bolt-ons. Paint, mud and the lights are set at draw time, so they cost nothing to change.
   ===================================================================================== */
const PAINTS=[
  ['Canyon Stone','#6a625b'],['Gunmetal','#4b4e53'],['Midnight','#141518'],['Desert Sand','#b39d7a'],
  ['Safety Orange','#d8611e'],['Forest','#2f4636'],['Oxide Red','#6e2a22'],['Race White','#e4e2dc']
];
const BUILDS=[
  {id:'stock',name:'Stock',tag:'As it left the factory',
    blurb:'The classic sleeper: 4.6 V8, chrome twin-bar face, factory six-spokes on 245/65R17 all-seasons, roof rails with crossbars.',
    paint:'#6a625b',paint2:'#8a1c1c',rim:'#b8bcc2',cal:'#3a3a3e',clad:'#3a3a3d',dirt:0,liv:0,
    look:{lift:0,track:1.60,archR:.445,archN:2.3,tyre:{R:.378,W:.245,rim:17,tyre:'hwy',style:'six',brake:'stock'},
      face:'classic',tail:'classic',flares:{w:.088,out:.03},roof:'bars',spoiler:'lip',exhaust:'single',susp:'ifs'},
    specs:[['Ride','Factory'],['Tyres','245/65R17 all-season'],['Wheels','17 in six-spoke alloy'],['Engine','4.6 V8']]},
  {id:'sleeper',name:'Sleeper',tag:'Looks like church, runs sevens',
    blurb:'The street sleeper: dropped two inches on 20-inch ten-spokes and big red brakes, split-mesh face, smoked lamps, hood scoop, lip, roof spoiler and LED tails.',
    paint:'#5f554b',paint2:'#c2241c',rim:'#7a1418',cal:'#c8241c',clad:'#1d1d20',dirt:0,liv:0,
    look:{lift:-.05,track:1.62,archR:.455,archN:2.3,skirt:1,tyre:{R:.372,W:.285,rim:20,tyre:'perf',style:'ten',brake:'big'},
      face:'street',tail:'led',flares:{w:.06,out:.014},roof:'rails',spoiler:'roof',exhaust:'dual',susp:'ifs',hood:'scoop',front:'lip',rear:'diffuser',
      extras:['pinstripe'],tintF:MM.GL,tintR:MM.GL},
    specs:[['Ride','Lowered 2 in'],['Tyres','285/45R20 performance'],['Wheels','20 in ten-spoke'],['Engine','Twin-turbo V6, 250 shot']]},
  {id:'crawler',name:'Rock & Mud',tag:'Built for the bog and the ledges',
    blurb:'Six-inch lift and 37-inch mud-terrains on bronze beadlocks, solid axles on coilovers, steel bumpers with a winch and shackles, rock sliders, snorkel and an expedition rack.',
    paint:'#6a5a49',paint2:'#a8783c',rim:'#9a6a32',cal:'#3a3a3e',clad:'#2c2c2e',dirt:.62,liv:0,
    look:{lift:.15,track:1.74,archR:.5,archN:3.2,archH:.95,tyre:{R:.47,W:.318,rim:17,tyre:'mt',style:'bead',brake:'stock'},
      face:'back',tail:'back',flares:{w:.125,out:.1},roof:'rack',spoiler:'lip',exhaust:'crawl',susp:'solid',front:'steel',rear:'steel',
      extras:['sliders','snorkel','ditch','flaps'],springCol:V(lin('#c8301c'),MAT.METAL),mirrorCap:MM.PAINT},
    specs:[['Ride','6 in lift, solid axles'],['Tyres','37x12.5R17 mud-terrain'],['Wheels','17 in beadlock'],['Engine','7.4 big-block, Roots blower']]},
  {id:'race',name:'Race',tag:'Everything for the stopwatch',
    blurb:'A full race build: bolted widebody, slammed on 18-inch centre-locks and slicks, carbon splitter, canards and diffuser, a GT wing on swan necks, vented hood, roof scoop and side-exit exhaust.',
    paint:'#e4e2dc',paint2:'#d0261e',rim:'#d6a63a',cal:'#d6a63a',clad:'#1a1a1c',dirt:0,liv:1,
    look:{lift:-.1,track:1.76,archR:.47,archN:2.6,clad:false,tyre:{R:.345,W:.31,rim:18,tyre:'slick',style:'race',brake:'race'},
      face:'race',tail:'race',flares:{w:.17,out:.13,mat:MM.PAINT,bolts:1,a0:-.03,a1:1.03},roof:'none',spoiler:'wing',spoilerMat:MM.CARBON,exhaust:'side',susp:'ifs',
      hood:'vents',front:'race',rear:'race',extras:['skirts','raceKit'],mirror:'race',noHandles:1,noFuel:1,noMarkers:1,tintR:MM.GL,roofBlack:0},
    specs:[['Ride','Slammed 4 in'],['Tyres','310/680R18 slick'],['Wheels','18 in centre-lock'],['Engine','Twin-turbo big-block']]}
];
