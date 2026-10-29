/* =====================================================================================
   GRAPHICS (from Dirt Sleeper Sim), a step up from Mini. Three levels:
   - Mini: Dirt Sleeper Mini's look (the soft shadow under the car, nothing else).
   - Plus: the sun casts real shadows round the car: the car on itself and on the ground, and the trees, sheds,
     fences, rocks and stands near it. Clouds drift over the sky and the haze brightens toward the sun. One
     extra pass a frame, of what's within about 30 m, into a 1024-square depth map.
   - High: the same map at 2048, reaching about 55 m, and the land drawn further out.
   The map follows the car, snapped to its own texels so its edges don't crawl as the car moves. And the
   weather the Sim level sets is drawn: an overcast sky, dark wet ground with a sheen on the tarmac, rain.
   ===================================================================================== */
const GFX_LEVELS=[['mini','Mini','Dirt Sleeper Mini\'s look: the soft shadow under the car and nothing else. The lightest for a phone.'],
  ['plus','Plus','Real sun shadows round the car (the car on itself and on the ground, trees, sheds, fences and rocks), clouds, and the haze lit toward the sun. One extra pass a frame of what\'s near the car.'],
  ['high','High','Plus with sharper shadows reaching about twice as far, and the land drawn further out. For laptops and fast phones.']];
const GFX={level:'plus',size:0,R:0,far:420,clouds:0,lod:[150,290]};
{const g=store.get('dshd-gfx','');if(GFX_LEVELS.some(l=>l[0]===g))GFX.level=g;}
function gfxApply(){
  const L=GFX.level;
  GFX.size=L==='mini'?0:L==='plus'?1024:2048;GFX.R=L==='high'?55:30;GFX.far=L==='high'?560:420;GFX.clouds=L==='mini'?0:1;
  GFX.lod=L==='high'?[190,360]:[150,290];LOD_DIST[0]=GFX.lod[0];LOD_DIST[1]=GFX.lod[1];
}
gfxApply();
function setGfx(id){GFX.level=id;store.set('dshd-gfx',id);gfxApply();const b=$('gfx');if(b)b.textContent='Gfx '+GFX_LEVELS.find(l=>l[0]===id)[1];}

