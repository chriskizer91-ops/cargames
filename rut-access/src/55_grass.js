/* =====================================================================================
   GRASS YOU DRIVE THROUGH (Laptop and Ultra). Clumps of blades on a grid that follows the camera, made
   entirely on the GPU: each clump's place comes from its instance number, its height from the land's own
   heightmap and whether it grows at all from the grass map (the same weights and noise the ground's
   colour uses, never on a road, a trail, the strip or the yard), so the blades stand exactly where the
   ground is green. They lean in the wind (harder in the rain), lie down under the car and spring back
   behind it, take the cascaded sun shadows, glow when the sun is behind them and thin out toward the edge
   of the patch, where the ground's own grass colour carries on.
   ===================================================================================== */
const GRASS={tex:null,wt:null,mesh:null,meshU:null,P:null,n:0,on:false};
/* one clump: B blades, each a tapering strip of S segments (x: across, y: up the blade 0..1, z: the blade's number).
   Laptop: six blades of two segments; Ultra: seven of three */
function grassMesh(B,S){
  const P=[];
  for(let b=0;b<B;b++){const w0=.03+.008*(b%3);
    for(let s=0;s<S;s++){const y0=s/S,y1=(s+1)/S,a=w0*(1-y0*.85),c=w0*(1-y1*.85);
      P.push(-a,y0,b,a,y0,b,c,y1,b,-a,y0,b,c,y1,b,-c,y1,b);}}
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(P),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);gl.bindVertexArray(null);
  return {vao,n:P.length/3,tris:P.length/9};
}
const VS_GRASS=`
layout(location=0) in vec3 aPos;
uniform mat4 uVP;uniform vec3 uCam;uniform float uTime;
uniform highp sampler2D uHgt;uniform highp sampler2D uGw;uniform vec4 uGrid;uniform vec4 uLand;uniform int uG;uniform vec4 uCar;uniform vec2 uCarF;uniform vec4 uWind;
out vec3 vP;out vec3 vN;out float vY;out float vW;out vec2 vWp;
float h12(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h12(i),h12(i+vec2(1,0)),f.x),mix(h12(i+vec2(0,1)),h12(i+vec2(1,1)),f.x),f.y);}
/* the land at (x, z): height bilinearly, and the grass weight there (0 where it isn't grass) */
vec2 land(vec2 p){vec2 g=(p-uLand.xy)/uLand.z;ivec2 i=ivec2(floor(g));vec2 f=fract(g);int n=int(uLand.w)-1;
  ivec2 a=clamp(i,ivec2(0),ivec2(n)),b=clamp(i+1,ivec2(0),ivec2(n));
  float h=mix(mix(texelFetch(uHgt,ivec2(a.x,a.y),0).r,texelFetch(uHgt,ivec2(b.x,a.y),0).r,f.x),mix(texelFetch(uHgt,ivec2(a.x,b.y),0).r,texelFetch(uHgt,ivec2(b.x,b.y),0).r,f.x),f.y);
  vec4 w=texelFetch(uGw,ivec2(round(g)),0);return vec2(h,w.a>.5?w.r:0.);}
void main(){
  int id=gl_InstanceID;vec2 ij=vec2(float(id%uG),float(id/uG));
  /* the clump's cell, a random spot in it, and its blade */
  vec2 cell=uGrid.xy+ij*uGrid.z;float r1=h12(cell*1.37),r2=h12(cell*2.11+7.),bl=aPos.z;
  vec2 c=cell+vec2(r1,r2)*uGrid.z;float dc=length(c-uCam.xz);
  vec2 L=land(c);float g=smoothstep(.3,.72,L.y+(vn(c*.7)-.5)*.45);
  /* fewer and shorter toward the patch's edge, none where the ground isn't grassy */
  float edge=1.-smoothstep(uGrid.w*.55,uGrid.w,dc),keep=g*edge;
  if(keep<.08||h12(cell+3.3)>keep*1.25){gl_Position=vec4(2.,2.,2.,1.);return;}
  float ra=h12(cell+bl*1.7)*6.2832,hgt=(.17+.24*h12(cell*.7+bl))*(.5+.5*keep)*(.7+.6*vn(c*.31)),bend=.6+.8*h12(cell+bl*3.1);
  vec2 dir=vec2(cos(ra),sin(ra)),side=vec2(-dir.y,dir.x);
  vec2 base=c+dir*.07*(bl-2.5)*h12(cell*5.+bl);
  /* the wind: gusts rolling over the field */
  float y=aPos.y,ph=uTime*uWind.z+dot(base,uWind.xy)*.35,gust=.55+.45*sin(ph)+.25*sin(ph*2.3+base.x*.7);
  vec2 lean=uWind.xy*gust*uWind.w+dir*.18*bend;
  /* under and round the car: pressed flat and outward */
  vec2 rel=base-uCar.xy;float along=dot(rel,uCarF),across=dot(rel,vec2(-uCarF.y,uCarF.x));
  float inside=(1.-smoothstep(uCar.z*.85,uCar.z*1.15,abs(along)))*(1.-smoothstep(uCar.w*.85,uCar.w*1.3,abs(across)));
  vec2 away=normalize(rel+vec2(1e-3));lean=mix(lean,away*1.6,inside);float h=hgt*(1.-.75*inside);
  vec3 p=vec3(base.x+side.x*aPos.x+lean.x*y*y*h,L.x+y*h*(1.-.3*min(length(lean),1.)*y),base.y+side.y*aPos.x+lean.y*y*y*h);
  vP=p;vY=y;vW=g;vWp=c;vN=normalize(vec3(side.y,.35,-side.x));if(dot(vN.xz,uCam.xz-p.xz)<0.)vN.xz=-vN.xz;
  gl_Position=uVP*vec4(p,1.);}`;
