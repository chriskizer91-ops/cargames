/* =====================================================================================
   THE PICTURE: how the scene reaches the screen.
   - Two displays. Dots is the LED matrix every Dirt Sleeper has had: the scene drawn finer than the dots and
     each dot the average of what's behind it. Clear is the scene at the screen's own resolution, sharp,
     smoothed along its edges (FXAA), with the HUD still lit up in dots over it. Clear draws the scene at a
     share of the screen's pixels that follows the frame rate (dynamic resolution): down when the frames
     come slow, back up when there's room.
   - Exposure that adapts like an eye (or a camera): the average brightness of the view, weighted to the
     middle, sets it, so a shaded wood, an open noon and a night lit by headlights all read. It settles in
     about a second.
   - On a laptop (55_gfx's levels), two passes between the scene and the screen:
     ambient occlusion in screen space: half-resolution, 12 samples in the hemisphere round each pixel's
     normal, blurred without crossing edges, and applied only to the share of each pixel's light that is
     ambient (the scene shader writes that share), so the dark goes into creases, under the rocks, the
     sheds' eaves and the tree trunks, and never darkens sunlight;
     light in the air: a quarter-resolution march along each view ray through thin haze, each step lit by
     the sun where the cascaded shadow maps say the sun reaches (shafts through the trees and past the
     sheds) and by the headlights' beams at night, added on top of the scene.
   ===================================================================================== */
const DISP={mode:'dots',scale:touchy?.6:.85,slow:0,good:0,lastChange:0};
{const d=store.get('rut-display','');DISP.mode=d==='dots'||d==='clear'?d:matchMedia('(pointer: coarse)').matches?'dots':'clear';}
function setDisplay(m){DISP.mode=m;store.set('rut-display',m);DISP.scale=touchy?.6:.85;}
/* ---------- the scene's targets: colour (HDR), the normal and ambient share (when a pass reads them), depth ---------- */
const SC={f:null,t:null,nt:null,dt:null,w:0,h:0,mrt:false};
function texT(w,h,fmt,type,filter,data=null){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
  const ifmt=fmt;gl.texImage2D(gl.TEXTURE_2D,0,ifmt,w,h,0,ifmt===gl.DEPTH_COMPONENT24?gl.DEPTH_COMPONENT:ifmt===gl.RGBA8?gl.RGBA:gl.RGBA,type,data);
  for(const [k,v] of [[gl.TEXTURE_MIN_FILTER,filter],[gl.TEXTURE_MAG_FILTER,filter],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,k,v);return t;}
function sceneTargetHD(){
  let w,h;
  if(DISP.mode==='clear'){w=Math.max(160,Math.round(RECT.w*DPR*DISP.scale/2)*2);h=Math.max(90,Math.round(w*9/16));}
  else{w=BW*SS;h=BH*SS;w=Math.min(w,Math.max(BW,Math.round(VW*1.15/2)*2));h=Math.round(w*BH/BW);}
  const mrt=!!(GFX.q.ssao||GFX.q.vol);
  if(SC.f&&SC.w===w&&SC.h===h&&SC.mrt===mrt)return SC;
  if(SC.f){gl.deleteFramebuffer(SC.f);for(const t of [SC.t,SC.nt,SC.dt])if(t)gl.deleteTexture(t);}
  SC.w=w;SC.h=h;SC.mrt=mrt;
  SC.t=texT(w,h,HDR?gl.RGBA16F:gl.RGBA8,HDR?gl.HALF_FLOAT:gl.UNSIGNED_BYTE,gl.LINEAR);
  SC.dt=texT(w,h,gl.DEPTH_COMPONENT24,gl.UNSIGNED_INT,gl.NEAREST);
  SC.nt=mrt?texT(w,h,gl.RGBA8,gl.UNSIGNED_BYTE,gl.NEAREST):null;
  SC.f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,SC.f);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,SC.t,0);
  if(mrt)gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT1,gl.TEXTURE_2D,SC.nt,0);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,SC.dt,0);
  gl.drawBuffers(mrt?[gl.COLOR_ATTACHMENT0,gl.COLOR_ATTACHMENT1]:[gl.COLOR_ATTACHMENT0]);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  /* the passes' own targets follow the scene's size */
  freePost();return SC;
}
/* ---------- the passes ---------- */
const FS_AO=`in vec2 vT;uniform sampler2D uDepth;uniform sampler2D uNrm;uniform mat4 uInvVP;uniform mat4 uVP;uniform vec3 uCam;uniform vec3 uK[12];uniform float uR;out vec4 o;
float ign(vec2 p){return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715))));}
vec3 wpos(vec2 uv,float z){vec4 q=uInvVP*vec4(uv*2.-1.,z*2.-1.,1.);return q.xyz/q.w;}
void main(){
  float z=texture(uDepth,vT).r;vec4 nn=texture(uNrm,vT);if(z>=.99999||nn.a<=0.){o=vec4(1.);return;}
  vec3 P=wpos(vT,z),N=normalize(nn.xyz*2.-1.);float dc=length(P-uCam),R=uR*(1.+dc*.012);
  float a=ign(gl_FragCoord.xy)*6.2832,cs=cos(a),sn=sin(a);
  vec3 T=normalize(cross(N,abs(N.y)<.95?vec3(0.,1.,0.):vec3(1.,0.,0.))),B=cross(N,T);float occ=0.;
  for(int i=0;i<12;i++){vec3 k=uK[i];vec2 r=vec2(cs*k.x-sn*k.y,sn*k.x+cs*k.y);
    vec3 S=P+(T*r.x+B*r.y+N*k.z)*R;vec4 c=uVP*vec4(S,1.);if(c.w<=.01)continue;vec2 su=c.xy/c.w*.5+.5;
    if(su.x<0.||su.y<0.||su.x>1.||su.y>1.)continue;
    vec3 Q=wpos(su,texture(uDepth,su).r);float dS=length(S-uCam),dQ=length(Q-uCam);
    occ+=step(dQ,dS-.04-dS*.003)*(1.-smoothstep(R*.7,R*1.8,length(Q-P)));}
  float ao=1.-occ/12.;o=vec4(ao*ao,0.,0.,1.);}`;
