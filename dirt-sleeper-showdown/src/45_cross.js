/* =====================================================================================
   THE CROSS-COUNTRY ROUTES (Showdown). Point-to-point races over more than one kind of ground, made from
   the world's own roads and trails, joined by short runs across open country. Each leg is either a stretch
   of a path the world already has (from the point nearest a to the point nearest b, either way along it,
   or round a loop) or a few points of its own over open ground. Every leg says how wide the going is, so
   the robots' line (44_ai's RaceLine) knows how far either side of the middle it may go: a ranch drive is
   narrow, a dry lake is not. Nothing here draws or steps; 60_race builds the line and runs the race.
   ===================================================================================== */
const CROSS_ROUTES=[
  {id:'mudtar',name:'Mud to Tarmac',purse:2800,field:6,
    blurb:'Off the yard and straight through the mud pit, down the ranch drive, the county gravel and the lake road, then across the field and onto the race track to the line.',
    legs:[{pts:[[16,3],[-20,3],[-60,3]],hw:7},{pts:[[-80,2],[-146,2]],hw:9},{pts:[[-158,10],[-160,26],[-150,44],[-130,62],[-104,76],[-84,90]],hw:4.6},
      {p:'drive',a:[-76,100],b:[-36,402],hw:3.6},{p:'cr',a:[-36,402],b:[120,407],hw:4.6},{p:'lakeRd',a:[120,407],b:[87,558],hw:4.2},
      {pts:[[106,564],[128,569]],hw:5},{p:'track',a:[158,573],b:[420,505],dir:1,hw:6.4}],
    grid:36,end:-3},
  {id:'peak',name:'Paddock to the Peak',purse:3600,field:6,
    blurb:'Out of the paddock gate and up Range Road\'s gravel, west on the forest road, then the paved switchbacks of Summit Road to the mast on Bald Mountain.',
    legs:[{pts:[[480,494],[480,470],[480,456]],hw:10},{p:'range',a:[480,452],b:[250,-689],hw:4.6},{p:'summit',a:[250,-690],b:[106,-1252],hw:4.2}],
    grid:30,end:-12},
  {id:'hills',name:'Home to the Hills',purse:3400,field:6,
    blurb:'Out of the yard and up the rutted lane, west along the county road, then the Cedar Hills gravel, over the crests and through the ford.',
    legs:[{pts:[[-466,647],[-463,636],[-460,624]],hw:7},{p:'lane',a:[-458,614],b:[-331,411],hw:2.2},{p:'cr',a:[-331,404],b:[-905,390],hw:4.6},
      {p:'rally',a:[-905,390],b:[-1290,-650],hw:3.9}],
    grid:24,end:-4},
  {id:'lakesp',name:'Lake to Speedway',purse:4000,field:6,
    blurb:'From the dry lake\'s clay up the lake road, east the length of the county road, north to Speedway Park and one lap of the short course: jumps, whoops and berms.',
    legs:[{pts:[[60,1090],[61,1040],[62,1000]],hw:13},{p:'lakeRd',a:[62,985],b:[120,407],hw:4.6},{p:'cr',a:[120,407],b:[980,402],hw:4.6},
      {p:'spRd',a:[980,399],b:[1030,-82],hw:4.6},{p:'short',a:[1050,-90],b:[1050,-90],dir:1,hw:6.4}],
    grid:42,end:-4}
];
/* the paths a leg can follow, by name */
function crossPaths(W){const C=W.country,F=C.far;
  return {loop:W.loop,climb:W.climb,mudTrack:W.mudTrack,cr:C.cr,range:C.range,drive:C.drive,lane:C.lane,woods:C.woods,conn:C.conn,track:C.track,
    oval:F.oval,short:F.short,summit:F.summit,rally:F.rally,mill:F.mill,lakeLoop:F.lakeLoop,lakeRd:F.lakeRd,spRd:F.spRd};}
