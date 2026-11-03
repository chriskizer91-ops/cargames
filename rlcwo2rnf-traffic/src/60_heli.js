/* ---------- the police helicopter (wanted level 5) ----------
   Up high (85 m over the ground under it), it flies after you at up to 130 m/s (290 mph; Dev: Helicopter top speed),
   a little behind you and leading you by a second, never on the physics: nothing to hit. Drawn plain (a dark body,
   tail and skids, two thin blades turning, a red light blinking under it and a white one on the tail): from down here it's a silhouette. At night
   its searchlight lights the ground round you. Its own dot on the maps, its rotors' thud and the turbine's whine in
   your ears (made here, no recording). Outrun it (more than 350 m from it, across the ground, for six seconds) and it
   has lost you: the chase is over, the police gone for 45 s, the level back to 1 */
const HELI={on:false,p:new Float64Array(3),v:new Float64Array(3),yaw:0,pitch:0,lostT:0,M:new Float32Array(16),Mp:new Float32Array(16),MR:new Float32Array(16),
  prev:false,ro0:0,ro2:0,vox:null,mesh:null,escapes:0,
  lamp:{pos:[0,0,0],r:150,col:[0,0,0],type:1,dir:[0,-1,0],cosO:.9}};
const HELI_ALT=85,HELI_A=14,HELI_SEE=350,HELI_LOSE=6;
const heliVmax=()=>({'200':89.4,'250':111.8,'290':129.6})[DEVW.heliV]||129.6;
function heliOff(){HELI.on=false;HELI.lostT=0;HELI.prev=false;}
function heliFrame(dt){
  if(!(POL.live&&!POL.home&&POL.outT<=0&&POL.holdT<=0&&wantedLvl()>=5)){if(HELI.on)heliOff();return;}
  const t=GAME.car,p=HELI.p,v=HELI.v;
  if(!HELI.on){
    /* in from behind you, 600 m back, already flying */
    const M=t.M,hl=hyp2(M[0],M[6])||1,fx=M[0]/hl,fz=M[6]/hl;p[0]=t.p[0]-fx*600;p[2]=t.p[2]-fz*600;p[1]=RANCH.W.heightAt(p[0],p[2])+HELI_ALT;
    v[0]=fx*70;v[1]=0;v[2]=fz*70;HELI.on=true;HELI.lostT=0;HELI.prev=false;say('HELICOPTER!',2.5,PAL.red);
    /* (the pilot's call, once it's over you: a line not recorded yet is simply not heard) */
    HELI.called=false;}
  if(!HELI.called&&HELI.d<200){HELI.called=true;voxSay('radio_air_on','radio',0,0,0);}
  /* where it wants to be: over you, 25 m back, a second ahead of where you are; the speed for that, as fast as it goes */
  const tv=hyp2(t.v[0],t.v[2]),hx=tv>2?t.v[0]/tv:0,hz=tv>2?t.v[2]/tv:0,gx=t.p[0]+t.v[0]-hx*25,gz=t.p[2]+t.v[2]-hz*25,
    ex=gx-p[0],ez=gz-p[2],vm=heliVmax();
  let wx=t.v[0]+ex*.6,wz=t.v[2]+ez*.6;const wl=hyp2(wx,wz);if(wl>vm){wx*=vm/wl;wz*=vm/wl;}
  let ax=(wx-v[0])/dt,az=(wz-v[2])/dt;const al=hyp2(ax,az);if(al>HELI_A){ax*=HELI_A/al;az*=HELI_A/al;}
  v[0]+=ax*dt;v[2]+=az*dt;p[0]+=v[0]*dt;p[2]+=v[2]*dt;
  /* up and down with the ground under it, gently */
  const gy=RANCH.W.heightAt(p[0],p[2])+HELI_ALT;v[1]=Math.max(-8,Math.min(8,(gy-p[1])*.8));p[1]+=v[1]*dt;
  const sp=hyp2(v[0],v[2]);if(sp>3)HELI.yaw=Math.atan2(-v[2],v[0]);HELI.pitch=Math.min(.22,sp/vm*.22);
  /* has it got you */
  const dh=hyp2(t.p[0]-p[0],t.p[2]-p[2]);HELI.d=dh;HELI.lostT=dh>HELI_SEE?HELI.lostT+dt:0;
  if(HELI.lostT>HELI_LOSE)heliEscape();}
/* lost you: the chase is over (60_police's polEscape) */
function heliEscape(){HELI.escapes++;HELI.escaping=true;polEscape();}

