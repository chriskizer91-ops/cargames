/* =====================================================================================
   THE OTHER MACHINES: three quads (a kids' 90, a 450 sport quad, a utility ranch quad), a side-by-side,
   a golf cart, a go-kart, an old two-cylinder tractor and a semi with no trailer. Each is drawn from
   boxes, tubes and rounded shells (PS2-era detail, which the dot matrix is kind to), drives on the same
   physics as the cars, and has a Digital Engine voice the lab already has: the Thumper 450 and the
   Two-Stroke 250 for the quads, the small-engine single for the kids' quad, the golf cart and the kart,
   the popper for the tractor, and the long-haul semi with its jake brake and air horn.
   A quad's rider leans: into turns, and forward up a hill. That moves the rider's weight, and the physics
   feels it (Vehicle.lean). A rider who goes over the bars bails.
   Model axes as for the cars: +X forward, +Y up, +Z right, origin on the ground under the middle.
   ===================================================================================== */
const MACH={
  quad90:{name:"Kids' quad",grp:'Quads',kind:'quad',s:.78,L:1.45,W:.95,H:1.1,wb:.95,xF:.46,track:.74,R:.235,tw:.17,rim:8,kg:105,riderKg:38,riderS:.7,hcg:.5,wf:.42,clear:.13,
    tread:'knobby',style:'steel',drv:'RWD',susp:'quad',cdA:.45,lock:.55,lampY:.52,paint:'#d8611e',paint2:'#141416',rimCol:'#141416',
    hint:'A 90 cc kids\' quad with an automatic and a throttle limiter screw. Back the screw out in the garage.'},
  quad450:{name:'Sport quad',grp:'Quads',kind:'quad',s:1,L:1.85,W:1.18,H:1.18,wb:1.27,xF:.6,track:1.0,R:.265,tw:.2,rim:10,kg:165,riderKg:80,riderS:1,hcg:.62,wf:.42,clear:.17,
    tread:'knobby',style:'race',drv:'RWD',susp:'quadSport',cdA:.55,lock:.55,lampY:.62,paint:'#2f74c8',paint2:'#e9e8e2',rimCol:'#d6a63a',
    hint:'A 450 four-stroke sport quad: five speeds, no rear diff (both rear wheels always turn together), long travel.'},
  quadUtil:{name:'Ranch quad',grp:'Quads',kind:'quad',util:1,s:1.12,L:2.12,W:1.22,H:1.25,wb:1.3,xF:.66,track:.98,R:.31,tw:.22,rim:12,kg:300,riderKg:80,riderS:1,hcg:.72,wf:.47,clear:.25,
    tread:'at',style:'steel',drv:'AWD',susp:'quadUtil',cdA:.7,lock:.55,lampY:.95,paint:'#4a5238',paint2:'#2a2a2c',rimCol:'#1d1d1f',
    hint:'A big utility quad: a 700 single, an automatic with high and low, four-wheel drive with a front diff lock, racks front and back.'},
  sxs:{name:'Side-by-side',grp:'Quads',kind:'sxs',s:1,L:3.05,W:1.62,H:1.88,wb:2.24,xF:1.06,track:1.36,R:.37,tw:.25,rim:14,kg:690,riderKg:80,riderS:1,hcg:.62,wf:.42,clear:.33,
    tread:'at',style:'bead',drv:'AWD',susp:'sxs',cdA:1.3,lock:.6,lampY:.78,paint:'#c8261e',paint2:'#141416',rimCol:'#141416',
    hint:'A two-seat side-by-side: a 1,000 cc twin, a belt automatic, long-travel suspension and a roll cage.'},
  golf:{name:'Golf cart',grp:'Odd',kind:'golf',s:1,L:2.42,W:1.22,H:1.82,wb:1.66,xF:.85,track:.9,R:.225,tw:.2,rim:8,kg:330,riderKg:80,riderS:1,hcg:.56,wf:.44,clear:.12,
    tread:'turf',style:'cap',drv:'RWD',susp:'golf',cdA:1.0,lock:.6,lampY:.62,paint:'#ece9e2',paint2:'#2f4636',rimCol:'#c3c6cb',
    hint:'A gas golf cart: a 400 cc single, a belt automatic, top speed about 15 mph. Unlocked in the career by doing something silly.'},
  kart:{name:'Go-kart',grp:'Odd',kind:'kart',s:1,L:1.8,W:1.3,H:.75,wb:1.05,xF:.55,track:1.0,R:.13,Rr:.14,tw:.12,twR:.18,rim:5,kg:75,riderKg:80,riderS:1,hcg:.3,wf:.42,clear:.05,
    tread:'kart',style:'flat',drv:'RWD',susp:'kart',cdA:.55,lock:.5,lampY:.3,paint:'#ffb43c',paint2:'#141416',rimCol:'#c9ccd1',
    hint:'A yard go-kart: a 212 cc single on a centrifugal clutch, a solid rear axle and no suspension at all.'},
  tractor:{name:'Old tractor',grp:'Odd',kind:'tractor',s:1,L:3.35,W:1.95,H:2.35,wb:2.1,xF:1.15,track:1.25,trackR:1.55,R:.4,Rr:.74,tw:.16,twR:.36,rim:16,rimR:38,kg:2500,riderKg:80,riderS:1,hcg:.95,wf:.3,clear:.4,
    tread:'rib',treadR:'ag',style:'steel',drv:'RWD',susp:'tractor',cdA:2.4,lock:.6,lampY:1.25,paint:'#b8461f',paint2:'#e2d6b0',rimCol:'#e2d6b0',
    hint:'A 1940s two-cylinder tractor that pops. Six gears up to about 12 mph, a diff lock, and huge lugged rear tyres.'},
  semi:{name:'Semi',grp:'Odd',kind:'semi',s:1,L:7.05,W:2.5,H:3.95,wb:5.0,xF:2.6,track:2.05,R:.51,tw:.29,rim:22.5,kg:8400,riderKg:0,riderS:1,hcg:1.15,wf:.6,clear:.28,
    tread:'truck',style:'steel',drv:'RWD',susp:'semi',cdA:6,lock:.62,lampY:1.35,paint:'#7a1418',paint2:'#c9ccd1',rimCol:'#c9ccd1',
    hint:'A long-haul tractor without its trailer: a 15-litre six, ten gears, a jake brake and an air horn. Governed to 70 mph from the factory.'}
};
const MACH_IDS=Object.keys(MACH);
/* how far the rider can move their weight: across (hanging off) and along (over the bars or back), in metres */
for(const id of MACH_IDS){const M=MACH[id];[M.leanZ,M.leanX]=M.kind==='quad'?[.3*M.s,.22*M.s]:M.kind==='kart'?[.08,.05]:M.kind==='semi'?[0,0]:[.05,.04];}
/* the engines: the lab's voices (exhaust and intake codes from its tables), with the torque each machine really makes */
Object.assign(DE_ENGINES,{
  q90:{layout:'S1',disp:.09,redline:7000,idle:1800,tq:6.5,cP:.6,cW:.6,cA:.7,Ie:.012,ex:13,intake:5,crackle:.15,mech:.25,mechTone:3500,limiter:'soft',exMap:{stock:13,pipe:3},tuneGov:1,gain:.85},
  q450:{layout:'S1',disp:.45,redline:10500,idle:1500,tq:38,cP:.7,cW:.5,cA:.5,Ie:.012,ex:5,intake:1,cam:2,crackle:.6,ch:{td:1.1},limiter:'hard',exMap:{stock:5,pipe:3}},
  q250t:{layout:'S1T',disp:.25,redline:9500,idle:1600,tq:42,cP:.86,cW:.24,cA:.32,Ie:.008,ex:6,intake:1,cam:0,crackle:.4,limiter:'hard',exMap:{stock:6,pipe:6}},
  q700:{layout:'S1',disp:.7,redline:7000,idle:1300,tq:62,cP:.55,cW:.55,cA:.6,Ie:.03,ex:0,intake:0,crackle:.15,limiter:'soft',exMap:{stock:0,pipe:5}},
  q850:{layout:'V2L',disp:.85,redline:7500,idle:1250,tq:78,cP:.6,cW:.55,cA:.6,Ie:.034,ex:0,intake:0,crackle:.2,limiter:'soft',exMap:{stock:0,pipe:5}},
  sxs1000:{layout:'P2X',disp:1.0,redline:8500,idle:1200,tq:96,cP:.65,cW:.5,cA:.5,Ie:.03,ex:5,intake:1,cam:1,crackle:.45,limiter:'hard',exMap:{stock:5,pipe:2}},
  golf400:{layout:'S1',disp:.4,redline:3800,idle:1700,tq:20,cP:.55,cW:.6,cA:.7,Ie:.04,ex:13,intake:5,crackle:.1,mech:.3,mechTone:3200,limiter:'soft',exMap:{stock:13,pipe:17},tuneRpm:[0,800,1400],gain:.9},
  kart212:{layout:'S1',disp:.21,redline:4000,idle:1800,tq:13,cP:.6,cW:.6,cA:.65,Ie:.02,ex:13,intake:5,crackle:.2,mech:.2,mechTone:3600,limiter:'soft',exMap:{stock:13,pipe:3},tuneRpm:[0,1200,2200]},
  popper:{layout:'P2T',disp:5.5,redline:975,idle:450,tq:290,cP:.75,cW:.6,cA:.7,Ie:4,ex:12,intake:4,crackle:.3,mech:.5,mechTone:1500,limiter:'soft',starter:'hand',exMap:{stock:12},gain:1.3},
  semi15:{layout:'I6',disp:15,redline:2100,idle:650,tq:1050,cP:.55,cW:.5,cA:.55,Ie:3.2,fi:'turbo',boost:2.4,tsize:2,bov:'none',ex:8,intake:4,cam:0,crackle:0,limiter:'soft',
    diesel:1,mech:1.2,mechTone:2700,jake:1,horn:'air',stF:.6,crankRpm:160,crankT:1.1,flare:.3,catchT:.5,twK:1.6,twF:1.15,gain:1.6,exMap:{stock:8,stacks:9}}
});
Object.assign(DE_GEARS,{cvt:[1],cvtHL:[1],quad5:[2.6,1.8,1.4,1.15,.95],kart1:[1],trac6:[5.9,4.0,2.88,2.08,1.44,1],truck10:[12.8,9.25,6.76,4.94,3.55,2.53,1.86,1.36,1,.74]});
Object.assign(DE_SHIFT,{cvt:.1,cvtHL:.1,quad5:.12,kart1:.1,trac6:.6,truck10:.75});
/* each machine's engine recipe and running gear as it leaves the factory (the garage changes them) */
const MACH_ENGINE={
  quad90:{engine:'q90',trans:'cvt',axle:12.9},quad450:{engine:'q450',trans:'quad5',axle:9.4},quadUtil:{engine:'q700',trans:'cvtHL',axle:7.4},sxs:{engine:'sxs1000',trans:'cvt',axle:9.6},
  golf:{engine:'golf400',trans:'cvt',axle:13.5},kart:{engine:'kart212',trans:'kart1',axle:4.4},tractor:{engine:'popper',trans:'trac6',axle:13.1},semi:{engine:'semi15',trans:'truck10',axle:3.55}};
