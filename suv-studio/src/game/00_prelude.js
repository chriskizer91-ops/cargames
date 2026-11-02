/* (from 10_core, 13_lit and 12_gl_mesh: the helpers the car builders need, with MB.build handing back its arrays) */
const KIT_OUT=[];
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,rnd=(a,b)=>a+Math.random()*(b-a),TAU=Math.PI*2,PI=Math.PI;
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const sgn=v=>v<0?-1:v>0?1:0;
const wrapA=a=>{while(a>PI)a-=TAU;while(a<-PI)a+=TAU;return a;};
function hexRGB(h){const n=parseInt(h.slice(1),16);return [n>>16&255,n>>8&255,n&255];}
/* sRGB hex -> linear float triple (for the GPU) */
function lin(h,k=1){const c=hexRGB(h);return [Math.pow(c[0]/255,2.2)*k,Math.pow(c[1]/255,2.2)*k,Math.pow(c[2]/255,2.2)*k];}
const c255=v=>v<0?0:v>255?255:v|0;
const pack=(r,g,b,a=255)=>(((a&255)<<24)|(c255(b)<<16)|(c255(g)<<8)|c255(r))>>>0;
const hx=(h,a=255)=>{const c=hexRGB(h);return pack(c[0],c[1],c[2],a);};
function mixC(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}

