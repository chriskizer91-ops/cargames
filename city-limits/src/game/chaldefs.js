/* =====================================================================================
   CITY LIMITS — THE CHALLENGES: where each one is, what it asks and what a medal takes.
   Pure data built from the world (roads, the town's streets), so the game and tools/par.mjs (the
   robots that set the medal times) read the same routes. Map coordinates: x east, y north.
   Medals: tools/par.mjs drives every timed challenge twice on the game's own physics, once in the
   stock SUV (what a career starts with) and once in the build made for that ground; bronze is a
   little slower than the stock car's run, gold a little slower than the built car's (pars.js).
   ===================================================================================== */
import {PARS} from './pars.js';
import {BOG,FIELD,MOUNDS} from '../world/terrain.js';

export const MEDALS=[['gold','Gold','#ffd23f'],['silver','Silver','#c8d0dc'],['bronze','Bronze','#d88b4a']];
/* first-time pay for gold, silver, bronze by tier; a better medal later pays the difference, a repeat a tenth */
export const PAY={1:[1600,1000,600],2:[2600,1700,1000],3:[4000,2700,1700]};
export const KINDS={sprint:'Sprint',lap:'Laps',drag:'Standing quarter',trap:'Speed trap',mile:'Flying mile',jump:'Big air',drift:'Drift zone',crawl:'Rock crawl',climb:'Hill climb'};

/* ---------- polylines ---------- */
const L=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
export function resample(pts,ds=2,closed=false){
  const P=closed?[...pts,pts[0]]:pts,out=[P[0].slice()];let carry=0;
  for(let i=1;i<P.length;i++){const a=P[i-1],b=P[i],l=L(a,b);if(l<1e-6)continue;let t=ds-carry;
    while(t<=l){out.push([a[0]+(b[0]-a[0])*t/l,a[1]+(b[1]-a[1])*t/l]);t+=ds;}carry=l-(t-ds);}
  if(!closed&&L(out[out.length-1],P[P.length-1])>ds*.3)out.push(P[P.length-1].slice());
  if(closed&&L(out[out.length-1],out[0])<ds*.5)out.pop();
  return out;
}
/* corners rounded by a moving average (w points each side), the ends kept */
function smooth(pts,w,closed=false){const n=pts.length;return pts.map((p,i)=>{if(!closed&&(i<w||i>=n-w))return p;let x=0,y=0;
  for(let k=-w;k<=w;k++){const q=pts[((i+k)%n+n)%n];x+=q[0];y+=q[1];}return [x/(2*w+1),y/(2*w+1)];});}
/* the polyline moved d to the right of its direction of travel */
function offset(pts,d,closed=false){const n=pts.length;return pts.map((p,i)=>{const a=pts[closed?(i-1+n)%n:Math.max(0,i-1)],b=pts[closed?(i+1)%n:Math.min(n-1,i+1)];
  const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;return [p[0]+dy/l*d,p[1]-dx/l*d];});}
const lenOf=(pts,closed)=>{let s=0;for(let i=1;i<pts.length;i++)s+=L(pts[i-1],pts[i]);return s+(closed?L(pts[pts.length-1],pts[0]):0);};
function nearestIdx(r,x,y){let bi=0,bd=1e18;for(let i=0;i<r.N;i++){const d=(r.x[i]-x)**2+(r.y[i]-y)**2;if(d<bd){bd=d;bi=i;}}return bi;}
/* a stretch of a world road from near one point to near another (the short way round a closed one) */
function roadSlice(r,from,to){
  const a=nearestIdx(r,from[0],from[1]),b=to?nearestIdx(r,to[0],to[1]):r.N-1,N=r.N,out=[];
  if(!r.closed||b>=a&&(b-a)<=N/2){const s=Math.sign(b-a)||1;for(let i=a;i!==b+s;i+=s)out.push([r.x[i],r.y[i]]);}
  else{const fwd=((b-a)%N+N)%N,s=fwd<=N/2?1:-1,n=s>0?fwd:N-fwd;for(let k=0;k<=n;k++){const i=((a+s*k)%N+N)%N;out.push([r.x[i],r.y[i]]);}}
  return out;
}
function roadLoop(r,from,dir=1){const a=nearestIdx(r,from[0],from[1]),out=[];for(let k=0;k<r.N;k++){const i=((a+dir*k)%r.N+r.N)%r.N;out.push([r.x[i],r.y[i]]);}return out;}
/* the ring boulevard, anticlockwise from a point on its south side */
function ringPath(x0){const S=240,R=120,Q=360,pts=[];
  const seg=(a,b)=>{for(let t=0;t<1;t+=.02)pts.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);};
  const arc=(cx,cy,a0)=>{for(let k=0;k<24;k++){const a=a0+k/24*Math.PI/2;pts.push([cx+Math.cos(a)*R,cy+Math.sin(a)*R]);}};
  seg([x0,-Q],[S,-Q]);arc(S,-S,-Math.PI/2);seg([Q,-S],[Q,S]);arc(S,S,0);seg([S,Q],[-S,Q]);arc(-S,S,Math.PI/2);seg([-Q,S],[-Q,-S]);arc(-S,-S,Math.PI);seg([-S,-Q],[x0,-Q]);
  return pts;}

