/* =====================================================================================
   THE DIRT SLEEPER CARS IN SHIFTLIGHT 3'S LIGHT.
   The car meshes come from Dirt Sleeper HD's modelling code (hd/): flat triangles with a colour, a glow
   (colour alpha) and a material id per vertex, in the car's own frame (+X forward, +Y up, origin on the
   ground under the middle). This shader keeps every material Dirt Sleeper gives a car (paint and its
   race liveries, glass, chrome, tyres with their tread, lamps that light with the headlights and brakes,
   honeycomb, carbon, calipers and rotors, the textured cladding, mud) and lights it the Shiftlight 3 way:
   the moon's cascaded shadows, every street light in the cluster grid, the headlights, the reflection
   probe and a clear coat. It writes the same three targets as Shiftlight's own car shader (colour,
   normal + roughness, motion), so SSR, fog, TAA and motion blur treat it like any other car.
   ===================================================================================== */
import {FRAME,NOISE,PACK,LIGHTING,SHADE} from './common.js';

export const HDCAR_VS=`
layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNrm;layout(location=2) in vec4 aCol;layout(location=3) in float aMat;
uniform mat4 uVP;uniform mat4 uVPnj;uniform mat4 uPrevVP;uniform mat4 uM;uniform mat4 uMPrev;
out vec3 vP;out vec3 vL;out vec3 vN;out vec4 vC;flat out float vMat;out vec4 vCur;out vec4 vPrev;
void main(){vec4 w=uM*vec4(aPos,1.0),pw=uMPrev*vec4(aPos,1.0);
  vP=w.xyz;vL=aPos;vN=mat3(uM)*aNrm;vC=aCol;vMat=aMat;
  gl_Position=uVP*w;vCur=uVPnj*w;vPrev=uPrevVP*pw;}`;

export const HDCAR_DEPTH_VS=`
layout(location=0) in vec3 aPos;uniform mat4 uVP;uniform mat4 uM;
void main(){gl_Position=uVP*(uM*vec4(aPos,1.0));}`;
export const HDCAR_DEPTH_FS=`out vec4 o;void main(){o=vec4(0);}`;

