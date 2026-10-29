/* =====================================================================================
   THE RANCH, from Dirt Sleeper. The land, the trails, the strip, the mud pit, the burnout pad,
   the creek and the rock garden are shaped by Dirt Sleeper's own code (unchanged apart from the
   trees), so they drive the same. What it draws goes through MeshBuilderI below instead of
   Shiftlight 3's builder: the same calls, but the vertices carry this renderer's material ids
   (see RMAT and 61_ranchmesh.js). The coarse ground is meshed separately, with levels of detail.
   Speed-ups that change nothing: the noise hash uses Math.imul, the spatial hashes use number keys,
   paths skip buckets with nothing near, and noise terms with no weight aren't worked out.
   The world is a mile square now: the hills that closed the ranch in have moved out to the new edge,
   and the country round it (59_country.js) hooks into the build at each stage through X. The
   trees are drawn instanced in a few shapes; their positions and every random draw are unchanged.
   ===================================================================================== */
const RMAT={TERRAIN:40,ROCK:41,STRIP:42,TRAIL:43,MUDTRACK:44,CONCRETE:45,WOOD:46,SHEET:47,LEAF:48,HAY:49,WATER:50,SKY:51,LINE:52,GRAVEL:53,ASPHALT:54,RUTS:55};
const Ranch=(()=>{
'use strict';
function rng(seed=1){let s=seed>>>0||1;return ()=>(s^=s<<13,s>>>=0,s^=s>>>17,s^=s<<5,s>>>=0,s/4294967296);}
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],neg=a=>[-a[0],-a[1],-a[2]],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
  dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],norm=a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l];};
