  // ===== audio/ui-sounds.js =====
  /* The shop and HUD sounds, rebuilt with no bells in them: timing beeps (flat, like a scoreboard), woody gate
     tocks, a ratchet and a drawer for buying parts, a cooler lid, and short synth-brass stabs for finding a
     cooler, a new best, a medal and a trophy. */
  function makeUISynth() {
    let TAU = Math.PI * 2;
    class UISynth {
      constructor(sr) {
        this.sr = sr, this.p = {}, this.mix = {}, this.t = 0, this.vo = [], this.seed = 777;
      }
      set(p) {
        this.p = p, p.mix && (this.mix = p.mix);
      }
      rnd() {
        let s = this.seed;
        return s ^= s << 13, s ^= s >>> 17, s ^= s << 5, this.seed = s, (s >>> 0) / 4294967296 * 2 - 1;
      }
      add(V) {
        this.vo.length < 48 && (V.at += this.t, V.ph = 0, V.y = 0, V.y2 = 0, this.vo.push(V));
      }
      /* a flat electronic beep: odd harmonics, a quick fade in and out */
      beep(at, dur, f, amp) {
        this.add({ k: "beep", at, dur, f, amp });
      }
      click(at, amp, f) {
        this.add({ k: "click", at, dur: 0.012, amp, a: 1 - Math.exp(-TAU * f / this.sr) });
      }
      /* a low knock: a sine falling in pitch with a little noise for the attack */
      thunk(at, amp, f) {
        this.add({ k: "thunk", at, dur: 0.18, f, amp });
      }
      /* a can cracking open */
      fizz(at, dur, amp) {
        this.add({ k: "fizz", at, dur, amp });
      }
      /* a brassy chord: band-limited saws through a closing low-pass */
      stab(at, dur, fs, amp, step = 0) {
        fs.forEach((f, i) => this.add({ k: "stab", at: at + i * step, dur, f, amp }));
      }
      buzz(at, dur, f, amp) {
        this.add({ k: "buzz", at, dur, f, amp });
      }
      event(e) {
        let T = e.type;
        if (T === "ready") this.beep(0, 0.12, 660, 0.12);
        else if (T === "go") this.beep(0, 0.32, 1320, 0.13);
        else if (T === "tick") this.thunk(0, 0.13, 240), this.click(0, 0.05, 2500);
        else if (T === "lap") this.beep(0, 0.1, 990, 0.11), this.beep(0.13, 0.16, 1320, 0.12);
        else if (T === "best") this.stab(0, 0.45, [440, 554, 659], 0.045, 0.06);
        else if (T === "medal") this.stab(0, 0.6, [392, 494, 587, 784], 0.04, 0.07);
        else if (T === "trophy") this.thunk(0, 0.16, 90), this.stab(0, 0.9, [349, 440, 523, 698], 0.04, 0.08);
        else if (T === "kaching") [0, 0.05, 0.1, 0.15].forEach((t, i) => this.click(t, 0.07 - i * 4e-3, 1600 + i * 90)), this.thunk(0.22, 0.13, 140);
        else if (T === "chime") this.thunk(0, 0.12, 180), this.stab(0.08, 0.32, [523, 784], 0.045, 0.07);
        else if (T === "miss") this.buzz(0, 0.3, 140, 0.1);
      }
      process(L, R, n) {
        let sr = this.sr, dt = 1 / sr, g = (this.p.vol ?? 1) * (this.mix.ui ? this.mix.ui.g ?? 0 : 1);
        for (let i = 0; i < n; i++) {
          this.t += dt;
          let s = 0;
          for (let j = this.vo.length - 1; j >= 0; j--) {
            let V = this.vo[j], t = this.t - V.at;
            if (t < 0) continue;
            if (t > V.dur + 0.05) {
              this.vo.splice(j, 1);
              continue;
            }
            let y = 0;
            if (V.k === "beep" || V.k === "buzz") {
              V.ph += V.f * dt;
              let ph = TAU * V.ph, top = V.k === "buzz" ? 9 : 5, x = 0;
              for (let h = 1; h <= top && h * V.f < 7e3; h += 2) x += Math.sin(ph * h) / h;
              let env = Math.min(1, t / 4e-3) * Math.min(1, Math.max(0, (V.dur - t) / 0.025));
              V.k === "buzz" && (V.y += 0.2 * (x - V.y), x = V.y * 1.6), y = x * env * V.amp;
            } else if (V.k === "click") V.y += V.a * (this.rnd() - V.y), y = (this.rnd() - V.y) * Math.exp(-t / 15e-4) * V.amp * 3;
            else if (V.k === "thunk") {
              V.ph += V.f * (0.7 + 0.3 * Math.exp(-t / 0.03)) * dt, V.y += 0.08 * (this.rnd() - V.y);
              y = (Math.sin(TAU * V.ph) * Math.exp(-t / 0.04) + V.y * 2 * Math.exp(-t / 6e-3)) * V.amp * 1.1;
            } else if (V.k === "fizz") {
              let w = this.rnd();
              V.y += 0.35 * (w - V.y);
              let hp = w - V.y, env = Math.min(1, t / 3e-3) * Math.exp(-t / 0.16) * (0.75 + 0.25 * Math.sin(t * 90));
              V.y2 += 0.6 * (hp - V.y2), y = V.y2 * env * V.amp * 2.6;
            } else if (V.k === "stab") {
              V.ph += V.f * dt;
              let ph = TAU * V.ph, x = 0;
              for (let h = 1; h <= 8 && h * V.f < 7e3; h++) x += Math.sin(ph * h) / h;
              let fc = 900 + 2600 * Math.exp(-t / 0.08), a = 1 - Math.exp(-TAU * fc / sr);
              V.y += a * (x - V.y), V.y2 += a * (V.y - V.y2);
              let env = Math.min(1, t / 0.01) * (t < V.dur * 0.6 ? 1 : Math.max(0, 1 - (t - V.dur * 0.6) / (V.dur * 0.4)));
              y = V.y2 * env * V.amp * 1.6;
            }
            s += y;
          }
          L[i] = s * g, R[i] = s * g;
        }
      }
    }
    return UISynth;
  }

