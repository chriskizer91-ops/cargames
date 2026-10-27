  // src/physics/math3.js
  var clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t, sstep = (a, b, x) => {
    let t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  }, sgn = (v) => v < 0 ? -1 : v > 0 ? 1 : 0, TAU = Math.PI * 2, wrapA = (a) => {
    for (; a > Math.PI; ) a -= TAU;
    for (; a < -Math.PI; ) a += TAU;
    return a;
  };
  var add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub2 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k], madd = (a, b, k) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k], dot2 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross2 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], len = (a) => Math.hypot(a[0], a[1], a[2]), norm2 = (a) => {
    let l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  };
  var qmul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]], qnorm = (q) => {
    let l = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
    return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
  }, qaxis = (ax, ang) => {
    let s = Math.sin(ang / 2), n = norm2(ax);
    return [n[0] * s, n[1] * s, n[2] * s, Math.cos(ang / 2)];
  };
  function qint(q, w, dt) {
    let d = [w[0] * dt * 0.5, w[1] * dt * 0.5, w[2] * dt * 0.5, 0], r = qmul(d, q);
    return qnorm([q[0] + r[0], q[1] + r[1], q[2] + r[2], q[3] + r[3]]);
  }
  function qmat(q) {
    let x = q[0], y = q[1], z = q[2], w = q[3];
    return [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)];
  }
  var mcol = (m, i) => [m[i], m[3 + i], m[6 + i]], mvec = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]], mtvec = (m, v) => [m[0] * v[0] + m[3] * v[1] + m[6] * v[2], m[1] * v[0] + m[4] * v[1] + m[7] * v[2], m[2] * v[0] + m[5] * v[1] + m[8] * v[2]];
  function qlook(fwd, up) {
    let f2 = norm2(fwd), r = norm2(cross2(f2, up)), u = cross2(r, f2), m00 = f2[0], m01 = u[0], m02 = r[0], m10 = f2[1], m11 = u[1], m12 = r[1], m20 = f2[2], m21 = u[2], m22 = r[2], tr = m00 + m11 + m22, x, y, z, w;
    if (tr > 0) {
      let s = Math.sqrt(tr + 1) * 2;
      w = 0.25 * s, x = (m21 - m12) / s, y = (m02 - m20) / s, z = (m10 - m01) / s;
    } else if (m00 > m11 && m00 > m22) {
      let s = Math.sqrt(1 + m00 - m11 - m22) * 2;
      w = (m21 - m12) / s, x = 0.25 * s, y = (m01 + m10) / s, z = (m02 + m20) / s;
    } else if (m11 > m22) {
      let s = Math.sqrt(1 + m11 - m00 - m22) * 2;
      w = (m02 - m20) / s, x = (m01 + m10) / s, y = 0.25 * s, z = (m12 + m21) / s;
    } else {
      let s = Math.sqrt(1 + m22 - m00 - m11) * 2;
      w = (m10 - m01) / s, x = (m02 + m20) / s, y = (m12 + m21) / s, z = 0.25 * s;
    }
    return qnorm([x, y, z, w]);
  }

