/* =====================================================================================
   THE SHOWROOM: Dirt Sleeper Mini's model bay, as Back Forty's opening screen and its garage.
   The stage below is the bay's own (80_bay_stage.js), its house name now BACK FORTY; the studios are lit
   by 13_lit's studioEnv (stages 1 and 2), the open world being stage 3.
   ===================================================================================== */
/* =====================================================================================
   THE STAGE — two photo studios. The dark bay is the Shiftlight garage: a glossy floor, a
   turntable, an infinity cove ringed with tall strip lights and an LED line at its foot. The
   light cyc is a pale grey seamless wall, like the backdrop on the concept sheets.
   ===================================================================================== */
const STAGES={
  dark:{id:1,sun:[0,1,0],sunCol:[0,0,0],sky:lin('#3a3a4c',.34),gnd:lin('#1c1c22',.24),fog:lin('#06060a'),fogD:.016,
    lights:[[3.6,5.4,3.2,16,[1,.95,.88],2.6],[-4.2,4,-3.6,15,[.75,.82,1],1.3],[-5.6,2.3,4.4,12,[1,.35,.5],1.15],[5.6,2.3,-4.8,12,[.35,.75,1],1.3],[0,6.4,0,11,[1,1,1],1.2],[0,1.2,7,9,[1,.97,.92],.7]],
    /* the garage keeps the turntable's key, rim and top lights and hangs three over the parked cars */
    garage:[0,1,2,3,4],rowLight:[[1,.95,.86],2.4]},
  light:{id:2,sun:V3.norm([.45,.85,.35]),sunCol:lin('#fff4e6',1.25),sky:lin('#c9c7c3',.62),gnd:lin('#8e8a85',.42),fog:lin('#bdbab5'),fogD:.0035,
    lights:[[4,4.5,4,14,[1,.97,.92],1.0],[-5,3,-3,14,[.85,.9,1],.6],[0,6,0,10,[1,1,1],.6]],
    garage:[0,1,2],rowLight:[[1,.97,.92],.8]}
};
/* ---------- the garage: the same shed made big enough to park every car round the back of it ---------- */
const SHED={sc:1.45,R:12,step:.235,RF:7.2,stepF:.4};
/* a car's bay: spread in an arc behind the turntable, nose in toward it. th is the bay's direction
   from the middle in the camera's terms (0 is +X, turning toward -Z); yaw turns the car to face in */
/* Back Forty: the cars, the tractor and the semi in the back row; the quads, the side-by-side, the golf cart and the
   kart in a front row nearer the turntable (they are low, and the cars still show over them) */
const shedBack=()=>CARS.filter(([c])=>!MACH[c]||MACH[c].kind==='tractor'||MACH[c].kind==='semi');
const shedFront=()=>CARS.filter(([c])=>MACH[c]&&MACH[c].kind!=='tractor'&&MACH[c].kind!=='semi');
function spotOf(car){const B=shedBack(),k=B.findIndex(c=>c[0]===car);
  if(k>=0){const th=PI+(k-(B.length-1)/2)*SHED.step;return {th,yaw:th+PI,p:[SHED.R*Math.cos(th),0,-SHED.R*Math.sin(th)]};}
  const F=shedFront(),j=F.findIndex(c=>c[0]===car),th=PI+(j-(F.length-1)/2)*SHED.stepF;
  return {th,yaw:th+PI,p:[SHED.RF*Math.cos(th),0,-SHED.RF*Math.sin(th)]};}
function stageLights(S,garage){
  if(!garage)return S.lights;
  const L=S.garage.map(k=>S.lights[k]);
  for(const d of [-.45,0,.45]){const th=PI+d;L.push([11.4*Math.cos(th),5.4,-11.4*Math.sin(th),11.5,S.rowLight[0],S.rowLight[1]]);}
  return L;
}
function buildStage(kind,garage){
  const sc=garage?SHED.sc:1,m=new MB(),SEG=garage?112:72,FY=-.06,arc=(i,r,y)=>{const a=i/SEG*TAU;return [Math.cos(a)*r*sc,y,Math.sin(a)*r*sc];},dark=kind==='dark';
  const FL=dark?[[0,'#2c2c33'],[3.3,'#2a2a31'],[6.5,'#202026'],[10,'#17171b'],[12.3,'#111114']]:[[0,'#a7a49f'],[3.3,'#a39f9a'],[6.5,'#9c9893'],[10,'#97938e'],[12.3,'#95918c']];
  /* (no floor under the turntable, which covers it: the car's reflection is drawn there, under the disc) */
  for(let k=garage?0:1;k<FL.length-1;k++){const [r0,h0]=FL[k],[r1,h1]=FL[k+1],c0=lin(h0),c1=lin(h1);
    for(let i=0;i<SEG;i++)m.quadC(arc(i,r0,FY),arc(i+1,r0,FY),arc(i+1,r1,FY),arc(i,r1,FY),c0,c0,c1,c1,0,MAT.FLOOR);}
  const CV=[[12.3,FY],[12.75,.08],[13.1,.45],[13.28,1.05],[13.32,2],[13.32,9.5]];
  const cvc=y=>dark?V3.lerp(lin('#2a2a32'),lin('#09090c'),Math.sqrt(clamp((y+.06)/9.5,0,1))):V3.lerp(lin('#a09d98'),lin('#c4c1bc'),Math.sqrt(clamp((y+.06)/9.5,0,1)));
  for(let k=0;k<CV.length-1;k++){const [r0,y0]=CV[k],[r1,y1]=CV[k+1],c0=cvc(y0),c1=cvc(y1);for(let i=0;i<SEG;i++)m.quadC(arc(i,r0,y0),arc(i+1,r0,y0),arc(i+1,r1,y1),arc(i,r1,y1),c0,c0,c1,c1,0,MAT.COL);}
  if(dark){
    for(let i=0;i<SEG;i++)m.quad(arc(i,12.68,.04),arc(i+1,12.68,.04),arc(i+1,12.68,.12),arc(i,12.68,.12),[.85,.9,1],.55,MAT.EMIT);
    const NS=garage?12:8;
    for(let i=0;i<NS;i++){const a=i/NS*TAU,cx=Math.cos(a)*13.24*sc,cz=Math.sin(a)*13.24*sc,tx=-Math.sin(a)*.28,tz=Math.cos(a)*.28;
      m.quad([cx-tx,1.25,cz-tz],[cx+tx,1.25,cz+tz],[cx+tx,6.6,cz+tz],[cx-tx,6.6,cz-tz],[.85,.9,1],.7,MAT.EMIT);}
    /* the house name in dots on the wall behind the turntable; in the garage, high on the wall over the parked cars */
    const word='BACK FORTY',dp=garage?.13:.11,a0=garage?PI:2.52,y0=garage?3.7:2.75,rw=13.2*sc,tw=word.length*6*dp;
    for(let k=0;k<word.length;k++){const g=G5[word[k]];if(!g)continue;for(let r=0;r<7;r++)for(let c=0;c<5;c++)if((g[r]>>(4-c))&1){
      const a=a0+((k*6+c)*dp-tw/2)/rw,y=y0-r*dp,px=Math.cos(a)*rw,pz=Math.sin(a)*rw,h=garage?.047:.04;m.box(px-h,y-h,pz-h,px+h,y+h,pz+h,[1,.24,.32],.55,MAT.EMIT);}}
  }
  if(garage){
    /* painted bays: a line either side of every car, and a stop line across the front */
    const pc=dark?lin('#8c6d1f'):lin('#b38f2c'),y=FY+.012,r0=SHED.R-2.75,r1=SHED.R+3.2,lw=.06,n=shedBack().length;
    const at=(th,r,o)=>[r*Math.cos(th)-o*Math.sin(th),y,-r*Math.sin(th)-o*Math.cos(th)];
    for(let k=0;k<=n;k++){const th=PI+(k-n/2)*SHED.step;m.quad(at(th,r0,-lw),at(th,r1,-lw),at(th,r1,lw),at(th,r0,lw),pc,0,MAT.FLOOR);}
    const S=48,t0=PI-n/2*SHED.step,t1=PI+n/2*SHED.step;
    for(let i=0;i<S;i++){const a=t0+(t1-t0)*i/S,b=t0+(t1-t0)*(i+1)/S;m.quad(at(a,r0-lw,0),at(b,r0-lw,0),at(b,r0+lw,0),at(a,r0+lw,0),pc,0,MAT.FLOOR);}
  }
  const t=new MB(),TT=3.3,tc=dark?lin('#33333b'):lin('#b2afaa'),tarc=(i,r,y)=>{const a=i/72*TAU;return [Math.cos(a)*r,y,Math.sin(a)*r];};
  for(let i=0;i<72;i++){t.tri([0,0,0],tarc(i,TT,0),tarc(i+1,TT,0),tc,0,MAT.FLOOR);t.quad(tarc(i,TT,FY),tarc(i+1,TT,FY),tarc(i+1,TT,0),tarc(i,TT,0),dark?lin('#0c0c0f'):lin('#7d7a75'),0,MAT.COL);
    t.quad(tarc(i,TT-.08,.002),tarc(i+1,TT-.08,.002),tarc(i+1,TT-.03,.002),tarc(i,TT-.03,.002),dark?[1,.22,.3]:lin('#8a8780'),dark?.45:0,dark?MAT.EMIT:MAT.COL);}
  return {stage:m.build(),table:t.build(),tris:(m.p.length+t.p.length)/9};
}


/* ---------- the showroom: the car you drive on the turntable; on the opening screen, every car in the shed ----------
   The bay's views, its hood that opens on the engine bay, its lights and its spin. The engine is the lab's own
   EngineSim, free revving on the turntable or driving on a dyno (below), heard from the lab's three spots in
   the room you pick; the game's own engine takes over again when you drive. */
const SHOW_VIEWS=[['front34','Front ¾',-38,8,8.6,.86],['side','Side',90,2.5,8.4,.82],['rear34','Rear ¾',142,9,8.6,.86],['front','Front',0,4,7.4,.86],
  ['rear','Rear',180,5,7.4,.86],['top','Top',-35,58,9.6,.55],['low','Low',-24,1.5,6.6,.62],['bay','Engine bay',-36,46,4.1,0],['shed','The shed',-24,14,19.5,1.1]];
const SHOW={full:false,stage:'dark',view:'front34',spin:true,hood:false,hoodA:0,lights:false,yaw:-.6,cam:null,camT:null,sim:null,simSpec:null,bs:null,eng:false,rev:false,stg:{},
  roll:0,rollV:0,pitch:0,pitchV:0,surge:0,surgeV:0,shake:[0,0],wheelA:0,drumA:0,fanA:0,fanW:0,lift:0,cvtR:0,
  tab:'look',mode:'free',room:'garage',listen:0,whp:0,peak:{hp:0,rpm:0},starting:false,spinWas:false,pad:0,padOn:false,brkBtn:false,nos:false,blipT:0,status:'',inp:{thr:0,brk:0,nos:false}};
try{const s=JSON.parse(store.get('b40-show','{}'))||{};if(STAGES[s.stage])SHOW.stage=s.stage;if(SHOW_VIEWS.some(v=>v[0]===s.view))SHOW.view=s.view;
  if(typeof s.spin==='boolean')SHOW.spin=s.spin;if(typeof s.lights==='boolean')SHOW.lights=s.lights;
  if(s.tab==='engine')SHOW.tab='engine';if(s.listen>=0&&s.listen<=2)SHOW.listen=s.listen|0;if(['open','garage','tunnel'].includes(s.room))SHOW.room=s.room;
  /* left on the dyno: it is up already, and the turntable stays still until Free rev */
  if(s.mode==='drive'){SHOW.mode='drive';SHOW.spinWas=SHOW.spin;SHOW.spin=false;SHOW.lift=1;}}catch(e){}
