/* Robot drivers on every road in the world, on the game's own physics and ground:
   node tools/drive_check.mjs [build ids] [level]
   Each build follows each desert road (and a lap of town) at a target speed with a pure-pursuit steer.
   Reports distance covered, top speed, time stuck, rolls, NaNs, and the lowest the car got below the ground. */
import {createRequire} from 'node:module';
globalThis.performance=globalThis.performance||{now:()=>Date.now()};
const require=createRequire(import.meta.url);const X=require('./hdload.js');
const {buildWorld}=await import('../src/world/clworld.js');
const W=buildWorld();const GW=new X.GroundWorld(W.groundAt,W.colliders,1e9);
const ids=(process.argv[2]||'stock,crawler,coupeGT,hatchB,ev,wedgeNR,hyper').split(',');const level=process.argv[3]||'middle';
const DT=1/240,g={y:0,n:[0,1,0],surf:''};
const routes=W.D.roads.filter(r=>r.id!=='spur').map(r=>({id:r.id,pts:Array.from({length:r.N},(_,i)=>[r.x[i],-r.y[i]]),closed:r.closed,v:{asphalt:38,gravel:22,dirt:20,trail:15}[r.kind]}));
/* a lap of town: round the inside of the ring boulevard */
{const pts=[];for(let k=0;k<400;k++){const a=k/400*Math.PI*2,r=354;const sx=Math.cos(a),sy=Math.sin(a);const q=Math.max(Math.abs(sx),Math.abs(sy));pts.push([sx/q*Math.min(r,354),-(sy/q)*Math.min(r,354)]);}routes.push({id:'town',pts,closed:true,v:18});}
for(const id of ids){const bi=X.BUILDS.findIndex(b=>b.id===id);if(bi<0){console.log('no build',id);continue;}
  for(const R of routes){
    const v=X.makeCar(bi,GW,level==='sim'?{cg:true,cargo:0}:null);v.setAssists(level);
    const p0=R.pts[0],p1=R.pts[3];W.groundAt(p0[0],p0[1],g);v.place([p0[0],g.y+.05,p0[1]],Math.atan2(-(p1[1]-p0[1]),p1[0]-p0[0]));v.pt.start();
    for(let k=0;k<240*2;k++)v.step(DT,{steer:0,thr:0,brk:0,hb:1});
    let idx=0,dist=0,top=0,stuck=0,rolls=0,nan=false,low=0,last=[v.p[0],v.p[2]],t=0,flip=0;const N=R.pts.length;
    const T=Math.min(240,R.pts.length*2/R.v*1.6+20);
    for(;t<T;t+=DT){
      /* aim at a point a little ahead on the route */
      let best=1e18;for(let k=idx;k<Math.min(idx+60,idx+N);k++){const q=R.pts[k%N],d=(q[0]-v.p[0])**2+(q[1]-v.p[2])**2;if(d<best){best=d;idx=k%N;}}
      const look=Math.max(6,v.speed*.9),ahead=R.pts[(idx+Math.round(look/2))%N];
      if(!R.closed&&idx>=N-3)break;
      const dx=ahead[0]-v.p[0],dz=ahead[1]-v.p[2],L2=dx*dx+dz*dz,side=dx*v.M[2]+dz*v.M[8],kk=2*side/Math.max(L2,1),ang=Math.atan(v.c.wb*kk);
      const lim=Math.min(v.c.lock,v.tyre.aPk*1.6+v.c.wb*9/Math.max(v.speed*v.speed,1)),steer=Math.max(-1,Math.min(1,ang/lim));
      const err=R.v-v.speed,thr=Math.max(0,Math.min(1,err*.25)),brk=Math.max(0,Math.min(1,-err*.2));
      v.step(DT,{steer,thr,brk,hb:0,nos:false});
      if(!isFinite(v.p[0])||!isFinite(v.p[1])){nan=true;break;}
      top=Math.max(top,v.speed);
      W.groundAt(v.p[0],v.p[2],g);low=Math.min(low,v.p[1]-v.cg[1]*0-g.y);
      if(v.M[4]<.3){flip+=DT;if(flip>2){rolls++;flip=0;console.log('   rolled at',v.p[0].toFixed(0),(-v.p[2]).toFixed(0),W.placeName(v.p[0],-v.p[2]),'jumps:',W.D.jumps.map(J=>Math.hypot(J.ox-v.p[0],J.oy+v.p[2]).toFixed(0)).join(','));const q=R.pts[idx];W.groundAt(q[0],q[1],g);const q2=R.pts[(idx+3)%N];v.place([q[0],g.y+.05,q[1]],Math.atan2(-(q2[1]-q[1]),q2[0]-q[0]));}}else flip=0;
      if(((t/DT)|0)%240===0){const d=Math.hypot(v.p[0]-last[0],v.p[2]-last[1]);dist+=d;if(d<1&&t>3)stuck++;last=[v.p[0],v.p[2]];}
    }
    console.log(id.padEnd(10),R.id.padEnd(6),`${(dist/1000).toFixed(2)} km`.padStart(8),`top ${(top*2.237).toFixed(0)} mph`.padStart(12),`stuck ${stuck}s`.padStart(10),`rolls ${rolls}`,`low ${low.toFixed(2)}`,nan?'NaN!':'',`${t.toFixed(0)}s`);
  }
}