for(const id of MACH_IDS){const M=MACH[id],E=MACH_ENGINE[id];
  ENGINE_OF[id]={desc:M.hint,engine:E.engine,power:'none',intake:0,exhaust:'stock',cam:0,tune:0,nos:0,trans:E.trans,axle:E.axle,mass:M.kg+M.riderKg,cdA:M.cdA,mu:1,drv:M.drv};}
/* the builds: one look per machine (paint, wheels and tyres change on it), plus a second preset where there is one */
for(const id of MACH_IDS){const M=MACH[id];
  BUILDS.push({id,car:id,name:'Stock',tag:M.hint.split(':')[0],blurb:M.hint,machine:1,paint:M.paint,paint2:M.paint2,rim:M.rimCol,cal:'#3a3a3e',clad:'#1c1c1e',dirt:0,liv:0,
    look:{body:id,machine:1,lift:0,track:M.track,trackR:M.trackR,archR:.5,tyre:{R:M.R,W:M.tw,rim:M.rim,tyre:'mt',style:M.style,brake:'stock'},
      tyreR:M.Rr?{R:M.Rr,W:M.twR||M.tw,rim:M.rimR||M.rim,tyre:'mt',style:M.style,brake:'stock'}:undefined},specs:[]});
  CARS.push([id,M.name]);}