const FS_GRASS=GLSL_COMMON+GLSL_CSM+`
in vec3 vP;in vec3 vN;in float vY;in float vW;in vec2 vWp;layout(location=0) out vec4 o;layout(location=1) out vec4 oN;
vec3 grassCol(vec2 p){float dry=smoothstep(.3,.78,fbm(p*.045+7.));float n2=vn(p*.7),n3=vn(p*3.1),n4=vn(p*11.);
  return mix(vec3(.06,.105,.022),vec3(.2,.17,.06),dry)*(.62+.5*n4*n3+.25*n2);}
void main(){
  vec3 V=normalize(uCam-vP),N=normalize(vN);float dist=length(vP-uCam);
  vec3 alb=grassCol(vWp)*(.5+.6*vY)*(.88+.24*h12(floor(vWp*9.)));
  float sun=csm(vP,vec3(0.,1.,0.),dist),ao=.45+.55*vY,NL=max(dot(N,uSunDir),0.)*.6+.4*max(uSunDir.y,0.);
  vec3 c=alb*(uSkyAmb*(.55+.45*N.y)+uGndAmb*.3)*ao+uSunCol*sun*alb*NL*(.4+.6*ao);
  /* light through the blade when the sun is behind it */
  c+=uSunCol*sun*alb*pow(max(dot(-V,uSunDir),0.),3.)*.6*vY;
  vec3 dir=(vP-uCam)/dist;float fb=.012,fy=dir.y*dist*fb,ff=abs(fy)>1e-3?(1.-exp(-fy))/fy:1.;
  float fog=1.-exp(-uFogD*dist*exp(-max(uCam.y,0.)*fb)*ff);c=mix(c,hazeCol(dir),fog);
  o=vec4(c,1.);oN=vec4(vec3(0.,1.,0.)*.5+.5,.5*(1.-vY));}`;
