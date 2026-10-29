/* =====================================================================================
   THE OPEN WORLD'S GENERATOR. Everything about the land is a function of where you are: the height,
   what the ground is made of, the roads, the farms and towns, the trees. Nothing is stored for the
   whole map, so the map can be as big as we like; the game asks for 128 m chunks round the car and
   lets them go behind it. This one function is the whole generator and refers to nothing outside
   itself, so the same text runs in a background worker (it is sent there as a string) and on the
   main thread (for the physics' fallback, the road queries and the maps). Same code, same numbers.
   x runs east, z south, in metres; the garage is at the origin.
   ===================================================================================== */
function WORLDGEN(SEED){
'use strict';
SEED=SEED|0;
const L=1609.344,MILES=20,HALF=MILES*L,CH=128,ROAD_END=HALF-1000,RIM0=HALF-760,RIM1=HALF-60;
const MAT={COL:0,EMIT:15,METAL:16,TERRAIN:40,ROCK:41,TRAIL:43,CONCRETE:45,WOOD:46,SHEET:47,LEAF:48,HAY:49,WATER:50,GRAVEL:53,ROAD:56};
const SURF=['grass','dirt','strip','trail','rock','mud','concrete','water','gravel','asphalt','ruts'];
const SF={};SURF.forEach((n,i)=>SF[n]=i);
const sst=(a,b,x)=>{let t=(x-a)/(b-a);t=t<0?0:t>1?1:t;return t*t*(3-2*t);};
const s2l=v=>Math.pow(v/255,2.2);
const lc=(r,g,b)=>[s2l(r),s2l(g),s2l(b)];

/* ---------- hashing and noise ---------- */
function hs(ix,iz,s){let h=Math.imul(ix|0,0x27d4eb2d)^Math.imul(iz|0,0x165667b1)^Math.imul((s+SEED)|0,0x9e3779b1);
  h=Math.imul(h^(h>>>15),0x85ebca6b);h=Math.imul(h^(h>>>13),0xc2b2ae35);h^=h>>>16;return (h>>>0)/4294967296;}
function vn(x,z,s){const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz,ux=fx*fx*(3-2*fx),uz=fz*fz*(3-2*fz);
  const a=hs(ix,iz,s),b=hs(ix+1,iz,s),c=hs(ix,iz+1,s),d=hs(ix+1,iz+1,s);return a+(b-a)*ux+(c-a)*uz+(a-b-c+d)*ux*uz;}
/* fractal noise, normalised to 0..1 */
function fbm(x,z,o,s){let t=0,a=.5,n=0;for(let i=0;i<o;i++){t+=a*vn(x,z,s+i*101);n+=a;x=x*2.03+17.3;z=z*2.03-9.1;a*=.5;}return t/n;}
function vn1(t,s){const i=Math.floor(t),f=t-i,u=f*f*(3-2*f),a=hs(i,7,s),b=hs(i+1,7,s);return a+(b-a)*u;}
/* a small seeded generator for placing things */
function rng(seed){let s=(seed>>>0)||1;return ()=>(s^=s<<13,s>>>=0,s^=s>>>17,s^=s<<5,s>>>=0,s/4294967296);}

/* ---------- the shape of the land ---------- */
/* how hilly: rolling plains with hill country here and there; hills guaranteed north of the garage, gentle round it */
function hillK(x,z){
  let k=sst(.5,.66,fbm(x/7000+7.3,z/7000-3.1,2,11));
  const dx=x-300,dz=z+4200;k+=.95*Math.exp(-(dx*dx+dz*dz)/(2*1900*1900));
  k*=1-.8*Math.exp(-(x*x+z*z)/(2*1000*1000));
  return k>1?1:k;
}
const rimAt=(x,z)=>150*sst(RIM0,RIM1,Math.max(Math.abs(x),Math.abs(z)));

/* ---------- the roads: a grid of section lines a mile apart, as functions ----------
   North-south line i runs at x = i*L + offNS(i, z); east-west line j at z = j*L + offEW(j, x). In the plains
   they run nearly straight; in the hills they wander. Route 6 (j = 0) is dead straight edge to edge, the
   expressway (i = 2) nearly so. Every other line is paved; the rest gravel or a dirt two-track, and in the
   hills some stretches are missing altogether. */
function offNS(i,z){
  if(i===2)return 45*((vn1(z/5200+3.7,301)-.5)*2);
  const k=hillK(i*L,z);
  let o=(12+240*k*k)*((vn1(z/1700+i*7.31,310+i*13)-.5)*1.4+(vn1(z/640+i*3.1,320+i*17)-.5)*.6);
  if(i===0)o*=sst(180,800,Math.abs(z));
  return o;
}
function offEW(j,x){
  if(j===0)return 0;
  const k=hillK(x,j*L);
  let o=(12+240*k*k)*((vn1(x/1700+j*5.13,330+j*13)-.5)*1.4+(vn1(x/640+j*2.7,340+j*17)-.5)*.6);
  if(j===-1||j===1)o*=sst(150,700,Math.abs(x));
  return o;
}
const zCross=(i,j)=>{const x=i*L+offNS(i,j*L);return j*L+offEW(j,x);};
const xCross=(i,j)=>{const z=j*L+offEW(j,i*L);return i*L+offNS(i,z);};
function segNS(i,z){const j0=Math.floor(z/L);if(z<zCross(i,j0))return j0-1;if(z>=zCross(i,j0+1))return j0+1;return j0;}
function segEW(j,x){const i0=Math.floor(x/L);if(x<xCross(i0,j))return i0-1;if(x>=xCross(i0+1,j))return i0+1;return i0;}
/* 0 none, 1 dirt two-track, 2 gravel, 3 blacktop, 4 Route 6, 5 the expressway */
function clsNS(i,seg){
  if(i===2)return 5;
  if(Math.abs(i*L)>ROAD_END-200)return 0;
  if(i===0)return seg<0?(seg>=-2?1:2):3;
  const k=hillK(i*L,(seg+.5)*L);
  if(hs(i,seg,401)<.04+.14*k)return 0;
  if((i&1)===0)return 3;
  return hs(i,seg,402)<.22+.35*k?1:2;
}
function clsEW(j,seg){
  if(j===0)return 4;
  if(Math.abs(j*L)>ROAD_END-200)return 0;
  const k=hillK((seg+.5)*L,j*L);
  if(hs(seg,j,403)<.04+.14*k)return 0;
  if((j&1)===0)return 3;
  return hs(seg,j,404)<.22+.35*k?1:2;
}
const clsNSz=(i,z)=>Math.abs(z)>ROAD_END?0:clsNS(i,segNS(i,z));
const clsEWx=(j,x)=>Math.abs(x)>ROAD_END?0:clsEW(j,segEW(j,x));
/* each class: half width of the running surface, a shoulder, a ditch (depth, width), and how far the land
   is graded to it */
const CL=[null,
  {hw:2.4,draw:3.3,sh:0,ditch:0,dw:2,blend:10,name:'Dirt road'},
  {hw:3.8,draw:4.8,sh:0,ditch:.45,dw:4.5,blend:16,name:'Gravel road'},
  {hw:3.9,draw:3.9,sh:1.1,ditch:.7,dw:6,blend:20,name:'Blacktop'},
  {hw:6.05,draw:6.05,sh:1.2,ditch:1,dw:8,blend:34,name:'Route 6'},
  {hw:9.7,draw:9.7,sh:1.2,ditch:1.1,dw:9,blend:44,name:'The expressway'}];
const SPUR={hw:2.6,draw:3.4,sh:0,ditch:0,dw:2,blend:9,name:'Driveway'};
/* where the expressway is (for the smoothing of the land near the big roads) */
const xExp=z=>2*L+offNS(2,z);

/* ---------- the places: the garage, farms and towns (made once per section, kept) ---------- */
const TOWN_NAMES=['Junction','Red Fork','Cedar Bluff','Pawnee Flats','Elm Spring','Dry Creek','Liberty','Osage','Prairie View','Stillwell','Kettle','Antelope','Big Cabin','Ridgely','Hollis','Carney','Wynona','Bluejacket','Ochelata','Foyil','Sperry','Bowring','Okesa','Talala','Lenapah','Delaware','Nowata','Watova','Alluwe','Chelsea','Vinita','Welch','Bushyhead','Claremore','Inola','Chouteau','Pryor','Adair','Strang','Salina','Locust Grove','Wagoner','Coweta','Haskell','Boynton','Okay'];
const PLAN=new Map();let GP=null;
function plan(key,fn){let p=PLAN.get(key);if(p===undefined){p=fn();PLAN.set(key,p);if(PLAN.size>6000)PLAN.delete(PLAN.keys().next().value);}return p;}
/* buildings are described, then meshed and given colliders by whichever chunk they fall in */
function garagePlan(){
  return {pads:[{x0:14,z0:-76,x1:64,z1:-6,surf:'concrete',bl:10}],spurs:[],
    bld:[{t:'garage',x0:20,z0:-70,x1:56,z1:-44,h:6.2,door:[30,46,5.4]},
      {t:'lamp',x:16,z:-12,h:7.5},{t:'lamp',x:62,z:-12,h:7.5},{t:'sign',x:12,z:-9}],
    trees:[[-12,-90,0],[70,-88,1],[78,-60,0],[-14,-60,2],[76,-30,0]],name:'The garage'};
}
function farmPlan(si,sj){
  return plan('f'+si+','+sj,()=>{
    const h=hs(si,sj,300);if(h>.5)return null;
    if(si>=-1&&si<=0&&sj>=-1&&sj<=0)return null;
    const R=rng(Math.floor(hs(si,sj,301)*4294967296)),west=R()<.5;
    let xc,zc,cls,xr,zr;
    if(west){const z=sj*L+L*(.25+.5*R());cls=clsNSz(si,z);if(!cls||cls===5)return null;xr=si*L+offNS(si,z);zc=z;xc=xr+CL[cls].hw+CL[cls].sh+34;}
    else{const x=si*L+L*(.25+.5*R());cls=clsEWx(sj,x);if(!cls||cls===5)return null;zr=sj*L+offEW(sj,x);xc=x;zc=zr+CL[cls].hw+CL[cls].sh+34;}
    if(Math.abs(xc)>ROAD_END||Math.abs(zc)>ROAD_END)return null;
    const cr={};creekAt(xc,zc,cr);if(cr.dc<40)return null;
    /* yard-local: u away from the road, v along it */
    const W=(u,v)=>west?[xc+u,zc+v]:[xc+v,zc+u],box=(u0,v0,u1,v1)=>{const a=W(u0,v0),b=W(u1,v1);return [Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[0],b[0]),Math.max(a[1],b[1])];};
    const yard=box(-24,-22,24,22),bld=[],trees=[],flip=R()<.5?1:-1;
    const house=box(-10,-19*flip,0,-11*flip),barn=box(6,-3,22,11),shed=box(-6,8,6,18);
    const hc=[[236,232,222],[210,200,176],[200,212,220],[236,226,200]][R()*4|0];
    bld.push({t:'box',b:house,h:3,roof:'gable',ra:west?'z':'x',rh:2.2,col:lc(...hc),rc:lc(70,62,58),mat:MAT.WOOD});
    bld.push({t:'box',b:barn,h:5.2,roof:'gable',ra:west?'x':'z',rh:3.6,col:R()<.7?lc(150,40,30):lc(170,170,166),rc:lc(120,120,118),mat:MAT.WOOD,rmat:MAT.SHEET});
    if(R()<.7)bld.push({t:'box',b:shed,h:4.2,roof:'gable',ra:west?'z':'x',rh:1.2,col:lc(176,178,176),rc:lc(160,162,160),mat:MAT.SHEET,rmat:MAT.SHEET});
    const nb=1+(R()*3|0);for(let k=0;k<nb;k++){const p=W(15-k*7.5,-15*flip);bld.push({t:'cyl',x:p[0],z:p[1],r:3.2,h:6+R()*2,cone:1.8,col:lc(190,192,194),mat:MAT.SHEET});}
    {const p=W(-3,3);bld.push({t:'lamp',x:p[0],z:p[1],h:7});}
    /* a windbreak behind the yard and a few shade trees round the house */
    for(let v=-26;v<=26;v+=5){const p=W(30+R()*2,v+R()*2);trees.push([p[0],p[1],R()<.6?3+(R()*2|0):(R()*3|0)]);}
    for(let k=0;k<3;k++){const p=W(-16+R()*10,(-6-R()*14)*-flip);trees.push([p[0],p[1],R()*3|0]);}
    /* the driveway from the road edge to the yard */
    const re=CL[cls].hw+CL[cls].sh+.05,spur=west?{x0:xr+re,z0:zc,x1:yard[0]+1,z1:zc,ax:'x'}:{x0:xc,z0:zr+re,x1:xc,z1:yard[1]+1,ax:'z'};
    return {pads:[{x0:yard[0],z0:yard[1],x1:yard[2],z1:yard[3],surf:'gravel',bl:12}],spurs:[spur],bld,trees,name:'A farm',x:xc,z:zc};
  });
}
function townPlan(i,j){
  return plan('t'+i+','+j,()=>{
    if(i===0&&j===0)return null;
    const special=i===2&&j===0;
    if(!special){if(hs(i,j,500)>.24)return null;if(Math.abs(i*L)>ROAD_END-1500||Math.abs(j*L)>ROAD_END-1500)return null;
      if(hillK(i*L,j*L)>.7)return null;}
    const xc=xCross(i,j),zc=zCross(i,j);
    const cn=clsNSz(i,zc-60),cs=clsNSz(i,zc+60),ce=clsEWx(j,xc+60),cw=clsEWx(j,xc-60);
    if(!special&&(Math.min(cn,cs)<3||Math.min(ce,cw)<3))return null;
    const hwN=CL[Math.max(cn,cs)].hw+CL[Math.max(cn,cs)].sh,hwE=CL[Math.max(ce,cw)].hw+CL[Math.max(ce,cw)].sh;
    const R=rng(Math.floor(hs(i,j,501)*4294967296)),name=special?'Junction':TOWN_NAMES[1+Math.floor(hs(i,j,502)*(TOWN_NAMES.length-1))];
    const pads=[],bld=[],trees=[],lights=[];
    const lot=(x0,z0,x1,z1,surf)=>pads.push({x0:xc+x0,z0:zc+z0,x1:xc+x1,z1:zc+z1,surf:surf||'gravel',bl:10});
    const ex=hwN+12,ez=hwE+12;
    /* NE: the grain elevator, the tallest thing for miles */
    lot(ex,-ez-60,ex+96,-ez,'gravel');
    bld.push({t:'elevator',x:xc+ex+44,z:zc-ez-30});
    /* NW: a fuel stop with a canopy and a store */
    lot(-ex-70,-ez-44,-ex,-ez,'concrete');
    bld.push({t:'canopy',b:[xc-ex-52,zc-ez-30,xc-ex-24,zc-ez-12],h:5.2});
    bld.push({t:'box',b:[xc-ex-66,zc-ez-42,xc-ex-46,zc-ez-32],h:4,roof:'flat',col:lc(196,186,160),mat:MAT.COL});
    /* SE: the water tower and a row of houses */
    lot(ex,ez,ex+40,ez+40,'gravel');bld.push({t:'tower',x:xc+ex+20,z:zc+ez+20,name});
    for(let k=0;k<3;k++){const x=xc+ex+56+k*24;lot(ex+48+k*24,ez+2,ex+66+k*24,ez+22,'gravel');
      bld.push({t:'box',b:[x-6,zc+ez+6,x+5,zc+ez+16],h:2.9,roof:'gable',ra:'x',rh:2,col:lc(...[[230,226,214],[200,214,222],[226,210,180]][k%3]),rc:lc(66,60,56),mat:MAT.WOOD});
      trees.push([x+2,zc+ez+26,R()*3|0]);}
    /* SW: a church and houses */
    lot(-ex-34,ez,-ex,ez+40,'gravel');
    bld.push({t:'box',b:[-ex-30+xc,ez+6+zc,-ex-8+xc,ez+20+zc],h:5,roof:'gable',ra:'x',rh:4,col:lc(236,234,228),rc:lc(70,64,60),mat:MAT.WOOD});
    bld.push({t:'box',b:[-ex-9+xc,ez+10+zc,-ex-4+xc,ez+16+zc],h:13,roof:'spire',rh:7,col:lc(236,234,228),rc:lc(70,64,60),mat:MAT.WOOD});
    for(let k=0;k<2;k++){const x=xc-ex-52-k*24;lot(-ex-62-k*24,ez+2,-ex-42-k*24,ez+22,'gravel');
      bld.push({t:'box',b:[x-6,zc+ez+6,x+5,zc+ez+16],h:2.9,roof:'gable',ra:'x',rh:2,col:lc(...[[214,222,206],[236,220,196]][k]),rc:lc(66,60,56),mat:MAT.WOOD});trees.push([x,zc+ez+28,R()*3|0]);}
    /* street lights along both roads through town */
    for(let s=-160;s<=160;s+=40){if(Math.abs(s)<30)continue;lights.push([xc+s,zc-hwE-3]);lights.push([xc+hwN+3,zc+s]);}
    for(const [x,z] of lights)bld.push({t:'lamp',x,z,h:8});
    return {pads,spurs:[],bld,trees,name,x:xc,z:zc,town:true};
  });
}
/* the plans whose things could reach a box */
function plansIn(x0,z0,x1,z1){
  const out=[],m=420;
  if(x1>-120&&x0<160&&z1>-160&&z0<60)out.push(GP||(GP=garagePlan()));
  for(let si=Math.floor((x0-m)/L);si<=Math.floor((x1+m)/L);si++)for(let sj=Math.floor((z0-m)/L);sj<=Math.floor((z1+m)/L);sj++){
    const f=farmPlan(si,sj);if(f)out.push(f);}
  for(let i=Math.round((x0-m)/L);i<=Math.round((x1+m)/L);i++)for(let j=Math.round((z0-m)/L);j<=Math.round((z1+m)/L);j++){
    const t=townPlan(i,j);if(t)out.push(t);}
  return out.filter(p=>{const b=planBox(p);return b[0]<x1+m&&b[2]>x0-m&&b[1]<z1+m&&b[3]>z0-m;});
}
function planBox(p){if(p._b)return p._b;let a=1e9,b=1e9,c=-1e9,d=-1e9;
  for(const q of p.pads){a=Math.min(a,q.x0);b=Math.min(b,q.z0);c=Math.max(c,q.x1);d=Math.max(d,q.z1);}
  for(const s of p.spurs){a=Math.min(a,s.x0,s.x1);b=Math.min(b,s.z0,s.z1);c=Math.max(c,s.x0,s.x1);d=Math.max(d,s.z0,s.z1);}
  for(const t of p.trees){a=Math.min(a,t[0]);b=Math.min(b,t[1]);c=Math.max(c,t[0]);d=Math.max(d,t[1]);}
  return p._b=[a-30,b-30,c+30,d+30];}

