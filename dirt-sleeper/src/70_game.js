  // ===== game/main.js =====
  /* The game: one truck, one ranch. Garage, dirt drags against a ladder of rivals, timed off-road runs,
     free roam with cash hidden around the map. Everything persists in this browser. */
  var Q = new URLSearchParams(location.search), $ = (id) => document.getElementById(id);
  /* two saves that never touch: the campaign (earn everything) and free play (everything unlocked).
     Settings are shared between them. */
  var SAVE_KEYS = { campaign: "dirt-sleeper-1", free: "dirt-sleeper-free-1" }, SET_KEY = "dirt-sleeper-settings", SAVE_KEY = SAVE_KEYS.campaign, DT = 1 / 240;
  function readKey(k) {
    try {
      return JSON.parse(localStorage.getItem(k) || "null");
    } catch {
      return null;
    }
  }
  function writeKey(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
    }
  }
  var SETTINGS = Object.assign({ assist: "arcade", cam: 0, quality: Q.get("q") || "medium", vol: 0.8, amb: 1, units: "mph", env: "afternoon" }, (readKey(SAVE_KEYS.campaign) || {}).settings, readKey(SET_KEY));
  function freshSave(gm = "campaign") {
    let free = gm === "free", b = Object.assign({}, STOCK_BUILD, { number: 10 + Math.floor(Math.random() * 89) }), owned = {};
    for (let s of SLOTS) owned[s.id] = s.opts.filter((o) => free || !o.price).map((o) => o.v);
    return { v: 1, gm, cash: free ? 0 : 2500, spent: 0, build: b, owned, drag: free ? RIVALS.length : 0, wins: {}, medals: { trail: 0, climb: 0, bog: 0 }, best: { trail: 0, climb: 0, bog: 0, et: 0, trap: 0, rt: 0 }, coolers: [], trophies: {}, dirt: 0.15, mud: 0, settings: SETTINGS };
  }
  function hasSave(gm) {
    let s = readKey(SAVE_KEYS[gm]);
    return s && s.v === 1 ? s : null;
  }
  function loadSave(gm = "campaign") {
    let s = hasSave(gm), f = freshSave(gm);
    if (!s) return f;
    s.gm = gm, s.build = Object.assign({}, f.build, s.build), s.medals = Object.assign({}, f.medals, s.medals), s.best = Object.assign({}, f.best, s.best), s.trophies = s.trophies || {}, s.spent = s.spent || 0, s.coolers = s.coolers || [], s.wins = s.wins || {};
    for (let k in f.owned) s.owned[k] = Array.from(/* @__PURE__ */ new Set([...f.owned[k], ...(s.owned || {})[k] || []]));
    for (let sl of SLOTS) SLOT[sl.id].opts.some((o) => o.v === s.build[sl.id]) || (s.build[sl.id] = STOCK_BUILD[sl.id]);
    return gm === "free" && (s.drag = RIVALS.length), s.settings = SETTINGS, s;
  }
  var SV = loadSave("campaign"), FREE = () => SV.gm === "free";
  function persist() {
    writeKey(SAVE_KEYS[SV.gm], SV), writeKey(SET_KEY, SETTINGS);
  }
  /* trophies only count in the campaign */
  function award(id) {
    let T = TROPHIES.find((q) => q.id === id);
    if (!T || FREE() || SV.trophies[id]) return null;
    return SV.trophies[id] = Date.now(), persist(), audio.ui("trophy"), say("Trophy: " + T.name, "go", 3.4), T;
  }
  /* ---------- the world, the renderer, the truck ---------- */
  var canvas = $("view"), R = new Renderer(canvas, { quality: SV.settings.quality }), t0w = performance.now(), W = buildRanch(), tWorld = performance.now() - t0w;
  R.loadWorld(W, { hw: 6, lanes: 2, len: 1e3 });
  function heightMask(W2) {
    let n = 200, data = new Float32Array(n * n * 2);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) data[(j * n + i) * 2] = W2.heightAt(-400 + (i + 0.5) * 4, -400 + (j + 0.5) * 4) + 0.3, data[(j * n + i) * 2 + 1] = 1;
    return { n, data, params: [-400, -400, 1 / 800, n] };
  }
  var world = new RanchWorld(W), SR = new SuvRenderer(R), CR = new CarRenderer(R, CHASSIS.sl3), PS = new Particles(R, heightMask(W), { rainN: { low: 2500, medium: 4e3, high: 6e3, ultra: 8e3 }[SV.settings.quality] || 4e3 }), drs = new DRS({ min: 0.5, max: R.Q.maxScale, start: 0.8 }), input = new Input(window), audio = new GameAudio();
  KEYS.led = [], KEYS.high = [], KEYS.lo = ["KeyL"], KEYS.lock = ["KeyK"], KEYS.lights = ["KeyF"], KEYS.horn = ["KeyH"], KEYS.env = ["KeyT"], KEYS.cam = ["KeyC"], KEYS.up = ["KeyE"], KEYS.down = ["KeyQ"];
  var truck = null, spec = null, nums = null, state = "boot", mode = null, time = 0, acc = 0, envId = SV.settings.env, env = ENVS[envId], lightsOn = !1, horn = !1, cam = null, lastEv = {}, msgs = [];
  function setEnv(id) {
    envId = id, env = ENVS[id] || ENVS.afternoon;
  }
  function rebuildTruck(keepPose = !0) {
    let b = SV.build, old = truck;
    spec = buildSpec(b), nums = buildNumbers(b), truck = makeTruck(b, world), truck.setAssists(SV.settings.assist);
    if (old && keepPose) {
      truck.q = old.q.slice(), truck.p = [old.p[0], old.p[1] - old.c.hcg + truck.c.hcg + 0.02, old.p[2]], truck.v = old.v.slice(), truck.w = old.w.slice();
      for (let i = 0; i < 4; i++) truck.wheels[i].w = old.wheels[i].w, truck.wheels[i].ang = old.wheels[i].ang;
      old.pt.st !== "off" && (truck.pt.st = "run", truck.pt.we = Math.max(old.pt.we, truck.pt.e.idle * TAU / 60), truck.pt.rpm = truck.pt.we * 60 / TAU);
    }
    audio.configure(SIM.dspCfg(spec));
  }
  function placeTruck(x, z, yaw) {
    let y = W.heightAt(x, z);
    truck.place([x, y + 0.05, z], yaw), truck.hint = -1;
    for (let w of truck.wheels) w.comp = 0, w.ang = 0, w.w = 0;
    truck.pt.gear = 1, truck.pt.shiftT = 0, truck.pt.engage = 0, truck.pt.locked = !1, truck.rev = !1, truck.pt.rev = !1, truck.drift.on = !1, truck.pt.nos = truck.pt.e.nosKw ? 1 : 0;
    for (let i = 0; i < 120; i++) truck.step(DT, { thr: 0, brk: 1, steer: 0 });
    truck.v = [0, 0, 0], truck.w = [0, 0, 0], cam && (cam.cut = !0);
  }
  /* ---------- the camera ---------- */
  var CAMS = ["Chase", "Far chase", "Hood", "Driver"], ChaseCam = class {
    constructor() {
      this.mode = SV.settings.cam || 0, this.cut = !0, this.off = null, this.pv = [0, 0, 0], this.yaw = null, this.yawV = 0, this.orbit = null, this.fq = null, this.shake = 0;
    }
    next() {
      this.mode = (this.mode + 1) % CAMS.length, this.cut = !0, this.off = null, this.yaw = null;
    }
    update(dt, v, { look = !1, impact = 0 } = {}) {
      let M = qmat(v.q), F = mcol(M, 0), U = mcol(M, 1), sp = len(v.v), cut = this.cut, out = { near: 0.25, fov: 1.05, cut };
      this.cut = !1;
      let body = (x, y, z) => add(v.p, mvec(M, [x, y - SUV.hcg0, z]));
      if (this.orbit) {
        let o = this.orbit, asp = canvas.clientWidth / Math.max(1, canvas.clientHeight), tall = asp < 0.9, c = add(v.p, [0, o.y + (tall ? -1.15 : 0), 0]), d = [Math.cos(o.pitch) * Math.cos(o.yaw), Math.sin(o.pitch), Math.cos(o.pitch) * Math.sin(o.yaw)], pos = madd(c, d, o.dist * (tall ? 1.8 : 1));
        return pos[1] = Math.max(pos[1], W.heightAt(pos[0], pos[2]) + 0.35), out.pos = pos, out.fwd = norm2(sub2(c, pos)), out.up = [0, 1, 0], out.fov = o.fov || 0.75, out.cut = cut || !!o.cut, o.cut = !1, out;
      }
      this.shake = Math.max(this.shake * Math.exp(-dt * 6), impact * 0.5);
      let mname = CAMS[this.mode];
      if (mname === "Chase" || mname === "Far chase" || look) {
        let fh = norm2([F[0], 1e-4, F[2]]), dir = [fh[0], 0, fh[2]];
        if (sp > 3) {
          let vd = norm2([v.v[0], 0, v.v[2]]), k = clamp((sp - 3) / 12, 0, 1) * 0.5 * (dot2(vd, fh) > 0 ? 1 : 0);
          dir = norm2([fh[0] + vd[0] * k, 0, fh[2] + vd[2] * k]);
        }
        look && (dir = [-dir[0], 0, -dir[2]]);
        let ty = Math.atan2(dir[2], dir[0]);
        (this.yaw === null || cut) && (this.yaw = ty, this.yawV = 0);
        let d = ty - this.yaw;
        for (; d > Math.PI; ) d -= TAU;
        for (; d < -Math.PI; ) d += TAU;
        [this.yaw, this.yawV] = springTo(this.yaw, this.yawV, this.yaw + d, 3.6 + clamp(sp / 12, 0, 3), dt);
        let h = [Math.cos(this.yaw), 0, Math.sin(this.yaw)], far = mname === "Far chase", dist = (far ? 10 : 7) + clamp(sp * 0.02, 0, 1.6) + v.c.susp.rest * 2, ht = (far ? 3.6 : 2.5) + (v.c.hcg - SUV.hcg0) * 1.2, tgt = [v.p[0] - h[0] * dist, v.p[1] + ht, v.p[2] - h[2] * dist];
        tgt[1] = Math.max(tgt[1], W.heightAt(tgt[0], tgt[2]) + 1.1);
        let off = sub2(tgt, v.p);
        (!this.off || cut) && (this.off = off.slice(), this.pv = [0, 0, 0]);
        for (let k = 0; k < 3; k++) {
          let r = springTo(this.off[k], this.pv[k], off[k], k === 1 ? 5 : 7, dt);
          this.off[k] = r[0], this.pv[k] = r[1];
        }
        let pos = add(v.p, this.off);
        pos[1] = Math.max(pos[1], W.heightAt(pos[0], pos[2]) + 0.8);
        let at = [v.p[0] + h[0] * 3, v.p[1] + 0.9, v.p[2] + h[2] * 3];
        out.pos = pos, out.fwd = norm2(sub2(at, pos)), out.up = [0, 1, 0], out.fov = (far ? 0.95 : 1.05) + clamp(sp * 3e-3, 0, 0.25), this.fq = null;
      } else {
        let cab = mname === "Driver", p = cab ? body(-0.12, 1.5, -0.4) : body(0.95, 1.42 + (v.build && v.build.power === "roots" ? 0.25 : 0), 0);
        (!this.fq || cut) && (this.fq = { F, U });
        let k = 1 - Math.exp(-dt * 16);
        this.fq.F = norm2(madd(this.fq.F, sub2(F, this.fq.F), k)), this.fq.U = norm2(madd(this.fq.U, sub2(U, this.fq.U), k)), out.pos = p, out.fwd = this.fq.F, out.up = this.fq.U, out.near = cab ? 0.06 : 0.15, out.fov = (cab ? 1.15 : 1.05) + clamp(sp * 2.5e-3, 0, 0.2), this.off = null, this.yaw = null;
      }
      if (this.shake > 1e-3) {
        let s = this.shake * 0.05;
        out.pos = [out.pos[0] + (Math.random() - 0.5) * s, out.pos[1] + (Math.random() - 0.5) * s, out.pos[2] + (Math.random() - 0.5) * s];
      }
      return out;
    }
  };
  cam = new ChaseCam();
  /* ---------- messages for the HUD ---------- */
  function say(text, kind = "", dur = 2.4) {
    msgs.push({ text, kind, t: dur }), ui && ui.toast(text, kind, dur);
  }
  /* ---------- rival vehicles on the strip ---------- */
  var rival = null;
  function rivalView() {
    if (!rival) return null;
    let rv = rival.run.rv, x = rival.x, lane = rival.z, isCar = rv.type === "car", hcg = isCar ? CHASSIS.sl3.hcg : SUV.hcg0 + (rv.look.lift || 0) + ((rv.look.tireR || SUV.R0) - SUV.R0), R0 = isCar ? CHASSIS.sl3.R : rv.look.tireR || SUV.R0, ax = isCar ? [1.32, -1.32] : [SUV.axF, SUV.axR], tr = isCar ? [1.6, 1.62] : [rv.look.trackF || 1.56, rv.look.trackR || 1.56], acc2 = rival.acc || 0, pitch = clamp(acc2 * 3e-3, -0.025, 0.04), q = qmul(qaxis([0, 1, 0], 0), qaxis([0, 0, 1], pitch)), y = W.heightAt(x, lane) + hcg, ang = x / R0, wheels = [[ax[0], -1, 0], [ax[0], 1, 0], [ax[1], -1, 1], [ax[1], 1, 1]].map(([wx, s, r]) => ({ hp: [wx, -hcg + R0, s * tr[r] / 2], len: 0, steer: 0, ang, disc: 0 }));
    let base = { id: 7, p: [x, y, lane], q, wheels, lamps: [env.night > 0.3 ? 1 : 0, env.night > 0.3 ? 1 : 0, 0, 0] };
    return isCar ? { kind: "car", v: Object.assign(base, { paint: PAINTS[rv.paint] || PAINTS.silver, caliper: [0.7, 0.03, 0.02] }) } : { kind: "suv", v: Object.assign(base, { look: rv.look, paint: SUV_PAINTS[rv.paint], style: Object.assign({ seed: 0.81 }, rv.style), dirt: rv.dirt || 0, mud: rv.mud || 0 }) };
  }
  /* ---------- events ---------- */
  var FT60 = 18.288, FT330 = 100.584, EIGHTH = 201.168, LANE_P = 36, LANE_R = 44;
  function frontX() {
    let M = qmat(truck.q), F = mcol(M, 0);
    return truck.p[0] + F[0] * (SUV.axF + truck.c.R);
  }
  function startEvent(kind, arg) {
    rival = null, PS.n = 0, $("toasts").innerHTML = "";
    let b = SV.build;
    if (kind === "drag") {
      let rv = RIVALS[arg];
      setEnv("night"), rival = { run: rivalRun(rv), x: -(rv.type === "car" ? 2.3 : 2.5 + (rv.look.tireR || SUV.R0) - SUV.R0), z: LANE_R, acc: 0 }, rival.x0 = rival.x;
      placeTruck(-9, LANE_P, 0), mode = { kind, idx: arg, rv, phase: "stage", t: 0, treeAt: 0, green: 0, pre: !1, staged: !1, left: 0, rt: null, splits: {}, fin: 0, rFin: 0, foul: !1, wait: 0, tree: [0, 0] }, say("Creep up to the line. Both top lamps lit = staged.", "", 4);
    } else if (kind === "trail") {
      let L = W.loop, s0 = L.len - 22, c = L.at(s0), d = L.dir(s0);
      setEnv(RUNS.trail.env), placeTruck(c[0], c[1], Math.atan2(d[1], d[0])), mode = { kind, run: RUNS.trail, gates: W.gates.filter((g) => g.tag === "loop"), next: 0, t: 0, started: !1, missed: 0, resets: 0, done: !1 };
      say("Through the flag gate to start the clock.", "", 3.5);
    } else if (kind === "climb") {
      let L = W.climb, d = L.dir(0), c = L.at(0);
      setEnv(RUNS.climb.env), placeTruck(c[0] - d[0] * 14, c[1] - d[1] * 14, Math.atan2(d[1], d[0])), mode = { kind, run: RUNS.climb, gates: W.gates.filter((g) => g.tag === "climb"), next: 0, t: 0, started: !1, missed: 0, resets: 0, stuck: 0, done: !1 };
      say("Climb to the summit flags. Low range and lockers help.", "", 3.5);
    } else if (kind === "bog") {
      let M = W.mud;
      setEnv(RUNS.bog.env), placeTruck(M.x + M.rx + 14, M.z, Math.PI), mode = { kind, run: RUNS.bog, t: 0, started: !1, stuck: 0, x0: M.x + M.rx, x1: M.x - M.rx, done: !1, resets: 0 };
      say("Full send through the pit. Don't stop.", "", 3);
    } else
      setEnv(SV.settings.env), mode = { kind: "roam", t: 0 }, truck.speed < 0.5 && Math.hypot(truck.p[0], truck.p[2] - 2) < 20 && placeTruck(0, 6, 0), say(`${COOLERS.length - SV.coolers.length} cash coolers left out there. T changes the time of day.`, "", 4);
    state = "drive", cam.orbit = null, cam.cut = !0, truck.pt.running || truck.pt.start(), ui.show("hud");
  }
  function finishEvent(res) {
    mode.done = !0, mode.result = res;
    let pay = 0, free = FREE(), got = [], A = (id) => {
      let t = award(id);
      t && got.push(t);
    };
    res.free = free;
    if (res.kind === "drag") {
      let rv = RIVALS[mode.idx];
      if (res.win) {
        let first = !SV.wins[rv.id];
        free || (pay = Math.round(rv.pay * (first ? 1 : 0.35)), res.sleeperBonus = Math.round(pay * nums.sleeper / 100), pay += res.sleeperBonus), SV.wins[rv.id] = (SV.wins[rv.id] || 0) + 1, mode.idx >= SV.drag && (SV.drag = mode.idx + 1), res.unlocked = !free && first && mode.idx + 1 < RIVALS.length ? RIVALS[mode.idx + 1] : null;
        A("first"), RIVALS.every((q) => SV.wins[q.id]) && A("ladder"), rv.id === "ghost" && (A("ghost"), nums.looks < 15 && A("unseen")), nums.sleeper >= 40 && A("sleeper"), spec.diesel && A("diesel");
      }
      !res.foul && res.rt >= 0 && res.rt < 0.05 && res.et > 0 && A("rt"), !res.foul && res.et > 0 && res.et < 8 && A("seven");
      res.et > 0 && !res.foul && ((!SV.best.et || res.et < SV.best.et) && (SV.best.et = res.et, SV.best.trap = res.trap), (!SV.best.rt || res.rt < SV.best.rt && res.rt >= 0) && (SV.best.rt = res.rt));
    } else if (res.time > 0) {
      let run = RUNS[res.kind], m = res.time <= run.medals[2] ? 3 : res.time <= run.medals[1] ? 2 : res.time <= run.medals[0] ? 1 : 0, prev = SV.medals[res.kind];
      res.medal = m, free || (pay = m ? m > prev ? run.pay[m - 1] : Math.round(run.pay[m - 1] * 0.3) : 150), m > prev && (SV.medals[res.kind] = m), (!SV.best[res.kind] || res.time < SV.best[res.kind]) && (res.record = !0, SV.best[res.kind] = res.time);
      m === 3 && A(res.kind), SV.medals.trail === 3 && SV.medals.climb === 3 && SV.medals.bog === 3 && A("allgold"), m && audio.ui("medal");
    }
    res.trophies = got, res.pay = pay, SV.cash += pay, persist(), setTimeout(() => {
      state === "drive" && mode && mode.result === res && (state = "result", ui.result(res));
    }, res.kind === "drag" ? 2600 : 1600);
  }
  /* pick campaign or free play from the title, then into the shop */
  function chooseMode(gm) {
    SV = loadSave(gm), persist(), rebuildTruck(!1), audio.start(), audio.setVolume(SETTINGS.vol), audio.setAmbVolume(SETTINGS.amb ?? 1), enterGarage();
  }
  function goTitle() {
    persist(), state = "title", mode = null, rival = null, placeTruck(GARAGE.x, GARAGE.z, GARAGE.yaw), cam.orbit = { yaw: 2.3, pitch: 0.12, dist: 9.5, y: 0.35, fov: 0.7, cut: !0 }, setEnv("dusk"), ui.show("title");
  }
  function eventStep(dt) {
    if (!mode) return;
    mode.t += dt;
    let m = mode;
    if (m.kind === "drag") dragStep(dt, m);
    else if (m.kind === "trail" || m.kind === "climb") {
      if (m.done) return;
      let g = m.gates[m.next];
      if (g) {
        let dx = truck.p[0] - g.x, dz = truck.p[2] - g.z, along = dx * g.dx + dz * g.dz, side = Math.abs(-dx * g.dz + dz * g.dx);
        if (along > 0 && along < 6 && side < 7.5) {
          if (audio.ui("tick"), m.next === 0 && !m.started) m.started = !0, m.t = 0, say("Go!", "go", 1.2);
          else if (m.next > 0) say(`Gate ${m.next}/${m.gates.length - (m.kind === "trail" ? 0 : 1)}`, "", 0.9);
          m.next++;
        } else if (m.started) {
          for (let j = m.next + 1; j < Math.min(m.gates.length, m.next + 3); j++) {
            let h = m.gates[j], ex = truck.p[0] - h.x, ez = truck.p[2] - h.z;
            if (Math.hypot(ex, ez) < 7) {
              m.missed += j - m.next, say(`Missed ${j - m.next} gate${j - m.next > 1 ? "s" : ""}: +${5 * (j - m.next)} s`, "bad", 2), m.next = j + 1;
              break;
            }
          }
        }
      }
      let lastDone = m.kind === "trail" ? m.next >= m.gates.length && (() => {
        let g0 = m.gates[0], dx = truck.p[0] - g0.x, dz = truck.p[2] - g0.z;
        return m.t > 20 && dx * g0.dx + dz * g0.dz > 0 && dx * g0.dx + dz * g0.dz < 8 && Math.abs(-dx * g0.dz + dz * g0.dx) < 8;
      })() : m.next >= m.gates.length;
      if (m.started && lastDone) {
        let time2 = m.t + m.missed * 5 + m.resets * 5;
        finishEvent({ kind: m.kind, time: time2, raw: m.t, missed: m.missed, resets: m.resets }), say("Finish!", "go", 2);
      }
      m.kind === "climb" && m.started && (truck.speed < 0.35 ? m.stuck += dt : m.stuck = Math.max(0, m.stuck - dt * 2), m.stuck > 7 && (finishEvent({ kind: m.kind, time: 0, dnf: "Stuck on the hill", raw: m.t }), say("Stuck.", "bad", 2)));
    } else if (m.kind === "bog") {
      if (m.done) return;
      let x = truck.p[0];
      !m.started && x < m.x0 && (m.started = !0, m.t = 0, say("Go!", "go", 1)), m.started && (m.dist = Math.max(m.dist || 0, m.x0 - x), truck.speed < 0.3 ? m.stuck += dt : m.stuck = 0, x < m.x1 ? (finishEvent({ kind: "bog", time: m.t + m.resets * 5, raw: m.t, resets: m.resets }), say("Through!", "go", 2)) : m.stuck > 4.5 && (finishEvent({ kind: "bog", time: 0, dnf: "Stuck in the mud", dist: m.dist }), say("Stuck.", "bad", 2)));
    } else if (m.kind === "roam") for (let i = 0; i < COOLERS.length; i++) {
      if (SV.coolers.includes(i)) continue;
      let c = COOLERS[i];
      Math.hypot(truck.p[0] - c[0], truck.p[2] - c[1]) < 4.2 && (audio.ui("chime"), SV.coolers.push(i), FREE() || (SV.cash += 250), persist(), say(FREE() ? `Cooler found (${SV.coolers.length}/${COOLERS.length})` : `Cash cooler: +$250 (${SV.coolers.length}/${COOLERS.length})`, "go", 3), ui.cash(), SV.coolers.length >= COOLERS.length && award("coolers"));
    }
  }
  function dragStep(dt, m) {
    let fx = frontX(), sp = truck.speed;
    rival.acc = 0;
    if (m.phase === "stage") {
      m.pre = fx > -0.18, m.staged = fx > 0 && fx < 0.4, fx > 0.4 && !m.deep && (m.deep = !0, say("Too deep. Back up a touch.", "bad", 2)), fx < 0.25 && (m.deep = !1), m.tree = [(m.pre ? 1 : 0) | (m.staged ? 2 : 0), 3];
      m.staged && sp < 0.3 ? (m.wait += dt, m.wait > 0.5 && (m.phase = "tree", m.sx = fx, m.treeAt = m.t + 0.5 + Math.random() * 0.9)) : m.wait = 0;
    } else if (m.phase === "tree") {
      m.tree = [3, 3], m.t >= m.treeAt && (m.tree = [31, 31]), m.t >= m.treeAt + 0.4 && (m.phase = "run", m.green = m.t), fx > m.sx + 0.16 && m.phase === "tree" && (m.phase = "run", m.green = m.treeAt + 0.4);
    }
    if (m.phase === "run") {
      let tg = m.t - m.green;
      m.tree = [m.foul ? 64 | 3 : tg < 1.5 ? 32 | 3 : 3, 32 | 3];
      if (!m.left && fx > m.sx + 0.16 && (m.left = m.t, m.rt = m.left - m.green, m.rt < 0 && (m.foul = !0, say("Red light!", "bad", 2.5))), m.left) {
        let d = fx - m.sx, tt = m.t - m.left, S = m.splits;
        !S.t60 && d >= FT60 && (S.t60 = tt), !S.t330 && d >= FT330 && (S.t330 = tt), !S.t181 && d >= EIGHTH - 20.117 && (S.t181 = tt), !m.fin && d >= EIGHTH && (m.fin = m.t, S.et = tt, S.trap = 20.117 / Math.max(0.05, tt - S.t181));
      }
      let rt = m.t - m.green - rival.run.rt, xp = rival.x;
      if (!rival.braking) {
        let xr = rival.run.x(rt);
        rival.x = rival.x0 + Math.max(0, xr), !m.rFin && xr >= EIGHTH && (m.rFin = m.green + rival.run.rt + rival.run.et), xr > EIGHTH + 6 && (rival.braking = !0, rival.vb = rival.run.v(rt));
      } else rival.vb = Math.max(0, rival.vb - 8.5 * dt), rival.x += rival.vb * dt;
      let vNew = (rival.x - xp) / Math.max(dt, 1e-3);
      rival.accS = (rival.accS || 0) + ((vNew - (rival.vPrev || 0)) / Math.max(dt, 1e-3) - (rival.accS || 0)) * 0.08, rival.vPrev = vNew, rival.acc = rival.accS;
      !m.done && (m.fin || m.t - m.green > 25 || m.foul && m.rFin && m.t - m.rFin > 1) && (m.rFin || m.t - m.green > 25) && (() => {
        let S = m.splits, win = !m.foul && !!m.fin && (!m.rFin || m.fin < m.rFin);
        finishEvent({ kind: "drag", win, foul: m.foul, rt: m.rt ?? 0, et: S.et || 0, t60: S.t60 || 0, t330: S.t330 || 0, trap: S.trap || 0, rival: m.rv, rRt: rival.run.rt, rEt: rival.run.et, r60: rival.run.tAt(FT60), r330: rival.run.tAt(FT330), rTrap: 20.117 / Math.max(0.05, rival.run.et - rival.run.tAt(EIGHTH - 20.117)), margin: m.fin && m.rFin ? m.rFin - m.fin : 0 }), say(win ? "Win!" : m.foul ? "Foul" : "Beaten", win ? "go" : "bad", 2.2), ambQ.push({ type: "cheer", a: win ? 1 : 0.4 });
      })();
    }
  }
  /* ---------- lights, effects, sound ---------- */
  var sc3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  function truckLights() {
    let M = qmat(truck.q), F = mcol(M, 0), U = mcol(M, 1), Rt = mcol(M, 2), at = (x, y, z) => add(truck.p, mvec(M, [x, y - SUV.hcg0, z])), dyn = [], brake = truck.brkIn > 0.05 && truck.speed > 0.2, night = env.night > 0.3, b = SV.build;
    for (let z of [-0.79, 0.79]) dyn.push({ pos: at(-2.46, 0.98, z), r: brake ? 10 : 5, col: brake ? [5, 0.12, 0.06] : night ? [0.9, 0.02, 0.01] : [0, 0, 0], type: 1, dir: norm2(madd(sc3(F, -1), U, -0.3)), cosO: Math.cos(1.3) });
    if (truck.rev) dyn.push({ pos: at(-2.46, 0.79, 0), r: 9, col: [3, 2.9, 2.7], type: 1, dir: norm2(madd(sc3(F, -1), U, -0.3)), cosO: Math.cos(1.2) });
    let bar = lightsOn && b.lights >= 1;
    bar && dyn.push({ pos: at(0.0, 2.0, 0), r: 70, col: [900, 940, 1e3], type: 1, dir: norm2(madd(F, U, -0.12)), cosO: Math.cos(0.75) });
    lightsOn && b.lights >= 2 && dyn.push({ pos: at(0.75, 1.25, 0), r: 30, col: [260, 270, 280], type: 1, dir: norm2(madd(F, U, -0.2)), cosO: Math.cos(1.1) });
    return { dyn, headlights: night || lightsOn ? { on: 1, high: bar ? 1 : 0, posL: at(2.38, 0.8, -0.69), posR: at(2.38, 0.8, 0.69), dir: norm2(madd(F, U, -0.04)), right: Rt, up: U, col: [1050, 1080, 1120], range: bar ? 140 : 95 } : null };
  }
  var LOOSE = { strip: 0.7, dirt: 1, trail: 1, grass: 0.45, rock: 0.3, mud: 0, water: 0, concrete: 0 };
  function effects(dt) {
    let M = qmat(truck.q), F = mcol(M, 0), U = mcol(M, 1), Rt = mcol(M, 2), sp = len(truck.v), b = SV.build, inMud = 0, inWater = 0, loose = 0;
    truck.wheels.forEach((w, i) => {
      if (!w.contact) return;
      let lo = LOOSE[w.surf] ?? 0.3, slip = w.slipV, sv = truck.v, r = () => Math.random() - 0.5;
      loose += lo / 4, w.surf === "mud" && (inMud += 0.25), w.surf === "water" && (inWater += 0.25);
      if (lo > 0 && (sp > 2.5 || slip > 2)) PS.emit("d" + i, lo * (Math.min(sp, 40) * 0.9 + slip * 3.5) * (w.front ? 0.5 : 1), dt, () => {
        let p = madd(madd(w.cp, F, -0.3), U, 0.25);
        PS.spawn(3, p, [sv[0] * 0.25 - F[0] * slip * 0.25 + r() * 1.6, 0.5 + Math.random() * 1.4, sv[2] * 0.25 - F[2] * slip * 0.25 + r() * 1.6], 2.2 + Math.random() * 2.2, 0.5, 3.6 + sp * 0.04, 0.13 * (env.wet > 0.3 ? 0.4 : 1));
      });
      if (w.surf === "mud" && (sp > 1 || slip > 1)) PS.emit("m" + i, (sp * 2 + slip * 6) * (w.front ? 0.6 : 1), dt, () => {
        let p = madd(madd(w.cp, F, -0.2 - truck.c.R * 0.6), U, truck.c.R * 0.8), side = (w.left ? -1 : 1) * Math.random() * 1.5;
        PS.spawn(4, p, [sv[0] * 0.4 - F[0] * (slip * 0.5 + 1.5) + Rt[0] * side + r(), 2 + Math.random() * 3 + slip * 0.25, sv[2] * 0.4 - F[2] * (slip * 0.5 + 1.5) + Rt[2] * side + r()], 0.7 + Math.random() * 0.6, 0.06 + Math.random() * 0.05, 0.12, 0.9);
      });
      if (w.surf === "water" && sp > 1.5) PS.emit("w" + i, sp * 4, dt, () => {
        let p = madd(w.cp, U, 0.3), side = (w.left ? -1 : 1) * (0.8 + Math.random() * 1.5);
        PS.spawn(6, p, [sv[0] * 0.5 + Rt[0] * side * 1.5 + r(), 1.5 + Math.random() * 2.5, sv[2] * 0.5 + Rt[2] * side * 1.5 + r()], 0.6 + Math.random() * 0.5, 0.1, 0.5, 0.35);
      });
      if (w.surf === "concrete" && slip > 4) PS.emit("s" + i, (slip - 4) * w.Fz / 2500 * 5, dt, () => PS.spawn(1, madd(w.cp, U, 0.2), [sv[0] * 0.3 + r(), 0.4 + Math.random() * 0.5, sv[2] * 0.3 + r()], 2 + Math.random() * 1.6, 0.4, 3.4, 0.22));
    });
    /* black smoke from the diesel, bigger with the race tune */
    let pt = truck.pt;
    if (spec.diesel && pt.running) {
      let load = pt.load, gas = Math.max(0, pt.thr - 0.25) * (pt.rpm > pt.e.idle * 1.2 || truck.speed < 1 ? 1 : 0.4), rate = (gas * (b.tune === 2 ? 70 : 32) + load * 6) * (1 + (pt.boost < pt.e.fiBoost * 0.6 ? 1 : 0)), ex = b.exhaust === "stacks" ? [[-0.98, 2.45, -0.98], [-0.98, 2.45, 0.98]] : b.hood === "stacks" ? [[1.28, 1.8, -0.3], [1.28, 1.8, 0.3]] : [[-2.45, 0.38, 0.62]];
      rate > 0.5 && PS.emit("soot", rate, dt, () => {
        let e = ex[Math.floor(Math.random() * ex.length)], p = add(truck.p, mvec(M, [e[0], e[1] - SUV.hcg0, e[2]])), up = e[1] > 1.5;
        PS.spawn(5, p, [truck.v[0] * 0.6 + (up ? U[0] * 4 : -F[0] * 3) + (Math.random() - 0.5), (up ? 3.5 : 0.6) + Math.random(), truck.v[2] * 0.6 + (up ? U[2] * 4 : -F[2] * 3) + (Math.random() - 0.5)], 2.4 + Math.random() * 2, 0.3, 3.5 + gas * 2.5, 0.35 + gas * 0.35);
      });
    }
    /* the truck gets dirty, and the creek rinses it */
    let mph = sp * 2.237;
    SV.dirt = clamp(SV.dirt + dt * loose * Math.min(1, mph / 25) * 6e-3 - inWater * dt * 0.04, 0, 1), SV.mud = clamp(SV.mud + dt * inMud * (0.04 + Math.min(1, sp / 6) * 0.18) - inWater * dt * 0.08, 0, 1);
    return { loose, inMud, inWater };
  }
  function soundUpdate(c, ev, surf) {
    let M = qmat(truck.q), F = mcol(M, 0), mname = cam.orbit ? "Orbit" : CAMS[cam.mode], exhaust = add(truck.p, mvec(M, [-2.3, 0.4 - SUV.hcg0, 0])), rel = sub2(c.pos, exhaust), dist = len(rel), right = norm2([-c.fwd[2], 0, c.fwd[0]]), dirToCam = norm2(sub2(c.pos, truck.p)), listener = 0, geo = { dist: Math.max(1.5, dist), pan: clamp(-dot2(norm2(sub2(truck.p, c.pos)), right) * 0.9, -1, 1), rear: 1 };
    mname === "Driver" ? (listener = 1, geo = { dist: 1.4, pan: 0, rear: 0.35 }) : mname === "Hood" ? geo = { dist: 3.2, pan: 0, rear: 0.3 } : geo.rear = clamp(0.5 - 0.5 * dot2(dirToCam, F), 0, 1) * 0.6 + 0.4;
    mname === "Orbit" && (geo.dist = Math.max(2.5, dist), geo.rear = clamp(0.5 - 0.5 * dot2(dirToCam, F), 0, 1) * 0.7 + 0.3);
    let ep = truck.pt.soundParams(listener, len(truck.v), geo);
    ep.horn = horn ? 1 : 0;
    let tA = Math.tan(truck.tyre.aPk), kP = truck.tyre.kPk, W2 = truck.wheels, sl = 0, sm = 0;
    for (let w of W2) w.contact && ((LOOSE[w.surf] ?? 0) > 0.2 && (sl = Math.max(sl, clamp((w.slipV - 1.5) / 8, 0, 1))), w.surf === "mud" && (sm = Math.max(sm, clamp(w.slipV / 6, 0, 1))));
    let fx = {
      lat: W2.map((w) => w.contact ? Math.abs(w.tanA) / tA : 0), lon: W2.map((w) => w.contact ? Math.abs(w.kap) / kP : 0), load: W2.map((w) => w.Fz),
      sqK: W2.map((w) => w.surf === "concrete" ? 1 : w.surf === "rock" ? 0.35 : 0.06), wet: env.wet, speed: len(truck.v), cabin: listener === 1 ? 1 : 0, curb: 0, scrape: ev.scrape || 0, vol: 1,
      loose: surf.loose, spinLoose: sl, mud: surf.inMud, spinMud: sm, water: surf.inWater
    }, fev = [];
    ev.wall > 1.2 && fev.push({ type: "hit", a: ev.wall / 9 }), ev.land > 2.2 && fev.push({ type: "hit", a: ev.land / 10 }), ev.ground > 2 && fev.push({ type: "hit", a: ev.ground / 8 }), audio.update(ep, truck.pt.takeEvents(), fx, fev, Object.assign({ cabin: listener === 1, amb: ambience(c, listener === 1), ambEvents: ambQ.splice(0) }, space()));
  }
  /* ---------- the world's sounds ---------- */
  var ambQ = [];
  function ambience(c, cabin) {
    let rain = clamp(env.rain * 2.2, 0, 1), wet = rain > 0.05, cp = c.pos, cr = W.creek.nearest(cp[0], cp[2], 4), dCreek = cr ? Math.max(0, cr.d - 4) : 999, drag = mode && mode.kind === "drag" && (state === "drive" || state === "result" || state === "pause");
    return {
      rain, storm: wet && env.cloud > 0.8 ? 1 : 0, cabin: cabin ? 1 : 0,
      wind: clamp(0.16 + (wet ? 0.35 : 0) + clamp((cp[1] - 6) / 60, 0, 1) * 0.5, 0, 1),
      birds: clamp(1 - env.night * 1.4, 0, 1) * (wet ? 0.15 : 1), crickets: clamp((env.night - 0.35) * 1.8, 0, 1) * (wet ? 0.3 : 1),
      creek: clamp(1 - dCreek / 55, 0, 1) ** 1.5, crowd: drag ? clamp(1 - Math.hypot(cp[0] - 90, cp[2] - 58) / 170, 0, 1) * 0.9 : 0
    };
  }
  /* where the truck is decides the echo: open range, the yard by the shop, or inside it */
  function space() {
    let x = truck.p[0], z = truck.p[2], inside = x > -15 && x < 15 && z > -31 && z < -15, dx = Math.max(-15 - x, 0, x - 15), dz = Math.max(-31 - z, 0, z + 15), d = Math.hypot(dx, dz);
    return { shop: inside ? 1 : 0, yard: inside ? 0 : clamp(1 - d / 30, 0, 1) };
  }
  /* ---------- the loop ---------- */
  var ui = null, garageRev = 0, lastInp = {}, frameN = 0, airAcc = 0;
  function truckView() {
    let b = SV.build, night = env.night > 0.3;
    return {
      id: 1, self: !0, p: truck.p, q: truck.q, look: buildLook(b), paint: SUV_PAINTS[b.paint], style: buildStyle(b),
      wheels: truck.wheels.map((w) => ({ hp: w.hp, len: w.len, steer: w.front ? truck.steer : 0, ang: w.ang, disc: w.disc })),
      lamps: [night || lightsOn ? 1 : 0, night || lightsOn ? 1 : 0, truck.brkIn > 0.05 ? 1 : 0, truck.rev ? 1 : 0], dirt: SV.dirt, mud: SV.mud, bar: lightsOn && b.lights >= 1 ? 1 : 0, pods: lightsOn && b.lights >= 2 ? 1 : 0
    };
  }
  function step(dt) {
    let lo = input.hit("lo"), lk = input.hit("lock"), li = input.hit("lights"), inp = input.poll(dt);
    horn = input.key("horn") || ui.touchHorn, lastInp = inp, inp.pause && (state === "drive" ? pause(!0) : state === "pause" && pause(!1));
    if (state === "pause" || state === "boot") return { ev: {} };
    let drive = { steer: 0, thr: 0, brk: 0, hb: 0 };
    if (state === "drive") {
      inp.cam && (cam.next(), SV.settings.cam = cam.mode, say(CAMS[cam.mode] + " camera", "", 1)), li && (lightsOn = !lightsOn), lo && (setLow(truck, !truck.low) ? say(truck.low ? "Low range" : "High range", "", 1.2) : say("No low range. Fit a two-speed transfer case.", "bad", 2)), lk && (setLockers(truck, !truck.locked) ? say(truck.locked ? "Lockers on" : "Lockers off", "", 1.2) : say("No lockers fitted.", "bad", 2));
      inp.env && mode && mode.kind === "roam" && (() => {
        let ids = RANCH_ENVS, i = (ids.indexOf(envId) + 1) % ids.length;
        setEnv(ids[i]), SV.settings.env = ids[i], say(env.name, "", 1.5);
      })();
      inp.reset && resetTruck(), inp.up && truck.pt.shift(1), inp.down && truck.pt.shift(-1);
      drive = mode && mode.done && mode.kind !== "roam" ? { steer: inp.steer, thr: 0, brk: 0.45, hb: 1 } : inp;
      mode && mode.kind === "drag" && mode.phase === "tree" && (drive = Object.assign({}, drive)), mode && mode.kind === "drag" && rival && (lastInp.steer = inp.steer);
    } else if (state === "garage" || state === "title" || state === "result") drive = { steer: 0, thr: garageRev, brk: garageRev > 0 ? 1 : 0, hb: 1 };
    truck.wet = env.wet, acc += dt;
    let n = 0;
    for (; acc >= DT && n < 24; ) truck.step(DT, drive), acc -= DT, n++, time += DT;
    acc > DT && (acc = 0), state === "drive" && (eventStep(dt), truck.air ? (airAcc += dt, airAcc > 1.5 && award("air")) : airAcc = 0, SV.mud > 0.97 && award("mud"));
    let surf = effects(dt);
    if (state === "drive" && truck.speed < 0.5) {
      let M = qmat(truck.q), U = mcol(M, 1);
      U[1] < 0.3 ? (truck.flipT = (truck.flipT || 0) + dt, truck.flipT > 2 && !truck.flipSaid && (truck.flipSaid = !0, say("Rolled it. Press R to flip back over.", "bad", 4))) : (truck.flipT = 0, truck.flipSaid = !1);
    }
    return { ev: truck.takeEvents(), surf };
  }
  function resetTruck() {
    let M = qmat(truck.q), F = mcol(M, 0), yaw = Math.atan2(F[2], F[0]), x = truck.p[0], z = truck.p[2];
    if (mode && (mode.kind === "trail" || mode.kind === "climb")) {
      let L = mode.kind === "trail" ? W.loop : W.climb, nr = L.nearest(x, z, 3);
      if (nr && nr.d > 6) {
        let c = L.at(nr.s), d = L.dir(nr.s);
        x = c[0], z = c[1], yaw = Math.atan2(d[1], d[0]);
      }
      mode.started && !mode.done && (mode.resets++, say("Reset: +5 s", "bad", 1.5));
    } else if (mode && mode.kind === "bog" && mode.started && !mode.done) mode.resets++, say("Reset: +5 s", "bad", 1.5);
    let keep = truck.pt.st;
    placeTruck(x, z, yaw), truck.pt.st = keep === "off" ? "off" : "run";
  }
  var camPrev = null, slowT = 0;
  function render(dt, r) {
    let c = cam.update(dt, truck, { look: !!lastInp.look, impact: Math.max(r.ev.wall || 0, r.ev.land || 0) * 0.25 }), L = truckLights(), M = qmat(truck.q), F = mcol(M, 0), fw = norm2([F[0], 1e-4, F[2]]), camVel = camPrev && !c.cut ? sub2(c.pos, camPrev).map((x) => x / Math.max(dt, 1e-3)) : [0, 0, 0];
    camPrev = c.pos.slice(), PS.rain.on = env.rain, PS.rain.camVel = camVel, PS.update(dt, c.pos);
    let suvs = [truckView()], cars = [], occ = [[truck.p[0], truck.p[1], truck.p[2], truck.c.hcg, fw[0], fw[2], 2.5, 1]], rvw = rival && state !== "garage" ? rivalView() : null, props = [], dyn = L.dyn;
    rvw && (rvw.kind === "car" ? cars.push(rvw.v) : suvs.push(rvw.v), occ.push([rvw.v.p[0], rvw.v.p[1], rvw.v.p[2], 0.6, 1, 0, 2.3, 0.95]));
    if (mode && mode.kind === "roam" && state === "drive") {
      let near = [];
      COOLERS.forEach((cl, i) => {
        if (SV.coolers.includes(i)) return;
        let d = Math.hypot(cl[0] - truck.p[0], cl[1] - truck.p[2]);
        d < 160 && props.push({ p: [cl[0], W.heightAt(cl[0], cl[1]), cl[1]], yaw: i * 1.3, kind: "cooler" }), near.push([d, i]);
      }), near.sort((a, b) => a[0] - b[0]);
      for (let [d, i] of near.slice(0, 2)) {
        let cl = COOLERS[i], y = W.heightAt(cl[0], cl[1]);
        d < 200 && dyn.push({ pos: [cl[0], y + 1.4, cl[1]], r: 9, col: [9, 4, 0.6], type: 0 });
      }
    }
    let tree = mode && mode.kind === "drag" && state === "drive" ? mode.tree : [0, 0];
    R.render({ time, dt, cam: c, cut: c.cut, env, flicker: [1, 1, 1, 1, 1, 1, 1, 1], probePos: add(truck.p, [0, 0.8, 0]), dyn, headlights: L.headlights, occ, suvs, cars, props, shutter: 0.5, tree: [tree[0], tree[1], 0, 0], lensRain: 0 }), soundUpdate(c, r.ev, r.surf || { loose: 0, inMud: 0, inWater: 0 }), ui.lastCam = c, ui.frame(dt);
  }
  function fit() {
    let dpr = Math.min(2, devicePixelRatio || 1), w = Math.max(2, Math.round(canvas.clientWidth * dpr)), h = Math.max(2, Math.round(canvas.clientHeight * dpr));
    (canvas.width !== w || canvas.height !== h) && (canvas.width = w, canvas.height = h), R.resize(w, h, R.iw ? R.scale : drs.scale);
  }
  function frame(dt) {
    fit();
    let r = step(dt);
    if (render(dt, r), frameN++, !Q.has("fixed")) {
      let sc = drs.update(dt * 1e3, R.gpuMs);
      Math.abs(sc - R.scale) > 1e-3 && R.resize(canvas.width, canvas.height, sc);
    }
  }
  var last = performance.now(), running = !1;
  function loop(now) {
    let dt = Math.min(0.05, (now - last) / 1e3);
    last = now, frame(dt), requestAnimationFrame(loop);
  }
  function pause(on) {
    on && state === "drive" ? (state = "pause", ui.show("pause"), audio.suspend(!0)) : !on && state === "pause" && (state = "drive", ui.show("hud"), audio.suspend(!1), last = performance.now());
  }
  document.addEventListener("visibilitychange", () => {
    document.hidden && state === "drive" && pause(!0);
  });
  /* ---------- the garage ---------- */
  var GARAGE = { x: 0, z: -4, yaw: 0.35 };
  function enterGarage() {
    state = "garage", mode = null, rival = null, setEnv(SV.settings.env === "night" ? "night" : SV.settings.env === "overcast" ? "overcast" : "afternoon"), placeTruck(GARAGE.x, GARAGE.z, GARAGE.yaw), truck.pt.running || truck.pt.start(), lightsOn = !1, cam.orbit = { yaw: 0.9, pitch: 0.16, dist: 8.2, y: 0.25, fov: 0.72, cut: !0, auto: !0 }, ui.show("garage"), persist();
  }
  function applyBuild(b) {
    SV.build = b, rebuildTruck(!0);
  }
