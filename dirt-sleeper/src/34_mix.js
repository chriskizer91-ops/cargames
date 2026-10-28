  // ===== audio/mix.js =====
  /* One mix for the whole game: three buses (engine, ground, UI) and a master, and for every sound its level,
     which version of it plays, and a few character knobs. The sound board edits this object and turns it
     into a short code; the game reads the same code. Levels are in dB. */
  var MIX_SOUNDS = [
    /* ground: what the tyres and the body make */
    { id: "dirt", bus: "ground", name: "Dirt under the tyres", vars: [["fine", "Fine dirt"], ["coarse", "Coarse gravel"], ["packed", "Packed clay"]], knobs: [] },
    { id: "roll", bus: "ground", name: "Rolling rumble", vars: [], knobs: [] },
    { id: "squeal", bus: "ground", name: "Tyre squeal", vars: [], knobs: [] },
    { id: "mud", bus: "ground", name: "Mud", vars: [["squelch", "Squelch"], ["thick", "Thick and sucking"]], knobs: [] },
    { id: "water", bus: "ground", name: "Water splash", vars: [], knobs: [] },
    { id: "hits", bus: "ground", name: "Bumps and landings", vars: [], knobs: [] },
    /* the shop and the HUD */
    { id: "ui", bus: "ui", name: "Shop and HUD sounds", vars: [], knobs: [] }
  ];
  var MIX_DEFAULT = {
    v: 2,
    bus: { engine: -1, ground: 0, ui: -3, master: 0 },
    eng: { norm: 0.75, tame: 0.55 },
    limiter: 1,
    s: {
      dirt: { on: 1, lvl: 0, v: "fine" }, roll: { on: 1, lvl: 0 }, squeal: { on: 1, lvl: 0 }, mud: { on: 1, lvl: 0, v: "squelch" }, water: { on: 1, lvl: 0 }, hits: { on: 1, lvl: 0 },
      ui: { on: 1, lvl: 0 }
    }
  };
  var dbToLin = (d) => Math.pow(10, d / 20);
  /* fill in anything a saved or pasted mix is missing */
  function mixFill(m) {
    let D = MIX_DEFAULT, o = JSON.parse(JSON.stringify(D));
    if (!m || typeof m != "object") return o;
    for (let k in o.bus) m.bus && m.bus[k] !== void 0 && (o.bus[k] = m.bus[k]);
    Object.assign(o.eng, m.eng || {}), m.limiter !== void 0 && (o.limiter = m.limiter ? 1 : 0);
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
  var MIX_GROUND = ["dirt", "roll", "squeal", "mud", "water", "hits"], MIX_UI = ["ui"];
  /* a short code to carry a mix between the sound board and the game */
  function mixEncode(m) {
    let only = { v: 2, bus: m.bus, eng: m.eng, limiter: m.limiter, s: {} };
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
