/* =====================================================================================
   DUST, MUD AND SPRAY, on a fixed budget. At most FX_MAX little lumps alive at once, all drawn
   in one instanced call; when the budget is full, new ones simply aren't made. Nothing here can
   pile up and slow the game down, however hard the truck tumbles.
   ===================================================================================== */
const FX_MAX=360,FX=[],FX_BUF=new Float32Array(FX_MAX*12);let FX_MESH=null;
const FX_COL={dirt:[.36,.22,.12],trail:[.4,.27,.15],strip:[.42,.3,.2],grass:[.3,.26,.14],rock:[.36,.3,.26],concrete:[.4,.39,.37],mud:[.12,.08,.045],water:[.62,.7,.78],gravel:[.46,.43,.38],asphalt:[.3,.3,.3],ruts:[.13,.085,.05]};
const fxCount=n=>Math.floor(n)+(Math.random()<n%1?1:0);
function fxAdd(kind,p,v,size,life,col){
  if(FX.length>=FX_MAX)return;
  FX.push({kind,x:p[0],y:p[1],z:p[2],vx:v[0],vy:v[1],vz:v[2],s:size,s0:size,life,max:life,r:col[0],g:col[1],b:col[2],yaw:Math.random()*TAU});
}
/* each tyre throws what it is on: dust off dry ground, clods off mud, spray in the creek */
function fxEmit(dt,t){
  if(reduce)return;
  const R=t.c.R;
  for(const w of t.wheels){
    if(!w.contact)continue;const surf=w.surf,col=FX_COL[surf]||FX_COL.dirt,spin=Math.abs(w.w*R-w.vl),roll=Math.abs(w.vl);
    const back=[-w.f[0],-w.f[1],-w.f[2]],sgnv=w.w*R>=0?1:-1,cp=w.cp;
    if(surf==='mud'||surf==='ruts'){const n=fxCount((spin*2.2+roll*.5)*(surf==='ruts'?.7:1)*dt);for(let k=0;k<n;k++){
        const sp=2+spin*.5;fxAdd('mud',[cp[0]+(Math.random()-.5)*.3,cp[1]+.15,cp[2]+(Math.random()-.5)*.3],[back[0]*sp*sgnv+(Math.random()-.5)*2,1.5+Math.random()*2.5+spin*.15,back[2]*sp*sgnv+(Math.random()-.5)*2],.07+Math.random()*.08,1.2,col);}}
    else if(surf==='water'){const n=fxCount(roll*1.6*dt+spin*.6*dt);for(let k=0;k<n;k++){
        const side=w.r,s=(Math.random()<.5?-1:1)*(1+roll*.15);fxAdd('water',[cp[0],cp[1]+.2,cp[2]],[side[0]*s+back[0]*.6,2+Math.random()*2.5+roll*.12,side[2]*s+back[2]*.6],.06+Math.random()*.06,.8,col);}}
    else if(surf!=='concrete'&&surf!=='asphalt'){const k0=surf==='rock'?.3:surf==='grass'?.5:surf==='gravel'?.8:1,n=fxCount((Math.max(0,spin-1.5)*1.4+Math.max(0,roll-4)*.25)*k0*dt);
      for(let k=0;k<n;k++)fxAdd('dust',[cp[0]+(Math.random()-.5)*.4,cp[1]+.1,cp[2]+(Math.random()-.5)*.4],[back[0]*spin*.25*sgnv+(Math.random()-.5),.6+Math.random()*.8,back[2]*spin*.25*sgnv+(Math.random()-.5)],.12+Math.random()*.1,1.6+Math.random(),col);}
  }
}
function fxStep(dt){
  const W=RANCH.W;
  for(let i=FX.length-1;i>=0;i--){const p=FX[i];p.life-=dt;if(p.life<=0){FX[i]=FX[FX.length-1];FX.pop();continue;}
    const a=1-p.life/p.max;
    if(p.kind==='dust'){p.vx*=1-dt*1.6;p.vz*=1-dt*1.6;p.vy=p.vy*(1-dt*1.2)+dt*.25;p.s=p.s0*(1+a*4);}
    else{p.vy-=9.8*dt;p.vx*=1-dt*.4;p.vz*=1-dt*.4;if(p.kind==='water')p.s=p.s0*(1-a*.6);}
    p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
    if(p.kind!=='dust'){const gy=W.heightAt(p.x,p.z);if(p.y<gy){p.y=gy;p.vx=p.vy=p.vz=0;if(p.kind==='water')p.life=0;else p.life=Math.min(p.life,.4);}}
  }
}
function fxDraw(){
  if(!FX.length)return 0;
  if(!FX_MESH){const mb=new MB();mb.blob([0,0,0],1,1,1,[1,1,1],0,MAT.COL);FX_MESH=mb.build();}
  let n=0;for(const p of FX){const o=n*12;FX_BUF[o]=p.x;FX_BUF[o+1]=p.y;FX_BUF[o+2]=p.z;FX_BUF[o+3]=p.yaw;FX_BUF[o+4]=p.s;FX_BUF[o+5]=p.s*(p.kind==='dust'?.8:1);FX_BUF[o+6]=p.s;FX_BUF[o+7]=0;
    FX_BUF[o+8]=p.r;FX_BUF[o+9]=p.g;FX_BUF[o+10]=p.b;FX_BUF[o+11]=p.kind==='dust'?-Math.max(.02,.6*(p.life/p.max)):p.kind==='water'?-.7:0;n++;}
  setInst(FX_MESH,FX_BUF.subarray(0,n*12));
  gl.uniform1f(P_LIT.u.uInst,1);drawMeshI(FX_MESH);gl.uniform1f(P_LIT.u.uInst,0);
  return n*32;
}
