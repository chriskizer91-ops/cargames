/* Showdown's cross-country routes (45_cross) in Node, on the game's physics: every factory build driven down
   each route by a robot (44_ai), as the game's rivals drive it. For each: the time, its splits by kind of ground,
   top speed, how far it strayed from the line (and where), how often it had to be put back or towed.
   usage: node tools/cross.js [route ids...] [--builds a,b,c] [--skill .95] [--json]
   --par prints the table the game uses for the routes' rivals' times (CROSS_PAR in 60_race). */
const R=require('./races.js'),X=R;
const DT=1/240,args=process.argv.slice(2),opt=k=>{const i=args.indexOf(k);return i>=0?args[i+1]:null;};
const routes=args.filter(a=>!a.startsWith('--')&&!(args[args.indexOf(a)-1]||'').startsWith('--'));
const ids=(opt('--builds')||'').split(',').filter(Boolean),skill=+(opt('--skill')||.95);
/* what each surface counts as: the ratings' six kinds of ground */
const KIND={mud:'mud',ruts:'mud',water:'mud',gravel:'gravel',asphalt:'asphalt',concrete:'asphalt',rock:'rocks',dirt:'dirt',trail:'dirt',strip:'dirt',grass:'dirt'};
function run(rid,bid){
  const {W,G}=R.world(),C=R.course(rid),L=C.line,i=X.BUILDS.findIndex(b=>b.id===bid),car=X.makeCar(i,G);car.setAssists('ai');
  const s0=C.route.grid,s1=L.len+C.route.end;R.place(car,L,s0);
  const d=new X.Driver(car,L,{skill,react:0});d.go=true;d.track();
  let t=0,top=0,dev=0,devS=0,resets=0,tows=0,lastReset=-1e9,resetS=[];const split={};let kPrev=null,tk=0;
  while(t<900){const inp=d.drive(1/60,[]);for(let k=0;k<4;k++)car.step(DT,inp);t+=4*DT;d.track();top=Math.max(top,car.speed);
    if(Math.abs(d.lat)>dev){dev=Math.abs(d.lat);devS=d.s;}
    const kind=KIND[L.surf[L.idx(Math.round(d.s/L.ds))]]||'dirt';split[kind]=(split[kind]||0)+4*DT;
    if(d.resetReq){resets++;
      /* the game's tow: a third time put back within 40 m of the last two, it's pulled 30 m on */
      resetS.push(d.s);const near=resetS.filter(s=>Math.abs(s-d.s)<40).length;let back=8;if(near>=3){back=-30;tows++;resetS.length=0;}
      const [x,z,yaw]=d.resetPose(back);car.place([x,W.heightAt(x,z)+.05,z],yaw);car.pt.start();d.i=-1;d.track();}
    if(d.s>=s1)break;}
  return {bid,t,top,dev,devS,resets,tows,split};
}
if(require.main===module){
  const all=X.CROSS_ROUTES.map(r=>r.id),use=routes.length?routes:all,builds=ids.length?ids:X.BUILDS.filter(b=>!b.id.startsWith('rig:')).map(b=>b.id),par={};
  for(const rid of use){par[rid]={};const L=R.course(rid).line;console.log(`\n${rid}: ${(L.len/1000).toFixed(2)} km`);
    for(const bid of builds){const r=run(rid,bid);par[rid][bid]=+(r.t+r.resets*4).toFixed(1);
      console.log(bid.padEnd(13),'time',r.t.toFixed(1).padStart(6),' top',(r.top*2.237).toFixed(0).padStart(4),'mph  off',r.dev.toFixed(1).padStart(5),'@',String(Math.round(r.devS)).padStart(5),
        ' resets',r.resets,'tows',r.tows,' ',Object.entries(r.split).map(([k,v])=>k+' '+v.toFixed(0)).join(' '));}}
  if(args.includes('--par'))console.log(JSON.stringify(par));
}
module.exports={run};
