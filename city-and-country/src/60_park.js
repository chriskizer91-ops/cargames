/* =====================================================================================
   THE PARK'S CLOCKS. Laps on the three circuits (Speedway 25, the short course and the mud track): over the
   line, past the checkpoints a third and two thirds of the way round, over the line again, and the time is
   kept, the best for each car and driving level. And runs down the drag strip: roll up to the line in either
   lane and stop with the nose on it, the tree counts down (three ambers half a second apart, then green), and
   the slip gives the reaction time, the 60 foot, the 330 foot, the eighth mile and the speed through it. The car
   is held on its brakes while the tree counts (60_game); flooring it before the green is a red light: the run is
   timed, but it doesn't count as a best.
   ===================================================================================== */
const PARKT={trk:null,on:null,s:-1,t0:0,cp:0,offT:0,last:null,lastT:-99,best:{},
  dr:{st:'',lane:0,t:0,still:0,foul:false,rt:null,t60:null,t330:null,et:null,mph:null,tLeave:0,px:0,slip:null,slipT:-99}};
try{PARKT.best=JSON.parse(store.get('cc-park','{}'))||{};}catch(e){}
const parkSave=()=>store.set('cc-park',JSON.stringify(PARKT.best));
const parkKey=id=>id+':'+BUILDS[APP.bi].id+':'+APP.level;
const PK_TREE=1.5,PKN={};
function parkReset(){PARKT.on=null;PARKT.trk=null;PARKT.s=-1;PARKT.dr.st='';PARKT.dr.still=0;}
/* the circuit the car is on, if it's on one */
function parkTrackAt(x,z){const K=WG.PKW;
  for(const T of K.TRACKS){const b=T.P.bb;if(x<b[0]-30||x>b[2]+30||z<b[1]-30||z>b[3]+30)continue;if(K.near(T.P,x,z,PKN).d<T.hw+5)return T;}
  return null;}
function parkStep(dt,t){
  if(WG.parkD(t.p[0],t.p[2])>60){if(PARKT.on||PARKT.dr.st)parkReset();return;}
  parkLaps(dt,t);parkDrag(dt,t);}