for(const [id,base,name,tag] of [['quad450X','quad450','Built','Big bore, pipe, long-travel arms'],['quadUtilX','quadUtil','Mudder','Snorkel, winch, mud tyres, locked'],['sxsX','sxs','Turbo','Turbo, bypass shocks, 32s'],['golfX','golf','Lifted','Lift kit, all-terrains, governor out']]){
  const B=BUILDS.find(b=>b.id===base);BUILDS.push(Object.assign({},B,{id,name,tag,look:B.look}));ENGINE_OF[id]=ENGINE_OF[base];}
const isMach=b=>!!(b&&b.machine);
const machOf=b=>MACH[b.look.body];

/* ---------- the meshes ---------- */
const mc=(h,mat=MAT.METAL,em=0)=>V(lin(h),mat,em);
const MP={PAINT:V([1,1,1],MAT.PAINT),ACC:V([1,1,1],MAT.ACCENT),BLK:mc('#18181a',MAT.CLAD),RUB:V([.02,.02,.022],MAT.RUBBER),MET:mc('#3a3c40'),DARK:mc('#1c1d20'),
  CHR:V([1,1,1],MAT.CHROME),GL:V([0,0,0],MAT.GLASS),HEAD:V([1,1,1],MAT.HEAD),TAIL:V([1,1,1],MAT.TAIL),AMB:V([1,1,1],MAT.AMBER),SEAT:mc('#141416',MAT.FABRIC),TAN:mc('#9a8a6a',MAT.FABRIC)};
const XZ=[1,0,0],YY=[0,1,0],ZZ=[0,0,1];
/* a rider: hips and legs fixed to the machine, the upper body (torso, arms, helmet) on its own mesh so it can lean about the hips */
function buildRider(o){
  const lo=new MB(),up=new MB(),s=o.s,P=o.hip,SU=mc(o.suit||'#2a2f3a',MAT.FABRIC),S2=mc(o.suit2||'#c8261e',MAT.FABRIC),BOOT=mc('#141416',MAT.RUBBER),HM=mc(o.helmet||'#e9e8e2',MAT.METAL);
  for(const z of [-1,1]){const hip=[P[0],P[1],P[2]+z*.1*s],knee=[o.knee[0],o.knee[1],P[2]+z*o.knee[2]],foot=[o.foot[0],o.foot[1],P[2]+z*o.foot[2]];
    tubeAB(lo,hip,knee,.075*s,8,SU);ball(lo,knee,.07*s,8,SU);tubeAB(lo,knee,foot,.06*s,8,SU);abox(lo,[foot[0]+.05*s,foot[1]-.02,foot[2]],[.1*s,.05*s,.05*s],BOOT);}
  abox(lo,[P[0]-.02,P[1]+.02,P[2]],[.12*s,.07*s,.15*s],SU);
  /* the upper body, built round the hips at the origin and moved there when drawn */
  const sh=[.02*s,.5*s,0],L=(v)=>[v[0]-P[0],v[1]-P[1],v[2]-P[2]];
  rbox(up,[.0,.27*s,0],XZ,YY,ZZ,[.13*s,.26*s,.18*s],SU,.5,10,6);rbox(up,[.02,.36*s,0],XZ,YY,ZZ,[.135*s,.08*s,.185*s],S2,.5,10,4);
  for(const z of [-1,1]){const shl=[sh[0],sh[1],z*.19*s],hand=L([o.hand[0],o.hand[1],P[2]+z*o.hand[2]]),el=[(shl[0]+hand[0])/2+.02*s,(shl[1]+hand[1])/2-.1*s,(shl[2]+hand[2])/2+z*.05*s];
    tubeAB(up,shl,el,.055*s,8,SU);ball(up,el,.05*s,6,SU);tubeAB(up,el,hand,.045*s,8,SU);ball(up,hand,.05*s,6,BOOT);}
  ball(up,[.04*s,.73*s,0],.15*s,12,HM);
  /* the visor: a dark band across the front of the helmet */
  rbox(up,[.15*s,.72*s,0],XZ,YY,ZZ,[.04*s,.05*s,.11*s],MP.GL,.4,8,4);
  if(o.peak)abox(up,[.17*s,.84*s,0],[.07*s,.012,.08*s],HM);
  return {lo:lo.build(),up:up.build(),pivot:P.slice(),tris:(lo.p.length+up.p.length)/9};
}
/* the quads: fenders front and back, a tank and seat, bars, a frame and engine, A-arms and shocks up front, a
   swingarm and solid axle behind, nerf bars, a pipe; the ranch quad adds racks and a brush guard */
