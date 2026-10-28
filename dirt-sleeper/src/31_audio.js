  // src/audio/fx-dsp.js
  function makeFX() {
    let TAU2 = Math.PI * 2, ss = (a, b, x) => {
      let t = Math.max(0, Math.min(1, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };
    class BP {
      constructor() {
        this.x1 = 0, this.x2 = 0, this.y1 = 0, this.y2 = 0, this.set(500, 1, 44100);
      }
      set(f2, q, sr) {
        let w = TAU2 * Math.min(f2, sr * 0.45) / sr, al = Math.sin(w) / (2 * q), a0 = 1 + al;
        this.b0 = al / a0, this.a1 = -2 * Math.cos(w) / a0, this.a2 = (1 - al) / a0;
      }
      run(x) {
        let y = this.b0 * x - this.b0 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
        return this.x2 = this.x1, this.x1 = x, this.y2 = this.y1, this.y1 = y, y;
      }
    }
    class FX {
      constructor(sr) {
        this.sr = sr, this.p = { lat: [0, 0, 0, 0], lon: [0, 0, 0, 0], load: [0, 0, 0, 0], wet: 0, speed: 0, cabin: 0, curb: 0, scrape: 0, vol: 1 }, this.g = { sq: [0, 0, 0, 0], rd: 0, hiss: 0, curb: 0, scr: 0 }, this.sq = [0, 1, 2, 3].map((i) => ({ bp: new BP(), bp2: new BP(), drift: 0, f: 0 })), this.road = new BP(), this.road.set(260, 0.7, sr), this.road2 = new BP(), this.road2.set(700, 0.9, sr), this.hissF = new BP(), this.hissF.set(2200, 0.9, sr), this.grit = new BP(), this.grit.set(900, 2.2, sr), this.gritLo = new BP(), this.gritLo.set(180, 1.2, sr), this.seed = 22222, this.b = [0, 0, 0], this.curbPh = 0, this.thumpE = 0, this.thumpLp = 0, this.hits = [], this.grainE = 0, this.grainA = 0, this.hitLp = 0, this.k = 0, this.grvF = new BP(), this.grvF.set(1150, 0.8, sr), this.grvF2 = new BP(), this.grvF2.set(520, 1, sr), this.rollF = new BP(), this.rollF.set(150, 0.7, sr), this.sloshF = new BP(), this.sloshF.set(260, 0.7, sr), this.pings = [], this.roarF = new BP(), this.roarF.set(380, 0.7, sr), this.mudF = new BP(), this.mudF.set(140, 1.6, sr), this.mudF2 = new BP(), this.mudF2.set(520, 3, sr), this.splF = new BP(), this.splF.set(2600, 0.5, sr), this.grE = 0, this.grA = 0, this.mudPh = 0, this.g.grv = 0, this.g.roar = 0, this.g.mud = 0, this.g.spl = 0;
      }
      set(p) {
        this.p = p;
      }
      /* a damped resonator: a pebble ping, a bubble, a mud pop */
      ping(f2, dec, amp) {
        if (this.pings.length > 14) return;
        let w = TAU2 * f2 / this.sr, r = Math.exp(-1 / (dec * this.sr));
        this.pings.push({ a1: 2 * r * Math.cos(w), a2: r * r, y1: amp * Math.sin(w), y2: 0, n: Math.round(dec * this.sr * 6) });
      }
      event(e) {
        e.type === "hit" && this.hits.push({ t: 0, a: Math.min(1.4, e.a), f: 58 + Math.random() * 24 });
      }
      rnd() {
        let s = this.seed;
        return s ^= s << 13, s ^= s >>> 17, s ^= s << 5, this.seed = s, (s >>> 0) / 4294967296 * 2 - 1;
      }
      process(L, R2, n) {
        let p = this.p, g = this.g, sr = this.sr, k = 1 - Math.exp(-1 / (sr * 0.05)), sp = p.speed || 0, cab = p.cabin ? 1 : 0, wet = p.wet || 0, lat = p.lat || [0, 0, 0, 0], lon = p.lon || [0, 0, 0, 0], sqT = [0, 1, 2, 3].map((i) => {
          let side = ss(1.25, 2.1, lat[i]), spin = ss(2.8, 5.5, lon[i]);
          return Math.max(side * ss(2, 6, sp), spin * 0.8 * ss(0.5, 3, sp + lon[i])) * Math.min(1.2, (p.load[i] || 0) / 3600) * (1 - 0.95 * wet) * (p.sqK ? p.sqK[i] : 1);
        }), X = p.mix || {}, G = (id) => X[id] ? X[id].g ?? 1 : 1, gDirt = G("dirt"), dv = X.dirt && X.dirt.v || "fine", gRoll = G("roll") * (dv === "packed" ? 1.8 : 1), gSq = G("squeal"), gMud = G("mud"), thick = X.mud && X.mud.v === "thick", gWat = G("water"), gHit = G("hits"), rdT = ss(1, 45, sp) * 0.22, hissT = wet * ss(4, 30, sp) * 0.07, curbT = p.curb ? ss(3, 15, sp) : 0, scrT = ss(1, 12, p.scrape || 0), lo = p.loose || 0, sl = p.spinLoose || 0, grvT = ss(0.6, 18, sp) * lo * 0.55 + sl * 0.7, roarT = sl * 0.45 + ss(6, 30, sp) * lo * 0.12, mudT = (p.mud || 0) * (0.25 + 0.75 * ss(0.3, 6, sp + (p.spinMud || 0) * 8)), splT = (p.water || 0) * ss(0.4, 7, sp) * 0.8;
        dv !== this.dv && (this.dv = dv, this.grvF.set(dv === "coarse" ? 760 : 1150, 0.8, sr), this.grvF2.set(dv === "coarse" ? 330 : 520, 1, sr));
        let gRate = dv === "coarse" ? [420, 65] : [700, 110], gDec = dv === "coarse" ? 0.986 : 0.975, gLvl = (dv === "coarse" ? 0.3 : dv === "packed" ? 0.085 : 0.24) * gDirt, pebK = dv === "coarse" ? 2.2 : dv === "packed" ? 0.4 : 1;
        for (let w = 0; w < 4; w++) {
          let v = this.sq[w];
          v.drift += (this.rnd() * 0.4 - v.drift * 0.05) * 0.15;
          let f2 = (720 + w * 31) * (1 + 0.08 * v.drift) * (1 + 0.12 * Math.min(1, Math.max(0, lat[w] - 1.25)));
          v.bp.set(f2, 16, sr), v.bp2.set(f2 * 2.02, 14, sr);
        }
        for (let i = 0; i < n; i++) {
          for (let w = 0; w < 4; w++) g.sq[w] += (sqT[w] - g.sq[w]) * k;
          g.rd += (rdT - g.rd) * k, g.hiss += (hissT - g.hiss) * k, g.curb += (curbT - g.curb) * k, g.scr += (scrT - g.scr) * k * 2, g.grv += (grvT - g.grv) * k, g.roar += (roarT - g.roar) * k, g.mud += (mudT - g.mud) * k, g.spl += (splT - g.spl) * k;
          let wn = this.rnd(), b = this.b;
          b[0] = 0.99765 * b[0] + wn * 0.099046, b[1] = 0.963 * b[1] + wn * 0.2965164, b[2] = 0.57 * b[2] + wn * 1.0526913;
          let pink = (b[0] + b[1] + b[2] + wn * 0.1848) * 0.12, l = 0, r = 0;
          for (let w = 0; w < 4; w++) {
            let a = g.sq[w];
            if (a < 1e-4) continue;
            let v2 = this.sq[w], s = (v2.bp.run(wn) * 1 + v2.bp2.run(wn) * 0.35) * a * 0.55 * gSq;
            w % 2 === 0 ? (l += s * 1.1, r += s * 0.7) : (l += s * 0.7, r += s * 1.1);
          }
          let road = ((this.road.run(pink) * 1.6 + this.road2.run(pink) * 0.6) * g.rd * (cab ? 0.7 : 1) * (1 - 0.6 * Math.min(1, lo)) + this.hissF.run(pink * 3) * g.hiss * (cab ? 0.3 : 1)) * gRoll;
          if (g.grv > 1e-3) {
            /* dirt under the tread: thousands of tiny grains a second through low-mid bands, so they fuse into a crunch */
            Math.random() < (gRate[0] + sp * gRate[1]) * g.grv / sr && (this.grE += 0.35 + Math.random() * 0.65), this.grE *= gDec;
            let gr = wn * this.grE;
            let cr = this.grvF.run(gr) * 0.9 + this.grvF2.run(gr) * 0.75;
            this.gl1 = (this.gl1 || 0) + 0.27 * (cr - (this.gl1 || 0)), this.gl2 = (this.gl2 || 0) + 0.27 * (this.gl1 - (this.gl2 || 0)), road += this.gl2 * Math.min(1, g.grv * 1.3) * gLvl * (cab ? 0.6 : 1);
            /* now and then a pebble flicked into a wheel well */
            Math.random() < sp * 0.28 * lo * pebK / sr && this.ping((dv === "coarse" ? 1100 : 1500) + Math.random() * 1700, 0.025 + Math.random() * 0.025, (0.03 + Math.random() * 0.06) * (cab ? 0.8 : 0.5) * gDirt);
          }
          lo > 0.01 && (road += this.rollF.run(pink * 2) * ss(1, 25, sp) * lo * 0.32 * (cab ? 0.85 : 1) * gRoll);
          g.roar > 1e-3 && (road += this.roarF.run(pink * 2.2) * g.roar * (cab ? 0.6 : 1) * gDirt);
          if (g.mud > 1e-3) {
            this.mudPh += (thick ? 1.8 + sp * 0.9 : 3 + sp * 1.5) / sr;
            let lfo = 0.45 + 0.55 * Math.abs(Math.sin(this.mudPh * TAU2 * 0.5)) ** 3;
            road += (this.mudF.run(wn) * 1.8 + this.mudF2.run(pink) * 0.9 * lfo) * g.mud * lfo * (cab ? 0.6 : 1) * gMud;
            Math.random() < g.mud * (2 + sp * 1.2) * (thick ? 2.2 : 1) / sr && this.ping(thick ? 70 + Math.random() * 90 : 110 + Math.random() * 190, thick ? 0.06 + Math.random() * 0.06 : 0.04 + Math.random() * 0.05, (0.12 + Math.random() * 0.12) * gMud);
          }
          if (g.spl > 1e-3) {
            this.splSw = (this.splSw || 0) * 0.9997 + (Math.random() < 6 / sr ? 0.5 + Math.random() * 0.5 : 0);
            road += (this.sloshF.run(pink * 2.5) * (0.5 + this.splSw) * 1.1 + this.splF.run(wn) * 0.35) * g.spl * (cab ? 0.55 : 1) * gWat;
            Math.random() < g.spl * 45 / sr && this.ping(380 + Math.random() * 900, 0.012 + Math.random() * 0.02, (0.05 + Math.random() * 0.05) * gWat);
          }
          for (let q = this.pings.length - 1; q >= 0; q--) {
            let P = this.pings[q], y = P.a1 * P.y1 - P.a2 * P.y2;
            P.y2 = P.y1, P.y1 = y, road += y, --P.n <= 0 && this.pings.splice(q, 1);
          }
          if (l += road, r += road, g.curb > 1e-3) {
            this.curbPh += Math.max(sp, 1) / 2 / sr, this.curbPh >= 1 && (this.curbPh -= 1, this.thumpE = 1), this.thumpE *= Math.exp(-1 / (sr * 0.03)), this.thumpPh = (this.thumpPh || 0) + 46 / sr, this.thumpLp += (wn - this.thumpLp) * 0.01;
            let th = (Math.sin(TAU2 * this.thumpPh) * 0.5 + this.thumpLp * 3) * this.thumpE * g.curb * 0.18 * gHit;
            l += th, r += th;
          }
          if (g.scr > 1e-3) {
            Math.random() < (30 + p.scrape * 6) / sr && (this.grainE = 1, this.grainA = 0.4 + Math.random() * 0.6), this.grainE *= Math.exp(-1 / (sr * 6e-3));
            let sc = (this.grit.run(wn) * this.grainE * this.grainA * 0.9 + this.gritLo.run(pink) * 0.9) * g.scr * 0.45 * gHit;
            l += sc, r += sc;
          }
          for (let h = this.hits.length - 1; h >= 0; h--) {
            let H = this.hits[h];
            H.t += 1 / sr;
            let e = Math.exp(-H.t * 14) * H.a * gHit;
            this.hitLp += (wn - this.hitLp) * 0.15;
            let s = (Math.sin(TAU2 * H.f * H.t * (1 - H.t * 1.5)) * 0.9 + this.hitLp * 1.5 * Math.exp(-H.t * 30) + wn * 0.25 * Math.exp(-H.t * 80)) * e;
            l += s, r += s, H.t > 0.6 && this.hits.splice(h, 1);
          }
          let v = (p.vol ?? 1) * 0.55;
          L[i] = l * v, R2[i] = r * v;
        }
      }
    }
    return FX;
  }

  // src/audio/game-audio.js
  function roomIR(ctx, kind) {
    let sr = ctx.sampleRate, n = Math.round(sr * { street: 0.9, tunnel: 2.4 }[kind]), b = ctx.createBuffer(2, n, sr), seed = 1234567, rnd = () => (seed = seed * 16807 % 2147483647, seed / 2147483647 * 2 - 1);
    for (let ch = 0; ch < 2; ch++) {
      let X = b.getChannelData(ch), lp = 0;
      if (kind === "tunnel") {
        for (let k = 1; k < 44; k++) {
          let i = Math.round((k * 0.036 + (k & 1 ? ch * 0.011 : 0) + rnd() * 15e-4) * sr);
          if (i >= n) break;
          let a = Math.pow(0.8, k) * (k + ch & 1 ? 0.55 : 1);
          for (let q = 0; q < 90 && i + q < n; q++) X[i + q] += a * Math.exp(-q / (5 + k * 1.4)) * (q ? rnd() * 0.6 : 1);
        }
        for (let i = 0; i < n; i++) {
          let t = i / sr;
          lp += 0.3 * (rnd() - lp), X[i] += lp * 0.55 * Math.exp(-t * 2.5) * Math.min(1, t / 0.03);
        }
      } else {
        X[Math.round((45e-4 + ch * 6e-4) * sr)] += 0.5;
        for (let [t, a, d] of [[0.052, 0.3, 10], [0.071, 0.24, 12], [0.118, 0.16, 16], [0.176, 0.1, 20], [0.25, 0.06, 26]]) {
          let s = Math.round((t + ch * 6e-3) * sr);
          for (let q = 0; q < 90; q++) X[s + q] += a * Math.exp(-q / d) * rnd();
        }
        for (let i = 0; i < n; i++) {
          let t = i / sr;
          lp += 0.25 * (rnd() - lp), X[i] += lp * 0.16 * Math.exp(-t * 6) * Math.min(1, t / 0.02);
        }
      }
    }
    return b;
  }
  var ENGINE_SRC = () => `const EngineDSP=(${makeDSP.toString()})();
class ShiftlightEngine extends AudioWorkletProcessor{
  constructor(){super();this.d=new EngineDSP(sampleRate);this.port.onmessage=e=>{const m=e.data;if(m.t==='cfg')this.d.configure(m.cfg);else if(m.t==='p')this.d.set(m.p);else if(m.t==='ev')this.d.event(m.ev);};}
  process(i,o){const out=o[0];this.d.process(out[0],out[1]||out[0],out[0].length);return true;}}
registerProcessor('shiftlight-engine',ShiftlightEngine);
const FXDSP=(${makeFX.toString()})();
class ShiftlightFX extends AudioWorkletProcessor{
  constructor(){super();this.d=new FXDSP(sampleRate);this.port.onmessage=e=>{const m=e.data;if(m.t==='p')this.d.set(m.p);else if(m.t==='ev')this.d.event(m.ev);};}
  process(i,o){const out=o[0];this.d.process(out[0],out[1]||out[0],out[0].length);return true;}}
registerProcessor('shiftlight-fx',ShiftlightFX);
const UIDSP=(${makeUISynth.toString()})();
class DirtUI extends AudioWorkletProcessor{
  constructor(){super();this.d=new UIDSP(sampleRate);this.port.onmessage=e=>{const m=e.data;if(m.t==='p')this.d.set(m.p);else if(m.t==='ev')this.d.event(m.ev);};}
  process(i,o){const out=o[0];this.d.process(out[0],out[1]||out[0],out[0].length);return true;}}
registerProcessor('dirt-ui',DirtUI);`, GameAudio = class {
    constructor() {
      this.ready = !1, this.starting = null, this.vol = 0.8, this.muted = !1, this.cfg = null, this.yard = 0, this.shop = 0, this.mix = mixFill(null), this.engNorm = 0, this.normCache = /* @__PURE__ */ new Map(), this.applyMixParts();
    }
    /* call from a user gesture. The graph: each source has its own bus; the engine is tamed on its own
       compressor so a redline doesn't bury the tyres and the HUD sounds; a limiter only catches peaks at the end. */
    start() {
      return this.starting ? this.starting : (this.starting = (async () => {
        let AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        let ctx = new AC({ latencyHint: "interactive" });
        this.ctx = ctx;
        let G = (v = 1) => {
          let g = ctx.createGain();
          return g.gain.value = v, g;
        }, A = () => {
          let a = ctx.createAnalyser();
          return a.fftSize = 2048, a.smoothingTimeConstant = 0, a;
        };
        let pre = G(), master = G(this.muted ? 0 : this.vol), lim = ctx.createDynamicsCompressor();
        lim.threshold.value = -1.5, lim.knee.value = 0, lim.ratio.value = 20, lim.attack.value = 1e-3, lim.release.value = 0.12, pre.connect(master), master.connect(lim), lim.connect(ctx.destination), this.master = master, this.lim = lim;
        let mk = (k) => {
          let send = G(0), cv = ctx.createConvolver();
          return cv.buffer = roomIR(ctx, k), send.connect(cv), cv.connect(pre), send;
        };
        this.sendS = mk("street"), this.sendT = mk("tunnel");
        let engIn = G(this.normGain()), engBus = G(), engComp = ctx.createDynamicsCompressor(), engOut = G(), groundBus = G(), uiBus = G();
        engIn.connect(engBus), engBus.connect(engComp), engComp.connect(engOut);
        for (let b of [engOut, groundBus]) b.connect(pre), b.connect(this.sendS), b.connect(this.sendT);
        uiBus.connect(pre), Object.assign(this, { engIn, engBus, engComp, groundBus, uiBus });
        this.meters = { engine: A(), ground: A(), ui: A(), master: A() }, engOut.connect(this.meters.engine), groundBus.connect(this.meters.ground), uiBus.connect(this.meters.ui), lim.connect(this.meters.master), this.mbuf = new Float32Array(2048);
        try {
          if (!ctx.audioWorklet) throw new Error("no worklet");
          let src = ENGINE_SRC();
          try {
            await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([src], { type: "application/javascript" })));
          } catch {
            await ctx.audioWorklet.addModule("data:application/javascript;charset=utf-8," + encodeURIComponent(src));
          }
          let node = (name, outs = 1) => new AudioWorkletNode(ctx, name, { numberOfInputs: 0, numberOfOutputs: outs, outputChannelCount: Array(outs).fill(2) }), eng = node("shiftlight-engine"), fx = node("shiftlight-fx"), uis = node("dirt-ui");
          eng.connect(engIn), fx.connect(groundBus), uis.connect(uiBus), this.eng = { post: (m) => eng.port.postMessage(m) }, this.fx = { post: (m) => fx.port.postMessage(m) }, this.uis = { post: (m) => uis.port.postMessage(m) }, this.kind = "worklet";
        } catch {
          /* no worklets: one script processor runs all three synths, each into its own bus through a splitter-free trick of three processors */
          let D = makeDSP(), F = makeFX(), Us = makeUISynth(), d = new D(ctx.sampleRate), f2 = new F(ctx.sampleRate), us = new Us(ctx.sampleRate), sp = (fn) => {
            let n = ctx.createScriptProcessor(1024, 1, 2), src = ctx.createConstantSource ? ctx.createConstantSource() : null;
            return src && (src.offset.value = 0, src.connect(n), src.start()), n.onaudioprocess = (ev) => {
              let b = ev.outputBuffer;
              fn(b.getChannelData(0), b.getChannelData(1), b.length);
            }, n;
          };
          sp((L, R2, n) => d.process(L, R2, n)).connect(engIn), sp((L, R2, n) => f2.process(L, R2, n)).connect(groundBus), sp((L, R2, n) => us.process(L, R2, n)).connect(uiBus);
          this.eng = { post: (m) => {
            m.t === "cfg" ? d.configure(m.cfg) : m.t === "p" ? d.set(m.p) : m.t === "ev" && d.event(m.ev);
          } }, this.fx = { post: (m) => {
            m.t === "p" ? f2.set(m.p) : m.t === "ev" && f2.event(m.ev);
          } }, this.uis = { post: (m) => {
            m.t === "p" ? us.set(m.p) : m.t === "ev" && us.event(m.ev);
          } }, this.kind = "main thread";
        }
        ctx.state !== "running" && await ctx.resume(), this.cfg && this.eng.post({ t: "cfg", cfg: this.cfg }), this.ready = !0, this.setMix(this.mix);
      })(), this.starting);
    }
    /* how loud this engine is at redline, so every engine can sit at the same level in the mix */
    measure(cfg) {
      let key = JSON.stringify(cfg);
      if (this.normCache.has(key)) return this.normCache.get(key);
      let D = makeDSP(), sr = 16e3, d = new D(sr), n = Math.round(sr * 0.55), L = new Float32Array(n), R2 = new Float32Array(n), s = 0, m = 0;
      d.configure(cfg);
      for (let o = 0; o < n; o += 128) {
        let k = Math.min(128, n - o);
        d.set({ on: 1, firing: 1, crank: 0, rpm: (cfg.redline || 6e3) * 0.97, load: 1, cutFrac: 0, boost: cfg.fiBoost || 0, nos: 0, speed: 25, gear: 3, twostep: 0, antilag: 0, view: 0, dist: 3, pan: 0, rear: 1, vol: 1 }), d.process(L.subarray(o, o + k), R2.subarray(o, o + k), k);
      }
      for (let i = Math.round(sr * 0.2); i < n; i++) s += L[i] * L[i], m++;
      let db = 10 * Math.log10(Math.max(1e-12, s / m)), norm = Math.max(-16, Math.min(10, -18 - db));
      return this.normCache.set(key, norm), norm;
    }
    configure(cfg) {
      this.cfg = cfg;
      try {
        this.engNorm = this.measure(cfg);
      } catch {
        this.engNorm = 0;
      }
      this.engIn && this.engIn.gain.setTargetAtTime(this.normGain(), this.ctx.currentTime, 0.05), this.ready && this.eng.post({ t: "cfg", cfg });
    }
    /* how much of the loudness correction to use: 1 makes every engine equally loud at redline */
    normGain() {
      return dbToLin(this.engNorm * Math.max(0, Math.min(1, +this.mix.eng.norm)));
    }
    applyMixParts() {
      this.mixG = mixFor(this.mix, MIX_GROUND), this.mixU = mixFor(this.mix, MIX_UI), this.uis && this.uis.post({ t: "p", p: { vol: 1, mix: this.mixU } });
    }
    /* apply a mix: bus faders, the engine's tamer, the limiter, and the per-sound settings */
    setMix(m) {
      if (this.mix = mixFill(m), this.applyMixParts(), !this.ctx) return;
      let t = this.ctx.currentTime, M = this.mix, set = (g, db) => g && g.gain.setTargetAtTime(dbToLin(db), t, 0.03), tame = Math.max(0, Math.min(1, M.eng.tame ?? 0.55));
      set(this.engBus, M.bus.engine), set(this.groundBus, M.bus.ground), set(this.uiBus, M.bus.ui), this.master.gain.setTargetAtTime(this.muted ? 0 : this.vol * dbToLin(M.bus.master || 0), t, 0.03);
      let c = this.engComp;
      c.threshold.value = -6 - 22 * tame, c.ratio.value = 1 + 5 * tame, c.knee.value = 10, c.attack.value = 6e-3, c.release.value = 0.25, this.lim.threshold.value = M.limiter ? -1.5 : 0, this.lim.ratio.value = M.limiter ? 20 : 1, this.engIn.gain.setTargetAtTime(this.normGain(), t, 0.05);
    }
    /* peak and RMS (dBFS) on each bus, for meters */
    levels() {
      let out = {};
      if (!this.meters) return out;
      for (let k in this.meters) {
        this.meters[k].getFloatTimeDomainData(this.mbuf);
        let pk = 0, s = 0;
        for (let x of this.mbuf) pk = Math.max(pk, Math.abs(x)), s += x * x;
        out[k] = [20 * Math.log10(Math.max(1e-6, pk)), 10 * Math.log10(Math.max(1e-12, s / this.mbuf.length))];
      }
      return out.reduction = this.engComp ? this.engComp.reduction : 0, out;
    }
    setVolume(v) {
      this.vol = v, this.master && this.master.gain.setTargetAtTime(this.muted ? 0 : v * dbToLin(this.mix.bus.master || 0), this.ctx.currentTime, 0.05);
    }
    setMuted(m) {
      this.muted = m, this.setVolume(this.vol);
    }
    suspend(on) {
      this.ctx && (on ? this.ctx.suspend() : this.ctx.resume());
    }
    /* once per frame */
    update(engineP, engineEvents, fxP, fxEvents, { cabin = !1, yard = 0, shop = 0 } = {}) {
      if (!this.ready) return;
      for (let e of engineEvents) this.eng.post({ t: "ev", ev: e });
      this.eng.post({ t: "p", p: engineP });
      for (let e of fxEvents) this.fx.post({ t: "ev", ev: e });
      this.fx.post({ t: "p", p: Object.assign({ mix: this.mixG }, fxP) });
      /* the space: open range is nearly dry, the shop yard throws back a slap, inside the shop it rings */
      let t = this.ctx.currentTime, c = cabin ? 0.4 : 1;
      this.yard += (yard - this.yard) * 0.08, this.shop += (shop - this.shop) * 0.08, this.sendS.gain.setTargetAtTime(c * (0.05 + 0.3 * this.yard) * (1 - this.shop), t, 0.08), this.sendT.gain.setTargetAtTime(0.6 * c * this.shop, t, 0.08);
    }
    /* one-shot shop and HUD sounds */
    ui(type, extra) {
      this.ready && this.uis && this.uis.post({ t: "ev", ev: Object.assign({ type }, extra || {}) });
    }
  };

