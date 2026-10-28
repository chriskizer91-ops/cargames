  // ===== audio/ambience.js =====
  /* The world around the truck, synthesised live in its own AudioWorklet: rain (several kinds, or drumming
     on the roof from the cab), thunder, wind, birds, day and night insects, the creek, the crowd at the
     strip, and the shop and HUD sounds on a separate output. Which version of each sound plays, and how
     loud, comes from the mix (34_mix.js); how much of each the scene calls for comes from the game. */
  function makeAmb() {
    let TAU = Math.PI * 2;
    class Bq {
      constructor() {
        this.z1 = 0, this.z2 = 0, this.b0 = 1, this.b1 = 0, this.b2 = 0, this.a1 = 0, this.a2 = 0, this.key = "";
      }
      set(type, f, q, sr) {
        let k = type + f + q;
        if (k === this.key) return this;
        this.key = k;
        let w = TAU * Math.min(f, sr * 0.45) / sr, cw = Math.cos(w), al = Math.sin(w) / (2 * q), a0 = 1 + al, b0, b1, b2;
        type === "lp" ? (b0 = (1 - cw) / 2, b1 = 1 - cw, b2 = b0) : type === "hp" ? (b0 = (1 + cw) / 2, b1 = -(1 + cw), b2 = b0) : (b0 = al, b1 = 0, b2 = -al);
        return this.b0 = b0 / a0, this.b1 = b1 / a0, this.b2 = b2 / a0, this.a1 = -2 * cw / a0, this.a2 = (1 - al) / a0, this;
      }
      run(x) {
        let y = this.b0 * x + this.z1;
        return this.z1 = this.b1 * x - this.a1 * y + this.z2, this.z2 = this.b2 * x - this.a2 * y, y;
      }
    }
    /* rain kinds: wash level, low body, drops per second, drop pitch range, decay range (s), drop size, tick */
    let RAIN = {
      patter: { wash: 0.07, low: 0.05, rate: 2400, f0: 1800, span: 3.8, d0: 1.5e-3, d1: 4e-3, a: 0.03, clk: 0.03 },
      drizzle: { wash: 0.035, low: 0.01, rate: 1100, f0: 2600, span: 3, d0: 1e-3, d1: 2.5e-3, a: 0.018, clk: 0.02 },
      downpour: { wash: 0.1, low: 0.14, rate: 4200, f0: 1100, span: 4, d0: 2.5e-3, d1: 6e-3, a: 0.04, clk: 0.05 },
      tin: { wash: 0.03, low: 0.02, rate: 1400, f0: 1700, span: 2.1, d0: 0.025, d1: 0.06, a: 0.02, clk: 0.01, metal: 1 }
    };
    class Amb {
      constructor(sr) {
        this.sr = sr, this.p = {}, this.mix = {}, this.t = 0, this.seed = 987654321, this.b = [0, 0, 0];
        this.g = { rain: 0, wind: 0, birds: 0, day: 0, night: 0, creek: 0, crowd: 0, cab: 0 };
        let B = (type, f, q) => new Bq().set(type, f, q, sr);
        this.rainHP = B("hp", 900, 0.7), this.rainBP = B("bp", 3e3, 0.45), this.rainLow = B("lp", 380, 0.7), this.roofLP = B("lp", 1600, 0.7), this.clkHP = B("hp", 2500, 0.7);
        this.windL = B("bp", 300, 0.6), this.windR = B("bp", 340, 0.6), this.whis = B("bp", 820, 5), this.whis2 = B("bp", 1240, 7), this.roar = B("lp", 120, 0.7), this.rust = B("bp", 2400, 0.7), this.rust2 = B("bp", 3800, 0.9);
        this.crBg = B("bp", 4600, 9), this.cicN = B("bp", 5e3, 2.5), this.hopF = B("bp", 7e3, 2);
        this.creekA = B("bp", 620, 0.9), this.creekB = B("bp", 1900, 1.4);
        this.walla = [B("bp", 420, 2), B("bp", 880, 2.5), B("bp", 1650, 3), B("bp", 2600, 3)], this.wEnv = [0.5, 0.5, 0.5, 0.5], this.wTgt = [0.5, 0.5, 0.5, 0.5], this.clap = B("bp", 2300, 0.6), this.clapE = 0, this.cheer = 0;
        this.drops = [], this.tones = [], this.clk = 0, this.flut = 0, this.nextBird = 2, this.nextThunder = 18 + Math.random() * 20, this.thunders = [], this.ph = [Math.random() * 9, Math.random() * 9, Math.random() * 9];
        this.bugs = [], this.bugKey = "", this.cic = [0, 1].map((i) => ({ st: 0, t: i * 7 + Math.random() * 5, ph: 0, f: 4300 + Math.random() * 500, am: 150 + Math.random() * 80, dur: 0, lv: 0.7 + Math.random() * 0.3 })), this.hop = { t: 4, n: 0, gap: 0, e: 0 };
      }
      set(p) {
        this.p = p, p.mix && (this.mix = p.mix);
      }
      M(id) {
        return this.mix[id] || { g: 1 };
      }
      rnd() {
        let s = this.seed;
        return s ^= s << 13, s ^= s >>> 17, s ^= s << 5, this.seed = s, (s >>> 0) / 4294967296;
      }
      /* a damped resonator: a raindrop, a bubble, a tick. Two modes when metal */
      drop(f, dec, amp, pan, metal = 0) {
        if (this.drops.length > 90) return;
        let mk = (ff, aa) => {
          let w = TAU * Math.min(ff, this.sr * 0.45) / this.sr, r = Math.exp(-1 / (dec * this.sr));
          this.drops.push({ a1: 2 * r * Math.cos(w), a2: r * r, y1: aa * Math.sin(w), y2: 0, n: Math.round(dec * this.sr * 6), pl: 1 - Math.max(0, pan), pr: 1 + Math.min(0, pan) });
        };
        mk(f, amp), metal && mk(f * 1.47, amp * 0.6);
      }
      /* pitched voices. kind 0 bird, 1 bell (UI), 2 outdoor whistle, 3 dove (soft, with a second harmonic) */
      tone(at, dur, f0, f1, amp, pan, kind = 0, fm = 0) {
        this.tones.length < 32 && this.tones.push({ at: this.t + at, dur, f0, f1, amp, ph: 0, pl: 1 - Math.max(0, pan), pr: 1 + Math.min(0, pan), kind, fm });
      }
      thunder(kind = "rolling") {
        let dist = kind === "crack" ? Math.random() * 0.2 : kind === "distant" ? 0.7 + Math.random() * 0.3 : Math.random(), sw = [];
        for (let k = 0, n = 3 + Math.floor(Math.random() * 3), t = 0.2 + dist * 1.5; k < n; k++) sw.push([t, 0.4 + Math.random() * 0.6, 0.35 + Math.random() * 0.9]), t += 0.4 + Math.random() * 1.3;
        this.thunders.push({ t: 0, sw, crack: dist < 0.35 ? kind === "crack" ? 1.1 : 0.6 : 0, c: 1 - Math.exp(-TAU * (40 + (1 - dist) * 70) / this.sr), y1: 0, y2: 0, cy: 0, amp: (0.55 - dist * 0.3) * (kind === "crack" ? 1.3 : 1), dur: 9 });
      }
      bird(kind) {
        let pan = this.rnd() * 1.6 - 0.8, d = 0.35 + this.rnd() * 0.65, a = 0.045 * d, base = 0.85 + this.rnd() * 0.3;
        if (kind === "mixed") {
          let q = this.rnd();
          kind = q < 0.5 ? "songbirds" : q < 0.8 ? "meadowlark" : "doves";
        }
        if (a *= kind === "meadowlark" ? 2.2 : kind === "doves" ? 3 : 4.5, kind === "meadowlark") {
          let f = 2900 * base, t = 0;
          for (let i = 0, c = 5 + Math.floor(this.rnd() * 3); i < c; i++) {
            let dur = 0.08 + this.rnd() * 0.13, f1 = f * (0.82 + this.rnd() * 0.12);
            this.tone(t, dur, f, f1, a * 0.9, pan, 0, 0.15), t += dur + 0.03, f = f1 * (1.05 + this.rnd() * 0.15);
          }
          for (let i = 0; i < 6; i++) this.tone(t + i * 0.03, 0.025, 3800 * base, 3500 * base, a * 0.5, pan, 0, 0.3);
        } else if (kind === "doves") {
          let f = 470 * base, a2 = a * 2.2;
          [[0, 0.32, 1, 1.06], [0.42, 0.55, 1.08, 1.18], [1.05, 0.34, 1.02, 0.98], [1.5, 0.34, 1, 0.97], [1.95, 0.36, 0.99, 0.95]].forEach(([t, dur, k0, k1]) => this.tone(t, dur, f * k0, f * k1, a2, pan, 3));
        } else {
          let sp = Math.floor(this.rnd() * 3);
          if (sp === 0) for (let i = 0, c = 2 + Math.floor(this.rnd() * 3); i < c; i++) this.tone(i * 0.11, 0.07, 5200 * base, 3100 * base, a, pan);
          else if (sp === 1) this.tone(0, 0.26, 2200 * base, 3100 * base, a * 0.9, pan), this.tone(0.34, 0.3, 3e3 * base, 2500 * base, a * 0.8, pan);
          else for (let i = 0, c = 7 + Math.floor(this.rnd() * 7); i < c; i++) this.tone(i * 0.045, 0.03, 4e3 * base, 4300 * base, a * 0.7, pan, 0, 0.3);
        }
      }
      /* (re)build the night insect voices when their settings change */
      bugVoices(m) {
        let key = [m.v, m.n, (m.pitch ?? 0.5).toFixed(2), (m.rate ?? 0.5).toFixed(2)].join();
        if (key === this.bugKey) return;
        this.bugKey = key;
        let v = m.v || "field", n = Math.max(1, Math.min(6, Math.round(m.n ?? 3))), P = m.pitch ?? 0.5, Rt = m.rate ?? 0.5, out = [], mk = (kind, i) => {
          let d = 0.25 + this.rnd() * 0.75;
          return { kind, d, lpA: 1 - Math.exp(-TAU * (2500 + 7e3 * d) / this.sr), lp: 0, pan: (this.rnd() * 2 - 1) * 0.8, t: this.rnd() * 2, ph: 0, cp: 0, f: (kind === "tree" ? 2400 + 1200 * P : 3600 + 2200 * P) * (0.95 + this.rnd() * 0.1), per: (0.78 - 0.4 * Rt) * (0.9 + this.rnd() * 0.2), sp: 1 / ((28 + 14 * Rt) * (0.95 + this.rnd() * 0.1)), np: 3 + (this.rnd() < 0.35 ? 1 : 0), on: 1, onT: 2 + this.rnd() * 3, kf: 7e3 + 4e3 * P, kE: 0, kN: 0, kS: 0, kNext: 0.5 + this.rnd(), bq: kind === "katydid" ? new Bq().set("bp", (7e3 + 4e3 * P) * (0.92 + this.rnd() * 0.16), 4, this.sr) : null };
        };
        if (v === "field" || v === "mixed") for (let i = 0; i < n; i++) out.push(mk("field", i));
        if (v === "tree") for (let i = 0; i < n; i++) out.push(mk("tree", i));
        if (v === "katydid") for (let i = 0; i < Math.min(4, n); i++) out.push(mk("katydid", i));
        v === "mixed" && out.push(mk("katydid", 9)), this.bugs = out, this.bugMode = v;
      }
      event(e) {
        let T = e.type;
        if (T === "thunder") this.thunder(e.kind || (this.M("thunder").v || "rolling"));
        else if (T === "cheer") {
          this.cheer = Math.max(this.cheer, e.a || 1);
          for (let k = 0; k < 4; k++) this.tone(0.2 + Math.random() * 1.2, 0.35 + Math.random() * 0.3, 2400 + Math.random() * 500, 3e3 + Math.random() * 700, 0.02, Math.random() * 1.6 - 0.8, 2);
        } else if (T === "bird") this.bird(e.kind || this.M("birds").v || "mixed");
        else if (T === "kaching") this.tone(0, 0.8, 2093, 2093, 0.07, 0.1, 1), this.tone(0.02, 0.7, 2637, 2637, 0.05, -0.1, 1), this.tone(0.05, 0.5, 4186, 4186, 0.02, 0, 1), this.clk += 0.6;
        else if (T === "chime") this.tone(0, 0.45, 1319, 1319, 0.06, 0, 1), this.tone(0.1, 0.6, 1760, 1760, 0.06, 0, 1), this.tone(0.2, 0.8, 2637, 2637, 0.03, 0, 1);
        else if (T === "tick") this.tone(0, 0.05, 1900, 1900, 0.09, 0, 1), this.tone(0, 0.07, 950, 950, 0.06, 0, 1);
        else if (T === "trophy" || T === "medal") (T === "trophy" ? [1047, 1319, 1568, 2093] : [1319, 1568, 2093]).forEach((f, i, a) => this.tone(i * 0.11, 0.9, f, f, 0.05, (i - (a.length - 1) / 2) * 0.2, 1));
      }
      process(L, R, n, UL, UR) {
        let p = this.p, g = this.g, sr = this.sr, dt = 1 / sr, k = 1 - Math.exp(-1 / (sr * 0.4)), cab = p.cabin ? 1 : 0, M = (id) => this.M(id);
        let mRain = M("rain"), mRoof = M("roof"), mTh = M("thunder"), mWind = M("wind"), mBird = M("birds"), mDay = M("daybugs"), mNight = M("nightbugs"), mCreek = M("creek"), mCrowd = M("crowd"), mUI = M("ui");
        let tg = { rain: p.rain || 0, wind: p.wind || 0, birds: p.birds || 0, day: p.dayBugs || 0, night: p.crickets || 0, creek: p.creek || 0, crowd: p.crowd || 0, cab };
        /* thunder rolls in on its own in a storm */
        p.storm && g.rain > 0.15 && this.t > this.nextThunder && mTh.g > 0 && (this.thunder(mTh.v || "rolling"), this.nextThunder = this.t + (mTh.every || 28) * (0.5 + Math.random()));
        g.birds > 0.05 && this.t > this.nextBird && mBird.g > 0 && (this.bird(mBird.v || "mixed"), this.nextBird = this.t + (1.5 + this.rnd() * 4.5) / ((0.4 + g.birds) * (mBird.rate || 1)) * ((mBird.v || "") === "doves" ? 2.5 : 1));
        this.bugVoices(mNight);
        let rk = RAIN[mRain.v] || RAIN.patter, br = mRain.bright ?? 0.5, fm = 0.65 + 0.7 * br, dens = mRain.dens ?? 1, soft = mRoof.v === "soft", wv = mWind.v || "breeze", gust = mWind.gust ?? 0.5, cv = mCreek.v || "babble", stad = mCrowd.v === "stadium", nv = this.bugMode;
        this.rainBP.set("bp", 2e3 + 3e3 * br, 0.45, sr), this.roofLP.set("lp", soft ? 800 : 1600, 0.7, sr), this.creekA.set("bp", cv === "rush" ? 380 : 620, 0.9, sr), this.crBg.set("bp", 3600 + 2200 * (mNight.pitch ?? 0.5), 9, sr);
        let out = 1 - 0.7 * g.cab, vol = p.vol ?? 1, uiv = (p.uiVol ?? 1) * (mUI.g ?? 1);
        for (let i = 0; i < n; i++) {
          for (let key in tg) g[key] += (tg[key] - g[key]) * k;
          this.t += dt;
          let wn = this.rnd() * 2 - 1, b = this.b;
          b[0] = 0.99765 * b[0] + wn * 0.099046, b[1] = 0.963 * b[1] + wn * 0.2965164, b[2] = 0.57 * b[2] + wn * 1.0526913;
          let pink = (b[0] + b[1] + b[2] + wn * 0.1848) * 0.12, l = 0, r = 0, u = 0;
          /* ---- rain ---- */
          if (g.rain > 1e-3) {
            this.flut += (this.rnd() - 0.5) * 2e-3 - this.flut * 2e-4;
            let gr = mRain.g ?? 1, gro = mRoof.g ?? 1, wash = (this.rainBP.run(this.rainHP.run(wn)) * rk.wash * (1 + this.flut * 4) + this.rainLow.run(pink) * rk.low * g.rain) * g.rain * gr, roof = this.roofLP.run(pink) * g.rain * (soft ? 0.05 : 0.06) * gro, mixed = wash * (1 - 0.8 * g.cab) + roof * g.cab;
            l += mixed, r += mixed * 0.96;
            if (g.cab > 0.5) {
              if (this.rnd() < g.rain * 1100 * dt && gro > 0) {
                let q = this.rnd();
                soft ? this.drop(150 + 450 * this.rnd(), 0.01 + 0.015 * this.rnd(), (0.01 + 0.06 * q * q * q) * g.rain * gro, (this.rnd() - 0.5) * 1.2) : this.drop(380 + 1e3 * this.rnd(), 6e-3 + 0.01 * this.rnd(), (8e-3 + 0.05 * q * q * q) * g.rain * gro, (this.rnd() - 0.5) * 1.2);
              }
            } else if (this.rnd() < g.rain * rk.rate * dens * dt && gr > 0) {
              let q = this.rnd(), pan = this.rnd() * 1.8 - 0.9;
              this.drop(rk.f0 * fm * Math.pow(rk.span, this.rnd()), rk.d0 + (rk.d1 - rk.d0) * this.rnd(), (rk.a * 0.18 + rk.a * q * q * q) * g.rain * gr, pan, rk.metal), this.clk += rk.clk * q * g.rain * gr;
            }
          }
          /* ---- thunder ---- */
          for (let j = this.thunders.length - 1; j >= 0; j--) {
            let T = this.thunders[j];
            T.t += dt, T.y1 += T.c * (wn - T.y1), T.y2 += T.c * (T.y1 - T.y2), T.cy += 0.12 * (wn - T.cy);
            let e = 0;
            for (let [t0, a, w] of T.sw) e += a * Math.exp(-(((T.t - t0) / w) ** 2));
            let s = (T.y2 * 9 * e * T.amp + (T.t < 0.35 ? T.cy * T.crack * (1 - T.t / 0.35) ** 2 * 0.5 : 0)) * (mTh.g ?? 1);
            l += s * (0.6 + 0.4 * out), r += s * (0.6 + 0.4 * out), T.t > T.dur && this.thunders.splice(j, 1);
          }
          /* ---- wind ---- */
          if (g.wind > 1e-3 && (mWind.g ?? 1) > 0) {
            let dep = 0.3 + 0.9 * gust, gu = 0.55 + dep * (0.25 * Math.sin(TAU * 0.071 * this.t + this.ph[0]) + 0.15 * Math.sin(TAU * 0.13 * this.t + this.ph[1]) + 0.1 * Math.sin(TAU * 0.29 * this.t + this.ph[2])), w = g.wind * Math.max(0, gu) ** 2 * out * (mWind.g ?? 1);
            if (wv === "grass") {
              this.flut2 = (this.flut2 || 0) * 0.9995 + (this.rnd() - 0.5) * 0.004;
              let rs = (this.rust.run(wn) * 0.6 + this.rust2.run(wn) * 0.4) * w * (0.03 + Math.abs(this.flut2) * 3) * 1.4;
              l += this.windL.run(pink) * w * 0.3 + rs, r += this.windR.run(pink * 0.9 + wn * 0.02) * w * 0.3 + rs * 0.9;
            } else {
              let pl = wv === "plains", body = pl ? 0.2 : 0.5;
              l += this.windL.run(pink) * w * body + this.whis.run(wn) * w * w * (pl ? 0.03 : 0.035) + (pl ? this.roar.run(pink * 3) * w * 0.25 : 0), r += this.windR.run(pink * 0.9 + wn * 0.02) * w * body + (pl ? this.whis2.run(wn) * w * w * 0.02 + this.roar.run(pink * 3) * w * 0.05 : 0);
            }
          }
          /* ---- insects at night ---- */
          if (g.night > 0.01 && (mNight.g ?? 1) > 0) {
            let gn = g.night * (mNight.g ?? 1) * out;
            for (let c of this.bugs) {
              let s = 0;
              c.t += dt;
              if (c.kind === "field") {
                let tc = c.t % c.per, kk = Math.floor(tc / c.sp);
                if (tc < dt && (c.per *= 0.97 + this.rnd() * 0.06, c.per = Math.min(1.1, Math.max(0.3, c.per))), kk < c.np) {
                  let fp = (tc - kk * c.sp) / c.sp;
                  if (fp < 0.55) {
                    c.cp += c.f * (1 - 0.02 * fp) * dt;
                    let env = Math.min(1, fp / 0.05) * Math.exp(-fp * 3);
                    s = Math.sin(TAU * c.cp) * (0.7 + 0.3 * Math.sin(TAU * c.f * 0.31 * tc)) * env * 0.24 * c.d;
                  }
                }
              } else if (c.kind === "tree") {
                if (c.t > c.onT && (c.on = 1 - c.on, c.t = 0, c.onT = c.on ? 2 + this.rnd() * 4 : 0.5 + this.rnd() * 1.5), c.on) {
                  let fp = c.t / c.sp % 1;
                  c.cp += c.f * dt, s = Math.sin(TAU * c.cp) * Math.sin(Math.PI * fp) ** 2 * Math.min(1, c.t * 2) * 0.04 * c.d;
                }
              } else {
                if (c.t > c.kNext && (c.kN = 2 + Math.floor(this.rnd() * 2), c.kS = 0, c.kE = 0, c.kNext = c.t + (1.3 - 0.5 * (mNight.rate ?? 0.5)) * (0.85 + this.rnd() * 0.3), c.kSyl = 0), c.kN > 0) {
                  c.kE += dt;
                  let pulse = Math.floor(c.kE / 0.02), within = c.kE - pulse * 0.02;
                  pulse < 5 ? within < 4e-3 && (s = wn * (1 - within / 4e-3) * 0.36 * c.d) : c.kE > 0.17 && (c.kE = 0, c.kN--);
                }
                s = c.bq.run(s);
              }
              c.lp += c.lpA * (s - c.lp), l += c.lp * gn * (1 - Math.max(0, c.pan)), r += c.lp * gn * (1 + Math.min(0, c.pan));
            }
            if (nv === "chorus" || nv === "mixed") {
              let bg = this.crBg.run(wn) * (0.55 + 0.45 * Math.sin(TAU * 23 * this.t)) * (0.65 + 0.35 * Math.sin(TAU * 0.31 * this.t)) * gn * (nv === "chorus" ? 0.1 * (mNight.n || 3) / 3 : 0.04);
              l += bg, r += bg * 0.9;
            }
          }
          /* ---- insects by day ---- */
          if (g.day > 0.01 && (mDay.g ?? 1) > 0 && mDay.v !== "off") {
            let gd = g.day * (mDay.g ?? 1) * out;
            if (mDay.v === "hopper") {
              let H = this.hop;
              H.t -= dt, H.t <= 0 && (H.n = 8 + Math.floor(this.rnd() * 12), H.gap = 1 / (25 + this.rnd() * 15), H.t = 3 + this.rnd() * 6, H.next = 0), H.n > 0 && (H.next -= dt, H.next <= 0 && (H.e = 1, H.n--, H.next = H.gap)), H.e *= 0.93;
              let s = this.hopF.run(wn * H.e) * 0.5 * gd;
              l += s * 0.8, r += s;
            } else for (let C of this.cic) {
              if (C.t -= dt, C.t <= 0) C.st = (C.st + 1) % 4, C.t = [5 + this.rnd() * 10, 3 + this.rnd() * 2, 3 + this.rnd() * 4, 1.5 + this.rnd()][C.st], C.dur = C.t;
              if (C.st === 0) continue;
              let x = 1 - C.t / C.dur, env = C.st === 1 ? x * x : C.st === 2 ? 1 : (1 - x) ** 2;
              C.ph += C.f * (1 + 0.03 * env) * dt;
              let am = Math.pow(0.5 + 0.5 * Math.sin(TAU * C.am * this.t), 4), s = (Math.sin(TAU * C.ph) * 0.6 + this.cicN.run(wn) * 2.5) * am * env * 0.076 * C.lv * gd;
              l += s, r += s * 0.85;
            }
          }
          /* ---- the creek ---- */
          if (g.creek > 1e-3 && (mCreek.g ?? 1) > 0) {
            let gc = g.creek * (mCreek.g ?? 1) * out, bed = cv === "trickle" ? 0.3 : cv === "rush" ? 2.2 : 1, s = (this.creekA.run(pink * 2) * (0.6 + this.flut * 30) + this.creekB.run(wn) * 0.12) * 0.09 * bed * gc;
            l += s, r += s * 0.92;
            let br2 = cv === "trickle" ? 2.5 : cv === "rush" ? 0.4 : 1;
            this.rnd() < g.creek * 35 * br2 * dt && this.drop(cv === "trickle" ? 600 + 1600 * this.rnd() : 300 + 1100 * this.rnd(), 0.01 + 0.02 * this.rnd(), (cv === "trickle" ? 0.018 : 0.025) * gc, this.rnd() * 1.4 - 0.7);
          }
          /* ---- the crowd at the strip ---- */
          if (this.cheer *= 1 - dt / 3.2, (g.crowd > 1e-3 || this.cheer > 1e-3) && (mCrowd.g ?? 1) > 0) {
            if ((i & 63) === 0) for (let j = 0; j < 4; j++) this.rnd() < 0.02 && (this.wTgt[j] = 0.2 + this.rnd() * 0.8), this.wEnv[j] += (this.wTgt[j] - this.wEnv[j]) * 0.05;
            let lev = (g.crowd + this.cheer * 1.6) * out * (mCrowd.g ?? 1), s = 0;
            for (let j = 0; j < (stad ? 4 : 3); j++) s += this.walla[j].run(pink * 2.2) * this.wEnv[j];
            this.rnd() < this.cheer * (stad ? 2200 : 1100) * dt && (this.clapE += 0.4 + this.rnd() * 0.6), this.clapE *= 0.82;
            s = s * lev * (stad ? 0.08 : 0.05) + this.clap.run(wn * this.clapE) * this.cheer * 0.05 * out * (mCrowd.g ?? 1), l += s, r += s * 0.95;
          }
          /* ---- drops, bubbles ---- */
          for (let j = this.drops.length - 1; j >= 0; j--) {
            let D = this.drops[j], y = D.a1 * D.y1 - D.a2 * D.y2;
            D.y2 = D.y1, D.y1 = y, l += y * D.pl, r += y * D.pr, --D.n <= 0 && this.drops.splice(j, 1);
          }
          this.clk *= 0.55;
          let ck = this.clkHP.run(wn * this.clk) * 0.6;
          l += ck, r += ck;
          /* ---- pitched voices: birds, whistles, bells ---- */
          for (let j = this.tones.length - 1; j >= 0; j--) {
            let T = this.tones[j], tt = this.t - T.at;
            if (tt < 0) continue;
            if (tt > T.dur) {
              this.tones.splice(j, 1);
              continue;
            }
            let x = tt / T.dur, f = T.f0 + (T.f1 - T.f0) * x;
            T.fm && (f *= 1 + T.fm * 0.05 * Math.sin(TAU * 45 * tt)), T.ph += f * dt;
            let env = T.kind === 1 ? Math.exp(-x * 4.5) * Math.min(1, tt / 2e-3) : T.kind === 3 ? Math.sin(Math.PI * x) ** 1.5 * Math.min(1, tt / 0.04) : Math.sin(Math.PI * x) ** 2, s = Math.sin(TAU * T.ph) * env * T.amp;
            if (T.kind === 1) u += s + Math.sin(TAU * T.ph * 2.76) * env * env * T.amp * 0.25;
            else {
              T.kind === 3 && (s += Math.sin(TAU * T.ph * 2) * env * T.amp * 0.25);
              let gb = (T.kind === 0 || T.kind === 3 ? g.birds * (mBird.g ?? 1) : mCrowd.g ?? 1) * out;
              l += s * gb * T.pl, r += s * gb * T.pr;
            }
          }
          u *= uiv, L[i] = l * vol, R[i] = r * vol, UL ? (UL[i] = u, UR[i] = u) : (L[i] += u, R[i] += u);
        }
      }
    }
    return Amb;
  }
