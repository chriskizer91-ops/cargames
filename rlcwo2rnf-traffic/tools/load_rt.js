/* What a race, the traffic and a police chase each cost the CPU, side by side: the cars the physics steps, and the
   JavaScript time of each part of the frame (the readout's MS A FRAME sections, 52_world_dev's PS), averaged over a
   stretch of driving. Headless Chromium's CPU is not a phone's (a phone is a few times slower), so the numbers are
   for comparing the scenes with each other, and a build with the one before it.
     free     Highway 40 east at 70 mph on the game's cruise, the traffic out, no police
     race     Boulevard Run, from the green: the whole field of six round you (you hold straight on at half throttle)
     chaseN   as free, with the police after you, the wanted level held at N (1, 3, 5: the helicopter at 5)
   usage: node tools/load_rt.js [scene ...]   (default: free race chase1 chase3 chase5)
   env: QUALITY (mobile), FRAMES (measured, 300), W, H (320 x 180: the picture's size barely touches the JavaScript), FILE */
const {chromium}=require('playwright');const path=require('path');
const file=process.env.FILE?path.resolve(process.env.FILE):path.resolve(__dirname,'..','rlcwo2rnf-traffic.html');
const Q=process.env.QUALITY||'mobile',FRAMES=+(process.env.FRAMES||300);
const scenes=process.argv.slice(2).length?process.argv.slice(2):['free','race','chase1','chase3','chase5'];
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p=await b.newPage({viewport:{width:+(process.env.W||320),height:+(process.env.H||180)},deviceScaleFactor:1});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push(m.text().slice(0,300));});
  await p.addInitScript(()=>{try{localStorage.clear();}catch(e){}
    const iv=setInterval(()=>{if(window.__game&&window.__game.GAME){window.__game.GAME.hold=true;clearInterval(iv);}},20);});
  await p.goto('file://'+file+`?quality=${Q}&display=clear&gputime=off`);
  await p.waitForFunction(()=>window.__game&&!(document.getElementById('loading')&&!document.getElementById('loading').hidden),null,{timeout:600000,polling:500});
  console.log(`quality ${Q}, ${FRAMES} frames each; ms are JavaScript per frame (a phone: a few times more)`);
  for(const sc of scenes){
    const r=await p.evaluate(async([sc,FRAMES])=>{
      const g=__game,G=g.GAME,dt=1/60,wait=ms=>new Promise(r=>setTimeout(r,ms));
      if(g.RACE.on)g.raceEnd(null);g.APP.police=false;g.CRUISE.on=false;g.DEVW.wanted='auto';
      g.applyTod('day');g.APP.tod='day';g.APP.lights=false;g.closeMenu();G.state='drive';g.APP.cam=1;
      const chase=/^chase(\d)$/.exec(sc),L=chase?+chase[1]:0;
      if(sc==='race'){g.startRace('ring');}
      else{g.goTo('hwyE');if(L){g.DEVW.wanted=String(L);g.APP.police=true;}}
      /* the drive: the game's own cruise at 70 mph on the highway; in the race, straight on at half throttle */
      const drive=()=>{if(sc==='race')g.setTestInput({steer:0,thr:g.RACE.green?.5:0,brk:0,hb:0,nos:false});
        else{g.setTestInput({steer:0,thr:0,brk:0,hb:0,nos:false});if(!g.CRUISE.on){g.DEVW.cruise='road';g.DEVW.lastCruise='road';g.CRUISE.on=true;g.CRUISE.line=null;}}};
      /* a stretch to settle: the world built round the car, the police out and on you, the race's lights gone green */
      for(let f=0;f<900;f++){drive();g.APP.t+=dt;g.step(dt);if(f%4===3){g.render(dt);await wait(1);}
        if(sc==='race'&&g.RACE.green&&f>200)break;}
      const C={all:0,phys:0,trafP:0,pol:0,rivP:0,max:0},ps=new Float64Array(10);let js=0;g.PS.cur.fill(0);
      for(let f=0;f<FRAMES;f++){drive();const t0=performance.now();g.APP.t+=dt;g.step(dt);g.render(dt);js+=performance.now()-t0;
        for(let i=0;i<10;i++)ps[i]+=g.PS.cur[i];g.PS.cur.fill(0);
        const c=g.carCounts();C.all+=c.all;C.phys+=c.phys;C.trafP+=c.trafP;C.pol+=c.pol;C.rivP+=c.rivP;C.max=Math.max(C.max,c.phys);
        if(f%10===9)await wait(1);}
      g.setTestInput(null);g.CRUISE.on=false;g.DEVW.cruise='off';
      const psn=['phys','world','shadow','probe','scene','post','hud','sound','trees','send'],sec={};for(let i=0;i<10;i++)sec[psn[i]]=+(ps[i]/FRAMES).toFixed(2);
      const a=k=>+(C[k]/FRAMES).toFixed(1);
      const out={cars:a('all'),onPhysics:a('phys'),onPhysicsMost:C.max,traffic:a('trafP'),police:a('pol'),rivals:a('rivP'),heli:!!g.HELI.on,mph:Math.round(G.car.speed*2.237),jsFrame:+(js/FRAMES).toFixed(2),sec};
      if(g.RACE.on)g.raceEnd(null);g.APP.police=false;g.DEVW.wanted='auto';
      return out;},[sc,FRAMES]);
    const s=r.sec;
    console.log(`${sc.padEnd(7)} cars ${String(r.cars).padStart(4)}  on physics ${String(r.onPhysics).padStart(4)} (most ${r.onPhysicsMost}: traffic ${r.traffic}, police ${r.police}${r.heli?' + heli':''}, rivals ${r.rivals})  ${r.mph} mph   JS ${r.jsFrame} ms:  phys ${s.phys}  world ${s.world}  trees ${s.trees}  scene ${s.scene}  shadow ${s.shadow}  hud ${s.hud}  sound ${s.sound}`);
  }
  if(errs.length)console.log('ERRORS',JSON.stringify(errs.slice(0,5)));
  await b.close();
})();
