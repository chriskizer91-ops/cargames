/* The traffic on Highway 40 (src/60_traffic.js) in a real browser, headless, the game's own step driving it:
     park    you stopped across a lane out in the country for 45 s: the cars behind slow, stop or go round; none
             goes through you
     drive   you at 70 mph in the outer eastbound lane from the west, through town (its signals) and out east, 90 s
   Each prints what it saw and checks: no NaNs; never more cars than the budget; no two traffic cars ever overlapping
   (their outlines, as boxes on the ground); none overlapping you; none crossing a stop line on a red that had been red
   for a second already; every car within its lane's width of a lane (but while moving over). Any failure, or a page
   error, makes the exit code 1.
   The highway's budget counts its own cars; the streets' (60_streets) are watched for overlaps with everyone, and only
   a signal's line counts for the red (a stop sign's has no colour).
   usage: node tools/traffic_check.js [park,drive]      env: QUALITY (mobile), N (cars: the Dev tab's count; level's
          when unset), STREETS (off: the streets' traffic out, the highway as it was), FILE, W, H */
const {chromium}=require('playwright');const path=require('path');
const file=process.env.FILE?path.resolve(process.env.FILE):path.resolve(__dirname,'..','rlcwo2rnf-traffic.html');
const which=(process.argv[2]||'park,drive').split(',');
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const pg=await b.newPage({viewport:{width:+(process.env.W||480),height:+(process.env.H||270)},deviceScaleFactor:1});const errs=[];let fails=0;
  pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push(m.text().slice(0,300));});
  await pg.addInitScript(()=>{try{localStorage.clear();}catch(e){}});
  await pg.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
  const t0=Date.now();
  await pg.goto('file://'+file+`?quality=${process.env.QUALITY||'mobile'}`);
  try{await pg.waitForFunction(()=>window.__game&&(document.getElementById('loading').hidden||/wrong|compile/.test(document.getElementById('loading').textContent)),null,{timeout:600000,polling:1000});}
  catch(e){errs.push('boot timed out');}
  console.log('boot',((Date.now()-t0)/1000).toFixed(1)+'s');
  await pg.evaluate(([n,st])=>{window.requestAnimationFrame=()=>0;const g=window.__game;g.GAME.hold=true;if(n)g.DEVW.trafN=n;if(st)g.DEVW.stS=st;},[process.env.N||'',process.env.STREETS||'']);
  /* the shared watcher: put into the page once */
  await pg.evaluate(()=>{
    const obb=(ax,az,afx,afz,aL,aW,bx,bz,bfx,bfz,bL,bW)=>{for(const [ux,uz] of [[afx,afz],[-afz,afx],[bfx,bfz],[-bfz,bfx]]){
      const ra=Math.abs(afx*ux+afz*uz)*aL/2+Math.abs(-afz*ux+afx*uz)*aW/2,rb=Math.abs(bfx*ux+bfz*uz)*bL/2+Math.abs(-bfz*ux+bfx*uz)*bW/2;if(Math.abs((bx-ax)*ux+(bz-az)*uz)>ra+rb)return false;}return true;};
    window.__tw={obb,new(){return {frames:0,nan:0,maxOn:0,carCar:0,carYou:0,youCar:0,touch:new Map(),hist:new Map(),runs:[],cc:[],cy:[],redRuns:0,offLane:0,minGapYou:1e9,stopsSeen:0,last:new Map(),lc0:window.__game.TRF.laneChanges,sp0:window.__game.TRF.spawned,en0:window.__game.TRF.engaged||0,re0:window.__game.TRF.released||0,physFrames:0,ms:0};},
      look(W,dt){const g=window.__game,T=g.TRF,ON=g.TRF_ON,t=g.GAME.car,M=t.M,hf=Math.hypot(M[0],M[6])||1,yf=[M[0]/hf,M[6]/hf];W.frames++;W.maxOn=Math.max(W.maxOn,ON.filter(c=>!c.L.street).length);if(W.frames>120){W.ms=Math.max(W.ms,T.ms);W.msSum=(W.msSum||0)+T.ms;}
        for(let i=0;i<ON.length;i++){const c=ON[i];if(!Number.isFinite(c.x+c.y+c.z+c.v+c.s)||c.veh&&!c.veh.p.every(Number.isFinite))W.nan++;if(c.mode!=='kin'){W.physFrames++;continue;}
          /* within a lane (moving over excepted) */
          if(c.lcT>=c.lcDur){let off=1e9;for(const z of g.HW.lanes)off=Math.min(off,Math.abs(Math.abs(c.lp)-z));if(off>.05&&c.dir!==0)W.offLane++;}
          for(let j=i+1;j<ON.length;j++){const o=ON[j];if(o.mode!=='kin'||Math.abs(o.x-c.x)>12||Math.abs(o.z-c.z)>12)continue;
            if(obb(c.x,c.z,c.fx,c.fz,c.m.L,c.m.W,o.x,o.z,o.fx,o.fz,o.m.L,o.m.W)){W.carCar++;if(W.cc.length<2)W.cc.push({a:c.m.id,b:o.m.id,ax:+c.x.toFixed(1),bx:+o.x.toFixed(1),alp:+c.lp.toFixed(2),blp:+o.lp.toFixed(2),av:+c.v.toFixed(1),bv:+o.v.toFixed(1),ad:c.dir,bd:o.dir,ahist:(W.hist.get(c)||{rows:[]}).rows.slice(-6),bhist:(W.hist.get(o)||{rows:[]}).rows.slice(-6)});}}
          /* overlapping you: whose doing, by who was behind at the first touch (a car into you is the traffic's fault;
             you into a car, before the physics takes over near you, is yours) */
          const dxy=t.p[0]-c.x,dzy=t.p[2]-c.z,aly=dxy*c.fx+dzy*c.fz;
          if(obb(c.x,c.z,c.fx,c.fz,c.m.L,c.m.W,t.p[0],t.p[2],yf[0],yf[1],t.c.body.L,t.c.body.W)){let w=W.touch.get(c);if(!w){w=W.lastAl&&W.lastAl.get(c)>0?'car':'you';W.touch.set(c,w);}if(w==='car'){W.carYou++;if(W.cy.length<1)W.cy.push({m:c.m.id,x:+c.x.toFixed(1),lp:+c.lp.toFixed(2),v:+c.v.toFixed(1),you:[+t.p[0].toFixed(1),+t.p[2].toFixed(1)],hist:(W.hist.get(c)||{rows:[]}).rows.filter((r,i,a)=>i%12===0||i>a.length-4)});}else W.youCar++;}
          else W.touch.delete(c);
          (W.lastAl||(W.lastAl=new Map())).set(c,aly);
          /* the gap to you when behind you in your lane (going your way) */
          const dx=t.p[0]-c.x,dz=t.p[2]-c.z,al=dx*c.fx+dz*c.fz,lr=-dx*c.fz+dz*c.fx;if(al>0&&Math.abs(lr)<(c.m.W+t.c.body.W)/2)W.minGapYou=Math.min(W.minGapYou,al-(c.m.L+t.c.body.L)/2);
          /* a stop line crossed: on a red that had been red a second already */
          /* (each car's last three seconds by the next stop line, for when one runs a red) */
          {let h=W.hist.get(c);if(!h||h.born!==c.born){h={born:c.born,rows:[]};W.hist.set(c,h);}const S=c.L.stopS,fr=c.s+c.m.L/2;let k=0;while(k<S.length&&S[k]<fr-1)k++;
            const gap=k<S.length?S[k]-fr:1e9,tt=k<S.length?((g.APP.t/30+c.L.stopPh[k]+.5)%1+1)%1:-1;
            const ydx=t.p[0]-c.x,ydz=t.p[2]-c.z;h.rows.push([W.frames,c.L.k,+c.lp.toFixed(2),+c.v.toFixed(1),+c.acc.toFixed(2),c.lcT<c.lcDur?+c.lcT.toFixed(1):-1,+(ydx*c.fx+ydz*c.fz).toFixed(1),+(-ydx*c.fz+ydz*c.fx).toFixed(1)]);if(h.rows.length>180)h.rows.shift();}
          const L=c.L,prev=W.last.get(c);if(prev&&prev.L===L&&prev.born===c.born&&c.s-prev.s>=0&&c.s-prev.s<5){const f0=prev.s+c.m.L/2,f1=c.s+c.m.L/2;
            for(let k=0;k<L.stopS.length;k++){const sl=L.stopS[k];if(L.stopKind&&L.stopKind[k]!==0)continue;if(f0<sl&&f1>=sl){W.stopsSeen++;const tt=((g.APP.t/30+L.stopPh[k]+.5)%1+1)%1;if(tt>=.5+1/30){W.redRuns++;
              if(W.runs.length<6)W.runs.push({m:c.m.id,lane:L.k,x:Math.round(c.x),v:+c.v.toFixed(1),tt:+tt.toFixed(3),k,sl:Math.round(sl),acc:+c.acc.toFixed(2),lcT:+c.lcT.toFixed(1),age:+(g.TRF.t-(c.born||0)).toFixed(1),hist:W.hist.get(c).rows.filter((r,i,a)=>i%10===0||i>a.length-6)});}}}}
          W.last.set(c,{L,s:c.s,born:c.born});}},
      sum(W){const g=window.__game,T=g.TRF;return {frames:W.frames,nan:W.nan,maxOn:W.maxOn,budget:g.trfCount(),carCar:W.carCar,carYou:W.carYou,youCar:W.youCar,redRuns:W.redRuns,runs:W.runs,cc:W.cc,cy:W.cy,stopLinesCrossed:W.stopsSeen,
        offLane:W.offLane,minGapYou:W.minGapYou<1e8?+W.minGapYou.toFixed(2):null,laneChanges:T.laneChanges-W.lc0,spawned:T.spawned-W.sp0,onPhysics:(T.engaged||0)-W.en0,backOnLane:(T.released||0)-W.re0,physFrames:W.physFrames,hits:g.TRF.cars.reduce((a,c)=>a+c.hits,0),wrecks:g.TRF_ON.filter(c=>c.wreck).length,worstMs:+W.ms.toFixed(2),avgMs:+((W.msSum||0)/Math.max(1,W.frames-120)).toFixed(3),
        cars:g.TRF_ON.map(c=>c.m.id+' '+(c.dir>0?'E':c.dir<0?'W':'T')+c.L.k+' x'+Math.round(c.x)+' '+Math.round(c.v*2.237)+'mph')};}};});
  const run=async(name,fn)=>{const t=Date.now();try{const r=await pg.evaluate(fn);
      const bad=[];if(!r.maxOn)bad.push('no traffic');if(r.nan)bad.push('NaN');if(r.maxOn>r.budget)bad.push('over budget');if(r.carCar)bad.push('cars overlapping');if(r.carYou)bad.push('a car through you');if(r.redRuns)bad.push('red light run');if(r.offLane)bad.push('off its lane');
      if(bad.length)fails++;console.log(name,((Date.now()-t)/1000).toFixed(0)+'s',bad.length?'FAIL: '+bad.join(', '):'pass',JSON.stringify(r));}
    catch(e){fails++;errs.push(name+': '+e.message.slice(0,300));console.log(name,'FAILED',e.message.slice(0,300));}};
  if(which.includes('park'))await run('park',async()=>{
    const g=window.__game,G=g.GAME,dt=1/60,wait=ms=>new Promise(r=>setTimeout(r,ms)),W=window.__tw.new();
    g.applyTod('day');g.APP.tod='day';g.closeMenu();G.state='drive';g.placeCar(1200,5.7,0);g.APP.cam=1;g.render(dt);
    /* (parked: the brake held at a standstill would be reverse after half a second, as the game drives) */
    g.setTestInput({steer:0,thr:0,brk:1,hb:1,nos:false,park:true});
    for(let f=0;f<45*60;f++){g.APP.t+=dt;g.step(dt);window.__tw.look(W,dt);if(f%300===299){g.render(dt);await wait(0);}}
    g.setTestInput(null);const r=window.__tw.sum(W);
    /* who is waiting behind you, and how close */
    r.behind=g.TRF_ON.filter(c=>c.dir===1&&c.x<G.car.p[0]&&Math.abs(c.lp-5.7)<1.5).map(c=>Math.round(G.car.p[0]-c.x)+' m at '+c.v.toFixed(1));return r;});
  if(which.includes('drive'))await run('drive',async()=>{
    const g=window.__game,G=g.GAME,dt=1/60,wait=ms=>new Promise(r=>setTimeout(r,ms)),W=window.__tw.new();
    g.applyTod('day');g.APP.tod='day';g.closeMenu();G.state='drive';g.placeCar(-1800,9.3,0);g.APP.cam=1;g.render(dt);
    /* (your car kept in the outer eastbound lane at 70 mph by a little controller of the test's own) */
    const inp={steer:0,thr:0,brk:0,hb:0,nos:false},t=G.car,zt=9.3,vt=31.3;
    for(let f=0;f<90*60;f++){const M=t.M,hl=Math.hypot(M[0],M[6])||1,hz=M[6]/hl;inp.steer=Math.max(-.35,Math.min(.35,.06*(zt-t.p[2])-1.4*hz));
      inp.thr=Math.max(0,Math.min(1,(vt-t.speed)*.3));inp.brk=t.speed>vt+2?.3:0;g.setTestInput(inp);g.APP.t+=dt;g.step(dt);window.__tw.look(W,dt);if(f%300===299){g.render(dt);await wait(0);}}
    g.setTestInput(null);const r=window.__tw.sum(W);r.you=[Math.round(G.car.p[0]),+G.car.p[2].toFixed(1),Math.round(G.car.speed*2.237)+'mph'];return r;});
  if(which.includes('ram'))await run('ram',async()=>{
    const g=window.__game,G=g.GAME,dt=1/60,wait=ms=>new Promise(r=>setTimeout(r,ms)),W=window.__tw.new();
    g.applyTod('day');g.APP.tod='day';g.closeMenu();G.state='drive';g.placeCar(-600,5.7,0);g.APP.cam=1;g.render(dt);
    /* (you at 90 mph in the middle eastbound lane, into whatever is in it: the cars there have to go onto the physics) */
    const inp={steer:0,thr:0,brk:0,hb:0,nos:false},t=G.car,zt=5.7,vt=40;let wall=0;
    for(let f=0;f<75*60;f++){const M=t.M,hl=Math.hypot(M[0],M[6])||1,hz=M[6]/hl;inp.steer=Math.max(-.3,Math.min(.3,.05*(zt-t.p[2])-1.2*hz));
      inp.thr=Math.max(0,Math.min(1,(vt-t.speed)*.3));inp.brk=0;g.setTestInput(inp);g.APP.t+=dt;g.step(dt);window.__tw.look(W,dt);wall=Math.max(wall,t.ev.wall||0);
      if(t.M[4]<.3||Math.abs(t.p[2]-zt)>12){g.placeCar(t.p[0],zt,0);}
      if(f%300===299){g.render(dt);await wait(0);}}
    g.setTestInput(null);const r=window.__tw.sum(W);r.you=[Math.round(G.car.p[0]),+G.car.p[2].toFixed(1)];return r;});
  if(errs.length){fails++;console.log('PAGE ERRORS:\n  '+errs.slice(0,8).join('\n  '));}else console.log('no page errors');
  await b.close();process.exit(fails?1:0);
})();