/* ---------- gates along a route ---------- */
function gatesOf(route,closed,every,r,extra=[]){
  const n=route.length,cum=[0];for(let i=1;i<n;i++)cum.push(cum[i-1]+L(route[i-1],route[i]));const tot=cum[n-1]+(closed?L(route[n-1],route[0]):0);
  const at=s=>{let i=0;while(i<n-1&&cum[i+1]<s)i++;const p=route[i],q=route[Math.min(n-1,i+1)],l=Math.max(1e-6,(cum[i+1]??tot)-cum[i]),t=Math.min(1,Math.max(0,(s-cum[i])/l));
    const x=p[0]+(q[0]-p[0])*t,y=p[1]+(q[1]-p[1])*t,dx=q[0]-p[0],dy=q[1]-p[1],dl=Math.hypot(dx,dy)||1;return {x,y,dx:dx/dl,dy:dy/dl,s};};
  const ss=new Set(extra.map(Math.round));const k=Math.max(1,Math.round(tot/every));for(let i=1;i<=k;i++)ss.add(Math.round(closed&&i===k?tot:tot*i/k));
  return [...ss].sort((a,b)=>a-b).map(s=>Object.assign(at(Math.min(s,tot-.01)),{r,s}));
}
const startOf=(route,back=0)=>{const a=route[0],b=route[Math.min(route.length-1,6)],yaw=Math.atan2(b[1]-a[1],b[0]-a[0]);return {x:a[0]-Math.cos(yaw)*back,y:a[1]-Math.sin(yaw)*back,yaw};};

/* ---------- medals from the robots' times ----------
   time: bronze 12% over the stock SUV, gold 4% over the built car, silver between;
   speed: bronze 6% under the stock SUV, gold 3% under the built car */
function medalsFrom(id,better){const p=PARS[id];if(!p)return null;
  if(better==='low'){const b=p.stock*1.12,g=Math.min(b*.8,p.best*1.04),s=Math.sqrt(b*g);return [g,s,b].map(v=>+v.toFixed(1));}
  const b=p.stock*.94,g=Math.max(b*1.15,p.best*.97),s=(b+g)/2;return [g,s,b].map(v=>+v.toFixed(2));}

