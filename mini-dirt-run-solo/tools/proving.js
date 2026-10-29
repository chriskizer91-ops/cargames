/* The proving ground in Node: every build on the game's physics, on flat ground, with a robot driver.
   usage: node tools/proving.js [build ids...]
   Each build settles onto its springs, then:
     drag     launch (off the trans-brake where it has one) and hold it flat: 0-60, 0-100, the quarter mile,
              top speed; Middle level, so traction control is on, the way a player launches.
     grip     lateral grip at 20 and 35 m/s on tarmac and 15 m/s on gravel: a steady speed with the
              steering wound on slowly, the best lateral acceleration held for half a second.
     brakes   60-0 mph with ABS.
   The numbers are printed beside the rankings' (design/ratings.json) so the physics and the ratings can be
   kept in step. */
const fs=require('fs'),path=require('path');
const SRC=path.resolve(__dirname,'..','src')+'/';
const MODS=['10_core','12_gl_mesh','13_lit','14_loft','15_digital_engine','16_engines','21_suv','22_faces','23_parts','24_4x4','25_coupe','26_wagon',
  '27_pickup','28_muscle','29_hatch','30_wheels','31_engine_bay','32_builds','34_machines','40_physics','41_ground','42_chassis','43_sim'];
/* the car modules need a page only to draw; these stand in for it */
const STUB=`const document={getElementById:()=>null,createElement:()=>({getContext:()=>null,style:{}})},matchMedia=()=>({matches:false}),localStorage={getItem:()=>null,setItem:()=>{}},window={};\n`;
const X=new Function(STUB+MODS.map(m=>fs.readFileSync(SRC+m+'.js','utf8')).join('\n')+
  '\nreturn {BUILDS,CARS,specOf,buildChassis,makeCar,cgOf,GroundWorld,setLow,setLockers};')();
module.exports=X;
if(require.main!==module)return;

const DT=1/240;
/* the robot's hands: aim at a point a little way down the road (further the faster it goes) and turn the
   wheels to the arc that reaches it, as a share of the lock the steering allows at this speed */
function aim(v,tx,tz){
  /* side: how far right of the car the point is (the body's right axis is the matrix's third column) */
  const dx=tx-v.p[0],dz=tz-v.p[2],L2=dx*dx+dz*dz,side=dx*v.M[2]+dz*v.M[8],k=2*side/Math.max(L2,1),ang=Math.atan(v.c.wb*k);
  const lim=Math.min(v.c.lock,v.tyre.aPk*1.6+v.c.wb*9/Math.max(v.speed*v.speed,1));
  return Math.max(-1,Math.min(1,ang/lim));
}
const ahead=v=>Math.max(8,v.speed*.9);
const flat=surf=>new X.GroundWorld((x,z,o)=>{o.y=0;o.n[0]=0;o.n[1]=1;o.n[2]=0;o.surf=surf;},null,1e9);
const yawOf=v=>Math.atan2(-v.M[6],v.M[0]);
/* put a build on the ground, start it and let it settle */
function ready(i,surf,level){
  const v=X.makeCar(i,flat(surf));v.setAssists(level);v.place([0,0,0],0);v.pt.start();
  const I={steer:0,thr:0,brk:0,hb:0,nos:false};for(let k=0;k<240*3;k++)v.step(DT,I);
  return v;
}
function drag(i,surf='asphalt'){
  const v=ready(i,surf,'middle'),e=v.spec,I={steer:0,thr:1,brk:0,hb:0,nos:false};
  if(e.launch){I.brk=1;for(let k=0;k<240*1.5;k++)v.step(DT,I);I.brk=0;}
  const x0=v.p[0];let t=0,t60=null,t100=null,q=null,top=0,stall=0;
  for(let k=0;k<240*150;k++){
    /* hold it straight down z = 0 */
    I.steer=aim(v,v.p[0]+ahead(v),0);
    const xp=v.p[0];v.step(DT,I);t+=DT;const s=v.vf;
    if(t60===null&&s>=26.82)t60=t;if(t100===null&&s>=44.7)t100=t;
    if(!q&&v.p[0]-x0>=402.336)q={t,v:s};
    if(s>top+.01){top=s;stall=0;}else if((stall+=DT)>6&&q)break;
  }
  return {t60,t100,q,top,flip:v.M[4]<.5};
}
/* lateral grip: hold a steady speed and wind the steering on slowly (the ramp-steer test). The best
   lateral acceleration held for half a second before the car spins, or before more lock stops giving more
   grip, is the car's grip at that speed. Traction control on, no other helpers */