/* ---------- the shadow map ---------- */
const SH={tex:null,fb:null,size:0,dummy:null,P:null,M:null,on:false};
function depthTex(n){
  const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texStorage2D(gl.TEXTURE_2D,1,gl.DEPTH_COMPONENT24,n,n);
  for(const [k,v] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE],
    [gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE],[gl.TEXTURE_COMPARE_FUNC,gl.LEQUAL]])gl.texParameteri(gl.TEXTURE_2D,k,v);
  return t;
}
const FS_SH=`out vec4 o;void main(){o=vec4(1.);}`;
function shadowTarget(){
  const n=GFX.size;if(!SH.P)SH.P=compile(VS_LIT,FS_SH,LIT_DEFS);
  if(!SH.dummy)SH.dummy=depthTex(1);
  if(SH.size===n)return;
  if(SH.tex){gl.deleteTexture(SH.tex);gl.deleteFramebuffer(SH.fb);SH.tex=null;SH.fb=null;}
  SH.size=n;if(!n)return;
  SH.tex=depthTex(n);SH.fb=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,SH.fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,SH.tex,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
}
/* the sun's view of a square round the centre, snapped to whole texels */
function shadowMatrix(ctr){
  const R=GFX.R,n=GFX.size,L=SKY.sun,eye=[ctr[0]+L[0]*150,ctr[1]+L[1]*150,ctr[2]+L[2]*150],V=M4.look(eye,ctr,Math.abs(L[1])>.98?[1,0,0]:[0,1,0]);
  const cx=V[0]*ctr[0]+V[4]*ctr[1]+V[8]*ctr[2]+V[12],cy=V[1]*ctr[0]+V[5]*ctr[1]+V[9]*ctr[2]+V[13],ts=2*R/n,x0=Math.round(cx/ts)*ts,y0=Math.round(cy/ts)*ts;
  const P=new Float32Array(16),l=x0-R,r=x0+R,b=y0-R,t=y0+R,nn=20,ff=300;
  P[0]=2/(r-l);P[5]=2/(t-b);P[10]=-2/(ff-nn);P[12]=-(r+l)/(r-l);P[13]=-(t+b)/(t-b);P[14]=-(ff+nn)/(ff-nn);P[15]=1;
  return M4.mul(P,V);
}
/* draw what is near the car into the map: the sheds, fences, rocks and stands, the trees, and the car */
function shadowPass(cam,t){
  shadowTarget();SH.on=!!GFX.size;if(!SH.on)return;
  /* centred a little ahead of the car, where the camera is looking */
  const f=norm2([cam.fwd[0],0,cam.fwd[2]]),k=GFX.R*.35,ctr=[t.p[0]+f[0]*k,t.p[1]-1,t.p[2]+f[2]*k];
  SH.M=shadowMatrix(ctr);
  const P=SH.P,u=P.u;gl.bindFramebuffer(gl.FRAMEBUFFER,SH.fb);gl.viewport(0,0,SH.size,SH.size);gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1.6,4);gl.useProgram(P.p);
  gl.uniformMatrix4fv(u.uVP,false,SH.M);gl.uniform1f(u.uInst,0);gl.uniformMatrix4fv(u.uM,false,M4.id());
  const R=GFX.R+14,near=(mn,mx)=>mn[0]<ctr[0]+R&&mx[0]>ctr[0]-R&&mn[2]<ctr[2]+R&&mx[2]>ctr[2]-R;let tris=0;
  for(const p of RANCH.props)if(near(p.mn,p.mx)){drawMesh(p.mesh);tris+=p.mesh.tris;}
  /* the trees round it, full shape, one instanced draw per kind */
  const TR=RANCH.trees,T=TR.T,rr=(GFX.R+8)*(GFX.R+8);for(const c of TR.cnt){c[0]=0;c[1]=0;}
  for(const tl of TR.tiles){if(!near(tl.mn,tl.mx))continue;
    for(const i of tl.list){const o=i*12,dx=T[o]-ctr[0],dz=T[o+2]-ctr[2];if(dx*dx+dz*dz>rr)continue;const v=T[o+7]|0,b=TR.buf[v][0],q=TR.cnt[v][0]++*12;for(let j=0;j<12;j++)b[q+j]=T[o+j];}}
  gl.uniform1f(u.uInst,1);
  for(let v=0;v<5;v++){const n=TR.cnt[v][0];if(!n)continue;const m=TR.shapes[v][0];setInst(m,TR.buf[v][0].subarray(0,n*12));drawMeshI(m);tris+=m.tris*n;}
  gl.uniform1f(u.uInst,0);
  tris+=carShadow(t,u);
  gl.disable(gl.POLYGON_OFFSET_FILL);
  SH.tris=tris;
}
/* the car into the map: the same pieces and matrices drawWorldCar uses */
function carShadow(t,u){
  const i=t.bi,b=t.build,T=truck(i),D=T.D,M0=carMatrix(t);let Mb=M0;
  const fx=D.X(D.uFa),R=b.look.tyre.R;if(D.pitch)Mb=M4.mul(Mb,M4.mul(M4T(fx,R,0),M4.mul(M4RZ(D.pitch),M4T(-fx,-R,0))));
  gl.uniformMatrix4fv(u.uM,false,Mb);drawMesh(T.body);drawMesh(T.hood);drawMesh(T.hide);if(T.engineOut)drawMesh(T.bay.engine);
  for(const sp of D.spares||[]){const W=sp.rear?T.wheelR:T.wheel;
    gl.uniformMatrix4fv(u.uM,false,M4.mul(Mb,M4.mul(M4T(sp.p[0],sp.p[1],sp.p[2]),sp.face==='back'?M4RY(-PI/2):M4S(1,1,sp.p[2]<0?-1:1))));drawMesh(W);}
  for(const w of t.wheels){const s=w.hp[2]<0?-1:1,st=w.front?t.steer:0;
    gl.uniformMatrix4fv(u.uM,false,M4.mul(M0,M4.mul(M4T(w.hp[0]+t.cg[0],w.hp[1]-w.len+t.cg[1],w.hp[2]),M4.mul(M4RY(-st),M4.mul(M4S(1,1,s),M4RZ(-w.ang))))));drawMesh(w.front?T.wheel:T.wheelR);}
  return T.tris;
}
/* the scene shader's side of it, and the weather's */
function gfxUniforms(){
  const u=P_LIT.u;gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,SH.on?SH.tex:SH.dummy||null);gl.uniform1i(u.uShTex,3);gl.activeTexture(gl.TEXTURE0);
  if(SH.on){gl.uniformMatrix4fv(u.uShM,false,SH.M);const tx=1/SH.size,ws=2*GFX.R*tx;gl.uniform4f(u.uShP,1,tx,ws,.0002);}
  else gl.uniform4f(u.uShP,0,0,0,0);
  /* (clouds at night are lit only by the moon) */
  const w=WX.w,nt=1-.96*(SKY.night||0);gl.uniform4f(u.uCloud,GFX.clouds?lerp(.5,.97,w):0,lerp(1,.5,w)*nt,GFX.clouds?(1-w)*nt:0,w);gl.uniform1f(u.uWet,WX.wet);
}