const saveShow=()=>store.set('b40-show',JSON.stringify({stage:SHOW.stage,view:SHOW.view,spin:SHOW.spin||SHOW.spinWas,lights:SHOW.lights,tab:SHOW.tab,mode:SHOW.mode,room:SHOW.room,listen:SHOW.listen}));
/* the showroom is up on the opening screen and in the garage */
const showActive=()=>GAME.state==='menu'&&(APP.title||MENU.tab==='garage');
const showShed=()=>APP.title&&MENU.tab!=='garage'&&!SHOW.full||SHOW.view==='shed';
const showStage=(k,g)=>{const id=k+(g?'G':'');return SHOW.stg[id]||(SHOW.stg[id]=buildStage(k,g));};
function showViewOf(id){const v=SHOW_VIEWS.find(q=>q[0]===id)||SHOW_VIEWS[0];return {th:v[2],ph:v[3],d:v[4],ty:v[5]};}
function showSetView(id){SHOW.view=id;SHOW.camT=showViewOf(id);saveShow();syncShow();}
/* the camera eases to the view picked; the scene slides right of the menu, as the garage did */
function showCam(asp,dt){
  const tgt=showShed()?showViewOf('shed'):SHOW.camT||showViewOf(SHOW.view);
  if(!SHOW.cam)SHOW.cam=Object.assign({},tgt);const c=SHOW.cam,k=1-Math.exp(-dt*3.2);
  let dth=tgt.th-c.th;while(dth>180)dth-=360;while(dth<-180)dth+=360;c.th+=dth*k;c.ph+=(tgt.ph-c.ph)*k;c.d+=(tgt.d-c.d)*k;c.ty+=(tgt.ty-c.ty)*k;
  const T=truck(APP.bi),sz=showShed()?1:clamp(T.D.L/4.9,.55,1.8),hz=showShed()?1:clamp(T.D.Hr/1.8,.55,2),ty=c.ty*hz+T.D.dy*.55+(showShed()?0:dynoH()),wall=showShed()?18.6:12.6,
    dd=Math.min(c.d*sz,wall),th=c.th*PI/180,ph=c.ph*PI/180,
    e=[dd*Math.cos(ph)*Math.cos(th),ty+dd*Math.sin(ph),-dd*Math.cos(ph)*Math.sin(th)],t=[0,ty,0];
  /* in the bay's window the car is fitted into what the controls, the sheet and the instruments leave free (the
     lens widens rather than the camera backing into the studio's wall, which is also how a pinch out past the
     wall carries on); in the garage tab it slides right of the menu */
  let fov=.5,sx=0,sy=0;
  if(SHOW.full){if(!(GFX.frame%30)||SHOW.dockTop===undefined)showMeasure();
    const F=SHOW.free||{l:RECT.x,t:RECT.y,r:RECT.x+RECT.w,b:RECT.y+RECT.h},vb=Math.min(RECT.y+RECT.h,F.b-4),vt=Math.min(vb-60,Math.max(RECT.y+RECT.h*.06,F.t+4)),
      vl=Math.min(RECT.x+RECT.w*.6,Math.max(RECT.x,F.l+6)),vr=Math.max(vl+80,Math.min(RECT.x+RECT.w,F.r-6));
    /* (a narrow gap between the lab's columns is filled across: the car takes about two thirds of it) */
    const fv=clamp((vb-vt)/RECT.h,.2,1),fh=clamp((vr-vl)/RECT.w,.2,1),S=1.12*Math.max(1/fv,(fh<.6?.56:.82)/fh)*Math.max(1,c.d*sz/wall);
    fov=2*Math.atan(Math.tan(.25)*S);sx=clamp((vl+vr)/2-RECT.x,0,RECT.w)/RECT.w*2-1;sy=1-2*clamp((vt+vb)/2-RECT.y,0,RECT.h)/RECT.h;}
  const V_=M4.look(e,t,[0,1,0]),P_=M4.persp(fov,asp,.2,200);
  if(!SHOW.full){const mr=APP.menuRight||0,right=Math.min(innerWidth,RECT.x+RECT.w),cx=(Math.max(mr,RECT.x)+right)/2;P_[8]=-clamp((cx-RECT.x)/RECT.w*2-1,0,.8);}
  else{P_[8]=-clamp(sx,-.6,.6);P_[9]=-clamp(sy,-.6,.6);}
  const VP=M4.mul(P_,V_);return {eye:e,eyeR:e,fwd:V3.norm(V3.sub(t,e)),up:[0,1,0],fov,asp,V:V_,P:P_,VP,VPw:VP,near:.2,far:200};
}
/* where the bay's controls are, in CSS pixels (read every half second, and when they change) */
function showMeasure(){
  const vw=innerWidth,vh=innerHeight,tp=document.querySelector('#bay .btop'),F={l:0,t:tp?tp.getBoundingClientRect().bottom:0,r:vw,b:vh};
  if(SHOW.tab==='engine'&&!$('dl').hidden){
    /* the lab's panels: upright they're a stack at the bottom under the car's name; sideways, columns either side */
    const hd=document.querySelector('#dl .dlhead').getBoundingClientRect();
    for(const el of document.querySelectorAll('#dl .dlsheet>*')){if(el.hidden||!el.offsetParent)continue;const r=el.getBoundingClientRect();if(r.width<2)continue;
      if(vw<=vh)F.b=Math.min(F.b,r.top);else if(r.left+r.width/2<vw/2)F.l=Math.max(F.l,r.right);else F.r=Math.min(F.r,r.left);}
    if(vw<=vh||hd.left<vw*.4)F.t=Math.max(F.t,hd.bottom);
  }else{const d=$('shDock');let top=vh;if(d)for(const el of d.children){if(el.hidden)continue;top=Math.min(top,el.getBoundingClientRect().top);}F.b=top;}
  SHOW.free=F;SHOW.dockTop=F.b;
}
/* ---------- the bay's quality ----------
   One car in a studio costs a fraction of the open world, so in the bay's window the picture spends it on the car:
   drawn at up to 1.25 times the screen's own pixels (a little supersampling on a phone; finer dots on a laptop),
   the occlusion pass on, the ground's full detail, every studio lamp, and a real shadow map for the key light (in
   the dark bay an overhead softbox, as a car photographer hangs one): the car's shadow under it on the floor and
   the deck, shade in its arches and under its sills. If the frame rate can't hold, the picture's size comes down. */
const SHOWQ={lv:0,ft:new Float32Array(60),i:0,n:0,chk:0,saved:null};
function showQuality(on,dt){
  if(!on){if(SHOWQ.saved){const S=SHOWQ.saved;DISP.scale=S.scale;SS=S.SS;GFX.q=S.q;SHOWQ.saved=null;}return;}
  SHOWQ.saved={scale:DISP.scale,SS,q:GFX.q};
  SHOWQ.ft[SHOWQ.i]=dt;SHOWQ.i=(SHOWQ.i+1)%60;SHOWQ.n=Math.min(60,SHOWQ.n+1);
  /* if it can't hold its frame rate it gives up the occlusion and the softer shadow edge first, then pixels, never
     going below what the game itself draws at */
  if(SHOWQ.n===60&&APP.t-SHOWQ.chk>2){SHOWQ.chk=APP.t;const med=Array.from(SHOWQ.ft).sort((x,y)=>x-y)[30];
    if(med>1/42&&SHOWQ.lv<4){SHOWQ.lv++;SHOWQ.n=0;}else if(med<1/57&&SHOWQ.lv>0&&APP.t-(SHOWQ.down||0)>8){SHOWQ.lv--;SHOWQ.n=0;SHOWQ.down=APP.t;}}
  const lv=SHOWQ.lv,px=RECT.w*DPR*RECT.h*DPR,base=Math.min(1.25,Math.sqrt((touchy?1.6e6:3.2e6)/Math.max(1,px)))*[1,1,.85,.7,.55][lv];
  DISP.scale=Math.max(SHOWQ.saved.scale,Math.round(base*20)/20);SS=lv<2?2:1.5;
  GFX.q=Object.assign({},GFX.q,{ssao:GFX.level==='mini'||lv>0?0:1,vol:0,detail:1,taps:lv>0?4:9});
}
/* the key light: the light cyc's own sun; the dark bay's softbox overhead */
const showKey=S=>S.id===1?{d:V3.norm([.16,1,.1]),c:lin('#fff0e0',.5)}:{d:S.sun,c:S.sunCol};
function showShadowPass(i,Mcar,Mt,dh){
  if(!GFX.q.csm||DEVW.off.shadows)return false;csmTarget();if(!CSM.n||!CSM.tex)return false;
  const L=showKey(STAGES[SHOW.stage]).d,D=truck(i).D,dy=dh>.001,r=Math.max(3.6,D.L*.5+1.2)+(dy?2.6:0),ctr=[dy?.8:0,1,0],back=r+14;
  const V=M4.look([ctr[0]+L[0]*back,ctr[1]+L[1]*back,ctr[2]+L[2]*back],ctr,Math.abs(L[1])>.98?[1,0,0]:[0,1,0]),n=CSM.size;
  const M=M4.mul(ortho(-r,r,-r,r,1,back+r+6),V);CSM.M.set(M,0);CSM.off[0]=2*r/n*1.6+.02;CSM.ends[0]=1e4;
  const P=CSM.P,u=P.u;gl.useProgram(P.p);gl.uniform1f(u.uTime,APP.t);gl.uniform1f(u.uInst,0);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1.6,4);gl.disable(gl.CULL_FACE);
  gl.bindFramebuffer(gl.FRAMEBUFFER,CSM.fbs[0]);gl.viewport(0,0,n,n);gl.clear(gl.DEPTH_BUFFER_BIT);gl.uniformMatrix4fv(u.uVP,false,M);
  drawShowCar(i,Mcar,SHOW.hoodA,true,false,0,u);if(dy)drawDyno(i,Mt,dh,u);
  gl.disable(gl.POLYGON_OFFSET_FILL);gl.bindVertexArray(null);
  /* (the game's own cascades are all drawn afresh when it's back) */
  CSM.on=true;CSM.fresh=true;return true;
}
/* the studio's light: its sun, ambient, fog, stage and lamps (omni: no beam, no spot); in the bay's window the key
   light and its shadows, and the flash of a bang in the pipes lighting the floor */
