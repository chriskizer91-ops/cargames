/* =====================================================================================
   THE DOT-MATRIX HUD: the car, where it is and your money (top left), a map round the car (top right; M for
   the whole two miles), Shiftlight 2's shift lights, tach, gear and speed (bottom right, or top middle on a phone),
   what the car is doing (chips), the feat going on now and the combo (top middle), a clock run's target,
   and messages in the middle.
   ===================================================================================== */
const MAPC={grass:[54,84,30],dirt:[120,70,38],strip:[176,140,100],trail:[150,104,62],rock:[112,96,84],mud:[46,32,18],concrete:[150,148,144],water:[60,120,190],gravel:[178,168,146],asphalt:[46,46,52],ruts:[84,58,32]};
let MAPBMP=null;
/* the whole map, made once: surface colour shaded by slope and height, the trees darker; the corner map
   and the big map both read from it */
function mapBitmap(){
  if(MAPBMP)return MAPBMP;
  const W=RANCH.W,span=W.D.size,n=1024,px=new Uint32Array(n*n),T=W.trees;
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){
    const x=-span/2+(i+.5)/n*span,z=-span/2+(j+.5)/n*span,g=W.groundAt(x,z),c=MAPC[g.surf]||MAPC.dirt,sh=.62+.5*clamp(g.n[0]*.6-g.n[2]*.5+g.n[1]*.5,0,1),hh=clamp(.8+g.y/120,.75,1.25);
    px[j*n+i]=pack(c[0]*sh*hh,c[1]*sh*hh,c[2]*sh*hh,235);}
  const tc=pack(26,46,20,235);for(let k=0;k<T.length;k+=12){const i=Math.floor((T[k]+span/2)/span*n),j=Math.floor((T[k+2]+span/2)/span*n);if(i>=0&&j>=0&&i<n-1&&j<n-1)px[j*n+i]=px[j*n+i+1]=px[(j+1)*n+i]=px[(j+1)*n+i+1]=tc;}
  return MAPBMP={n,px,span};
}
const MINI_SPAN=480;
/* the car: a blinking arrow pointing where it faces */
function mapArrow(mx,my,k=1){const t=GAME.car,F=mcol(t.M,0),fl=Math.hypot(F[0],F[2])||1,fx=F[0]/fl,fz=F[2]/fl,col=(APP.t*4|0)%2?PAL.white:PAL.gold;
  hLine(mx-fx*2.5*k-fz*1.8*k,my-fz*2.5*k+fx*1.8*k,mx+fx*3*k,my+fz*3*k,col);hLine(mx-fx*2.5*k+fz*1.8*k,my-fz*2.5*k-fx*1.8*k,mx+fx*3*k,my+fz*3*k,col);hDisc(mx,my,1.1,col);}