/* ---------- the weather on the screen (the Sim level's; dry on the others) ---------- */
const WX={w:0,wet:0,rainT:0};
/* how wet it is: the setting's amount on the Sim level, nothing elsewhere */
const wxTarget=()=>APP.level==='sim'?simVal(SIM_WX,SIMSET.wx):0;
function syncWeather(){WX.w=wxTarget();WX.wet=Math.min(1,WX.w*1.25);}
/* the sky for this weather: clear to overcast */
function skyNow(){
  /* (at night the overcast is as dark as the night sky it covers) */
  const w=WX.w,S=SKY,o=SKY_NOW,g=1-.95*(S.night||0);
  for(let k=0;k<3;k++){o.sunCol[k]=S.sunCol[k]*(1-.72*w);o.sky[k]=lerp(S.sky[k],[.5,.53,.58][k]*g,w);o.zen[k]=lerp(S.zen[k],[.36,.39,.44][k]*g,w);o.hor[k]=lerp(S.hor[k],[.62,.64,.67][k]*g,w);o.gnd[k]=S.gnd[k]*(1-.3*w);}
  o.fogD=S.fogD*(1+4*w);return o;
}
const SKY_NOW={sunCol:[0,0,0],sky:[0,0,0],zen:[0,0,0],hor:[0,0,0],gnd:[0,0,0],fogD:0};
/* rain: thin streaks falling round the camera, see-through (the dot pass averages the dropped pixels) */
const RAIN={n:0,x:null,y:null,z:null,buf:null,mesh:null};
function rainDraw(cam,dt){
  const w=WX.w;if(w<.5)return 0;
  const N=Math.round((GFX.level==='high'?900:GFX.level==='plus'?600:400)*(w-.3)/.7);
  if(!RAIN.mesh){const mb=new MB();mb.box(-.5,-.5,-.5,.5,.5,.5,[1,1,1],0,MAT.COL);RAIN.mesh=mb.build();RAIN.x=new Float32Array(1000);RAIN.y=new Float32Array(1000);RAIN.z=new Float32Array(1000);RAIN.buf=new Float32Array(1000*12);
    for(let i=0;i<1000;i++){RAIN.x[i]=Math.random()*36-18;RAIN.y[i]=Math.random()*18-4;RAIN.z[i]=Math.random()*36-18;}}
  const e=cam.eye,B=RAIN.buf,fall=9.5*dt;
  for(let i=0;i<N;i++){let y=RAIN.y[i]-fall;if(y<-4){y+=18;RAIN.x[i]=Math.random()*36-18;RAIN.z[i]=Math.random()*36-18;}RAIN.y[i]=y;
    /* the streaks stay put in the world as the camera moves (wrapped into a 36 m box round it) */
    const o=i*12,wx=e[0]+((RAIN.x[i]-e[0])%36+54)%36-18,wz=e[2]+((RAIN.z[i]-e[2])%36+54)%36-18;
    B[o]=wx;B[o+1]=e[1]+y;B[o+2]=wz;B[o+3]=0;B[o+4]=.016;B[o+5]=.75;B[o+6]=.016;B[o+7]=0;B[o+8]=.7;B[o+9]=.75;B[o+10]=.82;B[o+11]=-.42;}
  setInst(RAIN.mesh,B.subarray(0,N*12));gl.uniform1f(P_LIT.u.uInst,1);drawMeshI(RAIN.mesh);gl.uniform1f(P_LIT.u.uInst,0);
  return N*12;
}
/* ---------- a slow frame rate on Plus or High: say so once ---------- */
const GFXW={t:0,said:false};
function gfxWatch(dt){
  if(GAME.state!=='drive'||GFX.level==='mini'||GFXW.said)return;
  if(APP.fps<34)GFXW.t+=dt;else GFXW.t=Math.max(0,GFXW.t-dt*2);
  if(GFXW.t>6){GFXW.said=true;say(GFX.level==='high'?'Slow: try Graphics Plus in the menu':'Slow: try Graphics Mini in the menu',4);}
}
