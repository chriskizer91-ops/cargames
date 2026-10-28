/* =====================================================================================
   THE DOT-MATRIX HUD: the truck and where it is (top left), a map of the ranch (top right),
   Shiftlight 2's shift lights, tach, gear and speed (bottom right), what the truck is doing
   (bottom left), and messages in the middle.
   ===================================================================================== */
const MAPC={grass:[54,84,30],dirt:[120,70,38],strip:[176,140,100],trail:[150,104,62],rock:[112,96,84],mud:[46,32,18],concrete:[150,148,144],water:[60,120,190]};
let MAPBMP=null;
/* the map, drawn once at the size it is shown: surface colour shaded by slope, the trails picked out */
function mapBitmap(n){
  if(MAPBMP&&MAPBMP.n===n)return MAPBMP;
  const W=RANCH.W,span=760,px=new Uint32Array(n*n);
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){
    const x=-span/2+(i+.5)/n*span,z=-span/2+(j+.5)/n*span,g=W.groundAt(x,z),c=MAPC[g.surf]||MAPC.dirt,sh=.62+.5*clamp(g.n[0]*.6-g.n[2]*.5+g.n[1]*.5,0,1),hh=clamp(.8+g.y/120,.75,1.25);
    px[j*n+i]=pack(c[0]*sh*hh,c[1]*sh*hh,c[2]*sh*hh,235);}
  return MAPBMP={n,px,span};
}
function drawMap(x0,y0,size){
  const t=GAME.truck,n=size*HS,B=mapBitmap(n),X0=x0*HS,Y0=y0*HS;
  hRect(x0-1,y0-1,size+2,size+2,pack(0,0,0,200));
  for(let j=0;j<n;j++){const o=(Y0+j)*BW+X0;if(Y0+j<0||Y0+j>=BH)continue;for(let i=0;i<n;i++)HB[o+i]=B.px[j*n+i];}
  /* the truck: a blinking arrow pointing where it faces */
  const mx=x0+(t.p[0]+B.span/2)/B.span*size,my=y0+(t.p[2]+B.span/2)/B.span*size,F=mcol(qmat(t.q),0),fl=Math.hypot(F[0],F[2])||1,fx=F[0]/fl,fz=F[2]/fl;
  const col=(APP.t*4|0)%2?PAL.white:PAL.gold;
  hLine(mx-fx*2.5-fz*1.8,my-fz*2.5+fx*1.8,mx+fx*3,my+fz*3,col);hLine(mx-fx*2.5+fz*1.8,my-fz*2.5-fx*1.8,mx+fx*3,my+fz*3,col);hDisc(mx,my,1.1,col);
  hFrame(x0-1,y0-1,size+2,size+2,pack(255,255,255,60));
}
const tch0=()=>GAME.touch;
function drawHud(c){
  const t=GAME.truck,pt=t.pt,e=pt.e,b=BUILDS[APP.build],sc=W>=400?2:1,on=pt.st!=='off',rpm=on?Math.max(0,pt.rpmOut||0):0;
  /* top left: the truck, the place, the driving level */
  otxt5(b.name.toUpperCase(),5,5,GR.volt,sc,'l',.12);
  otxt3(GAME.place.toUpperCase(),5,7+7*sc+2,PAL.ink);
  otxt3(LEVELS.find(l=>l[0]===APP.level)[1].toUpperCase()+(APP.level==='kids'?' MODE':''),5,7+7*sc+10,APP.level==='kids'?PAL.cyan:APP.level==='middle'?PAL.amber:PAL.dim);
  /* top right: the map */
  const ms=Math.round(H*.27);drawMap(W-ms-5,13,ms);
  if(GAME.state!=='drive')return;
  /* shift lights, tach, gear, speed */
  engShiftLights(Math.round(W/2-45),tch0()?H-9:3,e,rpm,pt.running);
  /* with touch pedals in the bottom corners the instruments move up to the top middle */
  const tch=GAME.touch,r=Math.round(H*.15),cx=tch?Math.round(W/2+r+30):W-r-7,cy=tch?r+16:H-11;
  hDisc(cx,cy-r*.3,r*1.02,pack(4,3,8,150));engTach(cx,cy,r,e,rpm);
  const g=t.rev?'R':pt.shiftT>0?'-':String(pt.gear);otxt5(g,cx,cy-r+12,rpm>pt.upRpm[Math.min(pt.gear,e.nG)-1]-50?GR.cyan:GR.volt,2,'c');
  const sx=cx-r-47,sy=tch?cy-9:H-20;hRect(sx-3,sy,47,18,pack(4,3,8,150));
  seg7(String(Math.round(t.speed*2.237)).padStart(3,' '),sx,sy+3,11,PAL.white,pack(40,36,52),2);txt3('MPH',sx+29,sy+11,PAL.dim);
  let bx=sx-10;const by=tch?cy-26:H-36;
  if(e.fiBoost){const k=clamp((pt.boost||0)/(e.fiBoost*1.05),0,1);hRect(bx,by,4,28,pack(30,26,40));hRect(bx,by+28-Math.round(28*k),4,Math.round(28*k),e.sup?PAL.lime:PAL.amber);txt3('B',bx,by+30,PAL.dim);bx-=8;}
  if(e.nosKw){const k=clamp(pt.nos,0,1);hRect(bx,by,4,28,pack(30,26,40));hRect(bx,by+28-Math.round(28*k),4,Math.round(28*k),pt.nosOn&&(APP.t*10|0)%2?PAL.white:PAL.cyan);txt3('N',bx,by+30,PAL.dim);bx-=8;}
  /* bottom left: what the truck is doing */
  const can=t.c.diff.can,C=[['TC',pt.tcOn,PAL.green],['ABS',t.absOn,PAL.amber],['ESC',t.escOn,PAL.amber]];
  if(can.low)C.push(['LOW',t.low,PAL.amber]);if(can.r)C.push(['LOCK',t.locked,PAL.amber]);if(e.nosKw)C.push(['N2O',pt.nosOn,PAL.cyan]);C.push(['BANG',performance.now()-ENG.popT<140,PAL.red]);
  let x=4;const yc=GAME.touch?7+7*sc+20:H-7;for(const [s,v,col] of C){txt3(s,x,yc,v?col:pack(70,64,86));x+=tw3(s)+5;}
  if(!on){const msg=GAME.touch?'TAP GAS TO START':'PRESS W OR I TO START';if((APP.t*1.6|0)%2===0)otxt5(msg,W/2,H-26,GR.steel,1,'c');}
  else if(pt.st==='crank')otxt3('CRANKING',W/2,H-22,PAL.amber,1,'c');
  /* messages */
  let y=Math.round(H*.3);
  for(let i=GAME.msgs.length-1;i>=0;i--){const m=GAME.msgs[i];m.a=APP.t-m.t0;if(m.a>m.k){GAME.msgs.splice(i,1);continue;}
    const al=Math.round(255*clamp(Math.min(m.a*6,(m.k-m.a)*3),0,1)),big=i===GAME.msgs.length-1&&tw5(m.t,1)<W*.8;
    otxt5(m.t,W/2,y,big?GR.steel:GR.steel.map(c=>((c&0xffffff)|(al<<24))>>>0),1,'c');y+=10;}
}