/* the land as textures: the height, and the grass weight with whether the ground there is grass at all */
function grassInit(){
  const W=RANCH.W,N=W.N;GRASS.P=compile(VS_GRASS,FS_GRASS,LIT_DEFS);GRASS.mesh=grassMesh(6,2);GRASS.meshU=grassMesh(7,3);
  GRASS.tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,GRASS.tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.R32F,N,N,0,gl.RED,gl.FLOAT,W.H);
  for(const [k,v] of [[gl.TEXTURE_MIN_FILTER,gl.NEAREST],[gl.TEXTURE_MAG_FILTER,gl.NEAREST],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,k,v);
  const G=new Uint8Array(N*N*4),grass=W.D&&Ranch.SF?Ranch.SF.grass:0;
  for(let k=0;k<N*N;k++){G[k*4]=W.W[k*4];G[k*4+3]=W.SC[k]===grass?255:0;}
  GRASS.wt=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,GRASS.wt);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,N,N,0,gl.RGBA,gl.UNSIGNED_BYTE,G);
  for(const [k,v] of [[gl.TEXTURE_MIN_FILTER,gl.NEAREST],[gl.TEXTURE_MAG_FILTER,gl.NEAREST],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,k,v);
}
/* the patch: G x G clumps half a metre apart, centred a little ahead of the camera */
function grassDraw(c,t){
  /* (not at night: the blades take no lamp light, and in the dark they'd only cost) */
  const q=GFX.q;if(!q.grass||SKY.night)return 0;
  if(!GRASS.P)grassInit();
  const M=q.grass>1?GRASS.meshU:GRASS.mesh,G=q.grass>1?128:96,step=.46,R=G*step/2,fw=norm2([c.fwd[0],0,c.fwd[2]]),cx=c.eye[0]+fw[0]*R*.55,cz=c.eye[2]+fw[2]*R*.55;
  const x0=Math.floor((cx-R)/step)*step,z0=Math.floor((cz-R)/step)*step,P=GRASS.P,u=P.u,W=RANCH.W;
  gl.useProgram(P.p);
  gl.uniformMatrix4fv(u.uVP,false,c.VP);gl.uniform3fv(u.uCam,c.eye);gl.uniform1f(u.uTime,APP.t);
  gl.uniform4f(u.uGrid,x0,z0,step,R*.95);gl.uniform4f(u.uLand,W.x0,W.z0,W.cell,W.N);gl.uniform1i(u.uG,G);
  const D=t?carD(t):null,F=t?norm2([t.M[0],0,t.M[6]]):[1,0,0];
  gl.uniform4f(u.uCar,t?t.p[0]:1e9,t?t.p[2]:1e9,D?D.L/2+.25:0,t?t.build.look.track/2+.35:0);gl.uniform2f(u.uCarF,F[0],F[2]);
  const ws=.12+.35*WX.w;gl.uniform4f(u.uWind,.8,.6,1.3+WX.w*1.5,ws);
  const S=skyNow();gl.uniform3fv(u.uSunDir,SKY.sun);gl.uniform3fv(u.uSunCol,S.sunCol);gl.uniform3fv(u.uSkyAmb,S.sky);gl.uniform3fv(u.uGndAmb,S.gnd);
  gl.uniform3fv(u.uSkyZen,S.zen);gl.uniform3fv(u.uSkyHor,S.hor);gl.uniform1f(u.uNight,SKY.night||0);const k=SKY.fogK;gl.uniform3fv(u.uFogCol,[S.hor[0]*k[0],S.hor[1]*k[1],S.hor[2]*k[2]]);gl.uniform1f(u.uFogD,S.fogD);
  gl.activeTexture(gl.TEXTURE5);gl.bindTexture(gl.TEXTURE_2D,GRASS.tex);gl.uniform1i(u.uHgt,5);
  gl.activeTexture(gl.TEXTURE6);gl.bindTexture(gl.TEXTURE_2D,GRASS.wt);gl.uniform1i(u.uGw,6);
  gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D_ARRAY,CSM.on?CSM.tex:CSM.dummy);gl.uniform1i(u.uCSM,3);gl.activeTexture(gl.TEXTURE0);
  if(CSM.on){gl.uniformMatrix4fv(u.uCSMM,false,CSM.M);gl.uniform4f(u.uCSMS,CSM.ends[0],CSM.ends[1]||1e9,CSM.ends[2]||1e9,1/CSM.size);gl.uniform4f(u.uCSMB,CSM.off[0],CSM.off[1],CSM.off[2],0);gl.uniform2i(u.uCSMN,CSM.n,4);}
  else gl.uniform2i(u.uCSMN,0,4);
  gl.bindVertexArray(M.vao);gl.drawArraysInstanced(gl.TRIANGLES,0,M.n,G*G);gl.bindVertexArray(null);
  gl.useProgram(CUR.p);
  return M.tris*G*G;
}