/* ---------- the list ---------- */
export function buildChallenges(W){
  const road=id=>W.D.roads.find(r=>r.id===id),C=[];
  const add=o=>{o.better=o.better||'low';o.unit=o.unit||'time';o.medals=o.medals||medalsFrom(o.id,o.better)||o.guess;o.len=o.route?lenOf(o.route,o.closed):0;C.push(o);return o;};
  /* --- town --- */
  {const route=resample(ringPath(-60),2,true);
    add({id:'loop',name:'Limits Loop',kind:'lap',tier:1,where:'Limits Boulevard',laps:2,closed:true,route,lane:6,surf:'asphalt',
      blurb:'Two laps of the boulevard round town, anticlockwise. Wide, fast, four long bends.',gates:gatesOf(route,true,190,17),start:startOf(route),best:'coupeGT',guess:[110,125,150]});}
  {const route=resample([[-220,0],[182.3,0]],2);
    add({id:'quarter',name:'Main Avenue Quarter',kind:'drag',tier:1,where:'Main Avenue',route,lane:3.5,surf:'asphalt',
      blurb:'A standing quarter mile down Main Avenue, east, under the street lights. Launch it.',gates:[Object.assign(gatesOf(route,false,500,12)[0],{finish:true})],start:startOf(route),best:'sleeper',guess:[10,12,15]});}
  {const route=smooth(resample([[-330,240],[-120,240],[-120,120],[120,120],[120,-120],[240,-120],[240,-300]],2),5);
    add({id:'dash',name:'Downtown Dash',kind:'sprint',tier:2,where:'Downtown',route,lane:2.4,surf:'asphalt',
      blurb:'Right through the middle of town: six blocks of hard turns from Sunset Avenue to the south side.',gates:gatesOf(route,false,120,10),start:startOf(route),best:'coupeGT',guess:[60,70,85]});}
  add({id:'drift',name:'Neon Row Drift',kind:'drift',tier:1,where:'Neon Row',unit:'points',better:'high',time:60,zone:{x:-190,y:-120,r:210},
    blurb:'Sixty seconds on Neon Row and the streets round it. Angle and speed score, a wall takes the chain.',start:{x:-330,y:-120,yaw:0},medals:[14000,8000,3500]});
  /* --- the desert --- */
  {const route=roadSlice(road('saltE'),[400,0],[1790,0]);
    add({id:'salt',name:'Salt Road Run',kind:'sprint',tier:1,where:'Salt Road east',route,lane:0,surf:'asphalt',
      blurb:'From the edge of town to the salt, flat out on the old paved road. Mind the dips.',gates:gatesOf(route,false,180,10),start:startOf(route),best:'coupeGT',guess:[30,36,45]});}
  {const route=roadSlice(road('saltW'),[-400,0],[-1420,0]);
    add({id:'trap',name:'Salt Road Speed Trap',kind:'trap',tier:2,where:'Salt Road west',route,lane:0,surf:'asphalt',unit:'speed',better:'high',
      blurb:'A kilometre run-up from the diner, then the radar gun. Only the speed through the trap counts.',gates:[Object.assign(gatesOf(route,false,5000,11)[0],{trap:true})],start:startOf(route),best:'wedgeNR',guess:[85,70,55]});}
  {const r=road('ridge'),route=roadSlice(r,[0,392],[78,1251]);
    add({id:'ridge',name:'Ridge Road Climb',kind:'climb',tier:2,where:'Ridge Road',route,lane:0,surf:'gravel',
      blurb:'Up the gravel into the hills to the summit: hairpins, loose stone and a long drop off the edge.',gates:gatesOf(route,false,140,9),start:startOf(route),best:'hatchB',guess:[70,85,105]});}
  {const route=roadSlice(road('wash'),[0,-392],[0,-1830]);
    add({id:'wash',name:'Wash Road',kind:'sprint',tier:1,where:'Wash Road',route,lane:0,surf:'dirt',
      blurb:'Down the dirt road into the dry wash, over the table-top and out to the salt.',gates:gatesOf(route,false,160,9),start:startOf(route),best:'hatchB',guess:[60,72,90]});}
  {const lp=road('loop'),a=[871,0],b=[0,871],route=roadSlice(lp,a,b);
    add({id:'rimNE',name:'Rim Trail North',kind:'sprint',tier:2,where:'Rim Trail',route,lane:0,surf:'trail',
      blurb:'The trail that rings the town, from the Salt Road crossing round to Ridge Road: narrow, rutted, a kicker in the middle.',gates:gatesOf(route,false,120,8),start:startOf(route),best:'hatchB',guess:[90,110,135]});
    const dir=L([lp.x[nearestIdx(lp,a[0],a[1])+1],lp.y[nearestIdx(lp,a[0],a[1])+1]],b)<L(a,b)?1:-1,full=roadLoop(lp,a,dir);
    add({id:'rim',name:'Rim Trail Lap',kind:'lap',tier:3,where:'Rim Trail',laps:1,closed:true,route:full,lane:0,surf:'trail',
      blurb:'All the way round the town on the trail: five and a half kilometres, four kickers, the boulder field and the hills.',gates:gatesOf(full,true,200,8),start:startOf(full),best:'hatchB',guess:[330,400,480]});}
  {const route=resample([[BOG.x-110,BOG.y-4],[BOG.x-40,BOG.y],[BOG.x+40,BOG.y],[BOG.x+100,BOG.y+6]],2);
    add({id:'bog',name:'The Bog',kind:'sprint',tier:2,where:'The mud bog',route,lane:0,surf:'mud',
      blurb:'Straight through the middle of the bog south of town. It has eaten bigger trucks than yours.',gates:gatesOf(route,false,70,9),start:startOf(route),best:'crawler',guess:[18,26,40]});}
  {const big=MOUNDS.slice().sort((a,b)=>b.h-a.h).slice(0,6),pts=[[FIELD.x+60,FIELD.y+70]];let cur=pts[0];const left=big.slice();
    while(left.length){left.sort((a,b)=>L(cur,[a.x,a.y])-L(cur,[b.x,b.y]));const m=left.shift();cur=[m.x,m.y];pts.push(cur);}
    pts.push([cur[0]+(cur[0]-FIELD.x)*.6,cur[1]+(cur[1]-FIELD.y)*.6]);
    const route=resample(pts,2),g=[];let s=0;for(let i=1;i<pts.length;i++){s+=L(pts[i-1],pts[i]);g.push(s);}
    add({id:'rocks',name:'Boulder Field',kind:'crawl',tier:3,where:'Boulder field',route,lane:0,surf:'rock',
      blurb:'Over the top of the six biggest rocks in the field, in order. Clearance, lockers and a light right foot.',gates:gatesOf(route,false,1e5,4.5,g),start:startOf(route),best:'crawler',guess:[50,75,110]});}
  {const route=roadSlice(road('wash'),[0,-1100],[0,-1560]),J=W.D.jumps.find(j=>j.road==='wash');
    add({id:'jump',name:'Big Air',kind:'jump',tier:2,where:'Wash Road',route,lane:0,surf:'dirt',unit:'dist',better:'high',kicker:{x:J.ox,y:J.oy},
      blurb:'Three hundred metres of run-up to the table-top in the wash. The longest flight counts.',gates:[Object.assign(gatesOf(route,false,1e5,9,[])[0],{finish:true})],start:startOf(route),best:'hatchB',medals:[52,38,24]});}
  {const route=resample([[1880,0],[4700,0]],4),s0=3000-1880,s1=s0+1609.344;
    add({id:'mile',name:'Flying Mile',kind:'mile',tier:3,where:'The salt flats',route,lane:0,surf:'salt',unit:'speed',better:'high',mile:[s0,s1],
      blurb:'A mile on the salt, timed flying: get it wound up, then hold it flat between the two lights.',gates:gatesOf(route,false,1e5,30,[s0,s1]),start:startOf(route),best:'hyperTrack',guess:[85,70,55]});}
  for(const c of C){c.pay=PAY[c.tier];if(!c.limit)c.limit=c.unit==='time'&&c.medals?Math.round(c.medals[2]*2+20):c.kind==='drift'?c.time:c.kind==='mile'?150:c.kind==='jump'?60:90;}
  return C;
}
/* a result's medal: 0 gold, 1 silver, 2 bronze, -1 none */
export function medalOf(c,v){if(v==null||!c.medals)return -1;for(let i=0;i<3;i++)if(c.better==='low'?v<=c.medals[i]:v>=c.medals[i])return i;return -1;}
export function fmtVal(c,v,mph=true){if(v==null)return '—';
  if(c.unit==='time'){const m=Math.floor(v/60),s=v-m*60;return m?m+':'+(s<10?'0':'')+s.toFixed(2):s.toFixed(2)+' s';}
  if(c.unit==='speed')return mph?(v*2.23694).toFixed(1)+' mph':(v*3.6).toFixed(1)+' km/h';
  if(c.unit==='dist')return mph?Math.round(v*3.28084)+' ft':v.toFixed(1)+' m';
  return Math.round(v).toLocaleString('en-US')+' pts';}
