/* The race ground in Node: the whole world built as the game builds it, a robot driver (44_ai) in any build
   round any course, alone or with a field, on the game's physics.
   usage: node tools/races.js [course] [build ids...]      courses: oval short road lake mud rally summit,
          and Showdown's cross-country routes (45_cross): mudtar peak hills lake
     alone:  each build drives the course (two laps of a loop, the length of a stage): lap or stage time, top speed,
             how far it strayed from the line, how often it had to be put back
     field:  node tools/races.js field oval 6 — a race of six, contacts counted */
const fs=require('fs'),path=require('path');
const SRC=path.resolve(__dirname,'..','src')+'/';
const MODS=['10_core','12_gl_mesh','13_lit','14_loft','15_digital_engine','16_engines','21_suv','22_faces','23_parts','24_4x4','25_coupe','26_wagon',
  '27_pickup','28_muscle','29_hatch','30_wheels','31_engine_bay','32_builds','40_physics','41_ground','42_chassis','43_sim','44_ai','45_cross','50_far','50_country','51_ranch'];
const STUB=`const document={getElementById:()=>null,createElement:()=>({getContext:()=>null,style:{}})},matchMedia=()=>({matches:false}),localStorage={getItem:()=>null,setItem:()=>{}},window={};\n`;
const X=new Function(STUB+MODS.map(m=>fs.readFileSync(SRC+m+'.js','utf8')).join('\n')+
  '\nreturn {BUILDS,makeCar,GroundWorld,Ranch,RaceLine,Driver,carContacts,FAR,CROSS_ROUTES,crossBuild};')();
module.exports=X;X.world=()=>world();X.course=id=>course(id);X.place=(c,L,s,l)=>place(c,L,s,l);
const DT=1/240;
let WORLD=null;
function world(){if(WORLD)return WORLD;const t0=Date.now(),W=X.Ranch.buildRanch();WORLD={W,G:new X.GroundWorld(W.groundInto,W.colliders,X.FAR.EDGE-10)};console.log('world built in',Date.now()-t0,'ms');return WORLD;}
/* the courses: path, usable half width, laps (0: a stage, start to finish) */
function course(id){const {W}=world(),C=W.country,F=C.far,g=(x,z)=>W.groundAt(x,z);
  const cr=X.CROSS_ROUTES.find(r=>r.id===id);
  if(cr){const R=X.crossBuild(cr,W,X.Ranch.makePath);return {id,line:new X.RaceLine(R.path,R.hwAt,{ground:g,margin:1.3}),laps:0,route:cr};}
  const D={oval:[F.oval,7.4,2],short:[F.short,5.6,2],road:[C.track,6,2],lake:[F.lakeLoop,14,1],mud:[W.mudTrack,4.6,2],rally:[F.rally,3.4,0],summit:[F.summit,3.6,0]}[id];
  const line=new X.RaceLine(D[0],D[1],{ground:g,margin:id==='rally'||id==='summit'?1.3:1.6});return {id,line,laps:D[2]};}
const yawAt=(L,s)=>{const [x,z]=L.at(s),[x2,z2]=L.at(s+3);return Math.atan2(-(z2-z),x2-x);};
function place(car,L,s,lat=0){const {W}=world(),[x,z]=L.at(s,lat);car.place([x,W.heightAt(x,z)+.05,z],yawAt(L,s));car.pt.start();
  const I={steer:0,thr:0,brk:1,hb:0,nos:false};for(let k=0;k<240;k++)car.step(DT,I);}
