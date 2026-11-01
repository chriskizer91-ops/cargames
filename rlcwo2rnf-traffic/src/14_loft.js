/* ===== loft helpers: designed lines with fillets (from Shiftlight 2), section queries and small parts ===== */
const sm01=t=>t<=0?0:t>=1?1:t*t*(3-2*t);
const plat=(x,c,w,e)=>{const d=Math.abs(x-c);return d<=w?1:d>=w+e?0:.5+.5*Math.cos((d-w)/e*PI);};
/* a silhouette line through corner points [u,y,r]: straight runs joined by radius-r fillets,
   tabulated every 5 mm along u. env>0 keeps the upper envelope (vertical runs collapse to their top),
   env<0 the lower one */
function profLine(K,L,env){
  const n=Math.ceil(L*200)+2,T=new Float32Array(n).fill(NaN);
  const put=(u,y)=>{const i=Math.round(u*200);if(i<0||i>=n)return;const o=T[i];if(o!==o||(env>0?y>o:y<o))T[i]=y;};
  const seg=(a,b)=>{const m=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*400));for(let k=0;k<=m;k++)put(a[0]+(b[0]-a[0])*k/m,a[1]+(b[1]-a[1])*k/m);};
  let cur=K[0];
  for(let i=1;i<K.length;i++){const c=K[i],r=c[2]||0;
    if(r>0&&i<K.length-1){const a=K[i-1],b=K[i+1];
      let ax=c[0]-a[0],ay=c[1]-a[1];const la=Math.hypot(ax,ay)||1;ax/=la;ay/=la;
      let bx=b[0]-c[0],by=b[1]-c[1];const lb=Math.hypot(bx,by)||1;bx/=lb;by/=lb;
      const th=Math.acos(clamp(ax*bx+ay*by,-1,1)),t=Math.min(r*Math.tan(th/2),la*.48,lb*.48);
      const p=[c[0]-ax*t,c[1]-ay*t],q=[c[0]+bx*t,c[1]+by*t];seg(cur,p);
      const m=Math.max(10,Math.ceil(t*900));for(let k=0;k<=m;k++){const s=k/m,o=1-s;put(o*o*p[0]+2*o*s*c[0]+s*s*q[0],o*o*p[1]+2*o*s*c[1]+s*s*q[1]);}
      cur=q;}
    else{seg(cur,c);cur=c;}}
  let last=-1;
  for(let i=0;i<n;i++)if(T[i]===T[i]){if(last<0)for(let j=0;j<i;j++)T[j]=T[i];else for(let j=last+1;j<i;j++)T[j]=T[last]+(T[i]-T[last])*(j-last)/(i-last);last=i;}
  for(let j=last+1;j<n;j++)T[j]=T[last];
  return u=>{const f=clamp(u*200,0,n-1.001),i=Math.floor(f);return T[i]+(T[i+1]-T[i])*(f-i);};
}
/* piecewise-linear lookup through [u,v] points */
function pwl(K){return u=>{if(u<=K[0][0])return K[0][1];for(let i=1;i<K.length;i++)if(u<=K[i][0]){const a=K[i-1],b=K[i],t=(u-a[0])/Math.max(1e-9,b[0]-a[0]);return a[1]+(b[1]-a[1])*sm01(t);}return K[K.length-1][1];};}
/* section queries: outermost z at height y, highest y at half-width z */
function zOut(p,y){let z=-1;for(let j=0;j<p.length-1;j++){const a=p[j],b=p[j+1];if((a[1]-y)*(b[1]-y)<=0&&a[1]!==b[1]){const t=(y-a[1])/(b[1]-a[1]);z=Math.max(z,a[0]+(b[0]-a[0])*t);}}
  if(y>=p[0][1]-1e-4&&y<=p[p.length-1][1]+1e-4)z=Math.max(z,0);return z;}