/* ---------- the creeks: winding channels along a contour of a noise field ---------- */
function creekAt(x,z,o){
  o.dep=0;o.wet=0;o.dc=1e9;
  const r2=x*x+z*z;if(r2<450*450)return o;const g=sst(450,950,Math.sqrt(r2));
  const s=1/2300,cn=fbm(x*s+11.1,z*s-6.6,2,81),e=Math.abs(cn-.5);
  if(e>.012)return o;
  const h=3,gx=(fbm((x+h)*s+11.1,z*s-6.6,2,81)-fbm((x-h)*s+11.1,z*s-6.6,2,81))/(2*h),gz=(fbm(x*s+11.1,(z+h)*s-6.6,2,81)-fbm(x*s+11.1,(z-h)*s-6.6,2,81))/(2*h);
  const dc=e/(Math.hypot(gx,gz)+1e-9);o.dc=dc;
  if(dc<12){o.dep=1.8*(1-sst(3.2,11,dc))*g;o.wet=dc<3.4&&fbm(x/5200+3,z/5200-1,1,91)>.4?1:0;}
  return o;
}

/* ---------- one point of the world ----------
   ctx holds the roads near the point (ns: [xc, inv, cls] for each north-south line at this z; ew: [zc, inv,
   cls] for each east-west line at this x), and the pads and spurs of the plans near it. o gets: h, code,
   grass, rock, mud, wet, wl (the water's level), B (the road base), rk. */
