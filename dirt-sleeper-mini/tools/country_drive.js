/* Drives each truck through the new country with the game's physics (no rendering): down the home
   lane's ruts, flat out along the county road, a lap of the road course (braking for the corners),
   round the woods trail through the pond's shallows, and off the county road into its ditch.
   usage: node tools/country_drive.js [level] [only-run-name] */
const fs=require('fs'),path=require('path'),vm=require('vm');
const src=f=>fs.readFileSync(path.join(__dirname,'..','src',f),'utf8');
/* (run as a plain module, not in a vm context: global lookups in a context are slow) */
const stub=`const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,TAU=Math.PI*2,PI=Math.PI;
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};const sgn=v=>v<0?-1:v>0?1:0;const wrapA=a=>{while(a>PI)a-=TAU;while(a<-PI)a+=TAU;return a;};
const SUVB={L:4.92,ovF:.93,wb:2.89,R0:.378};const MAT={COL:0,EMIT:15};
const BUILDS=[{id:'stock',name:'Stock',look:{lift:0,track:1.6,roof:'bars',tyre:{R:.378}}},{id:'sleeper',name:'Sleeper',look:{lift:-.05,track:1.62,roof:'rails',tyre:{R:.372}}},
 {id:'crawler',name:'Rock & Mud',look:{lift:.15,track:1.74,roof:'rack',tyre:{R:.47}}},{id:'race',name:'Race',look:{lift:-.1,track:1.76,roof:'none',tyre:{R:.345}}}];`;
const tmp=path.join(require('os').tmpdir(),'dsmini_country_'+process.pid+'.js');
fs.writeFileSync(tmp,stub+src('15_de_engine.js')+src('16_engines.js')+src('50_physmath.js')+src('51_tyre.js')+src('52_tune.js')+src('53_vehicle.js')+src('54_truckphys.js')+src('59_country.js')+src('60_ranch.js')+
  '\nmodule.exports={makeTruck,qmat,mcol,Ranch,CTRY};');
