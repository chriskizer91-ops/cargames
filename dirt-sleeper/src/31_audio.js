  // src/audio/fx-dsp.js
  /* The ground and body sounds, rebuilt from scratch. Every one is noise shaped by what the physics is doing:
     no ringing resonators anywhere (the old pebble and bubble "pings" were what sounded like little chimes).
     Each frame the game sends, per wheel, contact, surface, rolling speed, slip speed, load and how fast the
     tread is turning; bumps, landings, bottoming out and body hits come as events. Water has no sound yet:
     it waits for a recording. */
  function makeFX() {
    let TAU2 = Math.PI * 2, ss = (a, b, x) => {
      let t = Math.max(0, Math.min(1, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };
    /* surfaces in the game's order: grass dirt strip trail rock mud concrete water. Per surface: how rough it
       rolls, how much loose stuff crunches under the tread, how much a spinning tyre throws, how hard it is */
    let ROUGH = [0.55, 1, 0.7, 1.15, 1.3, 0.45, 0.22, 0.3], LOOSE = [0.35, 1, 0.6, 1.25, 0.45, 0, 0.04, 0], THROW = [0.7, 1, 0.9, 1, 0.35, 0, 0, 0], HARD = [0.1, 0.25, 0.35, 0.3, 0.5, 0.03, 1, 0];
    /* a state-variable filter (topology-preserving): low, band and high outputs, safe to sweep */
    class SVF {
      constructor() {
        this.c1 = 0, this.c2 = 0, this.lp = 0, this.bp = 0, this.g = 0.05, this.k = 1.4, this.calc();
      }
      set(f, q, sr) {
        this.g = Math.tan(Math.PI * Math.min(f, sr * 0.45) / sr), this.k = 1 / q, this.calc();
      }
      /* cheap retune for low sweeps (below a few hundred Hz tan(x) is x) */
      setLo(f, q, sr) {
        this.g = Math.PI * f / sr, this.k = 1 / q, this.calc();
      }
      calc() {
        this.a1 = 1 / (1 + this.g * (this.g + this.k)), this.a2 = this.g * this.a1, this.a3 = this.g * this.a2;
      }
      run(x) {
        let v3 = x - this.c2, v1 = this.a1 * this.c1 + this.a2 * v3, v2 = this.c2 + this.a2 * this.c1 + this.a3 * v3;
        return this.c1 = 2 * v1 - this.c1, this.c2 = 2 * v2 - this.c2, this.lp = v2, this.bp = v1, v2;
      }
    }
    /* one-pole low-pass: a = 1 - e^(-2 pi f / sr) */
    let a1p = (f, sr) => 1 - Math.exp(-TAU2 * f / sr);
    /* a stream of tiny impacts (grains of dirt, stones, metal on rock), each a burst of noise that dies away in
       a millisecond or two. Thousands a second fuse into a crunch; a few a second are separate ticks. */
    class Grains {
      constructor(sr) {
        this.sr = sr, this.e = 0, this.d = 0.9;
      }
      run(rate, pw, t0, t1) {
        if (rate > 0 && Math.random() < rate / this.sr) {
          let a = 0.15 + 0.85 * Math.pow(Math.random(), pw);
          a > this.e && (this.e = a), this.d = Math.exp(-1 / ((t0 + Math.random() * (t1 - t0)) * this.sr));
        }
        return this.e *= this.d;
      }
    }
    class FX {
      constructor(sr) {
        this.sr = sr, this.p = {}, this.seed = 22222, this.b = [0, 0, 0], this.brL = 0, this.brR = 0, this.br3 = 0, this.vo = [];
        this.rumL = new SVF(), this.rumR = new SVF(), this.rumU = new SVF(), this.tread = new SVF(), this.lugPh = 0, this.lugJ = 0, this.hpL = 0, this.hpR = 0;
        this.cr = new Grains(sr), this.crH = 0, this.crA = 0, this.crB = 0;
        this.roar = new SVF(), this.roar.set(650, 0.7, sr), this.roarH = 0, this.pel = new Grains(sr), this.pelH = 0, this.pelA = 0, this.pelB = 0, this.jit = 0, this.jitT = 0, this.jitN = 0;
        this.scg = new Grains(sr), this.scH = 0, this.scA = 0, this.scLo = new SVF(), this.scLo.set(150, 0.7, sr);
        this.mud = new SVF(), this.mudPh = 0, this.mudJ = 0;
        this.g = { rumL: 0, rumR: 0, tread: 0, crunch: 0, spin: 0, scr: 0, churn: 0 }, this.lugF = 0, this.mudF = 0, this.T = {};
      }
      set(p) {
        this.p = p;
      }
      rnd() {
        let s = this.seed;
        return s ^= s << 13, s ^= s >>> 17, s ^= s << 5, this.seed = s, (s >>> 0) / 4294967296 * 2 - 1;
      }
      gain(id) {
        let X = this.p.mix;
        return X ? X[id] ? X[id].g ?? 0 : 0 : 1;
      }
      ver(id, d) {
        let X = this.p.mix;
        return X && X[id] && X[id].v || d;
      }
      /* one-shots: a low thud swept down in pitch, a burst of low-passed noise for the attack, and for some a
         clank or crack of band-passed noise. pan: -1 left, 1 right */
      push(V) {
        let sr = this.sr;
        V.t = 0, V.ph = 0, V.nS = 0, V.nS2 = 0, V.nLa = a1p(V.nLp || 300, sr), V.pan = V.pan || 0, V.life = Math.max(V.tau || 0, V.nT || 0, V.cT || 0, V.sqT || 0) * 6 + 0.02;
        V.cA && (V.c1 = new SVF(), V.c1.set(V.cf1, V.cq || 1.2, sr), V.c2 = new SVF(), V.c2.set(V.cf2, V.cq || 1.2, sr));
        V.sqA && (V.sv = new SVF());
        this.vo.length > 26 && this.vo.shift(), this.vo.push(V);
      }
      event(e) {
        let a = Math.max(0, Math.min(1.4, e.a || 0)), side = e.w === void 0 ? 0 : e.w % 2 === 0 ? -0.35 : 0.35, boomy = this.ver("thump", "tight") === "boomy", gT = this.gain("thump"), gH = this.gain("hits");
        if (e.type === "bump" && gT > 0) this.push(boomy ? { f0: 80, f1: 42, ft: 0.04, tau: 0.13, sA: 0.55 * a * gT, nA: 0.9 * a * gT, nLp: 220, nT: 0.018, cA: 0.3 * a * gT, cf1: 210, cf2: 520, cq: 1, cT: 0.018, pan: side } : { f0: 100, f1: 55, ft: 0.025, tau: 0.07, sA: 0.5 * a * gT, nA: 1.1 * a * gT, nLp: 320, nT: 0.012, cA: 0.35 * a * gT, cf1: 260, cf2: 640, cq: 1, cT: 0.014, pan: side });
        else if (e.type === "bottom" && gT > 0) this.push({ f0: 90, f1: 48, ft: 0.03, tau: 0.09, sA: 0.5 * a * gT, nA: 0.8 * a * gT, nLp: 400, nT: 0.015, cA: 0.55 * a * gT, cf1: 380, cf2: 1150, cq: 1.3, cT: 0.025, pan: side });
        else if (e.type === "land" && gT > 0) this.push({ f0: boomy ? 70 : 88, f1: boomy ? 36 : 46, ft: 0.05, tau: boomy ? 0.2 : 0.12, sA: 0.65 * a * gT, nA: 1 * a * gT, nLp: 260, nT: 0.02, cA: 0.35 * a * gT, cf1: 230, cf2: 560, cq: 1, cT: 0.03 }), this.push({ nA: 1.2 * a * gT, nLp: 120, nT: 0.18 });
        else if (e.type === "hit" && gH > 0) {
          let k = e.k;
          k === "rock" ? this.push({ f0: 130, f1: 60, ft: 0.02, tau: 0.06, sA: 0.45 * a * gH, nA: 0.5 * a * gH, nLp: 900, nT: 0.02, cA: 0.9 * a * gH, cf1: 900, cf2: 2400, cq: 0.9, cT: 0.012 }) : k === "wall" ? this.push({ f0: 75, f1: 40, ft: 0.04, tau: 0.12, sA: 0.55 * a * gH, nA: 0.8 * a * gH, nLp: 500, nT: 0.04, cA: 0.35 * a * gH, cf1: 300, cf2: 800, cq: 0.9, cT: 0.05 }) : this.push({ f0: 85, f1: 45, ft: 0.03, tau: 0.1, sA: 0.55 * a * gH, nA: 0.9 * a * gH, nLp: 400, nT: 0.035 });
        }
      }
      process(L, R2, n) {
        let p = this.p, g = this.g, sr = this.sr, T = this.T, cab = p.cabin ? 1 : 0, C = p.c || [0, 0, 0, 0], S = p.s || [1, 1, 1, 1], V = p.v || [0, 0, 0, 0], SL = p.sl || [0, 0, 0, 0], LD = p.ld || [1, 1, 1, 1], WS = p.ws || V, pitch = p.pitch || 0.05;
        /* ---- what each sound should be doing this block ---- */
        let gRoll = this.gain("roll"), gCr = this.gain("crunch"), gSp = this.gain("spin"), gHit = this.gain("hits"), gMud = this.gain("mud"), gravel = this.ver("crunch", "fine") === "gravel", thick = this.ver("mud", "soupy") === "thick", treadOn = this.ver("roll", "rumble") === "tread";
        let rumL = 0, rumR = 0, tread = 0, lugV = 0, crRate = 0, spin = 0, churn = 0, mudRate = 0, mudLug = 0, nMud = 0, vMax = 0;
        for (let w = 0; w < 4; w++) {
          if (!C[w]) continue;
          let si = S[w] | 0, sp = Math.abs(V[w]), sl = SL[w] || 0, ld = Math.min(1.6, LD[w] ?? 1), r = ROUGH[si] * ss(0.4, 22, sp) * (0.55 + 0.45 * ld) * 0.5;
          w % 2 === 0 ? rumL += r : rumR += r, tread += HARD[si] * ss(2, 28, sp) * 0.25, lugV = Math.max(lugV, sp), vMax = Math.max(vMax, sp);
          crRate += LOOSE[si] * (sp * 18 + Math.min(sl, 12) * 12), spin += THROW[si] * ss(1.2, 9, sl);
          si === 5 && (churn += ss(0.3, 5, sl + 0.3 * sp) * 0.5, mudRate += sp * 1.5 + sl * 3, mudLug = Math.max(mudLug, Math.abs(WS[w])), nMud++);
        }
        let cabR = cab ? 1.3 : 1;
        T.rumL = rumL * gRoll * cabR, T.rumR = rumR * gRoll * cabR, T.tread = treadOn ? tread * gRoll * (cab ? 0.6 : 1) : 0, T.crunch = crRate > 0 ? gCr * (cab ? 0.6 : 1) : 0, T.spin = Math.min(2, spin) * gSp, T.churn = Math.min(1.6, churn) * gMud;
        let scr = p.scr || 0, scK = p.scrK | 0;
        T.scr = ss(0.3, 6, scr) * gHit;
        /* the rumble deepens at a crawl and opens up with speed */
        let fc = 70 + Math.min(vMax, 40) * 5;
        this.rumL.set(fc, 0.8, sr), this.rumR.set(fc * 1.04, 0.8, sr), this.rumU.set(fc * 1.9, 0.8, sr);
        let lugF = pitch > 0 ? lugV / pitch : 0;
        this.tread.set(Math.max(140, Math.min(900, lugF * 2)), 1.1, sr);
        this.mud.set(thick ? 180 : 260, 0.8, sr);
        let mudF = pitch > 0 ? mudLug / Math.max(pitch, 0.06) : 0;
        /* filters for the grains: high-pass then two low-passes, no resonance */
        let crHa = a1p(gravel ? 200 : 450, sr), crLa = a1p(cab ? 1500 : gravel ? 2200 : 3e3, sr), pelHa = a1p(900, sr), pelLa = a1p(cab ? 1800 : 3500, sr), scHa = a1p(scK === 1 ? 900 : 450, sr), scLa = a1p(scK === 1 ? 6e3 : 3e3, sr), roarHa = a1p(100, sr);
        let k = 1 - Math.exp(-1 / (sr * 0.04)), vol = (p.vol ?? 1) * 0.25, hp30 = a1p(30, sr), RUM = 0.17;
        for (let i = 0; i < n; i++) {
          for (let q in T) g[q] += (T[q] - g[q]) * k;
          let w = this.rnd(), b = this.b;
          b[0] = 0.99765 * b[0] + w * 0.099046, b[1] = 0.963 * b[1] + w * 0.2965164, b[2] = 0.57 * b[2] + w * 1.0526913;
          let pink = (b[0] + b[1] + b[2] + w * 0.1848) * 0.12, l = 0, r = 0;
          /* tyres rolling: brown noise through a low-pass on each side, the left and right wheels apart */
          if (g.rumL + g.rumR > 1e-5) {
            this.brL = this.brL * 0.996 + this.rnd() * 0.08, this.brR = this.brR * 0.996 + this.rnd() * 0.08;
            let a = this.rumL.run(this.brL), c = this.rumR.run(this.brR);
            /* nothing below 30 Hz: that's drift, not rumble */
            this.hpL += hp30 * (a - this.hpL), this.hpR += hp30 * (c - this.hpR), a = (a - this.hpL) * g.rumL * RUM, c = (c - this.hpR) * g.rumR * RUM;
            /* the upper part of the rumble, the part a phone or laptop speaker can play */
            let u = this.rumU.run(pink * 2.2), ub = this.rumU.bp * (g.rumL + g.rumR) * 0.5 * RUM * 0.9;
            l += a + c * 0.45 + ub, r += c + a * 0.45 + ub;
          }
          /* the tread: band of noise pulsing at the rate the lugs meet the ground */
          if (g.tread > 1e-5) {
            this.lugJ += (this.rnd() * 0.5 - this.lugJ) * 2e-3, this.lugPh += lugF * (1 + 0.15 * this.lugJ) / sr, this.lugPh -= Math.floor(this.lugPh);
            this.tread.run(w);
            let am = 0.5 + 0.5 * Math.cos(TAU2 * this.lugPh), y = this.tread.bp * am * g.tread * 0.5;
            l += y, r += y;
          }
          /* dirt and gravel under the tread */
          if (g.crunch > 1e-5) {
            let e = this.cr.run(crRate * (gravel ? 0.6 : 1), gravel ? 3 : 4, gravel ? 8e-4 : 4e-4, gravel ? 3e-3 : 15e-4), x = w * e;
            this.crH += crHa * (x - this.crH), x -= this.crH, this.crA += crLa * (x - this.crA), this.crB += crLa * (this.crA - this.crB);
            let y = this.crB * g.crunch * (gravel ? 1.1 : 1.3);
            l += y, r += y;
          }
          /* wheelspin: an unsteady roar of dirt and the patter of stones on the wheel wells */
          if (g.spin > 1e-5) {
            --this.jitN <= 0 && (this.jitN = sr / 14, this.jitT = Math.random()), this.jit += (this.jitT - this.jit) * 3e-3;
            let ro = this.roar.run(pink * 2.4);
            this.roarH += roarHa * (ro - this.roarH), ro -= this.roarH;
            let e = this.pel.run(g.spin * 450, 3.5, 4e-4, 15e-4), x = w * e;
            this.pelH += pelHa * (x - this.pelH), x -= this.pelH, this.pelA += pelLa * (x - this.pelA), this.pelB += pelLa * (this.pelA - this.pelB);
            let y = (ro * (0.65 + 0.35 * this.jit) * 0.4 + this.pelB * 0.75) * g.spin;
            l += y, r += y;
          }
          /* the body dragging: stick-slip grains and a low grind */
          if (g.scr > 1e-5) {
            let e = this.scg.run(150 + scr * 90, 2, 4e-4, 12e-4), x = w * e;
            this.scH += scHa * (x - this.scH), x -= this.scH, this.scA += scLa * (x - this.scA), this.br3 = this.br3 * 0.996 + this.rnd() * 0.08;
            let y = (this.scA * 0.7 + this.scLo.run(this.br3) * 0.6) * g.scr;
            l += y, r += y;
          }
          /* mud: low churn slapping at the lug rate, suction, clods hitting the truck */
          if (g.churn > 1e-5 || nMud) {
            if (g.churn > 1e-5) {
              this.mudJ += (this.rnd() * 0.6 - this.mudJ) * 2e-3, this.mudPh += mudF * (1 + 0.18 * this.mudJ) / sr, this.mudPh -= Math.floor(this.mudPh);
              let c = Math.max(0, Math.cos(TAU2 * this.mudPh)), y = this.mud.run(pink * 3) * (0.35 + 0.65 * c * c) * g.churn * 0.17;
              l += y, r += y;
            }
            if (gMud > 0 && Math.random() < mudRate * (thick ? 1.4 : 1) / sr) {
              let a = (0.25 + 0.35 * Math.random()) * gMud;
              this.push({ sqA: a, sqF0: (thick ? 200 : 260) + Math.random() * (thick ? 120 : 160), sqF1: 80 + Math.random() * 50, sqFt: 0.05 + Math.random() * 0.06, sqT: (0.07 + Math.random() * 0.07) * (thick ? 1.4 : 1), pan: Math.random() - 0.5 });
            }
            gMud > 0 && Math.random() < g.churn * 6 / sr && this.push({ f0: 110, f1: 65, ft: 0.02, tau: 0.035, sA: (0.12 + 0.18 * Math.random()) * gMud, nA: (0.18 + 0.25 * Math.random()) * gMud, nLp: 500, nT: 0.012, pan: Math.random() - 0.5 });
          }
          /* the one-shots */
          for (let j = this.vo.length - 1; j >= 0; j--) {
            let Vo = this.vo[j], t = Vo.t, y = 0;
            if (Vo.sqA) {
              let f = Vo.sqF1 + (Vo.sqF0 - Vo.sqF1) * Math.exp(-t / Vo.sqFt);
              Vo.sv.setLo(f, 2.2, sr), Vo.sv.run(this.rnd());
              y = Vo.sv.bp * Vo.sqA * Math.min(1, t / 8e-3) * Math.exp(-t / Vo.sqT) * 0.7;
            } else {
              if (Vo.sA) {
                let f = Vo.f1 + (Vo.f0 - Vo.f1) * Math.exp(-t / Vo.ft);
                Vo.ph += f / sr, y += Math.sin(TAU2 * Vo.ph) * Math.exp(-t / Vo.tau) * Vo.sA;
              }
              Vo.nS += Vo.nLa * (w - Vo.nS), Vo.nS2 += Vo.nLa * (Vo.nS - Vo.nS2), y += Vo.nS2 * Math.exp(-t / Vo.nT) * Vo.nA * 3;
              Vo.cA && (y += (Vo.c1.run(w), Vo.c1.bp + (Vo.c2.run(w), Vo.c2.bp)) * Math.exp(-t / Vo.cT) * Vo.cA);
            }
            y *= 1.6, l += y * (1 - Vo.pan), r += y * (1 + Vo.pan), Vo.t += 1 / sr, Vo.t > Vo.life && this.vo.splice(j, 1);
          }
          L[i] = l * vol, R2[i] = r * vol;
        }
      }
    }
    return FX;
  }

  // src/audio/game-audio.js
  /* the Digital Engine lab's rooms: open air (a ground bounce and the slap off a distant wall), a garage, a tunnel */
  function roomIR(ctx, kind) {
    let sr = ctx.sampleRate, n = Math.round(sr * { open: 0.5, garage: 1.2, tunnel: 2.4 }[kind]), b = ctx.createBuffer(2, n, sr), seed = 1234567, rnd = () => (seed = seed * 16807 % 2147483647, seed / 2147483647 * 2 - 1);
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
      } else if (kind === "garage") {
        for (let [t, a] of [[7e-3, 0.7], [0.013, 0.5], [0.019, 0.45], [0.026, 0.35], [0.034, 0.3], [0.041, 0.28]]) X[Math.round((t + ch * 13e-4) * sr)] += a * (rnd() > 0 ? 1 : -1);
        for (let i = 0; i < n; i++) {
          let t = i / sr;
          lp += 0.45 * (rnd() - lp), X[i] += lp * 0.5 * Math.exp(-t * 5.8) * Math.min(1, t / 0.012);
        }
      } else {
        X[Math.round((45e-4 + ch * 6e-4) * sr)] += 0.5;
        for (let [t, a, d] of [[0.085, 0.22, 12], [0.16, 0.12, 18]]) {
          let s = Math.round((t + ch * 5e-3) * sr);
          for (let q = 0; q < 80; q++) X[s + q] += a * Math.exp(-q / d) * rnd();
        }
        for (let i = 0; i < n; i++) {
          let t = i / sr;
          lp += 0.25 * (rnd() - lp), X[i] += lp * 0.12 * Math.exp(-t * 9) * Math.min(1, t / 0.02);
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
      this.ready = !1, this.starting = null, this.vol = 0.8, this.muted = !1, this.cfg = null, this.yard = 0, this.shop = 0, this.room = "open", this.mix = mixFill(null), this.applyMixParts();
    }
    /* call from a user gesture. The engine runs exactly as the Digital Engine lab plays it: the same synth into
       the same compressor, with the lab's open-air room (its garage inside the shop). The ground and HUD sounds
       have their own buses; a limiter catches peaks at the very end. */
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
        /* the engine: dry plus the lab's room, through the lab's compressor */
        let engIn = G(), engComp = ctx.createDynamicsCompressor(), engBus = G(), sendE = G(0), convE = ctx.createConvolver();
        engComp.threshold.value = -8, engComp.knee.value = 6, engComp.ratio.value = 4, engComp.attack.value = 3e-3, engComp.release.value = 0.15;
        convE.buffer = roomIR(ctx, "open"), engIn.connect(engComp), engIn.connect(sendE), sendE.connect(convE), convE.connect(engComp), engComp.connect(engBus), engBus.connect(pre);
        /* the ground sounds share the room, a little drier */
        let groundBus = G(), sendG = G(0), convG = ctx.createConvolver(), uiBus = G();
        convG.buffer = convE.buffer, groundBus.connect(pre), groundBus.connect(sendG), sendG.connect(convG), convG.connect(pre), uiBus.connect(pre);
        Object.assign(this, { engIn, engComp, engBus, sendE, convE, groundBus, sendG, convG, uiBus });
        this.meters = { engine: A(), ground: A(), ui: A(), master: A() }, engBus.connect(this.meters.engine), groundBus.connect(this.meters.ground), uiBus.connect(this.meters.ui), lim.connect(this.meters.master), this.mbuf = new Float32Array(2048);
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
          /* no worklets: the same three synths on the main thread, each into its own bus */
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
    configure(cfg) {
      this.cfg = cfg, this.ready && this.eng.post({ t: "cfg", cfg });
    }
    applyMixParts() {
      this.mixG = mixFor(this.mix, MIX_GROUND), this.mixU = mixFor(this.mix, MIX_UI), this.uis && this.uis.post({ t: "p", p: { vol: 1, mix: this.mixU } });
    }
    /* apply a mix: bus faders, the limiter, and the per-sound settings */
    setMix(m) {
      if (this.mix = mixFill(m), this.applyMixParts(), !this.ctx) return;
      let t = this.ctx.currentTime, M = this.mix, set = (g, db) => g && g.gain.setTargetAtTime(dbToLin(db), t, 0.03);
      set(this.engBus, M.bus.engine), set(this.groundBus, M.bus.ground), set(this.uiBus, M.bus.ui), this.master.gain.setTargetAtTime(this.muted ? 0 : this.vol * dbToLin(M.bus.master || 0), t, 0.03), this.lim.threshold.value = M.limiter ? -1.5 : 0, this.lim.ratio.value = M.limiter ? 20 : 1;
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
      this.fx.post({ t: "p", p: Object.assign({ mix: this.mixG }, fxP) });
      for (let e of fxEvents) this.fx.post({ t: "ev", ev: e });
      /* the room, as the lab sets it: open air, the garage inside the shop, much less of it from the cab */
      let t = this.ctx.currentTime, c = cabin ? 0.35 : 1, room = shop > 0.5 ? "garage" : "open";
      room !== this.room && (this.room = room, this.convE.buffer = roomIR(this.ctx, room), this.convG.buffer = this.convE.buffer), this.yard += (yard - this.yard) * 0.08, this.shop += (shop - this.shop) * 0.08;
      let send = (room === "garage" ? 0.5 : 0.28 + 0.1 * this.yard) * c;
      this.sendE.gain.setTargetAtTime(send, t, 0.08), this.sendG.gain.setTargetAtTime(send * 0.6, t, 0.08);
    }
    /* one-shot shop and HUD sounds */
    ui(type, extra) {
      this.ready && this.uis && this.uis.post({ t: "ev", ev: Object.assign({ type }, extra || {}) });
    }
  };