const CR={dep:0,wet:0,dc:1e9};
function core(x,z,ctx,o){
  const k=hillK(x,z),rim=rimAt(x,z);
  const big=(fbm(x/3300+1.7,z/3300+4.1,2,21)-.5)*2*(14+64*k);
  const med=(fbm(x/700+3.3,z/700-8.2,2,31)-.5)*2*(2.5+15*k);
  const det=(fbm(x/90,z/90,2,41)-.5)*2*(.7+2.2*k)+(vn(x/19,z/19,51)-.5)*(.4+.5*k);
  const kHw=Math.max(1-sst(60,700,Math.abs(z)),ctx.exp===undefined?0:1-sst(60,700,Math.abs(x-ctx.exp)));
  const B=big+.55*med*(1-kHw)+rim;
  let rk=0;if(k>.55){rk=sst(.55,.9,k)*sst(.7,.8,fbm(x/260-5.1,z/260+2.2,2,61));}
  const out=rk>0?rk*(4+7*vn(x/41,z/41,71)):0;
  creekAt(x,z,CR);
  const Tn=big+med+det+out+rim,T=Tn-CR.dep;
  /* the roads near: grade the land to them, cut their ditches, and say what's underfoot */
  let corr=0,flat=0,ditch=0,best=1e9,bCls=0,bDd=0,dirtNear=0;
  const roadC=(dd,c,cl)=>{
    const e=c.hw+c.sh;
    const f=1-sst(e+.3,e+1.8,dd);if(f>flat)flat=f;
    const cr=1-sst(e+c.dw*.7,e+c.dw+c.blend,dd);if(cr>corr)corr=cr;
    if(c.ditch>0){const di=c.ditch*sst(e+.8,e+2.3,dd)*(1-sst(e+c.dw-2.2,e+c.dw,dd));if(di>ditch)ditch=di;}
    const m=dd-c.hw;if(m<best){best=m;bCls=cl;bDd=dd;}
    if(cl===1){const dn=1-sst(3,14,dd);if(dn>dirtNear)dirtNear=dn;}
  };
  const ns=ctx.ns,ew=ctx.ew;
  for(let q=0;q<ns.length;q+=3){const cl=ns[q+2];if(!cl)continue;const dd=Math.abs(x-ns[q])*ns[q+1];if(dd<80)roadC(dd,CL[cl],cl);}
  for(let q=0;q<ew.length;q+=3){const cl=ew[q+2];if(!cl)continue;const dd=Math.abs(z-ew[q])*ew[q+1];if(dd<80)roadC(dd,CL[cl],cl);}
  for(const s of ctx.spurs){const dd=s.ax==='x'?(x<Math.min(s.x0,s.x1)?Math.hypot(x-Math.min(s.x0,s.x1),z-s.z0):x>Math.max(s.x0,s.x1)?Math.hypot(x-Math.max(s.x0,s.x1),z-s.z0):Math.abs(z-s.z0))
    :(z<Math.min(s.z0,s.z1)?Math.hypot(z-Math.min(s.z0,s.z1),x-s.x0):z>Math.max(s.z0,s.z1)?Math.hypot(z-Math.max(s.z0,s.z1),x-s.x0):Math.abs(x-s.x0));
    if(dd<40)roadC(dd,SPUR,6);}
  let pad=null;
  for(const p of ctx.pads){const dx=Math.max(p.x0-x,0,x-p.x1),dz=Math.max(p.z0-z,0,z-p.z1),dp=Math.hypot(dx,dz);if(dp>p.bl+3)continue;
    const f=1-sst(0,1.5,dp);if(f>flat)flat=f;const cr=1-sst(2,2+p.bl,dp);if(cr>corr)corr=cr;if(dp<=0)pad=p;}
  /* mud: holes along the dirt roads, and in the wet ground by the creeks; and a wallow up the dirt road from the garage */
  let mud=0;
  {const dw=Math.hypot(x+34,z+262),wal=1-sst(18,30,dw+(vn(x/6,z/6,105)-.5)*8);
    const al=Math.max(dirtNear,CR.dc<45?.75*(1-sst(25,45,CR.dc)):0);
    if(al>0||wal>0){const mn=vn(x/34+3,z/34-7,101);mud=Math.max(sst(.74,.84,mn)*al,wal);}
    if(pad)mud=0;}
  let h=T+(B-T)*corr-ditch*(1-flat)-mud*.42;
  /* the ground: grass, dirt fields, rock on the outcrops and the creek banks */
  let grass=sst(.32,.6,fbm(x/30+5,z/30,2,111)+.18);
  {const pi=Math.floor(x/(L/2)),pj=Math.floor(z/(L/2));if(hs(pi,pj,131)<.55*(1-sst(.3,.7,hillK((pi+.5)*L/2,(pj+.5)*L/2))))grass*=.15+.3*vn(x/9,z/9,141);}
  let rock=rk;if(CR.dc<9&&CR.dep>.3)rock=Math.max(rock,.35*(1-sst(3,9,CR.dc)));
  grass*=1-rock*.9;
  let code=mud>.5?SF.mud:rk>.55?SF.rock:grass>.5?SF.grass:SF.dirt;
  if(best<0)code=bCls===6||bCls===2?SF.gravel:bCls>=3?SF.asphalt:SF.trail;
  else if(bCls>=3&&bCls<6&&best<CL[bCls].sh)code=SF.gravel;
  if(best<1.2&&mud<=.5){grass*=.4;}
  if(pad){code=SF[pad.surf];grass=0;rock=0;}
  if(CR.wet&&!pad&&best>1)code=SF.water;
  if(best<0&&bCls===1&&mud>.5)code=SF.mud;
  o.h=h;o.code=code;o.grass=grass;o.rock=rock;o.mud=Math.max(mud,CR.wet?.8:0);o.wet=CR.wet&&!pad&&best>1?1:0;o.wl=h+.5*(CR.dep/1.8);o.B=B;o.rk=rk;o.k=k;
  return o;
}
/* the road base alone (where a road's surface is): the same sums as core without the detail */
function baseAt(x,z){
  const k=hillK(x,z),rim=rimAt(x,z);
  const big=(fbm(x/3300+1.7,z/3300+4.1,2,21)-.5)*2*(14+64*k);
  const med=(fbm(x/700+3.3,z/700-8.2,2,31)-.5)*2*(2.5+15*k);
  const kHw=Math.max(1-sst(60,700,Math.abs(z)),1-sst(60,700,Math.abs(x-xExp(z))));
  return big+.55*med*(1-kHw)+rim;
}

/* ---------- the roads near a box, for core ---------- */
function nsLines(x0,x1){const a=[];for(let i=Math.floor((x0-300)/L);i<=Math.floor((x1+300)/L)+1;i++)a.push(i);return a;}
function nsInfo(lines,z,out){out.length=0;
  for(const i of lines){const xc=i*L+offNS(i,z),s=(offNS(i,z+1)-offNS(i,z-1))*.5;out.push(xc,1/Math.sqrt(1+s*s),Math.abs(z)>ROAD_END?0:clsNSz(i,z));}return out;}
function ewInfo(lines,x,out){out.length=0;
  for(const j of lines){const zc=j*L+offEW(j,x),s=(offEW(j,x+1)-offEW(j,x-1))*.5;out.push(zc,1/Math.sqrt(1+s*s),Math.abs(x)>ROAD_END?0:clsEWx(j,x));}return out;}
/* a context for one box: its plans' pads and spurs */
function boxCtx(x0,z0,x1,z1){
  const P=plansIn(x0,z0,x1,z1),pads=[],spurs=[];
  for(const p of P){for(const q of p.pads)if(q.x0<x1+20&&q.x1>x0-20&&q.z0<z1+20&&q.z1>z0-20)pads.push(q);
    for(const s of p.spurs)if(Math.min(s.x0,s.x1)<x1+40&&Math.max(s.x0,s.x1)>x0-40&&Math.min(s.z0,s.z1)<z1+40&&Math.max(s.z0,s.z1)>z0-40)spurs.push(s);}
  return {plans:P,pads,spurs,ns:[],ew:[],exp:undefined};
}
/* one point on its own (the physics' fallback, placing things): slower, the same answer */
const PCTX=new Map();
function pointCtx(x,z){
  const key=Math.floor(x/CH)*100003+Math.floor(z/CH);let c=PCTX.get(key);
  if(!c){const x0=Math.floor(x/CH)*CH,z0=Math.floor(z/CH)*CH;c=boxCtx(x0,z0,x0+CH,z0+CH);c.nsL=nsLines(x0,x0+CH);c.ewL=nsLines(z0,z0+CH);PCTX.set(key,c);if(PCTX.size>400)PCTX.delete(PCTX.keys().next().value);}
  nsInfo(c.nsL,z,c.ns);ewInfo(c.ewL,x,c.ew);c.exp=xExp(z);return c;
}
const PO={};
function sample(x,z,o){return core(x,z,pointCtx(x,z),o||PO);}