const SLP=new Float32Array(32),SLC=new Float32Array(32),SLD=new Float32Array(32);
function showUniforms(shed,mirror){
  const u=CUR.u,S=STAGES[SHOW.stage],full=SHOW.full&&!shed,K0=full?showKey(S):{d:S.sun,c:S.sunCol},K=mirror?{d:[K0.d[0],-K0.d[1],K0.d[2]],c:K0.c}:K0;
  let LS=stageLights(S,shed).slice(0,!full&&(GFX.level==='mini'||GFX.level==='phone')?5:8);
  if(full&&SHOW.flash){const v=GAME.voice,k=Math.min(1,v.flame),n=Math.min(2,SHOW.flash.length);
    LS=LS.slice(0,8-n).concat(SHOW.flash.slice(0,n).map(p=>[p[0],p[1],p[2],5.5,[1,.46,.14],(5+5*v.flameL)*k]));}
  gl.uniform3fv(u.uSunDir,K.d);gl.uniform3fv(u.uSunCol,K.c);gl.uniform3fv(u.uSkyAmb,mirror?S.gnd:S.sky);gl.uniform3fv(u.uGndAmb,mirror?S.sky:S.gnd);
  gl.uniform3fv(u.uFogCol,S.fog);gl.uniform1f(u.uFogD,S.fogD);gl.uniform1f(u.uStage,S.id);gl.uniform1f(u.uNight,0);
  gl.uniform4f(u.uCloud,0,0,0,0);gl.uniform1f(u.uWet,0);gl.uniform4f(u.uProbeP,0,0,0,0);gl.uniform2i(u.uCSMN,full&&SHOW.shOn&&!mirror?1:0,full&&SHOW.shOn&&!mirror?GFX.q.taps:4);if(u.uOrg)gl.uniform3f(u.uOrg,0,0,0);
  LS.forEach((l,k)=>{SLP.set([l[0],mirror?-l[1]:l[1],l[2],l[3]],k*4);SLC.set([l[4][0]*l[5],l[4][1]*l[5],l[4][2]*l[5],0],k*4);SLD.set([0,-1,0,-2],k*4);});
  gl.uniform4fv(u.uLP,SLP);gl.uniform4fv(u.uLC,SLC);gl.uniform4fv(u.uLD,SLD);gl.uniform1i(u.uNL,LS.length);
}
/* the floor's contact shadows: x, z, half length, half width, yaw */
const SSH=new Float32Array(32),SSA=new Float32Array(8),SSK=new Float32Array(8);
function showShadows(list){const u=CUR.u,n=Math.min(8,list.length);for(let k=0;k<n;k++){SSH.set(list[k].slice(0,4),k*4);SSA[k]=list[k][4];SSK[k]=1;}
  gl.uniform4fv(u.uSh,SSH);gl.uniform1fv(u.uShA,SSA);gl.uniform1fv(u.uShK,SSK);gl.uniform1i(u.uNSh,n);}
const showShadowOf=(i,x,z,yaw)=>{const b=BUILDS[i];return [x,z,truck(i).D.L/2+.15,b.look.track/2+b.look.tyre.W*.5,yaw];};
function showCarUniforms(i,dirt){
  const u=CUR.u,b=BUILDS[i],D=truck(i).D;
  gl.uniform3fv(u.uPaint,lin(b.paint));gl.uniform3fv(u.uPaint2,lin(b.paint2));gl.uniform3fv(u.uRim,lin(b.rim));gl.uniform3fv(u.uCal,lin(b.cal));gl.uniform3fv(u.uClad,lin(b.clad));
  gl.uniform1f(u.uLiv,b.liv);gl.uniform1f(u.uLights,SHOW.lights?1:0);gl.uniform1f(u.uBrake,0);gl.uniform1f(u.uDirt,dirt);
  gl.uniform4f(u.uLivP,D.X(0),D.X(D.L),D.belt(2.5),D.Hr);
}
/* one car placed by Mc (the bay's drawCar on HD's uniforms): live, it rocks on its springs to the engine and
   its hood may be open on the engine bay; far, it is the coarse copy (the shed on a phone) */
/* the body's matrix: on its springs when it's the live car */
function showBodyM(i,Mc,live){
  const b=BUILDS[i],D=truck(i).D;let Mb=Mc;
  if(live){const pv=.62;Mb=M4.mul(Mc,M4.mul(M4T(SHOW.surge,pv+SHOW.shake[1],SHOW.shake[0]),M4.mul(M4RX(SHOW.roll),M4.mul(M4RZ(SHOW.pitch),M4T(0,-pv,0)))));}
  const fx=D.X(D.uFa),R=b.look.tyre.R;if(D.pitch)Mb=M4.mul(Mb,M4.mul(M4T(fx,R,0),M4.mul(M4RZ(D.pitch),M4T(-fx,-R,0))));
  return Mb;}
/* du: the shadow map's uniforms when this is the depth pass (no paint, no mud, no flames) */
function drawShowCar(i,Mc,hoodA,live,far,dirt,du){
  const b=BUILDS[i],T=truck(i),D=T.D,u=du||CUR.u;if(!du){showCarUniforms(i,dirt);gl.uniform1f(u.uMudLocal,1);gl.uniform1f(u.uMudOff,0);}
  const Mb=showBodyM(i,Mc,live),fx=D.X(D.uFa),R=b.look.tyre.R;
  gl.uniformMatrix4fv(u.uM,false,Mb);let tris=T.tris;
  if(far){const F=truckFar(i);drawMesh(F.body);if(F.hood)drawMesh(F.hood);tris=F.tris;}
  else if(b.machine){drawMesh(T.body);if(T.rider){drawMesh(T.rider.lo);const P=T.rider.pivot;gl.uniformMatrix4fv(u.uM,false,M4.mul(Mb,M4T(P[0],P[1],P[2])));drawMesh(T.rider.up);}}
  else{
    drawMesh(T.body);
    const ha=sstep(0,1,hoodA);let Mh=Mb,bt=0;
    const engM=BY=>{const p=BY.pivot,a=live?-SHOW.roll*3:0;return a?M4.mul(Mb,M4.mul(M4T(p[0],p[1],p[2]),M4.mul(BY.trans?M4RZ(a):M4RX(a),M4T(-p[0],-p[1],-p[2])))):Mb;};
    if(ha>0){const [hx,hy]=D.hood.hinge;Mh=M4.mul(Mb,M4.mul(M4T(hx,hy,0),M4.mul(M4RZ(ha*1.0),M4T(-hx,-hy,0))));
      const BY=bayOf(i);bt=BY.tris;if(!du)gl.uniform1f(u.uDirt,dirt*.3);drawMesh(BY.bay);
      if(!T.engineOut){gl.uniformMatrix4fv(u.uM,false,engM(BY));drawMesh(BY.engine);}
      gl.uniformMatrix4fv(u.uM,false,Mh);drawMesh(BY.liner);if(!du)gl.uniform1f(u.uDirt,dirt);}
    if(T.engineOut){gl.uniformMatrix4fv(u.uM,false,engM(T.bay));drawMesh(T.bay.engine);}
    gl.uniformMatrix4fv(u.uM,false,Mh);drawMesh(T.hood);
    gl.uniformMatrix4fv(u.uM,false,Mb);if(ha===0)drawMesh(T.hide);
    for(const sp of D.spares||[]){const W=sp.rear?T.wheelR:T.wheel;
      gl.uniformMatrix4fv(u.uM,false,M4.mul(Mb,M4.mul(M4T(sp.p[0],sp.p[1],sp.p[2]),sp.face==='back'?M4RY(-PI/2):M4S(1,1,sp.p[2]<0?-1:1))));drawMesh(W);}
    tris+=bt;}
  /* a bang in the pipes throws a flame out of each tip, as on the road (the synth's pops set the voice's flame) */
  const v=GAME.voice;
  if(live&&!du&&v.flame>.04&&D.tips)for(const tp of D.tips){
    const up=Math.abs(tp.d[1])>.9?[1,0,0]:[0,1,0],rr=V3.norm(V3.cross(tp.d,up)),uu=V3.cross(rr,tp.d),k=Math.min(1,v.flame),fl=(.12+.42*k*v.flameL)*(.85+.3*Math.random()),fr=tp.r*(.8+.5*k);
    gl.uniformMatrix4fv(u.uM,false,M4.mul(Mb,M4.mul(M4.basis(tp.p,tp.d,uu,rr),M4S(fl,fr,fr))));drawMesh(flameMesh());}
  /* on the dyno only the driven wheels turn (a two-wheel-drive car's others stand still on the deck) */
  const wb=D.uRa-D.uFa,eR=specOf(i).R,drv=specOf(i).drv||'RWD';
  for(const front of [1,0])for(const s of [1,-1]){const wa=live&&(drv==='AWD'||(drv==='FWD')===!!front)?-SHOW.wheelA:0;
    const x=front?fx:fx-wb*Math.cos(D.pitch),Rw=front?R:D.Rr,tw=(front?b.look.track:b.look.trackR||b.look.track)/2;if(!du)gl.uniform1f(u.uMudOff,Rw);
    const xs=!front&&D.tandem?D.tandem:[0],zs=!front&&D.dual?[D.dual,-D.dual]:[0];
    for(const dx of xs)for(const dz of zs){const M=M4.mul(Mc,M4.mul(M4T(x+dx,Rw,s*(tw+dz)),M4.mul(M4S(1,1,s),M4RZ(wa*eR/Rw))));
      gl.uniformMatrix4fv(u.uM,false,M);drawMesh(front?T.wheel:T.wheelR);}}
  if(!du){gl.uniform1f(u.uMudOff,0);gl.uniform1f(u.uMudLocal,0);}
  return tris;
}
/* the other cars in the shed, each on its own build from the garage; one not built yet is built on the frame it
   first shows, one a frame, so the opening screen never stops while they are made */
function showParked(){const sel=APP.car,out=[];let fresh=false;
  for(const [car] of CARS){if(car===sel)continue;const i=rigBuild(car,rigOf(car)),b=BUILDS[i];
    if(!TRUCK[b.id]){if(fresh)continue;fresh=true;}
    const s=spotOf(car);out.push({car,i,s,M:M4.mul(M4T(s.p[0],0,s.p[2]),M4RY(s.yaw))});}
  return out;}