const GRIPAID={id:'grip',name:'Grip test',steer:0,esc:0,tc:1,abs:1,drift:0,auto:1,catchSpin:0};
function grip(i,speed,surf='asphalt'){
  const v=ready(i,surf,'real'),I={steer:0,thr:0,brk:0,hb:0,nos:false};v.aid=GRIPAID;
  /* up to speed in a straight line */
  for(let k=0;k<240*60&&v.speed<speed;k++){I.thr=1;I.steer=aim(v,v.p[0]+ahead(v),v.p[2]);v.step(DT,I);}
  const yaw0=Math.atan2(-v.M[6],v.M[0]);let st=0,best=0,win=0,n=0;
  for(let k=0;k<240*40;k++){
    st=Math.min(1,st+DT/30);I.steer=st;
    I.thr=Math.max(0,Math.min(1,(speed-v.speed)*.8+.2));I.brk=v.speed>speed+2?.3:0;
    v.step(DT,I);
    /* lateral acceleration along the body's right axis, over half a second */
    win+=v.accB[2];n++;if(n===120){best=Math.max(best,Math.abs(win/n)/9.81);win=0;n=0;}
    if(Math.abs(v.beta)>.35||v.M[4]<.5)break;
  }
  return best;
}
function brakes(i){
  const v=ready(i,'asphalt','real'),I={steer:0,thr:1,brk:0,hb:0,nos:false};
  for(let k=0;k<240*60&&v.vf<27.5;k++){I.steer=aim(v,v.p[0]+ahead(v),0);v.step(DT,I);}
  I.thr=0;I.brk=1;let x0=null;
  for(let k=0;k<240*20;k++){I.steer=aim(v,v.p[0]+ahead(v),0);v.step(DT,I);if(x0===null&&v.vf<=26.82)x0=v.p[0];if(x0!==null&&v.speed<.3)return v.p[0]-x0;}
  return null;
}
const want=process.argv.slice(2);
const rat=JSON.parse(fs.readFileSync(path.resolve(__dirname,'..','design','ratings.json'),'utf8')).cars;
const f=(x,d=1)=>x==null?'  -  ':x.toFixed(d);
console.log('build          0-60   0-100  1/4 mile        top | grip 20m/s 35m/s gravel | 60-0 ft | ranked: 0-60  grip  dirt');
for(let i=0;i<X.BUILDS.length;i++){
  const b=X.BUILDS[i];if(want.length&&!want.includes(b.id))continue;
  const d=drag(i),g20=grip(i,20),g35=grip(i,35),gg=grip(i,15,'gravel'),bd=brakes(i),r=rat.find(c=>c.id===b.id);
  console.log(`${b.id.padEnd(13)} ${f(d.t60).padStart(5)} ${f(d.t100).padStart(6)}  ${d.q?f(d.q.t,2)+' @ '+f(d.q.v*2.237,0):'   -    '}  ${f(d.top*2.237,0).padStart(4)} |      ${f(g20,2)}  ${f(g35,2)}   ${f(gg,2)}  | ${f(bd&&bd*3.281,0).padStart(5)}   |        ${f(r.z60).padStart(4)}  ${f(r.latG,2)}  ${f(r.dirtLat,2)}${d.flip?'  FLIPPED ON THE STRIP':''}`);
}
