  // src/physics/powertrain.js
  var { engTq, steadyBoost } = SIM;
  function optimalShifts(e) {
    let out = [], wot = (r) => engTq(e, r, 1, steadyBoost(e, r));
    for (let g = 0; g < e.nG; g++) {
      if (g === e.nG - 1) {
        out.push(e.limiterRpm - 150);
        break;
      }
      let r1 = e.gears[g], r2 = e.gears[g + 1], best = e.limiterRpm - 150;
      for (let rpm = e.redline * 0.5; rpm < e.limiterRpm - 100; rpm += 25) if (wot(rpm * r2 / r1) * r2 > wot(rpm) * r1) {
        best = rpm;
        break;
      }
      out.push(Math.min(best, e.limiterRpm - 150));
    }
    return out;
  }
  var Powertrain = class {
    /* e: SIM.makeSpec(...). o: {drive:'RWD'|'FWD'|'AWD', clutch (N m), engage (s), diff:{pre,acc,dec}, Iw, R} */
    constructor(e, o) {
      this.e = e, this.o = o, this.drv = o.drive === "FWD" ? [0, 1] : o.drive === "AWD" ? [0, 1, 2, 3] : [2, 3], this.upRpm = optimalShifts(e), this.st = "off", this.t = 0, this.we = 0, this.rpm = 0, this.gear = 1, this.shiftT = 0, this.shiftTo = 1, this.engage = 0, this.locked = !1, this.boost = 0, this.nos = e.nosKw ? 1 : 0, this.nosOn = !1, this.cutT = 0, this.cutFrac = 0, this.thr = 0, this.thrSnd = 0, this.load = 0, this.thrPrev = 0, this.launching = !1, this.launchW = 0, this.launchT = 0, this.hold = !1, this.rev = !1, this.revT = 0, this.twostep = !1, this.tcMul = 1, this.tcOn = !1, this.sinceShift = 1, this.shiftGrade = null, this.events = [], this.lopeT = 0, this.rpmOut = 0, this.Te = 0, this.Tdrv = 0;
    }
    get running() {
      return this.st === "run" || this.st === "catch";
    }
    start() {
      (this.st === "off" || this.st === "stopping") && (this.st = "crank", this.t = 0);
    }
    stop() {
      this.st !== "off" && (this.st = "stopping");
    }
    shift(dir) {
      let e = this.e;
      if (this.shiftT > 0 || this.rev || !this.running) return !1;
      let to = this.gear + dir;
      if (to < 1 || to > e.nG) return !1;
      if (this.shiftTo = to, this.shiftT = e.shiftT, this.engage = 0, this.locked = !1, this.sinceShift = 0, dir > 0) {
        let opt = this.upRpm[this.gear - 1], err = this.rpm - opt;
        this.shiftGrade = Math.abs(err) < 180 ? "PERFECT" : Math.abs(err) < 450 ? "GOOD" : err < 0 ? "EARLY" : "LATE", e.seq && this.thr > 0.6 && this.events.push({ type: "shift" });
      } else this.shiftGrade = null;
      return !0;
    }
    /* the automatic gearbox, driven from the same optimal shift points */
    autoShift(brk, air, holdGear = !1) {
      let e = this.e;
      if (this.shiftT > 0 || this.rev || air || this.sinceShift < 0.3 || this.engage < 0.95 || !this.running) return;
      let g = this.gear, rpm = this.rpm;
      if (this.locked && g < e.nG && (!holdGear && rpm > this.upRpm[g - 1] || rpm > e.limiterRpm - 80) && this.thr > 0.3) {
        this.shift(1);
        return;
      }
      if (g > 1 && (!holdGear || rpm < e.idle * 1.6)) {
        let after = rpm * e.gears[g - 2] / e.gears[g - 1];
        after < this.upRpm[g - 2] * 0.88 && (rpm < e.redline * 0.5 || brk > 0.3 && after < e.redline * 0.86) && this.sinceShift > 0.45 && this.shift(-1);
      }
    }
    meanW(W2) {
      let m = 0;
      for (let i of this.drv) m += W2[i].w;
      return m / this.drv.length;
    }
    /* inertia a wheel's brake has to fight (with the engine attached through a locked clutch) */
    effInertia(i, Iw) {
      if (this.locked && this.drv.includes(i)) {
        let gr = this.ratio();
        return Iw + this.e.Ie * gr * gr / this.drv.length;
      }
      return Iw;
    }
    ratio() {
      return this.e.gears[this.gear - 1] * this.e.fd * (this.lo || 1) * (this.rev ? -1.15 : 1);
    }
    /* one substep. inp {thr, brk, nos}. W: four wheels {w, Fx, Kd, Fz, kap}. aid {tc, escThr}. */
    step(dt, inp, W2, aid) {
      let e = this.e, o = this.o, R2 = o.R, Iw = o.Iw, drv = this.drv, idleW = e.idle * TAU / 60;
      this.t += dt, this.lopeT += dt, this.sinceShift += dt, this.twostep = !1, this.cutFrac = 0, this.tcOn = !1;
      let thrIn = clamp(inp.thr, 0, 1), brkIn = clamp(inp.brk, 0, 1);
      if (this.st === "off") {
        this.we = 0, this.rpm = 0, this.load = 0, this.engage = 0, this.locked = !1, this._free(W2, dt), this._out();
        return;
      }
      if (this.st === "crank") {
        this.we = (235 + 70 * Math.sin(this.t * 38)) * TAU / 60, this.rpm = this.we * 60 / TAU, this.t > 0.8 && (this.st = "catch", this.t = 0), this._free(W2, dt), this._out();
        return;
      }
      if (this.st === "catch") {
        let t = this.t;
        this.we = idleW * (1 + 0.95 * Math.sin(Math.min(1, t / 0.22) * Math.PI / 2) * Math.exp(-Math.max(0, t - 0.22) * 2.6)), this.load = t < 0.22 ? 0.6 : 0, t > 1.1 && (this.st = "run"), this.rpm = this.we * 60 / TAU, this._free(W2, dt), this._out();
        return;
      }
      this.st === "stopping" && (thrIn = 0);
      let vW = this.meanW(W2) * R2;
      this.thr += (thrIn - this.thr) * Math.min(1, dt * (thrIn > this.thr ? 9 : 14) * e.resp);
      let thrE = this.thr, thrSnd = this.thr, rpm = this.we * 60 / TAU;
      this.rpm = rpm;
      let dslip = 0;
      for (let i of drv) dslip = Math.max(dslip, W2[i].kap);
      let vAbs = Math.abs(vW);
      if (this.tcCap = 1e9, aid.tc && !this.rev && this.locked && aid.fmax > 0) {
        let gr2 = Math.abs(this.ratio());
        this.tcCap = aid.fmax * 0.95 * R2 / (gr2 * 0.88) * (1 + e.Ie * gr2 * gr2 / (aid.mass * R2 * R2));
      }
      if (aid.tc && vAbs > 0.3 && !this.rev) {
        let err = dslip - 0.13;
        err > 0 ? this.tcMul -= Math.min(err, 1) * dt * 14 : this.tcMul += dt * 2.5, this.tcMul = clamp(this.tcMul, 0.3, 1);
      } else this.tcMul = 1;
      if (aid.escThr < 1 && (thrE *= aid.escThr), this.hold && e.launch && rpm > e.launchRpm && (thrE = 0, this.cutFrac = 0.75, this.twostep = this.thr > 0.4), e.turbo) {
        let spool = sstep(e.s0, e.s1, rpm), tgt = thrSnd > 0.15 ? e.fiBoost * spool * (0.35 + 0.65 * thrSnd) : e.antilag && this.running ? e.fiBoost * 0.75 * sstep(e.s0 * 0.7, e.s1, rpm) : 0;
        this.boost > 0.35 && this.thrPrev > 0.6 && thrIn < 0.2 && !e.antilag && e.bov !== "none" && this.events.push({ type: "bov", flutter: e.bov === "flutter" }), this.boost += (tgt - this.boost) * Math.min(1, dt * (tgt > this.boost ? (0.5 + 1.5 * rpm / e.redline) / e.lag : 6));
      } else this.boost = steadyBoost(e, rpm) * (thrSnd > 0.05 ? 1 : 0.2);
      this.thrPrev = thrIn;
      let shifting = this.shiftT > 0, thrEng = thrE;
      if (shifting)
        if (this.shiftTo > this.gear)
          e.seq && this.thr > 0.7 ? (thrEng = 0, this.cutFrac = 1) : (thrEng = 0, thrSnd = 0);
        else {
          let tgtW = e.gears[this.shiftTo - 1] * e.fd * this.meanW(W2);
          thrEng = clamp((tgtW - this.we) * 0.02, 0, 1), thrSnd = thrEng;
        }
      let grL = this.ratio(), wmL = this.meanW(W2), launchRpm = Math.max(Math.min(e.redline * 0.55, 4600), e.turbo ? e.s0 * 1.1 : 0), wHold = this.launchW || lerp(idleW * 1.3, launchRpm * TAU / 60, clamp(this.thr, 0, 1)), wTgt = Math.max(Math.abs(grL * wmL), wHold * Math.max(0.72, 1 - 0.3 * this.launchT));
      if (this.launching && !shifting && !this.hold && this.we > wTgt + 15 && (thrEng *= clamp(1 - (this.we - wTgt - 15) / 90, 0, 1)), !shifting && !this.locked && !this.launching && this.engage < 1 && (thrEng *= this.engage * this.engage), this.cutT > 0 && (this.cutT -= dt, thrEng = 0, this.cutFrac = 1), rpm > e.limiterRpm)
        if (e.limiter === "soft") {
          let k = clamp(1 - (rpm - e.limiterRpm) / 150, 0, 1);
          thrEng *= k, this.cutFrac = Math.max(this.cutFrac, 1 - k);
        } else
          this.cutT = clamp(48 / e.cyl * 60 / rpm, 0.025, 0.07), thrEng = 0, this.cutFrac = 1;
      let Te = engTq(e, Math.max(rpm, 1), thrEng, this.boost);
      if (Te > 0 && (this.tcMul < 1 || Te > this.tcCap)) {
        let Tr = Te;
        Te = Math.min(Te * clamp(this.tcMul - 3 * Math.max(0, dslip - 0.13), 0.15, 1), this.tcCap);
        let k = Te / Tr;
        k < 0.97 && (this.tcOn = !0, this.cutFrac = Math.max(this.cutFrac, (1 - k) * 0.9));
      }
      this.nosOn = !1, inp.nos && e.nosKw && this.nos > 0 && this.thr > 0.5 && !shifting && !this.hold && this.running && this.cutFrac < 0.5 && (this.nosOn = !0, this.nos = Math.max(0, this.nos - dt / e.nosT), Te += Math.min(e.nosKw * 1e3 / Math.max(this.we, 150), e.tq * 1.6)), this.st === "run" && this.we < idleW && (Te += (idleW - this.we) * e.Ie * 25);
      let TeS = engTq(e, Math.max(rpm, 1), thrSnd, this.boost);
      this.load = this.st === "run" ? clamp(thrSnd * (TeS > 0 ? 1 : 0) * (0.42 + 0.58 * Math.min(1, TeS / e.tq)), 0, 1) : 0, this.Te = Te, shifting && (this.shiftT -= dt, this.shiftT <= 0 && (this.gear = this.shiftTo, this.shiftT = 0));
      let gr = this.ratio(), wm = this.meanW(W2);
      !this.locked && !shifting && Math.abs(gr * wm) < idleW * 1.3 && this.engage < 0.5 && (this.launching = !0), this.launching ? this.launchT += dt : this.launchT = 0;
      let slowForGear = this.launching && Math.abs(gr * wm) < wTgt * 0.98, fzD = 0;
      for (let i of drv) fzD += W2[i].Fz;
      let tracCap = Math.abs(gr) > 0 ? (aid.fmax || fzD * o.mu) * (aid.tc ? 0.9 : 1.3) * R2 / (Math.abs(gr) * 0.88) : 1e9, engT = 1;
      (shifting || this.hold || !this.running || Math.abs(gr * wm) < idleW * 1.1 && this.thr < 0.05) && (engT = 0);
      let er = engT > this.engage ? dt / Math.max(0.02, o.engage * (this.launchW ? 0.25 : this.launching ? 1 : 0.55)) : dt * 12;
      this.engage = clamp(this.engage + clamp(engT - this.engage, -er, er), 0, 1);
      let cap = o.clutch * this.engage, n = drv.length, Fsum = 0, Ksum = 0;
      for (let i of drv)
        Fsum += W2[i].Fx, Ksum += W2[i].Kd;
      let Tdrv = 0;
      if (this.locked && this.engage > 0.98 && !shifting) {
        let Itot = e.Ie * gr * gr + n * Iw, tau = Te * gr * 0.88 - R2 * Fsum, dwm = dt * tau / (Itot + dt * R2 * Ksum), Tcl = Te - e.Ie * gr * dwm / dt;
        if (Math.abs(Tcl) > o.clutch * 1.02) this.locked = !1;
        else {
          for (let i of drv) W2[i].w += dwm;
          this.we = gr * (wm + dwm), Tdrv = Tcl * gr * 0.88;
        }
      } else this.locked = !1;
      if (!this.locked) {
        let slipW = this.we - gr * wm, Tc;
        if (gr === 0 || cap <= 0) Tc = 0;
        else if (slowForGear && !shifting) Tc = clamp(Te + 30 * e.Ie * (this.we - wTgt), 0, Math.min(cap, tracCap));
        else {
          Tc = cap * clamp(slipW / 10, -1, 1);
          let fl = idleW * 1.15;
          Tc > 0 && this.we < fl * 1.4 && (Tc = Math.min(Tc, Math.max(0, Te + 30 * e.Ie * (this.we - fl))));
        }
        this.we += dt * (Te - Tc) / e.Ie, Tdrv = Tc * gr * 0.88;
        let dwm = dt * (Tdrv - R2 * Fsum) / (n * Iw + dt * R2 * Ksum);
        for (let i of drv) W2[i].w += dwm;
        let s2 = this.we - gr * (wm + dwm);
        gr !== 0 && this.engage > 0.98 && !shifting && (Math.abs(s2) < 5 || Math.sign(s2) !== Math.sign(slipW) && !slowForGear) && (this.locked = !0, this.we = gr * (wm + dwm), this.launchW = 0, this.launching = !1);
      }
      this.we < idleW * 0.6 && this.st !== "stopping" && (this.we = idleW * 0.6), this.st === "stopping" && this.we < idleW * 0.35 && (this.st = "off", this.we = 0), this.Tdrv = Tdrv;
      let D = o.diff;
      if (n === 2) {
        let i = drv[0], j = drv[1], Dd = (W2[i].w - W2[j].w) / 2, m = (W2[i].w + W2[j].w) / 2;
        Dd += dt * (-R2 * (W2[i].Fx - W2[j].Fx) / 2) / (Iw + dt * R2 * (W2[i].Kd + W2[j].Kd) / 2);
        let lk = D.pre + (Tdrv >= 0 ? D.acc : D.dec) * Math.abs(Tdrv);
        Dd -= sgn(Dd) * Math.min(Math.abs(Dd), dt * lk / Iw), W2[i].w = m + Dd, W2[j].w = m - Dd;
      } else {
        let m = (W2[0].w + W2[1].w + W2[2].w + W2[3].w) / 4, Dc = (W2[0].w + W2[1].w - (W2[2].w + W2[3].w)) / 4, Df = (W2[0].w - W2[1].w) / 2, Dr = (W2[2].w - W2[3].w) / 2, Qc = -R2 * (W2[0].Fx + W2[1].Fx - W2[2].Fx - W2[3].Fx) - Tdrv * 0.2;
        Dc += dt * Qc / (4 * Iw + dt * R2 * (W2[0].Kd + W2[1].Kd + W2[2].Kd + W2[3].Kd)), Dc -= sgn(Dc) * Math.min(Math.abs(Dc), dt * (D.cLock ? 1e6 : 160 + Math.abs(Dc) * 80) / (4 * Iw)), Df += dt * (-R2 * (W2[0].Fx - W2[1].Fx)) / (2 * Iw + dt * R2 * (W2[0].Kd + W2[1].Kd)), Df -= sgn(Df) * Math.min(Math.abs(Df), dt * (D.fLock ? 1e6 : 20 + 0.1 * Math.abs(Tdrv)) / (2 * Iw)), Dr += dt * (-R2 * (W2[2].Fx - W2[3].Fx)) / (2 * Iw + dt * R2 * (W2[2].Kd + W2[3].Kd));
        let lk = D.rLock ? 1e6 : D.pre + (Tdrv >= 0 ? D.acc : D.dec) * Math.abs(Tdrv) * 0.6;
        Dr -= sgn(Dr) * Math.min(Math.abs(Dr), dt * lk / (2 * Iw)), W2[0].w = m + Dc + Df, W2[1].w = m + Dc - Df, W2[2].w = m - Dc + Dr, W2[3].w = m - Dc - Dr;
      }
      for (let i = 0; i < 4; i++) drv.includes(i) || (W2[i].w += dt * (-R2 * W2[i].Fx) / (Iw + dt * R2 * W2[i].Kd));
      this.thrSnd = thrSnd, this._out();
    }
    /* engine not driving: every wheel just rolls */
    _free(W2, dt) {
      let R2 = this.o.R, Iw = this.o.Iw;
      for (let i = 0; i < 4; i++) W2[i].w += dt * (-R2 * W2[i].Fx) / (Iw + dt * R2 * W2[i].Kd);
    }
    _sync(W2) {
      if (this.locked) {
        let idleW = this.e.idle * TAU / 60;
        this.we = this.ratio() * this.meanW(W2), this.we < idleW * 0.92 && (this.locked = !1, this.we = Math.max(this.we, idleW * 0.92));
      }
      this.rpm = this.we * 60 / TAU;
    }
    _out() {
      let e = this.e, w = 1 - clamp((this.rpm - e.idle) / (e.idle * 0.9), 0, 1), lope = [0, 0.012, 0.032, 0.065][e.cam | 0] * 1.4 + (e.ch.lope || 0), mod = this.running && lope ? lope * w * (Math.sin(this.lopeT * TAU * 1.55) + 0.6 * Math.sin(this.lopeT * TAU * 0.62 + 1.3)) : 0;
      this.rpmOut = this.st === "off" ? 0 : this.rpm * (1 + mod);
    }
    /* what the synth needs. listener: 0 behind, 1 cabin, 2 trackside; dist/pan/rear for 2 */
    soundParams(listener, speed, geo) {
      let e = this.e;
      return {
        on: this.st !== "off" && this.st !== "crank" ? 1 : 0,
        firing: this.st === "run" || this.st === "catch" ? 1 : 0,
        crank: this.st === "crank" ? 1 : 0,
        crankT: this.st === "crank" ? this.t : 0,
        rpm: this.rpmOut,
        load: this.load,
        cutFrac: this.cutFrac,
        boost: this.boost,
        nos: this.nosOn ? 1 : 0,
        speed,
        gear: this.gear,
        twostep: this.twostep ? 1 : 0,
        antilag: e.antilag && e.turbo && this.thr < 0.2 && this.running ? 1 : 0,
        view: listener,
        dist: geo ? geo.dist : listener === 1 ? 1.4 : 3,
        pan: geo ? geo.pan : 0,
        rear: geo ? geo.rear : listener === 1 ? 0.35 : 1,
        vol: 1,
        jump: geo && geo.jump ? 1 : 0
      };
    }
    takeEvents() {
      let ev = this.events;
      return this.events = [], ev;
    }
  };

  // src/physics/vehicle.js
  var G = 9.81, RHO = 1.2, ASSISTS = {
    /* Arcade Easy: everything Arcade has, plus the assist layer in the car (grip, spin catch,
       keep-upright, slide-off walls) and the guide in the game (corner speed, wall avoidance) */
    easy: { id: "easy", name: "Arcade Easy", steer: 1, esc: 1, tc: 1, abs: 1, drift: 1, auto: 1, catchSpin: 1, plus: { grip: 1.15, upright: !0 }, guide: !0 },
    arcade: { id: "arcade", name: "Arcade", steer: 1, esc: 1, tc: 1, abs: 1, drift: 1, auto: 1, catchSpin: 1 },
    sport: { id: "sport", name: "Sport", steer: 0.75, esc: 0.65, tc: 1, abs: 1, drift: 0, auto: 1, catchSpin: 0 },
    sim: { id: "sim", name: "Simulation", steer: 0, esc: 0, tc: 0, abs: 1, drift: 0, auto: 1, catchSpin: 0 }
  }, SURF_MU = { road: 1, curb: 0.95, shoulder: 0.9, ground: 0.7 }, Vehicle = class {
    constructor(chassis, spec2, world2) {
      let c = chassis;
      this.c = c, this.spec = spec2, this.world = world2, this.m = c.mass || spec2.mass;
      let L = c.body.L, Wd = c.body.W, H = c.body.H, m = this.m;
      this.I = [m * (Wd * Wd + H * H) / 12, m * (L * L + Wd * Wd) / 12 * 1.05, m * (L * L + H * H) / 12];
      let a = c.wb * (1 - c.wf), b = c.wb * c.wf;
      this.a = a, this.b = b;
      let s = c.susp, c0F = m * G * c.wf / 2 / s.kF, c0R = m * G * (1 - c.wf) / 2 / s.kR, hpF = -c.hcg + c.R + s.rest - c0F, hpR = -c.hcg + c.R + s.rest - c0R;
      this.wheels = [[a, hpF, -c.trackF / 2, 1], [a, hpF, c.trackF / 2, 1], [-b, hpR, -c.trackR / 2, 0], [-b, hpR, c.trackR / 2, 0]].map(([x, y, z, f2], i) => ({
        i,
        hp: [x, y, z],
        front: !!f2,
        left: z < 0,
        k: f2 ? s.kF : s.kR,
        cb: f2 ? s.cbF : s.cbR,
        cr: f2 ? s.crF : s.crR,
        w: 0,
        ang: 0,
        steer: 0,
        comp: f2 ? c0F : c0R,
        len: s.rest,
        Fz: 0,
        contact: !1,
        cp: [0, 0, 0],
        n: [0, 1, 0],
        hpW: [0, 0, 0],
        f: [1, 0, 0],
        r: [0, 0, 1],
        kap: 0,
        tanA: 0,
        Fx: 0,
        Fy: 0,
        Kd: 0,
        sg: 0,
        slipV: 0,
        vl: 0,
        surf: "road",
        hint: -1,
        Tb: 0,
        disc: 0,
        temp: 0.45,
        escBrake: 0
      })), this.tyre = Object.assign({}, TYRE_DEFAULT, c.tyre, { fz0: m * G / 4 }), this.pt = new Powertrain(spec2, { drive: spec2.drv || "RWD", clutch: spec2.tq * (2.2 + spec2.fiBoost * 0.9), engage: 0.22, diff: c.diff, Iw: c.Iw, R: c.R, mu: this.tyre.mu });
      let hx = L / 2 - 0.06, hz = Wd / 2 - 0.02, yb = -c.hcg + 0.16, ym = -c.hcg + 0.55, yt = -c.hcg + H - 0.04;
      this.hull = [];
      for (let x of [hx, hx * 0.45, -hx * 0.45, -hx]) for (let z of [-hz, hz]) this.hull.push([x, yb, z * (Math.abs(x) > hx * 0.9 ? 0.9 : 1)], [x, ym, z]);
      for (let x of [hx * 0.45, -hx * 0.6]) for (let z of [-hz * 0.78, hz * 0.78]) this.hull.push([x, yt, z]);
      this.hull.push([hx + 0.04, ym - 0.05, 0], [-hx - 0.04, ym, 0]), this.p = [0, 0, 0], this.q = [0, 0, 0, 1], this.v = [0, 0, 0], this.w = [0, 0, 0], this.steer = 0, this.hint = -1, this.loc = null, this.air = !0, this.airT = 0, this.speed = 0, this.vf = 0, this.beta = 0, this.aid = ASSISTS.arcade, this.wet = 0, this.drift = { on: !1, dir: 0, t: 0, low: 0 }, this.ev = { wall: 0, land: 0, scrape: 0, ground: 0 }, this.rev = !1, this.revT = 0, this.escOn = !1, this.absOn = !1, this.assistTorque = 0, this.plus = null, this.TY = { fx: 0, fy: 0, dk: 0, sg: 0 }, this.acc = [0, 0, 0], this.accB = [0, 0, 0], this.setAssists("arcade");
    }
    /* put the car at rest on the track at (s, d), facing along it */
    placeOnTrack(T2, s, d = 0) {
      let fr = T2.frame(s), p = T2.pos(s, d);
      this.q = qlook(fr.f, fr.u), this.p = madd(p, fr.u, this.c.hcg), this.v = [0, 0, 0], this.w = [0, 0, 0], this.hint = -1;
      for (let wh of this.wheels)
        wh.w = 0, wh.hint = -1;
      this.pt.gear = 1, this.pt.shiftT = 0, this.pt.engage = 0, this.pt.locked = !1, this.rev = !1, this.pt.rev = !1, this.drift.on = !1;
    }
    place(p, yaw) {
      this.q = qaxis([0, 1, 0], yaw), this.p = [p[0], p[1] + this.c.hcg, p[2]], this.v = [0, 0, 0], this.w = [0, 0, 0];
      for (let wh of this.wheels)
        wh.w = 0;
    }
    _smu(s) {
      return this.surfMu ? this.surfMu[s] ?? 0.8 : SURF_MU[s] || 1;
    }
    setAssists(id) {
      this.aid = ASSISTS[id] || ASSISTS.arcade, this.pt.auto = !!this.aid.auto, this.plus = this.aid.plus || null;
    }
    /* invert the world-space inertia: I_w^-1 * x */
    invI(M, x) {
      let b = mtvec(M, x);
      return mvec(M, [b[0] / this.I[0], b[1] / this.I[1], b[2] / this.I[2]]);
    }
    /* inp: {steer -1..1 (+right), thr 0..1, brk 0..1, hb 0..1, nos bool} */
    step(dt, inp) {
      let c = this.c, s = c.susp, m = this.m, R2 = c.R, pt = this.pt, aid = this.aid, W2 = this.wheels, M = qmat(this.q), U = mcol(M, 1), p = this.p, v = this.v, w = this.w, vb = mtvec(M, v), wb = mtvec(M, w);
      this.speed = len(v), this.vf = vb[0], this.beta = Math.atan2(vb[2], Math.max(Math.abs(vb[0]), 0.5)), this.loc = this.world.locate(p, this.hint), this.loc && (this.hint = this.loc.i);
      let thr = clamp(inp.thr || 0, 0, 1), brk = clamp(inp.brk || 0, 0, 1), hb = clamp(inp.hb || 0, 0, 1);
      if (!this.rev && Math.abs(vb[0]) < 0.6 && brk > 0.5 && thr < 0.05 ? (this.revT += dt, this.revT > 0.5 && pt.running && (this.rev = !0, pt.rev = !0, pt.gear = 1, pt.shiftT = 0)) : this.rev || (this.revT = 0), this.rev)
        if (thr > 0.1 && vb[0] > -0.8)
          this.rev = !1, pt.rev = !1, this.revT = 0;
        else {
          let t = thr;
          thr = brk, brk = t;
        }
      !this.rev && Math.abs(vb[0]) < 0.5 && brk > 0.5 && thr > 0.3 && pt.running ? pt.hold = !0 : pt.hold && (pt.hold = !1, thr > 0.3 && (pt.launchW = pt.we, pt.launching = !0)), this.thrIn = thr, this.brkIn = brk, this.steer = this._steer(dt, inp.steer || 0, vb, wb);
      let down = [-U[0], -U[1], -U[2]], nContact = 0;
      for (let wh of W2) {
        let hpW = add(p, mvec(M, wh.hp));
        wh.hpW = hpW;
        let hit = this.world.wheelContact ? this.world.wheelContact(hpW, down, wh.front && this.steer ? mvec(M, [Math.cos(this.steer), 0, Math.sin(this.steer)]) : mcol(M, 0), R2, s.rest + R2 + 0.3) : this.world.raycast(hpW, down, s.rest + R2 + 0.3, wh.hint), comp = -1;
        if (hit && (wh.hint = hit.i, comp = s.rest - (hit.t - R2)), comp <= 0) {
          wh.contact = !1, wh.Fz = 0, wh.comp = 0, wh.len = hit ? Math.min(s.rest, hit.t - R2) : s.rest;
          continue;
        }
        let rate = clamp((comp - wh.comp) / dt, -4, 4);
        wh.comp = comp, wh.len = s.rest - comp, wh.contact = !0, nContact++;
        let Fs = wh.k * comp + (rate > 0 ? wh.cb : wh.cr) * rate;
        comp > s.travel && (Fs += (comp - s.travel) * wh.k * 14 + Math.max(0, rate) * wh.cb * 2), wh.Fz = Math.max(0, Fs), wh.cp = hit.p, wh.n = hit.n, wh.surf = hit.surf, wh.off = hit.off || 0;
      }
      for (let [l, r, k] of [[0, 1, s.arbF], [2, 3, s.arbR]]) {
        let d = (W2[l].contact ? W2[l].comp : 0) - (W2[r].contact ? W2[r].comp : 0), f2 = k * d;
        W2[l].contact && (W2[l].Fz = Math.max(0, W2[l].Fz + f2)), W2[r].contact && (W2[r].Fz = Math.max(0, W2[r].Fz - f2));
      }
      let wasAir = this.air;
      this.air = nContact === 0, this.air ? this.airT += dt : (wasAir && this.airT > 0.15 && (this.ev.land = Math.max(this.ev.land, -vb[1])), this.airT = 0);
      let P = this.plus, TY = this.TY, wetMu = lerp(1, P ? 0.93 : 0.84, this.wet) * (P ? P.grip : 1);
      for (let wh of W2) {
        if (!wh.contact) {
          wh.Fx = wh.Fy = wh.Kd = wh.kap = wh.sg = wh.slipV = wh.rr = wh.vd = 0, wh.tanA = 0;
          continue;
        }
        let st = wh.front ? this.steer : 0, fw = mvec(M, [Math.cos(st), 0, Math.sin(st)]), n = wh.n, f2 = norm2(sub2(fw, scale(n, dot2(fw, n)))), r = norm2(cross2(f2, n)), vc = add(v, cross2(w, sub2(wh.cp, p))), vl = dot2(vc, f2), vt = dot2(vc, r), vn = Math.max(Math.abs(vl), 2.5), kap = (wh.w * R2 - vl) / vn, tanA = vt / vn, tg = wh.temp < 0.62 ? 0.92 + 0.08 * sstep(0.15, 0.62, wh.temp) : wh.temp < 0.85 ? 1.02 : 1.02 - 0.15 * sstep(0.85, 1.15, wh.temp);
        tyreForce(this.tyre, wh.Fz, kap, tanA, this._smu(wh.surf) * wetMu * tg, TY), wh.Fx = TY.fx, wh.rr = (this.surfRR ? this.surfRR[wh.surf] ?? 0.015 : 0.012) * wh.Fz, wh.vd = (this.surfDrag ? this.surfDrag[wh.surf] || 0 : 0) * wh.Fz * vl, wh.Fy = TY.fy, wh.Kd = TY.dk * R2 / vn, wh.kap = kap, wh.tanA = tanA, wh.sg = TY.sg, wh.f = f2, wh.r = r, wh.vl = vl, wh.slipV = Math.hypot(wh.w * R2 - vl, vt), wh.temp += dt * (wh.slipV * wh.Fz / (m * G) * 0.02 - (wh.temp - 0.42) * (0.015 + this.speed * 8e-4)), wh.temp = clamp(wh.temp, 0.2, 1.25);
      }
      let escThr = this._stability(dt, inp, vb, wb, thr), fmax = 0;
      for (let i of pt.drv) {
        let wh = W2[i];
        if (wh.contact) {
          let lf = Math.max(0.6, 1 - this.tyre.loadSens * (wh.Fz / this.tyre.fz0 - 1));
          fmax += wh.Fz * this.tyre.mu * lf * wetMu * this._smu(wh.surf);
        }
      }
      /* line lock: the fronts are held on the brakes and the drive goes to the rear axle alone */
      pt.drvAll || (pt.drvAll = pt.drv), pt.drv = inp.lock && pt.drvAll.length === 4 ? [2, 3] : pt.drvAll, pt.step(dt, { thr, brk, nos: !!inp.nos }, W2, { tc: aid.tc && !this.drift.on && !inp.lock, escThr: inp.lock ? 1 : escThr, fmax, mass: m }), pt.auto && pt.autoShift(brk, this.air, this.drift.on), this.absOn = !1;
      let hold = this.speed < 0.4 && thr < 0.05 && !this.rev && pt.running;
      for (let wh of W2) {
        let Tb = brk * c.brake * (wh.front ? c.bias : 1 - c.bias) / 2;
        inp.lock && wh.front && (Tb = Math.max(Tb, c.brake * 0.75));
        if (aid.abs && brk > 0.1 && this.speed > 2.5 && wh.kap < -0.1) {
          let k = clamp(1 - (-wh.kap - 0.1) * 7, 0.2, 1);
          Tb *= k, k < 0.95 && (this.absOn = !0);
        }
        !wh.front && hb > 0 && (Tb += c.hbTorque * hb), Tb += wh.escBrake + (wh.rr || 0) * R2, (hold || pt.hold) && (Tb += 1500);
        let dw = dt * Tb / pt.effInertia(wh.i, c.Iw);
        Math.abs(wh.w) <= dw ? wh.w = 0 : wh.w -= sgn(wh.w) * dw, wh.Tb = Tb, wh.disc = clamp(wh.disc + dt * (Tb * Math.abs(wh.w) / 9e4 - wh.disc * (0.08 + this.speed * 4e-3)), 0, 1.2);
      }
      hb > 0.5 && !pt.drv.includes(0) && (pt.engage = 0, pt.locked = !1), pt._sync(W2);
      let force = [0, -m * G, 0], torque = [0, 0, 0], apply = (F, at) => {
        force[0] += F[0], force[1] += F[1], force[2] += F[2];
        let t = cross2(sub2(at, p), F);
        torque[0] += t[0], torque[1] += t[1], torque[2] += t[2];
      };
      for (let wh of W2)
        if (wh.contact) {
          apply(scale(U, wh.Fz), wh.hpW), apply(add(scale(wh.f, wh.Fx - (wh.vd || 0)), scale(wh.r, wh.Fy)), madd(wh.cp, wh.n, c.rcH));
          /* a tyre against a ledge face: the face pushes back as well as up */
          if (wh.off) {
            let nu = dot2(wh.n, U), k = wh.Fz / Math.max(0.5, nu) * 0.6;
            apply([(wh.n[0] - U[0] * nu) * k, (wh.n[1] - U[1] * nu) * k, (wh.n[2] - U[2] * nu) * k], wh.cp);
          }
        }
      let sp = this.speed, dr = 0.5 * RHO * c.cdA * sp;
      apply([-v[0] * dr, -v[1] * dr, -v[2] * dr], p);
      let q2 = 0.5 * RHO * vb[0] * vb[0];
      if (apply(scale(U, -q2 * c.clF), add(p, mvec(M, [this.a, 0, 0]))), apply(scale(U, -q2 * c.clR), add(p, mvec(M, [-this.b, 0, 0]))), this.assistTorque && (torque[0] += U[0] * this.assistTorque, torque[1] += U[1] * this.assistTorque, torque[2] += U[2] * this.assistTorque), P && P.upright) {
        let F = mcol(M, 0), Rt = mcol(M, 2), ax = cross2(U, [0, 1, 0]), roll = dot2(ax, F), pitch = dot2(ax, Rt), wr = dot2(w, F), wp = dot2(w, Rt), ex = Math.sign(roll) * Math.max(0, Math.abs(roll) - 0.2), tr = (ex * 28 - wr * (Math.abs(roll) > 0.2 ? 5 : 0)) * this.I[0], tp = this.air ? (pitch * 10 - wp * 3) * this.I[2] : 0;
        for (let k = 0; k < 3; k++) torque[k] += F[k] * tr + Rt[k] * tp;
      }
      for (let k = 0; k < 3; k++)
        this.acc[k] = force[k] / m, v[k] += this.acc[k] * dt;
      let tb = mtvec(M, torque), I = this.I, Iwb = [I[0] * wb[0], I[1] * wb[1], I[2] * wb[2]], gy = cross2(wb, Iwb);
      for (let k = 0; k < 3; k++) wb[k] += dt * (tb[k] - gy[k]) / I[k];
      this.w = mvec(M, wb);
      for (let k = 0; k < 3; k++) p[k] += v[k] * dt;
      this.q = qint(this.q, this.w, dt), this.accB = mtvec(M, this.acc);
      for (let wh of W2) wh.ang += wh.w * dt;
      if (this._collide(dt), hold && this.speed < 0.2)
        for (let k = 0; k < 3; k++)
          this.v[k] *= 1 - Math.min(1, dt * 6), this.w[k] *= 1 - Math.min(1, dt * 6);
    }
    /* the steering assist: aim the front tyres at their peak slip angle relative to how the front axle is moving */
    _steer(dt, sIn, vb, wb) {
      let c = this.c, aid = this.aid, lock = c.lock, vx = vb[0], v = Math.abs(vx), tgt = sIn * lock / (1 + v / (aid.steer > 0 ? 20 : 45));
      if (aid.steer > 0 && vx > 1.5) {
        let vzF = vb[2] - wb[1] * this.a, thF = Math.atan2(vzF, Math.max(vx, 0.5)), aPk = this.tyre.aPk * 0.92, assist = thF + sIn * aPk * (this.drift.on ? 1.35 : 1);
        tgt = lerp(tgt, assist, aid.steer * sstep(1.5, 8, vx));
      }
      tgt = clamp(tgt, -lock, lock);
      let rate = aid.steer > 0 ? 5.5 : 4.2;
      return this.steer + clamp(tgt - this.steer, -rate * dt, rate * dt);
    }
    /* stability control, the drift helper and the spin catcher. Returns a throttle multiplier. */
    _stability(dt, inp, vb, wb, thr) {
      let aid = this.aid, W2 = this.wheels, v = vb[0], beta = this.beta, r = wb[1], sIn = inp.steer || 0, mu = this.tyre.mu;
      for (let wh of W2) wh.escBrake = 0;
      this.escOn = !1, this.assistTorque = 0;
      let mult = 1, Iyaw = this.I[1], D = this.drift;
      if (aid.drift ? (!D.on && v > 9 && (inp.hb > 0.5 && Math.abs(sIn) > 0.15 || !this.plus && Math.abs(beta) > 0.22 && thr > 0.6 && Math.abs(sIn) > 0.3) && (D.on = !0, D.dir = -sgn(sIn) || sgn(beta), D.t = 0, D.low = 0, D.bPrev = void 0, D.bd = 0), D.on && (D.t += dt, Math.abs(beta) < 0.1 || sIn * D.dir > 0.35 ? D.low += dt : D.low = 0, (D.low > 0.35 || v < 6 || this.air && this.airT > 0.5) && (D.on = !1))) : D.on = !1, D.on) {
        let into = Math.max(0, -sIn * D.dir), bT = (0.3 + 0.3 * into) * D.dir, err = bT - beta, raw = D.bPrev === void 0 ? 0 : (beta - D.bPrev) / dt;
        return D.bPrev = beta, D.bd = (D.bd || 0) + (raw - (D.bd || 0)) * 0.25, this.assistTorque = clamp((6 * err - 2.5 * D.bd) * Iyaw, -5 * Iyaw, 5 * Iyaw) * Math.min(1, 0.3 + D.t * 3), clamp(0.55 + 2.5 * err * D.dir, 0.1, 1);
      }
      if (v < 4) return 1;
      if (aid.esc > 0) {
        let rMax = Math.min(mu * G / Math.max(v, 1), v * Math.tan(this.c.lock) / this.c.wb), rRef = -sIn * rMax, lim = 0.07 + 0.22 * (1 - aid.esc), over = Math.abs(beta) - lim, yawErr = r - rRef;
        if (over > 0 && Math.sign(r) === Math.sign(beta) && Math.abs(r) > 0.05) {
          let k = clamp(over * 6, 0, 1) * aid.esc, front = r > 0 ? W2[1] : W2[0];
          front.escBrake = 2400 * k, this.escOn = !0, mult = Math.min(mult, clamp(1 - over * 4 * aid.esc, 0.15, 1));
        } else if (Math.abs(yawErr) > 0.15 && Math.abs(r) > Math.abs(rRef) + 0.15 && Math.sign(r) === Math.sign(rRef || r)) {
          let k = clamp((Math.abs(r) - Math.abs(rRef) - 0.15) * 2, 0, 1) * aid.esc, front = r > 0 ? W2[1] : W2[0];
          front.escBrake = 1500 * k, this.escOn = k > 0.05;
        }
      }
      if (aid.catchSpin && Math.abs(beta) > 0.6 && v > 6) {
        let k = clamp((Math.abs(beta) - 0.6) * 2.5, 0, 1);
        this.assistTorque = -r * Iyaw * 6 * k;
      }
      if (this.plus && Math.abs(beta) > 0.3 && v > 5 && Math.sign(r) === Math.sign(beta)) {
        let k = clamp((Math.abs(beta) - 0.3) * 3, 0, 1);
        this.assistTorque = -r * Iyaw * 7 * k, mult = Math.min(mult, 1 - 0.5 * k);
      }
      return mult;
    }
    /* barrier and ground contacts on the hull: impulses with restitution and friction */
    _collide(dt) {
      let M = qmat(this.q), p = this.p, world2 = this.world, push = [0, 0, 0], pushN = 0;
      for (let hp of this.hull) {
        let P = add(p, mvec(M, hp)), loc = world2.locate(P, this.hint), wc = world2.wall(P, loc);
        wc && wc.pen > 0 && (this._impulse(M, P, wc.n, wc.pen, this.plus ? 0.04 : 0.18, this.plus ? 0.05 : 0.28, "wall"), push = madd(push, wc.n, wc.pen), pushN++);
        let g = world2.ground(P[0], P[2], loc ? loc.i : this.hint), pen = (g.y - P[1]) * g.n[1];
        pen > 0 && (this._impulse(M, P, g.n, pen, 0.05, 0.55, "ground"), push = madd(push, g.n, pen), pushN++);
      }
      if (pushN) for (let k = 0; k < 3; k++) this.p[k] += push[k] / pushN;
    }
    _impulse(M, P, n, pen, e, mu, kind) {
      let r = sub2(P, this.p), vr = add(this.v, cross2(this.w, r)), vn = dot2(vr, n);
      if (vn >= 0) return;
      let k = 1 / this.m + dot2(n, cross2(this.invI(M, cross2(r, n)), r)), j = -(1 + e) * vn / k, Jv = scale(n, j), vt = sub2(vr, scale(n, vn)), vtl = len(vt);
      if (vtl > 1e-4) {
        let t = scale(vt, 1 / vtl), kt = 1 / this.m + dot2(t, cross2(this.invI(M, cross2(r, t)), r)), jt = Math.min(mu * j, vtl / kt);
        Jv = madd(Jv, t, -jt);
      }
      for (let q = 0; q < 3; q++) this.v[q] += Jv[q] / this.m;
      let dw = this.invI(M, cross2(r, Jv));
      for (let q = 0; q < 3; q++) this.w[q] += dw[q];
      kind === "wall" ? (this.ev.wall = Math.max(this.ev.wall, -vn), vtl > 2 && (this.ev.scrape = Math.max(this.ev.scrape, vtl))) : this.ev.ground = Math.max(this.ev.ground, -vn);
    }
    takeEvents() {
      let e = this.ev;
      return this.ev = { wall: 0, land: 0, scrape: 0, ground: 0 }, e;
    }
  };