function meshQuad(M,b,mb,D){
  const s=M.s,xf=M.xF,xr=M.xF-M.wb,R=M.R,lift=b.look.lift,y0=lift,tr=b.look.track/2,mud=(b.kit||b.id)==='quadUtilX';
  const Y=v=>v+y0;
  /* fenders */
  rbox(mb,[xf-.02,Y(R+.36*s),0],XZ,YY,ZZ,[.4*s,.07*s,tr+.12],MP.PAINT,.45,16,6);
  rbox(mb,[xf+.32*s,Y(R+.25*s),0],XZ,YY,ZZ,[.14*s,.12*s,.26*s],MP.PAINT,.5,12,6);
  rbox(mb,[xr+.04,Y(R+.4*s),0],XZ,YY,ZZ,[.44*s,.07*s,tr+.12],MP.PAINT,.45,16,6);
  /* tank, seat, frame and engine */
  rbox(mb,[xf-.35*s,Y(R+.52*s),0],XZ,YY,ZZ,[.2*s,.09*s,.18*s],MP.PAINT,.4,10,5);
  rbox(mb,[xr+.32*s,Y(R+.56*s),0],XZ,YY,ZZ,[.42*s,.055*s,.17*s],MP.SEAT,.35,12,4);
  abox(mb,[(xf+xr)/2,Y(R+.14*s),0],[.36*s,.16*s,.16*s],MP.DARK);
  for(let k=0;k<4;k++)abox(mb,[(xf+xr)/2+.12*s,Y(R+.32*s+k*.04*s),0],[.09*s,.012,.13*s],MP.MET);
  tubeAB(mb,[xf-.15,Y(R+.08*s),0],[xr+.1,Y(R+.08*s),0],.035*s,8,MP.DARK);
  /* the bars */
  const by=Y(R+.72*s),bx=xf-.12*s;tubeAB(mb,[bx-.08*s,Y(R+.5*s),0],[bx,by,0],.03*s,8,MP.DARK);
  tubeAB(mb,[bx,by,-.36*s],[bx,by,.36*s],.022*s,8,MP.DARK);for(const z of [-1,1])tubeAB(mb,[bx,by,z*.28*s],[bx,by,z*.38*s],.03*s,8,MP.RUB);
  /* lights */
  for(const z of [-1,1])rbox(mb,[xf+.45*s,Y(R+.27*s),z*.11*s],XZ,YY,ZZ,[.02,.04*s,.06*s],MP.HEAD,.3,8,4);
  rbox(mb,[xr-.47*s,Y(R+.36*s),0],XZ,YY,ZZ,[.015,.03*s,.07*s],MP.TAIL,.3,8,4);
  /* front A-arms and shocks, the rear swingarm and axle */
  for(const z of [-1,1]){const hub=[xf,Y(R),z*(tr-.08)],in1=[xf,Y(R+.06*s),z*.13*s],in2=[xf,Y(R-.08*s),z*.13*s];
    tubeAB(mb,in1,hub,.018*s,6,MP.DARK);tubeAB(mb,in2,hub,.018*s,6,MP.DARK);tubeAB(mb,[xf-.06,Y(R+.32*s),z*.2*s],[xf,Y(R+.04),z*(tr-.16)],.03*s,8,MP.ACC);}
  for(const z of [-1,1])tubeAB(mb,[(xf+xr)/2-.05,Y(R+.05*s),z*.13*s],[xr,Y(R),z*.13*s],.03*s,8,MP.DARK);
  tubeAB(mb,[xr,Y(R),-tr+.1],[xr,Y(R),tr-.1],.03*s,8,MP.MET);
  /* nerf bars and footwells */
  for(const z of [-1,1]){const zz=z*(tr+.02);tubePath(mb,[[xf-.25*s,Y(R+.02*s),z*.24*s],[xf-.3*s,Y(R+.02*s),zz],[xr+.3*s,Y(R+.02*s),zz],[xr+.25*s,Y(R+.02*s),z*.24*s]],.02*s,6,MP.DARK);
    abox(mb,[(xf+xr)/2,Y(R-.02*s),z*.3*s],[.28*s,.012,.08*s],MP.BLK);}
  /* the pipe */
  const tip=[xr-.38*s,Y(R+.32*s),.2*s];tubePath(mb,[[(xf+xr)/2+.1,Y(R+.25*s),.12*s],[(xf+xr)/2-.1,Y(R+.3*s),.24*s],[xr+.05,Y(R+.3*s),.24*s],tip],.035*s,8,M.util?MP.DARK:MP.CHR);
  D.tips=[{p:tip,d:[-1,0,0],r:.03*s}];
  /* the ranch quad: steel racks, a brush guard, and in the mud kit a snorkel and a winch */
  if(M.util){for(const [x0,x1,yy] of [[xf-.05,xf+.42*s,R+.48*s],[xr-.45*s,xr+.12,R+.5*s]]){const y=Y(yy);
      for(const z of [-1,1])tubeAB(mb,[x0,y,z*.36*s],[x1,y,z*.36*s],.015,6,MP.DARK);for(let k=0;k<=4;k++){const x=x0+(x1-x0)*k/4;tubeAB(mb,[x,y,-.36*s],[x,y,.36*s],.012,6,MP.DARK);}}
    tubePath(mb,[[xf+.5*s,Y(R-.05),-.25*s],[xf+.56*s,Y(R+.25*s),-.25*s],[xf+.56*s,Y(R+.25*s),.25*s],[xf+.5*s,Y(R-.05),.25*s]],.025,8,MP.DARK);
    if(mud){tubePath(mb,[[xf-.3*s,Y(R+.6*s),-.12*s],[xf-.25*s,Y(R+1.0*s),-.12*s]],.035,8,MP.BLK);abox(mb,[xf+.52*s,Y(R+.05),0],[.06,.07,.14],MP.DARK);}}
  /* a number plate on the sport quad */
  if(!M.util&&M.s>=1)rbox(mb,[xf+.42*s,Y(R+.46*s),0],XZ,YY,ZZ,[.01,.07*s,.11*s],mc('#e9e8e2',MAT.COL),.3,8,4);
}
/* the side-by-side: a tub, hood and fenders, two bucket seats, a roll cage with a light bar, a short bed */
function meshSxs(M,b,mb,D){
  const xf=M.xF,xr=M.xF-M.wb,R=M.R,lift=b.look.lift,Y=v=>v+lift,hw=b.look.track/2,turbo=b.rig&&b.rig.power==='turbo';
  rbox(mb,[(xf+xr)/2,Y(R+.25),0],XZ,YY,ZZ,[1.22,.22,.62],MP.BLK,.35,18,6);
  rbox(mb,[xf+.08,Y(R+.48),0],XZ,YY,ZZ,[.42,.08,.58],MP.PAINT,.4,14,5);
  for(const z of [-1,1]){rbox(mb,[xf,Y(R+.38),z*(hw+.02)],XZ,YY,ZZ,[.4,.06,.18],MP.PAINT,.45,12,5);rbox(mb,[xr,Y(R+.4),z*(hw+.02)],XZ,YY,ZZ,[.42,.06,.18],MP.PAINT,.45,12,5);}
  rbox(mb,[xr-.12,Y(R+.62),0],XZ,YY,ZZ,[.38,.1,.56],MP.PAINT,.3,12,5);
  for(const z of [-1,1]){const zz=z*.32;rbox(mb,[-.12,Y(R+.38),zz],XZ,YY,ZZ,[.24,.06,.2],MP.SEAT,.4,10,4);rbox(mb,[-.36,Y(R+.68),zz],XZ,YY,ZZ,[.06,.3,.2],MP.SEAT,.4,8,6);}
  /* the cage */
  const top=Y(M.H),C=MP.DARK;
  for(const z of [-1,1]){const zz=z*.6;tubePath(mb,[[.55,Y(R+.45),zz],[.15,top,zz*.97],[-.62,top,zz*.97],[-.7,Y(R+.5),zz]],.03,8,C);}
  for(const x of [.15,-.62])tubeAB(mb,[x,top,-.58],[x,top,.58],.03,8,C);tubeAB(mb,[-.25,top,-.58],[-.25,top,.58],.025,8,C);
  rbox(mb,[.15,top+.05,0],XZ,YY,ZZ,[.04,.035,.45],MP.BLK,.3,10,4);rbox(mb,[.19,top+.05,0],XZ,YY,ZZ,[.005,.025,.42],V([1,1,1],MAT.LED),.2,8,4);
  /* steering wheel, lights, the pipe */
  tubeAB(mb,[.35,Y(R+.45),-.32],[.15,Y(R+.75),-.32],.02,6,C);ring(mb,[.13,Y(R+.78),-.32],.17,.018,MP.RUB);
  for(const z of [-1,1])rbox(mb,[xf+.48,Y(R+.42),z*.4],XZ,YY,ZZ,[.015,.04,.1],MP.HEAD,.3,8,4);
  for(const z of [-1,1])rbox(mb,[xr-.5,Y(R+.55),z*.45],XZ,YY,ZZ,[.01,.035,.06],MP.TAIL,.3,8,4);
  const tip=[xr-.52,Y(R+.42),.25];tubePath(mb,[[-.2,Y(R+.15),.15],[xr+.1,Y(R+.3),.25],tip],.04,8,MP.DARK);D.tips=[{p:tip,d:[-1,0,0],r:.035}];
  if(turbo)ball(mb,[xr+.2,Y(R+.7),.2],.08,8,MP.CHR);
}
/* a ring (steering wheels) */
function ring(mb,c,r,t,m){const n=16;for(let i=0;i<n;i++){const a=i/n*TAU,b2=(i+1)/n*TAU;tubeAB(mb,[c[0]+Math.sin(a)*r*.3,c[1]+Math.cos(a)*r,c[2]+Math.sin(a)*r],[c[0]+Math.sin(b2)*r*.3,c[1]+Math.cos(b2)*r,c[2]+Math.sin(b2)*r],t,5,m,false);}}
/* the golf cart: a cowl, a floor, a rear body, a bench seat, a roof on four struts, a bag on the back */
function meshGolf(M,b,mb,D){
  const xf=M.xF,xr=M.xF-M.wb,R=M.R,lift=b.look.lift,Y=v=>v+lift,lifted=lift>.05;
  rbox(mb,[xf+.18,Y(R+.32),0],XZ,YY,ZZ,[.36,.26,.56],MP.PAINT,.45,14,6);
  abox(mb,[(xf+xr)/2,Y(R+.1),0],[.62,.04,.5],MP.BLK);
  rbox(mb,[xr-.05,Y(R+.3),0],XZ,YY,ZZ,[.48,.26,.58],MP.PAINT,.45,14,6);
  rbox(mb,[-.35,Y(R+.56),0],XZ,YY,ZZ,[.26,.07,.52],MP.TAN,.35,12,4);rbox(mb,[-.6,Y(R+.82),0],XZ,YY,ZZ,[.05,.22,.52],MP.TAN,.35,8,6);
  const top=Y(M.H);abox(mb,[-.18,top,0],[.78,.03,.62],MP.ACC);
  for(const z of [-1,1]){tubeAB(mb,[xf-.32,Y(R+.62),z*.5],[xf-.3,top,z*.52],.025,8,MP.DARK);tubeAB(mb,[-.78,Y(R+.6),z*.5],[-.8,top,z*.52],.025,8,MP.DARK);}
  /* the steering wheel, the bag */
  tubeAB(mb,[xf-.15,Y(R+.45),-.25],[.15,Y(R+.85),-.25],.02,6,MP.DARK);ring(mb,[.13,Y(R+.88),-.25],.16,.016,MP.RUB);
  tubeAB(mb,[xr-.45,Y(R+.45),.15],[xr-.45,Y(R+1.25),.15],.13,10,mc('#2f4636',MAT.FABRIC));for(const dz of [-.05,0,.05])tubeAB(mb,[xr-.45,Y(R+1.25),.15+dz],[xr-.42,Y(R+1.42),.15+dz],.012,5,MP.CHR);
  for(const z of [-1,1])rbox(mb,[xf+.53,Y(R+.36),z*.32],XZ,YY,ZZ,[.01,.035,.06],MP.HEAD,.3,8,4);
  if(lifted)for(const z of [-1,1]){abox(mb,[xf,Y(R+.02),z*.32],[.04,.04,.22],MP.DARK);abox(mb,[xr,Y(R+.02),z*.32],[.04,.04,.22],MP.DARK);}
  D.tips=[{p:[xr-.46,Y(R-.05),.3],d:[-1,0,0],r:.02}];
}
/* the go-kart: a tube frame, a floor pan, a seat, side pods and a nose, the engine on the left at the back */
function meshKart(M,b,mb,D){
  const xf=M.xF,xr=M.xF-M.wb,Y=v=>v+.02,F=MP.DARK;
  for(const z of [-1,1])tubePath(mb,[[xf+.3,Y(.12),z*.22],[xf,Y(.12),z*.42],[xr+.1,Y(.12),z*.4],[xr-.35,Y(.14),z*.3]],.018,6,F);
  tubeAB(mb,[xf+.3,Y(.12),-.22],[xf+.3,Y(.12),.22],.018,6,F);tubeAB(mb,[xr-.35,Y(.14),-.3],[xr-.35,Y(.14),.3],.018,6,F);
  abox(mb,[(xf+xr)/2,Y(.08),0],[.5,.008,.3],MP.MET);
  rbox(mb,[-.15,Y(.26),0],XZ,YY,ZZ,[.2,.13,.2],MP.SEAT,.5,10,6);
  for(const z of [-1,1])rbox(mb,[0,Y(.18),z*.5],XZ,YY,ZZ,[.3,.06,.08],MP.PAINT,.5,10,4);
  rbox(mb,[xf+.25,Y(.18),0],XZ,YY,ZZ,[.15,.08,.36],MP.PAINT,.5,10,4);
  tubeAB(mb,[xf+.05,Y(.15),0],[.25,Y(.42),0],.015,6,F);ring(mb,[.24,Y(.43),0],.14,.014,MP.RUB);
  abox(mb,[xr-.05,Y(.3),-.36],[.14,.14,.12],MP.MET);ball(mb,[xr+.02,Y(.42),-.36],.08,8,MP.DARK);
  const tip=[xr-.3,Y(.42),-.3];tubePath(mb,[[xr-.05,Y(.32),-.24],[xr-.2,Y(.4),-.28],tip],.025,8,MP.CHR);D.tips=[{p:tip,d:[-.8,.6,0],r:.02}];
  tubeAB(mb,[xr,Y(.14),-.55],[xr,Y(.14),.55],.02,6,MP.MET);
}
/* the old tractor: a long hood over a horizontal twin, a stack, a pan seat on a spring, big rear fenders */
function meshTractor(M,b,mb,D){
  const xf=M.xF,xr=M.xF-M.wb,R=M.R,Rr=M.Rr,P=MP.PAINT,A=mc('#e2d6b0',MAT.METAL);
  rbox(mb,[xf-.38,1.22,0],XZ,YY,ZZ,[.78,.24,.3],P,.25,14,6);
  abox(mb,[xf+.42,1.12,0],[.06,.32,.3],A);for(let k=0;k<6;k++)abox(mb,[xf+.48,.9+k*.08,0],[.01,.015,.27],MP.DARK);
  abox(mb,[xf-.4,.78,0],[.62,.2,.2],MP.DARK);for(const z of [-1,1])tubeAB(mb,[xf-.25,.8,z*.2],[xf-.25,.8,z*.36],.14,10,MP.DARK);
  tubeAB(mb,[xf,R,-.62],[xf,R,.62],.05,8,MP.DARK);tubeAB(mb,[xf-.1,R+.05,0],[xf-.3,.85,0],.06,8,MP.DARK);
  abox(mb,[xr+.35,1.0,0],[.4,.32,.32],P);abox(mb,[xr+.1,.85,0],[.3,.2,.45],MP.DARK);
  /* the seat on its spring, the wheel on its column, the fenders */
  tubeAB(mb,[xr-.15,1.05,0],[xr-.35,1.42,0],.04,6,MP.DARK);rbox(mb,[xr-.38,1.47,0],XZ,YY,ZZ,[.2,.04,.22],mc('#1c1d20',MAT.METAL),.5,10,4);
  tubeAB(mb,[xf-.6,1.4,0],[xr+.25,1.85,0],.03,6,MP.DARK);ring(mb,[xr+.22,1.87,0],.21,.018,MP.DARK);
  const tw=b.look.trackR/2;
  for(const z of [-1,1]){const n=10;for(let i=0;i<n;i++){const a0=PI*.05+i/n*PI*.75,a1=PI*.05+(i+1)/n*PI*.75,r=Rr+.1;
      const p=(a,w)=>[xr+Math.cos(a)*r,Rr+Math.sin(a)*r,z*(tw+w)];mb.quad(p(a0,-.22),p(a1,-.22),p(a1,.2),p(a0,.2),[1,1,1],0,MAT.PAINT);}}
  const tip=[xf-.3,2.3,-.15];tubeAB(mb,[xf-.3,1.42,-.15],tip,.05,10,MP.DARK);tubeAB(mb,tip,[tip[0],tip[1]+.03,tip[2]],.07,10,MP.DARK,false);D.tips=[{p:[tip[0],tip[1]+.04,tip[2]],d:[0,1,0],r:.05}];
  for(const z of [-1,1])rbox(mb,[xf+.1,1.38,z*.25],XZ,YY,ZZ,[.04,.06,.06],MP.HEAD,.4,8,4);
  abox(mb,[xr-.5,.55,0],[.25,.04,.08],MP.DARK);
}
/* the semi: a long hood and grille, a cab and sleeper, chrome tanks and stacks, frame rails and a fifth wheel */
function meshSemi(M,b,mb,D){
  const xf=M.xF,xr=M.xF-M.wb,P=MP.PAINT,stacks=b.rig&&b.rig.exhaust==='stacks';
  rbox(mb,[xf-.15,1.75,0],XZ,YY,ZZ,[1.15,.55,1.0],P,.3,16,6);
  abox(mb,[xf+.98,1.6,0],[.04,.6,.55],MP.CHR);for(let k=0;k<9;k++)abox(mb,[xf+1.02,1.12+k*.11,0],[.01,.02,.5],MP.DARK);
  abox(mb,[xf+1.05,.82,0],[.12,.2,1.22],MP.CHR);
  for(const z of [-1,1]){rbox(mb,[xf+.05,1.25,z*1.05],XZ,YY,ZZ,[.62,.1,.2],P,.5,12,5);rbox(mb,[xf+.85,1.35,z*.85],XZ,YY,ZZ,[.03,.1,.14],MP.HEAD,.3,8,4);}
  rbox(mb,[xf-1.75,2.4,0],XZ,YY,ZZ,[.7,1.0,1.2],P,.25,14,6);
  obox(mb,[xf-1.07,2.85,0],[.3,.954,0],YY,ZZ,[.01,.42,1.1],MP.GL);for(const z of [-1,1])abox(mb,[xf-1.6,2.85,z*1.205],[.5,.35,.01],MP.GL);
  rbox(mb,[xf-2.9,2.5,0],XZ,YY,ZZ,[.6,1.12,1.2],P,.25,14,6);rbox(mb,[xf-2.0,3.62,0],XZ,YY,ZZ,[.7,.12,1.1],P,.4,12,4);
  for(let k=-2;k<=2;k++)rbox(mb,[xf-1.15,3.48,k*.35],XZ,YY,ZZ,[.03,.03,.06],MP.AMB,.3,6,4);
  for(const z of [-1,1]){tubeAB(mb,[xf-2.1,1.05,z*1.05],[xf-1.0,1.05,z*1.05],.32,14,MP.CHR);abox(mb,[xr+.3,1.0,z*.45],[2.3,.13,.07],MP.DARK);}
  abox(mb,[xr,1.3,0],[.62,.06,.62],MP.DARK);
  const tops=[];for(const z of [-1,1]){const base=[xf-2.25,1.3,z*1.18],top=[xf-2.25,3.95,z*1.18];tubeAB(mb,base,top,.1,12,MP.CHR);tops.push({p:top,d:[0,1,0],r:.1});}
  D.tips=tops;
  for(const z of [-1,1])abox(mb,[xr-.9,.75,z*1.1],[.02,.35,.25],MP.RUB);
  /* the tandem behind the physics' rear axle: two axles, duals on each */
  D.tandem=[.65,-.65];D.dual=.16;
}
const MESH_OF={quad:meshQuad,sxs:meshSxs,golf:meshGolf,kart:meshKart,tractor:meshTractor,semi:meshSemi};
/* a machine's meshes and the design numbers the game reads off a car's (length, axles, heights, the hood camera) */
function buildMachine(b){
  const M=machOf(b),mb=new MB(),xf=M.xF,xr=M.xF-M.wb,L=M.L,lift=b.look.lift||0;
  const D={look:b.look,L,R:b.look.tyre.R,Rr:(b.look.tyreR||b.look.tyre).R,dy:lift,uC:L/2,uFa:L/2-xf,uRa:L/2-xr,B:{wb:M.wb,R0:M.R,L,ovF:L/2-xf,fit:{}},Hr:M.H+lift,pitch:0,tips:[],spares:[],machine:1};
  D.X=u=>D.uC-u;D.belt=()=>M.lampY+.2+lift;D.sill=()=>M.clear+lift;D.plan=()=>M.W/2;D.top=()=>M.H+lift;
  MESH_OF[M.kind](M,b,mb,D);
  /* the rider or driver */
  let rider=null;const s=M.riderS,R=M.R+lift;
  if(M.kind==='quad')rider=buildRider({s,hip:[xr+.38*M.s,R+.6*M.s,0],knee:[xf-.25*M.s,R+.55*M.s,.24*s],foot:[(xf+xr)/2-.02,R-.02*M.s,.3*M.s],hand:[xf-.12*M.s,R+.72*M.s,.3*M.s],helmet:M.s<1?'#ffd84a':'#e9e8e2',suit:M.s<1?'#2f74c8':'#2a2f3a',peak:1});
  else if(M.kind==='sxs')rider=buildRider({s,hip:[-.2,R+.45,-.32],knee:[.25,R+.48,.12],foot:[.55,R+.12,.12],hand:[.13,R+.8,.12],helmet:'#141416'});
  else if(M.kind==='golf')rider=buildRider({s,hip:[-.4,R+.62,-.25],knee:[0,R+.62,.12],foot:[.2,R+.18,.12],hand:[.15,R+.88,.12],suit:'#e9e8e2',suit2:'#2f4636',helmet:'#e9e8e2'});
  else if(M.kind==='kart')rider=buildRider({s,hip:[-.22,.28,0],knee:[.25,.38,.16],foot:[.5,.18,.14],hand:[.23,.45,.12],helmet:'#c8261e'});
  else if(M.kind==='tractor')rider=buildRider({s,hip:[xr-.4,1.55,0],knee:[xr+.05,1.45,.2],foot:[xr+.2,1.05,.28],hand:[xr+.25,1.88,.18],suit:'#3a4a6a',suit2:'#3a4a6a',helmet:'#9a6a32',peak:1});
  /* the hood (helmet) camera: just above the rider's eyes, or in the semi's cab */
  D.eye=M.kind==='semi'?[xf-.98,2.62,-.5]:rider?[rider.pivot[0]+.12*s,rider.pivot[1]+.7*s,rider.pivot[2]]:[0,M.H*.8,0];
  /* how far the helmet camera looks down: enough to see the bars, the wheel or the hood */
  D.eyeDown={quad:.2,kart:.22,sxs:.1,golf:.1,tractor:.12,semi:.06}[M.kind]||.1;
  const body=mb.build(),w=buildWheel(b.look.tyre),wr=b.look.tyreR?buildWheel(b.look.tyreR):w;
  const tris=mb.p.length/9+(w.tris+wr.tris)*2*(D.tandem?3:1)+(rider?rider.tris:0);
  return {body,hood:null,hide:null,D,wheel:w,wheelR:wr,rider,bay:null,engineOut:false,tris};
}
/* the hull a machine collides with: its corners low and high, and the rider's helmet on top */
function machHull(M,b,cg){
  const P=[],xf=M.xF,xr=M.xF-M.wb,lift=b.look.lift||0,lo=M.clear+lift+.03,mid=Math.max(lo+.1,M.lampY+lift),hi=M.H+lift,hw=M.W/2*.92,f=xf+(M.L/2-xf)*.95,r=-M.L/2*.95;
  const at=(x,y,z)=>P.push([x-cg[0],y-cg[1],z]);
  for(const x of [f,(xf+xr)/2,r])for(const z of [-hw,hw])at(x,lo,z);
  for(const x of [f,r])for(const z of [-hw,hw])at(x,mid,z);
  if(M.kind==='quad'){const hx=xr+.38*M.s,hy=M.R+lift+.6*M.s+.85*M.riderS;at(hx,hy,0);at(hx,hy-.4,-.25);at(hx,hy-.4,.25);}
  else for(const x of [M.kind==='semi'?xf-1.2:xf*.3,M.kind==='semi'?xf-3.4:xr*.6])for(const z of [-hw*.85,hw*.85])at(x,hi,z);
  at(f+.02,mid,0);at(r-.02,mid,0);
  return P;
}
