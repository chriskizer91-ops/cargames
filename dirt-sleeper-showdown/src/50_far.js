/* =====================================================================================
   THE FAR COUNTRY. The world is two miles square now: the mile with the ranch and the country round it
   in the middle as it was, and new land round that. The county road runs on east and west to the edge.
   East of the ranch, Speedway Park: a banked dirt oval with a grandstand and lights, and a short course
   with jumps, berms and whoops. North, Bald Mountain, with the paved Summit Road switching back up it to
   a radio mast. West, the Cedar Hills, with a gravel rally stage through them (a brook to splash through)
   and Mill Road back to the forest road. South, past the farms, a dry lake: miles of flat hard clay with
   a course marked out on it in cones. The country's code (50_country) calls in here at each stage of the
   build, as the ranch's calls it. x runs east, z south, in metres.
   ===================================================================================== */
const FAR=(()=>{
'use strict';
const sst=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const PI=Math.PI,EDGE=1600;
/* points along a line and round an arc (angle 0 points south (+z), PI/2 east (+x)), a few metres apart */
function pushP(o,x,z){const p=o[o.length-1];if(!p||Math.hypot(p[0]-x,p[1]-z)>.5)o.push([x,z]);}
function line(o,x0,z0,x1,z1,st=20){const n=Math.max(1,Math.ceil(Math.hypot(x1-x0,z1-z0)/st));for(let i=0;i<=n;i++)pushP(o,x0+(x1-x0)*i/n,z0+(z1-z0)*i/n);return o;}
function arc(o,cx,cz,R,a0,a1,st=10){const n=Math.max(2,Math.ceil(Math.abs(a1-a0)*R/st));for(let i=0;i<=n;i++){const a=a0+(a1-a0)*i/n;pushP(o,cx+R*Math.sin(a),cz+R*Math.cos(a));}return o;}
const OV={x:1200,z:140,half:100,R:64,hw:8};
const DEF={EDGE,OV,
  speedway:{x0:1000,z0:40,x1:1400,z1:380},lot:{x0:1080,z0:268,x1:1320,z1:372},
  lake:{x:80,z:1230,rx:640,rz:250},
  /* the dirt oval: counter-clockwise on the map from the middle of the front (south) straight */
  oval:(()=>{const o=[],{x,z,half,R}=OV;line(o,x,z+R,x+half,z+R);arc(o,x+half,z,R,0,PI);line(o,x+half,z-R,x-half,z-R);arc(o,x-half,z,R,PI,2*PI);line(o,x-half,z+R,x,z+R);return o;})(),
  /* the short course: the start straight east, a banked 180 left, the whoops back west, a right hairpin,
     the second jump east, another banked 180, the long run west and the big sweeper home */
  short:(()=>{const o=[];line(o,1050,-90,1300,-90);arc(o,1300,-150,60,0,PI);line(o,1300,-210,1180,-210);arc(o,1180,-260,50,0,-PI);
    line(o,1180,-310,1330,-310);arc(o,1330,-360,50,0,PI);line(o,1330,-410,1050,-410);arc(o,1050,-250,160,PI,2*PI);return o;})(),
  /* Summit Road: up from the forest road, across the mountain's south face in four legs at about 8 per cent,
     a hairpin at the end of each (laid out by walking up the slope at that grade), then over the top */
  summit:[[250,-690],[247,-708],[232,-720],[208,-724],[182,-722],[156,-718],[134,-718],[111,-721],[87,-718],[64,-721],[43,-732],[27,-750],[9,-767],[-2,-788],[-14,-808],
    [-34,-822],[-56,-831],[-80,-833],[-96,-850],[-91,-872],[-70,-881],[-47,-887],[-23,-888],[1,-889],[25,-891],[49,-890],[73,-891],[97,-892],[121,-892],
    [145,-889],[168,-886],[192,-883],[216,-884],[240,-882],[264,-880],[286,-887],[306,-900],[323,-917],[342,-932],[342,-955],[323,-969],[300,-962],[277,-958],
    [253,-955],[229,-957],[205,-961],[181,-963],[158,-969],[135,-973],[111,-973],[87,-970],[63,-967],[39,-965],[16,-962],[-8,-965],[-30,-974],[-52,-985],
    [-72,-997],[-81,-1019],[-69,-1038],[-46,-1039],[-24,-1030],[0,-1027],[23,-1023],[47,-1026],[70,-1032],[92,-1041],[113,-1052],[134,-1064],[155,-1076],[176,-1087],
    [200,-1093],[221,-1103],[245,-1108],[267,-1117],[289,-1127],[310,-1137],[333,-1145],[349,-1161],[345,-1184],[324,-1193],[300,-1190],[277,-1187],[253,-1187],[230,-1196],
    [207,-1201],[183,-1201],[162,-1204],[142,-1218],[124,-1236],[106,-1252]],
  /* the rally stage through the Cedar Hills, north from the county road */
  rally:[[-905,390],[-910,340],[-935,280],[-990,230],[-1070,205],[-1150,210],[-1215,180],[-1240,120],[-1215,60],[-1150,25],[-1090,-20],[-1075,-90],[-1110,-150],
    [-1190,-175],[-1280,-160],[-1360,-190],[-1400,-270],[-1375,-350],[-1290,-390],[-1190,-420],[-1130,-480],[-1135,-560],[-1190,-620],[-1290,-650],[-1390,-690],
    [-1450,-770],[-1445,-860],[-1380,-930],[-1280,-960],[-1170,-990],[-1080,-1030],[-1010,-1085]],
  /* Mill Road: from the stage's finish back east to the forest road */
  mill:[[-1010,-1085],[-930,-1040],[-850,-980],[-770,-900],[-700,-820],[-630,-730],[-572,-648],[-532,-598]],
  /* the brook the stage splashes through */
  brook:[[-1596,-470],[-1480,-520],[-1360,-560],[-1240,-585],[-1140,-600],[-1040,-640],[-950,-700],[-880,-780],[-845,-880],[-830,-990],[-850,-1100]],
  lakeRd:[[120,407],[100,500],[75,620],[55,760],[50,880],[62,985]],
  spRd:[[980,399],[984,320],[976,210],[972,90],[985,-20],[1030,-82]],
  gate:[[1200,399],[1200,372]],
  ROAD_HALF:3.6,SUMMIT_HALF:3.8,SHORT_HALF:6};
DEF.lakeLoop=(()=>{const o=[],L=DEF.lake,a=500,b=150,n=160;for(let i=0;i<=n;i++){const t=-i/n*2*PI,c=Math.cos(t),s=Math.sin(t),p=.5;
  pushP(o,L.x+a*Math.sign(c)*Math.pow(Math.abs(c),p),L.z+b*Math.sign(s)*Math.pow(Math.abs(s),p));}o[o.length-1]=o[0].slice();return o;})();
let S=null;
const rdist=(x,z,x0,z0,x1,z1)=>Math.hypot(Math.max(x0-x,0,x-x1),Math.max(z0-z,0,z-z1));
/* a path's direction that wraps round a closed loop; where (x, z) sits on it (arc length, signed offset, positive to the right) */
function dirW(p,s){const L=p.len,w=v=>p.closed?((v%L)+L)%L:Math.max(0,Math.min(L,v)),a=p.at(w(s-2)),b=p.at(w(s+2)),l=Math.hypot(b[0]-a[0],b[1]-a[1])||1;return [(b[0]-a[0])/l,(b[1]-a[1])/l];}
function onPath(p,x,z,r=1){const n=p.nearest(x,z,r);if(!n)return null;const c=p.at(n.s),d=dirW(p,n.s);
  return {s:n.s+(x-c[0])*d[0]+(z-c[1])*d[1],off:(x-c[0])*-d[1]+(z-c[1])*d[0],d:n.d,dx:d[0],dz:d[1]};}
/* the curvature along a closed path, a value a metre (negative turns left), averaged over +-w metres */
function curv(p,w){const n=Math.ceil(p.len)+1,k=new Float32Array(n),o=new Float32Array(n);
  for(let i=0;i<n;i++){const a=dirW(p,i-6),b=dirW(p,i+6);k[i]=(a[0]*b[1]-a[1]*b[0])/12;}
  const at=i=>k[p.closed?((i%n)+n)%n:Math.max(0,Math.min(n-1,i))];
  for(let i=0;i<n;i++){let s=0;for(let j=-w;j<=w;j++)s+=at(i+j);o[i]=s/(2*w+1);}return o;}
const atS=(arr,p,s)=>arr[Math.max(0,Math.min(arr.length-1,Math.round(p.closed?((s%p.len)+p.len)%p.len:s)))];
function init(X){S={X};
  const mp=X.makePath,nat=X.natural,avg=(cx,cz,r)=>{let s=0,n=0;for(let a=-r;a<=r;a+=r/4)for(let b=-r;b<=r;b+=r/4){s+=nat(cx+a,cz+b);n++;}return s/n;};
  const sp=DEF.speedway;S.Lsp=avg((sp.x0+sp.x1)/2,(sp.z0+sp.z1)/2,150);
  const L=DEF.lake,lo=[];for(let a=-1;a<=1.001;a+=.1)for(let b=-1;b<=1.001;b+=.1)if(a*a+b*b<=1)lo.push(nat(L.x+a*L.rx,L.z+b*L.rz));lo.sort((a,b)=>a-b);S.Llk=lo[Math.floor(lo.length*.25)];
  for(const k of ['summit','rally','mill','brook','lakeRd','spRd','gate'])S[k]=mp(DEF[k],false);
  for(const k of ['oval','short','lakeLoop'])S[k]=mp(DEF[k],true);
  /* the oval's banking (14 degrees in the turns, 5 on the straights) and the short course's berms, from how hard each bit turns */
  S.ovK=curv(S.oval,18);S.shK=curv(S.short,10);
  /* the short course's jumps, whoops and crest, by distance along it */
  const sAt=(x,z)=>S.short.nearest(x,z,2).s;
  S.jumps=[{s:sAt(1180,-90),h:1.7,up:11,top:12,down:13},{s:sAt(1255,-310),h:1.5,up:10,top:10,down:12}];
  S.whoop=[sAt(1285,-210),sAt(1195,-210)];S.crest=sAt(1190,-410);
  /* the summit's level is worked out once the road is cut */
  S.keep=[[DEF.lot.x0-4,DEF.lot.z0-4,DEF.lot.x1+4,DEF.lot.z1+30]];
}
/* more land, added to the ranch's own shape of it: Bald Mountain to the north, the Cedar Hills to the west */
function lift(x,z,NZ){let h=0;
  if(z<-380){const dx=(x-90)/330,dz=(z+1270)/250,g=Math.exp(-(dx*dx+dz*dz)/2)*sst(-380,-600,z);
    h+=155*g*(.9+.2*NZ.fbm(x/140+3,z/140-8))+sst(-800,-1150,z)*18*NZ.ridge(x/210+5.3,z/210+1.7)*(1-g);}
  if(x<-820){const w=sst(-820,-1050,x);h+=w*(26*(NZ.fbm(x/190-6,z/190+2)-.45)+10*NZ.ridge(x/95+2,z/95));}
  return h;}
/* the hills that close the world in, at its edge, with gaps where the county road runs off it */
function rim(x,z,e,NZ){const w=sst(EDGE-55,EDGE-5,e);if(w<=0)return 0;
  const gap=Math.exp(-Math.pow((z-394)/38,2))*sst(EDGE-160,EDGE-60,Math.abs(x));
  return w*70*(.6+.4*NZ.fbm(x/80,z/80))*(1-gap);}
/* flatten the speedway's ground and the dry lake */
function shape(x,z,h){
  const sp=DEF.speedway;if(x>sp.x0-60&&x<sp.x1+60&&z>sp.z0-60&&z<sp.z1+60){const w=1-sst(0,50,rdist(x,z,sp.x0,sp.z0,sp.x1,sp.z1));if(w>0)h=h*(1-w)+S.Lsp*w;}
  const L=DEF.lake,dx=(x-L.x)/L.rx,dz=(z-L.z)/L.rz;if(dx>-1.4&&dx<1.4&&dz>-1.4&&dz<1.4){const r=Math.hypot(dx,dz),w=1-sst(1,1.35,r);if(w>0)h=h*(1-w)+S.Llk*w;}
  return h;}
/* the oval's and the short course's height across them: banked (the outside up), a berm behind the outside edge */
function ovalLift(s,off){const hw=OV.hw,k=atS(S.ovK,S.oval,s),th=(5+9*sst(1/260,1/90,Math.abs(k)))*PI/180,t=Math.tan(th),top=t*2*hw;
  if(off<=-hw)return 0;if(off<=hw)return t*(off+hw);if(off<=hw+3)return top;return top*(1-sst(hw+3,hw+14,off));}
function table(u,J){const a=J.top/2;if(u<-a-J.up||u>a+J.down)return 0;if(u<-a)return J.h*Math.pow((u+a+J.up)/J.up,1.25);if(u<=a)return J.h;return J.h*(1-sst(a,a+J.down,u));}
function shortLift(s,off){const hw=DEF.SHORT_HALF,k=atS(S.shK,S.short,s),out=-Math.sign(k)||1,o=off*out,t=Math.min(.22,Math.abs(k)*14),across=1-sst(hw+.5,hw+4,Math.abs(off));
  let y=0;if(o>-hw)y+=o<=hw?t*(o+hw):t*2*hw*(1-sst(hw+1,hw+9,o));
  for(const J of S.jumps)y+=table(s-J.s,J)*across;
  if(s>S.whoop[0]&&s<S.whoop[1])y+=.36*(.5-.5*Math.cos((s-S.whoop[0])/8*2*PI))*sst(S.whoop[0],S.whoop[0]+6,s)*sst(S.whoop[1],S.whoop[1]-6,s)*across;
  y+=1.3*Math.exp(-Math.pow((s-S.crest)/14,2))*across;
  return y;}
/* ---------- carving: the roads first, the brook through the stage, then the oval and the short course on top ---------- */
function carve(X,C){
  const R=DEF.ROAD_HALF,{H,N2,cell,x0,z0}=X;
  X.carve(S.rally,R+.3,8,8,0,.14,[C.cr]);
  X.carve(S.summit,DEF.SUMMIT_HALF+.4,16,6,0,.1,[C.range]);
  X.carve(S.lakeRd,R+.3,8,10,0,.1,[C.cr]);X.carve(S.spRd,R+.3,8,10,0,.1,[C.cr]);X.carve(S.gate,R+.3,6,3,0,.1,[C.cr]);
  /* the brook cuts its bed through the stage (a ford), then Mill Road crosses it on fill */
  S.brookProf=X.carve(S.brook,3.5,5,6,1.2);
  X.carve(S.mill,R+.1,8,8,0,.12,[S.rally,C.range]);
  /* ease the ford: the stage's banks come down to the water at no more than a 1-in-5 */
  {const done=new Uint8Array(N2*N2),r=Math.ceil(26/cell)+1;
    for(let i=0;i<S.rally.N;i+=2){const cn=S.brook.nearest(S.rally.X[i],S.rally.Z[i],1);if(!cn||cn.d>22)continue;
      const ci=Math.round((S.rally.X[i]-x0)/cell),cj=Math.round((S.rally.Z[i]-z0)/cell);
      for(let dj=-r;dj<=r;dj++)for(let di=-r;di<=r;di++){const ii=ci+di,jj=cj+dj;if(ii<0||jj<0||ii>=N2||jj>=N2)continue;const k=jj*N2+ii;if(done[k])continue;done[k]=1;
        const x=x0+ii*cell,z=z0+jj*cell,rn=S.rally.nearest(x,z,1),bn=S.brook.nearest(x,z,1);if(!rn||!bn||rn.d>8)continue;
        const bed=S.brookProf[bn.i]-1.2,lim=bed+.2*Math.max(0,bn.d-1.5),w=1-sst(5,8,rn.d);if(H[k]>lim)H[k]=H[k]*(1-w)+lim*w;}}}
  /* crests on the stage's straighter bits, to get light over (none near the ford) */
  {const P=S.rally,done=new Uint8Array(N2*N2),r=Math.ceil(16/cell)+1;S.crests=[];
    for(const s0 of [380,900,1330,2150,2420]){const c=P.at(s0),bn=S.brook.nearest(c[0],c[1],4);if(bn&&bn.d<80)continue;S.crests.push(s0);}
    for(let i=0;i<P.N;i+=2){if(!S.crests.some(c=>Math.abs(i*P.ds-c)<30))continue;const ci=Math.round((P.X[i]-x0)/cell),cj=Math.round((P.Z[i]-z0)/cell);
      for(let dj=-r;dj<=r;dj++)for(let di=-r;di<=r;di++){const ii=ci+di,jj=cj+dj;if(ii<0||jj<0||ii>=N2||jj>=N2)continue;const k=jj*N2+ii;if(done[k])continue;done[k]=1;
        const q=onPath(P,x0+ii*cell,z0+jj*cell,1);if(!q||q.d>14)continue;let y=0;for(const c of S.crests)y+=1.25*Math.exp(-Math.pow((q.s-c)/9,2));H[k]+=y*(1-sst(R+1,R+10,q.d));}}}
  /* the brook's water a little over its bed */
  S.brookLvl=new Float64Array(S.brook.N);for(let i=0;i<S.brook.N;i++){const ix=Math.round((S.brook.X[i]-x0)/cell),iz=Math.round((S.brook.Z[i]-z0)/cell);S.brookLvl[i]=H[iz*N2+ix]+.5;}
  /* the summit: a level pad where the road ends */
  {const e=S.summit.N-1,ix=Math.round((S.summit.X[e]-x0)/cell),iz=Math.round((S.summit.Z[e]-z0)/cell);S.Lsum=H[iz*N2+ix];
    const cx=S.summit.X[e]-12,cz=S.summit.Z[e]-8;S.pad=[cx-22,cz-16,cx+22,cz+16];
    for(let j=0;j<N2;j++){const z=z0+j*cell;if(z<cz-50||z>cz+50)continue;for(let i=0;i<N2;i++){const x=x0+i*cell;if(x<cx-60||x>cx+60)continue;
      const w=1-sst(0,22,rdist(x,z,...S.pad));if(w>0){const k=j*N2+i;H[k]=H[k]*(1-w)+S.Lsum*w;}}}}
  /* the oval and the short course: their own grade, then banking, berms and jumps added on */
  S.ovProf=X.carve(S.oval,OV.hw+2,14,10,0,.02);
  S.shProf=X.carve(S.short,DEF.SHORT_HALF+.5,12,10,0,.07,[S.spRd]);
  for(const [p,fn,reach] of [[S.oval,ovalLift,OV.hw+16],[S.short,shortLift,DEF.SHORT_HALF+11]]){
    const done=new Uint8Array(N2*N2),r=Math.ceil(reach/cell)+1;
    for(let i=0;i<p.N;i+=2){const ci=Math.round((p.X[i]-x0)/cell),cj=Math.round((p.Z[i]-z0)/cell);
      for(let dj=-r;dj<=r;dj++)for(let di=-r;di<=r;di++){const ii=ci+di,jj=cj+dj;if(ii<0||jj<0||ii>=N2||jj>=N2)continue;const k=jj*N2+ii;if(done[k])continue;done[k]=1;
        const q=onPath(p,x0+ii*cell,z0+jj*cell,2);if(!q||q.d>reach)continue;H[k]+=fn(q.s,q.off);}}}
}
/* which roads join which, for the ditches and the fences: the ends of the far roads */
function joins(){const o=[];for(const p of [S.rally,S.lakeRd,S.spRd,S.gate,S.summit,S.mill])o.push([p.X[0],p.Z[0]],[p.X[p.N-1],p.Z[p.N-1]],...(p.cross||[]));return o;}
/* ---------- the surface map ---------- */
let NEED=null;
function needMask(){NEED=new Uint8Array(65536);const B=16,mark=(x,z,r)=>{const bx=Math.floor(x/B)+128,bz=Math.floor(z/B)+128;for(let a=-r;a<=r;a++)for(let b=-r;b<=r;b++){const u=bx+a,w=bz+b;if(u>=0&&w>=0&&u<256&&w<256)NEED[u*256+w]=1;}};
  for(const [p,r] of [[S.rally,1],[S.summit,1],[S.lakeRd,1],[S.spRd,1],[S.gate,1],[S.mill,1],[S.brook,1],[S.oval,2],[S.short,2]])for(let i=0;i<p.N;i+=4)mark(p.X[i],p.Z[i],r);
  const L=DEF.lake;for(let x=L.x-L.rx*1.2;x<=L.x+L.rx*1.2;x+=B)for(let z=L.z-L.rz*1.2;z<=L.z+L.rz*1.2;z+=B)mark(x,z,0);
  for(const R of [DEF.lot,{x0:S.pad[0],z0:S.pad[1],x1:S.pad[2],z1:S.pad[3]}])for(let x=R.x0;x<=R.x1+B;x+=B)for(let z=R.z0;z<=R.z1+B;z+=B)mark(x,z,1);}
let GR=null;
function surface(X,k,x,z){
  if(!NEED)needMask();
  const W=X.W,SF=X.SF,SC=X.SC,H=X.H;
  if(!NEED[(Math.floor(x/16)+128)*256+Math.floor(z/16)+128])return;
  let g=W[k*4],r=W[k*4+1],m=W[k*4+2],code=SC[k];
  if(!GR)GR=[[S.rally,DEF.ROAD_HALF],[S.lakeRd,DEF.ROAD_HALF],[S.spRd,DEF.ROAD_HALF],[S.gate,DEF.ROAD_HALF],[S.mill,DEF.ROAD_HALF-.2]];
  /* the brook: water over the deep part, mud and stones at the edge */
  {const n=S.brook.nearest(x,z,1);if(n&&n.d<9){g*=sst(3,9,n.d);r=Math.max(r*.6,(1-sst(1,6,n.d))*.55);
    if(n.d<2.6&&H[k]<S.brookLvl[n.i]-.05)code=SF.water;}}
  /* gravel roads with grass verges */
  for(const [p,half] of GR){const n=p.nearest(x,z,1);if(!n||n.d>half+5)continue;
    g*=sst(half-.6,half+3,n.d);r*=sst(half,half+4,n.d);m*=sst(half,half+3,n.d);if(n.d<half+.2)code=SF.gravel;}
  /* Summit Road: tarmac with a gravel shoulder */
  {const n=S.summit.nearest(x,z,1),h=DEF.SUMMIT_HALF;if(n&&n.d<h+5){g*=sst(h,h+3,n.d);r*=sst(h+.5,h+4,n.d);m=0;if(n.d<h+.25)code=SF.asphalt;else if(n.d<h+1.3)code=SF.gravel;}}
  /* the oval: clay, an apron inside, mown grass round it */
  {const q=onPath(S.oval,x,z,2);if(q&&q.d<40){const hw=OV.hw;g=Math.max(g*.3,1-sst(hw+10,hw+30,q.d));r=0;m=0;
    if(q.off>-hw-2.2&&q.off<hw+.6)code=SF.strip,g=0;else code=SF.grass;}}
  /* the short course: loose dirt */
  {const q=onPath(S.short,x,z,2);if(q&&q.d<20){const hw=DEF.SHORT_HALF;r*=sst(hw,hw+6,q.d);m=0;g*=sst(hw-.5,hw+3,q.d);if(q.d<hw+.3)code=SF.dirt;}}
  /* the dry lake: hard clay */
  {const L=DEF.lake,e=Math.hypot((x-L.x)/L.rx,(z-L.z)/L.rz);if(e<1.2){const w=1-sst(.96,1.12,e);g*=1-w;r*=1-w;m*=1-w;if(e<1)code=SF.strip;}}
  /* the speedway's car park and the summit's pad */
  const lt=DEF.lot;if(x>=lt.x0&&x<=lt.x1&&z>=lt.z0&&z<=lt.z1)code=SF.concrete,g=0,r=0,m=0;
  if(x>=S.pad[0]&&x<=S.pad[2]&&z>=S.pad[1]&&z<=S.pad[3])code=SF.gravel,g=0,r=0,m=0;
  W[k*4]=g;W[k*4+1]=r;W[k*4+2]=m;SC[k]=code;
}
/* is (x, z) where something new now runs? (trees and rocks keep off it) */
function blocked(x,z,r){
  for(const [p,w] of [[S.rally,8],[S.summit,9],[S.lakeRd,8],[S.spRd,8],[S.gate,8],[S.mill,8],[S.brook,6],[S.short,16]]){const n=p.nearest(x,z,2);if(n&&n.d<w+r)return true;}
  const sp=DEF.speedway,L=DEF.lake;if(rdist(x,z,sp.x0,sp.z0,sp.x1,sp.z1)<r+6)return true;
  if(Math.hypot((x-L.x)/L.rx,(z-L.z)/L.rz)<1.12)return true;
  if(S.pad&&rdist(x,z,...S.pad)<r+8)return true;
  return false;
}
/* ---------- geometry ---------- */
const FIX=[];
function geometry(X){
  const C2=X.C2,Rg=X.rng(4711),box=X.box,cb=X.collideBox,cc=X.collideCirc,hAt=X.heightAt,band=X.band,across=X.across,post=X.post,glow=X.glow,R=DEF.ROAD_HALF;
  const at=(p,s)=>p.at(p.closed?((s%p.len)+p.len)%p.len:Math.max(0,Math.min(p.len,s)));
  const side=(p,s,off)=>{const c=at(p,s),d=dirW(p,s);return [c[0]-d[1]*off,c[1]+d[0]*off,d];};
  /* the gravel roads and the stage */
  for(const [p,h] of [[S.rally,R],[S.lakeRd,R],[S.spRd,R],[S.gate,R],[S.mill,R-.2]])band(p,across(h+.4,8),3,0,p.len,2,.035,()=>[0,h]);
  /* Summit Road: tarmac, white edge lines (no kerbs) */
  band(S.summit,across(DEF.SUMMIT_HALF+1.2,8),4,0,S.summit.len,2,.04,()=>[0,DEF.SUMMIT_HALF]);
  /* the oval's clay and the short course's dirt (kind in the blue slot, half width in alpha) */
  band(S.oval,[-OV.hw-2.4,-OV.hw-1.2,-OV.hw,-OV.hw*.6,-OV.hw*.2,OV.hw*.2,OV.hw*.6,OV.hw,OV.hw+.7],6,0,S.oval.len,2,.04,()=>[0,OV.hw]);
  band(S.short,across(DEF.SHORT_HALF+.8,8),6,0,S.short.len,1.5,.04,()=>[1,DEF.SHORT_HALF]);
  /* the brook's water */
  {C2.mat(24).col(255,255,255,255);let prev=null;
    for(let s=0;s<=S.brook.len;s+=3){const c=S.brook.at(s),d=S.brook.dir(s),lvl=S.brookLvl[Math.min(S.brook.N-1,Math.round(s/S.brook.ds))],mn=S.mill.nearest(c[0],c[1],1);
      if(mn&&mn.d<9){prev=null;continue;}
      const row=[-1,0,1].map(k=>[c[0]-d[1]*k*5,lvl,c[1]+d[0]*k*5]);
      if(prev){const B=C2.at(c[0],c[1]),a=prev.map(p=>B.v(p,[0,1,0],p[0],p[2])),b=row.map(p=>B.v(p,[0,1,0],p[0],p[2]));for(let k=0;k<2;k++)B.quad(a[k],b[k],b[k+1],a[k+1]);}
      prev=row;}}
  /* the dry lake's clay, laid over the ground in the shape of the lake */
  {const L=DEF.lake,st=8;C2.mat(17,7).col(255,255,255,255);
    for(let z=L.z-L.rz;z<L.z+L.rz;z+=st)for(let x=L.x-L.rx;x<L.x+L.rx;x+=st){if(Math.hypot((x+st/2-L.x)/L.rx,(z+st/2-L.z)/L.rz)>1.01)continue;
      const B=C2.at(x+st/2,z+st/2),q=[[x,z],[x+st,z],[x+st,z+st],[x,z+st]].map(([px,pz])=>B.v([px,S.Llk+.03,pz],[0,1,0],px,pz));B.quad(q[0],q[3],q[2],q[1]);}}
  /* ---------- Speedway Park ---------- */
  {const L=S.Lsp,lt=DEF.lot,O=S.oval,hw=OV.hw;
    X.pad(lt.x0,lt.z0,lt.x1,lt.z1,4,0,null,.05,8);
    /* the outside wall, a catch fence above it on posts */
    {let prev=null;const wo=hw+.9;
      for(let s=0;s<=O.len+.01;s+=2){const [x,z,d]=side(O,s,wo),y=hAt(x,z),n=[d[1],0,-d[0]],row=[[x,y-.3,z],[x,y+1.1,z],[x-d[1]*.35,y+1.1,z+d[0]*.35]];
        if(prev){const B=C2.at(x,z);B.m=[4,0,0,0];B.c=[255,255,255,255];
          B.quadP(prev[0],row[0],row[1],prev[1],undefined,n);B.quadP(prev[1],row[1],row[2],prev[2],undefined,[0,1,0]);
          B.m=[8,0,0,0];B.c=[60,62,66,255];for(const hh of [1.9,2.7,3.5]){const a=[prev[0][0],prev[0][1]+hh,prev[0][2]],b=[x,y+hh,z];B.tube(a,b,.025,3,false);}}
        if(Math.round(s)%8===0){C2.mat(8).col(70,72,76,255);C2.at(x,z).tube([x,y+1,z],[x,y+3.8,z],.05,4,false);}
        prev=row;}
      for(let s=0;s<O.len;s+=.9){const [x,z]=side(O,s,wo+.3);cc(x,z,.55,hAt(x,z)+1.2);}}
    /* the grandstand behind the front straight, facing the track, a roof over the top rows */
    {const z0=OV.z+OV.R+hw+16,x0=OV.x-85,x1=OV.x+85;
      for(let r=0;r<10;r++){box([OV.x,L+.4+r*.55,z0+2+r*1.1],[85,.07,.5],18,[176,160,140,255]);box([OV.x,L+.2+r*.55,z0+2.4+r*1.1],[85,.22+r*.28,.06],8,[120,122,128,255]);}
      box([OV.x,L+3.1,z0+13.6],[86,3.1,.25],8,[120,122,128,255]);cb(x0,z0+1.4,x1,z0+14,L+6.4);
      for(const x of [x0+6,OV.x-28,OV.x+28,x1-6])box([x,L+4.4,z0+12.8],[.18,4.4,.18],8,[90,92,98,255]);
      box([OV.x,L+8.9,z0+9],[87,.15,5.5],8,[200,40,30,255]);box([OV.x,L+8.75,z0+9],[87,.04,5.5],8,[230,230,226,255]);
      /* the press box on top, the flag stand at the line */
      box([OV.x,L+10.6,z0+12],[9,1.6,2.2],19,[220,220,214,255]);box([OV.x,L+10.8,z0+9.75],[8.6,.7,.04],8,[26,32,40,255]);
      {const x=OV.x,z=OV.z+OV.R+hw+3.5,y=hAt(x,z);box([x,y+2.4,z],[1.2,.06,1.2],8,[200,200,204,255]);for(const [a,b] of [[-1,-1],[-1,1],[1,-1],[1,1]])box([x+a*1.1,y+1.2,z+b*1.1],[.06,1.2,.06],8,[200,200,204,255]);cc(x,z,1.5,y+2.5);}}
    /* light poles round the oval, outside the fence */
    for(let i=0;i<8;i++){const s=i/8*O.len+O.len/16,[x,z,d]=side(O,s,hw+12),y=post(x,z,18,.25,[90,92,98,255]);
      const ty=y+18.4,dir=X.norm([d[1],-.9,-d[0]]);
      box([x,ty,z],[1.6,.5,1.6],8,[60,62,66,255]);glow([x+dir[0]*.6,ty-.3,z+dir[2]*.6],[1.2,.25,1.2],[1,.97,.9],1.6);cc(x,z,.4,ty);
      FIX.push({p:[x,ty-.4,z],r:110,c:[9,8.8,8.2],d:dir,cs:Math.cos(.75)});}
    /* the infield: haulers parked in a row */
    for(let i=0;i<4;i++){const x=OV.x-60+i*40,z=OV.z,y=hAt(x,z),col=[[200,40,30],[30,80,170],[230,230,226],[40,140,70]][i];
      box([x,y+2.1,z],[7,1.7,1.25],8,[...col,255]);box([x+8.6,y+1.8,z],[1.6,1.4,1.2],8,[40,42,46,255]);cb(x-7.2,z-1.4,x+10.3,z+1.4,y+3.9);}
  }
  /* ---------- the short course: a start gantry, tyre walls round the outside of the 180s, flags ---------- */
  {const P=S.short,hw=DEF.SHORT_HALF;
    {const [,,d]=side(P,0,0);for(const sd of [-1,1]){const [x,z]=side(P,0,sd*(hw+1.5)),y=post(x,z,6,.2,[60,62,66,255]);cc(x,z,.35,y+6.2);}
      const c=at(P,0),y=hAt(c[0],c[1]);box([c[0],y+6.3,c[1]],[Math.abs(d[1])*(hw+1.6)+.3,.4,Math.abs(d[0])*(hw+1.6)+.3],8,[40,40,44,255]);
      for(let k=-2;k<=2;k++)glow([c[0]+d[0]*-.35+(-d[1])*k*.9,y+6.3,c[1]+d[1]*-.35+d[0]*k*.9],[.16,.16,.16],[1,.08,.04],1.8);}
    for(let s=0;s<P.len;s+=.8){const k=atS(S.shK,P,s);if(Math.abs(k)<1/75)continue;const out=-Math.sign(k),[x,z]=side(P,s,out*(hw+10)),y=hAt(x,z);
      C2.mat(8).col(22,22,24,255);C2.at(x,z).tube([x,y-.05,z],[x,y+.78,z],.36,9,true);C2.mat(8).col(...((s/2.4|0)%2?[230,230,226]:[200,40,30]),255);C2.at(x,z).tube([x,y+.52,z],[x,y+.56,z],.365,9,false);cc(x,z,.42,y+.8);}
    for(let s=20;s<P.len;s+=45){const [x,z]=side(P,s,(s/45|0)%2?hw+3:-hw-3),y=post(x,z,2.6,.03,[220,220,220,255]);box([x+.4,y+2.35,z],[.4,.25,.02],8,(s/45|0)%3?[255,110,26,255]:[40,120,230,255]);}
  }
  /* ---------- Summit Road: steel guard rail wherever the ground falls away, a mast on the top ---------- */
  {const P=S.summit,h=DEF.SUMMIT_HALF;
    for(const sd of [-1,1]){let prev=null;
      for(let s=4;s<P.len-6;s+=2){const [x,z,d]=side(P,s,sd*(h+1.3)),y=hAt(x,z),[ox,oz]=side(P,s,sd*(h+9)),drop=y-hAt(ox,oz);
        if(drop<2.2){prev=null;continue;}
        const B=C2.at(x,z),top=[x,y+.78,z],bot=[x,y+.48,z];
        if(prev){B.m=[19,0,0,0];B.c=[200,204,208,255];B.quadP(prev[1],bot,top,prev[0],undefined,[-d[1]*sd,0,d[0]*sd]);B.quadP(prev[0],top,bot,prev[1],undefined,[d[1]*sd,0,-d[0]*sd]);}
        if((s|0)%4===0){C2.mat(8).col(120,124,130,255);B.tube([x,y-.1,z],[x,y+.74,z],.07,5,false);}
        cc(x,z,.35,y+.85);prev=[top,bot];}}
    /* the mast: a lattice of four legs that come together, cross bracing, a red light on top */
    {const cx=S.pad[0]+7,cz=S.pad[1]+6,y=S.Lsum,Hm=46;C2.mat(8).col(200,60,40,255);const B=C2.at(cx,cz);
      for(const [a,b] of [[-1,-1],[-1,1],[1,-1],[1,1]])B.tube([cx+a*2.2,y,cz+b*2.2],[cx+a*.35,y+Hm,cz+b*.35],.07,4,false);
      for(let k=0;k<12;k++){const y0=y+k*Hm/12,y1=y+(k+1)*Hm/12,w0=2.2-1.85*k/12,w1=2.2-1.85*(k+1)/12;
        for(const [a,b,c,d] of [[-1,-1,1,-1],[1,-1,1,1],[1,1,-1,1],[-1,1,-1,-1]])B.tube([cx+a*w0,y0,cz+b*w0],[cx+c*w1,y1,cz+d*w1],.03,3,false);}
      glow([cx,y+Hm+.4,cz],[.25,.25,.25],[1,.06,.03],3);cc(cx,cz,2.6,y+Hm);
      FIX.push({p:[cx,y+Hm+.4,cz],r:30,c:[3,.2,.1],d:null});
      box([cx+8,y+1.3,cz+2],[2.5,1.3,2],19,[200,200,196,255]);cb(cx+5.4,cz-.1,cx+10.6,cz+4.1,y+2.6);}
  }
  /* ---------- the stage: start and finish arches, a post every kilometre ---------- */
  {const P=S.rally;
    for(const [s,col] of [[30,[40,200,90]],[P.len-30,[230,40,30]]]){const [,,d]=side(P,s,0);
      for(const sd of [-1,1]){const [x,z]=side(P,s,sd*(R+1.4)),y=post(x,z,4.8,.18,[230,230,226,255]);cc(x,z,.3,y+5);}
      const c=at(P,s),y=hAt(c[0],c[1]);box([c[0],y+5,c[1]],[Math.abs(d[1])*(R+1.6)+.25,.45,Math.abs(d[0])*(R+1.6)+.25],8,[...col,255]);}
    for(let s=1000;s<P.len-100;s+=1000){const [x,z]=side(P,s,R+1.6),y=post(x,z,1.1,.08,[240,240,236,255]);box([x,y+1.2,z],[.2,.2,.04],8,[230,190,30,255]);}
  }
  /* ---------- the dry lake: cones round the course, a timing hut and flags at the line ---------- */
  {const P=S.lakeLoop,y=S.Llk;
    for(let s=0;s<P.len;s+=40)for(const sd of [-1,1]){const [x,z]=side(P,s,sd*14);C2.mat(8).col(255,110,26,255);C2.at(x,z).tube([x,y,z],[x,y+.75,z],.22,8,true,.03);C2.mat(8).col(240,240,240,255);C2.at(x,z).tube([x,y+.4,z],[x,y+.52,z],.15,8,false,.12);}
    const [hx,hz]=side(P,0,24);box([hx,y+1.4,hz],[2.5,1.4,2],19,[220,214,200,255]);cb(hx-2.6,hz-2.1,hx+2.6,hz+2.1,y+2.8);
    for(const sd of [-1,1]){const [x,z]=side(P,0,sd*15.5),py=post(x,z,4,.06,[220,220,220,255]);box([x,py+3.6,z+.4],[.02,.35,.4],8,[20,20,20,255]);}
  }
  /* ---------- trees: the Cedar Hills' woods, pines up the mountain, groves and windbreaks elsewhere ---------- */
  const N=X.NZ,old=(x,z)=>Math.abs(x)<790&&Math.abs(z)<790;let nT=0;
  for(let t=0;t<90000&&nT<5600;t++){const x=(Rg()-.5)*3080,z=(Rg()-.5)*3080;if(old(x,z))continue;
    const k=(Math.round((z-X.z0)/X.cell))*X.N2+Math.round((x-X.x0)/X.cell);if(X.W[k*4+1]>.55||X.SC[k]===X.SF.water)continue;
    const y=X.H[k],hills=sst(-860,-1000,x),mtn=sst(-760,-900,z)*(1-sst(118,140,y)),dens=N.fbm(x/80+13,z/80-4);
    let p=Math.max(hills*(dens>.42?.85:.12),mtn*(dens>.38?.7:.15));if(p<.05)p=N.fbm(x/120-9,z/120+3)>.62?.35:.006;
    if(Rg()>p)continue;if(blocked(x,z,2)||CTRY.blocked(x,z,2))continue;
    const pine=mtn>.3?Rg()<.8:hills>.5?Rg()<.45:Rg()<.15;X.addTree(x,z,pine?1:0,.8+Rg()*.6,Rg);nT++;}
  /* windbreaks along the lake road and the farms south of the county road */
  for(let s=40;s<S.lakeRd.len-40;s+=9+Rg()*4){const [x,z]=side(S.lakeRd,s,13+Rg()*3);if(!blocked(x,z,1))X.addTree(x,z,Rg()<.3?1:0,.9+Rg()*.4,Rg);}
  S.nTrees=nT;
}
function info(){return {DEF,oval:S.oval,short:S.short,summit:S.summit,rally:S.rally,mill:S.mill,lakeLoop:S.lakeLoop,lakeRd:S.lakeRd,spRd:S.spRd,brook:S.brook,
  Lsp:S.Lsp,Llk:S.Llk,Lsum:S.Lsum,pad:S.pad,jumps:S.jumps,fix:FIX};}
return {DEF,EDGE,init,lift,rim,shape,carve,joins,surface,blocked,geometry,info,ovalLift,onPath,dirW};
})();