function renderShow(dt){
  const full=SHOW.full;showQuality(full,dt);
  try{renderShow1(dt,full);}finally{showQuality(false);}
}
function renderShow1(dt,full){
  hClear();
  const T=sceneTargetHD(),shed=showShed();GFX.frame++;
  if(SHOW.spin)SHOW.yaw+=dt*.22;
  SHOW.hoodA=clamp(SHOW.hoodA+(SHOW.hood&&!BUILDS[APP.bi].machine?dt:-dt)*1.6,0,1);
  showBody(dt);
  const cam=showCam(T.w/T.h,dt),Mc=M4RY(SHOW.yaw),dh=dynoH(),Mcar=dh>.001?M4.mul(Mc,M4T(0,dh,0)):Mc;
  CSM.on=false;SHOW.shOn=full&&!shed&&showShadowPass(APP.bi,Mcar,Mc,dh);
  /* where the flames come out, for the flash they throw on the floor */
  SHOW.flash=null;const D=truck(APP.bi).D;
  if(full&&GAME.voice.flame>.04&&D.tips){const Mb=showBodyM(APP.bi,Mcar,true);SHOW.flash=D.tips.map(tp=>M4.xform(Mb,[tp.p[0]+tp.d[0]*.3,tp.p[1]+tp.d[1]*.3,tp.p[2]+tp.d[2]*.3]));}
  gl.bindFramebuffer(gl.FRAMEBUFFER,T.f);gl.viewport(0,0,T.w,T.h);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);useLit(P_LIT);
  worldUniforms(cam);gfxUniforms();showUniforms(shed);
  const u=CUR.u,st=showStage(SHOW.stage,shed),P=shed?showParked():[],farCars=GFX.level==='mini'||GFX.level==='phone';
  const near=P.slice().sort((a,b)=>Math.hypot(a.s.p[0]-cam.eye[0],a.s.p[2]-cam.eye[2])-Math.hypot(b.s.p[0]-cam.eye[0],b.s.p[2]-cam.eye[2])).slice(0,7);
  showShadows([showShadowOf(APP.bi,0,0,SHOW.yaw)].concat(near.map(q=>showShadowOf(q.i,q.s.p[0],q.s.p[2],q.s.yaw))));
  /* in the bay's window the turntable's disc is a glossy floor: the car (and the dyno) mirrored under it, lit by the
     studio mirrored too, then the disc drawn over it a quarter see-through (floor beyond the disc hides the rest) */
  const mir=full&&!shed;let tris=0;
  if(mir){showUniforms(shed,true);const Mm=M4S(1,-1,1);
    if(dh>.001)tris+=drawDyno(APP.bi,M4.mul(Mm,Mc),dh);
    tris+=drawShowCar(APP.bi,M4.mul(Mm,Mcar),SHOW.hoodA,true,false,GAME.dirt||0);showUniforms(shed);}
  gl.uniformMatrix4fv(u.uM,false,M4.id());drawMesh(st.stage);
  gl.uniformMatrix4fv(u.uM,false,Mc);
  if(mir){gl.enable(gl.BLEND);gl.blendColor(0,0,0,SHOW.stage==='dark'?.72:.84);gl.blendFunc(gl.CONSTANT_ALPHA,gl.ONE_MINUS_CONSTANT_ALPHA);}
  drawMesh(st.table);if(mir)gl.disable(gl.BLEND);
  /* the dyno under the car in Drive (it rises out of the floor and lifts the car with it) */
  tris+=st.tris+(dh>.001?drawDyno(APP.bi,Mc,dh):0);
  gl.uniform1i(u.uNSh,0);
  tris+=drawShowCar(APP.bi,Mcar,SHOW.hoodA,true,false,GAME.dirt||0);
  for(const q of P)tris+=drawShowCar(q.i,q.M,0,false,farCars,BUILDS[q.i].dirt||0);
  gl.bindVertexArray(null);APP.tris=tris;
  /* the bay had no eye adapting to the dark: the studio is shown at a fixed exposure, as it was there */
  const ex=SKY.expo;SKY.expo=[.3,1,1];let src;try{src=postPasses(cam,dt);}finally{SKY.expo=ex;}
  /* the car's name and build in dots, top right (the menu has the left) */
  /* the car's name over the garage tab's turntable; in the bay's window the picture is left to the car (Look) or the
     lab's instruments take over (Engine) */
  const lab=full&&SHOW.tab==='engine';
  if(!full){const sc=W>=400?2:1;otxt5(carName({car:APP.car}).toUpperCase(),W-5,5,GR.volt,sc,'r',.12);txt3((rigName(APP.car,rigOf(APP.car))+plusTag(APP.car)).toUpperCase(),W-5,7+7*sc+2,PAL.ink,1,'r');}
  presentHD(src);
  if(lab){const t0=performance.now();dlFrame(dt);psT(PS_HUD,t0);}
}
/* ---------- the bay's engine: the lab's EngineSim, as in the model bay ----------
   Free rev: in neutral, the car on the turntable. Drive: the turntable stops and a chassis dyno rises under the
   car (a deck with a drum under each driven axle, straps, a fan in front). The lab's own drivetrain runs it
   through the gears against the car's weight and the air, shifting the way the lab's automatic does, or by hand
   with Shift up and down; hold Brake at a standstill to rev against it (the two-step on a launch car). The car
   answers: the driven wheels turn the drums, it squats as it pulls and nods at every shift, rocks on its springs
   to the engine's torque and shakes at a lumpy idle. The machines run on the dyno the way they drive: the
   tractor and the semi pull away in their start gears, the belt-drive ones on their CVT, the kids' quad and the
   semi up to their governors. */
const DYNO_H=.2,DYNO={};
const dynoH=()=>DYNO_H*sstep(0,1,SHOW.lift);
const showE=()=>SHOW.bs&&SHOW.simSpec===GAME.car.spec?SHOW.bs:GAME.car.spec;
/* the bay's copy of the car's engine spec: the machines' start gear, CVT and governor folded in */
function showSpec(base){
  const e=base||GAME.car.spec,pe=GAME.car.pt.e,s=Object.assign({},e),g0=pe.startG||1;
  s.bayG0=1;s.bayCvt=null;s.bayGov=GAME.car.build.gov||0;
  if(pe.cvt){s.bayCvt=pe.cvt;s.fd=pe.fd||e.fd;s.gears=[pe.cvt.lo];s.nG=1;}
  else if(g0>1&&e.gears&&e.gears.length>g0){s.gears=e.gears.slice(g0-1);s.nG=s.gears.length;s.bayG0=g0;}
  return s;
}
/* the belt: the same law as the game's (40_physics _cvt), the revs held where the throttle asks */
function showCvt(s,sim,dt){
  const C=s.bayCvt,ww=sim.ww,tgt=lerp(C.eng,C.top,clamp(sim.thr,0,1))*TAU/60,want=ww>.05?tgt/(ww*s.fd):C.lo;
  if(!SHOW.cvtR)SHOW.cvtR=C.lo;
  const r=clamp(want,C.hi,C.lo),rate=(C.lo-C.hi)*(r<SHOW.cvtR?1.4:3.5);SHOW.cvtR+=clamp(r-SHOW.cvtR,-rate*dt,rate*dt);s.gears[0]=SHOW.cvtR;
}
/* the car answers the engine. Strapped to the dyno it squats nose-up as the driven wheels pull (front, rear or
   all four: there's no weight transfer on a car that can't go anywhere, only the axle's reaction and the straps),
   holds it while it strains against the drum, and nods down as the pull drops out for a shift; it surges a little
   against the straps; torque rocks it sideways on its springs; a lumpy cam shakes it */
function showBody(dt){
  const sim=SHOW.eng&&SHOW.sim,e=showE(),drive=SHOW.mode==='drive';
  SHOW.lift=clamp(SHOW.lift+(drive?dt:-dt)*.9,0,1);
  /* on the dyno the turntable turns the car square to the bay's views (Front looks at its nose) and stops there */
  if(drive&&!SHOW.spin){let d=-SHOW.yaw%TAU;if(d>PI)d-=TAU;if(d<-PI)d+=TAU;SHOW.yaw+=d*(1-Math.exp(-dt*2.2));}
  const run=!!(sim&&sim.running),Te=run?Math.max(-e.tq*.3,SIM.engTq(e,Math.max(sim.rpm,1),sim.thr,sim.boost)):0,pull=drive&&sim?clamp(showPull(sim,e)/(e.mass*9.81),-.5,1.5):0;
  const rollT=-.02*Te/e.peak.tq,pitchT=pull*.03,surgeT=pull*.022;
  SHOW.rollV+=(-(SHOW.roll-rollT)*80-SHOW.rollV*6.5)*dt;SHOW.roll+=SHOW.rollV*dt;
  SHOW.pitchV+=(-(SHOW.pitch-pitchT)*60-SHOW.pitchV*7)*dt;SHOW.pitch+=SHOW.pitchV*dt;
  SHOW.surgeV+=(-(SHOW.surge-surgeT)*90-SHOW.surgeV*9)*dt;SHOW.surge+=SHOW.surgeV*dt;
  const idle=run?1-clamp((sim.rpm-e.idle)/(e.idle*1.5),0,1):0,lope=[0,.012,.032,.065][e.cam|0],amp=run?(.0004+lope*.03*idle+.0003*sim.load):0;
  SHOW.shake=[(Math.random()-.5)*amp,(Math.random()-.5)*amp*1.6];
  if(drive&&sim){SHOW.wheelA=(SHOW.wheelA+sim.ww*dt)%(TAU*1000);SHOW.drumA=(SHOW.drumA+sim.v/dynoOf(APP.bi).rd*dt)%(TAU*1000);}
  /* what the dyno reads: power at the drums (the pull times their speed), and the peak of this run */
  const whp=drive&&sim&&run?Math.max(0,showPull(sim,e)*sim.v/745.7):0;SHOW.whp+=(whp-SHOW.whp)*Math.min(1,dt*6);
  if(SHOW.whp>SHOW.peak.hp&&sim){SHOW.peak={hp:SHOW.whp,rpm:sim.rpm};}
  SHOW.fanW+=((drive&&run?26:0)-SHOW.fanW)*Math.min(1,dt*.7);SHOW.fanA=(SHOW.fanA+SHOW.fanW*dt)%(TAU*100);
}
/* the wheels' pull on the drums, from the lab's own step: its acceleration times the mass it moves, plus the
   air and rolling drag it pulled against */
function showPull(sim,e,brk=0){const m=e.mass,R=e.R,Iw=(e.drv==='AWD'?4.8:2.4)*Math.max(1,m/2500),v=sim.v;
  return sim.aPrev*(m+Iw/(R*R))+.5*1.2*e.cdA*v*v+(v>.05?(.013+brk*.95)*m*9.81:0);}
/* the turntable's engine, into the game's own synth voice */
async function showEngine(on){
  if(!on){if(SHOW.sim)SHOW.sim.stop();syncShow();return;}
  if(SHOW.starting)return;SHOW.starting=true;
  try{await initAudio();if(ENG.audio.ctx.state!=='running')await ENG.audio.ctx.resume();voiceNode(GAME.voice);}catch(e){SHOW.starting=false;return;}
  SHOW.starting=false;
  /* (left the showroom while the sound was waking up: don't start anything) */
  if(!showActive())return;
  const v=GAME.voice,spec=GAME.car.spec;if(v.port)v.port.post({t:'cfg',cfg:SIM.dspCfg(spec)});
  showNewSim(spec);SHOW.sim.start();SHOW.eng=true;SHOW.status='';showSound(1/60);
  if(SHOW.room0===undefined){SHOW.room0=ENG.room;SHOW.listen0=ENG.listener;}ENG.room=SHOW.room;ENG.listener=SHOW.listen;setRoom();engineDuck(false);syncShow();
}
function showNewSim(spec){if(PULL.ph)showPullEnd(true);SHOW.bs=showSpec();SHOW.sim=SIM.makeSim(SHOW.bs);SHOW.simSpec=spec;SHOW.cvtR=0;SHOW.peak={hp:0,rpm:0};showMode(SHOW.mode,true);}
const showRuns=()=>!!(SHOW.eng&&SHOW.sim&&SHOW.sim.st!=='off'&&SHOW.sim.st!=='stopping');
/* Free rev or Drive (the lab's setMode) */
function showMode(m,quiet){
  if(!quiet&&PULL.ph&&m!=='drive')showPullEnd(true);
  const was=SHOW.mode;SHOW.mode=m;const sim=SHOW.sim;
  if(sim){sim.mode=m;sim.gear=0;sim.clutch='open';sim.shiftT=0;sim.held=false;if(m==='free'){sim.v=0;sim.ww=0;sim.pos=0;}else sim.pos=-3;}
  SHOW.peak={hp:0,rpm:0};SHOW.whp=0;
  if(!quiet&&was!==m){if(m==='drive'){if(SHOW.spin){SHOW.spin=false;SHOW.spinWas=true;}}else if(SHOW.spinWas){SHOW.spin=true;SHOW.spinWas=false;}}
  if(!quiet){saveShow();syncShow();}
}
/* where you hear it from, the bay's own (the drive keeps its own spot): Behind, Cabin, Trackside */
function showListen(v){SHOW.listen=v;saveShow();if(SHOW.eng){ENG.listener=v;setRoom();}syncShow();}
function showRoom(v){SHOW.room=v;saveShow();if(SHOW.eng){ENG.room=v;setRoom();}syncShow();}
/* hands and feet: the pad (further right, more throttle), the keys as in the lab, Brake, Blip, Nitrous */
function showInput(dt){
  const D=INPUT.down,k=SHOW.full;let thr=0,brk=0;
  if(k){if(D.has('KeyW')||D.has('ArrowUp')||D.has('Space'))thr=1;for(let d=1;d<=9;d++)if(D.has('Digit'+d))thr=Math.max(thr,d/10);if(D.has('Digit0'))thr=1;
    if(D.has('KeyS')||D.has('ArrowDown'))brk=1;}
  if(SHOW.padOn)thr=Math.max(thr,SHOW.pad);if(SHOW.rev)thr=1;
  if(SHOW.blipT>0){SHOW.blipT-=dt;thr=1;}
  if(SHOW.brkBtn)brk=1;
  return {thr,brk,nos:!!(SHOW.nos||k&&D.has('KeyN'))};
}
function showAct(id){const sim=SHOW.sim,v=GAME.voice;
  if(id==='up'||id==='down'){if(sim&&SHOW.mode==='drive'&&showRuns())sim.shift(id==='up'?1:-1);}
  else if(id==='jake'){if(sim){sim.ctl('jake',((sim.c.jake|0)+1)%4);syncShow();}}
  else if(id==='blip'){if(showRuns())SHOW.blipT=.22;}
  else if(id==='purge'){if(v.port&&showRuns())v.port.post({t:'ev',ev:{type:'purge'}});}}