/* ---------- drawing it ---------- */
function heliMesh(){if(HELI.mesh)return HELI.mesh;const body=new MB(),dark=[.035,.038,.045],glass=[.012,.016,.022],skid=[.05,.05,.055];
  /* (nose along +x, up +y, across z, as the cars) */
  body.box(-2.1,0,-.85,1.6,1.55,.85,dark);body.box(1.6,.25,-.75,2.6,1.35,.75,glass);body.box(-1.2,1.55,-.5,.9,1.85,.5,dark);
  body.box(-7.2,.75,-.16,-2.1,1.15,.16,dark);body.box(-7.4,.75,-.07,-6.5,2.45,.07,dark);body.box(-7.3,.95,-.9,-6.7,1.05,.9,dark);
  for(const s of [-1,1]){body.box(-1.7,-.62,s*.95-.07,1.9,-.52,s*.95+.07,skid);body.box(-1.1,-.52,s*.9-.05,-.95,0,s*.9+.05,skid);body.box(.95,-.52,s*.9-.05,1.1,0,s*.9+.05,skid);}
  /* the main rotor: two thin blades across each other (turned each frame), the tail rotor a small dark disc */
  const rotor=new MB();rotor.box(-5.6,1.98,-.16,5.6,2.04,.16,[.03,.03,.035]);rotor.box(-.16,1.98,-5.6,.16,2.04,5.6,[.03,.03,.035]);rotor.box(-.25,1.85,-.25,.25,2.05,.25,dark);
  body.cyl([-6.95,1.75,-.22],.85,.04,10,'z',[.02,.02,.025],0,MAT.COL);
  const lamp=on=>{const mb=new MB();mb.box(-.15,-.12,-.15,.15,0,.15,on?[1,.05,.03]:[.18,.01,.01],on?9:0,on?MAT.EMIT:MAT.COL);mb.box(-7.45,2.4,-.08,-7.3,2.55,.08,on?[1,1,1]:[.2,.2,.2],on?9:0,on?MAT.EMIT:MAT.COL);return mb.build();};
  return HELI.mesh={body:body.build(),rotor:rotor.build(),on:lamp(true),off:lamp(false)};}
/* its place for the frame (after the floating origin has moved): yawed to where it's going, nose down with speed */
function heliPrep(){if(!HELI.on)return;const M=HELI.M,cy=Math.cos(HELI.yaw),sy=Math.sin(HELI.yaw),cp=Math.cos(HELI.pitch),sp=Math.sin(HELI.pitch);
  M[0]=cy*cp;M[1]=-sp;M[2]=-sy*cp;M[3]=0;M[4]=cy*sp;M[5]=cp;M[6]=-sy*sp;M[7]=0;M[8]=sy;M[9]=0;M[10]=cy;M[11]=0;
  M[12]=HELI.p[0]-RO[0];M[13]=HELI.p[1]-RO[1];M[14]=HELI.p[2]-RO[2];M[15]=1;
  if(HELI.ro0!==RO[0]||HELI.ro2!==RO[2]){if(HELI.prev){HELI.Mp[12]-=RO[0]-HELI.ro0;HELI.Mp[14]-=RO[2]-HELI.ro2;}HELI.ro0=RO[0];HELI.ro2=RO[2];}}
function heliDraw(U,u){if(!HELI.on)return 0;const F=frustum(U.uVP),x=HELI.M[12],y=HELI.M[13],z=HELI.M[14];
  for(let q=0;q<6;q++){const p=F[q];if(p[0]*x+p[1]*y+p[2]*z+p[3]<-9){HELI.prev=false;return 0;}}
  const H=heliMesh();gl.uniform1f(u.uLiv,0);gl.uniform1f(u.uMudLocal,0);gl.uniform1f(u.uPrevOn,1);
  gl.uniformMatrix4fv(u.uM,false,HELI.M);gl.uniformMatrix4fv(u.uPrevM,false,HELI.prev?HELI.Mp:HELI.M);
  drawMesh(H.body);drawMesh((APP.t*1.2)%1<.12?H.on:H.off);
  /* the blades turned about the mast (5.3 turns a second: fast enough to read as turning, slow enough not to strobe
     backwards at 60 frames a second) */
  const M=HELI.M,R=HELI.MR,a=APP.t*33,ca=Math.cos(a),sa=Math.sin(a);R.set(M);
  for(let k=0;k<3;k++){R[k]=M[k]*ca+M[8+k]*sa;R[8+k]=-M[k]*sa+M[8+k]*ca;}
  gl.uniformMatrix4fv(u.uM,false,R);gl.uniformMatrix4fv(u.uPrevM,false,R);drawMesh(H.rotor);
  HELI.Mp.set(HELI.M);HELI.prev=true;return 700;}