/* ---------- meshes: positions are relative to the chunk's corner ---------- */
class MB{
  constructor(ox,oz){this.P=[];this.N=[];this.C=[];this.M=[];this.I=[];this.n=0;this.ox=ox;this.oz=oz;}
  v(x,y,z,nx,ny,nz,c0,c1,c2,c3,m){this.P.push(x-this.ox,y,z-this.oz);this.N.push(nx,ny,nz);this.C.push(c0,c1,c2,c3);this.M.push(m);return this.n++;}
  quad(a,b,c,d,col,m,em){/* four corners [x,y,z], a flat face */
    const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],wx=d[0]-a[0],wy=d[1]-a[1],wz=d[2]-a[2];let nx=uy*wz-uz*wy,ny=uz*wx-ux*wz,nz=ux*wy-uy*wx;const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;
    const e=em||0,i0=this.v(a[0],a[1],a[2],nx,ny,nz,col[0],col[1],col[2],e,m),i1=this.v(b[0],b[1],b[2],nx,ny,nz,col[0],col[1],col[2],e,m),i2=this.v(c[0],c[1],c[2],nx,ny,nz,col[0],col[1],col[2],e,m),i3=this.v(d[0],d[1],d[2],nx,ny,nz,col[0],col[1],col[2],e,m);
    this.I.push(i0,i1,i2,i0,i2,i3);}
  tri(a,b,c,col,m,em){const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],wx=c[0]-a[0],wy=c[1]-a[1],wz=c[2]-a[2];let nx=uy*wz-uz*wy,ny=uz*wx-ux*wz,nz=ux*wy-uy*wx;const l=Math.hypot(nx,ny,nz)||1;
    const e=em||0;const i0=this.v(a[0],a[1],a[2],nx/l,ny/l,nz/l,col[0],col[1],col[2],e,m),i1=this.v(b[0],b[1],b[2],nx/l,ny/l,nz/l,col[0],col[1],col[2],e,m),i2=this.v(c[0],c[1],c[2],nx/l,ny/l,nz/l,col[0],col[1],col[2],e,m);this.I.push(i0,i1,i2);}
  box(x0,y0,z0,x1,y1,z1,col,m,em,skip){const s=skip||'';
    if(!s.includes('t'))this.quad([x0,y1,z0],[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],col,m,em);
    if(!s.includes('b'))this.quad([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],col,m,em);
    if(!s.includes('x'))this.quad([x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1],col,m,em);
    if(!s.includes('X'))this.quad([x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],col,m,em);
    if(!s.includes('z'))this.quad([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],col,m,em);
    if(!s.includes('Z'))this.quad([x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[x1,y0,z0],col,m,em);}
  /* an upright cylinder, smooth sides; a cone on top if asked */
  cyl(cx,cz,y0,y1,r,seg,col,m,cone,em){const e=em||0,ring=[];
    for(let i=0;i<=seg;i++){const a=i/seg*Math.PI*2,c=Math.cos(a),s=Math.sin(a);ring.push([this.v(cx+c*r,y0,cz+s*r,c,0,s,col[0],col[1],col[2],e,m),this.v(cx+c*r,y1,cz+s*r,c,0,s,col[0],col[1],col[2],e,m)]);}
    for(let i=0;i<seg;i++)this.I.push(ring[i][0],ring[i][1],ring[i+1][1],ring[i][0],ring[i+1][1],ring[i+1][0]);
    if(cone>0){const ap=[cx,y1+cone,cz];for(let i=0;i<seg;i++){const a=i/seg*Math.PI*2,b=(i+1)/seg*Math.PI*2;this.tri([cx+Math.cos(a)*r,y1,cz+Math.sin(a)*r],ap,[cx+Math.cos(b)*r,y1,cz+Math.sin(b)*r],col,m,e);}}
    else if(cone===0){const ci=this.v(cx,y1,cz,0,1,0,col[0],col[1],col[2],e,m);for(let i=0;i<seg;i++){const a=i/seg*Math.PI*2,b=(i+1)/seg*Math.PI*2;
      const p=this.v(cx+Math.cos(a)*r,y1,cz+Math.sin(a)*r,0,1,0,col[0],col[1],col[2],e,m),q=this.v(cx+Math.cos(b)*r,y1,cz+Math.sin(b)*r,0,1,0,col[0],col[1],col[2],e,m);this.I.push(ci,q,p);}}}
  /* a straight piece from a to b, square in section (posts, legs, wires) */
  bar(a,b,w,col,m,em){const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],l=Math.hypot(dx,dy,dz)||1,t=[dx/l,dy/l,dz/l],ref=Math.abs(t[1])<.9?[0,1,0]:[1,0,0];
    let u=[t[1]*ref[2]-t[2]*ref[1],t[2]*ref[0]-t[0]*ref[2],t[0]*ref[1]-t[1]*ref[0]];const ul=Math.hypot(...u);u=[u[0]/ul*w,u[1]/ul*w,u[2]/ul*w];
    const v=[(t[1]*u[2]-t[2]*u[1]),(t[2]*u[0]-t[0]*u[2]),(t[0]*u[1]-t[1]*u[0])];
    const P=(p,su,sv)=>[p[0]+u[0]*su+v[0]*sv,p[1]+u[1]*su+v[1]*sv,p[2]+u[2]*su+v[2]*sv];
    for(const [s0,t0,s1,t1] of [[1,1,-1,1],[-1,1,-1,-1],[-1,-1,1,-1],[1,-1,1,1]])this.quad(P(a,s0,t0),P(a,s1,t1),P(b,s1,t1),P(b,s0,t0),col,m,em);}
  out(){return {pos:new Float32Array(this.P),nrm:new Float32Array(this.N),col:new Float32Array(this.C),mat:new Float32Array(this.M),idx:this.n<65536?new Uint16Array(this.I):new Uint32Array(this.I),tris:this.I.length/3};}
}

/* ---------- the map's colours (as the HUD packs them: RGBA bytes) ---------- */
const MAPC=[[54,84,30],[120,70,38],[176,140,100],[150,104,62],[112,96,84],[46,32,18],[150,148,144],[60,120,190],[178,168,146],[46,46,52],[84,58,32]];
const pk=(r,g,b)=>((235<<24)|((Math.max(0,Math.min(255,b))|0)<<16)|((Math.max(0,Math.min(255,g))|0)<<8)|(Math.max(0,Math.min(255,r))|0))>>>0;

/* ---------- one chunk's ground at one level of detail: every 2, 4 or 8 m ---------- */
function genGround(cx,cz,lod){
  const st=2<<lod,n=CH/st+1,nb=n+2,x0=cx*CH,z0=cz*CH,ctx=boxCtx(x0-st,z0-st,x0+CH+st,z0+CH+st);
  const nsL=nsLines(x0,x0+CH),ewL=nsLines(z0,z0+CH),ewI=[];
  const Hb=new Float64Array(nb*nb),code=new Uint8Array(n*n),Wt=new Float32Array(n*n*4),wet=new Uint8Array(n*n),wl=new Float32Array(n*n),o={};
  /* the east-west roads per column, the north-south per row */
  for(let i=0;i<nb;i++)ewI.push(ewInfo(ewL,x0+(i-1)*st,[]));
  for(let j=0;j<nb;j++){const z=z0+(j-1)*st;nsInfo(nsL,z,ctx.ns);ctx.exp=xExp(z);
    for(let i=0;i<nb;i++){const x=x0+(i-1)*st;ctx.ew=ewI[i];core(x,z,ctx,o);Hb[j*nb+i]=o.h;
      if(i>0&&j>0&&i<=n&&j<=n){const k=(j-1)*n+(i-1);code[k]=o.code;Wt[k*4]=o.grass;Wt[k*4+1]=o.rock;Wt[k*4+2]=o.mud;wet[k]=o.wet;wl[k]=o.wl;}}}
  /* normals, slope rock and hollows */
  const nrm=new Float32Array(n*n*3);
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const b=(j+1)*nb+(i+1),k=j*n+i,hx=Hb[b-1]-Hb[b+1],hz=Hb[b-nb]-Hb[b+nb],ny=2*st,l=Math.hypot(hx,ny,hz);
    nrm[k*3]=hx/l;nrm[k*3+1]=ny/l;nrm[k*3+2]=hz/l;
    const slope=Math.sqrt(Math.max(0,1-(ny/l)*(ny/l)))/Math.max(ny/l,.05),rs=sst(.6,1.05,slope);if(rs>Wt[k*4+1]){Wt[k*4+1]=rs;Wt[k*4]*=1-rs*.8;}
    const curv=(Hb[b-1]+Hb[b+1]+Hb[b-nb]+Hb[b+nb])/4-Hb[b];Wt[k*4+3]=Math.max(.55,Math.min(1,1-curv*.35*2/st));}
  /* the mesh, with skirts hanging from its edges so a neighbour of other detail never shows a crack */
  const drop=[1.5,2.5,5][lod],nv=n*n+4*n*2,P=new Float32Array(nv*3),N=new Float32Array(nv*3),C=new Float32Array(nv*4),M=new Float32Array(nv).fill(MAT.TERRAIN),I=[];
  let v=0;const put=(i,j,dy)=>{const k=j*n+i;P[v*3]=i*st;P[v*3+1]=Hb[(j+1)*nb+i+1]-dy;P[v*3+2]=j*st;N[v*3]=nrm[k*3];N[v*3+1]=nrm[k*3+1];N[v*3+2]=nrm[k*3+2];
    C[v*4]=Wt[k*4];C[v*4+1]=Wt[k*4+1];C[v*4+2]=Wt[k*4+2];C[v*4+3]=Wt[k*4+3];return v++;};
  for(let j=0;j<n;j++)for(let i=0;i<n;i++)put(i,j,0);
  for(let j=0;j<n-1;j++)for(let i=0;i<n-1;i++){const p=j*n+i,q=p+1,r=p+n,s=r+1;I.push(p,s,q,p,r,s);}
  const edge=(list,flip)=>{for(let e=0;e<list.length-1;e++){const [ia,ja]=list[e],[ib,jb]=list[e+1],a=ja*n+ia,b=jb*n+ib,c=put(ia,ja,drop),d=put(ib,jb,drop);if(flip)I.push(a,c,b,b,c,d);else I.push(a,b,c,b,d,c);}};
  const top=[],bot=[],lef=[],rig=[];for(let a=0;a<n;a++){top.push([a,0]);bot.push([a,n-1]);lef.push([0,a]);rig.push([n-1,a]);}
  edge(top,false);edge(bot,true);edge(lef,true);edge(rig,false);
  const ground={pos:P.subarray(0,v*3),nrm:N.subarray(0,v*3),col:C.subarray(0,v*4),mat:M.subarray(0,v),idx:v<65536?new Uint16Array(I):new Uint32Array(I),tris:I.length/3};
  /* water lying in the creek beds */
  let water=null;{const wb=new MB(x0,z0);
    for(let j=0;j<n-1;j++)for(let i=0;i<n-1;i++){const k=j*n+i,ks=[k,k+1,k+n+1,k+n];if(!(wet[ks[0]]|wet[ks[1]]|wet[ks[2]]|wet[ks[3]]))continue;
      let lv=-1e9;for(const q of ks)if(wet[q])lv=Math.max(lv,wl[q]);
      const pts=ks.map(q=>{const ii=q%n,jj=(q/n)|0;return [x0+ii*st,wet[q]?wl[q]:Math.max(lv,wl[q]),z0+jj*st];});
      wb.quad(pts[0],pts[3],pts[2],pts[1],[.05,.06,.05],MAT.WATER);}
    if(wb.n)water=wb.out();}
  /* the map tile: 4 m a pixel from the fine grids, 8 m from the coarse */
  const tn=lod<2?32:16,tile=new Uint32Array(tn*tn),ts=CH/tn;
  for(let j=0;j<tn;j++)for(let i=0;i<tn;i++){const gi=Math.min(n-1,Math.round((i+.5)*ts/st)),gj=Math.min(n-1,Math.round((j+.5)*ts/st)),k=gj*n+gi,c=MAPC[code[k]]||MAPC[1],
    sh=.62+.5*Math.max(0,Math.min(1,nrm[k*3]*.6-nrm[k*3+2]*.5+nrm[k*3+1]*.5)),hh=Math.max(.75,Math.min(1.25,.8+Hb[(gj+1)*nb+gi+1]/160));tile[j*tn+i]=pk(c[0]*sh*hh,c[1]*sh*hh,c[2]*sh*hh);}
  const res={cx,cz,lod,ground,water,tile,tn,ymin:1e9,ymax:-1e9};
  for(let k=0;k<n*n;k++){const h=Hb[((k/n|0)+1)*nb+k%n+1];if(h<res.ymin)res.ymin=h;if(h>res.ymax)res.ymax=h;}
  if(lod===0){const H=new Float32Array(n*n);for(let j=0;j<n;j++)for(let i=0;i<n;i++)H[j*n+i]=Hb[(j+1)*nb+i+1];res.H=H;res.SC=code;}
  return res;
}

