/* The strip callouts' ladder (60_race's LADDER): each rival's build down the eighth mile, as the game's robot drives
   it (no reaction time), the elapsed time from leaving the line and the speed at the eighth. The ladder climbs from
   the slowest to the quickest.   usage: node tools/ladder.js [build ids...] */
const R=require('./races.js'),X=R,DT=1/240;
function run(bid){const {W,G}=R.world(),S=W.strip,z=S.lanes[1],L=new X.RaceLine(X.Ranch.makePath([[S.x0+2,z],[S.x1-4,z]],false),3,{flat:true,ground:(x,z)=>W.groundAt(x,z)});
  const i=X.BUILDS.findIndex(b=>b.id===bid),car=X.makeCar(i,G);car.setAssists('ai');car.place([S.start-car.c.body.L/2-.3,W.heightAt(S.start,z)+.05,z],0);car.pt.start();
  const H={steer:0,thr:0,brk:1,hb:0,nos:false};for(let k=0;k<240;k++)car.step(DT,H);car.v.fill(0);car.w.fill(0);
  const d=new X.Driver(car,L,{skill:1,react:0});d.go=true;d.track();let t=0,left=null;
  while(t<30){const inp=d.drive(1/60,[]);for(let k=0;k<4;k++)car.step(DT,inp);t+=4*DT;const front=car.p[0]+car.c.body.L/2;
    if(left===null&&front>S.start+.2)left=t;if(front>=S.start+S.eighth)return {bid,et:t-(left||0),mph:car.speed*2.237};}
  return {bid,et:99,mph:0};}
if(require.main===module){const ids=process.argv.slice(2).length?process.argv.slice(2):X.BUILDS.filter(b=>!b.id.startsWith('rig:')).map(b=>b.id);
  const out=ids.map(run).sort((a,b)=>b.et-a.et);for(const r of out)console.log(r.bid.padEnd(13),'ET',r.et.toFixed(2),'@',r.mph.toFixed(0),'mph');}
