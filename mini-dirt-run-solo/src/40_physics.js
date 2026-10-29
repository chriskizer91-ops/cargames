/* =====================================================================================
   THE PHYSICS. Dirt Sleeper Mini 4's (Shiftlight 3's car physics with Dirt Sleeper's off-road changes:
   rolling resistance as wheel torque, mud and water drag, the tyre-circle ground contact, line lock,
   lockers, low range, a torque converter, brake traction control), rewritten to make no garbage.
   The old code made a new array for every vector it touched, 240 times a second; with a grid of cars
   on a phone that keeps the garbage collector busy enough to stutter. Here every vector is made once
   and every operation writes into one it is given. The sums are the same sums in the same order, so
   the cars drive exactly as they do in Dirt Sleeper Mini 4 (tools/physcheck.js steps both side by side).
   Vectors are 3-arrays, quaternions [x,y,z,w], matrices row-major 3x3. Body axes: +x forward, +y up,
   +z right.
   ===================================================================================== */
const G=9.81,RHO=1.2;
const F3=()=>new Float64Array(3);
const v3dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const v3cross=(o,a,b)=>{const x=a[1]*b[2]-a[2]*b[1],y=a[2]*b[0]-a[0]*b[2],z=a[0]*b[1]-a[1]*b[0];o[0]=x;o[1]=y;o[2]=z;return o;};
const v3norm=(o,a)=>{const l=Math.hypot(a[0],a[1],a[2])||1;o[0]=a[0]/l;o[1]=a[1]/l;o[2]=a[2]/l;return o;};
/* m v and m^T v */
const m3v=(o,m,x,y,z)=>{o[0]=m[0]*x+m[1]*y+m[2]*z;o[1]=m[3]*x+m[4]*y+m[5]*z;o[2]=m[6]*x+m[7]*y+m[8]*z;return o;};
const m3tv=(o,m,x,y,z)=>{o[0]=m[0]*x+m[3]*y+m[6]*z;o[1]=m[1]*x+m[4]*y+m[7]*z;o[2]=m[2]*x+m[5]*y+m[8]*z;return o;};
function qToM(m,q){
  const x=q[0],y=q[1],z=q[2],w=q[3];
  m[0]=1-2*(y*y+z*z);m[1]=2*(x*y-z*w);m[2]=2*(x*z+y*w);
  m[3]=2*(x*y+z*w);m[4]=1-2*(x*x+z*z);m[5]=2*(y*z-x*w);
  m[6]=2*(x*z-y*w);m[7]=2*(y*z+x*w);m[8]=1-2*(x*x+y*y);return m;
}
/* turn q by the angular velocity w for dt, in place */
function qStep(q,w,dt){
  const a0=w[0]*dt*.5,a1=w[1]*dt*.5,a2=w[2]*dt*.5,b0=q[0],b1=q[1],b2=q[2],b3=q[3];
  const x=b0+(a0*b3+a1*b2-a2*b1),y=b1+(-a0*b2+a1*b3+a2*b0),z=b2+(a0*b1-a1*b0+a2*b3),w2=b3+(-a0*b0-a1*b1-a2*b2),l=Math.hypot(x,y,z,w2)||1;
  q[0]=x/l;q[1]=y/l;q[2]=z/l;q[3]=w2/l;return q;
}
function qFromAxis(q,ax,ang){const s=Math.sin(ang/2),l=Math.hypot(ax[0],ax[1],ax[2])||1;q[0]=ax[0]/l*s;q[1]=ax[1]/l*s;q[2]=ax[2]/l*s;q[3]=Math.cos(ang/2);return q;}

/* ---------- the tyre: one combined-slip curve rising to a peak and falling away to a sliding plateau,
   with load sensitivity. Returns the forces and the stiffness the wheel solver needs ---------- */
const TYRE_DEFAULT={mu:1.1,kPk:.11,aPk:.15,slide:.78,slideW:.55,loadSens:.12,fz0:3600};
function tyreForce(t,Fz,kap,tanA,muMul,out){
  if(Fz<=0){out.fx=0;out.fy=0;out.dk=0;out.sg=0;return out;}
  const lf=Math.max(.6,1-t.loadSens*(Fz/t.fz0-1)),m=t.mu*muMul*lf*Fz,sx=kap/t.kPk,sy=tanA/Math.tan(t.aPk),sg=Math.hypot(sx,sy);
  out.sg=sg;
  if(sg<1e-6){out.fx=2*m*sx;out.fy=-2*m*sy;out.dk=2*m/t.kPk;return out;}
  let f2,fp;
  if(sg<1){f2=sg*(2-sg);fp=2-2*sg;}
  else{const u=(sg-1)/t.slideW,q=1+u*u;f2=t.slide+(1-t.slide)/q;fp=-(1-t.slide)*2*u/(t.slideW*q*q);}
  const cx=sx/sg,cy=sy/sg;
  out.fx=m*f2*cx;out.fy=-m*f2*cy;out.dk=Math.max(0,m*(fp*cx*cx+f2/sg*cy*cy)/t.kPk);return out;
}

