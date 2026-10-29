/* The garage's ratings against the game's own physics on the real places: a robot drives every factory build
   (or the ones named) across the mud pit, up Red Hill and over the rock garden, with low range and lockers
   where the build has them, and prints its times beside the build's ratings for mud, mountain and rocks.
   The ratings come from a quick simulator, so this is how to see whether they put the cars in the right order.
   usage: node tools/terrain_check.js [preset ids...] */
const X=require('./load')({ranch:true});
const DT=1/240,W=X.Ranch.buildRanch(),world=new X.GroundWorld(W.groundInto,W.colliders,790),D=W.D;
const yawOf=(dx,dz)=>Math.atan2(-dz,dx);
function place(v,x,z,yaw){const y=W.heightAt(x,z);v.place([x,y+.05,z],yaw);for(const w of v.wheels){w.comp=0;w.w=0;}v.pt.st='run';v.pt.we=v.pt.e.idle*Math.PI*2/60;
  for(let i=0;i<240;i++)v.step(DT,{thr:0,brk:0,steer:0});v.v.fill(0);v.w.fill(0);v.rev=false;v.pt.rev=false;}
const aim=(v,tx,tz)=>{const F=[v.M[0],v.M[6]],want=Math.atan2(-(tz-v.p[2]),tx-v.p[0]),have=Math.atan2(-F[1],F[0]);let e=want-have;while(e>Math.PI)e-=2*Math.PI;while(e<-Math.PI)e+=2*Math.PI;return Math.max(-1,Math.min(1,-e*2));};
/* drive at a target until close, out of time, rolled or NaN */
function drive(v,tx,tz,secs,thr,stop=4){let t=0,up=1;
  for(;t<secs;t+=DT){if(Math.hypot(tx-v.p[0],tz-v.p[2])<stop)break;v.step(DT,{thr,steer:aim(v,tx,tz)});up=Math.min(up,v.M[4]);if(!isFinite(v.p[0]))return {t,nan:1};if(v.M[4]<.2&&v.speed<1)return {t,rolled:1};}
  return {t,ok:Math.hypot(tx-v.p[0],tz-v.p[2])<stop+1,up};}
const fmt=r=>r.nan?'NaN':r.rolled?'ROLLED':r.lost?"off at "+Math.round(r.s)+"/"+Math.round(W.climb.len)+"m":r.ok?r.t.toFixed(1)+'s':'stuck';
const runs={
  mud:v=>{const M=D.mud;place(v,M.x+M.rx+9,M.z,Math.PI);if(v.c.diff.can.r)X.setLockers(v,true);return drive(v,M.x-M.rx-9,M.z,40,1);},
  /* up the climb like a careful driver: follow the path a few metres ahead, gas when slow, easy when quick */
  mountain:v=>{const c=W.climb,p=c.at(3),d=c.dir(3),H=D.hill;place(v,p[0],p[1],yawOf(d[0],d[1]));if(v.c.diff.can.low)X.setLow(v,true);if(v.c.diff.can.r)X.setLockers(v,true);
    let t=0,still=0;for(;t<150;t+=DT){const n=c.nearest(v.p[0],v.p[2],2);if(Math.hypot(v.p[0]-H.x,v.p[2]-H.z)<22||n&&n.s>c.len-10)return {t,ok:true};if(!n||n.d>15)return {t,lost:1,s:n?n.s:-1};
      const q=c.at(Math.min(c.len-1,n.s+7));v.step(DT,{thr:v.speed>7?.3:.75,steer:aim(v,q[0],q[1])});if(!isFinite(v.p[0]))return {t,nan:1};
      if(v.M[4]<.2&&v.speed<1)return {t,rolled:1};still=v.speed<.4?still+DT:0;if(still>6)return {t,stuck:1};}return {t};},
  rocks:v=>{const R=D.rocks;place(v,R.x0-8,R.z0+22,0);if(v.c.diff.can.low)X.setLow(v,true);if(v.c.diff.can.r)X.setLockers(v,true);return drive(v,R.x0+R.w+4,R.z0+22,60,.55);}
};
const ids=process.argv.slice(2).length?process.argv.slice(2):Object.keys(X.PRESET_PARTS);
console.log('build'.padEnd(13),'mud: physics / rating','   mountain: physics / rating','   rocks: physics / rating');
for(const id of ids){const car=X.BUILDS.find(b=>b.id===id).car,i=X.rigBuild(car,X.presetRig(id)),r=X.rateBuild(i),out=[];
  for(const k of ['mud','mountain','rocks']){const v=X.makeCar(i,world);v.setAssists('real');out.push((fmt(runs[k](v))+' / '+r[k]).padEnd(24));}
  console.log(id.padEnd(13),out.join(''));}
