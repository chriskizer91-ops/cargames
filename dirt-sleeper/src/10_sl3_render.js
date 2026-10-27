  // src/render/gl.js
  function createGL(canvas2) {
    let gl = canvas2.getContext("webgl2", { antialias: !1, alpha: !1, depth: !1, stencil: !1, powerPreference: "high-performance", preserveDrawingBuffer: !1 });
    if (!gl) throw new Error("This game needs WebGL2.");
    let ext = {
      cbf: gl.getExtension("EXT_color_buffer_float"),
      flt: gl.getExtension("OES_texture_float_linear"),
      aniso: gl.getExtension("EXT_texture_filter_anisotropic"),
      timer: gl.getExtension("EXT_disjoint_timer_query_webgl2"),
      par: gl.getExtension("KHR_parallel_shader_compile")
    };
    if (!ext.cbf) throw new Error("This game needs floating-point render targets (EXT_color_buffer_float).");
    let G2 = { gl, ext, maxAniso: ext.aniso ? gl.getParameter(ext.aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 1 }, SAMPLER_TYPES = /* @__PURE__ */ new Set([
      gl.SAMPLER_2D,
      gl.SAMPLER_3D,
      gl.SAMPLER_CUBE,
      gl.SAMPLER_2D_SHADOW,
      gl.SAMPLER_2D_ARRAY,
      gl.SAMPLER_2D_ARRAY_SHADOW,
      gl.SAMPLER_CUBE_SHADOW,
      gl.INT_SAMPLER_2D,
      gl.UNSIGNED_INT_SAMPLER_2D,
      gl.INT_SAMPLER_3D,
      gl.UNSIGNED_INT_SAMPLER_3D,
      gl.INT_SAMPLER_2D_ARRAY,
      gl.UNSIGNED_INT_SAMPLER_2D_ARRAY
    ]), header = (defs) => `#version 300 es
precision highp float;precision highp int;precision highp sampler2DArray;precision highp sampler2DShadow;precision highp sampler2DArrayShadow;precision highp usampler2D;precision highp samplerCube;
` + Object.entries(defs || {}).map(([k, v]) => `#define ${k} ${v === !0 ? "" : v}`).join(`
`) + `
`;
    G2.programs = [], G2.program = (name, vs, fs, defs = {}) => {
      let P = { name, p: gl.createProgram(), u: {}, samplers: {}, ready: !1 };
      G2.programs.push(P);
      let mk = (t, src) => {
        let s = gl.createShader(t);
        return gl.shaderSource(s, header(defs) + src), gl.compileShader(s), gl.attachShader(P.p, s), s;
      };
      return P.vs = mk(gl.VERTEX_SHADER, vs), P.fs = mk(gl.FRAGMENT_SHADER, fs), P.srcV = vs, P.srcF = fs, P.defs = defs, gl.linkProgram(P.p), P;
    }, G2.finish = (P) => {
      if (P.ready) return P;
      if (!gl.getProgramParameter(P.p, gl.LINK_STATUS)) {
        for (let [s, src] of [[P.vs, P.srcV], [P.fs, P.srcF]]) if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
          let log = gl.getShaderInfoLog(s), hdr = header(P.defs).split(`
`).length - 1, m = /ERROR: \d+:(\d+)/.exec(log || ""), ln = m ? +m[1] - hdr : -1, lines = src.split(`
`);
          throw console.error(`[${P.name}] ` + log + (ln > 0 ? `
` + lines.slice(Math.max(0, ln - 4), ln + 2).map((l, i) => Math.max(1, ln - 3) + i + ": " + l).join(`
`) : "")), new Error(`shader ${P.name}: ${log}`);
        }
        throw new Error(`link ${P.name}: ${gl.getProgramInfoLog(P.p)}`);
      }
      let n = gl.getProgramParameter(P.p, gl.ACTIVE_UNIFORMS), unit = 0;
      gl.useProgram(P.p);
      for (let i = 0; i < n; i++) {
        let inf = gl.getActiveUniform(P.p, i), nm = inf.name.replace(/\[0\]$/, ""), loc = gl.getUniformLocation(P.p, inf.name);
        SAMPLER_TYPES.has(inf.type) ? (P.samplers[nm] = unit, gl.uniform1i(loc, unit), unit++) : P.u[nm] = { loc, type: inf.type, size: inf.size };
      }
      return P.ready = !0, P;
    }, G2.warmup = async (onProgress) => {
      let par = ext.par, list = G2.programs.filter((P) => !P.ready), t0 = performance.now();
      if (par)
        for (; ; ) {
          let done = list.filter((P) => gl.getProgramParameter(P.p, par.COMPLETION_STATUS_KHR)).length;
          if (onProgress && onProgress(done, list.length), done === list.length || performance.now() - t0 > 6e4) break;
          await new Promise((r) => setTimeout(r, 30));
        }
      for (let i = 0; i < list.length; i++)
        G2.finish(list[i]), par || (onProgress && onProgress(i + 1, list.length), await new Promise((r) => setTimeout(r, 0)));
    };
    let cur = null;
    G2.use = (P) => (P.ready || G2.finish(P), cur !== P && (gl.useProgram(P.p), cur = P), P), G2.set = (P, vals) => {
      for (let k in P.u) {
        let v = vals[k];
        v !== void 0 && setU(P.u[k], v);
      }
    }, G2.uni = (P, k, v) => {
      let u = P.u[k];
      u && setU(u, v);
    };
    function setU(u, v) {
      let l = u.loc;
      switch (u.type) {
        case gl.FLOAT:
          u.size > 1 ? gl.uniform1fv(l, v) : gl.uniform1f(l, v);
          break;
        case gl.FLOAT_VEC2:
          gl.uniform2fv(l, v);
          break;
        case gl.FLOAT_VEC3:
          gl.uniform3fv(l, v);
          break;
        case gl.FLOAT_VEC4:
          gl.uniform4fv(l, v);
          break;
        case gl.INT:
        case gl.BOOL:
          u.size > 1 ? gl.uniform1iv(l, v) : gl.uniform1i(l, v);
          break;
        case gl.INT_VEC2:
          gl.uniform2iv(l, v);
          break;
        case gl.UNSIGNED_INT:
          gl.uniform1ui(l, v);
          break;
        case gl.FLOAT_MAT4:
          gl.uniformMatrix4fv(l, !1, v);
          break;
        case gl.FLOAT_MAT3:
          gl.uniformMatrix3fv(l, !1, v);
          break;
      }
    }
    G2.tex = (P, map) => {
      for (let k in map) {
        let unit = P.samplers[k];
        if (unit === void 0) continue;
        let t = map[k];
        gl.activeTexture(gl.TEXTURE0 + unit), gl.bindTexture(t.target || gl.TEXTURE_2D, t.t || t);
      }
    };
    let FMT = {
      rgba8: [gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE],
      srgb8: [gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE],
      rgba16f: [gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT],
      rg16f: [gl.RG16F, gl.RG, gl.HALF_FLOAT],
      r16f: [gl.R16F, gl.RED, gl.HALF_FLOAT],
      r11g11b10f: [gl.R11F_G11F_B10F, gl.RGB, gl.HALF_FLOAT],
      rgba32f: [gl.RGBA32F, gl.RGBA, gl.FLOAT],
      r32f: [gl.R32F, gl.RED, gl.FLOAT],
      rg32f: [gl.RG32F, gl.RG, gl.FLOAT],
      r8: [gl.R8, gl.RED, gl.UNSIGNED_BYTE],
      rg8: [gl.RG8, gl.RG, gl.UNSIGNED_BYTE],
      r16ui: [gl.R16UI, gl.RED_INTEGER, gl.UNSIGNED_SHORT],
      rg16ui: [gl.RG16UI, gl.RG_INTEGER, gl.UNSIGNED_SHORT],
      rgba16ui: [gl.RGBA16UI, gl.RGBA_INTEGER, gl.UNSIGNED_SHORT],
      r32ui: [gl.R32UI, gl.RED_INTEGER, gl.UNSIGNED_INT],
      rg32ui: [gl.RG32UI, gl.RG_INTEGER, gl.UNSIGNED_INT],
      depth32f: [gl.DEPTH_COMPONENT32F, gl.DEPTH_COMPONENT, gl.FLOAT],
      depth24: [gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT]
    };
    G2.FMT = FMT, G2.texture = (w, h, fmt2 = "rgba8", o = {}) => {
      let [ifmt, f2, ty] = FMT[fmt2], t = gl.createTexture(), target = o.cube ? gl.TEXTURE_CUBE_MAP : o.layers ? gl.TEXTURE_2D_ARRAY : gl.TEXTURE_2D;
      gl.bindTexture(target, t);
      let lv = o.mips ? Math.floor(Math.log2(Math.max(w, h))) + 1 : 1;
      o.layers ? gl.texStorage3D(target, lv, ifmt, w, h, o.layers) : gl.texStorage2D(target, lv, ifmt, w, h);
      let lin = o.filter !== "nearest";
      gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, o.mips ? lin ? gl.LINEAR_MIPMAP_LINEAR : gl.NEAREST_MIPMAP_NEAREST : lin ? gl.LINEAR : gl.NEAREST), gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, lin ? gl.LINEAR : gl.NEAREST);
      let wr = o.wrap === "repeat" ? gl.REPEAT : o.wrap === "mirror" ? gl.MIRRORED_REPEAT : gl.CLAMP_TO_EDGE;
      return gl.texParameteri(target, gl.TEXTURE_WRAP_S, wr), gl.texParameteri(target, gl.TEXTURE_WRAP_T, wr), (o.cube || o.layers) && gl.texParameteri(target, gl.TEXTURE_WRAP_R, wr), o.compare && (gl.texParameteri(target, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE), gl.texParameteri(target, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL)), o.aniso && ext.aniso && gl.texParameterf(target, ext.aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(o.aniso, G2.maxAniso)), o.data && !o.layers && !o.cube && gl.texSubImage2D(target, 0, 0, 0, w, h, f2, ty, o.data), o.data && o.mips && gl.generateMipmap(target), { t, target, w, h, fmt: fmt2, ifmt, f: f2, ty, levels: lv };
    }, G2.upload = (T2, data, x = 0, y = 0, w = T2.w, h = T2.h) => {
      gl.bindTexture(T2.target, T2.t), gl.texSubImage2D(T2.target, 0, x, y, w, h, T2.f, T2.ty, data);
    }, G2.del = (T2) => {
      T2 && T2.t && gl.deleteTexture(T2.t);
    }, G2.target = (colors, depth) => {
      let fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      let att = (a) => a && a.tex ? a : { tex: a }, bufs = [];
      (colors || []).forEach((c, i) => {
        let A = att(c);
        bindAtt(gl.COLOR_ATTACHMENT0 + i, A), bufs.push(gl.COLOR_ATTACHMENT0 + i);
      }), depth && bindAtt(gl.DEPTH_ATTACHMENT, att(depth)), gl.drawBuffers(bufs.length ? bufs : [gl.NONE]), bufs.length || gl.readBuffer(gl.NONE);
      let st = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      if (st !== gl.FRAMEBUFFER_COMPLETE) throw new Error("framebuffer incomplete 0x" + st.toString(16));
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      let c0 = colors && colors[0] ? att(colors[0]) : att(depth), lvl = c0.level || 0;
      return { fb, w: Math.max(1, c0.tex.w >> lvl), h: Math.max(1, c0.tex.h >> lvl), n: bufs.length, bufs };
    };
    function bindAtt(point, A) {
      let T2 = A.tex, lvl = A.level || 0;
      T2.target === gl.TEXTURE_CUBE_MAP ? gl.framebufferTexture2D(gl.FRAMEBUFFER, point, gl.TEXTURE_CUBE_MAP_POSITIVE_X + (A.face || 0), T2.t, lvl) : T2.target === gl.TEXTURE_2D_ARRAY ? gl.framebufferTextureLayer(gl.FRAMEBUFFER, point, T2.t, lvl, A.layer || 0) : gl.framebufferTexture2D(gl.FRAMEBUFFER, point, gl.TEXTURE_2D, T2.t, lvl);
    }
    return G2.bind = (R2, vp) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, R2 ? R2.fb : null), vp ? gl.viewport(vp[0], vp[1], vp[2], vp[3]) : R2 && gl.viewport(0, 0, R2.w, R2.h);
    }, G2.delTarget = (R2) => {
      R2 && gl.deleteFramebuffer(R2.fb);
    }, G2.mesh = (layout, stride, vbData, ibData, P) => {
      let vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      let vb = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vb), gl.bufferData(gl.ARRAY_BUFFER, vbData, gl.STATIC_DRAW);
      for (let a of layout) {
        let loc = a.loc;
        gl.enableVertexAttribArray(loc), a.type === "f32" ? gl.vertexAttribPointer(loc, a.size, gl.FLOAT, !1, stride, a.offset) : a.type === "i16n" ? gl.vertexAttribPointer(loc, a.size, gl.SHORT, !0, stride, a.offset) : a.type === "u8n" ? gl.vertexAttribPointer(loc, a.size, gl.UNSIGNED_BYTE, !0, stride, a.offset) : a.type === "u8i" ? gl.vertexAttribIPointer(loc, a.size, gl.UNSIGNED_BYTE, stride, a.offset) : a.type === "u16i" && gl.vertexAttribIPointer(loc, a.size, gl.UNSIGNED_SHORT, stride, a.offset);
      }
      let ib = null, count = vbData.byteLength / stride, itype = 0;
      return ibData && (ib = gl.createBuffer(), gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib), gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ibData, gl.STATIC_DRAW), count = ibData.length, itype = ibData instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT), gl.bindVertexArray(null), { vao, vb, ib, count, itype };
    }, G2.draw = (M, first = 0, count = M.count, mode = gl.TRIANGLES) => {
      gl.bindVertexArray(M.vao), M.ib ? gl.drawElements(mode, count, M.itype, first * (M.itype === gl.UNSIGNED_INT ? 4 : 2)) : gl.drawArrays(mode, first, count);
    }, G2.drawInst = (M, n, mode = gl.TRIANGLES) => {
      gl.bindVertexArray(M.vao), M.ib ? gl.drawElementsInstanced(mode, M.count, M.itype, 0, n) : gl.drawArraysInstanced(mode, 0, M.count, n);
    }, G2.empty = gl.createVertexArray(), G2.fullscreen = () => {
      gl.bindVertexArray(G2.empty), gl.drawArrays(gl.TRIANGLES, 0, 3);
    }, G2.procedural = (verts, inst, mode = gl.TRIANGLES) => {
      gl.bindVertexArray(G2.empty), inst > 1 ? gl.drawArraysInstanced(mode, 0, verts, inst) : gl.drawArrays(mode, 0, verts);
    }, G2.timer = () => {
      if (!ext.timer) return null;
      let qs = [], last2 = -1;
      return {
        begin() {
          let q = gl.createQuery();
          gl.beginQuery(ext.timer.TIME_ELAPSED_EXT, q), qs.push(q);
        },
        end() {
          gl.endQuery(ext.timer.TIME_ELAPSED_EXT);
        },
        poll() {
          let dis = gl.getParameter(ext.timer.GPU_DISJOINT_EXT);
          for (; qs.length && gl.getQueryParameter(qs[0], gl.QUERY_RESULT_AVAILABLE); ) {
            let q = qs.shift();
            dis || (last2 = gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6), gl.deleteQuery(q);
          }
          for (; qs.length > 6; ) gl.deleteQuery(qs.shift());
          return last2;
        }
      };
    }, G2;
  }
  var M4 = {
    ident() {
      let m = new Float32Array(16);
      return m[0] = m[5] = m[10] = m[15] = 1, m;
    },
    mul(a, b, o = new Float32Array(16)) {
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
      return o;
    },
    /* reversed-Z infinite perspective is tempting, but keep a standard one: near/far explicit */
    persp(fovy, asp, n, f2, o = new Float32Array(16)) {
      let t = 1 / Math.tan(fovy / 2);
      return o.fill(0), o[0] = t / asp, o[5] = t, o[10] = (f2 + n) / (n - f2), o[11] = -1, o[14] = 2 * f2 * n / (n - f2), o;
    },
    ortho(l, r, b, t, n, f2, o = new Float32Array(16)) {
      return o.fill(0), o[0] = 2 / (r - l), o[5] = 2 / (t - b), o[10] = -2 / (f2 - n), o[12] = -(r + l) / (r - l), o[13] = -(t + b) / (t - b), o[14] = -(f2 + n) / (f2 - n), o[15] = 1, o;
    },
    /* view matrix from an eye position and a camera basis (right, up, back) */
    view(eye, R2, U, B, o = new Float32Array(16)) {
      return o[0] = R2[0], o[4] = R2[1], o[8] = R2[2], o[12] = -(R2[0] * eye[0] + R2[1] * eye[1] + R2[2] * eye[2]), o[1] = U[0], o[5] = U[1], o[9] = U[2], o[13] = -(U[0] * eye[0] + U[1] * eye[1] + U[2] * eye[2]), o[2] = B[0], o[6] = B[1], o[10] = B[2], o[14] = -(B[0] * eye[0] + B[1] * eye[1] + B[2] * eye[2]), o[3] = 0, o[7] = 0, o[11] = 0, o[15] = 1, o;
    },
    lookAt(eye, at, up = [0, 1, 0], o) {
      let b = [eye[0] - at[0], eye[1] - at[1], eye[2] - at[2]], bl = Math.hypot(...b) || 1;
      b = b.map((x) => x / bl);
      let r = [up[1] * b[2] - up[2] * b[1], up[2] * b[0] - up[0] * b[2], up[0] * b[1] - up[1] * b[0]], rl = Math.hypot(...r) || 1;
      r = r.map((x) => x / rl);
      let u = [b[1] * r[2] - b[2] * r[1], b[2] * r[0] - b[0] * r[2], b[0] * r[1] - b[1] * r[0]];
      return M4.view(eye, r, u, b, o);
    },
    /* model matrix from a row-major 3x3 rotation (columns = body axes) and a position */
    fromRot(R2, p, o = new Float32Array(16)) {
      return o[0] = R2[0], o[1] = R2[3], o[2] = R2[6], o[3] = 0, o[4] = R2[1], o[5] = R2[4], o[6] = R2[7], o[7] = 0, o[8] = R2[2], o[9] = R2[5], o[10] = R2[8], o[11] = 0, o[12] = p[0], o[13] = p[1], o[14] = p[2], o[15] = 1, o;
    },
    invert(m, o = new Float32Array(16)) {
      let a = m, b00 = a[0] * a[5] - a[1] * a[4], b01 = a[0] * a[6] - a[2] * a[4], b02 = a[0] * a[7] - a[3] * a[4], b03 = a[1] * a[6] - a[2] * a[5], b04 = a[1] * a[7] - a[3] * a[5], b05 = a[2] * a[7] - a[3] * a[6], b06 = a[8] * a[13] - a[9] * a[12], b07 = a[8] * a[14] - a[10] * a[12], b08 = a[8] * a[15] - a[11] * a[12], b09 = a[9] * a[14] - a[10] * a[13], b10 = a[9] * a[15] - a[11] * a[13], b11 = a[10] * a[15] - a[11] * a[14], det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
      return det ? (det = 1 / det, o[0] = (a[5] * b11 - a[6] * b10 + a[7] * b09) * det, o[1] = (a[2] * b10 - a[1] * b11 - a[3] * b09) * det, o[2] = (a[13] * b05 - a[14] * b04 + a[15] * b03) * det, o[3] = (a[10] * b04 - a[9] * b05 - a[11] * b03) * det, o[4] = (a[6] * b08 - a[4] * b11 - a[7] * b07) * det, o[5] = (a[0] * b11 - a[2] * b08 + a[3] * b07) * det, o[6] = (a[14] * b02 - a[12] * b05 - a[15] * b01) * det, o[7] = (a[8] * b05 - a[10] * b02 + a[11] * b01) * det, o[8] = (a[4] * b10 - a[5] * b08 + a[7] * b06) * det, o[9] = (a[1] * b08 - a[0] * b10 - a[3] * b06) * det, o[10] = (a[12] * b04 - a[13] * b02 + a[15] * b00) * det, o[11] = (a[9] * b02 - a[8] * b04 - a[11] * b00) * det, o[12] = (a[5] * b07 - a[4] * b09 - a[6] * b06) * det, o[13] = (a[0] * b09 - a[1] * b07 + a[2] * b06) * det, o[14] = (a[13] * b01 - a[12] * b03 - a[14] * b00) * det, o[15] = (a[8] * b03 - a[9] * b01 + a[10] * b00) * det, o) : M4.ident();
    },
    xform(m, p) {
      let w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
      return [(m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12]) / w, (m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13]) / w, (m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]) / w];
    },
    /* the six frustum planes of a view-projection matrix, as [a,b,c,d] with inside = a*x+b*y+c*z+d >= 0 */
    planes(m) {
      let P = [], r = (i) => [m[i], m[4 + i], m[8 + i], m[12 + i]], r0 = r(0), r1 = r(1), r2 = r(2), r3 = r(3);
      for (let [s, q] of [[1, r0], [-1, r0], [1, r1], [-1, r1], [1, r2], [-1, r2]]) {
        let p = [r3[0] + s * q[0], r3[1] + s * q[1], r3[2] + s * q[2], r3[3] + s * q[3]], l = Math.hypot(p[0], p[1], p[2]);
        P.push(p.map((x) => x / l));
      }
      return P;
    },
    /* does an axis-aligned box touch the frustum? */
    boxVisible(P, mn, mx) {
      for (let p of P) {
        let x = p[0] > 0 ? mx[0] : mn[0], y = p[1] > 0 ? mx[1] : mn[1], z = p[2] > 0 ? mx[2] : mn[2];
        if (p[0] * x + p[1] * y + p[2] * z + p[3] < 0) return !1;
      }
      return !0;
    }
  };

  // src/render/mesh.js
  var LAYOUT = [
    { name: "aPos", loc: 0, size: 3, type: "f32", offset: 0 },
    { name: "aNrm", loc: 1, size: 3, type: "i16n", offset: 12 },
    { name: "aUV", loc: 2, size: 2, type: "f32", offset: 20 },
    { name: "aMat", loc: 3, size: 4, type: "u8i", offset: 28 },
    { name: "aCol", loc: 4, size: 4, type: "u8n", offset: 32 }
  ], MeshBuilder = class {
    constructor(cap = 4096) {
      this.buf = new ArrayBuffer(cap * 36), this.f = new Float32Array(this.buf), this.s = new Int16Array(this.buf), this.b = new Uint8Array(this.buf), this.nv = 0, this.idx = [], this.m = [0, 0, 0, 0], this.c = [255, 255, 255, 255], this.mn = [1e9, 1e9, 1e9], this.mx = [-1e9, -1e9, -1e9];
    }
    grow() {
      let nb = new ArrayBuffer(this.buf.byteLength * 2);
      new Uint8Array(nb).set(this.b), this.buf = nb, this.f = new Float32Array(nb), this.s = new Int16Array(nb), this.b = new Uint8Array(nb);
    }
    mat(id, p1 = 0, p2 = 0, p3 = 0) {
      return this.m = [id, p1 | 0, p2 | 0, p3 | 0], this;
    }
    col(r, g, b, a = 255) {
      return this.c = [r | 0, g | 0, b | 0, a | 0], this;
    }
    /* add a vertex; returns its index */
    v(p, n, u = 0, w = 0, ao) {
      (this.nv + 1) * 36 > this.buf.byteLength && this.grow();
      let o = this.nv * 9, os = this.nv * 18, ob = this.nv * 36;
      this.f[o] = p[0], this.f[o + 1] = p[1], this.f[o + 2] = p[2];
      let nl = Math.hypot(n[0], n[1], n[2]) || 1;
      this.s[os + 6] = Math.round(n[0] / nl * 32767), this.s[os + 7] = Math.round(n[1] / nl * 32767), this.s[os + 8] = Math.round(n[2] / nl * 32767), this.s[os + 9] = 0, this.f[o + 5] = u, this.f[o + 6] = w;
      let m = this.m, c = this.c;
      this.b[ob + 28] = m[0], this.b[ob + 29] = m[1], this.b[ob + 30] = m[2], this.b[ob + 31] = m[3], this.b[ob + 32] = c[0], this.b[ob + 33] = c[1], this.b[ob + 34] = c[2], this.b[ob + 35] = ao === void 0 ? c[3] : Math.round(ao * 255);
      for (let k = 0; k < 3; k++)
        p[k] < this.mn[k] && (this.mn[k] = p[k]), p[k] > this.mx[k] && (this.mx[k] = p[k]);
      return this.nv++;
    }
    tri(a, b, c) {
      this.idx.push(a, b, c);
    }
    quad(a, b, c, d) {
      this.idx.push(a, b, c, a, c, d);
    }
    /* a flat quad from four corners (counter-clockwise seen from the front) with uv corners */
    quadP(p0, p1, p2, p3, uv = [[0, 0], [1, 0], [1, 1], [0, 1]], n) {
      if (!n) {
        let e1 = sub(p1, p0), e2 = sub(p3, p0);
        n = cross(e1, e2);
      }
      let a = this.v(p0, n, uv[0][0], uv[0][1]), b = this.v(p1, n, uv[1][0], uv[1][1]), c = this.v(p2, n, uv[2][0], uv[2][1]), d = this.v(p3, n, uv[3][0], uv[3][1]);
      this.quad(a, b, c, d);
    }
    /* an oriented box: centre c, unit axes ax/ay/az, half sizes h; uv in metres per face. faces: bitmask skip */
    box(c, ax, ay, az, h, skip = 0, uvMode = 0) {
      dot(cross(ax, ay), az) < 0 && (az = neg(az), skip & 48 && (skip = skip & -49 | (skip & 16 ? 32 : 0) | (skip & 32 ? 16 : 0)));
      let P = (sx, sy, sz) => [c[0] + ax[0] * h[0] * sx + ay[0] * h[1] * sy + az[0] * h[2] * sz, c[1] + ax[1] * h[0] * sx + ay[1] * h[1] * sy + az[1] * h[2] * sz, c[2] + ax[2] * h[0] * sx + ay[2] * h[1] * sy + az[2] * h[2] * sz];
      [
        [ax, [1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1], h[2], h[1]],
        [neg(ax), [-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1], h[2], h[1]],
        [ay, [-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1], h[0], h[2]],
        [neg(ay), [-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1], h[0], h[2]],
        [az, [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1], h[0], h[1]],
        [neg(az), [1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1], h[0], h[1]]
      ].forEach((f2, i) => {
        if (skip & 1 << i) return;
        let [n, a, b, cc, d, su, sv] = f2;
        this.quadP(P(...a), P(...b), P(...cc), P(...d), [[0, 0], [2 * su, 0], [2 * su, 2 * sv], [0, 2 * sv]], n);
      });
    }
    /* a tube between two points: radius r, n sides, optional end caps */
    tube(a, b, r, n = 6, caps = !0, r2 = r) {
      let d = sub(b, a), L = Math.hypot(...d);
      if (L < 1e-5) return;
      let t = d.map((x) => x / L), ref = Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], u = norm(cross(t, ref)), w = cross(t, u), ring = [];
      for (let i = 0; i <= n; i++) {
        let ang = i / n * Math.PI * 2, cs = Math.cos(ang), sn = Math.sin(ang), nn = [u[0] * cs + w[0] * sn, u[1] * cs + w[1] * sn, u[2] * cs + w[2] * sn];
        ring.push([this.v([a[0] + nn[0] * r, a[1] + nn[1] * r, a[2] + nn[2] * r], nn, i / n, 0), this.v([b[0] + nn[0] * r2, b[1] + nn[1] * r2, b[2] + nn[2] * r2], nn, i / n, L)]);
      }
      for (let i = 0; i < n; i++) this.quad(ring[i][0], ring[i + 1][0], ring[i + 1][1], ring[i][1]);
      if (caps) {
        let ca = this.v(a, neg(t), 0, 0), cb = this.v(b, t, 0, L);
        for (let i = 0; i < n; i++) {
          let ang0 = i / n * Math.PI * 2, ang1 = (i + 1) / n * Math.PI * 2, p = (ang, rr, o) => [o[0] + (u[0] * Math.cos(ang) + w[0] * Math.sin(ang)) * rr, o[1] + (u[1] * Math.cos(ang) + w[1] * Math.sin(ang)) * rr, o[2] + (u[2] * Math.cos(ang) + w[2] * Math.sin(ang)) * rr], a0 = this.v(p(ang0, r, a), neg(t)), a1 = this.v(p(ang1, r, a), neg(t));
          this.tri(ca, a1, a0);
          let b0 = this.v(p(ang0, r2, b), t), b1 = this.v(p(ang1, r2, b), t);
          this.tri(cb, b0, b1);
        }
      }
    }
    /* a small sphere (for neon tube joints and lamp bulbs) */
    sphere(c, r, seg = 6, rings = 4) {
      let ix = [];
      for (let j = 0; j <= rings; j++) {
        let ph = j / rings * Math.PI, row = [];
        for (let i = 0; i <= seg; i++) {
          let th = i / seg * Math.PI * 2, n = [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)];
          row.push(this.v([c[0] + n[0] * r, c[1] + n[1] * r, c[2] + n[2] * r], n, i / seg, j / rings));
        }
        ix.push(row);
      }
      for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) this.quad(ix[j][i], ix[j][i + 1], ix[j + 1][i + 1], ix[j + 1][i]);
    }
    /* append another builder's geometry */
    append(B) {
      let base = this.nv;
      for (; (this.nv + B.nv) * 36 > this.buf.byteLength; ) this.grow();
      this.b.set(B.b.subarray(0, B.nv * 36), this.nv * 36), this.nv += B.nv;
      for (let i of B.idx) this.idx.push(i + base);
      for (let k = 0; k < 3; k++)
        this.mn[k] = Math.min(this.mn[k], B.mn[k]), this.mx[k] = Math.max(this.mx[k], B.mx[k]);
    }
    vertexData() {
      return new Uint8Array(this.buf, 0, this.nv * 36);
    }
    indexData() {
      return this.nv > 65535 ? new Uint32Array(this.idx) : new Uint16Array(this.idx);
    }
    /* transform all vertices by a 3x3 (row-major, columns = axes) and offset */
    transform(R2, t) {
      for (let i = 0; i < this.nv; i++) {
        let o = i * 9, os = i * 18, x = this.f[o], y = this.f[o + 1], z = this.f[o + 2];
        this.f[o] = R2[0] * x + R2[1] * y + R2[2] * z + t[0], this.f[o + 1] = R2[3] * x + R2[4] * y + R2[5] * z + t[1], this.f[o + 2] = R2[6] * x + R2[7] * y + R2[8] * z + t[2];
        let nx = this.s[os + 6], ny = this.s[os + 7], nz = this.s[os + 8];
        this.s[os + 6] = Math.round(R2[0] * nx + R2[1] * ny + R2[2] * nz), this.s[os + 7] = Math.round(R2[3] * nx + R2[4] * ny + R2[5] * nz), this.s[os + 8] = Math.round(R2[6] * nx + R2[7] * ny + R2[8] * nz);
      }
      this.mn = [1e9, 1e9, 1e9], this.mx = [-1e9, -1e9, -1e9];
      for (let i = 0; i < this.nv; i++) for (let k = 0; k < 3; k++) {
        let v = this.f[i * 9 + k];
        this.mn[k] = Math.min(this.mn[k], v), this.mx[k] = Math.max(this.mx[k], v);
      }
    }
  }, Chunked = class {
    constructor(size = 64) {
      this.size = size, this.tiles = /* @__PURE__ */ new Map(), this.cur = null, this.m = [0, 0, 0, 0], this.c = [255, 255, 255, 255];
    }
    /* pick the tile for geometry centred at (x, z); returns that tile's builder with the current material */
    at(x, z) {
      let k = Math.floor(x / this.size) + "," + Math.floor(z / this.size), B = this.tiles.get(k);
      return B || (B = new MeshBuilder(2048), this.tiles.set(k, B)), B.m = this.m.slice(), B.c = this.c.slice(), B;
    }
    mat(id, p1 = 0, p2 = 0, p3 = 0) {
      return this.m = [id, p1 | 0, p2 | 0, p3 | 0], this;
    }
    col(r, g, b, a = 255) {
      return this.c = [r | 0, g | 0, b | 0, a | 0], this;
    }
    /* pack every tile into one vertex/index buffer with per-tile ranges and bounds */
    pack() {
      let tiles = [...this.tiles.values()].filter((B) => B.idx.length), nv = 0, ni = 0;
      for (let B of tiles)
        nv += B.nv, ni += B.idx.length;
      let vb = new Uint8Array(nv * 36), ib = new Uint32Array(ni), ranges = [], ov = 0, oi = 0;
      for (let B of tiles) {
        vb.set(B.vertexData(), ov * 36);
        for (let i = 0; i < B.idx.length; i++) ib[oi + i] = B.idx[i] + ov;
        ranges.push({ first: oi, count: B.idx.length, mn: B.mn.slice(), mx: B.mx.slice() }), ov += B.nv, oi += B.idx.length;
      }
      return { vb, ib, ranges, nv, ni };
    }
  }, sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  var neg = (a) => [-a[0], -a[1], -a[2]], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], norm = (a) => {
    let l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  };
  function rng(seed = 1) {
    let s = seed >>> 0 || 1;
    return () => (s ^= s << 13, s >>>= 0, s ^= s >>> 17, s ^= s << 5, s >>>= 0, s / 4294967296);
  }

  // src/render/lights.js
  var LightGrid = class {
    constructor(G2, lights, { x0 = -340, z0 = -600, size = 860, cell = 8, maxPer = 28 } = {}) {
      let gl = G2.gl;
      this.G = G2, this.n = lights.length;
      let gw = Math.ceil(size / cell);
      this.params = [x0, z0, 1 / cell, gw];
      let rows = Math.max(1, Math.ceil(lights.length * 4 / 1024)), rec = new Float32Array(1024 * rows * 4);
      lights.forEach((L, i) => {
        let o2 = i * 16;
        rec.set([L.pos[0], L.pos[1], L.pos[2], L.r], o2), rec.set([L.col[0], L.col[1], L.col[2], L.type + 8 * (L.flick || 0)], o2 + 4);
        let v = L.type === 2 ? L.axis : L.dir;
        rec.set([v[0], v[1], v[2], L.cosO], o2 + 8), rec.set([L.cosI, L.src || 0.05, 0, 0], o2 + 12);
      }), this.tex = G2.texture(1024, rows, "rgba32f", { filter: "nearest", data: rec });
      let cells = Array.from({ length: gw * gw }, () => []);
      lights.forEach((L, i) => {
        let ext = L.type === 2 ? Math.hypot(L.axis[0], L.axis[2]) : 0, r = L.r + ext, i0 = Math.max(0, Math.floor((L.pos[0] - r - x0) / cell)), i1 = Math.min(gw - 1, Math.floor((L.pos[0] + r - x0) / cell)), j0 = Math.max(0, Math.floor((L.pos[2] - r - z0) / cell)), j1 = Math.min(gw - 1, Math.floor((L.pos[2] + r - z0) / cell)), I = Math.max(L.col[0], L.col[1], L.col[2]);
        for (let j = j0; j <= j1; j++) for (let k = i0; k <= i1; k++) {
          let cx = x0 + (k + 0.5) * cell, cz = z0 + (j + 0.5) * cell, dx = Math.max(0, Math.abs(cx - L.pos[0]) - cell / 2 - ext), dz = Math.max(0, Math.abs(cz - L.pos[2]) - cell / 2 - ext), d2 = dx * dx + dz * dz;
          d2 > L.r * L.r || cells[j * gw + k].push([i, I / (d2 + 4)]);
        }
      });
      let total = 0, maxN = 0;
      for (let c of cells)
        c.sort((a, b) => b[1] - a[1]), c.length > maxPer && (c.length = maxPer), total += c.length, maxN = Math.max(maxN, c.length);
      let lrows = Math.max(1, Math.ceil(total / 1024)), list = new Uint32Array(1024 * lrows), grid = new Uint32Array(gw * gw * 2), o = 0;
      cells.forEach((c, ci) => {
        grid[ci * 2] = o, grid[ci * 2 + 1] = c.length;
        for (let [i] of c) list[o++] = i;
      }), this.grid = G2.texture(gw, gw, "rg32ui", { filter: "nearest", data: grid }), this.list = G2.texture(1024, lrows, "r32ui", { filter: "nearest", data: list }), this.stats = { lights: lights.length, entries: total, maxPerCell: maxN, avg: total / cells.filter((c) => c.length).length };
    }
    bindings() {
      return { uLights: this.tex, uLGrid: this.grid, uLList: this.list };
    }
  };

  // src/render/glsl/common.js
  var FRAME = `
#define PI 3.14159265
#define saturate(x) clamp(x,0.0,1.0)
uniform mat4 uVP;uniform mat4 uPrevVP;uniform mat4 uView;uniform mat4 uProj;uniform mat4 uInvVP;uniform mat4 uVPnj;
uniform vec3 uCam;uniform float uTime;uniform vec2 uRes;uniform vec2 uJit;uniform int uFrame;uniform float uNear;uniform float uFar;
uniform vec3 uSunDir;uniform vec3 uSunCol;uniform vec3 uAmbUp;uniform vec3 uAmbDn;
uniform vec3 uFogCol;uniform float uFogDen;uniform float uFogFall;
uniform float uWet;uniform float uRain;uniform float uNight;
uniform vec3 uSkyZen;uniform vec3 uSkyHor;uniform vec3 uSkyGlow;uniform float uCloud;uniform float uStars;uniform float uSunSize;
`, NOISE = `
float h11(float p){p=fract(p*.1031);p*=p+33.33;p*=p+p;return fract(p);}
float h12(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
vec2 h22(vec2 p){vec3 q=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));q+=dot(q,q.yzx+33.33);return fract((q.xx+q.yz)*q.zy);}
float h13(vec3 p){p=fract(p*.1031);p+=dot(p,p.zyx+31.32);return fract((p.x+p.y)*p.z);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(h12(i),h12(i+vec2(1,0)),u.x),mix(h12(i+vec2(0,1)),h12(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vn(p);p=mat2(1.6,1.2,-1.2,1.6)*p+vec2(1.7,9.2);a*=.5;}return s;}
float fbm2(vec2 p){return vn(p)*.65+vn(p*2.13+3.1)*.35;}
/* value noise with its gradient (for bump mapping without a second lookup) */
vec3 vnd(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f),du=6.*f*(1.-f);
  float a=h12(i),b=h12(i+vec2(1,0)),c=h12(i+vec2(0,1)),d=h12(i+vec2(1,1));
  return vec3(a+(b-a)*u.x+(c-a)*u.y+(a-b-c+d)*u.x*u.y,du*(vec2(b-a,c-a)+(a-b-c+d)*u.yx));}
/* cellular noise: x = distance to the nearest feature, y = distance to the cell edge, z = cell id */
vec3 voro(vec2 p){vec2 n=floor(p),f=fract(p);vec2 mg,mr;float md=8.,id=0.;
  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 g=vec2(i,j),o=h22(n+g),r=g+o-f;float d=dot(r,r);if(d<md){md=d;mr=r;mg=g;id=h12(n+g);}}
  float ed=8.;for(int j=-2;j<=2;j++)for(int i=-2;i<=2;i++){vec2 g=mg+vec2(i,j),o=h22(n+g),r=g+o-f;if(dot(mr-r,mr-r)>1e-5)ed=min(ed,dot(.5*(mr+r),normalize(r-mr)));}
  return vec3(sqrt(md),ed,id);}
/* interleaved gradient noise, animated with the frame (for dithered marches) */
float ign(vec2 px,int fr){px+=5.588238*float(fr&63);return fract(52.9829189*fract(.06711056*px.x+.00583715*px.y));}
`, PACK = `
vec2 octWrap(vec2 v){return (1.0-abs(v.yx))*vec2(v.x>=0.0?1.0:-1.0,v.y>=0.0?1.0:-1.0);}
vec2 octEnc(vec3 n){n/=(abs(n.x)+abs(n.y)+abs(n.z));n.xy=n.z>=0.0?n.xy:octWrap(n.xy);return n.xy;}
vec3 octDec(vec2 f){vec3 n=vec3(f,1.0-abs(f.x)-abs(f.y));float t=saturate(-n.z);n.x+=n.x>=0.0?-t:t;n.y+=n.y>=0.0?-t:t;return normalize(n);}
float lum(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
`, SKY = `
vec3 skyCol(vec3 d,bool clouds){
  float y=d.y;
  float hz=1.0-saturate(y*1.6);
  vec3 c=mix(uSkyZen,uSkyHor,pow(hz,2.2));
  /* the city's own light under the cloud deck, strongest near the horizon */
  c+=uSkyGlow*exp(-max(y,0.)*7.0);
  /* sun or moon: disc and halo */
  float sd=dot(d,uSunDir);
  float disc=smoothstep(cos(uSunSize*1.15),cos(uSunSize),sd);
  float halo=pow(saturate(sd),24.)*.06+pow(saturate(sd),280.)*.35;
  c+=uSunCol*(disc*(uNight>.5?6.:60.)*(1.0-uCloud*.85)+halo*(1.0-uCloud*.4));
  /* stars on clear nights */
  if(uStars>0.&&y>0.){vec2 g=d.xz/(y+.35)*90.;vec2 id=floor(g);float h=h12(id);if(h>.985){vec2 o=h22(id)-.5;float s=1.-smoothstep(0.,.12,length(fract(g)-.5-o*.6));
      c+=vec3(.8,.85,1.)*s*uStars*(h-.985)*60.*(.6+.4*sin(uTime*3.+h*90.))*saturate(y*4.);}}
  /* a cloud deck: thick in the rain, broken otherwise; lit from below by the city at night */
  if(clouds&&uCloud>0.&&y>-.02){vec2 uv=d.xz/(max(y,.01)+.12)*1.4+vec2(uTime*.006,uTime*.002);
    float n=fbm(uv*1.2)*.65+fbm(uv*3.7+7.)*.35;float cov=smoothstep(1.0-uCloud*.95,1.25-uCloud*.6,n+.25*uCloud);
    vec3 cc=mix(uSkyGlow*2.2+uSkyZen*.8,uSunCol*.35+uSkyHor*1.2,1.0-uNight)*(.55+.6*n);
    cc+=uSunCol*pow(saturate(sd),6.)*(1.0-uNight)*.5;
    c=mix(c,cc,cov*saturate(y*8.+.2));}
  if(y<0.)c=mix(c,uAmbDn*.6,saturate(-y*4.));
  return c;
}`, LIGHTING = `
struct Surf{vec3 P;vec3 N;vec3 V;vec3 diff;vec3 F0;float rough;float ao;float clear;float clearR;vec3 Nc;float spec;float trans;};
float D_GGX(float NoH,float a){float a2=a*a;float f=(NoH*a2-NoH)*NoH+1.0;return a2/(PI*f*f+1e-7);}
float V_GGX(float NoV,float NoL,float a){float a2=a*a;float gv=NoL*sqrt(NoV*NoV*(1.0-a2)+a2),gl=NoV*sqrt(NoL*NoL*(1.0-a2)+a2);return .5/max(gv+gl,1e-5);}
vec3 F_Sch(vec3 f0,float c){float p=1.0-c;float p2=p*p;return f0+(1.0-f0)*(p2*p2*p);}
/* one light arriving from direction L (unit, toward the light) with radiance E; aN widens the lobe for area lights */
vec3 brdfL(Surf s,vec3 L,vec3 E,float aN){
  float NoL=dot(s.N,L);
  vec3 c=vec3(0);
  if(NoL>0.0){
    vec3 H=normalize(L+s.V);float NoH=saturate(dot(s.N,H)),VoH=saturate(dot(s.V,H)),NoV=max(dot(s.N,s.V),1e-3);
    float a=max(s.rough*s.rough,.002);float an=max(a,aN);
    vec3 F=F_Sch(s.F0,VoH);
    vec3 sp=D_GGX(NoH,an)*(a*a)/(an*an)*V_GGX(NoV,NoL,a)*F*s.spec;
    c=(s.diff*(1.0-F)*(1.0/PI)+sp)*NoL;
    /* light passing through thin things (leaves, glass) */
  }
  if(s.trans>0.0)c+=s.diff*s.trans*saturate(-NoL)*(1.0/PI);
  if(s.clear>0.0){
    float NoLc=dot(s.Nc,L);
    if(NoLc>0.0){vec3 H=normalize(L+s.V);float NoH=saturate(dot(s.Nc,H)),VoH=saturate(dot(s.V,H)),NoV=max(dot(s.Nc,s.V),1e-3);
      float a=max(s.clearR*s.clearR,.002),an=max(a,aN);float Fc=F_Sch(vec3(.04),VoH).x*s.clear;
      c=c*(1.0-Fc)+D_GGX(NoH,an)*(a*a)/(an*an)*V_GGX(NoV,NoLc,a)*Fc*NoLc;}
  }
  return c*E;
}
/* smooth windowed inverse-square falloff */
float falloff(float d2,float r){float x=d2/(r*r);float w=saturate(1.0-x*x);return w*w/(d2+.25);}

/* ---- the clustered static lights: a world-space grid of cells, each with its list of lights ---- */
uniform highp sampler2D uLights;uniform highp usampler2D uLGrid;uniform highp usampler2D uLList;
uniform vec4 uGridP;uniform float uFlick[8];uniform float uLightsOn;
uniform vec4 uDyn[48];uniform int uNDyn;
vec4 LT(int i,int k){return texelFetch(uLights,ivec2((i*4+k)&1023,(i*4+k)>>10),0);}
/* evaluate one light record. Types: 0 point, 1 spot, 2 tube (line) */
vec3 evalRec(Surf s,vec4 A,vec4 B,vec4 C,vec4 D){
  int code=int(B.w+.5),type=code&7,fl=code>>3;
  vec3 Lc=A.xyz;float r=A.w;
  vec3 col=B.rgb*(fl>0?uFlick[fl&7]:1.0);
  if(type==2){
    /* tube light: representative point on the segment for the highlight, closest point for the diffuse */
    vec3 ax=C.xyz,P0=Lc-ax-s.P,Ld=2.0*ax;
    vec3 R=reflect(-s.V,s.N);float rd=dot(R,Ld);
    float t=saturate((dot(R,P0)*rd-dot(P0,Ld))/max(dot(Ld,Ld)-rd*rd,1e-4));
    float tc=saturate(-dot(P0,Ld)/max(dot(Ld,Ld),1e-4));
    vec3 Ls=P0+Ld*t,Lcl=P0+Ld*tc;float d2s=dot(Ls,Ls),d2c=dot(Lcl,Lcl);
    float len2=length(ax)*2.0,dc=sqrt(d2c);float spread=(2.0*dc/max(len2,.01))*atan(len2/(2.0*dc+1e-3));
    vec3 Lsn=Ls*inversesqrt(d2s),Lcn=Lcl/max(dc,1e-4);
    Surf sd=s;sd.spec=0.0;sd.clear=0.0;Surf ss=s;ss.diff=vec3(0);ss.trans=0.0;
    vec3 c=brdfL(sd,Lcn,col*falloff(d2c,r)*spread,0.0);
    c+=brdfL(ss,Lsn,col*falloff(d2s,r)*spread,D.y/(2.0*sqrt(d2s)+1e-3));
    return c;
  }
  vec3 Lv=Lc-s.P;float d2=dot(Lv,Lv);if(d2>r*r)return vec3(0);
  vec3 L=Lv*inversesqrt(d2);float att=falloff(d2,r);
  if(type==1){float cd=dot(-L,C.xyz);att*=smoothstep(C.w,D.x,cd);if(att<=0.0)return vec3(0);}
  return brdfL(s,L,col*att,D.y/(2.0*sqrt(d2)+1e-3));
}
vec3 clusterLights(Surf s){
  vec3 c=vec3(0);if(uLightsOn<=0.0)return c;
  ivec2 cell=ivec2(floor((s.P.xz-uGridP.xy)*uGridP.z));int gw=int(uGridP.w);
  if(cell.x<0||cell.y<0||cell.x>=gw||cell.y>=gw)return c;
  uvec2 oc=texelFetch(uLGrid,cell,0).xy;int o=int(oc.x),n=int(oc.y);
  for(int k=0;k<n;k++){int idx=o+k;int li=int(texelFetch(uLList,ivec2(idx&1023,idx>>10),0).x);
    c+=evalRec(s,LT(li,0),LT(li,1),LT(li,2),LT(li,3));}
  return c*uLightsOn;
}
/* dynamic lights (car lamps): three vec4 each [pos,r] [col,type] [dir,cosOuter] */
vec3 dynLights(Surf s){vec3 c=vec3(0);for(int i=0;i<uNDyn;i++){vec4 A=uDyn[i*3],B=uDyn[i*3+1],C=uDyn[i*3+2];c+=evalRec(s,A,B,C,vec4(C.w+.12,.03,0,0));}return c;}

/* ---- headlights: two lamps share one shadow map; the beam has a real low-beam cut-off ---- */
uniform vec4 uHL[5];  /* [posL,on] [posR,high] [dir,0] [right,0] [col,range] */
uniform mat4 uHLMat;uniform highp sampler2DShadow uHLSh;uniform float uHLShOn;
float beam(vec3 d,vec3 F,vec3 Rt,vec3 Up,float high){
  float z=dot(d,F);if(z<=.05)return 0.0;
  float x=dot(d,Rt)/z,y=dot(d,Up)/z;
  /* low beam: a sharp horizontal cut just below the horizon, kicked up on the kerb side */
  float cut=-.012+.022*smoothstep(-.02,.12,x);
  float lo=smoothstep(cut+.006,cut-.01,y);
  float hot=exp(-pow((x-.04)/.13,2.)-pow((y+.035)/.045,2.))*2.6;
  float wide=exp(-pow(x/.62,2.)-pow((y+.05)/.16,2.))*.8;
  float fore=exp(-pow(x/1.1,2.)-pow((y+.25)/.25,2.))*.25;
  float b=(hot+wide+fore)*lo;
  float hi=exp(-pow(x/.32,2.)-pow(y/.09,2.))*3.0+exp(-pow(x/.8,2.)-pow(y/.2,2.))*.6;
  b=mix(b,max(b,hi),high);
  return b*smoothstep(.05,.2,z);
}
float hlShadow(vec3 P,vec3 N){
  if(uHLShOn<=0.0)return 1.0;
  vec4 q=uHLMat*vec4(P+N*.05,1.0);if(q.w<=0.0)return 1.0;vec3 p=q.xyz/q.w*.5+.5;
  if(any(lessThan(p.xy,vec2(0)))||any(greaterThan(p.xy,vec2(1))))return 1.0;
  float b=.0004;vec2 tx=vec2(1.0/1024.0);float s=0.0;
  s+=texture(uHLSh,vec3(p.xy+tx*vec2(-.7,-.3),p.z-b));s+=texture(uHLSh,vec3(p.xy+tx*vec2(.3,-.7),p.z-b));
  s+=texture(uHLSh,vec3(p.xy+tx*vec2(.7,.3),p.z-b));s+=texture(uHLSh,vec3(p.xy+tx*vec2(-.3,.7),p.z-b));
  return s*.25;
}
vec3 headlights(Surf s){
  if(uHL[0].w<=0.0)return vec3(0);
  vec3 c=vec3(0);vec3 F=uHL[2].xyz,Rt=uHL[3].xyz,Up=cross(Rt,F);float range=uHL[4].w;
  float sh=hlShadow(s.P,s.N);if(sh<=0.0)return c;
  for(int i=0;i<2;i++){vec3 Lp=uHL[i].xyz,Lv=Lp-s.P;float d2=dot(Lv,Lv);vec3 L=Lv*inversesqrt(d2);
    float b=beam(-L,F,Rt,Up,uHL[1].w);if(b<=0.0)continue;
    c+=brdfL(s,L,uHL[4].rgb*b*falloff(d2,range),0.0);}
  return c*sh*uHL[0].w;
}

/* ---- sun / moon: cascaded shadow maps ---- */
uniform highp sampler2DArrayShadow uCSM;uniform mat4 uCSMM[3];uniform vec4 uCSMS;uniform float uCSMOn;
float csmLayer(vec3 P,vec3 N,int k,float rot){
  vec4 q=uCSMM[k]*vec4(P+N*(.02+.03*float(k)*float(k)),1.0);vec3 p=q.xyz*.5+.5;
  if(any(lessThan(p,vec3(0.002)))||any(greaterThan(p,vec3(.998))))return -1.0;
  float b=.0002*(1.0+float(k)*1.5);float tx=uCSMS.w;float s=0.0;
  float cs=cos(rot),sn=sin(rot);mat2 R=mat2(cs,sn,-sn,cs);
  vec2 o0=R*vec2(-1.2,-.4)*tx,o1=R*vec2(.4,-1.2)*tx,o2=R*vec2(1.2,.4)*tx,o3=R*vec2(-.4,1.2)*tx;
  s+=texture(uCSM,vec4(p.xy+o0,float(k),p.z-b));s+=texture(uCSM,vec4(p.xy+o1,float(k),p.z-b));
  s+=texture(uCSM,vec4(p.xy+o2,float(k),p.z-b));s+=texture(uCSM,vec4(p.xy+o3,float(k),p.z-b));
  return s*.25;
}
float sunShadow(vec3 P,vec3 N,float vd,vec2 px){
  if(uCSMOn<=0.0)return 1.0;
  float rot=ign(px,uFrame)*6.283;
  int k=vd<uCSMS.x?0:vd<uCSMS.y?1:2;
  float s=csmLayer(P,N,k,rot);
  if(s<0.0&&k<2)s=csmLayer(P,N,k+1,rot);
  if(s<0.0)return 1.0;
  /* fade the last cascade out at its far edge */
  if(k==2)s=mix(s,1.0,smoothstep(uCSMS.z*.8,uCSMS.z,vd));
  return s;
}
/* ---- soft occlusion under cars: a rounded box on the ground per car ---- */
uniform vec4 uOcc[16];uniform int uNOcc;
float carOcc(vec3 P){
  float o=1.0;
  for(int i=0;i<uNOcc;i++){vec4 A=uOcc[i*2],B=uOcc[i*2+1];vec3 d=P-A.xyz;
    float h=d.y+A.w;if(h>1.3||h<-.4)continue;
    vec2 l=vec2(dot(d.xz,B.xy),dot(d.xz,vec2(-B.y,B.x)));
    vec2 q=abs(l)-B.zw*.82;float sd=length(max(q,0.))+min(max(q.x,q.y),0.);
    float k=1.0-smoothstep(-.5,.9+h*.6,sd);o*=1.0-k*.8*saturate(1.2-h);}
  return o;
}
`, SHADE = `
vec3 directAll(Surf s,vec2 px,float vd){
  vec3 c=vec3(0);
  if(dot(uSunCol,uSunCol)>1e-6){float sh=sunShadow(s.P,s.N,vd,px);if(sh>0.0)c+=brdfL(s,uSunDir,uSunCol*sh,.003);}
  c+=clusterLights(s)+dynLights(s)+headlights(s);
  return c;
}
vec3 ambient(Surf s){
  float up=s.N.y*.5+.5;return mix(uAmbDn,uAmbUp,up)*s.diff*s.ao;
}
`;

  // src/render/glsl/world.js
  var WORLD_VS = `
layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNrm;layout(location=2) in vec2 aUV;layout(location=3) in uvec4 aMat;layout(location=4) in vec4 aCol;
uniform mat4 uVP;uniform mat4 uVPnj;uniform mat4 uPrevVP;
out vec3 vP;out vec3 vN;out vec2 vUV;flat out uvec4 vMat;out vec4 vCol;out vec4 vCur;out vec4 vPrev;
void main(){vP=aPos;vN=aNrm;vUV=aUV;vMat=aMat;vCol=aCol;vec4 w=vec4(aPos,1.0);
  gl_Position=uVP*w;vCur=uVPnj*w;vPrev=uPrevVP*w;}`, DEPTH_VS = `
layout(location=0) in vec3 aPos;layout(location=3) in uvec4 aMat;uniform mat4 uVP;uniform mat4 uModel;flat out uint vId;
void main(){vId=aMat.x;gl_Position=uVP*(uModel*vec4(aPos,1.0));}`, DEPTH_FS = "flat in uint vId;out vec4 o;void main(){if(vId==7u||vId==12u)discard;o=vec4(0);}", WORLD_FS = FRAME + NOISE + PACK + SKY + LIGHTING + SHADE + `
in vec3 vP;in vec3 vN;in vec2 vUV;flat in uvec4 vMat;in vec4 vCol;in vec4 vCur;in vec4 vPrev;
layout(location=0) out vec4 oCol;
#ifndef PROBE
layout(location=1) out vec4 oNrm;layout(location=2) out vec2 oVel;
#endif
uniform samplerCube uProbe;uniform float uProbeLod;
uniform vec4 uRoad;       /* half width, lanes, track length, puddles */
uniform float uXw[8];     /* crosswalks across the track, at these distances */
uniform float uLit;       /* fraction of windows lit */
uniform float uSignal;    /* flashing amber phase */

/* the cotangent frame turns a height gradient in uv metres into a bent normal */
vec3 bump(vec3 N,vec3 P,vec2 uv,vec2 g){
  vec3 dp1=dFdx(P),dp2=dFdy(P);vec2 du1=dFdx(uv),du2=dFdy(uv);
  vec3 d2p=cross(dp2,N),d1p=cross(N,dp1);
  vec3 T=d2p*du1.x+d1p*du2.x,B=d2p*du1.y+d1p*du2.y;
  float im=inversesqrt(max(max(dot(T,T),dot(B,B)),1e-12));
  return normalize(N-(T*g.x+B*g.y)*im);
}
vec3 envBRDF(vec3 F0,float NoV,float r){const vec4 c0=vec4(-1,-.0275,-.572,.022),c1=vec4(1,.0425,1.04,-.04);vec4 rr=r*c0+c1;
  float a=min(rr.x*rr.x,exp2(-9.28*NoV))*rr.x+rr.y;vec2 AB=vec2(-1.04,1.04)*a+rr.zw;return F0*AB.x+AB.y;}
/* raindrops landing in standing water: expanding rings */
vec2 ripples(vec2 p,float t){
  vec2 g=vec2(0);
  for(int k=0;k<2;k++){vec2 q=p*(k==0?2.6:3.9)+float(k)*17.3;vec2 id=floor(q);
    for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 c=id+vec2(i,j);vec2 o=h22(c);float ph=fract(t*(.9+.5*o.x)+o.y*7.);
      vec2 dv=q-c-o;float dl=length(dv);float r=ph*.55;float x=dl-r;
      float w=sin(x*38.)*(1.0-ph)*(1.0-ph)*smoothstep(.09,.0,abs(x));g+=w*dv/max(dl,1e-3);}}
  return g*.09;
}
float aaStep(float e,float x){float w=fwidth(x)*.75+1e-4;return smoothstep(e-w,e+w,x);}

/* ---------------- materials ---------------- */
void water(inout Surf s,inout vec2 g,inout float ssr,vec2 wp,float porous,float shelter,float pudBias){
  float wet=uWet*shelter;if(wet<=0.0)return;
  float n=vn(wp*1.7);
  s.diff*=mix(1.0,.5+.25*(1.0-porous),wet*porous);
  s.rough=mix(s.rough,.06+.14*n,wet*.9);
  /* standing water in the low spots */
  float pm=fbm(wp*.09+11.3)*.8+vn(wp*.55)*.2+pudBias;
  float pud=smoothstep(.66,.70,pm+uRoad.w*.18-.12)*wet*uRoad.w;
  if(pud>0.0){s.diff*=1.0-.6*pud;s.rough=mix(s.rough,.012,pud);g*=1.0-pud;}
  /* rings finer than a pixel would only sparkle: fade them with the pixel footprint */
  float fp=length(fwidth(wp));float near=saturate(1.0-fp*22.);
  if(uRain>0.0&&near>0.0)g+=ripples(wp,uTime)*(pud+.25*wet)*uRain*near;
  ssr=max(ssr,wet*.85+pud);
}
void matRoad(inout Surf s,inout vec3 em,inout float ssr,inout vec2 g,vec2 uv,uvec4 m){
  float sx=uv.x,d=uv.y,ad=abs(d),hw=uRoad.x;
  vec3 gr=vnd(uv*13.);float g2=fbm(uv*vec2(.06,.2));
  vec3 alb=vec3(.075,.075,.08)*(.75+.5*gr.x)*(.82+.36*g2);float rough=.86-.14*gr.x;
  float fpr=length(fwidth(uv));g+=gr.yz*13.*.0012*saturate(1.0-fpr*9.);
  /* polished wheel tracks in each lane */
  float lc=mod(ad,3.25)-1.625,trk=exp(-pow((abs(lc)-.85)/.38,2.));
  alb*=1.0-.22*trk;rough-=.14*trk;
  /* resurfaced patches */
  float seg=floor(sx/31.),pa=h11(seg*3.1);
  if(pa>.55){float d0=(h11(seg*5.7)-.5)*2.*hw,w=1.5+h11(seg*9.1)*3.5,s0=h11(seg*2.3)*20.,l=4.+h11(seg*4.4)*9.;
    float bx=max(abs(d-d0)-w*.5,abs(mod(sx,31.)-s0-l*.5)-l*.5);
    if(bx<0.0){alb*=.78;rough=.8;}
    float edge=1.0-smoothstep(.02,.06,abs(bx));alb=mix(alb,vec3(.02),edge*.85);rough=mix(rough,.35,edge);}
  /* tar-sealed seams and cracks */
  float tar=1.0-smoothstep(.015,.05,abs(ad-3.25+.05*sin(sx*.27)));
  float ts=floor(sx/23.),tp=h11(ts*7.1)*23.;
  float tc=abs(mod(sx,23.)-tp+.3*sin(d*1.1+ts)+.08*sin(d*5.3));
  tar=max(tar,(1.0-smoothstep(.012,.04,tc))*step(.3,h11(ts*3.3)));
  vec3 vc=voro(uv*1.3);float alli=smoothstep(.6,.7,fbm(uv*.04+3.));
  tar=max(tar,(1.0-smoothstep(.008,.035,vc.y))*alli);
  alb=mix(alb,vec3(.018,.018,.02),tar*.9);rough=mix(rough,.32,tar);g+=vec2(0,0)*tar;
  /* oil drips down the middle of each lane */
  float oil=smoothstep(.55,.85,vn(uv*vec2(.8,3.)))*exp(-pow(lc/.35,2.))*.6;alb*=1.0-oil*.5;rough-=oil*.25;
  /* manhole covers */
  float ms=floor(sx/41.),mp=h11(ms*1.9)*41.,md=(h11(ms*8.3)>.5?1.0:-1.0)*(1.625+(h11(ms*6.1)-.5)*1.2);
  vec2 mv=vec2(mod(sx,41.)-mp,d-md);float mr=length(mv);
  if(mr<.36){float rings=step(.5,fract(mr*18.))*step(mr,.31)+step(.5,fract((mv.x+mv.y)*9.))*step(mr,.2);
    alb=vec3(.05,.045,.04)*(1.0+.4*rings);rough=.45+.2*rings;s.F0=vec3(.05);g+=vec2(rings*.002);}
  else if(mr<.42){alb=vec3(.03);rough=.6;}
  /* paint: centre double yellow, dashed lane lines, edge lines, crosswalks, start line */
  vec3 pc=vec3(0);float pa1=0.0;
  float cy=min(abs(d-.13),abs(d+.13));float y1=1.0-aaStep(.065,cy);
  float dash=step(fract(sx/9.),.34),wl=(1.0-aaStep(.07,abs(ad-3.25)))*dash;
  float el=1.0-aaStep(.08,abs(ad-(hw-.32)));
  float L=uRoad.z;float xw=0.0;
  for(int i=0;i<8;i++){float x=uXw[i];if(x<0.0)continue;float ds=mod(sx-x+L*.5,L)-L*.5;if(abs(ds)<2.){xw=max(xw,step(.5,fract(d/1.1))*(1.0-aaStep(1.8,abs(ds)))*step(ad,hw-.6));}}
  float ds0=mod(sx+L*.5,L)-L*.5;
  float chk=(ds0>-1.6&&ds0<0.0)?step(.5,fract(floor(d/.4)*.5+floor(ds0/.4)*.5)):0.0;
  float start=(ds0>=0.0&&ds0<.5)?1.0:0.0;
  float grid=0.0;if(ds0<-4.&&ds0>-60.){float gs=mod(-ds0,8.),side=d>0.0?1.0:-1.0;
    grid=(1.0-aaStep(.06,abs(gs-1.)))*step(abs(ad-3.2),1.3)+(1.0-aaStep(.06,abs(ad-1.9)))*step(gs,2.2)*step(1.0,gs)*step(0.0,d*side);}
  float white=max(max(wl,el),max(xw,max(start,max(chk,grid))));
  float wear=smoothstep(.25,.75,fbm(uv*vec2(1.1,3.))+.35*trk*(1.0-start));
  float py=y1*(1.0-wear*.8),pw=white*(1.0-wear*.85);
  if(py+pw>0.0){vec3 c=py>pw?vec3(.62,.45,.06):vec3(.72);float a=max(py,pw);
    alb=mix(alb,c,a);rough=mix(rough,.55,a);s.ao=1.0;g+=gr.yz*13.*.0004*a;s.spec=mix(s.spec,1.0,a);em+=vec3(0);
    s.clear=-a;  /* marks the paint as retroreflective for the headlights */
  }
  s.diff=alb;s.rough=rough;
  water(s,g,ssr,s.P.xz,1.0,vCol.r,smoothstep(hw-1.,hw+.5,ad)*.35+(1.0-trk)*.03);
}
void matSidewalk(inout Surf s,inout float ssr,inout vec2 g,vec2 uv){
  vec2 p=uv/1.2,f=fract(p),id=floor(p);float j=min(min(f.x,1.-f.x),min(f.y,1.-f.y));
  float jo=1.0-smoothstep(.01,.03,j);float sv=h12(id);
  vec3 alb=vec3(.36,.35,.34)*(.8+.3*sv)*(.85+.3*vn(uv*4.));
  alb*=1.0-jo*.55;float spots=smoothstep(.78,.82,vn(uv*6.3+sv*9.));alb*=1.0-spots*.35;
  s.diff=alb;s.rough=.82-.1*sv;g+=vec2(f.x<.5?-1.:1.,f.y<.5?-1.:1.)*jo*.02*(j<.03?1.:0.);
  water(s,g,ssr,uv,.8,vCol.r,-.15);
}
void matConcrete(inout Surf s,inout float ssr,inout vec2 g,vec2 uv,uvec4 m){
  int v=int(m.y);float n=fbm(uv*vec2(.7,1.4)),n2=vn(uv*9.);
  vec3 alb=vec3(.42,.41,.39)*(.75+.35*n)*(.9+.2*n2);float rough=.88;
  if(v==1){/* jersey barrier: road grime at the foot, joints every 4 m, reflectors */
    alb*=mix(.45,1.0,smoothstep(.0,.55,uv.y));float jn=abs(fract(uv.x/4.)-.5)*4.;
    alb*=1.0-(1.0-smoothstep(.01,.03,jn))*.6;
    float rf=step(abs(fract(uv.x/8.)-.5)*8.,.12)*step(abs(uv.y-.62),.05);
    if(rf>0.0){alb=vec3(.9,.7,.1);rough=.3;s.clear=-1.0;}
    /* rain runs down the face */
    alb*=1.0-.25*uWet*smoothstep(.4,.9,vn(vec2(uv.x*3.,uv.y*.3)));
  }else if(v==2){/* tunnel wall: glazed tiles above a grimy dado */
    vec2 t=uv/vec2(.3,.15);vec2 tf=fract(t);float tj=min(min(tf.x,1.-tf.x)*2.,min(tf.y,1.-tf.y));
    float dado=step(uv.y,1.2);
    vec3 tc=mix(vec3(.78,.78,.72),vec3(.32,.36,.3),dado)*(.85+.15*h12(floor(t)));
    tc*=mix(1.0,.55,smoothstep(1.5,.0,uv.y)*(.6+.4*n));
    alb=mix(tc,vec3(.15),1.0-smoothstep(.02,.06,tj));rough=mix(.18,.7,dado)+.3*(1.0-smoothstep(.02,.06,tj));
  }else if(v==3){/* painted concrete pillar band */
    alb=mix(alb,vec3(.5,.42,.12),step(fract(uv.y/1.2),.5)*step(uv.y,1.2));
  }
  s.diff=alb;s.rough=rough;g+=vec2(n2-.5)*.004;
  if(s.N.y>.5)water(s,g,ssr,uv,.6,vCol.r,-.2);else{s.diff*=1.0-.35*uWet;s.rough=mix(s.rough,.5,uWet*.5);}
}
/* building facades: floors, bays, windows lit at night, storefronts at street level */
void matFacade(inout Surf s,inout vec3 em,inout float ssr,inout vec2 g,vec2 uv,uvec4 m,vec4 col){
  int style=int(m.y);float sd=float(m.z);int fl=int(m.w)&15;float fh=3.0+float(int(m.w)>>4)*.1;
  float bw=1.0+col.a*3.0;vec3 tint=col.rgb;
  float u=uv.x,v=uv.y;float gf=(fl&1)!=0?4.8:0.0;
  vec3 alb=tint;float rough=.85;float glass=0.0;vec3 wcol=vec3(0);
  float nB=vn(uv*vec2(.5,.25)+sd);
  if(v<gf){
    /* storefront: units of four bays; glass, a door, a sign band, closed ones shuttered */
    float uw=bw*4.,ui=floor(u/uw),uf=fract(u/uw)*uw;float hs=h12(vec2(ui,sd*3.1));
    float open=step(.25,hs);
    vec3 shop=vec3(1.0,.72,.42);if(hs>.6)shop=vec3(.85,.95,1.);if(hs>.85)shop=vec3(1.,.55,.85);
    float side=min(uf,uw-uf);float frame=1.0-step(.25,side);
    if(v<.35){alb=vec3(.3,.29,.28);rough=.7;}
    else if(v<3.3){
      if(frame>0.0){alb=vec3(.04);rough=.4;}
      else{
        if(open>0.0){glass=1.0;float glow=.5+.5*smoothstep(.4,3.2,v);float shelves=step(.5,fract(v*1.6))*step(v,2.2)*.35;
          wcol=shop*(1.6*glow-shelves)*uNight*(.7+.6*hs);
          if(abs(fract(uf/1.9)-.5)>.48){glass=0.0;alb=vec3(.05);rough=.35;wcol=vec3(0);}}
        else{float rib=abs(fract(v*6.)-.5);alb=vec3(.38,.38,.4)*(.7+.3*rib)*(.7+.3*vn(uv*vec2(2.,.5)+hs*9.));rough=.5;g+=vec2(0,(rib-.25))*.0;
          /* tags on the shutters */
          float tag=smoothstep(.55,.6,fbm(uv*vec2(.9,1.4)+hs*13.))*step(.6,v)*step(v,2.6);alb=mix(alb,.5+.5*cos(6.28*(hs+vec3(0,.33,.67))+fbm(uv*2.)*3.),tag*.8);}
      }
    }
    else if(v<4.4){/* the sign band */
      float sb=step(.3,side)*step(3.45,v)*step(v,4.3);
      vec3 sc=.5+.5*cos(6.28*(hs*1.7+vec3(0,.33,.67)));
      if(sb>0.0&&open>0.0){vec2 cc=vec2((uf-.3)/.32,(v-3.55)/.1);vec2 ci=floor(cc);float on=step(.45,h12(ci+hs*31.))*step(0.,cc.y)*step(cc.y,7.)*step(.15,fract(cc.x/6.))*step(ci.x,(uw-.6)/.32-1.);
        alb=sc*.35;em+=mix(sc*.25,vec3(1.,.95,.85),on)*(1.5+on*2.5)*uNight*(.4+.6*h12(vec2(hs,3.)));rough=.4;}
      else{alb=vec3(.12,.11,.1);rough=.6;}
    }else{alb=tint*.8;}
    if(v>=4.4&&v<4.8){alb=vec3(.2);rough=.5;}
  }else{
    float vv=v-gf;float fi=floor(vv/fh),fv=fract(vv/fh)*fh;float bi=floor(u/bw),bu=fract(u/bw)*bw;
    float r1=h12(vec2(bi,fi)+sd*13.71),r2=h12(vec2(fi,bi*1.7)+sd*5.3);
    if(style==0){/* brick with punched windows */
      vec2 bk=vec2(u/.25+step(.5,fract(v/.15))*.5,v/.075);vec2 bf=fract(bk);float mort=1.0-smoothstep(.06,.12,min(min(bf.x,1.-bf.x)*3.3,min(bf.y,1.-bf.y)));
      float fade=saturate(1.0-length(fwidth(bk))*.6);
      alb=tint*(.75+.4*h12(floor(bk)))*mix(1.0,.6+.4*nB,1.0)*(1.0-mort*.45*fade);g+=vec2(0,mort*.0)*fade;rough=.9;
      float wx=abs(bu-bw*.5),wy=fv-fh*.5+.15;float ww=bw*.27,wh=fh*.3;
      if(wx<ww+.08&&abs(wy)<wh+.08){alb=vec3(.42,.4,.36);rough=.7;}
      if(wy<-wh-.04&&wy>-wh-.16&&wx<ww+.15){alb=vec3(.5,.48,.44);rough=.6;}
      if(wx<ww&&abs(wy)<wh){glass=1.0;}
    }else if(style==1){/* concrete with ribbon windows */
      alb=tint*(.8+.25*nB);rough=.85;float jn=min(abs(fv-.02),abs(bu-.01));alb*=1.0-(1.0-smoothstep(.0,.03,jn))*.4;
      if(fv>fh*.38&&fv<fh*.9&&abs(bu-bw*.5)<bw*.46)glass=1.0;
    }else if(style==2){/* glass curtain wall */
      float mx=min(bu,bw-bu),my=min(fv,fh-fv);
      if(mx<.05||my<.05){alb=vec3(.08,.085,.09);rough=.35;s.F0=vec3(.5);s.diff=vec3(0);}
      else if(fv<fh*.22){alb=tint*.3;rough=.2;glass=.6;}
      else glass=1.0;
    }else if(style==3){/* painted stucco, tall windows with frames */
      alb=tint*(.82+.25*nB)*(.92+.08*vn(uv*7.));rough=.88;
      float wx=abs(bu-bw*.5),wy=fv-fh*.52;float ww=bw*.24,wh=fh*.33;
      if(wx<ww+.07&&abs(wy)<wh+.07){alb=vec3(.85,.84,.8);rough=.5;}
      if(wx<ww&&abs(wy)<wh)glass=1.0;
      if(wx>ww+.07&&wx<ww+.42&&abs(wy)<wh&&r2>.55){alb=tint*.55;rough=.6;}
    }else{/* corrugated metal */
      float rib=abs(fract(u*4.)-.5);alb=tint*(.7+.3*rib)*(.75+.3*nB);rough=.45;s.F0=vec3(.35);g+=vec2((rib-.25)*.03,0);
      if(fv>fh*.55&&fv<fh*.85&&r1<.25)glass=1.0;
    }
    /* night: some windows lit; offices light whole floors */
    if(glass>0.0){
      float fr=uLit*(style==2?.55:1.0);
      bool on=(style==2)?(h11(fi+sd*7.)<fr*.7?r1<.88:r1<fr*.25):(r1<fr);
      if(on){vec3 wc=mix(vec3(1.,.62,.3),vec3(.8,.9,1.),step(.62,r2))*mix(.55,1.,h11(r1*91.));if(r2>.94)wc=vec3(.45,.6,1.)*(.6+.4*sin(uTime*7.+r1*40.)*sin(uTime*3.1));
        float blinds=r2>.3&&r2<.5?.55+.45*step(.4,fract(fv*9.)):1.0;
        float grad=mix(.55,1.15,saturate(fv/fh*1.3));
        wcol=wc*blinds*grad*(.35+.65*r1/max(fr,.05))*.7;}
    }
    /* rain stains under the sills */
    alb*=1.0-uWet*.2*smoothstep(.5,.8,vn(vec2(u*2.1,v*.15+sd)));
  }
  s.diff=alb;s.rough=rough;
  if(glass>0.0){s.diff=mix(s.diff,vec3(.012,.014,.016),glass);s.rough=mix(s.rough,.04,glass);s.F0=mix(s.F0,vec3(.045),glass);
    em+=wcol*glass;ssr=max(ssr,glass);}
  else if(uWet>0.0){s.diff*=1.0-.25*uWet;s.rough=mix(s.rough,.45,uWet*.5);}
}

void main(){
  vec3 N=normalize(vN);if(!gl_FrontFacing)N=-N;
  Surf s;s.P=vP;s.V=normalize(uCam-vP);s.N=N;s.diff=vec3(.5);s.F0=vec3(.04);s.rough=.8;s.ao=1.0;s.clear=0.0;s.clearR=.05;s.Nc=N;s.spec=1.0;s.trans=0.0;
  vec3 em=vec3(0);float ssr=0.0;vec2 g=vec2(0);uint id=vMat.x;vec2 uv=vUV;
  float vd=length(uCam-vP);
  if(id==0u)matRoad(s,em,ssr,g,uv,vMat);
  else if(id==1u){float st=step(.5,fract(uv.x/2.));s.diff=mix(vec3(.5,.07,.05),vec3(.62),st)*(.8+.3*vn(uv*7.));s.rough=.6;water(s,g,ssr,s.P.xz,.4,vCol.r,-.3);}
  else if(id==2u){s.diff=vec3(.3,.3,.29)*(.8+.3*fbm(uv*2.));s.rough=.8;water(s,g,ssr,s.P.xz,.8,vCol.r,.3);}
  else if(id==3u)matSidewalk(s,ssr,g,uv);
  else if(id==4u)matConcrete(s,ssr,g,uv,vMat);
  else if(id==5u)matFacade(s,em,ssr,g,uv,vMat,vCol);
  else if(id==6u){s.diff=vec3(.16,.155,.15)*(.7+.5*fbm(uv*.8));s.rough=.92;s.diff*=1.0-.3*uWet;}
  else if(id==7u){
    float I=float(vMat.y)*.5;int fc=int(vMat.z);float f=fc>0?uFlick[fc&7]:1.0;float on=vMat.w==1u?uNight:1.0;
    float NoV=saturate(dot(N,s.V));vec3 c=vCol.rgb;
    em=mix(c,mix(c,vec3(1),.45),pow(NoV,2.))*I*f*on;
    s.diff=c*.2;s.rough=.25;
  }
  else if(id==8u){float r=float(vMat.y)/255.,mt=float(vMat.z)/255.;vec3 c=vCol.rgb;
    s.diff=c*(1.0-mt);s.F0=mix(vec3(.04),c,mt);s.rough=r;
    if(vMat.w==1u){vec2 rv=fract(uv*vec2(2.5,4.));float rv1=1.0-smoothstep(.06,.1,length(rv-.5));g+=(rv-.5)*rv1*.02;s.diff*=.9+.2*vn(uv*3.);}
    s.diff*=1.0-.3*uWet;s.rough=mix(s.rough,max(.1,s.rough*.5),uWet*.6);}
  else if(id==9u){s.diff=vec3(.01);s.F0=vec3(.045);s.rough=.03;em=vCol.rgb*float(vMat.y)*.05*uNight;ssr=1.0;}
  else if(id==10u){vec3 c=vCol.rgb;float I=float(vMat.y)*.1;em=c*I*(.75+.25*vn(uv*3.))*uNight;s.diff=c*.3;s.rough=.25;}
  else if(id==11u){float n=vn(uv*11.),f=fbm(uv*.12);s.diff=vec3(.07,.07,.075)*(.75+.4*n)*(.8+.4*f);s.rough=.86;
    float cl=(1.0-aaStep(.06,abs(uv.y)))*step(fract(uv.x/6.),.5)*(1.0-.6*smoothstep(.3,.7,fbm(uv*1.3)));s.diff=mix(s.diff,vec3(.6,.46,.08),cl);
    water(s,g,ssr,s.P.xz,1.0,vCol.r,.1);}
  else if(id==12u){vec2 q=uv*vec2(14.,14.);vec2 f=abs(fract(vec2(q.x+q.y,q.x-q.y)*.5)-.5);float w=min(f.x,f.y);
    if(w>.07)discard;s.diff=vec3(.25);s.F0=vec3(.6);s.rough=.4;}
  else if(id==13u){s.diff=vCol.rgb*.2;s.rough=float(vMat.y)/255.;}
  else if(id==14u){s.diff=vCol.rgb;s.F0=vec3(.5);s.rough=.25;}
  else if(id==15u){int lamp=int(vMat.y);float on=lamp==1?step(.5,fract(uSignal)):0.0;vec3 c=lamp==0?vec3(1.,.08,.05):lamp==1?vec3(1.,.55,.05):vec3(.1,1.,.5);
    em=c*(on*14.+.08);s.diff=vec3(.02);s.rough=.2;}
  s.ao*=vCol.a>0.0&&id!=5u?vCol.a:1.0;
  if(dot(g,g)>0.0)s.N=bump(s.N,s.P,uv,g);
  /* specular anti-aliasing: widen the lobe where the normal changes within a pixel */
  {vec3 dx=dFdx(s.N),dy=dFdy(s.N);float var=.25*(dot(dx,dx)+dot(dy,dy));float a2=s.rough*s.rough;s.rough=sqrt(sqrt(saturate(a2*a2+min(2.*var,.2))));}
  float retro=0.0;if(s.clear<0.0){retro=-s.clear;s.clear=0.0;}
  float occ=carOcc(s.P);s.ao*=occ;
  vec3 col=em;
  if(id!=7u){
    col+=directAll(s,gl_FragCoord.xy,vd)*mix(1.0,occ,.7)+ambient(s);
    /* retroreflective paint glows back at the headlights */
    if(retro>0.0&&uHL[0].w>0.0){vec3 hp=(uHL[0].xyz+uHL[1].xyz)*.5;vec3 L=normalize(hp-s.P);float b=beam(-L,uHL[2].xyz,uHL[3].xyz,cross(uHL[3].xyz,uHL[2].xyz),uHL[1].w);
      col+=s.diff*uHL[4].rgb*b*retro*pow(saturate(dot(L,s.V)),40.)*falloff(dot(hp-s.P,hp-s.P),uHL[4].w)*4.0;}
    float NoV=max(dot(s.N,s.V),1e-3);vec3 ew=envBRDF(s.F0,NoV,s.rough);
    float so=saturate(pow(NoV+s.ao,exp2(-16.*s.rough-1.))-1.+s.ao);
#ifdef PROBE
    vec3 R=reflect(-s.V,s.N);col+=skyCol(R,false)*ew*so*s.spec*.6;
#else
    if(ssr<=0.0||s.rough>.45){vec3 R=reflect(-s.V,s.N);col+=textureLod(uProbe,R,s.rough*uProbeLod).rgb*ew*so*s.spec;ssr=0.0;}
#endif
    ssr=ssr>0.0?lum(ew)*so:0.0;
  }
#ifdef PROBE
  float fogT=exp(-uFogDen*vd);col=col*fogT+uFogCol*(1.0-fogT);
  oCol=vec4(col,1.0);
#else
  oCol=vec4(col,1.0);
  oNrm=vec4(octEnc(s.N),s.rough,ssr);
  oVel=(vCur.xy/vCur.w-vPrev.xy/vPrev.w)*.5;
#endif
}`, SKY_FS = FRAME + NOISE + PACK + SKY + `
in vec2 vT;layout(location=0) out vec4 oCol;
#ifndef PROBE
layout(location=1) out vec4 oNrm;layout(location=2) out vec2 oVel;
#endif
void main(){
  vec4 q=uInvVP*vec4(vT*2.-1.,1.,1.);vec3 d=normalize(q.xyz/q.w-uCam);
  vec3 c=skyCol(d,true);
  float fogT=exp(-uFogDen*900.*saturate(1.0-d.y*2.));c=c*mix(1.0,fogT,.85)+uFogCol*(1.0-fogT)*.85;
  oCol=vec4(c,1.0);
#ifndef PROBE
  oNrm=vec4(0,0,1,0);
  vec4 cp=uVPnj*vec4(uCam+d*5000.,1.),pp=uPrevVP*vec4(uCam+d*5000.,1.);
  oVel=(cp.xy/cp.w-pp.xy/pp.w)*.5;
#endif
}`, FS_VS = "out vec2 vT;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));vT=p;gl_Position=vec4(p*2.0-1.0,1.0,1.0);}";

  // src/render/glsl/post.js
  var DEPTH = `
uniform highp sampler2D uDepth;
vec3 wpos(vec2 uv,float d){vec4 q=uInvVP*vec4(uv*2.-1.,d*2.-1.,1.);return q.xyz/q.w;}
float linz(float d){float z=d*2.-1.;return 2.*uNear*uFar/(uFar+uNear-z*(uFar-uNear));}
`, SSR_FS = FRAME + NOISE + PACK + DEPTH + `
in vec2 vT;out vec4 o;
uniform sampler2D uNrm;uniform sampler2D uPrev;uniform samplerCube uProbe;uniform float uResScale;uniform float uProbeLod;uniform float uPrevLod;uniform float uHasPrev;
void main(){
  vec2 uv=vT;vec4 nr=texture(uNrm,uv);
  if(nr.w<=0.0){o=vec4(0);return;}
  float d=texture(uDepth,uv).r;if(d>=1.0){o=vec4(0);return;}
  vec3 P=wpos(uv,d),N=octDec(nr.xy),V=normalize(uCam-P);float rough=nr.z,a=max(rough*rough,.001);
  /* the mirror direction, nudged a little each frame so TAA smooths the edges; the gloss comes from
     reading a blurrier level of last frame's image, sized to the reflection cone where the ray lands */
  vec2 xi=vec2(ign(gl_FragCoord.xy,uFrame),ign(gl_FragCoord.xy+vec2(31.,17.),uFrame+3))-.5;
  vec3 up=abs(N.y)<.99?vec3(0,1,0):vec3(1,0,0),tx=normalize(cross(up,N)),ty=cross(N,tx);
  vec3 Nj=normalize(N+(tx*xi.x+ty*xi.y)*a*.35);
  vec3 R=reflect(-V,Nj);if(dot(R,N)<=.02)R=reflect(-V,N);
  vec3 env=textureLod(uProbe,R,rough*uProbeLod).rgb;
  /* march: steps grow as the ray gets longer */
  float t=.12+.25*ign(gl_FragCoord.xy+vec2(7.,3.),uFrame+11),dt=.2;vec2 huv=vec2(-1);float hitT=0.0;vec4 ch=vec4(1);
  for(int i=0;i<30;i++){
    vec3 X=P+R*t;vec4 c=uVP*vec4(X,1.);if(c.w<uNear)break;vec2 s=c.xy/c.w*.5+.5;
    if(any(lessThan(s,vec2(0)))||any(greaterThan(s,vec2(1))))break;
    float sz=linz(texture(uDepth,s).r),rz=c.w,th=max(.25,t*.06);
    if(rz>sz+.02&&rz-sz<th){
      /* refine between the last two steps */
      float t0=t-dt,t1=t;for(int k=0;k<5;k++){float tm=(t0+t1)*.5;vec4 cm=uVP*vec4(P+R*tm,1.);vec2 sm=cm.xy/cm.w*.5+.5;
        if(cm.w>linz(texture(uDepth,sm).r))t1=tm;else t0=tm;}
      ch=uVP*vec4(P+R*t1,1.);huv=ch.xy/ch.w*.5+.5;hitT=t1;break;}
    dt=max(.2,t*.16);t+=dt;if(t>80.)break;
  }
  vec3 col=env;
  if(huv.x>=0.0&&uHasPrev>0.0){
    /* the hit, as the last frame saw it */
    vec3 Xh=wpos(huv,texture(uDepth,huv).r);vec4 pc=uPrevVP*vec4(Xh,1.);vec2 puv=pc.xy/pc.w*.5+.5;
    vec2 e=smoothstep(0.0,.08,puv)*smoothstep(1.0,.92,puv);float conf=e.x*e.y*(1.0-smoothstep(.35,.5,rough));
    /* cone footprint at the hit, in pixels of the half-resolution pyramid */
    float rad=hitT*a*1.6,vz=max(ch.w,uNear);float px=rad*uProj[1][1]*uRes.y*.5/vz/uResScale*.5;
    float lod=clamp(log2(max(px,1.0)),0.0,uPrevLod);
    vec3 hc=textureLod(uPrev,puv,lod).rgb;
    col=mix(env,hc,conf);
  }
  o=vec4(min(col,vec3(60.)),1.0);
}`, FOG_FS = FRAME + NOISE + PACK + DEPTH + LIGHTING + `
in vec2 vT;out vec4 o;
uniform vec3 uFogAmb;uniform float uFogSteps;uniform float uFogLights;
float hg(float c,float g){float g2=g*g;return (1.0-g2)/(4.*PI*pow(1.0+g2-2.0*g*c,1.5));}
/* light from the static lights that scatters toward the eye at X (no shadows; the cones read in the haze) */
vec3 scatterLights(vec3 X,vec3 rd){
  vec3 c=vec3(0);if(uLightsOn<=0.0)return c;
  ivec2 cell=ivec2(floor((X.xz-uGridP.xy)*uGridP.z));int gw=int(uGridP.w);
  if(cell.x<0||cell.y<0||cell.x>=gw||cell.y>=gw)return c;
  uvec2 oc=texelFetch(uLGrid,cell,0).xy;int n=min(int(oc.y),int(uFogLights));
  for(int k=0;k<n;k++){int idx=int(oc.x)+k;int li=int(texelFetch(uLList,ivec2(idx&1023,idx>>10),0).x);
    vec4 A=LT(li,0),B=LT(li,1),C=LT(li,2),D=LT(li,3);int code=int(B.w+.5),type=code&7,fl=code>>3;
    vec3 Lp=A.xyz;if(type==2){vec3 ax=C.xyz;float tt=clamp(dot(X-Lp,ax)/max(dot(ax,ax),1e-4),-1.,1.);Lp+=ax*tt;}
    vec3 Lv=Lp-X;float d2=dot(Lv,Lv);if(d2>A.w*A.w)continue;vec3 L=Lv*inversesqrt(d2);
    float att=falloff(d2,A.w);if(type==1)att*=smoothstep(C.w,D.x,dot(-L,C.xyz));
    c+=B.rgb*(fl>0?uFlick[fl&7]:1.0)*att*hg(dot(rd,L),.35);}
  return c*uLightsOn;
}
float csmVis(vec3 X){if(uCSMOn<=0.0)return 1.0;
  for(int k=0;k<3;k++){vec4 q=uCSMM[k]*vec4(X,1.);vec3 p=q.xyz*.5+.5;if(all(greaterThan(p,vec3(.001)))&&all(lessThan(p,vec3(.999))))return texture(uCSM,vec4(p.xy,float(k),p.z-.0004));}
  return 1.0;}
float hlVis(vec3 X){if(uHLShOn<=0.0)return 1.0;vec4 q=uHLMat*vec4(X,1.);if(q.w<=0.0)return 0.0;vec3 p=q.xyz/q.w*.5+.5;
  if(any(lessThan(p.xy,vec2(0)))||any(greaterThan(p.xy,vec2(1))))return 0.0;return texture(uHLSh,vec3(p.xy,p.z-.0006));}
void main(){
  float d=texture(uDepth,vT).r;vec3 P=wpos(vT,min(d,.99999));vec3 rd=normalize(P-uCam);
  float tMax=d>=1.0?160.:min(length(P-uCam),160.);
  int N=int(uFogSteps);float jit=ign(gl_FragCoord.xy,uFrame);
  vec3 S=vec3(0);float Tr=1.0,tPrev=0.0;
  float sunPh=hg(dot(rd,uSunDir),.55)*.8+hg(dot(rd,uSunDir),-.2)*.2;
  vec3 hlF=uHL[2].xyz,hlR=uHL[3].xyz,hlU=cross(hlR,hlF);vec3 hlP=(uHL[0].xyz+uHL[1].xyz)*.5;
  for(int i=0;i<64;i++){if(i>=N)break;
    float f=(float(i)+jit)/float(N);float t=tMax*f*f;float dt=t-tPrev;tPrev=t;
    vec3 X=uCam+rd*t;
    float h=max(X.y,0.0);float dens=uFogDen*exp(-h*uFogFall);
    vec3 Li=uFogAmb;
    if(dot(uSunCol,uSunCol)>1e-6)Li+=uSunCol*sunPh*csmVis(X);
    if(uHL[0].w>0.0){vec3 Lv=hlP-X;float d2=dot(Lv,Lv);if(d2<uHL[4].w*uHL[4].w){vec3 L=Lv*inversesqrt(d2);float b=beam(-L,hlF,hlR,hlU,uHL[1].w);
      /* the lamps are 10 cm across, not points: no infinite glow right at the lens */
      if(b>0.0)Li+=uHL[4].rgb*b*falloff(max(d2,2.5),uHL[4].w)*hlVis(X)*hg(dot(rd,L),.45)*.5*uHL[0].w;}}
    Li+=scatterLights(X,rd)*.45;
    float ext=dens*dt;S+=Li*ext*Tr;Tr*=exp(-ext);
  }
  o=vec4(S,Tr);
}`, COMP_FS = FRAME + `
in vec2 vT;out vec4 o;
uniform sampler2D uCol;uniform sampler2D uNrm;uniform sampler2D uSSR;uniform sampler2D uFog;uniform highp sampler2D uDepth;uniform vec2 uHalf;
void main(){
  vec3 c=texture(uCol,vT).rgb;vec4 n=texture(uNrm,vT);
  if(n.w>0.0)c+=texture(uSSR,vT).rgb*n.w;
  vec4 f=texture(uFog,vT);
  c=c*f.a+f.rgb;
  o=vec4(max(c,vec3(0)),1.0);
}`, TAA_FS = `#define saturate(x) clamp(x,0.0,1.0)
in vec2 vT;out vec4 o;
uniform sampler2D uCur;uniform sampler2D uHist;uniform sampler2D uVel;uniform highp sampler2D uDepth;
uniform vec2 uInRes;uniform vec2 uOutRes;uniform vec2 uJit;uniform float uReset;uniform float uSharp;
vec3 toY(vec3 c){return vec3(.25*c.r+.5*c.g+.25*c.b,.5*c.r-.5*c.b,-.25*c.r+.5*c.g-.25*c.b);}
vec3 fromY(vec3 c){return vec3(c.x+c.y-c.z,c.x+c.z,c.x-c.y-c.z);}
vec3 tm(vec3 c){return c/(1.0+max(max(c.r,c.g),c.b));}
vec3 itm(vec3 c){return c/max(1.0-max(max(c.r,c.g),c.b),1e-4);}
/* history read with a 5-tap Catmull-Rom so it stays sharp */
vec3 histCR(vec2 uv){vec2 sp=uv*uOutRes,tp=floor(sp-.5)+.5,f=sp-tp,f2=f*f,f3=f2*f;
  vec2 w0=f2-.5*(f3+f),w1=1.5*f3-2.5*f2+1.,w3=.5*(f3-f2),w2=1.-w0-w1-w3,w12=w1+w2;
  vec2 t0=(tp-1.)/uOutRes,t3=(tp+2.)/uOutRes,t12=(tp+w2/w12)/uOutRes;
  vec3 c=texture(uHist,vec2(t12.x,t0.y)).rgb*w12.x*w0.y+texture(uHist,vec2(t0.x,t12.y)).rgb*w0.x*w12.y+texture(uHist,t12).rgb*w12.x*w12.y
    +texture(uHist,vec2(t3.x,t12.y)).rgb*w3.x*w12.y+texture(uHist,vec2(t12.x,t3.y)).rgb*w12.x*w3.y;
  float w=w12.x*w0.y+w0.x*w12.y+w12.x*w12.y+w3.x*w12.y+w12.x*w3.y;return max(c/w,vec3(0));}
void main(){
  vec2 p=vT*uInRes;ivec2 ip=ivec2(floor(p+uJit));
  float scale=uOutRes.x/uInRes.x;
  vec3 sum=vec3(0);float wsum=0.0,wmax=0.0;vec3 m1=vec3(0),m2=vec3(0);float nd=1.0;ivec2 best=ip;
  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){
    ivec2 q=clamp(ip+ivec2(i,j),ivec2(0),ivec2(uInRes)-1);
    vec3 c=tm(texelFetch(uCur,q,0).rgb);
    vec2 sp=vec2(q)+.5-uJit;vec2 dd=(p-sp)*scale;float w=exp(-2.29*dot(dd,dd));
    sum+=c*w;wsum+=w;wmax=max(wmax,w);
    vec3 y=toY(c);m1+=y;m2+=y*y;
    float z=texelFetch(uDepth,q,0).r;if(z<nd){nd=z;best=q;}
  }
  vec3 cur=sum/max(wsum,1e-4);
  vec2 vel=texelFetch(uVel,best,0).xy;
  vec2 huv=vT-vel;
  if(uReset>0.0||any(lessThan(huv,vec2(0)))||any(greaterThan(huv,vec2(1)))){o=vec4(itm(cur),1.0);return;}
  vec3 hist=tm(histCR(huv));
  vec3 mu=m1/9.,sg=sqrt(max(m2/9.-mu*mu,vec3(0)));
  float speed=length(vel*uOutRes);
  float g=mix(1.25,.85,saturate(speed/25.));
  vec3 mn=mu-sg*g,mx=mu+sg*g;
  /* clip the history toward the neighbourhood's centre */
  vec3 hy=toY(hist),cy=clamp(mu,mn,mx),rd=hy-cy;vec3 ext=(mx-mn)*.5+1e-4;vec3 rr=abs(rd/ext);float m=max(rr.x,max(rr.y,rr.z));
  if(m>1.0)hy=cy+rd/m;hist=fromY(hy);
  float a=clamp(.1*wmax*1.3/max(scale*scale*.6+.4,1.0),.035,.2)+saturate(speed/40.)*.12;
  vec3 c=mix(hist,cur,a);
  o=vec4(itm(max(c,vec3(0))),1.0);
}`, COPY_FS = "in vec2 vT;out vec4 o;uniform sampler2D uSrc;uniform float uLod;void main(){o=textureLod(uSrc,vT,uLod);}", DOWN4_FS = `in vec2 vT;out vec4 o;uniform sampler2D uSrc;uniform vec2 uPx;
void main(){vec3 c=texture(uSrc,vT+uPx*vec2(-.5,-.5)).rgb+texture(uSrc,vT+uPx*vec2(.5,-.5)).rgb+texture(uSrc,vT+uPx*vec2(-.5,.5)).rgb+texture(uSrc,vT+uPx*vec2(.5,.5)).rgb;o=vec4(min(c*.25,vec3(200.)),1.0);}`, MB_FS = `#define saturate(x) clamp(x,0.0,1.0)
in vec2 vT;out vec4 o;
uniform sampler2D uSrc;uniform sampler2D uVel;uniform highp sampler2D uDepth;uniform float uShutter;uniform vec2 uOutRes;uniform float uNear;uniform float uFar;uniform int uFrame;
float linz(float d){float z=d*2.-1.;return 2.*uNear*uFar/(uFar+uNear-z*(uFar-uNear));}
float ign(vec2 px,int fr){px+=5.588238*float(fr&63);return fract(52.9829189*fract(.06711056*px.x+.00583715*px.y));}
void main(){
  vec3 c0=texture(uSrc,vT).rgb;
  vec2 v=texture(uVel,vT).xy*uShutter;float vl=length(v*uOutRes);
  float maxL=uOutRes.x*.035;if(vl>maxL){v*=maxL/vl;vl=maxL;}
  if(vl<.75){o=vec4(c0,1.0);return;}
  float z0=linz(texture(uDepth,vT).r);
  int N=int(clamp(vl*.5,4.,14.));float j=ign(gl_FragCoord.xy,uFrame)-.5;
  vec3 s=c0;float ws=1.0;
  for(int i=0;i<14;i++){if(i>=N)break;float t=(float(i)+.5+j)/float(N)-.5;vec2 uv=vT+v*t;
    float z=linz(texture(uDepth,uv).r);vec2 sv=texture(uVel,uv).xy*uShutter;float sl=length(sv*uOutRes);float dist=abs(t)*vl;
    float fg=saturate(1.0-(z-z0)*2.);float bg=saturate(1.0-(z0-z)*2.);
    float w=fg*saturate(1.0-dist/max(sl,1.))+bg*saturate(1.0-dist/max(vl,1.))+saturate(1.0-dist/max(min(sl,vl),1.))*2.0*min(fg,bg);
    s+=texture(uSrc,uv).rgb*w;ws+=w;}
  o=vec4(s/ws,1.0);
}`, BLOOM_DOWN_FS = `
in vec2 vT;out vec4 o;uniform sampler2D uSrc;uniform vec2 uPx;uniform float uFirst;
vec3 S(vec2 o2){return texture(uSrc,vT+uPx*o2).rgb;}
float kw(vec3 c){return 1.0/(1.0+max(max(c.r,c.g),c.b)*.5);}
void main(){
  vec3 a=S(vec2(-2,-2)),b=S(vec2(0,-2)),c=S(vec2(2,-2)),d=S(vec2(-1,-1)),e=S(vec2(1,-1)),f=S(vec2(-2,0)),g=S(vec2(0)),h=S(vec2(2,0)),i=S(vec2(-1,1)),j=S(vec2(1,1)),k=S(vec2(-2,2)),l=S(vec2(0,2)),m=S(vec2(2,2));
  vec3 g0=(d+e+i+j)*.25,g1=(a+b+f+g)*.25,g2=(b+c+g+h)*.25,g3=(f+g+k+l)*.25,g4=(g+h+l+m)*.25;
  if(uFirst>0.0){float w0=kw(g0)*.5,w1=kw(g1)*.125,w2=kw(g2)*.125,w3=kw(g3)*.125,w4=kw(g4)*.125;
    o=vec4(min((g0*w0+g1*w1+g2*w2+g3*w3+g4*w4)/(w0+w1+w2+w3+w4),vec3(500.)),1.0);}
  else o=vec4(g0*.5+(g1+g2+g3+g4)*.125,1.0);
}`, BLOOM_UP_FS = `
in vec2 vT;out vec4 o;uniform sampler2D uSrc;uniform vec2 uPx;uniform float uW;
void main(){vec3 c=texture(uSrc,vT).rgb*4.;
  c+=(texture(uSrc,vT+uPx*vec2(-1,0)).rgb+texture(uSrc,vT+uPx*vec2(1,0)).rgb+texture(uSrc,vT+uPx*vec2(0,-1)).rgb+texture(uSrc,vT+uPx*vec2(0,1)).rgb)*2.;
  c+=texture(uSrc,vT+uPx*vec2(-1,-1)).rgb+texture(uSrc,vT+uPx*vec2(1,-1)).rgb+texture(uSrc,vT+uPx*vec2(-1,1)).rgb+texture(uSrc,vT+uPx*vec2(1,1)).rgb;
  o=vec4(c/16.*uW,1.0);}`, EXPO_FS = `
in vec2 vT;out vec4 o;uniform sampler2D uSrc;uniform sampler2D uPrev;uniform float uDt;uniform float uKey;uniform vec2 uRange;uniform float uReset;
void main(){
  float s=0.0,w=0.0;
  for(int j=0;j<8;j++)for(int i=0;i<8;i++){vec2 uv=(vec2(i,j)+.5)/8.;vec2 q=uv-.5;float cw=exp(-dot(q,q)*5.);
    vec3 c=texture(uSrc,uv).rgb;s+=log2(max(dot(c,vec3(.2126,.7152,.0722)),1e-4))*cw;w+=cw;}
  float avg=exp2(s/w);
  float target=clamp(uKey/max(avg,1e-4),uRange.x,uRange.y);
  float prev=texture(uPrev,vec2(.5)).r;
  float k=uReset>0.0?1.0:1.0-exp(-uDt*(target>prev?1.6:2.6));
  o=vec4(prev+(target-prev)*k,avg,0,1);
}`, FINAL_FS = FRAME + NOISE + `
in vec2 vT;out vec4 o;
uniform sampler2D uSrc;uniform sampler2D uBloom;uniform sampler2D uExpo;uniform sampler2D uDirt;
uniform float uBloomK;uniform vec2 uGrade;uniform float uExpoBias;uniform float uLensRain;uniform float uVig;uniform float uGrain;uniform vec2 uOutRes;uniform float uCA;
/* Stephen Hill's fit of the ACES reference transform */
vec3 aces(vec3 c){mat3 m1=mat3(.59719,.07600,.02840,.35458,.90834,.13383,.04823,.01566,.83777);mat3 m2=mat3(1.60475,-.10208,-.00327,-.53108,1.10813,-.07276,-.07367,-.00605,1.07602);
  vec3 v=m1*c;vec3 a=v*(v+.0245786)-.000090537,b=v*(.983729*v+.4329510)+.238081;return clamp(m2*(a/b),0.,1.);}
vec3 srgb(vec3 c){return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(.0031308,c));}
/* raindrops on the lens: a few sizes of drops, some sliding */
vec3 drops(vec2 uv,float t){
  vec2 asp=vec2(uOutRes.x/uOutRes.y,1.);vec3 acc=vec3(0);
  for(int k=0;k<3;k++){float sc=k==0?5.:k==1?9.:16.;vec2 p=uv*asp*sc;vec2 id=floor(p);vec2 f=fract(p)-.5;
    vec2 r=h22(id+float(k)*31.);if(r.x>.18*uLensRain+(k==2?.08:0.))continue;
    float life=fract(t*.12*(1.+r.y)+r.x*9.);float slide=k==0?smoothstep(.55,1.,life):0.;
    vec2 c=(h22(id+7.)-.5)*.5+vec2(0,-slide*.9);vec2 d=f-c;float rad=(.07+.06*r.y)*(k==0?1.:.7);
    float m=1.0-smoothstep(rad*.7,rad,length(d*vec2(1.,1.15)));float fade=smoothstep(0.,.06,life)*(1.0-smoothstep(.85,1.,life));
    if(m*fade>acc.z)acc=vec3(d/rad,m*fade);}
  return acc;}
void main(){
  vec2 uv=vT;vec3 lr=vec3(0);
  if(uLensRain>0.0){lr=drops(uv,uTime);uv-=lr.xy*lr.z*.02;}
  float ex=texture(uExpo,vec2(.5)).r*uExpoBias;
  vec2 cq=uv-.5;vec3 c;
  if(uCA>0.0){vec2 sh=cq*dot(cq,cq)*uCA*.012;c=vec3(texture(uSrc,uv-sh).r,texture(uSrc,uv).g,texture(uSrc,uv+sh).b);}else c=texture(uSrc,uv).rgb;
  vec3 b=texture(uBloom,uv).rgb;
  c=c+b*uBloomK;
  if(lr.z>0.0)c=mix(c,textureLod(uBloom,uv-lr.xy*.05,0.).rgb*1.3+c*.25,lr.z*.4);
  c*=ex;
  c=aces(c*1.0);
  float l=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(l),c,uGrade.x);c=clamp((c-.5)*uGrade.y+.5,0.,1.);
  c=srgb(c);
  float e=dot(cq,cq);c*=1.0-e*uVig;
  c+=(h12(gl_FragCoord.xy+fract(uTime*7.3)*97.)-.5)*uGrain;
  o=vec4(c,1.0);
}`, LED_FS = `
in vec2 vT;out vec4 o;
uniform sampler2D uSrc;uniform sampler2D uHud;uniform vec2 uRes;uniform float uGain;uniform float uQuant;
const float BY[16]=float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
void main(){
  vec2 cell=vT*uRes;vec2 id=floor(cell);vec2 f=fract(cell)-.5;vec2 tc=(id+.5)/uRes;
  vec3 sc=texture(uSrc,tc).rgb;sc=pow(sc,vec3(2.2));
  vec4 hu=texture(uHud,vec2(tc.x,1.-tc.y));
  vec3 c=mix(sc,pow(hu.rgb,vec3(2.2))*1.2,hu.a);
  if(uQuant>0.){int bi=(int(mod(id.y,4.))<<2)|int(mod(id.x,4.));float d=(BY[bi]+.5)/16.;vec3 q=sqrt(max(c,0.));q=floor(q*uQuant+d)/uQuant;c=q*q;}
  float r=.43,fw=max(fwidth(cell.x),fwidth(cell.y)),dd=length(f);
  float dm=1.0-smoothstep(r-fw*.6-.03,r+fw*.6,dd),hot=1.0-smoothstep(0.0,r,dd),far=smoothstep(.38,.95,fw);
  float m=mix(dm*(.74+.48*hot),.58,far);
  vec3 col=(c*uGain+vec3(.52,.5,.62)*.016)*m;
  o=vec4(pow(col,vec3(1./2.2)),1.0);
}`, DEBUG_FS = `in vec2 vT;out vec4 o;uniform sampler2D uSrc;uniform float uMode;uniform float uGain;
void main(){vec4 c=texture(uSrc,vT);vec3 r=c.rgb;
  if(uMode==1.)r=vec3(c.xy*.5+.5,0.);else if(uMode==2.)r=vec3(c.z,c.w,0.);else if(uMode==3.)r=vec3(c.a);else if(uMode==4.)r=vec3(abs(c.xy)*50.,0.);else if(uMode==5.)r=vec3(pow(c.r,64.));
  r*=uGain;o=vec4(pow(r/(1.+r),vec3(1./2.2)),1.);}`;

  // src/render/renderer.js
  var HALTON = (i, b) => {
    let f2 = 1, r = 0;
    for (; i > 0; )
      f2 /= b, r += f2 * (i % b), i = Math.floor(i / b);
    return r;
  }, JIT = Array.from({ length: 8 }, (_, i) => [HALTON(i + 1, 2) - 0.5, HALTON(i + 1, 3) - 0.5]), CUBE = [[[1, 0, 0], [0, -1, 0]], [[-1, 0, 0], [0, -1, 0]], [[0, 1, 0], [0, 0, 1]], [[0, -1, 0], [0, 0, -1]], [[0, 0, 1], [0, -1, 0]], [[0, 0, -1], [0, -1, 0]]], QUALITY = {
    low: { csm: 1024, hl: 512, probe: 128, fogSteps: 10, fogLights: 6, fogDiv: 4, ssr: 1, mb: 1, maxScale: 0.75 },
    medium: { csm: 1536, hl: 768, probe: 192, fogSteps: 14, fogLights: 10, fogDiv: 2, ssr: 1, mb: 1, maxScale: 1 },
    high: { csm: 2048, hl: 1024, probe: 256, fogSteps: 20, fogLights: 14, fogDiv: 2, ssr: 1, mb: 1, maxScale: 1 },
    ultra: { csm: 3072, hl: 1536, probe: 256, fogSteps: 28, fogLights: 20, fogDiv: 2, ssr: 1, mb: 1, maxScale: 1.25 }
  }, Renderer = class {
    constructor(canvas2, { quality = "high" } = {}) {
      this.canvas = canvas2;
      let G2 = createGL(canvas2);
      this.G = G2;
      let gl = G2.gl;
      this.gl = gl, this.Q = QUALITY[quality] || QUALITY.high, this.qname = quality, this.scale = 1, this.frameN = 0, this.prevVP = null, this.hasPrev = !1, this.resetTAA = !0, this.cars = [];
      let P = (n, vs, fs, d) => G2.program(n, vs, fs, d);
      this.P = {
        world: P("world", WORLD_VS, WORLD_FS),
        worldProbe: P("worldProbe", WORLD_VS, WORLD_FS, { PROBE: 1 }),
        depth: P("depth", DEPTH_VS, DEPTH_FS),
        sky: P("sky", FS_VS, SKY_FS),
        skyProbe: P("skyProbe", FS_VS, SKY_FS, { PROBE: 1 }),
        ssr: P("ssr", FS_VS, SSR_FS),
        fog: P("fog", FS_VS, FOG_FS),
        comp: P("comp", FS_VS, COMP_FS),
        taa: P("taa", FS_VS, TAA_FS),
        copy: P("copy", FS_VS, COPY_FS),
        down4: P("down4", FS_VS, DOWN4_FS),
        mb: P("mb", FS_VS, MB_FS),
        bdown: P("bdown", FS_VS, BLOOM_DOWN_FS),
        bup: P("bup", FS_VS, BLOOM_UP_FS),
        expo: P("expo", FS_VS, EXPO_FS),
        dbg: P("dbg", FS_VS, DEBUG_FS),
        final: P("final", FS_VS, FINAL_FS),
        led: P("led", FS_VS, LED_FS)
      }, this.extra = [];
      let Q2 = this.Q;
      this.csm = G2.texture(Q2.csm, Q2.csm, "depth32f", { layers: 3, compare: !0 }), this.csmFB = [0, 1, 2].map((l) => G2.target(null, { tex: this.csm, layer: l })), this.hlSh = G2.texture(Q2.hl, Q2.hl, "depth32f", { compare: !0 }), this.hlFB = G2.target(null, this.hlSh), this.probe = G2.texture(Q2.probe, Q2.probe, "rgba16f", { cube: !0, mips: !0 }), this.probeDepth = G2.texture(Q2.probe, Q2.probe, "depth32f"), this.probeFB = [0, 1, 2, 3, 4, 5].map((f2) => G2.target([{ tex: this.probe, face: f2 }], this.probeDepth)), this.probeFace = 0, this.probeFilled = 0, this.expo = [0, 1].map(() => G2.texture(1, 1, "rgba16f", { filter: "nearest" })), this.expoFB = this.expo.map((t) => G2.target([t])), this.expoI = 0, this.U = {
        uFlick: new Float32Array(8).fill(1),
        uDyn: new Float32Array(192),
        uNDyn: 0,
        uHL: new Float32Array(20),
        uOcc: new Float32Array(64),
        uNOcc: 0,
        uCSMM: new Float32Array(48),
        uXw: new Float32Array(8).fill(-1),
        uLightsOn: 1,
        uCSMOn: 0,
        uHLShOn: 0
      }, this.timer = G2.timer(), this.gpuMs = -1, this.W = 0, this.H = 0, this.iw = 0, this.ih = 0;
    }
    /* the HUD canvas as a texture, for the LED matrix to draw as lamps */
    hudTexture(cv) {
      let gl = this.gl;
      return this.hudT || (this.hudT = { t: gl.createTexture(), target: gl.TEXTURE_2D }, gl.bindTexture(gl.TEXTURE_2D, this.hudT.t), gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST), gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST), gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE), gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)), gl.bindTexture(gl.TEXTURE_2D, this.hudT.t), gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !1), gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv), this.hudT;
    }
    /* the world: geometry tiles and the static lights */
    loadWorld(city2, T2) {
      let G2 = this.G;
      this.city = city2, this.world = G2.mesh(LAYOUT, 36, city2.geo.vb, city2.geo.ib), this.tiles = city2.geo.ranges.map((r) => ({ ...r, c: [(r.mn[0] + r.mx[0]) / 2, (r.mn[1] + r.mx[1]) / 2, (r.mn[2] + r.mx[2]) / 2] })), this.lights = new LightGrid(G2, city2.lights, city2.gridP || {}), this.U.uGridP = this.lights.params;
      let xw = new Float32Array(8).fill(-1);
      city2.info.xw.forEach((s, i) => {
        i < 8 && (xw[i] = s);
      }), this.U.uXw = xw, this.U.uRoad = [T2.hw, T2.lanes, T2.len, 1];
    }
    /* (re)allocate everything that depends on the screen size and render scale */
    resize(W2, H, scale2 = this.scale) {
      let G2 = this.G;
      scale2 = Math.min(scale2, this.Q.maxScale);
      let iw = Math.max(64, Math.round(W2 * scale2)), ih = Math.max(64, Math.round(H * scale2));
      if (W2 !== this.W || H !== this.H) {
        this.W = W2, this.H = H;
        for (let t of [this.hist, this.mbT, this.pyr, this.ldr].flat().filter(Boolean)) G2.del(t);
        this.hist = [0, 1].map(() => G2.texture(W2, H, "rgba16f")), this.histFB = this.hist.map((t) => G2.target([t])), this.histI = 0, this.mbT = G2.texture(W2, H, "rgba16f"), this.mbFB = G2.target([this.mbT]), this.pyr = G2.texture(Math.max(1, W2 >> 1), Math.max(1, H >> 1), "rgba16f", { mips: !0 }), this.pyrFB = G2.target([this.pyr]), this.bl = [];
        let w = W2 >> 1, h = H >> 1;
        for (let i = 0; i < 6 && w > 2 && h > 2; i++) {
          let t = G2.texture(w, h, "rgba16f");
          this.bl.push({ t, fb: G2.target([t]), w, h }), w >>= 1, h >>= 1;
        }
        this.ldr = G2.texture(W2, H, "rgba8"), this.ldrFB = G2.target([this.ldr]), this.resetTAA = !0, this.hasPrev = !1;
      }
      if (iw !== this.iw || ih !== this.ih) {
        this.iw = iw, this.ih = ih, this.scale = scale2;
        for (let t of [this.cT, this.nT, this.vT, this.dT, this.litT, this.ssrT, this.fogT].filter(Boolean)) G2.del(t);
        this.cT = G2.texture(iw, ih, "rgba16f"), this.nT = G2.texture(iw, ih, "rgba16f"), this.vT = G2.texture(iw, ih, "rg16f"), this.dT = G2.texture(iw, ih, "depth32f", { filter: "nearest" }), this.mainFB = G2.target([this.cT, this.nT, this.vT], this.dT), this.glassFB = G2.target([this.cT], this.dT), this.litT = G2.texture(iw, ih, "rgba16f"), this.litFB = G2.target([this.litT]);
        let hw = Math.max(1, iw >> 1), hh = Math.max(1, ih >> 1), fd = this.Q.fogDiv;
        this.ssrT = G2.texture(hw, hh, "rgba16f"), this.ssrFB = G2.target([this.ssrT]), this.fogT = G2.texture(Math.max(1, Math.round(iw / fd)), Math.max(1, Math.round(ih / fd)), "rgba16f"), this.fogFB = G2.target([this.fogT]), this.resetTAA = !0;
      }
    }
    /* ---------- per-frame matrices ---------- */
    camera(S) {
      let c = S.cam, iw = this.iw, ih = this.ih, asp = this.W / this.H, f2 = c.fwd, u0 = c.up || [0, 1, 0], b = [-f2[0], -f2[1], -f2[2]], r = [u0[1] * b[2] - u0[2] * b[1], u0[2] * b[0] - u0[0] * b[2], u0[0] * b[1] - u0[1] * b[0]], rl = Math.hypot(...r);
      r = r.map((x) => x / rl);
      let up = [b[1] * r[2] - b[2] * r[1], b[2] * r[0] - b[0] * r[2], b[0] * r[1] - b[1] * r[0]], V = M4.view(c.pos, r, up, b), near = c.near || 0.25, far = c.far || 3200, Pn = M4.persp(c.fov, asp, near, far), Pj = Pn.slice(), j = JIT[this.frameN % 8];
      this.jit = j, Pj[8] += 2 * j[0] / iw, Pj[9] += 2 * j[1] / ih;
      let VP = M4.mul(Pj, V), VPnj = M4.mul(Pn, V), U = this.U;
      U.uView = V, U.uProj = Pj, U.uVP = VP, U.uVPnj = VPnj, U.uInvVP = M4.invert(VP), U.uPrevVP = this.prevVP && !S.cut ? this.prevVP : VPnj, U.uCam = c.pos, U.uNear = near, U.uFar = far, U.uJit = j, U.uRes = [iw, ih], this.camBasis = { r, up, b, f: f2 }, this.near = near, this.far = far, this.fov = c.fov, this.asp = asp, this.VPnj = VPnj, this.planes = M4.planes(VP);
    }
    /* cascades: bounding spheres of frustum slices, snapped to shadow texels so they don't swim */
    cascades(S) {
      let U = this.U, L = S.env.sunDir, Q2 = this.Q, splits = [0, 14, 45, 140];
      U.uCSMS = [splits[1], splits[2], splits[3], 1.5 / Q2.csm];
      let { f: f2 } = this.camBasis, th = Math.tan(this.fov / 2), cam2 = S.cam.pos, lu = Math.abs(L[1]) > 0.99 ? [1, 0, 0] : [0, 1, 0], V = M4.lookAt([L[0] * 500, L[1] * 500, L[2] * 500], [0, 0, 0], lu);
      this.csmM = [];
      for (let k = 0; k < 3; k++) {
        let n = splits[k], fa = splits[k + 1], cz = (n + fa) / 2, hy = fa * th, hx = hy * this.asp, rad = Math.ceil(Math.hypot(hx, hy, (fa - n) / 2) * 1.04), c = [cam2[0] + f2[0] * cz, cam2[1] + f2[1] * cz, cam2[2] + f2[2] * cz], lc = M4.xform(V, c), tex = 2 * rad / Q2.csm, cx = Math.round(lc[0] / tex) * tex, cy = Math.round(lc[1] / tex) * tex, M = M4.mul(M4.ortho(cx - rad, cx + rad, cy - rad, cy + rad, -lc[2] - rad - 260, -lc[2] + rad + 80), V);
        this.csmM.push(M), U.uCSMM.set(M, k * 16);
      }
    }
    /* ---------- drawing the world ---------- */
    drawWorld(P, planes, { sort = null, maxDist = 1e9, from = null } = {}) {
      let G2 = this.G, gl = this.gl, list = [];
      for (let t of this.tiles)
        if (M4.boxVisible(planes, t.mn, t.mx)) {
          if (from) {
            let dx = Math.max(0, t.mn[0] - from[0], from[0] - t.mx[0]), dz = Math.max(0, t.mn[2] - from[2], from[2] - t.mx[2]);
            if (t.d = Math.hypot(dx, dz), t.d > maxDist) continue;
          }
          list.push(t);
        }
      sort && list.sort((a, b) => a.d - b.d), gl.bindVertexArray(this.world.vao);
      for (let t of list) gl.drawElements(gl.TRIANGLES, t.count, gl.UNSIGNED_INT, t.first * 4);
      return list.length;
    }
    shadowPass(S) {
      let G2 = this.G, gl = this.gl, U = this.U, P = this.P.depth;
      if (gl.enable(gl.DEPTH_TEST), gl.depthFunc(gl.LESS), gl.depthMask(!0), gl.enable(gl.POLYGON_OFFSET_FILL), gl.polygonOffset(1.5, 3), gl.disable(gl.CULL_FACE), G2.use(P), G2.uni(P, "uModel", M4.ident()), U.uCSMOn > 0) {
        for (let k = 0; k < 3; k++)
          if (!(k > 0 && (this.frameN + k) % 2)) {
            G2.bind(this.csmFB[k]), gl.clear(gl.DEPTH_BUFFER_BIT), G2.uni(P, "uVP", this.csmM[k]), this.drawWorld(P, M4.planes(this.csmM[k]));
            for (let h of this.extra) h.shadow && h.shadow(this, P, this.csmM[k], "sun");
          }
      }
      if (U.uHLShOn > 0) {
        G2.bind(this.hlFB), gl.clear(gl.DEPTH_BUFFER_BIT), G2.uni(P, "uVP", this.hlM), this.drawWorld(P, M4.planes(this.hlM), { from: this.hlPos, maxDist: 80 });
        for (let h of this.extra) h.shadow && h.shadow(this, P, this.hlM, "hl");
      }
      gl.disable(gl.POLYGON_OFFSET_FILL);
    }
    probePass(S) {
      let G2 = this.G, gl = this.gl, Q2 = this.Q, f2 = this.probeFace;
      this.probeFace = (f2 + 1) % 6;
      let pos = S.probePos, [fw, up] = CUBE[f2], V = M4.lookAt(pos, [pos[0] + fw[0], pos[1] + fw[1], pos[2] + fw[2]], up), Pr = M4.persp(Math.PI / 2, 1, 0.3, 2500), VP = M4.mul(Pr, V), U2 = Object.assign({}, this.U, { uVP: VP, uVPnj: VP, uPrevVP: VP, uInvVP: M4.invert(VP), uCam: pos, uFrame: this.frameN });
      G2.bind(this.probeFB[f2]), gl.clearColor(0, 0, 0, 1), gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT), gl.enable(gl.DEPTH_TEST), gl.depthFunc(gl.LEQUAL), gl.depthMask(!0), gl.enable(gl.CULL_FACE), gl.cullFace(gl.BACK);
      let P = G2.use(this.P.worldProbe);
      G2.set(P, U2), G2.tex(P, this.lights.bindings()), G2.tex(P, { uCSM: this.csm, uHLSh: this.hlSh, uProbe: this.probe }), this.drawWorld(P, M4.planes(VP), { from: pos, maxDist: 900 }), gl.disable(gl.CULL_FACE);
      let Ps = G2.use(this.P.skyProbe);
      G2.set(Ps, U2), gl.depthMask(!1), G2.fullscreen(), gl.depthMask(!0), f2 === 5 && (gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.probe.t), gl.generateMipmap(gl.TEXTURE_CUBE_MAP), this.probeFilled++);
    }
    /* ---------- the frame ---------- */
    render(S) {
      let G2 = this.G, gl = this.gl, U = this.U, Q2 = this.Q;
      this.timer && (this.gpuMs = this.timer.poll(), this.timer.begin()), this.camera(S);
      let E = S.env;
      Object.assign(U, {
        uTime: S.time,
        uFrame: this.frameN,
        uSunDir: E.sunDir,
        uSunCol: E.sunCol,
        uAmbUp: E.ambUp,
        uAmbDn: E.ambDn,
        uFogCol: E.fogCol,
        uFogDen: E.fogDen,
        uFogFall: E.fogFall,
        uWet: E.wet,
        uRain: E.rain,
        uNight: E.night,
        uSkyZen: E.skyZen,
        uSkyHor: E.skyHor,
        uSkyGlow: E.skyGlow,
        uCloud: E.cloud,
        uStars: E.stars,
        uSunSize: E.sunSize,
        uLightsOn: E.lightsOn,
        uLit: E.lit,
        uSignal: S.time * 0.9,
        uFogAmb: E.fogAmb,
        uFogSteps: Q2.fogSteps,
        uFogLights: Q2.fogLights,
        uProbeLod: Math.log2(Q2.probe) - 1
      }), U.uTree = S.tree || [0, 0, 0, 0], U.uRoad[3] = E.puddles, U.uFlick.set(S.flicker || [1, 1, 1, 1, 1, 1, 1, 1]);
      let dyn = S.dyn || [];
      U.uNDyn = Math.min(16, dyn.length), U.uDyn.fill(0), dyn.slice(0, 16).forEach((L, i) => {
        U.uDyn.set([L.pos[0], L.pos[1], L.pos[2], L.r, L.col[0], L.col[1], L.col[2], L.type || 0, L.dir ? L.dir[0] : 0, L.dir ? L.dir[1] : -1, L.dir ? L.dir[2] : 0, L.cosO ?? -1], i * 12);
      });
      let hl = S.headlights;
      if (hl && hl.on > 0) {
        U.uHL.set([...hl.posL, hl.on, ...hl.posR, hl.high || 0, ...hl.dir, 0, ...hl.right, 0, ...hl.col, hl.range]);
        let c = [(hl.posL[0] + hl.posR[0]) / 2, (hl.posL[1] + hl.posR[1]) / 2, (hl.posL[2] + hl.posR[2]) / 2];
        this.hlPos = c;
        let V = M4.lookAt(c, [c[0] + hl.dir[0], c[1] + hl.dir[1], c[2] + hl.dir[2]], hl.up || [0, 1, 0]);
        this.hlM = M4.mul(M4.persp(1.9, 1.35, 0.35, hl.range), V), U.uHLMat = this.hlM, U.uHLShOn = 1;
      } else
        U.uHL[3] = 0, U.uHLShOn = 0;
      U.uNOcc = Math.min(8, (S.occ || []).length), (S.occ || []).slice(0, 8).forEach((o, i) => U.uOcc.set(o, i * 8)), U.uCSMOn = Math.max(...E.sunCol) > 2e-3 ? 1 : 0, U.uCSMOn && this.cascades(S);
      for (let h of this.extra) h.prepare && h.prepare(this, S);
      this.shadowPass(S), S.probePos && this.probePass(S), G2.bind(this.mainFB), gl.clearColor(0, 0, 0, 0), gl.clearDepth(1), gl.depthMask(!0), gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT), gl.enable(gl.DEPTH_TEST), gl.depthFunc(gl.LEQUAL), gl.enable(gl.CULL_FACE), gl.cullFace(gl.BACK), gl.disable(gl.BLEND);
      let texs = Object.assign(this.lights.bindings(), { uCSM: this.csm, uHLSh: this.hlSh, uProbe: this.probe });
      for (let h of this.extra) h.opaque && h.opaque(this, U, texs);
      let Pw = G2.use(this.P.world);
      G2.set(Pw, U), G2.tex(Pw, texs), this.drawn = this.drawWorld(Pw, this.planes, { sort: !0, from: S.cam.pos }), gl.disable(gl.CULL_FACE);
      let Ps = G2.use(this.P.sky);
      G2.set(Ps, U), G2.fullscreen(), G2.bind(this.glassFB), gl.enable(gl.BLEND), gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA), gl.depthMask(!1);
      for (let h of this.extra) h.glass && h.glass(this, U, texs);
      gl.disable(gl.BLEND), gl.depthMask(!0), gl.disable(gl.DEPTH_TEST);
      let Pr = G2.use(this.P.ssr);
      G2.bind(this.ssrFB), G2.set(Pr, U), G2.uni(Pr, "uHasPrev", this.hasPrev ? 1 : 0), G2.uni(Pr, "uResScale", this.iw / this.W), G2.uni(Pr, "uPrevLod", this.pyr.levels - 1), G2.uni(Pr, "uProbeLod", U.uProbeLod), G2.tex(Pr, { uNrm: this.nT, uDepth: this.dT, uPrev: this.pyr, uProbe: this.probe }), G2.fullscreen();
      let Pf = G2.use(this.P.fog);
      G2.bind(this.fogFB), G2.set(Pf, U), G2.tex(Pf, Object.assign({ uDepth: this.dT }, texs)), G2.fullscreen();
      let Pc = G2.use(this.P.comp);
      G2.bind(this.litFB), G2.set(Pc, U), G2.tex(Pc, { uCol: this.cT, uNrm: this.nT, uSSR: this.ssrT, uFog: this.fogT, uDepth: this.dT }), G2.fullscreen();
      let hi = this.histI, ho = 1 - hi;
      this.histI = ho;
      let Pt = G2.use(this.P.taa);
      G2.bind(this.histFB[ho]), G2.set(Pt, { uInRes: [this.iw, this.ih], uOutRes: [this.W, this.H], uJit: this.jit, uReset: this.resetTAA || S.cut ? 1 : 0 }), G2.tex(Pt, { uCur: this.litT, uHist: this.hist[hi], uVel: this.vT, uDepth: this.dT }), G2.fullscreen(), this.resetTAA = !1;
      let Pd = G2.use(this.P.down4);
      G2.bind(this.pyrFB), G2.uni(Pd, "uPx", [1 / this.W, 1 / this.H]), G2.tex(Pd, { uSrc: this.hist[ho] }), G2.fullscreen(), gl.bindTexture(gl.TEXTURE_2D, this.pyr.t), gl.generateMipmap(gl.TEXTURE_2D), this.hasPrev = !0;
      let Pm = G2.use(this.P.mb);
      if (G2.bind(this.mbFB), G2.set(Pm, { uShutter: S.shutter ?? 0.5, uOutRes: [this.W, this.H], uNear: this.near, uFar: this.far, uFrame: this.frameN }), G2.tex(Pm, { uSrc: this.hist[ho], uVel: this.vT, uDepth: this.dT }), G2.fullscreen(), this.extra.some((h) => h.particles)) {
        G2.bind(this.mbFB), gl.enable(gl.BLEND);
        for (let h of this.extra) h.particles && h.particles(this, U, texs);
        gl.disable(gl.BLEND);
      }
      let Pb = G2.use(this.P.bdown), src = this.mbT, sw = this.W, sh = this.H;
      this.bl.forEach((L, i) => {
        G2.bind(L.fb), G2.uni(Pb, "uPx", [1 / sw, 1 / sh]), G2.uni(Pb, "uFirst", i === 0 ? 1 : 0), G2.tex(Pb, { uSrc: src }), G2.fullscreen(), src = L.t, sw = L.w, sh = L.h;
      });
      let ei = this.expoI, eo = 1 - ei;
      this.expoI = eo;
      let Pe = G2.use(this.P.expo);
      G2.bind(this.expoFB[eo]), G2.set(Pe, { uDt: S.dt || 1 / 60, uKey: E.key, uRange: E.expoRange || [0.05, 40], uReset: this.frameN < 2 || S.cut ? 1 : 0 }), G2.tex(Pe, { uSrc: this.bl[Math.min(3, this.bl.length - 1)].t, uPrev: this.expo[ei] }), G2.fullscreen();
      let Pu = G2.use(this.P.bup);
      gl.enable(gl.BLEND), gl.blendFunc(gl.ONE, gl.ONE);
      for (let i = this.bl.length - 1; i > 0; i--) {
        let L = this.bl[i], D = this.bl[i - 1];
        G2.bind(D.fb), G2.uni(Pu, "uPx", [1 / L.w, 1 / L.h]), G2.uni(Pu, "uW", 1), G2.tex(Pu, { uSrc: L.t }), G2.fullscreen();
      }
      gl.disable(gl.BLEND);
      let Pfin = G2.use(this.P.final);
      if (G2.bind(S.led ? this.ldrFB : null, [0, 0, this.W, this.H]), G2.set(Pfin, U), G2.set(Pfin, { uBloomK: E.bloom, uGrade: E.grade, uExpoBias: E.expoBias || 1, uLensRain: S.lensRain || 0, uVig: 0.35, uGrain: 0.018, uOutRes: [this.W, this.H], uCA: 0.6 }), G2.tex(Pfin, { uSrc: this.mbT, uBloom: this.bl[0].t, uExpo: this.expo[eo] }), G2.fullscreen(), S.debug) {
        let D = { color: [this.cT, 0], normal: [this.nT, 1], rough: [this.nT, 2], ssrw: [this.nT, 3], vel: [this.vT, 4], depth: [this.dT, 5], ssr: [this.ssrT, 0], fog: [this.fogT, 0], fogT: [this.fogT, 3], lit: [this.litT, 0], hist: [this.hist[ho], 0], mb: [this.mbT, 0], bloom: [this.bl[0].t, 0], expo: [this.expo[eo], 0], probe: [this.pyr, 0] }[S.debug];
        if (D) {
          let Pg = G2.use(this.P.dbg);
          G2.bind(null, [0, 0, this.W, this.H]), G2.set(Pg, { uMode: D[1], uGain: S.debugGain || 1 }), G2.tex(Pg, { uSrc: D[0] }), G2.fullscreen();
        }
      }
      if (S.led) {
        let Pl = G2.use(this.P.led);
        G2.bind(null, [0, 0, this.W, this.H]), G2.set(Pl, { uRes: S.led.res, uGain: 1.25, uQuant: S.led.quant ?? 15 }), G2.tex(Pl, { uSrc: this.ldr, uHud: S.led.hud }), G2.fullscreen();
      }
      this.prevVP = this.VPnj, this.frameN++, this.timer && this.timer.end();
    }
  };

