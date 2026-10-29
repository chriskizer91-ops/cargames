/* 0-60, the quarter mile and the shift points of a rig on flat tarmac with the game's physics, floored, and
   at part throttle (where the automatic shifts early), with a robot on the pedals.
   usage: node tools/drag_check.js [car] [preset] */
const X=require('./load')();
const DT=1/240,[car='suv',preset='stock']=process.argv.slice(2);
const flat=new X.GroundWorld((x,z,o)=>{o.y=0;o.n[0]=0;o.n[1]=1;o.n[2]=0;o.surf='asphalt';},null,1e9);
function go(thr,level='real'){const i=X.rigBuild(car,X.presetRig(preset)),v=X.makeCar(i,flat);v.setAssists(level);v.place([0,0,0],0);v.pt.start();
  for(let k=0;k<240*3;k++)v.step(DT,{thr:0,brk:0,steer:0});v.v.fill(0);
  let t=0,x0=v.p[0],z60=null,q=null,sh=false;const shifts=[];
  for(;t<40;t+=DT){v.step(DT,{thr,brk:0,steer:0});const x=v.p[0]-x0;
    if(v.pt.shiftT>0&&!sh)shifts.push(`${v.pt.gear}>${v.pt.shiftTo} @${Math.round(v.pt.rpm)}rpm ${Math.round(v.speed*2.237)}mph`);sh=v.pt.shiftT>0;
    if(!z60&&v.speed>=26.82)z60=t;if(!q&&x>=402.3)q={t,mph:v.speed*2.237};if(q&&z60&&t>q.t+2)break;}
  return {z60:z60&&z60.toFixed(2),q:q&&q.t.toFixed(2)+' s @ '+q.mph.toFixed(0),shifts};}
const e=X.specOf(X.rigBuild(car,X.presetRig(preset)));console.log(car,preset,Math.round(e.peak.hp),'hp',Math.round(e.peak.tq*.7376),'lb-ft @',Math.round(e.peak.tqRpm),'redline',e.redline,'limiter',e.limiterRpm,'shiftT',e.shiftT);
const f=go(1);console.log('floored  0-60',f.z60,'1/4',f.q,'\n  ',f.shifts.join(' | '));
for(const k of [.3,.5,.7]){const th=1-Math.pow(1-k,2.2),p=go(th);console.log(Math.round(k*100)+'% pedal ('+Math.round(th*100)+'% throttle)  0-60',p.z60,'\n  ',p.shifts.slice(0,4).join(' | '));}
