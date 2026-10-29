/* each machine on flat ground with a robot on the pedals: 0-30 and 0-60 where it gets there, top speed (with its
   governor), the revs it sits at, a hard turn at speed (does it tip?), and that nothing goes to NaN.
   usage: node tools/machine_check.js [preset ...] */
const X=require('./load')();
const DT=1/240,ids=process.argv.slice(2).length?process.argv.slice(2):X.MACH_IDS.concat(['quad450X','quadUtilX','sxsX','golfX']);
const flat=new X.GroundWorld((x,z,o)=>{o.y=0;o.n[0]=0;o.n[1]=1;o.n[2]=0;o.surf='dirt';},null,1e9);
for(const id of ids){
  const car=X.BUILDS.find(b=>b.id===id).car,i=X.rigBuild(car,X.presetRig(id)),b=X.BUILDS[i],v=X.makeCar(i,flat);
  v.setAssists('real');v.place([0,0,0],0);v.pt.start();v.lean={x:0,z:0};
  for(let k=0;k<240*3;k++)v.step(DT,{thr:0,brk:0,steer:0});v.v.fill(0);
  let t=0,z30=null,z60=null,top=0,rpm=0,nan=false;
  for(;t<40;t+=DT){let thr=1;if(b.gov&&v.speed>b.gov-1)thr=Math.max(0,Math.min(1,b.gov-v.speed));
    v.step(DT,{thr,brk:0,steer:0});if(!isFinite(v.p[0]+v.p[1]+v.speed)){nan=true;break;}
    if(!z30&&v.speed>=13.41)z30=t;if(!z60&&v.speed>=26.82)z60=t;top=Math.max(top,v.speed);rpm=v.pt.rpm;}
  /* a hard turn at 80% of its top speed (capped at 15 m/s): how far does it roll? */
  let maxRoll=0,tipped=false;
  for(let k=0;k<240*4;k++){let thr=v.speed<Math.min(15,top*.8)?1:0;v.step(DT,{thr,brk:v.speed>Math.min(15,top*.8)+1?.4:0,steer:k>240?1:0});
    const up=v.M[4];maxRoll=Math.max(maxRoll,Math.acos(Math.min(1,up))*57.3);if(up<.3)tipped=true;}
  console.log(id.padEnd(10),`${Math.round(v.pt.e.peak.hp)} hp`.padEnd(7),`${v.m} kg`.padEnd(8),'0-30',(z30?z30.toFixed(1):'--').padEnd(5),'0-60',(z60?z60.toFixed(1):'--').padEnd(5),
    'top',(top*2.237).toFixed(0).padEnd(4),'mph @',Math.round(rpm),'rpm',v.pt.e.cvt?'cvt '+(v.pt.cvtR||0).toFixed(2):'gear '+v.pt.gear,'| turn roll',maxRoll.toFixed(0)+'°',tipped?'TIPPED':'',nan?'NaN!':'');
}