/* a route's points, a few metres apart, each with the half width of the going there: {pts, hw, path, hwAt(s)} */
function crossBuild(def,W,makePath){
  const P=crossPaths(W),pts=[],hws=[];
  const push=(x,z,hw)=>{const p=pts[pts.length-1];
    if(p){const d=Math.hypot(x-p[0],z-p[1]);if(d<1)return;const n=Math.floor(d/3);for(let k=1;k<n;k++){pts.push([p[0]+(x-p[0])*k/n,p[1]+(z-p[1])*k/n]);hws.push(Math.min(hw,hws[hws.length-1]));}}
    pts.push([x,z]);hws.push(hw);};
  const joins=[];
  for(const g of def.legs){
    if(pts.length)joins.push(pts.length-1);
    if(g.pts){for(const [x,z] of g.pts)push(x,z,g.hw);continue;}
    const p=P[g.p],na=p.nearest(g.a[0],g.a[1],8),nb=p.nearest(g.b[0],g.b[1],8);if(!na||!nb)throw new Error('route '+def.id+': no '+g.p+' near a leg end');
    let a=na.s,b=nb.s;
    /* round a loop the way it says (a leg that ends where it starts goes all the way round) */
    if(p.closed){if((g.dir||1)>0){while(b<=a+.5)b+=p.len;}else{while(b>=a-.5)b-=p.len;}}
    const n=Math.max(1,Math.floor(Math.abs(b-a)/3)),w=s=>p.closed?((s%p.len)+p.len)%p.len:Math.max(0,Math.min(p.len,s));
    for(let k=0;k<=n;k++){const c=p.at(w(a+(b-a)*k/n));push(c[0],c[1],g.hw);}}
  /* where one leg turns sharply into the next (a road junction), the corner is rounded: the points nearer it than a
     few metres are left out, so the line takes the curve a car takes through a crossroads and the robots brake for it */
  const drop=new Uint8Array(pts.length),dist=(i,j)=>Math.hypot(pts[i][0]-pts[j][0],pts[i][1]-pts[j][1]);
  for(const j of joins){const back=Math.max(0,j-3),fwd=Math.min(pts.length-1,j+3);if(back===j||fwd===j)continue;
    const ax=pts[j][0]-pts[back][0],az=pts[j][1]-pts[back][1],bx=pts[fwd][0]-pts[j][0],bz=pts[fwd][1]-pts[j][1],
      th=Math.acos(Math.max(-1,Math.min(1,(ax*bx+az*bz)/((Math.hypot(ax,az)*Math.hypot(bx,bz))||1))));
    if(th<.5)continue;const rc=Math.max(5,Math.min(12,4+th*180/Math.PI*.08));
    for(let k=j;k>0&&dist(k,j)<rc;k--)drop[k]=1;for(let k=j+1;k<pts.length-1&&dist(k,j)<rc;k++)drop[k]=1;}
  for(let i=pts.length-1;i>=0;i--)if(drop[i]){pts.splice(i,1);hws.splice(i,1);}
  const path=makePath(pts,false);
  /* the half width along the made path: the route's own, narrowest within 4 m either side (no sudden widening into a road's edge) */
  const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
  const tot=cum[cum.length-1],hwRaw=s=>{const u=s/path.len*tot;let lo=0,hi=cum.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(cum[m]<=u)lo=m;else hi=m;}return hws[lo];};
  const hwAt=s=>Math.min(hwRaw(s),hwRaw(Math.max(0,s-4)),hwRaw(Math.min(path.len,s+4)));
  return {pts,hws,path,hwAt};
}
/* what each surface counts as: the ratings' six kinds of ground (57_ratings) */
const CROSS_KIND={mud:'mud',ruts:'mud',water:'mud',gravel:'gravel',asphalt:'asphalt',concrete:'asphalt',rock:'rocks',dirt:'dirt',trail:'dirt',strip:'dirt',grass:'dirt'};
/* a route's mix of ground, from its line: the share of its length on each kind */
function crossMix(L){const m={};for(let i=0;i<L.n;i++){const k=CROSS_KIND[L.surf[i]]||'dirt';m[k]=(m[k]||0)+1/L.n;}return m;}
