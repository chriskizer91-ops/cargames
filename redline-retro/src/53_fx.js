/* =====================================================================================
   DUST, MUD AND SPRAY, on a fixed budget. At most FX_MAX little lumps alive at once, all drawn
   in one instanced call; when the budget is full, new ones simply aren't made. Nothing here can
   pile up and slow the game down, however hard the truck tumbles.
   The mud clods are solid little lumps in the lit pass; the dust and the spray are soft puffs over the finished
   picture, through the renderer's particles hook (FXP).
   ===================================================================================== */
const FX_MAX=360,FX=[],FX_BUF=new Float32Array(FX_MAX*12);let FX_MESH=null;
/* how many may be alive at once on each tier (Mobile's is the phone's budget; the others take the whole buffer) */
const FX_CAP={mobile:220,low:300};const fxCap=()=>FX_CAP[GFX.level]||FX_MAX;
const FX_COL={dirt:[.36,.22,.12],trail:[.4,.27,.15],strip:[.42,.3,.2],grass:[.3,.26,.14],rock:[.36,.3,.26],concrete:[.4,.39,.37],mud:[.12,.08,.045],water:[.62,.7,.78],gravel:[.46,.43,.38],asphalt:[.3,.3,.3],ruts:[.13,.085,.05]};
const fxCount=n=>Math.floor(n)+(Math.random()<n%1?1:0);
function fxAdd(kind,p,v,size,life,col){
  if(FX.length>=fxCap())return;
  FX.push({kind,x:p[0],y:p[1],z:p[2],vx:v[0],vy:v[1],vz:v[2],s:size,s0:size,life,max:life,r:col[0],g:col[1],b:col[2],yaw:Math.random()*TAU});
}
/* each tyre throws what it is on: dust off dry ground, clods off mud, spray in the creek */
function fxEmit(dt,t){
  if(reduce)return;const K=LOOK.dust;
  for(const w of t.wheels){
    if(!w.contact)continue;const R=w.R,surf=w.surf,col=FX_COL[surf]||FX_COL.dirt,spin=Math.abs(w.w*R-w.vl),roll=Math.abs(w.vl);
    const back=[-w.f[0],-w.f[1],-w.f[2]],sgnv=w.w*R>=0?1:-1,cp=w.cp;
    if(surf==='mud'||surf==='ruts'){const n=fxCount((spin*2.2+roll*.5)*(surf==='ruts'?.7:1)*K*dt);for(let k=0;k<n;k++){
        const sp=2+spin*.5;fxAdd('mud',[cp[0]+(Math.random()-.5)*.3,cp[1]+.15,cp[2]+(Math.random()-.5)*.3],[back[0]*sp*sgnv+(Math.random()-.5)*2,1.5+Math.random()*2.5+spin*.15,back[2]*sp*sgnv+(Math.random()-.5)*2],.07+Math.random()*.08,1.2,col);}}
    else if(surf==='water'){const n=fxCount((roll*1.6+spin*.6)*K*dt);for(let k=0;k<n;k++){
        const side=w.r,s=(Math.random()<.5?-1:1)*(1+roll*.15);fxAdd('water',[cp[0],cp[1]+.2,cp[2]],[side[0]*s+back[0]*.6,2+Math.random()*2.5+roll*.12,side[2]*s+back[2]*.6],.06+Math.random()*.06,.8,col);}}
    else if(surf!=='concrete'&&surf!=='asphalt'){const k0=surf==='rock'?.3:surf==='grass'?.5:surf==='gravel'?.8:1,n=fxCount((Math.max(0,spin-1.5)*1.4+Math.max(0,roll-4)*.25)*k0*K*dt);
      for(let k=0;k<n;k++)fxAdd('dust',[cp[0]+(Math.random()-.5)*.4,cp[1]+.1,cp[2]+(Math.random()-.5)*.4],[back[0]*spin*.25*sgnv+(Math.random()-.5),.6+Math.random()*.8,back[2]*spin*.25*sgnv+(Math.random()-.5)],.12+Math.random()*.1,1.6+Math.random(),col);}
  }
  sprayEmit(dt,t);
}
function fxStep(dt){
  const W=RANCH.W;
  for(let i=FX.length-1;i>=0;i--){const p=FX[i];p.life-=dt;if(p.life<=0){FX[i]=FX[FX.length-1];FX.pop();continue;}
    const a=1-p.life/p.max;
    if(p.kind==='spray'){p.vx*=1-dt*2.4;p.vz*=1-dt*2.4;p.vy=p.vy*(1-dt*2)-dt*.6;p.s=p.s0*(1+a*3);}
    else if(p.kind==='dust'){p.vx*=1-dt*1.6;p.vz*=1-dt*1.6;p.vy=p.vy*(1-dt*1.2)+dt*.25;p.s=p.s0*(1+a*4);}
    else{p.vy-=9.8*dt;p.vx*=1-dt*.4;p.vz*=1-dt*.4;if(p.kind==='water')p.s=p.s0*(1-a*.6);}
    p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
    if(p.kind!=='dust'&&p.kind!=='spray'){const gy=W.heightAt(p.x,p.z);if(p.y<gy){p.y=gy;p.vx=p.vy=p.vz=0;if(p.kind==='water')p.life=0;else p.life=Math.min(p.life,.4);}}
  }
}
/* the mud clods: solid little lumps in the lit pass, drawn with the land (52_world_gl; the dust and the spray are FXP's) */
function fxDraw(){
  if(!FX.length)return 0;
  if(!FX_MESH){const mb=new MB();mb.blob([0,0,0],1,1,1,[1,1,1],0,MAT.COL);FX_MESH=mb.build();}
  let n=0;for(const p of FX){if(p.kind!=='mud')continue;const o=n*12;FX_BUF[o]=p.x-RO[0];FX_BUF[o+1]=p.y-RO[1];FX_BUF[o+2]=p.z-RO[2];FX_BUF[o+3]=p.yaw;FX_BUF[o+4]=p.s;FX_BUF[o+5]=p.s*(p.kind==='dust'?.8:1);FX_BUF[o+6]=p.s;FX_BUF[o+7]=0;
    FX_BUF[o+8]=p.r;FX_BUF[o+9]=p.g;FX_BUF[o+10]=p.b;FX_BUF[o+11]=0;n++;}
  if(!n)return 0;
  setInst(FX_MESH,FX_BUF.subarray(0,n*12));
  gl.uniform1f(CUR.u.uInst,1);drawMeshI(FX_MESH);gl.uniform1f(CUR.u.uInst,0);
  return n*32;
}