/* ---------- laps ---------- */
function parkLaps(dt,t){
  const K=WG.PKW,P=PARKT,T=parkTrackAt(t.p[0],t.p[2]);
  if(!T){if(P.on&&(P.offT+=dt)>6){say('LAP ABANDONED',1.6);P.on=null;}P.s=-1;P.trk=null;return;}
  if(P.trk!==T){P.trk=T;P.s=-1;if(P.on&&P.on!==T)P.on=null;}
  P.offT=0;const s=K.near(T.P,t.p[0],t.p[2],PKN).s,L=T.P.len,p=P.s;P.s=s;if(p<0)return;
  if(p>L-40&&s<40){
    if(P.on===T&&P.cp>=2){const lt=GAME.time-P.t0,k=parkKey(T.id),b=P.best[k],nb=!b||lt<b;
      if(nb){P.best[k]=lt;parkSave();}P.last={id:T.id,name:T.name,t:lt,best:nb&&!!b};P.lastT=APP.t;
      Feats.timed('lap',`LAP ${fmtLap(lt)}${b&&lt<b?' BEST':''}`,120+Math.max(0,L/14-lt)*6,{s:lt},'lap:'+T.id,lt,`${T.name} lap ${fmtLap(lt)}`);}
    else if(P.on!==T)say(T.name.toUpperCase()+': LAP STARTED',1.8);
    P.on=T;P.t0=GAME.time;P.cp=0;}
  else if(p<40&&s>L-40){if(P.on===T){P.on=null;say('WRONG WAY',1.4,PAL.amber);}}
  if(P.on===T){if(P.cp===0&&p<L/3&&s>=L/3)P.cp=1;else if(P.cp===1&&p<2*L/3&&s>=2*L/3)P.cp=2;}
}
/* ---------- the drag strip ---------- */
function parkDrag(dt,t){
  const S=WG.PKW.ST,D=PARKT.dr,M=t.M,F=[M[0],M[3],M[6]],cd=carD(t),front=t.p[0]+F[0]*(cd.L/2-t.cg[0]),z=t.p[2],sx=front-S.start,v=t.speed||0;
  const lane=Math.abs(z-S.lanes[0])<Math.abs(z-S.lanes[1])?0:1,inLane=Math.abs(z-S.lanes[lane])<1.9&&F[0]>.9;
  /* staged: nose on the line, stopped, in a lane, facing down the strip */
  if(D.st===''||D.st==='done'){
    if(D.st==='done'&&sx>-2&&sx<S.eighth+40&&Math.abs(z-S.z)<S.half+3&&v>.5)return;
    if(inLane&&sx>-1.4&&sx<=.08&&Math.abs(v)<.35){D.still+=dt;
      if(D.still>.6){Object.assign(D,{st:'tree',t:0,lane,foul:false,rt:null,t60:null,t330:null,et:null,mph:null,px:sx,x0:sx});say('STAGED',1.1);}}
    else{D.still=0;if(D.st==='done'&&(sx<-3||Math.abs(z-S.z)>S.half+3))D.st='';}
    return;}
  /* the tree and the run: times at the crossings, put between this frame and the last */
  const t0=D.t;D.t+=dt;const px=D.px;D.px=sx;
  if(Math.abs(z-S.z)>S.half+2||F[0]<.4||sx<-6){D.st='';D.still=0;say('RUN ABANDONED',1.4);return;}
  const cross=x=>px<x&&sx>=x?t0+dt*(x-px)/Math.max(1e-6,sx-px):null;
  if(D.st==='tree'&&D.t>=PK_TREE)D.st='run';
  /* (the run is measured from where the nose was staged: leaving is the first 15 cm, then 60 ft, 330 ft, the eighth) */
  if(D.rt===null){const c=cross(D.x0+.15);if(c!==null){D.tLeave=c;D.rt=c-PK_TREE;if(!D.foul&&D.rt<0){D.foul=true;say('RED LIGHT',1.8,PAL.red);}if(D.st==='tree')D.st='run';}
    else if(D.st==='run'&&D.t>PK_TREE+8){D.st='';D.still=0;say('RUN ABANDONED',1.4);}
    return;}
  const c60=cross(D.x0+18.288),c330=cross(D.x0+100.584),c8=cross(D.x0+S.eighth);
  if(D.t60===null&&c60!==null)D.t60=c60-D.tLeave;if(D.t330===null&&c330!==null)D.t330=c330-D.tLeave;
  if(c8!==null){D.et=c8-D.tLeave;D.mph=v*2.237;D.st='done';D.still=0;parkDragDone(D);}
}
function parkDragDone(D){
  const k=parkKey('drag'),b=PARKT.best[k],nb=!D.foul&&(!b||D.et<b);if(nb){PARKT.best[k]=D.et;parkSave();}
  D.slip={rt:D.rt,t60:D.t60,t330:D.t330,et:D.et,mph:D.mph,foul:D.foul,best:nb&&!!b,lane:D.lane};D.slipT=APP.t;
  const lbl=`1/8 MILE ${D.et.toFixed(3)} @ ${Math.round(D.mph)} MPH`;
  if(D.foul)say(lbl+' (RED LIGHT)',3,PAL.red);
  else Feats.timed('run',lbl,100+Math.max(0,16-D.et)*30,{s:D.et},'drag',D.et,`Eighth mile in ${D.et.toFixed(3)} s at ${Math.round(D.mph)} mph`);
}
/* ---------- on the HUD: the lap clock; the tree; the slip ---------- */
function drawParkHud(lx,sc){
  if(RACE.on)return;const P=PARKT,D=P.dr,tch=GAME.touch;let y=7+7*sc+(tch?40:30);
  if(P.on){const lt=GAME.time-P.t0,b=P.best[parkKey(P.on.id)];
    otxt3(P.on.name.toUpperCase(),lx,y,PAL.dim);otxt5(fmtLap(lt),lx,y+7,GR.volt,1);if(b)otxt3('BEST '+fmtLap(b),lx,y+17,PAL.dim);y+=26;}
  if(P.last&&APP.t-P.lastT<5){otxt3('LAST LAP '+fmtLap(P.last.t)+(P.last.best?'  NEW BEST':''),lx,y,P.last.best?PAL.green:PAL.ink);y+=8;}
  /* the tree: a lane's three ambers, then green (red if it went early) */
  if(D.st==='tree'||(D.st==='run'&&D.t<PK_TREE+1.2)){const cx=Math.round(W/2),cy=Math.round(H*(tch?.32:.24)),go=D.t>=PK_TREE,on=Math.min(3,Math.floor(D.t/.5)+1);
    hRect(cx-8,cy-8,16,44,pack(4,3,8,190));
    for(let k=0;k<3;k++)hDisc(cx,cy-2+k*9,3.6,go||k<on?PAL.amber:pack(40,30,30,255));
    hDisc(cx,cy+25,3.6,go&&!D.foul?PAL.green:pack(30,40,30,255));if(D.foul)hDisc(cx,cy+33,3.6,PAL.red);
    if(!go&&inputThr()>.2&&!D.foul)otxt3('OFF THE GAS UNTIL GREEN',cx,cy+40,PAL.amber,1,'c');}
  if(D.st==='run'&&D.rt!==null){otxt3('DRAG STRIP',lx,y,PAL.dim);otxt5((D.t-D.tLeave).toFixed(2),lx,y+7,GR.volt,1);otxt3('RT '+D.rt.toFixed(3),lx,y+17,D.foul?PAL.red:PAL.ink);y+=26;}
  /* the time slip */
  if(D.slip&&APP.t-D.slipT<9){const s=D.slip,b=P.best[parkKey('drag')],f=v=>v===null?'--':v.toFixed(3),rows=[['R/T',f(s.rt)],["60'",f(s.t60)],["330'",f(s.t330)],['1/8',f(s.et)],['MPH',s.mph.toFixed(1)]];
    const w=74,h=12+rows.length*8+(b?8:0),x=tch?Math.round(W/2-w/2):W-w-8,yy=tch?Math.round(H*.2):Math.round(H*.32);
    hRect(x,yy,w,h,pack(4,3,8,200));otxt3(s.foul?'RED LIGHT':s.best?'NEW BEST':'TIME SLIP',x+w/2,yy+3,s.foul?PAL.red:s.best?PAL.green:PAL.amber,1,'c');
    rows.forEach(([k,v],i)=>{txt3(k,x+5,yy+12+i*8,PAL.dim);txt3(v,x+w-5-tw3(v),yy+12+i*8,PAL.white);});
    if(b)txt3('BEST '+b.toFixed(3),x+5,yy+12+rows.length*8,PAL.dim);}
}
