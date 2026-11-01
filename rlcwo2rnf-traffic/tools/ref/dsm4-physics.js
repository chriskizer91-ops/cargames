/* Dirt Sleeper Mini 4's physics, copied unchanged from Dirt_Sleeper_Mini_4.html, as the reference that
   tools/physcheck.js holds the game's physics to: its four engine recipes (lines 1971-2006), its four
   builds (2834-2866), the physics maths, tyre, tuning, powertrain, vehicle and chassis (2868-3615) and
   RanchWorld's ground queries (4823-4891). It runs in a scope that supplies clamp, lerp, sstep, sgn,
   TAU, PI, SIM, and stubs for the mesh-colour names the builds mention (MM, MAT, V, lin) and SUVB. */
const DE_ENGINES={
  v46: {layout:'V8',disp:4.6,redline:5800,idle:650,tq:407,cP:.62,cW:.55,cA:.65,Ie:.2,crackle:.12,limiter:'soft'},
  bb74:{layout:'V8',disp:7.4,redline:6300,idle:750,tq:660,cP:.6,cW:.52,cA:.62,Ie:.3,crackle:.4,limiter:'hard'},
  tt35:{layout:'V6',disp:3.5,redline:6800,idle:750,tq:330,cP:.6,cW:.5,cA:.55,Ie:.15,fi:'twin',boost:1.1,tsize:1,bov:'valve',crackle:.4,limiter:'hard'}
};
const DE_GEARS={auto6:[4.17,2.34,1.52,1.14,.87,.69],race4:[2.76,1.57,1,.72],seq6:[2.9,2.1,1.66,1.37,1.16,1]};
const DE_SHIFT={auto6:.42,race4:.11,seq6:.06};
/* the recipes. power: none | bigturbo (V6) | roots | twin. exhaust: stock | headers | side.
   intake: 0 airbox, 1 cold air, 2 ram air. cam and tune 0..3 and 0..2. nos: 0, 1 = 35-shot .. 4 = 250-shot */
const ENGINE_OF={
  stock:  {desc:'The factory 4.6 V8 with its airbox and muffler, a six-speed automatic and 3.73 gears.',engine:'v46', power:'none',    intake:0,exhaust:'stock',  cam:0,tune:0,nos:0,trans:'auto6',axle:3.73,mass:2180,cdA:1.25,mu:1.0},
  sleeper:{desc:'Twin-turbo 3.5 V6 with bigger turbos, ram air, long-tube headers, a race tune and a 250-shot of nitrous. Race four-speed with a trans-brake, 4.56 gears.',engine:'tt35',power:'bigturbo',intake:2,exhaust:'headers',cam:0,tune:2,nos:4,trans:'race4',axle:4.56,mass:2090,cdA:1.2, mu:1.15},
  crawler:{desc:'7.4 big-block with a Roots blower, race cam, ram air, headers, a race tune and a 35-shot. Race four-speed with a trans-brake, 5.38 gears.',engine:'bb74',power:'roots',   intake:2,exhaust:'headers',cam:2,tune:2,nos:1,trans:'race4',axle:5.38,mass:2480,cdA:1.55,mu:.95},
  race:   {desc:'7.4 big-block with twin turbos, a wild cam, ram air, side exits, a race tune and a 250-shot. Six-speed sequential with straight-cut gears.',engine:'bb74',power:'twin',    intake:2,exhaust:'side',   cam:3,tune:2,nos:4,trans:'seq6', axle:3.73,mass:1960,cdA:1.3, mu:1.45}
};
function engineSpec(b){
  const r=ENGINE_OF[b.id]||ENGINE_OF.stock,base=Object.assign({},DE_ENGINES[r.engine]);let k=1;
  k*=[1,1.03,1.05][r.intake];base.intake=r.intake;
  base.ex={stock:0,catback:1,headers:2,straight:3,side:3,stacks:9}[r.exhaust];k*={stock:1,catback:1.03,headers:1.07,straight:1.06,side:1.06,stacks:1.06}[r.exhaust];
  if(base.layout!=='V6'){base.cam=r.cam;k*=[1,1.03,1.06,1.08][r.cam];base.cP+=.03*r.cam;base.redline+=150*r.cam;}
  k*=[1,1.05,1.1][r.tune];base.redline+=[0,150,300][r.tune];if(r.tune===2){base.limiter='hard';base.crackle=Math.max(base.crackle,.65);}
  if(r.power==='roots'){base.fi='roots';base.boost=.72;}
  else if(r.power==='twin'){base.fi='twin';base.boost=.95;base.tsize=1;base.bov='flutter';}
  else if(r.power==='bigturbo'){base.boost+=.5;base.tsize=2;}
  base.tq=Math.round(base.tq*k);base.nos=r.nos;
  if(r.trans==='race4'){base.launch=1;base.launchRpm=Math.round(base.redline*.55);}
  if(r.trans==='seq6'){base.seq=1;base.gearWhine=1;}
  const gears=DE_GEARS[r.trans],R=b.look.tyre.R;
  const e=SIM.makeSpec(Object.assign(base,{id:b.id,name:b.name,machine:'car',mass:r.mass,drv:'AWD',R,gears,cdA:r.cdA,mu:r.mu,horn:'car'}));
  e.gears=gears.slice();e.nG=gears.length;e.fd=r.axle;e.shiftT=DE_SHIFT[r.trans];e.R=R;
  /* the six-speed auto and the race four-speed both have a torque converter; the sequential doesn't (the game's physics reads this) */
  e.conv=r.trans!=='seq6';
  return e;
}
const SPECS={};
const specOf=i=>{const b=BUILDS[i];return SPECS[b.id]||(SPECS[b.id]=engineSpec(b));};
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
/* =====================================================================================
   PHYSICS MATHS, from Dirt Sleeper (Shiftlight 3's physics): 3-vectors as arrays, quaternions
   [x,y,z,w] and row-major 3x3 matrices. clamp, lerp, sstep, sgn, TAU and wrapA come from 10_core.
   ===================================================================================== */
  var add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub2 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k], madd = (a, b, k) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k], dot2 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross2 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], len = (a) => Math.hypot(a[0], a[1], a[2]), norm2 = (a) => {
    let l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  };
  var qmul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]], qnorm = (q) => {
    let l = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
    return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
  }, qaxis = (ax, ang) => {
    let s = Math.sin(ang / 2), n = norm2(ax);
    return [n[0] * s, n[1] * s, n[2] * s, Math.cos(ang / 2)];
  };
  function qint(q, w, dt) {
    let d = [w[0] * dt * 0.5, w[1] * dt * 0.5, w[2] * dt * 0.5, 0], r = qmul(d, q);
    return qnorm([q[0] + r[0], q[1] + r[1], q[2] + r[2], q[3] + r[3]]);
  }
  function qmat(q) {
    let x = q[0], y = q[1], z = q[2], w = q[3];
    return [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)];
  }
  var mcol = (m, i) => [m[i], m[3 + i], m[6 + i]], mvec = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]], mtvec = (m, v) => [m[0] * v[0] + m[3] * v[1] + m[6] * v[2], m[1] * v[0] + m[4] * v[1] + m[7] * v[2], m[2] * v[0] + m[5] * v[1] + m[8] * v[2]];
  function qlook(fwd, up) {
    let f2 = norm2(fwd), r = norm2(cross2(f2, up)), u = cross2(r, f2), m00 = f2[0], m01 = u[0], m02 = r[0], m10 = f2[1], m11 = u[1], m12 = r[1], m20 = f2[2], m21 = u[2], m22 = r[2], tr = m00 + m11 + m22, x, y, z, w;
    if (tr > 0) {
      let s = Math.sqrt(tr + 1) * 2;
      w = 0.25 * s, x = (m21 - m12) / s, y = (m02 - m20) / s, z = (m10 - m01) / s;
    } else if (m00 > m11 && m00 > m22) {
      let s = Math.sqrt(1 + m00 - m11 - m22) * 2;
      w = (m21 - m12) / s, x = 0.25 * s, y = (m01 + m10) / s, z = (m02 + m20) / s;
    } else if (m11 > m22) {
      let s = Math.sqrt(1 + m11 - m00 - m22) * 2;
      w = (m02 - m20) / s, x = (m01 + m10) / s, y = 0.25 * s, z = (m12 + m21) / s;
    } else {
      let s = Math.sqrt(1 + m22 - m00 - m11) * 2;
      w = (m10 - m01) / s, x = (m02 + m20) / s, y = (m12 + m21) / s, z = 0.25 * s;
    }
    return qnorm([x, y, z, w]);
  }


/* =====================================================================================
   THE TYRE, from Dirt Sleeper: one combined-slip curve, rising to a peak and falling away to a
   sliding plateau, with load sensitivity. Returns the forces and the stiffness for the solver.
   ===================================================================================== */
  var TYRE_DEFAULT = { mu: 1.1, kPk: 0.11, aPk: 0.15, slide: 0.78, slideW: 0.55, loadSens: 0.12, fz0: 3600 };
  function tyreForce(t, Fz, kap, tanA, muMul, out) {
    if (Fz <= 0)
      return out.fx = 0, out.fy = 0, out.dk = 0, out.sg = 0, out;
    let lf = Math.max(0.6, 1 - t.loadSens * (Fz / t.fz0 - 1)), m = t.mu * muMul * lf * Fz, sx = kap / t.kPk, sy = tanA / Math.tan(t.aPk), sg = Math.hypot(sx, sy);
    if (out.sg = sg, sg < 1e-6)
      return out.fx = 2 * m * sx, out.fy = -2 * m * sy, out.dk = 2 * m / t.kPk, out;
    let f2, fp;
    if (sg < 1)
      f2 = sg * (2 - sg), fp = 2 - 2 * sg;
    else {
      let u = (sg - 1) / t.slideW, q = 1 + u * u;
      f2 = t.slide + (1 - t.slide) / q, fp = -(1 - t.slide) * 2 * u / (t.slideW * q * q);
    }
    let cx = sx / sg, cy = sy / sg;
    return out.fx = m * f2 * cx, out.fy = -m * f2 * cy, out.dk = Math.max(0, m * (fp * cx * cx + f2 / sg * cy * cy) / t.kPk), out;
  }


