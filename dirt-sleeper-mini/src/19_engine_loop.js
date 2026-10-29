/* ---------- the loop: the lab's frame, minus its instruments, once for every car that is running ---------- */
const IDLE={thr:0,brk:0,nos:false};
function engineFrame(dt){
  const sel=cur();if(!sel.sim)return;
  const inp=readInput(dt);
  for(const car in VOICES){
    const v=VOICES[car],sim=v.sim,mine=v===sel;if(!sim)continue;
    /* a parked car that has never run has nothing to do */
    if(!mine&&!v.port&&sim.st==='off')continue;
    const vi=mine?inp:IDLE;for(let k=0;k<4;k++)sim.step(dt/4,vi);
    const ev=sim.takeEvents();
    if(v.port){
      /* an engine that has been off a while sleeps in its worklet until it is started again */
      v.offT=sim.st==='off'?v.offT+dt:0;const nap=v.offT>2;
      if(nap!==v.asleep){v.asleep=nap;v.port.post({t:'sleep',v:nap?1:0});}
      if(!nap){for(const e of ev)v.port.post({t:'ev',ev:e});v.port.post({t:'p',p:voiceParams(v,mine,dt)});}}
    if(sim.stalled){sim.stalled=false;if(mine)ENG.status='It stalled. Start it again with the button or I.';}
    v.inp=vi;
    bodyFrame(v,dt);
  }
}
/* the car answers: torque rocks the body on its springs, acceleration squats it, the wheels turn */
function bodyFrame(v,dt){
  const sim=v.sim,e=v.spec,run=sim.running,Te=run?Math.max(-e.tq*.3,SIM.engTq(e,Math.max(sim.rpm,1),sim.thr,sim.boost)):0;
  const rollT=-.02*Te/e.peak.tq,pitchT=sim.mode==='drive'?clamp(sim.aPrev/9.81,-1,1)*.014:0;
  v.rollV+=(-(v.roll-rollT)*80-v.rollV*6.5)*dt;v.roll+=v.rollV*dt;
  v.pitchV+=(-(v.pitch-pitchT)*60-v.pitchV*7)*dt;v.pitch+=v.pitchV*dt;
  const idle=run?1-clamp((sim.rpm-e.idle)/(e.idle*1.5),0,1):0,lope=[0,.012,.032,.065][e.cam|0],amp=run?(.0004+lope*.03*idle+.0003*sim.load):0;
  v.shake=[(Math.random()-.5)*amp,(Math.random()-.5)*amp*1.6];
  v.wheelA=(v.wheelA+(sim.mode==='drive'?sim.ww:0)*dt)%(TAU*1000);
  v.flame=Math.max(0,v.flame-dt*9);
}
/* where a car is heard from. The one on the turntable is heard the way the listener buttons say.
   A parked car is heard from the camera: from the side it is on, in front of it or behind it, and
   as far off as it is (a little nearer, the shed is a small room). How fast that distance can change
   is held down, so the camera flying across the shed does not bend the pitch. Out of the garage only
   the car on the turntable is heard. */
function voiceParams(v,mine,dt){
  const p=v.sim.params(mine?ENG.listener:0,1);
  if(mine){v.dist=-1;return p;}
  if(!APP.garage||!CAMNOW){p.vol=0;return p;}
  const s=spotOf(v.car),c=CAMNOW,dx=s.p[0]-c.eye[0],dy=.6-c.eye[1],dz=s.p[2]-c.eye[2],d=Math.hypot(dx,dy,dz)||1,t=Math.max(3,d*.6);
  v.dist=v.dist<0?t:v.dist+clamp(t-v.dist,-8*dt,8*dt);
  const f=[Math.cos(s.yaw),-Math.sin(s.yaw)];
  p.dist=v.dist;p.pan=clamp((dx*c.right[0]+dz*c.right[2])/d*.9,-.9,.9);p.rear=clamp(.5+.5*(f[0]*dx+f[1]*dz)/d,0,1);
  return p;
}
/* every car in the shed at once */
function allEngines(on){
  for(const [car] of CARS){const v=engineFor(carBuild(car));if(on&&!runs(v))startEngine(v);else if(!on&&runs(v))v.sim.stop();}
  engineLive(true);
}
function engineHud(){
  const sim=ENG.sim,e=ENG.spec;if(!sim||!e)return;
  const on=sim.st!=='off',rpm=on?Math.max(0,sim.rpmOut||0):0;
  if(!on&&ENG.tab!=='engine')return;
  engShiftLights(Math.round(W/2-45),3,e,rpm,sim.running);
  /* the tach in the corner with the gear in its middle; speed and the boost and nitrous bars to its left */
  const r=Math.round(H*.15),cx=W-r-7,cy=H-11;
  hDisc(cx,cy-r*.3,r*1.02,pack(4,3,8,150));
  engTach(cx,cy,r,e,rpm);
  const drive=sim.mode==='drive',g=!drive?'N':sim.shiftT>0?'-':sim.gear?String(sim.gear):'N';
  otxt5(g,cx,cy-r+12,rpm>e.shiftRpm-50&&drive?GR.cyan:GR.volt,2,'c');
  const sx=cx-r-47;hRect(sx-3,H-20,47,18,pack(4,3,8,150));
  seg7(String(Math.round(sim.v*2.237)).padStart(3,' '),sx,H-17,11,PAL.white,pack(40,36,52),2);txt3('MPH',sx+29,H-9,PAL.dim);
  let bx=sx-10;const by=H-36;
  if(e.fiBoost){const b=clamp((sim.boost||0)/(e.fiBoost*1.05),0,1);hRect(bx,by,4,28,pack(30,26,40));hRect(bx,by+28-Math.round(28*b),4,Math.round(28*b),e.sup?PAL.lime:PAL.amber);txt3('B',bx,by+30,PAL.dim);bx-=8;}
  if(e.nosKw){const b=clamp(sim.nos,0,1);hRect(bx,by,4,28,pack(30,26,40));hRect(bx,by+28-Math.round(28*b),4,Math.round(28*b),sim.nosOn&&(APP.t*10|0)%2?PAL.white:PAL.cyan);txt3('N',bx,by+30,PAL.dim);bx-=8;}
  /* the lab's chips */
  const bang=performance.now()-cur().popT<140,run=sim.running;
  const C=[['LIMITER',sim.cutFrac>.5&&!sim.twostep&&!sim.tcOn&&sim.shiftT<=0,PAL.red],['2-STEP',sim.twostep,PAL.amber],['TC',sim.tcOn,PAL.green],
    ['NOS',sim.nosOn,PAL.cyan],['BANG',bang,PAL.red]];
  if(e.antilag)C.splice(3,0,['ANTI-LAG',!!(e.turbo&&sim.thr<.2&&run&&sim.rpm>e.redline*.3),PAL.amber]);
  let x=4;for(const [t,v,col] of C){if(t==='NOS'&&!e.nosKw)continue;txt3(t,x,H-7,v?col:pack(70,64,86));x+=tw3(t)+5;}
  txt3(LISTEN[ENG.listener].toUpperCase()+' . '+(drive?'DRIVE':'FREE REV'),x+2,H-7,PAL.dim);
  if(!on){const msg=touchy?'TAP START ENGINE':'PRESS I TO START';if((APP.t*1.6|0)%2===0)otxt5(msg,W/2,H-24,GR.steel,1,'c');}
  else if(sim.st==='crank')otxt3('CRANKING',W/2,H-20,PAL.amber,1,'c');
}

