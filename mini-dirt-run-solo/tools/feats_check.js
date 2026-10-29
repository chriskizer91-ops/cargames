/* A robot drives the game's physics on the real ranch (no page, no drawing) and checks the feats fire:
   a drift on the dirt, a jump off the trail loop's kicker, the mud pit, a gravel speed run on the county
   road, a burnout on the line lock, and a roll that loses the combo. Prints what paid.
   usage: node tools/feats_check.js [car] [preset] */
const X=require('./load')({ranch:true});
const DT=1/240,[car='suv',preset='stock']=process.argv.slice(2);
const W=X.Ranch.buildRanch(),world=new X.GroundWorld(W.groundInto,W.colliders,790);
const pops=[];X.Feats.pop=(t)=>pops.push(t);X.Feats.load('none');X.Feats.clear();
const yawOf=(dx,dz)=>Math.atan2(-dz,dx);
function car0(){const i=X.rigBuild(car,X.presetRig(preset)),v=X.makeCar(i,world);v.setAssists('real');return v;}
function place(v,x,z,yaw){const y=W.heightAt(x,z);v.place([x,y+.05,z],yaw);for(const w of v.wheels){w.comp=0;w.w=0;}v.pt.st='run';v.pt.we=v.pt.e.idle*Math.PI*2/60;
  for(let i=0;i<240;i++)v.step(DT,{thr:0,brk:0,steer:0});v.v.fill(0);v.w.fill(0);v.rev=false;v.pt.rev=false;X.Feats.resetCar();}
/* drive: the input each step comes from fn(v,t); the feats watch at 60 a second */
function run(v,secs,fn){let acc=0;for(let t=0;t<secs;t+=DT){v.step(DT,fn(v,t));acc+=DT;if(acc>=1/60){acc=0;X.Feats.step(1/60,v,v.takeEvents(),W);}
    if(!isFinite(v.p[0]))return 'NaN';}for(let k=0;k<240*4;k++){v.step(DT,{thr:0,brk:1,steer:0});if(k%4===0)X.Feats.step(1/60,v,v.takeEvents(),W);}return '';}
const aim=(v,tx,tz)=>{const F=[v.M[0],v.M[6]],want=Math.atan2(-(tz-v.p[2]),tx-v.p[0]),have=Math.atan2(-F[1],F[0]);let e=want-have;while(e>Math.PI)e-=2*Math.PI;while(e<-Math.PI)e+=2*Math.PI;return Math.max(-1,Math.min(1,-e*2));};
const tests=[
  ['drift',v=>{place(v,-40,60,0);return run(v,9,(v,t)=>t<4?{thr:1,steer:0}:t<4.6?{thr:.6,steer:1,hb:1}:{thr:1,steer:t<7.5?1:0});}],
  ['kicker jump',v=>{const k=W.kick[0];place(v,k.x-k.dx*80,k.z-k.dz*80,yawOf(k.dx,k.dz));return run(v,10,v=>({thr:1,steer:aim(v,k.x+k.dx*60,k.z+k.dz*60)}));}],
  ['mud pit',v=>{const M=W.D.mud;place(v,M.x+M.rx+9,M.z,Math.PI);return run(v,25,v=>({thr:1,steer:aim(v,M.x-M.rx-12,M.z)}));}],
  ['gravel run',v=>{const C=W.country.cr;place(v,-300,401,0);let s0=C.nearest(-300,401,2).s;return run(v,30,v=>{const n=C.nearest(v.p[0],v.p[2],2),q=C.at(Math.min(C.len-1,n.s+25));return {thr:v.speed>30?0:1,steer:aim(v,q[0],q[1])};});}],
  ['burnout (line lock)',v=>{place(v,41,0,0);return run(v,4,()=>({thr:1,brk:0,lock:true,steer:0}));}],
  ['roll loses the combo',v=>{place(v,-40,60,0);return run(v,10,(v,t)=>t<4?{thr:1,steer:0}:t<5?{thr:.6,steer:1,hb:1}:{thr:1,steer:1});}]
];
for(const [name,fn] of tests){pops.length=0;const v=car0(),err=fn(v);console.log(name.padEnd(22),err||'',pops.join(' | ')||'(nothing)');}
console.log('money',Math.round(X.Feats.S.money));