/* ---------- the powertrain: engine, clutch or torque converter, gearbox, diffs ---------- */
/* the shift points where the next gear pulls harder, for the automatic, the shift lights and the shift grade */
function optimalShifts(e){
  const out=[],wot=r=>SIM.engTq(e,r,1,SIM.steadyBoost(e,r));
  for(let g=0;g<e.nG;g++){
    if(g===e.nG-1){out.push(e.limiterRpm-150);break;}
    const r1=e.gears[g],r2=e.gears[g+1];let best=e.limiterRpm-150;
    for(let rpm=e.redline*.5;rpm<e.limiterRpm-100;rpm+=25)if(wot(rpm*r2/r1)*r2>wot(rpm)*r1){best=rpm;break;}
    out.push(Math.min(best,e.limiterRpm-150));
  }
  return out;
}
const DRV_RWD=[2,3],DRV_FWD=[0,1],DRV_AWD=[0,1,2,3],CAM_LOPE4=[0,.012,.032,.065];
class Powertrain{
  /* e: a Digital Engine spec. o: {drive 'RWD'|'FWD'|'AWD', clutch (N m), engage (s), diff {pre,acc,dec,...}, and the driven
     wheels' Iw, R and tyre mu}. Each wheel carries its own R and Iw for when it rolls free */
  constructor(e,o){
    this.e=e;this.o=o;this.drv=o.drive==='FWD'?DRV_FWD:o.drive==='AWD'?DRV_AWD:DRV_RWD;this.drvAll=this.drv;this.upRpm=optimalShifts(e);
    this.st='off';this.t=0;this.we=0;this.rpm=0;this.gear=1;this.shiftT=0;this.shiftTo=1;this.engage=0;this.locked=false;this.boost=0;
    this.nos=e.nosKw?1:0;this.nosOn=false;this.cutT=0;this.cutFrac=0;this.thr=0;this.thrSnd=0;this.load=0;this.thrPrev=0;
    this.launching=false;this.launchW=0;this.launchT=0;this.hold=false;this.rev=false;this.revT=0;this.twostep=false;this.tcMul=1;this.tcOn=false;this.etcOn=false;
    this.sinceShift=1;this.shiftGrade=null;this.events=[];this.lopeT=0;this.rpmOut=0;this.Te=0;this.Tdrv=0;this.tcCap=1e9;this.lo=1;this.auto=true;this.partShift=false;this.dslip=0;
    this.snd={};
    /* the gear the automatic pulls away in: first, or a working gear on a box with crawler gears (the semi, the tractor) */
    this.g0=e.startG||1;
  }
  get running(){return this.st==='run'||this.st==='catch';}
  start(){if(this.st==='off'||this.st==='stopping'){this.st='crank';this.t=0;}}
  stop(){if(this.st!=='off')this.st='stopping';}
  shift(dir){
    const e=this.e;if(this.shiftT>0||this.rev||!this.running)return false;
    const to=this.gear+dir;if(to<1||to>e.nG)return false;
    this.shiftTo=to;this.shiftT=e.shiftT;this.engage=0;this.locked=false;this.sinceShift=0;
    if(dir>0){const opt=this.upRpm[this.gear-1],err=this.rpm-opt;
      this.shiftGrade=Math.abs(err)<180?'PERFECT':Math.abs(err)<450?'GOOD':err<0?'EARLY':'LATE';
      if(e.seq&&this.thr>.6)this.events.push({type:'shift'});}
    else this.shiftGrade=null;
    return true;
  }
  /* the automatic gearbox, driven from the same optimal shift points */
  autoShift(brk,air,holdGear=false){
    const e=this.e;
    /* the race game's box (partShift), stopped or crawling with the clutch out in a high gear: into first, as a
       driver would at the lights (without this a car that came to rest in third had to pull away in third) */
    if(this.partShift&&this.gear!==this.g0&&!this.locked&&this.engage<.95&&Math.abs(this.vW||0)<Math.min(2,1.2*e.idle*TAU/60/(e.gears[this.g0-1]*e.fd*(this.lo||1))*this.o.R)&&this.shiftT<=0&&!this.rev&&this.running&&!this.hold){this.gear=this.g0;this.sinceShift=0;return;}
    if(this.shiftT>0||this.rev||air||this.sinceShift<.3||this.engage<.95||!this.running)return;
    if(this.partShift)return this._autoShift2(brk,holdGear);
    const g=this.gear,rpm=this.rpm;
    if(this.locked&&g<e.nG&&(!holdGear&&rpm>this.upRpm[g-1]||rpm>e.limiterRpm-80)&&this.thr>.3){this.shift(1);return;}
    if(g>this.g0&&(!holdGear||rpm<e.idle*1.6)){const after=rpm*e.gears[g-2]/e.gears[g-1];
      if(after<this.upRpm[g-2]*.88&&(rpm<e.redline*.5||brk>.3&&after<e.redline*.86)&&this.sinceShift>.45)this.shift(-1);}
  }
  /* the race game's automatic (partShift): it upshifts early at light throttle and at the optimal point when
     floored, never sits on the limiter, and kicks down when you floor it at low revs. Mini 4's box above
     only shifts up past 30% throttle, which suits a truck that is mostly floored or idling */
  shiftAt(g,thr){const e=this.e,lo=Math.max(e.idle*2.2,e.redline*.42);return lo+(this.upRpm[g-1]-lo)*clamp((thr-.3)/.62,0,1);}
  _autoShift2(brk,holdGear){
    const e=this.e,g=this.gear,rpm=this.rpm,thr=this.thr,top=this.maxG||e.nG;
    /* hold the gear while the wheels are really spinning (the limiter catches the revs) and shift once they hook up;
       with overdrive off (maxG) it holds out of the top gear */
    if(this.locked&&g<top&&!(this.dslip>.5)&&(rpm>e.limiterRpm-80||!holdGear&&thr>.05&&rpm>this.shiftAt(g,thr))){this.shift(1);return;}
    /* never down a gear while the driven wheels spin (it only spins them harder), nor within a second of going
       up one unless the engine is lugging: a box that hunts up and down through wheelspin gets nowhere */
    if(g>this.g0&&!(this.dslip>.2)&&(this.sinceShift>1||rpm<e.idle*1.3)&&(!holdGear||rpm<e.idle*1.6)){
      const after=rpm*e.gears[g-2]/e.gears[g-1],back=this.shiftAt(g-1,thr);
      if(after<back*.9&&after<e.limiterRpm-300&&(rpm<Math.max(e.idle*1.6,back*.55)||thr>.85&&rpm<e.redline*.55||brk>.3&&after<e.redline*.86))this.shift(-1);
    }
  }
  meanW(W){const d=this.drv;let m=0;for(let k=0;k<d.length;k++)m+=W[d[k]].w;return m/d.length;}
  isDrv(i){const d=this.drv;for(let k=0;k<d.length;k++)if(d[k]===i)return true;return false;}
  /* inertia a wheel's brake has to fight (with the engine attached through a locked clutch) */
  effInertia(i,Iw){if(this.locked&&this.isDrv(i)){const gr=this.ratio();return Iw+this.e.Ie*gr*gr/this.drv.length;}return Iw;}
  ratio(){return (this.cvtR||this.e.gears[this.gear-1])*this.e.fd*(this.lo||1)*(this.rev?-1.15:1);}
  /* a belt CVT (the quads, the side-by-side, the golf cart): the ratio slides between its low and high so the
     engine sits near where the throttle asks (just off idle at a crawl, near peak power floored), and the
     clutch engages on the revs like a converter */
  _cvt(dt,W){
    const e=this.e,C=e.cvt;if(!C)return;const wm=Math.abs(this.meanW(W)),k=e.fd*(this.lo||1);
    const tgt=lerp(C.eng,C.top,clamp(this.thr,0,1))*TAU/60,want=wm>.05?tgt/(wm*k):C.lo;
    if(!this.cvtR)this.cvtR=C.lo;
    const r=clamp(want,C.hi,C.lo),rate=(C.lo-C.hi)*(r<this.cvtR?1.4:3.5);
    this.cvtR+=clamp(r-this.cvtR,-rate*dt,rate*dt);
  }
  /* one substep. inp {thr, brk, nos}. W: the four wheels {w, Fx, Kd, Fz, kap}. aid {tc, escThr, fmax, mass} */
  step(dt,inp,W,aid){
    const e=this.e,o=this.o,R=o.R,Iw=o.Iw,drv=this.drv,idleW=e.idle*TAU/60;
    this.t+=dt;this.lopeT+=dt;this.sinceShift+=dt;this.twostep=false;this.cutFrac=0;this.tcOn=false;this.etcOn=false;
    let thrIn=clamp(inp.thr,0,1);
    if(this.st==='off'){this.we=0;this.rpm=0;this.load=0;this.engage=0;this.locked=false;this._free(W,dt);this._out();return;}
    if(this.st==='crank'){this.we=(235+70*Math.sin(this.t*38))*TAU/60;this.rpm=this.we*60/TAU;if(this.t>.8){this.st='catch';this.t=0;}this._free(W,dt);this._out();return;}
    if(this.st==='catch'){const t=this.t;
      this.we=idleW*(1+.95*Math.sin(Math.min(1,t/.22)*Math.PI/2)*Math.exp(-Math.max(0,t-.22)*2.6));this.load=t<.22?.6:0;
      if(t>1.1)this.st='run';this.rpm=this.we*60/TAU;this._free(W,dt);this._out();return;}
    if(this.st==='stopping')thrIn=0;
    const vW=this.meanW(W)*R;this.vW=vW;
    this.thr+=(thrIn-this.thr)*Math.min(1,dt*(thrIn>this.thr?9:14)*e.resp);
    if(e.cvt)this._cvt(dt,W);
    let thrE=this.thr,thrSnd=this.thr;const rpm=this.we*60/TAU;
    this.rpm=rpm;
    let dslip=0;for(let k=0;k<drv.length;k++)dslip=Math.max(dslip,W[drv[k]].kap);this.dslip=dslip;
    const vAbs=Math.abs(vW);
    /* traction control: a torque cap from the grip the driven tyres have, and a multiplier that backs off while they spin */
    this.tcCap=1e9;
    if(aid.tc&&!this.rev&&this.locked&&aid.fmax>0){const gr2=Math.abs(this.ratio());this.tcCap=aid.fmax*.95*R/(gr2*.88)*(1+e.Ie*gr2*gr2/(aid.mass*R*R));}
    if(aid.tc&&vAbs>.3&&!this.rev){const err=dslip-.13;if(err>0)this.tcMul-=Math.min(err,1)*dt*14;else this.tcMul+=dt*2.5;this.tcMul=clamp(this.tcMul,.3,1);}
    else this.tcMul=1;
    if(aid.escThr<1)thrE*=aid.escThr;
    /* the two-step holds the launch revs against the trans-brake */
    if(this.hold&&e.launch&&rpm>e.launchRpm){thrE=0;this.cutFrac=.75;this.twostep=this.thr>.4;}
    if(e.turbo){const spool=sstep(e.s0,e.s1,rpm),tgt=thrSnd>.15?e.fiBoost*spool*(.35+.65*thrSnd):e.antilag&&this.running?e.fiBoost*.75*sstep(e.s0*.7,e.s1,rpm):0;
      if(this.boost>.35&&this.thrPrev>.6&&thrIn<.2&&!e.antilag&&e.bov!=='none')this.events.push({type:'bov',flutter:e.bov==='flutter'});
      this.boost+=(tgt-this.boost)*Math.min(1,dt*(tgt>this.boost?(.5+1.5*rpm/e.redline)/e.lag:6));}
    else this.boost=SIM.steadyBoost(e,rpm)*(thrSnd>.05?1:.2);
    this.thrPrev=thrIn;
    const shifting=this.shiftT>0;let thrEng=thrE;
    if(shifting){
      if(this.shiftTo>this.gear){if(e.seq&&this.thr>.7){thrEng=0;this.cutFrac=1;}else{thrEng=0;thrSnd=0;}}
      else{const tgtW=e.gears[this.shiftTo-1]*e.fd*this.meanW(W);thrEng=clamp((tgtW-this.we)*.02,0,1);thrSnd=thrEng;}
    }
    /* pulling away: the engine is held near its launch speed while the clutch (or converter) slips */
    const grL=this.ratio(),wmL=this.meanW(W),launchRpm=Math.max(Math.min(e.redline*.55,4600),e.turbo?e.s0*1.1:0),
      wHold=this.launchW||lerp(idleW*1.3,launchRpm*TAU/60,clamp(this.thr,0,1)),wTgt=Math.max(Math.abs(grL*wmL),wHold*(e.conv?1:Math.max(.72,1-.3*this.launchT)));
    if(this.launching&&!shifting&&!this.hold&&this.we>wTgt+15)thrEng*=clamp(1-(this.we-wTgt-15)/90,0,1);
    if(!shifting&&!this.locked&&!this.launching&&this.engage<1)thrEng*=this.engage*this.engage;
    if(this.cutT>0){this.cutT-=dt;thrEng=0;this.cutFrac=1;}
    if(rpm>e.limiterRpm){
      if(e.limiter==='soft'){const k=clamp(1-(rpm-e.limiterRpm)/150,0,1);thrEng*=k;this.cutFrac=Math.max(this.cutFrac,1-k);}
      else{this.cutT=clamp(48/e.cyl*60/rpm,.025,.07);thrEng=0;this.cutFrac=1;}
    }
    let Te=SIM.engTq(e,Math.max(rpm,1),thrEng,this.boost);
    if(Te>0&&(this.tcMul<1||Te>this.tcCap)){const Tr=Te;
      Te=Math.min(Te*clamp(this.tcMul-3*Math.max(0,dslip-.13),.15,1),this.tcCap);
      const k=Te/Tr;if(k<.97){this.tcOn=true;this.cutFrac=Math.max(this.cutFrac,(1-k)*.9);}}
    this.nosOn=false;
    if(inp.nos&&e.nosKw&&this.nos>0&&this.thr>.5&&!shifting&&!this.hold&&this.running&&this.cutFrac<.5){
      this.nosOn=true;this.nos=Math.max(0,this.nos-dt/e.nosT);Te+=Math.min(e.nosKw*1e3/Math.max(this.we,150),e.tq*1.6);}
    if(this.st==='run'&&this.we<idleW)Te+=(idleW-this.we)*e.Ie*25;
    /* the jake brake (the semi): off the throttle it opens the exhaust valves at the top of each stroke and holds the truck back */
    this.jakeOn=!!(this.jake&&e.jake&&this.running&&thrEng<.03&&rpm>e.idle*1.4&&!shifting);
    if(this.jakeOn)Te-=e.tq*.55*clamp((rpm-e.idle*1.4)/(e.idle*.6),0,1);
    const TeS=SIM.engTq(e,Math.max(rpm,1),thrSnd,this.boost);
    this.load=this.st==='run'?clamp(thrSnd*(TeS>0?1:0)*(.42+.58*Math.min(1,TeS/e.tq)),0,1):0;this.Te=Te;
    if(shifting){this.shiftT-=dt;if(this.shiftT<=0){this.gear=this.shiftTo;this.shiftT=0;}}
    const gr=this.ratio(),wm=this.meanW(W);
    /* also pull away like a converter when the wheels crawl or roll back against the gear (a hill start) */
    if(!this.locked&&!shifting&&gr*wm<idleW*1.3&&(Math.abs(gr*wm)<idleW*1.3&&this.engage<.5||this.thr>.2&&gr*wm<idleW*.7))this.launching=true;
    if(this.launching)this.launchT+=dt;else this.launchT=0;
    const slowForGear=this.launching&&gr*wm<wTgt*.98;let fzD=0;
    for(let k=0;k<drv.length;k++)fzD+=W[drv[k]].Fz;
    const tracCap=Math.abs(gr)>0?(aid.fmax||fzD*o.mu)*(aid.tc?.9:1.3)*R/(Math.abs(gr)*.88):1e9;let engT=1;
    if(shifting||this.hold||!this.running||Math.abs(gr*wm)<idleW*1.1&&this.thr<.05)engT=0;
    const er=engT>this.engage?dt/Math.max(.02,o.engage*(this.launchW?.25:this.launching?1:.55)):dt*12;
    this.engage=clamp(this.engage+clamp(engT-this.engage,-er,er),0,1);
    const cap=o.clutch*this.engage,n=drv.length;let Fsum=0,Ksum=0;
    for(let k=0;k<n;k++){Fsum+=W[drv[k]].Fx;Ksum+=W[drv[k]].Kd;}
    let Tdrv=0;
    if(this.locked&&this.engage>.98&&!shifting){
      /* clutch locked: engine and driven wheels turn as one, solved implicitly against the tyres' stiffness */
      const Itot=e.Ie*gr*gr+n*Iw,tau=Te*gr*.88-R*Fsum,dwm=dt*tau/(Itot+dt*R*Ksum),Tcl=Te-e.Ie*gr*dwm/dt;
      if(Math.abs(Tcl)>o.clutch*1.02)this.locked=false;
      else{for(let k=0;k<n;k++)W[drv[k]].w+=dwm;this.we=gr*(wm+dwm);Tdrv=Tcl*gr*.88;}
    }else this.locked=false;
    if(!this.locked){
      const slipW=this.we-gr*wm;let Tc;
      /* an automatic's torque converter multiplies the engine's torque while it slips (about 2x at stall) */
      const TR=e.conv&&slowForGear&&!shifting?1+clamp(1-gr*wm/Math.max(this.we,1),0,1):1;
      if(gr===0||cap<=0)Tc=0;
      else if(slowForGear&&!shifting)Tc=clamp(Te*TR+30*e.Ie*(this.we-wTgt),0,Math.min(cap*TR,tracCap));
      else{Tc=cap*clamp(slipW/10,-1,1);const fl=idleW*1.15;if(Tc>0&&this.we<fl*1.4)Tc=Math.min(Tc,Math.max(0,Te+30*e.Ie*(this.we-fl)));}
      this.we+=dt*(Te-Tc/TR)/e.Ie;Tdrv=Tc*gr*.88;
      let dwm=dt*(Tdrv-R*Fsum)/(n*Iw+dt*R*Ksum);
      /* never past the point where the clutch grabs: a big reduction on light wheels (the semi in first, the tractor)
         would otherwise fling them past it in one step, and the engine with them */
      if(gr!==0&&Tc!==0){const sync=this.we/gr-wm;if(sync*dwm>0&&Math.abs(dwm)>Math.abs(sync))dwm=sync;}
      for(let k=0;k<n;k++)W[drv[k]].w+=dwm;
      const s2=this.we-gr*(wm+dwm);
      if(gr!==0&&this.engage>.98&&!shifting&&(Math.abs(s2)<5||Math.sign(s2)!==Math.sign(slipW)&&!slowForGear)){this.locked=true;this.we=gr*(wm+dwm);this.launchW=0;this.launching=false;}
    }
    if(this.we<idleW*.6&&this.st!=='stopping')this.we=idleW*.6;
    if(this.st==='stopping'&&this.we<idleW*.35){this.st='off';this.we=0;}
    this.Tdrv=Tdrv;
    const D=o.diff;
    if(n===2){
      /* one driven axle: a limited-slip diff, preload plus a share of the torque through it */
      const i=drv[0],j=drv[1],m=(W[i].w+W[j].w)/2;let Dd=(W[i].w-W[j].w)/2;
      Dd+=dt*(-R*(W[i].Fx-W[j].Fx)/2)/(Iw+dt*R*(W[i].Kd+W[j].Kd)/2);
      const lk=D.pre+(Tdrv>=0?D.acc:D.dec)*Math.abs(Tdrv);
      Dd-=sgn(Dd)*Math.min(Math.abs(Dd),dt*lk/Iw);W[i].w=m+Dd;W[j].w=m-Dd;
    }else{
      /* four-wheel drive: a centre diff and two axle diffs, each with its own lock */
      const m=(W[0].w+W[1].w+W[2].w+W[3].w)/4;let Dc=(W[0].w+W[1].w-(W[2].w+W[3].w))/4,Df=(W[0].w-W[1].w)/2,Dr=(W[2].w-W[3].w)/2;
      const Qc=-R*(W[0].Fx+W[1].Fx-W[2].Fx-W[3].Fx)-Tdrv*.2;
      /* brake traction control: a wheel spinning faster than the one across from it, or one axle faster than
         the other, gets its brake on, so the open diffs send the torque where it can be used */
      const E=D.etc||0;let eC=0,eF=0,eR=0;
      if(E){eC=1400*(E*sstep(.5,2,Math.abs(Dc)*2*R));eF=1700*(E*sstep(.5,2,Math.abs(Df)*2*R));eR=1700*(E*sstep(.5,2,Math.abs(Dr)*2*R));this.etcOn=Math.max(eC,eF,eR)>500;}
      Dc+=dt*Qc/(4*Iw+dt*R*(W[0].Kd+W[1].Kd+W[2].Kd+W[3].Kd));
      /* the e-brake pulled on an all-wheel-drive car: the centre lets go, so the locked rears don't drag the fronts
         to a stop with them and the car turns about its nose, the way a rally car's hydraulic handbrake works
         (with low range in, the centre is locked and the e-brake fights the fronts, as on a real part-time 4x4) */
      const cFree=this.hbFree&&!D.cLock;
      Dc-=sgn(Dc)*Math.min(Math.abs(Dc),dt*(D.cLock?1e6:cFree?20:160+Math.abs(Dc)*80+eC)/(4*Iw));
      Df+=dt*(-R*(W[0].Fx-W[1].Fx))/(2*Iw+dt*R*(W[0].Kd+W[1].Kd));
      Df-=sgn(Df)*Math.min(Math.abs(Df),dt*(D.fLock?1e6:20+.1*Math.abs(Tdrv)+eF)/(2*Iw));
      Dr+=dt*(-R*(W[2].Fx-W[3].Fx))/(2*Iw+dt*R*(W[2].Kd+W[3].Kd));
      const lk=D.rLock?1e6:D.pre+(Tdrv>=0?D.acc:D.dec)*Math.abs(Tdrv)*.6+eR;
      Dr-=sgn(Dr)*Math.min(Math.abs(Dr),dt*lk/(2*Iw));
      W[0].w=m+Dc+Df;W[1].w=m+Dc-Df;W[2].w=m-Dc+Dr;W[3].w=m-Dc-Dr;
    }
    for(let i=0;i<4;i++)if(!this.isDrv(i)){const wh=W[i];wh.w+=dt*(-wh.R*wh.Fx)/(wh.Iw+dt*wh.R*wh.Kd);}
    this.thrSnd=thrSnd;this._out();
  }
  /* engine not driving: every wheel just rolls */
  _free(W,dt){for(let i=0;i<4;i++){const wh=W[i];wh.w+=dt*(-wh.R*wh.Fx)/(wh.Iw+dt*wh.R*wh.Kd);}}
  _sync(W){
    if(this.locked){const idleW=this.e.idle*TAU/60;this.we=this.ratio()*this.meanW(W);if(this.we<idleW*.92){this.locked=false;this.we=Math.max(this.we,idleW*.92);}}
    this.rpm=this.we*60/TAU;
  }
  _out(){
    const e=this.e,w=1-clamp((this.rpm-e.idle)/(e.idle*.9),0,1),lope=CAM_LOPE4[e.cam|0]*1.4+(e.ch.lope||0),
      mod=this.running&&lope?lope*w*(Math.sin(this.lopeT*TAU*1.55)+.6*Math.sin(this.lopeT*TAU*.62+1.3)):0;
    this.rpmOut=this.st==='off'?0:this.rpm*(1+mod);
  }
  /* what the synth needs, written into one object. listener: 0 behind, 1 cabin, 2 trackside; geo {dist, pan, rear} */
  soundParams(listener,speed,geo){
    const e=this.e,p=this.snd;
    p.on=this.st!=='off'&&this.st!=='crank'?1:0;p.firing=this.st==='run'||this.st==='catch'?1:0;p.crank=this.st==='crank'?1:0;p.crankT=this.st==='crank'?this.t:0;
    p.rpm=this.rpmOut;p.load=this.load;p.cutFrac=this.cutFrac;p.boost=this.boost;p.nos=this.nosOn?1:0;p.speed=speed;p.gear=this.gear;
    p.twostep=this.twostep?1:0;p.antilag=e.antilag&&e.turbo&&this.thr<.2&&this.running?1:0;p.view=listener;
    p.dist=geo?geo.dist:listener===1?1.4:3;p.pan=geo?geo.pan:0;p.rear=geo?geo.rear:listener===1?.35:1;p.vol=1;p.jump=geo&&geo.jump?1:0;
    return p;
  }
  takeEvents(){const ev=this.events;this.events=[];return ev;}
}