const FS_AOB=`in vec2 vT;uniform sampler2D uTex;uniform sampler2D uDepth;uniform vec2 uDir;uniform vec2 uNF;out vec4 o;
float lin(float z){return 2.*uNF.x*uNF.y/(uNF.y+uNF.x-(z*2.-1.)*(uNF.y-uNF.x));}
void main(){float zc=lin(texture(uDepth,vT).r),s=0.,w=0.;
  for(int i=-3;i<=3;i++){vec2 uv=vT+uDir*float(i);float z=lin(texture(uDepth,uv).r),k=exp(-abs(z-zc)/(zc*.04+.05))*(1.-abs(float(i))*.12);s+=texture(uTex,uv).r*k;w+=k;}
  o=vec4(s/max(w,1e-4),0.,0.,1.);}`;
const FS_VOL=GLSL_COMMON+`
in vec2 vT;uniform sampler2D uDepth;uniform mat4 uInvVP;uniform vec4 uV;
uniform highp sampler2DArrayShadow uCSM;uniform mat4 uCSMM[3];uniform vec4 uCSMS;uniform ivec2 uCSMN;out vec4 o;
float ign(vec2 p){return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715))));}
float vis(vec3 X,float d){int n=uCSMN.x;if(n==0)return 1.;int k=d<uCSMS.x?0:d<uCSMS.y?1:2;if(k>=n)return 1.;
  vec3 q=(uCSMM[k]*vec4(X,1.)).xyz*.5+.5;if(q.x<0.||q.y<0.||q.x>1.||q.y>1.||q.z>1.)return 1.;return texture(uCSM,vec4(q.xy,float(k),q.z-.0008));}
float hg(float c,float g){float g2=g*g;return (1.-g2)/pow(1.+g2-2.*g*c,1.5);}
void main(){
  float z=texture(uDepth,vT).r;vec4 q=uInvVP*vec4(vT*2.-1.,z*2.-1.,1.);vec3 P=q.xyz/q.w,rd=P-uCam;float L=length(rd);rd/=L;L=min(L,uV.y);
  int N=int(uV.z);float j=fract(ign(gl_FragCoord.xy)+uV.w*.618),prev=0.,ph=hg(dot(rd,uSunDir),.5)*.8+.2;vec3 S=vec3(0.);
  for(int i=0;i<24;i++){if(i>=N)break;float t=(float(i)+j)/float(N);t*=t;float x=t*L,dt=x-prev;prev=x;vec3 X=uCam+rd*x;
    float den=uV.x*exp(-max(X.y-uCam.y+4.,0.)*.035);
    vec3 li=uSunCol*vis(X,x)*ph;
    /* the headlights' beams (colour alpha 1) */
    for(int h=0;h<2;h++){if(h>=uNL||uLC[h].a<.5)continue;vec3 v=X-uLP[h].xyz;float d2=dot(v,v),r=uLP[h].w;if(d2>r*r)continue;
      float d=sqrt(d2),k=1.-d/r;li+=uLC[h].rgb*beam(v/d,uLD[h].xyz)*k*k*hg(dot(rd,v/d),.45)*.12;}
    S+=li*den*dt;}
  o=vec4(S,1.);}`;