/* =====================================================================================
   TUNING NUMBERS, from Dirt Sleeper. The physics reads TUNE every step; every value here is
   Dirt Sleeper's shipped baseline, so the trucks drive exactly as they do there.
   ===================================================================================== */
  /* The tuning panel's numbers: one set for the whole game, changed live while you drive. "live" ones are
     read by the physics every step; "build" ones go into the chassis, so changing them rebuilds the truck in
     place. Every default leaves the physics exactly as it was, so the baseline is the game as shipped.
     A set can be copied out as a short code (DSTUNE1.…) and pasted back, and the shipped baseline is
     TUNE_BASE: once a set is picked as the best one, it goes there. */
  var TUNE_GROUPS = [
    ["grip", "Ground grip", "How much grip each surface gives every tyre. The tyre you're on still matters on top of this."],
    ["slope", "Slopes", "Extra slip on steep loose ground, on top of what the slope already does to the tyres' load."],
    ["tyre", "Tyres", "How the tyre behaves once it breaks loose."],
    ["power", "Power", "What the engine puts down. The sound doesn't change."],
    ["susp", "Suspension", "Springs, shocks and sway bars. Changing these rebuilds the truck where it is."],
    ["body", "Truck", "Weight, tipping, brakes and steering."],
    ["air", "Jumps", "How the truck falls once all four tyres leave the ground."]
  ];
  /* id, group, label, min, max, step, base, format, kind, note */
  var TUNE_SPEC = [
    ["gAll", "grip", "Every surface", 0.5, 2, 0.01, 1, "x", "live", "Multiplies all of the ones below."],
    ["gRear", "grip", "Back-end grip", 0.7, 1.4, 0.01, 1, "x", "live", "The rear tyres only. Up: the tail holds on and the truck pushes wide. Down: the tail steps out sooner."],
    ["slideDev", "tyre", "Grip once sliding", 0.8, 1.25, 0.01, 1, "x", "live", "How much grip a tyre keeps once it breaks loose (up to all of it)."],
    ["steerLim", "body", "Steering at speed", 0.7, 2, 0.01, 1, "x", "live", "How far full steering turns the wheels at speed. Up turns harder (and slides sooner)."],
    ["gDirt", "grip", "Dirt", 0.4, 1.6, 0.01, 1, "x", "live", "Ranch roads, the burnout pad, the yard's edges."],
    ["gTrail", "grip", "Trail", 0.4, 1.6, 0.01, 1, "x", "live", "The trail loop and the hill climb."],
    ["gGrass", "grip", "Grass", 0.4, 1.6, 0.01, 1, "x", "live", "The open hills."],
    ["gStrip", "grip", "Drag strip", 0.4, 1.6, 0.01, 1, "x", "live", "The prepped dirt of the eighth mile."],
    ["gMud", "grip", "Mud", 0.3, 1.8, 0.01, 1, "x", "live", "The bog and the mud track."],
    ["gRock", "grip", "Rock", 0.4, 1.6, 0.01, 1, "x", "live", "The rock garden."],
    ["gConcrete", "grip", "Concrete", 0.4, 1.6, 0.01, 1, "x", "live", "The shop's pad."],
    ["gWater", "grip", "Water", 0.3, 1.6, 0.01, 1, "x", "live", "The creek crossings."],
    ["slope", "slope", "Slope slip", 0, 1, 0.01, 0, "pct", "live", "0 is off. At 100% loose dirt on a 30° slope keeps about half its grip; rock barely changes."],
    ["slide", "tyre", "Grip once spinning", 0.6, 1.25, 0.01, 1, "x", "build", "How much grip a spinning or sliding tyre keeps. Raise it and wheelspin hooks up sooner."],
    ["power", "power", "Engine power", 0.4, 1.6, 0.01, 1, "x", "live", "All gears."],
    ["low1", "power", "Torque cap in 1st and 2nd", 0.3, 1, 0.01, 1, "pct", "live", "Like a launch controller: 1st is capped at this share of peak torque, 2nd halfway back. The engine still revs and spools."],
    ["spring", "susp", "Spring stiffness", 0.5, 2, 0.01, 1, "x", "build", "Ride height stays the same; travel and bounce change."],
    ["damp", "susp", "Shock damping", 0.4, 2.5, 0.01, 1, "x", "build", "Low floats and bounces, high skips over bumps."],
    ["arb", "susp", "Sway bars", 0, 2.5, 0.01, 1, "x", "build", "Body roll in turns. Low lets the axles twist more on rocks."],
    ["mass", "body", "Weight", 0.7, 1.4, 0.01, 1, "x", "build", "The springs grow with it, so ride height holds."],
    ["roll", "body", "Tip-over resistance", 0, 0.9, 0.01, 0.2, "m", "build", "Where cornering forces act on the body. Low tips over easily, high stays planted."],
    ["brake", "body", "Brakes", 0.5, 1.6, 0.01, 1, "x", "build", ""],
    ["steerSpd", "body", "Steering speed", 0.5, 2, 0.01, 1, "x", "live", "How fast the wheels turn toward where you point them."],
    ["lock", "body", "Steering lock", 0.6, 1.3, 0.01, 1, "x", "build", "How far the front wheels turn."],
    ["airG", "air", "Gravity in the air", 0.6, 1.4, 0.01, 1, "x", "live", "Below 1 floats, above 1 drops. Only while all four tyres are off the ground."]
  ];
  var TUNE_BASE = {};
  for (let s of TUNE_SPEC) TUNE_BASE[s[0]] = s[6];
  /* the set the physics reads right now */
  var TUNE = Object.assign({}, TUNE_BASE), TUNE_SURF = { dirt: "gDirt", trail: "gTrail", grass: "gGrass", strip: "gStrip", mud: "gMud", rock: "gRock", concrete: "gConcrete", water: "gWater" };
  /* how much each surface gives way on a slope at full Slope slip */
  var SLOPE_LOOSE = { dirt: 1, trail: 0.95, grass: 1.1, mud: 1, water: 0.7, strip: 0.6, rock: 0.3, concrete: 0 };
  function tuneFill(t) {
    let o = Object.assign({}, TUNE_BASE);
    if (t && typeof t == "object") for (let s of TUNE_SPEC) {
      let v = +t[s[0]];
      t[s[0]] !== void 0 && isFinite(v) && (o[s[0]] = Math.max(s[3], Math.min(s[4], v)));
    }
    return o;
  }
  function tuneSet(t) {
    Object.assign(TUNE, tuneFill(t));
  }
  function tuneIsBase(t) {
    return TUNE_SPEC.every((s) => Math.abs(t[s[0]] - s[6]) < 1e-9);
  }
  function tuneEncode(t) {
    let d = {};
    for (let s of TUNE_SPEC) Math.abs(t[s[0]] - s[6]) > 1e-9 && (d[s[0]] = +(+t[s[0]]).toFixed(3));
    return "DSTUNE1." + btoa(JSON.stringify(d)).replace(/=+$/, "");
  }
  function tuneDecode(code) {
    let c = String(code || "").trim();
    if (c.startsWith("{")) return tuneFill(JSON.parse(c));
    if (!c.startsWith("DSTUNE1.")) throw new Error("That isn't a Dirt Sleeper tuning code.");
    let b = c.slice(8);
    for (; b.length % 4; ) b += "=";
    return tuneFill(JSON.parse(atob(b)));
  }
  function tuneFmt(s, v) {
    return s[7] === "pct" ? Math.round(v * 100) + "%" : s[7] === "m" ? v.toFixed(2) + " m" : v.toFixed(2) + "×";
  }
  /* the surface multiplier, with the slope taken off on loose ground. n: the contact normal */
  function tuneGrip(surf, n) {
    let T = TUNE, g = T.gAll * (T[TUNE_SURF[surf]] ?? 1);
    if (T.slope > 0 && n) {
      let ny = Math.max(0.05, n[1]), tn = Math.sqrt(Math.max(0, 1 - ny * ny)) / ny, x = Math.max(0, Math.min(1, (tn - 0.12) / 0.58));
      g *= 1 - T.slope * (SLOPE_LOOSE[surf] ?? 0.5) * x * x * (3 - 2 * x) * 0.55;
    }
    return g;
  }


