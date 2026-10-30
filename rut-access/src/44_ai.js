/* =====================================================================================
   THE DRIVERS. A robot at the wheel of any car, on the same physics as yours. It knows the course (a path and
   how wide it is) and works out a line through it that bends as little as the edges allow. For its own car it
   works out how fast each bit of that line can be taken: the tyres' grip on the ground there, the banking, the
   speed at which a tall car would tip over, then braking back from every corner. Then it drives it: aiming a
   little way down the line, gas and brake to hold the speed it wants, round slower cars, and back on the
   course when it goes off. Its skill (about .85 to 1) is how much of its car's grip it dares to use.
   Also here: the cars touching each other, each car's hull against the others' boxes, a shove both ways.
   Nothing here draws.
   ===================================================================================== */
const AI_G=9.81;
/* the robots' own helpers: stability and traction control and ABS, but no steering helper (they steer for themselves) */
ASSISTS.ai={id:'ai',name:'Robot',steer:0,esc:.85,tc:1,abs:1,drift:0,auto:1,catchSpin:0};
/* ---------- the line ---------- */
class RaceLine{
  /* path: a makePath path. hw: half the usable width (centre to edge), or (Showdown's cross-country routes) a function
     of the distance along that gives it there. o: {ds, margin, span, iters, ground(x,z), caps:[[s0,s1,v]]} */
  constructor(path,hw,o={}){
    const L=path.len,closed=!!path.closed,ds0=o.ds||2,n=closed?Math.max(12,Math.round(L/ds0)):Math.max(3,Math.round(L/ds0)+1),ds=closed?L/n:L/(n-1);
    const hwA=new Float64Array(n);for(let i=0;i<n;i++)hwA[i]=typeof hw==='function'?hw(Math.min(i*ds,L)):hw;
    Object.assign(this,{path,closed,n,ds,len:L,hw:typeof hw==='function'?Math.max(...hwA):hw,hwA,caps:o.caps||[]});
    const cx=new Float64Array(n),cz=new Float64Array(n),nx=new Float64Array(n),nz=new Float64Array(n),off=new Float64Array(n);
    const dir=s=>{const w=v=>closed?((v%L)+L)%L:Math.max(0,Math.min(L,v)),a=path.at(w(s-2)),b=path.at(w(s+2)),l=Math.hypot(b[0]-a[0],b[1]-a[1])||1;return [(b[0]-a[0])/l,(b[1]-a[1])/l];};
    for(let i=0;i<n;i++){const s=i*ds,c=path.at(Math.min(s,L)),d=dir(s);cx[i]=c[0];cz[i]=c[1];nx[i]=-d[1];nz[i]=d[0];}
    /* the line: an elastic band pulled tight between the edges (each point to the middle of its neighbours, along its own crosswise line) */
    const wA=hwA.map(h=>Math.max(0,h-(o.margin??1.6))),w=Math.max(...wA),m=o.span||Math.max(2,Math.round(8/ds)),idx=i=>closed?((i%n)+n)%n:Math.max(0,Math.min(n-1,i));
    for(let it=0;it<(o.iters||300);it++)for(let i=0;i<n;i++){
      if(!closed&&(i<2||i>n-3)){off[i]=0;continue;}
      const a=idx(i-m),b=idx(i+m),mx=(cx[a]+nx[a]*off[a]+cx[b]+nx[b]*off[b])/2,mz=(cz[a]+nz[a]*off[a]+cz[b]+nz[b]*off[b])/2,t=(mx-cx[i])*nx[i]+(mz-cz[i])*nz[i];
      off[i]+=.5*(Math.max(-wA[i],Math.min(wA[i],t))-off[i]);}
    if(o.flat)off.fill(0);
    const x=new Float64Array(n),z=new Float64Array(n);for(let i=0;i<n;i++){x[i]=cx[i]+nx[i]*off[i];z[i]=cz[i]+nz[i]*off[i];}
    /* curvature of the line (positive turns right), smoothed; the banking that helps (or hurts) in that turn; the ground */
    const k=new Float64Array(n),kk=new Float64Array(n),tb=new Float64Array(n),surf=new Array(n),q=Math.max(1,Math.round(6/ds));
    for(let i=0;i<n;i++){const a=idx(i-q),b=idx(i+q);if(!closed&&(i-q<0||i+q>n-1)){k[i]=0;continue;}
      const ax=x[i]-x[a],az=z[i]-z[a],bx=x[b]-x[i],bz=z[b]-z[i],la=Math.hypot(ax,az)||1,lb=Math.hypot(bx,bz)||1,cr=(ax*bz-az*bx)/(la*lb),dt=(ax*bx+az*bz)/(la*lb);
      k[i]=Math.atan2(cr,dt)/((la+lb)/2);}
    for(let i=0;i<n;i++){let s=0,c=0;for(let j=-2;j<=2;j++){const t=idx(i+j);s+=k[t];c++;}kk[i]=s/c;}
    const G=o.ground,y=new Float64Array(n),vmax=new Float64Array(n).fill(1e9);
    for(let i=0;i<n;i++){if(!G){surf[i]='asphalt';continue;}const g=G(x[i],z[i]);surf[i]=g.surf;y[i]=g.y;
      const hl=G(x[i]-nx[i]*1.5,z[i]-nz[i]*1.5).y,hr=G(x[i]+nx[i]*1.5,z[i]+nz[i]*1.5).y;tb[i]=Math.sign(kk[i])*(hl-hr)/3;}
    /* over a crest a car goes light at the speed where the ground falls away faster than it can: v = sqrt(g / curvature);
       through water, slowly (unless the course says to fly: o.jumps) */
    if(G){const h=Math.max(1,Math.round(4/ds));for(let i=0;i<n;i++){if(!closed&&(i<h||i>n-1-h))continue;
      const cv=-(y[idx(i+h)]-2*y[i]+y[idx(i-h)])/Math.pow(h*ds,2);if(cv>.006&&!o.jumps)vmax[i]=Math.min(vmax[i],Math.sqrt(AI_G/cv)*1.2);
      if(surf[i]==='water')for(let j=-6;j<=2;j++)vmax[idx(i+j)]=Math.min(vmax[idx(i+j)],12);}}
    Object.assign(this,{cx,cz,nx,nz,off,x,z,y,k:kk,tb,surf,vmax,wMax:w});
  }
  idx(i){return this.closed?((i%this.n)+this.n)%this.n:Math.max(0,Math.min(this.n-1,i));}
  /* the half width at a point of the line */
  hwAt(i){return this.hwA[this.idx(i)];}
  /* the speeds this car can take it at: for each point, then braking back from every slower bit */
  plan(v,skill=.92){
    const n=this.n,sp=new Float64Array(n),c=v.c,ssf=(c.trackF||1.6)/(2*Math.max(.3,c.hcg)),cache={};
    const muAt=s=>cache[s]??(cache[s]=(v.tyre.mu||1.1)*Math.min(v._smu(v.wheels[0],s),v._smu(v.wheels[2],s)));
    const vTop=95;
    for(let i=0;i<n;i++){const mu=muAt(this.surf[i])*skill,tb=Math.max(-.3,Math.min(.4,this.tb[i])),aLat=Math.min(AI_G*(mu+tb)/Math.max(.25,1-mu*tb),AI_G*(ssf+tb)*.78),kv=Math.abs(this.k[i]);
      sp[i]=Math.min(vTop,this.vmax[i],Math.sqrt(aLat/Math.max(kv,1e-5)));}
    for(const [s0,s1,vc] of this.caps)for(let i=Math.max(0,Math.floor(s0/this.ds));i<=Math.min(n-1,Math.ceil(s1/this.ds));i++)sp[i]=Math.min(sp[i],vc);
    /* braking back from each slow bit (round twice on a loop, so the end brakes for the start) */
    const rounds=this.closed?2:1;
    for(let r=0;r<rounds;r++)for(let j=n-1;j>=0;j--){const i=j,nx=this.idx(i+1);if(!this.closed&&i===n-1)continue;
      const aB=muAt(this.surf[i])*skill*AI_G*.82;sp[i]=Math.min(sp[i],Math.sqrt(sp[nx]*sp[nx]+2*aB*this.ds));}
    return sp;
  }
  /* the nearest point to (x, z), looking near the last one found (i0), or everywhere */
  find(x,z,i0=-1,reach=30){
    let best=-1,bd=1e18;const look=(i)=>{const dx=this.x[i]-x,dz=this.z[i]-z,d=dx*dx+dz*dz;if(d<bd){bd=d;best=i;}};
    if(i0<0)for(let i=0;i<this.n;i++)look(i);else for(let j=-reach;j<=reach;j++)look(this.idx(i0+j));
    return {i:best,d:Math.sqrt(bd)};
  }
  /* a point on the line s metres along, with an offset across it from the line (positive right) */
  at(s,off=0){const f=s/this.ds,i0=Math.floor(f),t=f-i0,a=this.idx(i0),b=this.idx(i0+1),
    x=this.x[a]+(this.x[b]-this.x[a])*t,z=this.z[a]+(this.z[b]-this.z[a])*t,nx=this.nx[a]+(this.nx[b]-this.nx[a])*t,nz=this.nz[a]+(this.nz[b]-this.nz[a])*t;
    return [x+nx*off,z+nz*off];}
  /* the line's own offset from the centre, and so how far either way a car may move off it */
  room(s,half){const i=this.idx(Math.round(s/this.ds)),o=this.off[i],e=this.hwA[i]-half-.35;return [-e-o,e-o];}
}
/* ---------- the driver ---------- */
class Driver{
  /* car: a Vehicle. line: a RaceLine. o: {skill, name, bias (m off the line it likes), react (s, for the start)} */
  constructor(car,line,o={}){
    this.car=car;this.line=line;this.skill=o.skill??.92;this.name=o.name||'';this.bias=o.bias||0;this.react=o.react??.25;
    /* effort (Showdown): how hard it's trying, 1 flat out. Below 1 it takes the corners a little slower and never
       uses all the throttle: sizing up a car that looks slow (60_race wakes it up when that car gets by) */
    this.effort=1;this.thrCap=1;
    /* gs: how much of the grip it reckons the tyres have that they really give, learnt as it goes: running wide
       in a turn takes it down, a clean fast turn puts it back up */
    this.gs=o.gs??.86;this.gsPlan=this.gs;this.spinT=0;this.wrongT=0;
    this.sp=line.plan(car,this.skill*this.gs*this.effort);this.i=-1;this.lap=0;this.prog=0;this.avoid=0;this.inp={steer:0,thr:0,brk:0,hb:0,nos:false};
    this.stuckT=0;this.offT=0;this.flipT=0;this.go=false;this.goT=0;this.want=0;this.done=false;this.resetReq=false;this.half=car.c.body.W/2;
  }
  /* where the car is along the line: index, distance along (counting laps), how far off it */
  track(){
    const t=this.car,L=this.line,f=L.find(t.p[0],t.p[2],this.i,this.i<0?0:24),pi=this.i;
    if(L.closed&&pi>=0){if(pi>L.n*.75&&f.i<L.n*.25)this.lap++;else if(pi<L.n*.25&&f.i>L.n*.75)this.lap--;}
    this.i=f.i;this.dist=f.d;
    /* the arc length, with the car's own place along the segment */
    const i=f.i,j=L.idx(i+1),sx=L.x[j]-L.x[i],sz=L.z[j]-L.z[i],sl=Math.hypot(sx,sz)||1,u=((t.p[0]-L.x[i])*sx+(t.p[2]-L.z[i])*sz)/sl;
    this.s=i*L.ds+u;this.prog=this.lap*L.len+this.s;
    this.lat=(t.p[0]-L.x[i])*L.nx[i]+(t.p[2]-L.z[i])*L.nz[i];
    return this;
  }
  /* the speed it wants a little way ahead (where it will be in a moment) */
  target(ahead){const L=this.line,i0=L.idx(Math.round(this.s/L.ds));let v=1e9;for(let j=0;j<=ahead;j++){const i=L.idx(i0+j);if(!L.closed&&i0+j>L.n-1)break;v=Math.min(v,this.sp[i]);}return v;}
  /* one frame: work out the inputs (others: the other cars' drivers or {car, prog, lat}) */
  drive(dt,others){
    const t=this.car,L=this.line,inp=this.inp,v=Math.max(0,t.vf);this.track();
    if(!this.go){inp.steer=0;inp.thr=0;inp.brk=1;inp.hb=0;return inp;}
    if(this.goT<this.react){this.goT+=dt;inp.brk=1;inp.thr=0;return inp;}
    if(this.done){/* past the flag: slow down and pull off to the side */
      const s=this.s+Math.max(8,v*.7),[tx,tz]=L.at(s,Math.min(L.wMax,4));inp.steer=this._aim(tx,tz);inp.thr=0;inp.brk=v>8?.35:v>.5?.15:1;inp.hb=0;return inp;}
    /* round the others: a slower car just ahead pulls this one out to pass, on the side with more room; a car
       alongside pushes it over; and with nowhere to go it holds station behind */
    let want=this.bias,vCap=1e9;const [lo,hi]=L.room(this.s,this.half);
    for(const o of others){if(o===this||!o.car)continue;let ds=o.prog-this.prog;
      if(L.closed){const H=L.len/2;while(ds>H)ds-=L.len;while(ds<-H)ds+=L.len;}
      const dl=o.lat-this.lat,ov=Math.abs(dl)<this.half+o.half+.7;
      if(ds>0&&ds<Math.max(14,v*1.3)){const close=Math.max(0,o.car.vf)<v-.5||ds<7;
        if(ov&&close){const side=o.lat-lo>hi-o.lat?-1:1,gap=this.half+o.half+1.2,
            tgt=side<0?Math.max(lo,o.lat-gap):Math.min(hi,o.lat+gap);
          if(Math.abs(tgt-o.lat)<gap-.6)vCap=Math.min(vCap,Math.max(0,o.car.vf)-.3+ds*.25);else want=tgt;}}
      else if(ds>-6&&ds<=0&&Math.abs(dl)<this.half+o.half+1){want+=dl>0?-1.2:1.2;}}
    want=Math.max(lo,Math.min(hi,want));this.want+=(want-this.want)*Math.min(1,dt*2.2);
    /* steer at a point down the line */
    const La=Math.max(5,Math.min(40,3+v*.55)),[tx,tz]=L.at(this.s+La,this.want);
    inp.steer=this._aim(tx,tz);
    /* gas and brake for the speed it wants */
    const ahead=Math.max(1,Math.round((v*.35+2)/L.ds)),vt=Math.min(vCap,this.target(ahead)),err=vt-v;
    if(err>0){inp.brk=0;inp.thr=Math.min(1,.25+err*.35);}
    else if(err>-1.2){inp.brk=0;inp.thr=Math.max(0,.2+err*.15);}
    else{inp.thr=0;inp.brk=Math.min(1,-err*.22);}
    /* in a fast turn, gently on the gas (the tyres are busy turning); sliding: off it */
    const kNow=L.k[L.idx(Math.round(this.s/L.ds))],aDem=Math.abs(kNow)*v*v,aCap=AI_G*(t.tyre.mu||1.1)*this.gs;
    if(aDem>aCap*.6)inp.thr=Math.min(inp.thr,Math.max(.25,1.6-1.6*aDem/aCap));
    if(Math.abs(t.beta)>.25&&v>6)inp.thr*=Math.max(.15,1-(Math.abs(t.beta)-.25)*4);
    /* learning the grip: in a turn, heading for the outside edge (where it will be in a second, drifting out the way
       it is) takes it down and brakes; well inside it at speed puts it back up */
    {const i=L.idx(Math.round(this.s/L.ds)),lv=this.latPrev===undefined?0:(this.lat-this.latPrev)/Math.max(dt,1e-3);this.latPrev=this.lat;this.latV=(this.latV||0)+(lv-(this.latV||0))*Math.min(1,dt*6);
      if(Math.abs(kNow)>1/600&&v>8){const so=kNow>0?-1:1,out=(this.lat+L.off[i])*so,room=L.hwA[i]-this.half-out,roomP=room-Math.max(0,this.latV*so)*.9;
        if(roomP<.5){this.gs=Math.max(.5,this.gs-dt*.05*(1.5-roomP));if(roomP<0){inp.thr=0;inp.brk=Math.max(inp.brk,Math.min(.7,-roomP*.25));}}
        else if(room>1.2&&v>vt-1.5)this.gs=Math.min(1.12,this.gs+dt*.006);}}
    if(Math.abs(t.beta)>.55&&v>5){if(this.spinT<=0)this.gs=Math.max(.45,this.gs-.04);this.spinT=1;}else this.spinT-=dt;
    if(Math.abs(this.gs-this.gsPlan)>.02){this.gsPlan=this.gs;this.sp=L.plan(t,this.skill*this.gs*this.effort);}
    if(this.thrCap<1)inp.thr=Math.min(inp.thr,this.thrCap);
    inp.hb=0;inp.nos=false;
    /* in trouble: stuck, upside down, or a long way off the course */
    if(v<1&&inp.thr>.2)this.stuckT+=dt;else this.stuckT=Math.max(0,this.stuckT-dt*2);
    if(t.M[4]<.35)this.flipT+=dt;else this.flipT=0;
    if(this.dist>L.hwAt(this.i)+14)this.offT+=dt;else this.offT=0;
    /* facing back the way it came */
    {const i=L.idx(Math.round(this.s/L.ds)),j=L.idx(i+1),dx=L.x[j]-L.x[i],dz=L.z[j]-L.z[i],fw=(t.M[0]*dx+t.M[6]*dz)/(Math.hypot(dx,dz)||1);if(fw<-.2)this.wrongT+=dt;else this.wrongT=0;}
    if(this.stuckT>3||this.flipT>2.2||this.offT>5||this.wrongT>2.5)this.resetReq=true;
    return inp;
  }
  /* how hard it tries: 1 flat out; .9 about nine-tenths in the corners and seven-tenths of the throttle */
  setEffort(e){e=Math.max(.5,Math.min(1,e));if(e===this.effort)return;this.effort=e;this.thrCap=e>=1?1:Math.max(.4,1-(1-e)*3);this.sp=this.line.plan(this.car,this.skill*this.gs*this.effort);}
  /* the steering for a point: the arc that reaches it, as a share of what the steering can do at this speed */
  _aim(tx,tz){const t=this.car,c=t.c,dx=tx-t.p[0],dz=tz-t.p[2],L2=dx*dx+dz*dz,side=dx*t.M[2]+dz*t.M[8],k=2*side/Math.max(L2,1),ang=Math.atan(c.wb*k),
    lim=Math.min(c.lock,t.tyre.aPk*1.6+c.wb*9/Math.max(t.speed*t.speed,1));return Math.max(-1,Math.min(1,ang/lim));}
  /* put the car back on the line where it was, pointing down it, stopped */
  resetPose(back=0){const L=this.line,s=Math.max(0,this.s-back),[x,z]=L.at(s,0),[x2,z2]=L.at(s+3,0);this.stuckT=this.offT=this.flipT=0;this.resetReq=false;
    this.wrongT=0;return [x,z,Math.atan2(-(z2-z),x2-x)];}
}
/* ---------- the cars touching: each one's hull against the others' boxes ---------- */
const CC={P:F3(),l:F3(),n:F3(),r:F3(),vr:F3(),t1:F3(),t2:F3(),J:F3(),x:F3(),y:F3()};
function carContacts(cars){
  for(let a=0;a<cars.length;a++)for(let b=a+1;b<cars.length;b++){const A=cars[a],B=cars[b],dx=B.p[0]-A.p[0],dz=B.p[2]-A.p[2],dy=B.p[1]-A.p[1],r=(A.c.body.L+B.c.body.L)/2+.4;
    if(dx*dx+dz*dz>r*r||Math.abs(dy)>3)continue;_hullInto(A,B);_hullInto(B,A);}
}
/* A's hull points that are inside B's body box: pushed out the way that's shortest, with an impulse on both */
function _hullInto(A,B){
  const M=B.M,L=B.c.body.L/2-.04,Wd=B.c.body.W/2-.02,y0=-B.c.hcg+.08,y1=-B.c.hcg+B.c.body.H,{P,l,n}=CC;
  for(const hp of A.hull){
    P[0]=A.p[0]+A.M[0]*hp[0]+A.M[1]*hp[1]+A.M[2]*hp[2];P[1]=A.p[1]+A.M[3]*hp[0]+A.M[4]*hp[1]+A.M[5]*hp[2];P[2]=A.p[2]+A.M[6]*hp[0]+A.M[7]*hp[1]+A.M[8]*hp[2];
    const rx=P[0]-B.p[0],ry=P[1]-B.p[1],rz=P[2]-B.p[2];l[0]=M[0]*rx+M[3]*ry+M[6]*rz;l[1]=M[1]*rx+M[4]*ry+M[7]*rz;l[2]=M[2]*rx+M[5]*ry+M[8]*rz;
    if(l[1]<y0||l[1]>y1)continue;const px=L-Math.abs(l[0]),pz=Wd-Math.abs(l[2]);if(px<=0||pz<=0)continue;
    /* out through the nearer side or end, in B's frame, into the world */
    let lx=0,lz=0,pen;if(pz<px){lz=Math.sign(l[2])||1;pen=pz;}else{lx=Math.sign(l[0])||1;pen=px;}
    n[0]=M[0]*lx+M[2]*lz;n[1]=0;n[2]=M[6]*lx+M[8]*lz;const nl=Math.hypot(n[0],n[2])||1;n[0]/=nl;n[2]/=nl;
    _pairImpulse(A,B,P,n);
    /* and apart, by their weights */
    const k=Math.min(pen,.12),wa=B.m/(A.m+B.m),wb=1-wa;A.p[0]+=n[0]*k*wa;A.p[2]+=n[2]*k*wa;B.p[0]-=n[0]*k*wb;B.p[2]-=n[2]*k*wb;
  }
}
function _pairImpulse(A,B,P,n){
  const {r,vr,t1,t2,J,x,y}=CC,ra=[P[0]-A.p[0],P[1]-A.p[1],P[2]-A.p[2]],rb=[P[0]-B.p[0],P[1]-B.p[1],P[2]-B.p[2]];
  const vel=(C,rr,o)=>{v3cross(o,C.w,rr);o[0]+=C.v[0];o[1]+=C.v[1];o[2]+=C.v[2];return o;};
  vel(A,ra,t1);vel(B,rb,t2);vr[0]=t1[0]-t2[0];vr[1]=t1[1]-t2[1];vr[2]=t1[2]-t2[2];
  const vn=v3dot(vr,n);if(vn>=0)return;
  const ang=(C,rr,d)=>v3dot(d,v3cross(x,C.invI(x,C.M,v3cross(y,rr,d)),rr)),K=1/A.m+1/B.m+ang(A,ra,n)+ang(B,rb,n),j=-(1+.15)*vn/K;
  J[0]=n[0]*j;J[1]=n[1]*j;J[2]=n[2]*j;
  /* rubbing: some friction along the touch */
  const vt0=vr[0]-n[0]*vn,vt1=vr[1]-n[1]*vn,vt2=vr[2]-n[2]*vn,vtl=Math.hypot(vt0,vt1,vt2);
  if(vtl>1e-3){const td=[vt0/vtl,vt1/vtl,vt2/vtl],Kt=1/A.m+1/B.m+ang(A,ra,td)+ang(B,rb,td),jt=Math.min(.35*j,vtl/Kt);J[0]-=td[0]*jt;J[1]-=td[1]*jt;J[2]-=td[2]*jt;}
  const push=(C,rr,s)=>{for(let q=0;q<3;q++)C.v[q]+=s*J[q]/C.m;const Jt=[J[0]*s,J[1]*s,J[2]*s],dw=C.invI(r,C.M,v3cross(y,rr,Jt));for(let q=0;q<3;q++)C.w[q]+=dw[q];};
  push(A,ra,1);push(B,rb,-1);
  A.ev.wall=Math.max(A.ev.wall,-vn);B.ev.wall=Math.max(B.ev.wall,-vn);A.ev.car=(A.ev.car||0)+1;B.ev.car=(B.ev.car||0)+1;
}
