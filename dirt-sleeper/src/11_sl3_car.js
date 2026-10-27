  // src/render/carmodel.js
  function cr(a, t) {
    let n = a.length, i = Math.max(0, Math.min(n - 2, Math.floor(t))), f2 = t - i, p0 = a[Math.max(0, i - 1)], p1 = a[i], p2 = a[i + 1], p3 = a[Math.min(n - 1, i + 2)];
    return 0.5 * (2 * p1 + (-p0 + p2) * f2 + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f2 * f2 + (-p0 + 3 * p1 - 3 * p2 + p3) * f2 * f2 * f2);
  }
  function smooth2(P, sub3) {
    let out = [];
    for (let i = 0; i < P.length - 1; i++) for (let k = 0; k < sub3; k++) {
      let t = i + k / sub3;
      out.push([cr(P.map((p) => p[0]), t), cr(P.map((p) => p[1]), t)]);
    }
    return out.push(P[P.length - 1].slice()), out;
  }
  var SL3_BODY = {
    st: [
      [-2.3, 0.3, 0.74, 0.55, 0.8, 0.02],
      [-2.27, 0.25, 0.84, 0.55, 0.89, 0.03],
      [-2.2, 0.22, 0.9, 0.56, 0.94, 0.04],
      [-2.05, 0.19, 0.935, 0.58, 0.952, 0.04],
      [-1.8, 0.17, 0.957, 0.6, 0.948, 0.04],
      [-1.45, 0.16, 0.966, 0.6, 0.942, 0.04],
      [-1.15, 0.155, 0.958, 0.6, 0.932, 0],
      [-0.8, 0.15, 0.935, 0.6, 0.918, 0],
      [-0.4, 0.145, 0.92, 0.6, 0.905, 0],
      [0, 0.145, 0.917, 0.6, 0.895, 0],
      [0.4, 0.15, 0.92, 0.6, 0.885, 0.02],
      [0.7, 0.152, 0.925, 0.6, 0.87, 0.035],
      [1, 0.155, 0.932, 0.6, 0.84, 0.05],
      [1.32, 0.16, 0.935, 0.6, 0.8, 0.06],
      [1.65, 0.165, 0.93, 0.58, 0.76, 0.06],
      [1.95, 0.17, 0.912, 0.55, 0.72, 0.05],
      [2.1, 0.18, 0.875, 0.52, 0.69, 0.04],
      [2.19, 0.2, 0.81, 0.48, 0.665, 0.03],
      [2.25, 0.23, 0.7, 0.45, 0.64, 0.02]
    ],
    /* greenhouse: x, roof height, roof half width */
    gh: [[0.66, 0.88, 0.8], [0.45, 0.965, 0.74], [0.18, 1.1, 0.67], [-0.08, 1.215, 0.625], [-0.32, 1.272, 0.603], [-0.7, 1.282, 0.6], [-1, 1.252, 0.603], [-1.3, 1.172, 0.62], [-1.6, 1.062, 0.66], [-1.85, 0.982, 0.72], [-1.97, 0.952, 0.76]],
    axle: 1.32,
    R: 0.335,
    archR: 0.405,
    mirror: [0.3, 0.985, 0.925]
  };
  function buildCar(ch, design = SL3_BODY) {
    let D = design, hcg = ch.hcg, Y = (y) => y - hcg, st = D.st, ns = st.length, B = new MeshBuilder(8192), GH = new MeshBuilder(4096), sx = [], SUBX = 4;
    for (let i = 0; i < ns - 1; i++) for (let k = 0; k < SUBX; k++) sx.push(i + k / SUBX);
    sx.push(ns - 1);
    let prm = (t, j) => cr(st.map((s) => s[j]), t), profile = (t) => {
      let yb = prm(t, 1), w = prm(t, 2), ym = prm(t, 3), yt = prm(t, 4), c = prm(t, 5), P = [[0, yb], [w * 0.8, yb], [w * 0.95, yb + 0.05], [w * 0.995, yb + (ym - yb) * 0.55], [w, ym], [w * 0.985, ym + (yt - ym) * 0.55], [w * 0.93, yt - 0.015], [w * 0.8, yt + c * 0.4], [w * 0.45, yt + c * 0.9], [0, yt + c]];
      return smooth2(P, 3);
    };
    B.mat(0);
    let rows = [];
    for (let t of sx) {
      let x = prm(t, 0), half = profile(t).map(([z, y]) => [x, Y(y), z]), full = [...half.slice(1).reverse().map((p) => [p[0], p[1], -p[2]]), ...half];
      rows.push(full);
    }
    let nr = rows.length, np = rows[0].length, idx = [];
    for (let i = 0; i < nr; i++) {
      let r = [];
      for (let j = 0; j < np; j++) {
        let a = rows[Math.min(nr - 1, i + 1)][j], b = rows[Math.max(0, i - 1)][j], c = rows[i][Math.min(np - 1, j + 1)], d = rows[i][Math.max(0, j - 1)], n = cross(sub(a, b), sub(c, d));
        (j === 0 || j === np - 1) && (n = [n[0], n[1], 0]);
        let p = rows[i][j];
        r.push(B.v(p, n, j / (np - 1), p[0]));
      }
      idx.push(r);
    }
    for (let i = 0; i < nr - 1; i++) for (let j = 0; j < np - 1; j++) B.quad(idx[i][j], idx[i + 1][j], idx[i + 1][j + 1], idx[i][j + 1]);
    for (let [i, dir] of [[0, -1], [nr - 1, 1]]) {
      let r = rows[i], c = [r[0][0] + dir * 4e-3, (r[0][1] + r[np - 1 >> 1][1]) / 2, 0], ci = B.v(c, [dir, 0, 0], 0.5, c[0]), ring = r.map((p) => B.v(p, [dir, 0, 0], 0.5, p[0]));
      for (let j = 0; j < np - 1; j++)
        dir > 0 ? B.tri(ci, ring[j + 1], ring[j]) : B.tri(ci, ring[j], ring[j + 1]);
    }
    let gh = D.gh, ng = gh.length, gsx = [];
    for (let i = 0; i < ng - 1; i++) for (let k = 0; k < 4; k++) gsx.push(i + k / 4);
    gsx.push(ng - 1);
    let bodyAt = (x) => {
      let lo = 0;
      for (let i = 0; i < ns - 1; i++) st[i][0] <= x && (lo = i);
      let f2 = (x - st[lo][0]) / Math.max(1e-6, st[lo + 1][0] - st[lo][0]);
      return lo + Math.max(0, Math.min(1, f2));
    }, grows = [], gU = [];
    for (let t of gsx) {
      let x = cr(gh.map((g) => g[0]), t), yr = cr(gh.map((g) => g[1]), t), wr = cr(gh.map((g) => g[2]), t), bt = bodyAt(x), yb = prm(bt, 4), wb = prm(bt, 2) * 0.905, P = [[wb, yb - 4e-3], [(wb + wr) * 0.5 + 0.012 + 0 * (yr - yb), yb + (yr - yb) * 0.48], [wr + 0.012, yr - 0.06], [wr * 0.86, yr - 0.012], [wr * 0.45, yr], [0, yr + 4e-3]], sm = smooth2(P, 4), u = sm.map((_, k) => k / (sm.length - 1)), half = sm.map(([z, y]) => [x, Y(y), z]);
      grows.push([...half.map((p) => [p[0], p[1], -p[2]]), ...half.slice(0, -1).reverse()]), gU.push([...u, ...u.slice(0, -1).reverse()]);
    }
    let gr = grows.length, gp = grows[0].length, gidx = [];
    for (let i = 0; i < gr; i++) {
      let r = [];
      for (let j = 0; j < gp; j++) {
        let a = grows[Math.min(gr - 1, i + 1)][j], b = grows[Math.max(0, i - 1)][j], c = grows[i][Math.min(gp - 1, j + 1)], d = grows[i][Math.max(0, j - 1)], p = grows[i][j];
        GH.mat(1), r.push(GH.v(p, cross(sub(a, b), sub(c, d)), gU[i][j], p[0]));
      }
      gidx.push(r);
    }
    for (let i = 0; i < gr - 1; i++) for (let j = 0; j < gp - 1; j++) GH.quad(gidx[i][j], gidx[i + 1][j], gidx[i + 1][j + 1], gidx[i][j + 1]);
    {
      let li = [];
      for (let i = 0; i < gr; i++) {
        let r = [];
        for (let j = 0; j < gp; j++) {
          let p = grows[i][j], q = [p[0], p[1] - 0.025, p[2] * 0.975];
          B.mat(14, 40), r.push(B.v(q, [0, -1, -p[2]], gU[i][j], p[0]));
        }
        li.push(r);
      }
      for (let i = 0; i < gr - 1; i++) for (let j = 0; j < gp - 1; j++) B.quad(li[i][j], li[i][j + 1], li[i + 1][j + 1], li[i + 1][j]);
    }
    B.mat(8, 60), ((x0, x1, y0, y1, z0, z1) => {
      let P = (x, y, z) => [x, Y(y), z];
      B.quadP(P(x0, y0, z0), P(x0, y0, z1), P(x1, y0, z1), P(x1, y0, z0), void 0, [0, 1, 0]), B.quadP(P(x1, y0, z0), P(x1, y0, z1), P(x1, y1, z1), P(x1, y1, z0), void 0, [-1, 0, 0]), B.quadP(P(x0, y0, z1), P(x0, y0, z0), P(x0, y1, z0), P(x0, y1, z1), void 0, [1, 0, 0]), B.quadP(P(x0, y0, z0), P(x1, y0, z0), P(x1, y1, z0), P(x0, y1, z0), void 0, [0, 0, 1]), B.quadP(P(x1, y0, z1), P(x0, y0, z1), P(x0, y1, z1), P(x1, y1, z1), void 0, [0, 0, -1]);
    })(-1.75, 0.62, 0.22, 0.86, -0.86, 0.86);
    let seat = (x, z, w = 0.27) => {
      B.mat(8, 90), B.box([x, Y(0.36), z], [1, 0, 0], [0, 1, 0], [0, 0, 1], [0.26, 0.07, w]);
      let bk = [x - 0.27, Y(0.68), z], ax = norm([0.25, -1, 0]), ay = norm([1, 0.25, 0]);
      B.box(bk, ay, [0, 0, 1], ax, [0.33, w, 0.06]), B.box([x - 0.33, Y(1.06), z], [1, 0, 0], [0, 1, 0], [0, 0, 1], [0.05, 0.08, w * 0.55]), B.mat(8, 30), B.box([x + 0.02, Y(0.42), z + w * 0.92], [1, 0, 0], [0, 1, 0], [0, 0, 1], [0.25, 0.05, 0.03]), B.box([x + 0.02, Y(0.42), z - w * 0.92], [1, 0, 0], [0, 1, 0], [0, 0, 1], [0.25, 0.05, 0.03]);
    };
    seat(-0.28, -0.38), seat(-0.28, 0.38), B.mat(8, 70), B.box([-1.12, Y(0.38), 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [0.25, 0.08, 0.62]), B.box([-1.36, Y(0.62), 0], norm([1, 0.35, 0]), norm([-0.35, 1, 0]), [0, 0, 1], [0.06, 0.25, 0.62]), B.mat(8, 40), B.box([0.42, Y(0.78), 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [0.2, 0.08, 0.82]), B.box([0.3, Y(0.7), 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [0.12, 0.05, 0.82]), B.mat(8, 30), B.box([0.3, Y(0.93), -0.38], norm([1, 0.15, 0]), norm([-0.15, 1, 0]), [0, 0, 1], [0.09, 0.012, 0.2]), B.mat(9, 0), B.quadP([0.235, Y(0.84), -0.56], [0.235, Y(0.84), -0.2], [0.245, Y(0.97), -0.2], [0.245, Y(0.97), -0.56], void 0, [-1, 0.08, 0]), B.mat(9, 1), B.box([0.33, Y(0.77), 0], norm([0.6, 1, 0]), norm([-1, 0.6, 0]), [0, 0, 1], [0.07, 0.01, 0.12]), B.mat(8, 50), B.box([-0.05, Y(0.45), 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [0.42, 0.11, 0.11]), B.mat(2, 60);
    {
      let c = [0.1, Y(0.8), -0.38], ax = norm([1, 0.55, 0]), u = [0, 0, 1], w = norm(cross(ax, u)), n = 20;
      for (let k = 0; k < n; k++) {
        let a0 = k / n * Math.PI * 2, a1 = (k + 1) / n * Math.PI * 2, p = (a) => [c[0] + (u[0] * Math.cos(a) + w[0] * Math.sin(a)) * 0.18, c[1] + (u[1] * Math.cos(a) + w[1] * Math.sin(a)) * 0.18, c[2] + (u[2] * Math.cos(a) + w[2] * Math.sin(a)) * 0.18];
        B.tube(p(a0), p(a1), 0.017, 5, !1);
      }
      B.tube(c, [c[0] + 0.28, c[1] - 0.12, c[2]], 0.025, 5, !1), B.tube([c[0] - 0.01, c[1], c[2] - 0.17], [c[0] - 0.01, c[1], c[2] + 0.17], 0.012, 4, !1);
    }
    for (let s of [-1, 1]) {
      let [mx, my, mz] = D.mirror, c = [mx, Y(my), mz * s];
      B.mat(0), B.box(c, [1, 0, 0], [0, 1, 0], [0, 0, 1], [0.065, 0.048, 0.085]), B.mat(13);
      let zz = [c[2] - 0.072, c[2] + 0.072];
      B.quadP([c[0] - 0.067, c[1] - 0.04, zz[0]], [c[0] - 0.067, c[1] - 0.04, zz[1]], [c[0] - 0.067, c[1] + 0.04, zz[1]], [c[0] - 0.067, c[1] + 0.04, zz[0]], void 0, [-1, 0, 0]), B.mat(2, 60), B.tube([c[0] + 0.01, c[1] - 0.02, c[2] - 0.07 * s], [c[0] + 0.06, c[1] - 0.07, c[2] - 0.13 * s], 0.014, 5, !1);
    }
    for (let s of [-1, 1]) for (let dz of [-0.075, 0.075]) {
      let c = [-2.24, Y(0.255), s * 0.56 + dz];
      B.mat(10), B.tube([c[0] + 0.12, c[1], c[2]], [c[0] - 0.07, c[1], c[2]], 0.042, 12, !1), B.mat(11), B.tube([c[0] - 0.04, c[1], c[2]], [c[0] - 0.065, c[1], c[2]], 0.037, 10, !0);
    }
    for (let ax of [D.axle, -D.axle]) for (let s of [-1, 1]) {
      let r = D.archR - 5e-3, z0 = s * (ch.trackF / 2 - 0.21), z1 = s * 0.965, cx = ax, cy = Y(D.R);
      B.mat(12);
      let n = 16, pts = [];
      for (let k = 0; k <= n; k++) {
        let a = Math.PI * (k / n);
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
      for (let k = 0; k < n; k++) {
        let [x0, y0] = pts[k], [x1, y1] = pts[k + 1], nn = [-(x0 + x1) / 2 + cx, -(y0 + y1) / 2 + cy, 0], a = B.v([x0, y0, z0], nn), b = B.v([x1, y1, z0], nn), c = B.v([x1, y1, z1], nn), d = B.v([x0, y0, z1], nn);
        s > 0 ? B.quad(a, d, c, b) : B.quad(a, b, c, d);
      }
      let inner = [];
      for (let k = 0; k <= n; k++) inner.push(pts[k]);
      for (let k = 0; k < n; k++) {
        let [x0, y0] = inner[k], [x1, y1] = inner[k + 1], a = B.v([x0, y0, z0], [0, 0, s]), b = B.v([x1, y1, z0], [0, 0, s]), c = B.v([cx, cy, z0], [0, 0, s]);
        s > 0 ? B.tri(a, b, c) : B.tri(a, c, b);
      }
    }
    return B.mat(11), B.quadP([-2.1, Y(0.17), 0.85], [-2.1, Y(0.17), -0.85], [2, Y(0.19), -0.82], [2, Y(0.19), 0.82], void 0, [0, -1, 0]), { body: B, glass: GH, wheel: buildWheel(D.R), caliper: buildCaliper(D.R) };
  }
  function buildWheel(R2 = 0.335) {
    let W2 = new MeshBuilder(8192), n = 40, rimR = 0.2413, tw = 0.245, prof = [[rimR + 5e-3, -tw * 0.46], [rimR + 0.035, -tw * 0.53], [R2 - 0.045, -tw * 0.52], [R2 - 0.012, -tw * 0.47], [R2, -tw * 0.38], [R2 + 2e-3, 0], [R2, tw * 0.38], [R2 - 0.012, tw * 0.47], [R2 - 0.045, tw * 0.52], [rimR + 0.035, tw * 0.53], [rimR + 5e-3, tw * 0.46]], sp = smooth2(prof, 3);
    W2.mat(4), lathe(W2, sp, n, (k, j) => [k / n, j / (sp.length - 1)]), W2.mat(5, 1), lathe(W2, [[rimR - 4e-3, tw * 0.47], [rimR - 0.012, tw * 0.42], [rimR - 0.012, -tw * 0.42], [rimR - 4e-3, -tw * 0.47]], n, (k, j) => [k / n, j]), W2.mat(5, 2), lathe(W2, [[rimR + 4e-3, tw * 0.47], [rimR - 0.018, tw * 0.47], [rimR - 0.022, tw * 0.43]], n, (k, j) => [k / n, j]), W2.mat(5, 0);
    let zf = tw * 0.4, zh = tw * 0.47;
    for (let s = 0; s < 10; s++) {
      let a = s / 10 * Math.PI * 2, t = [Math.cos(a), Math.sin(a), 0], sd = [-Math.sin(a), Math.cos(a), 0], P = (r, o, z) => [t[0] * r + sd[0] * o, t[1] * r + sd[1] * o, z], r0 = 0.065, r1 = rimR - 0.02, w0 = 0.021, w1 = 0.016, zz0 = zh, zz1 = zf;
      W2.quadP(P(r0, -w0, zz0), P(r1, -w1, zz1), P(r1, w1, zz1), P(r0, w0, zz0), void 0, void 0), W2.quadP(P(r0, w0, zz0), P(r1, w1, zz1), P(r1, w1, zz1 - 0.035), P(r0, w0, zz0 - 0.035)), W2.quadP(P(r1, -w1, zz1), P(r0, -w0, zz0), P(r0, -w0, zz0 - 0.035), P(r1, -w1, zz1 - 0.035));
    }
    W2.mat(5, 0);
    {
      let hub = [];
      for (let k = 0; k <= n; k++) {
        let a = k / n * Math.PI * 2;
        hub.push([Math.cos(a), Math.sin(a)]);
      }
      for (let k = 0; k < n; k++) {
        let [c0, s0] = hub[k], [c1, s1] = hub[k + 1], a = W2.v([c0 * 0.07, s0 * 0.07, zh], [0, 0, 1]), b = W2.v([c1 * 0.07, s1 * 0.07, zh], [0, 0, 1]), c = W2.v([0, 0, zh + 8e-3], [0, 0, 1]);
        W2.tri(a, b, c);
        let d = W2.v([c0 * 0.07, s0 * 0.07, zh], [c0, s0, 0]), e = W2.v([c1 * 0.07, s1 * 0.07, zh], [c1, s1, 0]), f2 = W2.v([c1 * 0.07, s1 * 0.07, zh - 0.04], [c1, s1, 0]), g = W2.v([c0 * 0.07, s0 * 0.07, zh - 0.04], [c0, s0, 0]);
        W2.quad(d, g, f2, e);
      }
    }
    W2.mat(3);
    for (let k = 0; k < 5; k++) {
      let a = k / 5 * Math.PI * 2 + 0.3;
      W2.tube([Math.cos(a) * 0.048, Math.sin(a) * 0.048, zh - 5e-3], [Math.cos(a) * 0.048, Math.sin(a) * 0.048, zh + 0.012], 9e-3, 6, !0);
    }
    W2.mat(5, 3), W2.tube([0, 0, zh + 2e-3], [0, 0, zh + 0.011], 0.028, 16, !0), W2.mat(6);
    let zd = -0.02, ri = 0.1, ro = 0.18;
    for (let k = 0; k < n; k++) {
      let a0 = k / n * Math.PI * 2, a1 = (k + 1) / n * Math.PI * 2;
      for (let [z, nz] of [[zd + 0.014, 1], [zd - 0.014, -1]]) {
        let a = W2.v([Math.cos(a0) * ri, Math.sin(a0) * ri, z], [0, 0, nz], a0, ri), b = W2.v([Math.cos(a1) * ri, Math.sin(a1) * ri, z], [0, 0, nz], a1, ri), c = W2.v([Math.cos(a1) * ro, Math.sin(a1) * ro, z], [0, 0, nz], a1, ro), d = W2.v([Math.cos(a0) * ro, Math.sin(a0) * ro, z], [0, 0, nz], a0, ro);
        nz > 0 ? W2.quad(a, d, c, b) : W2.quad(a, b, c, d);
      }
      let e = W2.v([Math.cos(a0) * ro, Math.sin(a0) * ro, zd + 0.014], [Math.cos(a0), Math.sin(a0), 0]), f2 = W2.v([Math.cos(a1) * ro, Math.sin(a1) * ro, zd + 0.014], [Math.cos(a1), Math.sin(a1), 0]), g = W2.v([Math.cos(a1) * ro, Math.sin(a1) * ro, zd - 0.014], [Math.cos(a1), Math.sin(a1), 0]), h = W2.v([Math.cos(a0) * ro, Math.sin(a0) * ro, zd - 0.014], [Math.cos(a0), Math.sin(a0), 0]);
      W2.quad(e, h, g, f2);
    }
    return W2;
  }
  function lathe(B, prof, n, uvf) {
    let ix = [];
    for (let k = 0; k <= n; k++) {
      let a = k / n * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), row = [];
      for (let j = 0; j < prof.length; j++) {
        let [r, z] = prof[j], pa = prof[Math.max(0, j - 1)], pb = prof[Math.min(prof.length - 1, j + 1)], dr = pb[0] - pa[0], nr = pb[1] - pa[1], nz = -dr, uv = uvf(k, j);
        row.push(B.v([c * r, s * r, z], [c * nr, s * nr, nz], uv[0], uv[1]));
      }
      ix.push(row);
    }
    for (let k = 0; k < n; k++) for (let j = 0; j < prof.length - 1; j++) B.quad(ix[k][j], ix[k + 1][j], ix[k + 1][j + 1], ix[k][j + 1]);
  }
  function buildCaliper() {
    let C2 = new MeshBuilder(256);
    C2.mat(7);
    let a0 = 0.35, a1 = 1.25, r = 0.165, n = 8;
    for (let k = 0; k < n; k++) {
      let t0 = a0 + (a1 - a0) * k / n, t1 = a0 + (a1 - a0) * (k + 1) / n;
      C2.box([-Math.cos((t0 + t1) / 2) * r, Math.sin((t0 + t1) / 2) * r, -0.02], norm([-Math.sin((t0 + t1) / 2), -Math.cos((t0 + t1) / 2), 0]), [0, 0, 1], norm([-Math.cos((t0 + t1) / 2), Math.sin((t0 + t1) / 2), 0]), [(t1 - t0) * r * 0.55, 0.032, 0.03]);
    }
    return C2;
  }
  function mirrorZ(B) {
    let M = new MeshBuilder(B.nv + 16);
    M.append(B);
    for (let i = 0; i < M.nv; i++)
      M.f[i * 9 + 2] *= -1, M.s[i * 18 + 8] *= -1;
    for (let i = 0; i < M.idx.length; i += 3) {
      let t = M.idx[i + 1];
      M.idx[i + 1] = M.idx[i + 2], M.idx[i + 2] = t;
    }
    return M.mn[2] = -B.mx[2], M.mx[2] = -B.mn[2], M;
  }

  // src/render/glsl/car.js
  var CAR_VS = `
layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNrm;layout(location=2) in vec2 aUV;layout(location=3) in uvec4 aMat;layout(location=4) in vec4 aCol;
uniform mat4 uVP;uniform mat4 uVPnj;uniform mat4 uPrevVP;uniform mat4 uModel;uniform mat4 uPrevModel;
out vec3 vP;out vec3 vL;out vec3 vN;out vec3 vNL;out vec2 vUV;flat out uvec4 vMat;out vec4 vCur;out vec4 vPrev;
void main(){vec4 w=uModel*vec4(aPos,1.0);vP=w.xyz;vL=aPos;vN=mat3(uModel)*aNrm;vNL=aNrm;vUV=aUV;vMat=aMat;
  gl_Position=uVP*w;vCur=uVPnj*w;vPrev=uPrevVP*(uPrevModel*vec4(aPos,1.0));}`;
  var CAR_FS = FRAME + NOISE + PACK + LIGHTING + SHADE + `
in vec3 vP;in vec3 vL;in vec3 vN;in vec3 vNL;in vec2 vUV;flat in uvec4 vMat;in vec4 vCur;in vec4 vPrev;
layout(location=0) out vec4 oCol;
#ifndef GLASS
layout(location=1) out vec4 oNrm;layout(location=2) out vec2 oVel;
#endif
uniform samplerCube uProbe;uniform float uProbeLod;
uniform vec3 uPaint;uniform float uMetal;uniform float uPaintR;uniform float uFlake;uniform vec3 uRoof;
uniform vec4 uLamps;       /* headlights, tail, brake, reverse */
uniform vec4 uArch;        /* axle x, axle y (body), arch radius, ride */
uniform float uHcg;uniform float uDisc;uniform vec3 uCaliper;uniform float uSpin;uniform float uDirt;
float aa(float d,float w){float f=fwidth(d)*.8+1e-5;return 1.0-smoothstep(w-f,w+f,d);}
vec3 envBRDF(vec3 F0,float NoV,float r){const vec4 c0=vec4(-1,-.0275,-.572,.022),c1=vec4(1,.0425,1.04,-.04);vec4 rr=r*c0+c1;
  float a=min(rr.x*rr.x,exp2(-9.28*NoV))*rr.x+rr.y;vec2 AB=vec2(-1.04,1.04)*a+rr.zw;return F0*AB.x+AB.y;}
vec3 env(vec3 R,float r){return textureLod(uProbe,R,r*uProbeLod).rgb;}
/* the colour of hot iron */
vec3 heat(float t){return vec3(1.,.28,.05)*smoothstep(.25,.6,t)*6.+vec3(1.,.55,.15)*smoothstep(.6,1.,t)*14.;}

/* the greenhouse: glass or not, from the profile position u (0 at the belt, 1 on the roof centre) and x */
void ghClass(float u,float x,out bool top,out float glass,out float frit){
  top=u>.42;glass=0.0;frit=0.0;
  float aEdge=.40-.62*min(u,.42),cEdge=-1.22+.55*min(u,.42);
  if(top){if(x>-.10&&x<.62){glass=1.0;frit=max(aa(u-.42,.035),aa(.62-x,.03));}
    else if(x<-.98&&x>-1.92){glass=1.0;frit=max(max(aa(u-.42,.05),aa(-.98-x,.05)),aa(x+1.92,.04));}}
  else if(u>.03&&x<aEdge&&x>cEdge){glass=1.0;frit=max(aa(aEdge-x,.012),aa(x-cEdge,.012));if(abs(x+.385)<.016)frit=1.0;}
}
struct M{vec3 alb;float metal;float rough;float clear;float clearR;vec3 em;float flake;vec2 g;float spec;};
/* panel gaps: distance to the seams, in body metres */
float seams(vec3 L,vec3 N,float yg){
  float d=1.0;float az=abs(L.z);
  if(abs(N.z)>.3){
    if(yg>.2&&yg<.9){d=min(d,abs(L.x-.87-.07*(yg-.55)));d=min(d,abs(L.x+.47-.11*(yg-.55)));}
    if(L.x<.87&&L.x>-.47)d=min(d,abs(yg-.255));
    if(yg>.3&&yg<.72)d=min(d,abs(L.x-1.99));
    if(yg>.33&&yg<.8)d=min(d,abs(L.x+2.02));
    if(L.z>0.0)d=min(d,abs(length(vec2(L.x+1.62,yg-.79))-.085));
  }
  if(N.y>.45){
    if(az<.83)d=min(d,abs(L.x-.69));
    if(L.x>.69&&L.x<2.06)d=min(d,abs(az-.80+.04*(L.x-.69)));
    if(az<.70&&L.x<-1.9)d=min(d,abs(L.x+1.985));
    if(L.x<-1.985)d=min(d,abs(az-.71));
  }
  return d;
}
void paint(inout M m,vec3 L,vec3 N,float yg,vec3 V){
  m.alb=uPaint;m.metal=uMetal;m.rough=uPaintR;m.clear=1.0;m.clearR=.035;m.flake=uFlake;
  float az=abs(L.z);
  /* rocker, lower valance, diffuser: satin black */
  if(yg<.215||(L.x>2.12&&yg<.3)||(L.x<-2.18&&yg<.33)){m.alb=vec3(.02);m.metal=0.;m.rough=.5;m.clear=.3;m.flake=0.;
    if(L.x<-2.18&&yg<.33){float fin=step(.5,fract(L.z*7.));m.alb*=1.0+fin*.5;}}
  /* front: grille and intakes */
  if(N.x>.55&&L.x>2.1){
    if(az<.52&&yg>.31&&yg<.52){vec2 h=vec2(L.z*42.,yg*42.);h.x+=step(.5,fract(h.y*.5))*.5;vec2 f=abs(fract(h)-.5);float web=step(.38,max(f.x,f.y));
      m.alb=vec3(.012)+web*.03;m.metal=web*.5;m.rough=.35;m.clear=0.;m.flake=0.;
      float sur=aa(abs(max(az-.52,max(.31-yg,yg-.52))),.012);if(az>.5||yg<.33||yg>.5){m.alb=vec3(.6);m.metal=1.;m.rough=.15;}}
    else if(az<.74&&yg>.2&&yg<.29){m.alb=vec3(.01);m.metal=0.;m.rough=.6;m.clear=0.;m.flake=0.;}
    /* plate */
  }
  /* headlamps: slim, swept back, LED projectors and a running-light strip */
  if(L.x>1.86&&N.x>-.1&&az>.38&&az<.86){
    float t=(az-.38)/.48;float yc=.60-.055*t-.04*smoothstep(.0,1.,(2.2-L.x)/.34);float hh=.032-.01*t;
    if(abs(yg-yc)<hh){
      vec2 q=vec2(az,yg-yc);m.clear=1.0;m.clearR=.01;m.flake=0.;m.metal=1.;m.alb=vec3(.12);m.rough=.18;
      float p1=length(vec2(az-.52,yg-yc+.004)),p2=length(vec2(az-.65,yg-yc+.004));
      float proj=max(aa(p1,.021),aa(p2,.019));
      if(proj>0.0){m.alb=mix(m.alb,vec3(.02),proj);m.rough=mix(m.rough,.05,proj);m.em+=vec3(.9,.95,1.)*proj*uLamps.x*90.;}
      float drl=aa(abs(yg-(yc+hh-.007)),.0035)*step(.4,az);
      m.em+=vec3(.95,.97,1.)*drl*(uLamps.x>0.0?40.:25.);
      m.alb*=1.0-drl*.6;
      m.g=vec2(0);
    }
  }
  /* rear: a full-width light bar, red lens clusters, reverse lamps, the plate */
  if(L.x<-2.1&&N.x<.2){
    float bar=aa(abs(yg-.818),.009)*step(az,.82);
    float clus=aa(max(abs(az-.67)-.15,abs(yg-.78)-.045),.0);
    float rev=aa(max(abs(az-.36)-.06,abs(yg-.775)-.022),.0);
    float plate=aa(max(az-.26,abs(yg-.49)-.065),.0);
    if(bar+clus>0.0){m.alb=mix(m.alb,vec3(.25,.01,.01),max(bar,clus));m.metal=mix(m.metal,0.,max(bar,clus));m.flake=0.;m.clearR=.01;
      float leds=clus*aa(abs(fract((yg-.735)/.03)-.5),.18);
      m.em+=vec3(1.,.03,.02)*(bar*(uLamps.y*6.+uLamps.z*30.)+leds*(uLamps.y*5.+uLamps.z*36.)+clus*.15);}
    if(rev>0.0){m.alb=mix(m.alb,vec3(.6),rev);m.metal=0.;m.em+=vec3(1.,.97,.9)*rev*uLamps.w*30.;}
    if(plate>0.0){vec2 pc=vec2((L.z+.22)/.44*7.,(yg-.44)/.1*5.);vec2 ci=floor(pc);float ch=step(.45,h12(ci+3.))*step(0.,pc.x)*step(pc.x,7.)*step(.6,pc.y)*step(pc.y,4.4)*step(.2,fract(pc.x));
      m.alb=mix(m.alb,mix(vec3(.75,.75,.7),vec3(.02),ch),plate);m.metal=0.;m.flake=0.;m.clear=.6;m.em+=vec3(.9,.9,.8)*plate*(1.0-ch)*uLamps.y*.6;}
  }
  /* panel gaps */
  float sd=seams(L,N,yg);float gp=aa(sd,.0032);
  if(gp>0.0){m.alb=mix(m.alb,vec3(.004),gp);m.clear*=1.0-gp;m.flake*=1.0-gp;m.rough=mix(m.rough,.7,gp);}
  /* water beads on the clear coat */
  if(uWet>0.0&&m.clear>.5){vec3 v3=voro(vec2(L.x+L.y*.3,L.z+L.y*.7)*55.);float bead=aa(v3.x,.26)*step(.45,v3.z)*uWet*saturate(1.0-length(fwidth(L))*120.);
    m.clearR=mix(m.clearR,.012,bead);m.alb*=1.0-bead*.15;}
}
void main(){
  vec3 N=normalize(vN);if(!gl_FrontFacing)N=-N;vec3 NL=normalize(vNL);
  vec3 V=normalize(uCam-vP);uint id=vMat.x;float yg=vL.y+uHcg;
  M m;m.alb=vec3(.5);m.metal=0.;m.rough=.5;m.clear=0.;m.clearR=.05;m.em=vec3(0);m.flake=0.;m.g=vec2(0);m.spec=1.0;
  float alpha=1.0;
  /* the wheel arches are cut out of the body */
  if(id==0u){vec2 aw=vec2(abs(vL.x)-uArch.x,vL.y-uArch.y);if(length(aw)<uArch.z&&abs(vL.z)>.6)discard;
    /* the body shell is closed at the beltline; under the greenhouse it opens into the cabin */
    if(vL.x<.64&&vL.x>-1.95&&abs(vL.z)<.8&&NL.y>.3&&yg>.78)discard;}
  if(id==0u)paint(m,vL,NL,yg,V);
  else if(id==1u){
    float u=vUV.x,x=vL.x;bool top;float glass,frit;ghClass(u,x,top,glass,frit);
    float ag=glass*(1.0-frit);
#ifdef GLASS
    if(ag<.02)discard;
    m.alb=vec3(0);m.metal=0.;m.rough=.02;
#else
    if(ag>.98)discard;
    if(frit>0.0&&glass>0.0){m.alb=vec3(.008);m.rough=.25;m.clear=.0;}
    else if(top&&x<=-.10&&x>=-.98){m.alb=uRoof;m.metal=uMetal;m.rough=uPaintR;m.clear=1.0;m.clearR=.035;m.flake=uFlake;}
    else if(u<.03){m.alb=vec3(.015);m.rough=.2;m.clear=1.0;m.clearR=.02;}
    else if(x>=.40-.62*min(u,.42)&&!top){m.alb=vec3(.012);m.rough=.15;m.clear=1.0;m.clearR=.02;}
    else{m.alb=uPaint;m.metal=uMetal;m.rough=uPaintR;m.clear=1.0;m.clearR=.035;m.flake=uFlake;}
#endif
  }
  else if(id==2u){m.alb=vec3(.018);m.rough=float(vMat.y)/255.;m.clear=.3;}
  else if(id==3u){m.alb=vec3(.9);m.metal=1.;m.rough=.08;}
  else if(id==4u){/* tyre: tread blocks on the crown, lettering on the outer wall */
    float v=vUV.y,a=vUV.x;m.alb=vec3(.022);m.rough=.82;
    float tread=step(.32,v)*step(v,.68);
    if(tread>0.0){float gr=aa(abs(fract(v*7.)-.5),.06);float sl=aa(abs(fract(a*90.+v*3.)-.5),.06)*step(abs(v-.5),.12);m.alb*=1.0-.6*max(gr,sl);m.rough=mix(.75,.95,gr);}
    if(v>.8&&v<.92){float ch=step(.55,h12(floor(vec2(a*260.,(v-.8)*40.))))*step(.25,fract(a*26.))*step(fract(a*2.),.4);m.alb+=vec3(.08)*ch;}
    m.rough=mix(m.rough,.35,uWet*.8);m.alb*=1.0-.3*uWet;
  }
  else if(id==5u){uint k=vMat.y;
    if(k==0u){m.alb=vec3(.07,.072,.08);m.metal=1.;m.rough=.32;m.clear=.6;m.clearR=.05;}
    else if(k==1u){m.alb=vec3(.03);m.metal=.6;m.rough=.5;}
    else if(k==2u){m.alb=vec3(.85);m.metal=1.;m.rough=.18;}
    else{m.alb=vec3(.05);m.rough=.3;float r=length(vL.xy);m.em+=uPaint*aa(abs(r-.017),.002)*.5;}
  }
  else if(id==6u){float r=vUV.y,a=vUV.x;m.alb=vec3(.28,.27,.26);m.metal=1.;m.rough=.38;
    float holes=aa(length(vec2(fract(a*14.)-.5,(r-.14)*28.)),.17)*step(.11,r)*step(r,.17);m.alb*=1.0-holes*.95;
    float grooves=aa(abs(fract(a*6.+r*9.)-.5),.03)*.4;m.alb*=1.0-grooves;
    m.em+=heat(uDisc)*(1.0-holes);}
  else if(id==7u){m.alb=uCaliper;m.rough=.3;m.clear=.8;m.clearR=.06;}
  else if(id==8u){m.alb=vec3(float(vMat.y)/255.*.12);m.rough=.85;}
  else if(id==14u){bool tp;float gl,fr;ghClass(vUV.x,vL.x,tp,gl,fr);if(gl*(1.0-fr)>.5)discard;m.alb=vec3(.035);m.rough=.9;}
  else if(id==9u){m.alb=vec3(.01);m.rough=.2;
    if(vMat.y==0u){/* two dials: tachometer and speed, their needles driven by uSpin and uDirt */
      vec2 q=vec2((vL.z+.38)/.075,(yg-.905)/.07);vec2 d1=q-vec2(-1.05,0.),d2=q-vec2(1.05,0.);
      float r1=length(d1),r2=length(d2);float ring=aa(abs(r1-.85),.05)+aa(abs(r2-.85),.05);
      float ticks=(aa(abs(fract(atan(d1.y,d1.x)*1.59)-.5),.08)*step(.62,r1)*step(r1,.8))+(aa(abs(fract(atan(d2.y,d2.x)*1.59)-.5),.08)*step(.62,r2)*step(r2,.8));
      m.em+=vec3(.25,.85,1.)*(ring*.9+ticks*.7)*.9;m.em+=vec3(1.,.25,.1)*aa(abs(r1-.85),.05)*step(1.2,atan(d1.y,-d1.x)+1.6)*.8;}
    else m.em+=vec3(.15,.3,.7)*.6;}
  else if(id==10u){float t=saturate(-vL.x-2.18)*6.;m.alb=mix(vec3(.85,.85,.88),vec3(.5,.35,.6),saturate(t*.7));m.metal=1.;m.rough=.12;}
  else if(id==11u){m.alb=vec3(.012);m.rough=.8;}
  else if(id==12u){m.alb=vec3(.01);m.rough=.9;}
  else if(id==13u){m.alb=vec3(.9);m.metal=1.;m.rough=.01;}
  /* ---------- light it ---------- */
  Surf s;s.P=vP;s.V=V;s.N=N;s.Nc=N;s.ao=1.0;s.spec=1.0;s.trans=0.0;
  vec3 flakeN=N;
  if(m.flake>0.0){float fp=length(fwidth(vL))*900.;vec3 c=floor(vL*700.);vec3 r=vec3(h13(c),h13(c+17.1),h13(c+31.7))-.5;flakeN=normalize(N+r*.45*m.flake*saturate(1.0-fp));}
  s.N=flakeN;
  s.diff=m.alb*(1.0-m.metal);s.F0=mix(vec3(.04),m.alb,m.metal);s.rough=m.rough;s.clear=m.clear;s.clearR=m.clearR;
  float NoV=max(dot(N,V),1e-3);
  vec3 col=m.em;
#ifdef GLASS
  /* glass: reflections on top, the cabin seen through a tint */
  float F=F_Sch(vec3(.04),NoV).x;
  vec3 R=reflect(-V,N);vec3 refl=env(R,.02);
  Surf sg=s;sg.diff=vec3(0);sg.F0=vec3(.04);sg.rough=.04;sg.clear=0.0;
  col+=directAll(sg,gl_FragCoord.xy,length(uCam-vP))+refl*F;
  float tr=vL.x>-.10&&vUV.x>.42?.78:.42;
  alpha=1.0-(1.0-F)*tr;
  /* rain on the glass */
  oCol=vec4(col,alpha);
#else
  /* inside the cabin the roof and doors block most light; no light here casts shadows, so shade it down */
  bool inside=id==8u||id==9u||id==14u;float cab=inside?.22:1.0;
  col+=directAll(s,gl_FragCoord.xy,length(uCam-vP))*cab;
  /* ambient from the probe: what surrounds the car, blurred */
  vec3 amb=textureLod(uProbe,N,uProbeLod).rgb;
  float occ=(1.0-.55*saturate(-N.y)-.25*saturate(1.0-(yg-.15)*3.))*(inside?.15:1.0);
  col+=s.diff*amb*occ;
  /* reflections: the base layer, then the clear coat over it */
  vec3 Rb=reflect(-V,flakeN);vec3 eb=envBRDF(s.F0,NoV,s.rough);
  vec3 base=env(Rb,s.rough)*eb*occ;
  if(s.clear>0.0){float Fc=F_Sch(vec3(.04),NoV).x*s.clear;vec3 Rc=reflect(-V,N);col=col*(1.0-Fc)+base*(1.0-Fc)+env(Rc,s.clearR)*Fc;}
  else col+=base;
  oCol=vec4(col,1.0);
  oNrm=vec4(octEnc(N),s.rough,0.0);
  oVel=(vCur.xy/vCur.w-vPrev.xy/vPrev.w)*.5;
#endif
}`;

  // src/render/car.js
  var PAINTS = {
    magenta: { name: "Neon Magenta", col: [0.62, 0.03, 0.22], metal: 0.75, rough: 0.32, flake: 0.9, roof: [0.62, 0.03, 0.22] },
    midnight: { name: "Midnight Blue", col: [0.012, 0.03, 0.11], metal: 0.8, rough: 0.3, flake: 1, roof: [0.012, 0.03, 0.11] },
    silver: { name: "Liquid Silver", col: [0.6, 0.62, 0.64], metal: 1, rough: 0.28, flake: 0.6, roof: [0.6, 0.62, 0.64] },
    orange: { name: "Signal Orange", col: [0.85, 0.2, 0.02], metal: 0.15, rough: 0.25, flake: 0.2, roof: [0.01, 0.01, 0.01] },
    green: { name: "Racing Green", col: [0.01, 0.12, 0.05], metal: 0.6, rough: 0.3, flake: 0.8, roof: [0.01, 0.12, 0.05] },
    white: { name: "Pearl White", col: [0.8, 0.8, 0.78], metal: 0.1, rough: 0.22, flake: 0.4, roof: [0.01, 0.01, 0.01] },
    black: { name: "Gloss Black", col: [6e-3, 6e-3, 7e-3], metal: 0.3, rough: 0.2, flake: 0.5, roof: [6e-3, 6e-3, 7e-3] }
  }, T4 = (x, y, z) => {
    let m = M4.ident();
    return m[12] = x, m[13] = y, m[14] = z, m;
  }, RY = (a) => {
    let m = M4.ident(), c = Math.cos(a), s = Math.sin(a);
    return m[0] = c, m[2] = -s, m[8] = s, m[10] = c, m;
  }, RZ = (a) => {
    let m = M4.ident(), c = Math.cos(a), s = Math.sin(a);
    return m[0] = c, m[1] = s, m[4] = -s, m[5] = c, m;
  };
  function qm4(q, p) {
    let [x, y, z, w] = q, m = new Float32Array(16);
    return m[0] = 1 - 2 * (y * y + z * z), m[1] = 2 * (x * y + z * w), m[2] = 2 * (x * z - y * w), m[4] = 2 * (x * y - z * w), m[5] = 1 - 2 * (x * x + z * z), m[6] = 2 * (y * z + x * w), m[8] = 2 * (x * z + y * w), m[9] = 2 * (y * z - x * w), m[10] = 1 - 2 * (x * x + y * y), m[12] = p[0], m[13] = p[1], m[14] = p[2], m[15] = 1, m;
  }
  var CarRenderer = class {
    constructor(R2, chassis) {
      this.R = R2;
      let G2 = R2.G;
      this.ch = chassis, this.P = { car: G2.program("car", CAR_VS, CAR_FS), glass: G2.program("carGlass", CAR_VS, CAR_FS, { GLASS: 1 }) };
      let m = buildCar(chassis);
      this.model = m;
      let up = (B) => G2.mesh(LAYOUT, 36, B.vertexData(), B.indexData());
      this.mesh = { body: up(m.body), glass: up(m.glass), wheelR: up(m.wheel), wheelL: up(mirrorZ(m.wheel)), calR: up(m.caliper), calL: up(mirrorZ(m.caliper)) }, this.list = [], this.prev = /* @__PURE__ */ new Map(), R2.extra.push(this);
    }
    prepare(R2, S) {
      this.list = [];
      for (let c of S.cars || []) {
        let M = qm4(c.q, c.p), key = c.id || 0, pv = this.prev.get(key), wheels = c.wheels.map((w, i) => {
          let cx = w.hp[0], cy = w.hp[1] - w.len, cz = w.hp[2], base = M4.mul(M, M4.mul(T4(cx, cy, cz), RY(-w.steer))), pw = pv ? pv.wheels[i] : null, dAng = pw ? Math.max(-0.35, Math.min(0.35, w.ang - pw.ang)) : 0;
          return {
            M: M4.mul(base, RZ(-w.ang)),
            C: base,
            ang: w.ang,
            left: w.hp[2] < 0,
            spin: pw ? w.ang - pw.ang : 0,
            prevAngM: pw ? M4.mul(pw.base, RZ(-(w.ang - dAng))) : null,
            base,
            prevC: pw ? pw.base : base,
            disc: w.disc || 0
          };
        }), item = { c, M, prevM: pv ? pv.M : M, wheels, paint: c.paint || PAINTS.magenta };
        for (let w of item.wheels) w.prevAngM || (w.prevAngM = w.M);
        this.list.push(item), this.prev.set(key, { M, wheels: wheels.map((w) => ({ ang: w.ang, base: w.base })) });
      }
    }
    uniforms(G2, P, it) {
      let p = it.paint, c = it.c, L = c.lamps || [0, 0, 0, 0];
      G2.set(P, {
        uPaint: p.col,
        uMetal: p.metal,
        uPaintR: p.rough,
        uFlake: p.flake,
        uRoof: p.roof,
        uLamps: L,
        uArch: [(this.model, 1.32), 0.335 - this.ch.hcg, 0.405, 0],
        uHcg: this.ch.hcg,
        uCaliper: c.caliper || [0.7, 0.02, 0.02],
        uDirt: 0
      });
    }
    draw(G2, P, M, prevM, mesh) {
      G2.uni(P, "uModel", M), G2.uni(P, "uPrevModel", prevM), G2.draw(mesh);
    }
    opaque(R2, U, texs) {
      if (!this.list.length) return;
      let G2 = R2.G, gl = R2.gl, P = G2.use(this.P.car);
      G2.set(P, U), G2.tex(P, texs), gl.enable(gl.CULL_FACE);
      for (let it of this.list) {
        this.uniforms(G2, P, it), G2.uni(P, "uDisc", 0), this.draw(G2, P, it.M, it.prevM, this.mesh.body), this.draw(G2, P, it.M, it.prevM, this.mesh.glass);
        for (let w of it.wheels)
          G2.uni(P, "uDisc", w.disc), this.draw(G2, P, w.M, w.prevAngM, w.left ? this.mesh.wheelL : this.mesh.wheelR), this.draw(G2, P, w.C, w.prevC, w.left ? this.mesh.calL : this.mesh.calR);
      }
    }
    glass(R2, U, texs) {
      if (!this.list.length) return;
      let G2 = R2.G, gl = R2.gl, P = G2.use(this.P.glass);
      G2.set(P, U), G2.tex(P, texs), gl.enable(gl.CULL_FACE);
      for (let it of this.list)
        this.uniforms(G2, P, it), this.draw(G2, P, it.M, it.prevM, this.mesh.glass);
      gl.disable(gl.CULL_FACE);
    }
    shadow(R2, P, VP, kind) {
      let G2 = R2.G;
      for (let it of this.list)
        if (!(kind === "hl" && it.c.self)) {
          G2.uni(P, "uModel", it.M), G2.draw(this.mesh.body), G2.draw(this.mesh.glass);
          for (let w of it.wheels)
            G2.uni(P, "uModel", w.M), G2.draw(w.left ? this.mesh.wheelL : this.mesh.wheelR);
        }
      G2.uni(P, "uModel", M4.ident());
    }
  };

