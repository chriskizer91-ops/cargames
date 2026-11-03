/* =====================================================================================
   FEATS: the cool things you do out there, what they pay, and the combo they make.
   Drifts, jumps, two wheels, saves from a near roll, speed runs on dirt and gravel, burnouts, close
   calls with the trees, splashes, and the ranch's own challenges (the mud pit, Red Hill, the rock garden,
   a lap of the track, the clock runs). Each one, when it ends, goes into the combo: the money stacks
   and the multiplier grows with every feat and more with every new kind. The combo banks once nothing
   has happened for a few seconds. End up off your wheels (or reset) before then and the unbanked money is lost.
   Stunts: anything from all four wheels leaving the ground (or the car going past 78 degrees over) until it is
   back on its wheels and settled. Everything on the way counts, whatever happens: the air, the full spins,
   flips and rolls, the trees and posts it clips. Hitting things doesn't end it; coming to rest does. Stopped on
   its wheels, without a reset, it's LANDED and pays (CLEAN, half as much again, if it came down upright and
   soft and stayed down); stopped on its side or roof it's BAILED, and the combo goes with it.
   Free play keeps your money as a score, your last ten cool things and your bests, on this device.
   Nothing here draws: it reads the car and the world and calls Feats.pop and Feats.buzz.
   ===================================================================================== */
const FEAT_DEFS={
  drift:{name:'Drift',col:'#ff5ab4'},air:{name:'Jump',col:'#4fe3ff'},two:{name:'Two wheels',col:'#ffb040'},save:{name:'Save',col:'#b8ff4a'},
  speed:{name:'Speed run',col:'#ffd84a'},burn:{name:'Burnout',col:'#ff6a3d'},close:{name:'Close call',col:'#a878ff'},splash:{name:'Splash',col:'#4fe3ff'},
  mudpit:{name:'Mud pit',col:'#c8a070'},summit:{name:'Summit',col:'#5dff7a'},rocks:{name:'Rock garden',col:'#cfd6e6'},lap:{name:'Lap',col:'#5dff7a'},run:{name:'Clock run',col:'#5dff7a'}};