/* ---------- one chunk's roads, buildings, poles, trees, colliders and lights ---------- */
const POLE_COL=lc(96,76,58),WIRE_COL=lc(30,30,32);
function genStatic(cx,cz){
  const x0=cx*CH,z0=cz*CH,x1=x0+CH,z1=z0+CH,ctx=boxCtx(x0,z0,x1,z1),RB=new MB(x0,z0),PB=new MB(x0,z0),trees=[],cols=[],lights=[],labels=[];
  const inC=(x,z)=>x>=x0&&x<x1&&z>=z0&&z<z1,R=rng(Math.floor(hs(cx,cz,600)*4294967296)+1);
  const nsL=nsLines(x0,x1),ewL=nsLines(z0,z1);
  /* --- the road ribbons: 4 m segments, each drawn by the chunk its middle falls in --- */
  const ST=4,lift=.035;
  const cols3=(c,cl)=>cl===5?[-c.draw,-c.draw/2,0,c.draw/2,c.draw]:[-c.draw,0,c.draw];
  const ribbon=(ax,bx,az,bz,sA,sB,c,cl,nA,nB)=>{
    /* a,b: centreline ends; n*: the unit across (pointing +x for north-south lines, +z for east-west) */
    const D=cols3(c,cl),mat=cl>=3?MAT.ROAD:cl===1?MAT.TRAIL:MAT.GRAVEL,row=(px,pz,nx,nz,s)=>D.map(d=>{const x=px+nx*d,z=pz+nz*d,y=baseAt(x,z)+lift;
      return cl>=3?RB.v(x,y,z,0,1,0,s%1200,d,cl,c.hw,mat):cl===1?RB.v(x,y,z,0,1,0,s%1200,d,0,1,mat):RB.v(x,y,z,0,1,0,s%1200,d,0,c.hw,mat);});
    const ra=row(ax,az,nA[0],nA[1],sA),rb=row(bx,bz,nB[0],nB[1],sB);
    for(let k=0;k<D.length-1;k++)RB.I.push(ra[k],rb[k],rb[k+1],ra[k],rb[k+1],ra[k+1]);
    /* gravel shoulders beside the blacktop */
    if(cl>=3)for(const sg of [-1,1]){const e0=c.hw*sg,e1=(c.hw+c.sh)*sg,q=(px,pz,nx,nz,d)=>{const x=px+nx*d,z=pz+nz*d;return RB.v(x,baseAt(x,z)+lift*.6,z,0,1,0,0,0,1,c.hw,MAT.GRAVEL);};
      const a0=q(ax,az,nA[0],nA[1],e0),a1=q(ax,az,nA[0],nA[1],e1),b0=q(bx,bz,nB[0],nB[1],e0),b1=q(bx,bz,nB[0],nB[1],e1);RB.I.push(a0,b0,b1,a0,b1,a1);}
  };
  /* clip a segment where it meets a road of its class or better running across it */
  const clipAcross=(seg,crossD,hwX)=>{const [dA,dB]=crossD;const inA=Math.abs(dA)<hwX,inB=Math.abs(dB)<hwX;if(inA&&inB)return null;
    if(!inA&&!inB)return [0,1];const e=(inA?Math.sign(dB):Math.sign(dA))*hwX,t=(e-dA)/(dB-dA);return inA?[t,1]:[0,t];};
  for(const i of nsL){
    if(Math.abs(i*L+offNS(i,z0+CH/2)-(x0+CH/2))>CH/2+300)continue;
    for(let z=Math.floor(z0/ST)*ST-ST;z<z1;z+=ST){
      const zm=z+ST/2,xm=i*L+offNS(i,zm);if(!inC(xm,zm))continue;if(Math.abs(zm)>ROAD_END)continue;
      const cl=clsNSz(i,zm);if(!cl)continue;const c=CL[cl];
      let xa=i*L+offNS(i,z),xb=i*L+offNS(i,z+ST),zA=z,zB=z+ST;
      /* the east-west lines it crosses here */
      let tr=[0,1];
      for(const j of ewL){const zc=j*L+offEW(j,xm);if(Math.abs(zm-zc)>40)continue;const cx2=clsEWx(j,xm);if(!cx2||cx2<cl)continue;
        const s=(offEW(j,xm+1)-offEW(j,xm-1))*.5,inv=1/Math.sqrt(1+s*s),dA=(zA-(j*L+offEW(j,xa)))*inv,dB=(zB-(j*L+offEW(j,xb)))*inv,cl2=CL[cx2];
        const t=clipAcross(null,[dA,dB],cl2.hw+cl2.sh+.05);if(!t){tr=null;break;}tr=[Math.max(tr[0],t[0]),Math.min(tr[1],t[1])];}
      if(!tr||tr[1]-tr[0]<1e-3)continue;
      if(cl===1){sample(xm,zm,CRo);if(CRo.mud>.3)continue;}
      const XA=xa+(xb-xa)*tr[0],XB=xa+(xb-xa)*tr[1],ZA=zA+ST*tr[0],ZB=zA+ST*tr[1];
      const sa=(offNS(i,ZA+.5)-offNS(i,ZA-.5)),sb=(offNS(i,ZB+.5)-offNS(i,ZB-.5)),na=[1/Math.sqrt(1+sa*sa),-sa/Math.sqrt(1+sa*sa)],nb=[1/Math.sqrt(1+sb*sb),-sb/Math.sqrt(1+sb*sb)];
      ribbon(XA,XB,ZA,ZB,ZA+HALF,ZB+HALF,c,cl,na,nb);
    }
  }
  for(const j of ewL){
    if(Math.abs(j*L+offEW(j,x0+CH/2)-(z0+CH/2))>CH/2+300)continue;
    for(let x=Math.floor(x0/ST)*ST-ST;x<x1;x+=ST){
      const xm=x+ST/2,zm=j*L+offEW(j,xm);if(!inC(xm,zm))continue;if(Math.abs(xm)>ROAD_END)continue;
      const cl=clsEWx(j,xm);if(!cl)continue;const c=CL[cl];
      let za=j*L+offEW(j,x),zb=j*L+offEW(j,x+ST),xA=x,xB=x+ST,tr=[0,1];
      for(const i of nsL){const xc=i*L+offNS(i,zm);if(Math.abs(xm-xc)>40)continue;const cx2=clsNSz(i,zm);if(!cx2||cx2<=cl)continue;
        const s=(offNS(i,zm+1)-offNS(i,zm-1))*.5,inv=1/Math.sqrt(1+s*s),dA=(xA-(i*L+offNS(i,za)))*inv,dB=(xB-(i*L+offNS(i,zb)))*inv,cl2=CL[cx2];
        const t=clipAcross(null,[dA,dB],cl2.hw+cl2.sh+.05);if(!t){tr=null;break;}tr=[Math.max(tr[0],t[0]),Math.min(tr[1],t[1])];}
      if(!tr||tr[1]-tr[0]<1e-3)continue;
      if(cl===1){sample(xm,zm,CRo);if(CRo.mud>.3)continue;}
      const XA=xA+ST*tr[0],XB=xA+ST*tr[1],ZA=za+(zb-za)*tr[0],ZB=za+(zb-za)*tr[1];
      const sa=(offEW(j,XA+.5)-offEW(j,XA-.5)),sb=(offEW(j,XB+.5)-offEW(j,XB-.5)),na=[-sa/Math.sqrt(1+sa*sa),1/Math.sqrt(1+sa*sa)],nb=[-sb/Math.sqrt(1+sb*sb),1/Math.sqrt(1+sb*sb)];
      ribbon(XA,XB,ZA,ZB,XA+HALF,XB+HALF,c,cl,na,nb);
    }
  }
  /* the driveways */
  for(const s of ctx.spurs){const ax=s.ax==='x',a0=ax?Math.min(s.x0,s.x1):Math.min(s.z0,s.z1),a1=ax?Math.max(s.x0,s.x1):Math.max(s.z0,s.z1),len=a1-a0,nseg=Math.max(1,Math.ceil(len/ST));
    for(let k=0;k<nseg;k++){const p=a0+len*k/nseg,q=a0+len*(k+1)/nseg,m=(p+q)/2,xm=ax?m:s.x0,zm=ax?s.z0:m;if(!inC(xm,zm))continue;
      if(ax)ribbon(p,q,s.z0,s.z0,p,q,SPUR,2,[0,1],[0,1]);else ribbon(s.x0,s.x0,p,q,p,q,SPUR,2,[1,0],[1,0]);}}
  /* --- the pads: concrete or gravel laid over their ground --- */
  for(const p of ctx.pads){const a=Math.max(p.x0,x0),b=Math.max(p.z0,z0),c=Math.min(p.x1,x1),d=Math.min(p.z1,z1);if(a>=c||b>=d)continue;
    const nx=Math.max(1,Math.ceil((c-a)/4)),nz=Math.max(1,Math.ceil((d-b)/4)),idx=[],mat=p.surf==='concrete'?MAT.CONCRETE:MAT.GRAVEL;
    for(let j=0;j<=nz;j++){const row=[];for(let i=0;i<=nx;i++){const x=a+(c-a)*i/nx,z=b+(d-b)*j/nz;row.push(RB.v(x,baseAt(x,z)+.03,z,0,1,0,.4,.4,1,0,mat));}idx.push(row);}
    for(let j=0;j<nz;j++)for(let i=0;i<nx;i++)RB.I.push(idx[j][i],idx[j+1][i],idx[j+1][i+1],idx[j][i],idx[j+1][i+1],idx[j][i+1]);}
  /* --- buildings, from the plans: meshed by the chunk their middle is in; colliders wherever they reach --- */
  const colBox=(a,b,c,d,top)=>{if(c>x0-1&&a<x1+1&&d>z0-1&&b<z1+1)cols.push({x0:a,z0:b,x1:c,z1:d,top});};
  const colCirc=(x,z,r,top)=>{if(x+r>x0-1&&x-r<x1+1&&z+r>z0-1&&z-r<z1+1)cols.push({t:'c',x,z,r,top});};
  for(const P of ctx.plans){
    for(const b of P.bld){
      const bx=b.b?(b.b[0]+b.b[2])/2:b.x0!==undefined?(b.x0+b.x1)/2:b.x,bz=b.b?(b.b[1]+b.b[3])/2:b.z0!==undefined?(b.z0+b.z1)/2:b.z,own=inC(bx,bz);
      building(b,own?PB:null,colBox,colCirc,lights,own);
    }
    if(P.name&&P.x!==undefined&&inC(P.x,P.z)&&P.town)labels.push({name:P.name,x:P.x,z:P.z});
    for(const t of P.trees){const [x,z,v]=t;if(!inC(x,z)||x<x0+.9||x>x1-.9||z<z0+.9||z>z1-.9)continue;addTree(x,z,v,.95+hs(Math.round(x),Math.round(z),610)*.35);}
  }
  /* --- power lines along the paved roads (and some gravel) --- */
  const poleLine=(i,j,ns)=>{
    /* one side, set by the line; poles every sp metres along it */
    const seed=ns?i*7+1:j*13+5,side=hs(seed,ns?1:2,620)<.5?-1:1,sp=ns&&i===2||!ns&&j===0?60:52;
    const posAt=k=>{const s=k*sp;if(Math.abs(s)>ROAD_END-40)return null;
      if(ns){const cl=clsNSz(i,s);if(cl<2||(cl===2&&hs(i,segNS(i,s),621)>.4))return null;const c=CL[cl],d=(c.hw+c.sh+c.dw+2)*(i===2?1:side),x=i*L+offNS(i,s)+d;return [x,s,cl];}
      const cl=clsEWx(j,s);if(cl<2||(cl===2&&hs(segEW(j,s),j,621)>.4))return null;const c=CL[cl],d=(c.hw+c.sh+c.dw+2)*(j===0?-1:side),z=j*L+offEW(j,s)+d;return [s,z,cl];};
    const ok=p=>{if(!p)return false;const [x,z]=p;
      /* not in a crossing road, a pad or water */
      for(let q=-1;q<=1;q++){const ii=Math.round(x/L)+q;if(ns&&ii===i)continue;const xc=ii*L+offNS(ii,z),cl=clsNSz(ii,z);if(cl&&Math.abs(x-xc)<CL[cl].hw+CL[cl].sh+CL[cl].dw+3)return false;}
      for(let q=-1;q<=1;q++){const jj=Math.round(z/L)+q;if(!ns&&jj===j)continue;const zc=jj*L+offEW(jj,x),cl=clsEWx(jj,x);if(cl&&Math.abs(z-zc)<CL[cl].hw+CL[cl].sh+CL[cl].dw+3)return false;}
      return true;};
    const a0=ns?z0:x0,k0=Math.floor((a0-sp)/sp),k1=Math.ceil((a0+CH+sp)/sp);
    for(let k=k0;k<=k1;k++){const p=posAt(k);if(!ok(p))continue;let [x,z]=p;if(!inC(x,z))continue;
      if(x<x0+.6||x>x1-.6||z<z0+.6||z>z1-.6)continue;
      const y=sample(x,z,CRo).h,h=p[2]>=4?10.5:9;if(CRo.code===SF.water)continue;
      PB.bar([x,y-.5,z],[x,y+h,z],.13,POLE_COL,MAT.WOOD);
      const ax=ns?[0,1]:[1,0];PB.bar([x-ax[0]*1.3,y+h-.5,z-ax[1]*1.3],[x+ax[0]*1.3,y+h-.5,z+ax[1]*1.3],.07,POLE_COL,MAT.WOOD);
      colCirc(x,z,.22,y+h);
      /* the wires to the next pole along */
      let q=posAt(k+1);if(!ok(q))q=null;
      if(q){const yq=sample(q[0],q[1],CRo).h;for(const o of [-1.1,0,1.1]){const ox=ax[0]*o,oz=ax[1]*o,A=[x+ox,y+h-.35,z+oz],Bp=[q[0]+ox,yq+h-.35,q[1]+oz];let prev=A;
        for(let t=1;t<=4;t++){const u=t/4,P=[A[0]+(Bp[0]-A[0])*u,A[1]+(Bp[1]-A[1])*u-1.1*4*u*(1-u),A[2]+(Bp[2]-A[2])*u];PB.bar(prev,P,.018,WIRE_COL,MAT.COL);prev=P;}}}
    }
  };
  for(const i of nsL)poleLine(i,0,true);
  for(const j of ewL)poleLine(0,j,false);
  /* --- the barricades where the roads end at the edge of the world --- */
  for(const i of nsL)for(const sg of [-1,1]){const z=sg*ROAD_END,x=i*L+offNS(i,z),cl=clsNSz(i,z-sg*10);if(!cl||!inC(x,z))continue;const c=CL[cl],y=baseAt(x,z);
    PB.box(x-c.hw,y+.6,z-.15,x+c.hw,y+1.4,z+.15,lc(240,120,20),MAT.COL,.6);for(const d of [-c.hw+.4,c.hw-.4])PB.bar([x+d,y-.2,z],[x+d,y+1.5,z],.08,lc(200,200,200),MAT.COL);colBox(x-c.hw-1,z-.3,x+c.hw+1,z+.3,y+1.4);}
  for(const j of ewL)for(const sg of [-1,1]){const x=sg*ROAD_END,z=j*L+offEW(j,x),cl=clsEWx(j,x-sg*10);if(!cl||!inC(x,z))continue;const c=CL[cl],y=baseAt(x,z);
    PB.box(x-.15,y+.6,z-c.hw,x+.15,y+1.4,z+c.hw,lc(240,120,20),MAT.COL,.6);for(const d of [-c.hw+.4,c.hw-.4])PB.bar([x,y-.2,z+d],[x,y+1.5,z+d],.08,lc(200,200,200),MAT.COL);colBox(x-.3,z-c.hw-1,x+.3,z+c.hw+1,y+1.4);}
  /* --- the trees: woods in the hills, cottonwoods by the creeks, rows along some roads, the odd one in a pasture --- */
  function addTree(x,z,v,sc){const y=sample(x,z,CRo).h;if(CRo.code===SF.water||CRo.code===SF.asphalt)return;
    const pine=v>=3,t=pine?[52,74,46]:hs(Math.round(x*3),Math.round(z*3),630)<.5?[70,96,44]:[88,104,50],j1=hs(Math.round(x*7),Math.round(z*7),631),j2=hs(Math.round(x*5),Math.round(z*5),632);
    trees.push(x,y,z,j1*6.283,sc*(.9+j2*.2),sc*(.92+j1*.2),sc*(.9+j2*.2),v,s2l(t[0]+(j1-.5)*18),s2l(t[1]+(j2-.5)*18),s2l(t[2]+(j1-.5)*12),0);
    cols.push({t:'c',x,z,r:.35*sc+.15,top:y+((pine?1.6:2.4)+(pine?2.2:3.4))*sc});}
  {const G=6.2,n=Math.floor(CH/G),cr={};
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){
      const r1=R(),r2=R(),r3=R(),r4=R();
      const x=Math.min(x1-.9,Math.max(x0+.9,x0+(i+.15+r1*.7)*G)),z=Math.min(z1-.9,Math.max(z0+.9,z0+(j+.15+r2*.7)*G));
      const k=hillK(x,z),wn=fbm(x/900+2.2,z/900-4.4,2,121),woods=sst(.56-.2*k,.66-.2*k,wn)*.55;
      creekAt(x,z,cr);let p=Math.max(woods,cr.dc>5&&cr.dc<24?.3:0,.012);
      if(p<.02&&r3>.02)continue;if(r3>p)continue;
      /* not on a road, a pad, or in the water */
      let near=false;
      for(const ii of nsL){const xc=ii*L+offNS(ii,z),cl=clsNSz(ii,z);if(cl&&Math.abs(x-xc)<CL[cl].hw+CL[cl].sh+CL[cl].dw+2.5){near=true;break;}}
      if(!near)for(const jj of ewL){const zc=jj*L+offEW(jj,x),cl=clsEWx(jj,x);if(cl&&Math.abs(z-zc)<CL[cl].hw+CL[cl].sh+CL[cl].dw+2.5){near=true;break;}}
      if(!near)for(const q of ctx.pads)if(x>q.x0-4&&x<q.x1+4&&z>q.z0-4&&z<q.z1+4){near=true;break;}
      if(!near)for(const s of ctx.spurs){const ax=s.ax==='x';if(ax?(Math.abs(z-s.z0)<5&&x>Math.min(s.x0,s.x1)-3&&x<Math.max(s.x0,s.x1)+3):(Math.abs(x-s.x0)<5&&z>Math.min(s.z0,s.z1)-3&&z<Math.max(s.z0,s.z1)+3)){near=true;break;}}
      if(near||cr.dc<4.5)continue;
      const pine=(k>.45&&r4<.65)||r4<.12;addTree(x,z,pine?3+(r4*10%2|0):(r4*30%3|0),.85+R()*.5);}}
  /* (the lamps were added by building()) */
  return {cx,cz,roads:RB.n?RB.out():null,props:PB.n?PB.out():null,trees:new Float32Array(trees),cols,lights,labels};
}
const CRo={};
/* one described building into the props mesh (when this chunk owns it), its colliders, its lights */
function building(b,B,colBox,colCirc,lights,own){
  if(b.t==='box'){const [a,c,d,e]=b.b,y=Math.min(baseAt(a,c),baseAt(d,e),baseAt(a,e),baseAt(d,c)),y0=y-.6,y1=y+b.h,m=b.mat||MAT.COL;
    colBox(a,c,d,e,y1+(b.rh||0));if(!B)return;
    B.box(a,y0,c,d,y1,e,b.col,m,m===MAT.SHEET?1:0,'b');
    if(b.roof==='gable'){const rh=b.rh,rc=b.rc,rm=b.rmat||MAT.COL;
      if(b.ra==='x'){const zm=(c+e)/2;B.quad([a-.3,y1-.1,c-.4],[a-.3,y1+rh,zm],[d+.3,y1+rh,zm],[d+.3,y1-.1,c-.4],rc,rm);B.quad([a-.3,y1-.1,e+.4],[d+.3,y1-.1,e+.4],[d+.3,y1+rh,zm],[a-.3,y1+rh,zm],rc,rm);
        B.tri([a,y1,c],[a,y1,e],[a,y1+rh,zm],b.col,m);B.tri([d,y1,c],[d,y1+rh,zm],[d,y1,e],b.col,m);}
      else{const xm=(a+d)/2;B.quad([a-.4,y1-.1,c-.3],[d+.4,y1-.1,c-.3],[xm,y1+rh,c-.3],[xm,y1+rh,c-.3],rc,rm);
        B.quad([a-.4,y1-.1,c-.3],[xm,y1+rh,c-.3],[xm,y1+rh,e+.3],[a-.4,y1-.1,e+.3],rc,rm);B.quad([d+.4,y1-.1,c-.3],[d+.4,y1-.1,e+.3],[xm,y1+rh,e+.3],[xm,y1+rh,c-.3],rc,rm);
        B.tri([a,y1,c],[xm,y1+rh,c],[d,y1,c],b.col,m);B.tri([a,y1,e],[d,y1,e],[xm,y1+rh,e],b.col,m);}}
    else if(b.roof==='spire'){const xm=(a+d)/2,zm=(c+e)/2,ap=[xm,y1+b.rh,zm];B.tri([a,y1,c],ap,[d,y1,c],b.rc,MAT.COL);B.tri([d,y1,c],ap,[d,y1,e],b.rc,MAT.COL);B.tri([d,y1,e],ap,[a,y1,e],b.rc,MAT.COL);B.tri([a,y1,e],ap,[a,y1,c],b.rc,MAT.COL);}
    else B.box(a-.2,y1,c-.2,d+.2,y1+.3,e+.2,lc(90,86,80),MAT.COL);
    /* a door and two windows on the long side facing the road */
    if(b.h<6){const dc=lc(40,34,30),wc=[.05,.06,.07],zf=c-.03,xm=(a+d)/2;B.quad([xm-.5,y,zf],[xm-.5,y+2.1,zf],[xm+.5,y+2.1,zf],[xm+.5,y,zf],dc,MAT.COL);
      for(const o of [-.3,.3]){const xw=a+(d-a)*(.5+o);B.quad([xw-.6,y+1.1,zf],[xw-.6,y+2,zf],[xw+.6,y+2,zf],[xw+.6,y+1.1,zf],wc,MAT.COL,.15);}}
    return;}
  if(b.t==='cyl'){const y=baseAt(b.x,b.z);colCirc(b.x,b.z,b.r,y+b.h);if(B){B.cyl(b.x,b.z,y-.5,y+b.h,b.r,14,b.col,b.mat||MAT.SHEET,b.cone);}return;}
  if(b.t==='lamp'){const y=baseAt(b.x,b.z);colCirc(b.x,b.z,.2,y+b.h);if(own)lights.push({p:[b.x,y+b.h-.3,b.z],r:26,c:[3.4,2.9,2.1],d:[0,-1,0],cs:Math.cos(1.15)});
    if(B){B.bar([b.x,y-.4,b.z],[b.x,y+b.h,b.z],.11,POLE_COL,MAT.WOOD);B.box(b.x-.35,y+b.h-.45,b.z-.25,b.x+.35,y+b.h-.15,b.z+.25,[1,.9,.7],MAT.EMIT,1.4);}return;}
  if(b.t==='sign'){const y=baseAt(b.x,b.z);colCirc(b.x,b.z,.25,y+5);if(B){B.bar([b.x,y-.3,b.z],[b.x,y+5,b.z],.14,lc(70,70,74),MAT.METAL);B.box(b.x-2.4,y+3.4,b.z-.12,b.x+2.4,y+5.2,b.z+.12,lc(200,40,30),MAT.COL,0);
    B.box(b.x-2.1,y+3.7,b.z+.13,b.x+2.1,y+4.9,b.z+.15,[1,.85,.5],MAT.EMIT,.9);}return;}
  if(b.t==='canopy'){const [a,c,d,e]=b.b,y=baseAt((a+d)/2,(c+e)/2);
    for(const [x,z] of [[a+1,c+1],[d-1,c+1],[a+1,e-1],[d-1,e-1]])colCirc(x,z,.3,y+b.h);
    if(own)lights.push({p:[(a+d)/2,y+b.h-.4,(c+e)/2],r:22,c:[4,3.8,3.4],d:[0,-1,0],cs:Math.cos(1.2)});
    if(!B)return;for(const [x,z] of [[a+1,c+1],[d-1,c+1],[a+1,e-1],[d-1,e-1]])B.bar([x,y-.3,z],[x,y+b.h,z],.2,lc(220,220,220),MAT.COL);
    B.box(a,y+b.h,c,d,y+b.h+.9,e,lc(220,40,40),MAT.COL);B.box(a+2,y+b.h-.05,c+2,d-2,y+b.h,e-2,[1,.95,.85],MAT.EMIT,.8,'t');
    for(const x of [a+8,d-8]){B.box(x-.5,y,(c+e)/2-.3,x+.5,y+1.7,(c+e)/2+.3,lc(210,210,214),MAT.COL);colBox(x-.6,(c+e)/2-.4,x+.6,(c+e)/2+.4,y+1.7);}
    return;}
  if(b.t==='elevator'){const y=baseAt(b.x,b.z),cc=lc(200,196,186);
    for(let k=0;k<4;k++){const x=b.x-15+k*9;colCirc(x,b.z,4.5,y+32);if(B)B.cyl(x,b.z,y-.5,y+32,4.5,16,cc,MAT.CONCRETE,0);}
    colBox(b.x+21,b.z-6,b.x+31,b.z+6,y+44);
    if(B){B.box(b.x+21,y-.5,b.z-6,b.x+31,y+44,b.z+6,cc,MAT.CONCRETE);B.box(b.x-19,y+32,b.z-2.5,b.x+28,y+35,b.z+2.5,lc(176,172,164),MAT.SHEET,1);
      B.box(b.x+40,y-.5,b.z-8,b.x+62,y+7,b.z+8,lc(176,178,176),MAT.SHEET,1);}
    colBox(b.x+40,b.z-8,b.x+62,b.z+8,y+7);
    if(own)lights.push({p:[b.x+26,y+20,b.z+7],r:40,c:[4,3.6,3],d:[0,-.7,.7],cs:Math.cos(1.1)});return;}
  if(b.t==='tower'){const y=baseAt(b.x,b.z),lg=lc(170,180,190);
    for(const [dx,dz] of [[-4,-4],[4,-4],[-4,4],[4,4]])colCirc(b.x+dx,b.z+dz,.45,y+26);
    if(!B)return;for(const [dx,dz] of [[-4,-4],[4,-4],[-4,4],[4,4]])B.bar([b.x+dx*1.15,y-.4,b.z+dz*1.15],[b.x+dx*.7,y+26,b.z+dz*.7],.35,lg,MAT.METAL);
    B.bar([b.x,y-.4,b.z],[b.x,y+26,b.z],.6,lg,MAT.METAL);
    B.cyl(b.x,b.z,y+26,y+33,7,18,lc(214,222,230),MAT.METAL,2.2);B.cyl(b.x,b.z,y+25.2,y+26,6.2,18,lc(150,160,170),MAT.METAL,0);
    B.box(b.x-7.2,y+28.6,b.z-.4,b.x+7.2,y+30.6,b.z+.4,lc(40,70,140),MAT.COL);return;}
  if(b.t==='garage'){const {x0:a,z0:c,x1:d,z1:e,h}=b,y=baseAt((a+d)/2,(c+e)/2),[d0,d1,dh]=b.door,wc=lc(188,192,196),tr=lc(60,64,70),t=.3;
    /* walls as colliders: back, sides, and the front either side of the door */
    colBox(a,c,d,c+t,y+h);colBox(a,c,a+t,e,y+h);colBox(d-t,c,d,e,y+h);colBox(a,e-t,d0,e,y+h);colBox(d1,e-t,d,e,y+h);
    if(own){lights.push({p:[(d0+d1)/2,y+dh+.8,e+1.2],r:30,c:[4.2,3.8,3.2],d:[0,-.8,.6],cs:Math.cos(1.2)});
    lights.push({p:[(a+d)/2,y+h-.6,(c+e)/2],r:26,c:[3.6,3.6,3.4],d:[0,-1,0],cs:Math.cos(1.35)});}
    if(!B)return;
    B.box(a,y-.6,c,d,y+h,c+t,wc,MAT.SHEET,1);B.box(a,y-.6,c,a+t,y+h,e,wc,MAT.SHEET,1);B.box(d-t,y-.6,c,d,y+h,e,wc,MAT.SHEET,1);
    B.box(a,y-.6,e-t,d0,y+h,e,wc,MAT.SHEET,1);B.box(d1,y-.6,e-t,d,y+h,e,wc,MAT.SHEET,1);B.box(d0,y+dh,e-t,d1,y+h,e,wc,MAT.SHEET,1);
    /* trim, the gable roof and the door frame */
    const rh=2.4,xm=(a+d)/2,rc=lc(120,40,32);
    B.quad([a-.5,y+h,c-.5],[xm,y+h+rh,c-.5],[xm,y+h+rh,e+.5],[a-.5,y+h,e+.5],rc,MAT.SHEET);B.quad([d+.5,y+h,c-.5],[d+.5,y+h,e+.5],[xm,y+h+rh,e+.5],[xm,y+h+rh,c-.5],rc,MAT.SHEET);
    B.tri([a,y+h,e],[d,y+h,e],[xm,y+h+rh,e],wc,MAT.SHEET,1);B.tri([a,y+h,c],[xm,y+h+rh,c],[d,y+h,c],wc,MAT.SHEET,1);
    B.box(d0-.4,y,e-.05,d0,y+dh+.4,e+.15,tr,MAT.METAL);B.box(d1,y,e-.05,d1+.4,y+dh+.4,e+.15,tr,MAT.METAL);B.box(d0-.4,y+dh,e-.05,d1+.4,y+dh+.4,e+.15,tr,MAT.METAL);
    B.box(d0,y+dh+.05,e-.1,d1,y+dh+.9,e-.02,lc(80,84,90),MAT.METAL);
    /* inside: a workbench, a tool chest, a lift */
    B.box(a+1,y,c+1,a+7,y+.95,c+2,lc(110,80,50),MAT.WOOD);B.box(d-4,y,c+1,d-1.4,y+1.2,c+2,lc(180,30,30),MAT.COL);
    for(const x of [a+12,a+16])B.box(x-.25,y,c+6,x+.25,y+3.5,c+6.5,lc(30,90,170),MAT.COL);
    colBox(a+1,c+1,a+7,c+2,y+.95);colBox(d-4,c+1,d-1.4,c+2,y+1.2);
    B.box(a+.4,y+h-.25,c+2,d-.4,y+h-.15,c+3,[1,1,.95],MAT.EMIT,1.2);B.box(a+.4,y+h-.25,e-4,d-.4,y+h-.15,e-3,[1,1,.95],MAT.EMIT,1.2);return;}
}

