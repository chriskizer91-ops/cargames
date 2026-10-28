  // ===== world/ranch.js =====
  /* The ranch: one heightfield of red-dirt country around a metal shop. A graded dirt drag strip runs
     east from the shop, a trail loops through the hills to the north and crosses a creek, a steep hill
     stands to the north-east for the climb, and a mud pit sits west of the pad. Free roam adds a
     burnout pad between the shop and the pit, a muddy loop out west that fords the creek twice, and a
     rock garden north-east of the shop, drawn from its own fine heightfield (half-metre cells) so the
     ledges and boulders are sharp. Everything the truck can touch comes from the same triangulated
     grids the renderer draws, so wheels never float. */
  var SURF = ["grass", "dirt", "strip", "trail", "rock", "mud", "concrete", "water"], SF = {};
  SURF.forEach((n, i) => SF[n] = i);
  var RANCH_DEF = {
    size: 800, cell: 2,
    pad: { x: 0, z: 0, w: 32, d: 24 },
    shop: { x0: -15, x1: 15, z0: -31, z1: -15, wall: 5.2, peak: 7.6, door: [-5.5, 5.5, 4.4] },
    strip: { x0: -46, start: 0, x1: 300, z: 40, half: 9, lanes: [36, 44], eighth: 201.168, quarter: 402.336 },
    mud: { x: -112, z: 2, rx: 32, rz: 11, depth: 0.85 },
    hill: { x: 236, z: -262, amp: 46, sig: 56 },
    creek: [[-330, 330], [-250, 190], [-205, 60], [-196, -40], [-214, -130], [-252, -215], [-300, -300], [-360, -380]],
    loop: [[-40, -44], [-92, -70], [-150, -96], [-196, -112], [-238, -160], [-252, -222], [-214, -282], [-140, -312], [-56, -300], [12, -262], [70, -222], [104, -160], [86, -104], [30, -76], [-40, -44]],
    climb: [[116, -84], [158, -124], [214, -148], [262, -178], [262, -212], [222, -226], [194, -246], [214, -272], [236, -264]],
    burn: { x: 41, z: 0, w: 30, d: 22 },
    mudTrack: [[-168, 112], [-176, 88], [-200, 76], [-232, 78], [-258, 94], [-266, 120], [-252, 146], [-222, 156], [-190, 150], [-170, 134], [-168, 112]],
    rocks: { x0: 44, z0: -64, w: 56, d: 44, cell: 0.5 }
  };
  /* seeded value noise for the terrain */
  function makeNoise(seed) {
    let R2 = rng(seed), P = new Float32Array(512);
    for (let i = 0; i < 512; i++) P[i] = R2();
    let h = (x, z) => P[(x * 73856093 ^ z * 19349663) >>> 0 & 511], vn2 = (x, z) => {
      let ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz), a = h(ix, iz), b = h(ix + 1, iz), c = h(ix, iz + 1), d = h(ix + 1, iz + 1);
      return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
    }, fbmN = (x, z, o = 4) => {
      let s = 0, a = 0.5, f = 1;
      for (let i = 0; i < o; i++) s += a * vn2(x * f, z * f), f *= 2.03, a *= 0.5, x += 17.3, z -= 9.1;
      return s;
    }, ridge = (x, z) => {
      let s = 0, a = 0.5, f = 1;
      for (let i = 0; i < 4; i++) {
        let v = 1 - Math.abs(vn2(x * f, z * f) * 2 - 1);
        s += a * v * v, f *= 2.1, a *= 0.5;
      }
      return s;
    };
    return { vn: vn2, fbm: fbmN, ridge };
  }
  /* a closed or open Catmull-Rom path, sampled every metre, with a spatial hash to find the nearest point */
  function makePath(pts, closed) {
    let n = pts.length, P = (i) => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))], dense = [], segs = closed ? n - 1 : n - 1;
    for (let i = 0; i < segs; i++) {
      let p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      if (closed && i === 0) p0 = pts[n - 2];
      if (closed && i === segs - 1) p3 = pts[1];
      for (let k = 0; k < 24; k++) {
        let t = k / 24, t2 = t * t, t3 = t2 * t, cr2 = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        dense.push([cr2(p0[0], p1[0], p2[0], p3[0]), cr2(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    dense.push(pts[n - 1].slice());
    let cum = [0];
    for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
    let L = cum[cum.length - 1], N2 = Math.floor(L) + 1, X = new Float64Array(N2), Z = new Float64Array(N2), j = 0;
    for (let i = 0; i < N2; i++) {
      let s = i * L / (N2 - 1);
      for (; j < cum.length - 2 && cum[j + 1] < s; ) j++;
      let t = (s - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j]);
      X[i] = dense[j][0] + (dense[j + 1][0] - dense[j][0]) * t, Z[i] = dense[j][1] + (dense[j + 1][1] - dense[j][1]) * t;
    }
    let ds = L / (N2 - 1), B = 16, hash = new Map();
    for (let i = 0; i < N2; i++) {
      let k = Math.floor(X[i] / B) + "," + Math.floor(Z[i] / B);
      hash.has(k) || hash.set(k, []), hash.get(k).push(i);
    }
    let path = { closed, N: N2, ds, len: L, X, Z };
    path.nearest = (x, z, r = 2) => {
      let bx = Math.floor(x / B), bz = Math.floor(z / B), best = 1e18, bi = -1;
      for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) {
        let l = hash.get(bx + a + "," + (bz + b));
        if (l) for (let q of l) {
          let d = (X[q] - x) ** 2 + (Z[q] - z) ** 2;
          d < best && (best = d, bi = q);
        }
      }
      return bi < 0 ? null : { i: bi, s: bi * ds, d: Math.sqrt(best) };
    };
    path.at = (s) => {
      let f = Math.max(0, Math.min(N2 - 1.001, s / ds)), i = Math.floor(f), t = f - i;
      return [X[i] + (X[i + 1] - X[i]) * t, Z[i] + (Z[i + 1] - Z[i]) * t];
    };
    path.dir = (s) => {
      let a = path.at(Math.max(0, s - 2)), b = path.at(Math.min(L, s + 2)), l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
    };
    return path;
  }
  function buildRanch() {
    let D = RANCH_DEF, NZ = makeNoise(7), N2 = D.size / D.cell + 1, cell = D.cell, x0 = -D.size / 2, z0 = -D.size / 2, H = new Float32Array(N2 * N2), W = new Float32Array(N2 * N2 * 4), SC = new Uint8Array(N2 * N2), sst = (a, b, x) => {
      let t = Math.max(0, Math.min(1, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    }, loop = makePath(D.loop, !0), climb = makePath(D.climb, !1), creek = makePath(D.creek, !1), mudT = makePath(D.mudTrack, !0), St = D.strip, M = D.mud, HL = D.hill, BU = D.burn, RG = D.rocks;
    /* ---------- the shape of the land ---------- */
    let rectDist = (x, z, ax, az, bx, bz) => {
      let dx = Math.max(ax - x, 0, x - bx), dz = Math.max(az - z, 0, z - bz);
      return Math.hypot(dx, dz);
    }, natural = (x, z) => {
      let h = 2.6 * (NZ.fbm(x / 95, z / 95) - 0.5) + 0.9 * (NZ.fbm(x / 23, z / 23) - 0.5), north = sst(-50, -230, z), east = sst(150, 330, x), west = sst(-150, -330, x);
      h += north * (30 * NZ.ridge(x / 170 + 3.1, z / 170) + 7 * (NZ.fbm(x / 38, z / 38) - 0.4));
      h += west * 10 * NZ.ridge(x / 120, z / 120 + 7) + east * 6 * NZ.fbm(x / 60, z / 60);
      h += HL.amp * Math.exp(-((x - HL.x) ** 2 + (z - HL.z) ** 2) / (2 * HL.sig * HL.sig));
      h += 4 * Math.exp(-((x - 140) ** 2 + (z - 150) ** 2) / (2 * 60 * 60)) - 2 * Math.exp(-((x - 60) ** 2 + (z - 220) ** 2) / (2 * 70 * 70));
      return h;
    }, rim = (x, z) => {
      let e = Math.max(Math.abs(x), Math.abs(z));
      return sst(320, 400, e) * 70 * (0.6 + 0.4 * NZ.fbm(x / 80, z / 80));
    };
    for (let j = 0; j < N2; j++) for (let i = 0; i < N2; i++) {
      let x = x0 + i * cell, z = z0 + j * cell, h = natural(x, z);
      /* the pad and the strip are graded flat */
      let dPad = rectDist(x, z, D.pad.x - D.pad.w / 2 - 4, D.pad.z - 34, D.pad.x + D.pad.w / 2 + 4, D.pad.z + D.pad.d / 2 + 4), dStrip = rectDist(x, z, St.x0 - 20, St.z - St.half - 6, St.x1 + 30, St.z + St.half + 6), flat = Math.max(1 - sst(0, 40, dPad), 1 - sst(0, 36, dStrip));
      h = h * (1 - flat) + 0 * flat;
      /* the access lane between pad and strip */
      let dLane = rectDist(x, z, -30, 6, 10, St.z), fl2 = 1 - sst(0, 22, dLane);
      h = h * (1 - fl2);
      /* the burnout pad, graded flat */
      let fb = 1 - sst(0, 12, rectDist(x, z, BU.x - BU.w / 2, BU.z - BU.d / 2, BU.x + BU.w / 2, BU.z + BU.d / 2));
      h = h * (1 - fb);
      /* the mud pit: a soft basin */
      let mr = Math.hypot((x - M.x) / M.rx, (z - M.z) / M.rz);
      h -= M.depth * (1 - sst(0.55, 1.15, mr));
      H[j * N2 + i] = h + rim(x, z);
    }
    let hIdx = (x, z) => [Math.max(0, Math.min(N2 - 1, Math.round((x - x0) / cell))), Math.max(0, Math.min(N2 - 1, Math.round((z - z0) / cell)))];
    /* ---------- carve the trails: smooth the ground along each path ---------- */
    let carve = (path, halfW, blend, smoothS, cut = 0, maxG = 0) => {
      let prof = new Float64Array(path.N);
      for (let i = 0; i < path.N; i++) {
        let [ix, iz] = hIdx(path.X[i], path.Z[i]);
        prof[i] = H[iz * N2 + ix];
      }
      for (let pass = 0; pass < 3; pass++) {
        let o = new Float64Array(path.N);
        for (let i = 0; i < path.N; i++) {
          let s = 0, c = 0;
          for (let k = -smoothS; k <= smoothS; k++) {
            let q = path.closed ? (i + k + path.N) % path.N : Math.max(0, Math.min(path.N - 1, i + k));
            s += prof[q], c++;
          }
          o[i] = s / c;
        }
        prof = o;
      }
      if (maxG > 0) {
        /* cut the grade down: never climb or drop faster than maxG per metre */
        for (let i = 1; i < path.N; i++) prof[i] = Math.min(prof[i], prof[i - 1] + maxG * path.ds), prof[i] = Math.max(prof[i], prof[i - 1] - maxG * path.ds);
      }
      let r = Math.ceil((halfW + blend) / cell) + 1;
      for (let i = 0; i < path.N; i += 1) {
        let [ci, cj] = hIdx(path.X[i], path.Z[i]);
        for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
          let ii = ci + di, jj = cj + dj;
          if (ii < 0 || jj < 0 || ii >= N2 || jj >= N2) continue;
          let x = x0 + ii * cell, z = z0 + jj * cell, near = path.nearest(x, z, 1);
          if (!near || near.i !== i) continue;
          let w = 1 - sst(halfW, halfW + blend, near.d), k = jj * N2 + ii;
          H[k] = H[k] * (1 - w) + (prof[near.i] - cut * (1 - sst(0, halfW, near.d))) * w;
        }
      }
      return prof;
    };
    /* the mud track: a sunken channel with whoops on the straights and berms on the outside of the corners.
       Carved before the creek, so the creek cuts two fords through it */
    carve(mudT, 5, 7, 6, 0.3);
    {
      let curvAt = (s) => {
        let a = mudT.dir(s - 5), b = mudT.dir(s + 5);
        return (a[0] * b[1] - a[1] * b[0]) / 10;
      }, r = Math.ceil(11 / cell) + 1, done = new Uint8Array(N2 * N2);
      for (let i = 0; i < mudT.N; i += 2) {
        let [ci, cj] = hIdx(mudT.X[i], mudT.Z[i]);
        for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
          let ii = ci + di, jj = cj + dj;
          if (ii < 0 || jj < 0 || ii >= N2 || jj >= N2 || done[jj * N2 + ii]) continue;
          let x = x0 + ii * cell, z = z0 + jj * cell, nr = mudT.nearest(x, z, 1);
          if (!nr || nr.d > 10.5) continue;
          done[jj * N2 + ii] = 1;
          let c = mudT.at(nr.s), d = mudT.dir(nr.s), side = (x - c[0]) * -d[1] + (z - c[1]) * d[0], cv = curvAt(nr.s), out = -side * Math.sign(cv || 1), bh = Math.min(1, Math.abs(cv) * 55) * 0.95, k = jj * N2 + ii;
          H[k] += bh * sst(0, 6, out) * (1 - sst(7.5, 10.5, out));
          let whoop = 0.26 * (1 - sst(6e-3, 0.014, Math.abs(cv))) * (1 - sst(4.5, 6, Math.abs(side)));
          H[k] += whoop * (0.5 - 0.5 * Math.cos(nr.s / 7 * Math.PI * 2));
          let wal = sst(0.4, 0.44, nr.s / mudT.len) * (1 - sst(0.5, 0.54, nr.s / mudT.len));
          H[k] -= 0.35 * wal * (1 - sst(3, 5.5, Math.abs(side)));
        }
      }
    }
    carve(creek, 3.5, 5, 6, 1.5);
    /* ease the mud track's fords: the banks come down to the water at no more than a 1-in-4 */
    {
      let r = Math.ceil(16 / cell) + 1;
      for (let i = 0; i < mudT.N; i += 2) {
        let cn = creek.nearest(mudT.X[i], mudT.Z[i], 1);
        if (!cn || cn.d > 14) continue;
        let [ci, cj] = hIdx(mudT.X[i], mudT.Z[i]);
        for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
          let ii = ci + di, jj = cj + dj;
          if (ii < 0 || jj < 0 || ii >= N2 || jj >= N2) continue;
          let x = x0 + ii * cell, z = z0 + jj * cell, mn = mudT.nearest(x, z, 1), cc = creek.nearest(x, z, 1);
          if (!mn || !cc || mn.d > 7.5) continue;
          let [bi, bj] = hIdx(creek.X[cc.i], creek.Z[cc.i]), bed = H[bj * N2 + bi], k = jj * N2 + ii, lim = bed + 0.25 * Math.max(0, cc.d - 1.5), w = 1 - sst(5, 7.5, mn.d);
          H[k] > lim && (H[k] = H[k] * (1 - w) + lim * w);
        }
      }
    }
    let loopProf = carve(loop, 3.2, 6, 5), climbProf = carve(climb, 4, 8, 4, 0, 0.5);
    /* a couple of kickers on the loop for the brave */
    let kick = [], kicker = (path, s, h, L) => {
      let c = path.at(s), d = path.dir(s);
      kick.push({ x: c[0], z: c[1], dx: d[0], dz: d[1], h, L });
    };
    kicker(loop, 470, 1.4, 9), kicker(loop, 900, 1.1, 8);
    for (let K of kick) {
      /* raise the ground into a ramp that ends in a lip */
      let r = Math.ceil(K.L / cell) + 3, [ci, cj] = hIdx(K.x, K.z);
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        let ii = ci + di, jj = cj + dj, x = x0 + ii * cell, z = z0 + jj * cell, u = (x - K.x) * K.dx + (z - K.z) * K.dz, v = -(x - K.x) * K.dz + (z - K.z) * K.dx;
        if (Math.abs(v) > 4.5 || u < -K.L || u > 0.8) continue;
        let t = (u + K.L) / K.L, rise = K.h * Math.pow(Math.max(0, Math.min(1, t)), 1.6) * (1 - sst(3.2, 4.5, Math.abs(v))) * (u > 0 ? Math.max(0, 1 - u / 0.8) : 1);
        H[jj * N2 + ii] += rise;
      }
    }
    /* ---------- vertex normals and the surface map ---------- */
    let hAt = (i, j) => H[Math.max(0, Math.min(N2 - 1, j)) * N2 + Math.max(0, Math.min(N2 - 1, i))], NRM = new Float32Array(N2 * N2 * 3);
    for (let j = 0; j < N2; j++) for (let i = 0; i < N2; i++) {
      let nx = hAt(i - 1, j) - hAt(i + 1, j), nz = hAt(i, j - 1) - hAt(i, j + 1), ny = 2 * cell, l = Math.hypot(nx, ny, nz), k = (j * N2 + i) * 3;
      NRM[k] = nx / l, NRM[k + 1] = ny / l, NRM[k + 2] = nz / l;
    }
    let creekLevel = new Float64Array(creek.N);
    for (let i = 0; i < creek.N; i++) {
      let [ix, iz] = hIdx(creek.X[i], creek.Z[i]);
      creekLevel[i] = H[iz * N2 + ix] + 0.55;
    }
    for (let j = 0; j < N2; j++) for (let i = 0; i < N2; i++) {
      let x = x0 + i * cell, z = z0 + j * cell, k = j * N2 + i, ny = NRM[k * 3 + 1], slope = Math.sqrt(Math.max(0, 1 - ny * ny)) / Math.max(ny, 0.05), n1 = NZ.fbm(x / 21 + 5, z / 21), n2 = NZ.fbm(x / 7, z / 7 + 3);
      let grass = sst(0.32, 0.6, n1 + 0.18), rock = sst(0.6, 1.05, slope + (n2 - 0.5) * 0.35), mud = 0, ao = 1, code = SF.grass;
      /* worn dirt around the pad, the strip and the pit */
      let dPad = rectDist(x, z, -D.pad.w / 2, -D.pad.d / 2 - 18, D.pad.w / 2, D.pad.d / 2), dStrip = rectDist(x, z, St.x0 - 6, St.z - St.half, St.x1 + 10, St.z + St.half);
      grass *= sst(4, 16, dPad) * sst(2, 10, dStrip) * sst(2, 10, rectDist(x, z, -30, 6, 10, St.z));
      let mr = Math.hypot((x - M.x) / M.rx, (z - M.z) / M.rz);
      mud = 1 - sst(0.75, 1.05, mr + (n2 - 0.5) * 0.25), grass *= sst(0.9, 1.4, mr);
      let cn = creek.nearest(x, z, 1);
      cn && cn.d < 9 && (grass *= sst(3, 9, cn.d), rock = Math.max(rock * 0.6, (1 - sst(1, 6, cn.d)) * 0.55));
      /* AO: a little darker in the hollows */
      let curv = (hAt(i - 1, j) + hAt(i + 1, j) + hAt(i, j - 1) + hAt(i, j + 1)) / 4 - H[k];
      ao = Math.max(0.55, Math.min(1, 1 - curv * 0.35));
      grass = Math.max(0, grass - rock * 0.8);
      code = mud > 0.5 ? SF.mud : rock > 0.55 ? SF.rock : grass > 0.5 ? SF.grass : SF.dirt;
      dStrip <= 0.5 && (code = SF.strip);
      dPad <= 0 && Math.abs(x) < D.pad.w / 2 && z > -D.pad.d / 2 && (code = SF.concrete);
      /* the burnout pad: bare dirt */
      let dB = rectDist(x, z, BU.x - BU.w / 2, BU.z - BU.d / 2, BU.x + BU.w / 2, BU.z + BU.d / 2);
      dB < 6 && (grass *= sst(1, 6, dB), rock *= sst(1, 6, dB)), dB <= 0 && (code = SF.dirt, mud = 0);
      /* the mud track */
      let mt = mudT.nearest(x, z, 1);
      mt && mt.d < 9 && (grass *= sst(4.5, 9, mt.d), rock *= sst(4, 8, mt.d), mud = Math.max(mud, 1 - sst(3.8, 5.6, mt.d + (n2 - 0.5) * 1.2)), mt.d < 4.8 && (code = SF.mud));
      let tn = loop.nearest(x, z, 1), cl = climb.nearest(x, z, 1);
      (tn && tn.d < 2.6 || cl && cl.d < 2.8) && code !== SF.mud && (code = SF.trail);
      let td = Math.min(tn ? tn.d : 99, cl ? cl.d : 99);
      td < 7 && (W[k * 4] = Math.max(grass, 1 - sst(3, 7, td)), W[k * 4 + 1] = rock * sst(3, 7, td), grass = W[k * 4]);
      cn && cn.d < 2.6 && H[k] < creekLevel[cn.i] - 0.05 && (code = SF.water);
      td < 7 ? (W[k * 4 + 2] = mud, W[k * 4 + 3] = ao, SC[k] = code) : (W[k * 4] = grass, W[k * 4 + 1] = rock, W[k * 4 + 2] = mud, W[k * 4 + 3] = ao, SC[k] = code);
    }
    /* ---------- exact height on the triangulated grid (what the renderer draws) ---------- */
    let heightAt = (x, z) => {
      let fx = (x - x0) / cell, fz = (z - z0) / cell, i = Math.floor(fx), j = Math.floor(fz);
      if (i < 0 || j < 0 || i >= N2 - 1 || j >= N2 - 1) return 80;
      fx -= i, fz -= j;
      let h00 = H[j * N2 + i], h10 = H[j * N2 + i + 1], h01 = H[(j + 1) * N2 + i], h11 = H[(j + 1) * N2 + i + 1];
      return fx > fz ? h00 + (h10 - h00) * fx + (h11 - h10) * fz : h00 + (h11 - h01) * fx + (h01 - h00) * fz;
    }, groundAt = (x, z) => {
      let fx = (x - x0) / cell, fz = (z - z0) / cell, i = Math.floor(fx), j = Math.floor(fz);
      if (i < 0 || j < 0 || i >= N2 - 1 || j >= N2 - 1) return { y: 80, n: [0, 1, 0], surf: "rock", code: SF.rock };
      fx -= i, fz -= j;
      let h00 = H[j * N2 + i], h10 = H[j * N2 + i + 1], h01 = H[(j + 1) * N2 + i], h11 = H[(j + 1) * N2 + i + 1], y, gx, gz;
      fx > fz ? (gx = (h10 - h00) / cell, gz = (h11 - h10) / cell, y = h00 + (h10 - h00) * fx + (h11 - h10) * fz) : (gx = (h11 - h01) / cell, gz = (h01 - h00) / cell, y = h00 + (h11 - h01) * fx + (h01 - h00) * fz);
      let l = Math.hypot(gx, 1, gz), code = SC[(j + (fz > 0.5 ? 1 : 0)) * N2 + i + (fx > 0.5 ? 1 : 0)];
      /* the creek has water over its bed */
      return { y, n: [-gx / l, 1 / l, -gz / l], surf: SURF[code], code };
    };
    /* ---------- the rock garden: its own half-metre heightfield laid over the ground ---------- */
    let PU = Math.round(RG.w / RG.cell) + 1, PV = Math.round(RG.d / RG.cell) + 1, PH = new Float32Array(PU * PV), PSC = new Uint8Array(PU * PV), PWt = new Float32Array(PU * PV * 4), PN = new Float32Array(PU * PV * 3), PFace = new Uint8Array(PU * PV), Rb = rng(99), boulders = [];
    for (let k = 0; k < 40; k++) {
      let u = 5 + Rb() * (RG.w - 10), v = 4 + Rb() * (RG.d - 8);
      let onRoute = Math.abs(v - 22) < 3.2, h = 0.3 + Rb() * 0.6, r = 0.5 + Rb() * 0.85;
      onRoute ? u > 8 && u < 50 && boulders.push([u, v, r * 0.85, Math.min(h, 0.36)]) : boulders.push([u, v, r, h]);
    }
    let relief = (u, v) => {
      let e = sst(0, 6, Math.min(u, v, RG.w - u, RG.d - v)), w1 = NZ.fbm(u / 7 + 40, v / 7) - 0.5;
      /* a mound in ledges about half a metre tall, the ledge lines wandering */
      let m = 3.1 * Math.exp(-((u - 31) ** 2 / (2 * 12 * 12) + (v - 22) ** 2 / (2 * 9.5 * 9.5))) + w1 * 0.35, st = 0.45, q = Math.max(0, m) / st, fl = Math.floor(q), terr = (fl + sst(0.7, 0.96, q - fl)) * st;
      /* a staircase in the north-west corner, an off-camber slab in the south-west, two ridges with a notch between them in the north-east */
      let stairs = u > 6 && u < 19 && v > 4 && v < 14 ? (Math.min(3, Math.floor((u - 6) / 3.4)) + sst(0.82, 1, (u - 6) / 3.4 % 1)) * 0.4 * sst(4, 5.5, v) * sst(14, 12.5, v) : 0;
      let slab = sst(7, 9, u) * sst(21, 19, u) * sst(29, 31, v) * sst(41, 39, v) * (v - 29) * 0.15;
      let ridge = u > 38 && u < 54 ? Math.max(1.25 * sst(1.6, 0.4, Math.abs(v - 7)), 1.25 * sst(1.6, 0.4, Math.abs(v - 15))) * sst(38, 40, u) * sst(54, 52, u) * (0.85 + 0.3 * w1) : 0;
      let b = 0, isB = 0;
      for (let [bu, bv, br, bh] of boulders) {
        let d2 = ((u - bu) ** 2 + (v - bv) ** 2) / (br * br);
        if (d2 < 1) {
          let h = bh * Math.pow(1 - d2, 0.55);
          h > b && (b = h, isB = 1);
        }
      }
      let r0 = Math.max(terr, stairs, slab, ridge), r = r0 + b * 0.9;
      return [r * e, e, isB, r0 * e];
    };
    for (let j = 0; j < PV; j++) for (let i = 0; i < PU; i++) {
      let u = i * RG.cell, v = j * RG.cell, x = RG.x0 + u, z = RG.z0 + v, [rl, e] = relief(u, v);
      PH[j * PU + i] = heightAt(x, z) + rl;
    }
    let pAt = (i, j) => PH[Math.max(0, Math.min(PV - 1, j)) * PU + Math.max(0, Math.min(PU - 1, i))];
    for (let j = 0; j < PV; j++) for (let i = 0; i < PU; i++) {
      let k = j * PU + i, nx = pAt(i - 1, j) - pAt(i + 1, j), nz = pAt(i, j - 1) - pAt(i, j + 1), ny = 2 * RG.cell, l = Math.hypot(nx, ny, nz), u = i * RG.cell, v = j * RG.cell, x = RG.x0 + u, z = RG.z0 + v;
      PN[k * 3] = nx / l, PN[k * 3 + 1] = ny / l, PN[k * 3 + 2] = nz / l;
      let [rl, e, isB] = relief(u, v), slope = Math.sqrt(Math.max(0, 1 - (ny / l) ** 2)) / Math.max(ny / l, 0.05), bi = Math.max(0, Math.min(N2 - 1, Math.round((x - x0) / cell))), bj = Math.max(0, Math.min(N2 - 1, Math.round((z - z0) / cell))), bk = bj * N2 + bi;
      let rock = Math.min(1, slope * 3 + (rl > 0.1 ? 0.78 : 0.3) + isB + (NZ.fbm(x / 3, z / 3) - 0.5) * 0.35), curv = (pAt(i - 1, j) + pAt(i + 1, j) + pAt(i, j - 1) + pAt(i, j + 1)) / 4 - PH[k];
      PWt[k * 4] = W[bk * 4] * (1 - e), PWt[k * 4 + 1] = W[bk * 4 + 1] * (1 - e) + rock * e, PWt[k * 4 + 2] = 0, PWt[k * 4 + 3] = Math.max(0.42, Math.min(1, 1 - curv * 1.6));
      PSC[k] = e < 0.3 ? SC[bk] : rl > 0.08 || slope > 0.3 ? SF.rock : SF.dirt, PFace[k] = e > 0.5 && (slope > 0.42 || isB && rl > 0.15) ? 1 : 0;
    }
    /* tuck the coarse ground just under the patch, so the two never fight */
    for (let j = 0; j < N2; j++) for (let i = 0; i < N2; i++) {
      let x = x0 + i * cell, z = z0 + j * cell;
      x > RG.x0 + 0.5 && x < RG.x0 + RG.w - 0.5 && z > RG.z0 + 0.5 && z < RG.z0 + RG.d - 0.5 && (H[j * N2 + i] -= 0.15);
    }
    let inPatch = (x, z) => x >= RG.x0 && z >= RG.z0 && x < RG.x0 + RG.w && z < RG.z0 + RG.d, baseHeight = heightAt, baseGround = groundAt, patchG = (x, z) => {
      let fx = (x - RG.x0) / RG.cell, fz = (z - RG.z0) / RG.cell, i = Math.min(PU - 2, Math.floor(fx)), j = Math.min(PV - 2, Math.floor(fz)), c = RG.cell;
      fx -= i, fz -= j;
      let h00 = PH[j * PU + i], h10 = PH[j * PU + i + 1], h01 = PH[(j + 1) * PU + i], h11 = PH[(j + 1) * PU + i + 1], y, gx, gz;
      fx > fz ? (gx = (h10 - h00) / c, gz = (h11 - h10) / c, y = h00 + (h10 - h00) * fx + (h11 - h10) * fz) : (gx = (h11 - h01) / c, gz = (h01 - h00) / c, y = h00 + (h11 - h01) * fx + (h01 - h00) * fz);
      let l = Math.hypot(gx, 1, gz), code = PSC[(j + (fz > 0.5 ? 1 : 0)) * PU + i + (fx > 0.5 ? 1 : 0)];
      return { y, n: [-gx / l, 1 / l, -gz / l], surf: SURF[code], code };
    };
    heightAt = (x, z) => inPatch(x, z) ? patchG(x, z).y : baseHeight(x, z), groundAt = (x, z) => inPatch(x, z) ? patchG(x, z) : baseGround(x, z);
    /* ---------- geometry ---------- */
    let C2 = new Chunked(64), lights = [], colliders = [], R2 = rng(4242);
    C2.mat(16);
    let TS = 64 / cell;
    for (let tj = 0; tj < (N2 - 1) / TS; tj++) for (let ti = 0; ti < (N2 - 1) / TS; ti++) {
      let B = C2.at(x0 + ti * 64 + 32, z0 + tj * 64 + 32), idx = [];
      for (let j = 0; j <= TS; j++) {
        let row = [];
        for (let i = 0; i <= TS; i++) {
          let gi = Math.min(N2 - 1, ti * TS + i), gj = Math.min(N2 - 1, tj * TS + j), k = gj * N2 + gi, x = x0 + gi * cell, z = z0 + gj * cell;
          B.col(W[k * 4] * 255, W[k * 4 + 1] * 255, W[k * 4 + 2] * 255, 255), row.push(B.v([x, H[k], z], [NRM[k * 3], NRM[k * 3 + 1], NRM[k * 3 + 2]], x, z, W[k * 4 + 3]));
        }
        idx.push(row);
      }
      for (let j = 0; j < TS; j++) for (let i = 0; i < TS; i++) B.idx.push(idx[j][i], idx[j + 1][i + 1], idx[j][i + 1], idx[j][i], idx[j + 1][i], idx[j + 1][i + 1]);
    }
    {
      /* the rock garden's own surface */
      /* every point twice: as ground (terrain material) and as bare rock (the boulder material); each quad
         takes the rock version where it's a ledge face or a boulder, the ground version elsewhere */
      C2.mat(16);
      let B = C2.at(RG.x0 + RG.w / 2, RG.z0 + RG.d / 2), idx = [], idr = [];
      for (let j = 0; j < PV; j++) {
        let row = [], rr = [];
        for (let i = 0; i < PU; i++) {
          let k = j * PU + i, x = RG.x0 + i * RG.cell, z = RG.z0 + j * RG.cell, n = [PN[k * 3], PN[k * 3 + 1], PN[k * 3 + 2]];
          B.m = [16, 0, 0, 0], B.col(PWt[k * 4] * 255, PWt[k * 4 + 1] * 255, 0, 255), row.push(B.v([x, PH[k], z], n, x, z, PWt[k * 4 + 3]));
          B.m = [21, 0, 0, 0], B.col(255, 255, 255, 255), rr.push(B.v([x, PH[k], z], n, x * 0.8 + z * 0.55, PH[k] * 1.6 + (x - z) * 0.25, PWt[k * 4 + 3]));
        }
        idx.push(row), idr.push(rr);
      }
      for (let j = 0; j < PV - 1; j++) for (let i = 0; i < PU - 1; i++) {
        let f = PFace[j * PU + i] + PFace[j * PU + i + 1] + PFace[(j + 1) * PU + i] + PFace[(j + 1) * PU + i + 1], I = f >= 2 ? idr : idx;
        B.idx.push(I[j][i], I[j + 1][i + 1], I[j][i + 1], I[j][i], I[j + 1][i], I[j + 1][i + 1]);
      }
      /* the boulders themselves, grey rock sitting on their bumps */
      C2.mat(21).col(255, 255, 255, 255), B.m = [21, 0, 0, 0], B.c = [255, 255, 255, 255];
      for (let [bu, bv, br, bh] of boulders) {
        if (bh < 0.16) continue;
        let x = RG.x0 + bu, z = RG.z0 + bv, y = baseHeight(x, z) + relief(bu, bv)[3] - 0.05, seg = 10, rings = 6, ix = [], rot = bu * 1.7;
        for (let j = 0; j <= rings; j++) {
          let ph = j / rings * Math.PI * 0.62, row = [];
          for (let i = 0; i <= seg; i++) {
            let th = i / seg * Math.PI * 2 + rot, wob = 1 + Math.sin(th * 3 + j * 1.7 + bu) * 0.1 + Math.sin(th * 5 - j * 2.3 + bv) * 0.07, n = [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)];
            row.push(B.v([x + n[0] * br * 0.95 * wob, y + n[1] * (bh * 0.92 + 0.05) * wob, z + n[2] * br * 0.88 * wob], n, x + n[0] * br, y + n[1] * br));
          }
          ix.push(row);
        }
        for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) B.quad(ix[j][i], ix[j][i + 1], ix[j + 1][i + 1], ix[j + 1][i]);
      }
    }
    /* a ribbon draped over the ground along a path: uv = (distance along, offset across) */
    let ribbon = (path, half, variant, s0 = 0, s1 = path.len, step = 1.5, lift = 0.035) => {
      C2.mat(17, variant).col(255, 255, 255, 255);
      let prev = null;
      for (let s = s0; s <= s1 + 1e-6; s += step) {
        let ss = Math.min(s, s1), c = path.at(ss), d = path.dir(ss), nx = -d[1], nz = d[0], row = [];
        for (let k = -4; k <= 4; k++) {
          let off = k / 4 * half, x = c[0] + nx * off, z = c[1] + nz * off, g = groundAt(x, z);
          row.push([x, g.y + lift, z, off, g.n]);
        }
        if (prev) {
          let B = C2.at(c[0], c[1]), a = prev.map((p) => B.v([p[0], p[1], p[2]], p[4], prev.s, p[3])), b = row.map((p) => B.v([p[0], p[1], p[2]], p[4], ss, p[3]));
          for (let k = 0; k < 8; k++) B.quad(a[k], a[k + 1], b[k + 1], b[k]);
        }
        prev = row, prev.s = ss;
      }
    };
    ribbon(loop, 3.4, 1), ribbon(climb, 3.4, 1), ribbon(mudT, 5, 2, 0, mudT.len, 1.2, 0.03);
    /* the drag strip: a straight graded ribbon, uv = (metres past the start line, metres from the centre) */
    {
      C2.mat(17, 0).col(255, 255, 255, 255);
      for (let x = St.x0; x < St.x1; x += 8) {
        let B = C2.at(x + 4, St.z), q = [];
        for (let k = 0; k <= 6; k++) {
          let zz = St.z - St.half + k / 6 * St.half * 2;
          q.push([B.v([x, 0.03, zz], [0, 1, 0], x - St.start, zz - St.z), B.v([x + 8, 0.03, zz], [0, 1, 0], x + 8 - St.start, zz - St.z)]);
        }
        for (let k = 0; k < 6; k++) B.quad(q[k][0], q[k + 1][0], q[k + 1][1], q[k][1]);
      }
    }
    /* the creek: a strip of water over the carved bed */
    {
      C2.mat(24).col(255, 255, 255, 255);
      let prev = null;
      for (let s = 0; s <= creek.len; s += 3) {
        let c = creek.at(s), d = creek.dir(s), nx = -d[1], nz = d[0], lvl = creekLevel[Math.min(creek.N - 1, Math.round(s / creek.ds))], row = [];
        for (let k = -1; k <= 1; k++) row.push([c[0] + nx * k * 5.5, lvl, c[1] + nz * k * 5.5]);
        if (prev) {
          let B = C2.at(c[0], c[1]), a = prev.map((p) => B.v(p, [0, 1, 0], p[0], p[2])), b = row.map((p) => B.v(p, [0, 1, 0], p[0], p[2]));
          for (let k = 0; k < 2; k++) B.quad(a[k], b[k], b[k + 1], a[k + 1]);
        }
        prev = row;
      }
    }
    /* ---------- the pad and the shop ---------- */
    let qN = (B, p0, p1, p2, p3, uv, n) => dot(cross(sub(p1, p0), sub(p3, p0)), n) < 0 ? B.quadP(p3, p2, p1, p0, uv && [uv[3], uv[2], uv[1], uv[0]], n) : B.quadP(p0, p1, p2, p3, uv, n);
    let box = (c, h, mat, col, sub = 0, uvMode = 0) => {
      C2.mat(mat, sub).col(...col), C2.at(c[0], c[2]).box(c, [1, 0, 0], [0, 1, 0], [0, 0, 1], h, 0);
    }, collideBox = (x0b, z0b, x1b, z1b, top) => colliders.push({ t: "box", x0: x0b, z0: z0b, x1: x1b, z1: z1b, top }), collideCirc = (x, z, r, top) => colliders.push({ t: "c", x, z, r, top });
    box([D.pad.x, -0.05, D.pad.z - 5], [D.pad.w / 2, 0.06, D.pad.d / 2 + 5], 4, [255, 255, 255, 255], 0);
    let SH = D.shop, wallT = 0.12, walls = [[SH.x0, SH.z0, SH.x1, SH.z0], [SH.x0, SH.z0, SH.x0, SH.z1], [SH.x1, SH.z0, SH.x1, SH.z1]], metal = (x0m, z0m, x1m, z1m, y0, y1, col, variant = 0) => {
      let B = C2.at((x0m + x1m) / 2, (z0m + z1m) / 2);
      C2.mat(19, variant).col(...col);
      let L = Math.hypot(x1m - x0m, z1m - z0m), nx = (z1m - z0m) / L, nz = -(x1m - x0m) / L;
      B.m = [19, variant, 0, 0], B.c = col.concat(255).slice(0, 4);
      for (let side of [1, -1]) {
        let o = side * wallT, n = [nx * side, 0, nz * side], a = [x0m + nx * o, y0, z0m + nz * o], b = [x1m + nx * o, y0, z1m + nz * o], c = [x1m + nx * o, y1, z1m + nz * o], d = [x0m + nx * o, y1, z0m + nz * o];
        qN(B, a, b, c, d, [[0, y0], [L, y0], [L, y1], [0, y1]], n);
      }
    }, shopCol = [148, 156, 150];
    metal(SH.x0, SH.z0, SH.x1, SH.z0, 0, SH.wall, shopCol), metal(SH.x0, SH.z1, SH.x0, SH.z0, 0, SH.wall, shopCol), metal(SH.x1, SH.z0, SH.x1, SH.z1, 0, SH.wall, shopCol);
    metal(SH.x0, SH.z1, SH.door[0], SH.z1, 0, SH.wall, shopCol), metal(SH.door[1], SH.z1, SH.x1, SH.z1, 0, SH.wall, shopCol), metal(SH.door[0], SH.z1, SH.door[1], SH.z1, SH.door[2], SH.wall, shopCol);
    collideBox(SH.x0 - 0.3, SH.z0 - 0.3, SH.x1 + 0.3, SH.z0 + 0.3, SH.wall), collideBox(SH.x0 - 0.3, SH.z0, SH.x0 + 0.3, SH.z1, SH.wall), collideBox(SH.x1 - 0.3, SH.z0, SH.x1 + 0.3, SH.z1, SH.wall);
    collideBox(SH.x0, SH.z1 - 0.3, SH.door[0], SH.z1 + 0.3, SH.wall), collideBox(SH.door[1], SH.z1 - 0.3, SH.x1, SH.z1 + 0.3, SH.wall);
    {
      /* gable ends and the roof */
      let B = C2.at(0, (SH.z0 + SH.z1) / 2), cx = (SH.x0 + SH.x1) / 2, rise = SH.peak - SH.wall;
      C2.mat(19, 0).col(...shopCol);
      B.m = [19, 0, 0, 0], B.c = shopCol.concat(255);
      for (let [x, s] of [[SH.x0, -1], [SH.x1, 1]]) for (let side of [1, -1]) {
        let xo = x + side * s * wallT, a = B.v([xo, SH.wall, SH.z0], [s * side, 0, 0], SH.z0, SH.wall), b = B.v([xo, SH.wall, SH.z1], [s * side, 0, 0], SH.z1, SH.wall), c = B.v([xo, SH.peak, (SH.z0 + SH.z1) / 2], [s * side, 0, 0], (SH.z0 + SH.z1) / 2, SH.peak);
        let pa = [xo, SH.wall, SH.z0], pb = [xo, SH.wall, SH.z1], pc = [xo, SH.peak, (SH.z0 + SH.z1) / 2];
        dot(cross(sub(pb, pa), sub(pc, pa)), [s * side, 0, 0]) > 0 ? B.tri(a, b, c) : B.tri(a, c, b);
      }
      B.m = [19, 1, 0, 0], B.c = [120, 62, 48, 255];
      let zc = (SH.z0 + SH.z1) / 2, ov = 0.6;
      for (let [za, zb] of [[SH.z0 - ov, zc], [SH.z1 + ov, zc]]) {
        let ya = SH.wall - ov * rise / ((SH.z1 - SH.z0) / 2), n = norm([0, (SH.z1 - SH.z0) / 2, za < zc ? -rise : rise]);
        for (let side of [0, 1]) {
          let off = side ? -0.05 : 0, nn = side ? neg(n) : n, p = (x, z, y) => [x, y + off, z], q0 = p(SH.x0 - ov, za, ya), q1 = p(SH.x1 + ov, za, ya), q2 = p(SH.x1 + ov, zb, SH.peak), q3 = p(SH.x0 - ov, zb, SH.peak), L = Math.abs(zb - za) * 1.05;
          qN(B, q0, q1, q2, q3, [[0, 0], [SH.x1 - SH.x0, 0], [SH.x1 - SH.x0, L], [0, L]], nn);
        }
      }
      /* the floor inside, a workbench and a tool chest in the shadows */
      box([0, -0.03, (SH.z0 + SH.z1) / 2], [SH.x1 - 0.2, 0.05, (SH.z1 - SH.z0) / 2 - 0.2], 4, [200, 200, 200, 255], 0);
      box([-9, 0.5, SH.z0 + 1], [3, 0.5, 0.6], 18, [170, 140, 110, 255], 0), box([9, 0.55, SH.z0 + 0.8], [0.8, 0.55, 0.4], 8, [180, 24, 20, 255], 0);
      box([4, 0.06, -23], [1.6, 0.06, 2.8], 8, [40, 40, 44, 255], 0);
    }
    /* yard lights on the shop */
    for (let x of [-9, 9]) lights.push({ type: 1, pos: [x, 5.1, SH.z1 + 0.5], r: 34, col: [420, 360, 260], dir: norm([0, -0.8, 0.6]), cosO: Math.cos(1.15), cosI: Math.cos(0.6), axis: [0, 0, 0], flick: 0, src: 0.15 }), box([x, 5.05, SH.z1 + 0.3], [0.3, 0.08, 0.2], 7, [255, 240, 200, 255], 0);
    /* ---------- the drag strip furniture ---------- */
    let strip = { x0: St.x0, start: St.start, x1: St.x1, z: St.z, lanes: St.lanes, eighth: St.eighth, half: St.half };
    {
      /* the christmas tree between the lanes, just behind the start line */
      let tx = St.start - 1.6, tz = St.z;
      box([tx, 1.3, tz], [0.07, 1.3, 0.07], 8, [40, 40, 44, 255], 0), box([tx, 2.75, tz], [0.12, 0.85, 0.32], 8, [16, 16, 18, 255], 0);
      C2.mat(23);
      let B = C2.at(tx, tz);
      for (let lane = 0; lane < 2; lane++) for (let k = 0; k < 7; k++) {
        let y = 3.45 - k * 0.24, z = tz + (lane ? 0.17 : -0.17);
        B.m = [23, k, lane, 0], B.sphere([tx - 0.13, y, z], 0.07, 8, 5);
      }
      collideCirc(tx, tz, 0.25, 4);
      /* timing boards at the finish, start line poles */
      for (let lane of [0, 1]) {
        let z = lane ? St.z + St.half + 2.5 : St.z - St.half - 2.5;
        box([St.start + St.eighth, 2.2, z], [0.12, 2.2, 0.12], 8, [50, 50, 54, 255], 0), box([St.start + St.eighth, 4.6, z], [0.2, 0.7, 1.6], 8, [18, 18, 20, 255], 0);
        box([St.start - 0.5, 0.6, z], [0.1, 0.6, 0.1], 8, [230, 230, 230, 255], 0);
        collideCirc(St.start + St.eighth, z, 0.3, 4.4);
      }
      /* fences down both sides, light poles, the grandstand */
      for (let side of [-1, 1]) {
        let z = St.z + side * (St.half + 4);
        for (let x = St.x0 + 4; x < St.x1 - 4; x += 3) {
          box([x, 0.6, z], [0.07, 0.6, 0.07], 18, [140, 112, 86, 255], 0);
          box([x + 1.5, 0.95, z], [1.5, 0.06, 0.03], 18, [168, 134, 100, 255], 0), box([x + 1.5, 0.5, z], [1.5, 0.06, 0.03], 18, [168, 134, 100, 255], 0);
        }
        collideBox(St.x0 + 3, z - 0.2, St.x1 - 3, z + 0.2, 1.2);
        for (let x = St.x0 + 20; x < St.x1; x += 45) {
          let pz = z + side * 2;
          box([x, 6, pz], [0.12, 6, 0.12], 8, [70, 70, 74, 255], 0), box([x, 12.1, pz - side * 0.4], [0.5, 0.12, 0.25], 7, [255, 248, 230, 255], 0);
          lights.push({ type: 1, pos: [x, 12, pz - side * 0.5], r: 46, col: [1400, 1340, 1200], dir: norm([0, -1, -side * 0.55]), cosO: Math.cos(1.05), cosI: Math.cos(0.5), axis: [0, 0, 0], flick: 0, src: 0.3 });
          collideCirc(x, pz, 0.3, 12);
        }
      }
      for (let r = 0; r < 5; r++) box([90, 0.35 + r * 0.45, St.z + St.half + 9 + r * 0.8], [26, 0.07, 0.4], 18, [176, 150, 116, 255], 0), box([90, 0.18 + r * 0.45, St.z + St.half + 9.3 + r * 0.8], [26, 0.2 + r * 0.22, 0.05], 18, [120, 100, 80, 255], 0);
      collideBox(64, St.z + St.half + 8.5, 116, St.z + St.half + 13.5, 3);
      /* hay bales at the end of the shutdown area */
      for (let k = 0; k < 9; k++) {
        let z = St.z - 8 + k * 2, x = St.x1 + 6 + (k & 1) * 0.6;
        C2.mat(22).col(255, 255, 255, 255), C2.at(x, z).tube([x, 0.6, z - 0.75], [x, 0.6, z + 0.75], 0.6, 12, !0), collideCirc(x, z, 1, 1.2);
      }
    }
    /* ---------- trees, rocks and bales across the land ---------- */
    let clearOf = (x, z, r) => {
      if (rectDist(x, z, St.x0 - 10, St.z - St.half - 12, St.x1 + 15, St.z + St.half + 18) < r) return !1;
      if (rectDist(x, z, -24, -36, 24, 16) < r) return !1;
      if (rectDist(x, z, -32, 4, 12, St.z) < r) return !1;
      if (Math.hypot((x - M.x) / M.rx, (z - M.z) / M.rz) < 1.3) return !1;
      if (rectDist(x, z, BU.x - BU.w / 2 - 6, BU.z - BU.d / 2 - 6, BU.x + BU.w / 2 + 6, BU.z + BU.d / 2 + 6) < r) return !1;
      if (rectDist(x, z, RG.x0 - 16, RG.z0 - 4, RG.x0 + RG.w + 12, RG.z0 + RG.d + 4) < r) return !1;
      let mtn = mudT.nearest(x, z, 2);
      if (mtn && mtn.d < 11 + r) return !1;
      let a = loop.nearest(x, z, 2), b = climb.nearest(x, z, 2), c = creek.nearest(x, z, 2);
      return !(a && a.d < 6 + r || b && b.d < 6 + r || c && c.d < 4);
    }, tree = (x, z, kind, sc) => {
      let y = heightAt(x, z), trunkH = (kind ? 1.6 : 2.4) * sc, crownR = (kind ? 2.2 : 3.4) * sc, cy = y + trunkH + crownR * (kind ? 1.2 : 0.75), B = C2.at(x, z), lean = [(R2() - 0.5) * 0.4, 0, (R2() - 0.5) * 0.4];
      C2.mat(18, 1).col(110, 90, 72, 255);
      B.m = [18, 1, 0, 0], B.c = [110, 90, 72, 255], B.tube([x, y - 0.3, z], [x + lean[0], y + trunkH + crownR * 0.6, z + lean[2]], 0.18 * sc + 0.08, 7, !1, 0.1 * sc + 0.04);
      let tint = kind ? [52, 74, 46] : R2() < 0.5 ? [70, 96, 44] : [88, 104, 50], seed = R2() * 255 | 0, cards = kind ? 9 : 12;
      for (let k = 0; k < cards; k++) {
        let a = k / cards * Math.PI + R2() * 0.3, cr = crownR * (kind ? 1 - k / cards * 0.5 : 0.6 + R2() * 0.45), ctr = kind ? [x + lean[0], y + trunkH + k / cards * crownR * 2.4, z + lean[2]] : [x + lean[0] + (R2() - 0.5) * crownR * 0.8, cy + (R2() - 0.5) * crownR * 0.6, z + lean[2] + (R2() - 0.5) * crownR * 0.8], ax = [Math.cos(a), 0, Math.sin(a)], up = k % 3 === 2 && !kind ? [Math.sin(a) * 0.9, 0.4, -Math.cos(a) * 0.9] : [0, 1, 0], hw = cr, hh = kind ? cr * 0.55 : cr * 0.85;
        B.m = [20, kind, (seed + k * 37) & 255, 0], B.c = [tint[0] + (R2() - 0.5) * 20 | 0, tint[1] + (R2() - 0.5) * 20 | 0, tint[2] + (R2() - 0.5) * 14 | 0, 255];
        let corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => {
          let p = [ctr[0] + ax[0] * u * hw + up[0] * v * hh, ctr[1] + ax[1] * u * hw + up[1] * v * hh, ctr[2] + ax[2] * u * hw + up[2] * v * hh], n = norm([p[0] - x, (p[1] - (y + trunkH)) * 0.6 + 0.4 * crownR, p[2] - z]);
          return B.v(p, n, u, v);
        });
        B.quad(corners[0], corners[1], corners[2], corners[3]);
      }
      collideCirc(x, z, 0.35 * sc + 0.15, trunkH + crownR);
    };
    let nTrees = 0;
    for (let tries = 0; tries < 5200 && nTrees < 520; tries++) {
      let x = (R2() - 0.5) * 740, z = (R2() - 0.5) * 740, k = (Math.round((z - z0) / cell)) * N2 + Math.round((x - x0) / cell), g = W[k * 4], rk = W[k * 4 + 1], dens = NZ.fbm(x / 70 + 11, z / 70);
      if (dens < 0.42 + (g < 0.3 ? 0.15 : 0) || rk > 0.6 || SC[k] === SF.mud) continue;
      if (!clearOf(x, z, 4)) continue;
      tree(x, z, z < -120 && R2() < 0.45 ? 1 : 0, 0.75 + R2() * 0.6), nTrees++;
    }
    /* a few trees framing the pad */
    for (let [x, z, s] of [[-30, -6, 1.1], [26, -40, 1.25], [-34, -38, 0.9], [-28, 14, 1]]) tree(x, z, 0, s);
    /* boulders on the slopes and along the trail */
    let rock = (x, z, r) => {
      let y = heightAt(x, z), B = C2.at(x, z);
      C2.mat(21).col(255, 255, 255, 255), B.m = [21, 0, 0, 0], B.c = [255, 255, 255, 255];
      let seg = 9, rings = 6, ix = [], sq = 0.55 + R2() * 0.35, rot = R2() * 6.28;
      for (let j = 0; j <= rings; j++) {
        let ph = j / rings * Math.PI, row = [];
        for (let i = 0; i <= seg; i++) {
          let th = i / seg * Math.PI * 2 + rot, wob = 1 + (Math.sin(th * 3 + j * 1.7 + x) * 0.12 + Math.sin(th * 5 - j * 2.3 + z) * 0.08), n = [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)];
          row.push(B.v([x + n[0] * r * wob, y + r * 0.25 + n[1] * r * sq * wob, z + n[2] * r * wob * 0.85], n, x + n[0] * r, y + n[1] * r));
        }
        ix.push(row);
      }
      for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) B.quad(ix[j][i], ix[j][i + 1], ix[j + 1][i + 1], ix[j + 1][i]);
      r > 0.6 && collideCirc(x, z, r * 0.8, y + r * (0.25 + sq));
    };
    for (let tries = 0, n = 0; tries < 4e3 && n < 260; tries++) {
      let x = (R2() - 0.5) * 720, z = (R2() - 0.5) * 720, k = Math.round((z - z0) / cell) * N2 + Math.round((x - x0) / cell);
      if (W[k * 4 + 1] < 0.35 && R2() > 0.08) continue;
      if (!clearOf(x, z, 2)) continue;
      rock(x, z, 0.4 + R2() * (W[k * 4 + 1] > 0.5 ? 2.2 : 1)), n++;
    }
    /* rocks to crawl over on the climb, beside the trail on the loop */
    for (let s = 40; s < climb.len - 20; s += 14) {
      let c = climb.at(s), d = climb.dir(s), off = (R2() - 0.5) * 3.6;
      off = Math.sign(off || 1) * (4.3 + Math.abs(off) * 0.6), rock(c[0] - d[1] * off, c[1] + d[0] * off, 0.35 + R2() * 0.35);
    }
    /* ---------- gates on the trail (checkpoint arches) ---------- */
    let gates = [], gate = (path, s, tag) => {
      let c = path.at(s), d = path.dir(s), nx = -d[1], nz = d[0];
      for (let side of [-1, 1]) {
        let px = c[0] + nx * side * 5, pz = c[1] + nz * side * 5, y = heightAt(px, pz);
        box([px, y + 1.6, pz], [0.12, 1.6, 0.12], 18, [150, 120, 90, 255], 0);
        box([px, y + 3.3, pz], [0.4, 0.3, 0.06], 8, [255, 110, 26, 255], 0);
      }
      gates.push({ s, x: c[0], z: c[1], dx: d[0], dz: d[1], tag });
    };
    for (let s = 0; s < loop.len - 20; s += 70) gate(loop, s, "loop");
    gate(climb, 0, "climb"), gate(climb, climb.len - 4, "climb");
    gate(mudT, 4, "mud");
    let gateAt = (x, z, dx, dz, tag, half = 5, col = [255, 110, 26, 255]) => {
      for (let side of [-1, 1]) {
        let px = x - dz * side * half, pz = z + dx * side * half, y = heightAt(px, pz);
        box([px, y + 1.6, pz], [0.12, 1.6, 0.12], 18, [150, 120, 90, 255], 0), box([px, y + 3.3, pz], [0.4, 0.3, 0.06], 8, col, 0), collideCirc(px, pz, 0.2, y + 3.2);
      }
      gates.push({ s: 0, x, z, dx, dz, tag });
    };
    /* the rock garden: in at the west flags, over the top, out at the east flags */
    gateAt(RG.x0 + 2.5, RG.z0 + 22, 1, 0, "rock", 4.5), gateAt(RG.x0 + 31, RG.z0 + 22, 1, 0, "rock", 4, [255, 220, 60, 255]), gateAt(RG.x0 + RG.w - 2.5, RG.z0 + 22, 1, 0, "rock", 4.5);
    /* the burnout pad: tyre walls on three sides, flags at the open end */
    {
      let x0b = BU.x - BU.w / 2, x1b = BU.x + BU.w / 2, z0b = BU.z - BU.d / 2, z1b = BU.z + BU.d / 2, stack = (x, z) => {
        let y = heightAt(x, z);
        C2.mat(8).col(22, 22, 24, 255), C2.at(x, z).tube([x, y - 0.05, z], [x, y + 0.78, z], 0.36, 12, !0);
        C2.mat(8).col(48, 48, 50, 255), C2.at(x, z).tube([x, y + 0.255, z], [x, y + 0.275, z], 0.365, 12, !1), C2.at(x, z).tube([x, y + 0.515, z], [x, y + 0.535, z], 0.365, 12, !1);
        collideCirc(x, z, 0.42, y + 0.8);
      };
      /* open to the shop on the west, tyres on the other three sides */
      for (let x = x0b - 0.1; x <= x1b + 1.5; x += 0.78) stack(x, z0b - 1.4), stack(x, z1b + 1.4);
      for (let z = z0b - 0.6; z <= z1b + 0.7; z += 0.78) stack(x1b + 1.4, z);
      for (let z of [z0b - 1.4, z1b + 1.4]) {
        let x = x0b - 1.2, y = heightAt(x, z);
        box([x, y + 1.6, z], [0.07, 1.6, 0.07], 18, [150, 120, 90, 255], 0), box([x - 0.32, y + 2.9, z], [0.32, 0.22, 0.02], 8, [255, 110, 26, 255], 0), collideCirc(x, z, 0.15, y + 3);
      }
    }
    let geo = C2.pack();
    return {
      geo, lights, steam: [], info: { xw: [] }, gridP: { x0: x0, z0: z0, size: D.size, cell: 8 },
      N: N2, cell, x0, z0, H, SC, heightAt, groundAt, strip, loop, climb, creek, creekLevel, gates, mud: M, hill: HL, kick, colliders: gridColliders(colliders), loopProf, climbProf, D,
      burn: BU, mudTrack: mudT, rocks: RG
    };
  }
  /* a bucket grid over the colliders so the hull only checks what is near */
  function gridColliders(list) {
    let B = 16, map = new Map(), put = (k, c) => {
      map.has(k) || map.set(k, []), map.get(k).push(c);
    };
    for (let c of list) {
      let ax = c.t === "c" ? c.x - c.r : c.x0, az = c.t === "c" ? c.z - c.r : c.z0, bx = c.t === "c" ? c.x + c.r : c.x1, bz = c.t === "c" ? c.z + c.r : c.z1;
      for (let i = Math.floor(ax / B); i <= Math.floor(bx / B); i++) for (let j = Math.floor(az / B); j <= Math.floor(bz / B); j++) put(i + "," + j, c);
    }
    return { list, near: (x, z) => map.get(Math.floor(x / B) + "," + Math.floor(z / B)) || [] };
  }
  /* the physics view of the ranch: the same interface the vehicle uses on a track */
  var RanchWorld = class {
    constructor(W) {
      this.W = W;
    }
    locate(p) {
      return { i: 0, s: 0, d: 0 };
    }
    ground(x, z) {
      let g = this.W.groundAt(x, z);
      return { y: g.y, n: g.n, surf: g.surf, i: 0 };
    }
    raycast(o, dir, maxT) {
      let t = 0, g = null;
      for (let k = 0; k < 5; k++) {
        let x = o[0] + dir[0] * t, z = o[2] + dir[2] * t;
        g = this.W.groundAt(x, z);
        let den = dir[0] * g.n[0] + dir[1] * g.n[1] + dir[2] * g.n[2];
        if (den > -1e-4) return null;
        let nt = ((x - o[0]) * g.n[0] + (g.y - o[1]) * g.n[1] + (z - o[2]) * g.n[2]) / den;
        if (Math.abs(nt - t) < 1e-4) {
          t = nt;
          break;
        }
        t = nt;
      }
      return t < 0 || t > maxT ? null : { t, p: [o[0] + dir[0] * t, o[1] + dir[1] * t, o[2] + dir[2] * t], n: g.n, surf: g.surf, i: 0 };
    }
    /* where a tyre (a circle of radius R rolling along fwd) first touches the ground: rays down at seven
       points across its footprint, each lifted by the circle's curve there. A ledge ahead is found before the
       hub reaches it, and the contact normal leans back off its face. */
    wheelContact(o, down, fwd, R, maxT) {
      let best = this.raycast(o, down, maxT);
      best && (best.off = 0);
      let fd = fwd[0] * down[0] + fwd[1] * down[1] + fwd[2] * down[2], f = [fwd[0] - down[0] * fd, fwd[1] - down[1] * fd, fwd[2] - down[2] * fd], fl = Math.hypot(f[0], f[1], f[2]) || 1;
      f = [f[0] / fl, f[1] / fl, f[2] / fl];
      for (let k of [-0.75, -0.5, -0.25, 0.25, 0.5, 0.75]) {
        let dx = k * R, h = this.raycast([o[0] + f[0] * dx, o[1] + f[1] * dx, o[2] + f[2] * dx], down, maxT);
        if (!h) continue;
        let eff = h.t + R - Math.sqrt(R * R - dx * dx);
        if (!best || eff < best.t - 2e-3) {
          let cen = [o[0] + down[0] * (eff - R), o[1] + down[1] * (eff - R), o[2] + down[2] * (eff - R)], n = [cen[0] - h.p[0], cen[1] - h.p[1], cen[2] - h.p[2]], nl = Math.hypot(n[0], n[1], n[2]) || 1;
          best = { t: eff, p: h.p, n: [n[0] / nl, n[1] / nl, n[2] / nl], surf: h.surf, i: 0, off: dx };
        }
      }
      return best && best.t <= maxT ? best : null;
    }
    /* trees, posts, walls and bales: push the hull back out */
    wall(P) {
      let best = null, bound = 395;
      if (Math.abs(P[0]) > bound || Math.abs(P[2]) > bound) {
        let ax = Math.abs(P[0]) - bound, az = Math.abs(P[2]) - bound;
        return ax > az ? { pen: ax, n: [-Math.sign(P[0]), 0, 0] } : { pen: az, n: [0, 0, -Math.sign(P[2])] };
      }
      for (let c of this.W.colliders.near(P[0], P[2])) {
        if (P[1] > c.top + 0.2) continue;
        if (c.t === "c") {
          let dx = P[0] - c.x, dz = P[2] - c.z, d = Math.hypot(dx, dz);
          if (d < c.r) {
            let pen = c.r - d;
            (!best || pen > best.pen) && (best = { pen, n: d > 1e-4 ? [dx / d, 0, dz / d] : [1, 0, 0] });
          }
        } else if (P[0] > c.x0 && P[0] < c.x1 && P[2] > c.z0 && P[2] < c.z1) {
          let o = [[P[0] - c.x0, [-1, 0, 0]], [c.x1 - P[0], [1, 0, 0]], [P[2] - c.z0, [0, 0, -1]], [c.z1 - P[2], [0, 0, 1]]].sort((a, b) => a[0] - b[0])[0];
          (!best || o[0] > best.pen) && (best = { pen: o[0], n: o[1] });
        }
      }
      return best;
    }
  };
