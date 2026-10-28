  // ===== audio/mix.js =====
  /* One mix for the whole game: three buses (engine, ground, UI) and a master, and for every sound whether
     it plays, its level and which version. The engine is the Digital Engine synth exactly as the lab plays
     it. Every other sound was rebuilt from scratch; each one stays off in the game until it's approved on
     the sound board (the board plays them all). Water and gravel are waiting for recordings.
     The board turns a mix into a short code (DSMIX3.…) the game reads. Levels are in dB. */
  var MIX_SOUNDS = [
    { id: "roll", bus: "ground", name: "Tyres rolling", vars: [["rumble", "Rumble"], ["tread", "Rumble and tread"]], when: "Any ground at any speed: the low rumble that comes up through the chassis. The second version adds the tread's hum, mostly on hard ground." },
    { id: "crunch", bus: "ground", name: "Dirt under the tread", vars: [["fine", "Fine dirt"], ["gravel", "Gravel"]], when: "Loose ground: the trails, the dirt roads, the strip. A recording will replace this one if you find a good one." },
    { id: "spin", bus: "ground", name: "Wheelspin", vars: [], when: "Spinning on dirt: launches, burnouts, climbing. A roar of dirt and stones hitting the wheel wells." },
    { id: "thump", bus: "ground", name: "Suspension", vars: [["tight", "Tight"], ["boomy", "Boomy"]], when: "Every bump the suspension takes, landings, and the clank of bottoming out." },
    { id: "hits", bus: "ground", name: "Body hits and scrapes", vars: [], when: "The body hitting rocks, tyre walls and trees, and the belly dragging." },
    { id: "mud", bus: "ground", name: "Mud", vars: [["soupy", "Soupy"], ["thick", "Thick"]], when: "The bog and the mud track: tyres churning, suction, clods hitting the truck." },
    { id: "ui", bus: "ui", name: "Shop and HUD", vars: [], when: "Countdown beeps, gates, laps, new bests, medals, coolers, buying parts." }
  ];
  /* the game's mix. A sound goes "on" here once it's approved. */
  var MIX_DEFAULT = {
    v: 3,
    bus: { engine: 0, ground: 0, ui: -3, master: 0 },
    limiter: 1,
    s: {
      roll: { on: 0, lvl: 0, v: "rumble" }, crunch: { on: 0, lvl: 0, v: "fine" }, spin: { on: 0, lvl: 0 }, thump: { on: 0, lvl: 0, v: "tight" }, hits: { on: 0, lvl: 0 }, mud: { on: 0, lvl: 0, v: "soupy" },
      ui: { on: 0, lvl: 0 }
    }
  };
  var dbToLin = (d) => Math.pow(10, d / 20);
  /* fill in anything a saved or pasted mix is missing. Mixes from before the rebuild (v1, v2) don't carry over. */
  function mixFill(m, def = MIX_DEFAULT) {
    let o = JSON.parse(JSON.stringify(def));
    if (!m || typeof m != "object" || m.v !== 3) return o;
    for (let k in o.bus) m.bus && isFinite(m.bus[k]) && (o.bus[k] = +m.bus[k]);
    m.limiter !== void 0 && (o.limiter = m.limiter ? 1 : 0);
    for (let k in o.s) m.s && m.s[k] && Object.assign(o.s[k], m.s[k]);
    return o;
  }
  /* the board starts with every new sound playing, so you hear them all */
  var MIX_BOARD = (() => {
    let m = mixFill(null);
    for (let k in m.s) m.s[k].on = 1;
    return m;
  })();
  /* the per-sound linear gains and settings the DSPs read */
  function mixFor(m, ids) {
    let out = {};
    for (let k of ids) {
      let s = m.s[k];
      s && (out[k] = Object.assign({}, s, { g: s.on ? dbToLin(s.lvl) : 0 }));
    }
    return out;
  }
  var MIX_GROUND = ["roll", "crunch", "spin", "thump", "hits", "mud"], MIX_UI = ["ui"];
  /* a short code to carry a mix between the sound board and the game: only what differs from the game's mix */
  function mixEncode(m) {
    let only = { v: 3, bus: m.bus, limiter: m.limiter, s: {} };
    for (let k in m.s) {
      let a = m.s[k], d = MIX_DEFAULT.s[k], diff = {};
      for (let q in a) a[q] !== d[q] && (diff[q] = a[q]);
      Object.keys(diff).length && (only.s[k] = diff);
    }
    return "DSMIX3." + btoa(unescape(encodeURIComponent(JSON.stringify(only)))).replace(/=+$/, "");
  }
  function mixDecode(code) {
    let c = String(code || "").trim();
    if (c.startsWith("{")) return mixFill(JSON.parse(c));
    if (c.startsWith("DSMIX1.")) throw new Error("That code is from the old sounds. Make a new one on the sound board.");
    if (!c.startsWith("DSMIX3.")) throw new Error("That isn't a Dirt Sleeper mix code.");
    let b = c.slice(7);
    for (; b.length % 4; ) b += "=";
    return mixFill(JSON.parse(decodeURIComponent(escape(atob(b)))));
  }
