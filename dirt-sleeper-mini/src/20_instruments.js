/* ---------- the dot-matrix instruments: Shiftlight 2's shift lights, tach, gear and speed ---------- */
function engShiftLights(x,y,e,rpm,n=15){
  const sAt=e.shiftRpm,lo=sAt-Math.min(3500,sAt*.42),f=clamp((rpm-lo)/(sAt-lo),0,1),lit=Math.floor(f*n+.001),over=rpm>=sAt-40&&ENG.sim.running,blink=(APP.t*14|0)%2;
  for(let i=0;i<n;i++){const cx=x+i*6,on=i<lit;
    let col=i<5?[60,255,90]:i<10?[255,210,40]:[255,50,60];if(over)col=[80,140,255];
    const c=(over?blink:on)?pack(col[0],col[1],col[2]):pack(col[0]*.12,col[1]*.12,col[2]*.12);
    hDisc(cx+2,y+2,2.3,c);if(over?blink:on)hPx(cx+1,y+1,PAL.white);}
}
function engTach(cx,cy,r,e,rpm){
  const lim=e.limiterRpm,n=34,a0=PI*1.12,a1=-PI*.12;
  for(let i=0;i<n;i++){const t=i/(n-1),a=a0+(a1-a0)*t,rv=t*lim*1.05,x=cx+Math.cos(a)*r,y=cy-Math.sin(a)*r;
    const on=rv<=rpm,red=rv>e.redline,c=red?(on?PAL.red:pack(70,10,16)):on?PAL.ink:pack(50,46,64);hDisc(x,y,1.3,c);}
  for(let k=0;k<=Math.floor(lim/1000);k++){const t=k*1000/(lim*1.05),a=a0+(a1-a0)*t;txt3(String(k),Math.round(cx+Math.cos(a)*(r-7))-1,Math.round(cy-Math.sin(a)*(r-7))-2,k*1000>e.redline?PAL.red:PAL.dim);}
}
function engineHud(){
  const sim=ENG.sim,e=ENG.spec;if(!sim||!e)return;
  const on=sim.st!=='off',rpm=on?Math.max(0,sim.rpmOut||0):0;
  if(!on&&ENG.tab!=='engine')return;
  engShiftLights(Math.round(W/2-45),3,e,rpm);
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

