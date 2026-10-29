/* =====================================================================================
   THE STAGE — two photo studios. The dark bay is the Shiftlight garage: a glossy floor, a
   turntable, an infinity cove ringed with tall strip lights and an LED line at its foot. The
   light cyc is a pale grey seamless wall, like the backdrop on the concept sheets.
   ===================================================================================== */
const STAGES={
  dark:{id:1,sun:[0,1,0],sunCol:[0,0,0],sky:lin('#3a3a4c',.34),gnd:lin('#1c1c22',.24),fog:lin('#06060a'),fogD:.016,
    lights:[[3.6,5.4,3.2,16,[1,.95,.88],2.6],[-4.2,4,-3.6,15,[.75,.82,1],1.3],[-5.6,2.3,4.4,12,[1,.35,.5],1.15],[5.6,2.3,-4.8,12,[.35,.75,1],1.3],[0,6.4,0,11,[1,1,1],1.2],[0,1.2,7,9,[1,.97,.92],.7]],
    /* the garage keeps the turntable's key, rim and top lights and hangs three over the parked cars */
    garage:[0,1,2,3,4],rowLight:[[1,.95,.86],2.4]},
  light:{id:2,sun:V3.norm([.45,.85,.35]),sunCol:lin('#fff4e6',1.25),sky:lin('#c9c7c3',.62),gnd:lin('#8e8a85',.42),fog:lin('#bdbab5'),fogD:.0035,
    lights:[[4,4.5,4,14,[1,.97,.92],1.0],[-5,3,-3,14,[.85,.9,1],.6],[0,6,0,10,[1,1,1],.6]],
    garage:[0,1,2],rowLight:[[1,.97,.92],.8]}
};
/* ---------- the garage: the same shed made big enough to park every car round the back of it ---------- */
const GAR={sc:1.45,R:12,step:.235};
/* a car's bay: spread in an arc behind the turntable, nose in toward it. th is the bay's direction
   from the middle in the camera's terms (0 is +X, turning toward -Z); yaw turns the car to face in */
function spotOf(car){const k=CARS.findIndex(c=>c[0]===car),th=PI+(k-(CARS.length-1)/2)*GAR.step;
  return {th,yaw:th+PI,p:[GAR.R*Math.cos(th),0,-GAR.R*Math.sin(th)]};}
