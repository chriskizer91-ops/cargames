  // ===== game/truck.js =====
  /* A build on four wheels: the shared Vehicle with this truck's tyres, surfaces, lockers, low range
     and an SUV-shaped hull for the ground and the trees. */
  function makeTruck(b, world2) {
    let ch = buildChassis(b), e = buildSpec(b), v = new Vehicle(ch, e, world2), Yb = (y) => y - SUV.hcg0;
    v.surfMu = ch.surfMu, v.surfRR = ch.surfRR, v.surfDrag = ch.surfDrag, v.build = b, v.hull = [];
    for (let x of [2.42, 1.0, -0.2, -1.4, -2.4]) for (let z of [-0.84, 0.84]) v.hull.push([x, Yb(Math.abs(x) > 2.3 ? 0.46 : 0.33), z]);
    for (let x of [2.3, 0.4, -2.3]) for (let z of [-0.92, 0.92]) v.hull.push([x, Yb(0.85), z]);
    for (let x of [0.2, -2.0]) for (let z of [-0.7, 0.7]) v.hull.push([x, Yb(1.82), z]);
    v.hull.push([2.5, Yb(0.62), 0], [-2.45, Yb(0.62), 0], [0, Yb(0.3), 0]);
    v.low = !1, v.locked = !1, v.pt.lo = 1;
    return v;
  }
  function setLow(v, on) {
    let c = v.c.diff.can;
    if (!c.low) return !1;
    return v.low = on, v.pt.lo = on ? 2.64 : 1, v.c.diff.cLock = on, !0;
  }
  function setLockers(v, on) {
    let c = v.c.diff.can;
    if (!c.r) return !1;
    return v.locked = on, v.c.diff.rLock = on && c.r, v.c.diff.fLock = on && c.f, !0;
  }
  /* a flat, endless test strip for the shop's estimates */
  var FlatWorld = class {
    constructor(surf = "strip") {
      this.surf = surf;
    }
    locate() {
      return { i: 0, s: 0, d: 0 };
    }
    ground() {
      return { y: 0, n: [0, 1, 0], surf: this.surf, i: 0 };
    }
    raycast(o, d, maxT) {
      if (d[1] > -1e-4) return null;
      let t = -o[1] / d[1];
      return t < 0 || t > maxT ? null : { t, p: [o[0] + d[0] * t, 0, o[2] + d[2] * t], n: [0, 1, 0], surf: this.surf, i: 0 };
    }
    wall() {
      return null;
    }
  };
  /* run the build down an eighth mile of dirt with a clean launch: ET, trap speed and 0-60 */
  function quickPass(b, surf = "strip", dist = 201.168) {
    let v = makeTruck(b, new FlatWorld(surf)), dt = 1 / 240, t = 0, t60 = 0, launch = 0, hp = 0;
    v.place([0, 0, 0], 0), v.setAssists("arcade"), v.pt.st = "run", v.pt.we = v.pt.e.idle * TAU / 60;
    for (let i = 0; i < 480; i++) v.step(dt, { thr: 0, brk: 0, steer: 0 });
    for (let i = 0; i < 240; i++) v.step(dt, { thr: 1, brk: 1, steer: 0, nos: !1 });
    let x0 = v.p[0];
    for (; t < 30; ) {
      v.step(dt, { thr: 1, brk: 0, steer: 0, nos: !0 }), t += dt;
      let sp = v.speed;
      !t60 && sp >= 26.82 && (t60 = t);
      if (v.p[0] - x0 >= dist) break;
    }
    return { et: t, trap: v.speed, t60: t60 || 99 };
  }