/* =====================================================================================
   THE POWERTRAIN AND THE VEHICLE, from Dirt Sleeper (Shiftlight 3's physics with Dirt Sleeper's
   off-road changes: rolling resistance as wheel torque, mud and water drag, tyre-circle ground
   contact, line lock, lockers and low range). The engine is a Digital Engine spec, so its torque
   curve, boost, nitrous and limiter are the lab's, and soundParams() feeds the lab's synth.
   ===================================================================================== */
  var { engTq, steadyBoost } = SIM;
  function optimalShifts(e) {
    let out = [], wot = (r) => engTq(e, r, 1, steadyBoost(e, r));
    for (let g = 0; g < e.nG; g++) {
      if (g === e.nG - 1) {
        out.push(e.limiterRpm - 150);
        break;
      }
      let r1 = e.gears[g], r2 = e.gears[g + 1], best = e.limiterRpm - 150;
      for (let rpm = e.redline * 0.5; rpm < e.limiterRpm - 100; rpm += 25) if (wot(rpm * r2 / r1) * r2 > wot(rpm) * r1) {
        best = rpm;
        break;
      }
      out.push(Math.min(best, e.limiterRpm - 150));
    }
    return out;
  }
  var Powertrain = class {
    /* e: SIM.makeSpec(...). o: {drive:'RWD'|'FWD'|'AWD', clutch (N m), engage (s), diff:{pre,acc,dec}, Iw, R} */
    constructor(e, o) {
      this.e = e, this.o = o, this.drv = o.drive === "FWD" ? [0, 1] : o.drive === "AWD" ? [0, 1, 2, 3] : [2, 3], this.upRpm = optimalShifts(e), this.st = "off", this.t = 0, this.we = 0, this.rpm = 0, this.gear = 1, this.shiftT = 0, this.shiftTo = 1, this.engage = 0, this.locked = !1, this.boost = 0, this.nos = e.nosKw ? 1 : 0, this.nosOn = !1, this.cutT = 0, this.cutFrac = 0, this.thr = 0, this.thrSnd = 0, this.load = 0, this.thrPrev = 0, this.launching = !1, this.launchW = 0, this.launchT = 0, this.hold = !1, this.rev = !1, this.revT = 0, this.twostep = !1, this.tcMul = 1, this.tcOn = !1, this.sinceShift = 1, this.shiftGrade = null, this.events = [], this.lopeT = 0, this.rpmOut = 0, this.Te = 0, this.Tdrv = 0;
    }
    get running() {
      return this.st === "run" || this.st === "catch";
    }
    start() {
      (this.st === "off" || this.st === "stopping") && (this.st = "crank", this.t = 0);
    }
    stop() {
      this.st !== "off" && (this.st = "stopping");
    }
    shift(dir) {
      let e = this.e;
      if (this.shiftT > 0 || this.rev || !this.running) return !1;
      let to = this.gear + dir;
      if (to < 1 || to > e.nG) return !1;
      if (this.shiftTo = to, this.shiftT = e.shiftT, this.engage = 0, this.locked = !1, this.sinceShift = 0, dir > 0) {
        let opt = this.upRpm[this.gear - 1], err = this.rpm - opt;
        this.shiftGrade = Math.abs(err) < 180 ? "PERFECT" : Math.abs(err) < 450 ? "GOOD" : err < 0 ? "EARLY" : "LATE", e.seq && this.thr > 0.6 && this.events.push({ type: "shift" });
      } else this.shiftGrade = null;
      return !0;
    }
    /* the automatic gearbox, driven from the same optimal shift points */
    autoShift(brk, air, holdGear = !1) {
      let e = this.e;
      if (this.shiftT > 0 || this.rev || air || this.sinceShift < 0.3 || this.engage < 0.95 || !this.running) return;
      let g = this.gear, rpm = this.rpm;
      if (this.locked && g < e.nG && (!holdGear && rpm > this.upRpm[g - 1] || rpm > e.limiterRpm - 80) && this.thr > 0.3) {
        this.shift(1);
        return;
      }
      if (g > 1 && (!holdGear || rpm < e.idle * 1.6)) {
        let after = rpm * e.gears[g - 2] / e.gears[g - 1];
        after < this.upRpm[g - 2] * 0.88 && (rpm < e.redline * 0.5 || brk > 0.3 && after < e.redline * 0.86) && this.sinceShift > 0.45 && this.shift(-1);
      }
    }
    meanW(W2) {
      let m = 0;
      for (let i of this.drv) m += W2[i].w;
      return m / this.drv.length;
    }
    /* inertia a wheel's brake has to fight (with the engine attached through a locked clutch) */
    effInertia(i, Iw) {
      if (this.locked && this.drv.includes(i)) {
        let gr = this.ratio();
        return Iw + this.e.Ie * gr * gr / this.drv.length;
      }
      return Iw;
    }
    ratio() {
      return this.e.gears[this.gear - 1] * this.e.fd * (this.lo || 1) * (this.rev ? -1.15 : 1);
    }
    /* one substep. inp {thr, brk, nos}. W: four wheels {w, Fx, Kd, Fz, kap}. aid {tc, escThr}. */
    step(dt, inp, W2, aid) {
      let e = this.e, o = this.o, R2 = o.R, Iw = o.Iw, drv = this.drv, idleW = e.idle * TAU / 60;
      this.t += dt, this.lopeT += dt, this.sinceShift += dt, this.twostep = !1, this.cutFrac = 0, this.tcOn = !1, this.etcOn = !1;
      let thrIn = clamp(inp.thr, 0, 1), brkIn = clamp(inp.brk, 0, 1);
      if (this.st === "off") {
        this.we = 0, this.rpm = 0, this.load = 0, this.engage = 0, this.locked = !1, this._free(W2, dt), this._out();
        return;
      }
      if (this.st === "crank") {
        this.we = (235 + 70 * Math.sin(this.t * 38)) * TAU / 60, this.rpm = this.we * 60 / TAU, this.t > 0.8 && (this.st = "catch", this.t = 0), this._free(W2, dt), this._out();
        return;
      }
      if (this.st === "catch") {
        let t = this.t;
        this.we = idleW * (1 + 0.95 * Math.sin(Math.min(1, t / 0.22) * Math.PI / 2) * Math.exp(-Math.max(0, t - 0.22) * 2.6)), this.load = t < 0.22 ? 0.6 : 0, t > 1.1 && (this.st = "run"), this.rpm = this.we * 60 / TAU, this._free(W2, dt), this._out();
        return;
      }
      this.st === "stopping" && (thrIn = 0);
      let vW = this.meanW(W2) * R2;
      this.thr += (thrIn - this.thr) * Math.min(1, dt * (thrIn > this.thr ? 9 : 14) * e.resp);
      let thrE = this.thr, thrSnd = this.thr, rpm = this.we * 60 / TAU;
      this.rpm = rpm;
      let dslip = 0;
      for (let i of drv) dslip = Math.max(dslip, W2[i].kap);
      let vAbs = Math.abs(vW);
      if (this.tcCap = 1e9, aid.tc && !this.rev && this.locked && aid.fmax > 0) {
        let gr2 = Math.abs(this.ratio());
        this.tcCap = aid.fmax * 0.95 * R2 / (gr2 * 0.88) * (1 + e.Ie * gr2 * gr2 / (aid.mass * R2 * R2));
      }
      if (aid.tc && vAbs > 0.3 && !this.rev) {
        let err = dslip - 0.13;
        err > 0 ? this.tcMul -= Math.min(err, 1) * dt * 14 : this.tcMul += dt * 2.5, this.tcMul = clamp(this.tcMul, 0.3, 1);
      } else this.tcMul = 1;
      if (aid.escThr < 1 && (thrE *= aid.escThr), this.hold && e.launch && rpm > e.launchRpm && (thrE = 0, this.cutFrac = 0.75, this.twostep = this.thr > 0.4), e.turbo) {
        let spool = sstep(e.s0, e.s1, rpm), tgt = thrSnd > 0.15 ? e.fiBoost * spool * (0.35 + 0.65 * thrSnd) : e.antilag && this.running ? e.fiBoost * 0.75 * sstep(e.s0 * 0.7, e.s1, rpm) : 0;
        this.boost > 0.35 && this.thrPrev > 0.6 && thrIn < 0.2 && !e.antilag && e.bov !== "none" && this.events.push({ type: "bov", flutter: e.bov === "flutter" }), this.boost += (tgt - this.boost) * Math.min(1, dt * (tgt > this.boost ? (0.5 + 1.5 * rpm / e.redline) / e.lag : 6));
      } else this.boost = steadyBoost(e, rpm) * (thrSnd > 0.05 ? 1 : 0.2);
      this.thrPrev = thrIn;
      let shifting = this.shiftT > 0, thrEng = thrE;
      if (shifting)
        if (this.shiftTo > this.gear)
          e.seq && this.thr > 0.7 ? (thrEng = 0, this.cutFrac = 1) : (thrEng = 0, thrSnd = 0);
        else {
          let tgtW = e.gears[this.shiftTo - 1] * e.fd * this.meanW(W2);
          thrEng = clamp((tgtW - this.we) * 0.02, 0, 1), thrSnd = thrEng;
        }
      let grL = this.ratio(), wmL = this.meanW(W2), launchRpm = Math.max(Math.min(e.redline * 0.55, 4600), e.turbo ? e.s0 * 1.1 : 0), wHold = this.launchW || lerp(idleW * 1.3, launchRpm * TAU / 60, clamp(this.thr, 0, 1)), wTgt = Math.max(Math.abs(grL * wmL), wHold * (e.conv ? 1 : Math.max(0.72, 1 - 0.3 * this.launchT)));
      if (this.launching && !shifting && !this.hold && this.we > wTgt + 15 && (thrEng *= clamp(1 - (this.we - wTgt - 15) / 90, 0, 1)), !shifting && !this.locked && !this.launching && this.engage < 1 && (thrEng *= this.engage * this.engage), this.cutT > 0 && (this.cutT -= dt, thrEng = 0, this.cutFrac = 1), rpm > e.limiterRpm)
        if (e.limiter === "soft") {
          let k = clamp(1 - (rpm - e.limiterRpm) / 150, 0, 1);
          thrEng *= k, this.cutFrac = Math.max(this.cutFrac, 1 - k);
        } else
          this.cutT = clamp(48 / e.cyl * 60 / rpm, 0.025, 0.07), thrEng = 0, this.cutFrac = 1;
      let Te = engTq(e, Math.max(rpm, 1), thrEng, this.boost);
      /* the tuning panel's power, and its boost-by-gear in 1st and 2nd */
      if (this.tuned && Te > 0) {
        let lw = this.rev ? 1 : this.gear === 1 ? TUNE.low1 : this.gear === 2 ? (1 + TUNE.low1) / 2 : 1;
        Te *= TUNE.power, lw < 1 && (Te = Math.min(Te, (e.peak && e.peak.tq || e.tq) * TUNE.power * lw));
      }
      if (Te > 0 && (this.tcMul < 1 || Te > this.tcCap)) {
        let Tr = Te;
        Te = Math.min(Te * clamp(this.tcMul - 3 * Math.max(0, dslip - 0.13), 0.15, 1), this.tcCap);
        let k = Te / Tr;
        k < 0.97 && (this.tcOn = !0, this.cutFrac = Math.max(this.cutFrac, (1 - k) * 0.9));
      }
      this.nosOn = !1, inp.nos && e.nosKw && this.nos > 0 && this.thr > 0.5 && !shifting && !this.hold && this.running && this.cutFrac < 0.5 && (this.nosOn = !0, this.nos = Math.max(0, this.nos - dt / e.nosT), Te += Math.min(e.nosKw * 1e3 / Math.max(this.we, 150), e.tq * 1.6)), this.st === "run" && this.we < idleW && (Te += (idleW - this.we) * e.Ie * 25);
      let TeS = engTq(e, Math.max(rpm, 1), thrSnd, this.boost);
      this.load = this.st === "run" ? clamp(thrSnd * (TeS > 0 ? 1 : 0) * (0.42 + 0.58 * Math.min(1, TeS / e.tq)), 0, 1) : 0, this.Te = Te, shifting && (this.shiftT -= dt, this.shiftT <= 0 && (this.gear = this.shiftTo, this.shiftT = 0));
      let gr = this.ratio(), wm = this.meanW(W2);
      /* Mini: also pull away like an automatic's converter when the wheels are crawling or rolling back against
         the gear (a hill start, or backing down a slope with your foot on the gas): the engine rises toward its
         launch speed and pushes, instead of sitting at idle while the clutch slips */
      !this.locked && !shifting && gr * wm < idleW * 1.3 && (Math.abs(gr * wm) < idleW * 1.3 && this.engage < 0.5 || this.thr > 0.2 && gr * wm < idleW * 0.7) && (this.launching = !0), this.launching ? this.launchT += dt : this.launchT = 0;
      let slowForGear = this.launching && gr * wm < wTgt * 0.98, fzD = 0;
      for (let i of drv) fzD += W2[i].Fz;
      let tracCap = Math.abs(gr) > 0 ? (aid.fmax || fzD * o.mu) * (aid.tc ? 0.9 : 1.3) * R2 / (Math.abs(gr) * 0.88) : 1e9, engT = 1;
      (shifting || this.hold || !this.running || Math.abs(gr * wm) < idleW * 1.1 && this.thr < 0.05) && (engT = 0);
      let er = engT > this.engage ? dt / Math.max(0.02, o.engage * (this.launchW ? 0.25 : this.launching ? 1 : 0.55)) : dt * 12;
      this.engage = clamp(this.engage + clamp(engT - this.engage, -er, er), 0, 1);
      let cap = o.clutch * this.engage, n = drv.length, Fsum = 0, Ksum = 0;
      for (let i of drv)
        Fsum += W2[i].Fx, Ksum += W2[i].Kd;
      let Tdrv = 0;
      if (this.locked && this.engage > 0.98 && !shifting) {
        let Itot = e.Ie * gr * gr + n * Iw, tau = Te * gr * 0.88 - R2 * Fsum, dwm = dt * tau / (Itot + dt * R2 * Ksum), Tcl = Te - e.Ie * gr * dwm / dt;
        if (Math.abs(Tcl) > o.clutch * 1.02) this.locked = !1;
        else {
          for (let i of drv) W2[i].w += dwm;
          this.we = gr * (wm + dwm), Tdrv = Tcl * gr * 0.88;
        }
      } else this.locked = !1;
      if (!this.locked) {
        let slipW = this.we - gr * wm, Tc;
        /* Mini: an automatic's torque converter multiplies the engine's torque while it slips (about 2x at stall) */
        let TR = e.conv && slowForGear && !shifting ? 1 + clamp(1 - gr * wm / Math.max(this.we, 1), 0, 1) : 1;
        if (gr === 0 || cap <= 0) Tc = 0;
        else if (slowForGear && !shifting) Tc = clamp(Te * TR + 30 * e.Ie * (this.we - wTgt), 0, Math.min(cap * TR, tracCap));
        else {
          Tc = cap * clamp(slipW / 10, -1, 1);
          let fl = idleW * 1.15;
          Tc > 0 && this.we < fl * 1.4 && (Tc = Math.min(Tc, Math.max(0, Te + 30 * e.Ie * (this.we - fl))));
        }
        this.we += dt * (Te - Tc / TR) / e.Ie, Tdrv = Tc * gr * 0.88;
        let dwm = dt * (Tdrv - R2 * Fsum) / (n * Iw + dt * R2 * Ksum);
        for (let i of drv) W2[i].w += dwm;
        let s2 = this.we - gr * (wm + dwm);
        gr !== 0 && this.engage > 0.98 && !shifting && (Math.abs(s2) < 5 || Math.sign(s2) !== Math.sign(slipW) && !slowForGear) && (this.locked = !0, this.we = gr * (wm + dwm), this.launchW = 0, this.launching = !1);
      }
      this.we < idleW * 0.6 && this.st !== "stopping" && (this.we = idleW * 0.6), this.st === "stopping" && this.we < idleW * 0.35 && (this.st = "off", this.we = 0), this.Tdrv = Tdrv;
      let D = o.diff;
      if (n === 2) {
        let i = drv[0], j = drv[1], Dd = (W2[i].w - W2[j].w) / 2, m = (W2[i].w + W2[j].w) / 2;
        Dd += dt * (-R2 * (W2[i].Fx - W2[j].Fx) / 2) / (Iw + dt * R2 * (W2[i].Kd + W2[j].Kd) / 2);
        let lk = D.pre + (Tdrv >= 0 ? D.acc : D.dec) * Math.abs(Tdrv);
        Dd -= sgn(Dd) * Math.min(Math.abs(Dd), dt * lk / Iw), W2[i].w = m + Dd, W2[j].w = m - Dd;
      } else {
        let m = (W2[0].w + W2[1].w + W2[2].w + W2[3].w) / 4, Dc = (W2[0].w + W2[1].w - (W2[2].w + W2[3].w)) / 4, Df = (W2[0].w - W2[1].w) / 2, Dr = (W2[2].w - W2[3].w) / 2, Qc = -R2 * (W2[0].Fx + W2[1].Fx - W2[2].Fx - W2[3].Fx) - Tdrv * 0.2;
        /* Mini: the factory truck's brake traction control (AdvanceTrac on the real one). When a wheel spins
           faster than the one across from it, or one axle faster than the other, its brake goes on, so the
           open diffs send the torque to the wheels that can use it: the same as a partial lock. */
        let E = D.etc || 0, eC = 0, eF = 0, eR = 0;
        if (E) {
          let k = (d) => E * sstep(0.5, 2, Math.abs(d) * 2 * R2);
          eC = 1400 * k(Dc), eF = 1700 * k(Df), eR = 1700 * k(Dr), this.etcOn = Math.max(eC, eF, eR) > 500;
        }
        Dc += dt * Qc / (4 * Iw + dt * R2 * (W2[0].Kd + W2[1].Kd + W2[2].Kd + W2[3].Kd)), Dc -= sgn(Dc) * Math.min(Math.abs(Dc), dt * (D.cLock ? 1e6 : 160 + Math.abs(Dc) * 80 + eC) / (4 * Iw)), Df += dt * (-R2 * (W2[0].Fx - W2[1].Fx)) / (2 * Iw + dt * R2 * (W2[0].Kd + W2[1].Kd)), Df -= sgn(Df) * Math.min(Math.abs(Df), dt * (D.fLock ? 1e6 : 20 + 0.1 * Math.abs(Tdrv) + eF) / (2 * Iw)), Dr += dt * (-R2 * (W2[2].Fx - W2[3].Fx)) / (2 * Iw + dt * R2 * (W2[2].Kd + W2[3].Kd));
        let lk = D.rLock ? 1e6 : D.pre + (Tdrv >= 0 ? D.acc : D.dec) * Math.abs(Tdrv) * 0.6 + eR;
        Dr -= sgn(Dr) * Math.min(Math.abs(Dr), dt * lk / (2 * Iw)), W2[0].w = m + Dc + Df, W2[1].w = m + Dc - Df, W2[2].w = m - Dc + Dr, W2[3].w = m - Dc - Dr;
      }
      for (let i = 0; i < 4; i++) drv.includes(i) || (W2[i].w += dt * (-R2 * W2[i].Fx) / (Iw + dt * R2 * W2[i].Kd));
      this.thrSnd = thrSnd, this._out();
    }
    /* engine not driving: every wheel just rolls */
    _free(W2, dt) {
      let R2 = this.o.R, Iw = this.o.Iw;
      for (let i = 0; i < 4; i++) W2[i].w += dt * (-R2 * W2[i].Fx) / (Iw + dt * R2 * W2[i].Kd);
    }
    _sync(W2) {
      if (this.locked) {
        let idleW = this.e.idle * TAU / 60;
        this.we = this.ratio() * this.meanW(W2), this.we < idleW * 0.92 && (this.locked = !1, this.we = Math.max(this.we, idleW * 0.92));
      }
      this.rpm = this.we * 60 / TAU;
    }
    _out() {
      let e = this.e, w = 1 - clamp((this.rpm - e.idle) / (e.idle * 0.9), 0, 1), lope = [0, 0.012, 0.032, 0.065][e.cam | 0] * 1.4 + (e.ch.lope || 0), mod = this.running && lope ? lope * w * (Math.sin(this.lopeT * TAU * 1.55) + 0.6 * Math.sin(this.lopeT * TAU * 0.62 + 1.3)) : 0;
      this.rpmOut = this.st === "off" ? 0 : this.rpm * (1 + mod);
    }
    /* what the synth needs. listener: 0 behind, 1 cabin, 2 trackside; dist/pan/rear for 2 */
    soundParams(listener, speed, geo) {
      let e = this.e;
      return {
        on: this.st !== "off" && this.st !== "crank" ? 1 : 0,
        firing: this.st === "run" || this.st === "catch" ? 1 : 0,
        crank: this.st === "crank" ? 1 : 0,
        crankT: this.st === "crank" ? this.t : 0,
        rpm: this.rpmOut,
        load: this.load,
        cutFrac: this.cutFrac,
        boost: this.boost,
        nos: this.nosOn ? 1 : 0,
        speed,
        gear: this.gear,
        twostep: this.twostep ? 1 : 0,
        antilag: e.antilag && e.turbo && this.thr < 0.2 && this.running ? 1 : 0,
        view: listener,
        dist: geo ? geo.dist : listener === 1 ? 1.4 : 3,
        pan: geo ? geo.pan : 0,
        rear: geo ? geo.rear : listener === 1 ? 0.35 : 1,
        vol: 1,
        jump: geo && geo.jump ? 1 : 0
      };
    }
    takeEvents() {
      let ev = this.events;
      return this.events = [], ev;
    }
  };

  /* the three driving levels. Realistic: ABS and the automatic gearbox, nothing else. Middle: a steering
     helper, stability and traction control. Kids: all of that plus extra grip and a hand that keeps the
     truck on its wheels (the game also flips it back over and caps its speed). */
  var G = 9.81, RHO = 1.2, ASSISTS = {
    real: { id: "real", name: "Realistic", steer: 0, esc: 0, tc: 0, abs: 1, drift: 0, auto: 1, catchSpin: 0 },
    middle: { id: "middle", name: "Middle", steer: 0.75, esc: 0.85, tc: 1, abs: 1, drift: 0, auto: 1, catchSpin: 0 },
    kids: { id: "kids", name: "Kids", steer: 1, esc: 1, tc: 1, abs: 1, drift: 0, auto: 1, catchSpin: 1, plus: { grip: 1.15, upright: !0 } }
  }, SURF_MU = { road: 1, curb: 0.95, shoulder: 0.9, ground: 0.7 }, Vehicle = class {
    constructor(chassis, spec2, world2) {
      let c = chassis;
      this.c = c, this.spec = spec2, this.world = world2, this.m = c.mass || spec2.mass;
      let L = c.body.L, Wd = c.body.W, H = c.body.H, m = this.m;
      this.I = [m * (Wd * Wd + H * H) / 12, m * (L * L + Wd * Wd) / 12 * 1.05, m * (L * L + H * H) / 12];
      let a = c.wb * (1 - c.wf), b = c.wb * c.wf;
      this.a = a, this.b = b;
      let s = c.susp, c0F = m * G * c.wf / 2 / s.kF, c0R = m * G * (1 - c.wf) / 2 / s.kR, hpF = -c.hcg + c.R + s.rest - c0F, hpR = -c.hcg + c.R + s.rest - c0R;
      this.wheels = [[a, hpF, -c.trackF / 2, 1], [a, hpF, c.trackF / 2, 1], [-b, hpR, -c.trackR / 2, 0], [-b, hpR, c.trackR / 2, 0]].map(([x, y, z, f2], i) => ({
        i,
        hp: [x, y, z],
        front: !!f2,
        left: z < 0,
        k: f2 ? s.kF : s.kR,
        cb: f2 ? s.cbF : s.cbR,
        cr: f2 ? s.crF : s.crR,
        w: 0,
        ang: 0,
        steer: 0,
        comp: f2 ? c0F : c0R,
        len: s.rest,
        Fz: 0,
        contact: !1,
        cp: [0, 0, 0],
        n: [0, 1, 0],
        hpW: [0, 0, 0],
        f: [1, 0, 0],
        r: [0, 0, 1],
        kap: 0,
        tanA: 0,
        Fx: 0,
        Fy: 0,
        Kd: 0,
        sg: 0,
        slipV: 0,
        vl: 0,
        surf: "road",
        hint: -1,
        Tb: 0,
        disc: 0,
        temp: 0.45,
        escBrake: 0
      })), this.tyre = Object.assign({}, TYRE_DEFAULT, c.tyre, { fz0: m * G / 4 }), this.pt = new Powertrain(spec2, { drive: spec2.drv || "RWD", clutch: spec2.tq * (2.2 + spec2.fiBoost * 0.9), engage: 0.22, diff: c.diff, Iw: c.Iw, R: c.R, mu: this.tyre.mu });
      let hx = L / 2 - 0.06, hz = Wd / 2 - 0.02, yb = -c.hcg + 0.16, ym = -c.hcg + 0.55, yt = -c.hcg + H - 0.04;
      this.hull = [];
      for (let x of [hx, hx * 0.45, -hx * 0.45, -hx]) for (let z of [-hz, hz]) this.hull.push([x, yb, z * (Math.abs(x) > hx * 0.9 ? 0.9 : 1)], [x, ym, z]);
      for (let x of [hx * 0.45, -hx * 0.6]) for (let z of [-hz * 0.78, hz * 0.78]) this.hull.push([x, yt, z]);
      this.hull.push([hx + 0.04, ym - 0.05, 0], [-hx - 0.04, ym, 0]), this.p = [0, 0, 0], this.q = [0, 0, 0, 1], this.v = [0, 0, 0], this.w = [0, 0, 0], this.steer = 0, this.hint = -1, this.loc = null, this.air = !0, this.airT = 0, this.speed = 0, this.vf = 0, this.beta = 0, this.aid = ASSISTS.real, this.wet = 0, this.drift = { on: !1, dir: 0, t: 0, low: 0 }, this.ev = { wall: 0, land: 0, scrape: 0, ground: 0 }, this.rev = !1, this.revT = 0, this.escOn = !1, this.absOn = !1, this.assistTorque = 0, this.plus = null, this.TY = { fx: 0, fy: 0, dk: 0, sg: 0 }, this.acc = [0, 0, 0], this.accB = [0, 0, 0], this.setAssists("real");
    }
    /* put the car at rest on the track at (s, d), facing along it */
    placeOnTrack(T2, s, d = 0) {
      let fr = T2.frame(s), p = T2.pos(s, d);
      this.q = qlook(fr.f, fr.u), this.p = madd(p, fr.u, this.c.hcg), this.v = [0, 0, 0], this.w = [0, 0, 0], this.hint = -1;
      for (let wh of this.wheels)
        wh.w = 0, wh.hint = -1;
      this.pt.gear = 1, this.pt.shiftT = 0, this.pt.engage = 0, this.pt.locked = !1, this.rev = !1, this.pt.rev = !1, this.drift.on = !1;
    }
    place(p, yaw) {
      this.q = qaxis([0, 1, 0], yaw), this.p = [p[0], p[1] + this.c.hcg, p[2]], this.v = [0, 0, 0], this.w = [0, 0, 0];
      for (let wh of this.wheels)
        wh.w = 0;
    }
    _smu(s, n) {
      let b = this.surfMu ? this.surfMu[s] ?? 0.8 : SURF_MU[s] || 1;
      return this.tuned ? b * tuneGrip(s, n) : b;
    }
    /* the developer panel's sliding-grip knob, applied to this truck's own tyre */
    applySlide(base) {
      this.tyre.slide = Math.min(1, (base ?? this.c.tyre.slide) * (this.tuned ? TUNE.slideDev : 1));
    }
    setAssists(id) {
      this.aid = ASSISTS[id] || ASSISTS.real, this.pt.auto = !!this.aid.auto, this.plus = this.aid.plus || null;
    }
    /* invert the world-space inertia: I_w^-1 * x */
    invI(M, x) {
      let b = mtvec(M, x);
      return mvec(M, [b[0] / this.I[0], b[1] / this.I[1], b[2] / this.I[2]]);
    }
    /* inp: {steer -1..1 (+right), thr 0..1, brk 0..1, hb 0..1, nos bool} */
    step(dt, inp) {
      let c = this.c, s = c.susp, m = this.m, R2 = c.R, pt = this.pt, aid = this.aid, W2 = this.wheels, M = qmat(this.q), U = mcol(M, 1), p = this.p, v = this.v, w = this.w, vb = mtvec(M, v), wb = mtvec(M, w);
      this.speed = len(v), this.vf = vb[0], this.beta = Math.atan2(vb[2], Math.max(Math.abs(vb[0]), 0.5)), this.loc = this.world.locate(p, this.hint), this.loc && (this.hint = this.loc.i);
      let thr = clamp(inp.thr || 0, 0, 1), brk = clamp(inp.brk || 0, 0, 1), hb = clamp(inp.hb || 0, 0, 1);
      if (!this.rev && Math.abs(vb[0]) < 0.6 && brk > 0.5 && thr < 0.05 ? (this.revT += dt, this.revT > 0.5 && pt.running && (this.rev = !0, pt.rev = !0, pt.gear = 1, pt.shiftT = 0)) : this.rev || (this.revT = 0), this.rev)
        if (thr > 0.1 && vb[0] > -0.8)
          this.rev = !1, pt.rev = !1, this.revT = 0;
        else {
          let t = thr;
          thr = brk, brk = t;
        }
      !this.rev && Math.abs(vb[0]) < 0.5 && brk > 0.5 && thr > 0.3 && pt.running ? pt.hold = !0 : pt.hold && (pt.hold = !1, thr > 0.3 && (pt.launchW = pt.we, pt.launching = !0)), this.thrIn = thr, this.brkIn = brk, this.steer = this._steer(dt, inp.steer || 0, vb, wb);
      let down = [-U[0], -U[1], -U[2]], nContact = 0;
      for (let wh of W2) {
        let hpW = add(p, mvec(M, wh.hp));
        wh.hpW = hpW;
        let hit = this.world.wheelContact ? this.world.wheelContact(hpW, down, wh.front && this.steer ? mvec(M, [Math.cos(this.steer), 0, Math.sin(this.steer)]) : mcol(M, 0), R2, s.rest + R2 + 0.3) : this.world.raycast(hpW, down, s.rest + R2 + 0.3, wh.hint), comp = -1;
        if (hit && (wh.hint = hit.i, comp = s.rest - (hit.t - R2)), comp <= 0) {
          wh.contact = !1, wh.Fz = 0, wh.comp = 0, wh.len = hit ? Math.min(s.rest, hit.t - R2) : s.rest;
          continue;
        }
        let rate = clamp((comp - wh.comp) / dt, -4, 4), sr = wh.contact ? rate : clamp(-dot2(add(v, cross2(w, sub2(hpW, p))), U), 0, 8);
        /* for the sound: the sharpest compression since the last frame, and whether it hit the bump stops */
        wh.cv = Math.max(wh.cv || 0, sr), comp > s.travel && (wh.bot = Math.max(wh.bot || 0, sr));
        wh.comp = comp, wh.len = s.rest - comp, wh.contact = !0, nContact++;
        let Fs = wh.k * comp + (rate > 0 ? wh.cb : wh.cr) * rate;
        comp > s.travel && (Fs += (comp - s.travel) * wh.k * 14 + Math.max(0, rate) * wh.cb * 2), wh.Fz = Math.max(0, Fs), wh.cp = hit.p, wh.n = hit.n, wh.surf = hit.surf, wh.off = hit.off || 0;
      }
      for (let [l, r, k] of [[0, 1, s.arbF], [2, 3, s.arbR]]) {
        let d = (W2[l].contact ? W2[l].comp : 0) - (W2[r].contact ? W2[r].comp : 0), f2 = k * d;
        W2[l].contact && (W2[l].Fz = Math.max(0, W2[l].Fz + f2)), W2[r].contact && (W2[r].Fz = Math.max(0, W2[r].Fz - f2));
      }
      let wasAir = this.air;
      this.air = nContact === 0, this.air ? this.airT += dt : (wasAir && this.airT > 0.15 && (this.ev.land = Math.max(this.ev.land, -vb[1])), this.airT = 0);
      let P = this.plus, TY = this.TY, wetMu = lerp(1, P ? 0.93 : 0.84, this.wet) * (P ? P.grip : 1);
      for (let wh of W2) {
        if (!wh.contact) {
          wh.Fx = wh.Fy = wh.Kd = wh.kap = wh.sg = wh.slipV = wh.rr = wh.vd = 0, wh.tanA = 0;
          continue;
        }
        let st = wh.front ? this.steer : 0, fw = mvec(M, [Math.cos(st), 0, Math.sin(st)]), n = wh.n, f2 = norm2(sub2(fw, scale(n, dot2(fw, n)))), r = norm2(cross2(f2, n)), vc = add(v, cross2(w, sub2(wh.cp, p))), vl = dot2(vc, f2), vt = dot2(vc, r), vn = Math.max(Math.abs(vl), 2.5), kap = (wh.w * R2 - vl) / vn, tanA = vt / vn, tg = wh.temp < 0.62 ? 0.92 + 0.08 * sstep(0.15, 0.62, wh.temp) : wh.temp < 0.85 ? 1.02 : 1.02 - 0.15 * sstep(0.85, 1.15, wh.temp);
        tyreForce(this.tyre, wh.Fz, kap, tanA, this._smu(wh.surf, wh.n) * wetMu * tg * (wh.front || !this.tuned ? 1 : TUNE.gRear), TY), wh.Fx = TY.fx, wh.rr = (this.surfRR ? this.surfRR[wh.surf] ?? 0.015 : 0.012) * wh.Fz, wh.vd = (this.surfDrag ? this.surfDrag[wh.surf] || 0 : 0) * wh.Fz * vl, wh.Fy = TY.fy, wh.Kd = TY.dk * R2 / vn, wh.kap = kap, wh.tanA = tanA, wh.sg = TY.sg, wh.f = f2, wh.r = r, wh.vl = vl, wh.slipV = Math.hypot(wh.w * R2 - vl, vt), wh.temp += dt * (wh.slipV * wh.Fz / (m * G) * 0.02 - (wh.temp - 0.42) * (0.015 + this.speed * 8e-4)), wh.temp = clamp(wh.temp, 0.2, 1.25);
      }
      let escThr = this._stability(dt, inp, vb, wb, thr), fmax = 0;
      for (let i of pt.drv) {
        let wh = W2[i];
        if (wh.contact) {
          let lf = Math.max(0.6, 1 - this.tyre.loadSens * (wh.Fz / this.tyre.fz0 - 1));
          fmax += wh.Fz * this.tyre.mu * lf * wetMu * this._smu(wh.surf, wh.n);
        }
      }
      /* line lock: the fronts are held on the brakes and the drive goes to the rear axle alone */
      pt.drvAll || (pt.drvAll = pt.drv), pt.drv = inp.lock && pt.drvAll.length === 4 ? [2, 3] : pt.drvAll, pt.step(dt, { thr, brk, nos: !!inp.nos }, W2, { tc: aid.tc && !this.drift.on && !inp.lock, escThr: inp.lock ? 1 : escThr, fmax, mass: m }), pt.auto && pt.autoShift(brk, this.air, this.drift.on), this.absOn = !1;
      let hold = this.speed < 0.4 && thr < 0.05 && !this.rev && pt.running;
      for (let wh of W2) {
        let Tb = brk * c.brake * (wh.front ? c.bias : 1 - c.bias) / 2;
        inp.lock && wh.front && (Tb = Math.max(Tb, c.brake * 0.75));
        /* ABS; on the rear wheels it lets them slip far less (the job brake proportioning does on the real
           truck), so they keep their side grip and the tail stays behind you when you brake into a turn */
        let abT = wh.front ? 0.1 : 0.03;
        if (aid.abs && brk > 0.1 && this.speed > 2.5 && wh.kap < -abT) {
          let k = clamp(1 - (-wh.kap - abT) * 7, 0.2, 1);
          Tb *= k, k < 0.95 && (this.absOn = !0);
        }
        !wh.front && hb > 0 && (Tb += c.hbTorque * hb), Tb += wh.escBrake + (wh.rr || 0) * R2, (hold || pt.hold) && (Tb += 1500);
        /* Mini: the brake (and rolling resistance) goes through the same implicit tyre term as the drive, so at a
           standstill on soft ground a wheel's rolling drag can no longer out-pull the engine every substep */
        let dw = dt * Tb / (pt.effInertia(wh.i, c.Iw) + dt * R2 * (wh.Kd || 0));
        Math.abs(wh.w) <= dw ? wh.w = 0 : wh.w -= sgn(wh.w) * dw, wh.Tb = Tb, wh.disc = clamp(wh.disc + dt * (Tb * Math.abs(wh.w) / 9e4 - wh.disc * (0.08 + this.speed * 4e-3)), 0, 1.2);
      }
      hb > 0.5 && !pt.drv.includes(0) && (pt.engage = 0, pt.locked = !1), pt._sync(W2);
      let force = [0, -m * G * (this.tuned && this.air ? TUNE.airG : 1), 0], torque = [0, 0, 0], apply = (F, at) => {
        force[0] += F[0], force[1] += F[1], force[2] += F[2];
        let t = cross2(sub2(at, p), F);
        torque[0] += t[0], torque[1] += t[1], torque[2] += t[2];
      };
      for (let wh of W2)
        if (wh.contact) {
          apply(scale(U, wh.Fz), wh.hpW), apply(add(scale(wh.f, wh.Fx - (wh.vd || 0)), scale(wh.r, wh.Fy)), madd(wh.cp, wh.n, c.rcH));
          /* a tyre against a ledge face: the face pushes back as well as up */
          if (wh.off) {
            let nu = dot2(wh.n, U), k = wh.Fz / Math.max(0.5, nu) * 0.6;
            apply([(wh.n[0] - U[0] * nu) * k, (wh.n[1] - U[1] * nu) * k, (wh.n[2] - U[2] * nu) * k], wh.cp);
          }
        }
      let sp = this.speed, dr = 0.5 * RHO * c.cdA * sp;
      apply([-v[0] * dr, -v[1] * dr, -v[2] * dr], p);
      let q2 = 0.5 * RHO * vb[0] * vb[0];
      if (apply(scale(U, -q2 * c.clF), add(p, mvec(M, [this.a, 0, 0]))), apply(scale(U, -q2 * c.clR), add(p, mvec(M, [-this.b, 0, 0]))), this.assistTorque && (torque[0] += U[0] * this.assistTorque, torque[1] += U[1] * this.assistTorque, torque[2] += U[2] * this.assistTorque), P && P.upright) {
        let F = mcol(M, 0), Rt = mcol(M, 2), ax = cross2(U, [0, 1, 0]), roll = dot2(ax, F), pitch = dot2(ax, Rt), wr = dot2(w, F), wp = dot2(w, Rt), ex = Math.sign(roll) * Math.max(0, Math.abs(roll) - 0.2), tr = (ex * 28 - wr * (Math.abs(roll) > 0.2 ? 5 : 0)) * this.I[0], tp = this.air ? (pitch * 10 - wp * 3) * this.I[2] : 0;
        for (let k = 0; k < 3; k++) torque[k] += F[k] * tr + Rt[k] * tp;
      }
      for (let k = 0; k < 3; k++)
        this.acc[k] = force[k] / m, v[k] += this.acc[k] * dt;
      let tb = mtvec(M, torque), I = this.I, Iwb = [I[0] * wb[0], I[1] * wb[1], I[2] * wb[2]], gy = cross2(wb, Iwb);
      for (let k = 0; k < 3; k++) wb[k] += dt * (tb[k] - gy[k]) / I[k];
      this.w = mvec(M, wb);
      for (let k = 0; k < 3; k++) p[k] += v[k] * dt;
      this.q = qint(this.q, this.w, dt), this.accB = mtvec(M, this.acc);
      for (let wh of W2) wh.ang += wh.w * dt;
      if (this._collide(dt), hold && this.speed < 0.2)
        for (let k = 0; k < 3; k++)
          this.v[k] *= 1 - Math.min(1, dt * 6), this.w[k] *= 1 - Math.min(1, dt * 6);
    }
    /* the steering assist: aim the front tyres at their peak slip angle relative to how the front axle is moving */
    _steer(dt, sIn, vb, wb) {
      /* Mini: full steering narrows with speed to about what the front tyres can use (just past their peak
         slip angle, plus what the turn itself needs), as a driver's hands would, with full lock at parking
         speeds for donuts; steering into a slide may go further, as far as the slide itself */
      let c = this.c, aid = this.aid, lock = c.lock, vx = vb[0], v = Math.abs(vx), lim = Math.min(lock, this.tyre.aPk * 1.6 * (this.tuned ? TUNE.steerLim : 1) + c.wb * 9 / Math.max(v * v, 1) + (sIn * this.beta > 0 ? Math.abs(this.beta) : 0)), tgt = sIn * lim;
      if (aid.steer > 0 && vx > 1.5) {
        let vzF = vb[2] - wb[1] * this.a, thF = Math.atan2(vzF, Math.max(vx, 0.5)), aPk = this.tyre.aPk * 0.92, assist = thF + sIn * aPk * (this.drift.on ? 1.35 : 1);
        tgt = lerp(tgt, assist, aid.steer * sstep(1.5, 8, vx));
      }
      tgt = clamp(tgt, -lock, lock);
      let rate = (aid.steer > 0 ? 5.5 : 4.2) * (this.tuned ? TUNE.steerSpd : 1);
      return this.steer + clamp(tgt - this.steer, -rate * dt, rate * dt);
    }
    /* stability control, the drift helper and the spin catcher. Returns a throttle multiplier. */
    _stability(dt, inp, vb, wb, thr) {
      let aid = this.aid, W2 = this.wheels, v = vb[0], beta = this.beta, r = wb[1], sIn = inp.steer || 0, mu = this.tyre.mu;
      for (let wh of W2) wh.escBrake = 0;
      this.escOn = !1, this.assistTorque = 0;
      let mult = 1, Iyaw = this.I[1], D = this.drift;
      if (aid.drift ? (!D.on && v > 9 && (inp.hb > 0.5 && Math.abs(sIn) > 0.15 || !this.plus && Math.abs(beta) > 0.22 && thr > 0.6 && Math.abs(sIn) > 0.3) && (D.on = !0, D.dir = -sgn(sIn) || sgn(beta), D.t = 0, D.low = 0, D.bPrev = void 0, D.bd = 0), D.on && (D.t += dt, Math.abs(beta) < 0.1 || sIn * D.dir > 0.35 ? D.low += dt : D.low = 0, (D.low > 0.35 || v < 6 || this.air && this.airT > 0.5) && (D.on = !1))) : D.on = !1, D.on) {
        let into = Math.max(0, -sIn * D.dir), bT = (0.3 + 0.3 * into) * D.dir, err = bT - beta, raw = D.bPrev === void 0 ? 0 : (beta - D.bPrev) / dt;
        return D.bPrev = beta, D.bd = (D.bd || 0) + (raw - (D.bd || 0)) * 0.25, this.assistTorque = clamp((6 * err - 2.5 * D.bd) * Iyaw, -5 * Iyaw, 5 * Iyaw) * Math.min(1, 0.3 + D.t * 3), clamp(0.55 + 2.5 * err * D.dir, 0.1, 1);
      }
      if (v < 4) return 1;
      if (aid.esc > 0) {
        let rMax = Math.min(mu * G / Math.max(v, 1), v * Math.tan(this.c.lock) / this.c.wb), rRef = -sIn * rMax, lim = 0.07 + 0.22 * (1 - aid.esc), over = Math.abs(beta) - lim, yawErr = r - rRef;
        if (over > 0 && Math.sign(r) === Math.sign(beta) && Math.abs(r) > 0.05) {
          let k = clamp(over * 6, 0, 1) * aid.esc, front = r > 0 ? W2[1] : W2[0];
          front.escBrake = 2400 * k, this.escOn = !0, mult = Math.min(mult, clamp(1 - over * 4 * aid.esc, 0.15, 1));
        } else if (Math.abs(yawErr) > 0.15 && Math.abs(r) > Math.abs(rRef) + 0.15 && Math.sign(r) === Math.sign(rRef || r)) {
          let k = clamp((Math.abs(r) - Math.abs(rRef) - 0.15) * 2, 0, 1) * aid.esc, front = r > 0 ? W2[1] : W2[0];
          front.escBrake = 1500 * k, this.escOn = k > 0.05;
        }
      }
      if (aid.catchSpin && Math.abs(beta) > 0.6 && v > 6) {
        let k = clamp((Math.abs(beta) - 0.6) * 2.5, 0, 1);
        this.assistTorque = -r * Iyaw * 6 * k;
      }
      if (this.plus && Math.abs(beta) > 0.3 && v > 5 && Math.sign(r) === Math.sign(beta)) {
        let k = clamp((Math.abs(beta) - 0.3) * 3, 0, 1);
        this.assistTorque = -r * Iyaw * 7 * k, mult = Math.min(mult, 1 - 0.5 * k);
      }
      return mult;
    }
    /* barrier and ground contacts on the hull: impulses with restitution and friction */
    _collide(dt) {
      let M = qmat(this.q), p = this.p, world2 = this.world, push = [0, 0, 0], pushN = 0;
      for (let hp of this.hull) {
        let P = add(p, mvec(M, hp)), loc = world2.locate(P, this.hint), wc = world2.wall(P, loc);
        wc && wc.pen > 0 && (this._impulse(M, P, wc.n, wc.pen, this.plus ? 0.04 : 0.18, this.plus ? 0.05 : 0.28, "wall"), push = madd(push, wc.n, wc.pen), pushN++);
        let g = world2.ground(P[0], P[2], loc ? loc.i : this.hint), pen = (g.y - P[1]) * g.n[1];
        pen > 0 && (this._impulse(M, P, g.n, pen, 0.05, 0.55, "ground"), this.ev.gsurf = g.surf, push = madd(push, g.n, pen), pushN++);
      }
      if (pushN) for (let k = 0; k < 3; k++) this.p[k] += push[k] / pushN;
    }
    _impulse(M, P, n, pen, e, mu, kind) {
      let r = sub2(P, this.p), vr = add(this.v, cross2(this.w, r)), vn = dot2(vr, n);
      if (vn >= 0) return;
      let k = 1 / this.m + dot2(n, cross2(this.invI(M, cross2(r, n)), r)), j = -(1 + e) * vn / k, Jv = scale(n, j), vt = sub2(vr, scale(n, vn)), vtl = len(vt);
      if (vtl > 1e-4) {
        let t = scale(vt, 1 / vtl), kt = 1 / this.m + dot2(t, cross2(this.invI(M, cross2(r, t)), r)), jt = Math.min(mu * j, vtl / kt);
        Jv = madd(Jv, t, -jt);
      }
      for (let q = 0; q < 3; q++) this.v[q] += Jv[q] / this.m;
      let dw = this.invI(M, cross2(r, Jv));
      for (let q = 0; q < 3; q++) this.w[q] += dw[q];
      kind === "wall" ? (this.ev.wall = Math.max(this.ev.wall, -vn), vtl > 2 && (this.ev.scrape = Math.max(this.ev.scrape, vtl))) : (this.ev.ground = Math.max(this.ev.ground, -vn), vtl > 0.5 && (this.ev.gscr = Math.max(this.ev.gscr || 0, vtl)));
    }
    takeEvents() {
      let e = this.ev;
      return this.ev = { wall: 0, land: 0, scrape: 0, ground: 0, gscr: 0, gsurf: null }, e;
    }
  };


