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
  for(const w of t.wheels){
    if(!w.contact)continue;const R=w.R,surf=w.surf,col=FX_COL[surf]||FX_COL.dirt,spin=Math.abs(w.w*R-w.vl),roll=Math.abs(w.vl);
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
/* the mud clods: solid little lumps in the lit pass (the dust and the spray are fxDrawSoft's) */
function fxDraw(){
  if(!FX.length)return 0;
  if(!FX_MESH){const mb=new MB();mb.blob([0,0,0],1,1,1,[1,1,1],0,MAT.COL);FX_MESH=mb.build();}
  let n=0;for(const p of FX){if(p.kind!=='mud')continue;const o=n*12;FX_BUF[o]=p.x;FX_BUF[o+1]=p.y;FX_BUF[o+2]=p.z;FX_BUF[o+3]=p.yaw;FX_BUF[o+4]=p.s;FX_BUF[o+5]=p.s*(p.kind==='dust'?.8:1);FX_BUF[o+6]=p.s;FX_BUF[o+7]=0;
    FX_BUF[o+8]=p.r;FX_BUF[o+9]=p.g;FX_BUF[o+10]=p.b;FX_BUF[o+11]=0;n++;}
  if(!n)return 0;
  setInst(FX_MESH,FX_BUF.subarray(0,n*12));
  gl.uniform1f(CUR.u.uInst,1);drawMeshI(FX_MESH);gl.uniform1f(CUR.u.uInst,0);
  return n*32;
}


/* the dust and the spray: soft round puffs facing the camera, blended over the scene, lit by the sun (brighter
   with it behind them, as dust in the air is) and the sky, and fogged like everything else */
const VS_PUFF=`layout(location=0) in vec3 aPos;layout(location=5) in vec4 iA;layout(location=6) in vec4 iB;layout(location=7) in vec4 iC;
uniform mat4 uVP;uniform vec3 uCam;uniform vec3 uRt;uniform vec3 uUp;out vec2 vQ;out vec4 vC;out vec3 vP;out float vS;
void main(){float c=cos(iA.w),s=sin(iA.w);vec2 q=vec2(c*aPos.x-s*aPos.y,s*aPos.x+c*aPos.y);vec3 w=iA.xyz+(uRt*q.x+uUp*q.y)*iB.x;
  vQ=aPos.xy;vC=iC;vP=w;vS=iB.y;gl_Position=uVP*vec4(w,1.);}`;
const FS_PUFF=GLSL_COMMON+`in vec2 vQ;in vec4 vC;in vec3 vP;in float vS;layout(location=0) out vec4 o;
void main(){float r=length(vQ);if(r>1.)discard;
  float n=vn(vQ*2.3+vS*17.)*.6+vn(vQ*5.1-vS*9.)*.4,a=vC.a*(1.-smoothstep(.25,1.,r+(n-.5)*.5));if(a<.004)discard;
  vec3 V=normalize(uCam-vP),dir=-V;float dist=length(vP-uCam);
  vec3 c=vC.rgb*(uSkyAmb*.9+uGndAmb*.3+uSunCol*(.45+1.4*pow(max(dot(dir,uSunDir),0.),4.))*(.7+.3*n));
  float fog=1.-exp(-uFogD*dist);c=mix(c,hazeCol(dir),fog);
  o=vec4(c*a,a);}`;
let P_PUFF=null,PUFF_MESH=null;const PUFF_BUF=new Float32Array(FX_MAX*12);
function fxDrawSoft(cam){
  let n=0;for(const p of FX){if(p.kind==='mud')continue;const o=n*12,f=p.life/p.max;
    PUFF_BUF[o]=p.x;PUFF_BUF[o+1]=p.y;PUFF_BUF[o+2]=p.z;PUFF_BUF[o+3]=p.yaw;PUFF_BUF[o+4]=p.s*(p.kind==='dust'?1.7:1.2);PUFF_BUF[o+5]=p.yaw;PUFF_BUF[o+6]=0;PUFF_BUF[o+7]=0;
    PUFF_BUF[o+8]=p.r;PUFF_BUF[o+9]=p.g;PUFF_BUF[o+10]=p.b;PUFF_BUF[o+11]=p.kind==='dust'?.5*Math.min(1,f*1.6)*Math.min(1,(1-f)*8):.45*f;n++;}
  if(!n)return 0;
  if(!P_PUFF){P_PUFF=compile(VS_PUFF,FS_PUFF,LIT_DEFS);PUFF_MESH=makeMesh({pos:new Float32Array([-1,-1,0,1,-1,0,1,1,0,-1,-1,0,1,1,0,-1,1,0]),nrm:new Float32Array(18),col:new Float32Array(24)});}
  const u=P_PUFF.u,S=skyNow(),V=cam.V,k=SKY.fogK;gl.useProgram(P_PUFF.p);
  gl.uniformMatrix4fv(u.uVP,false,cam.VP);gl.uniform3fv(u.uCam,cam.eye);gl.uniform3f(u.uRt,V[0],V[4],V[8]);gl.uniform3f(u.uUp,V[1],V[5],V[9]);
  gl.uniform3fv(u.uSunDir,SKY.sun);gl.uniform3fv(u.uSunCol,S.sunCol);gl.uniform3fv(u.uSkyAmb,S.sky);gl.uniform3fv(u.uGndAmb,S.gnd);gl.uniform3fv(u.uSkyZen,S.zen);gl.uniform3fv(u.uSkyHor,S.hor);
  gl.uniform1f(u.uNight,SKY.night||0);gl.uniform3fv(u.uFogCol,[S.hor[0]*k[0],S.hor[1]*k[1],S.hor[2]*k[2]]);gl.uniform1f(u.uFogD,S.fogD);
  setInst(PUFF_MESH,PUFF_BUF.subarray(0,n*12));
  gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
  drawMeshI(PUFF_MESH);
  gl.depthMask(true);gl.disable(gl.BLEND);gl.useProgram(CUR.p);
  return n*2;
}
