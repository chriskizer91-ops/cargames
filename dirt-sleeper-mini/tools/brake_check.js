/* Brakes and standing starts: 60-0 mph on dirt, holding on the steepest part of the hill climb,
   and pulling away from a standstill in the mud track. usage: node tools/brake_check.js */
const fs=require('fs'),path=require('path'),vm=require('vm');
const src=f=>fs.readFileSync(path.join(__dirname,'..','src',f),'utf8');
const ctx={console,Math,Array,Object,Float32Array,Float64Array,Int32Array,Uint8Array,Uint16Array,Uint32Array,Number,String,JSON,Set,Map,isFinite,isNaN,performance,btoa:s=>s,atob:s=>s};
vm.createContext(ctx);
const stub=`const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,TAU=Math.PI*2,PI=Math.PI;
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};const sgn=v=>v<0?-1:v>0?1:0;const wrapA=a=>a;
const SUVB={L:4.92,ovF:.93,wb:2.89,R0:.378};const MAT={COL:0,EMIT:15};
const BUILDS=[{id:'stock',name:'Stock',look:{lift:0,track:1.6,roof:'bars',tyre:{R:.378}}},{id:'sleeper',name:'Sleeper',look:{lift:-.05,track:1.62,roof:'rails',tyre:{R:.372}}},
 {id:'crawler',name:'Rock & Mud',look:{lift:.15,track:1.74,roof:'rack',tyre:{R:.47}}},{id:'race',name:'Race',look:{lift:-.1,track:1.76,roof:'none',tyre:{R:.345}}}];`;
vm.runInContext(stub+src('15_de_engine.js')+src('16_engines.js')+src('50_physmath.js')+src('51_tyre.js')+src('52_tune.js')+src('53_vehicle.js')+src('54_truckphys.js')+src('60_ranch.js')+'\nthis.makeTruck=makeTruck;this.Ranch=Ranch;this.FlatWorld=FlatWorld;',ctx);
const W=ctx.Ranch.buildRanch(),world=new ctx.Ranch.RanchWorld(W),DT=1/240;
function place(v,wd,x,z,yaw){const y=wd===world?W.heightAt(x,z):0;v.place([x,y+.05,z],yaw);for(const w of v.wheels){w.comp=0;w.w=0;}v.pt.st='run';v.pt.we=v.pt.e.idle*Math.PI*2/60;for(let i=0;i<240;i++)v.step(DT,{thr:0,brk:1,steer:0});v.rev=false;v.pt.rev=false;v.revT=0;v.v=[0,0,0];v.w=[0,0,0];}
/* steepest point of the climb */
let best=0,bs=0;for(let s=5;s<W.climb.len-5;s+=1){const a=W.climb.at(s),b=W.climb.at(s+2),g=(W.heightAt(b[0],b[1])-W.heightAt(a[0],a[1]))/2;if(g>best){best=g;bs=s;}}
for(let i=0;i<4;i++){
  const out=[];
  {const fw=new ctx.FlatWorld('dirt'),v=ctx.makeTruck(i,fw);place(v,fw,0,0,0);while(v.speed<26.82)v.step(DT,{thr:1,brk:0,steer:0});const x0=v.p[0];let t=0;while(v.speed>.3&&t<15){v.step(DT,{thr:0,brk:1,steer:0});t+=DT;}
    out.push(`60-0 on dirt ${(v.p[0]-x0).toFixed(1)} m in ${t.toFixed(2)} s`);}
  {const p=W.climb.at(bs),d=W.climb.dir(bs),v=ctx.makeTruck(i,world);place(v,world,p[0],p[1],Math.atan2(-d[1],d[0]));const x0=v.p.slice();for(let k=0;k<720;k++)v.step(DT,{thr:0,brk:.45,hb:1,steer:0});
    out.push(`hold (brake .45 + handbrake) on ${(Math.atan(best)*57.3).toFixed(0)}° climb: slid ${Math.hypot(v.p[0]-x0[0],v.p[2]-x0[2]).toFixed(2)} m`);}
  {const c=W.mudTrack,p=c.at(8),d=c.dir(8),v=ctx.makeTruck(i,world);place(v,world,p[0],p[1],Math.atan2(-d[1],d[0]));const x0=v.p.slice();for(let k=0;k<720;k++)v.step(DT,{thr:1,brk:0,steer:0});
    out.push(`pull away in mud: ${Math.hypot(v.p[0]-x0[0],v.p[2]-x0[2]).toFixed(1)} m in 3 s`);}
  console.log(['Stock','Sleeper','Rock & Mud','Race'][i].padEnd(10),out.join(' | '));
}
/* climbing from rest on a steady slope of loose trail, half throttle: a tilted plane */
class Slope{constructor(deg,surf){this.k=Math.tan(deg*Math.PI/180);this.surf=surf;const l=Math.hypot(this.k,1);this.n=[-this.k/l,1/l,0];}
  locate(){return {i:0,s:0,d:0};}ground(x,z){return {y:x*this.k,n:this.n,surf:this.surf,i:0};}
  raycast(o,d,maxT){const n=this.n,den=d[0]*n[0]+d[1]*n[1]+d[2]*n[2];if(den>-1e-4)return null;const t=((o[0]*this.k-o[1])*n[1]*-1+0)/den;
    const tt=-(n[0]*o[0]+n[1]*(o[1])+n[2]*o[2])/den;return tt<0||tt>maxT?null:{t:tt,p:[o[0]+d[0]*tt,o[1]+d[1]*tt,o[2]+d[2]*tt],n,surf:this.surf,i:0};}
  wall(){return null;}}
for(const deg of [20,25,30])for(let i=0;i<4;i++){const wd=new Slope(deg,'trail'),v=ctx.makeTruck(i,wd);v.place([0,0.05,0],0);for(const w of v.wheels){w.comp=0;w.w=0;}v.pt.st='run';v.pt.we=v.pt.e.idle*Math.PI*2/60;
  for(let k=0;k<480;k++)v.step(DT,{thr:0,brk:1,steer:0});v.rev=false;v.pt.rev=false;v.revT=0;v.v=[0,0,0];v.w=[0,0,0];const x0=v.p[0];let x1=x0;for(let k=0;k<1440;k++){v.step(DT,{thr:.5,brk:0,steer:0});}
  console.log(`${deg}° trail`,['Stock','Sleeper','Rock & Mud','Race'][i].padEnd(10),`${(v.p[0]-x0).toFixed(1)} m up the slope in 6 s, ${(v.speed*2.237).toFixed(0)} mph`);}
