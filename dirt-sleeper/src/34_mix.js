  // ===== audio/mix.js =====
  /* One mix for the whole game: four buses (engine, ground, world, UI), and for every sound its level,
     which version of it plays, and a few character knobs. The sound board edits this object and turns it
     into a short code; the game reads the same code. Levels are in dB. */
  var MIX_SOUNDS = [
    /* ground: what the tyres and the body make */
    { id: "dirt", bus: "ground", name: "Dirt under the tyres", vars: [["fine", "Fine dirt"], ["coarse", "Coarse gravel"], ["packed", "Packed clay"]], knobs: [] },
    { id: "roll", bus: "ground", name: "Rolling rumble", vars: [], knobs: [] },
    { id: "squeal", bus: "ground", name: "Tyre squeal", vars: [], knobs: [] },
    { id: "mud", bus: "ground", name: "Mud", vars: [["squelch", "Squelch"], ["thick", "Thick and sucking"]], knobs: [] },
    { id: "water", bus: "ground", name: "Water splash", vars: [], knobs: [] },
    { id: "speedwind", bus: "ground", name: "Wind from speed", vars: [], knobs: [] },
    { id: "hits", bus: "ground", name: "Bumps and landings", vars: [], knobs: [] },
    /* the world around the truck */
    { id: "rain", bus: "world", name: "Rain", vars: [["patter", "Patter"], ["drizzle", "Drizzle"], ["downpour", "Downpour"], ["tin", "On sheet metal"]], knobs: [["dens", "Density", 0.2, 2], ["bright", "Brightness", 0, 1]] },
    { id: "roof", bus: "world", name: "Rain on the roof (in the cab)", vars: [["steel", "Steel roof"], ["soft", "Muffled"]], knobs: [] },
    { id: "thunder", bus: "world", name: "Thunder", vars: [["rolling", "Rolling"], ["crack", "Close crack"], ["distant", "Distant"]], knobs: [["every", "Seconds between", 8, 60]] },
    { id: "wind", bus: "world", name: "Wind", vars: [["breeze", "Breeze"], ["plains", "Plains gusts"], ["grass", "Through the grass"]], knobs: [["gust", "Gustiness", 0, 1]] },
    { id: "birds", bus: "world", name: "Birds (day)", vars: [["songbirds", "Songbirds"], ["meadowlark", "Meadowlark"], ["doves", "Doves"], ["mixed", "All of them"]], knobs: [["rate", "How often", 0.2, 2]] },
    { id: "daybugs", bus: "world", name: "Insects (day)", vars: [["cicada", "Cicadas"], ["hopper", "Grasshoppers"], ["off", "None"]], knobs: [] },
    { id: "nightbugs", bus: "world", name: "Insects (night)", vars: [["field", "Field crickets"], ["tree", "Tree crickets"], ["katydid", "Katydids"], ["chorus", "Distant chorus"], ["mixed", "Mixed"]], knobs: [["pitch", "Pitch", 0, 1], ["rate", "Chirp rate", 0, 1], ["n", "How many", 1, 6]] },
    { id: "creek", bus: "world", name: "Creek", vars: [["babble", "Babble"], ["trickle", "Trickle"], ["rush", "Rushing"]], knobs: [] },
    { id: "crowd", bus: "world", name: "Crowd at the strip", vars: [["bleachers", "Bleachers"], ["stadium", "Big crowd"]], knobs: [] },
    { id: "ui", bus: "ui", name: "Shop and HUD sounds", vars: [], knobs: [] }
  ];
  var MIX_DEFAULT = {
    v: 1,
    bus: { engine: -1, ground: 0, world: 4, ui: -3, master: 0 },
    eng: { norm: 0.75, tame: 0.55 },
    limiter: 1,
    s: {
      dirt: { on: 1, lvl: 0, v: "fine" }, roll: { on: 1, lvl: 0 }, squeal: { on: 1, lvl: 0 }, mud: { on: 1, lvl: 0, v: "squelch" }, water: { on: 1, lvl: 0 }, speedwind: { on: 1, lvl: 0 }, hits: { on: 1, lvl: 0 },
      rain: { on: 1, lvl: 0, v: "patter", dens: 1, bright: 0.5 }, roof: { on: 1, lvl: 0, v: "steel" }, thunder: { on: 1, lvl: 0, v: "rolling", every: 28 }, wind: { on: 1, lvl: 0, v: "breeze", gust: 0.5 },
      birds: { on: 1, lvl: 0, v: "mixed", rate: 1 }, daybugs: { on: 1, lvl: -4, v: "cicada" }, nightbugs: { on: 1, lvl: 0, v: "mixed", pitch: 0.5, rate: 0.5, n: 4 },
      creek: { on: 1, lvl: 0, v: "babble" }, crowd: { on: 1, lvl: 0, v: "bleachers" }, ui: { on: 1, lvl: 0 }
    }
  };
  var dbToLin = (d) => Math.pow(10, d / 20);
  /* fill in anything a saved or pasted mix is missing */
  function mixFill(m) {
    let D = MIX_DEFAULT, o = JSON.parse(JSON.stringify(D));
    if (!m || typeof m != "object") return o;
    Object.assign(o.bus, m.bus || {}), Object.assign(o.eng, m.eng || {}), m.limiter !== void 0 && (o.limiter = m.limiter ? 1 : 0);
    for (let k in o.s) m.s && m.s[k] && Object.assign(o.s[k], m.s[k]);
    return o;
  }
  /* the per-sound linear gains and settings the DSPs read */
  function mixFor(m, ids) {
    let out = {};
    for (let k of ids) {
      let s = m.s[k];
      s && (out[k] = Object.assign({}, s, { g: s.on ? dbToLin(s.lvl) : 0 }));
    }
    return out;
  }
  var MIX_GROUND = ["dirt", "roll", "squeal", "mud", "water", "speedwind", "hits"], MIX_WORLD = ["rain", "roof", "thunder", "wind", "birds", "daybugs", "nightbugs", "creek", "crowd", "ui"];
  /* a short code to carry a mix between the sound board and the game */
  function mixEncode(m) {
    let only = { v: 1, bus: m.bus, eng: m.eng, limiter: m.limiter, s: {} };
    for (let k in m.s) {
      let a = m.s[k], d = MIX_DEFAULT.s[k], diff = {};
      for (let q in a) a[q] !== d[q] && (diff[q] = a[q]);
      Object.keys(diff).length && (only.s[k] = diff);
    }
    let txt = JSON.stringify(only);
    return "DSMIX1." + btoa(unescape(encodeURIComponent(txt))).replace(/=+$/, "");
  }
  function mixDecode(code) {
    let c = String(code || "").trim();
    if (c.startsWith("{")) return mixFill(JSON.parse(c));
    if (!c.startsWith("DSMIX1.")) throw new Error("That isn't a Dirt Sleeper mix code.");
    let b = c.slice(7);
    for (; b.length % 4; ) b += "=";
    return mixFill(JSON.parse(decodeURIComponent(escape(atob(b)))));
  }
