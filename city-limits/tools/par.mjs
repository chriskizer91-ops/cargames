/* The medal-setters: a robot drives every challenge on the game's own physics and ground, once in the stock
   SUV and once in the build made for that ground, and writes the results to src/game/pars.js.
   node tools/par.mjs [challenge ids] [--show]     (--show prints without writing)
   The robot: pure pursuit on the route (in its lane), a speed plan from the route's bends and the tyres'
   grip on that surface, braking for what's ahead, full throttle where the plan allows. Middle level. */
import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
globalThis.performance=globalThis.performance||{now:()=>Date.now()};
const require=createRequire(import.meta.url);const X=require('./hdload.js');
const {buildWorld}=await import('../src/world/clworld.js');
const {buildChallenges}=await import('../src/game/chaldefs.js');
const {ChalRun}=await import('../src/game/chalrun.js');
const {PARS:OLD}=await import('../src/game/pars.js');
const W=buildWorld();const GW=new X.GroundWorld(W.groundAt,W.colliders,1e9);
const args=process.argv.slice(2),show=args.includes('--show'),only=(args.find(a=>!a.startsWith('--'))||'').split(',').filter(Boolean);
const C=buildChallenges(W).filter(c=>c.unit!=='points'&&(!only.length||only.includes(c.id)));
const LAT=+(process.env.LAT||.5),GAIN=+(process.env.GAIN||1.3),DT=1/240,g={y:0,n:[0,1,0],surf:''};
const L=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
function lanePath(c){const n=c.route.length,d=c.lane||0;return c.route.map((p,i)=>{const a=c.route[c.closed?(i-1+n)%n:Math.max(0,i-1)],b=c.route[c.closed?(i+1)%n:Math.min(n-1,i+1)];
  const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;return [p[0]+dy/l*d,p[1]-dx/l*d];});}
/* the speed plan: the bends' limit on this surface, then braking back from each */
function plan(c,P,v,pace=1){const n=P.length,mu=v.tyre.mu,out=new Float64Array(n),k=4,flat=c.kind==='drag'||c.kind==='trap'||c.kind==='mile';
  for(let i=0;i<n;i++){const a=P[c.closed?(i-k+n)%n:Math.max(0,i-k)],b=P[i],q=P[c.closed?(i+k)%n:Math.min(n-1,i+k)];
    const ab=L(a,b),bq=L(b,q),aq=L(a,q),cr=(b[0]-a[0])*(q[1]-a[1])-(b[1]-a[1])*(q[0]-a[0]),kap=ab*bq*aq>1e-6?2*Math.abs(cr)/(ab*bq*aq):0;
    W.groundAt(b[0],-b[1],g);const sm=(v.c.surfMu[g.surf]??.8)*mu*(g.surf==='mud'?.6:g.surf==='rock'?.5:1),lim=c.kind==='crawl'?4:flat?120:Math.min(90,Math.sqrt(sm*LAT*9.81/Math.max(kap,1e-5)));
    const cap={dirt:32,gravel:32,trail:22,sand:24,mud:10,rock:6}[g.surf]||120;out[i]=Math.min(lim,cap)*pace;}
  for(let pass=0;pass<(c.closed?2:1);pass++)for(let i=n-2+(c.closed?1:0);i>=0;i--){const j=(i+1)%n;W.groundAt(P[i][0],-P[i][1],g);const dec=.55*(v.c.surfMu[g.surf]??.8)*mu*9.81,ds=L(P[i],P[j]);out[i]=Math.min(out[i],Math.sqrt(out[j]*out[j]+2*dec*ds));}
  return out;}
