  // ===== render/suv-shader.js =====
  /* The truck's own surface shader. Same lighting, probe and G-buffer outputs as the Shiftlight car
     shader, with an original luxury-SUV face painted on the loft: a wide hex-mesh grille in a heavy
     surround, wraparound lamps, two-tone lower cladding, vertical tail lamps, chrome or blacked-out trim,
     liveries, and dirt and mud that build up as you drive. */
  var SUV_FS = FRAME + NOISE + PACK + LIGHTING + SHADE + `
in vec3 vP;in vec3 vL;in vec3 vN;in vec3 vNL;in vec2 vUV;flat in uvec4 vMat;in vec4 vCur;in vec4 vPrev;
layout(location=0) out vec4 oCol;
#ifndef GLASS
layout(location=1) out vec4 oNrm;layout(location=2) out vec2 oVel;
#endif
uniform samplerCube uProbe;uniform float uProbeLod;
uniform vec3 uPaint;uniform float uMetal;uniform float uPaintR;uniform float uFlake;
uniform vec3 uLower;uniform vec3 uLiv;uniform vec3 uRim;
uniform vec4 uLook;   /* x chrome trim 0..1, y window tint, z livery, w lower cladding: 0 body colour, 1 satin */
uniform vec4 uLamps;  /* headlamps, tail, brake, reverse */
uniform vec4 uAux;    /* x light bar, y pods and ditch lamps, z sunroof, w number */
uniform vec4 uArch;   /* front axle x, rear axle x, arch centre y, arch radius */
uniform vec4 uStyle;  /* x face: 0 classic, 1 street, 2 backcountry; y tail: 0 wide two-piece, 1 LED rings; z accent on */
uniform vec3 uAcc;uniform vec3 uCal;
uniform float uHcg;uniform float uDisc;uniform float uDirt;uniform float uMud;uniform float uSeed;
float aa(float d,float w){float f=fwidth(d)*.8+1e-5;return 1.0-smoothstep(w-f,w+f,d);}
float rbox(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
vec3 envBRDF(vec3 F0,float NoV,float r){const vec4 c0=vec4(-1,-.0275,-.572,.022),c1=vec4(1,.0425,1.04,-.04);vec4 rr=r*c0+c1;
  float a=min(rr.x*rr.x,exp2(-9.28*NoV))*rr.x+rr.y;vec2 AB=vec2(-1.04,1.04)*a+rr.zw;return F0*AB.x+AB.y;}
vec3 env(vec3 R,float r){return textureLod(uProbe,R,r*uProbeLod).rgb;}
vec3 heat(float t){return vec3(1.,.28,.05)*smoothstep(.25,.6,t)*6.+vec3(1.,.55,.15)*smoothstep(.6,1.,t)*14.;}
struct M{vec3 alb;float metal;float rough;float clear;float clearR;vec3 em;float flake;float dirtK;float spec;};
void chrome(inout M m,float k){m.alb=mix(m.alb,mix(vec3(.025),vec3(.9),uLook.x),k);m.metal=mix(m.metal,uLook.x,k);m.rough=mix(m.rough,mix(.35,.07,uLook.x),k);m.flake*=1.0-k;}
void satin(inout M m,vec3 c,float k){m.alb=mix(m.alb,c,k);m.metal*=1.0-k;m.rough=mix(m.rough,.58,k);m.clear*=1.0-k*.8;m.flake*=1.0-k;m.spec=mix(m.spec,.5,k);}
/* the greenhouse: 0 paint, 1 black, 2 belt trim, 3 glass. u runs 0 at the belt to 1 on the roof centre */
void ghClass(float u,float x,float az,out int part,out float glass,out float frit,out float tr){
  part=0;glass=0.0;frit=0.0;tr=.42*(1.0-uLook.y*.75);
  if(u>.40){
    if(x>.10){part=3;glass=1.0;tr=.8;frit=max(max(aa(u-.40,.035),aa(x-.10,.035)),aa(.80-x,.02));}
    else if(x<-2.10){part=3;glass=1.0;frit=max(max(aa(u-.40,.04),aa(-2.10-x,.035)),aa(x+2.30,.02));
      float cb=aa(rbox(vec2(az,u-.93),vec2(.16,.035),.02),0.);if(cb>0.0){frit=1.0;}}
    else if(uAux.z>.5&&x>-.80&&x<-.08&&az<.42){part=3;glass=1.0;tr=.22;frit=aa(min(min(x+.80,-.08-x),.42-az),.03);}
  }else{
    if(u<.03)part=2;
    else if(u>.355)part=1;
    else if(x>.62)part=1;
    else if(abs(x+.22)<.045||abs(x+1.17)<.05)part=1;
    else if(x<-2.02+.30*u)part=0;
    else{part=3;glass=1.0;float d=min(min(u-.03,.355-u),min(min(abs(abs(x+.22)-.045),abs(abs(x+1.17)-.05)),min(x+2.02-.30*u,.62-x)));frit=aa(d,.012);}
  }
}
/* grime: road dust low on the body and on flat tops, mud flung off the tyres around the arches */
void grime(inout M m,vec3 L,vec3 N,float yg,float k){
  if(uDirt+uMud<.01||k<=0.0)return;
  float n1=fbm(vec2(L.x*2.3+L.z*1.3,yg*3.7)+uSeed),n2=vn(vec2(L.x*9.,yg*14.)+uSeed*3.);
  float low=saturate((1.15-yg)/.8);
  float d=uDirt*saturate(low*1.35-.25+(n1-.5)*.9)+uDirt*.35*saturate(N.y*1.5-.5)*smoothstep(.35,.65,n1);
  d=saturate(d*(.8+.4*n2));
  vec3 dust=vec3(.36,.29,.21)*(.8+.3*n2);
  m.alb=mix(m.alb,dust,d*k);m.rough=mix(m.rough,.88,d*k);m.clear*=1.0-d*k;m.metal*=1.0-d*k;m.flake*=1.0-d*k;
  float ax=min(abs(L.x-uArch.x),abs(L.x-uArch.y));float r=length(vec2(ax,yg-.375));
  float near=saturate(1.0-(r-uArch.w)/.55)*step(.5,abs(N.z)+step(yg,.6));
  vec3 vc=voro(vec2(L.x*11.+uSeed,yg*11.));float blob=(1.0-smoothstep(.1,.32,vc.x))*step(.35,vc.z);
  float mud=uMud*saturate(near*1.4+low*.5-.3)*max(blob,smoothstep(.45,.7,n1)*low);
  mud=saturate(mud*1.5);
  m.alb=mix(m.alb,vec3(.1,.065,.04)*(.8+.4*n2),mud*k);m.rough=mix(m.rough,.5,mud*k);m.clear*=1.0-mud*k;m.metal*=1.0-mud*k;m.flake*=1.0-mud*k;
}
float seg7(vec2 p,int dgt){/* a block digit for the race number, p in 0..1 */
  if(p.x<0.||p.x>1.||p.y<0.||p.y>1.)return 0.;
  int mk[10]=int[10](119,36,93,109,46,107,123,37,127,111);int b=mk[dgt];
  float t=.18,s=0.;
  if((b&1)!=0)s=max(s,step(abs(p.y-.92),t*.5)*step(abs(p.x-.5),.42));
  if((b&2)!=0)s=max(s,step(abs(p.x-.08),t*.5)*step(abs(p.y-.72),.24));
  if((b&4)!=0)s=max(s,step(abs(p.x-.92),t*.5)*step(abs(p.y-.72),.24));
  if((b&8)!=0)s=max(s,step(abs(p.y-.5),t*.5)*step(abs(p.x-.5),.42));
  if((b&16)!=0)s=max(s,step(abs(p.x-.08),t*.5)*step(abs(p.y-.28),.24));
  if((b&32)!=0)s=max(s,step(abs(p.x-.92),t*.5)*step(abs(p.y-.28),.24));
  if((b&64)!=0)s=max(s,step(abs(p.y-.08),t*.5)*step(abs(p.x-.5),.42));
  return s;
}
void livery(inout M m,vec3 L,vec3 N,float yg){
  int lv=int(uLook.z+.5);if(lv==0)return;
  float az=abs(L.z),k=0.0;vec3 c=uLiv;
  if(lv==1){/* twin stripes over the top */
    k=aa(abs(az-.22)-.07,0.)*step(.2,N.y+abs(N.x)*step(.62,yg));}
  else if(lv==2){/* a long side sweep that kicks up at the rear */
    float yc=.84+.035*L.x/2.4,w=.028+.012*(L.x+2.4)/4.8;
    float sw=aa(abs(yg-yc)-w,0.)*step(L.x,2.25)*step(-1.9,L.x);
    float kick=aa(abs(L.x+1.9+(yg-yc)*.55)-.03,0.)*step(yc-.03,yg)*step(yg,1.13);
    k=max(sw,kick)*step(.35,abs(N.z));}
  else if(lv==3){/* desert racer: number boards on the front doors, a band along the belt */
    vec2 q=vec2((L.x-.38)/.48,(yg-.78)/.26);float board=aa(rbox(vec2(L.x-.38,yg-.78),vec2(.24,.13),.03),0.)*step(.35,abs(N.z));
    float num=0.;if(board>0.){int n=int(uAux.w+.5);float sx=L.z>0.?1.:-1.;vec2 p=vec2((L.x-.38)*sx+.2,yg-.78+.11)/.22;
      num=max(seg7(vec2(p.x/.8,p.y),n/10),seg7(vec2((p.x-1.)/.8,p.y),n%10));}
    float band=aa(abs(yg-1.105)-.02,0.)*step(.35,abs(N.z));
    if(board>0.){m.alb=mix(m.alb,mix(vec3(.85),vec3(.02),num),board);m.metal*=1.0-board;m.flake*=1.0-board;m.rough=mix(m.rough,.35,board);}
    k=band;}
  else if(lv==4){/* flames licking back from the nose */
    float f=fbm(vec2(L.x*1.6-uSeed,yg*7.+az*5.))*.55+vn(vec2(L.x*4.,yg*16.))*.25;
    float reach=saturate((L.x-.2)/1.9);float sideOK=step(.35,abs(N.z))*step(.62,yg)*step(yg,1.12)+step(.5,N.y)*step(.9,L.x);
    float tongue=smoothstep(.45,.5,reach*1.05+f*.6-.3-abs(sin(yg*28.+L.x*3.))*.12)*saturate(sideOK);
    c=mix(vec3(.9,.04,.01),vec3(1.,.75,.05),smoothstep(.55,1.,reach+f*.3));k=tongue;}
  else if(lv==5){/* mud-country camo */
    vec3 v=voro(vec2(L.x*2.6+L.z*1.4,yg*3.2+L.z*2.)+uSeed);
    vec3 cc=v.z<.33?vec3(.2,.18,.11):v.z<.66?vec3(.09,.11,.06):vec3(.32,.27,.18);k=1.0;c=cc;
    if(yg<.5&&abs(N.z)>.3)k=0.;m.metal=0.;m.flake=0.;m.rough=.55;m.clear=.2;}
  m.alb=mix(m.alb,c,k);m.flake*=1.0-k*.7;
}
void lamp(inout M m){m.alb=vec3(.55);m.metal=1.;m.rough=.12;m.clear=1.;m.clearR=.01;m.flake=0.;m.dirtK=.3;}
void gblack(inout M m,float k){m.alb=mix(m.alb,vec3(.012),k);m.metal*=1.0-k;m.rough=mix(m.rough,.18,k);m.flake*=1.0-k;m.clear=mix(m.clear,.8,k);}
void hexmesh(inout M m,vec3 L,float yg,float sc,float bright){vec2 h=vec2(L.z*sc,yg*sc*1.155);h.x+=step(.5,fract(h.y*.5))*.5;vec2 f=abs(fract(h)-.5);float web=step(.34,max(f.x,f.y*1.15));
  m.alb=vec3(.006)+web*bright;m.metal=web*.3;m.rough=.4;m.clear=0.;m.flake=0.;m.dirtK=.5;}
void redLamp(inout M m,float led){m.alb=vec3(.32,.012,.012);m.metal=0.;m.rough=.05;m.clear=1.;m.clearR=.01;m.flake=0.;m.dirtK=.3;m.em+=vec3(1.,.03,.02)*(uLamps.y*4.+uLamps.z*26.+.2)*(.35+.65*led);}
void revLamp(inout M m){m.alb=vec3(.75);m.metal=0.;m.rough=.05;m.clear=1.;m.clearR=.01;m.flake=0.;m.dirtK=.3;m.em+=vec3(1.,.97,.9)*uLamps.w*30.;}
/* the three faces: 0 classic twin-bar, 1 street split mesh, 2 backcountry quad lamps */
void face(inout M m,vec3 L,vec3 N,float yg){
  float az=abs(L.z);int fs=int(uStyle.x+.5);vec3 W=vec3(.95,.93,.86);
  if(fs==0){
    /* a tall grille crossed by two heavy chrome bars, chrome-ringed lamps with twin projectors, a wide intake */
    float gd=rbox(vec2(az,yg-.8),vec2(.4,.125),.05);
    if(gd<0.){hexmesh(m,L,yg,34.,.04);float bars=max(aa(abs(yg-.836)-.017,0.),aa(abs(yg-.764)-.017,0.))*step(az,.385);chrome(m,bars);}
    chrome(m,aa(abs(gd+.013),.013));
    float yc=.815,hd=rbox(vec2(az-.69,yg-yc),vec2(.2,.066),.03);
    if(hd<0.){lamp(m);float b1=length(vec2(az-.6,yg-yc)),b2=length(vec2(az-.78,yg-yc));
      float bowl=max(aa(b1,.046),aa(b2,.042));m.alb=mix(m.alb,vec3(.95),bowl*.5);
      float lens=max(aa(b1,.022),aa(b2,.02));m.em+=W*lens*(uLamps.x*95.+3.)+W*bowl*uLamps.x*6.;
      float drl=aa(abs(yg-(yc-.05))-.006,0.)*step(.52,az)*step(az,.87);m.em+=vec3(1.,.98,.92)*drl*(10.+uLamps.x*8.);}
    chrome(m,aa(abs(hd),.006)*.7);
    float id=rbox(vec2(az,yg-.53),vec2(.36,.045),.02);if(id<0.){m.alb=vec3(.01);m.metal=0.;m.rough=.6;m.clear=0.;m.flake=0.;}
    chrome(m,aa(abs(id),.005)*.5);
    float fog=length(vec2(az-.66,yg-.53));if(fog<.04){lamp(m);m.em+=vec3(1.,.95,.8)*aa(fog,.026)*uLamps.x*40.;}
    chrome(m,aa(abs(fog-.04),.006));
    chrome(m,aa(abs(yg-.625)-.006,0.)*step(az,.84)*.9);
  }
  else if(fs==1){
    /* a slim upper slot and a big lower mesh with a painted bar between, smoked slim lamps with a light blade */
    float up=rbox(vec2(az,yg-.885),vec2(.42,.04),.02),lo=rbox(vec2(az*(1.+.3*(yg-.64)),yg-.645),vec2(.43,.115),.05);
    if(up<0.)hexmesh(m,L,yg,46.,.05);
    if(lo<0.)hexmesh(m,L,yg,30.,.045);
    gblack(m,aa(abs(up+.008),.008));gblack(m,aa(abs(lo+.01),.01));
    if(uStyle.z>.5)m.alb=mix(m.alb,uAcc,aa(abs(yg-.82)-.0035,0.)*step(az,.36));
    float yc=.875,hd=rbox(vec2(az-.7,yg-yc),vec2(.19,.042),.016);
    if(hd<0.){lamp(m);m.alb=vec3(.03);m.metal=.9;m.rough=.08;
      float p1=rbox(vec2(az-.62,yg-yc+.006),vec2(.026,.016),.006),p2=rbox(vec2(az-.75,yg-yc+.006),vec2(.026,.016),.006);
      float lens=max(aa(p1,0.),aa(p2,0.));m.alb=mix(m.alb,vec3(.5),lens*.6);m.em+=W*lens*(uLamps.x*110.+2.);
      float blade=aa(abs(yg-yc-.03)-.0045,0.)*step(az,.88)*step(.52,az);m.em+=vec3(.92,.96,1.)*blade*(14.+uLamps.x*6.);}
    gblack(m,aa(abs(hd),.006));
    float vd=rbox(vec2(az-.77,yg-.6),vec2(.06,.085),.02);
    if(vd<0.){m.alb=vec3(.008);m.metal=0.;m.rough=.5;m.clear=0.;m.flake=0.;float fin=aa(abs(fract(yg*42.)-.5)-.2,0.);m.alb+=vec3(.025)*fin;}
    gblack(m,aa(abs(vd),.006));
  }
  else{
    /* a black bumper with square fog lamps, a black panel with heavy slats, four round lamps with halo rings */
    if(yg<.68&&yg>.4)satin(m,vec3(.028),1.0);
    float fd=rbox(vec2(az-.62,yg-.56),vec2(.05,.028),.006);if(fd<0.){lamp(m);m.em+=vec3(1.,.95,.8)*uLamps.x*30.*aa(fd+.008,0.);}
    m.alb=mix(m.alb,vec3(.006),aa(abs(fd),.004));
    float pd=rbox(vec2(az,yg-.81),vec2(.9,.11),.035);
    if(pd<0.){m.alb=vec3(.016);m.metal=0.;m.rough=.55;m.clear=.1;m.flake=0.;m.dirtK=.6;
      float sl=aa(abs(fract((yg-.71)/.045)-.5)-.2,0.)*step(az,.47);m.alb=mix(m.alb,vec3(.05),sl);m.rough=mix(m.rough,.3,sl);
      for(int i=0;i<2;i++){float lx=i==0?.62:.8;float r=length(vec2(az-lx,yg-.81));
        if(r<.062){lamp(m);float lens=aa(r,.03);m.em+=W*lens*(uLamps.x*95.+3.);
          float halo=aa(abs(r-.047)-.005,0.);m.em+=vec3(1.,.98,.92)*halo*(9.+uLamps.x*6.);}
        m.alb=mix(m.alb,vec3(.008),aa(abs(r-.064),.004));}
    }
    gblack(m,aa(abs(pd),.004)*.6);
  }
}
/* the two tails: 0 wide two-piece lamps with a bright bar between, 1 smoked lamps with square LED rings */
void tail(inout M m,vec3 L,vec3 N,float yg){
  float az=abs(L.z);int ts=int(uStyle.y+.5);bool back=N.x<-.2,side=abs(N.z)>.3;
  if(ts==0){
    float t1=rbox(vec2(az-.77,yg-.97),vec2(.115,.08),.025),t2=rbox(vec2(az-.51,yg-.985),vec2(.115,.055),.02);
    if(t1<0.&&(back||side)){float led=aa(abs(fract((yg-.9)/.04)-.5)-.28,0.);redLamp(m,led);}
    if(t2<0.&&back){if(yg<.958)revLamp(m);else redLamp(m,1.);}
    if(back){chrome(m,aa(rbox(vec2(az,yg-.985),vec2(.39,.013),.008),0.));chrome(m,max(aa(abs(t1),.005),aa(abs(t2),.005))*.6);}
  }else{
    vec2 p=vec2(az-.75,yg-.965);float hb=rbox(p,vec2(.13,.088),.014);
    if(hb<0.&&(back||side)){m.alb=vec3(.05,.004,.004);m.metal=0.;m.rough=.04;m.clear=1.;m.clearR=.01;m.flake=0.;m.dirtK=.3;
      float r1=aa(abs(rbox(p,vec2(.1,.062),.01))-.005,0.),r2=aa(abs(rbox(p,vec2(.06,.032),.006))-.004,0.);
      m.em+=vec3(1.,.03,.02)*(r1+r2*.8)*(uLamps.y*7.+uLamps.z*30.+.6);
      float rv=aa(rbox(p,vec2(.025,.012),.004),0.);if(rv>0.){m.alb=mix(m.alb,vec3(.6),rv);m.em+=vec3(1.,.97,.9)*rv*uLamps.w*30.;}}
    if(back){float st=aa(rbox(vec2(az,yg-1.005),vec2(.6,.009),.005),0.);if(st>0.){m.alb=mix(m.alb,vec3(.05,.004,.004),st);m.flake*=1.0-st;m.metal*=1.0-st;m.em+=vec3(1.,.03,.02)*st*(uLamps.y*3.+uLamps.z*10.+.15);}
      gblack(m,aa(abs(hb),.005));}
  }
}
void paint(inout M m,vec3 L,vec3 N,float yg){
  m.alb=uPaint;m.metal=uMetal;m.rough=uPaintR;m.clear=1.0;m.clearR=.035;m.flake=uFlake;
  float az=abs(L.z),x=L.x;
  livery(m,L,N,yg);
  /* lower cladding: rocker, bumpers below the trim line */
  float lowY=.56+.02*smoothstep(1.8,2.4,x);
  bool front=x>2.3&&N.x>.25,rear=x<-2.3&&N.x<-.25;
  float clad=step(yg,front?.47:rear?.6:lowY);
  if(clad>0.0){if(uLook.w>.5)satin(m,uLower,1.0);}
  /* the trim line above the cladding, along the sides */
  if(abs(N.z)>.45&&x<2.3&&x>-2.35)chrome(m,aa(abs(yg-lowY-.008),.008));
  /* ---------- the face ---------- */
  if(x>2.38&&N.x>.25)face(m,L,N,yg);
  /* the lamps wrap onto the fenders, with an amber marker behind */
  if(x>2.3&&abs(N.z)>.3&&N.x<.6){
    int fs=int(uStyle.x+.5);
    if(fs==0){float sd=max(abs(yg-.815)-.062,2.36-x);if(sd<0.){lamp(m);float mk=step(x,2.43);m.alb=mix(m.alb,vec3(.9,.45,.02),mk*.85);m.metal*=1.0-mk;m.em+=vec3(1.,.5,.05)*mk*(1.5+uLamps.x*8.);}chrome(m,aa(abs(sd),.005)*.6);}
    else if(fs==1){float sd=max(abs(yg-.875)-.04,2.41-x);if(sd<0.){lamp(m);m.alb=vec3(.03);float mk=step(x,2.45);m.em+=vec3(1.,.5,.05)*mk*(1.2+uLamps.x*6.);}gblack(m,aa(abs(sd),.005));}
    else{float sd=rbox(vec2(x-2.42,yg-.81),vec2(.03,.016),.006);if(sd<0.){lamp(m);m.alb=vec3(.9,.45,.02);m.metal=0.;m.em+=vec3(1.,.5,.05)*(1.5+uLamps.x*8.);}}
  }
  /* ---------- the sides ---------- */
  if(abs(N.z)>.3){
    float sd=1.0;
    if(yg>.44&&yg<1.14){sd=min(sd,abs(x-.97+.06*(yg-.8)));sd=min(sd,abs(x+.22));}
    if(yg>.86&&yg<1.14)sd=min(sd,abs(x+1.12));
    if(yg<.88&&x>-1.12&&x<-.22){float ar=length(vec2(x-uArch.y,yg-.375));if(ar<uArch.w+.24)sd=min(sd,abs(ar-uArch.w-.07));}
    if(x<.97&&x>-1.12)sd=min(sd,abs(yg-.44));
    if(L.z>0.0)sd=min(sd,abs(rbox(vec2(x+1.95,yg-.96),vec2(.07,.07),.03)));
    float gp=aa(sd,.0028);if(gp>0.0){m.alb=mix(m.alb,vec3(.004),gp);m.clear*=1.0-gp;m.flake*=1.0-gp;m.rough=mix(m.rough,.7,gp);}
    for(int i=0;i<2;i++){float hx=i==0?.12:-.98;float h=rbox(vec2(x-hx,yg-1.02),vec2(.075,.013),.012);chrome(m,aa(h,0.));}
  }
  /* ---------- the hood: shut lines, and a crease along each side of the raised centre ---------- */
  if(N.y>.5&&x>.9){
    float sd=abs(x-.985);sd=min(sd,abs(az-.82+.04*saturate((x-1.)/1.3)));sd=min(sd,abs(x-2.47));
    float gp=aa(sd,.003);if(gp>0.0){m.alb=mix(m.alb,vec3(.004),gp);m.clear*=1.0-gp;m.flake*=1.0-gp;}
  }
  /* ---------- the tail ---------- */
  if(x<-2.3&&N.x<.3){
    bool back=N.x<-.2;
    if(back){
      float lg=rbox(vec2(az,yg-.87),vec2(.635,.3),.05);
      float gp=aa(abs(lg),.003)*step(yg,1.15);if(gp>0.0){m.alb=mix(m.alb,vec3(.004),gp);m.clear*=1.0-gp;}
      float pl=rbox(vec2(az,yg-.75),vec2(.17,.075),.012);
      if(pl<0.0){vec2 pc=vec2((L.z+.15)/.3*7.,(yg-.7)/.08*5.);vec2 ci=floor(pc);
        float ch=step(.45,h12(ci+3.+uSeed))*step(0.,pc.x)*step(pc.x,7.)*step(.8,pc.y)*step(pc.y,4.2)*step(.2,fract(pc.x));
        m.alb=mix(vec3(.82,.82,.76),vec3(.03),ch);m.metal=0.;m.flake=0.;m.clear=.5;m.rough=.4;m.em+=vec3(.9,.9,.8)*(1.0-ch)*uLamps.y*.5;}
      chrome(m,aa(abs(pl+.004),.008));
      if(yg<.6)satin(m,uLower,step(.5,uLook.w));
    }
    tail(m,L,N,yg);
  }
  if(N.y>.55&&x<-2.2&&yg<.66)satin(m,vec3(.03),1.0);
  /* water beads */
  if(uWet>0.0&&m.clear>.5){vec3 v3=voro(vec2(L.x+L.y*.3,L.z+L.y*.7)*55.);float bead=aa(v3.x,.26)*step(.45,v3.z)*uWet*saturate(1.0-length(fwidth(L))*120.);
    m.clearR=mix(m.clearR,.012,bead);m.alb*=1.0-bead*.15;}
}
void main(){
  vec3 N=normalize(vN);if(!gl_FrontFacing)N=-N;vec3 NL=normalize(vNL);
  vec3 V=normalize(uCam-vP);uint id=vMat.x;float yg=vL.y+uHcg;float az=abs(vL.z);
  M m;m.alb=vec3(.5);m.metal=0.;m.rough=.5;m.clear=0.;m.clearR=.05;m.em=vec3(0);m.flake=0.;m.dirtK=1.0;m.spec=1.0;
  float alpha=1.0;
  if(id==0u){
    float ax=min(abs(vL.x-uArch.x),abs(vL.x-uArch.y));if(length(vec2(ax,vL.y-uArch.z))<uArch.w&&az>.55)discard;
    if(vL.x<.8&&vL.x>-2.29&&az<.865&&NL.y>.3&&yg>1.0)discard;
    paint(m,vL,NL,yg);
  }
  else if(id==1u){
    int part;float glass,frit,tr;ghClass(vUV.x,vL.x,az,part,glass,frit,tr);
    float ag=glass*(1.0-frit);
#ifdef GLASS
    if(ag<.02)discard;
#else
    if(ag>.98)discard;
    if(part==3||part==1){m.alb=vec3(.01);m.rough=.25;m.clear=.6;m.clearR=.03;}
    else if(part==2){m.alb=vec3(.02);chrome(m,1.0);m.clear=.5;}
    else{m.alb=uPaint;m.metal=uMetal;m.rough=uPaintR;m.clear=1.0;m.clearR=.035;m.flake=uFlake;
      if(int(uLook.z+.5)==1){float k=aa(abs(az-.22)-.07,0.);m.alb=mix(m.alb,uLiv,k);}
      if(int(uLook.z+.5)==5){vec3 v=voro(vec2(vL.x*2.6+vL.z*1.4,yg*3.2+vL.z*2.)+uSeed);m.alb=v.z<.33?vec3(.2,.18,.11):v.z<.66?vec3(.09,.11,.06):vec3(.32,.27,.18);m.flake=0.;m.metal=0.;m.rough=.55;}
      /* the third brake lamp atop the rear glass */
      if(vL.x<-2.0&&vUV.x>.5){float tb=aa(rbox(vec2(az,vUV.x-.93),vec2(.16,.03),.01),0.);m.alb=mix(m.alb,vec3(.3,.01,.01),tb);m.em+=vec3(1.,.03,.02)*tb*uLamps.z*30.;}
    }
#endif
  }
  else if(id==2u){m.alb=vec3(.018);m.rough=max(.08,float(vMat.y)/255.);m.clear=.3;}
  else if(id==3u){m.alb=vec3(.9);m.metal=1.;m.rough=.08;}
  else if(id==4u){
    uint tt=vMat.y;float v=vUV.y,a=vUV.x;m.alb=vec3(.022);m.rough=.85;
    float tread=step(.3,v)*step(v,.7);
    if(tread>0.0){
      if(tt==0u){float gr=aa(abs(fract(v*7.)-.5),.06);float sl=aa(abs(fract(a*90.+v*3.)-.5),.06)*step(abs(v-.5),.12);m.alb*=1.0-.6*max(gr,sl);}
      else if(tt==1u){vec2 q=vec2(a*76.,v*9.);q.x+=step(.5,fract(q.y*.5))*.5;vec2 f=abs(fract(q)-.5);m.alb*=1.0-.7*step(.38,max(f.x,f.y));}
      else if(tt==5u){m.rough=.55;m.alb=vec3(.03);}
      else{m.alb*=.8;}
    }
    if(tt==5u&&v>.72&&v<.95){float wr=aa(abs(fract(a*160.+sin(v*40.)*.2)-.5),.12);m.alb*=1.0-wr*.4;}
    if((tt==1u||tt==2u||tt==3u)&&v>.78&&v<.9){float ch=step(.6,h12(floor(vec2(a*220.,(v-.79)*48.))))*step(.3,fract(a*22.))*step(fract(a*2.),.3)*step(v,.885);m.alb=mix(m.alb,vec3(.42),ch);}
    m.rough=mix(m.rough,.35,uWet*.8);m.alb*=1.0-.3*uWet;
  }
  else if(id==5u){uint k=vMat.y;
    if(k==0u){m.alb=vec3(.62,.63,.64);m.metal=1.;m.rough=.22;m.clear=.6;m.clearR=.05;}
    else if(k==1u){m.alb=vec3(.03);m.metal=.6;m.rough=.5;}
    else if(k==2u){m.alb=vec3(.92);m.metal=1.;m.rough=.05;}
    else if(k==3u){m.alb=vec3(.05);m.rough=.3;m.clear=.8;}
    else if(k==4u){m.alb=vec3(.025);m.rough=.45;m.clear=.3;}
    else if(k==6u){m.alb=vec3(.85,.62,.22);m.metal=1.;m.rough=.18;}
    else if(k==7u){/* bronze disc: eight round windows cut through it */
      float r=length(vL.xy),a=atan(vL.y,vL.x),sec=6.28318/8.,aw=mod(a+sec*.5,sec)-sec*.5;
      if(r>.09&&length(vec2(r-.15,aw*r))<.033)discard;
      m.alb=vec3(.42,.27,.12);m.metal=1.;m.rough=.32;m.clear=.4;}
    else if(k==8u){m.alb=vec3(.045,.047,.05);m.metal=.7;m.rough=.2;m.clear=.9;m.clearR=.04;}
    else{m.alb=uRim;m.metal=.3;m.rough=.3;m.clear=.8;}
    m.dirtK=.6;
  }
  else if(id==6u){float r=vUV.y,a=vUV.x;m.alb=vec3(.28,.27,.26);m.metal=1.;m.rough=.38;
    float grooves=aa(abs(fract(a*6.+r*9.)-.5),.03)*.4;m.alb*=1.0-grooves;m.em+=heat(uDisc);m.dirtK=0.;}
  else if(id==8u){m.alb=vec3(float(vMat.y)/255.*.16)*vec3(1.,.92,.82);m.rough=.85;m.dirtK=0.;}
  else if(id==14u){int part;float gl,fr,tr;ghClass(vUV.x,vL.x,az,part,gl,fr,tr);if(gl*(1.0-fr)>.5&&tr>.3)discard;m.alb=vec3(.06,.055,.05);m.rough=.9;m.dirtK=0.;}
  else if(id==9u){m.alb=vec3(.01);m.rough=.2;m.dirtK=0.;
    if(vMat.y==0u){vec2 d1=vec2(vL.z+.47,yg-1.095)/.04,d2=vec2(vL.z+.31,yg-1.095)/.04;
      float r1=length(d1),r2=length(d2);float ring=aa(abs(r1-.85),.05)+aa(abs(r2-.85),.05);
      m.em+=vec3(.95,.75,.35)*ring*.8;}
    else m.em+=vec3(.9,.6,.25)*.3;}
  else if(id==10u){m.alb=vec3(.85,.85,.88);m.metal=1.;m.rough=.12;float t=saturate(vUV.y*2.);m.alb=mix(m.alb,vec3(.55,.42,.62),saturate(1.0-t)*.4);}
  else if(id==11u){m.alb=vec3(.016);m.rough=.8;}
  else if(id==12u){m.alb=vec3(.012);m.rough=.9;m.dirtK=.6;}
  else if(id==13u){m.alb=vec3(.9);m.metal=1.;m.rough=.01;m.dirtK=0.;}
  else if(id==15u){m.alb=vec3(.12);m.rough=.08;m.clear=1.;m.clearR=.01;m.dirtK=.2;
    float cells=aa(abs(fract(vUV.x*14.)-.5)-.3,0.);
    float on=yg>1.5?uAux.x:uAux.y;
    m.em+=vec3(.92,.96,1.)*on*(30.+90.*cells);}
  else if(id==16u){m.alb=vec3(.035);m.rough=.4;m.metal=.4;if(vMat.y==1u){m.alb=vec3(.7);m.metal=1.;m.rough=.3;}}
  else if(id==17u){uint k=vMat.y;
    if(k==0u){m.alb=vec3(.02);m.rough=.62;m.clear=.2;}
    else if(k==1u){m.alb=vec3(.12);m.rough=.5;}
    else if(k==2u){m.alb=vec3(.85);m.metal=1.;m.rough=.1;}
    else if(k==4u){float w=vn(vec2(vL.x*300.,vL.z*300.+vL.y*200.));m.alb=vec3(.15,.16,.085)*(.85+.3*w);m.rough=.88;m.dirtK=.7;}
    else if(k==5u){m.alb=uAcc;m.rough=.3;m.clear=.8;m.metal=.2;}
    else if(k==6u){m.alb=uCal;m.rough=.35;m.clear=.6;m.dirtK=.4;}
    else{m.alb=vec3(.6,.03,.02);m.rough=.35;m.clear=.6;}}
  else if(id==18u){
    /* textured cladding: grained satin in the lower colour, painted to match if the lower body is body colour; kind 1 is gloss black */
    float g=vn(vL.xy*170.+vL.z*110.)*.6+vn(vec2(vL.z,vL.y)*330.+vL.x*90.)*.4;
    m.alb=uLower*(.85+.3*g);m.rough=.7+.12*g;m.clear=0.;m.spec=.42;m.dirtK=.55;
    if(vMat.y==1u){m.alb=vec3(.016)*(.9+.2*g);m.rough=.3;m.clear=.5;m.clearR=.06;m.spec=.8;}
    else if(uLook.w<.5){m.alb=uPaint;m.metal=uMetal;m.rough=uPaintR;m.clear=1.0;m.clearR=.035;m.flake=uFlake;m.spec=1.0;m.dirtK=1.0;}}
  if(id!=1u)grime(m,vL,N,yg,m.dirtK*(id==4u?.6:1.));
  /* ---------- light it ---------- */
  Surf s;s.P=vP;s.V=V;s.N=N;s.Nc=N;s.ao=1.0;s.spec=m.spec;s.trans=0.0;
  vec3 flakeN=N;
  if(m.flake>0.0){float fp=length(fwidth(vL))*900.;vec3 c=floor(vL*700.);vec3 r=vec3(h13(c),h13(c+17.1),h13(c+31.7))-.5;flakeN=normalize(N+r*.45*m.flake*saturate(1.0-fp));}
  s.N=flakeN;
  s.diff=m.alb*(1.0-m.metal);s.F0=mix(vec3(.04),m.alb,m.metal);s.rough=m.rough;s.clear=m.clear;s.clearR=m.clearR;
  float NoV=max(dot(N,V),1e-3);
  vec3 col=m.em;
#ifdef GLASS
  int part;float glass,frit,tr;ghClass(vUV.x,vL.x,az,part,glass,frit,tr);
  float F=F_Sch(vec3(.04),NoV).x;
  vec3 R=reflect(-V,N);vec3 refl=env(R,.02);
  Surf sg=s;sg.diff=vec3(0);sg.F0=vec3(.04);sg.rough=.04;sg.clear=0.0;
  float dust=uDirt*.55*saturate((1.25-yg)*2.)*smoothstep(.3,.7,fbm(vec2(vL.x*3.,yg*5.)+uSeed));
  col+=directAll(sg,gl_FragCoord.xy,length(uCam-vP))+refl*F*(1.0-dust);
  vec3 dc=vec3(.36,.29,.21)*(textureLod(uProbe,vec3(0,1,0),uProbeLod).rgb*.6+.05);
  col=mix(col,dc,dust*.5);
  alpha=1.0-(1.0-F)*tr*(1.0-dust*.6);
  oCol=vec4(col,alpha);
#else
  bool inside=id==8u||id==9u||id==14u;float cab=inside?.25:1.0;
  col+=directAll(s,gl_FragCoord.xy,length(uCam-vP))*cab;
  vec3 amb=textureLod(uProbe,N,uProbeLod).rgb;
  float occ=(1.0-.55*saturate(-N.y)-.25*saturate(1.0-(yg-.1)*2.5))*(inside?.18:1.0);
  col+=s.diff*amb*occ;
  vec3 Rb=reflect(-V,flakeN);vec3 eb=envBRDF(s.F0,NoV,s.rough);
  vec3 base=env(Rb,s.rough)*eb*occ*m.spec;
  if(s.clear>0.0){float Fc=F_Sch(vec3(.04),NoV).x*s.clear;vec3 Rc=reflect(-V,N);col=col*(1.0-Fc)+base*(1.0-Fc)+env(Rc,s.clearR)*Fc;}
  else col+=base;
  oCol=vec4(col,1.0);
  oNrm=vec4(octEnc(N),s.rough,0.0);
  oVel=(vCur.xy/vCur.w-vPrev.xy/vPrev.w)*.5;
#endif
}`;

  function freeMesh(gl, M) {
    M && (gl.deleteVertexArray(M.vao), gl.deleteBuffer(M.vb), M.ib && gl.deleteBuffer(M.ib));
  }
  /* draws the player's truck (and any other copies of it, each with its own look) */
  var SuvRenderer = class {
    constructor(R2) {
      this.R = R2;
      let G2 = R2.G;
      this.P = { car: G2.program("suv", CAR_VS, SUV_FS), glass: G2.program("suvGlass", CAR_VS, SUV_FS, { GLASS: 1 }) }, this.models = /* @__PURE__ */ new Map(), this.list = [], this.prev = /* @__PURE__ */ new Map(), R2.extra.push(this);
    }
    /* build (or reuse) the meshes for a look; key is a string of the look */
    model(look) {
      let key = JSON.stringify(look);
      if (this.models.has(key)) return this.models.get(key);
      let G2 = this.R.G, m = buildSUV(look), w = buildSuvWheel(m.look), up = (B) => G2.mesh(LAYOUT, 36, B.vertexData(), B.indexData()), M = { key, look: m.look, body: up(m.body), glass: up(m.glass), wheelR: up(w), wheelL: up(mirrorZ(w)), used: 0 };
      if (m.look.calipers) {
        let c = buildSuvCaliper(m.look);
        M.calR = up(c), M.calL = up(mirrorZ(c));
      }
      if (this.models.set(key, M), this.models.size > 6) {
        for (let [k, v] of this.models) if (v !== M && !this.list.some((it) => it.model === v)) {
          let gl = this.R.gl;
          freeMesh(gl, v.body), freeMesh(gl, v.glass), freeMesh(gl, v.wheelR), freeMesh(gl, v.wheelL), freeMesh(gl, v.calR), freeMesh(gl, v.calL), this.models.delete(k);
          break;
        }
      }
      return M;
    }
    /* the cash cooler with its marker pole */
    propMesh() {
      if (this.pm) return this.pm;
      let B = new MeshBuilder(2048), X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1];
      B.mat(17, 3), B.box([0, 0.25, 0], X, Y, Z, [0.36, 0.2, 0.24]), B.mat(17, 1), B.box([0, 0.48, 0], X, Y, Z, [0.38, 0.045, 0.26]), B.mat(15, 1), B.box([0, 0.33, 0], X, Y, Z, [0.365, 0.03, 0.245]);
      B.mat(16, 1), B.tube([0.0, 0.53, -0.12], [0.0, 0.53, 0.12], 0.018, 6, !0), B.tube([0.45, 0.02, 0], [0.45, 2.45, 0], 0.025, 6, !0), B.mat(15, 1), B.sphere([0.45, 2.52, 0], 0.1, 10, 6), B.mat(17, 3), B.box([0.72, 2.2, 0], X, Y, Z, [0.26, 0.16, 0.012]);
      return this.pm = this.R.G.mesh(LAYOUT, 36, B.vertexData(), B.indexData());
    }
    drawProps(G2, P, shadow) {
      if (!this.props || !this.props.length) return;
      let pm = this.propMesh();
      shadow || G2.set(P, { uPaint: [0.5, 0.02, 0.02], uMetal: 0, uPaintR: 0.4, uFlake: 0, uLook: [1, 0, 0, 0], uAux: [1, 1, 0, 0], uLamps: [0, 0, 0, 0], uArch: [99, 99, 0, 0.1], uHcg: 0, uDirt: 0, uMud: 0, uDisc: 0 });
      for (let pr of this.props) {
        let M = M4.mul(T4(pr.p[0], pr.p[1], pr.p[2]), RY(pr.yaw || 0));
        shadow ? (G2.uni(P, "uModel", M), G2.draw(pm)) : this.draw(G2, P, M, M, pm);
      }
    }
    prepare(R2, S) {
      this.list = [], this.props = S.props || [];
      for (let c of S.suvs || []) {
        let model = this.model(c.look), M = qm4(c.q, c.p), key = c.id || 0, pv = this.prev.get(key), wheels = c.wheels.map((w, i) => {
          let base = M4.mul(M, M4.mul(T4(w.hp[0], w.hp[1] - w.len, w.hp[2]), RY(-w.steer))), pw = pv ? pv.wheels[i] : null, dAng = pw ? Math.max(-0.35, Math.min(0.35, w.ang - pw.ang)) : 0;
          return { M: M4.mul(base, RZ(-w.ang)), left: w.hp[2] < 0, ang: w.ang, base, prevBase: pw && !S.cut ? pw.base : base, prevAngM: pw ? M4.mul(pw.base, RZ(-(w.ang - dAng))) : null, disc: w.disc || 0 };
        });
        for (let w of wheels) w.prevAngM || (w.prevAngM = w.M);
        this.list.push({ c, M, prevM: pv && !S.cut ? pv.M : M, wheels, model }), this.prev.set(key, { M, wheels: wheels.map((w) => ({ ang: w.ang, base: w.base })) });
      }
    }
    uniforms(G2, P, it) {
      let c = it.c, p = c.paint || SUV_PAINTS.bronze, s = c.style || {}, L = it.model.look;
      G2.set(P, {
        uPaint: p.col, uMetal: p.metal, uPaintR: p.rough, uFlake: p.flake,
        uLower: s.lower || [0.026, 0.025, 0.024], uLiv: s.livCol || [0.9, 0.9, 0.88], uRim: s.rimCol || [0.6, 0.6, 0.62],
        uLook: [s.chrome ?? 1, s.tint ?? 0.3, s.livery || 0, s.clad ?? 1],
        uLamps: c.lamps || [0, 0, 0, 0], uAux: [c.bar || 0, c.pods || 0, s.sunroof ?? 1, s.number || 7],
        uArch: [SUV.axF, SUV.axR, SUV.R0 - SUV.hcg0, L.archR], uHcg: SUV.hcg0, uDirt: c.dirt || 0, uMud: c.mud || 0, uSeed: s.seed || 0.37,
        uStyle: [s.face || 0, s.tail || 0, s.acc ? 1 : 0, 0], uAcc: s.acc || [0.035, 0.035, 0.038], uCal: s.cal || s.acc || [0.62, 0.03, 0.02]
      });
    }
    draw(G2, P, M, prevM, mesh) {
      G2.uni(P, "uModel", M), G2.uni(P, "uPrevModel", prevM), G2.draw(mesh);
    }
    opaque(R2, U, texs) {
      if (!this.list.length && !(this.props && this.props.length)) return;
      let G2 = R2.G, gl = R2.gl, P = G2.use(this.P.car);
      G2.set(P, U), G2.tex(P, texs), gl.enable(gl.CULL_FACE);
      for (let it of this.list) {
        this.uniforms(G2, P, it), G2.uni(P, "uDisc", 0), this.draw(G2, P, it.M, it.prevM, it.model.body), this.draw(G2, P, it.M, it.prevM, it.model.glass);
        for (let w of it.wheels) G2.uni(P, "uDisc", w.disc), this.draw(G2, P, w.M, w.prevAngM, w.left ? it.model.wheelL : it.model.wheelR);
        if (it.model.calR) for (let w of it.wheels) this.draw(G2, P, w.base, w.prevBase, w.left ? it.model.calL : it.model.calR);
      }
      this.drawProps(G2, P, !1);
    }
    glass(R2, U, texs) {
      if (!this.list.length) return;
      let G2 = R2.G, gl = R2.gl, P = G2.use(this.P.glass);
      G2.set(P, U), G2.tex(P, texs), gl.enable(gl.CULL_FACE);
      for (let it of this.list) this.uniforms(G2, P, it), this.draw(G2, P, it.M, it.prevM, it.model.glass);
      gl.disable(gl.CULL_FACE);
    }
    shadow(R2, P, VP, kind) {
      let G2 = R2.G;
      for (let it of this.list)
        if (!(kind === "hl" && it.c.self)) {
          G2.uni(P, "uModel", it.M), G2.draw(it.model.body), G2.draw(it.model.glass);
          for (let w of it.wheels) G2.uni(P, "uModel", w.M), G2.draw(w.left ? it.model.wheelL : it.model.wheelR);
          if (it.model.calR) for (let w of it.wheels) G2.uni(P, "uModel", w.base), G2.draw(w.left ? it.model.calL : it.model.calR);
        }
      this.drawProps(G2, P, !0), G2.uni(P, "uModel", M4.ident());
    }
  };
