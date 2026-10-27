  // src/physics/tyre.js
  var TYRE_DEFAULT = { mu: 1.1, kPk: 0.11, aPk: 0.15, slide: 0.78, slideW: 0.55, loadSens: 0.12, fz0: 3600 };
  function tyreForce(t, Fz, kap, tanA, muMul, out) {
    if (Fz <= 0)
      return out.fx = 0, out.fy = 0, out.dk = 0, out.sg = 0, out;
    let lf = Math.max(0.6, 1 - t.loadSens * (Fz / t.fz0 - 1)), m = t.mu * muMul * lf * Fz, sx = kap / t.kPk, sy = tanA / Math.tan(t.aPk), sg = Math.hypot(sx, sy);
    if (out.sg = sg, sg < 1e-6)
      return out.fx = 2 * m * sx, out.fy = -2 * m * sy, out.dk = 2 * m / t.kPk, out;
    let f2, fp;
    if (sg < 1)
      f2 = sg * (2 - sg), fp = 2 - 2 * sg;
    else {
      let u = (sg - 1) / t.slideW, q = 1 + u * u;
      f2 = t.slide + (1 - t.slide) / q, fp = -(1 - t.slide) * 2 * u / (t.slideW * q * q);
    }
    let cx = sx / sg, cy = sy / sg;
    return out.fx = m * f2 * cx, out.fy = -m * f2 * cy, out.dk = Math.max(0, m * (fp * cx * cx + f2 / sg * cy * cy) / t.kPk), out;
  }

