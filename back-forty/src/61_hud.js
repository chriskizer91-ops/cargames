/* =====================================================================================
   THE DOT-MATRIX HUD: the car, where it is and your money (top left), a map round the car (top right; M for
   the whole two miles), Shiftlight 2's shift lights, tach, gear and speed (bottom right, or top middle on a phone),
   what the car is doing (chips), the feat going on now and the combo (top middle), a clock run's target,
   and messages in the middle.
   ===================================================================================== */
/* the maps: what you've seen (each chunk's map tile, kept as you drive), the roads round you whether you've
   been down them or not, the towns and the garage */
const MAPOFF=pack(10,10,14,235),MINI_SPAN=480,BIG_SPAN=WG.L*4;
function mapFill(X0,Y0,n,cx0,cz0,mpp,dark){
  for(let j=0;j<n;j++){const Y=Y0+j;if(Y<0||Y>=BH)continue;const o=Y*BW+X0,z=cz0+(j+.5-n/2)*mpp,cz=Math.floor(z/CHK),fz=(z-cz*CHK)/CHK;let lk=-1,lt=null;
    for(let i=0;i<n;i++){const X=X0+i;if(X<0||X>=BW)continue;const x=cx0+(i+.5-n/2)*mpp,cx=Math.floor(x/CHK),k=ckey(cx,cz);if(k!==lk){lk=k;lt=WORLD.tiles.get(k)||null;}
      if(!lt){HB[o+i]=dark;continue;}const tn=lt.tn;HB[o+i]=lt.px[Math.min(tn-1,(fz*tn)|0)*tn+Math.min(tn-1,(((x-cx*CHK)/CHK)*tn)|0)];}}
}
/* the car: a blinking arrow pointing where it faces */
function mapArrow(mx,my,k=1){const t=GAME.car,F=mcol(t.M,0),fl=Math.hypot(F[0],F[2])||1,fx=F[0]/fl,fz=F[2]/fl,col=(APP.t*4|0)%2?PAL.white:PAL.gold;
  hLine(mx-fx*2.5*k-fz*1.8*k,my-fz*2.5*k+fx*1.8*k,mx+fx*3*k,my+fz*3*k,col);hLine(mx-fx*2.5*k+fz*1.8*k,my-fz*2.5*k-fx*1.8*k,mx+fx*3*k,my+fz*3*k,col);hDisc(mx,my,1.1,col);}