function yAt(p,z){let y=-1e9;for(let j=0;j<p.length-1;j++){const a=p[j],b=p[j+1];if((a[0]-z)*(b[0]-z)<=0&&a[0]!==b[0]){const t=(z-a[0])/(b[0]-a[0]);y=Math.max(y,a[1]+(b[1]-a[1])*t);}}return y;}
/* ---------- small parts. m = [colour, emissive, material] ---------- */
const V=(c,mat,em=0)=>[c,em,mat];
/* a cylinder (or cone, r2) between two points */
function tubeAB(mb,a,b,r,n,m,caps=true,r2=r){
  const d=V3.sub(b,a),L=V3.len(d)||1e-6,ax=V3.mul(d,1/L),up=Math.abs(ax[1])<.9?[0,1,0]:[1,0,0],u=V3.norm(V3.cross(ax,up)),w=V3.cross(ax,u);
  const P=(t,rr,o)=>[o[0]+(u[0]*Math.cos(t)+w[0]*Math.sin(t))*rr,o[1]+(u[1]*Math.cos(t)+w[1]*Math.sin(t))*rr,o[2]+(u[2]*Math.cos(t)+w[2]*Math.sin(t))*rr];
  for(let i=0;i<n;i++){const t0=i/n*TAU,t1=(i+1)/n*TAU;mb.quad(P(t0,r,a),P(t1,r,a),P(t1,r2,b),P(t0,r2,b),m[0],m[1],m[2]);
    if(caps){mb.tri(a,P(t1,r,a),P(t0,r,a),m[0],m[1],m[2]);mb.tri(b,P(t0,r2,b),P(t1,r2,b),m[0],m[1],m[2]);}}
}
/* a tube along a polyline */
function tubePath(mb,pts,r,n,m){for(let i=0;i<pts.length-1;i++)tubeAB(mb,pts[i],pts[i+1],r,n,m,i===0||i===pts.length-2);for(let i=1;i<pts.length-1;i++)ball(mb,pts[i],r,n,m);}
function ball(mb,c,r,n,m){const nv=Math.max(3,n>>1);for(let j=0;j<nv;j++)for(let i=0;i<n;i++){const a0=i/n*TAU,a1=(i+1)/n*TAU,b0=-PI/2+j/nv*PI,b1=-PI/2+(j+1)/nv*PI;
  const P=(a,b)=>[c[0]+Math.cos(a)*Math.cos(b)*r,c[1]+Math.sin(b)*r,c[2]+Math.sin(a)*Math.cos(b)*r];mb.quad(P(a0,b0),P(a1,b0),P(a1,b1),P(a0,b1),m[0],m[1],m[2]);}}