/* the dust and the spray: soft round puffs facing the camera, blended over the finished scene through the renderer's
   particles hook (after TAA, so with the camera's unjittered matrices), lit at their position by the sun, the sky and
   the lamps, fogged like the rest, and faded softly into whatever they touch */
let P_PUFF=null,PUFF_MESH=null;const PUFF_BUF=new Float32Array(FX_MAX*12);
const FXP={tx:null,txSrc:null,ores:[0,0],
  init(){if(P_PUFF)return;const S=rutShaders();P_PUFF=R.G.program('puff',S.PUFF_VS,S.PUFF_FS);
    PUFF_MESH=makeMesh({pos:new Float32Array([-1,-1,0,1,-1,0,1,1,0,-1,-1,0,1,1,0,-1,1,0]),nrm:new Float32Array(18),col:new Float32Array(24)});},
  particles(R,U,texs){
    if(DEVW.off.fx||showActive())return;
    let n=0;for(let i=0;i<FX.length;i++){const p=FX[i];if(p.kind==='mud')continue;const o=n*12,f=p.life/p.max;
      PUFF_BUF[o]=p.x-RO[0];PUFF_BUF[o+1]=p.y-RO[1];PUFF_BUF[o+2]=p.z-RO[2];PUFF_BUF[o+3]=p.yaw;PUFF_BUF[o+4]=p.s*(p.kind==='water'?1.2:1.7);PUFF_BUF[o+5]=p.yaw;PUFF_BUF[o+6]=0;PUFF_BUF[o+7]=0;
      PUFF_BUF[o+8]=p.r;PUFF_BUF[o+9]=p.g;PUFF_BUF[o+10]=p.b;PUFF_BUF[o+11]=p.kind==='dust'?.5*Math.min(1,f*1.6)*Math.min(1,(1-f)*8):p.kind==='spray'?.28*f*Math.min(1,(1-f)*6):.45*f;n++;}
    if(!n)return;
    const G=R.G;this.init();
    /* (the frame's uniforms with the unjittered matrix, the frame's textures with the depth: set in place, not copied into
       new objects every frame) */
    const P=G.use(P_PUFF);G.set(P,U);G.uni(P,'uVP',U.uVPnj);
    if(this.txSrc!==texs){this.tx=Object.assign({},texs);this.txSrc=texs;}this.tx.uDepth=R.dT;G.tex(P,this.tx);
    this.ores[0]=R.W;this.ores[1]=R.H;G.uni(P,'uOutRes',this.ores);const B=R.camBasis;G.uni(P,'uRt',B.r);G.uni(P,'uUp',B.up);
    setInst(PUFF_MESH,PUFF_BUF.subarray(0,n*12));
    /* (Redline Retro: no depth texture to fade them by, so the depth test, read only, keeps them behind what's in front) */
    gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.enable(gl.DEPTH_TEST);gl.depthMask(false);gl.disable(gl.CULL_FACE);
    drawMeshI(PUFF_MESH);gl.bindVertexArray(null);
  }
};