/* =====================================================================================
   EACH TRUCK ON ITS WHEELS. Dirt Sleeper's chassis rules (springs from ride height, shocks,
   sway bars, brakes scaled to the tyres, grip and rolling resistance per tread and surface)
   applied to the four Mini builds, with the body's real dimensions from the model.
   ===================================================================================== */
const HCG0=.74;                 /* centre of gravity above the ground, factory truck */
/* Mini: the weight sits 55/45 front to rear like the real truck's (it was 50/50), and most of the roll
   stiffness is at the front. With tyres that lose some grip as they're loaded (load sensitivity .3), that
   makes the truck push wide at the limit the way a real SUV does, instead of swapping ends. */
const WF=.55,ARB_F=36e3,ARB_R=6e3;
/* grip per tread and surface, rolling resistance, and how much more the bog drags each tread (Dirt Sleeper) */
/* allseason: the factory P245/65R17s, which get an AWD truck down a muddy country lane every spring.
   perf: the sleeper's street-legal performance tyres, a touch better on hard ground, much the same off it. */
/* gravel: the county roads (loose stone over a hard base); asphalt: the road course; ruts: the home lane's wet mud */
const TREAD_MU={
  allseason:{concrete:1,strip:.84,dirt:.77,trail:.75,grass:.68,rock:.82,mud:.47,water:.47,gravel:.72,asphalt:1.02,ruts:.52},
  perf:{concrete:1.08,strip:.92,dirt:.75,trail:.72,grass:.64,rock:.8,mud:.43,water:.45,gravel:.7,asphalt:1.12,ruts:.47},
  mud:{concrete:.9,strip:.88,dirt:.86,trail:.86,grass:.8,rock:.9,mud:.68,water:.56,gravel:.8,asphalt:.92,ruts:.7},
  slick:{concrete:1.25,strip:.95,dirt:.62,trail:.52,grass:.45,rock:.62,mud:.24,water:.3,gravel:.5,asphalt:1.32,ruts:.27}};