/* the corner map: about 480 m round the car, north up */
function drawMap(x0,y0,size){
  const t=GAME.car,n=size*HS;
  hRect(x0-1,y0-1,size+2,size+2,pack(0,0,0,200));
  mapFill(x0*HS,y0*HS,n,t.p[0],t.p[2],MINI_SPAN/n,MAPOFF);
  mapArrow(x0+size/2,y0+size/2);
  hFrame(x0-1,y0-1,size+2,size+2,pack(255,255,255,60));
  txt3('N',x0+size/2-1,y0+1,pack(255,255,255,150));
}
/* the big map (M, or tap the corner map): four miles across round the car */
const BIGM={x:1e9,z:1e9,roads:[],towns:[]};
function drawBigMap(){
  const t=GAME.car,size=Math.min(H-14,W-14)|0,x0=Math.round((W-size)/2),y0=Math.round((H-size)/2),n=size*HS,span=BIG_SPAN,cxw=t.p[0],czw=t.p[2];
  hRect(0,0,W,H,pack(0,0,0,110));hRect(x0-2,y0-2,size+4,size+4,pack(0,0,0,225));
  mapFill(x0*HS,y0*HS,n,cxw,czw,span/n,pack(22,24,26,235));
  if(Math.hypot(cxw-BIGM.x,czw-BIGM.z)>250){BIGM.x=cxw;BIGM.z=czw;BIGM.roads=WG.roadLines(cxw-span*.6,czw-span*.6,cxw+span*.6,czw+span*.6,40);BIGM.towns=WG.townsNear(cxw,czw,span*.75);}
  const toM=(x,z)=>[x0+size/2+(x-cxw)/span*size,y0+size/2+(z-czw)/span*size],inR=(a,b)=>a>=x0&&a<=x0+size&&b>=y0&&b<=y0+size;
  const RC=[0,pack(150,108,66),pack(196,180,150),pack(214,214,222),PAL.gold,PAL.amber];
  for(const r of BIGM.roads){const col=RC[r.cls];for(let k=2;k<r.pts.length;k+=2){const [a,b]=toM(r.pts[k-2],r.pts[k-1]),[c,d]=toM(r.pts[k],r.pts[k+1]);if(inR(a,b)&&inR(c,d))hLine(a,b,c,d,col);}}
  for(const tw of BIGM.towns){const [a,b]=toM(tw.x,tw.z);if(!inR(a,b))continue;hDisc(a,b,1.6,PAL.white);otxt3(tw.name.toUpperCase(),a+3,b-6,PAL.ink);}
  {const [a,b]=toM(37,-50);if(inR(a,b)){hDisc(a,b,1.6,PAL.gold);otxt3('GARAGE',a+3,b-6,PAL.gold);}}
  mapArrow(x0+size/2,y0+size/2,1.3);
  hFrame(x0-2,y0-2,size+4,size+4,pack(255,255,255,70));
  const ew=t.p[0]/1609.34,ns=-t.p[2]/1609.34;otxt3(`${Math.abs(ew).toFixed(1)} MI ${ew>=0?'EAST':'WEST'}, ${Math.abs(ns).toFixed(1)} MI ${ns>=0?'NORTH':'SOUTH'} OF THE GARAGE`,x0+3,y0+3,PAL.ink);
  otxt3(GAME.touch?'TAP TO CLOSE':'M TO CLOSE',x0+3,y0+size-8,PAL.dim);otxt3('4 MILES ACROSS',x0+size-3,y0+size-8,PAL.dim,1,'r');
}
/* where the corner map sits, for taps */
const miniRect=()=>{const ms=Math.round(H*.27),[,ir]=hudInset();return [W-ms-5-ir,13,ms,ms];};
/* on a phone the small buttons stand down both sides; where the screen has no black bars beside the picture
   for them, the HUD moves in from the edges (in HUD units) */
