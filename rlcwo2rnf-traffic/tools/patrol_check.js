/* The police patrols (src/60_patrol.js), headless, the game's own step driving it with the police on:
     legal   past the parked patrol on Highway 40's shoulder at 55 mph: no chase
     speed   past it at 100 mph: a chase, SPEEDING, the parked car the first after you
     red     west on Silver Street into Central Avenue's junction on its red, the patrol 60 m back: RAN A RED LIGHT
     hit     a car hit by you beside the patrol (the physics' event, as 60_traffic records it): HIT A CAR
     away    a chase, then got away: patrols again (no one after you)
     traffic 90 s on Highway 40 in its traffic: how many patrols ride in it, none crashing anything by being there
   Each prints what it saw; a picture of the parked patrol (OUT). Any failure or page error: exit code 1.
   usage: node tools/patrol_check.js [legal,speed,red,hit,away,traffic]   env: QUALITY (mobile), OUT (a folder), FILE */
const {chromium}=require('playwright');const path=require('path'),fs=require('fs');
const file=process.env.FILE?path.resolve(process.env.FILE):path.resolve(__dirname,'..','rlcwo2rnf-traffic.html');
const which=(process.argv[2]||'legal,speed,red,hit,away,traffic').split(','),OUT=process.env.OUT||'';
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p=await b.newPage({viewport:{width:480,height:270},deviceScaleFactor:1});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push(m.text().slice(0,300));});
  await p.addInitScript(()=>{try{localStorage.clear();}catch(e){}const iv=setInterval(()=>{if(window.__game&&window.__game.GAME){window.__game.GAME.hold=true;clearInterval(iv);}},20);});
  await p.goto('file://'+file+`?quality=${process.env.QUALITY||'mobile'}&display=clear&gputime=off`);
  await p.waitForFunction(()=>window.__game&&!(document.getElementById('loading')&&!document.getElementById('loading').hidden),null,{timeout:600000,polling:500});
  if(OUT)fs.mkdirSync(OUT,{recursive:true});let fails=0;
  for(const sc of which){
    const r=await p.evaluate(async sc=>{
      const g=__game,G=g.GAME,dt=1/60,wait=ms=>new Promise(r=>setTimeout(r,ms)),POL=g.POL,PAT=g.PAT;
      g.closeMenu();G.state='drive';g.APP.cam=1;g.DEVW.polStart='patrol';g.applyTod('day');
      /* a clean start: no chase, no patrols out */
      g.APP.police=false;g.APP.t+=dt;g.step(dt);g.APP.police=true;
      /* (every parked patrol seen out, by its spot; the first after you checked against them when the chase starts) */
      const parked=new Map();
      const run=async(n,inp,every=8)=>{for(let f=0;f<n;f++){g.setTestInput(typeof inp==='function'?inp(f):inp);g.APP.t+=dt;g.step(dt);if(f%every===every-1){g.render(dt);await wait(1);}
        for(const P of PAT.cars)if(P.V&&P.spot)parked.set(P.V,P.spot);
        if(POL.chase&&!r0.at){r0.at=f+1;r0.why=PAT.why;const sp=POL.cars[0].V&&parked.get(POL.cars[0].V);r0.firstWasParked=!!sp;r0.firstSpot=sp?sp[3]+' '+Math.round(sp[0])+','+Math.round(sp[1]):null;}}};
      const r0={at:0,why:'',firstWasParked:false,firstSpot:null};
      const seenAt=(x)=>[...parked.values()].some(s=>s[0]===x);
      /* hold a speed along the way you face: throttle and brake by the error */
      const hold=v=>()=>{const e=v-G.car.speed;return {steer:0,thr:e>0?Math.min(1,e*.4):0,brk:e<-1?Math.min(1,-e*.2):0,hb:0,nos:false};};
      if(sc==='legal'||sc==='speed'){
        /* west on the north side of Highway 40 (its outer lane), towards the patrol on the shoulder at x 800 */
        const v=sc==='speed'?44.7:24.6;g.placeCar(1400,-9.3,Math.PI);
        /* up to speed, then past it: 25 s at most */
        await run(60,hold(v));for(let f=0;f<1500&&!POL.chase;f++){await run(1,hold(v),8);if(G.car.p[0]<600)break;}
        return {parkedOut:seenAt(800),chase:POL.chase,why:r0.why,firstWasParked:r0.firstWasParked,firstSpot:r0.firstSpot,mph:Math.round(G.car.speed*2.237),x:Math.round(G.car.p[0])};}
      if(sc==='red'){
        /* west along Silver Street (z -120, the westbound lane 1.8 m north of its middle) into Central's junction at x 0,
           arriving on the red for east-west */
        const n=g.WG.TW.jn.find(n=>n.x===0&&n.z===-120),ph=n.ph,red=t=>((t/30+ph+.5)%1+1)%1;
        g.placeCar(70,-121.8,Math.PI);await run(30,{steer:0,thr:0,brk:1,hb:1,nos:false});

        /* wait for the red, then go: 12 m/s into the junction */
        let w=0;while(!(red(g.APP.t)>.6&&red(g.APP.t)<.8)&&w<2400){g.setTestInput({steer:0,thr:0,brk:1,hb:1,nos:false});g.APP.t+=dt;g.step(dt);w++;}
        for(let f=0;f<480&&!POL.chase;f++)await run(1,hold(12),8);
        return {patrolOut:[...parked.values()].some(s=>s[3]==='Silver Street'),firstSpot:r0.firstSpot,signal:n.sig,chase:POL.chase,why:r0.why,firstWasParked:r0.firstWasParked,x:Math.round(G.car.p[0]),z:Math.round(G.car.p[2]),light:+red(g.APP.t).toFixed(2)};}
      if(sc==='hit'){
        g.placeCar(1100,-9.3,Math.PI);await run(60,{steer:0,thr:0,brk:1,hb:1,nos:false});
        const P=PAT.cars.find(P=>P.V&&P.spot&&P.spot[0]===800),car=G.car;
        /* you beside a car you've just hit, 40 m from the patrol: as 60_traffic records it */
        g.placeCar(840,-9.3,Math.PI);await run(10,{steer:0,thr:0,brk:1,hb:1,nos:false});
        PAT.hitT=g.TRF.t;PAT.hitX=car.p[0]-3;PAT.hitZ=car.p[2];PAT.hitPol=false;await run(3,{steer:0,thr:0,brk:1,hb:1,nos:false},1);
        return {patrolOut:!!P,chase:POL.chase,why:r0.why};}
      if(sc==='away'){
        g.placeCar(1400,-9.3,Math.PI);await run(30,hold(44.7));for(let f=0;f<1500&&!POL.chase;f++)await run(1,hold(44.7),8);
        const started=POL.chase;
        /* got away (as 60_police decides it: every one of them past the escape distance for 5 s) */
        g.dev&&0;const esc=POL.escapes;
        for(const Q of POL.cars)if(Q.V){Q.V.p[0]+=5000;}
        await run(400,{steer:0,thr:0,brk:1,hb:1,nos:false});
        return {started,escaped:POL.escapes>esc,chaseAfter:POL.chase,liveAfter:POL.live,why:r0.why};}
      if(sc==='traffic'){
        g.placeCar(-1500,9.3,0);let seen=new Set(),frames=0,most=0;
        for(let f=0;f<5400;f++){const e=26.8-G.car.speed;g.setTestInput({steer:0,thr:e>0?Math.min(1,e*.4):0,brk:e<-1?.5:0,hb:0,nos:false});g.APP.t+=dt;g.step(dt);
          if(f%8===7){g.render(dt);await wait(1);}if(G.car.p[0]>2500)g.placeCar(-1500,9.3,0);
          let n=0;for(const c of g.TRF_ON)if(c.police){n++;seen.add(c);}most=Math.max(most,n);frames++;if(POL.chase)break;}
        let shot=null;
        /* a picture: behind a patrol on its shoulder */
        g.APP.police=false;g.APP.t+=dt;g.step(dt);g.APP.police=true;g.placeCar(830,-12,Math.PI);await run(90,{steer:0,thr:0,brk:1,hb:1,nos:false});g.CAM.cut=true;for(let k=0;k<16;k++){g.APP.t+=dt;g.step(dt);g.render(dt);}shot=g.snap();
        return {patrolsSeen:seen.size,mostAtOnce:most,chase:POL.chase,secs:Math.round(frames*dt),shot};}
    },sc);
    const shot=r.shot;delete r.shot;if(OUT&&shot)fs.writeFileSync(path.join(OUT,'patrol.png'),Buffer.from(shot.split(',')[1],'base64'));
    const bad=[];
    if(sc==='legal'&&(r.chase||!r.parkedOut))bad.push(r.chase?'a chase at 55 mph':'no patrol on the shoulder');
    if(sc==='speed'&&!(r.chase&&r.why==='SPEEDING'&&r.firstWasParked))bad.push('no chase from the patrol for speeding');
    if(sc==='red'&&!(r.chase&&r.why==='RAN A RED LIGHT'))bad.push('no chase for the red');
    if(sc==='hit'&&!(r.chase&&r.why==='HIT A CAR'))bad.push('no chase for the hit');
    if(sc==='away'&&!(r.started&&r.escaped&&!r.chaseAfter))bad.push('not patrols again after getting away');
    if(sc==='traffic'&&r.mostAtOnce>2)bad.push('more than two patrols in the traffic');
    if(bad.length)fails++;console.log(sc,bad.length?'FAIL: '+bad.join(', '):'pass',JSON.stringify(r));
  }
  if(errs.length){fails++;console.log('ERRORS',JSON.stringify(errs.slice(0,6)));}
  await b.close();process.exit(fails?1:0);
})();