const s2l=v=>Math.pow(v/255,2.2);
/* Dirt Sleeper's material (id, variant) to this renderer's: material id and the four floats it reads from the colour */
function mapVertex(m,c,u,w,ao,out){
  const id=m[0],vr=m[1];
  if(id===16){out[4]=RMAT.TERRAIN;out[0]=c[0]/255;out[1]=c[1]/255;out[2]=c[2]/255;out[3]=ao===undefined?c[3]/255:ao;return;}
  if(id===17){out[4]=vr===0?RMAT.STRIP:vr===2?RMAT.MUDTRACK:vr===3?RMAT.GRAVEL:vr===4?RMAT.ASPHALT:vr===5?RMAT.RUTS:RMAT.TRAIL;out[0]=u;out[1]=w;out[2]=0;out[3]=1;return;}
  if(id===21){out[4]=RMAT.ROCK;out[0]=out[1]=out[2]=1;out[3]=ao===undefined?1:ao;return;}
  if(id===23){out[4]=MAT.EMIT;out[0]=1;out[1]=.62;out[2]=.12;out[3]=.6;return;}
  if(id===7){out[4]=MAT.EMIT;out[0]=1;out[1]=.95;out[2]=.85;out[3]=1.6;return;}
  const mid=id===4?RMAT.CONCRETE:id===18?RMAT.WOOD:id===19?RMAT.SHEET:id===20?RMAT.LEAF:id===22?RMAT.HAY:id===24?RMAT.WATER:MAT.COL;
  out[4]=mid;out[0]=s2l(c[0]);out[1]=s2l(c[1]);out[2]=s2l(c[2]);out[3]=id===19?vr:0;
}
/* an indexed builder with Shiftlight 3's interface: v() returns an index, the shapes add triangles */
class MeshBuilderI{
  constructor(){this.P=[];this.N=[];this.C=[];this.M=[];this.idx=[];this.nv=0;this.m=[0,0,0,0];this.c=[255,255,255,255];this.mn=[1e9,1e9,1e9];this.mx=[-1e9,-1e9,-1e9];this.o=[0,0,0,0,0];}
  col(r,g,b,a=255){this.c=[r|0,g|0,b|0,a|0];return this;}
  v(p,n,u=0,w=0,ao){const o=this.o;mapVertex(this.m,this.c,u,w,ao,o);const l=Math.hypot(n[0],n[1],n[2])||1;
    this.P.push(p[0],p[1],p[2]);this.N.push(n[0]/l,n[1]/l,n[2]/l);this.C.push(o[0],o[1],o[2],o[3]);this.M.push(o[4]);
    for(let k=0;k<3;k++){if(p[k]<this.mn[k])this.mn[k]=p[k];if(p[k]>this.mx[k])this.mx[k]=p[k];}return this.nv++;}
  tri(a,b,c){this.idx.push(a,b,c);}
  quad(a,b,c,d){this.idx.push(a,b,c,a,c,d);}
  quadP(p0,p1,p2,p3,uv=[[0,0],[1,0],[1,1],[0,1]],n){if(!n)n=cross(sub(p1,p0),sub(p3,p0));
    const a=this.v(p0,n,uv[0][0],uv[0][1]),b=this.v(p1,n,uv[1][0],uv[1][1]),c=this.v(p2,n,uv[2][0],uv[2][1]),d=this.v(p3,n,uv[3][0],uv[3][1]);this.quad(a,b,c,d);}
  box(c,ax,ay,az,h,skip=0){
    if(dot(cross(ax,ay),az)<0)az=neg(az);
    const P=(sx,sy,sz)=>[c[0]+ax[0]*h[0]*sx+ay[0]*h[1]*sy+az[0]*h[2]*sz,c[1]+ax[1]*h[0]*sx+ay[1]*h[1]*sy+az[1]*h[2]*sz,c[2]+ax[2]*h[0]*sx+ay[2]*h[1]*sy+az[2]*h[2]*sz];
    [[ax,[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1]],[neg(ax),[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]],[ay,[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]],
     [neg(ay),[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]],[az,[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],[neg(az),[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]]]
      .forEach((f,i)=>{if(skip&(1<<i))return;this.quadP(P(...f[1]),P(...f[2]),P(...f[3]),P(...f[4]),undefined,f[0]);});
  }
  tube(a,b,r,n=6,caps=true,r2=r){
    const d=sub(b,a),L=Math.hypot(...d);if(L<1e-5)return;
    const t=d.map(x=>x/L),ref=Math.abs(t[1])<.9?[0,1,0]:[1,0,0],u=norm(cross(t,ref)),w=cross(t,u),ring=[],sl=(r-r2)/L;
    for(let i=0;i<=n;i++){const an=i/n*Math.PI*2,cs=Math.cos(an),sn=Math.sin(an),rn=[u[0]*cs+w[0]*sn,u[1]*cs+w[1]*sn,u[2]*cs+w[2]*sn],nn=norm([rn[0]+t[0]*sl,rn[1]+t[1]*sl,rn[2]+t[2]*sl]);
      ring.push([this.v([a[0]+rn[0]*r,a[1]+rn[1]*r,a[2]+rn[2]*r],nn,i/n,0),this.v([b[0]+rn[0]*r2,b[1]+rn[1]*r2,b[2]+rn[2]*r2],nn,i/n,L)]);}
    for(let i=0;i<n;i++)this.quad(ring[i][0],ring[i+1][0],ring[i+1][1],ring[i][1]);
    if(caps){const ca=this.v(a,neg(t)),cb=this.v(b,t);
      for(let i=0;i<n;i++){const p=(an,rr,o)=>[o[0]+(u[0]*Math.cos(an)+w[0]*Math.sin(an))*rr,o[1]+(u[1]*Math.cos(an)+w[1]*Math.sin(an))*rr,o[2]+(u[2]*Math.cos(an)+w[2]*Math.sin(an))*rr];
        const a0=i/n*Math.PI*2,a1=(i+1)/n*Math.PI*2;
        this.tri(ca,this.v(p(a1,r,a),neg(t)),this.v(p(a0,r,a),neg(t)));
        if(r2>1e-4)this.tri(cb,this.v(p(a0,r2,b),t),this.v(p(a1,r2,b),t));}}
  }
  sphere(c,r,seg=6,rings=4){const ix=[];
    for(let j=0;j<=rings;j++){const ph=j/rings*Math.PI,row=[];for(let i=0;i<=seg;i++){const th=i/seg*Math.PI*2,n=[Math.sin(ph)*Math.cos(th),Math.cos(ph),Math.sin(ph)*Math.sin(th)];
      row.push(this.v([c[0]+n[0]*r,c[1]+n[1]*r,c[2]+n[2]*r],n,i/seg,j/rings));}ix.push(row);}
    for(let j=0;j<rings;j++)for(let i=0;i<seg;i++)this.quad(ix[j][i],ix[j][i+1],ix[j+1][i+1],ix[j+1][i]);}
  /* a lumpy low-poly clump for tree crowns */
  blob(c,rx,ry,rz,seg=7,rings=4){const ix=[],sd=c[0]*1.7+c[2]*.9;
    for(let j=0;j<=rings;j++){const ph=j/rings*Math.PI,row=[];for(let i=0;i<=seg;i++){const th=i/seg*Math.PI*2,n=[Math.sin(ph)*Math.cos(th),Math.cos(ph),Math.sin(ph)*Math.sin(th)],
      wob=j===0||j===rings?1:1+.16*Math.sin(th*3+j*2.1+sd)+.1*Math.sin(th*5-j*1.3+sd*2);
      row.push(this.v([c[0]+n[0]*rx*wob,c[1]+n[1]*ry*wob,c[2]+n[2]*rz*wob],n,0,0));}ix.push(row);}
    for(let j=0;j<rings;j++)for(let i=0;i<seg;i++)this.quad(ix[j][i],ix[j][i+1],ix[j+1][i+1],ix[j+1][i]);}
}
/* geometry sorted into square tiles by where it sits */
class ChunkedI{
  constructor(size=64){this.size=size;this.tiles=new Map();this.m=[0,0,0,0];this.c=[255,255,255,255];}
  at(x,z){const k=Math.floor(x/this.size)+','+Math.floor(z/this.size);let B=this.tiles.get(k);if(!B){B=new MeshBuilderI();B.key=k;this.tiles.set(k,B);}B.m=this.m.slice();B.c=this.c.slice();return B;}
  mat(id,p1=0,p2=0,p3=0){this.m=[id,p1|0,p2|0,p3|0];return this;}
  col(r,g,b,a=255){this.c=[r|0,g|0,b|0,a|0];return this;}
}
  var SURF = ["grass", "dirt", "strip", "trail", "rock", "mud", "concrete", "water", "gravel", "asphalt", "ruts"], SF = {};
  SURF.forEach((n, i) => SF[n] = i);
  var RANCH_DEF = {
    size: 1600, cell: 2,
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
    let h = (x, z) => P[(Math.imul(x, 73856093) ^ Math.imul(z, 19349663)) >>> 0 & 511], vn2 = (x, z) => {
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
      let k = (Math.floor(X[i] / B) + 2048) * 4096 + Math.floor(Z[i] / B) + 2048;
      hash.has(k) || hash.set(k, []), hash.get(k).push(i);
    }
    let path = { closed, N: N2, ds, len: L, X, Z }, dil = [], mask = (r) => {
      /* which 16 m buckets have a point within r buckets: a 256 x 256 grid round the origin */
      if (dil[r]) return dil[r];
      let m = new Uint8Array(65536);
      for (let k of hash.keys()) {
        let BX = Math.floor(k / 4096) - 2048 + 128, BZ = k - Math.floor(k / 4096) * 4096 - 2048 + 128;
        for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) {
          let u = BX + a, w = BZ + b;
          u >= 0 && w >= 0 && u < 256 && w < 256 && (m[u * 256 + w] = 1);
        }
      }
      return dil[r] = m;
    };
    /* (a quick no where no bucket within reach holds a point: the same answers, much faster on the big map) */
    path.nearest = (x, z, r = 2) => {
      let bx = Math.floor(x / B), bz = Math.floor(z / B), best = 1e18, bi = -1;
      if (r <= 2) {
        let u = bx + 128, w = bz + 128;
        if (u < 0 || w < 0 || u > 255 || w > 255 || !mask(r)[u * 256 + w]) return null;
      }
      for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) {
        let l = hash.get((bx + a + 2048) * 4096 + bz + b + 2048);
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
      /* (terms whose weight is zero are skipped: same land, less work) */
      north > 0 && (h += north * (30 * NZ.ridge(x / 170 + 3.1, z / 170) + 7 * (NZ.fbm(x / 38, z / 38) - 0.4)) * CTRY.northEase(z));
      h += (west > 0 ? west * 10 * NZ.ridge(x / 120, z / 120 + 7) : 0) + (east > 0 ? east * 6 * NZ.fbm(x / 60, z / 60) : 0);
      h += HL.amp * Math.exp(-((x - HL.x) ** 2 + (z - HL.z) ** 2) / (2 * HL.sig * HL.sig));
      h += 4 * Math.exp(-((x - 140) ** 2 + (z - 150) ** 2) / (2 * 60 * 60)) - 2 * Math.exp(-((x - 60) ** 2 + (z - 220) ** 2) / (2 * 70 * 70));
      return h + CTRY.extra(x, z, NZ);
    }, rim = (x, z) => {
      /* the hills that close the world in, out at its new edge now */
      let e = Math.max(Math.abs(x), Math.abs(z));
      return CTRY.rim(x, z, e, NZ);
    };
    /* the country round the ranch hooks in through X */
    let X = { D, NZ, N2, cell, x0, z0, H, W, SC, SF, SURF, sst, rectDist, natural, makePath, rng, norm, loop };
    CTRY.init(X);
    /* out past the old ranch the land is worked out every 4 m and filled in between (same hills, a third of the work) */
    let N4 = (N2 - 1) / 2 + 1, L4 = new Float32Array(N4 * N4), inner = (x, z) => Math.abs(x) <= 424 && Math.abs(z) <= 424;
    for (let j = 0; j < N4; j++) for (let i = 0; i < N4; i++) {
      let x = x0 + i * 4, z = z0 + j * 4;
      inner(x, z) && inner(x + 4, z + 4) && inner(x - 4, z - 4) || (L4[j * N4 + i] = natural(x, z));
    }
    for (let j = 0; j < N2; j++) for (let i = 0; i < N2; i++) {
      let x = x0 + i * cell, z = z0 + j * cell, h;
      if (inner(x, z)) h = natural(x, z);
      else {
        let a = i >> 1, b = j >> 1, fa = (i & 1) * 0.5, fb = (j & 1) * 0.5, a1 = Math.min(N4 - 1, a + 1), b1 = Math.min(N4 - 1, b + 1);
        h = (L4[b * N4 + a] * (1 - fa) + L4[b * N4 + a1] * fa) * (1 - fb) + (L4[b1 * N4 + a] * (1 - fa) + L4[b1 * N4 + a1] * fa) * fb;
      }
      /* (the flats below change nothing outside this box, so they are only worked out inside it) */
      if (x > -160 && x < 370 && z > -80 && z < 95) {
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
      }
      h = CTRY.shape(x, z, h);
      H[j * N2 + i] = h + rim(x, z);
    }
    let hIdx = (x, z) => [Math.max(0, Math.min(N2 - 1, Math.round((x - x0) / cell))), Math.max(0, Math.min(N2 - 1, Math.round((z - z0) / cell)))];
    /* ---------- carve the trails: smooth the ground along each path ---------- */
    let cStamp = new Int32Array(N2 * N2), cNI = new Int32Array(N2 * N2), cND = new Float64Array(N2 * N2), cRun = 0, carve = (path, halfW, blend, smoothS, cut = 0, maxG = 0) => {
      /* (each cell's nearest path point is worked out once and kept for this carve: the same answers, sooner) */
      cRun++;
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
          let k = jj * N2 + ii;
          if (cStamp[k] !== cRun) {
            let near = path.nearest(x0 + ii * cell, z0 + jj * cell, 1);
            cStamp[k] = cRun, cNI[k] = near ? near.i : -1, cND[k] = near ? near.d : 0;
          }
          if (cNI[k] !== i) continue;
          let w = 1 - sst(halfW, halfW + blend, cND[k]);
          H[k] = H[k] * (1 - w) + (prof[i] - cut * (1 - sst(0, halfW, cND[k]))) * w;
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
    /* the country's roads, track, lane and trails, carved the same way but visiting each cell once */
    let stamp = new Int32Array(N2 * N2), stampN = 0, carveF = (path, halfW, blend, smoothS, cut = 0, maxG = 0, pins = null) => {
      stampN++;
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
        /* limit the grade both ways and take the middle, so climbs and drops are cut alike */
        let f = prof.slice(), b = prof.slice(), g = maxG * path.ds;
        for (let i = 1; i < path.N; i++) f[i] = Math.max(f[i - 1] - g, Math.min(f[i - 1] + g, f[i]));
        for (let i = path.N - 2; i >= 0; i--) b[i] = Math.max(b[i + 1] - g, Math.min(b[i + 1] + g, b[i]));
        for (let i = 0; i < path.N; i++) prof[i] = (f[i] + b[i]) / 2;
      }
      /* where it crosses or meets a road already cut, meet that road at its own level */
      if (pins) for (let other of pins) {
        let best = -1, bd = 1e9;
        for (let i = 0; i <= path.N; i++) {
          let n = i < path.N ? other.nearest(path.X[i], path.Z[i], 1) : null, d = n ? n.d : 1e9;
          if ((d < 2.5 || (i === 0 || i === path.N - 1) && d < 9) && d < bd) bd = d, best = i;
          else if (best >= 0 && (d > 6 || i === path.N)) {
            /* level across the other road (8 m either side), easing back to its own line over the next 40 m */
            let [ix, iz] = hIdx(path.X[best], path.Z[best]), lv = H[iz * N2 + ix];
            for (let j = Math.max(0, best - 48); j <= Math.min(path.N - 1, best + 48); j++) {
              let w = 1 - sst(8, 48, Math.abs(j - best));
              prof[j] = prof[j] * (1 - w) + lv * w;
            }
            /* and never steeper than the path allows on the way out of the crossing */
            if (maxG > 0) {
              let g = maxG * path.ds;
              for (let j = best + 1; j < path.N; j++) {
                let c = Math.max(prof[j - 1] - g, Math.min(prof[j - 1] + g, prof[j]));
                if (c === prof[j] && j > best + 48) break;
                prof[j] = c;
              }
              for (let j = best - 1; j >= 0; j--) {
                let c = Math.max(prof[j + 1] - g, Math.min(prof[j + 1] + g, prof[j]));
                if (c === prof[j] && j < best - 48) break;
                prof[j] = c;
              }
            }
            path.cross || (path.cross = []), path.cross.push([path.X[best], path.Z[best]]), best = -1, bd = 1e9;
          }
        }
      }
      let r = Math.ceil((halfW + blend) / cell) + 1, rr = halfW + blend > 15 ? 2 : 1;
      for (let i = 0; i < path.N; i += 2) {
        let [ci, cj] = hIdx(path.X[i], path.Z[i]);
        for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
          let ii = ci + di, jj = cj + dj;
          if (ii < 0 || jj < 0 || ii >= N2 || jj >= N2) continue;
          let k = jj * N2 + ii;
          if (stamp[k] === stampN) continue;
          stamp[k] = stampN;
          let near = path.nearest(x0 + ii * cell, z0 + jj * cell, rr);
          if (!near) continue;
          let w = 1 - sst(halfW, halfW + blend, near.d);
          /* an open path stops at its ends: nothing past them is cut (a road meets another, it doesn't cap it) */
          if (!path.closed && (near.i === 0 || near.i === path.N - 1)) {
            let e = near.i, d2 = path.dir(e ? path.len : 0), out = ((x0 + ii * cell) - path.X[e]) * d2[0] + ((z0 + jj * cell) - path.Z[e]) * d2[1];
            w *= 1 - sst(0, 3, e ? out : -out);
          }
          if (w <= 0) continue;
          H[k] = H[k] * (1 - w) + (prof[near.i] - cut * (1 - sst(0, halfW, near.d))) * w;
        }
      }
      return prof;
    };
    X.carve = carveF;
    CTRY.carve(X);
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
      /* worn dirt around the pad, the strip and the pit (only near them: elsewhere these change nothing) */
      let core = x > -190 && x < 360 && z > -60 && z < 100, dPad = core ? rectDist(x, z, -D.pad.w / 2, -D.pad.d / 2 - 18, D.pad.w / 2, D.pad.d / 2) : 1e9, dStrip = core ? rectDist(x, z, St.x0 - 6, St.z - St.half, St.x1 + 10, St.z + St.half) : 1e9;
      core && (grass *= sst(4, 16, dPad) * sst(2, 10, dStrip) * sst(2, 10, rectDist(x, z, -30, 6, 10, St.z)));
      let mr = core ? Math.hypot((x - M.x) / M.rx, (z - M.z) / M.rz) : 1e9;
      core && (mud = 1 - sst(0.75, 1.05, mr + (n2 - 0.5) * 0.25), grass *= sst(0.9, 1.4, mr));
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
      let dB = core ? rectDist(x, z, BU.x - BU.w / 2, BU.z - BU.d / 2, BU.x + BU.w / 2, BU.z + BU.d / 2) : 1e9;
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
      CTRY.surface(X, k, x, z);
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
    /* the home lane's ruts: finer than the grid, worked out where the wheels are */
    {
      let hB = heightAt, gB = groundAt;
      heightAt = (x, z) => {
        let l = CTRY.laneGround(x, z);
        return l ? l.y : hB(x, z);
      }, groundAt = (x, z) => CTRY.laneGround(x, z) || gB(x, z);
    }
    X.heightAt = (x, z) => heightAt(x, z), X.groundAt = (x, z) => groundAt(x, z);
    /* the same ground written into an object it is given, the same sums in the same order: the game's
       physics asks for it a hundred times a step for every car, and must not make garbage doing it */
    {
      const baseInto = (x, z, o) => {
        let fx = (x - x0) / cell, fz = (z - z0) / cell, i = Math.floor(fx), j = Math.floor(fz);
        if (i < 0 || j < 0 || i >= N2 - 1 || j >= N2 - 1) { o.y = 80; o.n[0] = 0; o.n[1] = 1; o.n[2] = 0; o.surf = "rock"; return o; }
        fx -= i; fz -= j;
        let h00 = H[j * N2 + i], h10 = H[j * N2 + i + 1], h01 = H[(j + 1) * N2 + i], h11 = H[(j + 1) * N2 + i + 1], y, gx, gz;
        if (fx > fz) { gx = (h10 - h00) / cell; gz = (h11 - h10) / cell; y = h00 + (h10 - h00) * fx + (h11 - h10) * fz; }
        else { gx = (h11 - h01) / cell; gz = (h01 - h00) / cell; y = h00 + (h11 - h01) * fx + (h01 - h00) * fz; }
        let l = Math.hypot(gx, 1, gz), code = SC[(j + (fz > 0.5 ? 1 : 0)) * N2 + i + (fx > 0.5 ? 1 : 0)];
        o.y = y; o.n[0] = -gx / l; o.n[1] = 1 / l; o.n[2] = -gz / l; o.surf = SURF[code]; return o;
      };
      const patchInto = (x, z, o) => {
        let fx = (x - RG.x0) / RG.cell, fz = (z - RG.z0) / RG.cell, i = Math.min(PU - 2, Math.floor(fx)), j = Math.min(PV - 2, Math.floor(fz)), c = RG.cell;
        fx -= i; fz -= j;
        let h00 = PH[j * PU + i], h10 = PH[j * PU + i + 1], h01 = PH[(j + 1) * PU + i], h11 = PH[(j + 1) * PU + i + 1], y, gx, gz;
        if (fx > fz) { gx = (h10 - h00) / c; gz = (h11 - h10) / c; y = h00 + (h10 - h00) * fx + (h11 - h10) * fz; }
        else { gx = (h11 - h01) / c; gz = (h01 - h00) / c; y = h00 + (h11 - h01) * fx + (h01 - h00) * fz; }
        let l = Math.hypot(gx, 1, gz), code = PSC[(j + (fz > 0.5 ? 1 : 0)) * PU + i + (fx > 0.5 ? 1 : 0)];
        o.y = y; o.n[0] = -gx / l; o.n[1] = 1 / l; o.n[2] = -gz / l; o.surf = SURF[code]; return o;
      };
      X.groundInto = (x, z, o) => {
        let l = CTRY.laneGround(x, z);
        if (l) { o.y = l.y; o.n[0] = l.n[0]; o.n[1] = l.n[1]; o.n[2] = l.n[2]; o.surf = l.surf; return o; }
        return inPatch(x, z) ? patchInto(x, z, o) : baseInto(x, z, o);
      };
    }
    /* ---------- geometry ---------- */
    let C2 = new ChunkedI(64), lights = [], colliders = [], R2 = rng(4242);
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
    }, trees = [], TNO = { m: 0, c: 0, first: null, tube() {
      this.m[0] === 20 && !this.first && (this.first = this.c.slice());
    }, blob() {
      this.m[0] === 20 && !this.first && (this.first = this.c.slice());
    } }, pushTree = (x, y, z, kind, sc, v, yaw, js, jy, tint) => {
      /* one tree for the instanced draw: where, which shape, its size and leaf colour */
      trees.push(x, y, z, yaw, sc * js, sc * jy, sc * js, v, s2l(tint[0]), s2l(tint[1]), s2l(tint[2]), 0);
      collideCirc(x, z, 0.35 * sc + 0.15, y + ((kind ? 1.6 : 2.4) + (kind ? 2.2 : 3.4)) * sc);
    }, addTree = (x, z, kind, sc, R) => {
      let t = kind ? [52, 74, 46] : R() < 0.5 ? [70, 96, 44] : [88, 104, 50];
      pushTree(x, heightAt(x, z), z, kind, sc, kind ? 3 + (R() * 2 | 0) : R() * 3 | 0, R() * 6.283, 0.9 + R() * 0.2, 0.92 + R() * 0.2, [t[0] + (R() - 0.5) * 18, t[1] + (R() - 0.5) * 18, t[2] + (R() - 0.5) * 12]);
    }, tree = (x, z, kind, sc) => {
      /* Dirt Sleeper's tree: every random number is drawn as before (so what comes after lands where it
         did), but the tree itself is one of a few shapes drawn instanced, in its own leaf colour */
      TNO.first = null;
      let y = heightAt(x, z), trunkH = (kind ? 1.6 : 2.4) * sc, crownR = (kind ? 2.2 : 3.4) * sc, B = TNO, lean = [(R2() - 0.5) * 0.4, 0, (R2() - 0.5) * 0.4];
      B.m = [18, 1, 0, 0], B.c = [110, 90, 72, 255], B.tube([x, y - 0.3, z], [x + lean[0], y + trunkH + crownR * 0.5, z + lean[2]], 0.18 * sc + 0.08, 6, !1, 0.1 * sc + 0.04);
      let tint = kind ? [52, 74, 46] : R2() < 0.5 ? [70, 96, 44] : [88, 104, 50], top = [x + lean[0], y + trunkH, z + lean[2]];
      B.m = [20, kind, 0, 0];
      if (kind) for (let k = 0; k < 3; k++) {
        let r = crownR * (1 - k * 0.26), y0 = top[1] - 0.4 + k * crownR * 0.62;
        B.c = [tint[0] + (R2() - 0.5) * 16 | 0, tint[1] + (R2() - 0.5) * 16 | 0, tint[2] + (R2() - 0.5) * 12 | 0, 255], B.tube([top[0], y0, top[2]], [top[0], y0 + crownR * 1.15, top[2]], r, 7, !0, 0.05);
      }
      else for (let k = 0; k < 3; k++) {
        let a = R2() * 6.28, d = k ? crownR * (0.35 + R2() * 0.25) : 0, r = crownR * (k ? 0.55 + R2() * 0.2 : 0.78);
        B.c = [tint[0] + (R2() - 0.5) * 22 | 0, tint[1] + (R2() - 0.5) * 22 | 0, tint[2] + (R2() - 0.5) * 14 | 0, 255];
        B.blob([top[0] + Math.cos(a) * d, top[1] + crownR * (0.62 + (k ? R2() * 0.35 : 0)), top[2] + Math.sin(a) * d], r, r * 0.82, r, 8, 4);
      }
      if (CTRY.blocked(x, z, 0.5)) return;
      let h1 = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1, h2 = Math.abs(Math.sin(x * 39.346 + z * 11.135) * 24634.6345) % 1;
      pushTree(x, y, z, kind, sc, kind ? 3 + (h1 * 2 | 0) : h1 * 3 | 0, h2 * 6.283, 1, 1, TNO.first || [70, 96, 44]);
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
      if (CTRY.blocked(x, z, r)) return;
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
    /* ---------- the country round the ranch ---------- */
    Object.assign(X, { C2, box, collideBox, collideCirc, metal, ribbon, rock, addTree, rng });
    CTRY.geometry(X);
    let geo = C2;
    return {
      geo, lights, steam: [], info: { xw: [] }, gridP: { x0: x0, z0: z0, size: D.size, cell: 8 },
      N: N2, cell, x0, z0, H, SC, W, NRM, heightAt, groundAt, groundInto: X.groundInto, strip, loop, climb, creek, creekLevel, gates, mud: M, hill: HL, kick, colliders: gridColliders(colliders), loopProf, climbProf, D,
      burn: BU, mudTrack: mudT, rocks: RG, trees: new Float32Array(trees), country: CTRY.info()
    };
  }
  /* a bucket grid over the colliders so the hull only checks what is near */
  const NONE = [];
  function gridColliders(list) {
    let B = 16, map = new Map(), put = (k, c) => {
      map.has(k) || map.set(k, []), map.get(k).push(c);
    };
    for (let c of list) {
      let ax = c.t === "c" ? c.x - c.r : c.x0, az = c.t === "c" ? c.z - c.r : c.z0, bx = c.t === "c" ? c.x + c.r : c.x1, bz = c.t === "c" ? c.z + c.r : c.z1;
      for (let i = Math.floor(ax / B); i <= Math.floor(bx / B); i++) for (let j = Math.floor(az / B); j <= Math.floor(bz / B); j++) put((i + 2048) * 4096 + j + 2048, c);
    }
    return { list, near: (x, z) => map.get((Math.floor(x / B) + 2048) * 4096 + Math.floor(z / B) + 2048) || NONE };
  }
  /* the physics view of the ranch is the game's GroundWorld (41_ground.js): Mini 4's RanchWorld queries without the garbage */
  return {SURF,SF,RANCH_DEF,buildRanch,makePath,MeshBuilderI,rng,s2l};
})();