const SURF_RR={concrete:.012,strip:.02,dirt:.024,trail:.028,grass:.034,rock:.022,mud:.14,water:.09,gravel:.026,asphalt:.011,ruts:.065},TREAD_RR_MUD={allseason:1,perf:1.05,mud:.8,slick:1.35};
/* the running gear per build: tyre, ride, shocks, lockers, low range */
const RUNNING={
  stock:  {tyre:{tread:'allseason',kPk:.12,aPk:.15,slide:.82,slideW:.65,If:1},susp:'stock',  shocks:'stock', lockers:0,low:false,wm:1,   etc:1},
  sleeper:{tyre:{tread:'perf',kPk:.11,aPk:.13,slide:.8,slideW:.6,If:1.05},     susp:'lowered',shocks:'stock', lockers:0,low:false,wm:1.05,etc:1},
  crawler:{tyre:{tread:'mud',kPk:.15,aPk:.18,slide:.85,slideW:.8,If:1.1},   susp:'lift6',  shocks:'bypass',lockers:2,low:true, wm:1.15},
  race:   {tyre:{tread:'slick',kPk:.1,aPk:.12,slide:.75,slideW:.5,If:.9},   susp:'lowered',shocks:'bypass',lockers:0,low:false,wm:.95}};
const SUSP={lowered:{k:1.3,arb:1.4,droop:.06,bump:.06},stock:{k:1,arb:1,droop:.1,bump:.09},lift6:{k:.78,arb:.5,droop:.18,bump:.18}};
/* where the centre of gravity sits in the model's coordinates (x along the truck, y up from the ground) */
function cgOf(b){const B=SUVB,dy=b.look.lift+(b.look.tyre.R-B.R0),xr=B.L/2-(B.ovF+B.wb);return [xr+B.wb*WF,HCG0+dy];}
function buildChassis(b){
  const T=TUNE,rn=RUNNING[b.id]||RUNNING.stock,ty=rn.tyre,eg=ENGINE_OF[b.id]||ENGINE_OF.stock,sp=SUSP[rn.susp],R=b.look.tyre.R;
  const m=eg.mass*T.mass,hcg=cgOf(b)[1],kMul=sp.k*T.spring,arbMul=sp.arb*T.arb,kF=44e3*kMul*m/2150,kR=48e3*kMul*m/2150;
  const c0=Math.max(m*9.81*.5/2/kF,m*9.81*.5/2/kR),damp=(rn.shocks==='bypass'?1.35:1)*T.damp,cs=Math.sqrt(kF*m/4),rr=Object.assign({},SURF_RR);
  rr.mud*=TREAD_RR_MUD[ty.tread];rr.water*=TREAD_RR_MUD[ty.tread];rr.ruts*=TREAD_RR_MUD[ty.tread];
  return {name:b.id,mass:m,wb:SUVB.wb,wf:WF,hcg,trackF:b.look.track,trackR:b.look.track,R,Iw:1.6*Math.pow(R/.375,4)*ty.If*rn.wm,rcH:T.roll,
    susp:{rest:c0+sp.droop,travel:c0+sp.bump,kF,kR,cbF:cs*.55*damp,crF:cs*.85*damp,cbR:cs*.55*damp,crR:cs*.85*damp,arbF:ARB_F*arbMul,arbR:ARB_R*arbMul},
    body:{L:4.92,W:1.9,H:1.86},
    tyre:{mu:1.08,kPk:ty.kPk,aPk:ty.aPk,slide:Math.min(1,ty.slide*T.slide),slideW:ty.slideW,loadSens:.3},
    brake:7200*R/.375*m/2150*T.brake,bias:.62,hbTorque:3200*R/.375,lock:.6*T.lock,cdA:eg.cdA,clF:.03,clR:.05,
    diff:{pre:40,acc:.3,dec:.15,rLock:false,fLock:false,cLock:false,etc:rn.etc||0,can:{r:rn.lockers>=1,f:rn.lockers>=2,low:rn.low}},
    surfMu:TREAD_MU[ty.tread],surfRR:rr,surfDrag:{mud:.06*TREAD_RR_MUD[ty.tread]**1.5,water:.018*TREAD_RR_MUD[ty.tread],ruts:.012*TREAD_RR_MUD[ty.tread]},tread:ty.tread};
}
/* a build on four wheels: the Vehicle with this truck's tyres, surfaces, lockers, low range and a hull the shape of its body */
function makeTruck(i,world){
  const b=BUILDS[i],ch=buildChassis(b),e=engineSpec(b),v=new Vehicle(ch,e,world),[xc,hc]=cgOf(b),dy=b.look.lift+(b.look.tyre.R-SUVB.R0);
  v.surfMu=ch.surfMu;v.surfRR=ch.surfRR;v.surfDrag=ch.surfDrag;v.build=b;v.bi=i;v.cg=[xc,hc];v.hull=[];
  const P=(x,y,z)=>v.hull.push([x-xc,y+dy-hc,z]);
  for(const x of [2.40,1.05,-.15,-1.35,-2.42])for(const z of [-.84,.84])P(x,Math.abs(x)>2.3?.46:.33,z);
  for(const x of [2.3,.45,-2.3])for(const z of [-.92,.92])P(x,.85,z);
  const roofY=b.look.roof==='rack'?2.02:1.82;for(const x of [.25,-1.95])for(const z of [-.7,.7])P(x,roofY,z);
  P(2.48,.62,0);P(-2.5,.62,0);P(0,.3,0);
  v.low=false;v.locked=false;v.pt.lo=1;v.tuned=v.pt.tuned=true;
  return v;
}
function setLow(v,on){const c=v.c.diff.can;if(!c.low)return false;v.low=on;v.pt.lo=on?2.64:1;v.c.diff.cLock=on;return true;}
function setLockers(v,on){const c=v.c.diff.can;if(!c.r)return false;v.locked=on;v.c.diff.rLock=on&&c.r;v.c.diff.fLock=on&&c.f;return true;}
/* a flat, endless test ground */
class FlatWorld{
  constructor(surf='dirt'){this.surf=surf;}
  locate(){return {i:0,s:0,d:0};}
  ground(){return {y:0,n:[0,1,0],surf:this.surf,i:0};}
  raycast(o,d,maxT){if(d[1]>-1e-4)return null;const t=-o[1]/d[1];return t<0||t>maxT?null:{t,p:[o[0]+d[0]*t,0,o[2]+d[2]*t],n:[0,1,0],surf:this.surf,i:0};}
  wall(){return null;}
}
  var RanchWorld = class {
    constructor(W) {
      this.W = W;
    }
    locate(p) {
      return { i: 0, s: 0, d: 0 };
    }
    ground(x, z) {
      let g = this.W.groundAt(x, z);
      return { y: g.y, n: g.n, surf: g.surf, i: 0 };
    }
    raycast(o, dir, maxT) {
      let t = 0, g = null;
      for (let k = 0; k < 5; k++) {
        let x = o[0] + dir[0] * t, z = o[2] + dir[2] * t;
        g = this.W.groundAt(x, z);
        let den = dir[0] * g.n[0] + dir[1] * g.n[1] + dir[2] * g.n[2];
        if (den > -1e-4) return null;
        let nt = ((x - o[0]) * g.n[0] + (g.y - o[1]) * g.n[1] + (z - o[2]) * g.n[2]) / den;
        if (Math.abs(nt - t) < 1e-4) {
          t = nt;
          break;
        }
        t = nt;
      }
      return t < 0 || t > maxT ? null : { t, p: [o[0] + dir[0] * t, o[1] + dir[1] * t, o[2] + dir[2] * t], n: g.n, surf: g.surf, i: 0 };
    }
    /* where a tyre (a circle of radius R rolling along fwd) first touches the ground: rays down at seven
       points across its footprint, each lifted by the circle's curve there. A ledge ahead is found before the
       hub reaches it, and the contact normal leans back off its face. */
    wheelContact(o, down, fwd, R, maxT) {
      let best = this.raycast(o, down, maxT);
      best && (best.off = 0);
      let fd = fwd[0] * down[0] + fwd[1] * down[1] + fwd[2] * down[2], f = [fwd[0] - down[0] * fd, fwd[1] - down[1] * fd, fwd[2] - down[2] * fd], fl = Math.hypot(f[0], f[1], f[2]) || 1;
      f = [f[0] / fl, f[1] / fl, f[2] / fl];
      for (let k of [-0.75, -0.5, -0.25, 0.25, 0.5, 0.75]) {
        let dx = k * R, h = this.raycast([o[0] + f[0] * dx, o[1] + f[1] * dx, o[2] + f[2] * dx], down, maxT);
        if (!h) continue;
        let eff = h.t + R - Math.sqrt(R * R - dx * dx);
        if (!best || eff < best.t - 2e-3) {
          let cen = [o[0] + down[0] * (eff - R), o[1] + down[1] * (eff - R), o[2] + down[2] * (eff - R)], n = [cen[0] - h.p[0], cen[1] - h.p[1], cen[2] - h.p[2]], nl = Math.hypot(n[0], n[1], n[2]) || 1;
          best = { t: eff, p: h.p, n: [n[0] / nl, n[1] / nl, n[2] / nl], surf: h.surf, i: 0, off: dx };
        }
      }
      return best && best.t <= maxT ? best : null;
    }
    /* trees, posts, walls and bales: push the hull back out */
    wall(P) {
      let best = null, bound = 790;
      if (Math.abs(P[0]) > bound || Math.abs(P[2]) > bound) {
        let ax = Math.abs(P[0]) - bound, az = Math.abs(P[2]) - bound;
        return ax > az ? { pen: ax, n: [-Math.sign(P[0]), 0, 0] } : { pen: az, n: [0, 0, -Math.sign(P[2])] };
      }
      for (let c of this.W.colliders.near(P[0], P[2])) {
        if (P[1] > c.top + 0.2) continue;
        if (c.t === "c") {
          let dx = P[0] - c.x, dz = P[2] - c.z, d = Math.hypot(dx, dz);
          if (d < c.r) {
            let pen = c.r - d;
            (!best || pen > best.pen) && (best = { pen, n: d > 1e-4 ? [dx / d, 0, dz / d] : [1, 0, 0] });
          }
        } else if (P[0] > c.x0 && P[0] < c.x1 && P[2] > c.z0 && P[2] < c.z1) {
          let o = [[P[0] - c.x0, [-1, 0, 0]], [c.x1 - P[0], [1, 0, 0]], [P[2] - c.z0, [0, 0, -1]], [c.z1 - P[2], [0, 0, 1]]].sort((a, b) => a[0] - b[0])[0];
          (!best || o[0] > best.pen) && (best = { pen: o[0], n: o[1] });
        }
      }
      return best;
    }
  };
