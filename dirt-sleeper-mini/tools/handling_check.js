/* Keyboard manoeuvres on flat ground with the game's physics: the steering input ramps the way the
   game's keys do, and each test reports the body's worst slip angle (how sideways it got; a spin is
   over about 60°). bt: brake hard into a full turn; lc: a lane change, full left then full right;
   sf / sh: an S-bend at full and half steering; lift: off the gas mid-turn; ht: a held turn (with its
   lateral grip in g). Then donuts from rest. usage: node tools/handling_check.js */
const fs=require('fs'),path=require('path');
const src=f=>fs.readFileSync(path.join(__dirname,'..','src',f),'utf8');
const stub=`const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,TAU=Math.PI*2,PI=Math.PI;
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};const sgn=v=>v<0?-1:v>0?1:0;const wrapA=a=>{while(a>PI)a-=TAU;while(a<-PI)a+=TAU;return a;};
const SUVB={L:4.92,ovF:.93,wb:2.89,R0:.378};
const BUILDS=[{id:'stock',name:'Stock',look:{lift:0,track:1.6,roof:'bars',tyre:{R:.378}}},{id:'sleeper',name:'Sleeper',look:{lift:-.05,track:1.62,roof:'rails',tyre:{R:.372}}},
 {id:'crawler',name:'Rock & Mud',look:{lift:.15,track:1.74,roof:'rack',tyre:{R:.47}}},{id:'race',name:'Race',look:{lift:-.1,track:1.76,roof:'none',tyre:{R:.345}}}];`;
const tmp=path.join(require('os').tmpdir(),'dsmini_handling_'+process.pid+'.js');
fs.writeFileSync(tmp,stub+['15_de_engine.js','16_engines.js','50_physmath.js','51_tyre.js','52_tune.js','53_vehicle.js','54_truckphys.js'].map(src).join('\n')+'\nmodule.exports={makeTruck,qmat,mcol,FlatWorld,TUNE};');
const V=require(tmp);fs.unlinkSync(tmp);const DT=1/240;
function settle(v){v.place([0,0,0],0);v.pt.st='run';v.pt.we=v.pt.e.idle*Math.PI*2/60;for(let i=0;i<480;i++)v.step(DT,{thr:0,brk:1,steer:0});v.rev=false;v.pt.rev=false;v.revT=0;v.v=[0,0,0];v.w=[0,0,0];}
function mk(bi,surf,lvl){const v=V.makeTruck(bi,new V.FlatWorld(surf));v.setAssists(lvl);v.applySlide();return v;}
function run(bi,lvl,surf,mph,script){const v=mk(bi,surf,lvl);settle(v);const tgt=mph/2.237;let t=0;while(v.speed<tgt&&t<30){v.step(DT,{thr:1,brk:0,steer:0});t+=DT;}
  let st=0,maxB=0,lat=0,minUp=1;for(const [secs,c] of script)for(let k=0;k<secs*240;k++){const rate=c.steer===0?6:Math.sign(c.steer)!==Math.sign(st)&&st!==0?8:3.2;st+=Math.max(-rate*DT,Math.min(rate*DT,c.steer-st));
    v.step(DT,{thr:c.thr,brk:c.brk||0,steer:st,hb:c.hb||0});maxB=Math.max(maxB,Math.abs(v.beta));lat=Math.max(lat,Math.abs(v.accB[2]));minUp=Math.min(minUp,V.mcol(V.qmat(v.q),1)[1]);}
  return [maxB*57.3,lat/9.81,minUp];}
const S={bt:[[.25,{steer:1,thr:0,brk:1}],[2,{steer:1,thr:0,brk:.6}],[1,{steer:1,thr:.3}]],lc:[[.7,{steer:-1,thr:.3}],[.7,{steer:1,thr:.3}],[1.5,{steer:0,thr:.3}]],
  sf:[[1.0,{steer:1,thr:.3}],[1.0,{steer:-1,thr:.3}],[1.5,{steer:0,thr:.3}]],sh:[[1.0,{steer:.5,thr:.3}],[1.0,{steer:-.5,thr:.3}],[1.5,{steer:0,thr:.3}]],
  lift:[[1.5,{steer:1,thr:.5}],[1.5,{steer:1,thr:0}]],ht:[[3,{steer:1,thr:.35}]]};
const only=process.argv[2];
for(const [bi,lvl,surf,mphs] of [[0,'real','asphalt',[40,60,80]],[1,'real','asphalt',[40,60,80]],[2,'real','asphalt',[40,60]],[3,'real','asphalt',[60,100]],[0,'real','dirt',[40,55]],[0,'real','gravel',[40,55]],[0,'real','grass',[30,45]],
  [0,'middle','asphalt',[60,90]],[1,'middle','asphalt',[60,100]],[0,'kids','asphalt',[60,100]],[3,'kids','asphalt',[100,130]]]){if(only&&lvl!==only)continue;
  for(const mph of mphs){const r=[];let g=0,rolled=false;for(const [n,sc] of Object.entries(S)){const [b,l,u]=run(bi,lvl,surf,mph,sc);if(n==='ht')g=l;if(u<.3)rolled=true;r.push(n+' '+b.toFixed(0).padStart(2)+(b>60?'!':b>25?'*':' '));}
    console.log((['Stock','Sleeper','Rock & Mud','Race'][bi]+' '+lvl+' '+surf+' '+mph+' mph').padEnd(30)+r.join(' ')+' grip '+g.toFixed(2)+' g'+(rolled?'  ROLLED':''));}}
for(const surf of ['asphalt','dirt','grass']){const v=mk(0,surf,'real');settle(v);let st=0,maxB=0;for(let k=0;k<240*5;k++){st=Math.min(1,st+3.2*DT);v.step(DT,{thr:1,brk:0,steer:st});if(k>240)maxB=Math.max(maxB,Math.abs(v.beta));}
  console.log(`Stock donut on ${surf}: full lock and full gas from rest, body slip ${(maxB*57.3).toFixed(0)}°`);}