/* ---------- a far tile: 512 m, every 32 m, the land only (and the towns' tall things) ---------- */
const FT=512;
function genFar(tx,tz){
  const st=32,n=FT/st+1,x0=tx*FT,z0=tz*FT,ctx={ns:[],ew:[],spurs:[],pads:[],exp:undefined},o={};
  const nv=n*n+4*n*2,P=new Float32Array(nv*3),N=new Float32Array(nv*3),C=new Float32Array(nv*4),M=new Float32Array(nv).fill(MAT.TERRAIN),Hh=new Float64Array((n+2)*(n+2)),Wt=new Float32Array(n*n*4);
  const nb=n+2;
  for(let j=0;j<nb;j++)for(let i=0;i<nb;i++){const x=x0+(i-1)*st,z=z0+(j-1)*st;ctx.exp=xExp(z);core(x,z,ctx,o);Hh[j*nb+i]=o.h;
    if(i>0&&j>0&&i<=n&&j<=n){const k=(j-1)*n+i-1,wn=fbm(x/900+2.2,z/900-4.4,2,121),wd=sst(.56-.2*o.k,.66-.2*o.k,wn);
      Wt[k*4]=Math.max(o.grass,wd);Wt[k*4+1]=o.rock;Wt[k*4+2]=o.mud*.5;Wt[k*4+3]=1-wd*.5;}}
  let v=0;const I=[];
  const put=(i,j,dy)=>{const b=(j+1)*nb+i+1,k=j*n+i,hx=Hh[b-1]-Hh[b+1],hz=Hh[b-nb]-Hh[b+nb],l=Math.hypot(hx,2*st,hz);
    P[v*3]=i*st;P[v*3+1]=Hh[b]-dy;P[v*3+2]=j*st;N[v*3]=hx/l;N[v*3+1]=2*st/l;N[v*3+2]=hz/l;C[v*4]=Wt[k*4];C[v*4+1]=Wt[k*4+1];C[v*4+2]=Wt[k*4+2];C[v*4+3]=Wt[k*4+3];return v++;};
  for(let j=0;j<n;j++)for(let i=0;i<n;i++)put(i,j,0);
  for(let j=0;j<n-1;j++)for(let i=0;i<n-1;i++){const p=j*n+i,q=p+1,r=p+n,s=r+1;I.push(p,s,q,p,r,s);}
  const edge=(list,flip)=>{for(let e=0;e<list.length-1;e++){const [ia,ja]=list[e],[ib,jb]=list[e+1],a=ja*n+ia,b=jb*n+ib,c=put(ia,ja,8),d=put(ib,jb,8);if(flip)I.push(a,c,b,b,c,d);else I.push(a,b,c,b,d,c);}};
  const top=[],bot=[],lef=[],rig=[];for(let a=0;a<n;a++){top.push([a,0]);bot.push([a,n-1]);lef.push([0,a]);rig.push([n-1,a]);}
  edge(top,false);edge(bot,true);edge(lef,true);edge(rig,false);
  let ymin=1e9,ymax=-1e9;for(let k=0;k<n*n;k++){const h=Hh[((k/n|0)+1)*nb+k%n+1];if(h<ymin)ymin=h;if(h>ymax)ymax=h;}
  /* the towns' elevators and water towers, seen from miles off */
  const LB=new MB(x0,z0);
  for(let i=Math.round(x0/L)-1;i<=Math.round((x0+FT)/L)+1;i++)for(let j=Math.round(z0/L)-1;j<=Math.round((z0+FT)/L)+1;j++){const t=townPlan(i,j);if(!t)continue;
    for(const b of t.bld)if(b.t==='elevator'||b.t==='tower'){if(b.x<x0||b.x>=x0+FT||b.z<z0||b.z>=z0+FT)continue;building(b,LB,()=>{},()=>{},[],false);ymax=Math.max(ymax,baseAt(b.x,b.z)+46);}}
  return {tx,tz,ground:{pos:P.subarray(0,v*3),nrm:N.subarray(0,v*3),col:C.subarray(0,v*4),mat:M.subarray(0,v),idx:new Uint16Array(I),tris:I.length/3},marks:LB.n?LB.out():null,ymin,ymax};
}

