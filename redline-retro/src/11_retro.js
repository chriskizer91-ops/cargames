/* =====================================================================================
   THE RETRO RENDERER (Redline Retro). In place of Shiftlight 3's HDR pipeline: the same contract the game draws
   through (R.render with the hooks prepare / opaque / glass / particles, R.G's programs, uniforms and textures,
   R.U, R.extra, R.lights, R.resize, R.Q), drawn the way a late-90s console would have drawn it.
   - One small picture: RETRO.lines rows (240 by default), as wide as the screen's shape wants, into a 16-bit float
     target where the phone has one (an 8-bit one, with a fixed exposure, where it doesn't).
   - No shadow maps, no reflection probe, no screen-space reflections, no volumetric fog, no TAA, no motion blur, no
     bloom. The sun (or the moon), the sky's ambient, the town's lamps in the same clustered grid, the frame's own
     lamps and the headlights (with their low-beam cut-off, no shadow), and the old blob of shade under each car.
   - A fog wall where the world ends, as the consoles had, melting into the sky's own colour at the horizon.
   - The exposure follows the picture (an eye that adapts, a log average of the small picture every frame), then the
     ACES curve, the time of day's grade, and 15-bit colour with a 4 x 4 ordered dither (RETRO.dither).
   - Vertices snapped to the picture's pixels (RETRO.snap: the PS1's wobble), off with a tap.
   - The picture to the screen: sharp pixels (integer-looking, with a pixel's width of blend at each edge so no row
     is fatter than its neighbour), a CRT (scanlines and a shadow mask), or the LED dot matrix every Shiftlight game
     has had.
   The GL helpers (createGL: programs, uniforms, textures, targets), the matrix kit and the dynamic resolution's
   frame pacing (DRS) are Shiftlight 3's own (chriskizer91-ops/shiftlight3 src/render gl.js and drs.js at b87b5f9),
   kept as they were but for one line: float colour targets are wanted, not required.
   ===================================================================================== */
/* the retro picture's settings, saved on the device: rows, dither, wobble, CRT */
const RETRO={lines:0,dither:1,snap:1,crt:0,fog:.5,flat:1,warp:0};
{try{const s=JSON.parse(localStorage.getItem('rr-retro')||'{}')||{};for(const k of Object.keys(RETRO))if(typeof s[k]==='number')RETRO[k]=s[k];}catch(e){}
  const q=new URLSearchParams(location.search);for(const k of Object.keys(RETRO))if(q.get(k)!==null)RETRO[k]=+q.get(k);
  /* (240 rows: a PlayStation's, on a phone or a laptop alike) */
  if(!(RETRO.lines>=120&&RETRO.lines<=720))RETRO.lines=240;}