export const HDCAR_FS=FRAME+NOISE+PACK+LIGHTING+SHADE+`
in vec3 vP;in vec3 vL;in vec3 vN;in vec4 vC;flat in float vMat;in vec4 vCur;in vec4 vPrev;
layout(location=0) out vec4 oCol;layout(location=1) out vec4 oNrm;layout(location=2) out vec2 oVel;
uniform samplerCube uProbe;uniform float uProbeLod;
uniform vec3 uPaint;uniform vec3 uPaint2;uniform vec3 uRim;uniform vec3 uCal;uniform vec3 uClad;
uniform float uLiv;uniform vec4 uLivP;uniform float uLamp;uniform float uBrake;uniform float uRev;uniform vec2 uInd;
uniform float uDirt;uniform float uMudOff;uniform float uEmK;uniform vec3 uGlow;uniform float uMetal;
float h13b(vec3 p){p=fract(p*.1031);p+=dot(p,p.zyx+31.32);return fract((p.x+p.y)*p.z);}
float vn3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(mix(h13b(i),h13b(i+vec3(1,0,0)),f.x),mix(h13b(i+vec3(0,1,0)),h13b(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h13b(i+vec3(0,0,1)),h13b(i+vec3(1,0,1)),f.x),mix(h13b(i+vec3(0,1,1)),h13b(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm3(vec3 p){return vn3(p)*.55+vn3(p*2.03+7.1)*.3+vn3(p*4.1+3.3)*.15;}
vec3 envBRDF(vec3 F0,float NoV,float r){const vec4 c0=vec4(-1,-.0275,-.572,.022),c1=vec4(1,.0425,1.04,-.04);vec4 rr=r*c0+c1;
  float a=min(rr.x*rr.x,exp2(-9.28*NoV))*rr.x+rr.y;vec2 AB=vec2(-1.04,1.04)*a+rr.zw;return F0*AB.x+AB.y;}
vec3 env(vec3 R,float r){return textureLod(uProbe,R,r*uProbeLod).rgb;}
/* mud: caked and wet low down, dry and splattered higher up (Dirt Sleeper's) */
float mud(vec3 L,float h){
  if(uDirt<=0.)return 0.;
  float n=fbm3(L*vec3(2.2,5.,2.2));float line=.2+.68*uDirt+(n-.5)*.28;
  float cake=1.-smoothstep(line-.05,line+.05,h);
  float spl=smoothstep(.6-.1*uDirt,.66-.1*uDirt,fbm3(L*7.+3.))*(1.-smoothstep(line,line+.45+.35*uDirt,h))*uDirt;
  return clamp(max(cake,spl*.85),0.,1.);}
vec3 mudCol(vec3 L,float h){float w=1.-smoothstep(.0,.6,h),g=vn3(L*14.);return mix(vec3(.30,.22,.14),vec3(.13,.09,.055),w)*(.88+.24*g);}
void main(){
  vec3 N=normalize(vN);vec3 V=normalize(uCam-vP);if(dot(N,V)<0.)N=-N;
  int m=int(vMat+.5);float em=vC.a;
  /* the material: albedo, metalness, roughness, clear coat, glow; flake turns the normal */
  vec3 alb=vC.rgb;float metal=0.,rough=.62,clear=0.,clearR=.05,flake=0.,F0d=.04;vec3 emc=vec3(0);bool dirty=false;
  float K=uEmK;
  if(m==1||m==4){
    vec3 pc=m==4?uPaint2:uPaint;
    /* race livery: a swept band low on the sides, twin stripes down the middle (Dirt Sleeper's five) */
    if(uLiv>.5&&m==1){
      float xn=(vL.x-uLivP.y)/(uLivP.x-uLivP.y);float band=uLivP.z-.30+.34*smoothstep(.15,.85,1.-xn);bool l2=uLiv>1.5;
      if(uLiv>2.5){float az=abs(vL.z);bool top=N.y>.45||abs(N.x)>.6&&vL.y>uLivP.z-.3;
        if(uLiv<3.5){if(top&&(az>.03&&az<.25||az>.27&&az<.285))pc=uPaint2;}
        else if(uLiv<4.5){if(abs(N.z)>.35){float q=vL.y-(uLivP.z-.43)-(1.-xn)*.5+.18*fract(xn*2.2);if(q>0.&&q<.11)pc=uPaint2;else if(q>-.1&&q<-.03&&xn<.62)pc=vec3(.025);}}
        else{/* 5: City Limits' night-runner slash: a long rising blade along each side, a thin one above it */
          if(abs(N.z)>.35){float q=vL.y-(uLivP.z-.38)-(1.-xn)*.3;if(q>0.&&q<.07)pc=uPaint2;else if(q>.1&&q<.125)pc=uPaint2;}}
        l2=true;}
      else if(!l2&&abs(N.z)>.35&&vL.y<band&&vL.y>uLivP.z-.62)pc=uPaint2;
      float az=abs(vL.z),s0=l2?.02:.07,s1=l2?.15:.2;if(uLiv<2.5&&az>s0&&az<s1&&(N.y>.45||abs(N.x)>.6&&vL.y>uLivP.z-.3))pc=uPaint2;
      if(!l2&&az>.035&&az<.06&&(N.y>.45||abs(N.x)>.6&&vL.y>uLivP.z-.3))pc=vec3(.9);
    }
    alb=pc;metal=uMetal*(1.-smoothstep(.35,.6,dot(pc,vec3(.33))));rough=.34;clear=1.;clearR=.045;flake=1.;dirty=true;
  }
  else if(m==2){alb=vec3(.010,.012,.015);rough=.06;F0d=.05;}
  else if(m==3){alb=vec3(.025,.03,.036);rough=.06;F0d=.05;}
  else if(m==5){alb=vec3(.62,.63,.66);metal=1.;rough=.14;}
  else if(m==6){alb=vec3(.032,.032,.034);rough=.86;
    float r=length(vL.xy),a=atan(vL.y,vL.x);
    if(em>0.&&r>em*.962)alb*=.62+.7*step(.42,fract(a*em*34.+step(0.,vL.z)*.5));
    em=0.;dirty=true;}
  else if(m==7){float on=max(uLamp*.45,uBrake);emc=vec3(1.,.04,.02)*(.06+on*1.6)*K;alb=vec3(.25,.01,.01);rough=.2;clear=.6;}
  else if(m==8){emc=vec3(1.,.96,.88)*(uLamp*4.+.02)*K;alb=vec3(.5);rough=.1;metal=.6;}
  else if(m==9){emc=vec3(.85,.92,1.)*(.25+uLamp*1.5)*K;alb=vec3(.3);rough=.2;}
  else if(m==10){float bl=step(.5,fract(uTime*1.6));float on=max(uInd.x*step(vL.z,0.),uInd.y*step(0.,vL.z))*bl;
    emc=vec3(1.,.45,.05)*(.04+uLamp*.2+on*2.5)*K;alb=vec3(.35,.17,.03);rough=.2;}
  else if(m==11){
    vec3 nl=normalize(cross(dFdx(vL),dFdy(vL)));vec3 an=abs(nl);vec2 q=an.x>.6?vL.zy:an.y>.6?vL.xz:vL.xy;
    q*=34.;vec2 rr=vec2(1.,1.732),hh=rr*.5,a=mod(q,rr)-hh,b=mod(q-hh,rr)-hh,g=dot(a,a)<dot(b,b)?a:b;
    float d=max(abs(g.x),abs(g.x)*.5+abs(g.y)*.866),e=smoothstep(.36,.46,d);
    alb=mix(vec3(.004),vec3(.05),e);rough=mix(.9,.35,e);}
  else if(m==12){alb=uRim;metal=1.;rough=.28;dirty=true;}
  else if(m==13){float g=vn3(vL*90.);alb=uClad*(.85+.3*g);rough=.72;dirty=true;}
  else if(m==14){alb=uPaint*.12;rough=.6;}
  else if(m==15){emc=alb*em*K*.6;alb*=.25;}
  else if(m==16){rough=.45;metal=.5;dirty=true;}
  else if(m==17){float w=step(.5,fract((vL.x+vL.z)*55.))*.5+step(.5,fract((vL.x-vL.z)*55.))*.5;alb=vec3(.03+.025*w);rough=.3;clear=.8;clearR=.05;}
  else if(m==18){alb=vec3(.01)*(1.+2.*step(.55,fract(vL.x*30.)));rough=.6;}
  else if(m==19){alb=uCal;rough=.35;clear=.6;}
  else if(m==20){float r=length(vL.xy);alb=vec3(.28,.28,.3)*(.8+.2*step(.5,fract(r*60.)));metal=1.;rough=.42;}
  else if(m==22){alb=vec3(.62,.62,.58);rough=.6;}
  else if(m==23){emc=vec3(.9)*uRev*1.2*K;alb=vec3(.6);rough=.15;}
  else if(m==24){alb=vec3(.02,.018,.016);rough=.08;F0d=.05;}
  else if(m==25){alb=vec3(.35,.32,.28);metal=1.;rough=.3;}
  else if(m==26){float g=vn3(vL*60.);alb*=.85+.3*g;rough=.9;dirty=true;}
  else if(m==27){rough=.85;dirty=true;}
  else if(m==29){emc=vec3(.75,.88,1.)*(.08+uLamp*1.6)*K;alb=vec3(.2);rough=.2;}
  /* City Limits: 30 a light strip that glows its own colour (uGlow) with the lamps on; 31 an underglow tube */
  else if(m==30){emc=uGlow*(.2+uLamp*1.4)*K;alb=uGlow*.2;rough=.2;}
  else if(m==31){emc=uGlow*2.2*K;alb=uGlow*.3;rough=.3;}
  else if(m==0&&em>0.){emc=alb*em*K*.6;}
  /* mud, measured up the car itself (wheels from their own hub) */
  if(dirty){float h=vL.y+uMudOff;float k=mud(vL,h);if(k>0.){alb=mix(alb,mudCol(vL,h),k);metal*=1.-k;clear*=1.-k;rough=mix(rough,.9,k);flake*=1.-k;}}
  /* light it, Shiftlight style */
  Surf s;s.P=vP;s.V=V;s.Nc=N;s.ao=1.0;s.spec=1.0;s.trans=0.0;
  vec3 Nf=N;
  if(flake>0.){float fp=length(fwidth(vL))*900.;vec3 c=floor(vL*700.);vec3 r=vec3(h13(c),h13(c+17.1),h13(c+31.7))-.5;Nf=normalize(N+r*.4*flake*saturate(1.0-fp));}
  s.N=Nf;s.diff=alb*(1.0-metal);s.F0=mix(vec3(F0d),alb,metal);s.rough=rough;s.clear=clear;s.clearR=clearR;
  float NoV=max(dot(N,V),1e-3);
  vec3 col=emc;
  col+=directAll(s,gl_FragCoord.xy,length(uCam-vP));
  /* what surrounds the car, blurred, as its ambient; darker underneath and low down */
  vec3 amb=textureLod(uProbe,N,uProbeLod).rgb+mix(uAmbDn,uAmbUp,N.y*.5+.5)*.5;
  float occ=1.0-.55*saturate(-N.y)-.25*saturate(1.0-(vL.y-.15)*3.);
  col+=s.diff*amb*occ;
  vec3 Rb=reflect(-V,Nf);vec3 base=env(Rb,s.rough)*envBRDF(s.F0,NoV,s.rough)*occ;
  if(s.clear>0.){float Fc=F_Sch(vec3(.04),NoV).x*s.clear;vec3 Rc=reflect(-V,N);col=col*(1.0-Fc)+base*(1.0-Fc)+env(Rc,s.clearR)*Fc;}
  else col+=base;
  oCol=vec4(col,1.0);
  oNrm=vec4(octEnc(N),s.rough,0.0);
  oVel=(vCur.xy/vCur.w-vPrev.xy/vPrev.w)*.5;
}`;
