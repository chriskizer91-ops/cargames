/* Every build on flat tarmac with a robot foot: 0-60, quarter mile, top speed, 60-0. node tools/proving.js [ids] */
const X=require('./hdload.js');const DT=1/240;
const flat=surf=>new X.GroundWorld((x,z,o)=>{o.y=0;o.n[0]=0;o.n[1]=1;o.n[2]=0;o.surf=surf;},null,1e9);
const ids=process.argv.slice(2);
for(let i=0;i<X.BUILDS.length;i++){const b=X.BUILDS[i];if(ids.length&&!ids.includes(b.id))continue;
  const t0=Date.now();let v;
  try{v=X.makeCar(i,flat('asphalt'));}catch(e){console.log(b.id,'makeCar failed',e.message);continue;}
  v.setAssists('middle');v.place([0,0,0],0);v.pt.start();
  for(let k=0;k<240*3;k++)v.step(DT,{steer:0,thr:0,brk:0,hb:1});
  let t=0,t60=-1,tq=-1,vq=0,x0=v.p[0],top=0,nan=false;
  for(let k=0;k<240*40;k++){v.step(DT,{steer:0,thr:1,brk:0,hb:0,nos:false});t+=DT;const mph=v.speed*2.23694;if(!isFinite(mph)){nan=true;break;}
    if(t60<0&&mph>=60)t60=t;if(tq<0&&v.p[0]-x0>=402.3){tq=t;vq=mph;}top=Math.max(top,mph);}
  let d=0,xs=0;for(let k=0;k<240*2;k++)v.step(DT,{steer:0,thr:0,brk:0,hb:0});
  // 60-0
  v.place([0,0,0],0);for(let k=0;k<240;k++)v.step(DT,{steer:0,thr:0,brk:0,hb:1});
  v.v[0]=60/2.23694;for(const w of v.wheels)w.w=v.v[0]/w.R;xs=v.p[0];let k2=0;while(v.speed>.2&&k2<240*10){v.step(DT,{steer:0,thr:0,brk:1,hb:0});k2++;}d=v.p[0]-xs;
  const s=v.spec,hp=s.peak?Math.round(s.peak.kw*1.341):0;
  console.log(b.id.padEnd(11),(hp+' hp').padEnd(8),'0-60',t60.toFixed(2).padStart(5),' 1/4',tq.toFixed(2),'@',vq.toFixed(0),' top',top.toFixed(0),'mph  60-0',(d*3.281).toFixed(0),'ft',nan?'NaN!':'',(Date.now()-t0)+'ms');
}
