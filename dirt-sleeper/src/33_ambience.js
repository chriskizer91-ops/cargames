  // ===== audio/ambience.js =====
  /* The world around the truck, synthesised live: rain (a dense patter of tiny drops over a soft wash, or
     drumming on the roof from inside the cab), thunder, gusting wind, birds by day, crickets at dusk and
     night, the creek, the crowd at the strip, and the little sounds of the shop and the HUD. Runs in its
     own AudioWorklet so none of it touches the engine synth. */
  function makeAmb() {
    let TAU = Math.PI * 2;
    class Bq {
      constructor() {
        this.z1 = 0, this.z2 = 0, this.b0 = 1, this.b1 = 0, this.b2 = 0, this.a1 = 0, this.a2 = 0;
      }
      set(type, f, q, sr) {
        let w = TAU * Math.min(f, sr * 0.45) / sr, cw = Math.cos(w), al = Math.sin(w) / (2 * q), a0 = 1 + al, b0, b1, b2;
        type === "lp" ? (b0 = (1 - cw) / 2, b1 = 1 - cw, b2 = b0) : type === "hp" ? (b0 = (1 + cw) / 2, b1 = -(1 + cw), b2 = b0) : (b0 = al, b1 = 0, b2 = -al);
        return this.b0 = b0 / a0, this.b1 = b1 / a0, this.b2 = b2 / a0, this.a1 = -2 * cw / a0, this.a2 = (1 - al) / a0, this;
      }
      run(x) {
        let y = this.b0 * x + this.z1;
        return this.z1 = this.b1 * x - this.a1 * y + this.z2, this.z2 = this.b2 * x - this.a2 * y, y;
      }
    }
    class Amb {
      constructor(sr) {
        this.sr = sr, this.p = {}, this.t = 0, this.seed = 987654321, this.b = [0, 0, 0], this.g = { rain: 0, wind: 0, birds: 0, crick: 0, creek: 0, crowd: 0, cab: 0 };
        let B = (type, f, q) => new Bq().set(type, f, q, sr);
        this.rainHP = B("hp", 900, 0.7), this.rainBP = B("bp", 3000, 0.45), this.rainLow = B("lp", 380, 0.7), this.roofLP = B("lp", 1600, 0.7), this.clkHP = B("hp", 2500, 0.7);
        this.windL = B("bp", 300, 0.6), this.windR = B("bp", 340, 0.6), this.whis = B("bp", 820, 5), this.crBg = B("bp", 4600, 9), this.creekA = B("bp", 620, 0.9), this.creekB = B("bp", 1900, 1.4);
        this.walla = [B("bp", 420, 2), B("bp", 880, 2.5), B("bp", 1650, 3)], this.wEnv = [0.5, 0.5, 0.5], this.wTgt = [0.5, 0.5, 0.5], this.clap = B("bp", 2300, 0.6), this.clapE = 0, this.cheer = 0;
        this.drops = [], this.tones = [], this.clk = 0, this.flut = 0, this.nextBird = 2, this.nextThunder = 20 + Math.random() * 20, this.thunders = [], this.ph = [Math.random() * 9, Math.random() * 9, Math.random() * 9];
        this.crick = [0, 1, 2].map((i) => ({ f: 4250 + Math.random() * 600, per: 0.42 + Math.random() * 0.25, rate: 26 + Math.random() * 8, n: 3 + (Math.random() < 0.4 ? 1 : 0), ph: Math.random(), cp: 0, amp: 0.022 + Math.random() * 0.016, pan: (i - 1) * 0.7 }));
      }
      set(p) {
        this.p = p;
      }
      rnd() {
        let s = this.seed;
        return s ^= s << 13, s ^= s >>> 17, s ^= s << 5, this.seed = s, (s >>> 0) / 4294967296;
      }
      /* a damped resonator: a raindrop, a bubble, a tick */
      drop(f, dec, amp, pan) {
        if (this.drops.length > 72) return;
        let w = TAU * f / this.sr, r = Math.exp(-1 / (dec * this.sr));
        this.drops.push({ a1: 2 * r * Math.cos(w), a2: r * r, y1: amp * Math.sin(w), y2: 0, n: Math.round(dec * this.sr * 6), pl: 1 - Math.max(0, pan), pr: 1 + Math.min(0, pan) });
      }
      /* a pitched voice: kind 0 is a bird note (soft in and out, pitch glides), kind 1 a bell (struck, decays) */
      tone(at, dur, f0, f1, amp, pan, kind = 0, fm = 0) {
        this.tones.length < 24 && this.tones.push({ at: this.t + at, dur, f0, f1, amp, ph: 0, pl: 1 - Math.max(0, pan), pr: 1 + Math.min(0, pan), kind, fm });
      }
      thunder(dist = Math.random()) {
        let sw = [];
        for (let k = 0, n = 3 + Math.floor(Math.random() * 3), t = 0.2 + dist * 1.5; k < n; k++) sw.push([t, 0.4 + Math.random() * 0.6, 0.35 + Math.random() * 0.9]), t += 0.4 + Math.random() * 1.3;
        this.thunders.push({ t: 0, sw, crack: dist < 0.35 ? 0.6 : 0.15, c: 1 - Math.exp(-TAU * (55 + (1 - dist) * 60) / this.sr), y1: 0, y2: 0, cy: 0, amp: 0.55 - dist * 0.3, dur: 9 });
      }
      event(e) {
        let T = e.type;
        if (T === "thunder") this.thunder(e.dist);
        else if (T === "cheer") {
          this.cheer = Math.max(this.cheer, e.a || 1);
          for (let k = 0; k < 4; k++) this.tone(0.2 + Math.random() * 1.2, 0.35 + Math.random() * 0.3, 2400 + Math.random() * 500, 3000 + Math.random() * 700, 0.02, Math.random() * 1.6 - 0.8, 2);
        } else if (T === "kaching") this.tone(0, 0.8, 2093, 2093, 0.07, 0.1, 1), this.tone(0.02, 0.7, 2637, 2637, 0.05, -0.1, 1), this.tone(0.05, 0.5, 4186, 4186, 0.02, 0, 1), this.clk += 0.6;
        else if (T === "chime") this.tone(0, 0.45, 1319, 1319, 0.06, 0, 1), this.tone(0.1, 0.6, 1760, 1760, 0.06, 0, 1), this.tone(0.2, 0.8, 2637, 2637, 0.03, 0, 1);
        else if (T === "tick") this.drop(1900, 0.01, 0.12, 0), this.drop(950, 0.014, 0.08, 0);
        else if (T === "trophy" || T === "medal") {
          let ns = T === "trophy" ? [1047, 1319, 1568, 2093] : [1319, 1568, 2093];
          ns.forEach((f, i) => this.tone(i * 0.11, 0.9, f, f, 0.05, (i - 1.5) * 0.2, 1));
        }
      }
      process(L, R, n) {
        let p = this.p, g = this.g, sr = this.sr, k = 1 - Math.exp(-1 / (sr * 0.4)), cab = p.cabin ? 1 : 0, tg = { rain: p.rain || 0, wind: p.wind || 0, birds: p.birds || 0, crick: p.crickets || 0, creek: p.creek || 0, crowd: p.crowd || 0, cab };
        /* thunder rolls in on its own in a storm */
        p.storm && g.rain > 0.15 && this.t > this.nextThunder && (this.thunder(), this.nextThunder = this.t + 14 + Math.random() * 30);
        /* birds call in phrases */
        if (g.birds > 0.05 && this.t > this.nextBird) {
          let sp = Math.floor(this.rnd() * 3), pan = this.rnd() * 1.6 - 0.8, d = 0.35 + this.rnd() * 0.65, a = 0.045 * d, base = 0.85 + this.rnd() * 0.3;
          if (sp === 0) for (let i = 0, c = 2 + Math.floor(this.rnd() * 3); i < c; i++) this.tone(i * 0.11, 0.07, 5200 * base, 3100 * base, a, pan);
          else if (sp === 1) this.tone(0, 0.26, 2200 * base, 3100 * base, a * 0.9, pan), this.tone(0.34, 0.3, 3000 * base, 2500 * base, a * 0.8, pan);
          else for (let i = 0, c = 7 + Math.floor(this.rnd() * 7); i < c; i++) this.tone(i * 0.045, 0.03, 4000 * base, 4300 * base, a * 0.7, pan, 0, 0.3);
          this.nextBird = this.t + (1.5 + this.rnd() * 4.5) / (0.4 + g.birds);
        }
        let out = 1 - 0.7 * g.cab, vol = p.vol ?? 1, uiv = p.uiVol ?? 1, dt = 1 / sr;
        for (let i = 0; i < n; i++) {
          for (let key in tg) g[key] += (tg[key] - g[key]) * k;
          this.t += dt;
          let wn = this.rnd() * 2 - 1, b = this.b;
          b[0] = 0.99765 * b[0] + wn * 0.099046, b[1] = 0.963 * b[1] + wn * 0.2965164, b[2] = 0.57 * b[2] + wn * 1.0526913;
          let pink = (b[0] + b[1] + b[2] + wn * 0.1848) * 0.12, l = 0, r = 0, u = 0;
          /* ---- rain ---- */
          if (g.rain > 1e-3) {
            this.flut += (this.rnd() - 0.5) * 2e-3 - this.flut * 2e-4;
            let wash = this.rainBP.run(this.rainHP.run(wn)) * g.rain * 0.07 * (1 + this.flut * 4) + this.rainLow.run(pink) * g.rain * g.rain * 0.05, roof = this.roofLP.run(pink) * g.rain * 0.06;
            l += (wash * (1 - 0.8 * g.cab) + roof * g.cab) * 1, r += (wash * (1 - 0.8 * g.cab) + roof * g.cab) * 0.96;
            let rate = g.rain * (g.cab > 0.5 ? 1100 : 2400);
            if (this.rnd() < rate * dt) {
              let q = this.rnd(), pan = this.rnd() * 1.8 - 0.9;
              g.cab > 0.5 ? this.drop(380 + 1000 * this.rnd(), 6e-3 + 0.01 * this.rnd(), (0.008 + 0.05 * q * q * q) * g.rain, pan * 0.6) : (this.drop(1800 * Math.pow(3.8, this.rnd()), 1.5e-3 + 2.5e-3 * this.rnd(), (5e-3 + 0.03 * q * q * q) * g.rain, pan), this.clk += 0.03 * q * g.rain);
            }
          }
          /* ---- thunder ---- */
          for (let j = this.thunders.length - 1; j >= 0; j--) {
            let T = this.thunders[j];
            T.t += dt, T.y1 += T.c * (wn - T.y1), T.y2 += T.c * (T.y1 - T.y2), T.cy += 0.12 * (wn - T.cy);
            let e = 0;
            for (let [t0, a, w] of T.sw) e += a * Math.exp(-(((T.t - t0) / w) ** 2));
            let s = T.y2 * 9 * e * T.amp + (T.t < 0.35 ? T.cy * T.crack * (1 - T.t / 0.35) ** 2 * 0.5 : 0);
            l += s * (0.6 + 0.4 * out), r += s * (0.6 + 0.4 * out), T.t > T.dur && this.thunders.splice(j, 1);
          }
          /* ---- wind ---- */
          if (g.wind > 1e-3) {
            let gust = 0.55 + 0.25 * Math.sin(TAU * 0.071 * this.t + this.ph[0]) + 0.15 * Math.sin(TAU * 0.13 * this.t + this.ph[1]) + 0.1 * Math.sin(TAU * 0.29 * this.t + this.ph[2]), w = g.wind * Math.max(0, gust) ** 2 * out;
            l += this.windL.run(pink) * w * 0.16 + this.whis.run(wn) * w * w * 0.012, r += this.windR.run(pink * 0.9 + wn * 0.02) * w * 0.16;
          }
          /* ---- crickets ---- */
          if (g.crick > 0.01) {
            for (let c of this.crick) {
              c.ph += dt;
              let tc = c.ph % c.per, kk = Math.floor(tc * c.rate);
              if (kk < c.n) {
                let fp = tc * c.rate - kk;
                if (fp < 0.6) {
                  c.cp += c.f * dt;
                  let s = Math.sin(TAU * c.cp) * Math.sin(Math.PI * fp / 0.6) * c.amp * g.crick * out;
                  l += s * (1 - Math.max(0, c.pan)), r += s * (1 + Math.min(0, c.pan));
                }
              }
            }
            let bg = this.crBg.run(wn) * (0.55 + 0.45 * Math.sin(TAU * 23 * this.t)) * g.crick * 0.012 * out;
            l += bg, r += bg * 0.9;
          }
          /* ---- the creek ---- */
          if (g.creek > 1e-3) {
            let s = (this.creekA.run(pink * 2) * (0.6 + this.flut * 30) + this.creekB.run(wn) * 0.12) * g.creek * 0.09 * out;
            l += s, r += s * 0.92, this.rnd() < g.creek * 35 * dt && this.drop(300 + 1100 * this.rnd(), 0.01 + 0.02 * this.rnd(), 0.025 * g.creek * out, this.rnd() * 1.4 - 0.7);
          }
          /* ---- the crowd at the strip ---- */
          if (this.cheer *= 1 - dt / 3.2, g.crowd > 1e-3 || this.cheer > 1e-3) {
            if ((i & 63) === 0) for (let j = 0; j < 3; j++) this.rnd() < 0.02 && (this.wTgt[j] = 0.2 + this.rnd() * 0.8), this.wEnv[j] += (this.wTgt[j] - this.wEnv[j]) * 0.05;
            let lev = (g.crowd + this.cheer * 1.6) * out, s = 0;
            for (let j = 0; j < 3; j++) s += this.walla[j].run(pink * 2.2) * this.wEnv[j];
            this.rnd() < this.cheer * 1100 * dt && (this.clapE += 0.4 + this.rnd() * 0.6), this.clapE *= 0.82;
            s = s * lev * 0.05 + this.clap.run(wn * this.clapE) * this.cheer * 0.05 * out, l += s, r += s * 0.95;
          }
          /* ---- drops, bubbles, ticks ---- */
          for (let j = this.drops.length - 1; j >= 0; j--) {
            let D = this.drops[j], y = D.a1 * D.y1 - D.a2 * D.y2;
            D.y2 = D.y1, D.y1 = y, l += y * D.pl, r += y * D.pr, --D.n <= 0 && this.drops.splice(j, 1);
          }
          this.clk *= 0.55;
          let ck = this.clkHP.run(wn * this.clk) * 0.6;
          l += ck, r += ck;
          /* ---- pitched voices: birds and bells ---- */
          for (let j = this.tones.length - 1; j >= 0; j--) {
            let T = this.tones[j], tt = this.t - T.at;
            if (tt < 0) continue;
            if (tt > T.dur) {
              this.tones.splice(j, 1);
              continue;
            }
            let x = tt / T.dur, f = T.f0 + (T.f1 - T.f0) * x;
            T.fm && (f *= 1 + T.fm * 0.05 * Math.sin(TAU * 45 * tt)), T.ph += f * dt;
            let env = T.kind === 1 ? Math.exp(-x * 4.5) * Math.min(1, tt / 2e-3) : Math.sin(Math.PI * x) ** 2, s = Math.sin(TAU * T.ph) * env * T.amp;
            T.kind === 1 ? u += s + Math.sin(TAU * T.ph * 2.76) * env * env * T.amp * 0.25 : (s *= (T.kind ? 1 : g.birds) * out, l += s * T.pl, r += s * T.pr);
          }
          L[i] = l * vol + u * uiv, R[i] = r * vol + u * uiv;
        }
      }
    }
    return Amb;
  }