/* ---------- the rain: the renderer's own rain particles (11_sl3's Particles: streaks falling through a box round the
   camera, lit by the lamps and the headlights they pass, and splashes on the ground) in place of Wide Open's dithered
   streaks. The renderer finds the ground under a drop in a mask: a square of heights round the camera (64 x 64 at 2
   m), made again when the camera has moved 16 m, its corner moved with the floating origin; Marisol's garage is under
   a roof. Its programs are made when the rain first falls (or warmed at the boot, 65_boot). The streaks and splashes
   on each tier: RAIN_N ---------- */
const RAIN_N={mobile:[2600,420],low:[4000,700],medium:[6000,1000],high:[8000,1300],ultra:[9000,1400]};
const RAINP={P:null,n:64,cell:2,x0:NaN,z0:NaN,data:null,ms:0};
function rainMaskMake(ex,ez){
  const t0=performance.now(),n=RAINP.n,c=RAINP.cell,x0=Math.round(ex/16)*16-n*c/2,z0=Math.round(ez/16)*16-n*c/2,d=RAINP.data||(RAINP.data=new Float32Array(n*n*2)),Gr=WG.GARAGE;
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const x=x0+(i+.5)*c,z=z0+(j+.5)*c,o=(j*n+i)*2;d[o]=RANCH.W.heightAt(x,z)-RO[1];
    d[o+1]=x>Gr.x0&&x<Gr.x1&&z>Gr.z0&&z<Gr.z1?0:1;}
  RAINP.x0=x0;RAINP.z0=z0;RAINP.ms=performance.now()-t0;
  return {n,data:d,params:[x0-RO[0],z0-RO[2],1/(n*c)]};
}
function rainInit(){if(RAINP.P)return RAINP.P;const e=GAME.car?GAME.car.p:[0,0,0],[rn,sn]=RAIN_N[GFX.level]||RAIN_N.mobile;
  RAINP.P=new SL3.Particles(R,rainMaskMake(e[0],e[2]),{rainN:rn,splashN:sn});RAINP.P.rain.on=0;return RAINP.P;}
/* each frame: how hard it rains (the weather's, times the Dev look's), the wind and the camera's motion for the
   streaks' slant, the mask under the camera */
function rainUpdate(eyeW,vel,rain){
  const P=RAINP.P;if(!P&&rain<=.01)return;rainInit();
  P.rain.on=showActive()||DEVW.off.fx?0:Math.min(1,rain*LOOK.rain);if(P.rain.on<=.01)return;
  const n=RAINP.n,c=RAINP.cell;if(!(Math.abs(eyeW[0]-(RAINP.x0+n*c/2))<16&&Math.abs(eyeW[2]-(RAINP.z0+n*c/2))<16))P.setMask(rainMaskMake(eyeW[0],eyeW[2]));
  P.maskP=[RAINP.x0-RO[0],RAINP.z0-RO[2],1/(n*c)];
  P.rain.fall=[1.2,-9.5,.6];P.rain.camVel=vel;
}
/* spray off wet tarmac and concrete: the tyres throw a fine mist behind them at speed (puffs, like the dust) */
function sprayEmit(dt,t){
  if(reduce||WX.wet<.25)return;
  for(const w of t.wheels){if(!w.contact)continue;const surf=w.surf;if(surf!=='asphalt'&&surf!=='concrete')continue;const v=Math.abs(w.vl);if(v<7)continue;
    const n=fxCount((v-7)*.55*WX.wet*LOOK.dust*dt);const back=[-w.f[0],-w.f[1],-w.f[2]],cp=w.cp,sg=w.vl>=0?1:-1;
    for(let k=0;k<n;k++)fxAdd('spray',[cp[0]+back[0]*.3*sg,cp[1]+.15,cp[2]+back[2]*.3*sg],[back[0]*v*.12*sg+(Math.random()-.5)*1.2,.5+Math.random()*.9,back[2]*v*.12*sg+(Math.random()-.5)*1.2],.22+Math.random()*.15,.9+Math.random()*.5,[.62,.66,.7]);}
}