const BANK_AFTER=2.6;
const LOOSE={dirt:1,gravel:1,trail:1,grass:1,ruts:1,mud:1,strip:1,rock:1};
const Feats=(()=>{
  const S={money:0,session:0,log:[],best:{},combo:null,live:{},lastHit:0,closeCd:new Map(),splashT:-9,saveTilt:0,saveT:0,
    pit:null,climb:null,rocks:null,wreckT:-9,t:0,q0:new Float64Array(4),qOk:false,pre:[0,0,0],g:new Float64Array(3),hasG:false,wait:false};
  const API={S,pop:(text,col,big)=>{},buzz:ms=>{},carName:()=>'',place:()=>'',racing:()=>false};
  /* ---------- saving: free play's score, last ten and bests ---------- */
  let KEY='rt-free';
  API.load=key=>{KEY=key||KEY;try{const d=JSON.parse(store.get(KEY,'{}'))||{};S.money=+d.money||0;S.log=Array.isArray(d.log)?d.log.slice(0,10):[];S.best=d.best&&typeof d.best==='object'?d.best:{};}catch(e){}};
  API.save=()=>store.set(KEY,JSON.stringify({money:Math.round(S.money),log:S.log,best:S.best}));
  API.clear=()=>{S.money=0;S.session=0;S.log=[];S.best={};API.save();};
  const fmtMoney=n=>'$'+NF.format(Math.round(n));API.fmtMoney=fmtMoney;
  /* a best: higher is better unless lower is set */
  function best(k,v,label,lower){const b=S.best[k];if(b&&(lower?v>=b.v:v<=b.v))return false;S.best[k]={v,label,car:API.carName(),at:Date.now()};return !!b;}
  /* ---------- the combo ---------- */
  function mult(c){return Math.min(6,1+.5*(c.kinds.size-1)+.15*(c.n-1));}
  function addFeat(kind,value,label,detail){
    value=Math.max(5,Math.round(value));
    if(!S.combo)S.combo={n:0,kinds:new Set(),pot:0,t:0,list:[]};
    const c=S.combo;c.n++;c.kinds.add(kind);c.pot+=value;c.t=0;c.list.push(label);
    API.pop(label+'  +'+fmtMoney(value),FEAT_DEFS[kind].col);
    S.pendingLog=S.pendingLog||[];S.pendingLog.push({kind,label,detail,value});
    API.buzz(18);
  }
  function bank(){
    const c=S.combo;S.combo=null;if(!c)return;const m=mult(c),tot=Math.round(c.pot*m);
    S.money+=tot;S.session+=tot;
    /* (in a career the feats pay a share into the career's money: 60_career) */
    const paid=API.onBank?API.onBank(tot):tot;
    API.pop((c.n>1?'COMBO x'+m.toFixed(1)+'  ':'')+'BANKED '+fmtMoney(paid),'#5dff7a',true);API.buzz([20,40,20]);
    /* the log keeps the best thing in each banked combo, or the combo itself */
    const top=(S.pendingLog||[]).sort((a,b)=>b.value-a.value)[0];
    const entry={what:c.n>1?`${c.n}-feat combo: ${c.list.slice(0,4).join(', ')}${c.n>4?'…':''}`:top?top.label:'Feat',money:tot,where:API.place(),car:API.carName(),at:Date.now(),kind:c.n>1?'combo':top&&top.kind};
    S.log.unshift(entry);S.log.length=Math.min(S.log.length,10);
    if(c.n>1)best('combo',tot,`${fmtMoney(tot)} combo (${c.n} feats, x${m.toFixed(1)})`);
    S.pendingLog=[];API.save();
  }
  API.bankNow=()=>{S.live={};bank();};
  /* rolled it, hit something hard, or reset with money on the table */
  API.wreck=why=>{
    S.live={};S.climb=null;S.rocks=null;S.pit=null;
    const c=S.combo;S.combo=null;S.pendingLog=[];S.wreckT=S.t;
    if(c&&c.pot>0){API.pop((why||'WRECKED')+'  LOST '+fmtMoney(c.pot*mult(c)),'#ff3d5a',true);API.buzz([60,40,60]);}
  };
  API.resetCar=()=>{if(S.combo)API.wreck('RESET');S.live={};S.climb=null;S.rocks=null;S.pit=null;S.hasG=false;S.qOk=false;S.wait=false;S.pre[0]=S.pre[1]=S.pre[2]=0;};
  /* ---------- reading the car ---------- */
  function frame(t){
    const M=t.M,U=[M[1],M[4],M[7]],Rt=[M[2],M[5],M[8]];
    let nC=0,left=0,right=0,surf={},driven=0,spin=0;
    for(const w of t.wheels){if(w.contact){nC++;if(w.left)left++;else right++;surf[w.surf]=(surf[w.surf]||0)+1;}}
    for(const k of t.pt.drv){const w=t.wheels[k];if(w.contact){spin+=w.slipV;driven++;}}
    let top='',n=0;for(const k in surf)if(surf[k]>n){n=surf[k];top=k;}
    return {U,Rt,up:U[1],roll:Math.asin(clamp(Rt[1],-1,1)),nC,left,right,surf:top,spin:driven?spin/driven:0,v:t.speed,vf:t.vf,beta:t.beta,air:t.air,airT:t.airT};
  }
  /* (is anything going on: the banking waits while it is) */
  const any=o=>{for(const k in o)return true;return false;};
  /* ---------- the ground feats' endings: each pays what it came to (also when a stunt cuts it short) ---------- */
  function endDrift(){const d=S.live.drift;if(!d)return;delete S.live.drift;if(d.t<=.9)return;const ang=Math.round(d.max*57.3),val=d.score*14;
    addFeat('drift',val,`DRIFT ${ang}° ${d.t.toFixed(1)} S`,{deg:ang,s:d.t,m:d.dist});if(best('drift',d.t,`${d.t.toFixed(1)} s drift at up to ${ang}°`))API.pop('LONGEST DRIFT','#ff5ab4');}
  function endTwo(){const w=S.live.two;if(!w)return;delete S.live.two;if(w.m<=6)return;addFeat('two',w.m*9,`TWO WHEELS ${Math.round(w.m)} M`,{m:w.m});
    if(best('two',w.m,`${Math.round(w.m)} m on two wheels`))API.pop('LONGEST ON TWO WHEELS','#ffb040');}
  function endBurn(){const b=S.live.burn;if(!b)return;delete S.live.burn;if(b.t<=1.5)return;addFeat('burn',b.t*35,`BURNOUT ${b.t.toFixed(1)} S`,{s:b.t});
    if(best('burn',b.t,`${b.t.toFixed(1)} s burnout`))API.pop('LONGEST BURNOUT','#ff6a3d');}
  /* ---------- one frame ---------- */
  API.step=(dt,t,ev,W)=>{
    S.t+=dt;const f=frame(t),L=S.live,now=S.t;
    if(now-S.wreckT<1){S.hasG=false;S.qOk=false;return;}
    /* a quad's rider thrown off: that's a bail, whatever the machine does next */
    if(t.lean&&t.lean.bail){if(L.stunt||S.combo&&S.combo.pot>0)API.wreck('BAILED');S.qOk=false;return;}
    /* (a hard hit on its own no longer costs the combo: only ending up off the wheels does, in the stunt) */
    const live=stunt(dt,t,f,ev,W,now);
    /* the feats on the ground wait while a stunt is going */
    if(!live){
    /* --- drift: sideways on purpose, at speed, on the ground --- */
    const sideways=!f.air&&f.vf>6&&f.nC>=3&&Math.abs(f.beta)>.3&&!t.rev;
    if(sideways){const d=L.drift||(L.drift={t:0,max:0,score:0,low:0,dist:0});d.t+=dt;d.low=0;d.max=Math.max(d.max,Math.abs(f.beta));d.score+=(Math.abs(f.beta)-.22)*f.v*dt;d.dist+=f.v*dt;}
    else if(L.drift){const d=L.drift;d.low+=dt;if(Math.abs(f.beta)>.2&&!f.air&&f.v>5&&d.low<.6){d.t+=dt;}else endDrift();}
    /* --- two wheels: one side up, the other rolling --- */
    const twoUp=!f.air&&f.v>3&&(f.left===2&&f.right===0||f.right===2&&f.left===0)&&Math.abs(f.roll)>.2;
    if(twoUp){const w=L.two||(L.two={m:0,off:0});w.m+=f.v*dt;w.off=0;}
    else if(L.two){const w=L.two;w.off+=dt;if(w.off>.25)endTwo();}
    /* --- the save: tipped past 40 degrees and brought back --- */
    if(f.up<.77&&f.up>.3&&f.v>2){S.saveTilt=Math.max(S.saveTilt,1-f.up);S.saveT=now;}
    else if(S.saveTilt&&f.up>.96&&!f.air){if(now-S.saveT<3){const deg=Math.round(Math.acos(1-S.saveTilt)*57.3);addFeat('save',120+deg*4,`SAVED IT ${deg}°`,{deg});}S.saveTilt=0;}
    else if(S.saveTilt&&now-S.saveT>3)S.saveTilt=0;
    /* --- speed run: flat out on loose ground --- */
    /* (not in a race: every lap of the oval would be one) */
    const fast=f.v>22.35&&(LOOSE[f.surf]||f.air)&&!API.racing();
    if(fast){const r=L.speed||(L.speed={m:0,t:0,slow:0,surf:{}});r.m+=f.v*dt;r.t+=dt;r.slow=0;if(f.surf)r.surf[f.surf]=(r.surf[f.surf]||0)+dt;}
    else if(L.speed){const r=L.speed;r.slow+=dt;if(f.v>20.1&&(LOOSE[f.surf]||f.air)&&r.slow<1.2){r.m+=f.v*dt;r.t+=dt;}else if(r.slow>1){delete L.speed;
      if(r.m>200){const mph=r.m/r.t*2.237,s=Object.entries(r.surf).sort((a,b)=>b[1]-a[1])[0],nm=s?{gravel:'GRAVEL',dirt:'DIRT',trail:'TRAIL',grass:'GRASS',mud:'MUD',ruts:'MUD',strip:'DIRT',rock:'ROCK'}[s[0]]||'DIRT':'DIRT';
        addFeat('speed',r.m*.3*(mph/50)**2,`${nm} RUN ${(r.m/1609).toFixed(2)} MI @ ${Math.round(mph)}`,{m:r.m,mph});
        if(best('speed',r.m,`${(r.m/1609).toFixed(2)} mi on ${nm.toLowerCase()} at ${Math.round(mph)} mph`))API.pop('LONGEST SPEED RUN','#ffd84a');}}}
    /* --- burnout: tyres spinning hard, going nowhere --- */
    if(f.v<2.5&&!f.air&&f.nC>=3&&f.spin>7&&t.pt.running){const b=L.burn||(L.burn={t:0,off:0});b.t+=dt;b.off=0;}
    else if(L.burn){const b=L.burn;b.off+=dt;if(b.off>.5)endBurn();}
    }
    /* --- close call: past a tree or a post at speed, within a metre and not touching --- */
    if(f.v>13.4&&W.colliders&&now-S.lastHit>.6){
      if(ev&&ev.wall>.5)S.lastHit=now;
      else{const D=t.c.body,hl=D.L/2,hw=D.W/2,F=[t.M[0],t.M[3],t.M[6]],Rt=[t.M[2],t.M[5],t.M[8]];
        for(const c of W.colliders.near(t.p[0],t.p[2])){if(c.t!=='c'||c.r>2.5)continue;const dx=c.x-t.p[0],dz=c.z-t.p[2],ax=dx*F[0]+dz*F[2],az=dx*Rt[0]+dz*Rt[2];
          if(Math.abs(ax)>hl+.5)continue;const gap=Math.abs(az)-hw-c.r;
          if(gap>0&&gap<1.1){const k=Math.round(c.x*10)*100003+Math.round(c.z*10);if(now-(S.closeCd.get(k)||-99)>8){S.closeCd.set(k,now);addFeat('close',(30+f.v*3)*(1.3-gap),`CLOSE CALL ${Math.round(gap*100)} CM`,{cm:gap*100});}}}}}
    /* --- splash: into the water at speed --- */
    if(f.surf==='water'&&f.v>11&&now-S.splashT>4){S.splashT=now;addFeat('splash',f.v*6,`SPLASH ${Math.round(f.v*2.237)} MPH`,{mph:f.v*2.237});}
    /* --- the ranch's own challenges --- */
    if(W.D)challenges(dt,t,f,ev,W,now);
    /* --- banking: nothing going on for a few seconds --- */
    if(S.combo){if(any(L))S.combo.t=0;else if((S.combo.t+=dt)>BANK_AFTER)bank();}
  };
  /* (the car moved where the feats weren't watching, behind a result screen or a reset: the next turn read starts afresh) */
  API.unsync=()=>{S.qOk=false;};
  /* ---------- stunts ---------- */
  /* the car's turn since the last frame, in its own frame (forward x: rolls; up y: spins; across z: flips), from
     its orientation then and now (exact for anything under half a turn a frame: the physics caps a tumble at
     about six turns a second, and a frame at eight steps) */
  const DQ=new Float64Array(3);
  function turned(t){
    const a=S.q0,b=t.q;if(!S.qOk){a.set(b);S.qOk=true;DQ[0]=DQ[1]=DQ[2]=0;return DQ;}
    const ax=-a[0],ay=-a[1],az=-a[2],aw=a[3];
    let w=aw*b[3]-ax*b[0]-ay*b[1]-az*b[2],x=aw*b[0]+ax*b[3]+ay*b[2]-az*b[1],y=aw*b[1]-ax*b[2]+ay*b[3]+az*b[0],z=aw*b[2]+ax*b[1]-ay*b[0]+az*b[3];
    if(w<0){w=-w;x=-x;y=-y;z=-z;}const sn=Math.sqrt(x*x+y*y+z*z),ang=2*Math.atan2(sn,w),k=sn>1e-9?ang/sn:2;
    DQ[0]=x*k;DQ[1]=y*k;DQ[2]=z*k;a.set(b);return DQ;}
  /* full turns about one axis, a little short of a whole one still counting (about 30 degrees) */
  const TAU2=2*Math.PI,turns=a=>Math.floor((Math.abs(a)+.5)/TAU2),pl=(n,one,many)=>n+' '+(n===1?one:many);
  function turnWords(fl,ro,sp){const w=[];if(fl)w.push(pl(fl,'FLIP','FLIPS'));if(ro)w.push(pl(ro,'ROLL','ROLLS'));if(sp)w.push(pl(sp,'SPIN','SPINS'));return w;}
  /* one frame of a stunt: started, carried on or finished. True while one is going */
  function stunt(dt,t,f,ev,W,now){
    const L=S.live,on=f.nC>=3&&f.up>.8,rest=!!(ev&&(ev.gsurf||ev.ground>.3));let st=L.stunt;
    if(!st){
      const d=turned(t);
      if(on)S.wait=false;
      /* the turning since it left its wheels (in the air, or going over), so the start of a roll or a spin counts too */
      if(!on&&(f.air||f.up<.5)){S.pre[0]+=d[0];S.pre[1]+=d[1];S.pre[2]+=d[2];}else S.pre[0]=S.pre[1]=S.pre[2]=0;
      if(!f.air){S.g[0]=t.p[0];S.g[1]=t.p[1];S.g[2]=t.p[2];S.hasG=true;}
      /* it starts off all four wheels for a fifth of a second with the body not on the ground either (hung up on its
         belly isn't flying), or going over past 78 degrees; and not again until it has been back on its wheels after
         a bail or a hang-up */
      if(S.wait||!(f.air&&f.airT>.2&&!rest||f.up<.2))return false;
      const g=S.hasG?S.g:t.p;
      st=L.stunt={t:0,air:0,h:0,p0:[g[0],g[1],g[2]],rot:S.pre.slice(),hits:0,hitT:-9,land:0,set:0,stop:0,touch:null,bounce:0,tilt:0,hk:-1,hud:''};
      S.pre[0]=S.pre[1]=S.pre[2]=0;endDrift();endTwo();endBurn();S.saveTilt=0;}
    else{const d=turned(t);
      /* turns count while it's off its wheels; once it has touched down, only while it's really off them (a wheel or
         none down, or past 60 degrees over): a spin-out on two wheels after landing is the landing, not the stunt */
      if(st.touch?f.nC<=1||f.up<.5:!on){st.rot[0]+=d[0];st.rot[1]+=d[1];st.rot[2]+=d[2];}}
    st.t+=dt;st.tilt=Math.max(st.tilt,1-f.up);
    /* things it clips on the way (trees, posts, walls; not the other cars in a race), until it's down on its wheels */
    if(ev){st.land=Math.max(st.land,ev.land||0);if(ev.wall>1.5&&!ev.car&&!on&&now-st.hitT>.3){st.hits++;st.hitT=now;}}
    /* the flight is up to the first touch of the ground (a wheel or the body): how long, how high, how far. After
       that it's bouncing and tumbling, which still counts for the turns and the clips but not as air */
    if(!st.touch&&(!f.air||rest))st.touch={up:f.up,x:t.p[0],z:t.p[2]};
    if(!st.touch&&f.air){st.air=f.airT;const gy=W.heightAt(t.p[0],t.p[2]);st.h=Math.max(st.h,t.p[1]-t.c.hcg-gy);}
    /* back on its wheels: three or four of them down and upright; every time it comes off them again after a touch
       down is a bounce */
    if(on)st.set+=dt;else{if(st.set>0)st.bounce++;st.set=0;}
    st.stop=!on&&f.v<1?st.stop+dt:0;
    if(on&&st.set>=.5){delete L.stunt;landed(st,t);return false;}
    /* at rest on its side or roof for a second: bailed (Kids turns it back over at 1.2). At rest upright but not on
       its wheels, hung up on something: just over, nothing paid. Either way not again until it's back on its wheels */
    if(st.stop>1){delete L.stunt;S.wait=true;
      if(f.up<.5){const why=st.air<.2?'ROLLED IT':'BAILED',had=S.combo&&S.combo.pot>0;API.wreck(why);if(!had)API.pop(why,'#ff3d5a');}
      return false;}
    /* (forty seconds without either: let it go) */
    if(st.t>40){delete L.stunt;S.wait=true;return false;}
    return true;
  }
  /* landed: what it was worth. The air (distance, time, height), each full flip, roll and spin, each thing clipped
     on the way, then half as much again for a clean one: down upright and soft first time, stayed down, nothing hit */
  function landed(st,t){
    const [r,y,p]=st.rot;let fl=turns(p),ro=turns(r),sp=turns(y);
    /* (a spin done nose up reads partly as a roll: the whole turn, all axes together, is credited to the main one) */
    const tot=turns(Math.sqrt(r*r+y*y+p*p)),miss=tot-fl-ro-sp;
    if(miss>0){const ap=Math.abs(p),ar=Math.abs(r),ay=Math.abs(y);if(ap>=ar&&ap>=ay)fl+=miss;else if(ar>=ay)ro+=miss;else sp+=miss;}
    const w=turnWords(fl,ro,sp),e=st.touch||{x:t.p[0],z:t.p[2]},dist=Math.hypot(e.x-st.p0[0],e.z-st.p0[2]),air=st.air>.45;
    const clean=!st.hits&&st.touch&&st.touch.up>.9&&st.land<8&&st.bounce===0;
    const grade=clean?'CLEAN':'LANDED',hit=st.hits?(st.hits===1?'CLIPPED ONE':'CLIPPED '+st.hits):'';
    /* no air and no turns: a tip past 78 degrees and back is a save (and anything it clipped on the way) */
    if(!air&&!w.length){const deg=Math.round(Math.acos(Math.max(-1,1-st.tilt))*57.3);
      if(deg>78)addFeat('save',120+deg*4+st.hits*50,`SAVED IT ${deg}°${hit?' '+hit:''}`,{deg,hits:st.hits});
      else if(st.hits)addFeat('air',st.hits*50,`${hit} ${grade}`,{hits:st.hits,grade});
      return;}
    let val=(air?dist*4+st.air*70+st.h*25:0)+fl*300+ro*220+sp*120+st.hits*50;if(clean)val*=1.5;
    const label=w.length?[...w,hit,air?st.air.toFixed(1)+' S':'',grade].filter(Boolean).join(' '):`JUMP ${Math.round(dist)} M ${st.air.toFixed(1)} S${hit?' '+hit:''} ${grade}`;
    addFeat('air',val,label,{m:dist,s:st.air,h:st.h,grade,spins:sp,flips:fl,rolls:ro,hits:st.hits});
    if(air){if(best('jump',dist,`${Math.round(dist)} m jump, ${st.air.toFixed(1)} s in the air`))API.pop('LONGEST JUMP','#4fe3ff');best('airtime',st.air,`${st.air.toFixed(2)} s in the air`);}
    if(w.length&&best('stunt',Math.round(val),`${w.join(', ').toLowerCase()}${hit?', '+hit.toLowerCase():''}, ${grade.toLowerCase()} (${fmtMoney(val)})`))API.pop('BIGGEST STUNT','#4fe3ff');
    API.buzz(Math.min(80,20+st.land*5));
  }
  /* the HUD's line for a stunt going on: remade only when a whole turn or a tenth of a second of air changes */
  function stuntLine(st){
    const [r,y,p]=st.rot,fl=Math.floor(Math.abs(p)/TAU2),ro=Math.floor(Math.abs(r)/TAU2),sp=Math.floor(Math.abs(y)/TAU2),a=Math.round(st.air*10),k=((fl*97+ro)*97+sp)*1e4+a;
    if(k!==st.hk){st.hk=k;const w=turnWords(fl,ro,sp);st.hud=(st.air>.2?'AIR '+(a/10).toFixed(1)+' S':'OVER')+(w.length?'  '+w.join(' '):'');}
    return st.hud;}
  function challenges(dt,t,f,ev,W,now){
    const D=W.D,x=t.p[0],z=t.p[2];
    /* the mud pit: in one side and out the other without getting stuck */
    const M=D.mud,e=Math.hypot((x-M.x)/M.rx,(z-M.z)/M.rz);
    if(e<1&&!S.pit)S.pit={x0:x,t:0,stuck:0};
    if(S.pit){const p=S.pit;p.t+=dt;if(f.v<.8)p.stuck+=dt;else p.stuck=Math.max(0,p.stuck-dt*.5);
      if(e>1.15){if(Math.sign(x-M.x)!==Math.sign(p.x0-M.x)&&Math.abs(x-p.x0)>M.rx*1.4){const clean=p.stuck<1.5;
          addFeat('mudpit',(120+Math.max(0,30-p.t)*8)*(clean?1.4:1),`MUD PIT ${p.t.toFixed(1)} S${clean?' NO STOPS':''}`,{s:p.t});
          if(best('mudpit',p.t,`Mud pit in ${p.t.toFixed(1)} s`,true))API.pop('BEST MUD PIT TIME','#c8a070');}
        S.pit=null;}}
    /* Red Hill: from the foot of the climb to the top */
    const C=W.climb,n=C.nearest(x,z,2),HL=D.hill,top=Math.hypot(x-HL.x,z-HL.z)<22;
    if(n&&n.d<10&&n.s<25&&!S.climb)S.climb={t:0};
    if(S.climb){const c=S.climb;c.t+=dt;if(c.t>240)S.climb=null;else if(top){S.climb=null;
      addFeat('summit',200+Math.max(0,90-c.t)*5,`SUMMIT ${c.t.toFixed(1)} S`,{s:c.t});if(best('summit',c.t,`Red Hill in ${c.t.toFixed(1)} s`,true))API.pop('BEST HILL CLIMB','#5dff7a');}}
    /* the rock garden: west side to east side, counting the body's hits on the rocks */
    const R=D.rocks,inR=x>R.x0&&x<R.x0+R.w&&z>R.z0&&z<R.z0+R.d;
    if(inR&&!S.rocks&&x<R.x0+6)S.rocks={t:0,hits:0,hitT:0};
    if(S.rocks){const r=S.rocks;r.t+=dt;if(ev&&ev.ground>1.2&&now-r.hitT>.5){r.hits++;r.hitT=now;}
      if(!inR&&x>R.x0+R.w-1){S.rocks=null;const clean=r.hits===0;addFeat('rocks',(220+Math.max(0,60-r.t)*4)*(clean?1.6:Math.max(.4,1-r.hits*.1)),`ROCK GARDEN ${r.t.toFixed(1)} S ${clean?'CLEAN':r.hits+' HITS'}`,{s:r.t,hits:r.hits});
        if(clean&&best('rocks',r.t,`Rock garden clean in ${r.t.toFixed(1)} s`,true))API.pop('BEST CLEAN ROCK RUN','#cfd6e6');}
      else if(!inR&&(x<R.x0-2||z<R.z0-4||z>R.z0+R.d+4))S.rocks=null;}
  }
  /* prize money (a race): straight into the bank and the log, not the combo */
  API.award=(what,money)=>{S.money+=money;S.session+=money;S.log.unshift({what,money,where:API.place(),car:API.carName(),at:Date.now(),kind:'race'});S.log.length=Math.min(S.log.length,10);
    API.pop('PRIZE '+fmtMoney(money),'#5dff7a',true);API.save();};
  /* a lap of the track or a clock run, from the game's timers */
  API.timed=(kind,label,val,detail,bestKey,bestVal,bestLabel)=>{addFeat(kind,val,label,detail);if(bestKey&&best(bestKey,bestVal,bestLabel,true))API.pop('NEW BEST','#5dff7a');};
  /* what the HUD shows: the feats going on now, and the combo */
  API.hud=()=>{
    const L=S.live,out=[];
    if(L.drift&&L.drift.t>.4)out.push(['DRIFT '+Math.round(Math.abs(L.drift.max)*57.3)+'°',FEAT_DEFS.drift.col,L.drift.score*14]);
    if(L.stunt&&L.stunt.t>.35)out.push([stuntLine(L.stunt),FEAT_DEFS.air.col,0]);
    if(L.two&&L.two.m>3)out.push(['TWO WHEELS '+Math.round(L.two.m)+' M',FEAT_DEFS.two.col,L.two.m*9]);
    if(L.speed&&L.speed.m>60)out.push(['SPEED RUN '+(L.speed.m/1609).toFixed(2)+' MI',FEAT_DEFS.speed.col,0]);
    if(L.burn&&L.burn.t>.6)out.push(['BURNOUT '+L.burn.t.toFixed(1)+' S',FEAT_DEFS.burn.col,L.burn.t*35]);
    const c=S.combo;return {live:out,combo:c?{n:c.n,pot:c.pot,mult:mult(c),bank:clamp(c.t/BANK_AFTER,0,1)}:null};
  };
  return API;
})();