const FS_COMB=`in vec2 vT;uniform sampler2D uScene;uniform sampler2D uAO;uniform sampler2D uVol;uniform sampler2D uNrm;uniform vec2 uOn;out vec4 o;
void main(){vec3 c=texture(uScene,vT).rgb;
  /* occlusion takes away ambient light (the share the scene shader wrote), and a little more right in the creases */
  if(uOn.x>0.){float a=texture(uAO,vT).r,f=texture(uNrm,vT).a;c*=1.-(1.-a)*min(1.,f*1.1+.08)*uOn.x;}
  if(uOn.y>0.)c+=texture(uVol,vT).rgb*uOn.y;
  o=vec4(c,1.);}`;
const FS_EXPO=`in vec2 vT;uniform sampler2D uScene;uniform sampler2D uPrev;uniform vec4 uE;out vec4 o;
void main(){float s=0.,w=0.;
  for(int j=0;j<9;j++)for(int i=0;i<16;i++){vec2 uv=(vec2(i,j)+.5)/vec2(16.,9.),q=uv-.5;float k=exp(-dot(q,q)*5.);vec3 c=texture(uScene,uv).rgb;
    s+=log(max(dot(c,vec3(.2126,.7152,.0722)),1e-4))*k;w+=k;}
  float avg=exp(s/w),tgt=clamp(uE.x/avg,uE.y,uE.z),prev=texture(uPrev,vec2(.5)).r;
  o=vec4(prev<=0.?tgt:mix(prev,tgt,uE.w),avg,0.,1.);}`;
/* the clear display: the scene (smoothed along its edges, FXAA) at the screen's resolution, exposed, with the
   HUD over it in dots on a dark panel */
const FS_CLEAR=`in vec2 vT;uniform sampler2D uScene;uniform sampler2D uHud;uniform sampler2D uExpo;uniform vec2 uRes;uniform vec2 uPx;uniform vec3 uFlash;uniform vec3 uEdge;uniform float uGain;out vec4 o;
float lt(vec3 c){c=c/(1.+c);return dot(c,vec3(.299,.587,.114));}
vec3 fxaa(vec2 uv){
  vec3 cM=texture(uScene,uv).rgb;float lM=lt(cM),lN=lt(texture(uScene,uv+vec2(0.,uPx.y)).rgb),lS=lt(texture(uScene,uv-vec2(0.,uPx.y)).rgb),
    lE=lt(texture(uScene,uv+vec2(uPx.x,0.)).rgb),lW=lt(texture(uScene,uv-vec2(uPx.x,0.)).rgb);
  float mn=min(lM,min(min(lN,lS),min(lE,lW))),mx=max(lM,max(max(lN,lS),max(lE,lW)));if(mx-mn<max(.04,mx*.12))return cM;
  float lNW=lt(texture(uScene,uv+vec2(-1.,1.)*uPx).rgb),lNE=lt(texture(uScene,uv+uPx).rgb),lSW=lt(texture(uScene,uv-uPx).rgb),lSE=lt(texture(uScene,uv+vec2(1.,-1.)*uPx).rgb);
  vec2 dir=vec2(-((lNW+lNE)-(lSW+lSE)),(lNW+lSW)-(lNE+lSE));float dr=max((lNW+lNE+lSW+lSE)*.03125,1./128.);
  dir=clamp(dir/(min(abs(dir.x),abs(dir.y))+dr),-8.,8.)*uPx;
  vec3 a=.5*(texture(uScene,uv+dir*(1./3.-.5)).rgb+texture(uScene,uv+dir*(2./3.-.5)).rgb),b=a*.5+.25*(texture(uScene,uv-dir*.5).rgb+texture(uScene,uv+dir*.5).rgb);
  float lb=lt(b);return lb<mn||lb>mx?a:b;}
void main(){
  vec3 c=fxaa(vT)*texture(uExpo,vec2(.5)).r*uGain+uFlash;
  /* (under the HUD the scene is kept out of the bloom, so a bright sky can't glow through it) */
  vec2 cell=vT*uRes,id=floor(cell);float ha=texture(uHud,vec2((id.x+.5)/uRes.x,1.-(id.y+.5)/uRes.y)).a;c/=1.+ha*ha*ha*max(max(c.r,c.g),c.b)*4.;
  vec2 qe=vT-.5;c+=uEdge*smoothstep(.15,.33,dot(qe,qe))*.6;
  o=vec4(c,1.);}`;
