/* The streets' and country roads' traffic (src/60_streets.js), headless, the game's own step driving it with you
   standing still (or on the game's cruise): how many street cars are out against how many are wanted; whether any two
   of them overlap (riding through each other); whether one is stuck (stood still over 40 s); whether a junction is
   held over 25 s; whether one goes into a signal's junction on the red; how far they go. Then a picture.
     town     downtown, you parked by Highway 40
     neon     Neon Row at night
     country  Ridge Road, you on the cruise at 70 mph... north
     cross    where East Line Road crosses Highway 40: the crossing, its waits and the highway's cars
   usage: node tools/streets_check.js [town,neon,country,cross]   env: QUALITY (mobile), SECS (90), OUT (a folder for pictures), FILE */
const {chromium}=require('playwright');const path=require('path'),fs=require('fs');
const file=process.env.FILE?path.resolve(process.env.FILE):path.resolve(__dirname,'..','rlcwo2rnf-traffic.html');
const which=(process.argv[2]||'town,neon,country,cross').split(','),SECS=+(process.env.SECS||90),OUT=process.env.OUT||'';
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p=await b.newPage({viewport:{width:480,height:270},deviceScaleFactor:1});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push(m.text().slice(0,300));});
  await p.addInitScript(()=>{try{localStorage.clear();}catch(e){}
    const iv=setInterval(()=>{if(window.__game&&window.__game.GAME){window.__game.GAME.hold=true;clearInterval(iv);}},20);});
  await p.goto('file://'+file+`?quality=${process.env.QUALITY||'mobile'}&display=clear&gputime=off`);
  await p.waitForFunction(()=>window.__game&&!(document.getElementById('loading')&&!document.getElementById('loading').hidden),null,{timeout:600000,polling:500});
  if(OUT)fs.mkdirSync(OUT,{recursive:true});let fails=0;
  for(const sc of which){
    const r=await p.evaluate(async([sc,SECS])=>{
      const g=__game,G=g.GAME,dt=1/60,wait=ms=>new Promise(r=>setTimeout(r,ms)),ST=g.ST,TRF=g.TRF;
      g.applyTod(sc==='neon'?'night':'day');g.APP.tod=sc==='neon'?'night':'day';g.APP.lights=sc==='neon';g.closeMenu();G.state='drive';g.APP.cam=1;g.APP.police=false;
      if(sc==='cross'){const J=ST.J.find(j=>j.kind==='hwy'&&j.x>0)||ST.J.find(j=>j.kind==='hwy');g.placeCar(J.x+30,J.z+30,0);}
      else g.goTo({town:'downtown',neon:'neon',country:'ridge'}[sc]);
      const cruise=sc==='country';
      const t0=performance.now();let built=0;
      /* the loops are made a few a frame: until they all are */
      let firstMs=0;for(let f=0;f<1200&&!ST.ready;f++){g.setTestInput({steer:0,thr:0,brk:1,hb:1,nos:false});g.APP.t+=dt;const ts=performance.now();g.step(dt);firstMs=Math.max(firstMs,performance.now()-ts);if(f%8===7){g.render(dt);await wait(1);}built=f;}
      const buildMs=performance.now()-t0;
      const M={frames:0,on:0,want:0,overlapFrames:0,overlapPairs:0,stuckMax:0,heldMax:0,redRuns:0,dist:0,passes:0,still:new Map(),last:new Map(),lk:0,worstStep:0};
      const cars=()=>g.TRF_ON.filter(c=>c.L&&c.L.street);
      const N=Math.round(SECS/dt);
      for(let f=0;f<N;f++){
        if(cruise){g.setTestInput({steer:0,thr:0,brk:0,hb:0,nos:false});if(!g.CRUISE.on){g.DEVW.cruise='road';g.DEVW.lastCruise='road';g.CRUISE.on=true;g.CRUISE.line=null;}}
        else g.setTestInput({steer:0,thr:0,brk:1,hb:1,nos:false});
        const ts=performance.now();g.APP.t+=dt;g.step(dt);M.worstStep=Math.max(M.worstStep,performance.now()-ts);if(f%(cruise?4:8)===(cruise?3:7)){g.render(dt);if(f%40===39)await wait(1);}
        const C=cars();M.frames++;M.on+=C.length;M.want+=ST.want;M.lk+=ST.lk;
        /* overlaps: two street cars riding (not on the physics) whose boxes touch */
        let ov=false;for(let i=0;i<C.length;i++)for(let j=i+1;j<C.length;j++){const a=C[i],b2=C[j];if(a.mode!=='kin'||b2.mode!=='kin')continue;
          if(g.trfBoxes(a.x,a.z,a.fx,a.fz,a.m.L-.3,a.m.W-.3,b2.x,b2.z,b2.fx,b2.fz,b2.m.L-.3,b2.m.W-.3)){ov=true;M.overlapPairs++;}}
        if(ov)M.overlapFrames++;
        for(const c of C){M.dist+=c.v*dt;const st=c.v<.3?(M.still.get(c)||0)+dt:0;M.still.set(c,st);M.stuckMax=Math.max(M.stuckMax,st);
          /* into a signal's junction: the stop line crossed while its light was red (amber is allowed) */
          const L=c.L,front=c.s+c.m.L/2,lf=M.last.get(c);M.last.set(c,{L,front});
          if(lf&&lf.L===L&&front>lf.front)for(let k=0;k<L.stopS.length;k++){const S=L.stopS[k];if(lf.front<S&&front>=S){M.passes++;
            /* (the amber rule lets a car that will reach the line before the red go on: up to 0.4 s late; past 0.6 s into
               the red is a red run) */
            if(L.stopKind[k]===0){const tt=((g.APP.t/30+L.stopPh[k]+.5)%1+1)%1;if(tt>=.5+.6/30){M.redRuns++;M.redAt=M.redAt||[];if(M.redAt.length<4)M.redAt.push({tt:+tt.toFixed(3),v:+c.v.toFixed(1),loop:L.name,claimed:c.claimJ===L.stopJ[k]});}}}}}
        for(const J of ST.J)if(J.claim)M.heldMax=Math.max(M.heldMax,TRF.t-J.claimT);
      }
      let shot=null;if(sc==='town'||sc==='neon'||sc==='cross'){g.render(dt);shot=g.snap();}
      const tw=ST.loops.filter(L=>L.town).length,bt=ST.loops.map(L=>L.ms||0),slow=ST.loops.filter(L=>L.ms>4).map(L=>L.name+' '+L.ms.toFixed(0)+'ms');
      return {buildStepMsMax:+firstMs.toFixed(1),sliceMsMax:+(ST.slice||0).toFixed(1),loopMsMax:+Math.max(...bt).toFixed(1),loopMsSum:Math.round(bt.reduce((a,b)=>a+b,0)),slowLoops:slow.slice(0,8),loops:ST.loops.length,townLoops:tw,countryLoops:ST.loops.length-tw,junctions:ST.J.length,buildFrames:built,buildMs:Math.round(buildMs),
        laneKm:+(M.lk/M.frames).toFixed(1),wanted:+(M.want/M.frames).toFixed(1),out:+(M.on/M.frames).toFixed(1),highwayCars:g.TRF_ON.filter(c=>c.L&&!c.L.street).length,
        overlapFrames:M.overlapFrames,overlapPairs:M.overlapPairs,stuckMax:+M.stuckMax.toFixed(1),heldMax:+M.heldMax.toFixed(1),redRuns:M.redRuns,redAt:M.redAt,linesPassed:M.passes,
        kmDriven:+(M.dist/1000).toFixed(2),onPhysics:TRF.engaged||0,worstStepMs:+M.worstStep.toFixed(1),you:[Math.round(G.car.p[0]),Math.round(G.car.p[2])],shot};
    },[sc,SECS]);
    const shot=r.shot;delete r.shot;if(OUT&&shot)fs.writeFileSync(path.join(OUT,'streets-'+sc+'.png'),Buffer.from(shot.split(',')[1],'base64'));
    const bad=[];if(r.overlapFrames>0)bad.push('cars through each other');if(r.stuckMax>40)bad.push('a car stuck');if(r.heldMax>25)bad.push('a junction held');if(r.redRuns>0)bad.push('red lights run');
    if(sc!=='cross'&&r.out<Math.min(1,r.wanted*.5))bad.push('too few out');
    if(bad.length)fails++;console.log(sc,bad.length?'FAIL: '+bad.join(', '):'pass',JSON.stringify(r));
  }
  if(errs.length){fails++;console.log('ERRORS',JSON.stringify(errs.slice(0,6)));}
  await b.close();process.exit(fails?1:0);
})();