function showSound(dt){
  const v=GAME.voice;if(!ENG.audio||!v.port||!SHOW.eng||!SHOW.sim){SHOW.inp={thr:0,brk:0,nos:false};return;}
  /* a part changed in the garage: the turntable's engine becomes the new one, still running */
  if(SHOW.simSpec!==GAME.car.spec){
    /* (the dyno's own tune coming back as the car's engine: it's running already) */
    if(SHOW.tuneFor&&SHOW.tuneFor===GAME.car.spec&&SHOW.sim)SHOW.simSpec=GAME.car.spec;
    else{const was=showRuns();showNewSim(GAME.car.spec);v.port.post({t:'cfg',cfg:SIM.dspCfg(GAME.car.spec)});if(was)SHOW.sim.start();}
    SHOW.tuneFor=null;syncShow();}
  const sim=SHOW.sim,s=SHOW.bs,drive=sim.mode==='drive',pull=!!PULL.ph&&drive;
  let inp=SHOW.inp=showInput(dt);if(pull)inp=SHOW.inp=pullDrive(sim,s,dt);
  let thr=inp.thr;if(!pull&&s.bayGov&&drive&&sim.v>s.bayGov-1.2)thr*=clamp((s.bayGov-sim.v)/1.2,0,1);
  const ii={thr,brk:inp.brk,nos:inp.nos};sim.ctl('horn',SHOW.horn||SHOW.full&&INPUT.down.has('KeyH')?1:0);
  const g0=sim.gear;
  for(let k=0;k<4;k++){if(s.bayCvt&&drive&&(!pull||PULL.ph==='roll'&&sim.v<PULL.vT*.95))showCvt(s,sim,dt/4);sim.step(dt/4,ii);}
  if(PULL.ph&&GFX.frame%3===0)showChart();
  /* bolted to the floor: Trackside stands beside the dyno instead of watching the lab's car drive off down a road */
  if(drive)sim.pos=-3;
  for(const e of sim.takeEvents())v.port.post({t:'ev',ev:e});
  if(sim.stalled){sim.stalled=false;SHOW.status='STALLED';syncShow();}
  /* a phone answers in your hand: a tick at each shift, a buzz on the limiter or the two-step */
  if(touchy&&navigator.vibrate&&SHOW.full){try{if(drive&&sim.gear!==g0&&g0>0)navigator.vibrate(15);
    else if((sim.twostep||sim.cutFrac>.5&&sim.shiftT<=0&&!sim.tcOn)&&APP.t-(SHOW.buzzT||0)>.25){SHOW.buzzT=APP.t;navigator.vibrate([8,30,8]);}}catch(_){}}
  const p=sim.params(ENG.listener,1);if(ENG.pitch!==1)p.rpm*=ENG.pitch;v.port.post({t:'p',p});
  showLive();
}
/* leaving the showroom: its engine stops feeding the synth; the game's engine (or the pause's silence) takes over */
function showLeave(){if(SHOW.full&&!(GAME.state==='menu'&&MENU.tab==='garage'))showFull(false);if(PULL.ph)showPullEnd(true);if(!SHOW.eng)return;SHOW.eng=false;SHOW.rev=false;SHOW.padOn=false;SHOW.brkBtn=false;SHOW.nos=false;if(SHOW.sim)SHOW.sim.stop();if(GAME.state==='menu')engineDuck(true);
  /* back to the room the car is in, at once (not a second of the garage's echo on the road) */
  if(SHOW.room0!==undefined){ENG.room=SHOW.room0;ENG.listener=SHOW.listen0;SHOW.room0=undefined;setRoom();}syncShow();}