/* the clear display's last pass: bloom, the tone map and the grade (as FS_COMP), then the HUD in dots on top,
   untouched by either, on a dark panel */
const FS_COMPH=`in vec2 vT;uniform sampler2D uScene;uniform sampler2D uB1;uniform sampler2D uB2;uniform sampler2D uHud;uniform float uBloom;uniform vec3 uGrade;
uniform vec4 uRect;uniform vec2 uRes;out vec4 o;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.0,1.0);}
void main(){vec3 c=texture(uScene,vT).rgb+(texture(uB1,vT).rgb*.8+texture(uB2,vT).rgb*1.2)*uBloom;c=aces(c*1.1);c=pow(c,vec3(1.0/2.2));
  float l=dot(c,vec3(.299,.587,.114));c=mix(vec3(l),c,uGrade.x);c=clamp((c-.5)*uGrade.y+.5,0.,1.);
  vec2 q=vT-.5;float e=dot(q,q);c*=1.0-e*.5;
  /* the HUD: where this pixel falls in the 16:9 picture, which dot, how far from its centre */
  vec2 p=(gl_FragCoord.xy-uRect.xy)/uRect.zw;
  if(p.x>=0.&&p.y>=0.&&p.x<=1.&&p.y<=1.){vec2 cell=p*uRes,id=floor(cell),f=fract(cell)-.5;vec4 hu=texture(uHud,vec2((id.x+.5)/uRes.x,1.-(id.y+.5)/uRes.y));
    if(hu.a>0.){float fw=max(fwidth(cell.x),fwidth(cell.y)),d=length(f),dm=1.-smoothstep(.42-fw*.6,.42+fw*.6,d),far=smoothstep(.38,.95,fw),
      m=mix(dm*(.82+.4*(1.-smoothstep(0.,.42,d))),.62,far);
      c=mix(c,c*.18+min(hu.rgb*1.15,vec3(1.))*m,hu.a);}}
  o=vec4(c,1.);}`;
const POSTP={};
function postProg(k,fs){return POSTP[k]||(POSTP[k]=compile(VS_FS,fs));}
/* the passes' targets */
const PT={ao:null,ao2:null,vol:null,comb:null,ex:[null,null],exi:0,flip:0};
function freePost(){for(const k of ['ao','ao2','vol','comb'])if(PT[k]){freeTarget(PT[k]);PT[k]=null;}}
function postTargets(){
  const q=GFX.q,w=SC.w,h=SC.h;
  if(q.ssao&&!PT.ao){PT.ao=mkTarget(Math.max(1,w>>1),Math.max(1,h>>1),false);PT.ao2=mkTarget(Math.max(1,w>>1),Math.max(1,h>>1),false);}
  if(q.vol&&!PT.vol)PT.vol=mkTarget(Math.max(1,w>>2),Math.max(1,h>>2),HDR);
  if((q.ssao||q.vol)&&!PT.comb)PT.comb=mkTarget(w,h,HDR);
  if(!PT.ex[0]){for(let i=0;i<2;i++)PT.ex[i]=mkTarget(1,1,HDR);
    /* without float targets the exposure can't go past 1: it stays at 1 */
    PT.one=texT(1,1,gl.RGBA8,gl.UNSIGNED_BYTE,gl.NEAREST,new Uint8Array([255,255,255,255]));}
}
/* the occlusion kernel: points in the hemisphere, more of them close in */
const AO_K=(()=>{const k=new Float32Array(36),R=Ranch.rng(77);for(let i=0;i<12;i++){let x,y,z;do{x=R()*2-1;y=R()*2-1;z=R();}while(x*x+y*y+z*z>1||z<.15);
  const s=.25+.75*((i+1)/12)**2,l=Math.hypot(x,y,z);k[i*3]=x/l*s;k[i*3+1]=y/l*s;k[i*3+2]=z/l*s;}return k;})();
