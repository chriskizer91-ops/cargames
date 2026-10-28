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
    ["gAll", "grip", "Every surface", 0.5, 1.6, 0.01, 1, "x", "live", "Multiplies all of the ones below."],
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