/* ---------- the dyno: a steel deck that rises under the car, a drum under each driven axle, straps, a fan ---------- */
/* a face with its normal the way it should point, whatever order the corners come in */
function qdN(m,a,b,c,d,n,col,em,mat){const u=V3.sub(b,a),w=V3.sub(c,a),x=V3.cross(u,w);if(x[0]*n[0]+x[1]*n[1]+x[2]*n[2]<0)m.quad(a,d,c,b,col,em,mat);else m.quad(a,b,c,d,col,em,mat);}
function boxN(m,x0,x1,y0,y1,z0,z1,col,mat){
  qdN(m,[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1],[0,1,0],col,0,mat);qdN(m,[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[0,-1,0],col,0,mat);
  qdN(m,[x0,y0,z0],[x0,y1,z0],[x0,y1,z1],[x0,y0,z1],[-1,0,0],col,0,mat);qdN(m,[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1],[1,0,0],col,0,mat);
  qdN(m,[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[0,0,-1],col,0,mat);qdN(m,[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],[0,0,1],col,0,mat);}
/* a drum round the z axis, knurled in light and dark bands so you can see it turn */
function drumMesh(r,zh){const m=new MB(),n=36,c1=lin('#9aa0aa'),c2=lin('#4a4e56'),cap=lin('#202228');
  for(let k=0;k<n;k++){const a0=k/n*TAU,a1=(k+1)/n*TAU,am=(a0+a1)/2,P=(a,z)=>[Math.cos(a)*r,Math.sin(a)*r,z];
    qdN(m,P(a0,-zh),P(a1,-zh),P(a1,zh),P(a0,zh),[Math.cos(am),Math.sin(am),0],k%2?c1:c2,0,MAT.METAL);
    for(const z of [-zh,zh])m.tri([0,0,z],P(a0,z),P(a1,z),cap,0,MAT.COL);}
  return m.build();}
function dynoOf(i){
  const b=BUILDS[i];if(DYNO[b.id])return DYNO[b.id];
  const T=truck(i),D=T.D,sp=specOf(i),L=b.look,R=L.tyre.R,Rr=D.Rr||R,fx=D.X(D.uFa),wb=D.uRa-D.uFa,rx=fx-wb*Math.cos(D.pitch||0),
    xf=Math.max(D.X(0),fx+R),xr=Math.min(D.X(D.L),rx-Rr+Math.min(0,...(D.tandem||[0]))),trk=Math.max(L.track,L.trackR||0),tw=L.tyre.W,
    zH=trk/2+tw*.5+(D.dual||0)+.15,hw=zH+.45,h=DYNO_H,drv=sp.drv||'RWD';
  const ax=[];if(drv!=='RWD')ax.push({x:fx,R});if(drv!=='FWD')for(const dx of (D.tandem||[0]))ax.push({x:rx+dx,R:Rr});
  const rd=clamp(Math.max(...ax.map(a=>a.R))*.7,.16,.42),sw=rd*.62;
  const m=new MB(),top=lin('#3b3d45'),side=lin('#18191e'),hz=lin('#e2a21c'),pit=lin('#040405');
  const x0=xr-.75,x1=xf+.45,cuts=ax.map(a=>[a.x-sw,a.x+sw]).sort((p,q)=>p[0]-q[0]);
  const topQ=(a,c,z0,z1)=>qdN(m,[a,h,z0],[c,h,z0],[c,h,z1],[a,h,z1],[0,1,0],top,0,MAT.FLOOR);
  let xa=x0;
  for(const [c0,c1] of cuts){if(c0>xa)topQ(xa,c0,-hw,hw);topQ(c0,c1,-hw,-zH);topQ(c0,c1,zH,hw);
    qdN(m,[c0,0,-zH],[c0,h,-zH],[c0,h,zH],[c0,0,zH],[1,0,0],pit,0,MAT.COL);qdN(m,[c1,0,-zH],[c1,h,-zH],[c1,h,zH],[c1,0,zH],[-1,0,0],pit,0,MAT.COL);
    qdN(m,[c0,0,-zH],[c1,0,-zH],[c1,h,-zH],[c0,h,-zH],[0,0,1],pit,0,MAT.COL);qdN(m,[c0,0,zH],[c1,0,zH],[c1,h,zH],[c0,h,zH],[0,0,-1],pit,0,MAT.COL);
    qdN(m,[c0,.004,-zH],[c1,.004,-zH],[c1,.004,zH],[c0,.004,zH],[0,1,0],pit,0,MAT.COL);xa=Math.max(xa,c1);}
  if(x1>xa)topQ(xa,x1,-hw,hw);
  /* the sides, a yellow edge along the top, a ramp at each end */
  const hs=h-.035;
  for(const [y0,y1,c] of [[0,hs,side],[hs,h,hz]]){
    qdN(m,[x0,y0,-hw],[x0,y1,-hw],[x0,y1,hw],[x0,y0,hw],[-1,0,0],c,0,MAT.COL);qdN(m,[x1,y0,-hw],[x1,y1,-hw],[x1,y1,hw],[x1,y0,hw],[1,0,0],c,0,MAT.COL);
    qdN(m,[x0,y0,-hw],[x1,y0,-hw],[x1,y1,-hw],[x0,y1,-hw],[0,0,-1],c,0,MAT.COL);qdN(m,[x0,y0,hw],[x1,y0,hw],[x1,y1,hw],[x0,y1,hw],[0,0,1],c,0,MAT.COL);}
  for(const [xe,dir] of [[x0,-1],[x1,1]])qdN(m,[xe,h,-hw+.25],[xe,h,hw-.25],[xe+dir*1.1,.004,hw-.25],[xe+dir*1.1,.004,-hw+.25],[dir*.18,1,0],top,0,MAT.FLOOR);
  /* four ratchet straps from the deck to the chassis */
  const st=new MB(),web=lin('#d9741a'),zs=trk/2-.12,yc=h+Math.min(R*.85,.55);
  for(const [xd,xc] of [[x1-.1,xf-.25],[x0+.1,xr+.25]])for(const sg of [1,-1]){const A=[xd,h+.01,sg*(hw-.12)],B=[xc,yc,sg*zs],w=.03;
    qdN(st,[A[0]-w,A[1],A[2]],[A[0]+w,A[1],A[2]],[B[0]+w,B[1],B[2]],[B[0]-w,B[1],B[2]],[0,1,sg],web,0,MAT.COL);
    boxN(st,xd-.06,xd+.06,h,h+.05,sg*(hw-.12)-.06,sg*(hw-.12)+.06,lin('#2a2b30'),MAT.METAL);}
  return DYNO[b.id]={deck:m.build(),straps:st.build(),drum:drumMesh(rd,zH-.04),ax,rd,fanX:x1+1.2,fanZ:-(hw+.75),fanYaw:Math.atan2(hw+.75,1.2),tris:(m.p.length+st.p.length)/9+ax.length*144};
}
/* the fan cart off the car's front corner, aimed at the grille: a ring, five blades turning, a frame on the floor */
let FAN=null;
function fanMesh(){if(FAN)return FAN;
  const m=new MB(),b=new MB(),n=32,dk=lin('#1d1e23'),gr=lin('#8a8f98'),ro=.62,ri=.56,d=.17;
  for(let k=0;k<n;k++){const a0=k/n*TAU,a1=(k+1)/n*TAU,am=(a0+a1)/2,P=(r,a,x)=>[x,Math.sin(a)*r,Math.cos(a)*r],nr=[0,Math.sin(am),Math.cos(am)];
    qdN(m,P(ro,a0,-d),P(ro,a1,-d),P(ro,a1,d),P(ro,a0,d),nr,dk,0,MAT.COL);qdN(m,P(ri,a0,-d),P(ri,a1,-d),P(ri,a1,d),P(ri,a0,d),[0,-nr[1],-nr[2]],dk,0,MAT.COL);
    for(const x of [-d,d])qdN(m,P(ri,a0,x),P(ro,a0,x),P(ro,a1,x),P(ri,a1,x),[Math.sign(x),0,0],dk,0,MAT.COL);}
  for(const z of [-.4,.4])boxN(m,-.05,.05,-.75,-.5,z-.04,z+.04,dk,MAT.METAL);boxN(m,-.32,.32,-.75,-.72,-.5,.5,dk,MAT.METAL);
  boxN(m,-.03,.03,-.5,-.04,-.03,.03,gr,MAT.METAL);
  for(let k=0;k<5;k++){const a=k/5*TAU,P=(r,da,x)=>[x,Math.sin(a+da)*r,Math.cos(a+da)*r];
    qdN(b,P(.09,-.2,.03),P(.09,.2,-.03),P(.52,.32,-.05),P(.52,-.32,.05),[-1,0,0],gr,0,MAT.METAL);}
  for(let k=0;k<12;k++){const a0=k/12*TAU,a1=(k+1)/12*TAU;b.tri([-.06,0,0],[-.06,Math.sin(a0)*.1,Math.cos(a0)*.1],[-.06,Math.sin(a1)*.1,Math.cos(a1)*.1],dk,0,MAT.COL);}
  return FAN={ring:m.build(),blades:b.build()};}
function drawDyno(i,Mt,dh,du){
  const Y=dynoOf(i),u=du||CUR.u,k=dh/DYNO_H;
  gl.uniformMatrix4fv(u.uM,false,M4.mul(Mt,M4S(1,k,1)));drawMesh(Y.deck);
  for(const a of Y.ax){gl.uniformMatrix4fv(u.uM,false,M4.mul(Mt,M4.mul(M4T(a.x,dh-Y.rd,0),M4RZ(SHOW.drumA))));drawMesh(Y.drum);}
  let tris=Y.tris;
  if(k>.98){gl.uniformMatrix4fv(u.uM,false,Mt);drawMesh(Y.straps);
    const F=fanMesh(),Mf=M4.mul(Mt,M4.mul(M4T(Y.fanX,.6,Y.fanZ),M4.mul(M4RY(Y.fanYaw),M4S(.8,.8,.8))));gl.uniformMatrix4fv(u.uM,false,Mf);drawMesh(F.ring);
    gl.uniformMatrix4fv(u.uM,false,M4.mul(Mf,M4RX(SHOW.fanA)));drawMesh(F.blades);tris+=900;}
  gl.uniformMatrix4fv(u.uM,false,M4.id());return tris;
}

/* ---------- the dyno's instruments, in dots: the lab's shift lights, tach, gear and speed (top right, under the
   car's name, since the controls take the bottom of the screen), its chips and where you're listening from ---------- */
const LISTEN_N=['Behind','Cabin','Trackside'];
function showHud(y0){
  const sim=SHOW.sim,e=showE(),on=!!(SHOW.eng&&sim&&sim.st!=='off'),rpm=on?Math.max(0,sim.rpmOut||0):0,drive=SHOW.mode==='drive';
  if(!on&&SHOW.tab!=='engine')return;
  engShiftLights(Math.round(W/2-45),3,e,rpm,on);
  const r=Math.round(H*.14),cx=W-r-7,cy=y0+Math.round(r*1.35);
  hDisc(cx,cy-r*.3,r*1.02,pack(4,3,8,150));engTach(cx,cy,r,e,rpm);
  const gi=on?sim.gear:0,g=!drive?'N':sim&&sim.shiftT>0?'-':gi?(e.bayCvt?'D':String(gi+(e.bayG0||1)-1)):'N';
  otxt5(g,cx,cy-r+12,rpm>e.shiftRpm-50&&drive?GR.cyan:GR.volt,2,'c');
  const sx=cx-r-50;hRect(sx-3,cy-14,47,18,pack(4,3,8,150));
  seg7(String(Math.round((sim&&drive?sim.v:0)*2.237)).padStart(3,' '),sx,cy-11,11,PAL.white,pack(40,36,52),2);txt3('MPH',sx+29,cy-3,PAL.dim);
  let bx=sx-10;const by=cy-30;
  if(e.fiBoost){const b=clamp(((sim&&sim.boost)||0)/(e.fiBoost*1.05),0,1);hRect(bx,by,4,28,pack(30,26,40));hRect(bx,by+28-Math.round(28*b),4,Math.round(28*b),e.sup?PAL.lime:PAL.amber);txt3('B',bx,by+30,PAL.dim);bx-=8;}
  /* the dyno's reading: power at the drums now, and this run's peak with the revs it came at */
  if(drive){const wx=sx-3,tq=rpm>300?SHOW.whp*5252/rpm:0;hRect(wx,cy+6,47,22,pack(4,3,8,150));txt3(String(Math.round(SHOW.whp)).padStart(4,' ')+' WHP',wx+3,cy+8,PAL.amber);
    txt3(String(Math.round(tq)).padStart(4,' ')+' TQ',wx+3,cy+15,PAL.cyan);
    txt3(SHOW.peak.hp>1?'PK '+Math.round(SHOW.peak.hp)+' @'+(Math.round(SHOW.peak.rpm/100)/10).toFixed(1)+'K':'PK -',wx+3,cy+22,PAL.dim);}
  if(e.nosKw&&sim){const b=clamp(sim.nos,0,1);hRect(bx,by,4,28,pack(30,26,40));hRect(bx,by+28-Math.round(28*b),4,Math.round(28*b),sim.nosOn&&(APP.t*10|0)%2?PAL.white:PAL.cyan);txt3('N',bx,by+30,PAL.dim);bx-=8;}
  /* the lab's chips and where you hear it from, under the shift lights */
  const bang=performance.now()-GAME.voice.popT<140,run=!!(sim&&sim.running);
  const C=[['LIMITER',!!(sim&&sim.cutFrac>.5&&!sim.twostep&&!sim.tcOn&&sim.shiftT<=0),PAL.red],['2-STEP',!!(sim&&sim.twostep),PAL.amber],['TC',!!(sim&&sim.tcOn),PAL.green],['NOS',!!(sim&&sim.nosOn),PAL.cyan],['BANG',bang,PAL.red]];
  if(e.antilag)C.splice(3,0,['ANTI-LAG',!!(e.turbo&&sim&&sim.thr<.2&&run&&sim.rpm>e.redline*.3),PAL.amber]);
  const lab=LISTEN_N[SHOW.listen].toUpperCase()+' . '+(drive?'DRIVE':'FREE REV'),parts=C.filter(c=>c[0]!=='NOS'||e.nosKw);
  let wsum=tw3(lab);for(const c of parts)wsum+=tw3(c[0])+5;let x=Math.round(W/2-wsum/2);hRect(x-3,10,wsum+6,9,pack(4,3,8,150));
  for(const [t,v,col] of parts){txt3(t,x,12,v?col:pack(70,64,86));x+=tw3(t)+5;}txt3(lab,x,12,PAL.dim);
  if(!on&&SHOW.status==='STALLED')otxt3('IT STALLED. START IT AGAIN',W/2,Math.round(H*.3),PAL.amber,1,'c');
  else if(!on){if((APP.t*1.6|0)%2===0)otxt5(touchy?'TAP START ENGINE':'PRESS I TO START',W/2,Math.round(H*.3),GR.steel,1,'c');}
  else if(sim.st==='crank')otxt3('CRANKING',W/2,Math.round(H*.3),PAL.amber,1,'c');
}

/* the bay's own window: in from the garage tab, the menu out of the way; Back (or Esc) to the garage */
function showFull(on){
  SHOW.full=!!on;$('bay').hidden=!on;$('menu').hidden=!!on;document.body.classList.toggle('bayfull',!!on);layout();
  if(!on){SHOW.padOn=false;SHOW.brkBtn=false;SHOW.nos=false;SHOW.rev=false;SHOW.horn=false;if(PULL.ph)showPullEnd(true);dlFlush();}
  SHOW.dockTop=undefined;showChart();
  if(!on&&GAME.state==='menu')requestAnimationFrame(()=>{const r=document.querySelector('#menu .mwrap').getBoundingClientRect();APP.menuRight=r.right;});
  syncShow();}
/* drag to turn round the car, pinch or scroll to come closer (the bay's own hands) */
function showPointer(){
  const P=new Map();let pinch0=0,d0=0;
  const cam=()=>{if(!SHOW.camT||SHOW.view){SHOW.camT=Object.assign({},SHOW.cam||showViewOf(SHOW.view));SHOW.view=null;syncShow();}return SHOW.camT;};
  cv.addEventListener('pointerdown',e=>{if(!SHOW.full)return;P.set(e.pointerId,[e.clientX,e.clientY]);try{cv.setPointerCapture(e.pointerId);}catch(_){}
    if(P.size===2){const [a,b]=[...P.values()];pinch0=Math.hypot(a[0]-b[0],a[1]-b[1]);d0=cam().d;}});
  cv.addEventListener('pointermove',e=>{if(!SHOW.full||!P.has(e.pointerId))return;const q=P.get(e.pointerId),dx=e.clientX-q[0],dy=e.clientY-q[1];P.set(e.pointerId,[e.clientX,e.clientY]);
    const c=cam();if(P.size===1){c.th-=dx*.35;c.ph=clamp(c.ph+dy*.25,1,75);}
    else if(P.size===2&&pinch0>0){const [a,b]=[...P.values()];c.d=clamp(d0*pinch0/Math.max(20,Math.hypot(a[0]-b[0],a[1]-b[1])),3.2,22);}});
  const up=e=>{P.delete(e.pointerId);if(P.size<2)pinch0=0;};for(const ev of ['pointerup','pointercancel'])cv.addEventListener(ev,up);
  cv.addEventListener('wheel',e=>{if(!SHOW.full)return;e.preventDefault();const c=cam();c.d=clamp(c.d*Math.pow(1.0015,e.deltaY),3.2,22);},{passive:false});
}
/* a button you hold (it stays held while your finger is on it, wherever it slides) */
function holdBtn(el,set){el.addEventListener('contextmenu',e=>e.preventDefault());
  el.addEventListener('pointerdown',e=>{e.preventDefault();if(el.disabled)return;try{el.setPointerCapture(e.pointerId);}catch(_){}set(true);el.classList.add('on');});
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(ev,()=>{set(false);el.classList.remove('on');});}
/* the lab's hands and feet, as in the model bay: Brake and Nitrous are held, the rest are taps */
const SH_BTNS=[{id:'brake',l:'Brake',k:'S',t:'hold',drive:1,tone:'red'},{id:'down',l:'Shift down',k:'Q',t:'tap',drive:1},{id:'up',l:'Shift up',k:'E',t:'tap',drive:1},
  {id:'blip',l:'Blip',k:'B',t:'tap'},{id:'nos',l:'Nitrous',k:'N',t:'hold',tone:'cyan',need:e=>e.nosKw},{id:'purge',l:'Purge',k:'P',t:'tap',need:e=>e.nosKw},
  {id:'jake',l:'Jake',k:'J',t:'cycle',need:e=>e.jake},{id:'horn',l:'Horn',k:'H',t:'hold',tone:'cyan'}];
/* the controls: Look (the studio, the views, spin, hood, lights, wash) and Engine (the lab's) */
function buildShow(){
  dlBuild();
  $('shOpen').addEventListener('click',()=>showFull(true));$('shBack').addEventListener('click',()=>showFull(false));showPointer();
  segButtons($('shTab'),[['look','Look'],['engine','Engine']],v=>{SHOW.tab=v;saveShow();syncShow();});
  segButtons($('shStage'),[['dark','Dark bay'],['light','Light cyc']],v=>{SHOW.stage=v;saveShow();syncShow();});
  segButtons($('shView'),SHOW_VIEWS.map(v=>[v[0],v[1]]),v=>showSetView(v));
  segButtons($('shMode'),[['free','Free rev'],['drive','Drive']],v=>showMode(v));
  segButtons($('shListen'),LISTEN_N.map((n,k)=>[String(k),n]),v=>showListen(+v));
  segButtons($('shRoom'),[['open','Open air'],['garage','Indoors'],['tunnel','Tunnel']],v=>showRoom(v));
  $('shVol').value=ENG.vol;$('shVol').addEventListener('input',e=>{setVolume(e.target.value);});
  for(const [id,k] of [['shSpin','spin'],['shHood','hood'],['shLights','lights']])$(id).addEventListener('click',()=>{SHOW[k]=!SHOW[k];if(k==='spin')SHOW.spinWas=false;if(k!=='hood')saveShow();syncShow();});
  $('shWash').addEventListener('click',()=>{GAME.dirt=0;});
  $('shEng').addEventListener('click',()=>{showEngine(!showRuns());$('shEng').blur();});
  $('shPull').addEventListener('click',()=>{showPullStart();$('shPull').blur();});
  $('shPlus').addEventListener('click',()=>{if(PULL.ph)showPullEnd(true);setPlus(APP.car,!PLUS.on[APP.car]);syncShow();$('shPlus').blur();});
  addEventListener('resize',()=>{SHOW.dockTop=undefined;if(SHOW.full)requestAnimationFrame(showChart);});
  /* the pad: hold to rev, further right for more throttle */
  const pad=$('shPad'),setPad=e=>{const r=pad.getBoundingClientRect();SHOW.pad=clamp((e.clientX-r.left-6)/(r.width-12),0,1);};
  pad.addEventListener('contextmenu',e=>e.preventDefault());
  pad.addEventListener('pointerdown',e=>{e.preventDefault();try{pad.setPointerCapture(e.pointerId);}catch(_){}SHOW.padOn=true;setPad(e);if(!showRuns())showEngine(true);});
  pad.addEventListener('pointermove',e=>{if(SHOW.padOn)setPad(e);});
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(ev,()=>{SHOW.padOn=false;});
  const box=$('shBtns');
  for(const d of SH_BTNS){const b=document.createElement('button');b.type='button';b.className='bk';if(d.tone)b.dataset.tone=d.tone;
    b.innerHTML='<span></span><kbd>'+d.k+'</kbd>';b.querySelector('span').textContent=d.l;d.el=b;
    if(d.t==='hold')holdBtn(b,v=>{if(d.id==='brake')SHOW.brkBtn=v;else if(d.id==='horn')SHOW.horn=v;else SHOW.nos=v;});
    else{b.addEventListener('pointerdown',e=>{e.preventDefault();if(!b.disabled){showAct(d.id);b.classList.add('on');setTimeout(()=>b.classList.remove('on'),120);}});
      b.addEventListener('click',e=>{if(e.detail===0&&!b.disabled)showAct(d.id);b.blur();});}
    box.appendChild(b);}
  /* the keys in the bay's window, as in the lab: W, Up or Space for gas (1 to 9 part gas), S brake, Q and E shift,
     B blip, N nitrous, P purge, I the engine, V where you listen from, M free rev or drive */
  addEventListener('keydown',e=>{
    if(!SHOW.full||!showActive()||e.repeat||e.metaKey||e.ctrlKey||e.altKey||typing(e.target))return;
    const c=e.code;
    if(c==='KeyQ')showAct('down');else if(c==='KeyE')showAct('up');else if(c==='KeyB')showAct('blip');else if(c==='KeyP')showAct('purge');else if(c==='KeyJ')showAct('jake');
    else if(c==='KeyI')showEngine(!showRuns());else if(c==='KeyV')showListen((SHOW.listen+1)%3);else if(c==='KeyM')showMode(SHOW.mode==='drive'?'free':'drive');
    /* (the gas and the brake are read each frame; here they only keep the page and a focused button out of it) */
    else if(!(c==='Space'||c==='KeyW'||c==='KeyS'||c==='KeyN'||c==='KeyH'||c.startsWith('Arrow')||c.startsWith('Digit')))return;e.preventDefault();});
  syncShow();
}
function syncShow(){
  for(const [id,v] of [['shStage',SHOW.stage],['shView',SHOW.view],['shTab',SHOW.tab],['shMode',SHOW.mode],['shListen',String(SHOW.listen)],['shRoom',SHOW.room]])
    if($(id))for(const el of $(id).children)el.setAttribute('aria-pressed',String(el.dataset.v===v));
  if(!$('shEng'))return;
  const eng=SHOW.tab==='engine',e=GAME.car&&GAME.car.spec,on=showRuns();
  $('bay').dataset.tab=SHOW.tab;$('shDock').hidden=eng;$('dl').hidden=!eng;SHOW.dockTop=undefined;
  for(const [id,k] of [['shSpin','spin'],['shHood','hood'],['shLights','lights']])$(id).setAttribute('aria-pressed',String(!!SHOW[k]));
  $('shHood').disabled=!!(BUILDS[APP.bi]&&BUILDS[APP.bi].machine);
  $('shEng').setAttribute('aria-pressed',String(on));$('shEngLbl').textContent=on?'Engine on':'Start engine';
  for(const d of SH_BTNS){if(!d.el)continue;d.el.hidden=!!(d.need&&!(e&&d.need(e)));d.el.disabled=!!(d.drive&&SHOW.mode!=='drive');
    if(d.t==='cycle'){const v=SHOW.sim?SHOW.sim.c[d.id]|0:0;d.el.querySelector('span').textContent=d.l+': '+['off','low','med','high'][v];d.el.setAttribute('aria-pressed',String(v>0));}}
  $('shVol').value=ENG.vol;
  $('shPull').textContent=PULL.ph?'Stop pull':PULL.pending?'Starting…':'Dyno pull';$('shPull').setAttribute('aria-pressed',String(!!PULL.ph));
  $('shPlus').textContent='Plus';$('shPlus').setAttribute('aria-pressed',String(!!PLUS.on[APP.car]));
  showLive(true);dlSync();
}
/* what changes every frame: the pad's fill, and the power button when the engine catches or stops */
const SHLIVE={};
function showLive(force){
  if(!$('shPad'))return;const on=showRuns(),w=Math.round((SHOW.inp?SHOW.inp.thr:0)*100);
  if(force||SHLIVE.w!==w){SHLIVE.w=w;$('shPadFill').style.width=w+'%';$('shPad').setAttribute('aria-valuenow',String(w));$('dlPadFill').style.height=w+'%';$('dlPad').setAttribute('aria-valuenow',String(w));}
  if(force||SHLIVE.on!==on){SHLIVE.on=on;$('shEng').setAttribute('aria-pressed',String(on));$('shEngLbl').textContent=on?'Engine on':'Start engine';
    $('shPadLbl').textContent=on?'Hold to rev · further right, more throttle':'Hold to start and rev';}
}

/* ---------- the dyno pull, as a dyno shop runs one ----------
   Roll it up through the gears to the start revs in the gear nearest 1:1, hold it there a moment, then wide open to
   the redline, logging the power at the drums (the wheels' pull times their speed) against the revs; then the
   sheet: power at the wheels and torque (worked back from power and revs, the way a dyno does, so the two cross at
   5,252), the engine's own power at the crank for what the drivetrain takes, and the last pull faint underneath to
   see what a part changed. A belt-drive machine is pulled with its belt held at the top ratio, and a road-speed
   governor is off for the pull, as a shop would have it. */
const PULL={ph:'',g:0,t:0,hold:0,start:0,end:0,vT:0,pts:[],last:null,prev:null,sheet:false,pending:false,sheets:{}};
/* each car's last sheet is kept (b40-dyno), so a part fitted next week is compared against this week's pull */
try{PULL.sheets=JSON.parse(store.get('b40-dyno','{}'))||{};}catch(e){}
const sheetOf=car=>PULL.sheets[car]||null;
const pullGear=s=>{let g=1,best=1e9;s.gears.forEach((r,k)=>{const d=Math.abs(Math.log(r));if(d<best){best=d;g=k+1;}});return g;};
const ordinal=n=>n+(n%100>10&&n%100<14?'TH':['TH','ST','ND','RD'][n%10]||'TH');
function showPullStart(){
  if(PULL.pending)return;
  if(PULL.ph){showPullEnd(true);return;}
  if(SHOW.mode!=='drive')showMode('drive');
  if(!showRuns()){const bi=APP.bi;PULL.pending=true;syncShow();
    showEngine(true).then(()=>setTimeout(()=>{PULL.pending=false;if(SHOW.full&&showActive()&&APP.bi===bi&&showRuns())showPullStart();else syncShow();},1200));return;}
  const s=SHOW.bs,sim=SHOW.sim,cvt=!!s.bayCvt,g=cvt?1:pullGear(s),ratio=(cvt?s.bayCvt.hi:s.gears[g-1])*s.fd;
  let start=Math.max(s.idle*1.3,s.redline*.32);if(start>s.redline*.75)start=Math.max(s.idle*1.05,s.redline*.6);
  /* on the drum, not the road: an inertia dyno's drum stands in for about half the car's weight and there's no
     air to push, so a pull takes seconds, not most of a minute (the tyres keep the grip they had) */
  PULL.saved={mass:s.mass,cdA:s.cdA,mu:s.mu};PULL.spec=s;PULL.auto=sim.auto;s.mass*=.5;s.cdA=0;s.mu=(s.mu||1)/.5;
  Object.assign(PULL,{ph:'roll',g,t:0,hold:0,ti:0,start,end:s.redline,ratio,vT:start*TAU/60/ratio*s.R,pts:[],sheet:true,car:APP.car,bi:APP.bi});
  sim.auto=false;syncShow();showChart();
}
function showPullEnd(abort){
  const P=PULL;if(!P.ph)return;P.ph='';if(SHOW.sim)SHOW.sim.auto=P.auto!==false;
  if(P.saved&&P.spec){Object.assign(P.spec,P.saved);}P.saved=null;
  if(!abort&&P.pts.length>12){const sh=pullSheet(P);P.prev=sheetOf(P.car);P.last=sh;PULL.sheets[P.car]=sh;try{store.set('b40-dyno',JSON.stringify(PULL.sheets));}catch(e){}}
  syncShow();showChart();
}
/* the driver's feet during a pull */
function pullDrive(sim,s,dt){
  const P=PULL,rpm=sim.rpm;P.t+=dt;let thr=0,brk=0;
  /* a belt runs its own law until the start speed, then is held at its top ratio for the sweep */
  if(s.bayCvt&&!(P.ph==='roll'&&sim.v<P.vT*.95))s.gears[0]=s.bayCvt.hi;
  if(P.ph==='roll'){
    const nxt=sim.gear>0&&sim.gear<s.nG?rpm*s.gears[sim.gear]/s.gears[sim.gear-1]:0;
    if(sim.shiftT<=0&&sim.gear>0&&sim.gear<P.g&&nxt>P.start*.8)sim.shift(1);
    else if(sim.shiftT<=0&&sim.gear>P.g&&rpm*s.gears[sim.gear-2]/s.gears[sim.gear-1]<s.redline*.85)sim.shift(-1);
    if(sim.gear>P.g){brk=.3;}
    else if(sim.gear<P.g||sim.clutch!=='lock'||s.bayCvt&&sim.v<P.vT*.95){thr=s.bayCvt?1:.85;}
    else{const dv=P.vT-sim.v;P.ti=clamp((P.ti||0)+dv*dt*.08,-.2,.4);thr=clamp(.15+P.ti+dv*.15,0,.75);if(dv<-1.5)brk=.2;
      if(Math.abs(rpm-P.start)<P.start*.08)P.hold+=dt;else P.hold=0;
      if(P.hold>.8){P.ph='pull';P.t=0;P.rpm0=rpm;P.rate=0;P.brk=0;P.bi2=0;}}
    if(P.t>45)showPullEnd(true);
  }else if(P.ph==='pull'){thr=1;
    /* the dyno's absorber holds the sweep to about eight seconds, start to redline, as a shop's dyno does, so a
       light, low-geared machine isn't measured spinning up its own flywheel; what it absorbs is counted */
    const rate=(rpm-(P.rpm0||rpm))/Math.max(dt,1e-3),want=(P.end-P.start)/8;P.rpm0=rpm;P.rate=(P.rate||want)+(rate-(P.rate||want))*Math.min(1,dt*6);
    P.bi2=clamp((P.bi2||0)+(P.rate-want)/want*dt*1.5,0,.9);P.brk=clamp(P.bi2+(P.rate-want)/want*.3,0,.9);brk=P.brk;
    /* (what the drum reads: the tyre's own rolling loss never reaches it) */
    if(sim.clutch==='lock'&&sim.shiftT<=0&&sim.cutFrac<.5)P.pts.push([rpm,Math.max(0,(showPull(sim,s,brk)-(sim.v>.05?.013*s.mass*9.81:0))*sim.v/745.7)]);
    if(rpm>=P.end*.995||sim.cutFrac>.5&&rpm>P.end*.9||P.t>40){P.ph='down';P.t=0;sim.auto=true;}
  }else if(P.ph==='down'){brk=1;if(sim.v<.6||P.t>8)showPullEnd(false);}
  return {thr,brk,nos:false};
}
/* the log into a sheet: averaged into narrow rev bands, torque worked back from power and revs */
function pullSheet(P){
  const n=60,lo=P.start,hi=P.end,bw=(hi-lo)/n,acc=Array.from({length:n},()=>[0,0,0]);
  for(const [r,h] of P.pts){const k=Math.floor((r-lo)/bw);if(k<0||k>=n)continue;acc[k][0]+=r;acc[k][1]+=h;acc[k][2]++;}
  const pts=acc.filter(a=>a[2]).map(a=>{const r=a[0]/a[2],h=a[1]/a[2];return {rpm:r,hp:h,tq:h*5252/r};});
  const pk=k=>pts.reduce((m,p)=>p[k]>m[k]?p:m,pts[0]||{rpm:0,hp:0,tq:0});
  const e=SHOW.bs,cr=SIM.curve(e,80).filter(c=>c.rpm>=lo*.95&&c.rpm<=hi*1.01).map(c=>({rpm:c.rpm,hp:c.hp}));
  return {pts,hpPk:pk('hp'),tqPk:pk('tq'),crank:cr,crankPk:e.peak?e.peak.hp:0,lo,hi,gear:P.g+(e.bayG0||1)-1,cvt:!!e.bayCvt,
    name:carName({car:P.car})+' '+rigName(P.car,rigOf(P.car))+plusTag(P.car),car:P.car};
}
/* the sheet, drawn on its own canvas at the screen's pixels */
function showChart(){
  const el=$('shChart');if(!el)return;const P=PULL,live=!!P.ph,S=live?null:sheetOf(APP.car);
  if(!SHOW.full||!P.sheet)return;
  if(!live&&!S){const c0=$('shChartC'),g0=c0.getContext('2d');g0.setTransform(1,0,0,1,0,0);g0.clearRect(0,0,c0.width,c0.height);$('shChartT').textContent='Dyno sheet';
    const f0='No pull on this car yet. Tap <b>Dyno pull</b>: the dyno rolls it up to the start revs in the gear nearest 1:1, then wide open to the redline.';if($('shChartF').innerHTML!==f0)$('shChartF').innerHTML=f0;return;}
  const cv2=$('shChartC'),dpr=Math.min(2,devicePixelRatio||1),cw=Math.max(10,cv2.clientWidth),ch=Math.max(10,cv2.clientHeight);
  if(cv2.width!==Math.round(cw*dpr)||cv2.height!==Math.round(ch*dpr)){cv2.width=Math.round(cw*dpr);cv2.height=Math.round(ch*dpr);}
  const g=cv2.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,cw,ch);
  /* what's on it: the finished sheet, or the pull as it happens */
  const cur=S||{pts:P.pts.map(([r,h])=>({rpm:r,hp:h,tq:h*5252/Math.max(r,1)})),lo:P.start,hi:P.end,crank:[]},prev=live?sheetOf(P.car):(P.prev&&P.prev.car===APP.car&&P.last===S?P.prev:null);
  const lo=Math.min(cur.lo,prev&&prev.car===P.car?prev.lo:1e9),hi=Math.max(cur.hi,prev&&prev.car===P.car?prev.hi:0),span=hi-lo;
  const step=span<1600?250:span<4500?500:1000,x0=Math.floor(lo/step)*step,x1=Math.ceil(hi/step)*step;
  let ymax=10;for(const L of [cur.pts,prev?prev.pts:[],cur.crank||[]])for(const p of L)ymax=Math.max(ymax,p.hp||0,p.tq||0);
  const ys=ymax>600?100:ymax>250?50:ymax>100?25:10;ymax=Math.ceil(ymax*1.08/ys)*ys;
  const ml=30,mr=8,mt=6,mb=18,X=r=>ml+(r-x0)/(x1-x0)*(cw-ml-mr),Y=v=>mt+(1-v/ymax)*(ch-mt-mb);
  g.font='500 10px "Saira Condensed","Arial Narrow",sans-serif';g.textBaseline='middle';
  g.strokeStyle='rgba(255,255,255,.08)';g.lineWidth=1;g.fillStyle='#6c6880';
  for(let v=0;v<=ymax+.1;v+=ymax/5){const y=Math.round(Y(v))+.5;g.beginPath();g.moveTo(ml,y);g.lineTo(cw-mr,y);g.stroke();g.textAlign='right';g.fillText(String(Math.round(v)),ml-4,y);}
  for(let r=x0;r<=x1+.1;r+=step){const x=Math.round(X(r))+.5;g.beginPath();g.moveTo(x,mt);g.lineTo(x,ch-mb);g.stroke();g.textAlign='center';g.fillText(step<1000?(r/1000).toFixed(r%1000?(step<500?2:1):0):String(r/1000),x,ch-mb+9);}
  g.textAlign='right';g.fillText('RPM x1000',cw-mr,ch-3);
  const line=(L,k,col,w,dash)=>{if(L.length<2)return;g.strokeStyle=col;g.lineWidth=w;g.setLineDash(dash||[]);g.beginPath();L.forEach((p,j)=>{const x=X(p.rpm),y=Y(p[k]);j?g.lineTo(x,y):g.moveTo(x,y);});g.stroke();g.setLineDash([]);};
  if(cur.crank)line(cur.crank,'hp','rgba(168,162,184,.55)',1.2,[2,3]);
  if(prev&&prev.car===P.car){line(prev.pts,'hp','rgba(255,180,60,.4)',1.2,[5,4]);line(prev.pts,'tq','rgba(79,227,255,.4)',1.2,[5,4]);}
  line(cur.pts,'hp','#ffb43c',2.2);line(cur.pts,'tq','#4fe3ff',2.2);
  /* the peaks, marked */
  if(S){for(const [p,k,col] of [[S.hpPk,'hp','#ffb43c'],[S.tqPk,'tq','#4fe3ff']]){const x=X(p.rpm),y=Y(p[k]);g.fillStyle=col;g.beginPath();g.arc(x,y,3,0,TAU);g.fill();
    g.textAlign=x>cw*.7?'right':'left';g.fillText(Math.round(p[k])+(k==='hp'?' WHP':' LB-FT'),x+(x>cw*.7?-6:6),y-8);}}
  const gear=S?S.gear:PULL.g+((SHOW.bs&&SHOW.bs.bayG0)||1)-1,cvt=S?S.cvt:!!(SHOW.bs&&SHOW.bs.bayCvt),gl2=cvt?'BELT HELD AT TOP':ordinal(gear)+' GEAR';
  $('shChartT').textContent=live?(P.ph==='roll'?'Rolling up to '+Math.round(P.start).toLocaleString()+' rpm, '+gl2.toLowerCase():P.ph==='pull'?'Pulling, wide open · '+gl2.toLowerCase():'Coming down'):'Dyno sheet · '+gl2.toLowerCase();
  let f='';
  if(S){const loss=S.crankPk>0?Math.round((1-S.hpPk.hp/S.crankPk)*100):0;
    f='<b>'+Math.round(S.hpPk.hp)+' whp</b> at '+Math.round(S.hpPk.rpm).toLocaleString()+' · <b>'+Math.round(S.tqPk.tq)+' lb-ft</b> at '+Math.round(S.tqPk.rpm).toLocaleString()+
      '<br>'+S.name+': '+Math.round(S.crankPk)+' hp at the crank, '+Math.max(0,loss)+'% lost on the way to the drums';
    if(prev){const d=Math.round(S.hpPk.hp-prev.hpPk.hp);f+='<br>The pull before ('+prev.name+'): '+Math.round(prev.hpPk.hp)+' whp, '+(d>=0?'+':'')+d;}}
  else f='Hands off: the dyno is driving. Tap Stop pull to stop.';
  if($('shChartF').innerHTML!==f)$('shChartF').innerHTML=f;
}