/* where a stage starts and finishes (as the game times it: 60_race's RACE_STAGE; a cross-country route's own grid and end) */
const STAGE={rally:[24,-30],summit:[2,-12]};
function solo(cid,bid,level=process.env.LEVEL||'ai',skill=+process.env.SKILL||.92){
  const {G}=world(),C=course(cid),L=C.line,i=X.BUILDS.findIndex(b=>b.id===bid),car=X.makeCar(i,G);car.setAssists(level);
  const st=STAGE[cid]||(C.route?[C.route.grid,C.route.end]:null),start=L.closed?L.len-30:st?st[0]:4;place(car,L,start);const d=new X.Driver(car,L,{skill,react:0});d.go=true;d.track();
  const goal=L.closed?C.laps*L.len+(L.len-start)%L.len:L.len-6;let t=0,top=0,dev=0,resets=0,startProg=d.prog,lapT=[],lastLap=d.lap,lapStart=0;
  while(t<600){const inp=d.drive(1/60,[]);for(let k=0;k<4;k++)car.step(DT,inp);t+=4*DT;d.track();top=Math.max(top,car.speed);dev=Math.max(dev,Math.abs(d.lat));
    if(L.closed&&d.lap>lastLap){lapT.push(t-lapStart);lapStart=t;lastLap=d.lap;}
    if(d.resetReq){resets++;const [x,z,yaw]=d.resetPose(10);car.place([x,world().W.heightAt(x,z)+.05,z],yaw);car.pt.start();}
    if(L.closed?d.lap>=C.laps&&d.prog-startProg>=goal:d.s>=L.len+(st?st[1]:-8))break;}
  return {bid,t,top,dev,resets,laps:lapT};
}
if(require.main===module){
  const a=process.argv.slice(2);
  if(a[0]==='par'){/* the rivals' times on the stages: every factory build, as the game's rivals drive them */
    const out={};for(const cid of ['rally','summit']){out[cid]={};for(const b of X.BUILDS){if(b.id.startsWith('rig:'))continue;const r=solo(cid,b.id,'ai',+process.env.SKILL||.95);out[cid][b.id]=+(r.t+r.resets*8).toFixed(1);
      console.log(cid,b.id,r.t.toFixed(1),'resets',r.resets);}}
    console.log(JSON.stringify(out));return;}
  if(a[0]==='field'){/* a race */
    const cid=a[1]||'oval',N=+a[2]||6,{G,W}=world(),C=course(cid),L=C.line,ids=['coupeGT','race','hatchB','wagonSleeper','muscle','prerunner','coupe','hatch'];
    const drv=[];for(let k=0;k<N;k++){const car=X.makeCar(X.BUILDS.findIndex(b=>b.id===ids[k%ids.length]),G);car.setAssists('ai');
      const row=Math.floor(k/2),s=(L.closed?L.len:0)-12-row*9,lat=(k%2?1:-1)*2.2;place(car,L,(s+L.len)%L.len,lat);const d=new X.Driver(car,L,{skill:.88+.02*(k%4),react:.1+.05*k});d.go=true;d.track();d.half=car.c.body.W/2;drv.push(d);}
    let t=0,contacts=0,resets=0;const fin=[];
    while(t<400&&fin.length<N){for(const d of drv)d.drive(1/60,drv);for(let k=0;k<4;k++){for(const d of drv)d.car.step(DT,d.inp);X.carContacts(drv.map(d=>d.car));}t+=4*DT;
      for(const d of drv){d.track();contacts+=d.car.ev.car||0;d.car.ev.car=0;if(d.resetReq){resets++;const [x,z,yaw]=d.resetPose(10);d.car.place([x,W.heightAt(x,z)+.05,z],yaw);d.car.pt.start();}
        if(!d.done&&d.lap>=C.laps){d.done=true;fin.push([d.car.c.name,t.toFixed(1)]);}}}
    console.log(cid,'field of',N,'finish',JSON.stringify(fin),'contacts',contacts,'resets',resets);return;}
  const cid=a[0]||'oval',ids=a.length>1?a.slice(1):['stock','race','coupeGT','wagonSleeper','prerunner','hatchB','muscleDrag','trailRig'];
  for(const id of ids){const r=solo(cid,id);console.log(cid.padEnd(6),id.padEnd(13),'time',r.t.toFixed(1).padStart(6),'laps',r.laps.map(x=>x.toFixed(1)).join(' ').padEnd(12),'top',(r.top*2.237).toFixed(0).padStart(4),'mph  off line',r.dev.toFixed(1),'resets',r.resets);}
}