/* ---------- the car: a rigid body on four suspension rays ---------- */
/* the driving levels. Realistic: ABS and the automatic, nothing else. Middle: a steering helper, stability
   and traction control. Kids: all of that plus extra grip and a hand that keeps the car on its wheels */
const ASSISTS={
  real:{id:'real',name:'Realistic',steer:0,esc:0,tc:0,abs:1,drift:0,auto:1,catchSpin:0},
  middle:{id:'middle',name:'Middle',steer:.75,esc:.85,tc:1,abs:1,drift:0,auto:1,catchSpin:0},
  kids:{id:'kids',name:'Kids',steer:1,esc:1,tc:1,abs:1,drift:0,auto:1,catchSpin:1,plus:{grip:1.15,upright:true}},
  /* Sim: Realistic's helpers (ABS where the car has it, the automatic, the car's own traction control) on the
     world as it is: see 43_sim */
  sim:{id:'sim',name:'Sim',steer:0,esc:0,tc:0,abs:1,drift:0,auto:1,catchSpin:0,sim:true}
};
const SURF_MU={road:1,curb:.95,shoulder:.9,ground:.7};
/* what a world tells a wheel or a hull point: where the ground is, which way it faces, what it is */
const mkHit=()=>({t:0,p:F3(),n:F3(),surf:'',off:0,i:0,lp:0,lh:0,ls:F3(),lsurf:''});
class Vehicle{
  /* c: the chassis (see 42_chassis). spec: its Digital Engine. world: contact(o,down,fwd,R,maxT,hit),
     ground(x,z,out) and wall(P,out). A chassis may give the rear axle its own tyre, radius, inertia and
     surface tables (tyreR, Rr, IwR, surfMuR, surfRRR, surfDragR): a drag car on big slicks and front runners */
  constructor(c,spec,world){
    this.c=c;this.spec=spec;this.world=world;const m=this.m=c.mass||spec.mass;
    const L=c.body.L,Wd=c.body.W,H=c.body.H;
    /* (a Sim roof load adds roll and pitch inertia; nothing on the other levels) */
    this.I=Float64Array.of(m*(Wd*Wd+H*H)/12+(c.simRollI||0),m*(L*L+Wd*Wd)/12*1.05,m*(L*L+H*H)/12+(c.simRollI||0));
    const a=this.a=c.wb*(1-c.wf),b=this.b=c.wb*c.wf,RF=c.R,RR=c.Rr||c.R;
    const s=c.susp,c0F=m*G*c.wf/2/s.kF,c0R=m*G*(1-c.wf)/2/s.kR,hpF=-c.hcg+RF+s.rest-c0F,hpR=-c.hcg+RR+s.rest-c0R;
    this.tyre=Object.assign({},TYRE_DEFAULT,c.tyre,{fz0:m*G/4});
    this.tyreR=c.tyreR?Object.assign({},TYRE_DEFAULT,c.tyreR,{fz0:m*G/4}):this.tyre;
    const tab=(f,k)=>(f?c[k]:c[k+'R']||c[k])||null;
    this.wheels=[[a,hpF,-c.trackF/2,1],[a,hpF,c.trackF/2,1],[-b,hpR,-(c.trackR||c.trackF)/2,0],[-b,hpR,(c.trackR||c.trackF)/2,0]].map(([x,y,z,f],i)=>({
      i,hp:Float64Array.of(x,y,z),front:!!f,left:z<0,k:f?s.kF:s.kR,cb:f?s.cbF:s.cbR,cr:f?s.crF:s.crR,
      R:f?RF:RR,Iw:f?c.Iw:c.IwR||c.Iw,tyre:f?this.tyre:this.tyreR,surfMu:tab(f,'surfMu'),surfRR:tab(f,'surfRR'),surfDrag:tab(f,'surfDrag'),
      w:0,ang:0,steer:0,comp:f?c0F:c0R,len:s.rest,Fz:0,contact:false,cp:F3(),n:Float64Array.of(0,1,0),hpW:F3(),f:Float64Array.of(1,0,0),r:Float64Array.of(0,0,1),
      kap:0,tanA:0,Fx:0,Fy:0,Kd:0,sg:0,slipV:0,vl:0,rr:0,vd:0,surf:'road',off:0,hint:-1,Tb:0,disc:0,temp:.45,escBrake:0,cv:0,bot:0,hit:mkHit(),
      /* Sim: link jacking, side force along the body, sideways speed, the berm being ploughed, brake rotor and
         damper temperatures (C) and what they leave, a tyre off its bead, the grip it is getting, its tyre at pressure */
      jk:0,FyB:0,vt:0,dig:0,bT:30,bF:1,shT:30,shF:1,flat:0,bead:0,muE:1,muG:1,styre:null,psi:34,tread:'',lp:0,lh:0}));
    const drive=spec.drv||'RWD',dw=this.wheels[drive==='FWD'?0:2];
    this.pt=new Powertrain(spec,{drive,clutch:spec.tq*(2.2+spec.fiBoost*.9),engage:.22,diff:c.diff,Iw:dw.Iw,R:dw.R,mu:dw.tyre.mu});
    /* the hull: points that collide with the ground and the walls */
    if(c.hull)this.hull=c.hull.map(h=>Float64Array.from(h));
    else{
      const hx=L/2-.06,hz=Wd/2-.02,yb=-c.hcg+.16,ym=-c.hcg+.55,yt=-c.hcg+H-.04;this.hull=[];
      for(const x of [hx,hx*.45,-hx*.45,-hx])for(const z of [-hz,hz])this.hull.push(Float64Array.of(x,yb,z*(Math.abs(x)>hx*.9?.9:1)),Float64Array.of(x,ym,z));
      for(const x of [hx*.45,-hx*.6])for(const z of [-hz*.78,hz*.78])this.hull.push(Float64Array.of(x,yt,z));
      this.hull.push(Float64Array.of(hx+.04,ym-.05,0),Float64Array.of(-hx-.04,ym,0));
    }
    this.p=F3();this.q=Float64Array.of(0,0,0,1);this.v=F3();this.w=F3();this.M=new Float64Array(9);qToM(this.M,this.q);
    this.steer=0;this.air=true;this.airT=0;this.speed=0;this.vf=0;this.beta=0;this.aid=ASSISTS.real;this.wet=0;
    this.drift={on:false,dir:0,t:0,low:0,bPrev:undefined,bd:0};this.ev={wall:0,land:0,scrape:0,ground:0,gscr:0,gsurf:null,debead:0};
    this.rev=false;this.revT=0;this.escOn=false;this.absOn=false;this.assistTorque=0;this.plus=null;
    /* tune: the developer's handling knobs, shared by every car and each applied to the car's own setup
       ({rear, slide, steer}, 1 is as built); null leaves the car exactly as built */
    this.tune=null;this._slide0=[this.tyre.slide,this.tyreR.slide];
    this.TY={fx:0,fy:0,dk:0,sg:0};this.acc=F3();this.accB=F3();this.thrIn=0;this.brkIn=0;this.sim=null;this._sd=F3();
    /* scratch, so a step makes nothing */
    this._U=F3();this._dn=F3();this._fw=F3();this._t1=F3();this._t2=F3();this._t3=F3();this._F=F3();this._T=F3();this._vb=F3();this._wb=F3();
    this._ptIn={thr:0,brk:0,nos:false};this._aid={tc:false,escThr:1,fmax:0,mass:m};this._g={y:0,n:F3(),surf:''};this._wl={pen:0,n:F3()};
    this._push=F3();this._r=F3();this._vr=F3();this._J=F3();this._x=F3();this._y=F3();
    this.setAssists('real');
  }
  place(p,yaw){
    qFromAxis(this.q,[0,1,0],yaw);qToM(this.M,this.q);this.p[0]=p[0];this.p[1]=p[1]+this.c.hcg;this.p[2]=p[2];this.v.fill(0);this.w.fill(0);
    for(const wh of this.wheels){wh.w=0;wh.dig=0;wh.bT=30;wh.bF=1;wh.shT=30;wh.shF=1;wh.flat=0;wh.bead=0;wh.jk=0;wh.FyB=0;wh.vt=0;}
  }
  /* a tyre's grip on a surface: its tread's grip there, times how much grip the ground is giving (the
     world's grip, surface by surface; none is as tuned) */
  _smu(wh,s){const b=wh.surfMu?wh.surfMu[s]??.8:SURF_MU[s]||1,g=this.world.grip;return g?b*(g[s]??1):b;}
  /* the handling knobs that are set once rather than read every step */
  applyTune(){const T=this.tune,k=T?T.slide:1;this.tyre.slide=Math.min(1,this._slide0[0]*k);if(this.tyreR!==this.tyre)this.tyreR.slide=Math.min(1,this._slide0[1]*k);this.applySim();}
  setAssists(id){this.aid=ASSISTS[id]||ASSISTS.real;this.pt.auto=!!this.aid.auto;this.plus=this.aid.plus||null;
    this.sim=this.aid.sim?this.sim||{}:null;this.applySim();}
  /* the Sim level's settings for this car: tyre pressure, weather, which pieces are on (43_sim) */
  applySim(){
    const S=this.sim;if(!S)return;const C=this.c.sim,D=SIMDEV;
    S.f=D;S.C=C;S.pr=D.press?simVal(SIM_AIR,SIMSET.air):1;S.wet=D.wet?simVal(SIM_WX,SIMSET.wx):0;S.abs=D.abs?C.abs:true;
    for(const wh of this.wheels){wh.styre=simTyre(wh.tyre,S.pr,D.ls);wh.psi=wh.front?C.psiF:C.psiR;wh.tread=wh.front?C.treadF:C.treadR;}
  }
  /* the world-space inverse inertia times x, into o */
  invI(o,M,x){m3tv(o,M,x[0],x[1],x[2]);const I=this.I;return m3v(o,M,o[0]/I[0],o[1]/I[1],o[2]/I[2]);}
  /* apply F at the point at (world) to the force and torque sums */
  _apply(F0,F1,F2,ax,ay,az){
    const Fs=this._F,T=this._T,p=this.p,rx=ax-p[0],ry=ay-p[1],rz=az-p[2];
    Fs[0]+=F0;Fs[1]+=F1;Fs[2]+=F2;T[0]+=ry*F2-rz*F1;T[1]+=rz*F0-rx*F2;T[2]+=rx*F1-ry*F0;
  }
  /* inp: {steer -1..1 (+right), thr 0..1, brk 0..1, hb 0..1, nos, lock} */
  step(dt,inp){
    const c=this.c,s=c.susp,m=this.m,pt=this.pt,aid=this.aid,W=this.wheels,M=qToM(this.M,this.q),p=this.p,v=this.v,w=this.w;
    const U=this._U;U[0]=M[1];U[1]=M[4];U[2]=M[7];
    const vb=m3tv(this._vb,M,v[0],v[1],v[2]),wb=m3tv(this._wb,M,w[0],w[1],w[2]);
    this.speed=Math.hypot(v[0],v[1],v[2]);this.vf=vb[0];this.beta=Math.atan2(vb[2],Math.max(Math.abs(vb[0]),.5));
    let thr=clamp(inp.thr||0,0,1),brk=clamp(inp.brk||0,0,1);const hb=clamp(inp.hb||0,0,1);
    /* reverse: hold the brake at a standstill, then the pedals swap */
    if(!this.rev&&Math.abs(vb[0])<.6&&brk>.5&&thr<.05){this.revT+=dt;if(this.revT>.5&&pt.running){this.rev=true;pt.rev=true;pt.gear=1;pt.shiftT=0;}}
    else if(!this.rev)this.revT=0;
    if(this.rev){if(thr>.1&&vb[0]>-.8){this.rev=false;pt.rev=false;this.revT=0;}else{const t=thr;thr=brk;brk=t;}}
    /* brake and gas together at a standstill: the trans-brake */
    if(!this.rev&&Math.abs(vb[0])<.5&&brk>.5&&thr>.3&&pt.running)pt.hold=true;
    else if(pt.hold){pt.hold=false;if(thr>.3){pt.launchW=pt.we;pt.launching=true;}}
    this.thrIn=thr;this.brkIn=brk;this.steer=this._steer(dt,inp.steer||0,vb,wb);
    /* the springs: each wheel finds the ground under it */
    const dn=this._dn;dn[0]=-U[0];dn[1]=-U[1];dn[2]=-U[2];let nContact=0;
    const fw=this._fw,cs=Math.cos(this.steer),sn=Math.sin(this.steer),S=this.sim;
    for(const wh of W){
      /* (Sim: a tyre off its bead rides on its rim, lower) */
      const R=S?wh.R-wh.flat*.06:wh.R,maxT=s.rest+R+.3,hpW=m3v(wh.hpW,M,wh.hp[0],wh.hp[1],wh.hp[2]);hpW[0]+=p[0];hpW[1]+=p[1];hpW[2]+=p[2];
      if(wh.front&&this.steer)m3v(fw,M,cs,0,sn);else{fw[0]=M[0];fw[1]=M[3];fw[2]=M[6];}
      const hit=wh.hit;let got,comp=-1;
      /* Sim's edge catch: a tyre sliding sideways also feels the ground at its leading shoulder */
      if(S&&S.f.edge&&Math.abs(wh.vt)>.6){const sd=this._sd,k=wh.vt>0?1:-1;sd[0]=M[2]*k;sd[1]=M[5]*k;sd[2]=M[8]*k;
        got=this.world.contact(hpW,dn,fw,R,maxT,hit,sd,(wh.front?c.tyreW:c.tyreWR)*.5);}
      else got=this.world.contact(hpW,dn,fw,R,maxT,hit);
      if(got){wh.hint=hit.i;comp=s.rest-(hit.t-R);}
      if(comp<=0){wh.contact=false;wh.Fz=0;wh.comp=0;wh.len=got?Math.min(s.rest,hit.t-R):s.rest;wh.lp=0;continue;}
      const rate=clamp((comp-wh.comp)/dt,-4,4);
      let sr;
      if(wh.contact)sr=rate;
      else{const rx=hpW[0]-p[0],ry=hpW[1]-p[1],rz=hpW[2]-p[2],vx=v[0]+(w[1]*rz-w[2]*ry),vy=v[1]+(w[2]*rx-w[0]*rz),vz=v[2]+(w[0]*ry-w[1]*rx);
        sr=clamp(-(vx*U[0]+vy*U[1]+vz*U[2]),0,8);}
      /* for the sound: the sharpest compression since the last frame, and whether it hit the bump stops */
      wh.cv=Math.max(wh.cv||0,sr);if(comp>s.travel)wh.bot=Math.max(wh.bot||0,sr);
      wh.comp=comp;wh.len=s.rest-comp;wh.contact=true;nContact++;
      let Fs;
      if(S&&S.f.shocks){
        /* Sim's dampers: firmer at low shaft speed, softer past 0.25 m/s, and fading as they heat */
        const cc=(rate>0?wh.cb:wh.cr)*SIMDEV.damp,a=Math.abs(rate),Fd=(rate<0?-1:1)*cc*(a<.25?1.2*a:.3+.7*(a-.25))*wh.shF;Fs=wh.k*comp+Fd;
        wh.shT+=dt*(Math.abs(Fd*rate)/S.C.shC-(wh.shT-30)*(.006+.0004*this.speed));wh.shF=1-.45*sstep(110,190,wh.shT);
      }else Fs=wh.k*comp+(rate>0?wh.cb:wh.cr)*rate;
      if(comp>s.travel)Fs+=(comp-s.travel)*wh.k*14+Math.max(0,rate)*wh.cb*2;
      wh.Fz=Math.max(0,Fs);wh.cp.set(hit.p);wh.n.set(hit.n);wh.surf=hit.surf;wh.off=hit.off||0;if(S){wh.lp=hit.lp;wh.lh=hit.lh;}
    }
    /* sway bars */
    for(let ax=0;ax<2;ax++){const l=W[ax*2],r=W[ax*2+1],k=(ax?s.arbR:s.arbF)*(S?SIMDEV.arb:1),d=(l.contact?l.comp:0)-(r.contact?r.comp:0),f=k*d;
      if(l.contact)l.Fz=Math.max(0,l.Fz+f);if(r.contact)r.Fz=Math.max(0,r.Fz-f);}
    /* Sim: the links' share of the weight transfer. Each tyre's side force pulls along the line from its contact
       patch to the roll centre, so the outside tyre is pushed down onto the road and the inside one lifted, by
       the side force times the roll centre's height over half the track (last step's side force) */
    if(S&&S.f.jack)for(let ax=0;ax<2;ax++){const k=c.rcH/((ax?c.trackR||c.trackF:c.trackF)/2);
      for(let q=0;q<2;q++){const wh=W[ax*2+q];if(!wh.contact){wh.jk=0;continue;}
        const fz=Math.max(0,wh.Fz+(wh.left?wh.FyB:-wh.FyB)*k);wh.jk=fz-wh.Fz;wh.Fz=fz;}}
    const wasAir=this.air;this.air=nContact===0;
    if(this.air)this.airT+=dt;else{if(wasAir&&this.airT>.15)this.ev.land=Math.max(this.ev.land,-vb[1]);this.airT=0;}
    /* the tyres */
    const P=this.plus,TY=this.TY,wetMu=lerp(1,P?.93:.84,this.wet)*(P?P.grip:1),t1=this._t1,t2=this._t2;
    for(const wh of W){
      if(!wh.contact){wh.Fx=wh.Fy=wh.Kd=wh.kap=wh.sg=wh.slipV=wh.rr=wh.vd=0;wh.tanA=0;if(S){wh.FyB=0;wh.vt=0;}continue;}
      const R=wh.R,st=wh.front?this.steer:0;m3v(t1,M,Math.cos(st),0,Math.sin(st));
      const n=wh.n,fn=v3dot(t1,n);t1[0]-=n[0]*fn;t1[1]-=n[1]*fn;t1[2]-=n[2]*fn;
      const f=v3norm(wh.f,t1),r=v3norm(wh.r,v3cross(t2,f,n));
      const cp=wh.cp,rx=cp[0]-p[0],ry=cp[1]-p[1],rz=cp[2]-p[2],vx=v[0]+(w[1]*rz-w[2]*ry),vy=v[1]+(w[2]*rx-w[0]*rz),vz=v[2]+(w[0]*ry-w[1]*rx);
      const vl=vx*f[0]+vy*f[1]+vz*f[2],vt=vx*r[0]+vy*r[1]+vz*r[2],vn=Math.max(Math.abs(vl),2.5),kap=(wh.w*R-vl)/vn,tanA=vt/vn,
        tg=wh.temp<.62?.92+.08*sstep(.15,.62,wh.temp):wh.temp<.85?1.02:1.02-.15*sstep(.85,1.15,wh.temp);
      if(S){
        /* Sim: grip from the tyre's pressure and the rain, the tyre's own curve at that pressure, rolling and bog
           drag from the pressure, the sidewall rolling under, and a tyre coming off its bead */
        const sf=wh.surf,pr=S.pr;
        wh.muG=this._smu(wh,sf)*simGrip(sf,wh.tread,pr,S.wet,this.speed,wh.psi);
        let mm=wh.muG*tg*(wh.front||!this.tune?1:this.tune.rear)*(wh.flat?.45:1);
        if(pr<.75&&SIM_HARD[sf]){const ru=sstep(.55,.9,Math.abs(wh.Fy)/Math.max(wh.Fz,1))*sstep(.75,.4,pr);mm*=1-.2*ru;
          if(!wh.flat&&pr<.56&&ru>.5&&this.speed>11){wh.bead+=dt*ru*(.6-pr)*5;if(wh.bead>1){wh.flat=1;this.ev.debead=1;}}}
        wh.muE=mm;tyreForce(wh.styre,wh.Fz,kap,tanA,mm,TY);
        wh.Fx=TY.fx;wh.rr=(wh.surfRR?wh.surfRR[sf]??.015:.012)*wh.Fz*simRR(sf,pr)*(wh.flat?4:1);
        wh.vd=(wh.surfDrag?wh.surfDrag[sf]||0:0)*wh.Fz*vl*Math.pow(pr,.6)*(sf==='mud'||sf==='ruts'?1+.5*S.wet:1);wh.Fy=TY.fy;wh.Kd=TY.dk*R/vn;
        /* the soil trip: sliding sideways over loose ground, the tyre ploughs a berm (built over about half a metre
           of sideways travel) that pushes back at the ground, past what its friction could give, and harder the
           faster it comes */
        if(S.f.trip){const P=SIM_PLOW[sf]||0,avt=Math.abs(vt);
          if(P>0||wh.dig>0){const e=P>0?sstep(SIMDEV.pv0,SIMDEV.pv0+4,avt)*sstep(SIMDEV.pa0,SIMDEV.pa0+.45,Math.abs(tanA)):0;wh.dig+=(e-wh.dig)*Math.min(1,dt*Math.max(avt,.3)/.45);
            wh.Fy-=(vt<0?-1:1)*P*SIMDEV.plow*wh.dig*wh.Fz*sstep(.3,1.5,avt)*(1+.025*avt)*(wh.flat?1.5:1);}}
        wh.FyB=wh.Fy*(r[0]*M[2]+r[1]*M[5]+r[2]*M[8]);wh.vt=vt;
      }else{
      tyreForce(wh.tyre,wh.Fz,kap,tanA,this._smu(wh,wh.surf)*wetMu*tg*(wh.front||!this.tune?1:this.tune.rear),TY);
      wh.Fx=TY.fx;wh.rr=(wh.surfRR?wh.surfRR[wh.surf]??.015:.012)*wh.Fz;wh.vd=(wh.surfDrag?wh.surfDrag[wh.surf]||0:0)*wh.Fz*vl;wh.Fy=TY.fy;wh.Kd=TY.dk*R/vn;
      }
      wh.kap=kap;wh.tanA=tanA;wh.sg=TY.sg;wh.vl=vl;wh.slipV=Math.hypot(wh.w*R-vl,vt);
      wh.temp+=dt*(wh.slipV*wh.Fz/(m*G)*.02-(wh.temp-.42)*(.015+this.speed*8e-4));wh.temp=clamp(wh.temp,.2,1.25);
    }
    const escThr=this._stability(dt,inp,vb,wb,thr);let fmax=0;
    for(let k=0;k<pt.drv.length;k++){const wh=W[pt.drv[k]];
      if(wh.contact){const ty=S?wh.styre:wh.tyre,lf=Math.max(.6,1-ty.loadSens*(wh.Fz/ty.fz0-1));fmax+=S?wh.Fz*ty.mu*lf*wh.muG:wh.Fz*ty.mu*lf*wetMu*this._smu(wh,wh.surf);}}
    /* line lock: the fronts are held on the brakes and the drive goes to the rear axle alone */
    pt.drv=inp.lock&&pt.drvAll.length===4?DRV_RWD:pt.drvAll;
    const pin=this._ptIn,pa=this._aid;pin.thr=thr;pin.brk=brk;pin.nos=!!inp.nos;
    /* traction control: the driving level's, or the car's own from the factory (or the race team) */
    pa.tc=(aid.tc||!!c.factoryTC)&&!this.drift.on&&!inp.lock;pa.escThr=inp.lock?1:escThr;pa.fmax=fmax;pa.mass=m;
    pt.step(dt,pin,W,pa);if(pt.auto)pt.autoShift(brk,this.air,this.drift.on);this.absOn=false;
    /* the brakes */
    const hold=this.speed<.4&&thr<.05&&!this.rev&&pt.running;
    for(const wh of W){
      let Tb=brk*c.brake*(wh.front?c.bias:1-c.bias)/2;
      if(inp.lock&&wh.front)Tb=Math.max(Tb,c.brake*.75);
      /* ABS; on the rears it lets them slip far less, so they keep their side grip under braking */
      /* (Sim: a car with ABS also has electronic brake-force distribution, which lets the rears work closer to their
         grip without locking) */
      const abT=wh.front?.1:S&&S.abs?.07:.03;
      /* (Sim: a car without ABS still has a proportioning valve that keeps its rears from locking first; its fronts lock) */
      if(aid.abs&&(!S||S.abs||!wh.front)&&brk>.1&&this.speed>2.5&&wh.kap<-abT){const k=clamp(1-(-wh.kap-abT)*7,.2,1);Tb*=k;if(k<.95&&(!S||S.abs))this.absOn=true;}
      if(!wh.front&&hb>0)Tb+=c.hbTorque*hb;
      /* Sim's brake fade: the rotor heats with the power its brake takes in and cools in the air; past the pads'
         working range the brake gives less */
      if(S&&S.f.fade){Tb*=wh.bF;wh.bT+=dt*(Tb*Math.abs(wh.w)/S.C.Cb[wh.front?0:1]-(wh.bT-25)*(.004+.0003*this.speed));wh.bF=1-.55*sstep(S.C.Tf,S.C.Tf+200,wh.bT);}
      Tb+=wh.escBrake+(wh.rr||0)*wh.R;if(hold||pt.hold)Tb+=1500;
      /* the brake (and rolling drag) goes through the same implicit tyre term as the drive */
      const dw=dt*Tb/(pt.effInertia(wh.i,wh.Iw)+dt*wh.R*(wh.Kd||0));
      if(Math.abs(wh.w)<=dw)wh.w=0;else wh.w-=sgn(wh.w)*dw;
      wh.Tb=Tb;wh.disc=clamp(wh.disc+dt*(Tb*Math.abs(wh.w)/9e4-wh.disc*(.08+this.speed*4e-3)),0,1.2);
    }
    if(hb>.5&&!pt.isDrv(0)){pt.engage=0;pt.locked=false;}
    pt.hbFree=hb>.5;
    pt._sync(W);
    /* forces and torques on the body */
    const Fs=this._F,T=this._T;Fs[0]=0;Fs[1]=-m*G;Fs[2]=0;T[0]=T[1]=T[2]=0;
    for(const wh of W)if(wh.contact){
      const hp=wh.hpW,cp=wh.cp,n=wh.n,f=wh.f,r=wh.r,fz=wh.Fz,fx=wh.Fx-(wh.vd||0),fy=wh.Fy,rc=c.rcH;
      if(S&&S.f.jack){
        /* Sim: the spring at the hub, the links' pull at the axle's middle (it lifts or lowers, it doesn't roll),
           drive and brake at the ground (the full weight transfer front to back), the side force at the roll centre */
        const fs=fz-wh.jk;this._apply(U[0]*fs,U[1]*fs,U[2]*fs,hp[0],hp[1],hp[2]);
        if(wh.jk){const a=m3v(this._t2,M,wh.hp[0],wh.hp[1],0),j=wh.jk;this._apply(U[0]*j,U[1]*j,U[2]*j,a[0]+p[0],a[1]+p[1],a[2]+p[2]);}
        this._apply(f[0]*fx,f[1]*fx,f[2]*fx,cp[0],cp[1],cp[2]);
        this._apply(r[0]*fy,r[1]*fy,r[2]*fy,cp[0]+n[0]*rc,cp[1]+n[1]*rc,cp[2]+n[2]*rc);
      }else{
      this._apply(U[0]*fz,U[1]*fz,U[2]*fz,hp[0],hp[1],hp[2]);
      this._apply(f[0]*fx+r[0]*fy,f[1]*fx+r[1]*fy,f[2]*fx+r[2]*fy,cp[0]+n[0]*rc,cp[1]+n[1]*rc,cp[2]+n[2]*rc);
      }
      /* Sim: a tyre run sideways into a kerb, a rut wall or a ledge: the face stops it (a stiff sidewall and a
         damper), pushing at half the face's height. Enough of a shove trips the car over it. A face of rock or
         concrete doesn't give; a wall of dirt or mud is softer and crumbles past what the soil can bear, so a
         tyre climbs out of a rut instead of tripping on it */
      if(S&&wh.lp>0){const ls=wh.hit.ls,hl=Math.min(wh.lh,.3)*.5,d=(wh.front?c.tyreW:c.tyreWR)*.5-wh.lp,q=this._t2;
        q[0]=cp[0]+ls[0]*d+U[0]*hl;q[1]=cp[1]+ls[1]*d+U[1]*hl;q[2]=cp[2]+ls[2]*d+U[2]*hl;
        const rx=q[0]-p[0],ry=q[1]-p[1],rz=q[2]-p[2],vin=(v[0]+w[1]*rz-w[2]*ry)*ls[0]+(v[1]+w[2]*rx-w[0]*rz)*ls[1]+(v[2]+w[0]*ry-w[1]*rx)*ls[2],
          km=m/2150,pn=wh.lp/((wh.front?c.tyreW:c.tyreWR)*.5),hard=SIM_RIGID[wh.hit.lsurf],
          F=hard?5e5*km*wh.lp*(1+6*pn*pn)+2e4*km*Math.max(0,vin):Math.min(1.4*wh.Fz+3e3*km,1.2e5*km*wh.lp*(1+3*pn*pn)+6e3*km*Math.max(0,vin));
        this._apply(-ls[0]*F,-ls[1]*F,-ls[2]*F,q[0],q[1],q[2]);}
      /* a tyre against a ledge face: the face pushes back as well as up */
      if(wh.off){const nu=v3dot(n,U),k=fz/Math.max(.5,nu)*.6;this._apply((n[0]-U[0]*nu)*k,(n[1]-U[1]*nu)*k,(n[2]-U[2]*nu)*k,cp[0],cp[1],cp[2]);}
    }
    /* drag through the middle (no torque), downforce on each axle */
    const sp=this.speed,dr=.5*RHO*c.cdA*sp;Fs[0]+=-v[0]*dr;Fs[1]+=-v[1]*dr;Fs[2]+=-v[2]*dr;
    const q2=.5*RHO*vb[0]*vb[0],aF=-q2*c.clF,aR=-q2*c.clR;
    this._apply(U[0]*aF,U[1]*aF,U[2]*aF,p[0]+M[0]*this.a,p[1]+M[3]*this.a,p[2]+M[6]*this.a);
    this._apply(U[0]*aR,U[1]*aR,U[2]*aR,p[0]+M[0]*-this.b,p[1]+M[3]*-this.b,p[2]+M[6]*-this.b);
    if(this.assistTorque){T[0]+=U[0]*this.assistTorque;T[1]+=U[1]*this.assistTorque;T[2]+=U[2]*this.assistTorque;}
    /* a rider moving their weight (34_machines): on the ground it is the rider's weight hung off to one side or
       over the bars, a couple about the centre of gravity; in the air, pulling the bars or pushing them pitches the machine */
    const L=this.lean;
    if(L&&c.riderKg){
      if(!this.air){const mg=c.riderKg*G,dz=L.z*c.leanZ,dx=L.x*c.leanX,rx=dz*M[2]+dx*M[0],rz=dz*M[8]+dx*M[6];T[0]+=rz*mg;T[2]-=rx*mg;}
      else{const k=-L.x*c.riderKg/m*24*this.I[2],kr=L.z*c.riderKg/m*10*this.I[0];T[0]+=M[2]*k+M[0]*kr;T[1]+=M[5]*k+M[3]*kr;T[2]+=M[8]*k+M[6]*kr;}
    }
    if(P&&P.upright){
      /* Kids: a hand that rolls the car back onto its wheels, and levels it in the air */
      const Fx=M[0],Fy=M[3],Fz=M[6],Rx=M[2],Ry=M[5],Rz=M[8],ax0=U[1]*0-U[2]*1,ax1=U[2]*0-U[0]*0,ax2=U[0]*1-U[1]*0;
      const roll=ax0*Fx+ax1*Fy+ax2*Fz,pitch=ax0*Rx+ax1*Ry+ax2*Rz,wr=w[0]*Fx+w[1]*Fy+w[2]*Fz,wp=w[0]*Rx+w[1]*Ry+w[2]*Rz,
        ex=Math.sign(roll)*Math.max(0,Math.abs(roll)-.2),tr=(ex*28-wr*(Math.abs(roll)>.2?5:0))*this.I[0],tp=this.air?(pitch*10-wp*3)*this.I[2]:0;
      T[0]+=Fx*tr+Rx*tp;T[1]+=Fy*tr+Ry*tp;T[2]+=Fz*tr+Rz*tp;
    }
    /* integrate */
    const acc=this.acc;for(let k=0;k<3;k++){acc[k]=Fs[k]/m;v[k]+=acc[k]*dt;}
    const tb=m3tv(this._t1,M,T[0],T[1],T[2]),I=this.I,i0=I[0]*wb[0],i1=I[1]*wb[1],i2=I[2]*wb[2],
      g0=wb[1]*i2-wb[2]*i1,g1=wb[2]*i0-wb[0]*i2,g2=wb[0]*i1-wb[1]*i0;
    wb[0]+=dt*(tb[0]-g0)/I[0];wb[1]+=dt*(tb[1]-g1)/I[1];wb[2]+=dt*(tb[2]-g2)/I[2];
    m3v(w,M,wb[0],wb[1],wb[2]);
    for(let k=0;k<3;k++)p[k]+=v[k]*dt;
    qStep(this.q,w,dt);m3tv(this.accB,M,acc[0],acc[1],acc[2]);
    for(const wh of W)wh.ang+=wh.w*dt;
    this._collide(dt);
    if(hold&&this.speed<.2)for(let k=0;k<3;k++){v[k]*=1-Math.min(1,dt*6);w[k]*=1-Math.min(1,dt*6);}
  }
  /* the steering: full lock narrows with speed to about what the front tyres can use, as a driver's hands
     would, with full lock at parking speeds; the helper aims the fronts at their peak slip angle */
  _steer(dt,sIn,vb,wb){
    const c=this.c,aid=this.aid,lock=c.lock,vx=vb[0],v=Math.abs(vx),
      lim=Math.min(lock,this.tyre.aPk*1.6*(this.tune?this.tune.steer:1)+c.wb*9/Math.max(v*v,1)+(sIn*this.beta>0?Math.abs(this.beta):0));
    let tgt=sIn*lim;
    if(aid.steer>0&&vx>1.5){const vzF=vb[2]-wb[1]*this.a,thF=Math.atan2(vzF,Math.max(vx,.5)),aPk=this.tyre.aPk*.92,assist=thF+sIn*aPk*(this.drift.on?1.35:1);
      tgt=lerp(tgt,assist,aid.steer*sstep(1.5,8,vx));}
    tgt=clamp(tgt,-lock,lock);
    const rate=aid.steer>0?5.5:4.2;
    return this.steer+clamp(tgt-this.steer,-rate*dt,rate*dt);
  }
  /* stability control, the drift helper and the spin catcher. Returns a throttle multiplier */
  _stability(dt,inp,vb,wb,thr){
    const aid=this.aid,W=this.wheels,v=vb[0],beta=this.beta,r=wb[1],sIn=inp.steer||0,mu=this.tyre.mu;
    for(const wh of W)wh.escBrake=0;
    this.escOn=false;this.assistTorque=0;
    let mult=1;const Iyaw=this.I[1],D=this.drift;
    if(aid.drift){
      if(!D.on&&v>9&&(inp.hb>.5&&Math.abs(sIn)>.15||!this.plus&&Math.abs(beta)>.22&&thr>.6&&Math.abs(sIn)>.3)){D.on=true;D.dir=-sgn(sIn)||sgn(beta);D.t=0;D.low=0;D.bPrev=undefined;D.bd=0;}
      if(D.on){D.t+=dt;if(Math.abs(beta)<.1||sIn*D.dir>.35)D.low+=dt;else D.low=0;if(D.low>.35||v<6||this.air&&this.airT>.5)D.on=false;}
    }else D.on=false;
    if(D.on){
      const into=Math.max(0,-sIn*D.dir),bT=(.3+.3*into)*D.dir,err=bT-beta,raw=D.bPrev===undefined?0:(beta-D.bPrev)/dt;
      D.bPrev=beta;D.bd=(D.bd||0)+(raw-(D.bd||0))*.25;
      this.assistTorque=clamp((6*err-2.5*D.bd)*Iyaw,-5*Iyaw,5*Iyaw)*Math.min(1,.3+D.t*3);
      return clamp(.55+2.5*err*D.dir,.1,1);
    }
    if(v<4)return 1;
    if(aid.esc>0){
      const rMax=Math.min(mu*G/Math.max(v,1),v*Math.tan(this.c.lock)/this.c.wb),rRef=-sIn*rMax,lim=.07+.22*(1-aid.esc),over=Math.abs(beta)-lim,yawErr=r-rRef;
      if(over>0&&Math.sign(r)===Math.sign(beta)&&Math.abs(r)>.05){
        const k=clamp(over*6,0,1)*aid.esc,front=r>0?W[1]:W[0];front.escBrake=2400*k;this.escOn=true;mult=Math.min(mult,clamp(1-over*4*aid.esc,.15,1));}
      else if(Math.abs(yawErr)>.15&&Math.abs(r)>Math.abs(rRef)+.15&&Math.sign(r)===Math.sign(rRef||r)){
        const k=clamp((Math.abs(r)-Math.abs(rRef)-.15)*2,0,1)*aid.esc,front=r>0?W[1]:W[0];front.escBrake=1500*k;this.escOn=k>.05;}
    }
    if(aid.catchSpin&&Math.abs(beta)>.6&&v>6){const k=clamp((Math.abs(beta)-.6)*2.5,0,1);this.assistTorque=-r*Iyaw*6*k;}
    if(this.plus&&Math.abs(beta)>.3&&v>5&&Math.sign(r)===Math.sign(beta)){const k=clamp((Math.abs(beta)-.3)*3,0,1);this.assistTorque=-r*Iyaw*7*k;mult=Math.min(mult,1-.5*k);}
    return mult;
  }
  /* the hull against walls and the ground: impulses with restitution and friction */
  _collide(dt){
    const M=qToM(this.M,this.q),p=this.p,world=this.world,push=this._push,P=this._x,g=this._g,wl=this._wl;push.fill(0);let pushN=0;
    for(const hp of this.hull){
      m3v(P,M,hp[0],hp[1],hp[2]);P[0]+=p[0];P[1]+=p[1];P[2]+=p[2];
      if(world.wall(P,wl)&&wl.pen>0){this._impulse(M,P,wl.n,this.plus?.04:.18,this.plus?.05:.28,'wall');
        push[0]+=wl.n[0]*wl.pen;push[1]+=wl.n[1]*wl.pen;push[2]+=wl.n[2]*wl.pen;pushN++;}
      world.ground(P[0],P[2],g);const pen=(g.y-P[1])*g.n[1];
      /* (Sim: a roof skids on tarmac and digs into dirt and mud) */
      if(pen>0){this._impulse(M,P,g.n,.05,this.sim&&this.sim.f.body?SIM_BODYMU[g.surf]??.55:.55,'ground');this.ev.gsurf=g.surf;push[0]+=g.n[0]*pen;push[1]+=g.n[1]*pen;push[2]+=g.n[2]*pen;pushN++;}
    }
    if(pushN)for(let k=0;k<3;k++)p[k]+=push[k]/pushN;
  }
  _impulse(M,P,n,e,mu,kind){
    const p=this.p,v=this.v,w=this.w,r=this._r,vr=this._vr,J=this._J,x=this._y,y=this._t3;
    r[0]=P[0]-p[0];r[1]=P[1]-p[1];r[2]=P[2]-p[2];
    v3cross(vr,w,r);vr[0]+=v[0];vr[1]+=v[1];vr[2]+=v[2];
    const vn=v3dot(vr,n);if(vn>=0)return;
    const k=1/this.m+v3dot(n,v3cross(x,this.invI(x,M,v3cross(y,r,n)),r)),j=-(1+e)*vn/k;
    J[0]=n[0]*j;J[1]=n[1]*j;J[2]=n[2]*j;
    const vt0=vr[0]-n[0]*vn,vt1=vr[1]-n[1]*vn,vt2=vr[2]-n[2]*vn,vtl=Math.hypot(vt0,vt1,vt2);
    if(vtl>1e-4){const iv=1/vtl,t=this._fw;t[0]=vt0*iv;t[1]=vt1*iv;t[2]=vt2*iv;
      const kt=1/this.m+v3dot(t,v3cross(x,this.invI(x,M,v3cross(y,r,t)),r)),jt=Math.min(mu*j,vtl/kt);
      J[0]+=t[0]*-jt;J[1]+=t[1]*-jt;J[2]+=t[2]*-jt;}
    for(let q=0;q<3;q++)v[q]+=J[q]/this.m;
    const dw=this.invI(x,M,v3cross(y,r,J));
    for(let q=0;q<3;q++)w[q]+=dw[q];
    if(kind==='wall'){this.ev.wall=Math.max(this.ev.wall,-vn);if(vtl>2)this.ev.scrape=Math.max(this.ev.scrape,vtl);}
    else{this.ev.ground=Math.max(this.ev.ground,-vn);if(vtl>.5)this.ev.gscr=Math.max(this.ev.gscr||0,vtl);}
  }
  takeEvents(){const e=this.ev;this.ev={wall:0,land:0,scrape:0,ground:0,gscr:0,gsurf:null,debead:0};return e;}
}