function bindT(unit,t,u,name){gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);gl.uniform1i(u[name],unit);}
function fullPass(P,dst,setup){gl.bindFramebuffer(gl.FRAMEBUFFER,dst.f);gl.viewport(0,0,dst.w,dst.h);gl.useProgram(P.p);setup(P.u);gl.bindVertexArray(VAO0);gl.drawArrays(gl.TRIANGLES,0,3);}
/* between the scene and the display: occlusion and light in the air (laptop), then the exposure */
function postPasses(c,dt){
  const q=GFX.q;postTargets();gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);
  const inv=M4.inv(c.VP);let src=SC.t;
  if(q.ssao){
    fullPass(postProg('ao',FS_AO),PT.ao,u=>{bindT(0,SC.dt,u,'uDepth');bindT(1,SC.nt,u,'uNrm');gl.uniformMatrix4fv(u.uInvVP,false,inv);gl.uniformMatrix4fv(u.uVP,false,c.VP);
      gl.uniform3fv(u.uCam,c.eye);gl.uniform3fv(u.uK,AO_K);gl.uniform1f(u.uR,.9);});
    const B=postProg('aob',FS_AOB),nf=[c.near||.3,1500];
    fullPass(B,PT.ao2,u=>{bindT(0,PT.ao.t,u,'uTex');bindT(1,SC.dt,u,'uDepth');gl.uniform2f(u.uDir,1/PT.ao.w,0);gl.uniform2fv(u.uNF,nf);});
    fullPass(B,PT.ao,u=>{bindT(0,PT.ao2.t,u,'uTex');bindT(1,SC.dt,u,'uDepth');gl.uniform2f(u.uDir,0,1/PT.ao.h);gl.uniform2fv(u.uNF,nf);});
  }
  if(q.vol){
    const S=skyNow();
    fullPass(postProg('vol',FS_VOL),PT.vol,u=>{bindT(0,SC.dt,u,'uDepth');gl.uniformMatrix4fv(u.uInvVP,false,inv);gl.uniform3fv(u.uCam,c.eye);
      gl.uniform3fv(u.uSunDir,SKY.sun);gl.uniform3fv(u.uSunCol,S.sunCol);
      /* thin haze by day, more in the rain and at golden hour; the march reaches 140 m (180 on Ultra) */
      const den=(SKY.night?.0012:.0005)*(1+WX.w*1.5)*(SKY.haze||1);
      gl.uniform4f(u.uV,den,q.vol>1?180:140,q.vol>1?20:14,GFX.frame%64);
      gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D_ARRAY,CSM.on?CSM.tex:CSM.dummy);gl.uniform1i(u.uCSM,3);gl.activeTexture(gl.TEXTURE0);
      if(CSM.on){gl.uniformMatrix4fv(u.uCSMM,false,CSM.M);gl.uniform4f(u.uCSMS,CSM.ends[0],CSM.ends[1]||1e9,CSM.ends[2]||1e9,1/CSM.size);gl.uniform2i(u.uCSMN,CSM.n,4);}
      else gl.uniform2i(u.uCSMN,0,4);
      gl.uniform4fv(u.uLP,LP);gl.uniform4fv(u.uLC,LC);gl.uniform4fv(u.uLD,LD);gl.uniform1i(u.uNL,LN.n);});
  }
  if(q.ssao||q.vol){
    fullPass(postProg('comb',FS_COMB),PT.comb,u=>{bindT(0,SC.t,u,'uScene');bindT(1,q.ssao?PT.ao.t:SC.t,u,'uAO');bindT(2,q.vol?PT.vol.t:SC.t,u,'uVol');bindT(3,SC.nt,u,'uNrm');
      gl.uniform2f(u.uOn,q.ssao?.85:0,q.vol?1:0);});
    src=PT.comb.t;
  }
  /* the exposure: settles over about a second (faster getting darker, as eyes do) */
  const E=SKY.expo||[.32,.7,1.6],prev=PT.ex[PT.exi],next=PT.ex[1-PT.exi];
  if(HDR)fullPass(postProg('expo',FS_EXPO),next,u=>{bindT(0,src,u,'uScene');bindT(1,prev.t,u,'uPrev');gl.uniform4f(u.uE,E[0],E[1],E[2],1-Math.exp(-(dt||1/60)*2.2));});
  if(HDR)PT.exi=1-PT.exi;gl.activeTexture(gl.TEXTURE0);
  return src;
}
/* ---------- the display ---------- */
function presentHD(src){
  gl.bindTexture(gl.TEXTURE_2D,HTEX);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,BW,BH,0,gl.RGBA,gl.UNSIGNED_BYTE,HB8);
  gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);
  gl.bindFramebuffer(gl.FRAMEBUFFER,FB.scene.f);gl.viewport(0,0,VW,VH);gl.clearColor(.02,.015,.03,1);gl.clear(gl.COLOR_BUFFER_BIT);
  const rx=Math.round(RECT.x*DPR),rw=Math.round(RECT.w*DPR),rh=Math.round(RECT.h*DPR),ry=VH-Math.round(RECT.y*DPR)-rh,ex=HDR?PT.ex[PT.exi].t:PT.one;
  gl.viewport(rx,ry,rw,rh);
  if(DISP.mode==='clear'){const P=postProg('clear',FS_CLEAR),u=P.u;gl.useProgram(P.p);
    bindT(0,src,u,'uScene');bindT(1,HTEX,u,'uHud');bindT(2,ex,u,'uExpo');
    gl.uniform2f(u.uRes,BW,BH);gl.uniform2f(u.uPx,1/SC.w,1/SC.h);gl.uniform3fv(u.uFlash,POST.flash);gl.uniform3fv(u.uEdge,POST.edge);gl.uniform1f(u.uGain,HDR?1:.75);}
  else{const u=P_LED.u;gl.useProgram(P_LED.p);
    bindT(0,src,u,'uScene');bindT(1,HTEX,u,'uHud');bindT(2,ex,u,'uExpo');
    gl.uniform2f(u.uRes,BW,BH);gl.uniform1f(u.uGain,HDR?1.85:1.35);gl.uniform1i(u.uStyle,STYLE_ID);
    gl.uniform1f(u.uScn,POST.scn);gl.uniform3fv(u.uEdge,POST.edge);gl.uniform3fv(u.uFlash,POST.flash);gl.uniform1f(u.uQuant,POST.quant);}
  gl.bindVertexArray(VAO0);gl.drawArrays(gl.TRIANGLES,0,3);gl.activeTexture(gl.TEXTURE0);
  pass(P_BR,FB.scene,FB.a,u=>{gl.uniform2f(u.uPx,1/VW,1/VH);gl.uniform1f(u.uThr,HDR?1.0:.8);});
  pass(P_BL,FB.a,FB.b,u=>gl.uniform2f(u.uDir,1/FB.a.w,0));pass(P_BL,FB.b,FB.a,u=>gl.uniform2f(u.uDir,0,1/FB.a.h));
  pass(P_BR,FB.a,FB.c,u=>{gl.uniform2f(u.uPx,1/FB.a.w,1/FB.a.h);gl.uniform1f(u.uThr,0);});
  pass(P_BL,FB.c,FB.d,u=>gl.uniform2f(u.uDir,2.2/FB.c.w,0));pass(P_BL,FB.d,FB.c,u=>gl.uniform2f(u.uDir,0,2.2/FB.c.h));
  const CO=DISP.mode==='clear'?postProg('comph',FS_COMPH):P_CO,cu=CO.u;
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,VW,VH);gl.useProgram(CO.p);
  bindT(0,FB.scene.t,cu,'uScene');bindT(1,FB.a.t,cu,'uB1');bindT(2,FB.c.t,cu,'uB2');
  if(CO!==P_CO){bindT(3,HTEX,cu,'uHud');gl.uniform4f(cu.uRect,rx,ry,rw,rh);gl.uniform2f(cu.uRes,BW,BH);}
  gl.uniform1f(cu.uBloom,HDR?1:.55);gl.uniform3f(cu.uGrade,POST.sat,POST.con,0);gl.bindVertexArray(VAO0);gl.drawArrays(gl.TRIANGLES,0,3);gl.activeTexture(gl.TEXTURE0);
}
/* ---------- dynamic resolution (the clear display): a share of the screen's pixels that follows the frame rate ---------- */
function drsStep(dt){
  if(DISP.mode!=='clear'||GAME.state!=='drive')return;
  const now=APP.t,lo=touchy?.45:.5,hi=GFX.level==='ultra'?1:touchy?.8:.95;
  if(dt>1/48)DISP.slow+=dt;else DISP.slow=Math.max(0,DISP.slow-dt*.5);
  if(dt<1/57)DISP.good+=dt;else DISP.good=0;
  if(DISP.slow>.6&&now-DISP.lastChange>.5&&DISP.scale>lo){DISP.scale=Math.max(lo,DISP.scale-.05);DISP.slow=0;DISP.lastChange=now;}
  else if(DISP.good>3&&now-DISP.lastChange>2&&DISP.scale<hi){DISP.scale=Math.min(hi,DISP.scale+.05);DISP.good=0;DISP.lastChange=now;}
}
