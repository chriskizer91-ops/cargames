process.env.EXTRA='40_world.js,71_events.js';
const H=require('./harness.js'), g=H.get;
const t0=Date.now();
const W=g('buildRanch')(); console.log('ranch built',Date.now()-t0,'ms');
const world=new (g('RanchWorld'))(W);
const B=(o)=>Object.assign({},H.STOCK_BUILD,o);
const qmat=g('qmat'),mcol=g('mcol');
function place(v,x,z,yaw){v.place([x,W.heightAt(x,z)+0.05,z],yaw);for(const w of v.wheels)w.comp=0;v.pt.st='run';v.pt.we=v.pt.e.idle*Math.PI*2/60;for(let i=0;i<240;i++)v.step(1/240,{thr:0,brk:1,steer:0});}
function follow(v,path,closed,vmaxBase,opts={}){
  const M=qmat(v.q),F=mcol(M,0);const nr=path.nearest(v.p[0],v.p[2],4);if(!nr)return {steer:0,thr:0,brk:1};
  const sp=v.speed,L=7+sp*0.5;let s=nr.s+L;if(closed)s=s%path.len;else s=Math.min(path.len,s);
  const tg=path.at(s);const des=Math.atan2(tg[1]-v.p[2],tg[0]-v.p[0]),cur=Math.atan2(F[2],F[0]);let e=des-cur;while(e>Math.PI)e-=2*Math.PI;while(e<-Math.PI)e+=2*Math.PI;
  // curvature ahead
  let maxTurn=0;for(let k=5;k<=40;k+=5){const a=path.dir(closed?(nr.s+k)%path.len:Math.min(path.len,nr.s+k)),b=path.dir(nr.s);maxTurn=Math.max(maxTurn,Math.acos(Math.max(-1,Math.min(1,a[0]*b[0]+a[1]*b[1])))/k);}
  const vt=Math.min(vmaxBase,Math.max(6,Math.sqrt(4.5/Math.max(maxTurn,1e-3))*0.9));
  const thr=sp<vt?Math.min(1,(vt-sp)*0.4+0.3):0,brk=sp>vt+2?Math.min(1,(sp-vt-2)*0.3):0;
  return {steer:Math.max(-1,Math.min(1,e*2.2)),thr,brk,hb:0,nos:false};
}
function runPath(b,kind){
  const v=H.makeTruck(b,world);v.setAssists('arcade');
  let path,closed,s0,dur,end;
  if(kind==='trail'){path=W.loop;closed=true;s0=path.len-22;}else{path=W.climb;closed=false;s0=0;}
  const c=path.at(s0),d=path.dir(s0);
  if(kind==='climb')place(v,c[0]-d[0]*14,c[1]-d[1]*14,Math.atan2(d[1],d[0]));else place(v,c[0],c[1],Math.atan2(d[1],d[0]));
  if(kind==='climb'){H.setLow(v,true);H.setLockers(v,true);}
  let t=0,started=false,tStart=0,lastS=0,lap=0,stuck=0,maxAir=0,flips=0,minY=1;const gates=W.gates.filter(q=>q.tag===(kind==='trail'?'loop':kind));let next=0;
  for(let f=0;f<60*240;f++){
    const inp=follow(v,path,closed,kind==='trail'?30:14);
    for(let k=0;k<4;k++)v.step(1/240,inp);t+=1/60;
    const gg=gates[next%gates.length];if(gg){const dx=v.p[0]-gg.x,dz=v.p[2]-gg.z,al=dx*gg.dx+dz*gg.dz,sd=Math.abs(-dx*gg.dz+dz*gg.dx);if(al>0&&al<6&&sd<7.5){if(next===0&&!started){started=true;tStart=t;}next++;if(kind==='trail'&&next>gates.length&&t-tStart>20)return {time:t-tStart,next,maxAir,flips};if(kind==='climb'&&next>=gates.length)return {time:t-tStart,next,flips};}}
    const U=mcol(qmat(v.q),1);minY=Math.min(minY,U[1]);if(U[1]<0.2){flips++;place(v,v.p[0],v.p[2],Math.atan2(mcol(qmat(v.q),0)[2],mcol(qmat(v.q),0)[0]));}
    if(v.speed<0.3&&started){stuck+=1/60;if(stuck>8)return {dnf:'stuck',next,t:t-tStart,pos:v.p.map(x=>x.toFixed(0))};}else stuck=0;
    if(t>400)return {dnf:'timeout',next};
  }
  return {dnf:'?'};
}
function runBog(b){
  const v=H.makeTruck(b,world),M=W.mud;v.setAssists('arcade');place(v,M.x+M.rx+14,M.z,Math.PI);
  let t=0,st=false,ts=0,stuck=0,maxd=0;
  for(let f=0;f<60*60;f++){for(let k=0;k<4;k++)v.step(1/240,{thr:1,brk:0,steer:(v.p[2]-M.z)*0.15*-1*-1*0,hb:0});t+=1/60;
    const x=v.p[0];if(!st&&x<M.x+M.rx){st=true;ts=t;}if(st){maxd=Math.max(maxd,M.x+M.rx-x);if(x<M.x-M.rx)return {time:t-ts};if(v.speed<0.3)stuck+=1/60;else stuck=0;if(stuck>4.5)return {dnf:'stuck',dist:maxd.toFixed(1)};}}
  return {dnf:'timeout'};
}
const builds={stock:{},at33:{tyre:'at33',susp:'level'},mid:{susp:'lift4',tyre:'mt35',axle:4.56,lockers:1,tcase:'low'},max:{susp:'lift6',tyre:'mt37',axle:4.88,lockers:2,tcase:'low',shocks:'bypass',engine:'v62'},swamp:{susp:'lift9',tyre:'sw44',axle:5.38,lockers:2,tcase:'low',shocks:'bypass',engine:'bb74'}};
const which=(process.argv[2]||'trail,climb,bog').split(',');
for(const [k,o] of Object.entries(builds)){const b=B(o);const out={};const t1=Date.now();
  for(const w of which){out[w]=w==='bog'?runBog(b):runPath(b,w);}
  console.log(k.padEnd(7),JSON.stringify(out),(Date.now()-t1)+'ms');}
console.log('loop len',W.loop.len.toFixed(0),'climb len',W.climb.len.toFixed(0),'gates',W.gates.length);
const C=g('COOLERS');for(const c of C){const y=W.heightAt(c[0],c[1]);const gr=W.groundAt(c[0],c[1]);console.log('cooler',c[2].padEnd(40),'y',y.toFixed(1),'n.y',gr.n[1].toFixed(2),gr.surf);}
