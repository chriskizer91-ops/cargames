  // src/game/input.js
  var KEYS = {
    thr: ["ArrowUp", "KeyW"],
    brk: ["ArrowDown", "KeyS"],
    left: ["ArrowLeft", "KeyA"],
    right: ["ArrowRight", "KeyD"],
    hb: ["Space"],
    nos: ["ShiftLeft", "ShiftRight", "KeyN"],
    up: ["KeyE", "KeyX"],
    down: ["KeyQ", "KeyZ"],
    cam: ["KeyC"],
    reset: ["KeyR"],
    pause: ["Escape", "KeyP"],
    led: ["KeyL"],
    high: ["KeyH"],
    look: ["KeyB"],
    env: ["KeyT"],
    hud: ["KeyU"]
  }, Input = class {
    constructor(target = window) {
      this.down = /* @__PURE__ */ new Set(), this.pressed = /* @__PURE__ */ new Set(), this.steer = 0, this.thr = 0, this.brk = 0, this.pad = null, this.usingPad = !1, target.addEventListener("keydown", (e) => {
        e.repeat || (this.down.add(e.code), this.pressed.add(e.code), (e.code.startsWith("Arrow") || e.code === "Space") && e.preventDefault(), this.usingPad = !1);
      }), target.addEventListener("keyup", (e) => {
        this.down.delete(e.code);
      }), target.addEventListener("blur", () => this.down.clear());
    }
    key(k) {
      return KEYS[k].some((c) => this.down.has(c));
    }
    /* true once per press */
    hit(k) {
      let h = !1;
      for (let c of KEYS[k]) this.pressed.has(c) && (h = !0);
      return h;
    }
    /* read everything for this frame */
    poll(dt) {
      let pads = navigator.getGamepads ? navigator.getGamepads() : [], gp = null;
      for (let p of pads) if (p && p.connected) {
        gp = p;
        break;
      }
      let out = { steer: 0, thr: 0, brk: 0, hb: 0, nos: !1, up: !1, down: !1, cam: !1, reset: !1, pause: !1, led: !1, high: !1, look: !1, env: !1, hud: !1 }, kl = this.key("left"), kr = this.key("right"), tgt = (kr ? 1 : 0) - (kl ? 1 : 0), rate = tgt === 0 ? 6.5 : Math.sign(tgt) !== Math.sign(this.steer) && this.steer !== 0 ? 9 : 3.2;
      this.steer += Math.max(-rate * dt, Math.min(rate * dt, tgt - this.steer));
      let kt = this.key("thr") ? 1 : 0, kb = this.key("brk") ? 1 : 0;
      this.thr += Math.max(-8 * dt, Math.min(6 * dt, kt - this.thr)), this.brk += Math.max(-10 * dt, Math.min(8 * dt, kb - this.brk)), out.steer = this.steer, out.thr = this.thr, out.brk = this.brk, out.hb = this.key("hb") ? 1 : 0, out.nos = this.key("nos");
      for (let k of ["up", "down", "cam", "reset", "pause", "led", "high", "look", "env", "hud"]) out[k] = this.hit(k);
      if (this.key("look") && (out.look = !0), gp) {
        let sx = ((v, d = 0.08) => Math.abs(v) < d ? 0 : (v - Math.sign(v) * d) / (1 - d))(gp.axes[0] || 0), rt = gp.buttons[7] ? gp.buttons[7].value : 0, lt = gp.buttons[6] ? gp.buttons[6].value : 0;
        (Math.abs(sx) > 0 || rt > 0.02 || lt > 0.02 || gp.buttons.some((b) => b.pressed)) && (this.usingPad = !0), this.usingPad && (out.steer = Math.sign(sx) * Math.pow(Math.abs(sx), 1.35), out.thr = rt, out.brk = lt, out.hb = gp.buttons[0] && gp.buttons[0].pressed ? 1 : out.hb, out.nos = out.nos || !!(gp.buttons[5] && gp.buttons[5].pressed));
        let prev = this.padPrev || [], press = (i) => gp.buttons[i] && gp.buttons[i].pressed && !prev[i], now = performance.now(), ay = gp.axes[1] || 0, ax0 = gp.axes[0] || 0, dir = gp.buttons[12] && gp.buttons[12].pressed || ay < -0.6 ? "up" : gp.buttons[13] && gp.buttons[13].pressed || ay > 0.6 ? "down" : gp.buttons[14] && gp.buttons[14].pressed || ax0 < -0.6 ? "left" : gp.buttons[15] && gp.buttons[15].pressed || ax0 > 0.6 ? "right" : null;
        out.nav = [], dir && (dir !== this.navDir || now > this.navT) && (out.nav.push(dir), this.navT = now + (dir !== this.navDir ? 380 : 110)), this.navDir = dir, press(0) && out.nav.push("enter"), press(1) && out.nav.push("back"), press(1) && (out.up = !0), press(2) && (out.down = !0), press(3) && (out.cam = !0), press(9) && (out.pause = !0), press(8) && (out.reset = !0), press(4) && (out.look = !0), this.padPrev = gp.buttons.map((b) => b.pressed);
      }
      return this.pressed.clear(), out;
    }
  };

  // src/game/camera.js
  var CAM_MODES = ["chase", "far", "hood", "bumper", "cockpit", "tv"], springTo = (x, v, t, w, dt) => {
    let a = 2 * dt * w, b = dt * dt * w * w, n = (x * (1 + a) + dt * v + b * t) / (1 + a + b);
    return [n, (n - x) / dt];
  }, CameraRig = class {
    constructor(T2) {
      this.T = T2, this.mode = 0, this.yaw = null, this.yawV = 0, this.pos = null, this.pv = [0, 0, 0], this.shake = 0, this.tvIdx = -1, this.tvPos = null, this.cut = !0, this.fq = null, this.lookBack = !1, this.pitchSm = 0;
    }
    next() {
      this.mode = (this.mode + 1) % CAM_MODES.length, this.cut = !0, this.yaw = null, this.pos = null, this.tvIdx = -1;
    }
    get name() {
      return CAM_MODES[this.mode];
    }
    update(dt, car2, { look = !1, impact = 0 } = {}) {
      let M = qmat(car2.q), F = mcol(M, 0), U = mcol(M, 1), Rt = mcol(M, 2), hcg = car2.c.hcg, v = car2.v, sp = len(v), mode = CAM_MODES[this.mode], cut = this.cut;
      this.cut = !1, look !== this.lookBack && (this.lookBack = look, cut = !0, this.yaw = null, this.pos = null);
      let out = { near: 0.25, lensRain: 0, fov: 1.15, cut };
      if (this.orbit) {
        let o = this.orbit, c = add(car2.p, mvec(M, [o.x || 0, o.y || 0, 0])), yaw = Math.atan2(-F[2], F[0]) + o.yaw, dir = [Math.cos(o.pitch) * Math.cos(yaw), Math.sin(o.pitch), -Math.cos(o.pitch) * Math.sin(yaw)];
        return out.pos = madd(c, dir, o.dist), out.fwd = scale(dir, -1), out.up = [0, 1, 0], out.fov = o.fov || 0.7, out.cut = !0, out;
      }
      this.shake = Math.max(this.shake * Math.exp(-dt * 6), impact * 0.6);
      let body = (x, y, z) => add(car2.p, mvec(M, [x, y - hcg, z]));
      if (mode === "chase" || mode === "far" || look) {
        let fh = norm2([F[0], 0, F[2]]), dir = fh;
        if (sp > 3) {
          let vd = norm2([v[0], 0, v[2]]), k = clamp((sp - 3) / 12, 0, 1) * 0.45 * (dot2(vd, fh) > 0 ? 1 : 0);
          dir = norm2([fh[0] + vd[0] * k, 0, fh[2] + vd[2] * k]);
        }
        look && (dir = [-dir[0], 0, -dir[2]]);
        let ty = Math.atan2(-dir[2], dir[0]);
        this.yaw === null && (this.yaw = ty, this.yawV = 0);
        let d = ty - this.yaw;
        for (; d > Math.PI; ) d -= 2 * Math.PI;
        for (; d < -Math.PI; ) d += 2 * Math.PI;
        let w = 4.2 + clamp(sp / 12, 0, 3.5);
        [this.yaw, this.yawV] = springTo(this.yaw, this.yawV, this.yaw + d, w, dt);
        let h = [Math.cos(this.yaw), 0, -Math.sin(this.yaw)], far = mode === "far", dist = (far ? 7.6 : 5.5) + clamp(sp * 0.018, 0, 1.4), ht = (far ? 2.6 : 1.55) - clamp(sp * 4e-3, 0, 0.2), tgt = [car2.p[0] - h[0] * dist, car2.p[1] + ht, car2.p[2] - h[2] * dist], L = this.T.locate(tgt[0], tgt[2], -1);
        if (L) {
          let lim = (L.d > 0 ? this.T.wl : this.T.wr) - 0.45;
          if (Math.abs(L.d) > lim) {
            let fr = this.T.frame(L.s), push = (Math.abs(L.d) - lim) * Math.sign(L.d);
            tgt = madd(tgt, fr.l, -push);
          }
          tgt[1] = Math.max(tgt[1], this.T.yAt(L.s) + 0.6);
        }
        let ax = clamp((car2.accB ? car2.accB[0] : 0) * 0.05, -0.5, 0.8), off = [tgt[0] - car2.p[0] - h[0] * ax, tgt[1] - car2.p[1], tgt[2] - car2.p[2] - h[2] * ax];
        (!this.pos || cut) && (this.off = off.slice(), this.pv = [0, 0, 0]);
        for (let k = 0; k < 3; k++) {
          let wk = k === 1 ? 6 : 8, r = springTo(this.off[k], this.pv[k], off[k], wk, dt);
          this.off[k] = r[0], this.pv[k] = r[1];
        }
        this.pos = add(car2.p, this.off);
        {
          let L2 = this.T.locate(this.pos[0], this.pos[2], -1);
          if (L2) {
            let lim = (L2.d > 0 ? this.T.wl : this.T.wr) - 0.35;
            if (Math.abs(L2.d) > lim) {
              let fr = this.T.frame(L2.s);
              this.pos = madd(this.pos, fr.l, -(Math.abs(L2.d) - lim) * Math.sign(L2.d));
            }
            this.pos[1] = Math.max(this.pos[1], this.T.yAt(L2.s) + 0.5);
          }
        }
        let at = [car2.p[0] + h[0] * 2.6, car2.p[1] + 0.62, car2.p[2] + h[2] * 2.6];
        out.pos = this.pos.slice(), out.fwd = norm2(sub2(at, out.pos)), out.up = [0, 1, 0], out.fov = (far ? 1 : 1.12) + clamp(sp * 35e-4, 0, 0.28);
      } else if (mode === "hood" || mode === "bumper" || mode === "cockpit") {
        let p = mode === "hood" ? body(0.75, 1.02, 0) : mode === "bumper" ? body(2.32, 0.42, 0) : body(-0.27, 1.12, -0.38);
        (!this.fq || cut) && (this.fq = { F, U });
        let k = 1 - Math.exp(-dt * (mode === "cockpit" ? 14 : 22));
        this.fq.F = norm2(madd(this.fq.F, sub2(F, this.fq.F), k)), this.fq.U = norm2(madd(this.fq.U, sub2(U, this.fq.U), k)), out.pos = p, out.fwd = this.fq.F, out.up = this.fq.U, out.near = mode === "cockpit" ? 0.06 : 0.12, out.fov = mode === "cockpit" ? 1.2 : 1.08 + clamp(sp * 3e-3, 0, 0.22), out.lensRain = mode === "bumper" ? 1 : mode === "hood" ? 0.6 : 0, this.pos = null, this.yaw = null;
      } else {
        let T2 = this.T, s = car2.loc ? car2.loc.s : 0, N2 = Math.max(8, Math.round(T2.len / 110)), seg = T2.len / N2, idx = Math.floor(T2.wrapS(s + seg * 0.55) / seg) % N2;
        if (idx !== this.tvIdx) {
          this.tvIdx = idx;
          let cs = idx * seg, side = idx % 2 ? 1 : -1;
          this.tvPos = T2.pos(cs, side * (T2.wl + 1.6), 4.5 + idx % 3 * 1.5), out.cut = !0;
        }
        out.pos = this.tvPos;
        let at = [car2.p[0], car2.p[1] + 0.3, car2.p[2]];
        out.fwd = norm2(sub2(at, out.pos)), out.up = [0, 1, 0];
        let dd = len(sub2(at, out.pos));
        out.fov = clamp(2 * Math.atan(6 / dd), 0.18, 1.1), this.pos = null, this.yaw = null;
      }
      if (this.shake > 1e-3 && out.pos) {
        let s = this.shake * 0.05;
        out.pos = [out.pos[0] + (Math.random() - 0.5) * s, out.pos[1] + (Math.random() - 0.5) * s, out.pos[2] + (Math.random() - 0.5) * s];
      }
      return out;
    }
  };

