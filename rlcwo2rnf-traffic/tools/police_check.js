/* Police mode (src/60_police.js) in a real browser, headless, the game's own step driving it:
     chase   police on; you from the country east of town, east onto the salt flats and on across them at about 80 mph
             for two minutes (a little controller of the test's own holding the heading): how far behind they keep,
             how often one had to come back in behind you, that none is ever lost for good
     bust    then you stop: they catch up and call it, and after holding off they come back
   Checks: no NaNs; police out the whole time; the nearest within 300 m at least 90% of the chase; a bust within 40 s
   of stopping. Any failure, or a page error, makes the exit code 1.
     town    a drive through town (west on Highway 40, six turns on the streets, out east), the police behind: how
             often they hit a wall, a car or you, roll, get stuck, or have to come back in behind you
     hwy     east on Highway 40 in its traffic at 65 mph, the police behind: the same count
   usage: node tools/police_check.js [chase,bust,town,hwy]      env: QUALITY (mobile), CAR (a build id, default the stock SUV), FILE, W, H */
const {chromium}=require('playwright');const path=require('path');
const file=process.env.FILE?path.resolve(process.env.FILE):path.resolve(__dirname,'..','rlcwo2rnf-traffic.html');
const which=(process.argv[2]||'chase,bust').split(',');
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const pg=await b.newPage({viewport:{width:+(process.env.W||480),height:+(process.env.H||270)},deviceScaleFactor:1});const errs=[];let fails=0;
  pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push(m.text().slice(0,300));});
  await pg.addInitScript(()=>{try{localStorage.clear();}catch(e){}});
  await pg.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
  const t0=Date.now();await pg.goto('file://'+file+`?quality=${process.env.QUALITY||'mobile'}`);
  try{await pg.waitForFunction(()=>window.__game&&document.getElementById('loading').hidden,null,{timeout:600000,polling:1000});}catch(e){errs.push('boot timed out');}
  console.log('boot',((Date.now()-t0)/1000).toFixed(1)+'s');
  await pg.evaluate(car=>{window.requestAnimationFrame=()=>0;const g=window.__game;g.GAME.hold=true;if(car){const i=g.BUILDS.findIndex(b=>b.id===car);if(i>=0)g.spawnCar(i);}},process.env.CAR||'');
  const run=async(name,fn,check,arg)=>{const t=Date.now();try{const r=await pg.evaluate(fn,arg);const bad=check(r);if(bad.length)fails++;
      console.log(name,((Date.now()-t)/1000).toFixed(0)+'s',bad.length?'FAIL: '+bad.join(', '):'pass',JSON.stringify(r));}
    catch(e){fails++;errs.push(name+': '+e.message.slice(0,300));console.log(name,'FAILED',e.message.slice(0,300));}};
  /* the test's own driver for the town and the highway: along a list of points (pure pursuit), as fast as the corners
     ahead allow, braking for a car ahead in its way; and a count of how the police drive, frame by frame */
  await pg.evaluate(()=>{
    window.__drv=(g,route,vmax)=>{const t=g.GAME.car,inp={steer:0,thr:0,brk:0,hb:0,nos:false};let seg=0;const n=route.length;
      return {inp,go:()=>{const x=t.p[0],z=t.p[2],v=t.speed,F=t.M,fl=Math.hypot(F[0],F[6])||1,fx=F[0]/fl,fz=F[6]/fl;
        while(seg<n-2){const [ax,az]=route[seg],[bx,bz]=route[seg+1],ux=bx-ax,uz=bz-az,ul=Math.hypot(ux,uz);if(((x-ax)*ux+(z-az)*uz)/ul>ul-Math.max(6,v*.45))seg++;else break;}
        const [ax,az]=route[seg],[bx,bz]=route[seg+1],ux=bx-ax,uz=bz-az,ul=Math.hypot(ux,uz),s=Math.max(0,((x-ax)*ux+(z-az)*uz)/ul),Ld=Math.max(7,Math.min(28,v*.7));
        let tx,tz;if(s+Ld<=ul||seg>=n-2){const q=Math.min(s+Ld,ul+(seg>=n-2?Ld:0));tx=ax+ux/ul*q;tz=az+uz/ul*q;}
        else{const [cx,cz]=route[seg+2],q=s+Ld-ul,wx=cx-bx,wz=cz-bz,wl=Math.hypot(wx,wz);tx=bx+wx/wl*Math.min(q,wl);tz=bz+wz/wl*Math.min(q,wl);}
        const dx=tx-x,dz=tz-z,dl=Math.hypot(dx,dz)||1,al=Math.atan2((dx*-fz+dz*fx)/dl,(dx*fx+dz*fz)/dl),c=t.c,lim=Math.min(c.lock,t.tyre.aPk*1.6+c.wb*9/Math.max(v*v,1));
        inp.steer=Math.max(-1,Math.min(1,Math.atan(2*c.wb*Math.sin(al)/Ld)/lim));
        /* the speed: the road's, slowed for the next corner (8 m/s through it, braking at 4.5 m/s2) and a car ahead */
        let vt=vmax;if(seg<n-2){const dc=ul-s;vt=Math.min(vt,Math.sqrt(64+2*4.5*Math.max(0,dc-4)));}
        for(const o of g.TRF_ON){const ox=o.x-x,oz=o.z-z,f=ox*fx+oz*fz,sd=-ox*fz+oz*fx;if(f>3&&f<60&&Math.abs(sd)<2.6)vt=Math.min(vt,Math.max(0,o.v-1+Math.sqrt(2*4*Math.max(0,f-9))));}
        inp.thr=v<vt-1?1:v<vt?.3:0;inp.brk=v>vt+1.5?Math.min(1,(v-vt)/6):0;return seg>=n-2&&Math.hypot(route[n-1][0]-x,route[n-1][1]-z)<30;}};};
    window.__pm=g=>{const m={by:{},wall:0,car:0,you:0,flips:0,stucks:0,frames:0,within80:0,sum:0,maxSpd:0,last:[]},cool=new Map(),prev=new Map();
      return {m,tick:(fr)=>{const t=g.GAME.car;m.frames++;let near=1e9;
        for(const P of g.POL.cars){if(!P.V)continue;const V=P.V,e=V.ev,d=Math.hypot(V.p[0]-t.p[0],V.p[2]-t.p[2]),pv=prev.get(P)||{rev:0,flip:false},c=cool.get(P)||0;near=Math.min(near,d);
          if(fr-c>40){if(e.car>0){m.car++;if(d<7)m.you++;cool.set(P,fr);
              let w=d<7?'you':'?';for(const o of g.TRF_ON)if(Math.hypot(o.x-V.p[0],o.z-V.p[2])<7)w='traffic('+o.mode+')';for(const o of g.POL.cars)if(o!==P&&o.V&&Math.hypot(o.V.p[0]-V.p[0],o.V.p[2]-V.p[2])<7)w='police';
              const wk=w.replace(/\(.*/,'');m.by[wk]=(m.by[wk]||0)+1;m.last.push(w+'@'+Math.round(V.p[0])+','+Math.round(V.p[2]));}
            else if(e.wall>3){m.wall++;cool.set(P,fr);m.last.push('wall'+e.wall.toFixed(0)+'@'+Math.round(V.p[0])+','+Math.round(V.p[2]));}}
          e.wall=0;e.car=0;const fl=V.M[4]<.4;if(fl&&!pv.flip){m.flips++;m.last.push('ROLL@'+Math.round(V.p[0])+','+Math.round(V.p[2])+' '+Math.round(V.speed)+'m/s');}if(P.revT>0&&pv.rev<=0){m.stucks++;m.last.push('stuck@'+Math.round(V.p[0])+','+Math.round(V.p[2]));}prev.set(P,{rev:P.revT,flip:fl});m.maxSpd=Math.max(m.maxSpd,V.speed);}
        if(near<1e8){m.sum+=near;if(near<80)m.within80++;}}};};
  });
  const townRoute=[[700,-5.5],[120,-5.5],[120,-240],[-120,-240],[-120,120],[240,120],[240,5.5],[1700,5.5]];
  for(const [name,route,vmax,secs] of [['town',townRoute,20,200],['hwy',[[500,5.7],[3000,5.7]],29,110]])if(which.includes(name))await run(name,async([route,vmax,secs])=>{
    const g=window.__game,G=g.GAME,dt=1/60,wait=ms=>new Promise(r=>setTimeout(r,ms));
    g.applyTod('day');g.closeMenu();G.state='drive';g.APP.police=false;g.step(dt);
    g.placeCar(route[0][0],route[0][1],Math.atan2(-(route[1][1]-route[0][1]),route[1][0]-route[0][0]));g.APP.cam=1;g.APP.police=true;g.render(dt);
    const t=G.car,drv=window.__drv(g,route,vmax),PM=window.__pm(g),r0=g.POL.respawns;let nan=0,done=-1,f=0,offR=0;
    for(;f<secs*60;f++){const fin=drv.go();g.setTestInput(drv.inp);g.APP.t+=dt;g.step(dt);PM.tick(f);
      if(fin&&done<0){done=f*dt;break;}
      {let best=1e9;for(let i=0;i+1<route.length;i++){const [ax,az]=route[i],[bx,bz]=route[i+1],ux=bx-ax,uz=bz-az,L2=ux*ux+uz*uz,q=Math.max(0,Math.min(1,((t.p[0]-ax)*ux+(t.p[2]-az)*uz)/L2));best=Math.min(best,Math.hypot(t.p[0]-ax-ux*q,t.p[2]-az-uz*q));}offR=Math.max(offR,best);}
      for(const P of g.POL.cars)if(P.V&&!P.V.p.every(Number.isFinite))nan++;
      if(f%300===299){g.render(dt);await wait(0);}}
    g.setTestInput(null);const m=PM.m;
    return {you:[Math.round(t.p[0]),Math.round(t.p[2])],secs:+(f*dt).toFixed(0),finished:done>=0,yourWorstOffRoute:+offR.toFixed(1),policeWallHits:m.wall,policeCarHits:m.car,carHitsBy:m.by,hitYou:m.you,flips:m.flips,stuck:m.stucks,
      respawns:g.POL.respawns-r0,meanGap:Math.round(m.sum/Math.max(1,m.frames)),within80Share:+(m.within80/Math.max(1,m.frames)).toFixed(2),policeTop:Math.round(m.maxSpd*2.237)+'mph',nan,log:m.last.filter((x,i,a)=>i===0||x.split('@')[0]!==a[i-1].split('@')[0]).slice(0,24)};},
    r=>{const bad=[];if(r.nan)bad.push('NaN');if(!r.finished)bad.push('your car never got round');if(r.yourWorstOffRoute>8)bad.push('your car left the route (the test driver)');return bad;},[route,vmax,secs]);
  if(which.includes('chase'))await run('chase',async()=>{
    const g=window.__game,G=g.GAME,dt=1/60,wait=ms=>new Promise(r=>setTimeout(r,ms));
    g.applyTod('day');g.closeMenu();G.state='drive';g.placeCar(1800,40,0);g.APP.cam=1;g.APP.police=true;g.render(dt);
    const t=G.car,inp={steer:0,thr:0,brk:0,hb:0,nos:false},vt=36,zt=40;let nan=0,within=0,frames=0,maxD=0,sum=0,out=0;const trace=[];
    for(let f=0;f<120*60;f++){const M=t.M,hl=Math.hypot(M[0],M[6])||1,hz=M[6]/hl;inp.steer=Math.max(-.3,Math.min(.3,.03*(zt-t.p[2])-1.2*hz));
      inp.thr=Math.max(0,Math.min(1,(vt-t.speed)*.3));inp.brk=t.speed>vt+3?.3:0;g.setTestInput(inp);g.APP.t+=dt;g.step(dt);
      if(t.M[4]<.3)g.placeCar(t.p[0],t.p[2],0);
      const P=g.POL,n=P.cars.filter(c=>c.V).length;frames++;if(n)out++;const d=P.near;if(d<300)within++;if(d<1e8){maxD=Math.max(maxD,d);sum+=d;}
      for(const c of P.cars)if(c.V&&!c.V.p.every(Number.isFinite))nan++;
      if(f%600===0)trace.push(Math.round(t.p[0])+':'+(d<1e8?Math.round(d):'-'));
      if(f%300===299){g.render(dt);await wait(0);}}
    g.setTestInput(null);const P=g.POL;
    return {you:[Math.round(t.p[0]),Math.round(t.p[2]),Math.round(t.speed*2.237)+'mph'],place:G.place,nan,policeOutShare:+(out/frames).toFixed(3),within300Share:+(within/frames).toFixed(3),
      meanGap:Math.round(sum/frames),maxGap:Math.round(maxD),respawns:P.respawns,cars:P.cars.filter(c=>c.V).length,trace,cues:g.VOX.log.slice()};},
    r=>{const bad=[];if(r.nan)bad.push('NaN');if(r.policeOutShare<.95)bad.push('police missing');if(r.within300Share<.9)bad.push('lost you');return bad;});
  if(which.includes('bust'))await run('bust',async()=>{
    const g=window.__game,G=g.GAME,dt=1/60,wait=ms=>new Promise(r=>setTimeout(r,ms)),t=G.car,b0=g.POL.busts;g.APP.police=true;
    let at=-1,nan=0;
    for(let f=0;f<60*60;f++){g.setTestInput({steer:0,thr:0,brk:1,hb:1,nos:false,park:true});g.APP.t+=dt;g.step(dt);
      for(const c of g.POL.cars)if(c.V&&!c.V.p.every(Number.isFinite))nan++;
      if(at<0&&g.POL.busts>b0)at=f*dt;if(f%300===299){g.render(dt);await wait(0);}}
    g.setTestInput(null);return {bustedAfter:at<0?null:+at.toFixed(1),busts:g.POL.busts-b0,nan,nearest:Math.round(g.POL.near),holding:g.POL.holdT>0,cues:g.VOX.log.slice(-6)};},
    r=>{const bad=[];if(r.nan)bad.push('NaN');if(r.bustedAfter===null||r.bustedAfter>40)bad.push('never busted');return bad;});
  if(errs.length){fails++;console.log('PAGE ERRORS:\n  '+errs.slice(0,8).join('\n  '));}else console.log('no page errors');
  await b.close();process.exit(fails?1:0);
})();