const {makeTruck,qmat,mcol,Ranch,CTRY}=require(tmp);fs.unlinkSync(tmp);const ctx={},DT=1/240,level=process.argv[2]||'real',only=process.argv[3];
const t0=performance.now(),W=Ranch.buildRanch(),world=new Ranch.RanchWorld(W),C=W.country;console.log('world built in',(performance.now()-t0).toFixed(0),'ms; level',level);
const yawOf=(dx,dz)=>Math.atan2(-dz,dx);
function place(v,x,z,yaw){const y=W.heightAt(x,z);v.place([x,y+.05,z],yaw);for(const w of v.wheels){w.comp=0;w.w=0;}v.pt.st='run';v.pt.we=v.pt.e.idle*Math.PI*2/60;for(let i=0;i<240;i++)v.step(DT,{thr:0,brk:1,steer:0});v.rev=false;v.pt.rev=false;v.revT=0;v.v=[0,0,0];v.w=[0,0,0];}
/* follow a path from s0 to s1: steer at a point ahead, hold a speed the next bends allow */
function follow(v,p,s0,s1,o){
  const L=p.len,wrap=s=>p.closed?((s%L)+L)%L:Math.max(0,Math.min(L,s)),mu=o.mu||.8,vmax=o.vmax||99;
  let t=0,vmax2=0,minUp=1,nan=false,maxOff=0,s=s0,stuckT=0,surf={};
  const curvAt=s=>{const a=CTRY.dirW(p,wrap(s-6)),b=CTRY.dirW(p,wrap(s+6));return Math.abs(a[0]*b[1]-a[1]*b[0])/12;};
  for(;t<o.secs;t+=DT){
    const q=CTRY.onPath(p,v.p[0],v.p[2],3);if(q){if(q.s<s-50&&p.closed)q.s+=L;s=Math.max(s,q.s);maxOff=Math.max(maxOff,Math.abs(q.off));
      if(o.log&&!o.offAt&&Math.abs(q.off)>8)o.offAt=`went wide at s ${(s%L).toFixed(0)} (${p.at(s%L).map(v=>v.toFixed(0))}) doing ${(v.speed*2.237).toFixed(0)} mph, bend radius ${(1/Math.max(curvAt(s),1e-4)).toFixed(0)} m, last target ${(o.vt*2.237).toFixed(0)} mph`;}
    if(s>=s1)break;
    const sp=v.speed,ahead=wrap(s+6+sp*.5),c=p.at(ahead),M=qmat(v.q),F=mcol(M,0),dx=c[0]-v.p[0],dz=c[1]-v.p[2];
    let e=Math.atan2(-dz,dx)-Math.atan2(-F[2],F[0]);while(e>Math.PI)e-=2*Math.PI;while(e<-Math.PI)e+=2*Math.PI;
    /* the fastest speed from which every bend in the next stretch can still be made, braking at about mu g */
    let vt=vmax;for(let d=0;d<=sp*sp/(2*mu*7)+40;d+=4){const vb=Math.sqrt(mu*9.81/Math.max(curvAt(s+d),1e-4));vt=Math.min(vt,Math.sqrt(vb*vb+2*mu*7*Math.max(0,d-sp*.35)));}
    const thr=sp<vt-1?o.thr:sp<vt?o.thr*.4:0,brk=sp>vt+1.5?Math.min(1,(sp-vt)/6):0;
    o.vt=vt;v.step(DT,{steer:Math.max(-1,Math.min(1,-e*2.2)),thr,brk});
    if(o.trace&&Math.round(t/DT)%60===0&&(s%L)>o.trace[0]&&(s%L)<o.trace[1])console.log('     t',t.toFixed(2),'s',(s%L).toFixed(0),'off',q?q.off.toFixed(1):'-','mph',(v.speed*2.237).toFixed(0),'tgt',(vt*2.237).toFixed(0),'e',(e*57.3).toFixed(0),'thr',thr.toFixed(1),'brk',brk.toFixed(2),'steer',v.steer.toFixed(3),'yawrate',v.w[1].toFixed(2));
    vmax2=Math.max(vmax2,sp);minUp=Math.min(minUp,mcol(qmat(v.q),1)[1]);
    for(const w of v.wheels)if(w.contact)surf[w.surf]=(surf[w.surf]||0)+1;
    if(sp<.3){if((stuckT+=DT)>8)break;}else stuckT=0;
    if(!isFinite(v.p[0])||!isFinite(v.p[1])){nan=true;break;}
  }
  const tot=Object.values(surf).reduce((a,b)=>a+b,0)||1;
  if(o.offAt)console.log('   ',v.build.name,o.offAt);
  return {t,vmax:vmax2,minUp,nan,done:s>=s1,got:s-s0,maxOff,surf:Object.entries(surf).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,n])=>k+' '+Math.round(n/tot*100)+'%').join(', ')};
}
const runs=[
  ['home lane',v=>{const p=C.lane,s=6,c=p.at(s),d=CTRY.dirW(p,s);place(v,c[0],c[1],yawOf(d[0],d[1]));return follow(v,p,s,p.len-4,{secs:90,thr:.6,vmax:13});}],
  ['county road',v=>{const p=C.cr,s=60,c=p.at(s),d=CTRY.dirW(p,s);place(v,c[0],c[1],yawOf(d[0],d[1]));return follow(v,p,s,p.len-60,{secs:120,thr:1,mu:.6});}],
  ['track lap',v=>{const p=C.track,s=p.len-60,c=p.at(s),d=CTRY.dirW(p,s);place(v,c[0],c[1],yawOf(d[0],d[1]));return follow(v,p,s,s+p.len,{secs:240,thr:1,mu:v.build.id==='race'?.85:.62,log:1,trace:process.env.TR?process.env.TR.split(',').map(Number):null});}],
  ['woods trail',v=>{const p=C.woods,s=10,c=p.at(s),d=CTRY.dirW(p,s);place(v,c[0],c[1],yawOf(d[0],d[1]));return follow(v,p,s,p.len-10,{secs:300,thr:.65,mu:.5,vmax:11});}],
  ['into the ditch',v=>{const p=C.cr,s=500,c=p.at(s),d=CTRY.dirW(p,s);place(v,c[0],c[1],yawOf(d[0],d[1]));let t=0,minUp=1,nan=false;
    for(;t<9;t+=DT){v.step(DT,{thr:t<4?1:0,brk:t>6?1:0,steer:t>4&&t<4.6?.5:0});minUp=Math.min(minUp,mcol(qmat(v.q),1)[1]);if(!isFinite(v.p[0])){nan=true;break;}}
    const q=CTRY.onPath(p,v.p[0],v.p[2],3);return {t,vmax:0,minUp,nan,done:true,got:0,maxOff:q?Math.abs(q.off):99,surf:''};}]
];
for(let i=0;i<4;i++){
  const out=[];
  for(const [name,fn] of runs){if(only&&name!==only)continue;const v=makeTruck(i,world);v.setAssists(level);const r=fn(v);
    out.push(`${name}: ${r.nan?'NaN!':r.done?'done':'got '+r.got.toFixed(0)+' m'} in ${r.t.toFixed(1)} s, top ${(r.vmax*2.237).toFixed(0)} mph, off ${r.maxOff.toFixed(1)} m${r.minUp<.2?', ROLLED':r.minUp<.75?', leaned '+(Math.acos(r.minUp)*57.3).toFixed(0)+'°':''}${r.surf?' ['+r.surf+']':''}`);}
  console.log(['Stock','Sleeper','Rock & Mud','Race'][i].padEnd(10),out.join('\n           '));
}
