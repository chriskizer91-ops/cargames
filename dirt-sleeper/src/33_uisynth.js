  // ===== audio/ui-sounds.js =====
  /* The shop and HUD sounds, synthesised live in their own AudioWorklet: the cash register, the cooler
     chime, the gate tick, medal and trophy fanfares, and the cues for a new best, a challenge starting
     and a lap. Small bell-like voices; no world ambience (the weather, wildlife and crowd were cut). */
  function makeUISynth() {
    let TAU = Math.PI * 2;
    class UISynth {
      constructor(sr) {
        this.sr = sr, this.p = {}, this.mix = {}, this.t = 0, this.tones = [];
      }
      set(p) {
        this.p = p, p.mix && (this.mix = p.mix);
      }
      /* a bell: a sine with a soft inharmonic partial, a click of attack and an exponential tail */
      tone(at, dur, f, amp, pan = 0) {
        this.tones.length < 40 && this.tones.push({ at: this.t + at, dur, f, amp, ph: 0, pl: 1 - Math.max(0, pan), pr: 1 + Math.min(0, pan) });
      }
      chord(fs, at, dur, amp, step = 0) {
        fs.forEach((f, i, a) => this.tone(at + i * step, dur, f, amp, (i - (a.length - 1) / 2) * 0.2));
      }
      event(e) {
        let T = e.type;
        if (T === "kaching") this.tone(0, 0.8, 2093, 0.07, 0.1), this.tone(0.02, 0.7, 2637, 0.05, -0.1), this.tone(0.05, 0.5, 4186, 0.02);
        else if (T === "chime") this.tone(0, 0.45, 1319, 0.06), this.tone(0.1, 0.6, 1760, 0.06), this.tone(0.2, 0.8, 2637, 0.03);
        else if (T === "tick") this.tone(0, 0.05, 1900, 0.09), this.tone(0, 0.07, 950, 0.06);
        else if (T === "trophy") this.chord([1047, 1319, 1568, 2093], 0, 0.9, 0.05, 0.11);
        else if (T === "medal") this.chord([1319, 1568, 2093], 0, 0.9, 0.05, 0.11);
        else if (T === "best") this.chord([1568, 2093, 2637, 3136], 0, 0.55, 0.05, 0.07);
        else if (T === "go") this.tone(0, 0.18, 1760, 0.07), this.tone(0, 0.2, 880, 0.04);
        else if (T === "ready") this.tone(0, 0.12, 1175, 0.06);
        else if (T === "lap") this.tone(0, 0.3, 2349, 0.06), this.tone(0.09, 0.4, 3136, 0.05);
        else if (T === "miss") this.tone(0, 0.25, 523, 0.06), this.tone(0.12, 0.35, 392, 0.06);
      }
      process(L, R, n) {
        let dt = 1 / this.sr, g = (this.p.vol ?? 1) * (this.mix.ui ? this.mix.ui.g ?? 1 : 1);
        for (let i = 0; i < n; i++) {
          this.t += dt;
          let l = 0, r = 0;
          for (let j = this.tones.length - 1; j >= 0; j--) {
            let T = this.tones[j], tt = this.t - T.at;
            if (tt < 0) continue;
            if (tt > T.dur) {
              this.tones.splice(j, 1);
              continue;
            }
            let x = tt / T.dur, env = Math.exp(-x * 4.5) * Math.min(1, tt / 2e-3);
            T.ph += T.f * dt;
            let s = (Math.sin(TAU * T.ph) + Math.sin(TAU * T.ph * 2.76) * env * 0.25) * env * T.amp;
            l += s * T.pl, r += s * T.pr;
          }
          L[i] = l * g, R[i] = r * g;
        }
      }
    }
    return UISynth;
  }
