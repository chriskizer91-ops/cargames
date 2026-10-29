/* Drives each truck on a flat world with the game's physics: settles it, launches it, and throws it
   into a hard turn at speed under each driving level. Reports ride height, 0-60, top speed and
   whether it stayed on its wheels. usage: node tools/phys_check.js */
const fs=require('fs'),path=require('path'),vm=require('vm');
const src=f=>fs.readFileSync(path.join(__dirname,'..','src',f),'utf8');
const ctx={console,Math,Array,Object,Float32Array,Float64Array,Int32Array,Uint8Array,Number,String,JSON,Set,Map,isFinite,isNaN,btoa:s=>Buffer.from(s).toString('base64'),atob:s=>Buffer.from(s,'base64').toString()};
vm.createContext(ctx);
const stub=`const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,TAU=Math.PI*2,PI=Math.PI;
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};const sgn=v=>v<0?-1:v>0?1:0;const wrapA=a=>{while(a>PI)a-=TAU;while(a<-PI)a+=TAU;return a;};
const SUVB={L:4.92,ovF:.93,wb:2.89,R0:.378};
const BUILDS=[{id:'stock',name:'Stock',look:{lift:0,track:1.6,roof:'bars',tyre:{R:.378}}},{id:'sleeper',name:'Sleeper',look:{lift:-.05,track:1.62,roof:'rails',tyre:{R:.372}}},
 {id:'crawler',name:'Rock & Mud',look:{lift:.15,track:1.74,roof:'rack',tyre:{R:.47}}},{id:'race',name:'Race',look:{lift:-.1,track:1.76,roof:'none',tyre:{R:.345}}}];`;
vm.runInContext(stub+src('15_de_engine.js')+src('16_engines.js')+src('50_physmath.js')+src('51_tyre.js')+src('52_tune.js')+src('53_vehicle.js')+src('54_truckphys.js')+
  '\nthis.makeTruck=makeTruck;this.FlatWorld=FlatWorld;this.qmat=qmat;this.mcol=mcol;this.setLow=setLow;this.setLockers=setLockers;',ctx);
const {makeTruck,FlatWorld,qmat,mcol}=ctx,DT=1/240;
function settle(v){v.place([0,0,0],0);v.pt.st='run';v.pt.we=v.pt.e.idle*Math.PI*2/60;for(let i=0;i<480;i++)v.step(DT,{thr:0,brk:1,steer:0});v.rev=false;v.pt.rev=false;v.revT=0;v.v=[0,0,0];v.w=[0,0,0];}
function upY(v){return mcol(qmat(v.q),1)[1];}
for(const surf of ['strip','dirt']){
  console.log(`\n=== on ${surf} ===`);
  for(let i=0;i<4;i++)for(const lvl of ['real','middle','kids']){
    const v=makeTruck(i,new FlatWorld(surf));v.setAssists(lvl);settle(v);
    const ride=v.p[1],wl=v.wheels.map(w=>w.len.toFixed(3)).join('/');
    let t=0,t60=0,vmax=0;for(;t<14;t+=DT){v.step(DT,{thr:1,brk:0,steer:0});if(!t60&&v.speed>26.82)t60=t;vmax=Math.max(vmax,v.speed);}
    /* hard turn at whatever speed it reached, then hold the wheel over for 3 s */
    let minUp=1,maxRoll=0,yaw0=Math.atan2(mcol(qmat(v.q),0)[2],mcol(qmat(v.q),0)[0]),turned=0,pf=mcol(qmat(v.q),0);const v40=v.speed;
    for(let k=0;k<720;k++){v.step(DT,{thr:k<240?.6:0,brk:0,steer:1});const u=upY(v);minUp=Math.min(minUp,u);const f=mcol(qmat(v.q),0);turned+=Math.asin(Math.max(-1,Math.min(1,pf[0]*f[2]-pf[2]*f[0])));pf=f;}
    console.log(`${v.build.name.padEnd(10)} ${lvl.padEnd(6)} cg ${ride.toFixed(3)} m (susp ${wl})  0-60 ${t60?t60.toFixed(2)+' s':'  -  '}  ${(vmax*2.237).toFixed(0)} mph in 14 s  turn from ${(v40*2.237).toFixed(0)} mph: max lean ${(Math.acos(Math.min(1,minUp))*57.3).toFixed(1)}° turned ${(turned*57.3).toFixed(0)}° end ${(v.speed*2.237).toFixed(0)} mph ${minUp<.2?'ROLLED':''}`);
  }
}
/* a slow, full-lock turn and a 30 mph swerve: does each level keep it upright? */
console.log('\n=== swerve at 30 mph on dirt ===');
for(let i=0;i<4;i++)for(const lvl of ['real','middle','kids']){
  const v=makeTruck(i,new FlatWorld('dirt'));v.setAssists(lvl);settle(v);
  while(v.speed<13.4)v.step(DT,{thr:1,brk:0,steer:0});
  let minUp=1;for(let k=0;k<960;k++){const s=k<160?1:k<320?-1:k<480?1:0;v.step(DT,{thr:.3,brk:0,steer:s});minUp=Math.min(minUp,upY(v));}
  console.log(`${v.build.name.padEnd(10)} ${lvl.padEnd(6)} lowest up ${minUp.toFixed(2)} ${minUp<.2?'ROLLED':''}  end ${(v.speed*2.237).toFixed(0)} mph`);
}