/* the corner map: about 480 m round the car, north up, scrolling as it drives */
function drawMap(x0,y0,size){
  const t=GAME.car,B=mapBitmap(),n=size*HS,X0=x0*HS,Y0=y0*HS,sc=B.n/B.span,mpp=MINI_SPAN/n,off=pack(8,8,12,235),h=B.span/2;
  hRect(x0-1,y0-1,size+2,size+2,pack(0,0,0,200));
  for(let j=0;j<n;j++){const Y=Y0+j;if(Y<0||Y>=BH)continue;const o=Y*BW+X0,bz=Math.floor((t.p[2]+(j+.5-n/2)*mpp+h)*sc);
    for(let i=0;i<n;i++){const bx=Math.floor((t.p[0]+(i+.5-n/2)*mpp+h)*sc);HB[o+i]=bx<0||bz<0||bx>=B.n||bz>=B.n?off:B.px[bz*B.n+bx];}}
  /* a cross-country route: the line ahead of you, gold, as far as the map reaches */
  if(RACE.on&&RACE.ev.kind==='cross'&&RACE.me&&RACE.me.line){const L=RACE.me.line,i0=Math.max(0,RACE.me.trk.i),col=pack(255,206,90,230),col2=pack(255,206,90,110);
    for(let i=Math.max(0,i0-60);i<L.n;i++){const mx=x0+size/2+(L.x[i]-t.p[0])/MINI_SPAN*size,my=y0+size/2+(L.z[i]-t.p[2])/MINI_SPAN*size;
      if(mx>x0&&mx<x0+size-1&&my>y0&&my<y0+size-1)hRect(mx,my,1,1,i<i0?col2:col);}
    const e=L.at(RACE.s1,0),ex=x0+size/2+(e[0]-t.p[0])/MINI_SPAN*size,ey=y0+size/2+(e[1]-t.p[2])/MINI_SPAN*size;
    if(ex>x0+2&&ex<x0+size-2&&ey>y0+2&&ey<y0+size-2)hDisc(ex,ey,2,(APP.t*3|0)%2?PAL.gold:PAL.white);}
  /* the others in a race */
  if(RACE.on)for(const o of RACE.cars){if(o.me||o.gone)continue;const mx=x0+size/2+(o.car.p[0]-t.p[0])/MINI_SPAN*size,my=y0+size/2+(o.car.p[2]-t.p[2])/MINI_SPAN*size;
    if(mx>x0+1&&mx<x0+size-1&&my>y0+1&&my<y0+size-1)hDisc(mx,my,1.3,o.out?PAL.dim:PAL.red);}
  if(RUN.on){const r=RUN.on,mx=x0+size/2+(r.to[0]-t.p[0])/MINI_SPAN*size,my=y0+size/2+(r.to[1]-t.p[2])/MINI_SPAN*size;
    const cx=clamp(mx,x0+2,x0+size-2),cy=clamp(my,y0+2,y0+size-2);hDisc(cx,cy,2.2,(APP.t*3|0)%2?PAL.gold:PAL.white);}
  mapArrow(x0+size/2,y0+size/2);
  hFrame(x0-1,y0-1,size+2,size+2,pack(255,255,255,60));
  txt3('N',x0+size/2-1,y0+1,pack(255,255,255,150));
}
/* the big map (M, or tap the corner map): the whole two miles, the places, where the car is */
const MAPLBL={shop:'RANCH',climb:'RED HILL',home:'HOME',store:'FEED+FUEL',track:'TRACK',pond:'POND',speedway:'SPEEDWAY',short:'SHORT COURSE',top:'SUMMIT',rally:'RALLY',lake:'DRY LAKE'};
function drawBigMap(){
  const B=mapBitmap(),size=Math.min(H-14,W-14)|0,x0=Math.round((W-size)/2),y0=Math.round((H-size)/2),n=size*HS,X0=x0*HS,Y0=y0*HS,f=B.n/n;
  hRect(0,0,W,H,pack(0,0,0,110));hRect(x0-2,y0-2,size+4,size+4,pack(0,0,0,225));
  for(let j=0;j<n;j++){const Y=Y0+j;if(Y<0||Y>=BH)continue;const o=Y*BW+X0,row=Math.min(B.n-1,Math.floor((j+.5)*f))*B.n;for(let i=0;i<n;i++)HB[o+i]=B.px[row+Math.min(B.n-1,Math.floor((i+.5)*f))];}
  const toM=(x,z)=>[x0+(x+B.span/2)/B.span*size,y0+(z+B.span/2)/B.span*size];
  for(const p of PLACES){const [mx,my]=toM(p[2],p[3]);hDisc(mx,my,1,PAL.gold);}
  for(const p of PLACES){const l=MAPLBL[p[0]];if(!l)continue;const [mx,my]=toM(p[2],p[3]);otxt3(l,mx+3,my-2,PAL.ink);}
  if(RUN.on){const [rx,ry]=toM(RUN.on.to[0],RUN.on.to[1]);hDisc(rx,ry,2.4,PAL.gold);otxt3('FINISH',rx+4,ry-2,PAL.gold);}
  /* a cross-country route, the whole of it, with its finish */
  if(RACE.on&&RACE.ev.kind==='cross'&&RACE.me&&RACE.me.line){const L=RACE.me.line;for(let i=0;i<L.n;i+=2){const [mx,my]=toM(L.x[i],L.z[i]);hRect(mx,my,1,1,pack(255,206,90,230));}
    const e=L.at(RACE.s1,0),[rx,ry]=toM(e[0],e[1]);hDisc(rx,ry,2.4,PAL.gold);otxt3('FINISH',rx+4,ry-2,PAL.gold);
    for(const o of RACE.cars){if(o.me||o.gone)continue;const [mx,my]=toM(o.car.p[0],o.car.p[2]);hDisc(mx,my,1.3,PAL.red);}}
  const t=GAME.car,[tx,ty]=toM(t.p[0],t.p[2]);mapArrow(tx,ty,1.3);
  hFrame(x0-2,y0-2,size+4,size+4,pack(255,255,255,70));
  otxt3(GAME.touch?'TAP TO CLOSE':'M TO CLOSE',x0+3,y0+size-8,PAL.dim);otxt3('2 MILES',x0+size-3,y0+size-8,PAL.dim,1,'r');
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
  if(can.low)C.push(['LOW',t.low,PAL.amber]);if(can.r)C.push(['LOCK',t.locked,PAL.amber]);if(e.conv)C.push(['O/D OFF',APP.od,PAL.amber]);if(e.nosKw)C.push(['N2O',pt.nosOn,PAL.cyan]);
  if(t.sim){let bf=1,sf=1,fl=false;for(const w of t.wheels){bf=Math.min(bf,w.bF);sf=Math.min(sf,w.shF);fl=fl||!!w.flat;}
    C.push(['FADE',bf<.92,PAL.red],['SHOCK',sf<.92,PAL.amber]);if(fl)C.push(['FLAT',true,PAL.red]);}C.push(['BANG',performance.now()-GAME.voice.popT<140,PAL.red]);
  let x=lx-1;const yc=tch?7+7*sc+28:H-7;for(const [s,v,col] of C){txt3(s,x,yc,v?col:pack(70,64,86));x+=tw3(s)+5;}
  drawFeatsHud();drawRaceHud(lx,sc);
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
  const order=raceOrder(),pos=order.indexOf(me)+1,live=RACE.cars.filter(c=>!c.out).length,laps=Math.max(0,Math.min(ev.laps,(me.laps||0)+1)),cross=ev.kind==='cross';
  otxt5('P'+pos,lx,y,GR.gold,sc);txt3('/'+(ev.kind==='elim'?live:RACE.cars.length),lx+tw5('P'+pos,sc)+2,y+(sc>1?7:3),PAL.dim);y+=7*sc+3;
  otxt3((me.done?'FINISHED':cross?(Math.max(0,RACE.s1-(me.trk.s||0))/1000).toFixed(2)+' KM':'LAP '+laps+'/'+ev.laps),lx,y,me.done?PAL.gold:PAL.ink);otxt3(fmtLap(me.done?me.time:clk),lx+44,y,PAL.ink);y+=8;
  /* cross-country: which way the route goes from here (an arrow turned to the line 40 m on), and a wrong-way warning */
  if(cross&&!me.done&&RACE.state!=='grid'){const T=me.trk,L=T.line,t=GAME.car,[tx,tz]=L.at(Math.min(L.len,(T.s||0)+40),0),F=mcol(t.M,0),fl=Math.hypot(F[0],F[2])||1,
      dx=tx-t.p[0],dz=tz-t.p[2],dl=Math.hypot(dx,dz)||1,fw=(F[0]*dx+F[2]*dz)/(fl*dl),rt=(-F[2]*dx+F[0]*dz)/(fl*dl),a=Math.atan2(rt,fw),ax=lx+5,ay=y+5,ux=Math.sin(a),uy=-Math.cos(a),col=Math.abs(a)>1.9?PAL.red:PAL.gold;
    hLine(ax-ux*4,ay-uy*4,ax+ux*4,ay+uy*4,col);hLine(ax+ux*4,ay+uy*4,ax+ux*1.2-uy*2.6,ay+uy*1.2+ux*2.6,col);hLine(ax+ux*4,ay+uy*4,ax+ux*1.2+uy*2.6,ay+uy*1.2-ux*2.6,col);
    otxt3(Math.abs(a)>1.9&&t.speed>3?'WRONG WAY':'ROUTE',lx+13,y+3,col);y+=13;}
  /* the gaps to the cars either side, in seconds at your speed */
  const L=me.trk.line,v=Math.max(8,GAME.car.speed),gap=c=>{let d=(c.prog||0)-(me.prog||0);return d/v;};
  const a=order[pos-2],b=order[pos];
  if(a&&!a.done&&!me.done)otxt3('AHEAD '+Math.abs(gap(a)).toFixed(1),lx,y,PAL.dim),y+=7;
  if(b&&!b.out&&!me.done)otxt3('BEHIND '+Math.abs(gap(b)).toFixed(1),lx,y,PAL.dim),y+=7;
  /* the running order, on a big screen */
  /* (a rival still sizing you up, taking it easy, is dimmer and dozing: ZZ) */
  if(!tch&&H>=170){y+=3;for(let k=0;k<order.length;k++){const c=order[k],nm=(c.me?'YOU':c.name.split(' ').pop().toUpperCase()).slice(0,9)+(c.drv&&!c.awake&&!c.done?' ZZ':'');
    txt3((k+1)+' '+nm,lx,y,c.me?PAL.gold:c.out?pack(80,70,90):c.drv&&!c.awake?pack(150,150,170,255):PAL.ink);y+=6;}}
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