/* ---- tiny vector / matrix kit (column-major mat4 for GL) ---- */
const V3={
  add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],
  mul:(a,k)=>[a[0]*k,a[1]*k,a[2]*k],dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
  cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
  len:a=>Math.hypot(a[0],a[1],a[2]),norm:a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l];},
  lerp:(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]
};
const M4={
  id(){const m=new Float32Array(16);m[0]=m[5]=m[10]=m[15]=1;return m;},
  persp(fovy,asp,n,f){const t=1/Math.tan(fovy/2),m=new Float32Array(16);m[0]=t/asp;m[5]=t;m[10]=(f+n)/(n-f);m[11]=-1;m[14]=2*f*n/(n-f);return m;},
  look(e,c,up){
    const z=V3.norm(V3.sub(e,c)),x=V3.norm(V3.cross(up,z)),y=V3.cross(z,x),m=new Float32Array(16);
    m[0]=x[0];m[4]=x[1];m[8]=x[2];m[1]=y[0];m[5]=y[1];m[9]=y[2];m[2]=z[0];m[6]=z[1];m[10]=z[2];
    m[12]=-V3.dot(x,e);m[13]=-V3.dot(y,e);m[14]=-V3.dot(z,e);m[15]=1;return m;
  },
  mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s;}return o;},
  inv(m){const a=m,o=new Float32Array(16);
    const b0=a[0]*a[5]-a[1]*a[4],b1=a[0]*a[6]-a[2]*a[4],b2=a[0]*a[7]-a[3]*a[4],b3=a[1]*a[6]-a[2]*a[5],b4=a[1]*a[7]-a[3]*a[5],b5=a[2]*a[7]-a[3]*a[6],
      b6=a[8]*a[13]-a[9]*a[12],b7=a[8]*a[14]-a[10]*a[12],b8=a[8]*a[15]-a[11]*a[12],b9=a[9]*a[14]-a[10]*a[13],b10=a[9]*a[15]-a[11]*a[13],b11=a[10]*a[15]-a[11]*a[14];
    let d=b0*b11-b1*b10+b2*b9+b3*b8-b4*b7+b5*b6;if(!d)return M4.id();d=1/d;
    o[0]=(a[5]*b11-a[6]*b10+a[7]*b9)*d;o[1]=(a[2]*b10-a[1]*b11-a[3]*b9)*d;o[2]=(a[13]*b5-a[14]*b4+a[15]*b3)*d;o[3]=(a[10]*b4-a[9]*b5-a[11]*b3)*d;
    o[4]=(a[6]*b8-a[4]*b11-a[7]*b7)*d;o[5]=(a[0]*b11-a[2]*b8+a[3]*b7)*d;o[6]=(a[14]*b2-a[12]*b5-a[15]*b1)*d;o[7]=(a[8]*b5-a[10]*b2+a[11]*b1)*d;
    o[8]=(a[4]*b10-a[5]*b8+a[7]*b6)*d;o[9]=(a[1]*b8-a[0]*b10-a[3]*b6)*d;o[10]=(a[12]*b4-a[13]*b2+a[15]*b0)*d;o[11]=(a[9]*b2-a[8]*b4-a[11]*b0)*d;
    o[12]=(a[5]*b7-a[4]*b9-a[6]*b6)*d;o[13]=(a[0]*b9-a[1]*b7+a[2]*b6)*d;o[14]=(a[13]*b1-a[12]*b3-a[14]*b0)*d;o[15]=(a[8]*b3-a[9]*b1+a[10]*b0)*d;return o;},
  /* rigid transform from a basis: forward f, up u, right r (unit vectors) and position p. Local +X=fwd, +Y=up, +Z=right */
  basis(p,f,u,r){const m=new Float32Array(16);m[0]=f[0];m[1]=f[1];m[2]=f[2];m[4]=u[0];m[5]=u[1];m[6]=u[2];m[8]=r[0];m[9]=r[1];m[10]=r[2];m[12]=p[0];m[13]=p[1];m[14]=p[2];m[15]=1;return m;},
  xform(m,p){return [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];}
};
/* yaw convention used everywhere: forward(yaw) = (cos, 0, -sin); positive yaw turns LEFT */
const fwdOf=a=>[Math.cos(a),0,-Math.sin(a)],leftOf=a=>[-Math.sin(a),0,-Math.cos(a)];
const MAT={COL:0,PAINT:1,GLASS:2,GLASSL:3,ACCENT:4,CHROME:5,TYRE:6,TAIL:7,HEAD:8,LED:9,AMBER:10,MESH:11,RIM:12,CLAD:13,SHUT:14,EMIT:15,METAL:16,CARBON:17,LOUVRE:18,CALIPER:19,ROTOR:20,FLOOR:21,PLATE:22,REV:23,SMOKE:24,REFL:25,FABRIC:26,RUBBER:27,HALO:29};
class MB{
  constructor(){this.p=[];this.n=[];this.c=[];this.m=[];this.M=null;}
  setM(m){this.M=m;return this;}
  _v(p){if(!this.M)return p;return M4.xform(this.M,p);}
  /* (the face's normal worked out in place: a car is a few hundred thousand of these, and the little arrays the
     vector helpers make for each one were a good part of the time it took to build) */
  tri(a,b,c,col,em=0,mat=0){
    if(this.M){a=M4.xform(this.M,a);b=M4.xform(this.M,b);c=M4.xform(this.M,c);}
    const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2],
      cx=uy*vz-uz*vy,cy=uz*vx-ux*vz,cz=ux*vy-uy*vx,l=Math.hypot(cx,cy,cz)||1,nx=cx/l,ny=cy/l,nz=cz/l,r=col[0],g=col[1],bl=col[2];
    this.p.push(a[0],a[1],a[2],b[0],b[1],b[2],c[0],c[1],c[2]);this.n.push(nx,ny,nz,nx,ny,nz,nx,ny,nz);
    this.c.push(r,g,bl,em,r,g,bl,em,r,g,bl,em);this.m.push(mat,mat,mat);
  }
  quad(a,b,c,d,col,em,mat){this.tri(a,b,c,col,em,mat);this.tri(a,c,d,col,em,mat);}
  /* quad with a colour per corner (gradients) */
  quadC(a,b,c,d,ca,cb,cc,cd,em=0,mat=0){const n0=this.c.length;this.quad(a,b,c,d,ca,em,mat);const C=[ca,cb,cc,ca,cc,cd];for(let k=0;k<6;k++)for(let j=0;j<3;j++)this.c[n0+k*4+j]=C[k][j];}
  /* weld the normals of coincident vertices whose faces lie within the crease angle, after
     turning every face outward from centre o: flat facets become smooth, real edges stay sharp */
  smooth(deg=40,o=null,v0=0){
    const ct=Math.cos(deg*PI/180),P=this.p,N=this.n,nv=P.length/3,G=new Map();
    if(o)for(let i=v0;i<nv;i++){const d=(P[i*3]-o[0])*N[i*3]+(P[i*3+1]-o[1])*N[i*3+1]+(P[i*3+2]-o[2])*N[i*3+2];if(d<0){N[i*3]=-N[i*3];N[i*3+1]=-N[i*3+1];N[i*3+2]=-N[i*3+2];}}
    const O=N.slice();
    for(let i=v0;i<nv;i++){const k=(Math.round(P[i*3]*500)+16384)*1073741824+(Math.round(P[i*3+1]*500)+16384)*32768+(Math.round(P[i*3+2]*500)+16384);let g=G.get(k);if(!g)G.set(k,g=[]);g.push(i);}
    for(const g of G.values()){if(g.length<2)continue;for(const i of g){let x=0,y=0,z=0;
      for(const j of g)if(O[i*3]*O[j*3]+O[i*3+1]*O[j*3+1]+O[i*3+2]*O[j*3+2]>=ct){x+=O[j*3];y+=O[j*3+1];z+=O[j*3+2];}
      const l=Math.hypot(x,y,z)||1;N[i*3]=x/l;N[i*3+1]=y/l;N[i*3+2]=z/l;}}
    return this;
  }
  box(x0,y0,z0,x1,y1,z1,col,em=0,mat=0,skip=''){
    const P=(x,y,z)=>[x,y,z];
    if(!skip.includes('t'))this.quad(P(x0,y1,z0),P(x0,y1,z1),P(x1,y1,z1),P(x1,y1,z0),col,em,mat);
    if(!skip.includes('b'))this.quad(P(x0,y0,z0),P(x1,y0,z0),P(x1,y0,z1),P(x0,y0,z1),col,em,mat);
    if(!skip.includes('x'))this.quad(P(x1,y0,z0),P(x1,y1,z0),P(x1,y1,z1),P(x1,y0,z1),col,em,mat);
    if(!skip.includes('X'))this.quad(P(x0,y0,z0),P(x0,y0,z1),P(x0,y1,z1),P(x0,y1,z0),col,em,mat);
    if(!skip.includes('z'))this.quad(P(x0,y0,z1),P(x1,y0,z1),P(x1,y1,z1),P(x0,y1,z1),col,em,mat);
    if(!skip.includes('Z'))this.quad(P(x0,y0,z0),P(x0,y1,z0),P(x1,y1,z0),P(x1,y0,z0),col,em,mat);
  }
  /* cylinder along an axis ('x','y','z') centred at c */
  cyl(c,r,len,seg,axis,col,em=0,mat=0,caps=true,capCol,capMat){
    const pts=(o)=>{const a=[];for(let i=0;i<seg;i++){const t=i/seg*TAU,u=Math.cos(t)*r,v=Math.sin(t)*r;
      a.push(axis==='x'?[c[0]+o,c[1]+u,c[2]+v]:axis==='y'?[c[0]+u,c[1]+o,c[2]+v]:[c[0]+u,c[1]+v,c[2]+o]);}return a;};
    const A=pts(-len/2),B=pts(len/2);
    for(let i=0;i<seg;i++){const j=(i+1)%seg;this.quad(A[i],A[j],B[j],B[i],col,em,mat);}
    if(caps){const ca=axis==='x'?[c[0]-len/2,c[1],c[2]]:axis==='y'?[c[0],c[1]-len/2,c[2]]:[c[0],c[1],c[2]-len/2];
      const cb=axis==='x'?[c[0]+len/2,c[1],c[2]]:axis==='y'?[c[0],c[1]+len/2,c[2]]:[c[0],c[1],c[2]+len/2];
      for(let i=0;i<seg;i++){const j=(i+1)%seg;this.tri(ca,A[j],A[i],capCol||col,em,capMat===undefined?mat:capMat);this.tri(cb,B[i],B[j],capCol||col,em,capMat===undefined?mat:capMat);}}
  }
  cone(c,r,h,seg,col,em=0,mat=0){const top=[c[0],c[1]+h,c[2]];for(let i=0;i<seg;i++){const a=i/seg*TAU,b=(i+1)/seg*TAU;
    const p=[c[0]+Math.cos(a)*r,c[1],c[2]+Math.sin(a)*r],q=[c[0]+Math.cos(b)*r,c[1],c[2]+Math.sin(b)*r];this.tri(p,q,top,col,em,mat);this.tri(p,c,q,col,em,mat);}}
  /* a low sphere-ish blob (octahedron subdivided once) */
  blob(c,rx,ry,rz,col,em=0,mat=0){
    const v=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]],f=[[0,2,4],[4,2,1],[1,2,5],[5,2,0],[0,4,3],[4,1,3],[1,5,3],[5,0,3]];
    const P=a=>[c[0]+a[0]*rx,c[1]+a[1]*ry,c[2]+a[2]*rz];
    for(const [a,b,d] of f){const ab=V3.norm(V3.add(v[a],v[b])),bd=V3.norm(V3.add(v[b],v[d])),da=V3.norm(V3.add(v[d],v[a]));
      this.tri(P(v[a]),P(ab),P(da),col,em,mat);this.tri(P(ab),P(v[b]),P(bd),col,em,mat);this.tri(P(da),P(bd),P(v[d]),col,em,mat);this.tri(P(ab),P(bd),P(da),col,em,mat);}
  }
  get count(){return this.p.length/3;}
  append(o){for(const k of ['p','n','c','m'])for(let i=0;i<o[k].length;i++)this[k].push(o[k][i]);return this;}
  build(){const o={p:this.p,n:this.n,c:this.c,m:this.m,tris:this.p.length/9,n_:this.p.length/3};KIT_OUT.push(o);return o;}
}
const M4T=(x,y,z)=>{const m=M4.id();m[12]=x;m[13]=y;m[14]=z;return m;};
const M4RY=a=>{const m=M4.id(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m;};
const M4S=(x,y,z)=>{const m=M4.id();m[0]=x;m[5]=y;m[10]=z;return m;};
const M4RX=a=>{const m=M4.id(),c=Math.cos(a),s=Math.sin(a);m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m;};
const M4RZ=a=>{const m=M4.id(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[1]=s;m[4]=-s;m[5]=c;return m;};