const retroSave=()=>{try{localStorage.setItem('rr-retro',JSON.stringify(RETRO));}catch(e){}};
var SL3 = (() => {
  // ../sl3src/gl.js
  function createGL(canvas) {
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: "high-performance", preserveDrawingBuffer: false });
    if (!gl) throw new Error("This game needs WebGL2.");
    const ext = {
      /* every render target is 16-bit float, so phones that only offer the half-float extension work too */
      cbf: gl.getExtension("EXT_color_buffer_float") || gl.getExtension("EXT_color_buffer_half_float"),
      flt: gl.getExtension("OES_texture_float_linear"),
      aniso: gl.getExtension("EXT_texture_filter_anisotropic"),
      timer: gl.getExtension("EXT_disjoint_timer_query_webgl2"),
      par: gl.getExtension("KHR_parallel_shader_compile")
    };
    /* (Redline Retro: a float target is wanted for the eye's adaptation, not required: without one the picture is 8-bit) */
    const G = { gl, ext, maxAniso: ext.aniso ? gl.getParameter(ext.aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 1 };
    const SAMPLER_TYPES = /* @__PURE__ */ new Set([
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
    ]);
    const header = (defs) => "#version 300 es\nprecision highp float;precision highp int;precision highp sampler2DArray;precision highp sampler2DShadow;precision highp sampler2DArrayShadow;precision highp usampler2D;precision highp samplerCube;\n" + Object.entries(defs || {}).map(([k, v]) => `#define ${k} ${v === true ? "" : v}`).join("\n") + "\n";
    G.programs = [];
    G.program = (name, vs, fs, defs = {}) => {
      const P = { name, p: gl.createProgram(), u: {}, samplers: {}, ready: false };
      G.programs.push(P);
      const mk = (t, src) => {
        const s = gl.createShader(t);
        gl.shaderSource(s, header(defs) + src);
        gl.compileShader(s);
        gl.attachShader(P.p, s);
        return s;
      };
      P.vs = mk(gl.VERTEX_SHADER, vs);
      P.fs = mk(gl.FRAGMENT_SHADER, fs);
      P.srcV = vs;
      P.srcF = fs;
      P.defs = defs;
      gl.linkProgram(P.p);
      return P;
    };
    G.finish = (P) => {
      if (P.ready) return P;
      if (!gl.getProgramParameter(P.p, gl.LINK_STATUS)) {
        for (const [s, src] of [[P.vs, P.srcV], [P.fs, P.srcF]]) if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
          const log = gl.getShaderInfoLog(s), hdr = header(P.defs).split("\n").length - 1;
          const m = /ERROR: \d+:(\d+)/.exec(log || ""), ln = m ? +m[1] - hdr : -1, lines = src.split("\n");
          console.error(`[${P.name}] ` + log + (ln > 0 ? "\n" + lines.slice(Math.max(0, ln - 4), ln + 2).map((l, i) => Math.max(1, ln - 3) + i + ": " + l).join("\n") : ""));
          throw new Error(`shader ${P.name}: ${log}`);
        }
        throw new Error(`link ${P.name}: ${gl.getProgramInfoLog(P.p)}`);
      }
      const n = gl.getProgramParameter(P.p, gl.ACTIVE_UNIFORMS);
      let unit = 0;
      gl.useProgram(P.p);
      for (let i = 0; i < n; i++) {
        const inf = gl.getActiveUniform(P.p, i), nm = inf.name.replace(/\[0\]$/, ""), loc = gl.getUniformLocation(P.p, inf.name);
        if (SAMPLER_TYPES.has(inf.type)) {
          P.samplers[nm] = unit;
          gl.uniform1i(loc, unit);
          unit++;
        } else P.u[nm] = { loc, type: inf.type, size: inf.size };
      }
      P.ukeys = Object.keys(P.u);
      P.ready = true;
      return P;
    };
    G.warmup = async (onProgress) => {
      const par = ext.par, list = G.programs.filter((P) => !P.ready);
      const t0 = performance.now();
      if (par) {
        while (true) {
          const done = list.filter((P) => gl.getProgramParameter(P.p, par.COMPLETION_STATUS_KHR)).length;
          onProgress && onProgress(done, list.length);
          if (done === list.length || performance.now() - t0 > 6e4) break;
          await new Promise((r) => setTimeout(r, 30));
        }
      }
      for (let i = 0; i < list.length; i++) {
        G.finish(list[i]);
        if (!par) {
          onProgress && onProgress(i + 1, list.length);
          await new Promise((r) => setTimeout(r, 0));
        }
      }
    };
    let cur = null;
    G.use = (P) => {
      if (!P.ready) G.finish(P);
      if (cur !== P) {
        gl.useProgram(P.p);
        cur = P;
      }
      return P;
    };
    /* A uniform that already holds the value asked for is not sent again: WebGL keeps every program's uniforms, so
       sending the same number twice (the land's lighting is set for the scene, then again for the car; nearly all
       of it is the same from one frame to the next) is a driver call for nothing. Only a value that always comes
       through here can be remembered: a program the renderer made (P.own) is set only through here, and the
       renderer's own uniform names (G.ownU, the names of R.U) are set only through here in any program. A name the
       game sets straight on the context (its model matrices, its car's paint) is sent every time, as before. */
    G.ownU = /* @__PURE__ */ new Set();
    const same = (c, v) => {
      if (typeof v !== "object") return c === v;
      const n = v.length;
      if (!c || typeof c !== "object" || c.length !== n) return false;
      for (let i = 0; i < n; i++) if (c[i] !== v[i]) return false;
      return true;
    };
    const keep = (u, v) => {
      if (typeof v !== "object") {
        u.c = v;
        return;
      }
      if (!u.c || typeof u.c !== "object" || u.c.length !== v.length) u.c = new Float64Array(v.length);
      u.c.set(v);
    };
    G.set = (P, vals) => {
      if (!P.ready) G.finish(P);
      const own = P.own, keys = P.ukeys, U = P.u;
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i], v = vals[k];
        if (v === void 0) continue;
        const u = U[k];
        if (own || G.ownU.has(k)) {
          if (same(u.c, v)) continue;
          keep(u, v);
        }
        setU(u, v);
      }
    };
    G.uni = (P, k, v) => {
      const u = P.u[k];
      if (!u) return;
      if (P.own || G.ownU.has(k)) {
        if (same(u.c, v)) return;
        keep(u, v);
      }
      setU(u, v);
    };
    function setU(u, v) {
      const l = u.loc;
      switch (u.type) {
        case gl.FLOAT:
          if (u.size > 1) gl.uniform1fv(l, v);
          else gl.uniform1f(l, v);
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
          if (u.size > 1) gl.uniform1iv(l, v);
          else gl.uniform1i(l, v);
          break;
        case gl.INT_VEC2:
          gl.uniform2iv(l, v);
          break;
        case gl.UNSIGNED_INT:
          gl.uniform1ui(l, v);
          break;
        case gl.FLOAT_MAT4:
          gl.uniformMatrix4fv(l, false, v);
          break;
        case gl.FLOAT_MAT3:
          gl.uniformMatrix3fv(l, false, v);
          break;
      }
    }
    /* which texture each unit holds, kept by wrapping the context's own bind (the game's direct binds count too),
       so G.tex skips a bind already in place; a deleted texture leaves every unit it was on */
    const BOUND = [], ACT = { u: 0 };
    {
      const bind = gl.bindTexture.bind(gl), act = gl.activeTexture.bind(gl), del = gl.deleteTexture.bind(gl);
      gl.activeTexture = (u) => {
        ACT.u = u - gl.TEXTURE0;
        act(u);
      };
      gl.bindTexture = (target, t) => {
        (BOUND[ACT.u] || (BOUND[ACT.u] = {}))[target] = t;
        bind(target, t);
      };
      gl.deleteTexture = (t) => {
        for (const b of BOUND) if (b) for (const k in b) if (b[k] === t) b[k] = null;
        del(t);
      };
    }
    G.tex = (P, map) => {
      for (const k in map) {
        const unit = P.samplers[k];
        if (unit === void 0) continue;
        const t = map[k], target = t.target || gl.TEXTURE_2D, tex = t.t || t, b = BOUND[unit];
        if (b && b[target] === tex) continue;
        if (ACT.u !== unit) gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(target, tex);
      }
    };
    const FMT = {
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
    G.FMT = FMT;
    G.texture = (w, h, fmt = "rgba8", o = {}) => {
      const [ifmt, f, ty] = FMT[fmt], t = gl.createTexture(), target = o.cube ? gl.TEXTURE_CUBE_MAP : o.layers ? gl.TEXTURE_2D_ARRAY : gl.TEXTURE_2D;
      gl.bindTexture(target, t);
      const lv = o.mips ? Math.floor(Math.log2(Math.max(w, h))) + 1 : 1;
      if (o.layers) gl.texStorage3D(target, lv, ifmt, w, h, o.layers);
      else gl.texStorage2D(target, lv, ifmt, w, h);
      const lin = o.filter !== "nearest";
      gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, o.mips ? lin ? gl.LINEAR_MIPMAP_LINEAR : gl.NEAREST_MIPMAP_NEAREST : lin ? gl.LINEAR : gl.NEAREST);
      gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, lin ? gl.LINEAR : gl.NEAREST);
      const wr = o.wrap === "repeat" ? gl.REPEAT : o.wrap === "mirror" ? gl.MIRRORED_REPEAT : gl.CLAMP_TO_EDGE;
      gl.texParameteri(target, gl.TEXTURE_WRAP_S, wr);
      gl.texParameteri(target, gl.TEXTURE_WRAP_T, wr);
      if (o.cube || o.layers) gl.texParameteri(target, gl.TEXTURE_WRAP_R, wr);
      if (o.compare) {
        gl.texParameteri(target, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
        gl.texParameteri(target, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
      }
      if (o.aniso && ext.aniso) gl.texParameterf(target, ext.aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(o.aniso, G.maxAniso));
      if (o.data && !o.layers && !o.cube) gl.texSubImage2D(target, 0, 0, 0, w, h, f, ty, o.data);
      if (o.data && o.mips) gl.generateMipmap(target);
      return { t, target, w, h, fmt, ifmt, f, ty, levels: lv };
    };
    G.upload = (T, data, x = 0, y = 0, w = T.w, h = T.h) => {
      gl.bindTexture(T.target, T.t);
      gl.texSubImage2D(T.target, 0, x, y, w, h, T.f, T.ty, data);
    };
    G.del = (T) => {
      if (T && T.t) gl.deleteTexture(T.t);
    };
    G.target = (colors, depth) => {
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      const att = (a) => a && a.tex ? a : { tex: a };
      const bufs = [];
      (colors || []).forEach((c, i) => {
        const A = att(c);
        bindAtt(gl.COLOR_ATTACHMENT0 + i, A);
        bufs.push(gl.COLOR_ATTACHMENT0 + i);
      });
      if (depth) bindAtt(gl.DEPTH_ATTACHMENT, att(depth));
      gl.drawBuffers(bufs.length ? bufs : [gl.NONE]);
      if (!bufs.length) gl.readBuffer(gl.NONE);
      const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      if (st !== gl.FRAMEBUFFER_COMPLETE) throw new Error("framebuffer incomplete 0x" + st.toString(16));
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      const c0 = colors && colors[0] ? att(colors[0]) : att(depth);
      const lvl = c0.level || 0;
      return { fb, w: Math.max(1, c0.tex.w >> lvl), h: Math.max(1, c0.tex.h >> lvl), n: bufs.length, bufs };
    };
    function bindAtt(point, A) {
      const T = A.tex, lvl = A.level || 0;
      if (T.target === gl.TEXTURE_CUBE_MAP) gl.framebufferTexture2D(gl.FRAMEBUFFER, point, gl.TEXTURE_CUBE_MAP_POSITIVE_X + (A.face || 0), T.t, lvl);
      else if (T.target === gl.TEXTURE_2D_ARRAY) gl.framebufferTextureLayer(gl.FRAMEBUFFER, point, T.t, lvl, A.layer || 0);
      else gl.framebufferTexture2D(gl.FRAMEBUFFER, point, gl.TEXTURE_2D, T.t, lvl);
    }
    G.bind = (R, vp) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, R ? R.fb : null);
      if (vp) gl.viewport(vp[0], vp[1], vp[2], vp[3]);
      else if (R) gl.viewport(0, 0, R.w, R.h);
    };
    G.delTarget = (R) => {
      if (R) gl.deleteFramebuffer(R.fb);
    };
    G.mesh = (layout, stride, vbData, ibData, P) => {
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      const vb = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vb);
      gl.bufferData(gl.ARRAY_BUFFER, vbData, gl.STATIC_DRAW);
      for (const a of layout) {
        const loc = a.loc;
        gl.enableVertexAttribArray(loc);
        if (a.type === "f32") gl.vertexAttribPointer(loc, a.size, gl.FLOAT, false, stride, a.offset);
        else if (a.type === "i16n") gl.vertexAttribPointer(loc, a.size, gl.SHORT, true, stride, a.offset);
        else if (a.type === "u8n") gl.vertexAttribPointer(loc, a.size, gl.UNSIGNED_BYTE, true, stride, a.offset);
        else if (a.type === "u8i") gl.vertexAttribIPointer(loc, a.size, gl.UNSIGNED_BYTE, stride, a.offset);
        else if (a.type === "u16i") gl.vertexAttribIPointer(loc, a.size, gl.UNSIGNED_SHORT, stride, a.offset);
      }
      let ib = null, count = vbData.byteLength / stride, itype = 0;
      if (ibData) {
        ib = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ibData, gl.STATIC_DRAW);
        count = ibData.length;
        itype = ibData instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
      }
      gl.bindVertexArray(null);
      return { vao, vb, ib, count, itype };
    };
    G.draw = (M, first = 0, count = M.count, mode = gl.TRIANGLES) => {
      gl.bindVertexArray(M.vao);
      if (M.ib) gl.drawElements(mode, count, M.itype, first * (M.itype === gl.UNSIGNED_INT ? 4 : 2));
      else gl.drawArrays(mode, first, count);
    };
    G.drawInst = (M, n, mode = gl.TRIANGLES) => {
      gl.bindVertexArray(M.vao);
      if (M.ib) gl.drawElementsInstanced(mode, M.count, M.itype, 0, n);
      else gl.drawArraysInstanced(mode, 0, M.count, n);
    };
    G.empty = gl.createVertexArray();
    G.fullscreen = () => {
      gl.bindVertexArray(G.empty);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    G.procedural = (verts, inst, mode = gl.TRIANGLES) => {
      gl.bindVertexArray(G.empty);
      if (inst > 1) gl.drawArraysInstanced(mode, 0, verts, inst);
      else gl.drawArrays(mode, 0, verts);
    };
    /* where there's no GPU timer (Android's Chrome has none): a fence put in at the end of the frame, watched from a
       timer task about every millisecond (a sync object only signals once control has gone back to the browser),
       and the time from the frame's start to the GPU getting past it. That is the frame's cost to the GPU and to
       the CPU feeding it, whichever is longer, a millisecond or so long at worst: enough for the dynamic
       resolution to see the GPU filling up before frames start to drop. One fence in flight at a time */
    G.fenceTimer = () => {
      if (typeof gl.fenceSync !== "function") return null;
      let pend = null, t0 = 0, last = -1;
      const tick = () => {
        if (!pend) return;
        const st = gl.getSyncParameter(pend.s, gl.SYNC_STATUS), now = performance.now();
        if (st === gl.SIGNALED) {
          last = now - pend.t0;
          gl.deleteSync(pend.s);
          pend = null;
        } else if (now - pend.t0 > 1e3) {
          /* (a second and still not through: as good as a reading of that, the GPU far behind) */
          last = now - pend.t0;
          gl.deleteSync(pend.s);
          pend = null;
        } else setTimeout(tick, 1);
      };
      return {
        fence: true,
        begin() {
          t0 = performance.now();
        },
        end() {
          if (pend) return;
          const s = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
          if (!s) return;
          gl.flush();
          pend = { s, t0 };
          setTimeout(tick, 1);
        },
        poll() {
          return last;
        }
      };
    };
    G.timer = () => {
      if (!ext.timer) return null;
      /* (the query objects are reused, not made and deleted every frame) */
      const qs = [], free = [];
      let last = -1;
      return {
        begin() {
          const q = free.pop() || gl.createQuery();
          gl.beginQuery(ext.timer.TIME_ELAPSED_EXT, q);
          qs.push(q);
        },
        end() {
          gl.endQuery(ext.timer.TIME_ELAPSED_EXT);
        },
        poll() {
          const dis = gl.getParameter(ext.timer.GPU_DISJOINT_EXT);
          while (qs.length && gl.getQueryParameter(qs[0], gl.QUERY_RESULT_AVAILABLE)) {
            const q = qs.shift();
            if (!dis) last = gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6;
            free.push(q);
          }
          while (qs.length > 8) free.push(qs.shift());
          return last;
        }
      };
    };
    return G;
  }
  /* (scratch for lookAt, and the vectors every frame would otherwise make afresh) */
  var UP_Y = [0, 1, 0], UP_X = [1, 0, 0], ORIGIN = [0, 0, 0], CSM_SPLITS = [0, 14, 45, 140];
  var LA_B = new Float64Array(3), LA_R = new Float64Array(3), LA_U = new Float64Array(3);
  var M4 = {
    ident() {
      const m = new Float32Array(16);
      m[0] = m[5] = m[10] = m[15] = 1;
      return m;
    },
    mul(a, b, o = new Float32Array(16)) {
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
      return o;
    },
    /* reversed-Z infinite perspective is tempting, but keep a standard one: near/far explicit */
    persp(fovy, asp, n, f, o = new Float32Array(16)) {
      const t = 1 / Math.tan(fovy / 2);
      o.fill(0);
      o[0] = t / asp;
      o[5] = t;
      o[10] = (f + n) / (n - f);
      o[11] = -1;
      o[14] = 2 * f * n / (n - f);
      return o;
    },
    ortho(l, r, b, t, n, f, o = new Float32Array(16)) {
      o.fill(0);
      o[0] = 2 / (r - l);
      o[5] = 2 / (t - b);
      o[10] = -2 / (f - n);
      o[12] = -(r + l) / (r - l);
      o[13] = -(t + b) / (t - b);
      o[14] = -(f + n) / (f - n);
      o[15] = 1;
      return o;
    },
    /* view matrix from an eye position and a camera basis (right, up, back) */
    view(eye, R, U, B, o = new Float32Array(16)) {
      o[0] = R[0];
      o[4] = R[1];
      o[8] = R[2];
      o[12] = -(R[0] * eye[0] + R[1] * eye[1] + R[2] * eye[2]);
      o[1] = U[0];
      o[5] = U[1];
      o[9] = U[2];
      o[13] = -(U[0] * eye[0] + U[1] * eye[1] + U[2] * eye[2]);
      o[2] = B[0];
      o[6] = B[1];
      o[10] = B[2];
      o[14] = -(B[0] * eye[0] + B[1] * eye[1] + B[2] * eye[2]);
      o[3] = 0;
      o[7] = 0;
      o[11] = 0;
      o[15] = 1;
      return o;
    },
    lookAt(eye, at, up = UP_Y, o) {
      const b = LA_B, r = LA_R, u = LA_U;
      b[0] = eye[0] - at[0];
      b[1] = eye[1] - at[1];
      b[2] = eye[2] - at[2];
      /* (sqrt of the sum here and below, not Math.hypot: it makes a little garbage every call in this engine) */
      const bl = Math.sqrt(b[0] * b[0] + b[1] * b[1] + b[2] * b[2]) || 1;
      b[0] /= bl;
      b[1] /= bl;
      b[2] /= bl;
      r[0] = up[1] * b[2] - up[2] * b[1];
      r[1] = up[2] * b[0] - up[0] * b[2];
      r[2] = up[0] * b[1] - up[1] * b[0];
      const rl = Math.sqrt(r[0] * r[0] + r[1] * r[1] + r[2] * r[2]) || 1;
      r[0] /= rl;
      r[1] /= rl;
      r[2] /= rl;
      u[0] = b[1] * r[2] - b[2] * r[1];
      u[1] = b[2] * r[0] - b[0] * r[2];
      u[2] = b[0] * r[1] - b[1] * r[0];
      return M4.view(eye, r, u, b, o);
    },
    /* model matrix from a row-major 3x3 rotation (columns = body axes) and a position */
    fromRot(R, p, o = new Float32Array(16)) {
      o[0] = R[0];
      o[1] = R[3];
      o[2] = R[6];
      o[3] = 0;
      o[4] = R[1];
      o[5] = R[4];
      o[6] = R[7];
      o[7] = 0;
      o[8] = R[2];
      o[9] = R[5];
      o[10] = R[8];
      o[11] = 0;
      o[12] = p[0];
      o[13] = p[1];
      o[14] = p[2];
      o[15] = 1;
      return o;
    },
    invert(m, o = new Float32Array(16)) {
      const a = m, b00 = a[0] * a[5] - a[1] * a[4], b01 = a[0] * a[6] - a[2] * a[4], b02 = a[0] * a[7] - a[3] * a[4], b03 = a[1] * a[6] - a[2] * a[5], b04 = a[1] * a[7] - a[3] * a[5], b05 = a[2] * a[7] - a[3] * a[6], b06 = a[8] * a[13] - a[9] * a[12], b07 = a[8] * a[14] - a[10] * a[12], b08 = a[8] * a[15] - a[11] * a[12], b09 = a[9] * a[14] - a[10] * a[13], b10 = a[9] * a[15] - a[11] * a[13], b11 = a[10] * a[15] - a[11] * a[14];
      let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
      if (!det) return M4.ident();
      det = 1 / det;
      o[0] = (a[5] * b11 - a[6] * b10 + a[7] * b09) * det;
      o[1] = (a[2] * b10 - a[1] * b11 - a[3] * b09) * det;
      o[2] = (a[13] * b05 - a[14] * b04 + a[15] * b03) * det;
      o[3] = (a[10] * b04 - a[9] * b05 - a[11] * b03) * det;
      o[4] = (a[6] * b08 - a[4] * b11 - a[7] * b07) * det;
      o[5] = (a[0] * b11 - a[2] * b08 + a[3] * b07) * det;
      o[6] = (a[14] * b02 - a[12] * b05 - a[15] * b01) * det;
      o[7] = (a[8] * b05 - a[10] * b02 + a[11] * b01) * det;
      o[8] = (a[4] * b10 - a[5] * b08 + a[7] * b06) * det;
      o[9] = (a[1] * b08 - a[0] * b10 - a[3] * b06) * det;
      o[10] = (a[12] * b04 - a[13] * b02 + a[15] * b00) * det;
      o[11] = (a[9] * b02 - a[8] * b04 - a[11] * b00) * det;
      o[12] = (a[5] * b07 - a[4] * b09 - a[6] * b06) * det;
      o[13] = (a[0] * b09 - a[1] * b07 + a[2] * b06) * det;
      o[14] = (a[13] * b01 - a[12] * b03 - a[14] * b00) * det;
      o[15] = (a[8] * b03 - a[9] * b01 + a[10] * b00) * det;
      return o;
    },
    xformTo(m, p, o) {
      const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
      o[0] = (m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12]) / w;
      o[1] = (m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13]) / w;
      o[2] = (m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]) / w;
      return o;
    },
    xform(m, p) {
      const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
      return [(m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12]) / w, (m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13]) / w, (m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]) / w];
    },
    /* the six frustum planes of a view-projection matrix, as [a,b,c,d] with inside = a*x+b*y+c*z+d >= 0 */
    planes(m, o) {
      const P = o || [[], [], [], [], [], []];
      for (let k = 0; k < 6; k++) {
        const i = k >> 1, s = k & 1 ? -1 : 1, p = P[k];
        p[0] = m[3] + s * m[i];
        p[1] = m[7] + s * m[4 + i];
        p[2] = m[11] + s * m[8 + i];
        p[3] = m[15] + s * m[12 + i];
        /* (a plane for culling: sqrt of the sum, not Math.hypot, which makes a little garbage every call here) */
        const l = Math.sqrt(p[0] * p[0] + p[1] * p[1] + p[2] * p[2]);
        p[0] /= l;
        p[1] /= l;
        p[2] /= l;
        p[3] /= l;
      }
      return P;
    },
    /* does an axis-aligned box touch the frustum? */
    boxVisible(P, mn, mx) {
      for (const p of P) {
        const x = p[0] > 0 ? mx[0] : mn[0], y = p[1] > 0 ? mx[1] : mn[1], z = p[2] > 0 ? mx[2] : mn[2];
        if (p[0] * x + p[1] * y + p[2] * z + p[3] < 0) return false;
      }
      return true;
    }
  };

  // ../sl3src/drs.js
  var RATES = [48, 50, 60, 75, 90, 100, 120, 144, 165, 180, 200, 240, 280, 360];
  var DRS = class {
    constructor({ min = 0.5, max = 1, start = 0.8 } = {}) {
      this.min = min;
      this.max = max;
      this.scale = start;
      this.hz = 60;
      this.div = 1;
      this.period = 1e3 / 60;
      this.raw = [];
      this.coolMs = 0;
      this.okMs = 0;
      this.enabled = true;
      this.gpuSm = -1;
      this.bad = 1;
      this.badMs = 0;
    }
    /* learn the display's refresh rate from the shortest steady gaps between animation callbacks */
    noteVsync(ms) {
      if (!(ms > 2 && ms < 60)) return;
      this.raw.push(ms);
      if (this.raw.length > 120) this.raw.shift();
      if (this.raw.length >= 24 && (this.nv = (this.nv || 0) + 1) % 12 === 0) {
        const s = [...this.raw].sort((a, b) => a - b), p = s[Math.floor(s.length * 0.15)];
        this.hz = RATES.reduce((b, h) => Math.abs(1e3 / h - p) < Math.abs(1e3 / b - p) ? h : b, 60);
        this.period = 1e3 / this.hz * this.div;
      }
    }
    /* the frame-rate setting: 'auto' aims for 60-100 fps on any screen; 1, 2, 3 = every, every other, every third refresh */
    divFor(set) {
      if (set === "auto" || !set) return Math.max(1, Math.floor(this.hz / 60 + 1e-6));
      return Math.max(1, Math.min(4, +set | 0 || 1));
    }
    setDivisor(k) {
      this.div = k;
      this.period = 1e3 / this.hz * k;
    }
    get target() {
      return this.hz / this.div;
    }
    update(frameMs, gpuMs) {
      if (!this.enabled) return this.scale;
      if (this.coolMs > 0) {
        this.coolMs -= frameMs;
        return this.scale;
      }
      /* (aim the GPU's time at this share of the frame: 0.88 leaves just enough slack not to miss a beat; less keeps
         it idle part of every frame, cooler on a phone) */
      const budget = this.period * (this.share || 0.88);
      let s = this.scale;
      const old = s;
      const tight = this.share && this.share < 0.875;
      if (gpuMs > 0) {
        this.gpuSm = this.gpuSm < 0 ? gpuMs : this.gpuSm * 0.9 + gpuMs * 0.1;
        const want = s * Math.sqrt(budget / Math.max(this.gpuSm, 0.5));
        /* (a target under 88%, for a cooler phone: held under it, not near it. Straight down to the notch whose time
           should fit, up a notch only when there is plainly room; no dead band to sit over the target in) */
        if (tight) {
          if (want < s - 0.02) s = Math.floor(want * 20 + 1e-6) / 20;
          else if (want >= s + 0.05) s += 0.05;
        } else if (want < s * 0.95 || want > s * 1.07) s = s + (want - s) * 0.35;
      } else {
        if (frameMs > this.period * 1.3) {
          this.slowMs = (this.slowMs || 0) + frameMs;
          this.okMs = 0;
          if (this.slowMs > 350) {
            this.bad = this.scale;
            this.badMs = 15e3;
            s -= frameMs > this.period * 2 ? 0.1 : 0.05;
            this.slowMs = 0;
          }
        } else {
          this.slowMs = Math.max(0, (this.slowMs || 0) - frameMs * 0.5);
          this.okMs += frameMs;
          if (this.okMs > 2e3) {
            const cap = this.badMs > 0 ? this.bad - 0.05 : this.max;
            if (s + 0.05 <= cap + 1e-6) s += 0.05;
            this.okMs = 0;
          }
        }
        if (this.badMs > 0) this.badMs -= frameMs;
      }
      s = Math.round(Math.max(this.min, Math.min(this.max, s)) * 20) / 20;
      if (s !== this.scale) {
        /* (held tight: what the GPU should take at the new scale, till it says, so a stale number doesn't step twice) */
        if (tight && this.gpuSm > 0) this.gpuSm *= s * s / (old * old);
        this.scale = s;
        this.coolMs = s < old ? 500 : 1500;
      }
      return this.scale;
    }
  };

  /* ---------- the shared GLSL (Shiftlight 3's, as the game's shaders expect them) ---------- */
  var FRAME = `
#define PI 3.14159265
#define saturate(x) clamp(x,0.0,1.0)
uniform mat4 uVP;uniform mat4 uPrevVP;uniform mat4 uView;uniform mat4 uProj;uniform mat4 uInvVP;uniform mat4 uVPnj;
uniform vec3 uCam;uniform float uTime;uniform vec2 uRes;uniform vec2 uJit;uniform int uFrame;uniform float uNear;uniform float uFar;
uniform vec3 uSunDir;uniform vec3 uSunCol;uniform vec3 uAmbUp;uniform vec3 uAmbDn;
uniform vec3 uFogCol;uniform float uFogDen;uniform float uFogFall;
uniform float uWet;uniform float uRain;uniform float uNight;
uniform float uSnap;uniform float uPre;
/* the PS1's wobble: a vertex snapped to the small picture's pixel grid (RETRO.snap) */
vec4 snapV(vec4 p){if(uSnap<=0.0||p.w<=1e-3)return p;vec2 g=uRes*.5;p.xy=floor(p.xy/p.w*g+.5)/g*p.w;return p;}
uniform vec3 uSkyZen;uniform vec3 uSkyHor;uniform vec3 uSkyGlow;uniform float uCloud;uniform float uStars;uniform float uSunSize;
`;
  var NOISE = `
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
`;
  var PACK = `
vec2 octWrap(vec2 v){return (1.0-abs(v.yx))*vec2(v.x>=0.0?1.0:-1.0,v.y>=0.0?1.0:-1.0);}
vec2 octEnc(vec3 n){n/=(abs(n.x)+abs(n.y)+abs(n.z));n.xy=n.z>=0.0?n.xy:octWrap(n.xy);return n.xy;}
vec3 octDec(vec2 f){vec3 n=vec3(f,1.0-abs(f.x)-abs(f.y));float t=saturate(-n.z);n.x+=n.x>=0.0?-t:t;n.y+=n.y>=0.0?-t:t;return normalize(n);}
float lum(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
`;
  /* ---------- the lighting the game's scene shader calls (13_lit's FS: directAll, ambient, carOcc, sunShadow, the
     clustered lamps), the retro way: Lambert plus a normalised Blinn-Phong highlight, no shadow maps. The names,
     the uniforms and the lamps' records are Shiftlight 3's, so the town's light grid (59_daynight's lgBuild), the
     frame's lamps and the headlights arrive exactly as they did ---------- */
  var LIGHTING = `
struct Surf{vec3 P;vec3 N;vec3 V;vec3 diff;vec3 F0;float rough;float ao;float clear;float clearR;vec3 Nc;float spec;float trans;};
vec3 F_Sch(vec3 f0,float c){float p=1.0-c;float p2=p*p;return f0+(1.0-f0)*(p2*p2*p);}
/* one light arriving from L (unit, toward it) with radiance E: the diffuse over pi and a Blinn-Phong highlight with the
   surface's own sharpness (roughness back to a Phong exponent), the clear coat's glint over a painted body */
vec3 brdfL(Surf s,vec3 L,vec3 E,float aN){
  float NoL=dot(s.N,L);vec3 c=vec3(0);
  if(NoL>0.0){vec3 H=normalize(L+s.V);float NoH=saturate(dot(s.N,H));
    float a=max(s.rough*s.rough,.03),n=min(2.0/(a*a)-2.0,1024.);
    vec3 F=F_Sch(s.F0,saturate(dot(s.V,H)));
    c=(s.diff*(1.0-F)*(1.0/PI)+F*((n+8.)*(1.0/(8.*PI)))*pow(NoH,n)*s.spec)*NoL;}
  if(s.trans>0.0)c+=s.diff*s.trans*saturate(-NoL)*(1.0/PI);
  if(s.clear>0.0){float NoLc=dot(s.Nc,L);
    if(NoLc>0.0){vec3 H=normalize(L+s.V);float NoH=saturate(dot(s.Nc,H)),a=max(s.clearR*s.clearR,.03),n=min(2.0/(a*a)-2.0,1024.);
      float Fc=F_Sch(vec3(.04),saturate(dot(s.V,H))).x*s.clear;c=c*(1.0-Fc)+Fc*((n+8.)*(1.0/(8.*PI)))*pow(NoH,n)*NoLc;}}
  return c*E;
}
/* smooth windowed inverse-square falloff (Shiftlight 3's, so every lamp keeps its reach and its strength) */
float falloff(float d2,float r){float x=d2/(r*r);float w=saturate(1.0-x*x);return w*w/(d2+.25);}
uniform highp sampler2D uLights;uniform highp usampler2D uLGrid;uniform highp usampler2D uLList;
uniform vec4 uGridP;uniform float uFlick[16];uniform float uLightsOn;
uniform vec4 uDyn[48];uniform int uNDyn;
vec4 LT(int i,int k){return texelFetch(uLights,ivec2((i*4+k)&1023,(i*4+k)>>10),0);}
/* one lamp's record: point (0) or spot (1); a tube (2) is lit from its middle, as a point */
vec3 evalRec(Surf s,vec4 A,vec4 B,vec4 C,vec4 D){
  int code=int(B.w+.5),type=code&7,fl=code>>3;vec3 col=B.rgb*(fl>0?uFlick[fl&15]:1.0);
  vec3 Lv=A.xyz-s.P;float d2=dot(Lv,Lv),r=A.w;if(d2>r*r)return vec3(0);
  vec3 L=Lv*inversesqrt(d2);float att=falloff(d2,r);
  if(type==1){att*=smoothstep(C.w,D.x,dot(-L,C.xyz));if(att<=0.0)return vec3(0);}
  return brdfL(s,L,col*att,0.0);
}
/* the town's lamps: the cell's list, at most RETRO_LAMPS of them (the brightest come first in each cell) */
#ifndef RETRO_LAMPS
#define RETRO_LAMPS 10
#endif
vec3 clusterLights(Surf s){
  vec3 c=vec3(0);if(uLightsOn<=0.0)return c;
  ivec2 cell=ivec2(floor((s.P.xz-uGridP.xy)*uGridP.z));int gw=int(uGridP.w);
  if(cell.x<0||cell.y<0||cell.x>=gw||cell.y>=gw)return c;
  uvec2 oc=texelFetch(uLGrid,cell,0).xy;int o=int(oc.x),n=min(int(oc.y),RETRO_LAMPS);
  for(int k=0;k<n;k++){int idx=o+k;int li=int(texelFetch(uLList,ivec2(idx&1023,idx>>10),0).x);
    c+=evalRec(s,LT(li,0),LT(li,1),LT(li,2),LT(li,3));}
  return c*uLightsOn;
}
vec3 dynLights(Surf s){vec3 c=vec3(0);for(int i=0;i<uNDyn;i++){vec4 A=uDyn[i*3],B=uDyn[i*3+1],C=uDyn[i*3+2];c+=evalRec(s,A,B,C,vec4(C.w+.12,.03,0,0));}return c;}
/* the headlights: the low beam's cut-off and its hot spot (Shiftlight 3's beam), no shadow */
uniform vec4 uHL[5];
float beam(vec3 d,vec3 F,vec3 Rt,vec3 Up,float high){
  float z=dot(d,F);if(z<=.05)return 0.0;
  float x=dot(d,Rt)/z,y=dot(d,Up)/z;
  float cut=-.012+.022*smoothstep(-.02,.12,x),lo=smoothstep(cut+.006,cut-.01,y);
  float hot=exp(-pow((x-.04)/.13,2.)-pow((y+.035)/.045,2.))*2.6,wide=exp(-pow(x/.62,2.)-pow((y+.05)/.16,2.))*.8,fore=exp(-pow(x/1.1,2.)-pow((y+.25)/.25,2.))*.25;
  float b=(hot+wide+fore)*lo;float hi=exp(-pow(x/.32,2.)-pow(y/.09,2.))*3.0+exp(-pow(x/.8,2.)-pow(y/.2,2.))*.6;
  return mix(b,max(b,hi),high)*smoothstep(.05,.2,z);
}
vec3 headlights(Surf s){
  if(uHL[0].w<=0.0)return vec3(0);
  vec3 c=vec3(0);vec3 F=uHL[2].xyz,Rt=uHL[3].xyz,Up=cross(Rt,F);float range=uHL[4].w;
  {vec3 a=uHL[0].xyz-s.P,b=uHL[1].xyz-s.P;float r2=range*range;if(dot(a,a)>=r2&&dot(b,b)>=r2)return c;}
  for(int i=0;i<2;i++){vec3 Lv=uHL[i].xyz-s.P;float d2=dot(Lv,Lv);vec3 L=Lv*inversesqrt(d2);
    float b=beam(-L,F,Rt,Up,uHL[1].w);if(b<=0.0)continue;c+=brdfL(s,L,uHL[4].rgb*b*falloff(d2,range),0.0);}
  return c*uHL[0].w;
}
/* no shadow maps: the sun reaches everything (the consoles' way); the blob under each car is the shade there is */
float sunShadow(vec3 P,vec3 N,float vd,vec2 px){return 1.0;}
uniform vec4 uOcc[16];uniform int uNOcc;
float carOcc(vec3 P){
  float o=1.0;
  for(int i=0;i<uNOcc;i++){vec4 A=uOcc[i*2],B=uOcc[i*2+1];vec3 d=P-A.xyz;
    float h=d.y+A.w;if(h>1.3||h<-.4)continue;
    vec2 l=vec2(dot(d.xz,B.xy),dot(d.xz,vec2(-B.y,B.x)));
    vec2 q=abs(l)-B.zw*.82;float sd=length(max(q,0.))+min(max(q.x,q.y),0.);
    float k=1.0-smoothstep(-.5,.9+h*.6,sd);o*=1.0-k*.85*saturate(1.2-h);}
  return o;
}
`;
  var SHADE = `
vec3 directAll(Surf s,vec2 px,float vd){
  vec3 c=vec3(0);
  if(dot(uSunCol,uSunCol)>1e-6)c+=brdfL(s,uSunDir,uSunCol,.003);
  c+=clusterLights(s)+dynLights(s)+headlights(s);
  return c;
}
vec3 ambient(Surf s){float up=s.N.y*.5+.5;return mix(uAmbDn,uAmbUp,up)*s.diff*s.ao;}
`;
  /* a lamp's light at a point, for the puffs and the rain (no surface: what arrives, over pi) */
  var POINT_LIGHT = `
vec3 lightAt(vec3 P,vec3 V){
  Surf s;s.P=P;s.V=V;s.N=V;s.Nc=V;s.diff=vec3(1);s.F0=vec3(0);s.rough=1.;s.ao=1.;s.clear=0.;s.clearR=1.;s.spec=0.;s.trans=0.;
  vec3 c=(mix(uAmbDn,uAmbUp,.6)+uSunCol*.35)*(1.0/PI)*PI*.5;
  return c+min(clusterLights(s)+dynLights(s)+headlights(s),vec3(4.))*.25;
}`;
  var SOFT = `float soft(float z,float k){return 1.0;}`;
  var FS_VS = `out vec2 vT;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));vT=p;gl_Position=vec4(p*2.0-1.0,1.0,1.0);}`;
  /* ---------- the passes after the scene ---------- */
  /* the eye: the log average of the small picture (its mip), aimed at the time of day's key, eased frame to frame. It
     meters the land and the cars, not the sky (the sky's pixels carry alpha 0): a night sky is most of the frame and
     would open the eye until the moonlit town glared. Where the sky is all there is, the whole picture's average */
  var EXPO_FS = `
in vec2 vT;out vec4 o;uniform sampler2D uSrc;uniform sampler2D uPrev;uniform float uDt;uniform float uKey;uniform vec2 uRange;uniform float uReset;uniform float uLod;uniform float uPre;uniform float uGeoW;
void main(){
  float s=0.0,w=0.0,sg=0.0,wg=0.0;
  for(int j=0;j<8;j++)for(int i=0;i<8;i++){vec2 uv=(vec2(i,j)+.5)/8.;vec2 q=uv-.5;float cw=exp(-dot(q,q)*5.);
    vec4 c=textureLod(uSrc,uv,uLod);float l=dot(c.rgb,vec3(.2126,.7152,.0722))/uPre,a=c.a;
    s+=log2(max(l,1e-4))*cw;w+=cw;
    if(a>.05){sg+=log2(max(l/a,1e-4))*cw*a;wg+=cw*a;}}
  float all=s/w,geo=wg>.5?sg/wg:all,avg=exp2(mix(all,geo,smoothstep(.5,4.,wg)*uGeoW));
  float target=clamp(uKey/max(avg,1e-4),uRange.x,uRange.y),prev=texture(uPrev,vec2(.5)).r;
  float k=uReset>0.0?1.0:1.0-exp(-uDt*(target>prev?1.6:2.6));
  o=vec4(prev+(target-prev)*k,avg,0,1);
}`;
  /* the console's output: exposure, the ACES curve, the grade, then 15-bit colour through a 4 x 4 ordered dither */
  var RESOLVE_FS = `
in vec2 vT;out vec4 o;uniform sampler2D uSrc;uniform sampler2D uExpo;uniform float uExpoK;uniform float uPre;uniform vec2 uGrade;uniform float uDither;uniform float uExpoBias;
const float BY[16]=float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
vec3 aces(vec3 c){mat3 m1=mat3(.59719,.07600,.02840,.35458,.90834,.13383,.04823,.01566,.83777);mat3 m2=mat3(1.60475,-.10208,-.00327,-.53108,1.10813,-.07276,-.07367,-.00605,1.07602);
  vec3 v=m1*c;vec3 a=v*(v+.0245786)-.000090537,b=v*(.983729*v+.4329510)+.238081;return clamp(m2*(a/b),0.,1.);}
vec3 srgb(vec3 c){return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(.0031308,c));}
void main(){
  ivec2 p=ivec2(gl_FragCoord.xy);vec3 c=texelFetch(uSrc,p,0).rgb/uPre;
  float ex=(uExpoK>0.?uExpoK:texelFetch(uExpo,ivec2(0),0).r)*uExpoBias;
  c=aces(c*ex);float l=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(l),c,uGrade.x);c=clamp((c-.5)*uGrade.y+.5,0.,1.);c=srgb(c);
  if(uDither>0.){float d=(BY[((p.y&3)<<2)|(p.x&3)]+.5)/16.-.5;c=clamp(floor(c*31.+.5+d*uDither)/31.,0.,1.);}
  o=vec4(c,1.);
}`;
  /* the picture to the screen. Sharp pixels: each of the small picture's pixels a flat square, with one screen pixel of
     blend at its edges, so a 4.5x scale doesn't leave every other row a pixel fatter. CRT: scanlines through the rows,
     an aperture grille across the columns, a little glow and a vignette */
  var UPSCALE_FS = `
in vec2 vT;out vec4 o;uniform sampler2D uSrc;uniform vec2 uSrcRes;uniform vec2 uOutRes;uniform float uCRT;
void main(){
  vec2 px=vT*uSrcRes,i=floor(px),f=px-i,sc=uOutRes/uSrcRes;
  f=clamp((f-.5)*sc+.5,0.,1.);vec3 c=texture(uSrc,(i+f)/uSrcRes).rgb;
  if(uCRT>0.){
    vec3 g=texture(uSrc,(i+vec2(.5))/uSrcRes+vec2(1.,0.)/uSrcRes).rgb+texture(uSrc,(i+vec2(.5))/uSrcRes-vec2(1.,0.)/uSrcRes).rgb;
    c=mix(c,c*.7+g*.15,.6*uCRT);
    float y=fract(px.y),sl=mix(1.,.58+.42*pow(sin(y*3.14159),1.6)*1.18,uCRT);
    float mx=mod(gl_FragCoord.x,3.);vec3 mask=mix(vec3(1.),mx<1.?vec3(1.12,.92,.92):mx<2.?vec3(.92,1.12,.92):vec3(.92,.92,1.12),.7*uCRT);
    vec2 q=vT-.5;c*=sl*mask*(1.-dot(q,q)*.55*uCRT)*(1.+.14*uCRT);}
  o=vec4(c,1.);
}`;
  var LED_FS = `
in vec2 vT;out vec4 o;
uniform sampler2D uSrc;uniform sampler2D uHud;uniform vec2 uRes;uniform float uGain;uniform float uQuant;
void main(){
  vec2 cell=vT*uRes;vec2 id=floor(cell);vec2 f=fract(cell)-.5;vec2 tc=(id+.5)/uRes;
  vec3 c=pow(texture(uSrc,tc).rgb,vec3(2.2));vec4 hu=texture(uHud,vec2(tc.x,1.-tc.y));c=mix(c,pow(hu.rgb,vec3(2.2))*1.2,hu.a);
  float r=.43,fw=max(fwidth(cell.x),fwidth(cell.y)),dd=length(f),dm=1.0-smoothstep(r-fw*.6-.03,r+fw*.6,dd),hot=1.0-smoothstep(0.0,r,dd),far=smoothstep(.38,.95,fw);
  o=vec4(pow((c*uGain+vec3(.52,.5,.62)*.016)*mix(dm*(.74+.48*hot),.58,far),vec3(1./2.2)),1.0);
}`;
  /* ---------- the tiers: what the game reads of them (55_gfx's budgets, 12_display's dynamic resolution) ---------- */
  var QUALITY = {
    mobile: { maxScale: 1, dpr: 1.5, probeEvery: 1, farCSM: 2, lamps: 6 },
    low: { maxScale: 1, dpr: 2, probeEvery: 1, farCSM: 2, lamps: 8 },
    medium: { maxScale: 1, dpr: 2, probeEvery: 1, farCSM: 2, lamps: 10 },
    high: { maxScale: 1, dpr: 2, probeEvery: 1, farCSM: 2, lamps: 14 },
    ultra: { maxScale: 1, dpr: 2, probeEvery: 1, farCSM: 2, lamps: 20 }
  };
  /* an empty light grid until the town's (59_daynight's lgBuild) replaces it */
  function emptyGrid(G) {
    return { n: 0, params: [0, 0, 1, 0], tex: G.texture(4, 1, "rgba32f", { filter: "nearest" }), grid: G.texture(1, 1, "rg32ui", { filter: "nearest" }), list: G.texture(1, 1, "r32ui", { filter: "nearest" }),
      stats: { lights: 0, entries: 0, maxPerCell: 0 }, bindings() { return { uLights: this.tex, uLGrid: this.grid, uLList: this.list }; } };
  }
  var Renderer = class {
    constructor(canvas, { quality = "low", sky = null } = {}) {
      this.canvas = canvas;
      const G = createGL(canvas);
      this.G = G;
      const gl = G.gl;
      this.gl = gl;
      this.Q = Object.assign({}, QUALITY[quality] || QUALITY.low);
      this.qname = quality;
      /* (a 16-bit float picture where the phone can draw into one; else 8 bits, a fixed exposure and a quarter scale for headroom) */
      this.hdr = !!G.ext.cbf;
      this.pre = this.hdr ? 1 : .25;
      this.scale = 1;
      this.frameN = 0;
      this.prevVP = null;
      this.resetTAA = true;
      this.probeFilled = 1;
      this.shadowAll = false;
      this.extra = [];
      const P = (n, vs, fs, d) => { const p = G.program(n, vs, fs, d); p.own = true; return p; };
      this.P = {
        sky: P("sky", FS_VS, sky || "out vec4 o;void main(){o=vec4(0,0,0,1);}"),
        expo: this.hdr ? P("expo", FS_VS, EXPO_FS) : null,
        resolve: P("resolve", FS_VS, RESOLVE_FS),
        up: P("upscale", FS_VS, UPSCALE_FS),
        led: P("led", FS_VS, LED_FS)
      };
      this.U = {
        uFlick: new Float32Array(16).fill(1), uDyn: new Float32Array(192), uNDyn: 0, uHL: new Float32Array(20), uOcc: new Float32Array(64), uNOcc: 0,
        uLightsOn: 1, uGridP: [0, 0, 1, 0], uSnap: 0, uPre: this.pre, uCSMOn: 0, uHLShOn: 0
      };
      if (this.hdr) {
        this.expo = [0, 1].map(() => G.texture(1, 1, "rgba16f", { filter: "nearest" }));
        this.expoFB = this.expo.map((t) => G.target([t]));
        this.expoI = 0;
      }
      this.expoFix = 1;
      /* the GPU's time per frame: its timer where it has one, a fence otherwise */
      {const gt = (location.search.match(/[?&]gputime=(\w+)/) || [])[1] || "";
        this.timer = gt === "off" ? null : gt === "fence" ? G.fenceTimer() : G.timer() || G.fenceTimer();}
      this.gpuSrc = this.timer ? (this.timer.fence ? "fence" : "timer") : "none";
      this.gpuMs = -1;
      const F = () => new Float32Array(16);
      this.m = { V: F(), P: F(), VP: F(), inv: F(), res: [0, 0] };
      this.cb = { r: [0, 0, 0], up: [0, 0, 0], b: [0, 0, 0], f: null };
      this.camBasis = this.cb;
      this.pl = [0, 1, 2, 3, 4, 5].map(() => [0, 0, 0, 0]);
      this.hlPos = [0, 0, 0];
      /* (what the game's shadow hooks and the origin step look for: there are no shadow maps to point them at) */
      this.csmFB = [null, null, null];
      this.hlFB = null;
      this.lights = emptyGrid(G);
      {
        const dbg = gl.getExtension("WEBGL_debug_renderer_info");
        let n = "";
        try { n = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); } catch (e) {}
        this.gpuRaw = String(n || "unknown");
        const m = /^ANGLE \((?:[^,]+), (.+?)(?: \(0x[0-9a-f]+\))?(?: (?:Direct3D|OpenGL|Vulkan|Metal|D3D).*)?(?:, [^,]*)?\)$/i.exec(this.gpuRaw);
        this.gpuName = (m && m[1].length > 5 ? m[1] : this.gpuRaw.replace(/^ANGLE \(/, "").replace(/\)$/, "")).replace(/\s+/g, " ").trim();
        this.software = /SwiftShader|Basic Render|llvmpipe|softpipe|Software/i.test(this.gpuRaw);
      }
      this.W = 0; this.H = 0; this.iw = 0; this.ih = 0;
    }
    /* the world: none of the renderer's own here; the light grid the game asks for (its own replaces it, 59_daynight) */
    loadWorld(city) {
      const G = this.G;
      if (this.lights) { G.del(this.lights.tex); G.del(this.lights.grid); G.del(this.lights.list); }
      this.lights = emptyGrid(G);
      this.U.uGridP = this.lights.params;
    }
    /* (no shadow maps: the game's wrapper round this is never called) */
    shadowPass(S) {}
    /* the small picture's size: RETRO.lines rows (never more than the screen has), as wide as the screen's shape */
    resize(W, H, scale = this.scale) {
      const G = this.G;
      this.W = W; this.H = H; this.scale = 1;
      const ih = Math.max(64, Math.min(H, Math.round(RETRO.lines))), iw = Math.max(64, Math.round(ih * W / Math.max(1, H)));
      if (iw === this.iw && ih === this.ih) return;
      this.iw = iw; this.ih = ih;
      for (const t of [this.cT, this.dT, this.ldr].filter(Boolean)) G.del(t);
      for (const f of [this.mainFB, this.ldrFB].filter(Boolean)) G.delTarget(f);
      this.cT = G.texture(iw, ih, this.hdr ? "rgba16f" : "rgba8", { mips: !!this.hdr });
      this.dT = G.texture(iw, ih, "depth24", { filter: "nearest" });
      this.mainFB = G.target([this.cT], this.dT);
      this.ldr = G.texture(iw, ih, "rgba8");
      this.ldrFB = G.target([this.ldr]);
      this.resetTAA = true;
    }
    /* ---------- per-frame matrices: no jitter, so the last frame's matrix and this one's are the same thing ---------- */
    camera(S) {
      const c = S.cam, asp = this.W / this.H, f = c.fwd, u0 = c.up || [0, 1, 0], cb = this.cb, b = cb.b, r = cb.r, up = cb.up;
      b[0] = -f[0]; b[1] = -f[1]; b[2] = -f[2];
      r[0] = u0[1] * b[2] - u0[2] * b[1]; r[1] = u0[2] * b[0] - u0[0] * b[2]; r[2] = u0[0] * b[1] - u0[1] * b[0];
      const rl = Math.hypot(r[0], r[1], r[2]) || 1; r[0] /= rl; r[1] /= rl; r[2] /= rl;
      up[0] = b[1] * r[2] - b[2] * r[1]; up[1] = b[2] * r[0] - b[0] * r[2]; up[2] = b[0] * r[1] - b[1] * r[0];
      const m = this.m, V = M4.view(c.pos, r, up, b, m.V), near = c.near || .25, far = c.far || 3200;
      const Pn = M4.persp(c.fov, asp, near, far, m.P);
      if (c.shift) Pn[8] += c.shift;
      const VP = M4.mul(Pn, V, m.VP), U = this.U;
      U.uView = V; U.uProj = Pn; U.uVP = VP; U.uVPnj = VP; U.uPrevVP = VP; U.uInvVP = M4.invert(VP, m.inv);
      U.uCam = c.pos; U.uNear = near; U.uFar = far; U.uJit = [0, 0];
      m.res[0] = this.iw; m.res[1] = this.ih; U.uRes = m.res;
      cb.f = f; this.near = near; this.far = far; this.fov = c.fov; this.asp = asp; this.VPnj = VP;
      this.planes = M4.planes(VP, this.pl);
    }
    texSet() {
      if (!this.texs || this.texs.uLights !== this.lights.tex) this.texs = this.lights.bindings();
      return this.texs;
    }
    /* ---------- the frame ---------- */
    render(S) {
      const G = this.G, gl = this.gl, U = this.U, Q = this.Q, E = S.env;
      if (this.timer) { if (this.frameN % 3 === 0) this.gpuMs = this.timer.poll(); this.timer.begin(); }
      if (!this.mainFB) this.resize(this.canvas.width, this.canvas.height);
      this.camera(S);
      U.uTime = S.time; U.uFrame = this.frameN;
      /* (a retro night: the moon a little dimmer than the full game's, so the lamps, the neon and the headlights carry it) */
      const mk = 1 - .4 * (E.night || 0), sc = this.sunK || (this.sunK = [0, 0, 0]); sc[0] = E.sunCol[0] * mk; sc[1] = E.sunCol[1] * mk; sc[2] = E.sunCol[2] * mk;
      U.uSunDir = E.sunDir; U.uSunCol = sc; U.uAmbUp = E.ambUp; U.uAmbDn = E.ambDn;
      U.uFogCol = E.fogCol; U.uFogDen = E.fogDen; U.uFogFall = E.fogFall; U.uFogAmb = E.fogAmb;
      U.uWet = E.wet; U.uRain = E.rain; U.uNight = E.night;
      U.uSkyZen = E.skyZen; U.uSkyHor = E.skyHor; U.uSkyGlow = E.skyGlow; U.uCloud = E.cloud; U.uStars = E.stars; U.uSunSize = E.sunSize;
      U.uLightsOn = E.lightsOn; U.uLit = E.lit; U.uSignal = S.time * .9;
      U.uSnap = RETRO.snap ? 1 : 0; U.uPre = this.pre; U.uFog0 = RETRO.fog; U.uFlat = RETRO.flat ? 1 : 0; U.uWarp = RETRO.warp ? .8 : 0;
      for (const k in U) G.ownU.add(k);
      U.uFlick.fill(1);
      const fl = S.flicker;
      if (fl) for (let i = 0, n = Math.min(16, fl.length); i < n; i++) U.uFlick[i] = fl[i];
      const dyn = S.dyn || [], D = U.uDyn;
      U.uNDyn = Math.min(16, dyn.length);
      D.fill(0);
      for (let i = 0; i < U.uNDyn; i++) {
        const L = dyn[i], o = i * 12, d = L.dir;
        D[o] = L.pos[0]; D[o + 1] = L.pos[1]; D[o + 2] = L.pos[2]; D[o + 3] = L.r;
        D[o + 4] = L.col[0]; D[o + 5] = L.col[1]; D[o + 6] = L.col[2]; D[o + 7] = L.type || 0;
        D[o + 8] = d ? d[0] : 0; D[o + 9] = d ? d[1] : -1; D[o + 10] = d ? d[2] : 0; D[o + 11] = L.cosO ?? -1;
      }
      const hl = S.headlights;
      if (hl && hl.on > 0) {
        const H = U.uHL, pl = hl.posL, pr = hl.posR, dr = hl.dir, rt = hl.right, cl = hl.col;
        H[0] = pl[0]; H[1] = pl[1]; H[2] = pl[2]; H[3] = hl.on; H[4] = pr[0]; H[5] = pr[1]; H[6] = pr[2]; H[7] = hl.high || 0;
        H[8] = dr[0]; H[9] = dr[1]; H[10] = dr[2]; H[11] = 0; H[12] = rt[0]; H[13] = rt[1]; H[14] = rt[2]; H[15] = 0;
        H[16] = cl[0]; H[17] = cl[1]; H[18] = cl[2]; H[19] = hl.range;
        const c = this.hlPos; c[0] = (pl[0] + pr[0]) / 2; c[1] = (pl[1] + pr[1]) / 2; c[2] = (pl[2] + pr[2]) / 2;
      } else U.uHL[3] = 0;
      const oc = S.occ || [];
      U.uNOcc = Math.min(8, oc.length);
      for (let i = 0; i < U.uNOcc; i++) U.uOcc.set(oc[i], i * 8);
      for (const h of this.extra) h.prepare && h.prepare(this, S);
      /* the scene: everything the hooks draw, then the sky where nothing was, then the see-through things */
      G.bind(this.mainFB);
      gl.clearColor(0, 0, 0, 0); gl.clearDepth(1); gl.depthMask(true);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); gl.disable(gl.BLEND);
      const texs = this.texSet();
      for (const h of this.extra) h.opaque && h.opaque(this, U, texs);
      gl.disable(gl.CULL_FACE);
      const Ps = G.use(this.P.sky); G.set(Ps, U); G.fullscreen();
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
      for (const h of this.extra) h.glass && h.glass(this, U, texs);
      for (const h of this.extra) h.particles && h.particles(this, U, texs);
      gl.disable(gl.BLEND); gl.depthMask(true); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
      /* the eye: the picture's log average, eased (16-bit picture only) */
      let eo = 0;
      if (this.hdr) {
        gl.bindTexture(gl.TEXTURE_2D, this.cT.t); gl.generateMipmap(gl.TEXTURE_2D);
        const ei = this.expoI; eo = 1 - ei; this.expoI = eo;
        const Pe = G.use(this.P.expo); G.bind(this.expoFB[eo]);
        G.set(Pe, { uDt: S.dt || 1 / 60, uKey: E.key * (1 - .3 * (E.night || 0)), uRange: E.expoRange || [.05, 40], uReset: this.frameN < 2 || S.cut ? 1 : 0, uLod: Math.max(0, this.cT.levels - 4), uPre: this.pre, uGeoW: .55 + .2 * (E.night || 0) });
        G.tex(Pe, { uSrc: this.cT, uPrev: this.expo[ei] }); G.fullscreen();
      } else {
        /* (an 8-bit picture has no headroom to average: a fixed exposure from the light the frame is lit with) */
        const L = (c) => .2126 * c[0] + .7152 * c[1] + .0722 * c[2], g = .25 * (L(E.sunCol) * Math.max(E.sunDir[1], .05) / Math.PI + L(E.ambUp)), s = .5 * (L(E.skyHor) + L(E.skyZen));
        this.expoFix = Math.min((E.expoRange || [0, 40])[1], Math.max((E.expoRange || [.05])[0], E.key / Math.max(.55 * g + .45 * s, 1e-4)));
      }
      /* the console's output, in its own small picture */
      const Pr = G.use(this.P.resolve); G.bind(this.ldrFB);
      G.set(Pr, { uExpoK: this.hdr ? 0 : this.expoFix, uPre: this.pre, uGrade: E.grade || [1, 1], uDither: RETRO.dither ? 1 : 0, uExpoBias: E.expoBias || 1 });
      G.tex(Pr, this.hdr ? { uSrc: this.cT, uExpo: this.expo[eo] } : { uSrc: this.cT });
      G.fullscreen();
      /* to the screen: the LED matrix, or the pixels (sharp, or through a CRT) */
      if (S.led) {
        const Pl = G.use(S.led.program || this.P.led);
        G.bind(null, [0, 0, this.canvas.width, this.canvas.height]);
        G.set(Pl, Object.assign({ uRes: S.led.res, uGain: 1.25, uQuant: S.led.quant ?? 15 }, S.led.uniforms || {}));
        G.tex(Pl, Object.assign({ uSrc: this.ldr, uHud: S.led.hud }, S.led.textures || {}));
        G.fullscreen();
      } else {
        const Pu = G.use(this.P.up);
        G.bind(null, [0, 0, this.canvas.width, this.canvas.height]);
        G.set(Pu, { uSrcRes: [this.iw, this.ih], uOutRes: [this.canvas.width, this.canvas.height], uCRT: RETRO.crt ? 1 : 0 });
        G.tex(Pu, { uSrc: this.ldr }); G.fullscreen();
      }
      if (S.after) S.after(this);
      this.prevVP = this.VPnj;
      this.frameN++;
      if (this.timer) this.timer.end();
    }
  };
  /* ---------- the rain: streaks falling through a box round the camera, made in the vertex shader (no drop is kept on
     the CPU), stopped at the ground by the mask of heights the game makes round the camera (53_fx's rainMaskMake),
     lit by the sky and the lamps they pass. The same face the game talks to as Shiftlight 3's particles: rain.on,
     rain.fall, rain.camVel, setMask, maskP ---------- */
  var RAIN_VS = FRAME + NOISE + LIGHTING + POINT_LIGHT + `
uniform sampler2D uMask;uniform vec4 uMaskP;uniform vec3 uFall;uniform float uOn;uniform float uBox;
out float vA;out vec3 vLi;
void main(){
  int id=gl_InstanceID,v=gl_VertexID;float fi=float(id);
  vec3 r=vec3(h11(fi*.37+1.),h11(fi*.71+2.),h11(fi*1.13+3.));
  /* (anchored to the world and wrapped round the camera: drops stay put as you drive through them) */
  vec3 w=r*uBox+uFall*uTime;vec3 c=uCam+mod(w-uCam+uBox*.5,vec3(uBox))-uBox*.5;
  vec2 mk=texture(uMask,(c.xz-uMaskP.xy)*uMaskP.z).rg;
  float above=step(mk.r,c.y)*mk.g;
  vec3 dir=normalize(uFall);float len=.45+.25*r.x;
  vec3 p=c-dir*len*float(v&1);
  vA=above*uOn*(h11(fi*3.3)<uOn?1.:0.);vLi=lightAt(c,normalize(uCam-c));
  gl_Position=uVP*vec4(p,1.);}`;
  var RAIN_FS = `in float vA;in vec3 vLi;out vec4 o;void main(){if(vA<=0.)discard;o=vec4(vLi*.5+vec3(.03),1.)*.35*vA;}`;
  var Particles = class {
    constructor(R, mask, { rainN = 2600 } = {}) {
      this.R = R; const G = R.G; this.G = G;
      this.P = { rain: G.program("rain", RAIN_VS, RAIN_FS) };
      this.rainN = Math.min(rainN, 3000);
      this.rain = { on: 0, fall: [1.2, -9.5, .6], camVel: [0, 0, 0] };
      this.setMask(mask);
      R.extra.push(this);
    }
    setMask(mask) {
      const G = this.G;
      if (this.maskT) G.del(this.maskT);
      const md = new Float32Array(mask.n * mask.n * 2); md.set(mask.data);
      this.maskT = G.texture(mask.n, mask.n, "rg32f", { data: md, filter: "nearest" });
      this.maskP = mask.params;
    }
    particles(R, U, texs) {
      if (this.rain.on <= .01) return;
      const G = this.G, gl = R.gl, P = G.use(this.P.rain);
      G.set(P, U); G.tex(P, texs); G.tex(P, { uMask: this.maskT });
      const f = this.rain.fall, v = this.rain.camVel || [0, 0, 0];
      G.uni(P, "uFall", [f[0] - v[0] * .4, f[1], f[2] - v[2] * .4]); G.uni(P, "uOn", this.rain.on); G.uni(P, "uBox", 24);
      G.uni(P, "uMaskP", [this.maskP[0], this.maskP[1], this.maskP[2], 0]);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      G.procedural(2, Math.round(this.rainN * Math.min(1, this.rain.on + .2)), gl.LINES);
    }
  };
  return { Renderer, DRS, M4, QUALITY, GLSL: { FRAME, NOISE, PACK, LIGHTING, SHADE }, FS_VS, POINT_LIGHT, SOFT, Particles, createGL };
})();
