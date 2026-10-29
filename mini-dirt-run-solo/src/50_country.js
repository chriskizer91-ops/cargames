/* =====================================================================================
   THE COUNTRY AROUND THE RANCH. The world is a mile square now, four times the ranch, with the
   ranch in the middle as it was. Round it: gravel county roads with a crossroads and a feed and
   fuel store, a home place at the end of a long rutted mud lane, woods with a trail and a pond
   to the north, and a paved road course in the south-east. The ranch build calls in here at each
   stage: the shape of the land, carving, the surface map, the ground in the lane's ruts, and the
   geometry. x runs east, z runs south (north is up on the map), in metres.
   ===================================================================================== */
const CTRY=(()=>{
'use strict';
const sst=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const DEF={
  /* the county road, east to west below the ranch, edge to edge */
  cr:[[-796,392],[-640,394],[-480,401],[-330,404],[-180,397],[-36,402],[120,407],[300,401],[480,400],[640,395],[796,398]],
  /* Range Road north from the track gate through the crossroads, the forest road west through the
     woods, then West Road south to the county road: one long gravel road */
  range:[[480,452],[480,400],[484,300],[476,160],[468,0],[480,-160],[498,-300],[488,-440],[470,-560],[430,-640],[340,-680],[220,-690],[80,-664],
    [-60,-682],[-200,-700],[-340,-684],[-470,-650],[-545,-580],[-570,-460],[-562,-300],[-576,-120],[-562,80],[-568,250],[-565,392]],
  /* the ranch drive: out of the yard, round the west end of the strip, down to the county road */
  drive:[[-18,14],[-46,22],[-68,42],[-76,90],[-66,170],[-50,250],[-40,330],[-36,402]],
  /* the home lane: two muddy ruts from the county road to the house */
  lane:[[-331,411],[-334,450],[-352,505],[-388,548],[-428,584],[-458,614]],
  home:{x:-480,z:645},
  store:{x:480,z:400},
  pond:{x:-60,z:-540,rx:60,rz:38,depth:.9},
  woods:[[-60,-514],[-140,-504],[-250,-520],[-340,-570],[-400,-640],[-380,-720],[-290,-762],[-180,-750],[-80,-770],[40,-760],[130,-730],[150,-680],[130,-620],[80,-566],[20,-518],[-60,-514]],
  conn:[[-46,-304],[-58,-352],[-82,-410],[-114,-462],[-140,-500]],
  /* the road course, starting at the line on the main straight and running clockwise on the map */
  track:[[420,505],[514,505],[588,506],[651,514],[698,546],[716,595],[709,644],[685,690],[640,715],[588,711],[551,685],[516,652],[469,634],[424,643],[387,674],[343,708],[279,722],[214,717],[166,694],[142,650],[145,599],[170,552],[212,514],[272,505],[346,505],[420,505]],
  paddock:{x0:340,z0:452,x1:570,z1:495},
  joins:[[-36,402],[-330,404],[480,400],[-565,400],[480,452]],
  TRACK_HALF:6,ROAD_HALF:4.1,DRIVE_HALF:2.8
};
let S=null;
/* a path's direction that wraps round a closed loop */
function dirW(p,s){const L=p.len,w=v=>p.closed?((v%L)+L)%L:Math.max(0,Math.min(L,v)),a=p.at(w(s-2)),b=p.at(w(s+2)),l=Math.hypot(b[0]-a[0],b[1]-a[1])||1;return [(b[0]-a[0])/l,(b[1]-a[1])/l];}
/* where (x, z) sits on a path: arc length and signed offset (positive to the right of travel) */
function onPath(p,x,z,r=1){const n=p.nearest(x,z,r);if(!n)return null;const c=p.at(n.s),d=dirW(p,n.s);
  return {s:n.s+(x-c[0])*d[0]+(z-c[1])*d[1],off:(x-c[0])*-d[1]+(z-c[1])*d[0],d:n.d,dx:d[0],dz:d[1]};}

/* ---------- the land: softer hills in the far north, gentle rolls in the south, the rim moved out ---------- */
const northEase=z=>1-.45*sst(-430,-600,z);
function extra(x,z,NZ){const s=sst(330,470,z);return s>0?s*9*(NZ.fbm(x/210+4,z/210)-.5):0;}
function rim(x,z,e,NZ){const w=sst(745,795,e);if(w<=0)return 0;
  /* gaps where the county road runs off the edge of the map */
  const gap=Math.exp(-Math.pow((z-396)/38,2))*sst(640,740,Math.abs(x));
  return w*70*(.6+.4*NZ.fbm(x/80,z/80))*(1-gap);}
function init(X){
  const mp=X.makePath;S={X};
  for(const k of ['cr','range','drive','lane','conn'])S[k]=mp(DEF[k],false);
  /* the lane's box, 3 m wider than its ruts: the ground query asks the lane only inside it */
  {const L=S.lane;let a=1e9,b=1e9,c=-1e9,d=-1e9;for(let i=0;i<L.N;i++){a=Math.min(a,L.X[i]);b=Math.min(b,L.Z[i]);c=Math.max(c,L.X[i]);d=Math.max(d,L.Z[i]);}S.laneBox=[a-3,b-3,c+3,d+3];}
  S.woods=mp(DEF.woods,true);S.track=mp(DEF.track,true);
  const nat=X.natural,avg=(cx,cz,r)=>{let s=0,n=0;for(let a=-r;a<=r;a+=r/4)for(let b=-r;b<=r;b+=r/4){s+=nat(cx+a,cz+b);n++;}return s/n;};
  const P=DEF.pond,lo=[];for(let a=-1;a<=1.001;a+=.2)for(let b=-1;b<=1.001;b+=.2)if(a*a+b*b<=1)lo.push(nat(P.x+a*P.rx,P.z+b*P.rz));lo.sort((a,b)=>a-b);
  S.Lw=lo[Math.floor(lo.length*.3)];S.Lh=avg(DEF.home.x,DEF.home.z,30);S.Ls=avg(DEF.store.x,DEF.store.z,50);
  const pd=DEF.paddock;S.Lp=avg((pd.x0+pd.x1)/2,(pd.z0+pd.z1)/2+20,60);
  /* kerbs where the track bends, gravel traps on the outside of the big corners (one value a metre) */
  const T=S.track,n=Math.ceil(T.len)+1,k=new Float32Array(n);S.kerb=new Float32Array(n);S.trap=new Float32Array(n);S.trapSide=new Int8Array(n);
  for(let i=0;i<n;i++){const a=dirW(T,i-7),b=dirW(T,i+7);k[i]=(a[0]*b[1]-a[1]*b[0])/14;}
  const at=i=>k[((i%n)+n)%n];
  for(let i=0;i<n;i++){let kb=0,tr=0,sd=0;
    for(let j=-6;j<=6;j++)kb=Math.max(kb,sst(1/190,1/110,Math.abs(at(i+j))));
    for(let j=-34;j<=6;j++){const v=sst(1/120,1/70,Math.abs(at(i+j)));if(v>tr){tr=v;sd=at(i+j)>0?-1:1;}}
    S.kerb[i]=kb;S.trap[i]=tr;S.trapSide[i]=sd;}
  S.keep=[[DEF.home.x-40,DEF.home.z-30,DEF.home.x+40,DEF.home.z+40],[400,312,560,392],[pd.x0-6,pd.z0-6,pd.x1+6,pd.z1+4],[372,512,478,536]];
}
const kerbAt=s=>S.kerb[Math.max(0,Math.min(S.kerb.length-1,Math.round(((s%S.track.len)+S.track.len)%S.track.len)))];
const trapAt=s=>{const i=Math.max(0,Math.min(S.trap.length-1,Math.round(((s%S.track.len)+S.track.len)%S.track.len)));return [S.trap[i],S.trapSide[i]];};
/* flatten the pond's hollow, the home yard, the crossroads and the paddock */
const rdist=(x,z,x0,z0,x1,z1)=>Math.hypot(Math.max(x0-x,0,x-x1),Math.max(z0-z,0,z-z1));
function shape(x,z,h){
  const P=DEF.pond,dx=(x-P.x)/P.rx,dz=(z-P.z)/P.rz;let w;
  if(dx>-3.4&&dx<3.4&&dz>-3.4&&dz<3.4){const r=Math.hypot(dx,dz);if(r<3.4){const bank=S.Lw+.12+1.1*sst(1,2.2,r),bed=r<1?S.Lw+.12-(P.depth+.12)*(1-sst(.3,1,r)):bank;w=1-sst(2.1,3.4,r);h=h*(1-w)+bed*w;}}
  const hx=x-DEF.home.x,hz=z-DEF.home.z;if(hx>-75&&hx<75&&hz>-75&&hz<75){w=1-sst(40,75,Math.hypot(hx,hz));if(w>0)h=h*(1-w)+S.Lh*w;}
  if(x>366&&x<596&&z>286&&z<450){w=1-sst(0,30,rdist(x,z,396,316,566,420));if(w>0)h=h*(1-w)+S.Ls*w;}
  const pd=DEF.paddock;if(x>pd.x0-50&&x<pd.x1+50&&z>pd.z0-48&&z<580){w=1-sst(0,40,rdist(x,z,pd.x0-10,pd.z0-8,pd.x1+10,540));if(w>0)h=h*(1-w)+S.Lp*w;}
  return h;
}
/* ---------- carving the roads, the track, the lane and the woods trails ---------- */
function carve(X){
  /* in order; each later one meets the roads before it at their level where they cross */
  S.trackProf=X.carve(S.track,8,12,16,0,.06);
  X.carve(S.cr,DEF.ROAD_HALF+.3,8,10,0,.09);
  X.carve(S.range,DEF.ROAD_HALF+.3,8,10,0,.1,[S.cr]);
  X.carve(S.drive,DEF.DRIVE_HALF+.3,6,6,0,.12,[S.cr]);
  X.carve(S.lane,2.6,5,6,0,.14,[S.cr]);
  X.carve(S.woods,3.2,6,5,0,.3,[S.range]);X.carve(S.conn,3.2,6,5,0,.3,[S.woods,X.loop]);
  S.joins=DEF.joins.concat(...[S.range,S.drive,S.lane,S.woods,S.conn].map(p=>p.cross||[]));
  /* ditches along the county road and Range Road, filled in at the junctions */
  const {H,N2,cell,x0,z0}=X;
  for(const [p,half] of [[S.cr,DEF.ROAD_HALF],[S.range,DEF.ROAD_HALF]]){const done=new Uint8Array(N2*N2),r=Math.ceil((half+5)/cell)+1;
    for(let i=0;i<p.N;i+=2){const ci=Math.round((p.X[i]-x0)/cell),cj=Math.round((p.Z[i]-z0)/cell);
      for(let dj=-r;dj<=r;dj++)for(let di=-r;di<=r;di++){const ii=ci+di,jj=cj+dj;if(ii<0||jj<0||ii>=N2||jj>=N2)continue;const k=jj*N2+ii;if(done[k])continue;done[k]=1;
        const x=x0+ii*cell,z=z0+jj*cell,n=p.nearest(x,z,1);if(!n)continue;let jd=1e9;for(const J of S.joins)jd=Math.min(jd,Math.hypot(x-J[0],z-J[1]));
        const u=(n.d-half-.6)/3.6;if(u<=0||u>=1)continue;let kd=1e9;for(const R of S.keep)kd=Math.min(kd,rdist(x,z,R[0],R[1],R[2],R[3]));H[k]-=.5*Math.sin(u*Math.PI)*sst(14,24,jd)*sst(0,6,kd);}}}
  /* the lane: keep the ground it was carved to, then tuck the coarse ground under the ruts */
  S.H0=H.slice();
  {const done=new Uint8Array(N2*N2),r=Math.ceil(4/cell)+1,p=S.lane;
    for(let i=0;i<p.N;i+=2){const ci=Math.round((p.X[i]-x0)/cell),cj=Math.round((p.Z[i]-z0)/cell);
      for(let dj=-r;dj<=r;dj++)for(let di=-r;di<=r;di++){const ii=ci+di,jj=cj+dj;if(ii<0||jj<0||ii>=N2||jj>=N2)continue;const k=jj*N2+ii;if(done[k])continue;done[k]=1;
        const n=p.nearest(x0+ii*cell,z0+jj*cell,1);if(n&&n.d<3.2)H[k]-=.26*(1-sst(1.7,3.2,n.d));}}}
  S.N2=N2;S.cell=cell;S.x0=x0;S.z0=z0;
}
/* ---------- the surface map ---------- */
let ROADS=null,NEED=null;
/* which 16 m buckets have anything new near them (the rest only get the woods' floor) */
function needMask(){NEED=new Uint8Array(65536);const B=16,P=DEF.pond,mark=(x,z,r)=>{const bx=Math.floor(x/B)+128,bz=Math.floor(z/B)+128;for(let a=-r;a<=r;a++)for(let b=-r;b<=r;b++){const u=bx+a,w=bz+b;if(u>=0&&w>=0&&u<256&&w<256)NEED[u*256+w]=1;}};
  for(const [p,r] of [[S.cr,1],[S.range,1],[S.drive,1],[S.lane,1],[S.woods,1],[S.conn,1],[S.track,2]])for(let i=0;i<p.N;i+=4)mark(p.X[i],p.Z[i],r);
  for(let x=P.x-P.rx*1.5;x<=P.x+P.rx*1.5;x+=B)for(let z=P.z-P.rz*1.5;z<=P.z+P.rz*1.5;z+=B)mark(x,z,1);
  for(const R of [[490,334,556,392],[410,336,452,368],[DEF.paddock.x0,DEF.paddock.z0,DEF.paddock.x1,DEF.paddock.z1],[-482,620,-452,648]])for(let x=R[0];x<=R[2]+B;x+=B)for(let z=R[1];z<=R[3]+B;z+=B)mark(x,z,1);}
function surface(X,k,x,z){
  const W=X.W,SC=X.SC,SF=X.SF,H=X.H;
  if(!NEED)needMask();
  if(!NEED[(Math.floor(x/16)+128)*256+Math.floor(z/16)+128]){const wd=sst(-390,-470,z);if(wd>0){W[k*4]*=1-.35*wd;W[k*4+3]*=1-.16*wd;}return;}
  let g=W[k*4],r=W[k*4+1],m=W[k*4+2],ao=W[k*4+3],code=SC[k];
  if(!ROADS)ROADS=[[S.cr,DEF.ROAD_HALF],[S.range,DEF.ROAD_HALF],[S.drive,DEF.DRIVE_HALF]];
  /* the woods: a shaded, leafy floor */
  const wd=sst(-390,-470,z);if(wd>0){g*=1-.35*wd;ao*=1-.16*wd;}
  /* the pond: water over the deep part, a muddy ring at the edge */
  const P=DEF.pond,pr=Math.abs(x-P.x)<P.rx*1.4&&Math.abs(z-P.z)<P.rz*1.4?Math.hypot((x-P.x)/P.rx,(z-P.z)/P.rz):9;
  if(pr<1.4){m=Math.max(m,(1-sst(.9,1.25,pr))*.75);g*=sst(.95,1.3,pr);r*=sst(1,1.3,pr);
    if(pr<1.1&&H[k]<S.Lw-.04){code=SF.water;g=0;m=0;}else if(pr<1.15)code=SF.mud;}
  /* gravel roads with grass verges */
  for(let q=0;q<3;q++){const p=ROADS[q][0],half=ROADS[q][1],n=p.nearest(x,z,1);if(!n||n.d>half+5)continue;
    g*=sst(half-.6,half+3,n.d);r*=sst(half,half+4,n.d);m*=sst(half,half+3,n.d);if(n.d<half+.2)code=SF.gravel;}
  /* the lane */
  {const n=S.lane.nearest(x,z,1);if(n&&n.d<5){g=Math.max(g,1-sst(1.6,4.5,n.d));r*=sst(2.5,5,n.d);m*=sst(2,4,n.d);if(n.d<1.9)code=SF.ruts;else if(n.d<2.6)code=SF.grass;}}
  /* the woods trails, like the ranch's: a two-track with a grassy verge */
  for(let q=0;q<2;q++){const n=(q?S.conn:S.woods).nearest(x,z,1);if(!n||n.d>7)continue;
    g=Math.max(g,1-sst(3,7,n.d));r*=sst(3,7,n.d);if(n.d<2.6&&code!==SF.water)code=SF.trail;}
  /* the track: mown grass round it, kerbs, gravel traps */
  {const q=onPath(S.track,x,z,2);if(q&&q.d<34){
    g=Math.max(g*.4,1-sst(10,30,q.d));r*=sst(12,30,q.d);m=0;
    const ad=Math.abs(q.off),[tr,sd]=trapAt(q.s);
    if(ad<DEF.TRACK_HALF+.3)code=SF.asphalt;
    else if(ad<DEF.TRACK_HALF+1.6&&kerbAt(q.s)>.4)code=SF.asphalt;
    else if(tr>.3&&Math.sign(q.off)===sd&&ad<DEF.TRACK_HALF+1.6+18)code=SF.gravel,g=0;
    else code=SF.grass;}}
  /* the store's apron, the paddock, the home yard's gravel */
  const pd=DEF.paddock;
  if(x>=490&&x<=556&&z>=334&&z<=392||x>=410&&x<=452&&z>=336&&z<=368||x>=pd.x0&&x<=pd.x1&&z>=pd.z0&&z<=pd.z1)code=SF.concrete,g=0,r=0,m=0;
  if(x>=-482&&x<=-452&&z>=620&&z<=648)code=SF.gravel,g=0,r=0,m=0;
  W[k*4]=g;W[k*4+1]=r;W[k*4+2]=m;W[k*4+3]=ao;SC[k]=code;
}
/* is (x, z) where something new now runs? (the ranch's own trees and rocks keep off it) */
function blocked(x,z,r){
  for(const [p,w] of [[S.drive,DEF.DRIVE_HALF+4],[S.conn,6],[S.cr,9],[S.range,9]]){const n=p.nearest(x,z,2);if(n&&n.d<w+r)return true;}
  return false;
}
/* ---------- the lane's ruts: the ground under the wheels, finer than the 2 m grid ---------- */
function rutDepth(s,side){const N=S.X.NZ;return .07+.15*sst(.3,.72,N.fbm(s/26+3.1,1.7))+.05*(N.fbm(s/8,side*4.3)-.5);}
function rutP(off,s){const a=Math.abs(off);if(a>=2.5)return 0;const dep=rutDepth(s,off<0?-1:1);
  let y=-dep*Math.exp(-Math.pow((a-.82)/.27,2))+.07*Math.exp(-Math.pow((a-1.42)/.3,2))+.03*(1-sst(.2,.5,a));return y*(1-sst(1.9,2.5,a))*sst(0,8,s)*sst(S.lane.len,S.lane.len-6,s);}
function h0At(x,z){const {N2,cell,x0,z0}=S,H=S.H0;let fx=(x-x0)/cell,fz=(z-z0)/cell,i=Math.floor(fx),j=Math.floor(fz);fx-=i;fz-=j;
  const h00=H[j*N2+i],h10=H[j*N2+i+1],h01=H[(j+1)*N2+i],h11=H[(j+1)*N2+i+1];
  return fx>fz?[h00+(h10-h00)*fx+(h11-h10)*fz,(h10-h00)/cell,(h11-h10)/cell]:[h00+(h11-h01)*fx+(h01-h00)*fz,(h11-h01)/cell,(h01-h00)/cell];}
function laneGround(x,z){
  const B=S.laneBox;if(x<B[0]||z<B[1]||x>B[2]||z>B[3])return null;
  const q=onPath(S.lane,x,z,1);if(!q||q.d>2.5||q.s<-1||q.s>S.lane.len+1)return null;
  const [b,gx0,gz0]=h0At(x,z),e=.04,p=rutP(q.off,q.s),dpo=(rutP(q.off+e,q.s)-rutP(q.off-e,q.s))/(2*e),dps=(rutP(q.off,q.s+.5)-rutP(q.off,q.s-.5));
  const gx=gx0+dpo*-q.dz+dps*q.dx,gz=gz0+dpo*q.dx+dps*q.dz,l=Math.hypot(gx,1,gz),a=Math.abs(q.off);
  const surf=a<.42||a>1.85?'grass':'ruts';
  return {y:b+p,n:[-gx/l,1/l,-gz/l],surf,code:surf==='ruts'?S.X.SF.ruts:S.X.SF.grass,off:q.off,s:q.s};
}
/* ---------- geometry ---------- */
function geometry(X){
  const C2=X.C2,Rg=X.rng(777),box=X.box,cb=X.collideBox,cc=X.collideCirc,hAt=X.heightAt,gAt=X.groundAt;
  /* a band draped along a path: offsets across, a channel function for the two spare colour slots */
  const band=(path,offs,variant,s0,s1,step,lift,chan,yAt)=>{C2.mat(17,variant).col(255,255,255,255);let prev=null;const L=path.len;
    for(let s=s0;s<=s1+1e-6;s+=step){const ss=Math.min(s,s1),sw=path.closed?((ss%L)+L)%L:Math.max(0,Math.min(L,ss)),c=path.at(sw),d=dirW(path,sw),row=[];
      for(const off of offs){const x=c[0]-d[1]*off,z=c[1]+d[0]*off,g=yAt?yAt(x,z):gAt(x,z);row.push([x,g.y+lift,z,off,g.n]);}
      if(prev){const B=C2.at(c[0],c[1]),vt=(p,s)=>{const i=B.v([p[0],p[1],p[2]],p[4],s,p[3]);if(chan){const v=chan(s,p[3]);B.C[i*4+2]=v[0];B.C[i*4+3]=v[1];}return i;};
        const a=prev.map(p=>vt(p,prev.s)),b=row.map(p=>vt(p,ss));for(let k=0;k<offs.length-1;k++)B.quad(a[k],a[k+1],b[k+1],b[k]);}
      prev=row;prev.s=ss;}};
  const across=(h,n)=>{const o=[];for(let i=0;i<=n;i++)o.push(-h+2*h*i/n);return o;};
  /* the gravel roads */
  band(S.cr,across(DEF.ROAD_HALF+.4,8),3,0,S.cr.len,2,.035,()=>[0,DEF.ROAD_HALF]);
  band(S.range,across(DEF.ROAD_HALF+.4,8),3,0,S.range.len,2,.035,()=>[0,DEF.ROAD_HALF]);
  band(S.drive,across(DEF.DRIVE_HALF+.4,6),3,0,S.drive.len,1.5,.035,()=>[0,DEF.DRIVE_HALF]);
  /* the woods trails, drawn like the ranch's */
  X.ribbon(S.woods,3.4,1);X.ribbon(S.conn,3.4,1);
  /* the lane: fine rows, every vertex on the rut profile */
  {const offs=[-2.5,-2.1,-1.8,-1.55,-1.32,-1.12,-.96,-.82,-.68,-.52,-.32,0,.32,.52,.68,.82,.96,1.12,1.32,1.55,1.8,2.1,2.5];
    band(S.lane,offs,5,0,S.lane.len,.6,.02,(s,off)=>[Math.abs(off)>2.2?0:rutDepth(s,off<0?-1:1),1],(x,z)=>laneGround(x,z)||gAt(x,z));}
  /* the track: asphalt with kerbs, then the gravel traps */
  {const T=S.track,hw=DEF.TRACK_HALF;
    band(T,[-hw-1.6,-hw-.8,-hw,-hw*.66,-hw*.33,0,hw*.33,hw*.66,hw,hw+.8,hw+1.6],4,0,T.len,2,.04,s=>[kerbAt(s),hw]);
    let s0=-1;for(let s=0;s<=T.len;s+=2){const [tr,sd]=trapAt(s),on=tr>.3;
      if(on&&s0<0)s0=s;if((!on||s+2>T.len)&&s0>=0){const sdm=trapAt((s0+s)/2)[1],o=[hw+1.6,hw+5,hw+9,hw+13.5,hw+19.6].map(v=>v*sdm);if(sdm<0)o.reverse();
        band(T,o,3,s0,s,2,.03,()=>[1,0]);tyreWall(T,s0,s,sdm*(hw+21));s0=-1;}}}
  /* tyre stacks along a line beside the track */
  function tyreWall(T,s0,s1,off){for(let s=s0;s<=s1;s+=.8){const c=T.at(((s%T.len)+T.len)%T.len),d=dirW(T,s),x=c[0]-d[1]*off,z=c[1]+d[0]*off,y=hAt(x,z);
    C2.mat(8).col(22,22,24,255);C2.at(x,z).tube([x,y-.05,z],[x,y+.78,z],.36,9,!0);C2.mat(8).col(200,200,200,255);C2.at(x,z).tube([x,y+.52,z],[x,y+.56,z],.365,9,!1);cc(x,z,.42,y+.8);}}
  /* the pond's water */
  {const P=DEF.pond,B=C2.at(P.x,P.z),seg=36,rings=[0,.3,.6,.85,1,1.12,1.25];C2.mat(24).col(255,255,255,255);B.m=[24,0,0,0];B.c=[255,255,255,255];const ix=[];
    for(const r of rings){const row=[];for(let i=0;i<=seg;i++){const a=i/seg*Math.PI*2,x=P.x+Math.cos(a)*P.rx*r,z=P.z+Math.sin(a)*P.rz*r;row.push(B.v([x,S.Lw,z],[0,1,0],x,z));}ix.push(row);}
    for(let j=0;j<rings.length-1;j++)for(let i=0;i<seg;i++)B.quad(ix[j][i],ix[j][i+1],ix[j+1][i+1],ix[j+1][i]);}
  /* flat things laid on the ground: a grid draped over it */
  const pad=(x0,z0,x1,z1,mat,variant,chan,lift=.04,st=2)=>{C2.mat(mat,variant).col(255,255,255,255);
    for(let z=z0;z<z1-1e-6;z+=st)for(let x=x0;x<x1-1e-6;x+=st){const B=C2.at(x+st/2,z+st/2),xa=x,xb=Math.min(x1,x+st),za=z,zb=Math.min(z1,z+st),
      q=[[xa,za],[xb,za],[xb,zb],[xa,zb]].map(([px,pz])=>{const g=gAt(px,pz),i=B.v([px,g.y+lift,pz],g.n,px,pz);if(chan){const v=chan(px,pz);B.C[i*4]=v[0];B.C[i*4+1]=v[1];B.C[i*4+2]=v[2];B.C[i*4+3]=v[3];}return i;});
      B.quad(q[0],q[3],q[2],q[1]);}};
  /* glowing panels: a box whose faces light up */
  const glow=(c,h,rgb,em)=>{const B=C2.at(c[0],c[2]),n0=B.nv;C2.mat(8).col(255,255,255,255);B.m=[8,0,0,0];B.box(c,[1,0,0],[0,1,0],[0,0,1],h,0);
    for(let i=n0;i<B.nv;i++){B.M[i]=MAT.EMIT;B.C[i*4]=rgb[0];B.C[i*4+1]=rgb[1];B.C[i*4+2]=rgb[2];B.C[i*4+3]=em;}};
  /* a building with a gable roof: walls as a box, gable ends, two roof slopes with an overhang */
  const gable=(x0,z0,x1,z1,y0,wall,peak,alongX,wallMat,wallCol,roofCol,ov=.5)=>{
    const cx=(x0+x1)/2,cz=(z0+z1)/2;box([cx,y0+wall/2,cz],[(x1-x0)/2,wall/2,(z1-z0)/2],wallMat,wallCol,0);
    const B=C2.at(cx,cz),yt=y0+wall,yp=y0+peak;B.m=[wallMat,0,0,0];B.c=wallCol.slice();
    if(alongX){for(const x of [x0,x1]){const n=[x<cx?-1:1,0,0];B.tri(B.v([x,yt,z0],n),B.v([x,yt,z1],n),B.v([x,yp,cz],n));}}
    else{for(const z of [z0,z1]){const n=[0,0,z<cz?-1:1];B.tri(B.v([x0,yt,z],n),B.v([x1,yt,z],n),B.v([cx,yp,z],n));}}
    B.m=[19,1,0,0];B.c=roofCol.concat(255).slice(0,4);
    if(alongX){const hz=(z1-z0)/2,sl=(yp-yt)/hz;for(const sd of [-1,1]){const ze=cz+sd*(hz+ov),ye=yt-ov*sl,nn=X.norm([0,hz,sd*(yp-yt)]);
        B.quadP([x0-ov,ye,ze],[x1+ov,ye,ze],[x1+ov,yp+.02,cz],[x0-ov,yp+.02,cz],[[0,0],[x1-x0,0],[x1-x0,hz],[0,hz]],nn);}}
    else{const hx=(x1-x0)/2,sl=(yp-yt)/hx;for(const sd of [-1,1]){const xe=cx+sd*(hx+ov),ye=yt-ov*sl,nn=X.norm([sd*(yp-yt),hx,0]);
        B.quadP([xe,ye,z0-ov],[xe,ye,z1+ov],[cx,yp+.02,z1+ov],[cx,yp+.02,z0-ov],[[0,0],[z1-z0,0],[z1-z0,hx],[0,hx]],nn);}}
    cb(x0-.2,z0-.2,x1+.2,z1+.2,y0+peak);};
  const post=(x,z,h,r,col,mat=8)=>{const y=hAt(x,z);C2.mat(mat).col(...col);C2.at(x,z).tube([x,y-.2,z],[x,y+h,z],r,6,!1);return y;};
  /* ---------- the home place ---------- */
  {const L=S.Lh;
    /* the gravel by the house */
    pad(-482,620,-452,648,17,3,(x,z)=>[x,z,1,0]);
    /* the house: white siding, a grey roof, a porch across the front (north), a brick chimney */
    gable(-499,646,-485,656,L,3.1,5.6,true,18,[236,232,222,255],[78,82,88]);
    box([-492,L+.25,644.3],[7,.25,1.6],18,[150,130,110,255]);
    for(const x of [-498.6,-494,-490,-485.4])box([x,L+1.6,643],[.09,1.35,.09],18,[240,238,232,255]);
    {const B=C2.at(-492,644),sl=.35;B.m=[19,1,0,0];B.c=[78,82,88,255];B.quadP([-499.4,L+2.95,642.2],[-484.6,L+2.95,642.2],[-484.6,L+2.95+sl,646],[-499.4,L+2.95+sl,646],undefined,X.norm([0,3.8,-sl]));}
    box([-487.5,L+5.2,651],[.45,1.2,.45],8,[130,58,44,255]);
    for(const x of [-496.5,-489,-486.8])box([x,L+1.65,645.93],[.55,.65,.04],8,[26,32,40,255]);
    box([-492,L+1.15,645.93],[.48,1.05,.05],8,[96,52,34,255]);
    for(const x of [-497,-492,-487])box([x,L+1.65,656.07],[.55,.65,.04],8,[26,32,40,255]);
    for(const z of [648.5,653.5])box([-499.07,L+1.65,z],[.04,.65,.55],8,[26,32,40,255]),box([-484.93,L+1.65,z],[.04,.65,.55],8,[26,32,40,255]);
    glow([-492,L+2.7,645.4],[.12,.08,.12],[1,.85,.6],1.2);
    /* the red barn, doors to the north */
    gable(-472,652,-452,670,L,4.6,7.4,false,19,[150,42,32,255],[214,214,210]);
    box([-462,L+2.1,651.9],[3.4,2.1,.06],19,[120,32,24,255]);box([-462,L+2.1,651.84],[3.5,.08,.04],8,[230,230,230,255]);
    /* the utility trailer beside the barn: frame, deck, rails, wheels, tongue */
    {const tx=-446,tz=640,y=hAt(tx,tz);box([tx,y+.62,tz],[1.05,.06,2.4],18,[150,120,90,255]);box([tx,y+.52,tz],[1.1,.05,2.5],8,[34,34,36,255]);
      for(const sx of [-1.08,1.08])box([tx+sx,y+.95,tz],[.04,.3,2.45],8,[40,40,42,255]);box([tx,y+.95,tz+2.45],[1.08,.3,.04],8,[40,40,42,255]);
      for(const sx of [-1.25,1.25]){C2.mat(8).col(20,20,22,255);C2.at(tx,tz).tube([tx+sx-.12,y+.33,tz+.3],[tx+sx+.12,y+.33,tz+.3],.33,10,!0);}
      C2.mat(8).col(34,34,36,255);C2.at(tx,tz).tube([tx-.9,y+.5,tz-2.4],[tx,y+.45,tz-4],.05,5,!0);C2.at(tx,tz).tube([tx+.9,y+.5,tz-2.4],[tx,y+.45,tz-4],.05,5,!0);
      cb(tx-1.3,tz-2.6,tx+1.3,tz+2.6,y+1.3);}
    /* a swing set and a trampoline out back for the kids */
    {const sx=-500,sz=668,y=hAt(sx,sz);C2.mat(8).col(60,110,170,255);const Bs=C2.at(sx,sz);
      for(const dx of [-2.2,2.2]){Bs.tube([sx+dx,y+2.4,sz],[sx+dx-.5,y,sz-1.1],.05,5,!0);Bs.tube([sx+dx,y+2.4,sz],[sx+dx+.5,y,sz-1.1],.05,5,!0);
        Bs.tube([sx+dx,y+2.4,sz],[sx+dx-.5,y,sz+1.1],.05,5,!0);Bs.tube([sx+dx,y+2.4,sz],[sx+dx+.5,y,sz+1.1],.05,5,!0);}
      Bs.tube([sx-2.3,y+2.4,sz],[sx+2.3,y+2.4,sz],.06,6,!0);C2.mat(8).col(30,30,30,255);
      for(const dx of [-1,1]){for(const e of [-.22,.22])Bs.tube([sx+dx+e,y+2.38,sz],[sx+dx+e,y+.5,sz],.012,3,!1);box([sx+dx,y+.48,sz],[.26,.03,.12],8,[200,40,40,255]);}
      cb(sx-2.8,sz-1.3,sx+2.8,sz+1.3,y+2.5);
      const tx=-486,tz=670,ty=hAt(tx,tz);C2.mat(8).col(20,20,22,255);C2.at(tx,tz).tube([tx,ty+.86,tz],[tx,ty+.9,tz],2,16,!0);
      C2.mat(8).col(40,120,60,255);C2.at(tx,tz).tube([tx,ty+.9,tz],[tx,ty+.93,tz],2.25,16,!1);
      for(let a=0;a<6;a++){const px=tx+Math.cos(a)*2.1,pz=tz+Math.sin(a)*2.1;C2.mat(8).col(70,70,74,255);C2.at(tx,tz).tube([px,ty,pz],[px,ty+.9,pz],.04,4,!1);}
      cc(tx,tz,2.3,ty+1);}
    /* the mailbox where the lane meets the road */
    {const mx=-322,mz=410.5,y=post(mx,mz,1.05,.05,[120,96,72,255],18);C2.mat(8).col(40,40,44,255);C2.at(mx,mz).tube([mx,y+1.18,mz-.26],[mx,y+1.18,mz+.26],.13,8,!0);cc(mx,mz,.2,y+1.3);}
    /* a pasture fence down the east side of the lane's last stretch, a gate post at the road */
    for(let s=10;s<S.lane.len-8;s+=4.5){const c=S.lane.at(s),d=dirW(S.lane,s);for(const sd of [1]){const x=c[0]-d[1]*sd*5.2,z=c[1]+d[0]*sd*5.2;post(x,z,1.15,.07,[120,98,76,255],18);}}
  }
  /* ---------- the crossroads: Feed & Fuel ---------- */
  {const L=S.Ls;
    pad(490,334,556,392,4,0,null,.05);pad(410,336,452,368,4,0,null,.05);
    /* the store, flat roofed, windows across its front */
    box([535,L+2.4,344],[15,2.4,8],19,[208,196,170,255]);box([535,L+4.9,344],[15.3,.12,8.3],8,[120,40,34,255]);
    for(let x=523;x<=547;x+=4)box([x,L+1.7,352.05],[1.5,1,.05],8,[22,30,38,255]);box([535,L+1.25,352.06],[1,1.25,.06],8,[40,50,60,255]);
    box([535,L+3.25,353.3],[15,.08,1.3],19,[120,40,34,255]);cb(519.6,335.6,550.4,352.4,5);
    box([524,L+.7,353.4],[1.4,.7,.5],8,[230,234,240,255]);box([546,L+.9,353.6],[.8,.9,.6],8,[150,150,156,255]);
    /* the canopy and two pump islands */
    box([508,L+5.4,371],[12.5,.35,11.5],8,[232,232,228,255]);box([508,L+5.02,371],[12.5,.04,11.5],8,[190,40,30,255]);
    for(const x of [498,518])for(const z of [362,380]){box([x,L+2.5,z],[.22,2.5,.22],8,[220,220,220,255]);cc(x,z,.4,L+5.5);}
    for(const [x,z] of [[503,366],[513,366],[503,376],[513,376]])glow([x,L+4.98,z],[1.6,.03,.5],[1,.96,.88],1.4);
    for(const z of [367.5,374.5]){box([508,L+.12,z],[5.5,.12,.9],4,[255,255,255,255]);cb(502.4,z-1,513.6,z+1,1.8);
      for(const x of [505,511]){box([x,L+.95,z],[.42,.85,.32],8,[176,34,26,255]);glow([x,L+1.35,z-.33],[.26,.18,.02],[.85,.9,1],.9);}}
    /* the sign at the corner: a tall pole and a lit panel, no name on it */
    {const y=post(494,389,8.2,.16,[200,200,204,255]);box([494,y+8.6,389],[1.8,1.1,.22],8,[200,36,28,255]);glow([494,y+8.4,388.76],[1.6,.6,.02],[1,.9,.55],1.1);glow([494,y+8.4,389.24],[1.6,.6,.02],[1,.9,.55],1.1);cc(494,389,.3,y+9.7);}
    /* the feed barn across Range Road: green walls, open front, a loading dock, feed and hay */
    {const x0=412,x1=448,z0=338,z1=360,wl=5.4;
      X.metal(x0,z0,x1,z0,L,L+wl,[70,104,78]);X.metal(x0,z1,x0,z0,L,L+wl,[70,104,78]);X.metal(x1,z0,x1,z1,L,L+wl,[70,104,78]);
      X.metal(x0,z1,424,z1,L,L+wl,[70,104,78]);X.metal(436,z1,x1,z1,L,L+wl,[70,104,78]);X.metal(424,z1,436,z1,L+4,L+wl,[70,104,78]);
      cb(x0-.3,z0-.3,x1+.3,z0+.3,L+wl);cb(x0-.3,z0,x0+.3,z1,L+wl);cb(x1-.3,z0,x1+.3,z1,L+wl);cb(x0,z1-.3,424,z1+.3,L+wl);cb(436,z1-.3,x1,z1+.3,L+wl);
      const B=C2.at(430,349),cz=(z0+z1)/2,rise=2.4;B.m=[19,0,0,0];B.c=[70,104,78,255];
      for(const x of [x0,x1]){const n=[x<430?-1:1,0,0];B.tri(B.v([x,L+wl,z0],n),B.v([x,L+wl,z1],n),B.v([x,L+wl+rise,cz],n));}
      B.m=[19,1,0,0];B.c=[226,226,222,255];for(const sd of [-1,1]){const ze=cz+sd*11.6,nn=X.norm([0,11,sd*rise]);B.quadP([x0-.5,L+wl-.13,ze],[x1+.5,L+wl-.13,ze],[x1+.5,L+wl+rise+.02,cz],[x0-.5,L+wl+rise+.02,cz],undefined,nn);}
      box([430,L+.45,363.5],[16,.45,2.4],4,[255,255,255,255]);cb(414,361.1,446,365.9,L+.9);
      for(const [px,pz] of [[416,364],[419,364],[441,364.5],[444,364]]){box([px,L+1.05,pz],[.6,.08,.5],18,[160,130,96,255]);for(let k=0;k<3;k++)box([px,L+1.3+k*.28,pz],[.55,.13,.45],8,[214,204,176,255]);}
      for(const [hx,hz] of [[452,346],[452,349],[452,352]])for(let k=0;k<3;k++)box([hx,L+.4+k*.8,hz],[.6,.4,1.2],22,[255,255,255,255]);cb(451,344.6,453,353.4,L+2.4);
      /* grain bins out back */
      for(const bx of [420,438]){const bz=322,y=L;C2.mat(19,0).col(196,198,202,255);const Bb=C2.at(bx,bz);Bb.m=[19,0,0,0];Bb.c=[196,198,202,255];
        Bb.tube([bx,y-.2,bz],[bx,y+7.2,bz],5,20,!1);Bb.tube([bx,y+7.2,bz],[bx,y+9.6,bz],5.15,20,!0,.35);cc(bx,bz,5.2,y+9.6);}}
    /* stop signs on Range Road */
    for(const [sx,sz,fz] of [[473,391,-1],[487,409,1]]){const y=post(sx,sz,2.1,.04,[190,190,194,255]);C2.mat(8).col(196,24,22,255);C2.at(sx,sz).tube([sx,y+2.3,sz-fz*.02],[sx,y+2.3,sz+fz*.02],.38,8,!0);}
  }
  /* ---------- the track: paddock, garages, pit wall, grandstand, the start gantry ---------- */
  {const L=S.Lp,pd=DEF.paddock,T=S.track;
    pad(pd.x0,pd.z0,pd.x1,pd.z1,4,0,null,.05,4);
    box([410,L+2.4,466],[50,2.4,6],19,[196,198,204,255]);box([410,L+4.9,466],[50.4,.12,6.4],8,[60,62,66,255]);cb(359.6,459.6,460.4,472.4,5);
    for(let x=365;x<460;x+=10)box([x,L+1.6,472.06],[3.6,1.6,.06],19,[150,154,160,255]);
    for(let x=340;x<540;x+=4){box([x+2,L+.45,497],[2,.45,.28],8,[220,220,216,255]);}cb(340,496.6,540,497.4,L+.9);
    for(let r=0;r<6;r++)box([425,L+.35+r*.5,518+r*1],[44,.07,.45],18,[176,150,116,255]),box([425,L+.18+r*.5,518.3+r*1],[44,.2+r*.25,.05],8,[110,110,116,255]);
    box([425,L+4.6,524],[44.5,.1,4],8,[200,36,28,255]);for(const x of [381,425,469])box([x,L+2.3,526],[.12,2.3,.12],8,[90,90,96,255]);cb(380,517,470,527,L+3.2);
    /* the gantry over the line */
    {const c=T.at(0),d=dirW(T,0);for(const sd of [-1,1]){const x=c[0]-d[1]*sd*8.2,z=c[1]+d[0]*sd*8.2,y=post(x,z,6.6,.22,[60,62,66,255]);cc(x,z,.45,y+7);}
      const y=hAt(c[0],c[1]);box([c[0],y+6.9,c[1]],[.35,.4,8.4],8,[40,40,44,255]);for(let k=-2;k<=2;k++)glow([c[0]-.37,y+6.9,c[1]+k*.8],[.04,.16,.16],[1,.08,.04],1.8);}
    /* a flag pole at each end of the straight */
    for(const x of [338,548]){const y=post(x,494,7,.06,[220,220,220,255]);box([x+.7,y+6.4,494],[.7,.45,.02],8,[30,30,30,255]);cc(x,494,.2,y+7);}
  }
  /* ---------- fences and a power line along the county road ---------- */
  {const p=S.cr,nearJ=(x,z,r)=>S.joins.some(J=>Math.hypot(x-J[0],z-J[1])<r),inKeep=(x,z)=>S.keep.some(R=>x>R[0]-4&&x<R[2]+4&&z>R[1]-4&&z<R[3]+4);
    for(const sd of [-1,1]){let prev=null;for(let s=6;s<p.len-6;s+=5){const c=p.at(s),d=dirW(p,s),x=c[0]-d[1]*sd*7.6,z=c[1]+d[0]*sd*7.6;
      if(nearJ(x,z,16)||inKeep(x,z)){prev=null;continue;}const y=post(x,z,1.15,.06,[118,96,74,255],18);
      if(prev){const B=C2.at(x,z);B.m=[8,0,0,0];B.c=[70,70,72,255];for(const h of [.62,1.02]){const a=[prev[0],prev[1]+h,prev[2]],b=[x,y+h,z];B.quadP(a,b,[b[0],b[1]+.025,b[2]],[a[0],a[1]+.025,a[2]],undefined,[-d[1],0,d[0]]);}}
      prev=[x,y,z];}}
    let pp=null;for(let s=20;s<p.len-10;s+=60){const c=p.at(s),d=dirW(p,s);let off=-11;const x=c[0]-d[1]*off,z=c[1]+d[0]*off;if(nearJ(x,z,14)||inKeep(x,z)){pp=null;continue;}
      const y=post(x,z,9,.14,[92,74,58,255],18);box([x,y+8.6,z],[Math.abs(d[1])*1.2+.08,.08,Math.abs(d[0])*1.2+.08],18,[92,74,58,255]);cc(x,z,.3,y+9);
      const tops=[-1.05,0,1.05].map(o=>[x-d[1]*o,y+8.75,z+d[0]*o]);
      if(pp){const B=C2.at(x,z);B.m=[8,0,0,0];B.c=[30,30,32,255];for(let w=0;w<3;w++){const a=pp[w],b=tops[w];let q=a;for(let k=1;k<=6;k++){const t=k/6,m=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t-1.2*4*t*(1-t),a[2]+(b[2]-a[2])*t];B.tube(q,m,.022,3,!1);q=m;}}}
      pp=tops;}}
  /* ---------- trees: the woods, groves, windbreaks, shade round the house ---------- */
  const CL=[[S.cr,10],[S.range,10],[S.drive,8],[S.lane,7],[S.woods,6.5],[S.conn,6.5]];
  const clear=(x,z,r)=>{
    if(Math.abs(x)>772||Math.abs(z)>772)return false;
    /* the road course and its infield stay open */
    if(x>84&&x<774&&z>470&&z<780)return false;
    if(Math.hypot((x-DEF.pond.x)/DEF.pond.rx,(z-DEF.pond.z)/DEF.pond.rz)<1.3)return false;
    for(const R of S.keep)if(x>R[0]-r&&x<R[2]+r&&z>R[1]-r&&z<R[3]+r)return false;
    for(const [p,w] of CL){const n=p.nearest(x,z,1);if(n&&n.d<w+r)return false;}
    return true;};
  const old=(x,z)=>Math.abs(x)<372&&Math.abs(z)<372;
  let nT=0;const N=X.NZ;
  for(let t=0;t<60000&&nT<3800;t++){const x=(Rg()-.5)*1560,z=(Rg()-.5)*1560;if(old(x,z))continue;
    const woods=sst(-380,-470,z),dens=N.fbm(x/70+31,z/70),grove=N.fbm(x/110-7,z/110+5);
    let p=woods>0?woods*(dens>.36?.9:.25):grove>.6?.55*(x<-380?1:.6):.012;if(Rg()>p)continue;
    const k=(Math.round((z-X.z0)/X.cell))*X.N2+Math.round((x-X.x0)/X.cell);if(X.W[k*4+1]>.6||X.SC[k]===X.SF.water)continue;
    if(!clear(x,z,2))continue;
    const pine=z<-470?Rg()<.55:x<-420?Rg()<.4:Rg()<.12;X.addTree(x,z,pine?1:0,.8+Rg()*.6,Rg);nT++;}
  /* windbreak rows on the south side of the county road */
  for(const [xa,xb] of [[-760,-380],[-280,-80],[40,400],[560,770]])for(let x=xa;x<xb;x+=7+Rg()*5){const c=S.cr.nearest(x,400,4),z=(c?S.cr.Z[c.i]:400)+19+Rg()*4;if(clear(x,z,1.5)&&Rg()<.8)X.addTree(x,z,Rg()<.3?1:0,.85+Rg()*.4,Rg);}
  /* big shade trees round the house */
  for(const [x,z,s] of [[-506,642,1.5],[-505,660,1.35],[-476,635,1.25],[-490,676,1.45],[-446,664,1.2],[-515,672,1.3]])X.addTree(x,z,0,s,Rg);
  /* along the lane, a tree here and there */
  for(let s=30;s<S.lane.len-20;s+=26+Rg()*20){const c=S.lane.at(s),d=dirW(S.lane,s),sd=Rg()<.5?-1:1,x=c[0]-d[1]*sd*(9+Rg()*6),z=c[1]+d[0]*sd*(9+Rg()*6);if(clear(x,z,1))X.addTree(x,z,0,1+Rg()*.4,Rg);}
  /* ---------- boulders in the woods, round bales in the fields ---------- */
  for(let t=0,n=0;t<4000&&n<70;t++){const x=(Rg()-.5)*1540,z=-470-Rg()*300;if(!clear(x,z,2.5))continue;X.rock(x,z,.5+Rg()*1.4);n++;}
  const bale=(x,z,a)=>{const y=hAt(x,z),dx=Math.cos(a)*.75,dz=Math.sin(a)*.75;C2.mat(22).col(255,255,255,255);C2.at(x,z).tube([x-dx,y+.62,z-dz],[x+dx,y+.62,z+dz],.62,12,!0);cc(x,z,.9,y+1.25);};
  for(const [x0b,z0b,nx,nz] of [[-720,470,6,4],[-260,660,5,3],[600,-300,4,5],[-700,-100,3,6]])for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){
    const x=x0b+i*24+(Rg()-.5)*6,z=z0b+j*26+(Rg()-.5)*6;if(Rg()<.7&&clear(x,z,3))bale(x,z,Rg()*3);}
}
/* things the game needs to know about the new places */
function info(){return {cr:S.cr,range:S.range,drive:S.drive,lane:S.lane,woods:S.woods,conn:S.conn,track:S.track,pond:Object.assign({level:S.Lw},DEF.pond),home:DEF.home,store:DEF.store,paddock:DEF.paddock,DEF};}
return {DEF,init,northEase,extra,rim,shape,carve,surface,blocked,laneGround,geometry,info,onPath,dirW};
})();

