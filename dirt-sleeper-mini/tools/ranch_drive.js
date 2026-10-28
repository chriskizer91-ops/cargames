/* Drives each truck through the ranch's hard places with the game's physics (no rendering):
   straight through the mud pit, over the rock garden, up the hill climb, and a jump on the trail
   loop's first kicker. Reports where it got to, top speed, whether it rolled, and any NaNs.
   usage: node tools/ranch_drive.js [level] */
const fs=require('fs'),path=require('path'),vm=require('vm');
const src=f=>fs.readFileSync(path.join(__dirname,'..','src',f),'utf8');
const ctx={console,Math,Array,Object,Float32Array,Float64Array,Int32Array,Uint8Array,Uint16Array,Uint32Array,Number,String,JSON,Set,Map,isFinite,isNaN,performance,
  btoa:s=>Buffer.from(s).toString('base64'),atob:s=>Buffer.from(s,'base64').toString()};
vm.createContext(ctx);
const stub=`const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,TAU=Math.PI*2,PI=Math.PI;
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};const sgn=v=>v<0?-1:v>0?1:0;const wrapA=a=>{while(a>PI)a-=TAU;while(a<-PI)a+=TAU;return a;};
const SUVB={L:4.92,ovF:.93,wb:2.89,R0:.378};const MAT={COL:0,EMIT:15};
const BUILDS=[{id:'stock',name:'Stock',look:{lift:0,track:1.6,roof:'bars',tyre:{R:.378}}},{id:'sleeper',name:'Sleeper',look:{lift:-.05,track:1.62,roof:'rails',tyre:{R:.372}}},
 {id:'crawler',name:'Rock & Mud',look:{lift:.15,track:1.74,roof:'rack',tyre:{R:.47}}},{id:'race',name:'Race',look:{lift:-.1,track:1.76,roof:'none',tyre:{R:.345}}}];`;
vm.runInContext(stub+src('15_de_engine.js')+src('16_engines.js')+src('50_physmath.js')+src('51_tyre.js')+src('52_tune.js')+src('53_vehicle.js')+src('54_truckphys.js')+src('60_ranch.js')+
  '\nthis.makeTruck=makeTruck;this.qmat=qmat;this.mcol=mcol;this.Ranch=Ranch;this.setLow=setLow;this.setLockers=setLockers;',ctx);
const {makeTruck,qmat,mcol,Ranch}=ctx,DT=1/240,level=process.argv[2]||'real';
const W=Ranch.buildRanch(),world=new Ranch.RanchWorld(W),D=W.D;
const yawOf=(dx,dz)=>Math.atan2(-dz,dx);
function place(v,x,z,yaw){const y=W.heightAt(x,z);v.place([x,y+.05,z],yaw);for(const w of v.wheels){w.comp=0;w.w=0;}v.pt.st='run';v.pt.we=v.pt.e.idle*Math.PI*2/60;for(let i=0;i<240;i++)v.step(DT,{thr:0,brk:1,steer:0});v.rev=false;v.pt.rev=false;v.revT=0;v.v=[0,0,0];v.w=[0,0,0];}
/* steer toward a target point, like a careful driver */
function drive(v,tx,tz,secs,thr=1,stopD=3){
  let t=0,vmax=0,minUp=1,nan=false;
  for(;t<secs;t+=DT){const M=qmat(v.q),F=mcol(M,0),dx=tx-v.p[0],dz=tz-v.p[2],d=Math.hypot(dx,dz);if(d<stopD)break;
    const want=Math.atan2(-dz,dx),have=Math.atan2(-F[2],F[0]);let e=want-have;while(e>Math.PI)e-=2*Math.PI;while(e<-Math.PI)e+=2*Math.PI;
    v.step(DT,{steer:Math.max(-1,Math.min(1,-e*2)),thr,brk:0});vmax=Math.max(vmax,v.speed);minUp=Math.min(minUp,mcol(qmat(v.q),1)[1]);
    if(!isFinite(v.p[0])||!isFinite(v.p[1])){nan=true;break;}}
  return {t,vmax,minUp,nan,d:Math.hypot(tx-v.p[0],tz-v.p[2])};
}
const runs=[
  ['mud pit',v=>{place(v,D.mud.x+D.mud.rx+9,D.mud.z,Math.PI);if(v.c.diff.can.r)ctx.setLockers(v,true);return drive(v,D.mud.x-D.mud.rx-8,D.mud.z,25,1);}],
  ['rock garden',v=>{const R=D.rocks;place(v,R.x0-8,R.z0+22,0);if(v.c.diff.can.low)ctx.setLow(v,true);if(v.c.diff.can.r)ctx.setLockers(v,true);return drive(v,R.x0+R.w+4,R.z0+22,45,.6);}],
  ['hill climb',v=>{const c=W.climb,s0=3,p=c.at(s0),d=c.dir(s0);place(v,p[0],p[1],yawOf(d[0],d[1]));let r,T=0,vm=0,mu=1;for(let s=12;s<=c.len;s+=8){const q=c.at(s);r=drive(v,q[0],q[1],20,.65,4);T+=r.t;vm=Math.max(vm,r.vmax);mu=Math.min(mu,r.minUp);if(r.nan||r.t>=20)break;}r.t=T;r.vmax=vm;r.minUp=mu;return r;}],
  ['mud track lap',v=>{const c=W.mudTrack,p=c.at(8),d=c.dir(8);place(v,p[0],p[1],yawOf(d[0],d[1]));let r,T=0;for(let s=20;s<=c.len+6;s+=10){const q=c.at(s%c.len);r=drive(v,q[0],q[1],15,.75,5);T+=r.t;if(r.nan||r.t>=15)break;}r.t=T;return r;}],
  ['kicker jump',v=>{const k=W.kick[0];place(v,k.x-k.dx*60,k.z-k.dz*60,yawOf(k.dx,k.dz));return drive(v,k.x+k.dx*40,k.z+k.dz*40,15,1);}]
];
console.log('level',level);
for(let i=0;i<4;i++){
  const out=[];
  for(const [name,fn] of runs){const v=makeTruck(i,world);v.setAssists(level);const r=fn(v);
    out.push(`${name}: ${r.nan?'NaN!':r.d<8?'made it':'stopped '+r.d.toFixed(0)+' m short'} in ${r.t.toFixed(1)} s, top ${(r.vmax*2.237).toFixed(0)} mph${r.minUp<.2?', ROLLED':r.minUp<.7?', leaned '+(Math.acos(r.minUp)*57.3).toFixed(0)+'°':''}`);}
  console.log(ctx.BUILDS?'':'',['Stock','Sleeper','Rock & Mud','Race'][i].padEnd(10),out.join(' | '));
}
