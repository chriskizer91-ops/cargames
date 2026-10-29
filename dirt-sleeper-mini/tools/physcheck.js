/* Steps Dirt Sleeper Mini 4's own physics (tools/ref/dsm4-physics.js, copied unchanged from its file) and
   the game's garbage-free physics (src/40_physics.js, src/41_ground.js) side by side: the same four SUV
   builds, the same start, the same inputs, on the same bumpy mixed-surface ground with posts and a box,
   at every driving level. Identical sums in the same order give bit-identical cars, so any difference
   at all is a bug. Also times a step of each.
   usage: node tools/physcheck.js */
const fs=require('fs'),path=require('path');
const SRC=path.resolve(__dirname,'..','src')+'/';
const pre=`const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,TAU=Math.PI*2,PI=Math.PI;
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};const sgn=v=>v<0?-1:v>0?1:0;\n`;
const DE=fs.readFileSync(SRC+'15_digital_engine.js','utf8');
/* the reference: DSM4's engines, builds, physics, chassis and RanchWorld */
const stubs=`const MM=new Proxy({},{get:()=>0}),MAT=new Proxy({},{get:()=>0}),V=()=>0,lin=()=>[0,0,0];const SUVB={L:4.92,ovF:.93,wb:2.89,R0:.378};\n`;
const refCode=pre+DE+'\n'+stubs+fs.readFileSync(path.join(__dirname,'ref','dsm4-physics.js'),'utf8')+
  '\nreturn {SIM,BUILDS,engineSpec,makeTruck,RanchWorld,Vehicle,TUNE};';
const REF=new Function(refCode)();
/* the port */
const newCode=pre+DE+'\n'+fs.readFileSync(SRC+'40_physics.js','utf8')+'\n'+fs.readFileSync(SRC+'41_ground.js','utf8')+'\nreturn {Vehicle,GroundWorld,ASSISTS};';
const NEW=new Function(newCode)();

/* the test ground: rolling bumps, a ledge, patches of every surface, two posts and a box */
const SURFS=['dirt','gravel','mud','rock','concrete','asphalt','trail','grass'];
function ground(x,z){
  let y=.35*Math.sin(x*.13)*Math.cos(z*.11)+.1*Math.sin(x*.41+z*.37),dx=.35*.13*Math.cos(x*.13)*Math.cos(z*.11)+.1*.41*Math.cos(x*.41+z*.37),
    dz=-.35*.11*Math.sin(x*.13)*Math.sin(z*.11)+.1*.37*Math.cos(x*.41+z*.37);
  /* a 20 cm ledge across x = 40 */
  const e=1/(1+Math.exp(-(x-40)*25));y+=.2*e;dx+=.2*25*e*(1-e);
  const l=Math.hypot(dx,1,dz);
  return {y,n:[-dx/l,1/l,-dz/l],surf:SURFS[((Math.floor(x/15)+Math.floor(z/15))%8+8)%8]};
}
const COLS=[{t:'c',x:25,z:6,r:.25,top:1.5},{t:'c',x:-30,z:-12,r:.4,top:2},{x0:60,x1:63,z0:-5,z1:5,top:1.2}];
const colliders={near:()=>COLS};
const refWorld=new REF.RanchWorld({groundAt:ground,colliders});
const newWorld=new NEW.GroundWorld((x,z,o)=>{const g=ground(x,z);o.y=g.y;o.n[0]=g.n[0];o.n[1]=g.n[1];o.n[2]=g.n[2];o.surf=g.surf;},colliders,790);

/* inputs: a scripted drive with launches, full throttle, steering waves, brakes, handbrake and nitrous */
function inp(t){
  const ph=t%14;
  return {steer:ph<3?0:Math.sin(t*1.3)*(ph>9?1:.6),thr:ph<1?1:ph<1.5?0:ph<8?1:ph<9?0:.7,brk:ph<1?1:(ph>8&&ph<9)?1:0,hb:ph>11&&ph<11.6?1:0,nos:ph>4&&ph<6,lock:false};
}
const fields=v=>[...v.p,...v.q,...v.v,...v.w,v.pt.we,v.pt.gear,v.steer,...v.wheels.flatMap(w=>[w.w,w.Fz,w.comp,w.Fx,w.Fy])];
let worst=0,report=[];
for(let i=0;i<4;i++){
  for(const level of ['real','middle','kids']){
    const r=REF.makeTruck(i,refWorld);r.setAssists(level);
    const c=Object.assign({},r.c,{hull:r.hull});
    const n=new NEW.Vehicle(c,r.spec,newWorld);n.setAssists(level);
    for(const v of [r,n]){v.place([0,ground(0,0).y+.4,0],.3);v.pt.start();}
    let maxd=0,first=-1,steps=0;
    for(let k=0;k<240*42;k++){
      const t=k/240,a=inp(t);
      r.step(1/240,a);n.step(1/240,a);steps++;
      const A=fields(r),B=fields(n);let d=0;for(let q=0;q<A.length;q++){const e=Math.abs(A[q]-B[q]);if(!(e<=d))d=isNaN(e)?Infinity:e;}
      if(d>0&&first<0)first=k;maxd=Math.max(maxd,d);
    }
    worst=Math.max(worst,maxd);
    report.push(`${REF.BUILDS[i].id.padEnd(8)} ${level.padEnd(7)} ${steps} steps  max difference ${maxd.toExponential(2)}${first>=0?'  (first at step '+first+')':''}  ended at x ${r.p[0].toFixed(1)} z ${r.p[2].toFixed(1)}  ${(r.speed*2.237).toFixed(0)} mph`);
  }
}
console.log(report.join('\n'));
console.log('worst difference over all runs:',worst);
/* speed: the same drive, each a few times over */
function bench(Mk,world){const v=Mk();v.place([0,ground(0,0).y+.4,0],.3);v.pt.start();const N=240*20;const t=process.hrtime.bigint();for(let k=0;k<N;k++)v.step(1/240,inp(k/240));return Number(process.hrtime.bigint()-t)/1e3/N;}
for(let rep=0;rep<2;rep++){
  const tr=bench(()=>REF.makeTruck(1,refWorld));
  const tn=bench(()=>{const r=REF.makeTruck(1,refWorld);return new NEW.Vehicle(Object.assign({},r.c,{hull:r.hull}),r.spec,newWorld);});
  console.log(`step: DSM4 ${tr.toFixed(1)} us, port ${tn.toFixed(1)} us`);
}
