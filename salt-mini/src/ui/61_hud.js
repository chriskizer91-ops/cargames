/* =====================================================================================
   THE MINI'S HUD: Road Not Found + Traffic's dot-matrix HUD (61_hud drawHud), the parts this page has. Top left:
   the truck and its build, where it is on the road, the driving level and the traction; Shiftlight 2's shift lights,
   the tach and the gear, the speed in seven-segment figures with the boost and nitrous bars beside it (bottom right,
   or top middle with the touch controls); the chips (TC, ABS, ESC, LOW, LOCK, O/D OFF, N2O, BANG); messages.
   Drawn into the dot buffer (10_hud) at the grid the game uses: 320 x 180, 16:9, as big as the window allows.
   ===================================================================================== */
const APP={t:0};
const RES=[[320,180,1],[480,270,1],[640,360,2],[960,540,3],[1280,720,4]];
function setRes(i){const [dw,dh,hs]=RES[i];HS=hs;BW=dw;BH=dh;W=dw/hs;H=dh/hs;HB=new Uint32Array(BW*BH);HB8=new Uint8Array(HB.buffer);}
function hudLayout(){const vw=innerWidth,vh=innerHeight;let w=vw,h=w*9/16;if(h>vh){h=vh;w=h*16/9;}RECT={x:(vw-w)/2,y:(vh-h)/2,w,h};}
/* the messages in the middle (the game's say) */
const MSGS=[];
function say(t,k=2){MSGS.push({t:String(t).toUpperCase(),t0:APP.t,k});if(MSGS.length>4)MSGS.shift();}
/* on a phone the small buttons stand down both sides; where the screen has no room beside the picture for them,
   the HUD moves in from the edges */
function hudInset(tch){if(!tch)return [0,0];const k=W/Math.max(1,RECT.w),l=Math.max(0,Math.ceil((84-RECT.x)*k)),r=Math.max(0,Math.ceil((84-(innerWidth-RECT.x-RECT.w))*k));return [l,r];}
const hasOD=e=>e.conv&&!e.cvt&&e.nG>2;
/* o: {car, touch, label, place, level (id), levelName, trac, od, rear, popT} */
function miniHud(o){
  hClear();const t=o.car;if(!t)return;
  const pt=t.pt,e=pt.e,sc=W>=400?2:1,on=pt.st!=='off',rpm=on?Math.max(0,pt.rpmOut||0):0,tch=o.touch,lx=5+hudInset(tch)[0];
  /* top left: the truck and its build, where it is, the driving level, the traction */
  otxt5(o.label.toUpperCase(),lx,5,GR.volt,sc,'l',.12);
  otxt3(o.place.toUpperCase(),lx,7+7*sc+2,PAL.ink);
  otxt3(o.levelName.toUpperCase()+(o.level==='kids'?' MODE':''),lx,7+7*sc+10,o.level==='kids'?PAL.cyan:o.level==='middle'?PAL.amber:PAL.dim);
  otxt3('TRACTION '+Math.round(o.trac*100)+'%',lx,7+7*sc+18,o.trac>1.01?PAL.amber:PAL.dim);
  /* shift lights, tach, gear, speed */
  engShiftLights(Math.round(W/2-45),tch?H-9:3,e,rpm,pt.running);
  /* with the touch controls along the bottom the instruments move up to the top middle */
  const r=Math.round(H*.15),cx=tch?Math.round(W/2+r+30):W-r-7,cy=tch?r+16:H-11;
  hDisc(cx,cy-r*.3,r*1.02,pack(4,3,8,150));engTach(cx,cy,r,e,rpm);
  const g=t.rev?'R':pt.shiftT>0?'-':String(pt.gear);otxt5(g,cx,cy-r+12,rpm>pt.upRpm[Math.min(pt.gear,e.nG)-1]-50?GR.cyan:GR.volt,2,'c');
  const sx=cx-r-47,sy=tch?cy-9:H-20;hRect(sx-3,sy,47,18,pack(4,3,8,150));
  seg7(String(Math.round(t.speed*2.237)).padStart(3,' '),sx,sy+3,11,PAL.white,pack(40,36,52),2);txt3('MPH',sx+29,sy+11,PAL.dim);
  let bx=sx-10;const by=tch?cy-26:H-36;
  if(e.fiBoost){const k=clamp((pt.boost||0)/(e.fiBoost*1.05),0,1);hRect(bx,by,4,28,pack(30,26,40));hRect(bx,by+28-Math.round(28*k),4,Math.round(28*k),e.sup?PAL.lime:PAL.amber);txt3('B',bx,by+30,PAL.dim);bx-=8;}
  if(e.nosKw){const k=clamp(pt.nos,0,1);hRect(bx,by,4,28,pack(30,26,40));hRect(bx,by+28-Math.round(28*k),4,Math.round(28*k),pt.nosOn&&(APP.t*10|0)%2?PAL.white:PAL.cyan);txt3('N',bx,by+30,PAL.dim);bx-=8;}
  /* bottom left: what the truck is doing */
  const can=t.c.diff.can,C=[['TC',pt.tcOn||pt.etcOn,PAL.green],['ABS',t.absOn,PAL.amber],['ESC',t.escOn,PAL.amber]];
  if(can.low)C.push(['LOW',t.low,PAL.amber]);if(can.r)C.push(['LOCK',t.locked,PAL.amber]);if(hasOD(e))C.push(['O/D OFF',o.od,PAL.amber]);
  if(e.nosKw)C.push(['N2O',pt.nosOn,PAL.cyan]);C.push(['BANG',performance.now()-(o.popT||0)<140,PAL.red]);
  let x=lx-1;const yc=tch?7+7*sc+28:H-7;for(const [s,v,col] of C){txt3(s,x,yc,v?col:pack(70,64,86));x+=tw3(s)+5;}
  if(!on){const msg=tch?'TAP GAS TO START':'PRESS W OR I TO START';if((APP.t*1.6|0)%2===0)otxt5(msg,W/2,H-26,GR.steel,1,'c');}
  else if(pt.st==='crank')otxt3('CRANKING',W/2,H-22,PAL.amber,1,'c');
  /* the rear view's tag, small, under the instruments' row */
  if(o.rear)otxt3('REAR VIEW',W/2,tch?Math.round(H*.36):Math.round(H*.12),PAL.cyan,1,'c');
  /* messages */
  let y=Math.round(H*.3);
  for(let i=MSGS.length-1;i>=0;i--){const m=MSGS[i];m.a=APP.t-m.t0;if(m.a>m.k){MSGS.splice(i,1);continue;}
    const al=Math.round(255*clamp(Math.min(m.a*6,(m.k-m.a)*3),0,1)),big=i===MSGS.length-1&&tw5(m.t,1)<W*.8;
    otxt5(m.t,W/2,y,big?GR.steel:GR.steel.map(c=>((c&0xffffff)|(al<<24))>>>0),1,'c');y+=10;}
}
/* the words' canvas cleared (the menu over the picture), and painted afresh when the HUD comes back */
function txtClear(){const x=tCtx();if(!x)return;x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,TXT.cv.width,TXT.cv.height);TXT.last='#';TXT.prev=[];}