/* an oriented box: centre, unit axes, half sizes */
function obox(mb,c,ax,ay,az,h,m){
  const P=(i,j,k)=>[c[0]+ax[0]*h[0]*i+ay[0]*h[1]*j+az[0]*h[2]*k,c[1]+ax[1]*h[0]*i+ay[1]*h[1]*j+az[1]*h[2]*k,c[2]+ax[2]*h[0]*i+ay[2]*h[1]*j+az[2]*h[2]*k];
  const f=(a,b,c2,d)=>mb.quad(a,b,c2,d,m[0],m[1],m[2]);
  f(P(1,-1,-1),P(1,1,-1),P(1,1,1),P(1,-1,1));f(P(-1,-1,-1),P(-1,-1,1),P(-1,1,1),P(-1,1,-1));
  f(P(-1,1,-1),P(-1,1,1),P(1,1,1),P(1,1,-1));f(P(-1,-1,-1),P(1,-1,-1),P(1,-1,1),P(-1,-1,1));
  f(P(-1,-1,1),P(1,-1,1),P(1,1,1),P(-1,1,1));f(P(-1,-1,-1),P(-1,1,-1),P(1,1,-1),P(1,-1,-1));
}
const abox=(mb,c,h,m)=>obox(mb,c,[1,0,0],[0,1,0],[0,0,1],h,m);
/* a rounded box (superellipsoid): e near 0 is a box, 1 an ellipsoid */
function rbox(mb,c,ax,ay,az,h,m,e=.3,nu=16,nv=8){
  const f=(w,p)=>Math.sign(w)*Math.pow(Math.abs(w),p),G=[];
  for(let j=0;j<=nv;j++){const v=-PI/2+PI*j/nv,cv=Math.cos(v),sv=Math.sin(v),row=[];
    for(let i=0;i<=nu;i++){const u=-PI+TAU*i/nu,l=[f(cv,e)*f(Math.cos(u),e)*h[0],f(sv,e)*h[1],f(cv,e)*f(Math.sin(u),e)*h[2]];
      row.push([c[0]+ax[0]*l[0]+ay[0]*l[1]+az[0]*l[2],c[1]+ax[1]*l[0]+ay[1]*l[1]+az[1]*l[2],c[2]+ax[2]*l[0]+ay[2]*l[1]+az[2]*l[2]]);}G.push(row);}
  for(let j=0;j<nv;j++)for(let i=0;i<nu;i++)mb.quad(G[j][i],G[j][i+1],G[j+1][i+1],G[j+1][i],m[0],m[1],m[2]);
}
/* a flat plate: polygon in the x-y plane at z, th thick (endplates, fins, stands) */
function plateXY(mb,P,z,th,m){const n=P.length,cx=P.reduce((a,p)=>a+p[0],0)/n,cy=P.reduce((a,p)=>a+p[1],0)/n;
  for(const dz of [-th/2,th/2])for(let i=0;i<n;i++){const a=P[i],b=P[(i+1)%n];mb.tri([cx,cy,z+dz],[a[0],a[1],z+dz],[b[0],b[1],z+dz],m[0],m[1],m[2]);}
  for(let i=0;i<n;i++){const a=P[i],b=P[(i+1)%n];mb.quad([a[0],a[1],z-th/2],[b[0],b[1],z-th/2],[b[0],b[1],z+th/2],[a[0],a[1],z+th/2],m[0],m[1],m[2]);}}
/* an inverted airfoil spanning ±hw, leading edge at x, raised trailing edge (aoa rad) */
function wing(mb,x,y,hw,c,th,aoa,m,caps){
  const af=[[0,0],[.04,-.45],[.15,-.85],[.35,-1],[.6,-.8],[.85,-.4],[1,0],[.8,.22],[.5,.4],[.2,.42],[.05,.25]];
  const P=(q,z)=>{const cx=-q[0]*c,cy=q[1]*th+q[0]*c*Math.sin(aoa)*1.1;return [x+cx,y+cy,z];};
  for(let i=0;i<af.length;i++){const a=af[i],b=af[(i+1)%af.length];mb.quad(P(a,-hw),P(b,-hw),P(b,hw),P(a,hw),m[0],m[1],m[2]);}
  if(caps)for(const z of [-hw,hw]){const c0=P([.45,0],z);for(let i=0;i<af.length;i++){const a=af[i],b=af[(i+1)%af.length];mb.tri(c0,P(a,z),P(b,z),m[0],m[1],m[2]);}}
}
/* 2-D shape helpers (metres) */
const RR2=(x0,x1,y0,y1,r=0)=>{if(x1<x0)[x0,x1]=[x1,x0];r=Math.max(.001,Math.min(r,(x1-x0)/2,(y1-y0)/2));const o=[],C=[[x1-r,y1-r,0],[x0+r,y1-r,1],[x0+r,y0+r,2],[x1-r,y0+r,3]];
  for(const [cx,cy,q] of C)for(let k=0;k<=3;k++){const a=(q+k/3)*PI/2;o.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r]);}return o;};
const EL2=(xc,yc,rx,ry,n=18)=>{const o=[];for(let k=0;k<n;k++){const a=k/n*TAU;o.push([xc+Math.cos(a)*rx,yc+Math.sin(a)*ry]);}return o;};