/* the searchlight, at night: from under its nose, down at you */
function heliLight(L){if(!HELI.on||!SKY.lightsOn||L.dyn.length>=16)return;const t=GAME.car,q=HELI.lamp,M=HELI.M;
  q.pos[0]=M[12]+M[0]*1.8-M[4]*.3;q.pos[1]=M[13]+M[1]*1.8-M[5]*.3;q.pos[2]=M[14]+M[2]*1.8-M[6]*.3;
  const dx=t.p[0]-RO[0]-q.pos[0],dy=t.p[1]-RO[1]-q.pos[1],dz=t.p[2]-RO[2]-q.pos[2],d=hyp3(dx,dy,dz)||1;
  if(d>140)return;q.dir[0]=dx/d;q.dir[1]=dy/d;q.dir[2]=dz/d;q.r=Math.max(60,d*1.35);q.col[0]=5200;q.col[1]=5000;q.col[2]=4600;L.dyn.push(q);}

/* ---------- its sound: the rotors' thud (noise, low, pulsed at the blades' rate), a low beat under it, the turbine's
   whine; quieter with distance, panned, a touch of Doppler ---------- */
function heliSound(c,A){const ctx=A.ctx,now=ctx.currentTime;
  if(!HELI.on||GAME.state!=='drive'){if(HELI.vox)HELI.vox.g.gain.setTargetAtTime(0,now,.4);return;}
  if(!HELI.vox){const n=ctx.createBufferSource(),b=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    n.buffer=b;n.loop=true;const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=380;lp.Q.value=.8;
    const am=ctx.createGain();am.gain.value=.5;const lfo=ctx.createOscillator();lfo.type='sawtooth';lfo.frequency.value=17;const lg=ctx.createGain();lg.gain.value=.48;lfo.connect(lg);lg.connect(am.gain);
    const th=ctx.createOscillator();th.type='sine';th.frequency.value=52;const tg=ctx.createGain();tg.gain.value=0;const lg2=ctx.createGain();lg2.gain.value=.5;lfo.connect(lg2);lg2.connect(tg.gain);
    const wh=ctx.createOscillator();wh.type='sine';wh.frequency.value=2150;const wg=ctx.createGain();wg.gain.value=.01;
    const g=ctx.createGain();g.gain.value=0;const p=ctx.createStereoPanner?ctx.createStereoPanner():null;
    n.connect(lp);lp.connect(am);am.connect(g);th.connect(tg);tg.connect(g);wh.connect(wg);wg.connect(g);if(p){g.connect(p);p.connect(A.master);}else g.connect(A.master);
    n.start();lfo.start();th.start();wh.start();HELI.vox={g,p,lfo,wh};}
  const v=HELI.vox,dx=HELI.p[0]-c.eye[0],dy=HELI.p[1]-c.eye[1],dz=HELI.p[2]-c.eye[2],d=hyp3(dx,dy,dz)||1,
    vr=((HELI.v[0]-GAME.car.v[0])*dx+(HELI.v[2]-GAME.car.v[2])*dz)/d,dop=1/(1+Math.max(-.3,Math.min(.3,vr/343)));
  v.lfo.frequency.setTargetAtTime(17*dop,now,.1);v.wh.frequency.setTargetAtTime(2150*dop,now,.1);
  v.g.gain.setTargetAtTime(.55/(1+Math.pow(d/70,1.6)),now,.2);
  if(v.p){const rx=-c.fwd[2],rz=c.fwd[0];v.p.pan.setTargetAtTime(Math.max(-1,Math.min(1,(dx*rx+dz*rz)/d*.7)),now,.1);}}
/* the HUD and the maps */
function heliHud(C){if(!HELI.on)return;C.push([HELI.lostT>0?'HELICOPTER LOSING YOU '+Math.max(0,HELI_LOSE-HELI.lostT).toFixed(0):'HELICOPTER',true,HELI.lostT>0?PAL.amber:PAL.red]);}
function heliMapDot(toXY){if(!HELI.on)return;const q=toXY(HELI.p[0],HELI.p[2]);if(!q)return;hDisc(q[0],q[1],2.4,PAL.white);hDisc(q[0],q[1],1.3,(APP.t*1.2)%1<.5?PAL.red:PAL.ink);}