function hudInset(){if(!GAME.touch)return [0,0];const k=W/Math.max(1,RECT.w),l=Math.max(0,Math.ceil((84-RECT.x)*k)),r=Math.max(0,Math.ceil((84-(innerWidth-RECT.x-RECT.w))*k));return [l,r];}
const tch0=()=>GAME.touch;
/* the Sim level's settings in a few letters: tyre pressure (when not at road pressure), weather, cargo */
function simTag(t){
  const C=t.c.sim,pr=simVal(SIM_AIR,SIMSET.air);let s='';
  if(SIMSET.air!=='road')s+='  '+Math.round(C.psiR*pr)+' PSI';
  if(SIMSET.wx!=='dry')s+='  '+(SIM_WX.find(a=>a[0]===SIMSET.wx)[1]).toUpperCase();
  if(SIMSET.cargo!=='none'&&C.canCargo)s+='  +'+simVal(SIM_CARGO,SIMSET.cargo)+' KG';
  return s;
}
function drawHud(c){
  const t=GAME.car,pt=t.pt,e=pt.e,sc=W>=400?2:1,on=pt.st!=='off',rpm=on?Math.max(0,pt.rpmOut||0):0,tch=GAME.touch,lx=5+hudInset()[0];
  /* top right: the map */
  const [mx0,my0,ms]=miniRect();drawMap(mx0,my0,ms);
  if(GAME.state!=='drive')return;
  /* top left: the car and its build, the place, the driving level, the money */
  otxt5(carLabel().toUpperCase(),lx,5,GR.volt,sc,'l',.12);
  otxt3(GAME.place.toUpperCase(),lx,7+7*sc+2,PAL.ink);
  otxt3(LEVELS.find(l=>l[0]===APP.level)[1].toUpperCase()+(APP.level==='kids'?' MODE':APP.level==='sim'?simTag(t):''),lx,7+7*sc+10,
    APP.level==='kids'?PAL.cyan:APP.level==='middle'?PAL.amber:APP.level==='sim'?PAL.red:PAL.dim);
  otxt5(Feats.fmtMoney(Feats.S.money),lx,7+7*sc+18,GR.green,1);
  /* the developer panel's settings, when they're off the defaults */
  const dt=devTag();if(dt)otxt3(dt,lx,7+7*sc+(tch?38:28),PAL.amber);
  if(APP.bigMap){drawBigMap();return;}
  /* shift lights, tach, gear, speed */
  engShiftLights(Math.round(W/2-45),tch0()?H-9:3,e,rpm,pt.running);
  /* with the touch controls along the bottom the instruments move up to the top middle */
  const r=Math.round(H*.15),cx=tch?Math.round(W/2+r+30):W-r-7,cy=tch?r+16:H-11;
  hDisc(cx,cy-r*.3,r*1.02,pack(4,3,8,150));engTach(cx,cy,r,e,rpm);
  const g=t.rev?'R':pt.shiftT>0?'-':String(pt.gear);otxt5(g,cx,cy-r+12,rpm>pt.upRpm[Math.min(pt.gear,e.nG)-1]-50?GR.cyan:GR.volt,2,'c');
  const sx=cx-r-47,sy=tch?cy-9:H-20;hRect(sx-3,sy,47,18,pack(4,3,8,150));
  seg7(String(Math.round(t.speed*2.237)).padStart(3,' '),sx,sy+3,11,PAL.white,pack(40,36,52),2);txt3('MPH',sx+29,sy+11,PAL.dim);
  let bx=sx-10;const by=tch?cy-26:H-36;
  if(e.fiBoost){const k=clamp((pt.boost||0)/(e.fiBoost*1.05),0,1);hRect(bx,by,4,28,pack(30,26,40));hRect(bx,by+28-Math.round(28*k),4,Math.round(28*k),e.sup?PAL.lime:PAL.amber);txt3('B',bx,by+30,PAL.dim);bx-=8;}
  if(e.nosKw){const k=clamp(pt.nos,0,1);hRect(bx,by,4,28,pack(30,26,40));hRect(bx,by+28-Math.round(28*k),4,Math.round(28*k),pt.nosOn&&(APP.t*10|0)%2?PAL.white:PAL.cyan);txt3('N',bx,by+30,PAL.dim);bx-=8;}
  /* bottom left: what the car is doing */
  const can=t.c.diff.can,C=[['TC',pt.tcOn||pt.etcOn,PAL.green],['ABS',t.absOn,PAL.amber],['ESC',t.escOn,PAL.amber]];
  if(can.low)C.push(['LOW',t.low,PAL.amber]);if(can.r)C.push(['LOCK',t.locked,PAL.amber]);if(hasOD(e))C.push(['O/D OFF',APP.od,PAL.amber]);if(e.jake)C.push(['JAKE',pt.jakeOn,PAL.amber]);if(e.nosKw)C.push(['N2O',pt.nosOn,PAL.cyan]);if(CRUISE.on)C.push(['CRUISE',true,PAL.cyan]);
  if(t.sim){let bf=1,sf=1,fl=false;for(const w of t.wheels){bf=Math.min(bf,w.bF);sf=Math.min(sf,w.shF);fl=fl||!!w.flat;}
    C.push(['FADE',bf<.92,PAL.red],['SHOCK',sf<.92,PAL.amber]);if(fl)C.push(['FLAT',true,PAL.red]);}C.push(['BANG',performance.now()-GAME.voice.popT<140,PAL.red]);
  let x=lx-1;const yc=tch?7+7*sc+28:H-7;for(const [s,v,col] of C){txt3(s,x,yc,v?col:pack(70,64,86));x+=tw3(s)+5;}
  drawFeatsHud();drawRaceHud(lx,sc);
  if(DEVW.hud)drawWorldStats();
  if(!on){const msg=GAME.touch?'TAP GAS TO START':'PRESS W OR I TO START';if((APP.t*1.6|0)%2===0)otxt5(msg,W/2,H-26,GR.steel,1,'c');}
  else if(pt.st==='crank')otxt3('CRANKING',W/2,H-22,PAL.amber,1,'c');
  /* a lap under way on the road course */
  if(LAP.on){const lt=GAME.time-LAP.t0,b=LAP.best[lapKey()],y=tch?H-30:H-30;
    otxt5('LAP '+fmtLap(lt),W/2,y,GR.volt,1,'c');if(b)otxt3('BEST '+fmtLap(b),W/2,y+9,PAL.dim,1,'c');}
  /* a clock run: the time, how far to go and which way */
  if(RUN.on){const r=RUN.on,el=RUN.armed?GAME.time-RUN.t0:0,d=Math.hypot(r.to[0]-t.p[0],r.to[1]-t.p[2]),y=H-34;
    const F=mcol(t.M,0),hy=Math.atan2(-F[2],F[0]),ty=Math.atan2(-(r.to[1]-t.p[2]),r.to[0]-t.p[0]);let a=ty-hy;while(a>PI)a-=TAU;while(a<-PI)a+=TAU;
    otxt3(r.name.toUpperCase(),W/2,y-10,PAL.gold,1,'c');otxt5(fmtLap(el),W/2,y,el>r.par?GR.red:GR.volt,1,'c');otxt3(Math.round(d)+' M  PAR '+fmtLap(r.par),W/2,y+9,PAL.dim,1,'c');
    /* an arrow at the top of the screen pointing to the finish */
    const ax=W/2+(tch?-48:0),ay=tch?50:30,dx=-Math.sin(a),dy=-Math.cos(a);hLine(ax,ay,ax+dx*7,ay+dy*7,PAL.gold);hDisc(ax+dx*7,ay+dy*7,1.4,PAL.gold);}
  /* messages */
  let y=Math.round(H*.3);
  for(let i=GAME.msgs.length-1;i>=0;i--){const m=GAME.msgs[i];m.a=APP.t-m.t0;if(m.a>m.k){GAME.msgs.splice(i,1);continue;}
    const al=Math.round(255*clamp(Math.min(m.a*6,(m.k-m.a)*3),0,1)),big=i===GAME.msgs.length-1&&tw5(m.t,1)<W*.8;
    otxt5(m.t,W/2,y,big?GR.steel:GR.steel.map(c=>((c&0xffffff)|(al<<24))>>>0),1,'c');y+=10;}
}
/* a race (60_race): the lights, your place, the lap and the time, the gaps; a stage's clock and splits; the drag tree */
function drawRaceHud(lx,sc){
  if(!RACE.on||!RACE.me)return;
  const ev=RACE.ev,me=RACE.me,tch=GAME.touch,clk=RACE.state==='grid'?0:RACE.clock;let y=7+7*sc+(tch?40:30);
  /* the lights: three red (the drag tree's ambers), then green */
  if(RACE.state==='grid'||RACE.clock<1.2){const drag=ev.kind==='drag',cx=Math.round(W/2),cy=Math.round(H*(tch?.32:.24)),n=3,on=RACE.lights,go=RACE.green;
    hRect(cx-(drag?8:21),cy-8,drag?16:42,drag?44:16,pack(4,3,8,190));
    for(let k=0;k<n;k++){const px=drag?cx:cx-12+k*12,py=drag?cy-2+k*9:cy,lit=go||k<on;hDisc(px,py,3.6,lit?(go?PAL.green:drag?PAL.amber:PAL.red):pack(40,30,30,255));}
    if(drag){hDisc(cx,cy+25,3.6,go?PAL.green:pack(30,40,30,255));if(RACE.foul)hDisc(cx,cy+33,3.6,PAL.red);}
    if(drag&&RACE.state==='grid'&&inputThr()>.5&&!RACE.foul)otxt3('OFF THE GAS UNTIL GREEN',cx,cy+40,PAL.amber,1,'c');}
  if(ev.kind==='stage'){const len=RACE.s1-RACE.s0,togo=Math.max(0,RACE.s1-(me.trk.s||RACE.s0));
    otxt3('STAGE',lx,y,PAL.dim);otxt5(fmtLap(me.done?me.time:clk),lx,y+7,GR.volt,1);
    otxt3((togo/1000).toFixed(2)+' KM TO GO',lx,y+17,PAL.ink);
    const best=Math.min(...RACE.rivals.map(r=>r.time));otxt3('TO BEAT '+fmtLap(best),lx,y+25,PAL.dim);void len;return;}
  if(ev.kind==='drag'){otxt5(fmtLap(me.done?me.time:clk),lx,y,GR.volt,1);if(RACE.rt!==null)otxt3('RT '+RACE.rt.toFixed(3),lx,y+10,PAL.ink);return;}
  const order=raceOrder(),pos=order.indexOf(me)+1,live=RACE.cars.filter(c=>!c.out).length,laps=Math.max(0,Math.min(ev.laps,(me.laps||0)+1));
  otxt5('P'+pos,lx,y,GR.gold,sc);txt3('/'+(ev.kind==='elim'?live:RACE.cars.length),lx+tw5('P'+pos,sc)+2,y+(sc>1?7:3),PAL.dim);y+=7*sc+3;
  otxt3((me.done?'FINISHED':'LAP '+laps+'/'+ev.laps),lx,y,me.done?PAL.gold:PAL.ink);otxt3(fmtLap(me.done?me.time:clk),lx+44,y,PAL.ink);y+=8;
  /* the gaps to the cars either side, in seconds at your speed */
  const L=me.trk.line,v=Math.max(8,GAME.car.speed),gap=c=>{let d=(c.prog||0)-(me.prog||0);return d/v;};
  const a=order[pos-2],b=order[pos];
  if(a&&!a.done&&!me.done)otxt3('AHEAD '+Math.abs(gap(a)).toFixed(1),lx,y,PAL.dim),y+=7;
  if(b&&!b.out&&!me.done)otxt3('BEHIND '+Math.abs(gap(b)).toFixed(1),lx,y,PAL.dim),y+=7;
  /* the running order, on a big screen */
  if(!tch&&H>=170){y+=3;for(let k=0;k<order.length;k++){const c=order[k],nm=(c.me?'YOU':c.name.split(' ').pop().toUpperCase()).slice(0,9);
    txt3((k+1)+' '+nm,lx,y,c.me?PAL.gold:c.out?pack(80,70,90):PAL.ink);y+=6;}}
  void L;
}
/* the feat going on now (drifting, in the air, on two wheels, a speed run, a burnout) and the combo with
   its money, its multiplier and how long until it banks */
function drawFeatsHud(){
  const F=Feats.hud();if(!F.live.length&&!F.combo)return;
  const cx=GAME.touch?Math.round(W/2-50):Math.round(W/2);let y=GAME.touch?8:12;
  for(const [txt,col,val] of F.live){otxt5(txt,cx,y,hx(col),1,'c');y+=9;if(val>0){otxt3('+'+Feats.fmtMoney(val),cx,y,PAL.ink,1,'c');y+=8;}}
  if(F.combo){const c=F.combo,s=(c.n>1?'X'+c.mult.toFixed(1)+'  ':'')+Feats.fmtMoney(c.pot*c.mult);otxt5(s,cx,y+1,GR.green,1,'c');
    const w=60,x0=cx-w/2;hRect(x0,y+10,w,2,pack(40,36,52,220));hRect(x0,y+10,Math.round(w*(1-c.bank)),2,PAL.green);}
}