/* ---------- questions the game asks ---------- */
/* the nearest road to a point: which line, its class, how far across (signed) and which way it runs */
function roadAt(x,z){
  let best=null;
  for(let q=-1;q<=1;q++){const i=Math.round(x/L)+q,xc=i*L+offNS(i,z),cl=clsNSz(i,z);if(!cl)continue;const s=(offNS(i,z+1)-offNS(i,z-1))*.5,inv=1/Math.sqrt(1+s*s),d=(x-xc)*inv;
    if(!best||Math.abs(d)-CL[cl].hw<Math.abs(best.d)-CL[best.cls].hw)best={ns:true,i,cls:cl,d,dir:[s*inv,inv],hw:CL[cl].hw,name:CL[cl].name};}
  for(let q=-1;q<=1;q++){const j=Math.round(z/L)+q,zc=j*L+offEW(j,x),cl=clsEWx(j,x);if(!cl)continue;const s=(offEW(j,x+1)-offEW(j,x-1))*.5,inv=1/Math.sqrt(1+s*s),d=(z-zc)*inv;
    if(!best||Math.abs(d)-CL[cl].hw<Math.abs(best.d)-CL[best.cls].hw)best={ns:false,j,cls:cl,d,dir:[inv,s*inv],hw:CL[cl].hw,name:CL[cl].name};}
  return best;
}
/* the road lines through a box, as polylines (for the big map) */
function roadLines(x0,z0,x1,z1,step){
  const out=[];
  for(let i=Math.floor((x0-300)/L);i<=Math.floor((x1+300)/L)+1;i++){let cur=null;
    for(let z=Math.floor(z0/step)*step;z<=z1+step;z+=step){const cl=Math.abs(z)>ROAD_END?0:clsNSz(i,z),x=i*L+offNS(i,z);
      if(!cl||x<x0-step||x>x1+step){cur=null;continue;}if(!cur||cur.cls!==cl){const p=cur;cur={cls:cl,pts:p?[p.pts[p.pts.length-2],p.pts[p.pts.length-1]]:[]};out.push(cur);}cur.pts.push(x,z);}}
  for(let j=Math.floor((z0-300)/L);j<=Math.floor((z1+300)/L)+1;j++){let cur=null;
    for(let x=Math.floor(x0/step)*step;x<=x1+step;x+=step){const cl=Math.abs(x)>ROAD_END?0:clsEWx(j,x),z=j*L+offEW(j,x);
      if(!cl||z<z0-step||z>z1+step){cur=null;continue;}if(!cur||cur.cls!==cl){const p=cur;cur={cls:cl,pts:p?[p.pts[p.pts.length-2],p.pts[p.pts.length-1]]:[]};out.push(cur);}cur.pts.push(x,z);}}
  return out;
}
/* the towns within r of a point */
function townsNear(x,z,r){const out=[];
  for(let i=Math.round((x-r)/L);i<=Math.round((x+r)/L);i++)for(let j=Math.round((z-r)/L);j<=Math.round((z+r)/L);j++){const t=townPlan(i,j);if(t&&Math.hypot(t.x-x,t.z-z)<r)out.push({name:t.name,x:t.x,z:t.z,i,j});}
  return out;}
/* what a place is called */
function placeAt(x,z){
  if(x>10&&x<68&&z>-80&&z<-2)return x>20&&x<56&&z>-70&&z<-44?'In the garage':'The garage';
  for(const t of townsNear(x,z,500))if(Math.hypot(t.x-x,t.z-z)<260)return t.name;
  const r=roadAt(x,z);if(r&&Math.abs(r.d)<r.hw+3)return r.cls===4?'Route 6':r.cls===5?'The expressway':r.name;
  const cr={};creekAt(x,z,cr);if(cr.dc<12)return 'The creek';
  const k=hillK(x,z);if(Math.max(Math.abs(x),Math.abs(z))>RIM0-200)return 'Edge of the map';
  const wn=fbm(x/900+2.2,z/900-4.4,2,121);if(wn>.6-.2*k)return k>.5?'Woods in the hills':'The woods';
  return k>.5?'The hills':k>.25?'Rolling country':'Open country';
}
return {L,HALF,CH,FT,ROAD_END,SURF,SF,CL,core,sample,baseAt,genGround,genStatic,genFar,roadAt,roadLines,townsNear,placeAt,hillK,offNS,offEW,clsNSz,clsEWx,creekAt,xExp};
}
