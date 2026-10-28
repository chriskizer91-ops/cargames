  // ===== render/suv-model.js =====
  /* The truck: an original mid-2000s luxury SUV, lofted from cross-sections like the Shiftlight cars,
     but tall, soft-shouldered and long-roofed. Everything is in metres with x forward, y up from the
     ground at stock ride height and z to the right; the renderer shifts it so the origin is the centre
     of mass. Bolt-on parts are generated with the body so a build is one mesh. */
  var SUV = {
    /* stations: x, bottom, half width, shoulder height, beltline (top of the body side), crown above it.
       A tall, nearly upright face and tail, the hood held high to the nose, and hips over both axles. */
    st: [
      [-2.47, 0.48, 0.76, 0.64, 1.0, 0],
      [-2.46, 0.45, 0.85, 0.66, 1.08, 0.01],
      [-2.43, 0.43, 0.9, 0.72, 1.13, 0.01],
      [-2.36, 0.42, 0.922, 0.77, 1.155, 0.005],
      [-2.2, 0.42, 0.934, 0.8, 1.16, 0],
      [-1.82, 0.44, 0.95, 0.83, 1.16, 0],
      [-1.44, 0.46, 0.958, 0.84, 1.16, 0],
      [-1.08, 0.4, 0.94, 0.85, 1.155, 0],
      [-0.8, 0.32, 0.918, 0.86, 1.15, 0],
      [-0.4, 0.31, 0.914, 0.86, 1.145, 0],
      [0, 0.31, 0.914, 0.86, 1.14, 0],
      [0.4, 0.31, 0.916, 0.86, 1.135, 0],
      [0.8, 0.32, 0.92, 0.86, 1.128, 0],
      [0.95, 0.34, 0.926, 0.86, 1.116, 0.04],
      [1.18, 0.44, 0.946, 0.855, 1.1, 0.05],
      [1.45, 0.46, 0.96, 0.85, 1.088, 0.055],
      [1.72, 0.44, 0.948, 0.845, 1.077, 0.055],
      [2, 0.42, 0.936, 0.835, 1.067, 0.05],
      [2.22, 0.4, 0.928, 0.82, 1.058, 0.045],
      [2.36, 0.4, 0.92, 0.8, 1.05, 0.038],
      [2.44, 0.41, 0.898, 0.78, 1.036, 0.028],
      [2.49, 0.42, 0.85, 0.76, 1.012, 0.018],
      [2.515, 0.43, 0.75, 0.74, 0.985, 0.01],
      [2.53, 0.45, 0.56, 0.72, 0.95, 0]
    ],
    /* greenhouse rows: x, roof height, roof half width */
    gh: [[-2.315, 1.165, 0.705], [-2.275, 1.35, 0.715], [-2.21, 1.55, 0.725], [-2.1, 1.745, 0.735], [-1.8, 1.785, 0.745], [-1.2, 1.8, 0.752], [-0.5, 1.792, 0.758], [-0.1, 1.762, 0.765], [0.12, 1.685, 0.772], [0.36, 1.52, 0.782], [0.6, 1.32, 0.792], [0.815, 1.13, 0.8]],
    axF: 1.45, axR: -1.44, R0: 0.375, archR: 0.462, mirror: [0.6, 1.2, 1.0], hcg0: 0.74,
    nose: 2.53, tail: -2.47
  };
  /* the raised centre of the hood, by x */
  var hoodDome = (x) => 0.032 * Math.max(0, Math.min(1, (x - 1.0) / 0.22)) * Math.max(0, Math.min(1, (2.44 - x) / 0.16));
  /* Catmull-Rom through an array of numbers */
  function crA(a, t) {
    let n = a.length, i = Math.max(0, Math.min(n - 2, Math.floor(t))), f = t - i, p0 = a[Math.max(0, i - 1)], p1 = a[i], p2 = a[i + 1], p3 = a[Math.min(n - 1, i + 2)];
    return 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
  }
  /* triangles and quads from existing vertices, wound to face the way their normals point */
  function _vp(B, i) {
    return [B.f[i * 9], B.f[i * 9 + 1], B.f[i * 9 + 2]];
  }
  function _vn(B, i) {
    return [B.s[i * 18 + 6], B.s[i * 18 + 7], B.s[i * 18 + 8]];
  }
  var _ad = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  function face3(B, a, b, c, n) {
    let pa = _vp(B, a), g = cross(sub(_vp(B, b), pa), sub(_vp(B, c), pa)), nn = n || _ad(_ad(_vn(B, a), _vn(B, b)), _vn(B, c));
    dot(g, nn) >= 0 ? B.tri(a, b, c) : B.tri(a, c, b);
  }
  function face4(B, a, b, c, d) {
    let pa = _vp(B, a), g = cross(sub(_vp(B, b), pa), sub(_vp(B, d), pa)), g2 = cross(sub(_vp(B, d), _vp(B, c)), sub(_vp(B, b), _vp(B, c))), nn = _ad(_ad(_vn(B, a), _vn(B, b)), _ad(_vn(B, c), _vn(B, d)));
    dot(_ad(g, g2), nn) >= 0 ? B.quad(a, b, c, d) : B.quad(a, d, c, b);
  }
  /* a rounded box (superellipsoid): centre, unit axes, half sizes; e near 0 is a box, 1 an ellipsoid */
  function rbox3(B, c, ax, ay, az, h, e = 0.3, nu = 20, nv = 10) {
    let f = (w, m) => Math.sign(w) * Math.pow(Math.abs(w), m), grid = [];
    for (let j = 0; j <= nv; j++) {
      let v = -Math.PI / 2 + Math.PI * j / nv, cv = Math.cos(v), sv = Math.sin(v), row = [];
      for (let i = 0; i <= nu; i++) {
        let u = -Math.PI + 2 * Math.PI * i / nu, cu = Math.cos(u), su = Math.sin(u), l = [f(cv, e) * f(cu, e) * h[0], f(sv, e) * h[1], f(cv, e) * f(su, e) * h[2]], n = [f(cv, 2 - e) * f(cu, 2 - e) / h[0], f(sv, 2 - e) / h[1], f(cv, 2 - e) * f(su, 2 - e) / h[2]];
        (Math.abs(n[0]) + Math.abs(n[1]) + Math.abs(n[2]) < 1e-9) && (n = [0, sv, 0]);
        row.push(B.v([c[0] + ax[0] * l[0] + ay[0] * l[1] + az[0] * l[2], c[1] + ax[1] * l[0] + ay[1] * l[1] + az[1] * l[2], c[2] + ax[2] * l[0] + ay[2] * l[1] + az[2] * l[2]], [ax[0] * n[0] + ay[0] * n[1] + az[0] * n[2], ax[1] * n[0] + ay[1] * n[1] + az[1] * n[2], ax[2] * n[0] + ay[2] * n[1] + az[2] * n[2]], i / nu, j / nv));
      }
      grid.push(row);
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) face4(B, grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]);
  }
  /* the build's visual description, with what the parts imply filled in */
  function suvLook(b) {
    let L = Object.assign({ lift: 0, tireR: SUV.R0, tireW: 0.245, rim: 18, wheel: "stock", tread: "street", trackF: 1.56, trackR: 1.56, front: "stock", rear: "stock", roof: "rails", lightbar: 0, ditch: 0, pods: 0, flares: 0, hood: "stock", snorkel: 0, sides: "cladding", exhaust: "stock", spoiler: 1, wheelie: 0, chute: 0, stacks: 0, accent: 0, calipers: 0 }, b || {});
    /* the arches are trimmed for big tyres */
    L.archR = Math.max(SUV.archR, L.tireR + 0.05 - L.lift * 0.35);
    return L;
  }
  function buildSUV(look) {
    let L = suvLook(look), hcg = SUV.hcg0 + L.lift, lift = L.lift, Y = (y) => y + lift - hcg, st = SUV.st, ns = st.length, B = new MeshBuilder(32768), GH = new MeshBuilder(8192), SUBX = 4, sx = [];
    for (let i = 0; i < ns - 1; i++) for (let k = 0; k < SUBX; k++) sx.push(i + k / SUBX);
    sx.push(ns - 1);
    let prm = (t, j) => crA(st.map((s) => s[j]), t), profile = (t) => {
      let yb = prm(t, 1), w = prm(t, 2), ym = prm(t, 3), yt = prm(t, 4), c = prm(t, 5), d = hoodDome(prm(t, 0));
      return smooth2([[0, yb], [w * 0.8, yb], [w * 0.925, yb + 0.05], [w * 0.982, yb + (ym - yb) * 0.42], [w, ym], [w * 0.995, ym + (yt - ym) * 0.55], [w * 0.975, yt - 0.024], [w * 0.925, yt - 0.003 + c * 0.5], [w * 0.66, yt + c * 0.88 + 0.011], [w * 0.47, yt + c * 0.95 + 0.014], [w * 0.38, yt + c + 0.016 + d * 0.85], [w * 0.22, yt + c + 0.019 + d], [0, yt + c + 0.02 + d]], 3);
    };
    /* ---------- the body shell ---------- */
    B.mat(0);
    let rows = [];
    for (let t of sx) {
      let x = prm(t, 0), half = profile(t).map(([z, y]) => [x, Y(y), z]);
      rows.push([...half.slice(1).reverse().map((p) => [p[0], p[1], -p[2]]), ...half]);
    }
    let nr = rows.length, np = rows[0].length, idx = [];
    for (let i = 0; i < nr; i++) {
      let r = [];
      for (let j = 0; j < np; j++) {
        let a = rows[Math.min(nr - 1, i + 1)][j], b = rows[Math.max(0, i - 1)][j], c = rows[i][Math.min(np - 1, j + 1)], d = rows[i][Math.max(0, j - 1)], n = cross(sub(a, b), sub(c, d));
        (j === 0 || j === np - 1) && (n = [n[0], n[1], 0]);
        r.push(B.v(rows[i][j], n, j / (np - 1), rows[i][j][0]));
      }
      idx.push(r);
    }
    for (let i = 0; i < nr - 1; i++) for (let j = 0; j < np - 1; j++) B.quad(idx[i][j], idx[i + 1][j], idx[i + 1][j + 1], idx[i][j + 1]);
    for (let [i, dir] of [[0, -1], [nr - 1, 1]]) {
      let r = rows[i], c = [r[0][0] + dir * 4e-3, (r[0][1] + r[np - 1 >> 1][1]) / 2, 0], ci = B.v(c, [dir, 0, 0], 0.5, c[0]), ring = r.map((p) => B.v(p, [dir, 0, 0], 0.5, p[0]));
      for (let j = 0; j < np - 1; j++) dir > 0 ? B.tri(ci, ring[j + 1], ring[j]) : B.tri(ci, ring[j], ring[j + 1]);
    }
    /* ---------- the greenhouse ---------- */
    let gh = SUV.gh, ng = gh.length, gsx = [];
    for (let i = 0; i < ng - 1; i++) for (let k = 0; k < 4; k++) gsx.push(i + k / 4);
    gsx.push(ng - 1);
    let bodyAt = (x) => {
      let lo = 0;
      for (let i = 0; i < ns - 1; i++) st[i][0] <= x && (lo = i);
      return lo + Math.max(0, Math.min(1, (x - st[lo][0]) / Math.max(1e-6, st[lo + 1][0] - st[lo][0])));
    }, grows = [], gU = [];
    for (let t of gsx) {
      let x = crA(gh.map((g) => g[0]), t), yr = crA(gh.map((g) => g[1]), t), wr = crA(gh.map((g) => g[2]), t), bt = bodyAt(x), yb = prm(bt, 4), wb = prm(bt, 2) * 0.952, h = yr - yb, P = [[wb, yb - 0.034], [wb - (wb - wr) * 0.42, yb + h * 0.5], [wr + 0.014, yr - 0.055 * Math.min(1, h / 0.3)], [wr * 0.88, yr - 0.01], [wr * 0.45, yr + 0.004], [0, yr + 0.008]], sm = smooth2(P, 4), u = sm.map((_, k) => k / (sm.length - 1)), half = sm.map(([z, y]) => [x, Y(y), z]);
      grows.push([...half.map((p) => [p[0], p[1], -p[2]]), ...half.slice(0, -1).reverse()]), gU.push([...u, ...u.slice(0, -1).reverse()]);
    }
    let gr = grows.length, gp = grows[0].length, gidx = [];
    GH.mat(1);
    for (let i = 0; i < gr; i++) {
      let r = [];
      for (let j = 0; j < gp; j++) {
        let a = grows[Math.min(gr - 1, i + 1)][j], b = grows[Math.max(0, i - 1)][j], c = grows[i][Math.min(gp - 1, j + 1)], d = grows[i][Math.max(0, j - 1)], p = grows[i][j];
        r.push(GH.v(p, cross(sub(c, d), sub(a, b)), gU[i][j], p[0]));
      }
      gidx.push(r);
    }
    for (let i = 0; i < gr - 1; i++) for (let j = 0; j < gp - 1; j++) GH.quad(gidx[i][j], gidx[i][j + 1], gidx[i + 1][j + 1], gidx[i + 1][j]);
    /* the headliner, seen through the glass */
    {
      let li = [];
      for (let i = 0; i < gr; i++) {
        let r = [];
        for (let j = 0; j < gp; j++) {
          let p = grows[i][j], q = [p[0], p[1] - 0.03, p[2] * 0.97];
          B.mat(14, 40), r.push(B.v(q, [0, -1, -p[2]], gU[i][j], p[0]));
        }
        li.push(r);
      }
      for (let i = 0; i < gr - 1; i++) for (let j = 0; j < gp - 1; j++) B.quad(li[i][j], li[i + 1][j], li[i + 1][j + 1], li[i][j + 1]);
    }
    /* ---------- the cabin: tub, dash, seats, wheel ---------- */
    let bx = (c, h, mat, p1 = 0, ax = [1, 0, 0], ay = [0, 1, 0], az = [0, 0, 1]) => {
      B.mat(mat, p1), B.box([c[0], Y(c[1]), c[2]], ax, ay, az, h);
    }, tube = (a, b, r, mat, p1 = 0, n = 8, caps = !0, r2 = r) => {
      B.mat(mat, p1), B.tube([a[0], Y(a[1]), a[2]], [b[0], Y(b[1]), b[2]], r, n, caps, r2);
    };
    B.mat(8, 60), ((x0, x1, y0, y1, z0, z1) => {
      let P = (x, y, z) => [x, Y(y), z];
      B.quadP(P(x0, y0, z0), P(x0, y0, z1), P(x1, y0, z1), P(x1, y0, z0), void 0, [0, 1, 0]), B.quadP(P(x1, y0, z0), P(x1, y0, z1), P(x1, y1, z1), P(x1, y1, z0), void 0, [-1, 0, 0]), B.quadP(P(x0, y0, z1), P(x0, y0, z0), P(x0, y1, z0), P(x0, y1, z1), void 0, [1, 0, 0]), B.quadP(P(x0, y0, z0), P(x1, y0, z0), P(x1, y1, z0), P(x0, y1, z0), void 0, [0, 0, 1]), B.quadP(P(x1, y0, z1), P(x0, y0, z1), P(x0, y1, z1), P(x1, y1, z1), void 0, [0, 0, -1]);
    })(-2.3, 0.8, 0.42, 1.12, -0.88, 0.88);
    let seat = (x, z, w = 0.27, y0 = 0.62) => {
      bx([x, y0, z], [0.27, 0.075, w], 8, 95);
      let ax = norm([0.22, -1, 0]), ay = norm([1, 0.22, 0]);
      B.mat(8, 95), B.box([x - 0.29, Y(y0 + 0.36), z], ay, [0, 0, 1], ax, [0.36, w, 0.065]);
      bx([x - 0.36, y0 + 0.78, z], [0.05, 0.09, w * 0.55], 8, 95);
    };
    seat(0.02, -0.4), seat(0.02, 0.4), seat(-0.96, -0.43, 0.3), seat(-0.96, 0, 0.16), seat(-0.96, 0.43, 0.3);
    bx([0.62, 1.03, 0], [0.2, 0.09, 0.84], 8, 40), bx([0.5, 0.93, 0], [0.13, 0.06, 0.84], 8, 40), bx([0.28, 0.62, 0], [0.34, 0.12, 0.12], 8, 50);
    B.mat(9, 0), B.quadP([0.52, Y(1.05), -0.58], [0.52, Y(1.05), -0.2], [0.53, Y(1.14), -0.2], [0.53, Y(1.14), -0.58], void 0, [-1, 0.1, 0]);
    B.mat(9, 1), B.box([0.6, Y(1.02), 0], norm([0.6, 1, 0]), norm([-1, 0.6, 0]), [0, 0, 1], [0.07, 0.01, 0.13]);
    {
      let c = [0.36, Y(1.03), -0.4], ax = norm([1, 0.6, 0]), u = [0, 0, 1], w = norm(cross(ax, u)), n = 20;
      B.mat(2, 60);
      for (let k = 0; k < n; k++) {
        let a0 = k / n * Math.PI * 2, a1 = (k + 1) / n * Math.PI * 2, p = (a) => [c[0] + (u[0] * Math.cos(a) + w[0] * Math.sin(a)) * 0.19, c[1] + (u[1] * Math.cos(a) + w[1] * Math.sin(a)) * 0.19, c[2] + (u[2] * Math.cos(a) + w[2] * Math.sin(a)) * 0.19];
        B.tube(p(a0), p(a1), 0.018, 5, !1);
      }
      B.tube(c, [c[0] + 0.24, c[1] - 0.14, c[2]], 0.026, 5, !1);
    }
    /* ---------- mirrors ---------- */
    /* big housings on a black sail: painted caps with rounded edges, black lower halves, an amber repeater */
    for (let s of [-1, 1]) {
      let [mx, my, mz] = SUV.mirror, c = [mx, Y(my), mz * s], ax = norm([1, 0, -0.12 * s]), az = norm([0.12 * s, 0, 1]);
      B.mat(2, 70), B.box([mx + 0.07, Y(my - 0.085), s * 0.905], [1, 0, 0], [0, 1, 0], [0, 0, 1], [0.085, 0.045, 0.035]);
      B.mat(2, 70), B.box([c[0] + 0.02, c[1] - 0.075, c[2] - 0.075 * s], ax, [0, 1, 0], az, [0.03, 0.02, 0.08]);
      B.mat(0), rbox3(B, [c[0] + 0.012, c[1] + 0.03, c[2]], ax, [0, 1, 0], az, [0.066, 0.085, 0.145], 0.32);
      B.mat(2, 60), rbox3(B, [c[0] + 0.008, c[1] - 0.035, c[2]], ax, [0, 1, 0], az, [0.062, 0.04, 0.14], 0.32);
      B.mat(9, 1), B.box([c[0] + 0.07, c[1] - 0.03, c[2] + 0.07 * s], ax, [0, 1, 0], az, [4e-3, 0.01, 0.05]);
      B.mat(13);
      let g = [c[0] + 0.012 - ax[0] * 0.066, 0, c[2] - ax[2] * 0.066], P = (k, y) => [g[0] + az[0] * 0.125 * k, c[1] + y, g[2] + az[2] * 0.125 * k];
      B.quadP(P(-1, -0.06), P(1, -0.06), P(1, 0.1), P(-1, 0.1), void 0, neg(ax));
    }
    /* ---------- underneath: floor, frame rails, tanks, the stock exhaust ---------- */
    B.mat(11), B.quadP([-2.36, Y(0.33), 0.84], [-2.36, Y(0.33), -0.84], [2.38, Y(0.36), -0.82], [2.38, Y(0.36), 0.82], void 0, [0, -1, 0]);
    for (let z of [-0.52, 0.52]) bx([0, 0.36, z], [2.15, 0.07, 0.045], 11, 0);
    bx([-1.9, 0.38, 0], [0.32, 0.1, 0.52], 11, 0), bx([0.25, 0.4, 0], [0.9, 0.05, 0.14], 11, 0);
    /* ---------- wheel arches: liners and lips ---------- */
    let archR = L.archR, ay = SUV.R0;
    for (let ax of [SUV.axF, SUV.axR]) for (let s of [-1, 1]) {
      let r = archR - 5e-3, z0 = s * 0.42, z1 = s * 0.94, cx = ax, cy = Y(ay), n = 18, pts = [];
      B.mat(12);
      for (let k = 0; k <= n; k++) {
        let a = Math.PI * (k / n);
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
      for (let k = 0; k < n; k++) {
        let [x0, y0] = pts[k], [x1, y1] = pts[k + 1], nn = [-(x0 + x1) / 2 + cx, -(y0 + y1) / 2 + cy, 0], a = B.v([x0, y0, z0], nn), b = B.v([x1, y1, z0], nn), c = B.v([x1, y1, z1], nn), d = B.v([x0, y0, z1], nn);
        s > 0 ? B.quad(a, d, c, b) : B.quad(a, b, c, d);
      }
      for (let k = 0; k < n; k++) {
        let [x0, y0] = pts[k], [x1, y1] = pts[k + 1], a = B.v([x0, y0, z0], [0, 0, s]), b = B.v([x1, y1, z0], [0, 0, s]), c = B.v([cx, cy, z0], [0, 0, s]);
        s > 0 ? B.tri(a, b, c) : B.tri(a, c, b);
      }
      /* cladding around the opening: the factory's textured flares, pocket flares, or wide bolted ones.
         Cross-section from the lip outward: [radius offset, distance out from the centreline] */
      let fl = L.flares, rr = archR + 6e-3, w0 = fl === 2 ? 0.13 : fl ? 0.095 : 0.07, out = fl === 2 ? 0.075 : fl ? 0.05 : 0.028, sec = [[-6e-3, 0.9], [4e-3, 0.955 + out * 0.82], [w0 * 0.3, 0.955 + out], [w0 * 0.78, 0.955 + out * 0.9], [w0, 0.94], [w0 + 8e-3, 0.9]], a0 = fl === 2 ? -0.1 : -0.06, a1 = 1 - a0, grid = [];
      B.mat(18, fl === 2 ? 1 : 0);
      for (let k = 0; k <= n; k++) {
        let a = Math.PI * (a0 + (a1 - a0) * k / n), c = Math.cos(a), sn = Math.sin(a), grow = 1 + 0.5 * sn * sn, row = [];
        for (let m = 0; m < sec.length; m++) {
          let r = rr + sec[m][0] * (m ? grow : 1), pa = sec[Math.max(0, m - 1)], pb = sec[Math.min(sec.length - 1, m + 1)], dr = pb[0] - pa[0], dz = pb[1] - pa[1];
          row.push(B.v([cx + c * r, cy + sn * r, s * sec[m][1]], [-dz * c, -dz * sn, dr * s], k / n, m));
        }
        grid.push(row);
      }
      for (let k = 0; k < n; k++) for (let m = 0; m < sec.length - 1; m++) face4(B, grid[k][m], grid[k + 1][m], grid[k + 1][m + 1], grid[k][m + 1]);
      /* close the ends where they meet the rocker and the bumper */
      for (let k of [0, n]) {
        let a = Math.PI * (k ? a1 : a0), e = k ? [-Math.sin(a), Math.cos(a), 0] : [Math.sin(a), -Math.cos(a), 0], c = Math.cos(a), sn = Math.sin(a), grow = 1 + 0.5 * sn * sn, pts = sec.map(([dr, z], m) => B.v([cx + c * (rr + dr * (m ? grow : 1)), cy + sn * (rr + dr * (m ? grow : 1)), s * z], e));
        for (let m = 1; m < pts.length - 1; m++) face3(B, pts[0], pts[m], pts[m + 1], e);
      }
      if (fl === 2) for (let k = 1; k < n; k += 3) {
        let a = Math.PI * (a0 + (a1 - a0) * k / n), sn = Math.sin(a), r = rr + w0 * 0.55 * (1 + 0.5 * sn * sn);
        B.mat(3), B.sphere([cx + Math.cos(a) * r, cy + sn * r, s * (0.955 + out + 4e-3)], 0.012, 6, 3);
      }
    }
    /* ---------- cladding along the rockers between the arches, with an optional accent line ---------- */
    if (L.sides === "cladding" || L.sides === "boards") for (let s of [-1, 1]) {
      let xa = SUV.axR + archR + 0.07, xb = SUV.axF - archR - 0.07, sec = [[0.88, 0.3], [0.935, 0.315], [0.958, 0.355], [0.962, 0.47], [0.95, 0.53], [0.915, 0.55]], n = sec.length, rowA = [], rowB = [];
      B.mat(18, 0);
      for (let j = 0; j < n; j++) {
        let [z, y] = sec[j], pa = sec[Math.max(0, j - 1)], pb = sec[Math.min(n - 1, j + 1)], nn = [0, -(pb[0] - pa[0]), (pb[1] - pa[1]) * s];
        rowA.push(B.v([xa, Y(y), s * z], nn, 0, y)), rowB.push(B.v([xb, Y(y), s * z], nn, xb - xa, y));
      }
      for (let j = 0; j < n - 1; j++) face4(B, rowA[j], rowB[j], rowB[j + 1], rowA[j + 1]);
      for (let [x, d] of [[xa, -1], [xb, 1]]) {
        let ring = sec.map(([z, y]) => B.v([x, Y(y), s * z], [d, 0, 0])), c = B.v([x, Y(0.43), s * 0.9], [d, 0, 0]);
        for (let j = 0; j < n - 1; j++) face3(B, c, ring[j], ring[j + 1], [d, 0, 0]);
      }
      L.accent && (B.mat(17, 5), B.box([(xa + xb) / 2, Y(0.36), s * 0.958], [1, 0, 0], [0, 1, 0], [0, 0, 1], [(xb - xa) / 2 - 0.02, 6e-3, 3e-3]));
    }
    /* ---------- running boards, sliders ---------- */
    if (L.sides === "boards") for (let s of [-1, 1]) {
      bx([-0.02, 0.36, s * 0.97], [0.98, 0.025, 0.11], 2, 50), bx([-0.02, 0.39, s * 1.075], [0.98, 0.012, 0.012], 3, 0);
      for (let x of [-0.7, 0.6]) bx([x, 0.37, s * 0.88], [0.04, 0.02, 0.06], 11, 0);
    }
    else if (L.sides === "sliders") for (let s of [-1, 1]) {
      tube([0.95, 0.36, s * 0.99], [-0.98, 0.36, s * 0.99], 0.036, 17, 0, 10);
      for (let x of [-0.75, 0, 0.72]) tube([x, 0.36, s * 0.99], [x, 0.38, s * 0.7], 0.03, 17, 0, 8);
      tube([0.95, 0.36, s * 0.99], [1.02, 0.4, s * 0.82], 0.033, 17, 0, 8), tube([-0.98, 0.36, s * 0.99], [-1.05, 0.4, s * 0.82], 0.033, 17, 0, 8);
    }
    /* ---------- the front end (the old bolt-ons were made for a nose at 2.47) ---------- */
    let fx = SUV.nose - 2.47;
    if (L.front === "winch") {
      bx([2.56 + fx, 0.6, 0], [0.11, 0.13, 0.86], 17, 0), bx([2.6 + fx, 0.48, 0], [0.08, 0.05, 0.62], 17, 0);
      tube([2.62 + fx, 0.74, -0.42], [2.64 + fx, 0.98, -0.3], 0.032, 17, 0), tube([2.62 + fx, 0.74, 0.42], [2.64 + fx, 0.98, 0.3], 0.032, 17, 0), tube([2.64 + fx, 0.98, -0.3], [2.64 + fx, 0.98, 0.3], 0.032, 17, 0);
      B.mat(17, 0), B.tube([2.64 + fx, Y(0.6), -0.2], [2.64 + fx, Y(0.6), 0.2], 0.075, 12, !0), B.mat(3), B.tube([2.7 + fx, Y(0.6), -0.03], [2.76 + fx, Y(0.6), -0.03], 0.018, 6, !0);
      for (let s of [-1, 1]) B.mat(17, 3), B.tube([2.68 + fx, Y(0.5), s * 0.5 - 0.03], [2.68 + fx, Y(0.5), s * 0.5 + 0.03], 0.035, 10, !0);
    } else if (L.front === "prerunner") {
      for (let s of [-1, 1]) {
        tube([2.5 + fx, 0.45, s * 0.85], [2.6 + fx, 0.5, s * 0.6], 0.03, 17, 0), tube([2.6 + fx, 0.5, s * 0.6], [2.6 + fx, 0.5, 0], 0.03, 17, 0, 8, !1);
        tube([2.6 + fx, 0.5, s * 0.45], [2.62 + fx, 0.8, s * 0.42], 0.028, 17, 0), tube([2.62 + fx, 0.8, s * 0.42], [2.5 + fx, 0.98, s * 0.75], 0.028, 17, 0), tube([2.6 + fx, 0.5, s * 0.45], [2.45 + fx, 0.42, s * 0.3], 0.028, 17, 0);
      }
      tube([2.62 + fx, 0.8, -0.42], [2.62 + fx, 0.8, 0.42], 0.028, 17, 0);
    } else if (L.front === "bullbar") {
      for (let s of [-1, 1]) tube([2.52 + fx, 0.48, s * 0.33], [2.58 + fx, 0.98, s * 0.33], 0.034, 17, 2), tube([2.58 + fx, 0.98, s * 0.33], [2.62 + fx, 1.07, 0], 0.034, 17, 2, 8, !1);
      tube([2.55 + fx, 0.62, -0.38], [2.55 + fx, 0.62, 0.38], 0.03, 17, 2);
      bx([2.5 + fx, 0.42, 0], [0.04, 0.03, 0.4], 17, 2);
    } else if (L.front === "lip") {
      /* a splitter under the bumper and little canards at the corners */
      B.mat(18, 1), B.box([2.465, Y(0.402), 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [0.12, 9e-3, 0.76]);
      for (let s of [-1, 1]) B.mat(18, 1), B.box([2.43, Y(0.47), s * 0.89], norm([1, 0.25, 0]), norm([-0.25, 1, 0]), [0, 0, 1], [0.06, 6e-3, 0.05]), B.mat(18, 1), B.box([2.575, Y(0.42), s * 0.75], [1, 0, 0], [0, 1, 0], [0, 0, 1], [0.012, 0.02, 4e-3]);
      L.accent && (B.mat(17, 5), B.box([2.587, Y(0.402), 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [4e-3, 0.01, 0.75]));
    } else if (L.front === "recovery") {
      /* a skid plate and a pair of red recovery shackles */
      B.mat(17, 1), B.box([2.42, Y(0.385), 0], norm([1, 0.3, 0]), norm([-0.3, 1, 0]), [0, 0, 1], [0.17, 0.01, 0.5]);
      for (let k = -2; k <= 2; k++) B.mat(17, 0), B.box([2.46, Y(0.4), k * 0.16], norm([1, 0.3, 0]), norm([-0.3, 1, 0]), [0, 0, 1], [0.06, 0.012, 0.035]);
      for (let s of [-1, 1]) {
        let z = s * 0.46, x0 = SUV.nose - 0.01, x1 = x0 + 0.06, y = 0.48, r = 0.032, seg = 8;
        bx([x0 + 0.005, y, z], [0.04, 0.03, 0.022], 17, 0);
        B.mat(17, 3), B.tube([x0, Y(y - r), z], [x1, Y(y - r), z], 0.012, 8, !1), B.tube([x0, Y(y + r), z], [x1, Y(y + r), z], 0.012, 8, !1);
        for (let k = 0; k < seg; k++) {
          let t0 = -Math.PI / 2 + Math.PI * k / seg, t1 = -Math.PI / 2 + Math.PI * (k + 1) / seg;
          B.tube([x1 + Math.cos(t0) * r, Y(y + Math.sin(t0) * r), z], [x1 + Math.cos(t1) * r, Y(y + Math.sin(t1) * r), z], 0.012, 8, !1);
        }
        B.mat(3), B.tube([x0 + 0.01, Y(y - r - 0.02), z], [x0 + 0.01, Y(y + r + 0.02), z], 9e-3, 8, !0);
      }
    }
    if (L.pods) for (let s of [-1, 1]) {
      let c = [2.6 + fx, 0.82, s * 0.62];
      tube([c[0] - 0.06, c[1] - 0.12, c[2]], [c[0] - 0.02, c[1] - 0.04, c[2]], 0.012, 17, 0, 6), B.mat(17, 0), B.tube([c[0] - 0.05, Y(c[1]), c[2]], [c[0] + 0.03, Y(c[1]), c[2]], 0.075, 14, !1), B.mat(15, 1), B.tube([c[0] + 0.03, Y(c[1]), c[2]], [c[0] + 0.032, Y(c[1]), c[2]], 0.068, 14, !0);
    }
    /* ---------- the back ---------- */
    if (L.rear === "diffuser") {
      B.mat(18, 1), B.box([-2.42, Y(0.435), 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [0.11, 8e-3, 0.5]);
      for (let k = -2; k <= 2; k++) B.mat(18, 1), B.box([-2.47, Y(0.405), k * 0.17], [1, 0, 0], [0, 1, 0], [0, 0, 1], [0.06, 0.03, 5e-3]);
      L.accent && (B.mat(17, 5), B.box([-2.532, Y(0.435), 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [3e-3, 0.01, 0.49]));
    }
    if (L.rear === "tube") {
      for (let s of [-1, 1]) tube([-2.42, 0.5, s * 0.8], [-2.6, 0.52, s * 0.68], 0.032, 17, 0), tube([-2.6, 0.52, s * 0.68], [-2.6, 0.52, 0], 0.032, 17, 0, 8, !1);
      tube([-2.6, 0.52, 0.66], [-2.67, 1.1, 0.5], 0.03, 17, 0), tube([-2.67, 1.1, 0.5], [-2.67, 1.1, 0.05], 0.03, 17, 0);
      /* the spare on the swing-out */
      let tr = L.tireR * 0.92, sc = [-2.77, 1.05, 0.3];
      B.mat(4, 1), B.tube([sc[0] - L.tireW * 0.4, Y(sc[1]), sc[2]], [sc[0] + L.tireW * 0.4, Y(sc[1]), sc[2]], tr, 24, !1);
      B.mat(5, 4), B.tube([sc[0] - L.tireW * 0.42, Y(sc[1]), sc[2]], [sc[0] - L.tireW * 0.42 + 0.01, Y(sc[1]), sc[2]], tr * 0.62, 18, !0);
    }
    if (L.chute) {
      bx([-2.52, 0.62, 0], [0.06, 0.08, 0.2], 17, 0), B.mat(2, 30), B.tube([-2.65, Y(0.72), 0], [-2.65, Y(0.98), 0], 0.11, 12, !0), B.mat(17, 3), B.box([-2.65, Y(0.86), 0.11], [1, 0, 0], [0, 1, 0], [0, 0, 1], [0.02, 0.1, 0.01]);
    }
    if (L.wheelie) {
      for (let s of [-1, 1]) {
        tube([-2.3, 0.4, s * 0.4], [-3.35, 0.24, s * 0.3], 0.028, 17, 0), tube([-2.3, 0.62, s * 0.4], [-3.35, 0.24, s * 0.3], 0.024, 17, 0);
        B.mat(4, 5), B.tube([-3.38, Y(0.08), s * 0.3 - 0.03], [-3.38, Y(0.08), s * 0.3 + 0.03], 0.08, 14, !0);
      }
      tube([-3.35, 0.24, -0.3], [-3.35, 0.24, 0.3], 0.024, 17, 0);
    }
    /* ---------- exhausts ---------- */
    let tip = (a, b, r) => {
      B.mat(10), B.tube([a[0], Y(a[1]), a[2]], [b[0], Y(b[1]), b[2]], r, 12, !1), B.mat(11), B.tube([b[0] + (a[0] - b[0]) * 0.15, Y(b[1]), b[2]], [b[0], Y(b[1]), b[2]], r * 0.86, 12, !0);
    };
    if (L.exhaust === "stock") tip([-2.2, 0.38, 0.6], [-2.47, 0.38, 0.62], 0.032);
    else if (L.exhaust === "dual") for (let s of [-1, 1]) for (let dz of [-0.05, 0.05]) tip([-2.2, 0.39, s * 0.62 + dz], [-2.53, 0.39, s * 0.62 + dz], 0.042);
    else if (L.exhaust === "side") for (let s of [-1, 1]) tip([-0.95, 0.38, s * 0.8], [-0.95, 0.36, s * 1.0], 0.05);
    if (L.stacks) for (let s of [-1, 1]) {
      let x = -0.98, z = s * 0.98;
      tube([x, 0.5, z], [x, 2.25, z], 0.065, 10, 1, 12, !1), B.mat(10), B.tube([x, Y(2.25), z], [x - 0.08, Y(2.42), z], 0.068, 12, !1);
      for (let y of [0.9, 1.6]) tube([x, y, z], [x, y, z * 0.92], 0.012, 17, 0, 6);
    }
    /* ---------- the hood ---------- */
    let hoodY = (x) => crA(st.map((q) => q[4] + q[5]), bodyAt(x)) + hoodDome(x) + 0.024;
    if (L.hood === "cowl" || L.hood === "scoop") {
      let x0 = 1.0, x1 = 2.05, n = 10;
      B.mat(0);
      let rr = [];
      for (let i = 0; i <= n; i++) {
        let x = x0 + (x1 - x0) * i / n, h = 0.07 * Math.sin(Math.min(1, (x1 - x) / 0.25) * Math.PI / 2) * Math.min(1, (x - x0) / 0.08 + 0.2), y = hoodY(x), w = 0.36, row = [];
        for (let k = -3; k <= 3; k++) {
          let z = k / 3 * w, yy = y + h * Math.cos(k / 3 * Math.PI / 2) ** 0.6;
          row.push(B.v([x, Y(yy), z], [0, 1, 0], x, z));
        }
        rr.push(row);
      }
      for (let i = 0; i < n; i++) for (let k = 0; k < 6; k++) B.quad(rr[i][k], rr[i][k + 1], rr[i + 1][k + 1], rr[i + 1][k]);
      if (L.hood === "scoop") {
        let x = 1.55, y = hoodY(x) + 0.07;
        B.mat(0), B.box([x, Y(y + 0.06), 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [0.28, 0.06, 0.24]), B.mat(11), B.box([x + 0.285, Y(y + 0.06), 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [0.006, 0.045, 0.2]);
      }
    } else if (L.hood === "blower") {
      let x = 1.55, y = hoodY(x);
      B.mat(3), B.box([x, Y(y + 0.1), 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [0.3, 0.1, 0.2]);
      for (let k = -4; k <= 4; k++) B.mat(3), B.box([x, Y(y + 0.1), k * 0.045], [1, 0, 0], [0, 1, 0], [0, 0, 1], [0.31, 0.104, 0.006]);
      B.mat(11), B.box([x - 0.05, Y(y + 0.22), 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [0.12, 0.03, 0.14]);
      B.mat(0), B.box([x + 0.02, Y(y + 0.33), 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [0.24, 0.09, 0.2]), B.mat(11), B.box([x + 0.265, Y(y + 0.33), 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [0.006, 0.07, 0.17]);
      for (let k = -1; k <= 1; k++) B.mat(3), B.box([x + 0.27, Y(y + 0.33), k * 0.11], [1, 0, 0], [0, 1, 0], [0, 0, 1], [0.008, 0.06, 0.004]);
    }
    if (L.hood === "stacks") for (let s of [-1, 1]) {
      let x = 1.35, z = s * 0.3, y = hoodY(x);
      B.mat(10), B.tube([x, Y(y - 0.05), z], [x, Y(y + 0.55), z], 0.06, 12, !1), B.tube([x, Y(y + 0.55), z], [x - 0.09, Y(y + 0.68), z], 0.064, 12, !1);
    }
    /* ---------- roof ---------- */
    let roofY = (x) => crA(gh.map((g) => g[1]), (() => {
      let lo = 0;
      for (let i = 0; i < ng - 1; i++) gh[i][0] <= x && (lo = i);
      return lo + Math.max(0, Math.min(1, (x - gh[lo][0]) / Math.max(1e-6, gh[lo + 1][0] - gh[lo][0])));
    })());
    if (L.roof === "rails" || L.roof === "basket" || L.roof === "basketSpare" || L.roof === "expedition") for (let s of [-1, 1]) {
      let z = s * 0.66, x0 = -1.95, x1 = -0.2, n = 8;
      for (let i = 0; i < n; i++) {
        let xa = x0 + (x1 - x0) * i / n, xb = x0 + (x1 - x0) * (i + 1) / n;
        tube([xa, roofY(xa) + 0.06, z], [xb, roofY(xb) + 0.06, z], 0.017, 16, 0, 8, !1);
      }
      for (let x of [x0, x1]) tube([x, roofY(x) + 0.065, z], [x, roofY(x) - 0.01, z], 0.022, 16, 0, 8);
    }
    if (L.roof === "rails") for (let x of [-1.55, -0.6]) bx([x, roofY(x) + 0.085, 0], [0.018, 0.012, 0.66], 16, 0);
    if (L.roof === "basket" || L.roof === "basketSpare") {
      let x0 = -1.85, x1 = -0.25, y = 1.92, w = 0.6;
      for (let s of [-1, 1]) tube([x0, y + 0.1, s * w], [x1, y + 0.1, s * w], 0.016, 17, 0, 6), tube([x0, y, s * w], [x1, y, s * w], 0.016, 17, 0, 6);
      for (let x = x0; x <= x1 + 1e-3; x += (x1 - x0) / 6) tube([x, y, -w], [x, y, w], 0.012, 17, 0, 6), tube([x, y, -w], [x, y + 0.1, -w], 0.01, 17, 0, 5), tube([x, y, w], [x, y + 0.1, w], 0.01, 17, 0, 5);
      tube([x1, y + 0.1, -w], [x1 + 0.12, y + 0.02, -w * 0.6], 0.016, 17, 0, 6), tube([x1, y + 0.1, w], [x1 + 0.12, y + 0.02, w * 0.6], 0.016, 17, 0, 6), tube([x1 + 0.12, y + 0.02, -w * 0.6], [x1 + 0.12, y + 0.02, w * 0.6], 0.016, 17, 0, 6);
      if (L.roof === "basketSpare") {
        let tr = Math.min(0.42, L.tireR), c = [-1.25, y + 0.03 + L.tireW * 0.45, 0];
        B.mat(4, 1), B.tube([c[0], Y(c[1] - L.tireW * 0.45), c[2]], [c[0], Y(c[1] + L.tireW * 0.45), c[2]], tr, 24, !1), B.mat(5, 4), B.tube([c[0], Y(c[1] + L.tireW * 0.46), c[2]], [c[0], Y(c[1] + L.tireW * 0.46 + 0.01), c[2]], tr * 0.6, 18, !0);
        for (let s of [-1, 1]) bx([-0.55, y + 0.15, s * 0.32], [0.12, 0.15, 0.08], 17, 1);
      }
    }
    if (L.roof === "expedition") {
      /* a low flat platform on the rails: square-tube frame, slats, a wind deflector, two hard cases,
         an olive duffel strapped down, square LED pods across the front and a whip antenna */
      let x0 = -2.0, x1 = -0.12, w = 0.68, y = roofY(-1.0) + 0.1, fr = 0.018;
      for (let x of [x0 + 0.08, -1.05, x1 - 0.08]) for (let s of [-1, 1]) bx([x, (y + roofY(x) + 0.06) / 2, s * 0.66], [0.035, Math.max(0.01, (y - roofY(x) - 0.06) / 2), 0.016], 17, 0);
      for (let s of [-1, 1]) bx([(x0 + x1) / 2, y, s * w], [(x1 - x0) / 2, fr, fr], 17, 0);
      for (let x of [x0, x1]) bx([x, y, 0], [fr, fr, w], 17, 0);
      for (let k = 1; k < 10; k++) bx([x0 + (x1 - x0) * k / 10, y + 4e-3, 0], [0.02, 8e-3, w - 0.01], 17, 0);
      B.mat(17, 0), B.box([x1 + 0.035, Y(y + 0.03), 0], norm([0.5, 1, 0]), norm([-1, 0.5, 0]), [0, 0, 1], [0.05, 4e-3, w]);
      for (let s of [-1, 1]) {
        let c = [-1.6, y + 0.125, s * 0.31];
        B.mat(17, 1), rbox3(B, [c[0], Y(c[1]), c[2]], [1, 0, 0], [0, 1, 0], [0, 0, 1], [0.27, 0.105, 0.27], 0.18), bx([c[0], c[1] + 0.01, c[2]], [0.274, 6e-3, 0.274], 17, 0);
        for (let dx of [-0.13, 0.13]) bx([c[0] + dx, c[1] + 0.05, c[2] + s * 0.272], [0.025, 0.02, 4e-3], 16, 1);
        bx([c[0], c[1] - 0.04, c[2] + s * 0.272], [0.2, 5e-3, 3e-3], 17, 0);
      }
      B.mat(17, 4), B.tube([-1.02, Y(y + 0.115), -0.44], [-1.02, Y(y + 0.115), 0.44], 0.105, 14, !0);
      B.mat(17, 4), B.tube([-0.66, Y(y + 0.08), -0.3], [-0.66, Y(y + 0.08), 0.3], 0.07, 12, !0);
      for (let z of [-0.26, 0.26]) B.mat(17, 0), B.tube([-1.02, Y(y + 0.115), z - 0.014], [-1.02, Y(y + 0.115), z + 0.014], 0.108, 14, !1);
      for (let z of [-0.15, 0.15]) B.mat(17, 0), B.tube([-0.66, Y(y + 0.08), z - 0.012], [-0.66, Y(y + 0.08), z + 0.012], 0.073, 12, !1);
      for (let z of [-0.5, -0.17, 0.17, 0.5]) {
        bx([x1 + 0.005, y + 0.035, z], [0.012, 0.03, 0.012], 17, 0), B.mat(17, 0), rbox3(B, [x1 + 0.03, Y(y + 0.085), z], [1, 0, 0], [0, 1, 0], [0, 0, 1], [0.036, 0.052, 0.054], 0.22, 12, 8);
        B.mat(15, 1), B.box([x1 + 0.066, Y(y + 0.085), z], [1, 0, 0], [0, 1, 0], [0, 0, 1], [2e-3, 0.042, 0.044]);
      }
      tube([x0 + 0.05, y, -0.62], [x0 - 0.05, y + 0.78, -0.62], 5e-3, 17, 0, 5), B.mat(17, 0), B.sphere([x0 - 0.05, Y(y + 0.79), -0.62], 0.012, 6, 4);
    }
    if (L.lightbar && L.roof !== "expedition") {
      let x = -0.15, y = roofY(-0.15) + (L.roof === "basket" || L.roof === "basketSpare" ? 0.15 : 0.1);
      bx([x, y, 0], [0.045, 0.045, 0.66], 17, 0), B.mat(15, 1), B.box([x + 0.046, Y(y), 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [0.002, 0.034, 0.63]);
      for (let s of [-1, 1]) tube([x, y - 0.04, s * 0.6], [x - 0.02, roofY(x) + 0.01, s * 0.66], 0.012, 17, 0, 6);
    }
    if (L.ditch) for (let s of [-1, 1]) {
      let c = [0.66, 1.2, s * 0.86];
      tube([c[0], c[1] - 0.05, c[2]], [c[0] + 0.04, c[1], c[2]], 0.01, 17, 0, 6), B.mat(17, 0), B.tube([c[0] + 0.02, Y(c[1] + 0.03), c[2]], [c[0] + 0.1, Y(c[1] + 0.03), c[2]], 0.05, 12, !1), B.mat(15, 1), B.tube([c[0] + 0.1, Y(c[1] + 0.03), c[2]], [c[0] + 0.102, Y(c[1] + 0.03), c[2]], 0.045, 12, !0);
    }
    if (L.snorkel) {
      let z = 0.9;
      tube([1.6, 0.92, z], [1.05, 1.06, z + 0.04], 0.045, 2, 20, 10), tube([1.05, 1.06, z + 0.04], [0.82, 1.15, z + 0.03], 0.045, 2, 20, 10), tube([0.82, 1.15, z + 0.03], [0.1, 1.82, z - 0.08], 0.045, 2, 20, 10), B.mat(2, 20), B.box([0.06, Y(1.86), z - 0.08], [1, 0, 0], [0, 1, 0], [0, 0, 1], [0.12, 0.06, 0.06]);
    }
    /* ---------- spoilers: the factory lip over the liftgate glass, or a big wing on stands ---------- */
    if (L.spoiler === 1) {
      let x = -2.15, y = roofY(-2.08);
      B.mat(0), B.box([x, Y(y - 4e-3), 0], norm([1, 0.18, 0]), norm([-0.18, 1, 0]), [0, 0, 1], [0.1, 0.016, 0.68]);
      B.mat(2, 40), B.box([x - 0.098, Y(y - 0.02), 0], norm([1, 0.18, 0]), norm([-0.18, 1, 0]), [0, 0, 1], [4e-3, 6e-3, 0.66]);
    } else if (L.spoiler === 2) {
      /* a deep roof spoiler: it carries the roofline back past the glass, tips down, with fins down each side */
      let x0 = -1.98, x1 = -2.36, n = 6, y0 = roofY(-1.98) + 6e-3, rows = [];
      for (let i = 0; i <= n; i++) {
        let t = i / n, x = x0 + (x1 - x0) * t, y = y0 + 0.012 * Math.sin(t * Math.PI) - 0.07 * t * t, w = 0.72 - 0.03 * t, th = 0.025 * (1 - t) + 8e-3;
        rows.push([x, y, w, th]);
      }
      B.mat(0);
      let top = rows.map(([x, y, w]) => [B.v([x, Y(y), -w], [0.15, 1, 0]), B.v([x, Y(y), w], [0.15, 1, 0])]), bot = rows.map(([x, y, w, th]) => [B.v([x, Y(y - th), -w], [0, -1, 0]), B.v([x, Y(y - th), w], [0, -1, 0])]);
      for (let i = 0; i < n; i++) face4(B, top[i][0], top[i + 1][0], top[i + 1][1], top[i][1]), face4(B, bot[i][0], bot[i][1], bot[i + 1][1], bot[i + 1][0]);
      for (let s of [-1, 1]) {
        let k = s > 0 ? 1 : 0, side = rows.map(([x, y, w, th]) => [B.v([x, Y(y), s * w], [0, 0, s]), B.v([x, Y(y - th), s * w], [0, 0, s])]);
        for (let i = 0; i < n; i++) face4(B, side[i][0], side[i + 1][0], side[i + 1][1], side[i][1]);
        /* the fin that runs down beside the rear glass */
        B.mat(0), B.box([-2.2, Y(y0 - 0.08), s * 0.725], norm([1, -0.9, 0]), norm([0.9, 1, 0]), [0, 0, 1], [0.13, 0.03, 0.012]);
      }
      let e = rows[n];
      B.mat(17, 0), B.box([e[0] - 4e-3, Y(e[1] - e[3] / 2), 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [5e-3, e[3] / 2 + 6e-3, e[2]]);
      L.accent && (B.mat(17, 5), B.box([e[0] - 0.01, Y(e[1] - e[3] / 2), 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [2e-3, 4e-3, e[2] - 0.01]));
    }
    return { body: B, glass: GH, look: L, hcg };
  }
  /* wheels: a rim style, a tyre with its own tread, as one mesh centred on the hub; +z is the outside */
  function buildSuvWheel(L) {
    let W2 = new MeshBuilder(16384), n = 48, R2 = L.tireR, rimR = L.rim * 0.0254 / 2 + 0.012, tw = L.tireW, tread = L.tread, side = tread === "swamper" || tread === "mud" ? 0.03 : 0.02, prof = [[rimR + 5e-3, -tw * 0.46], [rimR + 0.03, -tw * 0.53], [R2 - side * 2.2, -tw * 0.53], [R2 - side * 0.6, -tw * 0.49], [R2, -tw * 0.4], [R2 + 2e-3, 0], [R2, tw * 0.4], [R2 - side * 0.6, tw * 0.49], [R2 - side * 2.2, tw * 0.53], [rimR + 0.03, tw * 0.53], [rimR + 5e-3, tw * 0.46]], sp = smooth2(prof, 3), lugH = tread === "swamper" ? 0.032 : tread === "mud" ? 0.022 : tread === "at" ? 0.011 : 0;
    W2.mat(4, { street: 0, at: 1, mud: 2, swamper: 3, paddle: 4, slick: 5 }[tread] || 0), lathe(W2, sp.map(([r, z]) => [r - (lugH ? lugH * 0.6 : 0) * (Math.abs(z) < tw * 0.42 ? 1 : 0), z]), n, (k, j) => [k / n, j / (sp.length - 1)]);
    /* lugs, blocks and paddles stand off the carcass */
    let block = (a, r0, h, z0, z1, wd, skew = 0) => {
      let t = [Math.cos(a), Math.sin(a), 0], sd = [-Math.sin(a), Math.cos(a), 0], P = (r, o, z) => [t[0] * r + sd[0] * o, t[1] * r + sd[1] * o, z];
      W2.box([t[0] * (r0 + h / 2) + sd[0] * skew, t[1] * (r0 + h / 2) + sd[1] * skew, (z0 + z1) / 2], t, sd, [0, 0, 1], [h / 2, wd / 2, Math.abs(z1 - z0) / 2]);
    };
    if (tread === "at" || tread === "mud" || tread === "swamper") {
      let count = tread === "swamper" ? 22 : tread === "mud" ? 28 : 38, r0 = R2 - lugH * 0.7;
      for (let k = 0; k < count; k++) {
        let a = k / count * Math.PI * 2, stag = k & 1 ? 1 : -1;
        if (tread === "at") block(a, r0, lugH, -tw * 0.44, -tw * 0.05, 0.05), block(a + Math.PI / count, r0, lugH, tw * 0.05, tw * 0.44, 0.05);
        else {
          let wd = tread === "swamper" ? 0.075 : 0.065;
          block(a, r0, lugH, stag * tw * 0.53, stag * tw * 0.02, wd), block(a + Math.PI / count, r0, lugH * 0.8, -stag * tw * 0.3, -stag * tw * 0.05, wd * 0.8);
          block(a, r0 - lugH * 0.6, lugH, stag * tw * 0.5, stag * tw * 0.58, wd * 0.9);
        }
      }
    } else if (tread === "paddle") for (let k = 0; k < 14; k++) {
      let a = k / 14 * Math.PI * 2;
      block(a, R2 - 0.01, 0.045, -tw * 0.5, tw * 0.5, 0.022);
    }
    /* the rim: per style its colour (rim material kind), spoke count, spoke widths at hub and rim, and how deep the face sits */
    let st = L.wheel, RS = { stock: [0, 6, 0.046, 0.04, 0.3], steelie: [4, 0], chrome: [2, 10, 0.03, 0.012, 0.08], beadlock: [4, 6, 0.03, 0.026, 0.36], weld: [2, 5, 0.012, 9e-3, 0.36], gold: [6, 8, 0.03, 0.026, 0.36], street10: [8, 10, 0.017, 0.013, 0.12], bronze8: [7, 0] }[st] || [0, 6, 0.046, 0.04, 0.3], rimCol = RS[0], spokes = RS[1], zf = tw * 0.4, zh = spokes ? tw * RS[4] : zf;
    W2.mat(5, 1), lathe(W2, [[rimR - 4e-3, tw * 0.47], [rimR - 0.014, tw * 0.42], [rimR - 0.014, -tw * 0.42], [rimR - 4e-3, -tw * 0.47]], n, (k, j) => [k / n, j]);
    W2.mat(5, rimCol === 4 ? 4 : rimCol === 7 || rimCol === 8 ? rimCol : 2), lathe(W2, [[rimR + 6e-3, tw * 0.47], [rimR - 0.02, tw * 0.47], [rimR - 0.024, zh < tw * 0.2 ? tw * 0.1 : tw * 0.43]], n, (k, j) => [k / n, j]);
    if (st === "beadlock") {
      W2.mat(5, 2), lathe(W2, [[rimR + 0.03, tw * 0.5], [rimR - 0.02, tw * 0.5], [rimR - 0.02, tw * 0.47], [rimR + 0.03, tw * 0.47]], n, (k, j) => [k / n, j]);
      W2.mat(3);
      for (let k = 0; k < 24; k++) {
        let a = k / 24 * Math.PI * 2;
        W2.tube([Math.cos(a) * (rimR + 5e-3), Math.sin(a) * (rimR + 5e-3), tw * 0.5], [Math.cos(a) * (rimR + 5e-3), Math.sin(a) * (rimR + 5e-3), tw * 0.515], 7e-3, 5, !0);
      }
    }
    if (st === "street10") W2.mat(17, 5), lathe(W2, [[rimR + 2e-3, tw * 0.472], [rimR - 6e-3, tw * 0.472]], n, (k, j) => [k / n, j]);
    W2.mat(5, rimCol);
    if (spokes) for (let s = 0; s < spokes; s++) {
      let a = s / spokes * Math.PI * 2 + (st === "street10" ? (s & 1 ? -0.07 : 0.07) : 0), t = [Math.cos(a), Math.sin(a), 0], sd = [-Math.sin(a), Math.cos(a), 0], P = (r, o, z) => [t[0] * r + sd[0] * o, t[1] * r + sd[1] * o, z], r0 = 0.075, r1 = rimR - 0.022, w0 = RS[2], w1 = RS[3], zz0 = zh, zz1 = st === "chrome" ? tw * 0.1 : zf, dep = st === "stock" ? 0.05 : 0.035;
      W2.quadP(P(r0, -w0, zz0), P(r1, -w1, zz1), P(r1, w1, zz1), P(r0, w0, zz0)), W2.quadP(P(r0, w0, zz0), P(r1, w1, zz1), P(r1, w1, zz1 - dep), P(r0, w0, zz0 - dep)), W2.quadP(P(r1, -w1, zz1), P(r0, -w0, zz0), P(r0, -w0, zz0 - dep), P(r1, -w1, zz1 - dep));
      /* a raised ridge down the middle of the broad factory spokes */
      st === "stock" && (W2.mat(5, 2), W2.quadP(P(r0 + 0.01, -6e-3, zz0 + 5e-3), P(r1 - 0.01, -5e-3, zz1 + 4e-3), P(r1 - 0.01, 5e-3, zz1 + 4e-3), P(r0 + 0.01, 6e-3, zz0 + 5e-3)), W2.mat(5, rimCol));
    }
    else if (st === "bronze8") {
      /* a flat-faced disc; the eight round windows are cut out in the shader */
      lathe(W2, [[rimR - 0.018, zf - 4e-3], [rimR - 0.035, zf - 0.016], [0.1, zf - 0.016], [0.085, zf - 6e-3]], n * 2, (k, j) => [k / (n * 2), j * 0.3]);
    }
    else {
      /* a steel wheel: a dished disc with round holes painted in the shader */
      lathe(W2, [[rimR - 0.02, zf - 0.01], [rimR - 0.05, zf - 0.04], [0.11, zf - 0.02], [0.08, zf]], n, (k, j) => [k / n, j * 0.3]);
    }
    {
      let hub = [];
      for (let k = 0; k <= n; k++) {
        let a = k / n * Math.PI * 2;
        hub.push([Math.cos(a), Math.sin(a)]);
      }
      let hz = spokes ? zh : zf;
      W2.mat(5, rimCol);
      for (let k = 0; k < n; k++) {
        let [c0, s0] = hub[k], [c1, s1] = hub[k + 1];
        W2.tri(W2.v([c0 * 0.08, s0 * 0.08, hz], [0, 0, 1]), W2.v([c1 * 0.08, s1 * 0.08, hz], [0, 0, 1]), W2.v([0, 0, hz + 0.01], [0, 0, 1]));
        W2.quad(W2.v([c0 * 0.08, s0 * 0.08, hz], [c0, s0, 0]), W2.v([c0 * 0.08, s0 * 0.08, hz - 0.05], [c0, s0, 0]), W2.v([c1 * 0.08, s1 * 0.08, hz - 0.05], [c1, s1, 0]), W2.v([c1 * 0.08, s1 * 0.08, hz], [c1, s1, 0]));
      }
      W2.mat(3);
      for (let k = 0; k < 6; k++) {
        let a = k / 6 * Math.PI * 2 + 0.3;
        W2.tube([Math.cos(a) * 0.056, Math.sin(a) * 0.056, hz - 4e-3], [Math.cos(a) * 0.056, Math.sin(a) * 0.056, hz + 0.016], 0.01, 6, !0);
      }
      W2.mat(5, 3), W2.tube([0, 0, hz + 2e-3], [0, 0, hz + 0.012], 0.032, 16, !0);
    }
    /* the brake disc behind the spokes */
    W2.mat(6);
    let zd = -0.03, ri = 0.1, ro = Math.min(0.205, rimR - 0.05);
    for (let k = 0; k < n; k++) {
      let a0 = k / n * Math.PI * 2, a1 = (k + 1) / n * Math.PI * 2;
      for (let [z, nz] of [[zd + 0.014, 1], [zd - 0.014, -1]]) {
        let a = W2.v([Math.cos(a0) * ri, Math.sin(a0) * ri, z], [0, 0, nz], a0, ri), b = W2.v([Math.cos(a1) * ri, Math.sin(a1) * ri, z], [0, 0, nz], a1, ri), c = W2.v([Math.cos(a1) * ro, Math.sin(a1) * ro, z], [0, 0, nz], a1, ro), d = W2.v([Math.cos(a0) * ro, Math.sin(a0) * ro, z], [0, 0, nz], a0, ro);
        nz > 0 ? W2.quad(a, d, c, b) : W2.quad(a, b, c, d);
      }
    }
    return W2;
  }
  /* a brake caliper that sits behind the spokes: steers with the wheel, doesn't spin with it */
  function buildSuvCaliper(L) {
    let C = new MeshBuilder(1024), rimR = L.rim * 0.0254 / 2 + 0.012, ro = Math.min(0.205, rimR - 0.05), a0 = 2.2, a1 = 3.05, n = 8, r = ro - 0.012;
    C.mat(17, 6);
    for (let k = 0; k < n; k++) {
      let t0 = a0 + (a1 - a0) * k / n, t1 = a0 + (a1 - a0) * (k + 1) / n, tm = (t0 + t1) / 2, rad = [Math.cos(tm), Math.sin(tm), 0], tan = [-Math.sin(tm), Math.cos(tm), 0];
      C.box([rad[0] * r, rad[1] * r, -0.03], rad, tan, [0, 0, 1], [0.034, (t1 - t0) * r * 0.55, 0.036]);
    }
    return C;
  }

