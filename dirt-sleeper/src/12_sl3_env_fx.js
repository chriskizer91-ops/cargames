  // src/render/env.js
  var N = (v) => {
    let l = Math.hypot(...v);
    return v.map((x) => x / l);
  }, ENVS = {
    rain: {
      name: "Midnight Rain",
      night: 1,
      sunDir: N([0.3, 0.55, -0.4]),
      sunCol: [0, 0, 0],
      sunSize: 0.012,
      ambUp: [0.01, 0.012, 0.022],
      ambDn: [6e-3, 5e-3, 6e-3],
      skyZen: [4e-3, 5e-3, 9e-3],
      skyHor: [0.016, 0.015, 0.022],
      skyGlow: [0.05, 0.026, 0.018],
      cloud: 1,
      stars: 0,
      fogCol: [0.02, 0.016, 0.02],
      fogDen: 65e-4,
      fogFall: 0.045,
      fogAmb: [8e-3, 7e-3, 0.01],
      wet: 1,
      rain: 1,
      puddles: 1,
      lightsOn: 1,
      lit: 0.55,
      key: 0.11,
      expoRange: [0.8, 40],
      bloom: 0.075,
      grade: [1.08, 1.04]
    },
    night: {
      name: "Clear Night",
      night: 1,
      sunDir: N([-0.35, 0.6, -0.3]),
      sunCol: [0.022, 0.028, 0.04],
      sunSize: 0.014,
      ambUp: [8e-3, 0.011, 0.02],
      ambDn: [5e-3, 5e-3, 6e-3],
      skyZen: [2e-3, 4e-3, 0.012],
      skyHor: [0.012, 0.014, 0.024],
      skyGlow: [0.03, 0.018, 0.014],
      cloud: 0.25,
      stars: 1,
      fogCol: [0.02, 0.018, 0.022],
      fogDen: 4e-3,
      fogFall: 0.04,
      fogAmb: [6e-3, 6e-3, 9e-3],
      wet: 0.35,
      rain: 0,
      puddles: 0.45,
      lightsOn: 1,
      lit: 0.5,
      key: 0.1,
      expoRange: [0.8, 40],
      bloom: 0.065,
      grade: [1.05, 1.04]
    },
    dusk: {
      name: "Golden Hour",
      night: 0.6,
      sunDir: N([-0.8, 0.09, 0.25]),
      sunCol: [3.4, 1.75, 0.75],
      sunSize: 0.02,
      ambUp: [0.22, 0.24, 0.36],
      ambDn: [0.09, 0.07, 0.06],
      skyZen: [0.12, 0.2, 0.42],
      skyHor: [1.25, 0.75, 0.45],
      skyGlow: [0.08, 0.04, 0.03],
      cloud: 0.35,
      stars: 0,
      fogCol: [0.55, 0.38, 0.3],
      fogDen: 35e-4,
      fogFall: 0.03,
      fogAmb: [0.16, 0.11, 0.09],
      wet: 0,
      rain: 0,
      puddles: 0,
      lightsOn: 0.7,
      lit: 0.25,
      key: 0.14,
      expoRange: [0.05, 8],
      bloom: 0.05,
      grade: [1.1, 1.06]
    },
    day: {
      name: "High Noon",
      night: 0,
      sunDir: N([0.45, 0.62, 0.38]),
      sunCol: [6.2, 5.8, 5.2],
      sunSize: 95e-4,
      ambUp: [0.32, 0.42, 0.62],
      ambDn: [0.12, 0.11, 0.1],
      skyZen: [0.18, 0.36, 0.95],
      skyHor: [0.75, 0.88, 1.1],
      skyGlow: [0, 0, 0],
      cloud: 0.25,
      stars: 0,
      fogCol: [0.6, 0.7, 0.88],
      fogDen: 11e-4,
      fogFall: 0.02,
      fogAmb: [0.18, 0.22, 0.3],
      wet: 0,
      rain: 0,
      puddles: 0,
      lightsOn: 0,
      lit: 0.04,
      key: 0.16,
      expoRange: [0.02, 3],
      bloom: 0.035,
      grade: [1.04, 1.03]
    }
  }, ENV_IDS = Object.keys(ENVS);

  // src/render/glsl/particles.js
  var POINT_LIGHT = `
uniform vec3 uFogAmb;
/* returns scattered radiance for a thin, mostly forward-scattering medium */
vec3 lightAt(vec3 X,vec3 V){
  vec3 c=mix(uAmbDn,uAmbUp,.6)*1.2+uFogAmb*4.;
  if(dot(uSunCol,uSunCol)>1e-6)c+=uSunCol*(.25+.75*pow(saturate(dot(-V,uSunDir)),4.));
  if(uLightsOn>0.0){ivec2 cell=ivec2(floor((X.xz-uGridP.xy)*uGridP.z));int gw=int(uGridP.w);
    if(cell.x>=0&&cell.y>=0&&cell.x<gw&&cell.y<gw){uvec2 oc=texelFetch(uLGrid,cell,0).xy;int n=min(int(oc.y),12);
      for(int k=0;k<n;k++){int idx=int(oc.x)+k;int li=int(texelFetch(uLList,ivec2(idx&1023,idx>>10),0).x);
        vec4 A=LT(li,0),B=LT(li,1),C=LT(li,2),D=LT(li,3);int code=int(B.w+.5),type=code&7,fl=code>>3;
        vec3 Lp=A.xyz;if(type==2){vec3 ax=C.xyz;Lp+=ax*clamp(dot(X-Lp,ax)/max(dot(ax,ax),1e-4),-1.,1.);}
        vec3 Lv=Lp-X;float d2=dot(Lv,Lv);if(d2>A.w*A.w)continue;vec3 L=Lv*inversesqrt(d2);
        float att=falloff(d2,A.w);if(type==1)att*=smoothstep(C.w,D.x,dot(-L,C.xyz));
        /* drops light up most when the light is behind them */
        c+=B.rgb*(fl>0?uFlick[fl&7]:1.0)*att*(.025+.11*pow(saturate(dot(-V,L)),3.))*uLightsOn;}}}
  for(int i=0;i<uNDyn;i++){vec4 A=uDyn[i*3],B=uDyn[i*3+1],C=uDyn[i*3+2];vec3 Lv=A.xyz-X;float d2=dot(Lv,Lv);if(d2>A.w*A.w)continue;vec3 L=Lv*inversesqrt(d2);
    float att=falloff(d2,A.w);if(int(B.w+.5)==1)att*=smoothstep(C.w,C.w+.12,dot(-L,C.xyz));c+=B.rgb*att*(.025+.11*pow(saturate(dot(-V,L)),3.));}
  if(uHL[0].w>0.0){vec3 F=uHL[2].xyz,Rt=uHL[3].xyz,Up=cross(Rt,F);vec3 hp=(uHL[0].xyz+uHL[1].xyz)*.5;vec3 Lv=hp-X;float d2=dot(Lv,Lv);
    if(d2<uHL[4].w*uHL[4].w){vec3 L=Lv*inversesqrt(d2);float b=beam(-L,F,Rt,Up,uHL[1].w);c+=uHL[4].rgb*b*falloff(d2,uHL[4].w)*(.02+.13*pow(saturate(dot(-V,L)),3.))*uHL[0].w;}}
  return c;
}`, SOFT = `
uniform highp sampler2D uDepth;uniform vec2 uOutRes;
float linz(float d){float z=d*2.-1.;return 2.*uNear*uFar/(uFar+uNear-z*(uFar-uNear));}
float soft(float vz,float range){float sz=linz(texture(uDepth,gl_FragCoord.xy/uOutRes).r);return saturate((sz-vz)/range);}
`, MASK = "uniform sampler2D uMask;uniform vec4 uMaskP;vec2 maskAt(vec2 xz){return texture(uMask,(xz-uMaskP.xy)*uMaskP.z).rg;}", RAIN_VS = FRAME + NOISE + LIGHTING + POINT_LIGHT + MASK + `
uniform vec3 uBox;uniform vec3 uFall;uniform vec3 uCamVel;uniform float uStreak;uniform float uDensity;
out vec2 vQ;out vec3 vC;out float vA;out float vZ;
void main(){
  int id=gl_InstanceID,v=gl_VertexID;
  float fi=float(id);vec3 h=vec3(h11(fi*.1031+.13),h11(fi*.7311+.37),h11(fi*.3771+.71));
  if(h11(fi*.917+.5)>uDensity){gl_Position=vec4(2,2,2,1);return;}
  vec3 fall=uFall*(.85+.3*h11(fi*.21));
  vec3 p=uCam+(fract((h*uBox-uCam+fall*uTime)/uBox)-.5)*uBox;
  vec2 m=maskAt(p.xz);if(m.y<.5&&p.y<m.x+12.){gl_Position=vec4(2,2,2,1);return;}
  if(p.y<m.x){gl_Position=vec4(2,2,2,1);return;}
  vec3 rel=fall-uCamVel;vec3 tail=p-rel*uStreak;
  vec4 a=uVP*vec4(p,1.),b=uVP*vec4(tail,1.);
  if(a.w<.2||b.w<.2){gl_Position=vec4(2,2,2,1);return;}
  vec2 sa=a.xy/a.w,sb=b.xy/b.w;vec2 d=(sb-sa)*uRes;float L=length(d);vec2 dir=L>1e-3?d/L:vec2(0,1);vec2 nr=vec2(-dir.y,dir.x);
  /* a drop is about 2 mm wide: draw at least one pixel and fade instead */
  float wpx=.0025*uProj[1][1]*uRes.y*.5/a.w;float w=max(wpx,.75);vA=min(1.,wpx/.75);
  int c=v<3?v:(v==3?2:(v==4?1:3));
  vec2 corner=vec2(float(c&1),float(c>>1));
  vec4 P=mix(a,b,corner.y);vec2 off=nr*(corner.x*2.-1.)*w/uRes*2.*P.w;
  gl_Position=vec4(P.xy+off,P.zw);
  vQ=vec2(corner.x*2.-1.,corner.y);
  vec3 V=normalize(uCam-p);
  vC=lightAt(p,V);vZ=a.w;
  vA*=smoothstep(.8,3.,a.w)*(1.0-smoothstep(uBox.x*.35,uBox.x*.5,length(p.xz-uCam.xz)))*min(1.,30./max(L,1.)+.3);
}`, RAIN_FS = FRAME + SOFT + `
in vec2 vQ;in vec3 vC;in float vA;in float vZ;out vec4 o;
void main(){float e=1.0-vQ.x*vQ.x;float a=e*vA*(.35+.65*sin(vQ.y*3.14))*.55*soft(vZ,.4);
  if(a<.002)discard;o=vec4(vC*a*5.,a*.2);}`, SPLASH_VS = FRAME + NOISE + LIGHTING + POINT_LIGHT + MASK + `
uniform float uRadius;uniform float uDensity;
out vec2 vQ;out vec3 vC;out float vA;out float vZ;out float vAge;
void main(){
  int id=gl_InstanceID,v=gl_VertexID;float fi=float(id);
  float per=.35+.4*h11(fi*.37);float ph=h11(fi*.71);float cyc=floor(uTime/per+ph);float age=fract(uTime/per+ph);
  if(age>.22||h11(fi*.53+cyc*.17)>uDensity){gl_Position=vec4(2,2,2,1);return;}
  vec2 r=vec2(h11(fi*.113+cyc*.731),h11(fi*.419+cyc*.297));float ang=r.x*6.2831,rad=sqrt(r.y)*uRadius;
  vec2 xz=uCam.xz+vec2(cos(ang),sin(ang))*rad;vec2 m=maskAt(xz);if(m.y<.5){gl_Position=vec4(2,2,2,1);return;}
  vec3 p=vec3(xz.x,m.x+.01,xz.y);
  vec3 V=normalize(uCam-p);vec3 rt=normalize(cross(vec3(0,1,0),V));
  float sz=(.05+.11*age/.22)*(.7+.6*h11(fi*.9));
  int c=v<3?v:(v==3?2:(v==4?1:3));vec2 corner=vec2(float(c&1),float(c>>1));
  vec3 P=p+rt*(corner.x*2.-1.)*sz+vec3(0,1,0)*corner.y*sz*1.2;
  vec4 cp=uVP*vec4(P,1.);gl_Position=cp;vZ=cp.w;
  vQ=vec2(corner.x*2.-1.,corner.y);vAge=age/.22;
  vC=lightAt(p+vec3(0,.05,0),V);vA=(1.0-smoothstep(uRadius*.6,uRadius,rad))*smoothstep(1.,3.,cp.w);
}`, SPLASH_FS = FRAME + NOISE + SOFT + `
in vec2 vQ;in vec3 vC;in float vA;in float vZ;in float vAge;out vec4 o;
void main(){
  vec2 q=vQ*vec2(1.,1.);float r=length(vec2(q.x,q.y*1.4));
  /* a crown: a thin rim that rises and spreads, flung droplets above it */
  float rim=smoothstep(.15,0.,abs(q.y-(.15+.25*vAge)*(1.0-q.x*q.x*.8)))*step(q.y,.6)*(1.0-abs(q.x));
  vec2 dq=fract(q*vec2(3.,2.5)+vec2(0,-vAge))-.5;float drops=smoothstep(.18,.0,length(dq))*step(.3,q.y)*(1.0-vAge);
  float a=max(rim,drops)*(1.0-vAge)*vA*.7*soft(vZ,.15);
  if(a<.003)discard;o=vec4(vC*a*4.,a*.25);}`, PUFF_VS = FRAME + NOISE + LIGHTING + POINT_LIGHT + `
layout(location=0) in vec4 iP;   /* position, size */
layout(location=1) in vec4 iD;   /* alpha, kind, seed, age */
out vec2 vQ;out vec3 vC;out float vA;out float vZ;out vec2 vS;
void main(){
  int v=gl_VertexID;int c=v<3?v:(v==3?2:(v==4?1:3));vec2 corner=vec2(float(c&1),float(c>>1))*2.-1.;
  vec3 p=iP.xyz;float sz=iP.w;vec3 V=normalize(uCam-p);vec3 rt=normalize(cross(vec3(0,1,0),V)),up=cross(V,rt);
  float rot=iD.z*6.2831+iD.w*.6;vec2 cr=vec2(cos(rot)*corner.x-sin(rot)*corner.y,sin(rot)*corner.x+cos(rot)*corner.y);
  vec3 P=p+(rt*cr.x+up*cr.y)*sz;vec4 cp=uVP*vec4(P,1.);gl_Position=cp;vZ=cp.w;
  vQ=corner;vS=vec2(iD.y,iD.z);
  vC=lightAt(p,V);vA=iD.x;
}`, PUFF_FS = FRAME + NOISE + SOFT + `
in vec2 vQ;in vec3 vC;in float vA;in float vZ;in vec2 vS;out vec4 o;
void main(){
  float r=length(vQ);if(r>1.)discard;
  float n=fbm(vQ*1.7+vS.y*37.)*.7+.3;
  float a=smoothstep(1.,.2,r)*n*vA*soft(vZ,.6);
  int kind=int(vS.x+.5);
  vec3 tint=kind==1?vec3(.82,.84,.88):kind==2?vec3(.9):kind==3?vec3(.8,.64,.45):kind==4?vec3(.2,.13,.075):kind==5?vec3(.05,.045,.04):kind==6?vec3(.8,.85,.9):vec3(.75,.8,.86);
  if(kind==4||kind==6)a=smoothstep(1.,.55,r)*vA*soft(vZ,.3)*(kind==4?1.4:1.);
  if(a<.002)discard;o=vec4(vC*tint*a*.5,a);}`;

  // src/render/particles.js
  var MAXP = 3e3, Particles = class {
    constructor(R2, mask, { rainN = 9e3, splashN = 1400 } = {}) {
      this.R = R2;
      let G2 = R2.G, gl = R2.gl;
      this.G = G2, this.P = { rain: G2.program("rain", RAIN_VS, RAIN_FS), splash: G2.program("splash", SPLASH_VS, SPLASH_FS), puff: G2.program("puff", PUFF_VS, PUFF_FS) };
      let md = new Float32Array(mask.n * mask.n * 2);
      md.set(mask.data), this.maskT = G2.texture(mask.n, mask.n, "rg32f", { data: md, filter: G2.ext.flt ? "linear" : "nearest" }), this.maskP = mask.params, this.rainN = rainN, this.splashN = splashN, this.n = 0, this.p = new Float32Array(MAXP * 3), this.v = new Float32Array(MAXP * 3), this.life = new Float32Array(MAXP), this.age = new Float32Array(MAXP), this.size0 = new Float32Array(MAXP), this.size1 = new Float32Array(MAXP), this.a0 = new Float32Array(MAXP), this.kind = new Uint8Array(MAXP), this.seed = new Float32Array(MAXP), this.inst = new Float32Array(MAXP * 8), this.order = new Uint16Array(MAXP), this.vao = gl.createVertexArray(), gl.bindVertexArray(this.vao), this.buf = gl.createBuffer(), gl.bindBuffer(gl.ARRAY_BUFFER, this.buf), gl.bufferData(gl.ARRAY_BUFFER, this.inst.byteLength, gl.DYNAMIC_DRAW), gl.enableVertexAttribArray(0), gl.vertexAttribPointer(0, 4, gl.FLOAT, !1, 32, 0), gl.vertexAttribDivisor(0, 1), gl.enableVertexAttribArray(1), gl.vertexAttribPointer(1, 4, gl.FLOAT, !1, 32, 16), gl.vertexAttribDivisor(1, 1), gl.bindVertexArray(null), this.rain = { on: 0, fall: [1.2, -9.5, 0.6], camVel: [0, 0, 0] }, this.emitAcc = /* @__PURE__ */ new Map(), R2.extra.push(this);
    }
    /* spawn one puff. kind: 0 spray, 1 tyre smoke, 2 steam */
    spawn(kind, p, v, life, s0, s1, a0) {
      let i;
      this.n < MAXP ? i = this.n++ : i = Math.floor(Math.random() * MAXP), this.p.set(p, i * 3), this.v.set(v, i * 3), this.life[i] = life, this.age[i] = 0, this.size0[i] = s0, this.size1[i] = s1, this.a0[i] = a0, this.kind[i] = kind, this.seed[i] = Math.random();
    }
    /* emit at a rate (per second) from a named source, carrying the fraction between frames */
    emit(key, rate, dt, fn) {
      let a = (this.emitAcc.get(key) || 0) + rate * dt;
      for (; a >= 1; )
        fn(), a -= 1;
      this.emitAcc.set(key, a);
    }
    update(dt, camPos) {
      let w = 0;
      for (let i = 0; i < this.n; i++) {
        if (this.age[i] += dt, this.age[i] >= this.life[i]) continue;
        let k = this.kind[i], o = i * 3, drag = [2.2, 1.1, 0.5, 1.5, 0.35, 0.9, 0.6][k] ?? 1, rise = [-1.6, 0.45, 0.9, 0.2, -9.5, 0.75, -9.5][k] ?? 0, e = Math.exp(-drag * dt);
        if (this.v[o] *= e, this.v[o + 1] = this.v[o + 1] * e + rise * dt, this.v[o + 2] *= e, this.p[o] += this.v[o] * dt, this.p[o + 1] += this.v[o + 1] * dt, this.p[o + 2] += this.v[o + 2] * dt, w !== i) {
          this.p.copyWithin(w * 3, o, o + 3), this.v.copyWithin(w * 3, o, o + 3);
          for (let A of [this.life, this.age, this.size0, this.size1, this.a0, this.kind, this.seed]) A[w] = A[i];
        }
        w++;
      }
      this.n = w;
      let d = new Float32Array(this.n);
      for (let i = 0; i < this.n; i++) {
        let o = i * 3;
        d[i] = (this.p[o] - camPos[0]) ** 2 + (this.p[o + 1] - camPos[1]) ** 2 + (this.p[o + 2] - camPos[2]) ** 2, this.order[i] = i;
      }
      let ord = Array.from(this.order.subarray(0, this.n)).sort((a, b) => d[b] - d[a]);
      for (let j = 0; j < ord.length; j++) {
        let i = ord[j], o = i * 3, t = this.age[i] / this.life[i], q = j * 8, sz = this.size0[i] + (this.size1[i] - this.size0[i]) * Math.sqrt(t), a = this.a0[i] * Math.min(1, t * 6) * (1 - t) * (1 - t);
        this.inst[q] = this.p[o], this.inst[q + 1] = this.p[o + 1], this.inst[q + 2] = this.p[o + 2], this.inst[q + 3] = sz, this.inst[q + 4] = a, this.inst[q + 5] = this.kind[i], this.inst[q + 6] = this.seed[i], this.inst[q + 7] = this.age[i];
      }
    }
    particles(R2, U, texs) {
      let G2 = this.G, gl = R2.gl;
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA), gl.disable(gl.DEPTH_TEST), gl.disable(gl.CULL_FACE);
      let common = Object.assign({ uMask: this.maskT, uDepth: R2.dT }, texs), vals = { uMaskP: this.maskP, uOutRes: [R2.W, R2.H], uFogAmb: U.uFogAmb }, U2 = Object.assign({}, U, { uVP: U.uVPnj });
      if (this.rain.on > 0.01) {
        let P = G2.use(this.P.rain);
        G2.set(P, U2), G2.set(P, vals), G2.tex(P, common), G2.set(P, { uBox: [38, 22, 38], uFall: this.rain.fall, uCamVel: this.rain.camVel, uStreak: 1 / 45, uDensity: this.rain.on }), G2.procedural(6, this.rainN), P = G2.use(this.P.splash), G2.set(P, U2), G2.set(P, vals), G2.tex(P, common), G2.set(P, { uRadius: 22, uDensity: this.rain.on }), G2.procedural(6, this.splashN);
      }
      if (this.n) {
        let P = G2.use(this.P.puff);
        G2.set(P, U2), G2.set(P, vals), G2.tex(P, common), gl.bindBuffer(gl.ARRAY_BUFFER, this.buf), gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.inst, 0, this.n * 8), gl.bindVertexArray(this.vao), gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.n), gl.bindVertexArray(null);
      }
    }
  };

  // src/render/drs.js
  var DRS = class {
    constructor({ min = 0.5, max = 1, start = 0.8 } = {}) {
      this.min = min, this.max = max, this.scale = start, this.period = 1e3 / 60, this.hist = [], this.cool = 0, this.okT = 0, this.enabled = !0, this.gpuSm = -1;
    }
    /* learn the display's refresh period from the steadiest frame deltas */
    noteFrame(ms) {
      if (this.hist.push(ms), this.hist.length > 90 && this.hist.shift(), this.hist.length >= 30) {
        let s = [...this.hist].sort((a, b) => a - b), p = s[Math.floor(s.length * 0.2)], hz = [60, 75, 90, 100, 120, 144, 165, 240].reduce((b, h) => Math.abs(1e3 / h - p) < Math.abs(1e3 / b - p) ? h : b, 60);
        this.period = 1e3 / Math.min(hz, 120);
      }
    }
    update(frameMs, gpuMs) {
      if (!this.enabled) return this.scale;
      if (this.noteFrame(frameMs), this.cool > 0)
        return this.cool--, this.scale;
      let budget = this.period * 0.88, s = this.scale;
      if (gpuMs > 0) {
        this.gpuSm = this.gpuSm < 0 ? gpuMs : this.gpuSm * 0.85 + gpuMs * 0.15;
        let want = s * Math.sqrt(budget / Math.max(this.gpuSm, 0.5));
        (want < s * 0.97 || want > s * 1.05) && (s = s + (want - s) * 0.35);
      } else {
        if (frameMs > this.period * 1.3)
          this.bad = this.scale, this.badT = 900, s -= frameMs > this.period * 2 ? 0.1 : 0.05, this.okT = 0;
        else if (this.okT++, this.okT > 120) {
          let cap = this.badT > 0 ? this.bad - 0.05 : this.max;
          s + 0.05 <= cap + 1e-6 && (s += 0.05), this.okT = 0;
        }
        this.badT > 0 && this.badT--;
      }
      return s = Math.round(Math.max(this.min, Math.min(this.max, s)) * 20) / 20, s !== this.scale && (this.scale = s, this.cool = 20), this.scale;
    }
  };

