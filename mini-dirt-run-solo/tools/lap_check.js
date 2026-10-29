/* A robot lap of the race track: it follows the racing line a little ahead, brakes for the corners it can see
   coming (from the path's own curvature and the tyres' grip), and reports the lap time. Used to set the
   career's lap goal and to see how the builds compare on the tarmac.
   usage: node tools/lap_check.js [preset ids...] */
const X=require('./load')({ranch:true});
const DT=1/240,W=X.Ranch.buildRanch(),world=new X.GroundWorld(W.groundInto,W.colliders,790),T=W.country.track;
const ang=(a)=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;};
function lap(id){
  const car=X.BUILDS.find(b=>b.id===id).car,i=X.rigBuild(car,X.presetRig(id)),v=X.makeCar(i,world),b=X.BUILDS[i];v.setAssists('middle');if(v.c.riderKg)v.lean={x:0,z:0};
  const s0=T.len-60,p=T.at(s0),d=T.dir(s0);v.place([p[0],W.heightAt(p[0],p[1])+.05,p[1]],Math.atan2(-d[1],d[0]));v.pt.st='run';v.pt.we=v.pt.e.idle*Math.PI/30;
  for(let k=0;k<240;k++)v.step(DT,{thr:0,brk:0,steer:0});v.v.fill(0);
  let s=s0,t=0,started=null,laps=0,mu=v.tyre.mu*1.0;
  for(;t<400;t+=DT){const n=T.nearest(v.p[0],v.p[2],2);if(!n)break;const ps=s;s=n.s;
    if(ps>T.len-40&&s<40){if(started===null)started=t;else return {t:t-started,id};}
    /* the slowest a corner ahead allows, braking down to it */
    let vmax=80;for(let a=5;a<120;a+=5){const s1=(s+a)%T.len,d0=T.dir(s1),d1=T.dir((s1+4)%T.len),k=Math.abs(ang(Math.atan2(d1[1],d1[0])-Math.atan2(d0[1],d0[0])))/4;
      const vc=Math.sqrt(mu*.7*9.81/Math.max(k,1e-4));vmax=Math.min(vmax,Math.sqrt(vc*vc+2*mu*.6*9.81*Math.max(0,a-v.speed*.3)));}
    if(b.gov)vmax=Math.min(vmax,b.gov);
    const q=T.at((s+Math.max(6,v.speed*.6))%T.len),want=Math.atan2(-(q[1]-v.p[2]),q[0]-v.p[0]),have=Math.atan2(-v.M[6],v.M[0]);
    const thr=v.speed<vmax-1?1:v.speed<vmax?.3:0,brk=v.speed>vmax+1.5?Math.min(1,(v.speed-vmax)/6):0;
    v.step(DT,{thr,brk,steer:Math.max(-1,Math.min(1,-ang(want-have)*2.2))});
    if(!isFinite(v.p[0])||v.M[4]<.2)return {id,fail:'rolled'};if(n.d>25)return {id,fail:'off at '+Math.round(s)+' m, '+Math.round(v.speed*2.237)+' mph'};}
  return {id,fail:'slow'};}
const ids=process.argv.slice(2).length?process.argv.slice(2):['stock','trail','coupe','coupeGT','race','hatchB','quad450','sxs','kart','golf'];
console.log('track length',Math.round(T.len),'m');
for(const id of ids){const r=lap(id);console.log(id.padEnd(12),r.fail||(Math.floor(r.t/60)+':'+(r.t%60).toFixed(1).padStart(4,'0')));}