function stageLights(S,garage){
  if(!garage)return S.lights;
  const L=S.garage.map(k=>S.lights[k]);
  for(const d of [-.45,0,.45]){const th=PI+d;L.push([11.4*Math.cos(th),5.4,-11.4*Math.sin(th),11.5,S.rowLight[0],S.rowLight[1]]);}
  return L;
}
function buildStage(kind,garage){
  const sc=garage?GAR.sc:1,m=new MB(),SEG=garage?112:72,FY=-.06,arc=(i,r,y)=>{const a=i/SEG*TAU;return [Math.cos(a)*r*sc,y,Math.sin(a)*r*sc];},dark=kind==='dark';
  const FL=dark?[[0,'#2c2c33'],[3.3,'#2a2a31'],[6.5,'#202026'],[10,'#17171b'],[12.3,'#111114']]:[[0,'#a7a49f'],[3.3,'#a39f9a'],[6.5,'#9c9893'],[10,'#97938e'],[12.3,'#95918c']];
  for(let k=0;k<FL.length-1;k++){const [r0,h0]=FL[k],[r1,h1]=FL[k+1],c0=lin(h0),c1=lin(h1);
    for(let i=0;i<SEG;i++)m.quadC(arc(i,r0,FY),arc(i+1,r0,FY),arc(i+1,r1,FY),arc(i,r1,FY),c0,c0,c1,c1,0,MAT.FLOOR);}
  const CV=[[12.3,FY],[12.75,.08],[13.1,.45],[13.28,1.05],[13.32,2],[13.32,9.5]];
  const cvc=y=>dark?V3.lerp(lin('#2a2a32'),lin('#09090c'),Math.sqrt(clamp((y+.06)/9.5,0,1))):V3.lerp(lin('#a09d98'),lin('#c4c1bc'),Math.sqrt(clamp((y+.06)/9.5,0,1)));
  for(let k=0;k<CV.length-1;k++){const [r0,y0]=CV[k],[r1,y1]=CV[k+1],c0=cvc(y0),c1=cvc(y1);for(let i=0;i<SEG;i++)m.quadC(arc(i,r0,y0),arc(i+1,r0,y0),arc(i+1,r1,y1),arc(i,r1,y1),c0,c0,c1,c1,0,MAT.COL);}
  if(dark){
    for(let i=0;i<SEG;i++)m.quad(arc(i,12.68,.04),arc(i+1,12.68,.04),arc(i+1,12.68,.12),arc(i,12.68,.12),[.85,.9,1],.55,MAT.EMIT);
    const NS=garage?12:8;
    for(let i=0;i<NS;i++){const a=i/NS*TAU,cx=Math.cos(a)*13.24*sc,cz=Math.sin(a)*13.24*sc,tx=-Math.sin(a)*.28,tz=Math.cos(a)*.28;
      m.quad([cx-tx,1.25,cz-tz],[cx+tx,1.25,cz+tz],[cx+tx,6.6,cz+tz],[cx-tx,6.6,cz-tz],[.85,.9,1],.7,MAT.EMIT);}
    /* the house name in dots on the wall behind the turntable; in the garage, high on the wall over the parked cars */
    const word='DIRT SLEEPER MINI',dp=garage?.13:.11,a0=garage?PI:2.52,y0=garage?3.7:2.75,rw=13.2*sc,tw=word.length*6*dp;
    for(let k=0;k<word.length;k++){const g=G5[word[k]];if(!g)continue;for(let r=0;r<7;r++)for(let c=0;c<5;c++)if((g[r]>>(4-c))&1){
      const a=a0+((k*6+c)*dp-tw/2)/rw,y=y0-r*dp,px=Math.cos(a)*rw,pz=Math.sin(a)*rw,h=garage?.047:.04;m.box(px-h,y-h,pz-h,px+h,y+h,pz+h,[1,.24,.32],.55,MAT.EMIT);}}
  }
  if(garage){
    /* painted bays: a line either side of every car, and a stop line across the front */
    const pc=dark?lin('#8c6d1f'):lin('#b38f2c'),y=FY+.012,r0=GAR.R-2.75,r1=GAR.R+3.2,lw=.06,n=CARS.length;
    const at=(th,r,o)=>[r*Math.cos(th)-o*Math.sin(th),y,-r*Math.sin(th)-o*Math.cos(th)];
    for(let k=0;k<=n;k++){const th=PI+(k-n/2)*GAR.step;m.quad(at(th,r0,-lw),at(th,r1,-lw),at(th,r1,lw),at(th,r0,lw),pc,0,MAT.FLOOR);}
    const S=48,t0=PI-n/2*GAR.step,t1=PI+n/2*GAR.step;
    for(let i=0;i<S;i++){const a=t0+(t1-t0)*i/S,b=t0+(t1-t0)*(i+1)/S;m.quad(at(a,r0-lw,0),at(b,r0-lw,0),at(b,r0+lw,0),at(a,r0+lw,0),pc,0,MAT.FLOOR);}
  }
  const t=new MB(),TT=3.3,tc=dark?lin('#33333b'):lin('#b2afaa'),tarc=(i,r,y)=>{const a=i/72*TAU;return [Math.cos(a)*r,y,Math.sin(a)*r];};
  for(let i=0;i<72;i++){t.tri([0,0,0],tarc(i,TT,0),tarc(i+1,TT,0),tc,0,MAT.FLOOR);t.quad(tarc(i,TT,FY),tarc(i+1,TT,FY),tarc(i+1,TT,0),tarc(i,TT,0),dark?lin('#0c0c0f'):lin('#7d7a75'),0,MAT.COL);
    t.quad(tarc(i,TT-.08,.002),tarc(i+1,TT-.08,.002),tarc(i+1,TT-.03,.002),tarc(i,TT-.03,.002),dark?[1,.22,.3]:lin('#8a8780'),dark?.45:0,dark?MAT.EMIT:MAT.COL);}
  return {stage:m.build(),table:t.build(),tris:(m.p.length+t.p.length)/9};
}

