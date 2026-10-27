  // ===== render/ranch-materials.js =====
  /* New ground and prop materials for the ranch, slotted into Shiftlight 3's world shader:
     16 terrain (red clay, grass, rock, mud), 17 graded dirt (the strip, the trails), 18 wood,
     19 sheet metal, 20 foliage cards, 21 rock, 22 hay, 23 the start tree's bulbs, 24 creek water. */
  var LEAF = `
float leafA(vec2 uv,float sd,float kind){
  vec2 q=uv;if(kind>.5){q.x/=.25+.75*(1.0-(uv.y*.5+.5));}
  float r=length(q);
  float n=vn(uv*2.4+sd*13.1)*.6+vn(uv*5.7+sd*7.3)*.4;
  float m=step(r+(n-.5)*.95,.8);
  float holes=step(.3,vn(uv*14.+sd*3.7));
  return m*holes;
}`;
  DEPTH_VS = `
layout(location=0) in vec3 aPos;layout(location=2) in vec2 aUV;layout(location=3) in uvec4 aMat;uniform mat4 uVP;uniform mat4 uModel;flat out uvec4 vM;out vec2 vUV;
void main(){vM=aMat;vUV=aUV;gl_Position=uVP*(uModel*vec4(aPos,1.0));}`;
  DEPTH_FS = NOISE + LEAF + `flat in uvec4 vM;in vec2 vUV;out vec4 o;void main(){uint id=vM.x;if(id==7u||id==12u||id==24u)discard;if(id==20u&&leafA(vUV,float(vM.z),float(vM.y))<.5)discard;o=vec4(0);}`;
  var RANCH_MATS = LEAF + `
uniform vec4 uTree;   /* start tree: lit bulbs, a bit mask per lane */
vec3 sRGB(vec3 c){return c*c*(.3+.7*c);}
vec3 dirtCol(vec2 p){float n1=fbm(p*.09),n3=vn(p*3.1);return mix(vec3(.21,.095,.045),vec3(.36,.2,.105),n1)*(.8+.35*n3);}
vec3 grassCol(vec2 p,float fp){
  float dry=smoothstep(.3,.78,fbm(p*.045+7.));float n2=vn(p*.7),n3=vn(p*3.1),n4=vn(p*11.);
  vec3 c=mix(vec3(.06,.105,.022),vec3(.2,.17,.06),dry)*(.62+.5*n4*n3+.25*n2);
  float bl=vn(p*vec2(38.,9.))*vn(p*vec2(9.,41.));c*=1.0+(bl-.25)*.7*saturate(1.0-fp*14.);
  return c;
}
void matTerrain(inout Surf s,inout float ssr,inout vec2 g,vec2 uv,vec4 col){
  float fp=length(fwidth(uv));
  float n2=vn(uv*.7),n3=vn(uv*3.1),n4=vn(uv*11.);
  float gw=smoothstep(.3,.72,col.r+(n2-.5)*.45),rw=smoothstep(.35,.65,col.g+(n3-.5)*.3),mw=smoothstep(.25,.6,col.b+(n2-.5)*.25);
  vec3 dirt=dirtCol(uv);
  vec3 vc=voro(uv*2.6);float pebble=(1.0-smoothstep(.07,.15,vc.x))*step(.55,vc.z)*saturate(1.0-fp*5.);
  dirt=mix(dirt,vec3(.26,.22,.19)*(.7+.5*vc.z),pebble*.75);
  vec3 grass=grassCol(uv,fp);
  float strata=fbm(vec2(uv.x*.02+uv.y*.03,(s.P.y)*.9));
  vec3 rock=mix(vec3(.26,.12,.065),vec3(.33,.22,.15),strata)*(.7+.45*fbm(uv*vec2(.5,1.9)))*(.85+.3*n4);
  vec3 alb=mix(dirt,grass,gw);float rough=mix(.9,.96,gw);
  alb=mix(alb,rock,rw);rough=mix(rough,.78,rw);
  if(mw>0.0){vec3 mud=mix(vec3(.15,.1,.06),vec3(.09,.06,.035),smoothstep(.3,.8,n3))*(.8+.35*n4);float pud=smoothstep(.7,.76,fbm(uv*.28)+mw*.05)*mw;
    vec3 tread=vnd(uv*vec2(1.2,4.));float clod=smoothstep(.55,.8,vn(uv*7.3));
    alb=mix(alb,mud*(1.0+clod*.35),mw);rough=mix(rough,mix(.55,.85,clod),mw);g+=tread.yz*.05*mw;
    if(pud>0.0){alb=mix(alb,vec3(.1,.07,.04),pud*.8);rough=mix(rough,.2,pud);ssr=max(ssr,pud*.35);g*=1.0-.6*pud;}}
  vec3 d1=vnd(uv*3.);g+=d1.yz*3.*.0035*(1.0-gw*.5)*saturate(1.0-fp*4.)*(1.0-mw);
  vec3 d2=vnd(uv*.8);g+=d2.yz*.8*.03*rw;
  s.diff=alb;s.rough=rough;
  if(uWet>0.0){s.diff*=1.0-.35*uWet;s.rough=mix(s.rough,.4,uWet*.6);}
}
void matRibbon(inout Surf s,inout float ssr,inout vec2 g,vec2 uv,uvec4 m){
  float sx=uv.x,d=uv.y,ad=abs(d),fp=length(fwidth(uv));vec2 wp=s.P.xz;
  vec3 alb=dirtCol(wp);float rough=.9;float n2=vn(uv*2.5);
  if(m.y==0u){
    /* the graded strip: packed and darker where the tyres run, loose on the berms */
    float lane=min(abs(d+4.),abs(d-4.));float groove=exp(-pow(min(abs(lane-.82),abs(lane+.82))/.34,2.));
    float burn=groove*(.35+.65*smoothstep(90.,-10.,sx));
    alb=mix(alb,alb*vec3(.72,.66,.62),.35+.15*n2);alb*=1.0-.4*burn;rough-=.3*burn;
    float edge=smoothstep(7.,8.8,ad);alb=mix(alb,dirtCol(wp*1.3)*1.08,edge);rough=mix(rough,.97,edge);
    float chalk=0.0;
    chalk=max(chalk,(1.0-aaStep(.16,abs(sx)))*step(ad,8.2));
    chalk=max(chalk,(1.0-aaStep(.16,abs(sx-201.168)))*step(ad,8.2));
    chalk=max(chalk,(1.0-aaStep(.07,abs(d)))*step(.45,fract(sx/5.))*step(-6.,sx)*step(sx,250.));
    chalk=max(chalk,(1.0-aaStep(.05,abs(ad-7.9)))*step(-12.,sx)*step(sx,250.));
    chalk=max(chalk,(1.0-aaStep(.05,abs(sx+.9)))*step(1.2,ad)*step(ad,6.8));
    /* 60 ft and 330 ft marks */
    chalk=max(chalk,(1.0-aaStep(.08,abs(sx-18.288)))*step(7.,ad)*step(ad,8.2));
    chalk=max(chalk,(1.0-aaStep(.08,abs(sx-100.584)))*step(7.,ad)*step(ad,8.2));
    float wear=smoothstep(.3,.8,fbm(uv*vec2(.6,2.))+groove*.45);
    chalk*=1.0-wear*.75;
    alb=mix(alb,vec3(.7,.68,.63),chalk);rough=mix(rough,.96,chalk);
    g+=vnd(uv*4.).yz*4.*.0012*(1.0-burn);
  }else{
    /* a two-track: packed ruts, a grassy crown, grass closing in at the verges */
    float rut=exp(-pow((ad-.86)/.3,2.));float crown=1.0-smoothstep(.18,.45,ad);float verge=smoothstep(1.9,3.3,ad+(n2-.5)*.8);
    alb*=1.0-.22*rut;rough-=.12*rut;
    vec3 gr=grassCol(wp,fp);float gm=max(crown*.85*smoothstep(.25,.55,vn(uv*vec2(.7,3.))),verge);
    alb=mix(alb,gr,gm);rough=mix(rough,.96,gm);
    g+=vnd(uv*vec2(2.,4.)).yz*.006+vec2(0.,(ad-.86)*rut*.03*sign(d));
  }
  s.diff=alb;s.rough=rough;
  if(uWet>0.0){s.diff*=1.0-.35*uWet;s.rough=mix(s.rough,.4,uWet*.6);}
}
void matWood(inout Surf s,inout vec2 g,vec2 uv,uvec4 m,vec4 col){
  vec3 c=sRGB(col.rgb);
  if(m.y==1u){float f=vn(vec2(uv.x*16.,uv.y*1.3));float f2=vn(vec2(uv.x*40.,uv.y*3.));c*=.45+.7*f*(.7+.3*f2);g+=vec2(f-.5,0)*.02;s.rough=.95;}
  else{float grain=vn(vec2(uv.x*1.5,uv.y*38.))*.6+vn(vec2(uv.x*.4,uv.y*7.))*.4;c*=.62+.5*grain;s.rough=.88;
    float pl=abs(fract(uv.y/.2)-.5);c*=1.0-(1.0-smoothstep(.0,.04,.5-pl))*.4;g+=vec2(0,(grain-.5)*.01);}
  s.diff=c;
}
void matSheet(inout Surf s,inout vec2 g,vec2 uv,uvec4 m,vec4 col){
  vec3 c=sRGB(col.rgb);float rib=abs(fract(uv.x*3.6)-.5);
  float streak=smoothstep(.55,.85,vn(vec2(uv.x*2.,uv.y*.25)))*.35;
  c*=(.86+.22*rib)*(1.0-streak*.5);c=mix(c,vec3(.18,.08,.04),streak*.35);
  g+=vec2((rib-.25)*.12,0);
  float metal=m.y==1u?.15:.55;s.diff=c*(1.0-metal);s.F0=mix(vec3(.04),c,metal);s.rough=m.y==1u?.55:.42+.25*streak;
}
void matRockB(inout Surf s,inout vec2 g,vec2 uv){
  float n=fbm(uv*vec2(.8,2.6)),n2=vn(uv*7.);
  vec3 c=mix(vec3(.25,.13,.08),vec3(.3,.25,.2),n2)*(.6+.6*n)*(.85+.3*n2);
  float lich=smoothstep(.62,.7,fbm(uv*1.7+3.))*.6;c=mix(c,vec3(.2,.19,.07),lich);
  s.diff=c;s.rough=.82;g+=vnd(uv*2.3).yz*2.3*.02+vnd(uv*9.).yz*9.*.002;
}
void matFoliage(inout Surf s,vec2 uv,uvec4 m,vec4 col){
  if(leafA(uv,float(m.z),float(m.y))<.5)discard;
  float n=vn(uv*9.+float(m.z));vec3 c=sRGB(col.rgb)*(.6+.55*n);
  s.diff=c;s.rough=.7;s.trans=.55;s.spec=.4;
}
void matHay(inout Surf s,inout vec2 g,vec2 uv){
  float st=vn(vec2(uv.x*120.,uv.y*6.))*.6+vn(vec2(uv.x*30.,uv.y*20.))*.4;
  s.diff=vec3(.42,.31,.1)*(.6+.6*st);s.rough=.92;g+=vec2(st-.5,0)*.01;
}
void matTreeLamp(inout Surf s,inout vec3 em,uvec4 m){
  int k=int(m.y),lane=int(m.z);float mask=lane==0?uTree.x:uTree.y;
  float on=mod(floor(mask/exp2(float(k))),2.0);
  vec3 c=k<2?vec3(1.,.85,.55):k<5?vec3(1.,.55,.05):k==5?vec3(.15,1.,.25):vec3(1.,.06,.04);
  em=c*(on*60.+.04);s.diff=c*.1;s.rough=.15;s.F0=vec3(.05);
}
void matWater(inout Surf s,inout float ssr,inout vec2 g,vec2 uv){
  float t=uTime;vec3 a=vnd(uv*1.3+vec2(t*.3,t*.5)),b=vnd(uv*3.1-vec2(t*.4,-t*.2));
  g+=a.yz*.012+b.yz*.006;
  s.diff=vec3(.025,.03,.018);s.F0=vec3(.02);s.rough=.03;ssr=1.0;
}
`;
  WORLD_FS = WORLD_FS.replace("void main(){\n  vec3 N=normalize(vN);if(!gl_FrontFacing)N=-N;", RANCH_MATS + "void main(){\n  vec3 N=normalize(vN);if(!gl_FrontFacing&&vMat.x!=20u)N=-N;").replace("  else if(id==15u){", `  else if(id==16u)matTerrain(s,ssr,g,uv,vCol);
  else if(id==17u)matRibbon(s,ssr,g,uv,vMat);
  else if(id==18u)matWood(s,g,uv,vMat,vCol);
  else if(id==19u)matSheet(s,g,uv,vMat,vCol);
  else if(id==20u)matFoliage(s,uv,vMat,vCol);
  else if(id==21u)matRockB(s,g,uv);
  else if(id==22u)matHay(s,g,uv);
  else if(id==23u)matTreeLamp(s,em,vMat);
  else if(id==24u)matWater(s,ssr,g,uv);
  else if(id==15u){`).replace("s.ao*=vCol.a>0.0&&id!=5u?vCol.a:1.0;", "s.ao*=vCol.a>0.0&&id!=5u&&id!=19u&&id!=18u&&id!=8u?vCol.a:1.0;").replace("if(id!=7u){", "if(id!=7u&&id!=23u){");
  /* the ranch's light: afternoon, golden hour, a clear night under the strip lights, and an overcast day */
  ENVS.afternoon = { name: "Afternoon", night: 0, sunDir: N([0.55, 0.52, 0.42]), sunCol: [5.6, 5.1, 4.3], sunSize: 0.0095, ambUp: [0.3, 0.38, 0.55], ambDn: [0.14, 0.1, 0.075], skyZen: [0.16, 0.32, 0.85], skyHor: [0.78, 0.86, 1.02], skyGlow: [0, 0, 0], cloud: 0.3, stars: 0, fogCol: [0.62, 0.68, 0.8], fogDen: 9e-4, fogFall: 0.02, fogAmb: [0.16, 0.18, 0.24], wet: 0, rain: 0, puddles: 0, lightsOn: 0, lit: 0, key: 0.16, expoRange: [0.02, 3], bloom: 0.035, grade: [1.05, 1.04] };
  ENVS.dusk = Object.assign({}, ENVS.dusk, { name: "Golden Hour", skyGlow: [0.04, 0.02, 0.012], lightsOn: 0.8, lit: 0 });
  ENVS.night = Object.assign({}, ENVS.night, { name: "Friday Night", skyGlow: [0.006, 0.005, 0.006], lit: 0, wet: 0, puddles: 0, fogDen: 2.5e-3, key: 0.12 });
  ENVS.overcast = { name: "Storm Coming", night: 0.1, sunDir: N([0.3, 0.7, -0.3]), sunCol: [0.5, 0.5, 0.52], sunSize: 0.02, ambUp: [0.42, 0.45, 0.5], ambDn: [0.13, 0.11, 0.1], skyZen: [0.28, 0.3, 0.34], skyHor: [0.5, 0.52, 0.55], skyGlow: [0, 0, 0], cloud: 1, stars: 0, fogCol: [0.42, 0.44, 0.47], fogDen: 3.5e-3, fogFall: 0.025, fogAmb: [0.12, 0.13, 0.15], wet: 0.6, rain: 0.35, puddles: 0.6, lightsOn: 0, lit: 0, key: 0.16, expoRange: [0.05, 3], bloom: 0.03, grade: [1.02, 1.02] };
  var RANCH_ENVS = ["afternoon", "dusk", "night", "overcast"];