function run(c,id,pace=1){
  const bi=X.BUILDS.findIndex(b=>b.id===id),car=X.makeCar(bi,GW,null);car.setAssists('middle');
  const P=lanePath(c),VP=plan(c,P,car,pace),n=P.length,s=c.start;
  const p0=c.lane?P[0]:[s.x,s.y];W.groundAt(p0[0],-p0[1],g);car.place([p0[0],g.y+.05,-p0[1]],s.yaw);car.pt.start();
  for(let k=0;k<240;k++)car.step(DT,{steer:0,thr:0,brk:0,hb:1});
  const R=new ChalRun(c,{countdown:0});let idx=0,stuck=0,last=[car.p[0],car.p[2]],t=0,flip=0;
  for(;t<c.limit+5&&R.phase!=='done';t+=DT){
    let best=1e18;const w=c.closed?n:Math.min(n,idx+80);for(let k=idx;k<idx+80&&k<(c.closed?idx+80:w);k++){const q=P[k%n],d=(q[0]-car.p[0])**2+(q[1]+car.p[2])**2;if(d<best){best=d;idx=k%n;}}
    const look=Math.max(6,car.speed*1.05),ahead=P[c.closed?(idx+Math.round(look/2))%n:Math.min(n-1,idx+Math.round(look/2))];
    const dx=ahead[0]-car.p[0],dz=-ahead[1]-car.p[2],L2=dx*dx+dz*dz,side=dx*car.M[2]+dz*car.M[8],kk=2*side/Math.max(L2,1),ang=Math.atan(car.c.wb*kk);
    const lim=Math.min(car.c.lock,car.tyre.aPk*1.6+car.c.wb*9/Math.max(car.speed*car.speed,1)),steer=Math.max(-1,Math.min(1,ang/lim*GAIN));
    const vt=VP[c.closed?(idx+Math.round(car.speed*.6/2))%n:Math.min(n-1,idx+Math.round(car.speed*.6/2))],err=vt-car.speed;
    const thr=err>0?Math.min(1,.4+err*.3):0,brk=err<-1?Math.min(1,-err*.25):0;
    car.step(DT,{steer,thr,brk,hb:0,nos:car.pt.e.nosKw&&err>8&&Math.abs(steer)<.2});
    R.update(DT,car,car.takeEvents());
    if(process.env.TRACE&&((t/DT)|0)%(+process.env.TRACE*240|0||480)===0)console.log('  t',t.toFixed(0),'pos',car.p[0].toFixed(0),(-car.p[2]).toFixed(0),'idx',idx,P[idx].map(v=>v.toFixed(0)).join(','),'v',car.speed.toFixed(1),'vt',vt.toFixed(1),'steer',steer.toFixed(2),'gate',R.gi,'roll',car.M[4].toFixed(2),'surf',car.wheels.map(w=>w.surf||'-').join('/'),'xt',Math.sqrt(best).toFixed(1));
    if(car.M[4]<.3){flip+=DT;if(flip>2){return {fail:'rolled at '+car.p[0].toFixed(0)+','+(-car.p[2]).toFixed(0)+' gate '+R.gi,t};}}else flip=0;
    if(((t/DT)|0)%480===0){const d=Math.hypot(car.p[0]-last[0],car.p[2]-last[1]);if(d<1.5&&t>4){if(++stuck>4)return {fail:'stuck at '+car.p[0].toFixed(0)+','+(-car.p[2]).toFixed(0),t};}else stuck=0;last=[car.p[0],car.p[2]];}
  }
  if(R.phase!=='done')return {fail:'limit gate '+R.gi+'/'+c.gates.length,t};
  return R.failed?{fail:R.failed+' gate '+R.gi+'/'+c.gates.length+' at '+car.p[0].toFixed(0)+','+(-car.p[2]).toFixed(0)+' next '+(R.next?R.next.x.toFixed(0)+','+R.next.y.toFixed(0):''),t}:{v:R.value,t,top:R.top};
}
const out=Object.assign({},OLD);
for(const c of C){
  const runP=(c,id)=>{let r;for(const p of [1,.85,.72,.6,.5]){r=run(c,id,p);r.pace=p;if(!r.fail)return r;}return r;};
  if(process.env.ONLY){const r=runP(c,process.env.ONLY);console.log(c.id,process.env.ONLY,r);continue;}
  const a=runP(c,'stock'),b=runP(c,c.best||'stock');
  const fv=r=>(r.fail?'FAIL '+r.fail+' @'+r.t.toFixed(0)+'s':c.unit==='speed'?(r.v*2.237).toFixed(1)+' mph':c.unit==='dist'?r.v.toFixed(1)+' m':r.v.toFixed(2)+' s')+' p'+r.pace;
  console.log(c.id.padEnd(8),'stock',fv(a).padEnd(26),(c.best||'').padEnd(10),fv(b));
  if(!a.fail&&!b.fail)out[c.id]={stock:+a.v.toFixed(3),best:+b.v.toFixed(3),bestCar:c.best,pace:[a.pace,b.pace]};
  else if(a.fail&&!b.fail)out[c.id]={stock:+(b.v*(c.better==='low'?1.35:.7)).toFixed(3),best:+(b.v*(c.better==='low'?.85:1.05)).toFixed(3),bestCar:c.best,pace:[0,b.pace]};
  else if(!a.fail&&b.fail)out[c.id]={stock:+a.v.toFixed(3),best:+a.v.toFixed(3)*(c.better==='low'?.8:1.2),bestCar:'stock'};
}
if(!show){writeFileSync(new URL('../src/game/pars.js',import.meta.url),'/* generated by tools/par.mjs: the robots\' results per challenge (s or m/s): the stock SUV and the build for that ground */\nexport const PARS='+JSON.stringify(out,null,0).replace(/\},/g,'},\n  ')+';\n');console.log('wrote src/game/pars.js');}
